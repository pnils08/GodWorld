#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  isStuckDiagnosis, demandsFromAudit, isPhaseMove, collectPhaseWrites,
  writesFromAssembled, checkMustDecide, packetBody, contractAddendum, FAIL_PHASES
} = require('./civicMustDecide');

assert.strictEqual(isStuckDiagnosis('stuck-initiative | Fruitvale stalled'), true);
assert.strictEqual(isStuckDiagnosis('math-imbalance (high) | Jack London'), false);

const audit = {
  patterns: [{
    type: 'stuck-initiative',
    severity: 'high',
    cyclesInState: 9,
    affectedEntities: { initiatives: ['INIT-003'] }
  }, {
    type: 'incoherence',
    severity: 'high',
    affectedEntities: { initiatives: ['INIT-002'] }
  }]
};
const tracker = {
  initiatives: [{
    id: 'INIT-003',
    name: 'Fruitvale Transit Hub Phase II — Visioning',
    implementation: { phase: 'construction-planning' }
  }]
};
const demands = demandsFromAudit(audit, tracker);
assert.strictEqual(demands.length, 1);
assert.strictEqual(demands[0].id, 'INIT-003');
assert.strictEqual(demands[0].currentPhase, 'construction-planning');
assert.strictEqual(demands[0].cyclesInState, 9);

assert.strictEqual(isPhaseMove('construction-planning', 'construction-active'), true);
assert.strictEqual(isPhaseMove('construction-planning', 'stalled'), true);
assert.strictEqual(isPhaseMove('construction-planning', 'construction-planning'), false);
assert.strictEqual(isPhaseMove('construction-planning', 'not-a-phase'), false);

const silence = collectPhaseWrites([{
  initiative: 'INIT-003',
  trackerUpdates: {}
}]);
assert.deepStrictEqual(checkMustDecide(demands, silence).missing.map(d => d.id), ['INIT-003']);

const restate = collectPhaseWrites([{
  trackerUpdates: { initiative: 'INIT-003', ImplementationPhase: 'construction-planning' }
}]);
assert.strictEqual(checkMustDecide(demands, restate).ok, false);

const advance = collectPhaseWrites([{
  trackerUpdates: { initiative: 'INIT-003', ImplementationPhase: 'construction-active' }
}]);
assert.strictEqual(checkMustDecide(demands, advance).ok, true);

const fail = writesFromAssembled([{
  slug: 'fruitvale',
  d: { initiativeId: 'INIT-003', trackerUpdates: { ImplementationPhase: 'stalled' } }
}]);
assert.strictEqual(checkMustDecide(demands, fail).ok, true);
assert(FAIL_PHASES.includes('stalled'));

const body = packetBody(demands[0]);
assert(body.includes('INIT-003'));
assert(!/own the silence/i.test(body));
assert(/fails the apply gate/i.test(body));

const addendum = contractAddendum(demands);
assert(addendum.includes('MUST-DECIDE'));
assert.strictEqual(contractAddendum([]), '');

const approvals = {
  TBD: { office: 'Mayor', holder: 'TBD', status: 'vacant', approval: 12 },
  'Rose Delgado': { office: 'City Council District 3 (D3)', holder: 'Rose Delgado', status: 'active', approval: 90 }
};
assert.strictEqual(require('./civicMustDecide').isMayorVacant(approvals), true);
assert.strictEqual(require('./civicMustDecide').vacantOfficesFromApprovals(approvals).length, 1);

assert.strictEqual(require('./civicMustDecide').isVagueCivicReply('nothing is happening on the hub this week'), true);
assert.strictEqual(require('./civicMustDecide').isVagueCivicReply('I pulled the TIF packet and told Ashford we vote or we stall it'), false);
assert.strictEqual(require('./civicMustDecide').checkDatawakeMove({
  statement: 'We continue to monitor the situation.',
  action: null
}, true).ok, false);
assert.strictEqual(require('./civicMustDecide').checkDatawakeMove({
  statement: 'I sent the mobilization request to the clerk this morning.',
  action: 'file the mobilization request'
}, true).ok, true);

console.log('civicMustDecide.test.js PASS');
