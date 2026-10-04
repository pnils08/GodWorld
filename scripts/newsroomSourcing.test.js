'use strict';
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const source = require('./newsroomSourcing');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'test-only-newsroom-sourcing-'));
const beatsDir = path.join(root, 'output', 'beats');
const voiceDir = path.join(root, 'output', 'civic-voice');
fs.mkdirSync(beatsDir, { recursive: true });
fs.mkdirSync(voiceDir, { recursive: true });
const beats = {
  Business_Ledger: [{ BIZ_ID: 'BIZ-90001', Name: 'Test Workplace' }],
  Employment_Roster: [
    { BIZ_ID: 'BIZ-90001', POP_ID: 'POP-90001', CitizenName: 'Test Worker', RoleType: 'Cook', Status: 'Active' },
    { BIZ_ID: 'BIZ-90001', POP_ID: 'POP-90002', CitizenName: 'Test Former Worker', Status: 'Inactive' },
    { BIZ_ID: 'BIZ-90002', POP_ID: 'POP-90003', CitizenName: 'Test Other Worker', Status: 'Active' },
  ],
  Civic_Office_Ledger: [{ OfficeId: 'TEST-01', Holder: 'Test Holder', PopId: 'POP-90004', Status: 'active' }],
  Initiative_Tracker: [{ InitiativeID: 'INIT-900', Name: 'Test Initiative' }],
};
fs.writeFileSync(path.join(beatsDir, 'Civic_Office_Ledger.jsonl'),
  beats.Civic_Office_Ledger.map(JSON.stringify).join('\n') + '\n');
const namedSlice = { story: { ref: 'output/beats/Test_Only.jsonl' },
  citizens: [
    { popid: 'POP-90005', name: 'Test Named', why: 'named on test row' },
    { popid: 'POP-90006', name: 'Test Bystander', why: 'same-hood-signal' },
  ] };
assert.deepEqual(source.buildPool({ mode: 'records', story: {}, slice: namedSlice, cycle: 999, beats }).candidates, []);
const named = source.buildPool({ mode: 'named', story: {}, slice: namedSlice, cycle: 999, beats });
assert.deepEqual(named.candidates.map(c => c.pop), ['POP-90005']);
assert.ok(Object.isFrozen(named.candidates) && Object.isFrozen(named.candidates[0].evidence));
const feedDir = path.join(root, 'output', 'spacemolt-show', 'feed');
fs.mkdirSync(feedDir, { recursive: true });
fs.writeFileSync(path.join(feedDir, 'c999.json'), JSON.stringify({ events: [
  { EpisodeId: 'test-episode', POPID: 'POP-90011', Holder: 'Test Pilot' },
  { EpisodeId: 'other-episode', POPID: 'POP-90012', Holder: 'Test Other Pilot' },
] }));
assert.deepEqual(source.buildPool({ mode: 'named', cycle: 999, root, beats,
  story: { ref: 'undocked:test-episode', popids: ['POP-90011', 'POP-90012'] } })
  .candidates.map(c => c.pop), ['POP-90011']);
const workplace = source.buildPool({ mode: 'workplace', story: {},
  slice: { businesses: [{ bizId: 'BIZ-90001' }] }, cycle: 999, beats });
assert.deepEqual(workplace.candidates.map(c => c.pop), ['POP-90001']);
assert.equal(workplace.candidates[0].evidence.bizId, 'BIZ-90001');

const streetStory = { venue: 'Test Venue', pulseClass: 'nightlife-spot' };
const streetSlice = { pulse: { className: 'nightlife-spot', venue: 'Test Venue' }, hood: 'Test District' };
const streetOpts = { meta: { cycle: 999 }, pageIndex: [], ledgerRows: [
  { POPID: 'POP-90007', Name: 'Test Visitor', Status: 'Active',
    LifeHistory: 'Y20C11 — [PrevEvening] visited Test Venue after work' },
  { POPID: 'POP-90008', Name: 'Test Hood Resident', Status: 'Active',
    LifeHistory: 'C999 — [Neighborhood] noticed activity in Test District' },
  { POPID: 'POP-90009', Name: 'Test Recap Listener', Status: 'Active',
    LifeHistory: 'C999 — [Media] heard the Test Venue recap' },
  { POPID: 'POP-90010', Name: 'Test Old Visitor', Status: 'Active',
    LifeHistory: 'C998 — [PrevEvening] visited Test Venue' },
] };
const street = source.buildPool({ mode: 'street', story: streetStory, slice: streetSlice,
  seat: 'talia-finch', cycle: 999, beats, streetOptions: streetOpts });
