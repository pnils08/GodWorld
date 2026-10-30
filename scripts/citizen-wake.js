#!/usr/bin/env node
/* citizen-wake — the rotating-citizen wake loop (citizen-loop Phase 2, engine-sheet S262).
 *
 * Mags keeps her nightly reflection (scripts/discord-reflection.js, the fixed anchor). THIS wakes a
 * DIFFERENT citizen each run — the variety engine. Each wake: draw one citizen by lottery over the whole
 * ledger (engine.197, builder 2026-10-17: "Any citizen can wake whenever, there are no rules"),
 * assemble THEIR scoped perception (dials -> disposition, their real LifeHistory tail, real
 * co-residents), have them reflect in their own voice (DeepSeek), accrete the prose to their private
 * Supermemory page, and persist the classified tag to Reflection_Intake for the (gated) cycle read.
 *
 * World-perception-triggered, NOT conversation-gated — fixes Mags' "silent on no-conversation days".
 *
 * ── PHASE-1 GATE (hard) ──────────────────────────────────────────────────────────────────────────
 * Perception + reflection + narrative-store + tag-persist ONLY. This script NEVER calls
 * applyTaggedEvent_ and NEVER writes dials/LifeHistory — the dial write-back is the deterministic
 * cycle's job and stays gated behind the Phase-1 daily audit. We only WRITE the tag to the intake;
 * the cycle READING it + applying is the gated half (not built here). Determinism holds: classify +
 * page are wake-side; the cycle later reads a frozen persisted tag, never the LLM.
 *
 * Run: node scripts/citizen-wake.js [--dry-run] [--wake=morning|midday|evening] [--cycle=N] [--pop=POP-XXXXX]
 *   --dry-run : assemble perception + generate the reflection, print it, write NOTHING.
 *   --pop     : force a specific citizen (testing/override) instead of rotation.
 */
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const sheets = require('/root/GodWorld/lib/sheets');
const dials = require('/root/GodWorld/lib/citizenDials');
const page = require('/root/GodWorld/lib/citizenPage');
const memoryFence = require('/root/GodWorld/lib/memoryFence');
const classifier = require('/root/GodWorld/lib/reflectionClassifier');
const resonance = require('/root/GodWorld/lib/resonanceRecall'); // B4 v1 — scored memory selection (seams Task 2)
const getCurrentCycle = require('/root/GodWorld/lib/getCurrentCycle');
// Task 5 (citizen-loop-deepening, S300): perception assembly extracted to lib/wakePerception —
// shared with scripts/citizenVoice.js (edition voicing) + the Task-6 conversation engine.
const { buildPool, coResidents, loadLifeArc, loadSportsSlice, loadNeighborhoodTexture,
  loadBonds, loadFamily, loadHealthState, loadOwnPageReadback, dialTrajectory,
  loadCardAnchor, loadVoiceTexture, renderStanding, renderOwnRecord,
  loadLivedEvents, renderLivedLine, livedFor, recordLivedSpend, selectWakeCitizen, wakeSeedKey,
  lifeTailOf, OWED_RESERVE, chaosOutcomeIndex, owedFrom, owedCandidates, owedFor, owedLivedPrefer, owedShownSet, owedWakesUsed, owedStateFrom, owedJournalLine, owedPageStep, loadOwedRecords, acquireFileLock } = require('/root/GodWorld/lib/wakePerception'); // engine.48 T10 + T11; loadFamily loop-doctrine 2026-08-04; loadHealthState engine.101 health slice; pipeline.93 owed
const { selectProvocation } = require('/root/GodWorld/lib/provocationBank'); // T5 varied-provocation bank
const { matchBondTargets_ } = require('./bondTargetMatch'); // engine.101 — intake BondTarget (col I) + T4 ripple share one match

