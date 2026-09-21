---
title: Civic.38 Task 4 pre-mortem — conversion, baselines and stall revival
created: 2026-09-21
updated: 2026-09-21
type: reference
tags: [research, civic, engine, active]
sources:
  - docs/plans/2026-09-19-civic-wake-game-loop.md Task 4
  - phase05-citizens/civicInitiativeEngine.js
  - lib/initiativePhaseContract.js
  - Live Initiative_Tracker read 2026-09-21T05:08:28.837Z via lib/sheets.js getSheetData
pointers:
  - "[[../plans/2026-09-19-civic-wake-game-loop]] — existing civic.38 work item; engine-sheet owns the cut"
  - "[[index]] — research registration"
  - "[[../SIM_DOCTRINE]] — movable gate inputs and canonical geography"
---

# Civic.38 Task 4 pre-mortem

**Source:** Task 4, current engine source through `86c4874a`, the shared Node phase/catalog contract, and a fresh read of all six live Initiative_Tracker rows. No engine code, Sheet, Cycle, deployment or schedule was changed. The Stage, StageBaseline and PriorPhase headers are absent on this live read; the failures below are predicted integration failures, not claims that an installed stage engine already failed.

**What this addresses:** The three assumptions most likely to make the cut look correct while leaving initiatives unable to deliver, measuring the wrong change, or escaping their stall cost.

**Verdict: adopt.** Reconcile the row identities, measurement boundary and phase-writer precedence before the conversion runs. Direct research filing and registration are builder-requested; this feeds the existing civic.38 row and creates no new rollout work item.

## 1. HIGH — the per-row conversion inventory is not reliable enough to execute

The live row identity contradicts Task 4.4 and the safety handoff: **OARI is INIT-002**, not INIT-007. The latter is a workforce program. Do not apply a safety exemption, safety baseline or OARI test to INIT-007. The discrepancy was reported for a ruling; no canonical identity or owning-plan row was silently rewritten.

| ID | Live name / domain | Type; Status; Outcome; VoteCycle | Live phase | Conversion hazard |
|---|---|---|---|---|
| INIT-001 | West Oakland Stabilization Fund / economic | vote; passed; PASSED; 78 | disbursement-active | Standing is consistent with an operating service, but an old vote supplies no historical metric baseline. |
| INIT-002 | Oakland Alternative Response Initiative / safety | vote; passed; PASSED; 82; signed | dispatch-live | Actual OARI. Standing may preserve service, but safety has no movable stage-3 input yet; do not give this exemption to INIT-007. Signed-row early exit can bypass a new stage loop. |
| INIT-003 | Fruitvale Transit Hub Phase II — Visioning / transit | visioning; visioning-complete; COMPLETED; 94 | design-phase | COMPLETED records visioning, not council passage. Scheduling a vote while retaining Type visioning calls the visioning resolver again. Petition transition and Type treatment need an explicit conversion contract. |
| INIT-005 | Temescal Community Health Center / health | vote; passed; PASSED; 80 | construction-active | This phase is outside the shared vote arc and does not provide health relief. Standing cannot simultaneously mean this construction site and deployed care without an explicit service-transition mechanism. |
| INIT-006 | Baylight District — Final Council Vote / sports | vote; passed; PASSED; 83; signed | construction-planning | Outside the shared vote arc. Targets are Jack London, Downtown; the approved metric concerns Baylight-district activity. T7 may replace effective phase and hoods using sports evidence. |
| INIT-007 | Oakland Youth Apprenticeship Pipeline / workforce | program; announced; blank; blank | operational | Already operating without a vote. Preserve that historical fact; do not relabel it OARI or fabricate passage. Operational alone does not prove improvement from a baseline. |

**Verified path:** `lib/initiativePhaseContract.js:45-61` defines the Type arcs; direct membership probes reject INIT-005 and INIT-006's current phases from the vote arc. The catalog deliberately mints new rows as vote but does not repair those grandfathered arcs. `phase05-citizens/civicInitiativeEngine.js:308-342` selects the resolver by Type. The vote result changes Status/Outcome at `:354-367`; that is not a Stage or deploy-phase transition. Health qualifies only treating phases at `phase02-world-state/applyInitiativeImplementationEffects.js:175-185,365-366`; construction-active is excluded.

