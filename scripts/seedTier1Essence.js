/**
 * seedTier1Essence.js — Tier-1 dial-essence backfill, dry-run harness (research-build, S265).
 *
 * Replays each citizen's AUTHORED essence-events (utilities/tier1EssenceEvents.js) through the
 * REAL dial map (utilities/citizenDialMap.js) + the SAME dampened-seed math the live deploy uses
 * (backdateCitizenDials.js: base = 50 + 50*tanh(net/30)), and reports the resulting dials, bands,
 * and disposition phrase — then asserts each dial lands in its authored target band.
 *
 * This is the measure-twice BEFORE any live write: it proves the canon→events authoring produces
 * each character's essence, offline and non-destructively. NO sheet access, NO writes.
 *
 *   node scripts/seedTier1Essence.js            # full report + per-dial target check
 *   node scripts/seedTier1Essence.js --pop=POP-00001
 *
 * The live write (append essence-events to LifeHistory_Archive + re-run backdate --apply --live)
 * is engine-sheet's substrate execution, gated on this harness passing.
 */

const M = require('/root/GodWorld/utilities/citizenDialMap.js');
const dials = require('/root/GodWorld/lib/citizenDials.js');
const { TIER1_ESSENCE } = require('/root/GodWorld/utilities/tier1EssenceEvents.js');

const DIALS = ['drive', 'sociability', 'warmth', 'openness', 'composure', 'integrity', 'family', 'outabout'];
const SEED_SCALE = 30; // mirror backdateCitizenDials.js

function arg(name) {
  const a = process.argv.find((x) => x.startsWith('--' + name + '='));
  return a ? a.split('=').slice(1).join('=') : null;
}

// replay events -> { dial: 0..100 } via the live map + dampened-seed curve
function seed(events) {
  const net = {}; DIALS.forEach((d) => (net[d] = 0));
  for (const ev of events) {
    const fx = M.nudgesForEvent_(ev.tag, 1, ev.text);
    for (const d in fx) if (net[d] != null && Object.prototype.hasOwnProperty.call(fx, d)) net[d] += fx[d];
  }
  const cur = {};
  for (const d of DIALS) cur[d] = Math.max(0, Math.min(100, Math.round(50 + 50 * Math.tanh(net[d] / SEED_SCALE))));
  return { cur, net };
}

// band index -> label
function bandLabel(v) { const b = dials.bandIdx(v); return b === -1 ? 'neutral' : b <= 1 ? 'lo' : b === 2 ? 'high' : 'vhigh'; }
// target token -> acceptable (band, value). 'moderate' = a present-but-not-defining trait
// ("moderate" / "present, undemonstrative" in the voice files): neutral, or only faintly into high.
const TARGET_OK = {
  lo: (b) => b <= 1,                          // band 0 or 1
  neutral: (b) => b === -1,                   // 40-60
  moderate: (b, v) => b === -1 || (b === 2 && v <= 66),
  high: (b) => b >= 2,                        // high or vhigh acceptable for a "high" target
  vhigh: (b) => b === 3,
};

const only = arg('pop');
let totalDials = 0, passDials = 0, citizensClean = 0;

for (const pop of Object.keys(TIER1_ESSENCE)) {
  if (only && pop.toUpperCase() !== only.toUpperCase()) continue;
  const c = TIER1_ESSENCE[pop];
  const { cur } = seed(c.events);
  const disp = dials.disposition(cur);

  console.log(`\n===== ${pop}  ${c.name}${c.pillar ? '  [' + c.pillar + ']' : ''}  (${c.events.length} events) =====`);
  console.log('disposition:', disp);

  const misses = [];
  console.log('  dial        value  band      target   ok');
  for (const d of DIALS) {
    const b = dials.bandIdx(cur[d]);
    const tgt = (c.target && c.target[d]) || 'neutral';
    const ok = TARGET_OK[tgt](b, cur[d]);
    totalDials++; if (ok) passDials++; else misses.push(`${d}: got ${bandLabel(cur[d])}(${cur[d]}), want ${tgt}`);
    console.log(
      `  ${d.padEnd(11)} ${String(cur[d]).padStart(3)}    ${bandLabel(cur[d]).padEnd(8)} ${tgt.padEnd(7)} ${ok ? 'OK' : 'MISS'}`
    );
  }
  if (!misses.length) { citizensClean++; console.log('  -> ESSENCE MATCH'); }
  else console.log('  -> MISS:', misses.join(' | '));
}

const nCitizens = Object.keys(TIER1_ESSENCE).filter((p) => !only || p.toUpperCase() === only.toUpperCase()).length;
console.log(`\n==== ${passDials}/${totalDials} dial-targets met across ${citizensClean}/${nCitizens} citizens clean ====`);
process.exit(passDials === totalDials ? 0 : 1);
