---
title: Safety initiative lever — bounded violence relief design
created: 2026-09-21
updated: 2026-09-21
type: plan
tags: [civic, engine, draft]
sources:
  - Builder request 2026-09-21 — design only; housing first, safety second
  - docs/plans/2026-09-19-civic-wake-game-loop.md — Tasks 4 and 6
  - docs/plans/2026-09-20-housing-lever.md — preceding lever and plan shape
  - docs/SIM_DOCTRINE.md section 15
  - phase03-population/updateCrimeMetrics.js
  - utilities/ensureCrimeMetrics.js
  - Live Initiative_Tracker read 2026-09-21T05:08:28.837Z
  - output/beats/meta.json — local C108 export generated 2026-09-20T21:49:34.662Z
pointers:
  - "[[plans/2026-09-19-civic-wake-game-loop]] — existing civic.38 rollout pointer"
  - "[[plans/2026-09-20-housing-lever]] — housing precedes safety"
  - "[[research/2026-09-21-codex-civic38-task4-premortem]] — conversion, baseline and phase-writer hazards"
  - "[[SIM_DOCTRINE]] — a gate needs a movable input"
  - "[[plans/PLAN_TEMPLATE]] — task structure"
  - "[[index]] — registration"
---

# Safety initiative lever

**Goal:** A deployed safety initiative can reduce persisted Crime_Metrics.ViolentLevel in its target hoods, with measured service attribution and a later Delivering decision that cannot be manufactured by a phase label or a changing sample.

**Architecture:** Publish qualified safety service on the existing initiative neighborhood bus in Phase 2. In Phase 3, apply a bounded reduction to violence above the city's own median, inside the existing crime calculation and before its temporary overlays; the existing Crime_Metrics writer persists the result. Approval stays with civic approval, and petition support remains a separate unresolved policy.

**Terminal:** engine-sheet executes after housing; codex authored this design only. This document changes no engine, schema, config, Sheet, Cycle or schedule. It is a sibling design under civic.38, linked from the existing parent; research-build assigns any separate implementation row before execution.

**Status:** Draft for review. Implementation tasks are not started. Rates, eligible phases and comparator recommendations below are proposals, not builder rulings or permission to activate them. Current safety-program remains unplayable.

**Pointers:** Parent Tasks 4/6; housing-first design; Task 4 pre-mortem; verified wiring card below. Source pointers describe the pre-cut engine; engine-sheet is concurrently building Task 4, so verify them again at implementation.

**Acceptance criteria:**
1. Paired sandbox control/treatment Cycles with identical starting state and random inputs show a qualified initiative causing a lower persisted ViolentLevel; civicPetitions reads the same after-state.
2. A deployed Standing initiative can move the metric before becoming Delivering. Unsupported domains, incomplete observations and absent attribution cannot clear the stage.
3. Overlapping programs do not stack relief; stall stops future service, revival resumes it without a transition bonus, and earlier reductions are not reversed artificially.
4. Non-target hoods receive no direct service. Property/QoL levels and random draw order stay unchanged by the new direct calculation; downstream effects remain observable.
5. OARI's live identity is verified before any activation or fixture used for migration. No row is selected by the erroneous handoff ID alone.

## Live case and baseline

**Identity discrepancy:** The request calls OARI INIT-007. The fresh six-row Sheet read identifies **Oakland Alternative Response Initiative as INIT-002**, PolicyDomain safety, Type vote, Status passed, Outcome PASSED, signed, ImplementationPhase dispatch-live, targeting West Oakland, Fruitvale and East Oakland. **INIT-007 is Oakland Youth Apprenticeship Pipeline**, workforce, operational. The discrepancy has been returned for confirmation. This draft records the observed OARI row; no identity correction or activation is executed. The implementation must require an ID/name/domain match and stop on disagreement. Task 4.4 mentions operational INIT-007 and OARI separately; it does not explicitly assign OARI that ID.

The live read has no Stage, StageBaseline or PriorPhase headers yet. Task 4 conversion and its explicit OARI safety exemption precede this lever. An old C82 vote is not a usable pre-service metric baseline for a new safety channel.

The following **local C108** measurement uses the existing counter, not a fresh Crime_Metrics Sheet read:

