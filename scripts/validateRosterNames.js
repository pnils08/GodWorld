#!/usr/bin/env node
/**
 * validateRosterNames.js — detect near-miss player surnames in any artifact
 * [engine/sheet] — closes pipeline.19 G-W24 (S215)
 *
 * Problem this prevents: "Eric Tavares" propagating into world_summary_c{XX}.md,
 * desk packets, and editions when canon is "Eric Taveras." Latin surname
 * endings (-as / -es, -ares / -eras) are the recurring failure surface — Rhea's
 * memory notes 3 editions hit with Taveras/Tavares variants and 1 with
 * Quintero/Hector-vs-Ernesto. Each cycle the typo enters via a cached source
 * (sports-desk MEMORY.md historically), propagates downstream through briefs
 * and world summary, and reaches the edition where Rhea catches it post-hoc.
 *
 * This script is the upstream gate: scan ANY artifact (world summary, desk
 * packet, brief, even an in-progress draft) against the canon roster and
 * flag suspected surname typos before they reach the edition.
 *
 * Usage:
 *   node scripts/validateRosterNames.js output/world_summary_c93.md
 *   node scripts/validateRosterNames.js output/desk-packets/sports_c93.json
 *   node scripts/validateRosterNames.js editions/cycle_pulse_edition_93.txt
 *
 *   --roster <path>   Override canon roster (default: docs/media/2041_athletics_roster.md)
 *   --json            Emit JSON report instead of human-readable lines
 *   --max-distance N  Levenshtein threshold (default: 2)
 *
 * Exit codes:
 *   0  No suspected typos found.
 *   1  Suspected typos found — review output.
 *   2  Invalid input (file not found, no roster names parsed, etc.).
 */

var fs = require('fs');
var path = require('path');

function parseArg(name) {
  var i = process.argv.indexOf('--' + name);
  if (i === -1 || i === process.argv.length - 1) return null;
  return process.argv[i + 1];
}

var DEFAULT_ROSTER = path.join(__dirname, '..', 'docs', 'media', '2041_athletics_roster.md');
var rosterPath = path.resolve(parseArg('roster') || DEFAULT_ROSTER);
var jsonMode = process.argv.includes('--json');
var maxDistance = parseInt(parseArg('max-distance') || '2', 10);

var targetPath = process.argv.find(function(a) {
  return !a.startsWith('--') && a !== process.argv[0] && a !== process.argv[1];
});

if (!targetPath || !fs.existsSync(targetPath)) {
  console.error('[ERROR] Target file not found: ' + targetPath);
  console.error('Usage: node scripts/validateRosterNames.js <target> [--roster PATH] [--json]');
  process.exit(2);
}
if (!fs.existsSync(rosterPath)) {
  console.error('[ERROR] Roster file not found: ' + rosterPath);
  process.exit(2);
}

// ═══════════════════════════════════════════════════════════════════════════
// PARSE CANON ROSTER — extract (First, Last) pairs from pipe-delimited rows
// ═══════════════════════════════════════════════════════════════════════════
// Roster row shape: `| 6 | Eric Taveras | 2B | 25 | ... `
// Some names are three-token ("Antonio De La Rosa") — capture "De La Rosa" as
// the surname. Strip uniform-position columns by taking only column index 1.

var rosterText = fs.readFileSync(rosterPath, 'utf8');
var canonPairs = [];

var rosterRowRe = /^\|\s*\d+\s*\|\s*([A-Z][A-Za-z'.\-]+(?:\s+[A-Z][A-Za-z'.\-]+)+)\s*\|/gm;
var seen = {};
var match;
while ((match = rosterRowRe.exec(rosterText)) !== null) {
  var fullName = match[1].trim();
  var tokens = fullName.split(/\s+/);
  if (tokens.length < 2) continue;
  var first = tokens[0];
  var last = tokens.slice(1).join(' ');
  // Skip stat tokens (e.g. position abbreviations that look like names).
  if (first.length < 2 || last.length < 2) continue;
  var key = first + '|' + last;
  if (seen[key]) continue;
  seen[key] = true;
  canonPairs.push({ first: first, last: last });
}

if (canonPairs.length === 0) {
  console.error('[ERROR] No roster names parsed from ' + rosterPath);
  console.error('Expected pipe-delimited rows: `| N | First Last | POS | ...`');
  process.exit(2);
}

