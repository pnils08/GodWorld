/**
 * lib.coverageAnchorRetirements.test.js
 *
 * Coverage for the S235 G-PR8e coverage-anchor-retirement registry at
 * `lib/coverageAnchorRetirements.js`, plus the integration hooks in
 * `scripts/buildCitizenCards.js` (Coverage convention block in card) and
 * `scripts/rateEditionCoverage.js` (rating downweight on retired-anchor +
 * avoid-framing co-occurrence within editorial-lede scope).
 *
 * Groups:
 *  1. Registry helpers — isRetiredAnchor / getRetirementConvention
 *  2. detectRetiredAnchorHits — substring + proximity + lede-scope semantics
 *  3. renderConventionBlock — convention block lines for cards
 *  4. Empirical C94 — rateEditionCoverage fires downweight on exactly one
 *     article (the legitimate C2 Beverly piece); parser-drag false positives
 *     from Soria piece + Anthony Raines piece are filtered by lede-scope.
 *
 * Run: node scripts/lib.coverageAnchorRetirements.test.js
 */

var fs = require('fs');
var path = require('path');
var execSync = require('child_process').execSync;
var registry = require('../lib/coverageAnchorRetirements');

var passed = 0;
var failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log('  PASS  ' + label); passed++; }
  else { console.error('  FAIL  ' + label + (detail ? ' — ' + detail : '')); failed++; }
}

// ---------------------------------------------------------------------------
// Group 1 — registry helpers
// ---------------------------------------------------------------------------

console.log('\n=== Group 1 — registry helpers ===');

assert('isRetiredAnchor("POP-00772") true (Beverly Hayes seed)', registry.isRetiredAnchor('POP-00772') === true);
assert('isRetiredAnchor("POP-00001") false (non-retired)', registry.isRetiredAnchor('POP-00001') === false);
assert('isRetiredAnchor("") false (empty)', registry.isRetiredAnchor('') === false);
assert('isRetiredAnchor(null) false (null)', registry.isRetiredAnchor(null) === false);
assert('isRetiredAnchor(undefined) false (undefined)', registry.isRetiredAnchor(undefined) === false);

var bev = registry.getRetirementConvention('POP-00772');
assert('getRetirementConvention("POP-00772") returns object', bev !== null && typeof bev === 'object');
assert('Beverly convention — fullName Beverly Hayes', bev.fullName === 'Beverly Hayes');
assert('Beverly convention — retiredAt S229', bev.retiredAt === 'S229');
assert('Beverly convention — effectiveFromCycle 95', bev.effectiveFromCycle === 95);
assert('Beverly convention — has composeAround[]', Array.isArray(bev.composeAround) && bev.composeAround.length > 0);
assert('Beverly convention — has avoidFramings[]', Array.isArray(bev.avoidFramings) && bev.avoidFramings.length > 0);
assert('Beverly convention — avoidFramings includes "tenant-watch"', bev.avoidFramings.indexOf('tenant-watch') !== -1);
assert('Beverly convention — avoidFramings includes "stoop"', bev.avoidFramings.indexOf('stoop') !== -1);

assert('getRetirementConvention("nonexistent") null', registry.getRetirementConvention('POP-99999') === null);
assert('getRetirementConvention(null) null', registry.getRetirementConvention(null) === null);

// ---------------------------------------------------------------------------
// Group 2 — detectRetiredAnchorHits
// ---------------------------------------------------------------------------

console.log('\n=== Group 2 — detectRetiredAnchorHits semantics ===');

// Name absent → no hits
{
  var hits = registry.detectRetiredAnchorHits('Some neutral civic article about a council vote.');
  assert('Name absent → empty hits', hits.length === 0);
}

// Name present, no avoid-framing → no hits
{
  var hits = registry.detectRetiredAnchorHits('Beverly Hayes attended the ribbon-cutting at the new building opening. The contractor said the schedule was on track.');
  assert('Name + only acceptable framings → no hit', hits.length === 0);
}

// Name + avoid-framing co-occur in lede → hit
{
  var hits = registry.detectRetiredAnchorHits('Beverly Hayes was sitting on her front stoop on Telegraph Avenue.');
  assert('Name + avoid-framing (stoop) in lede → 1 hit', hits.length === 1);
  if (hits.length === 1) {
    assert('Hit names Beverly Hayes', hits[0].fullName === 'Beverly Hayes');
    assert('Hit reports stoop as matched framing', hits[0].matchedFramings.indexOf('stoop') !== -1);
  }
}

// Name + framing far apart (>1500 char threshold) → no hit (lede-scope filter)
{
  var lede = 'A long civic piece about a council vote and the procedural rhythm of city planning. '
    + 'Carmen Solis had asked the question. Soria Dominguez compiled the deliverable. '
    + 'The math was already done by the time Vega called the item. The vote was 8-0. '
    + Array(20).fill('More civic prose about Mam-language scope addition and Tran D2 conditional. ').join('');
  // lede is ~1600+ chars without anchor name. Append Beverly mention + framing at the tail.
  var text = lede + ' ' + 'Beverly Hayes lives on Telegraph Avenue, sitting on her front stoop.';
  // Anchor name is now past the EDITORIAL_LEDE_SCOPE_CHARS threshold (1500).
  var hits = registry.detectRetiredAnchorHits(text);
  assert('Name + framing in tail (past lede scope) → no hit', hits.length === 0);
}

