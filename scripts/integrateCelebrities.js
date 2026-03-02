#!/usr/bin/env node
/**
 * integrateCelebrities.js — Phase 16.3
 *
 * Bridges top Cultural_Ledger celebrities to Simulation_Ledger with POP-IDs.
 * Backfills UniverseLinks column on Cultural_Ledger.
 *
 * Threshold: FameScore >= 65 AND CityTier in (Iconic, National)
 * Iconic → Tier 2, National → Tier 3
 *
 * Usage:
 *   node scripts/integrateCelebrities.js --dry-run   # Preview
 *   node scripts/integrateCelebrities.js              # Apply
 *
 * Phase 16 — Citizen Ledger Consolidation
 */

var path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

var sheets = require('../lib/sheets');

var DRY_RUN = process.argv.includes('--dry-run');

var FAME_THRESHOLD = 65;
var QUALIFYING_TIERS = ['Iconic', 'National', 'Global'];

/**
 * Map CulturalDomain / FameCategory to a simulation RoleType
 */
var DOMAIN_TO_ROLE = {
  'Sports': 'Fitness Trainer',
  'Arts': 'Theater Director',
  'Media': 'Journalist',
  'Literature': 'Freelance Writer',
  'Civic': 'Community Organizer',
  'Other': 'Community Organizer'
};

/**
 * More specific role mapping by FameCategory
 */
var CATEGORY_TO_ROLE = {
  'athlete': 'Fitness Trainer',
  'musician': 'Jazz Musician',
  'actor': 'Theater Director',
  'actress': 'Theater Director',
  'rapper': 'Jazz Musician',
  'singer': 'Jazz Musician',
  'journalist': 'Journalist',
  'reporter': 'Journalist',
  'author': 'Freelance Writer',
  'novelist': 'Freelance Writer',
  'influencer': 'Social Media Manager',
  'streamer': 'Podcast Host',
  'sculptor': 'Ceramicist',
  'artist': 'Muralist',
  'community leader': 'Community Organizer',
  'community organizer': 'Community Organizer',
  'civic leader': 'Community Organizer',
  'gallery curator': 'Gallery Owner',
  'cultural leader': 'Community Organizer'
};

/**
 * Deterministic hash for birth year.
 * Celebrities: 20-45 age range in 2041 → birth 1996-2021
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
  // Range: 1996-2021 (26 possible years, ages 20-45 in 2041)
  return 1996 + (hash % 26);
}

/**
 * Parse celebrity name into First / Last.
 * Handles: "Dax Monroe", "Sculptor Alma Vasquez",
 * "Gallery Owner Mei Chen", "Festival Organizer James Williams"
 */
