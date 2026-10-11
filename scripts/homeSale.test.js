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
let engineErrors = [];
global.logEngineError_ = (ctx, phase, err) => { engineErrors.push(phase + ': ' + (err && err.message)); };
global.ECONOMIC_PARAMETERS = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/economic_parameters.json'), 'utf8')); // engine.199: live reads the tab

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

// ---- a seeded home (no purchase price): status rung, not a windfall (builder 2026-09-24) ----
{
  const seeded = ownedRow.map(x => x); seeded[col(HH_HEAD, 'HousingCost')] = 0;
  const ctx = mkCtx([seeded], [person('POP-A', 100000)], 2000);
  const price = 2000 * 12 * E.HOME_PRICE_TO_RENT;              // 528,000
  const stressed = [{ household: { rowIndex: 2, householdId: 'HH-S1', housingType: 'owned', housingCost: 0, neighborhood: 'Testhood', members: ['POP-A'], monthlyRent: 1867, householdIncome: 100000, householdSavings: 0 }, severity: 'crisis', rentBurden: 0.6 }];
  E.dissolveStressedHouseholds_(ctx, stressed, 109, () => 0.0);
  const nw = ctx.ledger.rows[0][col(SL_HEAD, 'NetWorth')];
  ok('seeded home returns the down share only (100,000 + 105,600), never the full price', nw === 100000 + Math.round(price * E.HOME_DOWN), String(nw));
}


