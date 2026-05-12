#!/usr/bin/env node
/**
 * ingestCivicWiki.js — Civic voice + decision wiki extraction
 * [engine/sheet] — closes pipeline.22 / G-P4 (post-publish gap log C93)
 *
 * Reads per-cycle civic voice JSONs + initiative decision JSONs and emits
 * per-statement + per-decision wiki records to Supermemory's bay-tribune
 * container. Modeled on ingestEditionWiki.js (Phase 35.1 Smart Ingest).
 *
 * Until this script existed, /post-publish Step 3 was permanently "NOT BUILT"
 * — voice decisions stayed on disk only and bay-tribune had no per-official
 * searchable record. Each cycle that ran without this script grew the gap:
 * sift had to re-read every civic voice JSON to ask "what has Mayor Santana
 * said about Health Center across cycles."
 *
 * Sources:
 *   output/civic-voice/<office>_c<N>.json           — array of statements
 *   output/city-civic-database/initiatives/<slug>/decisions_c<N>.json — per-init decision
 *
 * Emits two record classes:
 *   civic-statement — one per statement (Mayor + 5 projects + 2 factions + IND swing + Chief + DA)
 *   civic-decision  — one per initiative per cycle (consolidated multi-voice resolution)
 *
 * Usage:
 *   node scripts/ingestCivicWiki.js --cycle 93              (dry-run, default)
 *   node scripts/ingestCivicWiki.js --cycle 93 --apply      (write to bay-tribune)
 *
 * Flags:
 *   --cycle N         Required. The cycle to ingest.
 *   --dry-run/--apply --apply writes; default dry-run.
 */

require('/root/GodWorld/lib/env');
var fs = require('fs');
var path = require('path');
var https = require('https');

var API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
var CONTAINER_TAG = 'bay-tribune';
var API_HOST = 'api.supermemory.ai';
var DRY_RUN = !process.argv.includes('--apply');

var PROJECT_ROOT = path.join(__dirname, '..');
var VOICE_DIR = path.join(PROJECT_ROOT, 'output', 'civic-voice');
var INITIATIVES_DIR = path.join(PROJECT_ROOT, 'output', 'city-civic-database', 'initiatives');

function parseFlag(name) {
  var i = process.argv.indexOf('--' + name);
  if (i === -1 || i === process.argv.length - 1) return null;
  return process.argv[i + 1];
}

function parseCycleFlag() {
  var raw = parseFlag('cycle');
  if (!raw) {
    console.error('[ERROR] --cycle N is required');
    process.exit(1);
  }
  var n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    console.error('[ERROR] --cycle must be a positive integer');
    process.exit(1);
  }
  return n;
}

var cycle = parseCycleFlag();
var contentTagPrefixStmt = '[TYPE: civic-statement | C' + cycle + '] ';
var contentTagPrefixDec = '[TYPE: civic-decision | C' + cycle + '] ';

console.log('Civic Wiki Ingest: C' + cycle + ' | Mode: ' + (DRY_RUN ? 'DRY-RUN' : 'APPLY'));
console.log('---');

if (!API_KEY && !DRY_RUN) {
  console.error('[ERROR] SUPERMEMORY_CC_API_KEY not set — required for --apply');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// COLLECT VOICE JSONS
// ═══════════════════════════════════════════════════════════════════════════

function safeReadJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error('[WARN] Could not parse ' + path.basename(filePath) + ': ' + e.message);
    return null;
  }
}

var voiceFiles = [];
if (fs.existsSync(VOICE_DIR)) {
  voiceFiles = fs.readdirSync(VOICE_DIR)
    .filter(function(f) { return f.match(new RegExp('_c' + cycle + '\\.json$')); })
    .map(function(f) { return path.join(VOICE_DIR, f); });
}

if (voiceFiles.length === 0) {
  console.error('[ERROR] No voice JSONs found in ' + VOICE_DIR + ' for C' + cycle);
  process.exit(1);
}

