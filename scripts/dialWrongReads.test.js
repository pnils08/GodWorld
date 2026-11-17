/**
 * dialWrongReads.test.js — engine.349 Task 2 (builder 2026-11-16, "1 yes": fix the wrong reads).
 * Pairs with utilities/citizenDialMap.js, utilities/citizenMemory.js, utilities/compressLifeHistory.js.
 *
 * Pins: a job title or employer name moves nothing; a line moves the dial it says, the way it
 * says; a routine push can stick near the top of a dial and nobody pins at 100; a catch-up fold
 * lets the swing fade between Cycles.
 *
 * Run: node scripts/dialWrongReads.test.js
 */

global.Logger = { log() {} };
const E = require('../utilities/citizenMemory.js');
Object.keys(E).forEach(k => { global[k] = E[k]; });
const M = require('../utilities/citizenDialMap.js');
global.nudgesForEvent_ = M.nudgesForEvent_;
global.nudgesForReflection_ = M.nudgesForReflection_;
global.baseTag_ = M.baseTag_;
global.queueCellIntent_ = () => ({});
const C = require('../utilities/compressLifeHistory.js');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}
const parse = text => C.parseLifeHistoryEntries_(text).entries;
const fxOf = e => M.nudgesForEvent_(e.tag, 1, e.text);
const empty = o => Object.keys(o).filter(k => o[k]).length === 0;

console.log('═══ Section A — the mint sentence: a job title or employer name moves nothing');
{
  const hosp = parse('Promoted to Tier 3 in Cycle 110. Chief Medical Officer, Oakland Hospital.')[0];
  assert('A1 "Promoted to Tier N in Cycle C. …" parses as Intake, stamped with its Cycle', hosp.tag === 'Intake' && hosp.cycle === 110);
  assert('A2 a hospital job moves no dial (was composure -6)', empty(fxOf(hosp)), JSON.stringify(fxOf(hosp)));
  const partner = parse('Promoted to Tier 3 in Cycle 106. Managing Partner, Coastline Construction (BIZ-00056)')[0];
  assert('A3 a managing partner moves no dial (was drive +7, composure +2)', partner.tag === 'Intake' && empty(fxOf(partner)));
  const wave = parse("Arrived in Brooklyn with the Cycle 107 migration wave — one of the households that filled the neighborhood's empty streets. Strong community engagement welcomed their presence. ")[0];
  assert('A4 "Arrived in <hood> …" parses as Arrival', wave.tag === 'Arrival' && wave.cycle === 107);
  assert('A5 an arrival is a new start: openness +3 and nothing else (was sociability +4 by word-match)', fxOf(wave).openness === 3 && Object.keys(fxOf(wave)).length === 1, JSON.stringify(fxOf(wave)));
  const oak = parse('Arrived in Oakland during Cycle 99. Settled in Temescal. ')[0];
  assert('A6 "Arrived in Oakland …" still parses as Arrival', oak.tag === 'Arrival' && fxOf(oak).openness === 3);
  const catchUp = parse('The record catches up: name kept surfacing until Cycle 106 made it official. Settled in Downtown. ')[0];
  assert('A7 "The record catches up: …" is Intake and moves nothing', catchUp.tag === 'Intake' && empty(fxOf(catchUp)));
  const fam = parse('Y3C4 — [Family] The record catches up: married to Dana Reyes')[0];
  assert('A8 a tagged [Family] line that opens the same way keeps its tag', fam.tag === 'Family');
  assert('A9 the log-only Advancement line is untouched (pinned in citizenDials.test.js:238)', M.nudgesForEvent_('Advancement', 1, 'Intake at Tier 3. Synthetic note').drive === 6);
}

console.log('═══ Section B — a line moves the dial it says, the way it says');
{
  const hard = parse('C116 — [Media-Composure-Down-M] Named in a hard light — the coverage was not kind (the paper)')[0];
  assert('B1 unkind coverage: composure -2, no sociability gain', fxOf(hard).composure === -2 && !fxOf(hard).sociability, JSON.stringify(fxOf(hard)));
  assert('B2 ...and kind readers still see Media', M.baseTag_(hard.tag) === 'Media');
  const moved = parse('C116 — [Media-Sociability-Down-M] The spotlight moved on — back to Tier 4 life, quieter and no less lived')[0];
  assert('B3 the spotlight moving on: sociability -2', fxOf(moved).sociability === -2);
  assert('B4 ordinary coverage still reads as recognition', M.nudgesForEvent_('Media', 1, 'quoted in the paper').sociability === 4);
  const cut = parse('C116 — [Business-Composure-Down-L] Mayday Movers paid its owner $0 this year — the books cut the draw')[0];
  assert('B5 a cut draw: composure -4, no drive or openness gain (was drive +6, openness +3)', fxOf(cut).composure === -4 && !fxOf(cut).drive && !fxOf(cut).openness, JSON.stringify(fxOf(cut)));
  const raised = parse('C116 — [Business-Drive-Up-L] Ridgeline Ventures paid its owner $946769 this year — the books raised the draw')[0];
  assert('B6 a raised draw: drive +4', fxOf(raised).drive === 4 && Object.keys(fxOf(raised)).length === 1);
  assert('B7 kind readers still see Business', M.baseTag_(cut.tag) === 'Business' && M.baseTag_(raised.tag) === 'Business');
}

