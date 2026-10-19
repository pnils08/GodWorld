# TASK — codex: final gate, engine.302 (cuts 1–3) for PROD

Read-only; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-19-codex-engine302-final-gate.md`, under ~40 lines: per open item SHIP / FIX / HOLD with file:line, then one line **Gate: SHIP or HOLD for PROD**. Report in one line when done.

`git show 5ee334ed` against your cut-3 recheck (`docs/research/2026-10-19-codex-engine302-cut3-recheck.md`) and the plan paragraph "Cut 3 — codex recheck" (§Bench soak): are the archived-spouse and row-integrity HOLDs closed? The bond-replace item is answered there as the existing Phase-10 persist-error class shared by every bond change — say whether you accept that answer for PROD, and if not, what minimal change would. Anything else in `git diff 0125b59a^ 5ee334ed -- phase*/ utilities/ lib/` you would still hold PROD for.

Done = the md exists.
