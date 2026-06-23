/**
 * saveChaosCars.test.js — engine.11 T3.11/T1.3 chaos ledger writer coverage. Node-only.
 * Run: node phase10-persistence/saveChaosCars.test.js
 */
'use strict';

let appends = [];
let ensures = [];
global.queueAppendIntent_ = (ctx, tab, row, reason, domain) => appends.push({ tab, row, reason, domain });
global.queueEnsureTabIntent_ = (ctx, tab, headers, reason, domain) => ensures.push({ tab, headers, reason, domain });

global.inWorldStamp_ = (ctx) => (ctx && ctx.summary && ctx.summary.cycleRef) || 'C?';  // S271 in-world stamp

const s = require('./saveChaosCars');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const ctx = { now: new Date('2026-06-20T12:34:56Z'), summary: { cycleRef: 'Y2C48' } };
const p1 = {
  cycleId: 99, eventId: 'abc12345', vehicleType: 'cop_car', targetScope: 'citizen',
  targetId: 'POP-00001', targetTier: 1, diceOutcome: 'arrested', primaryMetric: 'Transgression-Serious',
  metricMagnitude: 0, consequenceFloorFired: true, narrativeSeed: 'An arrest on the block.'
};
const p2 = {
  cycleId: 99, eventId: 'def67890', vehicleType: 'ice_cream_truck', targetScope: 'neighborhood',
  targetId: 'Fruitvale', targetTier: null, diceOutcome: 'block_party_catalyst', primaryMetric: 'Sentiment',
  metricMagnitude: 0.07, consequenceFloorFired: false, narrativeSeed: ''
};

const r1 = s.writeChaosCarsRow_(ctx, p1);
const r2 = s.writeChaosCarsRow_(ctx, p2);

console.log('Test: ensure-tab + append schema');
assert('headers are 12 cols', s.CHAOS_CARS_HEADERS.length === 12);
assert('ensure-tab queued exactly once (idempotent per cycle)', ensures.length === 1);
assert('ensure-tab targets Chaos_Cars with 12 headers', ensures[0].tab === 'Chaos_Cars' && ensures[0].headers.length === 12);
assert('two append rows queued', appends.length === 2);
assert('append row has 12 cols', r1.length === 12 && r2.length === 12);
assert('CycleId/EventId/Vehicle in place', r1[0] === 99 && r1[1] === 'abc12345' && r1[2] === 'cop_car');
assert('Tier-1 → tier preserved; consequenceFloor TRUE', r1[5] === 1 && r1[9] === 'TRUE');
assert('neighborhood tier null → blank; consequenceFloor FALSE', r2[5] === '' && r2[9] === 'FALSE');
assert('magnitude carried (0.07)', r2[8] === 0.07);
// S271: CycleStamp is the in-world cycle anchor (Y{year}C{cycle}), not a wall clock.
assert('CycleStamp in-world (Y2C48)', r1[11] === 'Y2C48');

console.log('\n' + '─'.repeat(60));
if (failed === 0) { console.log(`✓ all ${passed} assertions passed`); process.exit(0); }
else { console.error(`✗ ${failed}/${passed + failed} failed`); process.exit(1); }
