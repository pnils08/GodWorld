/**
 * ingestPublishedEntities.honorific-match.test.js — S257 G-P-C97-1 +
 * S259 ENGINE_REPAIR Row 29 corrected contract.
 *
 * The no-POP-ID matcher strips a leading honorific. For a FULL name
 * ("Dr. Vanessa Tran-Muñoz") it then resolves by first+last — that path is
 * safe and preserved. For a name truncated to a bare title+surname
 * ("Dr. Tran-Muñoz", no first name) the earlier code auto-resolved on a
 * UNIQUE surname match; Row 29 proved that is a false-positive vector (a
 * title-only name is not identifiable, and on the live ledger POP-01021 is a
 * malformed self-row First="Dr." Last="Tran-Muñoz" — the OARI Director is NOT
 * POP-00781, which is barista Vanessa Treary). Corrected contract: a bare
 * honorific+surname NEVER auto-matches and NEVER auto-appends — it routes to
 * ambiguous with the surname candidates for brief-stage POP-ID resolution.
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

  total++; passed += await passing('Row 29: truncated "Dr. Tran-Muñoz" → ambiguous, NEVER auto-matched (even on unique surname)', async function () {
    var r = await mod.resolveCitizens([{ fullName: 'Dr. Tran-Muñoz', popId: null }], mockClient(), 'x');
    assert.strictEqual(r.matched.length, 0, 'a title-only name must NOT auto-match a unique surname (Row 29 false-positive vector)');
    assert.strictEqual(r.candidates.length, 0, 'must NOT append a duplicate (POP-01021 regression)');
    var a = r.ambiguous.find(function (x) { return /Tran-Muñoz/i.test(x.fullName); });
    assert.ok(a, 'expected ambiguous flag for the truncated name');
    assert.ok(a.popIds && a.popIds.indexOf('POP-00781') !== -1, 'ambiguous entry should carry the surname candidate(s) for brief-stage resolution');
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
