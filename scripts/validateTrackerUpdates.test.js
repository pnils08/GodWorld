// Test for the pre-assembly tracker validator (S265 civic.14 Phase 2).
var { validateRecords } = require('./validateTrackerUpdates');

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
var r7 = validateRecords([
  { source: 'voice:oari#s1', shape: 'object', initiativeId: 'INIT-002', trackerUpdates: { InitiativeID: 'INIT-002' } },
]);
ok(r7.violations.length === 0, 'G-R3: bare-InitiativeID record is attributed → no hard violation (gate defaults notes)');

console.log((fail === 0 ? 'ALL ' + pass + ' PASS' : fail + ' FAILURES / ' + pass + ' pass'));
process.exit(fail === 0 ? 0 : 1);
