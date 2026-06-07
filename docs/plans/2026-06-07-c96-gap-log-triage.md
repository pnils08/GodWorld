---
title: C96 Gap-Log Triage
created: 2026-06-07
updated: 2026-06-07
type: plan
tags: [gap-log-triage, c96, governance, active]
sources:
  - output/production_log_run_cycle_c96_gaps.md (single one-true-gap-log; 5 legs: engine mechanical G-EC1–33, engine-sheet judgment G-EC34–38, civic G-R/G-PREP, media sift G-S, media write-edition G-W)
  - docs/plans/GAP_LOG_TRIAGE_PLAYBOOK.md (method)
pointers:
  - "[[GAP_LOG_TRIAGE_PLAYBOOK]] — method this follows"
  - "[[../engine/ROLLOUT_PLAN]] — single pointer row (governance.*)"
  - "[[2026-06-01-initiative-tracker-contract]] — civic.14 (folds G-PREP1/G-R2/G-R3)"
  - "[[2026-05-22-sift-v2]] — pipeline.24 (folds sift-leg residuals)"
---

# C96 Gap-Log Triage

38 gaps from one production run. C96 was the first live run of /sift v2.0, so most media-leg gaps are pipeline.24 Task-8 residuals, not new work. Folds dominate; genuinely-new work is 5 phases across two tracks.

## §1 Folds — already owned, no new tracking

| Gaps | Folds into | Forward task |
|------|-----------|--------------|
| G-PREP1, G-R2, G-R3 | **civic.14** | assembler shape-defect (reads InitiativeID/array shapes, trackerOwner dispatch), backfill dropped phases, routing keyword-map authority. Already explicitly folded in the gap log. |
| G-S7, G-W1 (sift-side), G-W6/W7 (sift-side), G-R5-durable | **pipeline.24 / sift-v2** | Step 1 inputs (anomaly file + dark-neighborhood scan); assign real POP-IDs to quote-slots in briefs; brief renders engine→in-world + error-anchored prompt variant; tracker-phase reconciliation rule (production-log wins over lagging tracker enum). |
| G-EC2–17, 21–29, 38 | **engine.8** | static header-drift literals — parked tech-debt, fire every cycle, not C96 regressions. |
| G-EC37, G-PREP2 | **engine.27** | wd-card daemon git-window hardening; initiative-card rebuild cadence tied to /run-cycle. |
| G-R1 | cross-link **pipeline.35** | one-true-log family (city-hall gap-log destination). Small skill-text fix below as RB-2 since pipeline.35's admin-skill build is larger/later. |

## §2 Already addressed / record / out-of-scope

- **Resolved in-cycle:** G-R5 (tracker contamination killed at source S251), G-S6 (KONO = FP1 in-slate), G-S2/S3 (epistemic, noted), G-S4 (sift run completed S252).
- **Record only:** G-EC34 (reactivation verified), G-EC36 (measurement baseline), G-W3/G-W7-discipline (operator over-edit — recorded behavior, not skill work).
- **Detector noise / out-of-scope:** G-EC1 (faith coverage observation), G-EC18 (approval-flat — G-PREP7 closed S249), G-EC19/20 (stuck false-positives from stale tracker, resolved), G-EC30–33 (V2-runtime — needs engine-run-log ingest, not built).

## §3 Cluster map — genuinely new

| Theme | Severity | Gaps | Track |
|-------|----------|------|-------|
| Fail-closed civic/citizen claim gates (marquee) | HIGH | G-S5, G-W1/W2 compile-side, G-W6/W7 gate-side | engine-sheet (ES-1) |
| Engine detector hygiene + KONO CityDynamics crash | HIGH | G-EC35, G-S6 structural | engine-sheet (ES-2) |
| Skill gap-log automation + no-edit-before-review gate | HIGH | G-S1, G-W4 | research-build (RB-1) |
| City-hall gap-log destination → one-true-log + naming | MED | G-R1 | research-build (RB-2) |
| City-hall-prep input completeness | MED | G-PREP3, G-PREP4 | research-build (RB-3) |

## §4 Phases

### engine-sheet track

**ES-1 — Fail-closed civic/citizen claim gates (marquee).**
The root finding (G-S5): civic/citizen generation isn't mechanically bound to engine fields, so the model can write what the engine denies and no model-reviewer reliably catches it. Build the deterministic gate in `validateEdition` / compile:
- Reject any quoted citizen name that does not resolve to a Simulation_Ledger POP-ID (G-W1/W2 — invention is the disqualifying contamination).
- Flag civic assertions that cite no engine field+value (G-S5).
- Flag in-world narration of the data/reporting layer ("reporting cycle", "data office", "logged error", "the fields the city monitors") — engine-language leaking onto the page (G-W6/W7).
- Source gaps: G-S5, G-W1, G-W2, G-W6, G-W7 (gate-side). Pairs with pipeline.24 sift-side (assign POP-IDs / render in-world at brief time).

**ES-2 — Engine detector hygiene + KONO CityDynamics crash.**
- `detectRepeatingEvents` must filter raw error-string tokens out of its issue-token corpus so a stack trace can't surface as a civic ailment (G-EC35 — the KONO "strain" false-positive was a fragmented crash trace).
- Fix the CityDynamics crash on KONO's `neighborhoodDynamics` (the only dark Neighborhood_Map row of 18) and populate the KONO row (G-S6 structural). Unblocks civic.13 G-PREP6 (KONO neighborhood profile).
- Source gaps: G-EC35, G-S6.

### research-build track

**RB-1 — Skill gap-log automation + review-lane edit gate.**
- Make the gap-log append a mechanical gated step / skill-close hook for heavy skills (sift, write-edition) — refuse to close until the gap section exists (G-S1 — the operator was the automation and skipped it).
- Hard-gate: no edition/article edits between compile and Final Arbiter except those routed from a lane's REVISE verdict (G-W4 — operator pre-editing destroyed the raw-generation measurement signal).
- Source gaps: G-S1, G-W4.

**RB-2 — City-hall gap-log destination → one-true-log + naming reconcile.**
- Rewrite `city-hall` + `city-hall-prep` SKILL §Gap log: append into the cycle's `production_log_run_cycle_c{XX}_gaps.md`, not a separate `_city_hall_run_gaps.md` sidecar (G-R1).
- Reconcile the naming convention in GAP_LOG_TEMPLATE + GAP_LOG_TRIAGE_PLAYBOOK (cycle-first vs skill-first order). Cross-link pipeline.35 (one-true-log family).
- Source gaps: G-R1.

**RB-3 — City-hall-prep input completeness.**
- /city-hall-prep injects a "City This Cycle" world_summary digest into every packet (Mayor citywide + per-voice neighborhood pulse), independent of Mara's initiative-centric directive (G-PREP3 — Mara is structurally blind to the live world_summary; this is a sim, not a civic-initiative sim).
- Step 0 mechanically greps ROLLOUT §civic.* and lists in-progress rows so the pressure-input can't be silently skipped (G-PREP4).
- Source gaps: G-PREP3, G-PREP4.

## §5 Flag — not in either track, surface to operator

**G-W5 — Drive service-account auth is dead (`invalid_grant`).** Every cycle's edition→Drive→Mara handoff is blocked, so the Final Arbiter can't land a verdict. Engine-sheet/infra re-auth (revoked/expired grant or clock skew); verify `saveToDrive.js` credentials. **Live publish blocker for C97**, not just C96.

## Changelog
- 2026-06-07 — Triage filed (S252). One row → governance.*; phases execute per track.
