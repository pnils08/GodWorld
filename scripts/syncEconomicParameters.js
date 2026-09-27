#!/usr/bin/env node
/**
 * syncEconomicParameters.js — push data/economic_parameters.json (the canonical
 * edit point) to the Economic_Parameters sheet tab, the engine's one runtime
 * source (engine.199: economicParameters_ in utilities/citizenDerivation.js reads
 * the tab once per run). One direction only: JSON → tab.
 *
 * Plans: docs/archive/plans/2026-04-28-intake-side-citizen-derivation.md §Task 4.3
 *        docs/plans/2026-09-10-economic-parameters-one-source.md (engine.198/199)
 *
 * Usage:
 *   node scripts/syncEconomicParameters.js           # append missing roles to the tab
 *   node scripts/syncEconomicParameters.js --check   # exit 1 if tab != JSON (pre-deploy)
 *   node scripts/syncEconomicParameters.js --check --sheet-id <id>   # a bench sheet
 *   (--sheet is accepted and ignored — the tab is the only target now)
 *
 * Appends roles the tab lacks, in JSON order. It never rewrites or deletes:
 * field drift, sheet-only roles, or an order mismatch mean someone edited the tab
 * by hand — it reports them and exits 1 so a person decides.
 */

const fs = require('fs');
const path = require('path');

const SRC_JSON = path.resolve(__dirname, '..', 'data', 'economic_parameters.json');

const SHEET_NAME = 'Economic_Parameters';
const SHEET_COLUMNS = [
  ['Role', p => p.role],
  ['Category', p => p.category],
  ['IncomeMin', p => p.incomeRange[0]],
  ['IncomeMax', p => p.incomeRange[1]],
  ['MedianIncome', p => p.medianIncome],
  ['EffectiveTaxRate', p => p.effectiveTaxRate],
  ['EconomicOutputCategory', p => p.economicOutputCategory],
  ['HousingBurdenPct', p => p.housingBurdenPct],
  ['ConsumerProfile', p => p.consumerProfile],
  ['Notes', p => p.notes]
];

function toSheetRow(p) {
  return SHEET_COLUMNS.map(([, get]) => get(p));
}

// Sheet values arrive as formatted strings; compare as strings.
function diffSheet(values, parameters) {
  const header = (values[0] || []).map(h => String(h).trim());
  const expected = SHEET_COLUMNS.map(([name]) => name);
  if (header.join('|') !== expected.join('|')) {
    return { headerError: 'header is [' + header.join(', ') + '], expected [' + expected.join(', ') + ']' };
  }
  const sheetRows = values.slice(1).filter(r => String(r[0] || '').trim());
  const sheetByRole = new Map(sheetRows.map(r => [String(r[0]).trim(), r]));
  const jsonRoles = new Set(parameters.map(p => p.role));

  const missing = parameters.filter(p => !sheetByRole.has(p.role));
  const extra = [...sheetByRole.keys()].filter(role => !jsonRoles.has(role));
  const drift = [];
  for (const p of parameters) {
    const r = sheetByRole.get(p.role);
    if (!r) continue;
    toSheetRow(p).forEach((v, c) => {
      const have = r[c] === undefined ? '' : String(r[c]);
      if (have !== String(v)) drift.push({ role: p.role, column: expected[c], sheet: have, json: String(v) });
    });
  }
  // After appending `missing` in JSON order, would the tab read in JSON order?
  const shared = parameters.filter(p => sheetByRole.has(p.role)).map(p => p.role);
  const sheetOrder = sheetRows.map(r => String(r[0]).trim()).filter(role => jsonRoles.has(role));
  const missingAtTail = missing.every(p => parameters.indexOf(p) >= parameters.length - missing.length);
  const orderOk = shared.join('|') === sheetOrder.join('|') && missingAtTail;

  return { sheetCount: sheetRows.length, missing, extra, drift, orderOk };
}

function reportDiff(d, jsonCount) {
  console.log('Economic_Parameters tab: ' + d.sheetCount + ' rows | JSON: ' + jsonCount +
    ' | missing ' + d.missing.length + ' | sheet-only ' + d.extra.length +
    ' | field drift ' + d.drift.length + ' | order ' + (d.orderOk ? 'ok' : 'MISMATCH'));
  if (d.extra.length) console.log('  sheet-only roles: ' + d.extra.join(', '));
  d.drift.slice(0, 20).forEach(x => console.log('  drift ' + x.role + ' ' + x.column + ': sheet=' + JSON.stringify(x.sheet) + ' json=' + JSON.stringify(x.json)));
  if (d.drift.length > 20) console.log('  ...' + (d.drift.length - 20) + ' more drift cells');
}

async function syncSheet(parameters, checkOnly, sheetId) {
  require('../lib/env');
  if (sheetId) process.env.GODWORLD_SHEET_ID = sheetId; // after lib/env, which would override it
  const sheets = require('../lib/sheets');

  let d = diffSheet(await sheets.getRawSheetData(SHEET_NAME), parameters);
  if (d.headerError) {
    console.error('ERROR: ' + SHEET_NAME + ' ' + d.headerError);
    process.exit(1);
  }
  reportDiff(d, parameters.length);

  const inParity = !d.missing.length && !d.extra.length && !d.drift.length && d.orderOk;
  if (inParity) {
    console.log('Tab already matches JSON row-for-row.');
    return;
  }
  if (checkOnly) {
    console.error('OUT OF SYNC: run node scripts/syncEconomicParameters.js --sheet');
    process.exit(1);
  }
  if (d.extra.length || d.drift.length || !d.orderOk) {
    console.error('REFUSING TO WRITE: the tab was edited by hand (drift / sheet-only roles / order). Reconcile into the JSON first.');
    process.exit(1);
  }

  const appended = await sheets.appendRows(SHEET_NAME, d.missing.map(toSheetRow));
  console.log('Appended ' + appended + ' rows: ' + d.missing.map(p => p.role).join(', '));

  d = diffSheet(await sheets.getRawSheetData(SHEET_NAME), parameters);
  console.log('Read-back:');
  reportDiff(d, parameters.length);
  if (d.headerError || d.missing.length || d.extra.length || d.drift.length || !d.orderOk) process.exit(1);
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const idAt = args.indexOf('--sheet-id');
  const sheetId = idAt >= 0 ? args[idAt + 1] : null;
  if (idAt >= 0 && !sheetId) { console.error('ERROR: --sheet-id needs an id'); process.exit(1); }
  const parameters = JSON.parse(fs.readFileSync(SRC_JSON, 'utf-8'));
  return syncSheet(parameters, checkOnly, sheetId).catch(e => {
    console.error('ERROR: ' + e.message);
    process.exit(1);
  });
}

module.exports = { SHEET_NAME, SHEET_COLUMNS, toSheetRow, diffSheet };

if (require.main === module) main();
