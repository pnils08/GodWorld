#!/usr/bin/env node
/**
 * applyTrackerUpdates.js — Write initiative agent decisions back to Google Sheets
 *
 * Reads decisions_c{XX}.json from each initiative agent directory, extracts
 * trackerUpdates, and writes them to the Initiative_Tracker sheet. This closes
 * the feedback loop: agent decisions actually change the world.
 *
 * Usage:
 *   node scripts/applyTrackerUpdates.js [cycle]           # Dry run (default)
 *   node scripts/applyTrackerUpdates.js [cycle] --apply    # Write to sheet
 *
 * Reads from:
 *   output/city-civic-database/initiatives/{agent}/decisions_c{XX}.json
 *
 * Writes to:
 *   Initiative_Tracker sheet — columns: ImplementationPhase, MilestoneNotes,
 *   NextScheduledAction, NextActionCycle, LastUpdated
 *
 * Run AFTER: initiative agents produce decisions
 * Run BEFORE: next cycle's buildInitiativePackets.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');

const ROOT = path.resolve(__dirname, '..');
const DECISIONS_DIR = path.join(ROOT, 'output/city-civic-database/initiatives');
const SHEET_NAME = 'Initiative_Tracker';
const APPLY = process.argv.includes('--apply');

// Columns we write back — must exist on Initiative_Tracker
const WRITEBACK_FIELDS = [
  'ImplementationPhase',
  'MilestoneNotes',
  'NextScheduledAction',
  'NextActionCycle'
];

const CYCLE = parseInt(process.argv[2]) || (() => {
  try {
    const bc = JSON.parse(fs.readFileSync(path.join(ROOT, 'output/desk-packets/base_context.json'), 'utf-8'));
    return bc.cycle || 88;
  } catch { return 88; }
})();

function findDecisionFiles(cycle) {
  const files = [];
  if (!fs.existsSync(DECISIONS_DIR)) return files;

  const agents = fs.readdirSync(DECISIONS_DIR).filter(d =>
    fs.statSync(path.join(DECISIONS_DIR, d)).isDirectory()
  );

  for (const agent of agents) {
    const decFile = path.join(DECISIONS_DIR, agent, `decisions_c${cycle}.json`);
    if (fs.existsSync(decFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(decFile, 'utf-8'));
        if (data.trackerUpdates && Object.keys(data.trackerUpdates).length > 0) {
          files.push({
            agent,
            initiativeId: data.initiative || data.initiativeId,
            cycle: data.cycle,
            trackerUpdates: data.trackerUpdates,
            file: decFile
          });
        }
      } catch (e) {
        console.warn(`  WARNING: Could not parse ${decFile}: ${e.message}`);
      }
    }
  }
  return files;
}

async function main() {
  console.log(`\n=== applyTrackerUpdates.js — Cycle ${CYCLE} ${APPLY ? '(LIVE WRITE)' : '(DRY RUN)'} ===\n`);

  // Find all decision files with tracker updates
  const decisions = findDecisionFiles(CYCLE);

  if (decisions.length === 0) {
    // Try previous cycle if current has none
    const prevDecisions = findDecisionFiles(CYCLE - 1);
    if (prevDecisions.length > 0) {
      console.log(`No decisions for C${CYCLE}. Found ${prevDecisions.length} from C${CYCLE - 1}.`);
      decisions.push(...prevDecisions);
    } else {
      console.log('No decision files with trackerUpdates found.');
      process.exit(0);
    }
  }

  console.log(`Found ${decisions.length} initiative decisions with tracker updates:\n`);

  // Read current tracker state from sheet
  let trackerRows;
  try {
    trackerRows = await sheets.getSheetAsObjects(SHEET_NAME);
  } catch (e) {
    console.error(`ERROR: Could not read ${SHEET_NAME}: ${e.message}`);
    process.exit(1);
  }

  console.log(`Initiative_Tracker: ${trackerRows.length} rows\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const dec of decisions) {
    console.log(`--- ${dec.agent} (${dec.initiativeId}) ---`);
    console.log(`  File: ${path.basename(dec.file)}`);

    // Find matching row by InitiativeID
    const rowIndex = trackerRows.findIndex(r =>
      r.InitiativeID === dec.initiativeId ||
      r.ID === dec.initiativeId ||
      r.id === dec.initiativeId
    );

    if (rowIndex === -1) {
      console.log(`  SKIP: No matching row for ${dec.initiativeId} in ${SHEET_NAME}`);
      skippedCount++;
      continue;
    }

    // Row number on the sheet (1-indexed, +2 for header row and 0-index offset)
    const sheetRow = rowIndex + 2;
    const currentRow = trackerRows[rowIndex];

    // Build the update fields — only write fields that exist in WRITEBACK_FIELDS
    const updates = {};
    for (const field of WRITEBACK_FIELDS) {
      if (dec.trackerUpdates[field] !== undefined) {
        const newVal = String(dec.trackerUpdates[field]);
        const oldVal = currentRow[field] || '';
        if (newVal !== oldVal) {
          updates[field] = newVal;
          console.log(`  ${field}: "${oldVal}" → "${newVal}"`);
        }
      }
    }

    // Always update LastUpdated
    const today = new Date().toLocaleDateString('en-US');
    if (Object.keys(updates).length > 0) {
      updates['LastUpdated'] = today;
    }

    if (Object.keys(updates).length === 0) {
      console.log('  No changes needed (already current)');
      skippedCount++;
      continue;
    }

    if (APPLY) {
      try {
        await sheets.updateRowFields(SHEET_NAME, sheetRow, updates);
        console.log(`  WRITTEN to row ${sheetRow} (${Object.keys(updates).length} fields)`);
        updatedCount++;
      } catch (e) {
        console.error(`  ERROR writing row ${sheetRow}: ${e.message}`);
      }
    } else {
      console.log(`  WOULD WRITE to row ${sheetRow} (${Object.keys(updates).length} fields)`);
      updatedCount++;
    }
    console.log('');
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updatedCount} | Skipped: ${skippedCount} | Total: ${decisions.length}`);
  if (!APPLY && updatedCount > 0) {
    console.log(`\nDry run — use --apply to write to ${SHEET_NAME}`);
  }
  console.log('');
}

main().catch(e => { console.error(e); process.exit(1); });
