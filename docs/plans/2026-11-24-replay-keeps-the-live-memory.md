---
title: Replay Keeps The Live Memory Plan
created: 2026-11-24
updated: 2026-11-24
type: plan
tags: [engine, governance, done]
sources:
  - output/antigravity/2026-11-24-review-engine364.md F2
  - phase01-config/godWorldEngine2.js replayCycle / dryRunCycle; utilities/cycleModes.js; docs/engine/SHEETS_MANIFEST.md §9
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.366"
  - "[[2026-11-23-hospital-record-reads-right]] — §New concepts C3, where this was found"
---

# Replay Keeps The Live Memory Plan

**Builder's words (2026-11-24):** "yes file the replay one, start arrests, we will do the replay job after"; then "go on the replay".

**Goal:** the two editor-only modes that promise no writes — `replayCycle` and `dryRunCycle` — cannot change the live world, and a replay on the sandbox opens on the memory of the Cycle before the one it replays.

**Rows:** engine.366 · **Owner:** engine-sheet

## What was read (2026-11-24)

| Thing | Found |
|---|---|
| Who calls them | Nothing in the repo: both are run by hand from the Apps Script editor |
| What they promise | replay: "Re-runs a past cycle using the same seed … writes will be logged but not executed"; dry run: "writes staged but not committed" |
| What holds | The write-intent executor, the census, the checkpoint and the carry-forward assert skip on either mode |
| What does not | ~50 direct writers (SHEETS_MANIFEST §9) carry no mode check — e.g. `updateNeighborhoodDemographics.js` writes Neighborhood_Demographics on a dry run; `savePreviousCycleState_` / `saveEveningSnapshot_` skip on dry run only, so a replay overwrites every carry-forward blob |
| Replay's memory | `loadCarryForwardBlob_` reads the newest blob on replay (target 0), not the replayed Cycle's |
| Replay with no stored seed | falls back to the Cycle number as the seed and compares anyway |
| Target | `getSimSpreadsheetId_` = Script Property SIM_SSID, else `DEFAULT_SIM_SSID` (the live sheet); the sandbox sets SIM_SSID to its own sheet |

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Both modes refuse the live sheet (`ctx.ss` id = `DEFAULT_SIM_SSID`), in `initializeReplayMode_` / `initializeDryRunMode_` before any phase runs | es | done |
| 2 | Replay with no stored seed throws instead of seeding from the Cycle number | es | done |
| 3 | Replay loads the memory below the replayed Cycle (`loadCarryForwardBlob_`, `seedCarriedSeedList_`) | es | done; the ring row read on replay is not written back to the prop |
| 4 | `savePreviousCycleState_` / `saveEveningSnapshot_` skip on replay as on dry run | es | done |
| 5 | Tests; bench: a live cycle fire on the sandbox unchanged (the modes are not on the fire path) | es | done — mode tests 7/7; bench fire C118 PASS, numbers = stage 78 |
| 6 | PROD push | es | LIVE stage 79 @214 |

## Acceptance

1. A replay or dry run aimed at the live sheet throws before Phase 1 writes anything — proven by test against a stub ss with the live id.
2. The ordinary Cycle fire is unchanged — bench fire PASS.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| agy engine.364 F2 | agy | [[../../output/antigravity/2026-11-24-review-engine364]] | the finding this plan answers |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | Gate the two modes off the live sheet rather than gate ~50 writers | es | §What was read; reversible, keeps both tools on the sandbox |

### Needs proof

| # | Claim | Proof that settles it |
|---|---|---|
| N1 | No live path calls either mode | grep (done: none in phase*, utilities, lib, scripts, dashboard) + bench fire unchanged |

### New concepts

| # | Concept | Status |
|---|---|---|
| C1 | Make dry run truly write-free (a mode check on every direct writer) | held: only if the builder wants dry runs on live |

## Changelog

- 2026-11-24 (engine-sheet) — Plan written on "go on the replay".
- 2026-11-24 (engine-sheet) — Tasks 1–4 built; `scripts/cycleModesOffLive.test.js` 7/7; carry tests pass.
- 2026-11-24 (engine-sheet) — Bench fire PASS; LIVE stage 79 @214. Done.
