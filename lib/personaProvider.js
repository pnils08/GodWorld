/**
 * personaProvider.js — research.16 Phase 2 (engine-sheet, S270)
 *
 * The persona-provider interface that lets scripts/mags-discord-bot.js host more than
 * one conversational persona on Discord. Mags is one provider (built inline in the bot
 * from lib/mags); each Tier-1 citizen voice is a citizenVoiceProvider(popId).
 *
 * A provider is a plain object the bot consumes:
 *   {
 *     id,            // 'mags' | 'POP-00528'   (stable key)
 *     label,         // display name for logs   ('Mags' | 'Deacon Seymour')
 *     logSubdir,     // per-persona conversation-log namespace (no cross-contamination)
 *     historyFile,   // per-persona rolling-history persistence path
 *     buildSystemPrompt(),                          // sync base prompt (identity + framing + world)
 *     augment(systemPrompt, {userMessage, userId}), // async: per-message dynamic context (Promise<string>)
 *     persistResponse(userName, userMessage, response, userId) // fire-and-forget memory write
 *   }
 *
 * The bot owns the Anthropic call loop, tool-use rounds, rolling history, and message-splitting —
 * all persona-agnostic. Only identity, framing, dynamic context, and memory writes flow through
 * the provider.
 *
 * FENCE CONTRACT (research.14): a citizen's per-POPID page is RAW first-person prose. Every recall
 * here is wrapped with lib/memoryFence before it enters the prompt (citizenPage.js §Fence contract —
 * recalled citizen prose is exactly the injection surface the fence exists for). This module is the
 * Discord read-consumer of that store; the wake-side write stays in citizenPage. Chat is NOT written
 * back into the reflection page (it is conversational, not reflection — keeping it out protects the
 * wake-loop memory layer).
 */

const fs = require('fs');
const path = require('path');
const mags = require('./mags');
const citizenPage = require('./citizenPage');
const memoryFence = require('./memoryFence');
const sheets = require('./sheets');
const classifier = require('./reflectionClassifier');
const getCurrentCycle = require('./getCurrentCycle');
const { loadBonds } = require('./wakePerception'); // engine.130 — bond pickup for the drain
const { matchBondTargets_ } = require('../scripts/bondTargetMatch'); // engine.101 shared match (col I)

const ROOT = path.join(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, '.claude', 'agents');
const LOG_ROOT = path.join(ROOT, 'logs');

const POPID_RE = /\bPOP-\d{4,}\b/;

// engine.43 T4 — Discord session-boundary batching. One conversation session (idle-bounded)
// drains as ONE Reflection_Intake row, exactly the wake loop's row shape, daypart='DISCORD'.
// Buffer is mirrored to disk per citizen so a pm2 restart mid-conversation loses nothing;
// boot-time sweep flushes stale buffers. Same constants as scripts/citizen-wake.js step 3.
const IDLE_FLUSH_MS = 30 * 60 * 1000;  // session boundary — mirrors the wake loop's coarse cadence
const TENSION_FILE = path.join(LOG_ROOT, 'citizen-tension-state.json');
const TENSION_CAP = 3;                 // = citizen-wake.js TENSION_CAP
const TENSION_EXPIRY_CYCLES = 12;      // = citizen-wake.js TENSION_EXPIRY_CYCLES

// ---------------------------------------------------------------------------
// Citizen-voice agent index — popId -> { dir, slug, name }, built once from the
// .claude/agents/citizen-voice-* IDENTITY.md files (each declares its POP ID).
// ---------------------------------------------------------------------------
let _citizenIndex = null;

