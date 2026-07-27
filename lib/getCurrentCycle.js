/**
 * getCurrentCycle.js — THE single source of truth for the current cycle number
 * (engine.81, S336 — cycle-resolution unification after the S332 incident).
 *
 * Usage:
 *   const getCurrentCycle = require('../lib/getCurrentCycle');
 *   const CYCLE = getCurrentCycle();                 // int, or exits loudly
 *   const CYCLE = getCurrentCycle({ soft: true });   // int, or null (headless crons)
 *
 * Resolution order:
 *   1. Numeric argument from process.argv (manual override; skip with {noArgv:true}
 *      when the caller parses its own flags)
 *   2. Freshest output/world_summary_c{N}.md — the compile artifact the engine
 *      writes EVERY cycle, independent of the (frozen) edition pipeline. This is
 *      the local materialization of World_Config.cycleCount, the engine's own
 *      counter (engineAuditor/capabilityReviewer read that sheet directly at
 *      engine-runtime; everything cron/local resolves here).
 *   3. output/desk-packets/base_context.json — LAST RESORT ONLY, loud warning.
 *      It is written by the edition pipeline's buildDeskPackets.js and goes
 *      stale whenever editions pause (S332: it sat stamped 103 while the world
 *      was at 102 and the citizen-loop logged the wrong cycle for 3 days).
 *   4. Error — no silent wrong defaults ({soft:true} returns null instead).
 *
 * Divergence guard (the S332 fix): whenever base_context.json is readable and
 * disagrees with the freshest world_summary — ahead OR behind — a warning
 * naming both numbers goes to stderr. base_context can never silently win.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_ROOT = path.resolve(__dirname, '..');

function freshestWorldSummaryCycle(root) {
  try {
    const nums = fs.readdirSync(path.join(root, 'output'))
      .map(f => (f.match(/^world_summary_c(\d+)\.md$/) || [])[1])
      .filter(Boolean)
      .map(Number);
    return nums.length ? Math.max(...nums) : null;
  } catch (e) {
    return null;
  }
}

function readBaseContext(root) {
  try {
    const p = path.join(root, 'output/desk-packets/base_context.json');
    const bc = JSON.parse(fs.readFileSync(p, 'utf-8'));
    const cycle = bc.cycle || bc.cycleNumber || (bc.baseContext && bc.baseContext.cycle);
    return { cycle: cycle ? parseInt(cycle, 10) : null, sheetId: bc.source && bc.source.sheetId };
  } catch (e) {
    return null;
  }
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.soft]   return null instead of process.exit(1) when unresolvable
 * @param {boolean} [opts.noArgv] skip the bare-numeric argv sniff (callers with own flag parsing)
 * @param {string}  [opts.root]   repo root override (tests)
 * @returns {number|null}
 */
function getCurrentCycle(opts) {
  const o = opts || {};
  const root = o.root || DEFAULT_ROOT;

  // 1. Manual override from argv
  if (!o.noArgv) {
    const arg = process.argv.find(a => /^\d+$/.test(a));
    if (arg) return parseInt(arg, 10);
  }

  const world = freshestWorldSummaryCycle(root);
  const bc = readBaseContext(root);

  // Env-tag guard (S306): a base_context built from a different sheet than this
  // process targets is sandbox/prod cross-talk — never consult it.
  let bcUsable = bc;
  if (bc && bc.sheetId && process.env.GODWORLD_SHEET_ID && bc.sheetId !== process.env.GODWORLD_SHEET_ID) {
    console.error('WARN getCurrentCycle: base_context.json was built from a different sheet than GODWORLD_SHEET_ID — ignoring it for cycle resolution.');
    bcUsable = null;
  }

  // 2. Freshest world_summary is the primary source.
  if (world !== null) {
    // Divergence guard (S332): base_context disagreeing — ahead or behind — is
    // reported loudly and never wins.
    if (bcUsable && bcUsable.cycle && bcUsable.cycle !== world) {
      console.error(`WARN getCurrentCycle: base_context.json says cycle ${bcUsable.cycle} but freshest world_summary is c${world} — base_context is ${bcUsable.cycle > world ? 'AHEAD of reality' : 'stale'}. Using ${world}. Re-run buildDeskPackets.js to refresh it.`);
    }
    return world;
  }

  // 3. Last resort: base_context, loudly.
  if (bcUsable && bcUsable.cycle) {
    console.error(`WARN getCurrentCycle: no world_summary_c{N}.md found — falling back to base_context.json (cycle ${bcUsable.cycle}). This source goes stale when editions pause; treat with suspicion.`);
    return bcUsable.cycle;
  }

  // 4. No silent wrong default.
  if (o.soft) return null;
  console.error('ERROR: Cannot determine cycle number.');
  console.error('  No numeric argument, no output/world_summary_c{N}.md, no usable base_context.json.');
  console.error('  Pass the cycle explicitly, or run the cycle compile (buildWorldSummary.js).');
  process.exit(1);
}

module.exports = getCurrentCycle;
