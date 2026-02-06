#!/usr/bin/env node
/**
 * Test Google Sheets API connection
 *
 * Usage:
 *   node scripts/test-sheets.js
 */

require('dotenv').config();
const sheets = require('../lib/sheets');

async function main() {
  console.log('Testing Google Sheets connection...\n');

  // Check env vars
  if (!process.env.GODWORLD_SHEET_ID) {
    console.error('ERROR: GODWORLD_SHEET_ID not set in .env');
    console.error('Add your spreadsheet ID to .env file');
    process.exit(1);
  }

  try {
    const info = await sheets.testConnection();
    console.log('✓ Connected successfully!\n');
    console.log('Spreadsheet:', info.title);
    console.log('Sheets:', info.sheets.join(', '));
  } catch (err) {
    console.error('✗ Connection failed:\n');
    if (err.code === 403) {
      console.error('Permission denied. Make sure you shared the spreadsheet with:');
      console.error('  maravance@godworld-486407.iam.gserviceaccount.com');
    } else if (err.code === 404) {
      console.error('Spreadsheet not found. Check GODWORLD_SHEET_ID in .env');
    } else {
      console.error(err.message);
    }
    process.exit(1);
  }
}

main();
