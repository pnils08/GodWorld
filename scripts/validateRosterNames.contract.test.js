/**
 * validateRosterNames.contract.test.js — contract test for the player-surname
 * near-miss detector (pipeline.19 G-W24). Pairs with `validateRosterNames.js`.
 *
 * S217 engine.16 Phase 5.2 — third of 4 audit/validate contract tests.
 *
 * Section A: source-level — DEFAULT_ROSTER path, rosterRowRe regex, levenshtein
 *   function presence, --json flag, --max-distance flag, exit codes (0/1/2).
 * Section B: subprocess — E93 against canon roster exits 0 with empty findings;
 *   a hand-crafted tmpfile with "Eric Tavares" (canon: "Eric Taveras") exits 1
 *   with a near-miss finding. Validates the levenshtein gate end-to-end.
 *
 * Run: node scripts/validateRosterNames.contract.test.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_PATH = path.resolve(__dirname, 'validateRosterNames.js');
const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(SCRIPT_PATH, 'utf8');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('═══ Section A — structural');

console.log('\nTest 1: source readable + non-trivial');
{
  assert('script exists', fs.existsSync(SCRIPT_PATH));
  assert('source > 3KB', source.length > 3000, `${source.length} bytes`);
}

console.log('\nTest 2: DEFAULT_ROSTER points at canon');
{
  assert('DEFAULT_ROSTER references 2041_athletics_roster.md',
    /DEFAULT_ROSTER.*2041_athletics_roster\.md/.test(source));
}

console.log('\nTest 3: rosterRowRe markdown-table pattern');
{
  assert('rosterRowRe declared', /var\s+rosterRowRe\s*=\s*\//.test(source));
  // The regex captures "First Last" from a markdown table row of shape
  // | N | First Last | ...
  const rosterRowRe = /^\|\s*\d+\s*\|\s*([A-Z][A-Za-z'.\-]+(?:\s+[A-Z][A-Za-z'.\-]+)+)\s*\|/gm;
  assert("matches '| 1 | Bobby Pratt |'",
    rosterRowRe.test('| 1 | Bobby Pratt | rest'));
  rosterRowRe.lastIndex = 0;
  assert("rejects '| header row |'",
    !rosterRowRe.test('| header row |'));
}

console.log('\nTest 4: levenshtein function present');
{
  assert('function levenshtein(a, b)',
    /function\s+levenshtein\s*\(\s*a\s*,\s*b\s*\)/.test(source));
}

console.log('\nTest 5: CLI flags parsed');
{
  assert('--json flag', /process\.argv\.includes\(['"]--json['"]\)/.test(source));
  assert('--roster arg parseable',
    /parseArg\(['"]roster['"]\)/.test(source));
  assert('--max-distance arg parseable',
    /parseArg\(['"]max-distance['"]\)/.test(source));
  assert('maxDistance defaults to 2',
    /parseInt\(parseArg\(['"]max-distance['"]\)\s*\|\|\s*['"]2['"]/.test(source));
}

console.log('\nTest 6: exit codes 0/1/2 documented + wired');
{
  assert("'0  No suspected typos' documented",
    /0\s+No suspected typos/i.test(source));
  assert("'1  Suspected typos found' documented",
    /1\s+Suspected typos found/i.test(source));
  assert("'2  Invalid input' documented",
    /2\s+Invalid input/i.test(source));
  // The script's exit-2 paths use process.exit(2); confirm those exist.
  assert('at least 3 process.exit(2) paths',
    (source.match(/process\.exit\(2\)/g) || []).length >= 3);
}

console.log('\n═══ Section B — subprocess smoke');

console.log('\nTest 7: E93 against canon roster exits 0 (no typos)');
{
  const result = spawnSync(
    'node',
    [SCRIPT_PATH, path.join(ROOT, 'editions/cycle_pulse_edition_93.txt'), '--json'],
    { cwd: ROOT, encoding: 'utf8', timeout: 30000 }
  );
  assert('E93 exits 0', result.status === 0, `status=${result.status}`);
  let parsed = null;
  try { parsed = JSON.parse(result.stdout); } catch { /* leave null */ }
  assert('--json output is valid JSON', parsed !== null);
  if (parsed) {
    assert('findings array empty for clean edition',
      Array.isArray(parsed.findings) && parsed.findings.length === 0,
      `findings=${JSON.stringify(parsed.findings)}`);
    assert('rosterPairs > 0 (canon roster parsed)',
      parsed.rosterPairs > 0, `got ${parsed.rosterPairs}`);
  }
}

console.log('\nTest 8: hand-crafted typo fixture triggers finding');
{
  const TMP = `/tmp/validateRosterNames_test_${process.pid}.txt`;
  // "Eric Tavares" is a near-miss of canon "Eric Taveras" (Latin -as/-es
  // surname-ending flip — the exact failure mode the script targets).
  // "Eric Tavares" is a near-miss of canon "Eric Taveras" (Latin -as/-es
  // surname-ending flip — the exact failure mode the script targets).
  // pairRe greedily consumes adjacent capitalized words as compound
  // surnames — keep the preceding word lowercase so "Eric Tavares" pairs
  // cleanly as foundFirst='Eric', foundLast='Tavares'. Position-appropriate
  // framing (Taveras is 2B, not a pitcher — keeps the fixture canon-true).
  fs.writeFileSync(TMP, 'In the seventh, Eric Tavares lined a double to right.\n');
  const result = spawnSync(
    'node',
    [SCRIPT_PATH, TMP, '--json'],
    { cwd: ROOT, encoding: 'utf8', timeout: 30000 }
  );
  fs.unlinkSync(TMP);
  assert('typo fixture exits 1', result.status === 1, `status=${result.status}`);
  let parsed = null;
  try { parsed = JSON.parse(result.stdout); } catch { /* leave null */ }
  assert('--json output is valid JSON', parsed !== null,
    `stdout: ${result.stdout.slice(0, 200)}`);
  if (parsed) {
    assert('findings array has at least 1 entry',
      Array.isArray(parsed.findings) && parsed.findings.length >= 1,
      `findings=${JSON.stringify(parsed.findings)}`);
    const tavares = (parsed.findings || []).find(f =>
      (f.found || '').toLowerCase().includes('tavares') ||
      (f.candidate || '').toLowerCase().includes('tavares')
    );
    assert('Tavares typo surfaced in findings', !!tavares,
      `findings=${JSON.stringify(parsed.findings)}`);
  }
}

console.log('\nTest 9: missing target file exits 2');
{
  const result = spawnSync(
    'node',
    [SCRIPT_PATH, '/tmp/nonexistent_file_for_test.txt'],
    { cwd: ROOT, encoding: 'utf8', timeout: 30000 }
  );
  assert('missing-file exits 2', result.status === 2, `status=${result.status}`);
}

console.log('\n' + '═'.repeat(60));
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
