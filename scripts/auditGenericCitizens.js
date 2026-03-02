#!/usr/bin/env node
/**
 * auditGenericCitizens.js — Phase 16.2
 *
 * Read-only audit of Generic_Citizens.
 * Cross-references emerged citizens against Simulation_Ledger.
 * Reports gaps and emergence pipeline health.
 *
 * Usage:
 *   node scripts/auditGenericCitizens.js
 *
 * Phase 16 — Citizen Ledger Consolidation
 */

var path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

var sheets = require('../lib/sheets');

async function main() {
  console.log('=== GENERIC_CITIZENS AUDIT ===');
  console.log('');

  // ---------------------------------------------------------------
  // 1. Read Generic_Citizens
  // ---------------------------------------------------------------
  console.log('Reading Generic_Citizens...');
  var gcData = await sheets.getSheetData('Generic_Citizens');
  var gcHeader = gcData[0];
  var gcRows = gcData.slice(1);

  var iFirst = gcHeader.indexOf('First');
  var iLast = gcHeader.indexOf('Last');
  var iAge = gcHeader.indexOf('Age');
  var iBirthYear = gcHeader.indexOf('BirthYear');
  var iNeighborhood = gcHeader.indexOf('Neighborhood');
  var iOccupation = gcHeader.indexOf('Occupation');
  var iEmCount = gcHeader.indexOf('EmergenceCount');
  var iEmCycle = gcHeader.indexOf('EmergedCycle');
  var iEmContext = gcHeader.indexOf('EmergenceContext');
  var iStatus = gcHeader.indexOf('Status');

  console.log('  Total: ' + gcRows.length + ' citizens');
  console.log('  Columns: ' + gcHeader.join(', '));
  console.log('');

  // ---------------------------------------------------------------
  // 2. Read Simulation_Ledger for cross-reference
  // ---------------------------------------------------------------
  console.log('Reading Simulation_Ledger...');
  var slData = await sheets.getSheetData('Simulation_Ledger');
  var slHeader = slData[0];
  var slRows = slData.slice(1);

  var slFirst = slHeader.indexOf('First');
  var slLast = slHeader.indexOf('Last');
  var slPopId = slHeader.indexOf('POPID');

  // Build SL name index
  var slNames = {};
  for (var s = 0; s < slRows.length; s++) {
    var first = (slRows[s][slFirst] || '').toString().trim().toLowerCase();
    var last = (slRows[s][slLast] || '').toString().trim().toLowerCase();
    if (first && last) {
      slNames[first + ' ' + last] = (slRows[s][slPopId] || '').toString().trim();
    }
  }

  console.log('  SL has ' + slRows.length + ' citizens');
  console.log('');

  // ---------------------------------------------------------------
  // 3. Analyze Generic_Citizens
  // ---------------------------------------------------------------
  var stats = {
    total: gcRows.length,
    active: 0,
    emerged: 0,
    emergedOnSL: 0,
    emergedMissingSL: [],
    withEmergenceCount: 0,
    neighborhoods: {},
    occupations: {}
  };

  var emerged = [];

  for (var g = 0; g < gcRows.length; g++) {
    var row = gcRows[g];
    var gFirst = (row[iFirst] || '').toString().trim();
    var gLast = (row[iLast] || '').toString().trim();
    var status = (row[iStatus] || '').toString().trim();
    var emCount = parseInt(row[iEmCount] || '0', 10);
    var emCycle = (row[iEmCycle] || '').toString().trim();
    var neighborhood = (row[iNeighborhood] || '').toString().trim();
    var occupation = (row[iOccupation] || '').toString().trim();

    // Count neighborhoods
    if (neighborhood) {
      stats.neighborhoods[neighborhood] = (stats.neighborhoods[neighborhood] || 0) + 1;
    }

    // Count occupations
    if (occupation) {
      stats.occupations[occupation] = (stats.occupations[occupation] || 0) + 1;
    }

    if (status === 'Active') stats.active++;
    if (emCount > 0) stats.withEmergenceCount++;

    if (status === 'Emerged') {
      stats.emerged++;
      var nameKey = gFirst.toLowerCase() + ' ' + gLast.toLowerCase();
      var slPop = slNames[nameKey];

      emerged.push({
        name: gFirst + ' ' + gLast,
        emCount: emCount,
        emCycle: emCycle,
        neighborhood: neighborhood,
        occupation: occupation,
        onSL: !!slPop,
        slPopId: slPop || 'NOT FOUND'
      });

      if (slPop) {
        stats.emergedOnSL++;
      } else {
        stats.emergedMissingSL.push(gFirst + ' ' + gLast);
      }
    }
  }

  // ---------------------------------------------------------------
  // 4. Report
  // ---------------------------------------------------------------
  console.log('--- STATUS BREAKDOWN ---');
  console.log('  Active (extras pool): ' + stats.active);
  console.log('  Emerged: ' + stats.emerged);
  console.log('  With EmergenceCount > 0: ' + stats.withEmergenceCount);
  console.log('');

  console.log('--- EMERGED CITIZENS ---');
  for (var e = 0; e < emerged.length; e++) {
    var em = emerged[e];
    var slStatus = em.onSL ? ('on SL as ' + em.slPopId) : 'MISSING from SL';
    console.log('  ' + em.name + ' — ' + em.occupation + ', ' + em.neighborhood);
    console.log('    EmergenceCount: ' + em.emCount + ', Cycle: ' + (em.emCycle || 'none'));
    console.log('    SL Status: ' + slStatus);
  }
  console.log('');

  if (stats.emergedMissingSL.length > 0) {
    console.log('--- GAP: EMERGED BUT NOT ON SIMULATION_LEDGER ---');
    for (var m = 0; m < stats.emergedMissingSL.length; m++) {
      console.log('  ' + stats.emergedMissingSL[m]);
    }
    console.log('');
    console.log('  These citizens were marked Emerged but never made it to SL.');
    console.log('  They should be promoted or their Emerged status is incorrect.');
  } else {
    console.log('  All emerged citizens are on Simulation_Ledger.');
  }
  console.log('');

  console.log('--- NEIGHBORHOOD DISTRIBUTION ---');
  var hoodNames = Object.keys(stats.neighborhoods).sort(function(a, b) {
    return stats.neighborhoods[b] - stats.neighborhoods[a];
  });
  for (var h = 0; h < hoodNames.length; h++) {
    console.log('  ' + hoodNames[h] + ': ' + stats.neighborhoods[hoodNames[h]]);
  }
  console.log('');

  console.log('--- OCCUPATION BREAKDOWN ---');
  var occNames = Object.keys(stats.occupations).sort(function(a, b) {
    return stats.occupations[b] - stats.occupations[a];
  });
  for (var o = 0; o < occNames.length; o++) {
    console.log('  ' + occNames[o] + ': ' + stats.occupations[occNames[o]]);
  }
  console.log('');

  console.log('=== AUDIT COMPLETE ===');
  console.log('  Total Generic_Citizens: ' + stats.total);
  console.log('  Emerged: ' + stats.emerged + ' (' + stats.emergedOnSL + ' on SL, ' + stats.emergedMissingSL.length + ' missing)');
  console.log('  Recommendation: Keep emergence engine. ' + (stats.emergedMissingSL.length > 0 ? 'Fix ' + stats.emergedMissingSL.length + ' gaps.' : 'No gaps.'));
}

main().catch(function(err) {
  console.error('FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
