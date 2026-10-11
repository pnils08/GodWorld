---
title: codex review — engine.286 Task 2 implementation
created: 2026-10-11
updated: 2026-10-11
type: review
tags: [review, engine, citizens]
sources:
  - docs/for-claude-review/2026-10-11-engine286-task2-impl-review-TASK.md
  - docs/plans/2026-10-08-engine-286-game-of-life-events.md
  - ddbe672a
  - 67933be4
  - a4db053e
  - 98b56fc0
---

# codex review — engine.286 Task 2 implementation

**Target:** `ddbe672a` + `67933be4`, including the urn changes in `a4db053e` / `98b56fc0`, against the owning plan §Task 2 design record, R1/R5, Acceptance 4, and the 2026-10-11 builder rulings. The es-seat selections govern calls 2–4; the later home-loss target is about one sale per 20 Cycles at eight at-risk households.

**Result:** **HOLD**

Scope: source review and offline synthetic checks only. No code, configuration, Sheet, deployment, index, or handoff changes; only this review file. Existing workspace dirt was excluded. The reviewed engine/test files matched `67933be4`. During review, `b729b31e` added the plan's as-built paragraph and corrected `kind:home` pool tags; those later changes are identified below, not attributed to the four target commits. The plan still contains earlier .10/.12/.04 and 30%/600-Cycle descriptions; this review uses the explicit later rulings (.05/.08/.01, over half, standing home-loss risk).

## Findings

### F1 — Forced-sale success is recorded after an unconfirmed household write — P1, confirmed

`phase05-citizens/generationalWealthEngine.js:2246` pays the sale proceeds and records the heritage decrement before calling `updateHouseholdLedgerMove_` at line 2247. That writer returns without a success receipt for a missing tab, missing ID, absent row, or dissolved row, and catches write failures with only `Logger.log` (`phase05-citizens/migrationTrackingEngine.js:897`, `:920`, `:924`, `:937`). The caller nevertheless appends the completed-sale line and increments `die.sold` (`generationalWealthEngine.js:2257`, `:2260`).

**Repro:** using the real `trackHomeOwnership_`, sale writer, and move writer with the existing synthetic Sheet harness, force the sale and make the first household cell write throw. The household remains `owned`; citizen NetWorth rises from 100,000 to 308,000; `sold=1`; LifeHistory says the house was sold and the citizen now rents. No `Engine_Errors` receipt is produced by the swallowed move failure. The owned row remains eligible for another payout on a subsequent forced-sale draw.

**Required fix/proof:** give the composed writer an explicit success/failure contract and a recovery strategy for partial writes. Do not finalize payout/heritage/narration as a successful sale without confirming the household transition. Test failure before the first cell, failure partway through, absent/mismatched row, and retry without a second payout. Merely throwing after the payout does not resolve the partial-state problem.

The purchase branch also appends its L completion line and debits NetWorth before the three household writes (`generationalWealthEngine.js:2128`, `:2138`, `:2157`). There is no later eligibility gate after the die, but write failure can still leave a completion claim ahead of ownership. This ordering predates the die; the new L route inherits it and needs the same failure proof.

### F2 — A medium promotion without usable DialState loses its promised window and own shot — P1, confirmed

`lifeEventSetMark_` refuses blank, absent, or unparsable DialState (`phase05-citizens/runCareerEngine.js:484`). The M branch has already emitted the graded line when it calls this helper; `67933be4` only increments `unheld`, then installs this Cycle's in-memory lift (`:559–566`). The own raise is available only when a persisted mark is read in a later Cycle (`:531–542`).

**Repro:** an eligible synthetic citizen with blank DialState draws M up. The result is `M=1`, `unheld=1`, a medium line, and an empty DialState cell. There is no mark to provide the second Cycle or personal raise attempt. A later Phase-9 initialization cannot reconstruct this lost mark from the prose. The immediate order lift exists, so this is a shortened consequence, not a claim that absolutely nothing changes.

