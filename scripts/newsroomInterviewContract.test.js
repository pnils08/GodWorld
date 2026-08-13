#!/usr/bin/env node
'use strict';

const assert = require('assert');
const interview = require('./newsroomInterviewContract');

const base = {
  v: 'LEP/2', wake: 'W2',
  actor: { id: 'POP-99999', name: 'Test Citizen' },
  task: { goal: 'old' }, signal: {}, exposure: {},
  known: [{ id: 'F-TEST', t: 'FACT', text: 'TEST-ONLY supplied condition', src: 'TEST-SOURCE' }],
  limits: { quoteEligible: true, rule: 'old' },
  output: {}, lattice: { stances: [{ id: 'S_TEST', text: 'template' }] },
};

const packet = interview.prepareInterviewPacket(base);
assert.equal(packet.output.contract, interview.CONTRACT);
assert.equal(packet.lattice, undefined);
assert.match(packet.output.rule, /preserves quote exactly/);
assert.match(interview.citizenEvidenceGuard(), /real simulated-life context/);

const authored = 'I pass that corner after work, and I want to know why the plan has not moved.';
const result = interview.validateInterviewOutput({
  answer: 'quote', quote: authored, fact_ids: ['F-TEST'], basis: 'lived-context',
  unverifiedLead: [], abstain_reason: null,
}, packet);
assert.equal(result.publishableQuote, authored, 'backend must preserve citizen speech exactly');
assert.equal(result.authoredQuote, true);
assert.match(result.quoteId, /^Q-POP-99999-/);

assert.throws(() => interview.validateInterviewOutput({
  answer: 'quote',
  quote: 'This deserves a closer look. What happens next? I am going to keep watching this.',
  fact_ids: ['F-TEST'], basis: 'direct-reaction', unverifiedLead: [], abstain_reason: null,
}, packet), /legacy backend lattice/);

assert.throws(() => interview.validateInterviewOutput({
  answer: 'quote', quote: 'TEST-ONLY supplied condition', fact_ids: ['F-TEST'],
  basis: 'direct-reaction', unverifiedLead: [], abstain_reason: null,
}, packet), /copied Packet fact/);

const ineligible = interview.prepareInterviewPacket(Object.assign({}, base, {
  limits: { quoteEligible: false, rule: 'old' },
}));
assert.throws(() => interview.validateInterviewOutput({
  answer: 'quote', quote: authored, fact_ids: ['F-TEST'], basis: 'lived-context',
  unverifiedLead: [], abstain_reason: null,
}, ineligible), /not quote eligible/);

const abstain = interview.validateInterviewOutput({
  answer: 'abstain', quote: null, fact_ids: [], basis: null,
  unverifiedLead: [], abstain_reason: 'no_lived_basis',
}, packet);
assert.equal(abstain.publishableQuote, null);

console.log('newsroomInterviewContract.test.js: PASS');
