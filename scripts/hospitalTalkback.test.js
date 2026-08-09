#!/usr/bin/env node
'use strict';

/**
 * Run: node scripts/hospitalTalkback.test.js
 *
 * Purpose: Node proof test for engine.102 Task 7 ("W4 — hospital talk-back +
 * Cause fix", acceptance criterion 5). Verifies that new hospital admissions
 * carry a populated Cause, existing open rows have blank Cause backfilled only
 * when no cause is already present, ghost beds are reconciled against the
 * Simulation_Ledger, and the hospital census feeds the next World_Population
 * illness computation via configured baseCapacity/loadPerSick/talkbackGain.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passed = 0;
let failed = 0;

function assert(label, cond, detail) {
  if (cond) {
    passed++;
    console.log('ok ' + label);
  } else {
    failed++;
    console.log('FAIL ' + label + ': ' + (detail || 'condition false'));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VM sandbox: load engine files without module.exports
// ═══════════════════════════════════════════════════════════════════════════
const logs = [];
const sandbox = {
  Logger: {
    log: function(message) {
      logs.push(String(message));
    },
  },
  // Minimal mock for the safeRand_ dependency in applyDemographicDrift_.
  safeRand_: function(ctx) {
    return (ctx && typeof ctx.rng === 'function') ? ctx.rng : function() { return 0.6; };
  },
};

vm.createContext(sandbox);

const buildCyclePacketPath = path.join(__dirname, '..', 'phase10-persistence', 'buildCyclePacket.js');
vm.runInContext(fs.readFileSync(buildCyclePacketPath, 'utf8'), sandbox, { filename: buildCyclePacketPath });

const applyDemographicDriftPath = path.join(__dirname, '..', 'phase03-population', 'applyDemographicDrift.js');
vm.runInContext(fs.readFileSync(applyDemographicDriftPath, 'utf8'), sandbox, { filename: applyDemographicDriftPath });

const generationalEventsPath = path.join(__dirname, '..', 'phase04-events', 'generationalEventsEngine.js');
vm.runInContext(fs.readFileSync(generationalEventsPath, 'utf8'), sandbox, { filename: generationalEventsPath });

const persistHospitalLedger_ = sandbox.persistHospitalLedger_;
const applyDemographicDrift_ = sandbox.applyDemographicDrift_;
const buildAdmissionCause_ = sandbox.buildAdmissionCause_;

assert('persistHospitalLedger_ loaded', typeof persistHospitalLedger_ === 'function');
assert('applyDemographicDrift_ loaded', typeof applyDemographicDrift_ === 'function');
assert('buildAdmissionCause_ loaded', typeof buildAdmissionCause_ === 'function');

// ═══════════════════════════════════════════════════════════════════════════
// Mock helpers
// ═══════════════════════════════════════════════════════════════════════════
function makeSheet(name, rows) {
  const calls = [];
  function getRange(r, c, numRows, numCols) {
    return {
      setValues: function(vals) {
        calls.push({ op: 'setValues', r: r, c: c, vals: vals });
        for (let i = 0; i < vals.length; i++) {
          for (let j = 0; j < vals[i].length; j++) {
            rows[r - 1 + i][c - 1 + j] = vals[i][j];
          }
        }
      },
      setValue: function(v) {
        calls.push({ op: 'setValue', r: r, c: c, v: v });
        rows[r - 1][c - 1] = v;
      },
    };
  }
  return {
    getName: function() { return name; },
    getDataRange: function() { return { getValues: function() { return rows.map(function(r) { return r.slice(); }); } }; },
    getRange: getRange,
    appendRow: function(row) {
      calls.push({ op: 'appendRow', row: row });
      rows.push(row.slice());
    },
    insertSheet: function() { return makeSheet(name, rows); },
    setFrozenRows: function() {},
    calls: calls,
  };
}

function makeSS(sheets) {
  return {
    getSheetByName: function(n) { return sheets[n] || null; },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Test A: new admission row gets its Cause written (not blank)
// ═══════════════════════════════════════════════════════════════════════════
(function testNewAdmissionCause() {
  const headers = ['AdmissionId', 'POPID', 'Name', 'Neighborhood', 'Cause',
    'AdmitCycle', 'StatusNow', 'LastTransitionCycle', 'DischargeCycle', 'Outcome', 'CyclesInCare'];
  const rows = [headers];
  const sheets = { Hospital_Ledger: makeSheet('Hospital_Ledger', rows) };
  const ctx = {
    ss: makeSS(sheets),
    summary: {
      absoluteCycle: 105,
      hospitalEvents: [
        { popId: 'POP-A-001', to: 'hospitalized', cycle: 105, cause: 'severe seasonal flu',
          name: 'Alice', neighborhood: 'Downtown' },
      ],
    },
  };

  persistHospitalLedger_(ctx);

  assert('A: one row appended', rows.length === 2, 'expected 2 rows, got ' + rows.length);
  const appended = rows[1];
  assert('A: Cause is populated',
    appended[4] === 'severe seasonal flu',
    'expected cause "severe seasonal flu", got "' + appended[4] + '"');
  assert('A: AdmitCycle matches event cycle',
    appended[5] === 105,
    'expected AdmitCycle 105, got ' + appended[5]);
})();

// ═══════════════════════════════════════════════════════════════════════════
// Test B: blank Cause backfilled; existing Cause not overwritten
// ═══════════════════════════════════════════════════════════════════════════
(function testCauseBackfill() {
  const headers = ['AdmissionId', 'POPID', 'Name', 'Neighborhood', 'Cause',
    'AdmitCycle', 'StatusNow', 'LastTransitionCycle', 'DischargeCycle', 'Outcome', 'CyclesInCare'];
  const rows = [
    headers,
    ['H-C99-001', 'POP-B-001', 'Alice', 'Downtown', '', 99, 'hospitalized', 99, '', '', ''],
    ['H-C99-002', 'POP-B-002', 'Bob', 'Uptown', 'existing cause', 99, 'critical', 99, '', '', ''],
  ];
  const sheets = { Hospital_Ledger: makeSheet('Hospital_Ledger', rows) };
  const ctx = {
    ss: makeSS(sheets),
    summary: {
      absoluteCycle: 100,
      hospitalEvents: [
        { popId: 'POP-B-001', to: 'critical', cycle: 100, cause: 'pneumonia' },
        { popId: 'POP-B-002', to: 'critical', cycle: 100, cause: 'new cause' },
      ],
    },
  };

  persistHospitalLedger_(ctx);

  assert('B: blank Cause backfilled',
    rows[1][4] === 'pneumonia',
    'expected "pneumonia", got "' + rows[1][4] + '"');
  assert('B: existing Cause preserved',
    rows[2][4] === 'existing cause',
    'expected "existing cause", got "' + rows[2][4] + '"');
})();

// ═══════════════════════════════════════════════════════════════════════════
// Test C: ghost-bed reconcile against Simulation_Ledger Status
// ═══════════════════════════════════════════════════════════════════════════
(function testGhostReconcile() {
  const headers = ['AdmissionId', 'POPID', 'Name', 'Neighborhood', 'Cause',
    'AdmitCycle', 'StatusNow', 'LastTransitionCycle', 'DischargeCycle', 'Outcome', 'CyclesInCare'];
  const rows = [
    headers,
    ['H-C99-001', 'POP-C-001', 'Active Alice', 'Downtown', 'flu', 99, 'hospitalized', 99, '', '', ''],
    ['H-C99-002', 'POP-C-002', 'Dead Dan', 'Uptown', 'flu', 99, 'hospitalized', 99, '', '', ''],
    ['H-C99-003', 'POP-C-003', 'Still Sick', 'West', 'flu', 99, 'hospitalized', 99, '', '', ''],
    ['H-C99-004', 'POP-C-UNKNOWN', 'Unknown', 'East', 'flu', 99, 'hospitalized', 99, '', '', ''],
  ];
  const sheets = { Hospital_Ledger: makeSheet('Hospital_Ledger', rows) };
  const ctx = {
    ss: makeSS(sheets),
    summary: {
      absoluteCycle: 102,
      hospitalEvents: [],
    },
    ledger: {
      headers: ['POPID', 'Status'],
      rows: [
        ['POP-C-001', 'active'],
        ['POP-C-002', 'deceased'],
        ['POP-C-003', 'hospitalized'],
      ],
    },
  };

  const census = persistHospitalLedger_(ctx);

  assert('C: active citizen released recovered-reconciled',
    rows[1][8] === 102 && rows[1][9] === 'recovered-reconciled',
    'DischargeCycle=' + rows[1][8] + ' Outcome=' + rows[1][9]);
  assert('C: deceased citizen released deceased-reconciled',
    rows[2][8] === 102 && rows[2][9] === 'deceased-reconciled',
    'DischargeCycle=' + rows[2][8] + ' Outcome=' + rows[2][9]);
  assert('C: hospitalized citizen stays open',
    rows[3][8] === '' && rows[3][9] === '',
    'DischargeCycle=' + rows[3][8] + ' Outcome=' + rows[3][9]);
  assert('C: unknown POPID stays open',
    rows[4][8] === '' && rows[4][9] === '',
    'DischargeCycle=' + rows[4][8] + ' Outcome=' + rows[4][9]);
  assert('C: census counts two ghosts released',
    census && census.ghostsReleased === 2,
    'expected ghostsReleased 2, got ' + (census && census.ghostsReleased));
  assert('C: census open count is two',
    census && census.open === 2,
    'expected open 2, got ' + (census && census.open));
})();

// ═══════════════════════════════════════════════════════════════════════════
// Test D: hospital talk-back into World_Population illness rate
// ═══════════════════════════════════════════════════════════════════════════
(function testHospitalTalkback() {
  const hospHeaders = ['AdmissionId', 'POPID', 'Name', 'Neighborhood', 'Cause',
    'AdmitCycle', 'StatusNow', 'LastTransitionCycle', 'DischargeCycle', 'Outcome', 'CyclesInCare'];
  const wpHeaders = ['totalPopulation', 'illnessRate', 'employmentRate', 'migration', 'economy'];

  function buildOpenRows(count) {
    const r = [hospHeaders];
    for (let i = 0; i < count; i++) {
      r.push(['H-C99-' + i, 'POP-D-' + i, 'P' + i, 'Downtown', 'flu', 99,
        'hospitalized', 99, '', '', '']);
    }
    return r;
  }

  function makeCtx(openCount) {
    const hospRows = buildOpenRows(openCount);
    const wpRows = [wpHeaders, [10000, 0.05, 0.91, 0, 'stable']];
    const sheets = {
      Hospital_Ledger: makeSheet('Hospital_Ledger', hospRows),
      World_Population: makeSheet('World_Population', wpRows),
    };
    return {
      ss: makeSS(sheets),
      summary: {
        season: 'Spring',
        weather: { type: 'clear', impact: 1 },
        weatherMood: {},
        worldEvents: [],
        cityDynamics: { sentiment: 0, culturalActivity: 1, communityEngagement: 1 },
        economicMood: 50,
      },
      config: {
        hospitalBaseCapacity: 100,
        hospitalLoadPerSick: 1,
        hospitalTalkbackGain: 0.001,
      },
      rng: function() { return 0.6; }, // neutralizes base illness drift
    };
  }

  // D1: above capacity
  const ctxAbove = makeCtx(150);
  applyDemographicDrift_(ctxAbove);
  const wpAbove = ctxAbove.ss.getSheetByName('World_Population');
  const illAbove = wpAbove.getDataRange().getValues()[1][1];
  const talkbackAbove = ctxAbove.summary.hospitalTalkback;
  const expectedStrainAbove = 0.001 * (150 - 100); // 0.05
  assert('D1: talkback strain above capacity',
    talkbackAbove && talkbackAbove.applied === expectedStrainAbove,
    'expected applied ' + expectedStrainAbove + ', got ' + (talkbackAbove && talkbackAbove.applied));
  assert('D1: illness rate increased by exact strain',
    Math.abs(illAbove - (0.05 + expectedStrainAbove)) < 0.0000001,
    'expected illness ~0.10, got ' + illAbove);
  assert('D1: loadUnits reflects open count',
    talkbackAbove && talkbackAbove.loadUnits === 150,
    'expected loadUnits 150, got ' + (talkbackAbove && talkbackAbove.loadUnits));

  // D2: below capacity
  const ctxBelow = makeCtx(80);
  applyDemographicDrift_(ctxBelow);
  const wpBelow = ctxBelow.ss.getSheetByName('World_Population');
  const illBelow = wpBelow.getDataRange().getValues()[1][1];
  const talkbackBelow = ctxBelow.summary.hospitalTalkback;
  assert('D2: no strain below capacity',
    talkbackBelow && talkbackBelow.applied === 0,
    'expected applied 0, got ' + (talkbackBelow && talkbackBelow.applied));
  assert('D2: illness rate unchanged',
    Math.abs(illBelow - 0.05) < 0.0000001,
    'expected illness 0.05, got ' + illBelow);
})();

// ═══════════════════════════════════════════════════════════════════════════
// Test E: buildAdmissionCause_ branches (loaded standalone; deterministic RNG)
// ═══════════════════════════════════════════════════════════════════════════
(function testBuildAdmissionCause() {
  const ctx = { rng: function() { return 0; } };

  assert('E: injured cause',
    buildAdmissionCause_(ctx, 'injured', {}, {}) === 'a fall at home',
    buildAdmissionCause_(ctx, 'injured', {}, {}));
  assert('E: serious-condition cause',
    buildAdmissionCause_(ctx, 'serious-condition', {}, {}) === 'a cardiac condition',
    buildAdmissionCause_(ctx, 'serious-condition', {}, {}));
  assert('E: epidemic hospitalized cause',
    buildAdmissionCause_(ctx, 'hospitalized', { epidemic: true }, {}) ===
      'a severe case of the illness moving through the neighborhood',
    buildAdmissionCause_(ctx, 'hospitalized', { epidemic: true }, {}));
  assert('E: winter hospitalized cause',
    buildAdmissionCause_(ctx, 'hospitalized', {}, { season: 'winter' }) ===
      'severe seasonal flu',
    buildAdmissionCause_(ctx, 'hospitalized', {}, { season: 'winter' }));
  assert('E: default hospitalized cause',
    buildAdmissionCause_(ctx, 'hospitalized', {}, { season: 'summer' }) ===
      'a sudden acute illness',
    buildAdmissionCause_(ctx, 'hospitalized', {}, { season: 'summer' }));
})();

// ═══════════════════════════════════════════════════════════════════════════
// Tally
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  process.exit(1);
}
