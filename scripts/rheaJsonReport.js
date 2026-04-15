#!/usr/bin/env node
/**
 * rheaJsonReport.js — Phase 39.2 (S147)
 *
 * Rhea Morgan (Sourcing Lane) produces output/rhea_report_c{XX}.json per
 * the REVIEWER_LANE_SCHEMA contract. This script:
 *   1. Validates the JSON conforms to the schema.
 *   2. Recomputes derived fields (process, outcome, controllable/uncontrollable)
 *      so the Final Arbiter can trust them even if the agent slipped.
 *   3. Emits a human-readable output/rhea_report_c{XX}.txt companion for
 *      current consumers (editor, Mags, legacy pipeline scripts).
 *
 * Usage:
 *   node scripts/rheaJsonReport.js          # auto-detect cycle from config
 *   node scripts/rheaJsonReport.js 91       # explicit cycle
 *   node scripts/rheaJsonReport.js --json path/to/rhea.json  # validate a file
 *
 * Exit codes:
 *   0 — JSON validates, .txt written
 *   1 — JSON missing or malformed
 *   2 — schema violation (field type, required key missing)
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'output');

const REQUIRED_CHECK_IDS = [
  'citizen-name-verification',
  'vote-civic-verification',
  'sports-record-verification',
  'canon-continuity',
  'quote-attribution',
];

function resolveCycle() {
  const jsonFlag = process.argv.indexOf('--json');
  if (jsonFlag !== -1) return { explicitPath: process.argv[jsonFlag + 1] };
  const argCycle = parseInt(process.argv[2], 10);
  if (!isNaN(argCycle)) return { cycle: argCycle };
  if (process.env.RHEA_REPORT_CYCLE) return { cycle: parseInt(process.env.RHEA_REPORT_CYCLE, 10) };
  throw new Error('Cycle required: pass as argv[2] or set RHEA_REPORT_CYCLE, or use --json <path>');
}

function validateSchema(doc) {
  const violations = [];
  const mustHave = ['lane', 'weight', 'cycle', 'score', 'verdict', 'checks'];
  for (const key of mustHave) {
    if (!(key in doc)) violations.push(`missing top-level key: ${key}`);
  }
  if (doc.lane !== 'sourcing') violations.push(`lane must be "sourcing" (got "${doc.lane}")`);
  if (doc.weight !== 0.3) violations.push(`weight must be 0.3 (got ${doc.weight})`);
  if (!['PASS', 'REVISE', 'FAIL'].includes(doc.verdict)) {
    violations.push(`verdict must be PASS|REVISE|FAIL (got "${doc.verdict}")`);
  }
  if (typeof doc.score !== 'number' || doc.score < 0 || doc.score > 1) {
    violations.push(`score must be number in [0,1] (got ${doc.score})`);
  }
  if (!doc.checks || typeof doc.checks !== 'object') {
    violations.push('checks must be an object');
  } else {
    for (const id of REQUIRED_CHECK_IDS) {
      if (!(id in doc.checks)) violations.push(`missing required check: ${id}`);
      else {
        const c = doc.checks[id];
        if (typeof c.pass !== 'boolean') violations.push(`checks.${id}.pass must be boolean`);
        if (!Array.isArray(c.issues)) violations.push(`checks.${id}.issues must be array`);
      }
    }
  }
  return violations;
}

function recomputeDerivedFields(doc) {
  const checkEntries = Object.entries(doc.checks);
  const total = checkEntries.length;
  const passed = checkEntries.filter(([, c]) => c.pass).length;

  const controllable = [];
  const uncontrollable = [];
  for (const [id, c] of checkEntries) {
    if (c.pass) continue;
    const hasUncontrollable = (c.issues || []).some((i) => i.severity === 'UNCONTROLLABLE');
    if (hasUncontrollable) uncontrollable.push(id);
    else controllable.push(id);
  }

  return {
    process: total === 0 ? 0 : Number((passed / total).toFixed(3)),
    outcome: doc.verdict === 'PASS' ? 1 : 0,
    controllableFailures: controllable,
    uncontrollableFailures: uncontrollable,
  };
}

function renderTxt(doc) {
  const lines = [];
  lines.push('RHEA MORGAN — SOURCING LANE REPORT');
  lines.push(`Edition ${doc.cycle} | ${doc.generatedAt || new Date().toISOString()}`);
  lines.push('='.repeat(64));
  lines.push('');
  lines.push(`LANE:    sourcing (weight ${doc.weight})`);
  lines.push(`VERDICT: ${doc.verdict}`);
  lines.push(`SCORE:   ${doc.score.toFixed(2)} / 1.00`);
  lines.push(`PROCESS: ${doc.process.toFixed(3)}    OUTCOME: ${doc.outcome}`);
  lines.push('');

  const criticals = [];
  const warnings = [];
  const uncontrollables = [];
  for (const [id, c] of Object.entries(doc.checks)) {
    const flag = c.pass ? 'PASS' : 'FAIL';
    lines.push(`[${flag}] ${id}`);
    for (const issue of c.issues || []) {
      const label = `  - ${issue.severity}: ${issue.article ? `[${issue.article}] ` : ''}${issue.claim || ''}`;
      lines.push(label);
      if (issue.canonValue) lines.push(`      canon: ${issue.canonValue}`);
      if (issue.fix) lines.push(`      fix:   ${issue.fix}`);
      if (issue.severity === 'CRITICAL') criticals.push({ check: id, ...issue });
      if (issue.severity === 'WARNING') warnings.push({ check: id, ...issue });
      if (issue.severity === 'UNCONTROLLABLE') uncontrollables.push({ check: id, ...issue });
    }
  }

  lines.push('');
  lines.push(`CRITICAL:       ${criticals.length}`);
  lines.push(`WARNING:        ${warnings.length}`);
  lines.push(`UNCONTROLLABLE: ${uncontrollables.length}`);

  if (doc.controllableFailures.length > 0) {
    lines.push(`Controllable failures:   ${doc.controllableFailures.join(', ')}`);
  }
  if (doc.uncontrollableFailures.length > 0) {
    lines.push(`Uncontrollable failures: ${doc.uncontrollableFailures.join(', ')}`);
  }
  lines.push('');
  lines.push('='.repeat(64));
  return lines.join('\n') + '\n';
}

function main() {
  const target = resolveCycle();
  const jsonPath = target.explicitPath
    ? path.resolve(target.explicitPath)
    : path.join(OUTPUT_DIR, `rhea_report_c${target.cycle}.json`);

  if (!fs.existsSync(jsonPath)) {
    console.error(`Rhea JSON not found at ${jsonPath}`);
    console.error('Rhea agent must produce rhea_report_c{XX}.json first (Phase 39.2 output contract).');
    process.exit(1);
  }

  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (err) {
    console.error(`Malformed JSON: ${err.message}`);
    process.exit(1);
  }

  const violations = validateSchema(doc);
  if (violations.length > 0) {
    console.error(`Schema violations in ${jsonPath}:`);
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(2);
  }

  // Recompute derived fields — authoritative over whatever the agent wrote.
  const derived = recomputeDerivedFields(doc);
  doc.process = derived.process;
  doc.outcome = derived.outcome;
  doc.controllableFailures = derived.controllableFailures;
  doc.uncontrollableFailures = derived.uncontrollableFailures;
  if (!doc.generatedAt) doc.generatedAt = new Date().toISOString();

  fs.writeFileSync(jsonPath, JSON.stringify(doc, null, 2));

  const cycle = doc.cycle;
  const txtPath = target.explicitPath
    ? jsonPath.replace(/\.json$/, '.txt')
    : path.join(OUTPUT_DIR, `rhea_report_c${cycle}.txt`);
  fs.writeFileSync(txtPath, renderTxt(doc));

  console.log(`Rhea sourcing-lane report validated.`);
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  TXT:  ${txtPath}`);
  console.log(`  verdict=${doc.verdict}  score=${doc.score.toFixed(2)}  process=${doc.process}  outcome=${doc.outcome}`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { validateSchema, recomputeDerivedFields, renderTxt };
