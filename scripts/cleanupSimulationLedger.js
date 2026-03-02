#!/usr/bin/env node
/**
 * cleanupSimulationLedger.js — Phase 17: SL Data Integrity Cleanup
 *
 * Fixes audit findings from the Simulation_Ledger batch audit:
 *   1. Duplicate names — rename higher POP-ID to new unique citizen
 *   2. Neighborhood normalization — fix invalid/variant names
 *   3. Status case normalization — "active" → "Active"
 *   4. ClockMode case normalization — "engine"/"game"/"active" → proper case
 *   5. Birth year corrections — citizens over 80 or under 18
 *   6. Bare position codes on non-GAME citizens — assign real civilian roles
 *
 * Usage:
 *   node scripts/cleanupSimulationLedger.js --dry-run   # Preview all changes
 *   node scripts/cleanupSimulationLedger.js              # Apply to live sheet
 */

var path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

var sheets = require('../lib/sheets');

var DRY_RUN = process.argv.includes('--dry-run');

// ============================================================
// CONFIGURATION
// ============================================================

/**
 * Valid Oakland neighborhoods for the simulation.
 * "Piedmont Avenue" → "Piedmont Ave" normalization.
 * Chicago/invalid neighborhoods get remapped.
 */
var VALID_NEIGHBORHOODS = [
  'Adams Point', 'Brooklyn', 'Chinatown', 'Coliseum District',
  'Dimond', 'Downtown', 'East Oakland', 'Eastlake', 'Fruitvale',
  'Glenview', 'Grand Lake', 'Ivy Hill', 'Jack London', 'KONO',
  'Lake Merritt', 'Laurel', 'Montclair', 'Montclair Hills',
  'Piedmont Ave', 'Rockridge', 'San Antonio', 'Temescal',
  'Uptown', 'West Oakland'
];

/**
 * Map invalid neighborhood values to valid ones.
 */
var NEIGHBORHOOD_MAP = {
  'Piedmont Avenue': 'Piedmont Ave',
  'Bridgeport': null,       // Chicago — reassign
  'Near North Side': null,  // Chicago — reassign
  'Coliseum': 'Coliseum District',
  'traveling': null,        // reassign
  'Oakland': null           // too generic — reassign
};

/**
 * Underrepresented neighborhoods to distribute reassigned citizens into.
 * These have 0 or very few citizens.
 */
var UNDERREP_NEIGHBORHOODS = [
  'Dimond', 'Glenview', 'Grand Lake', 'San Antonio',
  'Brooklyn', 'KONO', 'Ivy Hill', 'Eastlake', 'Montclair Hills'
];

/**
 * Replacement names for duplicate POP-IDs.
 * 24 names (covers 22 duplicate pairs + 2 extras for Patrick Wright triple).
 * Diverse, Oakland-appropriate, no collisions with existing ledger names.
 */
var REPLACEMENT_CITIZENS = [
  { first: 'Kenji', last: 'Okafor' },
  { first: 'Priya', last: 'Marchetti' },
  { first: 'Tomás', last: 'Xiong' },
  { first: 'Aaliyah', last: 'Brennan' },
  { first: 'Dmitri', last: 'Soto' },
  { first: 'Farah', last: 'Lindqvist' },
  { first: 'Joaquín', last: 'Nakamura' },
  { first: 'Simone', last: 'Adesanya' },
  { first: 'Ravi', last: 'O\'Connell' },
  { first: 'Lucía', last: 'Petrov' },
  { first: 'Kwame', last: 'Fitzgerald' },
  { first: 'Ingrid', last: 'Bautista' },
  { first: 'Yusuf', last: 'Carmichael' },
  { first: 'Annika', last: 'Delgado' },
  { first: 'Cedric', last: 'Yamamoto' },
  { first: 'Thalia', last: 'Okwu' },
  { first: 'Hassan', last: 'Montero' },
  { first: 'Soleil', last: 'Kapoor' },
  { first: 'Dante', last: 'Eriksson' },
  { first: 'Marisol', last: 'Achebe' },
  { first: 'Nikolai', last: 'Fuentes' },
  { first: 'Zara', last: 'McAllister' },
  { first: 'Eamon', last: 'Salazar' },
  { first: 'Amara', last: 'Johansson' }
];

/**
 * Civilian roles to replace bare position codes on non-GAME citizens.
 * Neighborhood-appropriate, 2041 job market.
 */
var CIVILIAN_ROLES = [
  'Sports Analytics Consultant',
  'Youth Baseball Coach',
  'Athletic Training Specialist',
  'Sports Physical Therapist',
  'Recreation Program Director',
  'Sports Equipment Technician',
  'Athletic Facilities Manager',
  'Baseball Academy Instructor',
  'Sports Broadcasting Technician'
];

