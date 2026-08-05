/**
 * articleIntake.test.js — coverage for the INTAKE block parser
 * (pipeline.45 Phase 1 Task 2; spec grammar from
 * docs/plans/2026-08-04-newsroom-canon-flow.md §Phase 1 spec detail).
 *
 * Run: node lib/articleIntake.test.js
 * Exits 0 on pass, 1 on failure.
 */

const intake = require('./articleIntake');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

function codes(result) {
  return result.errors.map(e => e.code);
}

const SPEC_BLOCK = [
  '# Business Ticker',
  '',
  'Article prose here. Lucia Polito said things.',
  '',
  '## INTAKE',
  'NAMES: Lucia Polito | POP-00654 | quoted-source',
  'NAMES: Calvin Turner | POP-00381 | subject',
  "BIZ: Rico's Auto | BIZ-0112 | mentioned",
  'STORYLINE: fruitvale-transit-hub | advanced',
  'HOOD: Fruitvale',
  'CLAIM: Transit Hub Phase II is a $230M visioning process | world_summary_c102 §initiatives'
].join('\n');

console.log('Test 1: spec example block parses clean');
{
  const r = intake.parse(SPEC_BLOCK);
  assert('found', r.found === true);
  assert('zero errors', r.errors.length === 0, JSON.stringify(r.errors));
  assert('2 names', r.names.length === 2);
  assert('name fields', r.names[0].name === 'Lucia Polito' && r.names[0].popid === 'POP-00654' && r.names[0].role === 'quoted-source');
  assert('1 biz with id', r.businesses.length === 1 && r.businesses[0].bizId === 'BIZ-0112' && r.businesses[0].role === 'mentioned');
  assert('1 storyline', r.storylines.length === 1 && r.storylines[0].slug === 'fruitvale-transit-hub' && r.storylines[0].verb === 'advanced');
  assert('1 hood', r.hoods.length === 1 && r.hoods[0].name === 'Fruitvale');
  assert('1 claim', r.claims.length === 1 && r.claims[0].sourceRef === 'world_summary_c102 §initiatives');
  assert('claim text intact', r.claims[0].claim === 'Transit Hub Phase II is a $230M visioning process');
}

console.log('Test 2: missing INTAKE block');
{
  const r = intake.parse('# Article\n\nJust prose, no block.');
  assert('not found', r.found === false);
  assert('missing-intake error', codes(r).includes('missing-intake'));
  const empty = intake.parse('');
  assert('empty input → missing-intake', empty.found === false && codes(empty).includes('missing-intake'));
}

console.log('Test 3: block boundaries');
{
  const afterHeading = intake.parse(SPEC_BLOCK + '\n## CODA\nNAMES: Ghost Person | POP-99999 | subject');
  assert('next ## heading ends block', afterHeading.names.length === 2 && afterHeading.errors.length === 0);
  const afterComment = intake.parse(SPEC_BLOCK + '\n<!-- SELF-SCORE: sim-grounding=4 -->\nNAMES: Ghost Person | POP-99999 | subject');
  assert('self-score comment ends block', afterComment.names.length === 2 && afterComment.errors.length === 0);
  const blanks = intake.parse('## INTAKE\n\nHOOD: Uptown\n\n');
  assert('blank lines inside block fine', blanks.hoods.length === 1 && blanks.errors.length === 0);
  const lower = intake.parse('## Intake\nHOOD: Uptown');
  assert('heading match is case-insensitive', lower.found === true && lower.hoods.length === 1);
}

console.log('Test 4: duplicate INTAKE heading flagged');
{
  const r = intake.parse('## INTAKE\nHOOD: Uptown\n## INTAKE\nHOOD: Downtown');
  assert('duplicate-intake error', codes(r).includes('duplicate-intake'));
}

