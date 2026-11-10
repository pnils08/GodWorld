---
title: Engine figures — produced by citizens or by a formula
created: 2026-11-10
type: research
verdict: adopt
tags: [engine, cohesion, audit]
---

# Engine figures: produced by citizens or by a formula (research.33)

**Source:** a read-only pass over `phase01-config` … `phase11`, `utilities/` by an Explore agent, 2026-11-10, 98 tool calls; nothing was run. **Verdict: adopt** as the map for governance.60 and for the rebuild order. **Ignited plans:** [[../plans/2026-11-10-cohesion-loop]], [[../plans/2026-11-10-stop-puppeting-the-newsroom]].

**Why:** builder 2026-11-10 — "I'll never get what I'm asking for until the engine loops a city and no ledger is running off hardcoded numbers".

**Spot-checked by research-build against the code, 2026-11-10:** row 40 (tracked households are paid grants by `planFundDisbursement_`, `householdFormationEngine.js:1447-1467`; the fund is debited `min(remaining, tranche × tend)` at `applyInitiativeImplementationEffects.js:1004` whatever the grants sum to) — confirmed, and it corrects the earlier statement in the pipeline.110 plan that no household receives the money; row 21 (`neighborhoodPulse` does not occur in `applyCityDynamics.js`) — confirmed; row 43 (`runConductEngine.js:5-8` header) — confirmed. Rows 1 (transit), 7 (hood sick) were read directly earlier the same day. Every other row is the agent's read: a claim until opened.

**How to read the verdicts (builder 2026-11-10, after seeing this list):** "The biggest gap to me is on ledger citizens vs off ledger. It's not that the hospital isn't tracking KONO, it's none of the tracked citizens are in a hospital bed. So the crons don't understand that. The hospital data does show body counts, admissions, etc., it's just there is no citizen to ask about it … this is why earlier media allowed crons to introduce citizens that weren't on ledger that were needed to tell the story, but this was just them inventing them and not a return from a query that none exist currently so introduce one … it's like tracking a city as a whole but then using only a subset of the citizens, and the whole city is tracked but then dispersed into a fraction of the hoods."

So a FORMULA verdict below is **not** by itself a defect. The city is modelled whole (403,790 people at C115); the ledger zooms in on 1,064 of them (about 1 in 380); the map carries the whole city in 21 hoods. A city-scale count with no tracked citizen in it is the design (CLAUDE.md: "the ledger is the tracked ~0.25% of the city, never its denominator"). The defects are at the joins: (1) nothing tells a cron which figures are the whole city and which are the tracked few, so "135 sick, six in beds, none named" reads to it as a scandal; (2) when a story needs a person and no tracked citizen is in that situation, there is no query that answers "none tracked — bring one into focus"; the engine has an `Intake` tab it processes every Cycle (`godWorldEngine2.js:1505`, `processIntake_`), and C115 processed 0; (3) a figure that tracked citizens do live (a birth, a death, an offence, a commute) and the city-scale figure for the same thing do not meet. The row notes "tracked data … already exists" are the list for (3).

The agent's report follows unedited.

---

## How the engine produces its reportable figures: citizen-tallied or formula

I only read code; I ran nothing. Each verdict below cites lines I opened. Anything not read directly is marked "inferred". Every path is under /root/GodWorld/.

**The brief's established claim #2 is wrong on the current code.** Tracked households do receive money from the civic disbursement tranche. `phase05-citizens/householdFormationEngine.js:1404-1467` (`planFundDisbursement_`) ranks flagged tracked households by rent burden and pays each one `grant = Math.min(Math.min(need, cap * h.rent) + headroom * h.rent, out.trancheLeft)` out of the tranche. The fund debit itself is still the flat `civicDisburseTranche × tend` (`phase02-world-state/applyInitiativeImplementationEffects.js:1004`), whatever the grants add up to. So the debit is CONSTANT and the grant amounts are CITIZEN (rows 39 and 40).

Columns: Figure (tab) | file:line | Verdict | What produces it | If FORMULA/CONSTANT: does tracked data that could produce it already exist?

