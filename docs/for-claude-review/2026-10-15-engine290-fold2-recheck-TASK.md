# TASK — codex re-check: engine.290 Tasks 6-8 fold + congestion cause

**Target:** `git diff f72efb8f..18c9505a -- phase* utilities scripts data docs/engine` (ac1d38bb = your Tasks 6-8 review folded; 18c9505a = congestion cause named in Factors + catalog roles moved to the JSON tail). Read-only; no cron, Sheet, bench or canon run.
**Write to:** `docs/for-claude-review/2026-10-15-codex-engine290-fold2-recheck.md`. One gate per your earlier hunts 2-5 (SHIP / FIX / HOLD) + the congestion line, file:line evidence. Do not commit. Bounded: verify the fixes, do not reopen SHIP hunts.

1. Hunt 2: `occupation.transit` rows now skip unless `transitDisruptedHit` — any remaining leak path?
2. Hunt 3: `--poolkey` in `undockedEclPoolApply.js` — selects exactly the ten commute rows; crew rows unreachable without it?
3. Hunt 4: `Transit Dispatcher` removed from both keyword tables in lockstep; `DEMOGRAPHIC_VOICE_ROLES` back to its prior list byte-for-byte?
4. Hunt 5: doc wording now matches the runtime gate.
5. `updateTransitMetrics.js` congestion cause; `economic_parameters.json` move is a pure reorder (same three objects, same fields) so `syncEconomicParameters.js` appends them.
