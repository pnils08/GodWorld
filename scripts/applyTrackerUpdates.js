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

require('/root/GodWorld/lib/env');
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

const getCurrentCycle = require('../lib/getCurrentCycle');
const CYCLE = getCurrentCycle();

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

  // ═══════════════════════════════════════════════════════════════════════════
  // CIVIC VOICE SENTIMENT — aggregate from all decisions (S137b)
  // ═══════════════════════════════════════════════════════════════════════════
  // Score each decision's ImplementationPhase for sentiment.
  // Positive phases (disbursement-active, dispatch-live) = city is working.
  // Negative phases (stalled, blocked) = city is failing.
  // Write to file for engine Phase 2 to read.

  const PHASE_SENTIMENT = {
    'disbursement-active': 0.8, 'dispatch-live': 0.8, 'operational': 0.7,
    'construction-active': 0.6, 'implementation-active': 0.6, 'pilot-active': 0.5,
    'pilot_evaluation': 0.5, 'complete': 0.5, 'design-phase': 0.2,
    'visioning-complete': 0.1, 'legislation-filed': 0.1, 'vote-ready': 0.3,
    'vote-scheduled': 0, 'announced': 0, 'visioning': 0,
    'stalled': -0.6, 'blocked': -0.8, 'suspended': -0.7, 'defunded': -1.0
  };

  let sentimentSum = 0;
  let sentimentCount = 0;

  for (const dec of decisions) {
    // Use trackerUpdate phase if present; else fall back to current tracker state.
    // A decision that reaffirms the current phase (no flip) is still a civic signal.
    let phase = (dec.trackerUpdates.ImplementationPhase || '').toLowerCase();
    if (!phase) {
      const currentRow = trackerRows.find(r =>
        r.InitiativeID === dec.initiativeId ||
        r.ID === dec.initiativeId ||
        r.id === dec.initiativeId
      );
      if (currentRow) phase = (currentRow.ImplementationPhase || '').toLowerCase();
    }
    if (!phase) continue;

    let score = PHASE_SENTIMENT[phase];
    if (score === undefined) {
      // Partial match
      for (const pk of Object.keys(PHASE_SENTIMENT)) {
        if (phase.indexOf(pk) >= 0) { score = PHASE_SENTIMENT[pk]; break; }
      }
    }
    if (score !== undefined) {
      sentimentSum += score;
      sentimentCount++;
    }
  }

  const civicSentiment = sentimentCount > 0 ? sentimentSum / sentimentCount : 0;
  const sentimentFile = path.join(ROOT, 'output', `civic_sentiment_c${CYCLE}.json`);

  const sentimentData = {
    cycle: CYCLE,
    civicVoiceSentiment: parseFloat(civicSentiment.toFixed(3)),
    decisionsScored: sentimentCount,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(sentimentFile, JSON.stringify(sentimentData, null, 2));
  console.log(`\nCivic Voice Sentiment: ${civicSentiment.toFixed(3)} (from ${sentimentCount} decisions)`);
  console.log(`Written to: ${path.basename(sentimentFile)}`);

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updatedCount} | Skipped: ${skippedCount} | Total: ${decisions.length}`);
  if (!APPLY && updatedCount > 0) {
    console.log(`\nDry run — use --apply to write to ${SHEET_NAME}`);
  }
  console.log('');
}

main().catch(e => { console.error(e); process.exit(1); });
