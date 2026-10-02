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
const streetOpts = { meta: { cycle: 999 }, ledgerRows: [
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
  seat: 'talia-finch', cycle: 999, beats, streetOptions: { ...streetOpts, meta: { cycle: 998 } } }).candidates, []);

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
fs.rmSync(root, { recursive: true, force: true });
console.log('newsroomSourcing.test.js: PASS');
