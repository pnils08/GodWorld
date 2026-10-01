---
title: Adversarial diff review — f1898e37 engine.254 Task 6b (custody costs a livelihood)
created: 2026-09-30
updated: 2026-09-30
type: research
tags: [review, engine, adversarial, kimi]
sources:
  - commit f1898e37 (phase05-citizens/judicialLifecycle.js, phase05-citizens/runCareerEngine.js, three test files, truth docs)
  - spec: docs/plans/2026-09-21-care-and-justice-system.md §Task 6b — BUILD SPEC (B1–B5)
  - prior rounds: docs/research/2026-09-30-codex-task6b-cut.md, -rev1.md, -rev2.md
---

# Diff review — f1898e37 (engine.254 Task 6b)

**Verdict: SHIP** — contingent on the stated deploy order (World_Config
`judicialDismissAfterCycles` lands before or with the code). No finding rises to
REVISE; the two mediums from earlier rounds are closed by construction and test.

Tests run locally, all green, matching the commit message's claims:
`judicialLifecycle.test.js` 136 · `hospitalIncomePersistence.test.js` 71 ·
`employerSuccess.test.js` 65 · `careerStage.test.js` 83 ·
`phase04-events/chaosCarsEngine.test.js` 80.

## Spec conformance (B1–B5)

| Clause | Verdict | Evidence |
|--------|---------|----------|
| B1 settlement | BUILT (one mechanism note, finding 2) | `judicialLifecycle.js:396-448`; call site `:553-556` passes `lower` captured at `:533`, before the restore at `:560`. Outcomes/reconcile/PriorStatus/GAME/adult/Income/marker guards, NetWorth parse, unreadable→Engine_Errors+no write, charge formula, DebtLevel cap 6 all match. Stamp string is byte-identical to the money loop's (`generationalWealthEngine.js:996`); the LifeHistory_Log intent shape matches the money loop's own. |
| B2 dismissal | BUILT | `runCareerEngine.js:229-351`; call site after the `businessDeclines` fold, before the citizen loop, in a try (`:675-688`). Stage-then-commit, Status guard, owner predicate, seat rule, per-case seeded draw, fault containment all as specified. |
| B3 custody clock | BUILT | `judicialLifecycle.js:362-385` — open pending/held + same-Cycle arrest intakes; investigating excluded; ArrestCycle validation throws naming the case. |
| B4 shared layoff body | BUILT | `runCareerEngine.js:216-222`; both old sites call it (`:458-461`, `:1764-1767`) with their own cut, draw predicate, counters, signals intact. |
| B5 dial | BUILT | `judicialLifecycle.js:346-357`; called every Cycle by the lifecycle (`:472`) and by the pass (`runCareerEngine.js:241`). |

## Findings (numbered; severity in bold)

1. **Deploy-order hazard is real but contained — medium.**
   `judicialLifecycle.js:472`, `phase01-config/godWorldEngine2.js:159-171,371,2063`.
   A missing `judicialDismissAfterCycles` key makes `runJudicialLifecycle_` throw
   *every Cycle* before any case work. `safePhaseCall_` catches it → an
   Engine_Errors `Phase5-Judicial` row per Cycle and the rest of the engine
   completes — but the judicial phase is fully dead while the key is missing: no
   intakes, no case advancement, no releases, so a detained citizen stays
   detained. The career pass's identical read is separately contained
   (`Phase5-CustodyDismissal`). The commit message already carries the correct
   mitigation ("Deploy needs judicialDismissAfterCycles on World_Config first").
   The Income/NetWorth column throw is the same shape but those columns are
   long-standing on PROD — the World_Config key is the only realistic trigger.

2. **Settlement Tier is exclusion-based with a charge-ward default — low.**
   `judicialLifecycle.js:403-404`. Spec text says "Tier is 3 or 4"; the code
   exempts 1–2 and lets everything else through, and a missing Tier column
   defaults to 4 (chargeable). Equivalent on a 1–4-tier world, and it is the
   owner draw's own convention verbatim (`generationalWealthEngine.js:1046-1047`),
   but the fail direction on schema drift is "charge", not "skip". The dismissal
   pass is strict-inclusive (`runCareerEngine.js:303-304`) — the two new paths
   disagree in strictness, both defensible. Junk/NaN Tier cell → charged.

