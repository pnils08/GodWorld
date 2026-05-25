/**
 * lib.editionParser.article-table.test.js
 *
 * Coverage for the S235 G-PR7 ARTICLE TABLE parse + canonical headline
 * binding in `lib/editionParser.js`. Closes engine.25 G-PR7 — pre-fix the
 * PDF generator extracted run-on `**bold lede**` lines as headlines because
 * the parser silently ignored the canonical ARTICLE TABLE block. The block
 * is now the source of truth when its shape is canonical (named Slot column
 * present alongside Section, Headline, Reporter); legacy editions take a
 * silent-skip path so existing fixtures keep parsing unchanged.
 *
 * Groups:
 *  1. parseArticleTable — pure-function shape detection across 4 table shapes
 *  2. bindCanonicalHeadlines — fail-loud contract enforcement
 *  3. Empirical C94 fixture — canonical headlines bind end-to-end
 *  4. Backward compat — every existing edition parses without throwing
 *
 * Run: node scripts/lib.editionParser.article-table.test.js
 */

var fs = require('fs');
var path = require('path');
var parser = require('../lib/editionParser');

var passed = 0;
var failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log('  PASS  ' + label); passed++; }
  else { console.error('  FAIL  ' + label + (detail ? ' — ' + detail : '')); failed++; }
}

function expectThrow(label, fn, msgFragment) {
  try {
    fn();
    console.error('  FAIL  ' + label + ' — expected throw, none observed');
    failed++;
  } catch (e) {
    if (msgFragment && e.message.indexOf(msgFragment) === -1) {
      console.error('  FAIL  ' + label + ' — threw "' + e.message + '" but expected fragment "' + msgFragment + '"');
      failed++;
    } else {
      console.log('  PASS  ' + label + ' (threw: ' + e.message.slice(0, 80) + ')');
      passed++;
    }
  }
}

// ---------------------------------------------------------------------------
// Group 1 — parseArticleTable pure-function
// ---------------------------------------------------------------------------

console.log('\n=== Group 1 — parseArticleTable across 4 table shapes ===');

// Shape A: C94 canonical — Slot | Headline | Reporter | Section | Words
{
  var raw = [
    'header text irrelevant',
    '------',
    'ARTICLE TABLE',
    '------',
    '',
    '| Slot | Headline | Reporter | Section | Words |',
    '|------|----------|----------|---------|-------|',
    '| FP1 | The Town | Jordan Velez | FRONT PAGE | ~440 |',
    '| ED  | The Lede | Margaret Corliss | EDITOR\'S DESK | ~240 |',
    '| C1  | The Vote | Carmen Delaine | CIVIC | ~520 |',
    '',
    'next-non-pipe-section'
  ].join('\n');
  var t = parser.parseArticleTable(raw);
  assert('Shape A — present=true', t.present === true);
  assert('Shape A — 3 data rows', t.rows.length === 3);
  assert('Shape A — first row slot=FP1', t.rows[0].slot === 'FP1');
  assert('Shape A — first row headline preserved', t.rows[0].headline === 'The Town');
  assert('Shape A — first row section=FRONT PAGE', t.rows[0].section === 'FRONT PAGE');
  assert('Shape A — canonicalShape=true (named slot + all required cols)', t.canonicalShape === true);
}

// Shape B: E94 template — Slot | Section | Reporter | Headline (4 cols, order differs)
{
  var raw = [
    'ARTICLE TABLE',
    '',
    '| Slot | Section | Reporter | Headline |',
    '|------|---------|----------|----------|',
    '| FP1 | FRONT PAGE | Jordan Velez | The Town |',
    '| C1  | CIVIC | Carmen Delaine | The Vote |',
    ''
  ].join('\n');
  var t = parser.parseArticleTable(raw);
  assert('Shape B (template order) — canonicalShape=true', t.canonicalShape === true);
  assert('Shape B — column order tolerated; section value still parsed', t.rows[0].section === 'FRONT PAGE');
  assert('Shape B — headline value still parsed despite different column position', t.rows[0].headline === 'The Town');
}