**Required fix/proof:** persist a valid mark through an approved DialState initialization path, or explicitly change admission/rendering so a two-Cycle M event is not claimed when it cannot be held. Exercise absent header, blank cell, invalid JSON, and valid state through the real engine and next-Cycle read. The `unheld` counter makes the failure observable but does not satisfy the ruling.

### F3 — Quiet forced sales lose the HOME_SALE hook and ripple — P2, confirmed

The new call passes `{ quiet: true }` (`phase05-citizens/generationalWealthEngine.js:2246`). `sellHouseholdHome_` returns at `:2358`, before creating `HOME_SALE` and calling `recordHookRipple_` (`:2361–2369`). `homeDieOwned_` supplies the replacement citizen line but supplies neither hook nor ripple.

**Repro:** a successful forced sale in the real home entry point yields `HousingType=rented`, the payout and L line, but `storyHooks=[]`. The old dissolution fixture checks a hook; the new forced-sale fixture does not (`scripts/homeSale.test.js:96`, `:206`).

**Required fix/proof:** preserve quiet citizen narration while publishing exactly one sale hook/ripple with the forced-sale cause. Do not reuse the existing dissolution wording, which falsely says the household broke up. Heritage is a separate result: because `netZero` is absent, the existing writer does record `homesSoldByLine` before its quiet return (`generationalWealthEngine.js:2351–2358`), and Step 7 follows home processing (`:205–211`).

### F4 — The realized home distribution violates the stated band order; up-over-down is not structural — P1, confirmed arithmetic

The shared ladder itself preserves S ≥ M ≥ L, including aura .9 (`phase05-citizens/runCivicRoleEngine.js:151–155`). The owner path adds a separate L-down probability before that ladder and converts its L draws to M (`phase05-citizens/generationalWealthEngine.js:2227–2236`). At the seeded settings and owner aura 1, per at-risk household per Cycle:

| Realized outcome | Probability |
|---|---:|
| L, forced loss | .00625 |
| M, either direction | (1 − .00625) × .05 × (.08 + .01) = .004471875 |
| S, either direction | (1 − .00625) × .05 × .91 = .045215625 |

Thus **L > M** at an ordinary eligible owner's aura. Inspecting only `civicRoleBands_` misses the violation. The later as-built paragraph documents the separate mechanism but does not supply a builder exception to R5's probability ordering.

The sign rule is also conditional, not structural: `lifeEventRoll_` uses `.6 + lean × .2` (`runCivicRoleEngine.js:338–340`). A bottom-third employer or stretched owner has P(up)=.4. Including the standing sale, an at-risk owner has P(up)=.019875 and P(down)=.0360625 per Cycle. If “up over down” means a citywide aggregate rather than each premise, neither the helper nor these tests establishes that aggregate; employer thirds are not citizen-weighted thirds.

**Required fix/proof:** reconcile the complete realized distribution with the standing ordering and sign rule, while preserving the approved home-loss target; otherwise obtain an explicit exception to those rules. Do not silently lower the separately ruled loss rate. Its own arithmetic is correct: eight eligible households × .00625 = .05 expected sales/Cycle; probability of at least one sale is .0489198. Actual eligibility counts and organic frequencies require bench/live evidence, not these fixtures.

### F5 — Owners receive renter-pursuit M events without an M writer effect — P2, confirmed

When the standing loss roll misses, `homeDieOwned_` draws from the same `lifeEvent.home` pools used for qualified renters, converts L to M, appends a line, and continues (`phase05-citizens/generationalWealthEngine.js:2228–2234`). This branch changes no purchase roll, sale risk, or held writer opportunity. Owner M therefore has only its dial effect, whereas the design defines M as moving the writer's odds.

