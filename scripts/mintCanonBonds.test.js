'use strict';

/**
 * mintCanonBonds.test.js — the canon→bond intake's guards.
 *
 * The load-bearing test is the POPID trap (plan §7.4): two canon-synthesis
 * agents independently attached a POPID lifted from an adjacent row of their
 * own output and both reported it verified. A wrong id writes a real edge
 * between real strangers and nothing errors. Every other assertion here is
 * ordinary; that one is why the script exists.
 */

const assert = require('assert');
const {
  normName, buildNameIndex, resolveName, pairKey, buildBondIndex,
  normBondId, makeBondId, buildNotes, validateClaim, planMint, BOND_HEADERS,
} = require('./mintCanonBonds');

// --- fixtures ---------------------------------------------------------------

const LEDGER = [
  ['POPID', 'Name', 'First', 'Last', 'Status', 'Tier'],
  ['POP-00001', 'Vinnie Keane', 'Vinnie', 'Keane', 'Active', '1'],
  ['POP-00018', 'Benji Dillon', 'Benji', 'Dillon', 'Active', '1'],
  ['POP-00783', 'Yuki Ji', 'Yuki', 'Ji', 'Active', '3'],
  ['POP-00527', 'Mike Paulson', 'Mike', 'Paulson', 'Active', '1'],
  ['POP-00789', 'Elias Varek', 'Elias', 'Varek', 'Active', '1'],
  ['POP-00504', 'Warren Ashford', 'Warren', 'Ashford', 'Active', '1'],
  ['POP-00900', 'Dana Reeve', 'Dana', 'Reeve', 'Traded', '3'],
  // deliberate homonym — two live citizens share a name
  ['POP-00910', 'Chris Lane', 'Chris', 'Lane', 'Active', '4'],
  ['POP-00911', 'Chris Lane', 'Chris', 'Lane', 'Active', '4'],
];

const BONDS = [
  BOND_HEADERS.slice(),
  ['aaaaaaaa', 'POP-00001', 'POP-00002', 'family', '8', 'active', 'household', '', 'Rockridge', '102', '102', 'seeded', 'none', 'none', 'FALSE', 'FALSE', 'off-season'],
  ['BOND-BBBBBBBB', 'POP-00789', 'POP-00504', 'rivalry', '5', 'active', 'random', '', '', '103', '103', 'x', 'none', 'none', 'FALSE', 'FALSE', 'off-season'],
];

// deterministic rand for reproducible ids
function seqRand(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const nameIndex = buildNameIndex(LEDGER);
const bondIndex = buildBondIndex(BONDS);

function ctx(extra) {
  return Object.assign({ nameIndex, bondIndex, cycle: 104, takenIds: new Set(bondIndex.ids), rand: seqRand(7) }, extra || {});
}

const GOOD = {
  a: 'Benji Dillon', b: 'Vinnie Keane', bondType: 'friendship', intensity: 9,
  domainTag: 'SPORTS', nature: 'One Last Run', evidence: 'canon cut',
};

// --- normName / resolveName -------------------------------------------------

assert.strictEqual(normName('  Élias   Varek '), 'elias varek');
assert.strictEqual(normName("Bobby Chen-Ramirez"), 'bobby chen-ramirez');
assert.strictEqual(resolveName('Elias Varek', nameIndex).entry.pop, 'POP-00789');
assert.strictEqual(resolveName('elias varek', nameIndex).entry.pop, 'POP-00789');
assert.ok(/no citizen named/.test(resolveName('Nobody Here', nameIndex).error));
assert.ok(/ambiguous/.test(resolveName('Chris Lane', nameIndex).error), 'homonym must reject, not pick one');

// --- pair keys are unordered ------------------------------------------------

assert.strictEqual(pairKey('POP-00001', 'POP-00018'), pairKey('POP-00018', 'POP-00001'));

// --- BondId ----------------------------------------------------------------

assert.strictEqual(normBondId('BOND-9CF02D7E'), '9cf02d7e');
assert.strictEqual(normBondId('86ej5o5l'), '86ej5o5l');
{
  // engine.128: a new id must never collide with an existing one, in either format
  const taken = new Set(['aaaaaaaa', 'bbbbbbbb']);
  const ids = new Set();
  const rand = seqRand(3);
  for (let i = 0; i < 500; i++) {
    const id = makeBondId(taken, rand);
    assert.ok(/^[a-z0-9]{8}$/.test(id), 'id must match the engine format: ' + id);
    assert.ok(!ids.has(id), 'duplicate id issued: ' + id);
    ids.add(id);
  }
  assert.ok(!ids.has('aaaaaaaa') && !ids.has('bbbbbbbb'));
}

// --- Notes: sim-facing, cycle-stamped, no Gregorian clock -------------------

{
  const n = buildNotes('Uncle and niece', 104);
  assert.strictEqual(n, 'Uncle and niece. [canon mint C104]');
  assert.ok(!/\b(19|20)\d{2}-\d{2}-\d{2}\b/.test(n), 'no Gregorian date in a sim-facing note');
  assert.strictEqual(buildNotes('Already punctuated.', 99), 'Already punctuated. [canon mint C99]');
}

// --- the POPID trap ---------------------------------------------------------

{
  // The exact live failure: the canon report labelled Benji Dillon POP-00783,
  // which is Yuki Ji — a name one row above in the report's own table.
  const res = validateClaim(Object.assign({}, GOOD, { expectedPopA: 'POP-00783' }), ctx());
  assert.strictEqual(res.ok, false, 'a mismatched supplied POPID must reject the claim');
  assert.ok(res.errors.some((e) => /supplied POP-00783 does not match name resolution POP-00018/.test(e)));
  // and the wrong id must appear nowhere in the resolution
  assert.strictEqual(res.popA, 'POP-00018', 'name resolution wins; the supplied id is never adopted');
}

{
  // A matching supplied id is fine and changes nothing.
  const res = validateClaim(Object.assign({}, GOOD, { expectedPopA: 'POP-00018', expectedPopB: 'POP-00001' }), ctx());
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.popA, 'POP-00018');
}

