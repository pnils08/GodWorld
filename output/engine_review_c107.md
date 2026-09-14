# Engine Review — Cycle 107

**Cycle:** 107 | **In-world:** Y3C3 (Riley_Digest Timestamp), sim year 2042
**Auditor version:** engineAuditor 1.0.0 (detectors: stuckInitiatives 1.4.0, repeatingEvents 1.2.0, mathImbalances 1.3.0, cascadeFailures 1.0.0, writebackDrift 1.1.0, productionImbalance 1.0.0, improvements 1.1.0, incoherence 1.0.0, ledgerCompleteness 1.0.0; enrichers: checkMitigators 1.1.0, recommendRemedy 1.0.0, resolveAffectedCitizens 1.1.0, generateTribuneFraming 1.0.0, measureRemedies 1.0.0, checkOrphanAilments 1.0.0, detectAnomalies 1.0.0, generateBaselineBriefs 1.2.0)
**Source files:**
- `output/engine_audit_c107.json` — 25 patterns (12 ailments, 13 improvements)
- `output/engine_anomalies_c107.json` — 40 anomalies
- `output/baseline_briefs_c107.json` — 90 briefs
- `output/execution_log_c107.txt` — the Apps Script execution log for the live fire (Drive "Execution log LIVE 107.txt", pulled by the service account)

**Cycle execution:** 133 phases, all ok, 185.6s, **0 engine errors**, 1 audit issue, 29,569 rng draws. Slowest: Advancement 56.1s (was 23.9s at C106 — `applyTierLadderState_` 8 promoted / 84 seeded cells held, 3 emergence bonds seeded at 8:32:45 after a 47s gap), MediaIntake 16.6s, ExecuteIntents 15.9s (740 intents), MaintainLifeHistoryLog 15.0s, HouseholdFormation 12.2s. First live fire on PROD @84 (engine.213a–d): the ten `approval*` World_Config keys self-armed (`engine.213 config ready: seeded 10 row(s)`), the approval phase ran 856ms with `hoods scored 22, city level 1.48, press score 0.17 → 0`. Ledger 943 after 1 archive (POP-00622, deceased). popIdHighWater → 1113.

**Approval seats — what the fire did vs what the builder did.** Before C107 fired, every elected seat was hand-set to its district level as the @84 reader computes it (`output/civic_approval_rebase_c106.plan.json` §superseded; Mayor 62; D1 57, D2 63, D3 58, D4 60, D5 57, D6 64, D7 67, D8 63, D9 65). The engine then moved four seats on civic events alone: Santana 62→65 (+3, two initiative advances), Carter 57→59 (+2), Delgado 58→61 (+3), Rivers 57→59 (+2); six seats sat exactly at target with `level → +0`. The C106 audit snapshot has been corrected to the rebased closing values (`engine_audit_c106.json` `snapshotNotes`), so this cycle's anomalies and briefs carry **no** approval-shift entries — the 45→67 "flip" the first auditor pass reported was the builder's write, not the world's. Any downstream consumer that cached the first pass (20:37) should re-read.

---

## Read this first — the sentiment sawtooth is 12 hoods on their own track and 10 hoods riding the city scalar (engine.165, cause found)

The auditor reports 10 hood `improvement` rows (+0.25 to +0.35 Sentiment) and 7 hood `math-imbalance` decays (−0.01 to −0.09). All 22 are neighborhoods with citizens on the ledger (Adams Point 7, East Oakland 4, Grand Lake / Baylight / Dimond / San Antonio 3, Glenview 2, Ivy Hill / Eastlake / Brooklyn 1). Split them by whether the Phase-2 dynamics loop knows the hood and the pattern is exact:

