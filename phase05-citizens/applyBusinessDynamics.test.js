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
const mod = require('./applyBusinessDynamics');
const fs = require('fs'), path = require('path');
let passed = 0, failed = 0;
function assert(label, cond, detail) { if (cond) { console.log(`  ok   ${label}`); passed++; } else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; } }

// the signed Task 3 table, as the self-arm seeds it
const CFG = { bizDeclineStreak: 4, bizDriftMaxUp: 1.0, bizDriftMaxDown: 1.0, bizGrowthCeil: 40, bizGrowthFloor: -10, bizNoiseBound: 0.25, bizVitalityNeutral: 6.0, bizVitalityGain: 0.15, bizSuccessWindow: 3, bizSuccessVitalityHigh: 9.0, bizSuccessApprovalHigh: 85, bizSuccessPenalty: 0.3, bizDisruptBaseChance: 2, bizDisruptSuccessMult: 3, bizDisruptShock: 2.0, bizClosureStreak: 8, bizClosureRevenueFloorPct: 40, bizEventShockScale: 1.0, bizVol_faith: 0.5, bizVol_retail: 1.2, bizVol_food: 1.3, bizVol_health: 0.7, bizVol_tech: 1.5, bizVol_professional: 0.8, bizVol_construction: 1.1, bizVol_arts: 1.2, bizVol_education: 0.6, bizVol_default: 1.0 };
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
  const quiet = { chaosAtBusiness: false, chaosInHood: false, initiativeInHood: false, coverageSentiment: 0, vitality: 6.0, mayorApproval: 60 };
  const a = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, quiet, 110);
  const b = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, quiet, 110);
  assert('deterministic: same inputs, same output', JSON.stringify(a) === JSON.stringify(b));
  assert('quiet cycle at neutral vitality: only noise moves it, inside ±0.25×vol', Math.abs(a.drift) <= 0.25 * 1.2 + 1e-9 && a.parts.ev === 0 && a.parts.vit === 0 && a.parts.pressure === 0, JSON.stringify(a.parts));
  const hit = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, Object.assign({}, quiet, { chaosAtBusiness: true, chaosInHood: true, coverageSentiment: -1 }), 110);
  assert('events are the signal: chaos at the business + in the hood + bad press = −2.0 capped, drift clamped at −1.0', hit.parts.ev === -2.0 && hit.drift === -1.0 && hit.growth === 1.0 && hit.streak === 0, JSON.stringify(hit));
  const lift = mod.bizDriftOne_(CFG, biz, { streak: 0, win: 0 }, Object.assign({}, quiet, { initiativeInHood: true, coverageSentiment: 2 }), 110);
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
  const fl = mod.bizDriftOne_(CFG, { id: 'BIZ-F', sector: 'Tech', hood: 'T', growth: -9.9, revenue: 1 }, { streak: 0, win: 0 }, Object.assign({}, quiet, { chaosAtBusiness: true, chaosInHood: true }), 110);
  const ce = mod.bizDriftOne_(CFG, { id: 'BIZ-C', sector: 'Tech', hood: 'T', growth: 39.9, revenue: 1 }, { streak: 0, win: 0 }, Object.assign({}, quiet, { initiativeInHood: true, coverageSentiment: 1 }), 110);
  assert('floor −10 and ceiling 40 hold', fl.growth === -10 && ce.growth === 40);
  assert('blank revenue stays null (no signal) while growth still drifts', mod.bizDriftOne_(CFG, { id: 'BIZ-B', sector: 'Education', hood: 'T', growth: 1, revenue: null }, { streak: 0, win: 0 }, quiet, 110).revenue === null);
}

