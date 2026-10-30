---
title: stale NEXT lint fold re-review of 312c4254
created: 2026-10-29
updated: 2026-10-29
type: reference
tags: [docs, review, active]
sources:
  - output/codex/TASK-2026-10-29-stale-next-lint-rereview.md
  - docs/for-claude-review/2026-10-29-codex-stale-next-lint-review.md
  - commit 312c4254
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — row states the notice checks"
---

# Codex re-review — stale NEXT lint fold (`312c4254`)

**Verdict: HOLD** on the commit-time notification guarantee. The fold surfaces the notice for a conforming close when staged and working files agree, and it fixes archive table classification. A partial-stage path still commits a closed row without a notice because the hook detects staged paths but the scanner reads working files.

## Prior findings

| Prior finding | Disposition | Evidence |
|---|---|---|
| F1 — row-close warning suppressed | **SHIP for aligned staged/working files; HOLD for the commit guarantee** | `.githooks/pre-commit:75-81` now prints `--stale-next` output on commits staging the rollout, archive, or handoff; `scripts/docLoopStatus.js:215-221,425` supplies an isolated, silent-when-clean mode. The saved detached-worktree hook replay reports a conforming staged close, a visible `NEXT STALE`, and hook exit 0 (`output/engine-sheet/2026-10-29-stale-next-hook-replay.log:1-9`). I read that receipt but did not rerun the hook. Finding 1 below is the remaining staged/working mismatch. |
| F2 — archive table row called nonexistent | **SHIP** | `scripts/docLoopStatus.js:239-253` now recognizes an id at the first cell of a Markdown table row. A local pure probe against the actual archive returned `pipeline.64 — archived` for `docs/engine/ROLLOUT_ARCHIVE.md:345`. The new tests cover a table id and reject an id in another cell (`scripts/docLoopStatus.test.js:64-69`). |

## Finding

1. **HOLD — the hook checks the working tree instead of the proposed commit.** `.githooks/pre-commit:75-81` decides whether to run from `git diff --cached --name-only`, then invokes `--stale-next` without passing the staged content. `scripts/docLoopStatus.js:72-75,215-217,224-225` reads `ROLLOUT_PLAN.md`, `SESSION_CONTEXT.md`, archive, and backlog from the working tree. Input: stage a conforming `engine.920` row changed from `ready` to `done-pending-archive` while NEXT leads `engine.920`, then restore only the unstaged working copy of the rollout row to `ready` before commit. The staged-row ratchet checks the staged diff (`scripts/docLoopStatus.js:171-187`), while the stale scanner sees the working `ready` row and emits nothing. Output: the commit lands the closed row with the NEXT stale and no warning. The inverse staged/working split can also warn about a state that is absent from the commit. Run the commit-time notice on the staged versions of all relevant inputs, or explicitly surface an index/working mismatch before accepting the commit.

## Checks and boundary

- `node scripts/docLoopStatus.test.js`: **23 passed, 0 failed** after allowing its scratch-repo child process. The first sandbox run stopped at `spawnSync node EPERM` after 20 pure assertions; this was an execution restriction, not a test assertion failure.
- `node scripts/docLoopStatus.js --stale-next`: exit 0 and no output for the current open NEXT leads. `bash -n .githooks/pre-commit` and `node --check` on both changed scripts passed. I did not invoke the hook against the shared index.
- The saved replay proves only its reported aligned staged/working case. The new CLI test writes synthetic files in a scratch repository and checks CLI output (`scripts/docLoopStatus.test.js:73-101`); it does not set up a staged/working split or execute the hook. No live Sheet, Cycle, network, or code changes were made for this review.

**Gate:** keep the stale-NEXT guarantee open until a partial-stage close is checked against the staged state and a focused regression shows the warning for the content that will actually commit.
