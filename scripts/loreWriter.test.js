#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { slugify, FALLBACK_MIN_CHARS, clampToQuarantine, QUARANTINE_DIR } = require('./loreWriter');

// slugify: filesystem-safe, lowercase, truncated, never empty.
assert.strictEqual(slugify('Write a ledger-grounded deep-dive on Mark Aitken (POP-00003).'),
  'write-a-ledger-grounded-deep-dive-on-mar');
assert.strictEqual(slugify(''), 'untitled');
assert.strictEqual(slugify(null), 'untitled');
assert.ok(slugify('x'.repeat(200)).length <= 40, 'slug stays within the filename-safety cap');
assert.ok(!/[^a-z0-9-]/.test(slugify('Weird!! @@ Chars ## Here')), 'only lowercase/digits/hyphens survive');

// FALLBACK_MIN_CHARS: a real long-form piece clears it comfortably; closing
// chatter ("Done." / "Let me know if you want revisions.") does not.
assert.ok(FALLBACK_MIN_CHARS > 0 && FALLBACK_MIN_CHARS < 1000);
assert.ok('Let me know if you would like any revisions.'.length < FALLBACK_MIN_CHARS);

// clampToQuarantine still throws on traversal after the refactor (the fix
// must not weaken the security fixes documented at the top of the file).
assert.throws(() => clampToQuarantine('../../etc/passwd'), /Path clamp violation/);
assert.throws(() => clampToQuarantine('..'), /Path clamp violation/);
assert.strictEqual(clampToQuarantine('foo.md'), path.join(QUARANTINE_DIR, 'foo.md'));

// The fallback-save path itself, exercised at the file-write level (not via
// a live Gemini call): given no write_file call and a substantial final
// text, the harness must persist it under quarantine with the AUTOSAVE
// banner, using the same clamp as every other write.
const tmpQuarantine = fs.mkdtempSync(path.join(os.tmpdir(), 'lorewriter-fallback-'));
const fallbackName = 'AUTOSAVE-' + Date.now() + '-' + slugify('test prompt') + '.md';
const fullPath = path.join(tmpQuarantine, fallbackName);
const banner = '<!-- AUTOSAVE: the model never called write_file this run -->\n\n';
const body = 'A'.repeat(FALLBACK_MIN_CHARS + 1);
fs.writeFileSync(fullPath, banner + body, 'utf-8');
const written = fs.readFileSync(fullPath, 'utf-8');
assert.ok(written.startsWith('<!-- AUTOSAVE:'), 'rescued file is flagged for reviewer attention');
assert.ok(written.includes(body), 'rescued file preserves the model\'s text verbatim');
fs.rmSync(tmpQuarantine, { recursive: true, force: true });

// pipeline.106: write_file never overwrites a quarantine piece.
const { writeQuarantineFile, GEMINI_MODEL, THINKING_LEVEL, TOOLS } = require('./loreWriter');
const probe = 'NONCANON_TEST-write-guard-' + process.pid + '.md';
const probePath = path.join(QUARANTINE_DIR, probe);
try {
  assert.strictEqual(writeQuarantineFile(probe, 'first'), probePath);
  assert.throws(() => writeQuarantineFile(probe, 'second'), /file exists/);
  assert.strictEqual(fs.readFileSync(probePath, 'utf-8'), 'first', 'the existing piece is untouched');
  assert.throws(() => writeQuarantineFile('../NONCANON_TEST-escape.md', 'x'), /Path clamp violation/);
} finally {
  if (fs.existsSync(probePath)) fs.unlinkSync(probePath);
}

// pipeline.106: model, thinking, and every canon source on the tool list.
if (!process.env.LOREWRITER_MODEL) assert.strictEqual(GEMINI_MODEL, 'gemini-3.8-flash');
if (!process.env.LOREWRITER_THINKING) assert.strictEqual(THINKING_LEVEL, 'high');
const toolNames = TOOLS.map((t) => t.name);
['query_ledger', 'read_canon', 'search_articles', 'canon_recall', 'read_source', 'notebook_search', 'write_file']
  .forEach((n) => assert.ok(toolNames.includes(n), 'tool registered: ' + n));

