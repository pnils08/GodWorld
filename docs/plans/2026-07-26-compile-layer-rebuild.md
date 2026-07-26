---
title: Compile-Layer Rebuild Plan (engine.76)
created: 2026-07-26
updated: 2026-07-26
type: plan
tags: [engine, pipeline, compile, active]
sources:
  - docs/engine/archive/ROLLOUT_PLAN.md — engine.76 row
  - docs/engine/archive/ENGINE_REPAIR.md §engine.76 — the S328/S329/S332 narrative this plan replaces as the row's home
  - claude-mem S328 (Mike's original 4-consumer design), S329 (W5 definition), S332 (W5 half 1 ship)
pointers:
  - "[[../engine/archive/ROLLOUT_PLAN]] — parent rollout (engine.76)"
  - "[[../engine/archive/ENGINE_REPAIR]] §engine.76 — prior narrative, kept for trail"
  - "[[2026-07-20-headless-newsroom-pipeline]] — research.25; its Phase 2 daily writer-wakes consume W5's signal partition"
  - "[[../research/2026-07-11-desk-slice-fork]] — pipeline.44; the fork W5 feeds and W4 waits on"
  - "[[SCHEMA]] — doc conventions"
  - "[[../index]] — registered same commit"
---

# Compile-Layer Rebuild Plan (engine.76)

**Goal:** Finish the compile layer — ship the byline candidate + rotation half of W5 so the engine assists WHO writes each piece, then consolidate the two coexisting pipeline stacks once the fork has proven itself.

**Architecture:** The cycle's compile step emits deterministic artifacts, one per consumer (media = `world_summary`, cron = `world_state.json`, civic = initiative packets, audit = JSONs). W1–W3 shipped those four. W5 splits into two halves: half 1 (shipped) partitions the cycle's signal by desk lane as pointers; half 2 (open) adds a per-beat byline candidate drawn from the canonical 31-name staff roster with usage-weighted rotation. W4 (open, gated) retires the old desk-packet stack after the fork proves — as a side skill built alongside, never by repurposing in-use pipeline files.

**Terminal:** Design research-build → build engine-sheet.

**Pointers:**
- Signal-partition writer (W5 half 1, shipped): `scripts/buildWorldSummary.js` v2.1.0 — emits `output/desk_signal_c{N}.json` as a sibling; `world_state` carries a `deskSignal` pointer
- Staff roster: `Bay_Tribune_Oakland` sheet tab, 31 POPID-linked staff; reader is `scripts/engine-auditor/bayTribuneRoster.js`
- Beat map: `.claude/agents/REPORTER_DESK_INDEX.md` + the per-reporter voice files
- Rotation history: `output/byline_shadow_log_c{N}.json` (one per cycle)
- Live WHO-assist seam: `phase07-evening-media/buildContractSeeds.js` → `suggestStoryAngle_` (see Open questions — the v3/v4 seam)
- Fork consumer: `/desk-slice` reads the desk-lane partition

**The locked rule (Mike-direct S329):** the engine assists **WHO writes**, never **WHAT**. Stories and angles stay desk-side. The charge rule holds — pointers, never pre-assembled data.

**Acceptance criteria:**
1. A cycle run emits a per-beat byline candidate for each desk lane, drawn only from the `Bay_Tribune_Oakland` roster, with the candidate's POPID resolved.
2. Across three consecutive cycles the candidate set rotates — a journalist used in cycle N is penalised in N+1, and the count of never-routed staff falls from its current ~14.
3. `byline_shadow_log_c{N}.json` shows a non-zero engine-suggested rate (C101 baseline: 8/8 `engine_silent`, i.e. assignments were pure habit).
4. No story, angle, or subject is emitted by the engine — only a name per beat. A run that emits an angle fails this plan.
5. W4 only: the side skill produces a desk slice end-to-end without any in-use pipeline file being modified, and the old stack still runs unchanged alongside it.

---

## Tasks

### Task 1: Resolve the WHO-assist seam (blocks Task 2)

- **Files:**
  - `phase07-evening-media/buildContractSeeds.js` — read
  - `phase10-persistence/saveV3Seeds.js` — read
- **Steps:**
  1. Trace which code path actually reaches the live v4 deck. research.25 recorded a stale-seam finding: the live WHO-assist is `buildContractSeeds`/`suggestStoryAngle_`, and the Engine B v3 path never reaches the v4 deck.
  2. Write the answer into this plan's Open questions section as resolved, naming the function that owns the candidate write.
- **Verify:** the named function appears in a cycle-run trace, not just in source
- **Status:** [ ] not started

### Task 2: Beat map — roster to desk lane

- **Files:**
  - `scripts/engine-auditor/bayTribuneRoster.js` — read
  - `.claude/agents/REPORTER_DESK_INDEX.md` — read
- **Steps:**
  1. Build the beat map: each of the 31 roster staff → one or more desk lanes, sourced from `REPORTER_DESK_INDEX.md` and the voice files. Editorial-desk seats are excluded from candidacy.
  2. Record which roster names have no beat — those are the never-routed staff the rotation is meant to reach.
- **Verify:** every one of the 31 roster rows is either mapped to a lane or explicitly listed as unmapped, with a reason
- **Status:** [ ] not started

### Task 3: Usage-weighted candidate selection

- **Files:**
  - the function named in Task 1 — modify
- **Steps:**
  1. For each desk lane in the signal partition, select a candidate: beat match, weighted down by that journalist's usage count across the `byline_shadow_log_c{N}.json` history.
  2. Least-used breaks ties. Cap the usage penalty — an uncapped penalty produced a full blackout (35/35 blank) at C105 during the S329 rotation work; that regression is the known failure mode here.
  3. Emit the candidate as a name + POPID only. No angle, no subject, no story.
- **Verify:** bench-run three consecutive cycles → candidates rotate, no blank lanes, no angle field emitted
- **Status:** [ ] not started

### Task 4: Prove rotation on the bench

- **Files:**
  - none — bench run only
- **Steps:**
  1. Run three consecutive bench cycles.
  2. Read `byline_shadow_log_c{N}.json` for each: confirm engine-suggested rate is non-zero and the candidate set changes cycle to cycle.
- **Verify:** never-routed count falls; zero blank lanes across all three cycles
- **Status:** [ ] not started

### Task 5 (W4, GATED): two-stack consolidation side skill

**Gate: the fork must prove first (pipeline.44). Do not start this task before that.**

- **Files:**
  - a new side skill — path to be decided at gate time; explicitly NOT an edit to any in-use pipeline file
- **Steps:**
  1. Build the desk-slice-shaped side skill alongside the existing stack. Fork slices are a different shape from desk packets; do not repurpose the packet builders.
  2. Run both stacks in parallel for at least one cycle.
  3. Retire the old stack whole — only after the side skill fully proves. No partial retirement.
- **Verify:** both stacks produce output for the same cycle; the old stack is byte-unchanged
- **Status:** [ ] blocked — gated on fork proof

---

## Open questions

- [ ] Which function owns the live candidate write — `suggestStoryAngle_` or the v4 deck path? Blocks Task 2. (Task 1 resolves this.)
- [ ] Does the byline candidate belong in `desk_signal_c{N}.json` alongside the lane pointers, or in a sibling artifact? Blocks Task 3's emit target.

---

## Changelog

- 2026-07-26 (S334) — Initial draft. Carries engine.76's open work (W5 half 2, W4); shipped-wave narrative stays in ENGINE_REPAIR §engine.76.