### World_Population
1. totalPopulation (World_Population) | phase01-config/godWorldEngine2.js:1296-1319, 1398, 1424 | FORMULA | `births = Math.round(total * baseBirthRate)` (0.010 plus season), `deaths = Math.round(total * baseDeathRate)` (0.008 plus season, weather and illness), `total = total + births - deaths + mig`. | Yes. Tracked births and deaths happen on Simulation_Ledger (generationalEventsEngine status transitions, Status 'deceased'); this function does not read them.
2. migration (World_Population) | godWorldEngine2.js:1326-1396, 1425 | FORMULA | A stack of random draws: `mig += Math.round((rng() - 0.5) * 20)` plus holiday, sports, chaos and weather draws, clamped to ±0.5% of total. | Partly. Tracked intra-city moves exist (migrationTrackingEngine, S.relocationPressureDeltas). Whether tracked citizens can leave the city at all: not checked (inferred no).
3. illnessRate (World_Population) | phase03-population/applyDemographicDrift.js:142-147, 157-169, 172-214, 224-238, 387 | FORMULA | Attractor `ill += (illnessBaseline - ill) * illnessAttractorPull` (0.035, 0.12), plus `(rng() - 0.6) * illnessCalmStep`, plus fixed step bumps for weather, holidays and chaos, plus a hospital-census feedback term (row 49). | Yes: Hospital_Ledger admissions and citizen Status 'hospitalized' (generationalEventsEngine.js:334-354).
4. employmentRate (World_Population) | applyDemographicDrift.js:270-289, 296-327, 388 | FORMULA | `employmentTarget = employmentAttractor - employmentDistressGain * distress193.share` (0.96 and 0.3), pulled 12% a Cycle, plus calendar steps, floor 0.88, cap 0.98. The code comment at :270 says the business term is "stated headcount, never tracked-citizen counts". | Yes: Simulation_Ledger EmployerBizId, S.careerSignals (layoffs, hires), S.commuteFlowStats.noEmployer.
5. economy label (World_Population; also the cycle packet and story seeds) | applyDemographicDrift.js:349-372, 390 | MIXED (follows economicMood, row 28) | Bands economicMood at 70/55/45/30; three or more chaos events turn it 'unstable'; then a sports-week adjustment. | —

### Neighborhood_Demographics
6. Students / Adults / Seniors per hood | phase03-population/updateNeighborhoodDemographics.js:192-222, 295-314, 379-389 | MIXED | City migration (row 2) is split by `appliedMigration249 * (hoodPop249 * inflowMod) / sizeWeightSum249`. A between-hood transfer takes its direction from last Cycle's net tracked movers (`relocationTransfer249_`) and nets to zero. Ageing, births and senior deaths are single `rng() < 0.1 / 0.05 / 0.03 / 0.02` steps. | —
7. Sick per hood | updateNeighborhoodDemographics.js:238-245 | FORMULA (your established item 3) | Additional finding: the health-initiative relief, `expectedSick * (1 - reliefCoef133)` at :240-244, is the same column the health "Delivering" gate measures (row 41). | —
8. Unemployed per hood | updateNeighborhoodDemographics.js:274-287 | FORMULA | `Math.round(workingPop * unemploymentRate * (wEmp.weight / employmentWeights.mean))`, closing 25% of the gap a Cycle. The hood weight includes tracked employer depth (:527). | Yes: per-citizen EmployerBizId and S.commuteFlowStats.
9. SchoolQualityIndex, GradRate, CollegeReadiness, TeacherQuality, Funding | updateNeighborhoodDemographics.js:733-750 | FORMULA | `q = clamp(e.quality + clamp(cfg.step*sum) + cfg.pull*(fundingLevel - e.quality))`, `gTarget = 50 + 5*q`. Inputs: housing pressure, crime level, funding ratio, and `initiative * 10`. | Tracked students exist (runEducationEngine on the ledger, inferred); not read here.

