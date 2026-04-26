#!/usr/bin/env node
/**
 * Ingest a Cycle Pulse publishable artifact into Supermemory — scripts/ingestEdition.js
 *
 * Saves a published .txt (edition, interview, supplemental, dispatch, or
 * interview-transcript companion) as a searchable document in Supermemory,
 * tagged bay-tribune. Future sessions, the Discord bot, and autonomous
 * scripts can then search for past canon content.
 *
 * Usage:
 *   node scripts/ingestEdition.js editions/cycle_pulse_edition_82.txt
 *   node scripts/ingestEdition.js editions/cycle_pulse_edition_82.txt --dry-run
 *   node scripts/ingestEdition.js editions/cycle_pulse_interview_92_santana.txt --type interview --cycle 92
 *   node scripts/ingestEdition.js editions/cycle_pulse_interview-transcript_92_santana.txt --type interview-transcript --cycle 92
 *
 * Flags:
 *   --type {edition|interview|supplemental|dispatch|interview-transcript}
 *           Default: edition. Plumbed into bay-tribune metadata for retrieval filtering.
 *   --cycle N
 *           Overrides cycle extraction from filename/content. Required when --type ≠ edition
 *           (non-edition filenames don't always carry cycle in the legacy regex shape).
 *   --dry-run
 *           Skip the Supermemory API call. Prints the metadata block + per-chunk
 *           preview so the post-publish verifier can confirm shape.
 *
 * Requires .env: SUPERMEMORY_CC_API_KEY
 */

require('/root/GodWorld/lib/env');
var fs = require('fs');
var path = require('path');
var https = require('https');

var API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
var CONTAINER_TAG = 'bay-tribune';
var API_HOST = 'api.supermemory.ai';
var MAX_CHUNK_SIZE = 40000; // Supermemory doc limit safety margin

var ALLOWED_TYPES = ['edition', 'interview', 'supplemental', 'dispatch', 'interview-transcript'];

var DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// CLI flag parsing — --type / --cycle
// ---------------------------------------------------------------------------
function parseFlag(name) {
  var i = process.argv.indexOf('--' + name);
  if (i === -1 || i === process.argv.length - 1) return null;
  return process.argv[i + 1];
}

function parseType() {
  var raw = parseFlag('type');
  if (!raw) return 'edition';
  if (ALLOWED_TYPES.indexOf(raw) === -1) {
    console.error('[ERROR] --type must be one of: ' + ALLOWED_TYPES.join(', '));
    process.exit(1);
  }
  return raw;
}

function parseCycleFlag() {
  var raw = parseFlag('cycle');
  if (!raw) return null;
  var n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    console.error('[ERROR] --cycle must be a positive integer');
    process.exit(1);
  }
  return n;
}

function titleCaseType(type) {
  // edition → Edition; interview-transcript → Interview Transcript
  return type.split('-').map(function(w) {
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

// ---------------------------------------------------------------------------
// Extract cycle number from edition content or filename
// ---------------------------------------------------------------------------
function extractCycle(content, filename) {
  // Filename first — most reliable
  // supplemental_education_first_week_c88.txt → 88
  var cMatch = filename.match(/[_-]c(\d+)\./i);
  if (cMatch) return parseInt(cMatch[1], 10);
  // cycle_pulse_edition_88.txt → 88
  var fileMatch = filename.match(/edition[_-](\d+)/i);
  if (fileMatch) return parseInt(fileMatch[1], 10);
  // Content fallback: "Cycle 88" in header
  var cycleMatch = content.match(/Cycle\s+(\d+)/i);
  if (cycleMatch) return parseInt(cycleMatch[1], 10);
  return null;
}

// ---------------------------------------------------------------------------
// Split a publishable artifact into sections for chunked ingestion
// ---------------------------------------------------------------------------
function splitEdition(content, cycle, type) {
  var sections = [];
  var label = 'Cycle Pulse ' + titleCaseType(type) + ' ' + cycle;

  if (content.length <= MAX_CHUNK_SIZE) {
    sections.push({
      title: label + ' (Full)',
      content: content,
      tags: []
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
        title: label + ' (Part ' + chunkNum + ')',
        content: content.slice(pos, end).trim(),
        tags: []
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
        title: label + ' (Part ' + chunkIndex + ')',
        content: currentChunk.trim(),
        tags: []
      });
      currentChunk = '';
    }
    currentChunk += (currentChunk ? '\n' : '') + part;
  }
  if (currentChunk.trim()) {
    chunkIndex++;
    sections.push({
      title: label + ' (Part ' + chunkIndex + ')',
      content: currentChunk.trim(),
      tags: []
    });
  }

  return sections;
}

// ---------------------------------------------------------------------------
// POST a document to Supermemory
// ---------------------------------------------------------------------------
function addDocument(title, content, extraTags, metaExtras) {
  return new Promise(function(resolve, reject) {
    var tags = [CONTAINER_TAG].concat(extraTags || []);
    var metadata = Object.assign({
      title: title,
      source: 'edition-ingest'
    }, metaExtras || {});
    var payload = JSON.stringify({
      content: content,
      containerTags: tags,
      metadata: metadata
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
  var type = parseType();
  var cycleFlag = parseCycleFlag();
  var editionPath = process.argv.find(function(a) { return a.endsWith('.txt'); });
  if (!editionPath) {
    console.error('Usage: node scripts/ingestEdition.js <source.txt> [--type <type>] [--cycle N] [--dry-run]');
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

  // Cycle resolution: --cycle wins. Otherwise fall back to filename/content
  // for edition only — non-edition types must pass --cycle so a stray "Cycle 92"
  // mention in body doesn't mistag canon.
  var cycle = cycleFlag;
  if (cycle === null) {
    if (type === 'edition') {
      cycle = extractCycle(content, filename);
    }
    if (cycle === null) {
      console.error('[ERROR] --cycle is required for --type ' + type +
        ' (no fallback extraction for non-edition types).');
      process.exit(1);
    }
  }

  var label = titleCaseType(type);
  console.log('[INFO] Ingesting ' + label + ' (cycle ' + cycle + ') into Supermemory');
  console.log('[INFO] File: ' + editionPath + ' (' + Math.round(content.length / 1024) + 'KB)');
  if (DRY_RUN) console.log('[INFO] Mode: DRY RUN');

  var metaExtras = { type: type, cycle: cycle };

  // Print the metadata block prominently — post-publish verifier reads stdout
  // to confirm type/cycle plumbed correctly.
  console.log('[METADATA] ' + JSON.stringify({
    title: 'Cycle Pulse ' + label + ' ' + cycle,
    source: 'edition-ingest',
    type: type,
    cycle: cycle,
    container: CONTAINER_TAG
  }, null, 2));

  var sections = splitEdition(content, cycle, type);
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
      await addDocument(section.title, section.content, section.tags, metaExtras);
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
    console.log('[INFO] ' + label + ' ' + cycle + ' is now searchable in Supermemory (type=' + type + ')');
  }
}

main().catch(function(err) {
  console.error('[FATAL]', err);
  process.exit(1);
});
