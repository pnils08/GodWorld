---
title: Checker Reads Its Own Record Plan
created: 2026-11-22
updated: 2026-11-22
type: plan
tags: [engine, civic, active]
sources:
  - output/production_log_run_cycle_c117_gaps.md G-EC39
  - lib/initiativePhaseContract.js (PHASE_INTENSITY — the failing phases)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.357"
  - "[[2026-11-22-engine-out-of-the-sims-mouth]] — pipeline.115 (what the findings reach)"
---

# Checker Reads Its Own Record Plan

**Builder's words (2026-11-22):** "go on 5" — item 5 of the C117 gap list: the engine's checker counts the word "none" as a recurring problem, files a stalled program as an improvement, and lists one measurement twice.

**Goal:** the auditor (`scripts/engineAuditor.js` + `scripts/engine-auditor/`) files no finding from an empty value, never calls a fall into a failing phase an improvement, and files one shared measurement once — so city hall, the desks and Varek's journal stop receiving those three false findings.

**Rows:** engine.357 · **Owner:** engine-sheet

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | `detectRepeatingEvents.js` `tokenize`: drop "none" / "null" / "undefined" (Riley_Digest writes PatternFlag "none" on a quiet Cycle; C115–C117 all "none") | es | done |
| 2 | `detectImprovements.js` 1.2.0: a move into a failing phase (contract intensity < 0: stalled, blocked, suspended, defunded) from a non-failing one is type `setback`, severity `medium`, "fell back: A → B"; moves off `complete` stay improvements | es | done |
| 3 | `detectImprovements.js`: remedy measurements with the same field / expected / observed / verdict are one pattern, places and initiatives joined, `priorPatternTypes` listing every source | es | done |
| 4 | Readers of the new type: `civisJournal.js` table ("<program> fell from A to B."), `cron-civic-run.js` `ailmentPerception` (same record fact as improvement); summary counts it as an ailment (engineAuditor, buildWorldSummary — no change) | es | done |
| 5 | Proof: A/B on live sheets 2026-11-22 (old detectors from HEAD vs new, `runEngineAudit` with the same snapshot and prior; `engineAuditor.js` exports `loadSnapshot` / `loadPreviousAudits` for it). First live: the C118 audit, Sun 2026-11-29 | es | A/B done; live owed C118 |

## Acceptance

1. C118 audit: no `repeating-event` whose `recurringTokens` is only an empty value; every move into a failing phase is `setback`, none is `improvement`; no two `improvement` patterns share field + expected + observed — proven by reading `output/engine_audit_c118.json`.
2. A/B 2026-11-22 (live C117 sheets): old 16 patterns → new 14 — minus `repeating-event "none"`, minus the second RetailVitality measurement (now one, 18 hoods, INIT-007, from stuck-initiative + production-imbalance), three stalls `improvement` → `setback` (Youth Apprenticeship; Downtown Economic Revitalization and Ivy Hill Community Revitalization stalled by tonight's civic apply). Every other pattern identical. Enrichers run clean on `setback`.

## Surfaced, not this job

- `checkMitigators` gives a setback `gap: remedy-working` — the stalled program is read as its own mitigator. Its own read.
- The leftover-improvement measurement is the prior audit's number read a Cycle late (agy, pipeline.115 #4); its timing is unchanged here.
- `output/engine_audit_c117.json` is not regenerated (city hall and Varek already read it).
- Tests run at the builder's unlock 2026-11-23: `detectImprovements.test.js`, `detectRepeatingEvents.test.js`, `engineAuditor.integration.test.js`, `civisJournal.test.js` pass; full suite green.

## Changelog

- 2026-11-23 (engine-sheet) — Tests pass at the builder's unlock (detectors, auditor integration, civisJournal; full suite).
- 2026-11-22 (engine-sheet) — Created and built on the builder's "go on 5"; A/B on live C117 sheets.
