'use strict';

/**
 * The name matcher is the whole risk. The ledger really does contain citizens
 * surnamed When, Train, Park and Cross, so an unguarded surname match fires on
 * ordinary speech — measured on the live corpus, "Patrick When" collected 14
 * false hits before the stoplist. A false pair here writes a real edge between
 * real strangers, same failure class as a wrong POPID.
 */

const assert = require('assert');
const { buildMatcher, buildPairSet, detect, loadOffered, provenanceOf } = require('./extractBondsFromWakes');

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

// --- provenance: the echo trap ---------------------------------------------

{
  // Warren Ashford is Rockridge, Vinnie Keane is Grand Lake — not co-residents. But
  // the sports slice names A's players, and Vinnie is the A's DH. Without the offered
  // log this looks like a discovery; with it, it is the engine hearing itself.
  const offered = loadOffered([
    JSON.stringify({ pop: 'POP-00504', cycle: 101, daypart: 'night', offeredPops: [], feed: "The A's are 126-35. Vinnie Keane walks out to a standing ovation.", own: '' }),
  ]);
  const ref = { pop: 'POP-00504', cycle: 101, daypart: 'night' };
  assert.strictEqual(provenanceOf(ref, 'POP-00001', 'Vinnie Keane', offered), 'echo',
    'a name carried by the sports slice is an echo, not a discovery');
}
{
  // Their OWN page returning a name is the signal, not contamination. A citizen whose
  // wiki keeps circling someone is what a bond looks like from the inside.
  const offered = loadOffered([
    JSON.stringify({ pop: 'POP-00183', cycle: 102, daypart: 'evening', offeredPops: [],
      feed: 'The A\'s are 126-35.', own: 'You have been circling something with Lucia Polito for weeks.' }),
  ]);
  assert.strictEqual(provenanceOf({ pop: 'POP-00183', cycle: 102, daypart: 'evening' }, 'POP-00004', 'Lucia Polito', offered),
    'continuity', 'their own page remembering someone is evidence, not an echo');
}
{
  // A ripple — somebody crossed their path — is a real interaction, not noise.
  const offered = loadOffered([
    JSON.stringify({ pop: 'POP-00231', cycle: 100, daypart: 'evening', offeredPops: [], feed: '',
      own: 'You crossed paths with Lucia Polito recently; they seemed preoccupied.' }),
  ]);
  assert.strictEqual(provenanceOf({ pop: 'POP-00231', cycle: 100, daypart: 'evening' }, 'POP-00004', 'Lucia Polito', offered), 'continuity');
}
{
  // Structural co-resident/bond POPIDs are continuity too — known people, not strangers.
  const offered = loadOffered([
    JSON.stringify({ pop: 'POP-00231', cycle: 100, daypart: 'evening', offeredPops: ['POP-00004'], feed: '', own: '' }),
  ]);
  assert.strictEqual(provenanceOf({ pop: 'POP-00231', cycle: 100, daypart: 'evening' }, 'POP-00004', 'Lucia Polito', offered), 'continuity');
}
{
  // The city feed still wins when a name is in both — the weaker read.
  const offered = loadOffered([
    JSON.stringify({ pop: 'POP-00504', cycle: 101, daypart: 'night', offeredPops: ['POP-00001'],
      feed: 'Vinnie Keane walks out to a standing ovation.', own: 'You know Vinnie Keane.' }),
  ]);
  assert.strictEqual(provenanceOf({ pop: 'POP-00504', cycle: 101, daypart: 'night' }, 'POP-00001', 'Vinnie Keane', offered), 'echo');
}
{
  // The real thing: the wake offered nothing about this person and the citizen said it anyway.
  const offered = loadOffered([
    JSON.stringify({ pop: 'POP-00231', cycle: 100, daypart: 'evening', offeredPops: ['POP-00999'], feed: 'The weather turned cold.', own: '' }),
  ]);
  assert.strictEqual(provenanceOf({ pop: 'POP-00231', cycle: 100, daypart: 'evening' }, 'POP-00004', 'Lucia Polito', offered), 'unprompted');
}
{
  // No record for that wake — must NOT be guessed either way.
  assert.strictEqual(provenanceOf({ pop: 'POP-00231', cycle: 77, daypart: 'evening' }, 'POP-00004', 'Lucia Polito', new Map()), 'unknown');
}
{
  // A surname alone inside an injected block still counts as offered.
  const offered = loadOffered([
    JSON.stringify({ pop: 'POP-00528', cycle: 101, daypart: 'evening', offeredPops: [], feed: 'The Richards trade cleared waivers.', own: '' }),
  ]);
  assert.strictEqual(provenanceOf({ pop: 'POP-00528', cycle: 101, daypart: 'evening' }, 'POP-00031', 'Martin Richards', offered), 'echo');
}
{
  // Short tokens must not match loosely — "Fay" (3 chars) may not echo off stray prose.
  const offered = loadOffered([
    JSON.stringify({ pop: 'POP-00789', cycle: 101, daypart: 'afternoon', offeredPops: [], feed: 'A fine day.', own: '' }),
  ]);
  assert.strictEqual(provenanceOf({ pop: 'POP-00789', cycle: 101, daypart: 'afternoon' }, 'POP-00794', 'Irene Fay', offered), 'unprompted');
}

// --- detect() surfaces the verdict -----------------------------------------

{
  const offered = loadOffered([
    JSON.stringify({ pop: 'POP-00231', cycle: 100, daypart: 'evening', offeredPops: ['POP-00004'], feed: '', own: '' }),
    JSON.stringify({ pop: 'POP-00231', cycle: 101, daypart: 'night', offeredPops: [], feed: 'Quiet block tonight.', own: '' }),
  ]);
  const out = detect([
    { pop: 'POP-00231', cycle: 100, daypart: 'evening', text: 'Lucia again.' },
    { pop: 'POP-00231', cycle: 101, daypart: 'night', text: 'Lucia... I do not know.' },
  ], m, existing, { min: 2, offered });
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].prov.continuity, 1);
  assert.strictEqual(out[0].prov.unprompted, 1);
  assert.strictEqual(out[0].verdict, 'candidate');
}
{
  // Every mention off the city feed -> not a candidate.
  const offered = loadOffered([
    JSON.stringify({ pop: 'POP-00231', cycle: 100, daypart: 'evening', offeredPops: [], feed: 'Lucia Polito opened the new market stall, the paper says.', own: '' }),
    JSON.stringify({ pop: 'POP-00231', cycle: 101, daypart: 'night', offeredPops: [], feed: 'Lucia Polito again in the paper.', own: '' }),
  ]);
  const out = detect([
    { pop: 'POP-00231', cycle: 100, daypart: 'evening', text: 'Lucia again.' },
    { pop: 'POP-00231', cycle: 101, daypart: 'night', text: 'Lucia once more.' },
  ], m, existing, { min: 2, offered });
  assert.strictEqual(out[0].verdict, 'echo', 'city-feed-only mentions are not a bond');
}
{
  // No offered log at all -> everything is unknown, nothing is a candidate.
  const out = detect([
    { pop: 'POP-00231', cycle: 100, daypart: 'evening', text: 'Lucia again.' },
    { pop: 'POP-00231', cycle: 101, daypart: 'night', text: 'Lucia once more.' },
  ], m, existing, { min: 2 });
  assert.strictEqual(out[0].verdict, 'unknown');
  assert.strictEqual(out[0].prov.unknown, 2);
}

console.log('extractBondsFromWakes.test.js — all assertions passed');
