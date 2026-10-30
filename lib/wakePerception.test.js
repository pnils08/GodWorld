/**
 * wakePerception.test.js — engine.147 wake-pack seam: renderStanding is a pure, plain-language
 * render of the family line + the maneuver posture. No engine numbers or ids ever reach the voice.
 *
 * Run: node lib/wakePerception.test.js
 */
const { renderStanding, simTag, renderOwnRecord, livedEventsFrom, renderLivedLine, livedFor, livedSpentKey, recordLivedSpend, selectWakeCitizen, wakeSeedKey,
  centralClock, planNightlyIntake, nightlyIntakeRow, validNightlyRow, spoolNightlyRow, withFileLock, flushNightlySpool } = require('./wakePerception');

const fs = require('fs');
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
    id('hospital:H-C112-POP-00528:112:in') && id('hospital:H-C106-POP-00801:111:out') && !ev.some((e) => e.subject === 'POP-00194') && ev.filter((e) => e.kind === 'hospital').length === 2, JSON.stringify(ev.filter((e) => e.kind === 'hospital').map((e) => e.id)));
  const d = (s) => ev.find((e) => e.id.startsWith('death:' + s));
  const order = (s) => (d(s) ? d(s).recipients.map((r) => r.pop + '/' + r.rel).join(' ') : '');
  assert('death → spouse first, then the rest of the household', order('POP-00600') === 'POP-00601/spouse', order('POP-00600'));
  assert('no spouse → household, then a child elsewhere', order('POP-00700') === 'POP-00702/household POP-00703/parent', order('POP-00700'));
  assert('no family → active bonds by intensity, to living citizens only (deceased and dormant skipped)', order('POP-00710') === 'POP-00720/bond', order('POP-00710'));
  const selfLog = [LOGH, ['Y3C8', 'POP-00730', '', 'Death', 'passed away', '', 112]];
  const selfEv = livedEventsFrom({ log: selfLog, archive: [['POPID', 'First', 'Last', 'HouseholdId'], ['POP-00730', 'Dee', 'Self', 'HH-3']], ledger: [['POPID', 'HouseholdId', 'Status'], ['POP-00730', 'HH-3', 'Active'], ['POP-00731', 'HH-3', 'Active']], bonds: [] }, 112);
  assert('the deceased is never their own survivor, even on a contradictory still-active row', selfEv[0] && selfEv[0].recipients.map((r) => r.pop).join() === 'POP-00731', JSON.stringify(selfEv));
  const lines = ev.map((e) => renderLivedLine(e, 112));
  assert('the voice line is a fixed sentence per kind: no ids, no numbers', lines.every((l) => l && !NO_LEAK.test(l) && !/\d/.test(l)), JSON.stringify(lines));
  assert('first person, not the writer\'s "their family"', renderLivedLine(ev.find((e) => e.kind === 'birth'), 112) === 'This week you welcomed a new child into your family');
  assert('a promotion line drops the writer\'s "after 14 years"', renderLivedLine({ kind: 'promotion', cycle: 112, text: 'Got the nod after 14 years' }, 112) === 'This week you were promoted at work');
  assert('this week / last week follows the event\'s Cycle; relation from the survivor picked',
    renderLivedLine(d('POP-00600'), 112, 'spouse') === 'Last week, Ana Ruiz, your spouse, died' && renderLivedLine(ev.find((e) => e.id === 'hospital:H-C112-POP-00528:112:in'), 112) === 'This week you were admitted to the hospital after a workplace accident');
  assert('a cause that is not plain prose is dropped, not voiced', renderLivedLine({ kind: 'hospital', phase: 'admitted', cycle: 112, cause: 'HC-0042 trauma' }, 112) === 'This week you were admitted to the hospital');

  // engine.197 — lived events are perception for whoever the lottery draws, spent per recipient
  const lf = (pop, st) => { const r = livedFor(pop, ev, st); return r && (r.event.id + '/' + r.rel); };
  assert('a drawn survivor gets the death, with the relation', lf('POP-00601', {}) === 'death:POP-00600:111/spouse', lf('POP-00601', {}));
  assert('every survivor of one death perceives it — no household collapse', lf('POP-00702', {}) === 'death:POP-00700:112/household' && lf('POP-00703', {}) === 'death:POP-00700:112/parent');
  assert('no age rule: a 12-year-old survivor perceives it too', lf('POP-00702', {}) !== null);
  assert('a citizen with no event → null', livedFor('POP-09999', ev, {}) === null);
  const k = livedSpentKey('death:POP-00700:112', 'POP-00702');
  assert('spent for one recipient only', lf('POP-00702', { livedSpent: { [k]: 112 } }) === null && lf('POP-00703', { livedSpent: { [k]: 112 } }) === 'death:POP-00700:112/parent');
  assert('a bare receipt from the retired slot counts as spent for every recipient', lf('POP-00703', { livedSpent: { 'death:POP-00700:112': 112 } }) === null);
  const stS = { recent: ['POP-1'], livedCount: { 112: 3 }, livedSpent: { 'old:POP-1:100': 100, 'death:POP-00600:111': 111 } };
  const spent = recordLivedSpend(stS, livedFor('POP-00703', ev, stS), 'pop-00703', 112);
  assert('the wake spends eventId:POPID with the Cycle as value', spent === 'death:POP-00700:112:POP-00703' && stS.livedSpent[spent] === 112, spent);
  assert('then that recipient perceives nothing more from it; the next survivor still does', lf('POP-00703', stS) === null && lf('POP-00702', stS) === 'death:POP-00700:112/household');
  assert('old receipts age out past 3 Cycles; recent + livedCount dropped', !('old:POP-1:100' in stS.livedSpent) && ('death:POP-00600:111' in stS.livedSpent) && !('recent' in stS) && !('livedCount' in stS));
  const stN = { recent: ['x'] };
  assert('no event → nothing spent, retired state still dropped', recordLivedSpend(stN, null, 'POP-1', 112) === null && !('recent' in stN) && !stN.livedSpent);
  const two = [{ id: 'retirement:POP-00050:111', kind: 'retirement', cycle: 111, recipients: [{ pop: 'POP-00050', rel: 'self' }] },
    { id: 'promotion:POP-00050:112', kind: 'promotion', cycle: 112, recipients: [{ pop: 'POP-00050', rel: 'self' }] }];
  assert('newest Cycle first, then the older one once spent', livedFor('POP-00050', two, {}).event.id === 'promotion:POP-00050:112'
    && livedFor('POP-00050', two, { livedSpent: { [livedSpentKey('promotion:POP-00050:112', 'POP-00050')]: 112 } }).event.id === 'retirement:POP-00050:111');
  const dupLog = [LOGH, ['Y3C8', 'POP-00280', '', 'Promotion', 'Promoted', '', 112], ['Y3C8', 'POP-00280', '', 'Promotion', 'Promoted again', '', 112]];
  assert('two same-kind events for one citizen in one Cycle keep two receipts', livedEventsFrom({ log: dupLog }, 112).map((e) => e.id).join() === 'promotion:POP-00280:112,promotion:POP-00280:112#2');
  assert('no cycle → no events', livedEventsFrom({ log }, null).length === 0);
}

