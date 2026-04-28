#!/usr/bin/env node
/**
 * syncEconomicParameters.js — keep the Apps Script ECONOMIC_PARAMETERS constant
 * in sync with data/economic_parameters.json (the canonical source).
 *
 * Plan: docs/plans/2026-04-28-intake-side-citizen-derivation.md §Task 4.3
 *
 * Apps Script can't require() JSON, so the citizenDerivation.js library has the
 * 198-entry profile pool embedded as a JS array literal. This script regenerates
 * that block whenever data/economic_parameters.json changes. Run before clasp
 * push if the JSON has been modified.
 *
 * Usage:
 *   node scripts/syncEconomicParameters.js              # write
 *   node scripts/syncEconomicParameters.js --check      # exit 1 if out of sync
 */

const fs = require('fs');
const path = require('path');

const SRC_JSON = path.resolve(__dirname, '..', 'data', 'economic_parameters.json');
const DST_GS = path.resolve(__dirname, '..', 'utilities', 'citizenDerivation.js');

const START_MARKER = '// ═══ ECONOMIC_PARAMETERS_START ═══ DO NOT EDIT MANUALLY ═══';
const END_MARKER = '// ═══ ECONOMIC_PARAMETERS_END ═══';

function buildBlock(parameters) {
  // One entry per line, two-space indent inside the array, sorted by category
  // for stable diffs (entries within a category preserve JSON order).
  const lines = [];
  lines.push(START_MARKER);
  lines.push('// Re-generate via: node scripts/syncEconomicParameters.js');
  lines.push('// Source: data/economic_parameters.json (' + parameters.length + ' entries)');
  lines.push('var ECONOMIC_PARAMETERS = [');
  for (let i = 0; i < parameters.length; i++) {
    const p = parameters[i];
    const trailing = i < parameters.length - 1 ? ',' : '';
    lines.push('  ' + JSON.stringify(p) + trailing);
  }
  lines.push('];');
  lines.push(END_MARKER);
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');

  const parameters = JSON.parse(fs.readFileSync(SRC_JSON, 'utf-8'));
  const newBlock = buildBlock(parameters);

  const existing = fs.readFileSync(DST_GS, 'utf-8');
  const startIdx = existing.indexOf(START_MARKER);
  const endIdx = existing.indexOf(END_MARKER);

  if (startIdx < 0 || endIdx < 0) {
    console.error('ERROR: marker block not found in ' + DST_GS);
    console.error('  Expected START: ' + START_MARKER);
    console.error('  Expected END:   ' + END_MARKER);
    process.exit(1);
  }

  const before = existing.slice(0, startIdx);
  const after = existing.slice(endIdx + END_MARKER.length);
  const replaced = before + newBlock + after;

  if (replaced === existing) {
    console.log('ECONOMIC_PARAMETERS already in sync (' + parameters.length + ' entries).');
    return;
  }

  if (checkOnly) {
    console.error('OUT OF SYNC: utilities/citizenDerivation.js ECONOMIC_PARAMETERS block does not match data/economic_parameters.json.');
    console.error('Run: node scripts/syncEconomicParameters.js');
    process.exit(1);
  }

  fs.writeFileSync(DST_GS, replaced);
  console.log('Wrote ECONOMIC_PARAMETERS block: ' + parameters.length + ' entries.');
  console.log('  Source: ' + SRC_JSON);
  console.log('  Target: ' + DST_GS);
}

main();