3. **Settlement minor exclusion untested — low (test gap).**
   Code at `judicialLifecycle.js:405-408`; the dismissal suite tests a minor
   (`hospitalIncomePersistence.test.js`), the settlement suite does not. Blank or
   garbage BirthYear reads as adult in both paths (house-consistent with the
   money loop, `generationalWealthEngine.js:334-336`).

4. **Blank ClockMode admitted to dismissal — informational.**
   `runCareerEngine.js:301-302`. Spec text says "ENGINE clock"; the code passes
   blank and blocks CIVIC/MEDIA/GAME. Correct for ordinary citizens (blank is the
   ordinary state); noted because the text reads stricter than the code.

5. **Same-Cycle money composition after the charge — informational (accepted
   design).** Codex rev2 #30's residual stands: the NetWorth debit lands at the
   judicial close and Household/Wealth/casino still run later that Cycle; no test
   asserts the composed end state. This is the spec's own "charge where the case
   closes" choice, not a defect.

6. **Commit-block partial failure profile unchanged — informational.** The
   dismissal's commit section is assignments + pushes + the two shared
   LifeHistory helpers (`runCareerEngine.js:336-347`); a throw inside
   `appendCareerLifeLine_` would leave Income cut without the layoff line. Both
   pre-existing layoff sites carried the identical ordering, so this introduces
   no new exposure.

## Hunt answers

- **Double charge / excluded person charged:** no path found. Second close of
  the same case is blocked twice over (Status-before-restore is the durable
  guard; the `[IncomeHit J<n>]` marker is the backup) — phase-tested including
  with the marker removed. Reconcile cases excluded by SourceSystem; retired /
  recovering pre-custody rows excluded by PriorStatus; Tier 1–2, GAME, minors,
  Income 0 all excluded and tested. Two different cases each charge once —
  intended.
- **Mutate-before-throw in `applyCustodyDismissals_`:** no — every check for a
  case precedes its first write; the synthetic-fault test proves case 2
  untouched, case 1 committed.
- **Behavior change at the two pre-existing layoff sites:** none. Bodies,
  ordering, counters, and log-row shapes identical; the only delta is the
  reconcile site's `LastUpdated` write gaining an `>= 0` guard (the old
  unguarded `row[-1]` write was a no-op property — zero sheet-visible change).
- **rng stream movement:** none. Settlement draws nothing; the dismissal draws
  only from `seededRngFor_(cycle, 'custody-dismiss:'+caseId)` and only when
  Income > 0; the extracted helper takes no rng. Old sites keep their own
  `roll()` predicates (employer-success unconditional, reconcile positive-income
  only) — draw-count parity is asserted by test.
- **Trick code / silent fallbacks / weakened asserts:** none found. The
  NetWorth-unreadable path fails loud (Engine_Errors, no write). The
  seeded-draw test recomputes its expectation through `seededRngFor_` itself
  (mild circularity) but pins determinism and the exact formula.
- **Tests exercising the mechanism:** yes — the `custody()` harness drives the
  real `runCareerEngine_` end-to-end; the 14-crowd test proves the 10-event cap
  is really in force *and* really bypassed; the phase-level settlement test
  proves the pre-restore Status read by asserting a non-zero charge.
- **Third-round HOLD items (codex rev2 #26/28/29/31):** all resolved in the
  build with tests — charge population = missed paycheck only (PriorStatus +
  statusBefore), reconcile cases never settle, the Status guard (not the
  compressible marker) carries once-only, Active-row-under-open-case is skipped
  not dismissed-and-rehired. #27 (close-time repricing) is the spec's explicit
  "Income as on the row at close" rule, tested as such.
- **Truth docs:** `SIMULATION_LEDGER.md` NetWorth/DebtLevel writers updated;
  stub maps regenerated in the same commit.
