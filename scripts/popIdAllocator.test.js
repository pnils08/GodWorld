/**
 * popIdAllocator.test.js — engine.90 POPID allocator contract.
 *
 * Proves: the pure core (max(highWater||0, activeMax)+1); the clasp half
 * loads as plain Apps Script (no require) and seeds one per-cycle counter
 * from the mark + the active scan; sequential mints never collide; persist
 * queues the World_Config cell only when the row exists and the mark moved;
 * the Node half (lib/sheets.js nextPopIdNumber) returns the same numbers.
 *
 * Run: node scripts/popIdAllocator.test.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const logs = [];
global.Logger = { log(m) { logs.push(String(m)); } };

// Apps Script mode: the file must run with no module system at all.
const src = fs.readFileSync(path.resolve(__dirname, '../utilities/popIdAllocator.js'), 'utf8');
const GAS = new Function('module', src + '\nreturn { nextPopIdLocked_, persistPopIdHighWater_, popIdNext_, popIdActiveMax_ };')(undefined);
const NODE = require('../lib/sheets');

let passed = 0, failed = 0;
function test(name, fn) { try { fn(); passed++; console.log('  ✓ ' + name); } catch (e) { failed++; console.log('  ✗ ' + name + '\n    ' + e.message); } }

function ctxWith(rows, config, worldConfigValues) {
  const writes = [];
  return {
    ledger: { headers: ['POPID', 'First', 'Status'], rows: rows.map((r) => r.slice()) },
    config: Object.assign({}, config),
    cache: {
      getData: (name) => (name === 'World_Config' && worldConfigValues) ? { exists: true, values: worldConfigValues } : { exists: false, values: [] },
      queueWrite: (name, row, col, value) => writes.push({ name, row, col, value })
    },
    _writes: writes
  };
}
const ROWS = [['POP-00001', 'A', 'Active'], ['POP-01083', 'B', 'Active'], ['POP-00500', 'C', 'Traded'], ['', '', ''], ['BIZ-00001', 'x', '']];

console.log('popIdAllocator.test.js — engine.90');

test('pure core: no mark → activeMax+1; mark wins when higher; garbage → 0', () => {
  assert.strictEqual(GAS.popIdNext_(null, 1083), 1084);
  assert.strictEqual(GAS.popIdNext_(undefined, 1083), 1084);
  assert.strictEqual(GAS.popIdNext_(1106, 1083), 1107);
  assert.strictEqual(GAS.popIdNext_(1000, 1083), 1084);
  assert.strictEqual(GAS.popIdNext_('abc', 'xyz'), 1);
  assert.strictEqual(GAS.popIdActiveMax_(ROWS, 0), 1083);
});

test('Node half returns the same numbers as the clasp half', () => {
  [[null, 1083], [1106, 1083], [1083, 1106], [0, 0], [NaN, 12]].forEach(([hw, am]) => {
    assert.strictEqual(NODE.nextPopIdNumber(hw, am), GAS.popIdNext_(hw, am), 'hw=' + hw + ' am=' + am);
  });
});

test('nextPopIdLocked_ seeds once from mark + active scan and counts pushes (no collision across minters)', () => {
  const ctx = ctxWith(ROWS, { popIdHighWater: 1106 });
  assert.strictEqual(GAS.nextPopIdLocked_(ctx), 'POP-01107');
  ctx.ledger.rows.push(['POP-01107', 'new', 'Active']);
  assert.strictEqual(GAS.nextPopIdLocked_(ctx), 'POP-01108'); // second minter, same cycle
  assert.strictEqual(GAS.nextPopIdLocked_(ctx), 'POP-01109');
  assert.deepStrictEqual(ctx._popIdAlloc.seededFrom, { highWater: 1106, activeMax: 1083 });
});

test('no mark row → mint from the active scan (live behaviour before the seed)', () => {
  const ctx = ctxWith(ROWS, {});
  assert.strictEqual(GAS.nextPopIdLocked_(ctx), 'POP-01084');
  assert.strictEqual(ctx._popIdAlloc.seededFrom.highWater, null);
});

test('persist: row present + mark moved → one queued World_Config cell, ctx.config updated', () => {
  const wc = [['Key', 'Value'], ['cycleCount', 107], ['popIdHighWater', 1106]];
  const ctx = ctxWith(ROWS, { popIdHighWater: 1106 }, wc);
  GAS.nextPopIdLocked_(ctx); GAS.nextPopIdLocked_(ctx);
  assert.strictEqual(GAS.persistPopIdHighWater_(ctx), true);
  assert.deepStrictEqual(ctx._writes, [{ name: 'World_Config', row: 3, col: 2, value: 1108 }]);
  assert.strictEqual(ctx.config.popIdHighWater, 1108);
});

test('persist: nothing minted → no write; mark already ≥ last → no write (monotonic)', () => {
  const wc = [['Key', 'Value'], ['popIdHighWater', 1200]];
  const ctx = ctxWith(ROWS, { popIdHighWater: 1200 }, wc);
  assert.strictEqual(GAS.persistPopIdHighWater_(ctx), false);
  GAS.nextPopIdLocked_(ctx); // 1201 > 1200 → would write; simulate a higher mark arriving
  ctx.config.popIdHighWater = 1300;
  assert.strictEqual(GAS.persistPopIdHighWater_(ctx), false);
  assert.strictEqual(ctx._writes.length, 0);
});

test('persist: row missing → loud Logger line, no write, no self-seed', () => {
  logs.length = 0;
  const ctx = ctxWith(ROWS, {}, [['Key', 'Value'], ['cycleCount', 107]]);
  GAS.nextPopIdLocked_(ctx);
  assert.strictEqual(GAS.persistPopIdHighWater_(ctx), false);
  assert.strictEqual(ctx._writes.length, 0);
  assert.ok(logs.some((l) => /popIdHighWater row missing/.test(l)), 'warning logged');
});

test('every cycle-path minter routes through nextPopIdLocked_ (no residual max-scan mints)', () => {
  const files = ['phase04-events/generationalEventsEngine.js', 'phase05-citizens/checkForPromotions.js', 'phase05-citizens/processAdvancementIntake.js', 'phase05-citizens/updateCivicApprovalRatings.js', 'phase05-citizens/bondEngine.js'];
  let calls = 0;
  files.forEach((f) => {
    const s = fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8');
    assert.ok(!/['"]POP-['"]\s*\+\s*String\(/.test(s), f + ' still formats a POPID from a local counter');
    calls += (s.match(/nextPopIdLocked_\(ctx\)/g) || []).length;
  });
  assert.strictEqual(calls, 6, 'six cycle-path mint sites');
  const eng = fs.readFileSync(path.resolve(__dirname, '../phase01-config/godWorldEngine2.js'), 'utf8');
  assert.strictEqual((eng.match(/Phase10-PopIdHighWater/g) || []).length, 2, 'persist wired at both entry points');
  assert.ok(!/function getMaxPopId_/.test(eng), 'dead getMaxPopId_ removed');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
