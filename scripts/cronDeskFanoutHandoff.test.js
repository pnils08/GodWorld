#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  stageStem,
  nameSlug,
  writerArtifactTag,
  evaluationStem,
  validateAngleEvaluationOptions,
  validatePackageEvaluationOptions,
  selectTypedSlice,
  buildWriterArgs,
  activateWakeContext,
  stageRoute,
  validateWakeHandoff,
} = require('./cron-desk-run');
const { buildOutputSlug } = require('./cron-desk-writer');

const rosterAssignment = {
  name: 'Dr. Lila Mezran',
  desk: 'civic',
  persona: null,
};
const rosterTag = writerArtifactTag(rosterAssignment, null);
assert.strictEqual(rosterTag, 'dr-lila-mezran');
const rosterArgs = buildWriterArgs(
  'civic',
  'output/cron-compare/civic.state.md',
  null,
  rosterTag
);
assert.deepStrictEqual(
  rosterArgs.slice(1),
  [
    '--desk', 'civic',
    '--state-file', 'output/cron-compare/civic.state.md',
    '--artifact-tag', 'dr-lila-mezran',
    '--provider', 'openrouter',
    '--model', 'deepseek/deepseek-v4-flash-0731',
  ]
);

const expectedRosterDraft =
  stageStem(102, 'civic', rosterTag) + 'deepseek-deepseek-v4-flash-0731.md';
const emittedRosterDraft =
  'civic_c102_' +
  buildOutputSlug(null, rosterTag, 'deepseek-deepseek-v4-flash-0731') +
  '.md';
assert.strictEqual(emittedRosterDraft, expectedRosterDraft);

const personaAssignment = {
  name: 'Jax Caldera',
  desk: 'civic',
  persona: 'freelance-firebrand',
};
assert.strictEqual(
  writerArtifactTag(personaAssignment, personaAssignment.persona),
  null
);
const personaArgs = buildWriterArgs(
  'civic',
  'output/cron-compare/civic.state.md',
  personaAssignment.persona,
  null
);
assert.deepStrictEqual(
  personaArgs.slice(1),
  [
    '--desk', 'civic',
    '--state-file', 'output/cron-compare/civic.state.md',
    '--persona', 'freelance-firebrand',
    '--provider', 'openrouter',
    '--model', 'meta-llama/llama-4-maverick',
  ]
);

const livePackageRoute = require('./newsroomWakePackages')
  .routeFor(require('./newsroomWakePackages').loadPackages()['freelance-firebrand'], 'write');
const packagedPersonaArgs = buildWriterArgs(
  'civic',
  'output/cron-compare/civic.state.json',
  personaAssignment.persona,
  'packet-v2',
  livePackageRoute
);
assert.deepStrictEqual(
  packagedPersonaArgs.slice(1),
  [
    '--desk', 'civic',
    '--state-file', 'output/cron-compare/civic.state.json',
    '--persona', 'freelance-firebrand',
    '--artifact-tag', 'packet-v2',
    '--provider', 'openrouter',
    '--model', 'anthropic/claude-sonnet-5.5',
  ]
);
const sonnetSlug = 'anthropic-claude-sonnet-5-5';
const expectedPackagedDraft =
  stageStem(102, 'civic', personaAssignment.persona) +
  'packet-v2_' + sonnetSlug + '.md';
const emittedPackagedDraft =
  'civic_c102_' +
  buildOutputSlug(
    personaAssignment.persona,
    'packet-v2',
    sonnetSlug
  ) +
  '.md';
assert.strictEqual(emittedPackagedDraft, expectedPackagedDraft);
// Firebrand routes to llama-4-maverick (heat seat); slug must match desk-model-map.
const firebrandSlug = 'meta-llama-llama-4-maverick';
const expectedPersonaDraft =
  stageStem(102, 'civic', personaAssignment.persona) +
  firebrandSlug + '.md';
const emittedPersonaDraft =
  'civic_c102_' +
  buildOutputSlug(
    personaAssignment.persona,
    null,
    firebrandSlug
  ) +
  '.md';
assert.strictEqual(emittedPersonaDraft, expectedPersonaDraft);

