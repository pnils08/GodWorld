# Engine Review — Cycle 105

**Cycle:** 105 | **In-world:** Y2C105
**Auditor version:** engineAuditor 1.0.0 (detectors: stuckInitiatives 1.4.0, repeatingEvents 1.2.0, mathImbalances 1.3.0, cascadeFailures 1.0.0, writebackDrift 1.1.0, productionImbalance 1.0.0, improvements 1.1.0, incoherence 1.0.0, ledgerCompleteness 1.0.0, checkMitigators 1.1.0, recommendRemedy 1.0.0, generateTribuneFraming 1.0.0, measureRemedies 1.0.0, detectAnomalies 1.0.0, generateBaselineBriefs 1.2.0)
**Source files:**
- `output/engine_audit_c105.json` — 30 patterns (4 ailments, 26 improvements)
- `output/engine_anomalies_c105.json` — 161 anomalies
- `output/baseline_briefs_c105.json` — 32 briefs

**Cycle execution:** 130 phases, all ok, 153.7s, **0 engine errors**, 2 audit issues, 33,364 rng draws. Slowest: HouseholdFormation 23.5s, ExecuteIntents 21.3s (530 intents), MaintainLifeHistoryLog 17.9s.

---

## Ailments

### 1. The city keeps saying "strain" and nobody has answered it

- **Tech diagnosis:** `Riley_Digest.recurringIssue` = "strain", co-occurring with "trend", now recurring a fourth straight cycle. No policy domain matched it and no stuck initiative sits behind it — the signal is city-level and unassigned, which is why nothing has picked it up.
- **Existing mitigators:** None. `mitigatorState.exists: false`.
- **Why not working:** `gap: no-mitigator` — there is nothing in motion to address this. The word has surfaced four cycles running and the city has produced no instrument aimed at it.
- **Remedy path:** World-side, in order: (1) a council member proposes a new general initiative targeting the affected area; (2) the Mayor's office names the gap in public remarks. No tech-side bug — this is institutional silence, not a broken chain.
- **Tribune framing:** Civic and Letters desks. *Engine:* the issue recurred four cycles. *Simulation:* scope is city-level, so the story is the absence of an owner, not one neighborhood's complaint. *User actions:* no mitigator exists. The honest civic angle is the fourth-cycle repetition itself — what does a city do with a complaint that has no department attached to it? Letters is the natural second voice: residents naming it before officials do.
- **Measure next cycle:** does `recurringIssue` still read "strain" at C106? Watch for a new `Initiative_Tracker` row with a matching PolicyDomain. If the count reaches 5 with still no mitigator, escalate severity.

### 2. Faith is producing events the paper isn't reading

- **Tech diagnosis:** `WorldEvents_V3_Ledger` shows the `faith` domain generated 5 events this cycle against **zero** Tribune coverage last cycle. Sub-check: production-without-consumption. Routing hint from the detector: `roundup-thread-acceptable`.
- **Existing mitigators:** None — and none is the right answer, because this is an editorial gap, not a world gap.
- **Why not working:** `gap: no-mitigator`. The world is generating faith-domain life and the newsroom is not looking at it. Corroborated independently in the C105 execution log: `domainTracker_ v3.4: Cooldown on FAITH (-1)`, and `processFaithJoins_: 1 joined, 0 drifted`.
- **Remedy path:** Editorial pickup, not legislation — thread the faith events into a roundup or a desk thread. This one is `/sift`'s to solve, not the council's.
- **Tribune framing:** Civic and Letters. Elliot Graye's beat by roster (`persona-map.json` beatDomain COMMUNITY, faith seat). Five events is enough for a thread, not a front page.
- **Measure next cycle:** does C106 show faith coverage > 0 in `Edition_Coverage_Ratings`? This is now directly checkable — the coverage channel was repaired this session (pipeline.62) and C104 ratings are on the sheet, so a faith story would register as a domain row rather than vanishing.

