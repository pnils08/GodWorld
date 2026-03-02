#!/usr/bin/env node
/**
 * processBusinessIntake.js — Phase 12.5
 *
 * Promotes staged businesses from Business_Intake to Business_Ledger.
 * Assigns BIZ-IDs, checks for duplicates, updates employer_mapping.json.
 *
 * Usage:
 *   node scripts/processBusinessIntake.js --dry-run   # Preview
 *   node scripts/processBusinessIntake.js              # Apply
 *
 * Pattern follows: integrateFaithLeaders.js, integrateCelebrities.js
 */

var path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

var fs = require('fs');
var sheets = require('../lib/sheets');

var DRY_RUN = process.argv.includes('--dry-run');

/**
 * Fuzzy match: lowercase, strip common suffixes, check if names are similar.
 */
function normalizeName(name) {
  return (name || '').toLowerCase().trim()
    .replace(/['']/g, "'")
    .replace(/\s+(llc|inc|corp|ltd|co)\.?$/i, '')
    .replace(/^the\s+/i, '');
}

function isDuplicate(newName, existingNames) {
  var norm = normalizeName(newName);
  for (var i = 0; i < existingNames.length; i++) {
    if (normalizeName(existingNames[i]) === norm) return existingNames[i];
  }
  return null;
}

/**
 * Pad BIZ-ID number to 5 digits: 52 → "BIZ-00052"
 */
function formatBizId(num) {
  var s = String(num);
  while (s.length < 5) s = '0' + s;
  return 'BIZ-' + s;
}

