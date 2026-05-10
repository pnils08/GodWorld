#!/usr/bin/env node
// auditPlanTagDrift.js — Catch frontmatter tag drift from changelog status verbs.
// Per ROLLOUT governance.3 (S212).
//
// S212 plans-group doc-audit found 7 frontmatter tag drifts where changelogs
// logged "draft → active" or "active → complete" but the actual frontmatter
// edit never landed. Pattern: changelog-says-shipped but tag-didn't-follow.
// Particularly common when execution happens in engine-sheet (which doesn't
// typically touch plan frontmatter).
//
// This script scans plan changelogs for status verbs, compares against the
// frontmatter `tags:` line, and reports mismatches. Run at /session-end or
// research-build session close.
//
// Usage:
//   node scripts/auditPlanTagDrift.js          # report; exit 0 if clean, 1 if drift
//   node scripts/auditPlanTagDrift.js --json   # JSON output for CI
//
// Skips: TEMPLATE.md, GAP_LOG_TEMPLATE.md, BACKLOG.md (templates + index docs).

'use strict';

const fs = require('fs');
const path = require('path');

const PLANS_DIR = path.join(__dirname, '..', 'docs', 'plans');
const SKIP_FILES = new Set(['TEMPLATE.md', 'GAP_LOG_TEMPLATE.md', 'BACKLOG.md']);
const STATUS_TAGS = new Set(['draft', 'active', 'complete', 'done', 'parked', 'archived', 'deferred']);

// Conservative detection: only flag explicit status-transition phrases.
// Bare DONE/SHIPPED/COMPLETE is too noisy — plans use those at task/phase level
// without the whole plan being done (e.g., "Task 1 DONE", "Phase 2 SHIPPED").
// Real drift signal is an explicit transition arrow that the frontmatter
// should track but didn't.
const STATUS_TRANSITIONS = [
  { name: 'active->complete', regex: /active\s*(?:->|→|=>)\s*complete/i, expected: ['complete', 'done'] },
  { name: 'draft->complete',  regex: /draft\s*(?:->|→|=>)\s*complete/i,  expected: ['complete', 'done'] },
  { name: 'draft->active',    regex: /draft\s*(?:->|→|=>)\s*active/i,    expected: ['active'] },
  // Explicit "Status: <state>" or "Status flipped to <state>" near a transition word.
  { name: 'status-complete',  regex: /status\s*(?::|flipped|changed)?\s*(?:to|->|→)?\s*complete\b/i, expected: ['complete', 'done'] },
  { name: 'tag-flipped-complete', regex: /tag\s+flipped\s+.*\bcomplete/i, expected: ['complete', 'done'] },
  { name: 'tag-flipped-active', regex: /tag\s+flipped\s+.*\bactive/i, expected: ['active'] },
];

function extractFrontmatterTags(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = match[1];
  const tagsMatch = fm.match(/^tags:\s*\[([^\]]+)\]/m);
  if (!tagsMatch) return [];
  return tagsMatch[1].split(',').map(t => t.trim().replace(/^['"]|['"]$/g, ''));
}

function getStatusTag(tags) {
  for (const tag of tags) {
    if (STATUS_TAGS.has(tag)) return tag;
  }
  return null;
}

function getChangelogEntries(content) {
  const idx = content.indexOf('## Changelog');
  if (idx === -1) return [];
  const after = content.slice(idx);
  const lines = after.split('\n');
  // Each changelog entry typically starts with `- YYYY-MM-DD`.
  const entries = [];
  for (const line of lines) {
    if (line.startsWith('- ')) entries.push(line);
  }
  return entries;
}

function detectVerbMatch(line) {
  for (const verb of STATUS_TRANSITIONS) {
    if (verb.regex.test(line)) return verb;
  }
  return null;
}

function detectDrifts() {
  const files = fs.readdirSync(PLANS_DIR)
    .filter(f => f.endsWith('.md') && !SKIP_FILES.has(f));

  const drifts = [];
  let scanned = 0;
  let noFrontmatter = 0;
  let noChangelog = 0;
  let noVerbMatch = 0;

  for (const file of files) {
    scanned++;
    const fullPath = path.join(PLANS_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');

    const tags = extractFrontmatterTags(content);
    if (tags === null) { noFrontmatter++; continue; }
    const statusTag = getStatusTag(tags);

    const entries = getChangelogEntries(content);
    if (entries.length === 0) { noChangelog++; continue; }

    // Check the LAST entry first (most recent in append-at-bottom convention).
    // If no match, scan all entries (some plans append at top).
    const last = entries[entries.length - 1];
    let verbMatch = detectVerbMatch(last);
    let matchedEntry = last;

    if (!verbMatch) {
      for (const entry of entries) {
        verbMatch = detectVerbMatch(entry);
        if (verbMatch) { matchedEntry = entry; break; }
      }
    }

    if (!verbMatch) { noVerbMatch++; continue; }

    if (!statusTag) {
      drifts.push({
        file,
        statusTag: '(none)',
        verbName: verbMatch.name,
        expected: verbMatch.expected,
        snippet: matchedEntry.slice(0, 140),
      });
    } else if (!verbMatch.expected.includes(statusTag)) {
      drifts.push({
        file,
        statusTag,
        verbName: verbMatch.name,
        expected: verbMatch.expected,
        snippet: matchedEntry.slice(0, 140),
      });
    }
  }

  return { drifts, scanned, noFrontmatter, noChangelog, noVerbMatch };
}

function main() {
  const wantJson = process.argv.includes('--json');
  const result = detectDrifts();

  if (wantJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('# Plan tag drift audit\n');
    console.log(`Generated: ${new Date().toISOString()}`);
    console.log(`Plans scanned: ${result.scanned}`);
    console.log(`No frontmatter: ${result.noFrontmatter}`);
    console.log(`No changelog: ${result.noChangelog}`);
    console.log(`No status-verb match: ${result.noVerbMatch}`);
    console.log(`Drifts found: ${result.drifts.length}`);
    console.log('');

    if (result.drifts.length === 0) {
      console.log('No plan-tag drift detected.');
    } else {
      console.log('## Drift details\n');
      for (const d of result.drifts) {
        console.log(`### ${d.file}`);
        console.log(`- Frontmatter tag: \`${d.statusTag}\``);
        console.log(`- Changelog verb: \`${d.verbName}\``);
        console.log(`- Expected tag: \`${d.expected.join('\`, \`')}\``);
        console.log(`- Snippet: ${d.snippet}...`);
        console.log('');
      }
    }
  }

  process.exit(result.drifts.length === 0 ? 0 : 1);
}

main();
