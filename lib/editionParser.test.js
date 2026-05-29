/**
 * editionParser.test.js — coverage for guessBeat (15+ named beats) +
 * parseEdition (smoke-test against real edition fixtures in editions/).
 *
 * Run: node lib/editionParser.test.js
 * Exits 0 on pass, 1 on failure.
 */

const fs = require('fs');
const path = require('path');
const parser = require('./editionParser');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('Test 1: guessBeat — meta sections (precedence-first)');
{
  assert("'Article Table' → meta", parser.guessBeat('Article Table') === 'meta');
  assert("'Storyline Tracker' → meta", parser.guessBeat('Storyline Tracker') === 'meta');
  assert("'Citizen Usage' → meta", parser.guessBeat('Citizen Usage') === 'meta');
  assert("'Continuity Notes' → meta", parser.guessBeat('Continuity Notes') === 'meta');
  assert("'Coming Next' → meta", parser.guessBeat('Coming Next') === 'meta');
  assert("'Names Index' → meta (S189 E5)", parser.guessBeat('Names Index') === 'meta');
  assert("'Businesses Named' → meta (S189 E5, precedence over business)", parser.guessBeat('Businesses Named') === 'meta');
}

console.log('\nTest 2: guessBeat — editorial beats');
{
  assert("'Front Page' → front-page", parser.guessBeat('Front Page') === 'front-page');
  assert("'Civic Affairs' → civic", parser.guessBeat('Civic Affairs') === 'civic');
  assert("'Sports' → sports", parser.guessBeat('Sports') === 'sports');
  assert("'Business' → business", parser.guessBeat('Business') === 'business');
  assert("'Culture' → culture", parser.guessBeat('Culture') === 'culture');
  assert("'Community' → culture", parser.guessBeat('Community') === 'culture');
  assert("'Seasonal Coverage' → culture", parser.guessBeat('Seasonal Coverage') === 'culture');
  assert("'Chicago' → chicago", parser.guessBeat('Chicago') === 'chicago');
  assert("'Letters' → letters", parser.guessBeat('Letters') === 'letters');
  assert("'Editorial' → editorial", parser.guessBeat('Editorial') === 'editorial');
  assert("'Opinion' → opinion", parser.guessBeat('Opinion') === 'opinion');
  assert("'Lifestyle' → lifestyle", parser.guessBeat('Lifestyle') === 'lifestyle');
  assert("'Neighborhood' → neighborhood", parser.guessBeat('Neighborhood') === 'neighborhood');
}

console.log('\nTest 3: guessBeat — case insensitive');
{
  assert("'CIVIC AFFAIRS' → civic", parser.guessBeat('CIVIC AFFAIRS') === 'civic');
  assert("'sports' → sports", parser.guessBeat('sports') === 'sports');
}

console.log('\nTest 4: parseEdition — smoke against real edition fixtures');
{
  const editionsDir = path.resolve(__dirname, '..', 'editions');
  if (!fs.existsSync(editionsDir)) {
    assert('editions/ directory exists', false, 'editions dir missing — fixtures unavailable');
  } else {
    const files = fs.readdirSync(editionsDir)
      .filter(f => /^cycle_pulse_edition_\d+\.txt$/.test(f))
      .map(f => path.join(editionsDir, f));
    assert('at least 5 edition fixtures present', files.length >= 5, `found ${files.length}`);

    // Pick a recent edition (last in sorted order)
    files.sort();
    const sample = files[files.length - 1];
    const result = parser.parseEdition(sample);

    assert('parseEdition returns object', typeof result === 'object' && result !== null);
    assert('result.sections is array', Array.isArray(result.sections));
    assert('result.sections non-empty', result.sections.length > 0);
    // Each section should have at minimum a name + beat + content
    if (result.sections.length > 0) {
      const s = result.sections[0];
      assert('first section has name', typeof s.name === 'string' && s.name.length > 0);
      assert('first section has beat', typeof s.beat === 'string');
    }
  }
}