const ARGV = process.argv.slice(2);
const DRY = ARGV.includes('--dry-run');
const arg = (k, d) => { const m = ARGV.find((a) => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };
const WAKE = (arg('wake', 'evening') || 'evening').toLowerCase();
const FORCE_POP = arg('pop', null);
// pipeline.93 — reserved owed wakes a Cycle; --owed-reserve=N overrides the library value (the dry replay).
const OWED_RES = arg('owed-reserve', null) != null ? Math.max(0, Number(arg('owed-reserve')) || 0) : OWED_RESERVE;
const OWED_JOURNAL = path.join(__dirname, '..', 'logs', 'citizen-wake-owed.jsonl'); // owed receipts, append-only, two-phase
// Append one journal line and read it back; one retry. false = not durable.
function appendOwedJournal(line) {
  for (let t = 0; t < 2; t++) {
    try { fs.appendFileSync(OWED_JOURNAL, line); if (fs.readFileSync(OWED_JOURNAL, 'utf8').includes(line)) return true; } catch (e) { logLine('owed journal write error: ' + e.message); }
  }
  return false;
}
// engine.197 — a child under 7 is not drawn (builder 2026-10-17: "under 7 years old"). Unknown age stays in.
const MIN_WAKE_AGE = 7;

const STATE_FILE = path.join(__dirname, '..', 'logs', 'citizen-wake-state.json');
const LOG_FILE = path.join(__dirname, '..', 'logs', 'citizen-wake.log');
const TENSION_FILE = path.join(__dirname, '..', 'logs', 'citizen-tension-state.json'); // B2 index — page is the durable surface, this skips a page search
const RIPPLE_FILE = path.join(__dirname, '..', 'logs', 'citizen-ripple-state.json'); // engine.48 T4 — cross-citizen ripple register, keyed "from->to"
// A citizen only knows a name the wake handed them — coResidents, the sports slice,
// the edition slice, family, bonds, the ripple line, the card block, page memory.
// So a name in a reflection is normally an ECHO of an injection, not a discovered
// relationship, and there is no way to tell the two apart after the fact because the
// injected set is not stored anywhere. This file stores it: one line per wake, the
// POPIDs whose names were placed in front of that citizen. A name in the reflection
// that is NOT in that line is the only thing that counts as an unprompted mention.
// Consumer: scripts/extractBondsFromWakes.js. Append-only, one JSON object per line.
const OFFERED_FILE = path.join(__dirname, '..', 'logs', 'citizen-wake-offered.jsonl');
const RIPPLE_EXPIRY_CYCLES = 12; // mirrors TENSION_EXPIRY_CYCLES; read by citizen-exchange.js too
const TENSION_CAP = 3;            // open questions carried at once (oldest evicted)
const TENSION_EXPIRY_CYCLES = 12; // unresolved tension fades — silent, no page line (matches archiver retain window)

// Five distinct dayparts — one per cron fire (7:30/12:30/15:30/19:30/21:30).
// Pre-T5 the 5 fires reused 3 frames (15:30->midday, 21:30->evening); afternoon
// + night make all five genuinely distinct (research.19 T5, S273).
const WAKE_FRAME = {
  morning: 'It is early morning. You are waking into the day, the day still ahead of you',
  midday: 'It is the middle of the day, a pause in the neighborhood or at work',
  afternoon: 'It is mid-afternoon. The day\'s weight has settled in; there is still some of it left to go',
  evening: 'It is evening. You are winding down after an ordinary day',
  night: 'It is late night. The neighborhood has gone quiet around you and most people are asleep',
};

function logLine(s) {
  const line = `[${new Date().toISOString()}] ${s}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch (e) {}
  console.log(s);
}
function loadState() { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (e) { return {}; } }
function saveState(st) { try { fs.writeFileSync(STATE_FILE, JSON.stringify(st, null, 2)); } catch (e) {} }

// ---- B2 tension register (seams Task 3) — loop-side only: no dial writes, no sheet writes,
// no LifeHistory writes, never Reflection_Intake. State: { popId: [{q, cy, status}] }.
function loadTensionState() { try { return JSON.parse(fs.readFileSync(TENSION_FILE, 'utf8')); } catch (e) { return {}; } }
function saveTensionState(st) { try { fs.writeFileSync(TENSION_FILE, JSON.stringify(st, null, 2)); } catch (e) {} }
// Open tensions for the prompt, with the silent-expiry pass (mutates state in memory;
// persisted only when a live run saves — dry runs write nothing).
function openTensionsFor(state, popId, cycle) {
  const list = state[popId] || [];
  if (cycle != null) {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].status === 'open' && (cycle - (Number(list[i].cy) || 0)) >= TENSION_EXPIRY_CYCLES) list.splice(i, 1);
    }
  }
  return list.filter((t) => t.status === 'open').slice(-TENSION_CAP);
}

// ---- engine.48 T4 ripple register — cross-citizen awareness: naming a bonded citizen in a
// reflection leaves a trace THEY perceive at their next wake. Local state only, same
// discipline as tensions (dry runs never touch it; silent expiry at load).
function loadRippleState() { try { return JSON.parse(fs.readFileSync(RIPPLE_FILE, 'utf8')); } catch (e) { return {}; } }
function saveRippleState(st) { try { fs.writeFileSync(RIPPLE_FILE, JSON.stringify(st, null, 2)); } catch (e) {} }
function expireRipples(st, cycle) {
  if (cycle == null) return;
  for (const k of Object.keys(st)) {
    if ((cycle - (Number(st[k] && st[k].cy) || 0)) >= RIPPLE_EXPIRY_CYCLES) delete st[k];
  }
}

// engine.48 T3 — edition read-back: the paper closes the loop back into the woken citizen's
// perception. Named tier (NAMES INDEX row) beats neighborhood tier; no hit -> '' (no filler,
// same omit-rule as loadNeighborhoodTexture).
function loadEditionSlice(popId, name, nh, cycle) {
  try {
    const dir = path.join(__dirname, '..', 'editions');
    let best = null;
    for (const f of fs.readdirSync(dir).filter((x) => /^cycle_pulse_edition_(\d+)\.txt$/.test(x))) {
      const n = Number(f.match(/_(\d+)\.txt$/)[1]);
      if (cycle != null && n > cycle) continue; // no reading next week's paper
      if (!best || n > best.n) best = { n, f };
    }
    if (!best) return '';
    const txt = fs.readFileSync(path.join(dir, best.f), 'utf8');
    const idx = txt.indexOf('NAMES INDEX');
    if (idx >= 0) {
      for (const line of txt.slice(idx).split('\n')) {
        const m = line.match(/^(POP-\d{5})\s*\|\s*([^|]+)\|\s*(.+)$/);
        if (m && m[1].toUpperCase() === popId) {
          return `The Tribune wrote about you this week: ${m[3].trim()}.`;
        }
      }
    }
    const body = idx >= 0 ? txt.slice(0, idx) : txt;
    if (nh && new RegExp(`\\b${String(nh).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(body)) {
      return `The Tribune ran a piece touching ${nh} this week.`;
    }
    return '';
  } catch (e) { return ''; }
}

