/**
 * integrityWear.test.js — engine.272: integrity wears in base under a standing
 * hardship, at a rate, to a floor, and comes back when the hardship lifts.
 *
 * Covers the pure step (citizenMemory.js), the Phase-9 fold wiring
 * (compressLifeHistory.js), the shared conduct cohort predicate, and the
 * World_Config self-arm contract (engine94SheetContract.js).
 *
 * Run: node scripts/integrityWear.test.js
 */

const fs = require('fs');
const path = require('path');

global.Logger = { log() {} };
const E = require('../utilities/citizenMemory.js');
Object.keys(E).forEach(k => { global[k] = E[k]; });
const M = require('../utilities/citizenDialMap.js');
global.nudgesForEvent_ = M.nudgesForEvent_;
global.nudgesForReflection_ = M.nudgesForReflection_;
global.baseTag_ = M.baseTag_;
global.queueCellIntent_ = function() {};
global.simYearOf_ = function(ctx) { return ctx.summary.simYear; };
const engineErrors = [];
global.logEngineError_ = function(ctx, phase, err) { engineErrors.push({ phase: phase, message: String(err && err.message) }); };
const C = require('../utilities/compressLifeHistory.js');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log('  ok   ' + label); passed++; }
  else { console.error('  FAIL ' + label + (detail !== undefined ? ': ' + detail : '')); failed++; }
}
function near(a, b) { return Math.abs(a - b) < 1e-9; }

// ---------------------------------------------------------------------------
console.log('═══ 1 — the pure step');
(function() {
  var c = E.deserialize_({ base: { integrity: 50 } });
  var moved = E.applyIntegrityWear_(c, true, 110, 1, 10);
  assert('1.1 a worn Cycle takes rate off base', moved && near(c.base.integrity, 49) && near(c.wear.d, 1) && c.wear.l === 110, JSON.stringify(c.wear));
  assert('1.2 same-Cycle re-entry is a no-op', E.applyIntegrityWear_(c, true, 110, 1, 10) === false && near(c.base.integrity, 49));
  assert('1.3 mood is untouched by wear', c.mood.integrity === 0);

  var f = E.deserialize_({ base: { integrity: 11.5 } });
  E.applyIntegrityWear_(f, true, 1, 2, 10);
  assert('1.4 the last step stops AT the floor', near(f.base.integrity, 10) && near(f.wear.d, 1.5), f.base.integrity + ' / ' + JSON.stringify(f.wear));
  assert('1.5 at the floor a worn Cycle moves nothing', E.applyIntegrityWear_(f, true, 2, 2, 10) === false && near(f.base.integrity, 10) && f.wear.l === 1);

  var low = E.deserialize_({ base: { integrity: 6 } });
  assert('1.6 a citizen an event already took below the floor is left alone', E.applyIntegrityWear_(low, true, 5, 1, 10) === false && low.base.integrity === 6 && !low.wear);

  // down 5 Cycles, then back 5: exactly the pre-wear base, and the field clears
  var r = E.deserialize_({ base: { integrity: 57.25 } });
  for (var cy = 1; cy <= 5; cy++) E.applyIntegrityWear_(r, true, cy, 0.75, 10);
  assert('1.7 five worn Cycles at 0.75', near(r.base.integrity, 53.5) && near(r.wear.d, 3.75), r.base.integrity);
  for (cy = 6; cy <= 10; cy++) E.applyIntegrityWear_(r, false, cy, 0.75, 10);
  assert('1.8 regains to exactly the pre-wear base', near(r.base.integrity, 57.25), String(r.base.integrity));
  assert('1.9 the wear field clears when nothing is left to regain', r.wear === undefined);
  assert('1.10 nothing worn -> a clear Cycle moves nothing', E.applyIntegrityWear_(r, false, 11, 0.75, 10) === false);

  // an event raised base while worn: regain still returns only what wear took
  var ev = E.deserialize_({ base: { integrity: 40 } });
  E.applyIntegrityWear_(ev, true, 1, 2, 10); E.applyIntegrityWear_(ev, true, 2, 2, 10);   // 36, d 4
  ev.base.integrity += 10;                                                                  // an event: 46
  for (cy = 3; cy <= 6; cy++) E.applyIntegrityWear_(ev, false, cy, 2, 10);
  assert('1.11 regain returns what wear took, on top of what events did', near(ev.base.integrity, 50) && ev.wear === undefined, String(ev.base.integrity));

  var z = E.deserialize_({ base: { integrity: 50 } });
  assert('1.12 rate 0 moves nothing', E.applyIntegrityWear_(z, true, 1, 0, 10) === false && z.base.integrity === 50 && !z.wear);
  var pole = E.deserialize_({ base: { integrity: 100 }, wear: { d: 3, l: 1 } });
  assert('1.13 at the pole the remainder is dropped, not carried forever', E.applyIntegrityWear_(pole, false, 2, 1, 10) === true && pole.base.integrity === 100 && pole.wear === undefined);
})();

