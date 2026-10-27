#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  normalizeArtifactTag,
  buildOutputSlug,
  formatStrictSourceHygiene,
  renderPacketIntake,
  resolveMaxToolCalls,
  stripRepairChrome,
} = require('./cron-desk-writer');

assert.strictEqual(resolveMaxToolCalls(0), 0);
assert.strictEqual(resolveMaxToolCalls(6), 6);
assert.strictEqual(resolveMaxToolCalls(undefined), 6);
assert.strictEqual(resolveMaxToolCalls(-1), 6);

assert.strictEqual(normalizeArtifactTag(null), null);
assert.strictEqual(normalizeArtifactTag(''), null);
assert.strictEqual(normalizeArtifactTag('task7-baseline'), 'task7-baseline');
assert.throws(() => normalizeArtifactTag('Task7'), /artifact-tag/);
assert.throws(() => normalizeArtifactTag('../escape'), /artifact-tag/);
assert.throws(() => normalizeArtifactTag('a'.repeat(49)), /artifact-tag/);
assert.strictEqual(
  buildOutputSlug(null, 'dr-lila-mezran', 'deepseek-deepseek-chat'),
  'dr-lila-mezran_deepseek-deepseek-chat'
);
assert.strictEqual(
  buildOutputSlug('freelance-firebrand', null, 'deepseek-deepseek-chat'),
  'freelance-firebrand_deepseek-deepseek-chat'
);

const hygiene = formatStrictSourceHygiene({
  verified: ['NONCANON_TEST Citizen'],
  unverified: ['NONCANON_TEST Invented'],
});
assert.ok(hygiene.includes('STRICT SOURCE HYGIENE'));
assert.ok(hygiene.includes('NONCANON_TEST Citizen'));
assert.ok(hygiene.includes('NONCANON_TEST Invented'));
assert.ok(hygiene.includes('allotted hallucination') || hygiene.includes('INTAKE BIZ'));

const jaxHygiene = formatStrictSourceHygiene({ verified: [], unverified: [] }, {
  manifest: {
    policy: 'load-bearing',
    authorizedTexture: ['generic bar and anonymous bartender color'],
    textureConditions: ['not canon proof'],
  },
});
assert.ok(jaxHygiene.includes('persona profile still authorizes bounded narrative texture'));
assert.ok(jaxHygiene.includes('Anonymous role-only color is not an official source'));

assert.equal(
  stripRepairChrome('Here\'s the corrected article with all unapproved quotes removed:\n\n# Nightline\n\nThe door stayed open.\n'),
  '# Nightline\n\nThe door stayed open.\n'
);
assert.ok(jaxHygiene.includes('role-only anonymous voice may appear solely as authorized texture'));
assert.ok(jaxHygiene.includes('must not be attributed to a named citizen, official, institution, or canon source'));
assert.ok(!jaxHygiene.includes('overrides persona text that permits invented or anonymous sources'));

const normalized = renderPacketIntake(
  '# TEST-ONLY Article\n\nTest Citizen said, "Test concern." TEST-HOOD remains in the story.\n\n' +
  '## INTAKE\nBIZ: None |\nNAMES: Bad, Combined | role\n',
  {
    signal: { hood: 'TEST-HOOD', kind: 'test-signal', nearby: [] },
    exposure: {
      subjects: [{ name: 'Test Citizen' }],
      sources: [{ name: 'Test Citizen', quote: 'Test concern.' }],
    },
    known: [{ t: 'FACT', text: 'TEST-ONLY value | changed', src: 'output/TEST_ONLY.json rows[1]' }],
  }
);
assert.ok(normalized.includes('## INTAKE'));
assert.ok(normalized.includes('NAMES: Test Citizen | quoted-source'));
assert.ok(!normalized.includes('STORYLINE:'), 'engine.270: a quoted citizen mints no storyline');
assert.ok(normalized.includes('CLAIM: Test concern. | citizenVoice PRESS Test Citizen'));
assert.ok(!normalized.includes('BIZ: None'));
assert.equal(require('../lib/articleIntake').parse(normalized).errors.length, 0);