function buildVoicePrompts(c, neighbors, sportsLine, lifeArc, textureLine, bondsLine, familyLine, healthLine, pageMemory, cycle, tensionBlock, editionLine, rippleLine, cardBlock, voiceLine, livedLine) {
  const disp = dials.disposition(c.cur);
  const who = neighbors.length
    ? `\n\nPeople around you in ${c.nh}: ${neighbors.map((n) => `${n.name}${n.occupation ? ' (' + n.occupation + ')' : ''}`).join(', ')}.`
    : '';
  const bonds = bondsLine ? `\n\nPeople you have history with: ${bondsLine}.` : ''; // relationships-with-texture (ingredient 3)
  const family = familyLine ? `\n\n${familyLine}` : ''; // loop doctrine — the ledger's structural family, ahead of neighbors/bonds
  const standingLine = renderStanding(c); // engine.147 seam — the family line's standing + the posture, plain words, no numbers
  const standing = standingLine ? `\n\n${standingLine}` : '';
  const health = healthLine ? `\n\n${healthLine}` : ''; // engine.101 health slice — "in a hospital bed NOW" self-state, rides with continuity
  // B1 bias readback (seams Task 7): opinions the citizen carries join the voice ONLY
  // when today's perception mentions the target — carried history surfacing, not a
  // recital. Match text = the UNfenced perception slices (fenced page/tension prose
  // deliberately excluded — recalled memory must not trigger opinion lines). Fed from
  // MemoryRegisters .biases (Task-6 fold); sentiment is bias-local, never dials.
  const biasLine = resonance.biasReadback(c.memReg,
    [c.life, neighbors.map((n) => n.name).join(' '), bondsLine, familyLine, healthLine, sportsLine, textureLine, lifeArc, livedLine].filter(Boolean).join(' '));
  const opinions = biasLine ? `\n\nOpinions you carry: ${biasLine}` : '';
  const traj = dialTrajectory(c.baseDials, c.cur);                    // T1a trajectory (dormant until drain)
  const arcLine = (lifeArc ? `\n\nYour life so far: ${lifeArc}.` : '') // T1a self-state read-back (Log-sourced)
    + (livedLine ? `\n\n${livedLine}.` : ''); // pipeline.73 — the lived wake's event, the day it happened
  const trajLine = traj ? ` Lately you've been ${traj}.` : '';
  const sports = sportsLine ? `\n\nAround Oakland: ${sportsLine}` : ''; // T1b world-larger-than-self
  const paper = editionLine ? `\n\nIn the paper: ${editionLine}` : ''; // engine.48 T3 — the edition flywheel (world-larger-than-self group)
  const ripple = rippleLine ? `\n\n${rippleLine}` : ''; // engine.48 T4 — a bonded citizen thought about you recently
  const texture = textureLine ? `\n\nAround your neighborhood: ${textureLine}` : ''; // T2 immediate world
  // T1c own-page memory — already fenced (memoryFence) by loadOwnPageReadback; appended as a distinct
  // tail so the fence block stays intact (mirrors lib/personaProvider.augment).
  const memory = pageMemory ? `\n\n---\n\nWhat's been on your mind lately, from your own private reflections:\n${pageMemory}` : '';
  // B2 open tensions — unresolved questions carried between wakes; fenced upstream (main flow)
  const tensions = tensionBlock ? `\n\nQuestions you've been sitting with, still unresolved:\n${tensionBlock}` : '';
  // immersion-ingredient order: continuity (T1a state + T1c own-memory) -> people (around you + history-with) -> world/A's (T1b) -> surroundings (T2)
  // engine.48 T10 — card anchor FIRST: identity precedes perception. Fenced upstream; canon
  // facts never compete with page recall. T11 — authored speech texture rides beside it.
  const anchor = cardBlock ? `\n\nWho you are:\n${cardBlock}` : '';
  const talk = voiceLine ? `\n\nHow you talk: ${voiceLine}` : '';
  // engine.286 R2-6 (builder 2026-10-12) — the citizen knows its own record, numbers included.
  const recordLine = renderOwnRecord(c);
  const record = recordLine ? `\n\n${recordLine}` : '';
  const system = `You are ${c.name}, ${c.age ? c.age + ', ' : ''}a ${c.occ || 'resident'} living in ${c.nh}, Oakland. You are an ordinary person, not a writer. Your temperament: ${disp}.${trajLine}${arcLine}${health}${anchor}${talk}${record}\n\nReal things from your life recently:\n${c.life}${family}${standing}${who}${bonds}${ripple}${opinions}${sports}${paper}${texture}${memory}${tensions}`;
  // T5 — varied-provocation question bank. The fixed "small things on your mind"
  // prompt becomes a deterministically-seeded pick latching a real signal this
  // citizen perceives, so two citizens woken the same cycle are prompted
  // DIFFERENTLY (fixes vector-2: the shared question that converges the mode).
  const prov = selectProvocation(c.popId, cycle, WAKE, {
    citizen: { name: c.name, occ: c.occ, nh: c.nh, age: c.age, disp: disp },
    neighbors: neighbors, sportsLine: sportsLine, lifeArc: lifeArc,
    textureLine: textureLine, bondsLine: bondsLine, traj: traj, livedLine: livedLine,
  });
  const user = `${WAKE_FRAME[WAKE] || WAKE_FRAME.evening}. ${prov.text}\n\nIn 4-5 sentences, think on the page the way you actually would — private, honest, first person. Don't narrate events like a story; just sit with it.`;
  return { system, user, disp, prov };
}