```javascript
const p = require('./scripts/civicPetitions');
const data = p.loadLocalData({ cycle: 108 });
p.countPetition({ policyDomain: 'safety',
  hoods: ['West Oakland', 'Fruitvale', 'East Oakland'] }, data);
```

| OARI target hood | ViolentLevel | Strictly above the 22-hood city median 26.90 |
|---|---:|---|
| East Oakland | 33.31 | Yes |
| Fruitvale | 30.31 | Yes |
| West Oakland | 26.90 | No |

Result: **2 of 3 target hoods above median**. Mapped population is 6,673, not victims or signatures. Support numerator, band and required count are null; cleared is false with reason domain-not-playable. No invalid/unlocated condition rows were reported. The generic returned hardshipBand 0.30 is a housing-oriented default, **not a safety threshold**; safety counts use the city median. Capture that misleading field as a presentation cleanup for the counter owner, without changing its gate here.

## Recommended behavior for review

Target the persistent **ViolentLevel**, not ViolentCrimeIndex, IncidentCount, reported incidents, response time, patrol staffing or clearance. The latter measurements have different existing mechanics; reducing reporting could make a displayed number improve while safety did not. This first lever represents a bounded alternative-response benefit at hood scale. It invents no individual victim, case, worker, budget payment or service attendance.

Proposed World_Config keys:

| Key | Proposed seed | Meaning |
|---|---:|---|
| civicSafetyReliefEnabled | false | Explicitly parsed enable; the string false must not enable service. |
| civicSafetyExcessReliefRate | 0.10 | Fraction of untreated violence above the prior city median removed per eligible Cycle; finite 0–1. |
| civicSafetyReliefMaxPoints | 1.00 | Maximum direct ViolentLevel reduction per hood per Cycle; finite 0–3. |

One config loader owns these values. Bad config reports unavailable; never replace it with a plausible active rate. Keep existing crime cause weights and 5–95 level bounds intact. Do not multiply the rate by PHASE_INTENSITY: dispatch-live to operational must not reduce service merely because their legacy intensities differ.

Let V0 be this hood's value **after the existing signed causes, enforcement, cause cap, city-median reversion and clamp**, before temporary overlays. Let M be the existing whole-city median of the prior persisted ViolentLevel observations, computed once before processing hoods. With qualified service rate r and cap c:

```text
excess = max(0, V0 - M)
relief = min(c, r * excess)
V1 = roundTo2Decimals(clampCrimeLevel(V0 - relief))
```

Use the same rounded V0 for the recorded counterfactual and reported actual delta. Preserve the current normal calculation when disabled or ineligible; adding the helper must not change no-service rounding. Require a complete valid prior city observation before supplying M for service; the ordinary engine's missing-row seeds must never become proof that relief worked.

This is an additional bounded recovery toward the city's own middle. It cannot directly push a hood below M. At/below M there is no direct reduction, so a program there cannot claim delivery from this lever alone. Large adverse causes can outweigh the benefit; service can be working without the actual level falling below baseline. Whole-city convergence and median feedback still require long-horizon testing; a cap is not proof against drift. The code already records a 200-Cycle floor-drain caused by an always-on pull (`updateCrimeMetrics.js:530-538`). This design avoids that unconditional pull, but does not claim long-run proof before the bench.

Static arithmetic only, treating the three C108 levels above as V0 and freezing M: proposed relief gives East Oakland 32.67, Fruitvale 29.97 and West Oakland 26.90. These are **hypothetical calculations, not engine outputs or forecasts**. Both elevated hoods remain above median: a lower continuous metric does not necessarily reduce the counter's binary 2-of-3 reading. Stage 3 measures ViolentLevel, not a promised disappearance of every above-median condition.

## Verified wiring card and order

The required read-only Haiku engine-wiring run covered Task 4/Crime_Metrics but exhausted its turns without a usable final card. Its generated footer is not verification. This card is based on direct local reads; the same failed run and the stage dependencies are documented in the pre-mortem.