// ============================================================
// HELPERS
// ============================================================

function colLetter(idx) {
  var result = '';
  var n = idx;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

// Deterministic picker using POP-ID number
function pickByPopId(popId, arr) {
  var match = popId.match(/POP-(\d+)/);
  var num = match ? parseInt(match[1], 10) : 0;
  return arr[num % arr.length];
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RUN ===');
  console.log('');

  // ---------------------------------------------------------------
  // 1. Read Simulation_Ledger
  // ---------------------------------------------------------------
  console.log('Reading Simulation_Ledger...');
  var ledgerData = await sheets.getSheetData('Simulation_Ledger');
  var header = ledgerData[0];
  var rows = ledgerData.slice(1);

  function col(name) { return header.indexOf(name); }

  var iPopId = col('POPID');
  var iFirst = col('First');
  var iMiddle = col('Middle');
  if (iMiddle < 0) iMiddle = col('Middle ');
  var iLast = col('Last');
  var iOriginGame = col('OriginGame');
  var iClockMode = col('ClockMode');
  var iTier = col('Tier');
  var iRoleType = col('RoleType');
  var iStatus = col('Status');
  var iBirthYear = col('BirthYear');
  var iNeighborhood = col('Neighborhood');
  var iOriginCity = col('OrginCity');

  console.log('  Loaded ' + rows.length + ' citizens, ' + header.length + ' columns');
  console.log('');

  // Build lookup: name → [row indices]
  var nameMap = {};
  for (var r = 0; r < rows.length; r++) {
    var first = (rows[r][iFirst] || '').toString().trim();
    var last = (rows[r][iLast] || '').toString().trim();
    var fullName = first + ' ' + last;
    if (!nameMap[fullName]) nameMap[fullName] = [];
    nameMap[fullName].push(r);
  }

  // Collect all batchUpdate requests
  var updates = [];
  var stats = {
    duplicatesRenamed: 0,
    neighborhoodFixed: 0,
    statusFixed: 0,
    clockModeFixed: 0,
    birthYearFixed: 0,
    bareCodesFixed: 0
  };

  var replacementIdx = 0;

  // ---------------------------------------------------------------
  // FIX 1: Duplicate Names — rename higher POP-ID to new citizen
  // ---------------------------------------------------------------
  console.log('=== FIX 1: DUPLICATE NAMES ===');

  // POP-IDs to skip — already fixed in live sheet by prepAthleteIntegration.js
  var SKIP_DUPLICATES = ['Buford Park', 'Mark Aitken'];

  for (var name in nameMap) {
    var indices = nameMap[name];
    if (indices.length < 2) continue;

    if (SKIP_DUPLICATES.indexOf(name) >= 0) {
      console.log('  SKIP: ' + name + ' (already fixed in live sheet)');
      continue;
    }

    // Sort by POP-ID ascending; keep lowest, rename rest
    indices.sort(function(a, b) {
      var popA = parseInt(((rows[a][iPopId] || '').match(/POP-(\d+)/) || [0, 0])[1], 10);
      var popB = parseInt(((rows[b][iPopId] || '').match(/POP-(\d+)/) || [0, 0])[1], 10);
      return popA - popB;
    });

    // Rename all but first
    for (var d = 1; d < indices.length; d++) {
      var rowIdx = indices[d];
      var sheetRow = rowIdx + 2; // 1-indexed header + 1
      var popId = (rows[rowIdx][iPopId] || '').toString().trim();

      if (replacementIdx >= REPLACEMENT_CITIZENS.length) {
        console.log('  ERROR: Ran out of replacement names!');
        break;
      }

      var newCitizen = REPLACEMENT_CITIZENS[replacementIdx++];

      console.log('  ' + popId + ': ' + name + ' → ' + newCitizen.first + ' ' + newCitizen.last);

      updates.push({
        range: 'Simulation_Ledger!' + colLetter(iFirst) + sheetRow,
        values: [[newCitizen.first]]
      });
      updates.push({
        range: 'Simulation_Ledger!' + colLetter(iLast) + sheetRow,
        values: [[newCitizen.last]]
      });
      // Clear middle name for renamed citizens
      if (iMiddle >= 0) {
        updates.push({
          range: 'Simulation_Ledger!' + colLetter(iMiddle) + sheetRow,
          values: [['']]
        });
      }

      stats.duplicatesRenamed++;
    }
  }
  console.log('  Total: ' + stats.duplicatesRenamed + ' citizens renamed');
  console.log('');

  // ---------------------------------------------------------------
  // FIX 2: Neighborhood Normalization
  // ---------------------------------------------------------------
  console.log('=== FIX 2: NEIGHBORHOOD NORMALIZATION ===');

  var underrepIdx = 0;

  for (var r2 = 0; r2 < rows.length; r2++) {
    var hood = (rows[r2][iNeighborhood] || '').toString().trim();
    if (!hood) continue;

    if (hood in NEIGHBORHOOD_MAP) {
      var sheetRow2 = r2 + 2;
      var popId2 = (rows[r2][iPopId] || '').toString().trim();
      var newHood = NEIGHBORHOOD_MAP[hood];

      if (newHood === null) {
        // Reassign to underrepresented neighborhood
        newHood = UNDERREP_NEIGHBORHOODS[underrepIdx % UNDERREP_NEIGHBORHOODS.length];
        underrepIdx++;
      }

      console.log('  ' + popId2 + ': "' + hood + '" → "' + newHood + '"');

      updates.push({
        range: 'Simulation_Ledger!' + colLetter(iNeighborhood) + sheetRow2,
        values: [[newHood]]
      });
      stats.neighborhoodFixed++;
    }
  }
  console.log('  Total: ' + stats.neighborhoodFixed + ' neighborhoods fixed');
  console.log('');

  // ---------------------------------------------------------------
  // FIX 3: Status Case Normalization
  // ---------------------------------------------------------------
  console.log('=== FIX 3: STATUS NORMALIZATION ===');

  var STATUS_MAP = {
    'active': 'Active',
    'retired': 'Retired',
    'Inactive': 'Retired',
    'deceased': 'Retired'
  };

  // Valid statuses for ballplayers
  var PLAYER_STATUS_MAP = {
    'Traded': 'Retired',     // Traded away = no longer active in Oakland
    'Departed': 'Retired',
    'Injured': 'Active',     // Injured players are still active citizens
    'Serious Condition': 'Active'
  };

  for (var r3 = 0; r3 < rows.length; r3++) {
    var status = (rows[r3][iStatus] || '').toString().trim();
    var clockMode = (rows[r3][iClockMode] || '').toString().trim();
    var popId3 = (rows[r3][iPopId] || '').toString().trim();
    var sheetRow3 = r3 + 2;

    var newStatus = null;

    if (STATUS_MAP[status]) {
      newStatus = STATUS_MAP[status];
    } else if (PLAYER_STATUS_MAP[status]) {
      newStatus = PLAYER_STATUS_MAP[status];
    }

    if (newStatus) {
      console.log('  ' + popId3 + ': Status "' + status + '" → "' + newStatus + '"');
      updates.push({
        range: 'Simulation_Ledger!' + colLetter(iStatus) + sheetRow3,
        values: [[newStatus]]
      });
      stats.statusFixed++;
    }
  }
  console.log('  Total: ' + stats.statusFixed + ' status values fixed');
  console.log('');

  // ---------------------------------------------------------------
  // FIX 4: ClockMode Case Normalization
  // ---------------------------------------------------------------
  console.log('=== FIX 4: CLOCKMODE NORMALIZATION ===');

  var CLOCK_MAP = {
    'engine': 'ENGINE',
    'game': 'GAME',
    'life': 'LIFE',
    'active': 'ENGINE'  // "active" isn't a ClockMode — default to ENGINE
  };

  for (var r4 = 0; r4 < rows.length; r4++) {
    var cm = (rows[r4][iClockMode] || '').toString().trim();
    var popId4 = (rows[r4][iPopId] || '').toString().trim();
    var sheetRow4 = r4 + 2;

    if (CLOCK_MAP[cm]) {
      console.log('  ' + popId4 + ': ClockMode "' + cm + '" → "' + CLOCK_MAP[cm] + '"');
      updates.push({
        range: 'Simulation_Ledger!' + colLetter(iClockMode) + sheetRow4,
        values: [[CLOCK_MAP[cm]]]
      });
      stats.clockModeFixed++;
    }
  }
  console.log('  Total: ' + stats.clockModeFixed + ' ClockMode values fixed');
  console.log('');

  // ---------------------------------------------------------------
  // FIX 5: Birth Year Corrections
  // ---------------------------------------------------------------
  console.log('=== FIX 5: BIRTH YEAR CORRECTIONS ===');

  for (var r5 = 0; r5 < rows.length; r5++) {
    var by = parseInt((rows[r5][iBirthYear] || '').toString().trim(), 10);
    var popId5 = (rows[r5][iPopId] || '').toString().trim();
    var sheetRow5 = r5 + 2;

    if (isNaN(by)) continue;

    var age2041 = 2041 - by;
    var newBy = null;

    if (age2041 > 80) {
      // Shift forward by 15 years (same pattern as Phase 13)
      newBy = by + 15;
      console.log('  ' + popId5 + ': BirthYear ' + by + ' (age ' + age2041 + ') → ' + newBy + ' (age ' + (2041 - newBy) + ')');
    } else if (age2041 < 18) {
      // Too young for a working citizen — shift back
      newBy = 2041 - 25; // Make them 25
      console.log('  ' + popId5 + ': BirthYear ' + by + ' (age ' + age2041 + ') → ' + newBy + ' (age 25)');
    }

    if (newBy) {
      updates.push({
        range: 'Simulation_Ledger!' + colLetter(iBirthYear) + sheetRow5,
        values: [[newBy]]
      });
      stats.birthYearFixed++;
    }
  }
  console.log('  Total: ' + stats.birthYearFixed + ' birth years fixed');
  console.log('');

  // ---------------------------------------------------------------
  // FIX 6: Bare Position Codes on Non-GAME Citizens
  // ---------------------------------------------------------------
  console.log('=== FIX 6: BARE POSITION CODES ===');

  var BARE_CODES = ['SP', 'RP', 'C', 'CF', 'RF', 'LF', 'SS', '1B', '2B', '3B', 'DH', 'CP', 'OF'];

  for (var r6 = 0; r6 < rows.length; r6++) {
    var role = (rows[r6][iRoleType] || '').toString().trim();
    var cm6 = (rows[r6][iClockMode] || '').toString().trim().toUpperCase();
    var popId6 = (rows[r6][iPopId] || '').toString().trim();
    var sheetRow6 = r6 + 2;

    if (BARE_CODES.indexOf(role) >= 0 && cm6 !== 'GAME') {
      var civRole = CIVILIAN_ROLES[stats.bareCodesFixed % CIVILIAN_ROLES.length];
      console.log('  ' + popId6 + ': "' + role + '" → "' + civRole + '" (ClockMode=' + cm6 + ')');
      updates.push({
        range: 'Simulation_Ledger!' + colLetter(iRoleType) + sheetRow6,
        values: [[civRole]]
      });

      // Also fix ClockMode if it's not ENGINE/LIFE
      if (cm6 !== 'ENGINE' && cm6 !== 'LIFE') {
        updates.push({
          range: 'Simulation_Ledger!' + colLetter(iClockMode) + sheetRow6,
          values: [['ENGINE']]
        });
      }

      stats.bareCodesFixed++;
    }
  }
  console.log('  Total: ' + stats.bareCodesFixed + ' bare position codes replaced');
  console.log('');

  // ---------------------------------------------------------------
  // SUMMARY & APPLY
  // ---------------------------------------------------------------
  var totalFixes = stats.duplicatesRenamed + stats.neighborhoodFixed +
    stats.statusFixed + stats.clockModeFixed + stats.birthYearFixed +
    stats.bareCodesFixed;

  console.log('========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log('  Duplicates renamed:    ' + stats.duplicatesRenamed);
  console.log('  Neighborhoods fixed:   ' + stats.neighborhoodFixed);
  console.log('  Status normalized:     ' + stats.statusFixed);
  console.log('  ClockMode normalized:  ' + stats.clockModeFixed);
  console.log('  Birth years corrected: ' + stats.birthYearFixed);
  console.log('  Bare codes replaced:   ' + stats.bareCodesFixed);
  console.log('  ─────────────────────');
  console.log('  Total cell updates:    ' + updates.length);
  console.log('  Total citizens fixed:  ' + totalFixes);
  console.log('');

  if (DRY_RUN) {
    console.log('DRY RUN — no changes written. Run without --dry-run to apply.');
    return;
  }

  if (updates.length === 0) {
    console.log('No updates needed. Ledger is clean!');
    return;
  }

  // Apply in batches of 50 (API limit-friendly)
  var BATCH_SIZE = 50;
  var batches = Math.ceil(updates.length / BATCH_SIZE);
  console.log('Applying ' + updates.length + ' updates in ' + batches + ' batches...');

  for (var b = 0; b < batches; b++) {
    var slice = updates.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    await sheets.batchUpdate(slice);
    console.log('  Batch ' + (b + 1) + '/' + batches + ' written (' + slice.length + ' cells)');
  }

  console.log('');
  console.log('All updates applied successfully.');
  console.log('Live Simulation_Ledger is now clean.');
}

main().catch(function(err) {
  console.error('FATAL:', err.message || err);
  process.exit(1);
});
