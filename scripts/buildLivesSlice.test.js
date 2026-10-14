#!/usr/bin/env node
'use strict';
// pipeline.73 — Tamsin Pruitt's Lives slice. Fixture: the five C111 Lived_Events in the step 2 shape
// (es 2026-10-14), a log window with bookkeeping and small moments, one open and one discharged stay.

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const L = require('./buildLivesSlice');

const cycle = 111;
const profiles = new Map([
  ['POP-90001', { POPID: 'POP-90001', Name: 'Test Parent', RoleType: 'Elevator Mechanic', Neighborhood: 'West Oakland' }],
  ['POP-90002', { POPID: 'POP-90002', Name: 'Test Retiree', RoleType: 'Psychotherapist', Neighborhood: 'Rockridge' }],
  ['POP-90003', { POPID: 'POP-90003', Name: 'Test Climber', RoleType: 'Janitor', Neighborhood: 'West Oakland' }],
  ['POP-90004', { POPID: 'POP-90004', Name: 'Test Patient', RoleType: 'Drone Fleet Coordinator', Neighborhood: 'Rockridge' }],
  ['POP-90005', { POPID: 'POP-90005', Name: 'Test Widow', RoleType: 'Teacher', Neighborhood: 'Temescal' }],
  ['POP-90006', { POPID: 'POP-90006', Name: 'Test Friend', RoleType: 'Mechanic', Neighborhood: 'Fruitvale' }],
  ['POP-90007', { POPID: 'POP-90007', Name: 'Test Open Stay', RoleType: 'Manager, Oakland A\'s', Neighborhood: 'Lake Merritt' }],
  ['POP-90008', { POPID: 'POP-90008', Name: 'Test Discharged', RoleType: 'Broker', Neighborhood: 'Rockridge' }]
]);
const beats = {
  Lived_Events: [
    { id: 'promotion:POP-90003:111', kind: 'promotion', cycle, subject: 'POP-90003', subjectName: 'Test Climber', neighborhood: 'West Oakland', roleType: 'Janitor', recipients: [{ pop: 'POP-90003', rel: 'self', name: 'Test Climber' }] },
    { id: 'retirement:POP-90002:111', kind: 'retirement', cycle, subject: 'POP-90002', subjectName: 'Test Retiree', neighborhood: 'Rockridge', roleType: 'Psychotherapist', recipients: [{ pop: 'POP-90002', rel: 'self', name: 'Test Retiree' }] },
    { id: 'birth:POP-90001:111', kind: 'birth', cycle, subject: 'POP-90001', subjectName: 'Test Parent', neighborhood: 'West Oakland', roleType: 'Elevator Mechanic', recipients: [{ pop: 'POP-90001', rel: 'self', name: 'Test Parent' }] },
    { id: 'hospital:H-C110-POP-90004:111:out', kind: 'hospital', cycle, subject: 'POP-90004', subjectName: 'Test Patient', neighborhood: 'Rockridge', roleType: 'Drone Fleet Coordinator', phase: 'discharged', cause: 'severe seasonal flu', recipients: [{ pop: 'POP-90004', rel: 'self', name: 'Test Patient' }] },
    { id: 'death:POP-90099:111', kind: 'death', cycle, subject: 'POP-90099', subjectName: 'Test Departed', neighborhood: 'Temescal', deceasedName: 'Test Departed', recipients: [{ pop: 'POP-90005', rel: 'spouse', name: 'Test Widow' }] }
  ],
  LifeHistory_Log: [
    { Timestamp: 't', POPID: 'POP-90003', Name: '', EventTag: 'Promotion', EventText: 'Promoted to lead janitor at AC Transit', Neighborhood: '', Cycle: String(cycle) },
    { Timestamp: 't', POPID: 'POP-90003', Name: '', EventTag: 'Sports', EventText: 'the city buzzes after the win', Neighborhood: '', Cycle: String(cycle) },
    { Timestamp: 't', POPID: 'POP-90002', Name: '', EventTag: 'Daily', EventText: 'walked the lake the first morning without an alarm', Neighborhood: '', Cycle: String(cycle + 1) },
    { Timestamp: 't', POPID: 'POP-90006', Name: '', EventTag: 'Relationship', EventText: 'reconnected with an old friend', Neighborhood: 'Fruitvale', Cycle: String(cycle) },
    { Timestamp: 't', POPID: 'POP-90006', Name: '', EventTag: 'Household', EventText: 'Emerged into Tier-4 citizen tracking', Neighborhood: '', Cycle: String(cycle) },
    { Timestamp: 't', POPID: 'POP-90001', Name: '', EventTag: 'Relationship', EventText: 'a second small moment for a person already on the page', Neighborhood: '', Cycle: String(cycle) },
    { Timestamp: 't', POPID: 'POP-90006', Name: '', EventTag: 'Relationship', EventText: 'STALE last Cycle', Neighborhood: '', Cycle: String(cycle - 1) }
  ],
  Hospital_Ledger: [
    { AdmissionId: 'H-C105-POP-90007', POPID: 'POP-90007', Name: 'Test Open Stay', Neighborhood: 'Lake Merritt', Cause: 'a workplace accident', AdmitCycle: '105', StatusNow: 'active', DischargeCycle: '' },
    { AdmissionId: 'H-C105-POP-90008', POPID: 'POP-90008', Name: 'Test Discharged', Neighborhood: 'Rockridge', Cause: 'a workplace accident', AdmitCycle: '105', StatusNow: 'active', DischargeCycle: '109', Outcome: 'recovered' }
  ],
  Household_Ledger: [],
  Story_Hook_Deck: [
    { Cycle: String(cycle), HookType: 'FAMILY_CELEBRATION', Domain: 'FAMILY', Neighborhood: 'West Oakland', Priority: '3', HookText: 'A block welcomes a newborn', SuggestedJournalist: '' },
    { Cycle: String(cycle), HookType: 'RENT_BURDEN_CRISIS', Domain: 'ECONOMIC', Neighborhood: 'Downtown', Priority: '5', HookText: 'not hers', SuggestedJournalist: '' }
  ]
};

