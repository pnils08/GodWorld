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

// civic.38 Task 4 step 0 — the intervention catalog
(function () {
  var cat = C.INTERVENTION_CATALOG;
  var keys = Object.keys(cat || {});
  var mint = require('../scripts/createInitiative');
  ok(keys.length >= 8, 'catalog: present and non-empty (' + keys.length + ' keys)');
  ok(keys.every(function (k) { return mint.POLICY_DOMAINS.indexOf(cat[k].policyDomain) >= 0; }), 'catalog: every policyDomain is one createInitiative accepts');
  ok(keys.every(function (k) { return cat[k].type === 'vote' && !!C.LIFECYCLE[cat[k].type]; }), 'catalog: every seat-proposable row mints as vote — Funded clears on a vote, and only the vote arc has one');
  ok(keys.every(function (k) { return typeof cat[k].playable === 'boolean' && !!cat[k].label && cat[k].stage3Metric && cat[k].stage3Metric.tab && cat[k].stage3Metric.column && /^(up|down)$/.test(cat[k].stage3Metric.direction); }), 'catalog: every entry carries label, boolean playable, and a full stage-3 metric');
  ok(keys.every(function (k) { return cat[k].playable ? !!cat[k].effectChannel : cat[k].effectChannel === null; }), 'catalog: playable ⇔ an effect channel exists in code (SIM_DOCTRINE §15)');
  var unplayable = keys.filter(function (k) { return !cat[k].playable; }).map(function (k) { return cat[k].policyDomain; }).sort();
  ok(JSON.stringify(unplayable) === JSON.stringify(['housing', 'safety']), 'catalog: exactly safety and housing are not playable');
  var slice = require('../scripts/buildCivicOfficeSlice');
  if (typeof slice.loadInterventionMenu === 'function') {
    var menu = slice.loadInterventionMenu();
    ok(menu.available === true && menu.playable.length === keys.length - 2 && !/safety-program|housing-program/.test(menu.text), 'catalog: the seat pack menu lists the playable keys only');
  }
})();

console.log((fail === 0 ? 'ALL ' + pass + ' PASS' : fail + ' FAILURES / ' + pass + ' pass'));
process.exit(fail === 0 ? 0 : 1);
