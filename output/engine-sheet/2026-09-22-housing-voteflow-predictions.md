# Bench experiment build (@91 = 713cd6ec + engine-mirror playable:true for housing, BENCH-ONLY) — vote-time flow predictions (written before the run)
Bench at C116 after the control run; INIT-951 Standing since C110, West Oakland discounted C111–C116.
- A (fire 117): Stage blank → producer publishes an EMPTY slice → household pass restores gross for all 54±West Oakland renters (relief 0, receipt 117); INIT-951 untouched (legacy row); no baseline.
- B (fire 118): Stage Proposed, passed+signed → civicStageStep_ Proposed→Funded, LSC 118; handler stamps a `vote` descriptor: origin vote, cycle 117 (obs), captureCycle 118, tab Household_Ledger, columns ['MonthlyRent*12/HouseholdIncome'], cityN 11 (member hoods ≥10 renters), keys {West Oakland: undiscounted median}, cityMiddle. Producer saw Proposed → no relief; West Oakland stays at gross.
- C (fire 119): LastWorkCycle 118 ≥ LSC 118 → Funded→Standing, phase operational, LSC 119. Producer saw Funded → no relief at 119.
- D (fire 120): producer sees Standing → relief at Phase 5 (West Oakland net = gross×0.9). Freezer obs 119 == LSC 119 → earns nothing (hold obs 119, up 0).
- E (fire 121): obs 120 discounted → edge = baselineRatio − obsRatio (direction down); if edge ≥ civicDeliverMargin_housing → up 1. Expected edge ≈ 0.10 × (WO median/city median ≈ 1.0–1.2) ≈ 0.10–0.12 minus/plus composition.
- F (fire 122): up 2. G (fire 123): up 3 → Delivering at hold 3 if every observation cleared the margin; else stays Standing with the streak reported.
- Throughout: 0 Engine_Errors; no stall (tended within grace from LSC/LWC).
