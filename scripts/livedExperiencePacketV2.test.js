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

// C103 Jax regression: a story label may repeat contradiction.a at the same source.
// Exact sourced duplicates collapse before LEP/2 derives stable claim IDs.
const repeatedClaim = 'TEST-ONLY Initiative is stuck for 9 cycles';
const repeatedClaimW1 = p.buildAnglePacket({
  cycle: 999, desk: 'civic', reporter, approach: 'Test the stalled initiative', lane: [],
  story: {
    ref: 'output/TEST_ONLY_AUDIT.json patterns[0]', label: repeatedClaim,
    angle: 'why the TEST-ONLY Initiative remains stuck', kind: 'stuck-initiative',
  },
  slice: { contradiction: { a: repeatedClaim, b: 'TEST-ONLY record shows no phase change' } },
});
assert.equal(repeatedClaimW1.known.filter(claim => claim.text === repeatedClaim).length, 1);
assert.equal(new Set(repeatedClaimW1.known.map(claim => claim.id)).size, repeatedClaimW1.known.length);

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
assert.equal(jaxAudit.ok, false);
assert.ok(jaxAudit.errors.some(e => e.code === 'UNAPPROVED_QUOTE'));
assert.ok(jaxAudit.observations.some(e => e.code === 'UNAPPROVED_NUMBER'));
const jaxRawMetadata = p.auditArticle('The TEST-ONLY Initiative remains in construction-planning.', jaxW3);
assert.equal(jaxRawMetadata.ok, false);
assert.ok(jaxRawMetadata.errors.some(e => e.code === 'ENGINE_METADATA_LEAK'));
const naturalizedMetadata = p.auditArticle(
  'The room had a volume of 3, movement is restricted, low volume, restricted movement, and weather impact was at 1.05.', jaxW3);
assert.equal(naturalizedMetadata.ok, false);
assert.ok(naturalizedMetadata.errors.some(e => e.code === 'ENGINE_METADATA_LEAK'));