| Edge | Verified file:line and implication |
|---|---|
| Initiative source | `phase02-world-state/applyInitiativeImplementationEffects.js:141-159` reads the tracker; `:269-273` extracts domain/phase/hoods. Safety DOMAIN_EFFECTS at `:231-232` changes only sentiment, engagement and nightlife. No direct crime input exists. |
| Current bus | Same file `:388-405` produces hood effects, `:518-531` merges every key additively. Add the safety rate with explicit max handling outside that loop; structured source metadata cannot enter numeric addition. |
| Bus lifetime | `phase02-world-state/applyCityDynamics.js:1310-1312` folds only six named fields; `:1541-1546` keeps the initiative bus through the Cycle after engine.250. A safety-specific field survives for Phase 3. |
| Other hood bus | `applyCityDynamics.js:1292-1304` reads prior-Cycle approvalNeighborhoodEffects. That is a political consequence channel, not a service producer; do not use it to pay the safety benefit. |
| Geography | `phase01-config/canonNeighborhoodLoader.js:441-452` resolves parent/child names from S.canonHoods, null for unknown, throws if unseeded. Existing initiative fanout at `applyInitiativeImplementationEffects.js:373-383` splits text without that resolver. Resolve/deduplicate safety targets explicitly. |
| Both entrypoints | `phase01-config/godWorldEngine2.js:293,2042` produces initiative effects; `:313,2062` runs crime; `:355-356,2104-2105` runs initiatives then approval. New Phase-5 stage changes affect service at the next Phase-2 pass. |
| Crime read and call | `phase03-population/updateCrimeMetrics.js:132-143` loads existing metrics. `:254-294` calls calculateNeighborhoodCrime_ per hood with advanced.cityMedianLevel; pass the resolved service slice beside that input. |
| Median and carry | `updateCrimeMetrics.js:404-432` reads persistent levels and the city median. The missing-row seed path is ordinary initialization, not an observed safety baseline. |
| Intervention point | `calculateNeighborhoodCrime_` at `:454`; causes/enforcement at `:485-538`, reversion/clamp at `:540-546`, overlays and baseIncidents at `:549-551`. Apply the reviewed helper between clamp and overlays so downstream observed metrics derive from the treated level normally. |
| In-memory output | `updateCrimeMetrics.js:646-652` emits observed indices/incidents and persisted level fields. `:321-329` publishes S.crimeMetrics.byNeighborhood; `:360-361` invokes batchUpdateCrimeMetrics_. |
| Crime Sheet reader | `utilities/ensureCrimeMetrics.js:314-364` reads LastUpdated and violentLevel. Preserve a distinction between absent, malformed and observed zero instead of allowing a seed/fallback to establish delivery. |
| Existing Writer | `crimeMetricsRowData_` at `utilities/ensureCrimeMetrics.js:374-390` serializes the 13-column row; LastUpdated is G, ViolentLevel is I. `batchUpdateCrimeMetrics_` at `:507-562` queues updates/appends, with direct fallback only when intent helpers are absent. No second writer or new Crime_Metrics column is proposed. |
| Commit boundary | `phase01-config/godWorldEngine2.js:593-595,2330` commits Intents. A Phase-5 Sheet read still sees the prior committed crime row; same-Cycle S.crimeMetrics is a calculation, not proof of persistence. |
| Attribution path | `utilities/rippleLedger.js:40-74` queues a Ripple_Ledger attribution and adds S.rippleEvents; returns false on missing intents/failure at `:44-46,93-96`. Queue success alone is not persisted evidence. |
| Gate and counter | `lib/initiativePhaseContract.js:232-237` declares safety-program false/null with ViolentLevel down. `scripts/civicPetitions.js:214-230` prints hood conditions against the city median and refuses safety support regardless of counts. |

## Service eligibility, effect bus and persistence

Proposed producer field: `S.initiativeNeighborhoodEffects[hood].safetyViolentReliefRate` (numeric). Proposed companion: `S.initiativeSafetyService = {available, cycle, byHood, errors}`; each hood records source InitiativeID, eligible phase and rate. This companion is ephemeral Cycle state, not a new canon ledger. Populate both once from the same validated tracker read. Unknown/ambiguous IDs, duplicate IDs, missing required stage columns or unresolved target geography make that initiative unavailable; print the reason, do not broaden coverage. Distinguish unavailable source from a valid empty service set.

