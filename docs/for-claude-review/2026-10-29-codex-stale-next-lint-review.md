---
title: stale NEXT lint diff review of d79f9eb5
created: 2026-10-29
updated: 2026-10-29
type: reference
tags: [docs, review, active]
sources:
  - output/codex/TASK-2026-10-29-stale-next-lint-review.md
  - commit d79f9eb5
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — row states checked by the lint"
---

# Codex review — stale NEXT lint (`d79f9eb5`)

**Verdict: HOLD** on the builder's notification guarantee. The detector flags a closed lead when its output is displayed, but the row-close hooks suppress a successful warning. The README change matches the current resolved-review path.

## Findings

1. **HOLD — a row can close without surfacing the stale NEXT.** `scripts/docLoopStatus.js:209-214` prints `NEXT STALE` but leaves `--gate` successful. When `docs/engine/ROLLOUT_PLAN.md` is staged, `.githooks/pre-commit:42-54` captures that output and prints it only on failure. The Claude post-write hook likewise captures `--lint` and forwards only `non-conforming` output (`.claude/hooks/post-write-check.sh:96-102`). `--gate-handoff` returns after the shape check (`scripts/docLoopStatus.js:411-415`), so a staged handoff cannot expose the stale check either (`.githooks/pre-commit:60-68`). Input: terminal A changes an active row led by terminal B's NEXT to `wontfix` or `done-pending-archive` and commits the row. Output: the commit succeeds without a stale-NEXT notice to A or B. `scripts/sessionEndMechanical.js:110-129` does print the lint output when that close path runs, but it is a later, separate invocation. Surface the warning at the row-close hook, and test the caller path, not just the pure detector.

2. **FIX — archive table rows get a false reason.** `scripts/docLoopStatus.js:231,241-243` recognizes only `**id**` in the archive. The actual archive also contains table rows, for example `docs/engine/ROLLOUT_ARCHIVE.md:345` (`pipeline.64`). Input: `NEXT[engine-sheet]` leads with `pipeline.64` after it has been swept. Output: `staleNextLeads` returns `pipeline.64 — no such row` instead of `archived`. The warning still appears, but it directs the owner to a nonexistent-row diagnosis; `scripts/docLoopStatus.test.js` uses only a bold-list synthetic archive fixture. The local pure probe reproduced the wrong reason with the actual archive text.

## Checked scope

- `node scripts/docLoopStatus.test.js`: 18 passed, 0 failed. `--lint`, `--gate`, and `--gate-handoff` each exited 0 on the current files; the first two reported no current `NEXT STALE` warning and the handoff gate reported a clean shape. These are read-only local checks, not a hook invocation or a row-close replay.
- `SESSION_CONTEXT.md:5-7` has two NEXT leads, `engine.270` and `pipeline.93`; both are currently open in `docs/engine/ROLLOUT_PLAN.md`. The archive has both table and bold-list entries; `docs/plans/BACKLOG.md` uses bold-list entries for parked items.
- `docs/for-claude-review/README.md:30-43` now sends resolved reviews to `docs/archive/for-claude-review/` and states that guests carry no NEXT. The archive directory and owning-plan links support the review-home claim. **README: SHIP.**

No code, live Cycle, Sheet, or network work was run for this review.