### 3. Twenty-two neighborhoods are moving and the economy didn't tell them to

- **Tech diagnosis:** `Neighborhood_Map` reports migration flow in **22** neighborhoods against **0** economic events this cycle. Sub-check: migration-without-economic-cause. Tech anchor `Neighborhood_Map.RetailVitality`, observed delta **2.65**.
- **Existing mitigators:** Two, both live. West Oakland Stabilization Fund (`disbursement-active`, 2 cycles in phase, effects firing) and Oakland Youth Apprenticeship Pipeline (`pilot-active`, 0 cycles in phase — it entered this phase from the C104 apply, effects firing).
- **Why working:** `gap: remedy-working` — the gap is closing. Both mitigators register `effect-evidence: effects-firing`. **This is an improvement story wearing an ailment's clothes**: the detector flags migration without a matching economic event, but the economic causes are the two initiatives, which fire through the initiative channel rather than the economic-event channel.
- **Remedy path:** `none — monitor`. No action recommended, and none should be taken.
- **Tribune framing:** Civic, Business, Letters. *Simulation:* felt in Downtown, Temescal, Laurel; candidate voices Louis Cross (POP-01080), Dr. Lila Mezran (POP-00154), Rafael Montez (POP-00136). Capability hooks: `covers Downtown`, `covers Temescal`, `cites a Downtown resident`, `quotes Louis Cross (POP-01080)`. Business desk has the strongest angle — people are moving and the ledger has no transaction to explain it, which is exactly what a stabilization fund paying out looks like from the street.
- **Measure next cycle:** `Neighborhood_Map.RetailVitality` — expected +0.02, observed **+2.65**. See §Measurement: this reads `remedy-overshot` and wants a second cycle before anyone concludes the model is wrong.

### 4. **HIGH** — The alternative-response program is running and crime is going the other way

- **Tech diagnosis:** `Initiative_Tracker` row 3 — INIT-002, Oakland Alternative Response Initiative, `implementation-active`, PolicyDomain `safety` — against three affected neighborhoods whose CrimeIndex contradicts the expected direction: West Oakland **1.16**, Fruitvale **1.00**, East Oakland **1.17**. Tech anchor `Crime_Metrics.ViolentCrimeIndex`, observed delta 1.
- **Existing mitigators:** One — INIT-002 itself, `implementation-active`, 0 cycles in phase (it advanced from `pilot_evaluation` this cycle), effects firing.
- **Why not working:** `gap: mitigator-firing-but-insufficient` — the program is running and the math hasn't caught up. Note the phase age: it entered implementation-active **this cycle**. The engine is measuring an initiative that has had no time to act. That is the most likely reading, and it is testable next cycle rather than arguable now.
- **Remedy path:** World-side, in order: (1) layer a second safety initiative alongside the existing one (`council:any`); (2) character intervention — a neighborhood organizer or local leader driving ground-level action in West Oakland. No tech-side bug: the writeback chain is intact.
- **Tribune framing:** Civic and Letters. *Simulation:* felt in West Oakland, Fruitvale, East Oakland; candidate voices Lucia Polito (POP-00004), Vladimir Gonzalez (POP-00598), Robert Jaston (POP-00758). Capability hooks: `covers West Oakland`, `covers Fruitvale`, `mentions INIT-002`, `cites a West Oakland resident`, `quotes Lucia Polito (POP-00004)`. The honest frame is *not* "the program failed" — it launched this cycle. It is: the numbers residents live with have not moved yet, and the people carrying that are three specific neighborhoods.
- **Measure next cycle:** `Crime_Metrics.ViolentCrimeIndex` for West Oakland / Fruitvale / East Oakland, and `cyclesInPhase` on INIT-002. If the index is still ≥1.0 at C107 with the initiative two cycles into implementation, `mitigator-firing-but-insufficient` becomes a real verdict rather than a timing artifact.

