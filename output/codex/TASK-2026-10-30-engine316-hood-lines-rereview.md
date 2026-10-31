# TASK 2026-10-30 — codex: re-review of the fold, engine.316 (last round)

Fold: `93e3ce71` (the line, the test label, the check, the push guard) and `5078d345` (the bench wrapper). Your review: `docs/for-claude-review/2026-10-30-codex-engine316-hood-lines-review.md`. Verified and decided as below. This is the one re-review; the seat decides whatever is left.

**The fold.**
- F1, decided in part: the ledger lists ten citizens living in Baylight District and a median rent on `Neighborhood_Map`, so its new units and blocks stand; a saved tracker row does not unmake residents. Only "the waterfront walk" needed an opened amenity, and it became "the harbor-side block".
- F2: the check filters on `Cycle > from`, compares the log row's own `Neighborhood`, exits 3 on no line and 4 on a wrong hood; the wrapper gates its PASS on that exit.
- F3: `restore` runs on EXIT and is checked; a failed run ends on stage 33 or says HOLD.
- F4: the push refuses a source without `6b0732f4` or with a non-engine.316 commit on the file.
- Bench is three fires, because the first run wrote one line in two (`output/engine-sheet/2026-10-30-e316-bench-6b0732f4.log`).

**Check only.** Are F2-F4 closed? Name an input that still reproduces one. Did the fold break anything: `restore` on a run that never pushed (CODE=unknown), the trap firing after a clean restore, the check's text parse, a commit-subject prefix the guard wrongly refuses. Any Baylight line that still needs an opened amenity beyond the residents' own blocks.

**Decided, do not re-raise.** The added RNG draw and the lines themselves as a rate change: that is the fix. Baylight's "new units" and "new blocks" given residents on the ledger.

**Write to:** `docs/for-claude-review/2026-10-30-codex-engine316-hood-lines-rereview.md`, verdict SHIP / SHIP-WITH-FIXES / HOLD, each finding with file:line and input → wrong output. Register it in `docs/index.md` in the same commit. No code edits, no network calls, no live runs.
