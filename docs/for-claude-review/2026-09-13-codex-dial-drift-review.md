---
title: Citizen dial drift — engine.201 source review and proposed repair plan
created: 2026-09-13
updated: 2026-09-13
type: plan
tags: [engine, citizens, draft]
sources:
  - docs/plans/2026-09-10-inactivity-is-regression.md
  - docs/plans/2026-09-08-dials-as-a-game-plan.md
  - docs/research/2026-09-08-dials-as-a-game.md
  - utilities/citizenMemory.js
  - utilities/citizenDialMap.js
  - utilities/compressLifeHistory.js
  - output/simulation_ledger_snapshot.meta.json
  - output/codex/dial-drift-review-20260913/probes.js
pointers:
  - "[[plans/2026-09-10-inactivity-is-regression]] — owning engine.201 direction"
  - "[[plans/2026-09-08-dials-as-a-game-plan]] — engine.197 acceptance"
  - "[[engine/ROLLOUT_PLAN]] — existing tracking row"
  - "[[SIM_DOCTRINE]] — causes, chance, and persistent change"
  - "[[engine/TAG_REGISTRY]] — event and affect contract"
  - "[[engine/ENGINE_COUPLING_MAP]] — existing loop contract"
  - "[[for-claude-review/README]] — review and acceptance procedure"
  - "[[index]] — review-package registration"
---

# Citizen dial drift — source review and proposed repair plan

**Goal:** Citizens develop distinct, persistent dispositions from their own lived conditions; those dispositions change subsequent choices and outcomes, with ordinary routes toward both poles of every dial.

**Architecture:** Repair delivery and Cycle accounting before increasing the feed. Record a concrete cause separately from the citizen's response, fold the resolved experience once, and let the next Cycle's generators read the resulting bands. Extend existing workplace, neighborhood, household, and relationship systems; do not assign random personalities or infer unemployment from an unknown employer.

**Author:** codex. **Terminal/reviewer/engine lander:** engine-sheet.

**Status:** Research complete; proposed implementation awaits Claude review and builder approval. No engine, schema, classifier, cron, Sheet, or deployment changed by this package. Diagnostic code only runs locally against in-memory fixtures and a historical snapshot.

**Tracking:** Supplement to existing `engine.201`, prerequisite to closing `engine.197`. The owning plan links here. No competing rollout item. Suggested replacement row for Claude upon acceptance:

```text
| engine.201 | Repair dial delivery and Cycle accounting, then add bidirectional citizen responses to city, neighborhood, workplace and relationship causes | in-progress | engine-sheet | [[../plans/2026-09-10-inactivity-is-regression]] + [[../for-claude-review/2026-09-13-codex-dial-drift-review]] |
```

Repoint the second link to the accepted permanent path when Claude moves this file. `in-progress` describes the approved implementation only; this proposal does not change the live row's state.

## Verdict and evidence boundary

**Recommend adoption after the decisions below are approved.** Adding negative tags alone cannot solve this. Important job events miss the fold, the fold counts events as sustained experience, and the pressure mechanism discards which cause actually happened. More event volume currently accelerates convergence.

This review inspected the core dial/map/fold implementations, actual pressure and workplace mutation sites, both engine entrypoint schedules, the event selection seams, the conduct resolver, bond event emitters, and the wake-pool filters. It is not an audit of all engine files, every event pool, production deployments, or external write history.

Evidence base: local HEAD `50a8538f` at review, plus the disk C106 snapshot generated `2026-09-09T04:54:47.033Z`. The attached JSON records SHA-256 hashes of the core sources and snapshot. These are historical measurements, **not current live reads**. No live or sandbox Cycle was fired for this review.

The required Haiku engine-wiring card was generated using the authorized `runEngineAgent.js` command. Its raw output is attached as `wiring-card.txt`; the independently checked dependencies are in the wiring section below. The generator's `132/132` coverage counts files reached by grep as well as reads. It does not establish that all 132 files were reviewed. Its v2.0 label and incomplete log-reader list are not adopted as findings.

### Historical population, reproduced offline

The actual `lib/wakePerception.js:376` pool builder ran against an in-memory Sheet stub containing the snapshot. Environment loading and network clients were stubbed out. Heritage enrichment was empty and rendered age was stubbed; neither is an eligibility filter.

| Measure | Result |
|---|---:|
| Ledger rows | 930 |
| Parseable dial vectors | 919 |
| All eight current dials within 40–60 inclusive | 546 |
| Deviation at least 60, before other pool filters | 226 |
| Full wake pool | 223 |
| Outside the pool | 707 |
| Tracked business employer | 575 |
| SELF_EMPLOYED / UNTRACKED / blank employer | 219 / 67 / 69 |
| Current values exactly 100 / exactly 0 | 5 / 0 |

Current snapshot means: drive 57.20, sociability 58.11, warmth 52.88, openness 53.23, composure 54.53, integrity 50.53, family 57.17, outabout 51.05. Only composure (2 citizens) and family (1) are below 40. Full distributions are in `probes.json`.

Do not reuse the older 911 denominator or C131 bench distribution as this measurement. The 546 figure is a shared broad neutral-band classification, not proof that 546 vectors are byte-identical. A citizen outside today's wake pool can become eligible later; “never wakes” describes present eligibility, not a permanent identity.

## Findings that block a useful drift system

