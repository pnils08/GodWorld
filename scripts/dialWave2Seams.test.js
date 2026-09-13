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
  'phase05-citizens/runNeighborhoodEngine.js', 'phase05-citizens/runCareerEngine.js']) {
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
  ['active', 'dormant', 1.1, 'ConnectionWithdrawn'], ['dormant', 'active', 4.3, 'ConnectionMaintained']
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
  bonds.forEach(b => { b.intensity = 4.3; }); // engine.201b: neither present fades 0.7
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

// S451 (builder ruling 2026-09-13): the hood-rank retag is GONE. The ordinary hood line stays a plain
// `Neighborhood` line whatever the hood's rank; only a PERSISTED pressure bar still tints it (engine.176).
for (const pressure of ['housingPressure', 'crimeIndex']) {
  const rows = [citizen('POP-99001', 'Synthetic', 'Alpha', 'Synthetic Hood A'),
    citizen('POP-99002', 'Synthetic', 'Beta', 'Synthetic Hood B')];
  function neighborhoodRun(pressured) {
    const ctx = context(rows.map(r => r.slice())); ctx.rng = () => 0;
    ctx.config.dialHoodPressureBar = 2; ctx.config.dialHoodCrimeBar = 2; // engine.212: crime bar = 2 × city median (0.5 → 1.0)
    ctx.summary.neighborhoodState = {
      'Synthetic Hood A': { retailVitality: 10, eventAttractiveness: 90, housingPressure: 0, crimeIndex: 0.5 },
      'Synthetic Hood B': { retailVitality: 70, eventAttractiveness: 20, housingPressure: 0, crimeIndex: 0.5 },
      'Synthetic Hood C': { retailVitality: 20, eventAttractiveness: 20, housingPressure: 0, crimeIndex: 0.5 },
      'Synthetic Hood D': { retailVitality: 10, eventAttractiveness: 10, housingPressure: 0, crimeIndex: 0.5 }
    };
    if (pressured) ctx.summary.neighborhoodState['Synthetic Hood A'][pressure] = 3;
    writes.length = 0; w.runNeighborhoodEngine_(ctx);
    return { ctx, tags: writes.filter(x => x.tab === 'LifeHistory_Log').map(x => x.row[3]) };
  }
  const ordinary = neighborhoodRun(false), stressed = neighborhoodRun(true);
  assert(`S451 a top-band hood's ordinary line is a plain Neighborhood line (no ActivityExpanded); ${pressure} still tints Friction`,
    JSON.stringify(ordinary.tags) === '["Neighborhood","Neighborhood"]' &&
    stressed.tags[0] === 'Friction' && counts(stressed.ctx, 'Friction')[0] === 1,
    JSON.stringify({ ordinary: ordinary.tags, stressed: stressed.tags }));
}
{
  const gc = fs.readFileSync(path.join(__dirname, '..', 'phase05-citizens/generateCitizensEvents.js'), 'utf8');
  const ne = fs.readFileSync(path.join(__dirname, '..', 'phase05-citizens/runNeighborhoodEngine.js'), 'utf8');
  assert('S451 no retag helper or retag tag survives in either generator',
    !/activityTopHoods_|activityBottomHoods_|activityBandHoods_|hoodOverCrimeBar_|"ActivityExpanded"|"ActivityContracted"|"StreetsGuarded"/.test(gc + ne));
}
{
  // codex diff review S449 P1: a supplied POPID that does not resolve fails closed (no namesake), and a
  // gone owner lives no new memory; an alive non-Active owner (hospitalized) still does.
  const absent = closeVenture('POP-99999 (Synthetic Alpha, Owner)', people());
  const gone = people(); gone[0][4] = 'Deceased';
  const deceased = closeVenture('POP-99001 (Synthetic Alpha, Owner)', gone);
  const sick = people(); sick[0][4] = 'hospitalized';
  const hospitalized = closeVenture('POP-99001 (Synthetic Alpha, Owner)', sick);
  assert('review P1: unresolved owner POPID never re-routes to a namesake; deceased owner gets nothing; hospitalized owner still lives it',
    JSON.stringify(counts(absent, 'RoutineRetrenched')) === '[0,0]' && JSON.stringify(counts(deceased, 'RoutineRetrenched')) === '[0,0]' &&
    JSON.stringify(counts(hospitalized, 'RoutineRetrenched')) === '[1,0]',
    JSON.stringify({ absent: counts(absent, 'RoutineRetrenched'), deceased: counts(deceased, 'RoutineRetrenched'), hospitalized: counts(hospitalized, 'RoutineRetrenched') }));
}
{
  // codex diff review S449 P1: six cycles of overwork must not make a first rent breach look adapted.
  w.ensureConfig = null;
  const rows = [citizen('POP-99001', 'Synthetic', 'Alpha')];
  for (let c = 101; c <= 106; c++) {
    const ctx = context(rows, [], c);
    w.emitPressureTag_(ctx, rows[0], 3, 'POP-99001', 'overwork', w.pressureText_('overwork', c));
  }
  const ctx7 = context(rows, [], 107);
  const rentTag = w.emitPressureTag_(ctx7, rows[0], 3, 'POP-99001', 'rent', w.pressureText_('rent', 107));
  const ds = JSON.parse(rows[0][8]);
  assert('review P1: a new cause in an initialized pressure envelope starts at first breach (Friction), not adapted',
    rentTag === 'Friction' && ds.pressure.rent.n === 1 && ds.pressure.overwork.n === 6, JSON.stringify({ rentTag, pressure: ds.pressure }));
  const legacy = [citizen('POP-99002', 'Synthetic', 'Beta')];
  legacy[0][3] = [101, 102, 103, 104, 105, 106].map(c => 'C' + c + ' — [Strain] ' + w.pressureText_('overwork', c)).join('\n');
  const legacyTag = w.emitPressureTag_(context(legacy, [], 107), legacy[0], 3, 'POP-99002', 'rent', w.pressureText_('rent', 107));
  assert('review P1: a pre-S449 row seeds a cause only from that cause\'s own lines', legacyTag === 'Friction', legacyTag);
}
{
  // codex diff review S449 P2: an unbroken unemployed pressure run is job-loss evidence after the layoff line trims away.
  const held = w.serializeDialState_(Object.assign(w.newCitizen_(), { pressure: { unemployed: { n: 4, l: 199 } } }));
  const lapsed = w.serializeDialState_(Object.assign(w.newCitizen_(), { pressure: { unemployed: { n: 4, l: 190 } } }));
  const src = fs.readFileSync(path.join(__dirname, '..', 'phase05-citizens/runCareerEngine.js'), 'utf8');
  assert('review P2: unemployedRunHeldLastCycle_ reads the persisted run and the income gate consults it',
    w.unemployedRunHeldLastCycle_(held, 200) === true && w.unemployedRunHeldLastCycle_(lapsed, 200) === false &&
    w.unemployedRunHeldLastCycle_('not json', 200) === false && /!unemployedRunHeldLastCycle_\(/.test(src));
  assert('review: one netted cycle of +56 never lands on 100', (() => { const c = w.newCitizen_(); w.applyEvent_(c, { effects: { drive: 56 } }); w.applyEvent_(c, { effects: { drive: 56 } }); return w.current_(c, 'drive') < 100; })());
}

// engine.201b (S449): the four follow-ups — every assert below fails on 4d87d74b.
{
  const step = (type, active, created, cycle = 200, intensity = 5) => {
    const bond = pair(type, 'active', intensity); bond.cycleCreated = created; bond.lastUpdate = created;
    const ctx = context(people(), [bond], cycle); ctx._bondActivePool = active;
    w.updateExistingBonds_(ctx); return Math.round((bond.intensity - intensity) * 100) / 100;
  };
  const young1 = step('friendship', ['POP-99001'], 199), young0 = step('friendship', [], 199);
  assert('201b a young bond fades when the pair does not share the cycle (one present −0.5, neither −0.7) — no bondAge clock',
    young1 === -0.5 && young0 === -0.7, JSON.stringify({ young1, young0 }));
  const oldShared = step('friendship', ['POP-99001', 'POP-99002'], 100);
  assert('201b an old friendship the pair keeps sharing grows (+0.4); the lastUpdate stamp no longer fades it', oldShared === 0.4, String(oldShared));
  const kept = ['family', 'professional', 'neighbor'].map(t => step(t, ['POP-99001', 'POP-99002'], 199));
  assert('201b family / professional / neighbor bonds rise +0.15 on a shared cycle (a return path from neglect)',
    kept.every(d => d === 0.15), JSON.stringify(kept));
}
{
  const bond = pair('rivalry', 'active', 8);
  const fire = cycle => { bond.intensity = 8; const ctx = context(people(), [bond], cycle); const n = w.checkConfrontationTriggers_(ctx).length; return [n].concat(counts(ctx, 'TrustGuarded', cycle)); };
  const first = fire(200), repeat = fire(201), within = fire(206), after = fire(207);
  assert('201b a feud rests: no confrontation (and no TrustGuarded) within 6 cycles of the last; the next flare-up confronts and stings',
    JSON.stringify([first, repeat, within, after]) === '[[1,1,1],[0,0,0],[0,0,0],[1,1,1]]', JSON.stringify([first, repeat, within, after]));
}
{
  // S451: the three retag tags are unmapped — a legacy line carrying one resolves to a plain day ({}),
  // and a bottom-quarter resident's ordinary line is a plain Neighborhood line.
  const st = {};
  [['A', 20, 0, 0], ['B', 18, 0, 0], ['C', 15, 0, 1.2], ['D', 12, 0, 0], ['E', 11, 0, 0], ['F', 10, 3, 0], ['G', 9, 0, 0], ['H', 8, 0, 0]]
    .forEach(([h, sc, hp, cr]) => { st[h] = { retailVitality: sc / 2, eventAttractiveness: sc / 2, housingPressure: hp, crimeIndex: cr }; });
  const cfg = { config: { dialHoodPressureBar: 3, dialHoodCrimeBar: 1 } };
  const M = w.nudgesForEvent_;
  assert('S451 ActivityExpanded / ActivityContracted / StreetsGuarded resolve to {} (unmapped, plain day)',
    ['ActivityExpanded', 'ActivityContracted', 'StreetsGuarded'].every(t => Object.keys(M(t)).length === 0),
    JSON.stringify([M('ActivityExpanded'), M('ActivityContracted'), M('StreetsGuarded')]));
  const rows = [citizen('POP-99001', 'Synthetic', 'Alpha', 'H')];
  const ctx = context(rows); ctx.rng = () => 0; Object.assign(ctx.config, cfg.config); ctx.summary.neighborhoodState = st;
  writes.length = 0; w.runNeighborhoodEngine_(ctx);
  const tags = writes.filter(x => x.tab === 'LifeHistory_Log').map(x => x.row[3]);
  assert('S451 the neighborhood engine writes a plain Neighborhood line for a bottom-quarter resident', tags[0] === 'Neighborhood', JSON.stringify(tags));
}
{
  // S451 (builder ruling): a base read AT a pole is read back AS IS — the five seeded 100s are not remapped.
  const c = w.deserialize_({ base: { drive: 100, sociability: 0, warmth: 99.9 }, streak: {} });
  assert('S451 a base read at 100 / 0 stays 100 / 0 (no read-side unpin); inside the range untouched',
    c.base.drive === 100 && c.base.sociability === 0 && c.base.warmth === 99.9, JSON.stringify(c.base));
  const down = w.newCitizen_({ drive: 100 }); w.applyEvent_(down, { effects: { drive: -5 } });
  const up = w.newCitizen_({ drive: 100 }); w.applyEvent_(up, { effects: { drive: 5 } });
  assert('S451 a pinned 100 moves only on a real downward event (down < 100, up stays 100)',
    w.current_(down, 'drive') < 100 && w.current_(up, 'drive') === 100, JSON.stringify({ down: w.current_(down, 'drive'), up: w.current_(up, 'drive') }));
}
{
  // engine.212 (S451): the crime bar is dialHoodCrimeBar × the city median CrimeIndex off the persisted snapshot.
  const live = { Downtown: 1.1, Temescal: 0.76, Rockridge: 0.48, Fruitvale: 1, 'West Oakland': 1.1, 'East Oakland': 1.11, 'Lake Merritt': 0.85,
    'Jack London': 0.87, 'Piedmont Ave': 0.35, 'Grand Lake': 0.51, Chinatown: 0.9, 'Adams Point': 0.64, Dimond: 0.64, Glenview: 0.5, Laurel: 0.52,
    Uptown: 0.71, KONO: 0.64, Brooklyn: 0.53, Eastlake: 0.6, 'Ivy Hill': 0.49, 'San Antonio': 0.82, 'Baylight District': 0.89 };
  const st = {}; for (const h in live) st[h] = { crimeIndex: live[h] };
  const bar = w.hoodCrimeBar_({ config: { dialHoodCrimeBar: 1.45 } }, { neighborhoodState: st });
  const over = Object.keys(live).filter(h => live[h] >= bar).sort();
  assert('212 live C106 shape: 1.45 × median 0.675 = 0.979 → the same four hoods the old absolute 1.0 caught',
    Math.abs(bar - 0.97875) < 0.001 && JSON.stringify(over) === '["Downtown","East Oakland","Fruitvale","West Oakland"]', JSON.stringify({ bar, over }));
  assert('212 no snapshot → bar Infinity, nothing tints; the bar is cached per ctx',
    w.hoodCrimeBar_({ config: { dialHoodCrimeBar: 1.45 } }, {}) === Infinity && (() => { const c = { config: { dialHoodCrimeBar: 1.45 } }; w.hoodCrimeBar_(c, { neighborhoodState: st }); return c._hoodCrimeBar === bar; })());
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
