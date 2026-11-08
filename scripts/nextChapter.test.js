#!/usr/bin/env node
'use strict';
/**
 * engine.338 Task 3 — lib/nextChapter.js, pure. The builder's question off the citizen's own life line; the one MOVE
 * line parsed against the closed vocabulary (never his prose); the employer by category; the Advancement_Intake1 row
 * aligned to the tab's header; the one-row-per-citizen dedup; the move-ledger line. Run: node scripts/nextChapter.test.js
 */
const assert = require('assert');
const nc = require('/root/GodWorld/lib/nextChapter');
const wp = require('/root/GodWorld/lib/wakePerception');

let n = 0;
function check(name, fn) { fn(); n++; console.log('ok ' + n + ' — ' + name); }

// the six titles are the catalog's (Task 2d) — the vocabulary and the price table are one list
const E = require('/root/GodWorld/data/economic_parameters.json');
check('every pool title is a catalog title; every clock is one of the four', () => {
  for (const r of nc.ROLES) {
    assert.ok(E.some((x) => x.role === r), r + ' in the catalog');
    assert.ok(['ENGINE', 'GAME', 'CIVIC', 'MEDIA'].includes(nc.POOL[r].clock), r);
  }
  assert.strictEqual(nc.ROLES.length, 6);
});

// the question on his own line — the owed entry's pin (either stamp), newest wins
check('questionFromLines reads the pinned [Question] line, either stamp spelling, newest wins', () => {
  const owed = wp.owedFrom({
    chaos: [['CycleId', 'VehicleType', 'TargetScope', 'TargetId', 'DiceOutcome']],
    casino: [['WagerId', 'POPID', 'CycleSettled', 'Status', 'Stake', 'Payout']],
    hospital: [['POPID', 'AdmitCycle']], judicial: [['POPID', 'ArrestCycle', 'SourceSystem']],
    milestone: [['Timestamp', 'POPID', 'Name', 'EventTag', 'EventText', 'Neighborhood', 'Cycle'], ['x', 'POP-00001', 'Vinnie Keane', 'Question', 'Would you coach?', 'Rockridge', '115']],
  }, 115, {}).owed;
  assert.strictEqual(owed.length, 1);
  assert.strictEqual(owed[0].milestone, 'question');
  assert.strictEqual(owed[0].id, 'milestone:question:POP-00001:c115');
  const lines = [
    'Y3C10 — [Sports] played a game',
    wp.simTag(115) + ' — [Retirement] retired from the A\'s, announced C115 — the playing salary ends; appearances and the name pay $250,000 a year',
    wp.simTag(115) + ' — [Question] Would you take the hitting-coach job next spring?',
  ];
  assert.strictEqual(nc.questionFromLines(lines, owed[0]), 'Would you take the hitting-coach job next spring?');
  assert.strictEqual(nc.questionFromLines(['C115 — [Question] Bare stamp?'], owed[0]), 'Bare stamp?');
  assert.strictEqual(nc.questionFromLines(lines.slice(0, 2), owed[0]), '', 'no question line → nothing asked');
  assert.strictEqual(nc.questionFromLines(lines, { pin: { stamps: ['Y1C1'], re: /^\[Question\]/ } }), '', 'another Cycle\'s pin finds nothing');
  // Question is salient (agy F3): the line holds a slot in the five-line tail after the wake, under newer texture
  const texture = [1, 2, 3, 4, 5, 6].map((i) => 'Y3C1' + i + ' — [Daily] an ordinary day ' + i);
  const tail = wp.lifeTailOf([lines[2]].concat(texture)).split('\n');
  assert.ok(tail.includes(lines[2]), 'the [Question] line survives six newer texture lines: ' + tail.join(' | '));
  assert.strictEqual(tail.length, 5);
});

