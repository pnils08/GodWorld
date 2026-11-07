---
title: Codex review of engine.333 owed retirement milestone
created: 2026-11-07
updated: 2026-11-07
type: reference
tags: [engine, sports, citizens, review, active]
sources:
  - docs/for-claude-review/2026-11-07-brief-engine333-owed-milestone.md
  - docs/plans/2026-11-05-feed-triggers-to-life-history.md
pointers:
  - "[[plans/2026-11-05-feed-triggers-to-life-history]] — design 6 and Task 2a"
---

# Review — engine.333 owed retirement milestone

**Verdict: SHIP-WITH-FIXES for commit `c76571cd7`.** The fifth-source implementation creates and pins a tier-1 debt for a valid retirement row. The source does not support an unconditional once-per-retirement or six-slot guarantee, and the broad test file is not isolated from network reads. Settle the proof and plan wording below; I found no blocker in the new `owedFrom` or `pinMatches` code for the stated same-cycle case.

| Claim | Result | Source trace and consequence |
|---|---|---|
| 1. Other four classes | **Holds.** | `lib/wakePerception.js:429-433`: without a nonempty `stamps`, the array is `[pin.stamp]`; matching `stamp + ' — '` and slicing `stamp.length + 3` is the previous `head.length` behavior. The existing chaos exact-body and casino/judicial regex pins remain constructed at `:973-1011`. |
| 2. Absorption | **Holds, with an extra read.** | `lib/wakePerception.js:929-960,1185-1194` reports a failed or column-less LifeHistory_Log as unknown; `scripts/citizen-wake.js:285-292` then disables tier-2 absorption while tier-1 debts from readable tabs remain. That is the accepted hold. The fifth full-tab read also runs on every owed wake, before the separate `loadLifeArc` read at `scripts/citizen-wake.js:335` / `lib/wakePerception.js:57-59`; it is not a reused read. I found no further selection rule changed by this diff. |
| 3. Dedup and identity | **Holds within one Cycle; breaks if “one retirement” spans two Cycle rows.** | `lib/wakePerception.js:1018-1029` folds case and duplicate rows to `milestone:retirement:<pop>:c<N>` within one invocation. `:1138-1155` spends that exact ID across wakes. Rows for the same citizen at N and N+1 have different IDs, and two matching life lines can both be shown and receipted in one wake (`:1047-1058`; `scripts/citizen-wake.js:320-325,435-438`). The current senior writer prevents its own ordinary repeat by checking for `[Retirement]` (`phase04-events/generationalEventsEngine.js:1331-1333`); the feed retirement writer belongs to unbuilt Task 2b. Thus this is a duplicate-across-Cycles ceiling, not a demonstrated current automatic replay. |
| 4. Pin reach | **Holds.** | `lib/wakePerception.js:502-515` keeps the ledger's full LifeHistory split in `lifeLines`; `:1073-1080` reports a missing matching line as `unshowable` before reservation. `:443-456` calls the same multi-stamp matcher when pinning the selected citizen's five-line block; `:1047-1058` requires a shown occurrence before spend. A trimmed-away line cannot reserve. More than five simultaneous pinned lines remains the existing five-line block ceiling, not introduced here. |
| 5. Sort and six-slot capacity | **Tier holds; the “mag is 8” and safety implication break.** | The new entry is tier 1 (`lib/wakePerception.js:1029`), and `:1080-1084` sorts by the pool's `eventMag`, then Cycle. `eventMag` comes from the *plain five-line tail* (`:511-515`), whose line scores are damped by `0.8^age` (`:31-45`); `utilities/citizenDialMap.js:101` supplies an undamped Retirement magnitude of 8. A later texture line makes its contribution 6.4, and another event may determine the citizen's score. With more than six ready citizens and continuing higher-ranked new tier-1 marks, an older mark can lapse after the two-Cycle window (`lib/wakePerception.js:908-909,951,1082-1084`; `:886-889`). One current live log row, as stated in the plan, does not prove future reserve capacity. |
| 6. Retirement scope | **Holds for senior retirements; one legacy path is unshowable.** | `phase04-events/generationalEventsEngine.js:1350,1761-1776` writes the bare tag and a `C<N> — [Retirement]` line, both accepted by `lib/wakePerception.js:938,1023-1029`. The broader builder wording and plan design 6 include this. The legacy GAME-to-ENGINE branch also writes bare `Retirement` but appends an unbracketed note (`phase05-citizens/runAsUniversePipeline.js:436-453`); `owedFrom` lists that debt, then `owedCandidates` reports it unshowable. This is consistent with claim 4's pin contract, but a bare log tag alone does not guarantee a reserved wake. |

## Additional finding — the broad test is not network-isolated

`lib/wakePerception.test.js:607-629` stubs `global.fetch` and `sheets.getRawSheetData` for its real page-writer case, but the test's concurrent cases also replace and restore the same Sheets function (`:409-434`, `:712-714`). `lib/citizenPage.js:183-189` calls `recordFamilyMentions_` after a page append; that helper reads `Generic_Citizens` through Sheets (`:104-109`). In this run, two page cases attempted OAuth token requests and logged DNS failures for `oauth2.googleapis.com` while all assertions passed. The assertion count therefore does not establish an offline test run. Isolate that dependency and run the broad file with network access blocked before describing it as source-only proof. The new nine-check milestone file uses injected records and an injected tab reader; I observed no external request from it.

## Evidence boundary

I read the three-file diff and the named consumer/writer paths. `node lib/wakePerception.test.js` passed **201/201** assertions; `node scripts/wakeOwedMilestone.test.js` passed **9/9** checks. The broad file's OAuth attempts failed as described above. I did not rerun the claimed 321-file suite, the live dry replay, a wiring card/model call, a Sheet read, or a Cycle. Task 2b's feed writer and sandbox/readback proof remain outside this diff.
