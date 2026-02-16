#!/usr/bin/env node
/**
 * saveToDrive.js — Upload files to Google Drive from the newsroom
 *
 * Uses OAuth2 (user credentials) to write files to the correct Drive folder.
 * The service account handles reads; this handles writes.
 *
 * Usage:
 *   node scripts/saveToDrive.js <local-file> <destination>
 *   node scripts/saveToDrive.js --test
 *
 * Destinations (shortcuts):
 *   edition    → Publications Archive / 1_The_Cycle_Pulse / Y_001
 *   supplement → Publications Archive / 2_Oakland_Supplementals
 *   chicago    → Publications Archive / Chicago_Supplementals
 *   mara       → Publications Archive / Mara_Vance
 *   presser    → Publications Archive / Mike_Paulson_Pressers
 *   player     → As Universe Database / Players / MLB_Roster_Data_Cards
 *   prospect   → As Universe Database / Players / Top_Prospects_Data_Cards
 *   bulls      → Bulls Universe Database / Player_Cards
 *   briefing   → Publications Archive / Mara_Vance
 *
 * Or pass a raw folder ID as destination.
 *
 * Examples:
 *   node scripts/saveToDrive.js editions/cycle_pulse_edition_82.txt edition
 *   node scripts/saveToDrive.js output/mara_directive_c82.txt mara
 *   node scripts/saveToDrive.js --test
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Destination folder IDs — from combined manifest (mapSubfolders overrides at runtime)
var DESTINATIONS = {
  // Publications Archive subfolders
  edition:    '118tCh9stHjuocSUYXj0LjGnuzp5mLFhf',  // 1_The_Cycle_Pulse/Y_001
  supplement: '1rv1mTZ8A1ep8u6dIONsEsGmayNkCJg-F',  // 2_Oakland_Supplementals
  chicago:    '1C2TvHmPWNh0VeYnTA4Tq0XvKS0fNRhTy',  // Chicago_Supplementals
  mara:       '1LEClpCUeRpT91gUR3SUm-Yx-3MldMJ5G',  // Mara_Vance
  presser:    '13ALd2UBqw490b85tunULoPrrLFsST2F_',   // Mike_Paulson_Pressers
  // As Universe Database subfolders
  player:     '1kJTjCkDBm0fYjU_ca4ul-qliMzdddv9S',  // MLB_Roster_Data_Cards
  prospect:   '1QBDslfH7zLmUPUa-c_AOkG4bWyHHPKrA',  // Top_Prospects_Data_Cards
  // Bulls Universe Database
  bulls:      '1RLj9scDEr2wk3o6MeypTcMG54QWX0TLU',  // Player_Cards
  // Aliases
  briefing:   '1LEClpCUeRpT91gUR3SUm-Yx-3MldMJ5G',  // = mara (Mara directives & briefings)
};

// Root folder IDs (fallback if subfolder not mapped)
var ROOTS = {
  tribune:      '10Y-X48HloGv9EEllWSm-Mycpmbj_9DVS',
  sports:       '1KPftAbw3dmjJjlUS9Wo97mFRZ-9Oqq0p',
  publications: '1NEIimxouKHwrVF0Wuhz7rjwX94_-FvNZ',
  as_universe:  '1g3c82HA9iGNUdY7Oxe6cGIWpn5nILJFG',
  bulls_universe: '1VbXGpcierDXN3LCzywgJfXtU1ABGhZZM',
};

function getAuth() {
  var clientId = process.env.GOOGLE_CLIENT_ID;
  var clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  var refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('OAuth credentials not configured.');
    console.error('Run: node scripts/authorizeDriveWrite.js');
    process.exit(1);
  }

  var oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

function resolveDestination(dest) {
  // If it looks like a Drive folder ID, use it directly
  if (dest && dest.length > 20 && !dest.includes('/')) {
    return dest;
  }

  // Check named destinations
  if (DESTINATIONS[dest]) return DESTINATIONS[dest];

  // Fallback to root folders
  if (ROOTS[dest]) return ROOTS[dest];

  // Default fallback based on file type
  return ROOTS.publications;
}

async function uploadFile(filePath, destKey) {
  var auth = getAuth();
  var drive = google.drive({ version: 'v3', auth });

  var fileName = path.basename(filePath);
  var content = fs.readFileSync(filePath, 'utf-8');
  var folderId = resolveDestination(destKey);

  console.log('Uploading: ' + fileName);
  console.log('To folder: ' + destKey + ' (' + folderId + ')');

  var res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: 'text/plain',
      body: content,
    },
    fields: 'id, name, webViewLink',
  });

  console.log('');
  console.log('Uploaded: ' + res.data.name);
  console.log('ID: ' + res.data.id);
  if (res.data.webViewLink) console.log('Link: ' + res.data.webViewLink);
  return res.data;
}

async function runTest() {
  var auth = getAuth();
  var drive = google.drive({ version: 'v3', auth });

  console.log('Testing Drive write access...');
  var folderId = ROOTS.publications;

  var res = await drive.files.create({
    requestBody: {
      name: '_MAGS_WRITE_TEST_' + new Date().toISOString().substring(0, 10) + '.txt',
      parents: [folderId],
    },
    media: {
      mimeType: 'text/plain',
      body: 'Write test from Mags Corliss — ' + new Date().toISOString(),
    },
    fields: 'id, name',
  });

  console.log('Created: ' + res.data.name + ' (ID: ' + res.data.id + ')');

  await drive.files.delete({ fileId: res.data.id });
  console.log('Test file deleted.');
  console.log('');
  console.log('Drive write access confirmed!');
}

async function mapSubfolders() {
  // Auto-discover subfolder IDs from the manifest
  var manifestPath = path.join(__dirname, '..', 'output', 'drive-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.log('No manifest found — using root folders only.');
    return;
  }

  var manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  var folders = manifest.entries.filter(function(e) { return e.isFolder; });

  var mappings = {
    edition:    { path: '/Publications Archive/1_The_Cycle_Pulse/Y_001' },
    supplement: { path: '/Publications Archive/2_Oakland_Supplementals' },
    chicago:    { path: '/Publications Archive/Chicago_Supplementals' },
    mara:       { path: '/Publications Archive/Mara_Vance' },
    presser:    { path: '/Publications Archive/Mike_Paulson_Pressers' },
    player:     { path: '/As Universe Database/Players/MLB_Roster_Data_Cards' },
    prospect:   { path: '/As Universe Database/Players/Top_Prospects_Data_Cards' },
    bulls:      { path: '/Bulls Universe Database/Player_Cards' },
  };

  Object.keys(mappings).forEach(function(key) {
    var targetPath = mappings[key].path;
    var folder = folders.find(function(f) {
      return (f.path + '/' + f.name) === targetPath || f.path === targetPath;
    });
    if (folder) {
      DESTINATIONS[key] = folder.id;
    }
  });
}

async function main() {
  await mapSubfolders();

  if (process.argv.includes('--test')) {
    return runTest();
  }

  var args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node scripts/saveToDrive.js <local-file> <destination>');
    console.log('');
    console.log('Destinations: edition, supplement, chicago, mara, presser, player, prospect, bulls');
    console.log('Or pass a raw Drive folder ID.');
    console.log('');
    console.log('Run --test to verify write access.');
    process.exit(0);
  }

  var filePath = args[0];
  var dest = args[1];

  if (!fs.existsSync(filePath)) {
    console.error('File not found: ' + filePath);
    process.exit(1);
  }

  await uploadFile(filePath, dest);
}

main().catch(function(err) {
  console.error('Fatal:', err.message);
  process.exit(1);
});
