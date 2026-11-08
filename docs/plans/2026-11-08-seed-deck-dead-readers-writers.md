---
title: Seed Deck Dead Readers Writers Plan
created: 2026-11-08
updated: 2026-11-08
type: plan
tags: [engine, seeds, cleanup, draft]
sources:
  - phase10-persistence/compileHandoff.js:297-325 (loadStorySeeds_ reads v3 SeedType/Priority/SeedText)
  - utilities/godWorldMenu.js:51 (Compile Handoff menu item)
  - scripts/citizen-signal-detector.js:231,238 (positional v3 deck write)
  - scripts/engine-auditor/routePatternSeeds.js:699,706 (positional v3 deck write)
  - phase10-persistence/saveV3Seeds.js:136 (deck append intent), migrateSeedDeckV4_ :74, :84
  - docs/engine/ENGINE_STUB_REVERSE.json, docs/engine/SHEETS_MANIFEST.md §9
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.341"
  - "[[../../output/production_log_run_cycle_c114_gaps]] — G-ES13"
---

# Seed Deck Dead Readers Writers Plan

**Builder's words (2026-11-08), on the engine.334 report:** on the maps missing the deck's writer: "more weak … trick code" · on the handoff reader: "more weak LLM … shit with old handoff crap"

**Goal:** every path that reads or writes Story_Seed_Deck is on the maps and works on the deck as it is; paths built for the old deck are gone.

**Rows:** engine.341 · **Owner:** engine-sheet

## Found (2026-11-08, engine.334 wiring cards, G-ES13)

1. **Maps miss the writer.** ENGINE_STUB_REVERSE lists no Story_Seed_Deck writer: it does not see `saveV3Seeds.js:136` (`queueBatchAppendIntent_` with the tab name) or the migrator's direct writes (`:74`, `:84`). SHEETS_MANIFEST §9 has no row for those, `cycleRollback.js:143`, `citizen-signal-detector.js:231,238` or `routePatternSeeds.js:699,706`.
2. **Two writers for the old deck.** `citizen-signal-detector.js` and `routePatternSeeds.js` write rows by position to the v3 header (`SeedType`) and their own header guards throw on the v4 deck. Neither is on a cron; nothing calls them but their own tests.
3. **Handoff tool.** `compileHandoff` is a sheet menu tool from the manual Media Room era (Handoff_Output tab + a Drive text file). Its seed reader keys v3 `SeedType` / `Priority` / `SeedText`, absent on v4, so every seed row drops. Nothing reads its output (`scripts/gdrive_fetch.js` is a one-off fetch of a broken `HANDOFF_Cundefined.txt`).

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Read-before: every caller and reader of the three tools; `cycleRollback.js:143` against the v4 header | es | not started |
| 2 | Stub map sees intent writes by tab name; manifest §9 rows for every remaining direct deck write | es | not started |
| 3 | Retire the two old-deck writers and the handoff tool (menu item, file, tab left frozen as history) | es | not started |
| 4 | Regenerate the maps; codex diff review; PROD | es | not started |

## Acceptance

1. ENGINE_STUB_REVERSE names every live Story_Seed_Deck writer; SHEETS_MANIFEST §9 names every direct one.
2. No code path reads a v3 deck column.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|

## Open questions

- None.

## Changelog

- 2026-11-08 (engine-sheet) — Created on the builder's word from the engine.334 report; findings 1–3 from the engine.334 wiring cards and G-ES13.
