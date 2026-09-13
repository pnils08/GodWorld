/**
 * engine.201 Wave 2 producer seams. Run: node scripts/dialWave2Seams.test.js
 * Every citizen, business, and neighborhood below is a SYNTHETIC, local-only
 * fixture. No Sheet client or external writer is available in this sandbox.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let passed = 0, failed = 0;
function assert(label, condition, detail) {
  if (condition) { passed++; console.log('ok ' + label); }
  else { failed++; console.error('FAIL ' + label + ': ' + detail); }
}
const writes = [];
const w = {
  console, Math, JSON, Object, Array, String, Number, Date, RegExp, isNaN, isFinite, parseInt, parseFloat,
  Logger: { log() {} }, safeRand_: ctx => ctx.rng,
  inWorldStamp_: ctx => 'C' + ctx.summary.cycleId,
  queueAppendIntent_: (ctx, tab, row) => writes.push({ tab, row: row.slice() }),
  queueCellIntent_: () => {}, queueRangeIntent_: () => {}, queueEnsureTabIntent_: () => {},
  getCoreSimNeighborhoods_: ctx => Object.keys(ctx.summary.neighborhoodState || {}),
  hoodTexturePool_: () => ['Synthetic ordinary neighborhood encounter']
};
vm.createContext(w);
for (const rel of ['utilities/citizenMemory.js', 'utilities/citizenDialMap.js', 'utilities/compressLifeHistory.js',
  'phase05-citizens/bondPersistence.js', 'phase05-citizens/bondEngine.js',
  'phase05-citizens/generationalWealthEngine.js', 'phase05-citizens/applyBusinessDynamics.js',
  'phase05-citizens/runNeighborhoodEngine.js']) {
  const filename = path.join(__dirname, '..', rel);
  vm.runInContext(fs.readFileSync(filename, 'utf8'), w, { filename });
}
const headers = ['POPID', 'First', 'Last', 'LifeHistory', 'Status', 'Tier', 'ClockMode', 'Neighborhood', 'DialState', 'LastUpdated'];
function citizen(id, first, last, hood) {
  return [id, first, last, '', 'Active', 4, 'ENGINE', hood || 'Synthetic Hood A', w.serializeDialState_(w.newCitizen_()), ''];
}
function context(rows, bonds, cycle = 200) {
  return { now: 'C' + cycle, config: { cycleCount: cycle }, rng: () => 0.999,
    summary: { cycleId: cycle, absoluteCycle: cycle, relationshipBonds: bonds || [] },
    ledger: { headers: headers.slice(), rows, dirty: false } };
}
function counts(ctx, tag, cycle = ctx.summary.cycleId) {
  return ctx.ledger.rows.map(r => w.parseLifeHistoryEntries_(r[3]).entries.filter(e => e.tag === tag && e.cycle === cycle).length);
}
function pair(type, status, intensity, a = 'POP-99001', b = 'POP-99002') {
  return { bondId: 'SYNTHETIC-' + type + '-' + a + '-' + b, citizenA: a, citizenB: b,
    bondType: type, status, intensity, cycleCreated: 199, lastUpdate: 199, neighborhood: 'Synthetic Hood A' };
}
function people() { return [citizen('POP-99001', 'Synthetic', 'Alpha'), citizen('POP-99002', 'Synthetic', 'Beta')]; }

// Status transitions are produced by the real intensity update, not the new note helper.
for (const [before, after, intensity, tag] of [
  ['active', 'dormant', 1.1, 'ConnectionWithdrawn'], ['dormant', 'active', 3.6, 'ConnectionMaintained']
]) {
  const observations = [];
  for (const type of ['friendship', 'family', 'romantic', 'mentorship', 'alliance', 'neighbor', 'professional', 'festival']) {
    const bond = pair(type, before, intensity), ctx = context(people(), [bond]);
    w.updateExistingBonds_(ctx);
    if (bond.status !== after) throw new Error('W2 synthetic bond failed to transition: ' + type + ' ' + JSON.stringify(bond));
    observations.push({ type, lines: counts(ctx, tag) });
  }
  const excluded = ['rivalry', 'tension'].map(type => {
    const bond = pair(type, 'active', 1.1), ctx = context(people(), [bond]);
    w.updateExistingBonds_(ctx);
    if (bond.status !== 'dormant') throw new Error('W2 exclusion fixture failed to go dormant: ' + type);
    return ctx.ledger.rows.every(r => r[3] === '');
  });
  assert(`W2 bonds ${before}->${after} write ${tag} to both; dormant rivalry/tension write nothing`,
    observations.every(o => o.lines.every(n => n === 1)) && excluded.every(Boolean), JSON.stringify({ observations, excluded }));
}
{
  const rows = people().concat([citizen('POP-99003', 'Synthetic', 'Gamma')]);
  const bonds = [pair('friendship', 'active', 1.1), pair('friendship', 'active', 1.1, 'POP-99001', 'POP-99003'),
    pair('friendship', 'active', 1.1, 'POP-99002', 'POP-99003')];
  const ctx = context(rows, bonds);
  w.updateExistingBonds_(ctx);
  w.updateExistingBonds_(ctx); // no second status flip
  const withdrawn = counts(ctx, 'ConnectionWithdrawn');
  // Fresh Cycle, same citizens and bonds: a genuinely recovered connection is a new tag.
  bonds.forEach(b => { b.intensity = 3.6; });
  const next = context(rows, bonds, 201); w.updateExistingBonds_(next);
  const maintained = counts(next, 'ConnectionMaintained');
  bonds.forEach(b => { b.intensity = 1.1; });
  const later = context(rows, bonds, 202); w.updateExistingBonds_(later);
  const again = counts(later, 'ConnectionWithdrawn');
  assert('W2 multiple bond shifts write one line per citizen/tag/Cycle and permit later-Cycle recurrence',
    [withdrawn, maintained, again].every(ns => ns.every(n => n === 1)), JSON.stringify({ withdrawn, maintained, again }));
}
{
  const bond = pair('rivalry', 'active', 8), ctx = context(people(), [bond]);
  const confrontations = w.checkConfrontationTriggers_(ctx);
  if (confrontations.length !== 1 || bond.intensity !== 6) throw new Error('W2 confrontation fixture missed the threshold');
  assert('W2 confrontation writes TrustGuarded to both citizens', counts(ctx, 'TrustGuarded').every(n => n === 1), JSON.stringify(counts(ctx, 'TrustGuarded')));
}

// Closure runs the real business drift, distress streak, and closure threshold.
function closeVenture(personnel, rows) {
  const ctx = context(rows);
  // Deliberate synthetic economy: stable negative growth, no random disruption,
  // distress 7->8, revenue below 25% of the retail mint median.
  ctx.config = Object.assign(ctx.config, {
    bizDriftMaxUp: 2, bizDriftMaxDown: 2, bizGrowthCeil: 20, bizGrowthFloor: -30, bizNoiseBound: 0,
    bizVitalityNeutral: 50, bizVitalityGain: 0.1, bizSuccessWindow: 4, bizSuccessVitalityHigh: 80,
    bizSuccessApprovalHigh: 80, bizSuccessPenalty: 1, bizDisruptBaseChance: 0, bizDisruptSuccessMult: 1,
    bizDisruptShock: 1, bizClosureStreak: 8, bizClosureRevenueFloorPct: 25, bizEventShockScale: 1,
    bizVol_faith: 1, bizVol_retail: 1, bizVol_food: 1, bizVol_health: 1, bizVol_tech: 1,
    bizVol_professional: 1, bizVol_construction: 1, bizVol_arts: 1, bizVol_education: 1, bizVol_default: 1,
    bizDeclineStreak: 4, dialOwnerDriveExpandMult: 1.25, dialOwnerStreakRoom: 1
  });
  ctx.summary.previousCycleState = { businessDynamics: { 'BIZ-SYNTHETIC-W2': [7, 0, 0] } };
  const data = [['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', 'Annual_Revenue', 'Growth_Rate', 'Key_Personnel'],
    ['BIZ-SYNTHETIC-W2', 'Synthetic W2 Venture', 'Retail', 'Synthetic Hood A', 2, 100, -20, personnel]];
  ctx.ss = { getSheetByName: tab => tab === 'Business_Ledger' ? { getDataRange: () => ({ getValues: () => data.map(r => r.slice()) }) } : null };
  const result = w.applyBusinessDynamics_(ctx);
  if (result.closed !== 1 || ctx.summary.businessDynamicsState['BIZ-SYNTHETIC-W2'][2] !== 200) throw new Error('W2 venture fixture did not close: ' + JSON.stringify(result));
  return ctx;
}
for (const [resolution, personnel] of [['POPID', 'POP-99001 (Synthetic Nonmatching Label, Owner)'], ['unique name', 'Synthetic Alpha (Founder)']]) {
  const resolved = closeVenture(personnel, people());
  const ambiguous = closeVenture('Synthetic Alpha (Owner)', [citizen('POP-99001', 'Synthetic', 'Alpha'), citizen('POP-99002', 'Synthetic', 'Alpha')]);
  assert(`W2 business closure resolves owner by ${resolution}; ambiguous names write nothing`,
    JSON.stringify(counts(resolved, 'RoutineRetrenched')) === '[1,0]' && ambiguous.ledger.rows.every(r => r[3] === ''),
    JSON.stringify({ resolved: counts(resolved, 'RoutineRetrenched'), ambiguous: counts(ambiguous, 'RoutineRetrenched') }));
}

// The highest retail score is deliberately NOT the highest combined score.
for (const pressure of ['housingPressure', 'crimeIndex']) {
  const rows = [citizen('POP-99001', 'Synthetic', 'Alpha', 'Synthetic Hood A'),
    citizen('POP-99002', 'Synthetic', 'Beta', 'Synthetic Hood B')];
  function neighborhoodRun(pressured) {
    const ctx = context(rows.map(r => r.slice())); ctx.rng = () => 0;
    ctx.config.dialHoodPressureBar = 2; ctx.config.dialHoodCrimeBar = 2;
    ctx.summary.neighborhoodState = {
      'Synthetic Hood A': { retailVitality: 10, eventAttractiveness: 90, housingPressure: 0, crimeIndex: 0 },
      'Synthetic Hood B': { retailVitality: 70, eventAttractiveness: 20, housingPressure: 0, crimeIndex: 0 },
      'Synthetic Hood C': { retailVitality: 20, eventAttractiveness: 20, housingPressure: 0, crimeIndex: 0 },
      'Synthetic Hood D': { retailVitality: 10, eventAttractiveness: 10, housingPressure: 0, crimeIndex: 0 }
    };
    if (pressured) ctx.summary.neighborhoodState['Synthetic Hood A'][pressure] = 3;
    writes.length = 0; w.runNeighborhoodEngine_(ctx);
    return { ctx, tags: writes.filter(x => x.tab === 'LifeHistory_Log').map(x => x.row[3]) };
  }
  const ordinary = neighborhoodRun(false), stressed = neighborhoodRun(true);
  assert(`W2 top-quarter combined hood activity emits ActivityExpanded; ${pressure} retains pressure tint`,
    JSON.stringify(ordinary.tags) === '["ActivityExpanded","Neighborhood"]' &&
    JSON.stringify(counts(ordinary.ctx, 'ActivityExpanded')) === '[1,0]' &&
    stressed.tags[0] === 'Friction' && counts(stressed.ctx, 'ActivityExpanded')[0] === 0 && counts(stressed.ctx, 'Friction')[0] === 1,
    JSON.stringify({ ordinary: ordinary.tags, stressed: stressed.tags }));
}
{
  // engine.201 S449 bench fix: the top quarter is cut across ALL hoods, then a hood over either
  // pressure bar is dropped (pressure claims first in both generators). Relative cut, ties included.
  const st = {};
  [['A', 20, 3, 0], ['B', 19, 0, 0.5], ['C', 19, 0, 1.2], ['D', 12, 0, 0], ['E', 11, 0, 0], ['F', 10, 0, 0], ['G', 9, 0, 0], ['H', 8, 0, 0]]
    .forEach(([h, sc, hp, cr]) => { st[h] = { retailVitality: sc / 2, eventAttractiveness: sc / 2, housingPressure: hp, crimeIndex: cr }; });
  const top = w.activityTopHoods_(st, { config: { dialHoodPressureBar: 3, dialHoodCrimeBar: 1 } });
  assert('W2 activityTopHoods_ keeps the unpressured top-quarter hood, drops housing- and crime-pressured ones, ties at the cut included',
    JSON.stringify(Object.keys(top).sort()) === '["B"]', JSON.stringify(top));
  const src = fs.readFileSync(path.join(__dirname, '..', 'phase05-citizens/generateCitizensEvents.js'), 'utf8');
  assert('W2 generateCitizensEvents retags only the Neighborhood primary tag through the shared top-hood helper',
    /primaryTag === "Neighborhood" && typeof activityTopHoods_ === 'function'/.test(src) && /activityTopHoods_\(S\.neighborhoodState, ctx\)/.test(src));
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