console.log('Voice files found: ' + voiceFiles.length);
voiceFiles.forEach(function(f) { console.log('  - ' + path.basename(f)); });

// ═══════════════════════════════════════════════════════════════════════════
// COLLECT DECISION JSONS
// ═══════════════════════════════════════════════════════════════════════════

var decisionFiles = [];
if (fs.existsSync(INITIATIVES_DIR)) {
  var initDirs = fs.readdirSync(INITIATIVES_DIR)
    .filter(function(d) {
      var full = path.join(INITIATIVES_DIR, d);
      return fs.existsSync(full) && fs.statSync(full).isDirectory();
    });
  for (var di = 0; di < initDirs.length; di++) {
    var decisionPath = path.join(INITIATIVES_DIR, initDirs[di], 'decisions_c' + cycle + '.json');
    if (fs.existsSync(decisionPath)) decisionFiles.push(decisionPath);
  }
}

console.log('\nDecision files found: ' + decisionFiles.length);
decisionFiles.forEach(function(f) {
  console.log('  - ' + path.relative(INITIATIVES_DIR, f));
});

// ═══════════════════════════════════════════════════════════════════════════
// SHAPE PER-STATEMENT MEMORIES
// ═══════════════════════════════════════════════════════════════════════════

var memories = [];
var statementCount = 0;
var statementsByOffice = {};

