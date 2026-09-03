/**
 * applyBusinessDynamics.test.js — engine.96 Task 9 (Task 5 scope). Node-only.
 * Run: node phase05-citizens/applyBusinessDynamics.test.js
 */
'use strict';
global.Logger = { log: () => {} };
// seedUnit_ lives in generationalWealthEngine.js (shared Apps Script scope) — same hash here
global.seedUnit_ = function (s) { var h = 2166136261; s = String(s || ''); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return (h % 10000) / 10000; };
let ranges = [];
global.queueRangeIntent_ = (ctx, tab, r, c, values, reason, domain, priority) => ranges.push({ tab, r, c, values, reason, domain, priority });
const mod = require('./applyBusinessDynamics');
const fs = require('fs'), path = require('path');
let passed = 0, failed = 0;
function assert(label, cond, detail) { if (cond) { console.log(`  ok   ${label}`); passed++; } else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; } }

// the signed Task 3 table, as the self-arm seeds it
const CFG = { bizDriftMaxUp: 1.0, bizDriftMaxDown: 1.0, bizGrowthCeil: 40, bizGrowthFloor: -10, bizNoiseBound: 0.25, bizVitalityNeutral: 6.0, bizVitalityGain: 0.15, bizSuccessWindow: 3, bizSuccessVitalityHigh: 9.0, bizSuccessApprovalHigh: 85, bizSuccessPenalty: 0.3, bizDisruptBaseChance: 2, bizDisruptSuccessMult: 3, bizDisruptShock: 2.0, bizClosureStreak: 8, bizClosureRevenueFloorPct: 40, bizEventShockScale: 1.0, bizVol_faith: 0.5, bizVol_retail: 1.2, bizVol_food: 1.3, bizVol_health: 0.7, bizVol_tech: 1.5, bizVol_professional: 0.8, bizVol_construction: 1.1, bizVol_arts: 1.2, bizVol_education: 0.6, bizVol_default: 1.0 };
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
  assert('the 27 signed keys are seeded, and the pass requires exactly those', seeded.length === 27 && mod.BIZ_DYNAMICS_REQUIRED_KEYS.length === 27 && mod.BIZ_DYNAMICS_REQUIRED_KEYS.every(k => seeded.includes(k)), JSON.stringify(seeded));
  const fin = fs.readFileSync(path.join(__dirname, '..', 'phase09-digest', 'finalizeCycleState.js'), 'utf8');
  assert('finalizeCycleState carries businessDynamics from S.businessDynamicsState', /businessDynamics: S\.businessDynamicsState \|\| \{\}/.test(fin));
  const gw = fs.readFileSync(path.join(__dirname, '..', 'phase05-citizens', 'generationalWealthEngine.js'), 'utf8');
  assert('heritage business mint seeds Growth_Rate in whole percents (3, not 0.03)', /capital \* 4, 3 \/\*/.test(gw) && !/capital \* 4, 0\.03/.test(gw));
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
