# TASK — codex: re-check the fix commit for your wakes-no-rules diff review

Read-only; write `docs/for-claude-review/2026-10-17-codex-wake-no-rules-fix-recheck.md`, SHIP / FIX per item, file:line, under ~40 lines. Commit under review: `git -C /root/GodWorld-wake show 2de1744d` (branch `engine197-wakes-no-rules`). Your review it answers: `docs/for-claude-review/2026-10-17-codex-wake-no-rules-diff-review.md`. Plan §"As built" in `docs/plans/2026-09-10-inactivity-is-regression.md`.

For each of your Hunt 2 + Hunt 3 findings (concurrent enqueue/flush loss, crash-corrupted pending, stale-lock takeover duplicates, header/row validation, M1 non-Mags NIGHTLY scope): closed or not, with the line. Then: any new duplicate / lost-night path the spool + `withFileLock` introduce? Tests: `lib/wakePerception.test.js` Test N + lockCases + spoolCases.

Done = the md exists.
