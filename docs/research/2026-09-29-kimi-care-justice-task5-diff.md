---
title: Adversarial review — care-and-justice Task 5 diff (judicial entry and outcome decision)
created: 2026-09-29
type: research
tags: [engine, review, care-and-justice, engine.254]
sources:
  - Commit 11c3ecd7 (engine.254 Task 5): phase05-citizens/judicialLifecycle.js, phase04-events/chaosCarsEngine.js, scripts/judicialLifecycle.test.js
  - docs/plans/2026-09-21-care-and-justice-system.md §Task 5 cut (codex F1–F8 folded)
  - docs/research/2026-09-29-codex-care-justice-task5-cut.md
  - utilities/careJusticeAccounting.js, utilities/cycleModes.js
---

# Adversarial review — Task 5 judicial-lifecycle diff (kimi, 2026-09-29)

**Verdict: SHIP for this commit** — it is in-memory-only (no reader, no Status
flip, no sheet write until Tasks 6/8), the tests are real, and the rng and
census contracts hold. **Two findings are FIX before Task 6/8 wiring**, not
before this commit: both are unreachable on the only input path this cut
builds (chaos cop-car `intake` receipts), and both become live the moment the
conduct investigation push (spec §4, deferred) or the Task 8 ledger hydrate
exists. They are stated below as explicit Task 6/8 requirements.

**Validation run (this lane, local, read-only):** `node
scripts/judicialLifecycle.test.js` 52/52; `node
scripts/chaosCarsCitizenDial.test.js` 27/27; `node
scripts/auditFunctionCollisions.js` 0 collisions across 1473 names;
`docs/engine/ENGINE_STUB_REVERSE.json` registers `judicialEvents` with the
single writer/reader `runChaosCarsEngine_`. Adversarial probes (below) run
against the built module with synthetic cases only.

## Hunt items, one by one

**rng draws leaking onto ctx.rng — clean. SHIP.** `advanceCase_` takes `rng` as
a parameter and never sees ctx; `judicialDraw_` throws when the injected rng
is not a function (phase05-citizens/judicialLifecycle.js:141-146). The chaos
judicial path adds zero draws: the receipt build
(phase04-events/chaosCarsEngine.js:405-415), the stamp (:636) and
`admitJudicialReceipt_` (:638) call no rng. Test 10 pins the whole sequence at
39 draws / 3 events, matching T4-12 (scripts/judicialLifecycle.test.js:273).
Test 4's "ctx.rng draw count unchanged" assert is formally weak — ctx is never
passed to `advanceCase_`, so the assert is true by construction — but the real
guarantee is the signature plus the tested throw on a missing injected rng
(scripts/judicialLifecycle.test.js:168). Not a defect; noted so nobody cites
test 4 alone as the isolation proof.

**Weakened or tautological asserts — none found. SHIP.** Forced draws pin
exact values (`HeldUntilCycle === 104` from seq([0.1, 0.99]), CyclesHeld 4);
replay asserts full JSON identity (test 3); the repeat-arrest delta (+50 over
1000 seeds) is deterministic because `seededRngFor_` is seeded, not
statistical; rate-validation tests isolate each check (the negative-rate case
rebalances the split so only the domain check can fire,
scripts/judicialLifecycle.test.js:176). One soft spot: test 12's "a closed
case never moves" asserts only `event === null`, not case identity — the
same-Cycle idempotence JSON compare one assert earlier covers the mechanism
(:311-312). Acceptable.

**Silent fallbacks — one found. FIX (before Task 8, unreachable in this cut).**
`Number('') === 0`, so a case with a blank `HeldUntilCycle` serves immediately
(`cycle < Number(c.HeldUntilCycle)` is false for every cycle,
phase05-citizens/judicialLifecycle.js:96) and a blank `DecisionCycle` decides
immediately (:120, :129). Probe: a `held` case with `HeldUntilCycle: ''`
advanced at any cycle closes `held-served` with a fabricated CyclesHeld — no
throw. `openCaseFromReceipt_` always sets both fields (:237-238), so nothing
this cut builds can produce the state; the producer that can is the Task 8
hydrate from `Judicial_Ledger` rows, where a blank cell on a `held` row is
exactly the corruption class the hospital ledger already exhibits (the live
open row is 8 cells long, plan §Schema read-before). Requirement on Task 8:
hydrate validates `DecisionCycle`/`HeldUntilCycle` per state and throws, or
the two steps throw on a non-positive clock. Everywhere else the module fails
loud — unknown EntryType, unknown ChargeGravity, unknown state, missing rng,
missing SourceEventId all throw naming the culprit.

**A test that passes without exercising the path it names — one mislabel, not
a hole. SHIP.** Test 1's "no decision in the arrest Cycle"
(scripts/judicialLifecycle.test.js:104-105) fires the
`LastTransitionCycle === cycle` guard (judicialLifecycle.js:273), not the
pending step's `cycle >= DecisionCycle` check (:120) — `LastTransitionCycle`
is set to `OpenCycle` at open (:239), so the guard always pre-empts the step
in the open Cycle. The not-due null path is genuinely exercised elsewhere:
test 13's civil case at cycle 101 with `DecisionCycle` 102 (:331). Coverage
exists; the label overclaims which mechanism it proves.

