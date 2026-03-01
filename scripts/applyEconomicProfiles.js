#!/usr/bin/env node
/**
 * Apply Economic Profiles to Simulation_Ledger
 *
 * Reads each citizen's RoleType, maps it to an economic parameter profile,
 * calculates role-specific income, and writes Income, WealthLevel, SavingsRate,
 * and EconomicProfileKey back to the ledger.
 *
 * Usage:
 *   node scripts/applyEconomicProfiles.js --dry-run    # Preview changes
 *   node scripts/applyEconomicProfiles.js               # Apply changes
 *
 * Phase A of the Economic Parameter Wiring plan (Phase 14.1 in Rollout Plan).
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const sheets = require('../lib/sheets');
const econ = require('../lib/economicLookup');
const fs = require('fs');

const DRY_RUN = process.argv.includes('--dry-run');

// Seeded RNG for deterministic results
const RNG_SEED = 20410801; // Oakland 2041, Cycle 84 (August 1)
let rngState = RNG_SEED;
function rng() {
  rngState = (rngState * 16807) % 2147483647;
  return (rngState - 1) / 2147483646;
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RUN ===');
  console.log('');

  // Load mapping and parameters
  const roleMappingPath = path.resolve(__dirname, '..', 'data', 'role_mapping.json');
  const econParamsPath = path.resolve(__dirname, '..', 'data', 'economic_parameters.json');

  const roleMapping = JSON.parse(fs.readFileSync(roleMappingPath, 'utf8'));
  const econParams = JSON.parse(fs.readFileSync(econParamsPath, 'utf8'));
  const paramIndex = econ.buildParamIndex(econParams);

  console.log('Loaded', Object.keys(roleMapping).length - 1, 'role mappings'); // -1 for _meta
  console.log('Loaded', econParams.length, 'economic profiles');
  console.log('');

  // Read Simulation_Ledger
  const ledgerData = await sheets.getSheetData('Simulation_Ledger');
  if (ledgerData.length < 2) {
    console.error('ERROR: Simulation_Ledger is empty or missing');
    process.exit(1);
  }

  const headers = ledgerData[0];
  const rows = ledgerData.slice(1);

  // Find column indices
  function col(name) {
    var idx = headers.indexOf(name);
    if (idx === -1) console.warn('  WARN: Column "' + name + '" not found');
    return idx;
  }

  const iPopId = col('POPID');
  const iFirst = col('First');
  const iLast = col('Last');
  const iTier = col('Tier');
  const iRoleType = col('RoleType');
  const iStatus = col('Status');
  const iNeighborhood = col('Neighborhood');
  const iIncome = col('Income');
  const iWealthLevel = col('WealthLevel');
  const iSavingsRate = col('SavingsRate');
  const iNetWorth = col('NetWorth');

  if (iPopId < 0 || iRoleType < 0 || iStatus < 0 || iIncome < 0) {
    console.error('ERROR: Missing required columns');
    process.exit(1);
  }

  // Check if EconomicProfileKey column exists, note its position
  let iEconKey = headers.indexOf('EconomicProfileKey');
  const needNewColumn = iEconKey === -1;
  if (needNewColumn) {
    iEconKey = headers.length; // Will be added as the next column
    console.log('Will add new column: EconomicProfileKey at position', iEconKey + 1);
  }

  // Process each citizen
  const results = {
    updated: 0,
    sportsSkipped: 0,
    unmapped: [],
    inactiveSkipped: 0,
    byNeighborhood: {},
    byCategory: {},
    incomes: []
  };

  const changes = [];

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const popId = (row[iPopId] || '').toString().trim();
    const name = ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim();
    const status = (row[iStatus] || '').toString().toLowerCase().trim();
    const roleType = (row[iRoleType] || '').toString().trim();
    const tier = parseInt(row[iTier]) || 4;
    const neighborhood = (row[iNeighborhood] || '').toString().trim();
    const currentIncome = parseFloat(row[iIncome]) || 0;
    const netWorth = parseFloat(row[iNetWorth]) || 0;

    // Skip inactive/deceased citizens
    if (status === 'deceased' || status === 'inactive' || status === 'departed') {
      results.inactiveSkipped++;
      continue;
    }

    // Skip citizens without a role
    if (!roleType) {
      results.unmapped.push({ popId: popId, name: name, reason: 'no RoleType' });
      continue;
    }

    // Look up profile
    const profile = econ.lookupProfile(roleType, roleMapping, paramIndex);

    // Handle sports override
    if (roleMapping[roleType] === 'SPORTS_OVERRIDE') {
      results.sportsSkipped++;
      // Still set the EconomicProfileKey
      changes.push({
        row: r,
        popId: popId,
        name: name,
        roleType: roleType,
        econKey: 'SPORTS_OVERRIDE',
        income: null,
        wealthLevel: null,
        savingsRate: null,
        isSports: true
      });
      continue;
    }

    // Handle unmapped roles
    if (!profile) {
      results.unmapped.push({ popId: popId, name: name, roleType: roleType, reason: 'no mapping found' });
      continue;
    }

    // Calculate income
    const isRetired = econ.isRetiredRole(roleType);
    const income = econ.calculateIncome(profile, tier, rng, { isRetired: isRetired });
    const wealthLevel = econ.deriveWealthLevel(income, netWorth);
    const savingsRate = econ.deriveSavingsRate(profile.consumerProfile, income, rng);
    const econKey = roleMapping[roleType];

    changes.push({
      row: r,
      popId: popId,
      name: name,
      roleType: roleType,
      econKey: econKey,
      income: income,
      wealthLevel: wealthLevel,
      savingsRate: Math.round(savingsRate * 1000) / 1000,
      oldIncome: currentIncome,
      profile: profile.role,
      category: profile.category,
      neighborhood: neighborhood,
      tier: tier,
      isSports: false,
      isRetired: isRetired
    });

    results.updated++;
    results.incomes.push(income);

    // Aggregate by neighborhood
    if (neighborhood) {
      if (!results.byNeighborhood[neighborhood]) {
        results.byNeighborhood[neighborhood] = { incomes: [], count: 0 };
      }
      results.byNeighborhood[neighborhood].incomes.push(income);
      results.byNeighborhood[neighborhood].count++;
    }

    // Aggregate by category
    var cat = profile.category || 'Unknown';
    if (!results.byCategory[cat]) {
      results.byCategory[cat] = { incomes: [], count: 0 };
    }
    results.byCategory[cat].incomes.push(income);
    results.byCategory[cat].count++;
  }

  // === REPORT ===
  console.log('--- RESULTS ---');
  console.log('Citizens updated:', results.updated);
  console.log('Sports overrides skipped:', results.sportsSkipped);
  console.log('Inactive/deceased skipped:', results.inactiveSkipped);
  if (results.unmapped.length > 0) {
    console.log('UNMAPPED (' + results.unmapped.length + '):');
    results.unmapped.forEach(function(u) {
      console.log('  ' + u.popId + ' ' + u.name + ' (' + (u.roleType || 'no role') + '): ' + u.reason);
    });
  }
  console.log('');

  // Income distribution
  var sortedIncomes = results.incomes.slice().sort(function(a, b) { return a - b; });
  var median = sortedIncomes[Math.floor(sortedIncomes.length / 2)] || 0;
  var min = sortedIncomes[0] || 0;
  var max = sortedIncomes[sortedIncomes.length - 1] || 0;
  var mean = results.incomes.reduce(function(a, b) { return a + b; }, 0) / (results.incomes.length || 1);

  console.log('--- INCOME DISTRIBUTION ---');
  console.log('Min: $' + min.toLocaleString());
  console.log('Median: $' + median.toLocaleString());
  console.log('Mean: $' + Math.round(mean).toLocaleString());
  console.log('Max: $' + max.toLocaleString());
  console.log('');

  // Distribution buckets
  var buckets = { under50k: 0, '50k-100k': 0, '100k-150k': 0, '150k-200k': 0, over200k: 0 };
  results.incomes.forEach(function(inc) {
    if (inc < 50000) buckets.under50k++;
    else if (inc < 100000) buckets['50k-100k']++;
    else if (inc < 150000) buckets['100k-150k']++;
    else if (inc < 200000) buckets['150k-200k']++;
    else buckets.over200k++;
  });
  console.log('Brackets:');
  Object.keys(buckets).forEach(function(k) {
    var pct = Math.round(buckets[k] / results.incomes.length * 100);
    console.log('  ' + k + ': ' + buckets[k] + ' (' + pct + '%)');
  });
  console.log('');

  // Neighborhood medians (top 10 and bottom 5)
  var hoodMedians = [];
  Object.keys(results.byNeighborhood).forEach(function(hood) {
    var data = results.byNeighborhood[hood];
    var sorted = data.incomes.slice().sort(function(a, b) { return a - b; });
    var med = sorted[Math.floor(sorted.length / 2)];
    hoodMedians.push({ name: hood, median: med, count: data.count });
  });
  hoodMedians.sort(function(a, b) { return b.median - a.median; });

  console.log('--- NEIGHBORHOOD MEDIANS ---');
  hoodMedians.forEach(function(h) {
    console.log('  ' + h.name + ': $' + h.median.toLocaleString() + ' (n=' + h.count + ')');
  });
  console.log('');

  // Category breakdown
  console.log('--- CATEGORY BREAKDOWN ---');
  var catList = [];
  Object.keys(results.byCategory).forEach(function(cat) {
    var data = results.byCategory[cat];
    var sorted = data.incomes.slice().sort(function(a, b) { return a - b; });
    var med = sorted[Math.floor(sorted.length / 2)];
    catList.push({ name: cat, median: med, count: data.count });
  });
  catList.sort(function(a, b) { return b.median - a.median; });
  catList.forEach(function(c) {
    console.log('  ' + c.name + ': median $' + c.median.toLocaleString() + ' (n=' + c.count + ')');
  });
  console.log('');

  // Sample changes (first 15 civilians)
  var civChanges = changes.filter(function(c) { return !c.isSports; });
  console.log('--- SAMPLE CHANGES (first 15) ---');
  civChanges.slice(0, 15).forEach(function(c) {
    var old = c.oldIncome > 0 ? '$' + c.oldIncome.toLocaleString() : 'none';
    var retired = c.isRetired ? ' [RETIRED]' : '';
    console.log('  ' + c.popId + ' ' + c.name + retired);
    console.log('    ' + c.roleType + ' -> ' + c.econKey);
    console.log('    Income: ' + old + ' -> $' + c.income.toLocaleString() + ' | Wealth: ' + c.wealthLevel + ' | Savings: ' + (c.savingsRate * 100).toFixed(1) + '%');
  });
  console.log('');

  if (DRY_RUN) {
    console.log('=== DRY RUN COMPLETE — no changes written ===');
    console.log('Run without --dry-run to apply changes.');
    return;
  }

  // === WRITE CHANGES ===
  console.log('Writing changes to Simulation_Ledger...');

  // Build batch updates
  var batchUpdates = [];
  var sheetName = 'Simulation_Ledger';

  // If we need a new column header, add it
  if (needNewColumn) {
    var headerCol = String.fromCharCode(65 + (iEconKey % 26));
    if (iEconKey >= 26) {
      headerCol = String.fromCharCode(64 + Math.floor(iEconKey / 26)) + headerCol;
    }
    batchUpdates.push({
      range: sheetName + '!' + headerCol + '1',
      values: [['EconomicProfileKey']]
    });
  }

  // Group updates by column for efficiency
  // We need to update: Income (col iIncome), WealthLevel (col iWealthLevel),
  // SavingsRate (col iSavingsRate), EconomicProfileKey (col iEconKey)
  function colLetter(idx) {
    if (idx < 26) return String.fromCharCode(65 + idx);
    return String.fromCharCode(64 + Math.floor(idx / 26)) + String.fromCharCode(65 + (idx % 26));
  }

  // Build per-row updates
  for (var i = 0; i < changes.length; i++) {
    var change = changes[i];
    var rowNum = change.row + 2; // +1 for header, +1 for 1-based

    if (change.isSports) {
      // Only set EconomicProfileKey for sports
      batchUpdates.push({
        range: sheetName + '!' + colLetter(iEconKey) + rowNum,
        values: [['SPORTS_OVERRIDE']]
      });
    } else {
      // Set Income, WealthLevel, SavingsRate, EconomicProfileKey
      batchUpdates.push({
        range: sheetName + '!' + colLetter(iIncome) + rowNum,
        values: [[change.income]]
      });
      batchUpdates.push({
        range: sheetName + '!' + colLetter(iWealthLevel) + rowNum,
        values: [[change.wealthLevel]]
      });
      if (iSavingsRate >= 0) {
        batchUpdates.push({
          range: sheetName + '!' + colLetter(iSavingsRate) + rowNum,
          values: [[change.savingsRate]]
        });
      }
      batchUpdates.push({
        range: sheetName + '!' + colLetter(iEconKey) + rowNum,
        values: [[change.econKey]]
      });
    }
  }

  console.log('Sending', batchUpdates.length, 'cell updates...');

  // Batch update in chunks (API limit is ~100k cells per request)
  var CHUNK_SIZE = 500;
  for (var c = 0; c < batchUpdates.length; c += CHUNK_SIZE) {
    var chunk = batchUpdates.slice(c, c + CHUNK_SIZE);
    await sheets.batchUpdate(chunk);
    console.log('  Wrote chunk', Math.floor(c / CHUNK_SIZE) + 1, 'of', Math.ceil(batchUpdates.length / CHUNK_SIZE));
  }

  console.log('');
  console.log('=== COMPLETE ===');
  console.log(results.updated, 'citizens updated with role-based economic profiles');
  console.log(results.sportsSkipped, 'sports athletes marked as SPORTS_OVERRIDE');
}

main().catch(function(err) {
  console.error('FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
