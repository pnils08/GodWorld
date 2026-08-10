/**
 * engine94SheetContract.test.js — offline first-live-Cycle safety contract.
 * Run: node scripts/engine94SheetContract.test.js
 */

const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../phase01-config/engine94SheetContract.js'), 'utf8'
);
const C = new Function(source + '\nreturn {' +
  'seeds: ENGINE94_CONFIG_SEEDS,' +
  'columns: ENGINE94_CIVIC_STATE_COLUMNS,' +
  'inspectConfig: inspectEngine94Config_,' +
  'inspectHeader: inspectEngine94CivicHeader_,' +
  'ensure: ensureEngine94SheetContract_' +
  '};')();

global.Logger = { log() {} };

let passed = 0;
let failed = 0;
function check(name, condition, detail) {
  if (condition) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}
function throws(fn, pattern) {
  try { fn(); } catch (error) { return pattern.test(String(error && error.message)); }
  return false;
}
function clone(values) { return values.map(row => row.slice()); }

function makeSheet(initial, maxColumns) {
  const values = clone(initial);
  const state = { writes: 0, inserts: 0 };
  function cell(row, col) {
    while (values.length < row) values.push([]);
    while (values[row - 1].length < col) values[row - 1].push('');
    return values[row - 1];
  }
  function lastRow() {
    let last = 0;
    for (let r = 0; r < values.length; r++) {
      if ((values[r] || []).some(value => String(value || '').trim())) last = r + 1;
    }
    return last;
  }
  function lastColumn() {
    let last = 0;
    for (const row of values) {
      for (let c = 0; c < row.length; c++) {
        if (String(row[c] || '').trim()) last = Math.max(last, c + 1);
      }
    }
    return last;
  }
  const sheet = {
    state,
    values,
    getLastRow: lastRow,
    getLastColumn: lastColumn,
    getMaxColumns: () => maxColumns,
    insertColumnsAfter(position, count) {
      if (position !== maxColumns) throw new Error('unexpected insert position');
      maxColumns += count;
      state.inserts += count;
    },
    getDataRange() {
      return { getValues: () => clone(values.slice(0, lastRow()).map(row => row.slice(0, lastColumn()))) };
    },
    getRange(row, col, numRows, numCols) {
      return {
        getValues() {
          const out = [];
          for (let r = 0; r < numRows; r++) {
            const sourceRow = values[row + r - 1] || [];
            out.push(sourceRow.slice(col - 1, col - 1 + numCols));
            while (out[out.length - 1].length < numCols) out[out.length - 1].push('');
          }
          return out;
        },
        setValues(next) {
          if (next.length !== numRows || next.some(item => item.length !== numCols)) {
            throw new Error('setValues shape mismatch');
          }
          for (let r = 0; r < numRows; r++) {
            const target = cell(row + r, col + numCols - 1);
            for (let c = 0; c < numCols; c++) target[col + c - 1] = next[r][c];
          }
          state.writes++;
          return this;
        }
      };
    }
  };
  return sheet;
}

function makeSpreadsheet(configRows, civicHeader, maxColumns = 26) {
  const config = makeSheet(configRows, 3);
  const civic = makeSheet([civicHeader], maxColumns);
  return {
    config,
    civic,
    ss: {
      getSheetByName(name) {
        if (name === 'World_Config') return config;
        if (name === 'Civic_Office_Ledger') return civic;
        return null;
      }
    }
  };
}

const griefMigration = require('./applyGriefWorldConfig.js');
const approvalMigration = require('./applyApprovalCeilingConfig.js');
const migrationRows = griefMigration.CONFIG_ROWS.concat(approvalMigration.CONFIG_ROWS);

console.log('═══ A. Code-carried payload matches reviewed migrations');
check('A1 fourteen config seeds are code-carried', C.seeds.length === 14);
check('A2 seed key/value/description payload matches both migration scripts',
  JSON.stringify(C.seeds.map(row => row.slice(0, 3))) === JSON.stringify(migrationRows));
check('A3 three state columns match the migration script',
  JSON.stringify(C.columns) === JSON.stringify(approvalMigration.CIVIC_COLUMNS));

