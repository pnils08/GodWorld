---
title: stale NEXT lint fold re-review 3 of 2cd2f287
created: 2026-10-30
updated: 2026-10-30
type: reference
tags: [docs, review, active]
sources:
  - output/codex/TASK-2026-10-29-stale-next-lint-rereview-3.md
  - docs/for-claude-review/2026-10-29-codex-stale-next-lint-rereview-2.md
  - commit 2cd2f287
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — row state source for the notice"
---

# Codex re-review 3 — stale NEXT lint (`2cd2f287`)

**Verdict: SHIP for the stale-NEXT fold.** The staged-removal false negative from round 2 is closed. I found no new defect in the changed detector, its CLI path, or the hook call. This is a code and local-test verdict; I did not run the hook against the shared index.

## Round-2 finding

**SHIP — an absent index entry stays absent.** `scripts/docLoopStatus.js:238-246` now checks whether each path exists in the index. A staged removal supplies empty content instead of the working file; a present path is read with `git show :path`. If either Git read fails, `printStale` emits a visible `NEXT STALE: not checked` message (`scripts/docLoopStatus.js:218-230`) rather than substituting working data. With a NEXT lead and the plan absent from the index, the existing detector reports `no such row` (`scripts/docLoopStatus.js:259-266`). The hook still runs the staged mode for commits touching the rollout, archive, or handoff and prints nonempty output (`.githooks/pre-commit:75-81`). Input: the synthetic `engine.920` plan is staged for removal while its working copy still says `ready`. Output: the new scratch-repo test sees `engine.920 — no such row` (`scripts/docLoopStatus.test.js:122-126`).

## Adversarial check

- The prior staged-close/working-open and staged-open/working-closed cases remain covered (`scripts/docLoopStatus.test.js:109-121`); neither can borrow the working state through the new reader.
- `git ls-files --cached -- <path>` and `git show :<path>` are passed as argument arrays with `cwd` at the repository root (`scripts/docLoopStatus.js:241-245`), so a NEXT id or path cannot become a shell command. A missing file and an unreadable index take separate paths; neither silently reads the working copy.
- The warning remains report-only by design: `printStale` returns after a read failure, while the hook captures and prints its diagnostic (`scripts/docLoopStatus.js:222-225`; `.githooks/pre-commit:76-81`). No additional finding follows from that existing notice policy.

## Evidence and limits

- `node scripts/docLoopStatus.test.js`: **28 passed, 0 failed**. `--stale-next` with and without `--staged` exited 0 with no output for the current open NEXT leads. `--lint` and `--gate` exited 0 with a clean rollout lint and two unrelated overdue rows; `--gate-handoff` reported clean shape. `bash -n .githooks/pre-commit` and `node --check` on both changed scripts passed.
- The test uses a scratch Git repository for staged edits, staged removal, and a no-repository error. The prior saved detached-worktree hook replay covers the staged-close/working-open case, not this new staged-removal case. I read source and ran local checks; I did not invoke the hook against the shared index or perform Sheet, Cycle, network, deployment, or code work.

**Gate:** the named stale-NEXT code review is SHIP. The saved hook receipt and focused tests support the commit-time mechanism; operational use of a future commit remains outside this review.
