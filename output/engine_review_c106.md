# Engine Review — Cycle 106

**Cycle:** 106 | **In-world:** C106, sim year 2042 (world year 3 — cycles 105–156 are 2042 per `advanceSimulationCalendar.js` §SIM YEAR)
**Auditor version:** engineAuditor 1.0.0 (detectors: stuckInitiatives 1.4.0, repeatingEvents 1.2.0, mathImbalances 1.3.0, cascadeFailures 1.0.0, writebackDrift 1.1.0, productionImbalance 1.0.0, improvements 1.1.0, incoherence 1.0.0, ledgerCompleteness 1.0.0; enrichers: checkMitigators 1.1.0, recommendRemedy 1.0.0, resolveAffectedCitizens 1.1.0, generateTribuneFraming 1.0.0, measureRemedies 1.0.0, checkOrphanAilments 1.0.0, detectAnomalies 1.0.0, generateBaselineBriefs 1.2.0)
**Source files:**
- `output/engine_audit_c106.json` — 27 patterns (23 ailments, 4 improvements)
- `output/engine_anomalies_c106.json` — 13 anomalies
- `output/baseline_briefs_c106.json` — 33 briefs

**Cycle execution:** 133 phases, all ok, 197.5s, **0 engine errors**, 1 audit issue, 32,751 rng draws. Slowest: Advancement 23.9s, MediaIntake 23.0s, ExecuteIntents 20.8s (838 intents), MaintainLifeHistoryLog 19.6s, HouseholdFormation 15.8s. First fire with `citizenArchiveEnabled` = 1: Phase 11 archived 54 citizens (44 traded-away, 10 deceased), ledger 968 → 922 with 8 minted; archive integrity 0 on-both / 0 restored / 0 flagged.

---

## Read this first — the 19 neighborhood "decays" are one event, not nineteen

Nineteen of the 23 ailments are `math-imbalance` rows, one per neighborhood, each reporting Sentiment down 0.31–0.73 in a single cycle. Read against the auditor's own snapshots they are the second half of a sawtooth, not nineteen crises:

