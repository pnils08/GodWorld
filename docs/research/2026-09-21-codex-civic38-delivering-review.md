---
title: civic.38 Delivering cut — Codex adversarial review
created: 2026-09-21
updated: 2026-09-21
type: reference
tags: [research, civic, engine, active]
sources:
  - commits 9b81a08a and 411b9e69 — civic.38 Task 4 part 2
  - lib/initiativePhaseContract.js
  - phase05-citizens/civicInitiativeEngine.js
  - phase05-citizens/updateCivicApprovalRatings.js
  - phase01-config/godWorldEngine2.js
  - utilities/ensureNeighborhoodDemographics.js
  - output/engine-sheet/2026-09-21-matched-control-c108-c112.json
pointers:
  - "[[index]] — research registration"
  - "[[../plans/2026-09-19-civic-wake-game-loop]] — existing civic.38 owner and rulings"
  - "[[2026-09-21-codex-civic38-stage-handler-review]] — prior ASK 2 contract"
  - "[[../mara-vance/INITIATIVE_TRACKER_CONTRACT]] — descriptor and hold columns"
---

# civic.38 Delivering cut — Codex adversarial review

**Source and scope:** builder-authorized second opinion on `9b81a08a` + `411b9e69`, inspected at HEAD `411b9e69`. The four requested source files have no subsequent working-tree changes. All file:line references below refer to this checkout. Engine and external state remained read-only: no engine edits, Sheet writes, deployment, or fire. The builder explicitly requested this research path and its index registration; this review creates neither a parallel plan nor an inbox copy.

**What this addresses:** whether the prior-cohort implementation satisfies the earlier ASK 2 option (c), particularly under retries, failed persistence, stage changes and live dial changes. This is a correctness review, not evidence of a production failure.

**What it does:** Phase 2 freezes the preceding Cycle's metric rows; Phase 5 builds an immutable baseline, evaluates the relative edge and persists a separate observation streak. First delivery preserves `operational`, stamps a forward-stage Cycle and `StageHold.first`; approval maps that first-delivery Cycle to the existing completion award. Regression preserves the upkeep reference.

**Verdict: adopt** the corrections below into existing civic.38. The normal single-attempt path and arithmetic are coherent. The implementation does **not** yet satisfy the earlier contract's publication-receipt or exactly-once award boundary. Two high-consequence failure paths reproduce locally. No new rollout row is warranted for this review of the existing task.

## Findings ranked by consequence

### F1 — HIGH: first-delivery identity is not a payout receipt; completion credit can duplicate or disappear

**Pointers:** `phase05-citizens/updateCivicApprovalRatings.js:489` selects `completed` solely when `StageHold.first === cycle`; `:1027` parses the first-delivery Cycle without consulting payment state; `:1128` awards the owner +3. Approval reads the current ledger at `:538` and queues an absolute replacement at `:929`. The tracker persists independently at `phase05-citizens/civicInitiativeEngine.js:552`. Intents execute at `phase01-config/godWorldEngine2.js:598`, before the counter's cache flush at `:624`; phase exceptions are caught and execution continues at `:159`. The executor accumulates per-sheet errors rather than rolling back at `phase10-persistence/persistenceExecutor.js:123`.

**Reproduced against the full approval function:** synthetic owner approval 50, an operational initiative with `StageHold={v:1,first:115}`, and no other approval contribution. Call at C115 queues 53. Apply that intent to the fake ledger; call C115 again and it queues 56, both with the completion reason. The row's hold is unchanged. Separately, leave approval at 50, skip the C115 payment, and evaluate C116: no completion credit is queued.

**Reachable failure windows:**

- Approval lands at Phase 10, then the process is killed before the counter flush/readback repair. Re-firing C115 reads the already-increased ledger and pays again. An ordinary completed C116 does not repeat it; this requires a repeated Cycle identity or repeated approval invocation after persistence.
- The tracker delivery write succeeds, but approval calculation or its queued write fails; the counter still advances. `first` is now behind the current Cycle forever, so the award is lost. This needs no hard process kill: the phase/executor failure handling permits partial success.

The `StageHold.obs` dedupe correctly prevents another **hold count**. It does not acknowledge an approval payment. A full retry may have an unavailable metric cohort and still repay, because approval reads `first` independently. The existing test at `lib/initiativePhaseContract.test.js:462` matches the completion expression with a regular expression; it does not execute this persistence seam.

