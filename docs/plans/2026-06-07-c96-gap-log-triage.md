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

**ES-1 — Fail-closed civic/citizen claim gates (marquee).** — **GATES 1+3 DONE S256 (`3d281c4`); GATE 2 DEFERRED.**
The root finding (G-S5): civic/citizen generation isn't mechanically bound to engine fields, so the model can write what the engine denies and no model-reviewer reliably catches it. Build the deterministic gate in `validateEdition` / compile:
- ✅ **Gate 1 (G-W1/W2)** — `checkQuotedSourcesResolve`: every attributed quoted speaker must resolve to a Simulation_Ledger POP-ID (the SL IS the citizen model — Mike-confirmed; mayor/council/athletes/civic directors all verified as SL rows). Calibrated FP-clean against the 38-edition corpus (name-token class kills possessives/contractions/acronyms; nameTokens resolves compound surnames; STOP/BARE/PLACES drop titles/orgs/places). WARNING severity; CRITICAL promotion is a follow-up once resolution policy locked + a recent edition runs clean.
- ⏸️ **Gate 2 (G-S5) — DEFERRED, not cleanly mechanizable.** "Flag civic assertions that cite no engine field+value" has two fuzzy halves ("civic assertion" + "cites a field" detection); a naive heuristic flags large amounts of legitimate prose, and as CRITICAL would noise-block the gate that matters. Needs a narrow deterministic subset (e.g. numeric neighborhood-metric claims cross-checked against engine state — overlaps `checkInitiativeFacts`) or a model-reviewer lane, not a regex gate. Re-file as its own scoped task.
- ✅ **Gate 3 (G-W6/W7)** — `ENGINE_TERMS` extended with data/reporting-layer phrases. 0 FP on corpus; CRITICAL via existing `checkEngineLanguage`.
- Source gaps: G-W1/W2 (✅ gate 1), G-W6/W7 (✅ gate 3), G-S5 (⏸️ gate 2 deferred). Pairs with pipeline.24 sift-side (assign POP-IDs / render in-world at brief time).

**ES-1 spin-off (architecture, surfaced S256 by Mike during the gate calibration) — citizen-store consolidation onto Simulation_Ledger.** The gate exposed that quoted names trace to multiple stores; the POP-ID-on-SL IS the canonical citizen model. Two design items fall out:
- **Generic_Citizens + Chicago_Citizens are DORMANT** (bypassed; not in active coverage). A citizen there who gets covered again should be PROMOTED onto Simulation_Ledger with a new POP-ID and the dormant row retired — not resolved in place. Generic_Citizens citizens "with history" are the migration candidates; Chicago still exists in-sim but is uncovered editorially. Net direction: migrate-on-coverage, then retire both dormant ledgers. (Files alongside engine.29 lifecycle/fame work.)
- **Cultural_Ledger is the bigger gap — it's actively used** and is a *separate tracking system* (CUL-IDs, fame events). Open question Mike raised: should cultural figures also exist on Simulation_Ledger, with a fame threshold promoting a sim citizen onto the cultural/fame track (ties to `citizenFameTracker` / engine.29 fame)? Design decision, not gate code.

**ES-2 — Engine detector hygiene + KONO CityDynamics crash.** — **DONE S256 (`b760188` + `e9f06c8`); 1 upstream follow-up filed.**
- ✅ **ES-2a (G-EC35)** — `detectRepeatingEvents` v1.1.0→v1.2.0: `stripErrorClauses()` drops comma-clauses carrying JS-exception grammar BEFORE tokenization, so a leaked stack trace can't surface as a civic ailment, while PRESERVING the civic clause in the same cell (errors-are-stories: the crash IS a story but lives in Engine_Errors/the crisis layer, not the civic corpus). Live @C96: emits the genuine "strain | civic inflow kono" pattern, 0 crash-token leaks. Tests 7+8, 18/18.
- ✅ **G-S6 structural (the "crash" framing was stale)** — the var-hoist CityDynamics crash was already fixed S247 (verified C96/S252). KONO's actual issue was a **dark Neighborhood_Map row** = a missing profile in `v3NeighborhoodWriter.NMAP` (silently skipped every cycle). Fixed in the S256 neighborhood-roster-alignment work (`e9f06c8`) — KONO profile added; **populates on next cycle after the phase08 deploy at C97**. Unblocks civic.13 G-PREP6.
- ⏸️ **Upstream follow-up (engine, clasp-gated → C97):** root leak is `phase01-config/godWorldEngine2.js:81` — `safePhaseCall_`'s catch pushes `'[' + phase + '] ' + error.message` into `ctx.summary.auditIssues`, which feeds `Riley_Digest.Issues`. Line 75 already builds a separate `Engine_Errors` msg, so the fix is to NOT also route the raw exception into `auditIssues` (the civic-digest feed) — or tag it so the digest writer excludes engine-error entries. ES-2a's strip is defense-in-depth; this is the source stop. File alongside the C97 phase08 deploy window.
- Source gaps: G-EC35 (✅), G-S6 (✅ via roster alignment).