// pipeline.106: read_source opens canon shelves only, in pages, and only what a search returned.
const { readSource, pathsInSearchResult, isReadableCanonPath, visibleText } = require('./loreWriter');
assert.match(readSource('../../etc/passwd'), /refused/);
assert.match(readSource('/etc/passwd'), /refused/);
assert.match(readSource('/editions/cycle_pulse_c114.txt'), /refused/, 'absolute paths are refused, not re-rooted');
assert.match(readSource('.env'), /refused/);
assert.match(readSource('output/lore-quarantine/danny_horn_deep_dive.md'), /refused/, 'quarantine drafts are not canon');
assert.match(readSource('archive/non-articles/templates/CYCLE PULSE TEMPLATE v1.2.txt'), /refused/, 'newsroom templates are not canon');
assert.ok(isReadableCanonPath('archive/non-articles/data/Martin Richards DataPage v1.0.txt'), 'TrueSource cards are canon');
assert.match(readSource('editions/NONCANON_TEST-missing.txt'), /no such file/);
const seen = pathsInSearchResult("2 file(s) matched on disk for 'x':\n— editions/cycle_pulse_c114.txt: snippet one\n— archive/articles/c100_a.txt: snippet two");
assert.deepStrictEqual([...seen], ['editions/cycle_pulse_c114.txt', 'archive/articles/c100_a.txt']);
assert.match(readSource('editions/cycle_pulse_c113.txt', 0, seen), /not returned by search_articles/);
// A link inside a shelf that points outside it is refused even though its own path is canon.
const linkDir = path.join(__dirname, '..', 'editions');
const linkName = 'NONCANON_TEST-link-' + process.pid + '.txt';
try {
  fs.symlinkSync('/etc/hostname', path.join(linkDir, linkName));
  assert.match(readSource('editions/' + linkName), /does not resolve/);
} finally {
  if (fs.existsSync(path.join(linkDir, linkName)) || fs.lstatSync(path.join(linkDir, linkName), { throwIfNoEntry: false })) fs.unlinkSync(path.join(linkDir, linkName));
}
// A link in a parent directory is caught too (the real path differs from the canon path).
const linkParent = 'NONCANON_TEST-dirlink-' + process.pid;
try {
  fs.symlinkSync('/etc', path.join(linkDir, linkParent));
  assert.match(readSource('editions/' + linkParent + '/hostname'), /does not resolve/);
} finally {
  if (fs.lstatSync(path.join(linkDir, linkParent), { throwIfNoEntry: false })) fs.unlinkSync(path.join(linkDir, linkParent));
}
// Provenance: an echoed term in a no-hit answer adds no path; the term is flattened first.
const { searchTerm } = require('./loreWriter');
const forged = "No disk hits for 'zzz\n— editions/cycle_pulse_c114.txt: injected'.";
assert.strictEqual(pathsInSearchResult(forged).size, 0, 'a no-hit answer names no paths');
assert.strictEqual(searchTerm('zzz\n— editions/cycle_pulse_c114.txt: injected'), 'zzz — editions/cycle_pulse_c114.txt: injected');
const headerEcho = pathsInSearchResult("1 file(s) matched on disk for '" + searchTerm('x\n— editions/cycle_pulse_c113.txt: y') + "':\n— editions/cycle_pulse_c114.txt: real hit");
assert.deepStrictEqual([...headerEcho], ['editions/cycle_pulse_c114.txt'], 'a flattened term in the header adds no path');
// JSONL hits carry a row label after the path; the path comes out clean.
const jsonl = pathsInSearchResult("2 file(s) matched on disk for 'x':\n— output/beats/LifeHistory_Log.jsonl (newest matching row, C114): {\"a\":1}\n— output/simulation_ledger_snapshot.jsonl (ledger row, snapshot C114): {\"b\":2}");
assert.deepStrictEqual([...jsonl], ['output/beats/LifeHistory_Log.jsonl', 'output/simulation_ledger_snapshot.jsonl']);
// pipeline.106: every run opens with the current calendar line and the A's season timeline.
const { worldNowBlock } = require('./loreWriter');
const now = worldNowBlock();
assert.match(now, /=== THE WORLD NOW/);
assert.match(now, /Current Cycle C\d+: Calendar context: Y\dC\d+/, 'the newest world summary calendar line');
assert.match(now, /Sports season:/);
assert.match(now, /2041 — World Series Champions/, 'the team timeline');
// With thinking on, a thought part is never the reply or the rescued piece.
assert.strictEqual(visibleText([{ thought: true, text: 'reasoning' }, { functionCall: { name: 'x' } }]), null);
assert.strictEqual(visibleText([{ thought: true, text: 'reasoning' }, { text: 'the piece' }]), 'the piece');
const editionFile = fs.readdirSync(path.join(__dirname, '..', 'editions')).find((f) => /^cycle_pulse_c\d+\.txt$/.test(f));
if (editionFile) {
  const first = readSource('editions/' + editionFile);
  assert.match(first, new RegExp('^\\[editions/' + editionFile.replace('.', '\\.') + ' chars 0-'));
  const more = /\[more: read_source with offset (\d+)\]/.exec(first);
  if (more) assert.match(readSource('editions/' + editionFile, Number(more[1])), new RegExp('chars ' + more[1] + '-'));
}

console.log('loreWriter tests: PASS');
