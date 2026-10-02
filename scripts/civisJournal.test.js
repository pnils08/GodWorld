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
  JSON.stringify({ Neighborhood: 'Test District', Students: '10', Adults: '20', Seniors: '5' }) + '\n');
const prev = path.join(beats, 'prev');
fs.mkdirSync(prev);
fs.writeFileSync(path.join(prev, 'meta.json'), JSON.stringify({ cycle: 998 }));
fs.writeFileSync(path.join(prev, 'Neighborhood_Demographics.jsonl'),
  JSON.stringify({ Neighborhood: 'Test District', Students: '9', Adults: '21', Seniors: '5' }) + '\n');
fs.writeFileSync(path.join(beats, 'Crime_Metrics.jsonl'),
  JSON.stringify({ Neighborhood: 'Test District', IncidentCount: '4' }) + '\n');
fs.writeFileSync(path.join(prev, 'Crime_Metrics.jsonl'),
  JSON.stringify({ Neighborhood: 'Test District', IncidentCount: '5' }) + '\n');
for (const tab of ['Civic_Office_Ledger', 'Initiative_Tracker', 'Business_Ledger']) {
  fs.writeFileSync(path.join(beats, tab + '.jsonl'), '');
}

const frame = journal.loadFrame(999, root);
assert.equal(frame.findings.length, 3);
assert.ok(frame.names.has('Test District'));
assert.deepEqual(frame.deltas, [
  'Test District: student presence rose, adult presence fell',
  'Test District: recorded incidents fell',
]);
const prompt = journal.promptFor(frame, [], root);
assert.match(prompt.user, /PREVIOUS-CYCLE BEAT MOVEMENT[\s\S]*student presence rose, adult presence fell/);
fs.writeFileSync(path.join(prev, 'meta.json'), JSON.stringify({ cycle: 997 }));
assert.throws(() => journal.loadFrame(999, root), /previous beat dump cycle mismatch/);
fs.writeFileSync(path.join(prev, 'meta.json'), JSON.stringify({ cycle: 998 }));
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
// The machine's words and graded readings fail; Civis's own vocabulary passes.
const base = Array(13).fill(paragraph).join(' ').trim();
const failsWith = (extra, re, f = frame) =>
  assert.match(journal.assertEntry(base + extra, f, ids).failures.join(';'), re, extra);
failsWith(' Nothing answered it this cycle.', /machine term/);
failsWith(' A dial moved and nobody looked.', /machine term/);
failsWith(' The simulation missed it.', /machine term/);
failsWith(' Forty percent of it went unread.', /machine term/);
failsWith(' It was a medium reading.', /score or severity/);
failsWith(' It is a high-severity signal.', /score or severity/);
failsWith(' The Oaks open soon. Paulson knows it.', /Oaks\/Paulson/);
assert.equal(journal.assertEntry(base + ' The ledger and the public record disagree, and the instrument owes the city a better reading.', frame, ids).ok, true);
failsWith(' The sentiment the city reads has not moved.', /machine term/);
// A sentence may open on any word and a signature may stand on its own lines;
// a name nobody handed over fails even as a single word.
assert.equal(journal.assertEntry(base + ' In Test District the reading held. Until Civis can say why, I will not call it steady.\n\nElias Varek\nCivis Systems Journal', frame, ids).ok, true);
failsWith(' I walked through Lakeview on the way in.', /unknown named target: Lakeview/);
failsWith(' Lake Merritt is quiet.', /unknown named target: Merritt/);
// A handed name keeps its own shape: mid-word capitals and a district numeral.
const named = { ...frame, names: new Set([...frame.names, 'DigitalOcean', 'City Council District 3']) };
assert.equal(journal.assertEntry(base + ' I raised it at DigitalOcean and with City Council District 3 this week.', named, ids).ok, true);
failsWith(' I raised it with District 4 this week.', /digits/, named);
// An initiative is named in a finding, never cited by its record id.
const byId = { type: 'stuck-initiative', affectedEntities: { initiatives: ['INIT-900'] }, evidence: { fields: {} } };
assert.equal(journal.translate(byId, new Map([['INIT-900', 'Test Initiative']])).target, 'Test Initiative');
assert.equal(journal.translate(byId).target, null);
assert.ok(![...frame.names].some(n => /^(?:INIT|BIZ)-/.test(n)), 'record ids are not handed to the writer');

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
    // Both routes down is a skipped week: nothing written, the page untouched.
    const down = async () => { throw new Error('TEST-ONLY route unavailable'); };
    const both = await journal.run(999, { root, prior: [], reasoner: down, sonnet: down, page });
    assert.equal(both.skipped, 'model-failure');
    assert.equal(calls, 0);
    assert.equal(fs.existsSync(path.join(output, 'civis-journal')), false);
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
