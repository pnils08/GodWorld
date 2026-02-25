#!/usr/bin/env node
/**
 * queryErrata.js — Pre-Write Agent Guardian (Phase 6.3)
 *
 * Queries output/errata.jsonl for desk-relevant warnings before agents write.
 * Used by the write-edition pipeline to auto-inject errata into briefings,
 * and by standalone runs to check known pitfalls.
 *
 * Usage:
 *   node scripts/queryErrata.js --desk civic
 *   node scripts/queryErrata.js --desk sports --severity CRITICAL
 *   node scripts/queryErrata.js --desk chicago --editions 3
 *   node scripts/queryErrata.js --errorType vote_swap
 *   node scripts/queryErrata.js --recurring
 *   node scripts/queryErrata.js --citizen "Dante Nelson"
 *   node scripts/queryErrata.js --all
 *
 * Output: Formatted guardian warnings suitable for injection into agent prompts.
 */

const fs = require('fs');
const path = require('path');

const ERRATA_PATH = path.join(__dirname, '..', 'output', 'errata.jsonl');

function loadErrata() {
  if (!fs.existsSync(ERRATA_PATH)) {
    console.error('No errata file found at', ERRATA_PATH);
    process.exit(1);
  }
  const lines = fs.readFileSync(ERRATA_PATH, 'utf8').trim().split('\n');
  return lines.map(line => {
    try { return JSON.parse(line); }
    catch (e) { return null; }
  }).filter(Boolean);
}

function filterErrata(entries, opts) {
  let filtered = entries;

  if (opts.desk && opts.desk !== 'all') {
    filtered = filtered.filter(e =>
      e.desk === opts.desk || e.desk === 'cross-desk' || e.desk === 'pipeline'
    );
  }

  if (opts.severity) {
    filtered = filtered.filter(e => e.severity === opts.severity);
  }

  if (opts.editions) {
    const maxEditions = parseInt(opts.editions);
    if (filtered.length > 0) {
      const latestEdition = Math.max(...entries.map(e => e.edition));
      const cutoff = latestEdition - maxEditions + 1;
      filtered = filtered.filter(e => e.edition >= cutoff);
    }
  }

  if (opts.errorType) {
    filtered = filtered.filter(e => e.errorType === opts.errorType);
  }

  if (opts.recurring) {
    filtered = filtered.filter(e => e.recurrence);
  }

  if (opts.citizen) {
    const search = opts.citizen.toLowerCase();
    filtered = filtered.filter(e =>
      (e.citizenInvolved && e.citizenInvolved.toLowerCase().includes(search)) ||
      e.description.toLowerCase().includes(search)
    );
  }

  return filtered;
}

function formatGuardianWarnings(entries, desk) {
  if (entries.length === 0) {
    return `GUARDIAN CHECK: No errata warnings for ${desk || 'this query'}. Proceed normally.`;
  }

  const lines = [];
  lines.push(`GUARDIAN CHECK — ${entries.length} errata warning(s) for ${desk || 'query'}:`);
  lines.push('');

  // Group by error pattern (recurring first)
  const recurring = entries.filter(e => e.recurrence);
  const single = entries.filter(e => !e.recurrence);

  if (recurring.length > 0) {
    lines.push('RECURRING PATTERNS (highest priority):');
    for (const e of recurring) {
      lines.push(`  [E${e.edition}] ${e.severity}: ${e.errorType} — ${e.description.substring(0, 120)}`);
      lines.push(`    Pattern: ${e.recurrence}`);
      lines.push(`    Fix: ${e.fix.substring(0, 120)}`);
    }
    lines.push('');
  }

  // Group single errors by type
  const byType = {};
  for (const e of single) {
    if (!byType[e.errorType]) byType[e.errorType] = [];
    byType[e.errorType].push(e);
  }

  for (const [type, errs] of Object.entries(byType)) {
    const criticals = errs.filter(e => e.severity === 'CRITICAL');
    const warnings = errs.filter(e => e.severity === 'WARNING');

    if (criticals.length > 0) {
      lines.push(`${type.toUpperCase()} (${criticals.length} CRITICAL):`);
      for (const e of criticals.slice(0, 3)) {
        lines.push(`  [E${e.edition}] ${e.reporter}: ${e.description.substring(0, 120)}`);
        if (e.citizenInvolved) lines.push(`    Citizens: ${e.citizenInvolved}`);
        lines.push(`    Fix: ${e.fix.substring(0, 100)}`);
      }
      if (criticals.length > 3) lines.push(`  ... and ${criticals.length - 3} more`);
    }

    if (warnings.length > 0) {
      lines.push(`${type.toUpperCase()} (${warnings.length} WARNING):`);
      for (const e of warnings.slice(0, 2)) {
        lines.push(`  [E${e.edition}] ${e.reporter}: ${e.description.substring(0, 120)}`);
      }
    }
    lines.push('');
  }

  // Summary stats
  const critCount = entries.filter(e => e.severity === 'CRITICAL').length;
  const warnCount = entries.filter(e => e.severity === 'WARNING').length;
  lines.push(`TOTAL: ${critCount} CRITICAL, ${warnCount} WARNING across E${Math.min(...entries.map(e => e.edition))}-E${Math.max(...entries.map(e => e.edition))}`);

  return lines.join('\n');
}

// Parse CLI args
const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--desk' && args[i + 1]) opts.desk = args[++i];
  else if (args[i] === '--severity' && args[i + 1]) opts.severity = args[++i];
  else if (args[i] === '--editions' && args[i + 1]) opts.editions = args[++i];
  else if (args[i] === '--errorType' && args[i + 1]) opts.errorType = args[++i];
  else if (args[i] === '--citizen' && args[i + 1]) opts.citizen = args[++i];
  else if (args[i] === '--recurring') opts.recurring = true;
  else if (args[i] === '--all') opts.desk = 'all';
  else if (args[i] === '--json') opts.json = true;
}

if (Object.keys(opts).length === 0) {
  console.log('Usage: node scripts/queryErrata.js --desk <name> [--severity CRITICAL] [--editions 3] [--errorType vote_swap] [--recurring] [--citizen "Name"] [--all] [--json]');
  process.exit(0);
}

const entries = loadErrata();
const filtered = filterErrata(entries, opts);

if (opts.json) {
  console.log(JSON.stringify(filtered, null, 2));
} else {
  console.log(formatGuardianWarnings(filtered, opts.desk));
}
