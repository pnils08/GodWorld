'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const p = require('./livedExperiencePacketV2');

const exemplar = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'media', 'examples',
  'lived_experience_packet_v2.json'), 'utf8'));
assert.doesNotThrow(() => p.assertBase(exemplar, 'W3'));

const story = {
  ref: 'output/TEST_ONLY.json rows[1]', label: 'TEST-ONLY signal changed',
  kind: 'test-signal', angle: 'why the TEST-ONLY signal changed',
  hookLine: 'TEST-ONLY hook', hood: 'TEST-HOOD',
  popids: ['TEST-POP-01', 'TEST-POP-02'],
  citizens: ['Test Official — Council Member, TEST-HOOD', 'Test Resident — Resident, TEST-HOOD'],
};
const slice = {
  contradiction: { a: 'TEST-ONLY value rose by 4', b: 'TEST-ONLY response did not' },
  citizens: [
    { popid: 'TEST-POP-01', name: 'Test Official', role: 'Council Member', neighborhood: 'TEST-HOOD', profile: 'Test Official — Council Member, TEST-HOOD', why: 'assigned-official' },
    { popid: 'TEST-POP-02', name: 'Test Resident', role: 'Resident', neighborhood: 'TEST-HOOD', profile: 'Test Resident — Resident, TEST-HOOD', why: 'same-hood-ledger' },
  ],
};
const reporter = { popid: 'TEST-REPORTER', name: 'Test Reporter' };
const w1 = p.buildAnglePacket({ cycle: 999, desk: 'civic', reporter, story, approach: 'Test the mismatch', slice, lane: [] });
assert.equal(w1.v, 'LEP/2');
assert.ok(w1.known.every(c => /^F-[a-f0-9]{12}$/.test(c.id)));
assert.equal(new Set(w1.known.map(c => c.id)).size, w1.known.length);

const plan = p.validateAngleOutput({
  focus: 'TEST-ONLY mismatch', why: 'It is unresolved', checks: ['Check the source'],
  targets: [{ pop: 'TEST-POP-01', question: 'What do you own?', basis: 'assigned-official' }],
  interpretation: 'Accountability may lag', unverifiedLead: [], closeQuestion: 'Who owns the response?'
}, w1);
const candidates = p.candidateRows(story, slice);
const official = p.buildReportPacket({ cycle: 999, desk: 'civic', reporter, angleInput: w1, anglePlan: plan, story, candidate: candidates[0] });
const resident = p.buildReportPacket({ cycle: 999, desk: 'civic', reporter, angleInput: w1, anglePlan: plan, story, candidate: candidates[1] });
const selectedFactId = resident.known[resident.known.length - 1].id;
assert.equal(resident.v, 'LEP/2');
assert.equal(resident.exposure.planTarget, undefined);
assert.ok(resident.lattice.stances.every(row => row.id && row.text));

assert.throws(() => p.validateReportOutput({
  answer: 'quote', fact_ids: [official.known[0].id], stance_id: 'S_CONCERN', question_id: 'Q_OWNER',
  intention_id: 'I_ANSWER', unverifiedLead: [], abstain_reason: null,
}, official), /institutional quote/);
assert.throws(() => p.validateReportOutput({
  answer: 'quote', fact_ids: ['MADE_UP'], stance_id: 'S_CONCERN', question_id: 'Q_OWNER',
  intention_id: 'I_ANSWER', unverifiedLead: [], abstain_reason: null,
}, resident), /unknown id/);

const claims = p.validateReportOutput({
  answer: 'quote', fact_ids: [selectedFactId], stance_id: 'S_MISMATCH', question_id: 'Q_GAP',
  intention_id: 'I_WATCH', unverifiedLead: ['TEST-ONLY rumor for later verification'], abstain_reason: null,
}, resident);
assert.match(claims.quoteId, /^Q-TEST-POP-02-[a-f0-9]{10}$/);
assert.equal(claims.publishableQuote,
  'What the record shows does not line up with what I expected. What explains the gap in the record? I am going to keep watching this.');
assert.ok(!claims.publishableQuote.includes('rumor'));

const w3 = p.buildWritePacket({
  cycle: 999, desk: 'civic', reporter, story, approach: 'Test the mismatch',
  angleInput: w1, anglePlan: plan,
  interviews: [{ pop: 'TEST-POP-02', name: 'Test Resident', claims, inputPacket: resident }], lane: [],
});
assert.equal(w3.v, 'LEP/2');
assert.match(w3.manifest.id, /^AM-[a-f0-9]{12}$/);
assert.equal(w3.manifest.approvedQuotes[0].id, claims.quoteId);
assert.ok(w3.manifest.approvedFacts.some(row => row.id === selectedFactId));
assert.equal(w3.manifest.unverifiedLeads[0].publishable, false);
assert.ok(w3.manifest.forbiddenClaimClasses.includes('new place or street'));
assert.doesNotThrow(() => p.assertBase(w3, 'W3'));

const good = '## TEST-ONLY\n\nTEST-ONLY value rose by 4. Test Resident said, “' +
  claims.publishableQuote + '”\n';
assert.deepStrictEqual(p.auditArticle(good, w3).errors, []);
const bad = good + '\nI stood on 8th Street. A source said, “Invented words.”\n';
const audit = p.auditArticle(bad, w3);
assert.equal(audit.ok, false);
assert.ok(audit.errors.some(e => e.code === 'UNAPPROVED_NUMBER' && e.values.includes('8th')));
assert.ok(audit.errors.some(e => e.code === 'UNAPPROVED_QUOTE'));

const jaxProfile = {
  id: 'TEST-JAX', canonPolicy: 'load-bearing',
  authorizedTexture: ['generic street and bar color'],
  textureConditions: ['never a named canon claim'],
  canonBlockers: ['false named person', 'false official action'],
};
const jaxW3 = p.buildWritePacket({
  cycle: 999, desk: 'civic', reporter, story, approach: 'Test the mismatch',
  angleInput: w1, anglePlan: plan,
  interviews: [{ pop: 'TEST-POP-02', name: 'Test Resident', claims, inputPacket: resident }],
  lane: [], reviewProfile: jaxProfile,
});
assert.equal(jaxW3.manifest.policy, 'load-bearing');
assert.deepStrictEqual(jaxW3.manifest.authorizedTexture, jaxProfile.authorizedTexture);
assert.deepStrictEqual(jaxW3.manifest.forbiddenClaimClasses, jaxProfile.canonBlockers);
const jaxAudit = p.auditArticle(bad, jaxW3);
assert.equal(jaxAudit.ok, true);
assert.deepStrictEqual(jaxAudit.errors, []);
assert.ok(jaxAudit.observations.some(e => e.code === 'UNAPPROVED_NUMBER'));
assert.ok(jaxAudit.observations.some(e => e.code === 'UNAPPROVED_QUOTE'));

console.log('livedExperiencePacketV2.test.js: PASS');