check('the frame carries the question verbatim and the one closed line, with his Tier\'s titles only (codex F1)', () => {
  const f = nc.questionFrame('Would you coach the kids?', 1);
  assert.ok(f.includes('"Would you coach the kids?"'));
  assert.ok(f.includes('MOVE: role=<one of: ' + nc.ROLES.join(' | ') + ' | none>'), 'Tier 1 is offered everything');
  assert.deepStrictEqual(nc.rolesFor(2), ['Sports Analyst (Front Office)', 'Club Coach / Instructor', 'Scout', 'College Coach', 'Youth Academy Director']);
  assert.deepStrictEqual(nc.rolesFor(3), ['Youth Academy Director']);
  assert.deepStrictEqual(nc.rolesFor(4), [], 'Tier 4 is offered nothing');
  assert.deepStrictEqual(nc.rolesFor(''), [], 'a blank Tier reads as the floor');
  assert.ok(nc.questionFrame('Q?', 4).includes('role=<none'), 'a Tier offered nothing is told to say so');
  assert.ok(!nc.questionFrame('Q?', 2).includes('Broadcaster'));
});
check('parseMove with a Tier refuses an ineligible title, names it; eligible passes; none always passes', () => {
  const p = nc.parseMove('x\nMOVE: role=Sports Broadcaster / Color Analyst', 3);
  assert.strictEqual(p.move, null);
  assert.strictEqual(p.reason, 'tier-gated(Sports Broadcaster / Color Analyst at Tier 3)');
  assert.strictEqual(nc.parseMove('x\nMOVE: role=Youth Academy Director', 3).move.role, 'Youth Academy Director');
  assert.strictEqual(nc.parseMove('x\nMOVE: role=none', 4).move.role, 'none');
  assert.strictEqual(nc.parseMove('x\nMOVE: role=Scout').move.role, 'Scout', 'no Tier given → no gate (the pure parse)');
});

// the MOVE line
check('parseMove: an exact title, the where, the line stripped from the text', () => {
  const p = nc.parseMove('I have thought about it all week.\nThe cage is where I am honest.\nMOVE: role=Club Coach / Instructor | where=Oakland Athletics');
  assert.deepStrictEqual(p.move, { role: 'Club Coach / Instructor', where: 'Oakland Athletics' });
  assert.strictEqual(p.reason, null);
  assert.strictEqual(p.text, 'I have thought about it all week.\nThe cage is where I am honest.');
});
check('parseMove: case-folded title, quotes and angle brackets tolerated, blank where', () => {
  const p = nc.parseMove('Some words.\nMOVE: role="sports analyst (front office)" | where=<>');
  assert.deepStrictEqual(p.move, { role: 'Sports Analyst (Front Office)', where: '' });
  const p2 = nc.parseMove('Some words.\n  move: where= | role=scout.');
  assert.deepStrictEqual(p2.move, { role: 'Scout', where: '' }, 'field order free, trailing period dropped');
});
check('parseMove: a half of a slashed title, or a title without its parenthetical, is the title (the bench\'s "Color Analyst")', () => {
  assert.strictEqual(nc.parseMove('x\nMOVE: role=Color Analyst | where=Oakland A\'s broadcast').move.role, 'Sports Broadcaster / Color Analyst');
  assert.strictEqual(nc.parseMove('x\nMOVE: role=sports broadcaster').move.role, 'Sports Broadcaster / Color Analyst');
  assert.strictEqual(nc.parseMove('x\nMOVE: role=Sports Analyst').move.role, 'Sports Analyst (Front Office)');
  assert.strictEqual(nc.parseMove('x\nMOVE: role=Instructor').move.role, 'Club Coach / Instructor');
  assert.strictEqual(nc.parseMove('x\nMOVE: role=Hitting Coach').move, null, 'a word not on the list is still refused');
  assert.strictEqual(nc.parseMove('x\nMOVE: role=Coach').move, null, 'a bare "Coach" is two titles and none');
  assert.strictEqual(Object.keys(nc.ROLE_ALIASES).length, 11, 'the alias list is closed: 6 titles + 4 halves + 1 unparenthesized');
});
check('parseMove: none → declined shape', () => {
  const p = nc.parseMove('Not for me, not now.\nMOVE: role=none | where=');
  assert.deepStrictEqual(p.move, { role: 'none', where: '' });
});
check('parseMove: off the vocabulary is refused, named; no line is refused; prose is never read', () => {
  assert.strictEqual(nc.parseMove('I would love to be the Hitting Coach.\nMOVE: role=Hitting Coach | where=the A\'s').move, null);
  assert.ok(/^off-vocabulary-role\(Hitting Coach\)$/.test(nc.parseMove('x\nMOVE: role=Hitting Coach').reason));
  assert.strictEqual(nc.parseMove('I think I want to be a Scout for the Oaks.').move, null, 'the title inside his prose is not a move');
  assert.strictEqual(nc.parseMove('I think I want to be a Scout for the Oaks.').reason, 'no-move-line');
  assert.strictEqual(nc.parseMove('x\nMOVE: where=Bay Tribune').reason, 'move-missing-role');
  assert.strictEqual(nc.parseMove('').reason, 'no-move-line');
});
check('parseMove: the LAST MOVE line decides and EVERY MOVE line is stripped from his words (codex F8)', () => {
  const p = nc.parseMove('MOVE: role=Scout\nthen I thought again\nMOVE: role=none');
  assert.strictEqual(p.move.role, 'none');
  assert.strictEqual(p.text, 'then I thought again');
});

