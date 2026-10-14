/**
 * wakePerception.test.js — engine.147 wake-pack seam: renderStanding is a pure, plain-language
 * render of the family line + the maneuver posture. No engine numbers or ids ever reach the voice.
 *
 * Run: node lib/wakePerception.test.js
 */
const { renderStanding, simTag, renderOwnRecord, livedEventsFrom, renderLivedLine, pickLived, LIVED_CAP_PER_CYCLE } = require('./wakePerception');

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
  // engine.180 (S438): hold claims no posture, but the goal reaches the voice ("what you're playing for")
  const holdLine = renderStanding({ line: null, maneuver: { p: 'hold', g: 'home', a: 40, c: 106 } });
  assert('hold claims no posture', !/climb|pulling in/.test(holdLine), holdLine);
  assert('hold names the goal (engine.180)', /playing for, when the moment comes: the house first/.test(holdLine), holdLine);
  assert('hold with no goal is silence', renderStanding({ line: null, maneuver: { p: 'hold', g: '', a: 40, c: 106 } }) === '');
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

console.log('Test 7: engine.286 R2-6 — the citizen\'s own record, numbers included');
{
  const rent = renderOwnRecord({ record: { tier: 3, income: 48000, netWorth: '12,300', debtLevel: 3,
    home: { type: 'rented', monthly: 2100, householdIncome: 66000, hood: 'Temescal' } } });
  assert('own record: tier, income, savings, debt, rent share', rent === 'Your record — what the city holds on you: Tier 3 of 4 (Tier 1 is the top). Income $48,000 a year. Savings $12,300. Debt level 3 of 6. You rent in Temescal: $2,100 a month in rent, 38% of your household\'s $66,000 a year.', rent);
  const owned = renderOwnRecord({ record: { tier: '', income: 0, netWorth: '', debtLevel: 0,
    home: { type: 'owned', monthly: 3139, householdIncome: 48000, hood: 'Rockridge' } } });
  assert('owner over half is named; blank tier/savings left out', /^Your record — what the city holds on you: No income right now\. No debt\. You own your home in Rockridge: \$3,139 a month on the mortgage, 78% .* — over half\.$/.test(owned), owned);
  assert('nothing held → empty', renderOwnRecord({ record: { tier: '', income: '', netWorth: 'n/a', debtLevel: '', home: null } }) === '' && renderOwnRecord(null) === '');
  assert('the standing line still carries no number', !NO_LEAK.test(renderStanding({ line: { FamilyName: 'Keane', FoundedCycle: '103', HeritageTier: 'Established', BusinessesOwned: '[]' }, maneuver: { p: 'climb', g: 'home', a: 70, c: 107 } })));
}

