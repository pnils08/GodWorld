---
title: pipeline.93 owed wake round 4 review of dd73a5ec
created: 2026-10-29
updated: 2026-10-29
type: reference
tags: [media, citizens, wakes, active]
sources:
  - output/codex/TASK-2026-10-29-pipeline93-owed-round4.md
  - docs/for-claude-review/2026-10-29-codex-pipeline93-owed-round3.md
  - commit dd73a5ec
pointers:
  - "[[../plans/2026-10-29-owed-responses]] — builder rulings and owning build"
---

# pipeline.93 owed wake round 4

**Verdict: HOLD for enabling `OWED_RESERVE=6`.** The three round-3 defects are addressed in their direct paths. One overlap path introduced by the lock fallback can still spend an owed mark without saving that wake's reflection. This is source analysis and local-fixture evidence, not a live page or journal test.

## Round-3 findings

| Finding | Disposition | Source check |
|---|---|---|
| F1: two identical casino lines collapse in the life block | **SHIP** | `lifeTailOf` now selects and keeps line indices (`lib/wakePerception.js:438-452`). A local fixture with two identical loss lines and five newer texture lines produced two loss occurrences in the five-line block and `owedShownSet` returned both marks. No-match uses `lifeTailPlain` (`:432-444`); the local 1,053-row tail check found zero no-pin and nonmatching-pin differences. The disclosed count-not-WagerId identity ceiling remains. |
| F2: an ambiguous page error clears a landed receipt | **SHIP** | `owedPageStep` writes `pending` before page and adds no terminal line on `{error}` (`lib/wakePerception.js:1090-1095`); `owedStateFrom` counts pending without `shown` as spent and unconfirmed (`:1064-1082`). The script logs and exits on page error (`scripts/citizen-wake.js:399-414`). A server-accepted page with a lost reply cannot be selected again by this serial receipt path. A genuinely failed page can miss a wake, as disclosed. |
| F3: two overlapping owed wakes claim the same mark | **SHIP for journal claims; HOLD for the full wake** | A live owed-on wake acquires the lock before journal read and holds it to exit (`scripts/citizen-wake.js:249-265`); an overlapping invocation turns its owed slot off (`:252-255`). `acquireFileLock` uses the existing atomic link/dead-owner protocol (`lib/wakePerception.js:1184-1205`), and local contention tests pass. But that second invocation can still write the same citizen's page, which can invalidate the first wake's saved-response claim. Finding 1. |

## Finding

1. **HOLD — the lock loser can occupy the owed wake's page key before the owed reflection lands.** `scripts/citizen-wake.js:252-255` disables owed handling for a concurrent wake but continues to the ordinary/forced draw (`:258-298`) and page append (`:399-415`). The page key is only citizen + Cycle + daypart (`lib/citizenPage.js:60-62,121-123`), with documented idempotent duplicate behavior. Input: two synthetic same-daypart invocations overlap; A takes the owed lock and selects a citizen whose event line needs pinning, then waits for its voice call; B loses the lock, selects that same citizen by rotation or `--pop`, and saves a reflection from the unpinned prompt first. B now owns the page key. When A submits its owed reflection, a duplicate-key no-op can return success, so `owedPageStep` appends `shown` (`lib/wakePerception.js:1090-1095`) and the journal spends the event (`:1076-1082`), although the saved page contains B's reflection. A local idempotent-page stub used the prompt's event-line presence as a marker for the reflection that occupied the key: `plainHasEvent=false`, `owedPromptHasEvent=true`, `storedPageHasEvent=false`, `owed=shown`, `spent=113`. The stub models the repository's stated duplicate-key contract; actual Supermemory duplicate responses and a live overlap were not tested. If the duplicate returns an error, `pending` stands unconfirmed and the saved owed reflection is still absent. The lock prevents two owed journal claims, but the fallback page can still consume the single page key.

## Evidence and boundaries

- The two named ceilings remain correctly scoped: casino settlement lines lack WagerId/stake (`phase05-citizens/casinoLedgerEngine.js:427-430,813-824`), so matching is by occurrence count; `pending` with no `shown` is spent and logged unconfirmed (`lib/wakePerception.js:1076-1082`; `scripts/citizen-wake.js:263-266`). Finding 1 is a separate same-page collision, including a falsely confirmed `shown` result under the documented idempotent behavior.
- `node lib/wakePerception.test.js` reported **169 passed, 1 failed**; the failure is the pre-existing `snippet capped at 180`. The added pending/page and lock assertions passed, but do not compose two whole wakes against one page key (`lib/wakePerception.test.js:551-586`). `node output/research-build/pipeline93-tail-equiv.js` reported **1,053 rows and zero differences**. The saved C113 round-4 replay reports six owed and all shown; its dry run did not write the owed journal or acquire the live lock (`output/research-build/2026-10-29-pipeline93-c113-replay.txt:365-485`).
- `OWED_RESERVE=0` still bypasses the lock and owed-source/journal reads (`scripts/citizen-wake.js:50,251-259,396-403`), and `owedPageStep` calls the page without touching the journal when off (`lib/wakePerception.js:1090-1095`). The focused tail check is not a full live-wake byte comparison.
- The plan's older Build table still says receipts live in the shared state and names the removed `recordOwedSpend` (`docs/plans/2026-10-29-owed-responses.md:56,64`), while the current writer uses the owed journal (`scripts/citizen-wake.js:396-415`). This stale pointer can send an operator looking for receipts to the wrong file; the new fold paragraph at plan line 73 describes the current mechanism.
- The required Haiku wiring-card command was attempted once and returned `[FATAL] Connection error.` Source and local fixtures above provide the wiring evidence available to this review.

**Gate:** hold `OWED_RESERVE=0` until an overlapping lock loser cannot take the same citizen/Cycle/daypart page key ahead of an owed wake, or the owed wake can prove its own reflection is the page that landed. Verify the page-key race with a two-wake fault fixture before PROD admission. The saved dry run does not prove that boundary.
