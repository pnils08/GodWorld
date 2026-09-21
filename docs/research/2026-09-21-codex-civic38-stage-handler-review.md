---
title: Civic.38 stage handler adversarial review and Delivering observation boundary
created: 2026-09-21
updated: 2026-09-21
type: reference
tags: [research, civic, engine, active]
sources:
  - Commit 7268a28490239caac392daf02699335257be4a08
  - phase05-citizens/civicInitiativeEngine.js
  - phase02-world-state/applyInitiativeImplementationEffects.js
  - phase09-digest/finalizeCycleState.js
  - phase01-config/loadPreviousEvening.js
  - docs/plans/2026-09-19-civic-wake-game-loop.md
pointers:
  - "[[research/index]] — registration"
  - "[[research/2026-09-21-codex-civic38-task4-premortem]] — original timing and writer-precedence review"
  - "[[plans/2026-09-19-civic-wake-game-loop]] — owning plan, Task 4 engine rulings 4–9"
  - "[[engine/ROLLOUT_PLAN]] — existing civic.38 row owns the work"
---

# Civic.38: stage handler review and Delivering observation boundary

**Requested by:** engine-sheet, builder-authorized second opinion. Review commit `7268a284`; recommend the next comparator boundary. This document and its research-index entry are the only repository changes. No engine edit, deployment, Sheet read/write, Cycle fire, bench reset, or external model call was performed.

**Source scope:** the three reviewed engine files at local HEAD were byte-identical to `7268a284`. Supporting persistence and writer paths were inspected at `8f7bc853`; line numbers below refer to that inspection. PROD @110 and blank live Stage are the dispatch's reported state, corroborated by the plan changelog at `docs/plans/2026-09-19-civic-wake-game-loop.md:365`, not independently read back here.

**What it does:** Phase 5 funds a signed/overridden proposal and later stands it up when work has landed. Standing writes `operational` directly to the tracker. A separate prior-phase map travels through Phase 9/10 so the next Cycle's Phase 2 can recognize that advancement even though the approval snapshot already contains `operational`.

**Verdict: adopt** the corrections and boundary recommendations below within existing civic.38. Normal completion is coherent: no double-step was found in the three call sites, and the new carry emits one advancement on the following Cycle. It is not an exactly-once receipt across failures or a bench identity boundary. The fallback Name key has a reproduced mismatch. These findings do not establish an observed live failure on blank-stage rows.

**Recommendation for ASK 2:** choose **(c), early Phase 2 of the following Cycle, against one verified committed observation cohort**. Compute the verdict there; keep Phase 5 as the sole stage writer. A bare Phase-2 Sheet read is insufficient after partial writes: require Cycle/coverage validation and a successful observation-publication receipt. Do not label the existing Phase-9 carry as that receipt.

## ASK 1 — findings ranked by consequence

### F1 — HIGH: the carry cannot guarantee exactly-once business advancement across a partial run

The tracker and the carry have different persistence boundaries. `applyCivicStageStep_` changes the row and publishes the carry in memory (`phase05-citizens/civicInitiativeEngine.js:3176–3185`); the full tracker grid writes at `:549–551`. The carry is assembled later (`phase09-digest/finalizeCycleState.js:112–120`) and saved with `saveCarryForwardBlob_` at `:447–483`. Both entrypoints save it **before** executing the business/other intents (`phase01-config/godWorldEngine2.js:590–595,2325–2330`). CycleCount flushes later (`:617–622,2345–2353`); its increment was queued at `:710–719`.

Three distinct failure windows matter:

1. **Crash after Phase-5 tracker write, before carry persistence.** On retry of N, the Sheet already says Standing/operational but the valid N−1 snapshot says vote-ready. Phase 2 recognizes the advancement on the retry of N, not at N+1. The stage handler then no-ops on Standing and does not reconstruct its carry. Local reproduction observed this timing change. If the run proceeds to N+1 without a usable N carry (for example, the state save fails and the counter still advances), the exact prior-Cycle gate rejects N−1 and the advancement can be lost instead. `savePreviousCycleState_` catches its failure at `:481–483`; no transaction joins the tracker, carry and counter.
2. **Crash while consuming the N carry in N+1.** Re-firing N+1 re-emits `advanced` from the same carry. This was reproduced with two fresh contexts. If Business_Ledger's first write already landed before the interruption, the retry can apply the lift to already-changed values. The consumer reads the event at `phase05-citizens/applyBusinessDynamics.js:475` and queues revenue/growth writes at `:566–569`. Repeated emission is proven locally; duplicate persisted revenue was not bench-tested here. The problem depends on which writes survived, so a deterministic RNG alone is not proof of replay safety.
3. **Phase-5 tracker write throws.** The memory carry remains even though the Sheet transition failed. Local fault injection reproduced the orphan carry. `safePhaseCall_` catches/logs and continues (`phase01-config/godWorldEngine2.js:159–168`), so later finalization can persist it. This does not automatically create a false lift: if the Sheet still has the carried old phase, equality suppresses it. It does mean the carry is a proposed transition, not proof of a committed one.

