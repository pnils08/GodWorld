# TASK — codex round 5: pipeline.93 owed-responses round-4 fold (research-build, 2026-10-29)

Your round-4 review `docs/for-claude-review/2026-10-29-codex-pipeline93-owed-round4.md` (HOLD, one finding + the stale Build table) was folded in the commit that names this task (`git log -1 -- output/codex/TASK-2026-10-29-pipeline93-owed-round5.md`; `git show` it). Review it against that finding and hunt anything the fold introduced. Same rules as before.

Fold (plan §Build table + "Codex round 4 HOLD fold"):
- Only citizen-wake writes the morning/midday/night/evening page keys — every other `appendReflection_` caller uses its own daypart (work, CIVIC, journal, exchange formats, deskwork, DISCORD, PRESS; grep them). So the only collider on an owed wake's page key is another citizen-wake run.
- Concurrent: `wakeAdmission` — owed on and the lock held elsewhere → the wake does not run (exit 0, logged). No page can land under an owed wake's key while it holds the lock.
- Sequential: every owed-on live wake is now journaled (pending/shown, ids may be empty); `owedStateFrom().pageKeys` holds seedKey|POPID per journaled wake; a later run whose page key is already journaled receipts nothing (slot `repeat`, not counted as a reserved wake), since its write would duplicate the earlier page.
- Two-wake fixture in `lib/wakePerception.test.js` (round 4 asserts): A holds the lock, B is refused before any page, A's own reflection is the page that lands under a first-write-wins page stub.
- Build table trued: receipts in the journal, not the shared state; `recordOwedSpend` is gone.

Residual, named: a same-daypart page written before the reserve turns on is not in the journal (the flip day only). Ceilings unchanged: casino count-not-identity; an unconfirmed pending is a possible missed wake, never a double. Note the cost the fold accepts: with owed on, a journal that cannot take the pending line stops every live wake (loud, exit 1) until fixed.

Evidence: `output/research-build/2026-10-29-pipeline93-c113-replay.txt` §"round 5". Suite 175/176 (the 1 = infrastructure.13).

Deliverable: `docs/for-claude-review/2026-10-29-codex-pipeline93-owed-round5.md`, SHIP / SHIP-WITH-FIXES / HOLD, file:line and input → wrong output per finding, registered per the folder README, committed with a `codex:` message, your own commit only. Do not push.
