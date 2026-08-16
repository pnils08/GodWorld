'use strict';

const fs = require('fs');
const path = require('path');
const C = require('./createInitiative');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const fix = JSON.parse(fs.readFileSync(
  path.join(__dirname, '__fixtures__', 'initiative-tracker-c103.json'), 'utf8'
));
const seats = C.loadOfficeSeats();
const headers31 = C.TRACKER_HEADERS_31;

check('fixture is 28 headers', fix.headers.length === 28);
check('fixture has 6 rows', fix.rows.length === 6);
check('opening vote/program is announced', C.openingPhase('vote') === 'announced' && C.openingPhase('program') === 'announced');
check('opening visioning is visioning', C.openingPhase('visioning') === 'visioning');
check('next id is INIT-008 (does not reuse 004)', C.nextInitiativeId(fix.rows) === 'INIT-008');

try {
  C.requireAuthorshipHeaders(fix.headers);
  check('28-col headers fail loud', false);
} catch (e) {
  check('28-col headers fail loud', /missing authorship/.test(e.message));
}

const d7 = C.createInitiative({
  headers: headers31,
  rows: fix.rows,
  seats: seats,
  spec: {
    name: 'KONO corridor audit',
    type: 'vote',
    policyDomain: 'economic',
    affectedNeighborhoods: 'KONO',
    proposingOffice: 'COUNCIL-D7',
    proposedCycle: 104,
  },
});
check('D7 id INIT-008', d7.row.InitiativeID === 'INIT-008');
check('D7 LeadFaction is CRC not OPP', d7.row.LeadFaction === 'CRC');
check('D7 proposer is Ashford', d7.row.Proposer === 'Warren Ashford');
check('D7 office', d7.row.ProposingOffice === 'COUNCIL-D7');
check('D7 phase announced', d7.row.ImplementationPhase === 'announced');
check('D7 status proposed', d7.row.Status === 'proposed');
check('D7 values length 31', d7.values.length === 31);

const d4 = C.createInitiative({
  headers: headers31,
  rows: fix.rows,
  seats: seats,
  spec: {
    name: 'Ivy Hill sidewalk repair',
    type: 'program',
    policyDomain: 'housing',
    affectedNeighborhoods: 'Ivy Hill',
    proposingOffice: 'COUNCIL-D4',
    proposedCycle: 104,
  },
});
check('D4 LeadFaction is IND', d4.row.LeadFaction === 'IND');
check('D4 proposer Vega', d4.row.Proposer === 'Ramon Vega');

const vis = C.createInitiative({
  headers: headers31,
  rows: fix.rows,
  seats: seats,
  spec: {
    name: 'Fruitvale night-market visioning',
    type: 'visioning',
    policyDomain: 'economic',
    affectedNeighborhoods: 'Fruitvale',
    proposingOffice: 'MAYOR-01',
    proposedCycle: 104,
  },
});
check('mayor visioning phase', vis.row.ImplementationPhase === 'visioning');
check('mayor LeadFaction from seat (OPP)', vis.row.LeadFaction === 'OPP');

function throws(label, fn, re) {
  try { fn(); check(label, false); }
  catch (e) { check(label, re.test(e.message), e.message); }
}

throws('DA cannot author', function () {
  C.createInitiative({
    headers: headers31, rows: fix.rows, seats: seats,
    spec: { name: 'x', type: 'vote', policyDomain: 'safety', affectedNeighborhoods: 'Downtown', proposingOffice: 'DA-01', proposedCycle: 104 },
  });
}, /MAYOR-01 or COUNCIL/);

throws('vacant cannot author', function () {
  const vacant = seats.map(function (s) {
    return s.officeId === 'COUNCIL-D8' ? Object.assign({}, s, { status: 'vacant' }) : s;
  });
  C.createInitiative({
    headers: headers31, rows: fix.rows, seats: vacant,
    spec: { name: 'x', type: 'vote', policyDomain: 'health', affectedNeighborhoods: 'Lake Merritt', proposingOffice: 'COUNCIL-D8', proposedCycle: 104 },
  });
}, /vacant/);

const recovering = C.createInitiative({
  headers: headers31,
  rows: fix.rows,
  seats: seats.map(function (s) {
    return s.officeId === 'COUNCIL-D6' ? Object.assign({}, s, { status: 'recovering' }) : s;
  }),
  spec: {
    name: 'Piedmont Ave clinic hours',
    type: 'vote',
    policyDomain: 'health',
    affectedNeighborhoods: 'Piedmont Ave',
    proposingOffice: 'COUNCIL-D6',
    proposedCycle: 104,
  },
});
check('recovering may file', recovering.row.ProposingOffice === 'COUNCIL-D6' && recovering.row.LeadFaction === 'CRC');

throws('wrong proposer name', function () {
  C.createInitiative({
    headers: headers31, rows: fix.rows, seats: seats,
    spec: { name: 'x', type: 'vote', policyDomain: 'safety', affectedNeighborhoods: 'Downtown', proposingOffice: 'COUNCIL-D7', proposer: 'Janae Rivers', proposedCycle: 104 },
  });
}, /does not match holder/);

throws('non-canon hood', function () {
  C.createInitiative({
    headers: headers31, rows: fix.rows, seats: seats,
    spec: { name: 'x', type: 'vote', policyDomain: 'safety', affectedNeighborhoods: 'Bridgeport', proposingOffice: 'COUNCIL-D7', proposedCycle: 104 },
  });
}, /non-canon neighborhood/);

throws('bad domain', function () {
  C.createInitiative({
    headers: headers31, rows: fix.rows, seats: seats,
    spec: { name: 'x', type: 'vote', policyDomain: 'tech', affectedNeighborhoods: 'Downtown', proposingOffice: 'COUNCIL-D7', proposedCycle: 104 },
  });
}, /policyDomain/);

const existingFactions = fix.rows.map(function (r) { return r.LeadFaction; });
check('existing six stay OPP in fixture', existingFactions.every(function (f) { return f === 'OPP'; }));

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('createInitiative: ok');
