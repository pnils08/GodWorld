// Regression test for S265 ES-2 (C98 G-W parser fix).
//
// The C98 edition threw "ARTICLE TABLE claims 2 article(s) for section CULTURE
// but parser found 1 byline-bearing article" because a body-prose line opening
// "By …" was captured as a chunk byline by the loose `^By\s+` assignment, then
// rejected by the tight Contract-B bind counter — the two disagreed. The fix
// routes BOTH through a shared looksLikeByline() predicate that rejects prose
// "By" openers. This test reproduces the failure class: a CULTURE article whose
// fragment carries a prose "By next cycle, …" line BEFORE its real byline.
// Pre-fix: the prose line wins the assignment → counter rejects → throw.
// Post-fix: the prose line is skipped → the real byline is assigned → 2 of 2.

var fs = require('fs');
var os = require('os');
var path = require('path');
var { parseEdition } = require('../lib/editionParser');

var DIV = '------------------------------------------------------------';
var HDR = '============================================================';

var fixture = [
  HDR,
  'THE CYCLE PULSE — EDITION 999',
  'Bay Tribune | Cycle 999 | Y9C99 | Fall',
  'Weather: Test | City Mood: Test',
  HDR,
  '',
  'ARTICLE TABLE',
  '',
  '| Slot | Section | Reporter | Headline |',
  '| --- | --- | --- | --- |',
  '| FP1 | FRONT PAGE | Carmen Delaine | Front Page Test Headline |',
  '| N1 | CULTURE | Maria Keen | First Culture Headline |',
  '| N2 | CULTURE | Mason Ortega | Second Culture Headline |',
  '',
  DIV,
  'FRONT PAGE',
  DIV,
  '',
  '### Front Page Test Headline',
  '',
  'By Carmen Delaine | Bay Tribune Civic Affairs',
  '',
  '---',
  '',
  'A front-page body paragraph that exists only to give the section an article.',
  '',
  DIV,
  'CULTURE',
  DIV,
  '',
  '### First Culture Headline',
  '',
  'By Maria Keen | Bay Tribune Culture',
  '',
  '---',
  '',
  'Maria walks the corridor on a Tuesday morning. The first culture article body.',
  '',
  'By next cycle, the corridor settles back into its ordinary rhythm again.',
  '',
  '### Second Culture Headline',
  // Prose "By" line placed BEFORE the real byline inside the headline fragment —
  // this is the captured-prose-byline failure class from C98.
  'By next cycle, the neighborhood will look different than it does today.',
  '',
  'By Mason Ortega | Bay Tribune Culture',
  '',
  '---',
  '',
  'The second culture article body, on a waterfront career closing out.',
  '',
].join('\n');

var tmp = path.join(os.tmpdir(), 'editionParser_byline_fixture.txt');
fs.writeFileSync(tmp, fixture, 'utf-8');

var pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; console.log('  PASS  ' + label); } else { fail++; console.log('  FAIL  ' + label); } }

console.log('=== S265 ES-2 byline-prose regression (C98 G-W) ===');

var parsed;
var threw = false;
try {
  parsed = parseEdition(tmp);
} catch (e) {
  threw = true;
  console.log('  FAIL  parseEdition threw: ' + e.message);
  fail++;
}

if (!threw) {
  ok(true, 'parseEdition does not throw on captured-prose-byline input');
  var culture = parsed.sections.filter(function (s) { return /CULTURE/i.test(s.name); })[0];
  ok(!!culture, 'CULTURE section parsed');
  if (culture) {
    var bylined = culture.articles.filter(function (a) { return a.byline && /^By\s/.test(a.byline); });
    ok(bylined.length === 2, 'CULTURE has 2 byline-bearing articles (got ' + bylined.length + ')');
    var bylines = culture.articles.map(function (a) { return a.byline; });
    ok(bylines.indexOf('By Mason Ortega | Bay Tribune Culture') >= 0,
       'second article carries the REAL byline, not the prose "By next cycle" line');
    ok(!bylines.some(function (b) { return b && /^By next cycle/.test(b); }),
       'no article has a prose "By next cycle" byline');
  }
}

console.log((fail === 0 ? 'ALL ' + pass + ' ASSERTIONS PASS' : fail + ' FAILURES / ' + pass + ' pass'));
process.exit(fail === 0 ? 0 : 1);
