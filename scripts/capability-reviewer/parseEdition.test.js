/**
 * parseEdition.test.js — S231 pipeline.28 G-W46 footer-section parser coverage.
 *
 * Pairs with scripts/capability-reviewer/parseEdition.js. Tests focus on the
 * footer-section recognition added S231: NAMES INDEX, BUSINESSES NAMED,
 * ARTICLE TABLE, CITIZEN USAGE LOG, STORYLINES UPDATED, COMING NEXT EDITION.
 * Pre-S231, these section headers were not in SECTION_HEADERS, so their
 * content got absorbed into the body of the last editorial section (usually
 * LETTERS), which structurally broke
 * assertEditionNumbersNotInArticleText (footer routinely cites E91/E92
 * for canon-tracking — assertion flagged this as a BLOCKING-tier rule
 * violation in article body — workaround was to drop numerics from footer).
 *
 * Run: node scripts/capability-reviewer/parseEdition.test.js
 * Exits 0 on pass, 1 on failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const helper = require('./parseEdition');

let passed = 0;
let failed = 0;

function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

function assertEqual(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}: expected ${e}, got ${a}`); failed++; }
}

function writeTempFile(name, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parseedition-test-'));
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p;
}

// Minimal edition shape — header block + editorial section + footer section
// + END EDITION trailer. Matches the actual cycle_pulse_edition_NN.txt format.
function fixture() {
  return [
    '============================================================',
    'CYCLE PULSE — Cycle 99',
    'September 2041 | Weather: Cool 67°F | City Mood: optimistic',
    '============================================================',
    '',
    '------------------------------------------------------------',
    'FRONT PAGE',
    '------------------------------------------------------------',
    '',
    '# Test Headline',
    '',
    'Front page body text mentioning POP-00001 Test Citizen.',
    '',
    'By Test Reporter',
    '',
    '------------------------------------------------------------',
    'LETTERS',
    '------------------------------------------------------------',
    '',
    'Dear Editor,',
    '',
    'A test letter body.',
    '',
    '— Test Writer, Test Neighborhood',
    '',
    '------------------------------------------------------------',
    '============================================================',
    '',
    'NAMES INDEX',
    '------------------------------------------------------------',
    '',
    'POP-00001 | Test Citizen | Tester, Oakland',
    '',
    '------------------------------------------------------------',
    'CITIZEN USAGE LOG',
    '------------------------------------------------------------',
    '',
    'Test Citizen — returning E97/E98/E99 voice.',
    '',
    '------------------------------------------------------------',
    'END EDITION',
    '------------------------------------------------------------',
  ].join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Test 1: module exports
// ────────────────────────────────────────────────────────────────────────────
console.log('Test 1: module exports');
{
  assert('parse is function', typeof helper.parse === 'function');
  assert('getFrontPageArticle is function', typeof helper.getFrontPageArticle === 'function');
  assert('extractPopIds is function', typeof helper.extractPopIds === 'function');
  assert('extractInitiativeIds is function', typeof helper.extractInitiativeIds === 'function');
  assert('extractNameCandidates is function', typeof helper.extractNameCandidates === 'function');
}

// ────────────────────────────────────────────────────────────────────────────
// Test 2: parses editorial + footer sections (G-W46 core)
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 2: footer sections parsed correctly (G-W46 core)');
{
  const p = writeTempFile('edition_99.txt', fixture());
  const parsed = helper.parse(p);
  const titles = parsed.sections.map(s => s.title);
  assertEqual('section order',
    titles,
    ['FRONT PAGE', 'LETTERS', 'NAMES INDEX', 'CITIZEN USAGE LOG']);

  const namesIdx = parsed.sections.find(s => s.title === 'NAMES INDEX');
  assert('NAMES INDEX section.isFooter true', namesIdx?.isFooter === true);
  assert('NAMES INDEX section.body contains POP-00001', namesIdx?.body.includes('POP-00001'));
  assertEqual('NAMES INDEX section.articles is empty (footers carry no articles)',
    namesIdx?.articles, []);

  const citizenLog = parsed.sections.find(s => s.title === 'CITIZEN USAGE LOG');
  assert('CITIZEN USAGE LOG section.isFooter true', citizenLog?.isFooter === true);
  assert('CITIZEN USAGE LOG carries E99 citation', citizenLog?.body.includes('E99'));
  assertEqual('CITIZEN USAGE LOG articles empty', citizenLog?.articles, []);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 3: editorial sections NOT marked isFooter (defensive)
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 3: editorial sections not flagged isFooter');
{
  const p = writeTempFile('edition_99b.txt', fixture());
  const parsed = helper.parse(p);
  const fp = parsed.sections.find(s => s.title === 'FRONT PAGE');
  const letters = parsed.sections.find(s => s.title === 'LETTERS');
  assert('FRONT PAGE not isFooter', fp?.isFooter !== true);
  assert('LETTERS not isFooter', letters?.isFooter !== true);
  assert('FRONT PAGE has at least 1 article', (fp?.articles.length || 0) >= 1);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 4: LETTERS no longer absorbs footer content (G-W46 evidence)
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 4: LETTERS body does not absorb NAMES INDEX content');
{
  const p = writeTempFile('edition_99c.txt', fixture());
  const parsed = helper.parse(p);
  const letters = parsed.sections.find(s => s.title === 'LETTERS');
  assert('LETTERS body does NOT contain POP-00001 (footer-only)', !letters?.body.includes('POP-00001'));
  assert('LETTERS body does NOT contain E99 citation (footer-only)', !letters?.body.includes('E99'));
}

// ────────────────────────────────────────────────────────────────────────────
// Test 5: live C94 edition — full footer-section list expected
// ────────────────────────────────────────────────────────────────────────────
const c94Path = path.join(__dirname, '..', '..', 'editions', 'cycle_pulse_edition_94.txt');
console.log('\nTest 5: live C94 edition section structure');
if (!fs.existsSync(c94Path)) {
  console.log('  SKIP — C94 edition not on disk');
} else {
  const parsed = helper.parse(c94Path);
  const titles = parsed.sections.map(s => s.title);
  for (const expected of [
    'FRONT PAGE', "EDITOR'S DESK", 'CIVIC', 'CULTURE', 'SPORTS', 'LETTERS',
    'NAMES INDEX', 'BUSINESSES NAMED', 'ARTICLE TABLE',
    'CITIZEN USAGE LOG', 'STORYLINES UPDATED', 'COMING NEXT EDITION'
  ]) {
    assert(`C94 has ${expected} section`, titles.includes(expected));
  }

  const letters = parsed.sections.find(s => s.title === 'LETTERS');
  // Pre-S231: LETTERS body was 10,658 chars (absorbed footer).
  // Post-S231: LETTERS body should be ~2000 chars (letters only, footer split off).
  assert('LETTERS body < 5000 chars (footer no longer absorbed)',
    (letters?.body.length || 0) < 5000,
    `actual length ${letters?.body.length}`);

  const namesIdx = parsed.sections.find(s => s.title === 'NAMES INDEX');
  assert('C94 NAMES INDEX section.isFooter true', namesIdx?.isFooter === true);
  assert('C94 NAMES INDEX body contains POP-prefix entries',
    /POP-\d{5}/.test(namesIdx?.body || ''));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
