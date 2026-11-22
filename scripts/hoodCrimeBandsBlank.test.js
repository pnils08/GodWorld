#!/usr/bin/env node
// engine.356 gaps (builder 2026-11-21 "Go on these"): crime reads against the city's middle in the hood trajectory
// and migration, on World_Config bands; a blank Neighborhood_Map cell is missing, not 0. Real engine files, loaded
// whole into one Apps Script-like scope. Run: node scripts/hoodCrimeBandsBlank.test.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let passed = 0, failed = 0;
const ok = (name, cond, detail) => { if (cond) { passed++; console.log('  ok   ' + name); } else { failed++; console.log('  FAIL ' + name + (detail !== undefined ? ' :: ' + detail : '')); } };
const scope = () => { const w = { console, Logger: { log() {} }, Math, JSON, Date }; vm.createContext(w); return w; };
const load = (w, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), w, { filename: rel });

console.log('blank map cell reads as missing (loadNeighborhoodState_)');
{
  const w = scope(); load(w, 'phase02-world-state/loadNeighborhoodState.js');
  const H = ['Cycle', 'Neighborhood', 'CrimeIndex', 'Sentiment', 'TrajectoryMomentum', 'MigrationFlow', 'MedianIncome', 'RetailVitality'];
  const rows = [H, [116, 'A', '', 0, '', 0, 90000, '  '], [116, 'B', 0.6, 0.1, 5, -2, 80000, 7]];
  const ctx = { config: { hoodRentShare: 0.3 }, summary: {}, ss: { getSheetByName: n => n === 'Neighborhood_Map' ? { getDataRange: () => ({ getValues: () => rows }) } : null } };
  w.loadNeighborhoodState_(ctx);
  const a = ctx.summary.neighborhoodState.A, b = ctx.summary.neighborhoodState.B;
  ok('blank CrimeIndex / TrajectoryMomentum / whitespace RetailVitality -> null', a.crimeIndex === null && a.trajectoryMomentum === null && a.retailVitality === null, JSON.stringify(a));
  ok('a real 0 stays 0 (Sentiment 0, MigrationFlow 0)', a.sentiment === 0 && a.migrationFlow === 0, JSON.stringify(a));
  ok('filled cells read as numbers', b.crimeIndex === 0.6 && b.trajectoryMomentum === 5 && b.migrationFlow === -2, JSON.stringify(b));
}

console.log('the hood trajectory reads crime against the city mean (trajectoryCrimeBand)');
{
  const H = ['Neighborhood', 'Sentiment', 'RetailVitality', 'CrimeIndex', 'EventAttractiveness', 'MigrationFlow', 'NeighborhoodTrajectory', 'TrajectoryMomentum', 'TrajectoryStartCycle', 'HousingPressure', 'MedianRent', 'MedianIncome'];
  const run = (crimes, band) => {
    const w = scope(); w.queueCellIntent_ = () => {}; w.recordHookRipple_ = () => {}; w.hoodRentFromIncome_ = () => 1000;
    load(w, 'phase05-citizens/neighborhoodTrajectoryEngine.js');
    const rows = [H].concat(crimes.map((c, i) => ['H' + i, 0.1, 8, c, 6, 0, 'steady', 5, 100, 0, 1000, 90000]));
    const ctx = { config: band === undefined ? {} : { trajectoryCrimeBand: band }, summary: { cycleId: 117, storyHooks: [] },
      ss: { getSheetByName: () => ({ getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }) }) } };
    w.updateNeighborhoodTrajectories_(ctx, 117);
    return ctx.summary.neighborhoodTrajectory;
  };
  // mean of 0.57, 0.65, 0.65, 0.73 = 0.65; band 0.05 -> 0.57 safer (+1), 0.73 rougher (-1), 0.65 neither
  const t = run([0.57, 0.65, 0.65, 0.73], 0.05);
  ok('safer than mean - band scores +1, rougher than mean + band -1, inside the band 0', t.H0.score === 1 && t.H3.score === -1 && t.H1.score === 0, JSON.stringify([t.H0.score, t.H1.score, t.H3.score]));
  const wide = run([0.57, 0.65, 0.65, 0.73], 0.2);
  ok('a wider band (a World_Config dial) takes crime out of every hood here', wide.H0.score === 0 && wide.H3.score === 0, JSON.stringify([wide.H0.score, wide.H3.score]));
  const blank = run(['', 0.65, 0.65, 0.73], 0.05);
  // mean of the three filled = 0.6767: 0.65 sits inside the band (0). Had the blank counted as 0, the mean would be
  // 0.5075 and 0.65 would read rougher (-1).
  ok('a blank crime cell adds no crime term and stays out of the mean', blank.H0.score === 0 && blank.H1.score === 0 && blank.H2.score === 0, JSON.stringify([blank.H0.score, blank.H1.score, blank.H2.score]));
  {
    const w = scope(); w.queueCellIntent_ = () => {}; w.recordHookRipple_ = () => {}; w.hoodRentFromIncome_ = () => 1000;
    load(w, 'phase05-citizens/neighborhoodTrajectoryEngine.js');
    // H0 has blank RetailVitality; the others sit at 8 — had the blank counted as 0 the mean would drop to 6 and H0 would score -1
    const rows = [H, ['H0', 0.1, '', 0.65, 6, 0, 'steady', 5, 100, 0, 1000, 90000], ['H1', 0.1, 8, 0.65, 6, 0, 'steady', 5, 100, 0, 1000, 90000], ['H2', 0.1, 8, 0.65, 6, 0, 'steady', 5, 100, 0, 1000, 90000], ['H3', 0.1, 8, 0.65, 6, 0, 'steady', 5, 100, 0, 1000, 90000]];
    const ctx = { config: { trajectoryCrimeBand: 0.05 }, summary: { cycleId: 117, storyHooks: [] }, ss: { getSheetByName: () => ({ getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }) }) } };
    w.updateNeighborhoodTrajectories_(ctx, 117);
    const tr = ctx.summary.neighborhoodTrajectory;
    ok('a blank shop-health cell adds no term and stays out of the mean (agy diff read, finding 3)', tr.H0.score === 0 && tr.H1.score === 0, JSON.stringify([tr.H0.score, tr.H1.score]));
  }
  let threw = ''; try { run([0.6, 0.7], undefined); } catch (e) { threw = e.message; }
  ok('a missing band throws naming the key (ADR-0015, no default)', /trajectoryCrimeBand/.test(threw), threw);
}

