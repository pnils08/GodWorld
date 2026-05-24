/**
 * ingestPublishedEntities.prose-signals.test.js — S232 canon.3 follow-up
 *
 * Verifies the letter-footer + pronoun-signal extraction added to
 * scripts/ingestPublishedEntities.js. Pre-S232 the script defaulted
 * BirthYear=2003 + heuristic Gender for every NEW citizen because
 * NAMES INDEX is too sparse. Letter footers ("— Name, AGE, Neighborhood,
 * Role") + pronoun frequency in surrounding prose are the empirical
 * canon evidence; these helpers extract that evidence.
 */

'use strict';

var assert = require('assert');
var mod = require('./ingestPublishedEntities.js');

function passing(name, fn) {
  try { fn(); console.log('  PASS  ' + name); return 1; }
  catch (e) { console.error('  FAIL  ' + name); console.error('        ' + (e.message || e)); return 0; }
}

var passed = 0;
var total = 0;

console.log('\n[S232] ingestPublishedEntities prose-signals\n');

// -----------------------------------------------------------------
console.log('Group 1 — extractLetterFooterSignals');

total++; passed += passing('parses canonical E94 letter footers', function () {
  var text = [
    'Some article body about the West Oakland Stab Fund.',
    '',
    '— Keisha Morris, 51, West Oakland, counselor',
    '',
    'Other body.',
    '',
    '— Miguel Santos, 54, Fruitvale, restaurant owner',
    '',
    '— David Okonkwo, 62, Lake Merritt, retired insurance adjuster'
  ].join('\n');
  var m = mod.extractLetterFooterSignals(text);
  assert.strictEqual(m.size, 3, 'expected 3 footers, got ' + m.size);
  var k = m.get('keisha morris');
  assert.ok(k, 'Keisha Morris missing');
  assert.strictEqual(k.age, 51);
  assert.strictEqual(k.neighborhood, 'West Oakland');
  assert.strictEqual(k.role, 'counselor');
  assert.strictEqual(m.get('miguel santos').age, 54);
  assert.strictEqual(m.get('david okonkwo').age, 62);
});

total++; passed += passing('parses footer without role (Delia Fuentes E86 pattern)', function () {
  var text = '— Delia Fuentes, 44, Fruitvale';
  var m = mod.extractLetterFooterSignals(text);
  assert.strictEqual(m.size, 1);
  var d = m.get('delia fuentes');
  assert.strictEqual(d.age, 44);
  assert.strictEqual(d.neighborhood, 'Fruitvale');
  assert.strictEqual(d.role, '');
});

total++; passed += passing('handles hyphenated names', function () {
  var text = '— Eloise Soria-Dominguez, 38, Fruitvale, planning lead';
  var m = mod.extractLetterFooterSignals(text);
  assert.strictEqual(m.size, 1);
  var e = m.get('eloise soriadominguez');
  assert.ok(e, 'hyphen-normalized name should key correctly');
  assert.strictEqual(e.age, 38);
});

total++; passed += passing('rejects absurd ages (< 5 or > 110)', function () {
  var text = '— Test Person, 200, Downtown, role\n— Other One, 2, Uptown';
  var m = mod.extractLetterFooterSignals(text);
  assert.strictEqual(m.size, 0, 'absurd ages should be rejected, got ' + m.size);
});

total++; passed += passing('rejects single-name footers', function () {
  var text = '— Madonna, 51, Downtown';
  var m = mod.extractLetterFooterSignals(text);
  assert.strictEqual(m.size, 0);
});

total++; passed += passing('first occurrence wins on duplicate name', function () {
  var text = '— Carmen Solis, 46, Fruitvale, advocate\n— Carmen Solis, 50, Uptown, dancer';
  var m = mod.extractLetterFooterSignals(text);
  assert.strictEqual(m.size, 1);
  assert.strictEqual(m.get('carmen solis').age, 46);
  assert.strictEqual(m.get('carmen solis').neighborhood, 'Fruitvale');
});

// -----------------------------------------------------------------
console.log('\nGroup 2 — detectGenderFromPronouns');

total++; passed += passing('female pronoun majority resolves female', function () {
  var text = 'Carmen Solis stood at the public comment podium. She had asked that question. ' +
             'Her stack of organizing was the beginning of a thread. She made them see it.';
  var g = mod.detectGenderFromPronouns(text, 'Carmen Solis');
  assert.strictEqual(g, 'female');
});