for (var vi = 0; vi < voiceFiles.length; vi++) {
  var voicePath = voiceFiles[vi];
  var voiceData = safeReadJSON(voicePath);
  if (!voiceData) continue;

  // Voice files are arrays of statements. Some shapes may differ — handle
  // both array-of-statements and object-with-statements field defensively.
  var statements = Array.isArray(voiceData)
    ? voiceData
    : (voiceData.statements || []);

  if (!Array.isArray(statements) || statements.length === 0) continue;

  var fileBase = path.basename(voicePath, '.json').replace(/_c\d+$/, '');

  for (var si = 0; si < statements.length; si++) {
    var s = statements[si];
    if (!s || typeof s !== 'object') continue;

    var office = s.office || fileBase;
    var speaker = s.speaker || '(unknown speaker)';
    var topic = s.topic || '(no topic)';
    var quote = (s.quote || '').trim();
    var position = s.position || '';
    var reasoning = (s.reasoning || '').trim();
    var related = Array.isArray(s.relatedInitiatives) ? s.relatedInitiatives : [];
    var members = Array.isArray(s.relatedMembers) ? s.relatedMembers : [];

    statementsByOffice[office] = (statementsByOffice[office] || 0) + 1;
    statementCount++;

    // Content = searchable narrative line; bay-tribune is full-text-indexed,
    // so the speaker/office/topic/quote belong in the content body.
    var contentParts = [
      contentTagPrefixStmt + speaker + ' (' + office + ') C' + cycle +
        ' statement on ' + topic +
        (position ? ' — position: ' + position : '') + ':',
      quote ? '  "' + quote + '"' : null,
      reasoning ? '  Reasoning: ' + reasoning : null,
      related.length ? '  Related initiatives: ' + related.join(', ') : null,
      members.length ? '  Related members: ' + members.join(', ') : null,
    ].filter(Boolean);

    memories.push({
      content: contentParts.join('\n'),
      metadata: {
        recordType: 'civic-statement',
        type: 'civic-voice',
        cycle: cycle,
        statementId: s.statementId || null,
        office: office,
        speaker: speaker,
        popId: s.popId || null,
        topic: topic,
        position: position,
        statementType: s.type || null,
        relatedInitiatives: related,
      },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SHAPE PER-DECISION MEMORIES
// ═══════════════════════════════════════════════════════════════════════════

var decisionCount = 0;

for (var dii = 0; dii < decisionFiles.length; dii++) {
  var decPath = decisionFiles[dii];
  var dec = safeReadJSON(decPath);
  if (!dec || typeof dec !== 'object') continue;

  var initId = dec.initiativeId || dec.initiative || path.basename(path.dirname(decPath));
  var primaryVoice = dec.primaryVoice || '(no primary voice)';
  var consolidatedFrom = Array.isArray(dec.consolidatedFrom) ? dec.consolidatedFrom : [];
  var trackerUpdates = dec.trackerUpdates || {};
  var milestoneNotes = (trackerUpdates.MilestoneNotes || '').trim();
  var nextAction = trackerUpdates.NextScheduledAction || '';
  var nextCycle = trackerUpdates.NextActionCycle || null;

  decisionCount++;

  var contentParts = [
    contentTagPrefixDec + initId + ' C' + cycle + ' decision — primary voice: ' + primaryVoice,
    consolidatedFrom.length ? '  Consolidated from ' + consolidatedFrom.length + ' statements.' : null,
    milestoneNotes ? '  Milestone: ' + milestoneNotes : null,
    nextAction ? '  Next action: ' + nextAction + (nextCycle ? ' (C' + nextCycle + ')' : '') : null,
  ].filter(Boolean);

  memories.push({
    content: contentParts.join('\n'),
    metadata: {
      recordType: 'civic-decision',
      type: 'civic-decision',
      cycle: cycle,
      initiativeId: initId,
      primaryVoice: primaryVoice,
      consolidatedFromCount: consolidatedFrom.length,
      nextActionCycle: nextCycle,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

console.log('\nCIVIC WIKI EXTRACTION SUMMARY:');
console.log('  Statements: ' + statementCount);
console.log('  Decisions:  ' + decisionCount);
console.log('  Total memories: ' + memories.length);
console.log('\n  By office:');
Object.keys(statementsByOffice).sort().forEach(function(o) {
  console.log('    ' + o + ': ' + statementsByOffice[o]);
});

// ═══════════════════════════════════════════════════════════════════════════
// WRITE TO SUPERMEMORY (or sample if dry-run)
// ═══════════════════════════════════════════════════════════════════════════

if (DRY_RUN) {
  if (memories.length > 0) {
    console.log('\n--- SAMPLE STATEMENT MEMORY ---');
    var stmtSample = memories.find(function(m) { return m.metadata.recordType === 'civic-statement'; });
    if (stmtSample) {
      console.log(stmtSample.content);
      console.log('metadata: ' + JSON.stringify(stmtSample.metadata));
    }
    console.log('\n--- SAMPLE DECISION MEMORY ---');
    var decSample = memories.find(function(m) { return m.metadata.recordType === 'civic-decision'; });
    if (decSample) {
      console.log(decSample.content);
      console.log('metadata: ' + JSON.stringify(decSample.metadata));
    }
  }
  console.log('\n--- DRY RUN — ' + memories.length + ' memories would be written. Use --apply to write.');
  process.exit(0);
}

function addMemory(content) {
  return new Promise(function(resolve, reject) {
    var payload = JSON.stringify({
      memories: [{ content: content }],
      containerTag: CONTAINER_TAG,
    });

    var options = {
      hostname: API_HOST,
      path: '/v4/memories',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Length': Buffer.byteLength(payload),
      },
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

(async function() {
  var success = 0;
  var errors = 0;

  for (var mi = 0; mi < memories.length; mi++) {
    var m = memories[mi];
    try {
      await addMemory(m.content);
      success++;
      if ((mi + 1) % 10 === 0) console.log('  ... ' + (mi + 1) + '/' + memories.length);
    } catch (err) {
      console.error('[FAIL] ' + m.content.substring(0, 80) + ' — ' + err.message);
      errors++;
    }

    // Rate limit — same 300ms cadence as ingestEditionWiki.
    if (mi < memories.length - 1) {
      await new Promise(function(r) { setTimeout(r, 300); });
    }
  }

  console.log('\n[DONE] Written: ' + success + ', Errors: ' + errors);
  if (success > 0) {
    console.log('Civic voice + decision records C' + cycle + ' are now in bay-tribune.');
  }
})();