// Shape C: E93-style — # | Section | Headline | Reporter | Words (numbered slots)
{
  var raw = [
    'ARTICLE TABLE',
    '',
    '| # | Section | Headline | Reporter | Words |',
    '|---|---------|----------|----------|-------|',
    '| FRONT | CIVIC | The Vote That Wasn\'t There | Carmen Delaine | ~950 |',
    '| 2 | EDITOR\'S DESK | What Readiness Looks Like | M. Corliss | ~230 |',
    ''
  ].join('\n');
  var t = parser.parseArticleTable(raw);
  assert('Shape C (numbered #) — present=true', t.present === true);
  assert('Shape C — # column mapped to slot key', t.rows[0].slot === 'FRONT');
  assert('Shape C — canonicalShape=false (slots not canonical pattern)', t.canonicalShape === false);
}

// Shape D: E85-style — # | Reporter | StoryType | SignalSource | Headline (no Section)
{
  var raw = [
    'ARTICLE TABLE',
    '',
    '| # | Reporter | StoryType | SignalSource | Headline |',
    '|---|----------|-----------|--------------|----------|',
    '| 1 | Carmen Delaine | Beat/Lead | MARA_DIRECTIVE | The Filing Cabinet |',
    ''
  ].join('\n');
  var t = parser.parseArticleTable(raw);
  assert('Shape D (no Section column) — present=true', t.present === true);
  assert('Shape D — canonicalShape=false (Section column missing)', t.canonicalShape === false);
  assert('Shape D — rows still extracted for downstream', t.rows.length === 1);
}

// No-table case
{
  var t = parser.parseArticleTable('## header\n\nsome body text without an article table\n');
  assert('No-table — present=false', t.present === false);
  assert('No-table — canonicalShape=false', t.canonicalShape === false);
  assert('No-table — rows empty', t.rows.length === 0);
}

// Table present, label only, no data rows
{
  var raw = [
    'ARTICLE TABLE',
    '',
    '------',
    'something else'
  ].join('\n');
  var t = parser.parseArticleTable(raw);
  assert('Label-only table — canonicalShape=false (no data rows)', t.canonicalShape === false);
}

// ---------------------------------------------------------------------------
// Group 2 — bindCanonicalHeadlines contract enforcement
// ---------------------------------------------------------------------------

console.log('\n=== Group 2 — bindCanonicalHeadlines fail-loud contract ===');

function mkSection(name, articles) {
  return { name: name, beat: 'civic', articles: articles, headline: '' };
}

function mkArticle(byline, headline) {
  return { byline: byline || '', headline: headline || '', text: '' };
}

// Canonical: binds + overrides parser's bold-lede headlines
{
  var sections = [
    mkSection('CIVIC', [
      mkArticle('By Carmen Delaine | Bay Tribune', 'WRONG (was bold lede)'),
      mkArticle('', ''),  // intra-article fragment, no byline
      mkArticle('By Maria Keen | Bay Tribune', 'WRONG (was bold lede 2)')
    ])
  ];
  var table = {
    canonicalShape: true,
    rows: [
      { slot: 'C1', section: 'CIVIC', reporter: 'Carmen Delaine', headline: 'The Vote That Was There' },
      { slot: 'C2', section: 'CIVIC', reporter: 'Maria Keen', headline: 'West Oakland: Cleared and Still' }
    ]
  };
  parser.bindCanonicalHeadlines(sections, table);
  assert('Canonical bind — section.headline = first row', sections[0].headline === 'The Vote That Was There');
  assert('Canonical bind — article[0].headline OVERWRITTEN (not set-if-empty)', sections[0].articles[0].headline === 'The Vote That Was There');
  assert('Canonical bind — article[1] (no byline) skipped', sections[0].articles[1].headline === '');
  assert('Canonical bind — article[2].headline bound to C2', sections[0].articles[2].headline === 'West Oakland: Cleared and Still');
}

