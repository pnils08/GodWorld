'use strict';

const fs = require('fs');
const path = require('path');
const { planColumnAdd } = require('./addInitiativeAuthorshipColumns');
const { TRACKER_HEADERS_31, AUTHORSHIP_HEADERS, createInitiative, loadOfficeSeats } = require('./createInitiative');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const src = fs.readFileSync(path.join(__dirname, 'addInitiativeAuthorshipColumns.js'), 'utf8');
check('APPLY from --apply', /(?:const|let|var)\s+APPLY\s*=\s*process\.argv\.includes\(['"]--apply['"]\)/.test(src));
check('engine-sheet gate', /--i-am-engine-sheet/.test(src));
check('apply refused without gate', /refusing --apply without --i-am-engine-sheet/.test(src));
check('applyLive only after APPLY', /async function applyLive/.test(src) && /if \(APPLY \|\| LIVE_DRY\)/.test(src));
check('does not write LeadFaction', /leadFactionTouched: false/.test(src));

const fix = JSON.parse(fs.readFileSync(
  path.join(__dirname, '__fixtures__', 'initiative-tracker-c103.json'), 'utf8'
));

const plan = planColumnAdd(fix.headers, fix.rows, { backfillMayor: false });
check('adds three columns', plan.added.join(',') === AUTHORSHIP_HEADERS.join(','));
check('28 → 31', plan.headerCountBefore === 28 && plan.headerCountAfter === 31);
check('headers match contract 31', plan.headersAfter.join(',') === TRACKER_HEADERS_31.join(','));
check('LeadFaction not marked touched', plan.leadFactionTouched === false);
check('existing LeadFaction still OPP', plan.rows.every(function (r) { return r.LeadFaction === 'OPP'; }));
check('authorship blank by default', plan.rows.every(function (r) {
  return r.Proposer === '' && r.ProposingOffice === '' && r.ProposedCycle === '';
}));

const filled = planColumnAdd(fix.headers, fix.rows, { backfillMayor: true });
check('optional mayor backfill proposer', filled.rows[0].Proposer === 'Avery Santana');
check('optional mayor backfill office', filled.rows[0].ProposingOffice === 'MAYOR-01');
check('optional backfill leaves ProposedCycle blank', filled.rows[0].ProposedCycle === '');
check('backfill still does not change LeadFaction', filled.rows.every(function (r) { return r.LeadFaction === 'OPP'; }));

const idem = planColumnAdd(plan.headersAfter, plan.rows, {});
check('second pass adds nothing', idem.added.length === 0);

try {
  planColumnAdd(['InitiativeID', 'Proposer'], [{}], {});
  check('partial headers fail', false);
} catch (e) {
  check('partial headers fail', /partial authorship/.test(e.message));
}

const minted = createInitiative({
  headers: plan.headersAfter,
  rows: plan.rows,
  seats: loadOfficeSeats(),
  spec: {
    name: 'KONO corridor audit',
    type: 'vote',
    policyDomain: 'economic',
    affectedNeighborhoods: 'KONO',
    proposingOffice: 'COUNCIL-D7',
    proposedCycle: 104,
  },
});
check('mint on migrated copy is CRC', minted.row.LeadFaction === 'CRC');
check('mint does not alter fixture LeadFaction', plan.rows[0].LeadFaction === 'OPP');

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('addInitiativeAuthorshipColumns: ok');
