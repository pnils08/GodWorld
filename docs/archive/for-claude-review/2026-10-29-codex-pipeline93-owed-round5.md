---
title: pipeline.93 owed wake round 5 review of 4d12ef62
created: 2026-10-29
updated: 2026-10-29
type: reference
tags: [media, citizens, wakes, active]
sources:
  - output/codex/TASK-2026-10-29-pipeline93-owed-round5.md
  - docs/for-claude-review/2026-10-29-codex-pipeline93-owed-round4.md
  - commit 4d12ef62
pointers:
  - "[[../plans/2026-10-29-owed-responses]] — builder rulings and owning build"
---

# pipeline.93 owed wake round 5

**Verdict: HOLD for enabling `OWED_RESERVE=6`.** The fold closes the round-4 concurrent lock-loser path, but the sequential page-key check uses a date that the actual page key omits. An owed event can be marked shown while a prior reflection remains on the page.

## Round-4 finding disposition

**SHIP for concurrent citizen-wake invocations under owed-on.** `scripts/citizen-wake.js:250-257` takes the lock before the owed journal read and selection and exits before the page path if it loses; `lib/wakePerception.js:1087-1092` encodes that decision. `acquireFileLock` still uses an atomic link and token-checked release (`lib/wakePerception.js:1193-1214`). The new two-wake test (`lib/wakePerception.test.js:587-601`) models a first-write-wins page and confirms that its lock loser does not write. The test stubs admission and page writes; it does not run the full script or Supermemory. Other ordinary page writers use distinct dayparts: work, CIVIC, journal, CONVO/INTERVIEW/DEBATE, deskwork, DISCORD, PRESS, and NIGHTLY. `scripts/magsPageAppend.js:33-44` accepts an arbitrary operator-supplied daypart, so the absolute “only citizen-wake” claim is wider than the enforced code boundary.

## Findings

1. **HOLD — journal and page keys disagree across dates in one Cycle.** `wakeSeedKey` includes the Central date because a Cycle spans about seven days (`lib/wakePerception.js:864-868`). The journal key is `seedKey|POPID|instant` (`scripts/citizen-wake.js:258,400-405`), and `owedPageKeyOf` removes only the instant (`lib/wakePerception.js:1085-1086`). The actual page custom ID is `cp-POPID-c<Cycle>-<daypart>`, with no date (`lib/citizenPage.js:121-123`). Input: an owed-on morning wake journals an unmarked reflection for a citizen in Cycle 113 on October 29; a later morning in the same Cycle and for that citizen on October 30 shows a new owed mark. `owedStateFrom(...).pageKeys.has(...)` is false, so `scripts/citizen-wake.js:402-406` retains the mark and `owedPageStep` can append `shown` after the duplicate page POST. Under the documented idempotent first-write result (`lib/citizenPage.js:60-62`), the page still contains the first reflection while `owedStateFrom` spends the new event (`lib/wakePerception.js:1076-1082`). A local two-date, first-write-wins fixture reproduced `taken=false` on both runs, the first text saved, and the second synthetic event spent. If the service rejects the duplicate instead, pending stands and the owed response is still absent. Key the journal's page occupancy by the actual page custom ID or by citizen/Cycle/daypart, then test two dates in one Cycle with a first-write-wins stub.

2. **FIX — the Build introduction still points receipts at the wrong file.** `docs/plans/2026-10-29-owed-responses.md:56` says the state file holds receipts, while its newly corrected table at `:64` and the implementation (`scripts/citizen-wake.js:51-57,263-267`) put them in `logs/citizen-wake-owed.jsonl`. Input: an operator follows the Build introduction to inspect a missing owed receipt. Output: the state file has no owed receipt to inspect, although the journal does. Correct the sentence so the plan agrees with its table and the writer.

## Evidence and limits

- `node lib/wakePerception.test.js`: **175 passed, 1 failed**. The failure is the existing `snippet capped at 180` assertion (`lib/wakePerception.test.js:448`); the new lock/page assertions passed. The suite's new page-key test uses the **same date** on both runs (`:296-304`), so it cannot catch finding 1.
- The saved round-5 C113 replay reports six owed, all event lines shown, and a dry run with no journal or lock (`output/research-build/2026-10-29-pipeline93-c113-replay.txt:487-553`). This does not exercise sequential live page writes. `OWED_RESERVE` remains zero (`lib/wakePerception.js:898`). No live page, Sheet, Cycle, deployment, or cron proof was performed here.
- The required Haiku wiring-card command was attempted once and returned `[FATAL] Connection error.` Source tracing and the local pure fixture are the available wiring evidence. The previously named ceilings remain: casino line occurrences lack slip identity, and an unconfirmed pending receipt can miss a wake without doubling it.

**Gate:** keep the reserve at zero until the journal's occupancy key matches the page custom ID across dates, a two-date same-Cycle fixture shows no false `shown` receipt, and the stale Build sentence is corrected.