**Correction boundary:** carry a pending completion event until its recipient writes are durably acknowledged, with an idempotent application identity tied to the initiative and first delivery. A standalone paid flag written before or after the award would leave one of these two windows open. Do not relabel `first` as proof of payment. This is the new award's exposure to the same non-atomic run boundary noted in the earlier review, not a claim that the whole engine currently guarantees transactions.

### F2 — HIGH: identical Cycle stamps can certify a mixed-attempt cohort after a failed retry

**Pointers:** `phase05-citizens/civicInitiativeEngine.js:3390` claims stamp coverage is the receipt; `:3458` checks only the Cycle number and `:3467` checks the current canon count. `utilities/ensureNeighborhoodDemographics.js:312` seeds each row from existing values, `:325`–`:336` writes health/education readings and the Cycle, and `:350` persists rows one at a time. `phase01-config/godWorldEngine2.js:159` allows the remaining phases to continue after that writer throws; `:624` flushes the counter later.

**Reproduced using the actual demographics batch writer and actual freeze function with fake Sheets:**

1. Three synthetic parent rows already have Sick 100 and stamp C114 from attempt A; the counter has not committed that attempt.
2. Retry C114, attempt B. Its recalculated rows have Sick 5. Let the real writer persist the first row and throw on the second.
3. The persisted values are now `5/100/100`, all stamped C114. The safe phase boundary can continue and commit the counter to 114.
4. At fire C115 the real freeze function accepts the whole tab. Against a synthetic baseline of 100/100/100 it yields a target edge of **0.95**, although the rows come from two attempts.

This does not require guessing how an individual `setValues` call behaves: the batch writer makes separate calls. Attempt B can differ because its inputs include state already changed by attempt A; seeded randomness does not restore those inputs.

**What works:** one row stamped C115 among C114 rows is rejected. A whole tab stamped C115 at a retry of fire C115 is also rejected, conservatively losing the overwritten C114 observation. Duplicate parents, missing parent coverage and unavailable metrics fail closed. The failure above is the case where all stamps agree while attempt identity does not.

**Correction boundary:** the earlier ASK 2 required a completed observation publication/readback receipt (`2026-09-21-codex-civic38-stage-handler-review.md:132`), explicitly warning that an advanced counter is insufficient. The cut implements the early read and row validation, but omits that receipt. A fresh attempt must invalidate any previous publication for the Cycle before writing, and publish only after verifying the required cohort; alternatively consume an immutable verified observation snapshot. A receipt that only says “Cycle 114 succeeded once” would still accept a later partial overwrite. Bench reset identity also belongs in the publication identity if snapshots or receipts survive a re-sync.

### F3 — MEDIUM: delivery resets eligibility and discards an already-served observation

**Pointers:** `phase05-citizens/civicInitiativeEngine.js:3593` always supplies `LastStageChangeCycle` as `eligibleAfter`; `:3602` resets that value on delivery. `lib/initiativePhaseContract.js:567` rejects every observation at or before that stamp, before updating the hold.

**Reproduction:** a Standing row delivers at fire C115 from qualifying observations C112–C114. It stays operational throughout C115, so the C115 metric is a real service observation. Force edges below the regression bar at C115, C116 and C117. Fire C116 skips C115 entirely, retaining `hold.obs=114`; fires C117/C118 have only down=1/2. Regression occurs at C119 after observation C118, rather than C118 after the first three low observations. The real applier reproduces this.

The original exclusion is correct for **stand-up**: Phase-5 stand-up at S cannot affect Phase-3 metrics of S. Delivery is different: the service already existed in Phase 2 of the delivery Cycle. A forward-stage upkeep reset is intentional, but it should not silently create an observation holiday. The test sequence at `lib/initiativePhaseContract.test.js:407` includes the skipped fire without asserting that its observation was consumed.

**Correction boundary:** separate first-service eligibility from the upkeep/stage-change timestamp, or explicitly allow post-delivery observations according to the service history and dedupe key. Preserve the intentional delivery reset of tend. If this one-Cycle regression grace is desired simulation behavior, rule and document it as such; it does not follow from H consecutive observations alone.

### F4 — MEDIUM, triggered by live tuning: changing the regression share retains evidence judged under another bar

**Pointers:** `lib/initiativePhaseContract.js:550` retains only `m` for dial identity; `:569` resets on a changed margin; `:582` compares against the current `margin * regressShare`. The engine reads current dials at `phase05-citizens/civicInitiativeEngine.js:3497`. `phase01-config/engine94SheetContract.js:147` seeds the share as an open simulation call.

