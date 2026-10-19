# TASK — codex: final gate 3, engine.302 for PROD

Read-only; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-19-codex-engine302-final-gate-3.md`, under ~30 lines: per item of your gate 2 SHIP / FIX / HOLD with file:line, then **Gate: SHIP or HOLD for PROD**. Report in one line when done.

`git show 90eccf6e` against your gate 2 (`docs/research/2026-10-19-codex-engine302-final-gate-2.md`) and the plan's "Final gate 2" paragraph. Closed or not, item by item. A new finding counts only if it is a defect this diff introduces or a PROD-blocking defect in `git diff 0125b59a^ 90eccf6e -- phase*/ utilities/ lib/` you have not raised before; name it with file:line and the failure it causes.

Done = the md exists.
