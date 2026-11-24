/** engine.366: replay and dry run stay off the live sheet; a replay reads its own Cycle's memory and writes none back. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let passed = 0, failed = 0;
const check = (label, cond, detail) => { if (cond) { passed++; console.log('  ok   ' + label); } else { failed++; console.error('  FAIL ' + label + (detail ? ': ' + detail : '')); } };
const LIVE = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk', BENCH = 'BENCH-SHEET-ID-0000';

function sandbox(props) {
  const store = Object.assign({}, props || {});
  const writes = [];
  const sb = { Logger: { log() {} }, console,
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => (k in store ? store[k] : null),
      setProperty: (k, v) => { writes.push([k, v]); store[k] = v; },
      deleteProperty: k => { delete store[k]; } }) } };
  vm.createContext(sb);
  for (const f of ['utilities/utilityFunctions.js', 'utilities/cycleModes.js', 'phase01-config/loadPreviousEvening.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sb, { filename: f });
  }
  return { sb, store, writes };
}
const ssOf = (id, ring) => ({ getId: () => id, getSheetByName: n => n === 'Carry_Forward_Store' ? { getDataRange: () => ({ getValues: () => ring || [['Key', 'Cycle', 'UpdatedAt', 'JSON']] }) } : null });
const threw = fn => { try { fn(); return ''; } catch (e) { return e.message; } };

{
  const { sb } = sandbox();
  check('366a replay on the live sheet throws before anything runs',
    /replay refused on the live sheet/.test(threw(() => sb.initializeReplayMode_({ ss: ssOf(LIVE) }, 117))));
  check('366b dry run on the live sheet throws before anything runs',
    /dry run refused on the live sheet/.test(threw(() => sb.initializeDryRunMode_({ ss: ssOf(LIVE) }))));
  const ctx = { ss: ssOf(BENCH) };
  check('366c dry run on the sandbox still runs', !threw(() => sb.initializeDryRunMode_(ctx)) && ctx.mode.dryRun === true);
  sb.loadCycleSeed_ = () => null;
  check('366d replay with no stored seed throws (no seed from the Cycle number)',
    /no stored seed for cycle 117/.test(threw(() => sb.initializeReplayMode_({ ss: ssOf(BENCH) }, 117))));
}
{
  // Replay of C117: the prop holds C117's own output (stamped 117); the ring holds C115 and C116.
  const ring = [['Key', 'Cycle', 'UpdatedAt', 'JSON'], ['PREV_X', 115, '', '{"c":115}'], ['PREV_X', 116, '', '{"c":116}'], ['PREV_X', 117, '', '{"c":117}']];
  const { sb, writes } = sandbox({ PREV_X: '{"c":117}', PREV_X_CYCLE: '117' });
  const ctx = { ss: ssOf(BENCH, ring), mode: { replay: true, replayCycleId: 117 } };
  const got = sb.loadCarryForwardBlob_(ctx, 'PREV_X', 0);
  check('366e a replay of C117 opens on C116\'s memory, not the newest', got === '{"c":116}', got);
  check('366f and writes nothing back to the live memory', writes.length === 0, JSON.stringify(writes));
  const { sb: sb2 } = sandbox({ PREV_X: '{"c":117}', PREV_X_CYCLE: '117' });
  check('366g a dry run previews on the newest', sb2.loadCarryForwardBlob_({ ss: ssOf(BENCH, ring), mode: { dryRun: true } }, 'PREV_X', 0) === '{"c":117}');
}
console.log('\ncycleModesOffLive: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
