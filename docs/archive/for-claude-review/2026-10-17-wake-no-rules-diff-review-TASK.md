# TASK — codex: review the wakes-have-no-rules build before it merges to main

Read-only: code + `output/` dumps; no cron, model, Sheet write, bench or canon run. Write to `docs/for-claude-review/2026-10-17-codex-wake-no-rules-diff-review.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~70 lines.
The build is on branch `engine197-wakes-no-rules`, worktree `/root/GodWorld-wake`: `git -C /root/GodWorld-wake diff 7d84c084..engine197-wakes-no-rules` (6 commits; the last, W3, is held for a builder answer — review it anyway). Plan: `docs/plans/2026-09-10-inactivity-is-regression.md` §Wakes have no rules — Revision 3 + Rev 4. Your three plan reviews: `docs/for-claude-review/2026-10-17-codex-wake-no-rules-{plan-review,rev2-recheck,rev3-recheck}.md`.
Tests (from the worktree, absolute requires remapped to it): `lib/wakePerception.test.js` 91, `lib/memoryFence.test.js` 42, `lib/citizenPage.test.js` 32 — all pass. Cron runs the MAIN tree; merge = deploy.

## Hunts
1. **Plan fidelity.** Does the diff do what Rev 3 + Rev 4 say — W1–W4, R1, S1–S3, SEED, D1, F, L, M1, M2 — and nothing else? Anything the plan names that the diff misses?
2. **M2 I/O.** `scripts/discord-reflection.js` `flushIntakePending` / `queueNightlyIntake` + `lib/wakePerception.js` `withFileLock` / `planNightlyIntake`: any path to a duplicate row, a lost night, an updated row, or a failure that breaks the page write / saves / Moltbook cursor?
3. **M1.** `citizenPage.scrubPageResult_` in `recentPage_` / `readPage_`: any non-Mags or non-NIGHTLY result altered? `raw` used anywhere but her own tail?
4. **Wake caller.** `scripts/citizen-wake.js`: lived spend only after the page write; `recordLivedSpend` keys; forced path; anything still reading the retired `state.recent` / `livedCount` / `pickLived`?
5. **Merge safety.** Anything that breaks a cron script on main at merge (other importers of `pickLived`, `LIVED_CAP_PER_CYCLE`, `LIVED_MIN_AGE`, `voicedPopIds`, the old pool log line)?

Done = the md exists.