console.log('the pass over a ledger');
{
  ranges = [];
  const ctx = ctxWith({ S: { neighborhoodState: { Temescal: { retailVitality: 7.2 }, 'West Oakland': { retailVitality: 5.1 } }, chaosBusinessFold: { 'BIZ-00002::Annual_Revenue': { base: 370000, delta: -5000 } }, initiativeNeighborhoodEffects: { Downtown: { traffic: 0.1 } }, editionSentimentBoost: 0.3, previousCycleState: { businessDynamics: { 'BIZ-00004': [2, 0] } } } });
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
  assert('the 27 signed keys + bizDeclineStreak are seeded, and the pass requires exactly those', seeded.length === 28 && mod.BIZ_DYNAMICS_REQUIRED_KEYS.length === 28 && mod.BIZ_DYNAMICS_REQUIRED_KEYS.every(k => seeded.includes(k)), JSON.stringify(seeded));
  const fin = fs.readFileSync(path.join(__dirname, '..', 'phase09-digest', 'finalizeCycleState.js'), 'utf8');
  assert('finalizeCycleState carries businessDynamics from S.businessDynamicsState', /businessDynamics: S\.businessDynamicsState \|\| \{\}/.test(fin));
  const gw = fs.readFileSync(path.join(__dirname, '..', 'phase05-citizens', 'generationalWealthEngine.js'), 'utf8');
  assert('heritage business mint seeds Growth_Rate from the class table in whole percents (the 0.03 and the 4× stake are gone)', /birth\.emp, birth\.sal, birth\.revenue, birth\.growth/.test(gw) && !/capital \* 4/.test(gw));
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
  global.skillTagField_ = (t) => ({ 'Creative & Arts': 'Creative & Arts', 'Education': 'Education', 'Professional': 'Professional', 'Trades': 'Construction & Baylight', 'Tech & Innovation': 'Tech & Innovation' })[String(t).trim()] || null;
  global.roleFieldOf_ = (r) => /teacher/i.test(String(r)) ? 'Education' : null;
  const H = ['POPID', 'SkillTags', 'RoleType', 'Neighborhood'];
  const r = (tags, role) => ['P', tags, role, 'Rockridge'];
  assert('row fields: both SkillTags truths resolve; athlete resolves to nothing; the role is the fallback', JSON.stringify(mod.bizRowFields_(r('Creative & Arts|Trades', ''), 1, 2)) === '["Creative & Arts","Construction & Baylight"]' && mod.bizRowFields_(r('athlete', 'Pitcher'), 1, 2).length === 0 && JSON.stringify(mod.bizRowFields_(r('', 'High School Teacher'), 1, 2)) === '["Education"]');
  const ctxH = { ss: { getSheetByName: (n) => n === 'Business_Ledger' ? { getDataRange: () => ({ getValues: () => [['BIZ_ID', 'Sector', 'Neighborhood'], ['B1', 'Restaurant & Dining', 'Rockridge'], ['B2', 'Retail', 'Rockridge'], ['B3', 'Restaurant & Dining', 'Rockridge'], ['B4', 'Sports Franchise', 'Rockridge']] }) } : null } };
  global.sectorCategory_ = sectorCategory_;
  const dillon = [r('athlete', 'Pitcher'), r('Education', 'High School Science Teacher'), r('', 'Grade Schooler')];
  assert('the Dillon line: Benji resolves to nothing, Maya\'s Education wins (family)', JSON.stringify(mod.heritageBusinessField_(ctxH, dillon, dillon[0], 1, 2, 'Rockridge')) === '{"field":"Education","source":"family"}');
  const kelley = [r('athlete', 'Shortstop')];
  assert('the Kelley line (athlete only): the hood\'s most common business field — Rockridge reads Food & Culture', JSON.stringify(mod.heritageBusinessField_(ctxH, kelley, kelley[0], 1, 2, 'Rockridge')) === '{"field":"Food & Culture","source":"hood"}');
  const tie = [r('Creative & Arts', ''), r('Professional', '')];
  assert('a tie goes to the staker\'s own field', mod.heritageBusinessField_(ctxH, tie, tie[1], 1, 2, 'Nowhere').field === 'Professional' && mod.heritageBusinessField_(ctxH, tie, tie[0], 1, 2, 'Nowhere').field === 'Creative & Arts');
  assert('no field anywhere → Small Business (default)', JSON.stringify(mod.heritageBusinessField_(ctxH, [r('', '')], null, 1, 2, 'Nowhere')) === '{"field":"Small Business","source":"default"}');
  const gw = fs.readFileSync(path.join(__dirname, '..', 'phase05-citizens', 'generationalWealthEngine.js'), 'utf8');
  assert('the heritage roll reads the birth rule and writes "(founder)" into Key_Personnel; the flavor table is retired', /heritageBusinessField_\(ctx, members, stakeRow, iTagsH, iRoleH, bizNbhd\)/.test(gw) && /heritageBusinessBirth_\(fieldPick\.field, String\(hl\[hName\]\), stakeNW\)/.test(gw) && /\+ ' \(founder\)'\]/.test(gw) && !/HERITAGE_BIZ_SECTORS\[/.test(gw) && !/capital \* 4/.test(gw));
  const intake = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'processBusinessIntake.js'), 'utf8');
  assert('the intake script is born alive through economicSeedForSector and never runs on require', /economicSeedForSector\(\(entry\.Sector/.test(intake) && !/Growth_Rate: 'New'/.test(intake) && /if \(require\.main === module\)/.test(intake));
  delete global.skillTagField_; delete global.roleFieldOf_; delete global.sectorCategory_;
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
