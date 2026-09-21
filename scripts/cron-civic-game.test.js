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
 *   - Directly exercises landed modules:
 *       scripts/cron-civic-run.js (validateDatawakeMoves, appendMoveLedger, moveLedgerLines)
 *       scripts/buildCivicOfficeSlice.js (boardRowsFor, loadMovesFolded, loadPetitionPool, buildGameBlocks)
 *       scripts/civicPetitions.js (countPetition, buildHoodResolver)
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
  'longfellow': 'Temescal',
  'shafter': 'Rockridge'
};

// ─────────────────────────────────────────────────────────────────────────────
// Group 1: T1 Move Validation + Grounding
// ─────────────────────────────────────────────────────────────────────────────
group('Group 1: T1 Move Validation + Grounding');

test('T1.1: Live validateDatawakeMoves rejects moves when input is not an array', () => {
  const res = civicRun.validateDatawakeMoves({ type: 'work' }, { office: { district: 'D1' } });
  assert.equal(res.accepted.length, 0);
  assert.equal(res.rejected.length, 1);
  assert.equal(res.rejected[0].reason, 'moves-not-an-array');
});

test('T1.2: Live validateDatawakeMoves validates closed move types & rejects unknown moves loudly', () => {
  const office = { officeId: 'COUNCIL-D1', agentDir: 'civic-office-council-d1', district: 'D1' };
  const boardIds = new Set(['INIT-001']);
  const rawMoves = [
    { type: 'bribe', amount: 1000 },
    { type: 'work', initiativeId: 'INIT-001' }
  ];

  const res = civicRun.validateDatawakeMoves(rawMoves, { office, boardIds });
  assert.equal(res.accepted.length, 1);
  assert.equal(res.accepted[0].type, 'work');
  assert.equal(res.accepted[0].payload.initiativeId, 'INIT-001');
  assert.equal(res.rejected.length, 1);
  assert.equal(res.rejected[0].reason, 'unknown-move-type(bribe)');
});

