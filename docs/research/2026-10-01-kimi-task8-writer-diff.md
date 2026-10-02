---
title: engine.254 Task 8 writer side — adversarial diff review (0f7db949)
created: 2026-10-01
type: research
tags: [engine, care-justice, review, kimi]
sources:
  - docs/plans/2026-09-21-care-and-justice-system.md §Task 8 cut Revision 2 (R2-1 (a)–(d), decision 7, decision 12/F1), §Hospital_Ledger schema L–P
  - phase10-persistence/buildCyclePacket.js (persistHospitalLedger_, persistJudicialLedger_, new helpers), phase05-citizens/judicialLifecycle.js, phase02-world-state/applyInitiativeImplementationEffects.js, phase04-events/careJusticeService.js — read in full for this review
  - phase04-events/chaosCarsEngine.js, phase04-events/generationalEventsEngine.js — every hospitalEvents/judicialEvents producer, traced to the push
pointers:
  - "[[plans/2026-09-21-care-and-justice-system]] — the plan under review"
  - "[[research/2026-09-30-kimi-task6-cut]] — prior lane review in this series"
---

# engine.254 Task 8 writer side — adversarial diff review (0f7db949)

**Verdict: SHIP.** One Medium finding (1) — a stated invariant the code only half-implements, unreachable on live today, three-line fix that should fold into the census-side build of Task 8. Nothing found that corrupts a ledger, mislabels a reachable row, weakens a test, or breaks at load time. All three claimed suites re-run green locally: hospitalIncomePersistence 79, judicialLifecycle 149, careJusticeService 23. HEAD (`740d04a6`) touches none of the reviewed files, so line numbers below are current.

**Scope:** read-only review of `0f7db949` against plan §Task 8 Revision 2, R2-1 writer changes (a)–(d), decision 7 (row id checked against every id in the tab) and F1 (shared phase helper). Hunted, per brief: trick code / weakened asserts / silent fallbacks; live reachability of the new pre-write throw; the one-row-per-SourceEventId `continue`; L–O header assert false positives; judicial ArrestCycle/DecisionCycle overwrite paths; F1 equivalence with the two replaced loops; godWorldEngine2.js load-order exposure.

## Findings

### 1 — MEDIUM: "fails the writer before any write" is only true for the missing-SourceEventId case; the unknown-IntakeType throw fires mid-loop, after earlier writes

The pre-write pass at `phase10-persistence/buildCyclePacket.js:919-923` validates only `sourceEventId`. The type check runs at `:967` (`hospitalIntakeType_(ev.intakeType)`) inside the per-event loop — after earlier events in the same batch have already been written (`:944` transition `setValues`, `:971` `appendRowWithRetry_`). With events `[validIntake, badTypeIntake]`, the valid row lands in the tab, then the writer throws: half the Cycle's rows written plus `careJusticeWriteStatus.hospital = 'failed'` (`:82-86`). The commit message and plan line 878 both state "an intake receipt with no SourceEventId **or an unknown type** fails the writer before any write" — the implementation hoisted only the first condition. The test named `T8 an intake without SourceEventId, or with an unknown type, fails the writer before any write` asserts the nothing-written property only for the SourceEventId case; for the unknown type it asserts only that the writer throws, with the bad receipt as the sole event — a mid-loop throw passes it.

Unreachable on live today: all three intake producers emit only `injury`/`illness`/`heat` and always stamp an id (`chaosCarsEngine.js:444,689-691`; `generationalEventsEngine.js:357-358,706-708`), and a blank type maps to `unclassified`, never a throw. It becomes live the day a producer emits a type the enum doesn't know — the OARI `mental-health-crisis` / `substance-treatment` intakes and the judicial transfer are exactly that future producer. Failure mode then is loud (Engine_Errors + failed flag + missed-admission reconcile heals the skipped patient), not silent corruption. Fix: hoist `hospitalIntakeType_` validation into the `:919-923` loop — three lines. Recommend folding it into the census-side build of Task 8, which touches this writer again.

### 2 — LOW: the dup-SourceEventId `continue` leaves the bed to the missed-admission pass, which labels it `reconcile` — verified this is the designed outcome and unreachable as a mislabel on live

