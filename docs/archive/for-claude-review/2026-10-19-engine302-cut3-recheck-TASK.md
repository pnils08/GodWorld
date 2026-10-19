# TASK — codex: recheck, engine.302 cut 3 fix round

Read-only; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-19-codex-engine302-cut3-recheck.md`, SHIP / FIX / HOLD per item, file:line evidence, under ~50 lines. Report in one line when done.

`git show 3658b527` against your cut-3 diff review (`docs/research/2026-10-19-codex-engine302-cut3-diff-review.md`) and the plan's "Cut 3 — codex diff review" paragraph (§Bench soak). For each HOLD/FIX: closed? Does the fix open anything new — the direct Members/head/type writes (row index after a reconcile reload earlier in the same function; a household whose row moved; the off-camera retype vs the reconciler's own typing next pass), the bond-load wait (does `S.relationshipBondsLoaded` exist on both entry points before Phase5-HouseholdFormation?), the nonreciprocal skip (does it hide a real off-camera case, e.g. a SpouseId to an archived spouse), the whole-line wedding guard cost? Do the new tests fail on `30494195`? Final gate: is cut 3 SHIP for the bench?

Done = the md exists.