assert.equal(L.kindLine(beats.Lived_Events[2]), 'Test Parent welcomed a new child, West Oakland');
assert.equal(L.kindLine(beats.Lived_Events[4]), 'Test Widow lost Test Departed (spouse), Temescal');
assert.equal(L.kindLine(beats.Lived_Events[3]), 'Test Patient came home from the hospital — severe seasonal flu, Rockridge');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lives-slice-'));
try {
  fs.mkdirSync(path.join(root, 'output', 'citizen_pages'), { recursive: true });
  fs.writeFileSync(path.join(root, 'output', 'citizen_pages', 'index.jsonl'), [
    JSON.stringify({ docId: 'd1', customId: 'cp-POP-90004-c111-night', popId: 'POP-90004', cycle, slot: 'night', content: 'Home. The kitchen smelled like someone else had been cooking in it all week.', createdAt: '2026-01-01T00:00:00Z' }),
    JSON.stringify({ docId: 'd2', customId: 'cp-POP-90004-c111-PRESS', popId: 'POP-90004', cycle, slot: 'PRESS', content: 'a reporter asked and this is not her source', createdAt: '2026-01-01T00:00:00Z' })
  ].join('\n') + '\n');

  // Day 1: the four heaviest events (death first), the small moment, the open stay; the discharged
  // row and the bookkeeping line never ride; a person already on the page is not a second moment.
  const day1 = L.buildLivesSlice(cycle, { root, beats, profiles });
  assert.equal(day1.empty, false);
  assert.deepStrictEqual(day1.facts.filter(f => f.kind !== 'moment' && f.kind !== 'stay').map(f => f.kind), ['death', 'hospital', 'birth', 'retirement']);
  assert.ok(day1.facts[0].text.startsWith('Test Widow lost Test Departed'), 'a death is the survivor\'s passage: ' + day1.facts[0].text);
  assert.ok(day1.facts.some(f => f.kind === 'moment' && /Test Friend — reconnected/.test(f.text)));
  assert.ok(!day1.facts.some(f => /Emerged into|second small moment/.test(f.text)));
  assert.ok(day1.facts.some(f => f.kind === 'stay' && /Test Open Stay is still in hospital care/.test(f.text)));
  assert.ok(!day1.facts.some(f => /Test Discharged/.test(f.text)), 'a discharged row is not a stay');
  // "What came next" only from a LATER Cycle; the same Cycle's lines are the person's day.
  assert.ok(day1.facts.find(f => f.kind === 'retirement').text.includes('Since then, on the record: walked the lake'));
  assert.ok(day1.facts.find(f => f.kind === 'birth').text.includes('the record does not say yet'));
  assert.ok(day1.citizens.some(c => c.popid === 'POP-90005' && /lost Test Departed/.test(c.why)));
  assert.ok(day1.prewrite.pageVoices.length === 1 && /Test Patient, own page \(night/.test(day1.prewrite.pageVoices[0]), 'the person\'s own page, never a PRESS reply');
  assert.deepStrictEqual(day1.prewrite.hooks.map(h => h.text), ['A block welcomes a newborn']);
  assert.ok(day1.story.ref.endsWith(' ' + day1.day), 'the ref carries the day so the fanout never drops a daily seat as stale');
  assert.ok(/1 more news-grade events wait/.test(day1.prewrite.note));

  const covered = JSON.parse(fs.readFileSync(L.coveredPath(root), 'utf8'));
  assert.equal(Object.keys(covered).length, day1.facts.length);
  assert.ok(covered['death:POP-90099:111'] && covered['death:POP-90099:111'].popid === 'POP-90005');

  // Day 2: the one event left (the promotion), no repeats.
  const day2 = L.buildLivesSlice(cycle, { root, beats, profiles });
  assert.equal(day2.empty, false);
  assert.deepStrictEqual(day2.facts.map(f => f.kind), ['promotion']);
  assert.ok(day2.facts[0].text.includes('the record lists their work as Janitor'));

  // Day 3: everything covered → empty, with the reason that says so.
  const day3 = L.buildLivesSlice(cycle, { root, beats, profiles });
  assert.equal(day3.empty, true);
  assert.ok(/already covered/.test(day3.reason));
  // The covered list forgets nothing inside two Cycles.
  assert.equal(Object.keys(JSON.parse(fs.readFileSync(L.coveredPath(root), 'utf8'))).length, day1.facts.length + 1);

  // Nothing in the dump → the other empty reason.
  const none = L.buildLivesSlice(cycle, { root, beats: { Lived_Events: [], LifeHistory_Log: [], Hospital_Ledger: [], Household_Ledger: [], Story_Hook_Deck: [] }, profiles });
  assert.ok(none.empty && /no Lived_Events/.test(none.reason));

  // Seat wiring: the slug and name both resolve; a non-seat passes through.
  assert.ok(L.isLivesSeat({ persona: 'tamsin-pruitt' }) && L.isLivesSeat({ name: 'Tamsin Pruitt' }) && !L.isLivesSeat({ persona: 'celeste-tran' }));
  assert.equal(L.enrichAssignment({ persona: 'celeste-tran' }, cycle, root).persona, 'celeste-tran');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
console.log('buildLivesSlice.test.js OK');
