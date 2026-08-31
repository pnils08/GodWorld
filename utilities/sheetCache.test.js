/**
 * engine.136 — flush() write isolation.
 *
 * Regression cover for the defect that lost bench C110's cycleCount: every
 * write in flush() ran bare, so one Google transient on one cell threw out of
 * the whole function and abandoned every queued write behind it — silently,
 * because stats.errors only ever carried "sheet not found".
 *
 * Apps Script source, so it is vm-loaded with a fake spreadsheet rather than
 * required. Run: node utilities/sheetCache.test.js
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const sandbox = { Logger: { log: () => {} }, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, 'sheetCache.js'), 'utf8'),
  sandbox,
  { filename: 'sheetCache.js' }
);

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
}

/**
 * Fake spreadsheet. `poison` names cells ("Tab!row,col") whose write throws,
 * standing in for a Sheets transient. Everything that lands is recorded.
 */
function mkSS(opts) {
  opts = opts || {};
  const poison = opts.poison || [];
  const landed = [];
  const appended = [];

  function mkSheet(name) {
    return {
      getLastRow: () => 10,
      getDataRange: () => ({ getValues: () => [['Key', 'Value'], ['a', 1], ['b', 2]] }),
      getRange: (row, col, numRows, numCols) => ({
        setValue: (v) => {
          if (poison.indexOf(name + '!' + row + ',' + col) >= 0) {
            throw new Error('Service Spreadsheets timed out');
          }
          landed.push({ sheet: name, row, col, value: v });
        },
        setValues: (vals) => {
          if (poison.indexOf(name + '!' + row + ',' + col) >= 0) {
            throw new Error('Service Spreadsheets timed out');
          }
          // flush() issues appends at getLastRow() + 1 (== 11 here) starting
          // at column 1; anything else is a positioned write.
          if (row === 11 && col === 1) {
            vals.forEach(v => appended.push({ sheet: name, values: v }));
          } else {
            landed.push({ sheet: name, row, col, values: vals[0] });
          }
        }
      }),
      getName: () => name
    };
  }

  return {
    ss: {
      getSheetByName: (n) => (opts.missing && opts.missing.indexOf(n) >= 0) ? null : mkSheet(n),
      insertSheet: (n) => mkSheet(n)
    },
    landed,
    appended
  };
}

console.log('flush() write isolation:');

// 1. Healthy flush — nothing poisoned, every write lands, no errors.
let f = mkSS();
let cache = sandbox.createSheetCache_(f.ss);
cache.queueWrite('World_Config', 2, 2, 111);
cache.queueWrite('World_Config', 5, 2, 'ts');
cache.queueWrite('World_Population', 2, 3, 940);
let stats = cache.flush();
check('healthy: 3 writes counted', stats.writes === 3);
check('healthy: no errors', stats.errors.length === 0);
check('healthy: all 3 landed', f.landed.length === 3);

// 2. THE C110 SHAPE — the first queued cell throws. Before engine.136 this
//    aborted the entire flush; the writes behind it must now still land.
f = mkSS({ poison: ['World_Config!2,2'] });
cache = sandbox.createSheetCache_(f.ss);
cache.queueWrite('World_Config', 2, 2, 111);   // cycleCount — poisoned
cache.queueWrite('World_Config', 5, 2, 'ts');  // lastRun
cache.queueWrite('World_Population', 2, 3, 940);
let threw = false;
try { stats = cache.flush(); } catch (e) { threw = true; }
check('poisoned cell: flush does not throw', !threw);
check('poisoned cell: survivors still landed', f.landed.length === 2);
check('poisoned cell: later SHEET still written', f.landed.some(w => w.sheet === 'World_Population'));
check('poisoned cell: exactly one error recorded', stats.errors.length === 1);
check('poisoned cell: error names the cell', /World_Config!R2C2/.test(stats.errors[0]));
check('poisoned cell: error carries the cause', /timed out/.test(stats.errors[0]));
check('poisoned cell: writes counts only successes', stats.writes === 2);

// 3. A failed append must not abandon the append queues behind it.
f = mkSS({ poison: ['LifeHistory_Log!11,1'] });
cache = sandbox.createSheetCache_(f.ss);
cache.queueAppend('LifeHistory_Log', ['a', 'b']);
cache.queueAppend('Carry_Forward_Store', ['c', 'd']);
threw = false;
try { stats = cache.flush(); } catch (e) { threw = true; }
check('poisoned append: no throw', !threw);
check('poisoned append: second tab still appended', f.appended.some(a => a.sheet === 'Carry_Forward_Store'));
check('poisoned append: error recorded', stats.errors.length === 1 && /LifeHistory_Log append/.test(stats.errors[0]));
check('poisoned append: appends counts only successes', stats.appends === 1);

// 4. Missing sheet keeps its existing behaviour (recorded, not thrown).
f = mkSS({ missing: ['Ghost_Tab'] });
cache = sandbox.createSheetCache_(f.ss);
cache.queueWrite('Ghost_Tab', 2, 2, 1);
cache.queueWrite('World_Config', 2, 2, 111);
stats = cache.flush();
check('missing sheet: recorded as error', stats.errors.some(e => /Sheet not found: Ghost_Tab/.test(e)));
check('missing sheet: other tab still written', f.landed.length === 1);

// 5. Queues clear even when a write failed — a retry must not double-write.
f = mkSS({ poison: ['World_Config!2,2'] });
cache = sandbox.createSheetCache_(f.ss);
cache.queueWrite('World_Config', 2, 2, 111);
cache.flush();
const second = cache.flush();
check('queue cleared after failure', second.writes === 0 && second.errors.length === 0);

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
