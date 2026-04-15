#!/usr/bin/env node
/**
 * maraJsonReport.js — Phase 39.5 (S147)
 *
 * Mara Vance runs on claude.ai (external, human-in-the-loop). Her audit report
 * stays markdown, but Phase 39.5 mandates a structured top section per
 * PHASE_39_PLAN §16.3. This script parses that structured top and emits
 * output/mara_report_c{XX}.json for the Final Arbiter to consume.
 *
 * Input: output/mara_audit_c{XX}.md (the markdown audit Mara returns).
 * Output: output/mara_report_c{XX}.json conforming to REVIEWER_LANE_SCHEMA.md.
 *
 * Usage:
 *   node scripts/maraJsonReport.js          # auto-detect cycle
 *   node scripts/maraJsonReport.js 91       # explicit cycle
 *   node scripts/maraJsonReport.js --md path/to/audit.md
 *
 * Exit codes:
 *   0 — parsed and JSON written
 *   1 — markdown missing
 *   2 — structured top missing or malformed
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const CHECK_IDS = ['completeness', 'gave-up-detection', 'coverage-breadth'];
const CHECK_LABELS = {
  completeness: 'Completeness',
  'gave-up-detection': 'Gave-up detection',
  'coverage-breadth': 'Coverage breadth',
};

function resolveInput() {
  const mdFlag = process.argv.indexOf('--md');
  if (mdFlag !== -1) return { explicitPath: process.argv[mdFlag + 1] };
  const argCycle = parseInt(process.argv[2], 10);
  if (!isNaN(argCycle)) return { cycle: argCycle };
  if (process.env.MARA_REPORT_CYCLE) return { cycle: parseInt(process.env.MARA_REPORT_CYCLE, 10) };
  throw new Error('Cycle required: pass as argv[2] or set MARA_REPORT_CYCLE, or use --md <path>');
}

function parseCheckLine(line, label) {
  // "- Completeness: PASS — score 9/10 — everything in sift was covered"
  // "- Gave-up detection: REVISE — 2 flags — Aitken contract, Temescal health"
  // "- Coverage breadth: FAIL — score 4/10 — 80% sports in civic-heavy cycle"
  const re = new RegExp(`^-\\s*${label.replace(/[-]/g, '\\-')}\\s*:\\s*(PASS|REVISE|FAIL)(?:\\s*[—-]\\s*(.+))?$`, 'i');
  const m = line.trim().match(re);
  if (!m) return null;
  const verdict = m[1].toUpperCase();
  const rest = m[2] || '';
  const scoreMatch = rest.match(/score\s+(\d+(?:\.\d+)?)\s*\/\s*(\d+)/i);
  const flagMatch = rest.match(/(\d+)\s+flags?/i);
  return {
    verdict,
    score: scoreMatch ? Number(scoreMatch[1]) / Number(scoreMatch[2]) : null,
    flagCount: flagMatch ? parseInt(flagMatch[1], 10) : null,
    reason: rest,
  };
}

function parseListField(line) {
  // "## Controllable failures: [completeness, gave-up-detection]"
  // "## Controllable failures: none"
  // "## Controllable failures: completeness, gave-up-detection"
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return [];
  let rest = line.slice(colonIdx + 1).trim();
  rest = rest.replace(/^\[|\]$/g, '').trim();
  if (!rest || rest.toLowerCase() === 'none') return [];
  return rest.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseStructuredTop(markdown) {
  const lines = markdown.split('\n');
  const cycleMatch = markdown.match(/^#\s*Mara Audit\s*[—-]\s*Cycle\s*(\d+)/mi);
  if (!cycleMatch) throw new Error('Missing cycle header: expected "# Mara Audit — Cycle {XX}"');
  const cycle = parseInt(cycleMatch[1], 10);

  const checks = {};
  for (const id of CHECK_IDS) {
    const label = CHECK_LABELS[id];
    const line = lines.find((l) => new RegExp(`^-\\s*${label}\\s*:`, 'i').test(l.trim()));
    if (!line) throw new Error(`Missing check line for "${label}"`);
    const parsed = parseCheckLine(line, label);
    if (!parsed) throw new Error(`Malformed check line for "${label}": ${line}`);
    checks[id] = parsed;
  }

  const processLine = lines.find((l) => /^##\s*Process score\s*:/i.test(l));
  const outcomeLine = lines.find((l) => /^##\s*Outcome\s*:/i.test(l));
  const controllableLine = lines.find((l) => /^##\s*Controllable failures\s*:/i.test(l));
  const uncontrollableLine = lines.find((l) => /^##\s*Uncontrollable failures\s*:/i.test(l));

  if (!processLine || !outcomeLine || !controllableLine || !uncontrollableLine) {
    throw new Error('Missing one or more of: Process score, Outcome, Controllable failures, Uncontrollable failures');
  }

  const processScore = parseFloat((processLine.split(':')[1] || '').trim());
  const outcomeRaw = (outcomeLine.split(':')[1] || '').trim();
  const outcome = outcomeRaw.startsWith('1') ? 1 : 0;

  return {
    cycle,
    checks,
    processScore: isNaN(processScore) ? null : processScore,
    outcome,
    controllableFailures: parseListField(controllableLine),
    uncontrollableFailures: parseListField(uncontrollableLine),
  };
}

function buildLaneJson(parsed) {
  const checksOut = {};
  for (const id of CHECK_IDS) {
    const c = parsed.checks[id];
    checksOut[id] = {
      pass: c.verdict === 'PASS',
      verdict: c.verdict,
      score: c.score,
      flagCount: c.flagCount,
      reason: c.reason,
    };
  }

  const passedCount = CHECK_IDS.filter((id) => parsed.checks[id].verdict === 'PASS').length;
  const process = Number((passedCount / CHECK_IDS.length).toFixed(3));
  const allPass = passedCount === CHECK_IDS.length;
  const outcome = allPass ? 1 : 0;

  // Lane score = average of per-check numeric scores, fallback to verdict weight if score missing.
  const scores = CHECK_IDS.map((id) => {
    const c = parsed.checks[id];
    if (typeof c.score === 'number') return c.score;
    return c.verdict === 'PASS' ? 1.0 : c.verdict === 'REVISE' ? 0.6 : 0.2;
  });
  const laneScore = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3));

  const anyFail = CHECK_IDS.some((id) => parsed.checks[id].verdict === 'FAIL');
  const anyRevise = CHECK_IDS.some((id) => parsed.checks[id].verdict === 'REVISE');
  const verdict = allPass ? 'PASS' : anyFail ? 'FAIL' : anyRevise ? 'REVISE' : 'PASS';

  return {
    lane: 'result-validity',
    weight: 0.2,
    cycle: parsed.cycle,
    generatedAt: new Date().toISOString(),
    score: laneScore,
    verdict,
    checks: checksOut,
    process,
    outcome,
    controllableFailures: parsed.controllableFailures,
    uncontrollableFailures: parsed.uncontrollableFailures,
  };
}

function main() {
  const target = resolveInput();
  const mdPath = target.explicitPath
    ? path.resolve(target.explicitPath)
    : path.join(OUTPUT_DIR, `mara_audit_c${target.cycle}.md`);

  if (!fs.existsSync(mdPath)) {
    console.error(`Mara markdown audit not found at ${mdPath}`);
    console.error('Expected Mara to return mara_audit_c{XX}.md with the structured top per PHASE_39_PLAN §16.3.');
    process.exit(1);
  }

  const markdown = fs.readFileSync(mdPath, 'utf8');
  let parsed;
  try {
    parsed = parseStructuredTop(markdown);
  } catch (err) {
    console.error(`Parse failed: ${err.message}`);
    process.exit(2);
  }

  const lane = buildLaneJson(parsed);
  const jsonPath = target.explicitPath
    ? mdPath.replace(/\.md$/, '.json')
    : path.join(OUTPUT_DIR, `mara_report_c${parsed.cycle}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(lane, null, 2));

  console.log(`Mara result-validity lane report parsed.`);
  console.log(`  MD:   ${mdPath}`);
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  verdict=${lane.verdict}  score=${lane.score}  process=${lane.process}  outcome=${lane.outcome}`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { parseStructuredTop, buildLaneJson };