The existing ghost guard is useful: a property stamped N is refused while retrying N and the loader selects a ring row below N (`phase01-config/loadPreviousEvening.js:95–109,159–186`). It does **not** roll back Phase-3/5/10 Sheet writes or acknowledge an event's consumers.

**Recommended repair direction, not an applied patch:** give the engine transition a stable identity and `{from,to,transitionCycle}` tied to the persisted tracker transition; replay/recover it deliberately and make the business consumer's event accounting retry-safe. Validate successful tracker persistence before publishing a transition as committed. A consumed flag in an unrelated blob, written separately from Business_Ledger, would merely create another lost/duplicate-event window. Fault-inject both entrypoints before/after tracker, carry, business intent and counter writes before claiming exactly-once behavior.

### F2 — HIGH on proving resets: Cycle gating is not a bench-generation check

The loader returns the script property immediately whenever its stamp is **below** the requested Cycle (`phase01-config/loadPreviousEvening.js:165–168`). It only consults the synced sheet ring when the property is absent or at/after that Cycle. The sync script copies Sheet values (`scripts/syncSandboxFromLive.js:114–133`); it does not refresh Apps Script properties.

Reproduced against the actual loader with isolated fake property/sheet providers:

| Property left on bench | Synced live ring | Next fire | Selected |
|---|---|---|---|
| C113, old bench | C108, synced live | C109 | C108 ring — correct ghost recovery |
| C108, old bench | C108, synced live | C109 | **Old bench property**, despite a different C108 world |
| C107, old bench | C108, synced live | C109 | **Old C107 property**; Phase-2 exact-age test then drops its phase maps |

The same-Cycle case passes `Number(implPrev.cycle) === implCycle - 1` (`phase02-world-state/applyInitiativeImplementationEffects.js:166–174`). An unrelated bench transition can therefore supply the prior phase for an initiative with the same ID after reset. An older property instead silently forfeits usable C108 carry sitting in the ring.

**Attribution:** this is an inherited loader limitation exposed by the new carry, not a change to the loader in `7268a284`. The common ahead-of-live bench reset is handled. `docs/reference/DEPLOY.md:139` describes that recovery broadly; the code only establishes the at/after-target case. Do not treat that wording as proof for equal/older bench states.

**Recommended repair direction:** bind carry and the synchronized world to a shared reset generation/identity, or explicitly reconcile those properties through an authorized reset procedure. Checking Cycle alone, adding another Cycle field, or wiping properties as an ad hoc review action does not establish equivalent starting worlds. This review performed no reset or property operation.

### F3 — MEDIUM: fallback Name is not keyed identically to either reader

Writer: `String(cell(ix.id) || '').trim() || String(cell(ix.name) || '')` (`phase05-citizens/civicInitiativeEngine.js:3176`). Both readers trim Name before using it as fallback: Phase 2 at `phase02-world-state/applyInitiativeImplementationEffects.js:274,287`, approval snapshot at `phase05-citizens/updateCivicApprovalRatings.js:458,468–469`.

Reproduction: a synthetic ID-less row named `" SYNTHETIC REVIEW "` stands up from vote-ready. The carry key retains its spaces, while approval stores `"SYNTHETIC REVIEW": "operational"`. Next Cycle, `initiativePrevPhaseFor_` misses the carry key and returns operational from the ordinary map. The advancement disappears. An ID with surrounding whitespace is safe because all three paths trim it.

**Smallest repair:** normalize the fallback Name identically in the stage writer; test ID-backed, whitespace-ID, clean Name and whitespace-Name cases. Duplicate ID-less names and renaming an ID-less row across Cycles are separate pre-existing limitations of Name identity, not fixed by trimming. Do not invent IDs during repair.

### F4 — MEDIUM, conditional row shape: standing up from a blank phase drops its advancement