// ---------------------------------------------------------------------------
console.log('═══ 2 — what counts as a standing hardship, and when a step is due');
(function() {
  var cyc = 120;
  assert('2.1 debt admitted this Cycle wears', E.integrityWornByPressure_({ debt: { n: 3, l: cyc } }, cyc) === true);
  assert('2.2 rent, hood, unemployed each wear', ['rent', 'hood', 'unemployed'].every(function(k) { var p = {}; p[k] = { n: 1, l: cyc }; return E.integrityWornByPressure_(p, cyc); }));
  assert('2.3 overwork alone does not (the builder has not ruled it in)', E.integrityWornByPressure_({ overwork: { n: 9, l: cyc } }, cyc) === false);
  assert('2.4 a cause last admitted a Cycle ago does not', E.integrityWornByPressure_({ debt: { n: 3, l: cyc - 1 } }, cyc) === false);
  assert('2.5 an adapted run (n past PRESSURE_ADAPT) still wears', M.PRESSURE_ADAPT === 6 && E.integrityWornByPressure_({ debt: { n: 30, l: cyc } }, cyc) === true);
  assert('2.6 no pressure record -> not worn', E.integrityWornByPressure_(undefined, cyc) === false && E.integrityWornByPressure_({}, cyc) === false);

  var worn = { base: { integrity: 50 }, pressure: { debt: { n: 2, l: cyc } } };
  assert('2.7 due: wear', E.integrityWearDue_(worn, cyc, 1, 10) === 'wear');
  assert('2.8 due: null at rate 0', E.integrityWearDue_(worn, cyc, 0, 10) === null);
  assert('2.9 due: null without a parsed base', E.integrityWearDue_({ pressure: worn.pressure }, cyc, 1, 10) === null && E.integrityWearDue_({}, cyc, 1, 10) === null);
  assert('2.10 due: null when the step already ran this Cycle', E.integrityWearDue_({ base: { integrity: 49 }, pressure: worn.pressure, wear: { d: 1, l: cyc } }, cyc, 1, 10) === null);
  assert('2.11 due: null at the floor', E.integrityWearDue_({ base: { integrity: 10 }, pressure: worn.pressure }, cyc, 1, 10) === null);
  assert('2.12 due: regain when the hardship lifted and points are owed', E.integrityWearDue_({ base: { integrity: 45 }, wear: { d: 5, l: cyc - 1 } }, cyc, 1, 10) === 'regain');
  assert('2.13 due: null for an untroubled citizen', E.integrityWearDue_({ base: { integrity: 50 } }, cyc, 1, 10) === null);
})();

// ---------------------------------------------------------------------------
console.log('═══ 3 — the fold');
var HEADERS = ['POPID', 'LifeHistory', 'TraitProfile', 'DialState', 'Status', 'Tier', 'ClockMode', 'UNI (y/n)', 'MED (y/n)', 'CIV (y/n)', 'BirthYear'];
var iDS = HEADERS.indexOf('DialState');
function ds(base, extra) {
  var o = { base: { drive: 50, sociability: 50, warmth: 50, openness: 50, composure: 50, integrity: base, family: 50, outabout: 50 },
            streak: { drive: 0, sociability: 0, warmth: 0, openness: 0, composure: 0, integrity: 0, family: 0, outabout: 0 },
            mood: { drive: 0, sociability: 0, warmth: 0, openness: 0, composure: 0, integrity: 0, family: 0, outabout: 0 }, folded: 100 };
  for (var k in (extra || {})) o[k] = extra[k];
  return JSON.stringify(o);
}
function row(id, dialState, over) {
  var o = over || {};
  return [id, o.life || '', '', dialState,
    o.status !== undefined ? o.status : 'Active', o.tier !== undefined ? o.tier : 4, o.clock !== undefined ? o.clock : 'ENGINE',
    o.uni || 'no', o.med || 'no', o.civ || 'no', o.birthYear !== undefined ? o.birthYear : 1990];
}
function makeCtx(rows, cycle, config) {
  return { mode: {}, summary: { absoluteCycle: cycle, simYear: 2042 }, config: config, ledger: { headers: HEADERS.slice(), rows: rows, dirty: false } };
}
function integ(ctx, i) { return JSON.parse(ctx.ledger.rows[i][iDS]); }

