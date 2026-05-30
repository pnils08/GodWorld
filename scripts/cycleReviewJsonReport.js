#!/usr/bin/env node
/**
 * cycleReviewJsonReport.js — reasoning-lane finalizer (S244 ES-2, G-W58)
 *
 * The reasoning lane (cycle_review_c{XX}.json) was the one reviewer lane WITHOUT
 * a Node finalizer — the cycle-review skill/agent writes it directly, so it
 * carried only the agent's hand-stamped generatedAt (historically minute-rounded,
 * e.g. 16:15:00 / 02:30:00, and C95's fabricated 09:00:00). rhea and mara already
 * receive real provenance from their JsonReport finalizers; this closes the
 * asymmetry so all three lanes carry a trusted run_completed_at the Final Arbiter
 * can verify (finalArbiter.checkProvenance). Without it, the heaviest lane (0.5)
 * rests on an agent's clock — exactly the lane most exposed to the G-W58 stub gap.
 *
 * Reads the agent-produced cycle_review_c{XX}.json, validates the arbiter-required
 * fields, stamps a real provenance block, and rewrites in place. It does NOT
 * re-judge content — it validates structure and stamps a trustworthy timestamp.
 *
 * Wire into .claude/skills/cycle-review/SKILL.md as the final step (RB half):
 *   node scripts/cycleReviewJsonReport.js {XX}
 *
 * Usage:
 *   node scripts/cycleReviewJsonReport.js 95
 *   node scripts/cycleReviewJsonReport.js --file output/cycle_review_c95.json
 *
 * Exit codes:
 *   0 — validated + provenance stamped
 *   1 — file missing
 *   2 — malformed JSON or schema violation (arbiter-required field missing/invalid)
 */
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
// Captured at module load (≈ process start) — a real run-start timestamp.
const RUN_STARTED_AT = new Date().toISOString();

// The fields finalArbiter.validateLane requires of every narrative lane.
const REQUIRED = ['score', 'verdict', 'process', 'outcome', 'controllableFailures', 'uncontrollableFailures'];

function resolveTarget() {
  const fileIdx = process.argv.indexOf('--file');
  if (fileIdx !== -1 && process.argv[fileIdx + 1]) {
    return { explicitPath: path.resolve(process.argv[fileIdx + 1]) };
  }
  const cycle = parseInt(process.argv[2], 10);
  if (isNaN(cycle)) {
    console.error('Usage: node scripts/cycleReviewJsonReport.js <cycle> | --file <path>');
    process.exit(1);
  }
  return { cycle };
}

function validate(doc) {
  const violations = [];
  for (const k of REQUIRED) if (!(k in doc)) violations.push(`missing field: ${k}`);
  if ('score' in doc && (typeof doc.score !== 'number' || doc.score < 0 || doc.score > 1)) {
    violations.push(`score out of range: ${doc.score}`);
  }
  for (const k of ['controllableFailures', 'uncontrollableFailures']) {
    if (k in doc && !Array.isArray(doc[k])) violations.push(`${k} must be an array`);
  }
  return violations;
}

function main() {
  const target = resolveTarget();
  const jsonPath = target.explicitPath || path.join(OUTPUT_DIR, `cycle_review_c${target.cycle}.json`);

  if (!fs.existsSync(jsonPath)) {
    console.error(`Reasoning-lane JSON not found at ${jsonPath}`);
    console.error('The cycle-review agent must produce cycle_review_c{XX}.json first (Phase 39.4 output contract).');
    process.exit(1);
  }

  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (err) {
    console.error(`Malformed JSON: ${err.message}`);
    process.exit(2);
  }

  const violations = validate(doc);
  if (violations.length > 0) {
    console.error(`Schema violations in ${jsonPath}:`);
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(2);
  }

  if (!doc.generatedAt) doc.generatedAt = new Date().toISOString();
  // G-W58 — stamp real provenance; run_completed_at is the arbiter's trusted
  // timestamp (always precise here), so a finalized reasoning lane passes the
  // integrity check regardless of any round generatedAt the agent left.
  doc.provenance = {
    producer: 'scripts/cycleReviewJsonReport.js',
    model: process.env.REVIEWER_MODEL || null,
    run_started_at: RUN_STARTED_AT,
    run_completed_at: new Date().toISOString(),
  };

  fs.writeFileSync(jsonPath, JSON.stringify(doc, null, 2));
  console.log('Reasoning-lane report validated + provenance stamped.');
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  run_completed_at: ${doc.provenance.run_completed_at}`);
  process.exit(0);
}

main();
