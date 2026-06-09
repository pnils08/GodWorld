/**
 * engine.31 Phase 6 — MULTI-CYCLE TEST HARNESS (the deploy gate).
 *
 * Traces sample citizens across 12 cycles through the REAL Phase-9 path
 * (compressLifeHistory_, fold-on-trim), chaining the trimmed LifeHistory +
 * DialState + TraitProfile forward each cycle exactly as the live engine does.
 * The prior SLOT model shipped an off-by-one + a cycle-order bug that only a
 * multi-cycle trace catches (plan §"Compression becomes stateful"); this is the
 * harness that gate. Asserts the four deploy invariants:
 *   1. Dials NEVER erase   — base persists/accretes run-to-run, never resets to 50.
 *   2. Dials 0-100 bounded — every base dial stays in range across the whole trace.
 *   3. Harden only on a PATTERN — a sustained same-direction stream moves base into
 *      the far band; a single one-off event does NOT.
 *   4. Crime locks only on a PATTERN — sustained Transgression erodes integrity into
 *      the low band (crimeReachable) over cycles; one transgression does not.
 *
 * Run: node scripts/citizenDialMultiCycle.test.js
 */
// --- inject the Apps Script global surface the compressor calls bare (same as the dial test) ---
global.Logger = { log() {} };
const E = require('../utilities/citizenMemory.js');
Object.keys(E).forEach(k => { global[k] = E[k]; });
const M = require('../utilities/citizenDialMap.js');
global.nudgesForEvent_ = M.nudgesForEvent_;
global.baseTag_ = M.baseTag_;
const C = require('../utilities/compressLifeHistory.js');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

// Single-citizen ctx with a DialState column (the seam Phase 2 requires).
function makeCtx(popId, lifeHistory, traitProfile, dialState, cycle) {
  return {
    mode: {}, summary: { absoluteCycle: cycle },
    ledger: {
      headers: ['POPID', 'LifeHistory', 'TraitProfile', 'DialState'],
      rows: [[popId, lifeHistory, traitProfile || '', dialState || '']],
      dirty: false
    }
  };
}
const get = (ctx, name) => ctx.ledger.rows[0][ctx.ledger.headers.indexOf(name)];

// A timestamped LifeHistory line for a tag (the parser tolerates this shape).
let _ord = 0;
function ev(cycle, tag) {
  _ord++;
  var dd = String((_ord % 28) + 1).padStart(2, '0');
  var mm = String((_ord % 6) + 1);
  return `2026-0${mm}-${dd} 10:0${_ord % 10} — [${tag}] cycle ${cycle}`;
}

// Run a citizen through `cycles` cycles. perCycle(cycle) -> array of tags appended
// to LifeHistory that cycle. Returns the per-cycle base trajectory + final seam.
function trace(popId, cycles, perCycle) {
  let lh = '', tp = '', ds = '';
  const bases = [];
  const reach = [];
  for (let cy = 1; cy <= cycles; cy++) {
    const tags = perCycle(cy) || [];
    const lines = tags.map(t => ev(cy, t));
    lh = lh ? (lh + '\n' + lines.join('\n')) : lines.join('\n');
    const ctx = makeCtx(popId, lh, tp, ds, 100 + cy * 5);  // +5/cycle = real Phase-9 cadence
    C.compressLifeHistory_(ctx, { forceAll: true });
    lh = get(ctx, 'LifeHistory');     // trimmed window carries forward
    tp = get(ctx, 'TraitProfile');
    ds = get(ctx, 'DialState');
    // <3 entries -> engine correctly skips (unseeded neutral); treat as all-50 base.
    const base = ds ? JSON.parse(ds).base : global.newCitizen_().base;
    bases.push(base);
    // crimeReachable via the Phase-5 seam (reads this citizen's DialState; null -> false)
    const seamCtx = { citizenLookup: { [popId]: { DialState: ds } } };
    const seam = C.getCitizenDialBands_(seamCtx, popId);
    reach.push(!!(seam && seam.crimeReachable));
  }
  return { bases, reach, finalDial: ds, finalFace: tp };
}