`buildCyclePacket.js:960-963` skips before `openByPopId[key]` is set. If the citizen is a patient, the missed-admission pass (`:1049-1067`) then writes their bed as `unclassified` / `reconcile` / `reconcile:C<cycle>:unclassified:<POPID>` — a row the R2-1 census reads as a correction, never an intake, and `admitsThisCycle` is not incremented (asserted by test). Traced every way the skip can fire: the matching row already exists in the tab, so the only triggers are (a) a Cycle re-run after ledger writes — engine.275 refuses that on live, bench hand-reset only, and there the existing row makes the skip correct; (b) two distinct real events sharing an id — every producer id embeds cycle + type + POPID, an ambulance double-hit is blocked by the `''/active/recovering` flip guard (`chaosCarsEngine.js:426`), heat splices picked victims (`generationalEventsEngine.js:319-322`), generational health touches each row once. No row that must be written is skipped, and R2-3's completeness cross-check (receipt → a row with that SourceEventId) still matches the pre-existing row, so the skip reads `complete`, consistently.

### 3 — LOW: missed-admission pass never checks `hospitalEventIds` before appending

`buildCyclePacket.js:1056-1060` sets `hospitalEventIds[mEventId] = true` after the append but never tests it — asymmetric with the event loop's invariant-D check at `:960`. A duplicate reconcile id needs a same-cycle reconcile row that is closed yet the citizen still a patient; inside one run every written reconcile row is open and indexed into `openByPopId`, so the pass skips. Noted for the census-side build only.

### 4 — LOW: regenerated stub map claims a read the function doesn't make

`docs/engine/ENGINE_STUB_MAP.md` now lists `persistHospitalLedger_` as "Reads: S.absoluteCycle, S.careJusticeWriteStatus, S.cycleId, S.hospitalEvents". The function never reads `S.careJusticeWriteStatus` — the generator picked up the mention in the comment at `buildCyclePacket.js:918`. The flag is written by the caller (`:82-86`). Generated-doc noise, not a code defect; will regenerate away if the comment is reworded.

### 5 — INFO: pre-write SourceEventId throw is dead code on live by construction — as designed

Every producer stamps before push: ambulance receipts are stamped at `chaosCarsEngine.js:689-691` after the payload `eventId` is drawn and before `hospitalEvents.push` (`:692-693`); heat intakes carry `'heat-wave:C'+cycle+':heat:'+pop` (`generationalEventsEngine.js:358`); ordinary-health intakes carry `'health-engine:C'+cycle+':'+type+':'+pop` (`:708`). Transition receipts carry blank ids by design and are routed to the reconcile-event-id path, never to the throw. No producer can fail the writer on live; the throw is a fence for future producers, which is what R2-1 asked for.

### 6 — INFO: judicial ArrestCycle/DecisionCycle — no overwrite path found

The open-row intake branch (`buildCyclePacket.js:1149-1159`) stamps only when `ev.kind === 'intake'` **and** `ev.arrestCycle` is a non-empty value; `DecisionCycle` rides along only then (`:1158`). Every open-row-intake shape traced:

- **Conversion** (`judicialResolveInvestigation_`, `judicialLifecycle.js:76-86`): the investigation row's `ArrestCycle` is blank by construction (`openCaseFromReceipt_:225` sets it only for `arrestOnOpen` types), the step fires once (`advanceCase_:261` blocks a same-cycle repeat), and the receipt carries the stamps via `judicialLifecycleReceipt_:460-470`. Nothing real is overwritten — this is the R2-1 (c) fix working.
- **Cross-cycle re-arrest** (chaos receipt, `chaosCarsEngine.js:465-473`): no `arrestCycle` property at all → guard skips; the original arrest stamp survives (test-locked: "re-arrest on an open case leaves ArrestCycle and DecisionCycle alone").
- **Same-cycle re-arrest**: rewritten to `kind: 'transition'` by `admitJudicialReceipt_` (`judicialLifecycle.js:186-194`) → never enters the intake guard.
- **Custody reconcile** (`judicialLifecycle.js:521-526`): hand-built without `arrestCycle` → guard skips; on a bench replay the case row already exists open, so no receipt is re-emitted at all.