Proposed eligibility is safety domain, valid passage accepted by Task 4, Stage Standing or Delivering, and one of implementation-active, dispatch-live, pilot-active or operational. Include complete only if the builder explicitly defines it as continuing service; this draft proposes no service from complete. Construction, planning, Funded, stalled, blocked, suspended, defunded, failed and vetoed rows pay no service. Align the final whitelist with Task 4's per-row conversion table; do not infer grandfathered passage from a nonempty VoteCycle. OARI dispatch-live is the intended existing case once identity and conversion are confirmed.

The greatest eligible rate wins per folded hood; tie-break by stable InitiativeID. Two child names under one parent, repeated targets and overlapping initiatives never multiply the rate. Only the selected source can receive a direct service receipt for that hood; other sponsors cannot reuse it as their own delivery. Do not change generic sentiment/business effects as part of this work.

Calculate the candidate benefit inside the existing crime function without consuming random draws. Attach the candidate receipt to the new metric result, then have the Phase-3 caller queue attribution using existing recordRipple_: explicit absolute Cycle, causeType initiative, causeId selected InitiativeID, targetScope neighborhood, targetIds containing the canonical hood, effectType safety-violent-relief, magnitude equal to the actual rounded V0−V1, sourceEngine updateCrimeMetrics. Store a compact versioned causeDetail with V0/V1/M, rate, phase and source Cycle within the existing detail cap; reject truncated/unparseable proof. Zero benefit is a diagnostic, not a positive receipt.

Attribution unavailable must be reported and must withhold delivery credit; it must not retroactively falsify the crime measurement. Keep metric persistence in the existing batch writer. For the later gate, require a committed receipt and matching committed Crime_Metrics row for that Cycle/hood/value. A queued receipt, a successful log, S.rippleEvents, or a dropped write is insufficient. Do not assume independent metric and ripple Intents are transactional; partial persistence produces unavailable delivery proof, not invented success. Expose that state in the shared requirement helper/pack.

Stall at Phase 5 of C does not undo service already calculated at Phase 3 of C; absent revival, C+1 pays none. Revival at Phase 5 resumes service at the next producer pass. Keep the reduced persistent level; stopping a service removes its future benefit, not the city's prior history. PriorPhase restoration, T7 precedence and business/approval anti-farming remain Task 4/5 responsibilities, covered by the pre-mortem. This consumer must not bypass those decisions or write approval.

## Catalog and stage baseline

Proposed final catalog entry, enabled only after the matching engine writer and reviewed activation path exist:

```javascript
'safety-program': {
  label: 'Public safety or alternative response program',
  policyDomain: 'safety', type: 'vote', playable: true,
  effectChannel: 'initiativeNeighborhoodEffects.safetyViolentReliefRate',
  stage3Metric: { tab: 'Crime_Metrics', column: 'ViolentLevel',
    direction: 'down', scope: 'hood' }
}
```

That effectChannel string is proposed new shared-contract vocabulary, not a current consumer. The Node catalog and engine mirror must agree. While disabled or unavailable, proposals must still be refused with a specific unavailable-lever reason; a static playable flag alone must not expose a dead gate. Keep false until the reviewed deployment/enable sequence supplies that runtime capability check to both engine and script callers. This draft authorizes neither flip.

Proposed StageBaseline schema uses Task 4's versioned descriptor, with metric/version, origin safety-channel-activation for OARI (vote origin for new rows), actual committed source Cycle, exact sorted folded hood set, each ViolentLevel and equal-weight arithmetic mean. Do not relabel a cut-time C108 reading as an old C82 baseline. If Task 4 has stored a no-lever placeholder, arm it once with the explicit activation origin before the first safety treatment; preserve any real valid baseline. Subsequent service, stalls and revival never rebase it.

Recommend a fixed target-hood cohort and strict decrease in its mean at two-decimal source precision. No population weights are introduced. Missing a baseline hood makes comparison unavailable; deleting the worst hood cannot improve the average. Require a later committed observation and at least one positive own-source receipt among the fixed hoods at that observation Cycle. This proves measured benefit plus service contribution, not sole causation of every observed change; matched-control bench evidence establishes that the mechanism itself can move the gate input. An unrelated decline with no own-source receipt cannot clear Delivering. Counter current-Cycle visibility and the fixed historical baseline remain separate.

