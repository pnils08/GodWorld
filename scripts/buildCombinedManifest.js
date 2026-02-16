#!/usr/bin/env node
/**
 * buildCombinedManifest.js — Crawl multiple Drive root folders into one manifest
 *
 * Usage:
 *   node scripts/buildCombinedManifest.js
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const ROOTS = [
  { id: '10Y-X48HloGv9EEllWSm-Mycpmbj_9DVS', label: 'Tribune Media Archive' },
  { id: '1KPftAbw3dmjJjlUS9Wo97mFRZ-9Oqq0p', label: 'Sports Desk Archive' },
  { id: '1NEIimxouKHwrVF0Wuhz7rjwX94_-FvNZ', label: 'Publications Archive' },
  { id: '1g3c82HA9iGNUdY7Oxe6cGIWpn5nILJFG', label: 'As Universe Database' },
  { id: '1VbXGpcierDXN3LCzywgJfXtU1ABGhZZM', label: 'Bulls Universe Database' },
];

const OUTPUT_JSON = path.join(__dirname, '..', 'output', 'drive-manifest.json');
const OUTPUT_MD = path.join(__dirname, '..', 'docs', 'media', 'DRIVE_MANIFEST.md');

const DELAY_MS = 100;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
    allFiles = allFiles.concat(response.data.files || []);
    pageToken = response.data.nextPageToken;
    await sleep(DELAY_MS);
  } while (pageToken);
  return allFiles;
}

async function crawl(drive, folderId, breadcrumb, depth) {
  if (depth > 5) return [];
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
      path: breadcrumb,
      depth: depth,
      isFolder: isFolder,
    };
    if (isFolder) {
      var childPath = breadcrumb + '/' + file.name.trim();
      var children = await crawl(drive, file.id, childPath, depth + 1);
      entry.children = children.length;
      results.push(entry);
      results = results.concat(children);
    } else {
      results.push(entry);
    }
  }
  return results;
}

async function main() {
  var auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  var drive = google.drive({ version: 'v3', auth });

  var allEntries = [];

  for (var r = 0; r < ROOTS.length; r++) {
    var root = ROOTS[r];
    console.log('Crawling: ' + root.label + ' (' + root.id + ')');
    var entries = await crawl(drive, root.id, '/' + root.label, 1);
    allEntries = allEntries.concat(entries);
    console.log('  → ' + entries.length + ' entries\n');
  }

  var folders = allEntries.filter(function(e) { return e.isFolder; });
  var files = allEntries.filter(function(e) { return !e.isFolder; });

  var manifest = {
    generated: new Date().toISOString(),
    roots: ROOTS,
    totalFolders: folders.length,
    totalFiles: files.length,
    entries: allEntries,
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(manifest, null, 2));

  // Build markdown
  var lines = [];
  lines.push('# Tribune Drive Archive — Combined Manifest');
  lines.push('');
  lines.push('**Generated:** ' + manifest.generated);
  lines.push('**Archives:** ' + ROOTS.map(function(r) { return r.label; }).join(', '));
  lines.push('**Stats:** ' + folders.length + ' folders, ' + files.length + ' files');
  lines.push('');
  lines.push('Local mirror: `output/drive-files/`');
  lines.push('Fetch by ID: `node scripts/fetchDriveFile.js <ID>`');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Group by root then top-level desk
  ROOTS.forEach(function(root) {
    lines.push('# ' + root.label);
    lines.push('');
    var rootEntries = allEntries.filter(function(e) {
      return e.path.startsWith('/' + root.label);
    });

    // Group by desk (depth 1 folders)
    var desks = {};
    rootEntries.forEach(function(e) {
      var parts = e.path.split('/');
      var desk = parts[2] || 'Root';
      if (!desks[desk]) desks[desk] = [];
      desks[desk].push(e);
    });

    Object.keys(desks).sort().forEach(function(desk) {
      lines.push('## ' + desk);
      lines.push('');
      desks[desk].forEach(function(e) {
        if (e.isFolder) return;
        var typeTag = '';
        if (e.mimeType === 'application/vnd.google-apps.document') typeTag = ' [Doc]';
        else if (e.mimeType === 'text/plain') typeTag = ' [txt]';
        else if (e.mimeType === 'application/pdf') typeTag = ' [PDF]';
        else if (e.mimeType && e.mimeType.startsWith('image/')) typeTag = ' [img]';
        var size = e.sizeKB ? ' (' + e.sizeKB + 'KB)' : '';
        lines.push('- **' + e.name + '**' + typeTag + size + ' — `' + e.id + '`');
      });
      lines.push('');
    });
  });

  fs.writeFileSync(OUTPUT_MD, lines.join('\n'));

  console.log('JSON: ' + OUTPUT_JSON);
  console.log('Markdown: ' + OUTPUT_MD);
  console.log('Done! ' + folders.length + ' folders, ' + files.length + ' files.');
}

main().catch(function(err) {
  console.error('Fatal:', err.message);
  process.exit(1);
});
