// Test for the writer-normalization gate (S265 civic.14 Phase 3).
var { normalizeTrackerWrite } = require('./applyTrackerUpdates');

var pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; console.log('  PASS  ' + label); } else { fail++; console.log('  FAIL  ' + label); } }

console.log('=== normalizeTrackerWrite (C98 write-path cases) ===');
var CY = 98;

// Mappable drift → canonicalized into updates (G-R1)
var a = normalizeTrackerWrite({ ImplementationPhase: 'disbursement-recovery' }, { ImplementationPhase: 'implementation-active' }, CY);
ok(a.updates.ImplementationPhase === 'disbursement-active', 'mappable phase canonicalized into the write');
ok(a.warnings.some(w => /normalized/.test(w)), 'normalization surfaced as a warning');

// Unresolvable phase → NOT written, prior kept, loud warn (G-R1)
var b = normalizeTrackerWrite({ ImplementationPhase: 'Active — Council Floor Vote Pending' }, { ImplementationPhase: 'vote-ready' }, CY);
ok(b.updates.ImplementationPhase === undefined, 'unresolvable phase is NOT written (engine never sees a dark string)');
ok(b.warnings.some(w => /UNRESOLVABLE/.test(w)), 'unresolvable phase warns loudly');

// vote-scheduled advance, no VoteCycle → stamp VoteCycle + NextActionCycle = cycle+1 (G-PREP1)
var c = normalizeTrackerWrite({ ImplementationPhase: 'vote-scheduled' }, { ImplementationPhase: 'legislation-filed', VoteCycle: '', NextActionCycle: '' }, CY);
ok(c.updates.VoteCycle === '99', 'G-PREP1: VoteCycle stamped cycle+1');
ok(c.updates.NextActionCycle === '99', 'G-PREP1: NextActionCycle stamped cycle+1');

// vote-scheduled WITH an emitted VoteCycle → not overwritten
var d = normalizeTrackerWrite({ ImplementationPhase: 'vote-scheduled', VoteCycle: 101 }, { ImplementationPhase: 'legislation-filed', VoteCycle: '' }, CY);
ok(d.updates.VoteCycle === '101', 'emitted VoteCycle respected, not overwritten by the stamp');

// stale NextActionCycle on any write → advanced (G-PREP2)
var e = normalizeTrackerWrite({ ImplementationPhase: 'operational' }, { ImplementationPhase: 'implementation-active', NextActionCycle: '94' }, CY);
ok(e.updates.NextActionCycle === '99', 'G-PREP2: stale NextActionCycle advanced to cycle+1 on a write');

// phase advance with no MilestoneNotes → motion recorded (G-R3)
var f = normalizeTrackerWrite({ ImplementationPhase: 'dispatch-live' }, { ImplementationPhase: 'pilot-active', MilestoneNotes: 'old note' }, CY);
ok(/^C98: advanced to dispatch-live/.test(f.updates.MilestoneNotes || ''), 'G-R3: phase advance with no emitted note → default cycle-stamped MilestoneNotes');

// explicit MilestoneNotes respected (no default override)
var g = normalizeTrackerWrite({ ImplementationPhase: 'dispatch-live', MilestoneNotes: 'C98: crews live in D7' }, { ImplementationPhase: 'pilot-active' }, CY);
ok(g.updates.MilestoneNotes === 'C98: crews live in D7', 'emitted MilestoneNotes respected over the default');

// no-op (same canonical phase, nothing else) → empty updates, no stale-advance churn
var h = normalizeTrackerWrite({ ImplementationPhase: 'operational' }, { ImplementationPhase: 'operational', NextActionCycle: '120' }, CY);
ok(Object.keys(h.updates).length === 0, 'no-op write produces empty updates (no churn)');

console.log((fail === 0 ? 'ALL ' + pass + ' PASS' : fail + ' FAILURES / ' + pass + ' pass'));
process.exit(fail === 0 ? 0 : 1);
