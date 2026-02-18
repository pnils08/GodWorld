#!/usr/bin/env node
/**
 * Supermemory Drive Archive Ingestion — scripts/supermemory-ingest.js
 *
 * Pushes local Drive archive files into Supermemory as documents.
 * Uses the Memory API v3 to add each file as a memory with metadata.
 *
 * Usage:
 *   node scripts/supermemory-ingest.js              # ingest all files
 *   node scripts/supermemory-ingest.js --dry-run     # preview without sending
 *   node scripts/supermemory-ingest.js --limit 10    # ingest first 10 only
 *
 * Requires .env: SUPERMEMORY_CC_API_KEY
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
const ARCHIVE_DIR = path.join(__dirname, '..', 'output', 'drive-files');
const CONTAINER_TAG = 'sm_project_godworld';
const API_HOST = 'api.supermemory.ai';
const BATCH_DELAY_MS = 500; // rate limit: 500ms between requests

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.indexOf('--limit');
const LIMIT = LIMIT_ARG !== -1 ? parseInt(process.argv[LIMIT_ARG + 1], 10) : Infinity;

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------
const log = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args)
};

// ---------------------------------------------------------------------------
// Collect all text files from archive
// ---------------------------------------------------------------------------
function collectFiles(dir) {
  var results = [];
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    var fullPath = path.join(dir, entries[i].name);
    if (entries[i].isDirectory()) {
      results = results.concat(collectFiles(fullPath));
    } else if (/\.(txt|md|json)$/i.test(entries[i].name)) {
      results.push(fullPath);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Derive a title from the file path
// ---------------------------------------------------------------------------
function deriveTitle(filePath) {
  // Turn path like _Tribune Media Archive_Civic Affairs/carmen_delaine_article.txt
  // into "Tribune Media Archive > Civic Affairs > carmen_delaine_article"
  var relative = path.relative(ARCHIVE_DIR, filePath);
  var parts = relative.split(path.sep);
  // Clean up directory names (remove leading underscores)
  parts = parts.map(function(p) {
    return p.replace(/^_+/, '').replace(/\.[^.]+$/, '');
  });
  return parts.join(' > ');
}

// ---------------------------------------------------------------------------
// POST a document to Supermemory
// ---------------------------------------------------------------------------
function addMemory(title, content) {
  return new Promise(function(resolve, reject) {
    var payload = JSON.stringify({
      content: content,
      containerTags: [CONTAINER_TAG],
      metadata: {
        title: title,
        source: 'drive-archive'
      }
    });

    var options = {
      hostname: API_HOST,
      path: '/v3/documents',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body: data });
        } else {
          reject(new Error('HTTP ' + res.statusCode + ': ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Sleep helper
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!API_KEY) {
    log.error('SUPERMEMORY_CC_API_KEY not set in .env');
    process.exit(1);
  }

  log.info('Supermemory Drive Archive Ingestion');
  log.info('Archive dir: ' + ARCHIVE_DIR);
  if (DRY_RUN) log.info('Mode: DRY RUN');
  if (LIMIT < Infinity) log.info('Limit: ' + LIMIT + ' files');

  // Collect files
  var files = collectFiles(ARCHIVE_DIR);
  log.info('Found ' + files.length + ' text files');

  var toProcess = files.slice(0, LIMIT);
  log.info('Processing ' + toProcess.length + ' files');

  var success = 0;
  var errors = 0;
  var skipped = 0;

  for (var i = 0; i < toProcess.length; i++) {
    var filePath = toProcess[i];
    var title = deriveTitle(filePath);
    var content = fs.readFileSync(filePath, 'utf-8').trim();

    // Skip empty files
    if (!content) {
      log.warn('Skip empty: ' + title);
      skipped++;
      continue;
    }

    // Skip very large files (>50KB) — chunk them later
    if (content.length > 50000) {
      log.warn('Skip large (' + Math.round(content.length / 1024) + 'KB): ' + title);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      log.info('[' + (i + 1) + '/' + toProcess.length + '] Would ingest: ' + title + ' (' + content.length + ' chars)');
      success++;
      continue;
    }

    try {
      await addMemory(title, content);
      success++;
      log.info('[' + (i + 1) + '/' + toProcess.length + '] OK: ' + title + ' (' + content.length + ' chars)');
    } catch (err) {
      errors++;
      log.error('[' + (i + 1) + '/' + toProcess.length + '] FAIL: ' + title + ' — ' + err.message);
    }

    // Rate limit
    if (i < toProcess.length - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  log.info('');
  log.info('Done. Success: ' + success + ', Errors: ' + errors + ', Skipped: ' + skipped);
}

main().catch(function(err) {
  log.error('Fatal:', err);
  process.exit(1);
});