assert.deepEqual(street.candidates.map(c => c.pop), ['POP-90007']);
assert.equal(street.candidates[0].evidence.line, streetOpts.ledgerRows[0].LifeHistory);
assert.deepEqual(source.buildPool({ mode: 'street', story: streetStory, slice: streetSlice,
  seat: 'talia-finch', cycle: 999, beats, root, streetOptions: { ...streetOpts, pageIndex: [] } }).candidates,
  street.candidates, 'an empty page index leaves the life-line pool unchanged');
const streetWithoutIndex = { ...streetOpts };
delete streetWithoutIndex.pageIndex;
assert.deepEqual(source.buildPool({ mode: 'street', story: streetStory, slice: streetSlice,
  seat: 'talia-finch', cycle: 999, beats, root, streetOptions: streetWithoutIndex }).candidates,
  street.candidates, 'a missing index file leaves the life-line pool unchanged');
const pageRows = [
  { POPID: 'POP-90013', Name: 'Test Page Citizen', Status: 'Active' },
  { POPID: 'POP-90014', Name: 'Test Tension Citizen', Status: 'Active' },
  { POPID: 'POP-90015', Name: 'Test Reporter', Status: 'Active', ClockMode: 'MEDIA' },
  { POPID: 'POP-90016', Name: 'Test Athlete', Status: 'Active', ClockMode: 'GAME' },
  { POPID: 'POP-90017', Name: 'Test Date Citizen', Status: 'Active' },
  { POPID: 'POP-90018', Name: 'Test Neutral Citizen', Status: 'Active' },
  { POPID: 'POP-90019', Name: 'Test Sports Override', Status: 'Active', EconomicProfileKey: 'SPORTS_OVERRIDE' },
  { POPID: 'POP-90020', Name: 'Test Future Citizen', Status: 'Active' },
];
const pageDoc = (popId, cycle, content, type = 'reflection') => ({
  popId, cycle, content, type, createdAt: 'test-only-order',
  docId: 'test-only-doc-' + popId + '-' + cycle,
  customId: 'cp-' + popId + '-c' + cycle + '-morning',
});
const pageOpts = { ...streetOpts, ledgerRows: streetOpts.ledgerRows.concat(pageRows), pageIndex: [
  pageDoc('POP-90013', 997, 'I used to visit Test Venue.'),
  pageDoc('POP-90013', 998, 'I keep going back to Test Venue.'),
  pageDoc('POP-90007', 998, 'I keep going back to Test Venue.'),
  pageDoc('POP-90014', 998, 'I worry about Test Venue.', 'tension'),
  pageDoc('POP-90015', 998, 'I like Test Venue.'),
  pageDoc('POP-90016', 998, 'I like Test Venue.'),
  pageDoc('POP-90017', 998, 'On 2026-10-03 I visited Test Venue.'),
  pageDoc('POP-90018', 998, 'Test Venue reopened.'),
  pageDoc('POP-90019', 998, 'I like Test Venue.'),
  pageDoc('POP-90020', 1000, 'I like Test Venue.'),
] };
const withPages = source.buildPool({ mode: 'street', story: streetStory, slice: streetSlice,
  seat: 'talia-finch', cycle: 999, beats, root, streetOptions: pageOpts });
assert.deepEqual(withPages.candidates.map(c => c.pop), ['POP-90007', 'POP-90013']);
assert.deepEqual(withPages.candidates.map(c => c.sourceKind), ['life-line', 'page-line']);
assert.equal(withPages.candidates[1].evidence.cycle, 998);
assert.equal(withPages.candidates[1].evidence.customId, 'cp-POP-90013-c998-morning');
assert.equal(withPages.candidates[1].evidence.excerpt, 'I keep going back to Test Venue.');
assert.equal(withPages.candidates[1].matchedPageLine, withPages.candidates[1].evidence.excerpt);
assert.equal(source.buildPool({ mode: 'street', story: streetStory, slice: streetSlice,
  seat: 'talia-finch', cycle: 999, beats, root,
  streetOptions: { ...streetOpts, ledgerRows: pageRows, pageIndex: [], exchanges: [] } }).candidates.length, 0,
  'an empty page index creates no page-line candidates');
assert.deepEqual(source.buildPool({ mode: 'street', story: streetStory, slice: streetSlice,
  seat: 'talia-finch', cycle: 999, beats, streetOptions: { ...streetOpts, meta: { cycle: 998 } } }).candidates, []);