console.log('migration drift reads crime off the median (migrationCrimeBand)');
{
  const w = scope(); load(w, 'phase06-analysis/applyMigrationDrift.js');
  const t = (c, med, band) => w.migrationCrimeTerm_(c, med, band);
  ok('at least band above the median pushes out (-1), at least band below pulls in (+1), inside 0', t(0.73, 0.64, 0.05) === -1 && t(0.57, 0.64, 0.05) === 1 && t(0.66, 0.64, 0.05) === 0);
  ok('a hood exactly on either band edge counts the same both ways (0.64 + 0.05 is 0.6900000000000001 in floating point)', t(0.69, 0.64, 0.05) === -1 && t(0.59, 0.64, 0.05) === 1);
  ok('no reading (blank -> null) moves nothing; neither does a missing median or band', t(null, 0.64, 0.05) === 0 && t(0.9, 0, 0.05) === 0 && t(0.9, 0.64, 0) === 0);
  ok('a blank cell parses to null, a real 0 to 0', w.migrationCellNum_('') === null && w.migrationCellNum_('  ') === null && w.migrationCellNum_(0) === 0 && w.migrationCellNum_('0.7') === 0.7);
  const src = fs.readFileSync(path.join(ROOT, 'phase06-analysis/applyMigrationDrift.js'), 'utf8');
  ok('the row parser no longer reads a blank as 1; the band comes from World_Config and a missing one throws', !/Number\(nhRow\[iCrime\] \|\| 1\)/.test(src) && /ctx\.config\.migrationCrimeBand/.test(src) && /migrationCrimeBand missing or <= 0/.test(src));
}

console.log('readers that turned missing back into 0');
{
  const w = scope(); load(w, 'phase03-population/generateCrisisSpikes.js');
  const wt = crime => w.crisisHoodWeight_({ summary: { neighborhoodState: { X: { incomeTier: 3, crimeIndex: crime } } } }, 'X');
  ok('crisis weight: missing crime takes the neutral 0.7, the same as a 0.7 hood', wt(null) === wt(0.7) && wt(null) !== wt(0), [wt(null), wt(0.7), wt(0)].join(' / '));
  const ge = fs.readFileSync(path.join(ROOT, 'phase05-citizens/generateCitizensEvents.js'), 'utf8');
  ok('hood reaction intensity: missing momentum is NaN (no intensity), not Number(null) = 0', /st\.trajectoryMomentum === null \|\| st\.trajectoryMomentum === undefined \|\| st\.trajectoryMomentum === ''\) \? NaN/.test(ge));
}

console.log('the bands self-arm');
{
  const c = fs.readFileSync(path.join(ROOT, 'phase01-config/engine94SheetContract.js'), 'utf8');
  const o = fs.readFileSync(path.join(ROOT, 'phase01-config/godWorldEngine2.js'), 'utf8');
  ok('ENGINE356_CONFIG_SEEDS seeds both bands at 0.05', /\['trajectoryCrimeBand', 0\.05,/.test(c) && /\['migrationCrimeBand', 0\.05,/.test(c));
  ok('ensureEngine356Config_ runs in runWorldCycleLocked_ before Phase1-LoadConfig', o.indexOf('ensureEngine356Config_(ss);') > 0 && o.indexOf('ensureEngine356Config_(ss);') < o.indexOf("'Phase1-LoadConfig'"));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