### Neighborhood_Map (phase08-v3-chicago/v3NeighborhoodWriter.js)
10. NightlifeProfile | v3NeighborhoodWriter.js:397, 503 | FORMULA | `baseNightlife * effectiveNightlifeMod * (1 + variance())`. Base is S.cityDynamics.nightlife; the modifier comes from a character-label table (:143-159) times a holiday table. No citizen term at all. | Business_Ledger bar rows and S.hoodSpots exist.
11. NoiseIndex | :400-401, 504 | FORMULA | `baseNoise = traffic*5 + (weather.impact-1)*3`, times the label noise modifier, plus `variance()*2`. | No per-citizen source (inferred).
12. CrimeIndex | :515-521, 536, 548 | MIXED (weak) | `((propertyCrimeIndex + violentCrimeIndex)/2/50)` from Crime_Metrics (formula, row 44), plus a citizen-event fold capped at ±0.10 (PULSE_FOLD :82-87), plus a chaos fold. | Judicial_Ledger cases and runConductEngine transgressions exist and are not tallied.
13. RetailVitality | :412, 180-194, 254-263, 522, 537 | MIXED | `round(retail*5 + publicSpaces*3)` × retail modifier (label × income × boom × tracked employer depth) × hoodBusinessFactor_ (revenue-weighted business growth and closures) × `(1+variance())`, plus a citizen fold capped at 1.0. | Shoppers are not modelled; only business rows count.
14. EventAttractiveness | :297-340, 409, 523, 538 | FORMULA | `baseEventAttract * effectiveEventMod`, where the base counts staged city events plus keyword hits in world events, story seeds and hooks. Citizen fold capped at 4.0. | —
15. Sentiment (map column) | :529-563 | MIXED (weak) | `hoodBaseSent + holiday mod + baseSentiment*CITY_SENTIMENT_NUDGE + variance()*0.1`, plus the citizen fold (dampen 0.02, cap ±0.15), plus the chaos fold, clamped to ±1. | —
16. DemographicMarker | :436-459 | FORMULA | Label bands of S.neighborhoodMigration[h].drift (row 17). | —
17. MigrationFlow | phase06-analysis/applyMigrationDrift.js:419-440 | FORMULA | `nhDrift = cityTilt (drift/25)` plus or minus `rInt(2)` draws when map metrics sit above or below the city median. | Yes: tracked relocations from migrationTrackingEngine.
18. HousingPressure | phase05-citizens/neighborhoodTrajectoryEngine.js:200-230 | MIXED | Fixed steps by trajectory (growth +0.5 or +1, steady −0.5, decay −1), plus `pressure += relDelta` (+0.1 per arriving tracked household, −0.05 per departing one). | —
19. NeighborhoodTrajectory / TrajectoryMomentum | neighborhoodTrajectoryEngine.js:172-197 | FORMULA / CONSTANT | Score from map metrics against the city mean; momentum moves a fixed ±1 a Cycle. | —
20. MedianIncome / MedianRent | neighborhoodTrajectoryEngine.js:258-283 | FORMULA | `Math.round(incomeNow * (1 + incFactor))` by trajectory; rent is rendered from income by `hoodRentFromIncome_`. | Yes: per-citizen Income on Simulation_Ledger (the tax code reads it, generationalWealthEngine.js:1856); not used here.