// Letters section skipped — table references LETTERS, parsed section exists, no throw
{
  var sections = [
    mkSection('LETTERS', [
      mkArticle('By Keisha Morris', 'something'),
      mkArticle('By Miguel Santos', 'something else'),
      mkArticle('By David Okonkwo', 'third')
    ])
  ];
  var table = {
    canonicalShape: true,
    rows: [
      { slot: 'L1', section: 'LETTERS', reporter: 'Keisha Morris', headline: '(Stab Fund stuck)' },
      { slot: 'L2', section: 'LETTERS', reporter: 'Miguel Santos', headline: '(Mam-language gratitude)' },
      { slot: 'L3', section: 'LETTERS', reporter: 'David Okonkwo', headline: '(Reyna at Dario\'s)' }
    ]
  };
  parser.bindCanonicalHeadlines(sections, table);
  assert('LETTERS skipped — section.headline NOT bound', sections[0].headline === '');
  assert('LETTERS skipped — article headlines unchanged', sections[0].articles[0].headline === 'something');
}

// Letters section referenced but parsed edition lacks it — throws
expectThrow('LETTERS referenced but absent — throws',
  function () {
    var sections = [mkSection('CIVIC', [mkArticle('By X Y', '')])];
    var table = {
      canonicalShape: true,
      rows: [
        { slot: 'L1', section: 'LETTERS', reporter: 'X', headline: '(stub)' }
      ]
    };
    parser.bindCanonicalHeadlines(sections, table);
  },
  'LETTERS section'
);

// Section name mismatch — throws
expectThrow('Section mismatch — throws',
  function () {
    var sections = [mkSection('CIVIC', [mkArticle('By X Y', '')])];
    var table = {
      canonicalShape: true,
      rows: [
        { slot: 'C1', section: 'NONEXISTENT', reporter: 'X', headline: 'Some title' }
      ]
    };
    parser.bindCanonicalHeadlines(sections, table);
  },
  'parsed edition has no matching section'
);

// Byline-article count mismatch — throws
expectThrow('Byline-count mismatch — throws',
  function () {
    var sections = [
      mkSection('CIVIC', [
        mkArticle('By Carmen Delaine | X', '')
        // table claims 2 articles, parser found 1 byline-article
      ])
    ];
    var table = {
      canonicalShape: true,
      rows: [
        { slot: 'C1', section: 'CIVIC', reporter: 'X', headline: 'A' },
        { slot: 'C2', section: 'CIVIC', reporter: 'Y', headline: 'B' }
      ]
    };
    parser.bindCanonicalHeadlines(sections, table);
  },
  'parser found 1 byline-bearing article'
);

// Empty headline cell — throws
expectThrow('Empty Headline cell — throws',
  function () {
    var sections = [mkSection('CIVIC', [mkArticle('By X Y', '')])];
    var table = {
      canonicalShape: true,
      rows: [{ slot: 'C1', section: 'CIVIC', reporter: 'X', headline: '' }]
    };
    parser.bindCanonicalHeadlines(sections, table);
  },
  'empty Headline cell'
);

// Non-canonical shape — no binding, no throw (legacy path)
{
  var sections = [
    mkSection('CIVIC', [
      mkArticle('By Carmen Delaine | X', 'EXISTING')
    ])
  ];
  var table = {
    canonicalShape: false,  // legacy
    rows: [
      { slot: '1', section: 'CIVIC', reporter: 'X', headline: 'NEW (should NOT bind)' }
    ]
  };
  parser.bindCanonicalHeadlines(sections, table);
  assert('Non-canonical — article.headline unchanged', sections[0].articles[0].headline === 'EXISTING');
  assert('Non-canonical — section.headline unchanged', sections[0].headline === '');
}

// Loose-byline filter — "By noon, ..." prose lines must NOT count as bylines
{
  var sections = [
    mkSection('CULTURE', [
      mkArticle('By Maria Keen | Bay Tribune', ''),
      mkArticle('By noon, the tables were set. The kettle was hot.', '')  // false positive byline
    ])
  ];
  var table = {
    canonicalShape: true,
    rows: [
      { slot: 'N1', section: 'CULTURE', reporter: 'Maria Keen', headline: 'Adams Point Opens Doors' }
    ]
  };
  parser.bindCanonicalHeadlines(sections, table);
  assert('Loose-byline filter — "By noon, ..." excluded from byline-article count', sections[0].articles[0].headline === 'Adams Point Opens Doors');
}

// ---------------------------------------------------------------------------
// Group 3 — Empirical C94 fixture end-to-end
// ---------------------------------------------------------------------------

console.log('\n=== Group 3 — empirical C94 fixture ===');

