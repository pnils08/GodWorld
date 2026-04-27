#!/usr/bin/env node
/**
 * buildCitizenCards.js — Compile per-citizen wiki cards into world-data
 * [engine/sheet] — Phase 33.16 + Phase 35.1
 *
 * Reads Simulation_Ledger for base profile, searches bay-tribune for
 * appearance history, and writes/updates a single compiled citizen card
 * to world-data Supermemory container.
 *
 * The GodWorld MCP lookup_citizen tool queries these cards.
 * Cards get richer with each edition as wiki ingest adds memories.
 *
 * Usage:
 *   node scripts/buildCitizenCards.js --dry-run          # show what would be written
 *   node scripts/buildCitizenCards.js --apply             # write all cards
 *   node scripts/buildCitizenCards.js --apply --limit 50  # first 50 citizens
 *   node scripts/buildCitizenCards.js --apply --tier 1    # tier 1 only
 *   node scripts/buildCitizenCards.js --apply --name "Beverly Hayes"  # one citizen
 *
 * Columns from Simulation_Ledger:
 *   A=POPID, B=First, D=Last, J=Tier, K=RoleType, M=BirthYear,
 *   R=TraitProfile, T=Neighborhood, AT=CitizenBio
 */

require('/root/GodWorld/lib/env');
var fs = require('fs');
var path = require('path');
var https = require('https');
var sheets = require('../lib/sheets');

var API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
var CONTAINER_TAG = 'world-data';
var API_HOST = 'api.supermemory.ai';
var APPLY = process.argv.includes('--apply');

// Parse options
var limitArg = process.argv.indexOf('--limit');
var LIMIT = limitArg > 0 ? parseInt(process.argv[limitArg + 1], 10) : 999;

var tierArg = process.argv.indexOf('--tier');
var TIER_FILTER = tierArg > 0 ? parseInt(process.argv[tierArg + 1], 10) : null;

var nameArg = process.argv.indexOf('--name');
var NAME_FILTER = nameArg > 0 ? process.argv[nameArg + 1] : null;