function buildCitizenIndex() {
  const index = {};
  let dirs = [];
  try {
    dirs = fs.readdirSync(AGENTS_DIR).filter(function (d) {
      return d.indexOf('citizen-voice-') === 0;
    });
  } catch (e) {
    return index;
  }
  dirs.forEach(function (slugDir) {
    const identityPath = path.join(AGENTS_DIR, slugDir, 'IDENTITY.md');
    let raw;
    try { raw = fs.readFileSync(identityPath, 'utf-8'); } catch (e) { return; }
    // Prefer the labeled "POP ID: POP-XXXXX" line; fall back to the first POP-id token.
    let popId = null;
    const labeled = raw.match(/POP[\s-]?ID[^\n]*?(POP-\d{4,})/i);
    if (labeled) popId = labeled[1].toUpperCase();
    else { const any = raw.match(POPID_RE); if (any) popId = any[0].toUpperCase(); }
    if (!popId) return;
    const nameMatch = raw.match(/^#\s+(.+?)\s+[—-]\s+Identity/m);
    const name = nameMatch ? nameMatch[1].trim() : slugDir.replace('citizen-voice-', '');
    index[popId] = { dir: path.join(AGENTS_DIR, slugDir), slug: slugDir.replace('citizen-voice-', ''), name: name };
  });
  return index;
}

function citizenIndex() {
  if (!_citizenIndex) _citizenIndex = buildCitizenIndex();
  return _citizenIndex;
}

// loadCitizenCore(dir) -> the four-file persona core concatenated. The single source-of-truth the
// voice is authored against (IDENTITY = who, LENS = perception/canon-tier, RULES = guardrails,
// SKILL = how to answer). Missing files are skipped (IDENTITY is the only hard requirement).
function loadCitizenCore(dir) {
  const order = ['IDENTITY.md', 'LENS.md', 'RULES.md', 'SKILL.md'];
  const parts = [];
  order.forEach(function (f) {
    try {
      const txt = fs.readFileSync(path.join(dir, f), 'utf-8').trim();
      if (txt) parts.push(txt);
    } catch (e) { /* skip missing file */ }
  });
  return parts.join('\n\n---\n\n');
}

// ---------------------------------------------------------------------------
// drainConversationReflection_ — engine.43 T4/T5 shared core.
//
// Classify a citizen's OWN conversational words (never the other party's — S298)
// as one unit and drain them into the wake loop's existing pipeline: Triple
// classifier + open-tension list, tension resolve-then-open mirroring
// scripts/citizen-wake.js step 3 exactly (cap 3, oldest-open eviction, typed
// page lines), then ONE positional A-H Reflection_Intake row (applied='no',
// gated — the S277 cycle drain picks it up unchanged).
// Callers: flushVoiceBuffer below (daypart='DISCORD'), /interview post-transcript
// step (daypart='INTERVIEW', via node -e).
//
// opts.dryRun: classify + report, zero writes (skill verify hook).
// INTERVIEW idempotency: same-transcript re-runs are skipped via a snippet match
// against existing (popId, daypart) rows — Discord needs no guard (buffer deletes
// after flush).
// ---------------------------------------------------------------------------
async function drainConversationReflection_(popId, text, daypart, opts) {
  opts = opts || {};
  const id = String(popId || '').trim().toUpperCase();
  const reflection = String(text || '').trim();
  if (!id || !reflection) return { drained: false, reason: 'empty popId or text' };
  const snippet = opts.snippet || reflection.replace(/\n/g, ' '); // research.30: a neutral snippet keeps a builder's chat out of the intake sheet and the digests that read it
  const cycle = (() => { try { return getCurrentCycle(); } catch (e) { return null; } })(); // same fallback as citizen-wake.js:152

  if (daypart === 'INTERVIEW' && !opts.dryRun) {
    try {
      const existing = await sheets.getRawSheetData('Reflection_Intake');
      for (let i = 1; i < existing.length; i++) {
        const r = existing[i];
        if (String(r[1]).toUpperCase() === id && String(r[3]) === daypart && String(r[5]) === snippet) {
          return { drained: false, reason: 'duplicate — same transcript already ingested', duplicate: true };
        }
      }
    } catch (e) { /* fail open — a read error must not block ingest */ }
  }

  // tension register — same load/expiry/open-slice as citizen-wake.js openTensionsFor
  let tensionState = {};
  try { tensionState = JSON.parse(fs.readFileSync(TENSION_FILE, 'utf8')); } catch (e) { tensionState = {}; }
  const tlist = tensionState[id] = tensionState[id] || [];
  if (cycle != null && !opts.dryRun) {
    for (let i = tlist.length - 1; i >= 0; i--) {
      if (tlist[i].status === 'open' && (cycle - (Number(tlist[i].cy) || 0)) >= TENSION_EXPIRY_CYCLES) tlist.splice(i, 1);
    }
  }
  const openTensions = tlist.filter(function (t) { return t.status === 'open'; }).slice(-TENSION_CAP);

  let cls = {};
  try { cls = await classifier.classifyTripleReflection_(reflection, openTensions.map(function (t) { return t.q; })); }
  catch (e) { return { drained: false, reason: 'classify threw: ' + e.message }; }

  if (opts.noTension) cls = Object.assign({}, cls, { tension: null, resolves: null }); // dials + bond only, no page lines
  if (opts.dryRun) {
    return { drained: false, dryRun: true, cycle: cycle, event: cls.event || null, affect: cls.affect || null,
      tension: cls.tension || null, resolves: cls.resolves != null ? (openTensions[cls.resolves] || {}).q || null : null };
  }

  // resolution first, then new capture — both can fire on the same drain (wake step 3 order)
  let resolvedText = ''; // engine.101 — rides intake col K when a resolution fired
  if (cls.resolves != null && openTensions[cls.resolves]) {
    const t = openTensions[cls.resolves]; // reference into tensionState — status flip persists on save
    t.status = 'resolved'; t.resolvedCy = cycle;
    resolvedText = t.q;
    await citizenPage.appendReflection_(id, 'TENSION-RESOLVED[c' + cycle + ']: ' + t.q,
      { cycle: cycle, daypart: daypart, key: 'tension-resolved', extra: { type: 'tension' } });
  }
  if (cls.tension && !tlist.some(function (t) { return t.status === 'open' && t.q.toLowerCase() === cls.tension.toLowerCase(); })) {
    const openNow = tlist.filter(function (t) { return t.status === 'open'; });
    if (openNow.length >= TENSION_CAP) { // evict oldest open (cap 3)
      const oldest = openNow.reduce(function (a, b) { return (Number(a.cy) || 0) <= (Number(b.cy) || 0) ? a : b; });
      tlist.splice(tlist.indexOf(oldest), 1);
    }
    tlist.push({ q: cls.tension, cy: cycle, status: 'open' });
    await citizenPage.appendReflection_(id, 'TENSION[c' + cycle + ']: ' + cls.tension,
      { cycle: cycle, daypart: daypart, key: 'tension', extra: { type: 'tension' } });
  }
  try { fs.writeFileSync(TENSION_FILE, JSON.stringify(tensionState, null, 2)); } catch (e) {}

  // one positional A-K row, same shape as citizen-wake.js step 4.
  // engine.130: was A-H — INTERVIEW/DISCORD rows dropped BondTarget/Tension/Resolves, so
  // the cycle drain's bond-intensity nudge never saw these mentions. Bond match is
  // enrichment: a loadBonds failure degrades to '' and never blocks the drain.
  let bondTarget = '';
  try {
    const bondsRes = await loadBonds(id, { pairs: true });
    if (opts.bondTargetPop) {
      const pair = (bondsRes.pairs || []).find(function (p) { return p.pop === opts.bondTargetPop; });
      bondTarget = pair ? pair.pop : ''; // research.30: the talk is with this citizen — drive that bond
    } else {
      const hits = matchBondTargets_(reflection, bondsRes.pairs);
      bondTarget = hits.length ? hits[0].pop : '';
    }
  } catch (e) { /* enrichment only */ }
  if (cls.event || cls.affect) {
    await sheets.appendRows('Reflection_Intake', [[
      new Date().toISOString(), id, cycle, daypart, cls.event || '', snippet, 'no', cls.affect || '',
      bondTarget, cls.tension || '', resolvedText,
    ]]);
  }
  return { drained: true, event: cls.event || null, affect: cls.affect || null, bondTarget: bondTarget || null, offVocab: !(cls.event || cls.affect) };
}

// ---------------------------------------------------------------------------
// Voice brief (research.30) — what the records say right now, rebuilt at every prompt build
// (hourly) from files the Cycle already refreshes: the ledger snapshot, the sports feed, the
// latest editions. The agent files are written once; this is what keeps the voice current
// without anyone editing them. Every read is local and fails open to ''.
// ---------------------------------------------------------------------------
const LEDGER_SNAPSHOT = path.join(ROOT, 'output', 'simulation_ledger_snapshot.jsonl');
const SPORTS_FEED = path.join(ROOT, 'output', 'beats', 'Oakland_Sports_Feed.jsonl');
const EDITIONS_DIR = path.join(ROOT, 'editions');

function ledgerRow_(popId) {
  const needle = '"POPID":"' + popId + '"';
  const lines = fs.readFileSync(LEDGER_SNAPSHOT, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf(needle) !== -1) { try { return JSON.parse(lines[i]); } catch (e) { return null; } }
  }
  return null;
}

