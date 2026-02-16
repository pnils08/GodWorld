#!/usr/bin/env node
/**
 * crawlDriveArchive.js — Recursively crawl the Tribune media archive on Google Drive
 *
 * Builds a structured manifest of all files, organized by desk and journalist.
 * Outputs JSON manifest + human-readable markdown index.
 *
 * Usage:
 *   node scripts/crawlDriveArchive.js [ROOT_FOLDER_ID]
 *
 * Default root: 10Y-X48HloGv9EEllWSm-Mycpmbj_9DVS (Tribune Media Archive)
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const ROOT_FOLDER_ID = process.argv[2] || '10Y-X48HloGv9EEllWSm-Mycpmbj_9DVS';
const OUTPUT_JSON = path.join(__dirname, '..', 'output', 'drive-manifest.json');
const OUTPUT_MD = path.join(__dirname, '..', 'docs', 'media', 'DRIVE_MANIFEST.md');

// Rate limiting — Drive API has quotas
const DELAY_MS = 100;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getAuth() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) throw new Error('GOOGLE_APPLICATION_CREDENTIALS not set');

  return new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

async function listFolder(drive, folderId) {
  var allFiles = [];
  var pageToken = null;

  do {
    var params = {
      q: "'" + folderId + "' in parents and trashed=false",
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime)',
      orderBy: 'name',
      pageSize: 100,
    };
    if (pageToken) params.pageToken = pageToken;

    var response = await drive.files.list(params);
    var files = response.data.files || [];
    allFiles = allFiles.concat(files);
    pageToken = response.data.nextPageToken;
    await sleep(DELAY_MS);
  } while (pageToken);

  return allFiles;
}

async function crawl(drive, folderId, breadcrumb, depth) {
  if (depth > 5) return []; // safety limit

  var files = await listFolder(drive, folderId);
  var results = [];

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var isFolder = file.mimeType === 'application/vnd.google-apps.folder';

    var entry = {
      id: file.id,
      name: file.name.trim(),
      mimeType: file.mimeType,
      sizeKB: file.size ? Math.round(parseInt(file.size) / 1024) : null,
      created: file.createdTime || null,
      modified: file.modifiedTime || null,
      path: breadcrumb,
      depth: depth,
      isFolder: isFolder,
    };

    if (isFolder) {
      // Recurse into subfolder
      var childPath = breadcrumb + '/' + file.name.trim();
      console.log('  ' + '  '.repeat(depth) + '📁 ' + file.name.trim());
      var children = await crawl(drive, file.id, childPath, depth + 1);
      entry.children = children.length;
      results.push(entry);
      results = results.concat(children);
    } else {
      console.log('  ' + '  '.repeat(depth) + '📄 ' + file.name.trim());
      results.push(entry);
    }
  }

  return results;
}

function buildMarkdown(entries) {
  var lines = [];
  lines.push('# Tribune Media Archive — Drive Manifest');
  lines.push('');
  lines.push('**Generated:** ' + new Date().toISOString());
  lines.push('**Root Folder:** `' + ROOT_FOLDER_ID + '`');
  lines.push('');

  // Stats
  var folders = entries.filter(function(e) { return e.isFolder; });
  var files = entries.filter(function(e) { return !e.isFolder; });
  var totalKB = files.reduce(function(sum, f) { return sum + (f.sizeKB || 0); }, 0);

  lines.push('**Stats:** ' + folders.length + ' folders, ' + files.length + ' files, ~' + Math.round(totalKB) + ' KB total');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Group by top-level desk
  var desks = {};
  entries.forEach(function(e) {
    var parts = e.path.split('/');
    var desk = parts[1] || 'Root';
    if (!desks[desk]) desks[desk] = [];
    desks[desk].push(e);
  });

  var deskNames = Object.keys(desks).sort();
  deskNames.forEach(function(desk) {
    lines.push('## ' + desk);
    lines.push('');

    var deskEntries = desks[desk];
    deskEntries.forEach(function(e) {
      if (e.isFolder) return; // skip folder entries in the listing
      var indent = '  '.repeat(Math.max(0, e.depth - 1));
      var size = e.sizeKB ? ' (' + e.sizeKB + ' KB)' : '';
      var typeLabel = '';
      if (e.mimeType === 'application/vnd.google-apps.document') typeLabel = ' [Google Doc]';
      else if (e.mimeType === 'text/plain') typeLabel = ' [.txt]';
      else if (e.mimeType === 'application/pdf') typeLabel = ' [PDF]';
      else if (e.mimeType && e.mimeType.startsWith('image/')) typeLabel = ' [image]';

      lines.push(indent + '- **' + e.name + '**' + typeLabel + size);
      lines.push(indent + '  - ID: `' + e.id + '`');
      lines.push(indent + '  - Path: `' + e.path + '`');
    });

    lines.push('');
  });

  lines.push('---');
  lines.push('');
  lines.push('*Use `node scripts/fetchDriveFile.js <FILE_ID>` to download any file by ID.*');

  return lines.join('\n');
}

async function main() {
  console.log('Tribune Media Archive Crawler');
  console.log('Root folder: ' + ROOT_FOLDER_ID);
  console.log('');

  var auth = await getAuth();
  var drive = google.drive({ version: 'v3', auth });

  console.log('Crawling...\n');
  var entries = await crawl(drive, ROOT_FOLDER_ID, '', 0);

  // Write JSON manifest
  var manifest = {
    generated: new Date().toISOString(),
    rootFolderId: ROOT_FOLDER_ID,
    totalEntries: entries.length,
    folders: entries.filter(function(e) { return e.isFolder; }).length,
    files: entries.filter(function(e) { return !e.isFolder; }).length,
    entries: entries,
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(manifest, null, 2));
  console.log('\nJSON manifest: ' + OUTPUT_JSON);

  // Write markdown index
  var md = buildMarkdown(entries);
  fs.writeFileSync(OUTPUT_MD, md);
  console.log('Markdown index: ' + OUTPUT_MD);

  // Summary
  console.log('\nDone! ' + manifest.folders + ' folders, ' + manifest.files + ' files indexed.');
}

main().catch(function(err) {
  console.error('Error:', err.message);
  process.exit(1);
});
