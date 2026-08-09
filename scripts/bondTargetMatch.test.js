/**
 * bondTargetMatch.test.js — engine.101 bond write-back. Pairs with
 * scripts/bondTargetMatch.js (semantics extracted from the engine.48 T4
 * ripple match in citizen-wake.js — this file pins them so the intake
 * BondTarget column and the ripple register cannot drift).
 *
 * Run: node scripts/bondTargetMatch.test.js
 */

const { matchBondTargets_ } = require('./bondTargetMatch');

let failures = 0;
function assert(cond, msg) {
  if (cond) { console.log('ok  — ' + msg); return; }
  failures++;
  console.error('FAIL — ' + msg);
}

const BONDS = [
  { name: 'Vinnie Keane', pop: 'POP-00018' },
  { name: 'Depak Sharma', pop: 'POP-00042' },
  { name: 'Al Osei', pop: 'POP-00077' },          // first name < 3 chars — full-name only
  { name: "Mary O'Brien", pop: 'POP-00090' },     // regex-special char in name
];

// A — full-name hits
{
  const hits = matchBondTargets_('I keep thinking about Vinnie Keane and the shop.', BONDS);
  assert(hits.length === 1 && hits[0].pop === 'POP-00018', 'A1 full name matches');
}
// B — first-name fallback
{
  const hits = matchBondTargets_('Depak looked worried at the store yesterday.', BONDS);
  assert(hits.length === 1 && hits[0].pop === 'POP-00042', 'B1 first name (>=3 chars) matches');
}
// C — word boundary: no substring false positives
{
  const hits = matchBondTargets_('The department reshuffle stalled again.', BONDS);
  assert(hits.length === 0, 'C1 substring of a name does not match (Depak !~ "department")');
}
// D — short first name cannot match on first name alone
{
  const noHit = matchBondTargets_('Al came by the shop.', BONDS);
  assert(noHit.length === 0, 'D1 first name < 3 chars does not match alone');
  const full = matchBondTargets_('Al Osei came by the shop.', BONDS);
  assert(full.length === 1 && full[0].pop === 'POP-00077', 'D2 short-first-name bond still matches full name');
}
// E — regex-special characters in names are escaped
{
  const hits = matchBondTargets_("Mary O'Brien waved from the porch.", BONDS);
  assert(hits.length === 1 && hits[0].pop === 'POP-00090', 'E1 apostrophe name matches, no regex throw');
}
// F — case-insensitive
{
  const hits = matchBondTargets_('vinnie keane was there.', BONDS);
  assert(hits.length === 1, 'F1 lowercase mention matches');
}
// G — multiple hits preserve bondPairs order
{
  const hits = matchBondTargets_('Depak Sharma and Vinnie Keane both showed up.', BONDS);
  assert(hits.length === 2 && hits[0].pop === 'POP-00018' && hits[1].pop === 'POP-00042',
    'G1 multiple hits, bondPairs order (Vinnie first in list, first in output)');
}
// H — degenerate inputs
{
  assert(matchBondTargets_('', BONDS).length === 0, 'H1 empty text');
  assert(matchBondTargets_(null, BONDS).length === 0, 'H2 null text');
  assert(matchBondTargets_('hello', null).length === 0, 'H3 null bondPairs');
  assert(matchBondTargets_('Vinnie Keane', []).length === 0, 'H4 empty bondPairs');
  assert(matchBondTargets_('Vinnie Keane', [{ name: 'Vinnie Keane' }]).length === 0, 'H5 bond missing pop skipped');
}

if (failures) { console.error(failures + ' FAILURES'); process.exit(1); }
console.log('bondTargetMatch.test.js — all pass');