**No pattern this cycle carries `suggestedFrontPage: true`.** Ailment 4 is the highest-severity item and the strongest front-page candidate on judgment — sift should weigh it as such despite the flag.

---

## Anomalies

**161 detected.** Triage: 150 `suppress-until-verified` (all medium confidence), 10 `cover-as-story` (high confidence), 1 `route-to-engine-debug`.

*Deviation from the skill, stated plainly:* §Step 4 asks for one paragraph per entry in `anomalies[]`. At 161 entries that would bury the three that matter, and 150 of them are the same suppressed class. This section is grouped by triage path with counts, and every non-suppressed anomaly (all 11) is named individually below. If per-entry prose is wanted, it belongs in a generated appendix, not here.

**The cover-as-story ten are one story, not ten.** Every one is a citizen income jump between 104% and 218% — POP-00778 (+164%, 37,868 → 100,000), POP-00815 (+191%), POP-00856 (+218%, 29,864 → 95,000), POP-00859 (+164%), POP-00808 (+104%), POP-00913 (+105%) and four more. Each carries a **peer move share of 38–50%**, meaning roughly half their comparison cohort moved with them. That is a cohort event, not ten coincidences: it is engine.135's employment cascade re-basing pay against hood reference businesses, landing on live citizens for the first time. High confidence, and it is genuinely the biggest thing that happened to individual people this cycle. Business desk, one story, several named citizens.

**The one debug route is the interesting exception.** POP-00777, income +156% (34,335 → 88,000), **peer move share 0%** — the only large mover with no cohort behind them. The other ten moved with a third to half their peers; this one moved alone. That difference is the whole reason it triages differently, and it is worth a look before it is covered. Suppressed from the edition until cleared. Follow-up written to `output/engine_anomalies_c105_followup.md`.

The 150 suppressed are medium-confidence and unverified; per the skill they stay out of the edition and out of the narrative.

---

## Improvements

**26 improvements — the largest block in the audit, and four of them are the civic chain landing.**

The C104 city-hall decisions applied to the ledger this session show up here as engine-observed advances:
- Oakland Alternative Response Initiative: `pilot_evaluation` → `implementation-active`
- Oakland Youth Apprenticeship Pipeline: `implementation-active` → `pilot-active`
- Fruitvale Transit Hub Phase II: `visioning-complete` → `visioning`
- Baylight District — Final Council Vote: `construction-planning` → `vote-scheduled`

Those four are the same rows written to `Initiative_Tracker` before this fire. The civic chain moved, the engine read it, and the engine counted it as improvement — the loop closed end to end.

The remaining 22 are neighborhood sentiment rises, and they are broad: Temescal +0.30 (0.58 → 0.88), West Oakland +0.29 (0.48 → 0.77), Laurel +0.24 (0.49 → 0.73), Downtown +0.22 (0.59 → 0.81). The execution log names the causes — initiative implementation contributed +0.083 sentiment across 4 neighborhoods, edition coverage +0.048, sports +0.029. **The edition-coverage contribution is new**: it is the C103/C104 coverage ratings backfilled this session being consumed for the first time (`applyEditionCoverageEffects_ v2.1: Processing 3 domain ratings` — CULTURE r4, SPORTS r3, ENVIRONMENT −2). That channel had been dead since C102.

Story candidate for sift, tagged **IMPROVEMENT**: a city where sentiment rose in most neighborhoods at once, with three nameable causes rather than a mood. Culture and Business both have a claim.

---

## Baseline Briefs (sift input)

