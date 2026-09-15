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
const obs = (cycle, events, seeds) => ({ cycle, events, storySeedCount: seeds, media: 8, crime: 5, shockCount: 10 });   // shockCount held flat: engine.185's shock ratio is a separate gate on world-event volume

console.log('engine.228 — activity observations carry');

// ── compact: taken at Phase 9 from the end-of-Cycle counts ───────────────────
{
  const w = world();
  const S = { cycleId: 108, eventsGenerated: 12, storySeeds: new Array(31), worldEvents: new Array(9), crimeSpikes: [1, 2], activityObservations: { history: [] } };
  const c = w.sb.compactActivityObservations_(S);
  check('compact: one entry from this Cycle\'s real counts', c && c.history.length === 1 && JSON.stringify(c.history[0]) === JSON.stringify({ cycle: 108, events: 12, storySeedCount: 31, media: 0, crime: 2, shockCount: 9 }), JSON.stringify(c));
  const hist = []; for (let cy = 90; cy < 108; cy++) hist.push(Object.assign(obs(cy, 10, 30), { extra: 'dropped' }));
  const c2 = w.sb.compactActivityObservations_(Object.assign({}, S, { activityObservations: { history: hist } }));
  check('compact: appends to the carried history, keeps the last 12', c2.history.length === 12 && c2.history[11].cycle === 108 && c2.history[0].cycle === 97, c2.history.length);
  check('compact: six numbers per entry, nothing else', c2.history.every(o => Object.keys(o).length === 6 && o.extra === undefined));
  check('compact: 12 entries fit well under 1 KB (' + JSON.stringify(c2).length + ' chars)', JSON.stringify(c2).length < 1000);
  const c3 = w.sb.compactActivityObservations_(Object.assign({}, S, { activityObservations: { history: [obs(108, 0, 0)] } }));
  check('compact: never two entries for one Cycle (a stale same-Cycle entry is replaced)', c3.history.length === 1 && c3.history[0].events === 12);
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
  // first fire: nothing carried, nothing happened yet → one empty observation, ratio 1 by construction
  const w0 = world();
  const A0 = ctxFor(108);
  w0.sb.applyCityDynamics_(A0);
  const ao0 = A0.summary.activityObservations;
  check('first fire: Phase 2 records nothing (no push), latest is this Cycle\'s empty counts, rolling == latest', ao0.history.length === 0 && ao0.latest.events === 0 && ao0.rolling.events === ao0.latest.events, JSON.stringify(ao0));

  // carried: three ordinary nights (10 events) then a busy one (15) → "now" = last night 15, baseline = the three before = 10
  const w = world();
  w.props.PREV_CYCLE_STATE_JSON = JSON.stringify({ cycle: 107, econMood: 55 }); w.props.PREV_CYCLE_STATE_JSON_CYCLE = '107';
  w.props.PREV_ACTIVITY_OBS_JSON = JSON.stringify({ history: [obs(104, 10, 30), obs(105, 10, 30), obs(106, 10, 30), obs(107, 15, 45)] }); w.props.PREV_ACTIVITY_OBS_JSON_CYCLE = '107';
  const A = ctxFor(108);
  w.sb.loadPreviousCycleState_(A);
  w.sb.applyCityDynamics_(A);
  const ao = A.summary.activityObservations;
  check('carried: Phase 2 leaves the history as carried (4 entries, no Phase-2 push)', ao.history.length === 4 && ao.history[3].cycle === 107, ao.history.length);
  check('carried: latest = last night (15), rolling = the nights before it (10) — the ratio is 1.5, no longer 1', ao.latest.events === 15 && ao.rolling.events === 10, JSON.stringify(ao.rolling) + ' ' + JSON.stringify(ao.latest));
  // engine.188's 1.5 tier: publicSpaces ×1.08, culturalActivity ×1.06, sentiment +0.05 vs the same Cycle on a flat baseline
  const flat = world();
  flat.props.PREV_CYCLE_STATE_JSON = JSON.stringify({ cycle: 107, econMood: 55 }); flat.props.PREV_CYCLE_STATE_JSON_CYCLE = '107';
  flat.props.PREV_ACTIVITY_OBS_JSON = JSON.stringify({ history: [obs(104, 15, 45), obs(105, 15, 45), obs(106, 15, 45), obs(107, 15, 45)] }); flat.props.PREV_ACTIVITY_OBS_JSON_CYCLE = '107';
  const F = ctxFor(108);
  flat.sb.loadPreviousCycleState_(F);
  flat.sb.applyCityDynamics_(F);
  check('the relative gate fires: a night 1.5× its own baseline lifts public spaces, cultural activity and sentiment vs the same night on a flat baseline',
    A.summary.cityDynamics.publicSpaces > F.summary.cityDynamics.publicSpaces && A.summary.cityDynamics.culturalActivity > F.summary.cityDynamics.culturalActivity && A.summary.cityDynamics.sentiment > F.summary.cityDynamics.sentiment,
    A.summary.cityDynamics.sentiment + ' vs ' + F.summary.cityDynamics.sentiment);

  // Phase 9 takes this Cycle's observation from the real counts and saves it on its own key
  A.summary.eventsGenerated = 12; A.summary.storySeeds = new Array(31); A.summary.worldEvents = new Array(9);
  w.sb.finalizeCycleState_(A);
  w.sb.savePreviousCycleState_(A);
  check('save: PREV_ACTIVITY_OBS_JSON written for cycle 108, not inside PREV_CYCLE_STATE_JSON',
    typeof w.props.PREV_ACTIVITY_OBS_JSON === 'string' && w.props.PREV_ACTIVITY_OBS_JSON_CYCLE === '108' && JSON.parse(w.props.PREV_CYCLE_STATE_JSON).activityObservations === undefined);
  const saved = JSON.parse(w.props.PREV_ACTIVITY_OBS_JSON).history;
  check('save: five entries, the new one carrying the real end-of-Cycle counts', saved.length === 5 && saved[4].cycle === 108 && saved[4].events === 12 && saved[4].storySeedCount === 31 && saved[4].shockCount === 9, JSON.stringify(saved[4]));
  const B = ctxFor(109);
  w.sb.loadPreviousCycleState_(B);
  w.sb.applyCityDynamics_(B);
  const aoB = B.summary.activityObservations;
  check('next Cycle: latest = Cycle 108\'s real observation (12 events), rolling over the four nights before it (11.25)', aoB.latest.events === 12 && aoB.rolling.events === 11.25, JSON.stringify(aoB.latest) + ' ' + JSON.stringify(aoB.rolling));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
