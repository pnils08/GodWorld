/**
 * getCurrentCycle.js — Single source of truth for cycle number
 *
 * Usage:
 *   const getCurrentCycle = require('../lib/getCurrentCycle');
 *   const CYCLE = getCurrentCycle();
 *
 * Resolution order:
 *   1. Numeric argument from process.argv (manual override)
 *   2. output/desk-packets/base_context.json (written by buildDeskPackets.js)
 *   3. Error — no silent wrong defaults
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE_CONTEXT_PATH = path.join(ROOT, 'output/desk-packets/base_context.json');

function getCurrentCycle() {
  // 1. Manual override from argv
  const arg = process.argv.find(a => /^\d+$/.test(a));
  if (arg) return parseInt(arg);

  // 2. Read from base_context.json
  try {
    const bc = JSON.parse(fs.readFileSync(BASE_CONTEXT_PATH, 'utf-8'));
    const cycle = bc.cycle || bc.cycleNumber || (bc.baseContext && bc.baseContext.cycle);
    if (cycle) return parseInt(cycle);
  } catch {}

  // 3. No silent wrong default
  console.error('ERROR: Cannot determine cycle number.');
  console.error('  No numeric argument provided and base_context.json not found or missing cycle.');
  console.error('  Run: node scripts/buildDeskPackets.js');
  process.exit(1);
}

module.exports = getCurrentCycle;
