#!/usr/bin/env node
/**
 * citizenReflectionWriteback.test.js — offline guard for the dual-tag reflection write-back
 * composer (research.14, S264). Proves composure-as-affect-only is SCOPED to the reflection path:
 *   - EVENT tag contributes its NON-composure dials only;
 *   - AFFECT tag is the sole composure authority and contributes its full deltas;
 *   - shared dials are ADDITIVE (not overwritten);
 *   - a null/absent affect yields ZERO composure (no event-composure fallback);
 *   - DIAL_MAP event-tag composure is UNTOUCHED (objective compressor/back-date path unharmed).
 * Run: node scripts/citizenReflectionWriteback.test.js   (exits 0 pass / 1 fail). NOT pushed (.test.js).
 */
const dm = require('../utilities/citizenDialMap');
const mem = require('../utilities/citizenMemory');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}
const norm = (o) => JSON.stringify(Object.keys(o).sort().reduce((m, k) => ((m[k] = o[k]), m), {}));
const eq = (o, exp) => norm(o) === norm(exp);

console.log('Test 1: composure-as-affect-only — resentful promotion nets composure DOWN');
{
  // Promotion = {drive:8, composure:2}; Resentful = {composure:-3, warmth:-2}
  const r = dm.nudgesForReflection_('Promotion', 'Resentful', 1, '');
  assert('event composure (+2) stripped; affect composure (-3) wins', r.composure === -3, JSON.stringify(r));
  assert('event non-composure dial (drive 8) carried', r.drive === 8);
  assert('affect non-composure dial (warmth -2) carried', r.warmth === -2);
  assert('full composite shape', eq(r, { drive: 8, warmth: -2, composure: -3 }), JSON.stringify(r));
}

console.log('\nTest 2: shared dial is additive, not overwritten');
{
  // Community = {sociability:4, warmth:2}; Resentful warmth -2  ->  warmth nets 0
  const r = dm.nudgesForReflection_('Community', 'Resentful', 1, '');
  assert('shared warmth sums to 0 (2 + -2)', r.warmth === 0, JSON.stringify(r));
  assert('composure from affect only', r.composure === -3);
  assert('sociability from event preserved', r.sociability === 4);
}

console.log('\nTest 3: positive affect survives a neutral/positive event (additive drive)');
{
  // Career-Transition = {drive:3, openness:3}; Excited = {composure:3, drive:2}
  const r = dm.nudgesForReflection_('Career-Transition', 'Excited', 1, '');
  assert('composure positive from affect', r.composure === 3);
  assert('drive additive (3 + 2)', r.drive === 5, JSON.stringify(r));
  assert('openness from event', r.openness === 3);
}

console.log('\nTest 4: null/absent affect -> ZERO composure, no event-composure fallback');
{
  const r = dm.nudgesForReflection_('Promotion', '', 1, '');
  assert('no composure key when affect absent', !('composure' in r), JSON.stringify(r));
  assert('event non-composure dials still present', r.drive === 8);
  const r2 = dm.nudgesForReflection_('Promotion', null, 1, '');
  assert('null affect same as empty', !('composure' in r2) && r2.drive === 8);
}

console.log('\nTest 5: severityMult scales the whole composite');
{
  const r = dm.nudgesForReflection_('Promotion', 'Resentful', 0.5, '');
  assert('halved composite', eq(r, { drive: 4, warmth: -1, composure: -1.5 }), JSON.stringify(r));
}

console.log('\nTest 6: DIAL_MAP event composure UNTOUCHED (objective path unharmed)');
{
  assert('Promotion still carries composure +2 in the map', dm.nudgesForEvent_('Promotion', 1, '').composure === 2);
  assert('Critical still carries composure -8 in the map', dm.nudgesForEvent_('Critical', 1, '').composure === -8);
  assert('Divorce still carries composure -5 in the map', dm.nudgesForEvent_('Divorce', 1, '').composure === -5);
}

console.log('\nTest 7: applyReflectionDualTag_ moves mood per the composite');
{
  const c = mem.newCitizen_({});
  const before = mem.current_(c, 'composure');
  mem.applyReflectionDualTag_(c, 'Promotion', 'Resentful', dm, 1);
  assert('composure mood went negative', mem.current_(c, 'composure') < before, `${before} -> ${mem.current_(c, 'composure')}`);
  assert('drive mood went positive', c.mood.drive === 8, JSON.stringify(c.mood));
  assert('applyTaggedEvent_ left intact (still exported)', typeof mem.applyTaggedEvent_ === 'function');
}

console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
