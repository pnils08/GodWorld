#!/usr/bin/env node
/**
 * checkPostPublishStaleness.js — /post-publish Step 0 pre-flight gate
 * [engine/sheet] — closes pipeline.14a (S215)
 *
 * Checks whether the cycle's derivative artifacts (world_summary,
 * engine_audit) were built BEFORE /city-hall ran. If so, downstream
 * skills consume a pre-civic snapshot and the cycle's civic decisions
 * silently drop from desk-agent inputs (this happened to C93 across
 * sift + post-publish + edition-print — 5 gap-log entries, same class).
 *
 * Output: WARN line per stale artifact. Exit 0 always — the gate is
 * advisory, not blocking. The rebuild trigger is a separate workflow
 * (pipeline.14b, research-build).
 *
 * Usage:
 *   node scripts/checkPostPublishStaleness.js --cycle 93
 *
 * Acceptance:
 *   - Stale: prints WARN per artifact, exits 0
 *   - Fresh: silent, exits 0
 *   - Missing city-hall log: silent, exits 0 (no baseline = nothing to compare)
 *   - Missing artifact: silent, exits 0 (caller decides if absence is a problem)
 */

const path = require('path');
const { checkArtifactStaleness } = require('../lib/staleness');

function parseCycleFlag() {
  const i = process.argv.indexOf('--cycle');
  if (i === -1 || i === process.argv.length - 1) {
    console.error('[ERROR] --cycle N is required');
    process.exit(1);
  }
  const n = parseInt(process.argv[i + 1], 10);
  if (!Number.isFinite(n) || n < 1) {
    console.error('[ERROR] --cycle must be a positive integer');
    process.exit(1);
  }
  return n;
}

const cycle = parseCycleFlag();
const ROOT = path.join(__dirname, '..');
const cityHallLog = path.join(ROOT, 'output', 'production_log_city_hall_c' + cycle + '.md');

const checks = [
  {
    label: 'world_summary',
    path: path.join(ROOT, 'output', 'world_summary_c' + cycle + '.md'),
  },
  {
    label: 'engine_audit',
    path: path.join(ROOT, 'output', 'engine_audit_c' + cycle + '.json'),
  },
];

let staleCount = 0;
for (const c of checks) {
  const result = checkArtifactStaleness(c.path, cityHallLog);
  if (result.stale) {
    staleCount++;
    console.log('STALE: ' + c.label + '_c' + cycle +
      ' built BEFORE /city-hall ran — civic decisions may not be reflected. ' +
      'Re-run /build-world-summary before continuing. (' + result.reason + ')');
  }
}

if (staleCount === 0) {
  // Silent when fresh. Optional one-line summary on the affirmative
  // confirms the gate ran; commented out by default to keep skill-side
  // log noise minimal.
  // console.log('Staleness gate: clean (C' + cycle + ').');
}

process.exit(0);
