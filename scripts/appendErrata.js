#!/usr/bin/env node
/**
 * appendErrata.js — Auto Post-Edition Documentation (Phase 6.2)
 *
 * Parses Rhea Morgan's verification report and appends structured errata
 * entries to output/errata.jsonl. Run after Rhea's verification pass completes.
 *
 * Usage:
 *   node scripts/appendErrata.js --edition 85 --report output/rhea_report_c85.txt
 *   node scripts/appendErrata.js --edition 85 --report - < rhea_output.txt
 *   echo "RHEA REPORT TEXT" | node scripts/appendErrata.js --edition 85 --report -
 *
 * The script parses CRITICAL and WARNING entries from Rhea's structured output
 * and converts them to errata.jsonl entries.
 *
 * Can also accept entries via --manual for ad-hoc errata addition:
 *   node scripts/appendErrata.js --edition 85 --manual --desk civic --errorType vote_swap \
 *     --severity CRITICAL --description "..." --rootCause "..." --fix "..."
 */

const fs = require('fs');
const path = require('path');

const ERRATA_PATH = path.join(__dirname, '..', 'output', 'errata.jsonl');

function parseRheaReport(text) {
  const entries = [];
  const lines = text.split('\n');
  let edition = null;

  // Extract edition number from header
  const editionMatch = text.match(/Edition\s+(\d+)/i);
  if (editionMatch) edition = parseInt(editionMatch[1]);

  // Parse CRITICAL entries
  let inCritical = false;
  let inWarning = false;
  let currentEntry = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('CRITICAL')) {
      inCritical = true;
      inWarning = false;
      continue;
    }
    if (line.startsWith('WARNINGS') || line.startsWith('WARNING')) {
      inCritical = false;
      inWarning = true;
      continue;
    }
    if (line.startsWith('NOTES') || line.startsWith('CLAIM DECOMPOSITION') || line.startsWith('EDITION SCORE')) {
      inCritical = false;
      inWarning = false;
      continue;
    }

    // Match numbered entries: "1. [Article: "Headline"] — description"
    const entryMatch = line.match(/^\d+\.\s*\[(?:Article|Letters|Section):\s*"([^"]+)"\]\s*[—–-]\s*(.+)/);
    if (entryMatch && (inCritical || inWarning)) {
      currentEntry = {
        edition: edition,
        date: '',
        desk: inferDesk(entryMatch[1], entryMatch[2]),
        reporter: inferReporter(entryMatch[1]),
        errorType: inferErrorType(entryMatch[2]),
        severity: inCritical ? 'CRITICAL' : 'WARNING',
        description: entryMatch[2].trim(),
        rootCause: '',
        fix: '',
        adopted: false,
        citizenInvolved: null,
        recurrence: null
      };
      entries.push(currentEntry);
      continue;
    }

    // Match FIX lines: "   FIX: Replace X with Y"
    const fixMatch = line.match(/^\s*FIX:\s*(.+)/);
    if (fixMatch && currentEntry) {
      currentEntry.fix = fixMatch[1].trim();
      continue;
    }
  }

  return entries;
}

function inferDesk(headline, description) {
  const lower = (headline + ' ' + description).toLowerCase();
  if (lower.includes('council') || lower.includes('vote') || lower.includes('initiative') || lower.includes('mayor')) return 'civic';
  if (lower.includes('bulls') || lower.includes('chicago') || lower.includes('bridgeport')) return 'chicago';
  if (lower.includes('ticker') || lower.includes('business') || lower.includes('economic')) return 'business';
  if (lower.includes('letter') || lower.includes('citizen writes')) return 'letters';
  if (lower.includes('a\'s') || lower.includes('warriors') || lower.includes('roster') || lower.includes('batting')) return 'sports';
  if (lower.includes('culture') || lower.includes('faith') || lower.includes('neighborhood') || lower.includes('festival')) return 'culture';
  return 'unknown';
}

function inferReporter(headline) {
  // Could be enhanced to check against roster
  return headline || 'unknown';
}

