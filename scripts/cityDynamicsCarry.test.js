#!/usr/bin/env node
'use strict';

/**
 * engine.195 — the city remembers last week's mood (builder 2026-09-27).
 *
 * applyCityDynamics_ blends each metric with S.previousCityDynamics, but nothing carried that
 * object across executions, so prev was null every Cycle and the momentum blend never ran live.
 * The carrier now rides its OWN carry-forward key (PREV_CITY_DYN_JSON) — never inside
 * PREV_CYCLE_STATE_JSON, which sits ~8.2 KB against the 9 KB prop cap.
 *
 * Offline proof, no Sheet: the real Phase-1 loader and Phase-9/10 saver run in a vm with the
 * carry-forward layers stubbed (prop + Carry_Forward_Store ring). Numbers are synthetic fixtures.
 * Run: node scripts/cityDynamicsCarry.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const load = (sb, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sb, { filename: rel });

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}

function world() {
  const props = {}; const store = { rows: [['Key', 'Cycle', 'UpdatedAt', 'JSON']] };
  const sb = { Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, Date, isFinite, isNaN, parseFloat,
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props) ? props[k] : null,
      setProperty: (k, v) => { if (String(v).length > 9216) throw new Error('Argument too large: value'); props[k] = String(v); }, deleteProperty: k => { delete props[k]; } }) },
    persistWithRetry_: fn => fn(), appendRowWithRetry_: (sh, row) => sh.appendRow(row),
    safeRand_: () => () => 0.5, recordRipple_: () => true, compactMediaEffects_: () => null, compactCrisisArcs_: x => x, compactCrimeSpikes_: () => [] };
  vm.createContext(sb);
  load(sb, 'phase01-config/loadPreviousEvening.js');
  load(sb, 'phase09-digest/finalizeCycleState.js');
  return { sb, props, store };
}
function ctxFor(cycle, extra) {
  return { config: { cycleCount: cycle, rngSeed: 5 }, ss: { getSheetByName: () => null }, writeIntents: [], mode: {},
    summary: Object.assign({ cycleId: cycle, season: 'Fall', month: 10, simMonth: 10, holiday: 'none', sportsSeason: 'off-season', economicMood: 55, economicRipples: [] }, extra || {}) };
}
const CARRIER = { sentiment: 0.314, traffic: 1.0449, retail: 0.97, tourism: 1.12, nightlife: 1.03, publicSpaces: 0.99,
  culturalActivity: 1.07, communityEngagement: 1.01, label: 'steady', nested: { x: 1 } };

console.log('engine.195 — city dynamics carrier');

{
  const w = world();
  const c = w.sb.compactCityDynamicsCarrier_({ previousCityDynamics: CARRIER });
  check('compact: numbers only, two decimals', c && c.sentiment === 0.31 && c.traffic === 1.04 && c.label === undefined && c.nested === undefined, JSON.stringify(c));
  check('compact: well under 1 KB (' + JSON.stringify(c).length + ' chars)', JSON.stringify(c).length < 1000);
  check('compact: nothing to carry → null', w.sb.compactCityDynamicsCarrier_({}) === null && w.sb.compactCityDynamicsCarrier_({ previousCityDynamics: { a: 'x' } }) === null);
}

{
  const w = world();
  w.props.PREV_CYCLE_STATE_JSON = JSON.stringify({ cycle: 109, econMood: 57 }); w.props.PREV_CYCLE_STATE_JSON_CYCLE = '109';
  const ctx = ctxFor(110);
  w.sb.loadPreviousCycleState_(ctx);
  check('seed: no carrier blob → previousCityDynamics absent, no throw (first fire is graceful)', ctx.summary.previousCityDynamics === undefined);
}

{
  const w = world();
  const A = ctxFor(110, { previousCityDynamics: CARRIER, cityDynamics: { sentiment: 0.4 } });
  w.sb.finalizeCycleState_(A);
  w.sb.savePreviousCycleState_(A);
  check('save: PREV_CITY_DYN_JSON written for cycle 110', typeof w.props.PREV_CITY_DYN_JSON === 'string' && w.props.PREV_CITY_DYN_JSON_CYCLE === '110', JSON.stringify(Object.keys(w.props)));
  check('save: carrier is NOT inside PREV_CYCLE_STATE_JSON', w.props.PREV_CYCLE_STATE_JSON && JSON.parse(w.props.PREV_CYCLE_STATE_JSON).previousCityDynamics === undefined);
  const B = ctxFor(111);
  w.sb.loadPreviousCycleState_(B);
  const p = B.summary.previousCityDynamics;
  check('next Cycle: the momentum blend opens on last week\'s pre-boost mood (sentiment ' + (p && p.sentiment) + ')', p && p.sentiment === 0.31 && p.tourism === 1.12, JSON.stringify(p));
  check('next Cycle: econ mood seed unaffected beside it (engine.221)', B.summary.economicMood === 55);
  const C = ctxFor(111, { previousCityDynamics: { sentiment: -0.2 } });
  w.sb.loadPreviousCycleState_(C);
  check('seed never overwrites a carrier already on S', C.summary.previousCityDynamics.sentiment === -0.2);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
