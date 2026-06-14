/**
 * ingestPublishedEntities.honorific-match.test.js — S257 G-P-C97-1 contract
 *
 * Verifies the no-POP-ID matcher's honorific + last-name-anchored path so a
 * freeform NAMES INDEX row truncated to a title+last-name ("Dr. Tran-Muñoz")
 * resolves to the EXISTING citizen instead of minting a duplicate (the
 * POP-01021 regression: Dr. Vanessa Tran-Muñoz already holds POP-00781).
 *
 * resolveCitizens reads Simulation_Ledger!A1:AU via the sheets client — mocked
 * here with a tiny fixture (POPID col A; First/Last by header index).
 */

'use strict';

var assert = require('assert');
var mod = require('./ingestPublishedEntities.js');

// Minimal Simulation_Ledger fixture: header row + a handful of citizens.
// Vanessa Tran-Muñoz (POP-00781) is the unique Tran-Muñoz; the Reeves pair
// exercises the >1 last-name-match ambiguity branch.
var HEADERS = ['POPID', 'First', 'Last'];
var ROWS = [
  HEADERS,
  ['POP-00781', 'Vanessa', 'Tran-Muñoz'],
  ['POP-00100', 'Calvin', 'Reeves'],
  ['POP-00101', 'Dana', 'Reeves'],
  ['POP-00590', 'Reggie', 'Soto'],
];

function mockClient() {
  return {
    spreadsheets: {
      values: {
        get: function () { return Promise.resolve({ data: { values: ROWS } }); },
      },
    },
  };
}

function passing(name, fn) {
  return fn().then(function () {
    console.log('  PASS  ' + name);
    return 1;
  }).catch(function (e) {
    console.error('  FAIL  ' + name + '\n        ' + (e.message || e));
    return 0;
  });
}

async function run() {
  console.log('\n[G-P-C97-1] ingestPublishedEntities — honorific + last-name-anchored matcher\n');
  var total = 0, passed = 0;

  total++; passed += await passing('truncated "Dr. Tran-Muñoz" matches existing POP-00781 (no duplicate mint)', async function () {
    var r = await mod.resolveCitizens([{ fullName: 'Dr. Tran-Muñoz', popId: null }], mockClient(), 'x');
    var m = r.matched.find(function (x) { return x.popId === 'POP-00781'; });
    assert.ok(m, 'expected POP-00781 in matched, got matched=' + JSON.stringify(r.matched) + ' candidates=' + JSON.stringify(r.candidates));
    assert.strictEqual(r.candidates.length, 0, 'must NOT append a candidate (POP-01021 regression)');
  });

  total++; passed += await passing('full "Dr. Vanessa Tran-Muñoz" matches POP-00781 (honorific stripped, first+last)', async function () {
    var r = await mod.resolveCitizens([{ fullName: 'Dr. Vanessa Tran-Muñoz', popId: null }], mockClient(), 'x');
    assert.ok(r.matched.find(function (x) { return x.popId === 'POP-00781'; }), 'expected POP-00781 matched');
    assert.strictEqual(r.candidates.length, 0, 'must not append');
  });

  total++; passed += await passing('honorific + ambiguous last name ("Dr. Reeves") → ambiguous, not append/mismatch', async function () {
    var r = await mod.resolveCitizens([{ fullName: 'Dr. Reeves', popId: null }], mockClient(), 'x');
    var a = r.ambiguous.find(function (x) { return /Reeves/i.test(x.fullName); });
    assert.ok(a, 'expected ambiguous entry for Dr. Reeves');
    assert.strictEqual(r.matched.length, 0, 'must not auto-match an ambiguous last name');
    assert.strictEqual(r.candidates.length, 0, 'must not append');
  });

  total++; passed += await passing('honorific + unknown last name ("Dr. Quigley") → flagged ambiguous, NOT appended', async function () {
    var r = await mod.resolveCitizens([{ fullName: 'Dr. Quigley', popId: null }], mockClient(), 'x');
    assert.strictEqual(r.candidates.length, 0, 'bare-honorific unknown name must not auto-append (POP-01021 guard)');
    assert.ok(r.ambiguous.find(function (x) { return /Quigley/i.test(x.fullName); }), 'expected ambiguous flag');
  });

  total++; passed += await passing('regression: ordinary "Reggie Soto" still matches by first+last', async function () {
    var r = await mod.resolveCitizens([{ fullName: 'Reggie Soto', popId: null }], mockClient(), 'x');
    assert.ok(r.matched.find(function (x) { return x.popId === 'POP-00590'; }), 'expected POP-00590 matched');
  });

  total++; passed += await passing('regression: genuinely-new "Marisol Okonkwo" still appends as candidate', async function () {
    var r = await mod.resolveCitizens([{ fullName: 'Marisol Okonkwo', popId: null }], mockClient(), 'x');
    assert.strictEqual(r.candidates.length, 1, 'new two-token name should still append');
    assert.strictEqual(r.matched.length, 0);
  });

  console.log('\n[G-P-C97-1] ' + passed + '/' + total + ' assertions passed');
  process.exit(passed === total ? 0 : 1);
}

run();
