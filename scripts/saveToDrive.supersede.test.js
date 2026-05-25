/**
 * saveToDrive.supersede.test.js
 *
 * Coverage for the S235 G-PR11 --supersede flag in scripts/saveToDrive.js.
 * Pre-fix /edition-print rerenders left stale broken PDFs in the Drive
 * destination folder alongside the corrected versions; anyone opening the
 * older one saw the broken render. --supersede moves prior same-stem
 * versions to an archive/ subfolder (default) or deletes them.
 *
 * Tests cover the pure stem-derivation helper. The Drive-touching paths
 * (findOrCreateArchiveSubfolder, findPriorVersions, supersedePriorVersions)
 * are not unit-tested here — they require live API access and live-fixture
 * smoke-testing on the next /edition-print run. The stem helper is where
 * the load-bearing wildcard-safety check lives: an incorrect stem could
 * sweep unrelated files into archive/. This test pins the canonical stem
 * shapes + null-on-unrecognized fail-safe.
 *
 * Run: node scripts/saveToDrive.supersede.test.js
 */

var saveToDrive = require('./saveToDrive');

var passed = 0;
var failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log('  PASS  ' + label); passed++; }
  else { console.error('  FAIL  ' + label + (detail ? ' — ' + detail : '')); failed++; }
}

var derive = saveToDrive.deriveStemForSupersede;

console.log('\n=== Group 1 — edition stem ===');
assert('bay_tribune_e94.pdf → bay_tribune_e94', derive('bay_tribune_e94.pdf') === 'bay_tribune_e94');
assert('bay_tribune_e8.pdf → bay_tribune_e8 (small cycle)', derive('bay_tribune_e8.pdf') === 'bay_tribune_e8');
assert('bay_tribune_e123.pdf → bay_tribune_e123 (3-digit cycle future-proof)', derive('bay_tribune_e123.pdf') === 'bay_tribune_e123');
assert('bay_tribune_e94.html → bay_tribune_e94 (HTML preview ext)', derive('bay_tribune_e94.html') === 'bay_tribune_e94');

console.log('\n=== Group 2 — non-edition stem (slug stripped) ===');
assert('bay_tribune_supplemental_c94_let_walks_reset.pdf → bay_tribune_supplemental_c94',
  derive('bay_tribune_supplemental_c94_let_walks_reset.pdf') === 'bay_tribune_supplemental_c94');
assert('bay_tribune_supplemental_c94_let_walks_initial.pdf → bay_tribune_supplemental_c94',
  derive('bay_tribune_supplemental_c94_let_walks_initial.pdf') === 'bay_tribune_supplemental_c94');
assert('bay_tribune_interview_c92_santana.pdf → bay_tribune_interview_c92',
  derive('bay_tribune_interview_c92_santana.pdf') === 'bay_tribune_interview_c92');
assert('bay_tribune_dispatch_c93_kono_second_song.pdf → bay_tribune_dispatch_c93',
  derive('bay_tribune_dispatch_c93_kono_second_song.pdf') === 'bay_tribune_dispatch_c93');
assert('bay_tribune_interview-transcript_94_let_walks.pdf — falls through (non-canonical name)',
  derive('bay_tribune_interview-transcript_94_let_walks.pdf') === null,
  'interview-transcript filenames lack the c<NUM> token; current scope skips them');

console.log('\n=== Group 3 — null fail-safe (defensive — better to skip than over-match) ===');
assert('Empty string → null', derive('') === null);
assert('Random PDF → null (no stem match)', derive('random_other_file.pdf') === null);
assert('bay_tribune.pdf → null (no cycle/edition marker)', derive('bay_tribune.pdf') === null);
assert('bay_tribune_e.pdf → null (no cycle number)', derive('bay_tribune_e.pdf') === null);
assert('mara_directive_c82.txt → null (different filename family)', derive('mara_directive_c82.txt') === null);
assert('photo_FP1_civis_field.png → null (DJ photo file shape)', derive('photo_FP1_civis_field.png') === null);

console.log('\n=== Group 4 — extension agnostic ===');
assert('bay_tribune_e94.pdf and bay_tribune_e94.html share stem',
  derive('bay_tribune_e94.pdf') === derive('bay_tribune_e94.html'));
assert('bay_tribune_supplemental_c94_X.pdf and bay_tribune_supplemental_c94_Y.pdf share stem',
  derive('bay_tribune_supplemental_c94_X.pdf') === derive('bay_tribune_supplemental_c94_Y.pdf'));

console.log('\n[engine.25 G-PR11] ' + passed + ' / ' + (passed + failed) + ' assertions passed across 4 groups');
if (failed > 0) process.exit(1);
process.exit(0);
