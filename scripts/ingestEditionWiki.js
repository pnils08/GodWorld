#!/usr/bin/env node
/**
 * ingestEditionWiki.js — Wiki-style entity extraction from publishable artifacts
 * [engine/sheet] — Phase 35.1 Smart Ingest + S180 T7 type-flag plumbing
 *
 * Reads a published .txt's structured sections (Names Index, Citizen Usage
 * Log, Article Table, Storylines Updated, Continuity Notes) and produces
 * per-entity wiki records in Supermemory's bay-tribune container.
 *
 * Instead of chunking the full text, this extracts:
 * - Per-citizen appearance records (who, where, what, which article)
 * - Per-initiative status updates (transition, details)
 * - Cross-references (citizens appearing across multiple sections)
 * - Contradictions with previous data (flagged, not resolved)
 *
 * Runs AFTER ingestEdition.js (which stores the raw chunks).
 * This adds the entity-level synthesis layer on top.
 *
 * Usage:
 *   node scripts/ingestEditionWiki.js editions/cycle_pulse_edition_90.txt --dry-run
 *   node scripts/ingestEditionWiki.js editions/cycle_pulse_edition_90.txt --apply
 *   node scripts/ingestEditionWiki.js editions/cycle_pulse_interview_92_santana.txt --type interview --cycle 92 --apply
 *
 * Flags:
 *   --type {edition|interview|supplemental|dispatch|interview-transcript}
 *           Default: edition. Each emitted memory's content carries a
 *           [TYPE: <type> | C<cycle>] prefix so full-text container search
 *           filters by type. Per-record metadata also gets type + cycle.
 *   --cycle N
 *           Overrides cycle extraction. Required when --type ≠ edition;
 *           non-edition mastheads don't carry the legacy "EDITION N" string.
 *   --dry-run / --apply
 *           --apply writes to bay-tribune; default is dry-run.
 */

require('/root/GodWorld/lib/env');
var fs = require('fs');
var path = require('path');
var https = require('https');

var API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
var CONTAINER_TAG = 'bay-tribune';
var API_HOST = 'api.supermemory.ai';
var DRY_RUN = !process.argv.includes('--apply');
// S215 canon.1b (G-S9) — wipe prior citizen wiki entries when a new edition
// writes updated facts, so bay-tribune stops stacking E85+E92+E93 versions
// of Patricia Nolan (66→55 across editions, all retrievable). Default OFF
// for backward compatibility — opt in via --wipe-priors. Dry-run shows
// which prior docs WOULD be deleted without touching them.
var WIPE_PRIORS = process.argv.includes('--wipe-priors');

var ALLOWED_TYPES = ['edition', 'interview', 'supplemental', 'dispatch', 'interview-transcript'];

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

