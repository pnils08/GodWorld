#!/usr/bin/env node
/**
 * crawlSheetsArchive.js — Index all Google Sheets accessible to the service account
 *
 * For each spreadsheet:
 *   - Lists all tabs/sheets
 *   - Reads headers (row 1) for schema
 *   - Counts data rows
 *   - Records grid dimensions
 *
 * Outputs JSON manifest + human-readable markdown index.
 *
 * Usage:
 *   node scripts/crawlSheetsArchive.js
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const OUTPUT_JSON = path.join(__dirname, '..', 'output', 'sheets-manifest.json');
const OUTPUT_MD = path.join(__dirname, '..', 'docs', 'engine', 'SHEETS_MANIFEST.md');

const DELAY_MS = 250;  // Between individual API calls
const BATCH_PAUSE_MS = 5000;  // 5-second pause every 20 tabs to stay under 60 reads/min
const BATCH_SIZE = 20;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  var credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) throw new Error('GOOGLE_APPLICATION_CREDENTIALS not set');

  var auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ],
  });

  var drive = google.drive({ version: 'v3', auth });
  var sheets = google.sheets({ version: 'v4', auth });

  // Step 1: Find all spreadsheets the service account can access
  console.log('Searching for all accessible Google Sheets...\n');

  var allSpreadsheets = [];
  var pageToken = null;

  do {
    var params = {
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: 'nextPageToken, files(id, name, createdTime, modifiedTime, owners)',
      pageSize: 100,
    };
    if (pageToken) params.pageToken = pageToken;

    var response = await drive.files.list(params);
    var files = response.data.files || [];
    allSpreadsheets = allSpreadsheets.concat(files);
    pageToken = response.data.nextPageToken;
    await sleep(DELAY_MS);
  } while (pageToken);

  console.log('Found ' + allSpreadsheets.length + ' spreadsheet(s)\n');

  // Step 2: For each spreadsheet, get tab metadata + headers + row counts
  var manifest = {
    generated: new Date().toISOString(),
    spreadsheetCount: allSpreadsheets.length,
    spreadsheets: [],
  };

  for (var s = 0; s < allSpreadsheets.length; s++) {
    var ss = allSpreadsheets[s];
    console.log('[' + (s + 1) + '/' + allSpreadsheets.length + '] ' + ss.name);

    var ssEntry = {
      id: ss.id,
      name: ss.name,
      created: ss.createdTime,
      modified: ss.modifiedTime,
      tabs: [],
    };

    try {
      // Get spreadsheet metadata with grid properties
      var meta = await sheets.spreadsheets.get({
        spreadsheetId: ss.id,
        fields: 'sheets.properties',
      });
      await sleep(DELAY_MS);

      var tabList = meta.data.sheets || [];

      for (var t = 0; t < tabList.length; t++) {
        // Pause every BATCH_SIZE tabs to let the quota reset
        if (t > 0 && t % BATCH_SIZE === 0) {
          console.log('    [PAUSE] Rate limit cooldown (' + BATCH_PAUSE_MS/1000 + 's)...');
          await sleep(BATCH_PAUSE_MS);
        }
        var tab = tabList[t].properties;
        var tabEntry = {
          title: tab.title,
          index: tab.index,
          sheetId: tab.sheetId,
          rows: tab.gridProperties ? tab.gridProperties.rowCount : 0,
          cols: tab.gridProperties ? tab.gridProperties.columnCount : 0,
          headers: [],
          dataRows: 0,
        };

        // Read headers (row 1) and count data rows
        try {
          var headerRange = tab.title + '!1:1';
          var headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: ss.id,
            range: headerRange,
          });
          tabEntry.headers = (headerResponse.data.values && headerResponse.data.values[0]) || [];
          await sleep(DELAY_MS);

          // Get actual data row count (read column A to find last row with data)
          var colARange = tab.title + '!A:A';
          var colAResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: ss.id,
            range: colARange,
          });
          var colAValues = colAResponse.data.values || [];
          // Subtract 1 for header row, filter out empty rows
          tabEntry.dataRows = Math.max(0, colAValues.filter(function(r) { return r[0] && r[0].toString().trim(); }).length - 1);
          await sleep(DELAY_MS);
        } catch (headerErr) {
          console.log('    [WARN] Could not read headers for ' + tab.title + ': ' + headerErr.message);
        }

        console.log('    ' + tab.title + ' — ' + tabEntry.headers.length + ' cols, ' + tabEntry.dataRows + ' data rows');
        ssEntry.tabs.push(tabEntry);
      }
    } catch (err) {
      console.error('  [ERROR] ' + err.message);
      ssEntry.error = err.message;
    }

    manifest.spreadsheets.push(ssEntry);
  }

  // Step 3: Write JSON manifest
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(manifest, null, 2));
  console.log('\nJSON manifest: ' + OUTPUT_JSON);

  // Step 4: Write markdown index
  var md = buildMarkdown(manifest);
  fs.writeFileSync(OUTPUT_MD, md);
  console.log('Markdown index: ' + OUTPUT_MD);

  // Summary
  var totalTabs = manifest.spreadsheets.reduce(function(sum, ss) { return sum + ss.tabs.length; }, 0);
  var totalRows = manifest.spreadsheets.reduce(function(sum, ss) {
    return sum + ss.tabs.reduce(function(tsum, t) { return tsum + t.dataRows; }, 0);
  }, 0);
  console.log('\nDone! ' + manifest.spreadsheetCount + ' spreadsheets, ' + totalTabs + ' tabs, ~' + totalRows + ' data rows.');
}

function buildMarkdown(manifest) {
  var lines = [];
  lines.push('# Google Sheets Manifest');
  lines.push('');
  lines.push('**Generated:** ' + manifest.generated);
  lines.push('**Spreadsheets:** ' + manifest.spreadsheetCount);
  lines.push('');

  var totalTabs = 0;
  var totalRows = 0;

  manifest.spreadsheets.forEach(function(ss) {
    lines.push('---');
    lines.push('');
    lines.push('## ' + ss.name);
    lines.push('');
    lines.push('- **ID:** `' + ss.id + '`');
    lines.push('- **Modified:** ' + (ss.modified || 'unknown'));
    lines.push('- **Tabs:** ' + ss.tabs.length);
    lines.push('');

    if (ss.error) {
      lines.push('> Error: ' + ss.error);
      lines.push('');
      return;
    }

    lines.push('| Tab | Data Rows | Columns | Headers (first 8) |');
    lines.push('|-----|-----------|---------|-------------------|');

    ss.tabs.forEach(function(tab) {
      totalTabs++;
      totalRows += tab.dataRows;

      var headerPreview = tab.headers.slice(0, 8).join(', ');
      if (tab.headers.length > 8) headerPreview += ', ...(' + tab.headers.length + ' total)';

      lines.push('| ' + tab.title + ' | ' + tab.dataRows + ' | ' + tab.headers.length + ' | ' + headerPreview + ' |');
    });

    lines.push('');
  });

  lines.push('---');
  lines.push('');
  lines.push('**Totals:** ' + manifest.spreadsheetCount + ' spreadsheets, ' + totalTabs + ' tabs, ~' + totalRows + ' data rows');
  lines.push('');
  lines.push('*Use `lib/sheets.js` to query any tab: `sheets.getSheetData("TabName")`*');

  return lines.join('\n');
}

main().catch(function(err) {
  console.error('Fatal:', err.message);
  process.exit(1);
});