The enabled lever supplies a movable stage-3 input under SIM_DOCTRINE §15. It does **not** set a safety petition support band or turn hood population into signatories. Keep civicPetitions' safety support disabled until a separate support-unit/band ruling; its label can later distinguish unavailable lever from unresolved support rules.

## Failure inventory and acceptance probes

- **Wrong live row:** ID-only OARI selection would apply safety to workforce INIT-007. Verify all six live identities against the conversion fixture; activation stops on name/domain mismatch.
- **Static or circular gate:** requiring Delivering before service makes Standing impossible to clear. Require deployed Standing in a fixture that then moves ViolentLevel and reaches the later comparator.
- **Drain and moving median:** run 200 matched synthetic Cycles with all-hood service, partial service, no causes and persistent adverse causes. No blanket drift to the floor; measure median and tail response, not just one hood. Crossing below the prior median from direct service is a failure.
- **Rounding and caps:** rates 0/0.10/1, caps 0/1/3, zero excess, large shock, 5/95 level bounds, sub-cent benefit. Receipt magnitude equals actual rounded change; no benefit can exceed the cap through rounding.
- **Random stream / indirect effects:** helper adds zero RNG calls. With paired inputs, unserved hoods have identical direct outputs. Over later Cycles, changed city medians, hotspots and incidents can legitimately propagate; do not assert permanent isolation or suppress those effects.
- **Spaghetti geography/merge:** current fanout uses raw names; current merge sums arbitrary keys. Test child+parent duplicates, malformed targets, empty canonical cache, duplicate IDs and overlapping sources; structured metadata never enters addition.
- **Writer failure:** verify both engine entrypoints through Phase 10 and re-read Crime_Metrics plus Ripple_Ledger. Dropped/partial/late intents, stale LastUpdated or mismatched receipt values refuse delivery. Test direct fallback separately; do not equate in-memory success with persistence.
- **Repeated call/Cycle:** do not feed the treated result into the helper twice. A second Phase-3 invocation within one context must reuse its completed result and avoid duplicate intents/receipts. A restarted already-committed Cycle must not add another benefit; require a coherent LastUpdated guard, print mixed/future stamps as unavailable, and preserve normal engine rerun policy rather than inventing a safety-only history repair.
- **Stall/revival:** treatment at C, Phase-5 stall, none at C+1; held stall retains PriorPhase; a valid later revival resumes one normal benefit and yields no direct approval increment or baseline reset. Persisted earlier relief is not reversed.
- **Measurement provenance:** ordinary median drift with the service disabled cannot earn service credit. Missing source, non-finite row, seed-only row, wrong source ID, truncated detail, changed cohort and same-observation baseline all refuse clearance. Missing one target does not become a zero or smaller denominator.
- **Misleading support data:** 2 above-median hoods and population 6,673 do not become 6,673 supporters. Safety remains a condition display until separate support rules are approved; generic hardshipBand 0.30 is not read by safety.

## Tasks

Each task is a bounded edit or verification. Engine-sheet owns substrate execution after housing and Task 4; codex has made no implementation changes.

### Task 1: Pin identity, activation baseline and config contract
- **Files:** `phase01-config/engine94SheetContract.js`, `phase01-config/godWorldEngine2.js`, parent civic.38 plan; `scripts/civicSafetyRelief.test.js` (new, proposed).
- **Steps:** Resolve the reported OARI identity mismatch before selecting a live row. Add reviewed enable/rate/cap keys through the existing config seed/load pattern. Pin synthetic six-row identity and the one-time baseline arming contract, including absent/placeholder/valid baseline behavior.
- **Verify:** `node scripts/civicSafetyRelief.test.js` rejects INIT-007 as OARI, parses false correctly, refuses invalid dials and preserves a real baseline on a second activation attempt.
- **Status:** Not started — policy and identity confirmation precede implementation.

### Task 2: Add the pure bounded-relief calculation
- **Files:** `phase03-population/updateCrimeMetrics.js`; proposed safety test.
- **Steps:** Implement the reviewed V0/M/r/c calculation between existing reversion and overlays, returning exact applied delta and candidate provenance. Preserve disabled path and random order.
- **Verify:** safety test covers bounds, no-excess, caps, rounding and no-service equivalence with the unchanged original calculation.
- **Status:** Not started.

