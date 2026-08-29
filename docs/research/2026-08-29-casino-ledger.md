---
title: Casino Ledger (Undocked Phase 4b) — research
created: 2026-08-29
updated: 2026-08-29
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

**What this addresses:** The SpaceMolt game-show plan's Phase 4b — the first mechanism where the *audience* takes downside, not just the cast. It is explicitly NOT authorized ("a casino ledger is not authorized by mentioning it"); 4b sign-off is Mike-only. This file is the measure-twice substrate behind that future sign-off: what the ledger would have to answer before any Sheet, tab, schema, balance, or odds exist.

**What it does (current verified state):** Nothing economic exists today. Phase 4a is narrative-only wager texture (ECL pool lines authored 2026-08-17, fail-closed until engine-sheet lands the flag/dial wiring); no balances move and no odds are canon. `Undocked_Standings` (greenlit 2026-08-18, deterministic aggregation over `Undocked_Feed`) is named in the plan as the 4b *substrate* — the settled-outcome source a ledger would resolve against. The show's adapter already produces the fact/subjective split a settlement engine needs: typed, provenance-marked outcomes, gate-approved before they are sim-facing. Sequencing constraint from the plan: 4a runs ≥2 cycles before 4b is even *designed* — this record is the question list, not the design.

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

**Ignited plans:** none (gated; the future design doc ignites from this file).

---

## Applications (living)

- 2026-08-29 — Created as the standing question record for plan Phase 4b; consolidates the wagering design questions previously scattered across the SpaceMolt research, the game-environment review, and the plan itself.

---

## Changelog

- 2026-08-29 (kimi) — Initial consolidation (S393, builder-directed).
