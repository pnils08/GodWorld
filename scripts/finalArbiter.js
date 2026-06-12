#!/usr/bin/env node
/**
 * finalArbiter.js — Phase 39.7 (S147)
 *
 * Reads the four reviewer outputs for a cycle:
 *   1. output/cycle_review_c{XX}.json   — reasoning lane (weight 0.5)
 *   2. output/rhea_report_c{XX}.json    — sourcing lane (weight 0.3)
 *   3. output/mara_report_c{XX}.json    — result validity lane (weight 0.2)
 *   4. output/capability_review_c{XX}.json — capability gate
 *
 * Computes the weighted score, applies the capability gate, issues an A/B
 * verdict, and writes output/final_arbiter_c{XX}.json matching the schema
 * in PHASE_39_PLAN §18.3.
 *
 * The computation is deterministic (see .claude/agents/final-arbiter/RULES.md §Computation).
 * No LLM call is required for the base judgment. A narrative summary can be
 * layered on later if we ever want a prose explanation in addition to the JSON.
 *
 * Usage:
 *   node scripts/finalArbiter.js          # auto-detect cycle from World_Config
 *   node scripts/finalArbiter.js 91       # explicit cycle
 *
 * Exit codes:
 *   0 — verdict A, recommendation PROCEED or PROCEED-WITH-NOTES
 *   1 — verdict B, recommendation HALT
 *   2 — pipeline error (missing lane JSON, malformed input)
 *   3 — verdict PENDING-MARA, recommendation HOLD (G-W59 — Mara result-validity
 *       handoff not yet completed; held for handoff, NOT failed for quality)
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const ARBITER_VERSION = '1.0.0';

const WEIGHTS = { reasoning: 0.5, sourcing: 0.3, resultValidity: 0.2 };

function resolveCycle() {
  const argCycle = parseInt(process.argv[2], 10);
  if (!isNaN(argCycle)) return Promise.resolve(argCycle);
  if (process.env.FINAL_ARBITER_CYCLE) return Promise.resolve(parseInt(process.env.FINAL_ARBITER_CYCLE, 10));
  const sheets = require('../lib/sheets');
  return sheets.getSheetAsObjects('World_Config').then((config) => {
    const row = config.find((r) => r.Key === 'cycleCount');
    if (!row) throw new Error('cycleCount not found in World_Config');
    return parseInt(row.Value, 10);
  });
}

function loadJson(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    return { __parseError: err.message };
  }
}

function validateLane(name, doc) {
  if (!doc) return { ok: false, reason: 'missing' };
  if (doc.__parseError) return { ok: false, reason: `malformed: ${doc.__parseError}` };
  const required = ['score', 'verdict', 'process', 'outcome', 'controllableFailures', 'uncontrollableFailures'];
  for (const key of required) {
    if (!(key in doc)) return { ok: false, reason: `missing field: ${key}` };
  }
  if (typeof doc.score !== 'number' || doc.score < 0 || doc.score > 1) {
    return { ok: false, reason: `score out of range: ${doc.score}` };
  }
  return { ok: true };
}

function validateCapability(doc) {
  if (!doc) return { ok: false, reason: 'missing' };
  if (doc.__parseError) return { ok: false, reason: `malformed: ${doc.__parseError}` };
  if (!doc.summary) return { ok: false, reason: 'missing summary' };
  const required = ['blockingFailures', 'process', 'outcome', 'controllableFailures', 'uncontrollableFailures'];
  for (const key of required) {
    if (!(key in doc.summary)) return { ok: false, reason: `summary.${key} missing` };
  }
  return { ok: true };
}

// G-W58 — timestamp/provenance integrity. A real reviewer run stamps a precise
// finalize time; a hand-assembled stub lands on a round "start of day / on the
// hour" value (C95 rhea_report = 2026-05-27T00:00:00.000Z, cycle_review =
// 2026-05-27T09:00:00Z). Prefer an explicit provenance.run_completed_at; fall
// back to the long-standing generatedAt so pre-provenance lanes still validate.
// Reject a PRESENT lane whose finalize timestamp is missing, unparseable, or an
// exact-hour / zero-second / zero-ms stub — a fabricated PASS must not feed the
// verdict. Real `new Date().toISOString()` essentially never lands on :00:00.000,
// so the false-positive risk is negligible.
function checkProvenance(doc) {
  if (!doc || doc.__parseError) return { ok: true }; // validateLane owns these cases
  const ts = (doc.provenance && doc.provenance.run_completed_at) || doc.generatedAt;
  if (!ts) return { ok: false, reason: 'no run timestamp (provenance.run_completed_at / generatedAt absent)' };
  const d = new Date(ts);
  if (isNaN(d.getTime())) return { ok: false, reason: `unparseable run timestamp: ${ts}` };
  if (d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0) {
    return { ok: false, reason: `stub run timestamp ${ts} — exact-hour/zero-second value indicates a hand-assembled lane, not a real run (G-W58)` };
  }
  return { ok: true };
}

// G-W4 (S256) — read the edition seal verify result (scripts/editionSeal.js).
// Detects operator hand-edits to the raw edition/articles between compile and
// the review lanes — edits NOT routed from a lane REVISE verdict. Flag-not-block
// (Mike's call S256): this does NOT change the A/B verdict; it stamps the run's
// measurement integrity so research-build doesn't mine a hand-edited hybrid's
// lane findings as raw-generation signal. Absent file (cycle pre-dates the gate,
// or the verify step was skipped) → 'unsealed' (advisory, non-blocking).
function readMeasurementIntegrity(cycle) {
  const p = path.join(OUTPUT_DIR, `edition_seal_verify_c${cycle}.json`);
  if (!fs.existsSync(p)) {
    return { status: 'unsealed', clean: null, checkpoint: null, unsanctioned: [],
      note: 'no edition_seal_verify file — seal/verify not run this cycle (G-W4 gate not exercised)' };
  }
  let v;
  try { v = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) {
    return { status: 'unsealed', clean: null, checkpoint: null, unsanctioned: [], note: 'edition_seal_verify unreadable' };
  }
  return {
    status: v.status || 'unsealed',
    clean: v.clean,
    checkpoint: v.checkpoint || null,
    unsanctioned: v.unsanctioned || [],
    note: v.status === 'contaminated'
      ? `${(v.unsanctioned || []).length} un-sanctioned pre-edit(s) detected at ${v.checkpoint} — lane signal measures a hand-edited hybrid, not raw generation (G-W4)`
      : (v.status === 'clean' ? 'raw generation intact through review lanes' : 'seal manifest absent at verify time'),
  };
}

function laneRecord(doc, weight, validOk) {
  if (!validOk) return { score: 0, weight, outcome: 0, process: 0 };
  return {
    score: Number(doc.score.toFixed(3)),
    weight,
    outcome: doc.outcome,
    process: Number((doc.process || 0).toFixed(3)),
  };
}

function quadrantFixPhrasing(lane, checkId, controllable, process, outcome) {
  if (!controllable && outcome === 0) {
    return `Environment blocker — file infrastructure ticket for ${checkId}, do not penalize the newsroom`;
  }
  if (controllable && outcome === 0 && process >= 0.7) {
    return `Reporter/desk needs to fix ${checkId} (high process, low outcome)`;
  }
  if (controllable && outcome === 0 && process < 0.7) {
    return `Rework the brief — ${checkId} is a systemic miss (low process, low outcome)`;
  }
  if (controllable && outcome === 1 && process < 0.7) {
    return `Lucky pass this cycle — flag ${checkId} for next-cycle briefing`;
  }
  return `Review ${checkId} in next-cycle briefing`;
}

function buildBlameAttribution(laneInputs, capability) {
  const entries = [];

  // Reasoning lane
  if (laneInputs.reasoning.ok) {
    const doc = laneInputs.reasoning.doc;
    for (const id of doc.controllableFailures || []) {
      entries.push({
        lane: 'reasoning',
        category: id,
        controllable: true,
        fix: quadrantFixPhrasing('reasoning', id, true, doc.process, doc.outcome),
      });
    }
    for (const id of doc.uncontrollableFailures || []) {
      entries.push({
        lane: 'reasoning',
        category: id,
        controllable: false,
        fix: quadrantFixPhrasing('reasoning', id, false, doc.process, doc.outcome),
      });
    }
  } else {
    entries.push({ lane: 'reasoning', category: 'missing-input', controllable: false, fix: 'cycle-review JSON invalid — check pipeline step logs' });
  }

  // Sourcing lane
  if (laneInputs.sourcing.ok) {
    const doc = laneInputs.sourcing.doc;
    for (const id of doc.controllableFailures || []) {
      entries.push({
        lane: 'sourcing',
        category: id,
        controllable: true,
        fix: quadrantFixPhrasing('sourcing', id, true, doc.process, doc.outcome),
      });
    }
    for (const id of doc.uncontrollableFailures || []) {
      entries.push({
        lane: 'sourcing',
        category: id,
        controllable: false,
        fix: quadrantFixPhrasing('sourcing', id, false, doc.process, doc.outcome),
      });
    }
  } else {
    entries.push({ lane: 'sourcing', category: 'missing-input', controllable: false, fix: 'Rhea JSON invalid — check pipeline step logs' });
  }

  // Result validity lane
  if (laneInputs.resultValidity.ok) {
    const doc = laneInputs.resultValidity.doc;
    for (const id of doc.controllableFailures || []) {
      entries.push({
        lane: 'resultValidity',
        category: id,
        controllable: true,
        fix: quadrantFixPhrasing('resultValidity', id, true, doc.process, doc.outcome),
      });
    }
    for (const id of doc.uncontrollableFailures || []) {
      entries.push({
        lane: 'resultValidity',
        category: id,
        controllable: false,
        fix: quadrantFixPhrasing('resultValidity', id, false, doc.process, doc.outcome),
      });
    }
  } else {
    entries.push({ lane: 'resultValidity', category: 'missing-input', controllable: false, fix: 'Mara JSON invalid — check pipeline step logs' });
  }

  // Capability gate
  if (capability.ok) {
    const summary = capability.doc.summary;
    for (const id of summary.blockingFailures || []) {
      entries.push({
        lane: 'capability',
        category: id,
        controllable: !(summary.uncontrollableFailures || []).includes(id),
        fix: `Capability gate blocking: ${id}. Edition must address before re-submit.`,
      });
    }
  } else {
    entries.push({ lane: 'capability', category: 'missing-input', controllable: false, fix: 'capability review JSON invalid — check pipeline step logs' });
  }

  return entries;
}

async function main() {
  const cycle = await resolveCycle();
  console.log(`Final Arbiter — Cycle ${cycle}`);

  const reasoningPath = path.join(OUTPUT_DIR, `cycle_review_c${cycle}.json`);
  const sourcingPath = path.join(OUTPUT_DIR, `rhea_report_c${cycle}.json`);
  const resultPath = path.join(OUTPUT_DIR, `mara_report_c${cycle}.json`);
  const capabilityPath = path.join(OUTPUT_DIR, `capability_review_c${cycle}.json`);
  const tierPath = path.join(OUTPUT_DIR, `tier_assignments_c${cycle}.json`);
  const rewardHackingPath = path.join(OUTPUT_DIR, `reward_hacking_scan_c${cycle}.json`);

  const reasoningDoc = loadJson(reasoningPath);
  const sourcingDoc = loadJson(sourcingPath);
  const resultDoc = loadJson(resultPath);
  const capabilityDoc = loadJson(capabilityPath);
  const tierDoc = loadJson(tierPath);
  const rewardHackingDoc = loadJson(rewardHackingPath);

  const laneInputs = {
    reasoning: { doc: reasoningDoc, ...validateLane('reasoning', reasoningDoc) },
    sourcing: { doc: sourcingDoc, ...validateLane('sourcing', sourcingDoc) },
    resultValidity: { doc: resultDoc, ...validateLane('resultValidity', resultDoc) },
  };
  const capability = { doc: capabilityDoc, ...validateCapability(capabilityDoc) };

  // G-W58 — fold the timestamp/provenance integrity check into lane validity.
  // A present-but-stubbed lane (fabricated PASS) is downgraded to invalid here,
  // so it can't contribute to the weighted verdict.
  for (const info of Object.values(laneInputs)) {
    if (info.ok) {
      const prov = checkProvenance(info.doc);
      if (!prov.ok) { info.ok = false; info.reason = prov.reason; info.provenanceReject = true; }
    }
  }

  // G-W59 — Mara (result-validity) is canonically external/operator-routed. A
  // MISSING file means the handoff hasn't happened yet (a workflow state), as
  // opposed to a present file that fails (a quality state). loadJson returns
  // null only when the file is absent on disk; a malformed present file yields
  // a __parseError and is treated as a real (HALT-worthy) failure, not pending.
  const maraPending = resultDoc === null;

  for (const [name, info] of Object.entries(laneInputs)) {
    if (!info.ok) console.warn(`  ⚠ ${name} lane: ${info.reason} (${name === 'reasoning' ? reasoningPath : name === 'sourcing' ? sourcingPath : resultPath})`);
  }
  if (!capability.ok) console.warn(`  ⚠ capability gate: ${capability.reason} (${capabilityPath})`);

  const lanes = {
    reasoning: laneRecord(reasoningDoc, WEIGHTS.reasoning, laneInputs.reasoning.ok),
    sourcing: laneRecord(sourcingDoc, WEIGHTS.sourcing, laneInputs.sourcing.ok),
    resultValidity: laneRecord(resultDoc, WEIGHTS.resultValidity, laneInputs.resultValidity.ok),
  };

  const weightedScore = Number(
    (lanes.reasoning.score * lanes.reasoning.weight +
      lanes.sourcing.score * lanes.sourcing.weight +
      lanes.resultValidity.score * lanes.resultValidity.weight).toFixed(3)
  );

  const blockingFailures = capability.ok ? (capability.doc.summary.blockingFailures || []) : [];
  const capabilityGate = {
    passed: capability.ok && blockingFailures.length === 0,
    blockingFailures,
  };

  const otherLanesValid = laneInputs.reasoning.ok && laneInputs.sourcing.ok;
  const allLanesValid = otherLanesValid && laneInputs.resultValidity.ok;

  // Verdict precedence (G-W59):
  //   1. PENDING-MARA/HOLD only when the in-pipeline lanes (reasoning, sourcing)
  //      are valid, the capability gate passed, and the ONLY thing missing is the
  //      external Mara handoff. Held for handoff, not failed for quality.
  //   2. Otherwise the standard A/B computation — an integrity failure (stub or
  //      malformed present lane) or a blocked capability gate takes precedence and
  //      lands B/HALT, so a fabricated lane or a content block is never "held."
  let verdict;
  let publishRecommendation;
  if (maraPending && otherLanesValid && capabilityGate.passed) {
    verdict = 'PENDING-MARA';
    publishRecommendation = 'HOLD';
  } else {
    verdict = capabilityGate.passed && weightedScore >= 0.60 && allLanesValid ? 'A' : 'B';
    if (verdict === 'A' && weightedScore >= 0.75) publishRecommendation = 'PROCEED';
    else if (verdict === 'A') publishRecommendation = 'PROCEED-WITH-NOTES';
    else publishRecommendation = 'HALT';
  }

  const blameAttribution = buildBlameAttribution(laneInputs, capability);

  // G-W4 (S256) — measurement integrity. Flag-not-block: does NOT alter verdict.
  // A contaminated run gets a blame entry naming the pre-edited files so the
  // contamination is visible to research-build (the lane findings this cycle
  // describe a hand-edited hybrid, not raw generation).
  const measurementIntegrity = readMeasurementIntegrity(cycle);
  if (measurementIntegrity.status === 'contaminated') {
    for (const u of measurementIntegrity.unsanctioned) {
      blameAttribution.push({
        lane: 'measurement-integrity',
        category: 'unsanctioned-pre-edit',
        controllable: true,
        fix: `${u.path} [${u.status}] edited between compile and ${measurementIntegrity.checkpoint} with no lane REVISE verdict — run lanes on raw output FIRST; fixes come only from lane findings (G-W4). Lane signal this cycle is contaminated.`,
      });
    }
  }

  // Phase 39.8/39.9 enrichment (S148) — include tier distribution and reward-hacking scan
  const tierSummary = tierDoc && tierDoc.summary ? tierDoc.summary : null;
  const rewardHackingSummary = rewardHackingDoc && rewardHackingDoc.summary ? rewardHackingDoc.summary : null;

  const output = {
    cycle,
    arbiterVersion: ARBITER_VERSION,
    generatedAt: new Date().toISOString(),
    verdict,
    weightedScore,
    // G-W59 — when maraPending, weightedScore reflects reasoning+sourcing only
    // (Mara's 0.2 is not yet available); it is NOT a final quality score.
    maraPending,
    lanes,
    capabilityGate,
    blameAttribution,
    publishRecommendation,
    measurementIntegrity,
    tierDistribution: tierSummary,
    rewardHackingScan: rewardHackingSummary,
  };

  const outputPath = path.join(OUTPUT_DIR, `final_arbiter_c${cycle}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`  verdict=${verdict}  weightedScore=${weightedScore}  gate=${capabilityGate.passed ? 'PASS' : 'BLOCK'}`);
  console.log(`  recommendation: ${publishRecommendation}`);
  console.log(`  measurement integrity: ${measurementIntegrity.status}${measurementIntegrity.status === 'contaminated' ? ` (${measurementIntegrity.unsanctioned.length} un-sanctioned pre-edit(s) — G-W4)` : ''}`);
  console.log(`  blame entries: ${blameAttribution.length}`);
  console.log(`  output: ${outputPath}`);

  if (publishRecommendation === 'HOLD') {
    console.log(`\nHOLD — Mara result-validity handoff not yet completed (PENDING-MARA).`);
    console.log(`  Reasoning + sourcing lanes valid, capability gate passed — this is a`);
    console.log(`  workflow state, not a quality failure. Route the Mara handoff, then re-run`);
    console.log(`  the arbiter to land a final verdict. Do NOT treat as HALT.`);
    process.exit(3);
  }
  if (publishRecommendation === 'HALT') {
    console.log(`\nHALT — edition should not publish. Blocking reasons:`);
    if (blockingFailures.length > 0) {
      for (const id of blockingFailures) console.log(`  - capability gate: ${id}`);
    }
    if (weightedScore < 0.60) console.log(`  - weighted score ${weightedScore} below 0.60 threshold`);
    if (!allLanesValid) {
      for (const [name, info] of Object.entries(laneInputs)) {
        if (!info.ok) console.log(`  - ${name} lane invalid: ${info.reason}`);
      }
    }
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Final Arbiter failed:', err);
  process.exit(2);
});
