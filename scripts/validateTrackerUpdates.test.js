// Test for the pre-assembly tracker validator (S265 civic.14 Phase 2).
var fs = require('fs');
var path = require('path');
var { validateRecords, validateCycle } = require('./validateTrackerUpdates');

var pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; console.log('  PASS  ' + label); } else { fail++; console.log('  FAIL  ' + label); } }
function has(arr, code) { return arr.some(function (e) { return e.code === code; }); }

console.log('=== validateTrackerUpdates (C98 conformance cases) ===');

// G-R1: Mayor INIT-001 non-canonical phase + (separately) missing attribution
var r1 = validateRecords([
  { source: 'voice:mayor#INIT-001', shape: 'object', initiativeId: 'INIT-001',
    trackerUpdates: { ImplementationPhase: 'Active — Disbursement Recovery', MilestoneNotes: 'get-well plan' } },
]);
ok(has(r1.warnings, 'phase-drift-partial'), 'G-R1: mappable mayor phase → warning (gate normalizes), not a hard block');
ok(r1.violations.length === 0, 'G-R1 mappable case has no hard violation');

// G-R1: truly unresolvable phase → HARD
var r2 = validateRecords([
  { source: 'voice:mayor#INIT-007', shape: 'object', initiativeId: 'INIT-007',
    trackerUpdates: { ImplementationPhase: 'Active — Council Floor Vote Pending' } },
]);
ok(has(r2.violations, 'phase-unresolvable'), 'G-R1: unresolvable phase → HARD violation (would go dark)');

// G-R1: missing initiative attribution → HARD
var r3 = validateRecords([
  { source: 'voice:mayor#stmt1', shape: 'object', initiativeId: null,
    trackerUpdates: { ImplementationPhase: 'implementation-active', MilestoneNotes: 'x' } },
]);
ok(has(r3.violations, 'missing-initiative-attribution'), 'G-R1: no resolvable InitiativeID → HARD (write would drop)');

// G-R2: flat-array envelope drift → warning
var r4 = validateRecords([
  { source: 'voice:okoro_c98.json#s1', shape: 'flat-array-element', initiativeId: 'INIT-001',
    trackerUpdates: { ImplementationPhase: 'disbursement-active' } },
]);
ok(has(r4.warnings, 'envelope-flat-array'), 'G-R2: flat-array shape → warning');
ok(r4.violations.length === 0, 'G-R2 flat-array (with valid content) is not a hard block');

// G-PREP1: vote-scheduled with no VoteCycle → stamp-flag
var r5 = validateRecords([
  { source: 'decision:mayor', shape: 'object', initiativeId: 'INIT-007',
    trackerUpdates: { ImplementationPhase: 'vote-scheduled' } },
]);
ok(has(r5.stamps, 'votecycle-needed'), 'G-PREP1: vote-scheduled + empty VoteCycle → stamp-flag');
var r5b = validateRecords([
  { source: 'decision:mayor', shape: 'object', initiativeId: 'INIT-007',
    trackerUpdates: { ImplementationPhase: 'vote-scheduled', VoteCycle: 99 } },
]);
ok(!has(r5b.stamps, 'votecycle-needed'), 'G-PREP1: vote-scheduled WITH VoteCycle → no stamp-flag');

// clean canonical case → nothing
var r6 = validateRecords([
  { source: 'decision:oari', shape: 'object', initiativeId: 'INIT-002',
    trackerUpdates: { ImplementationPhase: 'dispatch-live', MilestoneNotes: 'C98: live' } },
]);
ok(r6.violations.length === 0 && r6.warnings.length === 0 && r6.stamps.length === 0, 'clean canonical record → no findings');

