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

Promise.all([poolCases, lockCases, spoolCases]).then(() => {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
});
