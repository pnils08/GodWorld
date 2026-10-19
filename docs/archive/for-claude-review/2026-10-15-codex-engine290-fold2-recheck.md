# engine.290 fold 2 recheck — Tasks 6–8 and congestion cause

**Target:** `f72efb8f..18c9505a`, restricted to the TASK file's paths. **Method:** read-only diff/source review, plus local JSON and source-text comparisons of the two commits. No test, cron, Sheet, bench, model, or canon run. Pre-existing working-tree files were untouched.

**Overall source gate: FIX.** The commute runtime gate and requested hiring rollback are correct. The new `--poolkey` provides a commute-only selection, but the documented unfiltered transit apply still includes held crew rows, and a value-less `--poolkey` silently disables the filter. The engine maps are accurate; the owning plan still conflicts with the code and its own changelog. The catalog move is a pure reorder, but the plan's claimed Sheet row count cannot follow from this JSON.

## Hunt 2 — ECL exposure: SHIP (source gate)

`transitDisruptedHit` remains one short-circuited draw for a working citizen during a disruption or a positive-delay chaos-train hit on their hood: 0.30 in affected/train hoods, 0.12 elsewhere (`phase05-citizens/generateCitizensEvents.js:2863-2867`). The new `occupation.transit` check runs before row Conditions, tags, and pool insertion (`:2966-2991`), so even an empty-Conditions or differently tagged Sheet row with that PoolKey cannot enter when the flag is false. Since the flag itself requires `lifeState.working === 'working'`, a non-worker cannot draw one through this generator. The new malformed-row fixture covers the quiet case (`scripts/contentLedgerCompose.test.js:374-385`). The existing per-row 40-draw cap and 1.15 normalization are unchanged by this fold; actual 0.30/0.12 output frequencies still need the separate bench.

## Hunt 3 — pool apply: FIX

With `--pool transit --poolkey occupation.transit`, the filter selects only the ten authored commute rows, or fewer if some texts already exist (`scripts/undockedEclPoolApply.js:24-26,41-45`; `scripts/transitEclPool.js:26-28,42-75`). The eight crew rows are excluded on that exact command.

**Finding (high, held-row write):** Crew rows are still reachable *without* `--poolkey`: the script's documented `--pool transit --apply` command (`scripts/transitEclPool.js:19-21`) leaves `POOLKEY` null and selects all missing rows, including `occupation.bartCrew` (`scripts/undockedEclPoolApply.js:26,44-45,59-60`). A trailing `--poolkey` with no value becomes `''`; both the validation and filter then skip it and again select all rows (`:26,44-45`). This conflicts with the plan's hold on crew rows (`docs/plans/2026-10-15-engine-290-transit-rides-the-sim.md:59`). Make the transit apply fail closed when the PoolKey is omitted or empty, and update its invocation example. The separate future crew-title mismatch is explicitly held for a builder ruling in the plan changelog (`:134`); no crew write was reviewed here.

## Hunt 4 — hiring rollback: SHIP (source gate)

`Transit Dispatcher` is absent from both new keyword lists; `AC Transit` and `BART` still precede the remaining train-title rules, and those rules remain in matching order (`data/employer_mapping.json:48-71`; `phase05-citizens/processAdvancementIntake.js:1558-1564,1615-1620`). The changed mint test checks that the generic dispatcher no longer names BART (`scripts/mintEmployerPick.test.js:135-144`). A read-only byte comparison of the entire `DEMOGRAPHIC_VOICE_ROLES` array body at `f495246c` and `18c9505a` was identical; the hash-mod selector therefore has its prior length and ordering (`processAdvancementIntake.js:52-93`). The plan changelog explicitly retains the train-title rules on the premise that trains here are BART (`docs/plans/2026-10-15-engine-290-transit-rides-the-sim.md:134`).

## Hunt 5 — docs: FIX

The changed engine maps now state the actual runtime PoolKey gate and distinguish the 1.15 mass at injection from later modifiers and the per-row cap (`docs/engine/ENGINE_COUPLING_MAP.md:227`; `docs/engine/EVENT_SYSTEM_MAP.md:16`), matching `generateCitizensEvents.js:2973-2991`. The owning plan's design text remains stale: it says the chaos hit changes `S.transitState.affectedHoods`, that the five keywords include `Transit Dispatcher`, and that three voice roles are added (`docs/plans/2026-10-15-engine-290-transit-rides-the-sim.md:51-52`). Its later changelog says the opposite for all three (`:134`). Reconcile the plan body and acceptance wording before treating the docs as one consistent contract.

## Congestion cause: SHIP (source gate)

`transitCongestion` is converted to a number in the Phase 2 context (`phase02-world-state/updateTransitMetrics.js:448-469`). On a positive value the station takes the existing `transitCongestion × transitCongestionOnTimeMult` loss and now adds a readable cause to the same `causes` array, which `factorsString_` serializes into the station's Factors (`:807-827,847-855`). The focused test asserts presence at 0.38 and absence at zero (`scripts/transitCauses.test.js:411-418`). No new draw or sheet read is added.

## Catalog reorder and sync: FIX (plan count); SHIP (source reorder)

Read-only JSON comparison found 309 roles on both sides of this fold. The three moved objects are field-for-field identical, all other objects retain their order, and the three now occupy the tail (`data/economic_parameters.json:4286-4328`; `git diff f72efb8f..18c9505a -- data/economic_parameters.json`). `syncEconomicParameters.js` appends roles only when absent, only if shared-role order and all fields match, and only when missing roles are at the JSON tail (`scripts/syncEconomicParameters.js:52-73,97-116`). Thus this reorder makes a three-row append possible **if** the Sheet currently has the preceding 306 roles in order; no Sheet state was checked.

The plan says the same sync should read back `309 → 312` rows (`docs/plans/2026-10-15-engine-290-transit-rides-the-sim.md:58`), while the current JSON itself has 309 roles. A 312-row Sheet cannot be row-for-row equal to that JSON under the sync's checks. Correct the count and establish the actual Sheet baseline before any external write.

**Disposition:** Fix the fail-open transit apply and reconcile the plan. Congestion and the code-level runtime/hiring folds pass this bounded source gate; Task 9 and all Sheet/live proof remain separate.
