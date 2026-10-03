/**
 * applyBusinessDynamics.test.js — engine.96 Task 9 (Task 5 scope). Node-only.
 * Run: node phase05-citizens/applyBusinessDynamics.test.js
 */
'use strict';
global.Logger = { log: () => {} };
// seedUnit_ lives in generationalWealthEngine.js (shared Apps Script scope) — same hash here
global.seedUnit_ = function (s) { var h = 2166136261; s = String(s || ''); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return (h % 10000) / 10000; };
let ranges = [], ensures = [];
global.queueEnsureTabIntent_ = (ctx, tab, headers, reason, domain, priority) => ensures.push({ tab, headers, priority });
global.queueRangeIntent_ = (ctx, tab, r, c, values, reason, domain, priority) => ranges.push({ tab, r, c, values, reason, domain, priority });
// pressureBar_ lives in utilities/citizenDialMap.js (shared Apps Script scope) — engine.178 owner dial gates read it
global.pressureBar_ = require('../utilities/citizenDialMap').pressureBar_;
const mod = require('./applyBusinessDynamics');
const fs = require('fs'), path = require('path');
let passed = 0, failed = 0;
function assert(label, cond, detail) { if (cond) { console.log(`  ok   ${label}`); passed++; } else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; } }

// the signed Task 3 table, as the self-arm seeds it
const CFG = { bizShipEchoShare: 0.15, bizDeclineStreak: 4, bizDriftMaxUp: 1.0, bizDriftMaxDown: 1.0, bizGrowthCeil: 40, bizGrowthFloor: -10, bizNoiseBound: 0.25, bizCoverageUnit: 0.1, bizVitalityGain: 0.15, bizSuccessWindow: 3, bizSuccessVitalityHigh: 9.0, bizSuccessApprovalHigh: 85, bizSuccessPenalty: 0.3, bizDisruptBaseChance: 2, bizDisruptSuccessMult: 3, bizDisruptShock: 2.0, bizClosureStreak: 8, bizClosureRevenueFloorPct: 40, bizEventShockScale: 1.0, bizVol_faith: 0.5, bizVol_retail: 1.2, bizVol_food: 1.3, bizVol_health: 0.7, bizVol_tech: 1.5, bizVol_professional: 0.8, bizVol_construction: 1.1, bizVol_arts: 1.2, bizVol_education: 0.6, bizVol_default: 1.0,
  bizInitiativeStallDrag: 0.5,   // engine.250, builder-ruled half weight
  bizSportsWeekPp: 2.0,          // engine.205 slice D
  // engine.178 owner dial gates, as ensureEngine178Config_ seeds them
  dialOwnerStreakRoom: 1, dialOwnerDriveExpandMult: 1.25 };
const BL_H = ['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', 'Avg_Salary', ' Annual_Revenue ', 'Growth_Rate ', 'Key_Personnel'];
const BL = [BL_H,
  ['BIZ-00001', 'Civis Systems', 'Civic Tech', 'West Oakland', 41, 230000, 60000000, '15%', 'Elias Varek (founder)'],
  ['BIZ-00002', 'Brie Bouquets', 'Retail & Food', 'Temescal', 5, 37000, 370000, 1, 'POP-00169 Brie Harris'],
  ['BIZ-00003', 'Firehouse 29', 'Education', 'West Oakland', 20, 76000, '', 1, ''],
  ['BIZ-00004', 'City Hall', 'Municipal Government', 'Downtown', 900, 90000, 230000000, 0, ''],
];
const CIV = [['OfficeId', 'Name', 'Approval'], ['MAYOR-01', 'Avery Santana', 95], ['COUNCIL-D1', 'X', 60]];
function ctxWith(o) {
  o = o || {};
  const bl = o.bl || BL.map(r => r.slice());
  return { config: Object.assign({ cycleCount: 110 }, o.cfg || CFG), summary: Object.assign({ cycleId: 110 }, o.S || {}),
    ss: { getSheetByName: (n) => n === 'Business_Ledger' ? { getDataRange: () => ({ getValues: () => bl }) } : n === 'Civic_Office_Ledger' ? { getDataRange: () => ({ getValues: () => o.civ || CIV }) } : null } };
}

console.log('parsing + classes');
assert('sector class: the 9 regex classes + default, retail before food', mod.bizSectorClass_('Retail & Food') === 'retail' && mod.bizSectorClass_('Civic Tech') === 'tech' && mod.bizSectorClass_('Cafe & Bakery') === 'food' && mod.bizSectorClass_('Municipal Government') === 'default' && mod.bizSectorClass_('Media & Journalism') === 'arts');
assert('growth parses whole percents, "15%", blank → 0', mod.bizParseGrowth_(15) === 15 && mod.bizParseGrowth_('15%') === 15 && mod.bizParseGrowth_('') === 0 && mod.bizParseGrowth_('x') === 0);
assert('revenue parses $ and commas; blank → null (no signal)', mod.bizParseRevenue_('$1,152,000') === 1152000 && mod.bizParseRevenue_('') === null);

console.log('config fail-loud');
{ let threw = ''; try { mod.bizDynamicsConfig_({ config: Object.assign({}, CFG, { bizVol_tech: '' }) }); } catch (e) { threw = e.message; } assert('a missing/blank key throws naming the key', /bizVol_tech/.test(threw), threw); }
assert('every required key present → numeric config', mod.bizDynamicsConfig_({ config: CFG }).bizVol_tech === 1.5);

