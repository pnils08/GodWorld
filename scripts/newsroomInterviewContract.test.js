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
assert.match(interview.citizenEvidenceGuard(false), /Speak as yourself anyway/);

const authored = 'I think nine cycles without advancement is too long.';
const result = interview.validateInterviewOutput({
  answer: 'quote', quote: authored, fact_ids: ['F-TEST'], basis: 'direct-reaction',
  unverifiedLead: [], abstain_reason: null,
}, packet);
assert.equal(result.publishableQuote, authored, 'backend must preserve citizen speech exactly');
assert.equal(result.authoredQuote, true);
assert.match(result.quoteId, /^Q-POP-99999-/);

assert.throws(() => interview.validateInterviewOutput({
  answer: 'quote',
  quote: 'What feels off is how long this has been dragging on without any real updates and promises.',
  fact_ids: ['F-TEST'], basis: 'direct-reaction', unverifiedLead: [], abstain_reason: null,
}, packet), /unsupplied history/);

assert.throws(() => interview.validateInterviewOutput({
  answer: 'quote',
  quote: 'To me, they keep redrawing the same plans without ever picking up a shovel.',
  fact_ids: ['F-TEST'], basis: 'direct-reaction', unverifiedLead: [], abstain_reason: null,
}, packet), /unsupplied history/);

const street = interview.validateInterviewOutput({
  answer: 'quote',
  quote: 'I pull the first tray before six and the regulars still ask if anything moved on the hub.',
  fact_ids: ['F-TEST'], basis: 'direct-reaction', unverifiedLead: [], abstain_reason: null,
}, packet);
assert.match(street.publishableQuote, /first tray/);

assert.throws(() => interview.validateInterviewOutput({
  answer: 'quote', quote: authored, fact_ids: ['F-TEST'], basis: 'lived-context',
  unverifiedLead: [], abstain_reason: null,
}, packet), /requires addressable story-linked evidence/);

assert.throws(() => interview.validateInterviewOutput({
  answer: 'quote',
  quote: 'This deserves a closer look. What happens next? I am going to keep watching this.',
  fact_ids: ['F-TEST'], basis: 'direct-reaction', unverifiedLead: [], abstain_reason: null,
}, packet), /legacy backend lattice/);

assert.throws(() => interview.validateInterviewOutput({
  answer: 'quote', quote: 'TEST-ONLY supplied condition', fact_ids: ['F-TEST'],
  basis: 'direct-reaction', unverifiedLead: [], abstain_reason: null,
}, packet), /copied Packet fact/);

assert.throws(() => interview.validateInterviewOutput({
  answer: 'quote',
  quote: 'I think the Tribune should ask what is really going on with the funding.',
  fact_ids: ['F-TEST'], basis: 'direct-reaction', unverifiedLead: [], abstain_reason: null,
}, packet), /newspaper-as-actor/);

const ineligible = interview.prepareInterviewPacket(Object.assign({}, base, {
  limits: { quoteEligible: false, rule: 'old' },
}));
assert.throws(() => interview.validateInterviewOutput({
  answer: 'quote', quote: authored, fact_ids: ['F-TEST'], basis: 'lived-context',
  unverifiedLead: [], abstain_reason: null,
}, ineligible), /not quote eligible/);

const abstain = interview.validateInterviewOutput({
  answer: 'abstain', quote: null, fact_ids: [], basis: null,
  unverifiedLead: null, abstain_reason: 'no_lived_basis',
}, packet);
assert.equal(abstain.publishableQuote, null);

// pipeline.111 (builder 2026-11-24): a seat interview carries the citizen's own life, never the reporter's plan
const plan = {
  v: 'LEP/2', wake: 'W2', actor: { id: 'POP-90001', name: 'Test Teacher', role: 'Teacher', desk: null },
  task: { goal: 'x', reporter: 'Angela Reyes', question: 'What do you notice first each week?' },
  signal: { kind: 'own-pick', hood: null, focus: 'where the school quality index slipped from C116', src: 'own pick, C117' },
  exposure: { basis: ['assignment'], self: 'Test Teacher — Teacher — Fruitvale', planTarget: { pop: 'POP-90001', question: 'q', basis: 'index slipped' },
    evidence: [{ id: 'EV-1', src: 'own pick, C117', text: 'the school quality index slipped' }] },
  known: [
    { t: 'FACT', text: 'Test Teacher — Teacher — Fruitvale', src: 'Simulation_Ledger profile for POP-90001' },
    { t: 'FACT', text: 'Test Teacher, C117: re-read an old journal page', src: 'slice' },
    { t: 'FACT', text: 'Fruitvale: school quality index 7.2 (was 7.3 at C116)', src: 'output/beats/Neighborhood_Demographics.jsonl' }],
  limits: { quoteEligible: true, rule: 'x' }, output: { schema: { basis: 'direct-reaction|null' } }
};
const own = interview.ownLifeInterviewPacket(plan);
assert.equal(own.signal.focus, '', 'no reporter plan in the signal');
assert.equal(own.exposure.planTarget, null);
assert.deepStrictEqual(own.exposure.evidence, []);
assert.deepStrictEqual(own.known.map(c => c.src), ['Simulation_Ledger profile for POP-90001', 'slice'], 'their profile and their own line; not the index');
assert.equal(own.task.question, 'q? Speak from your life.', 'the reporter\'s own question for this person, verbatim');
const noPlan = interview.ownLifeInterviewPacket(Object.assign({}, plan, { exposure: Object.assign({}, plan.exposure, { planTarget: null }) }));
assert.equal(noPlan.task.question, 'What is on your mind this week? Speak from your life.', 'no plan focus pasted into a stock question');
assert.equal(plan.signal.focus, 'where the school quality index slipped from C116', 'the input is not mutated');

console.log('newsroomInterviewContract.test.js: PASS');