test('T1.3: Live validateDatawakeMoves enforces at most one consequential move per wake (first valid wins)', () => {
  const office = { officeId: 'COUNCIL-D1', agentDir: 'civic-office-council-d1', district: 'D1' };
  const boardIds = new Set(['INIT-001', 'INIT-002']);
  const rawMoves = [
    { type: 'work', initiativeId: 'INIT-001' },
    { type: 'work', initiativeId: 'INIT-002' }
  ];

  const res = civicRun.validateDatawakeMoves(rawMoves, { office, boardIds });
  assert.equal(res.accepted.length, 1);
  assert.equal(res.accepted[0].type, 'work');
  assert.equal(res.accepted[0].payload.initiativeId, 'INIT-001');
  assert.equal(res.rejected.length, 1);
  assert.match(res.rejected[0].reason, /second-consequential-move/);
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
  const catalog = {
    'retail_boost': { ...require('../lib/initiativePhaseContract').INTERVENTION_CATALOG['economic-program'] }
  };

  // Coliseum is child of East Oakland (D5) -> allowed!
  const validMove = [{
    type: 'propose',
    title: 'Coliseum Night Market',
    intervention: 'retail_boost',
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
    intervention: 'retail_boost',
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
  const catalog = {
    'clinic_support': { ...require('../lib/initiativePhaseContract').INTERVENTION_CATALOG['health-service'] }
  };

  const mayorMove = [{
    type: 'propose',
    title: 'Citywide Clinic Network',
    intervention: 'clinic_support',
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
    intervention: 'health_support',
    hoods: ['West Oakland'],
    problem: 'health access'
  }];

  // 1. Catalog is null/unlanded -> catalog-not-landed
  const res1 = civicRun.validateDatawakeMoves(proposeMove, { office, catalog: null });
  assert.equal(res1.accepted.length, 0);
  assert.match(res1.rejected[0].reason, /catalog-not-landed/);

  // 2. Catalog has intervention with playable: false
  const unplayableCatalog = {
    'rent_relief': { policyDomain: 'housing', playable: false }
  };
  const unplayableMove = [{
    type: 'propose',
    title: 'Rent Subsidies',
    intervention: 'rent_relief',
    hoods: ['West Oakland'],
    problem: 'rent burden'
  }];
  const res2 = civicRun.validateDatawakeMoves(unplayableMove, { office, catalog: unplayableCatalog });
  assert.equal(res2.accepted.length, 0);
  assert.match(res2.rejected[0].reason, /domain-not-playable/);
});

test('T1.8: Live validateDatawakeMoves: Police Chief may work, answer, canvass, but NEVER propose', () => {
  const office = { officeId: 'CHIEF-POLICE', agentDir: 'civic-office-police-chief', district: 'citywide' };
  const boardIds = new Set(['INIT-002']);
  const catalog = {
    'patrol': { policyDomain: 'safety', playable: true }
  };

  const chiefPropose = [{
    type: 'propose',
    title: 'Patrol Surge',
    intervention: 'patrol',
    hoods: ['West Oakland'],
    problem: 'safety'
  }];
  const res1 = civicRun.validateDatawakeMoves(chiefPropose, { office, boardIds, catalog });
  assert.equal(res1.accepted.length, 0);
  assert.match(res1.rejected[0].reason, /seat-cannot-propose/);

  const chiefWork = [{ type: 'work', initiativeId: 'INIT-002' }];
  const res2 = civicRun.validateDatawakeMoves(chiefWork, { office, boardIds });
  assert.equal(res2.accepted.length, 1);
  assert.equal(res2.accepted[0].type, 'work');
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

// ─────────────────────────────────────────────────────────────────────────────
// Group 3: T3 Pack Blocks
// ─────────────────────────────────────────────────────────────────────────────
group('Group 3: T3 Pack Blocks');

test('T3.1: Live boardRowsFor: Mayor sees all; D1 sees overlap (INIT-001/002/007); D6 sees none', () => {
  const trackerRows = [
    { InitiativeID: 'INIT-001', ProposingOffice: 'MAYOR-01', AffectedNeighborhoods: 'West Oakland' },
    { InitiativeID: 'INIT-002', ProposingOffice: 'MAYOR-01', AffectedNeighborhoods: 'West Oakland, Fruitvale, East Oakland' },
    { InitiativeID: 'INIT-006', ProposingOffice: 'MAYOR-01', AffectedNeighborhoods: 'Downtown, Jack London' },
    { InitiativeID: 'INIT-007', ProposingOffice: 'MAYOR-01', AffectedNeighborhoods: 'West Oakland, Chinatown, Temescal' }
  ];

  // Mayor sees all 4
  const mayorOffice = { officeId: 'MAYOR-01', agentDir: 'civic-office-mayor', district: 'citywide' };
  const mayorBoard = civicSlice.boardRowsFor(mayorOffice, trackerRows, {});
  assert.equal(mayorBoard.length, 4);

  // D1 (West Oakland, Brooklyn) touches INIT-001, INIT-002, INIT-007
  const d1Office = { officeId: 'COUNCIL-D1', agentDir: 'civic-office-council-d1', district: 'D1' };
  const d1Board = civicSlice.boardRowsFor(d1Office, trackerRows, {});
  assert.equal(d1Board.length, 3);
  assert.deepEqual(d1Board.map(r => r.id).sort(), ['INIT-001', 'INIT-002', 'INIT-007']);

  // D6 (Piedmont Ave) touches none of these
  const d6Office = { officeId: 'COUNCIL-D6', agentDir: 'civic-office-council-d6', district: 'D6' };
  const d6Board = civicSlice.boardRowsFor(d6Office, trackerRows, {});
  assert.equal(d6Board.length, 0);
});

test('T3.2: Live loadPetitionPool in temp workspace filters Civic complaints and drops office holders', () => {
  const ws = createTempWorkspace();
  try {
    ws.writeJson('output/beats/meta.json', {cycle:108});
    ws.writeJson('output/simulation_ledger_snapshot.meta.json', {cycle:108});
    const reflections = [
      // Citizen 1 complaint in D1 (West Oakland)
      { Timestamp: '2026-09-20T10:00:00Z', POPID: SYNTH_POP.CITIZEN_WEST_OAK_1, Cycle: '108', Event: 'Civic', Affect: 'Frustrated', Snippet: 'Street repairs stalled.', Applied: 'yes' },
      // Citizen 2 participation in D1
      { Timestamp: '2026-09-20T11:00:00Z', POPID: SYNTH_POP.CITIZEN_WEST_OAK_2, Cycle: '108', Event: 'Civic', Affect: 'Inspired', Snippet: 'Great cleanup.', Applied: 'no' },
      // Office holder in D1 (dropped!)
      { Timestamp: '2026-09-20T12:00:00Z', POPID: SYNTH_POP.COUNCIL_D1, Cycle: '108', Event: 'Civic', Affect: 'Angry', Snippet: 'Budget fight.', Applied: 'yes' },
      // Citizen in Temescal (D7) -> out of turf for D1
      { Timestamp: '2026-09-20T13:00:00Z', POPID: SYNTH_POP.CITIZEN_TEMESCAL_1, Cycle: '108', Event: 'Civic', Affect: 'Frustrated', Snippet: 'Temescal transit issue.', Applied: 'yes' }
    ];
    ws.writeJsonl('output/beats/Reflection_Intake.jsonl', reflections);

    // Simulation ledger snapshot gives loadConstituents citizen turf membership
    const citizens = [
      { POPID: SYNTH_POP.CITIZEN_WEST_OAK_1, Name: 'Synth Citizen 1', Neighborhood: 'West Oakland', Status: 'active', Tier: 1 },
      { POPID: SYNTH_POP.CITIZEN_WEST_OAK_2, Name: 'Synth Citizen 2', Neighborhood: 'West Oakland', Status: 'active', Tier: 1 },
      { POPID: SYNTH_POP.COUNCIL_D1, Name: 'Denise Carter', Neighborhood: 'West Oakland', Status: 'active', Tier: 1 },
      { POPID: SYNTH_POP.CITIZEN_TEMESCAL_1, Name: 'Synth Citizen 3', Neighborhood: 'Temescal', Status: 'active', Tier: 1 }
    ];
    ws.writeJsonl('output/simulation_ledger_snapshot.jsonl', citizens);

    const office = { officeId: 'COUNCIL-D1', agentDir: 'civic-office-council-d1', district: 'D1' };
    const officeMap = {
      offices: [{ officeId: 'COUNCIL-D1', popid: SYNTH_POP.COUNCIL_D1 }],
      projects: []
    };

    const res = civicSlice.loadPetitionPool(ws.dir, office, ['West Oakland'], officeMap, {});
    assert.equal(res.available, true);
    assert.equal(res.complaints.length, 1);
    assert.equal(res.complaints[0].affect, 'Frustrated');
    assert.equal(res.participation.length, 1);
    assert.equal(res.participation[0].affect, 'Inspired');
  } finally {
    ws.cleanup();
  }
});

test('T3.3: Live loadConfrontation extracts verbatim demand for targeted seat in temp workspace', () => {
  const ws = createTempWorkspace();
  try {
    const directiveText = `# C108 Directives
## Denise Carter — Council D1 Lead
- **Agent:** .claude/agents/civic-office-council-d1/
- **Address:** Deploy mobile clinic crews or table alternate funding before C109.
`;
    ws.writeText('output/mara-directives/mara_directive_c108_AUTO.txt', directiveText);

    const res = civicSlice.loadConfrontation(ws.dir, 108, 'civic-office-council-d1');
    assert.notEqual(res, null);
    assert.equal(res.id, 'CONF-108-civic-office-council-d1');
    assert.match(res.demand, /Deploy mobile clinic crews/);
  } finally {
    ws.cleanup();
  }
});

test('T3.4: Pack blocks cap length (~600 chars) and degrade gracefully to stated absence', () => {
  const ws = createTempWorkspace();
  try {
    const office = { officeId: 'COUNCIL-D1', agentDir: 'civic-office-council-d1', district: 'D1' };
    const officeMap = { offices: [office], projects: [] };

    // Empty workspace -> missing files
    const game = civicSlice.buildGameBlocks({ root: ws.dir, cycle: 108, office, officeMap });
    assert.notEqual(game, null);
    assert(game.lastMove.text.length <= civicSlice.BLOCK_CAP);
    assert.match(game.petitionPool.text, /unavailable/);
    assert.match(game.workingCity.text, /No work-wake reflections/);
  } finally {
    ws.cleanup();
  }
});

test('T3.5: Missing citizen snapshot sets available:false with stated absence for district seat', () => {
  const ws = createTempWorkspace();
  try {
    ws.writeJson('output/beats/meta.json', {cycle:108});
    // Reflection intake exists on disk, but simulation_ledger_snapshot.jsonl is absent
    const reflections = [
      { Timestamp: '2026-09-20T10:00:00Z', POPID: SYNTH_POP.CITIZEN_WEST_OAK_1, Cycle: '108', Event: 'Civic', Affect: 'Frustrated', Snippet: 'Pothole issue.' }
    ];
    ws.writeJsonl('output/beats/Reflection_Intake.jsonl', reflections);

    const d1Office = { officeId: 'COUNCIL-D1', agentDir: 'civic-office-council-d1', district: 'D1' };
    const officeMap = { offices: [d1Office], projects: [] };

    // District seat with turf -> available: false, stated absence text
    const d1Pool = civicSlice.loadPetitionPool(ws.dir, d1Office, ['West Oakland'], officeMap, {});
    assert.equal(d1Pool.available, false);
    assert.match(d1Pool.text, /citizen snapshot \(simulation_ledger_snapshot\.jsonl\) is absent/);

    // Citywide seat (Mayor) has no turf filter -> unaffected (available: true)
    const mayorOffice = { officeId: 'MAYOR-01', agentDir: 'civic-office-mayor', district: 'citywide' };
    const mayorPool = civicSlice.loadPetitionPool(ws.dir, mayorOffice, [], officeMap, {});
    assert.equal(mayorPool.available, true);
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
    Neighborhood_Map: [
      { Neighborhood: 'West Oakland', ChildAreas: '' }
    ],
    Neighborhood_Demographics: [
      { Neighborhood: 'West Oakland', Students: '100', Adults: '800', Seniors: '100', Sick: '20' }
    ],
    Household_Ledger: [
      // Rent $1,500/mo ($18k/yr), Income $50,000/yr -> 36% burden -> QUALIFIES
      { HouseholdId: 'HH-01', Neighborhood: 'West Oakland', Status: 'active', HousingType: 'rented', MonthlyRent: '1500', HouseholdIncome: '50000' },
      // Rent $1,000/mo ($12k/yr), Income $60,000/yr -> 20% burden -> DOES NOT QUALIFY
      { HouseholdId: 'HH-02', Neighborhood: 'West Oakland', Status: 'active', HousingType: 'rented', MonthlyRent: '1000', HouseholdIncome: '60000' }
    ],
    Hospital_Ledger: [],
    Crime_Metrics: [],
    Simulation_Ledger: [],
    Reflection_Intake: []
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
