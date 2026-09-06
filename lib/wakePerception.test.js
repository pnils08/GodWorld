/**
 * wakePerception.test.js — engine.147 wake-pack seam: renderStanding is a pure, plain-language
 * render of the family line + the maneuver posture. No engine numbers or ids ever reach the voice.
 *
 * Run: node lib/wakePerception.test.js
 */
const { renderStanding, simTag } = require('./wakePerception');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}
const NO_LEAK = /\d{4,}|LIN-|POP-|HH-|\$|HeritageScore|NetWorth/;

console.log('Test 1: simTag');
assert('cycle 103 → Y2C51', simTag(103) === 'Y2C51');
assert('cycle 52 → Y1C52', simTag(52) === 'Y1C52');
assert('cycle 53 → Y2C1', simTag(53) === 'Y2C1');
assert('bad → empty', simTag('') === '' && simTag(0) === '');

console.log('Test 2: 16-column (pre-engine.156) line — live shape today');
{
  const line16 = { LineageId: 'LIN-00001', FamilyName: 'Corliss', FoundedCycle: '103', Generations: '2', LivingMembers: '4',
    HeritageScore: '16', HeritageTier: 'Founding', TotalNetWorth: '2484454', HomesOwned: '0', BusinessesOwned: '[]' };
  const s = renderStanding({ line: line16, maneuver: null });
  assert('names the family', /the Corliss line/.test(s), s);
  assert('founding phrase', /a founding name — on the books/.test(s), s);
  assert('since tag', /since Y2C51/.test(s), s);
  assert('generations', /2 generations under one name/.test(s), s);
  assert('no tenure/peak claims without the columns', !/held that|once stood/.test(s), s);
  assert('no engine numbers or ids leak', !NO_LEAK.test(s), s);
  assert('no posture line without a maneuver memory', !/Lately you've been/.test(s), s);
}

console.log('Test 3: 23-column line — tenure, peak, holdings');
{
  const line23 = { FamilyName: 'Kelley', FoundedCycle: '103', Generations: '1', HeritageTier: 'Established', HomesOwned: '1',
    BusinessesOwned: '["BIZ-00120","BIZ-00121"]', TenureCycles: '60', TierTenure: '55', PeakTier: 'Prominent', Status: 'active' };
  const s = renderStanding({ line: line23 });
  assert('established phrase', /established — roots deep enough to notice/.test(s), s);
  assert('held for years', /held that for years/.test(s), s);
  assert('peak named', /once stood prominent/.test(s), s);
  assert('holds a home + 2 businesses', /holds a home, 2 businesses/.test(s), s);
  assert('BIZ ids never leak', !/BIZ-/.test(s) && !NO_LEAK.test(s), s);
}

console.log('Test 4: dormant line');
{
  const s = renderStanding({ line: { FamilyName: 'Mezran', FoundedCycle: '103', HeritageTier: '', Status: 'dormant', BusinessesOwned: '[]' } });
  assert('gone quiet', /the name has gone quiet/.test(s), s);
  assert('no tier phrase', !/ledger:/.test(s), s);
}

console.log('Test 5: posture');
{
  assert('hold is silence', renderStanding({ line: null, maneuver: { p: 'hold', g: 'home', a: 40, c: 106 } }) === '');
  const climb = renderStanding({ line: null, maneuver: { p: 'climb', g: 'home', a: 70, c: 106 } });
  assert('climb — the house first', climb === "Lately you've been playing to climb — the house first.", climb);
  const retreat = renderStanding({ line: null, maneuver: { p: 'retreat', g: 'tenure', a: 55, c: 107 } });
  assert('retreat — the name can wait', /pulling in, protecting what you hold — the name to keep can wait\.$/.test(retreat), retreat);
  const both = renderStanding({ line: { FamilyName: 'Keane', FoundedCycle: '103', HeritageTier: 'Established', BusinessesOwned: '[]' }, maneuver: { p: 'retreat', g: 'tenure', a: 55, c: 107 } });
  assert('line then posture, one space apart', /Keane line.*\. Lately you've been pulling in/.test(both), both);
  assert('unknown goal → posture only', renderStanding({ maneuver: { p: 'climb', g: 'zzz' } }) === "Lately you've been playing to climb.");
}

console.log('Test 6: nothing → empty');
assert('null entry', renderStanding(null) === '');
assert('no line, no maneuver', renderStanding({ line: null, maneuver: null }) === '');
assert('line without FamilyName', renderStanding({ line: { LineageId: 'LIN-00009' } }) === '');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
