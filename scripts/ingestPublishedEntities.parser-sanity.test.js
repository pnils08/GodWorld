/**
 * ingestPublishedEntities.parser-sanity.test.js — S234 engine.26
 *
 * Surface under test:
 *
 *   ingestPublishedEntities.assertParserSanity({ sectionName, sectionLines,
 *   parsedCount }) — pure function. Throws when a parser-bearing section
 *   has non-separator content lines but the parser produced zero entities;
 *   passes silently when sectionLines is null/empty, all-separator, or
 *   parsedCount > 0.
 *
 * Source: S231 G-S5 silent-zero on BUSINESSES NAMED (matches S188 KONO
 * silent-zero shape + closed by engine.24 NAMES INDEX defensive-emit
 * pattern S229; engine.26 generalizes that pattern to a shared helper).
 *
 * No live sheet reads. Pure-function surface under direct unit test.
 */

'use strict';

var assert = require('assert');
var ingest = require('./ingestPublishedEntities.js');

function passing(name, fn) {
  try { fn(); console.log('  PASS  ' + name); return 1; }
  catch (e) { console.error('  FAIL  ' + name); console.error('        ' + (e.message || e)); return 0; }
}

var passed = 0;
var total = 0;

console.log('\n[engine.26] ingestPublishedEntities parser sanity guard\n');

// ---------------------------------------------------------------------------
console.log('Group 1 — silent passes (no violation)');

total++; passed += passing('null sectionLines passes silently', function () {
  ingest.assertParserSanity({
    sectionName: 'BUSINESSES NAMED',
    sectionLines: null,
    parsedCount: 0,
  });
});

total++; passed += passing('undefined sectionLines passes silently', function () {
  ingest.assertParserSanity({
    sectionName: 'BUSINESSES NAMED',
    sectionLines: undefined,
    parsedCount: 0,
  });
});

total++; passed += passing('empty sectionLines array passes silently', function () {
  ingest.assertParserSanity({
    sectionName: 'BUSINESSES NAMED',
    sectionLines: [],
    parsedCount: 0,
  });
});

total++; passed += passing('all-separator lines pass silently (header + dashes only)', function () {
  // Separator chars supported by the regex `/^[=\-─━_]+$/` — ascii hyphen,
  // ascii equals, U+2500 box-light horizontal, U+2501 box-heavy horizontal,
  // ascii underscore. Editions in this codebase use ascii hyphen + U+2500;
  // other unicode horizontals (U+2550 ═ double, etc.) are NOT used in
  // practice and intentionally not recognized as separators.
  ingest.assertParserSanity({
    sectionName: 'BUSINESSES NAMED',
    sectionLines: [
      '------------------------------------------------------------',
      '',
      '============================================================',
      '            ',
      '──────────',
    ],
    parsedCount: 0,
  });
});

total++; passed += passing('content lines + parsedCount > 0 passes silently', function () {
  ingest.assertParserSanity({
    sectionName: 'BUSINESSES NAMED',
    sectionLines: ['BIZ-00052 | Civis Systems | Urban-systems | West Oakland'],
    parsedCount: 1,
  });
});

total++; passed += passing('mixed separator + content + parsedCount > 0 passes silently', function () {
  ingest.assertParserSanity({
    sectionName: 'NAMES INDEX',
    sectionLines: [
      '------------------------------------------------------------',
      'POP-00773 | Beverly Hayes | Home Health Aide',
      '------------------------------------------------------------',
    ],
    parsedCount: 1,
  });
});

// ---------------------------------------------------------------------------
console.log('\nGroup 2 — throw cases (parsedCount == 0 with content)');

total++; passed += passing('single malformed content line throws with diagnostic', function () {
  let threw = false;
  let msg = '';
  try {
    ingest.assertParserSanity({
      sectionName: 'BUSINESSES NAMED',
      sectionLines: ['Civis Systems — urban-systems intelligence — West Oakland'],
      parsedCount: 0,
    });
  } catch (e) { threw = true; msg = e.message; }
  assert.strictEqual(threw, true, 'should throw');
  assert.ok(msg.indexOf('BUSINESSES NAMED') >= 0, 'mentions section name');
  assert.ok(msg.indexOf('1 non-empty content lines') >= 0, 'reports line count');
  assert.ok(msg.indexOf('extracted 0 entities') >= 0, 'reports zero hits');
  assert.ok(msg.indexOf('Civis Systems') >= 0, 'includes sample line');
});

