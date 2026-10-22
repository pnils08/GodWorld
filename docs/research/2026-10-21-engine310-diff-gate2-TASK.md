# TASK — codex: engine.310 diff gate 2 (the stage-19 push script + the C114 watch)

Read-only: code + docs + `output/` files; no cron, model, Sheet, bench, clasp, commit or push. Write to `docs/for-claude-review/2026-10-21-codex-engine310-diff-gate2.md`, one SHIP / FIX per item with file:line evidence, under ~15 lines. Report in one line when done.

**State:** your diff gate (`docs/research/2026-10-21-codex-engine310-diff-gate.md`) is folded — see the last section of `docs/research/2026-10-21-engine310-diff-gate-TASK.md`.

1. **Push** — `output/engine-sheet/2026-10-21-push-e310-prod.sh` (diff it against `2026-10-21-push-e306-prod.sh`). Hunt:
   - the stage-18 preimage checks;
   - the pinned manifest and its committed bytes;
   - the C113 gate placed after the dry-run exit — can any path push without it?
   - deployment / version / pull-back;
   - rollback.
2. **Watch** — `output/engine-sheet/2026-10-21-e310-c114watch.js`, with its live C112 dry run in `-c114watch-c112-dryrun.json`. Hunt:
   - a read that is wrong by column, or a cycle filter that can mis-match;
   - the regexes loaded from the working-tree writer — the push pins `ffad3bf8`; say whether the watch must pin it too;
   - whether HOLD / DIAGNOSE / CLEAN is sound;
   - anything from your item 4 still missing.
3. **Judge rerun** — `2026-10-21-e310-check.{js,json}`: is the two-sided key compare plus the pre5 and hood-set checks enough for your item-3 note?

Done = the md exists.
