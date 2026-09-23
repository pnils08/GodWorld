#!/usr/bin/env node
'use strict';

/**
 * scripts/cron-civic-game.test.js — civic.38 game board contract & unit test suite.
 *
 * Task 9 step 3:
 *   - Synthetic POPIDs: POP-999xx only (never canon citizens)
 *   - Temp-dir JSONL storage (isolated, no repo-dirtying, auto-cleaned)
 *   - Zero network dependencies
 *   - Node-runnable (`node scripts/cron-civic-game.test.js`)
 *   - One test group per task:
 *       Group 1: T1 move validation + grounding
 *       Group 2: T2 decisions accretion + candidate-row build
 *       Group 3: T3 pack blocks
 *       Group 4: T6 petition math
 *       Group 5: T8 directive targeting
 *       Group 6: T9 rota split + project director work-wake packs
 *   - Directly exercises landed modules:
 *       scripts/cron-civic-run.js (validateDatawakeMoves, appendMoveLedger, moveLedgerLines, foldMovesIntoDecisions, slugForInitiative, petitionGateSweep)
 *       scripts/buildCivicOfficeSlice.js (boardRowsFor, loadMovesFolded, loadPetitionPool, loadConfrontation, loadTrackerRows, buildGameBlocks)
 *       scripts/civicPetitions.js (countPetition, buildHoodResolver)
 *       scripts/cron-work-wake.js (NODE_BUILDERS['initiative-project'])
 *       scripts/workWakePackages.js (validatePackage)
 *       lib/initiativePhaseContract.js (INTERVENTION_CATALOG)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');

// Imported task modules under test
const civicRun = require('./cron-civic-run');
const civicSlice = require('./buildCivicOfficeSlice');
const civicPetitions = require('./civicPetitions');
const workWake = require('./cron-work-wake');
const workWakePackages = require('./workWakePackages');
const phaseContract = require('../lib/initiativePhaseContract');
const officeWall = require('./officeWall');
const { deriveProblemContinuity } = require('./civicProblemContinuity');
const { interventionIssue } = require('./civicInterventionValidation');
const createInit = require('./createInitiative');
const civicStageEvidence = require('./civicStageEvidence');

// ─────────────────────────────────────────────────────────────────────────────
// Test Runner Harness
// ─────────────────────────────────────────────────────────────────────────────

let totalPassed = 0;
let totalFailed = 0;
const failures = [];

function group(title) {
  console.log(`\n=== ${title} ===`);
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ok   ${name}`);
    totalPassed++;
  } catch (err) {
    console.error(`  FAIL ${name}`);
    console.error(`       ${err.message}`);
    if (err.stack) {
      const relevant = err.stack.split('\n').slice(1, 4).join('\n');
      console.error(`       ${relevant}`);
    }
    totalFailed++;
    failures.push({ name, error: err });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Temp Workspace & Synthetic Fixture Helpers
// ─────────────────────────────────────────────────────────────────────────────

const activeTempDirs = [];

function createTempWorkspace(prefix = 'civic-game-test-') {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  activeTempDirs.push(tmpDir);
  return {
    dir: tmpDir,
    path(...parts) {
      return path.join(tmpDir, ...parts);
    },
    writeJsonl(relPath, rows) {
      const full = path.join(tmpDir, relPath);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, rows.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
      return full;
    },
    writeJson(relPath, obj) {
      const full = path.join(tmpDir, relPath);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, JSON.stringify(obj, null, 2) + '\n', 'utf8');
      return full;
    },
    writeText(relPath, text) {
      const full = path.join(tmpDir, relPath);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, text, 'utf8');
      return full;
    },
    readJsonl(relPath) {
      const full = path.join(tmpDir, relPath);
      if (!fs.existsSync(full)) return [];
      return fs.readFileSync(full, 'utf8')
        .split('\n')
        .filter(l => l.trim())
        .map(l => JSON.parse(l));
    },
    cleanup() {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (_) {}
    }
  };
}

process.on('exit', () => {
  for (const d of activeTempDirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch (_) {}
  }
});

// Canonical Synthetic POPIDs (Rule: POP-999xx only)
const SYNTH_POP = {
  COUNCIL_D1: 'POP-99901',
  COUNCIL_D2: 'POP-99902',
  COUNCIL_D3: 'POP-99903',
  COUNCIL_D4: 'POP-99904',
  COUNCIL_D5: 'POP-99905',
  COUNCIL_D7: 'POP-99907',
  MAYOR: 'POP-99910',
  POLICE_CHIEF: 'POP-99911',
  PROJ_DIR_STAB: 'POP-99912',
  PROJ_DIR_OARI: 'POP-99913',
  CITIZEN_WEST_OAK_1: 'POP-99920',
  CITIZEN_WEST_OAK_2: 'POP-99921',
  CITIZEN_TEMESCAL_1: 'POP-99922',
  CITIZEN_EAST_OAK_1: 'POP-99923',
  CITIZEN_DOWNTOWN_1: 'POP-99924',
};

// Verify all synthetic POPIDs follow the mandatory POP-999xx format
Object.entries(SYNTH_POP).forEach(([k, popid]) => {
  assert(/^POP-999\d{2}$/.test(popid), `Synthetic POPID ${k} (${popid}) violates POP-999xx rule`);
});

const CHILD_TO_PARENT_HOOD = {
  'coliseum': 'East Oakland',
  'elmhurst': 'East Oakland',
  'northgate': 'KONO',
  'koreatown': 'KONO',
  'old oakland': 'Downtown',
  'city center': 'Downtown',
  'jack london square': 'Jack London',
};

// ─────────────────────────────────────────────────────────────────────────────
// Group 1: T1 Move Validation + Grounding
// ─────────────────────────────────────────────────────────────────────────────
group('Group 1: T1 Move Validation + Grounding');

test('T1.1: Live validateDatawakeMoves rejects moves when input is not an array', () => {
  const office = { officeId: 'COUNCIL-D1', agentDir: 'civic-office-council-d1', district: 'D1' };
  const boardIds = new Set(['INIT-001']);
  const res = civicRun.validateDatawakeMoves('not an array', { office, boardIds });
  assert.equal(res.accepted.length, 0);
  assert.equal(res.rejected.length, 1);
  assert.equal(res.rejected[0].reason, 'moves-not-an-array');
});

test('T1.2: Live validateDatawakeMoves validates closed move types & rejects unknown moves loudly', () => {
  const office = { officeId: 'COUNCIL-D1', agentDir: 'civic-office-council-d1', district: 'D1' };
  const boardIds = new Set(['INIT-001']);
  const rawMoves = [
    { type: 'bribe', target: 'inspector' },
    { type: 'spin', topic: 'crime' },
    { type: 'work', initiativeId: 'INIT-001' }
  ];

  const res = civicRun.validateDatawakeMoves(rawMoves, { office, boardIds });
  assert.equal(res.accepted.length, 1);
  assert.equal(res.accepted[0].type, 'work');
  assert.equal(res.accepted[0].payload.initiativeId, 'INIT-001');

  assert.equal(res.rejected.length, 2);
  assert.equal(res.rejected[0].reason, 'unknown-move-type(bribe)');
  assert.equal(res.rejected[1].reason, 'unknown-move-type(spin)');
});

test('T1.3: Live validateDatawakeMoves enforces at most one consequential move per wake (first valid wins)', () => {
  const office = { officeId: 'COUNCIL-D1', agentDir: 'civic-office-council-d1', district: 'D1' };
  const boardIds = new Set(['INIT-001', 'INIT-002']);
  const catalog = phaseContract.INTERVENTION_CATALOG;

  const rawMoves = [
    { type: 'work', initiativeId: 'INIT-001' },
    { type: 'propose', title: 'Second Clinic', intervention: 'health-service', hoods: ['West Oakland'], problem: 'need care', budget: '$20M' },
    { type: 'canvass', hood: 'West Oakland' }
  ];

  const res = civicRun.validateDatawakeMoves(rawMoves, { office, boardIds, catalog, childToParent: CHILD_TO_PARENT_HOOD });
  assert.equal(res.accepted.length, 1, 'Exactly one consequential move is accepted per wake');
  assert.equal(res.accepted[0].type, 'work');

  assert.equal(res.rejected.length, 2);
  assert.match(res.rejected[0].reason, /second-consequential-move/);
  assert.match(res.rejected[1].reason, /second-consequential-move/);
});

test('T1.4: Live validateDatawakeMoves rejects work move when initiative is off-board', () => {
  const office = { officeId: 'COUNCIL-D1', agentDir: 'civic-office-council-d1', district: 'D1' };
  const boardIds = new Set(['INIT-001']);
  const rawMoves = [{ type: 'work', initiativeId: 'INIT-005' }];

  const res = civicRun.validateDatawakeMoves(rawMoves, { office, boardIds });
  assert.equal(res.accepted.length, 0);
  assert.equal(res.rejected.length, 1);
  assert.equal(res.rejected[0].reason, 'initiative-not-on-board(INIT-005)');
});

test('T1.5: Live validateDatawakeMoves propose hood grounding requires EVERY hood in district (child areas fold)', () => {
  const office = { officeId: 'COUNCIL-D5', agentDir: 'civic-office-council-d5', district: 'D5' };
  const catalog = phaseContract.INTERVENTION_CATALOG;

  // Coliseum is child of East Oakland (D5) -> allowed!
  const validMove = [{
    type: 'propose',
    title: 'Synthetic clinic service',
    intervention: 'health-service',
    hoods: ['Coliseum', 'East Oakland'],
    problem: 'synthetic health need',
    budget: '$20M'
  }];
  const res1 = civicRun.validateDatawakeMoves(validMove, { office, catalog, childToParent: CHILD_TO_PARENT_HOOD });
  assert.equal(res1.accepted.length, 1);
  assert.equal(res1.accepted[0].payload.title, 'Synthetic clinic service');

  // Cross-district hood (Temescal in D7) -> entire move rejected (no intersect loophole)
  const invalidMove = [{
    type: 'propose',
    title: 'Synthetic cross-city clinic',
    intervention: 'health-service',
    hoods: ['East Oakland', 'Temescal'],
    problem: 'overreach',
    budget: '$20M'
  }];
  const res2 = civicRun.validateDatawakeMoves(invalidMove, { office, catalog, childToParent: CHILD_TO_PARENT_HOOD });
  assert.equal(res2.accepted.length, 0);
  assert.equal(res2.rejected.length, 1);
  assert.match(res2.rejected[0].reason, /hood-out-of-district/);
});

test('T1.6: Live validateDatawakeMoves: Mayor may propose in any canonical hood across the city', () => {
  const office = { officeId: 'MAYOR-01', agentDir: 'civic-office-mayor', district: 'citywide' };
  const catalog = phaseContract.INTERVENTION_CATALOG;

  const mayorMove = [{
    type: 'propose',
    title: 'Citywide Clinic Network',
    intervention: 'health-service',
    hoods: ['West Oakland', 'Temescal', 'East Oakland'],
    problem: 'healthcare access',
    budget: '$20M'
  }];

  const res = civicRun.validateDatawakeMoves(mayorMove, { office, catalog, childToParent: CHILD_TO_PARENT_HOOD });
  assert.equal(res.accepted.length, 1);
  assert.equal(res.accepted[0].payload.title, 'Citywide Clinic Network');
});

test('T1.7: Live validateDatawakeMoves: Catalog not landed or unplayable domain rejected', () => {
  const office = { officeId: 'COUNCIL-D1', agentDir: 'civic-office-council-d1', district: 'D1' };
  const proposeMove = [{
    type: 'propose',
    title: 'Health Clinic',
    intervention: 'health-service',
    hoods: ['West Oakland'],
    problem: 'health access'
  }];

  // 1. Catalog is null/unlanded -> catalog-not-landed
  const res1 = civicRun.validateDatawakeMoves(proposeMove, { office, catalog: null });
  assert.equal(res1.accepted.length, 0);
  assert.match(res1.rejected[0].reason, /catalog-not-landed/);

  // 2. Intervention with playable: false — housing-program flipped playable:true
  // engine.251 (builder-ruled rate 0.20/margin 0.15, 2026-09-22); safety-program
  // is now the live example with no lever.
  const unplayableMove = [{
    type: 'propose',
    title: 'More Patrols',
    intervention: 'safety-program',
    hoods: ['West Oakland'],
    problem: 'crime'
  }];
  const res2 = civicRun.validateDatawakeMoves(unplayableMove, { office, catalog: phaseContract.INTERVENTION_CATALOG });
  assert.equal(res2.accepted.length, 0);
  assert.match(res2.rejected[0].reason, /domain-not-playable/);
});

test('T1.8: Live validateDatawakeMoves: Police Chief may work, answer, canvass, but NEVER propose', () => {
  const office = { officeId: 'CHIEF-POLICE', agentDir: 'civic-office-police-chief', district: 'citywide' };
  const boardIds = new Set(['INIT-002']);
  const catalog = phaseContract.INTERVENTION_CATALOG;

  const chiefPropose = [{
    type: 'propose',
    title: 'More Patrols',
    intervention: 'health-service',
    hoods: ['West Oakland'],
    problem: 'safety'
  }];
  const res1 = civicRun.validateDatawakeMoves(chiefPropose, { office, boardIds, catalog });
  assert.equal(res1.accepted.length, 0);
  assert.equal(res1.rejected.length, 1);
  assert.match(res1.rejected[0].reason, /seat-cannot-propose/);

  // Legal moves tested individually
  const resWork = civicRun.validateDatawakeMoves([{ type: 'work', initiativeId: 'INIT-002' }], { office, boardIds, catalog });
  assert.equal(resWork.accepted.length, 1);
  assert.equal(resWork.rejected.length, 0);

  const resCanvass = civicRun.validateDatawakeMoves([{ type: 'canvass', hood: 'West Oakland' }], { office, boardIds, catalog });
  assert.equal(resCanvass.accepted.length, 1);
  assert.equal(resCanvass.rejected.length, 0);
});

test('T1.9: Live appendMoveLedger & moveLedgerLines write correct ledger rows to temp workspace', () => {
  const ws = createTempWorkspace();
  try {
    const office = { officeId: 'COUNCIL-D1', agentDir: 'civic-office-council-d1', popid: SYNTH_POP.COUNCIL_D1 };
    const mv = {
      accepted: [{ type: 'work', payload: { initiativeId: 'INIT-001' } }],
      rejected: [{ move: { type: 'bribe' }, reason: 'unknown-move-type(bribe)' }]
    };

    const lines = civicRun.moveLedgerLines(office, 108, '2026-09-21', mv);
    assert.equal(lines.length, 2);
    assert.equal(lines[0].moveId, 'MV-108-civic-office-council-d1-2026-09-21');
    assert.equal(lines[0].status, 'pending');
    assert.equal(lines[0].popid, SYNTH_POP.COUNCIL_D1);
    assert.equal(lines[1].status, 'rejected');

    const file = civicRun.appendMoveLedger(ws.dir, 108, lines);
    assert(fs.existsSync(file));
    const content = fs.readFileSync(file, 'utf8').trim().split('\n');
    assert.equal(content.length, 2);
  } finally {
    ws.cleanup();
  }
});

test('T1.10: Live validateDatawakeMoves with full INTERVENTION_CATALOG: 3 playable pass, 5 unplayable reject', () => {
  const office = { officeId: 'MAYOR-01', agentDir: 'civic-office-mayor', district: 'citywide' };
  const catalog = phaseContract.INTERVENTION_CATALOG;
  // housing-program back to playable:false engine.255 (builder 2026-09-22: the
  // flat discount was the wrong shape; a budgeted disbursement lever replaces it).
  const playableKeys = ['health-service', 'transit-project', 'school-program'];
  const unplayableKeys = ['safety-program', 'economic-program', 'workforce-program', 'sports-district', 'housing-program'];
  assert.deepStrictEqual(Object.keys(catalog).filter(k => catalog[k].playable).sort(), [...playableKeys].sort());
  assert.deepStrictEqual(Object.keys(catalog).filter(k => !catalog[k].playable).sort(), [...unplayableKeys].sort());
  // engine.255 Task 9: playable proposes need a budget inside the domain band.
  const budgetFor = { 'health-service': '$20M', 'transit-project': '$100M', 'school-program': '$10M' };
  for (const key of playableKeys) {
    const move = [{ type: 'propose', title: `Test ${key}`, intervention: key, hoods: ['Downtown'], problem: 'test problem', budget: budgetFor[key] }];
    const res = civicRun.validateDatawakeMoves(move, { office, catalog });
    assert.equal(res.accepted.length, 1, `Intervention ${key} should be accepted`);
    assert.equal(res.rejected.length, 0);
  }

  for (const key of unplayableKeys) {
    const move = [{ type: 'propose', title: `Test ${key}`, intervention: key, hoods: ['Downtown'], problem: 'test problem' }];
    const res = civicRun.validateDatawakeMoves(move, { office, catalog });
    assert.equal(res.accepted.length, 0, `Intervention ${key} should be rejected`);
    assert.equal(res.rejected.length, 1);
    assert.match(res.rejected[0].reason, /domain-not-playable/);
  }
});

test('T1.11: Live validateDatawakeMoves rejects inherited Object.prototype interventions', () => {
  const office = { officeId: 'MAYOR-01', agentDir: 'civic-office-mayor', district: 'citywide' };
  const catalog = phaseContract.INTERVENTION_CATALOG;

  for (const evilKey of ['toString', 'valueOf', 'constructor']) {
    const move = [{ type: 'propose', title: 'Prototype Attack', intervention: evilKey, hoods: ['Downtown'], problem: 'exploit' }];
    const res = civicRun.validateDatawakeMoves(move, { office, catalog });
    assert.equal(res.accepted.length, 0, `Inherited property ${evilKey} must not be accepted`);
    assert.equal(res.rejected.length, 1);
  }
});

test('T1.12: engine.255 Task 9 — propose requires a budget inside the domain band', () => {
  const office = { officeId: 'MAYOR-01', agentDir: 'civic-office-mayor', district: 'citywide' };
  const catalog = phaseContract.INTERVENTION_CATALOG;
  const base = { type: 'propose', title: 'Synthetic Clinic', intervention: 'health-service', hoods: ['Downtown'], problem: 'synthetic need' };
  const run1 = m => civicRun.validateDatawakeMoves([m], { office, catalog });

  // Missing / blank
  assert.match(run1(base).rejected[0].reason, /^budget-missing/);
  assert.match(run1({ ...base, budget: '  ' }).rejected[0].reason, /^budget-missing/);

  // Unparseable — never Number() ('a lot' would be NaN, '28' parses as dollars)
  assert.match(run1({ ...base, budget: 'a lot of money' }).rejected[0].reason, /^budget-unparseable/);
  assert.match(run1({ ...base, budget: 'soon' }).rejected[0].reason, /^budget-unparseable/);

  // Outside the health band ($5M-$100M), both directions
  assert.match(run1({ ...base, budget: '$1M' }).rejected[0].reason, /^budget-outside-band/);
  assert.match(run1({ ...base, budget: '$200M' }).rejected[0].reason, /^budget-outside-band/);

  // Band edges are inclusive; numeric and plain-dollar forms parse
  assert.equal(run1({ ...base, budget: '$5M' }).accepted.length, 1);
  assert.equal(run1({ ...base, budget: '$100M' }).accepted.length, 1);
  assert.equal(run1({ ...base, budget: 20000000 }).accepted.length, 1);
  assert.equal(run1({ ...base, budget: '$20,000,000' }).accepted.length, 1);
  assert.equal(run1({ ...base, budget: '$12.5M' }).accepted[0].payload.budget, '$12.5M');

  // The band keys on the domain, not the string: $10M is fine for health, thin for transit
  const transit = { ...base, intervention: 'transit-project', budget: '$10M' };
  assert.match(run1(transit).rejected[0].reason, /^budget-outside-band\(transit/);
  assert.equal(run1({ ...transit, budget: '$100M' }).accepted.length, 1);

  // Budget checks fire only after the catalog gate — unplayable still reports its own reason
  const unplayable = { ...base, intervention: 'safety-program' };
  assert.match(run1(unplayable).rejected[0].reason, /domain-not-playable/);
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2: T2 Decisions Accretion + Candidate-Row Build
// ─────────────────────────────────────────────────────────────────────────────
group('Group 2: T2 Decisions Accretion + Candidate-Row Build');

test('T2.1: Move ledger folding via loadMovesFolded in temp workspace (last-line-wins per moveId)', () => {
  const ws = createTempWorkspace();
  try {
    const moveId = 'MV-108-civic-office-council-d1-2026-09-21';
    const lines = [
      { moveId, cycle: 108, date: '2026-09-21', agentDir: 'civic-office-council-d1', popid: SYNTH_POP.COUNCIL_D1, type: 'work', payload: { initiativeId: 'INIT-001' }, status: 'pending' },
      { moveId, cycle: 108, date: '2026-09-21', agentDir: 'civic-office-council-d1', popid: SYNTH_POP.COUNCIL_D1, type: 'work', payload: { initiativeId: 'INIT-001' }, status: 'applied', at: '2026-09-27T00:00:00Z' }
    ];
    ws.writeJsonl('output/cron-civic/moves/moves_c108.jsonl', lines);

    const foldedMap = civicSlice.loadMovesFolded(ws.dir, 108);
    assert(foldedMap instanceof Map, 'loadMovesFolded must return a Map keyed by moveId');
    assert.equal(foldedMap.size, 1);
    const folded = foldedMap.get(moveId);
    assert.notEqual(folded, undefined);
    assert.equal(folded.moveId, moveId);
    assert.equal(folded.status, 'applied');
  } finally {
    ws.cleanup();
  }
});

test('T2.2: Sunday fold groups work moves by initiative and sets LastWorkCycle & LastWorkSeat without clobbering voice notes', () => {
  const moves = [
    { moveId: 'MV-108-council-d1-2026-09-21', cycle: 108, agentDir: 'civic-office-council-d1', type: 'work', payload: { initiativeId: 'INIT-001' }, status: 'pending' },
    { moveId: 'MV-108-council-d3-2026-09-22', cycle: 108, agentDir: 'civic-office-council-d3', type: 'work', payload: { initiativeId: 'INIT-001' }, status: 'pending' }
  ];

  const existingDecisions = {
    'INIT-001': {
      trackerUpdates: { MilestoneNotes: 'C107: Downtown canvass deployed.' }
    }
  };

  // Fold simulation
  const decisionsUpdates = JSON.parse(JSON.stringify(existingDecisions));
  const workByInit = new Map();
  for (const m of moves) {
    if (m.type === 'work') {
      const id = m.payload.initiativeId;
      if (!workByInit.has(id)) workByInit.set(id, []);
      workByInit.get(id).push(m);
    }
  }
  for (const [id, mList] of workByInit) {
    if (!decisionsUpdates[id]) decisionsUpdates[id] = { trackerUpdates: {} };
    decisionsUpdates[id].trackerUpdates.LastWorkCycle = 108;
    decisionsUpdates[id].trackerUpdates.LastWorkSeat = Array.from(new Set(mList.map(m => m.agentDir))).sort().join(', ');
  }

  assert.equal(decisionsUpdates['INIT-001'].trackerUpdates.LastWorkCycle, 108);
  assert.equal(decisionsUpdates['INIT-001'].trackerUpdates.LastWorkSeat, 'civic-office-council-d1, civic-office-council-d3');
  assert.equal(decisionsUpdates['INIT-001'].trackerUpdates.MilestoneNotes, 'C107: Downtown canvass deployed.');
});

test('T2.3: Sunday candidate row creation format & idempotency skip', () => {
  const candidateMove = {
    moveId: 'MV-108-civic-office-council-d5-2026-09-23',
    agentDir: 'civic-office-council-d5',
    type: 'propose',
    payload: {
      title: 'East Oakland Youth Apprenticeship',
      policyDomain: 'workforce',
      hoods: ['East Oakland', 'Baylight District'],
      proposingOffice: 'COUNCIL-D5'
    }
  };

  const existingTracker = [
    { ProposingOffice: 'COUNCIL-D5', ProposedCycle: '108', Name: 'East Oakland Youth Apprenticeship' }
  ];

  // Idempotency check
  const isDuplicate = existingTracker.some(r =>
    r.ProposingOffice === candidateMove.payload.proposingOffice &&
    Number(r.ProposedCycle) === 108 &&
    String(r.Name).trim().toLowerCase() === candidateMove.payload.title.trim().toLowerCase()
  );
  assert.equal(isDuplicate, true, 'Duplicate candidate must be skipped on re-run');
});

test('T2.4: Status transition gate enforces exactly ONE legal edge: proposed -> pending-vote with VoteCycle', () => {
  function validateStatusTransition(fromStatus, toStatus, voteCycle) {
    if (fromStatus === toStatus) return true;
    if (fromStatus === 'proposed' && toStatus === 'pending-vote') {
      if (!voteCycle || isNaN(Number(voteCycle))) {
        throw new Error('Status transition proposed -> pending-vote requires a valid VoteCycle');
      }
      return true;
    }
    throw new Error(`Illegal status transition from "${fromStatus}" to "${toStatus}"`);
  }

  assert.doesNotThrow(() => validateStatusTransition('proposed', 'pending-vote', '109'));
  assert.throws(() => validateStatusTransition('proposed', 'pending-vote', ''), /requires a valid VoteCycle/);
  assert.throws(() => validateStatusTransition('proposed', 'active', '109'), /Illegal status transition/);
});

test('T2.5: Live foldMovesIntoDecisions in temp workspace: aggregates work moves, creates candidates, byte-idempotent', () => {
  const ws = createTempWorkspace();
  try {
    const moves = [
      { moveId: 'MV-108-civic-office-council-d1-2026-09-21', cycle: 108, date: '2026-09-21', agentDir: 'civic-office-council-d1', popid: SYNTH_POP.COUNCIL_D1, type: 'work', payload: { initiativeId: 'INIT-001' }, status: 'pending' },
      { moveId: 'MV-108-civic-office-council-d3-2026-09-22', cycle: 108, date: '2026-09-22', agentDir: 'civic-office-council-d3', popid: SYNTH_POP.COUNCIL_D3, type: 'work', payload: { initiativeId: 'INIT-001' }, status: 'pending' },
      { moveId: 'MV-108-civic-office-council-d5-2026-09-23', cycle: 108, date: '2026-09-23', agentDir: 'civic-office-council-d5', popid: SYNTH_POP.COUNCIL_D5, type: 'propose', payload: { title: 'East Oakland Clinic', intervention: 'health-service', hoods: ['East Oakland'], problem: 'Need healthcare', budget: '$20M' }, status: 'pending' }
    ];
    ws.writeJsonl('output/cron-civic/moves/moves_c108.jsonl', moves);

    // Initial decisions file with voice note
    ws.writeJson('output/city-civic-database/initiatives/init-001/decisions_c108.json', {
      initiative: 'INIT-001', initiativeId: 'INIT-001', cycle: 108, primaryVoice: 'mayor',
      trackerUpdates: { MilestoneNotes: 'Initial progress note' }
    });

    const officeMap = {
      offices: [
        { officeId: 'COUNCIL-D1', agentDir: 'civic-office-council-d1', popid: SYNTH_POP.COUNCIL_D1 },
        { officeId: 'COUNCIL-D3', agentDir: 'civic-office-council-d3', popid: SYNTH_POP.COUNCIL_D3 },
        { officeId: 'COUNCIL-D5', agentDir: 'civic-office-council-d5', popid: SYNTH_POP.COUNCIL_D5 }
      ]
    };

    const out1 = civicRun.foldMovesIntoDecisions(ws.dir, 108, officeMap);
    assert.equal(out1.workMoves, 2);
    assert.equal(out1.workInitiatives, 1);
    assert.equal(out1.candidates, 1);

    const decPath = ws.path('output/city-civic-database/initiatives/init-001/decisions_c108.json');
    const candPath = ws.path('output/city-civic-database/initiatives/_candidates/candidates_c108.json');
    const manifestPath = ws.path('output/cron-civic/moves/fold_c108.json');

    assert(fs.existsSync(decPath));
    assert(fs.existsSync(candPath));
    assert(fs.existsSync(manifestPath));

    const dec1 = JSON.parse(fs.readFileSync(decPath, 'utf8'));
    assert.equal(dec1.trackerUpdates.LastWorkCycle, 108);
    assert.equal(dec1.trackerUpdates.LastWorkSeat, 'civic-office-council-d1, civic-office-council-d3');
    assert.equal(dec1.trackerUpdates.MilestoneNotes, 'Initial progress note');
    assert.deepEqual(dec1._moveFold.moveIds, ['MV-108-civic-office-council-d1-2026-09-21', 'MV-108-civic-office-council-d3-2026-09-22']);

    const cand1 = JSON.parse(fs.readFileSync(candPath, 'utf8'));
    const c = cand1.candidates['MV-108-civic-office-council-d5-2026-09-23'];
    assert(c);
    assert.equal(c.proposingOffice, 'COUNCIL-D5');
    assert.equal(c.title, 'East Oakland Clinic');
    assert.equal(c.intervention, 'health-service');
    assert.equal(c.budget, '$20M', 'engine.255 Task 9: the seat\'s budget rides the fold into the candidate');
    assert.equal(c.status, 'pending');

    const rawDecBefore = fs.readFileSync(decPath, 'utf8');
    const rawCandBefore = fs.readFileSync(candPath, 'utf8');

    // Run fold again — must be byte-for-byte identical (byte-idempotent)
    const out2 = civicRun.foldMovesIntoDecisions(ws.dir, 108, officeMap);
    assert.equal(out2.workMoves, 2);
    assert.equal(out2.candidates, 1);
    assert.equal(fs.readFileSync(decPath, 'utf8'), rawDecBefore, 'Decisions file must be byte-identical on rerun');
    assert.equal(fs.readFileSync(candPath, 'utf8'), rawCandBefore, 'Candidates file must be byte-identical on rerun');
  } finally {
    ws.cleanup();
  }
});

test('T2.6: Live slugForInitiative derives correct slugs from existing directories and falls back cleanly', () => {
  const ws = createTempWorkspace();
  try {
    const base = ws.path('initiatives');
    ws.writeJson('initiatives/stab-fund-west-oak/decisions_c107.json', {
      initiativeId: 'INIT-001'
    });

    assert.equal(civicRun.slugForInitiative(base, 'INIT-001'), 'stab-fund-west-oak');
    assert.equal(civicRun.slugForInitiative(base, 'INIT-999'), 'init-999');
    assert.equal(civicRun.slugForInitiative(base, 'Custom Initiative'), 'custom-initiative');
  } finally {
    ws.cleanup();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3: T3 Pack Blocks
// ─────────────────────────────────────────────────────────────────────────────
group('Group 3: T3 Pack Blocks');

test('T3.1: Live boardRowsFor: Mayor sees all; D1 sees overlap (INIT-001/002/007); D6 sees none', () => {
  const trackerRows = [
    { InitiativeID: 'INIT-001', Name: 'West Oakland Stabilization', AffectedNeighborhoods: 'West Oakland', ImplementationPhase: 'active' },
    { InitiativeID: 'INIT-002', Name: 'OARI Response', AffectedNeighborhoods: 'West Oakland, Chinatown, Fruitvale', ImplementationPhase: 'active' },
    { InitiativeID: 'INIT-003', Name: 'Fruitvale Transit Hub', AffectedNeighborhoods: 'Fruitvale', ImplementationPhase: 'planning' },
    { InitiativeID: 'INIT-007', Name: 'Downtown Housing', AffectedNeighborhoods: 'Downtown, West Oakland', ImplementationPhase: 'active' }
  ];

  const mayorOffice = { officeId: 'MAYOR-01', district: 'citywide' };
  const d1Office = { officeId: 'COUNCIL-D1', district: 'D1' };
  const d6Office = { officeId: 'COUNCIL-D6', district: 'D6' };

  const mayorBoard = civicSlice.boardRowsFor(mayorOffice, trackerRows, CHILD_TO_PARENT_HOOD);
  assert.equal(mayorBoard.length, 4, 'Mayor should see all active board rows');

  const d1Board = civicSlice.boardRowsFor(d1Office, trackerRows, CHILD_TO_PARENT_HOOD);
  assert.deepEqual(d1Board.map(r => r.id).sort(), ['INIT-001', 'INIT-002', 'INIT-007']);

  const d6Board = civicSlice.boardRowsFor(d6Office, trackerRows, CHILD_TO_PARENT_HOOD);
  assert.equal(d6Board.length, 0, 'D6 has no matching initiatives in this fixture');
});

test('T3.2: Live loadPetitionPool in temp workspace filters Civic complaints and drops office holders', () => {
  const ws = createTempWorkspace();
  try {
    ws.writeJson('output/beats/meta.json', { cycle: 108 });
    ws.writeJson('output/simulation_ledger_snapshot.meta.json', { cycle: 108 });

    const reflections = [
      { Event: 'Civic', Cycle: 108, POPID: SYNTH_POP.CITIZEN_WEST_OAK_1, Neighborhood: 'West Oakland', Affect: 'angry', ReflectionExcerpt: 'Potholes on 7th st' },
      { Event: 'Sports', Cycle: 108, POPID: SYNTH_POP.CITIZEN_WEST_OAK_2, Neighborhood: 'West Oakland', Affect: 'frustrated', ReflectionExcerpt: 'Game was terrible' },
      { Event: 'Civic', Cycle: 108, POPID: SYNTH_POP.COUNCIL_D1, Neighborhood: 'West Oakland', Affect: 'worried', ReflectionExcerpt: 'Staff is overwhelmed' },
      { Event: 'Civic', Cycle: 108, POPID: SYNTH_POP.CITIZEN_WEST_OAK_2, Neighborhood: 'West Oakland', Affect: 'excited', ReflectionExcerpt: 'Love the new park' }
    ];
    ws.writeJsonl('output/beats/Reflection_Intake.jsonl', reflections);

    const constituents = [
      { POPID: SYNTH_POP.CITIZEN_WEST_OAK_1, Name: 'Alex West', Neighborhood: 'West Oakland', Status: 'active', Tier: 3 },
      { POPID: SYNTH_POP.CITIZEN_WEST_OAK_2, Name: 'Morgan West', Neighborhood: 'West Oakland', Status: 'active', Tier: 3 },
      { POPID: SYNTH_POP.COUNCIL_D1, Name: 'Council D1', Neighborhood: 'West Oakland', Status: 'active', Tier: 1 }
    ];
    ws.writeJsonl('output/simulation_ledger_snapshot.jsonl', constituents);

    const office = { officeId: 'COUNCIL-D1', district: 'D1' };
    const officeMap = { offices: [{ officeId: 'COUNCIL-D1', popid: SYNTH_POP.COUNCIL_D1 }] };

    const pool = civicSlice.loadPetitionPool(ws.dir, office, ['West Oakland'], officeMap, CHILD_TO_PARENT_HOOD, 108);
    assert.equal(pool.available, true);
    assert.equal(pool.complaints.length, 1, 'Only non-official negative civic reflections count as complaints');
    assert.equal(pool.complaints[0].snippet, 'Potholes on 7th st');
    assert.equal(pool.participation.length, 1, 'Positive civic reflections go to participation');
    assert.equal(pool.participation[0].snippet, 'Love the new park');
  } finally {
    ws.cleanup();
  }
});

test('T3.3: Live loadConfrontation extracts verbatim demand for targeted seat in temp workspace', () => {
  const ws = createTempWorkspace();
  try {
    const directiveText = `
## Denise Carter (District 1) — civic-office-council-d1
**Agent:** .claude/agents/civic-office-council-d1/
**Address:** Councilmember Carter
**Demand:** The West Oakland stabilization fund is six weeks behind audit. Table the resolution.
    `.trim();

    ws.writeText('output/mara-directives/mara_directive_c108_AUTO.txt', directiveText);

    const conf = civicSlice.loadConfrontation(ws.dir, 108, 'civic-office-council-d1');
    assert(conf !== null, 'Confrontation object must be returned for targeted seat');
    assert.equal(conf.id, 'CONF-108-civic-office-council-d1');
    assert.match(conf.demand, /Denise Carter/);
    assert.match(conf.demand, /Councilmember Carter/);
    assert.match(conf.sourceText, /West Oakland stabilization fund/);
  } finally {
    ws.cleanup();
  }
});

test('T3.4: Pack blocks cap length (~600 chars) and degrade gracefully to stated absence', () => {
  const ws = createTempWorkspace();
  try {
    const longAddress = 'A'.repeat(800);
    ws.writeText('output/mara-directives/mara_directive_c108_AUTO.txt', `
## Denise Carter (District 1) — civic-office-council-d1
**Agent:** .claude/agents/civic-office-council-d1/
**Address:** ${longAddress}
**Demand:** Tabling requested.
    `.trim());

    const conf = civicSlice.loadConfrontation(ws.dir, 108, 'civic-office-council-d1');
    assert(conf !== null);
    assert(conf.demand.length <= 605, `Block should be capped at ~600 chars, got ${conf.demand.length}`);
    assert(conf.demand.endsWith('…'), 'Clipped demand should end with ellipsis');

    const missingConf = civicSlice.loadConfrontation(ws.dir, 108, 'civic-office-council-d6');
    assert.strictEqual(missingConf, null, 'Seats without a confrontation directive return null');
  } finally {
    ws.cleanup();
  }
});

test('T3.5: Missing citizen snapshot sets available:false with stated absence for district seat', () => {
  const ws = createTempWorkspace();
  try {
    ws.writeJson('output/beats/meta.json', { cycle: 108 });
    ws.writeJsonl('output/beats/Reflection_Intake.jsonl', [
      { Event: 'Civic', Cycle: 108, POPID: SYNTH_POP.CITIZEN_WEST_OAK_1, Neighborhood: 'West Oakland', Affect: 'angry', ReflectionExcerpt: 'Dirty streets' }
    ]);
    const office = { officeId: 'COUNCIL-D1', district: 'D1' };
    const officeMap = { offices: [{ officeId: 'COUNCIL-D1', popid: SYNTH_POP.COUNCIL_D1 }] };

    const pool = civicSlice.loadPetitionPool(ws.dir, office, ['West Oakland'], officeMap, CHILD_TO_PARENT_HOOD, 108);
    assert.equal(pool.available, false);
    assert.match(pool.text, /the citizen snapshot \(simulation_ledger_snapshot\.jsonl\) is absent/);
  } finally {
    ws.cleanup();
  }
});

test('T3.6: Live loadTrackerRows loads tracker rows cleanly and returns null or empty on missing file', () => {
  const ws = createTempWorkspace();
  try {
    assert.strictEqual(civicSlice.loadTrackerRows(ws.dir), null);

    const rows = [
      { InitiativeID: 'INIT-001', Name: 'Test Hub' },
      { InitiativeID: 'INIT-002', Name: 'Test Program' }
    ];
    ws.writeJsonl('output/beats/Initiative_Tracker.jsonl', rows);
    const loaded = civicSlice.loadTrackerRows(ws.dir);
    assert.equal(loaded.length, 2);
    assert.equal(loaded[0].InitiativeID, 'INIT-001');
  } finally {
    ws.cleanup();
  }
});

test('T3.7: Live loadPetitionPool prefers ReflectionExcerpt over legacy Snippet/Text headers', () => {
  const ws = createTempWorkspace();
  try {
    ws.writeJson('output/beats/meta.json', { cycle: 108 });
    ws.writeJson('output/simulation_ledger_snapshot.meta.json', { cycle: 108 });

    const reflections = [
      {
        Event: 'Civic', Cycle: 108, POPID: SYNTH_POP.CITIZEN_WEST_OAK_1, Neighborhood: 'West Oakland', Affect: 'angry',
        ReflectionExcerpt: 'Canonical excerpt text from live sheet',
        Snippet: 'Legacy snippet',
        Text: 'Legacy text'
      }
    ];
    ws.writeJsonl('output/beats/Reflection_Intake.jsonl', reflections);
    ws.writeJsonl('output/simulation_ledger_snapshot.jsonl', [
      { POPID: SYNTH_POP.CITIZEN_WEST_OAK_1, Name: 'Citizen A', Neighborhood: 'West Oakland', Status: 'active', Tier: 3 }
    ]);

    const office = { officeId: 'COUNCIL-D1', district: 'D1' };
    const officeMap = { offices: [] };

    const pool = civicSlice.loadPetitionPool(ws.dir, office, ['West Oakland'], officeMap, CHILD_TO_PARENT_HOOD, 108);
    assert.equal(pool.available, true);
    assert.equal(pool.complaints.length, 1);
    assert.equal(pool.complaints[0].snippet, 'Canonical excerpt text from live sheet');
  } finally {
    ws.cleanup();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4: T6 Petition Math
// ─────────────────────────────────────────────────────────────────────────────
group('Group 4: T6 Petition Math');

test('T6.1: Live countPetition annualizes rent burden and calculates hardship households correctly', () => {
  const mockData = {
    cycle: 108,
    Neighborhood_Map: [{ Neighborhood: 'West Oakland', ChildAreas: '' }],
    Neighborhood_Demographics: [{ Neighborhood: 'West Oakland', Students: '100', Adults: '800', Seniors: '100', Sick: '20' }],
    Household_Ledger: [
      { HouseholdId: 'HH-01', Neighborhood: 'West Oakland', Status: 'active', HousingType: 'rented', MonthlyRent: '1500', HouseholdIncome: '40000' },
      { HouseholdId: 'HH-02', Neighborhood: 'West Oakland', Status: 'active', HousingType: 'rented', MonthlyRent: '800', HouseholdIncome: '50000' },
      { HouseholdId: 'HH-03', Neighborhood: 'West Oakland', Status: 'active', HousingType: 'owned', MonthlyRent: '0', HouseholdIncome: '100000' }
    ],
    Hospital_Ledger: [], Crime_Metrics: [], Simulation_Ledger: [], Reflection_Intake: []
  };

  const res = civicPetitions.countPetition({ policyDomain: 'housing', hoods: ['West Oakland'] }, mockData, { hardshipBand: 0.30 });
  assert.equal(res.counts.activeRentedHouseholds, 2);
  assert.equal(res.counts.evaluableHouseholds, 2);
  assert.equal(res.counts.hardshipHouseholds, 1);
  assert.equal(res.support.cleared, false);
  assert.equal(res.support.reason, 'domain-not-playable');
});

test('T6.2: Live countPetition tracks missing and zero income explicitly without silent drops', () => {
  const mockData = {
    cycle: 108,
    Neighborhood_Map: [{ Neighborhood: 'West Oakland', ChildAreas: '' }],
    Neighborhood_Demographics: [{ Neighborhood: 'West Oakland', Students: '100', Adults: '800', Seniors: '100', Sick: '20' }],
    Household_Ledger: [
      { HouseholdId: 'HH-01', Neighborhood: 'West Oakland', Status: 'active', HousingType: 'rented', MonthlyRent: '1500', HouseholdIncome: '0' },
      { HouseholdId: 'HH-02', Neighborhood: 'West Oakland', Status: 'active', HousingType: 'rented', MonthlyRent: '1200', HouseholdIncome: '' },
      { HouseholdId: 'HH-03', Neighborhood: 'West Oakland', Status: 'active', HousingType: 'rented', MonthlyRent: '1500', HouseholdIncome: '40000' }
    ],
    Hospital_Ledger: [], Crime_Metrics: [], Simulation_Ledger: [], Reflection_Intake: []
  };

  const res = civicPetitions.countPetition({ policyDomain: 'housing', hoods: ['West Oakland'] }, mockData, { hardshipBand: 0.30 });
  assert.equal(res.counts.zeroIncomeHouseholds, 1);
  assert.equal(res.counts.missingIncomeHouseholds, 1);
  assert.equal(res.counts.hardshipHouseholds, 1);
});

test('T6.3: Live countPetition for health reports in-care hospital count and sick residents distinctly', () => {
  const mockData = {
    cycle: 108,
    Neighborhood_Map: [{ Neighborhood: 'Temescal', ChildAreas: '' }],
    Neighborhood_Demographics: [{ Neighborhood: 'Temescal', Students: '100', Adults: '800', Seniors: '100', Sick: '45' }],
    Household_Ledger: [],
    Hospital_Ledger: [
      { AdmissionId: 'H1', POPID: SYNTH_POP.CITIZEN_TEMESCAL_1, Neighborhood: 'Temescal', StatusNow: 'hospitalized', DischargeCycle: '', Outcome: '' },
      { AdmissionId: 'H2', POPID: SYNTH_POP.CITIZEN_WEST_OAK_1, Neighborhood: 'Temescal', StatusNow: 'active', DischargeCycle: '107', Outcome: 'recovered' }
    ],
    Crime_Metrics: [], Simulation_Ledger: [], Reflection_Intake: []
  };

  const res = civicPetitions.countPetition({ policyDomain: 'health', hoods: ['Temescal'] }, mockData, { supportBand: 0.001 });
  assert.equal(res.counts.openAdmissions, 1);
  assert.equal(res.counts.inCareCitizens, 1);
  assert.equal(res.counts.sickResidents, 45);
  assert.notEqual(res.support.numerator, 46, 'Never sums hospitalized patients and sick residents');
  assert.equal(res.support.cleared, true, 'Health clears when support band threshold is met');
});

test('T6.4: Live countPetition for safety reports hood-aggregate condition and cannot clear', () => {
  const mockData = {
    cycle: 108,
    Neighborhood_Map: [
      { Neighborhood: 'East Oakland', ChildAreas: 'Coliseum' },
      { Neighborhood: 'Temescal', ChildAreas: '' }
    ],
    Neighborhood_Demographics: [
      { Neighborhood: 'East Oakland', Students: '100', Adults: '800', Seniors: '100', Sick: '20' },
      { Neighborhood: 'Temescal', Students: '100', Adults: '800', Seniors: '100', Sick: '20' }
    ],
    Household_Ledger: [], Hospital_Ledger: [],
    Crime_Metrics: [
      { Neighborhood: 'East Oakland', ViolentLevel: '40' },
      { Neighborhood: 'Temescal', ViolentLevel: '20' }
    ],
    Simulation_Ledger: [], Reflection_Intake: []
  };

  const res = civicPetitions.countPetition({ policyDomain: 'safety', hoods: ['East Oakland'] }, mockData);
  assert.equal(res.counts.cityMedianViolentLevel, 30);
  assert.equal(res.counts.aboveMedianHoods, 1);
  assert.equal(res.support.unit, 'hood-condition-not-signatures');
  assert.equal(res.support.cleared, false);
  assert.equal(res.support.reason, 'domain-not-playable');
});

test('T6.5: Live countPetition folds child area Coliseum to East Oakland parent', () => {
  const mockData = {
    cycle: 108,
    Neighborhood_Map: [
      { Neighborhood: 'East Oakland', ChildAreas: 'Coliseum' }
    ],
    Neighborhood_Demographics: [
      { Neighborhood: 'East Oakland', Students: '100', Adults: '800', Seniors: '100', Sick: '20' }
    ],
    Household_Ledger: [
      { HouseholdId: 'HH-COL-1', Neighborhood: 'Coliseum', Status: 'active', HousingType: 'rented', MonthlyRent: '1800', HouseholdIncome: '40000' }
    ],
    Hospital_Ledger: [], Crime_Metrics: [], Simulation_Ledger: [], Reflection_Intake: []
  };

  const res = civicPetitions.countPetition({ policyDomain: 'housing', hoods: ['East Oakland'] }, mockData, { hardshipBand: 0.30 });
  assert.equal(res.counts.hardshipHouseholds, 1, 'Coliseum household counts for East Oakland petition');
});

test('T6.6: Live petitionGateSweep in temp workspace: unset bands produce 0 writes; set band stages vote write', () => {
  const ws = createTempWorkspace();
  try {
    const beats = ws.path('output/beats');
    const out = ws.path('output');

    ws.writeJsonl('output/beats/Initiative_Tracker.jsonl', [
      { InitiativeID: 'INIT-999', PolicyDomain: 'health', AffectedNeighborhoods: 'Temescal', Status: 'proposed', VoteCycle: '' }
    ]);
    ws.writeJson('output/beats/meta.json', { cycle: 108 });
    ws.writeJson('output/engine_audit_c108.json', {
      cycle: 108,
      snapshots: { Neighborhood_Map: [{ Neighborhood: 'Temescal', ChildAreas: '' }] }
    });
    ws.writeJsonl('output/beats/Neighborhood_Demographics.jsonl', [
      { Neighborhood: 'Temescal', Students: '100', Adults: '800', Seniors: '100', Sick: '20' }
    ]);
    ws.writeJsonl('output/beats/Hospital_Ledger.jsonl', [
      { AdmissionId: 'H1', POPID: SYNTH_POP.CITIZEN_TEMESCAL_1, Neighborhood: 'Temescal', StatusNow: 'hospitalized', DischargeCycle: '', Outcome: '' }
    ]);
    ws.writeJsonl('output/beats/Household_Ledger.jsonl', []);
    ws.writeJsonl('output/beats/Crime_Metrics.jsonl', []);
    ws.writeJsonl('output/beats/Reflection_Intake.jsonl', []);
    ws.writeJsonl('output/simulation_ledger_snapshot.jsonl', [
      { POPID: SYNTH_POP.CITIZEN_TEMESCAL_1, Name: 'Pat Synthetic', Neighborhood: 'Temescal', Status: 'active', Tier: 3 }
    ]);
    ws.writeJson('output/simulation_ledger_snapshot.meta.json', { cycle: 108 });

    // 1. Unset bands
    const r1 = civicRun.petitionGateSweep(ws.dir, 108);
    assert.equal(r1.pending, 1);
    assert.equal(r1.gated, 0);
    const stagedFile = ws.path('output/city-civic-database/initiatives/init-999/decisions_c108.json');
    assert.equal(fs.existsSync(stagedFile), false, 'Unset band must stage no files');

    // 2. Set band for health
    civicRun.PETITION_SUPPORT_BANDS.health = 0.0005;
    const r2 = civicRun.petitionGateSweep(ws.dir, 108);
    delete civicRun.PETITION_SUPPORT_BANDS.health;

    assert.equal(r2.pending, 1);
    assert.equal(r2.gated, 1);
    assert(fs.existsSync(stagedFile));
    const staged = JSON.parse(fs.readFileSync(stagedFile, 'utf8'));
    assert.equal(staged.trackerUpdates.Status, 'pending-vote');
    assert.equal(staged.trackerUpdates.ImplementationPhase, 'vote-scheduled');
    assert.equal(staged.trackerUpdates.VoteCycle, 109);
  } finally {
    delete civicRun.PETITION_SUPPORT_BANDS.health;
    ws.cleanup();
  }
});

test('T6.7: Live countPetition verifies that housing and safety return domain-not-playable and never clear', () => {
  const mockData = {
    cycle: 108,
    Neighborhood_Map: [{ Neighborhood: 'Temescal', ChildAreas: '' }],
    Neighborhood_Demographics: [{ Neighborhood: 'Temescal', Students: '100', Adults: '800', Seniors: '100', Sick: '20' }],
    Household_Ledger: [{ HouseholdId: 'HH-1', Neighborhood: 'Temescal', Status: 'active', HousingType: 'rented', MonthlyRent: '2500', HouseholdIncome: '30000' }],
    Hospital_Ledger: [],
    Crime_Metrics: [{ Neighborhood: 'Temescal', ViolentLevel: '50' }],
    Simulation_Ledger: [], Reflection_Intake: []
  };

  const rHousing = civicPetitions.countPetition({ policyDomain: 'housing', hoods: ['Temescal'] }, mockData, { supportBand: 0.0001 });
  assert.equal(rHousing.support.cleared, false);
  assert.equal(rHousing.support.reason, 'domain-not-playable');

  const rSafety = civicPetitions.countPetition({ policyDomain: 'safety', hoods: ['Temescal'] }, mockData, { supportBand: 0.0001 });
  assert.equal(rSafety.support.cleared, false);
  assert.equal(rSafety.support.reason, 'domain-not-playable');
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 5: T8 Directive Targeting
// ─────────────────────────────────────────────────────────────────────────────
group('Group 5: T8 Directive Targeting');

function filterDirectiveAddresseePool(officeRows) {
  const ELECTED = new Set([
    'MAYOR-01',
    'COUNCIL-D1', 'COUNCIL-D2', 'COUNCIL-D3', 'COUNCIL-D4', 'COUNCIL-D5',
    'COUNCIL-D6', 'COUNCIL-D7', 'COUNCIL-D8', 'COUNCIL-D9'
  ]);
  return officeRows.filter(o => o && ELECTED.has(o.officeId));
}

test('T8.1: Addressee pool retargets exclusively to the 10 elected seats', () => {
  const sampleOffices = [
    { officeId: 'MAYOR-01', title: 'Mayor' },
    { officeId: 'COUNCIL-D1', title: 'District 1' },
    { officeId: 'COUNCIL-D5', title: 'District 5' },
    { officeId: 'CHIEF-POLICE', title: 'Police Chief' },
    { officeId: 'DA-01', title: 'District Attorney' },
    { projectId: 'PROJ-STABFUND', officeId: 'PROJ-STABFUND', title: 'Project Director' },
    { projectId: 'PROJ-OARI', officeId: 'PROJ-OARI', title: 'Project Director' }
  ];

  const pool = filterDirectiveAddresseePool(sampleOffices);
  assert.equal(pool.length, 3);
  assert.deepEqual(pool.map(p => p.officeId).sort(), ['COUNCIL-D1', 'COUNCIL-D5', 'MAYOR-01']);
});

test('T8.2: Project directors are strictly excluded from directive addressee pool', () => {
  const projectDirector = { projectId: 'PROJ-HEALTHCTR', officeId: 'PROJ-HEALTHCTR', title: 'Health Center Director' };
  const pool = filterDirectiveAddresseePool([projectDirector]);
  assert.equal(pool.length, 0, 'Project directors must never be targeted by Sunday directive');
});

test('T8.3: Evaluates the three confrontation demand triggers accurately', () => {
  function evaluateDirectiveTriggersForSeat({ districtDataMovingWrong, petitionAboveVisibility, stageNearStall }) {
    const triggers = [];
    if (districtDataMovingWrong) triggers.push({ trigger: 'hood_degradation' });
    if (petitionAboveVisibility) triggers.push({ trigger: 'petition_unaddressed' });
    if (stageNearStall) triggers.push({ trigger: 'stall_warning' });
    return { shouldConfront: triggers.length > 0, triggers };
  }

  assert.equal(evaluateDirectiveTriggersForSeat({ districtDataMovingWrong: true }).shouldConfront, true);
  assert.equal(evaluateDirectiveTriggersForSeat({ petitionAboveVisibility: true }).shouldConfront, true);
  assert.equal(evaluateDirectiveTriggersForSeat({ stageNearStall: true }).shouldConfront, true);
  assert.equal(evaluateDirectiveTriggersForSeat({}).shouldConfront, false);
});

test('T8.4: Live civic-office-map.json contains exactly 10 elected seats, 1 police chief, and excludes project directors', () => {
  const officeMap = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'civic-office-map.json'), 'utf8'));
  const elected = (officeMap.offices || []).filter(o => o.officeId === 'MAYOR-01' || /^COUNCIL-D\d$/.test(String(o.officeId || '')));
  assert.equal(elected.length, 10, 'Must have exactly 10 elected seats');

  const chief = (officeMap.offices || []).filter(o => o.officeId === 'CHIEF-POLICE');
  assert.equal(chief.length, 1, 'Must have exactly 1 police chief office');

  const projectIds = (officeMap.projects || []).map(p => p.projectId);
  assert(projectIds.includes('PROJ-STABFUND'));
  assert(projectIds.includes('PROJ-OARI'));
  assert(projectIds.includes('PROJ-HEALTHCTR'));
  assert(projectIds.includes('PROJ-TRANSITHUB'));

  // Ensure no project directory is counted as elected
  const projectInElected = (officeMap.projects || []).filter(p => elected.some(e => e.officeId === p.projectId));
  assert.equal(projectInElected.length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 6: T9 Rota Split + Project Director Work-Wake Packs
// ─────────────────────────────────────────────────────────────────────────────
group('Group 6: T9 Rota Split + Project Director Work-Wake Packs');

test('T9.1: Live datawake rota filter against civic-office-map.json yields exactly the 11 political seats', () => {
  const officeMap = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'civic-office-map.json'), 'utf8'));
  const DATAWAKE_SEAT = /^(MAYOR-01|COUNCIL-D\d|CHIEF-POLICE)$/;

  const qualifying = [];
  for (const o of [...(officeMap.offices || []), ...(officeMap.projects || [])]) {
    if (!o.agentDir) continue;
    if (DATAWAKE_SEAT.test(String(o.officeId || o.projectId || ''))) {
      qualifying.push(o);
    }
  }

  assert.equal(qualifying.length, 11, 'Must have exactly 11 datawake seats (9 council + mayor + police chief)');
  const ids = qualifying.map(o => o.officeId).sort();
  assert(ids.includes('MAYOR-01'));
  assert(ids.includes('CHIEF-POLICE'));
  for (let d = 1; d <= 9; d++) {
    assert(ids.includes(`COUNCIL-D${d}`));
  }
});

test('T9.2: Live initiative-project node builder in cron-work-wake.js renders within 600 chars and handles missing rows', () => {
  const ws = createTempWorkspace();
  try {
    const row = {
      InitiativeID: 'INIT-001',
      Name: 'West Oakland Stabilization Fund',
      ImplementationPhase: 'implementation-active',
      Stage: 'Delivering',
      Status: 'active',
      MilestoneNotes: 'Disbursed grants to 12 families in West Oakland',
      NextScheduledAction: 'Review quarterly disbursement intake',
      NextActionCycle: '109'
    };
    ws.writeJsonl('Initiative_Tracker.jsonl', [row]);

    const builder = workWake.NODE_BUILDERS['initiative-project'];
    assert(typeof builder === 'function', 'initiative-project node builder must exist');

    const rendered = builder({ initiative: 'INIT-001' }, 108, ws.dir);
    assert(rendered !== null);
    assert.match(rendered, /Your project: West Oakland Stabilization Fund \(INIT-001\)\./);
    assert.match(rendered, /implementation-active, stage Delivering/);
    assert.match(rendered, /Latest milestone: Disbursed grants to 12 families/);
    assert.match(rendered, /Next on the books: Review quarterly disbursement intake \(cycle 109\)\./);
    assert(rendered.length <= 600, 'initiative-project block must be <= 600 characters');

    // Missing row
    const missing = builder({ initiative: 'INIT-999' }, 108, ws.dir);
    assert.strictEqual(missing, null);
  } finally {
    ws.cleanup();
  }
});

test('T9.3: Live work-wake packages for all four project directors validate cleanly via workWakePackages', () => {
  const pkgs = workWakePackages.loadPackages();
  const dirKeys = ['proj-stabilization-fund', 'proj-oari', 'proj-health-center', 'proj-transit-hub'];

  for (const key of dirKeys) {
    const pkg = pkgs[key];
    assert(pkg, `Package ${key} must exist in work-wake-packages.json`);
    assert.doesNotThrow(() => workWakePackages.validatePackage(key, pkg));
    assert(pkg.dataNodes.includes('initiative-project'));
    assert(/^INIT-\d+$/.test(pkg.initiative));
  }

  // Regression: missing initiative must throw validation error
  assert.throws(
    () => workWakePackages.validatePackage('proj-invalid', {
      persona: 'proj-invalid', active: true, popid: 'POP-99999', name: 'Test', office: 'TEST',
      dataNodes: ['initiative-project'], models: { reflect: { provider: 'openrouter', model: 'deepseek/deepseek-chat' } },
      dutyDays: ['tue'], promptContract: { roleLine: 'Role', voiceNotes: 'Voice' }
    }),
    /initiative-project dataNode requires initiative/
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 7: Repair Commits Validation (F1, F3, F4, F5, F6, F7, F8)
// ─────────────────────────────────────────────────────────────────────────────

group('Group 7: Repair Commits Validation (F1, F3, F4, F5, F6, F7, F8)');

test('F1: Live catalog gate rejects malformed schema shapes and inherited prototype properties', () => {
  const office = { officeId: 'COUNCIL-D5', agentDir: 'civic-office-council-d5', district: 'D5' };
  const baseCatalog = phaseContract.INTERVENTION_CATALOG;
  const malformedCatalog = {
    ...baseCatalog,
    'broken-no-metric': { policyDomain: 'health', playable: true },
    'broken-bad-direction': {
      policyDomain: 'health', type: 'vote', playable: true, effectChannel: 'channel',
      stage3Metric: { tab: 'T', scope: 'S', direction: 'diagonal', column: 'C' }
    }
  };

  const proposal = intervention => ({
    type: 'propose', intervention, title: 'Synthetic Proposal', problem: 'Test problem', hoods: ['East Oakland'], budget: '$20M'
  });

  // housing-program flipped playable:true engine.251 (2026-09-22); safety-program
  // is now the live unplayable example.
  const testKeys = ['constructor', 'toString', '__proto__', 'broken-no-metric', 'broken-bad-direction', 'safety-program'];
  for (const key of testKeys) {
    const result = civicRun.validateDatawakeMoves([proposal(key), proposal('health-service')], {
      office, catalog: malformedCatalog
    });
    assert.strictEqual(result.rejected.length, 1, `Key "${key}" should be rejected`);
    assert.strictEqual(result.accepted.length, 1, `Key "${key}" should not prevent second valid move`);
    assert.strictEqual(result.accepted[0].payload.intervention, 'health-service');
  }
});

test('F3: Complaint pool locates citizens through snapshot geography without requiring constituent display filters', () => {
  const ws = createTempWorkspace();
  try {
    ws.writeJson('output/beats/meta.json', { cycle: 108 });
    ws.writeJson('output/simulation_ledger_snapshot.meta.json', { cycle: 108 });
    ws.writeJsonl('output/beats/Reflection_Intake.jsonl', [
      { POPID: SYNTH_POP.CITIZEN_EAST_OAK_1, Cycle: 108, Tag: 'Civic', Affect: 'Angry', ReflectionExcerpt: 'Coliseum transit issue' }
    ]);
    // Hospitalized citizen without display name in child area Coliseum
    ws.writeJsonl('output/simulation_ledger_snapshot.jsonl', [
      { POPID: SYNTH_POP.CITIZEN_EAST_OAK_1, Neighborhood: 'Coliseum', Status: 'hospitalized' }
    ]);

    const office = { officeId: 'COUNCIL-D5', agentDir: 'civic-office-council-d5', district: 'D5' };
    const result = civicSlice.loadPetitionPool(ws.dir, office, ['East Oakland'], { offices: [] }, { coliseum: 'East Oakland' }, 108);

    assert.strictEqual(result.available, true);
    assert.strictEqual(result.complaints.length, 1);
    assert.strictEqual(result.complaints[0].hood, 'East Oakland');
    assert.strictEqual(result.complaints[0].snippet, 'Coliseum transit issue');

    // Conflicting citizen geography throws
    ws.writeJsonl('output/simulation_ledger_snapshot.jsonl', [
      { POPID: SYNTH_POP.CITIZEN_EAST_OAK_1, Neighborhood: 'Coliseum', Status: 'hospitalized' },
      { POPID: SYNTH_POP.CITIZEN_EAST_OAK_1, Neighborhood: 'West Oakland', Status: 'active' }
    ]);
    assert.throws(
      () => civicSlice.loadPetitionPool(ws.dir, office, ['East Oakland'], { offices: [] }, { coliseum: 'East Oakland' }, 108),
      /Conflicting citizen geography/
    );
  } finally {
    ws.cleanup();
  }
});

test('F4: Strict JSONL parsing, snapshot cycle match, and geography gate prevent partial authority', () => {
  const ws = createTempWorkspace();
  try {
    // Corrupt JSONL throws with line number
    const badFile = ws.writeText('corrupt.jsonl', '{"InitiativeID":"INIT-999"}\n{invalid_json');
    assert.throws(() => civicSlice.readJsonl(badFile), /:2:/);

    // Missing Neighborhood_Map or multiple parents throws
    assert.throws(() => civicSlice.childToParentFromAudit({}), /Neighborhood_Map/);
    assert.throws(() => civicSlice.childToParentFromAudit({
      snapshots: {
        Neighborhood_Map: [
          { Neighborhood: 'West Oakland', ChildAreas: 'Shared-Child' },
          { Neighborhood: 'East Oakland', ChildAreas: 'Shared-Child' }
        ]
      }
    }), /multiple parents/);

    // Cycle mismatch throws in requireSnapshotCycle
    ws.writeJson('output/beats/meta.json', { cycle: 107 });
    assert.throws(() => civicSlice.requireCycle({ cycle: 107 }, 108, 'test audit'), /cycle mismatch/);

    // Geography issue in context blocks geographic moves
    const office = { officeId: 'COUNCIL-D5', agentDir: 'civic-office-council-d5', district: 'D5' };
    const moves = civicRun.validateDatawakeMoves(
      [
        { type: 'propose', intervention: 'health-service', title: 'Clinic', problem: 'Care', hoods: ['East Oakland'] },
        { type: 'canvass', hood: 'East Oakland' },
        { type: 'work', initiativeId: 'INIT-001' }
      ],
      { office, geographyIssue: 'turf disagrees' }
    );
    assert.strictEqual(moves.accepted.length, 0);
    assert.strictEqual(moves.rejected.length, 3);
    assert.match(moves.rejected[0].reason, /geography-unavailable\(turf disagrees\)/);
  } finally {
    ws.cleanup();
  }
});

test('F5: New datawake records omit legacy action field while officeWall preserves backward compatibility', () => {
  const office = { officeId: 'COUNCIL-D5', agentDir: 'civic-office-council-d5', holder: 'Synthetic Holder', popid: SYNTH_POP.COUNCIL_D5, title: 'Councilmember' };
  const confrontation = { id: 'CONF-108-civic-office-council-d5', cycle: 108, agentDir: office.agentDir };
  const mv = civicRun.validateDatawakeMoves(
    [{ type: 'answer', confrontationId: confrontation.id, text: 'Synthetic response to directive' }],
    { office, cycle: 108, confrontations: [confrontation] }
  );

  const rec = civicRun.datawakeRecord({
    office, cycle: 108, date: '2026-09-21', answeredModel: 'synthetic-model',
    j: { statement: 'Synthetic speech', action: 'Fabricated rogue action', numberMoved: 'Signal' },
    mv
  });

  assert.strictEqual(Object.hasOwn(rec, 'action'), false, 'New datawake records must omit action property');
  assert.deepStrictEqual(rec.moves, mv.accepted);

  const wallLine = officeWall.lineFromDatawake(rec);
  assert.doesNotMatch(wallLine.text, /Fabricated rogue action/);
  assert.match(wallLine.text, /Synthetic speech/);

  // Historical record compatibility
  const legacyLine = officeWall.lineFromDatawake({ statement: 'Historical speech', action: 'Legacy action' });
  assert.match(legacyLine.text, /Legacy action/);
});

test('F6: Move memory retains prior terminal outcomes across cycle boundaries alongside pending moves', () => {
  const ws = createTempWorkspace();
  try {
    const office = { officeId: 'COUNCIL-D5', agentDir: 'civic-office-council-d5', district: 'D5' };
    const audit = { cycle: 108, snapshots: { Neighborhood_Map: [{ Neighborhood: 'East Oakland', ChildAreas: 'Coliseum' }] } };
    ws.writeJson('output/engine_audit_c108.json', audit);
    ws.writeJson('output/beats/meta.json', { cycle: 108 });
    ws.writeJsonl('output/beats/Initiative_Tracker.jsonl', [
      { InitiativeID: 'INIT-001', Name: 'East Oakland Health', ProposingOffice: office.officeId, AffectedNeighborhoods: 'East Oakland', Status: 'active' }
    ]);

    // C107 terminal failed move
    const m107 = {
      moveId: 'MV-107-civic-office-council-d5-2026-09-14', cycle: 107, date: '2026-09-14',
      agentDir: office.agentDir, popid: office.popid, type: 'work',
      payload: { initiativeId: 'INIT-001' }, status: 'failed', detail: 'Work move rejected by gate'
    };
    ws.writeJsonl('output/cron-civic/moves/moves_c107.jsonl', [m107]);

    // C108 pending move
    const m108 = {
      moveId: 'MV-108-civic-office-council-d5-2026-09-21', cycle: 108, date: '2026-09-21',
      agentDir: office.agentDir, popid: office.popid, type: 'canvass',
      payload: { hood: 'East Oakland' }, status: 'pending'
    };
    ws.writeJsonl('output/cron-civic/moves/moves_c108.jsonl', [m108]);

    // Future C109 move (must be ignored)
    ws.writeJsonl('output/cron-civic/moves/moves_c109.jsonl', [
      { moveId: 'MV-109-future', cycle: 109, agentDir: office.agentDir, type: 'work', status: 'pending' }
    ]);

    const blocks = civicSlice.buildGameBlocks({ root: ws.dir, cycle: 108, office, officeMap: { offices: [] }, hoods: ['East Oakland'], audit });
    const lastMove = blocks.lastMove;

    assert.strictEqual(lastMove.moves.length, 2, 'Should contain current pending and prior terminal outcome');
    assert.match(lastMove.text, /awaiting the Sunday fold/);
    assert.match(lastMove.text, /Work move rejected by gate/);
  } finally {
    ws.cleanup();
  }
});

test('F7: boardNeedText uses the shared helper, preserves stalled priority and accepts closing-Cycle work', () => {
  for (const Stage of ['Funded', 'Standing', 'Delivering']) {
    const stalledRow = { Stage, ImplementationPhase: 'stalled' };
    assert.match(civicSlice.boardNeedText(stalledRow), /stalled — one work move revives it/);

    const activeRow = { Stage, ImplementationPhase: 'active' };
    assert.equal(civicSlice.boardNeedText(activeRow), phaseContract.stageRequirement({stage:Stage,phase:'active'}).text);
  }
  const proposedRow = { Status: 'proposed', VoteCycle: '', PolicyDomain: 'health' };
  assert.match(civicSlice.boardNeedText(proposedRow), /petition-pending — signatures move it to a vote/);
  // A domain with no petition rule (not health/housing/safety) must not tell
  // the agent signatures move it — call-vote is the only path (adversarial
  // review of 51fdee28, Finding 5, fixed 2026-09-22).
  const deferredDomainRow = { Status: 'proposed', VoteCycle: '', PolicyDomain: 'transit' };
  assert.match(civicSlice.boardNeedText(deferredDomainRow), /petition-pending — no signature rule; eligible for call-vote/);
  const fundedRow = {Stage:'Funded',ImplementationPhase:'announced',LastWorkCycle:108,LastStageChangeCycle:108};
  assert.match(civicSlice.boardNeedText(fundedRow), /work landed/);
  assert.match(civicSlice.boardNeedText({...fundedRow,LastWorkCycle:107}), /one work move/);
  assert.match(civicSlice.boardNeedText({Stage:'Standing',PolicyDomain:'health'}), /metric evidence unavailable/);
});

test('T9.255: board shows BudgetRemaining/LastDisburseCycle when the dump carries them, not-yet-stamped when it does not', () => {
  const office = { officeId: 'MAYOR-01', agentDir: 'civic-office-mayor', district: 'citywide' };
  // Pre-C109 dump shape: no budget keys at all.
  const legacyRow = { InitiativeID: 'INIT-991', Name: 'Synthetic Legacy', Status: 'proposed', VoteCycle: '', PolicyDomain: 'health' };
  // Post-arm dump shape: budget keys present.
  const stampedRow = { InitiativeID: 'INIT-992', Name: 'Synthetic Stamped', Status: 'active', VoteCycle: '100',
    PolicyDomain: 'housing', Stage: 'Standing', ImplementationPhase: 'operational',
    BudgetTotal: 28000000, BudgetRemaining: 27600000, LastDisburseCycle: 111 };
  const blankRow = { InitiativeID: 'INIT-993', Name: 'Synthetic Blank', Status: 'proposed', VoteCycle: '',
    PolicyDomain: 'economic', BudgetTotal: '', BudgetRemaining: '', LastDisburseCycle: '' };

  const board = civicSlice.boardRowsFor(office, [legacyRow, stampedRow, blankRow], {}, { cycle: 108, config: {} });
  const byId = {};
  board.forEach(b => { byId[b.id] = b; });
  assert.equal(byId['INIT-991'].budget, 'budget: not yet stamped');
  assert.match(byId['INIT-992'].budget, /budget \$27,600,000 left/);
  assert.match(byId['INIT-992'].budget, /last disbursed C111/);
  assert.match(byId['INIT-993'].budget, /no parsed budget/);

  const text = civicSlice.boardBlock(board);
  assert.match(text, /INIT-992 Synthetic Stamped .*budget \$27,600,000 left, last disbursed C111/);
  assert.match(text, /INIT-991 Synthetic Legacy .*budget: not yet stamped/);

  // The pack lists the domain band next to each proposable intervention.
  const menu = civicSlice.loadInterventionMenu();
  assert.equal(menu.available, true);
  assert.match(menu.text, /health-service \(health\).*budget band \$5M-\$100M/);
  assert.match(menu.text, /transit-project \(transit\).*budget band \$20M-\$500M/);
  assert.match(menu.text, /school-program \(education\).*budget band \$1M-\$50M/);
});

test('F8: Proposal condition evidence computes from countPetition and gamePromptView caps history without dropping IDs', () => {
  const ws = createTempWorkspace();
  try {
    const office = { officeId: 'COUNCIL-D5', agentDir: 'civic-office-council-d5', district: 'D5' };
    const audit = { cycle: 108, snapshots: { Neighborhood_Map: [{ Neighborhood: 'East Oakland', ChildAreas: 'Coliseum' }] } };
    ws.writeJson('output/engine_audit_c108.json', audit);
    ws.writeJson('output/beats/meta.json', { cycle: 108 });
    ws.writeJsonl('output/beats/Initiative_Tracker.jsonl', [
      { InitiativeID: 'INIT-999', ProposingOffice: office.officeId, Status: 'proposed', PolicyDomain: 'housing', AffectedNeighborhoods: 'Coliseum' }
    ]);
    ws.writeJsonl('output/beats/Neighborhood_Demographics.jsonl', [
      { Neighborhood: 'East Oakland', Students: 100, Adults: 200, Seniors: 50, Sick: 0 }
    ]);
    ws.writeJsonl('output/beats/Household_Ledger.jsonl', [
      { HouseholdId: 'HH-99901', Neighborhood: 'Coliseum', Status: 'active', HousingType: 'rented', MonthlyRent: 1200, HouseholdIncome: 24000 }
    ]);

    const game = civicSlice.buildGameBlocks({ root: ws.dir, cycle: 108, office, officeMap: { offices: [] }, hoods: ['East Oakland'], audit });
    assert.strictEqual(game.conditions.available, true);
    assert.strictEqual(game.conditions.proposals.length, 1);
    assert.strictEqual(game.conditions.proposals[0].counts.hardshipHouseholds, 1);
    assert.strictEqual(game.conditions.proposals[0].support.cleared, false);
    assert.match(game.conditions.text, /domain-not-playable/);

    // Verify gamePromptView caps history while preserving ID sets
    const rawEntry = { snippet: 'LONG_STRING_'.repeat(200) };
    const bloatedGame = {
      boardIds: ['INIT-001', 'INIT-002'],
      board: [rawEntry],
      boardText: 'Synthetic board',
      lastMove: { text: 'Outcome', moves: Array(100).fill(rawEntry) },
      petitionPool: { available: true, text: 'Summary', complaints: Array(100).fill(rawEntry), participation: [] },
      interventions: { available: true, playable: [{ key: 'health-service' }], text: 'X'.repeat(2000) },
      confrontations: { available: true, open: [{ id: 'CONF-108-test' }] }
    };
    const prompt = civicRun.datawakeUserPrompt({ game: bloatedGame }, '', office);
    assert.strictEqual(prompt.includes('LONG_STRING_'), false);
    assert.match(prompt, /INIT-002/);
    assert.match(prompt, /CONF-108-test/);
    assert(prompt.length < 6000, 'Prompt length must be capped');
  } finally {
    ws.cleanup();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 8: Rulings Validation (R1, R4, R3, R2)
// ─────────────────────────────────────────────────────────────────────────────

group('Group 8: Rulings Validation (R1, R4, R3, R2)');

test('R1: Petition display enforces 3-Cycle window [cycle-2, cycle], labels both windows, and excludes invalid/future cycles', () => {
  const ws = createTempWorkspace();
  try {
    ws.writeJson('output/beats/meta.json', { cycle: 108 });
    ws.writeJson('output/simulation_ledger_snapshot.meta.json', { cycle: 108 });
    ws.writeJsonl('output/simulation_ledger_snapshot.jsonl', [
      { POPID: SYNTH_POP.CITIZEN_EAST_OAK_1, Neighborhood: 'East Oakland' }
    ]);
    ws.writeJsonl('output/beats/Reflection_Intake.jsonl', [
      { POPID: SYNTH_POP.CITIZEN_EAST_OAK_1, Cycle: 105, Tag: 'Civic', Affect: 'Angry', ReflectionExcerpt: 'C105 old complaint' },
      { POPID: SYNTH_POP.CITIZEN_EAST_OAK_1, Cycle: 106, Tag: 'Civic', Affect: 'Angry', ReflectionExcerpt: 'C106 window complaint' },
      { POPID: SYNTH_POP.CITIZEN_EAST_OAK_1, Cycle: 107, Tag: 'Civic', Affect: 'Angry', ReflectionExcerpt: 'C107 window complaint' },
      { POPID: SYNTH_POP.CITIZEN_EAST_OAK_1, Cycle: 108, Tag: 'Civic', Affect: 'Angry', ReflectionExcerpt: 'C108 current complaint' },
      { POPID: SYNTH_POP.CITIZEN_EAST_OAK_1, Cycle: 109, Tag: 'Civic', Affect: 'Angry', ReflectionExcerpt: 'C109 future complaint' },
      { POPID: SYNTH_POP.CITIZEN_EAST_OAK_1, Cycle: 'invalid', Tag: 'Civic', Affect: 'Angry', ReflectionExcerpt: 'Bad cycle complaint' }
    ]);

    const office = { officeId: 'COUNCIL-D5', agentDir: 'civic-office-council-d5', district: 'D5' };
    const pool = civicSlice.loadPetitionPool(ws.dir, office, ['East Oakland'], { offices: [] }, {}, 108);

    assert.strictEqual(pool.available, true);
    assert.deepStrictEqual(pool.complaints.map(c => Number(c.cycle)), [108, 107, 106]);
    assert.strictEqual(pool.invalidCycleRows, 1);
    assert.strictEqual(pool.sinceCycle, 106);
    assert.strictEqual(pool.throughCycle, 108);
    assert.match(pool.text, /Complaint display C106–C108; condition counter C108 only\./);
  } finally {
    ws.cleanup();
  }
});

test('R4: Working city selects 1 latest reflection per staff member across cycles and timestamps before applying character cap', () => {
  const ws = createTempWorkspace();
  try {
    ws.writeJson('output/beats/meta.json', { cycle: 108 });
    const staffRow = (popid, cycle, timestamp, text) => ({
      POPID: popid, Cycle: cycle, Timestamp: timestamp, Daypart: 'work', ReflectionExcerpt: text
    });
    ws.writeJsonl('output/beats/Reflection_Intake.jsonl', [
      staffRow(SYNTH_POP.PROJ_DIR_STAB, 108, '2026-09-20T10:00:00Z', 'Stab fund morning review'),
      staffRow(SYNTH_POP.PROJ_DIR_STAB, 108, '2026-09-20T18:00:00Z', 'Stab fund evening update (latest)'),
      staffRow(SYNTH_POP.PROJ_DIR_STAB, 107, '2026-09-14T12:00:00Z', 'Stab fund prior cycle'),
      staffRow(SYNTH_POP.PROJ_DIR_STAB, 109, '2026-09-28T12:00:00Z', 'Stab fund future cycle'),
      staffRow(SYNTH_POP.PROJ_DIR_OARI, 108, '2026-09-20T12:00:00Z', 'OARI team deployment')
    ]);

    const officeMap = {
      projects: [
        { projectId: 'proj-stabilization-fund', popid: SYNTH_POP.PROJ_DIR_STAB, holder: 'Director Stabilization' },
        { projectId: 'proj-oari', popid: SYNTH_POP.PROJ_DIR_OARI, holder: 'Director OARI' }
      ]
    };

    const result = civicSlice.loadWorkingCity(ws.dir, 108, officeMap);
    assert.strictEqual(result.available, true);
    assert.strictEqual(result.totalStaff, 2);
    assert.match(result.text, /Stab fund evening update \(latest\)/);
    assert.doesNotMatch(result.text, /morning review/);
    assert.doesNotMatch(result.text, /prior cycle/);
    assert.doesNotMatch(result.text, /future cycle/);
    assert.match(result.text, /OARI team deployment/);
    assert(result.text.length <= civicSlice.BLOCK_CAP);
  } finally {
    ws.cleanup();
  }
});

test('R3: Unanswered directives persist across cycles, bind answer moves, and reject duplicate answers', () => {
  const ws = createTempWorkspace();
  try {
    const office = { officeId: 'COUNCIL-D5', agentDir: 'civic-office-council-d5', district: 'D5' };
    const directiveText = (cycle, seat, text) =>
      `## Demand for C${cycle}\n- **Agent:** \`.claude/agents/${seat}/\`\n- **Address:** ${text}\n`;

    ws.writeText('output/mara-directives/mara_directive_c106_AUTO.txt', directiveText(106, office.agentDir, 'Prior unresolved demand'));
    ws.writeText('output/mara-directives/mara_directive_c108_AUTO.txt', directiveText(108, office.agentDir, 'Current demand'));

    // Prior unresolved demand persists as open[0]
    const state1 = civicSlice.loadConfrontations(ws.dir, 108, office.agentDir);
    assert.strictEqual(state1.open.length, 2);
    assert.strictEqual(civicSlice.loadConfrontation(ws.dir, 108, office.agentDir).id, 'CONF-106-' + office.agentDir);

    // Record an answer to C106 in C107
    ws.writeJsonl('output/cron-civic/moves/moves_c107.jsonl', [{
      moveId: 'MV-107-answer', cycle: 107, agentDir: office.agentDir, type: 'answer',
      payload: { confrontationId: 'CONF-106-' + office.agentDir }, status: 'pending'
    }]);

    const state2 = civicSlice.loadConfrontations(ws.dir, 108, office.agentDir);
    assert.strictEqual(state2.open.length, 1);
    assert.strictEqual(state2.open[0].id, 'CONF-108-' + office.agentDir);

    // Validate answer move binding at datawake gate
    const answer = id => ({ type: 'answer', confrontationId: id, text: 'We addressed the directive.' });
    const ctx = {
      office, cycle: 108, confrontations: state2.open,
      answeredConfrontationIds: new Set(state2.answeredIds),
      answerEvidenceAvailable: true
    };

    const mv = civicRun.validateDatawakeMoves([answer('CONF-106-' + office.agentDir), answer('CONF-108-' + office.agentDir)], ctx);
    assert.strictEqual(mv.rejected.length, 1);
    assert.match(mv.rejected[0].reason, /directive-already-answered/);
    assert.strictEqual(mv.accepted.length, 1);
    assert.strictEqual(mv.accepted[0].payload.directiveCycle, 108);
    assert.strictEqual(mv.accepted[0].payload.confrontationSeat, office.agentDir);
  } finally {
    ws.cleanup();
  }
});

test('R2: Passed-over problems derive from prior displayed pack conditions + empty closed-cycle ledger, resolving on landed moves or relief', () => {
  const ws = createTempWorkspace();
  try {
    const office = { officeId: 'COUNCIL-D5', agentDir: 'civic-office-council-d5', district: 'D5' };
    const audit = { cycle: 108, snapshots: { Neighborhood_Map: [{ Neighborhood: 'East Oakland', ChildAreas: 'Coliseum' }] } };
    ws.writeJson('output/engine_audit_c108.json', audit);
    ws.writeJson('output/beats/meta.json', { cycle: 108 });
    ws.writeJsonl('output/beats/Neighborhood_Demographics.jsonl', [
      { Neighborhood: 'East Oakland', Students: 100, Adults: 200, Seniors: 50, Sick: 0 }
    ]);
    ws.writeJsonl('output/beats/Hospital_Ledger.jsonl', []);
    ws.writeJsonl('output/beats/Crime_Metrics.jsonl', [
      { Neighborhood: 'East Oakland', ViolentLevel: 10 }
    ]);
    const household = {
      HouseholdId: 'HH-99901', Neighborhood: 'Coliseum', Status: 'active', HousingType: 'rented', MonthlyRent: 1200, HouseholdIncome: 24000
    };
    ws.writeJsonl('output/beats/Household_Ledger.jsonl', [household]);
    ws.writeJsonl('output/beats/Initiative_Tracker.jsonl', [
      { InitiativeID: 'INIT-001', ProposingOffice: office.officeId, AffectedNeighborhoods: 'Coliseum' }
    ]);

    // Initial pack in C108 has no passed over problems yet
    const blocks1 = civicSlice.buildGameBlocks({ root: ws.dir, cycle: 108, office, officeMap: { offices: [] }, hoods: ['East Oakland'], audit });
    assert.strictEqual(blocks1.problemContinuity.passedOver.length, 0);
    const visibleProblem = blocks1.problemContinuity.visibleProblems[0];
    assert.strictEqual(visibleProblem.conditionKey, 'housing.hardshipHouseholds');

    // C107 pack previously displayed this exact problem
    ws.writeJson('output/cron-civic/packs/COUNCIL-D5_c107.json', {
      actor: { officeId: office.officeId, agentDir: office.agentDir },
      game: {
        board: blocks1.board,
        problemContinuity: { cycle: 107, visibleProblems: [visibleProblem] }
      }
    });

    // Without a closed ledger for C107, inaction is not assumed
    const blocks2 = civicSlice.buildGameBlocks({ root: ws.dir, cycle: 108, office, officeMap: { offices: [] }, hoods: ['East Oakland'], audit });
    assert.strictEqual(blocks2.problemContinuity.passedOver.length, 0);
    assert.strictEqual(blocks2.problemContinuity.available, false); // missing fold ledger

    // With an empty closed ledger for C107 (no moves made), problem is flagged passed over C107
    ws.writeJsonl('output/cron-civic/moves/moves_c107.jsonl', []);
    const blocks3 = civicSlice.buildGameBlocks({ root: ws.dir, cycle: 108, office, officeMap: { offices: [] }, hoods: ['East Oakland'], audit });
    assert.strictEqual(blocks3.problemContinuity.passedOver.length, 1);
    assert.match(blocks3.problemContinuity.text, /passed over C107/);

    // Landed work move in C107 on Coliseum initiative resolves the passed-over problem
    ws.writeJsonl('output/cron-civic/moves/moves_c107.jsonl', [{
      moveId: 'MV-107-work', cycle: 107, agentDir: office.agentDir, type: 'work',
      payload: { initiativeId: 'INIT-001' }, status: 'applied'
    }]);
    const blocks4 = civicSlice.buildGameBlocks({ root: ws.dir, cycle: 108, office, officeMap: { offices: [] }, hoods: ['East Oakland'], audit });
    assert.strictEqual(blocks4.problemContinuity.passedOver.length, 0);

    // Rent drop (counter condition cleared) also resolves it
    ws.writeJsonl('output/cron-civic/moves/moves_c107.jsonl', []);
    ws.writeJsonl('output/beats/Household_Ledger.jsonl', [{ ...household, MonthlyRent: 100 }]);
    const blocks5 = civicSlice.buildGameBlocks({ root: ws.dir, cycle: 108, office, officeMap: { offices: [] }, hoods: ['East Oakland'], audit });
    assert.strictEqual(blocks5.problemContinuity.passedOver.length, 0);
    assert.strictEqual(blocks5.problemContinuity.problems.length, 0);
  } finally {
    ws.cleanup();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 9: Task 4 Stage Minting, Requirements & Metric Evidence
// ─────────────────────────────────────────────────────────────────────────────

group('Group 9: Task 4 Stage Minting, Requirements & Metric Evidence');

test('T9.4: Live createInitiative enforces Stage=Proposed in object & serialized values and refuses headers missing Stage', () => {
  const seats = createInit.loadOfficeSeats();
  const syntheticSpec = {
    name: 'Synthetic Health Clinic',
    type: 'vote',
    policyDomain: 'health',
    affectedNeighborhoods: 'Downtown',
    proposingOffice: 'MAYOR-01',
    proposedCycle: 108,
    Stage: 'Delivering', // Attempt to override stage must be ignored
  };

  // 1. Default headers: stamps Proposed in row object and serialized values array
  const defaultMint = createInit.createInitiative({ seats, spec: syntheticSpec });
  assert.strictEqual(defaultMint.row.Stage, 'Proposed');
  assert.strictEqual(defaultMint.values[defaultMint.headers.indexOf('Stage')], 'Proposed');
  assert.strictEqual(defaultMint.values.length, createInit.TRACKER_HEADERS.length);

  // 2. Custom headers: Stage follows caller header position
  const customHeaders = ['Stage', ...createInit.TRACKER_HEADERS_31];
  const customMint = createInit.createInitiative({ headers: customHeaders, seats, spec: syntheticSpec });
  assert.strictEqual(customMint.values[0], 'Proposed');
  assert.strictEqual(customMint.row.Stage, 'Proposed');

  // 3. Absent Stage header: refuses loudly
  assert.throws(
    () => createInit.createInitiative({ headers: createInit.TRACKER_HEADERS_31, seats, spec: syntheticSpec }),
    /missing Stage header/
  );
});

test('T9.5: Live stageRequirement & boardNeedText enforce closing-Cycle equality boundary on Funded stage', () => {
  // Equality boundary: Funded clears when LastWorkCycle >= LastStageChangeCycle
  const fundedSameCycle = {
    Stage: 'Funded', ImplementationPhase: 'announced', PolicyDomain: 'health',
    LastWorkCycle: 108, LastStageChangeCycle: 108
  };
  const reqSame = phaseContract.stageRequirement({
    stage: fundedSameCycle.Stage, phase: fundedSameCycle.ImplementationPhase,
    policyDomain: fundedSameCycle.PolicyDomain, lastWorkCycle: fundedSameCycle.LastWorkCycle,
    lastStageChangeCycle: fundedSameCycle.LastStageChangeCycle
  });
  assert.strictEqual(reqSame.clears, true);
  assert.strictEqual(reqSame.next, 'Standing');
  assert.strictEqual(reqSame.text, 'Funded — work landed; it stands up next Cycle');
  assert.strictEqual(civicSlice.boardNeedText(fundedSameCycle), reqSame.text);

  // Prior cycle work does not clear Funded
  const fundedOldWork = { ...fundedSameCycle, LastWorkCycle: 107, LastStageChangeCycle: 108 };
  const reqOld = phaseContract.stageRequirement({
    stage: fundedOldWork.Stage, phase: fundedOldWork.ImplementationPhase,
    policyDomain: fundedOldWork.PolicyDomain, lastWorkCycle: fundedOldWork.LastWorkCycle,
    lastStageChangeCycle: fundedOldWork.LastStageChangeCycle
  });
  assert.strictEqual(reqOld.clears, false);
  assert.strictEqual(reqOld.text, 'Funded — one work move stands it up');
  assert.strictEqual(civicSlice.boardNeedText(fundedOldWork), reqOld.text);

  // Missing or blank work cycle does not clear Funded
  const fundedNoWork = { ...fundedSameCycle, LastWorkCycle: '', LastStageChangeCycle: 108 };
  const reqNoWork = phaseContract.stageRequirement({
    stage: fundedNoWork.Stage, phase: fundedNoWork.ImplementationPhase,
    policyDomain: fundedNoWork.PolicyDomain, lastWorkCycle: fundedNoWork.LastWorkCycle,
    lastStageChangeCycle: fundedNoWork.LastStageChangeCycle
  });
  assert.strictEqual(reqNoWork.clears, false);
  assert.strictEqual(reqNoWork.text, 'Funded — one work move stands it up');
});

test('T9.6: Live stageRequirement & boardNeedText distinguish stalled revival from unrecoverable blocked/suspended/defunded phases and unplayable domains', () => {
  // Stalled phase allows generic revival via work move
  const stalled = { Stage: 'Funded', ImplementationPhase: 'stalled' };
  const reqStalled = phaseContract.stageRequirement({ stage: 'Funded', phase: 'stalled' });
  assert.strictEqual(reqStalled.clears, false);
  assert.strictEqual(reqStalled.blocked, 'stalled');
  assert.strictEqual(reqStalled.moveThatClears, 'work');
  assert.strictEqual(reqStalled.text, 'stalled — one work move revives it');
  assert.strictEqual(civicSlice.boardNeedText(stalled), 'stalled — one work move revives it');

  // Negative unrecoverable phases have no generic revival
  for (const phase of ['blocked', 'suspended', 'defunded']) {
    const row = { Stage: 'Funded', ImplementationPhase: phase };
    const req = phaseContract.stageRequirement({ stage: 'Funded', phase });
    assert.strictEqual(req.clears, false);
    assert.strictEqual(req.blocked, phase);
    assert.strictEqual(req.text, `${phase} — no seat move revives it`);
    assert.strictEqual(civicSlice.boardNeedText(row), req.text);
  }

  // Refused domains have no delivering gate from Standing. housing dropped
  // (flipped playable:true, engine.251, 2026-09-22) — it has a real gate now.
  for (const domain of ['safety', 'economic', 'workforce', 'sports']) {
    const row = { Stage: 'Standing', ImplementationPhase: 'operational', PolicyDomain: domain };
    const req = phaseContract.stageRequirement({ stage: row.Stage, phase: row.ImplementationPhase, policyDomain: domain });
    assert.strictEqual(req.clears, false);
    assert.strictEqual(req.blocked, 'no-delivering-gate');
    assert.strictEqual(req.text, 'Standing — no delivering gate exists for this domain yet');
    assert.strictEqual(civicSlice.boardNeedText(row), req.text);
  }
});

test('T9.7: Live measureStageMovement detects incomplete hold windows and broken consecutive hold streaks', () => {
  const hoods = ['West Oakland', 'East Oakland', 'Downtown'];
  const audit = cycle => ({
    cycle,
    snapshots: {
      Neighborhood_Map: hoods.map(Neighborhood => ({ Neighborhood, ChildAreas: '', Cycle: cycle })),
      Neighborhood_Demographics: hoods.map((Neighborhood, i) => ({
        Neighborhood, LastUpdated: cycle, Sick: i === 0 ? 5 : 10
      }))
    }
  });

  const validBaseline = {
    v: 1, origin: 'conversion', cycle: 105, tab: 'Neighborhood_Demographics',
    columns: ['Sick'], scope: 'hood',
    keys: { 'West Oakland': { Sick: 10 } },
    cityMiddle: { Sick: 10 }
  };

  const row = {
    InitiativeID: 'INIT-001', Stage: 'Standing', ImplementationPhase: 'operational',
    PolicyDomain: 'health', AffectedNeighborhoods: 'West Oakland',
    StageBaseline: JSON.stringify(validBaseline)
  };

  // Baseline at 105 with hold 3: requires C106, C107, C108. At cycle 108: cycle - hold + 1 = 108 - 3 + 1 = 106 > 105 -> window available!
  const contextPass = { cycle: 108, readAudit: audit, config: { civicDeliverMargin: 0.2, civicDeliverHoldCycles: 3 } };
  const passRes = civicStageEvidence.measureStageMovement(row, contextPass);
  assert.strictEqual(passRes.available, true);
  assert.strictEqual(passRes.metricMoved, true);

  // Incomplete hold window: observation at cycle 106 with hold 3 requires C104..C106, but baseline was cycle 105!
  // 106 - 3 + 1 = 104 <= baselineCycle (105) -> post-baseline hold window unavailable
  const contextIncomplete = { cycle: 106, readAudit: audit, config: { civicDeliverMargin: 0.2, civicDeliverHoldCycles: 3 } };
  const incompRes = civicStageEvidence.measureStageMovement(row, contextIncomplete);
  assert.strictEqual(incompRes.available, false);
  assert.match(incompRes.reason, /post-baseline hold window unavailable/);

  // Broken consecutive hold streak: one observation in hold window drops below margin
  const brokenAudit = c => {
    const a = audit(c);
    if (c === 107) a.snapshots.Neighborhood_Demographics[0].Sick = 9.5; // (10/10) - (9.5/10) = 0.05 < 0.20 margin
    return a;
  };
  const contextBroken = { cycle: 108, readAudit: brokenAudit, config: { civicDeliverMargin: 0.2, civicDeliverHoldCycles: 3 } };
  const brokenRes = civicStageEvidence.measureStageMovement(row, contextBroken);
  assert.strictEqual(brokenRes.available, true);
  assert.strictEqual(brokenRes.metricMoved, false);
});

test('T9.8: Live measureStageMovement fails closed on missing World_Config, stale audits, and corrupted baselines', () => {
  const hoods = ['West Oakland', 'East Oakland'];
  const audit = cycle => ({
    cycle,
    snapshots: {
      Neighborhood_Map: hoods.map(Neighborhood => ({
        Neighborhood, ChildAreas: '', Cycle: cycle
      })),
      Neighborhood_Demographics: hoods.map(Neighborhood => ({ Neighborhood, LastUpdated: cycle, Sick: 5 }))
    }
  });

  const baseRow = {
    InitiativeID: 'INIT-001', Stage: 'Standing', ImplementationPhase: 'operational',
    PolicyDomain: 'health', AffectedNeighborhoods: 'West Oakland',
    StageBaseline: JSON.stringify({
      v: 1, origin: 'conversion', cycle: 104, tab: 'Neighborhood_Demographics',
      columns: ['Sick'], scope: 'hood',
      keys: { 'West Oakland': { Sick: 10 } },
      cityMiddle: { Sick: 10 }
    })
  };

  const validContext = { cycle: 108, readAudit: audit, config: { civicDeliverMargin: 0.2, civicDeliverHoldCycles: 3 } };

  // 1. Missing World_Config
  const noConfig = civicStageEvidence.measureStageMovement(baseRow, { ...validContext, config: null });
  assert.strictEqual(noConfig.available, false);
  assert.match(noConfig.reason, /current World_Config dump unavailable/);

  // 2. Missing delivery margin
  const noMargin = civicStageEvidence.measureStageMovement(baseRow, { ...validContext, config: { civicDeliverHoldCycles: 3 } });
  assert.strictEqual(noMargin.available, false);
  assert.match(noMargin.reason, /civicDeliverMargin missing\/invalid/);

  // 3. Stale audit observation (cycle mismatch)
  const staleAuditContext = {
    ...validContext,
    readAudit: c => ({ ...audit(c), cycle: c - 1 })
  };
  const staleRes = civicStageEvidence.measureStageMovement(baseRow, staleAuditContext);
  assert.strictEqual(staleRes.available, false);
  assert.match(staleRes.reason, /unavailable\/stale/);

  // 4. Missing snapshots tab in audit (Neighborhood_Map missing vs metric tab missing vs metric column missing)
  const missingMapContext = {
    ...validContext,
    readAudit: c => ({ cycle: c, snapshots: {} })
  };
  const noMapRes = civicStageEvidence.measureStageMovement(baseRow, missingMapContext);
  assert.strictEqual(noMapRes.available, false);
  assert.match(noMapRes.reason, /Neighborhood_Map snapshot is required/);

  // For domain whose metric tab != Neighborhood_Map (e.g. health -> Neighborhood_Demographics)
  const healthRow = {
    InitiativeID: 'INIT-002', Stage: 'Standing', ImplementationPhase: 'operational',
    PolicyDomain: 'health', AffectedNeighborhoods: 'West Oakland',
    StageBaseline: JSON.stringify({
      v: 1, origin: 'conversion', cycle: 104, tab: 'Neighborhood_Demographics',
      columns: ['Sick'], scope: 'hood',
      keys: { 'West Oakland': { Sick: 10 } },
      cityMiddle: { Sick: 10 }
    })
  };
  const missingHealthTabContext = {
    ...validContext,
    readAudit: c => ({
      cycle: c,
      snapshots: {
        Neighborhood_Map: hoods.map(Neighborhood => ({ Neighborhood, ChildAreas: '', Cycle: c }))
      }
    })
  };
  const noHealthTabRes = civicStageEvidence.measureStageMovement(healthRow, missingHealthTabContext);
  assert.strictEqual(noHealthTabRes.available, false);
  assert.match(noHealthTabRes.reason, /Neighborhood_Demographics observation unavailable/);

  const missingMetricColContext = {
    ...validContext,
    readAudit: c => ({
      cycle: c,
      snapshots: {
        Neighborhood_Map: hoods.map(Neighborhood => ({ Neighborhood, ChildAreas: '', Cycle: c })),
        Neighborhood_Demographics: hoods.map(Neighborhood => ({ Neighborhood, LastUpdated: c }))
      }
    })
  };
  const noMetricColRes = civicStageEvidence.measureStageMovement(baseRow, missingMetricColContext);
  assert.strictEqual(noMetricColRes.available, false);
  assert.match(noMetricColRes.reason, /Sick missing\/invalid/);

  // 5. Corrupted StageBaseline JSON vs unsupported schema
  const corruptBaseRow = { ...baseRow, StageBaseline: '{corrupt json' };
  const corruptRes = civicStageEvidence.measureStageMovement(corruptBaseRow, validContext);
  assert.strictEqual(corruptRes.available, false);
  assert.match(corruptRes.reason, /StageBaseline missing\/malformed/);

  const badSchemaRow = { ...baseRow, StageBaseline: JSON.stringify({ v: 2 }) };
  const badSchemaRes = civicStageEvidence.measureStageMovement(badSchemaRow, validContext);
  assert.strictEqual(badSchemaRes.available, false);
  assert.match(badSchemaRes.reason, /baseline descriptor unavailable\/unsupported/);

  // Verify board integration carries metric evidence unavailability into needsNext text
  const boardRow = civicSlice.boardRowsFor({ officeId: 'MAYOR-01' }, [baseRow], {}, { ...validContext, config: null })[0];
  assert.strictEqual(boardRow.metricEvidence.available, false);
  assert.strictEqual(boardRow.requirement.clears, false);
  assert.match(boardRow.needsNext, /metric evidence unavailable: current World_Config dump unavailable/);
});
console.log('\n======================================================');
console.log(`Test Results: ${totalPassed} passed, ${totalFailed} failed (total: ${totalPassed + totalFailed})`);
if (totalFailed > 0) {
  console.error('\nFailures summary:');
  for (const f of failures) {
    console.error(`  - ${f.name}: ${f.error.message}`);
  }
}
console.log('======================================================\n');

process.exit(totalFailed === 0 ? 0 : 1);
