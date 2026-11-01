'use strict';

const assert = require('assert');
const { collectBallots, previewTally, extractMayorDecision } = require('./civic47Ballots');

const seats = Array.from({ length: 9 }, (_, n) => ({ officeId: 'COUNCIL-D' + (n + 1),
  popid: 'POP-SYN' + (n + 1), status: n === 8 ? 'vacant' : 'active' }));
const sessions = { 'INIT-SYN': { sessionId: 'VOTE-120-INIT-SYN', cycle: 120, body: 'council' } };
const voices = {};
for (let n = 1; n <= 8; n++) {
  voices['COUNCIL-D' + n] = { ok: true, voice: { ballots: n <= 7 ? [{
    initiativeId: 'INIT-SYN', sessionId: 'VOTE-120-INIT-SYN',
    vote: n <= 5 ? 'YES' : 'NO',
  }] : [] } };
}
const batch = collectBallots(seats, voices, 120, sessions);
assert.strictEqual(batch.ballots.length, 7);
assert.strictEqual(new Set(batch.ballots.map(b => b.ballotId)).size, 7);
assert.deepStrictEqual(previewTally(batch, 'INIT-SYN', 5, 5), {
  status: 'passed-preview', yes: 5, no: 2, abstain: 1, absent: 1,
  sourceHash: batch.sourceHash, authoritative: false,
});
const failedDelivery = collectBallots(seats,
  { ...voices, 'COUNCIL-D2': { ok: false } }, 120, sessions);
assert.strictEqual(previewTally(failedDelivery, 'INIT-SYN', 5, 5).status, 'retry');
const mayor = { officeId: 'MAYOR-01', popid: 'POP-SYNM' };
const veto = extractMayorDecision(mayor, { executiveDecisions: [{ initiativeId: 'INIT-SYN',
  decision: 'veto' }] }, 120, 'INIT-SYN');
assert.strictEqual(veto.decision, 'veto');
assert(!extractMayorDecision(mayor, { statements: [] }, 120, 'INIT-SYN').available);
const duplicate = { ...batch, ballots: [...batch.ballots, batch.ballots[0]] };
assert.strictEqual(previewTally(duplicate, 'INIT-SYN', 5, 5).status, 'invalid');
console.log('civic47 ballots: ok');
