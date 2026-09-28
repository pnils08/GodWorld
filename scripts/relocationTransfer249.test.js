#!/usr/bin/env node
'use strict';

/**
 * engine.249 flow half, sign-only (builder 2026-09-28): last Cycle's tracked relocations point
 * this Cycle's between-hood transfer on the hood table. Bounded by each hood's own share of the
 * city's migration, conserving the table total. Offline, synthetic fixtures.
 * Run: node scripts/relocationTransfer249.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}

const src = fs.readFileSync(path.join(ROOT, 'phase03-population/updateNeighborhoodDemographics.js'), 'utf8');
const transfer = new Function(src + '\nreturn relocationTransfer249_;')();
const sum = o => Object.values(o).reduce((a, b) => a + b, 0);

console.log('engine.249 — relocation transfer (sign-only)');
const w = { 'West Oakland': 0.05, Uptown: 0.015, Rockridge: 0.05, Downtown: 0.06, Laurel: 0.05, Fruitvale: 0.775 };
{
  const t = transfer({ 'West Oakland': 8, Uptown: -1, Rockridge: -2, Downtown: -1 }, 170, w);
  check('conserves the table total (Σ transfer = 0)', Math.abs(sum(t)) < 1e-9, JSON.stringify(t));
  check('hoods citizens left lose people; the hood they moved into gains', t['West Oakland'] > 0 && t.Uptown < 0 && t.Rockridge < 0 && t.Downtown < 0);
  check('no hood moves by more than twice its own share of city migration',
    Object.keys(t).every(h => Math.abs(t[h]) <= 2 * 170 * w[h] + 1e-9), JSON.stringify(t));
  check('a hood with no tracked movers is untouched', t.Laurel === undefined && t.Fruitvale === undefined);
  check('the funnel is bounded: West Oakland gains ≤ 2 × its share (' + (t['West Oakland'] || 0).toFixed(1) + ' ≤ 17)', t['West Oakland'] <= 17 + 1e-9);
}
{
  check('no tracked moves → no transfer', Object.keys(transfer(null, 170, w)).length === 0 && Object.keys(transfer({}, 170, w)).length === 0);
  check('one-sided flow (only arrivals seen) → no transfer', Object.keys(transfer({ 'West Oakland': 5 }, 170, w)).length === 0);
  check('no city migration this Cycle → no transfer', Object.keys(transfer({ 'West Oakland': 5, Uptown: -5 }, 0, w)).length === 0);
  check('an off-table hood name is ignored', Object.keys(transfer({ Nowhere: 9, Uptown: -3, Laurel: 3 }, 170, w)).indexOf('Nowhere') < 0);
  const shrink = transfer({ 'West Oakland': 3, Uptown: -3 }, -170, w);
  check('direction comes from the moves, not the city\'s sign (shrinking week)', shrink['West Oakland'] > 0 && shrink.Uptown < 0);
}

// carry: processRelocations_' net flow → PREV_RELOC_FLOW_JSON → next Cycle's S.previousRelocationFlow
{
  const props = {};
  const sb = { Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, Date, isFinite, isNaN, parseFloat,
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props) ? props[k] : null,
      setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; } }) },
    persistWithRetry_: fn => fn(), appendRowWithRetry_: () => {}, safeRand_: () => () => 0.5, recordRipple_: () => true,
    compactMediaEffects_: () => null, compactCrisisArcs_: x => x, compactCrimeSpikes_: () => [] };
  vm.createContext(sb);
  for (const rel of ['phase01-config/loadPreviousEvening.js', 'phase09-digest/finalizeCycleState.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sb, { filename: rel });
  }
  const ctxFor = (c, extra) => ({ config: { cycleCount: c }, ss: { getSheetByName: () => null }, writeIntents: [], mode: {},
    summary: Object.assign({ cycleId: c, economicMood: 55, economicRipples: [] }, extra || {}) });
  const A = ctxFor(110, { relocationNetFlow: { 'West Oakland': 8, Uptown: -1, Rockridge: 0 } });
  sb.finalizeCycleState_(A);
  sb.savePreviousCycleState_(A);
  check('save: PREV_RELOC_FLOW_JSON written for cycle 110, zeros dropped',
    props.PREV_RELOC_FLOW_JSON_CYCLE === '110' && JSON.parse(props.PREV_RELOC_FLOW_JSON).Rockridge === undefined, props.PREV_RELOC_FLOW_JSON);
  const B = ctxFor(111);
  sb.loadPreviousCycleState_(B);
  check('next Cycle opens on last Cycle\'s flow', B.summary.previousRelocationFlow && B.summary.previousRelocationFlow['West Oakland'] === 8 && B.summary.previousRelocationFlow.Uptown === -1,
    JSON.stringify(B.summary.previousRelocationFlow));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
