---
title: civic.38 renew move and stall clock review
created: 2026-10-04
updated: 2026-10-04
type: reference
tags: [civic, research, draft]
sources:
  - docs/plans/2026-09-19-civic-wake-game-loop.md — acceptance 7 and later clock ruling
  - scripts/cron-civic-run.js — move validation and Sunday sweeps
  - scripts/cron-civic-tick.test.js — renewal tests
pointers:
  - "[[../plans/2026-09-19-civic-wake-game-loop]] — owning civic.38 plan"
---

# civic.38 renew move and stall clock review

**Verdict: HOLD on acceptance 7 as written.** The `renew` move itself does not stamp work or stage fields, but repeated `work` on a Standing or Delivering row does move the active stall reference. The owning plan says both that work never renews the clock and, in its later ruled implementation, that these stages run from the latest work. The builder or owning terminal must reconcile those statements before this acceptance can be called SHIP. This is a source review and local test, not a live-Sheet or bench finding.

## Findings

1. **SHIP for the `renew` move's clock isolation.** `scripts/cron-civic-run.js:2640-2644` validates `renew` separately from `work`; `scripts/civicInterventionValidation.js:79-85` rejects a stalled phase. The Sunday work fold alone stamps `LastWorkCycle` and `LastWorkSeat` (`scripts/cron-civic-run.js:2776-2802`). `renewSweep` rechecks eligibility and writes only the four `Renewal*` fields (`scripts/cron-civic-run.js:3057-3084`), and the normalization gate keeps those fields separate from the work stamp (`scripts/applyTrackerUpdates.js:270-306`). The exact update shape and rerun idempotence are asserted at `scripts/cron-civic-tick.test.js:552-566`. A renewal request cannot itself revive a stalled row or restart its clock.

2. **HOLD for the literal repeated-work clock rule.** Acceptance 7 says repeated `work` without a stage change must not renew the clock (`docs/plans/2026-09-19-civic-wake-game-loop.md:89`; also `:78` and `:148`). The same plan's later builder ruling and as-built rule define a separate untended clock for Standing and Delivering (`docs/plans/2026-09-19-civic-wake-game-loop.md:388,404`). The implementation takes `max(LastStageChangeCycle, LastWorkCycle)` as its reference (`lib/initiativePhaseContract.js:756-807`; mirrored at `phase05-citizens/civicInitiativeEngine.js:3880-3913`). With a synthetic Standing row at C113, stage change C100 and limit 12, the local pure-function check returned `stalled: true` for last work C100 but `stalled: false` for last work C109, with no stage change. Repeated work therefore extends this clock. The current `renew` tests cover funding eligibility and staging (`scripts/cron-civic-tick.test.js:504-571`); they do not establish the older acceptance 7 clock claim.

3. **SHIP for zero approval credit on a stall revival in the normal single-fire path.** Revival requires `LastWorkCycle >= StageHold.st` and clears the stall marker after restoring the prior phase (`phase05-citizens/civicInitiativeEngine.js:3916-3937,4435-4467`). Approval classifies a move from a failing phase to a live phase as `sitting` (`phase05-citizens/updateCivicApprovalRatings.js:1086-1106`), which pays zero in the local approval test (`scripts/civicApprovalCeiling.test.js:275-287`). A prior review records a separate engine re-fire boundary limit for delivery credit (`docs/plans/2026-09-19-civic-wake-game-loop.md:410-412`); this check does not extend to that boundary.

## Validation and routing

- `node scripts/cron-civic-tick.test.js`: 68 passed, 1 failed. All `renew` cases passed; the unrelated `orBatch` importability case at `scripts/cron-civic-tick.test.js:859-864` failed because this sandbox refused its child `node` process (`spawnSync node EPERM`).
- No code or contract edited. Route the acceptance 7 conflict to the civic.38 owner for a ruling: retain the later untended-clock behavior and revise the older criterion, or change the engine clock to enforce the criterion. The `renew` funding path needs no change for this finding.

## Changelog

- 2026-10-04 (codex) — Read-only renew path and stall-clock check filed for Claude review.
