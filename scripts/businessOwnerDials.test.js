#!/usr/bin/env node
'use strict';
// MINT_GAME_TEAMS_ lives in processAdvancementIntake.js (shared Apps Script scope) — the same two rows (engine.356 bizIsFranchise_)
global.MINT_GAME_TEAMS_ = [[/\bOaks\b/, 'BIZ-00074'], [/\bOakland (?:A['’]s|As|Athletics)\b/, 'BIZ-00005']];
// engine.201: isolated SYNTHETIC citizens/businesses, never canon or Sheet data.
// Run: node scripts/businessOwnerDials.test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
let passed = 0, failed = 0;
function check(name, condition, detail) {
  if (condition) { passed++; console.log('ok ' + name); }
  else { failed++; console.error('FAIL ' + name + ': ' + JSON.stringify(detail)); }
}
const w = { console, Logger: { log() {} },
  inWorldStamp_: ctx => 'C' + ctx.summary.cycleId,
  queueRangeIntent_: (ctx, tab, row, col, values) => ctx.writes.push({ tab, row, col, values }),
  queueEnsureTabIntent_: () => {} };
vm.createContext(w);
w.MINT_GAME_TEAMS_ = global.MINT_GAME_TEAMS_;   // engine.356 bizIsFranchise_ reads it from the shared scope
for (const file of ['utilities/citizenMemory.js', 'utilities/citizenDialMap.js',
  'utilities/compressLifeHistory.js', 'phase05-citizens/generationalWealthEngine.js',
  'phase05-citizens/applyBusinessDynamics.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), w, { filename: file });
}
const H = ['POPID', 'First', 'Last', 'DialState', 'LifeHistory', 'Status'];
function person(id, last = 'Alpha', drive = 90, composure = 90) {
  return [id, 'Synthetic', last, w.serializeDialState_(w.newCitizen_({ drive, composure })), '', 'Active'];
}
function fixture(rows, personnel, declining = false) {
  const config = {
    cycleCount: 200, bizDriftMaxUp: 2, bizDriftMaxDown: 2, bizGrowthCeil: 20, bizGrowthFloor: -30,
    bizNoiseBound: 0, bizCoverageUnit: 0.1, bizVitalityGain: 0.1, bizSuccessWindow: 4,
    bizSuccessVitalityHigh: 80, bizSuccessApprovalHigh: 80, bizSuccessPenalty: 1,
    bizDisruptBaseChance: 0, bizDisruptSuccessMult: 1, bizDisruptShock: 1,
    bizClosureStreak: 8, bizClosureRevenueFloorPct: 25, bizEventShockScale: 1, bizInitiativeStallDrag: 0.5, bizSportsWeekPp: 2.0, bizSettleRate: 0.05, bizSettleMinStaff: 1000, /* engine.356, as ENGINE96_CONFIG_SEEDS seeds them */ bizHoodSpan: 5, bizHoodPull: 0.2, bizHoodMaxPp: 1.5, bizEventCap: 1.0, bizWeatherPp: 1.0, bizClassMiddle_arts: 5.14, bizClassMiddle_construction: 9.02, bizClassMiddle_default: 4.03, bizClassMiddle_education: 0.67, bizClassMiddle_faith: 3.99, bizClassMiddle_food: 5.52, bizClassMiddle_health: 2.42, bizClassMiddle_professional: 6.42, bizClassMiddle_retail: 4.11, bizClassMiddle_tech: 11.59, bizHoodWeight_vitality: 1, bizHoodUnit_vitality: 8, bizHoodWeight_sentiment: 1, bizHoodUnit_sentiment: 0.35, bizHoodWeight_crime: 1, bizHoodUnit_crime: 0.2, bizHoodWeight_momentum: 1, bizHoodUnit_momentum: 5, bizHoodWeight_events: 1, bizHoodUnit_events: 5, bizHoodWeight_migration: 1, bizHoodUnit_migration: 5, bizHoodWeight_income: 1, bizHoodUnit_income: 80000, bizHoodWeight_boom: 1, bizHoodUnit_boom: 1, 
    bizDeclineStreak: 4, bizShipEchoShare: 0.15, dialOwnerDriveExpandMult: 1.25, dialOwnerStreakRoom: 1
  };
  for (const sector of ['faith', 'retail', 'food', 'health', 'tech', 'professional', 'construction', 'arts', 'education', 'default']) config['bizVol_' + sector] = 1;
  const data = [['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', 'Annual_Revenue', 'Growth_Rate', 'Key_Personnel'],
    ['BIZ-SYNTHETIC-OWNER', 'Synthetic Owner Venture', 'Retail', 'Synthetic Hood', 6, declining ? 100 : 100000, declining ? -20 : 1, personnel]];
  return { config, now: 'C200', writes: [], rng() { throw new Error('Owner resolution must not draw from shared RNG'); },
    ledger: { headers: H.slice(), rows: rows.map(r => r.slice()), dirty: false },
    summary: { cycleId: 200, neighborhoodState: { 'Synthetic Hood': { retailVitality: declining ? 50 : 60 }, 'Median Hood': { retailVitality: declining ? 50 : 40 } }, // engine.193: vitality centres on the hood median (50)
      previousCycleState: { businessDynamics: { 'BIZ-SYNTHETIC-OWNER': [declining ? 7 : 0, 0, 0] } } },
    ss: { getSheetByName: tab => tab === 'Business_Ledger' ? { getDataRange: () => ({ getValues: () => data.map(r => r.slice()) }) } : null }
  };
}
function run(rows, personnel, declining) {
  const ctx = fixture(rows, personnel, declining);
  const out = w.applyBusinessDynamics_(ctx);
  const write = ctx.writes.find(x => x.tab === 'Business_Ledger' && x.row === 2 && x.col === 6);
  if (!write) throw new Error('Business fixture did not queue revenue/growth persistence');
  return { ctx, out, revenue: write.values[0][0], growth: write.values[0][1] };
}

const a = person('POP-99001'), b = person('POP-99002');
const blank = person('POP-99002'); blank[3] = '';
const invalidCases = [
  ['unresolved explicit POPID', [a], 'POP-99999 (Synthetic Alpha, Owner)'],
  ['duplicate full name', [a, b], 'Synthetic Alpha (Founder)'],
  ['duplicate full name reversed', [b, a], 'Synthetic Alpha (Founder)'],
  ['duplicate with blank DialState', [a, blank], 'Synthetic Alpha (Owner)'],
  ['duplicate with blank DialState reversed', [blank, a], 'Synthetic Alpha (Owner)'],
  ['third namesake cannot clear ambiguity', [a, b, person('POP-99003')], 'Synthetic Alpha (Owner)'],
  ['explicit ID with no DialState cannot borrow a namesake', [blank, a], 'POP-99002 (Synthetic Alpha, Owner)']
];
for (const [name, rows, personnel] of invalidCases) {
  const ctx = fixture(rows, personnel), before = JSON.stringify(ctx.ledger);
  const bands = w.bizOwnerDials_(ctx, personnel);
  check(name + ' resolves no owner bands', bands === null && JSON.stringify(ctx.ledger) === before, bands);
  const growing = run(rows, personnel, false), neutral = run(rows, '', false);
  check(name + ' cannot amplify persisted business growth/revenue', growing.growth === neutral.growth && growing.revenue === neutral.revenue, { actual: growing.growth, neutral: neutral.growth });
  const declining = run(rows, personnel, true);
  check(name + ' cannot postpone closure or its job losses', declining.out.closed === 1 &&
    declining.ctx.summary.businessDeclines['BIZ-SYNTHETIC-OWNER'] === 6 &&
    declining.ctx.summary.businessDynamicsState['BIZ-SYNTHETIC-OWNER'][2] === 200 &&
    declining.ctx.summary.worldEvents.some(e => e.subdomain === 'business-closure') && declining.growth === -30,
    { closed: declining.out.closed, losses: declining.ctx.summary.businessDeclines, growth: declining.growth });
}

for (const [name, rows, personnel] of [
  ['verified ID with duplicate names', [a, b], 'POP-99001 (Synthetic Alpha, Owner)'],
  ['verified ID remains authoritative over label', [a], 'POP-99001 (Synthetic Other Label, Founder)'],
  ['unique name retains case/edge-space normalization', [a], '  synthetic alpha (Owner)  '],
  ['later valid owner after unresolved ID', [person('POP-99001', 'Alpha', 10, 10), person('POP-99002', 'Beta')], 'POP-99999 (Synthetic Alpha, Owner); Synthetic Beta (Founder)']
]) {
  const growing = run(rows, personnel, false), neutral = run(rows, '', false), declining = run(rows, personnel, true);
  check(name + ' retains drive expansion and composure closure room', growing.growth > neutral.growth &&
    growing.revenue > neutral.revenue && declining.out.closed === 0 && declining.out.ownerRoom === 1,
    { growth: growing.growth, neutral: neutral.growth, closed: declining.out.closed, room: declining.out.ownerRoom });
}
{
  const ctx = fixture([a, person('POP-99002', 'Alpha', 10, 10)], '');
  const ambiguous = w.bizOwnerDials_(ctx, 'Synthetic Alpha (Owner)');
  const exact = w.bizOwnerDials_(ctx, 'POP-99001 (Synthetic Alpha, Owner)');
  check('cached ambiguous-name lookup does not poison exact-ID lookup', ambiguous === null && exact.drive === 90 && exact.composure === 90, { ambiguous, exact });
  check('non-owner personnel remains outside the dial reader', w.bizOwnerDials_(fixture([a], ''), 'Synthetic Alpha (Manager)') === null);
  const missingDials = person('POP-99003', 'Gamma'); missingDials[3] = '';
  check('unique citizen without DialState supplies no bands', w.bizOwnerDials_(fixture([missingDials], ''), 'Synthetic Gamma (Owner)') === null);
}
{
  const rows = [person('POP-99001', 'Alpha', 10, 10)];
  const owned = fixture(rows, 'POP-99001 (Synthetic Alpha, Owner)', true), neutral = fixture(rows, '', true);
  owned.summary.previousCycleState.businessDynamics['BIZ-SYNTHETIC-OWNER'][0] = 6;
  neutral.summary.previousCycleState.businessDynamics['BIZ-SYNTHETIC-OWNER'][0] = 6;
  const low = w.applyBusinessDynamics_(owned), plain = w.applyBusinessDynamics_(neutral);
  check('verified low composure still closes a declining venture one Cycle earlier', low.closed === 1 && plain.closed === 0, { low: low.closed, neutral: plain.closed });
}
// engine.349 Task 14: the owner's numbers, not bands — through applyBusinessDynamics_ with the real seedUnit_ draw.
{
  const at = (cycle, composure, drive, prevStreak, declining) => {
    const ctx = fixture([person('POP-99001', 'Alpha', drive, composure)], 'POP-99001 (Synthetic Alpha, Owner)', declining);
    ctx.config.cycleCount = cycle; ctx.summary.cycleId = cycle; ctx.now = 'C' + cycle;
    if (prevStreak != null) ctx.summary.previousCycleState.businessDynamics['BIZ-SYNTHETIC-OWNER'][0] = prevStreak;
    return w.applyBusinessDynamics_(ctx);
  };
  const cycles = []; for (let c = 200; c < 400; c++) cycles.push(c);
  // streak reaches the bar (prev 7 -> 8 = bizClosureStreak): composure 70+ always buys the cycle, 50 never, 60 about half the time
  const kept = comp => cycles.filter(c => at(c, comp, 50, 7, true).closed === 0).length;
  const k50 = kept(50), k55 = kept(55), k60 = kept(60), k70 = kept(70);
  check('composure 50 buys nothing, 70 always buys the cycle', k50 === 0 && k70 === 200, { k50, k70 });
  check('composure 60 buys the extra cycle about half the time (70-130 of 200), 55 about a quarter (25-75)', k60 >= 70 && k60 <= 130 && k55 >= 25 && k55 <= 75 && k60 - k55 >= 25 /* the two bands touch at 70-75: the gap is what tells them apart */, { k55, k60 });
  // one cycle short of the bar (prev 6 -> 7): composure 30 always closes early, 50 never, 40 about half the time
  const early = comp => cycles.filter(c => at(c, comp, 50, 6, true).closed === 1).length;
  const e50 = early(50), e40 = early(40), e30 = early(30);
  check('composure 30 always costs a cycle, 50 never, 40 about half the time (70-130 of 200)', e30 === 200 && e50 === 0 && e40 >= 70 && e40 <= 130, { e30, e40, e50 });
  check('the same business in the same Cycle gets the same answer twice', [0, 1, 2].every(k => at(200 + k, 60, 50, 7, true).closed === at(200 + k, 60, 50, 7, true).closed));
  // drive: the share of the expand multiplier (x1.25): none at 70, half at 80, all at 90
  const g = drive => { const ctx = fixture([person('POP-99001', 'Alpha', drive, 50)], 'POP-99001 (Synthetic Alpha, Owner)', false); w.applyBusinessDynamics_(ctx); return ctx.writes.find(x => x.tab === 'Business_Ledger' && x.row === 2 && x.col === 6).values[0][1]; };
  const g50 = g(50), g70 = g(70), g80 = g(80), g90 = g(90);
  check('drive 70 expands nothing, 80 half as much as 90', g70 === g50 && g80 > g70 && g90 > g80 && Math.abs((g80 - g70) - (g90 - g70) / 2) < 0.011 /* growth is stored to two places */, { g50, g70, g80, g90 });
}
// engine.242b (2026-09-19): per-hood business momentum. Child areas fold to their parent; 'City-wide'
// and unmapped labels carry none; no canon seed → no momentum (never raw labels); a closure takes its
// revenue share; the writer factor is growth vs the city's median hood growth, bounded 0.88–1.12.
{
  const cfgBase = fixture([], '').config;
  const rows = [['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', 'Annual_Revenue', 'Growth_Rate', 'Key_Personnel'],
    ['BIZ-A', 'A', 'Retail', 'Parent Hood', 5, 1000, 10, ''],
    ['BIZ-B', 'B', 'Retail', 'Child Area', 5, 1000, 20, ''],
    ['BIZ-C', 'C', 'Retail', 'City-wide', 5, 1000, 40, ''],
    ['BIZ-D', 'D', 'Retail', 'Other Hood', 5, 2000, 2, '']];
  const mk = canon => ({ config: cfgBase, now: 'C200', writes: [], rng() { return 0.5; },
    ledger: { headers: H.slice(), rows: [], dirty: false },
    summary: { cycleId: 200, neighborhoodState: {}, previousCycleState: { businessDynamics: {} },
      canonHoods: canon ? { list: ['Parent Hood', 'Other Hood'] } : undefined },
    ss: { getSheetByName: tab => tab === 'Business_Ledger' ? { getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }) } : null } });
  w.resolveHoodOrChild_ = (ctx, h) => ({ 'parent hood': 'Parent Hood', 'child area': 'Parent Hood', 'other hood': 'Other Hood' })[String(h).toLowerCase()] || null;
  const ctx = mk(true);
  w.applyBusinessDynamics_(ctx);
  const m = ctx.summary.hoodBusinessMomentum;
  check('242b child area folds into its parent (2 businesses on Parent Hood)', m['Parent Hood'] && m['Parent Hood'].businesses === 2, m);
  check('242b City-wide / unmapped labels carry no momentum key', !m['City-wide'] && !m['Child Area'] && Object.keys(m).length === 2, Object.keys(m));
  check('242b Parent Hood growth is revenue-weighted over its open businesses (≈15)', Math.abs(m['Parent Hood'].growth - 15) < 1.5, m['Parent Hood']);
  const noCanon = mk(false); w.applyBusinessDynamics_(noCanon);
  check('242b no canon seed → no momentum at all (never raw labels)', Object.keys(noCanon.summary.hoodBusinessMomentum).length === 0, noCanon.summary.hoodBusinessMomentum);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'phase08-v3-chicago/v3NeighborhoodWriter.js'), 'utf8'), w, { filename: 'v3NeighborhoodWriter.js' });
  const S = { hoodBusinessMomentum: { X: { growth: 40, closedShare: 0 }, Y: { growth: 0, closedShare: 0.8 }, Z: { growth: 5, closedShare: 0 } } };
  const med = w.hoodBusinessCity_(S);
  check('242b writer: a hood far above the city median growth is capped at 1.12', Math.abs(w.hoodBusinessFactor_('X', S, med) - 1.12) < 1e-9, w.hoodBusinessFactor_('X', S, med));
  check('242b writer: a closure takes its share, capped at half the street', Math.abs(w.hoodBusinessFactor_('Y', S, med) - 0.95 * 0.5) < 1e-9, w.hoodBusinessFactor_('Y', S, med));
  check('242b writer: the median hood reads 1.0; a hood with no momentum reads 1.0', w.hoodBusinessFactor_('Z', S, med) === 1 && w.hoodBusinessFactor_('Q', S, med) === 1);
}

