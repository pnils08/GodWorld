// civic.35 — gate the facts, not the color (builder-ruled S433).
// Speech is not number-gated; tracker fact fields are; packet arithmetic is grounded.
const assert = require('assert');
const { statementNumberCheck, ungroundedNumbers } = require('./cron-civic-run.js');

const packet = 'Where it stands: C104: Month-five batch disbursed (12 households; total 57/280). Outreach approved.';
const ctx = { cycle: 106 };

// 1. Speech may carry any number — the desk quotes it as the office's claim.
const speechOnly = { office: 'mayor_open', speaker: 'Avery Santana', statements: [{
  decision: 'conducted', quote: 'Over two hundred residents showed up.',
  fullStatement: 'Over two hundred residents showed up, bringing the total to sixty-nine families.',
  trackerUpdates: { initiative: 'INIT-003', MilestoneNotes: 'C106: First visioning session held.' },
}] };
assert.strictEqual(statementNumberCheck(packet, ctx)(speechOnly), null, 'speech must not be gated');

// 2. A tracker fact that nothing in the packet backs is still rejected (flat shape).
const inventedFact = { office: 'mayor_open', speaker: 'Avery Santana', statements: [{
  decision: 'conducted', quote: 'x', fullStatement: 'x',
  trackerUpdates: { initiative: 'INIT-003', MilestoneNotes: 'C106: 200 residents attended the session.' },
}] };
assert.match(statementNumberCheck(packet, ctx)(inventedFact) || '', /\[200\]/, 'invented tracker fact must be rejected');

// 2b. Same in the legacy nested-by-initiative shape, and in NextScheduledAction.
const nested = { office: 'x', speaker: 'x', statements: [{ decision: 'x', quote: 'x', fullStatement: 'x',
  trackerUpdates: { 'INIT-003': { NextScheduledAction: 'Seat 35 vendors by next session' } } }] };
assert.match(statementNumberCheck(packet, ctx)(nested) || '', /\[35\]/, 'nested NextScheduledAction must be gated');

// 3. Arithmetic on packet figures is grounded: 57 + 12 = 69, 280 − 57 = 223.
assert.deepStrictEqual(ungroundedNumbers(packet, ['total 69 families'], ctx), [], '57+12 grounds 69');
assert.deepStrictEqual(ungroundedNumbers(packet, ['sixty-nine families'], ctx), [], 'spelled 69 grounds too');
assert.deepStrictEqual(ungroundedNumbers(packet, ['223 households still waiting'], ctx), [], '280-57 grounds 223');
assert.deepStrictEqual(ungroundedNumbers(packet, ['90 households'], ctx), ['90'], 'a number no pair produces is still ungrounded');

// 4. The prior allowances still hold: own cycle, prior cycle, district, 911, ordinals.
assert.deepStrictEqual(ungroundedNumbers('', ['C106 and C105, District 4, call 911, along 51st'], { cycle: 106, district: 'District 4' }), []);

console.log('cron-civic-number-gate.test.js: ok');
