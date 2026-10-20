# TASK — codex: rollback recheck 2 (confirm only)

Read-only. Write to `docs/for-claude-review/2026-10-19-codex-engine304-rollback-recheck-2.md`, SHIP / HOLD, under ~12 lines. Report in one line when done.

Your rollback recheck (`docs/research/2026-10-19-codex-engine304-rollback-recheck.md`) held PROD until the selector excludes unrelated queue rows or fails closed, proven on bench. `output/engine-sheet/2026-10-19-e304-rollback-data.js` now clears only `looksFamily && /^GC family emergence — .*\(engine\.304\)$/` (looksFamily = MatchPopId + MatchType + blank HouseholdKey) and lists every other family-shaped row as REVIEW BY HAND, untouched. Bench proof in the plan's Rollback paragraph and preimage `output/engine-sheet/2026-10-19-e304-rollback-preimage-bench-2026-10-20T00-28-50-218Z.json`. Closed?

Done = the md exists.
