---
title: Care and justice citywide intake amendment — Claude review plan
created: 2026-09-28
updated: 2026-09-29
type: plan
tags: [engine, civic, citizens, draft]
sources:
  - Builder request 2026-09-28 — investigate judicial and hospital intake, include the wider city, present findings to Claude as a plan
  - docs/plans/2026-09-21-care-and-justice-system.md
  - phase04-events/chaosCarsEngine.js
  - phase04-events/generationalEventsEngine.js
  - phase10-persistence/buildCyclePacket.js
  - Haiku engine-wiring cards for Hospital_Ledger and writeCitizenEvent_, generated and source-verified 2026-09-28
pointers:
  - "[[plans/2026-09-21-care-and-justice-system]] — owning engine.254 plan; this is a proposed amendment"
  - "[[plans/2026-09-21-safety-lever]] — existing safety grading and deferred diversion measure"
  - "[[engine/ROLLOUT_PLAN]] — existing engine.254 row, review pointer only"
  - "[[for-claude-review/README]] — review inbox contract (accepted 2026-09-29, filed to research)"
  - "[[index]] — registration"
---

# Care and justice citywide intake amendment

**Goal:** Judicial and hospital systems persist classified intake, continuing cases/care, and outcomes for the wider simulated city while preserving the actual lives of tracked citizens within those totals.

**Architecture:** Retain individual hospital admissions and add the already-approved judicial case ledger. A condition-driven service calculation supplies other residents' intake; a separate census table records totals by Cycle, system, geographic scope, and intake type. Each named admission/case contributes once to that accounting, with linked transfers and an explicit population basis.

**Author:** codex. **Reviewers:** research-build for the proposed contract and builder decisions; engine-sheet for execution order, persistence, and implementation feasibility. These are reviewer identities, not roles held by Codex.

**Status:** Complete review proposal; implementation not started. The builder authorized analysis, external Haiku wiring cards, and this filing. The proposed accounting and unresolved simulation choices below are not additional approved rulings or deployment authorization.

**Requested review:** Accept, amend, or return this amendment to engine.254. Reconcile it into the owning plan before an implementation cut, preserving one authoritative specification. The existing rollout state describes the prior approved scope; adding this review pointer does not approve this amendment. Only Claude moves this inbox file after review.

## Existing authority and scope

The closing section of [[plans/2026-09-21-care-and-justice-system]] records the builder's 2026-09-26 rulings: arrest changes Status to `detained`; the outcome split is released 40%, diverted to OARI/treatment 25%, held 35%; OARI substance intervention receives a real hospital bed; de-escalation and welfare checks remain history entries without an admission. The plan also records approval of a condition-driven service layer on 2026-09-21.

Those rulings are retained. Judges as authored personas, jury-duty promotion, and precedent remain later work. A ledger and its lifecycle do not by themselves implement a complete court system.

The interpretation proposed for the builder's wider-city requirement is: citywide intake includes both tracked citizens and other residents, with tracked citizens counted exactly once. The clarification question was not separately answered; Claude should confirm this interpretation before adopting the accounting contract. No unnamed resident needs a fabricated POPID, name, or individual history.

## Verified current behavior

All code observations below concern the inspected repository. No live Sheet read, engine Cycle, deployment, or canon write was performed for this analysis.

