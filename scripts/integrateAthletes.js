#!/usr/bin/env node
/**
 * integrateAthletes.js — Phase 15: A's Player Integration
 *
 * Reads player-index.json + athlete_config.json, matches to Simulation_Ledger
 * rows by name, and writes corrected BirthYear, Income, WealthLevel,
 * TraitProfile. For retired players, also updates RoleType and
 * EconomicProfileKey.
 *
 * Usage:
 *   node scripts/integrateAthletes.js --test --dry-run   # Preview 5 Tier-1 stars
 *   node scripts/integrateAthletes.js --test              # Write 5-player batch
 *   node scripts/integrateAthletes.js --dry-run           # Preview all 102
 *   node scripts/integrateAthletes.js                     # Full rollout
 *
 * Phase 15 of the Rollout Plan.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const sheets = require('../lib/sheets');
const fs = require('fs');

const DRY_RUN = process.argv.includes('--dry-run');
const TEST_MODE = process.argv.includes('--test');

// Test batch: Tier 1 dynasty core (richest TrueSource data)
const TEST_POPS = ['POP-00003', 'POP-00018', 'POP-00019', 'POP-00021', 'POP-00022'];

// POP-IDs that have been backfilled with civilians — skip during integration
const SKIP_POPS = ['POP-00020', 'POP-00030', 'POP-00529', 'POP-00531', 'POP-00532', 'POP-00535'];

// Basketball position codes — exclude from A's integration
const BASKETBALL_POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C/PF', 'PG/SG', 'PF/SF'];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RUN ===');
  if (TEST_MODE) console.log('=== TEST MODE: 5 Tier-1 players only ===');
  console.log('');

  // --- Load config files ---
  const indexPath = path.resolve(__dirname, '..', 'output', 'player-index.json');
  const configPath = path.resolve(__dirname, '..', 'data', 'athlete_config.json');
  const roleMappingPath = path.resolve(__dirname, '..', 'data', 'role_mapping.json');

  if (!fs.existsSync(indexPath)) {
    console.error('ERROR: output/player-index.json not found. Run buildPlayerIndex.js --write first.');
    process.exit(1);
  }

  var playerIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  var config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  var roleMapping = JSON.parse(fs.readFileSync(roleMappingPath, 'utf8'));

  var players = playerIndex.players.filter(function(p) { return p.sport === 'baseball'; });
  console.log('Player index: ' + players.length + ' baseball players loaded');
  console.log('Config: ' + Object.keys(config.quirkToTrait).length + ' quirk mappings, ' +
              Object.keys(config.positionDefaults).length + ' position defaults');
  console.log('');

  // Build lookup by normalized name
  var nameIndex = {};
  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    if (p.name) {
      var key = normalizeName(p.name);
      nameIndex[key] = p;
    }
  }

  // --- Read Simulation_Ledger ---
  console.log('Reading Simulation_Ledger...');
  var ledgerData = await sheets.getSheetData('Simulation_Ledger');
  var header = ledgerData[0];
  var rows = ledgerData.slice(1);

  function col(name) { return header.indexOf(name); }

  var iPopId = col('POPID');
  var iFirst = col('First');
  var iLast = col('Last');
  var iBirthYear = col('BirthYear');
  var iIncome = col('Income');
  var iWealth = col('WealthLevel');
  var iTrait = col('TraitProfile');
  var iRoleType = col('RoleType');
  var iEconKey = col('EconomicProfileKey');
  var iStatus = col('Status');
  var iClockMode = col('ClockMode');
  var iTier = col('Tier');

  // Validate required columns (EconomicProfileKey may not be in CSV backups but exists in live sheet)
  var required = { POPID: iPopId, First: iFirst, Last: iLast,
    BirthYear: iBirthYear, Income: iIncome, WealthLevel: iWealth,
    TraitProfile: iTrait, RoleType: iRoleType };
  if (iEconKey >= 0) required.EconomicProfileKey = iEconKey;
  var missing = Object.keys(required).filter(function(k) { return required[k] < 0; });
  if (missing.length > 0) {
    console.error('ERROR: Missing columns: ' + missing.join(', '));
    process.exit(1);
  }

  // --- Find A's players in ledger ---
  var gameRows = [];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var clockMode = (row[iClockMode] || '').toString().trim();
    if (clockMode !== 'GAME') continue;

    // Filter by SPORTS_OVERRIDE if column exists, otherwise use ClockMode alone
    if (iEconKey >= 0) {
      var econKey = (row[iEconKey] || '').toString().trim();
      if (econKey !== 'SPORTS_OVERRIDE') continue;
    }

    // Skip backfilled POP-IDs (former duplicates/Bulls players now civilians)
    var popId = (row[iPopId] || '').toString().trim();
    if (SKIP_POPS.indexOf(popId) >= 0) continue;

    // Skip basketball players by position code
    var roleType = (row[iRoleType] || '').toString().trim();
    if (BASKETBALL_POSITIONS.indexOf(roleType) >= 0) continue;

    gameRows.push({ rowIndex: r, row: row });
  }

  console.log('Found ' + gameRows.length + ' GAME/SPORTS_OVERRIDE rows in ledger');
  console.log('');

  // --- Match and compute updates ---
  var updates = [];
  var noMatch = [];
  var fallbackPlayers = [];

  for (var g = 0; g < gameRows.length; g++) {
    var entry = gameRows[g];
    var row = entry.row;
    var rowNum = entry.rowIndex + 2; // +1 header, +1 for 1-based

    var popId = (row[iPopId] || '').toString().trim();
    var firstName = (row[iFirst] || '').toString().trim();
    var lastName = (row[iLast] || '').toString().trim();
    var fullName = firstName + ' ' + lastName;
    var nameKey = normalizeName(fullName);
    var currentStatus = (row[iStatus] || '').toString().trim();
    var currentTier = parseInt(row[iTier]) || 4;
    var currentRoleType = (row[iRoleType] || '').toString().trim();

    // In test mode, only process the 5 test players
    if (TEST_MODE && TEST_POPS.indexOf(popId) < 0) continue;

    // Match to player index
    var player = nameIndex[nameKey];
    var hasTrueSource = !!player;
    var usedFallback = false;

    // --- Compute BirthYear ---
    var newBirthYear = null;
    if (player && player.bio && player.bio.computedBirthYear) {
      newBirthYear = player.bio.computedBirthYear;
    } else {
      // Fallback: check if existing birth year gives reasonable age in 2041
      var existingBY = parseInt(row[iBirthYear]) || 0;
      var existingAge = 2041 - existingBY;
      if (existingAge >= 18 && existingAge <= 45) {
        newBirthYear = existingBY; // Keep existing — it's reasonable
      }
      // Otherwise leave null — will be flagged
    }

    // --- Compute Income ---
    var newIncome = null;
    if (player && player.parsedContract && player.parsedContract.annualSalary) {
      newIncome = player.parsedContract.annualSalary;
    } else {
      // Fallback
      usedFallback = true;
      if (currentStatus === 'Retired' || (player && player.playerStatus && player.playerStatus.status === 'retired')) {
        newIncome = config.fallbackSalaries.retired;
      } else if (player && player.overall && player.overall >= 60) {
        newIncome = config.fallbackSalaries.activeMLB;
      } else {
        newIncome = config.fallbackSalaries.minorLeague;
      }
    }

    // --- Compute WealthLevel ---
    var newWealth = 4; // default
    if (newIncome) {
      for (var t = 0; t < config.salaryTiers.length; t++) {
        if (newIncome >= config.salaryTiers[t].minSalary) {
          newWealth = config.salaryTiers[t].wealthLevel;
          break;
        }
      }
    }

    // --- Compute TraitProfile ---
    var traitProfile = buildTraitProfile(player, currentRoleType, config);

    // --- Retired player: post-career role ---
    var newRoleType = null;
    var newEconKey = null;
    var isRetired = currentStatus === 'Retired' ||
                    (player && player.playerStatus && player.playerStatus.status === 'retired');

    if (isRetired) {
      // Determine if pitcher
      var isPitcher = false;
      if (player && player.position) {
        for (var pp = 0; pp < config.isPitcherPosition.length; pp++) {
          if (player.position.indexOf(config.isPitcherPosition[pp]) >= 0) {
            isPitcher = true;
            break;
          }
        }
      } else if (/^(SP|RP|CP|CL)$/i.test(currentRoleType)) {
        isPitcher = true;
      }

      // Pick post-career role
      var rolePool;
      if (currentTier === 1) {
        rolePool = config.postCareerRoles.legendTier1;
      } else if (isPitcher) {
        rolePool = config.postCareerRoles.pitcher;
      } else {
        rolePool = config.postCareerRoles.positionPlayer;
      }

      // Deterministic selection based on popId hash
      var hash = simpleHash(popId);
      newRoleType = rolePool[hash % rolePool.length];
      newEconKey = config.postCareerRoleMapping[newRoleType] || 'Community Organizer';

      // Update income for retired (use pension if no contract data)
      if (usedFallback) {
        newIncome = config.fallbackSalaries.retired;
        // Recalculate wealth for retired
        newWealth = 5; // baseline retired
      }
    }

    var update = {
      rowNum: rowNum,
      popId: popId,
      name: fullName,
      tier: currentTier,
      hasTrueSource: hasTrueSource,
      usedFallback: usedFallback,
      isRetired: isRetired,
      changes: {}
    };

    // Only include fields that actually change
    var oldBirthYear = parseInt(row[iBirthYear]) || 0;
    if (newBirthYear && newBirthYear !== oldBirthYear) {
      update.changes.BirthYear = { old: oldBirthYear, new: newBirthYear, colIdx: iBirthYear };
    }

    var oldIncome = parseFloat(row[iIncome]) || 0;
    if (newIncome && newIncome !== oldIncome) {
      update.changes.Income = { old: oldIncome, new: newIncome, colIdx: iIncome };
    }

    var oldWealth = parseInt(row[iWealth]) || 0;
    if (newWealth !== oldWealth) {
      update.changes.WealthLevel = { old: oldWealth, new: newWealth, colIdx: iWealth };
    }

    var oldTrait = (row[iTrait] || '').toString().trim();
    if (traitProfile && traitProfile !== oldTrait) {
      update.changes.TraitProfile = { old: oldTrait || '(empty)', new: traitProfile, colIdx: iTrait };
    }

    if (isRetired && newRoleType) {
      if (newRoleType !== currentRoleType) {
        update.changes.RoleType = { old: currentRoleType, new: newRoleType, colIdx: iRoleType };
      }
      if (iEconKey >= 0 && newEconKey && newEconKey !== (row[iEconKey] || '').toString().trim()) {
        update.changes.EconomicProfileKey = { old: 'SPORTS_OVERRIDE', new: newEconKey, colIdx: iEconKey };
      }
    }

    if (Object.keys(update.changes).length > 0) {
      updates.push(update);
    }

    if (!hasTrueSource) {
      fallbackPlayers.push({ popId: popId, name: fullName, usedFallback: true });
    }
  }

  // --- Report ---
  console.log('=== INTEGRATION REPORT ===');
  console.log('  Total matched:       ' + updates.length);
  console.log('  With TrueSource:     ' + updates.filter(function(u) { return u.hasTrueSource; }).length);
  console.log('  Fallback values:     ' + updates.filter(function(u) { return u.usedFallback; }).length);
  console.log('  Retired transitions: ' + updates.filter(function(u) { return u.isRetired; }).length);
  console.log('');

  // Detail per player
  console.log('--- PLAYER CHANGES ---');
  for (var u = 0; u < updates.length; u++) {
    var upd = updates[u];
    var src = upd.hasTrueSource ? 'TS' : 'FB';
    var ret = upd.isRetired ? ' [RETIRED]' : '';
    console.log('');
    console.log('  ' + upd.popId + ' ' + upd.name + ' (T' + upd.tier + ', ' + src + ')' + ret);
    var changeKeys = Object.keys(upd.changes);
    for (var c = 0; c < changeKeys.length; c++) {
      var field = changeKeys[c];
      var ch = upd.changes[field];
      var oldVal = field === 'Income' ? '$' + Number(ch.old).toLocaleString() : ch.old;
      var newVal = field === 'Income' ? '$' + Number(ch.new).toLocaleString() : ch.new;
      console.log('    ' + field + ': ' + oldVal + ' → ' + newVal);
    }
  }

  if (fallbackPlayers.length > 0) {
    console.log('');
    console.log('--- FALLBACK PLAYERS (no TrueSource) ---');
    for (var f = 0; f < fallbackPlayers.length; f++) {
      console.log('  ' + fallbackPlayers[f].popId + ' ' + fallbackPlayers[f].name);
    }
  }

  console.log('');

  if (DRY_RUN) {
    console.log('=== DRY RUN COMPLETE — no changes written ===');
    return;
  }

  // --- Write to Simulation_Ledger ---
  console.log('Writing to Simulation_Ledger...');

  var batchUpdates = [];
  for (var w = 0; w < updates.length; w++) {
    var upd = updates[w];
    var changeKeys = Object.keys(upd.changes);
    for (var c = 0; c < changeKeys.length; c++) {
      var ch = upd.changes[changeKeys[c]];
      batchUpdates.push({
        range: 'Simulation_Ledger!' + colLetter(ch.colIdx) + upd.rowNum,
        values: [[ch.new]]
      });
    }
  }

  console.log('  Total cell writes: ' + batchUpdates.length);

  // Batch in chunks of 500
  var CHUNK = 500;
  for (var start = 0; start < batchUpdates.length; start += CHUNK) {
    var chunk = batchUpdates.slice(start, start + CHUNK);
    await sheets.batchUpdate(chunk);
    console.log('  Wrote cells ' + (start + 1) + '-' + Math.min(start + CHUNK, batchUpdates.length));
  }

  console.log('');
  console.log('=== COMPLETE: ' + updates.length + ' players updated ===');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeName(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function colLetter(idx) {
  if (idx < 26) return String.fromCharCode(65 + idx);
  return String.fromCharCode(64 + Math.floor(idx / 26)) + String.fromCharCode(65 + (idx % 26));
}

function simpleHash(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function buildTraitProfile(player, currentRoleType, config) {
  var archetype = null;
  var tone = null;
  var motifs = [];
  var source = 'default';

  // Priority 1: quirks from TrueSource
  if (player && player.quirks && player.quirks.length > 0) {
    source = 'TrueSource';
    // Use first matching quirk for primary archetype/tone
    for (var q = 0; q < player.quirks.length; q++) {
      var mapping = config.quirkToTrait[player.quirks[q]];
      if (mapping) {
        if (!archetype) {
          archetype = mapping.archetype;
          tone = mapping.tone;
        }
        // All quirks contribute motifs
        motifs.push(player.quirks[q].toLowerCase().replace(/\s+/g, '-'));
      }
    }
  }

  // Priority 2: position-based default
  if (!archetype) {
    // Try primary position from player data
    var pos = null;
    if (player && player.position) {
      // Get first position: "SS/2B/3B" → "SS", "Starting Pitcher" → "SP"
      pos = player.position.split(/[\/|,\s]+/)[0].trim();
      if (pos === 'Starting') pos = 'SP';
    }
    // Fall back to ledger RoleType (which might be position code)
    if (!pos || !config.positionDefaults[pos]) {
      pos = currentRoleType;
    }

    var posDef = config.positionDefaults[pos];
    if (posDef) {
      archetype = posDef.archetype;
      tone = posDef.tone;
      source = 'position';
    }
  }

  // Final fallback
  if (!archetype) {
    archetype = 'Grounded';
    tone = 'plain';
    source = 'fallback';
  }

  if (motifs.length === 0) {
    // Generate motif from archetype
    var archMotifs = {
      Anchor: ['composure', 'steadiness'],
      Catalyst: ['energy', 'momentum'],
      Watcher: ['awareness', 'patience'],
      Grounded: ['stability', 'routine'],
      Striver: ['drive', 'intensity'],
      Connector: ['teamwork', 'chemistry'],
      Drifter: ['adaptability', 'range']
    };
    motifs = archMotifs[archetype] || ['presence'];
  }

  return 'Archetype:' + archetype +
         '|tone:' + tone +
         '|Motifs:' + motifs.join(',') +
         '|Source:' + source;
}

main().catch(function(err) {
  console.error('FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