| ID | Verified mechanism and consequence | Source and evidence |
|---|---|---|
| D1 | Sociability, openness and outabout have no negative **DIAL_MAP** entries. Positive-entry sums are 43, 33 and 10. Ordinary negative tags mainly drain composure. | `utilities/citizenDialMap.js:31`, `:119`, `:138`; attached `map` tally. This is not a complete writer inventory: chaos can lower openness directly (`citizenMemory.js:251`, `:273`). |
| D2 | Actual employer-success layoffs clear the employer and cut income, but only add a Career-Layoff log row. The citizen's LifeHistory is unchanged, so the Phase-9 dial fold cannot see that event. Rehires and headcount-reconciliation firings have the same missing cell append by source inspection. | `phase05-citizens/runCareerEngine.js:271`, `:1283`, `:1403`, `:1431`; `compressLifeHistory.js:469`, `:502`. Probe: one layoff, income 50,000→40,000, Career-Layoff log present, LifeHistory unchanged. Rehire/reconciliation sites were not independently executed by this probe. |
| D3 | The unemployment pressure path requires Income <= 0. The two reviewed layoff paths retain 80–88% of prior positive income. Their newly jobless citizens therefore fail this pressure test while that income remains positive. | `runCareerEngine.js:272`, `:1315`, `:1405`. Missing employer is also used by employed/self-employed people elsewhere, so widening to every blank employer would repeat the old mistake. |
| D4 | Tag choice erases outcome. Leaving a congregation receives the same Faith warmth +3/composure +2 as joining. A romantic-triangle Bond line maps to default composure +1. | `phase05-citizens/bondEngine.js:1031`, `:1072`, `:2637`; `citizenDialMap.js:62`, `:242`, `:249`; attached `routing` probes use the producer's templates with a synthetic counterpart. |
| D5 | Unknown event wording receives +composure. Content routing is order-dependent: synthetic “business closed” under EngineEvent gives drive +6/openness +3 through the business regex. That is a demonstrated router failure, not evidence that a particular production writer emits that exact line. | `citizenDialMap.js:171`, `:190`, `:202`, `:246`; attached `routing`. A quieter tag table will still drift up if the fallback remains a reward. |
| D6 | A streak counts events, not distinct Cycles; quiet time never clears it. Three Promotions in one Cycle move drive base 50→59.6. Two pushes, 30 quiet Cycles, then one push still harden base to 53.2. | `utilities/citizenMemory.js:78`, `:85`, `:93`, `:153`; attached `streak`. Coverage and log volume are accidentally personality accelerators. |
| D7 | Reinforcement direction comes from the new delta, but hardening uses the whole residual mood. Probe effects -20,+1,+1,+1 on composure harden base 50→43.2 when the positive streak completes. | `citizenMemory.js:84`, `:93`; attached `hardeningDirection`. The numbers are synthetic stress input; the sign mismatch is actual helper behavior. |
| D8 | Edge damping acts on base only; base+mood still clamps at 100. One Community-sized sociability push per Cycle pins current sociability at Cycle 38. Reflections bypass edge damping entirely and can clamp base to 100. | `citizenMemory.js:72`, `:95`, `:144`; attached `pin`, `reflectionPin`. This is a long-horizon mechanism test, not a claimed live event rate. |
| D9 | A Cycle-only watermark drops late entries at an already-folded Cycle. The actual compressor folds C106 Neighborhood, then ignores a later-arriving C106 Promotion at C107: drive remains 50 with zero mood. | `compressLifeHistory.js:511`, `:516`, `:1462`; attached `lateArrival`. Exposure to real external late writers needs a follow-up writer audit; the lost-input condition itself is reproduced. Wake reflections use a separate drain, so this is not a claim that every cron reflection is lost. |
| D10 | Mood settlement is once per call, not once per Cycle. Two calls at the same Cycle change mood 10→8→6.4. An eleven-Cycle jump decays only once to 8. | `compressLifeHistory.js:529`, `:542`; `citizenMemory.js:153`; attached `settle`. Normal uninterrupted one-call-per-Cycle operation does not trigger the rerun defect. |
| D11 | Pressure has one global slot per citizen and no persisted cause identity. Rent history makes a citizen's first unemployment event Strain rather than Stumble. A prior hood/rent pressure claim can suppress the explicitly non-adapting overwork path. | `citizenDialMap.js:299`, `:314`, `:341`, `:345`; `runCareerEngine.js:983`; attached `pressure`. Source-order priority substitutes for a model of multiple experiences. |
| D12 | Adaptation reads the presence of pressure text, not whether the condition cleared. Continuous rent emits six times, skips Cycle 7, then restarts at 8; it skips again at 14. The silent Cycle manufactures its own reset. | `citizenDialMap.js:323`, `:345`; attached 15-Cycle pressure trace. Neighborhood adaptation also falls through to the ordinary positive line when the helper returns null (`runNeighborhoodEngine.js:539–565`). |
| D13 | Conduct cannot ordinarily erode a neutral citizen's integrity. Commit is gated on already-low integrity; a neutral citizen resolves every test as Resisted, which raises integrity. Burnout requires integrity already below 40. | `runConductEngine.js:201–215`; `compressLifeHistory.js:1177`; `citizenDialMap.js:88–91`. This is a reachable-path design gap, not a request to turn stress or poverty directly into corruption. |
| D14 | The universal event participation multiplier favors drive/outabout/sociability before choosing the event. The same traits are weighted again in event selection, and the cadence-lagged archetype also multiplies categories. | `generateCitizensEvents.js:2222`, `:2875`, `:2893`. High versus neutral is at most 1.5× from the participation term alone; the old plan's “3× neutral” claim compares the high and low extremes instead. |