**Reproduction:** margin 0.15, H=3, Delivering. With share=1, two observations at edge 0.10 produce down=2. Lower share to 0.5; one observation at 0.05 causes regression. Only the last observation was below the new 0.075 bar. The first two would have held under that bar.

The requested **margin-change** attack passes: changing 0.15 to 0.18 on the next distinct observation resets up/down and then counts that observation as the new streak's first. A dial edit on the already-counted observation does not reopen it; the next observation sees the reset. Missing evidence and Cycle gaps also break the streak.

**Correction boundary:** persist the effective regression threshold or comparator/dial version, or define an explicit live-tuning rule permitting old evidence. H changes also take effect immediately against the existing count; unlike changing a bar this need not invalidate the readings, but the policy should be explicit. No fixed-dial bench result disproves this tuning case.

### F5 — LOW, schema-change trigger: `cityN` freezes city size, not city membership

**Pointers:** `lib/initiativePhaseContract.js:478` records `cityN`; `:499`–`:500` compares only row counts. Target membership is correctly frozen by `keys` and checked at `:521`. Freeze checks against the **current** canon at `phase05-citizens/civicInitiativeEngine.js:3455` and `:3467`.

**Reproduction:** build a three-parent baseline targeting Synthetic A. At a later observation, replace non-target Synthetic C with Synthetic Replacement, preserving three rows. `deliveryEdge` returns available; a changed city reference of equal size is undetected. The engine wrapper would likewise accept this if the canon itself were changed to the replacement set. This is not a defect in normal operation with a stable canon or a claim of an actual canon edit.

**Correction boundary:** if the plan's “changed reference reads unavailable” guarantee (`docs/plans/2026-09-19-civic-wake-game-loop.md:365`) is intended literally, retain sorted city member keys or a membership fingerprint. Otherwise narrow that guarantee to size changes; target membership is already stricter.

## Attacks that did not establish another defect

| Attack | Verified result and limit |
|---|---|
| Three call sites / veto / delayed retry | The early call is at `civicInitiativeEngine.js:226`, signing at `:455`, override at `:507`. Only a passed signed or override-passed row moves; same-fire funding cannot stand (`:3297`, `:3314`). Synthetic executions of the actual main loop for signing, override and delayed retry fund once, remain Funded on repeat, and stand next Cycle after work. Repeated orchestration after delivery also changes nothing. |
| Hold re-fire | `deliveryHoldStep` refuses `obs <= state.obs` at `lib/initiativePhaseContract.js:564`. A persisted observation is not counted twice, even if the retry's metric read is now unavailable. This is hold idempotence, not F1 payout idempotence or F2 observation provenance. |
| Regression does not stamp LastStageChangeCycle | Correct under the upkeep ruling. `civicInitiativeEngine.js:3603` changes Stage only; the hold records `regressed` at `lib/initiativePhaseContract.js:590`. The synthetic applier preserves both the old stamp and `tendFactor` across regression. It neither repairs neglect nor rebases the immutable baseline. The field's name now means the last forward stage change for this purpose, not every stage change. |
| Baseline | The descriptor separates observation/capture Cycles, freezes folded targets, retains legitimate zero target values, refuses missing readings and nonpositive medians, and is never rewritten once populated (`lib/initiativePhaseContract.js:430`, `civicInitiativeEngine.js:3523`). A delayed first stamp can include existing service effects; the conversion-at-plateau limitation is already recorded in ruling 12. |
| Phase ordering | Both entry points freeze immediately before initiative effects (`godWorldEngine2.js:295`, `:2047`), ahead of Phase-3 demographics (`:317`, `:2069`). The arithmetic is executed later in Phase 5 on the frozen object, so it does not mix same-fire Sick with prior-fire metrics. Phase 5 remains the tracker writer. This implements the timing portion of option (c), subject to F2's receipt gap. |
| T7 / Baylight | No new Delivering collision in this cut: Standing sports is refused by `stageRequirementWith` (`initiativePhaseContract.js:352`); delivery/regression write Stage, not ImplementationPhase. Existing T7 still queues `operational` for every matching phase except operational/complete (`applyInitiativeImplementationEffects.js:377`–`:395`), including a staged stalled row. The prior review's Phase-10 overwrite hazard remains for the unbuilt stall cut; this review does not call it repaired. A Funded→Standing operational write agrees with T7. |
| Transit | Playable does not imply a reader. Standing transit is blocked as `no-delivering-reader` at `initiativePhaseContract.js:362`; no station/hood relationship is inferred. No transit delivery claim is supported by this health bench. |