function bandIdx(v) { return v < 20 ? 0 : v < 40 ? 1 : v < 60 ? 2 : v < 80 ? 3 : 4; }
function allInRange(bases) {
  return bases.every(b => global.DIALS.every(d => b[d] >= 0 && b[d] <= 100));
}
function neverErased(bases, dial) {
  // base[dial] is non-decreasing for a pure-positive stream and never snaps back to 50
  let prev = -Infinity, ok = true;
  for (const b of bases) { if (b[dial] < prev - 0.001) ok = false; prev = b[dial]; }
  return ok;
}

console.log('═══ STRIVER — sustained Promotion every cycle (drive should harden into far band)');
const striver = trace('POP-STRIVER', 12, () => ['Promotion', 'Promotion', 'Promotion']);
console.log('   drive trajectory:', striver.bases.map(b => Math.round(b.drive)).join(' '));
assert('S1 drive never erases (non-decreasing, no snap-back to 50)', neverErased(striver.bases, 'drive'));
assert('S2 drive ends in a HIGH band (>=60) — sustained pattern hardened', bandIdx(striver.bases[11].drive) >= 3, String(striver.bases[11].drive));
assert('S3 all dials 0-100 bounded across the whole trace', allInRange(striver.bases));

console.log('═══ ONE-OFF — a SINGLE Promotion, then ambient (drive must NOT harden)');
const oneoff = trace('POP-ONEOFF', 12, (cy) => cy === 1 ? ['Promotion'] : ['Background', 'Background']);
console.log('   drive trajectory:', oneoff.bases.map(b => Math.round(b.drive)).join(' '));
assert('O1 drive stays NEUTRAL band (<60) — one event does not harden', bandIdx(oneoff.bases[11].drive) < 3, String(oneoff.bases[11].drive));
assert('O2 all dials 0-100 bounded', allInRange(oneoff.bases));

console.log('═══ CRIMINAL — sustained Transgression-Serious (integrity erodes; crime LOCKS over cycles)');
const crim = trace('POP-CRIMINAL', 12, () => ['Transgression-Serious', 'Transgression-Serious', 'Transgression-Serious']);
console.log('   integrity trajectory:', crim.bases.map(b => Math.round(b.integrity)).join(' '));
console.log('   crimeReachable    :', crim.reach.map(r => r ? 'Y' : '.').join(' '));
assert('C1 integrity NOT in low band after cycle 1 (one pattern-start does not damn)', bandIdx(crim.bases[0].integrity) > 0, String(crim.bases[0].integrity));
assert('C2 crime NOT reachable at cycle 1', crim.reach[0] === false);
assert('C3 crime IS reachable by the end (sustained pattern locked it)', crim.reach[11] === true, String(crim.bases[11].integrity));
assert('C4 integrity base never erased/snapped up to 50 mid-trace', crim.bases.every(b => b.integrity <= 50.001));
assert('C5 all dials 0-100 bounded', allInRange(crim.bases));

console.log('═══ ONE-OFF CRIME — a SINGLE transgression, then ambient (must NOT lock crime)');
const oneCrime = trace('POP-ONECRIME', 12, (cy) => cy === 1 ? ['Transgression-Serious'] : ['Background', 'Background']);
console.log('   integrity trajectory:', oneCrime.bases.map(b => Math.round(b.integrity)).join(' '));
assert('X1 crime never reachable from a single transgression', oneCrime.reach.every(r => r === false));
assert('X2 integrity stays out of the low band', oneCrime.bases.every(b => bandIdx(b.integrity) > 0));

console.log('═══ NO-ERASE STRESS — active cycles then quiet (base must CLIMB then HOLD across quiet runs)');
// 8 Promotions/cycle for 4 cycles (32 events) so events age past the 20-window and base
// actually climbs; then 8 quiet cycles with no new events — base must hold, never erase.
const persist = trace('POP-PERSIST', 12, (cy) => cy <= 4 ? new Array(8).fill('Promotion') : []);
console.log('   drive trajectory:', persist.bases.map(b => Math.round(b.drive)).join(' '));
const peak = Math.max(...persist.bases.map(b => b.drive));
assert('P0 drive actually climbed above neutral while active (non-vacuous)', peak >= 60, `peak=${peak}`);
assert('P1 drive HELD at peak through 8 quiet cycles (no erase)', persist.bases[11].drive >= peak - 0.001, `final=${persist.bases[11].drive} peak=${peak}`);
assert('P2 face stayed pipe-delimited with Archetype: token throughout', /(^|\|)Archetype:/.test(persist.finalFace));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
