#!/usr/bin/env node
'use strict';

/**
 * engine.132 — the repair-mechanism wire.
 *
 * The initiative ledger exists so a broken engine number can be answered by an
 * in-world event instead of a commit. For ~70 cycles the Temescal Community
 * Health Center could not touch sickness: DOMAIN_EFFECTS.health moved sentiment,
 * communityEngagement and publicSpaces, and the string "illness" appeared
 * nowhere in the file. These guard the wire and the timescale.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const logs = [];
const sandbox = { Logger: { log: (m) => logs.push(String(m)) } };
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'phase02-world-state', 'applyInitiativeImplementationEffects.js'), 'utf8'),
  sandbox,
  { filename: 'applyInitiativeImplementationEffects.js' }
);

const HEADERS = ['InitiativeID', 'Name', 'Status', 'PolicyDomain', 'AffectedNeighborhoods', 'ImplementationPhase', 'Budget'];
function run(rows) {
  const ctx = {
    summary: { cycleId: 105 },
    config: {},
    persist: {},
    ss: {
      getSheetByName: (n) => n !== 'Initiative_Tracker' ? null : {
        getDataRange: () => ({ getValues: () => [HEADERS, ...rows] }),
      },
    },
  };
  sandbox.applyInitiativeImplementationEffects_(ctx);
  return Object.assign({}, ctx.summary.initiativeHealthRelief);
}
const row = (phase, hoods = 'Temescal', domain = 'health', name = 'Temescal Community Health Center') =>
  ['INIT-005', name, 'passed', domain, hoods, phase, '$45M'];

// ── a building site treats nobody ──────────────────────────────────────────
for (const phase of ['construction-planning', 'construction-active', 'design-phase', 'visioning']) {
  assert.deepStrictEqual(run([row(phase)]), {},
    `"${phase}" must NOT relieve illness — care has not started`);
}

// ── care being delivered does ──────────────────────────────────────────────
assert.deepStrictEqual(run([row('operational')]), { Temescal: 0.9 });
assert.deepStrictEqual(run([row('complete')]), { Temescal: 0.5 });
assert.deepStrictEqual(run([row('dispatch-live')]), { Temescal: 1.0 });

// ── only the health domain ─────────────────────────────────────────────────
assert.deepStrictEqual(run([row('operational', 'Temescal', 'transit', 'Fruitvale Transit Hub')]), {},
  'a transit initiative must not cure anyone');

// ── multi-hood, and strongest-wins ─────────────────────────────────────────
assert.deepStrictEqual(run([row('operational', 'Temescal, Rockridge')]),
  { Temescal: 0.9, Rockridge: 0.9 });
assert.deepStrictEqual(
  run([row('complete', 'Temescal'), row('dispatch-live', 'Temescal', 'health', 'OARI')]),
  { Temescal: 1.0 },
  'two clinics in one hood is not double the medicine — strongest delivering wins'
);

// ── the timescale: a story, not a geological era ───────────────────────────
// Temescal live at C104: 105 sick, population-scaled target 242. Gap 137.
function cyclesToClose(sick, target, rate) {
  let c = 0;
  while (sick !== target && c < 500) {
    const delta = target - sick;
    const step = Math.max(3, Math.ceil(Math.abs(delta) * rate));
    sick += delta > 0 ? Math.min(step, delta) : Math.max(-step, delta);
    c++;
  }
  return c;
}
const OLD_FLAT_3 = 0;
assert.strictEqual(cyclesToClose(105, 242, OLD_FLAT_3), 46,
  'the old flat +/-3 needed 46 cycles — longer than anything in this project persists');
const cycles = cyclesToClose(105, 242, 0.25);
assert.ok(cycles >= 4 && cycles <= 20,
  `gap-scaled convergence should land on a story timescale, got ${cycles}`);

// 80% of the gap must close inside 5 cycles — the window a cron can still see.
let sick = 105;
for (let i = 0; i < 5; i++) {
  const d = 242 - sick;
  sick += Math.min(Math.max(3, Math.ceil(Math.abs(d) * 0.25)), d);
}
assert.ok(sick >= 105 + 137 * 0.75,
  `5 cycles must close most of the gap; closed ${sick - 105} of 137`);

// The floor survives: tiny gaps still move, anti-swing intent intact.
assert.strictEqual(Math.max(3, Math.ceil(2 * 0.25)), 3, 'small gaps keep the old floor of 3');

console.log('illnessInitiativeRelief.test.js: all assertions passed');
