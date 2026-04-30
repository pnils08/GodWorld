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

// Cycle resolution: --cycle wins. Otherwise edition fallback to text/filename
// regex; non-edition types must pass --cycle (their mastheads don't carry the
// legacy "EDITION N" string and a stray digit elsewhere could mistag canon).
var cycle = cycleFlag;
if (cycle === null) {
  if (artifactType === 'edition') {
    var cm = text.match(/EDITION\s+(\d+)/i) || filename.match(/(\d+)/);
    if (cm) cycle = parseInt(cm[1], 10);
  }
  if (!cycle) {
    console.error('[ERROR] --cycle is required for --type ' + artifactType +
      ' (no fallback extraction for non-edition types).');
    process.exit(1);
  }
}

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

  memories.push({
    content: contentTagPrefix + memText,
    metadata: {
      recordType: 'citizen-appearance',
      type: artifactType,
      citizen: cName,
      cycle: cycle,
      sections: uniqueSections.join(','),
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

console.log('\nWIKI EXTRACTION SUMMARY:');
console.log('  Citizens found: ' + citizenNames.length);
console.log('    Cross-section: ' + citizenNames.filter(function(n) {
  return citizenAppearances[n].articles.map(function(a) { return a.section; })
    .filter(function(s, i, arr) { return s && arr.indexOf(s) === i; }).length >= 2;
}).length);
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

if (DRY_RUN) {
  if (memories.length > 0) {
    console.log('\n--- SAMPLE MEMORY (first of ' + memories.length + ') ---');
    console.log('content: ' + memories[0].content);
    console.log('metadata: ' + JSON.stringify(memories[0].metadata));
  }
  console.log('\n--- DRY RUN — ' + memories.length + ' memories would be written. Use --apply to write.');
  process.exit(0);
}

function addMemory(content, metadata) {
  return new Promise(function(resolve, reject) {
    var payload = JSON.stringify({
      memories: [{ content: content }],
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

(async function() {
  var success = 0;
  var errors = 0;

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
  if (success > 0) console.log('Edition ' + cycle + ' wiki entities are now in bay-tribune');
})();
