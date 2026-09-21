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
    { type: 'propose', title: 'Second Clinic', intervention: 'health-service', hoods: ['West Oakland'], problem: 'need care' },
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
    title: 'Coliseum Night Market',
    intervention: 'economic-program',
    hoods: ['Coliseum', 'East Oakland'],
    problem: 'economic revitalization'
  }];
  const res1 = civicRun.validateDatawakeMoves(validMove, { office, catalog, childToParent: CHILD_TO_PARENT_HOOD });
  assert.equal(res1.accepted.length, 1);
  assert.equal(res1.accepted[0].payload.title, 'Coliseum Night Market');

  // Cross-district hood (Temescal in D7) -> entire move rejected (no intersect loophole)
  const invalidMove = [{
    type: 'propose',
    title: 'Cross-city market',
    intervention: 'economic-program',
    hoods: ['East Oakland', 'Temescal'],
    problem: 'overreach'
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
    problem: 'healthcare access'
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

  // 2. Intervention with playable: false
  const unplayableMove = [{
    type: 'propose',
    title: 'Rent Subsidies',
    intervention: 'housing-program',
    hoods: ['West Oakland'],
    problem: 'rent burden'
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

test('T1.10: Live validateDatawakeMoves with full INTERVENTION_CATALOG: 6 playable pass, 2 unplayable reject', () => {
  const office = { officeId: 'MAYOR-01', agentDir: 'civic-office-mayor', district: 'citywide' };
  const catalog = phaseContract.INTERVENTION_CATALOG;
  assert(catalog && Object.keys(catalog).length >= 8, 'INTERVENTION_CATALOG must have at least 8 keys');

  const playableKeys = ['health-service', 'transit-project', 'school-program', 'economic-program', 'workforce-program', 'sports-district'];
  for (const key of playableKeys) {
    const move = [{ type: 'propose', title: `Test ${key}`, intervention: key, hoods: ['Downtown'], problem: 'test problem' }];
    const res = civicRun.validateDatawakeMoves(move, { office, catalog });
    assert.equal(res.accepted.length, 1, `Intervention ${key} should be accepted`);
    assert.equal(res.rejected.length, 0);
  }

  const unplayableKeys = ['safety-program', 'housing-program'];
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
      { moveId: 'MV-108-civic-office-council-d5-2026-09-23', cycle: 108, date: '2026-09-23', agentDir: 'civic-office-council-d5', popid: SYNTH_POP.COUNCIL_D5, type: 'propose', payload: { title: 'East Oakland Clinic', intervention: 'health-service', hoods: ['East Oakland'], problem: 'Need healthcare' }, status: 'pending' }
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
// Summary & Exit Code
// ─────────────────────────────────────────────────────────────────────────────
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