## Proposed model: the same world, different responses

Every living ledger citizen receives a per-Cycle **evaluation** of applicable conditions, even without a voice wake, tracked employer or non-neutral dials. Evaluation is not a requirement to emit eight events or move every dial every Cycle. A quiet citizen may remain unchanged. Coverage is evaluated across ClockModes, tiers, ages, retired citizens, and health statuses; employment-specific choices keep their existing eligibility contracts.

Keep three stages explicit:

1. **Exposure:** read the actual employer/household/member/bond/neighborhood relationship. Citywide conditions set the background, while exposure and buffering are personal. A layoff or rent squeeze does not disappear because the citizen is composed or reserved.
2. **Response:** choose among causally available responses using existing bands, posture, relationships, recent experience and seeded chance. Two initially identical citizens under genuinely identical evidence can remain alike; randomness enters at meaningful response/outcome draws, not as POPID-derived trait drift.
3. **Consequence:** the responsible domain engine owns material changes. A changed employer, missed opportunity or maintained bond then supplies a signed experience to the fold. The dial accumulator never invents a hiring, death, relationship, payment or historical event.

For example, the same recorded layoff can produce job-search persistence for a citizen with a maintained mentorship, retraining for someone with an available education route, or withdrawal after repeated failed applications. Those are proposed **available response rules**, not a claim that anyone in the live city did these things. A supportive household can buffer composure without erasing the lost job. Losing composure need not automatically lower drive and sociability: a driven, social, volatile citizen is a coherent distinct character with costs.

### Initial eight-dial response matrix for review

The response labels below are proposed engine vocabulary, never backfilled canon. Ordinary response delta starts at **+1 or -1 on the named axis**, before severity/adaptation/edge handling. Existing major-event magnitudes remain separately identifiable for calibration. Side effects must be named explicitly, not inherited from a broad domain tag.

| Dial | Positive experience | Negative experience | Existing facts that can make it available | Next-Cycle consequence to prove |
|---|---|---|---|---|
| drive | GoalProgress | GoalBlocked | Hire/promotion/training outcome; repeated verified unsuccessful job search; personal maneuver goal | Career response weights and tied job-slot contest |
| sociability | ConnectionMaintained | ConnectionWithdrawn | Maintained named bond or reciprocal interaction; repeated failed contact or a known counterpart's departure | Contact choice and relationship-event weights |
| warmth | TrustExtended | TrustGuarded | Actual support or reconciliation; betrayal/conflict outcome involving an existing counterpart | Bond maintenance, not automatic marriage |
| openness | RoutineExpanded | RoutineRetrenched | Available education/field-change response; failed experiment or recorded retreat into familiar activity | Learning/field-change willingness and elective relocation |
| composure | PressureEased | PressureBorne | Rent burden, debt service, job status, recovery and an actual cleared episode | Stress response and burnout eligibility |
| integrity | BoundaryKept | BoundaryCompromised | A resolved ordinary temptation or costly obligation; agent's own act, not neighborhood, income or victimization alone | Subsequent conduct resolution and existing integrity gates |
| family | HouseholdEngaged | HouseholdDisengaged | Existing household membership, time/attention choices, maintained care or repeated competing obligations | Household choices and maintenance of established relationships |
| outabout | ActivityExpanded | ActivityCurtailed | Actual attendance/errand response, health limitation, accessible neighborhood activity, affordability | Attendance and travel pool weights |

Cases are scoped. Children get age-appropriate learning/social/family responses, not job-loss or adult conduct tests. Retired and SELF_EMPLOYED/UNTRACKED citizens still have applicable city, household, health and neighborhood experiences. Unknown workplace data is unknown, not a fictional failing employer. Friendship departure may affect connection; leaving a faith organization must not automatically mean diminished kindness.

### Sources, joins and when they are read

| Input | Existing carrier | Proposed use and constraint |
|---|---|---|
| City conditions | `S.economicMood`, `S.cityDynamics`, weather and recorded world events already read by `generateCitizensEvents_` | Scale relevant opportunities/pressures. Do not give every citizen the same signed nudge. Do not restore the independently gated sports-atmosphere path inside this change. |
| Neighborhood | `S.neighborhoodState[Neighborhood]`: housingPressure, crimeIndex, retailVitality, eventAttractiveness, sentiment, noiseIndex | Use the persisted opening snapshot (`loadNeighborhoodState.js:118`), not the same-Cycle pulse created by these citizens. Compare changes to the citizen's stored previous observation; never rank half the city “bad” merely to manufacture negative counts. |
| Workplace | `EmployerBizId` joined to Business_Ledger BIZ_ID; Growth_Rate, status/revenue signals; role/current field and YearsInCareer | Reuse the domain's economic logic and event outcomes. Job/pay must not be assigned by neighborhood (§14). Preserve the existing current-field/trained-field distinction. |
| Household | HouseholdId and existing household members; actual rent burden, income buffer and family links | Individual exposure and available support/obligations. Missing relations never get invented. |
| Relationships | Loaded Relationship_Bonds, actual status/intensity changes, counterpart ledger state | Use named maintained bonds, not an unrelated citizen's event or narrative proximity. Existing grief register remains the source for grief; avoid a second bereavement penalty. |
| Personal state | Status/HealthCause, maneuver, dial bands, recent source episodes | Determine available responses and duration. Existing canonical status helpers define living/age eligibility; do not introduce a new `Status === 'Active'` exclusion. |

