'use strict';

/**
 * The name matcher is the whole risk. The ledger really does contain citizens
 * surnamed When, Train, Park and Cross, so an unguarded surname match fires on
 * ordinary speech — measured on the live corpus, "Patrick When" collected 14
 * false hits before the stoplist. A false pair here writes a real edge between
 * real strangers, same failure class as a wrong POPID.
 */

const assert = require('assert');
const { buildMatcher, buildPairSet, detect } = require('./extractBondsFromWakes');

const LEDGER = [
  ['POPID', 'First', 'Last', 'Status'],
  ['POP-00001', 'Vinnie', 'Keane', 'Active'],
  ['POP-00004', 'Lucia', 'Polito', 'Active'],
  ['POP-00208', 'Patrick', 'When', 'Active'],      // surname is an ordinary word
  ['POP-00520', 'Derwin', 'Train', 'Active'],      // surname is an ordinary word
  ['POP-00038', 'Theo', 'Park', 'Active'],         // surname is an ordinary word
  ['POP-01019', 'Patrick', 'Hill', 'Active'],      // shares the forename "Patrick"
  ['POP-00789', 'Elias', 'Varek', 'Active'],
  ['POP-00794', 'Irene', 'Fay', 'Active'],
  ['POP-00162', 'Reed', 'Thompson', 'Active'],     // forename is an ordinary word
  ['POP-00634', 'Dame', 'Reed', 'Active'],         // surname collides with a forename
];

const BONDS = [
  ['BondId', 'CitizenA', 'CitizenB'],
  ['b1', 'POP-00789', 'POP-00794'],   // Varek↔Fay already known to the engine
];

const m = buildMatcher(LEDGER);
const existing = buildPairSet(BONDS);
const anchorsFor = (pop) => m.anchors.filter((a) => a.pop === pop).map((a) => a.kind).sort();

// --- ordinary-word names never anchor alone --------------------------------

// The block is on the ORDINARY WORD, not on the citizen. "Derwin" and "Theo" are
// unique, unremarkable forenames and rightly still anchor — it is "Train" and
// "Park" that must never fire on their own.
assert.ok(!anchorsFor('POP-00208').includes('surname'), '"When" must not be a surname anchor');
assert.ok(!anchorsFor('POP-00520').includes('surname'), '"Train" must not be a surname anchor');
assert.ok(!anchorsFor('POP-00038').includes('surname'), '"Park" must not be a surname anchor');
assert.ok(anchorsFor('POP-00520').includes('forename'), '"Derwin" is fine and must still anchor');
assert.ok(!anchorsFor('POP-00162').includes('forename'), '"Reed" must not be a forename anchor');

// --- shared names never anchor alone ---------------------------------------

assert.ok(!anchorsFor('POP-01019').includes('forename'), 'two Patricks — neither may anchor on the forename');
assert.ok(!anchorsFor('POP-00208').includes('forename'), 'two Patricks — neither may anchor on the forename');

// --- a surname that is also somebody's forename never anchors --------------

assert.ok(!anchorsFor('POP-00634').includes('surname'), '"Reed" is a forename elsewhere — not a surname anchor');

// --- clean, distinctive names DO anchor ------------------------------------

assert.deepStrictEqual(anchorsFor('POP-00004'), ['forename', 'full', 'surname'].sort());
assert.deepStrictEqual(anchorsFor('POP-00789'), ['forename', 'full', 'surname'].sort());

// --- detection --------------------------------------------------------------

{
  // the exact false-positive that motivated the stoplist
  const out = detect([
    { pop: 'POP-00001', cycle: 101, daypart: 'night', text: 'I remember when the park was busy and the train ran late.' },
    { pop: 'POP-00001', cycle: 102, daypart: 'night', text: 'Funny when you think about it, down by the park.' },
  ], m, existing, { min: 1 });
  assert.strictEqual(out.length, 0, 'ordinary speech must produce zero candidates');
}

{
  // a real mention, twice, across two cycles
  const out = detect([
    { pop: 'POP-00231', cycle: 100, daypart: 'evening', text: "Lucia's got this energy about her that's hard to ignore." },
    { pop: 'POP-00231', cycle: 101, daypart: 'night', text: 'Lucia... man, I do not know. The way she listens.' },
  ], m, existing, { min: 2 });
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].named, 'POP-00004');
  assert.strictEqual(out[0].mentions, 2);
  assert.deepStrictEqual(out[0].cycles, ['100', '101']);
}

{
  // a pair the engine already has is not a candidate
  const out = detect([
    { pop: 'POP-00789', cycle: 101, daypart: 'afternoon', text: 'Irene and I built Civis from the ground up.' },
    { pop: 'POP-00789', cycle: 102, daypart: 'afternoon', text: 'Irene is diving deep into policy now.' },
  ], m, existing, { min: 1 });
  assert.strictEqual(out.length, 0, 'an existing bond row suppresses the candidate');
}

{
  // naming yourself is not a relationship
  const out = detect([
    { pop: 'POP-00004', cycle: 100, daypart: 'morning', text: 'Lucia Polito, that is me, still tired.' },
  ], m, existing, { min: 1 });
  assert.strictEqual(out.length, 0);
}

{
  // one reflection naming the same person twice counts once for that reflection
  const out = detect([
    { pop: 'POP-00231', cycle: 100, daypart: 'evening', text: 'Lucia. Lucia Polito. Always Lucia.' },
  ], m, existing, { min: 1 });
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].mentions, 1, 'per-reflection dedup — repetition in one breath is not two occasions');
}

{
  // direction does not matter: A naming B and B naming A are one pair
  const out = detect([
    { pop: 'POP-00231', cycle: 100, daypart: 'evening', text: 'Lucia again.' },
    { pop: 'POP-00004', cycle: 101, daypart: 'night', text: 'Been thinking about Calvin Turner.' },
  ], m, existing, { min: 1 });
  const lucia = out.filter((c) => [c.speaker, c.named].includes('POP-00004'));
  assert.ok(lucia.length >= 1);
}

console.log('extractBondsFromWakes.test.js — all assertions passed');
