#!/usr/bin/env node
/**
 * cleanupStorylineTracker.js — Deduplicate, fix statuses, add missing arcs
 *
 * The Storyline_Tracker has 215 rows with duplicates, wrong statuses, and
 * missing arcs. This script:
 *   1. Reads all rows
 *   2. Deduplicates (same description + cycle = duplicate)
 *   3. Fixes statuses (dormant → active for known active arcs)
 *   4. Adds missing arcs from E85-E88
 *   5. Writes back a clean version
 *
 * Usage:
 *   node scripts/cleanupStorylineTracker.js              # Dry run
 *   node scripts/cleanupStorylineTracker.js --apply       # Write to sheet
 *
 * IMPORTANT: This clears the sheet and rewrites all rows. Backup first.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');

const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const SHEET_NAME = 'Storyline_Tracker';

// ─── ARCS THAT ARE DEFINITELY ACTIVE (from E85-E88 audit) ───

const ACTIVE_KEYWORDS = [
  'stabilization fund',
  'oari',
  'alternative response',
  'baylight',
  'health center',
  'transit hub',
  'fruitvale transit',
  'keane farewell',
  'farewell season',
  'dynasty farewell',
  'aitken',
  'richards contract',
  'seymour',
  'paulson',
  'giddey',
  'trepagnier',
  'bulls playoff',
  'bulls second round',
  'faith institution',
  'faith communit',
  'jack london',
  'nightlife',
  'first friday',
  'tech ecosystem',
  'tech landscape',
  'oakmesh',
  'gridiron analytics',
  'education',
  'crane absent',
  'crane recover',
  'osei',
  'vega',
  'tran',
  'ashford',
  'workforce agreement',
  'local hiring',
  'romano',
  'bridgeport',
  'expansion',
  'mara vance',
  'calvin turner',
  'beverly hayes',
  'gloria meeks'
];

// Arcs that are truly resolved
const RESOLVED_KEYWORDS = [
  'walkout',
  'apology issued',
  'father\'s day',
  'committee hearing (passed)',
  'floor vote (passed)',
  'transformer hiccup',
  'crisis kitchen.*resolved',
  'paulson.*apology.*delivered'
];

// ─── MISSING ARCS TO ADD ────────────────────────────────────

const MISSING_ARCS = [
  {
    Timestamp: new Date().toISOString(),
    CycleAdded: 85,
    StorylineType: 'arc',
    Description: 'Mara Vance formal document campaign — four written requests to three offices in one month, creating paper trail of civic accountability',
    Neighborhood: 'city-wide',
    RelatedCitizens: 'Mara Vance',
    Priority: 'high',
    Status: 'active'
  },
  {
    Timestamp: new Date().toISOString(),
    CycleAdded: 87,
    StorylineType: 'arc',
    Description: 'Deputy Mayor Marcus Osei hospitalized — Laila Cortez covering full economic development portfolio including Baylight and Transit Hub contacts',
    Neighborhood: 'Downtown',
    RelatedCitizens: 'Marcus Osei, Laila Cortez',
    Priority: 'high',
    Status: 'active'
  },
  {
    Timestamp: new Date().toISOString(),
    CycleAdded: 87,
    StorylineType: 'developing',
    Description: 'NBA expansion — Oakland in final consideration group, Baylight flexible-use arena site, unnamed tech exec in ownership consortium',
    Neighborhood: 'Jack London, Waterfront',
    RelatedCitizens: 'Mike Paulson, Hal Richmond',
    Priority: 'high',
    Status: 'active'
  },
  {
    Timestamp: new Date().toISOString(),
    CycleAdded: 87,
    StorylineType: 'arc',
    Description: 'Baylight workforce agreement local hiring gap — "local" defined as Alameda County not Oakland, subcontractor chain bleeds hours to Livermore/San Leandro, West Oakland electricians denied',
    Neighborhood: 'Jack London, West Oakland',
    RelatedCitizens: 'Kevin Kim, Javier Harris, Mateo Walker, Aaliyah Baker, Jax Caldera',
    Priority: 'high',
    Status: 'active'
  },
  {
    Timestamp: new Date().toISOString(),
    CycleAdded: 85,
    StorylineType: 'thread',
    Description: 'Jack London nightlife/commercial surge — evening corridor at busiest clip, question is whether this is summer weather or permanent climate shift',
    Neighborhood: 'Jack London, Uptown',
    RelatedCitizens: 'Jalen Hill, Elena Lewis, Owen Campbell, Jordan Cook',
    Priority: 'normal',
    Status: 'active'
  },
  {
    Timestamp: new Date().toISOString(),
    CycleAdded: 85,
    StorylineType: 'thread',
    Description: 'Romano\'s on 35th / Bridgeport community — Paulette and Raymond process Paulson news over dinner, phone position as emotional barometer',
    Neighborhood: 'Bridgeport, Chicago',
    RelatedCitizens: 'Paulette Okafor, Raymond Polk',
    Priority: 'normal',
    Status: 'active'
  },
  {
    Timestamp: new Date().toISOString(),
    CycleAdded: 85,
    StorylineType: 'thread',
    Description: 'First Friday / Oakland arts scene — construction barriers reshaping corridor, artists documenting change',
    Neighborhood: 'Jack London, KONO, Uptown',
    RelatedCitizens: 'Dante Reyes, Kai Marston, Marin Tao, Rico Valez',
    Priority: 'normal',
    Status: 'active'
  },
  {
    Timestamp: new Date().toISOString(),
    CycleAdded: 86,
    StorylineType: 'thread',
    Description: 'Oakland housing market — active, desirable, aspiration-driven, low turnover in Rockridge, artists in Temescal, 42% appreciation since 2035 in tech corridors',
    Neighborhood: 'Rockridge, Temescal, Jack London, Fruitvale',
    RelatedCitizens: 'Patrice Lemon, Desiree Achebe, Priya Sandoval',
    Priority: 'normal',
    Status: 'active'
  }
];

// ─── MAIN ────────────────────────────────────────────────

async function main() {
  console.log(`\n=== cleanupStorylineTracker.js ${APPLY ? '(LIVE WRITE)' : '(DRY RUN)'} ===\n`);

  // Read all rows
  let rows;
  try {
    rows = await sheets.getSheetAsObjects(SHEET_NAME);
  } catch (e) {
    console.error(`ERROR reading ${SHEET_NAME}: ${e.message}`);
    process.exit(1);
  }

  console.log(`Current rows: ${rows.length}`);

  // Step 1: Deduplicate — same Description + CycleAdded = duplicate
  const seen = new Map();
  const deduped = [];
  let dupeCount = 0;

  for (const row of rows) {
    const key = `${(row.Description || '').slice(0, 60).toLowerCase()}|${row.CycleAdded || ''}`;
    if (seen.has(key)) {
      dupeCount++;
      // Keep the one with better status
      const existing = seen.get(key);
      const existingStatus = (existing.Status || '').toLowerCase();
      const newStatus = (row.Status || '').toLowerCase();
      if (newStatus === 'active' && existingStatus !== 'active') {
        // Replace with the active version
        const idx = deduped.indexOf(existing);
        if (idx !== -1) deduped[idx] = row;
        seen.set(key, row);
      }
    } else {
      seen.set(key, row);
      deduped.push(row);
    }
  }

  console.log(`Duplicates removed: ${dupeCount}`);
  console.log(`After dedup: ${deduped.length}`);

  // Step 2: Fix statuses
  let statusFixes = 0;
  let resolvedFixes = 0;

  for (const row of deduped) {
    const desc = (row.Description || '').toLowerCase();
    const currentStatus = (row.Status || '').toLowerCase();

    // Check if this should be active
    if (currentStatus === 'dormant' || currentStatus === '') {
      const shouldBeActive = ACTIVE_KEYWORDS.some(kw => desc.includes(kw.toLowerCase()));
      if (shouldBeActive) {
        row.Status = 'active';
        statusFixes++;
      }
    }

    // Check if this should be resolved
    if (currentStatus !== 'resolved') {
      const shouldBeResolved = RESOLVED_KEYWORDS.some(kw => {
        try { return new RegExp(kw, 'i').test(desc); } catch { return desc.includes(kw.toLowerCase()); }
      });
      if (shouldBeResolved) {
        row.Status = 'resolved';
        resolvedFixes++;
      }
    }
  }

  console.log(`Status fixes (dormant → active): ${statusFixes}`);
  console.log(`Status fixes (→ resolved): ${resolvedFixes}`);

  // Step 3: Add missing arcs
  for (const arc of MISSING_ARCS) {
    // Check if already exists
    const descLower = arc.Description.slice(0, 40).toLowerCase();
    const exists = deduped.some(r => (r.Description || '').toLowerCase().includes(descLower));
    if (!exists) {
      deduped.push(arc);
      console.log(`  ADDED: ${arc.Description.slice(0, 70)}...`);
    } else {
      console.log(`  SKIP (exists): ${arc.Description.slice(0, 50)}...`);
    }
  }

  console.log(`\nFinal row count: ${deduped.length}`);

  // Count statuses
  const statusCounts = {};
  for (const row of deduped) {
    const s = (row.Status || 'unknown').toLowerCase();
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }
  console.log('Status distribution:', JSON.stringify(statusCounts));

  // Show what agents will see (active/new/developing/urgent/high)
  const visible = deduped.filter(r => {
    const s = (r.Status || '').toLowerCase();
    return s === 'active' || s === 'new' || s === 'developing' || s === 'urgent' || s === 'high';
  });
  console.log(`\nVisible to desk agents: ${visible.length} storylines`);

  if (!APPLY) {
    console.log('\nDry run — use --apply to rewrite the sheet.');
    console.log('\nSample visible arcs:');
    for (const r of visible.slice(0, 10)) {
      console.log(`  [${(r.Status || '?').padEnd(10)}] ${(r.Description || '').slice(0, 80)}`);
    }
    process.exit(0);
  }

  // Step 4: Write changes to sheet
  // Can't clear+rewrite (no clearSheet function), so:
  //   a) Update status on existing rows that changed
  //   b) Append missing arcs as new rows
  console.log('\nWriting to sheet...');

  // 4a: Update statuses on existing rows
  let updateCount = 0;
  for (let i = 0; i < rows.length; i++) {
    const original = rows[i];
    const desc = (original.Description || '').toLowerCase();
    const originalStatus = (original.Status || '').toLowerCase();

    // Check if status should change
    let newStatus = null;
    const shouldBeActive = ACTIVE_KEYWORDS.some(kw => desc.includes(kw.toLowerCase()));
    const shouldBeResolved = RESOLVED_KEYWORDS.some(kw => {
      try { return new RegExp(kw, 'i').test(desc); } catch { return desc.includes(kw.toLowerCase()); }
    });

    if (shouldBeResolved && originalStatus !== 'resolved') {
      newStatus = 'resolved';
    } else if (shouldBeActive && (originalStatus === 'dormant' || originalStatus === '')) {
      newStatus = 'active';
    }

    if (newStatus) {
      const sheetRow = i + 2; // 1-indexed + header
      try {
        await sheets.updateRowFields(SHEET_NAME, sheetRow, { Status: newStatus });
        updateCount++;
      } catch (e) {
        console.error(`  ERROR updating row ${sheetRow}: ${e.message}`);
      }
    }
  }
  console.log(`  Status updates: ${updateCount} rows`);

  // 4b: Append missing arcs
  const COLUMNS = ['Timestamp', 'CycleAdded', 'StorylineType', 'Description', 'Neighborhood', 'RelatedCitizens', 'Priority', 'Status'];
  const missingRows = [];

  for (const arc of MISSING_ARCS) {
    const descLower = arc.Description.slice(0, 40).toLowerCase();
    const exists = rows.some(r => (r.Description || '').toLowerCase().includes(descLower));
    if (!exists) {
      missingRows.push(COLUMNS.map(col => arc[col] || ''));
    }
  }

  if (missingRows.length > 0) {
    try {
      await sheets.appendRows(SHEET_NAME, missingRows);
      console.log(`  New arcs appended: ${missingRows.length}`);
    } catch (e) {
      console.error(`  ERROR appending: ${e.message}`);
    }
  } else {
    console.log('  No new arcs to append');
  }

  console.log('\n=== Done ===\n');
}

main().catch(e => { console.error(e); process.exit(1); });
