# TASK — codex: engine.304 final recheck (the PROD candidate)

Read-only; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-19-codex-engine304-final-recheck.md`, SHIP / FIX / HOLD per item, under ~40 lines. Report in one line when done.

The PROD candidate is stage 9 + the 9 Apps Script files at `ac5acf2a` (`output/engine-sheet/stage13-e304.sha256`) plus `lib/citizenPage.js` and `lib/wakePerception.js`. Against your final gate (`docs/research/` is where it will be filed; it is now at `docs/for-claude-review/2026-10-19-codex-engine304-final-gate.md`) and your cut-4 review (`docs/research/2026-10-19-codex-engine304-cut4-diff-review.md`):
1. Final gate §3/§4 — the plan's Rollback paragraph + `output/engine-sheet/2026-10-19-e304-rollback-data.js` (proven on 1004) and the corrected C121 account: closed? Does the rollback still hold now that D11 keeps links to the dead?
2. `git show ac5acf2a` — the cut-4 HOLD/FIX items closed (orphan predicate, minor spouse before mint, ArchiveReason guard, tests C11)?
3. Anything in the agy review (`output/antigravity/2026-10-19-review-engine304.md`) es did not fix that you would hold PROD on (es: §1 heritage and §5 youth reader were false; §2/§3 are builder-ruled rates; §7 is pre-existing `wireFamilyMatch_` behaviour, reported; §4/§6/§8 fixed in `c5399643`).

Done = the md exists.
