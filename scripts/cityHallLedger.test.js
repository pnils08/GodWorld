'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const L = require('./cityHallLedger');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const roster = [
  { officeId: 'COUNCIL-D1', holder: 'T1', district: 'D1', status: 'active' },
  { officeId: 'COUNCIL-D2', holder: 'T2', district: 'D2', status: 'active' },
  { officeId: 'COUNCIL-D3', holder: 'T3', district: 'D3', status: 'active' },
  { officeId: 'COUNCIL-D4', holder: 'T4', district: 'D4', status: 'active' },
  { officeId: 'COUNCIL-D5', holder: 'T5', district: 'D5', status: 'active' },
  { officeId: 'COUNCIL-D6', holder: 'T6', district: 'D6', status: 'recovering' },
  { officeId: 'COUNCIL-D7', holder: 'T7', district: 'D7', status: 'active' },
  { officeId: 'COUNCIL-D8', holder: 'T8', district: 'D8', status: 'active' },
  { officeId: 'COUNCIL-D9', holder: 'T9', district: 'D9', status: 'active' },
];

const seats = L.voteDispositions(roster, { 'COUNCIL-D7': 'NO' });
check('nine seats', seats.length === 9);
check('recovering is ABSENT', seats.find(s => s.officeId === 'COUNCIL-D6').disposition === 'ABSENT');
check('spoken NO kept', seats.find(s => s.officeId === 'COUNCIL-D7').disposition === 'NO');
check('unspoken active is no-action', seats.find(s => s.officeId === 'COUNCIL-D1').disposition === 'no-action');

let led = L.emptyLedger(104);
led = L.appendHearing(led, L.hearingRow(
  { officeId: 'COUNCIL-D7', popid: 'POP-TEST07', holder: 'T7', district: 'D7', faction: 'CRC' },
  { statements: [{ quote: 'stand with KONO', decision: 'audit KONO' }] },
  'output/civic-voice/council_d7_c104.json',
  { lever: 'stand with KONO or leave it', seatStatus: 'active' }
));
led = L.setVote(led, 'INIT-005', roster, { 'COUNCIL-D7': 'NO' });
led = L.writeGavel(led, { officeId: 'MAYOR-01', popid: 'POP-TEST00', holder: 'TM' },
  { statements: [{ trackerUpdates: { initiative: 'INIT-005', ImplementationPhase: 'construction-active' }, quote: 'signed' }] },
  'output/civic-voice/mayor_gavel_c104.json',
  L.gavelPhases({ statements: [{ trackerUpdates: { initiative: 'INIT-005', ImplementationPhase: 'construction-active', MayoralAction: 'signed' } }] })
);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cityhall-led-'));
const saved = L.save(led, tmp);
const back = L.loadOrCreate(104, tmp);
check('disk path', saved.includes('city-hall-ledger_c104.json'));
check('hearing row', back.hearing[0].officeId === 'COUNCIL-D7' && back.hearing[0].quote.includes('KONO'));
check('vote nine', back.votes[0].seats.length === 9);
check('gavel phase from mayor only', back.gavel.dispositions[0].implementationPhase === 'construction-active');

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('cityHallLedger: ok');
