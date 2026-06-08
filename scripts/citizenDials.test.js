/**
 * citizenDials.test.js — proving ground for the engine.31 7-dial engine (S253).
 * Pairs with utilities/citizenMemory.js + utilities/citizenDialMap.js.
 *
 * Proves the mechanic BEFORE any sheet wiring (Phase 2/3): dials init neutral,
 * events nudge, one-off fades, a sustained pattern hardens, bands are the only
 * interface, crime erodes integrity, and back-dating produces the intended
 * "some we know well, some a mystery" texture.
 *
 * Run: node scripts/citizenDials.test.js
 */

const E = require('../utilities/citizenMemory.js');
const M = require('../utilities/citizenDialMap.js');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}
const ev = (tag, mult) => ({ label: tag, effects: M.nudgesForEvent_(tag, mult) });
function replay(c, tag, n, mult) { for (let i = 0; i < n; i++) { E.applyEvent_(c, ev(tag, mult)); E.settleCycle_(c); } }

console.log('═══ Section A — dial mechanic');
{
  const c = E.newCitizen_();
  assert('A1 all 7 dials init at midpoint 50', E.DIALS.every(d => E.current_(c, d) === 50));
  assert('A2 snapshot reflects neutral', E.snapshot_(c).drive === 50 && E.snapshot_(c).integrity === 50);

  const c2 = E.newCitizen_();
  E.applyEvent_(c2, ev('Promotion'));
  assert('A3 event nudges mood up (Promotion -> drive > 50)', E.current_(c2, 'drive') > 50);

  // one-off fades back toward baseline, base unchanged
  const c3 = E.newCitizen_();
  E.applyEvent_(c3, ev('Promotion'));
  for (let i = 0; i < 12; i++) E.settleCycle_(c3);
  assert('A4 one-off fades back to ~50 (mood decays, base intact)', Math.abs(E.current_(c3, 'drive') - 50) < 1 && c3.base.drive === 50);

  // sustained same-direction pattern hardens permanently into base
  const c4 = E.newCitizen_();
  replay(c4, 'Promotion', 6);
  for (let i = 0; i < 20; i++) E.settleCycle_(c4); // let all mood drain
  assert('A5 sustained pattern hardens base permanently (drive base > 50)', c4.base.drive > 50, 'base=' + c4.base.drive);
  assert('A6 hardened value survives full mood decay', E.current_(c4, 'drive') > 52);

  // a direction flip resets the streak (no accidental hardening)
  const c5 = E.newCitizen_();
  E.applyEvent_(c5, ev('Promotion'));        // +drive
  E.applyEvent_(c5, ev('Retirement'));       // -drive (flip)
  assert('A7 a direction flip resets the streak', Math.abs(c5.streak.drive) <= 1);

  // clamp: nothing leaves 0-100
  const c6 = E.newCitizen_();
  for (let i = 0; i < 40; i++) E.applyEvent_(c6, ev('Transgression-Grave'));
  assert('A8 integrity floors at 0 under relentless transgression', E.current_(c6, 'integrity') >= 0 && E.current_(c6, 'integrity') < 40);
}

console.log('═══ Section B — band layer is the only interface');
{
  assert('B1 bandIndex boundaries (0,19->0; 20->1; 50->2; 79->3; 80,100->4)',
    E.bandIndex_(0) === 0 && E.bandIndex_(19) === 0 && E.bandIndex_(20) === 1 &&
    E.bandIndex_(50) === 2 && E.bandIndex_(79) === 3 && E.bandIndex_(80) === 4 && E.bandIndex_(100) === 4);

  const c = E.newCitizen_();
  assert('B2 neutral citizen -> band 0 (signed) + multiplier 1.0', E.band_(c, 'drive') === 0 && E.bandMultiplier_(c, 'drive') === 1.0);

  const hi = E.newCitizen_({ drive: 90 });
  const lo = E.newCitizen_({ drive: 10 });
  assert('B3 high band -> multiplier > 1, low band -> multiplier < 1', E.bandMultiplier_(hi, 'drive') > 1 && E.bandMultiplier_(lo, 'drive') < 1);
  assert('B4 78 and 73 are identical in effect (same band, same multiplier)',
    E.bandMultiplier_(E.newCitizen_({ drive: 78 }), 'drive') === E.bandMultiplier_(E.newCitizen_({ drive: 73 }), 'drive'));

  assert('B5 neutral citizen describes as unremarkable ("")', E.describe_(c) === '');
  assert('B6 high-drive citizen reads "driven"/"relentless"', /driven|relentless/.test(E.describe_(hi)));
  assert('B7 corrupt citizen reads "corrupt"/"slippery"', /corrupt|slippery/.test(E.describe_(E.newCitizen_({ integrity: 8 }))));
}

