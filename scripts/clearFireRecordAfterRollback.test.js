const fs = require('fs'), vm = require('vm'), assert = require('assert');
const src = fs.readFileSync(require('path').join(__dirname, '..', 'phase01-config/godWorldEngine2.js'), 'utf8');
const a = src.indexOf('var FIRE_GUARD_DEFAULT_MINUTES'), b = src.indexOf('// Admit or refuse this fire.');
function run(raw, cycleCount, lockOk) {
  const store = { FIRE_ADMISSION_JSON: raw };
  const sb = {
    Logger: { log() {} }, logEngineError_() {},
    LockService: { getScriptLock: () => ({ tryLock: () => lockOk !== false, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in store ? store[k] : null), deleteProperty: k => { delete store[k]; } }) },
    openSimSpreadsheet_: () => ({ getSheetByName: () => ({ getDataRange: () => ({ getValues: () => [['Key', 'Value'], ['cycleCount', cycleCount], ['fireGuardMinutes', 60]] }) }) }),
  };
  vm.createContext(sb); vm.runInContext(src.slice(a, b), sb);
  let err = null, out = null; try { out = vm.runInContext('clearFireRecordAfterRollback()', sb); } catch (e) { err = e.message; }
  return { err, out, left: 'FIRE_ADMISSION_JSON' in store };
}
const done116 = JSON.stringify({ cycle: 116, startedMs: 1794776408836, state: 'done', finishedMs: 1794776600521 });
let r = run(done116, 115); assert.strictEqual(r.err, null); assert.strictEqual(r.left, false, 'tonight: record 116 done, sheet 115 -> cleared');
r = run(done116, 116); assert.ok(/not behind/.test(r.err)); assert.strictEqual(r.left, true, 'sheet at 116 -> refused, kept');
r = run(done116, 117); assert.ok(/not behind/.test(r.err)); assert.strictEqual(r.left, true);
r = run(JSON.stringify({ cycle: 116, startedMs: 1, state: 'running' }), 115); assert.ok(/running/.test(r.err)); assert.strictEqual(r.left, true, 'a running record is never cleared');
r = run(JSON.stringify({ cycle: 116, startedMs: 1, state: 'checkpointed' }), 115); assert.ok(/checkpointed/.test(r.err)); assert.strictEqual(r.left, true);
r = run(null, 115); assert.ok(/no readable/.test(r.err));
r = run('garbage', 115); assert.ok(/no readable/.test(r.err)); assert.strictEqual(r.left, true);
r = run(done116, 115, false); assert.ok(/running/.test(r.err)); assert.strictEqual(r.left, true, 'lock held -> refused');
console.log('clearFireRecordAfterRollback: 8 cases pass');
