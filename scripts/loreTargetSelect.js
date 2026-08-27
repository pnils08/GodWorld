#!/usr/bin/env node
'use strict';

/**
 * Deterministic round-robin target picker for the weekly lore-writer cron
 * (pipeline.56). loreWriter.js takes a raw prompt with no target-selection
 * logic of its own -- every prior run (Vinnie, Lorenzo Jordan, Tobias Jurko)
 * was hand-picked. This is the missing piece: pick the next Tier-1/2 citizen
 * who has no PASSED lore entry yet, in POPID order, and persist a cursor so
 * repeated runs progress instead of repeating.
 *
 * Read-only against the ledger snapshot and the canon-source policy; only
 * writes its own cursor file.
 *
 * Usage:
 *   node scripts/loreTargetSelect.js            # advance + print next target as JSON
 *   node scripts/loreTargetSelect.js --peek      # show next target without advancing the cursor
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SNAPSHOT_PATH = path.join(ROOT, 'output', 'simulation_ledger_snapshot.jsonl');
const POLICY_PATH = path.join(ROOT, 'scripts', 'notebooklmCanonSources.json');
const CURSOR_PATH = path.join(ROOT, 'output', 'lore-target-cursor.json');
const ELIGIBLE_TIERS = new Set(['1', '2']);

function loadLedgerCandidates() {
  const lines = fs.readFileSync(SNAPSHOT_PATH, 'utf8').split('\n').filter(Boolean);
  const rows = lines.map((line) => JSON.parse(line));
  return rows
    .filter((row) => ELIGIBLE_TIERS.has(String(row.Tier)) && row.Status !== 'Deceased')
    .map((row) => ({ popid: row.POPID, name: row.Name, tier: row.Tier }))
    .sort((a, b) => (a.popid < b.popid ? -1 : a.popid > b.popid ? 1 : 0));
}

function loadAlreadyLoredPopids() {
  const policy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
  const lored = new Set();
  for (const id of policy.allowedLoreSourceIds || []) {
    const decision = policy.decisions[id];
    const title = decision && decision.title || '';
    const match = title.match(/POP-\d+/i);
    if (match) lored.add(match[0].toUpperCase());
  }
  return lored;
}

function loadCursor() {
  if (!fs.existsSync(CURSOR_PATH)) return { lastPopid: null };
  try {
    return JSON.parse(fs.readFileSync(CURSOR_PATH, 'utf8'));
  } catch (e) {
    return { lastPopid: null };
  }
}

function saveCursor(cursor) {
  fs.writeFileSync(CURSOR_PATH, JSON.stringify(cursor, null, 2) + '\n');
}

function pickNext(candidates, lored, cursor) {
  const remaining = candidates.filter((c) => !lored.has(c.popid));
  if (!remaining.length) {
    throw new Error('No eligible Tier-1/2 candidates remain unlored — every eligible citizen already has a passed lore entry.');
  }
  if (!cursor.lastPopid) return remaining[0];
  const afterCursor = remaining.filter((c) => c.popid > cursor.lastPopid);
  return afterCursor.length ? afterCursor[0] : remaining[0]; // wrap around
}

function main() {
  const peek = process.argv.includes('--peek');
  const candidates = loadLedgerCandidates();
  const lored = loadAlreadyLoredPopids();
  const cursor = loadCursor();
  const target = pickNext(candidates, lored, cursor);

  if (!peek) {
    saveCursor({ lastPopid: target.popid, updatedAt: new Date().toISOString() });
  }

  console.log(JSON.stringify({ ...target, advanced: !peek }, null, 2));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('loreTargetSelect: ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = { loadLedgerCandidates, loadAlreadyLoredPopids, pickNext, loadCursor, saveCursor };