function titleCaseType(t) {
  return t.split('-').map(function(w) {
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

var artifactType = parseType();
var cycleFlag = parseCycleFlag();

var filePath = process.argv.find(function(a) { return a.endsWith('.txt'); });
if (!filePath) {
  console.log('Usage: node scripts/ingestEditionWiki.js <source.txt> [--type <type>] [--cycle N] [--dry-run|--apply]');
  process.exit(1);
}

if (!API_KEY) {
  console.error('[ERROR] SUPERMEMORY_CC_API_KEY not set');
  process.exit(1);
}

var text = fs.readFileSync(path.resolve(filePath), 'utf8');
var filename = path.basename(filePath);

// Cycle resolution: --cycle wins. Otherwise try the filename format-contract
// pattern `cycle_pulse_<type>_<cycle>_<slug>.txt` (S180 T7 / EDITION_PIPELINE
// §Filename contract — applies to dispatch / interview / supplemental).
// Edition fallback to in-text "EDITION N" or any digit in filename last.
var cycle = cycleFlag;
var cycleSource = cycleFlag !== null ? '--cycle flag' : null;
if (cycle === null) {
  // Format-contract filename: cycle_pulse_<type>_<cycle>_<slug>.txt
  var fnMatch = filename.match(/^cycle_pulse_\w+_(\d+)_.+\.txt$/);
  if (fnMatch) {
    cycle = parseInt(fnMatch[1], 10);
    cycleSource = 'filename (format-contract)';
  } else if (artifactType === 'edition') {
    // Edition legacy fallbacks: in-text "EDITION N" or any digit in filename.
    var cm = text.match(/EDITION\s+(\d+)/i) || filename.match(/(\d+)/);
    if (cm) {
      cycle = parseInt(cm[1], 10);
      cycleSource = text.match(/EDITION\s+(\d+)/i) ? 'in-text masthead' : 'filename (legacy digit)';
    }
  }
  if (!cycle) {
    console.error('[ERROR] --cycle is required for --type ' + artifactType +
      ' (filename did not match cycle_pulse_<type>_<cycle>_<slug>.txt pattern).');
    process.exit(1);
  }
}
console.log('[CYCLE] C' + cycle + ' (resolved from ' + cycleSource + ')');

var typeLabel = titleCaseType(artifactType);
var contentTagPrefix = '[TYPE: ' + artifactType + ' | C' + cycle + '] ';

console.log(typeLabel + ': C' + cycle + ' | Mode: ' + (DRY_RUN ? 'DRY-RUN' : 'APPLY'));
console.log('[METADATA] ' + JSON.stringify({
  artifactType: artifactType,
  cycle: cycle,
  container: CONTAINER_TAG,
  contentTagPrefix: contentTagPrefix.trim(),
  source: path.basename(filePath)
}, null, 2));
console.log('---');

// ═══════════════════════════════════════════════════════════════════════════
// PARSE STRUCTURED SECTIONS
// ═══════════════════════════════════════════════════════════════════════════

var lines = text.split('\n');

function findSection(header, endPatterns) {
  var start = -1;
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].trim() === header || lines[i].trim().indexOf(header) === 0) {
      start = i + 1;
      // Skip separator lines
      while (start < lines.length && /^[=\-─━]+$/.test(lines[start].trim())) start++;
      break;
    }
  }
  if (start < 0) return [];

  var end = lines.length;
  for (var j = start; j < lines.length; j++) {
    for (var ep = 0; ep < endPatterns.length; ep++) {
      if (lines[j].trim().indexOf(endPatterns[ep]) === 0) {
        end = j;
        break;
      }
    }
    if (end !== lines.length) break;
  }
  return lines.slice(start, end).filter(function(l) { return l.trim(); });
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACT NAMES INDEX — per-article citizen appearances
// ═══════════════════════════════════════════════════════════════════════════

var citizenAppearances = {}; // name → { role, neighborhood, articles: [{section, headline, reporter}] }
var currentSection = '';
var currentHeadline = '';
var currentReporter = '';

for (var i = 0; i < lines.length; i++) {
  var line = lines[i];

  // Track section context
  var sectionMatch = line.match(/^-+\s*$/) ? null : line.match(/^(FRONT PAGE|CIVIC AFFAIRS|BUSINESS|CULTURE|SPORTS|CHICAGO|LETTERS|OPINION|HEALTH|ACCOUNTABILITY|FEATURES)/i);
  if (sectionMatch) currentSection = sectionMatch[1].trim();

  // Track headline (first substantive line after section header)
  if (currentSection && !currentHeadline && line.trim() && !/^[-=─━]+$/.test(line.trim()) && !/^(By |Names Index)/.test(line.trim())) {
    if (line.trim().length > 20 && line.trim().length < 200) {
      currentHeadline = line.trim();
    }
  }

  // Track reporter
  var bylineMatch = line.match(/^By\s+(.+?)(?:\s*\||$)/);
  if (bylineMatch) currentReporter = bylineMatch[1].trim();

  // Parse Names Index lines
  if (line.indexOf('Names Index:') >= 0) {
    var namesStr = line.replace(/^.*Names Index:\s*/, '');
    // Split on commas that are NOT inside parentheses
    var names = [];
    var depth = 0;
    var current = '';
    for (var ci2 = 0; ci2 < namesStr.length; ci2++) {
      var ch = namesStr[ci2];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ',' && depth === 0) {
        if (current.trim()) names.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    if (current.trim()) names.push(current.trim());

    for (var ni = 0; ni < names.length; ni++) {
      var nameEntry = names[ni].trim();
      if (!nameEntry) continue;

      // Parse: "Name (Role)" or "Name (age, Neighborhood, occupation)"
      var nameMatch = nameEntry.match(/^(.+?)\s*\((.+)\)$/);
      var name = nameMatch ? nameMatch[1].trim() : nameEntry;
      var details = nameMatch ? nameMatch[2].trim() : '';

      // Skip reporters
      if (details.toLowerCase() === 'reporter' || details.toLowerCase() === 'columnist' ||
          details.toLowerCase() === 'senior columnist') continue;

      if (!citizenAppearances[name]) {
        citizenAppearances[name] = { details: details, articles: [] };
      }

      citizenAppearances[name].articles.push({
        section: currentSection,
        headline: currentHeadline,
        reporter: currentReporter
      });
    }

    // Reset for next article
    currentHeadline = '';
    currentReporter = '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACT STANDALONE NAMES INDEX SECTION
// ═══════════════════════════════════════════════════════════════════════════
// Two shapes accepted:
//   pipe form:    POP-00537 | Marin Tao | Musician        (dispatch / interview / supplemental)
//   bullet form:  - Patricia Nolan — Retired teacher       (edition top-of-document index)
// Inline `Names Index:` per-article scan above already covers article-attributed
// edition rows; this pass picks up the standalone block both editions and
// non-edition artifacts emit. For citizens already populated by the inline
// scan, the standalone pass only fills missing `details` (no duplicate article
// row). For citizens not in the inline scan (the dispatch case — single-body
// artifacts have no per-article inline lists), the standalone pass is the only
// path and tags them with section = typeLabel.

var namesIndexLines = findSection('NAMES INDEX', [
  'CITIZEN USAGE LOG', 'BUSINESSES NAMED', 'STORYLINES UPDATED',
  'CONTINUITY NOTES', 'ARTICLE TABLE', "EDITOR'S DESK",
  'FRONT PAGE', 'CIVIC AFFAIRS', 'BUSINESS', 'CULTURE', 'SPORTS',
  'CHICAGO', 'LETTERS', 'OPINION', 'HEALTH', 'ACCOUNTABILITY',
  'FEATURES', 'COMING NEXT', 'END EDITION'
]);

var namesIndexLineCount = 0;
var namesIndexHits = 0;

for (var nii = 0; nii < namesIndexLines.length; nii++) {
  var nLine = namesIndexLines[nii].trim();
  if (!nLine) continue;
  // Skip pure-separator lines (findSection only filters fully-empty trims;
  // separators with hyphens, equals, em-dashes still pass through).
  if (/^[=\-─━_]+$/.test(nLine)) continue;
  namesIndexLineCount++;

  var indexedName = null;
  var indexedRole = '';

  // Pipe form: <ID> | <Name> | <Role>. First field must look like an ID
  // (POP-XXXX, CUL-XXXXXXXX, BIZ-XXXX, FAITH-XXXX). Other pipe-table rows
  // (e.g., article-table headers) fall through and are ignored.
  if (nLine.indexOf('|') >= 0) {
    var parts = nLine.split('|').map(function(p) { return p.trim(); });
    if (parts.length >= 2 && /^[A-Z]+-[A-Z0-9]+$/.test(parts[0])) {
      indexedName = parts[1];
      indexedRole = parts[2] || '';
    }
  }

  // Bullet em-dash form: "- Name — Role". Em-dash or en-dash both accepted.
  if (!indexedName) {
    var bulletMatch = nLine.match(/^-\s*(.+?)\s*[—–]\s*(.+)$/);
    if (bulletMatch) {
      indexedName = bulletMatch[1].trim();
      indexedRole = bulletMatch[2].trim();
    }
  }

  if (!indexedName) continue;

  // Skip reporters/columnists same as inline scan.
  var roleLc = indexedRole.toLowerCase();
  if (roleLc === 'reporter' || roleLc === 'columnist' || roleLc === 'senior columnist') continue;

  namesIndexHits++;

  if (!citizenAppearances[indexedName]) {
    // First record for this citizen — single-body type or top-of-edition only.
    citizenAppearances[indexedName] = {
      details: indexedRole,
      articles: [{ section: typeLabel, headline: '', reporter: '' }]
    };
  } else if (!citizenAppearances[indexedName].details && indexedRole) {
    // Inline scan already attributed them — only fill missing details.
    citizenAppearances[indexedName].details = indexedRole;
  }
}

// Fail-loud sanity check: standalone NAMES INDEX had non-empty content but
// parser extracted zero entities. Closes gap-log finding #9 (brittle gate).
if (namesIndexLineCount > 0 && namesIndexHits === 0) {
  console.error('[ERROR] NAMES INDEX section had ' + namesIndexLineCount +
    ' non-empty content lines but parser extracted 0 entities. ' +
    'Sample line: "' + (namesIndexLines.find(function(l) {
      var t = l.trim();
      return t && !/^[=\-─━_]+$/.test(t);
    }) || '').trim() + '"');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// PARSE CITIZEN USAGE LOG — returning vs new
// ═══════════════════════════════════════════════════════════════════════════

var citizenLogLines = findSection('CITIZEN USAGE LOG', ['STORYLINES', 'CONTINUITY', 'COMING NEXT', 'END EDITION']);
var returningCitizens = [];
var newCitizens = [];
var inNew = false;

for (var cli = 0; cli < citizenLogLines.length; cli++) {
  var cl = citizenLogLines[cli].trim();
  if (/New Citizens/i.test(cl)) { inNew = true; continue; }
  if (/Returning Citizens/i.test(cl)) { inNew = false; continue; }
  if (cl.indexOf('- ') !== 0) continue;

  var entry = cl.substring(2).trim();
  if (inNew) {
    newCitizens.push(entry);
  } else {
    returningCitizens.push(entry);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PARSE STORYLINES UPDATED — initiative status transitions
// ═══════════════════════════════════════════════════════════════════════════

var storylineLines = findSection('STORYLINES UPDATED', ['CONTINUITY', 'COMING NEXT', 'END EDITION']);
var storylines = [];

for (var sli = 0; sli < storylineLines.length; sli++) {
  var sl = storylineLines[sli].trim();
  if (sl.indexOf('- ') !== 0) continue;
  storylines.push(sl.substring(2).trim());
}

// ═══════════════════════════════════════════════════════════════════════════
// PARSE CONTINUITY NOTES
// ═══════════════════════════════════════════════════════════════════════════

var continuityLines = findSection('CONTINUITY NOTES', ['COMING NEXT', 'END EDITION']);
var continuityNotes = [];

for (var cni = 0; cni < continuityLines.length; cni++) {
  var cn = continuityLines[cni].trim();
  if (cn.indexOf('- ') !== 0) continue;
  continuityNotes.push(cn.substring(2).trim());
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD WIKI MEMORIES
// ═══════════════════════════════════════════════════════════════════════════

var memories = [];

// 1. Per-citizen appearance records
var citizenNames = Object.keys(citizenAppearances);
for (var ci = 0; ci < citizenNames.length; ci++) {
  var cName = citizenNames[ci];
  var cData = citizenAppearances[cName];

  var sections = cData.articles.map(function(a) { return a.section; }).filter(Boolean);
  var uniqueSections = [];
  for (var us = 0; us < sections.length; us++) {
    if (uniqueSections.indexOf(sections[us]) < 0) uniqueSections.push(sections[us]);
  }

  var memText = cName;
  if (cData.details) memText += ' (' + cData.details + ')';
  memText += ' appeared in ' + typeLabel + ' ' + cycle;
  memText += ' in ' + uniqueSections.length + ' section(s): ' + uniqueSections.join(', ') + '.';

  if (cData.articles.length > 0 && cData.articles[0].headline) {
    memText += ' Featured in: "' + cData.articles[0].headline.substring(0, 80) + '"';
    if (cData.articles[0].reporter) memText += ' by ' + cData.articles[0].reporter;
    memText += '.';
  }

  // Cross-section flag
  if (uniqueSections.length >= 2) {
    memText += ' [CROSS-SECTION: appeared in ' + uniqueSections.length + ' different sections]';
  }

  // engine.46 T2: byline axis — unique reporters who wrote this citizen's pieces,
  // so a bay-tribune query can filter appearances by who covered them.
  var uniqueReporters = [];
  for (var ur = 0; ur < cData.articles.length; ur++) {
    var rName = (cData.articles[ur].reporter || '').trim();
    if (rName && uniqueReporters.indexOf(rName) < 0) uniqueReporters.push(rName);
  }

  memories.push({
    content: contentTagPrefix + memText,
    metadata: {
      recordType: 'citizen-appearance',
      type: artifactType,
      citizen: cName,
      cycle: cycle,
      sections: uniqueSections.join(','),
      reporters: uniqueReporters.join(','),
      crossSection: uniqueSections.length >= 2
    }
  });
}

// 2. Returning citizen context
for (var ri = 0; ri < returningCitizens.length; ri++) {
  memories.push({
    content: contentTagPrefix + typeLabel + ' ' + cycle + ' returning citizen: ' + returningCitizens[ri],
    metadata: {
      recordType: 'citizen-returning',
      type: artifactType,
      cycle: cycle
    }
  });
}

// 3. New citizen introductions
for (var nci = 0; nci < newCitizens.length; nci++) {
  memories.push({
    content: contentTagPrefix + typeLabel + ' ' + cycle + ' introduced new citizen: ' + newCitizens[nci],
    metadata: {
      recordType: 'citizen-new',
      type: artifactType,
      cycle: cycle
    }
  });
}

// 4. Storyline transitions
for (var sti = 0; sti < storylines.length; sti++) {
  memories.push({
    content: contentTagPrefix + typeLabel + ' ' + cycle + ' storyline update: ' + storylines[sti],
    metadata: {
      recordType: 'storyline-transition',
      type: artifactType,
      cycle: cycle
    }
  });
}

// 5. Continuity notes
for (var ctn = 0; ctn < continuityNotes.length; ctn++) {
  memories.push({
    content: contentTagPrefix + typeLabel + ' ' + cycle + ' continuity note: ' + continuityNotes[ctn],
    metadata: {
      recordType: 'continuity',
      type: artifactType,
      cycle: cycle
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DISPLAY SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

// G-P2 (S215): label rename + headline total. Pre-fix, the line read
// `Citizens found: 0` immediately above `Returning: 48 / New: 0`, which was
// contradictory at a glance. The `citizenNames` array actually counted only
// citizens reached via the inline `Names Index:` per-article scan (the
// cross-section bucket); the standalone NAMES INDEX block + returning/new
// resolution happened in a separate pass below. Reusing the same label for
// a sub-bucket count read as a bug.
var crossSectionCount = citizenNames.filter(function(n) {
  return citizenAppearances[n].articles.map(function(a) { return a.section; })
    .filter(function(s, i, arr) { return s && arr.indexOf(s) === i; }).length >= 2;
}).length;
console.log('\nWIKI EXTRACTION SUMMARY:');
console.log('  Citizens total: ' + (returningCitizens.length + newCitizens.length) +
  ' (' + returningCitizens.length + ' returning + ' + newCitizens.length + ' new)');
console.log('  Cross-section citizens (article-attributed scan): ' + citizenNames.length);
console.log('    of those, in 2+ sections: ' + crossSectionCount);
console.log('  Returning: ' + returningCitizens.length);
console.log('  New: ' + newCitizens.length);
console.log('  Storylines: ' + storylines.length);
console.log('  Continuity notes: ' + continuityNotes.length);
console.log('  Total memories: ' + memories.length);
console.log('');

// Show citizen details
for (var di = 0; di < citizenNames.length; di++) {
  var dn = citizenNames[di];
  var dd = citizenAppearances[dn];
  var ds = dd.articles.map(function(a) { return a.section; }).filter(function(s, i, arr) { return s && arr.indexOf(s) === i; });
  console.log('  ' + dn + (dd.details ? ' (' + dd.details + ')' : '') +
    ' → ' + ds.join(', ') + (ds.length >= 2 ? ' [CROSS]' : ''));
}

// ═══════════════════════════════════════════════════════════════════════════
// WRITE CONTRADICTIONS FILE
// ═══════════════════════════════════════════════════════════════════════════

// Check for potential contradictions in continuity notes
var contradictions = continuityNotes.filter(function(n) {
  return /contradict|conflict|incorrect|wrong|error|mismatch|inconsist/i.test(n);
});

if (contradictions.length > 0 || newCitizens.length > 0) {
  var contradictionFile = path.join(__dirname, '..', 'output', 'contradictions_c' + cycle + '.json');
  var contradictionData = {
    cycle: cycle,
    timestamp: new Date().toISOString(),
    contradictions: contradictions,
    newCitizensToVerify: newCitizens,
    crossSectionCitizens: citizenNames.filter(function(n) {
      return citizenAppearances[n].articles.map(function(a) { return a.section; })
        .filter(function(s, i, arr) { return s && arr.indexOf(s) === i; }).length >= 2;
    })
  };
  try {
    var outDir = path.dirname(contradictionFile);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(contradictionFile, JSON.stringify(contradictionData, null, 2));
    console.log('\nContradictions/flags written to: ' + path.basename(contradictionFile));
  } catch (e) {
    // output/ may be gitignored — non-fatal
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WRITE TO SUPERMEMORY
// ═══════════════════════════════════════════════════════════════════════════
// Note (S215 canon.1b): the wipe-priors pass + the addMemory pass both live
// in the async block below. Dry-run mode previews both (deletion candidates
// + sample memory) instead of exiting early. --wipe-priors dry-run produces
// the candidate list so the operator can review before authorizing --apply.

function addMemory(content, metadata) {
  return new Promise(function(resolve, reject) {
    // engine.46 T2 fix: metadata was accepted here and silently DROPPED — the
    // payload never included it, so recordType/citizen/cycle/sections (and now
    // reporters) never reached the API. The official SDK sends metadata as a
    // first-class field on add; mirrored per-item on the batch form. Non-2xx
    // still rejects loudly, so a shape mismatch cannot fail silent.
    var item = { content: content };
    if (metadata) item.metadata = metadata;
    var payload = JSON.stringify({
      memories: [item],
      containerTag: CONTAINER_TAG
    });

    var options = {
      hostname: API_HOST,
      path: '/v4/memories',
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

// ═══════════════════════════════════════════════════════════════════════════
// S215 canon.1b — Prior-citizen-record wipe
// ═══════════════════════════════════════════════════════════════════════════
// Search bay-tribune for prior citizen wiki records by name + (optionally)
// popId, identify versions older than the current cycle, return their IDs.
// Then DELETE each via /v3/documents/{id} before the new edition's record
// writes. Stops the E85+E92+E93 stacking pattern (G-S9 Patricia Nolan 66→55).
//
// Match heuristic: response contains the citizen's full name AND either
// (a) contains a `[TYPE: ... | C<N>]` prefix with N < currentCycle, or
// (b) lacks a cycle tag entirely (legacy / migrated docs from pre-prefix era).
// (b) is included because legacy docs are the worst stackers — older content
// ingested without the prefix predates the canon-fidelity rollout.
function searchSupermemoryJSON(query, limit) {
  return new Promise(function(resolve) {
    var payload = JSON.stringify({
      q: query,
      containerTag: CONTAINER_TAG,
      searchMode: 'hybrid',
      limit: limit
    });
    var options = {
      hostname: API_HOST,
      path: '/v4/search',
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
        if (res.statusCode !== 200) { resolve([]); return; }
        try {
          var parsed = JSON.parse(data);
          resolve(parsed.results || []);
        } catch (e) { resolve([]); }
      });
    });
    req.on('error', function() { resolve([]); });
    req.setTimeout(10000, function() { req.destroy(); resolve([]); });
    req.write(payload);
    req.end();
  });
}

function deleteSupermemoryDoc(docId) {
  return new Promise(function(resolve, reject) {
    var options = {
      hostname: API_HOST,
      path: '/v3/documents/' + encodeURIComponent(docId),
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + API_KEY
      }
    };
    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode });
        } else {
          reject(new Error('DELETE HTTP ' + res.statusCode + ': ' + data));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function extractCycleFromContent(content) {
  // Returns the cycle number from a `[TYPE: ... | C<N>]` prefix, or null
  // when no prefix is present (legacy / migrated docs).
  var m = (content || '').match(/\[TYPE:\s*[^|]+\|\s*C(\d+)\]/i);
  return m ? parseInt(m[1], 10) : null;
}

async function findPriorCitizenRecords(citizenName, currentCycle) {
  // Search bay-tribune for this citizen by name; over-fetch then filter
  // client-side to records that (a) literally contain the citizen's name
  // AND (b) are tagged with a prior cycle or have no cycle tag at all.
  if (!citizenName) return [];
  var hits = await searchSupermemoryJSON(citizenName, 25);
  var priors = [];
  for (var h = 0; h < hits.length; h++) {
    var r = hits[h];
    var body = r.memory || r.content || '';
    // Literal name match — defends against semantic-only hits about other
    // citizens that share a token.
    if (body.indexOf(citizenName) === -1) continue;
    var c = extractCycleFromContent(body);
    if (c !== null && c >= currentCycle) continue;  // Same/future cycle — not prior
    priors.push({
      id: r.id,
      cycle: c,
      updatedAt: r.updatedAt,
      snippet: body.substring(0, 140),
    });
  }
  return priors;
}

function extractCitizenName(memory) {
  // Pull the citizen name out of a memory record so the wipe pass can
  // search for it. citizen-appearance carries it in metadata; the other
  // citizen records carry it inline in content after `returning citizen:`
  // / `introduced new citizen:` markers.
  if (!memory || !memory.metadata) return null;
  var meta = memory.metadata;
  var rt = meta.recordType;
  if (rt === 'citizen-appearance' && meta.citizen) return meta.citizen;

  var content = memory.content || '';
  if (rt === 'citizen-returning') {
    var rm = content.match(/returning citizen:\s*([^,(\n]+)/i);
    if (rm) return rm[1].trim();
  }
  if (rt === 'citizen-new') {
    var nm = content.match(/introduced new citizen:\s*([^,(\n]+)/i);
    if (nm) return nm[1].trim();
  }
  return null;
}

(async function() {
  var success = 0;
  var errors = 0;
  var wipedDocs = 0;
  var wipedCitizens = {};  // name -> count of priors wiped (for the summary line)

  // S215 canon.1b — pre-write wipe of prior citizen entries.
  // Runs once per unique citizen in this batch. Only fires when --wipe-priors
  // is set; APPLY gate still governs whether DELETE actually runs (dry-run
  // mode prints the count of priors that WOULD be wiped, never destroys).
  if (WIPE_PRIORS && !API_KEY) {
    console.error('[ERROR] SUPERMEMORY_CC_API_KEY required for --wipe-priors');
    process.exit(1);
  }
  if (WIPE_PRIORS) {
    console.log('\n[WIPE-PRIORS] Scanning for prior citizen records in bay-tribune...');
    var seen = {};
    for (var wi = 0; wi < memories.length; wi++) {
      var name = extractCitizenName(memories[wi]);
      if (!name || seen[name]) continue;
      seen[name] = true;
      try {
        var priors = await findPriorCitizenRecords(name, cycle);
        if (priors.length === 0) continue;
        console.log('  ' + name + ': ' + priors.length + ' prior record(s) found');
        for (var pi = 0; pi < priors.length; pi++) {
          var prior = priors[pi];
          var tag = prior.cycle !== null ? 'C' + prior.cycle : 'no-cycle-tag';
          if (DRY_RUN) {
            console.log('    [DRY] Would delete ' + prior.id + ' (' + tag + '): ' + prior.snippet);
          } else {
            try {
              await deleteSupermemoryDoc(prior.id);
              wipedDocs++;
              console.log('    [DELETED] ' + prior.id + ' (' + tag + ')');
            } catch (delErr) {
              console.error('    [FAIL] DELETE ' + prior.id + ' — ' + delErr.message);
            }
            await new Promise(function(r) { setTimeout(r, 200); });  // small inter-delete pacing
          }
        }
        wipedCitizens[name] = priors.length;
      } catch (searchErr) {
        console.warn('    [WARN] Could not scan priors for ' + name + ' — ' + searchErr.message);
      }
    }
    if (DRY_RUN && Object.keys(wipedCitizens).length > 0) {
      var totalDry = 0;
      for (var k in wipedCitizens) totalDry += wipedCitizens[k];
      console.log('[WIPE-PRIORS] Dry-run: ' + totalDry + ' prior records across ' +
        Object.keys(wipedCitizens).length + ' citizens. Use --apply to actually delete.');
    } else if (!DRY_RUN) {
      console.log('[WIPE-PRIORS] Wiped: ' + wipedDocs + ' prior docs across ' +
        Object.keys(wipedCitizens).length + ' citizens.');
    }
  }

  if (DRY_RUN) {
    if (memories.length > 0) {
      console.log('\n--- SAMPLE MEMORY (first of ' + memories.length + ') ---');
      console.log('content: ' + memories[0].content);
      console.log('metadata: ' + JSON.stringify(memories[0].metadata));
    }
    console.log('\n--- DRY RUN — ' + memories.length + ' memories would be written. Use --apply to write.');
    process.exit(0);
  }

  for (var mi = 0; mi < memories.length; mi++) {
    var m = memories[mi];
    try {
      await addMemory(m.content, m.metadata);
      success++;
      if ((mi + 1) % 10 === 0) console.log('  ... ' + (mi + 1) + '/' + memories.length);
    } catch (err) {
      console.error('[FAIL] ' + m.content.substring(0, 80) + ' — ' + err.message);
      errors++;
    }

    // Rate limit
    if (mi < memories.length - 1) {
      await new Promise(function(r) { setTimeout(r, 300); });
    }
  }

  console.log('\n[DONE] Written: ' + success + ', Errors: ' + errors);
  if (WIPE_PRIORS && wipedDocs > 0) {
    console.log('[DONE] Prior records wiped: ' + wipedDocs);
  }
  if (success > 0) console.log('Edition ' + cycle + ' wiki entities are now in bay-tribune');
})();
