# TASK — codex: recheck, engine.302 cuts 1 + 2 fix round

Read-only; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-19-codex-engine302-cut12-recheck.md`, SHIP / FIX / HOLD per item, file:line evidence, under ~60 lines. Report in one line when done.

**The diff:** `git show 5f057a26` (the fix round for your diff review `docs/research/2026-10-19-codex-engine302-cut12-diff-review.md`). The plan's disposition paragraph: `docs/plans/2026-10-08-engine-286-game-of-life-events.md` §Bench soak, "Cuts 1 + 2 — codex diff review".

For each HOLD/FIX finding in your diff review: is it closed by this diff, and does the fix open anything new (draw order, a direct write outside the function's class, a regex on bond notes that a later notes append could break, the old-Members write when the old row is not found, the minor refusal returning before a non-spouse match)? Do the new tests in `scripts/engine302Marital.test.js` fail on the pre-fix code? Also: `output/engine-sheet/2026-10-19-engine302-marital-migrate.js` (the step-c/e migration, not in git) — the unknown-BirthYear stop and the age-first order.

Done = the md exists.
