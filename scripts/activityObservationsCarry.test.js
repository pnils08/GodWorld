#!/usr/bin/env node
'use strict';

/**
 * engine.228 — the relative gates get a real baseline.
 *
 * applyCityDynamics_ builds S.activityObservations fresh every Cycle and nothing carried it, so
 * the "6-Cycle rolling average" every engine.185/188 relative gate divides by was this Cycle's
 * own count: every ratio read exactly 1 and none of those gates ever fired. Offline proof, no
 * Sheet: the real Phase-1 loader, the real Phase-2 city dynamics and the real Phase-10 saver in a
 * vm with the carry layers stubbed (the engine.219 harness). Every number is a fixture.
 * Run: node scripts/activityObservationsCarry.test.js
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
    safeRand_: () => () => 0.5, recordRipple_: () => true, safePhaseCall_: (ctx, label, fn) => fn(), compactMediaEffects_: () => null, compactCrisisArcs_: x => x, compactCrimeSpikes_: () => [] };
  vm.createContext(sb);
  load(sb, 'phase01-config/loadPreviousEvening.js');
  load(sb, 'phase06-analysis/economicRippleEngine.js');
  load(sb, 'phase02-world-state/applyCityDynamics.js');
  load(sb, 'phase09-digest/finalizeCycleState.js');
  return { sb, props, store };
}
function ctxFor(cycle, extra) {
  return { config: { cycleCount: cycle, rngSeed: 5, econMoodInertia: 0.3 }, ss: { getSheetByName: () => null }, writeIntents: [], mode: {},
    summary: Object.assign({ cycleId: cycle, season: 'Spring', month: 4, simMonth: 4, holiday: 'none', sportsSeason: 'off-season', weather: { type: 'clear', impact: 1 },
      neighborhoodState: {}, neighborhoodEconomies: {}, neighborhoodDemographics: {}, economicMood: 55, economicRipples: [], worldEvents: [], storySeeds: [], crimeByNeighborhood: {} }, extra || {}) };
}
const obs = (cycle, events, seeds) => ({ cycle, events, storySeedCount: seeds, media: 8, crime: 5, shockCount: events });

console.log('engine.228 — activity observations carry');

// ── compact ──────────────────────────────────────────────────────────────────
{
  const w = world();
  const hist = []; for (let c = 90; c < 108; c++) hist.push(Object.assign(obs(c, 10, 30), { extra: 'dropped' }));
  const c = w.sb.compactActivityObservations_({ history: hist, latest: {}, rolling: {} });
  check('compact: keeps the last 12 entries only', c && c.history.length === 12 && c.history[0].cycle === 96, c && c.history.length);
  check('compact: six numbers per entry, nothing else', c.history.every(o => Object.keys(o).length === 6 && o.extra === undefined));
  check('compact: 12 entries fit well under 1 KB (' + JSON.stringify(c).length + ' chars)', JSON.stringify(c).length < 1000);
  check('compact: empty → null', w.sb.compactActivityObservations_({ history: [] }) === null && w.sb.compactActivityObservations_(null) === null);
}

// ── seed ─────────────────────────────────────────────────────────────────────
{
  const w = world();
  const ctxNo = ctxFor(108);
  w.sb.loadPreviousCycleState_(ctxNo);
  check('seed: no blob → S.activityObservations absent, no throw (first fire is graceful)', ctxNo.summary.activityObservations === undefined);
  const w2 = world();
  w2.props.PREV_CYCLE_STATE_JSON = JSON.stringify({ cycle: 107, econMood: 55 }); w2.props.PREV_CYCLE_STATE_JSON_CYCLE = '107';
  w2.props.PREV_ACTIVITY_OBS_JSON = JSON.stringify({ history: [obs(105, 9, 30), obs(106, 11, 33), obs(107, 10, 31)] }); w2.props.PREV_ACTIVITY_OBS_JSON_CYCLE = '107';
  const ctx = ctxFor(108);
  w2.sb.loadPreviousCycleState_(ctx);
  const ao = ctx.summary.activityObservations;
  check('seed: three Cycles of history opened', ao && ao.history.length === 3 && ao.history[2].cycle === 107 && ao.carried === true, JSON.stringify(ao));
}

// ── the defect, then the fix: Phase 2 on a carried history ───────────────────
{
  // before: one entry → rolling == latest → every ratio 1
  const w0 = world();
  const A0 = ctxFor(108, { eventsGenerated: 15, storySeeds: new Array(45) });
  w0.sb.applyCityDynamics_(A0);
  const ao0 = A0.summary.activityObservations;
  check('uncarried: history holds one entry and rolling == latest (the ratio is 1 by construction)', ao0.history.length === 1 && ao0.rolling.events === ao0.latest.events, JSON.stringify(ao0.rolling));

  // carried: three ordinary Cycles (events 10) then a busy one (15) → rolling < latest
  const w = world();
  w.props.PREV_CYCLE_STATE_JSON = JSON.stringify({ cycle: 107, econMood: 55 }); w.props.PREV_CYCLE_STATE_JSON_CYCLE = '107';
  w.props.PREV_ACTIVITY_OBS_JSON = JSON.stringify({ history: [obs(105, 10, 30), obs(106, 10, 30), obs(107, 10, 30)] }); w.props.PREV_ACTIVITY_OBS_JSON_CYCLE = '107';
  const A = ctxFor(108, { eventsGenerated: 15, storySeeds: new Array(45) });
  w.sb.loadPreviousCycleState_(A);
  w.sb.applyCityDynamics_(A);
  const ao = A.summary.activityObservations;
  check('carried: Phase 2 pushes on top of the carried history (4 entries)', ao.history.length === 4 && ao.history[3].cycle === 108, ao.history.length);
  check('carried: rolling events = mean of the four (11.25), latest 15 — the ratio is 1.33, no longer 1', ao.rolling.events === 11.25 && ao.latest.events === 15, JSON.stringify(ao.rolling) + ' ' + JSON.stringify(ao.latest));
  // the engine.188 gate reads that ratio: a busier-than-usual Cycle lifts sentiment vs the same Cycle with no baseline
  const flat = world();
  flat.props.PREV_CYCLE_STATE_JSON = JSON.stringify({ cycle: 107, econMood: 55 }); flat.props.PREV_CYCLE_STATE_JSON_CYCLE = '107';
  flat.props.PREV_ACTIVITY_OBS_JSON = JSON.stringify({ history: [obs(105, 15, 45), obs(106, 15, 45), obs(107, 15, 45)] }); flat.props.PREV_ACTIVITY_OBS_JSON_CYCLE = '107';
  const F = ctxFor(108, { eventsGenerated: 15, storySeeds: new Array(45) });
  flat.sb.loadPreviousCycleState_(F);
  flat.sb.applyCityDynamics_(F);
  // engine.188's 1.25 tier: publicSpaces ×1.04, culturalActivity ×1.03 (sentiment moves only at the 1.5 tier)
  check('the relative gate fires: a Cycle 1.33× its own baseline lifts public spaces and cultural activity vs the same Cycle on a flat baseline',
    A.summary.cityDynamics.publicSpaces > F.summary.cityDynamics.publicSpaces && A.summary.cityDynamics.culturalActivity > F.summary.cityDynamics.culturalActivity,
    A.summary.cityDynamics.publicSpaces + ' vs ' + F.summary.cityDynamics.publicSpaces);

  // Phase 10 saves it on its own key; next Cycle opens on five entries
  w.sb.finalizeCycleState_(A);
  w.sb.savePreviousCycleState_(A);
  check('save: PREV_ACTIVITY_OBS_JSON written for cycle 108, not inside PREV_CYCLE_STATE_JSON',
    typeof w.props.PREV_ACTIVITY_OBS_JSON === 'string' && w.props.PREV_ACTIVITY_OBS_JSON_CYCLE === '108' && JSON.parse(w.props.PREV_CYCLE_STATE_JSON).activityObservations === undefined);
  const B = ctxFor(109, { eventsGenerated: 10, storySeeds: new Array(30) });
  w.sb.loadPreviousCycleState_(B);
  check('next Cycle: opens on the four carried entries', B.summary.activityObservations.history.length === 4);
  w.sb.applyCityDynamics_(B);
  check('next Cycle: five entries after Phase 2, rolling over the last six', B.summary.activityObservations.history.length === 5 && B.summary.activityObservations.rolling.events === 11);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
