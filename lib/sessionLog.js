/**
 * sessionLog.js — Phase 40.1
 *
 * Read-only helper for GodWorld's durable event log: production logs
 * (output/production_log_*.md) and the journal (docs/mags-corliss/JOURNAL.md).
 * Returns positional slices so skills, scripts, and crashed reporters can
 * resume from a known event instead of re-parsing ad hoc.
 *
 * Two slicing primitives in this MVP (per Inventory in
 * docs/plans/2026-04-16-phase-40-1-session-log-interface.md):
 *   - readLast(path, n)              — last N events in original order
 *   - readSince(path, isoTimestamp)  — events at-or-after a timestamp
 *
 * `readByTag` was dropped from MVP — no current consumer.
 *
 * Event shape:
 *   { step: string|null, tag: string|null, timestamp: string|null, body: string }
 *
 * Accepted log formats:
 *   1. Step-numbered editions — `## Step 0: Session State`
 *      Reference: output/production_log_edition_c91.md
 *      Frontmatter (before first ##) often carries `**Started:** 2026-04-09 03:30 UTC`.
 *   2. Free-form session blocks — `## Session 147 — 2026-04-15`
 *      Reference: docs/mags-corliss/JOURNAL.md
 *      Date is parsed from the heading (after the em dash or hyphen).
 *
 * Writers are out of scope. This library does not create, modify, or append.
 */

const fs = require('fs');

const STARTED_RE = /^\*\*Started:\*\*\s*(.+?)\s*$/m;
const STEP_TAG_RE = /^\*\*Step tag:\*\*\s*(.+?)\s*$/m;
// Heading dates: "Session 147 — 2026-04-15" or "Session 144 - 2026-04-12"
const HEADING_DATE_RE = /[—-]\s*(\d{4}-\d{2}-\d{2})/;

function parseBlocks(content) {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const blocks = [];
  let preambleLines = [];
  let current = null;

  for (const line of lines) {
    const m = line.match(/^## (.+?)\s*$/);
    if (m) {
      if (current) blocks.push(current);
      else preambleLines = preambleLines; // preamble already collected
      current = { heading: m[1], bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    } else {
      preambleLines.push(line);
    }
  }
  if (current) blocks.push(current);

  const preamble = preambleLines.join('\n');
  const fileStartedMatch = preamble.match(STARTED_RE);
  const fileTimestamp = fileStartedMatch ? fileStartedMatch[1] : null;

  return blocks.map(b => buildEvent(b.heading, b.bodyLines.join('\n'), fileTimestamp));
}

function buildEvent(heading, body, fileTimestamp) {
  const startedMatch = body.match(STARTED_RE);
  const stepTagMatch = body.match(STEP_TAG_RE);
  const headingDateMatch = heading.match(HEADING_DATE_RE);

  let timestamp = null;
  if (startedMatch) timestamp = startedMatch[1];
  else if (headingDateMatch) timestamp = headingDateMatch[1];
  else if (fileTimestamp) timestamp = fileTimestamp;

  return {
    step: heading,
    tag: stepTagMatch ? stepTagMatch[1] : null,
    timestamp,
    body: body.replace(/^\n+|\n+$/g, ''),
  };
}

function readFileSafe(path) {
  if (!fs.existsSync(path)) return null;
  return fs.readFileSync(path, 'utf8');
}

function readLast(path, n) {
  const content = readFileSafe(path);
  if (content == null) return [];
  const blocks = parseBlocks(content);
  if (n >= blocks.length) return blocks;
  return blocks.slice(blocks.length - n);
}

function parseDateLoose(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function readSince(path, isoTimestamp) {
  const content = readFileSafe(path);
  if (content == null) return [];
  const blocks = parseBlocks(content);
  const cutoff = parseDateLoose(isoTimestamp);
  if (!cutoff) return [];

  const out = [];
  let firstMatchSeen = false;
  for (const ev of blocks) {
    const evDate = parseDateLoose(ev.timestamp);
    if (evDate && evDate >= cutoff) {
      out.push(ev);
      firstMatchSeen = true;
    } else if (!evDate && firstMatchSeen) {
      out.push(ev);
    }
  }
  return out;
}

module.exports = { readLast, readSince };
