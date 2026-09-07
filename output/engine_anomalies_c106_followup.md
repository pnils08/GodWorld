# Engine Anomalies — C106 Followup (engine-sheet)

Routed from `output/engine_review_c106.md` §Anomalies. Suppressed from the edition until cleared.

## A. Two Tier-4 incomes doubled with no cohort (route-to-engine-debug, high confidence)

| POPID | Citizen | Role | Hood | C103 | C104 | C105 | C106 | Peer move share |
|---|---|---|---|---|---|---|---|---|
| POP-00260 | Kevel Phoul | Warehouse worker | Lake Merritt | 45,400 | 45,400 | 104,500 | **215,100** | 1% |
| POP-00268 | Shane Phelps | Janitor | Lake Merritt | 93,271 | 93,271 | 106,000 | **283,800** | 1% |

- Both jumped at C105 and again at C106. Both carry a `Maneuver-Climb` LifeHistory row at C106 (engine.157, Phase5-Maneuver: `climb 195 / hold 584 / retreat 39`). Same hood, same tier, same trade class, 1% peer share — a per-citizen write, not a cohort effect.
- The audit's `citizenIncomes` rollup shows **0** other movers ≥50% this cycle, so whatever wrote these two did not touch the other 193 climbers.
- **Check:** which writer set `Simulation_Ledger.Income` for these two rows at C106. Candidates by log order: engine.157 maneuver (`applyTierLadderState_` / climb payoff), engine.96 T10 `applyOwnerDraw_` (5 businesses, 5 owners, 2 paid, 1 gains, 6 unresolved — do either of these citizens resolve as an owner?), engine.61 money loop (`accrued 798`). A janitor at 283,800 is roughly 3× the hood's IncomeMax band; if the climb payoff multiplies income without a band cap, the cap is the fix.
- Not fixed this session: the run-cycle chain was in flight. One-commit fix candidate once the writer is identified; bench on SANDBOX first.

## B. C105 neighborhood-sentiment inflation (routed from the review, not the detector)

- All 22 hoods rose a mean +0.375 at C105 and fell a mean −0.515 at C106. Four hoods exceeded 1.0 at C105 (Adams Point 1.03, Baylight District 1.05, Dimond 1.01, Ivy Hill 1.09). C106 values (0.23–0.51) sit just below C104 (0.33–0.60).
- The C105 execution log's named sentiment sources sum to about +0.14 (initiative +0.094, sports +0.028, coverage +0.020). The remaining ~+0.25 per hood has no logged source. C106's sources are the same three at the same magnitudes, and the hoods fell anyway, so the C106 drop is a revert of something one-shot at C105, not a new negative.
- The anomaly detector uses a 3-cycle mean and C105 is inside the window, so it did not flag either half.
- **Check:** the Sentiment write path between `applyCityDynamics_` and `saveV3NeighborhoodMap_` for a term that fired once at C105 (the first live fire after the @46–@57 stack: engine.148 P1/P2/P3 hood tables, engine.134 hood identity, engine.162, civic.30/31). Compare the C105 vs C106 execution logs line by line in Phase2-CityDynamics and Phase10-NeighborhoodMap. Also confirm whether Sentiment has a clamp on save — no `Math.min(1` on Sentiment was found in `phase10-persistence/` on a first grep, which would explain the >1.0 values.
- Sift impact: the C105 "sentiment rose everywhere" improvement and the C106 nineteen "decay" ailments are the same artifact. Neither should run as written.

## C. Sim-year constant (2041) still hardcoded at live age-math sites — one cycle stale

- `advanceSimulationCalendar.js` §SIM YEAR: cycles 105–156 are **2042**; `S.simYear` carries it. The engine.148 comment says "every phase reads simYearOf_(); nothing else does the arithmetic", but that sweep covered the `2040 + floor(cycle/52)` class, not the literal-2041 class.
- Live sites found (not fallbacks — they assign the constant): `generateGenericCitizens.js:511,600` (citizen-type classifier), `runConductEngine.js:78`, `householdFormationEngine.js:821`, `citizenContextBuilder.js:39` (`SIM_YEAR`), `runNeighborhoodEngine.js:234`, `godWorldEngine2.js:1384,1435,1446` (roster mint BirthYear/Age), `processAdvancementIntake.js:1477,1658,1845` (household intake BirthYear), `updateCivicApprovalRatings.js:1016,1144,1222`, `runCareerEngine.js:867`, `utilities/ensureNeighborhoodDemographics.js:372`. Fallback-only (harmless while `S.simYear` is set): `chaosCarsEngine.js:177`, `generateCitizensEvents.js:382`.
- Effect since C105: ages computed at those sites read one year young; citizens minted through the roster and household-intake paths get BirthYear one year too late; the generic-citizen type boundaries (22, 65) are off by one. The 7 adults minted this cycle (POP-01085–01091) have BirthYears in the 1989–2013 band and no Age cell, so they are not visibly wrong, but the newborn POP-01084 (BirthYear 2042, correct) reads age −1 in `scripts/auditSimulationLedger.js`, which carries the same 2041 anchor. `utilities/archiveCitizenExits.js:120` does too.
- **Fix shape:** one sweep replacing the literal with `S.simYear` (engine side) and a `simYearFromCycle` read (scripts side); bench on SANDBOX C107; verify with the ledger audit's age guard reading 0 OOB. Filed as an engine row from the C106 gap log.