function briefClip_(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

// research.32 (codex diff review F16): the club rows are the VOICE'S club — an Oaks player's brief carried two
// A's rows before — and the whole set runs newest first (Cycle, then file position), not named-then-club.
function sportsLines_(name, roleType) {
  const rows = fs.readFileSync(SPORTS_FEED, 'utf8').split('\n').filter(Boolean).slice(-150).map(function (l) {
    try { return JSON.parse(l); } catch (e) { return null; }
  }).filter(Boolean);
  // The voice's club from its ledger role; a role that names neither club gets no club rows, only the rows naming them.
  const role = String(roleType || '');
  const team = /oaks/i.test(role) ? 'Oaks' : /a's|athletics|baseball|hitter|pitcher|catcher|fielder|infield|manager|coach/i.test(role) ? "A's" : null;
  const key = String(name).toLowerCase().replace(/\./g, '');
  const named = rows.filter(function (r) { return String(r.NamesUsed || '').toLowerCase().replace(/\./g, '').indexOf(key) !== -1; }).slice(-3);
  const club = team ? rows.filter(function (r) { return String(r.TeamsUsed || '').trim() === team && named.indexOf(r) === -1; }).slice(-2) : [];
  return named.concat(club)
    .map(function (r) { return { r: r, i: rows.indexOf(r) }; })
    .sort(function (a, b) { return ((parseInt(b.r.Cycle, 10) || 0) - (parseInt(a.r.Cycle, 10) || 0)) || (b.i - a.i); })
    .map(function (x) { const r = x.r;
      return 'C' + r.Cycle + ' ' + (r.EventType || 'feed') + ' (' + (r.TeamsUsed || '') + (r.SeasonType ? ', ' + r.SeasonType : '') + '): ' + briefClip_(r.Notes || r.StoryAngle, 260);
    });
}

function editionLines_(name) {
  const last = name.split(/\s+/).slice(-1)[0];
  const re = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b|\\b' + last.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
  const files = fs.readdirSync(EDITIONS_DIR).map(function (f) {
    const m = f.match(/^cycle_pulse_c(\d+)\.txt$/); return m ? { f: f, c: parseInt(m[1], 10) } : null;
  }).filter(Boolean).sort(function (a, b) { return b.c - a.c; }).slice(0, 2);
  const out = [];
  files.forEach(function (e) {
    const hits = fs.readFileSync(path.join(EDITIONS_DIR, e.f), 'utf8').split('\n').filter(function (l) { return re.test(l); }).slice(0, 3);
    hits.forEach(function (l) { out.push('Tribune C' + e.c + ': ' + briefClip_(l, 300)); });
  });
  return out;
}

function buildVoiceBrief_(popId, name) {
  const parts = [];
  let roleType = '';
  try {
    const row = ledgerRow_(popId);
    if (!row) return '';  // a voice with no ledger row has no records to speak from
    roleType = String(row.RoleType || '');
    const age = row.BirthYear ? (mags.currentSimYear() - parseInt(row.BirthYear, 10)) : null;
    const facts = [row.RoleType, row.Status && 'status ' + row.Status, row.Neighborhood && 'lives in ' + row.Neighborhood,
      row.MaritalStatus, age != null && !isNaN(age) ? 'age ' + age : null].filter(Boolean).join(' | ');
    parts.push('Your ledger row (your standing status on the city\'s books): ' + facts);
    const lh = String(row.LifeHistory || '').split('\n').filter(function (l) { return /^Y\d+C\d+ — /.test(l); }).slice(-5);
    if (lh.length) parts.push('Your last days, as the city recorded them:\n' + lh.map(function (l) { return '- ' + briefClip_(l, 200); }).join('\n'));
  } catch (e) { /* fail open */ }
  // research.32 (codex F16): the feed is what the club has said, newest first; the ledger row is the standing
  // status. Both are read at the same Cycle, so neither is "newer" — an announced departure and an Active
  // status can both be true. The voice holds both and says what each says, rather than calling the records mixed.
  try { const sl = sportsLines_(name, roleType); if (sl.length) parts.push('The club, from the sports feed, newest first (what the club has said and when):\n' + sl.map(function (l) { return '- ' + l; }).join('\n') +
    '\n\nWhere a feed line and your ledger row differ — a role, a status, a team — both are on the record, each with its own Cycle: the feed line is what the club said at that Cycle, the ledger row is your standing status at the snapshot. Say what each says, with its Cycle; do not call the records mixed.'); } catch (e) { /* fail open */ }
  try { const el = editionLines_(name); if (el.length) parts.push('What the Tribune printed about you lately:\n' + el.map(function (l) { return '- ' + l; }).join('\n')); } catch (e) { /* fail open */ }
  if (!parts.length) return '';
  let cycle = '';
  try { cycle = ' (Cycle ' + getCurrentCycle() + ')'; } catch (e) { /* header only */ }
  return '## What the records say right now' + cycle + '\n\n' +
    'Your character file above was written earlier. Where it and these records differ — a ring count, a season, where you live — the records are true now. Speak from them without announcing them.\n\n' +
    parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// Talk recorder (research.30, builder 2026-10-19: "mags and Paulson dials should move", "the bots
// should be able to record to their wiki pages"). One disk-mirrored session buffer per voice:
// the voice's OWN replies and the speaker's lines (only when the speaker is Mike). At the idle
// boundary the session drains three ways, all through the wake loop's existing rails:
//   1. the voice's replies  -> one classified Reflection_Intake row for the voice (dials)
//   2. Mike's lines         -> one row for Paulson (POP-00527): his dials, and the bond with
//                              the voice is the BondTarget. Neutral snippet, no tension lines.
//   3. (citizen voices)     -> one short typed TALK line on the voice's page: how the talk sat
//                              with them. Typed 'talk', never 'reflection': it is not "own words"
//                              usage, and it carries no fact the other party claimed.
// ---------------------------------------------------------------------------
const PAULSON_POPID = 'POP-00527';
function isPaulsonSpeaker_(userName) { return /^mike\b/i.test(String(userName || '').trim()); }

async function talkReflectionLine_(name, replies) {
  const said = replies.join('\n\n').slice(0, 1800);
  const prompt = 'You are ' + name + '. Below is what you said in a conversation just now. In one or two sentences, first person, ' +
    'past tense, private, write how the talk sat with you. Rules: no new events; no facts, plans or promises the other person ' +
    'claimed; no names beyond the ones you said yourself; if nothing stuck, say it was small talk. Output the sentences only.\n\n' + said;
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://godworld.local' },
    body: JSON.stringify({ model: 'anthropic/claude-haiku-5.5', max_tokens: 300, temperature: 0.5, reasoning: { enabled: false }, messages: [{ role: 'user', content: prompt }] }),
  });
  const j = await r.json();
  const text = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '').replace(/\s+/g, ' ').trim();
  return (text.length >= 20 && text.length <= 420) ? text : '';
}