**Repro:** a stretched synthetic owner, sequence `[.5, 0, 0, .05, 0]`, receives `[LifeEvent-Home-Up-M] A broker in Testhood called with a listing that fits the budget.` The house remains owned, NetWorth is unchanged, and `boosted=zeroed=bought=sold=0`. The code never established that this owner was pursuing an affordable listing. The down fallback likewise claims a listing went to another buyer (`generationalWealthEngine.js:2003–2006`).

**Required fix/proof:** establish an owner-specific factual premise and the approved M writer effect, or use a correctly weighted owner texture event with an explicit contract ruling. Reusing renter prose and an M tag does not implement the stated M consequence. The later as-built paragraph acknowledges owner S/M lines but does not resolve that mismatch.

### F6 — Missing or malformed household income becomes a forced-sale premise — P1, source-confirmed

`trackHomeOwnership_` only logs a missing `HouseholdIncome` column and continues (`phase05-citizens/generationalWealthEngine.js:2053–2054`). The new owner path converts missing/blank/nonnumeric income to zero, then sets `carryShare=Infinity` (`:2220–2223`). Consequently an owner with unavailable income and no default mark is classified as over the half-income bar and can lose the house.

**Required fix/proof:** distinguish verified zero income from unavailable/malformed income. Reject/report the latter before the loss draw; retain a separately verified default-mark premise where appropriate. Add missing-column, blank, invalid numeric, actual-zero, and healthy-income controls. A missing measurement is not evidence that the household is stretched.

### F7 — Malformed promotion marks can hold forever; accepted zero drop becomes no drop — P2, confirmed

Expiry compares `Number(mark.c)` without validating it (`phase05-citizens/runCareerEngine.js:531–537`). With `{k:'promotion',d:1,c:'bad'}`, both expiry comparisons are false; `held` increments and the order lift remains. The own-shot date comparison is also false. An in-memory probe reproduced `held=1`, `unmarked=0`, zero own-shot draws, and the unchanged malformed mark. Valid future and expired marks were cleared correctly in the same probe.

Separately, `lifeEventPromotionDrop=0` is accepted by the config contract (`phase05-citizens/runCivicRoleEngine.js:319`), but `lifeEventLiftOf_` and `promotionWait_` convert zero back to one (`runCareerEngine.js:143`, `:497`). The accepted strongest drop setting silently disables the drop.

**Required fix/proof:** validate mark kind/direction/finite integral Cycle and make invalid state expire visibly; either reject a zero drop setting or implement its stated multiplier. Test valid boundaries, future, malformed, cleared, and disabled-gate states. Normal expiry currently runs only for citizens still in the employer book; marks on citizens outside that book survive storage until read again.

### F8 — The wake test does not establish that this event caused wake admission — P2, evidence gap

`scripts/employerSuccess.test.js:488` manually changes the post-event citizen's base drive/warmth/composure to 85/80/25 before calling `buildPool`; the unshaped control retains the event's actual state. This proves the new salience rule retains the layoff in an already-shaped citizen's five-line tail, and that the pool still excludes the unshaped control. It does not prove event → fold → changed admission, reflection, drain, or next response.

**Required proof:** retain this useful salience test, but label its scope accurately. Complete Acceptance 3 with an unmodified event-produced state and a matched control whose pre-event state is chosen explicitly, then exercise the reflection/drain return. The plan already requires bench proof; no such proof was obtained during this review.

## Hunt results, in requested order

