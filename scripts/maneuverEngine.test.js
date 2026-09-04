/**
 * maneuverEngine.test.js — engine.157 the maneuver phase (bloodline cut 9). Node-only.
 * Run: node scripts/maneuverEngine.test.js
 *
 * Proves: the ambition read off the dials (and the TraitProfile fallback); the goal
 * off the rung; the posture off causes (debt, the line near its bar, ambition);
 * the phase over a seeded ledger (S.maneuver, DialState.maneuver, the line on
 * change only, hold is silence); the DialState round trip through the Phase 9
 * serializer; the consumers — casino placement + stake band, the solo door, the
 * home purchase, relocation, the willing cross-field hire — and the owner's-draw
 * dormancy seam closed.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
global.Logger = { log() {} };
let appends = [];
global.queueAppendIntent_ = (_ctx, tab, row) => appends.push({ tab, row });
global.queueCellIntent_ = () => {};
global.queueBatchAppendIntent_ = () => {};
global.simYearOf_ = new Function(fs.readFileSync(path.resolve(__dirname, '../phase01-config/advanceSimulationCalendar.js'), 'utf8') + '\nreturn simYearOf_;')();
global.safeRand_ = (ctx) => ctx.rng;

const M = require('../phase05-citizens/maneuverEngine.js');
const mem = require('../utilities/citizenMemory.js');
const CFG = { maneuverClimbBar: 60, maneuverRetreatDebt: 6, maneuverStandingMargin: 5, maneuverClimbOdds: 1.5, maneuverRetreatOdds: 0.5, maneuverDriveWeight: 0.7 };

let passed = 0, failed = 0;
function assert(label, cond, detail) { if (cond) { console.log('  ok   ' + label); passed++; } else { console.error('  FAIL ' + label + (detail ? ': ' + detail : '')); failed++; } }
function dial(base, extra) { const o = { base: Object.assign({ drive: 50, sociability: 50, warmth: 50, openness: 50, composure: 50, integrity: 50, family: 50, outabout: 50 }, base), streak: {} }; return JSON.stringify(Object.assign(o, extra || {})); }

console.log('the reads');
{
  const d = M.maneuverDials_(dial({ drive: 74, openness: 62 }), '');
  assert('drive + openness off DialState.base', d.drive === 74 && d.openness === 62 && d.hasDials);
  const f = M.maneuverDials_('', 'Archetype:Striver|Mods:ambitious|drive:71|sociability:50|openness:58|V:1.5');
  assert('TraitProfile face is the fallback', f.drive === 71 && f.openness === 58 && !f.hasDials);
  assert('no dials → 50/50', M.maneuverDials_('', '').drive === 50 && M.maneuverDials_('', '').openness === 50);
  assert('ambition = round(0.7·drive + 0.3·openness)', M.maneuverAmbition_(74, 62, 0.7) === 70 && M.maneuverAmbition_(50, 50, 0.7) === 50);
  assert('goal off the rung: establish / home / wealth / tenure / revive',
    M.maneuverGoal_('', false, '', '') === 'establish' && M.maneuverGoal_('HH-1', false, '', '') === 'home' &&
    M.maneuverGoal_('HH-1', true, '', '') === 'wealth' && M.maneuverGoal_('HH-1', true, 'LIN-1', 'active') === 'tenure' &&
    M.maneuverGoal_('', false, 'LIN-1', 'dormant') === 'revive');
}

console.log('the posture');
{
  assert('climb at ambition ≥ 60, debt clear', M.maneuverPosture_(CFG, 66, 2, null).posture === 'climb');
  assert('hold under the bar', M.maneuverPosture_(CFG, 55, 2, null).posture === 'hold');
  const r = M.maneuverPosture_(CFG, 80, 7, null);
  assert('debt ≥ 6 → retreat whatever the ambition', r.posture === 'retreat' && r.reason === 'debt');
  const near = M.maneuverPosture_(CFG, 80, 0, { tier: 'Established', score: 33, status: 'active' });
  assert('a line within 5 of the bar below → retreat (standing)', near.posture === 'retreat' && near.reason === 'standing');
  assert('a line clear of its bar climbs', M.maneuverPosture_(CFG, 80, 0, { tier: 'Established', score: 41, status: 'active' }).posture === 'climb');
  assert('Founding has no bar below', M.maneuverLineNearBar_({ tier: 'Founding', score: 1, status: 'active' }, 5) === '');
  assert('a dormant line has no bar', M.maneuverLineNearBar_({ tier: 'Established', score: 31, status: 'dormant' }, 5) === '');
  assert('a missing key throws naming it', (() => { try { M.maneuverConfig_({ config: Object.assign({}, CFG, { maneuverClimbBar: '' }) }); return false; } catch (e) { return /maneuverClimbBar/.test(e.message); } })());
  assert('the lines', M.maneuverLine_('climb', 'home', 'ambition') === '[Maneuver-Climb] playing to climb — the house first' &&
    M.maneuverLine_('retreat', 'home', 'debt') === '[Maneuver-Retreat] pulling in — the debt says so' &&
    M.maneuverLine_('retreat', 'tenure', 'standing') === "[Maneuver-Retreat] pulling in — the line's standing is near the bar" &&
    M.maneuverLine_('hold', 'establish', 'even') === '[Maneuver-Hold] settling — a place of their own first');
}

console.log('the phase over a seeded ledger');
const H = ['POPID', 'First', 'Last', 'Status', 'ClockMode', 'BirthYear', 'DebtLevel', 'HouseholdId', 'LineageId', 'DialState', 'TraitProfile', 'LifeHistory', 'LastUpdated', 'Income', 'NetWorth', 'WealthLevel', 'EmployerBizId', 'Tier'];
function row(o) { return H.map(h => o[h] === undefined ? '' : o[h]); }
const HH = [['HouseholdId', 'HeadOfHousehold', 'Members', 'HousingType', 'Status'],
  ['HH-R', 'POP-2', '["POP-2"]', 'rented', 'active'], ['HH-O', 'POP-3', '["POP-3"]', 'owned', 'active'], ['HH-L', 'POP-4', '["POP-4"]', 'owned', 'active'], ['HH-D', 'POP-5', '["POP-5"]', 'owned', 'active']];
const HL = [['LineageId', 'FamilyName', 'MembersList', 'HeritageScore', 'HeritageTier', 'Status'],
  ['LIN-1', 'Near', '["POP-4"]', 31, 'Established', 'active'], ['LIN-2', 'Gone', '["POP-5"]', 8, '', 'dormant']];
function ss(hh, hl) { return { getSheetByName: (n) => n === 'Household_Ledger' ? { getDataRange: () => ({ getValues: () => hh || HH }) } : n === 'Heritage_Ledger' ? { getDataRange: () => ({ getValues: () => hl || HL }) } : null }; }
function seed() {
  return [
    row({ POPID: 'POP-1', First: 'Ada', Last: 'Striver', Status: 'Active', ClockMode: 'ENGINE', BirthYear: 2005, DebtLevel: 1, DialState: dial({ drive: 80, openness: 65 }), Income: 90000, NetWorth: 20000 }),
    row({ POPID: 'POP-2', First: 'Bo', Last: 'Anchor', Status: 'Active', ClockMode: 'ENGINE', BirthYear: 2000, DebtLevel: 2, HouseholdId: 'HH-R', DialState: dial({ drive: 50, openness: 50 }) }),
    row({ POPID: 'POP-3', First: 'Cy', Last: 'Debt', Status: 'Active', ClockMode: 'ENGINE', BirthYear: 1990, DebtLevel: 7, HouseholdId: 'HH-O', DialState: dial({ drive: 78, openness: 70 }) }),
    row({ POPID: 'POP-4', First: 'Di', Last: 'Near', Status: 'Active', ClockMode: 'ENGINE', BirthYear: 1985, DebtLevel: 0, HouseholdId: 'HH-L', LineageId: 'LIN-1', DialState: dial({ drive: 85, openness: 60 }) }),
    row({ POPID: 'POP-5', First: 'Ed', Last: 'Gone', Status: 'Active', ClockMode: 'ENGINE', BirthYear: 1980, DebtLevel: 0, HouseholdId: 'HH-D', LineageId: 'LIN-2', DialState: dial({ drive: 70, openness: 60 }) }),
    row({ POPID: 'POP-6', First: 'Fa', Last: 'Game', Status: 'Active', ClockMode: 'GAME', BirthYear: 2010, DebtLevel: 0, DialState: dial({ drive: 90, openness: 90 }) }),
    row({ POPID: 'POP-7', First: 'Gi', Last: 'Minor', Status: 'Active', ClockMode: 'ENGINE', BirthYear: 2030, DebtLevel: 0, DialState: dial({ drive: 90, openness: 90 }) }),
    row({ POPID: 'POP-8', First: 'Hu', Last: 'Face', Status: 'Active', ClockMode: 'ENGINE', BirthYear: 1995, DebtLevel: 0, TraitProfile: 'Archetype:Striver|drive:70|openness:60|V:1.5' })
  ];
}
function ctxFor(rows, cfg, S) { return { config: Object.assign({ cycleCount: 106 }, cfg || CFG), summary: Object.assign({ cycleId: 106 }, S || {}), now: 'now', ss: ss(), ledger: { headers: H, rows: rows, dirty: false }, rng: () => 0.5 }; }
{
  appends = [];
  const rows = seed();
  const ctx = ctxFor(rows);
  const out = M.runManeuverEngine_(ctx);
  const bp = out.byPop;
  assert('counts: 3 climb (Ada, Ed the reviver, Hu off the face) / 1 hold / 2 retreat; GAME + minor skipped',
    out.counts.climb === 3 && out.counts.hold === 1 && out.counts.retreat === 2 && !bp['POP-6'] && !bp['POP-7'], JSON.stringify(out.counts));
  assert('Ada: climb, establish, ambition 76', bp['POP-1'].posture === 'climb' && bp['POP-1'].goal === 'establish' && bp['POP-1'].ambition === 76);
  assert('Bo: hold, home (rented household)', bp['POP-2'].posture === 'hold' && bp['POP-2'].goal === 'home');
  assert('Cy: retreat on debt 7 despite ambition 76; goal wealth (owned)', bp['POP-3'].posture === 'retreat' && bp['POP-3'].reason === 'debt' && bp['POP-3'].goal === 'wealth');
  assert('Di: retreat — the line sits at 31 Established, within 5 of the bar; goal tenure', bp['POP-4'].posture === 'retreat' && bp['POP-4'].reason === 'standing' && bp['POP-4'].goal === 'tenure');
  assert('Ed: on a dormant line → goal revive, climbs', bp['POP-5'].posture === 'climb' && bp['POP-5'].goal === 'revive');
  assert('Hu: no DialState — the TraitProfile face reads 67 → climb', bp['POP-8'].posture === 'climb' && bp['POP-8'].ambition === 67);
  const ada = JSON.parse(rows[0][H.indexOf('DialState')]);
  assert('DialState.maneuver written {p, g, a, c}', ada.maneuver && ada.maneuver.p === 'climb' && ada.maneuver.g === 'establish' && ada.maneuver.a === 76 && ada.maneuver.c === 106 && ada.base.drive === 80);
  assert('the line on Ada + the log row', /\[Maneuver-Climb\] playing to climb — a place of their own first$/.test(rows[0][H.indexOf('LifeHistory')]) && appends.some(a => a.tab === 'LifeHistory_Log' && a.row[1] === 'POP-1' && a.row[3] === 'Maneuver-Climb'));
  assert('hold entered from the default is silence (Bo has no line, no maneuver stamp change)', rows[1][H.indexOf('LifeHistory')] === '' && JSON.parse(rows[1][H.indexOf('DialState')]).maneuver === undefined);
  assert('Di\'s retreat names the standing', /the line's standing is near the bar$/.test(rows[3][H.indexOf('LifeHistory')]));
  assert('4 lines written (climb/retreat with dials); Hu without DialState gets posture but no line — no dials, no story', out.counts.lines === 4 && out.counts.skipped === 1 && rows[7][H.indexOf('LifeHistory')] === '', String(out.counts.lines));
  assert('no DialState → no memory written, the row is untouched', rows[7][H.indexOf('DialState')] === '');

  // second fire, nothing changed → no new lines
  appends = [];
  const out2 = M.runManeuverEngine_(ctxFor(rows));
  assert('re-fire with the same causes writes no line', out2.counts.lines === 0 && appends.length === 0, 'lines ' + out2.counts.lines);
  // Cy pays down: retreat → climb flips with a line; Ada's drive folds down: climb → hold speaks
  rows[2][H.indexOf('DebtLevel')] = 2;
  const adaD = JSON.parse(rows[0][H.indexOf('DialState')]); adaD.base.drive = 52; rows[0][H.indexOf('DialState')] = JSON.stringify(adaD);
  const out3 = M.runManeuverEngine_(ctxFor(rows));
  assert('Cy retreat → climb, Ada climb → hold, both speak', out3.byPop['POP-3'].posture === 'climb' && /\[Maneuver-Climb\] playing to climb — the money next$/.test(rows[2][H.indexOf('LifeHistory')]) &&
    out3.byPop['POP-1'].posture === 'hold' && /\[Maneuver-Hold\] settling — a place of their own first$/.test(rows[0][H.indexOf('LifeHistory')]));
  assert('Ada\'s memory now hold', JSON.parse(rows[0][H.indexOf('DialState')]).maneuver.p === 'hold');
}

console.log('the round trip through the Phase 9 serializer');
{
  const CL = require('../utilities/compressLifeHistory.js');
  const parsed = JSON.parse(dial({ drive: 80 }, { maneuver: { p: 'climb', g: 'home', a: 71, c: 106 }, chaosExposure: { count: 1 } }));
  const c = mem.deserialize_(parsed);
  const back = JSON.parse(CL.serializeDialState_(c));
  assert('deserialize_ → serializeDialState_ keeps maneuver beside chaosExposure', back.maneuver && back.maneuver.p === 'climb' && back.maneuver.a === 71 && back.chaosExposure && back.chaosExposure.count === 1 && back.base.drive === 80);
  const plain = JSON.parse(CL.serializeDialState_(mem.deserialize_(JSON.parse(dial({})))));
  assert('a row without the field stays without it', plain.maneuver === undefined);
}

console.log('the read surface');
{
  const ctx = { config: CFG, summary: { maneuver: { byPop: { 'POP-1': { posture: 'climb', goal: 'establish', openness: 65 }, 'POP-2': { posture: 'retreat', goal: 'home', openness: 70 }, 'POP-3': { posture: 'hold', goal: 'wealth', openness: 90 } } } } };
  assert('factor: climb 1.5 / retreat 0.5 / hold 1 / unknown 1', M.maneuverFactor_(ctx, 'POP-1') === 1.5 && M.maneuverFactor_(ctx, 'POP-2') === 0.5 && M.maneuverFactor_(ctx, 'POP-3') === 1 && M.maneuverFactor_(ctx, 'POP-9') === 1);
  assert('goal filter: a climber whose goal is not the roll\'s reads 1', M.maneuverFactor_(ctx, 'POP-1', 'establish') === 1.5 && M.maneuverFactor_(ctx, 'POP-1', 'home') === 1);
  assert('phase not run → 1', M.maneuverFactor_({ config: CFG, summary: {} }, 'POP-1') === 1);
  assert('willing cross-field: climb + openness ≥ bar only', M.maneuverWillingCrossField_(ctx, 'POP-1') && !M.maneuverWillingCrossField_(ctx, 'POP-2') && !M.maneuverWillingCrossField_(ctx, 'POP-3'));
}

console.log('the consumers — casino');
{
  global.maneuverPostureOf_ = M.maneuverPostureOf_; global.maneuverFactor_ = M.maneuverFactor_;
  const C = require('../phase05-citizens/casinoLedgerEngine.js');
  const hold = C.casinoStake_(52000, 20000, 6, () => 0.5), climb = C.casinoStake_(52000, 20000, 6, () => 0.5, 'climb'), retreat = C.casinoStake_(52000, 20000, 6, () => 0.5, 'retreat');
  assert('stake band: hold 140 / climb 210 / retreat 70 on $1,000 a week', hold === 140 && climb === 210 && retreat === 70, [hold, climb, retreat].join('/'));
  assert('a WealthLevel-3 climber draws under the 25 % cap, not 10 %', C.casinoStake_(52000, 20000, 3, () => 1, 'climb') === 250 && C.casinoStake_(52000, 20000, 3, () => 1) === 100);
}

console.log('the consumers — the owner\'s draw dormancy seam (generationalWealthEngine)');
{
  const sb = { Logger: global.Logger, console, queueAppendIntent_: (_ctx, tab, row) => appends.push({ tab, row }), queueCellIntent_: () => {}, queueBatchAppendIntent_: () => {}, queueRangeIntent_: () => {}, queueEnsureTabIntent_: () => {}, safeRand_: global.safeRand_, simYearOf_: global.simYearOf_, inWorldStamp_: () => 'Y3C2', parseJSON: (v, f) => { try { const p = JSON.parse(v); return p === null ? f : p; } catch (e) { return f; } }, recordHookRipple_: () => {}, maneuverFactor_: M.maneuverFactor_, maneuverPostureOf_: M.maneuverPostureOf_ };
  vm.createContext(sb);
  for (const rel of [['phase05-citizens', 'educationCareerEngine.js'], ['phase05-citizens', 'processAdvancementIntake.js'], ['phase05-citizens', 'generationalWealthEngine.js']]) { const p = path.join(__dirname, '..', ...rel); vm.runInContext(fs.readFileSync(p, 'utf8'), sb, { filename: p }); }
  const GH = ['POPID', 'First', 'Last', 'Income', 'NetWorth', 'LineageId', 'Status', 'Tier', 'ClockMode', 'EconomicProfileKey', 'LifeHistory', 'LastUpdated'];
  const BL = [['BIZ_ID', 'Name', 'Annual_Revenue', 'Employee_Count', 'Avg_Salary', 'Key_Personnel'], ['BIZ-1', 'Gone Goods', 2000000, 5, 60000, 'POP-5 Ed Gone (owner)'], ['BIZ-2', 'Near Needs', 2000000, 5, 60000, 'POP-4 Di Near (owner)']];
  function gctx(hl) { return { now: 'now', config: { cycleCount: 106 }, summary: {}, ledger: { headers: GH, rows: [
    ['POP-5', 'Ed', 'Gone', 100000, 1000000, 'LIN-2', 'Active', 3, 'ENGINE', '', '', ''],
    ['POP-4', 'Di', 'Near', 100000, 1000000, 'LIN-1', 'Active', 3, 'ENGINE', '', '', '']], dirty: false },
    ss: { getSheetByName: (n) => n === 'Business_Ledger' ? { getDataRange: () => ({ getValues: () => BL }) } : n === 'Heritage_Ledger' ? (hl ? { getDataRange: () => ({ getValues: () => hl }) } : null) : null } }; }
  const c1 = gctx(HL); const o1 = sb.applyOwnerDraw_(c1, 106);
  assert('dormant line\'s owner takes the off-heritage draw (Income set by the books); the active line\'s owner takes gains', o1.gains === 1 && c1.ledger.rows[0][3] !== 100000 && c1.ledger.rows[1][4] > 1000000, JSON.stringify(o1) + ' inc ' + c1.ledger.rows[0][3]);
  const c2 = gctx(null); const o2 = sb.applyOwnerDraw_(c2, 106);
  assert('no Heritage_Ledger sheet → LineageId alone rules (both take gains)', o2.gains === 2, JSON.stringify(o2));
  // home purchase: the head's factor multiplies the roll
  assert('homeBuyChance_ unchanged at the rung (the factor multiplies at the call)', Math.abs(sb.homeBuyChance_(4) - 0.01) < 1e-9);
}

console.log('the consumers — the solo door and relocation read the factor through the guard');
{
  const src = fs.readFileSync(path.join(__dirname, '../phase05-citizens/householdFormationEngine.js'), 'utf8');
  assert('solo door multiplies by maneuverFactor_(ctx, pop, "establish")', /SOLO_ESTABLISH_CHANCE \* soloF/.test(src) && /maneuverFactor_\(ctx, pop, 'establish'\)/.test(src));
  const mig = fs.readFileSync(path.join(__dirname, '../phase05-citizens/migrationTrackingEngine.js'), 'utf8');
  assert('relocation lane chance multiplies by the unit head\'s factor', /chance \*= maneuverFactor_\(ctx, rows\[unit\.rowIdxs\[0\]\]\[iPOPID\], null\)/.test(mig));
  const car = fs.readFileSync(path.join(__dirname, '../phase05-citizens/runCareerEngine.js'), 'utf8');
  assert('career: a zero-same-field window takes willing climbers only', /if \(!sameField\.length && typeof maneuverWillingCrossField_ === 'function'\)/.test(car));
  const eng = fs.readFileSync(path.join(__dirname, '../phase01-config/godWorldEngine2.js'), 'utf8');
  assert('Phase5-Maneuver wired in both entry points, after BusinessDynamics and before Career', (eng.match(/'Phase5-Maneuver'/g) || []).length === 2 &&
    eng.indexOf("'Phase5-BusinessDynamics'") < eng.indexOf("'Phase5-Maneuver'") && eng.indexOf("'Phase5-Maneuver'") < eng.indexOf("'Phase5-Career'"));
  assert('ensureEngine157Config_ at open', /ensureEngine157Config_\(ss\)/.test(eng));
  const map = require('../utilities/citizenDialMap.js');
  const dm = map.CITIZEN_DIAL_MAP || map.DIAL_MAP || map;
  const tags = JSON.stringify(dm);
  assert('the three Maneuver tags are in the dial map', /Maneuver-Climb/.test(tags) && /Maneuver-Retreat/.test(tags) && /Maneuver-Hold/.test(tags));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
