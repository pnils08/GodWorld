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
  ok(JSON.stringify(unplayable) === JSON.stringify(['economic', 'housing', 'safety', 'sports', 'workforce']), 'catalog: safety has no lever; economic, workforce and sports have one too weak to open their gate (matched-control pair, builder ruling b); housing off again engine.255 (builder 2026-09-22: the flat discount was the wrong shape — budgeted disbursement lever to come)');
  ok(Object.keys(C.WEAK_CHANNELS).sort().join() === 'economic-program,sports-district,workforce-program' && Object.keys(C.WEAK_CHANNELS).every(function (k) { return cat[k].playable === false; }), 'catalog: the weak channels are recorded for exactly the three refused retail-gated entries');
  var slice = require('../scripts/buildCivicOfficeSlice');
  if (typeof slice.loadInterventionMenu === 'function') {
    var menu = slice.loadInterventionMenu();
    ok(menu.available === true && menu.playable.length === keys.length - 5 && !/safety-program|economic-program|workforce-program|sports-district|housing-program/.test(menu.text), 'catalog: the seat pack menu lists the playable keys only');
  }
})();

// civic.38 Task 4 step 1 — stage parity: the engine mirror cannot drift from lib.
(function () {
  var fs = require('fs');
  var path = require('path');
  var root = path.resolve(__dirname, '..');
  var engineSrc = fs.readFileSync(path.join(root, 'phase05-citizens/civicInitiativeEngine.js'), 'utf8');
  var E = new Function('Logger', engineSrc + '\nreturn {' +
    'INITIATIVE_STAGE_COLUMNS_: INITIATIVE_STAGE_COLUMNS_,' +
    'CIVIC_STAGE_CATALOG_: CIVIC_STAGE_CATALOG_,' +
    'missingInitiativeStageColumns_: missingInitiativeStageColumns_,' +
    'ensureInitiativeStageColumns_: ensureInitiativeStageColumns_,' +
    'civicStageRequirementWith_: civicStageRequirementWith_,' +
    'civicStageRequirement_: civicStageRequirement_,' +
    'civicStageStep_: civicStageStep_,' +
    'applyCivicStageStep_: applyCivicStageStep_,' +
    'CIVIC_STANDING_PHASE_: CIVIC_STANDING_PHASE_,' +
    'INITIATIVE_BUDGET_COLUMNS_: INITIATIVE_BUDGET_COLUMNS_,' +
    'parseBudgetMoney_: parseBudgetMoney_,' +
    'missingInitiativeBudgetColumns_: missingInitiativeBudgetColumns_,' +
    'ensureInitiativeBudgetColumns_: ensureInitiativeBudgetColumns_,' +
    'planInitiativeBudgetBackfill_: planInitiativeBudgetBackfill_' +
    '};')({ log: function () {} });

  ok(JSON.stringify(E.INITIATIVE_STAGE_COLUMNS_) === JSON.stringify(C.STAGE_COLUMNS), 'stage: engine column list == lib STAGE_COLUMNS');

  // engine.255 Task 1 — budget columns + parser parity
  ok(JSON.stringify(E.INITIATIVE_BUDGET_COLUMNS_) === JSON.stringify(C.BUDGET_COLUMNS), 'budget: engine column list == lib BUDGET_COLUMNS');
  var budgetFixtures = ['$28M', '$12.5M', '$230M', '$45M', '$2.1B', '$450K', '28,000,000', ' $3.25m ', '0', '$0', '-5M', 'TBD', '', null, undefined, '28M USD', '$1.2.3M'];
  var budgetExpect = [28000000, 12500000, 230000000, 45000000, 2100000000, 450000, 28000000, 3250000, null, null, null, null, null, null, null, null, null];
  ok(budgetFixtures.every(function (f, i) { return E.parseBudgetMoney_(f) === budgetExpect[i]; }), 'budget: parser handles the six live strings, K/M/B, commas, spaces, lowercase; blank/zero/negative/garbage → null');
  ok(budgetFixtures.every(function (f) { return E.parseBudgetMoney_(f) === C.parseBudgetMoney(f); }), 'budget: engine parser == lib parser on every fixture');
  (function () {
    var hdr = ['InitiativeID', 'Budget', 'Stage', 'BudgetTotal', 'BudgetRemaining', 'LastDisburseCycle'];
    var rows = [
      ['INIT-A', '$28M', 'Standing', '', '', ''],            // fresh: both stamped
      ['INIT-B', '$45M', 'Standing', 45000000, 12000000, 107], // already parsed + spent: untouched
      ['INIT-C', '', 'Proposed', '', '', ''],                // no budget: left blank, not unparsed
      ['INIT-D', 'TBD', 'Proposed', '', '', ''],             // unparseable: left blank, named
      ['INIT-E', '$1M', 'Funded', 1000000, '', ''],          // total present, remaining blank → remaining = total
    ];
    var plan = E.planInitiativeBudgetBackfill_(hdr, rows);
    ok(plan.changed === 2 && plan.total[0][0] === 28000000 && plan.remaining[0][0] === 28000000, 'backfill: a fresh row gets BudgetTotal and BudgetRemaining from Budget');
    ok(plan.total[1][0] === 45000000 && plan.remaining[1][0] === 12000000, 'backfill: a parsed, partly spent row is never rewritten');
    ok(plan.total[2][0] === '' && plan.remaining[2][0] === '' && plan.total[3][0] === '' && plan.unparsed.join() === 'INIT-D:TBD', 'backfill: blank Budget stays blank silently; unparseable is left blank and named');
    ok(plan.total[4][0] === 1000000 && plan.remaining[4][0] === 1000000, 'backfill: BudgetRemaining blank with BudgetTotal present → seeded from the total');
    var again = E.planInitiativeBudgetBackfill_(hdr, rows.map(function (r, i) { return [r[0], r[1], r[2], plan.total[i][0], plan.remaining[i][0], r[5]]; }));
    ok(again.changed === 0, 'backfill: idempotent — a second pass over the stamped grid changes nothing');
    ok(E.missingInitiativeBudgetColumns_(['InitiativeID', 'Budget']).join() === C.BUDGET_COLUMNS.join() && E.missingInitiativeBudgetColumns_(hdr).length === 0, 'budget self-arm: missing list in declared order, complete header missing nothing');
  })();
  ok(JSON.stringify(E.CIVIC_STAGE_CATALOG_) === JSON.stringify(C.stageCatalogByDomain()), 'stage: engine CIVIC_STAGE_CATALOG_ deep-equals the lib catalog subset (keys, order, metric arrays)');

  var domains = Object.keys(C.INTERVENTION_CATALOG).map(function (k) { return C.INTERVENTION_CATALOG[k].policyDomain; });
  ok(domains.length === Object.keys(C.stageCatalogByDomain()).length, 'stage: policyDomain is unique across catalog keys — the by-domain lookup loses nothing');

  var bodyOf = function (fn) { var t = fn.toString(); return t.slice(t.indexOf('{')); };
  ok(bodyOf(E.civicStageRequirementWith_) === bodyOf(C.stageRequirementWith), 'stage: helper body is text-identical in lib and engine');

  // one fixture matrix through both implementations
  var stages = ['', 'Proposed', 'Funded', 'Standing', 'Delivering', 'Bogus', ' standing '];
  var phases = ['', 'vote-ready', 'construction-active', 'dispatch-live', 'stalled', 'Blocked', 'suspended', 'defunded'];
  var doms = ['health', 'transit', 'sports', 'safety', 'housing', 'environment', '', 'HEALTH '];
  var works = [['', ''], [110, 109], [109, 109], [108, 109], ['110', '109'], ['x', 109], [110, ''], [0, 0]];
  var moved = [true, false, undefined, 'true'];
  var n = 0, diff = 0;
  stages.forEach(function (st) { phases.forEach(function (ph) { doms.forEach(function (d) { works.forEach(function (w) { moved.forEach(function (mv) {
    var inp = { stage: st, phase: ph, policyDomain: d, lastWorkCycle: w[0], lastStageChangeCycle: w[1], metricMoved: mv };
    n++;
    if (JSON.stringify(C.stageRequirement(inp)) !== JSON.stringify(E.civicStageRequirement_(inp))) diff++;
  }); }); }); }); });
  ok(diff === 0, 'stage: lib and engine agree on all ' + n + ' fixture combinations');

  // the rules themselves
  var R = C.stageRequirement;
  ok(R({ stage: '' }) === null && R({}) === null && R(null) === null, 'stage: blank Stage is a legacy row — no requirement, nothing to clear');
  ok(R({ stage: 'Proposed', phase: 'vote-ready' }).next === 'Funded' && R({ stage: 'Proposed' }).moveThatClears === null && R({ stage: 'Proposed' }).clears === false, 'stage: Proposed waits on a vote — no seat move clears it');
  ok(R({ stage: 'Funded', lastWorkCycle: 110, lastStageChangeCycle: 109 }).clears === true, 'stage: Funded clears when work landed after the stage change');
  ok(R({ stage: 'Funded', lastWorkCycle: 109, lastStageChangeCycle: 109 }).clears === true, 'stage: work stamped with the funding Cycle clears — the fold stamps the closing Cycle, and that chain runs after the fire');
  ok(R({ stage: 'Funded', lastWorkCycle: 108, lastStageChangeCycle: 109 }).clears === false, 'stage: work from an earlier week does not clear Funded');
  ok(/d\.trackerUpdates\.LastWorkCycle = Number\(cycle\);/.test(require('fs').readFileSync(require('path').resolve(__dirname, '../scripts/cron-civic-run.js'), 'utf8')), 'stage: the fold still stamps LastWorkCycle with the closing Cycle — the >= above depends on it');
  ok(R({ stage: 'Funded', lastWorkCycle: '', lastStageChangeCycle: 109 }).clears === false && R({ stage: 'Funded', lastWorkCycle: 110, lastStageChangeCycle: '' }).clears === false, 'stage: a blank work or stage-change Cycle never clears Funded');
  ok(R({ stage: 'Standing', policyDomain: 'health', metricMoved: true }).clears === true && R({ stage: 'Standing', policyDomain: 'health', metricMoved: 'true' }).clears === false, 'stage: Standing clears only on a strict boolean metricMoved');
  var noGate = R({ stage: 'Standing', policyDomain: 'safety', phase: 'dispatch-live', metricMoved: true });
  ok(noGate.clears === false && noGate.next === null && noGate.blocked === 'no-delivering-gate', 'stage: a domain with no lever has no Delivering gate — it cannot clear, whatever the metric says (SIM_DOCTRINE §15)');
  ok(R({ stage: 'Standing', policyDomain: 'environment' }).blocked === 'no-delivering-gate', 'stage: a domain absent from the catalog has no gate either');
  var st = R({ stage: 'Funded', phase: 'stalled', lastWorkCycle: 110, lastStageChangeCycle: 109 });
  ok(st.clears === false && st.blocked === 'stalled' && st.moveThatClears === 'work', 'stage: a stalled phase wins over the stage — nothing advances, one work move revives');
  ok(['blocked', 'suspended', 'defunded'].every(function (p) { var r = R({ stage: 'Standing', policyDomain: 'health', phase: p, metricMoved: true }); return r.clears === false && r.moveThatClears === null && r.blocked === p; }), 'stage: blocked / suspended / defunded get no generic revival');
  ok(R({ stage: 'Delivering' }).next === null && R({ stage: 'Delivering' }).clears === false, 'stage: Delivering is terminal');
  ok(R({ stage: 'Bogus' }).blocked === 'unknown-stage', 'stage: an unknown Stage string is refused, not guessed');

  // civic.38 Task 4 — the stage step (engine-only: the engine is the one voter and the one stage writer)
  var step = E.civicStageStep_;
  var signed = { status: 'passed', mayoralAction: 'signed', policyDomain: 'health' };
  var mk = function (o) { var x = {}; Object.keys(signed).forEach(function (k) { x[k] = signed[k]; }); Object.keys(o).forEach(function (k) { x[k] = o[k]; }); return x; };
  ok(step(mk({ stage: '', cycle: 110 })) === null && step(mk({ stage: '   ', cycle: 110 })) === null, 'step: blank Stage never steps — every legacy row');
  var f = step(mk({ stage: 'Proposed', phase: 'vote-ready', cycle: 110 }));
  ok(f && f.stage === 'Funded' && f.lastStageChangeCycle === 110 && f.phase === null, 'step: a signed pass funds a Proposed row, stamps the vote Cycle, leaves the phase alone');
  ok(step({ stage: 'Proposed', status: 'override-passed', mayoralAction: 'vetoed', cycle: 110 }).stage === 'Funded', 'step: an override funds it too');
  ok(['proposed', 'active', 'pending-vote', 'delayed', 'vetoed', 'failed', 'override-failed', ''].every(function (s2) { return step({ stage: 'Proposed', status: s2, mayoralAction: 'signed', cycle: 110 }) === null; }), 'step: no vote, no step — pending, vetoed and failed rows keep their Stage');
  ok(step({ stage: 'Proposed', status: 'passed', mayoralAction: 'none', cycle: 110 }) === null && step({ stage: 'Proposed', status: 'passed', mayoralAction: '', cycle: 110 }) === null, 'step: a passed bill the mayor has not signed is not funded yet');
  var sd = step(mk({ stage: 'Funded', phase: 'vote-ready', lastStageChangeCycle: 110, lastWorkCycle: 110, cycle: 111 }));
  ok(sd && sd.stage === 'Standing' && sd.lastStageChangeCycle === 111 && sd.phase === 'operational', 'step: funded at 110, work stamped 110, stands up at fire 111 as operational');
  ok(step(mk({ stage: 'Funded', phase: 'vote-ready', lastStageChangeCycle: 110, lastWorkCycle: 110, cycle: 110 })) === null, 'step: a row funded this fire cannot also stand up this fire');
  ok(step(mk({ stage: 'Funded', phase: 'vote-ready', lastStageChangeCycle: 110, lastWorkCycle: 109, cycle: 112 })) === null && step(mk({ stage: 'Funded', phase: 'vote-ready', lastStageChangeCycle: 110, lastWorkCycle: '', cycle: 112 })) === null, 'step: stale or absent work never stands a row up');
  ok(['stalled', 'blocked', 'suspended', 'defunded'].every(function (ph) { return step(mk({ stage: 'Funded', phase: ph, lastStageChangeCycle: 110, lastWorkCycle: 111, cycle: 112 })) === null; }), 'step: a failing phase blocks the stand-up — revival is its own path');
  ok(step(mk({ stage: 'Standing', phase: 'operational', lastStageChangeCycle: 111, lastWorkCycle: 115, cycle: 116 })) === null && step(mk({ stage: 'Delivering', cycle: 116 })) === null && step(mk({ stage: 'Bogus', cycle: 116 })) === null, 'step: Standing, Delivering and unknown stages do not step in this cut');
  ok(step(mk({ stage: 'Proposed', cycle: 0 })) === null && step(mk({ stage: 'Proposed', cycle: 'x' })) === null, 'step: no valid Cycle, no step');
  // the phase that stands a row up must be one every effect channel accepts
  var fx = fs.readFileSync(path.join(root, 'phase02-world-state/applyInitiativeImplementationEffects.js'), 'utf8');
  var tm = fs.readFileSync(path.join(root, 'phase02-world-state/updateTransitMetrics.js'), 'utf8');
  var hd = fx.match(/var HEALTH_DELIVERING_PHASES = \{([\s\S]*?)\};/)[1];
  ok(hd.indexOf("'" + E.CIVIC_STANDING_PHASE_ + "': true") >= 0, 'standing phase: health relief counts it as treating people');
  ok(new RegExp("var open = [^;]*phase === '" + E.CIVIC_STANDING_PHASE_ + "'").test(tm), 'standing phase: transit counts it as open — ridership only lifts on operational/complete/open, so any other choice would hang a Delivering gate that cannot open (SIM_DOCTRINE §15)');
  ok(C.intensityOf(E.CIVIC_STANDING_PHASE_) > 0 && C.isCanonical(E.CIVIC_STANDING_PHASE_), 'standing phase: canonical, positive intensity');

  // the applier: row in place, prior phase carried for next Cycle's Phase-2 detector (plan ruling 7)
  var hdr = ['InitiativeID', 'Name', 'Status', 'MayoralAction', 'ImplementationPhase', 'PolicyDomain', 'LastUpdated', 'Stage', 'StageBaseline', 'LastStageChangeCycle', 'LastWorkCycle', 'LastWorkSeat', 'PriorPhase'];
  var ixOf = function (n) { return hdr.indexOf(n); };
  var sIx = { stage: ixOf('Stage'), lastStageChange: ixOf('LastStageChangeCycle'), lastWork: ixOf('LastWorkCycle'), status: ixOf('Status'), mayoralAction: ixOf('MayoralAction'), phase: ixOf('ImplementationPhase'), policyDomain: ixOf('PolicyDomain'), lastUpdated: ixOf('LastUpdated'), id: ixOf('InitiativeID'), name: ixOf('Name') };
  var ctxA = { summary: {}, now: 'NOW' };
  var legacy = ['INIT-001', 'Fund', 'passed', 'signed', 'disbursement-active', 'economic', 'then', '', '', '', '', '', ''];
  var legacyCopy = legacy.slice();
  ok(E.applyCivicStageStep_(ctxA, legacy, sIx, 110) === false && JSON.stringify(legacy) === JSON.stringify(legacyCopy) && !ctxA.summary.initiativeEnginePhaseMoves, 'applier: a legacy row is untouched, byte for byte, and nothing is carried');
  var rowP = ['INIT-008', 'Clinic', 'passed', 'signed', 'vote-ready', 'health', 'then', 'Proposed', '', '', '', '', ''];
  ok(E.applyCivicStageStep_(ctxA, rowP, sIx, 110) === true && rowP[ixOf('Stage')] === 'Funded' && rowP[ixOf('LastStageChangeCycle')] === 110 && rowP[ixOf('ImplementationPhase')] === 'vote-ready' && rowP[ixOf('LastUpdated')] === 'NOW' && !ctxA.summary.initiativeEnginePhaseMoves, 'applier: Proposed -> Funded writes two stage cells, no phase, no carry');
  ok(E.applyCivicStageStep_(ctxA, rowP, sIx, 110) === false, 'applier: a second call in the same fire is a no-op — three call sites cannot double-step');
  rowP[ixOf('LastWorkCycle')] = 110;
  ok(E.applyCivicStageStep_(ctxA, rowP, sIx, 111) === true && rowP[ixOf('Stage')] === 'Standing' && rowP[ixOf('ImplementationPhase')] === 'operational' && rowP[ixOf('LastStageChangeCycle')] === 111 && ctxA.summary.initiativeEnginePhaseMoves['INIT-008'] === 'vote-ready', 'applier: Funded -> Standing writes operational and carries the phase the row LEFT, keyed by InitiativeID');
  ok(E.applyCivicStageStep_(ctxA, rowP, sIx, 112) === false, 'applier: a Standing row does not step again');
  ok(E.applyCivicStageStep_(ctxA, rowP, { stage: -1, lastStageChange: -1 }, 112) === false, 'applier: without the stage columns on the header the model is off, not crashing');
  // codex review 2026-09-21 F3 / F4
  var ctxB = { summary: {}, now: 'NOW' };
  var rowN = ['', '  Nameless Clinic  ', 'passed', 'signed', 'vote-ready', 'health', 'then', 'Funded', '', 110, 110, '', ''];
  ok(E.applyCivicStageStep_(ctxB, rowN, sIx, 111) === true && ctxB.summary.initiativeEnginePhaseMoves['Nameless Clinic'] === 'vote-ready' && !('  Nameless Clinic  ' in ctxB.summary.initiativeEnginePhaseMoves), 'carry key: an ID-less row is keyed by its TRIMMED Name, as both readers key it');
  var rowW = ['  INIT-009 ', 'Clinic', 'passed', 'signed', 'vote-ready', 'health', 'then', 'Funded', '', 110, 110, '', ''];
  ok(E.applyCivicStageStep_(ctxB, rowW, sIx, 111) === true && ctxB.summary.initiativeEnginePhaseMoves['INIT-009'] === 'vote-ready', 'carry key: a whitespace-padded ID is trimmed');
  var rowB = ['INIT-010', 'Clinic', 'passed', 'signed', '', 'health', 'then', 'Funded', '', 110, 110, '', ''];
  ok(E.applyCivicStageStep_(ctxB, rowB, sIx, 111) === true && rowB[ixOf('ImplementationPhase')] === 'operational' && ctxB.summary.initiativeEnginePhaseMoves['INIT-010'] === 'announced', 'carry: standing up from a blank phase carries `announced`, so the detector still sees a move');
  // the Phase-2 side of ruling 7
  var P2 = new Function(fx + '\nreturn { initiativePrevPhaseFor_: initiativePrevPhaseFor_ };')();
  ok(P2.initiativePrevPhaseFor_({ 'INIT-008': 'operational' }, { 'INIT-008': 'vote-ready' }, 'INIT-008') === 'vote-ready', 'ruling 7: the detector sees the phase an engine-moved row LEFT, not the new phase the carried map already holds');
  ok(P2.initiativePrevPhaseFor_({ 'INIT-001': 'disbursement-active' }, { 'INIT-008': 'vote-ready' }, 'INIT-001') === 'disbursement-active' && P2.initiativePrevPhaseFor_({ 'INIT-001': 'x' }, null, 'INIT-001') === 'x' && P2.initiativePrevPhaseFor_(null, null, 'INIT-001') === null, 'ruling 7: every other row reads the carried map exactly as before');
  ok(/initiativeEnginePhaseMoves: S\.initiativeEnginePhaseMoves \|\| null/.test(fs.readFileSync(path.join(root, 'phase09-digest/finalizeCycleState.js'), 'utf8')), 'ruling 7: Phase 9 carries the engine moves across the Cycle boundary');
  ok((engineSrc.match(/applyCivicStageStep_\(ctx, row, stageIx, cycle\)/g) || []).length === 3, 'handler: three call sites — above the skip gates, after a signing, after an override');
  ok(engineSrc.indexOf('if (applyCivicStageStep_(ctx, row, stageIx, cycle)) {') < engineSrc.indexOf("if (status === 'passed' && row[iMayoralAction] === 'signed') {"), 'handler: the top call sits above the signed-row early exit, so INIT-002 and INIT-006 will reach it');

  // SIM_DOCTRINE §15 in code: every playable gate reads a column that exists on disk.
  var headerOf = function (tab) {
    var f = path.join(root, 'output/beats', tab + '.jsonl');
    if (fs.existsSync(f)) { var line = fs.readFileSync(f, 'utf8').split('\n')[0]; return line ? Object.keys(JSON.parse(line)) : null; }
    var audits = fs.readdirSync(path.join(root, 'output')).filter(function (x) { return /^engine_audit_c\d+\.json$/.test(x); }).sort();
    if (!audits.length) return null;
    var snaps = JSON.parse(fs.readFileSync(path.join(root, 'output', audits[audits.length - 1]), 'utf8')).snapshots || {};
    return snaps[tab] && snaps[tab].length ? Object.keys(snaps[tab][0]) : null;
  };
  var cat = C.stageCatalogByDomain();
  Object.keys(cat).filter(function (d) { return cat[d].playable; }).forEach(function (d) {
    var m = cat[d].stage3Metric;
    var h = headerOf(m.tab);
    if (!h) { console.log('  SKIP  stage: no local dump of ' + m.tab + ' to check ' + d + ' against'); return; }
    // housing's column is a computed identifier (HOUSING_BURDEN_COLUMN =
    // 'MonthlyRent*12/HouseholdIncome'), never a literal header — check its
    // real source columns instead (housingBurdenCohort's actual reads).
    var expectCols = m.column[0] === C.HOUSING_BURDEN_COLUMN ? ['MonthlyRent', 'HouseholdIncome'] : m.column;
    ok(expectCols.every(function (c) { return h.indexOf(c) >= 0; }), 'stage: ' + d + ' gate column(s) ' + expectCols.join(' + ') + ' exist on ' + m.tab);
  });

  // the self-arm
  var live31 = ['InitiativeID', 'Name', 'Type', 'Status', 'NextActionCycle', 'Proposer', 'ProposingOffice', 'ProposedCycle'];
  ok(JSON.stringify(E.missingInitiativeStageColumns_(live31)) === JSON.stringify(C.STAGE_COLUMNS), 'self-arm: a header with none of the seven is missing all seven, in declared order');
  ok(E.missingInitiativeStageColumns_(live31.concat(C.STAGE_COLUMNS)).length === 0, 'self-arm: a complete header is missing nothing');
  ok(JSON.stringify(E.missingInitiativeStageColumns_(live31.concat(['LastWorkCycle', 'Stage']))) === JSON.stringify(['StageBaseline', 'LastStageChangeCycle', 'LastWorkSeat', 'PriorPhase', 'StageHold']), 'self-arm: a partial header gets only what it lacks');
  var calls = [];
  var fakeSheet = function (lastCol, maxCols) { return {
    getLastColumn: function () { return lastCol; }, getMaxColumns: function () { return maxCols; },
    insertColumnsAfter: function (at, nn) { calls.push(['insert', at, nn]); maxCols += nn; },
    getRange: function (r, c, nr, nc) { return { setValues: function (v) { calls.push(['set', r, c, nr, nc, v[0].join(',')]); } }; } }; };
  ok(E.ensureInitiativeStageColumns_(fakeSheet(38, 38), live31.concat(C.STAGE_COLUMNS)) === false && calls.length === 0, 'self-arm: complete header → no write, returns false');
  ok(E.ensureInitiativeStageColumns_(fakeSheet(31, 40), live31) === true && calls.length === 1 && calls[0].join('|') === ['set', 1, 32, 1, 7, C.STAGE_COLUMNS.join(',')].join('|'), 'self-arm: one header-row write at lastCol+1, seven wide');
  calls = [];
  ok(E.ensureInitiativeStageColumns_(fakeSheet(37, 37), live31.concat(C.STAGE_COLUMNS.slice(0, 6))) === true && calls.join('|') === 'insert,37,1|set,1,38,1,1,StageHold', 'self-arm: the live tracker (six already armed) gains exactly StageHold at column 38');
  calls = [];
  ok(E.ensureInitiativeStageColumns_(fakeSheet(31, 31), live31) === true && calls[0].join('|') === 'insert|31|7' && calls[1][0] === 'set', 'self-arm: a trimmed grid grows by exactly the shortfall before the write');
  ok(/if \(data\.length >= 1 && ensureInitiativeStageColumns_\(sheet, data\[0\]\)\)/.test(engineSrc), 'self-arm: runCivicInitiativeEngine_ calls it on the cycle path (DEPLOY.md trap 3)');
  var req = engineSrc.match(/var required = \[([\s\S]*?)\];/)[1];
  ok(C.STAGE_COLUMNS.every(function (c) { return req.indexOf("'" + c + "'") < 0; }), 'self-arm: no stage column is in `required` — a missing one can never abort the civic engine');
})();

