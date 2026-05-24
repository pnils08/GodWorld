/**
 * assertAtLeastThreeFemaleCitizensInNonOfficialRoles.test.js
 *
 * S231 pipeline.28 G-W48 coverage. Pre-S231 the detector returned 0 for
 * every edition because buildLedgerLookup read row.CitizenName / row.Name
 * — the Simulation_Ledger has First + Last, neither field exists. Plus
 * the detector only scanned article body, missing citizens referenced
 * only via NAMES INDEX. Post-S231 it scans both surfaces with FP guards
 * for reporters, NEW citizens, and cross-citizen name collisions.
 *
 * Run: node scripts/capability-reviewer/assertAtLeastThreeFemaleCitizensInNonOfficialRoles.test.js
 */

'use strict';

const helper = require('./assertAtLeastThreeFemaleCitizensInNonOfficialRoles');

let passed = 0;
let failed = 0;

function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

// Minimal fixture: 3 female non-official citizens via different surfaces.
const ledger = [
  { POPID: 'POP-00001', First: 'Beverly', Last: 'Hayes', Gender: 'female' },
  { POPID: 'POP-00002', First: 'Eloise', Last: 'Soria-Dominguez', Gender: 'female' },
  { POPID: 'POP-00003', First: 'Maria', Last: 'Reyes', Gender: 'female' },
  { POPID: 'POP-00004', First: 'Avery', Last: 'Santana', Gender: 'female' }, // OFFICIAL (Mayor)
  { POPID: 'POP-00005', First: 'Carmen', Last: 'Delaine', Gender: 'female' }, // REPORTER
  { POPID: 'POP-00006', First: 'Miguel', Last: 'Santos', Gender: 'female' }, // NAME-COLLISION with NEW citizen
];

const editionFixture = {
  sections: [
    {
      title: 'FRONT PAGE',
      isFooter: false,
      articles: [
        {
          headline: 'Test',
          byline: 'By Carmen Delaine',
          body: 'Mayor Avery Santana announced the new program. Maria Reyes spoke at the meeting. Beverly Hayes received a check.',
        },
      ],
      body: '',
    },
    {
      title: 'NAMES INDEX',
      isFooter: true,
      articles: [],
      body: [
        'POP-00001 | Beverly Hayes | Community Director, West Oakland Center',
        'POP-00002 | Eloise Soria-Dominguez | Transit Hub Planning Lead, City of Oakland',
        'POP-00004 | Avery Santana | Mayor of Oakland',
        'Miguel Santos — restaurant owner, Fruitvale (NEW)',
      ].join('\n'),
    },
  ],
};

const ctx = { edition: editionFixture, sheets: { Simulation_Ledger: ledger } };
const result = helper.check(ctx);

console.log('Test 1: structural detection (G-W48 core)');
assert('detector returns object', result && typeof result === 'object');
assert('detector id correct', result.id === 'at-least-three-female-citizens-non-official');
assert('detectorVersion bumped to 1.1.0', result.detectorVersion === '1.1.0');

console.log('\nTest 2: female citizens found (post-fix: First+Last lookup works)');
// Mayor counted but as official; Carmen Delaine = reporter, excluded; Miguel Santos = NEW, excluded.
// Beverly (official by "Director" regex), Eloise (non-official), Maria (non-official).
assert('totalFemaleCitizensFound > 0 (pre-fix was always 0)', result.evidence.totalFemaleCitizensFound > 0);

console.log('\nTest 3: demotion when citizen appears in non-official body context');
// Beverly's NAMES INDEX role line ("Community Director") matches OFFICIAL_TITLES,
// but her article-body appearance ("Beverly Hayes received a check") has no
// official context within 80 chars. recordCitizen demotes — any non-official
// appearance wins. Reflects editorial reality: a citizen IS appearing in
// non-official capacity somewhere in the edition.
const beverly = result.evidence.nonOfficialSample.find(n => n === 'Beverly Hayes');
const soria = result.evidence.nonOfficialSample.find(n => n === 'Eloise Soria-Dominguez');
assert('Beverly Hayes classified non-official (body-text demotes index official tag)', !!beverly);
assert('Eloise Soria-Dominguez classified non-official (Planning Lead)', !!soria);

console.log('\nTest 4: reporter exclusion (Carmen Delaine byline)');
assert('Carmen Delaine NOT counted (reporter byline)',
  !result.evidence.nonOfficialSample.includes('Carmen Delaine'));

console.log('\nTest 5: NEW citizen exclusion (Miguel Santos collision)');
assert('Miguel Santos NOT counted (NEW tag in NAMES INDEX)',
  !result.evidence.nonOfficialSample.includes('Miguel Santos'));

console.log('\nTest 6: official Mayor excluded from non-official');
assert('Avery Santana NOT in non-official sample (Mayor title)',
  !result.evidence.nonOfficialSample.includes('Avery Santana'));

console.log('\nTest 7: sourceBreakdown evidence present');
assert('sourceBreakdown is object', typeof result.evidence.sourceBreakdown === 'object');
assert('names-index source present (G-W48 new scan path)',
  result.evidence.sourceBreakdown['names-index'] !== undefined);

console.log('\nTest 8: empty edition fixture returns 0 cleanly');
const emptyResult = helper.check({
  edition: { sections: [] },
  sheets: { Simulation_Ledger: [] },
});
assert('empty edition → totalFemaleCitizensFound = 0', emptyResult.evidence.totalFemaleCitizensFound === 0);
assert('empty edition → pass=false', emptyResult.pass === false);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