1. **Writer integrity — extraction passes the bounded check; collision behavior needs an explicit test.** Compared `applyEmployerSuccess_` at `ddbe672a^` and the reviewed implementation across 27 synthetic combinations: growth −20/0/+10, draws 0/.0001/.5, and gap factors .5/1/1.5 with three ranked staff. Rows, dirty flag, signals, business deltas, logs, intents, return value, and draw sequence matched exactly. This tests the extraction with no held lift, not every possible full-engine state. A die layoff clears the employer before the fresh book is built (`runCareerEngine.js:441–443`, `:410`, `:581`); the probe then found zero budget businesses/events for that citizen. Conversely, L-up followed by the budget can promote the same sole employee twice: 60,000 → 65,400 → 69,324 under forced rolls. There is no same-Cycle exclusion (`:552`, `:603–619`). These are two separate writer invocations, not a duplicate fold of one line; the task does not explicitly forbid both independent awards, so this is recorded for ruling/test coverage rather than asserted as a one-event identity violation. A held M own shot also remains active when `lifeEventFireChance=0`, because it precedes that gate (`:537`, `:546`); “gate zero draws nothing” is only true without held marks.

2. **Narration/effect — HOLD: F1, F2, F5.** Renter price, wealth-floor, default, and carry gates precede the die (`generationalWealthEngine.js:2097–2104`). No later eligibility gate discards an L purchase; failed writes remain a real gap.

3. **Forced sale — HOLD: F1, F3, F6.** The successful path passes the G-EC70 guard with the owner receipt and writes rented/same hood/market rent/cost zero (`migrationTrackingEngine.js:906`, `:928–934`). Payouts exclude deceased members; minors share the proceeds but receive no adult home line (`generationalWealthEngine.js:2210`, `:2253`, `:2315`, `:2334`). Purchase processing precedes the owner pass and uses the original `hv` snapshot, so a household sold here cannot re-enter the purchase roll in this invocation (`:2074`, `:2175`). The heritage decrement survives quiet mode; the hook does not.

4. **Rates — HOLD: F4.** Seeded ladder checks at aura .9/1/1.15/1.35/1.7 preserve S ≥ M ≥ L; the composed owner distribution does not. The over-half predicate and .00625 draw are reachable in synthetic fixtures. The plan's eight-household count is a documented prior measurement, not a live read performed here. No claim that every threshold satisfies SIM_DOCTRINE §15 at today's live ranges.

5. **One fold / owned consequence — isolated career paths pass locally; home end-to-end proof remains.** The real career-entry tests exercise L up/down through Phase-9 compression and confirm one graded consequence without a second LifeEvent-L tag (`scripts/employerSuccess.test.js:358–375`, `:394–407`). The M line followed by a later Promotion is intentional. Home L replaces/suppresses the writer's `[Home]` line and uses one mapped LifeEvent tag (`generationalWealthEngine.js:2138–2144`, `:2246`, `:2257`; `utilities/citizenDialMap.js:58–63`). Home tests check lines/writes but do not run their Phase-9 fold. M-up plus an ordinary successful purchase emits an M line and a neutral `[Home]` completion line; these describe opportunity and completion, with only the M tag mapped here. Acceptance 4's ECL-size/rate and identity bench comparison remains unproven.

6. **DialState survival — named rewriters preserve a valid mark; HOLD on F2/F7.** Both `citizenMemory` serializers carry it (`utilities/citizenMemory.js:262`, `:281`); Phase 9 uses `deserialize_` and `serializeDialState_` (`utilities/compressLifeHistory.js:576`, `:710`, `:1393`). Chaos Cars uses that same pair (`phase04-events/chaosCarsEngine.js:435–439`); the reflection drain does too (`scripts/drainReflectionBacklog.js:66–73`). `noteDebtDefault_` and the maneuver writer parse/modify/stringify the existing object (`generationalWealthEngine.js:310–317`; `phase05-citizens/maneuverEngine.js:288–302`). Source tracing plus an offline serializer round trip confirmed preservation; the named external processes were not run. Valid mark c=200 holds at 200/201 and expires at 202 with the two-Cycle seed. Future marks clear; malformed Cycle does not.