(function() {
  var CY = 120, debt = { pressure: { debt: { n: 4, l: CY } } };
  var quietClean = ds(50);
  var rows = [
    row('POP-A', ds(50, debt)),                                   // 0 quiet, in debt -> wears
    row('POP-B', quietClean),                                     // 1 quiet, untroubled -> skipped
    row('POP-C', ds(50, debt), { clock: 'GAME' }),                // 2 athlete
    row('POP-D', ds(50, debt), { tier: 1 }),                      // 3 Tier 1
    row('POP-E', ds(50, debt), { tier: 2 }),                      // 4 Tier 2
    row('POP-F', ds(50, debt), { civ: 'yes' }),                   // 5 official
    row('POP-G', ds(50, debt), { birthYear: 2030 }),              // 6 minor
    row('POP-H', ds(50, debt), { status: 'Deceased' }),           // 7 deceased
    row('POP-I', ds(50, debt), { uni: 'Y' }),                     // 8 UNI
    row('POP-J', ds(50, debt), { med: 'y' }),                     // 9 MED
    row('POP-K', '', {}),                                         // 10 no DialState
    row('POP-L', JSON.stringify({ pressure: { debt: { n: 4, l: CY } } })), // 11 DialState without base
    row('POP-M', ds(45, { wear: { d: 5, l: CY - 1 } })),          // 12 hardship lifted -> regains
    row('POP-N', ds(50, { pressure: { overwork: { n: 9, l: CY } } })), // 13 overwork only
    row('POP-O', ds(50, debt), { status: 'Retired' })             // 14 retired, in debt -> in cohort, wears
  ];
  var before = rows.map(function(r) { return r[iDS]; });
  var ctx = makeCtx(rows, CY, { integrityWearRate: 1.5, integrityWearFloor: 10 });
  C.compressLifeHistory_(ctx, {});
  var a = integ(ctx, 0);
  assert('3.1 a quiet citizen in debt is no longer skipped: base down by rate', near(a.base.integrity, 48.5) && near(a.wear.d, 1.5) && a.wear.l === CY, JSON.stringify(a.wear));
  assert('3.2 the pressure record rides through the fold', a.pressure && a.pressure.debt.n === 4);
  assert('3.3 a quiet untroubled citizen stays skipped — exact bytes', ctx.ledger.rows[1][iDS] === before[1]);
  [2, 3, 4, 5, 6, 7, 8, 9].forEach(function(i) {
    assert('3.4 out-of-cohort row ' + rows[i][0] + ' never wears — exact bytes', ctx.ledger.rows[i][iDS] === before[i]);
  });
  assert('3.5 no DialState: never worn, never seeded', ctx.ledger.rows[10][iDS] === '');
  assert('3.6 a DialState with no base: never worn, never seeded', ctx.ledger.rows[11][iDS] === before[11]);
  var m = integ(ctx, 12);
  assert('3.7 hardship lifted: regains by rate', near(m.base.integrity, 46.5) && near(m.wear.d, 3.5) && m.wear.l === CY, JSON.stringify(m));
  assert('3.8 overwork only: exact bytes', ctx.ledger.rows[13][iDS] === before[13]);
  assert('3.9 a Retired citizen is in the conduct cohort and wears', near(integ(ctx, 14).base.integrity, 48.5));
  assert('3.10 summary counts the steps', ctx.summary.lifeHistoryCompression.integrityWear.worn === 2 && ctx.summary.lifeHistoryCompression.integrityWear.regained === 1,
    JSON.stringify(ctx.summary.lifeHistoryCompression.integrityWear));
  assert('3.11 ledger marked dirty', ctx.ledger.dirty === true);

  // a second fold of the SAME Cycle moves nothing more
  var after1 = ctx.ledger.rows.map(function(r) { return r[iDS]; });
  C.compressLifeHistory_(ctx, {});
  assert('3.12 re-entering the fold in the same Cycle does not double-step', near(integ(ctx, 0).base.integrity, 48.5) && near(integ(ctx, 12).base.integrity, 46.5));
  assert('3.13 ...and rewrites no cell', ctx.ledger.rows.every(function(r, i) { return r[iDS] === after1[i]; }));
})();

