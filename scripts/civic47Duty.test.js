'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { planDutyRota } = require('./civicDutyQueue');
const { pilotPolicy } = require('./civic47PilotPolicy');
const { normalizeEnvelope, actionLines, appendSession } = require('./civicActionSession');
const { validateDatawakeMoves, civicDutyDay } = require('./cron-civic-run');

const seats = [
  { officeId: 'MAYOR-01', agentDir: 'syn-mayor', district: 'citywide' },
  ...Array.from({ length: 9 }, (_, n) => ({ officeId: 'COUNCIL-D' + (n + 1),
    agentDir: 'syn-d' + (n + 1), district: 'D' + (n + 1) })),
  { officeId: 'CHIEF-POLICE', agentDir: 'syn-chief', district: 'citywide' },
];
const noEvents = { generation: { cycle: 120 }, events: [] };
assert.strictEqual(pilotPolicy(false), null);
assert.strictEqual(pilotPolicy(true).version, 'CIVIC47-PILOT-PROPOSAL/1');
assert.strictEqual(pilotPolicy(true).duty.regularTarget, 2);
assert.strictEqual(pilotPolicy(true).duty.eventTarget, 2);
assert.strictEqual(civicDutyDay(5, null), false);
assert.strictEqual(civicDutyDay(6, null), false);
assert.strictEqual(civicDutyDay(5, pilotPolicy(true)), true);
assert.strictEqual(civicDutyDay(6, pilotPolicy(true)), true);
assert.strictEqual(civicDutyDay(0, pilotPolicy(true)), false);
const results = [];
for (const date of ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05']) {
  const plan = planDutyRota(seats, results, noEvents, date, 6);
  assert(plan.selected.length <= 6);
  for (const s of plan.selected) results.push({ date, office: s.office.agentDir,
    dutyKind: s.dutyKind, eventKeys: s.eventKeys, ok: true });
}
for (const seat of seats) {
  const count = results.filter(r => r.office === seat.agentDir && r.dutyKind === 'regular').length;
  assert.strictEqual(count, seat.officeId === 'CHIEF-POLICE' ? 1 : 2);
}
const eventView = { generation: { cycle: 120 }, events: [{
  eventId: 'EV-syn', sourceRevision: 'rev1', occurredCycle: 120,
  significance: 'major', status: 'occurred', citywideRelevance: true, hoods: ['Downtown'],
}] };
const eventPlan = planDutyRota(seats, [], eventView, '2026-11-02', 6);
assert(eventPlan.selected.some(x => x.office.officeId === 'MAYOR-01' && x.eventKeys.includes('EV-syn@rev1')));
assert(eventPlan.selected.some(x => x.office.officeId === 'COUNCIL-D2' && x.eventKeys.includes('EV-syn@rev1')));
const friday = planDutyRota(seats, [], eventView, '2026-11-06', 6, pilotPolicy(true).duty);
assert(friday.selected.length > 0);
assert(friday.selected.every(x => x.dutyKind === 'event' && x.office.officeId !== 'CHIEF-POLICE'));
assert.strictEqual(friday.owed.find(x => x.office === 'syn-mayor').regular, 2);
assert.strictEqual(planDutyRota(seats, [], noEvents, '2026-11-06', 6,
  pilotPolicy(true).duty).selected.length, 0);
assert.strictEqual(planDutyRota(seats, [], eventView, '2026-11-08', 6,
  pilotPolicy(true).duty).selected.length, 0);
const nextWeek = planDutyRota(seats, [{ date: '2026-11-06', office: 'syn-d2',
  dutyKind: 'event', eventKeys: ['EV-syn@rev1'], ok: true }], eventView,
  '2026-11-09', 6, pilotPolicy(true).duty);
assert(!nextWeek.selected.some(x => x.office.agentDir === 'syn-d2' && x.eventKeys.includes('EV-syn@rev1')));
const failed = [{ date: '2026-11-02', office: 'syn-d1', dutyKind: 'regular', ok: false }];
for (const date of ['2026-11-03', '2026-11-04', '2026-11-05']) {
  const plan = planDutyRota(seats, failed, noEvents, date, 6);
  for (const s of plan.selected) failed.push({ date, office: s.office.agentDir,
    dutyKind: s.dutyKind, eventKeys: s.eventKeys, ok: true });
}
assert(failed.some(x => x.office === 'syn-d1' && x.ok), 'transport failure receives a later opportunity');

const envelope = normalizeEnvelope({ statements: [{ text: 'Synthetic statement' }],
  answers: [{ confrontationId: 'CONF-120-syn-d2', text: 'Synthetic answer' }],
  decisions: [{ type: 'work', initiativeId: 'INIT-SYN1', clientActionId: 'D1' },
    { type: 'work', initiativeId: 'INIT-SYN2', clientActionId: 'D2', dependsOn: ['D1'] },
    { type: 'work', initiativeId: 'INIT-SYN3', clientActionId: 'D3' }],
  upkeep: [{ initiativeId: 'INIT-SYN4' }] });
assert.strictEqual(envelope.moves.length, 5);
const office = seats[2];
const verdict = validateDatawakeMoves(envelope.moves, { office, cycle: 120, civic47Pilot: true,
  boardIds: new Set(['INIT-SYN1', 'INIT-SYN2', 'INIT-SYN3', 'INIT-SYN4']),
  confrontations: [{ id: 'CONF-120-syn-d2', cycle: 120, agentDir: 'syn-d2' }],
  answerEvidenceAvailable: true });
assert.deepStrictEqual(verdict.accepted.map(x => x.type), ['answer', 'work', 'work', 'work', 'work']);
assert.strictEqual(verdict.rejected.length, 0);
const independent = validateDatawakeMoves([
  { type: 'work', initiativeId: 'BAD', clientActionId: 'D1' },
  { type: 'work', initiativeId: 'INIT-SYN2', clientActionId: 'D2', dependsOn: ['D1'] },
  { type: 'work', initiativeId: 'INIT-SYN3', clientActionId: 'D3' },
], { office, cycle: 120, civic47Pilot: true, boardIds: new Set(['INIT-SYN2', 'INIT-SYN3']) });
assert.deepStrictEqual(independent.accepted.map(x => x.payload.initiativeId), ['INIT-SYN3']);
assert(independent.rejected.some(x => x.reason.includes('dependency-input-unavailable')));

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'civic47-session-'));
try {
  const lines = actionLines(office, 120, '2026-11-02', verdict, 'syn-hash');
  assert.strictEqual(new Set(lines.map(x => x.moveId)).size, lines.length);
  const withoutFirst = actionLines(office, 120, '2026-11-02',
    { accepted: verdict.accepted.slice(1), rejected: [] }, 'syn-hash');
  assert.strictEqual(withoutFirst[0].moveId, lines[1].moveId,
    'accepted action identity is tied to the original client ID, not the accepted list position');
  assert.strictEqual(appendSession(root, 120, lines).appended, lines.length);
  assert.strictEqual(appendSession(root, 120, lines).replayed, lines.length);
  const changed = lines.map(x => ({ ...x }));
  changed[0].payloadHash = 'changed';
  assert.throws(() => appendSession(root, 120, changed), /identity conflict/);
  const file = path.join(root, 'output', 'cron-civic', 'moves', 'moves_c120.jsonl');
  assert.strictEqual(fs.readFileSync(file, 'utf8').trim().split('\n').length, lines.length);
} finally { fs.rmSync(root, { recursive: true, force: true }); }
console.log('civic47 duty and session: ok');
