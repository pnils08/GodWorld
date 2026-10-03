#!/usr/bin/env node
'use strict';

/**
 * Run: node scripts/hospitalTalkback.test.js
 *
 * Purpose: Node proof test for engine.102 Task 7 ("W4 — hospital talk-back +
 * Cause fix", acceptance criterion 5). Verifies that new hospital admissions
 * carry a populated Cause, existing open rows have blank Cause backfilled only
 * when no cause is already present, ghost beds are reconciled against the
 * Simulation_Ledger; and (Test D, engine.254 Task 10) the talk-back: last
 * Cycle's Care_Justice_Census city beds against their own recent middle push
 * the World_Population illness rate (hospitalStrainWindow / Band / Gain), with
 * the ensureEngine254Config_ seeder in Test F.
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
  // engine.119: utilities/utilityFunctions.js + persistenceExecutor.js globals the
  // hospital ledger now calls — pass-throughs (no retry, no tab gate) in the harness.
  requireTab_: function(ss, name) { return ss.getSheetByName(name); },
  persistWithRetry_: function(fn) { return fn(); },
  appendRowWithRetry_: function(sheet, row) { sheet.appendRow(row); return 0; },
};

vm.createContext(sandbox);

const careJusticeAccountingPath = path.join(__dirname, '..', 'utilities', 'careJusticeAccounting.js');
vm.runInContext(fs.readFileSync(careJusticeAccountingPath, 'utf8'), sandbox, { filename: careJusticeAccountingPath });
const CJ = require(careJusticeAccountingPath);

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
    'AdmitCycle', 'StatusNow', 'LastTransitionCycle', 'DischargeCycle', 'Outcome', 'CyclesInCare',
    'IntakeType', 'SourceSystem', 'SourceEventId', 'TransferFromId', 'PriorStatus']; // engine.254 Task 6: L–P
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
    'AdmitCycle', 'StatusNow', 'LastTransitionCycle', 'DischargeCycle', 'Outcome', 'CyclesInCare',
    'IntakeType', 'SourceSystem', 'SourceEventId', 'TransferFromId', 'PriorStatus']; // engine.254 Task 6: L–P
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
    'AdmitCycle', 'StatusNow', 'LastTransitionCycle', 'DischargeCycle', 'Outcome', 'CyclesInCare',
    'IntakeType', 'SourceSystem', 'SourceEventId', 'TransferFromId', 'PriorStatus']; // engine.254 Task 6: L–P
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
// Test D: hospital talk-back — census city beds against their own middle
// (engine.254 Task 10, care-and-justice plan §Task 10 talk-back cut)
// ═══════════════════════════════════════════════════════════════════════════
(function testHospitalTalkback() {
  const H = CJ.CARE_JUSTICE_CENSUS_HEADERS;
  const col = name => H.indexOf(name);
  const wpHeaders = ['totalPopulation', 'illnessRate', 'employmentRate', 'migration', 'economy'];

  function censusRow(cycle, system, scope, type, completeness, beds) {
    const r = H.map(() => 0);
    r[col('Cycle')] = cycle; r[col('System')] = system; r[col('GeographicScope')] = scope;
    r[col('Neighborhood')] = scope === 'neighborhood' ? 'Downtown' : ''; r[col('IntakeType')] = type;
    r[col('Completeness')] = completeness; r[col('BedsOccupied')] = beds;
    return r;
  }
  // One Cycle's block: a hood row, a typed city row (beds 9999 — must never be
  // read), the city `all` row, and a judicial city row.
  function block(cycle, beds, completeness) {
    const c = completeness || 'complete';
    return [
      censusRow(cycle, 'hospital', 'neighborhood', 'all', c, 1),
      censusRow(cycle, 'hospital', 'city', 'illness', c, 9999),
      censusRow(cycle, 'hospital', 'city', 'all', c, c === 'unavailable' ? '' : beds),
      censusRow(cycle, 'judicial', 'city', 'all', c, '')
    ];
  }
  function censusSheet(rows, opts) {
    opts = opts || {};
    const reads = [];
    return {
      reads: reads,
      getLastRow: () => rows.length,
      getLastColumn: () => rows.reduce((m, r) => Math.max(m, r.length), 0),
      getRange: (r, c, nr, nc) => ({
        getValues: () => {
          if (opts.throwOnRead && r > 1) throw new Error('read failed');
          reads.push({ r: r, c: c, nr: nr, nc: nc });
          const out = [];
          for (let i = 0; i < nr; i++) {
            const src = rows[r - 1 + i] || [];
            const row = [];
            for (let j = 0; j < nc; j++) row.push(src[c - 1 + j] === undefined ? '' : src[c - 1 + j]);
            out.push(row);
          }
          return out;
        }
      })
    };
  }
  // cycles: array of [cycle, beds, completeness]
  function censusRows(cycles) {
    let rows = [H.slice()];
    cycles.forEach(c => { rows = rows.concat(block(c[0], c[1], c[2])); });
    return rows;
  }
  const errs = [];
  sandbox.logEngineError_ = function(ctx, phase, e) { errs.push({ phase: phase, msg: e.message }); };

  function run(opts) {
    errs.length = 0;
    const sheets = { World_Population: makeSheet('World_Population', [wpHeaders, [10000, 0.05, 0.91, 0, 'stable']]) };
    if (opts.census !== null) sheets.Care_Justice_Census = opts.sheet || censusSheet(opts.census || [H.slice()]);
    if (opts.hospitalOpen) {
      const hr = [['AdmissionId', 'POPID', 'DischargeCycle']];
      for (let i = 0; i < opts.hospitalOpen; i++) hr.push(['H' + i, 'P' + i, '']);
      sheets.Hospital_Ledger = makeSheet('Hospital_Ledger', hr);
    }
    const config = Object.assign({
      hospitalBaseCapacity: 100, illnessAttractorPull: 0,
      hospitalStrainWindow: 8, hospitalStrainBand: 0.25, hospitalStrainGain: 0.02
    }, opts.config || {});
    (opts.drop || []).forEach(k => { delete config[k]; });
    const ctx = {
      ss: makeSS(sheets),
      summary: {
        absoluteCycle: opts.now, season: 'Spring', weather: { type: 'clear', impact: 1 }, weatherMood: {},
        worldEvents: [], cityDynamics: { sentiment: 0, culturalActivity: 1, communityEngagement: 1 }, economicMood: 50
      },
      config: config,
      rng: function() { return 0.6; }
    };
    applyDemographicDrift_(ctx);
    const wp = sheets.World_Population.getDataRange().getValues()[1];
    return { tb: ctx.summary.hospitalTalkback, ill: wp[1], emp: wp[2], errs: errs.slice(), ctx: ctx,
             changes: (ctx.summary.demographicDrift || {}).changes || [], sheet: sheets.Care_Justice_Census };
  }
  const flat = (from, to, beds) => { const a = []; for (let c = from; c <= to; c++) a.push([c, beds]); return a; };
  const near = (a, b) => Math.abs(a - b) < 1e-9;

  // States
  let r = run({ now: 110, census: [H.slice()] });
  assert('D1 no census row -> no-census, no strain, no error', r.tb.state === 'no-census' && r.tb.applied === 0 && near(r.ill, 0.05) && r.errs.length === 0, JSON.stringify(r.tb));
  r = run({ now: 114, census: censusRows(flat(110, 113, 60)) });
  assert('D2 three complete Cycles before K -> warming', r.tb.state === 'warming' && r.tb.cycleRead === 113 && r.errs.length === 0, JSON.stringify(r.tb));
  r = run({ now: 115, census: censusRows(flat(110, 114, 60)) });
  assert('D3 C110-C114 complete -> C115 reads ok', r.tb.state === 'ok' && r.tb.middle === 60 && r.tb.ratio === 1 && r.tb.applied === 0, JSON.stringify(r.tb));
  r = run({ now: 116, census: censusRows(flat(110, 114, 60)) });
  assert('D4 K two Cycles behind -> gap', r.tb.state === 'gap' && r.tb.applied === 0 && r.errs.length === 0, JSON.stringify(r.tb));
  r = run({ now: 114, census: censusRows(flat(110, 114, 60)) });
  assert('D5 census already holds this Cycle -> ahead, no strain', r.tb.state === 'ahead' && r.tb.applied === 0 && r.errs.length === 0, JSON.stringify(r.tb));
  r = run({ now: 116, census: censusRows(flat(110, 114, 60).concat([[115, '', 'unavailable']])) });
  assert('D6 K unavailable -> unavailable, no error row', r.tb.state === 'unavailable' && r.errs.length === 0, JSON.stringify(r.tb));
  r = run({ now: 116, census: censusRows(flat(110, 114, 60).concat([[115, 200, 'incomplete']])) });
  assert('D7 K incomplete -> incomplete, named apart, no strain', r.tb.state === 'incomplete' && r.tb.applied === 0 && r.errs.length === 0, JSON.stringify(r.tb));
  r = run({ now: 119, census: censusRows([[110, 60], [111, 60], [112, 60], [113, '', 'unavailable'], [114, 60], [115, 60], [116, 60], [117, 60], [118, 60]]) });
  assert('D8 a gap block before the run: middle uses only the four after it', r.tb.state === 'ok' && r.tb.middle === 60, JSON.stringify(r.tb) + ' ' + JSON.stringify(r.errs));
  r = run({ now: 119, census: censusRows([[110, 60], [111, 60], [112, 60], [113, 60], [114, 60], [115, 60, 'incomplete'], [116, 60], [117, 60], [118, 300]]) });
  assert('D9 a non-complete Cycle inside the window resets it -> warming', r.tb.state === 'warming' && r.tb.applied === 0, JSON.stringify(r.tb));
  r = run({ now: 115, census: censusRows(flat(110, 113, 6).concat([[114, 30]])) });
  assert('D10 middle under 10 beds -> warming', r.tb.state === 'warming' && r.tb.applied === 0, JSON.stringify(r.tb));

  // Strain
  r = run({ now: 115, census: censusRows(flat(110, 113, 80).concat([[114, 100]])) });
  assert('D11 band edge r = 1.25 -> no strain', r.tb.state === 'ok' && r.tb.ratio === 1.25 && r.tb.applied === 0 && near(r.ill, 0.05), JSON.stringify(r.tb));
  r = run({ now: 115, census: censusRows(flat(110, 113, 80).concat([[114, 120]])) });
  assert('D12 r = 1.5 -> gain x 0.25 = 0.005 on illness', r.tb.applied === 0.005 && near(r.ill, 0.055) && r.changes.indexOf('hospital-strain') >= 0, JSON.stringify(r.tb) + ' ill ' + r.ill);
  r = run({ now: 115, census: censusRows(flat(110, 113, 80).concat([[114, 400]])) });
  assert('D13 excess capped at 0.5 -> at most 0.01 a Cycle', r.tb.applied === 0.01 && near(r.ill, 0.06), JSON.stringify(r.tb));
  r = run({ now: 115, census: censusRows(flat(110, 113, 80).concat([[114, 400]])), config: { hospitalStrainGain: 0 } });
  assert('D14 gain 0 -> talk-back off', r.tb.state === 'ok' && r.tb.applied === 0 && near(r.ill, 0.05), JSON.stringify(r.tb));
  r = run({ now: 120, census: censusRows([[110, 1000]].concat(flat(111, 118, 80)).concat([[119, 80]])) });
  assert('D15 window 8: a Cycle older than K-8 never enters the middle', r.tb.middle === 80, JSON.stringify(r.tb));

  // Contract
  let rows = censusRows(flat(110, 114, 60));
  rows.push(censusRow(114, 'hospital', 'city', 'all', 'complete', 60));
  r = run({ now: 115, census: rows });
  assert('D16 duplicate city all row -> malformed + one error row', r.tb.state === 'malformed' && r.tb.applied === 0 && r.errs.length === 1 && r.errs[0].phase === 'Phase3-HospitalTalkback', JSON.stringify(r.tb) + JSON.stringify(r.errs));
  ['', 'many', -3].forEach(function(bad) {
    const rr = run({ now: 115, census: censusRows(flat(110, 113, 60).concat([[114, bad]])) });
    assert('D17 beds "' + bad + '" on a complete row -> malformed + one error row', rr.tb.state === 'malformed' && rr.tb.applied === 0 && rr.errs.length === 1, JSON.stringify(rr.tb));
  });
  rows = censusRows(flat(110, 113, 60));
  rows.push(censusRow(114, 'hospital', 'neighborhood', 'all', 'complete', 1));
  r = run({ now: 115, census: rows });
  assert('D18 K has rows but no city all row -> malformed', r.tb.state === 'malformed' && r.errs.length === 1, JSON.stringify(r.tb));
  r = run({ now: 115, census: censusRows(flat(110, 112, 60).concat([[113, 60, 'pending']]).concat([[114, 60]])) });
  assert('D19 unknown Completeness in the window -> malformed', r.tb.state === 'malformed' && r.errs.length === 1, JSON.stringify(r.tb));
  r = run({ now: 115, census: null });
  assert('D20 tab missing -> unavailable + one error row, illness unchanged', r.tb.state === 'unavailable' && r.errs.length === 1 && near(r.ill, 0.05), JSON.stringify(r.tb));
  rows = censusRows(flat(110, 114, 60)).map(x => x.slice(0, col('BedsOccupied')));
  r = run({ now: 115, census: rows });
  assert('D21 BedsOccupied header missing -> unavailable + one error row', r.tb.state === 'unavailable' && r.errs.length === 1 && /BedsOccupied/.test(r.errs[0].msg), JSON.stringify(r.errs));

  // Locator
  rows = censusRows(flat(110, 114, 60));
  for (let i = 0; i < 40; i++) rows.push(H.map(() => ''));
  const stray = H.map(() => ''); stray[3] = 'note'; rows.push(stray);
  const ws = H.map(() => ''); ws[0] = '   '; rows.push(ws);
  r = run({ now: 115, census: rows });
  assert('D22 stray content and whitespace below the data do not move K', r.tb.state === 'ok' && r.tb.cycleRead === 114, JSON.stringify(r.tb));
  rows = [H.slice()];
  flat(110, 114, 60).forEach(c => { rows = rows.concat(block(c[0], c[1])); rows.push(H.map(() => '')); });
  r = run({ now: 115, census: rows });
  assert('D23 blank rows between blocks are read as blank', r.tb.state === 'ok' && r.tb.middle === 60, JSON.stringify(r.tb));
  const big = censusSheet(censusRows(flat(100, 119, 60)));
  r = run({ now: 120, sheet: big, census: [] });
  const wide = big.reads.filter(x => x.nc > 1 && x.r > 1);
  assert('D24 reads only Cycles K-8..K and columns A-R', r.tb.state === 'ok' && wide.length === 1 && wide[0].nr === 9 * 4 && wide[0].nc === col('BedsOccupied') + 1, JSON.stringify(big.reads));
  rows = censusRows(flat(110, 114, 60));
  rows.splice(1, 2); // C110's block opens mid-block: its city all row is still there
  r = run({ now: 115, census: rows });
  assert('D25 a partial oldest block is still read by its rows', r.tb.state === 'ok' && r.tb.middle === 60, JSON.stringify(r.tb));

  // Boundary
  const off = run({ now: 115, census: censusRows(flat(110, 113, 80).concat([[114, 120]])), config: { hospitalStrainGain: 0 } });
  r = run({ now: 115, sheet: censusSheet(censusRows(flat(110, 114, 80)), { throwOnRead: true }) });
  assert('D26 a throw inside the read -> one error row, no strain, drift runs on', r.tb.applied === 0 && r.errs.length === 1 && r.errs[0].phase === 'Phase3-HospitalTalkback' && near(r.ill, off.ill) && near(r.emp, off.emp) && !!r.ctx.summary.demographicDrift, JSON.stringify(r.tb) + JSON.stringify(r.errs));
  r = run({ now: 115, census: censusRows(flat(110, 113, 80).concat([[114, 400]])), drop: ['hospitalStrainGain'] });
  assert('D27 missing key throws inside the talk-back only', r.tb.applied === 0 && r.errs.length === 1 && /hospitalStrainGain/.test(r.errs[0].msg) && near(r.ill, 0.05) && !!r.ctx.summary.demographicDrift, JSON.stringify(r.errs));
  r = run({ now: 115, census: censusRows(flat(110, 113, 80).concat([[114, 400]])), config: { hospitalStrainWindow: 3 } });
  assert('D28 out-of-range window throws inside the talk-back only', r.tb.applied === 0 && r.errs.length === 1, JSON.stringify(r.errs));
  r = run({ now: 110, census: [H.slice()], hospitalOpen: 500 });
  assert('D29 a Hospital_Ledger with 500 open rows changes nothing', r.tb.applied === 0 && near(r.ill, 0.05), JSON.stringify(r.tb));
  assert('D30 hospitalCapacity_ still reads baseCapacity', sandbox.hospitalCapacity_(r.ctx) === 100 && r.ctx.summary.demographicDrift.hospitalConfig.baseCapacity === 100);
  r = run({ now: undefined, census: censusRows(flat(110, 114, 60)) });
  assert('D32 no Cycle number -> malformed + one error row, never a silent ahead', r.tb.state === 'malformed' && r.errs.length === 1 && r.tb.applied === 0, JSON.stringify(r.tb));
  rows = censusRows(flat(110, 114, 60)); rows[rows.length - 1][0] = new Date(2026, 9, 2);
  r = run({ now: 115, census: rows });
  assert('D33 a Date in the Cycle column -> malformed + one error row, not ahead', r.tb.state === 'malformed' && r.errs.length === 1, JSON.stringify(r.tb));
  assert('D31 the record shape', JSON.stringify(Object.keys(r.tb)) === JSON.stringify(['state', 'cycleRead', 'beds', 'middle', 'ratio', 'applied']));
  delete sandbox.logEngineError_;
})();

// ═══════════════════════════════════════════════════════════════════════════
// Test F: ensureEngine254Config_ — the three talk-back keys self-arm
// ═══════════════════════════════════════════════════════════════════════════
(function testEngine254Seeder() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'phase01-config', 'engine94SheetContract.js'), 'utf8');
  const K = new Function('Logger', src + '\nreturn { seeds: ENGINE254_CONFIG_SEEDS, ensure: ensureEngine254Config_ };')({ log: function() {} });
  function cfgSheet(rows) {
    return {
      getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }),
      getLastRow: () => rows.length,
      getRange: (r, c, nr) => ({ setValues: vals => { for (let i = 0; i < nr; i++) rows[r - 1 + i] = vals[i].slice(); } })
    };
  }
  const ss = sheet => ({ getSheetByName: n => (n === 'World_Config' ? sheet : null) });
  assert('F1 seeds window 8, band 0.25, gain 0.02', JSON.stringify(K.seeds.map(s => [s[0], s[1]])) === JSON.stringify([['hospitalStrainWindow', 8], ['hospitalStrainBand', 0.25], ['hospitalStrainGain', 0.02]]));
  const rows = [['Key', 'Value', 'Description']];
  const sh = cfgSheet(rows);
  assert('F2 missing keys seeded', K.ensure(ss(sh)).configSeeded === 3 && rows.length === 4);
  assert('F3 a second run seeds nothing', K.ensure(ss(sh)).configSeeded === 0);
  const tryVal = (key, v) => { const rr = [['Key', 'Value', 'Description'], [key, v, '']]; try { K.ensure(ss(cfgSheet(rr))); return true; } catch (e) { return false; } };
  assert('F4 window 3, 27 and 4.5 rejected', !tryVal('hospitalStrainWindow', 3) && !tryVal('hospitalStrainWindow', 27) && !tryVal('hospitalStrainWindow', 4.5));
  assert('F5 window 4 and 26 accepted', tryVal('hospitalStrainWindow', 4) && tryVal('hospitalStrainWindow', 26));
  assert('F6 gain 0.03, -0.01 and text rejected; 0 and 0.02 accepted', !tryVal('hospitalStrainGain', 0.03) && !tryVal('hospitalStrainGain', -0.01) && !tryVal('hospitalStrainGain', 'high') && tryVal('hospitalStrainGain', 0) && tryVal('hospitalStrainGain', 0.02));
  assert('F7 band 2.5 rejected; 0 and 2 accepted', !tryVal('hospitalStrainBand', 2.5) && tryVal('hospitalStrainBand', 0) && tryVal('hospitalStrainBand', 2));
  const dup = [['Key', 'Value', 'Description'], ['hospitalStrainBand', 0.25, ''], ['hospitalStrainBand', 0.3, '']];
  let threw = false; try { K.ensure(ss(cfgSheet(dup))); } catch (e) { threw = true; }
  assert('F8 a duplicate key throws', threw);
  const tuned = [['Key', 'Value', 'Description'], ['hospitalStrainGain', 0.01, '']];
  K.ensure(ss(cfgSheet(tuned)));
  assert('F9 a tuned value is kept', tuned[1][1] === 0.01 && tuned.length === 4);
  const eng = fs.readFileSync(path.join(__dirname, '..', 'phase01-config', 'godWorldEngine2.js'), 'utf8');
  assert('F10 the self-arm runs at open, before the config is loaded', eng.indexOf('ensureEngine254Config_(ss)') > 0 && eng.indexOf('ensureEngine254Config_(ss)') < eng.indexOf("'Phase1-LoadConfig'"));
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