console.log('Test S: engine.197 — one lottery over the whole pool');
{
  const pool = [];
  for (let i = 0; i < 400; i++) pool.push({ popId: 'POP-' + String(i).padStart(5, '0'), eventMag: i < 4 ? 14 : 0 });
  const draw = (key) => selectWakeCitizen(pool, { seedKey: key });
  const days = []; for (let d = 1; d <= 28; d++) days.push('2026-10-' + String(d).padStart(2, '0'));
  const picks = days.map((d) => draw(wakeSeedKey(112, 'morning', d)).c.popId);
  assert('same key → same pick', draw(wakeSeedKey(112, 'morning', '2026-10-18')).c.popId === draw(wakeSeedKey(112, 'morning', '2026-10-18')).c.popId);
  assert('the seed carries the date: one Cycle\'s mornings do not all draw one citizen', new Set(picks).size > 20, String(new Set(picks).size));
  assert('every draw is a rotation pick — no slot precedence', days.every((d) => draw(wakeSeedKey(112, 'night', d)).slot === 'rotation'));
  let heavy = 0, n = 0;
  for (let c = 100; c < 160; c++) for (const w of ['morning', 'midday', 'night']) for (const d of days.slice(0, 7)) { n++; if (Number(draw(wakeSeedKey(c, w, d)).c.popId.slice(4)) < 4) heavy++; }
  // weights: 4 × 29 vs 396 × 1 → expected heavy share 116 / 512 ≈ 0.23
  assert('weight is 1 + 2·eventMag (heavy share near 0.23)', heavy / n > 0.17 && heavy / n < 0.29, (heavy / n).toFixed(3));
  const reached = new Set(); for (let c = 0; c < 3000; c++) reached.add(draw(wakeSeedKey(c, 'midday', 'x')).c.popId);
  assert('quiet citizens are reachable (no recent lockout, no floor)', [...reached].filter((p) => Number(p.slice(4)) >= 4).length > 300, String(reached.size));
  assert('a forced POPID in the pool wins', selectWakeCitizen(pool, { forcePop: 'pop-00123', seedKey: 'k' }).c.popId === 'POP-00123' && selectWakeCitizen(pool, { forcePop: 'POP-00123', seedKey: 'k' }).slot === 'forced');
  assert('a forced POPID not in the pool falls to the draw', selectWakeCitizen(pool, { forcePop: 'POP-99999', seedKey: 'k' }).slot === 'rotation');
  assert('empty pool → null', selectWakeCitizen([], { seedKey: 'k' }) === null);
  assert('no deviation term: identical eventMag, wildly different dials, same odds input', (() => {
    const a = [{ popId: 'A', eventMag: 0, cur: { drive: 100 } }, { popId: 'B', eventMag: 0, cur: { drive: 50 } }];
    let ca = 0; for (let c = 0; c < 2000; c++) if (selectWakeCitizen(a, { seedKey: 'd' + c }).c.popId === 'A') ca++;
    return ca > 850 && ca < 1150;
  })());
}