console.log('Test 5: NAMES validation');
{
  const badRole = intake.parse('## INTAKE\nNAMES: A Person | POP-00001 | witness');
  assert('bad role enum', codes(badRole).includes('bad-role') && badRole.names.length === 0);
  const badPop = intake.parse('## INTAKE\nNAMES: A Person | POP-1 | subject');
  assert('malformed POPID', codes(badPop).includes('bad-popid'));
  const idNoRole = intake.parse('## INTAKE\nNAMES: A Person | POP-00001');
  assert('POPID in role slot rejected', codes(idNoRole).includes('bad-role'));
  const oneField = intake.parse('## INTAKE\nNAMES: A Person');
  assert('single field rejected', codes(oneField).includes('bad-field-count'));
  const noName = intake.parse('## INTAKE\nNAMES: | POP-00001 | subject');
  assert('empty name', codes(noName).includes('empty-field'));
  const modelForm = intake.parse('## INTAKE\nNAMES: Lucia Polito | quoted-source');
  assert('2-field model form → popid null',
    modelForm.errors.length === 0 && modelForm.names[0].popid === null && modelForm.names[0].role === 'quoted-source');
}

console.log('Test 6: BIZ validation');
{
  const dash = intake.parse('## INTAKE\nBIZ: Corner Store | - | mentioned');
  assert('`-` id parses to null', dash.errors.length === 0 && dash.businesses[0].bizId === null);
  const five = intake.parse('## INTAKE\nBIZ: Civis Systems | BIZ-00052 | subject');
  assert('5-digit BIZ id accepted', five.errors.length === 0 && five.businesses[0].bizId === 'BIZ-00052');
  const badId = intake.parse('## INTAKE\nBIZ: Corner Store | BIZ12 | mentioned');
  assert('malformed BIZ id', codes(badId).includes('bad-bizid'));
  const badRole = intake.parse('## INTAKE\nBIZ: Corner Store | BIZ-0001 | sponsor');
  assert('bad BIZ role enum', codes(badRole).includes('bad-role'));
  const modelForm = intake.parse('## INTAKE\nBIZ: Corner Store | mentioned');
  assert('2-field model form → bizId null',
    modelForm.errors.length === 0 && modelForm.businesses[0].bizId === null && modelForm.businesses[0].role === 'mentioned');
}

console.log('Test 7: STORYLINE validation');
{
  const badVerb = intake.parse('## INTAKE\nSTORYLINE: some-arc | escalated');
  assert('bad verb enum', codes(badVerb).includes('bad-verb'));
  const all = ['advanced', 'opened', 'closed', 'referenced'].every(v =>
    intake.parse(`## INTAKE\nSTORYLINE: some-arc | ${v}`).errors.length === 0);
  assert('all four verbs accepted', all);
  const oneField = intake.parse('## INTAKE\nSTORYLINE: some-arc');
  assert('missing verb field', codes(oneField).includes('bad-field-count'));
}

console.log('Test 8: HOOD validation');
{
  const piped = intake.parse('## INTAKE\nHOOD: Fruitvale | Uptown');
  assert('pipes rejected', codes(piped).includes('bad-field-count'));
  const empty = intake.parse('## INTAKE\nHOOD:');
  assert('empty hood', codes(empty).includes('empty-field'));
}

console.log('Test 9: CLAIM validation');
{
  const noRef = intake.parse('## INTAKE\nCLAIM: The hub costs $230M');
  assert('missing source ref', codes(noRef).includes('bad-field-count'));
  const piped = intake.parse('## INTAKE\nCLAIM: Ridership rose 4% | not 6% as claimed | engine_audit_c102 §transit');
  assert('pipes in claim text — last segment is ref',
    piped.errors.length === 0 &&
    piped.claims[0].claim === 'Ridership rose 4% | not 6% as claimed' &&
    piped.claims[0].sourceRef === 'engine_audit_c102 §transit');
}

console.log('Test 10: unknown lines flagged, parse continues');
{
  const r = intake.parse('## INTAKE\nHOOD: Uptown\nFOO: bar | baz\nHOOD: Downtown');
  assert('unknown-line error', codes(r).includes('unknown-line'));
  assert('valid lines still collected', r.hoods.length === 2);
  assert('error carries line number', r.errors[0].lineNumber === 3);
}

console.log('Test 11: exported enums');
{
  assert('NAME_ROLES', JSON.stringify(intake.NAME_ROLES) === JSON.stringify(['quoted-source', 'subject', 'mentioned']));
  assert('STORYLINE_VERBS', JSON.stringify(intake.STORYLINE_VERBS) === JSON.stringify(['advanced', 'opened', 'closed', 'referenced']));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