Funded→Standing can clear with a blank ImplementationPhase: the requirement helper only blocks named negative phases (`phase05-citizens/civicInitiativeEngine.js:3056–3083`), and the step does not require a valid old phase (`:3142–3151`). The applier writes operational but only records `left` if truthy (`:3179–3185`). Phase 2 also requires a truthy prior phase (`phase02-world-state/applyInitiativeImplementationEffects.js:288–289`).

Local reproduction: Funded + signed + qualifying work + blank phase becomes Standing/operational; its carry map is empty; next Cycle's advancement is zero. This is not a claim that a current live row has that shape. New valid minting normally provides a phase. Before conversion, validate phase eligibility explicitly or define a typed first-phase transition rather than relying on an empty string as both absence and history.

### F5 — next-cut hazard: T7 agrees with this cut's operational write but cannot arbitrate a new stall

For a clean Funded→Standing Baylight path, T7 queues operational in Phase 2 and Phase 5 writes the same value. With an unchanged pre-Cycle phase, the local test observed zero event at N, one carried event at N+1, and no extra T7 event. There is no value conflict in that case.

T7 still ignores Stage and unconditionally substitutes operational for any non-operational/non-complete phase while its sports predicate is true (`phase02-world-state/applyInitiativeImplementationEffects.js:310–324`). An already-stalled staged fixture therefore queues operational and receives the operational effect path. That is a future stall-cut blocker, not a stall introduced by this first cut.

Ruling 6's proposed guard must cover **new stalls in the same run**, too. Checking `Stage && phase === 'stalled'` only at the Phase-2 read catches a previously stalled row; it misses a Phase-5 stall decided after T7 has queued operational. The Phase-10 intent can still undo that new stall. Enforce precedence at intent execution, cancel/reconcile the competing intent, or make Phase 5 arbitrate all staged-row T7 proposals. A late guard must also account for T7's in-memory effects, not just its queued cell. Entry-Cycle service latency is a sim decision; preserve the declared semantics explicitly.

## ASK 1 — attack results and limits

| Attack | Result against unchanged source |
|---|---|
| Three calls on one Proposed row, same Cycle | Stops at Funded. `LastStageChangeCycle >= cycle` blocks the second step (`civicInitiativeEngine.js:3150`). |
| Actual main-loop signing then retry in same Cycle | Funds once; signed-row skip follows the top handler (`:225–248,448–455`). |
| Vetoed row, later successful override | Top call does nothing while vetoed; override call funds with the **override Cycle**, even while MayoralAction remains vetoed (`:490–506,3133–3135`). Next Cycle reaches the top call before override-passed skip and may stand. |
| Delayed row retried | Top call does nothing while delayed; retry resets VoteCycle/Status (`:255–263`), successful signing funds in that retry Cycle. Old pre-retry work remains too old. |
| Old work predating funding | Refused by work ≥ stage-entry check (`:3083`). |
| Old work on Standing/Delivering, or work on stalled Funded | No revival in this cut: Standing/Delivering have no step; failing phases block Funded. A future revival must require work after stall entry and consume it once per stall. |
| Future work stamp | Accepted if the stage-entry Cycle is earlier than the current fire. No `LastWorkCycle <= current Cycle` check exists. Input-hardening gap; not evidence that the gate currently emits future stamps. |
| Very old work at/after funding | Still qualifies later because this cut has no expiry/stall implementation. Do not report this as accidental revival; the later losing-clock cut defines the boundary. |
| Name fallback mismatch | Reproduced, F3. |
| Clean carry through finalize and next two Phase-2 calls | Advanced count 1 then 0. The normal path works. |
| Interrupted producer / repeated consumer | Timing changes / repeated advancement emitted, F1. |
| Bench re-sync | Future stamp rejected; equal/older property survives, F2. |
| T7 and this cut's operational write | Same final value, one normal carried event; future stall collision remains, F5. |

**Local validation:** `node lib/initiativePhaseContract.test.js` → **80/80 passed**. An isolated Node/VM harness in `/tmp/codex-civic38-review.js` ran **17/17 checks** against unchanged engine functions, using visibly synthetic rows and fake Sheets/PropertiesService. The harness executes the actual main row loops with council outcome, mayor, clock-hold and consequence dependencies stubbed; it also executes the actual Phase-2 effect function, finalizer and carry loader. Its T7 tests force the predicate with synthetic data. The 17 checks assert the observed behaviors, including defects; they are not 17 acceptance passes for a repaired implementation. No complete engine entrypoint or Apps Script persistence call was executed. Temporary harness persistence is not required to retrieve the findings: each case, inputs, boundary and outcome are recorded above.

