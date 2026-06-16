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
const dialMap = require('/root/GodWorld/utilities/citizenDialMap');
const page = require('/root/GodWorld/lib/citizenPage');
const classifier = require('/root/GodWorld/lib/reflectionClassifier');
const { createSlicer } = require('/root/GodWorld/lib/neighborhoodSlice');
const getCurrentCycle = require('/root/GodWorld/lib/getCurrentCycle');

const ARGV = process.argv.slice(2);
const DRY = ARGV.includes('--dry-run');
const arg = (k, d) => { const m = ARGV.find((a) => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };
const WAKE = (arg('wake', 'evening') || 'evening').toLowerCase();
const FORCE_POP = arg('pop', null);

const SHAPED_MIN = 60;          // deviation floor — only strongly-shaped citizens have a distinct voice
const LIFE_MIN_CHARS = 25;      // must have real lived events to ground on (anti-confabulation)
const ROTATION_MEMORY = 25;     // don't re-wake the last N citizens (force variety)
const RESIDENT_CAP = 3;         // real co-residents fed for grounding (names only, no metrics)
const STATE_FILE = path.join(__dirname, '..', 'logs', 'citizen-wake-state.json');
const LOG_FILE = path.join(__dirname, '..', 'logs', 'citizen-wake.log');

const WAKE_FRAME = {
  morning: 'It is early morning. You are waking into the day, the day still ahead of you',
  midday: 'It is the middle of the day, a pause in the neighborhood or at work',
  evening: 'It is evening. You are winding down after an ordinary day',
};

function logLine(s) {
  const line = `[${new Date().toISOString()}] ${s}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch (e) {}
  console.log(s);
}
function loadState() { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (e) { return { recent: [] }; } }
function saveState(st) { try { fs.writeFileSync(STATE_FILE, JSON.stringify(st, null, 2)); } catch (e) {} }

// most-recent LifeHistory tag -> magnitude of its dial nudge = "how big a delta is this citizen living".
function recentEventMagnitude(lifeTail) {
  const lines = String(lifeTail || '').split('\n').filter(Boolean);
  const last = lines[lines.length - 1] || '';
  const m = last.match(/\[([^\]]+)\]/);
  if (!m) return 0;
  const fx = dialMap.nudgesForEvent_(m[1].trim(), 1, last);
  return Object.values(fx).reduce((s, v) => s + Math.abs(v), 0);
}

async function buildPool() {
  const rows = await sheets.getRawSheetData('Simulation_Ledger');
  const h = rows[0];
  const find = (n) => h.findIndex((x) => String(x).toLowerCase() === n.toLowerCase());
  const iPop = find('POPID'), iName = find('Name'), iFirst = find('First'), iLast = find('Last');
  const iNh = find('Neighborhood'), iDial = find('DialState'), iOcc = find('Occupation'), iBirth = find('BirthYear'), iLife = find('LifeHistory');
  const pool = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const dj = r[iDial];
    if (!dj || String(dj).trim().length < 5) continue;
    const cur = dials.currentDials(dj);
    if (!cur || dials.deviation(cur) < SHAPED_MIN) continue;
    const life = iLife >= 0 ? String(r[iLife] || '').trim() : '';
    if (life.length < LIFE_MIN_CHARS) continue;
    const name = (iName >= 0 && r[iName]) ? r[iName] : [r[iFirst], r[iLast]].filter(Boolean).join(' ');
    const nh = iNh >= 0 ? r[iNh] : '';
    if (!name || !nh) continue;
    if (/corliss/i.test(`${name} ${r[iFirst] || ''} ${r[iLast] || ''}`)) continue; // Mags is the anchor, not in rotation
    const lifeTail = life.split('\n').filter(Boolean).slice(-5).join('\n');
    pool.push({
      popId: String(r[iPop]).toUpperCase(), name, occ: iOcc >= 0 ? r[iOcc] : '', nh,
      age: (iBirth >= 0 && r[iBirth]) ? (2041 - Number(r[iBirth])) : '',
      cur, life: lifeTail, eventMag: recentEventMagnitude(lifeTail),
    });
  }
  return pool;
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

async function coResidents(nh, selfPop) {
  const ledgerObjs = await sheets.getSheetAsObjects('Simulation_Ledger');
  const mapObjs = await sheets.getSheetAsObjects('Neighborhood_Map').catch(() => []);
  const slicer = createSlicer({ ledger: ledgerObjs, neighborhoodMap: mapObjs, residentCap: RESIDENT_CAP + 4 });
  const sl = slicer.slice(nh);
  if (!sl || !sl.residents) return [];
  // names ONLY (grounding / anti-confabulation) — NO metrics (no-engine-aggregates-in-voice rule)
  return sl.residents.filter((rr) => String(rr.popId).toUpperCase() !== selfPop).slice(0, RESIDENT_CAP);
}

function buildVoicePrompts(c, neighbors) {
  const disp = dials.disposition(c.cur);
  const who = neighbors.length
    ? `\n\nPeople around you in ${c.nh}: ${neighbors.map((n) => `${n.name}${n.occupation ? ' (' + n.occupation + ')' : ''}`).join(', ')}.`
    : '';
  const system = `You are ${c.name}, ${c.age ? c.age + ', ' : ''}a ${c.occ || 'resident'} living in ${c.nh}, Oakland. You are an ordinary person, not a writer. Your temperament: ${disp}.\n\nReal things from your life recently:\n${c.life}${who}`;
  const user = `${WAKE_FRAME[WAKE] || WAKE_FRAME.evening}. In 4-5 sentences write a private, honest reflection — the small things on your mind, drawing on what's actually been happening in your life. Don't narrate events like a story; just think on the page the way you actually would. First person.`;
  return { system, user, disp };
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
  const { system, user, disp } = buildVoicePrompts(c, neighbors);

  logLine(`woke ${c.popId} ${c.name} — ${c.occ || 'resident'}, ${c.nh}${c.age ? ', ' + c.age : ''} | eventMag=${c.eventMag} | ${disp}`);
  const reflection = await generateVoice(system, user);
  console.log('\n--- reflection ---\n' + reflection + '\n------------------');

  if (DRY) {
    const tag = await classifier.classifyReflection_(reflection);
    logLine(`[dry-run] would classify -> ${JSON.stringify(tag)}; no writes`);
    process.exit(0);
  }

  // 1) narrative store: ensure the page pointer (AW), append the reflection (ungated).
  const ptr = await page.ensurePagePointer_(c.popId);
  if (ptr.error) { logLine('ensurePagePointer_ ERROR: ' + ptr.error); process.exit(1); }
  const appended = await page.appendReflection_(c.popId, reflection, { cycle, daypart: WAKE });
  if (appended.error) { logLine('appendReflection_ ERROR: ' + appended.error); process.exit(1); }
  logLine(`page ${ptr.tag} (${ptr.created ? 'created' : 'existing'}) <- reflection doc ${appended.id || '?'}`);

  // 2) persist the classified tag to Reflection_Intake (the cycle reads this when the gate opens).
  const cls = await classifier.classifyReflection_(reflection);
  if (cls.tag) {
    await sheets.appendRows('Reflection_Intake', [[
      new Date().toISOString(), c.popId, cycle, WAKE, cls.tag, reflection.slice(0, 180).replace(/\n/g, ' '), 'no',
    ]]);
    logLine(`Reflection_Intake <- [${cls.tag}] (applied=no, gated)`);
  } else {
    logLine(`classifier off-vocab/err, intake skipped: ${cls.raw}`);
  }

  // GATE: NO applyTaggedEvent_ here. Dial write-back is the gated cycle's job (Phase-1 audit).

  // 3) record rotation
  state.recent = [c.popId, ...(state.recent || [])].slice(0, ROTATION_MEMORY);
  saveState(state);
})().catch((e) => { logLine('FATAL ' + e.message); process.exit(1); });