**Required cut proof:** An ID-keyed conversion fixture must contain all six rows above, preserve historical vote facts, and assert each row's next legal work/metric transition. Refuse mismatched Name/domain/phase prerequisites rather than applying a stale table to a reused ID. Prove INIT-003 cannot re-run visioning as its supposed council vote. Prove INIT-005 has a real path to treating people before its Sick comparator can clear; merely stamping Standing does not build that path. Keep OARI's no-safety-gate exception explicit, with a stated clock policy while that gate is absent.

## 2. HIGH — a cut-time baseline is neither an old vote-time baseline nor automatically a consistent observation

Task 4.1 calls the baseline vote-time; Task 4.4 requires stamping all legacy rows at cut time. The live votes are C78/C80/C82/C83, visioning is C94, and INIT-007 has no vote. Current values cannot reconstruct those historical baselines. Label the baseline as conversion-time with its actual observation Cycle; new passed votes can use the new vote-time path.

The baseline reader must also choose a coherent persistence boundary. Both entrypoints run initiative effects in Phase 2, transit in Phase 2, crime and demographics in Phase 3, and initiative decisions in Phase 5 (`phase01-config/godWorldEngine2.js:293,304,313-314,355` and `:2042,2053,2062-2063,2104`). Demographics writes immediately through `updateNeighborhoodDemographics.js:279` and `utilities/ensureNeighborhoodDemographics.js:350,356`. Transit queues appends through `utilities/ensureTransitMetrics.js:449-475`; crime queues rows at `utilities/ensureCrimeMetrics.js:547-559`. A Phase-5 fresh Sheet read can therefore see new Sick alongside old transit/crime observations. Comparing that mixture to a cut baseline can clear a stage from pre-service movement or introduce an accidental extra Cycle of delay.

**Required cut proof:** Store a versioned baseline descriptor in StageBaseline: actual source Cycle, cut/vote origin, metric definition, per-hood or per-station keys and values, aggregation and target membership. Missing/zero-sample/non-finite values are unavailable, not zero. Read committed observations consistently or explicitly use the current in-memory observations with their persistence proof; do not mix the two by domain. Never compare the same observation used to stamp the baseline as evidence of later delivery. Re-running conversion must leave an existing valid baseline unchanged; revival must not rebase it.

Baylight requires a fixed, reconciled target set and a defined two-column comparator: `lib/initiativePhaseContract.js` sports-district names RetailVitality and NightlifeProfile, while T7 can substitute S.sportsZones (`applyInitiativeImplementationEffects.js:305-322`). The cut must define whether both columns improve, how multiple hoods combine and what happens when a hood is missing. A higher mean caused by dropping a weak hood is not delivery. Existing data alone cannot choose these semantics.

**Adversarial checks:** conversion twice; empty or malformed StageBaseline; old VoteCycle with no old metric snapshot; same-Cycle baseline/comparison; new vetoed vote; changed hood/station membership; one sports column improving while the other worsens; ordinary weather/median drift improving a metric with the initiative disabled. Use matched-control bench runs to prove that the service can cause the metric change, not just that a comparator can return true.

## 3. HIGH — a Phase-5 stall/revival can lose to older writers or miss its own effects

Three current mechanics intersect the proposed state machine:

- **Early exits:** signed passed rows are held and skipped at `civicInitiativeEngine.js:223-228`; resolved/failed/inactive/override statuses skip at `:210-214`. A stage handler placed below them never services OARI or Baylight. Conversely a handler placed before all skips must not revive a vetoed/defunded row just because LastWorkCycle is populated.
- **Writer precedence:** T7 queues Baylight operational in Phase 2 (`applyInitiativeImplementationEffects.js:305-319`), while this engine directly writes tracker rows in Phase 5 (`civicInitiativeEngine.js:524-526`). A queued operational cell can later overwrite a Phase-5 stalled cell at Phase 10. That leaves PriorPhase set but the service operational, defeating the losing clock. This is conditional on sportsHasOpenedBaylight_, not a claim that T7 fired in the live read.
- **Effect timing and missed transition:** Phase-2 service effects already ran when Phase 5 decides to stall. Approval then snapshots the newly written phase (`updateCivicApprovalRatings.js:469,982`; `phase09-digest/finalizeCycleState.js:112`). On the next Cycle, the Phase-2 event detector compares that same phase to the carried phase (`applyInitiativeImplementationEffects.js:166-169,282-288`), so a Phase-5 advancement may never produce engine.250's business event pulse. If the intended semantics are next-Cycle service changes, state that latency and preserve the transition event explicitly. Do not assume a new Stage column or the surviving bus resolves this ordering problem.