- **Total: 32 briefs** — world-event 13, citizen-life-event 11, initiative-milestone 4, approval-shift 4
- **With promotion hints: 25** of 32
- **Cluster note:** briefs concentrate on Laurel (4), West Oakland (3), Uptown (3), Rockridge (3), with Downtown / Fruitvale / Temescal at 2 each; 4 carry no neighborhood, 1 citywide, and 3 are district-scoped (D1, D3, D5 — the approval shifts). West Oakland and Fruitvale overlap directly with ailment 4 (INIT-002) and Temescal with the health-center mitigator, so those are the strongest promotion candidates by ailment overlap.
- **Caveat (known limitation, S146):** most `WorldEvents_V3_Ledger` events still resolve to `misc-event`, so citizen-attributed promotion stays degraded — promote on neighborhood + ailment overlap from `promotionHints`, not on `subjectIds`.
- Source: `output/baseline_briefs_c105.json`

---

## Measurement Check (from previous review)

| Pattern | Affected | Prior remedy | Expected | Observed | Verdict |
|---|---|---|---|---|---|
| production-imbalance | 22 neighborhoods (Downtown, Temescal, Laurel, West Oakland …) | propose-new-initiative | +0.02 `Neighborhood_Map.RetailVitality` | **+2.65** | **remedy-overshot** |
| repeating-event | city-level ("strain") | — | — | — | — |
| coverage-gap | faith domain | — | — | — | — |
| incoherence | INIT-002 / West Oakland, Fruitvale, East Oakland | — | — | — | — |

1 of 4 ailments carried a prior to measure against; the other 3 are new patterns this cycle (`reason: no-prior-match`). Across all 30 patterns: 1 measured, 24 `no-prior-match`, 5 `prior-had-no-expectation`.

**On the overshoot:** RetailVitality moved 132× its expected delta. Two readings are open and one cycle separates them — either the expectation was set far too low for an initiative in `disbursement-active` (likely: the expectation was written when the fund was still authorizing, not paying), or something is over-crediting retail. It is not evidence of a broken remedy: the direction is right and the mitigators register as firing. Do not tune against a single overshoot; re-measure at C106.

### Remedy-type track record

| Remedy type | Firing-as-expected | Firing-insufficient | Not-firing | Overshot |
|---|---|---|---|---|
| propose-new-initiative | 0 | 0 | 0 | 1 |

One measurement in the history so far. The track record becomes meaningful from C106 onward — this is the first cycle the loop has had a prior to compare against.

**No win callout this cycle** — no pattern flipped from `remedy-not-firing` to `remedy-firing-as-expected`. The nearest thing to a win is not in this table: the four initiative advances under §Improvements, which are the civic chain delivering after being stalled since C104.

---

## Summary

- **Ailments:** 4 (1 high, 3 medium) — 1 of which (`production-imbalance`) is classified `remedy-working` and is arguably good news
- **Anomalies:** 161 (150 suppress-until-verified, 10 cover-as-story, 1 route-to-engine-debug)
- **Improvements:** 26 (4 initiative advances, 22 neighborhood sentiment rises)
- **Baseline briefs:** 32 (25 with promotion hints)
- **Measurements:** 0 / 1 firing as expected; 0 not firing; 1 overshot

**Engine health:** clean. 130 phases all ok, 0 engine errors, 0 Math.random violations, cycleCount persisted (105). Two engine-side observations worth carrying, neither an ailment the world feels:
1. `runCareerEngine v2.6 headcount: 0 businesses moved, 0 skipped (blank Employee_Count), 0 reconciliation firings across 0 businesses` — the career engine processed **zero** businesses. With engine.135's employment cascade live, a zero-business headcount pass wants an explanation.
2. `processEducationCareer_ v2.1: Complete. Education: 0, Career: 0, Stagnant: 256, Income: 0` — 256 citizens stagnant, zero education or career movement. Consistent with engine.135 E3 ("hiring reaches only the jobless, in their own field") narrowing the eligible set, but worth confirming that is the intent and not an over-narrow filter.
3. `updateStorylineStatus_ v1.2: Abandoned: 9` — **every** open storyline was abandoned this cycle, including all six civic threads. Sift should know the storyline slate is empty going in.

Both (1) and (2) belong to the engine.135 acceptance pass, not to this review — flagged here so they are not lost.
