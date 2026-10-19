# TASK — codex: re-check wakes-have-no-rules Rev 2 before any code

Read-only: code + `output/` dumps; no cron, model, Sheet write, bench or canon run. Write to `docs/for-claude-review/2026-10-17-codex-wake-no-rules-rev2-recheck.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~80 lines.
Plan: `docs/plans/2026-09-10-inactivity-is-regression.md` §Wakes have no rules — build plan, Revision 2. Your Rev 1 review: `docs/for-claude-review/2026-10-17-codex-wake-no-rules-plan-review.md`. Builder rulings after it, verbatim in §Builder rulings 2026-10-17 (~16:10): "1 - it should go, 2 - no i think we have enough purpose behind a cron wake to avoid giving preferential treatment, 3 yes, with 4 that wake on lottery, 4 - 1 a night".

## Hunts
1. **Your HOLD items.** For each Build-gate item in your Rev 1 review: closed by Rev 2, or still open? Cite the Rev 2 line.
2. **Draw + SEED.** With R1 (100-lockout) and S1–S3 (voiced/lived/posture slots) deleted and the seed moved to `cycle + wake + Central date`: any path left that excludes or prefers a citizen beyond `1 + eventMag*2`? Is `drawCitizen(pool, seedKey)` as specified testable without the script's top-level IIFE? Does anything else read `state.recent` or the `slot` value?
3. **L — lived events as perception.** Dropping the lived slot but rendering + spending an unspent event when the drawn citizen holds one: does `pickLived` / `livedSpent` / `include` still have a correct role, or is there dead state? Any consumer of the lived wake (Lives beat, `dumpBeatTabs.js`) that breaks?
4. **M1 scrub.** `scrubNightly` on NIGHTLY candidates in `loadOwnPageReadback` + the M2 input. Over- or under-match against the live sentences quoted in Rev 2 and in-world canon ("free agent", "agent" as a job)? Is `loadOwnPageReadback` really the single choke point for her page reaching another citizen (exchange, cron-work-wake, citizenVoice)?
5. **M2 upsert.** The Central-date key across the 19:00 CDT = 00:00Z boundary; overwrite-in-place via `sheets.updateRange` on an unapplied row; skip when applied; crash after append. Any duplicate or lost-row path left? Is resolves-empty + tension-only correct against `compressLifeHistory.js:295-312`?

Done = the md exists.
