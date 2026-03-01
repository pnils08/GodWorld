#!/usr/bin/env node
/**
 * backupSpreadsheet.js — Full backup of the GodWorld spreadsheet
 *
 * Two-layer backup:
 *   1. Google Drive copy — exact duplicate of the spreadsheet (formatting, formulas, structure)
 *   2. Local CSV export — every tab saved as CSV to backups/sheets/YYYY-MM-DD/
 *
 * Usage:
 *   node scripts/backupSpreadsheet.js              # both layers
 *   node scripts/backupSpreadsheet.js --local-only  # CSV export only (no Drive copy)
 *   node scripts/backupSpreadsheet.js --drive-only   # Drive copy only (no local CSVs)
 *
 * Requires:
 *   - .env with GODWORLD_SHEET_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 *   - credentials/service-account.json for Sheets reads
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');

const TODAY = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const TIMESTAMP = new Date().toISOString();
const BACKUP_DIR = path.resolve(__dirname, '..', 'backups', 'sheets', TODAY);
const DRIVE_BACKUP_FOLDER = '1Ocfs30_u0pDKAjPDitLCEVEuTNJkQH7f'; // Back-ups folder in Drive

// ── Helpers ──────────────────────────────────────────────────────────────────

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'OAuth2 credentials not configured. Need GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN in .env'
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

function escapeCsvField(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function rowToCsv(row) {
  return row.map(escapeCsvField).join(',');
}

// ── Drive Copy ───────────────────────────────────────────────────────────────

async function copySpreadsheetInDrive() {
  const spreadsheetId = process.env.GODWORLD_SHEET_ID;
  if (!spreadsheetId) throw new Error('GODWORLD_SHEET_ID not set');

  const auth = getOAuth2Client();
  const drive = google.drive({ version: 'v3', auth });

  const copyName = `Simulation_Narrative_BACKUP_${TODAY}`;

  console.log(`Creating Drive copy: "${copyName}"...`);

  const response = await drive.files.copy({
    fileId: spreadsheetId,
    requestBody: {
      name: copyName,
      parents: [DRIVE_BACKUP_FOLDER],
    },
  });

  const copyId = response.data.id;
  console.log(`  Drive copy created: ${copyId}`);
  console.log(`  URL: https://docs.google.com/spreadsheets/d/${copyId}`);

  return { copyId, copyName, copyUrl: `https://docs.google.com/spreadsheets/d/${copyId}` };
}

// ── Local CSV Export ─────────────────────────────────────────────────────────

async function exportAllTabsAsCsv() {
  // Get all tab names
  const tabList = await sheets.listSheets();
  console.log(`\nExporting ${tabList.length} tabs to ${BACKUP_DIR}/...`);

  // Create backup directory
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const manifest = {
    timestamp: TIMESTAMP,
    date: TODAY,
    spreadsheetId: process.env.GODWORLD_SHEET_ID,
    driveCopy: null, // filled in by caller
    tabs: [],
  };

  for (const tab of tabList) {
    const tabName = tab.title;
    // Sanitize filename — replace special chars
    const safeFilename = tabName.replace(/[\/\\?%*:|"<>]/g, '_') + '.csv';

    try {
      const data = await sheets.getSheetData(tabName);
      const rowCount = data.length;
      const colCount = data.length > 0 ? data[0].length : 0;

      // Write CSV
      const csvContent = data.map(rowToCsv).join('\n');
      const filePath = path.join(BACKUP_DIR, safeFilename);
      fs.writeFileSync(filePath, csvContent, 'utf-8');

      manifest.tabs.push({
        tabName,
        filename: safeFilename,
        rows: rowCount,
        columns: colCount,
      });

      console.log(`  ${tabName}: ${rowCount} rows × ${colCount} cols → ${safeFilename}`);
    } catch (err) {
      console.error(`  ERROR on tab "${tabName}": ${err.message}`);
      manifest.tabs.push({
        tabName,
        filename: safeFilename,
        error: err.message,
      });
    }
  }

  return manifest;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const localOnly = args.includes('--local-only');
  const driveOnly = args.includes('--drive-only');

  console.log(`\n=== GodWorld Spreadsheet Backup — ${TODAY} ===\n`);

  let driveCopy = null;
  let manifest = null;

  // Step 1: Drive copy
  if (!localOnly) {
    try {
      driveCopy = await copySpreadsheetInDrive();
    } catch (err) {
      console.error(`\nDrive copy failed: ${err.message}`);
      if (driveOnly) process.exit(1);
      console.log('Continuing with local export...\n');
    }
  }

  // Step 2: Local CSV export
  if (!driveOnly) {
    manifest = await exportAllTabsAsCsv();
    manifest.driveCopy = driveCopy;

    // Write manifest
    const manifestPath = path.join(BACKUP_DIR, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`\nManifest written: ${manifestPath}`);
  }

  // Summary
  console.log('\n=== Backup Complete ===');
  if (driveCopy) {
    console.log(`  Drive copy: ${driveCopy.copyName} (${driveCopy.copyId})`);
  }
  if (manifest) {
    const totalRows = manifest.tabs.reduce((sum, t) => sum + (t.rows || 0), 0);
    const errorCount = manifest.tabs.filter(t => t.error).length;
    console.log(`  Local CSVs: ${manifest.tabs.length} tabs, ${totalRows} total rows`);
    if (errorCount > 0) console.log(`  Errors: ${errorCount} tabs failed`);
    console.log(`  Location: ${BACKUP_DIR}/`);
  }
  console.log('');
}

main().catch(err => {
  console.error('Backup failed:', err.message);
  process.exit(1);
});