| Producer | Actual effect | Boundary |
|---|---|---|
| Chaos Cars `arrested` | Citizen history/dials and `CITIZEN_ARRESTED` hook | No detention mutation or judicial record: `phase04-events/chaosCarsEngine.js:366` |
| Ambulance `medical_emergency` / `workplace_accident` | Eligible citizen becomes `critical` / `hospitalized` | Writes Status, not `hospitalEvents`; later lifecycle/reconciliation supplies the care record: `phase04-events/chaosCarsEngine.js:342`, `phase10-persistence/buildCyclePacket.js:975` |
| Ambulance `minor_injury` | History/dial effect | No Status change in this helper: `utilities/chaosCarsConfig.js:207`, `phase04-events/chaosCarsEngine.js:342` |
| OARI `substance_intervention` / `deescalated` | History and intervention hook | No bed, case, or persisted diversion receipt: `phase04-events/chaosCarsEngine.js:373` |
| Ordinary health events | Neighborhood illness and citizen conditions influence incidence/severity; eligible events enter care | `phase04-events/generationalEventsEngine.js:1307`, `:639` |
| Heat wave | Vulnerable eligible citizens can enter hospital care | `phase04-events/generationalEventsEngine.js:263`, `:315` |
| Citizen conduct | Serious/grave transgression hook and neighborhood pulse | No investigation or case: `phase05-citizens/runConductEngine.js:308`, `:321`, `:342` |
| Crime metrics | Neighborhood incident estimates, reporting, clearance, and enforcement pressure | Aggregate conditions do not identify a defendant: `phase03-population/updateCrimeMetrics.js:640` |
| Fire engine | Business/neighborhood consequences | No citizen injury assignment: `utilities/chaosCarsConfig.js:191` |

Citizen-target eligibility matters: Chaos Cars excludes deceased, inactive, traded, and pending rows; minors cannot draw arrest; workplace accidents require working life-state. Ambulance Status changes currently accept blank/active/recovering only, excluding retired citizens. Preserve these existing behaviors unless the builder explicitly changes them (`phase04-events/chaosCarsEngine.js:91`, `:156`, `:348`).

### Hospital accounting defects

1. **Population coverage:** `persistHospitalLedger_` only consumes named events and tracked ledger statuses. It has no other-resident intake generator (`phase10-persistence/buildCyclePacket.js:819`). The local C109 export had three historical admission rows, one open; its world summary presented one in care at 1% load alongside population 394,014 (`output/beats/Hospital_Ledger.jsonl`, `output/beats/meta.json`, `output/world_summary_c109.md:10`). These are dated local observations, not a fresh live census.
2. **Care versus bed:** open states include injured, recovering, and serious-condition as well as hospitalized/critical (`phase10-persistence/buildCyclePacket.js:811`). Calling all of them occupied beds is the current behavior, not a settled model for the amendment.
3. **Missing intake count:** missed-admission reconciliation appends an admission and increments `missedAdmitsReconciled`, not `admitsThisCycle` (`phase10-persistence/buildCyclePacket.js:975`, `:985`, `:993`). The amendment must distinguish a genuine same-Cycle intake from a historical record repair.
4. **Duration:** the writer stores `CyclesInCare` on closure; an ongoing row can retain blank duration (`phase10-persistence/buildCyclePacket.js:895`, `:903`, `:980`). Consumers sometimes derive elapsed time themselves.
5. **No typed attribution:** the 11-column hospital schema has free-text Cause, but no IntakeType or SourceEvent (`schemas/SCHEMA_HEADERS.md:832`). Do not retrospectively infer diagnoses from prose to populate a new type.
6. **Unsafe summary row:** the writer indexes any blank-DischargeCycle row as an open admission, including a blank-POPID summary row (`phase10-persistence/buildCyclePacket.js:868`). World-summary readers require POPID and would discard that same row (`scripts/buildWorldSummary.js:1357`). A dedicated census tab avoids this disagreement.
7. **Feedback scale:** Phase 3 counts previous persisted open rows and compares weighted load against hospital capacity to raise city illness (`phase03-population/applyDemographicDrift.js:225`). Replacing a small tracked count with citywide occupancy without recalibrating this contract would create a large unintended illness shock.
8. **False admissions channel:** `compactHospitalEvents_` retains any transition, strips its type, and caps the list at 12; crisis detection counts those entries as hospitalizations (`phase09-digest/finalizeCycleState.js:295`, `phase03-population/generateCrisisBuckets.js:265`, `:309`). Recovery/discharge and internal care transitions can therefore contribute to the hospitalization-cluster channel. A census must not reuse that count.

The C109 local Neighborhood_Demographics export totals 43,281 residents across 22 rows, with 1,944 Sick. The city summary population is 394,014. The demographic engine itself explicitly distinguishes represented-table population from city population (`phase03-population/updateNeighborhoodDemographics.js:118`). Do not sum that table and relabel it the entire city, or equate Sick prevalence with new hospital admissions.

