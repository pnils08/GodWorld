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
  - "[[../engine/ROLLOUT_PLAN]] — engine.341, engine.355"
  - "[[../../output/production_log_run_cycle_c114_gaps]] — G-ES13"
---

# Seed Deck Dead Readers Writers Plan

**Builder's words (2026-11-08), on the engine.334 report:** on the maps missing the deck's writer: "more weak … trick code" · on the handoff reader: "more weak LLM … shit with old handoff crap"

**Goal:** every path that reads or writes Story_Seed_Deck is on the maps and works on the deck as it is; paths built for the old deck are gone.

**Rows:** engine.341, engine.355 · **Owner:** engine-sheet

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
| 3 | Retire the two old-deck writers and the handoff tool (menu item, file, tab left frozen as history) | es | done 2026-11-21 — removed `citizen-signal-detector.js`, `routePatternSeeds.js`, `compileHandoff.js` and the Compile Handoff menu item; with them `validatePriorityEngine.js` (read-before 6). Header audit's deck entry set to v4.2. Stale comments (`priorityEngine.js`, `utilityFunctions.js`) and CODEBASE_MAP / BACKLOG rows trued. Tests (builder 2026-11-21 "Remove the test guard"): the two test files for retired scripts deleted; the header-audit test's Test 6 repinned to the 18 v4.2 columns and checked against `SEED_DECK_HEADERS`; `Handoff_Output` out of the audit and its Test 3. Header-audit test 24 passed / 0 failed; live audit reads the deck aligned |
| 4 | Regenerate the maps; codex diff review; PROD | es | maps regenerated and agy review folded 2026-11-21 (no codex window up; agy took it). Bench SANDBOX 1004 @224: C117 PASS 180 s, 0 new Engine_Errors. **LIVE PROD stage 66** (2026-11-21): the menu item, two deleted Apps Script files (`compileHandoff.js`, `cycleRollback.js` for engine.355) and two comments; pull-back byte-identical to the benched manifest (DEPLOY_HISTORY §PROD stage 66) |

## engine.355 — the rollback-to-78 tool retired

**Builder's words (2026-11-21), on read-before item 4:** "Yeah that's crazy to have a script that deletes every week"

- **What it was.** `utilities/cycleRollback.js` (added 2026-01-30, `c8ad3b080`): `rollbackToCycle78()` — every row with Cycle > 78 deleted from 20-odd cycle-keyed tabs (Riley_Digest, LifeHistory_Log, Media_Ledger, Story_Seed_Deck, …), initiative votes after 78 reverted, `cycleCount` set to 78. Live is at C116. In the Apps Script project, so it sat in the editor's Run list.
- **Read-before.** Zero callers in code, menus, triggers, crons or skills (own grep + agy attack 5 on `b54210cb9`). No deploy or run-cycle doc names it as a rewind step. One live pointer: `scripts/cron-civic-gate.js` named it the UNDO PATH for a mis-applied civic decision — in its header and in the Discord alert a blocked apply sends — claiming it "restores the Initiative_Tracker from the pre-cycle snapshot". It reads no snapshot.
- **Done 2026-11-21.** File removed; the gate's header says no undo tool exists and the alert line ends at "no sheet write"; §9 row moved to the Deleted list; CODEBASE_MAP and ENGINE_TRUTH_MAP entries removed; stub maps and the Simulation_Ledger column map regenerated.
- **Live 2026-11-21, PROD stage 66.** The PROD pull-back holds no `utilities/cycleRollback.js` (manifest `output/engine-sheet/2026-11-21-e341/e341.sha256`, 166 files). Acceptance met.

## Acceptance

1. ENGINE_STUB_REVERSE names every live Story_Seed_Deck writer; SHEETS_MANIFEST §9 names every direct one.
2. No code path reads a v3 deck column.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| Diff review of `b54210cb9` | agy | `output/antigravity/2026-11-21-review-e341-seed-deck-dead-paths.md` | HOLD, 3 findings, all verified against the code. F1 (HIGH) false map writer: `stubEngine.js`'s whole-body intent clause, widened to batch appends, marked `recordMediaLedger_` a `Cultural_Ledger` writer — FIXED: the clause stays without `BatchAppend`; batch appends map by their own target tab only; regenerated map differs from the reviewed one by exactly that edge. agy's fix (drop the clause) checked and refused: it drops 14 more writers the clause catches today. F2 (HIGH) header-audit test fails on the v4.2 entry — FIXED: Test 6 repinned, 24 / 0. F3 (LOW) `Handoff_Output` entry — FIXED: out of the audit and the test. Attacks 1, 2, 4, 5 clean |

## Open questions

- None.

## Changelog

- 2026-11-08 (engine-sheet) — Created on the builder's word from the engine.334 report; findings 1–3 from the engine.334 wiring cards and G-ES13.
- 2026-11-21 (engine-sheet) — Claimed on the builder's word ("Proceed on engine.341"). Tasks 1–3 done, Task 4 maps regenerated; review and PROD open.
- 2026-11-21 (engine-sheet) — agy review folded: F1 fixed, F2/F3 wait on the test unlock.
- 2026-11-21 (engine-sheet) — Test guard removed on the builder's word; agy F2/F3 closed, the two orphaned test files deleted. Other header-audit flags logged as G-EC71. Open: sandbox proof, PROD.
- 2026-11-21 (engine-sheet) — engine.355 filed on the builder's word and built: the rollback-to-78 tool removed, the civic gate's false undo pointer cut. PROD push open.
- 2026-11-21 (engine-sheet) — Benched (SANDBOX 1004 @224, C117 PASS) and LIVE PROD stage 66. Acceptance 1 and 2 met; both rows done-pending-archive.
