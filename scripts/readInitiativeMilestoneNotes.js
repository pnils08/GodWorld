#!/usr/bin/env node
/**
 * readInitiativeMilestoneNotes.js — Initiative_Tracker milestone-history reader
 * [engine/sheet] — closes civic.7 Phase 3 (S216)
 *
 * Reads a single Initiative_Tracker row + parses the MilestoneNotes / NextScheduledAction /
 * MayoralAction columns. Highlights C{XX} entries so prep-time investigators can disambiguate
 * "phase advanced this cycle" from "commitment slipped" without writing one-off node -e scripts.
 *
 * Wired into city-hall-prep Step 1: when an initiative shows mitigator-stuck or
 * remedy-not-firing in engine review, run this script to surface the highlighted C{XX}
 * history before assuming the engine signal is correct.
 *
 * Usage:
 *   node scripts/readInitiativeMilestoneNotes.js INIT-005
 *   node scripts/readInitiativeMilestoneNotes.js INIT-005 93   # highlight C93 entries
 *
 * Output: ImplementationPhase + MilestoneNotes (with cycle-tagged entries pulled out) +
 * NextScheduledAction / NextActionCycle + MayoralAction / MayoralActionCycle.
 *
 * Read-only — never writes the sheet.
 */

require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');

const SHEET_NAME = 'Initiative_Tracker';

function splitCycleTaggedEntries(notes) {
  if (!notes) return [];
  // Split on "C{NN}:" boundaries while keeping the marker.
  // MilestoneNotes is conventionally a single string with "C90: …" "C91: …" entries
  // concatenated. Some entries don't lead with C{NN} (legacy rows); preserve those as a
  // single uncategorized chunk.
  const parts = notes.split(/(?=\bC\d{2,3}:\s)/);
  return parts.map(s => s.trim()).filter(Boolean);
}

function colorize(s, code) {
  if (!process.stdout.isTTY) return s;
  return `\x1b[${code}m${s}\x1b[0m`;
}

const bold = s => colorize(s, '1');
const yellow = s => colorize(s, '33');
const green = s => colorize(s, '32');
const dim = s => colorize(s, '2');

async function main() {
  const initiativeId = process.argv[2];
  const highlightCycle = process.argv[3];

  if (!initiativeId) {
    console.error('Usage: node scripts/readInitiativeMilestoneNotes.js <INIT-XXX> [cycle]');
    process.exit(1);
  }

  const data = await sheets.getSheetData(SHEET_NAME);
  const headers = data[0];
  const colIdx = Object.fromEntries(headers.map((h, i) => [h, i]));

  const row = data.slice(1).find(r => r[colIdx.InitiativeID] === initiativeId);
  if (!row) {
    console.error(`${initiativeId} not found in ${SHEET_NAME}`);
    process.exit(1);
  }

  const get = name => row[colIdx[name]] || '';

  console.log(bold(`${get('InitiativeID')} — ${get('Name')}`));
  console.log(dim(`Status: ${get('Status')} | Domain: ${get('PolicyDomain')} | Neighborhoods: ${get('AffectedNeighborhoods')}`));
  console.log(dim(`LastUpdated: ${get('LastUpdated')}`));
  console.log();

  console.log(`${bold('ImplementationPhase')}: ${get('ImplementationPhase') || dim('(empty)')}`);
  console.log();

  console.log(bold('MilestoneNotes:'));
  const entries = splitCycleTaggedEntries(get('MilestoneNotes'));
  if (entries.length === 0) {
    console.log(dim('  (empty)'));
  } else {
    entries.forEach(entry => {
      const cycleMatch = entry.match(/^C(\d{2,3}):/);
      const tag = cycleMatch ? `C${cycleMatch[1]}` : null;
      const isHighlight = highlightCycle && tag === `C${highlightCycle}`;
      const prefix = isHighlight ? green('  ★ ') : '  ';
      const tagLabel = tag ? (isHighlight ? green(bold(tag)) : yellow(tag)) : dim('(no cycle tag)');
      const body = entry.replace(/^C\d{2,3}:\s*/, '');
      console.log(`${prefix}${tagLabel}: ${body}`);
    });
    if (highlightCycle) {
      const has = entries.some(e => e.match(new RegExp(`^C${highlightCycle}:`)));
      if (!has) {
        console.log(dim(`  [No C${highlightCycle} entry found — investigate per civic.7 plan: scenario A (commitment slipped) or scenario B (writeback bug)]`));
      }
    }
  }
  console.log();

  console.log(`${bold('NextScheduledAction')}: ${get('NextScheduledAction') || dim('(empty)')}`);
  console.log(`${bold('NextActionCycle')}: ${get('NextActionCycle') || dim('(empty)')}`);
  console.log();

  console.log(`${bold('MayoralAction')}: ${get('MayoralAction') || dim('(none)')}`);
  console.log(`${bold('MayoralActionCycle')}: ${get('MayoralActionCycle') || dim('(empty)')}`);
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