total++; passed += passing('male pronoun majority resolves male', function () {
  var text = 'Roberto Iglesias watched the vote. He didn\'t speak during public comment. ' +
             'He\'d said what he needed to say. He paused. "The project was always going to pass," he said.';
  var g = mod.detectGenderFromPronouns(text, 'Roberto Iglesias');
  assert.strictEqual(g, 'male');
});

total++; passed += passing('no pronoun evidence returns null', function () {
  var text = 'The committee deliberated. The vote was 8-0.';
  var g = mod.detectGenderFromPronouns(text, 'Rafael Phillips');
  assert.strictEqual(g, null);
});

total++; passed += passing('mixed pronouns near same name returns null (ambiguous)', function () {
  var text = 'Sam Lee was there. She said hello. He also said yes. She nodded. He stood.';
  var g = mod.detectGenderFromPronouns(text, 'Sam Lee');
  assert.strictEqual(g, null);
});

// -----------------------------------------------------------------
console.log('\nGroup 3 — enrichCandidateWithProseSignals');

total++; passed += passing('attaches signalAge + signalNeighborhood from footer', function () {
  var text = '— Test Citizen, 33, Adams Point, baker';
  var footerMap = mod.extractLetterFooterSignals(text);
  var c = { first: 'Test', last: 'Citizen' };
  mod.enrichCandidateWithProseSignals(c, footerMap, text);
  assert.strictEqual(c.signalAge, 33);
  assert.strictEqual(c.signalNeighborhood, 'Adams Point');
  assert.strictEqual(c.signalRole, 'baker');
});

total++; passed += passing('does not overwrite NAMES INDEX neighborhood when present', function () {
  var text = '— Test Citizen, 33, Adams Point, baker';
  var footerMap = mod.extractLetterFooterSignals(text);
  var c = { first: 'Test', last: 'Citizen', neighborhood: 'Fruitvale' };
  mod.enrichCandidateWithProseSignals(c, footerMap, text);
  // signalNeighborhood NOT set when candidate already has neighborhood
  assert.strictEqual(c.signalNeighborhood, undefined);
  assert.strictEqual(c.neighborhood, 'Fruitvale');
});

total++; passed += passing('attaches signalGender from prose pronouns', function () {
  var text = 'Test Citizen spoke today. She said the policy mattered. Her position was clear. ' +
             'She continued. Her statement was on the record.';
  var footerMap = new Map();
  var c = { first: 'Test', last: 'Citizen' };
  mod.enrichCandidateWithProseSignals(c, footerMap, text);
  assert.strictEqual(c.signalGender, 'female');
});

total++; passed += passing('integration: E94-shape Keisha Morris row gets full signal set', function () {
  var text = [
    '*Keisha Morris is a counselor in West Oakland. She had been waiting nine cycles.',
    '"I keep showing up," she said. "Because they need to see I\'m not going anywhere."',
    'Her colleagues at the clinic recognized the moment.*',
    '',
    '— Keisha Morris, 51, West Oakland, counselor'
  ].join('\n');
  var footerMap = mod.extractLetterFooterSignals(text);
  var c = { first: 'Keisha', last: 'Morris' };
  mod.enrichCandidateWithProseSignals(c, footerMap, text);
  assert.strictEqual(c.signalAge, 51);
  assert.strictEqual(c.signalNeighborhood, 'West Oakland');
  assert.strictEqual(c.signalRole, 'counselor');
  assert.strictEqual(c.signalGender, 'female');
});

// -----------------------------------------------------------------
console.log('\nGroup 4 — empirical: E94 full-text scan surfaces all 6 squatters');

total++; passed += passing('E94 letter footers cover Keisha+Miguel+David at least', function () {
  var fs = require('fs');
  var path = require('path');
  var text = fs.readFileSync(path.join(__dirname, '..', 'editions', 'cycle_pulse_edition_94.txt'), 'utf-8');
  var m = mod.extractLetterFooterSignals(text);
  assert.ok(m.has('keisha morris'), 'Keisha Morris should be detected from E94 text');
  assert.ok(m.has('miguel santos'), 'Miguel Santos should be detected from E94 text');
  assert.ok(m.has('david okonkwo'), 'David Okonkwo should be detected from E94 text');
  assert.strictEqual(m.get('keisha morris').age, 51);
  assert.strictEqual(m.get('miguel santos').age, 54);
  assert.strictEqual(m.get('david okonkwo').age, 62);
});

// -----------------------------------------------------------------
console.log('\n[S232] ' + passed + '/' + total + ' assertions passed');
if (passed !== total) process.exit(1);
