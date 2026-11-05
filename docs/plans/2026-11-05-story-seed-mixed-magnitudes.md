---
title: Story Seed Mixed Magnitudes Plan
created: 2026-11-05
updated: 2026-11-05
type: plan
tags: [engine, media, story-seeds, draft]
sources:
  - output/production_log_run_cycle_c114_gaps.md G-ES3 (engine-sheet, found during the engine.331 trace)
  - phase07-evening-media/buildContractSeeds.js:426-440 (cluster key), :455-465 (sum), :489 (major gate), :89-95 (contractSeedIsMajor_), :560-575 (What line, magnitude)
  - output/beats/Story_Seed_Deck.jsonl C114 rows (the examples below)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.334"
  - "[[2026-11-05-sports-feed-triggers]] — engine.331, where this was found"
---

# Story Seed Mixed Magnitudes Plan

**Builder's words (2026-11-05):** "note the “outside the job” as its own plan with a pointed on rollout , we will take that job after the 2 you have queued already , just whatever you have on it now with the note to review deeper when plan picked up"

**Goal:** a story seed's `What` line and its major/texture class reflect quantities that can be added together, so a seed never reports a city-mood change that is really a citizen head-count.

**Rows:** engine.334 · **Owner:** engine-sheet · **Sequence:** after engine.331 and engine.332 (builder 2026-11-05)

**Stub — review deeper when picked up.** What follows is what the engine.331 trace saw, nothing more. Picking this up starts with Task 1; the plan is then filled to the template before any cut.

## What was seen (2026-11-05)

- `buildContractSeeds_` clusters the Cycle's ripples by `causeType | hood` (`buildContractSeeds.js:426-440`) and sums `rp.magnitude` across the whole cluster whatever each ripple's `effectType` is (`:455-465`). The sum is printed as the seed's `What` (`:560-565`), stored as its `magnitude` (`:574`), and decides major vs texture (`:489` → `contractSeedIsMajor_` `:89-95`, major at |m| ≥ 3).
- C114 sports seed `fd4277fa`: `What: sentiment +36.06 (4 related effects this cycle)` = sentiment 0.006 + aftermath 0.052 + game-night 35 citizens + household 1. The head-count makes the seed `major`.
- Same shape on other C114 seeds: `approval/district-sentiment -5 (8 related effects)`, `sentiment/communityEngagement/nightlife +2.6 (3)`, `traffic/retail/nightlife/publicSpaces/communityEngagement/culturalActivity +0.05 (2)`, `fold-applied/initiative-implementation +0.11 (2)`, `tier-climb +0.15 (3)`.

## Not traced (Task 1 owns these)

- Which effect types share a cluster across a normal Cycle, and which of them are counts vs rates vs dial deltas.
- Every reader of a seed's `magnitude` and `Class` (desk slices, sift, `saveV3Seeds.js`, cron packets) — what changes for them if the sum changes.
- Whether the fix is per-effect-type figures in `What`, a class gate on the largest comparable effect, or both.
- Overlap with engine.332 (media-feedback seeds that never reach the same deck).

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Read-before: `buildContractSeeds_` end to end, wiring card on it and on `Story_Seed_Deck`, every reader of seed `magnitude` / `Class`, a C110–C114 count of mixed-unit clusters. Fill this plan to the template (tasks, acceptance) | es | not started |

## Acceptance

1. To be written at Task 1.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|

## Open questions

- None yet; Task 1 finds them.

## Changelog

- 2026-11-05 (engine-sheet) — Created as a stub from the engine.331 trace (G-ES3); builder: own plan, after engine.331 and engine.332, review deeper when picked up.