// Name in lede but framing only in tail → no hit (proximity within lede scope)
{
  var text = 'Beverly Hayes spoke at the building-opening ceremony in West Oakland. '
    + Array(10).fill('The new tenant move-ins began this week and ran without incident. ').join('') // ~600 chars filler
    + 'A separate event held later mentioned tenant-watch programs operating elsewhere in the corridor.';
  // Both within lede scope but the framing keyword may or may not be within 400 chars of the name.
  // Construct so framing IS more than 400 chars from name:
  var hits = registry.detectRetiredAnchorHits(text);
  // Name at position 0, "tenant-watch" at ~610 — outside the 400-char proximity window
  assert('Name + framing within lede but >400 chars apart → no hit', hits.length === 0);
}

// Multiple framings near name → deduped list
{
  var text = 'Beverly Hayes, sitting on her stoop on Telegraph, was a tenant-watch organizer. The block had been cleared and still nothing moved.';
  var hits = registry.detectRetiredAnchorHits(text);
  assert('Multiple framings near name → 1 hit', hits.length === 1);
  if (hits.length === 1) {
    assert('Multiple framings → matchedFramings has 3+ entries', hits[0].matchedFramings.length >= 3);
  }
}

// Case-insensitive
{
  var hits = registry.detectRetiredAnchorHits('BEVERLY HAYES SAT ON THE STOOP.');
  assert('Case-insensitive — uppercase text triggers hit', hits.length === 1);
}

// Empty / null safety
assert('Empty string → no hits', registry.detectRetiredAnchorHits('').length === 0);
assert('Null → no hits', registry.detectRetiredAnchorHits(null).length === 0);
assert('Non-string → no hits', registry.detectRetiredAnchorHits(42).length === 0);

// ---------------------------------------------------------------------------
// Group 3 — renderConventionBlock
// ---------------------------------------------------------------------------

console.log('\n=== Group 3 — renderConventionBlock for cards ===');

var block = registry.renderConventionBlock('POP-00772');
assert('Block — non-empty for retired anchor', block.length > 0);
assert('Block — first line is empty (separator)', block[0] === '');
assert('Block — header line starts with COVERAGE CONVENTION', block[1].indexOf('COVERAGE CONVENTION') === 0);
assert('Block — header references retiredAt session tag', block[1].indexOf('S229') !== -1);
assert('Block — references effective-from-cycle', block.some(function (l) { return l.indexOf('C95') !== -1; }));
assert('Block — has Compose-around line', block.some(function (l) { return l.indexOf('Compose around') !== -1; }));
assert('Block — has Avoid-framings line', block.some(function (l) { return l.indexOf('Avoid framings') !== -1; }));

assert('Block — empty array for non-retired popId', registry.renderConventionBlock('POP-00001').length === 0);
assert('Block — empty array for null', registry.renderConventionBlock(null).length === 0);

// ---------------------------------------------------------------------------
// Group 4 — empirical C94 integration (rateEditionCoverage)
// ---------------------------------------------------------------------------

console.log('\n=== Group 4 — empirical C94 rateEditionCoverage integration ===');

var c94Path = path.resolve(__dirname, '..', 'editions', 'cycle_pulse_edition_94.txt');
if (!fs.existsSync(c94Path)) {
  assert('C94 fixture present', false, 'editions/cycle_pulse_edition_94.txt missing');
} else {
  var output;
  try {
    output = execSync('node ' + path.join(__dirname, 'rateEditionCoverage.js') + ' ' + c94Path,
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    output = e.stdout ? e.stdout.toString() : '';
  }

  // Count downweight diagnostic lines
  var downweightMatches = output.match(/\[retired-anchor\]\s+downweight/g) || [];
  assert('C94 — exactly 1 retired-anchor downweight fires (the legitimate C2 piece)',
    downweightMatches.length === 1,
    'observed: ' + downweightMatches.length + ' (false positives from parser-drag eliminated by lede-scope)'
  );

  assert('C94 — downweight diagnostic names Beverly Hayes',
    /\[retired-anchor\]\s+downweight\s+\d+\s+→\s+\d+\s+—\s+Beverly Hayes/.test(output) === true
  );

  // Ensure the legitimate hit shows the right framing(s)
  var bevLine = output.match(/\[retired-anchor\][^\n]+Beverly Hayes[^\n]+/);
  if (bevLine) {
    assert('C94 — downweight diagnostic includes a recognized avoid-framing',
      /stoop|cleared and still|tenant-watch|community-director/.test(bevLine[0])
    );
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log('\n[engine.25 G-PR8e] ' + passed + ' / ' + (passed + failed) + ' assertions passed across 4 groups');
if (failed > 0) process.exit(1);
process.exit(0);
