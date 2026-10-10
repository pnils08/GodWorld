---
title: codex review — engine.214 implementation 89a59860
created: 2026-10-10
updated: 2026-10-10
type: review
tags: [review, engine]
sources:
  - docs/for-claude-review/2026-10-10-engine214-impl-review-TASK.md
  - docs/plans/2026-10-10-engine-214-mood-per-hood.md
  - commit 89a59860
  - phase02-world-state/applyCityDynamics.js
  - phase08-v3-chicago/v3NeighborhoodWriter.js
  - phase01-config/godWorldEngine2.js
  - scripts/perHoodDynamics.test.js
---

# codex review — engine.214 implementation

**Target:** commit `89a59860`, against the Mood Per Hood plan D1–D11, Task 14 and §Build deviations. Findings follow the eight requested hunts.

**Result:** HOLD

The pipeline order, final-hood city mean and initiative-scalar removal check out. Acceptance still needs the citywide-seed mismatch and two failure-path defects resolved (Findings 2 and 7). The remaining writer membership literal is pre-existing and separately identified in Finding 5.

Reviewed source and test files match `89a59860` at checkout `dcc4aa1a1cefe32e2d542694fbd10cf92d82cfd4`. Only this report was written; the pre-existing plan-review modification and other workspace changes were preserved. Validation was local: seven targeted suites, **232 assertions passed**, plus isolated VM probes. No Sheets, bench, deployment or full-Cycle proof is claimed.

| Suite | Passed |
|---|---:|
| `scripts/perHoodDynamics.test.js` | 48 |
| `scripts/hoodBlindTables.test.js` | 22 |
| `scripts/hoodEconomyRelative.test.js` | 29 |
| `scripts/activityObservationsCarry.test.js` | 24 |
| `scripts/sportsWeekCity.test.js` | 48 |
| `scripts/sentimentRestingLevel.test.js` | 31 |
| `scripts/engine94SheetContract.test.js` | 30 |

The declared deviations at `docs/plans/2026-10-10-engine-214-mood-per-hood.md:123` are reflected in the implementation: ≥3 crime nightlife remains ×0.90; ordinary unknown zones throw; writer calendar tiers use the declared scene weights; the sports writer-call harness was migrated. The plan's separate 287/287 full-suite claim was not independently rerun.

## Findings

1. **Hunt 1 — PASS: no live A–O value becomes the dynamics base. Severity: INFO.** `hoodProfile_` reads the authored character and BoomIndex plus the canon zone/scenes (`phase02-world-state/applyCityDynamics.js:93`); `hoodCharacterBase_` uses those values only (`:121`). The allowed live-Sentiment bootstrap is isolated behind missing carried dynamics (`:1291`, `:1298`), and normal carry takes precedence. In a VM probe with normal carry for all 22 fixture hoods, replacing Sentiment and the live nightlife/retail/event/noise/crime fields with unrelated extreme values changed **zero** hood outputs. The committed bootstrap-versus-carry tests also pass (`scripts/perHoodDynamics.test.js:186`). No base feedback violation found.

2. **Hunt 2 — FIX: no duplicate application found in the rebuilt hood pass, but the required citywide seed effect is missing. Severity: MEDIUM.** The old demographic/economy micro blocks and second total-seed ladder are gone. Each hood gets one demographic application (`phase02-world-state/applyCityDynamics.js:1164`), economy application (`:1169`), crime ladder (`:1180`) and local seed boost (`:1185`). The retained weather-front, place-bias and realised-weather layers are explicitly specified in D4, so their combination is not an undeclared duplicate.

   However, D5 and Task 9 require a citywide seed to lift all 22 hoods (`docs/plans/2026-10-10-engine-214-mood-per-hood.md:36`, `:64`). `buildSeedSignals_` accumulates its weight into `citywideWeighted` (`applyCityDynamics.js:1017`), but nothing consumes that field. The only seed application reads `byHood`/`byDomainHood` (`:1062`). The observed-feedback path reads carried **counts**, not this weighted signal (`:878`, `:911`), so it does not implement the promised weighted citywide term.

   **Repro:** using the existing fixture harness, add one clearly synthetic, no-hood seed with priority 20 to its otherwise unchanged empty-seed world. `citywideWeighted` becomes **20**, but **0/22** hood outputs change. The committed test explicitly requires that non-effect (`scripts/perHoodDynamics.test.js:138`–`:142`): “no hood over another” has been implemented as “no hood moves.” This is not among the declared build deviations. **Fix:** implement the agreed shared term and assert an actual equal contribution, or reconcile the plan explicitly to count-only/no-weight behavior before acceptance. A magnitude should be declared, not silently invented by the fix.