### City dynamics, Riley_Digest, World_Population load columns
21. CitySentiment (Riley_Digest AB; World_Population sentiment) | godWorldEngine2.js:2045; phase02-world-state/applyCityDynamics.js:61-79, 707-720, 732-756, 835-850, 1271-1330, 1659-1671, 1712, 1784, 1807 | FORMULA | Equal mean of per-hood values. Each hood value is a character table × season, weather, holiday and sports modifiers, plus threshold terms on Neighborhood_Demographics rates (themselves formula), hood economic mood, a crime ladder, and story-seed lifts. Then momentum, then media, sports and edition boosts. `neighborhoodPulse` does not appear anywhere in applyCityDynamics.js, so citizen events never reach this number; they reach only the map column (row 15). | Yes: S.neighborhoodPulse, consumed only in Phase 8.
22. CityTraffic, RetailLoad, TourismLoad, NightlifeLoad, PublicSpaceLoad (Riley_Digest W–AA; World_Population *Load) | applyCityDynamics.js:1445-1450, 1552, 1832-1840 | FORMULA (retail and traffic MIXED-weak) | Same pipeline. The only tracked-citizen input is the inbound-commuter daytime lift from S.commuteInbound (40 tracked workers = full lift; capped at +12% retail and +8% traffic). | S.commuteFlows.
23. EventsGenerated (Riley_Digest E) | phase04-events/worldEventsEngine.js:207-226, 364; generateCrisisSpikes.js:150, 400; runCareerEngine.js:2021; generateCitizensEvents.js:3857 and about 25 other `+= 1` sites | MIXED | Random-count generators (world events, crisis spikes) plus one count per tracked citizen life event (participation rolls per ledger row). The citizen-versus-random split was not measured. | —
24. CitizensAged (Riley_Digest D) | godWorldEngine2.js:1908-1921 | CITIZEN | A count of ENGINE, non-deceased ledger rows touched. It counts rows, not events. | —
25. StorySeedCount (Riley_Digest M) | godWorldEngine2.js:2000; phase07-evening-media/applyStorySeeds.js:598-1300 (section list), 1255-1273 | MIXED, mostly FORMULA | Seeds come from rules over holiday, First Friday, sports, pattern, shock, civic load, migration drift, world events, sentiment, economy, city dynamics and health signals. Only the "named citizen spotlights" section (:1255-1273) is per-citizen. | —
26. CivicLoad (Riley_Digest I; World_Population) | phase06-analysis/applyCivicLoadIndicator.js:88-285, 371 | FORMULA | Additive score: world-event severity (cap 8), weather, sentiment, economic mood, migration drift, story arcs, holidays. | —
27. MigrationDrift (Riley_Digest J) and ShockFlag (L) | applyMigrationDrift.js:228-340, 570; applyShockMonitor.js:197-325, 421 | FORMULA | Drift is `Math.round(migrationPercent*10)` plus about 25 random bumps and a final `rSym(10)`. ShockFlag is a set of thresholds on event counts, sentiment, economic mood, weather, and employment below 0.85. | —
28. economicMood (drives the economy label, approval, businesses, migration) | phase06-analysis/economicRippleEngine.js:818-891; :364-402 (grep) | MIXED | `newMood = 50 + rippleEffect * 0.1` plus calendar, sports and migration constants, with inertia. Ripples include tracked career signals: `layoffs >= 3`, `promotions >= 4`, and per-business `businessDeltas lost >= 2`. | —
29. Nightlife volume and spots (Riley_Digest R; S.nightlifeVolume) | phase07-evening-media/buildNightLife.js:345-399, 404-418, 500 | FORMULA | `var volume = 4` plus sentiment, economy, weather, season, holiday and sports bumps, clamped 1–10. Spots are drawn with `pickRandomSet_(pool, count, rng)` from hardcoded pools. | Business_Ledger bar rows and S.hoodSpots exist.
30. Evening crowd map and safety label | phase07-evening-media/cityEveningSystems.js:266-283, 288-417 (read by grep only) | FORMULA | Each hood's crowd starts at 1 and gets fixed bumps for scenes, holidays, events, weather and home games; safety is a label from chaos, shock, civic load and sentiment. | —

### Business_Ledger
31. Growth_Rate | phase05-citizens/applyBusinessDynamics.js:402-493 | MIXED | Per tracked business row: `drift = clamp((ev + vitMod + pressure + shock + noise) * vol)`. Event term from chaos hits on that business, initiative stage changes, coverage, sports; ambient term from hood RetailVitality (formula); seeded disruption draw; seeded noise; owner's drive dial (a tracked citizen's DialState); a pull toward the class norm. | —
32. Annual_Revenue | applyBusinessDynamics.js:489 | FORMULA | `Math.round(biz.revenue * (1 + growth / 100 / 52))`, revenue compounded from Growth_Rate. Nothing counts sales. | No per-citizen spending ledger (inferred).
33. Employee_Count | runCareerEngine.js:1968-1979, 1999-2023; applyBusinessDynamics.js:711-714 | MIXED | The authored level moves by `net = gained - lost` of tracked hires and departures (CITIZEN) and by distress shedding `Math.min(stated, d.streak - cfg.bizDeclineStreak)` (FORMULA). At roughly 1:443 scale, tracked moves shift thousand-scale counts by ones. | —
34. Closures, jobs lost, hood business momentum (worldEvents BUSINESS; Business_Archive; feeds RetailVitality) | applyBusinessDynamics.js:669-690, 730-741 | FORMULA | A business closes when `streak >= bizClosureStreak + ownerRoom && revenue < floorRev`. Jobs lost equals stated Employee_Count. | —

