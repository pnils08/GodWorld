---
title: stale NEXT lint fold re-review 2 of 87c3bfab
created: 2026-10-30
updated: 2026-10-30
type: reference
tags: [docs, review, active]
sources:
  - output/codex/TASK-2026-10-29-stale-next-lint-rereview-2.md
  - docs/for-claude-review/2026-10-29-codex-stale-next-lint-rereview.md
  - commit 87c3bfab
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — row state source for the notice"
---

# Codex re-review 2 — stale NEXT lint (`87c3bfab`)

**Verdict: HOLD for a complete commit-time notice.** The ordinary partial-stage close from the prior review is fixed. A new index-read fallback can still make `--staged` silently inspect an uncommitted working file when an input is absent from the index.

## Prior finding

**SHIP — staged close with the working row restored.** `.githooks/pre-commit:75-81` now calls `--stale-next --staged`. `scripts/docLoopStatus.js:218-220,232-236,435-436` reads tracked inputs from the index, and the new scratch-repo assertions cover both directions of a staged/working row-state split (`scripts/docLoopStatus.test.js:100-117`). The saved real-hook replay reports the specific staged `done-pending-archive` / working `ready` case, visible `NEXT STALE`, and exit 0 (`output/engine-sheet/2026-10-29-stale-next-hook-replay.log:10-18`). I read that receipt; I did not rerun the hook against the shared index. The earlier archive-table fix remains intact (`scripts/docLoopStatus.js:249-265`).

## Finding

1. **HOLD — a missing index entry silently substitutes the working file.** `stagedOr` catches every `git show :path` failure and returns `readOr` of the working path (`scripts/docLoopStatus.js:232-236`). Input: a tracked `docs/engine/ROLLOUT_PLAN.md` is staged for removal while its working copy still has a `ready` `engine.920` row and `SESSION_CONTEXT.md` still leads with `engine.920`. The hook sees the staged plan path (`.githooks/pre-commit:75-76`), but `git show :docs/engine/ROLLOUT_PLAN.md` fails because that path is absent from the index. The fallback supplies the uncommitted `ready` row, so `staleNextLeads` emits nothing instead of the `no such row` warning its absent-row branch defines (`scripts/docLoopStatus.js:260-266`). A local scratch Git repository reproduced `stagedPath=docs/engine/ROLLOUT_PLAN.md`, `indexPlan=missing`, `workingPlanExists=true`, and empty `stagedNotice`. The rollout gate also reads the working plan and checks only added staged rows (`scripts/docLoopStatus.js:73-75,171-187,190-200`), so this removal does not supply a separate stale notice. An ordinary state flip with all four files present in the index is unaffected. Handle an absent staged file as absent content; surface any other index-read failure rather than changing the source silently. Add a staged-removal regression.

## Checks and limits

- `node scripts/docLoopStatus.test.js`: **26 passed, 0 failed**. `--stale-next` with and without `--staged` exited 0 with no output for the current open leads. `--lint` and `--gate` exited 0 with a clean rollout lint and two unrelated overdue rows; `--gate-handoff` reported clean shape. `bash -n .githooks/pre-commit` and `node --check` on the two changed scripts passed.
- The new regression covers staged and working **edits** to a row, not a file absent from the index. The staged-removal probe used a synthetic row and a scratch repository under `/tmp`; it did not modify the shared index or run its hook.
- The saved hook log is a builder receipt for its detached-worktree replay, not an independently repeated hook run. No Sheet, Cycle, network, deployment, or code work was performed for this review.

**Gate:** preserve the now-working partial-stage row warning, and make `--staged` report from the index even when one of its inputs is staged for removal; do not accept an unreadable index as the working tree without a visible diagnostic.
