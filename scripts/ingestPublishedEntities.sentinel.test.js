// Regression test for S265 ES-3 (C98 G-P-C98-1).
//
// A BUSINESSES NAMED section carrying only "(no new businesses this cycle)"
// counted as 1 non-separator content line with 0 parsed entities, so
// assertParserSanity threw → exit(1) aborted the entire Step 5 intake every
// no-new-business cycle (C98 lost 28 already-parsed citizens to this). The fix
// treats the absence-sentinel family as a legitimate zero-entity section.

var mod = require('./ingestPublishedEntities');
var { assertParserSanity, isAbsenceSentinel } = mod;

var pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; console.log('  PASS  ' + label); } else { fail++; console.log('  FAIL  ' + label); } }

console.log('=== S265 ES-3 absence-sentinel regression (C98 G-P-C98-1) ===');

// isAbsenceSentinel: recognizes the placeholder family, rejects real rows.
var sentinels = [
  '(no new businesses this cycle)',
  '(none this cycle)',
  'No new citizens named',
  '- (no new businesses this cycle)',
  '(No businesses named this cycle)',
];
var realRows = [
  'Ernesto Quintero (POP-00050) — A\'s designated hitter',
  'Nordstrom — retail anchor, Downtown',           // leads with "No" but not a word-boundary "no"
  'Noah\'s Bagels (BIZ-00042) — Rockridge',
  'Nina Chen — City Council, District 8',
];
sentinels.forEach(function (s) { ok(isAbsenceSentinel(s), 'sentinel recognized: ' + s); });
realRows.forEach(function (r) { ok(!isAbsenceSentinel(r), 'real row NOT a sentinel: ' + r); });

// assertParserSanity: a section that is ONLY the sentinel must NOT throw.
// findSection() returns lines AFTER the header with leading separators stripped,
// so a sentinel-only BUSINESSES NAMED block reaches the guard as just the
// sentinel line.
var threw = false;
try {
  assertParserSanity({
    sectionName: 'BUSINESSES NAMED',
    sectionLines: ['(no new businesses this cycle)'],
    parsedCount: 0,
  });
} catch (e) { threw = true; }
ok(!threw, 'assertParserSanity does NOT throw on a sentinel-only section');

// Guardrail: a real content line with 0 parsed STILL throws (the genuine bug it guards).
var stillThrows = false;
try {
  assertParserSanity({
    sectionName: 'BUSINESSES NAMED',
    sectionLines: ['Quintero Coffee | Rockridge | cafe'],
    parsedCount: 0,
  });
} catch (e) { stillThrows = true; }
ok(stillThrows, 'assertParserSanity STILL throws on a real unparsed content line (guard intact)');

console.log((fail === 0 ? 'ALL ' + pass + ' ASSERTIONS PASS' : fail + ' FAILURES / ' + pass + ' pass'));
process.exit(fail === 0 ? 0 : 1);