Exit/transition lifecycle receipts now also carry the two fields (the receipt builder adds them unconditionally), but the writer reads them only in the intake branch. Dead weight on the receipt, no hazard.

### 7 — INFO: L–O header assert cannot fire on a healthy tab

`buildCyclePacket.js:907-911` exact-matches `IntakeType, SourceSystem, SourceEventId, TransferFromId` at L–O — the order the plan's §Hospital_Ledger schema records and the order PROD/SANDBOX carry. Mismatch is the only throw path; a ragged header row throws by design (fail-loud); columns beyond P are ignored. The pre-existing `PriorStatus`-at-P check (`:902`) runs first and is consistent with it. Old live rows (POP-00801's) are 16-wide with blank L–O and PriorStatus at P — the blank-cell guard at `:915` skips them, so historical rows coexist with invariant D. The test-mock header change (from a `Kind`-at-L pre-schema order to the live order) is a correction of a mock that had drifted to a schema that never shipped — not a weakened assert; the new assertions are `deepStrictEqual` over full L–P row slices.

### 8 — INFO: F1 helper vs the two replaced loops — equivalent for every reachable input, one locked improvement

`initiativePhaseIntensity_` (`applyInitiativeImplementationEffects.js:167-174`) keeps exact-key-first, then first-contained-key in table order. The removed engine loop had no `hasOwnProperty` and the removed exact lookup was a plain `PHASE_INTENSITY[phase]` — so a phase containing an Object.prototype name (`'constructor'`) old-matched to a Function: a truthy "intensity" that `careJusticeService` would have read as positive deployment. The helper returns 0 and the new test locks `f('constructor') === 0`. No phase string in the table is affected; iteration order is identical (same object, insertion order, both old loops); the engine's phase is always a lowercased string (`:422`), so the old code's latent null-`indexOf` TypeError was unreachable and the helper's normalization changes nothing reachable. `PHASE_INTENSITY` binding retained at `:362` for the `prevPhase` check at `:515` — plain-lookup semantics, unchanged. The `typeof initiativePhaseIntensity_ !== 'function'` guard at `careJusticeService.js:73-75` fails loud if the phase02 file ever drops out of a deployment.

### 9 — INFO: load order and global collisions — clean

The new globals (`hospitalIntakeType_`, `hospitalReconcileEventId_`, `careLedgerRowId_`, `hospitalRowId_`, the two `HOSPITAL_*_` constants, `initiativePhaseIntensity_`) are file-scope function declarations referenced only at cycle-run time; under GAS concatenation that resolves for every caller. `godWorldEngine2.js` references none of them (grep clean), and no duplicate definitions exist anywhere in `phase*/` or `utilities/` (grep clean). The three test harnesses wire the new cross-file globals explicitly (`careJusticeService.test.js` sets `global.initiativePhaseIntensity_` from the phase02 vm box).

### 10 — INFO: test quality spot-check

New tests assert persisted state, not source shape, with one exception: the F1 "both callers read the one helper" check is a source-regex test — acceptable here because the regression it guards (one caller re-growing its own substring loop) is exactly the kind that stays green under behaviour-only tests. The T8 hospital tests exercise each producer class's stamps, the reconcile no-event id form, transition-without-open-row as reconcile, dup-id skip with `admitsThisCycle === 0`, id suffix `-2`/`-3` in both tabs, and the header-misplace throw. Judicial tests lock conversion stamps persisted on the open row, re-arrest stamp preservation, one-case-per-SourceEventId, and the `-2`/`-3` CaseId suffix against pre-existing rows. The only overclaim is finding 1's test name.

## Residual for the census-side build

Fold the finding-1 hoist into the Task 8 census commit (validate `IntakeType` in the pre-write loop at `buildCyclePacket.js:919-923` and extend the T8 test to `[validIntake, badTypeIntake]` asserting nothing was written). Findings 2–4 are notes for that same commit; nothing here blocks benching the writer side as built.