**Documentation checks:** review wikilinks resolve, the research index contains one entry, and the scoped diff passes whitespace validation. `node scripts/docLoopStatus.js --lint` reports an existing malformed `civic.39` row at line 170 (no clean state-token cell). That unrelated row is unchanged; this review does not claim a clean rollout lint.

## ASK 2 — verified observation boundaries

| Metric | Writer and persistence | What a fresh Phase-5 Sheet read can see in fire N |
|---|---|---|
| Neighborhood_Demographics.Sick | Phase 3 computes and directly calls batch writer (`phase03-population/updateNeighborhoodDemographics.js:278–279`); writer stamps LastUpdated and writes rows directly (`utilities/ensureNeighborhoodDemographics.js:325–350`) | N, if Phase 3 succeeded; partial rows if its per-row writes failed |
| Neighborhood_Demographics.SchoolQualityIndex | Education drift immediately precedes the same writer (`updateNeighborhoodDemographics.js:278`); quality persisted at `ensureNeighborhoodDemographics.js:329–336` | Also N, not N−1 |
| Neighborhood_Map.RetailVitality, NightlifeProfile | Phase-10 writer calculates final texture values, including modifiers/pulse/chaos, and writes `{Cycle, neighborhood, values}` (`phase08-v3-chicago/v3NeighborhoodWriter.js:494–540,560–583`); invoked at `phase01-config/godWorldEngine2.js:559–560` | Normally N−1; never assume that after a failed prior writer |
| Transit_Metrics.RidershipVolume | Phase-2 transit queues Cycle-stamped rows (`utilities/ensureTransitMetrics.js:449–473`); executor runs in Phase 10 (`godWorldEngine2.js:595,2330`) | Normally latest completed N−1 rows; select by Cycle and station, not merely last row |

Both entrypoints order initiative effects before transit, demographics, and the stage handler (`phase01-config/godWorldEngine2.js:293,304,314,355` and `:2042,2053,2063,2104`). The transit helper has a direct-append fallback when queueing is unavailable (`utilities/ensureTransitMetrics.js:475–478`); a comparator must validate source stamps rather than infer them exclusively from phase placement.

`previousCycleState.neighborhoodDynamics` is **not** the persisted Neighborhood_Map observation. Its compact fields are intermediate retail/nightlife factors (`phase09-digest/finalizeCycleState.js:94,566–580`), whereas the texture writer applies further computation and writes different final values in Phase 10. The snapshot has neither the required Sick/SchoolQualityIndex table nor station RidershipVolume values; `transitDisrupted` at `:173` is a boolean, not the gate metric. Adding an alias reader would silently compare different quantities.

## ASK 2 — recommendation and rejected alternatives

### Choose (c): evaluate the preceding committed cohort in early Phase 2; apply in Phase 5

At the start of fire N, before current-Cycle metric producers, read/freeze one observation cohort O=N−1. Use that same cohort for every domain, the initiative's target readings, and the city comparison population. Run the pure comparator there and pass an evidence-bearing verdict to the Phase-5 stage handler. Phase 5 must revalidate row identity, baseline version, current Stage/phase and verdict Cycle before applying it; it remains the sole stage writer. Do not introduce a second phase writer or let a stale verdict revive a stalled row.

For a new vote passed in Phase 5 of N, create the vote-origin baseline from the already-frozen O=N−1 cohort, recording **vote/capture Cycle N separately from observation Cycle N−1**. The descriptor's `cycle` must unambiguously mean the observation Cycle. This is the latest committed baseline available at the vote, not an observation of post-vote outcomes in N. For an override, use the override's effective funding Cycle. For conversion, origin is conversion and the capture Cycle is distinct from the source observation. Reuse a valid existing baseline; never rebase on revival. These details refine ruling 4 and must be recorded in the owning implementation contract when adopted.

**Critical condition:** one matching Cycle number is necessary, not sufficient. Phase 3 writes demographics directly, Neighborhood_Map writes directly during Phase 10, and transit appends later; any run can stop between them. Require all expected parent-hood/station rows, exact observation stamps, unique keys, finite readings and a receipt proving the required metric writers/readbacks completed for that cohort. If a crashed fire N has overwritten a current-state table while the counter remains N−1, the early read must reject the mixed N/N−1 tables, not call them committed. The existing carry is saved before ExecuteIntents, so it cannot certify those writes. `safePhaseCall_` continues after failures; even an advanced CycleCount alone is not that certificate.