| Group | Hoods | Mean ΔSentiment C106→C107 | Range |
|---|---|---|---|
| In the Phase-2 cluster table (Downtown, Uptown, KONO, Chinatown, Jack London, West Oakland, Lake Merritt, Piedmont Ave, Rockridge, Temescal, Fruitvale, Laurel) | 12 | **−0.037** | −0.09 … +0.02 |
| Not in the table (Adams Point, Baylight District, Brooklyn, Dimond, East Oakland, Eastlake, Glenview, Grand Lake, Ivy Hill, San Antonio) | 10 | **+0.306** | +0.25 … +0.35 |

Riley_Digest `CitySentiment` went 0.84 (C105) → 0.25 (C106) → 0.51 (C107). The ten hoods outside the table moved +0.30 when the city scalar moved +0.26; at C106 all ten fell when it fell −0.59. The twelve inside it moved ≤0.09 either way.

**Mechanism (read, not inferred):** `phase08-v3-chicago/v3NeighborhoodWriter.js:411-413` — a hood's base sentiment is its own `S.neighborhoodDynamics[hood].sentiment` track when one exists, else the citywide `dynamics.sentiment` scalar ("Fallback to the citywide scalar for any hood with no dynamics entry"). `phase02-world-state/applyCityDynamics.js:585` is a hardcoded `CLUSTERS` literal — five clusters, twelve hoods — and `:1395` builds `neighborhoodDynamics` entries only for hoods in it. The other ten therefore ride the city scalar 1:1 every cycle, plus their frozen `sentimentMod` (+0.04/+0.05/−0.03…) and ±0.1 variance. The scalar sawtooths (holiday term, coverage boost, sports boost land on it one cycle and blend out the next), so the ten hoods sawtooth with it. The `[-1, 1]` clamp shipped at engine.165 bounded the save; it did not touch the source.

**For every consumer:** the 10 "improvements" are not ten neighborhood stories and the 7 "decays" are not seven crises. The world-level fact is: the city read warmer this cycle (playoffs, MLK Day, six positive coverage ratings) and the twelve tracked hoods barely registered it. Cut filed for engine-sheet: put all 22 hoods in the cluster table (Neighborhood_Map carries `District` and `Adjacent` for every row — the clusters can come from the sheet, not a literal) so every hood carries its own momentum track. Bench first; `neighborhoodDynamics` is read by applyCityDynamics:1818, updateCrimeMetrics:231/:924 and the writer.

---

## Ailments

### 1. **HIGH** — Alternative response is running, violent crime fell across the city, and the composite index in its three hoods still reads high
- **Tech diagnosis:** `Initiative_Tracker` INIT-002 (Oakland Alternative Response Initiative, `implementation-active` 2 cycles, PolicyDomain `safety`) vs `Neighborhood_Map.CrimeIndex` in West Oakland 0.97, Fruitvale 0.89, East Oakland 0.97 (expected: down). The initiative's own measured field, `Crime_Metrics.ViolentCrimeIndex`, moved **−7** against an expectation of −0.05 (`remedy-overshot`, second cycle running). The composite `CrimeIndex` the incoherence detector reads is `(property + violent) / 2 / 50` off `Crime_Metrics` (`v3NeighborhoodWriter.js:401`), so a violent drop of 7 moves it by ~0.07 — the detector's threshold will not clear on the violent index alone while property crime holds.
- **Existing mitigators:** INIT-002, `effectsFiring: true`, effect evidence `effects-firing` on ViolentCrimeIndex (observed delta 7 in the three hoods).
- **Why working/not:** `gap: mitigator-firing-but-insufficient`. The program's field moves; the composite does not. But see §Anomalies — the violent index fell in **nine** hoods this cycle at −3.5σ to −9σ, six of them outside OARI's footprint (Downtown −9.0σ, Rockridge, Jack London, Chinatown, Adams Point, Laurel, Uptown). A citywide drop is not an initiative effect. Until the writer of `Crime_Metrics.ViolentCrimeIndex` is read for what moved it at C107, the OARI credit is unproven.
- **Remedy path:** world-side unchanged (layer a second safety initiative; a West Oakland organizer drives ground action). Tech-side, not flagged by the auditor but routed here: identify the C107 violent-crime writer path (`updateCrimeMetrics.js` reads `neighborhoodDynamics` at :231/:924 — the same object whose ten missing hoods drive the sentiment finding). Followup file below.
- **Cast:** Gregory Mims (POP-00023), Daniel Cloak (POP-00722), Darius Clark (POP-00961); Denise Carter (POP-00501, D1, +2 this cycle on the same initiative).
- **Measurement plan:** `Crime_Metrics.ViolentCrimeIndex` in the three hoods, expected sign negative — and the same field in the six non-OARI hoods as the control. If the control moves with the treatment, the cause is not the program.

