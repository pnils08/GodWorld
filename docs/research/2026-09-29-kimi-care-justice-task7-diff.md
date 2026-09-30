---
title: engine.254 Task 7 demand-first — adversarial diff review (58d06aa0)
created: 2026-09-29
updated: 2026-09-29
type: reference
tags: [engine, civic, research]
sources:
  - docs/plans/2026-09-21-care-and-justice-system.md §Task 7 cut
  - phase04-events/careJusticeService.js
  - phase04-events/chaosCarsEngine.js
  - utilities/chaosCarsConfig.js
  - phase02-world-state/applyInitiativeImplementationEffects.js
pointers:
  - "[[plans/2026-09-21-care-and-justice-system]] — owning plan, engine.254"
  - "[[2026-09-29-codex-task7-demand-first-cut]] — the pre-build cut review this build answered"
---

# engine.254 Task 7 demand-first — adversarial diff review (58d06aa0)

**Scope:** read-only diff review of `58d06aa0` against plan §Task 7 cut (REVIEWED + builder rulings + BENCH-PROVEN). Hunting: weakened/source-text-only tests, silent fallbacks (esp. demand → uniform reversion), clamps hiding signal, throws hiding signal, gates whose input can't reach them (SIM_DOCTRINE §15), draws outside `ctx.rng`, sheet writes outside phase 10, unimplemented spec bullets, ES5 violations (GAS). Working tree at `4f07aafb` is identical to the commit for every touched file. All six claimed suites re-run locally and green: careJusticeService 15, chaosCarsEngine 52, chaosCarsCitizenDial 27, judicialLifecycle 56, careJusticeAccounting 55, hospitalIncomePersistence 48.

## Verdict: SHIP

Every trick-code hunt comes up clean; the spec's fail-loud design is implemented as written. Four low findings below, none blocking; all four are notes for Task 8 or later, not defects in this cut.

## Hunts, verified against code

- **Silent fallback → uniform placement: none.** `pickCareJusticeTarget_` checks the weight sum itself and returns `null` before calling `weightedPickChaos_` (`chaosCarsEngine.js:345`), whose uniform-at-zero fallback is real (`:76`). Non-finite/negative weights throw by hood (`:337-339`). Zero total → friction line, event skipped (`:642`). The pre-loop guard (`:634`) sits after the two array inits and before `pickEventCount_`; test 9 proves rng unconsumed and both arrays empty. A failed demand phase therefore means zero chaos events for the Cycle — as ruled (the guard's throw is itself caught by `safePhaseCall_`, so the Cycle logs two `Engine_Errors` rows, not one; both loud, cosmetic delta from the cut's wording).
- **Gate whose input can't reach it: no.** The OARI gate's inputs all exist or throw by name: tracker tab/columns/row (`careJusticeService.js:50-101`), `oari_van.initiativeId` (`chaosCarsConfig.js:219`), `INITIATIVE_PHASE_INTENSITY_` presence checked (`careJusticeService.js:74-76`). Bench C142 (stalled → zero weight, no throw) and C143 (dispatch-live → van placed in West Oakland) prove both directions on a live sheet.
- **Hoist is exact.** `INITIATIVE_PHASE_INTENSITY_` (`applyInitiativeImplementationEffects.js:144`) is byte-identical to the removed function-local table; `:352` rebinds `PHASE_INTENSITY` to it. The effects engine's own reader keeps its prior substring fallback (`:552-558`) — the service copies that idiom, it did not invent it (see F1).
- **Diversion probability is the config's own.** coverageContribution outcomes sum 0.25 + 0.25 = 0.50 (`chaosCarsConfig.js:222-226`), each weight domain-checked, sum > 1 throws.
- **Draws: rng-only, count change asserted, not hidden.** No `Math.random` anywhere in the diff; the demand phase is deterministic arithmetic (spec §1). T4-12's 39 → 42 draws is exactly the spec'd +1 draw per demand-vehicle citizen event, and the updated assertions still pin the full ID sequence — the test got more precise about the new path, not weaker.
- **Tests: no source-text-only or weakened assertions.** The three pre-existing harnesses got the shared fixture (spec §Tests: "stay green with the fixture, not without it" — the pre-loop guard enforces exactly that). `makeDemandFixture_` concentrates weight in one hood by construction; multi-hood placement is covered in careJusticeService.test.js blocks 1/2/7/10.
- **Sheet writes outside phase 10: none.** The phase writes `S` and 23 `Logger.log` lines only (`careJusticeService.js:209-218`); SHEETS_MANIFEST untouched.
- **Spec bullets: all present.** Shape with `methodVersion`/`basis`/`unallocated: unavailable`/city-as-sum-of-rounded-hoods; `hospitalIntakeType: 'illness'`; hood-set drift throws both directions; blank-as-zero numeric domains throw (test 12); clearance held to (0,1]; rates [0,1] with 0 and 1 legal; overdraw revises total up to tracked with `modelledTotal` + `overdrawn` + log line, identity holds (test 13); `careJusticeOtherResident_` shipped tested and uncalled as ruled; both entry points wired (`godWorldEngine2.js:329`, `:2043`); `delete S.careJusticeDemand` at phase start (`careJusticeService.js:127`) stops a stale object satisfying the pre-loop guard on a reused ctx.
- **ES5: clean.** No arrow functions, `let`/`const`, template literals, or iterator helpers in the engine files; `var` + index loops throughout. Test files are Node-side and exempt by convention.

## Findings (low; none block)

- **F1 — unknown `ImplementationPhase` substring fallback can invent or erase deployment.** If the tracker phase is not an exact key, `careJusticeOariHoods_` deploys on the first table key that is a *substring* of the phase string (`careJusticeService.js:85-91`): a future `post-dispatch-live` would silently deploy at intensity 1.0; an unmatched string silently reads as 0. This mirrors the effects engine's own reader (`applyInitiativeImplementationEffects.js:552-558`), so it is consistent rather than new — but for a deployment gate, exact-match-or-zero with the unknown phase logged would be the §15-purer form. Note for engine-sheet; do not diverge the two readers unilaterally.
- **F2 — tracker hood names that miss the crime table are silently unconsumed.** `deployed` accumulates any trimmed string (`careJusticeService.js:93-97`); a misspelled or aliased hood in `AffectedNeighborhoods` matches no demand hood and yields zero OARI weight with no log. Bench proved the live three names match; a one-line "listed but unknown hood" log would make drift visible. Low.
- **F3 — the status exclusion now lives in three copies.** `pickCitizenTarget_` (`chaosCarsEngine.js:183-186`), `careJusticeTrackedByHood_` (`careJusticeService.js:104-124`), `pickCareJusticeTarget_` (`chaosCarsEngine.js:313-322`) — verbatim today, as the cut demanded. A future status added to one copy silently desynchronizes `trackedShare` from the pickable set; the `trackedShare mismatch` throw (`chaosCarsEngine.js:349`) catches only the chosen-hood-empty direction, not the reverse. Extract to one helper in Task 8 when the census assembler lands.
- **F4 — spec test bullet (2) shipped as a different (also valid) case.** The cut asked for "two safety rows union their hoods"; shipped test 2 proves a non-matching initiative ID cannot deploy (ID filter). The union behavior itself (two rows sharing `InitiativeID`) is implemented (`careJusticeService.js:78-82`) but not exercised by any test. One-line test addition at the next touch.

## Changelog

- 2026-09-29 (kimi) — Adversarial diff review of `58d06aa0`: SHIP; 4 low findings (F1–F4), all deferred-class notes.
