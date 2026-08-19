'use strict';

// civic.27 — the agenda/hearing no-phase wall must be REPAIRABLE, not fatal.
// Before this, a model that stamped ImplementationPhase on the agenda turn passed
// validateVoiceJson (the phase is in the contract vocabulary), so callVoice's
// retry loop never saw the violation; runMayorOpen caught it after the fact and
// process.exit(1)'d the whole Sunday chain. Two consecutive c103 attempts died
// that way with the model never once told what it broke.

const { hearingHasPhase, noPhaseCheck } = require('./cron-civic-run');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const clean = { statements: [{ decision: 'floor is open', trackerUpdates: {} }] };
const flatPhase = { statements: [{ decision: 'x', trackerUpdates: { initiative: 'INIT-003', ImplementationPhase: 'In Progress' } }] };
const keyedPhase = { statements: [{ decision: 'x', trackerUpdates: { 'Transit Hub Phase II': { ImplementationPhase: 'In Progress' } } }] };
const mixed = { statements: [{ decision: 'clean', trackerUpdates: {} }, flatPhase.statements[0]] };

check('clean agenda has no phase', hearingHasPhase(clean) === false);
check('flat-shape phase detected', hearingHasPhase(flatPhase) === true);
check('keyed-shape phase detected (was the blind spot)', hearingHasPhase(keyedPhase) === true);
check('any offending statement trips it', hearingHasPhase(mixed) === true);
check('empty/garbage input is safe', hearingHasPhase(null) === false && hearingHasPhase({}) === false);
check('null trackerUpdates is safe', hearingHasPhase({ statements: [{ decision: 'x', trackerUpdates: null }] }) === false);

check('clean agenda returns no rejection reason', noPhaseCheck(clean) === null);
const why = noPhaseCheck(flatPhase);
check('violation returns a reason string', typeof why === 'string' && why.length > 0);
check('reason names the field the model must drop', !!why && why.includes('ImplementationPhase'));
check('reason tells the model what to do instead', !!why && /trackerUpdates as \{\}|omit ImplementationPhase/.test(why));
check('keyed shape also gets a reason', typeof noPhaseCheck(keyedPhase) === 'string');

console.log('\n[civic.27] ' + (failed ? failed + ' FAILED' : 'all assertions passed'));
process.exit(failed ? 1 : 0);