// G-R3 shape: bare InitiativeID only (no phase, no notes) — not a hard block here
// (the gate defaults MilestoneNotes); attribution present so no violation.
// G-R3 amended by G-INIT1 (S304): a bare-InitiativeID record is correctly
// attributed (no missing-attribution violation), but if it is the initiative's
// ONLY tracker-bearing record the gate skips the write entirely ("No changes
// needed") and the initiative goes dark — that is now a HARD initiative-dark.
var r7 = validateRecords([
  { source: 'voice:oari#s1', shape: 'object', initiativeId: 'INIT-002', trackerUpdates: { InitiativeID: 'INIT-002' } },
]);
ok(!has(r7.violations, 'missing-initiative-attribution'), 'G-R3: bare-InitiativeID record is attributed → no missing-attribution violation');
ok(has(r7.violations, 'initiative-dark'), 'G-INIT1: bare-InitiativeID as the initiative\'s only record → initiative-dark HARD');

console.log('=== G-INIT1 (C100 INIT-001 dark-initiative cases) ===');

// Nested-fields schema drift (exact C100 Webb signature) → HARD
var r8 = validateRecords([
  { source: 'voice:stabilization_fund#SF-C100-001', shape: 'object', initiativeId: 'INIT-001',
    trackerUpdates: { initiative: 'INIT-001', fields: { ImplementationPhase: 'Active — Disbursement', StatusNote: 'pace held' } } },
]);
ok(has(r8.violations, 'nested-fields-schema'), 'G-INIT1: nested trackerUpdates.fields{} → HARD (payload would silently drop)');
ok(has(r8.violations, 'initiative-dark'), 'G-INIT1: nested-fields statement as only record → initiative also flagged dark');

// Advisory statement with zero writable fields is fine when ANOTHER statement
// for the same initiative carries writable fields → no dark flag.
var r9 = validateRecords([
  { source: 'voice:opp_faction#s1', shape: 'object', initiativeId: 'INIT-002', trackerUpdates: { initiative: 'INIT-002' } },
  { source: 'voice:oari#s1', shape: 'object', initiativeId: 'INIT-002',
    trackerUpdates: { initiative: 'INIT-002', ImplementationPhase: 'dispatch-live', MilestoneNotes: 'C100: live' } },
]);
ok(!has(r9.violations, 'initiative-dark'), 'G-INIT1: advisory zero-writable stmt + owner stmt with fields → NOT dark');
ok(r9.violations.length === 0, 'G-INIT1: mixed advisory/owner set is fully clean');

// Integration regression (S265 review HIGH fix): a project-file voice statement
// with NO explicit initiative must resolve via the pipeline's attributeInitiative
// (PROJECT_FILE_TO_INIT) — the 2-signal local resolver false-flagged these as
// missing-attribution and exit-1 blocked the operator on C94-C97.
var VOICE_DIR = path.resolve(__dirname, '..', 'output', 'civic-voice');
var TMP_CYCLE = 9994;
var tmpFile = path.join(VOICE_DIR, 'health_center_c' + TMP_CYCLE + '.json');
var cleanup = false;
if (fs.existsSync(VOICE_DIR)) {
  fs.writeFileSync(tmpFile, JSON.stringify([{
    office: 'Health Center', statementId: 'STMT-TEST-001',
    topic: 'temescal-clinic-progress',
    trackerUpdates: { ImplementationPhase: 'design-phase', MilestoneNotes: 'C9994: test' }
  }]));
  cleanup = true;
  var rc = validateCycle(TMP_CYCLE);
  var attrViol = rc.violations.filter(function (v) { return v.code === 'missing-initiative-attribution'; });
  ok(attrViol.length === 0, 'project-file voice statement (no explicit initiative) resolves via attributeInitiative — NOT a missing-attribution false-flag');
  if (cleanup) fs.unlinkSync(tmpFile);
} else {
  console.log('  SKIP  project-file attribution test (no civic-voice dir)');
}

console.log((fail === 0 ? 'ALL ' + pass + ' PASS' : fail + ' FAILURES / ' + pass + ' pass'));
process.exit(fail === 0 ? 0 : 1);