function parseCelebName(raw) {
  var name = raw.trim();

  // Strip role prefixes
  var prefixes = [
    'Sculptor ', 'Gallery Owner ', 'Festival Organizer ',
    'Heritage Director ', 'Photographer ', 'Muralist ',
    'Community Director ', 'Councilwoman ', 'GameGirl ',
    'Pixel '
  ];
  for (var p = 0; p < prefixes.length; p++) {
    if (name.indexOf(prefixes[p]) === 0) {
      name = name.substring(prefixes[p].length).trim();
      break;
    }
  }

  var parts = name.split(/\s+/);
  if (parts.length === 1) {
    return { first: parts[0], last: '' };
  }
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RUN ===');
  console.log('');

  // ---------------------------------------------------------------
  // 1. Read Cultural_Ledger
  // ---------------------------------------------------------------
  console.log('Reading Cultural_Ledger...');
  var culData = await sheets.getSheetData('Cultural_Ledger');
  var culHeader = culData[0];
  var culRows = culData.slice(1);

  var iCulId = culHeader.indexOf('CUL-ID');
  var iName = culHeader.indexOf('Name');
  var iRoleType = culHeader.indexOf('RoleType');
  var iFameCat = culHeader.indexOf('FameCategory');
  var iDomain = culHeader.indexOf('CulturalDomain');
  var iCulStatus = culHeader.indexOf('Status');
  var iUniverse = culHeader.indexOf('UniverseLinks');
  var iFameScore = culHeader.indexOf('FameScore');
  var iCityTier = culHeader.indexOf('CityTier');
  var iCulNeighborhood = culHeader.indexOf('Neighborhood');
  var iMediaCount = culHeader.indexOf('MediaCount');
  var iTrend = culHeader.indexOf('TrendTrajectory');

  console.log('  Found ' + culRows.length + ' entries');
  console.log('');

  // ---------------------------------------------------------------
  // 2. Read Simulation_Ledger for max POP-ID and dupe check
  // ---------------------------------------------------------------
  console.log('Reading Simulation_Ledger...');
  var slData = await sheets.getSheetData('Simulation_Ledger');
  var slHeader = slData[0];
  var slRows = slData.slice(1);

  function col(name) { return slHeader.indexOf(name); }

  var slPopId = col('POPID');
  var slFirst = col('First');
  var slMiddle = col('Middle');
  if (slMiddle < 0) slMiddle = col('Middle ');
  var slLast = col('Last');

  // Find max POP-ID
  var maxPop = 0;
  for (var r = 0; r < slRows.length; r++) {
    var popStr = (slRows[r][slPopId] || '').toString().trim();
    var match = popStr.match(/POP-(\d+)/);
    if (match) {
      var num = parseInt(match[1], 10);
      if (num > maxPop) maxPop = num;
    }
  }
  console.log('  Current max POP-ID: POP-' + String(maxPop).padStart(5, '0'));

  // Build existing name index
  var existingNames = {};
  for (var s = 0; s < slRows.length; s++) {
    var first = (slRows[s][slFirst] || '').toString().trim().toLowerCase();
    var last = (slRows[s][slLast] || '').toString().trim().toLowerCase();
    if (first && last) {
      existingNames[first + ' ' + last] = slRows[s][slPopId];
    }
  }
  console.log('');

  // ---------------------------------------------------------------
  // 3. Filter qualifying celebrities
  // ---------------------------------------------------------------
  console.log('--- CELEBRITY QUALIFICATION ---');

  var qualifying = [];
  var rejected = [];

  for (var c = 0; c < culRows.length; c++) {
    var crow = culRows[c];
    var culId = (crow[iCulId] || '').toString().trim();
    var name = (crow[iName] || '').toString().trim();
    var fameScore = parseInt(crow[iFameScore] || '0', 10);
    var cityTier = (crow[iCityTier] || '').toString().trim();
    var culStatus = (crow[iCulStatus] || '').toString().trim();
    var existingLink = (crow[iUniverse] || '').toString().trim();
    var fameCat = (crow[iFameCat] || '').toString().trim().toLowerCase();
    var domain = (crow[iDomain] || '').toString().trim();
    var neighborhood = (crow[iCulNeighborhood] || '').toString().trim();
    var mediaCount = parseInt(crow[iMediaCount] || '0', 10);
    var trend = (crow[iTrend] || '').toString().trim();

    // Already linked?
    if (existingLink) {
      console.log('  ' + name + ' — already linked: ' + existingLink);
      continue;
    }

    if (culStatus !== 'Active') continue;

    if (fameScore >= FAME_THRESHOLD && QUALIFYING_TIERS.indexOf(cityTier) >= 0) {
      qualifying.push({
        rowIdx: c,
        culId: culId,
        name: name,
        fameScore: fameScore,
        cityTier: cityTier,
        fameCat: fameCat,
        domain: domain,
        neighborhood: neighborhood,
        mediaCount: mediaCount,
        trend: trend
      });
    } else {
      rejected.push({
        name: name,
        fameScore: fameScore,
        cityTier: cityTier,
        reason: fameScore < FAME_THRESHOLD ? 'low fame (' + fameScore + ')' : 'tier (' + cityTier + ')'
      });
    }
  }

  console.log('');
  console.log('  Qualifying: ' + qualifying.length);
  console.log('  Below threshold: ' + rejected.length);
  console.log('');

  // Show rejected
  if (rejected.length > 0) {
    console.log('--- BELOW THRESHOLD (stay Cultural_Ledger only) ---');
    for (var j = 0; j < rejected.length; j++) {
      var rej = rejected[j];
      console.log('  ' + rej.name + ' — ' + rej.reason);
    }
    console.log('');
  }

  // ---------------------------------------------------------------
  // 4. Build new SL rows for qualifying celebrities
  // ---------------------------------------------------------------
  console.log('--- CELEBRITIES → SIMULATION_LEDGER ---');

  var newRows = [];
  var universeBackfill = {}; // culRowIdx → POP-ID
  var nextPop = maxPop + 1;
  var skipped = 0;

  for (var q = 0; q < qualifying.length; q++) {
    var celeb = qualifying[q];
    var parsed = parseCelebName(celeb.name);
    var nameKey = parsed.first.toLowerCase() + ' ' + (parsed.last || '').toLowerCase();

    // Check if already exists on SL
    if (existingNames[nameKey]) {
      console.log('  SKIP: ' + celeb.name + ' — already on SL as ' + existingNames[nameKey]);
      universeBackfill[celeb.rowIdx] = existingNames[nameKey];
      skipped++;
      continue;
    }

    var popId = 'POP-' + String(nextPop).padStart(5, '0');
    var tier = (celeb.cityTier === 'Iconic' || celeb.cityTier === 'Global') ? 2 : 3;
    var birthYear = birthYearFromName(parsed.first + ' ' + (parsed.last || ''));
    var roleType = CATEGORY_TO_ROLE[celeb.fameCat] || DOMAIN_TO_ROLE[celeb.domain] || 'Community Organizer';

    // Build life history
    var lifeHistory = '[Cultural] ' + celeb.name + ' — ' + celeb.fameCat + ' (' + celeb.domain + '). ' +
      'FameScore ' + celeb.fameScore + ', ' + celeb.cityTier + ' tier. ' +
      celeb.mediaCount + ' media appearances.';

    // Build row
    var newRow = new Array(slHeader.length).fill('');
    newRow[slPopId] = popId;
    newRow[slFirst] = parsed.first;
    if (slMiddle >= 0) newRow[slMiddle] = '';
    newRow[slLast] = parsed.last || '';
    newRow[col('OriginGame')] = 'GodWorld';
    var iUNI = col('UNI (y/n)');
    var iMED = col('MED (y/n)');
    var iCIV = col('CIV (y/n)');
    if (iUNI >= 0) newRow[iUNI] = 'No';
    if (iMED >= 0) newRow[iMED] = 'No';
    if (iCIV >= 0) newRow[iCIV] = 'Yes';
    newRow[col('ClockMode')] = 'LIFE';
    newRow[col('Tier')] = tier;
    newRow[col('RoleType')] = roleType;
    newRow[col('Status')] = 'Active';
    newRow[col('BirthYear')] = birthYear;
    var iOriginCity = col('OrginCity');
    if (iOriginCity >= 0) newRow[iOriginCity] = 'Oakland';
    var iLifeHistory = col('LifeHistory');
    if (iLifeHistory >= 0) newRow[iLifeHistory] = lifeHistory;
    var iNeighborhood = col('Neighborhood');
    if (iNeighborhood >= 0) newRow[iNeighborhood] = celeb.neighborhood;
    var iTraitCol = col('TraitProfile');
    if (iTraitCol >= 0) {
      // Trait based on domain
      var traitMap = {
        'Sports': 'Archetype:Catalyst|tone:bright|Motifs:competition,fame|Source:cultural-celebrity',
        'Arts': 'Archetype:Drifter|tone:noir|Motifs:creativity,expression|Source:cultural-celebrity',
        'Media': 'Archetype:Connector|tone:plain|Motifs:influence,storytelling|Source:cultural-celebrity',
        'Literature': 'Archetype:Watcher|tone:tender|Motifs:reflection,craft|Source:cultural-celebrity',
        'Civic': 'Archetype:Anchor|tone:plain|Motifs:community,service|Source:cultural-celebrity'
      };
      newRow[iTraitCol] = traitMap[celeb.domain] || 'Archetype:Connector|tone:plain|Motifs:presence,charisma|Source:cultural-celebrity';
    }

    console.log('  ' + popId + ': ' + parsed.first + ' ' + (parsed.last || '') + ' → Tier ' + tier);
    console.log('    CUL-ID: ' + celeb.culId);
    console.log('    FameScore: ' + celeb.fameScore + ' (' + celeb.cityTier + '), Trend: ' + celeb.trend);
    console.log('    RoleType: ' + roleType);
    console.log('    Neighborhood: ' + celeb.neighborhood);
    console.log('    BirthYear: ' + birthYear + ' (age ' + (2041 - birthYear) + ' in 2041)');
    console.log('');

    newRows.push(newRow);
    universeBackfill[celeb.rowIdx] = popId;
    nextPop++;
  }

  // ---------------------------------------------------------------
  // 5. Summary
  // ---------------------------------------------------------------
  console.log('=== SUMMARY ===');
  console.log('  New citizens to add: ' + newRows.length);
  console.log('  Skipped (existing): ' + skipped);
  if (newRows.length > 0) {
    console.log('  POP-ID range: POP-' + String(maxPop + 1).padStart(5, '0') + ' — POP-' + String(maxPop + newRows.length).padStart(5, '0'));
  }
  console.log('');

  if (DRY_RUN) {
    console.log('=== DRY RUN COMPLETE — no changes written ===');
    return;
  }

  // ---------------------------------------------------------------
  // 6. Write to Simulation_Ledger
  // ---------------------------------------------------------------
  if (newRows.length > 0) {
    console.log('Appending ' + newRows.length + ' rows to Simulation_Ledger...');
    await sheets.appendRows('Simulation_Ledger', newRows);
    console.log('  Done.');
    console.log('');
  }

  // ---------------------------------------------------------------
  // 7. Backfill UniverseLinks on Cultural_Ledger
  // ---------------------------------------------------------------
  var backfillKeys = Object.keys(universeBackfill);
  if (backfillKeys.length > 0) {
    console.log('Backfilling UniverseLinks on Cultural_Ledger...');

    if (iUniverse < 0) {
      console.log('  WARNING: UniverseLinks column not found on Cultural_Ledger. Skipping backfill.');
    } else {
      var colLetter = colIdxToLetter(iUniverse);
      var backfillUpdates = [];

      for (var bk = 0; bk < backfillKeys.length; bk++) {
        var rowIdx = parseInt(backfillKeys[bk], 10);
        var assignedPop = universeBackfill[rowIdx];
        backfillUpdates.push({
          range: 'Cultural_Ledger!' + colLetter + (rowIdx + 2), // +2 for header + 0-index
          values: [[assignedPop]]
        });
      }

      await sheets.batchUpdate(backfillUpdates);
      console.log('  Wrote ' + backfillUpdates.length + ' UniverseLinks values.');
    }
  }

  console.log('');
  console.log('=== COMPLETE ===');
  console.log('  Simulation_Ledger: +' + newRows.length + ' celebrities');
  console.log('  Cultural_Ledger: UniverseLinks populated for ' + backfillKeys.length + ' entries');
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