// engine.214 8a Cut C: S.hoodSpots — open food / retail rows by parent hood, each with this Cycle's facts;
// arts (newsrooms), blank names, City-wide, wind-down and closing-now rows offer no spot; the chaos map takes
// only this Cycle's business-scope outcomes of the four that close or damage a place; published only when
// the phase completes.
{
  const cfgBase = fixture([], '').config;
  const rows = [['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', 'Annual_Revenue', 'Growth_Rate', 'Key_Personnel'],
    ['BIZ-F1', 'Taco Spot', 'Restaurant & Dining', 'Parent Hood', 6, 100000, -20, ''],
    ['BIZ-R1', 'Corner Shop', 'Retail', 'Child Area', 4, 100000, 10, ''],
    ['BIZ-M1', 'Bay News', 'Media & Journalism', 'Parent Hood', 20, 100000, 5, ''],
    ['BIZ-N1', '', 'Retail', 'Parent Hood', 3, 100000, 5, ''],
    ['BIZ-W1', 'Wind Down Cafe', 'Cafe / dining', 'Parent Hood', 2, 100000, -30, ''],
    ['BIZ-X1', 'Closing Diner', 'Restaurant & Dining', 'Parent Hood', 5, 10, -20, ''],
    ['BIZ-C1', 'City Cafe', 'Cafe / dining', 'City-wide', 5, 100000, 5, ''],
    ['BIZ-T1', 'Tech Co', 'Tech', 'Parent Hood', 5, 100000, 5, '']];
  const chaos = [
    { targetScope: 'business', targetId: 'BIZ-F1', cycleId: 200, diceOutcome: 'minor_fire' },
    { targetScope: 'business', targetId: 'BIZ-F1', cycleId: 200, diceOutcome: 'minor_fire' },   // a second fire the same week: one line
    { targetScope: 'business', targetId: 'BIZ-F1', cycleId: 199, diceOutcome: 'major_blaze_contained' },
    { targetScope: 'port', targetId: 'BIZ-F1', cycleId: 200, diceOutcome: 'forced_temporary_closure' },
    { targetScope: 'business', targetId: 'BIZ-R1', cycleId: 200, diceOutcome: 'missed_pickup' },
    { targetScope: 'business', targetId: 'BIZ-R1', cycleId: '200', diceOutcome: 'transformer_blowout' }];
  const mk = () => ({ config: cfgBase, now: 'C200', writes: [], rng() { return 0.5; },
    ledger: { headers: H.slice(), rows: [], dirty: false },
    summary: { cycleId: 200, neighborhoodState: {}, chaosCarsEvents: chaos, sportsWeek: { Oaks: { g: 1 } },
      previousCycleState: { businessDynamics: { 'BIZ-F1': [5, 0, 0], 'BIZ-R1': [3, 0, 0], 'BIZ-W1': [9, 0, 190], 'BIZ-X1': [8, 0, 0] } },
      canonHoods: { list: ['Parent Hood'] } },
    ss: { getSheetByName: tab => tab === 'Business_Ledger' ? { getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }) } : null } });
  w.resolveHoodOrChild_ = (ctx, h) => ({ 'parent hood': 'Parent Hood', 'child area': 'Parent Hood' })[String(h).toLowerCase()] || null;
  w.sportsBarTerm_ = () => 1.5;   // a won game week reaching every bar (utilities/sportsWeekRecord.js is not loaded here)
  const ctx = mk();
  w.applyBusinessDynamics_(ctx);
  const hs = ctx.summary.hoodSpots, list = (hs && hs['Parent Hood']) || [];
  const by = Object.fromEntries(list.map(s => [s.id, s]));
  check('Cut C: only open food / retail rows with a name on a canon hood are spots (child area folds to its parent)',
    Object.keys(hs).join() === 'Parent Hood' && list.map(s => s.id).sort().join() === 'BIZ-F1,BIZ-R1', hs);
  const f1 = by['BIZ-F1'] || {}, r1 = by['BIZ-R1'] || {};
  check('Cut C: a declining food spot carries its streak, last Cycle\'s streak, the staff it shed and the game-week lift',
    f1.name === 'Taco Spot' && f1.cls === 'food' && f1.streak === 6 && f1.prevStreak === 5 && f1.shed === 2 && f1.lift === true, f1);
  check('Cut C: a recovered retail spot reads streak 0 after 3, no shed, no lift (retail never lifts)',
    r1.cls === 'retail' && r1.streak === 0 && r1.prevStreak === 3 && r1.shed === 0 && r1.lift === false, r1);
  check('Cut C: chaos = this Cycle\'s business-scope outcomes of the four, one per kind (a repeat fire, stale Cycle, port scope, missed_pickup out; a string Cycle stamp counts)',
    JSON.stringify(f1.chaos) === '["minor_fire"]' && JSON.stringify(r1.chaos) === '["transformer_blowout"]', { f1: f1.chaos, r1: r1.chaos });
  const empty = mk(); empty.ss = { getSheetByName: tab => tab === 'Business_Ledger' ? { getDataRange: () => ({ getValues: () => [rows[0]] }) } : null };
  w.applyBusinessDynamics_(empty);
  check('Cut C: an empty Business_Ledger publishes an empty map', JSON.stringify(empty.summary.hoodSpots) === '{}', empty.summary.hoodSpots);
  const qri = w.queueRangeIntent_, broken = mk();
  w.queueRangeIntent_ = () => { throw new Error('queue failed'); };
  let threw = false; try { w.applyBusinessDynamics_(broken); } catch (e) { threw = true; }
  w.queueRangeIntent_ = qri;
  check('Cut C: a throw after the loop leaves S.hoodSpots unpublished (the citizen pool then offers nothing)', threw && broken.summary.hoodSpots === undefined, broken.summary.hoodSpots);
  const realLog = w.Logger.log, lastStep = mk();
  w.Logger.log = (m) => { if (String(m).indexOf('applyBusinessDynamics_ engine.96:') === 0) throw new Error('log failed'); };
  let threwLast = false; try { w.applyBusinessDynamics_(lastStep); } catch (e) { threwLast = true; }
  w.Logger.log = realLog;
  check('Cut C: a throw at the phase\'s final log still leaves S.hoodSpots unpublished (publication is the last step)', threwLast && lastStep.summary.hoodSpots === undefined, lastStep.summary.hoodSpots);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
