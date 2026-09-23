#!/usr/bin/env node
'use strict';
/**
 * 2026-09-23 (kimi, Mike-direct) — the home SALE mechanics: an owned household
 * dissolved by the stress engine sells the home (proceeds mirror the purchase
 * economics back to member NetWorth, [Home] lines, HOME_SALE hook,
 * S.homesSoldByLine) instead of the value evaporating; Step 7 decrements
 * HomesOwned the same cycle. Synthetic rows only, no network.
 */
const fs = require('fs');
const path = require('path');

global.Logger = { log() {} };
global.parseJSON = (v, fb) => { try { const p = JSON.parse(v); return p === null ? fb : p; } catch (e) { return fb; } };
global.inWorldStamp_ = () => 'Y3C1';
global.safeRand_ = (ctx) => ctx.rng || (() => 0.5);
global.recordRipple_ = () => {};
let rippleCalls = [];
global.recordHookRipple_ = (ctx, cls, hook, src) => { rippleCalls.push({ cls, hook, src }); };
global.queueAppendIntent_ = () => {};
global.queueCellIntent_ = () => {};
global.requireTab_ = (ss, n) => ss.getSheetByName(n);
global.logEngineError_ = () => {};
global.ECONOMIC_PARAMETERS = [];

const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
const CAL = read('../phase01-config/advanceSimulationCalendar.js');
const SRC = [
  '../phase02-world-state/loadNeighborhoodState.js',
  '../phase05-citizens/generationalWealthEngine.js',
  '../phase05-citizens/householdFormationEngine.js',
].map(read).join('\n');
const E = new Function(CAL + '\n' + SRC + '\nreturn { sellHouseholdHome_, dissolveStressedHouseholds_, updateHeritage_, HOME_PRICE_TO_RENT, HOME_DOWN };')();

let passed = 0, failed = 0;
const ok = (label, cond, detail) => { if (cond) { console.log('  ok  ' + label); passed++; } else { console.error('  FAIL ' + label + (detail ? ': ' + detail : '')); failed++; } };

function mockSheet(values) {
  return {
    _values: values,
    getDataRange() { return { getValues: () => values.map(r => r.slice()) }; },
    getLastColumn() { return values[0].length; },
    getLastRow() { return values.length; },
    getRange(row, col, nr, nc) {
      nr = nr || 1; nc = nc || 1;
      return {
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (values[row - 1 + i] || [])[col - 1 + j] ?? '')),
        getValue: () => (values[row - 1] || [])[col - 1] ?? '',
        setValue: (v) => { while (values.length < row) values.push([]); values[row - 1][col - 1] = v; },
        setValues: (vals) => { for (let i = 0; i < nr; i++) { while (values.length < row + i) values.push([]); for (let j = 0; j < nc; j++) values[row - 1 + i][col - 1 + j] = vals[i][j]; } },
      };
    },
  };
}

const HH_HEAD = ['HouseholdId', 'HeadOfHousehold', 'HouseholdType', 'Members', 'Neighborhood', 'HousingType', 'MonthlyRent', 'HousingCost', 'HouseholdIncome', 'FormedCycle', 'DissolvedCycle', 'Status', 'HouseholdSavings'];
const SL_HEAD = ['POPID', 'First', 'Last', 'Status', 'BirthYear', 'NetWorth', 'LifeHistory', 'HouseholdId', 'LineageId'];
const col = (h, n) => h.indexOf(n);

function mkCtx(hhRows, slRows, medianRent) {
  const sheets = { Household_Ledger: mockSheet([HH_HEAD.slice()].concat(hhRows)) };
  return {
    ss: { getSheetByName: (n) => sheets[n] || null }, _sheets: sheets,
    ledger: { headers: SL_HEAD.slice(), rows: slRows, dirty: false },
    summary: { cycleId: 109, storyHooks: [], neighborhoodState: { Testhood: { medianRent: medianRent } } },
    config: { cycleCount: 109 }, rng: () => 0.0, now: 't',
  };
}
const person = (popid, nw, by, line) => [popid, 'F' + popid, 'L' + popid, 'active', by || 1990, nw, 'Y2C1 — born', 'HH-S1', line || ''];
const ownedRow = ['HH-S1', 'POP-A', 'family', '["POP-A","POP-B"]', 'Testhood', 'owned', 1867, 400000, 100000, 101, '', 'active', 0];

