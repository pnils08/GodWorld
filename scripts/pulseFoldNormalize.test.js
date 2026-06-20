/**
 * engine.38 S2 — pulse-fold volume normalization.
 * Proves: (1) low-volume (<= ref) is byte-identical to the old fold, (2) at high
 * volume two hoods with the SAME event count but different LEAN produce DIFFERENT
 * deltas (old code saturated both to cap, erasing inter-hood signal).
 * Run: node scripts/pulseFoldNormalize.test.js
 */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.resolve(__dirname, '../phase08-v3-chicago/v3NeighborhoodWriter.js'), 'utf8');
const m = new Function(src + '\nreturn { pulseFoldDelta_, PULSE_FOLD, PULSE_REF_EVENTS };')();
const { pulseFoldDelta_, PULSE_FOLD, PULSE_REF_EVENTS } = m;

let pass = 0, fail = 0;
const ok = (l, c, d) => c ? (console.log('  ok   ' + l), pass++) : (console.error('  FAIL ' + l + (d ? ': ' + d : '')), fail++);
const oldFold = (pulse, key) => { // the pre-S2 fold, for parity comparison
  const raw = Number(pulse[key] || 0) * PULSE_FOLD[key].dampen;
  const cap = PULSE_FOLD[key].cap;
  return raw > cap ? cap : (raw < -cap ? -cap : raw);
};

// ── 1) low-volume parity (events <= ref): identical to old fold ──
{
  const lowPulse = { attractiveness: 30, vitality: 8, sentiment: 4, crime: 2, events: PULSE_REF_EVENTS };
  let allMatch = true;
  ['attractiveness', 'vitality', 'sentiment', 'crime'].forEach(k => {
    if (Math.abs(pulseFoldDelta_(lowPulse, k) - oldFold(lowPulse, k)) > 1e-9) allMatch = false;
  });
  ok('low-volume (events <= ref) is byte-identical to the old fold', allMatch);

  const tinyPulse = { attractiveness: 5, events: 2 };
  ok('very-low-volume hood unchanged vs old', Math.abs(pulseFoldDelta_(tinyPulse, 'attractiveness') - oldFold(tinyPulse, 'attractiveness')) < 1e-9);
}

// ── 2) old code saturated high volume; new code discriminates by lean ──
{
  // Two hoods, SAME 28 events, raw sums both >=16 so the OLD fold saturates both
  // to cap (dampen*sum >= 4). Hood A net-stronger per-event lean (50/28=1.79) than
  // Hood B (20/28=0.71) — both below the normalized cap threshold (perEvent<2), so
  // the NEW fold separates them instead of pinning both to cap.
  const hoodA = { attractiveness: 50, events: 28 };
  const hoodB = { attractiveness: 20, events: 28 };

  const oldA = oldFold(hoodA, 'attractiveness');
  const oldB = oldFold(hoodB, 'attractiveness');
  ok('OLD fold saturates BOTH high-volume hoods to cap (the bug)',
    oldA === PULSE_FOLD.attractiveness.cap && oldB === PULSE_FOLD.attractiveness.cap,
    'oldA=' + oldA + ' oldB=' + oldB);

  const newA = pulseFoldDelta_(hoodA, 'attractiveness');
  const newB = pulseFoldDelta_(hoodB, 'attractiveness');
  ok('NEW fold distinguishes the two hoods by per-event lean (signal preserved)',
    newA > newB, 'newA=' + newA.toFixed(3) + ' newB=' + newB.toFixed(3));
  ok('NEW fold stays within cap (still bounded)',
    newA <= PULSE_FOLD.attractiveness.cap && newB <= PULSE_FOLD.attractiveness.cap,
    'newA=' + newA.toFixed(3));
}

// ── 3) volume-invariance: same per-event lean -> same delta regardless of count ──
{
  // per-event lean +4/event, at 8 events vs 80 events.
  const small = { vitality: 32, events: 8 };
  const large = { vitality: 320, events: 80 };
  const dS = pulseFoldDelta_(small, 'vitality');
  const dL = pulseFoldDelta_(large, 'vitality');
  ok('same per-event lean yields same delta at 8 vs 80 events (volume-invariant)',
    Math.abs(dS - dL) < 1e-9, 'small=' + dS.toFixed(4) + ' large=' + dL.toFixed(4));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