assert.strictEqual(writerArtifactTag(null, null), null);
assert.strictEqual(nameSlug(' Farrah Del Rio '), 'farrah-del-rio');
assert.strictEqual(
  evaluationStem('sports_c103_anthony-raines_packet-v2_', 'Llama 3.3'),
  'sports_c103_anthony-raines_packet-v2_benchmark-llama-3-3_'
);
assert.throws(() => evaluationStem('sports_c103_', '---'), /evaluation tag/);
assert.throws(() => validateAngleEvaluationOptions({ model: 'model-only' }), /supplied together/);
assert.throws(() => validateAngleEvaluationOptions({
  model: 'meta-llama/llama-3.3-70b-instruct', tag: 'llama', stage: 'write',
  packetContract: 'v2', noGate: true, fanout: false,
}), /requires --stage=angle/);
assert.throws(() => validateAngleEvaluationOptions({
  model: 'meta-llama/llama-3.3-70b-instruct', tag: 'llama', stage: 'angle',
  packetContract: 'v2', noGate: true, fanout: true,
}), /forbids --fanout/);
assert.strictEqual(validateAngleEvaluationOptions({
  model: 'meta-llama/llama-3.3-70b-instruct', tag: 'llama', stage: 'angle',
  packetContract: 'v2', noGate: true, fanout: false,
}), true);
assert.throws(() => validatePackageEvaluationOptions({ packageKey: 'hal-richmond',
  tag: null, stage: 'report', noGate: true, fanout: false }), /requires --evaluation-tag/);
assert.throws(() => validatePackageEvaluationOptions({ packageKey: 'hal-richmond',
  tag: 'deepseek', stage: 'report', noGate: true, fanout: true }), /forbids --fanout/);
assert.strictEqual(validatePackageEvaluationOptions({ packageKey: 'hal-richmond',
  tag: 'deepseek', stage: 'write', noGate: true, fanout: false }), true);
const halTypedSlice = { kind: 'hal-archive', empty: false };
assert.strictEqual(selectTypedSlice([null, { empty: true }, halTypedSlice]), halTypedSlice);
assert.throws(
  () => writerArtifactTag({ name: '---' }, null),
  /no usable reporter name/
);
assert.throws(
  () => writerArtifactTag({ name: 'a'.repeat(49) }, null),
  /exceeds the writer tag contract/
);

const liveContext = activateWakeContext(personaAssignment, personaAssignment.persona);
assert.equal(liveContext.packetContract, 'v2');
assert.equal(liveContext.wakePackage.version, 'JAX-LEP2-1');
assert.equal(stageRoute('civic', personaAssignment.persona, 'angle').model,
  'meta-llama/llama-4-maverick');
assert.equal(stageRoute('civic', personaAssignment.persona, 'write').model,
  'anthropic/claude-sonnet-5.5');

const jordanAssignment = {
  name: 'Jordan Velez',
  popid: 'POP-00153',
  desk: 'business',
  beatDomain: 'ECONOMIC',
  persona: 'business-desk',
};
const jordanContext = activateWakeContext(jordanAssignment, jordanAssignment.persona);
assert.equal(jordanContext.packetContract, 'v2');
assert.equal(jordanContext.wakePackage.version, 'JORDAN-LEP2-1');
for (const file of ['IDENTITY.md', 'LENS.md', 'RULES.md']) {
  assert.ok(fs.existsSync(path.join(__dirname, '..', '.claude', 'agents',
    jordanAssignment.persona, file)), 'Jordan control-plane identity missing ' + file);
}
assert.equal(stageRoute('business', jordanAssignment.persona, 'angle').model,
  'deepseek/deepseek-v4-flash-0731');
assert.equal(stageRoute('business', jordanAssignment.persona, 'report').model,
  'deepseek/deepseek-v4-flash-0731');
assert.equal(stageRoute('business', jordanAssignment.persona, 'write').model,
  'anthropic/claude-opus-5.5');

const kaiAssignment = {
  name: 'Kai Marston',
  popid: 'POP-00158',
  desk: 'culture',
  beatDomain: 'CULTURE',
  persona: 'kai-marston',
};
const kaiContext = activateWakeContext(kaiAssignment, kaiAssignment.persona);
assert.equal(kaiContext.packetContract, 'v2');
assert.equal(kaiContext.wakePackage.version, 'KAI-LEP2-1');
assert.equal(stageRoute('culture', kaiAssignment.persona, 'angle').model,
  'meta-llama/llama-4-maverick');
assert.equal(stageRoute('culture', kaiAssignment.persona, 'report').model,
  'meta-llama/llama-4-maverick');
assert.equal(stageRoute('culture', kaiAssignment.persona, 'write').model,
  'anthropic/claude-haiku-5.5');

const lilaAssignment = {
  name: 'Dr. Lila Mezran', popid: 'POP-00154', desk: 'civic',
  beatDomain: 'HEALTH', persona: 'lila-mezran',
};
const lilaContext = activateWakeContext(lilaAssignment, lilaAssignment.persona);
assert.equal(lilaContext.packetContract, 'v2');
assert.equal(lilaContext.wakePackage.version, 'LILA-LEP2-1');
assert.equal(stageRoute('civic', lilaAssignment.persona, 'angle').model,
  'deepseek/deepseek-v4-flash-0731');
assert.equal(stageRoute('civic', lilaAssignment.persona, 'report').model,
  'deepseek/deepseek-v4-flash-0731');
