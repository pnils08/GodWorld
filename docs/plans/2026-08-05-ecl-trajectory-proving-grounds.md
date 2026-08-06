---
title: ECL Trajectory Conditions + Proving Grounds Plan
created: 2026-08-05
updated: 2026-08-05
type: plan
tags: [engine, content-ledger, active]
sources:
  - docs/reviews/2026-07-22-event-content-ledger-grok-depth.md §A + backlog items 4/7
  - phase05-citizens/neighborhoodTrajectoryEngine.js — trajectory vocabulary (read live S356)
  - phase02-world-state/loadNeighborhoodState.js + loadEventContentLedger.js — the seam this extends
  - Live Event_Content_Ledger pool inventory, S356 (counts in §Findings)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (engine.79 items 4+7)"
  - "[[plans/2026-07-01-persistence-seams-content-ledger]] — the conditions micro-DSL this extends"
  - "[[adr/0015-world-config-tunable-values]] — where the exclusive-pool policy lives"
  - "[[index]] — registered same commit"
---

# ECL Trajectory Conditions + Proving Grounds Plan

**Goal:** (item 4) Content can be aimed at a neighborhood's *direction*, not just its level — decay reads differently from growth even at the same displacement number. (item 7) Two pools become ledger-native-only proving grounds — Baylight and the Tribune — with the hardcoded fallback switched off by policy, so the "additive-only means migration never finishes" problem gets its first counterexample.

**Architecture:** No new state computation anywhere. `neighborhoodTrajectoryEngine.js` already computes `NeighborhoodTrajectory` (`decay | steady | growth`) and `TrajectoryMomentum` (0–10, 5 neutral) per hood every cycle, and `loadNeighborhoodState.js` already loads both into `S.neighborhoodState`. The conditions DSL already resolves hood-scoped fields (`displacement` reads `S.neighborhoodState[hood].displacementPressure`). Item 4 is two DSL lines over data that already flows. Item 7 is a World_Config tunable (ADR-0015) plus a compose-time check — policy as config, not as content columns.

**Terminal:** engine-sheet for the DSL fields + compose check; content authoring stays with Mags (engine.97 precedent).

**Acceptance criteria:**
1. A row conditioned `hoodtrend=decay; momentum<=3` loads, and a citizen in a decaying hood draws it; the same citizen in a growth hood cannot.
2. `eclExclusivePools` listing `civic.baylight-construction` with ≥3 active eligible lines drops the hardcoded Baylight-domain entries from that citizen's pool; emptying the pool (Active=no) restores the hardcoded fallback — never compose-null.
3. A `tribune.newsroom` pool exists with ≥3 authored lines before the Tribune flag flips.
4. Content_Telemetry (engine.79 item 1, live) shows the proving-ground pools drawing after the flip.

---

## Findings

Read live 2026-08-05 (S356).

- **Trajectory is computed and loaded, but invisible to authors.** `NeighborhoodTrajectory` = `decay | steady | growth`; `TrajectoryMomentum` 0–10 (5 = neutral, distance from 5 = entrenchment). Both load into `S.neighborhoodState` every cycle. Zero ECL rows can see them.
- **The DSL's hood-scoped read path exists.** `displacement: { kind: 'num' }` already resolves per-citizen via `S.neighborhoodState[hood]`. The new fields ride the identical mechanism.
- **Pool inventory:** 68 distinct PoolKeys, 252 rows. `civic.baylight-construction` has 3 rows. No `tribune.*` pool exists; the Tribune's citizen texture is 1 hardcoded line (`generateCitizensEvents.js:2298`, "recognized by a stranger who'd read about them in the Tribune"). 15 rows carry an empty PoolKey — pre-existing data smell, flagged to engine-sheet, not this plan's work.
- **PoolKey mass balancing (item 3, S336) already groups by `eclPoolKey` at compose time** — the exclusive check lands in code that already iterates pools.

---

## Tasks

### Task 1: Two trajectory fields in the conditions DSL (engine-sheet)

- **Files:** `phase02-world-state/loadEventContentLedger.js` — modify
- **Steps:**
  1. `hoodtrend: { kind: 'enum', values: { decay: 1, steady: 1, growth: 1 } }` → reads `S.neighborhoodState[hood].trajectory`.
  2. `momentum: { kind: 'num' }` → reads `S.neighborhoodState[hood].trajectoryMomentum`.
  3. Missing hood / blank trajectory fails the term — fail-closed, consistent with the loader.
- **Deliberately NOT built:** per-citizen mood/intent *deltas*. They would need prior-cycle per-citizen snapshots (new columns, new persistence) — the neighborhood trajectory fields are the change signal the sim already computes. Citizen-delta vocabulary graduates to a task only if authored content demands it (fix-don't-add).
- **Verify:** `hoodtrend=decay; momentum<=3` loads; `hoodtrend=booming` rejected and counted in `skipped`.

### Task 2: Exclusive-pool policy — config + compose check (engine-sheet)

- **Files:** `phase05-citizens/generateCitizensEvents.js` — modify; World_Config — 2 rows
- **Steps:**
  1. World_Config tunables (ADR-0015; missing key = feature off, log once — not the 0.91 disease, absence of a policy is a valid state): `eclExclusivePools` (comma list of PoolKeys), `eclExclusiveMinLines` (default 3).
  2. Annotate ONLY the two proving-ground hardcoded blocks with their domain (Baylight-domain entries; the one Tribune line) — a marker on the pool-build entries, not a global retrofit.
  3. Compose check: for each pool named in `eclExclusivePools`, if that pool has ≥ `eclExclusiveMinLines` active *eligible* lines for this citizen, drop the matching-domain hardcoded entries from the draw pool. Below threshold → hardcoded stays (never compose-null; same fall-back-to-full-set shape as the item-5 fragment cap).
- **Verify:** acceptance 2; RNG call count unchanged when the feature is off.

### Task 3: Author the proving-ground + trajectory content (Mags)

- **Steps:**
  1. `tribune.newsroom` pool: ≥3 lines (the paper as citizens live it — reading it, being in it, arguing with it) so acceptance 3 holds before the Tribune flag flips.
  2. `civic.baylight-construction`: top up toward ~6 so exclusive mode has texture, not 3 lines on repeat.
  3. First trajectory-aimed rows: decay-band and growth-band lines (e.g. hood-neutral `hoodtrend=decay; momentum<=3` — watching the third storefront paper over its windows) so Task 1 ships with content that uses it.
- **Verify:** each new row loads 0-skipped; proving-ground pools ≥3 active lines each.

### Task 4: Flip and measure (engine-sheet, after 1–3)

- **Steps:** set `eclExclusivePools = civic.baylight-construction,tribune.newsroom`; watch Content_Telemetry for 2 cycles.
- **Verify:** acceptance 4; zero compose-nulls attributable to the flip. Then — and only then — extending the list pool-by-pool is a cell edit, which is the point.

---

## Changelog

- 2026-08-05 — Initial draft (S356, research-build). engine.79 items 4+7 design closed into this plan; execution engine-sheet + Mags authoring.
- 2026-08-05 — Tasks 1-3 SHIPPED (S357, engine-sheet, 27776f0a + sheet batch): DSL fields, tag-borne domain markers + compose check, World_Config seeded (pools empty = off), tribune 4 / baylight +3 / hood.trajectory 4 appended. OPEN: Task 4 flip after C103 smoke + 2 cycles.