// engine.338 F2 — the one predicate every public reader of the feed shares
check('feedPrivacy: a question row is private, in either row shape; everything else is public', () => {
  const fp = require('/root/GodWorld/lib/feedPrivacy');
  assert.strictEqual(fp.isPrivateFeedRow({ EventTrigger: 'question', Notes: 'Coach?' }), true);
  assert.strictEqual(fp.isPrivateFeedRow({ EventTrigger: ' Question ' }), true);
  assert.strictEqual(fp.isPrivateFeedRow({ EventTrigger: 'retirement' }), false);
  assert.strictEqual(fp.isPrivateFeedRow({ EventTrigger: '' }), false);
  assert.strictEqual(fp.isPrivateFeedRow(['115', 'A\'s', 'question'], 2), true);
  assert.strictEqual(fp.isPrivateFeedRow(['115', 'A\'s', 'question'], -1), false, 'no trigger column → nothing is private');
  assert.deepStrictEqual(fp.publicFeedRows([{ EventTrigger: 'question' }, { EventTrigger: 'award' }, {}]).length, 2);
});

// the employer by category
const BIZ = [
  { BIZ_ID: 'BIZ-00005', Name: 'Oakland Athletics', Sector: 'Sports Franchise', Neighborhood: 'Baylight District' },
  { BIZ_ID: 'BIZ-00074', Name: 'Oakland Oaks', Sector: 'Sports', Neighborhood: 'Baylight District' },
  { BIZ_ID: 'BIZ-00018', Name: 'Bay Tribune', Sector: 'Media & Journalism', Neighborhood: 'Downtown' },
  { BIZ_ID: 'BIZ-00099', Name: 'OakTown Echo', Sector: 'Media & Journalism', Neighborhood: 'West Oakland' },
  { BIZ_ID: 'BIZ-00103', Name: 'Firehouse 29 West Oakland Baseball Academy', Sector: 'Sports', Neighborhood: 'West Oakland' },
];
check('resolveEmployer: the place he names wins when it is on the ledger (case / "the" folded)', () => {
  assert.strictEqual(nc.resolveEmployer('Youth Academy Director', 'the firehouse 29 west oakland baseball academy', { nh: 'Rockridge', employerBizId: 'BIZ-00005' }, BIZ).employerBizId, 'BIZ-00103');
  assert.strictEqual(nc.resolveEmployer('Scout', 'Oakland Oaks', { nh: 'Rockridge', employerBizId: 'BIZ-00005' }, BIZ).employerBizId, 'BIZ-00074', 'he can scout for the other club by naming it');
});
check('resolveEmployer: club = his club of record, else the A\'s', () => {
  assert.strictEqual(nc.resolveEmployer('Club Coach / Instructor', '', { nh: 'Downtown', employerBizId: 'BIZ-00074' }, BIZ).employerBizId, 'BIZ-00074');
  assert.strictEqual(nc.resolveEmployer('Sports Analyst (Front Office)', '', { nh: 'Downtown', employerBizId: '' }, BIZ).employerBizId, 'BIZ-00005');
  assert.strictEqual(nc.resolveEmployer('Scout', 'The Ballpark Nobody Tracks', { nh: 'Downtown', employerBizId: 'BIZ-00005' }, BIZ).employerBizId, 'BIZ-00005', 'an unknown name falls to the rule');
});
check('resolveEmployer: media = a Media & Journalism business in his hood, else any, else SELF_EMPLOYED', () => {
  assert.strictEqual(nc.resolveEmployer('Sports Broadcaster / Color Analyst', '', { nh: 'West Oakland', employerBizId: 'BIZ-00005' }, BIZ).employerBizId, 'BIZ-00099');
  assert.strictEqual(nc.resolveEmployer('Sports Broadcaster / Color Analyst', '', { nh: 'Rockridge', employerBizId: 'BIZ-00005' }, BIZ).employerBizId, 'BIZ-00018');
  assert.strictEqual(nc.resolveEmployer('Sports Broadcaster / Color Analyst', '', { nh: 'Rockridge' }, BIZ.slice(0, 2)).employerBizId, 'SELF_EMPLOYED');
});
check('resolveEmployer: College Coach → UNTRACKED unless named; Youth Academy Director → SELF_EMPLOYED unless named', () => {
  assert.strictEqual(nc.resolveEmployer('College Coach', '', { nh: 'Rockridge' }, BIZ).employerBizId, 'UNTRACKED');
  assert.strictEqual(nc.resolveEmployer('Youth Academy Director', '', { nh: 'Rockridge' }, BIZ).employerBizId, 'SELF_EMPLOYED');
  assert.strictEqual(nc.resolveEmployer('Not A Role', '', {}, BIZ).employerBizId, '');
});

