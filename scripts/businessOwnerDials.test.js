#!/usr/bin/env node
'use strict';
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
    bizNoiseBound: 0, bizVitalityNeutral: 50, bizVitalityGain: 0.1, bizSuccessWindow: 4,
    bizSuccessVitalityHigh: 80, bizSuccessApprovalHigh: 80, bizSuccessPenalty: 1,
    bizDisruptBaseChance: 0, bizDisruptSuccessMult: 1, bizDisruptShock: 1,
    bizClosureStreak: 8, bizClosureRevenueFloorPct: 25, bizEventShockScale: 1, bizInitiativeStallDrag: 0.5,
    bizDeclineStreak: 4, dialOwnerDriveExpandMult: 1.25, dialOwnerStreakRoom: 1
  };
  for (const sector of ['faith', 'retail', 'food', 'health', 'tech', 'professional', 'construction', 'arts', 'education', 'default']) config['bizVol_' + sector] = 1;
  const data = [['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', 'Annual_Revenue', 'Growth_Rate', 'Key_Personnel'],
    ['BIZ-SYNTHETIC-OWNER', 'Synthetic Owner Venture', 'Retail', 'Synthetic Hood', 6, declining ? 100 : 100000, declining ? -20 : 1, personnel]];
  return { config, now: 'C200', writes: [], rng() { throw new Error('Owner resolution must not draw from shared RNG'); },
    ledger: { headers: H.slice(), rows: rows.map(r => r.slice()), dirty: false },
    summary: { cycleId: 200, neighborhoodState: { 'Synthetic Hood': { retailVitality: declining ? 50 : 60 } },
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
  const bands = w.bizOwnerBands_(ctx, personnel);
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
  const ambiguous = w.bizOwnerBands_(ctx, 'Synthetic Alpha (Owner)');
  const exact = w.bizOwnerBands_(ctx, 'POP-99001 (Synthetic Alpha, Owner)');
  check('cached ambiguous-name lookup does not poison exact-ID lookup', ambiguous === null && exact.drive === 2 && exact.composure === 2, { ambiguous, exact });
  check('non-owner personnel remains outside the dial reader', w.bizOwnerBands_(fixture([a], ''), 'Synthetic Alpha (Manager)') === null);
  const missingDials = person('POP-99003', 'Gamma'); missingDials[3] = '';
  check('unique citizen without DialState supplies no bands', w.bizOwnerBands_(fixture([missingDials], ''), 'Synthetic Gamma (Owner)') === null);
}
{
  const rows = [person('POP-99001', 'Alpha', 10, 10)];
  const owned = fixture(rows, 'POP-99001 (Synthetic Alpha, Owner)', true), neutral = fixture(rows, '', true);
  owned.summary.previousCycleState.businessDynamics['BIZ-SYNTHETIC-OWNER'][0] = 6;
  neutral.summary.previousCycleState.businessDynamics['BIZ-SYNTHETIC-OWNER'][0] = 6;
  const low = w.applyBusinessDynamics_(owned), plain = w.applyBusinessDynamics_(neutral);
  check('verified low composure still closes a declining venture one Cycle earlier', low.closed === 1 && plain.closed === 0, { low: low.closed, neutral: plain.closed });
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

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
