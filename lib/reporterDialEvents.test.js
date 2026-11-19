/**
 * reporterDialEvents.test.js — where a reporter's own work lands (engine.347 Task 3).
 * Run: node lib/reporterDialEvents.test.js   (exits 0 pass / 1 fail). No API, no sheet.
 */
const fs = require('fs');
const path = require('path');
const rd = require('./reporterDialEvents');
const dm = require('../utilities/citizenDialMap');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log('Test 1: the two tags land on drive, small and middle, through the fold\'s own composer');
{
  const snippet = 'filed: Hospital Board Promotes Community Award Winner';   // words the text router acts on
  assert('filed = drive +1, nothing else', same(dm.nudgesForReflection_(rd.FILED_TAG, rd.NO_MOOD, 1, snippet), { drive: 1 }));
  assert('printed = drive +2, nothing else', same(dm.nudgesForReflection_(rd.PRINTED_TAG, rd.NO_MOOD, 1, rd.PRINTED_SENTENCE), { drive: 2 }));
  assert('printed is the bigger event', dm.nudgesForReflection_(rd.PRINTED_TAG, rd.NO_MOOD, 1, '').drive > dm.nudgesForReflection_(rd.FILED_TAG, rd.NO_MOOD, 1, '').drive);
  assert('neither tag moves sociability', !('sociability' in dm.nudgesForReflection_(rd.FILED_TAG, rd.NO_MOOD, 1, '')) && !('sociability' in dm.nudgesForReflection_(rd.PRINTED_TAG, rd.NO_MOOD, 1, '')));
  assert('the no-mood word is a dial-map key that moves nothing', dm.DIAL_MAP.hasOwnProperty(rd.NO_MOOD) && Object.keys(dm.DIAL_MAP[rd.NO_MOOD]).length === 0);
}

console.log('\nTest 2: recordKind');
{
  assert('filed line', rd.recordKind('filed: Council Sets December Vote') === 'filed');
  assert('graded line', rd.recordKind('graded: 3/3 — nothing fell short') === 'graded');
  assert('an interview answer is neither', rd.recordKind(null) === null && rd.recordKind('I filed: nothing') === null);
  assert('case and position matter (the desk run writes these exactly)', rd.recordKind('Filed: x') === null && rd.recordKind(' graded: 2/3') === null);
  // pipeline.112: the desk run names the kind and sends the line without a label
  assert('a named kind stands, no label in the line', rd.recordKind('Council Sets December Vote', 'filed') === 'filed' && rd.recordKind('3/3 — nothing fell short', 'graded') === 'graded');
  assert('an unknown name is not a kind; no text is no record', rd.recordKind('a line', 'office') === null && rd.recordKind(null, 'filed') === null);
}

console.log('\nTest 2b: the week digest leaves a reporter\'s filing row out by its own cells (pipeline.112)');
{
  const { isFilingRow } = require('../scripts/buildCitizenWeekDigest');
  assert('a filed row with no label in its text', isFilingRow({ kind: 'PRESS', event: rd.FILED_TAG, full: 'Council Sets December Vote' }) === true);
  assert('a row written before, label in the text', isFilingRow({ kind: 'PRESS', event: 'Media', full: 'filed: Council Sets December Vote' }) === true && isFilingRow({ kind: 'PRESS', event: '', full: 'graded: 3/3 — nothing fell short' }) === true);
  assert('a citizen\'s interview answer stays in', isFilingRow({ kind: 'PRESS', event: 'Career', full: 'I told the reporter what I saw.' }) === false);
  assert('the filed tag on another daypart is not a filing row', isFilingRow({ kind: 'MORNING', event: rd.FILED_TAG, full: 'a thought' }) === false);
}

console.log('\nTest 3: headlineOf');
{
  assert('first non-empty line, marks off', rd.headlineOf('\n\n# **The Fund Has Moved**\n\nBody') === 'The Fund Has Moved');
  assert('capped at 100', rd.headlineOf('x'.repeat(300)).length === 100);
  assert('empty text -> empty', rd.headlineOf('') === '');
}

console.log('\nTest 4: printedReporterRows — one row per reporter per Cycle Pulse');
{
  const now = '2026-11-21T18:00:00.000Z';
  const printed = [
    { popid: 'POP-00011', headline: 'The Fund Has Moved $7 Million' },
    { popid: 'pop-00011', headline: 'A Second Piece' },
    { popid: 'POP-00153', headline: 'Night Shift at the Yard' },
    { popid: '', headline: 'No POPID' },
    { popid: 'POP-00200', headline: '' },
  ];
  const header = ['Timestamp', 'POPID', 'Cycle', 'Daypart', 'Tag', 'ReflectionExcerpt', 'Applied', 'Affect'];
  const r = rd.printedReporterRows(printed, 116, [header], now);
  assert('three reporters, three rows', r.rows.length === 3 && r.skipped.length === 0);
  const a = r.rows.find((x) => x[1] === 'POP-00011');
  assert('row shape A–K', a.length === 11 && a[0] === now && a[2] === 116 && a[3] === 'PRINT' && a[4] === rd.PRINTED_TAG && a[6] === 'no' && a[7] === 'Flat' && a[8] === '' && a[9] === '' && a[10] === '');
  assert('two printed pieces = one row naming the first and counting the rest',
    a[5] === 'My article was selected to run in the Cycle Pulse: The Fund Has Moved $7 Million (and 1 more).', a[5]);
  assert('no headline still writes the sentence', r.rows.find((x) => x[1] === 'POP-00200')[5] === 'My article was selected to run in the Cycle Pulse.');
  assert('a byline with no POPID writes nothing', r.rows.every((x) => x[1]));
  const q = rd.printedReporterRows([{ popid: 'POP-00799', headline: 'Who Owns the Rent Pressure?' }], 116, [], now).rows[0][5];
  assert('a headline that ends itself gets no second full stop', q === 'My article was selected to run in the Cycle Pulse: Who Owns the Rent Pressure?', q);

  // rerun: this Cycle's PRINT row is already on the tab
  const again = rd.printedReporterRows(printed, 116, [header].concat(r.rows), now);
  assert('rerun writes nothing', again.rows.length === 0 && again.skipped.length === 3);
  // last Cycle's PRINT row does not block this Cycle's; another daypart does not either
  const old = [[now, 'POP-00011', 115, 'PRINT', rd.PRINTED_TAG, 'x', 'yes', 'Flat'], [now, 'POP-00011', 116, 'PRESS', 'Media', 'x', 'no', 'Calm']];
  assert('an earlier Cycle or another daypart does not block', rd.printedReporterRows(printed, 116, old, now).rows.length === 3);
  assert('cycle compared as text ("116" on the sheet)', rd.printedReporterRows(printed, 116, [[now, 'POP-00011', '116', 'PRINT']], now).rows.length === 2);
  assert('nothing printed -> nothing', rd.printedReporterRows([], 116, [], now).rows.length === 0);
}

console.log('\nTest 5: the writers use this file (source assertions)');
{
  const cv = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'citizenVoice.js'), 'utf8');
  assert('citizenVoice lands a filed line by the fixed tag', /reporterDial\.FILED_TAG/.test(cv) && /reporterDial\.recordKind\(/.test(cv));
  assert('citizenVoice writes no intake row for a grade', /selfKind === 'graded'/.test(cv));
  const sat = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'cron-saturday-run.js'), 'utf8');
  assert('the Saturday step writes the printed rows', /printedReporterRows\(/.test(sat) && /Reflection_Intake/.test(sat));
}

console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