### research-build track

**RB-1 — Skill gap-log automation + review-lane edit gate.** ✅ **Gap-log gate SHIPPED S256** (G-S1). Deferred: G-W4 edit-gate (separate, heavier — detector-at-Arbiter design).
- ~~Make the gap-log append a mechanical gated step / skill-close hook for heavy skills~~ → **DONE.** `scripts/gapLogGate.js` (dual-mode: `--cycle/--skill` in-skill self-check + `--stop-gate` blocking Stop-hook backstop). Wired into `hooks.json` Stop array; SessionStart stamps `.claude/state/session-start.txt` to window-bound the backstop. Close-gate step added to sift / write-edition / city-hall / city-hall-prep SKILL.md. Fail-open on error, `GAPLOG_GATE_OFF=1` escape hatch. The mechanical enforcement is the blocking Stop hook, not skill text — a written instruction can't enforce itself (that WAS G-S1).
- **RB-2 naming-reconcile folded in (Mike's call S256):** can't gate a path with 3 live forms. Pinned canonical = `output/production_log_run_cycle_c<XX>_gaps.md` (one-true-log, leg-per-skill: `## LEG: /<skill> (G-<prefix>)`). Updated GAP_LOG_TEMPLATE + GAP_LOG_TRIAGE_PLAYBOOK + the 4 skill destinations. Closes most of RB-2; RB-2's G-R1 city-hall-destination rewrite is included (city-hall now appends to the one-true-log).
- ✅ **G-W4 edit-gate SHIPPED S256** (was deferred). `scripts/editionSeal.js` (`--seal` hashes raw edition `.txt` + reporter `.md` → `output/edition_seal_c{XX}.json`; `--verify` re-hashes + diffs). Invariant: every sanctioned REVISE round re-seals the files it touched, so any verify-time mismatch is an un-sanctioned operator pre-edit. **Advisor-corrected checkpoint placement:** primary verify at first-lane entry (Step 3.25, before any lane consumes the files) — NOT only at Arbiter, which the normal REVISE-then-reseal flow would launder. Arbiter verify is the backstop. `finalArbiter.js` reads the verify result → stamps `measurementIntegrity: clean|contaminated|unsealed` + a `measurement-integrity` blame entry naming pre-edited files. **Flag-not-block (Mike's call S256):** detected pre-edit does NOT change the A/B verdict or halt the pipeline — it marks the run a contaminated measurement so research-build doesn't mine hand-edited lane findings as raw-generation signal. write-edition SKILL v2.3→v2.4, 4 seams wired (seal@3, verify@3.25, re-seal@4/4.1, backstop-verify@5.5). Detector (hash-diff) / framer (re-seal discipline + Arbiter stamp) split. **Advisor 2nd-pass caught a laundering hole in the first impl (committed a51dd7d) and it was fixed in 99e... (next commit):** a blanket re-seal re-blessed *every* divergent file, so a pre-edit followed by any REVISE round was laundered, and a single verify file let a later clean overwrite an earlier contaminated. Two fixes: (1) `revise:*` re-seal REQUIRES `--files` and blesses ONLY named files (un-named pre-edit stays off-seal → caught at next verify); (2) per-checkpoint verify files OR'd at the Arbiter (contamination sticky). Re-traced all 3 cases end-to-end on synthetic c99: disciplined→clean, pre-edit-before-first-lane+REVISE→contaminated, pre-edit-between-lanes+REVISE (the launder case)→contaminated; guard (revise without --files)→exit 2.
- Source gaps: G-S1 (done), G-W4 (deferred).

**RB-2 — City-hall gap-log destination → one-true-log + naming reconcile. ✅ DONE S256.**
- ✅ `city-hall` + `city-hall-prep` SKILL §Gap log append into `production_log_run_cycle_c{XX}_gaps.md` (G-R1) — shipped under RB-1's fold-in (S256, `849962b`).
- ✅ Naming reconciled in GAP_LOG_TEMPLATE + GAP_LOG_TRIAGE_PLAYBOOK — one-true-log canonical, sidecars retired (RB-1 fold-in).
- ✅ **pipeline.35 cross-link (residual, S256):** GAP_LOG_TEMPLATE §Migration now names the gap-log one-true-log as a member of the broader one-true-cycle-source family (prose sibling `production_log_c{XX}.md`); pipeline.35 plan Task 2 corrected — gap-log naming is no longer an open folder-layout question, the admin skill adopts the pinned convention rather than re-speccing a sidecar.
- Source gaps: G-R1.

**RB-3 — City-hall-prep input completeness. ✅ DONE S256.** `/city-hall-prep` SKILL v1.3→v1.4.
- ✅ City This Cycle digest formalized (G-PREP3): Step 1 reads `baseline_briefs_c{XX}.json`; Step 3 REQUIRES a `## City This Cycle` block in every packet — Mayor/citywide = world_summary citywide digest, neighborhood voices = snapshot-table pulse + baseline_briefs filtered by neighborhood. Independent of Mara's initiative-blind directive. Scope-discipline line keeps synthesized non-events reported as the modest delta they are.
- ✅ ROLLOUT §civic.* mechanical pull (G-PREP4): Step 0 grep of in-progress civic.*/infrastructure.*/canon.* rows + reconcile-don't-duplicate instruction (the C96 civic.14 miss → G-PREP1/G-R2 parallel-tracking failure).
- Source gaps: G-PREP3, G-PREP4.

## §5 Flag — not in either track, surface to operator

**G-W5 — Drive auth dead (`invalid_grant`). — RESOLVED S256.** NOT the service-account key (reads work) and NOT the operator's Jun-2 Gemini API key (red herring — bare API key, unused by Drive/Sheets). The dead credential was the OAuth2 `GOOGLE_REFRESH_TOKEN` for `saveToDrive.js` writes (separate auth from SA reads). Re-minted via `reauthorizeDrive.js`; `--test` confirmed round-trip; C97 publish unblocked. **Durable fix DONE S256:** operator published the OAuth consent screen Testing→In production (project godworld-486407) — refresh token now permanent; weekly re-auth recurrence eliminated (re-verified `saveToDrive.js --test` post-publish). G-W5 fully closed.

## Changelog
- 2026-06-07 — Triage filed (S252). One row → governance.*; phases execute per track.
- 2026-06-11 — **G-W4 edit-gate shipped (S256).** `scripts/editionSeal.js` seal/verify + `finalArbiter.js` `measurementIntegrity` stamp + write-edition v2.4 (4 seams). Detects operator pre-edits between compile and review lanes (hash-diff; re-seal-after-REVISE invariant); flag-not-block. Primary checkpoint at first-lane entry (advisor-corrected from Arbiter-only, which the REVISE flow launders). **governance.33 research-build track FULLY CLOSED** — RB-1, RB-2, RB-3, G-W4 all shipped. Remaining: ES-1, ES-2 (engine-sheet).
- 2026-06-11 — **RB-2 residual (pipeline.35 cross-link) shipped (S256).** GAP_LOG_TEMPLATE §Migration cross-links the gap-log one-true-log to the one-true-cycle-source family; pipeline.35 plan Task 2 corrected (gap-log naming settled, not an open question). RB-2 fully closed. Remaining in governance.33: ES-1, ES-2 residual, G-W4 edit-gate.
- 2026-06-11 — **RB-3 city-hall-prep input completeness shipped (S256).** SKILL v1.4: City This Cycle digest required in every packet (G-PREP3, baseline_briefs + world_summary, Mara-independent); Step 0 mechanical ROLLOUT §civic.* grep + reconcile (G-PREP4). Remaining in governance.33: ES-1, ES-2 residual, RB-2-residual (pipeline.35 cross-link), G-W4 edit-gate.
- 2026-06-11 — **RB-1 gap-log gate shipped (S256).** `scripts/gapLogGate.js` + Stop-hook backstop + SessionStart stamp + close-gate in 4 skills. RB-2 naming-reconcile folded in (one-true-log `production_log_run_cycle_c<XX>_gaps.md` pinned canonical; template + playbook + 4 skill destinations updated). G-W4 edit-gate deferred as a separate phase. Remaining in governance.33: ES-1, ES-2, RB-3, RB-2-residual (pipeline.35 cross-link), G-W4, G-W5 Drive-auth flag.
