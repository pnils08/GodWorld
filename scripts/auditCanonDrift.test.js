/**
 * auditCanonDrift.test.js — T8 canon.3 unit contract
 *
 * Verifies normalization, denylist, title-prefix stripping, candidate
 * extraction, NAMES INDEX strip, and the key-builder fanout that lets
 * "Mayor Avery Santana" match Sim_Ledger "Avery Santana".
 *
 * No sheets reads — those happen only in main().
 */

'use strict';

var assert = require('assert');
var mod = require('./auditCanonDrift.js');

function passing(name, fn) {
  try { fn(); console.log('  PASS  ' + name); return 1; }
  catch (e) { console.error('  FAIL  ' + name); console.error('        ' + (e.message || e)); return 0; }
}

var passed = 0;
var total = 0;

console.log('\n[T8] auditCanonDrift.js — contract\n');

// -----------------------------------------------------------------
console.log('Group 1 — normalizeNameKey');

total++; passed += passing('lowercases + strips punctuation', function () {
  assert.strictEqual(mod.normalizeNameKey("J.R. Rosado"), 'jr rosado');
  assert.strictEqual(mod.normalizeNameKey("O'Brien"), 'obrien');
});

total++; passed += passing('strips diacritics', function () {
  assert.strictEqual(mod.normalizeNameKey('José Colón'), 'jose colon');
  assert.strictEqual(mod.normalizeNameKey('Eloise Soria-Dominguez'), 'eloise soriadominguez');
});

total++; passed += passing('collapses whitespace', function () {
  assert.strictEqual(mod.normalizeNameKey('  Carmen   Solis  '), 'carmen solis');
});

total++; passed += passing('null/empty safe', function () {
  assert.strictEqual(mod.normalizeNameKey(''), '');
  assert.strictEqual(mod.normalizeNameKey(null), '');
  assert.strictEqual(mod.normalizeNameKey(undefined), '');
});

// -----------------------------------------------------------------
console.log('\nGroup 2 — stripTitlePrefix');

total++; passed += passing('strips Mayor', function () {
  assert.deepStrictEqual(mod.stripTitlePrefix(['Mayor', 'Avery', 'Santana']), ['Avery', 'Santana']);
});

total++; passed += passing('strips Bishop / Coach / Dr', function () {
  assert.deepStrictEqual(mod.stripTitlePrefix(['Bishop', 'Reeves', 'Smith']), ['Reeves', 'Smith']);
  assert.deepStrictEqual(mod.stripTitlePrefix(['Coach', 'Varek', 'Smith']), ['Varek', 'Smith']);
  assert.deepStrictEqual(mod.stripTitlePrefix(['Dr', 'Tran', 'Munoz']), ['Tran', 'Munoz']);
});

total++; passed += passing('no-op on non-title prefix', function () {
  assert.deepStrictEqual(mod.stripTitlePrefix(['Carmen', 'Solis']), ['Carmen', 'Solis']);
});

total++; passed += passing('preserves at least 2 tokens (no over-strip)', function () {
  assert.deepStrictEqual(mod.stripTitlePrefix(['Mayor', 'Santana']), ['Mayor', 'Santana']);
});

// -----------------------------------------------------------------
console.log('\nGroup 3 — denylist');

total++; passed += passing('Oakland geo phrases hit denylist', function () {
  assert.strictEqual(mod.isDenied('west oakland'), true);
  assert.strictEqual(mod.isDenied('lake merritt'), true);
  assert.strictEqual(mod.isDenied('jack london'), true);
});

total++; passed += passing('Bay Tribune meta phrases hit denylist', function () {
  assert.strictEqual(mod.isDenied('bay tribune'), true);
  assert.strictEqual(mod.isDenied('cycle pulse'), true);
});

total++; passed += passing('genuine person names do NOT hit denylist', function () {
  assert.strictEqual(mod.isDenied('carmen solis'), false);
  assert.strictEqual(mod.isDenied('roberto iglesias'), false);
  assert.strictEqual(mod.isDenied('elena soria dominguez'), false);
});

// -----------------------------------------------------------------
console.log('\nGroup 4 — extractCandidates');

total++; passed += passing('catches 2-word First Last', function () {
  var got = mod.extractCandidates('I saw Carmen Solis at the market.');
  assert.ok(got.some(c => c.surface === 'Carmen Solis'), 'should catch Carmen Solis, got: ' + JSON.stringify(got.map(c => c.surface)));
});

total++; passed += passing('catches 3-word First Mid Last', function () {
  var got = mod.extractCandidates('Mayor Avery Santana spoke today.');
  // Regex catches at most 4-word run; should produce a single 3-token match.
  var hit = got.find(c => c.surface === 'Mayor Avery Santana');
  assert.ok(hit, 'should catch Mayor Avery Santana, got: ' + JSON.stringify(got.map(c => c.surface)));
});