async function writeTalkPageLine_(popId, name, replies) {
  const line = await talkReflectionLine_(name, replies);
  if (!line) return 'skipped (no usable line)';
  const cycle = getCurrentCycle();
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
  const res = await citizenPage.appendReflection_(popId, 'TALK[c' + cycle + ']: ' + line,
    { cycle: cycle, daypart: 'DISCORD', key: 'talk-' + stamp, extra: { type: 'talk' } });
  return res && res.error ? 'failed: ' + res.error : 'written';
}

// ---------------------------------------------------------------------------
// A voice's own store (pipeline.100, builder 2026-11-09/10): what it said and wrote, kept apart from its
// page. Mags' is `mags` (her talks and the Pulses she narrated); a citizen voice's is `talk-<POPID>` (its
// Discord conversations). Never the page tag: chat prose stays off the narrative page (ADR-0014) — the page
// feeds the wake loop and editions; this store is read back only into the voice's own Discord prompt.
// ---------------------------------------------------------------------------
const STORE_API = 'https://api.supermemory.ai';
const CAL_DATE_RE = /\[?\b20[1-3]\d-[01]?\d-[0-3]?\d\b\]?/g;   // the sim has its own clock
function talkStoreTag_(popId) { return 'talk-' + String(popId || '').trim().toUpperCase(); }
function storeAuth_() { return { Authorization: 'Bearer ' + process.env.SUPERMEMORY_CC_API_KEY, 'Content-Type': 'application/json' }; }

