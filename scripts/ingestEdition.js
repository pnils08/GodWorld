#!/usr/bin/env node
/**
 * Ingest a Cycle Pulse edition into Supermemory — scripts/ingestEdition.js
 *
 * Saves the compiled edition as a searchable document in Supermemory,
 * tagged for the GodWorld project. Future sessions, the Discord bot,
 * and autonomous scripts can then search for past edition content.
 *
 * Usage:
 *   node scripts/ingestEdition.js editions/cycle_pulse_edition_82.txt
 *   node scripts/ingestEdition.js editions/cycle_pulse_edition_82.txt --dry-run
 *
 * Requires .env: SUPERMEMORY_CC_API_KEY
 */

require('dotenv').config();
var fs = require('fs');
var path = require('path');
var https = require('https');

var API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
var CONTAINER_TAG = 'sm_project_godworld';
var API_HOST = 'api.supermemory.ai';
var MAX_CHUNK_SIZE = 40000; // Supermemory doc limit safety margin

var DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Extract cycle number from edition content or filename
// ---------------------------------------------------------------------------
function extractCycle(content, filename) {
  // Try header first: "CYCLE PULSE — EDITION 82"
  var headerMatch = content.match(/EDITION\s+(\d+)/i);
  if (headerMatch) return parseInt(headerMatch[1], 10);
  // Try filename: cycle_pulse_edition_82.txt
  var fileMatch = filename.match(/edition[_-](\d+)/i);
  if (fileMatch) return parseInt(fileMatch[1], 10);
  return null;
}

// ---------------------------------------------------------------------------
// Split edition into sections for chunked ingestion
// ---------------------------------------------------------------------------
function splitEdition(content, cycle) {
  var sections = [];

  if (content.length <= MAX_CHUNK_SIZE) {
    sections.push({
      title: 'Cycle Pulse Edition ' + cycle + ' (Full)',
      content: content,
      tags: ['edition', 'edition-' + cycle]
    });
    return sections;
  }

  // Split on section header blocks: ####...####\nTITLE\n####...####
  var parts = content.split(/\n(?=#{10,}\n)/);

  if (parts.length <= 1) {
    // Fallback: split at roughly MAX_CHUNK_SIZE boundaries on paragraph breaks
    var pos = 0;
    var chunkNum = 0;
    while (pos < content.length) {
      chunkNum++;
      var end = Math.min(pos + MAX_CHUNK_SIZE, content.length);
      // Find nearest paragraph break before the limit
      if (end < content.length) {
        var breakAt = content.lastIndexOf('\n\n', end);
        if (breakAt > pos + MAX_CHUNK_SIZE * 0.5) end = breakAt;
      }
      sections.push({
        title: 'Cycle Pulse Edition ' + cycle + ' (Part ' + chunkNum + ')',
        content: content.slice(pos, end).trim(),
        tags: ['edition', 'edition-' + cycle]
      });
      pos = end;
    }
    return sections;
  }

  // Chunk by section, merging small adjacent sections
  var currentChunk = '';
  var chunkIndex = 0;
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    if (currentChunk.length + part.length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      chunkIndex++;
      sections.push({
        title: 'Cycle Pulse Edition ' + cycle + ' (Part ' + chunkIndex + ')',
        content: currentChunk.trim(),
        tags: ['edition', 'edition-' + cycle]
      });
      currentChunk = '';
    }
    currentChunk += (currentChunk ? '\n' : '') + part;
  }
  if (currentChunk.trim()) {
    chunkIndex++;
    sections.push({
      title: 'Cycle Pulse Edition ' + cycle + ' (Part ' + chunkIndex + ')',
      content: currentChunk.trim(),
      tags: ['edition', 'edition-' + cycle]
    });
  }

  return sections;
}

// ---------------------------------------------------------------------------
// POST a document to Supermemory
// ---------------------------------------------------------------------------
function addDocument(title, content, extraTags) {
  return new Promise(function(resolve, reject) {
    var tags = [CONTAINER_TAG].concat(extraTags || []);
    var payload = JSON.stringify({
      content: content,
      containerTags: tags,
      metadata: {
        title: title,
        source: 'edition-ingest'
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
// Main
// ---------------------------------------------------------------------------
async function main() {
  var editionPath = process.argv.find(function(a) { return a.endsWith('.txt'); });
  if (!editionPath) {
    console.error('Usage: node scripts/ingestEdition.js <edition-file.txt> [--dry-run]');
    process.exit(1);
  }

  if (!API_KEY) {
    console.error('[ERROR] SUPERMEMORY_CC_API_KEY not set in .env');
    process.exit(1);
  }

  if (!fs.existsSync(editionPath)) {
    console.error('[ERROR] File not found: ' + editionPath);
    process.exit(1);
  }

  var content = fs.readFileSync(editionPath, 'utf-8').trim();
  var filename = path.basename(editionPath);
  var cycle = extractCycle(content, filename);

  if (!cycle) {
    console.error('[ERROR] Could not detect cycle number from file');
    process.exit(1);
  }

  console.log('[INFO] Ingesting Edition ' + cycle + ' into Supermemory');
  console.log('[INFO] File: ' + editionPath + ' (' + Math.round(content.length / 1024) + 'KB)');
  if (DRY_RUN) console.log('[INFO] Mode: DRY RUN');

  var sections = splitEdition(content, cycle);
  console.log('[INFO] Split into ' + sections.length + ' chunk(s)');

  var success = 0;
  var errors = 0;

  for (var i = 0; i < sections.length; i++) {
    var section = sections[i];
    if (DRY_RUN) {
      console.log('[DRY] Would ingest: ' + section.title + ' (' + section.content.length + ' chars, tags: ' + section.tags.join(', ') + ')');
      success++;
      continue;
    }

    try {
      await addDocument(section.title, section.content, section.tags);
      console.log('[OK] ' + section.title + ' (' + section.content.length + ' chars)');
      success++;
    } catch (err) {
      console.error('[FAIL] ' + section.title + ' — ' + err.message);
      errors++;
    }

    // Rate limit between chunks
    if (i < sections.length - 1) {
      await new Promise(function(r) { setTimeout(r, 500); });
    }
  }

  console.log('\n[DONE] Success: ' + success + ', Errors: ' + errors);
  if (errors === 0 && !DRY_RUN) {
    console.log('[INFO] Edition ' + cycle + ' is now searchable in Supermemory');
  }
}

main().catch(function(err) {
  console.error('[FATAL]', err);
  process.exit(1);
});