console.log('Test O: pipeline.93 — owed responses');
{
  const { lifeTailOf, chaosOutcomeIndex, owedFrom, owedCandidates, owedFor, owedLivedPrefer, owedShown, owedShownSet, owedWakesUsed, owedStateFrom, owedJournalLine, owedPageKey, wakeAdmission, OWED_RESERVE, OWED_WINDOW } = require('./wakePerception');
  const { VEHICLE_CONFIGS } = require('../utilities/chaosCarsConfig');
  const idx = chaosOutcomeIndex(VEHICLE_CONFIGS);
  const hi = Object.entries(idx).filter(([, v]) => v.severity === 'high' && v.tag).map(([k]) => k.split('|')[1]).sort();
  assert('the config\'s high-severity citizen outcomes are the ruled list', JSON.stringify(hi) === JSON.stringify(['arrested', 'deescalated', 'mail_theft_reported', 'medical_emergency', 'substance_intervention', 'workplace_accident']), hi.join(','));
  assert('reserve is the ruled 6 a Cycle; window is 2 Cycles', OWED_RESERVE === 6 && OWED_WINDOW === 2);

  const chaos = [['CycleId', 'EventId', 'VehicleType', 'TargetScope', 'TargetId', 'TargetTier', 'DiceOutcome', 'PrimaryMetric'],
    [113, 'E1', 'ambulance', 'citizen', 'pop-00001', 3, 'medical_emergency', 'Critical'],
    [113, 'E2', 'bart_train', 'citizen', 'POP-00002', 3, 'medical_hold_on_board', 'Friction'],
    [113, 'E3', 'mail_truck', 'business', 'BIZ-00001', '', 'lost_contract_notice', 'Growth_Rate'],
    [112, 'E4', 'cop_car', 'citizen', 'POP-00003', 3, 'arrested', 'Transgression-Serious'],
    [111, 'E5', 'cop_car', 'citizen', 'POP-00004', 3, 'arrested', 'Transgression-Serious'],
    [114, 'E6', 'cop_car', 'citizen', 'POP-00005', 3, 'arrested', 'Transgression-Serious'],
    [113, 'E7', 'no_such_car', 'citizen', 'POP-00006', 3, 'nothing', 'X'],
    [113, 'E8', 'street_sweeper', 'citizen', 'POP-00007', 3, 'parking_ticket', 'Setback']];
  const casino = [['WagerId', 'CyclePlaced', 'CycleSettled', 'POPID', 'HouseholdId', 'MarketFamily', 'MarketId', 'EventId', 'Side', 'Stake', 'Odds', 'Payout', 'Status'],
    ['HOUSE', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['W1', 112, 113, 'POP-00010', '', 'sports', '', '', '', 1001, '1.8', 0, 'settled-loss'],
    ['W2', 112, 113, 'POP-00011', '', 'sports', '', '', '', 1000, '1.8', 0, 'settled-loss'],
    ['W3', 112, 113, 'POP-00012', '', 'undocked', '', '', '', 400, '2.3', 901, 'settled-win'],
    ['W4', 112, 113, 'POP-00013', '', 'undocked', '', '', '', 400, '2.25', 900, 'settled-win'],
    ['W5', 112, 113, 'POP-00014', '', 'sports', '', '', '', 2000, '1.8', 0, 'void-gate'],
    ['W6', 113, '', 'POP-00015', '', 'sports', '', '', '', 2000, '1.8', 0, 'open']];
  const hospital = [['AdmissionId', 'POPID', 'Name', 'Neighborhood', 'Cause', 'AdmitCycle'], ['H1', 'POP-00020', '', '', 'a fall', 113], ['H0', 'POP-00021', '', '', 'a fall', 105]];
  const judicial = [['CaseId', 'POPID', 'EntryType', 'OpenCycle', 'ArrestCycle', 'SourceSystem'], ['J1', 'POP-00030', 'arrest', 113, 113, 'chaos'], ['J2', 'POP-00031', 'divorce', 113, '', 'civil']];
  const { owed, skipped } = owedFrom({ chaos, casino, hospital, judicial }, 113, idx);
  const ids = owed.map((e) => e.id).sort();
  assert('owed = high + low chaos on citizens in the window, casino over the bars, admissions, arrests', JSON.stringify(ids) ===
    JSON.stringify(['casino:W1', 'casino:W3', 'chaos:E1', 'chaos:E2', 'chaos:E4', 'chaos:E8', 'hospital:H1', 'judicial:J1']), ids.join(','));
  assert('tiers: high chaos and the ruled classes 1, low chaos 2', owed.filter((e) => e.tier === 2).map((e) => e.id).sort().join(',') === 'chaos:E2,chaos:E8');
  assert('an outcome the config does not know is skipped out loud', skipped.length === 1 && /E7/.test(skipped[0]), skipped.join('|'));
  assert('a wager at the bar, a 500 net win, a voided or open slip do not owe', !ids.some((i) => /W2|W4|W5|W6/.test(i)));
  assert('a civil case with no arrest does not owe; a lapsed or future hit does not owe', !ids.some((i) => /J2|E5|E6|H0/.test(i)));
  assert('POPIDs fold to upper case', owed.find((e) => e.id === 'chaos:E1').pop === 'POP-00001');
  const e8 = owed.find((e) => e.id === 'chaos:E8');
  assert('the chaos pin is the line the engine wrote (live POP-00494 C113 shape)', e8.pin.stamp === 'Y3C9' && e8.pin.body === '[Setback] Street sweeper: parking ticket.', JSON.stringify(e8.pin));

  // each citizen's own life lines, in the engine writers' shapes (chaosEventText_, casinoLine_)
  const LINES = {
    'POP-00001': ['Y3C9 — [Critical] Ambulance: medical emergency.'],
    'POP-00002': ['Y3C9 — [Friction] BART train: medical hold on board.'],
    'POP-00003': ['Y3C8 — [Transgression-Serious] Cop car: arrested.', 'Y3C9 — [Casino] the slip came back empty'],
    'POP-00010': ['Y3C9 — [Casino] the slip came back empty'],
    'POP-00012': ['Y3C9 — [Casino] the window paid — the week changed color'],
    'POP-00020': ['Y3C9 — [Health] a fall on the stairs'],
    'POP-00007': ['Y3C9 — [Setback] Street sweeper: parking ticket.'],
  };
  const pool = [['POP-00001', 5], ['POP-00002', 0], ['POP-00003', 9], ['POP-00010', 1], ['POP-00012', 1], ['POP-00020', 2], ['POP-00007', 0]]
    .map(([popId, eventMag]) => ({ popId, eventMag, lifeLines: LINES[popId] }));
  const livedH1 = [{ id: 'hospital:H1:113:in', kind: 'hospital', cycle: 113, subject: 'POP-00020', recipients: [{ pop: 'POP-00020', rel: 'self' }], phase: 'admitted', cause: 'a fall' }];
  const oc = owedCandidates(pool, owed, {}, livedH1);
  assert('ranked by the citizen\'s own eventMag, then newest, then id', oc.ready.map((e) => e.pop).join(',') === 'POP-00003,POP-00001,POP-00020,POP-00010,POP-00012', oc.ready.map((e) => e.pop).join(','));
  assert('an owed citizen outside the pool is reported, not dropped', oc.notInPool.map((e) => e.id).join(',') === 'judicial:J1');
  const allSpent = {}; owed.filter((e) => e.tier === 1).forEach((e) => { (allSpent.owedSpent = allSpent.owedSpent || {})[e.id] = 113; });
  const oc2 = owedCandidates(pool, owed, allSpent, livedH1);
  assert('a Cycle where a severe event fired never absorbs its low ones, even once all are reached', oc2.ready.length === 0 && oc2.severeCycles.join(',') === '112,113');
  const oc3 = owedCandidates(pool, owed.filter((e) => e.tier === 2), {});
  assert('no severe event → the low citizen hits take the reserved wakes', oc3.ready.map((e) => e.pop).sort().join(',') === 'POP-00002,POP-00007');
  const lastWeek = owed.filter((e) => e.tier === 2 || e.cycle === 112);
  const oc4 = owedCandidates(pool, lastWeek, {}, livedH1);
  assert('absorption is per Cycle: a severe hit last Cycle does not block this Cycle\'s low ones, and ranks first', oc4.ready.map((e) => e.pop).join(',') === 'POP-00003,POP-00002,POP-00007', oc4.ready.map((e) => e.pop).join(','));
  const twice = owedCandidates(pool, owed.concat([{ id: 'casino:WX', pop: 'POP-00003', kind: 'casino', tier: 1, cycle: 113,
    pin: { stamp: 'Y3C9', re: /^\[(Casino|Setback)\] the (slip came back empty|window took the last of it)/ } }]), {}, livedH1);
  assert('two events on one citizen hold one place', twice.ready.filter((e) => e.pop === 'POP-00003').length === 1);

  const big = []; for (let i = 0; i < 300; i++) big.push({ popId: 'POP-' + String(i + 100).padStart(5, '0'), eventMag: 0 });
  const bigPool = big.concat(pool);
  const plain = (k) => selectWakeCitizen(bigPool, { seedKey: k }).c.popId;
  assert('reserve 0 → the old draw, owed list ignored', ['a', 'b', 'c', 'd', 'e'].every((k) => {
    const p = selectWakeCitizen(bigPool, { seedKey: k, owedReady: oc.ready, owedReserve: 0, owedUsed: 0 });
    return p.slot === 'rotation' && p.c.popId === plain(k);
  }));
  const sel = selectWakeCitizen(bigPool, { seedKey: 'a', owedReady: oc.ready, owedReserve: 6, owedUsed: 0 });
  assert('reserve open → the top owed citizen, slot owed', sel.slot === 'owed' && sel.c.popId === 'POP-00003');
  assert('reserve used up → back to the draw', selectWakeCitizen(bigPool, { seedKey: 'a', owedReady: oc.ready, owedReserve: 6, owedUsed: 6 }).slot === 'rotation');
  assert('a forced POPID beats the owed slot', selectWakeCitizen(bigPool, { forcePop: 'POP-00150', seedKey: 'a', owedReady: oc.ready, owedReserve: 6, owedUsed: 0 }).slot === 'forced');

  // codex re-review F4 — receipts are a two-phase journal: pending before the page, then shown or failed
  const J = (o) => owedJournalLine(o);
  const jl = [
    J({ key: 'k1', cycle: 113, pop: 'POP-00001', slot: 'owed', ids: owed.filter((e) => e.pop === 'POP-00001'), status: 'pending' }),
    J({ key: 'k1', cycle: 113, pop: 'POP-00001', slot: 'owed', ids: ['chaos:E1'], status: 'shown' }),
    J({ key: 'k2', cycle: 113, pop: 'POP-00003', slot: 'rotation', ids: ['chaos:E4'], status: 'pending' }),
    J({ key: 'k2', cycle: 113, pop: 'POP-00003', slot: 'rotation', ids: ['chaos:E4'], status: 'shown' }),
    J({ key: 'k3', cycle: 113, pop: 'POP-00010', slot: 'owed', ids: ['casino:W1'], status: 'pending' }),
    J({ key: 'k4', cycle: 113, pop: 'POP-00012', slot: 'owed', ids: ['casino:W3'], status: 'pending' }),
    J({ key: 'k0', cycle: 111, pop: 'POP-00020', slot: 'owed', ids: ['hospital:H1'], status: 'shown' })].join('');
  assert('the journal line carries ids, never whole events', JSON.parse(jl.split('\n')[0]).ids.join(',') === 'chaos:E1');
  const js = owedStateFrom(jl, 113);
  assert('owedFor = the woken citizen\'s unspent events', owedFor('pop-00001', owed, {}).length === 1 && owedFor('pop-00001', owed, {})[0].id === 'chaos:E1');
  assert('shown → spent; an owed slot counts one reserved wake, a rotation wake none', owedFor('POP-00001', owed, js).length === 0 && owedFor('POP-00003', owed, js).length === 0 && js.owedWakes[113] === 3);
  assert('round 3 F2: pending alone (a page error, or a crash) → spent, counted, reported unconfirmed — never re-owed',
    owedFor('POP-00010', owed, js).length === 0 && !!js.owedSpent['casino:W3'] && js.unconfirmed.sort().join(',') === 'k3,k4');
  assert('only the window is read: nothing ages, an old Cycle is simply not counted', !js.owedSpent['hospital:H1'] && !js.owedWakes[111]);
  const e0 = owedStateFrom('', 113);
  assert('an empty or missing journal is an empty state', JSON.stringify([e0.owedSpent, e0.owedWakes, e0.unconfirmed]) === '[{},{},[]]' && e0.pageKeys.size === 0);

  // codex round 5 — the page key is citizen + Cycle + daypart, with no date (citizenPage customId)
  const pk = owedPageKey('pop-00001', 113, 'morning');
  const day1 = wakeSeedKey(113, 'morning', '2026-10-29') + '|POP-00001|2026-10-29T12:30:00.000Z';
  const jr = J({ key: day1, page: pk, cycle: 113, pop: 'POP-00001', slot: 'rotation', ids: [], status: 'pending' })
    + J({ key: day1, page: pk, cycle: 113, pop: 'POP-00001', slot: 'rotation', ids: [], status: 'shown' });
  assert('round 5: a morning wake on another day of the same Cycle sees the page key taken', owedStateFrom(jr, 113).pageKeys.has(owedPageKey('POP-00001', 113, 'morning')));
  assert('round 5: another daypart, citizen or Cycle is a different page key', !owedStateFrom(jr, 113).pageKeys.has(owedPageKey('POP-00001', 113, 'midday'))
    && !owedStateFrom(jr, 113).pageKeys.has(owedPageKey('POP-00002', 113, 'morning')) && !owedStateFrom(jr, 114).pageKeys.has(owedPageKey('POP-00001', 114, 'morning')));
  assert('round 5: the page key is built from the same three parts as the page customId', /^POP-00001\|c113\|morning$/.test(pk));
  assert('round 4: a journaled wake with nothing owed spends nothing and counts no reserved wake', JSON.stringify(owedStateFrom(jr, 113).owedSpent) === '{}' && !owedStateFrom(jr, 113).owedWakes[113]);
  assert('round 4: owed on, lock taken → owed; lock held elsewhere → the wake does not run', wakeAdmission({ owedRes: 6, dry: false, lockTaken: true }) === 'owed'
    && wakeAdmission({ owedRes: 6, dry: false, lockTaken: false }) === 'skip');
  assert('round 4: owed off, or a dry run → the plain wake, no lock asked', wakeAdmission({ owedRes: 0, dry: false, lockTaken: false }) === 'plain' && wakeAdmission({ owedRes: 6, dry: true, lockTaken: false }) === 'plain');
  assert('an unreadable journal line throws (the wake holds owed, loudly)', (() => { try { owedStateFrom(jl + '{"key":"k5","cyc\n', 113); return false; } catch (e) { return /unreadable line/.test(e.message); } })());
  assert('an owed slot counts its wake even if nothing was shown', owedStateFrom(J({ key: 'k9', cycle: 113, pop: 'P', slot: 'owed', ids: [], status: 'shown' }), 113).owedWakes[113] === 1);

  // codex F1 — a hospital mark is shown only by its own admission line, preferred over a newer lived event
  const livedTwo = [
    { id: 'hospital:H9:112:in', kind: 'hospital', cycle: 112, subject: 'POP-00040', recipients: [{ pop: 'POP-00040', rel: 'self' }], phase: 'admitted', cause: 'a fall' },
    { id: 'birth:POP-00040:113', kind: 'birth', cycle: 113, subject: 'POP-00040', recipients: [{ pop: 'POP-00040', rel: 'self' }] }];
  const h9 = { id: 'hospital:H9', pop: 'POP-00040', kind: 'hospital', tier: 1, cycle: 112, pin: null };
  assert('F1: unpreferred, the newer birth wins the lived line', livedFor('POP-00040', livedTwo, {}).event.kind === 'birth');
  const pickH = livedFor('POP-00040', livedTwo, {}, owedLivedPrefer(h9));
  assert('F1: preferred, the owed admission is the lived line and counts as shown', pickH.event.id === 'hospital:H9:112:in' && owedShown(h9, '', pickH));
  assert('F1: the birth as the lived line does not count as showing the admission', !owedShown(h9, '', livedFor('POP-00040', livedTwo, {})));
  const p40 = [{ popId: 'POP-00040', eventMag: 1, lifeLines: [] }];
  assert('F1: no lived admission (read failed or spent) → not reserved, reported', (() => {
    const a = owedCandidates(p40, [h9], {}, []);
    const b = owedCandidates(p40, [h9], { livedSpent: { 'hospital:H9:112:in:POP-00040': 112 } }, livedTwo);
    return a.ready.length === 0 && a.unshowable.length === 1 && b.ready.length === 0 && b.unshowable.length === 1;
  })());

  // codex F2 — a big loss and a small win in one Cycle: the loss pins the loss line, never the win's
  const f2 = owedFrom({ casino: [casino[0],
    ['W7', 112, 113, 'POP-00050', '', 'sports', '', '', '', 1200, '1.8', 0, 'settled-loss'],
    ['W8', 112, 113, 'POP-00050', '', 'sports', '', '', '', 50, '3', 150, 'settled-win']] }, 113, idx).owed;
  const f2Lines = ['Y3C9 — [Casino] the slip came back empty', 'Y3C9 — [Neighborhood] a', 'Y3C9 — [Neighborhood] b', 'Y3C9 — [Neighborhood] c',
    'Y3C9 — [Neighborhood] d', 'Y3C9 — [Neighborhood] e', 'Y3C9 — [Casino] the window paid — the week changed color'];
  const f2Block = lifeTailOf(f2Lines, f2.map((e) => e.pin));
  assert('F2: only the over-bar loss owes', f2.length === 1 && f2[0].id === 'casino:W7');
  assert('F2: the loss pin keeps the loss line and is shown', f2Block.includes('the slip came back empty') && owedShown(f2[0], f2Block, null));
  assert('F2: the loss pin cannot be satisfied by a win line', !owedShown(f2[0], 'Y3C9 — [Casino] the window paid — the week changed color', null));
  assert('F2: the Setback loss variants count as the loss', owedShown(f2[0], 'Y3C9 — [Setback] the window took the last of it — borrowed to walk home', null)
    && owedShown(f2[0], 'Y3C9 — [Setback] the slip came back empty — and it was most of what there was', null));

  // codex F3 — a reconcile row is not a new arrest; an arrest with no Transgression line is not reserved
  const f3 = owedFrom({ judicial: [['CaseId', 'POPID', 'ArrestCycle', 'SourceSystem'], ['J8', 'POP-00060', 113, 'reconcile'], ['J9', 'POP-00061', 113, 'chaos']] }, 113, idx);
  assert('F3: the reconcile row is skipped out loud, the real arrest owes', f3.owed.map((e) => e.id).join(',') === 'judicial:J9' && /J8.*reconcile/.test(f3.skipped.join('|')));
  const f3h = owedFrom({ judicial: [['CaseId', 'POPID', 'ArrestCycle'], ['J-REC', 'POP-00062', 113]] }, 113, idx);
  assert('re-review F3: a court tab without SourceSystem owes nothing, is reported, and counts as unknown', f3h.owed.length === 0 && /Judicial_Ledger: no SourceSystem/.test(f3h.skipped.join('|')) && f3h.unknownTabs.includes('Judicial_Ledger'));
  const f3c = owedCandidates([{ popId: 'POP-00061', eventMag: 1, lifeLines: ['Y3C9 — [Money] the fine came due'] }], f3.owed, {}, []);
  assert('F3: no arrest line in their history → not reserved, reported', f3c.ready.length === 0 && f3c.unshowable.length === 1);

  // codex F4 — six events on one citizen: five fit the block, only those five are shown (and spent)
  const six = [0, 1, 2, 3, 4, 5].map((i) => ({ id: 'chaos:S' + i, pop: 'POP-00070', kind: 'chaos', tier: 1, cycle: 113, pin: { stamp: 'Y3C9', body: `[Setback] Cop car: hit ${i}.` } }));
  const sixBlock = lifeTailOf(six.map((e) => 'Y3C9 — ' + e.pin.body), six.map((e) => e.pin));
  const sixShown = six.filter((e) => owedShown(e, sixBlock, null));
  assert('F4: only the events that made the block count as shown; the rest stay owed', sixShown.length === 5 && !sixShown.includes(six[0]));

  // codex re-review F1 — one line never stands for two events: each claims its own occurrence
  const two = owedFrom({ casino: [casino[0],
    ['W10', 112, 113, 'POP-00090', '', 'sports', '', '', '', 1500, '1.8', 0, 'settled-loss'],
    ['W11', 112, 113, 'POP-00090', '', 'sports', '', '', '', 2000, '1.8', 0, 'settled-loss']] }, 113, idx).owed;
  assert('re-review F1: two over-bar losses, one loss line visible → one shown, one stays owed',
    owedShownSet(two, 'Y3C9 — [Casino] the slip came back empty\nY3C9 — [Neighborhood] a', null).length === 1);
  assert('re-review F1: two loss lines visible → both shown',
    owedShownSet(two, 'Y3C9 — [Casino] the slip came back empty\nY3C9 — [Setback] the slip came back empty — and it was most of what there was', null).length === 2);
  const twoLines = ['Y3C9 — [Casino] the slip came back empty', 'Y3C9 — [Setback] the window took the last of it — borrowed to walk home',
    'Y3C9 — [Neighborhood] a', 'Y3C9 — [Neighborhood] b', 'Y3C9 — [Neighborhood] c', 'Y3C9 — [Neighborhood] d', 'Y3C9 — [Neighborhood] e'];
  assert('re-review F1: two same-pattern pins keep two different lines', owedShownSet(two, lifeTailOf(twoLines, two.map((e) => e.pin)), null).length === 2);
  const sameLines = ['Y3C9 — [Casino] the slip came back empty', 'Y3C9 — [Casino] the slip came back empty',
    'Y3C9 — [Neighborhood] a', 'Y3C9 — [Neighborhood] b', 'Y3C9 — [Neighborhood] c', 'Y3C9 — [Neighborhood] d', 'Y3C9 — [Neighborhood] e'];
  const sameBlock = lifeTailOf(sameLines, two.map((e) => e.pin));
  assert('round 3 F1: two identical loss lines both survive pinning, so both losses are shown',
    sameBlock.split('\n').filter((l) => /slip came back empty/.test(l)).length === 2 && owedShownSet(two, sameBlock, null).length === 2, sameBlock.replace(/\n/g, ' / '));
  const exactAndRe = [{ id: 'chaos:X', pop: 'P', kind: 'chaos', tier: 1, cycle: 113, pin: { stamp: 'Y3C9', body: '[Transgression-Serious] Cop car: arrested.' } },
    { id: 'judicial:X', pop: 'P', kind: 'judicial', tier: 1, cycle: 113, pin: { stamp: 'Y3C9', re: /^\[Transgression-/ } }];
  assert('re-review F1: an exact chaos pin claims its line first; the arrest pattern cannot reuse it',
    owedShownSet(exactAndRe, 'Y3C9 — [Transgression-Serious] Cop car: arrested.', null).map((e) => e.id).join(',') === 'chaos:X');

  // codex re-review F2 — an unread listed tab holds absorption: unknown is not zero
  const lowOnly = owedFrom({ chaos, hospital: [hospital[0]], judicial: [judicial[0]] }, 113, idx);
  assert('re-review F2: Casino_Ledger unread → reported unknown', lowOnly.unknownTabs.join(',') === 'Casino_Ledger');
  const lowPool = [{ popId: 'POP-00002', eventMag: 0, lifeLines: LINES['POP-00002'] }];
  const lowEvents = lowOnly.owed.filter((e) => e.tier === 2);
  assert('re-review F2: absorption held → the low hit waits', owedCandidates(lowPool, lowEvents, {}, [], { absorb: false }).ready.length === 0);
  assert('re-review F2: every listed tab read and quiet → the low hit absorbs', owedCandidates(lowPool, lowEvents, {}, [], { absorb: true }).ready.length === 1
    && owedFrom({ chaos, casino: [casino[0]], hospital: [hospital[0]], judicial: [judicial[0]] }, 113, idx).unknownTabs.length === 0);

  // codex F5 — a missing column is a loud skip and the other tabs still owe
  const f5 = owedFrom({ hospital: [['AdmissionId', 'POPID', 'Cause'], ['H5', 'POP-00080', 'x']], chaos }, 113, idx);
  assert('F5: a tab without its cycle column is reported, the others still read', /Hospital_Ledger: no AdmitCycle/.test(f5.skipped.join('|')) && f5.owed.some((e) => e.kind === 'chaos'));

  const life = ['Y3C8 — [Wedding] married Ana', 'Y3C9 — [Friction] BART train: medical hold on board.',
    'Y3C9 — [Friction] heard the rent talk on the block turn sharp', 'Y3C9 — [Sports-Fandom-Up-S] argued the bullpen order',
    'Y3C9 — [Neighborhood-Composure-Down-S] compared rent notes', 'Y3C9 — [Micro-Event] lost a glove', 'Y3C9 — [Personal-Openness-Up-S] laughed alone'];
  const pin = { stamp: 'Y3C9', body: '[Friction] BART train: medical hold on board.' };
  assert('unpinned, a busy week trims the hit out of the block', !lifeTailOf(life).includes('medical hold'));
  const pinned = lifeTailOf(life, [pin]).split('\n');
  assert('pinned, the hit stays — five lines, chronological, the salient wedding kept', pinned.length === 5 && pinned[1] === life[1] && pinned[0] === life[0] && pinned[4] === life[6], pinned.join(' / '));
  const noHit = life.filter((l, i) => i !== 1);
  assert('a pin matches the exact line, never a same-tag same-Cycle neighbour', lifeTailOf(noHit, [pin]) === lifeTailOf(noHit));
  assert('a pin on another Cycle\'s stamp matches nothing → the plain block', lifeTailOf(life, [{ stamp: 'Y3C8', body: pin.body }]) === lifeTailOf(life));
  assert('the casino pin keeps the engine\'s own line', lifeTailOf(['Y3C8 — [Casino] the window paid — the week changed color'].concat(life.slice(2).map((l) => l.replace('Y3C9', 'Y3C8'))), [{ stamp: 'Y3C8', re: /^\[(Casino|Setback)\] the (window|slip)/ }]).includes('the window paid'));
  assert('many pins never grow the block past five', lifeTailOf(life, life.map((l) => ({ stamp: l.slice(0, 4), body: l.slice(7) }))).split('\n').length === 5);
}

console.log('Test P: engine.197 D1 — buildPool says why a row did not reach the pool');
const poolCases = (async () => {
  const sheets = require('/root/GodWorld/lib/sheets');
  const { buildPool } = require('./wakePerception');
  const real = { raw: sheets.getRawSheetData, obj: sheets.getSheetAsObjects };
  const flat = JSON.stringify({ base: { drive: 50, sociability: 50, warmth: 50, openness: 50, composure: 50, integrity: 50, family: 50, outabout: 50, fandom: 50 }, mood: {}, folded: 111 });
  const H = ['POPID', 'First', 'Last', 'Neighborhood', 'DialState', 'BirthYear', 'LifeHistory'];
  const ledger = [H,
    ['POP-00810', 'An', 'Lopez', 'Fruitvale', flat, 1990, ''],               // flat dials, no history: in at floors 0
    ['POP-00811', 'No', 'Dials', 'Fruitvale', '', 1990, 'x'],                // no DialState
    ['POP-00812', 'Bad', 'Dials', 'Fruitvale', '{not json', 1990, 'x'],      // unparseable
    ['POP-00813', 'No', 'Hood', '', flat, 1990, 'x'],                        // no hood
    ['POP-00594', 'Robert', 'Corliss', 'Lake Merritt', flat, 1980, 'x']];    // W3: no surname line any more
  sheets.getRawSheetData = async (tab) => (tab === 'Simulation_Ledger' ? ledger : [[]]);
  sheets.getSheetAsObjects = async () => [];
  try {
    const st = {};
    const open = await buildPool({ shapedMin: 0, lifeMinChars: 0, stats: st });
    assert('floors 0: a flat-dial, no-history citizen is in', open.some((p) => p.popId === 'POP-00810'));
    assert('stats count each skip by reason', st.rows === 5 && st.dial === 2 && st.nameHood === 1 && st.rule === 0, JSON.stringify(st));
    assert('W3: a Corliss is in the pool by POPID (builder 2026-10-17: any citizen can wake)', open.some((p) => p.popId === 'POP-00594'));
    assert('pool + skips = ledger rows', open.length + st.dial + st.nameHood + st.rule === st.rows, open.length + ' ' + JSON.stringify(st));
    const st2 = {};
    const shaped = await buildPool({ stats: st2 });
    assert('default floors still apply for the other callers (rule skips counted)', !shaped.some((p) => p.popId === 'POP-00810') && st2.rule === 3 && st2.dial === 2, JSON.stringify(st2)); // the floor is checked before name/hood
    assert('no stats object → no throw, same pool', (await buildPool({ shapedMin: 0, lifeMinChars: 0 })).length === open.length);
  } finally { sheets.getRawSheetData = real.raw; sheets.getSheetAsObjects = real.obj; }
})();

console.log('Test N: engine.197 M2 — her journal, one intake row a night, write-once');
{
  const at = (iso) => centralClock(new Date(iso));
  assert('19:00 CDT is 00:00Z next day and keys to its Central date', JSON.stringify(at('2026-10-18T00:00:00Z')) === JSON.stringify({ date: '2026-10-17', hour: 19 }), JSON.stringify(at('2026-10-18T00:00:00Z')));
  assert('a run at 23:59 CDT that appends at 00:01 CDT keys to the captured date', at('2026-10-18T04:59:00Z').date === '2026-10-17' && at('2026-10-18T05:01:00Z').date === '2026-10-18');
  assert('h23: 12:00 CDT is hour 12, 07:00 is 7 (not evening)', at('2026-10-17T17:00:00Z').hour === 12 && at('2026-10-17T12:00:00Z').hour === 7);
  assert('CST in winter: 19:00 CST = 01:00Z', JSON.stringify(at('2026-12-02T01:00:00Z')) === JSON.stringify({ date: '2026-12-01', hour: 19 }));
  const H = ['Timestamp', 'POPID', 'Cycle', 'Daypart', 'Tag', 'ReflectionExcerpt', 'Applied', 'Affect']; // live header (A–H)
  const row = (ts, pop, d) => [ts, pop, 112, d, 'Family', 'x', 'no', 'Calm', '', '', ''];
  assert('no row that night → append', planNightlyIntake([H, row('2026-10-17T00:00:05Z', 'POP-00005', 'nightly')], 'POP-00005', '2026-10-17') === 'append');
  assert('the night already in → present (write-once, never updated)', planNightlyIntake([H, row('2026-10-18T00:00:05Z', 'POP-00005', 'nightly')], 'POP-00005', '2026-10-17') === 'present');
  assert('her wake rows and other citizens\' nightly-looking rows do not count', planNightlyIntake([H, row('2026-10-18T00:00:05Z', 'POP-00005', 'night'), row('2026-10-18T00:00:05Z', 'POP-00810', 'nightly')], 'POP-00005', '2026-10-17') === 'append');
  assert('two rows that night → ambiguous, nothing appends', planNightlyIntake([H, row('2026-10-18T00:00:05Z', 'POP-00005', 'nightly'), row('2026-10-18T00:30:00Z', 'POP-00005', 'nightly')], 'POP-00005', '2026-10-17') === 'ambiguous');
  assert('an unparseable timestamp on her nightly row → ambiguous', planNightlyIntake([H, row('garbage', 'POP-00005', 'nightly')], 'POP-00005', '2026-10-17') === 'ambiguous');
  assert('no header / empty read / [[]] / wrong header → ambiguous', ['', null, [[]], [['Timestamp', 'POPID']]].every((x) => planNightlyIntake(x === '' ? [] : x, 'POP-00005', '2026-10-17') === 'ambiguous'));
  assert('a truncated identity-only match is not proof → ambiguous', planNightlyIntake([H, ['2026-10-18T00:00:05Z', 'POP-00005', 112, 'nightly']], 'POP-00005', '2026-10-17') === 'ambiguous');
  const r = nightlyIntakeRow({ instantIso: '2026-10-18T00:00:05Z', popId: 'pop-00005', cycle: 112, cls: { event: 'Family', affect: 'Warm', tension: 'Will Sarah call?', resolves: 0 }, body: 'Robert made soup.\nWe ate outside.', bondTarget: 'POP-00594' });
  assert('row A–K in the wake shape; resolves empty even when the classifier set one', r.length === 11 && r[1] === 'POP-00005' && r[3] === 'nightly' && r[5] === 'Robert made soup. We ate outside.' && r[6] === 'no' && r[8] === 'POP-00594' && r[9] === 'Will Sarah call?' && r[10] === '', JSON.stringify(r));
  assert('snippet capped at 180', nightlyIntakeRow({ body: 'a'.repeat(400), cls: {} })[5].length === 180);
  assert('a spooled row is valid only for the night its file names', validNightlyRow(r, 'POP-00005', '2026-10-17') && !validNightlyRow(r, 'POP-00005', '2026-10-18') && !validNightlyRow(r, 'POP-00810', '2026-10-17') && !validNightlyRow(r.slice(0, 8), 'POP-00005', '2026-10-17'));
}

const lockCases = (async () => {
  const os = require('os'), path = require('path'), cp = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wplock-'));
  const lock = path.join(dir, 'x.lock'), out = path.join(dir, 'out');
  const child = `const { withFileLock } = require(${JSON.stringify(path.join(__dirname, 'wakePerception'))});
    withFileLock(${JSON.stringify(lock)}, async () => { require('fs').appendFileSync(${JSON.stringify(out)}, 'ran\\n'); await new Promise((r) => setTimeout(r, 1500)); return 1; })
      .then((v) => { if (v === null) require('fs').appendFileSync(${JSON.stringify(out)}, 'skipped\\n'); });`;
  const run = () => new Promise((res) => { const p = cp.spawn(process.execPath, [...process.execArgv, '-e', child], { stdio: 'ignore', env: process.env }); p.on('exit', res); });
  await Promise.all([run(), run()]);
  const lines = fs.readFileSync(out, 'utf8').trim().split('\n').sort();
  assert('two processes contend: exactly one runs, one skips', lines.join() === 'ran,skipped', lines.join());
  assert('the lock is released after the run', !fs.existsSync(lock));
  const dead = await new Promise((res) => { const p = cp.spawn(process.execPath, ['-e', '0']); p.on('exit', () => res(p.pid)); });
  fs.writeFileSync(lock, dead + ' oldtoken');
  let said = '';
  assert('a dead owner\'s lock is broken, and reported', (await withFileLock(lock, async () => 'got', (m) => { said = m; })) === 'got' && /dead run/.test(said) && !fs.existsSync(lock + '.break'));
  fs.writeFileSync(lock, dead + ' oldtoken'); fs.writeFileSync(lock + '.break', process.pid + ' breaker');
  assert('a held break mutex → fail closed, the dead lock left for its holder', (await withFileLock(lock, async () => 'got')) === null && fs.readFileSync(lock, 'utf8') === dead + ' oldtoken');
  fs.unlinkSync(lock + '.break');
  fs.writeFileSync(lock, '');
  assert('an empty / unparseable lock is unknown ownership → fail closed, untouched', (await withFileLock(lock, async () => 'got')) === null && fs.readFileSync(lock, 'utf8') === '');
  fs.unlinkSync(lock);
  fs.writeFileSync(lock, process.pid + ' livetoken'); const old = new Date(Date.now() - 86400e3); fs.utimesSync(lock, old, old);
  assert('a live owner keeps the lock however old it is', (await withFileLock(lock, async () => 'got')) === null && fs.readFileSync(lock, 'utf8') === process.pid + ' livetoken');
  fs.unlinkSync(lock);
  await withFileLock(lock, async () => { fs.writeFileSync(lock, process.pid + ' someoneelse'); });
  assert('release never deletes a lock that is not this run\'s', fs.existsSync(lock) && fs.readFileSync(lock, 'utf8') === process.pid + ' someoneelse');
  // stress: 8 processes race a dead lock, 3 rounds; each records in/out in an append-only receipt
  const rcpt = path.join(dir, 'rcpt');
  const racer = `const fs = require('fs'); const { withFileLock } = require(${JSON.stringify(path.join(__dirname, 'wakePerception'))});
    withFileLock(${JSON.stringify(lock)}, async () => { fs.appendFileSync(${JSON.stringify(rcpt)}, 'in\\n'); await new Promise((r) => setTimeout(r, 400)); fs.appendFileSync(${JSON.stringify(rcpt)}, 'out\\n'); });`;
  let maxIn = 0, entered = 0;
  fs.writeFileSync(rcpt, '');
  for (let round = 0; round < 3; round++) {
    const deadPid = await new Promise((res) => { const p = cp.spawn(process.execPath, ['-e', '0']); p.on('exit', () => res(p.pid)); });
    fs.writeFileSync(lock, deadPid + ' deadtoken');
    await Promise.all(Array.from({ length: 8 }, () => new Promise((res) => { const p = cp.spawn(process.execPath, [...process.execArgv, '-e', racer], { stdio: 'ignore', env: process.env }); p.on('exit', res); })));
    let cur = 0;
    for (const l of fs.readFileSync(rcpt, 'utf8').trim().split('\n')) { if (l === 'in') { cur++; entered++; maxIn = Math.max(maxIn, cur); } else cur--; }
    fs.writeFileSync(rcpt, '');
  }
  assert('8 processes × 3 rounds on a dead lock: never two inside at once, someone always gets in', maxIn === 1 && entered >= 3, 'maxIn ' + maxIn + ' entered ' + entered);
  fs.rmSync(dir, { recursive: true, force: true });
})();

const spoolCases = (async () => {
  const os = require('os'), path = require('path'), cp = require('child_process');
  const H = ['Timestamp', 'POPID', 'Cycle', 'Daypart', 'Tag', 'ReflectionExcerpt', 'Applied', 'Affect'];
  const mk = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wpspool-')); return { d, spool: path.join(d, 'spool'), lock: path.join(d, 'x.lock') }; };
  const rowFor = (iso) => nightlyIntakeRow({ instantIso: iso, popId: 'POP-00005', cycle: 112, cls: { event: 'Family', affect: 'Warm' }, body: 'Robert made soup.' });
  const fake = () => { const sheet = [H.slice()]; let fail = 0; return { sheet, failNext: () => { fail++; },
    readRows: async () => sheet.map((x) => x.slice()), appendRow: async (row) => { if (fail) { fail--; throw new Error('sheet 503'); } sheet.push(row.slice()); } }; };

  { const t = mk(), f = fake(), log = [];
    spoolNightlyRow(t.spool, '2026-10-17', rowFor('2026-10-18T00:00:05Z'));
    f.failNext();
    await flushNightlySpool({ dir: t.spool, lockPath: t.lock, popId: 'POP-00005', readRows: f.readRows, appendRow: f.appendRow, log: (m) => log.push(m) }).catch(() => {});
    assert('an append that throws leaves the night spooled', fs.existsSync(path.join(t.spool, '2026-10-17.json')) && f.sheet.length === 1 && !fs.existsSync(t.lock));
    const res = await flushNightlySpool({ dir: t.spool, lockPath: t.lock, popId: 'POP-00005', readRows: f.readRows, appendRow: f.appendRow });
    assert('the next run appends it once and clears it on read-back', f.sheet.length === 2 && !fs.existsSync(path.join(t.spool, '2026-10-17.json')) && res.done.join() === '2026-10-17');
    await flushNightlySpool({ dir: t.spool, lockPath: t.lock, popId: 'POP-00005', readRows: f.readRows, appendRow: f.appendRow });
    spoolNightlyRow(t.spool, '2026-10-17', rowFor('2026-10-18T01:00:00Z'));
    await flushNightlySpool({ dir: t.spool, lockPath: t.lock, popId: 'POP-00005', readRows: f.readRows, appendRow: f.appendRow });
    assert('a second evening row for the same night is not appended (write-once)', f.sheet.length === 2 && !fs.existsSync(path.join(t.spool, '2026-10-17.json')));
    fs.rmSync(t.d, { recursive: true, force: true }); }

  { const t = mk(), f = fake();
    spoolNightlyRow(t.spool, '2026-10-17', rowFor('2026-10-18T00:00:05Z'));
    const commitsThenThrows = async (row) => { f.sheet.push(row.slice()); throw new Error('timeout after the write landed'); };
    await flushNightlySpool({ dir: t.spool, lockPath: t.lock, popId: 'POP-00005', readRows: f.readRows, appendRow: commitsThenThrows }).catch(() => {});
    assert('append commits then throws: the night stays spooled', f.sheet.length === 2 && fs.existsSync(path.join(t.spool, '2026-10-17.json')));
    let calls = 0;
    await flushNightlySpool({ dir: t.spool, lockPath: t.lock, popId: 'POP-00005', readRows: f.readRows, appendRow: async (r) => { calls++; await f.appendRow(r); } });
    assert('…the next flush finds it present: no second append, spool cleared', calls === 0 && f.sheet.length === 2 && !fs.existsSync(path.join(t.spool, '2026-10-17.json')));
    fs.rmSync(t.d, { recursive: true, force: true }); }

  { const t = mk(), f = fake(), log = [];
    fs.mkdirSync(t.spool, { recursive: true });
    fs.writeFileSync(path.join(t.spool, '2026-10-16.json'), '{"half');
    fs.writeFileSync(path.join(t.spool, '2026-10-15.json'), JSON.stringify(rowFor('2026-10-18T00:00:05Z')));
    await flushNightlySpool({ dir: t.spool, lockPath: t.lock, popId: 'POP-00005', readRows: f.readRows, appendRow: f.appendRow, log: (m) => log.push(m) });
    assert('an unreadable spool file is kept and reported, never read as empty', fs.existsSync(path.join(t.spool, '2026-10-16.json')) && log.some((m) => /2026-10-16.json unreadable/.test(m)));
    assert('a row filed under the wrong night is kept, not submitted', fs.existsSync(path.join(t.spool, '2026-10-15.json')) && f.sheet.length === 1 && log.some((m) => /2026-10-15.json malformed/.test(m)));
    fs.rmSync(t.d, { recursive: true, force: true }); }

  { const t = mk(), f = fake();
    f.sheet.push(['2026-10-18T00:00:05Z', 'POP-00005', 112, 'nightly']);
    spoolNightlyRow(t.spool, '2026-10-17', rowFor('2026-10-18T00:00:05Z'));
    await flushNightlySpool({ dir: t.spool, lockPath: t.lock, popId: 'POP-00005', readRows: f.readRows, appendRow: f.appendRow });
    assert('a truncated row already on the sheet: nothing appends, the night stays spooled', f.sheet.length === 2 && fs.existsSync(path.join(t.spool, '2026-10-17.json')));
    fs.rmSync(t.d, { recursive: true, force: true }); }

  { const t = mk(), f = fake();
    spoolNightlyRow(t.spool, '2026-10-17', rowFor('2026-10-18T00:00:05Z'));
    const slow = { readRows: f.readRows, appendRow: async (row) => { spoolNightlyRow(t.spool, '2026-10-18', rowFor('2026-10-19T00:00:05Z')); await f.appendRow(row); } };
    await flushNightlySpool({ dir: t.spool, lockPath: t.lock, popId: 'POP-00005', ...slow });
    assert('a night spooled while another flushes is not lost', fs.existsSync(path.join(t.spool, '2026-10-18.json')) && !fs.existsSync(path.join(t.spool, '2026-10-17.json')));
    await flushNightlySpool({ dir: t.spool, lockPath: t.lock, popId: 'POP-00005', readRows: f.readRows, appendRow: f.appendRow });
    assert('…and the next flush lands it', f.sheet.length === 3 && !fs.existsSync(path.join(t.spool, '2026-10-18.json')));
    fs.rmSync(t.d, { recursive: true, force: true }); }

  { const t = mk(); const sheetFile = path.join(t.d, 'sheet.json');
    fs.writeFileSync(sheetFile, JSON.stringify([H]));
    spoolNightlyRow(t.spool, '2026-10-17', rowFor('2026-10-18T00:00:05Z'));
    const child = `const fs = require('fs'); const { flushNightlySpool } = require(${JSON.stringify(path.join(__dirname, 'wakePerception'))});
      flushNightlySpool({ dir: ${JSON.stringify(t.spool)}, lockPath: ${JSON.stringify(t.lock)}, popId: 'POP-00005',
        readRows: async () => JSON.parse(fs.readFileSync(${JSON.stringify(sheetFile)}, 'utf8')),
        appendRow: async (row) => { fs.appendFileSync(${JSON.stringify(sheetFile + '.appends')}, 'append\\n'); const s = JSON.parse(fs.readFileSync(${JSON.stringify(sheetFile)}, 'utf8')); await new Promise((r) => setTimeout(r, 800)); s.push(row); fs.writeFileSync(${JSON.stringify(sheetFile)}, JSON.stringify(s)); } });`;
    const run = () => new Promise((res) => { const p = cp.spawn(process.execPath, [...process.execArgv, '-e', child], { stdio: 'ignore', env: process.env }); p.on('exit', res); });
    await Promise.all([run(), run()]);
    const rows = JSON.parse(fs.readFileSync(sheetFile, 'utf8'));
    const appends = fs.existsSync(sheetFile + '.appends') ? fs.readFileSync(sheetFile + '.appends', 'utf8').trim().split('\n').filter(Boolean).length : 0;
    assert('two complete writers in two processes: exactly one append call, one row', appends === 1 && rows.length === 2, 'appends ' + appends + ' rows ' + rows.length);
    fs.rmSync(t.d, { recursive: true, force: true }); }
})();

const owedStepCases = (async () => {
  const { owedPageStep, acquireFileLock } = require('./wakePerception');
  const run = async (on, journalOk, pageResult) => {
    const lines = [], calls = { page: 0 };
    const out = await owedPageStep({ on, line: (st) => st, journal: (l) => { const ok = journalOk(l); if (ok) lines.push(l); return ok; },
      page: async () => { calls.page++; return pageResult; } });
    return { out, lines, calls };
  };
  let r = await run(true, (l) => l !== 'pending', { id: 'd1' });
  assert('round 3: pending not saved → no page is written', r.out.outcome === 'pending-not-saved' && r.calls.page === 0 && r.lines.length === 0);
  r = await run(true, () => true, { error: 'socket hang up' });
  assert('round 3 F2: a page error writes nothing after pending — the receipt stands', r.out.outcome === 'page-error-pending-stands' && r.lines.join(',') === 'pending');
  r = await run(true, () => true, { id: 'd2' });
  assert('round 3: a landed page → pending then shown', r.out.outcome === 'shown' && r.lines.join(',') === 'pending,shown');
  r = await run(true, (l) => l !== 'shown', { id: 'd3' });
  assert('round 3: shown not saved → reported; pending already counts', r.out.outcome === 'shown-not-saved' && r.lines.join(',') === 'pending');
  r = await run(false, () => { throw new Error('journal touched'); }, { id: 'd4' });
  assert('owed off → the plain page write, the journal never touched', r.out.outcome === 'off' && r.calls.page === 1);
  const lockDir = fs.mkdtempSync(require('path').join(require('os').tmpdir(), 'owedlock-'));
  const lp = require('path').join(lockDir, 'owed.lock');
  const a = acquireFileLock(lp), b = acquireFileLock(lp);
  assert('round 3 F3: a second live wake cannot take the owed lock while the first holds it', typeof a === 'function' && b === null);
  const { wakeAdmission: admitFn } = require('./wakePerception');
  const pages = new Map(); // the page store's key rule: first write per key wins, a duplicate is a quiet success
  const pageWrite = (key, text) => async () => { if (!pages.has(key)) pages.set(key, text); return { id: key }; };
  const bAdmit = admitFn({ owedRes: 6, dry: false, lockTaken: !!b });
  if (bAdmit !== 'skip') await pageWrite('POP-00121-c113-morning', 'B: unpinned')();
  const aLines = [];
  const aStep = await owedPageStep({ on: true, line: (st) => st, journal: (l) => { aLines.push(l); return true; }, page: pageWrite('POP-00121-c113-morning', 'A: theft line in front of him') });
  assert('round 4: two overlapping wakes — the lock loser writes no page, so the owed wake\'s own reflection is the page that lands',
    bAdmit === 'skip' && aStep.outcome === 'shown' && pages.get('POP-00121-c113-morning') === 'A: theft line in front of him');
  { // codex round 5 — two mornings of one Cycle, sequential: the second run must not receipt into the first page
    const { owedStateFrom: osf, owedJournalLine: ojl, owedPageKey: opk } = require('./wakePerception');
    const store = new Map(), journal = [];
    const pkey = opk('POP-00121', 113, 'morning'), customId = 'cp-POP-00121-c113-morning';
    const wake = async (day, ids, text) => {
      const view = osf(journal.join(''), 113);
      const taken = view.pageKeys.has(pkey);
      const key = wakeSeedKey(113, 'morning', day) + '|POP-00121|' + day;
      const rec = taken ? [] : ids;
      return owedPageStep({ on: true, journal: (l) => { journal.push(l); return true; },
        line: (st) => ojl({ key, page: pkey, cycle: 113, pop: 'POP-00121', slot: taken ? 'repeat' : 'owed', ids: rec, status: st }),
        page: async () => { if (!store.has(customId)) store.set(customId, text); return { id: customId }; } });
    };
    await wake('2026-10-29', [], 'first morning, nothing owed yet');
    await wake('2026-10-30', ['chaos:LATE'], 'second morning, the event in front of them');
    const after = osf(journal.join(''), 113);
    assert('round 5: two dates in one Cycle — the first page stands and the second run spends nothing; the event stays owed',
      store.get(customId) === 'first morning, nothing owed yet' && !after.owedSpent['chaos:LATE']);
  }
  a(); const c2 = acquireFileLock(lp);
  assert('round 3 F3: released, the next wake takes it', typeof c2 === 'function');
  c2(); fs.rmSync(lockDir, { recursive: true, force: true });
})();

const owedLoadCases = (async () => {
  const { loadOwedRecords } = require('./wakePerception');
  const tabs = { Chaos_Cars: [['CycleId']], Casino_Ledger: [['WagerId']], Hospital_Ledger: [['POPID']] };
  const r = await loadOwedRecords(async (t) => { if (!tabs[t]) throw new Error('read timed out'); return tabs[t]; });
  assert('F5: one failed tab is reported by name; the other three still load', r.errors.length === 1 && /Judicial_Ledger: read timed out/.test(r.errors[0])
    && Array.isArray(r.chaos) && Array.isArray(r.casino) && Array.isArray(r.hospital) && r.judicial === undefined);
})();

Promise.all([poolCases, lockCases, spoolCases, owedLoadCases, owedStepCases]).then(() => {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
});
