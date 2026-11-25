'use strict';

// pipeline.111 — the test-shell morning packet with nothing assigned (buildFreeAnglePacket).
// Synthetic data only: TEST- ids, made-up names and figures.

const assert = require('assert');
const v1 = require('./livedExperiencePacket');
const v2 = require('./livedExperiencePacketV2');

const story = {
  kind: 'beat-test', ref: 'TEST beat record',
  label: 'TEST Station Alpha riders up 100 against last cycle',
  angle: 'TEST Station Alpha riders up 100 against last cycle — the platforms and the people who run them',
  hookLine: 'TEST Station Alpha moved up the most this cycle',
  citizens: ['Test Rider One (TEST-00001)', 'Test Driver Two (TEST-00002)'],
  popids: ['TEST-00001', 'TEST-00002'],
};
const slice = {
  prewrite: {
    anchorFacts: [
      'TEST Station Alpha: 1,100 riders this cycle, 1,000 last cycle',
      'TEST Station Beta: 900 riders this cycle, 950 last cycle',
      'CASINO: a money line the planner never sees',
      'Never invent a station that is not on this list',
    ],
    presentFacts: ['TEST corridor Gamma ran 12 minutes slow on one day'],
    evidence: [{ text: 'TEST Station Beta: 900 riders this cycle, 950 last cycle', src: 'TEST tab row 2' }],
  },
};
const candidates = [
  { pop: 'TEST-00001', name: 'Test Rider One', profile: 'Test Rider One — rider', why: 'named', role: 'rider', hood: 'Testville',
    mode: 'named', sourceKind: 'named', evidence: null },
  { pop: 'TEST-00002', name: 'Test Driver Two', profile: 'Test Driver Two — driver', why: 'named', role: 'driver', hood: 'Testville',
    mode: 'named', sourceKind: 'named', evidence: null },
  { pop: 'TEST-00003', name: 'Test Filler Three', profile: 'filler', why: 'fill', ledgerFill: true },
];
const reporter = { popid: 'TEST-09999', name: 'Test Reporter' };
const base = { cycle: 999, desk: 'civic', reporter, story, approach: 'TEST approach: read the rows this way.', slice, lane: [], candidates };

// control — the assigned packet still carries what it carried
const assigned = v1.buildAnglePacket(base);
assert.strictEqual(assigned.task.goal, 'Plan one Article chase without choosing a new assignment');
assert.ok(assigned.task.assignment.includes('Station Alpha'));
assert.ok(assigned.task.approach);
assert.ok(/what does not line up/.test(assigned.output.schema.chase));
assert.strictEqual(assigned.output.schema.pass, undefined);

// free on the same rows: what is given, with no line made the story
const rows = v1.buildAnglePacket(Object.assign({}, base, { free: { rows: true } }));
assert.strictEqual(rows.wake, 'W1');
assert.strictEqual(rows.task.assignment, undefined);
assert.strictEqual(rows.task.approach, undefined);
assert.strictEqual(rows.task.creativeBrief, undefined);
assert.ok(!/assign/i.test(JSON.stringify(rows.task)));
assert.ok(!/line up/i.test(JSON.stringify(rows.output)));
assert.ok(!/assigned/i.test(rows.limits.rule));
assert.deepStrictEqual(rows.exposure.basis, ['own-pick']);
assert.deepStrictEqual(rows.known.map(c => c.text), [
  'TEST Station Alpha: 1,100 riders this cycle, 1,000 last cycle',
  'TEST Station Beta: 900 riders this cycle, 950 last cycle',
  'TEST corridor Gamma ran 12 minutes slow on one day',
]);
assert.strictEqual(rows.known[1].src, 'TEST tab row 2');             // a row keeps its own source
assert.strictEqual(rows.known[0].src, 'TEST beat record');
assert.ok(!rows.known.some(c => c.text === story.label || c.text === story.hookLine));   // the story line and hook are not handed over
assert.deepStrictEqual(rows.exposure.candidates.map(c => c.pop), ['TEST-00001', 'TEST-00002']);   // the ledger fill-in stays out
assert.ok(rows.output.schema.pass);
assert.strictEqual(rows.actor.background, undefined);                // no background given, none carried
const withBackground = v1.buildAnglePacket(Object.assign({}, base, { free: { rows: true, background: '  Who you are: a TEST engineer.  ' } }));
assert.strictEqual(withBackground.actor.background, 'Who you are: a TEST engineer.');