// civic.38 Task 4 upkeep — the tend factor, and the engine mirror cannot drift.
(function () {
  var fs = require('fs');
  var path = require('path');
  var src = fs.readFileSync(path.resolve(__dirname, '..', 'phase02-world-state/applyInitiativeImplementationEffects.js'), 'utf8');
  var E = new Function('Logger', src + '\nreturn { civicTendFactor_: civicTendFactor_, CIVIC_TEND_STAGES_: CIVIC_TEND_STAGES_ };')({ log: function () {} });
  var D = { grace: 6, decay: 0.15, floor: 0.3 };
  var at = function (over) { return Object.assign({ stage: 'Standing', cycle: 120, lastWorkCycle: '', lastStageChangeCycle: 110 }, D, over || {}); };

  ok(JSON.stringify(E.CIVIC_TEND_STAGES_) === JSON.stringify(C.TEND_STAGES), 'tend: engine stage list == lib TEND_STAGES');
  ok(C.tendFactor(at({ cycle: 116 })).factor === 1, 'tend: full strength through the grace (untended 6 of 6)');
  ok(C.tendFactor(at({ cycle: 117 })).factor === 0.85, 'tend: first Cycle past the grace pays 0.85');
  ok(C.tendFactor(at({ cycle: 119 })).factor === 0.55, 'tend: linear, not geometric — 3 past the grace pays 0.55');
  ok(C.tendFactor(at({ cycle: 121 })).factor === 0.3 && C.tendFactor(at({ cycle: 160 })).factor === 0.3, 'tend: floor reached 5 Cycles past the grace and held');
  ok(C.tendFactor(at({ cycle: 121, lastWorkCycle: 120 })).factor === 1, 'tend: one work move restores full strength');
  ok(C.tendFactor(at({ cycle: 121, lastWorkCycle: 100 })).untended === 11, 'tend: untended-since is the LATER of work and stage change (ruling e)');
  ok(C.tendFactor(at({ cycle: 140, lastStageChangeCycle: '' })).factor === 1, 'tend: no reference Cycle => no decay');
  ok(C.tendFactor(at({ cycle: 140, stage: '' })).factor === 1 && C.tendFactor(at({ cycle: 140, stage: 'Funded' })).factor === 1 && C.tendFactor(at({ cycle: 140, stage: 'Proposed' })).factor === 1, 'tend: only Standing and Delivering decay — a blank (legacy) Stage never');
  ok(C.tendFactor(at({ cycle: 140, stage: 'Delivering' })).factor === 0.3, 'tend: Delivering decays too');
  ok(C.tendFactor(at({ cycle: 140, floor: 'x' })).factor === 1, 'tend: a non-numeric dial never invents a factor');

  var drift = [];
  ['', 'Proposed', 'Funded', 'Standing', 'Delivering'].forEach(function (stage) {
    [['', ''], ['', 100], [100, ''], [104, 100], [100, 104]].forEach(function (pair) {
      for (var c = 99; c <= 125; c++) {
        var inp = Object.assign({ stage: stage, cycle: c, lastWorkCycle: pair[0], lastStageChangeCycle: pair[1] }, D);
        if (JSON.stringify(C.tendFactor(inp)) !== JSON.stringify(E.civicTendFactor_(inp))) drift.push(JSON.stringify(inp));
      }
    });
  });
  ok(drift.length === 0, 'tend: engine civicTendFactor_ == lib tendFactor over 675 inputs' + (drift.length ? ' — first drift ' + drift[0] : ''));
})();

