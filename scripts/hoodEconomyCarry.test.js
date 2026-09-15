#!/usr/bin/env node
'use strict';

/**
 * engine.219 — a hood remembers last Cycle's economy.
 *
 * Phase 2 (applyCityDynamics_) read S.neighborhoodEconomies before the Phase-6 producer ran and
 * nothing carried it, so it was `{}` every Cycle: the cluster-economy and per-hood micro branches
 * never fired. The post-migration ±2 per hood died at the Cycle boundary.
 *
 * Offline proof, no Sheet: the real Phase-1 loader, the real Phase-6 producer, and the real Phase-10
 * saver run in a vm with the carry-forward layers stubbed (prop + Carry_Forward_Store ring). The hood
 * blob rides its OWN key (PREV_HOOD_ECON_JSON, ~400 chars for 22 hoods) — never inside
 * PREV_CYCLE_STATE_JSON, which sits ~8.2 KB against the 9 KB prop cap.
 * Every hood and number below is a synthetic fixture. Run: node scripts/hoodEconomyCarry.test.js
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
const HOODS = ['Downtown', 'Temescal', 'Laurel', 'West Oakland', 'Fruitvale', 'Jack London', 'Rockridge', 'Adams Point', 'Grand Lake',
  'Piedmont Ave', 'Chinatown', 'Brooklyn', 'Eastlake', 'Glenview', 'Dimond', 'Ivy Hill', 'San Antonio', 'KONO', 'Lake Merritt', 'Uptown',
  'Baylight District', 'East Oakland'];
function hoodState() { const o = {}; HOODS.forEach((h, i) => { o[h] = { employerCharacter: i % 3 === 0 ? 'retail' : (i % 3 === 1 ? 'arts' : 'services'), boomIndex: h === 'Baylight District' ? 1 : 0 }; }); return o; }

function world() {
  const props = {}; const store = { rows: [['Key', 'Cycle', 'UpdatedAt', 'JSON']] };
  const sheet = { getDataRange: () => ({ getValues: () => store.rows.map(r => r.slice()) }),
    getRange: (r) => ({ setValues: v => { store.rows[r - 1] = v[0].slice(); } }), appendRow: row => { store.rows.push(row.slice()); } };
  const sb = { Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, Date, isFinite, isNaN, parseFloat,
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props) ? props[k] : null,
      setProperty: (k, v) => { if (String(v).length > 9216) throw new Error('Argument too large: value'); props[k] = String(v); }, deleteProperty: k => { delete props[k]; } }) },
    persistWithRetry_: fn => fn(), appendRowWithRetry_: (sh, row) => sh.appendRow(row),
    safeRand_: () => () => 0.5, recordRipple_: () => true, compactMediaEffects_: () => null, compactCrisisArcs_: x => x, compactCrimeSpikes_: () => [] };
  vm.createContext(sb);
  load(sb, 'phase01-config/loadPreviousEvening.js');
  load(sb, 'phase06-analysis/economicRippleEngine.js');
  load(sb, 'phase09-digest/finalizeCycleState.js');
  return { sb, props, store };
}
function ctxFor(cycle, extra) {
  return { config: { cycleCount: cycle, rngSeed: 5, econMoodInertia: 0.3 }, ss: { getSheetByName: n => n === 'Carry_Forward_Store' ? null : null }, writeIntents: [], mode: {},
    summary: Object.assign({ cycleId: cycle, season: 'Spring', month: 4, simMonth: 4, holiday: 'none', sportsSeason: 'off-season', neighborhoodState: hoodState(), economicMood: 55, economicRipples: [] }, extra || {}) };
}
function ripple(impact, hood, startCycle, duration) {
  return { id: 'SYN_' + hood, type: 'BUSINESS_CONTRACTION', impact, currentStrength: impact, startCycle, endCycle: startCycle + duration,
    neighborhoods: [hood], primaryNeighborhood: hood, sectors: ['retail'], source: 'synthetic' };
}

console.log('engine.219 — hood economic carry');

// ── compact shape and size ───────────────────────────────────────────────────
{
  const w = world();
  const econ = {}; HOODS.forEach((h, i) => { econ[h] = { mood: 50 + i * 0.37, descriptor: 'stable', activeRipples: 1, sectors: ['retail'], isHolidayZone: false, isSportsZone: false }; });
  const c = w.sb.compactNeighborhoodEconomies_(econ);
  check('compact: one number per hood, one decimal', c && HOODS.every(h => typeof c[h] === 'number' && Math.abs(c[h] * 10 - Math.round(c[h] * 10)) < 1e-9), JSON.stringify(c).slice(0, 120));
  check('compact: 22 hoods fit in well under 1 KB (' + JSON.stringify(c).length + ' chars)', JSON.stringify(c).length < 1000);
  check('compact: empty in → null (nothing to carry)', w.sb.compactNeighborhoodEconomies_({}) === null && w.sb.compactNeighborhoodEconomies_(null) === null);
}

// ── seed: Phase 2 opens on last Cycle's hood economies ──────────────────────
{
  const w = world();
  const ctxNo = ctxFor(108);
  w.sb.__ring = null;
  w.sb.loadPreviousCycleState_(ctxNo);
  check('seed: no hood blob → S.neighborhoodEconomies absent, no throw (first fire is graceful)', ctxNo.summary.neighborhoodEconomies === undefined);

  const w2 = world();
  w2.props.PREV_CYCLE_STATE_JSON = JSON.stringify({ cycle: 107, econMood: 58.2 }); w2.props.PREV_CYCLE_STATE_JSON_CYCLE = '107';
  w2.props.PREV_HOOD_ECON_JSON = JSON.stringify({ 'Jack London': 61.4, 'West Oakland': 44.9, 'Temescal': 58.2 }); w2.props.PREV_HOOD_ECON_JSON_CYCLE = '107';
  const ctx = ctxFor(108); delete ctx.summary.economicMood;
  w2.sb.loadPreviousCycleState_(ctx);
  const ne = ctx.summary.neighborhoodEconomies || {};
  check('seed: hood moods carried', ne['Jack London'] && ne['Jack London'].mood === 61.4 && ne['West Oakland'].mood === 44.9, JSON.stringify(ne).slice(0, 160));
  check('seed: descriptor recomputed on the producer\'s scale (61.4 growing, 44.9 sluggish)', ne['Jack London'].descriptor === 'growing' && ne['West Oakland'].descriptor === 'sluggish', JSON.stringify(ne));
  check('seed: carried entries are marked carried', ne['Jack London'].carried === true);
  check('seed: city mood still seeded beside it (221)', ctx.summary.economicMood === 58.2);
}

// ── end to end: produce → save → next Cycle opens on it ─────────────────────
{
  const w = world();
  const A = ctxFor(108, { economicRipples: [ripple(-20, 'West Oakland', 108, 5)] });
  A.ss = { getSheetByName: () => null };
  w.sb.runEconomicRippleEngine_(A);
  const woA = { mood: A.summary.neighborhoodEconomies['West Oakland'].mood };
  const dtA = A.summary.neighborhoodEconomies['Downtown'];
  // advisor check: the producer is untouched — first-Cycle hood response = strength × 1.5 (primary) × sensitivity(1) × 0.1 below the city mood
  check('producer untouched: West Oakland sits 3.0 under the city mood on a −20 primary ripple', Math.abs((A.summary.economicMood - woA.mood) - 3.0) < 0.011, 'city=' + A.summary.economicMood + ' wo=' + woA.mood);
  check('producer untouched: an unaffected hood equals the city mood', Math.abs(dtA.mood - A.summary.economicMood) < 0.011, 'dt=' + dtA.mood);
  // migration's ±2 lands after Phase 6 (simulate the write-back)
  A.summary.neighborhoodEconomies['West Oakland'].mood = Math.round(woA.mood - 2);
  // Phase 9/10: finalize + save (the real functions)
  w.sb.finalizeCycleState_(A);
  w.sb.savePreviousCycleState_(A);
  check('save: PREV_HOOD_ECON_JSON prop written for cycle 108', typeof w.props.PREV_HOOD_ECON_JSON === 'string' && w.props.PREV_HOOD_ECON_JSON_CYCLE === '108', JSON.stringify(Object.keys(w.props)));
  check('save: hood blob is NOT inside PREV_CYCLE_STATE_JSON', w.props.PREV_CYCLE_STATE_JSON && JSON.parse(w.props.PREV_CYCLE_STATE_JSON).neighborhoodEconomies === undefined);
  const B = ctxFor(109);
  w.sb.loadPreviousCycleState_(B);
  const woB = (B.summary.neighborhoodEconomies || {})['West Oakland'];
  check('next Cycle: Phase 2 sees West Oakland\'s post-migration mood (' + (woB && woB.mood) + ')', woB && woB.mood === Math.round(woA.mood - 2), JSON.stringify(woB));
  check('next Cycle: 22 hoods carried', Object.keys(B.summary.neighborhoodEconomies || {}).length === 22);
  // Phase 6 then replaces the carried set with this Cycle's production (the ripple persists via the ring; the carried mood does not stack)
  B.ss = { getSheetByName: () => null };
  B.summary.economicRipples = [Object.assign({}, ripple(-20, 'West Oakland', 108, 5), { currentStrength: -16 })];
  w.sb.runEconomicRippleEngine_(B);
  const woB6 = B.summary.neighborhoodEconomies['West Oakland'];
  check('next Cycle: Phase 6 recomputes from the city mood + the decayed ripple (no stacking on the carry)', Math.abs((B.summary.economicMood - woB6.mood) - 2.4) < 0.011 && woB6.carried !== true, 'city=' + B.summary.economicMood + ' wo=' + woB6.mood);
}
console.log(passed + ' passed, ' + failed + ' failed');
process.exitCode = failed ? 1 : 0;
