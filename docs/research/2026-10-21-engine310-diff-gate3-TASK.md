# TASK — codex: engine.310 diff gate 3 (recheck the gate-2 folds)

Read-only: code + docs + `output/` files; no cron, model, Sheet, bench, clasp, commit or push. Write to `docs/for-claude-review/2026-10-21-codex-engine310-diff-gate3.md`, SHIP / FIX per item with file:line evidence, under ~10 lines. Report in one line when done.

The gate-2 folds are in the last section of `docs/research/2026-10-21-engine310-diff-gate2-TASK.md`.

1. **Push** — `output/engine-sheet/2026-10-21-push-e310-prod.sh`: the C113 watch gate (Cycle / vs / hold / verdict / fields). Hunt: any way a non-C113 or held watch file still passes; anything else in your item 1.
2. **Watch** — `output/engine-sheet/2026-10-21-e310-c114watch.js` + `-c114watch-c112-dryrun.json`. Hunt: any input that can still read as zero or NaN with no HOLD; the pinned-rule read; anything else in your item 2.

Done = the md exists.
