---
title: Wakes have no rules — rebuilt lock recheck
created: 2026-10-17
updated: 2026-10-17
type: reference
tags: [engine, reference]
sources:
  - docs/for-claude-review/2026-10-17-wake-no-rules-lock-recheck-TASK.md
  - docs/for-claude-review/2026-10-17-codex-wake-no-rules-fix-recheck.md
pointers:
  - "[[plans/2026-09-10-inactivity-is-regression]]"
---

# Verdict: SHIP — bounded lock fix

Reviewed `6bab1571` at matching clean worktree HEAD. All code citations below refer to **/root/GodWorld-wake**. Only this review written; no tests that create scratch files, cron/model/Sheet/bench/canon execution, commit or merge. Syntax checks on both changed files and commit whitespace check passed.

- **Create-before-token — SHIP, closed.** `lib/wakePerception.js:887-889` writes the complete token to a private temporary file before atomically hard-linking it to the lock pathname. Competing publishers cannot replace an existing path; the losing publisher removes only its own temporary file. A preemption during token writing no longer exposes an empty shared lock. Existing empty/unparseable ownership fails closed (`:894-896`; test `lib/wakePerception.test.js:265-266`).
- **Dead-lock break / replacement / third contender — SHIP, closed.** Only one breaker can acquire the also-atomic `.break` path (`wakePerception.js:897-898`). It rechecks the original dead token before unlinking (`:900`); another breaker cannot replace that lock between this check and unlink. The dead owner cannot execute a release, and ordinary publishers cannot replace an occupied pathname. After removal, a third contender may win publication, but the breaker then fails its own exclusive publication (`:902`) and never enters `fn`. The previous rename-away/live-lock restoration window is gone.
- **Release — SHIP.** `wakePerception.js:892,904` releases only its token after `fn` settles. While that owner is alive, other participants cannot break its lock (`:886,896`), so there is no protocol-driven replacement between release's read and unlink. The same reasoning applies to `.break`, which has no takeover path. Under cooperating same-host callers, unique tokens and normal local filesystem semantics, no remaining interleaving admitting two live callbacks or removing a live owner's lock was found.
- **Tests — SHIP as bounded evidence, not exhaustive proof.** Eight processes over three dead-lock rounds record append-only `in/out` receipts and assert maximum occupancy one (`wakePerception.test.js:273-288`); unlike the previous mutable Sheet surrogate, overlapping recorded intervals cannot overwrite each other. The full-writer test now separately counts append calls (`:350-358`), closing the false-pass path where two writes produced one final array. Commit-then-throw recovery leaves the spool, then verifies zero additional append calls and removal after readback (`:311-319`). These are real behavioral checks, not merely helper-output mirrors. They were source-inspected, not rerun here; the plan reports 108 passing wakePerception checks.
- **Test limits / liveness:** stress scheduling is nondeterministic, child exit codes are not asserted, and `entered >= 3` is aggregate rather than proof of one entry in each round (`:282-288`). Those limit the test claim, not the source-level exclusion argument. A crash holding `.break` can block later dead-lock recovery; unknown ownership likewise requires intervention. The plan explicitly accepts this fail-closed residual (`/root/GodWorld/docs/plans/2026-09-10-inactivity-is-regression.md:548`); spooled rows remain, and no automatic unsafe takeover is added.

**Final gate: SHIP `6bab1571` for the requested lock recheck.** Both prior concurrency findings close. This is not live Sheets/exactly-once proof or deployment authorization; the existing C112 readback and separate W3 approval gates remain.
