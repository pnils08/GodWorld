/**
 * archiveCitizenExits.test.js — engine.90 Commit 5 mover contract.
 * Proves: flag off = no-op; header drift throws before any move; copy →
 * read-back → remove over the committed sheet with contiguous bottom-up
 * deletes; metadata cells; malformed / active-duplicate skips; same-cycle
 * re-fire does not double-snapshot; a read-back mismatch keeps the source row;
 * the high-water mark never sits below an archived POPID.
 * Run: node scripts/archiveCitizenExits.test.js
 */
const fs = require('fs'), path = require('path'), assert = require('assert');
const logs = [];
global.Logger = { log(m) { logs.push(String(m)); } };
global.requireTab_ = (ss, name) => { const s = ss.getSheetByName(name); if (!s) throw new Error('engine.119: tab "' + name + '" is missing'); return s; };
global.persistPopIdHighWater_ = require('../utilities/popIdAllocator').persistPopIdHighWater_;
const src = fs.readFileSync(path.resolve(__dirname, '../phase01-config/advanceSimulationCalendar.js'), 'utf8') + '\n' + // engine.164: the mover reads simYearOf_
  fs.readFileSync(path.resolve(__dirname, '../utilities/archiveCitizenExits.js'), 'utf8');
const M = new Function('module', src + '\nreturn { archiveCitizenExits_, citizenArchiveCandidates_, citizenArchiveRow_, citizenArchiveHeaders_, CITIZEN_ARCHIVE_META_HEADERS };')(undefined);

function makeSheet(header, rows, opts) {
  opts = opts || {};
  return {
    _h: header.slice(), _rows: rows.map((r) => r.slice()), _deletes: [],
    getLastRow() { return this._rows.length + 1; },
    getDataRange() { const self = this; return { getValues: () => [self._h].concat(self._rows) }; },
    getRange(row, col, nRows, nCols) {
      const self = this;
      return {
        setValues(vals) { for (let i = 0; i < vals.length; i++) self._rows[row - 2 + i] = vals[i].slice(); },
        getValues() { const out = []; for (let i = 0; i < nRows; i++) { let r = (self._rows[row - 2 + i] || []).slice(); if (opts.corruptReadBack && i === 0) r = r.map(() => 'XX'); out.push(r); } return out; },
      };
    },
    deleteRows(start, n) { this._deletes.push([start, n]); this._rows.splice(start - 2, n); },
  };
}
const H = ['POPID', 'First', 'Last', 'Status', 'Tier', 'NetWorth'];
const META = M.CITIZEN_ARCHIVE_META_HEADERS;
function body() {
  return [
    ['POP-00001', 'Vinnie', 'Keane', 'Active', 1, 100],
    ['POP-00040', 'Gone', 'One', 'Traded', 3, 10],
    ['POP-00041', 'Gone', 'Two', 'Traded', 3, 11],       // contiguous with 40
    ['POP-00042', 'Late', 'Citizen', 'deceased', 4, 12],
    ['POP-00043', 'Still', 'Here', 'Active', 4, 13],
    ['POP-00044', 'Dup', 'Active', 'Traded', 4, 14],      // has an Active twin below → skip
    ['POP-00044', 'Dup', 'Active', 'Active', 4, 14],
    ['BAD-1', 'Mal', 'Formed', 'Traded', 4, 0],           // malformed → skip
    ['POP-01200', 'Beyond', 'Mark', 'deceased', 4, 0],    // numeric above the mark → bump
  ];
}
function ctxWith(flag, sheets, hw) {
  const writes = [];
  const wc = [['Key', 'Value'], ['cycleCount', 108], ['popIdHighWater', hw]];
  return {
    config: { citizenArchiveEnabled: flag, popIdHighWater: hw },
    summary: { cycleId: 108 },
    ss: { getSheetByName: (n) => sheets[n] || null },
    cache: { getData: (n) => n === 'World_Config' ? { exists: true, values: wc } : { exists: false, values: [] }, queueWrite: (n, r, c, v) => writes.push({ n, r, c, v }) },
    _writes: writes,
  };
}
let passed = 0, failed = 0;
const test = (n, f) => { try { f(); passed++; console.log('  ✓ ' + n); } catch (e) { failed++; console.log('  ✗ ' + n + '\n    ' + e.message); } };
console.log('archiveCitizenExits.test.js — engine.90');