If uninterrupted availability after partial writes is required, retain immutable verified observations by Cycle. Otherwise fail closed for that observation and report the gap. Do not reconstruct overwritten Sick or SchoolQualityIndex values from the wrong snapshot. This is new observation/publication work, not an existing capability claimed by this review.

**Timing:** a service that stands in Phase 5 of S first runs its Phase-2 service effects in S+1. Its first completed affected cohort is therefore S+1, available to the comparator at S+2. With H=3 and all first three eligible observations qualifying, Delivering applies in Phase 5 of S+4. An unavailable observation or a later effect adds delay. With a five-Cycle stall clock, comparator-versus-stall ordering must be pinned at the boundary; evaluate a valid delivery result before deciding that the same fire has exhausted the stage clock. Do not allow the untouched/pre-service cohort S to earn the first hold count just because it is newer than a vote baseline.

### Why not (a): per-metric labels document the asymmetry but do not remove it

Reading all Sheets at Phase 5 makes health/education available one fire earlier than retail/nightlife/transit. In S+1, health can count its first service observation while economic/transit can still be seeing the pre-service S values. H consecutive **engine invocations** would consequently mean different observation windows by domain, and retries could count the same observation twice. Target and median must at least share a source Cycle, but labeling those Cycles does not restore a common stage clock or protect direct-row partial writes.

Option (a) could be a deliberate design with domain-specific latency, eligibility and observation-keyed holds. That would reverse the common persistence-boundary requirement of the pre-mortem and change game timing; it is not the smallest faithful implementation of the current request. The two sports columns share one tab, which avoids their particular cross-tab skew, but does not resolve cross-domain fairness or retry safety.

### Why not (b) as written: neither supplied source is presently a complete prior observation

The existing carry lacks the required metrics and stores intermediate factors instead of final texture values. At Phase 5, selecting the "last committed" current-state demographic row still selects this fire's Phase-3 direct write; its N−1 row has been overwritten. Filtering for N−1 produces missing data, not a prior snapshot. Transit's append history is different, so applying one latest-row rule across domains is unsafe.

Option (b) becomes sound if a new versioned, verified snapshot is built from all final persisted observations **after** the relevant writes and carried as an immutable cohort. That requires publication/receipt and reset identity work; it cannot be obtained by adding fields to the current Phase-9 snapshot. Capturing prior committed rows early in Phase 2 is the simpler read boundary for this cut. Such a snapshot may later become option (c)'s storage implementation; the data contract is the same.

## Descriptor and hold contract for the next cut

Extend ruling 4's descriptor explicitly rather than overloading `cycle` or silently changing the metric:

- **Baseline identity:** schema version, initiative ID (or declared normalized fallback identity), catalog/metric-definition version, origin (`vote` or `conversion`), capture/effective-funding Cycle, observation Cycle, and world/reset generation. A generation mismatch makes the evidence unavailable; it never authorizes silent rebasing.
- **Measurement:** tab, columns, units and direction; fixed canonical parent-hood keys, or fixed station keys plus the authored station-to-target mapping; aggregation rule; complete city reference membership; per-key values, city medians and baseline ratios. Freeze target membership and detect changed reference membership instead of silently dropping missing rows. The current ruling's hood example does not itself define how station-level transit measurements become hood comparisons.
- **Observation proof:** successful cohort receipt and each table's actual source stamp. Missing, blank, non-finite, duplicate, zero-sample or mismatched-Cycle inputs are unavailable. Reject a zero/non-positive city denominator instead of dividing by it or replacing it with 1. A legitimate zero target reading remains zero.
- **Eligibility:** persist the service-start Cycle separately from baseline origin. Post-baseline is not necessarily post-service. Converted already-operating rows begin with later observations than their conversion baseline; new rows require a completed cohort exposed to the service.
- **Hold state:** separate from the immutable baseline, persist last evaluated observation identity/Cycle, qualifying streak, and comparator/dial version. Re-reading one observation cannot increment twice; a gap cannot be compressed into adjacent evidence. Missing or non-qualifying intervening observations break a claim of H consecutive qualifying Cycles. State how live margin/H changes affect an existing streak; do not combine evidence evaluated under different thresholds without an explicit rule.

