---
title: Births On The Record Plan
created: 2026-11-23
updated: 2026-11-23
type: plan
tags: [engine, active]
sources:
  - output/production_log_run_cycle_c117_gaps.md G-EC48
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.359"
---

# Births On The Record Plan

**Builder's words (2026-11-23):** "go on next gap items" — item 13 of the C117 gap list (the missing birth entries).

**Goal:** every milestone log row names its citizen and hood; every milestone line carries the in-world stamp; a newborn gets its own first log row; the scoreboard counts each birth once.

**Rows:** engine.359 · **Owner:** engine-sheet

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | `applyMilestone_` (`phase04-events/generationalEventsEngine.js`): Name + Neighborhood on the log row (were `''` on every milestone: Birth 8/8, Death 4/4, Retirement 10/11, Health 10/18, Recovery 3/4, Graduation 9/25 on live); the cell stamp from `inWorldStamp_` (was `"C" + cycle`, an S271 leftover the `/^Y\d+C\d+ — /` readers drop) | es | done |
| 2 | `createChildRow_`: queue the newborn's first log row (`born to <parent> in <hood>`), as other new citizens get one; readers already keep it off the parent's event | es | done |
| 3 | `scripts/engineAuditor.js` scoreboard: `born` counts the child's `born to` line only — the parent's line now carries this Cycle's stamp too and would double it | es | done |
| 4 | agy diff read; bench on a live sync (a birth landing is chance — the read is no regression + the rows if one lands); PROD | es | in progress |

## Acceptance

1. C118 live: every new milestone row on LifeHistory_Log has Name and Neighborhood; a birth leaves two rows (parent "welcomed…", child "born to…") and the scoreboard `born` equals the children born.
2. Harness (2026-11-23): parent cell `Y3C13 — [Birth] welcomed a new child`; parent row `["Y3C13","POP-90001","Serg Test","Birth","welcomed a new child","Fruitvale",117]`; child row `["Y3C13","POP-99999","Theo Test","Birth","born to Serg Test in Fruitvale","Fruitvale",117]`. Tests: engine302Marital, engine339Births, wakeOwedMilestone, engineAuditor integration and 7 more pass.

## Surfaced, not this job

- `createChildRow_` draws with `ctx._rng || function() { return 0.5; }` — a silent RNG fallback against the engine rule (every fallback throws). Its own read.
- Serg Cerrano's NumChildren is 2 with one ChildrenIds entry and a blank SpouseId — not traced.

## Changelog

- 2026-11-23 (engine-sheet) — Created and built from the C117 dig (G-EC48).