// ---- engine.286 Task 2: the home die (builder rulings 2026-10-11) — synthetic rows only ----
{
  const SRC2 = [
    '../phase02-world-state/loadNeighborhoodState.js',
    '../phase05-citizens/runCivicRoleEngine.js',
    '../phase05-citizens/generationalWealthEngine.js',
    '../phase05-citizens/migrationTrackingEngine.js',
    '../phase05-citizens/processAdvancementIntake.js', // tierPayFactor_ — the rung is the aura
  ].map(read).join('\n');
  const D = new Function(CAL + '\n' + SRC2 + '\nreturn { trackHomeOwnership_ };')();
  const LIFE = { lifeEventFireChance: 0.05, lifeEventUpChance: 0.6, lifeEventPremiseLean: 0.2, lifeEventMediumOdds: 0.08,
    lifeEventLargeOdds: 0.01, lifeEventLiftCycles: 2, lifeEventPromotionLift: 1.5, lifeEventPromotionDrop: 0.5,
    lifeEventPromotionOwnChance: 0.05, lifeEventHomeRollBoost: 3, lifeEventHomeCarryBar: 0.5, homeLossChance: 0.00625,
    debtLineMultiple: 1, debtRiseRate: 0.02, debtFallRate: 0.08, debtDragCapShare: 0.5, debtDefaultCycles: 12, debtDefaultMarkCycles: 52 };
  const DH = SL_HEAD.concat(['Tier', 'DialState']);
  const who = (popid, nw, tier) => person(popid, nw, 1990, '').concat([tier || 4, '{"base":{}}']);
  const run = (hhRow, members, seq, extra) => {
    let i = 0, calls = 0;
    const sheets = { Household_Ledger: mockSheet([HH_HEAD.slice(), hhRow]) };
    const ctx = { ss: { getSheetByName: (n) => sheets[n] || null }, ledger: { headers: DH.slice(), rows: members, dirty: false },
      summary: { cycleId: 109, storyHooks: [], neighborhoodState: { Testhood: { medianRent: 2000 } }, contentLedger: { lines: {} } },
      config: Object.assign({ cycleCount: 109 }, LIFE, extra || {}), now: 't',
      rng: () => { calls++; return i < seq.length ? seq[i++] : 0.999; } };
    D.trackHomeOwnership_(ctx.ss, ctx, 109);
    return { ctx, hh: sheets.Household_Ledger._values[1], calls, die: ctx.summary.lifeEventDice.home };
  };
  const rented = (nw) => ['HH-D1', 'POP-D', 'family', '["POP-D"]', 'Testhood', 'rented', 1500, 0, 150000, 101, '', 'active', 0];
  const lastLine = (r) => String(r[col(SL_HEAD, 'LifeHistory')]).split('\n').pop();

  // L up: the purchase fires now, one line carries the graded tag and the money
  {
    const r = run(rented(), [who('POP-D', 300000)], [0.0, 0.0, 0.0, 0.0]);
    ok('home die L up: the household buys this Cycle (roll skipped, gates held)', r.hh[col(HH_HEAD, 'HousingType')] === 'owned' && r.die.bought === 1, String(r.hh[col(HH_HEAD, 'HousingType')]));
    ok('home die L up: one [LifeEvent-Home-Up-L] line with the down payment', /\[LifeEvent-Home-Up-L\] Closed on a place in Testhood — \$105600 down on \$528000$/.test(lastLine(r.ctx.ledger.rows[0])) && !/\[Home\]/.test(r.ctx.ledger.rows[0][col(SL_HEAD, 'LifeHistory')]), lastLine(r.ctx.ledger.rows[0]));
  }
  // M down: this Cycle's roll is zeroed — a roll of 0.0 that would have bought does not
  {
    const r = run(rented(), [who('POP-D', 300000)], [0.0, 0.99, 0.05, 0.0, 0.0]);
    ok('home die M down: the roll is zeroed, no purchase', r.hh[col(HH_HEAD, 'HousingType')] === 'rented' && r.die.zeroed === 1);
    ok('home die M down: the setback line', /\[LifeEvent-Home-Down-M\]/.test(lastLine(r.ctx.ledger.rows[0])));
  }
  // M up: the roll multiplies — 0.025 misses the plain 1% but lands under 3%
  {
    const plain = run(rented(), [who('POP-D', 300000)], [0.9, 0.025]);
    const boosted = run(rented(), [who('POP-D', 300000)], [0.0, 0.0, 0.05, 0.0, 0.025]);
    ok('home die M up: same roll, plain misses, boosted buys', plain.hh[col(HH_HEAD, 'HousingType')] === 'rented' && boosted.hh[col(HH_HEAD, 'HousingType')] === 'owned' && boosted.die.boosted === 1);
  }
  // Acceptance 1: identical forced rolls, different citizens, different band (the rung is aura)
  {
    const t4 = run(rented(), [who('POP-D', 300000, 4)], [0.0, 0.0, 0.012, 0.0, 0.999]);
    const t1 = run(rented(), [who('POP-D', 300000, 1)], [0.0, 0.0, 0.012, 0.0]);
    ok('paired: a Tier-4 draw at 0.012 is medium, a Tier-1 draw at 0.012 is large (and buys)', t4.die.M === 1 && t4.die.L === 0 && t1.die.L === 1 && t1.hh[col(HH_HEAD, 'HousingType')] === 'owned', JSON.stringify([t4.die, t1.die]));
  }
  // The gate shut: no die draw at all
  {
    const r = run(rented(), [who('POP-D', 300000)], [0.5], { lifeEventFireChance: 0 });
    ok('home die off at a zero gate: only the purchase roll draws', r.calls === 1 && r.die.fired === 0, String(r.calls));
  }
  // Forced sale: an owner over half of income on the house; homeLossChance lands
  {
    const owned = ['HH-D2', 'POP-E', 'family', '["POP-E","POP-F"]', 'Testhood', 'owned', 6000, 400000, 100000, 101, '', 'active', 0];
    const r = run(owned, [who('POP-E', 100000), who('POP-F', 300000)], [0.0, 0.0]);
    ok('forced sale: household rents in its own hood at the market rent, cost cleared', r.hh[col(HH_HEAD, 'HousingType')] === 'rented' && r.hh[col(HH_HEAD, 'MonthlyRent')] === 2000 && r.hh[col(HH_HEAD, 'HousingCost')] === 0 && r.hh[col(HH_HEAD, 'Neighborhood')] === 'Testhood', JSON.stringify(r.hh));
    ok('forced sale: proceeds (528,000 − 320,000) split by NetWorth share', r.ctx.ledger.rows[0][col(SL_HEAD, 'NetWorth')] === 152000 && r.ctx.ledger.rows[1][col(SL_HEAD, 'NetWorth')] === 456000);
    ok('forced sale: one [LifeEvent-Home-Down-L] line per adult with their share, no [Home] line', /\[LifeEvent-Home-Down-L\] Had to sell the house in Testhood and rent on the same streets — \$52000 back from the sale$/.test(lastLine(r.ctx.ledger.rows[0])) && !/\[Home\]/.test(r.ctx.ledger.rows[0][col(SL_HEAD, 'LifeHistory')]), lastLine(r.ctx.ledger.rows[0]));
    ok('forced sale counted', r.die.sold === 1 && r.die.atRisk === 1);
  }
  // An owner inside the carry bar is not at risk: no draw
  {
    const owned = ['HH-D3', 'POP-E', 'family', '["POP-E"]', 'Testhood', 'owned', 1867, 400000, 100000, 101, '', 'active', 0];
    const r = run(owned, [who('POP-E', 100000)], []);
    ok('owner at 22% of income: no risk, no draw', r.calls === 0 && r.die.atRisk === 0 && r.hh[col(HH_HEAD, 'HousingType')] === 'owned', String(r.calls));
  }
  // At risk, the sale chance misses: one draw, no weekly line (codex F5 — no owner premise / M writer)
  {
    const owned = ['HH-D4', 'POP-E', 'family', '["POP-E"]', 'Testhood', 'owned', 6000, 400000, 100000, 101, '', 'active', 0];
    const r = run(owned, [who('POP-E', 100000)], [0.5]);
    ok('at risk, no sale: one draw, no line, the house stays', r.calls === 1 && r.die.fired === 0 && r.hh[col(HH_HEAD, 'HousingType')] === 'owned' && lastLine(r.ctx.ledger.rows[0]) === 'Y2C1 — born', String(r.calls));
  }
  // codex F3: the forced sale publishes one HOME_SALE hook with the forced cause (not "broke up")
  {
    const owned = ['HH-D5', 'POP-E', 'family', '["POP-E"]', 'Testhood', 'owned', 6000, 400000, 100000, 101, '', 'active', 0];
    const r = run(owned, [who('POP-E', 100000)], [0.0, 0.0]);
    const hooks = r.ctx.summary.storyHooks.filter(h => h.hookType === 'HOME_SALE');
    ok('forced sale: exactly one HOME_SALE hook, forced cause, never the dissolution wording', hooks.length === 1 && /had to sell their home in Testhood — the payments outran the income/.test(hooks[0].description) && !/broke up/.test(hooks[0].description), JSON.stringify(r.ctx.summary.storyHooks));
  }
  // codex F1: the household row does not turn — no payout, no line, no hook, a visible error; the retry pays once
  {
    engineErrors = [];
    const owned = ['HH-D6', 'POP-E', 'family', '["POP-E"]', 'Testhood', 'owned', 6000, 400000, 100000, 101, '', 'active', 0];
    const members = [who('POP-E', 100000)];
    let i = 0; const seq = [0.0, 0.0];
    const sheets = { Household_Ledger: mockSheet([HH_HEAD.slice(), owned]) };
    const realRange = sheets.Household_Ledger.getRange.bind(sheets.Household_Ledger);
    let fail = true;
    sheets.Household_Ledger.getRange = (r0, c0, nr, nc) => { const g = realRange(r0, c0, nr, nc); if (fail && nr === 1 && nc > 1) g.setValues = () => { throw new Error('synthetic write failure'); }; return g; };
    const ctx = { ss: { getSheetByName: (n) => sheets[n] || null }, ledger: { headers: DH.slice(), rows: members, dirty: false },
      summary: { cycleId: 109, storyHooks: [], neighborhoodState: { Testhood: { medianRent: 2000 } }, contentLedger: { lines: {} } },
      config: Object.assign({ cycleCount: 109 }, LIFE), now: 't', rng: () => i < seq.length ? seq[i++] : 0.999 };
    D.trackHomeOwnership_(ctx.ss, ctx, 109);
    const hh = sheets.Household_Ledger._values[1];
    ok('F1 write fails: household stays owned, NetWorth untouched, no line, no hook, saleFailed + Engine_Errors',
      hh[col(HH_HEAD, 'HousingType')] === 'owned' && hh[col(HH_HEAD, 'MonthlyRent')] === 6000 && members[0][col(SL_HEAD, 'NetWorth')] === 100000 &&
      !/LifeEvent/.test(members[0][col(SL_HEAD, 'LifeHistory')]) && ctx.summary.storyHooks.length === 0 &&
      ctx.summary.lifeEventDice.home.saleFailed === 1 && engineErrors.some(e => /Phase5-HomeDie: forced sale of HH-D6 not written/.test(e)), JSON.stringify({ hh, engineErrors }));
    fail = false; i = 0; ctx.summary.lifeEventDice = null;
    D.trackHomeOwnership_(ctx.ss, ctx, 110);
    ok('F1 retry once the write works: one payout, not two', sheets.Household_Ledger._values[1][col(HH_HEAD, 'HousingType')] === 'rented' && members[0][col(SL_HEAD, 'NetWorth')] === 100000 + 208000, String(members[0][col(SL_HEAD, 'NetWorth')]));
  }
  // codex F6: missing / blank / non-numeric income is unknown, never stretched; a verified zero is
  {
    const mk = inc => ['HH-D7', 'POP-E', 'family', '["POP-E"]', 'Testhood', 'owned', 6000, 400000, inc, 101, '', 'active', 0];
    const blank = run(mk(''), [who('POP-E', 100000)], [0.0, 0.0]);
    const junk = run(mk('n/a'), [who('POP-E', 100000)], [0.0, 0.0]);
    const zero = run(mk(0), [who('POP-E', 100000)], [0.0, 0.0]);
    const healthy = run(mk(400000), [who('POP-E', 100000)], [0.0, 0.0]);
    ok('F6 blank and non-numeric income: unknown, not at risk, no draw', blank.die.atRisk === 0 && blank.die.incomeUnknown === 1 && blank.calls === 0 && junk.die.atRisk === 0 && junk.calls === 0);
    ok('F6 a verified zero income is stretched; a healthy income is not', zero.die.atRisk === 1 && zero.die.sold === 1 && healthy.die.atRisk === 0 && healthy.calls === 0);
  }
}

console.log('homeSale.test.js: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
