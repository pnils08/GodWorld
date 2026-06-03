#!/usr/bin/env node
/**
 * scripts/dumpLedger.js — Simulation_Ledger → local-disk snapshot (JSONL).
 *
 * S252 (engine-sheet). The 5th shelf for search_everything (the federated MCP
 * tool, scripts/godworld-mcp.py): the live Simulation_Ledger is a Google Sheet
 * behind the service account, which the Python MCP can't reach. This script
 * dumps the full ledger to disk where the MCP's disk-grep shelf already looks,
 * so `search_everything("vinnie keane")` returns a citizen's CURRENT ledger row
 * — no Python sheets connector, no runtime seam.
 *
 * Mimics queryLedger.js exactly: same env load, same lib/sheets client, same
 * getSheetAsObjects('Simulation_Ledger') read.
 *
 * Format = JSONL, one citizen object per line. Two design choices that make the
 * grep shelf work:
 *   1. Synthesized `Name` field (`${First} ${Last}`) injected at the front of
 *      each row — getSheetAsObjects splits the name across First/Last columns,
 *      so a full-name grep ("Vinnie Keane") would otherwise miss. With `Name`,
 *      the whole row matches on one line.
 *   2. STABLE filename (overwrite each cycle, never accumulate). Only ONE
 *      snapshot ever exists on disk = the current one, so grep can't surface a
 *      stale prior-cycle row. This is how the snapshot dodges the staleness
 *      hazard that an index would have introduced.
 *
 * Refresh trigger: runs each cycle from /city-hall-prep (Step 1.5), post-engine,
 * when the ledger is freshest. Disk then beats the Supermemory card on freshness.
 *
 * Usage:
 *   node scripts/dumpLedger.js [cycle] [--quiet]
 *
 * Outputs:
 *   output/simulation_ledger_snapshot.jsonl       — one citizen per line
 *   output/simulation_ledger_snapshot.meta.json   — cycle, timestamp, row count
 */

'use strict';

require('/root/GodWorld/lib/env');  // GODWORLD_SHEET_ID + GOOGLE_APPLICATION_CREDENTIALS
const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');

const ROOT = path.resolve(__dirname, '..');
const OUT_JSONL = path.join(ROOT, 'output', 'simulation_ledger_snapshot.jsonl');
const OUT_META = path.join(ROOT, 'output', 'simulation_ledger_snapshot.meta.json');

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const cycleArg = args.find(a => !a.startsWith('--')) || null;

function log(...m) { if (!quiet) console.error(...m); }

async function main() {
  log('dumpLedger: reading Simulation_Ledger…');
  const rows = await sheets.getSheetAsObjects('Simulation_Ledger');
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error('dumpLedger: ABORT — Simulation_Ledger returned no rows. Refusing to overwrite snapshot with empty data.');
    process.exit(1);
  }

  // One JSONL line per citizen, Name synthesized first so full-name grep hits.
  const lines = rows.map(r => {
    const name = `${r.First || ''} ${r.Last || ''}`.trim();
    return JSON.stringify({ Name: name, ...r });
  });

  fs.writeFileSync(OUT_JSONL, lines.join('\n') + '\n');

  const meta = {
    source: 'Simulation_Ledger',
    cycle: cycleArg ? Number(cycleArg) : null,
    rowCount: rows.length,
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/dumpLedger.js',
    note: 'Local-disk snapshot for search_everything disk shelf. Stable filename, overwritten each cycle.',
  };
  fs.writeFileSync(OUT_META, JSON.stringify(meta, null, 2) + '\n');

  log(`dumpLedger: wrote ${rows.length} citizens → ${path.relative(ROOT, OUT_JSONL)}`);
  log(`dumpLedger: meta → ${path.relative(ROOT, OUT_META)}`);
  if (!quiet) console.log(JSON.stringify({ ok: true, rowCount: rows.length, cycle: meta.cycle }));
}

main().catch(err => {
  console.error('dumpLedger: FAILED —', err.message);
  process.exit(1);
});
