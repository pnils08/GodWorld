#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const drain = require('./drainReflectionIntake');
const mem = require('/root/GodWorld/utilities/citizenMemory');

const src = fs.readFileSync(path.join(__dirname, '..', 'utilities', 'compressLifeHistory.js'), 'utf8');
assert.match(src, /REFLECTION_MULT = 0\.45/);
assert.match(src, /REFLECTION_ACCRETION_FRAC = 0\.5/);
assert.strictEqual(drain.REFLECTION_MULT, 0.45);
assert.strictEqual(drain.REFLECTION_ACCRETION_FRAC, 0.5);

const STEP = 3 * 0.45 * 0.5; // Anxious composure -3 × mult × frac

const base = {};
for (const d of mem.DIALS) base[d] = 50;
const dial = JSON.stringify({ base, streak: {} });

{
  const r = drain.accretePending(dial, [{ event: '', affect: 'Anxious', text: 'the oven ran late' }]);
  assert.ok(r.moved === 1);
  assert.ok(Math.abs(r.after.composure - (50 - STEP)) < 1e-9, 'composure=' + r.after.composure);
  assert.ok(r.deltas.composure < 0);
}

{
  const first = drain.accretePending(dial, [{ event: '', affect: 'Anxious', text: 'a' }]);
  const second = drain.accretePending(first.json, [{ event: '', affect: 'Anxious', text: 'b' }]);
  assert.ok(second.after.composure < first.after.composure, 'second wake still moves essence');
}

{
  const pending = drain.pendingFromIntake([
    ['Timestamp', 'POPID', 'Cycle', 'Daypart', 'Tag', 'ReflectionExcerpt', 'Applied', 'Affect'],
    ['t', 'POP-00170', '103', 'morning', 'Neighborhood', 'opened the oven', 'no', 'Content'],
    ['t', 'POP-00170', '103', 'midday', 'Neighborhood', 'already drained', 'yes', 'Content'],
    ['t', 'POP-00001', '103', 'night', '', '', 'no', ''],
    ['t', 'POP-00002', '102', 'morning', 'Work', 'filed', 'no', 'Frustrated']
  ]);
  assert.strictEqual(pending.length, 2);
  assert.strictEqual(pending[0].popId, 'POP-00170');
  assert.strictEqual(pending[1].popId, 'POP-00002');
}

{
  const intake = [
    ['Timestamp', 'POPID', 'Cycle', 'Daypart', 'Tag', 'ReflectionExcerpt', 'Applied', 'Affect'],
    ['t', 'POP-00170', '103', 'morning', '', '', 'no', 'Anxious']
  ];
  const ledger = [
    ['POPID', 'Name', 'DialState'],
    ['POP-00170', 'Melton', dial]
  ];
  const { plans, skipped } = drain.planDrain(intake, ledger, null);
  assert.strictEqual(skipped, 0);
  assert.strictEqual(plans.length, 1);
  assert.strictEqual(plans[0].popId, 'POP-00170');
  assert.ok(plans[0].moved === 1);
  assert.ok(plans[0].deltas.composure < 0);
  const again = drain.planDrain([
    intake[0],
    ['t', 'POP-00170', '103', 'morning', '', '', 'yes', 'Anxious']
  ], ledger, null);
  assert.strictEqual(again.plans.length, 0, 'applied=yes is not drained twice');
}

(async () => {
  const writes = [];
  const fake = {
    updateRangeByPosition: async (tab, row, col, values) => {
      writes.push({ tab, row, col, value: values[0][0] });
    }
  };
  const intake = [
    ['Timestamp', 'POPID', 'Cycle', 'Daypart', 'Tag', 'ReflectionExcerpt', 'Applied', 'Affect'],
    ['t', 'POP-00170', '103', 'morning', '', '', 'no', 'Anxious']
  ];
  const ledger = [['POPID', 'DialState'], ['POP-00170', dial]];
  const { plans } = drain.planDrain(intake, ledger);
  await drain.applyPlans(plans, fake);
  assert.ok(writes.some((w) => w.tab === 'Simulation_Ledger' && w.col === 1));
  assert.ok(writes.some((w) => w.tab === 'Reflection_Intake' && w.col === 6 && w.value === 'yes'));
  console.log('drainReflectionIntake.test.js PASS');
})().catch((e) => { console.error(e); process.exit(1); });
