#!/usr/bin/env node
/**
 * downloadDriveArchive.js — Download all text files from the Tribune archive
 *
 * Reads the manifest and downloads every text/plain and Google Doc file
 * to output/drive-files/ preserving desk/journalist folder structure.
 *
 * Usage:
 *   node scripts/downloadDriveArchive.js           # full download (re-downloads everything)
 *   node scripts/downloadDriveArchive.js --refresh  # incremental (skip existing files)
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '..', 'output', 'drive-manifest.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'drive-files');

const DELAY_MS = 150;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._\-() ]/g, '_').substring(0, 120);
}

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('No manifest found. Run crawlDriveArchive.js first.');
    process.exit(1);
  }

  var manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  var entries = manifest.entries;

  // Filter to downloadable text content
  var textFiles = entries.filter(function(e) {
    if (e.isFolder) return false;
    var mt = e.mimeType || '';
    return mt === 'text/plain' ||
           mt === 'application/vnd.google-apps.document' ||
           mt === 'application/json' ||
           mt.startsWith('text/');
  });

  // Filter out images (skip PNGs etc)
  var imageFiles = entries.filter(function(e) {
    if (e.isFolder) return false;
    var mt = e.mimeType || '';
    return mt.startsWith('image/') || e.name.endsWith('.PNG') || e.name.endsWith('.png');
  });

  var refreshMode = process.argv.includes('--refresh');

  console.log('Tribune Archive Downloader' + (refreshMode ? ' (REFRESH — skip existing)' : ''));
  console.log('Text files to download: ' + textFiles.length);
  console.log('Image files (skipping): ' + imageFiles.length);
  console.log('Output dir: ' + OUTPUT_DIR);
  console.log('');

  var auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  var drive = google.drive({ version: 'v3', auth });

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  var downloaded = 0;
  var skipped = 0;
  var errors = 0;

  for (var i = 0; i < textFiles.length; i++) {
    var file = textFiles[i];
    var isGoogleDoc = file.mimeType === 'application/vnd.google-apps.document';

    // Build local path from Drive path
    var localDir = path.join(OUTPUT_DIR, safeName(file.path));
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

    var fileName = safeName(file.name);
    if (!fileName.endsWith('.txt') && !fileName.endsWith('.json') && !fileName.endsWith('.csv')) {
      fileName += '.txt';
    }
    var localPath = path.join(localDir, fileName);

    // In refresh mode, skip files that already exist locally
    if (refreshMode && fs.existsSync(localPath)) {
      skipped++;
      continue;
    }

    try {
      var content;
      if (isGoogleDoc) {
        var exported = await drive.files.export({
          fileId: file.id,
          mimeType: 'text/plain',
        });
        content = exported.data;
      } else {
        var response = await drive.files.get(
          { fileId: file.id, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        content = Buffer.from(response.data).toString('utf8');
      }

      fs.writeFileSync(localPath, content);
      downloaded++;
      console.log('[' + downloaded + '/' + textFiles.length + '] ' + file.name);
      await sleep(DELAY_MS);
    } catch (err) {
      errors++;
      console.error('[ERROR] ' + file.name + ': ' + err.message);
    }
  }

  console.log('\nDone! Downloaded: ' + downloaded + ', Skipped: ' + skipped + ', Errors: ' + errors);

  // Write a quick search index
  var indexPath = path.join(OUTPUT_DIR, '_INDEX.md');
  var indexLines = ['# Local Tribune Archive Index', '', '**Downloaded:** ' + new Date().toISOString(), ''];
  textFiles.forEach(function(f) {
    var localDir2 = safeName(f.path);
    var fileName2 = safeName(f.name);
    if (!fileName2.endsWith('.txt') && !fileName2.endsWith('.json') && !fileName2.endsWith('.csv')) {
      fileName2 += '.txt';
    }
    indexLines.push('- `' + localDir2 + '/' + fileName2 + '` — ' + f.name);
  });
  fs.writeFileSync(indexPath, indexLines.join('\n'));
  console.log('Index written: ' + indexPath);
}

main().catch(function(err) {
  console.error('Fatal:', err.message);
  process.exit(1);
});
