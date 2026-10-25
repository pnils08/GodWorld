'use strict';

const assert = require('assert');
const packages = require('./newsroomWakePackages').loadPackages();
const { buildApiPrompt } = require('./cron-rhea-gate');

const profile = packages['freelance-firebrand'].reviewProfile;
const reviewContext = {
  profile,
  packageVersion: 'JAX-LEP2-1',
  manifest: {
    id: 'AM-TEST',
    policy: 'load-bearing',
    approvedQuotes: [{
      id: 'Q-TEST',
      speakerName: 'Test Citizen',
      text: 'This exact Packet quote is supplied.',
      src: 'packet.W2[TEST-CITIZEN]',
      factIds: ['F-TEST'],
    }],
  },
  audit: {
    manifestId: 'AM-TEST',
    observations: [
      { code: 'UNAPPROVED_NUMBER', values: ['7th'] },
      { code: 'UNAPPROVED_QUOTE', values: ['Test-only bartender color.'] },
    ],
  },
};
const prompt = buildApiPrompt(
  999,
  '# TEST-ONLY Article\n\nA bartender on 7th spoke.\n\n## INTAKE\nCLAIM: Test-only | Initiative_Tracker row 4',
  'TEST-ONLY world state',
  { canonNames: 1, verified: [], unverified: [] },
  [],
  [],
  reviewContext
);

assert.ok(!prompt.user.includes('PERSONA-SPECIFIC SOURCING AUTHORITY'), 'no writer profile reaches Rhea (builder 2026-10-25)');
assert.ok(!prompt.user.includes('AUTHORIZED TEXTURE') && !prompt.user.includes('CANON BLOCKERS') && !prompt.user.includes('LEXICAL REVIEW CUES'), 'no texture fence, no number cues');
assert.ok(prompt.user.includes('bartender'));
assert.ok(prompt.user.includes('Do not score whether the Article moves the sim'));
assert.ok(prompt.system.includes('canonIntegrity'));
const draftSection = prompt.user.split('=== DRAFT TO VERIFY ===')[1].split('Your job is TWO flag classes')[0];
assert.ok(draftSection.includes('A bartender on 7th spoke.'));
assert.ok(!draftSection.includes('Initiative_Tracker'));
assert.ok(prompt.user.includes('machine-only ## INTAKE provenance block was validated separately'));
assert.ok(prompt.user.includes('WHAT THE NAMED CITIZENS SAID'));
assert.ok(prompt.user.includes('Test Citizen: "This exact Packet quote is supplied."'));
assert.ok(prompt.user.includes('packet.W2[TEST-CITIZEN]'));
assert.ok(prompt.user.includes('Do not call an exact listed quote fabricated'));

const faithPrompt = buildApiPrompt(
  999,
  "# TEST-ONLY\n\nA visitor was spotted at B'nai Tikvah Synagogue.\n\n## INTAKE\nCLAIM: Test-only | source",
  'TEST-ONLY raw signal names Beth Jacob Congregation.',
  { canonNames: 0, verified: [], unverified: ["B'nai Tikvah Synagogue"] },
  [],
  [],
  null
);
assert.ok(faithPrompt.user.includes('AUTHORITATIVE FAITH CORRECTIONS FORWARD'));
assert.ok(faithPrompt.user.includes('BLOCKED "Beth Jacob Congregation" => CANON "B\'nai Tikvah Synagogue"'));
assert.ok(faithPrompt.user.includes('canon name on the right is not an invention'));

// pipeline.77 — contract score: shape only; length is code when the contract has one range
{
  const g = require('./cron-rhea-gate');
  // pipeline.80: length is a floor
  assert.equal(g.contractWordFloor('400-700'), 400);
  assert.equal(g.contractWordFloor('evidence-bounded; 350-600'), 350, 'evidence-bounded still has a floor');
  assert.equal(g.contractWordCount('one two\n```\nfenced words here\n```\n<!-- c -->three'), 3, 'same body as thinCheck: no fences, no comments');
  assert.equal(g.contractWordFloor('evidence-bounded'), null);
  assert.equal(g.contractWordFloor('180-280 without; 450-750 with'), null, 'two ranges -> the judge reads it');
  const long = g.parseContractScore('{"opened":true,"closed":true,"purposeMet":true,"inTarget":false,"short":""}',
    { purpose: 'p', articleContract: { targetWords: 'evidence-bounded; 350-600' } }, 793);
  assert.equal(long.inTarget, true, 'Marbury 793 over 350-600 is not a fault');
  assert.equal(long.score, 4);
  const profile = { purpose: 'TEST-ONLY purpose', articleContract: { voice: 'dry', opening: 'TEST-ONLY open', closing: 'TEST-ONLY close', targetWords: '400-700' } };
  const cp = g.buildContractPrompt(profile, 'one two three');
  assert.equal(cp.words, 3);
  assert.ok(cp.user.includes('TEST-ONLY open') && cp.user.includes('TEST-ONLY close') && cp.user.includes('this piece has 3 words'));
  assert.ok(/do not check facts/i.test(cp.system));
  const judged = g.parseContractScore('{"opened":true,"closed":false,"purposeMet":true,"inTarget":true,"short":"It closed on a recap."}', profile, 3);
  assert.equal(judged.inTarget, false, 'code overrides the judge on a single range');
  assert.equal(judged.score, 2);
  assert.equal(judged.short, 'It closed on a recap.');
  const open = g.parseContractScore('{"opened":true,"closed":true,"purposeMet":true,"inTarget":true,"short":""}',
    { purpose: 'p', articleContract: { targetWords: 'evidence-bounded' } }, 90);
  assert.equal(open.inTargetBy, 'judge');
  assert.equal(open.score, 4);
  assert.ok(g.parseContractScore('not json', profile, 3).error);
}

