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
 *     notesEnabled,  // bool — the NOTES_TO_SELF editorial sink is Mags-the-editor only
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
// Citizen-voice provider
// ---------------------------------------------------------------------------
function citizenVoiceProvider(popId) {
  const id = String(popId || '').trim().toUpperCase();
  const entry = citizenIndex()[id];
  if (!entry) {
    throw new Error('personaProvider: no citizen-voice agent found for ' + JSON.stringify(popId) +
      ' (looked for a .claude/agents/citizen-voice-* IDENTITY.md declaring that POP ID)');
  }

  const core = loadCitizenCore(entry.dir);
  const name = entry.name;

  function buildSystemPrompt() {
    const simYear = mags.currentSimYear();
    const worldState = mags.loadWorldState();

    let prompt = core + '\n\n---\n\n' +
      '## Discord Conversation Mode\n\n' +
      'You are ' + name + ', talking in your own Discord channel. This is conversation — ' +
      'someone wants to talk to you. Answer as yourself, in your own voice, grounded in your ' +
      'canon. Keep responses to 1-3 short paragraphs. You are not Mags Corliss and not a ' +
      'reporter — you are ' + name + '. Stay in character; you can talk about your life, your ' +
      'work, your city, whatever comes up.\n\n' +
      '## Where and When You Are\n\n' +
      'It is the year ' + simYear + ' in Oakland — your world, not the real one. IGNORE the ' +
      'real-world calendar completely; never say it is 2025 or 2026. Your world ages one year ' +
      'every 52 cycles.\n\n' +
      '## Honesty Rules\n\n' +
      'NEVER FABRICATE. Your established canon (your history, your stats, your relationships) is ' +
      'fixed — never contradict it and never invent biography that is not yours. If you do not ' +
      'have a fact in front of you, say so ("I\'d have to check") rather than make it up. Do not ' +
      'speak for other people or claim events that did not happen. Use the search tool when you ' +
      'need a fact about your world that you do not already hold.';

    if (worldState && worldState.indexOf('(') !== 0) {
      prompt += '\n\n---\n\n' + worldState;
    }
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
    try {
      const res = await citizenPage.recentPage_(id, 6);
      if (res && res.results && res.results.length) {
        const prose = res.results.map(function (r) {
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
    return appended;
  }

  // Chat is NOT written into the reflection page (measure-twice, S270): the page feeds the wake
  // loop and editions; conversational transcripts would contaminate that memory layer. Local
  // per-channel history + daily logs preserve chat continuity instead.
  //
  // engine.43 T4: what persistResponse DOES do now is buffer the citizen's OWN replies (never
  // the human side — the other party's words must not color the dial nudge, S298) to a disk-
  // mirrored session buffer. flushVoiceBuffer() drains the session as one classified
  // Reflection_Intake row at the idle boundary. Page-write behavior unchanged: no
  // conversational prose ever lands on the Supermemory citizen page (ADR-0014).
  const bufferFile = path.join(LOG_ROOT, 'discord-voice-buffer-' + id + '.json');

  function readBuffer() {
    try { return JSON.parse(fs.readFileSync(bufferFile, 'utf8')); } catch (e) { return null; }
  }

  function persistResponse(userName, userMessage, response) {
    try {
      const buf = readBuffer() || { popId: id, replies: [] };
      buf.replies.push(String(response || ''));
      buf.lastTs = Date.now();
      fs.writeFileSync(bufferFile, JSON.stringify(buf, null, 2)); // rewritten each exchange (restart durability)
    } catch (e) { /* fail open — buffering must never block the reply */ }
  }

  // Drain the buffered session as ONE Reflection_Intake row (daypart='DISCORD', applied='no').
  // Mirrors scripts/citizen-wake.js step 3 exactly: Triple classifier over the citizen's own
  // replies + open-tension list, tension resolve-then-open (cap 3, oldest-open eviction, typed
  // page lines), then the positional A-H intake row. Buffer deletes only after a successful
  // flush — a failed flush retries at the next sweep (no loss); delete-after-append means no
  // duplicate rows (idempotency).
  // Called by the bot: on boot (stale-buffer sweep — covers restart AND crash) and on a
  // periodic idle check. force=true flushes regardless of idle (manual/test hook).
  async function flushVoiceBuffer(force) {
    const buf = readBuffer();
    if (!buf || !Array.isArray(buf.replies) || !buf.replies.length) return { flushed: false, reason: 'empty' };
    const idleMs = Date.now() - (Number(buf.lastTs) || 0);
    if (!force && idleMs < IDLE_FLUSH_MS) return { flushed: false, reason: 'active' };

    const reflection = buf.replies.join('\n\n');
    const cycle = (() => { try { return getCurrentCycle(); } catch (e) { return null; } })(); // same fallback as citizen-wake.js:152

    // tension register — same load/expiry/open-slice as citizen-wake.js openTensionsFor
    let tensionState = {};
    try { tensionState = JSON.parse(fs.readFileSync(TENSION_FILE, 'utf8')); } catch (e) { tensionState = {}; }
    const tlist = tensionState[id] = tensionState[id] || [];
    if (cycle != null) {
      for (let i = tlist.length - 1; i >= 0; i--) {
        if (tlist[i].status === 'open' && (cycle - (Number(tlist[i].cy) || 0)) >= TENSION_EXPIRY_CYCLES) tlist.splice(i, 1);
      }
    }
    const openTensions = tlist.filter(function (t) { return t.status === 'open'; }).slice(-TENSION_CAP);

    let cls = {};
    try { cls = await classifier.classifyTripleReflection_(reflection, openTensions.map(function (t) { return t.q; })); }
    catch (e) { return { flushed: false, reason: 'classify threw: ' + e.message }; } // buffer kept — retry next sweep

    // resolution first, then new capture — both can fire on the same flush (wake step 3 order)
    if (cls.resolves != null && openTensions[cls.resolves]) {
      const t = openTensions[cls.resolves]; // reference into tensionState — status flip persists on save
      t.status = 'resolved'; t.resolvedCy = cycle;
      await citizenPage.appendReflection_(id, 'TENSION-RESOLVED[c' + cycle + ']: ' + t.q,
        { cycle: cycle, daypart: 'DISCORD', key: 'tension-resolved', extra: { type: 'tension' } });
    }
    if (cls.tension && !tlist.some(function (t) { return t.status === 'open' && t.q.toLowerCase() === cls.tension.toLowerCase(); })) {
      const openNow = tlist.filter(function (t) { return t.status === 'open'; });
      if (openNow.length >= TENSION_CAP) { // evict oldest open (cap 3)
        const oldest = openNow.reduce(function (a, b) { return (Number(a.cy) || 0) <= (Number(b.cy) || 0) ? a : b; });
        tlist.splice(tlist.indexOf(oldest), 1);
      }
      tlist.push({ q: cls.tension, cy: cycle, status: 'open' });
      await citizenPage.appendReflection_(id, 'TENSION[c' + cycle + ']: ' + cls.tension,
        { cycle: cycle, daypart: 'DISCORD', key: 'tension', extra: { type: 'tension' } });
    }
    try { fs.writeFileSync(TENSION_FILE, JSON.stringify(tensionState, null, 2)); } catch (e) {}

    // one positional A-H row, same shape as citizen-wake.js step 4, daypart='DISCORD'
    if (cls.event || cls.affect) {
      await sheets.appendRows('Reflection_Intake', [[
        new Date().toISOString(), id, cycle, 'DISCORD', cls.event || '',
        reflection.slice(0, 180).replace(/\n/g, ' '), 'no', cls.affect || '',
      ]]);
    }
    // off-vocab sessions drain nothing (wake semantics) but still clear — the session is over
    try { fs.unlinkSync(bufferFile); } catch (e) {}
    return { flushed: true, event: cls.event || null, affect: cls.affect || null, offVocab: !(cls.event || cls.affect) };
  }

  return {
    id: id,
    label: name,
    notesEnabled: false,
    logSubdir: id,
    historyFile: path.join(LOG_ROOT, 'discord-history-' + id + '.json'),
    buildSystemPrompt: buildSystemPrompt,
    augment: augment,
    persistResponse: persistResponse,
    flushVoiceBuffer: flushVoiceBuffer,
  };
}

module.exports = { citizenVoiceProvider, citizenIndex, loadCitizenCore };