function inferErrorType(description) {
  const lower = description.toLowerCase();
  if (lower.includes('vote') && (lower.includes('swap') || lower.includes('wrong') || lower.includes('incorrect'))) return 'vote_swap';
  if (lower.includes('vote') && lower.includes('fabricat')) return 'vote_fabrication';
  if (lower.includes('position') && (lower.includes('wrong') || lower.includes('should be'))) return 'position_error';
  if (lower.includes('fabricat') || lower.includes('invent')) return 'data_fabrication';
  if (lower.includes('real') && lower.includes('name')) return 'real_name_leak';
  if (lower.includes('engine') || lower.includes('cycle') || lower.includes('metric')) return 'engine_language';
  if (lower.includes('phantom') || lower.includes('doesn\'t exist')) return 'phantom_citizen';
  if (lower.includes('mayor')) return 'phantom_official';
  if (lower.includes('weather')) return 'data_fabrication';
  if (lower.includes('timeline') || lower.includes('date')) return 'timeline_error';
  if (lower.includes('stat') || lower.includes('innings') || lower.includes('record')) return 'stat_transposition';
  if (lower.includes('missing') || lower.includes('format')) return 'format_error';
  return 'other';
}

function appendEntries(entries) {
  if (entries.length === 0) {
    console.log('No errata entries to append.');
    return;
  }

  const lines = entries.map(e => JSON.stringify(e));
  fs.appendFileSync(ERRATA_PATH, '\n' + lines.join('\n'));
  console.log(`Appended ${entries.length} errata entries to ${ERRATA_PATH}`);
  for (const e of entries) {
    console.log(`  [E${e.edition}] ${e.severity}: ${e.errorType} — ${e.description.substring(0, 80)}`);
  }
}

// Parse CLI args
const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--edition' && args[i + 1]) opts.edition = parseInt(args[++i]);
  else if (args[i] === '--report' && args[i + 1]) opts.report = args[++i];
  else if (args[i] === '--manual') opts.manual = true;
  else if (args[i] === '--desk' && args[i + 1]) opts.desk = args[++i];
  else if (args[i] === '--errorType' && args[i + 1]) opts.errorType = args[++i];
  else if (args[i] === '--severity' && args[i + 1]) opts.severity = args[++i];
  else if (args[i] === '--description' && args[i + 1]) opts.description = args[++i];
  else if (args[i] === '--rootCause' && args[i + 1]) opts.rootCause = args[++i];
  else if (args[i] === '--fix' && args[i + 1]) opts.fix = args[++i];
  else if (args[i] === '--reporter' && args[i + 1]) opts.reporter = args[++i];
  else if (args[i] === '--citizen' && args[i + 1]) opts.citizen = args[++i];
  else if (args[i] === '--recurrence' && args[i + 1]) opts.recurrence = args[++i];
}

if (opts.manual) {
  // Manual single-entry mode
  if (!opts.edition || !opts.desk || !opts.description) {
    console.error('Manual mode requires: --edition, --desk, --description');
    process.exit(1);
  }
  const entry = {
    edition: opts.edition,
    date: new Date().toISOString().split('T')[0],
    desk: opts.desk,
    reporter: opts.reporter || 'unknown',
    errorType: opts.errorType || 'other',
    severity: opts.severity || 'WARNING',
    description: opts.description,
    rootCause: opts.rootCause || '',
    fix: opts.fix || '',
    adopted: false,
    citizenInvolved: opts.citizen || null,
    recurrence: opts.recurrence || null
  };
  appendEntries([entry]);
} else if (opts.report) {
  // Report parsing mode
  let reportText;
  if (opts.report === '-') {
    reportText = fs.readFileSync('/dev/stdin', 'utf8');
  } else {
    if (!fs.existsSync(opts.report)) {
      console.error('Report file not found:', opts.report);
      process.exit(1);
    }
    reportText = fs.readFileSync(opts.report, 'utf8');
  }
  const entries = parseRheaReport(reportText);
  if (opts.edition) {
    entries.forEach(e => e.edition = opts.edition);
  }
  appendEntries(entries);
} else {
  console.log('Usage:');
  console.log('  Parse Rhea report: node scripts/appendErrata.js --edition 85 --report output/rhea_report_c85.txt');
  console.log('  Manual entry:      node scripts/appendErrata.js --edition 85 --manual --desk civic --errorType vote_swap --severity CRITICAL --description "..."');
}
