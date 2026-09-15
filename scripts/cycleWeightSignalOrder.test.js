#!/usr/bin/env node
'use strict';

/**
 * engine.224 — the cycle-weight signal is scored after the Phase-8 integration that writes its inputs.
 *
 * Measured 2026-09-15 (advisor catch on engine.220): applyCycleWeight_ was scheduled at
 * Phase8-CycleWeightSignal BEFORE Phase8-V3Integration, yet it reads S.mediaEffects (2 terms, +2 each),
 * S.domainPresence (domainTracker_) and S.storyHooks (storyHookEngine_) — all written inside V3Integration.
 * Before engine.220 the Phase-7 media run fed the media terms; domains and hooks were always empty/stale.
 * After engine.220 all three were dead at scoring time. The signal's only consumers are Phase 9/10
 * (World_Population row, Riley_Digest, monthly reports), so it moves after V3Integration.
 *
 * Offline regression on the real scheduler call expressions (both entry points), the real scorer and the
 * real integration; the V3 modules are stubbed to write their fields. Synthetic fixtures only.
 * Run: node scripts/cycleWeightSignalOrder.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const acorn = require('acorn');
const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const source = read('phase01-config/godWorldEngine2.js');
const ast = acorn.parse(source, { ecmaVersion: 2020 });
const LABELS = ['Phase8-CycleWeightSignal', 'Phase8-V3Integration'];

function visit(node, calls) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression' && node.callee.name === 'safePhaseCall_' &&
      node.arguments[1] && LABELS.includes(node.arguments[1].value)) calls.push(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => visit(child, calls));
    else if (value && typeof value === 'object') visit(value, calls);
  }
}
const schedules = [];
for (const fn of ast.body.filter(n => n.type === 'FunctionDeclaration')) {
  const calls = []; visit(fn.body, calls);
  if (calls.length) schedules.push({ name: fn.id.name, calls });
}
assert.strictEqual(schedules.length, 2, 'both engine entry points are exercised');

function world() {
  const sb = {
    Logger: { log: () => {} }, safeRand_: () => () => 0.5, safePhaseCall_: (ctx, label, fn) => fn(),
    ctx: { config: { cycleCount: 8000 }, ss: { getSheetByName: () => null }, writeIntents: [],
      summary: { cycleId: 8000, season: 'Spring', month: 4, holiday: 'none', holidayPriority: 'none', sportsSeason: 'off-season',
        worldEvents: [], citizenEvents: [], eventArcs: [], storySeeds: [], cityDynamics: { sentiment: 0.1 }, weather: { impact: 1 } } }
  };
  vm.createContext(sb);
  for (const rel of ['phase09-digest/applyCycleWeight.js', 'phase08-v3-chicago/v3Integration.js']) vm.runInContext(read(rel), sb, { filename: rel });
  // The V3 modules, as writers of the scorer's inputs.
  sb.domainTracker_ = ctx => { ctx.summary.domainPresence = { CIVIC: 4, BUSINESS: 1, SPORTS: 1, SAFETY: 1, HEALTH: 1, WEATHER: 1 }; };
  sb.storyHookEngine_ = ctx => { ctx.summary.storyHooks = [{ priority: 3 }, { priority: 3 }, { priority: 4 }]; };
  sb.runMediaFeedbackEngine_ = ctx => { ctx.summary.mediaEffects = { coverageIntensity: 'saturated', crisisSaturation: 0.7 }; };
  sb.textureTriggerEngine_ = () => {}; sb.chicagoSatelliteEngine_ = () => {};
  return sb;
}

let failures = 0, passed = 0;
for (const schedule of schedules) {
  try {
    const sb = world();
    const seen = schedule.calls.map(c => c.arguments[1].value);
    assert.deepStrictEqual(seen, ['Phase8-V3Integration', 'Phase8-CycleWeightSignal'], 'integration writes, then the signal scores: saw ' + seen.join(','));
    for (const call of schedule.calls) vm.runInContext(source.slice(call.start, call.end), sb);
    const S = sb.ctx.summary;
    const reason = String(S.cycleWeightReason || '');
    for (const term of ['Media saturation', 'Crisis dominating media', 'Domain saturation', 'Wide domain spread', '3 high-priority story hooks']) {
      assert(reason.indexOf(term) >= 0, 'the score saw this Cycle\'s ' + term + ' (reason: ' + reason + ')');
    }
    passed++;
    console.log('PASS ' + schedule.name + ': ' + S.cycleWeight + ' (' + S.cycleWeightScore + ')');
  } catch (error) {
    failures++;
    console.error('FAIL ' + schedule.name + ': ' + error.message);
  }
}
console.log(passed + ' entry points passed, ' + failures + ' failed');
process.exitCode = failures ? 1 : 0;