total++; passed += passing('multiple malformed content lines throws with first as sample', function () {
  let threw = false;
  let msg = '';
  try {
    ingest.assertParserSanity({
      sectionName: 'BUSINESSES NAMED',
      sectionLines: [
        '------------------------------------------------------------',
        'Bay Tribune (newspaper, Downtown Oakland)',
        'Civis Systems (Oaks ownership, West Oakland)',
        '------------------------------------------------------------',
      ],
      parsedCount: 0,
    });
  } catch (e) { threw = true; msg = e.message; }
  assert.strictEqual(threw, true, 'should throw');
  assert.ok(msg.indexOf('2 non-empty content lines') >= 0, 'reports line count (excluding separators)');
  assert.ok(msg.indexOf('Bay Tribune') >= 0, 'sample line is first content line');
  assert.ok(msg.indexOf('Civis Systems') < 0, 'sample line is NOT later content line');
});

total++; passed += passing('NAMES INDEX shape works identically to BUSINESSES NAMED', function () {
  let threw = false;
  let msg = '';
  try {
    ingest.assertParserSanity({
      sectionName: 'NAMES INDEX',
      sectionLines: ['Beverly Hayes is a home health aide in Temescal'],
      parsedCount: 0,
    });
  } catch (e) { threw = true; msg = e.message; }
  assert.strictEqual(threw, true, 'should throw');
  assert.ok(msg.indexOf('NAMES INDEX') >= 0, 'mentions section name (parameter-driven)');
});

// ---------------------------------------------------------------------------
console.log('\nGroup 3 — empirical regression (real fixtures)');

total++; passed += passing('C94 supplemental BUSINESSES NAMED parses + guard does NOT fire', function () {
  // From editions/cycle_pulse_supplemental_94_let_walks_reset.txt :254-260
  var sectionLines = [
    '------------------------------------------------------------',
    '',
    'BIZ-00052 | Civis Systems | Urban-systems intelligence / Oaks ownership lead | West Oakland',
    'BIZ-00018 | Bay Tribune | Newspaper / media | Downtown Oakland',
    '',
    '------------------------------------------------------------',
  ];
  // Real parser would extract 2 entries from these 2 pipe-format lines.
  ingest.assertParserSanity({
    sectionName: 'BUSINESSES NAMED',
    sectionLines: sectionLines,
    parsedCount: 2,
  });
});

total++; passed += passing('hypothetical G-S5 reproduction: BUSINESSES NAMED with prose instead of pipes', function () {
  // What S231 G-S5 would have looked like — content present but wrong shape.
  // Guard fires; pre-engine.26 this silently dropped to 0 businesses.
  var sectionLines = [
    '------------------------------------------------------------',
    '',
    'Civis Systems — urban-systems intelligence firm, Oaks ownership lead',
    'Bay Tribune — newspaper of record, downtown',
    '',
    '------------------------------------------------------------',
  ];
  let threw = false;
  try {
    ingest.assertParserSanity({
      sectionName: 'BUSINESSES NAMED',
      sectionLines: sectionLines,
      parsedCount: 0,
    });
  } catch (e) { threw = true; }
  assert.strictEqual(threw, true, 'guard fires on G-S5 shape (would have silently dropped pre-S234)');
});

// ---------------------------------------------------------------------------
console.log('\nGroup 4 — content/separator classification edge cases');

total++; passed += passing('lines with only whitespace count as separators', function () {
  ingest.assertParserSanity({
    sectionName: 'BUSINESSES NAMED',
    sectionLines: ['   ', '\t', '  \t  ', ''],
    parsedCount: 0,
  });
});

total++; passed += passing('em-dash separator lines do not count as content', function () {
  // em-dash + en-dash + box-drawing horizontal — all separator chars
  ingest.assertParserSanity({
    sectionName: 'BUSINESSES NAMED',
    sectionLines: ['──────────', '━━━━━━━━━━', '_________'],
    parsedCount: 0,
  });
});

total++; passed += passing('single character on a line counts as content (regex is strict)', function () {
  // A non-separator non-blank line with one char triggers guard.
  let threw = false;
  try {
    ingest.assertParserSanity({
      sectionName: 'BUSINESSES NAMED',
      sectionLines: ['x'],
      parsedCount: 0,
    });
  } catch (e) { threw = true; }
  assert.strictEqual(threw, true);
});

// ---------------------------------------------------------------------------
console.log('\n[engine.26] ' + passed + ' / ' + total + ' assertions passed across 4 groups');
process.exit(passed === total ? 0 : 1);
