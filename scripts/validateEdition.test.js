/**
 * validateEdition.test.js — S231 pipeline.28 coverage for three fixes:
 *   G-W51: drop "ledger" from engine-language blocklist
 *   G-W52: derivePositionCode resolves canon-roster position strings
 *   G-W53: dedupe collision warnings by (lastName, foundFirst)
 *
 * Run: node scripts/validateEdition.test.js
 */

'use strict';

const helper = require('./validateEdition');

let passed = 0;
let failed = 0;

function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

function assertEqual(label, actual, expected) {
  if (actual === expected) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); failed++; }
}

// ────────────────────────────────────────────────────────────────────────────
// Test 1: module exports
// ────────────────────────────────────────────────────────────────────────────
console.log('Test 1: module exports for testing harness');
{
  assert('derivePositionCode is function', typeof helper.derivePositionCode === 'function');
  assert('POSITION_NAMES exported', typeof helper.POSITION_NAMES === 'object');
  assert('checkPlayerPositions exported', typeof helper.checkPlayerPositions === 'function');
}

// ────────────────────────────────────────────────────────────────────────────
// Test 2: derivePositionCode — G-W52 core
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 2: derivePositionCode (G-W52 core — canon roster strings)');
{
  const fn = helper.derivePositionCode;
  // AAA call-ups carry verbose strings — pre-fix the lookup returned undefined,
  // skipPositions was empty, every wrong-position regex fired against the AAA
  // player's actual position language.
  assertEqual('"Left Fielder, Las Vegas Aviators (AAA)" → LF', fn('Left Fielder, Las Vegas Aviators (AAA)'), 'LF');
  assertEqual('"Catcher, Las Vegas Aviators (AAA)" → C', fn('Catcher, Las Vegas Aviators (AAA)'), 'C');
  assertEqual('"First Baseman, Sacramento (AAA)" → 1B', fn('First Baseman, Sacramento (AAA)'), '1B');
  // Pitcher precedence: SP/RP/CL specific before generic P.
  assertEqual('"Starting Pitcher" → SP (not P)', fn('Starting Pitcher'), 'SP');
  assertEqual('"Relief Pitcher" → RP (not P)', fn('Relief Pitcher'), 'RP');
  assertEqual('"Closer" → CL', fn('Closer'), 'CL');
  assertEqual('"Closing Pitcher" → CL', fn('Closing Pitcher'), 'CL');
  assertEqual('"Pitcher" (bare) → P', fn('Pitcher'), 'P');
  // Other positions.
  assertEqual('"Designated Hitter" → DH', fn('Designated Hitter'), 'DH');
  assertEqual('"Shortstop" → SS', fn('Shortstop'), 'SS');
  assertEqual('"Manager" → Manager', fn('Manager'), 'Manager');
  // Short-form code fallback.
  assertEqual('"SS" (code only) → SS', fn('SS'), 'SS');
  assertEqual('"1B" (code only) → 1B', fn('1B'), '1B');
  assertEqual('"DH" (code only) → DH', fn('DH'), 'DH');
  // Defensive: null / unknown / empty
  assertEqual('null → null', fn(null), null);
  assertEqual('undefined → null', fn(undefined), null);
  assertEqual('"" → null', fn(''), null);
  assertEqual('"Bench Coach" → null (unknown role)', fn('Bench Coach'), null);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 3: checkPlayerPositions integration — Rosado canonical false-positive
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 3: checkPlayerPositions integration (G-W52 end-to-end)');
{
  const canon = {
    asRoster: [
      { name: 'JR Rosado', position: 'Left Fielder, Las Vegas Aviators (AAA)' },
      { name: 'Mark Aitken', position: '1B' },
      { name: 'Travis Coles', position: 'SP' },
    ],
  };
  // Pre-S231: this exact prose triggered CRITICAL "Player Position" on
  // Rosado for being called "left fielder" (his actual position).
  const editionText = `
JR Rosado, the left fielder called up from the Las Vegas Aviators AAA affiliate, added a solo home run.
Mark Aitken at first base went 2-for-4.
Travis Coles took the mound for the start.
  `.trim();

  const issues = helper.checkPlayerPositions(editionText, canon);
  const rosadoIssues = issues.filter(i => /Rosado/.test(i.detail || ''));
  assertEqual('Rosado called "left fielder" — 0 issues (canon position matches)',
    rosadoIssues.length, 0);

  const aitkenIssues = issues.filter(i => /Aitken/.test(i.detail || ''));
  assertEqual('Aitken at "first base" — 0 issues (canon code 1B matches)',
    aitkenIssues.length, 0);

  const colesIssues = issues.filter(i => /Coles/.test(i.detail || ''));
  assertEqual('Coles "took the mound" / SP — 0 issues (canon SP equivalence)',
    colesIssues.length, 0);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 4: checkPlayerPositions WRONG-position attribution still flagged
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 4: real wrong-position attribution still flags (regression guard)');
{
  const canon = {
    asRoster: [
      { name: 'JR Rosado', position: 'Left Fielder, Las Vegas Aviators (AAA)' },
    ],
  };
  // WRONG: claim Rosado plays first base when his canon position is left field.
  const editionText = 'JR Rosado at first base went 2-for-4 in his debut.';
  const issues = helper.checkPlayerPositions(editionText, canon);
  assert('Rosado called "first base" — flagged (real wrong-position)',
    issues.length >= 1,
    `expected ≥1 issue, got ${issues.length}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 5: checkCitizenNames smoke — no regression on civic-official check
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 5: checkCitizenNames basic smoke');
{
  const ledger = [
    { POPID: 'POP-00001', First: 'Beverly', Last: 'Hayes', Tier: '2' },
  ];
  // Names Index references "Beverly Hayes" (correct).
  const editionText = 'Names Index: Beverly Hayes (POP-00001)';
  const issues = helper.checkCitizenNames(editionText, ledger);
  assertEqual('correct name in Names Index — 0 citizen issues', issues.length, 0);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 6: G-W64 — checkCouncilNames false-positive suppression
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 6: G-W64 — council name-check context awareness');
{
  const canon = {
    council: [
      { member: 'Leonard Tran', district: 'D2', faction: 'IND' },
      { member: 'Ramon Vega', district: 'D1', faction: 'IND' },
      { member: 'Nina Chen', district: 'D8', faction: 'CRC' },
    ],
  };

  // (a) Preposition headline fragment "As Vega" must NOT flag as a Ramon typo.
  const headlineText = 'As Vega Flips Yes On Renewal, the council moved. Ramon Vega cast the deciding vote.';
  const hIssues = helper.checkCouncilNames(headlineText, canon, new Set(['ramon vega', 'leonard tran', 'nina chen']));
  const asVega = hIssues.filter(i => /\bAs Vega\b/.test(i.detail || ''));
  assertEqual('"As Vega" preposition fragment — 0 council issues', asVega.length, 0);

  // (b) Distinct canonical citizen sharing a surname must NOT flag.
  const known = new Set(['leonard tran', 'ramon vega', 'nina chen', 'vanessa tran-muñoz', 'bobby chen-ramirez']);
  const distinctText = 'OARI Director Vanessa Tran-Muñoz testified. Leonard Tran (D2) questioned the budget. Bobby Chen-Ramirez gave the health update; Nina Chen (D8) responded.';
  const dIssues = helper.checkCouncilNames(distinctText, canon, known);
  const tranFP = dIssues.filter(i => /Vanessa Tran/.test(i.detail || ''));
  const chenFP = dIssues.filter(i => /Bobby Chen/.test(i.detail || ''));
  assertEqual('"Vanessa Tran-Muñoz" distinct citizen — 0 false typo flags', tranFP.length, 0);
  assertEqual('"Bobby Chen-Ramirez" distinct citizen — 0 false typo flags', chenFP.length, 0);

  // (c) A REAL typo (wrong first name, not a known canonical person) STILL flags.
  const typoText = 'Wayne Tran (D2) voted no, though Leonard Tran is the councilmember.';
  const tIssues = helper.checkCouncilNames(typoText, canon, known);
  const realTypo = tIssues.filter(i => /Wayne Tran/.test(i.detail || ''));
  assert('real typo "Wayne Tran" still flagged (regression guard)', realTypo.length >= 1,
    `expected ≥1, got ${realTypo.length}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 7: G-W64 — helper units
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 7: G-W64 — extractFullNameAt + SKIP_FIRST_WORDS units');
{
  assertEqual('extractFullNameAt grabs hyphenated surname',
    helper.extractFullNameAt('Vanessa Tran-Muñoz testified', 0), 'Vanessa Tran-Muñoz');
  assertEqual('extractFullNameAt grabs simple two-token name',
    helper.extractFullNameAt('Leonard Tran spoke', 0), 'Leonard Tran');
  assert('SKIP_FIRST_WORDS has prepositions (As/Of/On/In)',
    helper.SKIP_FIRST_WORDS.has('As') && helper.SKIP_FIRST_WORDS.has('Of') &&
    helper.SKIP_FIRST_WORDS.has('On') && helper.SKIP_FIRST_WORDS.has('In'));
  assert('SKIP_FIRST_WORDS retains original titles (Mayor/Deputy)',
    helper.SKIP_FIRST_WORDS.has('Mayor') && helper.SKIP_FIRST_WORDS.has('Deputy'));
  assert('isDistinctCanonicalName true for known full name',
    helper.isDistinctCanonicalName('Vanessa Tran-Muñoz testified', 0, new Set(['vanessa tran-muñoz'])) === true);
  assert('isDistinctCanonicalName false when set empty',
    helper.isDistinctCanonicalName('Vanessa Tran-Muñoz', 0, new Set()) === false);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
