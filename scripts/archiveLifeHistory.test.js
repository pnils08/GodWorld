/**
 * engine.38 B1 — unit test for maintainLifeHistoryLog_ (cycle-path log trim).
 * Whole-file load + Apps Script sheet stub. Verifies: (1) cheap no-op below the
 * row trigger, (2) correct trim-to-retain above it (old cycles -> archive,
 * recent retained), (3) the current cycle's rows are never trimmed.
 * Run: node scripts/archiveLifeHistory.test.js
 */
const fs = require('fs');
const path = require('path');

let logged = [];
global.Logger = { log: (m) => logged.push(m) };
global.openSimSpreadsheet_ = () => { throw new Error('cycle path must not re-open the spreadsheet'); };

// Minimal Apps Script sheet stub: header + data rows, supports the methods the
// archiver uses (getLastRow, getDataRange, getRange.setValues/clearContent,
// getMaxRows, getLastColumn, deleteRows, insertSheet).
function makeSheet(header, rows) {
  const s = {
    _h: header.slice(), _rows: rows.map(r => r.slice()),
    getLastRow() { return this._rows.length + 1; },
    getLastColumn() { return this._h.length; },
    getMaxRows() { return this._rows.length + 1; },
    getDataRange() { const self = this; return { getValues: () => [self._h].concat(self._rows) }; },
    getRange(row, col, nRows, nCols) {
      const self = this;
      return {
        setValues(vals) {
          for (let i = 0; i < vals.length; i++) {
            const tgt = row - 2 + i; // row 2 = data row 0
            if (row === 1) { self._h = vals[i].slice(); continue; }
            self._rows[tgt] = vals[i].slice();
          }
        },
        clearContent() {
          for (let i = 0; i < nRows; i++) self._rows[row - 2 + i] = self._h.map(() => '');
        },
      };
    },
    deleteRows(start, n) { this._rows.splice(start - 2, n); },
  };
  return s;
}

function makeSS(logSheet) {
  const sheets = { 'LifeHistory_Log': logSheet };
  return {
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => { sheets[n] = makeSheet(logSheet._h, []); return sheets[n]; },
    _sheets: sheets,
  };
}

const src = fs.readFileSync(path.resolve(__dirname, '../utilities/archiveLifeHistory.js'), 'utf8');
const mod = new Function(src + '\nreturn { maintainLifeHistoryLog_, CYCLE_TRIGGER_ROWS, CYCLE_RETAIN_CYCLES };')();
const { maintainLifeHistoryLog_, CYCLE_TRIGGER_ROWS, CYCLE_RETAIN_CYCLES } = mod;

const HEADER = ['Timestamp', 'POPID', 'Name', 'EventTag', 'EventText', 'Neighborhood', 'Cycle'];
let pass = 0, fail = 0;
const ok = (label, cond, detail) => cond ? (console.log('  ok   ' + label), pass++)
  : (console.error('  FAIL ' + label + (detail ? ': ' + detail : '')), fail++);

// build N rows/cycle across cycles [maxCycle-span+1 .. maxCycle]
function buildLog(maxCycle, span, perCycle) {
  const rows = [];
  for (let c = maxCycle - span + 1; c <= maxCycle; c++)
    for (let k = 0; k < perCycle; k++)
      rows.push(['2041-01-01', 'POP-' + c + '-' + k, 'N', 'Tag', 'text', 'Temescal', c]);
  return rows;
}

// ── Test 1: below trigger → no-op (no archive sheet created, rows untouched) ──
{
  logged = [];
  const small = buildLog(104, 6, 100); // 600 rows < 12000 trigger
  const log = makeSheet(HEADER, small);
  const ss = makeSS(log);
  const before = log._rows.length;
  maintainLifeHistoryLog_({ ss });
  ok('T1 below trigger is a no-op (rows unchanged)', log._rows.length === before, log._rows.length + ' vs ' + before);
  ok('T1 below trigger creates no archive sheet', !ss._sheets['LifeHistory_Archive']);
}

// ── Test 2: above trigger → trims to retain window, archives the rest ──
{
  logged = [];
  // 20 cycles x 700/cycle = 14000 rows > 12000 trigger; retain 12 cycles
  const big = buildLog(120, 20, 700);
  const log = makeSheet(HEADER, big);
  const ss = makeSS(log);
  maintainLifeHistoryLog_({ ss });
  const iCyc = HEADER.indexOf('Cycle');
  const remaining = log._rows.filter(r => r[iCyc] !== '');
  const minRemaining = Math.min(...remaining.map(r => Number(r[iCyc])));
  const cutoff = 120 - CYCLE_RETAIN_CYCLES; // rows with cycle <= cutoff archived
  ok('T2 trims above trigger (row count dropped)', remaining.length < 14000, String(remaining.length));
  ok('T2 retains exactly the last ' + CYCLE_RETAIN_CYCLES + ' cycles', minRemaining === cutoff + 1, 'minCycle=' + minRemaining + ' want=' + (cutoff + 1));
  ok('T2 active log bounded under trigger after trim', remaining.length <= CYCLE_TRIGGER_ROWS, String(remaining.length));
  const arch = ss._sheets['LifeHistory_Archive'];
  ok('T2 archive sheet created + populated', !!arch && arch._rows.length > 0, arch ? String(arch._rows.length) : 'none');
  ok('T2 nothing lost (archived + retained == original)', arch._rows.length + remaining.length === 14000,
    arch._rows.length + '+' + remaining.length);
  ok('T2 current cycle (120) fully retained', remaining.filter(r => Number(r[iCyc]) === 120).length === 700,
    String(remaining.filter(r => Number(r[iCyc]) === 120).length));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