| | C104 | C105 | C106 |
|---|---|---|---|
| Mean hood Sentiment change | — | **+0.375** | **−0.515** |
| Hoods above 1.0 (the scale's ceiling) | 0 | 4 (Adams Point 1.03, Baylight 1.05, Dimond 1.01, Ivy Hill 1.09) | 0 |
| Range | 0.33–0.60 | 0.71–1.09 | 0.23–0.51 |

C105 pushed every neighborhood up by roughly +0.4 and four of them past 1.0, which the scale does not allow. C106 brought all 22 back to a band slightly *below* C104. The C105 execution log's named sentiment sources (initiative implementation +0.094, sports +0.028, coverage +0.020) add to about +0.14, not +0.4, so most of the C105 rise had no logged cause, and the C106 fall is the world correcting an inflated prior rather than 22 neighborhoods souring at once. RetailVitality shows the same shape at smaller amplitude (up ~+2 at C105, back ~−1.3 at C106).

**For sift:** do not run 19 neighborhood-decline stories. The C105 improvement story ("sentiment rose everywhere") was built on the inflated half of this and should not be extended. The true C104→C106 movement is small and slightly negative citywide. Routed to engine-debug in §Anomalies; the cause of the C105 inflation is the open question, not the C106 drop.

The four hood rows carrying `remedy-working` (Temescal, West Oakland, Fruitvale, East Oakland) are the same correction seen through active mitigators and need no action. The fifteen `no-mitigator` hood rows are listed once, below, with the three the detector rated high called out, and none is framed as a story on its own.

---

## Ailments

### 1. **HIGH** — The alternative-response program is running, violent crime fell hard, and the composite index still says otherwise

- **Tech diagnosis:** `Initiative_Tracker` INIT-002 (Oakland Alternative Response Initiative, `implementation-active`, PolicyDomain `safety`) against three affected neighborhoods whose `CrimeIndex` contradicts the initiative's direction (West Oakland 1.1, Fruitvale, East Oakland). The measured field is different: `Crime_Metrics.ViolentCrimeIndex`, where the prior review expected −0.05 and the engine delivered **−6** (`remedy-overshot`). Two crime metrics, two stories: the violent index dropped 120× the expectation, the composite index that the incoherence detector reads did not move with it.
- **Existing mitigators:** INIT-002 itself, 1 cycle in `implementation-active`, `effectsFiring: true`, effect evidence `effects-firing` on ViolentCrimeIndex. The C105 city-hall gavel launched the District 1 expansion this cycle.
- **Why working/not:** `gap: mitigator-firing-but-insufficient` — the program is running and the math on its own field has more than caught up; the composite `CrimeIndex` is what has not. Corroborated by §Anomalies: West Oakland violent crime 56 at −9.2σ from its 3-cycle mean, East Oakland 60 at −13.4σ, both `cover-as-story` at high confidence. This is the win the incoherence detector cannot see because it reads the other column.
- **Remedy path:** World-side first: (1) layer a second safety initiative alongside the existing one (`council:any`); (2) a West Oakland neighborhood organizer or local leader drives ground-level action (`character-intervention`). No tech-side bug flagged, but see §Measurement — the expectation of −0.05 was set for a pilot and the program is now citywide; re-baseline before calling the next cycle an overshoot too.
- **Tribune framing:** Civic (INIT-002 stalled-vs-working — the responsible office is the OARI program director) and Letters (a West Oakland resident on safety). Cast: Denise Carter (POP-00501, D1, whose district the expansion just entered), Dom Will (POP-00368), Carmen Solis (POP-00953). Three layers — *engine:* the violent index fell 6 points against an expected 0.05 in the three OARI hoods; *simulation:* felt in West Oakland, Fruitvale, East Oakland; *user actions:* the Sunday gavel launched the D1 expansion and mandated monthly reporting. Capability hooks: `covers West Oakland`, `covers Fruitvale`, `mentions INIT-002`, `cites a West Oakland resident`, `quotes Denise Carter (POP-00501)`.
- **Measure next cycle:** `Crime_Metrics.ViolentCrimeIndex` in the three hoods (hold or continue down; a rebound would say C106 was noise) and `CrimeIndex` composite (does it start following the violent index). One delta target per mitigator: ViolentCrimeIndex ≤ −1 again in each of the three.

### 2. The city keeps saying "strain" — fourth cycle, still nobody's

- **Tech diagnosis:** `Riley_Digest.recurringIssue` = "strain", co-occurring with "trend", `cyclesRecurring: 4`, no policy domain matched, no stuck initiative behind it. `cyclesInState: 3` — this is the same pattern the C105 review carried and it aged one cycle exactly as that review said to watch for.
- **Existing mitigators:** None (`mitigatorState.exists: false`).
- **Why not working:** `gap: no-mitigator` — nothing in motion. The C105 review set the escalation rule at "count reaches 5 with still no mitigator"; it is at 4.
- **Remedy path:** (1) a council member proposes a general initiative aimed at the affected area; (2) the Mayor's office names the gap in remarks. No tech-side bug.
- **Tribune framing:** Civic (who is accountable) and Letters (a resident writing in). Scope stays city-level; the story is the absence of an owner. No capability hooks (no neighborhood or citizen resolved).
- **Measure next cycle:** `recurringIssue` at C107. If it reads "strain" a fifth time with no `Initiative_Tracker` row in a matching PolicyDomain, raise to high.

### 3. Faith is producing events the paper isn't reading — second cycle

- **Tech diagnosis:** `WorldEvents_V3_Ledger` `faith` domain: 5 events this cycle, `priorCycleCoverage: 0`, sub-check `production-without-consumption`, routing hint `roundup-thread-acceptable`. The C106 execution log corroborates the domain is live: `processFaithJoins_: 1 joined`, `saveV3Domains_ … Dominant: FAITH`, and `domainTracker_ v3.4: Cooldown on FAITH (-1)` — the engine itself is now cooling the domain because nothing consumed it.
- **Existing mitigators:** None, and none is the right answer — editorial gap.
- **Why not working:** `gap: no-mitigator`. The C105 review said this was directly checkable at C106 via `Edition_Coverage_Ratings`; C105's five rows were consumed this fire and none was faith.
- **Remedy path:** `editorial-pickup` — thread the faith events into a roundup or desk thread. Elliot Graye's seat.
- **Tribune framing:** Civic and Letters by the detector; in practice Culture (Elliot Graye, faith beat). Five events again is a thread, not a front page.
- **Measure next cycle:** any faith-domain row in C106's `Edition_Coverage_Ratings`; the FAITH cooldown clearing in the C107 log.

### 4. Twenty-two neighborhoods are moving and the economy didn't tell them to — measured this cycle, and the remedy did not fire

- **Tech diagnosis:** `Neighborhood_Map` migration flow in 22 neighborhoods against 0 economic events; sub-check `migration-without-economic-cause`; tech anchor `Neighborhood_Map.RetailVitality`. The C106 log shows the machinery behind it: `processRelocations_: 6 unit(s) relocated`, `applyMigrationDrift_: worldMig=1176`, `runEconomicRippleEngine_: ripples=4, layoffs=0`.
- **Existing mitigators:** West Oakland Stabilization Fund (`disbursement-active`, 3 cycles, firing on RetailVitality) and Youth Apprenticeship Pipeline (`implementation-active`, 0 cycles — it just advanced, firing on RetailVitality).
- **Why working/not:** the mitigator check says `remedy-working` (both firing); the measurement says `remedy-not-firing` (expected RetailVitality +0.02, observed **−1.16**). Both are right and the sawtooth explains it: RetailVitality overshot at C105 (+2.65 against +0.02, the prior review's `remedy-overshot`) and gave back −1.16 at C106. Net C104→C106 is still positive in 20 of 22 hoods. The detector's expectation of +0.02 per cycle is an order of magnitude below what the engine actually moves.
- **Remedy path:** `none — monitor`. Correct. Do not layer anything on this.
- **Tribune framing:** Business (economic footprint in Downtown) and Civic (the fund's status). Cast: AJ Dybantsa (POP-01024), Michael Corliss (POP-00596), Celeste Moon (POP-01061). Hooks: `covers Downtown`, `covers Temescal`, `cites a Downtown resident`, `quotes AJ Dybantsa (POP-01024)`. Better told as the C104→C106 net than either half.
- **Measure next cycle:** RetailVitality citywide mean; if it lands between the C104 and C106 values the series has settled and the +0.02 expectation should be rewritten as ±0.5.

### 5–23. Neighborhood sentiment rows (the sawtooth, itemised once)

All nineteen carry `cyclesInState: 0`, `measurement: no-prior-match`, and the same remedy text. Listed for the record; see the note above the Ailments header before assigning any of them.

| Hood | Severity | Sentiment C105→C106 | Standing (of 22) | Mitigator state | Detector's cast |
|---|---|---|---|---|---|
| Downtown | **high** | 0.81→0.41 | S 8th, RV 4th, HP 3 (18th) | none | Eric Taveras (POP-00597), Travis Coles (POP-00533), Adash Stanley (POP-01023) |
| Rockridge | **high** | 0.84→0.46 | S 3rd, RV 3rd, HP 3 (19th) | none | Isley Kelley (POP-00019), Avery Santana (POP-00034), Warren Ashford (POP-00504) |
| Grand Lake | **high** | 0.99→0.32 | S 17th, RV 6th, HP 2.5 | none | Amara Keane (POP-00002), Louis Cross (POP-01080), Vinnie Keane (POP-00001) |
| Temescal | low | 0.88→0.51 | S **1st**, RV **1st**, HP 4.5 (22nd) | INIT-005 firing — remedy-working | Philly Rodriguez (POP-00027), Omar Cleo (POP-00290), Sonia Parikh (POP-00745) |
| West Oakland | low | 0.77→0.43 | S 5th, RV 20th | INIT-001/002/007 firing — remedy-working | Beth Hayes (POP-00576), Gregory Mims (POP-00023), Eleanor Rivera (POP-00617) |
| Fruitvale | low | 0.79→0.48 | S 2nd, RV 9th | INIT-002/007 firing — remedy-working | Lucia Polito (POP-00004), Rick Walker (POP-00198), Martin Richards (POP-00031) |
| East Oakland | low | 0.96→0.28 | S 20th, RV 17th | INIT-002/007 firing — remedy-working | Renée Cabrera (POP-00891), Maria Conteras (POP-01047), Jerome Pittman (POP-01055) |
| Piedmont Ave | medium | 0.75→0.40 | S 9th, RV 12th | none | Claire Ashford (POP-01071), Wendell Carter Jr. (POP-01028), Ariana Lee (POP-00168) |
| Chinatown | medium | 0.79→0.39 | S 10th, RV 8th | none | Abraham Wright (POP-00497), Wei Thomas (POP-00519), Hal Richmond (POP-00007) |
| Brooklyn | medium | 0.97→0.26 | S 21st, RV 19th | none | Mateo Nguyen (POP-01091, minted this cycle) |
| Eastlake | medium | 0.98→0.30 | S 19th, RV 13th | none | Joel Clark (POP-01088, minted this cycle) |
| Glenview | medium | 0.98→0.31 | S 18th, RV 18th | none | Jacob Perez (POP-01089), Marcus King (POP-01087) — both minted this cycle |
| Dimond | medium | 1.01→0.33 | S 14th, RV 14th | none | Bruce Turner (POP-01086), Elijah Walker (POP-01090) — both minted this cycle |
| Ivy Hill | medium | 1.09→0.36 | S 12th, RV **22nd** | none | Isaac Martinez (POP-00784) |
| San Antonio | medium | 0.90→0.23 | S **22nd**, RV 15th | none | Jamal Thompson (POP-00778), Dank Abara (POP-00796), Delia Vargas-Ruiz (POP-01054) |
| KONO | medium | 0.71→0.33 | S 15th, RV 7th | none | Crystal Oh (POP-00845), Emiko Suzuki (POP-00856), Tatiana Flores (POP-00859) |
| Lake Merritt | medium | 0.80→0.46 | S 4th, RV 11th | none | Sidney Tumolo (POP-00058), Frank Reyna (POP-00079), Mags Corliss (POP-00005) |
| Uptown | medium | 0.88→0.43 | S 6th, HP 3 (21st) | none | Henry Rivas (POP-00024), Elliott Crane (POP-00044), Everson Morello (POP-00536) |
| Baylight District | medium | 1.05→0.33 | S 16th, RV 21st | none — category `housing` | Dawson Nguyen (POP-00347), Rico Valdez (POP-00777), Ernesto Quintero (POP-00050) |

Three things in this table are real and survive the sawtooth:

- **Housing pressure is climbing where the sentiment isn't.** Temescal HP 2.5→3.5→4.5 (worst in the city), Downtown 1→2→3, Rockridge 1→2→3, Uptown 1→2→3, Grand Lake 0.5→1.5→2.5 — monotone over three cycles, not a sawtooth. This is the one neighborhood signal in the audit that has a direction. Business/Civic story with a real cast: Temescal's Philly Rodriguez (POP-00027), Downtown's Eric Taveras (POP-00597). The detector tagged Baylight `housing` but Baylight's HP is 0; the housing story is Temescal's.
- **Ivy Hill and Baylight are the retail floor** (RV 3.66 and 3.93, 22nd and 21st) in both C105 and C106 — standing, not swing.
- **Six of the detector's casts are citizens minted this cycle** (POP-01086 through POP-01091) — the affected-citizen resolver picked the newest rows in hoods with thin ledgers (Brooklyn, Eastlake, Glenview, Dimond). A reporter should not quote a citizen the world has known for one cycle as the voice of a neighborhood's mood.

---

## Anomalies

**13 detected.** Triage: 2 `route-to-engine-debug` (high confidence), 2 `cover-as-story` (high), 9 `suppress-until-verified` (medium).

**Route to engine-debug — two Tier-4 incomes that doubled with nobody beside them.** POP-00260 Kevel Phoul, warehouse worker, Lake Merritt: income 104,500 → 215,100 (+106%), peer move share 1%. POP-00268 Shane Phelps, janitor, Lake Merritt: 106,000 → 283,800 (+168%), peer move share 1%. Both had a prior jump at C105 (45,400 → 104,500 and 93,271 → 106,000), both carry a C106 `Maneuver-Climb` LifeHistory row, and both are in the same hood at the same tier in the same trade class. A janitor at 283,800 is not a story; it is a write. Followup filed for the engine terminal at `output/engine_anomalies_c106_followup.md`; suppressed from the edition until cleared.

**Cover as story — violent crime fell in the two OARI hoods.** West Oakland 56 (3-cycle mean 60.33, −9.2σ), East Oakland 60 (mean 66.33, −13.4σ). High confidence, and coherent with Ailment 1's `ViolentCrimeIndex` −6 measurement and the D1 expansion the gavel launched. One story, not two: the program the composite index says isn't working is the one the violent index says is.

**Suppressed — nine migration-flow shifts** (Downtown 5→4, West Oakland 5→2, Jack London 4→3, Adams Point 5→3, Grand Lake, Chinatown, KONO, Lake Merritt, Baylight all 5→4). Medium confidence, one prior cycle of history each, and all in the direction the sawtooth predicts. Stay out of the edition.

**Not in the anomaly file but routed to engine-debug from this review:** the C105 sentiment inflation (§Read this first). The anomaly detector compares against a 3-cycle mean and C105 is one of the three, so it cannot see it. Same followup file.

---

## Improvements

**4 improvements — three of them the Sunday city-hall chain landing, one a measurement artifact.**

The C105 city-hall decisions applied to the ledger at 14:54 today read back here as engine-observed advances:
- Fruitvale Transit Hub Phase II: `visioning` → `visioning-complete` (INIT-003; Fruitvale; Ramon Solano POP-00756, Calvin Turner POP-00231)
- Baylight District — Final Council Vote: `vote-scheduled` → `construction-planning` (INIT-006; Jack London, Downtown; Merkin Jumper POP-00688, Eunice Marston POP-00753)
- Oakland Youth Apprenticeship Pipeline: `pilot-active` → `implementation-active` (INIT-007; West Oakland, East Oakland, Fruitvale; Robert Jaston POP-00758, Sage Vienta POP-00771)

Second consecutive cycle the loop has closed end to end: chain writes the tracker, engine reads it, auditor counts it. All three carry Civic + Business handles and are legitimate **IMPROVEMENT** candidates for sift; Baylight's vote is the front-page-shaped one (a $2.1B bid approved, construction planning begins, Jack London and Downtown both named).

The fourth, "Remedy overshot expectation on RetailVitality: observed 2.65 (expected 0.02)", is the C105 half of the sawtooth re-reported as good news. Do not surface it.

**Not counted by the detector but visible in the log:** the citizen archive went live cleanly (54 moved, 0 errors, 0 on both sides), the RNG draw count fell from 33,364 to 32,751 with 46 fewer citizens, and `applyOwnerDraw_` paid 2 of 5 owners with 6 unresolved — that last one is a gap-log note, not a story.

---

## Baseline Briefs (sift input)

- **Total: 33 briefs** — citizen-life-event 19, world-event 8, initiative-milestone 3, approval-shift 3
- **With promotion hints: 28** of 33
- **Cluster note:** the mix shifted toward citizen life (19 vs 11 at C105) and away from world events (8 vs 13). Briefs spread across 17 neighborhoods with no dominant cluster; 3 are district-scoped (D1, D3 — the approval shifts, both councillors down 5 this cycle per the log), 1 citywide, 1 unassigned. The three initiative milestones are the three improvements above.
- **Caveat (known limitation, S146):** most `WorldEvents_V3_Ledger` events still resolve to `misc-event`, so citizen-attributed promotion stays degraded — promote on neighborhood + ailment overlap from `promotionHints`, not on `subjectIds`.
- Source: `output/baseline_briefs_c106.json`

---

## Measurement Check (from previous review)

| Pattern | Affected | Prior remedy | Expected | Observed | Verdict |
|---|---|---|---|---|---|
| incoherence | INIT-002 / West Oakland, Fruitvale, East Oakland | propose-new-initiative | −0.05 `Crime_Metrics.ViolentCrimeIndex` | **−6** | **remedy-overshot** |
| production-imbalance | 22 neighborhoods | none (monitor) | +0.02 `Neighborhood_Map.RetailVitality` | **−1.16** | **remedy-not-firing** |
| repeating-event | city-level ("strain") | — | — | — | — |
| coverage-gap | faith domain | — | — | — | — |
| math-imbalance ×19 | one per hood | — | — | — | — |

2 of 23 ailments carried a prior to measure against; 21 are `no-prior-match` (the 19 hood rows are new this cycle as patterns even though the hoods aren't). The 4 improvements are `prior-had-no-expectation`.

**On both measured rows:** the expectations are two orders of magnitude below what the engine moves per cycle (0.05 vs 6; 0.02 vs 1–3). Every verdict this loop has produced so far has been "overshot" or "not firing" against a number that was never calibrated to the engine's actual step size. The loop is working; the yardstick is wrong. Recommend the expectation writer take its magnitude from the prior cycle's observed delta rather than a fixed constant — filed in the gap log.

### Remedy-type track record

| Remedy type | Firing-as-expected | Firing-insufficient | Not-firing | Overshot |
|---|---|---|---|---|
| propose-new-initiative | 0 | 0 | 0 | 2 (C105 RetailVitality, C106 ViolentCrimeIndex) |
| none (monitor) | 0 | 0 | 1 (C106 RetailVitality) | 0 |

Two cycles of history. Both "overshoots" are the engine delivering far more than asked; the one "not-firing" is the give-back after an overshoot. No remedy type has yet been measured against a calibrated expectation.

**No win callout by the skill's rule** — no pattern flipped from `remedy-not-firing` to `remedy-firing-as-expected`. The nearest thing to a win is Ailment 1 read together with the two crime anomalies: the alternative-response program's own metric moved 6 points in its direction one cycle after the city-hall chain launched its expansion.

---

## Summary

- **Ailments:** 23 (4 high, 15 medium, 4 low) — 19 are one sentiment sawtooth; 4 carry `remedy-working`; the standalone signals are INIT-002/crime (high), "strain" ×4, faith coverage ×2, and the three-cycle housing-pressure climb in Temescal/Downtown/Rockridge/Uptown/Grand Lake
- **Anomalies:** 13 (2 route-to-engine-debug, 2 cover-as-story, 9 suppress-until-verified) + 1 routed from this review (C105 sentiment inflation)
- **Improvements:** 4 (3 initiative advances from the Sunday chain, 1 artifact)
- **Baseline briefs:** 33 (28 with promotion hints)
- **Measurements:** 0 / 2 firing as expected; 1 not firing; 1 overshot — both against uncalibrated expectations
- **Engine health:** 0 errors, 133/133 phases, archive live and clean. Two engine items for the gap log: the C105 sentiment inflation source, and the sim-year constant (2041) still hardcoded at ten-plus live age-math sites one cycle after the calendar rolled to 2042.
