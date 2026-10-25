---
title: engine.301 F1 PROD gate 3 fire-window recheck
created: 2026-10-25
updated: 2026-10-25
type: reference
tags: [engine, draft]
sources:
  - docs/for-claude-review/2026-10-25-engine301-gate3-recheck-TASK.md
  - docs/for-claude-review/2026-10-25-codex-engine301-gate3.md
---

# engine.301 F1 — gate 3 recheck

**PROD verdict: HOLD.** Prior bench-receipt and staged-tree SHIP findings stand; this recheck concerns only the fire window (`docs/for-claude-review/2026-10-25-codex-engine301-gate3.md:10-25`).

- The fold reads `Engine_Errors` at all three fire-state checks and rejects any numeric Cycle >= 113; the final check precedes `.DONE` (`output/engine-sheet/2026-10-25-push-e301-prod.sh:31-52,65-69`). That detects a persisted, correctly stamped error row, but the printed `C113 not fired` conclusion exceeds that evidence.
- Admission writes `FIRE_ADMISSION_JSON` as C113 `running` before the body; it writes no mandatory `Engine_Errors` row then (`phase01-config/godWorldEngine2.js:343-349,446-459`). A pre-advance failure can leave the record `aborted` with no close error (`godWorldEngine2.js:410-415,438-440`); setup can throw before `ctx` and its phase-error logger exist (`godWorldEngine2.js:480-518`).
- Even after advance, a failed or unpersisted close logs its problem only best effort (`godWorldEngine2.js:418-440`). `logEngineError_` catches an append failure without persisting a row (`godWorldEngine2.js:104-130`). A phase error before `summary.cycleId` is set is stamped `Unknown`, which `num()` excludes from the C113+ count (`godWorldEngine2.js:111-118,155-168`; `2026-10-25-push-e301-prod.sh:36,44-45`). Thus C113 can be admitted while all checked Sheet counters and the error count still pass.
- **Smallest acceptable evidence:** at each pre-push, post-pull-back, and eight-minute read, obtain the same PROD project's `FIRE_ADMISSION_JSON` through an authenticated read-only path; parse and validate the complete record, match its expected C112 `done` baseline, and fail on a missing, malformed, changed, or C113+ admission. Keep the existing Sheet checks. The current web `getprop` whitelist excludes that key, and `doGet` with valid `expect` invokes a Cycle unless it requests the checkpoint (`utilities/webTrigger.js:30-51,163-176`). A reviewed read path and fresh at-push reads are required before SHIP; the task's earlier dry run is a snapshot, not fire-window proof.

No PROD push, live fire, Sheet read, or bench run was performed in this recheck.