console.log('═══ Section C — tag -> dial map');
{
  assert('C1 Promotion moves drive positive', M.nudgesForEvent_('Promotion').drive > 0);
  assert('C2 multi-dial: Wedding moves family AND warmth', M.nudgesForEvent_('Wedding').family > 0 && M.nudgesForEvent_('Wedding').warmth > 0);
  assert('C3 calendar suffix stripped: Career-FirstFriday == Career', JSON.stringify(M.nudgesForEvent_('Career-FirstFriday')) === JSON.stringify(M.nudgesForEvent_('Career')));
  assert('C4 real compound NOT stripped: Career-Transition carries openness', M.nudgesForEvent_('Career-Transition').openness > 0);
  assert('C5 ambient tag (Weather) still nudges (every event counts)', M.hasTag_('Weather'));
  assert('C6 edition tag (E97) -> sociability (public recognition)', M.nudgesForEvent_('E97').sociability > 0);
  assert('C6b structural marker (Compressed) -> inert (summary, not an event)', JSON.stringify(M.nudgesForEvent_('Compressed')) === '{}');
  assert('C6c content-routed sentence-tag (health) -> composure down', M.nudgesForEvent_('Serious health condition diagnosed.').composure < 0);
  assert('C6d untagged ordinary day -> small default nudge (never inert)', M.hasTag_('Untagged', 'just another day'));
  assert('C7 Conduct severity ladder: Grave erodes integrity more than Petty', M.nudgesForEvent_('Transgression-Grave').integrity < M.nudgesForEvent_('Transgression-Petty').integrity);
  assert('C8 severityMult scales deltas', M.nudgesForEvent_('Transgression-Petty', 2).integrity === M.nudgesForEvent_('Transgression-Petty').integrity * 2);
  assert('C9 Death is terminal -> empty (never a self-memory)', JSON.stringify(M.nudgesForEvent_('Death')) === '{}');
}

console.log('═══ Section D — back-dating texture + crime as erosion');
{
  // rich, lopsided history -> vivid dial; sparse history -> stays a "mystery" (~50)
  const known = E.newCitizen_();
  replay(known, 'Promotion', 10);
  for (let i = 0; i < 20; i++) E.settleCycle_(known);
  const mystery = E.newCitizen_();
  replay(mystery, 'Career', 1);
  for (let i = 0; i < 20; i++) E.settleCycle_(mystery);
  assert('D1 rich history -> citizen we KNOW (drive band raised)', E.band_(known, 'drive') >= 1, 'band=' + E.band_(known, 'drive'));
  assert('D2 sparse history -> citizen who stays a MYSTERY (drive neutral)', E.band_(mystery, 'drive') === 0);

  // crime is erosion of integrity: a single petty act does NOT damn; a pattern hardens dark
  const oneAct = E.newCitizen_();
  E.applyEvent_(oneAct, ev('Transgression-Petty'));
  for (let i = 0; i < 20; i++) E.settleCycle_(oneAct);
  assert('D3 a single petty act does not damn (integrity base intact)', oneAct.base.integrity === 50);

  const pattern = E.newCitizen_();
  replay(pattern, 'Transgression-Serious', 6);
  for (let i = 0; i < 20; i++) E.settleCycle_(pattern);
  assert('D4 a sustained transgression PATTERN hardens integrity below 50', pattern.base.integrity < 50, 'base=' + pattern.base.integrity);
  assert('D5 ...and pushes integrity into a low band (crime reachable)', E.band_(pattern, 'integrity') <= -1, 'band=' + E.band_(pattern, 'integrity'));

  // resistance accretes integrity (the light pole) — bidirectional
  const upright = E.newCitizen_();
  replay(upright, 'Resisted', 6);
  for (let i = 0; i < 20; i++) E.settleCycle_(upright);
  assert('D6 sustained resistance hardens integrity ABOVE 50 (bidirectional)', upright.base.integrity > 50, 'base=' + upright.base.integrity);
}

console.log('═══ Section E — storage round-trip (Phase 2 readiness)');
{
  const c = E.newCitizen_();
  replay(c, 'Promotion', 4);
  const json = JSON.stringify(E.serialize_(c));
  const c2 = E.deserialize_(JSON.parse(json));
  assert('E1 serialize -> JSON -> deserialize preserves current dial values',
    E.DIALS.every(d => E.current_(c, d) === E.current_(c2, d)));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
