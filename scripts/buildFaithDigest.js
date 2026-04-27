#!/usr/bin/env node
/**
 * buildFaithDigest.js — Faith_Ledger consumer
 * [engine/sheet] — S180 build, ROLLOUT_PLAN "ADD: Faith_Ledger consumer"
 *
 * Reads Faith_Ledger (125+ events written by ensureFaithLedger.js +
 * faithEventsEngine.js but never read by anything until now), filters
 * to the current cycle + recent context window, emits a digest JSON
 * for desk consumption.
 *
 * Output: output/faith_digest_c<XX>.json
 *
 * Shape:
 *   {
 *     cycle,
 *     current: [{ organization, faithTradition, eventType, description,
 *                 neighborhood, attendance, status }, ...],   // this cycle
 *     recent:  [...],                                          // last 2 cycles
 *     byNeighborhood: { Fruitvale: [...], Rockridge: [...], ... },
 *     byTradition:    { Catholic: [...], Hindu: [...], ... },
 *     totals: { thisCycle, recentCycles, byTradition, byNeighborhood }
 *   }
 *
 * Consumed by: scripts/buildDeskFolders.js (culture desk briefing).
 *
 * Usage:
 *   node scripts/buildFaithDigest.js                        # default cycle
 *   node scripts/buildFaithDigest.js 92                     # explicit cycle
 *   node scripts/buildFaithDigest.js 92 --dry-run           # no write
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');
const getCurrentCycle = require('../lib/getCurrentCycle');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');
const RECENT_WINDOW = 2;  // include last 2 cycles before current as "recent context"

const DRY_RUN = process.argv.includes('--dry-run');

function indexHeader(headers, name) {
  for (let i = 0; i < headers.length; i++) {
    if ((headers[i] || '').trim() === name) return i;
  }
  return -1;
}

function groupBy(arr, key) {
  const out = {};
  for (const item of arr) {
    const k = item[key] || '(unspecified)';
    if (!out[k]) out[k] = [];
    out[k].push(item);
  }
  return out;
}

async function main() {
  const cycle = getCurrentCycle();
  if (!cycle) {
    console.error('[ERROR] Could not resolve cycle number. Pass as positional arg or run buildDeskPackets first.');
    process.exit(1);
  }

  console.log('=== buildFaithDigest ===');
  console.log('[METADATA] ' + JSON.stringify({
    cycle,
    recentWindow: RECENT_WINDOW,
    mode: DRY_RUN ? 'DRY-RUN' : 'WRITE',
  }, null, 2));
  console.log('---');

  const rows = await sheets.getSheetData('Faith_Ledger');
  if (!rows || rows.length < 2) {
    console.log('[INFO] Faith_Ledger empty — nothing to digest.');
    process.exit(0);
  }

  const headers = rows[0];
  const idx = {
    timestamp: indexHeader(headers, 'Timestamp'),
    cycle: indexHeader(headers, 'Cycle'),
    organization: indexHeader(headers, 'Organization'),
    faithTradition: indexHeader(headers, 'FaithTradition'),
    eventType: indexHeader(headers, 'EventType'),
    description: indexHeader(headers, 'EventDescription'),
    neighborhood: indexHeader(headers, 'Neighborhood'),
    attendance: indexHeader(headers, 'Attendance'),
    status: indexHeader(headers, 'Status'),
  };

  const required = ['cycle', 'organization', 'faithTradition', 'eventType'];
  const missing = required.filter(k => idx[k] < 0);
  if (missing.length > 0) {
    console.error('[ERROR] Faith_Ledger missing required columns: ' + missing.join(', '));
    process.exit(1);
  }

  const cutoff = cycle - RECENT_WINDOW;
  const events = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const c = parseInt(r[idx.cycle], 10);
    if (!Number.isFinite(c) || c < cutoff || c > cycle) continue;
    events.push({
      cycle: c,
      organization: (r[idx.organization] || '').trim(),
      faithTradition: (r[idx.faithTradition] || '').trim(),
      eventType: (r[idx.eventType] || '').trim(),
      description: idx.description >= 0 ? (r[idx.description] || '').trim() : '',
      neighborhood: idx.neighborhood >= 0 ? (r[idx.neighborhood] || '').trim() : '',
      attendance: idx.attendance >= 0 ? parseInt(r[idx.attendance], 10) || null : null,
      status: idx.status >= 0 ? (r[idx.status] || '').trim() : '',
    });
  }

  const current = events.filter(e => e.cycle === cycle);
  const recent = events.filter(e => e.cycle < cycle).sort((a, b) => b.cycle - a.cycle);

  const byNeighborhood = groupBy(current, 'neighborhood');
  const byTradition = groupBy(current, 'faithTradition');

  const totals = {
    thisCycle: current.length,
    recentCycles: recent.length,
    byTradition: Object.fromEntries(Object.entries(byTradition).map(([k, v]) => [k, v.length])),
    byNeighborhood: Object.fromEntries(Object.entries(byNeighborhood).map(([k, v]) => [k, v.length])),
  };

  console.log('Events found: ' + events.length + ' total (' + current.length + ' this cycle, ' + recent.length + ' recent)');
  console.log('Traditions this cycle: ' + Object.keys(byTradition).join(', '));
  console.log('Neighborhoods this cycle: ' + Object.keys(byNeighborhood).join(', '));

  const digest = {
    timestamp: new Date().toISOString(),
    cycle,
    recentWindow: RECENT_WINDOW,
    current,
    recent,
    byNeighborhood,
    byTradition,
    totals,
  };

  if (DRY_RUN) {
    console.log('');
    console.log('[DRY-RUN] Would write: output/faith_digest_c' + cycle + '.json');
    console.log('Sample (first current event): ' + JSON.stringify(current[0] || null, null, 2));
    return;
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `faith_digest_c${cycle}.json`);
  fs.writeFileSync(outPath, JSON.stringify(digest, null, 2));
  console.log('');
  console.log('Written: ' + outPath);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