async function main() {
  console.log('=== processBusinessIntake.js ===');
  console.log('Mode:', DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE');
  console.log('');

  // 1. Read Business_Intake as objects (header → key)
  var intakeRows;
  try {
    intakeRows = await sheets.getSheetAsObjects('Business_Intake');
  } catch (e) {
    console.log('ERROR: Business_Intake sheet not found.');
    console.log('Create it with headers: Name | Sector | Neighborhood | Description | SourceEdition | SourceCycle | Status');
    process.exit(1);
  }

  if (!intakeRows || intakeRows.length === 0) {
    console.log('Business_Intake is empty. Nothing to process.');
    return;
  }

  // Filter to staged entries only
  var staged = intakeRows.filter(function(r) {
    return (r.Status || '').toLowerCase().trim() === 'staged';
  });

  if (staged.length === 0) {
    console.log('No staged entries in Business_Intake. Nothing to promote.');
    return;
  }

  console.log('Found ' + staged.length + ' staged entries in Business_Intake.');

  // 2. Read Business_Ledger (existing BIZ-IDs, detect duplicates)
  var bizRows = await sheets.getSheetAsObjects('Business_Ledger');
  var existingNames = [];
  var maxBizNum = 0;

  for (var i = 0; i < bizRows.length; i++) {
    var bizId = (bizRows[i].BIZ_ID || '').trim();
    var bizName = (bizRows[i].Name || '').trim();
    if (bizName) existingNames.push(bizName);
    var match = bizId.match(/^BIZ-(\d+)$/);
    if (match) {
      var num = parseInt(match[1], 10);
      if (num > maxBizNum) maxBizNum = num;
    }
  }

  console.log('Business_Ledger has ' + bizRows.length + ' entries. Max BIZ-ID: ' + formatBizId(maxBizNum));
  console.log('');

  // 3. Process each staged entry
  var newRows = [];
  var promoted = [];
  var rejected = [];
  var nextBizNum = maxBizNum + 1;

  for (var s = 0; s < staged.length; s++) {
    var entry = staged[s];
    var name = (entry.Name || '').trim();

    if (!name) {
      console.log('  SKIP: Empty name in row ' + (s + 1));
      rejected.push({ entry: entry, reason: 'Empty name' });
      continue;
    }

    var dupe = isDuplicate(name, existingNames);
    if (dupe) {
      console.log('  DUPLICATE: "' + name + '" matches existing "' + dupe + '" — skipping');
      rejected.push({ entry: entry, reason: 'Duplicate of ' + dupe });
      continue;
    }

    var newBizId = formatBizId(nextBizNum);
    nextBizNum++;

    var newRow = {
      BIZ_ID: newBizId,
      Name: name,
      Sector: (entry.Sector || '').trim(),
      Neighborhood: (entry.Neighborhood || '').trim(),
      Employee_Count: 0,
      Avg_Salary: '',
      Annual_Revenue: '',
      Growth_Rate: 'New',
      Key_Personnel: ''
    };

    newRows.push(newRow);
    promoted.push({ entry: entry, bizId: newBizId, intakeIndex: intakeRows.indexOf(entry) });
    existingNames.push(name);

    console.log('  PROMOTE: ' + newBizId + ' — ' + name + ' (' + (newRow.Sector || 'Unknown') + ', ' + (newRow.Neighborhood || 'Unknown') + ')');
  }

  console.log('');
  console.log('Summary: ' + promoted.length + ' promoted, ' + rejected.length + ' rejected');

  if (promoted.length === 0) {
    console.log('Nothing to write.');
    return;
  }

  if (DRY_RUN) {
    console.log('');
    console.log('DRY RUN — no writes performed. Remove --dry-run to apply.');
    return;
  }

  // 4. Batch write new rows to Business_Ledger
  console.log('');
  console.log('Writing ' + newRows.length + ' rows to Business_Ledger...');

  var bizHeader = ['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', 'Avg_Salary', 'Annual_Revenue', 'Growth_Rate', 'Key_Personnel'];
  var appendValues = newRows.map(function(r) {
    return bizHeader.map(function(h) { return r[h] !== undefined ? r[h] : ''; });
  });

  await sheets.appendRows('Business_Ledger', appendValues);
  console.log('  -> Business_Ledger updated.');

  // 5. Update Business_Intake statuses via updateRangeByPosition
  // Get header row to find Status column index
  console.log('Updating Business_Intake statuses...');

  var rawIntake = await sheets.getSheetData('Business_Intake');
  if (rawIntake.length > 0) {
    var intakeHeader = rawIntake[0];
    var statusCol = intakeHeader.indexOf('Status');

    if (statusCol >= 0) {
      // Build status updates: promoted entries get 'promoted', rejected get reason
      var statusUpdates = [];

      for (var p = 0; p < promoted.length; p++) {
        // intakeIndex is 0-based in the objects array, which is row index - 1 (header)
        // So sheet row = intakeIndex + 2 (1 for 0-index, 1 for header)
        var sheetRow = promoted[p].intakeIndex + 2;
        statusUpdates.push({ row: sheetRow, value: 'promoted' });
      }

      for (var r = 0; r < rejected.length; r++) {
        var rejIdx = intakeRows.indexOf(rejected[r].entry);
        if (rejIdx >= 0) {
          statusUpdates.push({ row: rejIdx + 2, value: 'rejected: ' + rejected[r].reason });
        }
      }

      // Write each status update
      for (var u = 0; u < statusUpdates.length; u++) {
        await sheets.updateRangeByPosition('Business_Intake', statusUpdates[u].row, statusCol, [[statusUpdates[u].value]]);
      }

      console.log('  -> Business_Intake statuses updated (' + statusUpdates.length + ' rows).');
    }
  }

  // 6. Append to employer_mapping.json newBusinesses array
  console.log('Updating employer_mapping.json...');

  var mappingPath = path.resolve(__dirname, '..', 'data', 'employer_mapping.json');
  var mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

  for (var n = 0; n < newRows.length; n++) {
    mapping.newBusinesses.push({
      bizId: newRows[n].BIZ_ID,
      name: newRows[n].Name,
      sector: newRows[n].Sector,
      neighborhood: newRows[n].Neighborhood
    });
  }

  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2) + '\n', 'utf8');
  console.log('  -> employer_mapping.json updated (' + mapping.newBusinesses.length + ' total entries).');

  console.log('');
  console.log('Done. ' + promoted.length + ' businesses promoted to Business_Ledger.');
}

main().catch(function(err) {
  console.error('FATAL:', err.message || err);
  process.exit(1);
});
