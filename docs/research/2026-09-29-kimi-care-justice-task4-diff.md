---
title: Adversarial review — care-and-justice Task 4 diff (typed admission receipts)
created: 2026-09-29
type: research
tags: [engine, review, care-and-justice, engine.254]
sources:
  - Uncommitted working-tree diff: phase04-events/chaosCarsEngine.js, phase04-events/generationalEventsEngine.js, scripts/chaosCarsCitizenDial.test.js, scripts/hospitalIncomePersistence.test.js
  - docs/plans/2026-09-21-care-and-justice-system.md §Task 4 cut — typed admission receipts
---

# Adversarial review — Task 4 typed-receipt diff (kimi, 2026-09-29)

**Verdict: SHIP.** The diff implements the cut as specified. No weakened or
tautological asserts found, no silent fallback that hides an admission, no rng
reordering, no zero/two-receipt path, no eligibility drift. Three low-severity
findings below, none blocking; two are explicitly deferred by the spec itself.

**Validation run (this lane, local, read-only):** `chaosCarsCitizenDial` 27/27,
`hospitalIncomePersistence` 48/48, `hospitalTalkback` 24/24,
`careJusticeAccounting` 55/55, `auditFunctionCollisions` 0 across 1461 names.

## What was checked and found clean

- **Guards unchanged.** Chaos admit guard still `''`/`active`/`recovering`
  (phase04-events/chaosCarsEngine.js:348); receipt built only inside the branch
  that flips Status, so a retiree or a `critical` citizen yields `null` — tested
  (T4-6, and T4-12's three identical ambulance events produce exactly one
  receipt: the second and third hits find the citizen already `critical`).
  Heat guard unchanged at generationalEventsEngine.js:284-289 (`''`/`active`/
  `recovering`, age ≥ 70); `vIntake = vPrior !== 'recovering'` can therefore
  never mislabel a `hospitalized`/`critical` victim as an intake — the guard
  excludes them upstream.
- **No rng-order change.** No new `rand_`/`chance_`/rng call anywhere in the
  diff; the chaos `eventId` is still drawn after `writeCitizenEvent_` returns
  (chaosCarsEngine.js:573, payload construction at :575-590). T4-12 pins the
  full draw sequence (39 draws, three exact eventIds).
- **Ordering honored.** Receipt is pushed only after `writeChaosCarsRow_`
  (chaosCarsEngine.js:598-604). A payload throw leaves Status flipped with no
  receipt, and the missed-admission reconcile books it as a correction — both
  halves tested (chaos T4-9; persistence T4-9 against
  phase10-persistence/buildCyclePacket.js:974-988).
- **Zero/two-receipt paths.** Per event, one `writeCitizenEvent_` call, one
  receipt max; the receipt dies with a pre-push throw. Same-cycle Phase-5
  lifecycle step on the same citizen yields intake + transition, which the
  persist resolves open-then-close on one row (T4-2 exercises exactly the
  ambulance → same-Cycle-death defect from the cut: one row, closed `deceased`,
  `deathsThisCycle` 1).
- **Deceased guard is real and discriminating.** The same-pass death guard
  (generationalEventsEngine.js:607-608) is NOT part of this diff — already
  committed as 4c9bf010 — and T4-10 would fail without it (it counts
  `checkHealthEvent_` invocations, not just outcomes).
- **Kind contract honored at the fold.** Transitions are dropped before the
  SourceEventId check (utilities/careJusticeAccounting.js:83-90), so blank-key
  transitions never collide; every intake site stamps a key — chaos by the
  caller (intake-only stamp at chaosCarsEngine.js:600), heat and health-engine
  inline. T4-11 is a real assertion against that contract.
- **Test stubs match real signatures.** `chaosOutcomePool_(vehicle, scope)`,
  `validateOutcome`, `validateAllChaosConfigs_`, `writeChaosCarsRow_` are
  externals of chaosCarsEngine.js (not defined in-file), so the global stubs in
  chaosCarsCitizenDial.test.js bind the real call sites. The mock Hospital_Ledger
  in hospitalIncomePersistence.test.js reproduces the writer's 1-based range
  writes; the open-row fixture mirrors the live 11-column shape.

## Findings (low severity, none blocking)

1. **`kind` is advisory until Task 8 — two mismatches possible in the interim.**
   `persistHospitalLedger_` never reads `ev.kind`
   (phase10-persistence/buildCyclePacket.js:873-915): an `intake` receipt for a
   citizen with a stale open ("ghost") row is booked as a transition — the old
   row keeps its old AdmitCycle and `admitsThisCycle` does not move — and a
   `transition` receipt with no open row appends a fresh row and counts an
   admit. Ghost rows are not hypothetical (the in-code comment at
   buildCyclePacket.js:924-930 records 5 of 14 open beds phantom on bench
   C111). The spec defers all writer changes to Task 8, so this is
   accepted-interim; the C110 smoke-test note should say that receipt `kind`
   and ledger behavior can diverge until then.
2. **Ordinary-health receipt breaks the cut's own "row is the authority" cause
   rule.** Chaos and heat read the row's HealthCause after the write
   (chaosCarsEngine.js:363; generationalEventsEngine.js:324); the
   ordinary-health site pushes the local `cause102` even though the row write
   is conditional on a blank cell (generationalEventsEngine.js:655-662). If an
   admitted citizen carries a stale non-blank HealthCause, receipt and row
   disagree, and the persist's blank-only backfill keeps the old prose on the
   ledger. Edge-case only (the lifecycle clears HealthCause on return to
   `active`, generationalEventsEngine.js:431-433); a one-line change to read
   `row[iHealthCause]` after the conditional write would align it with the
   other two sites.
3. **Heat-site fallback prose can mislabel a transition's cause.**
   generationalEventsEngine.js:324 falls back to `'heat exhaustion during the
   heat wave'` when the HealthCause column is missing — on a `transition`
   receipt that is intake prose, and the persist would backfill it into a blank
   cause cell of an existing episode. Requires a missing HealthCause column, so
   not reachable in the live schema; the chaos site's blank fallback is the
   safer shape.

## Test-hygiene notes (not defects)

- T4-12 (scripts/chaosCarsCitizenDial.test.js:185-196) re-implements both the
  fixture rng and `chaosEventId_`'s alphabet to predict the draw sequence. It
  is a genuine ordering canary going forward, but brittle by design: any
  legitimate future change to text generation or impact sampling will break it
  with no bearing on receipts.
- The T4-run stubs neutralize the no-death defence-in-depth checks
  (`validateAllChaosConfigs_`, `validateOutcome`) inside that test process.
  Process-local and appropriate for a receipt-ordering test; noted so nobody
  reads the run as coverage of those gates.