Freeze the dial read view for a Cycle before the first consumer; write the new dial state in Phase 9 for C+1. Keep same-Cycle material world changes visible to their domain consumers. Chaos's existing direct base mutation needs an explicit scheduling decision: recommend include it only in the next frozen dial view, retaining same-Cycle health/world effects. This changes an existing seam and requires approval, not a silent cache patch.

### Cycle and persistence rules

**One delivery path.** Add a small shared experience helper used by the repaired producers to append the actual tagged LifeHistory line and queue its LifeHistory_Log record together. A new `sourceRef` identifies the domain event/episode, citizen and Cycle; keep it on the transient descriptor and persist it with the Phase-9 receipt keyed to the canonical line. Keep the existing seven-column log and ordinary stamped-line format. Return the same event to both sinks; reject an invalid tag or missing mandatory source visibly. Do not drain the entire append-only log again into the dials.

**Identity of an event differs from its date.** Retain `folded` for legacy compatibility; add receipts for stamped entries in the retained raw window. For legacy stamped text, key by normalized Cycle, tag, full text and occurrence ordinal. New producers supply their stable source reference. On each fold, process unseen receipts even if their origin Cycle <= folded; do not rewind the citizen or decay to their historical date. Duplicate delivery is not a second experience. Identical but independently resolved events need distinct source references.

**Migration is additive.** At activation, initialize receipts for retained entries at/below the old watermark as already processed; preserve base, mood, maneuver, chaos and unknown fields. This intentionally cannot reconstruct previously dropped late entries. Repairing historical losses requires separate evidence and authorization. Keep unstamped legacy trim behavior until an explicit migration is approved. Prune receipts only with the corresponding raw entries; validate their cell-size budget before bench.

**Settle time explicitly.** Proposed `DialState.experience.settledThrough` stores the last settled absolute Cycle. At C, settle only the positive elapsed gap, reproducing one-step settlement including the small-mood threshold. Re-entry at C must neither decay twice nor advance reinforcement twice. For old rows without this value, settle once at first activation, then persist C; never guess how many Cycles the old base has been idle.

**Reinforce experience across Cycles.** Collect per-axis net signed evidence for the Cycle, retaining each contributing cause. Count at most one reinforcement step per axis per Cycle. Proposed default: harden after three consecutive experienced Cycles with the same net direction; zero/absent/opposite evidence breaks that sequence. Hardening uses evidence accumulated in that sequence, not opposite-signed residual mood. Reflection direct-base accretion remains a distinct small pathway, but shares the bounded update and per-Cycle budget.

**Track the cause, not the text frequency.** Store bounded per-citizen episodes in `DialState.experience.causes`: sourceRef, origin/source kind, start/last observed Cycle, observed intensity, response, and current adapted contribution. Persistent exposure approaches a bounded cause-specific mood contribution instead of re-emitting a fresh fixed loss forever. A silent narrative Cycle is not recovery. A real condition change/clearance creates an explicit relief transition. Overwork remains non-adapting by the existing ruling, but cannot be suppressed by a different cause's text slot.

**Cap combined influence without erasing causes.** Proposed bench-start settings: ordinary contribution per source <=1 point/axis/Cycle; ordinary total <=2 points/axis/Cycle; all objective effects combined <=12 points/axis/Cycle; reflection contribution <=1 point/axis/Cycle. Preserve causal event records even when their accumulator contribution hits a cap. Exact cap values are proposals, not measurements or approved config. They belong in World_Config with required finite/range checks. Retain major event priority before limiting ordinary texture.

**Bound both base and current.** Apply diminishing room to signed changes in the effective value as well as baseline. A candidate symmetric update is `step(x,d) = x + (100-x)*(1-exp(-d/50))` for positive d, and `x - x*(1-exp(d/50))` for negative d. At neutral it approximates the requested nudge; at the edge it preserves inward recovery. Store full precision. When hardening reallocates part of a swing to base, offset mood to avoid charging the current value twice. Test direction, conservation and long-horizon behavior before selecting this candidate; a clamp to 1/99 is not the repair. No formula replaces the proof against existing and new pins.

**No automatic personality coupling.** Do not force low composure to drag all seven other dials down. Couple them through choices: stress can reduce available activity, drive can sustain costly overwork, and existing support can preserve warmth. Neglect remains a later background contribution based on absence of relevant lived activity, not absence of paid cron attention. Its all-dial rate/target remains unapproved in the owning plan; this proposal does not silently resolve it.

### Contract changes requiring approval