console.log('Test L: pipeline.73 lived wake — events from the records that prove them');
{
  const LOGH = ['Timestamp', 'POPID', 'Name', 'EventTag', 'EventText', 'Neighborhood', 'Cycle'];
  const log = [LOGH,
    ['Y3C8', 'POP-00892', '', 'Birth', 'welcomed a new child into their family', '', 112],
    ['Y3C8', 'POP-01197', '', 'Birth', 'born to Geneva Zhou in West Oakland', '', 112],
    ['Y3C8', 'POP-00470', '', 'Retirement', 'transitioned into retirement', '', 112],
    ['Y3C8', 'POP-00280', '', 'Promotion', 'Got the nod for the lead role at AC Transit', '', 112],
    ['Y3C8', 'POP-01198', '', 'Promotion', 'Emerged into Tier-4 in Eastlake', '', 112],
    ['Y3C8', 'POP-00897', '', 'LifeEvent-Promotion-Up-M', 'The lead is leaving and told them promotion is theirs', '', 112],
    ['Y3C8', 'POP-00168', '', 'Health', 'nursed a sore back', '', 112],
    ['Y3C8', 'POP-00212', '', 'Recovering', 'finally shook the cold', '', 112],
    ['Y3C6', 'POP-00510', '', 'Retirement', 'stepped back', '', 110],
    ['Y3C7', 'POP-00600', '', 'Death', 'passed away peacefully', '', 111],
    ['Y3C8', 'POP-00700', '', 'Death', 'died after a sudden illness', '', 112],
    ['Y3C8', 'POP-00710', '', 'Death', 'passed away unexpectedly', '', 112],
  ];
  const hospital = [['AdmissionId', 'POPID', 'Name', 'Neighborhood', 'Cause', 'AdmitCycle', 'StatusNow', 'LastTransitionCycle', 'DischargeCycle'],
    ['AdmissionId', 'POPID'],
    ['H-C112-POP-00528', 'POP-00528', 'Deacon Seymour', 'Lake Merritt', 'a workplace accident', 112, 'hospitalized', 112, ''],
    ['H-C106-POP-00801', 'POP-00801', 'Maurice Franklin', 'Rockridge', 'severe seasonal flu', 106, 'active', 111, 111],
    ['H-C100-POP-00194', 'POP-00194', 'Yu Zen', 'Rockridge', 'a workplace accident', 100, 'active', 105, 105]];
  const archive = [['POPID', 'First', 'Last', 'HouseholdId', 'SpouseId', 'ChildrenIds', 'ParentIds'],
    ['POP-00600', 'Ana', 'Ruiz', 'HH-1', 'POP-00601', '', ''],
    ['POP-00700', 'Ben', 'Okafor', 'HH-2', '', 'POP-00703', ''],
    ['POP-00710', 'Cy', 'Lund', '', '', '', '']];
  const ledger = [['POPID', 'HouseholdId', 'Status'], ['POP-00601', 'HH-1', 'Active'], ['POP-00702', 'HH-2', 'Active'], ['POP-00703', 'HH-9', 'Active'], ['POP-00720', '', 'Active'], ['POP-00721', '', 'Deceased']];
  const bonds = [['Timestamp', 'Cycle', 'BondId', 'CitizenA', 'CitizenB', 'BondType', 'Intensity', 'Status'],
    ['', '', 'b1', 'POP-00710', 'POP-00720', 'friend', 4, 'Active'], ['', '', 'b2', 'POP-00721', 'POP-00710', 'friend', 9, 'Active'], ['', '', 'b3', 'POP-00710', 'POP-00799', 'friend', 8, 'Dormant']];
  const ev = livedEventsFrom({ log, hospital, ledger, archive, bonds }, 112);
  const id = (x) => ev.some((e) => e.id === x);
  assert('the parent wakes for a birth; the newborn does not', id('birth:POP-00892:112') && !ev.some((e) => e.subject === 'POP-01197'));
  assert('retirement and a completed promotion are in', id('retirement:POP-00470:112') && id('promotion:POP-00280:112'));
  assert('a tier emergence on the Promotion tag is bookkeeping, not a promotion', !ev.some((e) => e.subject === 'POP-01198'));
  assert('a held promotion break, a sore back and a shaken cold are not', !ev.some((e) => /POP-00897|POP-00168|POP-00212/.test(e.id)));
  assert('outside the window (C110 at C112) is not', !ev.some((e) => e.subject === 'POP-00510'));
  assert('hospital from the ledger: an admission this week, a discharge last week, an old stay not; the repeated header row is skipped',
    id('hospital:POP-00528:112:in') && id('hospital:POP-00801:111:out') && !ev.some((e) => e.subject === 'POP-00194') && ev.filter((e) => e.kind === 'hospital').length === 2, JSON.stringify(ev.filter((e) => e.kind === 'hospital').map((e) => e.id)));
  const d = (s) => ev.find((e) => e.id.startsWith('death:' + s));
  assert('death → the living spouse first', d('POP-00600') && d('POP-00600').recipient === 'POP-00601' && d('POP-00600').relation === 'spouse');
  assert('no spouse → the household before a child elsewhere', d('POP-00700') && d('POP-00700').recipient === 'POP-00702' && d('POP-00700').relation === 'household');
  assert('no family → the strongest active bond to a living citizen (deceased and dormant bonds skipped)', d('POP-00710') && d('POP-00710').recipient === 'POP-00720' && d('POP-00710').relation === 'bond');
  const lines = ev.map((e) => renderLivedLine(e, 112));
  assert('the voice line names the event in plain words, no ids or numbers', lines.every((l) => l && !NO_LEAK.test(l) && !/\d/.test(l)), JSON.stringify(lines));
  assert('this week / last week follows the event\'s Cycle', /^This week, Ana Ruiz|^Last week, Ana Ruiz/.test(renderLivedLine(d('POP-00600'), 112)) && /^Last week/.test(renderLivedLine(d('POP-00600'), 112)) && /^This week you were admitted to the hospital after a workplace accident$/.test(renderLivedLine(ev.find((e) => e.id === 'hospital:POP-00528:112:in'), 112)));

  const P = (popId, birthYear, hh) => ({ popId, birthYear, householdIdRaw: hh || '', livedOnly: true });
  const pool = [P('POP-00892', 1990, 'HH-5'), P('POP-00470', 1960), P('POP-00280', 1980), P('POP-00528', 1975), P('POP-00801', 1985), P('POP-00601', 1950), P('POP-00702', 2030), P('POP-00720', '')];
  const pick = (st) => { const r = pickLived(ev, pool, st, 112, 2042); return r && r.event.id; };
  assert('death before hospital before birth; older Cycle first in a kind', pick({}) === 'death:POP-00600:111', pick({}));
  assert('a recipient under 16 and one with no BirthYear are skipped', pick({ livedSpent: { 'death:POP-00600:111': 112 } }) === 'hospital:POP-00801:111:out', pick({ livedSpent: { 'death:POP-00600:111': 112 } }));
  const allSpentBut = (keep) => ({ livedSpent: Object.fromEntries(ev.filter((e) => e.id !== keep).map((e) => [e.id, 112])) });
  assert('a spent event never wakes twice', pick(allSpentBut('promotion:POP-00280:112')) === 'promotion:POP-00280:112' && pick({ livedSpent: Object.fromEntries(ev.map((e) => [e.id, 112])) }) === null);
  assert('the Cycle cap stops the slot', pick({ livedCount: { 112: LIVED_CAP_PER_CYCLE } }) === null && pick({ livedCount: { 112: LIVED_CAP_PER_CYCLE - 1 } }) !== null);
  const twins = [{ id: 'birth:POP-1:112', kind: 'birth', cycle: 112, recipient: 'POP-00001' }, { id: 'birth:POP-2:112', kind: 'birth', cycle: 112, recipient: 'POP-00002' }];
  const hp = [P('POP-00001', 1990, 'HH-7'), P('POP-00002', 1991, 'HH-7')];
  const first = pickLived(twins, hp, {}, 112, 2042);
  assert('one birth per non-blank household', first && pickLived(twins, hp, { livedSpent: {} }, 112, 2042).event.id === first.event.id && first.event.id === 'birth:POP-1:112');
  const solo = [P('POP-00001', 1990, ''), P('POP-00002', 1991, '')];
  assert('blank households are not collapsed into one', pickLived(twins, solo, { livedSpent: { 'birth:POP-1:112': 112 } }, 112, 2042).event.id === 'birth:POP-2:112');
  assert('no cycle → no events', livedEventsFrom({ log }, null).length === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