console.log('the drift, one business');
{
  const biz = { id: 'BIZ-X', sector: 'Retail', hood: 'Temescal', growth: 2, revenue: 1000000 };
  const quiet = { chaosAtBusiness: false, chaosInHood: false, initiativeAdvanced: false, coverageDeviation: null, vitality: 6.0, vitalityMedian: 6.0, mayorApproval: 60 };
  const a = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, quiet, 110);
  const b = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, quiet, 110);
  assert('deterministic: same inputs, same output', JSON.stringify(a) === JSON.stringify(b));
  assert('quiet cycle at neutral vitality: only noise moves it, inside ±0.25×vol', Math.abs(a.drift) <= 0.25 * 1.2 + 1e-9 && a.parts.ev === 0 && a.parts.vit === 0 && a.parts.pressure === 0, JSON.stringify(a.parts));
  const hit = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, Object.assign({}, quiet, { chaosAtBusiness: -1, chaosInHood: -1, coverageDeviation: -0.1 }), 110);
  assert('events are the signal: chaos at the business + in the hood + bad press = −2.0 capped, drift clamped at −1.0', hit.parts.ev === -2.0 && hit.drift === -1.0 && hit.growth === 1.0 && hit.streak === 0, JSON.stringify(hit));
  const lift = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, Object.assign({}, quiet, { initiativeAdvanced: true, coverageDeviation: 0.2 }), 110);
  assert('an initiative landing + good press = +1.5 before vol, clamped +1.0', lift.parts.ev === 1.5 && lift.drift === 1.0);
  const v = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, Object.assign({}, quiet, { vitality: 9.27 }), 110);
  assert('vitality term: (9.27−6)×0.15 = 0.49, clamped ±0.5; a null vitality contributes 0', Math.abs(v.parts.vit - 0.4905) < 1e-9 && mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, Object.assign({}, quiet, { vitality: null }), 110).parts.vit === 0);
  const w1 = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 2 }, Object.assign({}, quiet, { vitality: 9.5, mayorApproval: 95 }), 110);
  const w0 = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 2 }, Object.assign({}, quiet, { vitality: 9.5, mayorApproval: 70 }), 110);
  assert('success pressure bites on the 3rd prosperous cycle (vitality ≥9 AND approval ≥85), resets when approval falls', w1.win === 3 && w1.parts.pressure === -0.3 && w0.win === 0 && w0.parts.pressure === 0);
  let hits = 0, hitsWin = 0; for (let c = 1; c <= 2000; c++) { if (mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, quiet, c).disrupted) hits++; if (mod.bizDriftOne_(CFG, biz, { streak: 0, win: 3 }, Object.assign({}, quiet, { vitality: 9.5, mayorApproval: 95 }), c).disrupted) hitsWin++; }
  assert('disruption is a seeded 2 % draw (≈40/2000), ×3 under the success window (≈120/2000)', hits > 20 && hits < 70 && hitsWin > 80 && hitsWin < 170, hits + ' / ' + hitsWin);
  const neg = mod.bizDriftOne_(CFG, { id: 'BIZ-N', sector: 'Retail', hood: 'T', growth: -0.5, revenue: 500000 }, { streak: 4, win: 0 }, quiet, 110);
  assert('distress streak counts consecutive negative-growth cycles; revenue follows growth/52', (neg.growth < 0 ? neg.streak === 5 : neg.streak === 0) && neg.revenue === Math.round(500000 * (1 + neg.growth / 100 / 52)));
  const fl = mod.bizDriftOne_(CFG, { id: 'BIZ-F', sector: 'Tech', hood: 'T', growth: -9.9, revenue: 1 }, { streak: 0, win: 0 }, Object.assign({}, quiet, { chaosAtBusiness: -1, chaosInHood: -1 }), 110);
  const ce = mod.bizDriftOne_(CFG, { id: 'BIZ-C', sector: 'Tech', hood: 'T', growth: 39.9, revenue: 1 }, { streak: 0, win: 0 }, Object.assign({}, quiet, { initiativeAdvanced: true, coverageDeviation: 0.1 }), 110);
  assert('floor −10 and ceiling 40 hold', fl.growth === -10 && ce.growth === 40);
  assert('blank revenue stays null (no signal) while growth still drifts', mod.bizDriftOne_(CFG, { id: 'BIZ-B', sector: 'Education', hood: 'T', growth: 1, revenue: null }, { streak: 0, win: 0 }, quiet, 110).revenue === null);
}

console.log('the pass over a ledger');
{
  ranges = [];
  const ctx = ctxWith({ S: { neighborhoodState: { Temescal: { retailVitality: 7.2 }, 'West Oakland': { retailVitality: 5.1 } }, chaosBusinessFold: { 'BIZ-00002': -1 }, initiativeNeighborhoodEffects: { Downtown: { traffic: 0.1 } }, editionSentimentBoost: 0.3, previousCycleState: { businessDynamics: { 'BIZ-00004': [2, 0] } } } });
  const out = mod.applyBusinessDynamics_(ctx);
  assert('4 rows walked; one range intent over Annual_Revenue..Growth_Rate (adjacent, trimmed headers), priority 90', out.rows === 4 && ranges.length === 1 && ranges[0].tab === 'Business_Ledger' && ranges[0].r === 2 && ranges[0].c === 7 && ranges[0].values.length === 4 && ranges[0].values[0].length === 2 && ranges[0].priority === 90, JSON.stringify(ranges.map(x => [x.r, x.c, x.values.length])));
  const vals = ranges[0].values;
  assert('"15%" is written back as a number; growth moved on every row', typeof vals[0][1] === 'number' && vals.every((v, i) => v[1] !== mod.bizParseGrowth_(BL[i + 1][7])), JSON.stringify(vals));
  assert('blank revenue row keeps its blank cell', vals[2][0] === '' && out.blankRevenue === 1);
  assert('chaos fold key BIZ-00002::col reads as chaos at that business (its growth fell)', vals[1][1] < 1, JSON.stringify(vals[1]));
  assert('state carries nonzero streak/window entries only; City Hall streak continues if it went negative', typeof ctx.summary.businessDynamicsState === 'object' && (vals[3][1] < 0 ? ctx.summary.businessDynamicsState['BIZ-00004'][0] === 3 : !ctx.summary.businessDynamicsState['BIZ-00004']));
  assert('mayor approval read from Civic_Office_Ledger (MAYOR-01 → 95)', /mayor 95/.test((() => { let s = ''; global.Logger = { log: (m) => { s += m; } }; mod.applyBusinessDynamics_(ctxWith({ S: {} })); global.Logger = { log: () => {} }; return s; })()));
  ranges = [];
  const split = BL.map(r => r.slice()); split.forEach(r => { const g = r[7]; r[7] = r[8]; r[8] = g; }); split[0][7] = 'Key_Personnel'; split[0][8] = 'Growth_Rate';
  mod.applyBusinessDynamics_(ctxWith({ bl: split }));
  assert('non-adjacent columns → two column intents', ranges.length === 2 && ranges[0].c === 7 && ranges[1].c === 9);
  let threw = ''; try { mod.applyBusinessDynamics_(ctxWith({ bl: [['BIZ_ID', 'Name'], ['BIZ-1', 'x']] })); } catch (e) { threw = e.message; }
  assert('missing columns throw (fail loud)', /missing one of/.test(threw), threw);
}