7. **Urn / text — core mechanics pass; owner premise gap remains F5.** Offline probes confirmed 40 distinct unit-weight draws, draw 41 counted forced; Weight 3/1/1 produced five allowed tickets without a forced repeat. L `strictBand` bypasses the unbanded pool and uses its shaped fallback. `$` and conditioned entries are rejected (`runCivicRoleEngine.js:241–243`); tokens are filled at the caller (`runCareerEngine.js:525`; `generationalWealthEngine.js:2071`). M may still borrow S wording and records `bandFallback` (`runCivicRoleEngine.js:266–274`); that is observable degradation, not proof of R5 text fidelity under a missing pool. Loader whitelist, primary routing, and generator skip were added together (`loadEventContentLedger.js:51`; `generateCitizensEvents.js:972`, `:2926`). At the target revision the authored home rows lacked `kind:home`, so the new primary branch would classify them Career; concurrent `b729b31e` corrects the module/validator and claims live retagging. The later source correction was inspected; its live readback was not independently verified.

8. **Fallbacks / writes / config — no new Math.random or unmanifested writer found; silent failure findings above stand.** All twelve missing-key cases threw naming the missing key in an offline `lifeEventConfig_` probe. The production call sites route config errors to `logEngineError_` (`runCareerEngine.js:1483–1485`; `generationalWealthEngine.js:2062–2064`). RNG uses injected/seeded paths; the career comment mentioning Math.random is stale, not executable fallback (`runCareerEngine.js:791–796`; `utilities/safeRand.js:28–35`). The new home caller and existing move/purchase/heritage writes are covered by `docs/engine/SHEETS_MANIFEST.md:144`, `:145`, `:172`. Missing helper/state paths still degrade silently as described in F1/F2/F7; `canSell` also disables sales when the move helper is absent (`generationalWealthEngine.js:2226`).

9. **Tests — useful behavioral coverage, insufficient acceptance gate.** All five requested suites passed: employerSuccess **75**, homeSale **30**, careerEngineReach **40**, hospitalIncomePersistence **82**, householdReconcile **105** assertions, **332 total, zero failures**. Career additions call the real career engine and fold; home additions call the real home entry point with mock Sheets. The two household regex edits retain the gate-order and multiplier checks while matching the authorized die bypass/multiplier; they were not weakened to arbitrary matches, but remain source checks. LIFE_EVENT_OFF preserves prior fixture draw schedules with no held marks; it does not test integration with an enabled die or establish that a zero new-event gate disables held effects. New tests omit forced-sale write failures/hooks, missing-state M, malformed expiry, composed rate ordering, and the same-Cycle promotion collision. F8 limits the wake claim. The commit's 287-file full-suite claim was not rerun or treated as live proof.

## Validation and release gate

All supplementary probes ran in memory from repository source and existing synthetic harnesses; no scratch files or test edits were created. The successful checks covered extraction parity, forced-sale write failure, missing hook, owner M behavior, blank promotion state, valid/future/malformed marks, zero-drop behavior, urn exhaustion/weights, strict L fallback, serializer preservation, and all twelve missing config keys. These are local source/VM/Sheet-mock results. No sandbox reset, bench Cycle, live Sheet read/write, deployment, cron invocation, paid model call, or external message was performed.

**HOLD** until the confirmed failure/contract findings are resolved or explicitly ruled on, with focused regression checks and the plan's outstanding bench evidence. The ordinary ladder and extracted business writer are not the blockers; the composed home-loss behavior and persistence boundaries are.

## Disposition

Accepted by engine-sheet 2026-10-11. F1, F2, F3, F5, F6, F7, F8 and hunt 1 folded `652e608b`; F4 ruled by the builder (the forced sale is a standing risk outside the size order). Per-finding table in the plan.

**Reconciled in:** [[../plans/2026-10-08-engine-286-game-of-life-events]] §Reviews reconciled → Task 2 — codex implementation review 2026-10-11.

**2026-10-11 (codex), citation correction:** F8's manual base-dial assignments are at `scripts/employerSuccess.test.js:489`; line 488 constructs the LifeHistory text. The finding and result are unchanged.