console.log('\nTest 5: parseEdition — multiple editions parse without throwing');
{
  const editionsDir = path.resolve(__dirname, '..', 'editions');
  if (fs.existsSync(editionsDir)) {
    const files = fs.readdirSync(editionsDir)
      .filter(f => /^cycle_pulse_edition_\d+\.txt$/.test(f))
      .sort()
      .slice(-5)
      .map(f => path.join(editionsDir, f));

    let crashed = 0;
    for (const f of files) {
      try {
        parser.parseEdition(f);
      } catch (err) {
        crashed++;
        console.error(`  parser crashed on ${path.basename(f)}: ${err.message}`);
      }
    }
    assert(`5 most recent editions parse cleanly (${files.length - crashed}/${files.length})`, crashed === 0);
  }
}

console.log('\nTest 6: parseEdition — C95 body-cohesion regression (S244 ES-1, G-PR-NEW2)');
{
  // The S235 ARTICLE TABLE binding exposed a structural split: the canonical
  // edition shape puts a `---` rule between byline and body, so the article
  // splitter tore each article into a headline+byline stub and an orphaned
  // headless body. The PDF front-page path then rendered the ~120-char stub
  // as the body (empty after the headline/byline strip). The body-cohesion
  // merge folds headless continuation blocks back into the preceding article.
  // A naive `body.length > 0` assertion passes trivially (orphan bodies have
  // length) — so this asserts the real invariant: no headline'd stub, no
  // headless large-body orphan (letters excepted — they render via section.text).
  const editionsDir = path.resolve(__dirname, '..', 'editions');
  const c95 = path.join(editionsDir, 'cycle_pulse_edition_95.txt');
  if (fs.existsSync(c95)) {
    const ed = parser.parseEdition(c95);
    assert('C95 articleTable.canonicalShape === true', ed.articleTable.canonicalShape === true);

    let stubs = 0, orphans = 0;
    ed.sections.forEach(function (s) {
      if (s.beat === 'meta' || s.beat === 'letters') return;
      s.articles.forEach(function (a) {
        const len = (a.text || '').length;
        if (a.headline && len < 200) stubs++;            // headline with no body
        if (!a.headline && !a.byline && len > 500) orphans++; // body that lost its headline
      });
    });
    assert('C95 no headline-only stubs (headline w/ <200-char body)', stubs === 0, `${stubs} stubs`);
    assert('C95 no headless orphan bodies (>500 chars, non-letters)', orphans === 0, `${orphans} orphans`);

    // Every byline-bearing article in a canonical section carries real prose.
    let thinBodies = 0;
    ed.sections.forEach(function (s) {
      if (s.beat === 'meta' || s.beat === 'letters') return;
      s.articles.forEach(function (a) {
        if (a.byline && (a.text || '').length < 200) thinBodies++;
      });
    });
    assert('C95 every byline article has a substantive body', thinBodies === 0, `${thinBodies} thin`);
  } else {
    assert('C95 fixture present', false, 'cycle_pulse_edition_95.txt missing');
  }
}

console.log('\nTest 7: parseEdition — no orphaned headline stubs across all editions');
{
  // Cross-vintage guard: the merge must not leave a headline-bearing stub in
  // ANY edition (canonical or legacy). Letters excepted (headline-less by
  // design). This catches a future split-logic change that re-orphans bodies.
  const editionsDir = path.resolve(__dirname, '..', 'editions');
  if (fs.existsSync(editionsDir)) {
    const files = fs.readdirSync(editionsDir)
      .filter(f => /^cycle_pulse_edition_\d+\.txt$/.test(f))
      .map(f => path.join(editionsDir, f));
    let totalStubs = 0;
    const offenders = [];
    files.forEach(function (f) {
      const ed = parser.parseEdition(f);
      ed.sections.forEach(function (s) {
        if (s.beat === 'meta' || s.beat === 'letters') return;
        s.articles.forEach(function (a) {
          if (a.headline && (a.text || '').length < 200) {
            totalStubs++;
            offenders.push(path.basename(f) + ':' + s.name);
          }
        });
      });
    });
    assert(`no headline stubs in any edition (${files.length} checked)`, totalStubs === 0, offenders.join(', '));
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