const withoutRuntimeClaim = renderPacketIntake('# TEST-ONLY Article\n\nTEST-ONLY sourced fact.\n', {
  signal: { hood: null, kind: 'test-signal', nearby: [] }, exposure: { subjects: [], sources: [] },
  known: [
    { t: 'FACT', text: 'Current cycle: C999', src: 'cron-desk-run explicit cycle argument' },
    { t: 'FACT', text: 'TEST-ONLY sourced fact', src: 'output/TEST_ONLY.json rows[2]' }
  ]
});
assert.ok(withoutRuntimeClaim.includes('CLAIM: TEST-ONLY sourced fact | output/TEST_ONLY.json rows[2]'));
assert.ok(!withoutRuntimeClaim.includes('CLAIM: Current cycle: C999'));

console.log('cron-desk-writer artifact-tag tests: PASS');

// engine.270 — the writer script mints no storyline. Who was quoted is not what
// happened: the storyline is resolved from the assignment's ref at sidecar build.
{
  const packet = {
    signal: { hood: 'TEST-HOOD', kind: 'test-signal', nearby: [] },
    exposure: {
      subjects: [{ name: 'Test Citizen', pop: 'TEST-POP-01' }],
      sources: [{ name: 'Test Citizen', pop: 'TEST-POP-01', quote: 'Test concern.' }],
    },
    known: [],
  };
  const quoted = renderPacketIntake('# T\n\nTest Citizen said, "Test concern."\n', packet);
  assert.ok(!quoted.includes('STORYLINE:'), 'a quoted citizen mints no storyline: ' + quoted);
  assert.ok(quoted.includes('NAMES: Test Citizen | quoted-source'), quoted);
  const stray = renderPacketIntake('# T\n\nTest Citizen said, "Test concern."\n\nTHREAD-CLOSED: anything-at-all\n', packet);
  assert.ok(!stray.includes('THREAD-CLOSED'), 'an old-habit model marker must not leak into the article');
  assert.ok(!stray.includes('STORYLINE:'), 'and it opens or closes nothing');
  assert.equal(require('../lib/articleIntake').parse(quoted).errors.length, 0);
}

// pipeline.76 — dossier_read returns the slice's own lines (same parser, same worked rates), sourced tool:dossier_read
{
  const fs = require('fs');
  const path = require('path');
  const mirrorPath = path.join(__dirname, '..', 'output', 'player_truesource_mirror.json');
  if (fs.existsSync(mirrorPath)) {
    const { toolDossierRead } = require('./cron-desk-writer');
    const M = require('./buildMarburySlice');
    const card = Object.values(JSON.parse(fs.readFileSync(mirrorPath, 'utf8'))).map(M.parseCard).find(Boolean);
    const all = toolDossierRead({ player: card.name });
    assert.ok(all.lines.length >= 1 + card.seasons.length);
    assert.ok(all.lines.every(l => l.src === 'tool:dossier_read:' + card.name));
    assert.ok(all.lines.some(l => l.text === card.name + ' ' + M.seasonLine(card, card.seasons[0])));
    const one = toolDossierRead({ player: card.name, season: card.seasons[0].year });
    assert.ok(one.lines.every(l => l.src === 'tool:dossier_read:' + card.name + ':' + card.seasons[0].year));
    assert.match(toolDossierRead({ player: 'TEST-ONLY Nobody' }).text, /No dossier/);
    // codex #4: a partial that matches several cards asks again, never picks the first
    const cardsAll = Object.values(JSON.parse(fs.readFileSync(mirrorPath, 'utf8'))).map(M.parseCard).filter(Boolean);
    const shared = ['Mar', 'Ra', 'a'].find(q => cardsAll.filter(c => c.name.toLowerCase().includes(q.toLowerCase())).length > 1);
    if (shared) { const amb = toolDossierRead({ player: shared }); assert.equal(amb.lines.length, 0); assert.match(amb.text, /matches \d+ dossiers/); }
    assert.ok(!all.text.includes('POP-'), 'no POPID in tool output');
  }
}
console.log('cron-desk-writer pipeline.76 dossier_read tests: PASS');

