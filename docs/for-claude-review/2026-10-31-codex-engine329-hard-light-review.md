---
title: Codex adversarial diff review of engine.329 hard-light context
created: 2026-10-31
updated: 2026-10-31
type: reference
tags: [engine, citizens, media, review, active]
sources:
  - output/codex/TASK-2026-10-31-engine329-hard-light-context.md
  - commit 41160fe3
  - output/engine-sheet/2026-10-31-e329-bench.log
pointers:
  - "[[../archive/for-claude-review/2026-10-31-codex-pipeline99-world-facing-review]] — F3 second paragraph, the attribution defect under review"
---

# engine.329 — hard-light context diff review

**Verdict: SHIP for the scoped engine.329 diff.** No finding in the two changed files produces a wrong output under the five named hunts. This is a source review plus three local Node suites and an isolated old-source regression check. The saved stage-36 bench receipt is supporting evidence for its planted two-row case; this review did not fire a Cycle or establish a PROD deployment.

## Hunt results

1. **Order — SHIP.** `phase05-citizens/processAdvancementIntake.js:532-540`: with a neutral row first, its update has `hard=false`. On the following hard row, `priorHard=false`, so both `usageType` and `context` take that hard row's values and `hard` becomes true. With hard first, `priorHard=true` on the neutral row; both fields retain the hard row's values. The ledger life line and queued log use the same selected `update.context` through `said152` (`:630-643`).
2. **Two hard rows and type-dependent readers — SHIP.** `phase05-citizens/processAdvancementIntake.js:508-540`: the second hard row starts from the pending count and still applies its own decrement; the first hard row's `context` and `usageType` stay attached to the single per-citizen life line. No later statement reads `ledgerUpdates[lr].usageType`; `isEmergenceUsage_` reads each local `usageType` before the update (`:473-500`), `paperFameRowDelta_(row)` reads the current Sheet row (`:411-413,548`), and `earnedCitationsByKey_` rereads each Sheet row, including its byline exclusion (`:1364-1386`). Thus a first `mentioned` hard row followed by a hard row of another admitted type does not change either row's count eligibility or paper-fame delta through the frozen field. The first-hard context is the stated tie break, rather than a latest-row selection.
3. **Famous citizen — SHIP.** `phase05-citizens/processAdvancementIntake.js:508-517,534-548`: every accepted row recalculates `isFamous` from the ledger, and `newUsage` uses that value and the current row's `hardLight`; neither reads the stored `usageType`. A famous citizen with a hard row followed by a neutral row retains the hard-line context, holds their count on the hard row, and gains one on the neutral row. `paperFameRowDelta_(row)` still scores each row separately (`phase07-evening-media/culturalLedger.js:116-123`).
4. **Interleaved family or ambiguous name — SHIP.** `phase05-citizens/processAdvancementIntake.js:480-500,554-580`: a `family-own-words` row sets `ledgerHits=[]` and never enters the ledger-update assignment, even when it shares a ledger citizen's name. A name with two ledger hits also never enters that assignment. Either row between an accepted hard and neutral row leaves the prior hard update intact; the later neutral row sees `priorHard=true` at `:532-540`. Family deduplication can mark a family row processed (`:450-463,481-485`), but it does not mutate the ledger update.
5. **Regression test and siblings — SHIP.** `scripts/engine304FamilyLottery.test.js:540-564` executes `processMediaUsage_`, asserts hard-first/neutral-second context and the `3 → 3` count, then asserts the first of two hard contexts and `3 → 1`. With the current test and `57cef469`'s engine source substituted only for `processAdvancementIntake.js`, this assertion fails: **59 passed, 1 failed**; with `41160fe3`, **60 passed, 0 failed**. The local `tierLadderState` and `sportsWeekCity` suites pass **52/52** and **138/138**. The sibling hard-light assertions inspect counts, life-line presence, or fame, and none asserts last-row context (`scripts/tierLadderState.test.js:130-185`; `scripts/sportsWeekCity.test.js:834-983`).

## Coverage and proof boundary

The new test does not execute neutral-first/hard-second, mixed hard `UsageType`s, a famous multirow case, or family/ambiguous rows between accepted rows; those outcomes above are source traces. Its `queueAppendIntent_` is a stub (`scripts/engine304FamilyLottery.test.js:234-254`), so it does not assert the queued log text; both outputs share `said152` in source (`phase05-citizens/processAdvancementIntake.js:635-643`). These are coverage limits, not observed wrong outputs. No sibling test requires last-row context.

The saved bench log reports one hard-light log row and one ledger line naming the sports piece, with UsageCount 3, after hard sports then neutral civic for POP-00023 (`output/engine-sheet/2026-10-31-e329-bench.log:9-16`). The candidate file's SHA-256 equals its entry in `output/engine-sheet/stage36-e329.sha256:60` (`6d949beb35500629e8fb71bfe4b6d233a69055c69d5821bc0c19c03dceb05c7e`). The receipt says stage 36 was restored to stage 35 afterward (`bench.log:17-22`); no live state or deployment was read here.

**Wiring card (source-derived):** `phase01-config/godWorldEngine2.js:668` calls `processAdvancementIntake_`; it calls `processMediaUsage_` (`phase05-citizens/processAdvancementIntake.js:126-147,368`). An unprocessed `Citizen_Media_Usage` row is resolved against the ledger name index, then its hard flag and selected context are held in `ledgerUpdates[lr]` (`:470-540`). The final update goes to `Simulation_Ledger.LifeHistory` and a `LifeHistory_Log` append intent (`:621-657`); `describeUsageContext_` is defined at `phase07-evening-media/mediaRoomIntake.js:577-584`. This is a static card because the TASK prohibits network calls, including the otherwise pre-approved model-generated wiring-card command.

**Final gate:** SHIP the scoped `41160fe3` change for the tested attribution defect. PROD admission and the other pipeline.99 F3 paragraph are outside this verdict. No code edits, network calls, live runs, or bench fires were made for this review.