### City_Treasury
35. Opening balance and weekly allocation | applyInitiativeImplementationEffects.js:305-326; engine94SheetContract.js:82-83 | CONSTANT | Opens at 100,000,000; `treasury.balance += weekly` (5,000,000) every Cycle until the first tax day. | —
36. PROPERTY-TAX | phase05-citizens/generationalWealthEngine.js:1873-1935; applyInitiativeImplementationEffects.js:1163-1176 | MIXED | Each tracked owner household is charged `value * propertyTaxRate` against members' NetWorth (CITIZEN). Then `cityTotal += byHood[h] * mult[h]`, where `mult = ratePopulation / trackedResidents` scales the tracked sample up to the city. | —
37. BUSINESS-TAX | generationalWealthEngine.js:1940-1947 | FORMULA | `Math.round(revenue * businessTaxRate)` on the sum of Annual_Revenue (row 32). | —
38. Court and ticket revenue: COURT, COURT-NAMED, TICKETS | judicialLifecycle.js:474, 517-521, 689, 697; chaosCarsEngine.js:60, 478-479 | COURT is FORMULA; COURT-NAMED is CITIZEN; TICKETS is MIXED | COURT: `other = max(0, cleared - tracked)`, `amount += other * cityFine_(median, 'minor')`, where cleared comes from Crime_Metrics (formula). COURT-NAMED: `cityFine_(row Income, gravity)` on tracked cases. TICKETS: a fine on the tracked citizen's income, but whether a ticket happens at all is a chaos draw. | —

### Initiative_Tracker
39. BudgetRemaining (build and operating spend) and APPROPRIATION / RENEWAL rows | applyInitiativeImplementationEffects.js:940-967, 431-482 | CONSTANT | Build spend `weekly = total * capitalShare / buildCycles * tend`; operating spend `floor / operatingWeeks` (0.6 and 52). The treasury is charged the authored BudgetTotal. | —
40. Disbursement: fund debit vs household grants | applyInitiativeImplementationEffects.js:1004; householdFormationEngine.js:1447-1467 | Debit CONSTANT; grants CITIZEN | The fund falls by `min(remaining, dials.tranche * tend)`. Grants go to tracked households that are flagged (savings under the buffer and rent burden over the warning line), and are capped by need. | —
41. Stage and phase | civicInitiativeEngine.js:3272-3279, 3660-3672, 3776-3824, 3985-4013, 4027-4046 | Not citizen: votes, off-engine agent moves, calendar clock, formula metric gates | Proposed → Funded by council vote (`resolveCouncilVote_`, not read). Funded → Standing when `work >= since`, where LastWorkCycle is stamped by an off-engine "Sunday fold" of seat moves. A build opens at `cycle >= opens` (fixed `civicBuildCycles_<domain>`). Standing → Delivering when a hood metric's edge holds; the playable metrics are Neighborhood_Demographics Sick, Transit RidershipVolume and SchoolQualityIndex, all formula. Health and education include the initiative's own relief or lift term (updateNeighborhoodDemographics.js:240-244, 735, 750), so delivery is largely self-fulfilling. For transit this is inferred. | —

### Civic_Office_Ledger
42. Approval | phase05-citizens/updateCivicApprovalRatings.js:231-264, 363, 748-829 | FORMULA | `target = levelBase + mood*gainCity + districtScore*gainDistrict + pressDelta*gainPress`, `levelMove = Math.round((target - currentApproval) * inertia)`, plus initiative-motion ladders. Mood is a smoothed average of map Sentiment (row 15). A scandal roll uses rng (:363). | No. No citizen opinion, faction or lean column found (SCHEMA.md and SIMULATION_LEDGER.md grep); factions live only on Civic_Office_Ledger (updateCivicLedgerFactions.js).