1. Replace the universal positive fallback for **new** producer events with explicit signed routing. Preserve legacy interpretation until migration is approved. A new unresolved event should fail validation visibly, not reward composure or disappear. For an explicitly neutral observed condition, no personality movement is legitimate; this narrows the older “every logged event MUST move a dial” rule (`citizenDialMap.js:4`, `ENGINE_COUPLING_MAP` spine). Claude must approve and update that contract before implementation.
2. Add the proposed `DialState.experience` envelope and transient `S.citizenExperienceCauses` collection. Existing fields/readers must round-trip; no new Sheet column or tab is proposed. Decide the bounded cause/receipt capacity from measured cell sizes before write code lands.
3. Introduce **ordinary moral compromise** as an outcome of a real opportunity for otherwise-neutral citizens; retain existing serious/grave crime gates. Recommended: reserve a mild non-criminal BoundaryCompromised response with integrity -1, then let repeated conduct reach existing bands. Integrity +1 comes from an actual resisted opportunity/costly obligation. Do not grant free integrity for merely being evaluated.
4. Use one opening dial view and let new dispositions influence C+1. Confirm the chaos exception's scheduling above. Keep existing outcome gates and contested-resource dice; do not convert every generator into an all-citizen lottery or widen job eligibility.
5. Approve the eight response directions, accumulator candidate and initial caps as **bench candidates**. Calibration remains a required result, not permission to mutate live citizens to hit a population distribution.

## Proposed implementation tasks

Each task begins only after approval. New file names below are proposed code surfaces, not files created by this review. Engine-sheet lands substrate changes. A task that exposes a different domain's broken contract stops that cut and records the dependency.

### A1 — Lock the failed cases into executable regression tests
- **Files:** `scripts/citizenDialMultiCycle.test.js`, `scripts/compressLifeHistory.dial.test.js`, `scripts/pressureTags.test.js`, `scripts/employerSuccess.test.js`.
- **Steps:** Port the attached probes with expected corrected results. Use real C/Y-C stamps, run every consecutive Cycle without forceAll, and test base+mood plus consumer bands. Add producer→LifeHistory→fold assertions to employment tests.
- **Verify:** Each new assertion fails against pre-fix code for the named reason; existing suites still establish their baseline. Separate test groups allow each repair to be demonstrated independently.
- **Status:** [ ] not started.

### A2 — Deliver the missing workplace events
- **Files:** `utilities/citizenExperience.js` (new shared append helper), `phase05-citizens/runCareerEngine.js`, `scripts/employerSuccess.test.js`.
- **Steps:** Route employer-success layoff, reconciliation layoff, hire and field-change outcomes to both existing history sinks once. Preserve income/employer outcomes, tags and eligibility. Do not change unemployment semantics in this patch.
- **Verify:** Run the actual producer with deterministic in-memory business/ledger fixtures; exactly one matching event in each sink, and a C+1 fold consumes it once. Add full runCareerEngine coverage for the nested hire/reconciliation sites.
- **Status:** [ ] not started.

### A3 — Make delivery receipts and settlement Cycle-aware
- **Files:** `utilities/compressLifeHistory.js`, `utilities/citizenMemory.js`; A1 tests.
- **Steps:** Implement additive receipts, settledThrough and migration rules above. Preserve unknown fields through deserialization/serialization, trimming, maneuver and chaos writers. Reject malformed existing machine state visibly without replacing it with neutral identity.
- **Verify:** Same-Cycle rerun is stable; a new late same-Cycle event folds exactly once; C jumps equal repeated settlement; legacy initialization and trim do not replay old history; future-dated entries do not advance the receipt watermark prematurely.
- **Status:** [ ] not started.

### A4 — Reinforce per Cycle and bound every entry path
- **Files:** `utilities/citizenMemory.js`, `utilities/compressLifeHistory.js`, A1 tests.
- **Steps:** Implement per-Cycle evidence batches and distinct-Cycle streaks, then the reviewed current/base update and reflection budget. Keep signed response provenance through netting; do not harden opposite residual mood.
- **Verify:** Three same-Cycle events do not create a three-Cycle habit; a long quiet gap breaks reinforcement; evidence sign controls hardening; no new current/base pins across 120 synthetic Cycles; opposite evidence recovers pre-existing extremes. Test reversed producer order.
- **Status:** [ ] not started.

### B1 — Preserve event outcome in routing
- **Files:** `utilities/citizenDialMap.js`, `utilities/citizenExperience.js`, `phase05-citizens/bondEngine.js`, `scripts/citizenDials.test.js`.
- **Steps:** Implement the approved explicit response mappings; separate Faith join/departure and Bond support/conflict emitters by resolved outcome. New events cannot fall through to DEFAULT_AMBIENT. Keep the legacy interpretation versioned.
- **Verify:** Departure/conflict cannot become a generic benefit; source-only prose changes do not alter an explicit event's effects. Unknown new vocabulary fails validation visibly. No changes to published narrative or backdated history.
- **Status:** [ ] not started.

### B2 — Resolve unemployment from recorded work state
- **Files:** `phase05-citizens/runCareerEngine.js`, `utilities/citizenExperience.js`; employment tests.
- **Steps:** Use a recorded layoff/hire episode and current employer state to determine continuing joblessness. Income is buffering/severity, not the Boolean definition of employment. Preserve SELF_EMPLOYED/UNTRACKED and existing job-matching gates.
- **Verify:** A laid-off positive-income citizen can experience unemployment; rehiring clears it; a self-employed earner does not. Record any need for a new work-state carrier as an approval amendment before implementing it.
- **Status:** [ ] not started.

