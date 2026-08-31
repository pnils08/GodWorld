/**
 * engine.136 — verifyCycleCountPersisted_ / repairCycleCount_.
 *
 * The cycle counter is the world's identity: advanceWorldTime_ queues it in
 * Phase 1 and it does not reach the sheet until the end-of-cycle flush. Bench
 * C110 (2026-08-30) lost that write while every other tab advanced, and nothing
 * said so. These cover the read-back guard and — because it writes to the sheet
 * — every path of the repair, especially the ones that must NOT write.
 *
 * Apps Script source, so it is vm-loaded with stubs rather than required.
 * Run: node phase01-config/godWorldEngine2.cycleCount.test.js
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const sandbox = {
  Logger: { log: () => {} },
  Utilities: {
    DigestAlgorithm: { SHA_1: 'SHA_1' },
    computeDigest: () => [1, 2, 3, 4, 5, 6]
  },
  SpreadsheetApp: {}, PropertiesService: {}, UrlFetchApp: {}, Session: {},
  CacheService: {}, DriveApp: {}, HtmlService: {}, ScriptApp: {}, console
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, 'godWorldEngine2.js'), 'utf8'),
  sandbox,
  { filename: 'godWorldEngine2.js' }
);

const verify = sandbox.verifyCycleCountPersisted_;
if (typeof verify !== 'function') throw new Error('verifyCycleCountPersisted_ not defined');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
}

/**
 * World_Config with a cycleCount row at sheet row 3, plus an Engine_Errors
 * append sink. `writes` records every repair write attempted — the assertions
 * that matter most are the ones where it must stay empty.
 */
function mkCtx(sheetValue, opts) {
  opts = opts || {};
  const appended = [];
  const writes = [];
  let cell = sheetValue;

  const configSheet = {
    getDataRange: () => {
      if (opts.throwOnRead) throw new Error('Service Spreadsheets failed');
      return { getValues: () => [['Key', 'Value'], ['lastRun', 'x'], ['cycleCount', cell]] };
    },
    getRange: (row, col) => ({
      setValue: (v) => {
        writes.push({ row, col, value: v });
        if (opts.throwOnWrite) throw new Error('Service Spreadsheets timed out');
        if (!opts.writeIsLost) cell = v;
      },
      getValue: () => cell
    })
  };

  const ss = {
    getSheetByName: (n) => {
      if (n === 'World_Config') return opts.noConfigSheet ? null : configSheet;
      if (n === 'Engine_Errors') return { appendRow: r => appended.push(r) };
      return null;
    },
    insertSheet: () => ({ appendRow: r => appended.push(r) })
  };

  const mode = {};
  if (opts.dryRun) mode.dryRun = true;
  if (opts.replay) mode.replay = true;

  return {
    ctx: { ss, summary: { cycleId: 111, auditIssues: [] }, mode: mode },
    appended, writes,
    current: () => cell
  };
}

const phaseOf = t => (t.appended[0] || [])[2];
const msgOf = t => (t.appended[0] || [])[3];
const sevOf = t => (t.appended[0] || [])[7];

console.log('verifyCycleCountPersisted_ / repairCycleCount_:');

// --- the healthy path: the guard must be invisible ----------------------
let t = mkCtx(111);
verify(t.ctx);
check('match: no Engine_Errors row', t.appended.length === 0);
check('match: no write attempted', t.writes.length === 0);
check('match: engineErrorCount untouched', !t.ctx.summary.engineErrorCount);

// --- the C110 stall: sheet one behind -> repair --------------------------
t = mkCtx(110);
verify(t.ctx);
check('stall: repair write issued', t.writes.length === 1);
check('stall: wrote expected value', t.writes[0].value === 111);
check('stall: wrote the cycleCount cell (row 3, col 2)', t.writes[0].row === 3 && t.writes[0].col === 2);
check('stall: cell now holds the cycle', t.current() === 111);
check('stall: logged as repaired', phaseOf(t) === 'Phase11-CycleCountRepaired');
check('stall: repair is NOT silent', t.appended.length === 1);
check('stall: severity medium (handled, not fatal)', sevOf(t) === 'medium');
check('stall: message carries both numbers', /110/.test(msgOf(t)) && /111/.test(msgOf(t)));

// --- repair write throws ------------------------------------------------
t = mkCtx(110, { throwOnWrite: true });
let threw = false;
try { verify(t.ctx); } catch (e) { threw = true; }
check('write throws: swallowed', !threw);
check('write throws: escalated FATAL', phaseOf(t) === 'FATAL-CycleCountRepairFailed');
check('write throws: severity high', sevOf(t) === 'high');
check('write throws: names the manual fix', /by hand/.test(msgOf(t)));

// --- repair write reports success but the cell does not move ------------
t = mkCtx(110, { writeIsLost: true });
verify(t.ctx);
check('write lost: read-back caught it', phaseOf(t) === 'FATAL-CycleCountRepairFailed');
check('write lost: severity high', sevOf(t) === 'high');
check('write lost: cell left untouched', t.current() === 110);

// --- NOT the stall shape: report, never overwrite ------------------------
t = mkCtx(108);   // two behind — something else went wrong
verify(t.ctx);
check('far behind: NO write attempted', t.writes.length === 0);
check('far behind: reported as unexpected', phaseOf(t) === 'FATAL-CycleCountUnexpected');
check('far behind: severity high', sevOf(t) === 'high');

t = mkCtx(150);   // ahead of us — someone else's intent
verify(t.ctx);
check('ahead: NO write attempted', t.writes.length === 0);
check('ahead: reported as unexpected', phaseOf(t) === 'FATAL-CycleCountUnexpected');

// --- modes that must never fire -----------------------------------------
t = mkCtx(110, { dryRun: true });
verify(t.ctx);
check('dryRun: skipped entirely', t.appended.length === 0 && t.writes.length === 0);

t = mkCtx(110, { replay: true });
verify(t.ctx);
check('replay: skipped entirely', t.appended.length === 0 && t.writes.length === 0);

t = mkCtx(110);
t.ctx.summary.cycleId = undefined;   // Phase 1 never ran
verify(t.ctx);
check('no cycleId: skipped', t.appended.length === 0 && t.writes.length === 0);

// --- must never become the thing that breaks cycle close -----------------
t = mkCtx(110, { throwOnRead: true });
threw = false;
try { verify(t.ctx); } catch (e) { threw = true; }
check('read throws: swallowed, nothing written', !threw && t.writes.length === 0);

t = mkCtx(110, { noConfigSheet: true });
threw = false;
try { verify(t.ctx); } catch (e) { threw = true; }
check('no World_Config: skipped, no throw', !threw && t.writes.length === 0);

threw = false;
try { verify(null); verify({}); verify({ ss: {} }); verify({ ss: {}, summary: {} }); }
catch (e) { threw = true; }
check('null / partial ctx: no throw', !threw);

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
