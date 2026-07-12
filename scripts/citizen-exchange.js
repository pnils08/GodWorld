#!/usr/bin/env node
/* citizen-exchange — agents talk to agents on the 24/7 clock (engine.53, S312).
 *
 * One daily cron-fired exchange in one of three formats over a shared core:
 *   conversation — bonded pair, ripple-triggered (engine.48 Task 6 spec verbatim)
 *   interview    — reporter street interview of a citizen named in the freshest edition
 *   debate       — 2-3 voices with distinct stances on an initiative near its vote / shared tension
 * Participants assemble wake-parity perception (lib/wakePerception), speak on cheap DeepSeek
 * turns, and carry the exchange afterward: each citizen's OWN lines land on their OWN page
 * plus one gated Reflection_Intake row. Transcripts persist to output/exchanges/ where /sift
 * reads them as source candidates. The session /interview skill is untouched — this is its
 * cheap 24/7 sibling.
 *
 * ── CANON WALL (hard, every format) ────────────────────────────────────────────────────────
 * Per participant: own lines -> own page (format daypart) + one Reflection_Intake row
 * (applied='no') + tension register/local state ONLY — never LifeHistory, never dials, never
 * ledger writes. Journalists are craft, not lived reflection: they write NOTHING. Transcripts
 * are SOURCE MATERIAL — subjective, publishable only through a desk writing from them.
 * Dial write-back stays behind the gated cycle drain (wake PHASE-1 GATE discipline).
 *
 * Run: node scripts/citizen-exchange.js [--dry-run] [--format=conversation|interview|debate]
 *        [--pops=POP-A,POP-B[,POP-C]] [--cycle=N]
 *   --dry-run : assemble + generate (API calls, pennies), print prompts + transcript,
 *               write NOTHING (no page/intake/state/artifact).
 *   No --format -> trigger router decides: ripple conversation > fresh-edition interview >
 *   initiative-near-vote debate > "no exchange today" exit 0. Max one live exchange per day.
 *
 * Plan: docs/plans/2026-07-11-agent-exchange-engine.md (engine.53; supersedes engine.48 T6/T7).
 */
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const sheets = require('/root/GodWorld/lib/sheets');
const dials = require('/root/GodWorld/lib/citizenDials');
const page = require('/root/GodWorld/lib/citizenPage');
const classifier = require('/root/GodWorld/lib/reflectionClassifier');
const getCurrentCycle = require('/root/GodWorld/lib/getCurrentCycle');
const { _hash53 } = require('/root/GodWorld/lib/provocationBank');
const { buildPool, coResidents, loadLifeArc, loadSportsSlice, loadNeighborhoodTexture,
  loadBonds, loadOwnPageReadback, dialTrajectory } = require('/root/GodWorld/lib/wakePerception');
const { matchCitizenToJournalist_ } = require('/root/GodWorld/utilities/rosterLookup');