// Voices: the citizens' own page lines reach the model, whole, beside the interview quotes
{
  const withPages = buildApiPrompt(
    999, '# TEST-ONLY\n\nA page line.\n\n## INTAKE\nCLAIM: Test-only | source', 'TEST-ONLY world state',
    { canonNames: 1, verified: [], unverified: [] }, [], [],
    Object.assign({}, reviewContext, { pageLines: [{ customId: 'cp-POP-TEST-c1-work', name: 'Test Citizen', text: 'The citizen wrote this whole line, past any cut.' }] })
  );
  assert.ok(withPages.user.includes('THEIR OWN PAGE LINES'));
  assert.ok(withPages.user.includes('Test Citizen [cp-POP-TEST-c1-work]: "The citizen wrote this whole line, past any cut."'));
  assert.ok(!prompt.user.includes('THEIR OWN PAGE LINES'), 'no page lines, no section');
}

// pageLinesFromManifest against a real-shaped manifest (src as buildVoicesSlice.js writes it): page facts
// resolve to the whole page, non-page facts are ignored, a subject's name wins, a non-subject owner gets
// the ledger name (never a bare POPID), a missing page is dropped and warned, a huge page is capped.
{
  const g = require('./cron-rhea-gate');
  const index = [
    { customId: 'cp-POP-90001-c999-CONVO', popId: 'POP-90001', content: 'Test-only page line, whole, past any five-hundred-char cut.' },
    { customId: 'cp-POP-90002-c999-night', popId: 'POP-90002', content: 'x'.repeat(g.PAGE_LINE_CAP + 50) },
    { customId: 'cp-POP-90003-c999-work', popId: 'POP-90003', content: '' },
  ];
  const manifest = {
    approvedFacts: [
      { id: 'F1', text: 'Test-only page line, whole, past any…', src: 'output/citizen_pages/index.jsonl cp-POP-90001-c999-CONVO' },
      { id: 'F2', text: 'x…', src: 'output/citizen_pages/index.jsonl cp-POP-90002-c999-night' },
      { id: 'F3', text: 'empty', src: 'output/citizen_pages/index.jsonl cp-POP-90003-c999-work' },
      { id: 'F4', text: 'gone', src: 'output/citizen_pages/index.jsonl cp-POP-90004-c999-morning' },
      { id: 'F5', text: 'not a page', src: 'packet.W1.exposure' },
      { id: 'F6', text: 'slice ref, not a page', src: 'output/citizen_pages/index.jsonl (self-initiated pages, last 36h) 2026-01-01' },
    ],
    approvedSubjects: [{ id: 'POP-90001', name: 'Test Subject' }],
  };
  const nameFor = pop => (pop === 'POP-90002' ? 'Test Ledger Name' : null);
  const out = g.pageLinesFromManifest(manifest, { index, nameFor });
  assert.deepEqual(out.map(p => p.customId), ['cp-POP-90001-c999-CONVO', 'cp-POP-90002-c999-night'], 'page facts only; empty + missing dropped');
  assert.equal(out[0].name, 'Test Subject', 'approved subject name wins');
  assert.equal(out[0].text, index[0].content, 'whole page, uncut');
  assert.equal(out[1].name, 'Test Ledger Name', 'non-subject owner resolves through the ledger, not a POPID');
  assert.equal(out[1].text.length, g.PAGE_LINE_CAP, 'pathological page capped');
  assert.deepEqual(g.pageLinesFromManifest({ approvedFacts: [{ src: 'packet.W2[X]' }] }, { index }), [], 'no page facts, no page lines');
  assert.deepEqual(g.pageLinesFromManifest(null, { index }), []);
  // the claude backend prompt carries them too (agy #3b)
  const claudePrompt = g.buildPrompt(999, 'draft.md', 'world.md', null, null,
    Object.assign({}, reviewContext, { pageLines: out.slice(0, 1) }));
  assert.ok(claudePrompt.includes('THEIR OWN PAGE LINES') && claudePrompt.includes(index[0].content), 'claude backend shows page lines');
  // the api prompt pairs the allow-rule with its block-rule (agy #3a)
  const apiPrompt = buildApiPrompt(999, '# TEST-ONLY\n\nA.\n\n## INTAKE\nCLAIM: Test-only | source', 'TEST-ONLY world state',
    { canonNames: 1, verified: [], unverified: [] }, [], [], Object.assign({}, reviewContext, { pageLines: out.slice(0, 1) }));
  assert.ok(apiPrompt.user.includes('Flag words added to a page passage and a page line attributed to a different citizen'), 'negative clause present');
}

// No seat is advisory (builder 2026-10-25: Rhea stays and blocks; she is tuned per seat, not softened)
{
  const g = require('./cron-rhea-gate');
  assert.equal(g.settleModelFlags, undefined, 'no advisory path in the gate');
  assert.deepEqual(Object.keys(packages).filter(k => packages[k].rheaAdvisory !== undefined), [], 'no package carries rheaAdvisory');
}

console.log('cronRheaPersonaGate.test.js: PASS');