// ═══════════════════════════════════════════════════════════════════════════
// LEVENSHTEIN
// ═══════════════════════════════════════════════════════════════════════════

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  var prev = [];
  for (var i = 0; i <= b.length; i++) prev[i] = i;
  for (var ai = 1; ai <= a.length; ai++) {
    var curr = [ai];
    for (var bi = 1; bi <= b.length; bi++) {
      var cost = a[ai - 1] === b[bi - 1] ? 0 : 1;
      curr[bi] = Math.min(
        curr[bi - 1] + 1,
        prev[bi] + 1,
        prev[bi - 1] + cost
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

// ═══════════════════════════════════════════════════════════════════════════
// SCAN TARGET — flag canon-first-name + near-miss surname
// ═══════════════════════════════════════════════════════════════════════════

var targetText = fs.readFileSync(targetPath, 'utf8');
var targetLines = targetText.split('\n');
var findings = [];

// Build a first-name → canon-last lookup for fast first-name detection.
var firstToCanonLasts = {};
canonPairs.forEach(function(p) {
  if (!firstToCanonLasts[p.first]) firstToCanonLasts[p.first] = [];
  firstToCanonLasts[p.first].push(p.last);
});

for (var li = 0; li < targetLines.length; li++) {
  var line = targetLines[li];
  // Find every "FirstName SomethingCapitalized" occurrence on the line.
  var pairRe = /\b([A-Z][a-z'.\-]+)\s+([A-Z][A-Za-z'.\-]+(?:\s+[A-Z][A-Za-z'.\-]+){0,2})\b/g;
  var pm;
  while ((pm = pairRe.exec(line)) !== null) {
    var foundFirst = pm[1];
    var foundLast = pm[2];

    // Strip English possessives so "Quintero's" doesn't false-positive
    // against canon "Quintero." Also strip trailing punctuation that the
    // word-boundary capture sometimes brings in (commas were excluded by
    // \b but defensive in case the char class evolves).
    var foundLastClean = foundLast.replace(/['’]s$/, '').replace(/[.,;:!?]+$/, '');

    var canonLasts = firstToCanonLasts[foundFirst];
    if (!canonLasts) continue;
    // Exact match against any canon last — skip; not a typo.
    if (canonLasts.indexOf(foundLastClean) >= 0) continue;

    // Near-miss check: foundLast within edit distance threshold of any canon
    // last for this first name. Compare against full surname token (the canon
    // last can be multi-word like "De La Rosa" — compare token-joined string).
    for (var ci = 0; ci < canonLasts.length; ci++) {
      var canonLast = canonLasts[ci];
      var d = levenshtein(foundLastClean.toLowerCase(), canonLast.toLowerCase());
      // Threshold scaled to length — very short names need stricter distance.
      var threshold = Math.min(maxDistance, Math.max(1, Math.floor(canonLast.length * 0.4)));
      if (d > 0 && d <= threshold) {
        findings.push({
          line: li + 1,
          col: pm.index + 1,
          found: foundFirst + ' ' + foundLast,
          suggested: foundFirst + ' ' + canonLast,
          distance: d,
          context: line.trim().substring(0, 160),
        });
        break;
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORT
// ═══════════════════════════════════════════════════════════════════════════

if (jsonMode) {
  process.stdout.write(JSON.stringify({
    target: targetPath,
    roster: rosterPath,
    rosterPairs: canonPairs.length,
    findings: findings,
  }, null, 2) + '\n');
} else {
  console.log('Roster: ' + path.relative(process.cwd(), rosterPath) +
    ' (' + canonPairs.length + ' canon pairs)');
  console.log('Target: ' + path.relative(process.cwd(), targetPath));
  console.log('Edit-distance threshold: ' + maxDistance);
  console.log('---');
  if (findings.length === 0) {
    console.log('No suspected name typos found. Exit 0.');
  } else {
    console.log('SUSPECTED NAME TYPOS (' + findings.length + '):');
    findings.forEach(function(f) {
      console.log('  Line ' + f.line + ':' + f.col + ' — found "' + f.found +
        '" — did you mean "' + f.suggested + '"? (Levenshtein ' + f.distance + ')');
      console.log('    Context: ' + f.context);
    });
  }
}

process.exit(findings.length === 0 ? 0 : 1);
