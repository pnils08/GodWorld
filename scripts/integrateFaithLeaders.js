#!/usr/bin/env node
/**
 * integrateFaithLeaders.js — Phase 16.1
 *
 * Adds faith organization leaders to Simulation_Ledger as Tier 2 citizens.
 * Backfills LeaderPOPID column on Faith_Organizations.
 *
 * Usage:
 *   node scripts/integrateFaithLeaders.js --dry-run   # Preview
 *   node scripts/integrateFaithLeaders.js              # Apply
 *
 * Phase 16 — Citizen Ledger Consolidation
 */

var path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

var sheets = require('../lib/sheets');

var DRY_RUN = process.argv.includes('--dry-run');

/**
 * Deterministic hash for birth year generation.
 * Places faith leaders between 1971-2001 (ages 40-70 in 2041).
 */
function hashName(name) {
  var h = 0;
  for (var i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function birthYearFromName(name) {
  var hash = hashName(name);
  // Range: 1971-2001 (31 possible years, ages 40-70 in 2041)
  return 1971 + (hash % 31);
}

/**
 * Parse leader name into First / Last.
 * Handles: "Rev. Margaret Chen", "Dr. Jacqueline Thompson",
 * "Bishop Robert Jackson Sr.", "Imam Abdul Rahman",
 * "Bhai Gurpreet Singh", "Larry Yang", "Rabbi Dev Noily"
 */
function parseLeaderName(raw) {
  var name = raw.trim();

  // Strip common titles/prefixes
  var titles = ['Rev.', 'Dr.', 'Bishop', 'Imam', 'Rabbi', 'Fr.', 'Pandit', 'Bhai'];
  for (var t = 0; t < titles.length; t++) {
    if (name.indexOf(titles[t]) === 0) {
      name = name.substring(titles[t].length).trim();
      break;
    }
  }

  // Strip suffixes
  name = name.replace(/\s+(Sr\.|Jr\.|III|II|IV)$/, '');

  var parts = name.split(/\s+/);
  if (parts.length === 1) {
    return { first: parts[0], middle: '', last: '' };
  }
  if (parts.length === 2) {
    return { first: parts[0], middle: '', last: parts[1] };
  }
  // 3+ parts: first + middle(s) + last
  return {
    first: parts[0],
    middle: parts.slice(1, -1).join(' '),
    last: parts[parts.length - 1]
  };
}

/**
 * Derive RoleType from the leader's title and org character.
 * Most map to "Senior Pastor / Faith Leader".
 * Larry Yang is a lay teacher, maps to "Community Organizer".
 */
function deriveRoleType(leaderName, orgCharacter) {
  if (leaderName === 'Larry Yang') {
    return 'Community Organizer';
  }
  return 'Senior Pastor / Faith Leader';
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RUN ===');
  console.log('');

  // ---------------------------------------------------------------
  // 1. Read Faith_Organizations
  // ---------------------------------------------------------------
  console.log('Reading Faith_Organizations...');
  var faithData = await sheets.getSheetData('Faith_Organizations');
  var faithHeader = faithData[0];
  var faithRows = faithData.slice(1);

  var iFaithOrg = faithHeader.indexOf('Organization');
  var iFaithLeader = faithHeader.indexOf('Leader');
  var iFaithNeighborhood = faithHeader.indexOf('Neighborhood');
  var iFaithCharacter = faithHeader.indexOf('Character');
  var iFaithTradition = faithHeader.indexOf('FaithTradition');
  var iFaithActive = faithHeader.indexOf('ActiveStatus');

  console.log('  Found ' + faithRows.length + ' organizations');
  console.log('');

  // ---------------------------------------------------------------
  // 2. Read Simulation_Ledger to get header and find max POP-ID
  // ---------------------------------------------------------------
  console.log('Reading Simulation_Ledger...');
  var ledgerData = await sheets.getSheetData('Simulation_Ledger');
  var slHeader = ledgerData[0];
  var slRows = ledgerData.slice(1);

  function col(name) { return slHeader.indexOf(name); }

  var iPopId = col('POPID');
  var iFirst = col('First');
  var iMiddle = col('Middle');
  // Handle the "Middle " with trailing space from CSV
  if (iMiddle < 0) iMiddle = col('Middle ');
  var iLast = col('Last');
  var iOriginGame = col('OriginGame');
  var iUNI = col('UNI (y/n)');
  var iMED = col('MED (y/n)');
  var iCIV = col('CIV (y/n)');
  var iClockMode = col('ClockMode');
  var iTier = col('Tier');
  var iRoleType = col('RoleType');
  var iStatus = col('Status');
  var iBirthYear = col('BirthYear');
  var iOriginCity = col('OrginCity');
  var iLifeHistory = col('LifeHistory');
  var iNeighborhood = col('Neighborhood');
  var iTrait = col('TraitProfile');

  // Find max POP-ID
  var maxPop = 0;
  for (var r = 0; r < slRows.length; r++) {
    var popStr = (slRows[r][iPopId] || '').toString().trim();
    var match = popStr.match(/POP-(\d+)/);
    if (match) {
      var num = parseInt(match[1], 10);
      if (num > maxPop) maxPop = num;
    }
  }
  console.log('  Current max POP-ID: POP-' + String(maxPop).padStart(5, '0'));
  console.log('  Ledger has ' + slRows.length + ' rows, ' + slHeader.length + ' columns');
  console.log('');

  // Check for existing faith leaders (avoid duplicates)
  var existingNames = {};
  for (var r2 = 0; r2 < slRows.length; r2++) {
    var first = (slRows[r2][iFirst] || '').toString().trim();
    var last = (slRows[r2][iLast] || '').toString().trim();
    if (first && last) {
      existingNames[first.toLowerCase() + ' ' + last.toLowerCase()] = slRows[r2][iPopId];
    }
  }

  // ---------------------------------------------------------------
  // 3. Build new rows for each faith leader
  // ---------------------------------------------------------------
  console.log('--- FAITH LEADER INTEGRATION ---');

  var newRows = [];
  var leaderPopIds = {}; // orgName → POP-ID for backfill
  var nextPop = maxPop + 1;
  var skipped = 0;

  for (var f = 0; f < faithRows.length; f++) {
    var row = faithRows[f];
    var orgName = (row[iFaithOrg] || '').toString().trim();
    var leaderRaw = (row[iFaithLeader] || '').toString().trim();
    var neighborhood = (row[iFaithNeighborhood] || '').toString().trim();
    var character = (row[iFaithCharacter] || '').toString().trim();
    var tradition = (row[iFaithTradition] || '').toString().trim();
    var activeStatus = (row[iFaithActive] || '').toString().trim();

    if (!leaderRaw || activeStatus.toLowerCase() !== 'active') {
      console.log('  SKIP: ' + orgName + ' (no leader or inactive)');
      skipped++;
      continue;
    }

    var parsed = parseLeaderName(leaderRaw);
    var nameKey = parsed.first.toLowerCase() + ' ' + parsed.last.toLowerCase();

    // Check if already exists
    if (existingNames[nameKey]) {
      console.log('  SKIP: ' + leaderRaw + ' — already on SL as ' + existingNames[nameKey]);
      leaderPopIds[orgName] = existingNames[nameKey];
      skipped++;
      continue;
    }

    var popId = 'POP-' + String(nextPop).padStart(5, '0');
    var birthYear = birthYearFromName(parsed.first + ' ' + parsed.last);
    var roleType = deriveRoleType(leaderRaw, character);

    // Build life history string
    var lifeHistory = '[Faith] ' + leaderRaw + ', leader of ' + orgName + ' (' + tradition + '). ' + character + '.';

    // Build a full row matching SL header length
    var newRow = new Array(slHeader.length).fill('');
    newRow[iPopId] = popId;
    newRow[iFirst] = parsed.first;
    if (iMiddle >= 0) newRow[iMiddle] = parsed.middle;
    newRow[iLast] = parsed.last;
    newRow[iOriginGame] = 'GodWorld';
    if (iUNI >= 0) newRow[iUNI] = 'No';
    if (iMED >= 0) newRow[iMED] = 'No';
    if (iCIV >= 0) newRow[iCIV] = 'Yes';
    newRow[iClockMode] = 'LIFE';
    newRow[iTier] = 2;
    newRow[iRoleType] = roleType;
    newRow[iStatus] = 'Active';
    newRow[iBirthYear] = birthYear;
    if (iOriginCity >= 0) newRow[iOriginCity] = 'Oakland';
    if (iLifeHistory >= 0) newRow[iLifeHistory] = lifeHistory;
    if (iNeighborhood >= 0) newRow[iNeighborhood] = neighborhood;
    if (iTrait >= 0) newRow[iTrait] = 'Archetype:Anchor|tone:plain|Motifs:community,conviction|Source:faith-leader';

    console.log('  ' + popId + ': ' + parsed.first + ' ' + parsed.last);
    console.log('    Org: ' + orgName + ' (' + tradition + ')');
    console.log('    Neighborhood: ' + neighborhood);
    console.log('    BirthYear: ' + birthYear + ' (age ' + (2041 - birthYear) + ' in 2041)');
    console.log('    RoleType: ' + roleType);
    console.log('');

    newRows.push(newRow);
    leaderPopIds[orgName] = popId;
    nextPop++;
  }

  // ---------------------------------------------------------------
  // 4. Summary
  // ---------------------------------------------------------------
  console.log('=== SUMMARY ===');
  console.log('  New citizens to add: ' + newRows.length);
  console.log('  Skipped (existing/inactive): ' + skipped);
  console.log('  POP-ID range: POP-' + String(maxPop + 1).padStart(5, '0') + ' — POP-' + String(maxPop + newRows.length).padStart(5, '0'));
  console.log('');

  if (DRY_RUN) {
    console.log('=== DRY RUN COMPLETE — no changes written ===');
    console.log('');
    console.log('Leader POP-ID assignments (for Faith_Organizations backfill):');
    var orgNames = Object.keys(leaderPopIds);
    for (var k = 0; k < orgNames.length; k++) {
      console.log('  ' + orgNames[k] + ' → ' + leaderPopIds[orgNames[k]]);
    }
    return;
  }

  // ---------------------------------------------------------------
  // 5. Write new rows to Simulation_Ledger
  // ---------------------------------------------------------------
  console.log('Appending ' + newRows.length + ' rows to Simulation_Ledger...');
  await sheets.appendRows('Simulation_Ledger', newRows);
  console.log('  Done.');
  console.log('');

  // ---------------------------------------------------------------
  // 6. Backfill LeaderPOPID column on Faith_Organizations
  // ---------------------------------------------------------------
  console.log('Backfilling LeaderPOPID on Faith_Organizations...');

  // Check if LeaderPOPID column already exists
  var iLeaderPopId = faithHeader.indexOf('LeaderPOPID');
  if (iLeaderPopId < 0) {
    // Add the column header
    var newColIdx = faithHeader.length;
    var colLetter = colIdxToLetter(newColIdx);
    console.log('  Adding LeaderPOPID column at position ' + colLetter);

    await sheets.updateRange(
      'Faith_Organizations!' + colLetter + '1',
      [['LeaderPOPID']]
    );
    iLeaderPopId = newColIdx;
  }

  // Build batch updates for the LeaderPOPID values
  var backfillUpdates = [];
  var colLtr = colIdxToLetter(iLeaderPopId);
  for (var bf = 0; bf < faithRows.length; bf++) {
    var org = (faithRows[bf][iFaithOrg] || '').toString().trim();
    var assignedPop = leaderPopIds[org];
    if (assignedPop) {
      backfillUpdates.push({
        range: 'Faith_Organizations!' + colLtr + (bf + 2),
        values: [[assignedPop]]
      });
    }
  }

  if (backfillUpdates.length > 0) {
    await sheets.batchUpdate(backfillUpdates);
    console.log('  Wrote ' + backfillUpdates.length + ' LeaderPOPID values.');
  }

  console.log('');
  console.log('=== COMPLETE ===');
  console.log('  Simulation_Ledger: +' + newRows.length + ' faith leaders (Tier 2)');
  console.log('  Faith_Organizations: LeaderPOPID column populated');
}

function colIdxToLetter(idx) {
  if (idx < 26) return String.fromCharCode(65 + idx);
  return String.fromCharCode(64 + Math.floor(idx / 26)) + String.fromCharCode(65 + (idx % 26));
}

main().catch(function(err) {
  console.error('FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
