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
  'ensure: ensureEngine94SheetContract_,' +
  'seeds214: ENGINE214_CONFIG_SEEDS,' +
  'ensure214: ensureEngine214Config_' +
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
check('A1 fifteen config seeds are code-carried', C.seeds.length === 15 && C.seeds[0][0] === 'folkMemoryWindow' && C.seeds[0][1] === 8);
check('A2 seed key/value/description payload matches both migration scripts',
  JSON.stringify(C.seeds.slice(1).map(row => row.slice(0, 3))) === JSON.stringify(migrationRows));
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
  check('B1 all fifteen missing config rows seeded', result.configSeeded === 15);
  check('B2 all three missing civic headers added', result.civicHeadersAdded === 3);
  check('B3 post-write config is complete', configPlan.additions.length === 0);
  check('B4 post-write civic header is complete', headerPlan.additions.length === 0);
  check('B5 existing world config row preserved', f.config.values[1][0] === 'cycleCount' && f.config.values[1][1] === 115);
  const writesAfterFirst = f.config.state.writes + f.civic.state.writes;
  const second = C.ensure(f.ss);
  check('B6 second run is idempotent', second.configSeeded === 0 && second.civicHeadersAdded === 0);
  check('B7 idempotent run performs no writes', f.config.state.writes + f.civic.state.writes === writesAfterFirst);
}

console.log('═══ B2. engine.214 string-valued seeds (cluster anchors)');
{
  check('B2.1 five string seeds, each marked string, each a pipe list', C.seeds214.length === 5 &&
    C.seeds214.every(s => s[3] === 'string' && /^clusterAnchors_[A-Z_]+$/.test(s[0]) && typeof s[1] === 'string' && s[1].indexOf('|') > 0));
  const f = makeSpreadsheet([['Key', 'Value', 'Description'], ['cycleCount', 115, 'current Cycle']], ['OfficeId', 'Status', 'Approval']);
  const first = C.ensure214(f.ss);
  check('B2.2 fresh sheet seeds the five as text', first.configSeeded === 5 &&
    f.config.values.slice(2).every(r => typeof r[1] === 'string' && r[1].indexOf('|') > 0));
  check('B2.3 second run is idempotent', C.ensure214(f.ss).configSeeded === 0);
  const tuned = [['Key', 'Value', 'Description']].concat(C.seeds214.map(r => [r[0], r[1], r[2]]));
  tuned[1][1] = '  Downtown | Uptown  ';
  const plan = C.inspectConfig(tuned, C.seeds214);
  check('B2.4 a tuned text row survives, trimmed', plan.additions.length === 0 && plan.normalized[C.seeds214[0][0]] === 'Downtown | Uptown');
  const bad = v => { const rows = tuned.map(r => r.slice()); rows[1][1] = v; return () => C.inspectConfig(rows, C.seeds214); };
  check('B2.5 a number in a text row is invalid', throws(bad(5), /invalid World_Config\.clusterAnchors_DOWNTOWN_CORE/));
  check('B2.6 a blank text row is invalid', throws(bad('   '), /invalid World_Config\.clusterAnchors_DOWNTOWN_CORE/));
  check('B2.7 a boolean text row is invalid', throws(bad(true), /invalid World_Config\.clusterAnchors_DOWNTOWN_CORE/));
  check('B2.8 the numeric lists are untouched by the string branch', C.seeds.every(s => typeof s[3] === 'number'));
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
