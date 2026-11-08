---
title: Codex governance.58 fold rereview
created: 2026-11-07
updated: 2026-11-07
type: reference
tags: [governance, infrastructure, review, active]
sources:
  - commit 9f8960e6f
  - docs/for-claude-review/2026-11-07-codex-governance58-review.md
pointers:
  - "[[2026-11-07-codex-governance58-review]] — original HOLD and fold disposition"
  - "[[README]] — Claude review inbox contract"
---

# governance.58 — one fold rereview

**Verdict: SHIP.** Commit `9f8960e6f` closes F1–F4 from the original review. I found no regression in the changed tooling paths.

- **F1 closed:** `.claude/hooks/session-startup-hook.sh:142-147` caps the child at 2 seconds inside the hook's 10-second limit (`.claude/settings.json:216`) and prints an unavailable line if it returns no output. Boot itself was not run because that hook also starts PM2 and touches plugins.
- **F2 closed:** `scripts/docLoopStatus.js:314-320` requires the latest named Cycle/date to be the fire and no later named wait. The retained-C115-receipt cases are covered at `scripts/docLoopStatus.test.js:90-94`; the live C115 list still has the same five plausible rows.
- **F3 closed:** `scripts/docLoopStatus.js:225,327-336` checks only due rows and recognizes a bare row number. Current `--stale-next --staged` warns on `engine.333` via “333 Task 5” and no longer warns on organic `research.32`. The pre-commit path remains a warning (`.githooks/pre-commit:75-81`).
- **F4 closed:** `scripts/docLoopStatus.js:221-228` reads each staged source once, computes both notices inside the same error guard, and retains the visible index-read failure notice.

**Checks:** `node scripts/docLoopStatus.test.js` passed **43/43** in a local scratch repository; `node --check scripts/docLoopStatus.js`, `bash -n .claude/hooks/session-startup-hook.sh`, and `--gate-handoff` passed. `--due` and `--stale-next --staged` were read from the current repository. No boot hook, live Cycle, Sheet, deployment, or production network verifier was run.