console.log('wiring');
{
  const orch = fs.readFileSync(path.join(__dirname, '..', 'phase01-config', 'godWorldEngine2.js'), 'utf8');
  const i1 = orch.indexOf("'Phase5-BusinessDynamics'"), i2 = orch.indexOf("'Phase5-Career'");
  assert('Phase5-BusinessDynamics runs before Phase5-Career at both entry points', (orch.match(/'Phase5-BusinessDynamics'/g) || []).length === 2 && i1 > 0 && i1 < i2 && orch.lastIndexOf("'Phase5-BusinessDynamics'") < orch.lastIndexOf("'Phase5-Career'"));
  assert('ensureEngine96Config_ self-arms beside 133/135', /ensureEngine135Config_\(ss\);[^\n]*\n\s*ensureEngine96Config_\(ss\);/.test(orch));
  const contract = fs.readFileSync(path.join(__dirname, '..', 'phase01-config', 'engine94SheetContract.js'), 'utf8');
  const seeded = (contract.match(/\['biz[A-Za-z_]+',/g) || []).map(s => s.slice(2, -2));
  assert('the 27 signed keys + bizDeclineStreak + bizInitiativeStallDrag (engine.250) + bizShipEchoShare (engine.193 3b) + bizSportsWeekPp (engine.205 D) + the 4 owner-door keys (Task 12) are seeded; the dynamics pass requires exactly its 31', seeded.length === 35 && mod.BIZ_DYNAMICS_REQUIRED_KEYS.length === 31 && mod.BIZ_DYNAMICS_REQUIRED_KEYS.every(k => seeded.includes(k)), JSON.stringify(seeded));
  const fin = fs.readFileSync(path.join(__dirname, '..', 'phase09-digest', 'finalizeCycleState.js'), 'utf8');
  assert('finalizeCycleState carries businessDynamics from S.businessDynamicsState', /businessDynamics: S\.businessDynamicsState \|\| \{\}/.test(fin));
  const gw = fs.readFileSync(path.join(__dirname, '..', 'phase05-citizens', 'generationalWealthEngine.js'), 'utf8');
  assert('heritage business mint seeds Growth_Rate from the class table in whole percents (the 0.03 and the 4× stake are gone)', /birth\.emp, birth\.sal, birth\.revenue, birth\.growth/.test(gw) && !/capital \* 4/.test(gw));
  assert('the heritage roll draws the field with one seeded unit and writes "(founder)" into Key_Personnel; the flavor table is retired', /heritageBusinessField_\(ctx, members, stakeRow, iTagsH, iRoleH, bizNbhd, rng\(\)\)/.test(gw) && /heritageBusinessBirth_\(fieldPick\.field, String\(hl\[hName\]\), stakeNW\)/.test(gw) && /\+ ' \(founder\)'\]/.test(gw) && !/HERITAGE_BIZ_SECTORS\[/.test(gw));
  const intake = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'processBusinessIntake.js'), 'utf8');
  assert('the intake script is born alive through economicSeedForSector and never runs on require', /economicSeedForSector\(\(entry\.Sector/.test(intake) && !/Growth_Rate: 'New'/.test(intake) && /if \(require\.main === module\)/.test(intake));
  delete global.skillTagField_; delete global.roleFieldOf_; delete global.sectorCategory_;
}
console.log('Task 6 — decline sheds; Task 7 — closure winds down, then archives');
{
  const ledger = (rows) => [BL_H].concat(rows);
  const quietS = { neighborhoodState: {}, chaosBusinessFold: {}, chaosNeighborhoodFold: {}, initiativeNeighborhoodEffects: {}, editionSentimentBoost: 0 };
  // a small retail shop deep in distress: growth −2, 6 staff, revenue $100K (< 40 % of retail's $380K median)
  const shop = ['BIZ-00200', 'Corner Shop', 'Retail', 'Temescal', 6, 40000, 100000, -2, 'POP-00001 Owner'];
  ranges = []; ensures = [];
  let ctx = ctxWith({ bl: ledger([shop]), S: Object.assign({}, quietS, { previousCycleState: { businessDynamics: { 'BIZ-00200': [5, 0] } } }) });
  let out = mod.applyBusinessDynamics_(ctx);
  const g6 = ranges[0].values[0][1];
  assert('Task 6: streak 6 (> D=4) sheds streak−D = 2 tracked-equivalents as S.businessDeclines', g6 < 0 && ctx.summary.businessDeclines['BIZ-00200'] === 2 && out.shed === 2 && out.closed === 0, JSON.stringify([g6, ctx.summary.businessDeclines]));
  ctx = ctxWith({ bl: ledger([['BIZ-00201', 'Tiny', 'Retail', 'Temescal', 1, 40000, 100000, -2, '']]), S: Object.assign({}, quietS, { previousCycleState: { businessDynamics: { 'BIZ-00201': [6, 0] } } }) });
  mod.applyBusinessDynamics_(ctx);
  assert('Task 6: the shed never exceeds the stated count (1 staff, streak 7 → 1)', ctx.summary.businessDeclines['BIZ-00201'] === 1);
  // closure: streak reaches 8 AND revenue below the floor
  ranges = []; ensures = [];
  ctx = ctxWith({ bl: ledger([shop]), S: Object.assign({}, quietS, { previousCycleState: { businessDynamics: { 'BIZ-00200': [7, 0] } }, worldEvents: [] }) });
  out = mod.applyBusinessDynamics_(ctx);
  const closedState = ctx.summary.businessDynamicsState['BIZ-00200'];
  assert('Task 7: streak 8 + revenue under 40 % of the sector median → closes now: growth pinned at the floor, all 6 shed, state carries closedCycle', out.closed === 1 && ranges[0].values[0][1] === -10 && ctx.summary.businessDeclines['BIZ-00200'] === 6 && closedState && closedState[2] === 110, JSON.stringify([out, closedState, ranges[0].values]));
  assert('Task 7: one worldEvents closure event the desks can read + the Business_Archive ensure intent (priority 25, before appends)', ctx.summary.worldEvents.length === 1 && ctx.summary.worldEvents[0].subdomain === 'business-closure' && /Corner Shop is closing in Temescal/.test(ctx.summary.worldEvents[0].description) && ensures.length === 1 && ensures[0].tab === 'Business_Archive' && ensures[0].headers.length === 13 && ensures[0].priority === 25, JSON.stringify(ctx.summary.worldEvents));
  assert('Task 7: S.businessClosures names the closing business for the Phase-11 mover', ctx.summary.businessClosures.length === 1 && ctx.summary.businessClosures[0].id === 'BIZ-00200' && ctx.summary.businessClosures[0].closedCycle === 110);
  ctx = ctxWith({ bl: ledger([['BIZ-00202', 'Rich Decline', 'Retail', 'Temescal', 6, 40000, 300000, -2, '']]), S: Object.assign({}, quietS, { previousCycleState: { businessDynamics: { 'BIZ-00202': [12, 0] } } }) });
  out = mod.applyBusinessDynamics_(ctx);
  assert('Task 7: a long streak with revenue ABOVE the floor does not close (both conditions required); it sheds instead', out.closed === 0 && ctx.summary.businessDeclines['BIZ-00202'] === 6 /* min(stated 6, 13−4) */);
  // the wind-down: closed last cycle, still has 3 stated → pinned, shed 3, no drift, no reopen
  ranges = []; ensures = [];
  ctx = ctxWith({ bl: ledger([['BIZ-00200', 'Corner Shop', 'Retail', 'Temescal', 3, 40000, 100000, -10, '']]), S: Object.assign({}, quietS, { chaosBusinessFold: {}, initiativeNeighborhoodEffects: { Temescal: { traffic: 1 } }, editionSentimentBoost: 5, previousCycleState: { businessDynamics: { 'BIZ-00200': [8, 0, 110] } }, worldEvents: [] }) });
  out = mod.applyBusinessDynamics_(ctx);
  assert('Task 7: a closed business winds down — growth stays at the floor despite good news, sheds its 3 remaining, no second closure event, closedCycle preserved', out.closing === 1 && out.closed === 0 && ranges[0].values[0][1] === -10 && ctx.summary.businessDeclines['BIZ-00200'] === 3 && ctx.summary.worldEvents.length === 0 && ctx.summary.businessDynamicsState['BIZ-00200'][2] === 110 && ensures.length === 0);
  // Phase 11 mover — mock sheets with deleteRow / getLastRow / getRange
  function sheetMock(values) {
    return { _v: values, getDataRange: () => ({ getValues: () => values.map(r => r.slice()) }), getLastRow: () => values.length,
      getRange: (r, c, nr, nc) => ({ setValues: (vals) => { for (let i = 0; i < vals.length; i++) { values[r - 1 + i] = values[r - 1 + i] || []; for (let j = 0; j < vals[i].length; j++) values[r - 1 + i][c - 1 + j] = vals[i][j]; } }, getValues: () => Array.from({ length: nr || 1 }, (_, i) => Array.from({ length: nc || 1 }, (_, j) => (values[r - 1 + i] || [])[c - 1 + j])) }),
      deleteRow: (r) => { values.splice(r - 1, 1); } };
  }
  const mkCtx = (blRows, arRows, ledgerRows, closures) => ({ config: { cycleCount: 112 }, summary: { cycleId: 112, businessClosures: closures }, ledger: { headers: ['POPID', 'Status', 'EmployerBizId'], rows: ledgerRows },
    ss: { getSheetByName: (n) => n === 'Business_Ledger' ? sheetMock(blRows) : n === 'Business_Archive' ? (arRows ? sheetMock(arRows) : null) : null }, _bl: blRows, _ar: arRows });
  const BLX = () => [BL_H.map(h => h.trim()), ['BIZ-00001', 'Keep', 'Retail', 'T', 5, 1, 1, 1, ''], ['BIZ-00200', 'Corner Shop', 'Retail', 'Temescal', 0, 40000, 100000, -10, ''], ['BIZ-00300', 'Also Keep', 'Food', 'T', 2, 1, 1, 1, '']];
  let c1 = mkCtx(BLX(), [mod.BIZ_ARCHIVE_HEADERS.slice()], [['POP-1', 'Active', 'BIZ-00001']], [{ id: 'BIZ-00200', name: 'Corner Shop', closedCycle: 110 }]);
  let res = mod.archiveClosedBusinesses_(c1);
  assert('mover: stated 0 + no tracked worker → copied with exit metadata, read back, source row removed; neighbours intact', res.archived === 1 && c1._bl.length === 3 && c1._bl.map(r => r[0]).join() === 'BIZ_ID,BIZ-00001,BIZ-00300' && c1._ar.length === 2 && c1._ar[1][0] === 'BIZ-00200' && c1._ar[1][9] === 'closed' && c1._ar[1][10] === 112 && c1._ar[1][12] === 110, JSON.stringify([res, c1._ar]));
  let c2 = mkCtx(BLX(), [mod.BIZ_ARCHIVE_HEADERS.slice()], [['POP-1', 'Active', 'BIZ-00200']], [{ id: 'BIZ-00200', closedCycle: 110 }]);
  res = mod.archiveClosedBusinesses_(c2);
  assert('mover: a tracked worker still on the books → waits, nothing moved', res.waiting === 1 && res.archived === 0 && c2._bl.length === 4 && c2._ar.length === 1);
  let c3 = mkCtx(BLX(), null, [], [{ id: 'BIZ-00200', closedCycle: 110 }]);
  res = mod.archiveClosedBusinesses_(c3);
  assert('mover: Business_Archive absent → waits (never creates a tab at runtime)', res.waiting === 1 && c3._bl.length === 4);
  const blS = BLX(); blS[2][4] = 2;
  let c4 = mkCtx(blS, [mod.BIZ_ARCHIVE_HEADERS.slice()], [], [{ id: 'BIZ-00200', closedCycle: 110 }]);
  res = mod.archiveClosedBusinesses_(c4);
  assert('mover: stated count still > 0 → waits', res.waiting === 1 && c4._bl.length === 4);
  const career = fs.readFileSync(path.join(__dirname, '..', 'phase05-citizens', 'runCareerEngine.js'), 'utf8');
  assert('runCareerEngine_ folds S.businessDeclines into careerSignals.businessDeltas[id].lost after its own init', /if \(S\.businessDeclines\) \{[\s\S]*?S\.careerSignals\.businessDeltas\[dk\]\.lost \+= dn;/.test(career));
  const orch2 = fs.readFileSync(path.join(__dirname, '..', 'phase01-config', 'godWorldEngine2.js'), 'utf8');
  assert('Phase11-BusinessArchive runs after Phase11-MediaIntake at both entry points', (orch2.match(/'Phase11-BusinessArchive'/g) || []).length === 2 && orch2.indexOf("'Phase11-MediaIntake'") < orch2.indexOf("'Phase11-BusinessArchive'") && orch2.lastIndexOf("'Phase11-MediaIntake'") < orch2.lastIndexOf("'Phase11-BusinessArchive'"));
}

console.log('Task 11 — the birth rule: field → class, sizes, capital cap');
{
  const seedsSrc = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'ingestPublishedEntities.js'), 'utf8');
  const seedNums = [...seedsSrc.matchAll(/\{ emp: (\d+), sal: (\d+), rev: (\d+), growth: (\d+) \}/g)].map(m => m.slice(1, 5).map(Number));
  const engineNums = ['faith', 'retail', 'food', 'health', 'tech', 'professional', 'construction', 'arts', 'education', 'default'].map(k => { const c = mod.BIZ_CLASS_MINT[k]; return [c.emp, c.sal, c.rev, c.growth]; });
  assert('BIZ_CLASS_MINT mirrors the scripts SECTOR_ECON_SEEDS numbers, class for class (10 incl. the fallback)', JSON.stringify(seedNums) === JSON.stringify(engineNums), JSON.stringify([seedNums, engineNums]));
  assert('BIZ_CLASS_MINT_REVENUE derives from the one table', mod.BIZ_CLASS_MINT_REVENUE.tech === 9000000 && mod.BIZ_CLASS_MINT_REVENUE['default'] === 500000);
  const careerSrc = fs.readFileSync(path.join(__dirname, '..', 'phase05-citizens', 'runCareerEngine.js'), 'utf8');
  const sectorCategory_ = new Function('Logger', careerSrc + '\nreturn sectorCategory_;')({ log() {} });
  const fields = Object.keys(mod.BIZ_FIELD_BIRTH);
  const roundTrip = fields.map(f => [f, sectorCategory_(mod.BIZ_FIELD_BIRTH[f].sector, true)]);
  assert('every birth Sector label round-trips through the hiring engine back to its field (12/12)', roundTrip.every(([f, c]) => c === f), JSON.stringify(roundTrip.filter(([f, c]) => c !== f)));
  assert('every field maps to a class in the mint table', fields.every(f => mod.BIZ_CLASS_MINT[mod.BIZ_FIELD_BIRTH[f].cls]));
  const b1 = mod.heritageBusinessBirth_('Education', 'Dillon', 400000000);
  assert('Dillon at $400M in Education: "Dillon Academy", 15 staff at $62K, capital + revenue capped at the class\'s $1.2M (not $80M / $320M)', b1.name === 'Dillon Academy' && b1.sector === 'Education' && b1.emp === 15 && b1.sal === 62000 && b1.capital === 1200000 && b1.revenue === 1200000 && b1.growth === 2, JSON.stringify(b1));
  const b2 = mod.heritageBusinessBirth_('Creative & Arts', 'Corliss', 2000000);
  assert('Corliss at $2M in Creative & Arts: "Corliss Studio", capital 20 % = $400K (under the $800K class cap), revenue = capital', b2.name === 'Corliss Studio' && b2.capital === 400000 && b2.revenue === 400000 && b2.emp === 9);
  assert('the $50K floor holds for a thin stake; an unknown field falls to Small Business', mod.heritageBusinessBirth_('Small Business', 'X', 100000).capital === 50000 && mod.heritageBusinessBirth_('Nonsense', 'X', 1e9).name === 'X Mercantile');
  // fields from rows
  global.skillTagField_ = (t) => ({ 'Creative & Arts': 'Creative & Arts', 'Education': 'Education', 'Professional': 'Professional', 'Trades': 'Construction & Baylight', 'Tech & Innovation': 'Tech & Innovation', 'Food & Culture': 'Food & Culture' })[String(t).trim()] || null;
  global.roleFieldOf_ = (r) => /teacher/i.test(String(r)) ? 'Education' : null;
  const H = ['POPID', 'SkillTags', 'RoleType', 'Neighborhood'];
  const r = (tags, role) => ['P', tags, role, 'Rockridge'];
  assert('row fields: both SkillTags truths resolve; athlete resolves to nothing; the role is the fallback', JSON.stringify(mod.bizRowFields_(r('Creative & Arts|Trades', ''), 1, 2)) === '["Creative & Arts","Construction & Baylight"]' && mod.bizRowFields_(r('athlete', 'Pitcher'), 1, 2).length === 0 && JSON.stringify(mod.bizRowFields_(r('', 'High School Teacher'), 1, 2)) === '["Education"]');
  const ctxH = { ss: { getSheetByName: (n) => n === 'Business_Ledger' ? { getDataRange: () => ({ getValues: () => [['BIZ_ID', 'Sector', 'Neighborhood'], ['B1', 'Restaurant & Dining', 'Rockridge'], ['B2', 'Retail', 'Rockridge'], ['B3', 'Restaurant & Dining', 'Rockridge'], ['B4', 'Sports Franchise', 'Rockridge']] }) } : null } };
  global.sectorCategory_ = sectorCategory_;
  const dillon = [r('athlete', 'Pitcher'), r('Education', 'High School Science Teacher'), r('', 'Grade Schooler')];
  const d1 = mod.heritageBusinessField_(ctxH, dillon, dillon[0], 1, 2, 'Rockridge', 0.0);
  assert('the Dillon line draws over ONE weighted set: Maya\'s Education (1) + Rockridge\'s market (Food & Culture 2, Small Business 1) — odds 0.25 / 0.5 / 0.25; the sports row weighs nothing', JSON.stringify(d1.odds) === '{"Education":0.25,"Food & Culture":0.5,"Small Business":0.25}', JSON.stringify(d1));
  const picks = [0.0, 0.2, 0.3, 0.6, 0.8, 0.95].map(u => mod.heritageBusinessField_(ctxH, dillon, dillon[0], 1, 2, 'Rockridge', u).field);
  assert('the dice pick: low units → Education (family), the middle → Food & Culture (hood), the top → Small Business (hood)', JSON.stringify(picks) === '["Education","Education","Food & Culture","Food & Culture","Small Business","Small Business"]', JSON.stringify(picks));
  assert('the source names where the pick came from', mod.heritageBusinessField_(ctxH, dillon, dillon[0], 1, 2, 'Rockridge', 0.1).source === 'family' && mod.heritageBusinessField_(ctxH, dillon, dillon[0], 1, 2, 'Rockridge', 0.5).source === 'hood');
  const kelley = [r('athlete', 'Shortstop')];
  const kp = [0.1, 0.5, 0.9].map(u => mod.heritageBusinessField_(ctxH, kelley, kelley[0], 1, 2, 'Rockridge', u));
  assert('the Kelley line (athlete only) draws from Rockridge\'s whole market — never a sports business, never a lock', kp.every(x => x.source === 'hood') && JSON.stringify(kp.map(x => x.field)) === '["Food & Culture","Food & Culture","Small Business"]', JSON.stringify(kp));
  assert('a family trade the hood also sells reads family+hood', mod.heritageBusinessField_(ctxH, [r('Food & Culture', '')], null, 1, 2, 'Rockridge', 0.1).source === 'family+hood');
  assert('no field anywhere → Small Business (default)', JSON.stringify(mod.heritageBusinessField_(ctxH, [r('', '')], null, 1, 2, 'Nowhere', 0.5).field) === '"Small Business"');
  const gw = fs.readFileSync(path.join(__dirname, '..', 'phase05-citizens', 'generationalWealthEngine.js'), 'utf8');
  assert('heritage business mint seeds Growth_Rate from the class table in whole percents (the 0.03 and the 4× stake are gone)', /birth\.emp, birth\.sal, birth\.revenue, birth\.growth/.test(gw) && !/capital \* 4/.test(gw));
}
console.log('engine.250 — the initiative bus chain: real writer → real reader, nothing seeded');
{
  const vm = require('vm');
  const sb = { Logger: { log: () => {} } };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'phase02-world-state', 'applyInitiativeImplementationEffects.js'), 'utf8'), sb);
  const T_H = ['InitiativeID', 'Name', 'Status', 'PolicyDomain', 'AffectedNeighborhoods', 'ImplementationPhase', 'Budget'];
  // the writer fills the bus on a summary; the SAME summary then goes to the business pass
  const chain = (trackerRows, prevPhases, prevCycle) => {
    const S = { cycleId: 110, previousCycleState: { cycle: prevCycle === undefined ? 109 : prevCycle, initiativePhases: prevPhases } };
    sb.applyInitiativeImplementationEffects_({ summary: S, config: {}, ss: { getSheetByName: (n) => n !== 'Initiative_Tracker' ? null : { getDataRange: () => ({ getValues: () => [T_H, ...trackerRows] }) } } });
    const bus = JSON.parse(JSON.stringify(S.initiativeNeighborhoodEffects || {}));
    ranges = [];
    mod.applyBusinessDynamics_(ctxWith({ S: { initiativeNeighborhoodEffects: bus } }));
    return { bus, growth: ranges[0].values.map(v => v[1]) };   // BL order: W.Oak tech, Temescal retail, W.Oak education, Downtown default
  };
  const wo = (phase) => ['INIT-001', 'West Oakland Stabilization Fund', 'passed', 'economic', 'West Oakland', phase, '$28M'];
  const none = chain([], {});
  const standing = chain([wo('disbursement-active')], { 'INIT-001': 'disbursement-active' });
  const moved = chain([wo('disbursement-active')], { 'INIT-001': 'vote-ready' });
  const stale = chain([wo('disbursement-active')], { 'INIT-001': 'vote-ready' }, 107);
  const stalled = chain([wo('stalled')], { 'INIT-001': 'stalled' });
  assert('the writer publishes the hood with its metric deltas and advanced:0 when the phase stood still', standing.bus['West Oakland'] && standing.bus['West Oakland'].retail > 0 && standing.bus['West Oakland'].advanced === 0, JSON.stringify(standing.bus));
  assert('a STANDING initiative pays a business nothing (state, not event) — growth identical to no initiative at all', JSON.stringify(standing.growth) === JSON.stringify(none.growth), JSON.stringify([standing.growth, none.growth]));
  assert('a phase TRANSITION marks the hood advanced:1 and lifts its businesses that Cycle only — other hoods untouched', moved.bus['West Oakland'].advanced === 1 && moved.growth[0] > none.growth[0] && moved.growth[2] > none.growth[2] && moved.growth[1] === none.growth[1] && moved.growth[3] === none.growth[3], JSON.stringify([moved.growth, none.growth]));
  assert('a carry blob that is not exactly one Cycle old detects no transition (conservative direction)', stale.bus['West Oakland'].advanced === 0 && JSON.stringify(stale.growth) === JSON.stringify(none.growth));
  assert('a stalled initiative is a CONDITION: net-negative hood entry drains its businesses every Cycle it stands', stalled.bus['West Oakland'].sentiment < 0 && stalled.growth[0] < none.growth[0] && stalled.growth[1] === none.growth[1], JSON.stringify([stalled.growth, none.growth]));
  const revived = chain([wo('disbursement-active')], { 'INIT-001': 'stalled' });
  assert('a REVIVAL from a failing phase is not an advance — advanced:0, no lift (a stall/revive loop cannot farm it)', revived.bus['West Oakland'].advanced === 0 && JSON.stringify(revived.growth) === JSON.stringify(none.growth), JSON.stringify(revived.bus));
  const dragOne = mod.bizDriftOne_(CFG, { id: 'BIZ-D', sector: 'Professional Services', hood: 'T', growth: 5, revenue: 1 }, { streak: 0, win: 0 }, { chaosAtBusiness: false, chaosInHood: false, initiativeAdvanced: false, initiativeFailing: true, coverageDeviation: null, vitality: 6.0, vitalityMedian: 6.0, mayorApproval: 60 }, 110);
  assert('the stall drain is HALF the event scale (bizInitiativeStallDrag 0.5): ev −0.5, not the −1.0 of chaos at the business', dragOne.parts.ev === -0.5, JSON.stringify(dragOne.parts));
  const cd = fs.readFileSync(path.join(__dirname, '..', 'phase02-world-state', 'applyCityDynamics.js'), 'utf8');
  assert('the Phase-2 fold no longer empties either bus (the clear starved the Phase-3 and Phase-5 readers)', !/S\.initiativeNeighborhoodEffects\s*=\s*\{\}/.test(cd) && !/S\.approvalNeighborhoodEffects\s*=\s*\{\}/.test(cd));
  assert('the fold reads the approval bus from the one-Cycle-old carry, not the same-Cycle summary', /foldPrev\.approvalNeighborhoodEffects/.test(cd) && /approvalBusCycle === foldCycle - 1/.test(cd));
}