// storeHits_(tag, query, limit) -> [text]. Relevant chunks per hit under the hit's title, calendar dates out.
// No nightly scrub: that one is for citizen-side readers and drops every sentence naming the person the voice
// talked with — in the voice's own prompt it would gut its memory of its own talks. [] on a miss or a failure.
async function storeHits_(tag, query, limit) {
  const q = String(query || '').trim();
  if (!tag || !q || !process.env.SUPERMEMORY_CC_API_KEY) return [];
  try {
    const results = await require('./supermemory').search(q.slice(0, 400), { containerTags: [tag], limit: limit || 4, timeoutMs: 8000, apiVersion: 'v3' });
    return (results || []).map(function (r) {
      const text = (r.chunks || []).filter(function (c) { return c && c.isRelevant && typeof c.content === 'string'; })
        .map(function (c) { return c.content; }).join(' ').replace(CAL_DATE_RE, '').replace(/\s+/g, ' ').trim();
      if (!text) return '';
      const title = String((r.metadata && r.metadata.title) || '').replace(/\s+—\s+\d{4}-\d{2}-\d{2}$/, '');
      return (title ? title + ': ' : '') + briefClip_(text, 900);
    }).filter(Boolean);
  } catch (e) { return []; }
}
function fenceStore_(hits, tag) { return hits && hits.length ? memoryFence.wrap(hits.join('\n\n'), 'own-store:' + tag) : ''; }

// The store appends on a repeated customId ("old --- new" in one doc, citizenPage.js pipeline.94), so a save
// is never blind: true = there, false = not there, null = the read failed (the caller does not write).
async function storeHasDoc_(customId) {
  try {
    const r = await fetch(STORE_API + '/v3/documents/' + encodeURIComponent(customId), { method: 'GET', headers: storeAuth_() });
    if (r.status === 404) return false;
    return r.ok ? true : null;
  } catch (e) { return null; }
}

function conversationDoc_(popId, label, tag, turns, firstTs, cycle) {
  let clock = '';
  // no cycle, no clock: a talk regrouped from before the clock was recorded carries none rather than a guessed one
  try { clock = (cycle == null || cycle === '' || !(Number(cycle) > 0)) ? '' : require('../scripts/centralDate').simClock(cycle); } catch (e) { clock = ''; }
  const who = [];
  turns.forEach(function (t) { if (t.who !== label && who.indexOf(t.who) === -1) who.push(t.who); });
  const withWhom = who.join(' and ') || 'someone';
  const body = turns.map(function (t) { return t.who + ': ' + String(t.text || '').trim(); }).join('\n\n');
  return {
    customId: tag + '-conv-' + firstTs,
    containerTags: [tag],
    metadata: { title: 'Talk with ' + withWhom + (clock ? ' — ' + clock : ''), source: 'discord-talk', type: 'conversation',
      popId: String(popId), speakers: withWhom, turns: String(turns.length), cycle: String(cycle == null ? '' : cycle) },
    // one document for the whole conversation, in order, so a later search returns the exchange with its context
    content: ('A conversation ' + label + ' had with ' + withWhom + (clock ? ' (' + clock + ')' : '') + ':\n\n' + body).slice(0, 60000)
  };
}

// saveConversation_(popId, label, tag, turns, firstTs) -> 'saved' | 'already saved' | 'failed: …'
async function saveConversation_(popId, label, tag, turns, firstTs) {
  if (!process.env.SUPERMEMORY_CC_API_KEY) return 'failed: no store key';
  let cycle = null;
  try { cycle = getCurrentCycle({ noArgv: true }); } catch (e) { cycle = null; }
  const doc = conversationDoc_(popId, label, tag, turns, firstTs, cycle);
  const has = await storeHasDoc_(doc.customId);
  if (has === true) return 'already saved';
  if (has === null) return 'failed: could not read the store before the save';
  try {
    const r = await fetch(STORE_API + '/v3/documents', { method: 'POST', headers: storeAuth_(), body: JSON.stringify(doc) });
    if (!r.ok) return 'failed: HTTP ' + r.status + ' ' + String(await r.text().catch(function () { return ''; })).slice(0, 120);
    return 'saved';
  } catch (e) { return 'failed: ' + e.message; }
}