// free on the city's week: only the lines given, long ones whole
const long = 'TEST week line ' + 'x'.repeat(900);
const week = v1.buildAnglePacket(Object.assign({}, base, { free: { week: [
  { text: 'TEST gridlock on one day', src: 'TEST world summary — What Moved' },
  { text: long, src: 'TEST world summary — Sports' },
  { text: '', src: 'TEST dropped' },
] } }));
assert.deepStrictEqual(week.known.map(c => c.text), ['TEST gridlock on one day', long]);
assert.throws(() => v1.buildAnglePacket(Object.assign({}, base, { slice: null, free: { week: [] } })), /nothing on the record/);

// the v2 wrapper carries it through: version, the cycle line, fact ids
const week2 = v2.buildAnglePacket(Object.assign({}, base, { free: { week: [{ text: 'TEST gridlock on one day', src: 'TEST src' }] } }));
assert.strictEqual(week2.v, 'LEP/2');
assert.strictEqual(week2.known[0].text, 'Current cycle: C999');
assert.ok(week2.known.every(c => c.id));
assert.ok(v2.prompt(week2).startsWith('PACKET_JSON'));

// a pass with its reason is a whole answer; a pass with none is not
assert.deepStrictEqual(v1.validateAngleOutput({ pass: true, why: 'Nothing on my beat moved this cycle.' }, rows),
  { pass: true, why: 'Nothing on my beat moved this cycle.', chase: '', focus: '', checks: [], targets: [], interpretation: '', unverifiedLead: [] });
assert.throws(() => v1.validateAngleOutput({ pass: true }, rows), /a pass needs its reason/);

// a pick on a subject of the seat's own choosing is a plan, where the assigned packet rejects it
const ownPick = {
  chase: 'I would rather sit at the quiet bakery counter nobody wrote about.',   // shares no long word with the assignment
  focus: 'the quiet bakery counter', why: 'it is where the morning happens', checks: [],
  targets: [{ pop: 'TEST-00001', question: 'What does your morning look like?', basis: 'a regular' }],
  interpretation: 'a morning habit', unverifiedLead: [],
};
const plan = v1.validateAngleOutput(ownPick, rows);
assert.strictEqual(plan.focus, 'the quiet bakery counter');
assert.deepStrictEqual(plan.targets.map(t => t.pop), ['TEST-00001']);
assert.throws(() => v1.validateAngleOutput(ownPick, assigned), /chase replaces the assignment/);
// in the assigned packet a pass flag is not an answer
assert.throws(() => v1.validateAngleOutput({ pass: true, why: 'nothing' }, assigned), /invalid W1 output/);
// pipeline.111 (builder 2026-11-25: "take the restriction out, keep the cap"): a free plan may name anyone in the city —
// but not a name the ledger does not hold, the reporter, or Tribune staff; a pick still needs its question and basis
assert.throws(() => v1.validateAngleOutput(Object.assign({}, ownPick, {
  targets: [{ pop: 'TEST-07777', question: 'q', basis: 'b' }] }), rows), /target is not a ledger citizen/);
