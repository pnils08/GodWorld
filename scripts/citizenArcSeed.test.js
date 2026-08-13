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
assert.equal(arc.storyline.verb, 'opened');
assert.match(arc.storyline.slug, /fruitvale-test-civic-anomaly/);
assert.equal(arc.claim, 'TEST-ONLY the 1 at 6am still does not wait.');
const seeds = sat.loadArcSeeds(999);
assert.ok(seeds.some(s => s.sidecar.intake.storylines[0].slug === arc.storyline.slug));
const signals = sat.aggregateStorylineSignals(seeds);
assert.ok(signals.some(s => s.opened >= 1 && s.slug === arc.storyline.slug));
fs.unlinkSync(dest);
console.log('citizenArcSeed.test.js ok');