const ARGV = process.argv.slice(2);
const DRY = ARGV.includes('--dry-run');
const arg = (k, d) => { const m = ARGV.find((a) => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };

const STATE_FILE = path.join(__dirname, '..', 'logs', 'citizen-exchange-state.json');
const RIPPLE_FILE = path.join(__dirname, '..', 'logs', 'citizen-ripple-state.json');
const TENSION_FILE = path.join(__dirname, '..', 'logs', 'citizen-tension-state.json');
const LOG_FILE = path.join(__dirname, '..', 'logs', 'citizen-exchange.log');
const EXCHANGE_DIR = path.join(__dirname, '..', 'output', 'exchanges');
const TENSION_CAP = 3;
const TENSION_EXPIRY_CYCLES = 12;
const RIPPLE_EXPIRY_CYCLES = 12;

function logLine(s) {
  const line = `[${new Date().toISOString()}] ${s}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch (e) {}
  console.log(s);
}
function loadJson(f, dflt) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return dflt; } }
function saveJson(f, v) { fs.writeFileSync(f, JSON.stringify(v, null, 2)); }
function today() { return new Date().toISOString().slice(0, 10); }

// Tension register — same file/cap/expiry semantics as citizen-wake.js (B2 index).
function openTensionsFor(state, popId, cycle) {
  const list = state[popId] || [];
  if (cycle != null) {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].status === 'open' && (cycle - (Number(list[i].cy) || 0)) >= TENSION_EXPIRY_CYCLES) list.splice(i, 1);
    }
  }
  return list.filter((t) => t.status === 'open').slice(-TENSION_CAP);
}

const usageTotals = { calls: 0, prompt: 0, completion: 0 };
async function generate(system, messages, maxTokens) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://godworld.local' },
    body: JSON.stringify({ model: 'deepseek/deepseek-chat', max_tokens: maxTokens || 260, temperature: 0.85, messages: [{ role: 'system', content: system }, ...messages] }),
  });
  const j = await r.json();
  if (j.error) throw new Error('exchange: ' + (j.error.message || JSON.stringify(j.error)));
  const u = j.usage || {};
  usageTotals.calls += 1;
  usageTotals.prompt += Number(u.prompt_tokens) || 0;
  usageTotals.completion += Number(u.completion_tokens) || 0;
  return String(j.choices?.[0]?.message?.content || '').trim();
}

/* Wake-parity perception for one citizen — same block structure and ingredient order as the
 * wake/citizenVoice prompts (continuity -> people -> world -> surroundings -> memory). */
async function assembleParticipant(pool, popId, cycle, contextHint) {
  const c = pool.find((p) => p.popId === popId);
  if (!c) return null;
  const [neighbors, sportsLine, lifeArc, bondsLine] = await Promise.all([
    coResidents(c.nh, c.popId), loadSportsSlice(), loadLifeArc(c.popId), loadBonds(c.popId),
  ]);
  const textureLine = loadNeighborhoodTexture(c.nh, cycle);
  const pageRead = await loadOwnPageReadback(c.popId, {
    cycle, wake: 'EXCHANGE',
    contextText: [contextHint, textureLine, sportsLine, bondsLine, c.nh, c.occ].filter(Boolean).join(' '),
  });
  const disp = dials.disposition(c.cur);
  const traj = dialTrajectory(c.baseDials, c.cur);
  const who = neighbors.length ? `\n\nPeople around you in ${c.nh}: ${neighbors.map((n) => `${n.name}${n.occupation ? ' (' + n.occupation + ')' : ''}`).join(', ')}.` : '';
  const bonds = bondsLine ? `\n\nPeople you have history with: ${bondsLine}.` : '';
  const arcLine = lifeArc ? `\n\nYour life so far: ${lifeArc}.` : '';
  const trajLine = traj ? ` Lately you've been ${traj}.` : '';
  const sports = sportsLine ? `\n\nAround Oakland: ${sportsLine}` : '';
  const texture = textureLine ? `\n\nAround your neighborhood: ${textureLine}` : '';
  const memory = pageRead.block ? `\n\n---\n\nWhat's been on your mind lately, from your own private reflections:\n${pageRead.block}` : '';
  const system = `You are ${c.name}, ${c.age ? c.age + ', ' : ''}a ${c.occ || 'resident'} living in ${c.nh}, Oakland. You are an ordinary person, not a writer. Your temperament: ${disp}.${trajLine}${arcLine}\n\nReal things from your life recently:\n${c.life}${who}${bonds}${sports}${texture}${memory}`;
  return { c, system, bondsLine, disp };
}

/* Alternating turns. Each speaker sees the running transcript from its own POV: own lines as
 * assistant turns, everyone else's as user turns (speaker-labelled when 3+ participants). */
async function runExchange(speakers, totalTurns, maxTokens) {
  const transcript = []; // {popId, name, text}
  for (let t = 0; t < totalTurns; t++) {
    const s = speakers[t % speakers.length];
    const label = speakers.length > 2;
    const messages = [];
    for (const line of transcript) {
      if (line.popId === s.id) messages.push({ role: 'assistant', content: line.text });
      else {
        const content = label ? `${line.name}: ${line.text}` : line.text;
        if (messages.length && messages[messages.length - 1].role === 'user') messages[messages.length - 1].content += '\n\n' + content;
        else messages.push({ role: 'user', content });
      }
    }
    if (!messages.length) messages.push({ role: 'user', content: s.opener || '(You speak first.)' });
    // Strict user/assistant alternation — a list can otherwise open on the speaker's own line.
    if (messages[0].role === 'assistant') messages.unshift({ role: 'user', content: s.opener || '(The conversation begins.)' });
    const text = await generate(s.system + '\n\n' + s.frame, messages, maxTokens);
    if (!text) throw new Error(`empty generation for ${s.id} at turn ${t + 1}`);
    transcript.push({ popId: s.id, name: s.name, text });
  }
  return transcript;
}

/* Wake write block (citizen-wake steps 1-4) on a participant's OWN lines. */
async function recordParticipant(c, ownText, daypart, cycle, tensionState) {
  const openTensions = openTensionsFor(tensionState, c.popId, cycle);
  let cls = {};
  try { cls = await classifier.classifyTripleReflection_(ownText, openTensions.map((t) => t.q)); } catch (e) { cls = { raw: 'classify threw: ' + e.message }; }
  const ptr = await page.ensurePagePointer_(c.popId);
  if (ptr.error) throw new Error('ensurePagePointer_: ' + ptr.error);
  const appended = await page.appendReflection_(c.popId, ownText, {
    cycle, daypart, extra: { affect: cls.affect || null, event: cls.event || null },
  });
  if (appended.error) throw new Error('appendReflection_: ' + appended.error);
  logLine(`[record] ${c.popId} page ${ptr.tag} <- ${daypart} doc ${appended.id || '?'}`);
  const tlist = tensionState[c.popId] = tensionState[c.popId] || [];
  if (cls.resolves != null && openTensions[cls.resolves]) {
    const t = openTensions[cls.resolves];
    t.status = 'resolved'; t.resolvedCy = cycle;
    await page.appendReflection_(c.popId, `TENSION-RESOLVED[c${cycle}]: ${t.q}`, { cycle, daypart, key: 'tension-resolved', extra: { type: 'tension' } });
  }
  if (cls.tension && !tlist.some((t) => t.status === 'open' && t.q.toLowerCase() === cls.tension.toLowerCase())) {
    const openNow = tlist.filter((t) => t.status === 'open');
    if (openNow.length >= TENSION_CAP) {
      const oldest = openNow.reduce((a, b) => ((Number(a.cy) || 0) <= (Number(b.cy) || 0) ? a : b));
      tlist.splice(tlist.indexOf(oldest), 1);
    }
    tlist.push({ q: cls.tension, cy: cycle, status: 'open' });
    await page.appendReflection_(c.popId, `TENSION[c${cycle}]: ${cls.tension}`, { cycle, daypart, key: 'tension', extra: { type: 'tension' } });
  }
  if (cls.event || cls.affect) {
    await sheets.appendRows('Reflection_Intake', [[
      new Date().toISOString(), c.popId, cycle, daypart, cls.event || '', ownText.slice(0, 180).replace(/\n/g, ' '), 'no', cls.affect || '',
    ]]);
    logLine(`[record] ${c.popId} Reflection_Intake <- event=[${cls.event || '-'}] affect=[${cls.affect || '-'}] (applied=no, gated)`);
  } else {
    logLine(`[record] ${c.popId} classifier off-vocab/err, intake skipped: ${cls.raw}`);
  }
}

function writeArtifact(cycle, format, header, transcript) {
  fs.mkdirSync(EXCHANGE_DIR, { recursive: true });
  const file = path.join(EXCHANGE_DIR, `exchange_c${cycle}_${today()}_${format}.md`);
  // Body stays sim-safe: absolute cycle only, no Gregorian dates (filename is operator-facing).
  const lines = [`# Exchange — ${format} (Cycle ${cycle})`, '', ...header.map((h) => `- ${h}`), '', '---', ''];
  for (const t of transcript) lines.push(`**${t.name}:** ${t.text}`, '');
  fs.writeFileSync(file, lines.join('\n'));
  logLine(`transcript -> ${file}`);
  return file;
}

function printDry(speakers, transcript) {
  for (const s of speakers) console.log(`\n--- system (${s.id} ${s.name}) ---\n${s.system}\n--- frame ---\n${s.frame}`);
  console.log('\n--- transcript ---');
  for (const t of transcript) console.log(`\n${t.name}: ${t.text}`);
  console.log('\n--- (dry-run: no writes — no page, no intake, no state, no artifact) ---');
}

// ── Format: conversation (engine.48 Task 6 steps 1-5, verbatim) ────────────────────────────
async function formatConversation(pool, cycle, forcedPops) {
  let popA = forcedPops[0], popB = forcedPops[1], rippleKey = null, ripple = null;
  const rippleState = loadJson(RIPPLE_FILE, {});
  if (!popA || !popB) {
    const bondsRows = await sheets.getSheetAsObjects('Relationship_Bonds').catch(() => []);
    const bonded = (a, b) => bondsRows.some((r) => {
      const x = String(r.CitizenA || r.citizenA || '').toUpperCase(), y = String(r.CitizenB || r.citizenB || '').toUpperCase();
      const st = String(r.Status || r.status || 'active').toLowerCase();
      return st === 'active' && ((x === a && y === b) || (x === b && y === a));
    });
    let best = null;
    for (const [key, e] of Object.entries(rippleState)) {
      if (!e || e.consumed) continue;
      if (cycle != null && (cycle - (Number(e.cy) || 0)) >= RIPPLE_EXPIRY_CYCLES) continue;
      const from = String(e.from || '').toUpperCase(), to = String(e.to || '').toUpperCase();
      if (!pool.find((p) => p.popId === from) || !pool.find((p) => p.popId === to)) continue;
      if (!bonded(from, to)) continue;
      if (!best || (Number(e.cy) || 0) > (Number(best.e.cy) || 0)) best = { key, e };
    }
    if (!best) { logLine('no conversation today (no eligible un-consumed ripple pair)'); return null; }
    rippleKey = best.key; ripple = best.e;
    popA = String(ripple.from).toUpperCase(); popB = String(ripple.to).toUpperCase();
  }
  const [pa, pb] = await Promise.all([
    assembleParticipant(pool, popA, cycle, 'a conversation with a friend'),
    assembleParticipant(pool, popB, cycle, 'a conversation with a friend'),
  ]);
  if (!pa || !pb) { logLine(`conversation: ${!pa ? popA : popB} not voiceable`); return null; }
  const frameFor = (self, other, isInitiator) =>
    `You are talking with ${other.c.name}${self.bondsLine ? ', someone you have history with' : ''}. ` +
    (isInitiator && ripple ? `You've been thinking about ${other.c.name} lately. ` : '') +
    'Speak as yourself, plainly, 2-4 sentences per turn. Never mention data, records, or that you were asked by a system.';
  const speakers = [
    { id: pa.c.popId, name: pa.c.name, system: pa.system, frame: frameFor(pa, pb, true), opener: `(You run into ${pb.c.name} and start the conversation.)` },
    { id: pb.c.popId, name: pb.c.name, system: pb.system, frame: frameFor(pb, pa, false) },
  ];
  const transcript = await runExchange(speakers, 6, 200); // 3 turns/side
  if (DRY) { printDry(speakers, transcript); return { dry: true }; }
  const tensionState = loadJson(TENSION_FILE, {});
  for (const p of [pa, pb]) {
    const own = transcript.filter((t) => t.popId === p.c.popId).map((t) => t.text).join('\n');
    await recordParticipant(p.c, own, 'CONVO', cycle, tensionState);
  }
  saveJson(TENSION_FILE, tensionState);
  if (rippleKey) { delete rippleState[rippleKey]; saveJson(RIPPLE_FILE, rippleState); logLine(`ripple consumed: ${rippleKey}`); }
  const file = writeArtifact(cycle, 'conversation', [
    `participants: ${pa.c.popId} ${pa.c.name} | ${pb.c.popId} ${pb.c.name}`,
    `trigger: ${ripple ? 'ripple (' + rippleKey + ')' : 'forced --pops'}`,
  ], transcript);
  return { file, participants: [pa.c.popId, pb.c.popId] };
}

// ── Format: interview (reporter street interview, journalist writes nothing) ───────────────
function freshestEdition() {
  let best = null;
  for (const f of fs.readdirSync(path.join(__dirname, '..', 'editions')).filter((x) => /^cycle_pulse_edition_(\d+)\.txt$/.test(x))) {
    const n = Number(f.match(/_(\d+)\.txt$/)[1]);
    if (!best || n > best.n) best = { n, f };
  }
  return best; // {n: cycle, f: filename} | null
}
function parseNamesIndex(file) {
  const txt = fs.readFileSync(path.join(__dirname, '..', 'editions', file), 'utf8');
  const idx = txt.indexOf('NAMES INDEX');
  if (idx < 0) return [];
  const out = [];
  for (const line of txt.slice(idx).split('\n')) {
    const m = line.match(/^(POP-\d{5})\s*\|\s*([^|]+)\|\s*(.+)$/);
    if (m) out.push({ popId: m[1].toUpperCase(), name: m[2].trim(), context: m[3].trim() });
  }
  return out;
}
async function formatInterview(pool, cycle, forcedPops, state) {
  const ed = freshestEdition();
  if (!ed) { logLine('no interview today (no editions on disk)'); return null; }
  const named = parseNamesIndex(ed.f);
  const done = new Set((state.interviewed && state.interviewed['c' + ed.n]) || []);
  let candidates = named.filter((x) => pool.find((p) => p.popId === x.popId) && !done.has(x.popId));
  if (forcedPops[0]) candidates = named.filter((x) => x.popId === forcedPops[0]);
  if (!candidates.length) { logLine(`no interview today (no un-interviewed NAMES INDEX citizens in pool, edition c${ed.n})`); return null; }
  const pick = candidates[_hash53(today() + 'c' + ed.n, 0x5eed) % candidates.length];
  const p = await assembleParticipant(pool, pick.popId, cycle, pick.context);
  if (!p) { logLine(`interview: ${pick.popId} not voiceable`); return null; }
  const match = matchCitizenToJournalist_(p.c.archetype || null, p.c.nh, null) || {};
  const jName = match.journalist || 'a Tribune reporter';
  const jSystem = `You are ${jName}, a reporter for the Bay Tribune in Oakland.${match.voiceGuidance ? ' Your voice: ' + match.voiceGuidance : ''}\n\nYou are interviewing ${p.c.name}, ${p.c.occ || 'a resident'} from ${p.c.nh}. The Tribune recently wrote about them: "${pick.context}". Your angle: ${match.interviewAngle || 'general profile'}.`;
  const jFrame = 'Ask ONE clear, specific question at a time — short, human, no preamble. You are on the street, not in a studio.';
  const cFrame = 'A Bay Tribune reporter stopped you for a quick street interview. Answer as yourself, plainly, 2-5 sentences. Never mention data, records, or that you were asked by a system.';
  const speakers = [
    { id: '_journalist', name: jName, system: jSystem, frame: jFrame, opener: '(Open the interview with your first question.)' },
    { id: p.c.popId, name: p.c.name, system: p.system, frame: cFrame },
  ];
  const transcript = await runExchange(speakers, 4, 220); // 2 questions, 2 answers
  if (DRY) { printDry(speakers, transcript); return { dry: true }; }
  const tensionState = loadJson(TENSION_FILE, {});
  const own = transcript.filter((t) => t.popId === p.c.popId).map((t) => t.text).join('\n');
  await recordParticipant(p.c, own, 'INTERVIEW', cycle, tensionState); // journalist side: NO writes
  saveJson(TENSION_FILE, tensionState);
  state.interviewed = state.interviewed || {};
  (state.interviewed['c' + ed.n] = state.interviewed['c' + ed.n] || []).push(p.c.popId);
  const file = writeArtifact(cycle, 'interview', [
    `participants: ${jName} (Bay Tribune) -> ${p.c.popId} ${p.c.name}`,
    `trigger: edition c${ed.n} NAMES INDEX ("${pick.context.slice(0, 100)}")`,
  ], transcript);
  return { file, participants: [p.c.popId] };
}

// ── Format: debate (distinct stances or skip) ──────────────────────────────────────────────
async function formatDebate(pool, cycle, forcedPops, state) {
  let topic = null, participants = [];
  const debated = new Set(state.debated || []);
  // (a) initiative with a vote within 3 cycles
  const inits = await sheets.getSheetAsObjects('Initiative_Tracker').catch(() => []);
  const near = inits.filter((r) => r.InitiativeID && !debated.has(r.InitiativeID) && r.VoteCycle !== '' &&
    Math.abs(Number(r.VoteCycle) - cycle) <= 3 && Number(r.VoteCycle) >= cycle);
  const offices = await sheets.getSheetAsObjects('Civic_Office_Ledger').catch(() => []);
  const officialInPool = (faction) => {
    const holders = offices.filter((o) => String(o.Faction || '').toUpperCase() === String(faction || '').toUpperCase() && o.PopId);
    for (const h of holders) { const c = pool.find((p) => p.popId === String(h.PopId).toUpperCase()); if (c) return { pop: c.popId, office: h }; }
    return null;
  };
  if (forcedPops.length >= 2) {
    topic = { kind: 'forced', text: arg('topic', 'what your neighborhood needs most right now'), id: null };
    participants = forcedPops.map((pop) => ({ pop, stance: null }));
  } else if (near.length) {
    const init = near[0];
    topic = { kind: 'initiative', text: `${init.Name} (${init.InitiativeID}) — vote at cycle ${init.VoteCycle}`, id: init.InitiativeID };
    const lead = officialInPool(init.LeadFaction), opp = officialInPool(init.OppositionFaction);
    if (lead) participants.push({ pop: lead.pop, stance: `You are ${lead.office.Holder}, ${lead.office.Title}. Your faction (${init.LeadFaction}) LEADS this initiative — you are for it and you say why in concrete terms.` });
    if (opp) participants.push({ pop: opp.pop, stance: `You are ${opp.office.Holder}, ${opp.office.Title}. Your faction (${init.OppositionFaction}) OPPOSES this initiative — you push back and you say what it costs.` });
    const hoods = String(init.AffectedNeighborhoods || '').split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
    const local = pool.find((p) => hoods.includes(p.nh) && !participants.some((x) => x.pop === p.popId));
    if (local && participants.length < 3) participants.push({ pop: local.popId, stance: `You live in ${local.nh}, one of the neighborhoods this lands on. You speak from what it would actually change on your block — you owe neither side agreement.` });
  } else {
    // (b) tension shared by >=2 citizens (keyword overlap on open tensions)
    const tensionState = loadJson(TENSION_FILE, {});
    const open = [];
    for (const [pop, list] of Object.entries(tensionState)) {
      if (!pool.find((p) => p.popId === pop)) continue;
      for (const t of (list || [])) if (t.status === 'open') open.push({ pop, q: String(t.q) });
    }
    outer: for (let i = 0; i < open.length; i++) {
      for (let j = i + 1; j < open.length; j++) {
        if (open[i].pop === open[j].pop) continue;
        const wa = new Set(open[i].q.toLowerCase().match(/[a-z]{4,}/g) || []);
        const shared = (open[j].q.toLowerCase().match(/[a-z]{4,}/g) || []).filter((w) => wa.has(w));
        if (shared.length >= 2) {
          topic = { kind: 'tension', text: `a question hanging over both of you: "${open[i].q}"`, id: null };
          participants = [
            { pop: open[i].pop, stance: `Something you have been carrying: "${open[i].q}". Speak from it.` },
            { pop: open[j].pop, stance: `Something you have been carrying: "${open[j].q}". Speak from it.` },
          ];
          break outer;
        }
      }
    }
  }
  if (!topic || participants.length < 2) { logLine('no debate today (no initiative near vote, no shared tension)'); return null; }

  const assembled = [];
  for (const part of participants) {
    const p = await assembleParticipant(pool, part.pop, cycle, topic.text);
    if (p) assembled.push({ p, stance: part.stance });
  }
  if (assembled.length < 2) { logLine('debate: fewer than 2 voiceable participants'); return null; }
  const stances = assembled.map((a) => a.stance || `Your temperament: ${a.p.disp}. You speak from your own life, not a side.`);
  if (new Set(stances.map((s) => String(s))).size < 2) { logLine('debate skipped: stances converge (a debate without disagreement is a panel)'); return null; }

  const speakers = assembled.map((a, i) => {
    const others = assembled.filter((_, j) => j !== i).map((x) => x.p.c.name).join(' and ');
    return {
      id: a.p.c.popId, name: a.p.c.name, system: a.p.system,
      frame: `You are in a public back-and-forth with ${others} about ${topic.text}. ${stances[i]} 2-4 sentences per turn, respond to what ${others} actually said — they are who is in front of you. Never mention data, records, or that you were asked by a system.`,
      opener: i === 0 ? '(Open with your position.)' : undefined,
    };
  });
  const transcript = await runExchange(speakers, speakers.length * 2, 200); // 2 rounds each
  if (DRY) { printDry(speakers, transcript); return { dry: true }; }
  const tensionState2 = loadJson(TENSION_FILE, {});
  for (const a of assembled) {
    const own = transcript.filter((t) => t.popId === a.p.c.popId).map((t) => t.text).join('\n');
    await recordParticipant(a.p.c, own, 'DEBATE', cycle, tensionState2);
  }
  saveJson(TENSION_FILE, tensionState2);
  if (topic.id) { state.debated = [...(state.debated || []), topic.id]; }
  const file = writeArtifact(cycle, 'debate', [
    `participants: ${assembled.map((a) => `${a.p.c.popId} ${a.p.c.name}`).join(' | ')}`,
    `topic: ${topic.text} (${topic.kind})`,
  ], transcript);
  return { file, participants: assembled.map((a) => a.p.c.popId) };
}

// ── Trigger router + cadence ───────────────────────────────────────────────────────────────
(async () => {
  const cycle = Number(arg('cycle', null)) || (() => { try { return getCurrentCycle(); } catch (e) { return null; } })();
  const forcedFormat = arg('format', null);
  const forcedPops = String(arg('pops', '') || '').toUpperCase().split(',').map((s) => s.trim()).filter(Boolean);
  const state = loadJson(STATE_FILE, {});

  if (!DRY && state.lastRunDate === today()) { logLine('already ran today (max 1 live exchange/day)'); process.exit(0); }

  let format = forcedFormat;
  if (!format) {
    // Priority: fresh ripple pair > fresh-edition un-interviewed > initiative near vote.
    const rippleState = loadJson(RIPPLE_FILE, {});
    const hasRipple = Object.values(rippleState).some((e) => e && !e.consumed && (cycle == null || (cycle - (Number(e.cy) || 0)) < RIPPLE_EXPIRY_CYCLES));
    const ed = freshestEdition();
    const pool0 = await buildPool({ shapedMin: 0, lifeMinChars: 0 });
    const freshEdition = ed && cycle != null && (cycle - ed.n) <= 2 &&
      parseNamesIndex(ed.f).some((x) => pool0.find((p) => p.popId === x.popId) && !new Set((state.interviewed && state.interviewed['c' + ed.n]) || []).has(x.popId));
    const inits = await sheets.getSheetAsObjects('Initiative_Tracker').catch(() => []);
    const debated = new Set(state.debated || []);
    const nearVote = cycle != null && inits.some((r) => r.InitiativeID && !debated.has(r.InitiativeID) && r.VoteCycle !== '' && Number(r.VoteCycle) >= cycle && Number(r.VoteCycle) - cycle <= 3);
    format = hasRipple ? 'conversation' : freshEdition ? 'interview' : nearVote ? 'debate' : null;
    if (!format) { logLine('no exchange today (no eligible trigger)'); process.exit(0); }
    logLine(`router -> ${format} (ripple=${hasRipple} freshEdition=${!!freshEdition} nearVote=${nearVote})`);
  }

  const pool = await buildPool({ shapedMin: 0, lifeMinChars: 0 });
  let result = null;
  if (format === 'conversation') result = await formatConversation(pool, cycle, forcedPops);
  else if (format === 'interview') result = await formatInterview(pool, cycle, forcedPops, state);
  else if (format === 'debate') result = await formatDebate(pool, cycle, forcedPops, state);
  else { console.error(`citizen-exchange: unknown --format=${format}`); process.exit(1); }

  console.error(`[tokens] total: ${usageTotals.calls} calls, prompt=${usageTotals.prompt}, completion=${usageTotals.completion}`);
  if (result && !result.dry && !DRY) {
    state.lastRunDate = today();
    saveJson(STATE_FILE, state);
    logLine(`exchange complete: ${format} | participants ${result.participants.join(', ')}`);
  }
  process.exit(0);
})().catch((e) => { console.error('citizen-exchange ERR: ' + e.message); process.exit(1); });
