#!/usr/bin/env node
'use strict';

/**
 * engine.223 — an oversize carry-forward blob cannot silently drop a Cycle.
 *
 * PropertiesService caps a value at 9 KB (9,216 bytes). saveCarryForwardBlob_ set the prop
 * BEFORE mirroring to the Carry_Forward_Store ring, unguarded: an oversize blob threw, the
 * ring never got that Cycle, the prop kept the prior Cycle's stamp (no ghost), and the next
 * fire opened on a two-Cycle-old world. PREV_CYCLE_STATE_JSON read 7,348 chars on live C107
 * and 8,244 on the bench at C108.
 *
 * Offline proof: the real save/load functions in a vm against a PropertiesService stub that
 * throws above 9,216 bytes and a Carry_Forward_Store stub. Run: node scripts/carryForwardSaveGuard.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const load = (sb, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sb, { filename: rel });

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}
const LIMIT = 9216;
function world() {
  const props = {};
  const store = { rows: [['Key', 'Cycle', 'UpdatedAt', 'JSON']] };
  const sheet = {
    getDataRange: () => ({ getValues: () => store.rows.map(r => r.slice()) }),
    getRange: (r, c, nr, nc) => ({ setValues: v => { store.rows[r - 1] = v[0].slice(); } }),
    appendRow: row => { store.rows.push(row.slice()); }
  };
  const sb = {
    Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, Date, isFinite, isNaN,
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => (k in props) ? props[k] : null,
      setProperty: (k, v) => { if (String(v).length > LIMIT) throw new Error('Argument too large: value'); props[k] = String(v); },
      deleteProperty: k => { delete props[k]; }
    }) },
    persistWithRetry_: (fn) => fn(),
    appendRowWithRetry_: (sh, row) => sh.appendRow(row),
    ctx: { ss: { getSheetByName: n => n === 'Carry_Forward_Store' ? sheet : null }, config: { cycleCount: 108 } }
  };
  vm.createContext(sb);
  load(sb, 'phase01-config/loadPreviousEvening.js');
  return { sb, props, store };
}
function blob(cycle, chars) { const o = { cycle, econMood: 55, pad: '' }; o.pad = 'x'.repeat(Math.max(0, chars - JSON.stringify(o).length)); return JSON.stringify(o); }

console.log('engine.223 — carry-forward save guard');
{
  const w = world();
  const small = blob(108, 5000);
  w.sb.saveCarryForwardBlob_(w.sb.ctx, 'PREV_CYCLE_STATE_JSON', small, 108);
  check('5 KB blob: prop written', w.props.PREV_CYCLE_STATE_JSON === small);
  check('5 KB blob: prop stamped 108', w.props.PREV_CYCLE_STATE_JSON_CYCLE === '108');
  check('5 KB blob: ring row written', w.store.rows.length === 2 && w.store.rows[1][3] === small);
  const back = w.sb.loadCarryForwardBlob_(w.sb.ctx, 'PREV_CYCLE_STATE_JSON', 109);
  check('5 KB blob: loads back for the next Cycle', back === small);
}
{
  const w = world();
  // The prior Cycle sits in the prop and the ring, as on live.
  const prior = blob(107, 7000);
  w.sb.saveCarryForwardBlob_(w.sb.ctx, 'PREV_CYCLE_STATE_JSON', prior, 107);
  const big = blob(108, 10000);
  let threw = null;
  try { w.sb.saveCarryForwardBlob_(w.sb.ctx, 'PREV_CYCLE_STATE_JSON', big, 108); } catch (e) { threw = e.message; }
  check('10 KB blob: save does not throw', threw === null, 'threw=' + threw);
  check('10 KB blob: ring row for 108 written', w.store.rows.some(r => r[0] === 'PREV_CYCLE_STATE_JSON' && Number(r[1]) === 108 && r[3] === big));
  check('10 KB blob: the stale 107 prop is gone (not left to masquerade as yesterday)', !('PREV_CYCLE_STATE_JSON' in w.props) && !('PREV_CYCLE_STATE_JSON_CYCLE' in w.props), JSON.stringify(Object.keys(w.props)));
  check('10 KB blob: a diag event names the key and size', w.sb.CARRY_FORWARD_DIAG.some(d => d.key === 'PREV_CYCLE_STATE_JSON' && d.event === 'prop-too-large' && d.bytes === big.length), JSON.stringify(w.sb.CARRY_FORWARD_DIAG));
  const back = w.sb.loadCarryForwardBlob_(w.sb.ctx, 'PREV_CYCLE_STATE_JSON', 109);
  check('10 KB blob: the next Cycle opens on 108 from the ring, not on 107', back === big, back ? 'got cycle ' + JSON.parse(back).cycle : 'null');
}
console.log(passed + ' passed, ' + failed + ' failed');
process.exitCode = failed ? 1 : 0;
