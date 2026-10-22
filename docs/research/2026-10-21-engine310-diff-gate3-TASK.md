# TASK — codex: engine.310 diff gate 3 (recheck the gate-2 folds)

Read-only: code + docs + `output/` files; no cron, model, Sheet, bench, clasp, commit or push. Write to `docs/for-claude-review/2026-10-21-codex-engine310-diff-gate3.md`, SHIP / FIX per item with file:line evidence, under ~10 lines. Report in one line when done.

The gate-2 folds are in the last section of `docs/research/2026-10-21-engine310-diff-gate2-TASK.md`.

1. **Push** — `output/engine-sheet/2026-10-21-push-e310-prod.sh`: the C113 watch gate (Cycle / vs / hold / verdict / fields). Hunt: any way a non-C113 or held watch file still passes; anything else in your item 1.
2. **Watch** — `output/engine-sheet/2026-10-21-e310-c114watch.js` + `-c114watch-c112-dryrun.json`. Hunt: any input that can still read as zero or NaN with no HOLD; the pinned-rule read; anything else in your item 2.

Done = the md exists.

## Codex diff gate 3 — folded (`docs/research/2026-10-21-codex-engine310-diff-gate3.md`: push FIX, watch FIX)

- **Push.** The read-backs are now typed and non-empty:
  - `ea` = 22 hoods × 3 finite numbers;
  - `eaComponents` holds both the 112 and 113 objects;
  - `bizAdded` and `employerMoves` are lists;
  - `spotLines` carries a finite `drawn` and the `notTheirSpot` / `strays` lists;
  - `highWater` = 2 finite numbers.
  - Five cases, exercised as the script runs them: the C112 file → refused; a well-formed C113 file → passes; C113 without `eaComponents.113` → refused; `highWater` null → refused; a non-empty hold → refused.
- **Watch.**
  - StorySeedCount that is null, blank, non-numeric or negative is now missing (HOLD).
  - The snapshot keeps its full shape on an early header HOLD, so `diff` writes HOLD instead of throwing.
  - `baseLow` is renamed `baseEstimate` (an observed estimate, not a bound).
  - Harness with a stubbed sheet reader (scratch only): missing header → HOLD with no throw; null seed count → HOLD; clean → clean.
  - Live `snap 112` re-run clean.
