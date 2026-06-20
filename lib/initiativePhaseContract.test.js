// Unit test for the Initiative_Tracker phase contract module (S265 civic.14).
var C = require('./initiativePhaseContract');

var pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; console.log('  PASS  ' + label); } else { fail++; console.log('  FAIL  ' + label); } }

console.log('=== initiativePhaseContract ===');

// exact
ok(C.canonicalizePhase('implementation-active').how === 'exact', 'canonical phase → exact');
ok(C.isCanonical('dispatch-live') && !C.isCanonical('rollout-active'), 'isCanonical');
ok(C.intensityOf('disbursement-active') === 1.0 && C.intensityOf('defunded') === -1.0, 'intensityOf');
ok(C.intensityOf('not-a-phase') === null, 'intensityOf unknown → null');

// variant map (high confidence)
ok(C.canonicalizePhase('rollout-active').canonical === 'implementation-active' &&
   C.canonicalizePhase('rollout-active').how === 'variant', 'variant: rollout-active → implementation-active');
ok(C.canonicalizePhase('design-development-active').canonical === 'design-phase', 'variant: C96 design drift');
ok(C.canonicalizePhase('active-construction-phase-2-planning').canonical === 'construction-planning', 'variant: C96 construction drift');

// C98 G-R1 mayor cases
var disb = C.canonicalizePhase('Active — Disbursement Recovery');
ok(disb.canonical === 'disbursement-active', 'G-R1 INIT-001 "Active — Disbursement Recovery" → disbursement-active (' + disb.how + ')');
var floor = C.canonicalizePhase('Active — Council Floor Vote Pending');
ok(floor.how === 'none', 'G-R1 INIT-007 "Active — Council Floor Vote Pending" → unresolvable (none) — operator must decide, not guessed');

// partial (contained substring)
ok(C.canonicalizePhase('late construction-planning stage').canonical === 'construction-planning', 'partial: contained canonical substring');

// none
ok(C.canonicalizePhase('').how === 'none' && C.canonicalizePhase('banana').how === 'none', 'empty / nonsense → none');

// lifecycle nextPhase
ok(JSON.stringify(C.nextPhase('vote-scheduled', 'vote')) === JSON.stringify(['vote-ready']), 'nextPhase vote: vote-scheduled → vote-ready');
ok(C.nextPhase('vote-ready', 'vote').indexOf('dispatch-live') >= 0, 'nextPhase vote: vote-ready branches to operational set');
ok(JSON.stringify(C.nextPhase('design-phase', 'visioning')) === JSON.stringify(['construction-planning']), 'nextPhase visioning: design → construction-planning');
ok(C.nextPhase('complete', 'vote').length === 0, 'nextPhase terminal → []');

console.log((fail === 0 ? 'ALL ' + pass + ' PASS' : fail + ' FAILURES / ' + pass + ' pass'));
process.exit(fail === 0 ? 0 : 1);
