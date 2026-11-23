// C117 gap log (builder 2026-11-23 "Let's address the smaller things"): the Phase-10 executor fills a
// LifeHistory_Log row's blank Name / Neighborhood from the row's own POPID and turns a bare "C117"
// stamp into "Y3C13" — the one place every queued row passes through (G-EC71 does wall-clock dates there).
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + ' — ' + e.message); } };
function fakeSheet(rows) {
  const sh = { rows, getLastRow: () => sh.rows.length, getLastColumn: () => Math.max(0, ...sh.rows.map(r => r.length)), getMaxRows: () => sh.rows.length + 1000, getMaxColumns: () => 30,
    insertRowsAfter: () => {}, getDataRange: () => ({ getValues: () => sh.rows.map(r => r.slice()) }), appendRow: r => sh.rows.push(r.slice()),
    getRange: (r, c, nr, nc) => ({ setValues: v => { for (let i = 0; i < v.length; i++) sh.rows[r - 1 + i] = v[i].slice(); }, getValues: () => sh.rows.slice(r - 1, r - 1 + (nr || 1)).map(x => x.slice()), setValue: () => {}, getValue: () => '' }) };
  return sh;
}
const LH = fakeSheet([['Timestamp', 'POPID', 'Name', 'EventTag', 'EventText', 'Neighborhood', 'Cycle']]);
const sheets = { LifeHistory_Log: LH };
const sb = { console, Logger: { log() {} }, SpreadsheetApp: { flush() {} }, Utilities: { sleep() {} }, LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
  inWorldStamp_: () => 'Y3C13' };
vm.createContext(sb);
for (const f of ['utilities/writeIntents.js', 'phase10-persistence/persistenceExecutor.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sb, { filename: f });
const ctx = { ss: { getSheetByName: n => sheets[n] || null }, summary: { cycleId: 117, cycleRef: 'Y3C13' }, config: {}, mode: { dryRun: false },
  ledger: { headers: ['POPID', 'First', 'Last', 'Neighborhood'], rows: [['POP-1', 'Ana', 'Test', 'Fruitvale'], ['POP-2', 'Ben', 'Row', 'Temescal']] },
  persist: { updates: [], logs: [], replaceOps: [] } };
sb.queueAppendIntent_(ctx, 'LifeHistory_Log', ['C117', 'POP-1', '', 'Advancement', 'a bare stamp, no name', '', 117], 't', 'events');
sb.queueAppendIntent_(ctx, 'LifeHistory_Log', ['Y3C13', 'POP-2', 'Benny Row', 'Wedding', 'kept as written', 'Uptown', 117], 't', 'events');
sb.queueAppendIntent_(ctx, 'LifeHistory_Log', [new Date('2026-11-22T00:00:00Z'), 'POP-9', '', 'Money', 'a citizen the ledger lacks', '', 117], 't', 'events');
sb.executePersistIntents_(ctx);
const rows = LH.rows.slice(1);
t('three rows landed', () => assert.strictEqual(rows.length, 3, JSON.stringify(rows)));
t('a bare C117 stamp becomes Y3C13', () => assert.strictEqual(rows[0][0], 'Y3C13'));
t('a blank Name and Neighborhood are filled from the row\'s own POPID', () => { assert.strictEqual(rows[0][2], 'Ana Test'); assert.strictEqual(rows[0][5], 'Fruitvale'); });
t('a written Name and Neighborhood are never replaced', () => { assert.strictEqual(rows[1][2], 'Benny Row'); assert.strictEqual(rows[1][5], 'Uptown'); });
t('a POPID the ledger lacks keeps its blanks; a wall-clock date still becomes the in-world stamp', () => { assert.strictEqual(rows[2][2], ''); assert.strictEqual(rows[2][0], 'Y3C13'); });
t('bareCycleStampToInWorld_ converts by its own number', () => { assert.strictEqual(sb.bareCycleStampToInWorld_('C105'), 'Y3C1'); assert.strictEqual(sb.bareCycleStampToInWorld_('C52'), 'Y1C52'); assert.strictEqual(sb.bareCycleStampToInWorld_('Y3C13'), null); });
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