console.log('engine.193 cut 2 — coverage against its own weeks, vitality against the city median');
{
  const H = (xs) => ({ cycleId: 121, editionSentimentBoost: xs.now, activityObservations: { history: xs.hist } });
  assert('no carried coverage → null (no term), even with older entries lacking the key',
    mod.bizCoverageDeviation_(H({ now: 0.2, hist: [{ cycle: 118, events: 9 }, { cycle: 119, events: 8 }] })) === null);
  const dev = mod.bizCoverageDeviation_(H({ now: 0.1, hist: [{ cycle: 119, coverage: 0.2 }, { cycle: 120, coverage: 0.1 }, { cycle: 121, coverage: 9 }] }));
  assert('deviation = now − mean(carried), this Cycle\'s own entry ignored: 0.1 − 0.15', Math.abs(dev - (-0.05)) < 1e-9, dev);
  const seven = [0, 0, 0, 0, 0, 0, 0].map((_, i) => ({ cycle: 110 + i, coverage: i === 0 ? 5 : 0.1 }));
  assert('only the last six carried weeks count', Math.abs(mod.bizCoverageDeviation_(H({ now: 0.1, hist: seven }))) < 1e-9);
  const biz = { id: 'BIZ-X', sector: 'Retail', hood: 'T', growth: 5, revenue: 1 };
  const base = { chaosAtBusiness: false, chaosInHood: false, initiativeAdvanced: false, coverageDeviation: null, vitality: 7, vitalityMedian: 7, mayorApproval: 60 };
  const up = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, Object.assign({}, base, { coverageDeviation: 0.05 }), 121);
  const dn = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, Object.assign({}, base, { coverageDeviation: -0.05 }), 121);
  const flat = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, Object.assign({}, base, { coverageDeviation: 0 }), 121);
  assert('a week at its own average pays nothing; above lifts, below drags, symmetric (±0.25 at half a unit)',
    flat.parts.ev === 0 && Math.abs(up.parts.ev - 0.25) < 1e-9 && Math.abs(dn.parts.ev + 0.25) < 1e-9, [up.parts.ev, dn.parts.ev]);
  const big = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, Object.assign({}, base, { coverageDeviation: 0.9 }), 121);
  assert('coverage term capped at ±0.5', Math.abs(big.parts.ev - 0.5) < 1e-9);
  assert('vitality median: odd, even, empty', mod.bizVitalityMedian_({ a: { retailVitality: 4 }, b: { retailVitality: 9 }, c: { retailVitality: 6 } }) === 6 &&
    mod.bizVitalityMedian_({ a: { retailVitality: 4 }, b: { retailVitality: 6 } }) === 5 && mod.bizVitalityMedian_({ a: {} }) === null);
  const hi = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, Object.assign({}, base, { vitality: 9, vitalityMedian: 7 }), 121);
  const lo = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, Object.assign({}, base, { vitality: 5, vitalityMedian: 7 }), 121);
  const noMid = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, Object.assign({}, base, { vitality: 9, vitalityMedian: null }), 121);
  assert('vitality reads against the median, both ways; no median → no term',
    Math.abs(hi.parts.vit - 0.3) < 1e-9 && Math.abs(lo.parts.vit + 0.3) < 1e-9 && noMid.parts.vit === 0, [hi.parts.vit, lo.parts.vit]);
}
console.log('engine.193 cut 3b — chaos reads signed; the ship steps around the cap and releases');
{
  const biz = { id: 'BIZ-S', sector: 'Professional Services', hood: 'T', growth: 5, revenue: 1 };
  const base = { chaosAtBusiness: 0, chaosInHood: 0, initiativeAdvanced: false, coverageDeviation: null, vitality: 7, vitalityMedian: 7, mayorApproval: 60 };
  const good = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, Object.assign({}, base, { chaosAtBusiness: 1 }), 121);
  const zero = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, Object.assign({}, base, { chaosAtBusiness: 0 }), 121);
  const bad = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, Object.assign({}, base, { chaosAtBusiness: -2 }), 121);
  assert('a good letter lifts, a passed inspection is nothing, a blaze drags — the event term carries the sign',
    good.parts.ev === 1 && zero.parts.ev === 0 && bad.parts.ev === -2, [good.parts.ev, zero.parts.ev, bad.parts.ev]);
  assert('hood sign: cheer up +, crime down +, gloom −, nothing 0, capped ±1',
    mod.chaosHoodSign_({ Sentiment: 0.08 }) === 1 && mod.chaosHoodSign_({ CrimeIndex: -0.08 }) === 1 &&
    mod.chaosHoodSign_({ Sentiment: -0.04 }) === -0.5 && mod.chaosHoodSign_(undefined) === 0 &&
    mod.chaosHoodSign_({ Sentiment: -0.5 }) === -1 && mod.chaosHoodSign_({ Sentiment: 0.04, RetailVitality: -1 }) === 0);
  const ship = { factor: 1, peakPp: -15 };
  assert('ship offset: port-dependent full, everyone else the echo, none when idle',
    mod.bizShipOffset_(ship, 'Port & Logistics', 0.15) === -15 && mod.bizShipOffset_(ship, 'Retail', 0.15) === -15 &&
    mod.bizShipOffset_(ship, 'Construction', 0.15) === -15 && mod.bizShipOffset_(ship, 'Education', 0.15) === -2.25 &&
    mod.bizShipOffset_(ship, 'Sports Franchise', 0.15) === -2.25 && mod.bizShipOffset_(ship, 'Sports Bar & Dining', 0.15) === -2.25 &&
    mod.bizShipOffset_(ship, 'Food & Beverage', 0.15) === -15 &&
    mod.bizShipOffset_(null, 'Retail', 0.15) === 0 && mod.bizShipOffset_({ factor: 0, peakPp: -15 }, 'Retail', 0.15) === 0);
  // An 8-week reroute on a port business at +10.69, quiet weeks: start 0.5, peak 1 ×6, end 0.5, aftermath 0.
  const port = { id: 'BIZ-P', sector: 'Port & Logistics', hood: 'Jack London', growth: 10.69, revenue: null };
  const quietPort = { id: 'BIZ-P', sector: 'Port & Logistics', hood: 'Jack London', growth: 10.69, revenue: null };
  const factors = [0.5, 1, 1, 1, 1, 1, 1, 0.5, 0];
  let st = { streak: 0, win: 0, ship: 0 }, qst = { streak: 0, win: 0 }, minG = 99, trace = [];
  for (let w = 0; w < factors.length; w++) {
    const d = mod.bizDriftOne_(CFG, port, st, Object.assign({}, base, { shipOffset: factors[w] * -15 }), 300 + w);
    const q = mod.bizDriftOne_(CFG, quietPort, qst, base, 300 + w);
    port.growth = d.growth; quietPort.growth = q.growth; st = { streak: d.streak, win: d.win, ship: d.ship }; qst = { streak: q.streak, win: q.win };
    minG = Math.min(minG, d.growth); trace.push(d.growth);
  }
  assert('the reroute takes the Port negative (a weekly cap could not: max −1pp/week)', minG < 0, trace);
  assert('aftermath hands back exactly what was applied: same growth as the quiet twin, nothing carried',
    Math.abs(port.growth - quietPort.growth) < 1e-9 && st.ship === 0, [port.growth, quietPort.growth, st.ship]);
  // Near the floor: the clamp eats part of the offset; release returns only what landed — no ratchet up.
  const low = { id: 'BIZ-L', sector: 'Retail', hood: 'T', growth: -8, revenue: null };
  const lowQ = { id: 'BIZ-L', sector: 'Retail', hood: 'T', growth: -8, revenue: null };
  let ls = { streak: 0, win: 0, ship: 0 }, lq = { streak: 0, win: 0 };
  [1, 1, 0].forEach((f, w) => {
    const d = mod.bizDriftOne_(CFG, low, ls, Object.assign({}, base, { shipOffset: f * -15 }), 400 + w);
    const q = mod.bizDriftOne_(CFG, lowQ, lq, base, 400 + w);
    low.growth = d.growth; lowQ.growth = q.growth; ls = { streak: d.streak, win: d.win, ship: d.ship }; lq = { streak: q.streak, win: q.win };
  });
  assert('floor weeks: the release lands on the quiet twin exactly (no windfall, no loss)', Math.abs(low.growth - lowQ.growth) < 1e-9 && ls.ship === 0, [low.growth, lowQ.growth]);
  const fin = fs.readFileSync(path.join(__dirname, '..', 'phase09-digest', 'finalizeCycleState.js'), 'utf8');
  assert('finalizeCycleState carries the ship episode', /chaosShip: S\.chaosShip \|\| null/.test(fin));
}

