---
title: Codex engine.333 engine-cut final rereview
created: 2026-11-07
updated: 2026-11-07
type: reference
tags: [engine, sports, citizens, review, active]
sources:
  - docs/for-claude-review/2026-11-07-brief-engine333-engine-cut-rereview.md
  - docs/archive/for-claude-review/2026-11-07-codex-engine333-engine-cut.md
  - docs/plans/2026-11-05-feed-triggers-to-life-history.md
  - phase05-citizens/applyGameNightMoments.js
  - scripts/gameNightMoments.test.js
pointers:
  - "[[../plans/2026-11-05-feed-triggers-to-life-history]] — owning plan; source disposition for the fold"
  - "[[README]] — review inbox contract"
---

# engine.333 Task 2b — final rereview of `d9f6a7dfa`

**Verdict: SHIP for the source fold over `f1b53151f`.** F1 and F2 are closed, the ambulance-overlap receipt is suppressed, and the engine-owned Bio sentence replaces cleanly when its role contains an abbreviation. I found no new sim-visible regression in the four requested items. Bench-2 C115 passed and its readback is consistent with the source; C116 was still running at review time. This is not a PROD claim. No code changed in this review.

| Brief item | Result | Source evidence and effect |
|---|---|---|
| 1. Active injury gate, including blank Status | **HOLDS; F1 closed** | `applyGameNightMoments.js:307-316` returns before Status/cause mutation or receipt for `detained`, `Retired`, `traded`, `pending`, or any other non-health, non-Active Status. The type and trigger lines still write at `:474,492-495`; the detained fixture asserts unchanged Status/clock/cause, zero receipts, and the ripple reason at `gameNightMoments.test.js:316-325`. Input `detained` → no `priorStatus=detained` intake reaches the Phase-10 rejection at `buildCyclePacket.js:955-960`. Blank Status is admitted as Active by the health engine (`generationalEventsEngine.js:394-396`); this route likewise stamps it, with blank priorStatus, which the writer permits. The C114 local snapshot has zero blank Status rows, so the blank case is source consistency, not a current Sheet observation. |
| 2. Existing ambulance intake | **HOLDS; duplicate-receipt path closed** | Phase-4 ambulance constructs `popId`, `cycle`, and `kind: 'intake'` for an Active/blank target at `chaosCarsEngine.js:530-550`, then pushes it into `S.hospitalEvents` at `:807-812`. GameNight runs later (`godWorldEngine2.js:609,623`). `sportsBedAlreadyFiled_` compares precisely those fields, coercing pop and Cycle at `applyGameNightMoments.js:294-299`, and `sportsInjure_` returns before changing the ambulance's Status/cause or pushing a second receipt at `:316-335`. The fixture at `gameNightMoments.test.js:326-343` covers the branch; its mock sourceSystem/SourceEventId differ from the real ambulance values, but the helper does not inspect either. A recovering target produces an ambulance **transition**, not an intake (`chaosCarsEngine.js:542-550`), so this check does not suppress a later feed intake; the existing-bed writer still keeps one open POPID row (`buildCyclePacket.js:938-978`). |
| 3. GAME clock without override key | **HOLDS; F2 closed** | `sportsRetire_` now requires GAME and Active/blank Status at `applyGameNightMoments.js:273-289`; an ENGINE/SPORTS_OVERRIDE or GAME/Retired row gets only the EventType line and a logged skip at `:488-491`, as `gameNightMoments.test.js:258-268` asserts. A GAME/Active row with a blank key flips to ENGINE; `isSportsLayerRow_` explicitly treats GAME as sufficient even without the key (`educationCareerEngine.js:404-407`). The C114 disk snapshot contains two such Oaks rows (`POP-01223`, `POP-01224`), so requiring SPORTS_OVERRIDE would miss real sports-layer rows. The brief's POP-00527 GM example has SPORTS_OVERRIDE in that snapshot; the underlying GAME-only case still stands. The three ENGINE/SPORTS_OVERRIDE/Retired MUBA rows remain a separate recorded state gap; this fold no longer gives them a second retirement. |
| 4. Bench-2 contradiction check | **HOLDS for C115; C116 pending** | `output/engine-sheet/2026-11-07-e333-bench-2.log:4-6` identifies `d9f6a7dfa`, reports a byte-identical pullback, and records `fire C115 rc=0 "verdict": "PASS"` at `:24`. The newly appended `e333-f1` read in `output/engine-sheet/2026-11-07-e333-reads.jsonl` has Cycle 115, zero Engine_Errors, one Retirement log row each for Vinnie and the bench retiree, both ENGINE/Active with blank override keys and `Now:` Bio heads, and the bench injuree injured with start 115. This does not exercise the folded detained/ambulance/half-state edges. The C116 fire and new `e333-f2` read were pending at review time; the older `e333-f2` line belongs to the earlier candidate. No C115 contradiction found. |

**Bio and wording fold.** `sportsBioNow_` now strips through the first engine ` C<N>.` terminator and appends that terminator itself (`applyGameNightMoments.js:254-260,285-288`). The `Dr. Keane` and older engine-`Now:` replacements are asserted at `gameNightMoments.test.js:251-256`. A leading authored `Now:` sentence without the engine Cycle terminator is retained after the new sentence; the C114 disk snapshot has no CitizenBio beginning `Now:`, so this is a future-authoring ceiling, not a demonstrated current answer change. The prior brief's `player-feature` label error is corrected by using `press-conference` in the test (`gameNightMoments.test.js:244-247`); `player-feature` still routes to `Reputation` (`applyGameNightMoments.js:363-374`).

**Wiring and evidence.** `applySportsSeason_` supplies this Cycle's feed entries (`phase01-config/godWorldEngine2.js:567`); GameNight mutates the shared ledger and directly writes LifeHistory_Log (`phase05-citizens/applyGameNightMoments.js:438-445,559-561`), while hospital receipts flow through `S.hospitalEvents` (`:327-335`) to `persistHospitalLedger_` in Phase 10 (`phase10-persistence/buildCyclePacket.js:76-86,856-859`). The ledger commit follows (`phase01-config/godWorldEngine2.js:838,859`). This source-checked wiring summary is attached because the prescribed Haiku card for this function returned `[FATAL] Connection error` in the first review; it was not retried.

`node scripts/gameNightMoments.test.js` passed locally on the folded source. The C114 snapshot is a disk artifact, not a current Sheet read. I ran no Cycle, Sheet read/write, deploy, broad suite, or external call in this rereview.