async function voiceOnce(system, user) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://godworld.local' },
    body: JSON.stringify({ model: 'deepseek/deepseek-v4-flash-0731', reasoning: { enabled: false }, max_tokens: 260, temperature: 0.85, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  const j = await r.json();
  if (j.error) throw new Error('voice: ' + (j.error.message || JSON.stringify(j.error)));
  const text = String(j.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new Error('voice: empty reply');
  return text;
}

// One retry after a short wait: a provider error, timeout or empty reply is usually
// transient (the 2026-10-12 midday wake lost its citizen to one). A key limit is not.
async function generateVoice(system, user) {
  try { return await voiceOnce(system, user); } catch (e) {
    if (/key limit/i.test(e.message)) throw e;
    logLine('voice retry after: ' + e.message);
    await new Promise((res) => setTimeout(res, 5000));
    return voiceOnce(system, user);
  }
}

(async () => {
  const cycle = Number(arg('cycle', null)) || (() => { try { return getCurrentCycle(); } catch (e) { return null; } })();
  // pipeline.73 — this Cycle's lived events. engine.197: perception for whoever is drawn, not a slot.
  const livedEvents = cycle ? await loadLivedEvents(cycle) : [];
  if (livedEvents.error) logLine('lived events read failed (non-fatal, no lived line this wake): ' + livedEvents.error);
  const livedList = Array.isArray(livedEvents) ? livedEvents : [];
  // engine.197 — no floors at the wake (builder 2026-10-17): every ledger row with dials, a name and a hood.
  const poolStats = {};
  const ledgerPool = await buildPool({ shapedMin: 0, lifeMinChars: 0, stats: poolStats });
  const forced = String(FORCE_POP || '').toUpperCase();
  const tooYoung = ledgerPool.filter((p) => typeof p.age === 'number' && p.age < MIN_WAKE_AGE && p.popId !== forced).length;
  const pool = ledgerPool.filter((p) => p.popId === forced || !(typeof p.age === 'number' && p.age < MIN_WAKE_AGE));
  logLine(`pool: ${pool.length} of ${poolStats.rows} ledger rows (skipped: dial ${poolStats.dial}, name/hood ${poolStats.nameHood}, rule ${poolStats.rule}, under ${MIN_WAKE_AGE} ${tooYoung}) (wake=${WAKE}, cycle=${cycle}, dry=${DRY}, lived events=${livedList.length})`);
  if (!pool.length) { logLine('empty pool — nothing to wake'); process.exit(0); }

  const state = loadState();
  // pipeline.93 — one live wake at a time holds the owed slot; an overlapping live wake runs without it (codex round 3 F3).
  let owedRes = OWED_RES;
  if (owedRes > 0 && !DRY) {
    const release = acquireFileLock(OWED_JOURNAL + '.lock', logLine);
    if (!release) { logLine('owed lock held by another live wake — this wake runs without the owed slot'); owedRes = 0; }
    else process.on('exit', release);
  }
  const seedKey = wakeSeedKey(cycle, WAKE, new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }));
  let owed = [], owedView = state, owedAbsorb = true;
  if (owedRes > 0 && cycle) {
    let held = '';
    try {
      let jt = '';
      try { jt = fs.readFileSync(OWED_JOURNAL, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
      const os = owedStateFrom(jt, cycle);
      owedView = Object.assign({}, state, os);
      if (os.unconfirmed.length) logLine(`owed: ${os.unconfirmed.length} receipt(s) pending with no shown/failed line, counted as spent: ${os.unconfirmed.join(',')}`);
    } catch (e) { held = e.message; }
    if (held) logLine('OWED HELD — the owed journal could not be read, no owed slot this wake: ' + held);
    else {
      const rec = await loadOwedRecords();
      for (const er of rec.errors) logLine('OWED READ FAILED — that tab owes nothing this wake, the next wake retries: ' + er);
      const of = owedFrom(rec, cycle, chaosOutcomeIndex(require('/root/GodWorld/utilities/chaosCarsConfig').VEHICLE_CONFIGS));
      owed = of.owed;
      for (const s of of.skipped) logLine('owed skip: ' + s);
      const unknownSevere = of.unknownTabs.filter((t) => t !== 'Chaos_Cars');
      owedAbsorb = unknownSevere.length === 0;
      if (!owedAbsorb) logLine(`owed absorption held: ${unknownSevere.join(', ')} unread, so whether a listed event fired is unknown — low hits wait`);
    }
  }
  const owedUsed = owedWakesUsed(owedView, cycle);
  const oc = owedCandidates(pool, owed, owedView, livedList, { absorb: owedAbsorb });
  for (const e of oc.notInPool) logLine(`owed ${e.id} ${e.pop}: not in the wake pool (no dials, no name/hood, or under ${MIN_WAKE_AGE}) — not reached`);
  for (const e of oc.unshowable) logLine(`owed ${e.id} ${e.pop}: nothing in their record to show them (no matching life line${e.kind === 'hospital' ? ', no unspent lived admission' : ''}) — not reserved`);
  if (owedRes > 0) {
    logLine(`owed: ${owed.length} in window, severe in [${oc.severeCycles.join(',')}], ${oc.ready.length} waiting, ${owedUsed}/${owedRes} reserved wakes used this cycle`);
    if (DRY) for (const e of oc.ready) logLine(`  [dry-run] owed ${e.pop} ${e.kind} tier ${e.tier} c${e.cycle} mag=${e.mag.toFixed(2)} ${e.id}`);
  }
  const picked = selectWakeCitizen(pool, { forcePop: FORCE_POP, seedKey, owedReady: oc.ready, owedReserve: owedRes, owedUsed });
  if (FORCE_POP && picked.slot !== 'forced') logLine(`--pop ${FORCE_POP} not in the pool; falling back to the draw`);
  const c = picked.c;
  // pipeline.93 — the woken citizen's own owed events stay in the life block they read; nothing else is added.
  const mineOwed = owedFor(c.popId, owed, owedView);
  const pins = mineOwed.map((e) => e.pin).filter(Boolean);
  if (pins.length) c.life = lifeTailOf(c.lifeLines || [], pins);
  const owedAdmit = mineOwed.find((e) => e.kind === 'hospital');
  const lived = cycle ? livedFor(c.popId, livedList, state, owedAdmit ? owedLivedPrefer(owedAdmit) : undefined) : null;
  const shownOwed = owedShownSet(mineOwed, c.life, lived);
  if (shownOwed.length < mineOwed.length) logLine(`owed not shown this wake, stays owed: ${mineOwed.filter((e) => !shownOwed.includes(e)).map((e) => e.id).join(',')}`);
  const livedLine = lived ? renderLivedLine(lived.event, cycle, lived.rel) : '';
  const neighbors = await coResidents(c.nh, c.popId);
  const sportsLine = await loadSportsSlice();                 // T1b — one feed read, shared across the wake
  const lifeArc = await loadLifeArc(c.popId);                 // T1a — canonical milestone arc from LifeHistory_Log
  const textureLine = loadNeighborhoodTexture(c.nh, cycle);   // T2 — this hood's frozen lived-particulars block
  // engine.48 T4 write side needs bond POPIDs too — {pairs} keeps the prompt line identical.
  const bondsRes = await loadBonds(c.popId, { pairs: true }); // relationships-with-texture — people the citizen has history with (canon bonds)
  const bondsLine = bondsRes.line;
  const bondPairs = bondsRes.pairs;
  const familyLine = await loadFamily(c.popId); // loop doctrine — ledger family columns reach the wake
  const healthLine = await loadHealthState(c.popId); // engine.101 health slice — current health state reaches the wake (engine.102 W3 export, 87e68f94)
  // engine.48 T3 — the paper closes the loop into perception (named tier > hood tier > omit)
  const editionLine = loadEditionSlice(c.popId, c.name, c.nh, cycle);
  // engine.48 T10 — card anchor (facts of the life, fenced; '' degrades gracefully)
  const cardRaw = await loadCardAnchor(c.popId);
  const cardBlock = cardRaw ? memoryFence.wrap(cardRaw, 'citizen-card:' + c.popId) : '';
  // engine.48 T11 — authored speech texture for voiced citizens ('' for everyone else)
  const voiceLine = loadVoiceTexture(c.popId);
  // engine.48 T4 read side — ripples aimed at this citizen render one line, then consume (live only)
  const rippleState = loadRippleState();
  expireRipples(rippleState, cycle);
  let rippleLine = '';
  const rippleKeysHit = [];
  for (const [k, e] of Object.entries(rippleState)) {
    if (!e || String(e.to || '').toUpperCase() !== c.popId) continue;
    rippleLine = `You crossed paths with ${e.fromName || 'someone you know'} recently; they seemed ${String(e.affect || '').toLowerCase() || 'preoccupied'}.`;
    rippleKeysHit.push(k);
    break; // one line max — texture, not a feed
  }
  // B2 — tension state loads BEFORE recall: resolved tensions join the candidate set (Task 4)
  const tensionState = loadTensionState();
  const openTensions = openTensionsFor(tensionState, c.popId, cycle);
  // T1c + B4 — fenced own-page read-back, resonance-scored against today's perception (seams Task 2).
  // Task 4: resolved tensions (open ones render in their own block below — no double-join) and
  // unlived entries (dormant until the Task-8 fold writes MemoryRegisters) compete as candidates.
  const pageRead = await loadOwnPageReadback(c.popId, {
    cycle, wake: WAKE, milestone: lifeArc,
    contextText: [textureLine, sportsLine, bondsLine, familyLine, healthLine, c.nh, c.occ, WAKE_FRAME[WAKE] || ''].filter(Boolean).join(' '),
    extraCandidates: resonance.tensionCandidates(tensionState[c.popId]).concat(resonance.unlivedCandidates(c.memReg)),
  });
  const pageMemory = pageRead.block;
  const tensionBlock = openTensions.length
    ? memoryFence.wrap(openTensions.map((t) => t.q).join('\n'), 'citizen-tension:' + c.popId)
    : '';
  const { system, user, disp, prov } = buildVoicePrompts(c, neighbors, sportsLine, lifeArc, textureLine, bondsLine, familyLine, healthLine, pageMemory, cycle, tensionBlock, editionLine, rippleLine, cardBlock, voiceLine, livedLine);

  // Record what this wake put in front of the citizen, BEFORE they answer. Names come
  // from two shapes: POPIDs we know structurally (neighbours, bonds), and names that
  // only appear as prose inside the injected blocks (the sports slice, the edition
  // slice, family, the ripple line, the card, page memory). Both are stored — the
  // structural ids exactly, the prose blocks verbatim so a consumer can match any name
  // against them without having to re-derive which citizen a surname belonged to.
  try {
    const offeredPops = [
      ...neighbors.map((n) => String(n.popId || '').toUpperCase()),
      ...bondPairs.map((b) => String(b.pop || '').toUpperCase()),
    ].filter(Boolean);
    fs.appendFileSync(OFFERED_FILE, JSON.stringify({
      pop: c.popId, cycle, daypart: WAKE,
      offeredPops: [...new Set(offeredPops)],
      // TWO buckets, because they mean opposite things.
      // `feed` is city news the citizen happened to read — the sports slice, the
      // edition slice, hood texture, the card. A name that appears ONLY here is an
      // echo: the engine handed them a stranger and they repeated it.
      feed: [sportsLine, editionLine, textureLine, cardBlock].filter(Boolean).join(' \n').slice(0, 6000),
      // `own` is the citizen's own life read back to them — their wiki page, their
      // family, their bonds, and a ripple from someone who crossed their path. A name
      // here is NOT an echo. Their page remembering a person is what a bond IS; that
      // is the signal, not the contamination.
      own: [pageMemory, familyLine, bondsLine, rippleLine].filter(Boolean).join(' \n').slice(0, 6000),
    }) + '\n');
  } catch (e) { logLine('offered-names log failed (non-fatal): ' + e.message); }

  logLine(`woke ${c.popId} ${c.name} — ${c.occ || 'resident'}, ${c.nh}${c.age ? ', ' + c.age : ''} | eventMag=${c.eventMag} | ${disp} | provocation=${prov.id} route=${prov.route} wake=${WAKE} slot=${picked.slot} seed=${seedKey}${lived ? ' event=' + lived.event.id : ''}${shownOwed.length ? ' owed=' + shownOwed.map((e) => e.id).join(',') : ''}`);
  if (DRY) console.log('\n--- perception (system prompt) ---\n' + system + '\n----------------------------------');
  if (DRY) console.log('\n--- provocation (user prompt, T5) ---\n' + user + '\n----------------------------------');
  const reflection = await generateVoice(system, user);
  console.log('\n--- reflection ---\n' + reflection + '\n------------------');

  if (DRY) {
    const tags = await classifier.classifyTripleReflection_(reflection, openTensions.map((t) => t.q));
    logLine(`[dry-run] would classify -> ${JSON.stringify(tags)}; no writes (incl. no tension-state write)`);
    process.exit(0);
  }

  // 1) classify FIRST (moved ahead of the page append, seams Task 2) so the affect tag rides the
  //    page doc's metadata — that is what resonanceRecall's affectWeight reads at future wakes.
  //    Triple pass (seams Task 3): event | affect + nullable TENSION + RESOLVES vs the open list.
  //    Guarded: a classifier failure must never block the page append (same net effect as the old
  //    order, where a classify error only skipped intake).
  let cls = {};
  try { cls = await classifier.classifyTripleReflection_(reflection, openTensions.map((t) => t.q)); } catch (e) { cls = { raw: 'classify threw: ' + e.message }; }

  // 2) narrative store: ensure the page pointer (AW), append the reflection (ungated).
  const ptr = await page.ensurePagePointer_(c.popId);
  if (ptr.error) { logLine('ensurePagePointer_ ERROR: ' + ptr.error); process.exit(1); }
  // pipeline.93 — the owed receipt is pending BEFORE the page lands: if it cannot be saved, no page is written.
  const owedOn = owedRes > 0 && (shownOwed.length > 0 || picked.slot === 'owed');
  const owedKey = seedKey + '|' + c.popId + '|' + new Date().toISOString();
  const owedLine = (status) => owedJournalLine({ key: owedKey, cycle, pop: c.popId, slot: picked.slot, ids: shownOwed, status });
  const step = await owedPageStep({ on: owedOn, journal: appendOwedJournal, line: owedLine,
    page: () => page.appendReflection_(c.popId, reflection, {
      cycle, daypart: WAKE,
      extra: { affect: cls.affect || null, event: cls.event || null }, // recall affectWeight input (B4)
    }) });
  if (step.outcome === 'pending-not-saved') {
    logLine('OWED RECEIPT NOT SAVED — the pending line failed, so the page is not written and this wake cannot double an owed one');
    process.exit(1);
  }
  const appended = step.page;
  if (appended.error) {
    if (owedOn) logLine('owed: the page did not confirm; the pending receipt stands — counted as reached (a possible missed wake, never a double)');
    logLine('appendReflection_ ERROR: ' + appended.error); process.exit(1);
  }
  if (step.outcome === 'shown') logLine(`owed spent: ${shownOwed.map((e) => e.id).join(',') || '(none shown)'} (slot=${picked.slot})`);
  if (step.outcome === 'shown-not-saved') logLine('owed: shown line not saved — the pending line already counts this wake as spent');
  logLine(`page ${ptr.tag} (${ptr.created ? 'created' : 'existing'}) <- reflection doc ${appended.id || '?'}`);

  // 3) B2 tension register (seams Task 3) — voice-memory only: page lines + local index, NEVER
  //    Reflection_Intake (tensions don't drain into dials). Resolution first, then new capture —
  //    both can fire on the same wake. Typed docs (metadata.type='tension', customId key suffix)
  //    so they never collide with the reflection doc or leak into recall candidates.
  const tlist = tensionState[c.popId] = tensionState[c.popId] || [];
  let resolvedText = ''; // engine.101 — rides Reflection_Intake col K when a resolution fired
  if (cls.resolves != null && openTensions[cls.resolves]) {
    const t = openTensions[cls.resolves]; // reference into tensionState — status flip persists on save
    t.status = 'resolved'; t.resolvedCy = cycle;
    resolvedText = t.q;
    await page.appendReflection_(c.popId, `TENSION-RESOLVED[c${cycle}]: ${t.q}`, { cycle, daypart: WAKE, key: 'tension-resolved', extra: { type: 'tension' } });
    logLine(`tension RESOLVED <- "${t.q.slice(0, 80)}"`);
  }
  if (cls.tension && !tlist.some((t) => t.status === 'open' && t.q.toLowerCase() === cls.tension.toLowerCase())) {
    const openNow = tlist.filter((t) => t.status === 'open');
    if (openNow.length >= TENSION_CAP) { // evict oldest open (cap 3)
      const oldest = openNow.reduce((a, b) => ((Number(a.cy) || 0) <= (Number(b.cy) || 0) ? a : b));
      tlist.splice(tlist.indexOf(oldest), 1);
    }
    tlist.push({ q: cls.tension, cy: cycle, status: 'open' });
    await page.appendReflection_(c.popId, `TENSION[c${cycle}]: ${cls.tension}`, { cycle, daypart: WAKE, key: 'tension', extra: { type: 'tension' } });
    logLine(`tension OPENED <- "${cls.tension.slice(0, 80)}"`);
  }
  saveTensionState(tensionState); // also persists this wake's silent expiry pass

  // engine.101 — ONE bond name-match serves both the intake BondTarget column (first hit)
  // and the T4 ripple register (all hits, step 4b). Hoisted ahead of the append.
  const bondHits = matchBondTargets_(reflection, bondPairs);
  const bondTarget = bondHits.length ? bondHits[0].pop : '';

  // 4) persist the dual classified tags to Reflection_Intake (the cycle reads this when the gate opens).
  //    Row: [ts, popId, cycle, WAKE, EVENT(col E), snippet, applied='no', AFFECT(col H),
  //    BondTarget(col I), Tension(col J), Resolves(col K)] — A-H stay positional (back-compat);
  //    engine.101 appends I-K (research 2026-08-03 §Addendum 2: tension/resolves are relationship
  //    signals; BondTarget is the bond counterpart named in the reflection, '' when none).
  //    composure-as-affect-only lives in the cycle's gated write-back (nudgesForReflection_), not here.
  if (cls.event || cls.affect) {
    await sheets.appendRows('Reflection_Intake', [[
      new Date().toISOString(), c.popId, cycle, WAKE, cls.event || '', reflection.replace(/\n/g, ' '), 'no', cls.affect || '',
      bondTarget, cls.tension || '', resolvedText,
    ]]);
    logLine(`Reflection_Intake <- event=[${cls.event || '-'}] affect=[${cls.affect || '-'}]${cls.affectFallback ? ' (affect fallback)' : ''}${bondTarget ? ' bondTarget=' + bondTarget : ''} (applied=no, gated)`);
  } else {
    logLine(`classifier off-vocab/err, intake skipped: ${cls.raw}`);
  }

  // GATE: NO applyTaggedEvent_ here. Dial write-back is the gated cycle's job (Phase-1 audit).

  // 4b) engine.48 T4 ripple register — live runs only. Write side: naming a bonded citizen in
  // the reflection leaves a trace they perceive at their next wake (one live entry per pair,
  // overwrite refreshes). Read side consumption: the rendered entry is spent.
  for (const bp of bondHits) {
    rippleState[`${c.popId}->${bp.pop}`] = { to: bp.pop, from: c.popId, fromName: c.name, affect: cls.affect || '', cy: cycle };
    logLine(`ripple <- ${c.popId} named ${bp.name} (${bp.pop})`);
  }
  for (const k of rippleKeysHit) { delete rippleState[k]; logLine(`ripple consumed: ${k}`); }
  saveRippleState(rippleState); // also persists this wake's silent expiry pass

  // 5) recall bookkeeping (live runs only). pipeline.73 — the lived event is spent only here, after the
  // page write landed (a failed append exits above and the event waits). engine.197: spent per recipient,
  // eventId:POPID — another survivor of the same death still perceives it if drawn. Receipts age out.
  const spentKey = recordLivedSpend(state, lived, c.popId, cycle);
  saveState(state);
  if (spentKey && !((loadState().livedSpent || {})[spentKey])) {
    logLine(`LIVED STATE NOT SAVED — ${spentKey} will render again (the page already holds this reflection)`);
  }
  resonance.markRecalled(c.popId, cycle, pageRead.keys);
})().catch((e) => { logLine('FATAL ' + e.message); process.exit(1); });