### Crime_Metrics
43. PropertyCrimeIndex, ViolentCrimeIndex, QualityOfLifeIndex | phase03-population/updateCrimeMetrics.js:454-547, 607-614, 645-657 | FORMULA | A carried level plus pushes from Neighborhood_Demographics unemployment and youth ratios against the median, economic lag, hotspot pressure, chaos events and sentiment; weather and season overlay; `baseProperty += (rng() - 0.5) * 6`. | Yes: Judicial_Ledger cases and runConductEngine transgressions. Its own header (runConductEngine.js:5-8) says the city carried a crime rate while no tracked citizen committed crime; transgressions now exist and are still not counted into the index.
44. IncidentCount / ReportedIncidentCount, ClearanceRate, ResponseTimeAvg | updateCrimeMetrics.js:466-470, 551, 580-586, 598-648 | FORMULA | `baseIncidents = (levelProperty + levelViolent)/2 * INCIDENTS_PER_POINT` plus chaos and celebration terms plus `Math.round((rng() - 0.5) * 4)`; reported = true × reporting rate. Clearance starts at 0.35 and response time at 8 minutes, with load penalties and `clearanceDir * rng() * CLEARANCE_RECOVERY`. | Same as row 43.

### Care and justice: hospital and courts
45. Modelled hospital intakes | phase04-events/careJusticeService.js:209 | FORMULA | `hospitalIntakes = Math.round(sick * admitRate)`, where sick is row 7. | Yes: per-citizen admissions (row 48).
46. Modelled judicial intakes and OARI eligible / diversions | careJusticeService.js:203-211 | FORMULA | `judicialIntakes = Math.round(charges * clearance)`, where charges is Crime_Metrics incidentCount; OARI counts are `charges * oariShare * diversionProbability`. | Yes: Judicial_Ledger.
47. Care_Justice_Census TrackedOccupancy | utilities/careJusticeAccounting.js:447-523 | CITIZEN | Counted from Hospital_Ledger and Judicial_Ledger rows by entry and exit Cycle. | —
48. Tracked hospital admissions (Hospital_Ledger) | phase04-events/generationalEventsEngine.js:105-126, 334-354 | CITIZEN | Per-citizen status transitions (a probability table per status) set the row to 'hospitalized'. | —
49. Census OtherResident intakes and BedsOccupied | careJusticeAccounting.js:563-570, 700-731; careJusticeService.js:268 | FORMULA | `other = Math.max(0, modelled - tracked)`; the stock is a window summed over `stay` Cycles; `beds: win.closing`. The illnessRate feedback (applyDemographicDrift.js:224-238) reads these beds, so it is largely a formula feeding a formula. | —
50. Named arrests and charges (chaos named pass) | phase04-events/chaosCarsEngine.js:895-943 | MIXED | `k = chaosBinomial_(rng, n, p)`, where n is formula calls per hood (row 46) and `p = trackedShare * careJusticeExposureDial`; the k events land on randomly chosen tracked residents. | —

### Chaos and events
51. Chaos car event count, weather business hits, ship | chaosCarsEngine.js:26-27, 104-105, 967-975, 1000, 1062, 1094-1096 | CONSTANT / random (effects MIXED) | `CHAOS_MIN_EVENTS (3) + Math.floor(rng() * 13)`, giving 3–15 events; `1 + Math.floor(ctx.rng() * 3)` storm-hit businesses; ship chance 0.18. The targets are real tracked citizen, business and hood rows. | —
52. World events count (WorldEvents_Ledger / S.worldEvents) | worldEventsEngine.js:207-226, 308 | FORMULA | `baseCount = Math.floor(rng() * 3) + 1` plus bumps, capped at 6, times suppression; text drawn from category lists. | —
53. Crisis spikes | phase03-population/generateCrisisSpikes.js:7, 150 | FORMULA | `MAX_SPIKES = rng() < baseChance ? 1 : 2`; the file header says "No ledger reads". | —

### Faith and culture
54. Faith events count and attendance (faith event ledger) | faithEventsEngine.js:150-157, 258-321; utilities/ensureFaithLedger.js:641-656 | FORMULA | Per-organisation `rng() < prob` rolls, capped at 5 events. Attendance is `congregation * 0.3 * mult * (0.8 + rng() * 0.4)` on the authored Congregation column. | No per-citizen faith affiliation column found (SCHEMA.md / SIMULATION_LEDGER.md grep).
55. Cultural_Ledger FameScore and MediaCount | culturalLedger.js:102, 116-123, 184-188, 593; buildEveningFamous.js:405-415 | MIXED | `base + paper + decay + sightings`. Paper adds +5 / +1 / −2 per printed usage of that person. Sightings add +1 each, but the sightings are random famous-person picks: `count = 3` if chaos or `rng() < 0.3`, then `pickRandomSet_`. | —