// ---- rising market: proceeds back proportional to NetWorth ----
{
  rippleCalls = [];
  const ctx = mkCtx([ownedRow.map(x => x)], [person('POP-A', 100000, 1990, 'LIN-00001'), person('POP-B', 300000, 1992, 'LIN-00001')], 2000);
  const price = 2000 * 12 * E.HOME_PRICE_TO_RENT;             // 528,000
  const proceeds = price - 400000 * (1 - E.HOME_DOWN);        // 208,000
  const stressed = [{ household: { rowIndex: 2, householdId: 'HH-S1', housingType: 'owned', housingCost: 400000, neighborhood: 'Testhood', members: ['POP-A', 'POP-B'], monthlyRent: 1867, householdIncome: 100000, householdSavings: 0 }, severity: 'crisis', rentBurden: 0.6 }];
  const out = E.dissolveStressedHouseholds_(ctx, stressed, 109, () => 0.0);
  const v = ctx._sheets.Household_Ledger._values;
  ok('row dissolved with cycle and emptied members', v[1][col(HH_HEAD, 'Status')] === 'dissolved' && v[1][col(HH_HEAD, 'DissolvedCycle')] === 109 && v[1][col(HH_HEAD, 'Members')] === '[]');
  ok('members released from the SL household', ctx.ledger.rows[0][col(SL_HEAD, 'HouseholdId')] === '' && ctx.ledger.rows[1][col(SL_HEAD, 'HouseholdId')] === '');
  ok('proceeds back proportional to NetWorth (52,000 / 156,000 of 208,000)', ctx.ledger.rows[0][col(SL_HEAD, 'NetWorth')] === 152000 && ctx.ledger.rows[1][col(SL_HEAD, 'NetWorth')] === 456000,
    ctx.ledger.rows[0][col(SL_HEAD, 'NetWorth')] + ' / ' + ctx.ledger.rows[1][col(SL_HEAD, 'NetWorth')]);
  ok('[Home] sale line on both adults with each share', /\[Home\] sold the place in Testhood — \$52000 back from the sale/.test(ctx.ledger.rows[0][col(SL_HEAD, 'LifeHistory')]) && /\$156000 back from the sale/.test(ctx.ledger.rows[1][col(SL_HEAD, 'LifeHistory')]), ctx.ledger.rows[0][col(SL_HEAD, 'LifeHistory')]);
  ok('HOME_SALE hook with price and proceeds', ctx.summary.storyHooks.some(h => h.hookType === 'HOME_SALE' && /528000/.test(h.description) && /208000 back/.test(h.description)), JSON.stringify(ctx.summary.storyHooks));
  ok('hook reached the ripple recorder', rippleCalls.some(c => c.hook.hookType === 'HOME_SALE' && c.src === 'generationalWealthEngine'));
  ok('homesSoldByLine published once for the line', ctx.summary.homesSoldByLine && ctx.summary.homesSoldByLine['LIN-00001'] === 1, JSON.stringify(ctx.summary.homesSoldByLine));
  ok('one household dissolved', out.length === 1 && ctx.ledger.dirty === true);
}

// ---- falling market: the mortgage takes it all (doctrine §3) ----
{
  const ctx = mkCtx([ownedRow.map(x => x)], [person('POP-A', 100000)], 1000); // price 264,000 < 320,000 financed
  const stressed = [{ household: { rowIndex: 2, householdId: 'HH-S1', housingType: 'owned', housingCost: 400000, neighborhood: 'Testhood', members: ['POP-A'], monthlyRent: 1867, householdIncome: 100000, householdSavings: 0 }, severity: 'crisis', rentBurden: 0.6 }];
  E.dissolveStressedHouseholds_(ctx, stressed, 109, () => 0.0);
  ok('no proceeds when the market falls under the financed share', ctx.ledger.rows[0][col(SL_HEAD, 'NetWorth')] === 100000);
  ok('the line says the sale only cleared the mortgage', /the sale only cleared the mortgage/.test(ctx.ledger.rows[0][col(SL_HEAD, 'LifeHistory')]));
  ok('hook says the mortgage took it all', ctx.summary.storyHooks.some(h => h.hookType === 'HOME_SALE' && /the mortgage took it all/.test(h.description)));
}