total++; passed += passing('catches hyphenated last name', function () {
  var got = mod.extractCandidates('Eloise Soria-Dominguez chaired the panel.');
  assert.ok(got.some(c => c.surface === 'Eloise Soria-Dominguez'), 'got: ' + JSON.stringify(got.map(c => c.surface)));
});

total++; passed += passing('does not catch single capitalized word', function () {
  var got = mod.extractCandidates('Oakland is great.');
  assert.strictEqual(got.length, 0, 'should ignore single Caps token, got: ' + JSON.stringify(got.map(c => c.surface)));
});

// -----------------------------------------------------------------
console.log('\nGroup 5 — stripNamesIndex');

total++; passed += passing('strips NAMES INDEX block when present', function () {
  var input = 'Article body here.\n\nNAMES INDEX\n---\nPOP-00001 | Vinnie Keane\n\nBUSINESSES NAMED\n---\n';
  var out = mod.stripNamesIndex(input);
  assert.ok(out.includes('Article body here.'));
  assert.ok(!out.includes('POP-00001'), 'NAMES INDEX content should be gone, got: ' + JSON.stringify(out));
  assert.ok(out.includes('BUSINESSES NAMED') || !out.includes('NAMES INDEX'), 'preserved tail or fully cut');
});

total++; passed += passing('no-op when NAMES INDEX absent', function () {
  var input = 'No index here, just prose.';
  var out = mod.stripNamesIndex(input);
  assert.strictEqual(out, input);
});

// -----------------------------------------------------------------
console.log('\nGroup 6 — buildKeysToCheck + candidateIsKnown');

total++; passed += passing('Mayor X Y produces title-stripped key', function () {
  var keys = mod.buildKeysToCheck('Mayor Avery Santana');
  var normalized = keys.map(k => k.normalized);
  assert.ok(normalized.includes('mayor avery santana'), 'full form');
  assert.ok(normalized.includes('avery santana'), 'title-stripped form');
});

total++; passed += passing('3-word produces first+last derived key', function () {
  var keys = mod.buildKeysToCheck('Elena Soria Dominguez');
  var normalized = keys.map(k => k.normalized);
  assert.ok(normalized.includes('elena soria dominguez'), 'full');
  assert.ok(normalized.includes('elena dominguez'), 'first+last of 3');
});

total++; passed += passing('candidateIsKnown matches via Sim_Ledger normalized key', function () {
  var simSet = new Set(['avery santana', 'carmen solis']);
  var v = mod.candidateIsKnown('Mayor Avery Santana', simSet, new Set(), new Set());
  assert.strictEqual(v.hit, true, 'should hit Sim_Ledger via title-stripped key');
  assert.strictEqual(v.set, 'sim_ledger');
});

total++; passed += passing('candidateIsKnown returns NOT known for genuine drift', function () {
  var simSet = new Set(['avery santana']);
  var v = mod.candidateIsKnown('Roberto Iglesias', simSet, new Set(), new Set());
  assert.strictEqual(v.hit, false, 'Roberto Iglesias is the bay-tribune-only drift case');
});

total++; passed += passing('denylist match short-circuits before set lookup', function () {
  var v = mod.candidateIsKnown('West Oakland', new Set(), new Set(), new Set());
  assert.strictEqual(v.hit, true);
  assert.strictEqual(v.set, 'denylist');
});

total++; passed += passing('By X Y byline strips to X Y for set match', function () {
  var simSet = new Set(['jordan velez']);
  // "By Jordan Velez" should match Sim_Ledger after byline strip.
  // (Even though Jordan Velez is a reporter persona on the denylist,
  // the test is exercising the byline-strip mechanism with a stub set.)
  var keys = mod.buildKeysToCheck('By Jordan Velez');
  var normalized = keys.map(k => k.normalized);
  assert.ok(normalized.includes('by jordan velez'), 'full form preserved');
  assert.ok(normalized.includes('jordan velez'), 'byline-stripped form generated');
  var v = mod.candidateIsKnown('By Jordan Velez', simSet, new Set(), new Set());
  assert.strictEqual(v.hit, true, 'byline-stripped key should match sim set');
});

total++; passed += passing('reporter persona name on denylist', function () {
  var v = mod.candidateIsKnown('Carmen Delaine', new Set(), new Set(), new Set());
  assert.strictEqual(v.hit, true);
  assert.strictEqual(v.set, 'denylist');
});

total++; passed += passing('faith set substring branch fires when no denylist hit', function () {
  // Use a faith name not on the denylist so substring branch is the first hit.
  var faithSet = new Set(['telegraph presbyterian fellowship']);
  var v = mod.candidateIsKnown('Telegraph Presbyterian', new Set(), new Set(), new Set(), faithSet);
  assert.strictEqual(v.hit, true);
  assert.strictEqual(v.set, 'faith_organizations_substring');
});

// -----------------------------------------------------------------
console.log('\n[T8] ' + passed + '/' + total + ' assertions passed');
if (passed !== total) process.exit(1);