3. **Hunt 3 — PASS: bleed is simultaneous, after momentum and before the fold. Severity: INFO.** Capacity and momentum finish for every hood before bleed (`phase02-world-state/applyCityDynamics.js:1277`–`:1313`). Bleed computes into `newSentiments` before mutating any hood (`:1320`, `:1342`), and the fold runs afterward (`:1449`). In a VM probe with different carried sentiments on two fixture hoods, reversing the canon list produced a maximum per-hood sentiment difference of **0**. The committed +0.2 initiative test verifies the full target delta and no same-Cycle export to neighbors (`scripts/perHoodDynamics.test.js:174`). No stage-order defect found.

4. **Hunt 4 — PASS: the city averages final hood values and no longer adds initiative sentiment separately. Severity: INFO.** The fold, commute lift and clamp populate `neighborhoodDynamics` (`phase02-world-state/applyCityDynamics.js:1443`–`:1474`); `hoodMean_` then reads that exact object (`:1532`), followed by city momentum (`:1556`). The former initiative scalar block is retired (`:1663`); sports, edition and media adds remain outside the carrier as designed (`:1573`, `:1731`). A VM probe combining a capped initiative effect, inbound commuters and previous-Cycle approval effects reproduced all eight city metrics from the rounded final-hood means. The committed scalar-only and +0.22-one-hood tests pass (`scripts/perHoodDynamics.test.js:202`). The additional hood-plus-city smoothing is the plan's accepted behavior, not a new defect.

5. **Hunt 5 — residual found: the writer still enumerates a hardcoded hood list beyond the held NYE/Halloween branches. Severity: LOW; pre-existing scope gap.** No executable hood-name selector remains in the dynamics file. Task 14's First Friday/Creation Day modifiers and markers now use Scenes/EmployerCharacter (`phase08-v3-chicago/v3NeighborhoodWriter.js:667`, `:750`). But `NMAP_NEIGHBORHOODS` still contains all 22 literal names (`:55`) and drives writer normalization, row allocation and enumeration (`:462`, `:473`, `:481`). It is executable membership, not a comment or one of the held holiday selectors (`:699`, `:705`). A canon-list change can therefore reach the new dynamics loop while remaining absent from this writer.

   This list predates `89a59860` and Task 14 specifically scoped the calendar/marker branches; it is not an introduced regression or an independent HOLD reason. **Disposition needed:** explicitly grandfather this additional literal surface or scope its later migration, including writer row order/RNG preservation. Do not describe the writer as containing only the two held holiday exceptions.

6. **Hunt 6 — PASS for the changed Phase-2 draw offset; no full-run RNG equivalence claim. Severity: INFO.** The parent and cut dynamics source contain no RNG/random call. The 22-hood modifier passes perform deterministic arithmetic and lookups (`phase02-world-state/applyCityDynamics.js:1149`, `:1277`, `:1443`). The relevant external helpers also do not draw: demographic reads (`utilities/ensureNeighborhoodDemographics.js:134`), economy description (`phase06-analysis/economicRippleEngine.js:888`), adjacency (`phase01-config/canonNeighborhoodLoader.js:175`) and ripple/intent construction (`utilities/rippleLedger.js:40`, `utilities/writeIntents.js:66`). An instrumented cut invocation exercising crime, seeds and initiative effects consumed **0 `ctx.rng` draws** and no `Math.random` call; it used the real ripple function with in-memory queue sinks. Increasing this pass from five templates to 22 hoods therefore does not itself advance the shared RNG.

   Task 14's helper changes add no draws; the writer retains its existing fixed hood enumeration and variance calls (`v3NeighborhoodWriter.js:470`, `:481`, `:494`, `:513`, `:522`). Changed dynamics can still change later consumers' branch choices and draw counts. That is distinct from an extra draw inside this refactor and needs paired full-Cycle evidence if whole-run parity is claimed.

7. **Hunt 7 — FIX: normal throws are caught correctly, but the unknown-label check has a bypass and missing adjacency leaves a false receipt. Severity: MEDIUM.** Both engine entry points wrap CityDynamics in `safePhaseCall_` (`phase01-config/godWorldEngine2.js:582`, `:2299`). That wrapper calls `logEngineError_` on failure (`:165`), whose error-row append is at `:116`. VM probes used these actual functions with an in-memory Engine_Errors sheet: `spaceport`, `tundra` and missing Adjacent each produced one error row, returned false, and left both `S.cityDynamics` and `S.neighborhoodDynamics` unset. Those expected paths pass the task's principal publication check.

   **Unknown-label bypass:** `hoodProfile_` tests `HOOD_CHARACTER_BY_EMPLOYER[character]` by truthiness (`phase02-world-state/applyCityDynamics.js:103`), as does `hoodCharacterBase_` (`:122`). Inherited keys **`constructor`** and **`__proto__`** pass despite having no authored row. The missing row metrics then silently become multiplier 1 through `safeNum_` (`:295`). Replacing one fixture hood's character with either string completed successfully and published finite city/hood outputs instead of raising the required Engine_Errors failure. **Fix:** require an own table property and reject invalid row shape; add both cases to the unknown-label behavior test.

   **Late adjacency failure:** the crime receipt is queued at `applyCityDynamics.js:1215`, but the first adjacency availability check occurs inside bleed at `:1327`. With Adjacent unavailable and one fixture hood at two spikes, the VM probe produced the expected Engine_Errors row and no dynamics, **plus one retained crime Ripple_Ledger append**. The real ripple function also adds the effect to `S.rippleEvents` (`utilities/rippleLedger.js:74`, `:79`), and `safePhaseCall_` does not roll either effect back. Downstream consumers can receive a receipt saying this failed phase applied a crime effect. **Fix:** validate the required graph before mutations/receipts, or defer these receipts until the computation succeeds; assert zero phase-effect intents/events on required-input failure. This was not observed on the early unknown-label/zone failures.