## Proposed accounting contract — for review

### Individual records and shared event identity

Retain Hospital_Ledger admission records and the owning plan's Judicial_Ledger case records. Add structured intake classification and immutable event attribution as approved schema extensions. Proposed logical fields are `IntakeType`, `SourceEventId`, `SourceSystem`, and a transfer link; these are proposals, not existing columns. Keep Cause/ChargeCause as descriptive text, not the key used to count intake types.

An event's source (ambulance, OARI, ordinary illness, conduct) is a different dimension from its intake type or disposition. A release is a disposition, not another intake. An arrest does not establish a charge or conviction. Preserve the existing arrest dial effect pending a separate builder ruling; do not expand that effect into an automatic guilt determination.

One stable event key is reused across the originating event, admission/case, transfer, and census contribution. Reprocessing the same key must not create a second intake. A later distinct admission must remain possible for the same POPID. Reconciliation of an older missing row is recorded as a correction, not a new arrival today.

### Census rows

Proposed new tab name: `Care_Justice_Census`, subject to Claude/schema review. One row per `Cycle + System + GeographicScope + IntakeType`. Logical fields:

| Field group | Proposed contents |
|---|---|
| Identity | Cycle, System, GeographicScope, Neighborhood where applicable, IntakeType |
| Coverage | PopulationBasis, CoveredPopulation, coverage/method version |
| Intake | TotalIntakes, TrackedIntakes, OtherResidentIntakes |
| Continuing load | OpeningOccupancy, ClosingOccupancy, corresponding tracked/other-resident split |
| Movement | TransfersIn, TransfersOut, exits by disposition, explicit correction count |
| Attribution | SourceCycle, method version, contributing-event receipt reference, completeness state |

The aggregate fields hold numbers, never fabricated citizens. City rows are derived rollups over disjoint accounting scopes; consumers select a scope instead of summing city and neighborhood rows together. How the unrepresented city population is allocated remains a decision gate below; it must not become an invented neighborhood.

Invariants:

- `TotalIntakes = TrackedIntakes + OtherResidentIntakes` for the same unit, scope, type, and Cycle.
- `ClosingOccupancy = OpeningOccupancy + admissions + transfersIn - exits - transfersOut + explicitCorrections`. Admissions exclude transfers already included in transfersIn. Within-system transfers net to zero at system scope.
- A judicial-to-hospital transfer is linked: it changes each system's records without inventing a second person. Counting service episodes across systems is distinct from counting unique people.
- New case intake, people currently held, and unresolved cases are distinct judicial counts. Hospital encounters, admitted patients, and occupied beds are distinct health counts. The selected occupancy measure must be named.
- Known zero is persisted as zero. Missing/invalid source data is unavailable, not zero. Do not produce a partial city total labelled complete.
- Replaying an already-persisted Cycle/event key cannot duplicate intake, transitions, or initiative credit. A partially persisted Cycle is marked incomplete until reconciled; Sheets writes are not assumed transactional.

### Conditions, capacity, and OARI

The condition-driven layer generates other-resident intake from an explicit population basis and configured rates influenced by the sim's actual health/crime conditions. Named events contribute their own episodes once; no multiplier turns a random named accident into thousands of admissions. Neighborhood differences must come from established inputs, with conservative aggregation across the represented and unrepresented population.

OARI eligibility and response capacity read the actual initiative, deployment phase, and served neighborhoods. No service credit comes merely from an OARI story hook. Persist eligible calls, responder, outcome, and initiative attribution so a diversion measure has a denominator and proof. Do not infer the counterfactual "would otherwise have been arrested" from a successful intervention alone. The existing safety lever and its grading remain governed by their own plan until the builder approves a replacement measure.

Hospital feedback must read a count and capacity expressed in the same units and population scope. Crime incident estimates are not automatically arrests, and clearance is not a conviction probability. Numeric call-volume rates, admission probabilities, capacity, detention duration, and diversion eligibility need explicit rulings and fixed-seed bench predictions before activation.

