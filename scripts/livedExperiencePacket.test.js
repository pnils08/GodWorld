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

const luisSlice = {
  kind: 'civic-domain',
  packetSeat: {
    seat: { slug: 'luis-navarro', domain: 'accountability-anomaly' },
    prewrite: {
      method: 'KNOWN_UNKNOWN',
      anchorFacts: ['TEST-ONLY audit gap remains open'],
      missing: ['documented response', 'elapsed silence duration'],
      silenceClock: { state: 'UNESTABLISHED', value: null, src: null },
      forbidden: ['Do not invent a response or records request.']
    }
  }
};
const luisW1 = p.buildAnglePacket({
  cycle: 999,
  desk: 'civic',
  reporter: { popid: 'TEST-LUIS', name: 'Test Luis' },
  story: { ref: 'output/TEST_LUIS.json', label: 'TEST-ONLY audit gap remains open', kind: 'anomaly' },
  approach: 'Separate known from unknown.',
  slice: luisSlice,
  lane: []
});
assert.deepStrictEqual(luisW1.task.creativeBrief, {
  kind: 'civic-investigation',
  method: 'KNOWN_UNKNOWN',
  missing: ['documented response', 'elapsed silence duration'],
  reportingEvidence: {
    recordChecks: { state: 'NOT_SUPPLIED', events: [] },
    requestEvents: { state: 'NOT_SUPPLIED', events: [] },
    responseEvents: { state: 'NOT_SUPPLIED', events: [] },
    responsibleEntities: { state: 'NOT_SUPPLIED', entities: [] }
  },
  silenceClock: { state: 'UNESTABLISHED', value: null, src: null },
  forbidden: ['Do not invent a response or records request.']
});
assert.equal(luisW1.known.filter(row => row.text === 'TEST-ONLY audit gap remains open').length, 1,
  'compact Packet deduplicates the assigned fact');

const trevorSlice = {
  kind: 'civic-domain',
  packetSeat: {
    seat: { slug: 'trevor-shimizu', domain: 'infrastructure-transit' },
    prewrite: {
      method: 'INCIDENT_LINK_WARNING',
      anchorFacts: ['TEST-ONLY transit condition remains open'],
      missing: ['timestamp', 'second linked system fact'],
      cascade: { state: 'UNESTABLISHED', facts: [], link: null, src: null },
      forbidden: ['Do not invent an outage or causal link.']
    }
  }
};
const trevorW1 = p.buildAnglePacket({
  cycle: 999,
  desk: 'civic',
  reporter: { popid: 'TEST-TREVOR', name: 'Test Trevor' },
  story: { ref: 'output/TEST_TREVOR.json', label: 'TEST-ONLY transit condition remains open', kind: 'initiative' },
  approach: 'Trace only supplied system facts.',
  slice: trevorSlice,
  lane: []
});
assert.deepStrictEqual(trevorW1.task.creativeBrief, {
  kind: 'infrastructure-systems',
  method: 'INCIDENT_LINK_WARNING',
  missing: ['timestamp', 'second linked system fact'],
  cascade: { state: 'UNESTABLISHED', facts: [], link: null, src: null },
  forbidden: ['Do not invent an outage or causal link.']
});
assert.equal(trevorW1.known.filter(row => row.text === 'TEST-ONLY transit condition remains open').length, 1,
  'compact Packet deduplicates the assigned system fact');

const plan = p.validateAngleOutput({
  focus: 'TEST-ONLY mismatch', why: 'It is unresolved', checks: ['Check the source'],
  targets: [{ pop: 'TEST-POP-01', question: 'What do you own?', basis: 'assigned-official' }],
  interpretation: 'Accountability may lag', unverifiedLead: [], closeQuestion: 'Who owns the response?'
}, w1);
assert.equal(plan.targets[0].pop, 'TEST-POP-01');
assert.throws(() => p.validateAngleOutput({ ...plan, targets: [{ pop: 'MADE-UP', question: 'x', basis: 'x' }] }, w1), /supplied pop/);

const chargePulse = {
  charge: { fanCharge: 'dare' },
  candidates: [{ angle: 'TEST-ONLY pulse', score: 58 }],
};
const chargePeople = p.candidateRows({
  ref: 'TEST-ONLY-SPORTS', label: 'TEST-ONLY no-hitter',
  popids: ['POP-00001'], citizens: ['Vinnie Keane — Designated Hitter'],
  hood: 'Downtown',
}, chargePulse);
assert.ok(chargePeople.some(c => c.pop === 'POP-00001'),
  'fan-heat pulse rows must not hide story POPIDs');
const dimondPeople = p.neighborsFromLedger('Dimond', { cap: 2 });
assert.ok(dimondPeople.length >= 1, 'Dimond still has ledger residents');
assert.ok(dimondPeople.every(c => /^POP-\d+$/.test(c.pop)));

const candidates = p.candidateRows(story, slice);
const official = p.buildReportPacket({ cycle: 999, desk: 'civic', reporter: { name: 'Test Reporter' },
  angleInput: w1, anglePlan: plan, story, candidate: candidates[0] });
const resident = p.buildReportPacket({ cycle: 999, desk: 'civic', reporter: { name: 'Test Reporter' },
  angleInput: w1, anglePlan: plan, story, candidate: candidates[1] });
assert.notEqual(official.task.question, resident.task.question);
assert.match(official.task.question, /creates accountability/);
assert.match(resident.task.question, /supplied trend/);
assert.equal(official.limits.quoteEligible, false);
assert.equal(p.quoteIneligibility({ pop: 'POP-00599', role: 'Catcher, Oakland A\'s' }, 'civic', { kind: 'anomaly' }),
  'PRO_ATHLETE_CIVIC_INELIGIBLE');
{
  const colon = p.ledgerRowForPop('POP-00599');
  if (colon) {
    assert.equal(String(colon.SMPageId || '').trim(), '', 'Colon has never been woken');
    assert.equal(p.quoteIneligibility({ pop: 'POP-00599', role: colon.RoleType }, 'civic', { kind: 'anomaly' }),
      'PRO_ATHLETE_CIVIC_INELIGIBLE');
  }
}
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