// ---- rented dissolution: no sale mechanics ----
{
  const ctx = mkCtx([['HH-R1', 'POP-A', 'family', '["POP-A"]', 'Testhood', 'rented', 3625, 0, 80000, 101, '', 'active', 0]], [person('POP-A', 100000)], 2000);
  const stressed = [{ household: { rowIndex: 2, householdId: 'HH-R1', housingType: 'rented', housingCost: 0, neighborhood: 'Testhood', members: ['POP-A'], monthlyRent: 3625, householdIncome: 80000, householdSavings: 0 }, severity: 'crisis', rentBurden: 0.55 }];
  E.dissolveStressedHouseholds_(ctx, stressed, 109, () => 0.0);
  ok('a rented row dissolves with no sale: NetWorth untouched, no hook, no line', ctx.ledger.rows[0][col(SL_HEAD, 'NetWorth')] === 100000 &&
    !ctx.summary.storyHooks.some(h => h.hookType === 'HOME_SALE') && !/\[Home\] sold/.test(ctx.ledger.rows[0][col(SL_HEAD, 'LifeHistory')]));
}

// ---- minors share the money, not the sentence ----
{
  const ctx = mkCtx([ownedRow.map(x => x)], [person('POP-A', 100000, 1990), person('POP-B', 300000, 2031)], 2000);
  const stressed = [{ household: { rowIndex: 2, householdId: 'HH-S1', housingType: 'owned', housingCost: 400000, neighborhood: 'Testhood', members: ['POP-A', 'POP-B'], monthlyRent: 1867, householdIncome: 100000, householdSavings: 0 }, severity: 'crisis', rentBurden: 0.6 }];
  E.dissolveStressedHouseholds_(ctx, stressed, 109, () => 0.0);
  ok('minor gets the money', ctx.ledger.rows[1][col(SL_HEAD, 'NetWorth')] === 456000, String(ctx.ledger.rows[1][col(SL_HEAD, 'NetWorth')]));
  ok('minor does not get the [Home] sentence', !/\[Home\] sold/.test(ctx.ledger.rows[1][col(SL_HEAD, 'LifeHistory')]));
  ok('adult gets the sentence', /\[Home\] sold the place in Testhood/.test(ctx.ledger.rows[0][col(SL_HEAD, 'LifeHistory')]));
}

// ---- Step 7 decrements HomesOwned the same cycle ----
{
  const HDR = SL_HEAD.concat(['Tier', 'UsageCount', 'CIV (y/n)']);
  const HL_HDR = ['LineageId', 'FamilyName', 'FounderPopId', 'FoundedCycle', 'FoundedDoor', 'Generations', 'LivingMembers', 'MembersList', 'HeritageScore', 'HeritageTier', 'TotalNetWorth', 'HomesOwned', 'BusinessesOwned', 'CivicMembers', 'FameMembers', 'LastUpdated'];
  const member = person('POP-A', 1000000, 1990, 'LIN-00001').concat([4, 0, '']);
  member[col(SL_HEAD, 'HouseholdId')] = '';
  const sheets = {
    Household_Ledger: mockSheet([HH_HEAD.slice()]),
    Heritage_Ledger: mockSheet([HL_HDR.slice(), ['LIN-00001', 'Testline', 'POP-A', 100, 'B', 1, 1, '["POP-A"]', 10, 'Founding', 1000000, 2, '[]', 0, 0, 108]]),
    Family_Relationships: mockSheet([['RelationshipId', 'Citizen1', 'Citizen2', 'RelationshipType', 'SinceCycle', 'Status']]),
  };
  const ctx = { ss: { getSheetByName: (n) => sheets[n] || null }, ledger: { headers: HDR.slice(), rows: [member], dirty: false },
    summary: { cycleId: 109, storyHooks: [], homesSoldByLine: { 'LIN-00001': 1 } }, config: { cycleCount: 109 }, rng: () => 0.99, now: 'Y3C109' };
  E.updateHeritage_(ctx.ss, ctx, 109);
  const hl = sheets.Heritage_Ledger._values[1];
  ok('HomesOwned decrements with the sale (2 − 1 = 1)', Number(hl[HL_HDR.indexOf('HomesOwned')]) === 1, String(hl[HL_HDR.indexOf('HomesOwned')]));
}

console.log('homeSale.test.js: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
