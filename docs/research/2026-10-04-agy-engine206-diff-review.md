---
title: engine.206 diff review (agy, d7ac5fff)
created: 2026-10-04
updated: 2026-10-04
type: reference
tags: [engine, sports, review, accepted]
sources:
  - docs/plans/2026-09-11-sports-as-a-lived-system.md
pointers:
  - "[[plans/2026-09-11-sports-as-a-lived-system]] — Task 6 build card"
---

# Diff Review: engine.206 (d7ac5fff)

**Verdict: HOLD**

**Disposition (engine-sheet, 2026-10-04 03:10):** HOLD read against the code. §1 cannot fire with a real week object — `sportsWeekRecord.js:207` sets `vol = 0` when `g = 0`, so `signed = 0` and the `.15` gate holds; the `g > 0` guard is folded anyway (free, mirrors Phase 5). §2 is real for an in-memory harness and folded (`!isCarried &&` on the ledger row). §3–§5 confirmed safe. §6: the dead `gd` line is removed; the "omitted `neighborhood === venue[0]`" claim is a misread — `transitCauses.test.js` asserts `eq(c[0].neighborhood, 'Jack London', 'at venue[0] …')` on the two-hood fixture and `eq(c[0].neighborhood, 'Baylight District', …)` on the one-hood fixture. Fix-up commit follows d7ac5fff.

Adversarial diff review completed for the engine.206 cut against the requested constraints.

### 1. A path where `sportsWeekBarsFor_` names bars for a franchise that did not move them
**FOUND.** In `phase06-analysis/economicRippleEngine.js:487`, the second loop in `detectCalendarRipples_` lacks a `swk.g > 0` check. If a franchise has no games (`g === 0`) but still carries a `signed` score $\ge 0.15$ (e.g., missed off-season expectation) and carries a `venueShare >= 0.5`, it will clear the gate and claim its venue's bars via `swHome`. Because Phase 5 (`applyBusinessDynamics.js`) correctly requires `g > 0` to physically move the bars, Phase 6 will attach those bars to a franchise that contributed exactly zero to their movement. 

### 2. `bizIds` reaching a carryover ledger row
**FOUND.** In `phase06-analysis/economicRippleEngine.js:288`, the scope defaults to business if `rlr.bizIds && rlr.bizIds.length`. While the Phase 9 snapshot compactor correctly drops `bizIds` in PROD across real cycles, an in-memory harness test advancing `currentCycle` without running `compactEconomicRipples_` will process the retained array. `isCarried` will evaluate true, yet `targetScope` will evaluate to `business` and ledger the carryover row with the birth `bizIds`. Fix by guarding the ledger row directly: `(!isCarried && rlr.bizIds && rlr.bizIds.length)`.

### 3. The `buildContractSeeds` lead change altering any seed that holds no carryover
**NOT FOUND (Safe).** In `phase07-evening-media/buildContractSeeds.js:452`, the loop `if (group[li].effectType !== 'carryover') { lead = group[li]; break; }` will match `group[0]` immediately on the first iteration if no carryover is present. It reassigns `lead = group[0]`, perfectly preserving the prior behavior without mutating or altering the seed.

### 4. The transit ripple firing on an away week or twice for one franchise
**NOT FOUND (Safe).** In `phase02-world-state/updateTransitMetrics.js:321`, the ripple creation is guarded by `!(gdw && gdw.h > 0)`, successfully preventing an away-only week (`h=0`) from firing. Because it runs within a `for (var gdf in gdWeeks)` loop iterating object keys, it strictly processes each franchise exactly once.

### 5. Apps Script incompatibilities (no ES6 in phase files)
**NOT FOUND (Safe).** The added code across the four phase files (`updateTransitMetrics.js`, `applyBusinessDynamics.js`, `economicRippleEngine.js`, and `buildContractSeeds.js`) relies strictly on ES5 standard syntax (`var`, `indexOf`, `slice`, standard `for` loops). No `const`/`let`, arrow functions, template literals, or ES6 array methods (like `.includes()`) were introduced into phase code.

### 6. Any silent fallback or weakened assert in the 5 test files
**FOUND.** In `scripts/transitCauses.test.js:275`:
- **Weakened assert:** The test completely omits checking `r.neighborhood === gdw.venue[0]` as dictated by the plan. It asserts `targetIds` but confusingly labels it `'transit-event targets venue[0]'`. 
- **Dead code:** A completely unused, dead arrow function `const gd = (r) => r.ctx && [];` is left silently hanging at the top of the test block.
