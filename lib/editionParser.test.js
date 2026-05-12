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

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
