# WIRING CARD — S.initiativeNeighborhoodEffects (field) — 2026-09-20

Source: engine-wiring subagent, engine-sheet session 2026-09-20. Lines marked [V] were re-read by the lead against the file after the card came back.

## Writer
- `phase02-world-state/applyInitiativeImplementationEffects.js:132` `applyInitiativeImplementationEffects_`; called `godWorldEngine2.js:293` (production) and `:2042` (cycle-phases) as `Phase2-InitiativeEffects`. [V]
- Per-hood keys (`:369-373`): traffic, retail, nightlife, publicSpaces, communityEngagement, sentiment, schoolQuality. Formula `:379`: `effects[key] * |intensity| * sign(intensity)`; intensity from PHASE_INTENSITY `:179-200`, values from DOMAIN_EFFECTS `:207-236`. [V table]
- Bus merge `:493-502`. Stale comment `:515-517` says no per-hood consumer.
- Baylight reconciliation `:282-300`: phase forced to `operational`, hoods to `S.sportsZones`, once sports has opened the district.

## Consumers, in phase order
1. `applyCityDynamics_` — `Phase2-CityDynamics`, `godWorldEngine2.js:301`. [V] Reads the bus `:1290-1291` [V]; folds FOLD_INITIATIVE_FIELDS (`:1299-1300`: traffic, retail, nightlife, publicSpaces, communityEngagement, sentiment; schoolQuality NOT folded) into hood metrics `:1321`, persisted by the v3 neighborhood writer to Neighborhood_Map: traffic→NoiseIndex, retail→RetailVitality, nightlife→NightlifeProfile, publicSpaces→EventAttractiveness, communityEngagement→DemographicMarker, sentiment→Sentiment. **Empties the bus `:1536` (`S.initiativeNeighborhoodEffects = {}`). [V]**
2. `updateNeighborhoodDemographics_` → `driftNeighborhoodEducation_` — `Phase3-NeighborhoodDemo`, `godWorldEngine2.js:314`. [V] Reads the bus `:656` [V], only `schoolQuality` `:680` [V], `initiative * 10` into school drift `:685` [V]. **Runs after the clear → always 0.**
3. `applyBusinessDynamics_` — `Phase5-BusinessDynamics`, `godWorldEngine2.js:360`. [V] Reads the bus `:401` [V]; presence only, `initiativeInHood` `:465` [V] → `bizDriftOne_` `:343` → Business_Ledger Growth_Rate / Annual_Revenue. **Runs after the clear → always false.**
- No other assignment to the field anywhere in `phase*/` or `utilities/` (grep, tests excluded). [V]

## Defect — filed engine.250
The bus is consumed and emptied in phase 2; its phase-3 and phase-5 readers see `{}` every cycle. Education initiatives cannot move school quality (engine.192's initiative term is dead); businesses never feel an initiative in their hood. Masked by tests that seed the field directly: `scripts/schoolDrift.test.js:40`, `phase05-citizens/applyBusinessDynamics.test.js:77,139`.

## Non-bus channels in the same writer
- Health: `S.initiativeHealthRelief` `:482`, only in HEALTH_DELIVERING_PHASES `:167-175` → `updateNeighborhoodDemographics.js:195-198` (`illnessInitiativeRelief` 0.25 × relief) → Neighborhood_Demographics `Sick`.
- Transit: `S.initiativeImplementationEffects.transit` `:484-490` → `applyCityDynamics.js:1324`, `updateTransitMetrics.js:695` → Transit_Metrics.

## Safety / housing [V, lead greps]
- `phase03-population/updateCrimeMetrics.js` reads no initiative state; its only related input is hood Sentiment at weight 0.10 in the hood life-quality composite (`:1036`), one cycle late. No initiative path to a Crime_Metrics column.
- No file that writes `MonthlyRent` mentions an initiative (six writers checked). No initiative path to rent or rent burden.

## Sibling bus — S.approvalNeighborhoodEffects [V, lead]
- Written in phase 5: `phase05-citizens/updateCivicApprovalRatings.js:930-942`. Read and emptied in phase 2 by the same fold: `applyCityDynamics.js:1292-1293`, `:1537`.
- `ctx.summary` is a fresh literal every cycle (`godWorldEngine2.js:248`); no file in phase09/phase10/utilities carries the field forward (grep). The phase-2 fold therefore always reads an empty approval bus.
- Live proof, Ripple_Ledger read 2026-09-20: CauseId `initiativeNeighborhoodEffects` 6 rows, one per cycle C103–C108; CauseId `approvalNeighborhoodEffects` 0 rows ever.
- Fix shape for engine.250: the initiative bus needs its clear moved off `:1536` so the phase-3/5 readers see it (writer resets it as its first statement); the approval bus needs a cross-cycle carry (previousCycleState) or a same-cycle fold after phase 5. Card the carry path before cutting.