8. **Hunt 8 — source-text checks are supplemental, but important behavior is either untested or tested against the wrong contract. Severity: MEDIUM, tied to Findings 2/7.** The new suite contains real behavioral tests; it is not merely a grep suite. Source-only assertions cover retired cluster identifiers/self-arm wiring (`scripts/perHoodDynamics.test.js:215`–`:218`) and a sliced writer calendar block (`:246`–`:249`); similar retirement checks appear in `scripts/hoodBlindTables.test.js:236`. Those are reasonable static retirement guards, but do not prove graph failure handling, all writer membership or end-to-end persistence.

   The default test world replaces `recordRipple_` with a collector (`perHoodDynamics.test.js:40`), calls CityDynamics directly (`:66`) and tests ordinary unknown values only (`:95`). It never exercises `safePhaseCall_`, Engine_Errors publication, missing Adjacent, inherited label names or retained write intents. Thus 48/48 coexists with both Finding 7 defects. The citywide seed assertion at `:142` actively locks in Finding 2. **Fix:** correct that assertion, add the failing boundary cases with the real wrapper/ripple functions and in-memory sinks, and keep the existing behavior coverage. A passing source scan or the old 31/31 resting-level suite cannot substitute for those regressions.

## Disposition

engine-sheet, 2026-10-10 overnight — every finding verified against the code before acting; fix commit follows `89a59860` (failure-path only; the happy path is byte-equal to the benched engine on a 22-hood fixture world with crime, seeds, both buses, commute, sports, carry — `scratchpad eqCheck`, 22×8 hoods + city + carrier + signals + capacity + ripple rows identical):
1. PASS — nothing to do.
2. **reconciled, not built.** `citywideWeighted` had no reader before this cut either (the old `buildSeedSignals_` exported it the same way; grep 2026-10-10: zero consumers of `S.storySeedSignals` outside the file) — the plan's "lifts every hood through the citywide term" described a term that never existed. The citywide activity path is the count-relative attention gate in `applyObservedFeedback_` (seeds now vs the six-Cycle baseline), which does lift every hood. A weighted citywide magnitude is a rate — a sim call for the builder, not invented here. The test at `perHoodDynamics.test.js` now states that contract in its name and comment; D5's sentence is corrected in the plan's deviations section.
3. PASS. 4. PASS.
5. **held, recorded** as deviation N4 in the plan: `NMAP_NEIGHBORHOODS` (writer `:55`) is executable membership — row order and the per-row RNG draw order ride it, so replacing it with the canon list is its own task with a paired-Cycle RNG check, outside Task 14.
6. PASS.
7. **fixed.** (a) `hoodProfile_` / `hoodCharacterBase_` test an OWN property and a valid row shape (`hoodCharacterRowValid_`): `constructor`, `__proto__`, `hasOwnProperty` now throw like any unknown label — tested. (b) adjacency is read into the profile up front (`getAdjacentHoods_` throws at the profile pass, before anything is computed) AND the crime receipt is queued only after pass C, once every hood value exists — a throw anywhere above leaves no Ripple_Ledger row and no `S.rippleEvents` entry; tested with the Adjacent column absent and a two-spike hood (throws, zero ripple rows, nothing published).
8. **partly.** The three boundary cases above are in the suite with the real ripple collector; `safePhaseCall_` itself is not loaded (godWorldEngine2.js is not a vm-loadable unit) — the contract the suite proves is the one the wrapper relies on: throw before any side effect. The F2 assertion is corrected per 2.

**Reconciled in:** [[../plans/2026-10-10-engine-214-mood-per-hood]] §Reviews reconciled

research-build, 2026-10-10 — F1/F3/F4/F6 PASS recorded (plan A12). F2, F7, F8 → es as Task 16 (citywideWeighted consumed + test inverted; hasOwnProperty on label/zone lookups; adjacency check before pass A so no receipt precedes a throw; safePhaseCall_-path tests). F5 → N3: the `NMAP_NEIGHBORHOODS` enumeration is grandfathered for this cut and named for the post-PROD writer follow-up; the plan no longer says the writer holds only the two holiday exceptions. Step re-declared after Task 16's re-fire.

**Reconciled in:** [[../plans/2026-10-10-engine-214-mood-per-hood]] §Reviews reconciled