### B3 — Collect multiple causes without producer-order priority
- **Files:** `utilities/citizenDialMap.js`, `utilities/citizenExperience.js`, `phase05-citizens/runNeighborhoodEngine.js`, `phase05-citizens/runCareerEngine.js`, `phase05-citizens/migrationTrackingEngine.js`, `phase05-citizens/generationalWealthEngine.js`.
- **Steps:** Replace first-writer pressure exclusion with per-source collection and deduplication. Distinguish overlapping rent/hood exposure from independent unemployment, debt and overwork. Resolve the capped contributions once; adaptation uses actual continuing conditions.
- **Verify:** Swap producer order with identical inputs and obtain identical resolved evidence. A rent claim cannot erase overwork. Continuous pressure does not generate a periodic false recovery; actual relief does not become an always-on positive drip.
- **Status:** [ ] not started.

### B4 — Evaluate personal exposure across the living ledger
- **Files:** `phase05-citizens/citizenExperienceEngine.js` (new), `utilities/citizenExperience.js`, `phase01-config/godWorldEngine2.js` (both entrypoints), `phase01-config/engine94SheetContract.js` and its existing ensure-call site.
- **Steps:** One evaluation after Phase5-MigrationTracking and before Phase6 processing, using the source table above and indexed joins. Produce only applicable evidence/response candidates. Require config keys; no per-citizen Sheet/API reads. Bound episodes and retain observed source values.
- **Verify:** Synthetic same-citizen counterfactuals differ when employer/hood/household evidence differs, including with no wake and no tracked employer. ClockMode/tier/age/retired/health cohorts show explicit evaluated/skipped reasons. Absent data yields unknown, not an invented adverse fact. Both engine entrypoints invoke the same seam once.
- **Status:** [ ] not started.

### B5 — Complete ordinary two-direction routes
- **Files:** `phase05-citizens/citizenExperienceEngine.js`, `phase05-citizens/runConductEngine.js`, `phase05-citizens/runHouseholdEngine.js`, `phase05-citizens/runRelationshipEngine.js`, `phase05-citizens/runEducationEngine.js`; focused producer tests.
- **Steps:** Implement the eight approved response pairs only at actually available domain opportunities. Each pair needs its own named source, eligibility and state consequence test. Existing bond/grief/education decisions remain load-bearing; do not fabricate support, training slots or family relationships to make a branch fire.
- **Verify:** Every axis has a reachable positive and negative producer path with nonzero seeded probability from admissible neutral starting state, plus a no-op when the prerequisite is absent. Integrity paths preserve serious/grave gates; family paths do not shortcut marriage. Split this task into one bounded producer patch per domain before assignment.
- **Status:** [ ] not started.

### C1 — Let dials choose responses without excluding exposure
- **Files:** `phase05-citizens/generateCitizensEvents.js`, `utilities/compressLifeHistory.js`, first dial-consumer call site in both engine entrypoints.
- **Steps:** Preserve actual household/workplace/world consequences regardless of activity roll. Keep optional activity weighting; consolidate duplicate category/archetype weighting so one dial contributes once per semantic choice. Freeze the agreed dial view; a cached miss must not mask valid source data.
- **Verify:** Same opportunity/seed with different bands produces the intended weight/outcome difference; all temperaments still receive the same unavoidable layoff/rent event. Duplicate category tags do not square the multiplier. Reordered reads return the same bands.
- **Status:** [ ] not started.

### C2 — Propagate the approved contract
- **Files:** `docs/SIMULATION_LEDGER.md`, `docs/SPREADSHEET.md`, `docs/engine/TAG_REGISTRY.md`, `docs/engine/ENGINE_COUPLING_MAP.md`, owning plan, `docs/index.md`; inspect `schemas/SCHEMA_HEADERS.md` pointers without changing headers for a JSON-only addition.
- **Steps:** Document the approved envelope, source/response distinction, reader timing, migration and neutral-event exception. Per AGENTS.md, assign this mechanical propagation to a cheap subagent; lead reviews the diff. Schema/control-plane edits require their own authorization. This review does not pre-apply those contract changes.
- **Verify:** Same approved change includes producer, parser, consumer, documentation and index updates; no isolated Markdown. Run the targeted suites and `node scripts/docLoopStatus.js --lint`; report pre-existing unrelated failures separately.
- **Status:** [ ] not started.

### C3 — Demonstrate lived divergence and obtain a deploy decision
- **Files:** Existing targeted tests plus a proposed offline `scripts/citizenExperienceMultiCycle.test.js`; owning plan evidence section. Bench procedure: [[reference/DEPLOY]].
- **Steps:** First prove repaired delivery/timing independently. Then bench the signed feed plus accumulator together on a verified matched snapshot. Prove consumer-weight changes separately afterward. No unrelated sports/civic/education wave during the comparison. Use a dedicated seeded response stream so adding response draws does not shift every unrelated engine draw. Engine-sheet owns deployment and state recovery decisions.
- **Verify:** Meet the acceptance block below, then present the exact source diff, migration effects and bench evidence for the builder's separate live deployment/fire approval.
- **Status:** [ ] not started.

## Acceptance: differences must reach a later fate

