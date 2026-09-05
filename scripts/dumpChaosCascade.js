#!/usr/bin/env node
/**
 * dumpChaosCascade.js — Chaos_Cars Tier-1 cascade reader (engine.11 T5.3).
 * [research-build] chaos-cars plan docs/plans/2026-05-07-chaos-cars-engine.md §Cross-terminal
 * build split — the Step-1 read helper city-hall-prep needs to build the "Cycle Chaos
 * Reaction" pending-decision block (Step 3).
 *
 * Reads Chaos_Cars rows for one cycle where ConsequenceFloorFired=TRUE (a Tier-1 citizen
 * hit forcing the full cascade per the plan's Hard Constraints), resolves the citizen's
 * name from the local ledger snapshot (POPID is the wrong register for a voice-agent
 * decision packet — a citizen's name is), and renders the perception-only cascade text
 * city-hall-prep's engine→in-world translation contract requires (no metrics, no
 * ConsequenceFloorFired flag, no phase codes — see SKILL.md Step 3).
 *
 * Read-only — never writes the sheet. Tolerant of a missing Chaos_Cars tab (copies/
 * sandboxes) and of a cycle with zero Tier-1 hits (the normal case — expected).
 *
 * Usage:
 *   node scripts/dumpChaosCascade.js <cycle>
 *   node scripts/dumpChaosCascade.js <cycle> --json   # machine-readable for skill consumption
 */

require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');
const canonNameCheck = require('./canon-name-check');

async function readTier1Hits(cycle) {
  const rows = await sheets.getSheetAsObjects('Chaos_Cars').catch(() => []);
  const hits = rows.filter((r) =>
    String(r.CycleId) === String(cycle) &&
    String(r.ConsequenceFloorFired).toUpperCase() === 'TRUE');

  if (!hits.length) return [];

  const popids = hits.filter((r) => r.TargetScope === 'citizen').map((r) => r.TargetId);
  const profiles = canonNameCheck.profilesForPopids(popids);
  const nameByPopid = {};
  for (const p of profiles) {
    const m = /^(.+?) — .*popid: (POP-\d+)/.exec(p);
    if (m) nameByPopid[m[2]] = m[1];
  }

  return hits.map((r) => {
    const name = nameByPopid[r.TargetId] || r.TargetId; // fall back to POPID if unresolved
    return {
      eventId: r.EventId,
      vehicle: r.VehicleType,
      outcome: r.DiceOutcome,
      targetId: r.TargetId,
      targetName: name,
      narrativeSeed: r.ChaosNarrativeSeed || ''
    };
  });
}

function reactionBlockFor(hit, voice) {
  const readableOutcome = String(hit.outcome || '').replace(/_/g, ' ');
  const readableVehicle = String(hit.vehicle || '').replace(/_/g, ' ');
  const article = /^[aeiou]/i.test(readableVehicle) ? 'an' : 'a';
  return `**[CHAOS CASCADE]** ${hit.targetName} was hit by ${article} ${readableVehicle} this cycle — ${readableOutcome}. Decision required: how does ${voice} respond?`;
}

async function main() {
  const cycle = process.argv[2];
  const asJson = process.argv.includes('--json');

  if (!cycle) {
    console.error('Usage: node scripts/dumpChaosCascade.js <cycle> [--json]');
    process.exit(1);
  }

  const hits = await readTier1Hits(cycle);

  if (asJson) {
    console.log(JSON.stringify({ cycle, tier1Hits: hits }, null, 2));
    return;
  }

  if (!hits.length) {
    console.log(`Cycle ${cycle}: no Tier-1 chaos cascade this cycle (ConsequenceFloorFired=TRUE, none found — the expected case).`);
    return;
  }

  console.log(`Cycle ${cycle}: ${hits.length} Tier-1 chaos cascade hit(s):`);
  for (const h of hits) {
    console.log(`  - ${h.targetName} (${h.targetId}) — ${h.vehicle} → ${h.outcome}`);
    if (h.narrativeSeed) console.log(`    seed: ${h.narrativeSeed}`);
    console.log(`    block: ${reactionBlockFor(h, '{voice}')}`);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { readTier1Hits, reactionBlockFor };
}

if (require.main === module) {
  main().catch((err) => {
    console.error('dumpChaosCascade FAILED:', err.message);
    process.exit(1);
  });
}
