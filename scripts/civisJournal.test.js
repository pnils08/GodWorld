'use strict';
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const journal = require('./civisJournal');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'test-only-civis-journal-'));
const output = path.join(root, 'output');
const beats = path.join(output, 'beats');
fs.mkdirSync(beats, { recursive: true });
const agentDir = path.join(root, '.claude', 'agents', 'citizen-voice-elias-varek');
fs.mkdirSync(agentDir, { recursive: true });
for (const name of ['IDENTITY.md', 'LENS.md', 'RULES.md']) {
  fs.writeFileSync(path.join(agentDir, name), 'TEST-ONLY ' + name + ' voice context\n');
}
fs.writeFileSync(path.join(beats, 'meta.json'), JSON.stringify({ cycle: 999, prevCycle: 998 }));
fs.writeFileSync(path.join(output, 'engine_audit_c999.json'), JSON.stringify({
  cycle: 999, previousCycle: 998, patterns: [
    { type: 'math-imbalance', affectedEntities: { neighborhoods: ['Test District'] }, evidence: { fields: { Neighborhood: 'Test District' } } },
    { type: 'coverage-gap', affectedEntities: {}, evidence: { fields: { domain: 'faith' } } },
    { type: 'writeback-drift', affectedEntities: {}, evidence: { fields: {} } },
  ]
}));
fs.writeFileSync(path.join(beats, 'Neighborhood_Demographics.jsonl'),
  JSON.stringify({ Neighborhood: 'Test District' }) + '\n');
for (const tab of ['Civic_Office_Ledger', 'Initiative_Tracker', 'Business_Ledger']) {
  fs.writeFileSync(path.join(beats, tab + '.jsonl'), '');
}

const frame = journal.loadFrame(999, root);
assert.equal(frame.findings.length, 3);
assert.ok(frame.names.has('Test District'));
const prompt = journal.promptFor(frame, [], root);
for (const name of ['IDENTITY.md', 'LENS.md', 'RULES.md']) {
  assert.ok(prompt.system.includes('TEST-ONLY ' + name + ' voice context'));
}
const paragraph = 'I read Test District as a signal Civis Systems must understand more carefully. ' +
  'I want the instrument to account for what the city experiences before I claim it has explained the change. ';
const prose = Array(15).fill(paragraph).join(' ').trim();
const ids = frame.findings.map(f => f.id);
assert.equal(journal.assertEntry(prose, frame, ids).ok, true);
assert.match(journal.assertEntry(prose + ' HousingPressure', frame, ids).failures.join(';'), /dial name/);
assert.match(journal.assertEntry(prose + ' POP-90001', frame, ids).failures.join(';'), /digits/);
assert.match(journal.assertEntry(prose + ' in Fake District', frame, ids).failures.join(';'), /unknown named target/);
assert.throws(() => journal.loadFrame(998, root), /ENOENT/);

const answer = JSON.stringify({ prose, findingIds: ids });
let calls = 0;
const page = { appendReflection_: async (_pop, _body, options) => {
  calls++;
  assert.equal(options.daypart, 'journal');
  return { customId: 'cp-POP-00789-c999-journal' };
} };
const originalLog = console.log;
console.log = () => {};
(async () => {
  try {
    const dry = await journal.run(999, { root, dry: true, prior: [],
      reasoner: async () => answer, page });
    assert.equal(dry.assertion.ok, true);
    assert.equal(calls, 0);
    assert.equal(fs.existsSync(path.join(output, 'civis-journal')), false);
    const fallback = await journal.run(999, { root, dry: true, prior: [],
      reasoner: async () => { throw new Error('TEST-ONLY route unavailable'); },
      sonnet: async () => answer, page });
    assert.equal(fallback.assertion.ok, true);
    assert.equal(calls, 0);
    const first = await journal.run(999, { root, prior: [],
      reasoner: async () => answer, page });
    assert.ok(first.path.endsWith('civis_journal_c999.md'));
    assert.equal(calls, 1);
    const second = await journal.run(999, { root, prior: [],
      reasoner: async () => { throw new Error('model must not be called'); }, page });
    assert.equal(second.skipped, 'already-recorded');
    assert.equal(calls, 1);
    const saved = JSON.parse(fs.readFileSync(path.join(output, 'civis-journal', 'civis_journal_c999.json')));
    assert.deepEqual(saved.findings.map(f => f.auditPatternId), ids);
  } finally {
    console.log = originalLog;
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log('civisJournal.test.js: PASS');
})().catch(e => { console.log = originalLog; console.error(e); process.exitCode = 1; });
