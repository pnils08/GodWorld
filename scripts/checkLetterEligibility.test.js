/**
 * checkLetterEligibility.test.js — ES-2 step 1 (G-W-C97-1), S257
 *
 * Verifies the deterministic letter-eligibility gate: denylist + bio-marker
 * ineligibility, unresolvable-POPID failure, and candidates-file POPID parsing.
 */

'use strict';

var assert = require('assert');
var g = require('./checkLetterEligibility.js');

var HEADERS = ['POPID', 'First', 'Last', 'CitizenBio'];
var ROWS = [
  HEADERS,
  ['POP-00004', 'Lucia', 'Polito', 'Saint Lucia in human form. Tier 1, Codex-Linked entity. The city does not know what she is.'],
  ['POP-09999', 'Test', 'Manifest', 'Appears as an ordinary woman; this is her earthly manifestation.'],  // marker, not on denylist
  ['POP-00590', 'Reggie', 'Soto', 'Auto body shop owner in Fruitvale, married, two kids.'],                 // clean
  ['POP-00789', 'Elias', 'Varek', ''],  // Tier-1 entity-by-lore but EMPTY bio — regex can't catch (denylist would)
];

function passing(name, fn) {
  try { fn(); console.log('  PASS  ' + name); return 1; }
  catch (e) { console.error('  FAIL  ' + name + '\n        ' + (e.message || e)); return 0; }
}

var total = 0, passed = 0;
console.log('\n[ES-2 step 1] checkLetterEligibility — eligibility gate\n');

total++; passed += passing('field-actor POP-00004 is ineligible for citizen-source surfaces', function () {
  var m = g.buildIneligibleMap(ROWS);
  assert.ok(m.has('POP-00004'), 'POP-00004 must be ineligible');
  assert.ok(/field-actor/.test(m.get('POP-00004')), 'reason should cite field-actor');
});

total++; passed += passing('bio entity-marker (POP-09999, not on denylist) is ineligible via regex', function () {
  var m = g.buildIneligibleMap(ROWS);
  assert.ok(m.has('POP-09999'), 'marker-bio citizen must be caught by the secondary net');
  assert.ok(/bio entity-marker/.test(m.get('POP-09999')), 'reason should cite bio marker');
});

total++; passed += passing('ordinary citizen POP-00590 is eligible', function () {
  var m = g.buildIneligibleMap(ROWS);
  assert.ok(!m.has('POP-00590'), 'ordinary citizen must NOT be ineligible');
});

total++; passed += passing('marker-free Tier-1 (Varek, empty bio) NOT caught by regex — documents the recall limit', function () {
  var m = g.buildIneligibleMap(ROWS);
  assert.ok(!m.has('POP-00789'), 'empty-bio citizen has no detectable signal (must be added to denylist if never-write)');
});

total++; passed += passing('screenCandidates flags ineligible + lets clean through', function () {
  var m = g.buildIneligibleMap(ROWS);
  var led = g.buildLedgerPopIdSet(ROWS);
  var r = g.screenCandidates(['POP-00004', 'POP-00590'], m, led);
  assert.strictEqual(r.ineligible.length, 1, 'one ineligible');
  assert.strictEqual(r.ineligible[0].popId, 'POP-00004');
  assert.deepStrictEqual(r.eligible, ['POP-00590']);
});

total++; passed += passing('unresolvable POPID (not on ledger) fails — can\'t-verify = ineligible', function () {
  var m = g.buildIneligibleMap(ROWS);
  var led = g.buildLedgerPopIdSet(ROWS);
  var r = g.screenCandidates(['POP-77777'], m, led);
  assert.strictEqual(r.unresolvable.length, 1, 'unknown POPID must be unresolvable');
  assert.strictEqual(r.eligible.length, 0);
});

total++; passed += passing('extractCandidatePopIds parses the candidates.md bullet format', function () {
  var txt = '## Candidate pool\n- **POP-00760 — Yael Bauer** (Piedmont Ave)\n- **POP-00004 — Lucia Polito** (Fruitvale)\n';
  var ids = g.extractCandidatePopIds(txt);
  assert.deepStrictEqual(ids.sort(), ['POP-00004', 'POP-00760']);
});

// G-S4 (C99): POPIDs named in an editorial header / "hard exclusions" line or
// the Notes section must NOT be extracted — only the "## Candidate pool" section.
total++; passed += passing('G-S4 — exclusion-line + Notes POPIDs are ignored, only candidate-pool extracted', function () {
  var txt = '# Letters — Candidate Pool\n' +
            '**Hard exclusions (editorial):** Lucia Polito POP-00004; Beverly Hayes POP-00772.\n' +
            '---\n## Candidate pool\n' +
            '- **POP-00349 — Jiu Wong** retirement.\n- **POP-00618 — Lucy Ferreira** Fruitvale.\n' +
            '## Notes\n- See also POP-00999 in passing.\n';
  var ids = g.extractCandidatePopIds(txt).sort();
  assert.deepStrictEqual(ids, ['POP-00349', 'POP-00618'], 'exclusion-line POP-00004/00772 + Notes POP-00999 must not appear');
});

// Backward-compat: a raw --popids list (no heading) still extracts everything.
total++; passed += passing('G-S4 — raw --popids list (no heading) falls back to whole-string extraction', function () {
  var ids = g.extractCandidatePopIds('POP-00001,POP-00002').sort();
  assert.deepStrictEqual(ids, ['POP-00001', 'POP-00002']);
});

console.log('\n[ES-2 step 1] ' + passed + '/' + total + ' assertions passed');
process.exit(passed === total ? 0 : 1);
