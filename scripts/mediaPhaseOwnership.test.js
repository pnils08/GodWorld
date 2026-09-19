#!/usr/bin/env node
'use strict';

/**
 * engine.220 — media feedback runs ONCE per Cycle, after this Cycle's arcs exist.
 *
 * Measured 2026-09-14: runMediaFeedbackEngine_ was scheduled at Phase7-MediaFeedback AND run again
 * inside Phase8-V3Integration (live C107 log: two `runMediaFeedbackEngine_ v2.3` lines). The second
 * run re-initialises S.mediaEffects (so run 1's analysis was read by nobody), but two side effects
 * are NOT idempotent and doubled every Cycle: amplifyArcsFromCoverage_ adds coverage boost to
 * arc.tension, and applyMediaToCityDynamics_ adds the media shift to S.cityDynamics.sentiment.
 * Intervening inputs: Phase7-ChaosArcs (createChaosArcs_) runs AFTER the Phase-7 call, so only the
 * Phase-8 run ever saw this Cycle's new arcs; S.domainPresence (Phase 8 domainTracker_) is read at
 * :360 and unused. The Phase-8 run is the owner; the Phase-7 schedule line is the duplicate.
 *
 * Offline regression on the real scheduler call expressions (both entry points), the real media
 * engine and the real integration; unrelated v3 modules stubbed. Synthetic fixtures only.
 * Pre-cut on this fixture: 2 runs, sentiment 0.20 → 0.38 (the arc, created after the Phase-7 slot, was
 * amplified once either way — the Phase-8 run is the one that sees it). Post-cut: 1 run, 0.29.
 * Run: node scripts/mediaPhaseOwnership.test.js
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
const LABELS = ['Phase7-MediaFeedback', 'Phase7-ChaosArcs', 'Phase8-V3Integration'];

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
  const counts = { media: 0, modules: {} };
  const sb = {
    Logger: { log: line => { if (/^runMediaFeedbackEngine_ v/.test(line)) counts.media++; } },
    safeRand_: () => () => 0.5, hoodNamesWithScene_: () => [],
    safePhaseCall_: (ctx, label, fn) => fn(),
    ctx: { config: { cycleCount: 8000 }, ss: { getSheetByName: () => null }, writeIntents: [],
      summary: { cycleId: 8000, season: 'Spring', month: 4, holiday: 'none', holidayPriority: 'none', isCreationDay: true,
        sportsSeason: 'playoffs', worldEvents: [], citizenEvents: [], neighborhoodState: {},
        cityDynamics: { sentiment: 0.20 }, eventArcs: [] } }
  };
  vm.createContext(sb);
  for (const rel of ['phase06-analysis/applyShockMonitor.js', 'phase07-evening-media/mediaFeedbackEngine.js', 'phase08-v3-chicago/v3Integration.js']) vm.runInContext(read(rel), sb, { filename: rel });
  // Phase7-ChaosArcs: this Cycle's new arc appears AFTER the Phase-7 media slot.
  sb.createChaosArcs_ = ctx => { ctx.summary.eventArcs.push({ arcId: 'SYNTHETIC_ARC', type: 'sports-run', domainTag: 'sports', phase: 'active', tension: 5 }); };
  for (const name of ['domainTracker_', 'storyHookEngine_', 'textureTriggerEngine_', 'chicagoSatelliteEngine_']) {
    sb[name] = () => { counts.modules[name] = (counts.modules[name] || 0) + 1; };
  }
  return { sb, counts };
}

let failures = 0, passed = 0;
for (const schedule of schedules) {
  try {
    const w = world();
    const seen = schedule.calls.map(c => c.arguments[1].value);
    assert(!seen.includes('Phase7-MediaFeedback'), 'no Phase-7 media schedule line (the duplicate): saw ' + seen.join(','));
    assert.deepStrictEqual(seen, ['Phase7-ChaosArcs', 'Phase8-V3Integration'], 'arcs, then the one media run inside Phase 8');
    for (const call of schedule.calls) vm.runInContext(source.slice(call.start, call.end), w.sb);
    const S = w.sb.ctx.summary;
    assert.strictEqual(w.counts.media, 1, 'media feedback ran once');
    const arc = S.eventArcs[0];
    // playoffs → sports arc boost 0.35 once (two runs read 5.70)
    assert.strictEqual(Math.round(arc.tension * 100) / 100, 5.35, 'this Cycle\'s arc amplified once, by the run that could see it (tension ' + arc.tension + ')');
    // The city sentiment moves by exactly ONE standalone run's shift (two runs moved it twice: 0.20 → 0.38 on this fixture).
    const solo = world(); solo.sb.createChaosArcs_(solo.sb.ctx); solo.sb.runMediaFeedbackEngine_(solo.sb.ctx);
    assert.strictEqual(S.cityDynamics.sentiment, solo.sb.ctx.summary.cityDynamics.sentiment, 'city sentiment shifted once (' + S.cityDynamics.sentiment + ' vs one run ' + solo.sb.ctx.summary.cityDynamics.sentiment + ')');
    assert(S.mediaEffects && S.mediaEffects.arcAmplification.length === 1, 'the persisted media effects carry the arc amplification');
    assert.strictEqual(Object.keys(w.counts.modules).length, 4, 'the four unrelated integration modules still run (economy left the registry in engine.217)');
    passed++;
    console.log('PASS ' + schedule.name);
  } catch (error) {
    failures++;
    console.error('FAIL ' + schedule.name + ': ' + error.message);
  }
}
console.log(passed + ' entry points passed, ' + failures + ' failed');
process.exitCode = failures ? 1 : 0;
