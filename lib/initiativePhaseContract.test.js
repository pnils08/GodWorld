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
    'civicStageRequirement_: civicStageRequirement_' +
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
  ok(JSON.stringify(E.missingInitiativeStageColumns_(live31)) === JSON.stringify(C.STAGE_COLUMNS), 'self-arm: a header with none of the six is missing all six, in declared order');
  ok(E.missingInitiativeStageColumns_(live31.concat(C.STAGE_COLUMNS)).length === 0, 'self-arm: a complete header is missing nothing');
  ok(JSON.stringify(E.missingInitiativeStageColumns_(live31.concat(['LastWorkCycle', 'Stage']))) === JSON.stringify(['StageBaseline', 'LastStageChangeCycle', 'LastWorkSeat', 'PriorPhase']), 'self-arm: a partial header gets only what it lacks');
  var calls = [];
  var fakeSheet = function (lastCol, maxCols) { return {
    getLastColumn: function () { return lastCol; }, getMaxColumns: function () { return maxCols; },
    insertColumnsAfter: function (at, nn) { calls.push(['insert', at, nn]); maxCols += nn; },
    getRange: function (r, c, nr, nc) { return { setValues: function (v) { calls.push(['set', r, c, nr, nc, v[0].join(',')]); } }; } }; };
  ok(E.ensureInitiativeStageColumns_(fakeSheet(37, 37), live31.concat(C.STAGE_COLUMNS)) === false && calls.length === 0, 'self-arm: complete header → no write, returns false');
  ok(E.ensureInitiativeStageColumns_(fakeSheet(31, 40), live31) === true && calls.length === 1 && calls[0].join('|') === ['set', 1, 32, 1, 6, C.STAGE_COLUMNS.join(',')].join('|'), 'self-arm: one header-row write at lastCol+1, six wide');
  calls = [];
  ok(E.ensureInitiativeStageColumns_(fakeSheet(31, 31), live31) === true && calls[0].join('|') === 'insert|31|6' && calls[1][0] === 'set', 'self-arm: a trimmed grid grows by exactly the shortfall before the write');
  ok(/if \(data\.length >= 1 && ensureInitiativeStageColumns_\(sheet, data\[0\]\)\)/.test(engineSrc), 'self-arm: runCivicInitiativeEngine_ calls it on the cycle path (DEPLOY.md trap 3)');
  var req = engineSrc.match(/var required = \[([\s\S]*?)\];/)[1];
  ok(C.STAGE_COLUMNS.every(function (c) { return req.indexOf("'" + c + "'") < 0; }), 'self-arm: no stage column is in `required` — a missing one can never abort the civic engine');
})();

console.log((fail === 0 ? 'ALL ' + pass + ' PASS' : fail + ' FAILURES / ' + pass + ' pass'));
process.exit(fail === 0 ? 0 : 1);
