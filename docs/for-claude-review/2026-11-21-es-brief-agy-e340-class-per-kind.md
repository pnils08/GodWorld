---
title: Brief — agy adversarial plan review, engine.340 Task 2 (seed class per kind)
created: 2026-11-21
type: brief
pointers:
  - "[[../plans/2026-11-08-seed-builder-class-per-kind]] — the plan under review"
---

# Brief: engine.340 Task 2 plan review (read-only)

**Plan:** `docs/plans/2026-11-08-seed-builder-class-per-kind.md` — read §Found, §Read-before, §Task 2 design.
**Code:** `phase07-evening-media/buildContractSeeds.js` (`contractSeedIsMajor_` :123, `contractSeedUnit_` / `contractSeedUnitGroups_` :150-200, class at :594-596), `utilities/rippleLedger.js:104` (hook ripples), every `recordRipple_` / `recordHookRipple_` caller under `phase0*/`.
**Downstream readers of class:** `phase09-digest/finalizeCycleState.js:743`, `phase02-world-state/applyCityDynamics.js:1037`, `scripts/buildLivesSlice.js:315`, `scripts/draftContentRows.js:281`.

Attack, against the code:
1. Any producer causeType or effectType missing from the read-before table (grep both ripple helpers).
2. Any row the table marks "code holds a rank" where the code does not say so.
3. Any kind whose unit grouping (`contractSeedUnit_`) puts two different scales in one unit group, so one bar reads two scales.
4. What removing the cluster-count arm breaks downstream (carry priority, Lives cap, drafter top three).
5. The unlisted-kind behaviour (texture + log line + enumerating test): is it a silent fallback?
6. Anything in the design that is trick code or a weakened rule.

Do not edit code or the plan. Write findings, each with file:line, to `output/antigravity/2026-11-21-review-e340-class-per-kind.md`. Verdict: PASS or HOLD.