console.log('═══ B. Fresh live Sheet self-arms before consumers');
{
  const f = makeSpreadsheet(
    [['Key', 'Value', 'Description'], ['cycleCount', 115, 'current Cycle']],
    ['OfficeId', 'Title', 'Status', 'Approval']
  );
  const result = C.ensure(f.ss);
  const configPlan = C.inspectConfig(f.config.getDataRange().getValues());
  const headerPlan = C.inspectHeader(f.civic.values[0]);
  check('B1 all fourteen missing config rows seeded', result.configSeeded === 14);
  check('B2 all three missing civic headers added', result.civicHeadersAdded === 3);
  check('B3 post-write config is complete', configPlan.additions.length === 0);
  check('B4 post-write civic header is complete', headerPlan.additions.length === 0);
  check('B5 existing world config row preserved', f.config.values[1][0] === 'cycleCount' && f.config.values[1][1] === 115);
  const writesAfterFirst = f.config.state.writes + f.civic.state.writes;
  const second = C.ensure(f.ss);
  check('B6 second run is idempotent', second.configSeeded === 0 && second.civicHeadersAdded === 0);
  check('B7 idempotent run performs no writes', f.config.state.writes + f.civic.state.writes === writesAfterFirst);
}

console.log('═══ C. Tuning survives; invalid state blocks before writes');
{
  const tunedRows = [['Key', 'Value', 'Description']].concat(
    C.seeds.map(row => [row[0], row[1], row[2]])
  );
  tunedRows.find(row => row[0] === 'approvalCeilingThreshold')[1] = 82;
  const f = makeSpreadsheet(tunedRows, ['OfficeId', 'Status', 'Approval'].concat(C.columns));
  const result = C.ensure(f.ss);
  check('C1 valid operator tuning is preserved',
    f.config.values.find(row => row[0] === 'approvalCeilingThreshold')[1] === 82);
  check('C2 tuned complete contract writes nothing', result.configSeeded === 0 && result.civicHeadersAdded === 0 &&
    f.config.state.writes === 0 && f.civic.state.writes === 0);
}
{
  const badRows = [['Key', 'Value', 'Description']].concat(
    C.seeds.map(row => [row[0], row[1], row[2]])
  );
  badRows.find(row => row[0] === 'griefResponseChance')[1] = 9;
  const f = makeSpreadsheet(badRows, ['OfficeId', 'Status', 'Approval']);
  check('C3 invalid config fails before schema mutation', throws(() => C.ensure(f.ss), /griefResponseChance/));
  check('C4 invalid config produced zero writes', f.config.state.writes === 0 && f.civic.state.writes === 0);
}
{
  const duplicateRows = [['Key', 'Value', 'Description'],
    ['approvalCeilingThreshold', 80, 'one'], ['approvalCeilingThreshold', 80, 'two']];
  const f = makeSpreadsheet(duplicateRows, ['OfficeId', 'Status', 'Approval']);
  check('C5 duplicate config fails before writes', throws(() => C.ensure(f.ss), /duplicate/));
  check('C6 duplicate config produced zero writes', f.config.state.writes === 0 && f.civic.state.writes === 0);
}
{
  const f = makeSpreadsheet([['Key', 'Value', 'Description']],
    ['OfficeId', 'Status', 'Approval', 'AutoScandalUntilCycle']);
  check('C7 out-of-order header fails before config seeding', throws(() => C.ensure(f.ss), /prefix|contiguous/));
  check('C8 header conflict produced zero writes', f.config.state.writes === 0 && f.civic.state.writes === 0);
}

console.log('═══ D. Interrupted migration and entry-order fence');
{
  const f = makeSpreadsheet([['Key', 'Value', 'Description']],
    ['OfficeId', 'Status', 'Approval', 'HighApprovalStreak'], 4);
  const result = C.ensure(f.ss);
  check('D1 interrupted header prefix adds only the remainder', result.civicHeadersAdded === 2);
  check('D2 grid expands safely when needed', f.civic.state.inserts === 2);
  check('D3 completed headers remain ordered',
    C.inspectHeader(f.civic.values[0]).additions.length === 0);
}
{
  const engineSource = fs.readFileSync(
    path.resolve(__dirname, '../phase01-config/godWorldEngine2.js'), 'utf8'
  );
  const ensureAt = engineSource.indexOf('ensureEngine94SheetContract_(ss);');
  const cacheAt = engineSource.indexOf('var cache = createSheetCache_(ss);');
  const ledgerAt = engineSource.indexOf('initSimulationLedger_(ctx);');
  check('D4 self-arm call exists in live entry', ensureAt >= 0);
  check('D5 self-arm precedes cache creation', ensureAt >= 0 && ensureAt < cacheAt);
  check('D6 self-arm precedes ledger initialization', ensureAt >= 0 && ensureAt < ledgerAt);
}

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