**A case state the lifecycle cannot leave — none. SHIP.** `pending` →
released/diverted/held (:73-92); `held` → closed held-served (:95-100);
`investigating` → pending or closed no-arrest (:103-113); released/diverted
carry `ResolveCycle`, which is terminal at :272. An unknown state throws
(:277) rather than spinning. The one-step-per-Cycle and catch-up rules (F3)
hold: due is `>=`, `LastTransitionCycle === cycle` is a no-op, a decision two
Cycles late equals the on-time decision because the rng is seeded on
`DecisionCycle` (test 12). Held anchoring is to `DecisionCycle`, not the run
Cycle (:86), so a late decision cannot inflate the sentence.

**Census kind contract vs utilities/careJusticeAccounting.js — holds. SHIP.**
Every kind the new code emits is a contract kind: lifecycle events are
`intake`/`transition`/`exit`, chaos receipts `intake`/`transition`
(judicialLifecycle.js:287-292; chaosCarsEngine.js:407, :208 of the diff);
`CARE_JUSTICE_KIND_FIELD` plus the transition drop cover all five
(careJusticeAccounting.js:47-53, :83). `intakeType: 'arrest'` is the only
judicial IntakeType the fold accepts (:24), and that is exactly what both
producers emit. Custody mirrors are byte-identical sets —
`JUDICIAL_CUSTODY_STATES_` (judicialLifecycle.js:61) =
`CARE_JUSTICE_CUSTODY_STATES` (careJusticeAccounting.js:33) — and
released/diverted/closed correctly fall outside custody for the occupancy
read (:186). A civil row with `census: 'none'` emits no event (test 13). The
fold integration is exercised end-to-end, not mocked (test 8: chaos receipts
plus a full lifecycle fold with one intake counted).

## F1 dedup hole — FIX (before Task 6/8, unreachable in this cut)

`admitJudicialReceipt_` dedups only against receipts with `kind === 'intake'`
(judicialLifecycle.js:205). Probe: a same-Cycle `transition` investigation
receipt (`conduct:…`) plus an arrest `intake` for one POPID produces **two
receipts, two open cases, and the same CaseId** `J-C100-POP-Y` — the F1
collision the function exists to prevent, one entry path over. Unreachable
today because the conduct push is deferred (spec §4) and chaos emits only
arrest intakes; live the day the conduct wire lands. Same shape cross-Cycle:
the in-Cycle array is dropped each Cycle, so an arrest on a citizen whose case
is still open from a prior Cycle dedups only at the Task 8 persist — the spec
says so (:390 of the plan), but nothing in this module enforces or tests that
handoff. Companion hole: `openCaseFromReceipt_` ignores `receipt.kind` — it
happily opens a fresh case from a re-arrest `transition` receipt, keyed on the
first arrest's SourceEventId, duplicating the existing case (probe: receipt
kind `transition` → case `J-C100-POP-Z`, `SourceEventId` =
`patrol:first:POP-Z`). Task 8 requirement: open cases only from `kind ===
'intake'` receipts (enforce in `openCaseFromReceipt_` — it has the receipt and
can throw), and extend the dedup match to any open receipt for the POPID
regardless of kind.

## F7 lost-receipt path — as specified. SHIP

A `writeChaosCarsRow_` throw after `writeCitizenEvent_` leaves the LifeHistory
line and hook with no receipt and no case; the error propagates (test 16,
scripts/judicialLifecycle.test.js:296-300). This matches the spec's ruling —
visible loss via Engine_Errors, never a known zero, no reconcile until a
Status flip exists to reconcile from (plan :414).

## Smaller observations (all SHIP, no action)

- `return hospitalReceipt || judicialReceipt` (chaosCarsEngine.js:434) can
  silently drop a judicial receipt only if one hit were both an ambulance
  medical outcome and an arrest — impossible: `hospitalReceipt` requires
  `medical_emergency`/`workplace_accident`, `judicialReceipt` requires
  `arrested`, and one hit has one outcome. The branch on `receipt.system` at
  :634 is safe because hospital receipts carry no `system` field.
- `priorStatus` is trimmed but not lowercased (chaosCarsEngine.js:413) —
  casing preserved for the R4 restore, as specified and tested (test 7).
- The health-state guard reads the same lowercased `curStatusW` the ambulance
  guard computes (:358, :405); a `detained` citizen (Task 6) is not in
  `CHAOS_HEALTH_STATES` and would draw a receipt — the spec explicitly leaves
  "is a detained citizen still a chaos target" to Task 6.
- Spec test-list item 6's "Petty/Serious conduct → no receipt" has no test —
  correct, since the conduct wire is deferred; nothing exists to assert
  against.
- `judicialResolveInvestigation_` hardcodes `DecisionCycle = cycle + 1`
  (judicialLifecycle.js:107) instead of `type.decisionOffset`; consistent
  today (offset is 1), a trap only for a future type reusing that step with a
  different offset.

## What was not reviewed

`docs/engine/ENGINE_STUB_*` regen hunks (mechanical, spot-checked above), the
plan's own changelog lines. No live paths: this commit cannot change a running
Cycle beyond one in-memory push to an unread array.
