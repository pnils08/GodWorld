#!/usr/bin/env node
/* citizen-wake — the rotating-citizen wake loop (citizen-loop Phase 2, engine-sheet S262).
 *
 * Mags keeps her nightly reflection (scripts/discord-reflection.js, the fixed anchor). THIS wakes a
 * DIFFERENT citizen each run — the variety engine. Each wake: pick a citizen living a big live delta,
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
  loadBonds, loadOwnPageReadback, dialTrajectory } = require('/root/GodWorld/lib/wakePerception');
const { selectProvocation } = require('/root/GodWorld/lib/provocationBank'); // T5 varied-provocation bank

const ARGV = process.argv.slice(2);
const DRY = ARGV.includes('--dry-run');
const arg = (k, d) => { const m = ARGV.find((a) => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };
const WAKE = (arg('wake', 'evening') || 'evening').toLowerCase();
const FORCE_POP = arg('pop', null);

const ROTATION_MEMORY = 25;     // don't re-wake the last N citizens (force variety)
const STATE_FILE = path.join(__dirname, '..', 'logs', 'citizen-wake-state.json');
const LOG_FILE = path.join(__dirname, '..', 'logs', 'citizen-wake.log');
const TENSION_FILE = path.join(__dirname, '..', 'logs', 'citizen-tension-state.json'); // B2 index — page is the durable surface, this skips a page search
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
function loadState() { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (e) { return { recent: [] }; } }
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

// event-magnitude-weighted, deterministic: highest live delta first, excluding the recently-woken.
function selectCitizen(pool, state) {
  if (FORCE_POP) {
    const forced = pool.find((p) => p.popId === FORCE_POP.toUpperCase());
    if (forced) return forced;
    logLine(`--pop ${FORCE_POP} not in shaped pool; falling back to rotation`);
  }
  const recent = new Set(state.recent || []);
  let candidates = pool.filter((p) => !recent.has(p.popId));
  if (!candidates.length) candidates = pool; // everyone woken recently -> reset the cycle
  candidates.sort((a, b) => (b.eventMag - a.eventMag) || dials.deviation(b.cur) - dials.deviation(a.cur));
  return candidates[0];
}

function buildVoicePrompts(c, neighbors, sportsLine, lifeArc, textureLine, bondsLine, pageMemory, cycle, tensionBlock) {
  const disp = dials.disposition(c.cur);
  const who = neighbors.length
    ? `\n\nPeople around you in ${c.nh}: ${neighbors.map((n) => `${n.name}${n.occupation ? ' (' + n.occupation + ')' : ''}`).join(', ')}.`
    : '';
  const bonds = bondsLine ? `\n\nPeople you have history with: ${bondsLine}.` : ''; // relationships-with-texture (ingredient 3)
  // B1 bias readback (seams Task 7): opinions the citizen carries join the voice ONLY
  // when today's perception mentions the target — carried history surfacing, not a
  // recital. Match text = the UNfenced perception slices (fenced page/tension prose
  // deliberately excluded — recalled memory must not trigger opinion lines). Fed from
  // MemoryRegisters .biases (Task-6 fold); sentiment is bias-local, never dials.
  const biasLine = resonance.biasReadback(c.memReg,
    [c.life, neighbors.map((n) => n.name).join(' '), bondsLine, sportsLine, textureLine, lifeArc].filter(Boolean).join(' '));
  const opinions = biasLine ? `\n\nOpinions you carry: ${biasLine}` : '';
  const traj = dialTrajectory(c.baseDials, c.cur);                    // T1a trajectory (dormant until drain)
  const arcLine = lifeArc ? `\n\nYour life so far: ${lifeArc}.` : ''; // T1a self-state read-back (Log-sourced)
  const trajLine = traj ? ` Lately you've been ${traj}.` : '';
  const sports = sportsLine ? `\n\nAround Oakland: ${sportsLine}` : ''; // T1b world-larger-than-self
  const texture = textureLine ? `\n\nAround your neighborhood: ${textureLine}` : ''; // T2 immediate world
  // T1c own-page memory — already fenced (memoryFence) by loadOwnPageReadback; appended as a distinct
  // tail so the fence block stays intact (mirrors lib/personaProvider.augment).
  const memory = pageMemory ? `\n\n---\n\nWhat's been on your mind lately, from your own private reflections:\n${pageMemory}` : '';
  // B2 open tensions — unresolved questions carried between wakes; fenced upstream (main flow)
  const tensions = tensionBlock ? `\n\nQuestions you've been sitting with, still unresolved:\n${tensionBlock}` : '';
  // immersion-ingredient order: continuity (T1a state + T1c own-memory) -> people (around you + history-with) -> world/A's (T1b) -> surroundings (T2)
  const system = `You are ${c.name}, ${c.age ? c.age + ', ' : ''}a ${c.occ || 'resident'} living in ${c.nh}, Oakland. You are an ordinary person, not a writer. Your temperament: ${disp}.${trajLine}${arcLine}\n\nReal things from your life recently:\n${c.life}${who}${bonds}${opinions}${sports}${texture}${memory}${tensions}`;
  // T5 — varied-provocation question bank. The fixed "small things on your mind"
  // prompt becomes a deterministically-seeded pick latching a real signal this
  // citizen perceives, so two citizens woken the same cycle are prompted
  // DIFFERENTLY (fixes vector-2: the shared question that converges the mode).
  const prov = selectProvocation(c.popId, cycle, WAKE, {
    citizen: { name: c.name, occ: c.occ, nh: c.nh, age: c.age, disp: disp },
    neighbors: neighbors, sportsLine: sportsLine, lifeArc: lifeArc,
    textureLine: textureLine, bondsLine: bondsLine, traj: traj,
  });
  const user = `${WAKE_FRAME[WAKE] || WAKE_FRAME.evening}. ${prov.text}\n\nIn 4-5 sentences, think on the page the way you actually would — private, honest, first person. Don't narrate events like a story; just sit with it.`;
  return { system, user, disp, prov };
}

async function generateVoice(system, user) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://godworld.local' },
    body: JSON.stringify({ model: 'deepseek/deepseek-chat', max_tokens: 260, temperature: 0.85, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  const j = await r.json();
  if (j.error) throw new Error('voice: ' + (j.error.message || JSON.stringify(j.error)));
  return String(j.choices?.[0]?.message?.content || '').trim();
}

(async () => {
  const cycle = Number(arg('cycle', null)) || (() => { try { return getCurrentCycle(); } catch (e) { return null; } })();
  const pool = await buildPool();
  logLine(`pool: ${pool.length} shaped citizens with lived history (wake=${WAKE}, cycle=${cycle}, dry=${DRY})`);
  if (!pool.length) { logLine('empty pool — nothing to wake'); process.exit(0); }

  const state = loadState();
  const c = selectCitizen(pool, state);
  const neighbors = await coResidents(c.nh, c.popId);
  const sportsLine = await loadSportsSlice();                 // T1b — one feed read, shared across the wake
  const lifeArc = await loadLifeArc(c.popId);                 // T1a — canonical milestone arc from LifeHistory_Log
  const textureLine = loadNeighborhoodTexture(c.nh, cycle);   // T2 — this hood's frozen lived-particulars block
  const bondsLine = await loadBonds(c.popId);                 // relationships-with-texture — people the citizen has history with (canon bonds)
  // B2 — tension state loads BEFORE recall: resolved tensions join the candidate set (Task 4)
  const tensionState = loadTensionState();
  const openTensions = openTensionsFor(tensionState, c.popId, cycle);
  // T1c + B4 — fenced own-page read-back, resonance-scored against today's perception (seams Task 2).
  // Task 4: resolved tensions (open ones render in their own block below — no double-join) and
  // unlived entries (dormant until the Task-8 fold writes MemoryRegisters) compete as candidates.
  const pageRead = await loadOwnPageReadback(c.popId, {
    cycle, wake: WAKE, milestone: lifeArc,
    contextText: [textureLine, sportsLine, bondsLine, c.nh, c.occ, WAKE_FRAME[WAKE] || ''].filter(Boolean).join(' '),
    extraCandidates: resonance.tensionCandidates(tensionState[c.popId]).concat(resonance.unlivedCandidates(c.memReg)),
  });
  const pageMemory = pageRead.block;
  const tensionBlock = openTensions.length
    ? memoryFence.wrap(openTensions.map((t) => t.q).join('\n'), 'citizen-tension:' + c.popId)
    : '';
  const { system, user, disp, prov } = buildVoicePrompts(c, neighbors, sportsLine, lifeArc, textureLine, bondsLine, pageMemory, cycle, tensionBlock);

  logLine(`woke ${c.popId} ${c.name} — ${c.occ || 'resident'}, ${c.nh}${c.age ? ', ' + c.age : ''} | eventMag=${c.eventMag} | ${disp} | provocation=${prov.id} route=${prov.route} wake=${WAKE}`);
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
  const appended = await page.appendReflection_(c.popId, reflection, {
    cycle, daypart: WAKE,
    extra: { affect: cls.affect || null, event: cls.event || null }, // recall affectWeight input (B4)
  });
  if (appended.error) { logLine('appendReflection_ ERROR: ' + appended.error); process.exit(1); }
  logLine(`page ${ptr.tag} (${ptr.created ? 'created' : 'existing'}) <- reflection doc ${appended.id || '?'}`);

  // 3) B2 tension register (seams Task 3) — voice-memory only: page lines + local index, NEVER
  //    Reflection_Intake (tensions don't drain into dials). Resolution first, then new capture —
  //    both can fire on the same wake. Typed docs (metadata.type='tension', customId key suffix)
  //    so they never collide with the reflection doc or leak into recall candidates.
  const tlist = tensionState[c.popId] = tensionState[c.popId] || [];
  if (cls.resolves != null && openTensions[cls.resolves]) {
    const t = openTensions[cls.resolves]; // reference into tensionState — status flip persists on save
    t.status = 'resolved'; t.resolvedCy = cycle;
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

  // 4) persist the dual classified tags to Reflection_Intake (the cycle reads this when the gate opens).
  //    Row: [ts, popId, cycle, WAKE, EVENT(col E), snippet, applied='no', AFFECT(col H)] — A-G stay
  //    positional (back-compat); affect is appended at H. composure-as-affect-only lives in the
  //    cycle's gated write-back (nudgesForReflection_), not here.
  if (cls.event || cls.affect) {
    await sheets.appendRows('Reflection_Intake', [[
      new Date().toISOString(), c.popId, cycle, WAKE, cls.event || '', reflection.slice(0, 180).replace(/\n/g, ' '), 'no', cls.affect || '',
    ]]);
    logLine(`Reflection_Intake <- event=[${cls.event || '-'}] affect=[${cls.affect || '-'}]${cls.affectFallback ? ' (affect fallback)' : ''} (applied=no, gated)`);
  } else {
    logLine(`classifier off-vocab/err, intake skipped: ${cls.raw}`);
  }

  // GATE: NO applyTaggedEvent_ here. Dial write-back is the gated cycle's job (Phase-1 audit).

  // 5) record rotation + recall bookkeeping (staleness input for future wakes — live runs only)
  state.recent = [c.popId, ...(state.recent || [])].slice(0, ROTATION_MEMORY);
  saveState(state);
  resonance.markRecalled(c.popId, cycle, pageRead.keys);
})().catch((e) => { logLine('FATAL ' + e.message); process.exit(1); });
