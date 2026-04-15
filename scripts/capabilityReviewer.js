#!/usr/bin/env node
/**
 * capabilityReviewer.js — Phase 39.1
 *
 * Runs the editorial capability assertions against a compiled edition.
 * Reads three things on each invocation:
 *   1. The compiled edition (editions/cycle_pulse_edition_{XX}.txt)
 *   2. The engine audit JSON (output/engine_audit_c{XX}.json) — produced
 *      by scripts/engineAuditor.js (Phase 38.1)
 *   3. The criteria-derived assertion list (scripts/capability-reviewer/
 *      assertions.json)
 *
 * Writes:
 *   output/capability_review_c{XX}.json  — pass/fail per assertion
 *
 * Determinism: code-only assertions (7 of 9 enabled) produce identical
 * results across runs. Mixed assertions (gender lookup) depend on
 * Simulation_Ledger reads which are stable within a session. Two
 * grader-only assertions are deferred until the Anthropic API key is
 * wired (status flagged in assertions.json.graderOnlyAssertions).
 *
 * Plan: docs/engine/PHASE_39_PLAN.md
 *
 * Usage:
 *   node scripts/capabilityReviewer.js          # auto-detect cycle
 *   node scripts/capabilityReviewer.js 91       # explicit cycle
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');
const { parse } = require('./capability-reviewer/parseEdition');

const REVIEWER_VERSION = '1.0.0';
const ASSERTIONS_PATH = path.join(__dirname, 'capability-reviewer', 'assertions.json');
const EDITIONS_DIR = path.join(__dirname, '..', 'editions');
const OUTPUT_DIR = path.join(__dirname, '..', 'output');

const SHEETS_TO_READ = [
  'Simulation_Ledger',
  'Civic_Office_Ledger',
  'Initiative_Tracker',
];

async function getCurrentCycle() {
  const argCycle = parseInt(process.argv[2], 10);
  if (!isNaN(argCycle)) return argCycle;
  if (process.env.CAPABILITY_REVIEWER_CYCLE) {
    return parseInt(process.env.CAPABILITY_REVIEWER_CYCLE, 10);
  }
  const config = await sheets.getSheetAsObjects('World_Config');
  const row = config.find((r) => r.Key === 'cycleCount');
  if (!row) throw new Error('cycleCount not found in World_Config');
  return parseInt(row.Value, 10);
}

async function loadSheetSnapshot() {
  const results = await Promise.all(
    SHEETS_TO_READ.map(async (name) => {
      try {
        const data = await sheets.getSheetAsObjects(name);
        return [name, data];
      } catch (err) {
        console.warn(`  warn: ${name} read failed — ${err.message}`);
        return [name, []];
      }
    })
  );
  return Object.fromEntries(results);
}

function loadAuditJson(cycle) {
  const p = path.join(OUTPUT_DIR, `engine_audit_c${cycle}.json`);
  if (!fs.existsSync(p)) {
    throw new Error(`Audit JSON not found at ${p}. Run scripts/engineAuditor.js first.`);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadEdition(cycle) {
  const p = path.join(EDITIONS_DIR, `cycle_pulse_edition_${cycle}.txt`);
  if (!fs.existsSync(p)) {
    throw new Error(`Edition not found at ${p}.`);
  }
  return parse(p);
}

function loadAssertions() {
  return JSON.parse(fs.readFileSync(ASSERTIONS_PATH, 'utf8'));
}

function summarize(results) {
  const summary = {
    total: results.length,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    byCategory: {},
    blockingFailures: [],
    advisoryFailures: [],
  };
  for (const r of results) {
    summary.byCategory[r.category] = (summary.byCategory[r.category] || 0) + 1;
    if (!r.pass && r.tier === 'blocking') summary.blockingFailures.push(r.id);
    if (!r.pass && r.tier === 'advisory') summary.advisoryFailures.push(r.id);
  }
  return summary;
}

async function main() {
  const cycle = await getCurrentCycle();
  console.log(`Capability Reviewer — Cycle ${cycle}`);

  const startTime = Date.now();
  const [audit, edition, sheetSnapshot, assertions] = await Promise.all([
    Promise.resolve(loadAuditJson(cycle)),
    Promise.resolve(loadEdition(cycle)),
    loadSheetSnapshot(),
    Promise.resolve(loadAssertions()),
  ]);

  console.log(`  - audit patterns: ${audit.patterns?.length || 0}`);
  console.log(`  - edition sections: ${edition.sections.length}`);
  console.log(`  - assertions enabled: ${assertions.assertions.length} (deferred: ${assertions.graderOnlyAssertions?.length || 0})`);

  const ctx = {
    cycle,
    audit,
    edition,
    sheets: sheetSnapshot,
    editionsDir: EDITIONS_DIR,
  };

  const results = [];
  for (const meta of assertions.assertions) {
    const modulePath = path.resolve(path.dirname(ASSERTIONS_PATH), meta.module);
    let mod;
    try {
      mod = require(modulePath);
    } catch (err) {
      console.error(`  ERR: cannot load ${meta.module} — ${err.message}`);
      results.push({
        id: meta.id,
        category: meta.category,
        tier: meta.tier,
        pass: false,
        confidence: 'high',
        reason: `Assertion module failed to load: ${err.message}`,
        evidence: {},
        rubricSource: meta.rubricSource,
        detectorVersion: 'load-error',
      });
      continue;
    }
    try {
      const r = mod.check(ctx);
      r.rubricSource = meta.rubricSource;
      r.tier = meta.tier; // assertions.json is authoritative for tier
      results.push(r);
      const flag = r.pass ? '✓' : (r.tier === 'blocking' ? '✗ BLOCK' : '✗ adv');
      console.log(`  ${flag}  ${r.id}`);
    } catch (err) {
      console.error(`  ERR: ${meta.id} threw — ${err.message}`);
      results.push({
        id: meta.id,
        category: meta.category,
        tier: meta.tier,
        pass: false,
        confidence: 'high',
        reason: `Assertion check threw: ${err.message}`,
        evidence: { error: err.stack },
        rubricSource: meta.rubricSource,
        detectorVersion: 'runtime-error',
      });
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const summary = summarize(results);

  const output = {
    cycle,
    generatedAt: new Date().toISOString(),
    reviewerVersion: REVIEWER_VERSION,
    edition: `cycle_pulse_edition_${cycle}.txt`,
    auditJson: `engine_audit_c${cycle}.json`,
    results,
    summary,
    deferredAssertions: assertions.graderOnlyAssertions || [],
    elapsedSeconds: parseFloat(elapsed),
  };

  const outputPath = path.join(OUTPUT_DIR, `capability_review_c${cycle}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\nSummary: ${summary.passed}/${summary.total} passed in ${elapsed}s`);
  console.log(`  blocking failures: ${summary.blockingFailures.length}`);
  console.log(`  advisory failures: ${summary.advisoryFailures.length}`);
  console.log(`  output: ${outputPath}`);

  if (summary.blockingFailures.length > 0) {
    console.log(`\nBLOCKING FAILURES (would halt publish in pipeline):`);
    for (const id of summary.blockingFailures) {
      const r = results.find((x) => x.id === id);
      console.log(`  - ${id}: ${r.reason}`);
    }
  }
}

main().catch((err) => {
  console.error('Capability reviewer failed:', err);
  process.exit(1);
});