// civic.38 Task 4 (2) — baseline descriptor, Delivering comparator, hold, regress.
(function () {
  var fs = require('fs');
  var path = require('path');
  var root = path.resolve(__dirname, '..');
  var engineSrc = fs.readFileSync(path.join(root, 'phase05-citizens/civicInitiativeEngine.js'), 'utf8');
  var HOODS = ['Adams Point', 'Brooklyn', 'Chinatown', 'Dimond', 'Downtown', 'Eastlake', 'Fruitvale', 'Glenview', 'Laurel', 'Temescal', 'West Oakland'];
  var CHILD = { 'jingletown': 'Fruitvale' };
  var resolve = function (ctx, name) {
    var n = String(name || '').trim();
    if (HOODS.indexOf(n) >= 0) return n;
    return CHILD[n.toLowerCase()] || null;
  };
  var E = new Function('Logger', 'resolveHoodOrChild_', engineSrc + '\nreturn {' +
    'civicStageBaselineFrom_: civicStageBaselineFrom_, civicDeliveryEdge_: civicDeliveryEdge_,' +
    'civicDeliveryHoldStep_: civicDeliveryHoldStep_, applyCivicStageStep_: applyCivicStageStep_,' +
    'freezeCivicStageCohort_: freezeCivicStageCohort_, getCivicDeliverDials_: getCivicDeliverDials_,' +
    'civicStallClock_: civicStallClock_, civicReviveDecision_: civicReviveDecision_, civicStageHoldRead_: civicStageHoldRead_,' +
    'CIVIC_STAGE_CATALOG_: CIVIC_STAGE_CATALOG_ };')({ log: function () {} }, resolve);

  var bodyOf = function (fn) { var t = fn.toString(); return t.slice(t.indexOf('{')); };
  ok(bodyOf(E.civicStageBaselineFrom_) === bodyOf(C.stageBaselineFrom), 'deliver: baseline builder body is text-identical in lib and engine');
  ok(bodyOf(E.civicDeliveryEdge_) === bodyOf(C.deliveryEdge), 'deliver: edge comparator body is text-identical in lib and engine');
  ok(bodyOf(E.civicDeliveryHoldStep_) === bodyOf(C.deliveryHoldStep), 'deliver: hold step body is text-identical in lib and engine');

  // A city where every hood has 100 sick, except the named overrides.
  var cohortAt = function (cycle, over, col) {
    col = col || 'Sick';
    var rows = {};
    HOODS.forEach(function (h) { rows[h] = {}; rows[h][col] = 100; });
    Object.keys(over || {}).forEach(function (h) { rows[h][col] = over[h]; });
    return { available: true, reason: null, cycle: cycle, tab: 'Neighborhood_Demographics', rows: rows };
  };
  var HEALTH = C.stageCatalogByDomain().health.stage3Metric;

  // --- the descriptor (ruling 4) ---
  var built = C.stageBaselineFrom({ origin: 'vote', captureCycle: 110, metric: HEALTH, hoods: ['Laurel', 'Fruitvale', 'Laurel'], cohort: cohortAt(109, { Laurel: 120, Fruitvale: 110 }) });
  var d = built.descriptor;
  ok(built.ok && d.v === 1 && d.origin === 'vote' && d.cycle === 109 && d.captureCycle === 110, 'baseline: observation Cycle (109) and capture Cycle (110) are recorded separately');
  ok(JSON.stringify(Object.keys(d.keys)) === JSON.stringify(['Fruitvale', 'Laurel']) && d.keys.Laurel.Sick === 120 && d.cityMiddle.Sick === 100 && d.cityN === 11 && d.direction === 'down', 'baseline: target membership frozen (deduped, sorted), city middle is the median of every hood, reference size frozen');
  var bad = function (over, label, want) {
    var inp = { origin: 'vote', captureCycle: 110, metric: HEALTH, hoods: ['Laurel'], cohort: cohortAt(109) };
    Object.keys(over).forEach(function (k) { inp[k] = over[k]; });
    var r = C.stageBaselineFrom(inp);
    ok(r.ok === false && r.descriptor === null && (!want || r.reason.indexOf(want) === 0), label + ' (' + r.reason + ')');
  };
  bad({ hoods: [] }, 'baseline: no target hoods → unavailable, never an empty cohort', 'no-target-hoods');
  bad({ hoods: ['Atlantis'] }, 'baseline: a target hood absent from the observation → unavailable', 'target-hood-missing');
  bad({ cohort: { available: false, reason: 'stamp-not-C109:Laurel=108' } }, 'baseline: an unreadable cohort → unavailable, carrying the cohort\'s own reason', 'stamp-not-C109');
  bad({ cohort: cohortAt(111) }, 'baseline: an observation newer than the capture is refused', 'cohort-from-the-future');
  bad({ metric: C.stageCatalogByDomain().transit.stage3Metric }, 'baseline: a station-scoped metric has no hood reader yet', 'no-hood-reader');
  bad({ origin: 'guess' }, 'baseline: origin is vote or conversion, nothing else', 'bad-origin');
  var zeroCity = cohortAt(109); HOODS.forEach(function (h) { zeroCity.rows[h].Sick = 0; });
  bad({ cohort: zeroCity }, 'baseline: a zero city middle is refused, never divided by or replaced with 1', 'city-middle-not-positive');
  var holed = cohortAt(109); holed.rows.Dimond.Sick = null;
  bad({ cohort: holed }, 'baseline: a missing city reading is unavailable, never zero', 'city-reading-missing');
  var zeroTarget = C.stageBaselineFrom({ origin: 'vote', captureCycle: 110, metric: HEALTH, hoods: ['Laurel'], cohort: cohortAt(109, { Laurel: 0 }) });
  ok(zeroTarget.ok && zeroTarget.descriptor.keys.Laurel.Sick === 0, 'baseline: a legitimate zero TARGET reading stays zero');
  ok(C.stageBaselineFrom({ origin: 'conversion', captureCycle: 108, metric: HEALTH, hoods: ['Laurel'], cohort: cohortAt(108) }).ok, 'baseline: a conversion between fires may capture the Cycle it observes');

  // --- the Node board reader accepts an engine-built descriptor (the reconciliation the plan asked for) ---
  (function () {
    var ev = require('../scripts/civicStageEvidence');
    var audit = function (c) {
      var co = cohortAt(c, { Laurel: 96, Fruitvale: 88 });
      return { cycle: c, snapshots: {
        Neighborhood_Map: HOODS.map(function (h) { return { Neighborhood: h, ChildAreas: '', Cycle: c }; }),
        Neighborhood_Demographics: HOODS.map(function (h) { return { Neighborhood: h, Sick: co.rows[h].Sick, LastUpdated: c }; })
      } };
    };
    var r = ev.measureStageMovement({ PolicyDomain: 'health', AffectedNeighborhoods: 'Laurel, Fruitvale', StageBaseline: JSON.stringify(d) },
      { cycle: 114, config: { civicDeliverMargin: 0.2, civicDeliverMargin_health: 0.15, civicDeliverHoldCycles: 3 }, readAudit: audit });
    var mine = C.deliveryEdge(d, cohortAt(114, { Laurel: 96, Fruitvale: 88 }));
    ok(r.available === true && r.metricMoved === true && r.baselineCycle === 109, 'reconcile: scripts/civicStageEvidence reads an engine-built descriptor as available (' + (r.reason || 'ok') + ')');
    ok(r.available && Math.abs(r.observations[2].differences.Sick - mine.minEdge) < 1e-6, 'reconcile: the board and the engine compute the same edge from the same observation (' + mine.minEdge + ')');
  })();

  // --- the edge (ruling 5) ---
  var e1 = C.deliveryEdge(d, cohortAt(112, { Laurel: 96, Fruitvale: 88 }));
  ok(e1.available && e1.cycle === 112 && Math.abs(e1.minEdge - 0.23) < 1e-9, 'edge: Sick down 120→96 and 110→88 against a flat city = mean ratio edge 0.23, signed positive for the right direction');
  ok(C.deliveryEdge(d, cohortAt(112, { Laurel: 130, Fruitvale: 120 })).minEdge < 0, 'edge: getting sicker is a negative edge');
  var cityWorse = cohortAt(112, { Laurel: 120, Fruitvale: 110 }); HOODS.forEach(function (h) { if (h !== 'Laurel' && h !== 'Fruitvale') cityWorse.rows[h].Sick = 150; });
  ok(C.deliveryEdge(d, cityWorse).minEdge > 0.3, 'edge: relative, not raw — a hood that holds while the city sickens has gained on the city\'s middle');
  ok(C.deliveryEdge(d, cohortAt(109, { Laurel: 60 })).reason === 'observation-not-after-baseline', 'edge: never compares against the observation the baseline was stamped from');
  ok(C.deliveryEdge(JSON.stringify(d), cohortAt(112)).available === true && C.deliveryEdge('{not json', cohortAt(112)).reason === 'baseline-unavailable' && C.deliveryEdge('', cohortAt(112)).available === false, 'edge: reads the cell text; a malformed or blank baseline is unavailable');
  var fewer = cohortAt(112); delete fewer.rows.Dimond;
  ok(C.deliveryEdge(d, fewer).reason === 'city-membership-changed', 'edge: a changed city reference is detected, not silently dropped');
  var twoCol = { v: 1, origin: 'vote', cycle: 109, tab: 'Neighborhood_Demographics', columns: ['A', 'B'], scope: 'hood', direction: 'up', cityN: 2, keys: { X: { A: 10, B: 10 } }, cityMiddle: { A: 10, B: 10 } };
  var two = C.deliveryEdge(twoCol, { available: true, cycle: 110, tab: 'Neighborhood_Demographics', rows: { X: { A: 20, B: 10 }, Y: { A: 10, B: 10 } } });
  ok(two.available && two.edges.A > 0.3 && two.edges.B === 0 && two.minEdge === 0, 'edge: two gate columns must clear TOGETHER — the weakest column is the edge');

  // --- the hold ---
  var H = function (o) { return C.deliveryHoldStep(Object.assign({ stage: 'Standing', hold: '', eligibleAfter: 111, margin: 0.15, regressShare: 0.5, holdCycles: 3, fireCycle: (o.obsCycle || 0) + 1, edge: { available: true, cycle: o.obsCycle, minEdge: 0.2 } }, o)); };
  ok(H({ obsCycle: 111 }).reason === 'not-yet-eligible' && H({ obsCycle: 111 }).changed === false, 'hold: the untouched pre-service observation (the stand-up Cycle itself) earns no count');
  var s1 = H({ obsCycle: 112 }), s2 = H({ obsCycle: 113, hold: s1.hold }), s3 = H({ obsCycle: 114, hold: JSON.stringify(s2.hold) });
  ok(s1.hold.up === 1 && s2.hold.up === 2 && s2.verdict === null && s3.verdict === 'deliver' && s3.firstDelivery === true && s3.hold.first === 115, 'hold: stood up at S=111 → observations 112,113,114 → delivers at fire 115 = S+4 under hold 3 (codex timing)');
  var again = H({ obsCycle: 113, hold: s2.hold });
  ok(again.changed === false && again.reason === 'already-counted' && JSON.stringify(again.hold) === JSON.stringify(s2.hold), 'hold: a re-fire of the same Cycle re-reads the same observation and counts nothing');
  ok(H({ obsCycle: 115, hold: s2.hold }).hold.up === 1, 'hold: a skipped Cycle breaks the streak — H consecutive means H consecutive');
  var un = H({ obsCycle: 114, hold: s2.hold, edge: { available: false, reason: 'stamp-not-C114' } });
  ok(un.changed === true && un.hold.up === 0 && un.hold.obs === 114 && un.verdict === null, 'hold: an unreadable observation breaks the streak and is recorded as seen');
  ok(H({ obsCycle: 114, hold: s2.hold, margin: 0.2 }).hold.up === 1, 'hold: a margin changed mid-streak restarts it — evidence under two thresholds is never combined');
  ok(H({ obsCycle: 114, hold: s2.hold, edge: { available: true, cycle: 114, minEdge: 0.149 } }).hold.up === 0 && H({ obsCycle: 114, hold: s2.hold, edge: { available: true, cycle: 114, minEdge: 0.15 } }).verdict === 'deliver', 'hold: at-or-above the margin counts, a hair under resets');
  ok(H({ obsCycle: 114, hold: s2.hold, edge: { available: true, cycle: 113, minEdge: 0.9 } }).hold.up === 0, 'hold: an edge from a different Cycle than the observation is not evidence');
  var Dv = function (o) { return H(Object.assign({ stage: 'Delivering', eligibleAfter: 115 }, o)); };
  var g1 = Dv({ obsCycle: 116, hold: s3.hold, edge: { available: true, cycle: 116, minEdge: 0.10 } });
  ok(g1.hold.down === 0 && g1.verdict === null, 'regress: between the lower bar (0.075) and the margin (0.15) a Delivering row HOLDS — the hysteresis band');
  var r1 = Dv({ obsCycle: 117, hold: g1.hold, edge: { available: true, cycle: 117, minEdge: 0.05 } });
  var r2 = Dv({ obsCycle: 118, hold: r1.hold, edge: { available: true, cycle: 118, minEdge: 0.01 } });
  var r3 = Dv({ obsCycle: 119, hold: r2.hold, edge: { available: true, cycle: 119, minEdge: -0.2 } });
  ok(r1.hold.down === 1 && r2.hold.down === 2 && r3.verdict === 'regress' && r3.hold.regressed === 120 && r3.hold.first === 115 && r3.firstDelivery === false, 'regress: three consecutive observations under the lower bar → regress; first-delivered survives');
  var back = [120, 121, 122].reduce(function (acc, c) { return H({ obsCycle: c, hold: acc.hold, eligibleAfter: 115 }); }, r3);
  ok(back.verdict === 'deliver' && back.firstDelivery === false && back.hold.first === 115, 'regress: a second delivery is a delivery but NOT a first — completed +3 cannot pay twice');
  // codex delivering review F3/F4/F5 (2026-09-21)
  var post = Dv({ obsCycle: 115, hold: s3.hold, edge: { available: true, cycle: 115, minEdge: 0.05 } });
  ok(post.changed === true && post.hold.obs === 115 && post.hold.down === 1, 'F3: the delivery Cycle\'s own observation is counted — the service was already running; delivery resets tend, not the streak');
  var q1 = Dv({ obsCycle: 116, hold: post.hold, edge: { available: true, cycle: 116, minEdge: 0.05 } });
  var q2 = Dv({ obsCycle: 117, hold: q1.hold, edge: { available: true, cycle: 117, minEdge: 0.05 } });
  ok(q2.verdict === 'regress' && q2.hold.regressed === 118, 'F3: three low observations straight after delivery regress at fire 118, not 119 — no observation holiday');
  ok(H({ obsCycle: 111 }).reason === 'not-yet-eligible' && H({ obsCycle: 111, hold: s1.hold }).reason === 'already-counted', 'F3: the first-service gate still holds for a row that has never been counted');
  var sh1 = Dv({ obsCycle: 116, hold: s3.hold, regressShare: 1, edge: { available: true, cycle: 116, minEdge: 0.10 } });
  var sh2 = Dv({ obsCycle: 117, hold: sh1.hold, regressShare: 1, edge: { available: true, cycle: 117, minEdge: 0.10 } });
  var sh3 = Dv({ obsCycle: 118, hold: sh2.hold, regressShare: 0.5, edge: { available: true, cycle: 118, minEdge: 0.05 } });
  ok(sh2.hold.down === 2 && sh3.hold.down === 1 && sh3.verdict === null && sh3.hold.r === 0.5, 'F4: lowering the regress share mid-streak restarts the count — evidence under one bar is not evidence under another');
  var swapped = cohortAt(112); delete swapped.rows.Dimond; swapped.rows['Montclair'] = { Sick: 100 };
  ok(C.deliveryEdge(d, swapped).reason === 'city-membership-changed' && Array.isArray(d.city) && d.city.length === 11, 'F5: a same-size swap in the city reference is detected — membership is frozen, not just the count');
  ok(H({ obsCycle: 112, stage: 'Funded' }).reason === 'not-a-hold-stage' && H({ obsCycle: 112, holdCycles: 2.5 }).reason === 'bad-dials' && H({ obsCycle: 112, eligibleAfter: '' }).reason === 'no-stage-change-cycle', 'hold: other stages, broken dials and a missing stage-change Cycle count nothing');

  // parity: one matrix through both implementations of all three
  var drift = 0, n = 0;
  [109, 110, 112].forEach(function (oc) { [{}, { Laurel: 96 }, { Laurel: null }, { Laurel: 0 }].forEach(function (ov) { [['Laurel'], [], ['Atlantis'], ['Laurel', 'Fruitvale']].forEach(function (hs) { ['vote', 'conversion', 'x'].forEach(function (og) {
    var co = cohortAt(oc, {}); Object.keys(ov).forEach(function (h) { co.rows[h].Sick = ov[h]; });
    var inp = { origin: og, captureCycle: 110, metric: HEALTH, hoods: hs, cohort: co };
    n++; if (JSON.stringify(C.stageBaselineFrom(inp)) !== JSON.stringify(E.civicStageBaselineFrom_(inp))) drift++;
    n++; if (JSON.stringify(C.deliveryEdge(d, co)) !== JSON.stringify(E.civicDeliveryEdge_(d, co))) drift++;
  }); }); }); });
  ['Standing', 'Delivering', 'Funded', ''].forEach(function (st) { ['', s1.hold, s2.hold, s3.hold, r2.hold, '{bad'].forEach(function (hd) { [111, 112, 113, 114, 116].forEach(function (oc) { [0.3, 0.15, 0.05, -0.1, null].forEach(function (me) { [0.15, 0.2].forEach(function (mg) {
    var inp = { stage: st, hold: hd, obsCycle: oc, edge: me === null ? { available: false } : { available: true, cycle: oc, minEdge: me }, eligibleAfter: 111, margin: mg, regressShare: 0.5, holdCycles: 3, fireCycle: oc + 1 };
    n++; if (JSON.stringify(C.deliveryHoldStep(inp)) !== JSON.stringify(E.civicDeliveryHoldStep_(inp))) drift++;
  }); }); }); }); });
  ok(drift === 0, 'deliver: lib and engine agree on all ' + n + ' fixture combinations');

  // --- the applier, a whole life: Proposed → Funded(+baseline) → Standing → Delivering → regress ---
  var hdr = ['InitiativeID', 'Name', 'Status', 'MayoralAction', 'ImplementationPhase', 'PolicyDomain', 'AffectedNeighborhoods', 'LastUpdated'].concat(C.STAGE_COLUMNS);
  var ix = function (nm) { return hdr.indexOf(nm); };
  var sIx = { stage: ix('Stage'), lastStageChange: ix('LastStageChangeCycle'), lastWork: ix('LastWorkCycle'), status: ix('Status'), mayoralAction: ix('MayoralAction'), phase: ix('ImplementationPhase'), policyDomain: ix('PolicyDomain'), lastUpdated: ix('LastUpdated'), id: ix('InitiativeID'), name: ix('Name'), baseline: ix('StageBaseline'), hold: ix('StageHold'), hoods: ix('AffectedNeighborhoods'), priorPhase: ix('PriorPhase') };
  var CANON = { set: {}, list: HOODS, children: {} }; HOODS.forEach(function (h) { CANON.set[h.toLowerCase()] = true; });
  var CONFIG = { civicDeliverMargin: 0.2, civicDeliverMargin_health: 0.15, civicDeliverHoldCycles: 3, civicDeliverRegressShare: 0.5, civicStageStallCycles: 5, civicStageUntendedStallCycles: 12 };
  var fire = function (row, cycle, sickLaurel, opts) {
    var co = cohortAt(cycle - 1, { Laurel: sickLaurel, Fruitvale: 110 });
    if (opts && opts.unavailable) co = { available: false, reason: 'stamp-not-C' + (cycle - 1), cycle: cycle - 1, tab: 'Neighborhood_Demographics', rows: {} };
    var ctx = { summary: { canonHoods: CANON, cycleId: cycle, civicStageCohort: { cycle: cycle - 1, tabs: { Neighborhood_Demographics: co } } }, config: CONFIG, now: 'NOW' };
    var a = E.applyCivicStageStep_(ctx, row, sIx, cycle);
    var snap = JSON.stringify(row);
    var b = E.applyCivicStageStep_(ctx, row, sIx, cycle), c2 = E.applyCivicStageStep_(ctx, row, sIx, cycle);
    ok(b === false && c2 === false && JSON.stringify(row) === snap, 'applier C' + cycle + ': the second and third call sites change nothing the first did not');
    return a;
  };
  var row = ['INIT-950', 'Laurel Clinic', 'passed', 'signed', 'vote-ready', 'health', 'Laurel, Jingletown', '', 'Proposed', '', '', '', '', '', ''];
  fire(row, 110, 120);
  var bl = JSON.parse(row[ix('StageBaseline')]);
  ok(row[ix('Stage')] === 'Funded' && bl.origin === 'vote' && bl.cycle === 109 && bl.captureCycle === 110 && JSON.stringify(Object.keys(bl.keys)) === JSON.stringify(['Fruitvale', 'Laurel']), 'applier: the vote funds the row AND stamps a vote baseline from the frozen C109 cohort; the child area folds to its parent hood');
  var stamped = row[ix('StageBaseline')];
  row[ix('LastWorkCycle')] = 110;
  fire(row, 111, 118);
  ok(row[ix('Stage')] === 'Standing' && row[ix('ImplementationPhase')] === 'operational' && row[ix('StageHold')] === '', 'applier: work stands it up at 111; the stand-up fire counts no observation');
  fire(row, 112, 117);
  ok(row[ix('StageHold')] === '', 'applier: fire 112 sees observation 111 — the stand-up Cycle, pre-service — and counts nothing');
  fire(row, 113, 84); fire(row, 114, 83);
  ok(JSON.parse(row[ix('StageHold')]).up === 2 && row[ix('Stage')] === 'Standing', 'applier: two qualifying observations, still Standing');
  fire(row, 115, 82);
  var hd = JSON.parse(row[ix('StageHold')]);
  ok(row[ix('Stage')] === 'Delivering' && row[ix('LastStageChangeCycle')] === 115 && hd.first === 115 && row[ix('ImplementationPhase')] === 'operational', 'applier: delivers at fire 115 (S+4), phase stays operational (ruling 8), first-delivered stamped');
  ok(row[ix('StageBaseline')] === stamped, 'applier: the baseline cell was written once and never rewritten');
  var tendArgs = function () { return { stage: row[ix('Stage')], cycle: 125, lastWorkCycle: row[ix('LastWorkCycle')], lastStageChangeCycle: row[ix('LastStageChangeCycle')], grace: 6, decay: 0.15, floor: 0.3 }; };
  fire(row, 116, 94); fire(row, 117, 119); fire(row, 118, 121);
  ok(row[ix('Stage')] === 'Delivering' && JSON.parse(row[ix('StageHold')]).down === 2, 'applier: two slipping observations, still Delivering');
  var tendBefore = C.tendFactor(tendArgs());
  fire(row, 119, 125);
  ok(row[ix('Stage')] === 'Standing' && row[ix('LastStageChangeCycle')] === 115 && JSON.parse(row[ix('StageHold')]).regressed === 119, 'applier: three slipping observations → regress to Standing; LastStageChangeCycle is NOT stamped');
  var tendAfter = C.tendFactor(tendArgs());
  ok(tendBefore.reference === tendAfter.reference && tendBefore.factor === tendAfter.factor && tendAfter.factor < 1, 'applier: the regress does not reset tend — a neglected service stays weak (factor ' + tendAfter.factor + '), it is not repaired by slipping');
  ok(row[ix('StageBaseline')] === stamped, 'applier: a regress never rebases the baseline');

  // gates around the delivery step
  var mkRow = function (o) { var r = ['INIT-951', 'X', 'passed', 'signed', 'operational', 'health', 'Laurel', '', 'Standing', stamped, 111, 111, '', '', '']; Object.keys(o).forEach(function (k) { r[ix(k)] = o[k]; }); return r; };
  var quiet = function (r, label) { var before = JSON.stringify(r); var ctx = { summary: { canonHoods: CANON, cycleId: 114, civicStageCohort: { cycle: 113, tabs: { Neighborhood_Demographics: cohortAt(113, { Laurel: 90, Fruitvale: 90 }) } } }, config: CONFIG, now: 'NOW' }; ok(E.applyCivicStageStep_(ctx, r, sIx, 114) === false && JSON.stringify(r) === before, label); };
  quiet(mkRow({ ImplementationPhase: 'stalled' }), 'applier: a stalled row is not judged — nothing advances while the row is down');
  quiet(mkRow({ Status: 'vetoed' }), 'applier: only a voted row is judged');
  quiet(mkRow({ PolicyDomain: 'safety', StageBaseline: '' }), 'applier: a domain with no lever gets no baseline and no hold (ruling 3)');
  quiet(mkRow({ PolicyDomain: 'transit', StageBaseline: '' }), 'applier: transit has no hood reader yet — no baseline, no hold, no clock');
  quiet(mkRow({ Stage: '' }), 'applier: a blank Stage is a legacy row — untouched');
  ok(C.stageRequirement({ stage: 'Standing', policyDomain: 'transit' }).blocked === 'no-delivering-reader' && C.stageRequirement({ stage: 'Standing', policyDomain: 'health' }).blocked === null, 'stage: a playable domain whose metric cannot be read yet says so, and runs no clock (SIM_DOCTRINE §15)');
  var noCanon = mkRow({ Stage: 'Funded', StageBaseline: '', LastStageChangeCycle: 113, LastWorkCycle: '' });
  var ncThrew = false;
  try { E.applyCivicStageStep_({ summary: { cycleId: 114, civicStageCohort: { cycle: 113, tabs: { Neighborhood_Demographics: cohortAt(113) } } }, config: CONFIG, now: 'NOW' }, noCanon, sIx, 114); } catch (e) { ncThrew = true; }
  ok(!ncThrew && noCanon[ix('StageBaseline')] === '', 'applier: an unseeded canon hood set stamps nothing and never throws — a throw here would take the whole civic engine down for the fire');
  var conv = mkRow({ StageBaseline: '' });
  var ctxC = { summary: { canonHoods: CANON, cycleId: 114, civicStageCohort: { cycle: 113, tabs: { Neighborhood_Demographics: cohortAt(113, { Laurel: 120 }) } } }, config: CONFIG, now: 'NOW' };
  E.applyCivicStageStep_(ctxC, conv, sIx, 114);
  ok(JSON.parse(conv[ix('StageBaseline')]).origin === 'conversion' && JSON.parse(conv[ix('StageHold')]).up === 0, 'applier: a Standing row with no baseline takes a conversion baseline and says so; that same observation is never compared against itself');
  var un2 = mkRow({}); fire(un2, 114, 0, { unavailable: true });
  ok(JSON.parse(un2[ix('StageHold')]).obs === 113 && JSON.parse(un2[ix('StageHold')]).up === 0, 'applier: a fire whose cohort could not be frozen counts nothing and says it looked');
  var threw = false; try { E.getCivicDeliverDials_({ config: { civicDeliverMargin: 0.2, civicDeliverHoldCycles: 3 } }, 'health'); } catch (e) { threw = /civicDeliverRegressShare/.test(e.message); }
  ok(threw && E.getCivicDeliverDials_({ config: CONFIG }, 'health').margin === 0.15 && E.getCivicDeliverDials_({ config: CONFIG }, 'education').margin === 0.2, 'dials: fail-loud on a missing key; the per-domain margin wins over the default');


  // ---- civic.38 Task 4 step 3: the losing clock, revival, ordering, ruling 2, T7 ----
  ok(bodyOf(E.civicStallClock_) === bodyOf(C.stallClock) && bodyOf(E.civicReviveDecision_) === bodyOf(C.reviveDecision), 'stall: clock and revival bodies are text-identical in lib and engine');
  var K = function (o) { return C.stallClock(Object.assign({ stage: 'Standing', phase: 'operational', cycle: 118, lastWorkCycle: 100, lastStageChangeCycle: 100, stallCycles: 5, untendedStallCycles: 12 }, o)); };
  ok(K({}).clock === 'untended' && K({}).elapsed === 18 && K({}).stalled === true, 'stall: Standing untended 18 > 12 stalls');
  ok(K({ cycle: 112 }).stalled === false && K({ cycle: 113 }).stalled === true, 'stall: strict — a row may sit the full 12 untended Cycles; the 13th stalls it');
  ok(K({ lastWorkCycle: 110 }).reference === 110 && K({ lastWorkCycle: '', lastStageChangeCycle: 110 }).reference === 110, 'stall: the untended reference is the later of work and stage change — the same reference tendFactor decays from');
  ok(K({ stage: 'Delivering' }).clock === 'untended', 'stall: Delivering runs the untended clock too');
  ok(K({ stage: 'Funded', phase: 'vote-ready', lastWorkCycle: '' }).clock === 'funded' && K({ stage: 'Funded', phase: 'vote-ready', cycle: 105 }).stalled === false && K({ stage: 'Funded', phase: 'vote-ready', cycle: 106 }).stalled === true, 'stall: Funded runs the stage-change clock at 5, strict');
  ok(K({ stage: 'Funded', phase: 'vote-ready', lastWorkCycle: 117 }).reference === 100, 'stall: at Funded, work never resets the clock — only the stage change does (and work that clears the gate IS a stage change)');
  ok(K({ stage: 'Proposed' }).clock === null && K({ stage: 'Proposed' }).reason === 'no-clock-on-proposed', 'stall: no clock on Proposed (builder ruling 3)');
  ok(K({ stage: '' }).clock === null && K({ blocked: 'no-delivering-gate' }).stalled === true, 'stall: no clock on a legacy row; an unbuilt delivering gate does NOT exempt a Standing row from the neglect clock (agy F1)');
  ok(K({ phase: 'stalled' }).clock === null && K({ phase: 'defunded' }).clock === null, 'stall: a row already down is not re-stalled');
  ok(K({ cycle: 100 }).elapsed === 0 && K({ untendedStallCycles: 'x' }).reason === 'bad-dial' && K({ lastWorkCycle: '', lastStageChangeCycle: '' }).reason === 'no-reference-cycle', 'stall: cycle == reference reads 0; a broken dial or no reference runs no clock');
  var V = function (o) { return C.reviveDecision(Object.assign({ stage: 'Standing', phase: 'stalled', priorPhase: 'operational', stallCycle: 118, lastWorkCycle: 118 }, o)); };
  ok(V({}).revive === true && V({}).phase === 'operational', 'revive: work stamped with the stall Cycle revives (the fold stamps the closing Cycle — same rule as the Funded gate)');
  ok(V({ lastWorkCycle: 117 }).revive === false && V({ lastWorkCycle: 117 }).reason === 'work-predates-stall', 'revive: work from before the stall is not a revival — once per stall');
  ok(V({ phase: 'operational' }).revive === false && V({ stallCycle: 0 }).revive === false && V({ lastWorkCycle: '' }).revive === false, 'revive: not stalled, no stall Cycle or no work → nothing');
  // codex stall-clock review F1/F2/F3
  ok(V({ stage: 'Proposed' }).reason === 'not-a-stall-stage' && V({ stage: 'Bogus' }).revive === false, 'revive: only Funded / Standing / Delivering revive (codex F1)');
  ok(V({ priorPhase: 'stalled' }).phase === 'operational' && V({ priorPhase: 'defunded', stage: 'Funded' }).phase === 'vote-ready', 'revive: a stale PriorPhase that is itself a down phase takes the fallback, never a "restoration" to stalled (codex F2)');
  ok(V({ lastWorkCycle: 999, cycle: 119 }).reason === 'work-from-the-future' && V({ lastWorkCycle: 119, cycle: 119 }).revive === true, 'revive: work stamped past the current fire is refused (codex F3)');
  ok(V({ priorPhase: 'dispatch-live' }).phase === 'dispatch-live' && V({ priorPhase: '' }).phase === 'operational' && V({ priorPhase: '', stage: 'Funded' }).phase === 'vote-ready', 'revive: returns to PriorPhase; a blank one falls back to the stage\'s own phase so no row is stuck paying -2 with no handle');

  // parity over a matrix
  var sdrift = 0, sn = 0;
  ['', 'Proposed', 'Funded', 'Standing', 'Delivering', 'Bogus'].forEach(function (st) { ['operational', 'vote-ready', 'stalled', 'blocked', ''].forEach(function (ph) { [null, 'no-delivering-gate'].forEach(function (bl) { [[100, 100], ['', 100], [110, 100], ['', '']].forEach(function (w) { [100, 105, 106, 112, 113, 130].forEach(function (cy) {
    var inp = { stage: st, phase: ph, blocked: bl, cycle: cy, lastWorkCycle: w[0], lastStageChangeCycle: w[1], stallCycles: 5, untendedStallCycles: 12 };
    sn++; if (JSON.stringify(C.stallClock(inp)) !== JSON.stringify(E.civicStallClock_(inp))) sdrift++;
    var rv = { stage: st, phase: ph, priorPhase: w[0] ? (cy % 2 ? 'x' : 'blocked') : '', stallCycle: w[1], lastWorkCycle: cy, cycle: cy % 3 ? 130 : 105 };
    sn++; if (JSON.stringify(C.reviveDecision(rv)) !== JSON.stringify(E.civicReviveDecision_(rv))) sdrift++;
  }); }); }); }); });
  ok(sdrift === 0, 'stall: lib and engine agree on all ' + sn + ' fixture combinations');
  var heldSt = C.deliveryHoldStep({ stage: 'Standing', hold: '{"v":1,"obs":112,"up":1,"down":0,"first":0,"regressed":0,"m":0.15,"r":0.5,"st":118}', obsCycle: 113, edge: { available: true, cycle: 113, minEdge: 0.3 }, eligibleAfter: 111, margin: 0.15, regressShare: 0.5, holdCycles: 3, fireCycle: 114 });
  ok(heldSt.hold.st === 118 && E.civicStageHoldRead_('{"v":1,"st":118}').st === 118 && E.civicStageHoldRead_('').st === 0, 'stall: the delivery hold carries `st` through untouched; the hold reader tolerates blank and partial cells');

  // the applier: stall entry, held stall, revival, revived Funded stands up, ordering
  var fireAt = function (row, cycle, cohortOver) {
    var ctx = { summary: { canonHoods: CANON, cycleId: cycle, civicStageCohort: { cycle: cycle - 1, tabs: { Neighborhood_Demographics: cohortAt(cycle - 1, cohortOver || {}) } } }, config: CONFIG, now: 'NOW' };
    var a = E.applyCivicStageStep_(ctx, row, sIx, cycle); var snap = JSON.stringify(row);
    ok(E.applyCivicStageStep_(ctx, row, sIx, cycle) === false && JSON.stringify(row) === snap, 'stall applier C' + cycle + ': idempotent within the fire');
    return { changed: a, ctx: ctx };
  };
  var neglected = ['INIT-960', 'Neglected Clinic', 'passed', 'signed', 'operational', 'health', 'Laurel', '', 'Standing', stamped, 100, 100, 'MAYOR', '', ''];
  var r1 = fireAt(neglected, 118);
  var h1 = JSON.parse(neglected[ix('StageHold')]);
  ok(r1.changed && neglected[ix('ImplementationPhase')] === 'stalled' && neglected[ix('PriorPhase')] === 'operational' && h1.st === 118 && neglected[ix('Stage')] === 'Standing' && neglected[ix('LastStageChangeCycle')] === 100, 'stall: untended 18 > 12 → phase stalled, PriorPhase stamped, st 118; Stage and stage-change Cycle untouched');
  ok(!r1.ctx.summary.initiativeEnginePhaseMoves, 'stall: no business-lift carry on a stall (ruling 7)');
  fireAt(neglected, 119);
  ok(neglected[ix('ImplementationPhase')] === 'stalled' && JSON.parse(neglected[ix('StageHold')]).st === 118 && neglected[ix('PriorPhase')] === 'operational', 'stall: a held stall stays stalled, PriorPhase kept, st unchanged');
  neglected[ix('LastWorkCycle')] = 119;   // the fold stamps the closing Cycle
  var r3 = fireAt(neglected, 120);
  ok(r3.changed && neglected[ix('ImplementationPhase')] === 'operational' && neglected[ix('PriorPhase')] === '' && JSON.parse(neglected[ix('StageHold')]).st === 0 && !r3.ctx.summary.initiativeEnginePhaseMoves, 'revive: one work move after the stall restores operational, clears PriorPhase and st, carries no lift');
  ok(C.tendFactor({ stage: 'Standing', cycle: 120, lastWorkCycle: 119, lastStageChangeCycle: 100, grace: 6, decay: 0.15, floor: 0.3 }).factor === 1, 'revive: the same work move is the tending that restores full strength');
  fireAt(neglected, 121);
  ok(neglected[ix('ImplementationPhase')] === 'operational', 'revive: the revived row does not re-stall the next fire — the untended reference moved with the work');
  var vet = ['INIT-965', 'Vetoed Later', 'vetoed', 'vetoed', 'stalled', 'health', 'Laurel', '', 'Standing', stamped, 100, 118, '', 'operational', '{"v":1,"st":118}'];
  var vetBefore = JSON.stringify(vet);
  fireAt(vet, 119);
  ok(JSON.stringify(vet) === vetBefore, 'revive: a row that is no longer passed + signed gets no revival, whatever its work says (codex F1)');
  var fundedRow = ['INIT-961', 'Slow Bill', 'passed', 'signed', 'vote-ready', 'health', 'Laurel', '', 'Funded', '', 100, '', '', '', ''];
  fireAt(fundedRow, 105);
  ok(fundedRow[ix('ImplementationPhase')] === 'vote-ready', 'stall: Funded sits the full 5 Cycles');
  fireAt(fundedRow, 106);
  ok(fundedRow[ix('ImplementationPhase')] === 'stalled' && fundedRow[ix('PriorPhase')] === 'vote-ready' && JSON.parse(fundedRow[ix('StageHold')]).st === 106, 'stall: Funded stalls at the 6th — the work never came');
  fundedRow[ix('LastWorkCycle')] = 106;
  var r5 = fireAt(fundedRow, 107);
  ok(r5.changed && fundedRow[ix('Stage')] === 'Standing' && fundedRow[ix('ImplementationPhase')] === 'operational' && fundedRow[ix('LastStageChangeCycle')] === 107 && fundedRow[ix('PriorPhase')] === '' && r5.ctx.summary.initiativeEnginePhaseMoves['INIT-961'] === 'vote-ready', 'revive: a revived Funded row whose work clears the gate stands up in the SAME call (revival runs before the move) — the stand-up carries its lift, the revival does not');
  var late = ['INIT-962', 'Late Work', 'passed', 'signed', 'vote-ready', 'health', 'Laurel', '', 'Funded', '', 100, 106, '', '', ''];
  fireAt(late, 107);
  ok(late[ix('Stage')] === 'Standing' && late[ix('ImplementationPhase')] === 'operational', 'order: work that lands the week the Funded clock would expire stands the row up — a stage change beats the clock');
  var safe = ['INIT-963', 'Safety Row', 'passed', 'signed', 'dispatch-live', 'safety', 'Laurel', '', 'Standing', '', 90, 90, '', '', ''];
  fireAt(safe, 130);
  ok(safe[ix('ImplementationPhase')] === 'stalled' && safe[ix('PriorPhase')] === 'dispatch-live' && safe[ix('Stage')] === 'Standing', 'stall: a Standing row in a domain with no delivering gate STILL stalls when untended — neglect has nothing to do with the metric reader (agy F1)');
  var delivered = ['INIT-964', 'Delivered Clinic', 'passed', 'signed', 'operational', 'health', 'Laurel', '', 'Delivering', stamped, 115, 108, '', '', '{"v":1,"obs":126,"up":0,"down":0,"first":115,"regressed":0,"m":0.15,"r":0.5,"st":0}'];
  fireAt(delivered, 127, { Laurel: 96, Fruitvale: 88 });
  ok(delivered[ix('ImplementationPhase')] === 'operational' && JSON.parse(delivered[ix('StageHold')]).obs === 126, 'stall: Delivering, tended at 115, 12 untended at fire 127 → not yet (strict)');
  fireAt(delivered, 128, { Laurel: 96, Fruitvale: 88 });
  var dh = JSON.parse(delivered[ix('StageHold')]);
  ok(delivered[ix('ImplementationPhase')] === 'stalled' && delivered[ix('Stage')] === 'Standing' && delivered[ix('LastStageChangeCycle')] === 115 && dh.st === 128 && dh.regressed === 128 && dh.first === 115 && dh.obs === 127 && dh.up === 0, 'stall: a neglected Delivering row stalls at the 13th untended Cycle and FALLS to Standing (agy F2) — stage-change Cycle and baseline untouched, first-delivered and the counted observation survive');
  delivered[ix('LastWorkCycle')] = 128;
  fireAt(delivered, 129, { Laurel: 96, Fruitvale: 88 });
  ok(delivered[ix('ImplementationPhase')] === 'operational' && delivered[ix('Stage')] === 'Standing' && JSON.parse(delivered[ix('StageHold')]).st === 0 && JSON.parse(delivered[ix('StageHold')]).first === 115, 'stall: revived at Standing — it must re-prove delivery; a second delivery would pay no second completed');

  // ruling 2: approval reads a staged row as sitting, never silence; the ENGINE-CLOCK hold and v1.9 reschedule are legacy-only
  var apprSrc2 = fs.readFileSync(path.join(root, 'phase05-citizens/updateCivicApprovalRatings.js'), 'utf8');
  var A2 = new Function('Logger', apprSrc2 + '\nreturn { classifyInitiativeMotion_: classifyInitiativeMotion_ };')({ log: function () {} });
  ok(A2.classifyInitiativeMotion_('operational', null, 120, null, true) === 'sitting' && A2.classifyInitiativeMotion_('operational', 110, 120, null, true) === 'sitting', 'ruling 2: a staged row with a blank or past NextActionCycle is sitting, never silence');
  ok(A2.classifyInitiativeMotion_('operational', null, 120, null, false) === 'silence' && A2.classifyInitiativeMotion_('operational', null, 120, null) === 'silence', 'ruling 2: legacy rows keep silence');
  ok(A2.classifyInitiativeMotion_('stalled', 110, 120, 'operational', true) === 'failed' && A2.classifyInitiativeMotion_('operational', 110, 121, 'stalled', true) === 'sitting' && A2.classifyInitiativeMotion_('operational', 110, 122, 'operational', true) === 'sitting', 'ruling 2 + Task 5: staged stall entry reads failed, revival reads sitting (not advanced), held revival sitting');
  ok(/tStage !== -1 && !!\(tr\[tStage\] \|\| ''\)\.toString\(\)\.trim\(\)/.test(apprSrc2), 'ruling 2: the approval reader passes the staged flag off the Stage column');
  ok((engineSrc.match(/!isStagedRow && applyEngineClockHold_\(/g) || []).length === 2 && /!isStagedRow && status === 'visioning-complete'/.test(engineSrc), 'ruling 2: both ENGINE-CLOCK hold call sites and the v1.9 reschedule are gated on a blank Stage');

  // T7 yields on any staged row (ruling 6, codex F5)
  (function () {
    var fx2 = fs.readFileSync(path.join(root, 'phase02-world-state/applyInitiativeImplementationEffects.js'), 'utf8');
    var intents = [];
    var mkCtx = function (stage) {
      var hdr2 = ['Name', 'Status', 'ImplementationPhase', 'PolicyDomain', 'AffectedNeighborhoods', 'Budget', 'InitiativeID', 'Stage', 'LastWorkCycle', 'LastStageChangeCycle'];
      var grid = [hdr2, ['Baylight District — Final Council Vote', 'passed', 'construction-planning', 'sports', 'Jack London', '$2.1B', 'INIT-006', stage, '', '']];
      return { summary: { cycleId: 120, sportsZones: ['Baylight District'], previousCycleState: {} }, config: { civicTendGraceCycles: 6, civicTendDecayPerCycle: 0.15, civicTendFloor: 0.3 },
        ss: { getSheetByName: function (n) { return n === 'Initiative_Tracker' ? { getDataRange: function () { return { getValues: function () { return grid; } }; } } : null; } } };
    };
    var I = new Function('Logger', 'queueCellIntent_', 'recordRipple_', fx2 + '\nreturn { run: applyInitiativeImplementationEffects_ };')(
      { log: function () {} }, function (ctx, tab, r, c, v) { intents.push([tab, r, c, v]); }, function () {});
    I.run(mkCtx(''));
    var legacyT7 = intents.length;
    intents = [];
    I.run(mkCtx('Standing'));
    ok(legacyT7 === 1 && intents.length === 0, 'T7: queues operational for an unstaged Baylight row (' + legacyT7 + ') and yields on a staged one (' + intents.length + ') — one owner for a staged row\'s phase');
  })();

  // --- the freeze ---
  var sheetOf = function (grid) { return { getDataRange: function () { return { getValues: function () { return grid; } }; } }; };
  var reads = [];
  var ssOf = function (tabs) { return { getSheetByName: function (nm) { reads.push(nm); return tabs[nm] ? sheetOf(tabs[nm]) : null; } }; };
  var demo = function (stampFor) { return [['Neighborhood', 'Sick', 'LastUpdated', 'SchoolQualityIndex']].concat(HOODS.map(function (h) { return [h, 100, stampFor(h), 50]; })); };
  var trackerGrid = function (stage) { return [['InitiativeID', 'PolicyDomain', 'Stage'], ['INIT-1', 'health', stage], ['INIT-2', 'safety', stage], ['INIT-3', 'transit', stage]]; };
  var fz = function (stage, demoGrid) { reads = []; var ctx = { summary: { cycleId: 110, canonHoods: { list: HOODS } }, config: {}, ss: ssOf({ Initiative_Tracker: trackerGrid(stage), Neighborhood_Demographics: demoGrid }) }; E.freezeCivicStageCohort_(ctx); return ctx.summary.civicStageCohort; };
  ok(fz('', demo(function () { return 109; })) === null && reads.join() === 'Initiative_Tracker', 'freeze: every Stage blank → no cohort and NO metric tab is read (inert on live)');
  var good = fz('Standing', demo(function () { return 109; }));
  ok(good.cycle === 109 && JSON.stringify(Object.keys(good.tabs)) === JSON.stringify(['Neighborhood_Demographics']) && good.tabs.Neighborhood_Demographics.available === true && good.tabs.Neighborhood_Demographics.rows.Laurel.Sick === 100, 'freeze: reads only the tabs a staged, playable, hood-scoped row gates on; all rows stamped N-1 → a cohort');
  ok(/^stamp-not-C109:Laurel=110/.test(fz('Standing', demo(function (h) { return h === 'Laurel' ? 110 : 109; })).tabs.Neighborhood_Demographics.reason), 'freeze: ONE row stamped by this fire (a crashed run re-fired) → the whole tab is unavailable, never a mixed N/N-1 table');
  ok(/^coverage-10-of-11/.test(fz('Standing', demo(function () { return 109; }).slice(0, 11)).tabs.Neighborhood_Demographics.reason), 'freeze: a missing hood → unavailable');
  var childGrid = demo(function () { return 109; }); childGrid[3][0] = 'Jingletown';
  ok(/^not-a-parent-hood:Jingletown/.test(fz('Standing', childGrid).tabs.Neighborhood_Demographics.reason), 'freeze: a child-area row is refused, never folded into a guessed merge');
  var dupGrid = demo(function () { return 109; }); dupGrid[3][0] = dupGrid[2][0];
  ok(/^duplicate-hood/.test(fz('Standing', dupGrid).tabs.Neighborhood_Demographics.reason), 'freeze: a duplicate hood → unavailable');

  // --- wiring: both entry points freeze before any producer; approval pays first delivery once ---
  var eng = fs.readFileSync(path.join(root, 'phase01-config/godWorldEngine2.js'), 'utf8');
  var pairs = eng.match(/'Phase2-CivicStageCohort', function\(\) \{ freezeCivicStageCohort_\(ctx\); \}\);\s*\n\s*safePhaseCall_\(ctx, 'Phase2-InitiativeEffects'/g) || [];
  ok(pairs.length === 2, 'wiring: both entry points freeze the cohort immediately before Phase2-InitiativeEffects (' + pairs.length + ' of 2)');
  var apprSrc = fs.readFileSync(path.join(root, 'phase05-citizens/updateCivicApprovalRatings.js'), 'utf8');
  var A = new Function('Logger', apprSrc + '\nreturn { civicFirstDeliveredCycle_: civicFirstDeliveredCycle_ };')({ log: function () {} });
  ok(A.civicFirstDeliveredCycle_(JSON.stringify(hd)) === 115 && A.civicFirstDeliveredCycle_('') === 0 && A.civicFirstDeliveredCycle_('{bad') === 0 && A.civicFirstDeliveredCycle_('{"v":1,"first":0}') === 0 && A.civicFirstDeliveredCycle_(null) === 0, 'approval: first-delivered Cycle is read off StageHold; blank, broken or never-delivered → 0');
  ok(/motion: \(Number\(cycle\) > 0 && civicFirstDeliveredCycle_\(tStageHold !== -1 \? tr\[tStageHold\] : ''\) === Number\(cycle\)\)\s*\n\s*\? 'completed'/.test(apprSrc), 'approval: `completed` pays in the one fire StageHold.first equals this Cycle — once per row, ever');
  ok(/\['civicDeliverRegressShare', 0\.5,/.test(fs.readFileSync(path.join(root, 'phase01-config/engine94SheetContract.js'), 'utf8')), 'dials: civicDeliverRegressShare is seeded in the engine.213 group');
})();

console.log('=== legacyStageConversion (civic.38 Task 4 step 4) ===');
(function () {
  var live = {
    'INIT-001': { InitiativeID: 'INIT-001', Status: 'passed', PolicyDomain: 'economic', ImplementationPhase: 'disbursement-active', Outcome: 'PASSED', MayoralAction: 'none', MayoralActionCycle: '', VoteCycle: '78', MilestoneNotes: 'C107: Downtown canvass.' },
    'INIT-002': { InitiativeID: 'INIT-002', Status: 'passed', PolicyDomain: 'safety', ImplementationPhase: 'dispatch-live', Outcome: 'PASSED', MayoralAction: 'signed', MayoralActionCycle: '82', VoteCycle: '82', MilestoneNotes: 'C107: East Oakland dispatch.' },
    'INIT-003': { InitiativeID: 'INIT-003', Status: 'visioning-complete', PolicyDomain: 'transit', ImplementationPhase: 'design-phase', Outcome: 'COMPLETED', MayoralAction: 'none', VoteCycle: '94', MilestoneNotes: 'C107: Merchant covenants executed, design RFP published' },
    'INIT-005': { InitiativeID: 'INIT-005', Status: 'passed', PolicyDomain: 'health', ImplementationPhase: 'construction-active', Outcome: 'PASSED', MayoralAction: 'none', MayoralActionCycle: '', VoteCycle: '80', MilestoneNotes: 'C107: MEP rough-ins completed' },
    'INIT-006': { InitiativeID: 'INIT-006', Status: 'passed', PolicyDomain: 'sports', ImplementationPhase: 'construction-planning', MayoralAction: 'signed', VoteCycle: '83', MilestoneNotes: 'C107: Construction contracts executed' },
    'INIT-007': { InitiativeID: 'INIT-007', Status: 'announced', PolicyDomain: 'workforce', ImplementationPhase: 'operational', MayoralAction: 'none', VoteCycle: '', MilestoneNotes: 'C107: town hall' },
  };
  ok(Object.keys(C.LEGACY_STAGE_CONVERSION).sort().join(',') === Object.keys(live).sort().join(','), 'table names exactly the six live rows');

  var u1 = C.legacyStageConversion(live['INIT-001'], 108);
  ok(u1 && u1.Stage === 'Standing' && u1.LastStageChangeCycle === 108, 'INIT-001 → Standing at the conversion Cycle');
  ok(u1 && u1.MayoralAction === 'signed' && u1.MayoralActionCycle === 78, 'INIT-001 recorded signed at its vote Cycle (pre-v1.7 row)');
  ok(u1 && /^C107: Downtown canvass\.\nC108 conversion: passed C78/.test(u1.MilestoneNotes) && /Stage Standing/.test(u1.MilestoneNotes), 'INIT-001 notes keep the prior line and say what the conversion did');
  ok(u1 && !('Status' in u1) && !('VoteCycle' in u1) && !('StageBaseline' in u1), 'INIT-001: Status, VoteCycle, StageBaseline untouched (engine stamps the baseline at the next fire)');

  var u2 = C.legacyStageConversion(live['INIT-002'], 108);
  ok(u2 && u2.Stage === 'Standing' && !('MayoralAction' in u2), 'INIT-002 → Standing; already signed, no re-sign');

  var u3 = C.legacyStageConversion(live['INIT-003'], 108);
  ok(u3 && u3.Stage === 'Proposed' && u3.Status === 'proposed' && u3.VoteCycle === '', 'INIT-003 → Proposed / Status proposed / VoteCycle cleared');
  ok(u3 && /VoteCycle 94, Outcome COMPLETED, Status visioning-complete/.test(u3.MilestoneNotes) && /^C107: Merchant covenants/.test(u3.MilestoneNotes), 'INIT-003 history copied into MilestoneNotes before the clear');
  ok(u3 && !('MayoralAction' in u3) && !('Outcome' in u3) && !('ImplementationPhase' in u3), 'INIT-003: nothing else erased');

  var u5 = C.legacyStageConversion(live['INIT-005'], 108);
  ok(u5 && u5.Stage === 'Standing' && u5.MayoralAction === 'signed' && u5.MayoralActionCycle === 80, 'INIT-005 → Standing, signed at C80');

  ok(C.legacyStageConversion(live['INIT-006'], 108) === null, 'INIT-006 Baylight left unstaged');
  ok(C.legacyStageConversion(live['INIT-007'], 108) === null, 'INIT-007 Apprenticeship left unstaged');

  var again = C.legacyStageConversion(Object.assign({}, live['INIT-001'], u1), 109);
  ok(again === null, 'rerun on a converted row writes nothing (idempotent)');
  var threw = false; try { C.legacyStageConversion({ InitiativeID: 'INIT-999' }, 108); } catch (e) { threw = true; }
  ok(threw, 'an unlisted row throws — a seventh row is a decision');
  threw = false; try { C.legacyStageConversion(Object.assign({}, live['INIT-001'], { VoteCycle: '' }), 108); } catch (e) { threw = true; }
  ok(threw, 'sign-at-conversion with no VoteCycle throws rather than inventing one');
  threw = false; try { C.legacyStageConversion(live['INIT-002'], 'x'); } catch (e) { threw = true; }
  ok(threw, 'bad cycle throws');
})();

console.log('=== housingBurdenCohort (engine.251 rulings 1-2) ===');
(function () {
  var HH = function (id, hood, type, rent, inc, status) { return { HouseholdId: id, Neighborhood: hood, HousingType: type, MonthlyRent: rent, HouseholdIncome: inc, Status: status || 'active' }; };
  var rows = [];
  for (var i = 0; i < 12; i++) rows.push(HH('A' + i, 'West Oakland', 'rented', 1000 + i * 100, 48000));   // burdens .25 .275 ... .525 → median (0.5*(.5+.525)?) computed below
  for (var j = 0; j < 3; j++) rows.push(HH('B' + j, 'Adams Point', 'rented', 1500, 40000));               // thin (3 < 10)
  rows.push(HH('O1', 'West Oakland', 'owned', 2500, 90000));
  rows.push(HH('D1', 'West Oakland', 'rented', 900, 30000, 'dissolved'));
  rows.push(HH('Z1', 'West Oakland', 'rented', '', 30000));
  rows.push(HH('Z2', 'West Oakland', 'rented', 1200, 0));
  rows.push(HH('Z3', '', 'rented', 1200, 30000));
  rows.push(HH('C1', 'Laurel Heights', 'rented', 1300, 52000));
  var c = C.housingBurdenCohort({ rows: rows, cycle: 110, minRenters: 10, resolveHood: function (h) { return h === 'Laurel Heights' ? 'Laurel' : h; } });
  ok(c.available === true && c.tab === 'Household_Ledger' && c.cycle === 110, 'cohort shape: available, tab, cycle');
  var wo = []; for (var k = 0; k < 12; k++) wo.push((1000 + k * 100) * 12 / 48000); wo.sort(function (a, b) { return a - b; });
  var expect = Math.round(((wo[5] + wo[6]) / 2) * 10000) / 10000;
  ok(c.rows['West Oakland'] && c.rows['West Oakland'][C.HOUSING_BURDEN_COLUMN] === expect && c.counts['West Oakland'] === 12, 'West Oakland: median of 12 valid renters (owned, dissolved, invalid rent/income excluded)');
  ok(!c.rows['Adams Point'] && c.thin.indexOf('Adams Point') >= 0 && c.counts['Adams Point'] === 3, 'a hood under minRenters is named thin and left out of the city');
  ok(c.counts['Laurel'] === 1 && !c.rows['Laurel'], 'hoods fold through resolveHood; a one-renter hood is thin');
  ok(c.skipped.notRented === 1 && c.skipped.notActive === 1 && c.skipped.invalidRent === 1 && c.skipped.invalidIncome === 1 && c.skipped.noHood === 1, 'every exclusion is counted, never silently dropped');
  var none = C.housingBurdenCohort({ rows: rows.slice(12), cycle: 110, minRenters: 10 });
  ok(none.available === false && none.reason === 'no-hood-clears-min-renters', 'no member hood → unavailable with the reason');
  ok(C.housingBurdenCohort({ rows: rows, cycle: 'x', minRenters: 10 }).reason === 'bad-cycle' && C.housingBurdenCohort({ rows: rows, cycle: 110, minRenters: 0 }).reason === 'bad-min-renters' && C.housingBurdenCohort({ cycle: 110, minRenters: 10 }).reason === 'no-rows', 'bad inputs refuse by name');
  // the cohort feeds the built comparator unchanged
  var b = C.stageBaselineFrom({ metric: { tab: 'Household_Ledger', column: [C.HOUSING_BURDEN_COLUMN], direction: 'down', scope: 'hood' }, origin: 'conversion', captureCycle: 111, cohort: c, hoods: ['West Oakland'] });
  ok(b.ok === true && b.descriptor.cityN === 1 && b.descriptor.keys['West Oakland'][C.HOUSING_BURDEN_COLUMN] === expect, 'stageBaselineFrom accepts the housing cohort as-is (city = member hoods only)');
  ok(C.HOUSING_BURDEN_COLUMN === C.stageCatalogByDomain().housing.stage3Metric.column[0], 'the cohort column is the catalog identifier');
  // engine mirror parity: civicHousingBurdenCohort_ over the same fixtures
  var fs2 = require('fs'), path2 = require('path');
  var src2 = fs2.readFileSync(path2.join(__dirname, '..', 'phase05-citizens', 'civicInitiativeEngine.js'), 'utf8');
  var E2 = new Function('Logger', src2 + '\nreturn { civicHousingBurdenCohort_: civicHousingBurdenCohort_, CIVIC_HOUSING_BURDEN_COLUMN_: CIVIC_HOUSING_BURDEN_COLUMN_ };')({ log: function () {} });
  ok(E2.CIVIC_HOUSING_BURDEN_COLUMN_ === C.HOUSING_BURDEN_COLUMN, 'engine mirrors the column identifier');
  var fixtures = [
    { rows: rows, cycle: 110, minRenters: 10, resolveHood: function (h) { return h === 'Laurel Heights' ? 'Laurel' : h; } },
    { rows: rows, cycle: 110, minRenters: 1 },
    { rows: rows.slice(12), cycle: 110, minRenters: 10 },
    { rows: [], cycle: 110, minRenters: 10 },
    { rows: rows, cycle: 'x', minRenters: 10 }, { rows: rows, cycle: 110, minRenters: 0 }, { cycle: 110, minRenters: 10 },
  ];
  var mismatch = 0;
  for (var fi = 0; fi < fixtures.length; fi++) { if (JSON.stringify(C.housingBurdenCohort(fixtures[fi])) !== JSON.stringify(E2.civicHousingBurdenCohort_(fixtures[fi]))) mismatch++; }
  ok(mismatch === 0, 'parity: lib housingBurdenCohort === engine civicHousingBurdenCohort_ over ' + fixtures.length + ' fixtures');
  // membership flux: a hood crossing the renter bar between fires must not sink the comparison
  var E3 = new Function('Logger', src2 + '\nreturn { civicCohortForBaseline_: civicCohortForBaseline_, civicDeliveryEdge_: civicDeliveryEdge_ };')({ log: function () {} });
  var grown = { available: true, reason: null, tab: 'Household_Ledger', cycle: 112, rows: { 'West Oakland': {}, 'Newcomer Hood': {} } };
  grown.rows['West Oakland'][C.HOUSING_BURDEN_COLUMN] = expect * 0.9; grown.rows['Newcomer Hood'][C.HOUSING_BURDEN_COLUMN] = 0.5;
  var narrowed = C.cohortForBaseline(grown, b.descriptor);
  ok(narrowed.rows['Newcomer Hood'] === undefined && narrowed.rows['West Oakland'] && narrowed.droppedNewcomers.join() === 'Newcomer Hood' && grown.rows['Newcomer Hood'], 'a newcomer hood is dropped from the comparison and the frozen cohort is not mutated');
  var edgeGrown = C.deliveryEdge(b.descriptor, grown), edgeNarrow = C.deliveryEdge(b.descriptor, narrowed);
  ok(edgeGrown.available === false && edgeGrown.reason === 'city-membership-changed' && edgeNarrow.available === true && isFinite(Number(edgeNarrow.minEdge)), 'without narrowing the edge is refused as membership-changed; narrowed, the observation judges (a one-hood city reads ratio 1 both sides, edge 0)');
  var thinned = { available: true, reason: null, tab: 'Household_Ledger', cycle: 112, rows: { 'Newcomer Hood': { } } }; thinned.rows['Newcomer Hood'][C.HOUSING_BURDEN_COLUMN] = 0.5;
  ok(C.deliveryEdge(b.descriptor, C.cohortForBaseline(thinned, b.descriptor)).reason === 'city-membership-changed', 'a baseline hood that thinned out still refuses (never invented)');
  ok(C.cohortForBaseline(c, b.descriptor) === c && C.cohortForBaseline(null, b.descriptor) === null, 'no newcomers → the same object; no cohort → passthrough');
  var hoodTab = { available: true, tab: 'Neighborhood_Demographics', cycle: 112, rows: { 'West Oakland': { Sick: 1 }, 'Extra': { Sick: 2 } } };
  ok(C.cohortForBaseline(hoodTab, b.descriptor) === hoodTab, 'a fixed-canon hood tab is never narrowed — the health/education gate keeps its exact-coverage contract');
  ok(JSON.stringify(E3.civicCohortForBaseline_(grown, b.descriptor)) === JSON.stringify(narrowed) && JSON.stringify(E3.civicDeliveryEdge_(b.descriptor, E3.civicCohortForBaseline_(grown, b.descriptor))) === JSON.stringify(edgeNarrow), 'parity: engine civicCohortForBaseline_ + civicDeliveryEdge_ match lib');
  ok(/civicDeliveryEdge_\(baseline, civicCohortForBaseline_\(civicStageCohortFor_\(ctx, entry\.stage3Metric\.tab\), baseline\)\)/.test(src2), 'judge: the Delivering step narrows the cohort to the baseline city before the edge');
  ok(/if \(tab === 'Household_Ledger'\) \{[\s\S]*?civicHousingCohortMinRenters[\s\S]*?civicHousingBurdenCohort_\(\{[\s\S]*?\}\);/.test(src2), 'freezer: Household_Ledger branch builds the cohort through the mirror with the min-renters dial');
})();

console.log((fail === 0 ? 'ALL ' + pass + ' PASS' : fail + ' FAILURES / ' + pass + ' pass'));
process.exit(fail === 0 ? 0 : 1);