assert.throws(() => v1.validateAngleOutput(Object.assign({}, ownPick, {
  targets: [{ pop: 'TEST-00001', question: 'q', basis: '' }] }), rows), /target needs question\+basis/);
{
  const fs = require('fs');
  const snap = require('path').join(__dirname, '..', 'output', 'simulation_ledger_snapshot.jsonl');
  const ledger = fs.existsSync(snap) ? fs.readFileSync(snap, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
  const citizen = ledger.find(r => String(r.Status).toLowerCase() === 'active' && !/^y/i.test(String(r['MED (y/n)'] || '')) && /^POP-\d+$/.test(r.POPID));
  const staff = ledger.find(r => String(r.Status).toLowerCase() === 'active' && /^y/i.test(String(r['MED (y/n)'] || '')) && /^POP-\d+$/.test(r.POPID));
  if (citizen) {
    const off = v1.validateAngleOutput(Object.assign({}, ownPick, { targets: [{ pop: citizen.POPID.toLowerCase(), question: 'q', basis: 'b' }] }), rows);
    assert.deepStrictEqual(off.targets.map(t => t.pop), [citizen.POPID]);   // off the record, on the ledger: asked
    const pick = v1.reporterPickCandidate({ pop: citizen.POPID, basis: 'b' });
    assert.strictEqual(pick.sourceKind, 'reporter-pick');
    assert.strictEqual(pick.evidence.basis, 'b');
    const selfRows = JSON.parse(JSON.stringify(rows)); selfRows.actor.id = citizen.POPID;
    assert.throws(() => v1.validateAngleOutput(Object.assign({}, ownPick, { targets: [{ pop: citizen.POPID, question: 'q', basis: 'b' }] }), selfRows), /target is the reporter/);
  }
  if (staff) assert.throws(() => v1.validateAngleOutput(Object.assign({}, ownPick, {
    targets: [{ pop: staff.POPID, question: 'q', basis: 'b' }] }), rows), /target is Tribune staff/);
}

// agy 2026-11-25 #5.2: a records seat's plan is not told it may name people
{
  const recordsPlan = v1.buildAnglePacket(Object.assign({}, base, { free: { rows: true, interviews: false } }));
  assert.deepStrictEqual(recordsPlan.output.schema.targets, []);
  assert.ok(/You interview no one/.test(recordsPlan.output.rule));
}

// the evening packet for a seat that picked for itself: what it knows and the grammar, no shape, no slot, no footer
const reviewProfile = { id: 'test-profile', canonPolicy: 'load-bearing', canonBlockers: ['an invented TEST station'] };
const writeArgs = { cycle: 999, desk: 'civic', reporter, story: { kind: 'own-pick', ref: 'own pick, C999', label: plan.focus, angle: plan.focus },
  approach: null, angleInput: v2.buildAnglePacket(Object.assign({}, base, { free: { rows: true } })), anglePlan: plan,
  interviews: [], officeRecords: [], lane: [], runningStories: [], reviewProfile };
const usual = v2.buildWritePacket(writeArgs);
assert.ok(/unanswered question/.test(usual.output.rule));
assert.ok(usual.manifest.permittedInterpretationSlots.some(s => s.id === 'P_ACCOUNTABILITY'));
assert.ok(/SELF-SCORE/.test(usual.output.footer));
const bare = v2.buildWritePacket(Object.assign({}, writeArgs, { bare: true }));
assert.ok(!/lede|unanswered|scene/i.test(bare.output.rule));
assert.ok(/Every CLAIM must point/.test(bare.output.rule));
assert.strictEqual(bare.output.footer, '');
const briefed = JSON.parse(JSON.stringify(writeArgs.angleInput));
briefed.task.creativeBrief = { kind: 'beat-slice', domain: 'test', facts: ['TEST fact'], roomIsYours: 'the TEST platform at 7:40' };
const bareBriefed = v2.buildWritePacket(Object.assign({}, writeArgs, { angleInput: briefed, approach: 'TEST approach', bare: true }));
assert.strictEqual(bareBriefed.task.approach, null);
assert.strictEqual(bareBriefed.task.creativeBrief.roomIsYours, undefined);   // the handed scene is gone
assert.deepStrictEqual(bareBriefed.task.creativeBrief.facts, ['TEST fact']);  // the facts are not
assert.deepStrictEqual(bare.manifest.permittedInterpretationSlots.map(s => s.id), ['P_EMPHASIS']);
assert.ok(!/Do not brief the record|Lead with/.test(JSON.stringify([bare.task, bare.limits])));
assert.strictEqual(bare.task.assignment, 'the quiet bakery counter');   // the seat's own pick is the piece
assert.deepStrictEqual(bare.output.intake, usual.output.intake);          // the grammar the pipeline parses is untouched
assert.deepStrictEqual(bare.known.map(c => c.text), usual.known.map(c => c.text));

console.log('livedPacketFreeAngle.test.js: ok');
