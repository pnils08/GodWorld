---
title: Seed Deck Dead Readers Writers Plan
created: 2026-11-08
updated: 2026-11-21
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

## Read-before (2026-11-21, engine-sheet — Task 1)

Deck = v4.2, 18 columns A–R (`saveV3Seeds.js` `SEED_DECK_HEADERS`): `Cycle, SeedID, Desk, Class, Domain, Neighborhood, What, Why, Citizens, CitizenEvents, Businesses, OtherEntities, Magnitude, Trend, CycleStamp, SuggestedJournalist, SuggestedAngle, MatchConfidence`. No `SeedType`, `Priority`, `SeedText`, `Timestamp`.

1. **`scripts/citizen-signal-detector.js`.** Callers: none — no cron (`crontab -l`), no skill, no `require`. Refs are its own header comment, `routePatternSeeds` mention, `CODEBASE_MAP.md:370`, and the parked research.21 docs (ADR-0013, `plans/2026-06-29-citizen-signal-detector-build`, BACKLOG). Writes 20-col v3 rows (`:193`); `:214-215` throws `deck missing Cycle/SeedType` on the v4 deck — it cannot write a row today.
2. **`scripts/engine-auditor/routePatternSeeds.js`.** Callers: none in code, cron or skill; its own decay test is the only `require`. `DECK_HEADERS` `:161` is v3 (`Timestamp, Cycle, SeedID, SeedType, …`); `:671-672` throws on the v4 deck. Comment-only refs: `utilities/priorityEngine.js:284` (names it the one live consumer of `priorityScore` — stale once retired), `citizen-signal-detector.js:27,193`. Test file `scripts/engine-auditor/routePatternSeeds.decay.test.js` is the test-guard's (no edit without the builder's unlock).
3. **`phase10-persistence/compileHandoff.js`** (1,664 lines, 38 top-level names). Outside references to its names: `compileHandoffFromMenu` ← `utilities/godWorldMenu.js:51` (menu item, the only caller); `writeHandoffSheet_` ← a comment at `utilities/utilityFunctions.js:64`; `compileHandoff` ← changelog comments in `mediaRoomIntake.js:17`, `applyStorySeeds.js:25` (history, left) and the `Handoff_Output` schema in `scripts/auditSheetHeaders.js:127` (the header-audit test asserts that key, so the entry stays; live has no `Handoff_Output` tab — read 2026-11-21). No cycle-path caller; no other file calls any of its 38 names.
4. **`utilities/cycleRollback.js`.** Reads `Story_Seed_Deck` by header name (`Cycle` hits col A; `GeneratedCycle` skips with a log) — works on v4. Direct writes: `deleteRow` per row past the target (`:143`), plus Initiative_Tracker `setValues` `:193`, World_Config `cycleCount` `setValue` `:235` (the civic-office step only logs). Entry `rollbackToCycle78` / `previewRollbackToCycle78`: zero callers, editor-run only, target hardcoded to Cycle 78. On no §9 row.
5. **Maps.** `scripts/stubEngine.js` `:152` and `:177`/`:185` match `queue(Cell|Append|Range)Intent_` — not `queueBatchAppendIntent_`, the deck writer's call (`saveV3Seeds.js:136`). The `:96` constant-substitution line already includes `BatchAppend`.
6. **Other v3 deck readers (acceptance 2 sweep).** `scripts/validatePriorityEngine.js` `buildSeedIndex` reads `SeedType` / `SeedText` / `PriorityScore` by name — all absent on v4 — and its input `output/sift_proposals_c*.json` has 0 files; no cron, skill or code caller (the sift skill names it once as an example of reading by header name). `scripts/auditSheetHeaders.js` checked the deck against the v3.4 header (`Timestamp, Cycle, SeedID, SeedType, …`), so it reads the live deck as misaligned. `scripts/diagnoseRoutingMatcher.js` resolves `SeedType` or `Class` — reads v4. `utilities/bylineEngine.js:631` old names are a self-test fixture; `loadCycleCadence_` reads `Cycle` / `BylineCandidate` / `SuggestedJournalist` by name. Live deck header read 2026-11-21 = the 18 v4.2 columns exactly.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Read-before: every caller and reader of the three tools; `cycleRollback.js:143` against the v4 header | es | done 2026-11-21 — §Read-before |
| 2 | Stub map sees intent writes by tab name; manifest §9 rows for every remaining direct deck write | es | done 2026-11-21 — `stubEngine.js` matches `queueBatchAppendIntent_`; §9 rows for `migrateSeedDeckV4_` (schema-setup) and `cycleRollback.js` (operator + rmd). The regenerated reverse map names `saveV3Seeds_` as the deck writer and seven other tabs' batch-append writers it had missed (Story_Hook_Deck, Texture_Trigger_Log, Media_Ledger, WorldEvents_Ledger, WorldEvents_V3_Ledger, Faith_Ledger, Transit_Metrics) |
| 3 | Retire the two old-deck writers and the handoff tool (menu item, file, tab left frozen as history) | es | done 2026-11-21 — removed `citizen-signal-detector.js`, `routePatternSeeds.js`, `compileHandoff.js` and the Compile Handoff menu item; with them `validatePriorityEngine.js` (read-before 6). Header audit's deck entry set to v4.2. Stale comments (`priorityEngine.js`, `utilityFunctions.js`) and CODEBASE_MAP / BACKLOG rows trued. Left: two test files that load retired scripts (`routePatternSeeds.decay.test.js`, `validatePriorityEngine.contract.test.js`) — removal needs the builder's test unlock |
| 4 | Regenerate the maps; codex diff review; PROD | es | maps regenerated 2026-11-21; codex review and PROD next — the engine side is the menu item, one deleted Apps Script file and two comments |

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
- 2026-11-21 (engine-sheet) — Claimed on the builder's word ("Proceed on engine.341"). Tasks 1–3 done, Task 4 maps regenerated; review and PROD open.