if (!API_KEY) {
  console.error('[ERROR] SUPERMEMORY_CC_API_KEY not set');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPERMEMORY SEARCH
// ═══════════════════════════════════════════════════════════════════════════

function searchSupermemory(query, container) {
  return new Promise(function(resolve, reject) {
    var payload = JSON.stringify({
      q: query,
      containerTag: container,
      searchMode: 'hybrid',
      limit: 5
    });

    var options = {
      hostname: API_HOST,
      path: '/v4/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          var parsed = JSON.parse(data);
          resolve(parsed.results || []);
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on('error', function() { resolve([]); });
    req.setTimeout(10000, function() { req.destroy(); resolve([]); });
    req.write(payload);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// WRITE MEMORY TO WORLD-DATA
// ═══════════════════════════════════════════════════════════════════════════

function writeMemory(content) {
  return new Promise(function(resolve, reject) {
    var payload = JSON.stringify({
      memories: [{ content: content }],
      containerTag: CONTAINER_TAG
    });

    var options = {
      hostname: API_HOST,
      path: '/v4/memories',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode });
        } else {
          reject(new Error('HTTP ' + res.statusCode + ': ' + data));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, function() { req.destroy(); reject(new Error('Timeout')); });
    req.write(payload);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD CITIZEN CARD
// ═══════════════════════════════════════════════════════════════════════════

async function buildCard(citizen, appearances) {
  var lines = [];

  // Header
  lines.push(citizen.first + ' ' + citizen.last + ' (' + citizen.popId + ')');
  lines.push('Neighborhood: ' + (citizen.neighborhood || 'Unknown') +
    ' | Role: ' + (citizen.role || 'Unknown') +
    ' | Tier: ' + citizen.tier +
    ' | Birth: ' + (citizen.birthYear || '?'));

  // Trait profile
  if (citizen.traitProfile) {
    lines.push('Traits: ' + citizen.traitProfile);
  }

  // Bio
  if (citizen.bio) {
    lines.push('Bio: ' + citizen.bio);
  }

  // Appearances from bay-tribune
  if (appearances.length > 0) {
    lines.push('');
    lines.push('APPEARANCES:');
    for (var i = 0; i < appearances.length && i < 8; i++) {
      var a = appearances[i];
      var memText = (a.memory || '').substring(0, 200);
      lines.push('- ' + memText);
    }
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('[buildCitizenCards] Mode: ' + (APPLY ? 'APPLY' : 'DRY-RUN'));
  if (TIER_FILTER) console.log('[buildCitizenCards] Tier filter: ' + TIER_FILTER);
  if (NAME_FILTER) console.log('[buildCitizenCards] Name filter: ' + NAME_FILTER);
  if (LIMIT < 999) console.log('[buildCitizenCards] Limit: ' + LIMIT);
  console.log('');

  // Read Simulation_Ledger — columns A,B,D,J,K,M,R,T,AT
  var client = await sheets.getClient();
  var spreadsheetId = process.env.GODWORLD_SHEET_ID;

  var res = await client.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Simulation_Ledger!A:AT'
  });

  var rows = res.data.values || [];
  if (rows.length < 2) {
    console.error('No data in Simulation_Ledger');
    process.exit(1);
  }

  console.log('[buildCitizenCards] Ledger rows: ' + (rows.length - 1));

  // Column indices (0-based): A=0, B=1, D=3, J=9, K=10, M=12, R=17, T=19, AT=45
  var citizens = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var popId = (r[0] || '').trim();
    var first = (r[1] || '').trim();
    var last = (r[3] || '').trim();
    var tier = parseInt(r[9] || '0', 10);
    var role = (r[10] || '').trim();
    var birthYear = (r[12] || '').trim();
    var traitProfile = (r[17] || '').trim();
    var neighborhood = (r[19] || '').trim();
    var bio = (r[45] || '').trim();

    if (!popId || !first) continue;

    // Filters
    if (TIER_FILTER !== null && tier !== TIER_FILTER) continue;
    if (NAME_FILTER && (first + ' ' + last).toLowerCase().indexOf(NAME_FILTER.toLowerCase()) < 0) continue;

    citizens.push({
      popId: popId,
      first: first,
      last: last,
      tier: tier,
      role: role,
      birthYear: birthYear,
      traitProfile: traitProfile,
      neighborhood: neighborhood,
      bio: bio
    });
  }

  console.log('[buildCitizenCards] Citizens matched: ' + citizens.length);
  if (LIMIT < citizens.length) {
    citizens = citizens.slice(0, LIMIT);
    console.log('[buildCitizenCards] Limited to: ' + citizens.length);
  }

  // Process each citizen
  var written = 0;
  var errors = 0;
  var withAppearances = 0;
  var rawAppearancesTotal = 0;     // pre-filter — for cross-contamination metrics
  var filteredOutTotal = 0;        // dropped by full-name post-filter

  for (var ci = 0; ci < citizens.length; ci++) {
    var cit = citizens[ci];
    var fullName = cit.first + ' ' + cit.last;

    // Search bay-tribune for appearances. Hybrid (vector + keyword) search
    // returns first-name matches, so post-filter on the citizen's full name
    // — without this every "Marcus *" card collected every other Marcus's
    // appearances. Strict substring match (case-insensitive); accepts the
    // false-negative cost of dropping last-name-only later mentions in
    // favor of zero false positives. See ENGINE_REPAIR Row 2 / S181.
    var rawResults = [];
    try {
      rawResults = await searchSupermemory(fullName, 'bay-tribune');
    } catch (e) {
      // No appearances — that's fine
    }

    var fullNameLc = fullName.toLowerCase();
    var appearances = rawResults.filter(function(r) {
      return String(r.memory || '').toLowerCase().indexOf(fullNameLc) >= 0;
    });

    rawAppearancesTotal += rawResults.length;
    filteredOutTotal += (rawResults.length - appearances.length);
    if (appearances.length > 0) withAppearances++;

    // Build the card
    var card = await buildCard(cit, appearances);

    // Quality gate — skip thin cards with no appearances, no traits, no bio
    if (appearances.length === 0 && !cit.traitProfile && !cit.bio) {
      // Bare ledger data only — not worth a Supermemory write
      continue;
    }

    if (!APPLY) {
      if (ci < 5 || appearances.length > 0) {
        console.log('--- ' + fullName + ' (' + cit.popId + ') ---');
        console.log(card.substring(0, 300));
        console.log('  [' + appearances.length + ' appearances]');
        console.log('');
      }
    } else {
      try {
        await writeMemory(card);
        written++;
        if ((ci + 1) % 25 === 0) {
          console.log('  ... ' + (ci + 1) + '/' + citizens.length +
            ' (' + withAppearances + ' with appearances)');
        }
      } catch (e) {
        console.error('[FAIL] ' + fullName + ': ' + e.message);
        errors++;
      }

      // Rate limit — 300ms between writes
      await new Promise(function(r) { setTimeout(r, 300); });
    }
  }

  console.log('');
  console.log('[DONE] Citizens: ' + citizens.length +
    ' | With appearances (post-filter): ' + withAppearances +
    ' | Written: ' + written +
    ' | Errors: ' + errors);
  console.log('[FILTER] Raw bay-tribune hits: ' + rawAppearancesTotal +
    ' | Filtered out (cross-contamination): ' + filteredOutTotal +
    ' | Kept: ' + (rawAppearancesTotal - filteredOutTotal));

  if (!APPLY && citizens.length > 5) {
    console.log('\nShowed first 5 + citizens with appearances. Use --apply to write all.');
  }
}

main().catch(function(e) { console.error('[FATAL]', e); process.exit(1); });
