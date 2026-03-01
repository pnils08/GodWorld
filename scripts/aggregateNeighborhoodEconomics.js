#!/usr/bin/env node
/**
 * Aggregate Neighborhood Economics from citizen income data.
 *
 * Reads citizen Income by neighborhood, calculates MedianIncome and MedianRent,
 * writes to Neighborhood_Map.
 *
 * Usage:
 *   node scripts/aggregateNeighborhoodEconomics.js --dry-run    # Preview
 *   node scripts/aggregateNeighborhoodEconomics.js               # Apply
 *
 * Phase C2 of the Economic Parameter Wiring plan (Phase 14.3 in Rollout Plan).
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const sheets = require('../lib/sheets');
const fs = require('fs');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RUN ===');
  console.log('');

  // Load economic data for housingBurdenPct
  var roleMappingPath = path.resolve(__dirname, '..', 'data', 'role_mapping.json');
  var econParamsPath = path.resolve(__dirname, '..', 'data', 'economic_parameters.json');

  var roleMapping = JSON.parse(fs.readFileSync(roleMappingPath, 'utf8'));
  var econParams = JSON.parse(fs.readFileSync(econParamsPath, 'utf8'));
  var paramIndex = {};
  for (var i = 0; i < econParams.length; i++) {
    paramIndex[econParams[i].role] = econParams[i];
  }

  // Read Simulation_Ledger
  var ledgerData = await sheets.getSheetData('Simulation_Ledger');
  var header = ledgerData[0];
  var rows = ledgerData.slice(1);

  function col(name) { return header.indexOf(name); }

  var iStatus = col('Status');
  var iNeighborhood = col('Neighborhood');
  var iIncome = col('Income');
  var iEconKey = col('EconomicProfileKey');
  var iRoleType = col('RoleType');

  // Aggregate by neighborhood
  var neighborhoods = {};

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var status = (row[iStatus] || '').toString().toLowerCase().trim();
    if (status === 'deceased' || status === 'inactive' || status === 'departed') continue;

    var econKey = (row[iEconKey] || '').toString().trim();
    if (econKey === 'SPORTS_OVERRIDE') continue;

    var hood = (row[iNeighborhood] || '').toString().trim();
    if (!hood) continue;

    var income = parseFloat(row[iIncome]) || 0;
    if (income <= 0) continue;

    var roleType = (row[iRoleType] || '').toString().trim();
    var mappedName = roleMapping[roleType];
    var profile = mappedName ? paramIndex[mappedName] : null;
    var housingBurden = (profile && profile.housingBurdenPct) ? profile.housingBurdenPct : 0.30;

    var monthlyRent = Math.round(income * housingBurden / 12);

    if (!neighborhoods[hood]) {
      neighborhoods[hood] = { incomes: [], rents: [] };
    }
    neighborhoods[hood].incomes.push(income);
    neighborhoods[hood].rents.push(monthlyRent);
  }

  // Calculate medians
  function median(arr) {
    if (arr.length === 0) return 0;
    var sorted = arr.slice().sort(function(a, b) { return a - b; });
    return sorted[Math.floor(sorted.length / 2)];
  }

  var results = {};
  Object.keys(neighborhoods).forEach(function(hood) {
    var d = neighborhoods[hood];
    results[hood] = {
      medianIncome: median(d.incomes),
      medianRent: median(d.rents),
      citizenCount: d.incomes.length
    };
  });

  // Report
  var hoodList = Object.keys(results).map(function(k) {
    return { name: k, data: results[k] };
  }).sort(function(a, b) { return b.data.medianIncome - a.data.medianIncome; });

  console.log('--- NEIGHBORHOOD ECONOMICS (' + hoodList.length + ' neighborhoods) ---');
  hoodList.forEach(function(h) {
    console.log('  ' + h.name + ': median $' + h.data.medianIncome.toLocaleString() +
                ' | rent $' + h.data.medianRent.toLocaleString() + '/mo' +
                ' | n=' + h.data.citizenCount);
  });
  console.log('');

  if (DRY_RUN) {
    console.log('=== DRY RUN COMPLETE — no changes written ===');
    return;
  }

  // === WRITE TO NEIGHBORHOOD_MAP ===
  console.log('Writing to Neighborhood_Map...');

  var mapData = await sheets.getSheetData('Neighborhood_Map');
  if (mapData.length < 2) {
    console.error('ERROR: Neighborhood_Map is empty');
    process.exit(1);
  }

  var mapHeader = mapData[0];
  var mapRows = mapData.slice(1);

  var iMapHood = mapHeader.indexOf('Neighborhood');
  var iMapMedianIncome = mapHeader.indexOf('MedianIncome');
  var iMapMedianRent = mapHeader.indexOf('MedianRent');

  if (iMapHood < 0 || iMapMedianIncome < 0 || iMapMedianRent < 0) {
    console.error('ERROR: Missing required columns in Neighborhood_Map');
    console.error('  Neighborhood:', iMapHood, '| MedianIncome:', iMapMedianIncome, '| MedianRent:', iMapMedianRent);
    process.exit(1);
  }

  function colLetter(idx) {
    if (idx < 26) return String.fromCharCode(65 + idx);
    return String.fromCharCode(64 + Math.floor(idx / 26)) + String.fromCharCode(65 + (idx % 26));
  }

  var batchUpdates = [];
  var updated = 0;

  for (var mr = 0; mr < mapRows.length; mr++) {
    var mapRow = mapRows[mr];
    var mapHood = (mapRow[iMapHood] || '').toString().trim();

    if (results[mapHood]) {
      var rowNum = mr + 2; // +1 header, +1 for 1-based
      batchUpdates.push({
        range: 'Neighborhood_Map!' + colLetter(iMapMedianIncome) + rowNum,
        values: [[results[mapHood].medianIncome]]
      });
      batchUpdates.push({
        range: 'Neighborhood_Map!' + colLetter(iMapMedianRent) + rowNum,
        values: [[results[mapHood].medianRent]]
      });
      updated++;
    }
  }

  if (batchUpdates.length > 0) {
    await sheets.batchUpdate(batchUpdates);
    console.log('  Updated ' + updated + ' neighborhoods');
  } else {
    console.log('  No matching neighborhoods found to update');
  }

  console.log('');
  console.log('=== COMPLETE ===');
}

main().catch(function(err) {
  console.error('FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
