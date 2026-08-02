#!/usr/bin/env node
/**
 * Link Citizens to Employers — Phase 14.4 Business Linkage
 *
 * Five-layer employer resolution:
 *   1. Sports override (SPORTS_OVERRIDE → BIZ-00005 for A's)
 *   2. Parenthetical extraction ("Crane Operator (Port of Oakland)" → BIZ-00012)
 *   3. Keyword matching ("AC Transit Bus Driver" → BIZ-00013)
 *   4. Self-employed detection ("Taqueria Owner" → SELF_EMPLOYED)
 *   5. Category default (economic profile category → default BIZ-ID)
 *
 * Usage:
 *   node scripts/linkCitizensToEmployers.js --dry-run    # Preview
 *   node scripts/linkCitizensToEmployers.js               # Apply
 *
 * Phase 14.4 of the Economic Parameter Wiring plan.
 */

const path = require('path');
require('/root/GodWorld/lib/env');

const sheets = require('../lib/sheets');
const fs = require('fs');

const DRY_RUN = process.argv.includes('--dry-run');
// S313: --fill-blanks-only — write ONLY citizens whose EmployerBizId is
// currently blank, and never write the literal 'UNMATCHED' (leave blank —
// the career engine treats '' as no-employer; 'UNMATCHED' would pollute
// businessDeltas keys). Protects career-engine-maintained employer state
// (hires/layoffs since Phase 14.4) from being clobbered by re-resolution.
// Roster rebuild + new-business append are unaffected by the flag.
const FILL_BLANKS_ONLY = process.argv.includes('--fill-blanks-only');
// engine.83 Task 7: --list-unmatched — print every UNMATCHED citizen with the
// fields a rule proposer needs (RoleType/EconomicProfileKey/Neighborhood).
const LIST_UNMATCHED = process.argv.includes('--list-unmatched');

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RUN ===');
  console.log('');

  // Load mapping data
  var employerMappingPath = path.resolve(__dirname, '..', 'data', 'employer_mapping.json');
  var roleMappingPath = path.resolve(__dirname, '..', 'data', 'role_mapping.json');
  var econParamsPath = path.resolve(__dirname, '..', 'data', 'economic_parameters.json');

  var employerMapping = JSON.parse(fs.readFileSync(employerMappingPath, 'utf8'));
  var roleMapping = JSON.parse(fs.readFileSync(roleMappingPath, 'utf8'));
  var econParams = JSON.parse(fs.readFileSync(econParamsPath, 'utf8'));

  // Index economic params by role name for category lookup
  var paramByRole = {};
  for (var i = 0; i < econParams.length; i++) {
    paramByRole[econParams[i].role] = econParams[i];
  }

  // Compile self-employed regex patterns
  var selfEmployedRegexes = employerMapping.selfEmployedPatterns.map(function(p) {
    return new RegExp(p);
  });

  console.log('Loaded:');
  console.log('  Employer mapping: ' + Object.keys(employerMapping.parentheticalLookup).length + ' parenthetical, ' +
              employerMapping.keywordRules.length + ' keyword rules, ' +
              employerMapping.selfEmployedPatterns.length + ' self-employed patterns, ' +
              Object.keys(employerMapping.categoryDefaults).length + ' category defaults');
  console.log('  Role mapping: ' + Object.keys(roleMapping).length + ' entries');
  console.log('  Economic parameters: ' + econParams.length + ' profiles');
  console.log('');

  // Read Simulation_Ledger
  var ledgerData = await sheets.getSheetData('Simulation_Ledger');
  var header = ledgerData[0];
  var rows = ledgerData.slice(1);

  function col(name) { return header.indexOf(name); }

  var iPOPID = col('POPID');
  var iFirst = col('First');
  var iLast = col('Last');
  var iRoleType = col('RoleType');
  var iStatus = col('Status');
  var iNeighborhood = col('Neighborhood');
  var iIncome = col('Income');
  var iEconKey = col('EconomicProfileKey');
  var iOriginGame = col('OriginGame');
  var iTier = col('Tier');

  // Check if EmployerBizId column exists
  var iEmployerBizId = col('EmployerBizId');
  var employerColExists = iEmployerBizId >= 0;
  if (!employerColExists) {
    iEmployerBizId = header.length; // Will be new column at end
    console.log('EmployerBizId column not found — will create at position ' + iEmployerBizId);
  } else {
    console.log('EmployerBizId column exists at position ' + iEmployerBizId);
  }

  console.log('Simulation_Ledger: ' + rows.length + ' rows');
  console.log('');

  // Read existing Business_Ledger
  var bizData = await sheets.getSheetData('Business_Ledger');
  var bizHeader = bizData[0];
  var bizRows = bizData.slice(1);
  var existingBizIds = {};
  var iBizId = bizHeader.indexOf('BIZ_ID');
  for (var b = 0; b < bizRows.length; b++) {
    var bid = (bizRows[b][iBizId] || '').toString().trim();
    if (bid) existingBizIds[bid] = true;
  }
  console.log('Existing businesses: ' + Object.keys(existingBizIds).length);

  // Check which new businesses need adding
  var newBizToAdd = employerMapping.newBusinesses.filter(function(nb) {
    return !existingBizIds[nb.bizId];
  });
  console.log('New businesses to add: ' + newBizToAdd.length);
  console.log('');

  // === RESOLVE EMPLOYERS ===

  var layerCounts = { sports: 0, parenthetical: 0, keyword: 0, selfEmployed: 0, category: 0 };
  var skippedInactive = 0;
  var skippedNoRole = 0;
  var skippedNoEmployment = 0;
  // engine.83 Task 7: roles with no employment expected. Students, retirees,
  // hall-of-famers and "resident" placeholder roles are not failed matches —
  // counting them as UNMATCHED buries the real unresolved tail in noise.
  // Blank employer is correct for them; they are skipped, not unresolved.
  var NO_EMPLOYMENT_ROLE = /^student$|retired|hall of famer|resident$/i;
  var unmatched = 0;
  var results = []; // { rowIndex, popId, name, roleType, bizId, layer }
  var bizEmployees = {}; // bizId → [{ popId, name, roleType, income }]

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var status = (row[iStatus] || '').toString().toLowerCase().trim();
    if (status === 'deceased' || status === 'inactive' || status === 'departed') {
      skippedInactive++;
      continue;
    }

    var roleType = (row[iRoleType] || '').toString().trim();
    if (!roleType) {
      skippedNoRole++;
      continue;
    }
    if (NO_EMPLOYMENT_ROLE.test(roleType)) {
      skippedNoEmployment++;
      continue;
    }

    var popId = (row[iPOPID] || '').toString().trim();
    var name = ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim();
    var income = parseFloat(row[iIncome]) || 0;
    var econKey = (row[iEconKey] || '').toString().trim();
    var originGame = (row[iOriginGame] || '').toString().trim();

    var bizId = null;
    var layer = null;

    // Layer 1: Sports override
    // S334: driven by OriginGame → franchise, so a roster tab is the source of
    // truth rather than a keyword guess. NBA 2K citizens are the Oakland Oaks
    // (Oaks_Roster, POP-01022..01028) — previously they matched nothing here and
    // fell all the way through to UNMATCHED with a blank employer.
    // SPORTS_OTHER stays an INTERNAL sentinel only. It must never be written:
    // it is not a BIZ_ID, and 7 ledger rows kept it as a literal value. Athletes
    // from defunct/other leagues (MUBA hall-of-famers) have no current employer,
    // so they fall through to later layers and end blank — which is honest.
    if (econKey === 'SPORTS_OVERRIDE' || roleMapping[roleType] === 'SPORTS_OVERRIDE' ||
        originGame === 'MLB The Show' || originGame === 'NBA 2K') {
      if (originGame === 'MLB The Show') {
        bizId = 'BIZ-00005'; // Oakland Athletics
        layer = 'sports';
      } else if (originGame === 'NBA 2K') {
        bizId = 'BIZ-00074'; // Oakland Oaks
        layer = 'sports';
      } else {
        // Other/defunct leagues — no franchise linkage. Leave `layer` NULL so
        // layers 2-5 still get a turn (every one of them is guarded by
        // `if (!layer)`, so marking this 'sports' would silently strand the
        // citizen on a sentinel). If nothing else resolves, the fallback turns
        // it into UNMATCHED and the write path leaves the cell blank.
        bizId = 'SPORTS_OTHER';
        layer = null;
      }
    }

    // Layer 2: Parenthetical extraction
    if (!bizId || bizId === 'SPORTS_OTHER') {
      // Only try parenthetical if not already resolved as sports
      if (!layer) {
        var parenMatch = roleType.match(/\(([^)]+)\)/);
        if (parenMatch) {
          var extracted = parenMatch[1].trim();
          if (employerMapping.parentheticalLookup[extracted]) {
            bizId = employerMapping.parentheticalLookup[extracted];
            layer = 'parenthetical';
          }
        }
      }
    }

    // Layer 3: Keyword matching
    if (!bizId || bizId === 'SPORTS_OTHER') {
      if (!layer) {
        for (var k = 0; k < employerMapping.keywordRules.length; k++) {
          var rule = employerMapping.keywordRules[k];
          if (roleType.indexOf(rule.pattern) !== -1) {
            bizId = rule.bizId;
            layer = 'keyword';
            break;
          }
        }
      }
    }

    // Layer 4: Self-employed detection
    if (!bizId || bizId === 'SPORTS_OTHER') {
      if (!layer) {
        for (var s = 0; s < selfEmployedRegexes.length; s++) {
          if (selfEmployedRegexes[s].test(roleType)) {
            bizId = 'SELF_EMPLOYED';
            layer = 'selfEmployed';
            break;
          }
        }
      }
    }

    // Layer 5: Category default
    if (!bizId || bizId === 'SPORTS_OTHER') {
      if (!layer) {
        var mappedProfileName = roleMapping[roleType];
        var profile = mappedProfileName ? paramByRole[mappedProfileName] : null;
        if (profile && profile.category && employerMapping.categoryDefaults[profile.category]) {
          bizId = employerMapping.categoryDefaults[profile.category];
          layer = 'category';
        }
      }
    }

    // Fallback — SPORTS_OTHER counts as unresolved (S334). It is an internal
    // sentinel, not a BIZ_ID; letting it survive to here is what put the literal
    // string into 7 ledger rows.
    if (!bizId || bizId === 'SPORTS_OTHER') {
      bizId = 'UNMATCHED';
      layer = 'unmatched';
      unmatched++;
    }

    if (layer && layer !== 'unmatched') {
      layerCounts[layer]++;
    }

    results.push({
      rowIndex: r,
      popId: popId,
      name: name,
      roleType: roleType,
      bizId: bizId,
      layer: layer,
      income: income,
      econKey: econKey,
      neighborhood: (row[iNeighborhood] || '').toString().trim()
    });

    // Accumulate employee data per business
    if (bizId && bizId !== 'SELF_EMPLOYED' && bizId !== 'SPORTS_OTHER' && bizId !== 'UNMATCHED') {
      if (!bizEmployees[bizId]) bizEmployees[bizId] = [];
      bizEmployees[bizId].push({ popId: popId, name: name, roleType: roleType, income: income });
    }
  }

  // === REPORT ===
  var totalMapped = results.length;
  console.log('--- RESULTS ---');
  console.log('Total citizens processed: ' + totalMapped);
  console.log('  Layer 1 (sports): ' + layerCounts.sports);
  console.log('  Layer 2 (parenthetical): ' + layerCounts.parenthetical);
  console.log('  Layer 3 (keyword): ' + layerCounts.keyword);
  console.log('  Layer 4 (self-employed): ' + layerCounts.selfEmployed);
  console.log('  Layer 5 (category): ' + layerCounts.category);
  console.log('  Skipped (inactive): ' + skippedInactive);
  console.log('  Skipped (no role): ' + skippedNoRole);
  console.log('  Skipped (no employment expected — student/retired/HoF/resident): ' + skippedNoEmployment);
  console.log('  Unmatched: ' + unmatched);
  console.log('');

  // Employer distribution
  var bizNames = {};
  // Build name index from existing + new businesses
  for (var bn = 0; bn < bizRows.length; bn++) {
    var bRow = bizRows[bn];
    var bId = (bRow[iBizId] || '').toString().trim();
    var bName = (bRow[bizHeader.indexOf('Name')] || '').toString().trim();
    if (bId) bizNames[bId] = bName;
  }
  for (var nb2 = 0; nb2 < employerMapping.newBusinesses.length; nb2++) {
    var nb = employerMapping.newBusinesses[nb2];
    bizNames[nb.bizId] = nb.name;
  }

  console.log('--- EMPLOYER DISTRIBUTION ---');
  var selfEmployedCount = results.filter(function(r) { return r.bizId === 'SELF_EMPLOYED'; }).length;
  var sportsOtherCount = results.filter(function(r) { return r.bizId === 'SPORTS_OTHER'; }).length;

  // Sort by employee count
  var bizList = Object.keys(bizEmployees).map(function(bid) {
    var emps = bizEmployees[bid];
    var totalInc = 0;
    var incCount = 0;
    emps.forEach(function(e) {
      if (e.income > 0) { totalInc += e.income; incCount++; }
    });
    return {
      bizId: bid,
      name: bizNames[bid] || bid,
      count: emps.length,
      avgSalary: incCount > 0 ? Math.round(totalInc / incCount) : 0
    };
  }).sort(function(a, b) { return b.count - a.count; });

  bizList.forEach(function(b) {
    console.log('  ' + b.bizId + ' ' + b.name + ': ' + b.count + ' employees, avg $' + b.avgSalary.toLocaleString());
  });
  console.log('  SELF_EMPLOYED: ' + selfEmployedCount + ' citizens');
  if (sportsOtherCount > 0) console.log('  SPORTS_OTHER: ' + sportsOtherCount + ' (non-Oakland athletes)');
  if (unmatched > 0) console.log('  UNMATCHED: ' + unmatched);
  console.log('');

  // Sample mappings
  console.log('--- SAMPLE MAPPINGS (first 20) ---');
  var samples = results.filter(function(r) { return r.bizId !== 'SPORTS_OTHER'; }).slice(0, 20);
  samples.forEach(function(r) {
    console.log('  ' + r.popId + ' ' + r.name + ' | ' + r.roleType + ' → ' +
                r.bizId + ' ' + (bizNames[r.bizId] || '') + ' [' + r.layer + ']');
  });
  console.log('');

  if (LIST_UNMATCHED) {
    console.log('--- UNMATCHED CITIZENS ---');
    results.filter(function(r) { return r.layer === 'unmatched'; }).forEach(function(r) {
      console.log('  ' + r.popId + ' | ' + r.name + ' | ' + r.roleType + ' | econ=' + (r.econKey || '?') + ' | hood=' + (r.neighborhood || '?'));
    });
    console.log('');
  }

  if (DRY_RUN) {
    console.log('=== DRY RUN COMPLETE — no changes written ===');
    return;
  }

  // === LIVE WRITES ===

  // 1. Add new businesses to Business_Ledger
  if (newBizToAdd.length > 0) {
    console.log('Adding ' + newBizToAdd.length + ' new businesses to Business_Ledger...');
    var newBizRows = newBizToAdd.map(function(nb) {
      return [nb.bizId, nb.name, nb.sector, nb.neighborhood, '', '', '', '', ''];
    });
    await sheets.appendRows('Business_Ledger', newBizRows);
    console.log('  Done');
  }

  // 2. Write EmployerBizId column to Simulation_Ledger
  console.log('Writing EmployerBizId to Simulation_Ledger...');

  // Add header if column doesn't exist
  if (!employerColExists) {
    function colLetter(idx) {
      if (idx < 26) return String.fromCharCode(65 + idx);
      return String.fromCharCode(64 + Math.floor(idx / 26)) + String.fromCharCode(65 + (idx % 26));
    }
    var headerCell = 'Simulation_Ledger!' + colLetter(iEmployerBizId) + '1';
    await sheets.updateRange(headerCell, [['EmployerBizId']]);
    console.log('  Created EmployerBizId header at column ' + colLetter(iEmployerBizId));
  }

  // Batch write employer values
  function colLetter2(idx) {
    if (idx < 26) return String.fromCharCode(65 + idx);
    return String.fromCharCode(64 + Math.floor(idx / 26)) + String.fromCharCode(65 + (idx % 26));
  }
  var empCol = colLetter2(iEmployerBizId);

  var batchUpdates = [];
  var skippedExisting = 0, skippedUnmatched = 0;
  for (var w = 0; w < results.length; w++) {
    var res = results[w];
    if (FILL_BLANKS_ONLY) {
      var existing = employerColExists ? String(rows[res.rowIndex][iEmployerBizId] || '').trim() : '';
      if (existing) { skippedExisting++; continue; }
      if (res.bizId === 'UNMATCHED') { skippedUnmatched++; continue; }
    }
    var rowNum = res.rowIndex + 2; // +1 header, +1 for 1-based
    batchUpdates.push({
      range: 'Simulation_Ledger!' + empCol + rowNum,
      values: [[res.bizId]]
    });
  }
  if (FILL_BLANKS_ONLY) {
    console.log('  --fill-blanks-only: writing ' + batchUpdates.length + ' blank cells; kept ' +
      skippedExisting + ' existing values; left ' + skippedUnmatched + ' UNMATCHED blank');
  }

  // Write in chunks of 500
  var CHUNK = 500;
  for (var c = 0; c < batchUpdates.length; c += CHUNK) {
    var chunk = batchUpdates.slice(c, c + CHUNK);
    await sheets.batchUpdate(chunk);
    console.log('  Wrote cells ' + (c + 1) + '-' + Math.min(c + CHUNK, batchUpdates.length) + ' of ' + batchUpdates.length);
  }

  // 3. Create Employment_Roster
  console.log('Creating Employment_Roster...');
  try { await sheets.deleteSheet('Employment_Roster'); } catch (e) { /* doesn't exist yet */ }

  var rosterHeaders = ['BIZ_ID', 'POP_ID', 'CitizenName', 'RoleType', 'Status', 'MappingLayer'];
  await sheets.createSheet('Employment_Roster', rosterHeaders);

  var rosterRows = results.map(function(r) {
    var rosterStatus = 'Active';
    if (r.bizId === 'SELF_EMPLOYED') rosterStatus = 'SELF_EMPLOYED';
    else if (r.layer === 'sports') rosterStatus = 'SPORTS_OVERRIDE';
    else if (r.bizId === 'SPORTS_OTHER') rosterStatus = 'SPORTS_OTHER';
    return [r.bizId, r.popId, r.name, r.roleType, rosterStatus, r.layer];
  });

  // Write in chunks
  for (var rc = 0; rc < rosterRows.length; rc += CHUNK) {
    var rosterChunk = rosterRows.slice(rc, rc + CHUNK);
    await sheets.appendRows('Employment_Roster', rosterChunk);
    console.log('  Roster rows ' + (rc + 1) + '-' + Math.min(rc + CHUNK, rosterRows.length) + ' of ' + rosterRows.length);
  }

  // 4. Headcount sanity check against Business_Ledger (read-only — S349)
  console.log('Checking Business_Ledger headcounts...');

  // Re-read Business_Ledger to get updated row positions (after new rows added)
  var updatedBizData = await sheets.getSheetData('Business_Ledger');
  var updatedBizHeader = updatedBizData[0];
  var updatedBizRows = updatedBizData.slice(1);

  var iBizIdCol = updatedBizHeader.indexOf('BIZ_ID');
  var iEmpCount = updatedBizHeader.indexOf('Employee_Count');

  var headcountViolations = []; // tracked > stated — the only illegal state (S334)
  for (var br = 0; br < updatedBizRows.length; br++) {
    var bizRow = updatedBizRows[br];
    var thisBizId = (bizRow[iBizIdCol] || '').toString().trim();
    if (bizEmployees[thisBizId]) {
      var emps = bizEmployees[thisBizId];

      // S334 (Mike-direct): Employee_Count is the business's ACTUAL headcount, not
      // the tracked-citizen count. Simulation_Ledger tracks a ~1:443 sample, so
      // DigitalOcean legitimately employs 800 with 3 tracked — that is allowed and
      // must not be "corrected" to 3. This block used to overwrite the column with
      // emps.length, which silently replaced real headcounts with sample counts and
      // left the column meaning two different things depending on whether a row had
      // any tracked citizens. It no longer writes.
      //
      // The ONE illegal state is tracked > stated: a business claiming 10 employees
      // while 20 tracked citizens say they work there. Report it; a human decides
      // whether the headcount is understated or the assignment is over-stuffed.
      if (iEmpCount >= 0) {
        var statedCount = parseInt(bizRow[iEmpCount], 10);
        if (!isNaN(statedCount) && emps.length > statedCount) {
          headcountViolations.push({
            bizId: thisBizId,
            stated: statedCount,
            tracked: emps.length
          });
        }
      }
      // S349: Avg_Salary no longer writes — it carried the same conflation the
      // S334 note above fixed for Employee_Count: a whole-org average silently
      // replaced by the mean of a handful of tracked citizens (1 tracked row
      // rewrote Peralta CCD to that one salary). The sample never overwrites
      // the institution figure. Repair of the 41 already-overwritten rows:
      // ENGINE_REPAIR row 34.
    }
  }

  if (headcountViolations.length > 0) {
    console.log('');
    console.log('  !! HEADCOUNT VIOLATIONS — tracked citizens exceed the stated Employee_Count.');
    console.log('     Either the headcount is understated or the assignment is over-stuffed. Not auto-fixed.');
    headcountViolations.forEach(function(v) {
      console.log('     ' + v.bizId + ': stated ' + v.stated + ', tracked ' + v.tracked);
    });
  } else {
    console.log('  Headcount check: no business has more tracked citizens than stated employees.');
  }

  console.log('');
  console.log('=== COMPLETE ===');
}

main().catch(function(err) {
  console.error('FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
