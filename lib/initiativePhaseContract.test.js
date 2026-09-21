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
  ok(JSON.stringify(unplayable) === JSON.stringify(['economic', 'housing', 'safety', 'sports', 'workforce']), 'catalog: safety and housing have no lever; economic, workforce and sports have one too weak to open their gate (matched-control pair, builder ruling b)');
  ok(Object.keys(C.WEAK_CHANNELS).sort().join() === 'economic-program,sports-district,workforce-program' && Object.keys(C.WEAK_CHANNELS).every(function (k) { return cat[k].playable === false; }), 'catalog: the weak channels are recorded for exactly the three refused retail-gated entries');
  var slice = require('../scripts/buildCivicOfficeSlice');
  if (typeof slice.loadInterventionMenu === 'function') {
    var menu = slice.loadInterventionMenu();
    ok(menu.available === true && menu.playable.length === keys.length - 5 && !/safety-program|housing-program|economic-program|workforce-program|sports-district/.test(menu.text), 'catalog: the seat pack menu lists the playable keys only');
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
    'CIVIC_STANDING_PHASE_: CIVIC_STANDING_PHASE_' +
    '};')({ log: function () {} });

  ok(JSON.stringify(E.INITIATIVE_STAGE_COLUMNS_) === JSON.stringify(C.STAGE_COLUMNS), 'stage: engine column list == lib STAGE_COLUMNS');
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
    ok(m.column.every(function (c) { return h.indexOf(c) >= 0; }), 'stage: ' + d + ' gate column(s) ' + m.column.join(' + ') + ' exist on ' + m.tab);
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
  var sIx = { stage: ix('Stage'), lastStageChange: ix('LastStageChangeCycle'), lastWork: ix('LastWorkCycle'), status: ix('Status'), mayoralAction: ix('MayoralAction'), phase: ix('ImplementationPhase'), policyDomain: ix('PolicyDomain'), lastUpdated: ix('LastUpdated'), id: ix('InitiativeID'), name: ix('Name'), baseline: ix('StageBaseline'), hold: ix('StageHold'), hoods: ix('AffectedNeighborhoods') };
  var CONFIG = { civicDeliverMargin: 0.2, civicDeliverMargin_health: 0.15, civicDeliverHoldCycles: 3, civicDeliverRegressShare: 0.5 };
  var fire = function (row, cycle, sickLaurel, opts) {
    var co = cohortAt(cycle - 1, { Laurel: sickLaurel, Fruitvale: 110 });
    if (opts && opts.unavailable) co = { available: false, reason: 'stamp-not-C' + (cycle - 1), cycle: cycle - 1, tab: 'Neighborhood_Demographics', rows: {} };
    var ctx = { summary: { cycleId: cycle, civicStageCohort: { cycle: cycle - 1, tabs: { Neighborhood_Demographics: co } } }, config: CONFIG, now: 'NOW' };
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
  var quiet = function (r, label) { var before = JSON.stringify(r); var ctx = { summary: { cycleId: 114, civicStageCohort: { cycle: 113, tabs: { Neighborhood_Demographics: cohortAt(113, { Laurel: 90, Fruitvale: 90 }) } } }, config: CONFIG, now: 'NOW' }; ok(E.applyCivicStageStep_(ctx, r, sIx, 114) === false && JSON.stringify(r) === before, label); };
  quiet(mkRow({ ImplementationPhase: 'stalled' }), 'applier: a stalled row is not judged — nothing advances while the row is down');
  quiet(mkRow({ Status: 'vetoed' }), 'applier: only a voted row is judged');
  quiet(mkRow({ PolicyDomain: 'safety', StageBaseline: '' }), 'applier: a domain with no lever gets no baseline and no hold (ruling 3)');
  quiet(mkRow({ PolicyDomain: 'transit', StageBaseline: '' }), 'applier: transit has no hood reader yet — no baseline, no hold, no clock');
  quiet(mkRow({ Stage: '' }), 'applier: a blank Stage is a legacy row — untouched');
  ok(C.stageRequirement({ stage: 'Standing', policyDomain: 'transit' }).blocked === 'no-delivering-reader' && C.stageRequirement({ stage: 'Standing', policyDomain: 'health' }).blocked === null, 'stage: a playable domain whose metric cannot be read yet says so, and runs no clock (SIM_DOCTRINE §15)');
  var conv = mkRow({ StageBaseline: '' });
  var ctxC = { summary: { cycleId: 114, civicStageCohort: { cycle: 113, tabs: { Neighborhood_Demographics: cohortAt(113, { Laurel: 120 }) } } }, config: CONFIG, now: 'NOW' };
  E.applyCivicStageStep_(ctxC, conv, sIx, 114);
  ok(JSON.parse(conv[ix('StageBaseline')]).origin === 'conversion' && JSON.parse(conv[ix('StageHold')]).up === 0, 'applier: a Standing row with no baseline takes a conversion baseline and says so; that same observation is never compared against itself');
  var un2 = mkRow({}); fire(un2, 114, 0, { unavailable: true });
  ok(JSON.parse(un2[ix('StageHold')]).obs === 113 && JSON.parse(un2[ix('StageHold')]).up === 0, 'applier: a fire whose cohort could not be frozen counts nothing and says it looked');
  var threw = false; try { E.getCivicDeliverDials_({ config: { civicDeliverMargin: 0.2, civicDeliverHoldCycles: 3 } }, 'health'); } catch (e) { threw = /civicDeliverRegressShare/.test(e.message); }
  ok(threw && E.getCivicDeliverDials_({ config: CONFIG }, 'health').margin === 0.15 && E.getCivicDeliverDials_({ config: CONFIG }, 'education').margin === 0.2, 'dials: fail-loud on a missing key; the per-domain margin wins over the default');

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

console.log((fail === 0 ? 'ALL ' + pass + ' PASS' : fail + ' FAILURES / ' + pass + ' pass'));
process.exit(fail === 0 ? 0 : 1);
