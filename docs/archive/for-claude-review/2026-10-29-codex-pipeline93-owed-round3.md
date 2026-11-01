---
title: pipeline.93 owed wake round 3 review of c67d4aac
created: 2026-10-29
updated: 2026-10-29
type: reference
tags: [media, citizens, wakes, active]
sources:
  - output/codex/TASK-2026-10-29-pipeline93-owed-round3.md
  - docs/for-claude-review/2026-10-29-codex-pipeline93-owed-rereview.md
  - commit c67d4aac
pointers:
  - "[[../plans/2026-10-29-owed-responses]] — builder rulings and owning build"
---

# pipeline.93 owed wake round 3

**Verdict: HOLD for changing `OWED_RESERVE` from 0 to 6.** The fold settles the unknown-tab absorption and missing Judicial header findings. Three source-level cases still break the claimed event-to-line or durable-reservation behavior. This review did not run a live wake or write to a Sheet, page, or journal.

## Four re-review findings

| Prior finding | Round 3 | Evidence and limit |
|---|---|---|
| R1: one casino line receipts two same-status slips | **SHIP for that case; new FIX** | `owedShownSet` consumes line *indices* once (`lib/wakePerception.js:1002-1013`), so one visible occurrence yields at most one shown event. But `lifeTailOf` still pins by line *value* (`:431-443`), which can discard a second identical occurrence before `owedShownSet` sees it. Finding 1. |
| R2: unavailable severe tab permits low chaos absorption | **SHIP** for this mechanism | Missing/read-failed tabs enter `unknownTabs` (`lib/wakePerception.js:928-934,988`); the wake sets `owedAbsorb=false` when Casino, Hospital, or Judicial is unknown (`scripts/citizen-wake.js:263-270`); `owedCandidates` then excludes tier 2 (`lib/wakePerception.js:1021-1027`). A valid header-only table is treated as known-empty. This is conservative across the window. |
| R3: Judicial reconciliation skip lacks required SourceSystem | **SHIP** for this mechanism | `SourceSystem` is required (`lib/wakePerception.js:907-912`); its absence makes the whole tab unknown (`:928-934`), and a present `reconcile` row is skipped (`:976-985`). The live-header assertion is a build receipt, not a Sheet read in this review. |
| R4: lost shared-state write repeats a landed owed mark | **HOLD** | The owed journal replaces shared-state receipts and writes `pending` before the page (`scripts/citizen-wake.js:251-259,388-400`), then `shown` after success (`:467-472`). Serial, acknowledged success is counted by `owedStateFrom` (`lib/wakePerception.js:1054-1073`). An ambiguous page error and overlapping wakes still permit a second page or incorrect R accounting. Findings 2–3. The script's two-phase ordering has no integration test. |

## Findings

1. **FIX — identical casino lines are collapsed by the pinning stage.** `lib/wakePerception.js:433-443` stores pinned lines in a `Set` of strings, skips a later matching line when its *text* is already present, and removes every identical string from the free lines. The writer appends the same stamped text for same-status settlements (`phase05-citizens/casinoLedgerEngine.js:427-430,813-824`); `buildPool` preserves those separate lines (`lib/wakePerception.js:489-502`). Input: two C113 settled losses above the stake bar, two identical `Y3C9 — [Casino] the slip came back empty` lines, then five newer texture lines. Local result: `lifeTailOf` emits five lines with **one** loss occurrence, and `owedShownSet` shows only `W1`; `W2` stays owed despite its own source line existing. The new two-line test uses different `[Casino]` and `[Setback]` text (`lib/wakePerception.test.js:344-350`), so it does not exercise this production shape. This is distinct from the disclosed inability to identify *which* same-status wager a generic line belongs to: here two physical lines exist but only one reaches the citizen.

2. **HOLD — an ambiguous page response can erase a landed reservation.** `citizenPage.appendReflection_` sends the page POST and returns `{error}` on a transport/response exception (`lib/citizenPage.js:141-165`); that error does not establish that the server rejected the page. On any `{error}`, the wake writes `failed` (`scripts/citizen-wake.js:396-403`), and `owedStateFrom` discards the entire key if it has `failed` (`lib/wakePerception.js:1062-1071`). Input: Supermemory accepts the reflection, then the response is lost. Output: journal `pending+failed` reconstructs `owedSpent={}`, `owedWakes={}` (local pure-function result), so the next wake can select the same mark. A later daypart has a different page `customId` (`lib/citizenPage.js:121-123`) and can land a second reflection for the event. The stated `pending`-alone ceiling is accurate for an unconfirmed pending line; it does not cover this false `failed` case.

3. **HOLD — overlapping wakes can both reserve the same mark before either writes `pending`.** The journal is read and `owedView`/`owedUsed` are fixed before selection (`scripts/citizen-wake.js:249-281`); the first journal mutation waits until after voice generation, classification, and page-pointer work (`:365-392`). There is no lock or reread/claim around that interval. Input: two overlapping invocations both read an unspent top event and `owedUsed=0`; each chooses that citizen and appends a distinct-key `pending` line. Both can then append a page at different dayparts, while `owedStateFrom` counts **two** reserved wakes for one event (`lib/wakePerception.js:1062-1072`; local two-key fixture gave `owedWakes[113]=2`). If both use the same daypart, page idempotency may yield one page but still two reserved counts. This is a concurrency path, not evidence that the scheduled wakes have overlapped in production.

## Ceilings and evidence

- **Casino identity ceiling: honestly stated.** The source line has status text but no WagerId or stake (`phase05-citizens/casinoLedgerEngine.js:427-430,813-824`); `owedShownSet` can assign matching occurrences by count only (`lib/wakePerception.js:1002-1013`). Fixing Finding 1 would preserve occurrences, but could not establish which same-status slip each occurrence represents.
- **Pending-without-terminal ceiling: honestly stated for a serial wake.** A `pending` with neither `shown` nor `failed` is counted as spent and logged unconfirmed (`lib/wakePerception.js:1066-1073`; `scripts/citizen-wake.js:257-259`). A page that never landed can therefore miss a wake. Findings 2–3 show that “never doubled” is wider than this code proves.
- `OWED_RESERVE=0` still bypasses journal read/write and owed source reads (`scripts/citizen-wake.js:50,251-272,389-394,468-471`); local `pipeline93-tail-equiv.js` reported **1,053 rows, zero differences** for no pin and a nonmatching pin. This is bounded to life-tail output, not a full live wake comparison.
- `node lib/wakePerception.test.js`: **162 passed, 1 failed**. The failure is `snippet capped at 180`, present before this fold; the new R1–R4 pure-function assertions passed. The saved round-3 C113 replay reports six owed, all shown, no unknown tabs, one dry run, and the same 1,053-row tail check (`output/research-build/2026-10-29-pipeline93-c113-replay.txt`); it does not exercise page/journal writes, ambiguous acknowledgments, or concurrent wakes.
- The prescribed Haiku wiring-card command was attempted once and returned `[FATAL] Connection error.` The wiring statements above come from direct source inspection, not a generated card.

**Gate:** keep `OWED_RESERVE=0` until distinct source-line occurrences survive pinning, a page response cannot falsely clear a landed pending receipt, and reservation is serialized or atomically claimed across overlapping wake processes. Then verify the script's page/journal boundary with fault and overlap cases. The saved C113 dry run is not PROD propagation proof.
