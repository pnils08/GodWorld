/**
 * sentBack.test.js — a flagged piece back to its writer (pipeline.114).
 * Run: node lib/sentBack.test.js   (exits 0 pass / 1 fail). No API, no sheet.
 */
const sb = require('./sentBack');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const rheaFail = { pass: false, checkFlags: [], contamination: { fail: false, findings: [] },
  rhea: { pass: false, summary: 'Draft fails due to fabricated quote.', flags: [
    { claim: 'he put it this way: "The rankings are a nice feather"', issue: 'Fabricated speech attributed to a named citizen.', severity: 'high' },
    { claim: 'Fruitvale', issue: 'Wrong neighborhood for the source.', severity: 'medium' }],
    contractScore: { score: 1, max: 3, short: 'The opening lacks a venue.' } } };

console.log('Test 1: findingsOf — every finding, none cut');
{
  const f = sb.findingsOf(rheaFail);
  assert('both of Rhea\'s flags', f.length === 2 && f[0].issue === 'Fabricated speech attributed to a named citizen.' && f[0].on.startsWith('he put it'));
  const many = { pass: false, rhea: { flags: Array.from({ length: 12 }, (_, i) => ({ issue: 'finding ' + i })) } };
  assert('twelve flags: twelve findings', sb.findingsOf(many).length === 12);
  const walls = { pass: false, checkFlags: ['thin: 84 words under the 150 floor'], assignmentSwap: true,
    contamination: { fail: true, findings: [{ check: 'real-world', issue: 'Lake Merritt BART renamed' }] }, rhea: null };
  const w = sb.findingsOf(walls).map((x) => x.issue);
  assert('the checks, the contamination wall and a swapped INTAKE all go back', w.length === 3 && w[0].startsWith('thin:') && w[1] === 'real-world: Lake Merritt BART renamed' && /INTAKE/.test(w[2]));
  assert('a contamination list that did not fail is not a finding', sb.findingsOf({ contamination: { fail: false, findings: [{ check: 'x', issue: 'y' }] } }).length === 0);
}

console.log('\nTest 2: noteOf — his piece, what the desk found, the grade');
{
  const n = sb.noteOf('# The Headline\n\nBody.', rheaFail);
  assert('the piece as filed', n.draft === '# The Headline\n\nBody.');
  assert('the summary and the grade', n.summary === 'Draft fails due to fabricated quote.' && n.grade.score === 1 && n.grade.max === 3 && n.grade.short === 'The opening lacks a venue.');
  assert('a grade from before Rhea (blocked) rides too', sb.noteOf('x', { pass: false, rhea: null, blockedContractScore: { score: 2, max: 3, short: 's' } }).grade.score === 2);
  assert('no grade: none', sb.noteOf('x', { pass: false, rhea: { flags: [] } }).grade === null);
}

console.log('\nTest 3: goesBack — while each fix clears findings');
{
  assert('a pass never goes back', sb.goesBack({ pass: true, rhea: { flags: [{ issue: 'x' }] } }, null) === false);
  assert('the first fail goes back', sb.goesBack(rheaFail, null) === true);
  assert('a fix with fewer findings goes back again', sb.goesBack({ pass: false, rhea: { flags: [{ issue: 'x' }] } }, 2) === true);
  assert('a fix with as many findings ends it', sb.goesBack({ pass: false, rhea: { flags: [{ issue: 'x' }, { issue: 'y' }] } }, 2) === false);
  assert('a fix with more findings ends it', sb.goesBack({ pass: false, rhea: { flags: [{ issue: 'x' }, { issue: 'y' }, { issue: 'z' }] } }, 2) === false);
  assert('a fail with nothing named does not go back (no verdict)', sb.goesBack({ pass: false, rhea: null, checkFlags: [] }, null) === false);
  // the count only falls: from any start the return ends
  let before = null, n = 5, rounds = 0;
  while (sb.goesBack({ pass: false, rhea: { flags: Array.from({ length: n }, () => ({ issue: 'f' })) } }, before)) { before = n; n = Math.max(1, n - 1); rounds++; if (rounds > 50) break; }
  assert('it ends', rounds <= 5, 'rounds ' + rounds);
}

console.log('\nTest 4: writerBlock — what the writer reads');
{
  const b = sb.writerBlock(sb.noteOf('# The Headline\n\nBody.', rheaFail));
  assert('opens and closes', b.startsWith('=== THE DESK SENT YOUR PIECE BACK ===') && b.endsWith('=== END ==='));
  assert('each finding, with what it is on', b.includes('- [high] "he put it this way: "The rankings are a nice feather"" — Fabricated speech attributed to a named citizen.') && b.includes('- [medium] "Fruitvale" — Wrong neighborhood for the source.'));
  assert('the grade', b.includes("The desk's grade: 1/3 — The opening lacks a venue."));
  assert('his piece as filed, whole', b.includes('YOUR PIECE AS FILED:\n# The Headline\n\nBody.'));
  assert('told to fix that piece, not write another', /Fix what the desk named\. Keep your assignment, your voice and what was right; file the whole piece again/.test(b));
}

console.log('\nTest 5: the write step sends a flagged piece back before it routes it (cron-desk-run.js runWrite)');
{
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'scripts', 'cron-desk-run.js'), 'utf8');
  const w = src.slice(src.indexOf('async function runWrite('), src.indexOf('async function runWake('));
  const loop = w.indexOf('while (!NO_GATE && !REGATE && sentBack.goesBack(gate, findingsBefore))');
  const route = w.indexOf('// route (the wall');
  assert('the return runs after the first gate and before the route', loop > w.indexOf('let gate = gateDraft();') && loop < route && loop > 0);
  assert('the same writer is called again with the note', /writerArgs\.concat\(\['--sent-back', path\.relative\(ROOT, noteFile\)\]\)/.test(w));
  assert('the piece as filed is kept before the fix lands', w.indexOf('fs.copyFileSync(draftPath, kept);') > loop && w.indexOf('fs.copyFileSync(draftPath, kept);') < w.indexOf("'--sent-back'"));
  assert('each fix is gated again', w.indexOf('gate = gateDraft();', loop) > loop && w.indexOf('gate = gateDraft();', loop) < route);
  assert('the rounds ride the filing, the flags file, the run record and the scoreboard',
    /sentBack: rounds \}/.test(w) && /sentBack: rounds,/.test(w) && /\.\.\.\(rounds\.length \? \{ sentBack: rounds \} : \{\}\)/.test(w) && /sentBack: rounds\.map\(/.test(w));
  const writer = require('fs').readFileSync(require('path').join(__dirname, '..', 'scripts', 'cron-desk-writer.js'), 'utf8');
  assert('the writer reads the note after its assignment', /const SENT_BACK_FILE = arg\('--sent-back', null\);/.test(writer) && /worldState \+\n\s+\(SENT_BACK_FILE \? '\\n\\n' \+ require\('\.\.\/lib\/sentBack'\)\.writerBlock\(/.test(writer));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