// pipeline.77 — the group sees its contract; its INTAKE carries no code-stamped SELF-SCORE
{
  const { rubricBlock, renderPacketIntake: rpi } = require('./cron-desk-writer');
  const block = rubricBlock({ reviewProfile: { purpose: 'TEST-ONLY purpose', articleContract: { opening: 'TEST-ONLY open', closing: 'TEST-ONLY close', targetWords: '400-700' } } });
  assert.ok(block.includes('Purpose: TEST-ONLY purpose') && block.includes('Open on: TEST-ONLY open') && block.includes('Length: 400-700'));
  assert.equal(rubricBlock({}), '');
  const pk = { known: [{ t: 'FACT', text: 'TEST-ONLY fact', src: 'TEST-ONLY src' }], exposure: { sources: [] } };
  assert.ok(rpi('# T\n\nBody.\n', pk).includes('SELF-SCORE'));
  assert.ok(!rpi('# T\n\nBody.\n', pk, { noSelfScore: true }).includes('SELF-SCORE'));
}
console.log('cron-desk-writer pipeline.77 rubric tests: PASS');

// pipeline.89 cut 2 — sheet_read match: a long tab no longer hides its later rows, and a miss says it was a miss
(async () => {
  const sheetsPath = require.resolve('../lib/sheets');
  const real = require.cache[sheetsPath];
  const header = ['InitiativeID', 'Name', 'MilestoneNotes'];
  const rows = [header];
  for (let i = 1; i <= 60; i++) rows.push(['TEST-ONLY-' + i, 'TEST-ONLY Fund ' + i, 'x'.repeat(300)]);
  rows.push(['TEST-ONLY-LAST', 'TEST-ONLY Needle Program', 'needle note']);
  require.cache[sheetsPath] = { id: sheetsPath, filename: sheetsPath, loaded: true, exports: { getRawSheetData: async () => rows } };
  try {
    const { toolSheetRead } = require('./cron-desk-writer');
    const plain = await toolSheetRead({ tab: 'Initiative_Tracker' });
    assert.ok(!plain.includes('Needle Program'), 'unfiltered read stays bounded');
    assert.match(plain, /first 40 of 62 rows — pass match/);
    const hit = await toolSheetRead({ tab: 'Initiative_Tracker', match: 'needle program' });
    assert.ok(hit.startsWith('InitiativeID | Name | MilestoneNotes'), 'match returns the header');
    assert.ok(hit.includes('TEST-ONLY Needle Program') && !hit.includes('TEST-ONLY Fund 1 '));
    assert.match(await toolSheetRead({ tab: 'Initiative_Tracker', match: 'no such term' }), /no row in Initiative_Tracker names "no such term" \(61 rows read\)/);
    assert.match(await toolSheetRead({ tab: 'Secret_Tab', match: 'x' }), /tab not allowed/);
  } finally {
    if (real) require.cache[sheetsPath] = real; else delete require.cache[sheetsPath];
  }
  console.log('cron-desk-writer pipeline.89 sheet_read match tests: PASS');
})().catch(e => { console.error(e); process.exit(1); });

// pipeline.89 cut 2 — every framed seat is a granted tool seat with a package grant, and the frames carry their rule
{
  const { SEAT_TOOL_FRAMES, seatToolsBlock, toolCitizenLookup } = require('./cron-desk-writer');
  const pk = require('./newsroom-wake-packages.json');
  for (const persona of Object.keys(SEAT_TOOL_FRAMES)) {
    assert.ok(pk[persona] && pk[persona].writerTools && pk[persona].writerTools.maxToolCalls >= 1, persona + ' has a frame but no package grant');
    const f = SEAT_TOOL_FRAMES[persona];
    assert.ok(f.title && f.intro && f.rule && f.kickoff && f.tools.length >= 2, persona + ' frame is incomplete');
    const block = seatToolsBlock(persona, 6);
    assert.ok(block.includes('up to 6 calls') && block.includes('=== END TOOLS ==='));
  }
  assert.ok(SEAT_TOOL_FRAMES['tamsin-pruitt'].tools.join(' ').includes('thread'));
  // thread on a name the ledger does not hold stays a "no such citizen" answer — it never invents a person
  assert.match(toolCitizenLookup({ name: 'TEST-ONLY Nobody Atall', thread: true }), /No ledger citizen named/);
  const { threadFor } = require('./canon-name-check');
  assert.deepStrictEqual(threadFor('TEST-ONLY Nobody Atall'), []);
}
console.log('cron-desk-writer pipeline.89 seat-frame tests: PASS');