## Bench evidence: agreement and limits

The dispatch reports SANDBOX 0908 @83, fixture INIT-902 health/Laurel Standing@108, delivery at fire C115 and completion paid once. That is **builder-supplied bench evidence**, not a deployment or Sheet readback independently performed by this review. The checked-in plan at `docs/plans/2026-09-19-civic-wake-game-loop.md:382` contains predictions, while its changelog at `:429` still says NOT benched. The newer dispatch supersedes that older status report; this review leaves the owning plan untouched. A saved @83 readback was requested during review but was not available in the inspected evidence at filing time.

The existing saved matched-control artifact, `output/engine-sheet/2026-09-21-matched-control-c108-c112.json:1`, is a different run (@80). Replaying its stored demographics through the current `stageBaselineFrom` and `deliveryEdge` exactly reproduces ruling 18:

| Observation | Treatment edge against own C108 baseline | Control edge against own C108 baseline |
|---|---:|---:|
| C109 | 0.056509 | -0.037241 |
| C110 | 0.119647 | -0.062176 |
| C111 | 0.139950 | -0.039485 |
| C112 | 0.170878 | -0.015570 |

Therefore margin 0.15 first counts C112 at fire C113. If observations C113 and C114 also clear, C115 delivery is consistent. This saved artifact stops at C112; it cannot independently prove those last two observations or the @83 payment. It omits per-row demographics stamps, so replay establishes arithmetic, not the freeze's publication guarantee.

I disagree with three extensions of the evidence, not with the reported normal-path result:

- “Paid once” across distinct successive Cycles does not prove retry-safe or recoverable payment (F1).
- An uninterrupted healthy cohort does not prove rejection of same-Cycle mixed attempts (F2), and a first-delivery bench does not test regression timing (F3) or changing dials (F4).
- The older matched-control prose at plan `:395` says margin 0.15 clears on the second Cycle. That uses clinic-minus-control, not the implemented own-baseline edge; ruling 18 correctly supersedes that reading. Neither measurement proves education/transit or the refused retail domains can deliver.

The fixture starts **already Standing and operational**, with a blank baseline. It proves the conversion-baseline path described in ruling 19. It does not by itself prove a new proposal's whole vote→Funded→work→Standing history, which has different baseline timing.

## Local validation and reproduction boundary

- Existing suites on unchanged source: `node lib/initiativePhaseContract.test.js` **172/172**, `node scripts/civicApprovalCeiling.test.js` **102/102**, `node scripts/civicStageBoard.test.js` **12/12**.
- Isolated `/tmp/codex-delivering-review-probes.js`: **8/8 probe groups**, including the actual initiative row loop, actual approval function, actual demographics row writer, cohort freeze and pure comparator. All synthetic names, rows and mutations live in fake in-memory Sheets. The writer deliberately throws on its second row for F2; approval intents are applied only to the fake ledger for F1. Assertions reproduce observed defects; they are not acceptance tests for repairs. Inputs and outcomes needed to reconstruct them are recorded above, so the temporary harness is not the durable handoff.
- The preceding first-cut temporary harness was also attempted; its old fake schema lacked `StageHold` and stopped on an unsupported `getLastColumn` mock call after one check. It is not counted as a passing suite here. Relevant main-loop cases were rebuilt in the current eight-group harness with the current stage columns.
- No full engine entrypoint, Google service, live data mutation, or sandbox fire was executed. No engine-wiring model call was needed for this read-only source review. The unchanged library's mirror/parity checks passed.
- Documentation validation: `git diff --check` clean. `node scripts/docLoopStatus.js --lint` reports the pre-existing civic.39 row at `docs/engine/ROLLOUT_PLAN.md:173`, whose `draft` state is invalid. This review changes no rollout row and leaves that unrelated defect untouched.

**Not applicable / hazard:** this report does not choose the still-open regression share, the upkeep/stall timing dials, or the conversion mapping. Fixing F1/F2 requires explicit persistence design, not a claim that another helper-level passing test creates exactly-once semantics. Existing blank-Stage production rows remain outside the new stage model.

**Ignited plans:** none new. Findings feed [[../plans/2026-09-19-civic-wake-game-loop]], existing civic.38 Task 4.

## Applications

- 2026-09-21 — Codex second opinion on the Delivering cut, filed at the builder-requested path for engine-sheet review.

## Changelog

- 2026-09-21 (codex) — Reviewed 9b81a08a + 411b9e69; reproduced payout and cohort retry failures, regression timing and dial/membership limits; registered with local validation evidence.