Use the same cohort's target and median. For each column k, let Rk(O) be the mean, over the fixed target set, of `targetValue(k,O) / cityMedian(k,O)`. Upward gates require `Rk(O) - Rk(baseline) >= margin`; downward gates such as Sick require `Rk(baseline) - Rk(O) >= margin`. Require every gate column to pass in each observation; sports cannot accrue one retail streak and a disjoint nightlife streak and combine them. The 0.20 dial is an absolute change in this ratio, not a 20% raw-value move. These definitions make direction and units explicit; they do not change the builder's 0.20/H=3 ruling.

A city-median comparator can improve when the rest of the city deteriorates, and citywide treatment can move its own denominator. It measures relative observed performance, not causal attribution. Preserve the requested matched-control bench pair with identical starting state and randomness, including the same cohort identities, and measure each domain's reachability before trusting the gate. A correct reader does not prove that a service can reach the chosen margin.

## Next-cut acceptance cases

1. Normal fire and both entrypoints: identical observation cohorts, source values and resulting verdicts. Show Phase-3 N and Phase-10 N writes cannot enter an N−1 comparison.
2. Standing at S: no hold count from S; first eligible service cohort S+1; H=3 clears no earlier than S+4 under this recommendation. Pin the five-Cycle stall boundary and comparator precedence.
3. Repeat the same fire/cohort, crash before/after each metric writer and verdict persistence, and re-sync a bench with ahead/equal/older properties. No duplicate hold count, false history, or stale transition verdict.
4. Empty/malformed baseline; missing/duplicate rows; missing or zero median; valid zero target; changed target/reference membership; mixed table Cycles; missing expected station. Report unavailable instead of guessing.
5. Override funding, delayed passage, conversion twice, work used to stand followed by a later stall, valid revival without rebasing, and a threshold change during a hold.
6. Both sports columns must qualify together for the same H observations. Test a falling city median with initiative disabled. Run the matched-control causal proof for each enabled domain, not only a comparator fixture.
7. T7 already-stalled and **newly-stalled-in-Phase-5** cases through Phase 10; failed tracker write; carry producer crash; business consumer partial commit. Assert final Sheet state and effects, not only helper return values.

## Verified wiring pointers

This review proposes no engine diff. The table records the locally verified edges needed to assess it; it is not a new model-generated wiring run or a claim of production verification.

| Edge | Source pointer |
|---|---|
| Three stage call sites → shared direct tracker write | `phase05-citizens/civicInitiativeEngine.js:225,454,506,551` |
| Work requirement → stage step → carry producer | `phase05-citizens/civicInitiativeEngine.js:3083,3129–3191` |
| Approval's normalized key and current phase snapshot | `phase05-citizens/updateCivicApprovalRatings.js:458–469,982` |
| Carry snapshot → property/ring persistence | `phase09-digest/finalizeCycleState.js:112–120,447–483`; `phase01-config/loadPreviousEvening.js:125–141` |
| Property/ring reader → exact-age detector → advanced event | `phase01-config/loadPreviousEvening.js:159–186,276–279`; `phase02-world-state/applyInitiativeImplementationEffects.js:166–174,287–293,404,578–583` |
| Advanced event → business intent | `phase05-citizens/applyBusinessDynamics.js:475,566–569` |
| T7 competitor → Phase-10 intent execution | `phase02-world-state/applyInitiativeImplementationEffects.js:310–324`; `phase01-config/godWorldEngine2.js:595,2330` |
| Demographic direct write / final texture write / transit append | `utilities/ensureNeighborhoodDemographics.js:325–356`; `phase08-v3-chicago/v3NeighborhoodWriter.js:560–583`; `utilities/ensureTransitMetrics.js:449–478` |

**Not applicable / hazard:** no authorization to convert live rows, change Stage/phase, alter the 0.20/H=3 dials, decide Delivering's approval credit, or edit the carry loader is implied by this research. The plan's separate Delivering-phase/credit decision remains at `docs/plans/2026-09-19-civic-wake-game-loop.md:360`.

**Ignited plans:** none; findings belong to existing [[plans/2026-09-19-civic-wake-game-loop]] Task 4, tracked by civic.38. No parallel rollout row was created.

## Applications (living)

- 2026-09-21 (codex) — Second opinion requested for live-inert first cut `7268a284` and the next Delivering/baseline cut.

## Changelog

- 2026-09-21 (codex) — Reviewed call-site, carry, crash/reset and T7 attacks; reproduced edge failures locally; recommended a verified prior-cohort Phase-2 comparator with Phase-5 stage ownership.
