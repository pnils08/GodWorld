---
title: Casino Ledger (Undocked Phase 4b) — research
created: 2026-08-29
updated: 2026-09-08
type: reference
tags: [research, citizens, engine, active]
sources:
  - docs/plans/2026-08-07-spacemolt-game-show.md §Phase 4 — the 4b gate + design-element list (Mike-only sign-off)
  - docs/research/2026-07-27-spacemolt-citizen-agency-cultural-phenomenon.md — original wagering-lane extraction + open questions
  - docs/research/2026-08-03-game-environment-review.md §3.3 — wagering/intrigue lane beyond the show (A's games, elections, initiative votes)
  - docs/research/2026-08-01-simulation-realism-audit.md — engine emits near-zero negative economic vocabulary; wealth scale calibrated from real-world Oakland (S361 hazard)
  - docs/research/2026-07-13-family-household-loop.md — universal single-owner Household_Ledger decisions (D1–D5)
  - docs/research/2026-07-27-employment-as-a-living-system.md — "a life event is not a cell edit" precedent
pointers:
  - "[[../plans/2026-08-07-spacemolt-game-show]] — owning plan; 4b gate lives there, this file is its design-question substrate"
  - "[[index]] — registered here, same commit"
  - "[[2026-07-27-spacemolt-citizen-agency-cultural-phenomenon]] — research basis; its wagering open questions are extended here, not duplicated"
  - "[[2026-08-03-game-environment-review]] — wagering lane beyond the show"
---

# Casino Ledger (Undocked Phase 4b) — research

**Source:** Internal design-question consolidation, 2026-08-29 (kimi, builder-directed). No new external source — this file gathers every constraint the repo already carries about the gated 4b casino ledger into one standing record, so the future design doc starts from the questions instead of re-deriving them.

**What this addresses:** The SpaceMolt game-show plan's Phase 4b — the first mechanism where the *audience* takes downside, not just the cast. It is explicitly NOT authorized *(historical — 4b shipped 2026-09-01; see Shipped status below)* ("a casino ledger is not authorized by mentioning it"); 4b sign-off is Mike-only. This file is the measure-twice substrate behind that future sign-off: what the ledger would have to answer before any Sheet, tab, schema, balance, or odds exist.

**What it does (verified state at 2026-08-29, superseded):** At consolidation time nothing economic existed. *(Superseded — the ledger went live 2026-09-01; current state under Shipped status below.)* Phase 4a is narrative-only wager texture (ECL pool lines authored 2026-08-17, fail-closed until engine-sheet lands the flag/dial wiring); no balances move and no odds are canon. `Undocked_Standings` (greenlit 2026-08-18, deterministic aggregation over `Undocked_Feed`) is named in the plan as the 4b *substrate* — the settled-outcome source a ledger would resolve against. The show's adapter already produces the fact/subjective split a settlement engine needs: typed, provenance-marked outcomes, gate-approved before they are sim-facing. Sequencing constraint from the plan: 4a runs ≥2 cycles before 4b is even *designed* — this record is the question list, not the design.

**Extraction — the design dimensions already constrained by the repo:**

- **Settlement source → adapter outcomes, never narrative.** Event IDs come from deterministic adapter output (`get_action_log` categories, credits delta, combat results), gate-approved into `Undocked_Feed`. A wager settles only against a row that already passed the contract validator. No LLM in the settlement path — same rule as the adapter itself.
- **Audience-only stakes → the show's own cast model.** Spectators and operators stay distinct (research hazard): cast members fly, the audience wagers. Whether cast may wager on their own episodes is an open integrity question, not an assumption.
- **Stake caps → citizen economic fields, with a known contamination hazard.** Affordability must key off ledger economics (Income/NetWorth/WealthLevel/SavingsRate/DebtLevel), but the S361 trace found the wealth scale calibrated from real-world Oakland — forbidden by doctrine and queued for a population-derived rebuild. Stake-cap math designed against the current scale inherits that defect; flag it at design time.
- **Losses are life events, not cell edits.** Employment-reconciliation precedent: firing is a LifeHistory event with consequences, not a headcount overwrite. A lost wager is the same class — LifeHistory + ripple, with the balance change as one of its effects.
- **Household effects → the single-owner Household_Ledger.** Family-loop decisions (D1–D5) made households real rows; a wager's downside lands on a household, not an isolated citizen. Debt and grudge propagation route through existing ledgers (Relationship_Bond_Ledger, engine.94 grudge/ambition typing) rather than a parallel debt system.
- **The realism gap is the opportunity.** The 2026-08-01 audit: the engine emits near-zero negative economic vocabulary, so editions mirror a world without stakes. A casino is a *controlled* negative-economics generator — winners, losers, debts, grudges — which is exactly the drama supply the audit found missing (game-env review §3.3/§3.4 frame: this is the fun work).
- **Wager subjects generalize beyond the show.** A's games (settled sports feed exists), elections, initiative votes. Each subject needs its own settled-outcome source with the same adapter-grade provenance; the show is the proving case because its outcome source is already deterministic and gated.
- **Operator is a canon decision, not a detail.** Who runs the book in-world — an existing business, a minted one, an underground operator — determines legality texture, coverage voice, and which ledger holds the house's money. Media-minted businesses need a canon gate (employment research precedent).
- **In-world money only, forever.** No real-money anything. Fictional activity among simulated citizens against in-world economic state. This is a hard floor from the original research, restated so it survives every future edit of this file.

**Design-question checklist (the template the design doc must fill):**

1. **Event IDs** — which adapter outcome fields are wagerable; how a wager row references the exact `Undocked_Feed` event it settles against.
2. **Published odds** — who sets them (house algorithm vs authored), where they are published in-world (Tribune? operator channel?), whether odds are canon once published.
3. **Eligible citizens** — who may wager (adults? solvency floor?); excluded classes; whether Tribune staff / officeholders wagering is texture or a conflict-of-interest story seed.
4. **Stake caps** — per-wager and per-cycle caps as a function of citizen economics; behavior when a citizen's economics change mid-cycle with open wagers.
5. **Funding source** — where the house's bankroll lives; what happens when the house can't cover a payout.
6. **Settlement timing** — at cycle fire (which phase), idempotency across re-runs, interaction with the Saturday canon door.
7. **Household economic effects** — how wins/losses flow to Household_Ledger; debt floor; can a wager push a household into a state no writer handles.
8. **Audit trail** — append-only wager ledger shape; every settlement traceable to a feed row; reproducibility standard at least equal to the lottery draw's (seed + snapshot + result recorded).
9. **Loss safeguards** — caps, cooling-off, maximum cumulative exposure; the explicit bound that keeps the casino causal without destabilizing the economy.
10. **Downstream typing** — how outcomes feed engine.94 grudge/ambition typing, Relationship_Bond_Ledger debts, and ECL texture (sore-winner / quiet-loser lines) without double-counting the same event.
11. **In-world presentation** — name, operator, legality, venue; whether it is show-adjacent (Undocked book) or a general Oakland institution taking action on elections and ballgames too.
12. **Failure modes** — voided wagers (episode fails the gate after bets placed), adapter corrections, citizen death/departure with open positions (citizen-archive boundary interaction).

**Not applicable / hazard:**

- **This file authorizes nothing.** No Sheet, tab, schema, business, odds line, or balance mutation. The plan's gate stands verbatim: 4b requires its own design doc + Mike sign-off; sign-off is Mike-only and was explicitly NOT delegated when the lottery filter/params were (2026-08-15 correction).
- **Sequencing is binding.** 4a narrative texture runs ≥2 cycles before 4b is designed. Drafting answers to the checklist above before 4a has produced real texture is exactly the "promise mechanics before verification" hazard the original research names.
- **Never invent balances or bettors.** Test fixtures must be visibly synthetic; no wager row may name a citizen who did not opt in through whatever eligibility mechanism the design defines.
- **Do not extend the show's contracts by implication.** `Undocked_Feed`/`Undocked_Standings` serve the show; a casino reading them is a new consumer requiring its own contract review, not an inherited right.
- **Fourth wall.** Odds, stakes, and settlement are in-world objects. No surface may name the mechanism (adapter, feed, cycle fire) any more than the feed contract may name the game.

**Verdict:** `watch` — this is a design-question record for a Mike-gated lane, not a build recommendation. Adopt-trigger (both required): (1) Phase 4a narrative wager texture has run ≥2 cycles, AND (2) Mike signs off on opening the 4b design doc. Until then this file only accretes constraints. No dedicated ROLLOUT row — pending-state stays on research.27's plan, whose Phase 4b gate this file serves.

**Shipped status (2026-09-08 true-up, kimi):** 4b is no longer gated — it shipped live 2026-09-01 (S410, commit `d1220bfa`, direct builder sign-off "turn on the casino"; bench C106 run at arm time: 9 open sports slips, 0 errors). Design + build docs archived with disposition notes: [[../archive/plans/2026-08-31-grok-casino-ledger]] and [[../archive/plans/2026-08-31-grok-casino-ledger-build]] (filed 2026-09-04, S420). The `watch` verdict and its adopt-trigger above are superseded as gate mechanics — they stay as history. This file's role shifts from gate substrate to **constraint record** for future casino work (election/initiative markets, settlement-proof watch); new findings land here.

**Live state at C106** (output/beats/Casino_Ledger.jsonl, full-tab dump via scripts/dumpBeatTabs.js:47 — no row filter; output/beats/meta.json cycle 106, prevCycle null): HOUSE float row at 250000 + 12 open sports slips — all CyclePlaced=106, all MarketFamily sports / sports:as / event next-as, odds 1.83, stakes 134–667, per-slip Seed recorded, all Status open, zero settled rows. Four slips carry empty HouseholdId, verified by design rather than defect (builder-confirmed rule: not everyone has a household; it is life progression): POP-00214 / POP-00645 / POP-00656 each held a single-person household dissolved at C101, POP-00806 has no household row at all (output/beats/Household_Ledger.jsonl: 712 rows, 465 active / 247 dissolved, 137 dissolved@C101); the truthy householdId guard (casinoLedgerEngine.js:606) skips household writes cleanly for them.

**Checklist questions the shipped build answered** (verified against phase05-citizens/casinoLedgerEngine.js, 2026-09-08):

- **Q1 Event IDs / settlement source** — adapter/feed rows only, no LLM in the settlement path: `casinoResolveUndocked_` (:174) and `casinoResolveSports_` (:203) settle against typed feed rows. Null CreditsDelta resolves `VOID_GATE` (:187) — already exercised live by episode undocked-pop00143-2026-09-08T01-30-06 (feed c106, flag `credits_delta_windowed`).
- **Q3 Eligible citizens** — `casinoEligible_` (:285): active adults only, income/net-worth solvency floor (:290), house business barred (:291), and **pilots barred from wagering their own show** (:292, `marketFamily === 'undocked' && isPilot` → false).
- **Q7 Household economic effects** — household writes guarded on a truthy householdId (:606); Household_Ledger.HouseholdSavings mutated in-memory and written own-tab via setValues (:661-663); the slip's HouseholdId is read from the citizen's Simulation_Ledger row (:749).
- **Q8 Audit trail** — append-only wager rows (placement queues an append intent, :760-762) with a per-slip Seed recorded (:710, :759); house float tracked per row via HouseFloatAfter (:758); HOUSE bankroll seeded at 250000 (`CASINO_HOUSE_SEED`, :32).
- **Q9 Loss safeguards** — placement probability `CASINO_PLACE_P = 0.012` base rate (:48, scaled by drive/show/sports factors at :702) plus `casinoCooldown_` cooling-off after settled-loss streaks (:350).
- **Q10 Downstream typing** — CASINO_WIN / CASINO_LOSS / CASINO_DEBT story hooks pushed into S.storyHooks on material outcomes (≥ half weekly income, :622-634).

**Open items carried forward:**

1. **Undocked-market placement is structurally dead (off-by-one).** Placement requires `casinoUpcoming_` rows with TargetCycle === fireCycle+1 (:341; the placement block's own comment reads "Placement against NEXT cycle only — this cycle's outcomes are already known", :666-667), but the nightly orchestrator reads currentCycle and only then pushes TargetCycle = currentCycle+1 (scripts/cron-undocked-run.js:104-107, 149-152) — always after the fire that set currentCycle. At fire N every feed row has TargetCycle ≤ N → `upcoming` is always empty → `showOn` false (:667) → no undocked-market slip ever places. C106 dump: 12 slips, zero undocked (against a live show market at ~50/50 pick odds, 0/12 ≈ 2.4e-4). **Engine-sheet decision item** — options recorded in the owning plan's post-ship open items.
2. **Settlement path unproven live as of C106** — zero settled rows exist; the first real settlement is expected C107+. Watch.
3. **Stake caps still key off the S361-flagged wealth scale** — `casinoStake_` (:270-283) reads Income/NetWorth/WealthLevel from the ledger; if the population-derived wealth-scale rebuild has not landed, the cap math inherits that defect. Verify before asserting in any future casino work.
4. **Pre-C106 placement history not locally observable** — the beats dump pipeline only started at C106 (output/beats/meta.json prevCycle null; pipeline.68 Task 1), so nothing before that is reconstructable from local dumps.

**Ignited plans:** none (gated; the future design doc ignites from this file). *(Historical — the design/build docs ignited from this file and shipped; see Shipped status above.)*

---

## Applications (living)

- 2026-08-29 — Created as the standing question record for plan Phase 4b; consolidates the wagering design questions previously scattered across the SpaceMolt research, the game-environment review, and the plan itself.
- 2026-09-08 — 4b shipped via direct builder sign-off (S410, `d1220bfa`), superseding this file's watch verdict / adopt-trigger as gate mechanics. Live C106 state recorded (HOUSE float 250000 + 12 open sports slips, zero settled; undocked-market placement structurally dead). Role shifts from gate substrate to constraint record for future casino work — election/initiative markets and the C107+ settlement-proof watch start here.

---

## Changelog

- 2026-08-29 (kimi) — Initial consolidation (S393, builder-directed).
- 2026-09-08 (kimi) — True-up to shipped reality: 4b live 2026-09-01 (S410, `d1220bfa`); Shipped status note added near the Verdict (verdict kept as history); live C106 tab state + the six answered checklist questions verified against phase05-citizens/casinoLedgerEngine.js and output/beats dumps; open items recorded: undocked placement off-by-one (engine-sheet), settlement-proof watch C107+, S361 wealth-scale keying for stake caps, pre-C106 observability gap. Stale 2026-08-29 claims marked, not rewritten.