var c94Path = path.resolve(__dirname, '..', 'editions', 'cycle_pulse_edition_94.txt');
if (fs.existsSync(c94Path)) {
  var c94 = parser.parseEdition(c94Path);
  assert('C94 — articleTable.canonicalShape=true', c94.articleTable && c94.articleTable.canonicalShape === true);
  assert('C94 — articleTable.rows has 11 entries', c94.articleTable.rows.length === 11);

  function getSection(name) {
    return c94.sections.find(function (s) { return parser.normalizeSectionId(s.name) === parser.normalizeSectionId(name); });
  }

  var fp = getSection('FRONT PAGE');
  var ed = getSection("EDITOR'S DESK");
  var civic = getSection('CIVIC');
  var culture = getSection('CULTURE');
  var sports = getSection('SPORTS');
  var letters = getSection('LETTERS');

  assert('C94 — FRONT PAGE headline = canonical FP1 title', fp.headline === 'Civis Systems Field — The Town');
  assert("C94 — EDITOR'S DESK headline = canonical ED title", ed.headline === 'What The Town Looks Like');
  assert('C94 — CIVIC headline = canonical C1 title', civic.headline === 'The Vote That Was There');
  assert('C94 — CULTURE headline = canonical N1 title (Adams Point)', culture.headline === 'Adams Point Opens Doors');
  assert('C94 — SPORTS headline = canonical S1 title (Kelley)', sports.headline === 'Kelley In Focus, Kelley Catches Fire');

  // CIVIC has 2 byline-articles (C1, C2); each gets its canonical title
  var civicBylines = civic.articles.filter(function (a) { return /^By\s+[A-Z]/.test(a.byline); });
  assert('C94 — CIVIC has 2 byline-articles bound', civicBylines.length === 2);
  assert('C94 — CIVIC[0] headline = The Vote That Was There', civicBylines[0].headline === 'The Vote That Was There');
  assert('C94 — CIVIC[1] headline = West Oakland: Cleared and Still', civicBylines[1].headline === 'West Oakland: Cleared and Still');

  // SPORTS has 3 byline-articles
  var sportsBylines = sports.articles.filter(function (a) { return /^By\s+[A-Z]/.test(a.byline); });
  assert('C94 — SPORTS has 3 byline-articles bound', sportsBylines.length === 3);
  assert('C94 — SPORTS S2 headline bound', sportsBylines[1].headline === 'The Let-Walks Coming');
  assert('C94 — SPORTS S3 headline bound', sportsBylines[2].headline === "Reyna's Two-Homer Night");

  // LETTERS skipped — section.headline stays empty, articles untouched
  assert('C94 — LETTERS section.headline stays empty (skipped by design)', letters.headline === '');
} else {
  assert('C94 fixture present', false, 'editions/cycle_pulse_edition_94.txt missing');
}

// ---------------------------------------------------------------------------
// Group 4 — Backward compat sweep
// ---------------------------------------------------------------------------

console.log('\n=== Group 4 — every edition parses without throwing ===');

var editionsDir = path.resolve(__dirname, '..', 'editions');
if (fs.existsSync(editionsDir)) {
  var files = fs.readdirSync(editionsDir)
    .filter(function (f) { return /^cycle_pulse_(edition|supplemental|dispatch|interview|interview-transcript)_/.test(f) && f.endsWith('.txt'); })
    .map(function (f) { return path.join(editionsDir, f); });

  var crashed = [];
  var canonicalEditions = [];
  for (var i = 0; i < files.length; i++) {
    try {
      var r = parser.parseEdition(files[i]);
      if (r.articleTable && r.articleTable.canonicalShape) {
        canonicalEditions.push(path.basename(files[i]));
      }
    } catch (err) {
      crashed.push(path.basename(files[i]) + ': ' + err.message);
    }
  }
  assert('All ' + files.length + ' editions parse without throwing', crashed.length === 0, crashed.join('; '));
  assert('At least 1 edition triggers canonicalShape (C94+)', canonicalEditions.length >= 1, 'canonical: ' + canonicalEditions.join(','));
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log('\n[engine.25 G-PR7] ' + passed + ' / ' + (passed + failed) + ' assertions passed across 4 groups');
if (failed > 0) process.exit(1);
process.exit(0);