const sourceBriefProfile = {
  ...jaxProfile,
  articleContract: { renderMode: 'SOURCE_BRIEF' },
};
const sourceBriefW3 = p.buildWritePacket({
  cycle: 999, desk: 'civic', reporter, story, approach: 'Test the mismatch',
  angleInput: w1, anglePlan: plan,
  interviews: [{ pop: 'TEST-POP-02', name: 'Test Resident', claims, inputPacket: resident }],
  lane: [], reviewProfile: sourceBriefProfile,
});
assert.equal(sourceBriefW3.task.writingMode, 'SOURCE_BRIEF');
assert.match(sourceBriefW3.reviewProfile.articleContract.targetWords, /evidence-bounded/);
const sourceBrief = p.renderSourceBrief(sourceBriefW3);
assert.equal(sourceBrief.split('\n')[0], '# TEST-ONLY signal changed');
assert.match(sourceBrief, new RegExp(claims.publishableQuote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.doesNotMatch(sourceBrief, /invented biography|collective sentiment/i);
assert.match(sourceBrief, /What additional record would explain the supplied condition\?/);
assert.equal(p.auditArticle(sourceBrief, sourceBriefW3).ok, true);

const trackerSourceBriefW3 = JSON.parse(JSON.stringify(sourceBriefW3));
trackerSourceBriefW3.manifest.approvedFacts = [{
  id: 'F-TRACKER', t: 'FACT',
  text: 'TEST-ONLY Initiative | Status passed | phase pilot-active', src: 'TEST-ONLY tracker'
}, {
  id: 'F-POINTER', t: 'FACT',
  text: 'Initiative_Tracker (InitiativeID TEST-ONLY); snapshot: engine_audit_c999.json snapshots.Initiative_Tracker',
  src: 'TEST-ONLY tracker'
}];
trackerSourceBriefW3.known = trackerSourceBriefW3.manifest.approvedFacts.map(row => ({ ...row }));
trackerSourceBriefW3.manifest.approvedQuotes = [];
trackerSourceBriefW3.manifest.approvedSubjects = [];
trackerSourceBriefW3.signal.plan.closeQuestion = 'Does CrimeIndex explain this?';
const trackerSourceBrief = p.renderSourceBrief(trackerSourceBriefW3);
assert.match(trackerSourceBrief,
  /TEST-ONLY Initiative is listed as passed, and its supplied phase is pilot active\./);
assert.doesNotMatch(trackerSourceBrief, /engine_audit|snapshot:|CrimeIndex/);

const inlinePopProfileW3 = p.buildWritePacket({
  cycle: 999, desk: 'civic', reporter, story, approach: 'Test the mismatch',
  angleInput: { ...w1, exposure: { ...w1.exposure, candidates: [{
    pop: 'TEST-POP-02', name: 'Test Resident',
    profile: 'Test Resident (POP-90002) — role: TEST-ONLY Mechanic; neighborhood: TEST-HOOD',
    why: 'assignment', role: 'TEST-ONLY Mechanic', hood: 'TEST-HOOD'
  }] } },
  anglePlan: plan,
  interviews: [{ pop: 'TEST-POP-02', name: 'Test Resident', claims, inputPacket: resident }],
  lane: [], reviewProfile: sourceBriefProfile,
});
assert.ok(inlinePopProfileW3.manifest.approvedSubjects.every(row => !/POP-\d+/.test(row.profile)));
const inlineProfileBrief = p.renderSourceBrief(inlinePopProfileW3);
assert.match(inlineProfileBrief, /\*\*Test Resident — TEST-ONLY Mechanic, TEST-HOOD\*\*/);
assert.doesNotMatch(inlineProfileBrief, /careerStage|wealth|employerBiz|tier:/);

// P Slayer's fan-pulse slice is a typed LEP/2 input, not side-channel prompt text.
const sportsStory = {
  ref: 'output/TEST_ONLY_SPORTS.json rows[1]',
  label: 'TEST-ONLY Test Club won 4-3',
  angle: 'what the TEST-ONLY result means to the fan seat',
  kind: 'result-pulse',
};
const sportsSlice = {
  players: [{
    popid: 'TEST-PLAYER-01', name: 'Test Player', role: 'TEST-ONLY Player',
    neighborhood: 'TEST-HOOD', why: 'feed-name',
  }],
  prewrite: {
    anchorFacts: ['TEST-ONLY Sports Feed: Test Club won 4-3'],
    priorTake: 'TEST-ONLY prior take (output/TEST_ONLY_PRIOR.md)',
  },
  charge: {
    fanCharge: 'defiance',
    bagModes: [{ id: 3, name: 'Friction Pivot' }],
    centralFeeling: 'TEST-ONLY relief fighting with doubt',
  },
  friction: { frame: 'TEST-ONLY one win does not settle the argument' },
  scene: { colorRoom: 'TEST-ONLY unnamed bleacher color only' },
};
const pReporter = { popid: 'POP-00008', name: 'P Slayer' };
const sportsW1 = p.buildAnglePacket({
  cycle: 999, desk: 'sports', reporter: pReporter, story: sportsStory,
  approach: 'TEST-ONLY first-person fan heat', slice: sportsSlice, lane: [],
});
assert.deepStrictEqual(sportsW1.exposure.candidates, []);
assert.deepStrictEqual(sportsW1.output.schema.targets, []);
assert.ok(sportsW1.known.some(row => row.text === sportsSlice.prewrite.anchorFacts[0]));
assert.deepStrictEqual(sportsW1.task.creativeBrief, {
  kind: 'fan-heat',
  fanCharge: 'defiance',
  bagModes: ['3 Friction Pivot'],
  friction: 'TEST-ONLY one win does not settle the argument',
  centralFeeling: 'TEST-ONLY relief fighting with doubt',
  priorTake: 'TEST-ONLY prior take (output/TEST_ONLY_PRIOR.md)',
  sceneRule: 'TEST-ONLY unnamed bleacher color only',
});
const sportsPlan = p.validateAngleOutput({
  focus: 'TEST-ONLY fan consequence', why: 'The supplied result leaves tension',
  checks: ['Check the supplied sports feed'],
  targets: [{ pop: 'TEST-PLAYER-01', question: 'What changed?', basis: 'feed-name' }],
  interpretation: 'The result may sharpen the argument', unverifiedLead: [],
  closeQuestion: 'Does one result change the fan verdict?',
}, sportsW1);
const pProfile = {
  id: 'TEST-P-SLAYER', canonPolicy: 'load-bearing',
  authorizedTexture: ['unnamed bleacher color'],
  textureConditions: ['texture carries no sports fact'],
  canonBlockers: ['unsupported roster move'],
};
const sportsW3 = p.buildWritePacket({
  cycle: 999, desk: 'sports', reporter: pReporter, story: sportsStory,
  approach: 'TEST-ONLY first-person fan heat', angleInput: sportsW1,
  anglePlan: sportsPlan, interviews: [], lane: [], reviewProfile: pProfile,
});
assert.deepStrictEqual(sportsW3.task.creativeBrief, sportsW1.task.creativeBrief);
assert.ok(sportsW3.manifest.approvedFacts.some(row =>
  row.text === sportsSlice.prewrite.anchorFacts[0]));
assert.doesNotThrow(() => p.assertBase(sportsW3, 'W3'));

const unresolvedSportsW1 = p.buildAnglePacket({
  cycle: 999, desk: 'sports', reporter: pReporter,
  story: { ...sportsStory, popids: [], citizens: ['Unresolved Test Player'] },
  approach: 'TEST-ONLY first-person fan heat',
  slice: { ...sportsSlice, players: [{ popid: null, name: 'Unresolved Test Player', why: 'feed-name' }] },
  lane: [],
});
assert.deepStrictEqual(unresolvedSportsW1.exposure.candidates, []);
assert.deepStrictEqual(unresolvedSportsW1.output.schema.targets, []);

const luisProfile = {
  id: 'TEST-LUIS', canonPolicy: 'load-bearing',
  authorizedTexture: ['known versus unknown structure'],
  textureConditions: ['missing fields remain unknown'],
  canonBlockers: ['invented request or owner'],
};
const luisW1 = p.buildAnglePacket({
  cycle: 999, desk: 'civic', reporter,
  story: { ...story, popids: [], citizens: [] }, approach: 'TEST-ONLY investigation',
  slice: { kind: 'civic-domain', packetSeat: {
    seat: { domain: 'accountability-anomaly' },
    prewrite: { method: 'KNOWN_UNKNOWN', missing: ['documented response'],
      reportingEvidence: {
        recordChecks: { state: 'NOT_SUPPLIED', events: [] },
        requestEvents: { state: 'NOT_SUPPLIED', events: [] },
        responseEvents: { state: 'NOT_SUPPLIED', events: [] },
        responsibleEntities: { state: 'NOT_SUPPLIED', entities: [] },
      },
      silenceClock: { state: 'UNESTABLISHED', value: null, src: null }, forbidden: [] }
  } }, lane: [],
});
const luisPlan = p.validateAngleOutput({
  focus: 'TEST-ONLY gap', why: 'It is open', checks: ['Check the record'], targets: [],
  interpretation: 'The cause is unknown', unverifiedLead: [], closeQuestion: 'What explains it?'
}, luisW1);
const luisW3 = p.buildWritePacket({ cycle: 999, desk: 'civic', reporter,
  story: { ...story, popids: [], citizens: [] }, approach: 'TEST-ONLY investigation',
  angleInput: luisW1, anglePlan: luisPlan, interviews: [], lane: [], reviewProfile: luisProfile });
assert.match(luisW3.limits.rule, /do not convert a source intention to keep watching into past tracking/);
assert.match(luisW3.limits.rule, /the Packet does not establish X/);
assert.match(luisW3.limits.rule, /First-person reporting acts require an approved fact/);
assert.ok(luisW3.manifest.permittedInterpretationSlots.some(row => row.id === 'P_KNOWN_UNKNOWN'));
assert.equal(luisW3.task.writingMode, 'RECORDS_BRIEF');
assert.equal(luisW3.reviewProfile.articleContract.targetWords, '180-280');
assert.deepStrictEqual(luisW3.manifest.unverifiedLeads, []);
assert.ok(luisW3.manifest.approvedSubjects.every(row => !/POP-\d+/.test(row.profile)));
assert.equal(luisW3.signal.plan.closeQuestion,
  'What record would explain why the supplied Initiative has not advanced?');
const luisOverreach = p.auditArticle(
  'I went looking. Two residents flagged it to me independently. Somebody owns the file.', luisW3);
assert.equal(luisOverreach.ok, false);
assert.ok(luisOverreach.errors.some(row => row.code === 'INVESTIGATION_EPISTEMIC_OVERREACH'));
const luisEngineLeak = p.auditArticle('The stuck-initiative is marked high in row 4.', luisW3);
assert.equal(luisEngineLeak.ok, false);
assert.ok(luisEngineLeak.errors.some(row => row.code === 'ENGINE_METADATA_LEAK'));
const luisMissingAsAbsence = p.auditArticle('There is no request and no response.', luisW3);
assert.equal(luisMissingAsAbsence.ok, false);
assert.ok(luisMissingAsAbsence.errors.some(row => row.code === 'INVESTIGATION_EPISTEMIC_OVERREACH'));
assert.equal(p.auditArticle(
  'The Packet does not establish a request, response, owner, office, or cause.', luisW3).ok, true);
const luisRendered = p.renderRecordsBrief(luisW3);
assert.match(luisRendered, /^# /);
assert.match(luisRendered, /The supplied record does not establish documented response/);
assert.match(luisRendered, /^## INTAKE$/m);
assert.equal(p.auditArticle(luisRendered, luisW3).ok, true);
const scalarLead = p.validateReportOutput({
  answer: 'quote', fact_ids: [luisW1.known[0].id], stance_id: 'S_ATTENTION',
  question_id: 'Q_GAP', intention_id: 'I_NONE',
  unverifiedLead: 'TEST-ONLY discarded lead', abstain_reason: null,
}, p.buildReportPacket({
  cycle: 999, desk: 'civic', reporter, angleInput: luisW1, anglePlan: luisPlan,
  story: { ...story, popids: [], citizens: [] },
  candidate: { pop: 'POP-TEST', name: 'Test Citizen', role: 'citizen', hood: story.hood },
}));
assert.deepStrictEqual(scalarLead.unverifiedLead, ['TEST-ONLY discarded lead']);

// Lila's health-service brief keeps human consequence and clinical claims
// explicitly unestablished when the slice supplies only implementation state.
const healthProfile = {
  id: 'TEST-LILA', canonPolicy: 'load-bearing',
  articleContract: { renderMode: 'SOURCE_BRIEF' },
  authorizedTexture: ['plain-language health-service translation'],
  textureConditions: ['clinical claims require Packet support'],
  canonBlockers: ['invented diagnosis or patient'],
};
const healthStory = {
  ref: 'INIT-TEST-HEALTH', label: 'Construction is active for Test Health Center.',
  angle: 'Construction is active for Test Health Center.', kind: 'initiative',
  hood: 'TEST-HOOD', popids: [], citizens: [],
};
const healthSlice = { kind: 'civic-domain', packetSeat: {
  seat: { domain: 'health' },
  prewrite: {
    method: 'ACCESS_TIMELINE_HUMAN_COST',
    missing: ['a named affected resident', 'a diagnosis or treatment result'],
    humanConsequence: { state: 'UNESTABLISHED', subjects: [], facts: [], src: null },
    forbidden: ['Do not invent diagnoses, patients, or outcomes.'],
  }
} };
const healthW1 = p.buildAnglePacket({ cycle: 999, desk: 'civic', reporter,
  story: healthStory, approach: 'TEST-ONLY clinical calm', slice: healthSlice, lane: [] });
assert.equal(healthW1.task.creativeBrief.kind, 'health-service');
assert.equal(healthW1.task.creativeBrief.method, 'ACCESS_TIMELINE_HUMAN_COST');
assert.deepStrictEqual(healthW1.task.creativeBrief.humanConsequence,
  { state: 'UNESTABLISHED', subjects: [], facts: [], src: null });
const healthPlan = p.validateAngleOutput({
  focus: 'TEST-ONLY health service', why: 'The timeline remains open',
  checks: ['Check the supplied record'], targets: [], interpretation: 'Impact is unknown',
  unverifiedLead: [], closeQuestion: 'What access record is still needed?'
}, healthW1);
const healthW3 = p.buildWritePacket({ cycle: 999, desk: 'civic', reporter,
  story: healthStory, approach: 'TEST-ONLY clinical calm', angleInput: healthW1,
  anglePlan: healthPlan, interviews: [], lane: [], reviewProfile: healthProfile });
assert.equal(healthW3.task.writingMode, 'SOURCE_BRIEF');
assert.deepStrictEqual(healthW3.task.creativeBrief, healthW1.task.creativeBrief);
assert.equal(p.auditArticle(p.renderSourceBrief(healthW3), healthW3).ok, true);

// Jordan's economic slice carries sourced conditions and limits through LEP/2.
const economicStory = {
  ref: 'output/TEST_ONLY_ECONOMIC.json rows[1]',
  label: 'TEST-ONLY storefront pressure',
  angle: 'what the TEST-ONLY pressure means for one block',
  kind: 'hood-cooling', hood: 'TEST-HOOD',
  popids: ['TEST-WORKER-01'],
  citizens: ['Test Worker — Worker, TEST-HOOD'],
};
const economicSlice = {
  kind: 'economic-storefront',
  prewrite: {
    pulseClass: 'hood-cooling',
    angle: 'TEST-ONLY storefront pressure reaches payroll decisions',
    hookLine: 'TEST-ONLY counters are quieter in the supplied record',
    namedBusinesses: ['Test Storefront'],
    anchorFacts: [
      'TEST-ONLY Test Storefront appears in the supplied ledger',
      'Do not invent TEST-ONLY employee counts',
    ],
    forbidden: ['Do not invent employee counts', 'Do not print raw engine decimals'],
  },
  scene: { colorRoom: 'TEST-ONLY generic shutters and counter light only' },
};
const jordanReporter = { popid: 'POP-00153', name: 'Jordan Velez' };
const economicW1 = p.buildAnglePacket({
  cycle: 999, desk: 'business', reporter: jordanReporter, story: economicStory,
  approach: 'TEST-ONLY follow the money', slice: economicSlice, lane: [],
});
assert.equal(economicW1.exposure.candidates[0].pop, 'TEST-WORKER-01');
assert.ok(economicW1.known.some(row =>
  row.text === economicSlice.prewrite.anchorFacts[0]));
assert.ok(!economicW1.known.some(row =>
  row.text === economicSlice.prewrite.anchorFacts[1]));
assert.deepStrictEqual(economicW1.task.creativeBrief, {
  kind: 'economic-storefront',
  pulseClass: 'hood-cooling',
  economicFrame: 'TEST-ONLY storefront pressure reaches payroll decisions',
  hook: 'TEST-ONLY counters are quieter in the supplied record',
  namedBusinesses: ['Test Storefront'],
  forbidden: ['Do not invent employee counts', 'Do not print raw engine decimals'],
  sceneRule: 'TEST-ONLY generic shutters and counter light only',
});

// C103 Jordan regression: a selected economic signal can carry no citizen POPIDs.
// The Packet makes the empty contract explicit and narrows invented targets to [].
const noCandidateW1 = p.buildAnglePacket({
  cycle: 999, desk: 'business', reporter: jordanReporter,
  story: { ...economicStory, popids: [], citizens: [] },
  approach: 'TEST-ONLY follow the money', slice: economicSlice, lane: [],
});
assert.deepStrictEqual(noCandidateW1.output.schema.targets, []);
assert.match(noCandidateW1.output.rule, /Return targets as an empty array/);
const noCandidatePlan = p.validateAngleOutput({
  focus: 'TEST-ONLY livelihood pressure', why: 'The supplied condition has a worker consequence',
  checks: ['Check the supplied ledger record'],
  targets: [
    { pop: 'MADE-UP-01', question: 'What changed?', basis: 'invented' },
    { pop: 'MADE-UP-02', question: 'Who is affected?', basis: 'invented' },
  ],
  interpretation: 'The pressure may reach payroll', unverifiedLead: [],
  closeQuestion: 'Who carries the supplied pressure?',
}, noCandidateW1);
assert.deepStrictEqual(noCandidatePlan.targets, []);
const economicPlan = p.validateAngleOutput({
  focus: 'TEST-ONLY livelihood pressure', why: 'The supplied condition has a worker consequence',
  checks: ['Check the supplied ledger record'],
  targets: [{ pop: 'TEST-WORKER-01', question: 'What changed?', basis: 'assignment' }],
  interpretation: 'The pressure may reach payroll', unverifiedLead: [],
  closeQuestion: 'Who carries the supplied pressure?',
}, economicW1);
const jordanProfile = {
  id: 'TEST-JORDAN', canonPolicy: 'load-bearing',
  authorizedTexture: ['generic storefront light'],
  textureConditions: ['texture carries no measured trend'],
  canonBlockers: ['unsupported hiring claim'],
};
const economicW3 = p.buildWritePacket({
  cycle: 999, desk: 'business', reporter: jordanReporter, story: economicStory,
  approach: 'TEST-ONLY follow the money', angleInput: economicW1,
  anglePlan: economicPlan, interviews: [], lane: [], reviewProfile: jordanProfile,
});
assert.deepStrictEqual(economicW3.task.creativeBrief, economicW1.task.creativeBrief);
assert.ok(economicW3.manifest.approvedFacts.some(row =>
  row.text === economicSlice.prewrite.anchorFacts[0]));
assert.doesNotThrow(() => p.assertBase(economicW3, 'W3'));

// Kai's arts seat consumes the shared evening substrate through a seat-specific
// pulse/overlay; TV, movies, fame, and named places stay source-bounded.
const kaiStory = {
  ref: 'output/TEST_ONLY_EVENING.json lanes.culture[0]',
  label: 'TEST-ONLY TV slate changes the neighborhood night',
  angle: 'what the TEST-ONLY screen night does to the arts block',
  kind: 'tv-slate', hood: 'TEST-HOOD',
  hookLine: 'TEST-ONLY viewers are choosing the supplied slate tonight',
};
const kaiSlice = {
  kind: 'evening-life',
  packetSeat: { persona: 'kai-marston', bag: 'arts', bagDoc: 'docs/media/KAI_ARTS_BAG.md', pulseClass: 'tv-slate', pulseLabel: 'TEST-ONLY screen pulse' },
  prewrite: { pulseClass: 'tv-slate', angle: 'TEST-ONLY screen pulse', hookLine: 'TEST-ONLY supplied hook', bagRecommend: 'arts', bagSlug: 'kai-marston', anchorFacts: ['NAMED: Test Arts Event'] },
  texture: {
    cityEvents: ['Test Arts Event'], tv: ['Test Show'], movies: ['Test Film'],
    famous: ['Test Artist'], restaurants: [{ name: 'Test Venue' }], nightlife: [],
    streamingTrend: 'Test streaming trend',
  },
  signals: { fame: [{ name: 'Test Artist', venue: 'Test Venue' }] },
  scene: { colorRoom: 'TEST-ONLY unnamed gallery light and room sound' },
  pointers: ['output/world_summary_c999.md ## Evening Texture', 'output/desk_signal_c999.json lanes.culture'],
};
const kaiW1 = p.buildAnglePacket({
  cycle: 999, desk: 'culture', reporter: { popid: 'POP-00158', name: 'Kai Marston' },
  story: kaiStory, approach: 'TEST-ONLY Kai arts approach', slice: kaiSlice, lane: [],
});
assert.deepStrictEqual(kaiW1.task.creativeBrief, {
  kind: 'evening-life', bag: 'arts', pulseClass: 'tv-slate', pulseLabel: 'TEST-ONLY screen pulse',
  namedEvents: ['Test Arts Event', 'Test Show', 'Test Film'], namedPlaces: ['Test Venue'],
  famousSightings: ['Test Artist', 'Test Artist — Test Venue'], streamingTrend: 'Test streaming trend',
  sceneRule: 'TEST-ONLY unnamed gallery light and room sound',
  sourcePointers: ['docs/media/KAI_ARTS_BAG.md', 'output/world_summary_c999.md ## Evening Texture', 'output/desk_signal_c999.json lanes.culture'],
});
assert.ok(kaiW1.known.some(row => row.text === kaiStory.label));

console.log('livedExperiencePacketV2.test.js: PASS');
