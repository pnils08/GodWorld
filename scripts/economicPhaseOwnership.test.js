#!/usr/bin/env node
'use strict';

// Offline regression: both real schedulers must run the economy once per Cycle.
// All scenario state below is synthetic and never leaves this VM. Only the
// integration's unrelated modules and external IO are stubbed; economy and the
// intervening migration feedback are real.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const acorn = require('acorn');
const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const source = read('phase01-config/godWorldEngine2.js');
const ast = acorn.parse(source, { ecmaVersion: 2020 });
const labels = ['Phase6-EconomicRipple', 'Phase6-Migration', 'Phase8-V3Integration'];
const schedules = [];

// Execute the actual call expressions in each entry point, so adding another
// scheduled call or changing the invoked implementation cannot hide in a stub.
function visit(node, calls) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression' && node.callee.name === 'safePhaseCall_' &&
      node.arguments[1] && labels.includes(node.arguments[1].value)) calls.push(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => visit(child, calls));
    else if (value && typeof value === 'object') visit(value, calls);
  }
}
for (const fn of ast.body.filter(node => node.type === 'FunctionDeclaration')) {
  const calls = [];
  visit(fn.body, calls);
  if (calls.length) schedules.push({ name: fn.id.name, calls });
}
assert.strictEqual(schedules.length, 2, 'both engine entry points are exercised');

function world(scenario) {
  const counts = { draws: 0, ledger: 0, economy: 0, modules: {} };
  const mapRows = [['Neighborhood', 'CrimeIndex', 'Sentiment', 'RetailVitality', 'EventAttractiveness', 'MigrationFlow'],
    ['SYNTHETIC_TEST_HOOD', 1, 0.2, 1, 1, 0]];
  const mapSheet = { getDataRange: () => ({ getValues: () => mapRows.map(row => row.slice()) }),
    getRange: (r, c) => ({ setValue: value => { mapRows[r - 1][c - 1] = value; } }) };
  const sb = {
    Logger: { log: line => { if (/^runEconomicRippleEngine_.*mood=/.test(line)) counts.economy++; } },
    safeRand_: () => () => { counts.draws++; return 0.5; },
    recordRipple_: () => { counts.ledger++; return true; },
    safePhaseCall_: (ctx, label, fn) => fn(),
    ctx: {
      config: { cycleCount: 8000, rngSeed: 42 },
      ss: { getSheetByName: name => name === 'Neighborhood_Map' ? mapSheet : null },
      summary: {
        cycleId: 8000, season: 'Spring', month: 4, holiday: 'none',
        sportsSeason: 'off-season', economicMood: scenario.mood,
        neighborhoodState: { SYNTHETIC_TEST_HOOD: { employerCharacter: 'retail', boomIndex: 0 } },
        economicRipples: scenario.impact ? [{
          id: 'SYNTHETIC_TEST_RIPPLE', type: 'BUSINESS_CONTRACTION',
          impact: scenario.impact, currentStrength: scenario.impact,
          startCycle: 7999, endCycle: 8003,
          neighborhoods: ['SYNTHETIC_TEST_HOOD'], primaryNeighborhood: 'SYNTHETIC_TEST_HOOD',
          sectors: ['retail'], source: 'Isolated synthetic regression'
        }] : [],
        previousCycleState: { cycle: 7999, migrationDrift: 0 }
      }
    }
  };
  vm.createContext(sb);
  for (const rel of ['phase06-analysis/economicRippleEngine.js', 'phase06-analysis/applyMigrationDrift.js', 'phase08-v3-chicago/v3Integration.js']) {
    vm.runInContext(read(rel), sb, { filename: rel });
  }
  for (const name of ['domainTracker_', 'storyHookEngine_', 'textureTriggerEngine_', 'chicagoSatelliteEngine_', 'runMediaFeedbackEngine_']) {
    sb[name] = () => { counts.modules[name] = (counts.modules[name] || 0) + 1; };
  }
  return { sb, counts };
}
function projection(w) {
  const s = w.sb.ctx.summary;
  return JSON.stringify({ mood: s.economicMood, employment: s.derivedEmploymentRate,
    neighborhoods: s.neighborhoodEconomies, ripples: s.economicRipples, summary: s.economicSummary,
    feedback: s.neighborhoodEconomyFeedback, migration: s.migrationEconomicLink, rngState: s.rngState });
}

let failures = 0, passed = 0;
for (const schedule of schedules) {
  assert.deepStrictEqual(schedule.calls.map(call => call.arguments[1].value), labels);
  for (const scenario of [{ name: 'recovery', mood: 60, impact: 0 },
    { name: 'contraction', mood: 50, impact: -12 }, { name: 'expansion', mood: 50, impact: 12 }]) {
    try {
      const actual = world(scenario), expected = world(scenario);
      for (let cycle = 8000; cycle <= 8001; cycle++) {
        for (const w of [actual, expected]) {
          w.sb.ctx.config.cycleCount = cycle;
          w.sb.ctx.summary.cycleId = cycle;
        }
        expected.sb.runEconomicRippleEngine_(expected.sb.ctx);
        expected.sb.applyMigrationDrift_(expected.sb.ctx);
        for (const call of schedule.calls) vm.runInContext(source.slice(call.start, call.end), actual.sb);
        assert.strictEqual(actual.counts.economy, cycle - 7999, 'one economy calculation per Cycle');
        assert.strictEqual(projection(actual), projection(expected), 'Phase 8 preserves economy plus migration feedback');
        const feedback = actual.sb.ctx.summary.neighborhoodEconomyFeedback.SYNTHETIC_TEST_HOOD;
        assert(feedback, 'real migration feedback executed');
        assert.strictEqual(actual.sb.ctx.summary.neighborhoodEconomies.SYNTHETIC_TEST_HOOD.mood,
          feedback.afterMood, 'the last economic value is the migration consequence');
        assert.strictEqual(actual.counts.draws, expected.counts.draws, 'no second economy RNG consumption');
        assert.strictEqual(actual.counts.ledger, expected.counts.ledger, 'no duplicate ripple attribution');
        for (const count of Object.values(actual.counts.modules)) assert.strictEqual(count, cycle - 7999);
        assert.strictEqual(Object.keys(actual.counts.modules).length, 5, 'all unrelated integration modules still run');
      }
      passed++;
      console.log('PASS ' + schedule.name + ': ' + scenario.name + ', two Cycles');
    } catch (error) {
      failures++;
      console.error('FAIL ' + schedule.name + ': ' + scenario.name + ': ' + error.message);
    }
  }
}
console.log(passed + ' scenarios passed, ' + failures + ' failed');
process.exitCode = failures ? 1 : 0;
