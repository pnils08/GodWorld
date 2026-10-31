# TASK 2026-10-30 — codex: adversarial diff review, engine.316

Commit `6b0732f4` (one commit). Review the diff: `git show 6b0732f4`. Plan: `docs/plans/2026-10-10-engine-214-mood-per-hood.md` §engine.316. Bench tooling: `output/engine-sheet/2026-10-30-e316-bench.sh`, `2026-10-30-push-e316-bench.sh`, `2026-10-30-e316-check.js`.

**What it claims.** Eastlake, Baylight District and East Oakland held no signed drift line, San Antonio and Grand Lake no down line, so `textureSigned_` (`runNeighborhoodEngine.js:560`) left an empty pool on a moving week and a winning roll wrote nothing. 28 lines land in `NEIGHBORHOOD_DRIFT_BESPOKE_`; `hoodTexturePool_` adds them on top of the label pool. The test now holds every hood on the map to one line each way. The bench candidate is stage 34 = stage 33 + this one file.

**Hunt.**
- Effect on rate: the fix turns a silent roll into a written line for up to 57 citizens. Read the path after `eventPool` (`:572` onward): does a newly non-empty pool change the context lines, the EVENT limits, RNG draw order for later citizens, or any dial, crime or ledger consumer? Name what moves other than these lines.
- Does any reader assume bespoke means the original twelve: other callers of `NEIGHBORHOOD_DRIFT_BESPOKE_`, `hoodTexturePool_`, `dialWave2Seams.test.js`, stub maps, doc counts?
- Each line against its row: does any assert something `Business_Ledger`, `Neighborhood_Map` or INSTITUTIONS does not carry? Baylight's INIT-006 is `construction-active`. Is any line a mood rather than an activity change, or a down line that reads as a decline premise (doctrine comment at `:55-62`)?
- Tests: weakened assertions, an `up`/`down` check that can pass for the wrong reason, `bespokeHoods` hiding a key that should fail.
- The bench push script: can it deploy anything but stage 34, or leave the bench on the wrong stage? The check script: can it report a clean run when no line was written?

**Out of scope.** Whether 28 is the right count; the wording of lines that are true (the sim's owner approved them). The Event_Content_Ledger proposals in `output/research-build/`, a separate job. Thin 1/1 hoods.

**Write to:** `docs/for-claude-review/2026-10-30-codex-engine316-hood-lines-review.md`, verdict SHIP / SHIP-WITH-FIXES / HOLD, each finding with file:line and input → wrong output. Register it in `docs/index.md` in the same commit. No code edits, no network calls, no live runs.