test('flag off → no-op, sheets untouched, diag enabled=false', () => {
  const sl = makeSheet(H, body()), ar = makeSheet(H.concat(META), []);
  const out = M.archiveCitizenExits_(ctxWith(0, { Simulation_Ledger: sl, Citizen_Archive: ar }, 1106));
  assert.deepStrictEqual([out.enabled, out.archived, sl._rows.length, ar._rows.length], [false, 0, 9, 0]);
});
test('flag on, archive tab missing → engine.119 throw (the cycle never creates it)', () => {
  const sl = makeSheet(H, body());
  assert.throws(() => M.archiveCitizenExits_(ctxWith(1, { Simulation_Ledger: sl }, 1106)), /Citizen_Archive.*missing/);
  assert.strictEqual(sl._rows.length, 9);
});
test('header drift → throws before any move', () => {
  const sl = makeSheet(H, body()), ar = makeSheet(H.concat(META.slice(0, 6)), []);
  assert.throws(() => M.archiveCitizenExits_(ctxWith(1, { Simulation_Ledger: sl, Citizen_Archive: ar }, 1106)), /header does not match/);
  assert.deepStrictEqual([sl._rows.length, ar._rows.length], [9, 0]);
});
test('copy → read-back → remove: 4 moved, contiguous run deleted in one call, bottom-up; skips counted', () => {
  const sl = makeSheet(H, body()), ar = makeSheet(H.concat(META), []);
  const ctx = ctxWith(1, { Simulation_Ledger: sl, Citizen_Archive: ar }, 1106);
  const out = M.archiveCitizenExits_(ctx);
  assert.deepStrictEqual([out.enabled, out.candidates, out.archived, out.remaining], [true, 4, 4, 5]);
  assert.deepStrictEqual(out.skippedWhy, { 'active-duplicate': 1, 'malformed-popid': 1 });
  assert.deepStrictEqual(sl._rows.map((r) => r[0]), ['POP-00001', 'POP-00043', 'POP-00044', 'POP-00044', 'BAD-1']);
  assert.deepStrictEqual(sl._deletes, [[10, 1], [3, 3]]); // sheet rows: 10 (01200) first, then the contiguous run 3–5 (00040, 00041, 00042) in one call
  assert.strictEqual(ar._rows.length, 4);
  const byPop = {}; ar._rows.forEach((r) => { byPop[r[0]] = r; });
  const w = H.length;
  // engine.90 Commit 8: ArchiveNote names the measured defect classes the row leaves with — this
  // narrow fixture has no SchoolQuality/CareerStage/BirthYear/Income columns, so the note says so.
  const NOTE = 'defects-at-exit: schoolQualityUnusable,careerStageBlank,birthYearOOB,incomeBlank';
  assert.deepStrictEqual(byPop['POP-00040'].slice(w), ['traded-away', 108, 'trade:C108:POP-00040', 'Traded', 'TRUE', w, NOTE]);
  assert.deepStrictEqual(byPop['POP-00042'].slice(w), ['deceased', 108, 'death:C108:POP-00042', 'deceased', 'FALSE', w, NOTE]);
  assert.deepStrictEqual(byPop['POP-00042'].slice(0, w), ['POP-00042', 'Late', 'Citizen', 'deceased', 4, 12]); // verbatim snapshot
});
test('two eligible rows sharing one POPID → duplicate-in-batch, neither moves (the (POPID, ExitCycle, Reason) key stays unique)', () => {
  const b = body(); b.push(['POP-00040', 'Gone', 'One', 'Traded', 3, 10]); // second Traded row for 00040
  const sl = makeSheet(H, b), ar = makeSheet(H.concat(META), []);
  const out = M.archiveCitizenExits_(ctxWith(1, { Simulation_Ledger: sl, Citizen_Archive: ar }, 1300));
  assert.strictEqual(out.skippedWhy['duplicate-in-batch'], 2);
  assert.strictEqual(sl._rows.filter((r) => r[0] === 'POP-00040').length, 2, 'both duplicate rows kept');
  assert.strictEqual(ar._rows.filter((r) => r[0] === 'POP-00040').length, 0);
  assert.strictEqual(out.archived, 3);
});
test('high-water mark bumps to the archived POPID above it (queued World_Config write)', () => {
  const sl = makeSheet(H, body()), ar = makeSheet(H.concat(META), []);
  const ctx = ctxWith(1, { Simulation_Ledger: sl, Citizen_Archive: ar }, 1106);
  const out = M.archiveCitizenExits_(ctx);
  assert.strictEqual(out.highWaterBumped, true);
  assert.deepStrictEqual(ctx._writes, [{ n: 'World_Config', r: 3, c: 2, v: 1200 }]);
  assert.strictEqual(ctx.config.popIdHighWater, 1200);
});
test('no bump when the mark already covers every archived POPID', () => {
  const sl = makeSheet(H, body()), ar = makeSheet(H.concat(META), []);
  const ctx = ctxWith(1, { Simulation_Ledger: sl, Citizen_Archive: ar }, 1300);
  const out = M.archiveCitizenExits_(ctx);
  assert.deepStrictEqual([out.highWaterBumped, ctx._writes.length], [false, 0]);
});
test('same-cycle re-fire after a kill between copy and remove: the 4 snapshots stand, the 4 source rows go, nothing copied twice (engine.285 — was: rows stalled on SL)', () => {
  const sl = makeSheet(H, body()), ar = makeSheet(H.concat(META), []);
  M.archiveCitizenExits_(ctxWith(1, { Simulation_Ledger: sl, Citizen_Archive: ar }, 1300));
  // simulate a crash after copy but before remove: put the moved rows back on SL
  const sl2 = makeSheet(H, body());
  const out = M.archiveCitizenExits_(ctxWith(1, { Simulation_Ledger: sl2, Citizen_Archive: ar }, 1300));
  assert.deepStrictEqual([out.candidates, out.archived, out.resumed, out.skipped, ar._rows.length], [4, 4, 4, 2, 4]);
  assert.deepStrictEqual(sl2._rows.map((r) => r[0]), ['POP-00001', 'POP-00043', 'POP-00044', 'POP-00044', 'BAD-1']);
});
test('engine.285: the NEXT cycle after the kill (no re-fire) removes without a second snapshot', () => {
  const sl = makeSheet(H, body()), ar = makeSheet(H.concat(META), []);
  M.archiveCitizenExits_(ctxWith(1, { Simulation_Ledger: sl, Citizen_Archive: ar }, 1300));
  const sl2 = makeSheet(H, body());
  const ctx = ctxWith(1, { Simulation_Ledger: sl2, Citizen_Archive: ar }, 1300);
  ctx.summary.cycleId = 109;
  const out = M.archiveCitizenExits_(ctx);
  assert.deepStrictEqual([out.archived, out.resumed, ar._rows.length], [4, 4, 4]);
  assert.ok(ar._rows.every((r) => r[H.length + 1] === 108), 'every snapshot keeps ExitCycle 108 — no C109 twin');
  assert.strictEqual(sl2._rows.length, 5);
});
test('engine.285: a citizen restored after the snapshot and traded again is a new exit — new snapshot, then removed', () => {
  const HR = H.concat(['ReturnedCycle']);
  const ar = makeSheet(HR.concat(META), []);
  const old = M.citizenArchiveRow_(HR, ['POP-00040', 'Gone', 'One', 'Traded', 3, 10, ''], 'traded-away', 100, 2041);
  ar._rows.push(old);
  const sl = makeSheet(HR, [['POP-00001', 'Vinnie', 'Keane', 'Active', 1, 100, ''], ['POP-00040', 'Gone', 'One', 'Traded', 3, 10, 104]]);
  const out = M.archiveCitizenExits_(ctxWith(1, { Simulation_Ledger: sl, Citizen_Archive: ar }, 1300));
  assert.deepStrictEqual([out.archived, out.resumed || 0, ar._rows.length], [1, 0, 2]);
  assert.deepStrictEqual(ar._rows.map((r) => r[HR.length + 1]), [100, 108]);
  assert.deepStrictEqual(sl._rows.map((r) => r[0]), ['POP-00001']);
});
test('engine.285 (codex probe): a stale return stamp (restored "at C99" from a C100 snapshot) never costs the fresh exit — the changed row gets its own snapshot', () => {
  const HR = H.concat(['ReturnedCycle']);
  const ar = makeSheet(HR.concat(META), []);
  ar._rows.push(M.citizenArchiveRow_(HR, ['POP-00040', 'Gone', 'One', 'Traded', 3, 10, ''], 'traded-away', 100, 2041));
  const sl = makeSheet(HR, [['POP-00040', 'Gone', 'One', 'Traded', 3, 99, 99]]);   // lived on after the return: NetWorth 10 → 99
  const out = M.archiveCitizenExits_(ctxWith(1, { Simulation_Ledger: sl, Citizen_Archive: ar }, 1300));
  assert.deepStrictEqual([out.archived, out.resumed || 0, ar._rows.length, sl._rows.length], [1, 0, 2, 0]);
  assert.strictEqual(ar._rows[1][5], 99, 'the current state is on the archive');
});
test('engine.285 (codex probe): restored and gone again in the SAME cycle, then a kill before removal — the retry removes, archive holds 2 (not 3)', () => {
  const HR = H.concat(['ReturnedCycle']);
  const ar = makeSheet(HR.concat(META), []);
  ar._rows.push(M.citizenArchiveRow_(HR, ['POP-00040', 'Gone', 'One', 'Traded', 3, 10, ''], 'traded-away', 108, 2041));
  const row = ['POP-00040', 'Gone', 'One', 'Traded', 3, 12, 108];
  M.archiveCitizenExits_(ctxWith(1, { Simulation_Ledger: makeSheet(HR, [row]), Citizen_Archive: ar }, 1300));
  assert.strictEqual(ar._rows.length, 2, 'first pass: the new exit snapshotted');
  const sl2 = makeSheet(HR, [row]);   // the kill: copy landed, removal did not
  const out = M.archiveCitizenExits_(ctxWith(1, { Simulation_Ledger: sl2, Citizen_Archive: ar }, 1300));
  assert.deepStrictEqual([out.archived, out.resumed, ar._rows.length, sl2._rows.length], [1, 1, 2, 0]);
});
test('engine.285: a row that differs from its snapshot only in LastUpdated / DialState (re-stamped every Cycle) is the same snapshot', () => {
  const HU = H.concat(['LastUpdated', 'DialState']);
  const ar = makeSheet(HU.concat(META), []);
  ar._rows.push(M.citizenArchiveRow_(HU, ['POP-00040', 'Gone', 'One', 'Traded', 3, 10, 'C108', '{"base":{"drive":50}}'], 'traded-away', 108, 2041));
  const sl = makeSheet(HU, [['POP-00040', 'Gone', 'One', 'Traded', 3, 10, 'C109', '{"base":{"drive":51}}']]);
  const out = M.archiveCitizenExits_(ctxWith(1, { Simulation_Ledger: sl, Citizen_Archive: ar }, 1300));
  assert.deepStrictEqual([out.archived, out.resumed, ar._rows.length], [1, 1, 1]);
});
test('read-back mismatch keeps the source row; the verified rows still move', () => {
  const sl = makeSheet(H, body()), ar = makeSheet(H.concat(META), [], { corruptReadBack: true });
  const out = M.archiveCitizenExits_(ctxWith(1, { Simulation_Ledger: sl, Citizen_Archive: ar }, 1300));
  assert.deepStrictEqual([out.candidates, out.archived, out.skipped], [4, 3, 3]); // 2 eligibility skips + 1 read-back skip
  assert.ok(sl._rows.some((r) => r[0] === 'POP-00040'), 'first candidate (corrupted read-back) stayed on SL');
  assert.ok(logs.some((l) => /read-back mismatch for POP-00040/.test(l)));
});
test('both engine entry points wire Phase11-CitizenArchive after BusinessArchive, before MaintainLifeHistoryLog', () => {
  const eng = fs.readFileSync(path.resolve(__dirname, '../phase01-config/godWorldEngine2.js'), 'utf8');
  const idx = [...eng.matchAll(/Phase11-(BusinessArchive|CitizenArchive|MaintainLifeHistoryLog)/g)].map((m) => m[1]);
  assert.deepStrictEqual(idx, ['BusinessArchive', 'CitizenArchive', 'MaintainLifeHistoryLog', 'BusinessArchive', 'CitizenArchive', 'MaintainLifeHistoryLog']);
  assert.ok(/CITIZEN_ARCHIVE_DIAG/.test(fs.readFileSync(path.resolve(__dirname, '../utilities/webTrigger.js'), 'utf8')), 'fire JSON emits the counters');
});
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
