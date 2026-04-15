---
title: Reviewer Lane Schema
schema_version: 1
status: active
phase_tag: 39.6
related:
  - docs/engine/PHASE_39_PLAN.md
---

# Reviewer Lane Schema (Phase 39.6)

The contract every reviewer lane JSON must satisfy. Lands with 39.6
as scaffolding; 39.2 (Rhea), 39.4 (cycle-review), 39.5 (Mara), and
39.7 (Final Arbiter) each adopt it when they produce their JSON.

## The four fields

Every lane output includes, at the top level of its JSON:

| Field | Type | Meaning |
|---|---|---|
| `process` | number, 0.0–1.0 | Fine-grained rubric score — how well the lane's sub-goals executed. Continuous. |
| `outcome` | 0 \| 1 | Binary judgement — did the final artifact land? For capability: `1` iff no blocking failures. For narrative lanes: `1` iff the reviewer would call the edition complete on this lane's axis. |
| `controllableFailures` | string[] | Failure IDs the newsroom can fix. Hallucination, intent mismatch, reasoning errors, insufficient effort, execution errors. |
| `uncontrollableFailures` | string[] | Failure IDs caused by environment. Sheet read failed, MCP timeout, missing citizen card because taxonomy hasn't shipped, canon source not yet ingested, grader key missing. |

## Four-quadrant interpretation

|   | Outcome = 1 | Outcome = 0 |
|---|---|---|
| **High process** | working as designed | environment blocker — fix the system, not the reporter |
| **Low process** | lucky — flag for next cycle | real failure — fix the reporter or the brief |

The Final Arbiter (39.7) reads these quadrants to attribute blame
correctly: a high-process/low-outcome failure routes to the
environment-fix path, not the reporter-fix path.

## Classification rubric

A failure is **uncontrollable** if any of these are true:
- Detector/module failed to load (code-level plumbing issue)
- Detector threw at runtime (unexpected state in input data)
- Dependency deferred (grader key missing, sheet not yet populated)
- Required canon/taxonomy has not shipped yet (known open phase)

Otherwise the failure is **controllable** — the newsroom has the
means to resolve it in the current cycle.

The capability reviewer uses `detectorVersion ∈ {load-error, runtime-error}`
as the uncontrollable signal today. Narrative lanes (39.2/39.4/39.5)
will surface their own signals; each lane owner documents theirs in
an "Uncontrollable signals" subsection of its RULES.md.

## Aggregation at the summary level (capability reviewer)

The capability reviewer summary aggregates across all assertions:
- `process` = passed / total, rounded to 3 decimals
- `outcome` = 1 if `blockingFailures.length === 0` else 0
- `controllableFailures` = failure IDs classified as controllable
- `uncontrollableFailures` = failure IDs classified as uncontrollable

Narrative lanes report these fields per-article and per-lane; the
Final Arbiter folds them into `weightedScore = 0.5·reasoning +
0.3·sourcing + 0.2·resultValidity` with the capability gate acting as
a separate halt-or-proceed check.

## Source

Process/outcome split and controllable/uncontrollable distinction
are verbatim from the Microsoft UV paper §3.2–3.3
(`docs/research/papers/Microsoftpaper.pdf`). The four-quadrant table
is this project's framing of Microsoft §3.4.