(function() {
  // rate 0: a quiet, valid but NON-CANONICAL old cell (key order, spacing, no mood) keeps its exact bytes
  var CY = 120;
  var odd = '{ "streak":{"integrity":0}, "base":{"integrity":50,"drive":61.5}, "pressure":{"debt":{"n":4,"l":120}} }';
  var ctx = makeCtx([row('POP-A', odd), row('POP-B', ds(45, { wear: { d: 5, l: CY - 1 } }))], CY, { integrityWearRate: 0, integrityWearFloor: 10 });
  var b1 = ctx.ledger.rows[1][iDS];
  C.compressLifeHistory_(ctx, {});
  assert('3.14 rate 0: the cell keeps its exact bytes', ctx.ledger.rows[0][iDS] === odd);
  assert('3.15 rate 0: a citizen owed a regain is not touched either', ctx.ledger.rows[1][iDS] === b1);
  assert('3.16 rate 0: the ledger is not marked dirty', ctx.ledger.dirty === false);
  assert('3.17 rate 0: no error row', engineErrors.length === 0, JSON.stringify(engineErrors));

  // no config at all (a harness): off, quietly
  var ctx2 = makeCtx([row('POP-A', odd)], CY, undefined);
  C.compressLifeHistory_(ctx2, {});
  assert('3.18 absent keys: off, exact bytes, no error row', ctx2.ledger.rows[0][iDS] === odd && ctx2.ledger.dirty === false && engineErrors.length === 0);
})();

(function() {
  // a value that is not a finite number: no wear, an Engine_Errors row, and the REST of the fold still runs
  var CY = 121;
  ['abc', '', -1, NaN, true].forEach(function(bad, n) {
    engineErrors.length = 0;
    var life = 'Y3C17 — [Promotion] moved up\nY3C17 — [Household] dinner at home';   // C121 = Y3C17: a new stamped entry folds
    var ctx = makeCtx([row('POP-A', ds(50, { pressure: { debt: { n: 4, l: CY } } }), { life: life })], CY, { integrityWearRate: bad, integrityWearFloor: 10 });
    var threw = false;
    try { C.compressLifeHistory_(ctx, {}); } catch (e) { threw = true; }
    var out = integ(ctx, 0);
    assert('3.19.' + n + ' bad rate ' + JSON.stringify(String(bad)) + ': no throw, no wear, the event fold still ran, one error row',
      !threw && out.base.integrity === 50 && !out.wear && out.mood.drive > 0 && out.folded === CY &&
      engineErrors.length === 1 && engineErrors[0].phase === 'Phase9-IntegrityWear', JSON.stringify({ threw: threw, e: engineErrors, mood: out.mood.drive, folded: out.folded }));
  });
  engineErrors.length = 0;
  var ctxF = makeCtx([row('POP-A', ds(50, { pressure: { debt: { n: 4, l: CY } } }))], CY, { integrityWearRate: 1, integrityWearFloor: 140 });
  C.compressLifeHistory_(ctxF, {});
  assert('3.20 a floor outside 0-100: no wear, one error row', integ(ctxF, 0).base.integrity === 50 && engineErrors.length === 1);
  engineErrors.length = 0;
})();

(function() {
  // wear lands on top of a normal fold: events this Cycle still apply, old cells without `wear` round-trip
  var CY = 121;
  var life = 'Y3C17 — [Resisted] turned a wallet in';
  var ctx = makeCtx([row('POP-A', ds(30, { pressure: { rent: { n: 2, l: CY } } }), { life: life }),
                     row('POP-B', ds(50), { life: life })], CY, { integrityWearRate: 2, integrityWearFloor: 10 });
  C.compressLifeHistory_(ctx, {});
  var a = integ(ctx, 0), b = integ(ctx, 1);
  assert('3.21 the step lands in base, the Cycle\'s event lands in mood on top', near(a.base.integrity, 28) && a.mood.integrity > 0 && near(a.wear.d, 2), JSON.stringify({ b: a.base.integrity, m: a.mood.integrity }));
  assert('3.22 a folded citizen with no hardship gets no wear field', b.wear === undefined && b.base.integrity === 50 && b.mood.integrity > 0);
  var c2 = E.deserialize_(JSON.parse(ctx.ledger.rows[0][iDS]));
  assert('3.23 serialize_ and serializeDialState_ both carry wear', near(E.serialize_(c2).wear.d, 2) && near(JSON.parse(C.serializeDialState_(c2)).wear.d, 2));
})();