### 2. "Strain" — fourth consecutive cycle, still unowned
- **Tech diagnosis:** `Riley_Digest` PatternFlag `strain-trend`, CivicLoad `load-strain` (score 26, 6 events this cycle, 1 active arc). Recurring tokens `strain`, `trend`. No policy domain matched, no initiative in scope.
- **Existing mitigators:** none (`no-mitigator`).
- **Why not:** the civic-load indicator is a city-level scalar with no hood or seat attached, so nothing in the tracker can claim it. Four cycles of the same flag with `applyCivicLoadIndicator_ v2.3` is a steady state, not an escalation.
- **Remedy path:** a council-any general initiative would satisfy the detector but not the world. The honest read: `load-strain` at score 26 is the engine's normal operating band (C103–C107 all carried it). Downgrade candidate for the detector: a recurring flag at constant magnitude is a baseline, not an ailment.

### 3. "World / config / illnessConvergenceRate missing" — third cycle, and it is a config gap, not an issue
- **Tech diagnosis:** `Riley_Digest.Issues` = `World_Config key "illnessConvergenceRate" missing; using default 0.25 (engine.102 W2b)`. The repeating-event detector tokenises the Issues cell and reports the words as a recurring city issue.
- **Fix:** seed `illnessConvergenceRate` (0.25) into `World_Config` via the engine.94 contract seeds so the engine stops logging the default and the detector stops reading an engine notice as a civic pattern. One-line contract addition; engine-sheet, next bench.

### 4. Faith produced 5 events with zero coverage last cycle
- `WorldEvents_V3_Ledger` domain `faith` = 5 events this cycle; prior-cycle Tribune coverage 0. `routingHint: roundup-thread-acceptable`. `saveV3Domains_` reports FAITH as the dominant domain (17 total). Editorial gap, not civic; desk_signal's culture lane carries the hood/faith entries. `processFaithJoins_: 1 joined, 0 drifted`.

### 5. 22 neighborhoods report migration flow with zero economic events this cycle
- `Neighborhood_Map.MigrationFlow` non-zero in all 22; `economicEventsThisCycle: 0`. Mitigator INIT-001 (West Oakland Stabilization Fund, `disbursement-active` 4 cycles) `effects-firing` on RetailVitality, but the measured delta is **−1.48** against +0.02 expected (`remedy-not-firing`, second cycle). West Oakland RetailVitality 5.01 → 3.53, the lowest in the city; `applyOwnerDraw_` paid 9 of 21 owners. Migration is being driven by `applyMigrationDrift_` (worldMig 1203 off World_Population) and the relocation pass (9 units relocated), not by economic events — the production-imbalance detector is describing the engine's design, not a fault.

### 6–12. Neighborhood rows (itemised once)
Seven `math-imbalance` rows, all in the cluster table, all small: Downtown S −0.08 / HP 3→4; Temescal S −0.05 / HP 4.5→5.5 (`remedy-working`, INIT-005 health center `construction-active`); West Oakland S −0.09 / RV −1.48 (`remedy-working`, INIT-001/002); Rockridge RV −0.70 / HP 3→4; Chinatown S −0.06 / HP 0→0.5; KONO S −0.09 (0.24, lowest in the city) / HP 0→0.5; Uptown S −0.03 / HP 3→4. HousingPressure rose one step in the six densest hoods (Downtown, Temescal, Rockridge, Uptown, Lake Merritt, Jack London) for the third cycle running — a slow climb with a cause (`processRelocations_` 9 units, 11 households formed, 25 solo), and the only tracked-hood movement worth a line.

