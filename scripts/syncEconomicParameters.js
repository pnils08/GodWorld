#!/usr/bin/env node
/**
 * syncEconomicParameters.js — push data/economic_parameters.json (the canonical
 * edit point) to its two copies: the Apps Script ECONOMIC_PARAMETERS constant
 * and the live Economic_Parameters sheet tab. One direction only: JSON → copies.
 *
 * Plans: docs/archive/plans/2026-04-28-intake-side-citizen-derivation.md §Task 4.3
 *        docs/plans/2026-09-10-economic-parameters-one-source.md (engine.198/199)
 *
 * Apps Script can't require() JSON, so utilities/citizenDerivation.js carries the
 * catalog embedded as a JS array literal (default mode). The sheet tab is read by
 * buildIntakeSalaryPools_ (--sheet mode). Run both after editing the JSON.
 *
 * Usage:
 *   node scripts/syncEconomicParameters.js                  # write embedded block
 *   node scripts/syncEconomicParameters.js --check          # exit 1 if block out of sync
 *   node scripts/syncEconomicParameters.js --sheet          # append missing roles to the tab
 *   node scripts/syncEconomicParameters.js --sheet --check  # exit 1 if tab != JSON
 *
 * --sheet appends roles the tab lacks, in JSON order. It never rewrites or deletes:
 * field drift, sheet-only roles, or an order mismatch mean someone edited the tab
 * by hand — it reports them and exits 1 so a person decides.
 */

const fs = require('fs');
const path = require('path');

const SRC_JSON = path.resolve(__dirname, '..', 'data', 'economic_parameters.json');
const DST_GS = path.resolve(__dirname, '..', 'utilities', 'citizenDerivation.js');

const START_MARKER = '// ═══ ECONOMIC_PARAMETERS_START ═══ DO NOT EDIT MANUALLY ═══';
const END_MARKER = '// ═══ ECONOMIC_PARAMETERS_END ═══';

function buildBlock(parameters) {
  // One entry per line, two-space indent inside the array, sorted by category
  // for stable diffs (entries within a category preserve JSON order).
  const lines = [];
  lines.push(START_MARKER);
  lines.push('// Re-generate via: node scripts/syncEconomicParameters.js');
  lines.push('// Source: data/economic_parameters.json (' + parameters.length + ' entries)');
  lines.push('var ECONOMIC_PARAMETERS = [');
  for (let i = 0; i < parameters.length; i++) {
    const p = parameters[i];
    const trailing = i < parameters.length - 1 ? ',' : '';
    lines.push('  ' + JSON.stringify(p) + trailing);
  }
  lines.push('];');
  lines.push(END_MARKER);
  return lines.join('\n');
}

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

async function syncSheet(parameters, checkOnly) {
  require('../lib/env');
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

  const parameters = JSON.parse(fs.readFileSync(SRC_JSON, 'utf-8'));

  if (args.includes('--sheet')) {
    return syncSheet(parameters, checkOnly).catch(e => {
      console.error('ERROR: ' + e.message);
      process.exit(1);
    });
  }
  const newBlock = buildBlock(parameters);

  const existing = fs.readFileSync(DST_GS, 'utf-8');
  const startIdx = existing.indexOf(START_MARKER);
  const endIdx = existing.indexOf(END_MARKER);

  if (startIdx < 0 || endIdx < 0) {
    console.error('ERROR: marker block not found in ' + DST_GS);
    console.error('  Expected START: ' + START_MARKER);
    console.error('  Expected END:   ' + END_MARKER);
    process.exit(1);
  }

  const before = existing.slice(0, startIdx);
  const after = existing.slice(endIdx + END_MARKER.length);
  const replaced = before + newBlock + after;

  if (replaced === existing) {
    console.log('ECONOMIC_PARAMETERS already in sync (' + parameters.length + ' entries).');
    return;
  }

  if (checkOnly) {
    console.error('OUT OF SYNC: utilities/citizenDerivation.js ECONOMIC_PARAMETERS block does not match data/economic_parameters.json.');
    console.error('Run: node scripts/syncEconomicParameters.js');
    process.exit(1);
  }

  fs.writeFileSync(DST_GS, replaced);
  console.log('Wrote ECONOMIC_PARAMETERS block: ' + parameters.length + ' entries.');
  console.log('  Source: ' + SRC_JSON);
  console.log('  Target: ' + DST_GS);
}

main();