assert.equal(stageRoute('civic', lilaAssignment.persona, 'write').model,
  'anthropic/claude-haiku-5.5');

const angelaAssignment = {
  name: 'Angela Reyes', popid: 'POP-00156', desk: 'civic',
  beatDomain: 'EDUCATION', persona: 'angela-reyes',
};
const angelaContext = activateWakeContext(angelaAssignment, angelaAssignment.persona);
assert.equal(angelaContext.packetContract, 'v2');
assert.equal(angelaContext.wakePackage.version, 'ANGELA-LEP2-1');
for (const file of [
  path.join(__dirname, '..', 'docs', 'media', 'voices', 'angela_reyes.md'),
  path.join(__dirname, '..', 'docs', 'media', 'ANGELA_EDUCATION_BAG.md'),
  path.join(__dirname, '..', 'docs', 'mara-vance', 'AGENT_INVENTORY.md'),
]) {
  assert.doesNotMatch(fs.readFileSync(file, 'utf8'),
    /\bOUSD\b|Oakland Unified|Laurel Elementary|real Oakland school geography/i,
    'Angela active newsroom source carries a real-world school reference: ' + file);
}
assert.equal(stageRoute('civic', angelaAssignment.persona, 'angle').model,
  'deepseek/deepseek-v4-flash-0731');
assert.equal(stageRoute('civic', angelaAssignment.persona, 'report').model,
  'deepseek/deepseek-v4-flash-0731');
assert.equal(stageRoute('civic', angelaAssignment.persona, 'write').model,
  'anthropic/claude-haiku-5.5');

const noahAssignment = {
  name: 'Noah Tan', popid: 'POP-00157', desk: 'civic',
  beatDomain: 'ENVIRONMENT', persona: 'noah-tan',
};
const noahContext = activateWakeContext(noahAssignment, noahAssignment.persona);
assert.equal(noahContext.packetContract, 'v2');
assert.equal(noahContext.wakePackage.version, 'NOAH-LEP2-1');
assert.equal(stageRoute('civic', noahAssignment.persona, 'angle').model,
  'deepseek/deepseek-v4-flash-0731');
assert.equal(stageRoute('civic', noahAssignment.persona, 'write').model,
  'x-ai/grok-4.3');   // pipeline.74 — the scene seats' model (was gpt-5.6-luna)

const handoffAngle = {
  stage: 'angle', cycle: '103', persona: 'luis-navarro', packetContract: 'v2',
  reporter: { name: 'Luis Navarro', popid: 'POP-00636' },
  assignment: { story: { ref: 'TEST-SIGNAL', label: 'Test signal' }, approach: 'Test approach' },
  ranAt: '2026-08-13T11:16:54.979Z',
};
const handoffPacket = {
  stage: 'report', cycle: '103', persona: 'luis-navarro', packetContract: 'v2',
  reporter: { name: 'Luis Navarro', popid: 'POP-00636' },
  assignment: { story: { ref: 'TEST-SIGNAL', label: 'Test signal' } },
  angle: 'output/cron-compare/civic_c103_luis-navarro_packet-v2_angle.json',
  ranAt: '2026-08-13T18:16:09.946Z',
};
const handoffExpected = {
  cycle: '103', persona: 'luis-navarro',
  reporter: { name: 'Luis Navarro', popid: 'POP-00636' },
  anglePath: 'output/cron-compare/civic_c103_luis-navarro_packet-v2_angle.json',
};
assert.equal(validateWakeHandoff(handoffAngle, handoffPacket, handoffExpected), true);
assert.throws(() => validateWakeHandoff(handoffAngle,
  Object.assign({}, handoffPacket, { ranAt: '2026-08-12T18:16:09.946Z' }),
  handoffExpected), /not newer than angle/);
assert.throws(() => validateWakeHandoff(handoffAngle,
  Object.assign({}, handoffPacket, { reporter: { name: 'Wrong', popid: 'POP-99999' } }),
  handoffExpected), /reporter POPID mismatch/);
assert.throws(() => validateWakeHandoff(handoffAngle,
  Object.assign({}, handoffPacket, { assignment: { story: { ref: 'TEST-OTHER' } } }),
  handoffExpected), /assigned story mismatch/);

