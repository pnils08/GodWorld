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
const src = fs.readFileSync(path.resolve(__dirname, '../utilities/archiveCitizenExits.js'), 'utf8');
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
  assert.deepStrictEqual(byPop['POP-00040'].slice(w), ['traded-away', 108, 'trade:C108:POP-00040', 'Traded', 'TRUE', w, '']);
  assert.deepStrictEqual(byPop['POP-00042'].slice(w), ['deceased', 108, 'death:C108:POP-00042', 'deceased', 'FALSE', w, '']);
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
test('same-cycle re-fire: rows already snapshotted this cycle are skipped, not double-appended', () => {
  const sl = makeSheet(H, body()), ar = makeSheet(H.concat(META), []);
  M.archiveCitizenExits_(ctxWith(1, { Simulation_Ledger: sl, Citizen_Archive: ar }, 1300));
  // simulate a crash after copy but before remove: put the moved rows back on SL
  const sl2 = makeSheet(H, body());
  const out = M.archiveCitizenExits_(ctxWith(1, { Simulation_Ledger: sl2, Citizen_Archive: ar }, 1300));
  assert.deepStrictEqual([out.candidates, out.archived, out.skippedWhy['already-archived-this-cycle'], ar._rows.length], [0, 0, 4, 4]);
  assert.strictEqual(sl2._rows.length, 9, 'source rows kept until a clean snapshot exists for them');
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
