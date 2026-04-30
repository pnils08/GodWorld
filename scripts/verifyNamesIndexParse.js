#!/usr/bin/env node
/**
 * verifyNamesIndexParse.js — Independent NAMES INDEX row counter
 * [engine/sheet] — S189 dispatch gap E8 helper
 *
 * Defense-in-depth complement to the E1/E2 fail-loud guards baked into
 * ingestEditionWiki.js + ingestPublishedEntities.js. Reads the canonical
 * .txt directly, counts non-separator non-empty lines in the NAMES INDEX
 * section, and (when --expected is supplied) compares against the count
 * an ingest script reported. Exits non-zero with diagnostic on mismatch.
 *
 * Designed for use by /post-publish Step 5 — the skill calls this against
 * the source .txt with --expected = ingest-script's parsed count, blocks
 * publish if the helper disagrees. Useful when a future ingest script
 * regresses the in-script guard.
 *
 * Usage:
 *   node scripts/verifyNamesIndexParse.js <file.txt>
 *   node scripts/verifyNamesIndexParse.js <file.txt> --expected <N>
 *
 * Exit codes:
 *   0  no mismatch (or no --expected supplied — just prints count)
 *   1  source count != expected
 *   2  argument error or file not found
 */

const fs = require('fs');
const path = require('path');

const SECTION_TERMINATORS = [
  'CITIZEN USAGE LOG', 'BUSINESSES NAMED', 'STORYLINES UPDATED',
  'CONTINUITY NOTES', 'ARTICLE TABLE', "EDITOR'S DESK",
  'FRONT PAGE', 'CIVIC AFFAIRS', 'BUSINESS', 'CULTURE', 'SPORTS',
  'CHICAGO', 'LETTERS', 'OPINION', 'HEALTH', 'ACCOUNTABILITY',
  'FEATURES', 'COMING NEXT', 'END EDITION'
];

function parseFlag(name) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1 || i === process.argv.length - 1) return null;
  return process.argv[i + 1];
}

function countNamesIndexRows(text) {
  const lines = text.split('\n');

  // Locate section header. Match exact `NAMES INDEX` line OR any line
  // whose trim STARTS with `NAMES INDEX` (allows trailing decoration).
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === 'NAMES INDEX' || t.indexOf('NAMES INDEX') === 0) {
      start = i + 1;
      // Skip separator lines that hug the header
      while (start < lines.length && /^[=\-─━_]+$/.test(lines[start].trim())) start++;
      break;
    }
  }

  if (start < 0) return { found: false, count: 0, sample: null };

  // Walk to the next section terminator
  let end = lines.length;
  for (let j = start; j < lines.length; j++) {
    const t = lines[j].trim();
    for (const term of SECTION_TERMINATORS) {
      if (t.indexOf(term) === 0) {
        end = j;
        break;
      }
    }
    if (end !== lines.length) break;
  }

  // Count non-separator non-empty content lines, capture first sample
  let count = 0;
  let sample = null;
  for (let k = start; k < end; k++) {
    const t = lines[k].trim();
    if (!t) continue;
    if (/^[=\-─━_]+$/.test(t)) continue;
    count++;
    if (sample === null) sample = t;
  }

  return { found: true, count, sample };
}

const filePath = process.argv.find(a => a.endsWith('.txt'));
const expectedRaw = parseFlag('expected');

if (!filePath) {
  console.error('Usage: node scripts/verifyNamesIndexParse.js <file.txt> [--expected <N>]');
  process.exit(2);
}

let expected = null;
if (expectedRaw !== null) {
  expected = parseInt(expectedRaw, 10);
  if (!Number.isFinite(expected) || expected < 0) {
    console.error('[ERROR] --expected must be a non-negative integer');
    process.exit(2);
  }
}

const fullPath = path.resolve(filePath);
if (!fs.existsSync(fullPath)) {
  console.error('[ERROR] File not found: ' + fullPath);
  process.exit(2);
}

const text = fs.readFileSync(fullPath, 'utf8');
const result = countNamesIndexRows(text);

console.log('Source: ' + path.basename(filePath));
if (!result.found) {
  console.log('NAMES INDEX section: not present');
} else {
  console.log('NAMES INDEX rows in source: ' + result.count);
  if (result.sample) console.log('Sample row 1: "' + result.sample + '"');
}
if (expected !== null) {
  console.log('Expected (parsed by ingest): ' + expected);
}

if (expected === null) {
  process.exit(0);
}

if (!result.found && expected > 0) {
  console.error('[FAIL] expected ' + expected + ' parsed entities but source has no NAMES INDEX section');
  process.exit(1);
}

if (result.count !== expected) {
  console.error('[FAIL] mismatch — source has ' + result.count +
    ' NAMES INDEX rows but ingest script parsed ' + expected);
  process.exit(1);
}

console.log('[OK] source count matches expected');
process.exit(0);
