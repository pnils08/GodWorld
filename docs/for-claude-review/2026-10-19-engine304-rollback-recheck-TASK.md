# TASK — codex: recheck of the engine.304 rollback (the last PROD hold)

Read-only. Write to `docs/for-claude-review/2026-10-19-codex-engine304-rollback-recheck.md`, SHIP / FIX / HOLD, under ~25 lines. Report in one line when done.

Your final recheck (`docs/research/2026-10-19-codex-engine304-final-recheck.md`) held PROD only on §2: a family arrival left queued in Advancement_Intake1 by a partial Cycle. `output/engine-sheet/2026-10-19-e304-rollback-data.js` now also clears every queued family arrival (Notes "(engine.304)", or MatchPopId + MatchType without HouseholdKey), preimaged and read back; the plan's Rollback paragraph records the bench proof. Closed? Does the identification miss or over-match anything (a household-door row; a pre-304 drip row; a row queued by the owner door)?

Done = the md exists.