// engine.53 T6: exchange transcripts as a third street evidence source (after life-line and page-line).
const exRows = [
  { POPID: 'POP-90030', First: 'Ex', Last: 'Thirty', Status: 'Active', ClockMode: 'ENGINE', Neighborhood: 'Fruitvale', Tier: 3, LifeHistory: '' },
  { POPID: 'POP-90031', First: 'Ex', Last: 'Reporter', Status: 'Active', ClockMode: 'MEDIA', Neighborhood: 'Fruitvale', Tier: 2, LifeHistory: '' },
  { POPID: 'POP-90032', First: 'Ex', Last: 'Leak', Status: 'Active', ClockMode: 'ENGINE', Neighborhood: 'Fruitvale', Tier: 3, LifeHistory: '' },
  { POPID: 'POP-90033', First: 'Ex', Last: 'Future', Status: 'Active', ClockMode: 'ENGINE', Neighborhood: 'Fruitvale', Tier: 3, LifeHistory: '' },
];
const turn = (popId, cycle, text) => ({ file: 'output/exchanges/exchange_c' + cycle + '_2026-01-01_conversation.md',
  cycle, format: 'conversation', popId, name: 'Ex', text });
const exOpts = { ...streetOpts, ledgerRows: streetOpts.ledgerRows.concat(pageRows, exRows), pageIndex: [
  pageDoc('POP-90013', 998, 'I keep going back to Test Venue.') ], exchanges: [
  turn('POP-90030', 998, 'Honestly? I keep going back to Test Venue. Nothing else is open.'),
  turn('POP-90013', 999, 'I keep going back to Test Venue.'),   // already a page-line candidate: page wins
  turn('POP-90031', 998, 'I keep going back to Test Venue.'),   // MEDIA clock: never a street source
  turn('POP-90032', 998, 'Codex told me to keep going back to Test Venue.'), // leak guard
  turn('POP-90033', 1000, 'I keep going back to Test Venue.'),  // a future Cycle cannot be evidence
] };
const withExchanges = source.buildPool({ mode: 'street', story: streetStory, slice: streetSlice,
  seat: 'talia-finch', cycle: 999, beats, root, streetOptions: exOpts });
assert.deepEqual(withExchanges.candidates.map(c => c.pop), ['POP-90007', 'POP-90013', 'POP-90030']);
assert.deepEqual(withExchanges.candidates.map(c => c.sourceKind), ['life-line', 'page-line', 'exchange-line']);
assert.equal(withExchanges.candidates[2].evidence.excerpt, 'I keep going back to Test Venue.');
assert.equal(withExchanges.candidates[2].evidence.cycle, 998);
assert.equal(withExchanges.candidates[2].evidence.format, 'conversation');
assert.equal(withExchanges.candidates[2].matchedExchangeLine, withExchanges.candidates[2].evidence.excerpt);
assert.equal(source.buildPool({ mode: 'street', story: streetStory, slice: streetSlice,
  seat: 'talia-finch', cycle: 999, beats, root,
  streetOptions: { ...streetOpts, ledgerRows: exRows, pageIndex: [], exchanges: [] } }).candidates.length, 0,
  'no transcripts creates no exchange-line candidates');
// loadExchanges: parses the transcript shape citizen-exchange.js writes; window = 3 Cycles; stage directions stripped.
const exRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exchanges-'));
fs.mkdirSync(path.join(exRoot, 'output', 'exchanges'), { recursive: true });
fs.writeFileSync(path.join(exRoot, 'output', 'exchanges', 'exchange_c998_2026-01-01_conversation.md'),
  '# Exchange — conversation (Cycle 998)\n\n- participants: POP-90030 Ex Thirty | POP-90031 Ex Reporter\n- trigger: ripple\n\n---\n\n' +
  '**Ex Thirty:** *leaning on the rail* I keep going back to Test Venue. *laughs*\n\n**Ex Reporter:** Same.\n\n**Someone Else:** not a participant\n');
fs.writeFileSync(path.join(exRoot, 'output', 'exchanges', 'exchange_c995_2026-01-01_debate.md'),
  '- participants: POP-90030 Ex Thirty\n\n**Ex Thirty:** Old words.\n');
const loaded = source.loadExchanges(exRoot, 999);
assert.deepEqual(loaded.map(t => [t.popId, t.text, t.cycle, t.format]),
  [['POP-90030', 'I keep going back to Test Venue.', 998, 'conversation'], ['POP-90031', 'Same.', 998, 'conversation']]);
assert.deepEqual(source.loadExchanges(path.join(exRoot, 'nowhere'), 999), [], 'a missing directory is no transcripts, never a throw');