(function() {
  // many Cycles: down to the floor and held there; the hardship lifts and the citizen comes all the way back
  var cell = ds(50), rows, ctx, cy, base;
  for (cy = 200; cy < 250; cy++) {
    var o = JSON.parse(cell); o.pressure = { debt: { n: cy - 199, l: cy } }; cell = JSON.stringify(o);
    rows = [row('POP-A', cell)]; ctx = makeCtx(rows, cy, { integrityWearRate: 1, integrityWearFloor: 15 });
    C.compressLifeHistory_(ctx, {}); cell = rows[0][iDS];
  }
  base = JSON.parse(cell).base.integrity;
  assert('3.24 fifty Cycles of debt at rate 1, floor 15: base rests at the floor', near(base, 15) && near(JSON.parse(cell).wear.d, 35), String(base));
  assert('3.25 ...and the citizen is now crime-reachable through the real accessor',
    C.getCitizenDialBands_({}, 'POP-A', cell).crimeReachable === true && C.getCitizenDialBands_({}, 'POP-Z', ds(50)).crimeReachable === false);
  for (cy = 250; cy < 290; cy++) {                                   // debt gone: pressure.l stops advancing
    rows = [row('POP-A', cell)]; ctx = makeCtx(rows, cy, { integrityWearRate: 1, integrityWearFloor: 15 });
    C.compressLifeHistory_(ctx, {}); cell = rows[0][iDS];
  }
  assert('3.26 forty clear Cycles: back to exactly 50, wear field gone', near(JSON.parse(cell).base.integrity, 50) && JSON.parse(cell).wear === undefined, cell.slice(0, 120));
})();

// ---------------------------------------------------------------------------
console.log('═══ 4 — one cohort: the shared predicate equals the conduct engine\'s former inline tests');
(function() {
  // the inline tests as they stood in runConductEngine.js before engine.272 (order preserved)
  function inlineWas(row, c, simYear) {
    if ((row[c.iStatus] || 'Active') === 'Deceased') return false;
    var tier = Number(row[c.iTier] || 0);
    var mode = (row[c.iClock] || "").toString().trim();
    var isUNI = (row[c.iUNI] || "").toString().toLowerCase().startsWith("y");
    var isMED = (row[c.iMED] || "").toString().toLowerCase().startsWith("y");
    var isCIV = (row[c.iCIV] || "").toString().toLowerCase().startsWith("y");
    if (mode !== "ENGINE") return false;
    if (tier !== 3 && tier !== 4) return false;
    if (isUNI || isMED || isCIV) return false;
    var birthYear = Number(row[c.iBirthYear] || 0);
    if (birthYear > 0 && (simYear - birthYear) < 18) return false;
    return true;
  }
  var cols = { iStatus: 0, iTier: 1, iClock: 2, iUNI: 3, iMED: 4, iCIV: 5, iBirthYear: 6 };
  var statuses = ['Active', 'active', '', undefined, 'Retired', 'Deceased', 'deceased', 'hospitalized', 'detained'];
  var tiers = [1, 2, 3, 4, '3', '', undefined, 5];
  var clocks = ['ENGINE', ' ENGINE ', 'GAME', 'CIVIC', 'MEDIA', '', undefined];
  var flags = ['', 'no', 'y', 'Yes', undefined];
  var births = [1990, 2024, 2025, 2030, 0, '', undefined, '2000'];
  var n = 0, diff = 0, trues = 0;
  statuses.forEach(function(s) { tiers.forEach(function(t) { clocks.forEach(function(k) { flags.forEach(function(u) { flags.forEach(function(md) { births.forEach(function(b) {
    var rw = [s, t, k, u, md, 'no', b];
    var x = C.conductCohortRow_(rw, cols, 2042), y = inlineWas(rw, cols, 2042);
    n++; if (x !== y) diff++; if (x) trues++;
    var rw2 = [s, t, k, 'no', 'no', u, b];                              // the CIV flag
    if (C.conductCohortRow_(rw2, cols, 2042) !== inlineWas(rw2, cols, 2042)) diff++;
  }); }); }); }); }); });
  assert('4.1 identical on ' + n + ' row shapes (' + trues + ' eligible)', diff === 0 && trues > 0 && trues < n, diff + ' differ');
  var absent = { iStatus: -1, iTier: 1, iClock: 2, iUNI: -1, iMED: -1, iCIV: -1, iBirthYear: -1 };
  assert('4.2 absent columns read as blank, as before', C.conductCohortRow_(['x', 4, 'ENGINE'], absent, 2042) === inlineWas(['x', 4, 'ENGINE'], absent, 2042) && C.conductCohortRow_(['x', 4, 'ENGINE'], absent, 2042) === true);
  assert('4.3 the 18th birthday is in, 17 is out', C.conductCohortRow_(['Active', 4, 'ENGINE', '', '', '', 2024], cols, 2042) === true && C.conductCohortRow_(['Active', 4, 'ENGINE', '', '', '', 2025], cols, 2042) === false);
  var src = fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/runConductEngine.js'), 'utf8');
  assert('4.4 the conduct engine calls the shared predicate and keeps no inline copy', /if \(!conductCohortRow_\(row, cohortCols, simYear\)\) continue;/.test(src) && !/tier !== 3 && tier !== 4/.test(src));
})();