## Review decisions that gate implementation

This is a completed review submission, not a claim that these behavior choices have been decided. Claude should return concrete recommendations for builder judgment, then incorporate the rulings into the owning plan.

| Gate | Decision needed | Recommended direction / boundary | Status |
|---|---|---|---|
| R1 — coverage | Confirm full-city accounting and how World_Population and represented neighborhood population reconcile | Named citizens are included once; allocate other-resident exposure explicitly, without inventing neighborhood population values | **RULED (rb, 2026-09-28) — architectural, consistent with the ledger-is-tracked-subset doctrine.** Contract adopted as proposed. Also confirms the "citywide intake" interpretation in §Existing authority and scope — that reading is correct, no separate answer needed from the builder. |
| R2 — intake and occupancy | Approve type taxonomy, illness-to-admission model, other-resident rates, and meaning of a hospital bed | Separate care/encounter from inpatient occupancy; do not silently reclassify existing injured/recovering records | **RULED (builder, 2026-09-28): beds = inpatients only.** Only hospitalized and critical occupy beds; injured and recovering are care visits, not beds. "The hospital is full" = inpatient beds near capacity (other-resident admissions from each hood's illness rate) |
| R3 — judicial progression | Decision timing, held duration, release/transfer progression, repeated cases, and applicable population | Keep the approved 40/25/35 outcome split; it does not specify any of these durations or procedures | **RULED (builder, 2026-09-28): decided next week, held 1–4.** The outcome (40/25/35) lands the Cycle after the arrest; held = 1–4 Cycles scaled by charge gravity; release restores the prior life-state (R4 precedence); a second arrest within a sim year raises the held odds |
| R4 — overlapping states | A citizen can need care while detained; release must restore an appropriate prior life-state | Preserve independent custody/care records and explicit Status precedence; no blanket release-to-active that erases retirement/illness | **RULED (rb, 2026-09-28) — correctness requirement, not a taste call.** Contract adopted as proposed; Task 6 implements the explicit precedence order. |
| R5 — pathways and initiative proof | Which typed events can create calls, admissions, or cases; OARI eligibility and diversion denominator | Direct arrest is the first judicial entry; other misconduct needs an explicit investigation/response rule, never narrative keyword matching | **RULED (builder, 2026-09-28): patrol arrests + investigated conduct.** A patrol-car `arrested` outcome opens a case; a grave conduct transgression opens an investigation with a set chance (World_Config rate) of becoming an arrest; OARI de-escalations count as diversions against those arrests (OARI grading denominator). Crime-metric aggregates never name a defendant |
| R6 — feedback and compatibility | Scope-matched capacity, growth/rounding behavior, historical classification, failure/replay behavior | No citywide feedback switch until same-scale numerators/denominators and persistence receipts are bench-proven | **RULED (rb, 2026-09-28) — engineering gate.** Contract adopted as proposed; Task 11 bench-proof is the enforcement point, not a separate ruling. |

## Acceptance criteria

1. A typed Chaos Cars arrest produces one linked case, an approved detention outcome, and persistent consequences visible to the relevant citizen engines across Cycles.
2. An ambulance admission and an OARI treatment admission each produce one linked care record and one appropriate intake contribution. Non-admission interactions remain distinguishable.
3. With zero named admissions but nonzero approved other-resident demand, the census records that demand; adding a named admission changes the appropriate total once.
4. Per-type and per-scope totals reconcile to the tracked/other-resident split and occupancy movement equations. Missing source data is distinguishable from zero.
5. Recovery, internal care transition, reconciliation, and transfer cannot masquerade as unrelated new admissions. Existing hospital counts are repaired without fabricated historical intake types.
6. Detention plus illness and release plus retirement preserve both histories and the approved participation rules. Repeat cases/admissions retain unique identity.
7. Counts survive the next Cycle, reader exports agree on scope and capacity, and retry/partial persistence creates no duplicate intake or initiative credit.
8. Paired sandbox runs predict and verify citizen consequences, other-resident totals, capacity feedback, and OARI eligibility. Bench success is reported separately from live activation.

## Tasks

Each item is a bounded review or implementation cut. Implementation tasks require the cited rulings and engine-sheet ownership; the filing itself authorizes no substrate edit. If a cut cannot fit a focused unit, engine-sheet splits it before coding rather than landing the whole system at once.

### Task 1 — reconcile authority and decide the amendment

- **Files:** owning care-and-justice plan; this review; `docs/engine/ROLLOUT_PLAN.md`; `docs/index.md`.
- **Steps:** Check the drift inventory below; resolve R1-R6 with the builder; merge accepted decisions into the owning plan and keep one specification. Repoint this review when Claude moves it.
- **Verify:** Each gate has an explicit decision and owner; `node scripts/docLoopStatus.js --lint` is clean.
- **Status:** [x] R1–R6 all ruled 2026-09-28 — R1/R4/R6 by research-build (architectural/correctness), R2/R3/R5 by the builder (see gate table). Task 2 unblocked; merge into the owning plan at the first build cut.

### Task 2 — define receipt and census schema

- **Files:** `schemas/SCHEMA_HEADERS.md`, `docs/SPREADSHEET.md`, `docs/SIMULATION_LEDGER.md`, owning plan; proposed `scripts/careJusticeAccounting.test.js`.
- **Steps:** Specify exact headers, row keys, enums, scope units, custody/care overlap, and correction semantics. Write synthetic conservation, deduplication, and unknown-versus-zero cases before implementation.
- **Verify:** Tests fail for the missing behavior, without external writes. Engine-sheet approves schemas; a cheap subagent performs the correlating documentation propagation under AGENTS.md, with lead review.
- **Status:** [x] schema specified and reviewed 2026-09-29 — owning plan §Schema is the specification. Builder approved the census tab and test file 2026-09-29.

### Task 3 — implement pure census arithmetic

- **Files:** proposed `utilities/careJusticeAccounting.js`; proposed `scripts/careJusticeAccounting.test.js`.
- **Steps:** Implement keyed receipt folding and occupancy reconciliation using the approved contract; keep input generation and persistence outside this function.
- **Verify:** The Task 2 tests pass, including zero named events, historical correction, duplicate receipt, transfer, and incomplete-source cases.
- **Status:** [x] built 2026-09-29 — `utilities/careJusticeAccounting.js`, 53 assertions green; called by nothing yet.

### Task 4 — make hospital admission classification explicit

- **Files:** `phase04-events/generationalEventsEngine.js`, `phase04-events/chaosCarsEngine.js`, proposed `scripts/careJusticeIntake.test.js`.
- **Steps:** Emit the approved typed admission/transition receipts with immutable source keys; preserve existing illness and eligibility behavior unless separately ruled. Add OARI treatment entry only under the approved responder/initiative contract.
- **Verify:** Direct ambulance and ordinary-health entry each count once; recovery/internal transition count zero new intake; welfare/de-escalation do not create beds; retirees/minors follow the recorded ruling.
- **Status:** [x] built 2026-09-29 — receipts in memory at 4 sites (owning plan §Task 4 cut); OARI entry not added (no ruling); bench pending.

### Task 5 — implement judicial entry and outcome decision

- **Files:** `phase04-events/chaosCarsEngine.js`; proposed `phase05-citizens/judicialLifecycle.js`; proposed `scripts/judicialLifecycle.test.js`.
- **Steps:** Create one case per typed arrest receipt; apply approved decision timing and World_Config outcome rates. Keep charge/outcome/state distinct; preserve the approved citizen eligibility limits.
- **Verify:** Forced synthetic draws prove each outcome and replay safety; invalid rates fail visibly; an unobserved narrative transgression does not create a case.
- **Status:** [ ] gated on R3-R5; engine-sheet cut.

### Task 6 — implement custody advancement and participation gates

- **Files:** proposed judicial lifecycle and test above; `phase01-config/godWorldEngine2.js`; gate inventory in Wiring Card B.
- **Steps:** In separate focused edits, implement one lifecycle advancement per Cycle and approved release/transfer restoration. Wire both entrypoints before the participation consumers that must see the new state; update the inventoried readers individually.
- **Verify:** Multi-Cycle held/released/diverted cases, detained-plus-hospitalized, retired release, both scheduler entrypoints, and existing health boundaries.
- **Status:** [ ] gated on Task 5 and R4; engine-sheet must subdivide the reader edits.

### Task 7 — implement other-resident demand calculation

- **Files:** proposed `phase04-events/careJusticeService.js`; proposed `scripts/careJusticeService.test.js`; `phase01-config/godWorldEngine2.js`; approved World_Config contract.
- **Steps:** Calculate demand using R1/R2/R5 rates and disjoint population exposure; fold named receipts once; gate OARI capacity by actual deployment and hood. Persist provenance sufficient for later initiative grading.
- **Verify:** Fixed-seed zero/high-demand and served/unserved-hood pairs; no invented POPIDs; named-plus-other totals conserve; no credit without a committed eligible receipt.
- **Status:** [ ] gated on approved numeric model and Tasks 3-6.

### Task 8 — persist cases, hospital records, and census

- **Files:** `phase10-persistence/buildCyclePacket.js`; proposed accounting/lifecycle tests; `phase10-persistence/persistenceExecutor.js` (inspect existing retry/intent contract).
- **Steps:** Add the approved dedicated judicial/census writers; repair hospital reconciliation counts and duration semantics. Pre-create required tabs through deployment setup, never during a Cycle. Implement keyed retries and completeness checks across independent writes.
- **Verify:** Mock failures between case/admission/census writes recover without duplication; same-Cycle rerun is stable; missing required tabs fail loudly.
- **Status:** [ ] gated on schema and receipt implementations; engine-sheet cut.

### Task 9 — repair the hospital cluster carryover

- **Files:** `phase09-digest/finalizeCycleState.js`, `phase03-population/generateCrisisBuckets.js`; proposed `scripts/hospitalIntakeCarry.test.js`.
- **Steps:** Carry the approved intake measure and attribution rather than an untyped capped transition list. Choose aggregate-versus-named clustering explicitly; do not pour citywide counts into the old threshold unchanged.
- **Verify:** Discharge and critical-to-hospitalized transitions add no fresh intake; repeated receipt and cap boundaries cannot change aggregate totals; intended cluster behavior has a predicted threshold test.
- **Status:** [ ] gated on R2/R6 and builder review of cluster scale.

### Task 10 — align feedback and exports

- **Files:** `phase03-population/applyDemographicDrift.js`, `scripts/buildWorldSummary.js`, `scripts/buildDeskPackets.js`, `scripts/buildHealthSlice.js`, `scripts/dumpBeatTabs.js`, `scripts/civicPetitions.js`, `scripts/cron-work-wake.js`.
- **Steps:** Update each reader in a focused cut to select the correct scope, period, metric, and capacity. Keep named people backed by individual records. Preserve health petition Sick prevalence as its existing numerator unless separately ruled. Scripts on live schedules require explicit change approval before edits.
- **Verify:** Run the relevant hospital, petition, slice, and wake tests; exports agree on totals and never narrate an aggregate row as a citizen. No initiative grade changes without approved committed receipts.
- **Status:** [ ] gated on Tasks 7-9 and live-automation edit authority where applicable.

### Task 11 — bench proof and activation proposal

- **Files:** owning plan; `docs/reference/DEPLOY.md`; approved engine-sheet deployment staging.
- **Steps:** Run targeted regression tests first, then the active sandbox proving procedure with written numeric predictions. Test carryover, transfers, demand with no named event, and partial-persistence recovery. Report code installation, sandbox behavior, and production activation separately.
- **Verify:** Actual persisted rows satisfy acceptance criteria on subsequent Cycles; ledger, census, and readers reconcile. Live deployment and Sheet migration require their separate explicit approval.
- **Status:** [ ] gated on prior tasks; no live activation authorized here.

## Attached wiring cards — agent-derived, source-verified

Generated using `scripts/runEngineAgent.js --agent engine-wiring --model anthropic/claude-haiku-4.5`, one target per completed dispatch: `Hospital_Ledger` and `writeCitizenEvent_`. Codex verified the consequential pointers against source on 2026-09-28. These embedded cards retain the verified dependencies without requiring temporary files. Reader inventories below are bounded to the relevant traced paths, not a claim to exhaust every repository consumer.

### Wiring Card A — Hospital_Ledger (tab)

```text
MAP: ENGINE_STUB_REVERSE generated 2026-09-27, 179 files.
Scheduler freshness: latest scheduler commit 594eadfe, 2026-09-28; inspect source.
DEFINITION: schemas/SCHEMA_HEADERS.md:832 (11-column admission schema).
WRITER: phase10-persistence/buildCyclePacket.js:819 persistHospitalLedger_.
CALLER: phase10-persistence/buildCyclePacket.js:79 buildCyclePacket_.
PHASE: phase01-config/godWorldEngine2.js:558 / :2269 Phase10-CyclePacket.
EXECUTOR: same scheduler :579 / :2286; hospital writes precede both executors.
INPUT: buildCyclePacket.js:821 S.hospitalEvents; :830 ctx.ledger rows/headers.
DIRECT WRITES: buildCyclePacket.js:886 transition; :896 admission;
  :906 discharge; :950 ghost closure; :982 missed admission.
TAB PRECONDITION: buildCyclePacket.js:863 requireTab_, no runtime creation.
OUTPUT: buildCyclePacket.js:1002 S.hospitalCensus;
  packet uses the returned census at buildCyclePacket.js:191.
ENGINE READER: phase03-population/applyDemographicDrift.js:225 previous rows;
  scheduled at godWorldEngine2.js:313 / :2030, before new hospital persistence.
SCRIPT READERS: scripts/buildWorldSummary.js:1294 and :1357;
  scripts/buildDeskPackets.js:2125 and :2226;
  scripts/buildHealthSlice.js:52; scripts/civicPetitions.js:186;
  scripts/cron-work-wake.js:81 and :97; scripts/dumpBeatTabs.js:52.
MANIFEST: docs/engine/SHEETS_MANIFEST.md:154.
OPEN WORK: docs/engine/ROLLOUT_PLAN.md:116 engine.254;
  docs/plans/2026-09-21-care-and-justice-system.md:107 closed rulings.
HISTORY: baa304a7, a4d0de30, 5f7b6393, fc3b1d2f, 3b8b51b4, fc543558
  (git log -6 -- phase10-persistence/buildCyclePacket.js).
```

Agent correction: its `OPEN WORK: NOT FOUND` claim was false. Its stale-map warning is relevant to scheduler verification; the writer file's newest commit is 2026-09-27. `buildWorldSummary.js` independently reads the tab; it does not read the engine's in-memory census object.

### Wiring Card B — writeCitizenEvent_ (function)

```text
MAP: generated 2026-09-27 / 179 files / 1481 functions; scheduler checked directly.
DEFINITION: phase04-events/chaosCarsEngine.js:282 writeCitizenEvent_.
CALLER: same file :561, runChaosCarsEngine_.
PHASE: phase01-config/godWorldEngine2.js:329 / :2046 Phase4-ChaosCars.
EXECUTOR: same scheduler :579 / :2286; Chaos Cars runs before both.
CTX MUTATIONS: chaosCarsEngine.js:306 LifeHistory, :309 ledger.dirty;
  :325 DialState; :349 Status; :350 StatusStartCycle; :355 HealthCause.
S WRITE: chaosCarsEngine.js:345 storyHooks initialization;
  :360 hospitalized hook; :367 arrest hook; :374 OARI hook.
INTENT: chaosCarsEngine.js:386 LifeHistory_Log append.
VERIFIED HOOK PERSISTENCE READER: phase08-v3-chicago/v3StoryHookWriter.js:52.
HOSPITAL EVENTS: this function does not emit S.hospitalEvents.
CARE LIFECYCLE: phase04-events/generationalEventsEngine.js:380 and :403;
  scheduled as Phase5-Generational at godWorldEngine2.js:369 / :2086.
RECONCILIATION: phase10-persistence/buildCyclePacket.js:975.
JUDICIAL WRITE: absent in the inspected helper and current engine search.
OPEN WORK: docs/engine/ROLLOUT_PLAN.md:67 engine.11, :116 engine.254.
HISTORY: a5b03e96, e8c70a4e, 0848f7d3, 5337fbff, 9a6b76d5, d1ce6936
  (git log -6 -- phase04-events/chaosCarsEngine.js).
```

Agent corrections: the claimed prose parser at `phase07-evening-media/buildContractSeeds.js:497` is unsupported. Its long storyHooks reader list includes writers such as `phase05-citizens/runConductEngine.js:323`; those map references are not proof of independent consumers.

**Participation blast radius to verify before each cut:** `phase05-citizens/runCareerEngine.js:935`, `runHouseholdEngine.js:563`, `civicInitiativeEngine.js:787`, `:803`, `:936`, `:956`, `updateCivicLedgerFactions.js:268`, `generateCivicModeEvents.js:401`, `generateMediaModeEvents.js:351`, `generationalWealthEngine.js:582`, and `phase06-analysis/prePublicationValidation.js:251`. The owning plan supplies this initial inventory; it is not a claim every site currently uses an identical health gate. `phase05-citizens/citizenContextBuilder.js` life-state derivation and the generational engine's skip/status rules need review too. New functions/S fields/tab writers require their own wiring card before implementation.

## Validation already performed

- `node scripts/hospitalTalkback.test.js` — 24 passed, 0 failed.
- `node scripts/hospitalIncomePersistence.test.js` — 39 passed, 0 failed.
- `node phase04-events/chaosCarsEngine.test.js` — 52 assertions passed.
- Isolated Node VM probes on unchanged source: an injured citizen without an event produced open=1, admitsThisCycle=0, missedAdmitsReconciled=1; a blank-POPID summary-like row counted as one open patient; a continuing admission retained blank CyclesInCare; discharge/internal-care events both survived the hospital-cluster compactor.
- Synthetic probe data stayed in memory and never entered a Sheet, published artifact, Drive, memory store, or ingestion path. The existing suites validate current mechanisms, not the proposed citywide system. No full-suite or live causal-proof claim is made.

## Separate defect and documentation-drift inventory

These findings require review/assignment; recording them does not silently authorize extra fixes.

| Finding | Evidence / routing |
|---|---|
| Hospital desk packet capacity remains 40 while engine/world summary use configured capacity | `scripts/buildDeskPackets.js:2130`, `scripts/buildWorldSummary.js:213`, `phase10-persistence/buildCyclePacket.js:803`; include with approved reader alignment |
| Health slice treats historical discharged rows as current care | `scripts/buildHealthSlice.js:51`; filter has no discharge condition, prose at :57 says in hospital care |
| Owner plan opening says no rulings/build design; closing section records approved rulings | owning plan :25 versus :107; Claude reconciles before implementation |
| Catalog still describes three open builder calls | `docs/index.md` care-and-justice entry; report drift, do not change the ruling by inference |
| Owner plan says hospital census is orphaned and read by world summary | owning plan :89; packet uses returned census at `buildCyclePacket.js:191`; world summary separately reads rows; city feedback separately reads rows |
| Comments place generational health in Phase 4 | actual scheduler is Phase5-Generational at `godWorldEngine2.js:369` / `:2086`, after career and household |
| Owner plan suggests copying hospital writer as an advancer and says CyclesInCare ticks | actual health advancement is `processHealthLifecycle_`; writer updates duration on closure. Judicial progression needs its own computation |

## Changelog

- 2026-09-28 (codex) — Filed engine.254 review amendment with verified wiring cards, citywide intake contract, decision gates, bounded build sequence, and regression evidence; no engine or live-state changes.