// --- pipeline.75 deterministic draft checks ---------------------------------
{
  const cdr = require('./cron-desk-run');
  const body = n => Array.from({ length: n }, (_, i) => 'word' + i).join(' ');
  // thin: INTAKE footer excluded from the count
  const thinDraft = '# Head\n\n' + body(40) + '\n\n## INTAKE\n' + body(300) + '\n';
  const t = cdr.thinCheck(thinDraft, '400-700');
  assert.equal(t.thin, true);
  assert.match(t.reason, /^thin: \d+ words \(floor 150, seat target 400-700\)$/);
  // package thinFloor (Tamsin 40, Ines 80) replaces the 150 default; invalid floors fall back
  assert.equal(cdr.thinCheck('# Head\n\n' + body(45), null, 40).thin, false);
  assert.equal(cdr.thinCheck('# Head\n\n' + body(45), null, 80).thin, true);
  assert.equal(cdr.thinCheck('# Head\n\n' + body(45), null, undefined).floor, 150);
  assert.equal(cdr.thinCheck('# Head\n\n' + body(45), null, 'x').floor, 150);
  assert.ok(t.words < 50, 'INTAKE words not counted: ' + t.words);
  assert.equal(cdr.thinCheck('# Head\n\n' + body(200), null).thin, false);
  // engine terms: reuses validateEdition's list
  assert.deepStrictEqual(cdr.engineTermCheck('The tension score rose.\n\n## INTAKE\ncivic load'), ['tension score']);
  assert.deepStrictEqual(cdr.engineTermCheck('Nothing odd here at all.'), []);
  // verbatim: event text from a Who Lived It row, 6+ word run; the name alone never hits
  const pk = { known: [
    { t: 'FACT', text: 'Javier Robertson — limited social activity due to winter mood', src: 'output/world_summary_c111.md ## Who Lived It' },
    { t: 'FACT', text: 'The A’s parade rolled through Downtown with the whole roster aboard', src: 'world_summary ## Sports' }] };
  const hit = cdr.verbatimSliceRuns('Javier Robertson has had limited social activity due to winter mood lately.', pk);
  assert.equal(hit.length, 1);
  assert.equal(hit[0].run, 'limited social activity due to winter');
  // near-verbatim (the C111 print): one sentence carrying >=80% of the event's content words
  const near = cdr.verbatimSliceRuns('Robertson, however, has had limited social activity because of winter mood.', pk);
  assert.equal(near.length, 1);
  assert.equal(near[0].run, 'limited social activity winter mood');
  // the same words spread over separate sentences are not a reprint
  assert.deepStrictEqual(cdr.verbatimSliceRuns('Activity was limited. Social plans waited. Winter has a mood.', pk), []);
  assert.deepStrictEqual(cdr.verbatimSliceRuns('Javier Robertson stayed in more this week.', pk), []);
  assert.deepStrictEqual(cdr.verbatimSliceRuns('The A’s parade rolled through Downtown with the whole roster aboard.', pk), [],
    'non-event sources are not checked');
  // cap hit
  assert.equal(cdr.angleCapHit({ completion: 700, maxTokens: 700, finish: 'length' }), true);
  assert.equal(cdr.angleCapHit({ completion: 1600, maxTokens: 1600, finish: null }), true);
  assert.equal(cdr.angleCapHit({ completion: 616, maxTokens: 1600, finish: 'stop' }), false);
  assert.equal(cdr.angleCapHit(null), false);
  // totals + summary format
  const totals = cdr.fanoutCheckTotals([
    { toolCalls: 0, capHits: 1, thin: true, engineTerms: [], verbatim: [] },
    { toolCalls: 2, capHits: 0, thin: false, engineTerms: ['tension score'], verbatim: [{ run: 'x' }] },
    null]);
  assert.deepStrictEqual(totals, { seats: 2, toolSeats: 1, capHits: 1, thin: 1, engineTerm: 1, verbatim: 1 });
  assert.equal(cdr.formatCheckTotals(totals, 'write'), 'tools 1/2 · cap-hits 1 · thin 1 · engine-term 1 · verbatim 1 (warn)');
  assert.equal(cdr.formatCheckTotals(totals, 'angle'), 'cap-hits 1');
  // live read-backs when the C111 artifacts are on disk
  const tanya = path.join(__dirname, '..', 'output', 'cron-compare', 'staged', 'sports_c111_tanya-cruz_packet-v2_x-ai-grok-4-3.staged.md');
  if (fs.existsSync(tanya)) assert.equal(cdr.thinCheck(fs.readFileSync(tanya, 'utf8')).thin, true, 'C111 Tanya (58 words) reads thin');
  const noahMd = path.join(__dirname, '..', 'output', 'cron-compare', 'civic_c111_noah-tan_packet-v2_openai-gpt-5-6-luna.md');
  const noahState = noahMd.replace(/\.md$/, '.state.json');
  if (fs.existsSync(noahMd) && fs.existsSync(noahState)) {
    assert.ok(cdr.verbatimSliceRuns(fs.readFileSync(noahMd, 'utf8'), JSON.parse(fs.readFileSync(noahState, 'utf8'))).length >= 1,
      'C111 Noah prints the winter-mood line');
  }
}

console.log('cron fan-out filename handoff tests: PASS');
