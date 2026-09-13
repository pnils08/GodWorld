'use strict';
// NON-CANON, offline diagnostic evidence for engine.201. Run from repository root.
// All synthetic rows remain in memory. No env loader, network, or sheet writer.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const root = process.cwd();
const E = require(path.join(root, 'utilities/citizenMemory.js'));
const M = require(path.join(root, 'utilities/citizenDialMap.js'));
Object.assign(global, E, { Logger: { log() {} }, nudgesForEvent_: M.nudgesForEvent_,
  nudgesForReflection_: M.nudgesForReflection_, baseTag_: M.baseTag_,
  queueCellIntent_() {}, queueAppendIntent_() {} });
const C = require(path.join(root, 'utilities/compressLifeHistory.js'));
const D = require(path.join(root, 'lib/citizenDials.js'));
const out = { scope: 'Offline diagnostics; synthetic probes are NON-CANON; snapshot is historical, not live' };
out.sourceHashes = Object.fromEntries(['utilities/citizenMemory.js', 'utilities/citizenDialMap.js',
  'utilities/compressLifeHistory.js', 'phase05-citizens/runCareerEngine.js', 'lib/wakePerception.js',
  'lib/citizenDials.js', 'output/simulation_ledger_snapshot.jsonl'].map(p =>
  [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex')]));
const clone = x => JSON.parse(JSON.stringify(x));
const makeCtx = (state, life, cycle) => ({ mode: {}, summary: { absoluteCycle: cycle },
  ledger: { headers: ['POPID', 'LifeHistory', 'TraitProfile', 'DialState'],
    rows: [['SYNTHETIC-NONCANON', life, 'Archetype:Drifter|Updated:c106', C.serializeDialState_(state)]], dirty: false } });
const stateOf = ctx => JSON.parse(ctx.ledger.rows[0][3]);
const fx = (c, effects) => E.applyEvent_(c, { effects });

out.map = Object.fromEntries(E.DIALS.map(d => [d, Object.values(M.DIAL_MAP).reduce((s, f) => {
  if (f[d] > 0) { s.positiveEntries++; s.positiveSum += f[d]; }
  if (f[d] < 0) { s.negativeEntries++; s.negativeSum += f[d]; }
  return s;
}, { positiveEntries: 0, negativeEntries: 0, positiveSum: 0, negativeSum: 0 })]));

// One Cycle can harden; a long quiet gap does not clear reinforcement.
{
  const c = E.newCitizen_();
  for (let n = 0; n < 3; n++) fx(c, { drive: 8 });
  const spaced = E.newCitizen_();
  fx(spaced, { drive: 8 }); fx(spaced, { drive: 8 });
  for (let n = 0; n < 30; n++) E.settleCycle_(spaced);
  const before = clone(spaced);
  fx(spaced, { drive: 8 });
  out.streak = { threeEventsOneCycle: { base: c.base.drive, mood: c.mood.drive },
    afterThirtyQuietCycles: { base: before.base.drive, mood: before.mood.drive, streak: before.streak.drive },
    nextEventBase: spaced.base.drive };
}

// Positive evidence can harden a still-negative accumulated swing DOWN.
{
  const c = E.newCitizen_(); fx(c, { composure: -20 });
  for (let n = 0; n < 3; n++) fx(c, { composure: 1 });
  out.hardeningDirection = { evidence: [-20, 1, 1, 1], base: c.base.composure, mood: c.mood.composure };
}

// The hardening taper protects base only; current_ can saturate through mood.
{
  const c = E.newCitizen_(); let firstPin = null;
  for (let cy = 1; cy <= 120; cy++) {
    E.settleCycle_(c); fx(c, { sociability: 4 });
    if (!firstPin && E.current_(c, 'sociability') === 100) firstPin = cy;
  }
  out.pin = { firstPinCycle: firstPin, base: c.base.sociability, mood: c.mood.sociability,
    current: E.current_(c, 'sociability') };
  const r = E.newCitizen_();
  for (let n = 0; n < 1000; n++) E.accreteReflectionsIntoBase_(r, [{ event: 'Community', affect: 'Calm' }], M, C.REFLECTION_MULT, C.REFLECTION_ACCRETION_FRAC);
  out.reflectionPin = { count: 1000, mult: C.REFLECTION_MULT, fraction: C.REFLECTION_ACCRETION_FRAC, sociabilityBase: r.base.sociability };
}

// A Cycle-only watermark drops a later arrival stamped in that same Cycle.
{
  const c = E.newCitizen_(); c.folded = 105;
  const ctx = makeCtx(c, 'C106 — [Neighborhood] synthetic observation', 106);
  C.compressLifeHistory_(ctx); const first = stateOf(ctx);
  ctx.ledger.rows[0][1] += '\nC106 — [Promotion] synthetic late arrival';
  ctx.summary.absoluteCycle = 107;
  C.compressLifeHistory_(ctx); const second = stateOf(ctx);
  out.lateArrival = { foldedBefore: first.folded, foldedAfter: second.folded,
    driveBase: second.base.drive, driveMood: second.mood.drive };
}

// Mood decay is per invocation, without a last-settled Cycle guard.
{
  const c = E.newCitizen_(); c.folded = 106; c.mood.composure = 10;
  const ctx = makeCtx(c, 'C106 — [Daily] synthetic already folded', 107);
  C.compressLifeHistory_(ctx); const first = stateOf(ctx).mood.composure;
  C.compressLifeHistory_(ctx); const second = stateOf(ctx).mood.composure;
  const jumped = makeCtx(c, 'C106 — [Daily] synthetic already folded', 117);
  C.compressLifeHistory_(jumped);
  out.settle = { sameCycleFirst: first, sameCycleSecond: second, elevenCycleJump: stateOf(jumped).mood.composure };
}

// No cause identity survives in pressure history; adaptation manufactures a gap.
{
  const row = ['']; const sequence = [];
  for (let cy = 1; cy <= 15; cy++) {
    const ctx = { summary: { absoluteCycle: cy } };
    sequence.push(M.emitPressureTag_(ctx, row, 0, 'SYNTHETIC-NONCANON', 'rent', 'synthetic continuous breach'));
  }
  const mixed = ['C1 — [Friction] synthetic rent breach'];
  const ctx = { summary: { absoluteCycle: 2 } };
  const unemployment = M.emitPressureTag_(ctx, mixed, 0, 'SYNTHETIC-NONCANON', 'unemployed', 'synthetic first jobless Cycle');
  const overwork = M.emitPressureTag_(ctx, mixed, 0, 'SYNTHETIC-NONCANON', 'overwork', 'synthetic overwork');
  out.pressure = { continuousRent: sequence, firstUnemploymentAfterRent: unemployment, sameCycleOverwork: overwork };
}

// Actual producer strings: tag routing loses outcome before the fold.
out.routing = [
  ['Faith', 'drifted from the congregation at SYNTHETIC-NONCANON, quietly'],
  ['Bond', 'there is someone else circling SYNTHETIC-NONCANON — and it stings'],
  ['Bond', 'met SYNTHETIC-NONCANON — something starting'],
  ['EngineEvent', 'SYNTHETIC-NONCANON business closed'],
].map(([tag, text]) => ({ tag, text, effects: M.nudgesForEvent_(tag, 1, text) }));

// Missing reads poison the per-context cache even after a valid row is supplied.
{
  const ctx = {}; const first = C.getCitizenDialBands_(ctx, 'SYNTHETIC-NONCANON');
  const second = C.getCitizenDialBands_(ctx, 'SYNTHETIC-NONCANON', C.serializeDialState_(E.newCitizen_({ drive: 90 })));
  out.cache = { first, withValidOverrideAfterMiss: second };
}

// Run an actual workplace producer with only in-memory Sheet stubs.
{
  const sandbox = { Logger: { log() {} }, inWorldStamp_: () => 'C106', queueAppendIntent_() {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'phase05-citizens/runCareerEngine.js'), 'utf8'), sandbox);
  const h = ['POPID', 'First', 'Last', 'Neighborhood', 'RoleType', 'Status', 'Tier', 'BirthYear', 'CareerStage',
    'YearsInCareer', 'EducationLevel', 'LastPromotionCycle', 'LifeHistory', 'LastUpdated', 'ClockMode',
    'EconomicProfileKey', 'Income', 'NetWorth', 'WealthLevel', 'EmployerBizId', 'SkillTags'];
  const o = { POPID: 'SYNTHETIC-NONCANON', Status: 'Active', Tier: 4, BirthYear: 2000, ClockMode: 'ENGINE',
    Income: 50000, EmployerBizId: 'BIZ-SYNTHETIC-NONCANON', LifeHistory: 'C105 — [CareerState] level=1' };
  const r = h.map(k => o[k] == null ? '' : o[k]); const before = r[h.indexOf('LifeHistory')];
  const bl = [['BIZ_ID', 'Name', 'Sector', 'Growth_Rate'], ['BIZ-SYNTHETIC-NONCANON', 'NON-CANON employer', 'Retail', -20]];
  const ctx = { ledger: { headers: h, rows: [r], dirty: false }, config: {}, now: 'C106',
    ss: { getSheetByName: n => n === 'Business_Ledger' ? { getDataRange: () => ({ getValues: () => bl }) } : null } };
  const S = { careerSignals: { promotions: 0, layoffs: 0, transitions: 0, businessDeltas: {} }, eventsGenerated: 0 };
  const logs = [];
  const result = sandbox.applyEmployerSuccess_(ctx, 106, () => 0, logs, S, 1);
  out.workplace = { layoffs: result.layoffs, employerAfter: r[h.indexOf('EmployerBizId')], incomeAfter: r[h.indexOf('Income')],
    logTags: logs.map(x => x[3]), lifeHistoryUnchanged: r[h.indexOf('LifeHistory')] === before };
}

// Historical snapshot measurements; never invoke the connected Sheets client.
async function snapshot() {
  const rows = fs.readFileSync(path.join(root, 'output/simulation_ledger_snapshot.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  const meta = JSON.parse(fs.readFileSync(path.join(root, 'output/simulation_ledger_snapshot.meta.json'), 'utf8'));
  const h = Object.keys(rows[0]); const sheetRows = [h, ...rows.map(r => h.map(k => r[k]))];
  const sheets = { getRawSheetData: async n => {
    if (n === 'Simulation_Ledger') return sheetRows;
    if (n === 'Heritage_Ledger') return []; // Enrichment only; never a buildPool eligibility filter.
    throw new Error('Unexpected offline tab: ' + n);
  } };
  const sandbox = { module: { exports: {} }, __dirname: path.join(root, 'lib'), require: p => {
    if (p === 'fs') return fs;
    if (p === 'path') return path;
    if (p.endsWith('/lib/sheets')) return sheets;
    if (p.endsWith('/lib/citizenDials')) return D;
    if (p.endsWith('/utilities/citizenDialMap')) return M;
    if (p === './citizenDerivation') return { currentSimYear: () => 0 }; // Age output unused; not a pool filter.
    if (['env', 'citizenPage', 'memoryFence', 'resonanceRecall', 'neighborhoodSlice'].some(n => p.endsWith('/lib/' + n))) return {};
    throw new Error('Unexpected offline import: ' + p);
  } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'lib/wakePerception.js'), 'utf8'), sandbox);
  const pool = await sandbox.module.exports.buildPool();
  const eligible = new Set(pool.map(r => r.popId));
  const valid = rows.map(r => D.currentDials(r.DialState)).filter(Boolean);
  const employerKinds = {}, status = {};
  for (const r of rows) {
    const emp = String(r.EmployerBizId || '').trim();
    const kind = /^BIZ-\d+$/.test(emp) ? 'trackedBusiness' : emp || 'blank';
    employerKinds[kind] = (employerKinds[kind] || 0) + 1;
    status[r.Status] = (status[r.Status] || 0) + 1;
  }
  out.snapshot = { meta, rows: rows.length, validDials: valid.length,
    allNeutral40to60Inclusive: valid.filter(v => E.DIALS.every(d => v[d] >= 40 && v[d] <= 60)).length,
    deviationAtLeast60: valid.filter(v => D.deviation(v) >= 60).length,
    actualPool: pool.length, notInPool: rows.length - pool.length, employerKinds, status,
    parsedOutsidePool: rows.filter(r => !eligible.has(String(r.POPID).toUpperCase()) && D.currentDials(r.DialState)).length,
    dials: Object.fromEntries(E.DIALS.map(d => [d, { mean: valid.reduce((s, v) => s + v[d], 0) / valid.length,
      min: Math.min(...valid.map(v => v[d])), max: Math.max(...valid.map(v => v[d])),
      below40: valid.filter(v => v[d] < 40).length, at0: valid.filter(v => v[d] === 0).length,
      at100: valid.filter(v => v[d] === 100).length }])) };
}
snapshot().then(() => console.log(JSON.stringify(out, null, 2))).catch(e => { console.error(e.message); process.exitCode = 1; });