### Task 3: Publish canonical qualified safety service
- **Files:** `phase02-world-state/applyInitiativeImplementationEffects.js`; proposed safety test.
- **Steps:** Read Task 4 passage/stage fields; enforce the reviewed deploy whitelist; fold/deduplicate targets; emit max-rate numeric bus plus separate source/availability metadata. Exclude the field from generic addition.
- **Verify:** safety test proves Standing pays, Funded/failed/stalled do not; overlaps select one source; applyCityDynamics retains the field without folding it into sentiment.
- **Status:** Not started — depends on Task 4 schema/conversion.

### Task 4: Connect crime output and persisted attribution
- **Files:** `phase03-population/updateCrimeMetrics.js`, `utilities/ensureCrimeMetrics.js` (verify existing writer), `utilities/rippleLedger.js` (verify existing writer); proposed safety test.
- **Steps:** Pass service to the per-hood calculation, queue compact receipts in its caller, expose unavailable attribution, and preserve the existing 13-column writer. Add coherent repeated-invocation guards and receipt/metric matching.
- **Verify:** safety test executes producer→city fold→crime→intent commit→reread; repeated invocation does not compound relief or receipts; partial persistence cannot clear delivery.
- **Status:** Not started.

### Task 5: Wire immutable stage metric and capability reporting
- **Files:** `phase05-citizens/civicInitiativeEngine.js`, `lib/initiativePhaseContract.js`, `lib/initiativePhaseContract.test.js`, script proposal/pack consumers through their current owner.
- **Steps:** Add the reviewed baseline/cohort/comparator and persisted own-source proof to the shared stage contract. Align Node/engine catalog and runtime unavailable-lever handling. Preserve safety support refusal and distinguish it from lever availability.
- **Verify:** contract parity and safety suites; no same-observation clearance, no baseline reset, no credit from another initiative or stale metrics; disabled capability cannot accept a safety proposal.
- **Status:** Not started — coordinates with Task 4 owner, does not authorize codex to edit engine files.

### Task 6: Prove the OARI path and long-run bounds
- **Files:** proposed safety test, `scripts/civicPetitions.test.js`, existing sandbox proving harness.
- **Steps:** Use the confirmed OARI row as the bench case with matching control/treatment random inputs; capture pre/post persisted hoods and receipts, then call the actual counter on matching exports. Run the synthetic long-horizon and stall/revival matrix above.
- **Verify:** targeted suites and sandbox evidence show direct relief, downstream observations, stopped service on stall, unchanged baseline and bounded long-run behavior. Report above-median counts even if they stay 2 of 3.
- **Status:** Not started — sandbox implementation acceptance, no live Cycle authorized here.

### Task 7: Publish and activate only after review
- **Files:** `docs/SPREADSHEET.md`, `docs/SIMULATION_LEDGER.md` (downstream effects pointer), `schemas/SCHEMA_HEADERS.md` (existing Crime columns pointer), `docs/index.md`, parent plan and shared catalog/mirror.
- **Steps:** Publish existing-column semantics, service dials, bus lifetime, stage latency, receipt contract and bench evidence. Use the required cheap documentation subagent for correlated canon-state Markdown updates; engine-sheet reviews. Present a separate live activation proposal after housing acceptance; do not enable a playable dead gate while its dial is off.
- **Verify:** exact deployment/config diff, catalog parity, syntax checks, targeted suites and `node scripts/docLoopStatus.js --lint`; installed code, bench proof and live activation recorded separately.
- **Status:** Not started — review/activation gate.

## Open questions for design review

The draft recommends a concrete policy; the request authorizes drafting only. Builder/engine-sheet acceptance is needed for the above-median-only benefit, 10%/1-point dials, service whitelist, fixed equal-hood mean comparator and runtime capability handling. OARI's handoff ID correction remains reported for confirmation before any row-targeted action. These are explicit implementation prerequisites, not permissions implied by filing this draft. Safety petition signature units and support bands remain outside this lever design.

## Changelog

- 2026-09-21 (codex) — Drafted safety-second design: live OARI identity discrepancy, C108 condition baseline, bounded persistent ViolentLevel relief, verified wiring, service attribution, stage contract and engine-sheet acceptance tasks; no engine or Sheet changes.