1. **Delivery:** Actual hire, layoff, failed-search, relief and relationship-response producers deliver to both sinks and fold once, including late arrival and rerun cases. Tests must fail on current code; a map-only test does not count as producer proof.
2. **Persistence:** A changed state survives serialize→fresh context→next Cycle. Baseline is never reseeded to 50; unknown fields survive; mood settles with elapsed Cycles; receipts remain within measured Sheet cell limits.
3. **All eight axes:** Reachable signed producer branches for every dial, demonstrated with admissible synthetic fixtures. Report which signs occurred in the matched 12-Cycle bench; missing actual opportunities are disclosed, not filled by synthetic canon.
4. **Character under common conditions:** At least four matched comparisons: same citizen/different employer; same job/different household buffer; same neighborhood/different maintained bond; same exposure/different starting bands. Record the source, response, dial change and actual subsequent choice/outcome for each. Test with wake input disabled.
5. **No universal immunity:** Low drive/sociability/outabout cannot exclude unavoidable exposure. Ordinary optional activities remain weighted. No blanket mapping of poor location, low wealth, illness or bereavement to corrupt integrity.
6. **Reach and concentration:** Report evaluation coverage, changed-vector share, band-vector concentration and within-neighborhood/within-employer diversity for the whole living population and the 707-snapshot outside-pool cohort. Report actual buildPool qualification separately. Do not maximize uniqueness by adding noise or lowering the wake gate.
7. **Bias and extremes:** Retain the owning plan's >=15% negative share measure with an explicit denominator: nonzero signed per-citizen/per-axis Cycle contributions after deduplication, before hardening. Also show positive/negative counts per dial/source so composure cannot hide missing axes. No new pins; identify the five historical pins separately, and require zero current-value pins at the 12-Cycle acceptance endpoint to satisfy engine.197. Failure stays failure; no automatic 1/99 clamping or quiet gate waiver.
8. **Durability of character:** In a 120-Cycle synthetic test, pressure has onset, duration, adaptation and genuine recovery. A single event fades; repeated experience hardens; changed circumstances can undo prior drift; quiet time does not erase the whole person or turn all citizens into a second identical group.
9. **Causally meaningful consumers:** At least one actual consumer outcome for each axis above changes under a controlled band intervention and seeded draw. Run existing contest/bond/grief/conduct gates; the two-reel GC family/marriage rules and contested-resource underdog chance remain intact.
10. **Operational proof:** Both entrypoint schedules agree, no Engine_Errors in the approved bench run, runtime and serialized-cell size measured, no unbounded source lists, no paid wake dependency. Do not claim deployment from a Git commit.

## Other defects and fragile code found along the path

These are discovery notes, not authorized side repairs or new rollout rows.

| ID | Finding | Disposition |
|---|---|---|
| X1 | `getCitizenDialBands_` caches null (`compressLifeHistory.js:1150–1157`); a later valid row override remains unread. Probe confirms. Also, citizenLookup wins over a fresher override. | Fold into C1's explicit snapshot contract; do not blindly invalidate caches mid-Cycle. |
| X2 | `parseDialState_` silently returns `{}` on malformed JSON (`:1224`), and later RMW serializes a neutral citizen. `deserialize_`/`serializeDialState_` preserve only selected known extensions. | A3 must preserve original invalid state and surface failure; round-trip every additive field. No live corruption was measured. |
| X3 | `citizenDialMultiCycle.test.js:54–81` supplies wall-clock-style legacy entries and forceAll at five-Cycle jumps; its bounds check examines base, not base+mood. It is green while missing D6–D10. | A1 replaces the misleading proving claim with real arrival/Cycle/consumer coverage. Keep separate legacy compatibility tests. |
| X4 | `scripts/employerSuccess.test.js:137–149` checks layoff log/income but not the citizen's LifeHistory; it therefore accepts D2. Other gate suites test helper arithmetic more than full call sites. | A1/A2 add end-to-end local producer assertions. Existing passing checks remain useful but are not broad proof. |
| X5 | Two manually duplicated schedules in `phase01-config/godWorldEngine2.js:348–387` and `:2093–2132` are a drift hazard. | Keep parity tests in C3; a full scheduler refactor is outside this plan. |
| X6 | `pressureBar_` rejects NaN but coerces blank/null to 0 and accepts Infinity (`citizenDialMap.js:331–334`). `loadNeighborhoodState_`'s numeric helper similarly turns blank cells into 0 (`:105–108`). | Explicit unknown/finite validation needed before B4 consumes these values. No blank live input incidence measured. |
| X7 | The new posture wake slot filters the already-filtered buildPool (`scripts/citizen-wake.js:190`; `wakePerception.js:401`). It cannot provide the “regardless of deviation” behavior promised in the old engine.180 plan. | Separate apparatus correction for Claude; do not alter scheduled cron code during this review. |
| X8 | `REFLECTION_INTAKE` applied acknowledgements and ledger dial writes are not atomic (`compressLifeHistory.js:579–590`). The file already documents a partial-commit replay window. | Known existing risk, not a new finding or solved by objective receipts. A broader exactly-once reflection transaction needs its own design. |
| X9 | The unemployment matcher returns early if Business_Ledger/SkillTags are unavailable (`runCareerEngine.js:1142–1161`), so its pressure emission disappears with the hiring subsystem. | B2/B4 separate observing known joblessness from whether hiring can run; do not invent missing work history. |
| X10 | `.githooks/pre-commit:73` checks `docs/engine/archive/ROLLOUT_PLAN.md`, while `docLoopStatus.js:32` reads the active `docs/engine/ROLLOUT_PLAN.md`. The active tracker has 17 oversized rows before this review. `--lint` deliberately exits 0. | Report for authorized hook owner; no hook edit/bypass. All 17 were item-length violations, not proof that their state tokens currently fail parsing. |

### Documentation contradictions requiring Claude reconciliation