// ---------------------------------------------------------------------------
console.log('═══ 5 — World_Config contract');
(function() {
  var source = fs.readFileSync(path.resolve(__dirname, '../phase01-config/engine94SheetContract.js'), 'utf8');
  var K = new Function(source + '\nreturn { seeds: ENGINE272_CONFIG_SEEDS, inspect: inspectEngine94Config_, ensure: ensureEngine272Config_ };')();
  function sheet(values) {
    var v = values.map(function(r) { return r.slice(); });
    return {
      values: v,
      getSheetByName: function(n) { return n === 'World_Config' ? this._s : null; },
      _s: {
        getDataRange: function() { return { getValues: function() { return v.map(function(r) { return r.slice(); }); } }; },
        getLastRow: function() { return v.length; },
        getRange: function(r, c, nr, nc) { return { setValues: function(add) { for (var i = 0; i < add.length; i++) v[r - 1 + i] = add[i].slice(); } }; }
      }
    };
  }
  var s1 = sheet([['Key', 'Value', 'Description'], ['cycleCount', 109, '']]);
  var res = K.ensure(s1);
  var got = {}; s1.values.forEach(function(r) { got[r[0]] = r[1]; });
  assert('5.1 missing keys are seeded: rate 0 (off), floor 10', res.configSeeded === 2 && got.integrityWearRate === 0 && got.integrityWearFloor === 10, JSON.stringify(got));
  assert('5.2 a second run seeds nothing', K.ensure(s1).configSeeded === 0);
  var s2 = sheet([['Key', 'Value', 'Description'], ['integrityWearRate', 0, ''], ['integrityWearFloor', 0, '']]);
  assert('5.3 a set 0 is accepted for both keys', K.ensure(s2).configSeeded === 0);
  function rejects(rate, floor) {
    try { K.ensure(sheet([['Key', 'Value', 'Description'], ['integrityWearRate', rate, ''], ['integrityWearFloor', floor, '']])); } catch (e) { return /integrityWear/.test(String(e.message)); }
    return false;
  }
  assert('5.4 a negative rate stops the run before the Cycle', rejects(-0.5, 10));
  assert('5.5 a blank, text or boolean rate stops the run', rejects('', 10) && rejects('fast', 10) && rejects(true, 10));
  assert('5.6 a floor outside 0-100 stops the run', rejects(1, 101) && rejects(1, -1));
  var eng = fs.readFileSync(path.resolve(__dirname, '../phase01-config/godWorldEngine2.js'), 'utf8');
  var iEnsure = eng.indexOf('ensureEngine272Config_(ss);'), iLoad = eng.indexOf("safePhaseCall_(ctx, 'Phase1-LoadConfig'");
  assert('5.7 the contract runs in the pre-Cycle list, before config load', iEnsure > 0 && iLoad > iEnsure && eng.indexOf('ensureEngine176Config_(ss);') < iEnsure);
})();

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
