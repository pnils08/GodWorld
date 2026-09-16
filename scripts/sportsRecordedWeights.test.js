#!/usr/bin/env node
'use strict';
// engine.210: synthetic feed, isolated VM, no external services or persistence.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const s = { Logger: { log() {} }, inWorldStamp_: () => 'C901' };
vm.createContext(s);
for (const file of ['phase02-world-state/applySportsSeason.js',
  'phase02-world-state/applySeasonWeights.js', 'phase04-events/worldEventsEngine.js']) {
  vm.runInContext(read(file), s, { filename: file });
}
const plain = value => JSON.parse(JSON.stringify(value));
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (err) { failed++; console.error(`FAIL ${name}: ${err.message}`); }
}
function context(rows = [], config = {}) {
  return { config, summary: { cycleId: 901, season: 'Spring' }, ss: {
    getSheetByName: name => name !== 'Oakland_Sports_Feed' ? null : {
      getDataRange: () => ({ getValues: () => [
        ['Cycle', 'SeasonType', 'EventType', 'TeamsUsed'], ...rows
      ] })
    }
  } };
}
// Existing franchise key is a parser input; these are non-canon test rows.
const row = (phase, cycle = 901) => [cycle, phase, 'game-result', "A's"];
function run(rows, config) {
  const ctx = context(rows, config);
  s.applySportsSeason_(ctx);
  s.applySeasonalWeights_(ctx);
  return ctx;
}
const baseline = plain(run([]).summary.seasonal);
for (const [phase, sports, event, nightlife] of [
  ['late-season', 1.8, 1.44, 1], ['playoffs', 2, 1.56, 1.2],
  ['championship', 2.5, 1.8, 1.4]
]) test(`recorded ${phase} affects existing weights`, () => {
  const state = run([row(phase)]).summary;
  assert.strictEqual(state.seasonal.sportsWeight, sports);
  assert(Math.abs(state.seasonal.eventWeight - event) < 1e-12);
  assert.strictEqual(state.seasonal.nightlifeWeight, nightlife);
  assert.strictEqual(state.sportsAtmosphereEnabled, false);
});
for (const [name, rows] of [['empty', []], ['historical', [row('championship', 900)]],
  ['unknown', [row('SYNTHETIC_UNKNOWN_PHASE')]], ['off-season', [row('off-season')]]]) {
  test(`${name} feed preserves non-sports weights`, () => {
    const state = run(rows).summary;
    assert.deepStrictEqual(plain(state.seasonal), baseline);
    assert.strictEqual(state.sportsAtmosphereEnabled, false);
  });
}
test('override retains coefficients and atmosphere license', () => {
  const state = run([row('preseason')], { sportsState_Oakland: 'championship' }).summary;
  assert.strictEqual(state.seasonal.sportsWeight, 2.5);
  assert.strictEqual(state.sportsAtmosphereEnabled, true);
});
test('unattributed sports state remains gated', () => {
  const ctx = context();
  ctx.summary.sportsSeason = 'championship';
  s.applySeasonalWeights_(ctx);
  assert.deepStrictEqual(plain(ctx.summary.seasonal), baseline);
});
// Run the actual adjacent phase closures from both orchestration paths.
const pairs = [...read('phase01-config/godWorldEngine2.js').matchAll(/  safePhaseCall_\(ctx, 'Phase2-(?:SportsSeason|SeasonalWeights)'[^\n]+\n  safePhaseCall_\(ctx, 'Phase2-(?:SportsSeason|SeasonalWeights)'[^\n]+/g)];
test('both Cycle entry paths covered', () => assert.strictEqual(pairs.length, 2));
pairs.forEach((pair, i) => test(`Cycle path ${i + 1} weights current sports`, () => {
  s.ctx = context([row('playoffs')]);
  s.safePhaseCall_ = (_ctx, _label, fn) => fn();
  vm.runInContext(pair[0], s);
  assert.strictEqual(s.ctx.summary.sportsSeason, 'playoffs');
  assert.strictEqual(s.ctx.summary.seasonal.sportsWeight, 2);
  assert.strictEqual(s.ctx.summary.sportsAtmosphereEnabled, false);
}));
function rng(seed) {
  let n = seed;
  return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
}
const atmosphere = ['playoff watch party overflow', 'fan altercation', 'scalping bust',
  'sports bar capacity issue', 'honking celebration complaint', 'championship crowd surge',
  'victory celebration damage', 'championship parade prep', 'trophy viewing line chaos',
  'citywide honking complaint'];
function events(seed, oldWeights, override) {
  const ctx = run([row('championship')], override ? { sportsState_Oakland: 'championship' } : {});
  if (oldWeights) ctx.summary.seasonal = plain(baseline);
  ctx.rng = rng(seed);
  s.worldEventsEngine_(ctx);
  return plain(ctx.summary.worldEvents);
}
test('real events change; dedicated sports atmosphere stays gated', () => {
  let changed = 0, control = 0;
  for (let seed = 1; seed <= 128; seed++) {
    const actual = events(seed, false, false);
    if (JSON.stringify(actual) !== JSON.stringify(events(seed, true, false))) changed++;
    for (const event of actual) assert(!atmosphere.includes(event.description));
    for (const event of events(seed, false, true)) if (atmosphere.includes(event.description)) control++;
  }
  assert(changed > 0, 'matched seeds must produce changed events from recorded weights');
  assert(control > 0, 'positive control must reach guarded atmosphere');
  console.log(`Event proof: ${changed}/128 matched seeds changed; ${control} override atmosphere events`);
});
console.log(`sportsRecordedWeights.test.js: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