**Required cut proof:** Declare one owner/precedence rule for stage-managed phase writes, including T7; test both full entrypoints through Phase 10. On first stall only, capture the actual legal pre-stall phase in PriorPhase. Held stalls must not overwrite it with stalled. Revival requires fresh work after stall entry, restores a validated allowed PriorPhase exactly once, clears it, and resets only the stall clock. A work stamp used to enter Standing cannot later revive a new stall; a running stage's clock cannot be renewed by repeated work. Absent/invalid PriorPhase must fail visibly rather than invent operational.

Bench cases: signed OARI/Baylight reach the stage handler; T7-active Baylight stays stalled after commit; stall at N−1/N/N+1; repeated held stalls retain PriorPhase; stale/pre-stall work cannot revive; one new work revives once; rerun does not revive/pay twice; blocked/suspended/defunded and vetoed rows do not get generic revival. Check health/transit service output, approval and business effects on the entry Cycle and the following Cycle. The Task 5 approval/business revival guards already exist (`updateCivicApprovalRatings.js:1050-1067`; `applyInitiativeImplementationEffects.js:285-288`); preserve them, but prove the whole ordering rather than relying on those predicates alone.

The existing open silence question still blocks clock semantics: `classifyInitiativeMotion_` returns silence for blank/expired NextActionCycle (`updateCivicApprovalRatings.js:1073-1076`). Removing the rescheduler does not remove that drain. This review does not choose a replacement penalty.

## Verified wiring card

The required Haiku engine-wiring command ran read-only with the Task 4/Crime_Metrics target. It exhausted 30 turns without producing a usable final card; its coverage footer is not evidence of verified wiring. The following locally verified pointers are the card used for this pre-mortem and supersede that incomplete output.

| Edge | Verified pointer |
|---|---|
| Tracker read / Type resolver / direct writer | `phase05-citizens/civicInitiativeEngine.js:123,308-342,524-526` |
| Both engine orders | `phase01-config/godWorldEngine2.js:293-356,2042-2105` |
| Phase-qualified service / T7 competing intent | `phase02-world-state/applyInitiativeImplementationEffects.js:175-185,305-322,365-366` |
| Prior phase comparison / carried snapshot | `phase02-world-state/applyInitiativeImplementationEffects.js:166-169,282-288`; `phase05-citizens/updateCivicApprovalRatings.js:469,982`; `phase09-digest/finalizeCycleState.js:112` |
| Current metric write boundaries | `utilities/ensureNeighborhoodDemographics.js:350,356`; `utilities/ensureTransitMetrics.js:471-475`; `utilities/ensureCrimeMetrics.js:547-559` |
| Existing stage input consumer in scripts | `scripts/buildCivicOfficeSlice.js:798` — stage requirement text is explicitly unavailable until the engine-compatible helper lands |

**Not applicable / hazard:** This is not a six-row migration script and authorizes no vote, stage, phase, target or baseline rewrite. Do not treat an accepted research finding as a builder decision about grandfathering or service eligibility.

**Ignited plans:** none; apply these findings to [[../plans/2026-09-19-civic-wake-game-loop]] Task 4.

## Applications (living)

- 2026-09-21 (codex) — Pre-cut review requested by research-build; top findings route to engine-sheet before its cut.

## Changelog

- 2026-09-21 (codex) — Read all six rows live, verified Type-arc mismatches, and traced baseline and stall/revival persistence hazards; engine files unchanged.