### Transit and households
56. Corridor TrafficIndex (Transit_Metrics) | updateTransitMetrics.js:325-349, 878-937 | FORMULA | `transitCityTraffic * (mean / cityMean) * freewayMult`, times day, holiday, First Friday and game-day modifiers, plus `(rng() - 0.5) * TRAFFIC_VARIANCE`. Station ridership is your established item 1. | Yes: S.commuteFlows (tracked origin → destination worker counts) feeds station weighting but not corridors; corridors read only S.neighborhoodDynamics.traffic.
57. HouseholdIncome and HouseholdSavings (Household_Ledger) | householdFormationEngine.js:1261-1289 | CITIZEN, with a constant top-up | `totalIncome += money.income; totalSavings += money.netWorth` over tracked members, plus GENERIC_SPOUSE_SALARY for an off-camera spouse or parents. | —

---

### (a) The figures citizens actually produce
- CitizensAged (24).
- Care_Justice_Census TrackedOccupancy and Hospital_Ledger admissions (47, 48).
- COURT-NAMED fines (38), and the fine amount on TICKETS (38).
- The tracked-household share of PROPERTY-TAX, before it is scaled to the city (36).
- Grants paid from the disbursement tranche (40).
- HouseholdIncome and HouseholdSavings (57).
- The per-event part of EventsGenerated (23).
- The hire and departure deltas on Employee_Count (33).
- The career-ripple part of economicMood (28).
- Smaller contributions:
  - the relocation part of HousingPressure (18);
  - the direction of the between-hood population transfer (6);
  - capped citizen-event folds on four map columns (12, 13, 14, 15);
  - the commute lift on retail and traffic (22);
  - the owner-dial and chaos-hit terms in Growth_Rate (31);
  - the print-usage part of FameScore (55).

### (b) Worst FORMULA/CONSTANT offenders, ranked by how many reportable numbers they produce each Cycle
1. **Neighborhood_Map** (rows 10–20): about 22 hoods × 6 texture columns, plus MigrationFlow, trajectory, MedianIncome and MedianRent. The base is formula; citizens only shade it within tight caps (±0.15 sentiment, ±0.10 crime).
2. **Crime_Metrics** (43, 44): per-hood indices, incidents, clearance and response time with no tracked-crime input. It also drives court revenue (38), judicial intakes (46) and named arrests (50).
3. **Neighborhood_Demographics** (6–9): Sick, Unemployed, age bands and five school indices per hood.
4. **City dynamics → Riley_Digest W–AB and World_Population load columns** (21, 22): CitySentiment has no citizen path at all.
5. **Transit_Metrics** (56 plus established item 1).
6. **World_Population** (1–4): population, migration, illness and employment rates.
7. **Business_Ledger Annual_Revenue** (32), recomputed on every business row each Cycle; BUSINESS-TAX follows from it.
8. **Care_Justice_Census other-resident cells and beds** (49), which loop back into illnessRate.
9. **Approval** (42), CivicLoad / ShockFlag / MigrationDrift (26, 27), world-event and crisis counts (52, 53), faith attendance (54), nightlife volume and crowds (29, 30).
10. **Treasury constants** (35, 39, 40-debit): the dollar figures there are dials, not activity.

### (c) Not determined
- `resolveCouncilVote_` (civicInitiativeEngine.js:1120) was not read, so the verdict on vote outcomes is open.
- The transit "Delivering" gate being self-fulfilling is inferred; I did not read the initiative ridership lift.
- These constants and dial values were not opened: CRIME_LEVEL / CRIME_FACTORS, bizNoiseBound / bizVol_*, the transit dials, GENERIC_SPOUSE_SALARY, careJusticeAdmitPerSick, careJusticeExposureDial. The care-justice dials are not in engine94SheetContract.js; they are read straight from World_Config.
- The citizen-versus-random split of EventsGenerated and StorySeedCount needs live counts, which I did not run.
- The relocation scoring in migrationTrackingEngine and the death and birth odds in generationalEventsEngine were only skimmed.
- cityEveningSystems crowd numbers were seen through grep, not a full read.