console.log('engine.205 slice D — a game week at the bars');
{
  // sportsBarTerm_ lives in utilities/sportsWeekRecord.js (shared Apps Script scope)
  global.sportsBarTerm_ = require('../utilities/sportsWeekRecord').sportsBarTerm_;
  const ripples = [];
  global.recordRipple_ = (ctx, e) => { ripples.push(e); return true; };
  const DBL = [BL_H,
    ['BIZ-B1', 'Harbor Grill', 'Restaurant & Dining', 'Jack London', 12, 40000, 2000000, 6, ''],   // venue, nightlife hood
    ['BIZ-B2', 'Uptown Lounge', 'Bar / lounge', 'Uptown', 8, 38000, 900000, 6, ''],               // nightlife hood, not the venue
    ['BIZ-B3', 'Glen Diner', 'Restaurant & Dining', 'Glenview', 6, 36000, 700000, 6, ''],          // under the nightlife median
    ['BIZ-R1', 'Uptown Goods', 'Retail', 'Uptown', 5, 37000, 500000, 6, ''],                       // nightlife hood, not a bar
    ['BIZ-H1', 'Harbor Hotel', 'Hospitality', 'Jack London', 30, 45000, 5000000, 6, '']            // hospitality an earlier class does not claim
  ];
  const NS = { 'Jack London': { nightlifeProfile: 1.87 }, 'Uptown': { nightlifeProfile: 1.25 }, 'Downtown': { nightlifeProfile: 0.88 },
    'Dimond': { nightlifeProfile: 0.76 }, 'Glenview': { nightlifeProfile: 0.62 } };   // median 0.88
  const wk = (o) => ({ "A's": Object.assign({ g: 0, h: 0, signed: 0, reach: 0, venueShare: 0, venue: ['Jack London', 'Downtown'] }, o) });
  const run = (sportsWeek) => {
    ranges = []; ripples.length = 0;
    const out = mod.applyBusinessDynamics_(ctxWith({ bl: DBL.map(r => r.slice()), S: { neighborhoodState: NS, sportsWeek } }));
    return { growth: ranges[0].values.map(v => v[1]), ripples: ripples.filter(r => r.sourceEngine === 'applyBusinessDynamics.sportsWeekBars'), out };
  };
  const quiet = run(undefined);
  const noGame = run(wk({ g: 0, signed: 0.5 }));
  const awayWin = run(wk({ g: 2, h: 0, signed: 0.24, reach: 1, venueShare: 0 }));       // the C110 week
  const homeLoss = run(wk({ g: 3, h: 3, signed: -0.3, reach: 0.5, venueShare: 1 }));   // acceptance 3's synthetic week
  const d = (a, i) => Math.round((a.growth[i] - quiet.growth[i]) * 1000) / 1000;
  const near = (x, y) => Math.abs(x - y) <= 0.0101;   // Growth_Rate is written to 0.01
  assert('bar/hospitality classing: food class, Hospitality, Retail & Food in; Retail and Civic Tech out',
    mod.bizIsBar_('Restaurant & Dining') && mod.bizIsBar_('Hospitality') && mod.bizIsBar_('Retail & Food') && mod.bizIsBar_('Bar / lounge') && !mod.bizIsBar_('Retail') && !mod.bizIsBar_('Civic Tech'));
  assert('a Public Transit / Services / Safety row is not a pub (class default, not food; no bar term) — a real pub still is',
    ['Public Transit', 'Public Services', 'Public Safety', 'Public Safety / Crisis Response'].every(x => mod.bizSectorClass_(x) === 'default' && !mod.bizIsBar_(x)) && mod.bizSectorClass_('Irish Pub') === 'food');
  assert('nightlife median of the hood map', mod.bizNightlifeMedian_(NS) === 0.88 && mod.bizNightlifeMedian_({}) === null);
  assert('no week object, or a week with no game: growth identical, no ripple', JSON.stringify(noGame.growth) === JSON.stringify(quiet.growth) && noGame.ripples.length === 0 && quiet.ripples.length === 0, JSON.stringify([noGame.growth, quiet.growth]));
  assert('away win: the nightlife-hood bars lift (venue hood at reach 1: +.24 × 2pp × food vol 1.3 = +.624)', near(d(awayWin, 0), 0.624) && near(d(awayWin, 1), 0.624), JSON.stringify(awayWin.growth));
  assert('away win: the bar under the nightlife median and the retail shop do not move', d(awayWin, 2) === 0 && d(awayWin, 3) === 0, JSON.stringify(awayWin.growth));
  assert('away win: the hotel (default class vol 1.0) lifts +.48', near(d(awayWin, 4), 0.48), d(awayWin, 4));
  assert('home loss: the venue\'s bars take the cut (−.3 × 2pp × 1.3 = −.78); an off-venue nightlife bar is untouched (home games concentrate at the stadium)', near(d(homeLoss, 0), -0.78) && d(homeLoss, 1) === 0 && d(homeLoss, 2) === 0 && d(homeLoss, 3) === 0, JSON.stringify(homeLoss.growth));
  const r = awayWin.ripples[0];
  assert('one business-scoped ripple naming the moved bars, neighborhood blank, magnitude = mean pp event', awayWin.ripples.length === 1 && r.targetScope === 'business' && JSON.stringify(r.targetIds) === '["BIZ-B1","BIZ-B2","BIZ-H1"]' && r.neighborhood === '' && r.magnitude === 0.48 && /A's signed \+0\.24/.test(r.causeDetail), JSON.stringify(r));
  assert('home loss ripple is negative', homeLoss.ripples.length === 1 && homeLoss.ripples[0].magnitude < 0 && homeLoss.out.sportsBars === 2, JSON.stringify(homeLoss.ripples));
  delete global.recordRipple_;
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