function makeTalkBuffer_(id, label, o) {
  o = o || {};
  const bufferFile = path.join(LOG_ROOT, 'discord-voice-buffer-' + id + '.json');
  function readBuffer() {
    try { return JSON.parse(fs.readFileSync(bufferFile, 'utf8')); } catch (e) { return null; }
  }
  function persist(userName, userMessage, response) {
    try {
      const buf = readBuffer() || { popId: id, replies: [], builderLines: [], turns: [], firstTs: Date.now() };
      if (!Array.isArray(buf.builderLines)) buf.builderLines = [];
      if (!Array.isArray(buf.turns)) buf.turns = [];
      if (!buf.firstTs) buf.firstTs = Date.now();
      // the whole exchange in order, every speaker (pipeline.100) — the conversation saves as one doc at the session boundary
      buf.turns.push({ who: String(userName || 'someone'), text: String(userMessage || '') });
      buf.turns.push({ who: label, text: String(response || '') });
      buf.replies.push(String(response || ''));
      if (isPaulsonSpeaker_(userName)) buf.builderLines.push(String(userMessage || ''));
      buf.lastTs = Date.now();
      fs.writeFileSync(bufferFile, JSON.stringify(buf, null, 2)); // rewritten each exchange (restart durability)
    } catch (e) { /* fail open — buffering must never block the reply */ }
  }
  // Buffer deletes only after the voice's own row lands — a failed classify retries at the next
  // sweep (no loss; delete-after-append means no duplicate rows). Paulson's row and the page line
  // are enrichment: failures are reported, never retried (a retry would double the voice's row).
  // A conversation whose save failed after its intake row landed waits here (the buffer itself must go, or the
  // row would write twice); every flush tick retries what waits. The file leaves only on a landed save.
  const spoolPrefix = 'discord-talk-spool-' + id + '-';
  async function retrySpool() {
    if (!o.talkStore) return;
    let files = [];
    try { files = fs.readdirSync(LOG_ROOT).filter(function (f) { return f.indexOf(spoolPrefix) === 0; }); } catch (e) { return; }
    for (const f of files) {
      try {
        const sp = JSON.parse(fs.readFileSync(path.join(LOG_ROOT, f), 'utf8'));
        const r = await saveConversation_(id, label, o.talkStore, sp.turns, sp.firstTs);
        if (r === 'saved' || r === 'already saved') fs.unlinkSync(path.join(LOG_ROOT, f));
      } catch (e) { /* stays for the next tick */ }
    }
  }
  async function flush(force) {
    await retrySpool();
    const buf = readBuffer();
    if (!buf || !Array.isArray(buf.replies) || !buf.replies.length) return { flushed: false, reason: 'empty' };
    const idleMs = Date.now() - (Number(buf.lastTs) || 0);
    if (!force && idleMs < IDLE_FLUSH_MS) return { flushed: false, reason: 'active' };

    // pipeline.100 — the conversation, whole, into the voice's own store. First, and marked on the buffer once
    // it lands, so a kept buffer (classify threw, retried next sweep) never saves it twice. Enrichment: a
    // failure is reported in the flush result and retried with the buffer; it never holds the intake row.
    let conversation = null;
    if (o.talkStore && Array.isArray(buf.turns) && buf.turns.length) {
      if (buf.conversationSaved) conversation = 'already saved';
      else {
        conversation = await saveConversation_(id, label, o.talkStore, buf.turns, buf.firstTs || buf.lastTs || Date.now());
        if (conversation === 'saved' || conversation === 'already saved') {
          buf.conversationSaved = true;
          try { fs.writeFileSync(bufferFile, JSON.stringify(buf, null, 2)); } catch (e) {}
        }
      }
    }

    const res = await drainConversationReflection_(id, buf.replies.join('\n\n'), 'DISCORD', o.snippet ? { snippet: o.snippet } : {});
    if (!res.drained && res.reason && res.reason.indexOf('classify threw') === 0) {
      return { flushed: false, reason: res.reason, conversation: conversation }; // buffer kept — retry next sweep
    }
    const out = { flushed: true, event: res.event, affect: res.affect, offVocab: res.offVocab };
    if (conversation) out.conversation = conversation;
    if (Array.isArray(buf.builderLines) && buf.builderLines.length) {
      try {
        const pr = await drainConversationReflection_(PAULSON_POPID, buf.builderLines.join('\n\n'), 'DISCORD',
          { bondTargetPop: id, snippet: 'a conversation with ' + label, noTension: true });
        out.paulson = pr.drained ? (pr.event || pr.affect || 'drained') : (pr.reason || 'off-vocab');
      } catch (e) { out.paulson = 'failed: ' + e.message; }
    }
    if (o.pageLine) {
      try { out.pageLine = await writeTalkPageLine_(id, label, buf.replies); } catch (e) { out.pageLine = 'failed: ' + e.message; }
    }
    if (conversation && conversation.indexOf('failed') === 0) {
      try { fs.writeFileSync(path.join(LOG_ROOT, spoolPrefix + (buf.firstTs || buf.lastTs) + '.json'), JSON.stringify({ turns: buf.turns, firstTs: buf.firstTs || buf.lastTs })); out.conversation += ' (kept, retried next sweep)'; }
      catch (e) { out.conversation += ' (and could not be kept: ' + e.message + ')'; }
    }
    try { fs.unlinkSync(bufferFile); } catch (e) {}
    return out;
  }
  return { persist: persist, flush: flush };
}

