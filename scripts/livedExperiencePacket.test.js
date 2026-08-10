'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const p = require('./livedExperiencePacket');

const exemplar = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'media', 'examples',
  'lived_experience_packet_v1.json'), 'utf8'));
assert.doesNotThrow(() => p.assertBase(exemplar, 'W2'));

const story = {
  ref: 'output/TEST_ONLY.json rows[1]', label: 'TEST-ONLY signal changed',
  kind: 'test-signal', angle: 'why the TEST-ONLY signal changed',
  hookLine: 'TEST-ONLY hook', hood: 'TEST-HOOD',
  popids: ['TEST-POP-01', 'TEST-POP-02'],
  citizens: ['Test Person One — Council Member, TEST-HOOD', 'Test Person Two — Resident, TEST-HOOD'],
};
const slice = { contradiction: { a: 'TEST-ONLY value rose', b: 'TEST-ONLY response did not' },
  scene: { neighborhoodTexture: 'TEST-ONLY quiet block' },
  citizens: [
    { popid: 'TEST-POP-01', name: 'Test Person One', role: 'Council Member', neighborhood: 'TEST-HOOD', profile: 'Test Person One — Council Member, TEST-HOOD', why: 'assigned-official' },
    { popid: 'TEST-POP-02', name: 'Test Person Two', role: 'Resident', neighborhood: 'TEST-HOOD', profile: 'Test Person Two — Resident, TEST-HOOD', why: 'same-hood-ledger' },
  ] };

const w1 = p.buildAnglePacket({ cycle: 999, desk: 'civic', reporter: { popid: 'TEST-REPORTER', name: 'Test Reporter' },
  story, approach: 'Test the mismatch', slice, lane: [{ label: 'TEST-ONLY lane', ref: 'output/TEST_ONLY.json' }] });
assert.deepStrictEqual(Object.keys(w1).slice(0, 8), ['v', 'wake', 'actor', 'task', 'signal', 'exposure', 'known', 'limits']);
assert.equal(w1.v, 'LEP/1');
assert.ok(w1.known.every(c => c.t && c.text && c.src));

const plan = p.validateAngleOutput({
  focus: 'TEST-ONLY mismatch', why: 'It is unresolved', checks: ['Check the source'],
  targets: [{ pop: 'TEST-POP-01', question: 'What do you own?', basis: 'assigned-official' }],
  interpretation: 'Accountability may lag', unverifiedLead: [], closeQuestion: 'Who owns the response?'
}, w1);
assert.equal(plan.targets[0].pop, 'TEST-POP-01');
assert.throws(() => p.validateAngleOutput({ ...plan, targets: [{ pop: 'MADE-UP', question: 'x', basis: 'x' }] }, w1), /supplied pop/);

const candidates = p.candidateRows(story, slice);
const official = p.buildReportPacket({ cycle: 999, desk: 'civic', reporter: { name: 'Test Reporter' },
  angleInput: w1, anglePlan: plan, story, candidate: candidates[0] });
const resident = p.buildReportPacket({ cycle: 999, desk: 'civic', reporter: { name: 'Test Reporter' },
  angleInput: w1, anglePlan: plan, story, candidate: candidates[1] });
assert.notEqual(official.task.question, resident.task.question);
assert.match(official.task.question, /creates accountability/);
assert.match(resident.task.question, /supplied trend/);
assert.equal(official.limits.quoteEligible, false);
assert.throws(() => p.validateReportOutput({ answer: 'quote', observation: [],
  interpretation: ['I speak for the office'], intention: [], unverifiedLead: [],
  quoteParts: [{ t: 'INTERPRETATION', i: 0 }], limits: [] }, official), /institutional quote/);

const claims = p.validateReportOutput({ answer: 'quote', observation: [],
  interpretation: ['I think the response is slow'], intention: ['I will ask at council'],
  unverifiedLead: ['There may be an unrecorded delay'],
  quoteParts: [{ t: 'INTERPRETATION', i: 0 }, { t: 'INTENTION', i: 0 }],
  limits: ['No direct event observed'] }, resident);
assert.equal(claims.publishableQuote, 'I think the response is slow I will ask at council');
assert.throws(() => p.validateReportOutput({ answer: 'quote',
  observation: [{ text: 'I saw a new event', src: 'made-up-source' }],
  interpretation: ['It worries me'], intention: [], unverifiedLead: [],
  quoteParts: [{ t: 'INTERPRETATION', i: 0 }], limits: [] }, resident), /exact packet\.known src/);
const w3 = p.buildWritePacket({ cycle: 999, desk: 'civic', reporter: { popid: 'TEST-REPORTER', name: 'Test Reporter' },
  story, approach: 'Test the mismatch', angleInput: w1, anglePlan: plan,
  interviews: [{ pop: 'TEST-POP-02', name: 'Test Person Two', claims }],
  lane: [{ label: 'TEST-ONLY unrelated lane event', ref: 'output/TEST_ONLY.json rows[2]' }] });
assert.equal(w3.wake, 'W3');
assert.equal(w3.exposure.sources.length, 1);
assert.equal(w3.exposure.excludedLeads.length, 1);
assert.equal(w3.exposure.excludedLeads[0].usable, false);
assert.deepStrictEqual(Object.keys(w3.signal.plan), ['focus', 'closeQuestion']);
assert.equal(w3.signal.nearby, undefined);
assert.equal(w3.exposure.subjects.some(s => s.name === 'Test Person One' && s.quotationEligible === false), true);
assert.equal(w3.exposure.subjects.some(s => s.name === 'Test Person Two' && s.quotationEligible === true), true);
assert.doesNotThrow(() => p.assertBase(JSON.parse(JSON.stringify(w3)), 'W3'));
assert.throws(() => p.assertBase({ ...w3, known: [{ t: 'FACT', text: 'missing ref' }] }, 'W3'), /text\+src/);

const roundTrip = p.parseJsonObject('```json\n{"answer":"abstain","observation":[],"interpretation":[],"intention":[],"unverifiedLead":[],"quoteParts":[],"limits":["unknown"]}\n```');
assert.equal(p.validateReportOutput(roundTrip, resident).answer, 'abstain');

console.log('livedExperiencePacket.test.js: PASS');
