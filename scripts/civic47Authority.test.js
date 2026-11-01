'use strict';

const assert = require('assert');
const { activeHolder, treasuryBalance, classifyAction, planReservations, hash } = require('./civic47Authority');

const policy = { version: 'SYN-POLICY/1', localEventMaxCost: 100,
  localServiceMaxCost: 80, citywideMaxCost: 150, localEventMaxCycles: 2 };
const office = { officeId: 'COUNCIL-D2', district: 'D2', popid: 'POP-SYN01' };
const mayor = { officeId: 'MAYOR-01', district: 'citywide', popid: 'POP-SYN02' };
const officeRows = [
  { OfficeId: 'COUNCIL-D2', PopId: 'POP-SYN01', Status: 'active' },
  { OfficeId: 'MAYOR-01', PopId: 'POP-SYN02', Status: 'active' },
];
const treasuryRows = [{ Cycle: '120', BalanceAfter: '120' }];
const event = { capability: 'event', hoods: ['Downtown'], scope: 'district',
  durationCycles: 1, cost: 70, title: 'A synthetic celebration' };
assert(activeHolder(office, officeRows).available);
assert(!activeHolder({ ...office, popid: 'POP-SYN03' }, officeRows).available);
assert(!treasuryBalance(treasuryRows, 121).available);
assert.strictEqual(classifyAction(event, office, policy).route, 'delegated');
assert.strictEqual(classifyAction({ ...event, title: 'A synthetic capital event',
  capability: 'capital' }, office, policy).route, 'vote');
assert.strictEqual(classifyAction({ ...event, cost: 101 }, office, policy).route, 'vote');
assert.strictEqual(classifyAction({ ...event, hoods: ['Downtown', 'Fruitvale'] }, office, policy).route, 'hold');
assert.strictEqual(classifyAction({ ...event, hoods: ['Downtown', 'Fruitvale'],
  scope: 'citywide' }, mayor, policy).route, 'delegated');
assert.strictEqual(classifyAction(event, office, null).route, 'hold');
const first = planReservations([
  { actionId: 'SYN-A', office, action: event },
  { actionId: 'SYN-B', office, action: { ...event, cost: 60 } },
], { officeRows, treasuryRows, cycle: 120, policy });
assert.deepStrictEqual(first.results.map(x => x.status), ['reserved', 'held']);
assert.strictEqual(first.results[1].reason, 'insufficient-unreserved-balance');
const duplicate = planReservations([
  { actionId: 'SYN-A', office, action: event },
  { actionId: 'SYN-A', office, action: event },
], { officeRows, treasuryRows, cycle: 120, policy });
assert.deepStrictEqual(duplicate.results.map(x => x.status), ['reserved', 'already-reserved']);
const afterRestart = planReservations([{ actionId: 'SYN-A', office, action: event }], {
  officeRows, treasuryRows, cycle: 120, policy,
  existingReservations: [{ actionId: 'SYN-A', cost: 70,
    payloadHash: hash(event), status: 'reserved' }],
});
assert.strictEqual(afterRestart.results[0].status, 'already-reserved');
assert.strictEqual(afterRestart.remaining, 50);
console.log('civic47 authority: ok');
