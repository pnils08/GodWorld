#!/usr/bin/env node
/**
 * fetchDriveFile.js — Download a file from Google Drive by ID
 *
 * Handles text/plain, Google Docs (exports as text), and binary files.
 * Text content is printed to stdout by default, or saved to a file with --save.
 *
 * Usage:
 *   node scripts/fetchDriveFile.js <FILE_ID>              # print to stdout
 *   node scripts/fetchDriveFile.js <FILE_ID> --save       # save to output/drive-files/
 *   node scripts/fetchDriveFile.js <FILE_ID> --save=path  # save to custom path
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '..', 'output', 'drive-files');

async function main() {
  var fileId = process.argv[2];
  if (!fileId) {
    console.error('Usage: node scripts/fetchDriveFile.js <FILE_ID> [--save[=path]]');
    process.exit(1);
  }

  var saveArg = process.argv.find(function(a) { return a.startsWith('--save'); });
  var shouldSave = !!saveArg;
  var customPath = saveArg && saveArg.includes('=') ? saveArg.split('=')[1] : null;

  var credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) throw new Error('GOOGLE_APPLICATION_CREDENTIALS not set');

  var auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  var drive = google.drive({ version: 'v3', auth });

  // Get file metadata first
  var meta = await drive.files.get({
    fileId: fileId,
    fields: 'id, name, mimeType, size',
  });

  var file = meta.data;
  var isGoogleDoc = file.mimeType === 'application/vnd.google-apps.document';
  var isGoogleSheet = file.mimeType === 'application/vnd.google-apps.spreadsheet';

  if (!shouldSave) {
    console.error('File: ' + file.name);
    console.error('Type: ' + file.mimeType);
    console.error('Size: ' + (file.size ? Math.round(file.size / 1024) + ' KB' : 'N/A'));
    console.error('---');
  }

  var content;

  if (isGoogleDoc) {
    // Export Google Doc as plain text
    var exported = await drive.files.export({
      fileId: fileId,
      mimeType: 'text/plain',
    });
    content = exported.data;
  } else if (isGoogleSheet) {
    // Export Google Sheet as CSV
    var exported = await drive.files.export({
      fileId: fileId,
      mimeType: 'text/csv',
    });
    content = exported.data;
  } else {
    // Download regular file
    var response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    content = Buffer.from(response.data);

    // If it's text, convert to string
    if (file.mimeType && (file.mimeType.startsWith('text/') || file.mimeType === 'application/json')) {
      content = content.toString('utf8');
    }
  }

  if (shouldSave) {
    var savePath;
    if (customPath) {
      savePath = customPath;
    } else {
      if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
      // Clean filename
      var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
      if (!safeName.includes('.')) {
        if (isGoogleDoc) safeName += '.txt';
        else if (isGoogleSheet) safeName += '.csv';
      }
      savePath = path.join(CACHE_DIR, safeName);
    }
    fs.writeFileSync(savePath, content);
    console.log('Saved: ' + savePath);
  } else {
    // Print to stdout
    if (typeof content === 'string') {
      console.log(content);
    } else {
      console.log('[Binary file, ' + content.length + ' bytes — use --save to download]');
    }
  }
}

main().catch(function(err) {
  console.error('Error:', err.message);
  process.exit(1);
});