const officeStory = { angle: 'Test Initiative status', ref: 'TEST-ONLY-office-assignment' };
let offices = source.buildPool({ mode: 'offices', story: officeStory, cycle: 999, beats, root });
assert.deepEqual(offices.officeRecords, [], 'missing cycle file is silence');
const officeFile = path.join(voiceDir, 'test_office_c999.json');
fs.writeFileSync(officeFile, JSON.stringify({ office: 'test_office', cycle: 999, speaker: 'Test Holder',
  statements: [{ statementId: 'STMT-999-test-001', topic: 'Other Topic', initiative: null,
    quote: 'Test-only unrelated quote.' }] }));
offices = source.buildPool({ mode: 'offices', story: officeStory, cycle: 999, beats, root });
assert.deepEqual(offices.officeRecords, [], 'unmatched topic is silence');
fs.writeFileSync(officeFile, JSON.stringify({ office: 'test_office', cycle: 999, speaker: 'Test Holder',
  statements: [{ statementId: 'STMT-999-test-001', topic: 'Test Initiative', initiative: 'INIT-900',
    quote: 'Test-only exact office quote.', fullStatement: 'Not the quote.' }] }));
offices = source.buildPool({ mode: 'offices', story: officeStory, cycle: 999, beats, root });
assert.equal(offices.officeRecords.length, 1);
assert.deepEqual(offices.candidates.map(c => c.pop), ['POP-90004']);
assert.equal(offices.candidates[0].sourceKind, 'office-record');
assert.equal(offices.officeRecords[0].quote, 'Test-only exact office quote.');
assert.equal(source.verifyOfficeRecord(offices.officeRecords[0], 999, root), true);
assert.equal(source.verifyOfficeRecord({ ...offices.officeRecords[0], quote: 'Forged' }, 999, root), false);
// A city employer joins by its ledger id and the name a story uses for it.
const cityBeats = { ...beats,
  Business_Ledger: [{ BIZ_ID: 'BIZ-00024', Name: 'Oakland Police Department' },
    { BIZ_ID: 'BIZ-90009', Name: 'OPD Supply Test Shop' }],
  Employment_Roster: [
    { BIZ_ID: 'BIZ-00024', POP_ID: 'POP-90007', CitizenName: 'Test Officer', RoleType: 'Officer', Status: 'Active' },
    { BIZ_ID: 'BIZ-90009', POP_ID: 'POP-90008', CitizenName: 'Test Clerk', Status: 'Active' }] };
const cityStory = { angle: 'Test Initiative: what OPD says it changed', ref: 'TEST-ONLY-office-assignment' };
const city = source.buildPool({ mode: 'offices', story: cityStory, cycle: 998, beats: cityBeats, root });
assert.deepEqual(city.candidates.map(c => [c.pop, c.sourceKind]), [['POP-90007', 'civic-worker']]);
assert.deepEqual(source.buildPool({ mode: 'offices', cycle: 998, beats: cityBeats, root,
  story: { angle: 'Test Initiative status', ref: 'TEST-ONLY-office-assignment' } }).candidates, [],
  'an employer the story does not name gives no worker');
// Reading the dump itself: another Cycle's dump or a missing tab throws, never an empty pool.
assert.throws(() => source.buildPool({ mode: 'workplace', story: {}, cycle: 999, root }), /beat dump missing or stale for C999 \(dump is unreadable\)/);
fs.writeFileSync(path.join(beatsDir, 'meta.json'), JSON.stringify({ cycle: 998 }));
assert.throws(() => source.buildPool({ mode: 'offices', story: officeStory, cycle: 999, root }), /stale for C999 \(dump is C998\)/);
fs.writeFileSync(path.join(beatsDir, 'meta.json'), JSON.stringify({ cycle: 999 }));
assert.throws(() => source.buildPool({ mode: 'workplace', story: {}, cycle: 999, root }), /beat dump tab missing: Business_Ledger/);
for (const tab of ['Business_Ledger', 'Employment_Roster', 'Initiative_Tracker']) {
  fs.writeFileSync(path.join(beatsDir, tab + '.jsonl'), beats[tab].map(JSON.stringify).join('\n') + '\n');
}
assert.equal(source.buildPool({ mode: 'offices', story: officeStory, cycle: 999, root }).officeRecords.length, 1);
assert.throws(() => source.buildPool({ mode: 'street', story: {}, cycle: 999, root, seat: 'maria-keen' }), /ledger snapshot meta missing/);
fs.rmSync(root, { recursive: true, force: true });
console.log('newsroomSourcing.test.js: PASS');
