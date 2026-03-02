#!/usr/bin/env node
/**
 * prepAthleteIntegration.js — Pre-integration ledger cleanup
 *
 * Handles duplicate consolidation, backfills, retired status, and
 * Bulls player removal BEFORE running integrateAthletes.js.
 *
 * Usage:
 *   node scripts/prepAthleteIntegration.js --dry-run   # Preview
 *   node scripts/prepAthleteIntegration.js              # Apply
 *
 * Phase 15 prep step.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const sheets = require('../lib/sheets');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RUN ===');
  console.log('');

  // Read Simulation_Ledger
  console.log('Reading Simulation_Ledger...');
  var ledgerData = await sheets.getSheetData('Simulation_Ledger');
  var header = ledgerData[0];
  var rows = ledgerData.slice(1);

  function col(name) { return header.indexOf(name); }
  function colLetter(idx) {
    if (idx < 26) return String.fromCharCode(65 + idx);
    return String.fromCharCode(64 + Math.floor(idx / 26)) + String.fromCharCode(65 + (idx % 26));
  }

  var iPopId = col('POPID');
  var iFirst = col('First');
  var iMiddle = col('Middle');
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
  var iNeighborhood = col('Neighborhood');
  var iTrait = col('TraitProfile');
  var iEconKey = col('EconomicProfileKey');
  var iIncome = col('Income');
  var iWealth = col('WealthLevel');

  // Build row lookup by POPID
  var popIndex = {};
  for (var r = 0; r < rows.length; r++) {
    var popId = (rows[r][iPopId] || '').toString().trim();
    if (popId) popIndex[popId] = { rowIndex: r, rowNum: r + 2, row: rows[r] };
  }

  var batchUpdates = [];

  function queueUpdate(popId, colIdx, newVal, label) {
    var entry = popIndex[popId];
    if (!entry) {
      console.log('  WARNING: ' + popId + ' not found in ledger');
      return;
    }
    var oldVal = (entry.row[colIdx] || '').toString().trim();
    console.log('    ' + label + ': ' + (oldVal || '(empty)') + ' → ' + newVal);
    batchUpdates.push({
      range: 'Simulation_Ledger!' + colLetter(colIdx) + entry.rowNum,
      values: [[newVal]]
    });
  }

  // =====================================================================
  // 1. MARK AITKEN CONSOLIDATION
  //    POP-00003 becomes canonical (Tier 1), POP-00020 gets backfilled
  // =====================================================================
  console.log('--- 1. MARK AITKEN CONSOLIDATION ---');
  console.log('  POP-00003: Promote to Tier 1, add Player Rep title');
  queueUpdate('POP-00003', iTier, 1, 'Tier');
  queueUpdate('POP-00003', iRoleType, '1B — Player Rep, Community Liaison', 'RoleType');

  console.log('');
  console.log('  POP-00020: Backfill → Elena Vásquez, Waterfront Urban Planner');
  queueUpdate('POP-00020', iFirst, 'Elena', 'First');
  queueUpdate('POP-00020', iLast, 'Vásquez', 'Last');
  queueUpdate('POP-00020', iOriginGame, 'GodWorld', 'OriginGame');
  queueUpdate('POP-00020', iClockMode, 'LIFE', 'ClockMode');
  queueUpdate('POP-00020', iTier, 3, 'Tier');
  queueUpdate('POP-00020', iRoleType, 'Waterfront Urban Planner', 'RoleType');
  queueUpdate('POP-00020', iStatus, 'Active', 'Status');
  queueUpdate('POP-00020', iBirthYear, 1999, 'BirthYear');
  queueUpdate('POP-00020', iNeighborhood, 'Jack London', 'Neighborhood');
  queueUpdate('POP-00020', iTrait, '', 'TraitProfile');
  queueUpdate('POP-00020', iEconKey, '', 'EconomicProfileKey');
  queueUpdate('POP-00020', iIncome, '', 'Income');
  queueUpdate('POP-00020', iWealth, '', 'WealthLevel');
  if (iUNI >= 0) queueUpdate('POP-00020', iUNI, 'No', 'UNI');
  if (iMED >= 0) queueUpdate('POP-00020', iMED, 'No', 'MED');
  if (iCIV >= 0) queueUpdate('POP-00020', iCIV, 'Yes', 'CIV');

  // =====================================================================
  // 2. BUFORD PARK — keep POP-00059 (T3), backfill POP-00030
  // =====================================================================
  console.log('');
  console.log('--- 2. BUFORD PARK — backfill POP-00030 ---');
  console.log('  POP-00059: Stays as Buford Park Tier 3 (no changes)');

  console.log('  POP-00030: Backfill → Derek Simmons, A\'s Marketing Director');
  queueUpdate('POP-00030', iFirst, 'Derek', 'First');
  queueUpdate('POP-00030', iLast, 'Simmons', 'Last');
  queueUpdate('POP-00030', iOriginGame, 'GodWorld', 'OriginGame');
  queueUpdate('POP-00030', iClockMode, 'LIFE', 'ClockMode');
  queueUpdate('POP-00030', iTier, 3, 'Tier');
  queueUpdate('POP-00030', iRoleType, 'A\'s Marketing Director', 'RoleType');
  queueUpdate('POP-00030', iStatus, 'Active', 'Status');
  queueUpdate('POP-00030', iBirthYear, 2003, 'BirthYear');
  queueUpdate('POP-00030', iNeighborhood, 'Jack London', 'Neighborhood');
  queueUpdate('POP-00030', iTrait, '', 'TraitProfile');
  queueUpdate('POP-00030', iEconKey, '', 'EconomicProfileKey');
  queueUpdate('POP-00030', iIncome, '', 'Income');
  queueUpdate('POP-00030', iWealth, '', 'WealthLevel');
  if (iUNI >= 0) queueUpdate('POP-00030', iUNI, 'No', 'UNI');
  if (iMED >= 0) queueUpdate('POP-00030', iMED, 'No', 'MED');
  if (iCIV >= 0) queueUpdate('POP-00030', iCIV, 'Yes', 'CIV');

  // =====================================================================
  // 3. BULLS PLAYERS — backfill with Oakland civilians
  // =====================================================================
  console.log('');
  console.log('--- 3. BULLS PLAYERS → OAKLAND CIVILIANS ---');

  var bullsBackfills = [
    {
      popId: 'POP-00529', first: 'Tomas', last: 'Aguilar',
      role: 'Freight Logistics Coordinator (Port of Oakland)',
      birthYear: 2001, neighborhood: 'Jack London'
    },
    {
      popId: 'POP-00531', first: 'Priya', last: 'Nair',
      role: 'Climate Adaptation Engineer',
      birthYear: 2006, neighborhood: 'Downtown'
    },
    {
      popId: 'POP-00532', first: 'Marcus', last: 'Whitfield',
      role: 'Youth Basketball Coach',
      birthYear: 2008, neighborhood: 'East Oakland'
    },
    {
      popId: 'POP-00535', first: 'Lisa', last: 'Tanaka',
      role: 'Small Business Loan Officer',
      birthYear: 1998, neighborhood: 'Chinatown'
    }
  ];

  for (var b = 0; b < bullsBackfills.length; b++) {
    var bf = bullsBackfills[b];
    console.log('  ' + bf.popId + ': Backfill → ' + bf.first + ' ' + bf.last + ', ' + bf.role);
    queueUpdate(bf.popId, iFirst, bf.first, 'First');
    queueUpdate(bf.popId, iLast, bf.last, 'Last');
    if (iMiddle >= 0) queueUpdate(bf.popId, iMiddle, '', 'Middle');
    queueUpdate(bf.popId, iOriginGame, 'GodWorld', 'OriginGame');
    queueUpdate(bf.popId, iClockMode, 'LIFE', 'ClockMode');
    queueUpdate(bf.popId, iTier, 4, 'Tier');
    queueUpdate(bf.popId, iRoleType, bf.role, 'RoleType');
    queueUpdate(bf.popId, iStatus, 'Active', 'Status');
    queueUpdate(bf.popId, iBirthYear, bf.birthYear, 'BirthYear');
    queueUpdate(bf.popId, iNeighborhood, bf.neighborhood, 'Neighborhood');
    queueUpdate(bf.popId, iTrait, '', 'TraitProfile');
    queueUpdate(bf.popId, iEconKey, '', 'EconomicProfileKey');
    queueUpdate(bf.popId, iIncome, '', 'Income');
    queueUpdate(bf.popId, iWealth, '', 'WealthLevel');
    if (iUNI >= 0) queueUpdate(bf.popId, iUNI, 'No', 'UNI');
    if (iMED >= 0) queueUpdate(bf.popId, iMED, 'No', 'MED');
    if (iCIV >= 0) queueUpdate(bf.popId, iCIV, 'Yes', 'CIV');
  }

  // =====================================================================
  // 4. RETIRED PLAYERS — Status → Retired, ClockMode → GAME
  //    Farewell season: Mason Miller, Paul Skenes, Kris Bubic,
  //    Orion Kerkering. (Dalton Rushing already Retired.)
  // =====================================================================
  console.log('');
  console.log('--- 4. RETIRED PLAYERS — Farewell Season ---');

  var retiredPlayers = [
    { popId: 'POP-00125', name: 'Paul Skenes',      birthYear: 2004 },
    { popId: 'POP-00126', name: 'Orion Kerkering',  birthYear: 2003 },
    { popId: 'POP-00127', name: 'Mason Miller',     birthYear: 2000 },
    { popId: 'POP-00128', name: 'Kris Bubic',       birthYear: 1999 },
  ];

  for (var rp = 0; rp < retiredPlayers.length; rp++) {
    var ret = retiredPlayers[rp];
    var entry = popIndex[ret.popId];
    var currentStatus = entry ? (entry.row[iStatus] || '').toString().trim() : '?';
    var currentClock = entry ? (entry.row[iClockMode] || '').toString().trim() : '?';

    console.log('  ' + ret.popId + ' ' + ret.name + ' (Status: ' + currentStatus + ', Clock: ' + currentClock + ')');

    if (currentStatus !== 'Retired') {
      queueUpdate(ret.popId, iStatus, 'Retired', 'Status');
    }
    if (currentClock === 'ENGINE') {
      queueUpdate(ret.popId, iClockMode, 'GAME', 'ClockMode');
    }
    // Fix birth years for retired players too
    queueUpdate(ret.popId, iBirthYear, ret.birthYear, 'BirthYear');
  }

  // Also check Dalton Rushing
  var rushingEntry = popIndex['POP-00129'];
  if (rushingEntry) {
    var rushingStatus = (rushingEntry.row[iStatus] || '').toString().trim();
    console.log('  POP-00129 Dalton Rushing (Status: ' + rushingStatus + ') — already Retired');
    // Fix birth year
    queueUpdate('POP-00129', iBirthYear, 2003, 'BirthYear');
  }

  // =====================================================================
  // SUMMARY & WRITE
  // =====================================================================
  console.log('');
  console.log('=== SUMMARY ===');
  console.log('  Total cell updates: ' + batchUpdates.length);

  if (DRY_RUN) {
    console.log('');
    console.log('=== DRY RUN COMPLETE — no changes written ===');
    return;
  }

  // Write in chunks
  var CHUNK = 500;
  for (var start = 0; start < batchUpdates.length; start += CHUNK) {
    var chunk = batchUpdates.slice(start, start + CHUNK);
    await sheets.batchUpdate(chunk);
    console.log('  Wrote cells ' + (start + 1) + '-' + Math.min(start + CHUNK, batchUpdates.length));
  }

  console.log('');
  console.log('=== COMPLETE ===');
}

main().catch(function(err) {
  console.error('FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