// the row, the dedup, the notes, the ledger line
const ADV_H = ['First', 'Middle', 'Last', 'RoleType', 'Tier', 'ClockMode', 'CIV', 'MED', 'UNI', 'Notes', 'BirthYear', 'Neighborhood', 'MatchPopId', 'MatchType', 'MaidenName', '', 'EmployerBizId', 'OwnerOfBizId', 'Gender', 'CitizenBio', 'MatchName', 'HouseholdKey'];
check('intakeRowFor: aligned to the live header — six cells, Tier and flags blank', () => {
  const row = nc.intakeRowFor(ADV_H, { first: 'Vinnie', last: 'Keane', role: 'Club Coach / Instructor', employerBizId: 'BIZ-00005', notes: 'his words: the cage.' });
  assert.strictEqual(row.length, ADV_H.length);
  assert.deepStrictEqual([row[0], row[2], row[3], row[4], row[5], row[9], row[16], row[17]], ['Vinnie', 'Keane', 'Club Coach / Instructor', '', 'GAME', 'his words: the cage.', 'BIZ-00005', '']);
  assert.throws(() => nc.intakeRowFor(['First', 'Last'], { first: 'a', last: 'b', role: 'Scout', employerBizId: 'x', notes: '' }), /header lacks RoleType, ClockMode, EmployerBizId, Notes/);
  assert.throws(() => nc.intakeRowFor(ADV_H, { first: 'a', last: 'b', role: 'Hitting Coach', employerBizId: 'x', notes: '' }), /not a pool title/);
});
check('hasQueuedRow: one row per citizen, case-insensitive', () => {
  const rows = [['Rosa', '', 'Nguyen', 'Accountant / CPA'], ['vinnie', '', 'KEANE', 'Scout']];
  assert.strictEqual(nc.hasQueuedRow(rows, ADV_H, 'Vinnie', 'Keane'), true);
  assert.strictEqual(nc.hasQueuedRow(rows, ADV_H, 'Benji', 'Dillon'), false);
  assert.strictEqual(nc.hasQueuedRow(rows, ['X'], 'Vinnie', 'Keane'), false);
});
check('notesFrom: one line, cut at a sentence end inside the cap', () => {
  assert.strictEqual(nc.notesFrom('Line one.\n\nLine   two.'), 'Line one. Line two.');
  const long = 'A sentence that runs. '.repeat(30);
  const cut = nc.notesFrom(long, 120);
  assert.ok(cut.length <= 120 && /\.$/.test(cut), cut);
  assert.ok(/…$/.test(nc.notesFrom('x'.repeat(200) + ' word', 100)), 'no sentence end → word cut + ellipsis');
});
check('moveLedgerLine: the civic contract — one id per citizen per day, a status, the reason', () => {
  const l = nc.moveLedgerLine({ cycle: 115, date: '2026-11-09', pop: 'POP-00001', name: 'Vinnie Keane', question: 'Coach?', role: 'Scout', where: '', employerBizId: 'BIZ-00005', status: 'queued' });
  assert.strictEqual(l.moveId, 'NC-115-POP-00001-2026-11-09');
  assert.deepStrictEqual([l.cycle, l.pop, l.role, l.status, l.reason, l.employerBizId], [115, 'POP-00001', 'Scout', 'queued', null, 'BIZ-00005']);
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(l.at));
  const d = nc.moveLedgerLine({ cycle: 115, date: '2026-11-09', pop: 'POP-00001', status: 'declined', role: 'none' });
  assert.deepStrictEqual([d.status, d.role, d.employerBizId], ['declined', 'none', '']);
});

console.log('nextChapter.test.js: ' + n + ' checks passed');