---

## Anomalies

**40 detected.** Triage as filed: 6 `route-to-engine-debug` (high), 9 `cover-as-story` (high), 25 `suppress-until-verified` (medium). Re-triaged here:

**Cleared — the two C106 incomes are the @66 floor landing, not a new write.** POP-00260 Kevel Phoul 215,100 → 60,800 (−72%) and POP-00268 Shane Phelps 283,800 → 93,271 (−67%): DEPLOY_HISTORY §@66 recorded that the builder's C107 would floor both at the catalog; 93,271 is Phelps's exact C104 value. The C106 followup item A is closed by this fire. No story, no debug.

**Route to engine-debug — four more Tier-4 incomes doubled with no cohort.** POP-00784 Isaac Martinez (Plumber, Ivy Hill, mid-career) 45,800 → 99,200; POP-00812 Millicent Kumar (Plumber, Chinatown, entry-level) 47,800 → 98,900; POP-00951 Niani Oakley (Plumber, Chinatown, mid-career) 49,300 → 111,300; POP-00874 Nandini Muhammad (Independent Bookstore Owner, Temescal, entry-level, SELF_EMPLOYED) 28,522 → 61,000. Peer move share 0–4%. Three of four are the same role (Plumber) at the same tier with `employerBizId: UNTRACKED` — the shape of `jobReferencePay_` (the @66 catalog-median pricer) re-pricing a role in one pass, not a citizen event. Four suppressed entries (POP-00867/889/899/909, +110–172%, peer share 19%) are the same class with a cohort. Followup: which pass wrote `Income` for these rows at C107 (candidates in log order: `applyTierLadderState_` 8 promoted, engine.157 maneuver climb 201, `processGenerationalWealth_` Income: 5, `settleAdulthood_` 0).

**Cover as story, with a caveat — violent crime fell in nine hoods at once.** Downtown 50 (−9.0σ vs 4-cycle mean 54.5), Laurel 21 (−6.4σ), Chinatown 37 (−4.5σ), West Oakland 51 (−4.3σ), Rockridge 19, Uptown 24, East Oakland 53, Adams Point 22 (all ≈ −4.2σ), Jack London 36 (−3.5σ). Three are OARI hoods; six are not. A citywide drop the same cycle the city scalar rose is a mechanism, not nine incidents — see Ailment 1. Story-safe as "a quieter week citywide"; not story-safe as "OARI worked" until the writer is read.

**Suppressed — migration-flow shifts (Downtown 4→5, Temescal 5→4, and the rest)** and the cohort income moves. Medium confidence, consistent with the relocation pass.

**Not in the anomaly file, routed to engine-debug from this review:** the ten hoods missing from the cluster table (§Read this first). Followup: `output/engine_anomalies_c107_followup.md`.

---

## Improvements

**13 detected — 2 real, 10 artifact, 1 mislabelled.**

- **Fruitvale Transit Hub Phase II:** `visioning-complete` → `design-phase` (INIT-003; Fruitvale; Santana +2 and Delgado +2 credited on it). Sunday chain wrote it, engine read it, auditor counted it — third consecutive cycle the loop closes.
- **Oakland Youth Apprenticeship Pipeline:** `implementation-active` → `operational` (INIT-007; West Oakland, East Oakland, Fruitvale; Carter +2, Rivers +2, Delgado +1, Santana +1). The one initiative whose approval credit reached four seats.
- The ten hood rises outside the cluster table are the city scalar (§Read this first). Not neighborhood improvements.
- "Remedy overshot expectation on ViolentCrimeIndex (−6 vs −0.05)" is the C106 measurement re-reported as an improvement. Covered under Ailment 1.

