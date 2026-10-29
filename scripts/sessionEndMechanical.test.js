#!/usr/bin/env node
'use strict';

// infrastructure.14 T7 — a ROLLOUT sweep step that cannot run must not read as a clean close.
// Read-only: dryRun skips the sweep and the plans-block write; fs.readFileSync is stubbed for one path only.

const assert = require('assert');
const fs = require('fs');
const { subRolloutLint } = require('./sessionEndMechanical');

const realRead = fs.readFileSync;
const quiet = fn => { const log = console.log; console.log = () => {}; try { return fn(); } finally { console.log = log; } };

// ROLLOUT_PLAN.md unreadable → failed, but the step still lets later steps (pm2 restart, stack check) run
fs.readFileSync = function (p, ...rest) {
  if (String(p).endsWith('docs/engine/ROLLOUT_PLAN.md')) throw new Error('ENOENT: simulated missing ROLLOUT_PLAN.md');
  return realRead.call(this, p, ...rest);
};
try {
  const r = quiet(() => subRolloutLint({ dryRun: true, terminal: 'research-build' }));
  assert.strictEqual(r.ok, true, 'later steps still run');
  assert.strictEqual(r.failed, true, 'the close is marked failed');
} finally {
  fs.readFileSync = realRead;
}

// readable plan → not failed
const r2 = quiet(() => subRolloutLint({ dryRun: true, terminal: 'research-build' }));
assert.strictEqual(r2.ok, true);
assert.notStrictEqual(r2.failed, true);

console.log('sessionEndMechanical.test.js PASS');
