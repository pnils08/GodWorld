'use strict';
const assert = require('assert');
const { fromAuditRows } = require('./initiativeTrackerSnapshot');

const tracker = fromAuditRows([{
  InitiativeID: 'TEST-ONLY-INIT',
  Name: 'TEST-ONLY Fund',
  Status: 'passed',
  VoteCycle: '78',
  Outcome: 'PASSED',
  Budget: '$1',
  PolicyDomain: 'economic',
  AffectedNeighborhoods: 'West Oakland, Fruitvale',
  ImplementationPhase: 'disbursement-active',
  MilestoneNotes: 'TEST-ONLY note',
  NextScheduledAction: 'TEST-ONLY next',
  NextActionCycle: '103',
}]);

assert.equal(tracker.initiatives.length, 1);
assert.equal(tracker.initiatives[0].id, 'TEST-ONLY-INIT');
assert.equal(tracker.initiatives[0].implementation.phase, 'disbursement-active');
assert.deepStrictEqual(tracker.initiatives[0].neighborhoods, ['West Oakland', 'Fruitvale']);
assert.equal(tracker.initiatives[0].vote, 'PASSED');

const { loadOrRebuild } = require('./initiativeTrackerSnapshot');
const live = loadOrRebuild(103);
assert.ok(live.initiatives.some(i => i.id === 'INIT-001'));
console.log('initiativeTrackerSnapshot.test.js ok');