**Visible in the log, not counted by the detector:** `applyOwnerDraw_` unresolved 6 → **0** (the research-build founder wiring landed; 9 paid, 2 gains); `checkForPromotions_` 6 promoted by migration wave; `formCriteriaHouseholds_` formed 11; `trackHomeOwnership_` 1 purchase; `undockedDrawCast_` cast c108 (POP-00031, POP-00731, POP-00495).

---

## Baseline briefs (cron input — `cron-civic-run.js` reads this file as a required input)

**90 briefs:** citizen-life-event 77, world-event 11, initiative-milestone 2, approval-shift 0 (see header — the first pass's 9 approval-shift briefs were the builder's rebase and were removed by correcting the C106 snapshot and re-running). 88 carry promotion hints. Clusters: Rockridge 15, West Oakland 13, Fruitvale 13, Temescal 10, Downtown 6. All 77 life-event briefs resolve to `eventType` unknown — the EventType taxonomy limitation is unchanged from S146.

---

## Measurement check

| Pattern | Affected | Prior remedy | Expected | Observed | Verdict |
|---|---|---|---|---|---|
| incoherence | INIT-002 / West Oakland, Fruitvale, East Oakland | propose-new-initiative | −0.05 `Crime_Metrics.ViolentCrimeIndex` | **−7** | **remedy-overshot** (2nd cycle) |
| production-imbalance | 22 hoods / INIT-001 | none (monitor) | +0.02 `Neighborhood_Map.RetailVitality` | **−1.48** | **remedy-not-firing** (2nd cycle) |
| math-imbalance | Temescal / INIT-005 | none | — | — | remedy-not-firing |
| math-imbalance | West Oakland / INIT-001, INIT-002 | none | — | — | remedy-not-firing |
| repeating-event ×2, coverage-gap, math-imbalance ×5 | — | — | — | — | no-prior-match / no prior expectation |
| improvement ×13 | — | — | — | — | prior-had-no-expectation |

### Remedy-type track record

| Remedy type | Firing-as-expected | Firing-insufficient | Not-firing | Overshot |
|---|---|---|---|---|
| propose-new-initiative | 0 | 0 | 0 | 3 (C105 RetailVitality, C106 + C107 ViolentCrimeIndex) |
| none (monitor) | 0 | 0 | 4 (C106 RetailVitality; C107 RetailVitality, Temescal, West Oakland) | 0 |

Three cycles, zero calibrated verdicts. The expectation constants (0.05, 0.02) are two orders below the engine's per-cycle step and every verdict is either "overshot" or "not firing" by construction. Same recommendation as C106, still open: the expectation writer should take its magnitude from the prior cycle's observed delta. No win callout.

---

## Summary

- **Ailments:** 12 (1 high, 9 medium, 2 low) — one real (OARI vs a citywide crime drop), one config gap dressed as a civic issue (`illnessConvergenceRate`), one detector reading the engine's normal band as strain, one editorial gap (faith), one design-as-fault (migration without economic events), seven small hood rows inside the cluster table.
- **Anomalies:** 40 — 2 cleared as the @66 fix landing, 4 income doublings routed to engine-debug, 9 crime drops story-safe only as a citywide quiet week, the rest suppressed.
- **Improvements:** 2 real initiative advances; 10 hood rises are the city scalar.
- **Briefs:** 90 (0 approval-shift after correction).
- **Engine items for the gap log:** (1) engine.165 root cause — ten of 22 hoods are missing from the hardcoded Phase-2 `CLUSTERS` table, get no `neighborhoodDynamics` track, and ride the city scalar 1:1 (`applyCityDynamics.js:585`, `:1395`; `v3NeighborhoodWriter.js:411-413`); (2) `illnessConvergenceRate` missing from World_Config, default in use three cycles; (3) four Tier-4 incomes doubled in one pass, three of them Plumbers; (4) violent crime fell in nine hoods at once — writer unread; (5) Advancement phase 56s, double C106.
