---
title: engine.312 Revision 2 plan recheck
created: 2026-10-25
updated: 2026-10-25
type: reference
tags: [engine, draft]
sources:
  - docs/archive/for-claude-review/2026-10-25-engine312-fame-plan-recheck-TASK.md
  - docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md
  - docs/archive/for-claude-review/2026-10-25-codex-engine312-plan-review.md
---

# engine.312 Revision 2 — Codex recheck

Target: plan `docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md:105-111`. **Final gate: HOLD** for a build from this plan until the FIX items below are specified. Source-only review; no bench, Sheet, model, canon, or live proof.

## P1 / R1 — FIX

- The six historical coverage types and the 75 own-byline, 35 shifted, C79 placeholder, and 60 other unlocated dispositions are now explicit (`plan:105-106`); blank light = neutral, own work = 0, and off-list = 0 close the arithmetic rule. The exception manifest is specified but not yet present.
- The claim that *each* allowed type is a printed naming by its writer is unsupported. The current Saturday binder emits only `featured`, `mentioned`, `quoted`, and only for printed filings (`scripts/cron-saturday-run.js:96-100,470-480,543-548`). Edition ingest explicitly leaves existing-citizen usage upstream and writes only `byline-published` (`scripts/ingestPublishedEntities.js:791-798,945-957,1419-1420`). Phase 11 copies arbitrary `Citizen_Usage_Intake.UsageType`, including allowed labels, without a print check (`phase07-evening-media/mediaRoomIntake.js:281-340`; `phase01-config/godWorldEngine2.js:876`). State the six-type historical treatment as the builder's trusted-sheet ruling, and specify provenance/exception handling for future Phase-11 rows; type alone cannot prove publication.

## P2 / R2 — FIX

- All pending Cycles, signed deltas per accepted row, one selected non-institution CUL row carried through the intent, and one clamped flush close the former last-row and stale-intent mechanisms (`plan:107`; current last-row/Processed behavior `phase05-citizens/processAdvancementIntake.js:442-526,551-569`; target rule `phase07-evening-media/culturalLedger.js:265-275`). Keep the fame predicate independent of the emergence predicate, whose unknown-type fallback is true (`processAdvancementIntake.js:262-271`).
- The 25 floor must cover **every already-famous citizen checked in Phase 5**, and a newly appended `roster` row, not only a citizen newly marked famous this Cycle. The current ladder checks every Famous row and brightens linked scores below 25 (`processAdvancementIntake.js:1345-1378,1265-1277`); R2 says “marked famous this Cycle,” while R3 starts a new row at paper total, which can be below 25 after own-work exclusions (`plan:107-108`). Specify one floor in the final existing-row calculation and in the pending append calculation.
- “Nothing else writes FameScore” needs the explicit Phase-5 dynasty exception: `generationalWealthEngine.js:3408-3423` appends an institution with its own FameScore. It is a separate new row, not the citizen's selected personal target; keep it out of paper aggregation and the re-base as R4 intends.

## P3 / R3 — FIX

- `sighting` +1, `roster` +0, full-tab `S.paperFameByPop`, and pending-create score in the append close the original cause and duplicate-intent defects in principle (`plan:108`; both callers `processAdvancementIntake.js:1265-1275`, `buildEveningFamous.js:552-557`). Apply the same manifest and identity resolution to the full-tab total as to Phase-5 deltas.
- A `roster` call still goes through the registrar's current CREATE and repeat paths, which set `LastSeenCycle` and `MediaCount` as though sighted (`culturalLedger.js:475-485,610-622`). R2 promises LastSeenCycle tracks sightings only (`plan:107`). Define those two cells for `roster` (and roster→sighting repeats); otherwise the administrative registration postpones fading and creates a false sighting count. The pending registry is keyed by name, while existing rows use `row:<n>` (`culturalLedger.js:443-445,649-659`); cover alias/repeated pending creates in the combined test.

## P4 / R4 — SHIP as a dry-run design; live apply HOLD

- Frozen two-tab input, per-CUL row classification and paper-row detail, one clamp on the signed sum, exactly-one frozen-cell Sentiment matching, neutral treatment of skipped grades, 25-bar crossings, checkpointed apply, and typed readback address the old re-base objections (`plan:109`; old review `docs/archive/for-claude-review/2026-10-25-codex-engine312-plan-review.md:36-45`). The manifest, dry run, builder go, apply, and readback are future evidence, not established by this plan review.

## Accumulator, downstream reads, R5, and scope — FIX

- Both runner paths put Phase5-Advancement before Phase7-Famous, then Phase10-ExecuteIntents and Phase11-MediaIntake (`godWorldEngine2.js:668,741,865-876,2385,2456,2560-2568`). `buildEveningFamous_` decays at entry and registers sightings at its end (`buildEveningFamous.js:99-100,552-560`), so a final flush after that loop has the normal-path inputs. The active FameScore cell writers found are Phase-5 `dimCulturalFame_`/floor and Phase-7 decay/registrar (`processAdvancementIntake.js:1220-1236,1275`; `culturalLedger.js:84-104,517-521`); Phase 11 copies usage into Citizen_Media_Usage and reads Cultural_Ledger for Media_Ledger (`mediaRoomIntake.js:281-340,663-705`).
- A flush *inside* the end of `buildEveningFamous_` is not guaranteed: `safePhaseCall_` catches a Famous-phase throw and continues (`godWorldEngine2.js:159-169,741,865-876`), so Phase 10 can persist Processed marks without the pending paper score. Put flush in a guaranteed post-Famous path or fail the Cycle before those marks persist; test that failure path in R5. The R2 partial-Phase-10 receipt does not cover this pre-flush loss (`plan:107,111`).
- The registrar's `newFame` also feeds direct `TrendTrajectory` and `CityTier` writes and the first-call update summary (`culturalLedger.js:553-596`). R3's “stale by at most the Cycle's paper delta” is false: decay, extra sightings, floor, and cap can also separate that value from the flush; repeat calls do not refresh the summary (`culturalLedger.js:447-467`). Specify final-value feeds or accurately label these derived values provisional. The actual fields are `S.culturalEntityUpdates`/`S.culturalEntityCreates`, not `S.culturalRegistrations` (`culturalLedger.js:584-596,662-675`). Keep any derived-cell repair behind the named scope gate from the first review.
- R5 covers the core arithmetic and caller orders (`plan:111`); add roster marker cells, existing/new-row floors, future Phase-11 typed rows, alias pending creates, and Famous-phase failure to its focused fixtures. UsageCount, tier ladder, Processed semantics, categories, and unrelated cultural writers remain outside this change (`plan:107-111`). No test was run in this review.

**Build gate:** once engine.301 is on PROD, amend R1 provenance, the all-famous/new-row floor, roster sighting markers, guaranteed flush, and derived-value limit; then begin the focused build. Bench waits for SANDBOX 1004 release, and live re-base waits for its separate dry-run and builder go (`plan:103,109-111`).