console.log('═══ Section C — a routine push can stick near the top, and nobody pins');
{
  const one = d => ({ [d]: 1 });
  // three same-way Cycles at a felt value of 75
  const c = E.newCitizen_({ drive: 75 });
  for (let i = 0; i < 3; i++) { E.settleCycle_(c); E.applyCycleEffects_(c, one('drive')); }
  assert('C1 at 75, three 1-point weeks running harden (base moved up)', c.base.drive > 75, String(c.base.drive));
  // the same run at 50 is unchanged from before the fix: 2.44 swing x 0.4
  const m = E.newCitizen_();
  for (let i = 0; i < 3; i++) { E.settleCycle_(m); E.applyCycleEffects_(m, one('drive')); }
  // 1 -> x0.8 -> +0.984 -> x0.8 -> +0.9715: a 2.3987 swing, 40% of it baked — the pre-349 arithmetic
  assert('C2 at 50 the same run bakes in 0.9595, as it always did', Math.abs(m.base.drive - 50.9594624) < 1e-6, String(m.base.drive));
  // a one-off still fades out in four quiet Cycles, in the middle and near the top
  const quiet = start => { const q = E.newCitizen_({ drive: start }); E.applyCycleEffects_(q, one('drive')); let n = 0; while (q.mood.drive !== 0 && n < 50) { E.settleCycle_(q); n++; } return n; };
  assert('C3 a 1-point one-off is gone after 4 quiet Cycles at 50', quiet(50) === 4, String(quiet(50)));
  assert('C4 ...and after about the same at 75 and at 90 (not 14)', quiet(75) >= 3 && quiet(75) <= 5 && quiet(90) >= 3 && quiet(90) <= 5, quiet(75) + ' / ' + quiet(90));
  // a pull back toward the middle keeps full size and its own four Cycles
  const down = E.newCitizen_({ drive: 90 }); E.applyCycleEffects_(down, { drive: -1 });
  let nd = 0; while (down.mood.drive !== 0 && nd < 50) { E.settleCycle_(down); nd++; }
  assert('C5 a 1-point pull down from 90 is full size and fades in 4', nd === 4, String(nd));
  // 500 Cycles of +1 from 90, and of +8 from 99: asymptotic, never 100
  const hi = E.newCitizen_({ drive: 90 });
  for (let i = 0; i < 500; i++) { E.settleCycle_(hi); E.applyCycleEffects_(hi, one('drive')); }
  const top = E.newCitizen_({ drive: 99 });
  for (let i = 0; i < 500; i++) { E.settleCycle_(top); E.applyCycleEffects_(top, { drive: 8 }); }
  assert('C6 500 weeks of pushes: the dial climbs and never reaches 100', hi.base.drive > 90 && E.current_(hi, 'drive') < 100 && E.current_(top, 'drive') < 100,
    JSON.stringify([hi.base.drive, E.current_(hi, 'drive'), E.current_(top, 'drive')]));
  // two pushes, a long quiet stretch, a third: still no habit (the S449 rule)
  const gap = E.newCitizen_({ drive: 75 });
  E.applyCycleEffects_(gap, one('drive')); E.settleCycle_(gap); E.applyCycleEffects_(gap, one('drive'));
  for (let i = 0; i < 30; i++) E.settleCycle_(gap);
  E.applyCycleEffects_(gap, one('drive'));
  assert('C7 two pushes, thirty quiet Cycles and a third do not harden', gap.base.drive === 75, String(gap.base.drive));
}

console.log('═══ Section D — a catch-up fold lets the swing fade between Cycles');
{
  const mk = (cy, tag) => ({ cycle: cy, tag, text: '' });
  // nine Cycles of one 1-point sociability line each, folded in one pass
  const lines = []; for (let cy = 108; cy <= 116; cy++) lines.push(mk(cy, 'Neighborhood-Sociability-Up-S'));
  const lump = E.newCitizen_(); lump.folded = 107;
  C.foldNewEntries_(lump, lines, null);
  // the same nine, each folded in its own Cycle with the settle the fold runs first
  const weekly = E.newCitizen_(); weekly.folded = 107;
  lines.forEach((l, i) => { if (i > 0) E.settleCycle_(weekly); C.foldNewEntries_(weekly, [l], null); });
  assert('D1 nine held Cycles folded at once = the same nine folded week by week', JSON.stringify(lump.base) === JSON.stringify(weekly.base) && JSON.stringify(lump.mood) === JSON.stringify(weekly.mood),
    JSON.stringify([lump.base.sociability, weekly.base.sociability, lump.mood.sociability, weekly.mood.sociability]));
  assert('D2 the watermark moves to the last Cycle folded', lump.folded === 116);
  // a gap inside the catch-up fades by the Cycles it spans
  const gapped = E.newCitizen_(); C.foldNewEntries_(gapped, [mk(108, 'Neighborhood-Sociability-Up-S'), mk(112, 'Neighborhood-Sociability-Up-S')], null);
  assert('D3 four Cycles apart: the first swing is gone before the second lands (no streak of 2)', gapped.streak.sociability === 1 && gapped.mood.sociability === 1, JSON.stringify([gapped.streak.sociability, gapped.mood.sociability]));
  // one Cycle's lines: no extra settle (the ordinary fold is unchanged)
  const single = E.newCitizen_(); single.mood.drive = 2; single.streak.drive = 1;
  C.foldNewEntries_(single, [mk(116, 'Work'), mk(116, 'Neighborhood-Sociability-Up-S')], null);
  // Work +4 lands room-scaled on a dial already at 52: 2 + 4 x 0.96, with no fade applied to the 2
  assert('D4 a single Cycle folds with no settle inside it', Math.abs(single.mood.drive - 5.84) < 1e-9 && single.mood.sociability === 1, JSON.stringify(single.mood));
}

E.setDialTuning_(null);
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
