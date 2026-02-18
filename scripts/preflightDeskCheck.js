#!/usr/bin/env node
/**
 * Pre-flight Desk Agent Check
 * scripts/preflightDeskCheck.js
 *
 * Validates desk packet data before launching agents. Catches bad data
 * before it reaches agents — wrong file formats, missing summaries,
 * oversized packets, missing canon fields.
 *
 * Usage:
 *   node scripts/preflightDeskCheck.js [cycle]
 *   node scripts/preflightDeskCheck.js 83
 *   node scripts/preflightDeskCheck.js           # auto-detects from base_context
 *
 * Returns exit code 0 if all checks pass, 1 if any CRITICAL.
 */

var fs = require('fs');
var path = require('path');

var PACKETS_DIR = path.join(__dirname, '..', 'output', 'desk-packets');
var BRIEFINGS_DIR = path.join(__dirname, '..', 'output', 'desk-briefings');

var DESKS = ['civic', 'sports', 'culture', 'business', 'chicago', 'letters'];

// Max sizes before agents may struggle (in KB)
var MAX_SUMMARY_KB = 50;
var MAX_PACKET_KB = 600;

// ---------------------------------------------------------------------------
// Detect cycle
// ---------------------------------------------------------------------------
function detectCycle() {
  var explicit = process.argv.find(function(a) { return /^\d+$/.test(a); });
  if (explicit) return parseInt(explicit, 10);

  var baseCtx = path.join(PACKETS_DIR, 'base_context.json');
  if (fs.existsSync(baseCtx)) {
    try {
      var ctx = JSON.parse(fs.readFileSync(baseCtx, 'utf-8'));
      return ctx.cycleNumber || ctx.cycle;
    } catch (e) { /* fall through */ }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Check results
// ---------------------------------------------------------------------------
var results = { critical: [], warning: [], ok: [] };

function critical(desk, msg) { results.critical.push('[' + desk.toUpperCase() + '] ' + msg); }
function warning(desk, msg) { results.warning.push('[' + desk.toUpperCase() + '] ' + msg); }
function ok(desk, msg) { results.ok.push('[' + desk.toUpperCase() + '] ' + msg); }

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------
function checkFileExists(desk, filename, required) {
  var fullPath = path.join(PACKETS_DIR, filename);
  if (fs.existsSync(fullPath)) {
    var sizeKB = Math.round(fs.statSync(fullPath).size / 1024);
    ok(desk, filename + ' exists (' + sizeKB + 'KB)');
    return { exists: true, size: sizeKB, path: fullPath };
  } else {
    if (required) {
      critical(desk, filename + ' MISSING — agent cannot run without this file');
    } else {
      warning(desk, filename + ' not found (optional)');
    }
    return { exists: false, size: 0, path: fullPath };
  }
}

function checkBriefingExists(desk, cycle) {
  var briefingPath = path.join(BRIEFINGS_DIR, desk + '_briefing_c' + cycle + '.md');
  var archivePath = path.join(BRIEFINGS_DIR, desk + '_archive_c' + cycle + '.md');

  if (fs.existsSync(briefingPath)) {
    ok(desk, 'Editor briefing exists');
  } else {
    warning(desk, 'No editor briefing — agent runs without editorial guidance');
  }

  if (fs.existsSync(archivePath)) {
    ok(desk, 'Archive context exists');
  } else {
    warning(desk, 'No archive context — agent has no past coverage reference');
  }
}

function checkJsonValid(desk, filePath) {
  try {
    JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return true;
  } catch (e) {
    critical(desk, path.basename(filePath) + ' is INVALID JSON: ' + e.message);
    return false;
  }
}

function checkPacketSize(desk, fileInfo, maxKB, label) {
  if (!fileInfo.exists) return;
  if (fileInfo.size > maxKB) {
    warning(desk, label + ' is ' + fileInfo.size + 'KB (limit: ' + maxKB + 'KB) — agent may struggle with context');
  }
}

function checkBaseContext(cycle) {
  var bcPath = path.join(PACKETS_DIR, 'base_context.json');
  if (!fs.existsSync(bcPath)) {
    critical('ALL', 'base_context.json MISSING — no cycle data available');
    return null;
  }

  var bc;
  try {
    bc = JSON.parse(fs.readFileSync(bcPath, 'utf-8'));
  } catch (e) {
    critical('ALL', 'base_context.json is INVALID JSON');
    return null;
  }

  // Check key fields — cycle number may be at root or nested under baseContext
  var detectedCycle = bc.cycleNumber || bc.cycle || (bc.baseContext && bc.baseContext.cycle);
  if (!detectedCycle) {
    critical('ALL', 'base_context.json has no cycle number');
  } else {
    if (cycle && detectedCycle !== cycle) {
      critical('ALL', 'base_context.json cycle (' + detectedCycle + ') does not match requested cycle (' + cycle + ')');
    }
    ok('ALL', 'Cycle ' + detectedCycle);
  }

  if (!bc.canon) {
    critical('ALL', 'base_context.json has no canon section');
  } else {
    // Council roster
    if (bc.canon.council && bc.canon.council.length === 9) {
      ok('CIVIC', 'Council roster: 9 members present');
    } else {
      var count = (bc.canon.council || []).length;
      critical('CIVIC', 'Council roster has ' + count + ' members (expected 9)');
    }

    // A's roster
    if (bc.canon.asRoster && bc.canon.asRoster.length > 0) {
      ok('SPORTS', 'A\'s roster: ' + bc.canon.asRoster.length + ' players');
    } else {
      warning('SPORTS', 'No A\'s roster in base_context');
    }

    // Executive branch
    if (bc.canon.executiveBranch && bc.canon.executiveBranch.mayor) {
      ok('CIVIC', 'Mayor: ' + bc.canon.executiveBranch.mayor);
    } else {
      warning('CIVIC', 'No mayor in executiveBranch — agents may fabricate a name');
    }
  }

  return bc;
}

function checkTrueSource() {
  var tsPath = path.join(PACKETS_DIR, 'truesource_reference.json');
  if (!fs.existsSync(tsPath)) {
    warning('ALL', 'truesource_reference.json not found — Rhea verification will be limited');
    return;
  }

  try {
    var ts = JSON.parse(fs.readFileSync(tsPath, 'utf-8'));
    var fields = Object.keys(ts);
    ok('ALL', 'truesource_reference.json: ' + fields.length + ' fields (' + fields.join(', ') + ')');
  } catch (e) {
    critical('ALL', 'truesource_reference.json is INVALID JSON');
  }
}

function checkVoiceFiles() {
  var voiceDir = path.join(__dirname, '..', 'docs', 'media', 'voices');
  var expected = [
    'anthony.md', 'p_slayer.md', 'hal_richmond.md',
    'carmen_delaine.md', 'trevor_shimizu.md',
    'maria_keen.md', 'selena_grant.md',
    'jordan_velez.md', 'jax_caldera.md'
  ];

  var missing = expected.filter(function(f) {
    return !fs.existsSync(path.join(voiceDir, f));
  });

  if (missing.length === 0) {
    ok('ALL', 'All ' + expected.length + ' voice files present');
  } else {
    warning('ALL', 'Missing voice files: ' + missing.join(', '));
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
var cycle = detectCycle();
if (!cycle) {
  console.error('[ERROR] Could not detect cycle. Pass cycle number: node scripts/preflightDeskCheck.js 83');
  process.exit(1);
}

console.log('PRE-FLIGHT DESK AGENT CHECK — Cycle ' + cycle);
console.log('================================================\n');

// Global checks
checkBaseContext(cycle);
checkTrueSource();
checkVoiceFiles();

// Per-desk checks
DESKS.forEach(function(desk) {
  var summary = checkFileExists(desk, desk + '_summary_c' + cycle + '.json', true);
  var packet = checkFileExists(desk, desk + '_c' + cycle + '.json', false);

  if (summary.exists) {
    checkJsonValid(desk, summary.path);
    checkPacketSize(desk, summary, MAX_SUMMARY_KB, 'Summary');
  }

  if (packet.exists) {
    checkJsonValid(desk, packet.path);
    checkPacketSize(desk, packet, MAX_PACKET_KB, 'Full packet');
  }

  checkBriefingExists(desk, cycle);
});

// Report
console.log('RESULTS');
console.log('================================================');

if (results.critical.length > 0) {
  console.log('\nCRITICAL (' + results.critical.length + '):');
  results.critical.forEach(function(r) { console.log('  ❌ ' + r); });
}

if (results.warning.length > 0) {
  console.log('\nWARNINGS (' + results.warning.length + '):');
  results.warning.forEach(function(r) { console.log('  ⚠️  ' + r); });
}

console.log('\nPASSED (' + results.ok.length + '):');
results.ok.forEach(function(r) { console.log('  ✓ ' + r); });

console.log('\n================================================');
if (results.critical.length > 0) {
  console.log('STATUS: NOT READY — ' + results.critical.length + ' critical issues');
  console.log('Fix critical issues before launching desk agents.');
  process.exit(1);
} else if (results.warning.length > 0) {
  console.log('STATUS: READY WITH WARNINGS — ' + results.warning.length + ' warnings');
  console.log('Agents can run but quality may be affected.');
  process.exit(0);
} else {
  console.log('STATUS: ALL CLEAR — ready to launch agents');
  process.exit(0);
}
