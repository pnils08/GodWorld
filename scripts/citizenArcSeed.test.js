'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const run = require('./cron-desk-run');
const sat = require('./cron-saturday-run');

const dest = run.writeCitizenArc('TEST-ONLY_arcseed_', {
  cycle: 999,
  desk: 'civic',
  persona: 'test-only',
  story: { hood: 'Fruitvale', kind: 'anomaly' },
  quotes: [{ pop: 'POP-90001', name: 'Test Civic', quote: 'TEST-ONLY the 1 at 6am still does not wait.' }]
});
assert.ok(dest && fs.existsSync(dest));
const arc = JSON.parse(fs.readFileSync(dest, 'utf8'));
assert.equal(arc.status, 'arc-seed');
// engine.270: a quote pass alone is not storyline coverage and mints nothing.
assert.equal(arc.storyline, undefined);
assert.equal(arc.claim, 'TEST-ONLY the 1 at 6am still does not wait.');
const seeds = sat.loadArcSeeds(999);
const mine = seeds.filter(s => s.sidecar.cycle === '999');
assert.ok(mine.length >= 1, 'the arc seed still reaches Saturday with its quotes');
assert.ok(mine.every(s => s.sidecar.intake.storylines.length === 0));
assert.ok(mine.some(s => s.sidecar.intake.names.some(n => n.popid === 'POP-90001')));
assert.equal(sat.aggregateStorylineSignals(mine).length, 0);
fs.unlinkSync(dest);
console.log('citizenArcSeed.test.js ok');