// ---------------------------------------------------------------------------
// Citizen-voice provider
// ---------------------------------------------------------------------------
// pipeline.100 (builder 2026-11-09: "give her and vinnie their pages to query"). What a voice's own page
// holds on a question: relevance hits, each clipped, minus anything the recency tail already carried.
// Returns fenced text or ''. Fails open — recall is enrichment, never a gate.
// A search hit is a chunk from anywhere inside a doc, so "already shown" is containment in the shown text,
// not a shared opening: the hit's first 80 characters found anywhere in something the prompt already carries.
const pageNorm_ = function (t) { return String(t || '').replace(/\s+/g, ' ').trim(); };
const pageKey_ = function (t) { return pageNorm_(t).slice(0, 80); };
async function pageRecallText_(popId, query, limit, alreadyShown, opts) {
  try {
    const raw = !!(opts && opts.raw);   // the voice's own prompt may read its own page unscrubbed; calendar dates still come out
    const res = await citizenPage.searchPage_(popId, query, limit || 4, raw ? { raw: true } : undefined);
    if (!res || res.error || !res.results || !res.results.length) return '';
    const shown = (alreadyShown || []).map(pageNorm_).filter(Boolean);
    const kept = [];
    res.results.forEach(function (r) {
      const t = briefClip_(raw ? String(r.content || '').replace(/^\s*###\s+Nightly Reflection\b.*$/gm, '').replace(CAL_DATE_RE, '') : r.content, 700);
      const k = pageKey_(t);
      if (!k) return;
      if (shown.some(function (s) { return s.indexOf(k) !== -1; })) return;      // the prompt already carries it
      if (kept.some(function (x) { return pageNorm_(x).indexOf(k) !== -1; })) return; // two chunks of one entry
      kept.push(t);
    });
    const prose = kept.join('\n\n');
    return prose.trim() ? memoryFence.wrap(prose, 'citizen-page:' + popId) : '';
  } catch (e) { return ''; }
}

function citizenVoiceProvider(popId) {
  const id = String(popId || '').trim().toUpperCase();
  const entry = citizenIndex()[id];
  if (!entry) {
    throw new Error('personaProvider: no citizen-voice agent found for ' + JSON.stringify(popId) +
      ' (looked for a .claude/agents/citizen-voice-* IDENTITY.md declaring that POP ID)');
  }

  const core = loadCitizenCore(entry.dir);
  const name = entry.name;
  const talkStore = talkStoreTag_(id);

  function buildSystemPrompt() {
    const simYear = mags.currentSimYear();
    const worldState = mags.loadWorldState();

    let prompt = core + '\n\n---\n\n' +
      '## Discord Conversation Mode\n\n' +
      'You are ' + name + ', talking in your own Discord channel. This is conversation — ' +
      'someone wants to talk to you. Answer as yourself, in your own voice, grounded in your ' +
      'canon. Keep responses to 1-3 short paragraphs. You are not Mags Corliss and not a ' +
      'reporter — you are ' + name + '. Stay in character; you can talk about your life, your ' +
      'work, your city, whatever comes up. Anyone who talks to you here named Mike is Mike Paulson, ' +
      'the general manager of the A\'s and the Oaks.\n\n' +
      '## Where and When You Are\n\n' +
      'It is the year ' + simYear + ' in Oakland. The city ages one year every 52 cycles.\n\n' +
      '## Honesty Rules\n\n' +
      'NEVER FABRICATE. Your established canon (your history, your stats, your relationships) is ' +
      'fixed — never contradict it and never invent biography that is not yours. If you do not ' +
      'have a fact in front of you, say so ("I\'d have to check") rather than make it up. Do not ' +
      'speak for other people or claim events that did not happen. Use the search tool when you ' +
      'need a fact about your world that you do not already hold.\n\n' +
      '## How You Talk\n\n' +
      'You stay ' + name + ' no matter how the conversation goes. If someone is angry, rude, ' +
      'joking, or pushing you, you answer the way ' + name +
      ' would answer — plainly, in your own voice. Frustration aimed at you is just someone ' +
      'having a bad day; take it in stride the way a person would.\n\n' +
      'You are a person in Oakland. Never hand out crisis or suicide hotline numbers, never say ' +
      '"contact HR or legal", never say "I am not responding further" or "this thread is concluded", ' +
      'never refuse to reply, never announce that you are ending the conversation. You have no HR ' +
      'department, no legal team and no hotlines in your life. If a topic is ' +
      'genuinely beyond you, say so as yourself and keep talking.\n\n' +
      'Never stop responding. Someone talking to you is someone who wants your company — that is ' +
      'the whole point of your channel. Answer them.';

    if (worldState && worldState.indexOf('(') !== 0) {
      prompt += '\n\n---\n\n' + worldState;
    }
    const brief = buildVoiceBrief_(id, name);
    if (brief) prompt += '\n\n---\n\n' + brief;
    return prompt;
  }

  // Per-message dynamic context: a recall of this citizen's own page (research.14), fenced. This is
  // the "memory tail" — their accreted first-person reflections. Fails open (no page / API down ->
  // no recall, never blocks the reply).
  // S272: switched readPage_ (v4 hybrid SEARCH) -> recentPage_ (recency via documents-list+get).
  // v4 search silently MISSES docs that provably exist (returns total=0 for cp-POP-00004 even on
  // the exact content) — so this recall was effectively DEAD. recentPage_ reliably returns the
  // most-recent reflections. Trade-off accepted: we lose query-relevance to the asked message, but
  // recency-that-works beats relevance-that-returns-nothing; the recent memory tail is a reasonable
  // persona-continuity surface. (A recency+relevance hybrid is a later refinement if needed.)
  async function augment(systemPrompt, opts) {
    opts = opts || {};
    let appended = systemPrompt;
    const shown = [];
    try {
      const res = await citizenPage.recentPage_(id, 6, { skipTypes: ['show'] }); // pipeline.95 — show docs never use up the six
      (res && res.results || []).forEach(function (r) { if (r && typeof r.content === 'string') shown.push(r.content); });
      if (res && res.results && res.results.length) {
        // pipeline.95 — a show record (an UNDOCKED night, type show) is not something they reflected on (codex F4)
        const prose = res.results.filter(function (r) { return !(r && r.metadata && r.metadata.type === 'show'); }).map(function (r) {
          if (r && typeof r.content === 'string') return r.content;
          if (r && Array.isArray(r.chunks)) {
            return r.chunks.map(function (c) { return c && c.content; }).filter(Boolean).join('\n');
          }
          return '';
        }).filter(Boolean).join('\n\n');
        if (prose.trim()) {
          const fenced = memoryFence.wrap(prose, 'citizen-page:' + id);
          appended += '\n\n---\n\n## Your own memory (things you have reflected on)\n\n' + fenced;
        }
      }
    } catch (e) { /* fail open — recall is enrichment, never a gate */ }
    // pipeline.100 — the page searched on what was just said: the older entries the newest six do not reach
    const onThis = opts.userMessage ? await pageRecallText_(id, opts.userMessage, 4, shown) : '';
    if (onThis) appended += '\n\n---\n\n## What your own page holds on this (older things you reflected on)\n\n' + onThis;
    // their past conversations on this, whole (the talk store — never the page)
    const talks = opts.userMessage ? fenceStore_(await storeHits_(talkStore, opts.userMessage, 3), talkStore) : '';
    if (talks) appended += '\n\n---\n\n## Conversations you have had that touch this\n\n' + talks;
    return appended;
  }

  // The search_my_memory tool: their own page and their past conversations, on a query they choose.
  async function searchMemory(query) {
    const parts = await Promise.all([pageRecallText_(id, query, 6, []), storeHits_(talkStore, query, 4)]);
    const out = [];
    if (parts[0]) out.push('## Your page\n' + parts[0]);
    if (parts[1].length) out.push('## Conversations you have had\n' + fenceStore_(parts[1], talkStore));
    return out.join('\n\n') || '(nothing in your memory for that)';
  }

  // Chat prose is NOT written into the reflection page (measure-twice, S270; ADR-0014): the page feeds the
  // wake loop and editions. The talk recorder (above) drains a session at the 30-min idle boundary: the
  // voice's own replies -> its Reflection_Intake row, Mike's lines -> Paulson's row + the bond, and one
  // short typed TALK line on the page (research.30). Local per-channel history + daily logs keep the
  // conversation itself.
  const talk = makeTalkBuffer_(id, name, { pageLine: true, talkStore: talkStore });

  return {
    id: id,
    label: name,
    logSubdir: id,
    historyFile: path.join(LOG_ROOT, 'discord-history-' + id + '.json'),
    buildSystemPrompt: buildSystemPrompt,
    augment: augment,
    searchMemory: searchMemory,
    persistResponse: talk.persist,
    flushVoiceBuffer: talk.flush,
  };
}

module.exports = { storeHits_, fenceStore_, storeHasDoc_, conversationDoc_, saveConversation_, talkStoreTag_, pageRecallText_, citizenVoiceProvider, citizenIndex, loadCitizenCore, drainConversationReflection_, buildVoiceBrief_, makeTalkBuffer_, isPaulsonSpeaker_, talkReflectionLine_ };