- Owning inactivity plan says engine.197 blocks the 176–183 push; rollout opening says shipped. Several task checkboxes still say not started despite later build logs. This review makes no deployment decision from those stale instructions.
- Current `SESSION_CONTEXT.md` PIN retains an early “resync needed” clause and later states bench resynced at C106, C107 clean, PROD @76. `50a8538f` and `docs/reference/DEPLOY.md` record the newer rehearsal; this is documentary evidence, not our live verification. Do not repeat the 25-Cycle-drift requirement as if no resync occurred. Reconfirm bench identity/state before the approved proving run.
- `ENGINE_COUPLING_MAP` claims damping never pins, once-per-Cycle settlement, and universal event→dial delivery. D2/D8/D10 disprove those broad claims. It also carries obsolete conduct/reflection descriptions.
- Current code already has DIALS consolidated in `utilities/citizenMemory.js:33` and re-exported by `lib/citizenDials.js:12`. No second consolidation is needed. `engine.208` still says review pending, while the Codex handoff says accepted. Fandom as a ninth dial belongs to the sports plan and is not part of this eight-dial repair.

## Verified wiring card for this proposal

| Seam | Checked file:line | Why the plan depends on it |
|---|---|---|
| Canonical axes, bands, state update | `utilities/citizenMemory.js:33`, `:52`, `:78`, `:153`, `:206` | One dial definition; accumulation and serializer surface |
| Exact tag, legacy content, pressure emitter | `utilities/citizenDialMap.js:236`, `:262`, `:337` | Objective/subjective routing and current pressure priority |
| Persisted neighborhood inputs | `phase02-world-state/loadNeighborhoodState.js:53`, `:118` | Opening city-neighborhood exposure without same-Cycle pulse recursion |
| Shared ledger initialization | `phase01-config/initSimulationLedger.js:37` | Citizen rows are the shared in-memory source |
| Producer order | `phase01-config/godWorldEngine2.js:348`, `:357`, `:359`, `:371`, `:381`, `:387` | Hood before work before bonds/migration; current first-writer bias |
| Second schedule | `phase01-config/godWorldEngine2.js:2093`, `:2102`, `:2104`, `:2116`, `:2126`, `:2132` | Mirror any approved new phase in both runners |
| Objective fold and reflection drain | `utilities/compressLifeHistory.js:464`, `:516`, `:542`, `:585`, `:639` | Sole planned common accumulation point; preserves separate reflection path |
| Phase 9 invocation | `phase01-config/godWorldEngine2.js:536`, `:2274` | Disposition changes currently follow Phase-5 outcome rolls |
| Ledger persistence | `phase10-persistence/commitSimulationLedger.js:25`; `phase01-config/godWorldEngine2.js:586`, `:588`, `:2317`, `:2319` | RMW → range Intent → executor; an Intent alone is not a completed Sheet write |
| Existing dial consumers | `utilities/compressLifeHistory.js:1148`; `generateCitizensEvents.js:2222`, `:2893`; `runConductEngine.js:176`, `:203` under `phase05-citizens/` | Read-view and selection/commit seams |
| Node disposition and actual pool | `lib/citizenDials.js:34`; `lib/wakePerception.js:376–409` | Persisted state reaches voices; full pool has more filters than deviation |

Proposed, not existing: `S.citizenExperienceCauses` writers in B3/B4, a single resolver in the new experience phase, and persistence only through `DialState.experience` in Phase 9. Refresh the required wiring card for each actual engine patch; this review card does not authorize unknown consumers or schema changes discovered later.

## Reproduction and validation performed

From repository root:

```bash
node output/codex/dial-drift-review-20260913/probes.js
```

`probes.json` is the captured review result; `wiring-card.txt` is the unedited generated card. The probes deliberately report the current defects; they are not tests that assert the desired repaired behavior. All synthetic records are visibly NON-CANON and stay in memory. Snapshot joins execute no external reads. If the stable snapshot filename changes later, its hash identifies the difference.

Existing local suites run: `citizenDials` 38, `compressLifeHistory.dial` 49, `citizenDialMultiCycle` 15, `pressureTags` 41, `dialGates` 30, `contestRoll` 31, `conductEngine` 20 — **224 passed, 0 failed**. These passes do not invalidate the reproduced defects above. `node scripts/docLoopStatus.js --lint` reports **17 pre-existing oversized rows**; this package does not claim a clean global tracker or a newly filed implementation row.

## Review decisions requested

Approve or amend the five contract choices above, then authorize one bounded implementation cut at a time. Recommended first cut is **A1/A2: prove and repair missing workplace delivery**; it has a direct citizen consequence and preserves existing economic decisions. The broader all-dial feed waits for A3/A4 timing and accumulation correctness. Existing pressure semantics are replaced only with B3's causal bookkeeping ready. Final acceptance requires later outcomes, not merely a wider histogram.

## Changelog

- 2026-09-13 (codex) — Completed source review, historical pool reproduction, defect probes and proposed engine.201 repair sequence; submitted for Claude review, implementation unstarted.

## Final verification note — 2026-09-13 (codex)

The final tracker recheck at HEAD `d95f42d5` reports **19 oversized rows**, including engine.203 and infrastructure.9 beyond the 17 recorded at the initial read. This package does not modify the tracker. The attached probes reproduce their captured JSON exactly after filing; all proposal wikilinks resolve, the proposed replacement row has five cells and a 140-character description, and the diagnostic script passes `node --check`. Core source/snapshot hashes remain identical to the captured evidence.