{
  // No supplied id at all is the normal path.
  const res = validateClaim(GOOD, ctx());
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.row[1], 'POP-00018');
  assert.strictEqual(res.row[2], 'POP-00001');
  assert.strictEqual(res.row[6], 'canon', 'Origin must mark provenance');
  assert.strictEqual(res.row[5], 'active');
  assert.strictEqual(res.row[9], '104');
  assert.strictEqual(res.row.length, BOND_HEADERS.length);
}

// --- fail-closed rejections -------------------------------------------------

{
  const res = validateClaim(Object.assign({}, GOOD, { a: 'Chris Lane' }), ctx());
  assert.strictEqual(res.ok, false, 'ambiguous name rejects');
}
{
  const res = validateClaim(Object.assign({}, GOOD, { a: 'Ghost Citizen' }), ctx());
  assert.strictEqual(res.ok, false, 'unknown name rejects');
}
{
  const res = validateClaim(Object.assign({}, GOOD, { a: 'Warren Ashford', b: 'Elias Varek' }), ctx());
  assert.strictEqual(res.ok, false, 'an existing pair must not be silently updated');
  assert.ok(res.errors.some((e) => /already has 1 bond row/.test(e)));
}
{
  const res = validateClaim(Object.assign({}, GOOD, { b: 'Benji Dillon' }), ctx());
  assert.strictEqual(res.ok, false, 'self-bond rejects');
}
{
  const res = validateClaim(Object.assign({}, GOOD, { b: 'Dana Reeve' }), ctx());
  assert.strictEqual(res.ok, false, 'a Traded citizen forms no bonds');
}
{
  const res = validateClaim(Object.assign({}, GOOD, { bondType: 'covenant' }), ctx());
  assert.strictEqual(res.ok, false, 'a bondType outside BOND_TYPES rejects — engine.59 scar');
}
{
  const res = validateClaim(Object.assign({}, GOOD, { domainTag: 'SPORT' }), ctx());
  assert.strictEqual(res.ok, false, 'near-miss domain tag rejects (SPORT vs SPORTS)');
}
{
  for (const bad of [0, 11, 'high', null]) {
    assert.strictEqual(validateClaim(Object.assign({}, GOOD, { intensity: bad }), ctx()).ok, false, 'intensity ' + bad);
  }
}
{
  assert.strictEqual(validateClaim(Object.assign({}, GOOD, { nature: '' }), ctx()).ok, false, 'nature required');
  assert.strictEqual(validateClaim(Object.assign({}, GOOD, { evidence: '' }), ctx()).ok, false, 'evidence required');
}

// --- warnings, not rejections ----------------------------------------------

{
  const res = validateClaim(Object.assign({}, GOOD, { bondType: 'tension', intensity: 4 }), ctx());
  assert.strictEqual(res.ok, true, 'tension is legal');
  assert.ok(res.warnings.some((w) => /auto-retypes/.test(w)), 'but the caller must be told it drifts');
}

// --- planMint ---------------------------------------------------------------

{
  const plan = planMint({
    cycle: 104,
    claims: [
      GOOD,
      { a: 'Mike Paulson', b: 'Elias Varek', bondType: 'rivalry', intensity: 6, domainTag: 'BUSINESS', nature: 'heat shield', evidence: 'canon cut' },
      { a: 'Ghost', b: 'Vinnie Keane', bondType: 'friendship', intensity: 5, nature: 'x', evidence: 'y' },
    ],
  }, { ledgerRows: LEDGER, bondRows: BONDS, rand: seqRand(11) });

  assert.strictEqual(plan.cycle, 104);
  assert.strictEqual(plan.accepted.length, 2);
  assert.strictEqual(plan.rejected.length, 1);
  const ids = plan.accepted.map((r) => r.bondId);
  assert.strictEqual(new Set(ids).size, ids.length, 'ids unique within a run');
  for (const id of ids) assert.ok(!bondIndex.ids.has(normBondId(id)), 'ids unique against the live sheet');
}

{
  // The same pair twice in one file, written in opposite order, must not double-mint.
  const plan = planMint({
    cycle: 104,
    claims: [
      GOOD,
      { a: 'Vinnie Keane', b: 'Benji Dillon', bondType: 'alliance', intensity: 5, nature: 'dup', evidence: 'z' },
    ],
  }, { ledgerRows: LEDGER, bondRows: BONDS, rand: seqRand(5) });
  assert.strictEqual(plan.accepted.length, 1);
  assert.ok(/duplicate pair within this claim file/.test(plan.rejected[0].errors[0]));
}

{
  // No cycle anywhere is an error, not a default.
  assert.throws(
    () => planMint({ claims: [] }, { ledgerRows: LEDGER, bondRows: BONDS, rand: seqRand(1) }),
    /no cycle/
  );
}

console.log('mintCanonBonds.test.js — all assertions passed');
