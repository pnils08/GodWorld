---
title: The Money Game Plan
created: 2026-10-16
updated: 2026-10-16
type: plan
tags: [engine, economy, citizens, heritage, civic, draft]
sources:
  - phase05-citizens/generationalWealthEngine.js (processMoneyLoop_, applyOwnerDraw_, updateHeritage_ doors A/B/C, heritageStanding_)
  - phase05-citizens/applyBusinessDynamics.js (the only Annual_Revenue writer)
  - output/simulation_ledger_snapshot.jsonl at C111 vs the C106 snapshot (commit 38bbfd80)
  - live Business_Ledger, Heritage_Ledger, Household_Ledger, Initiative_Tracker headers (read 2026-10-16)
  - docs/plans/2026-08-10-economy-native-rebuild.md §Read 2026-10-16
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.295"
---

# The Money Game Plan

**Builder's words (2026-10-16):** "the way money is spent doesn need to be transactional in all Cases so do we have a system that allows citizens money to decrease? Since all life has expenses is their life game more about the accumulation with event type loses , just don't want to build a system out that's fixing a problem that doesn't exist" · "Overall like you said the system seems ok we just need more risk for wealthy citizens maybe" · "maybe this build is chasing the wrong problem and maybe a session of getting the "game" written down so we can build the right pieces for this" · "Agreed on the game document , and I see what you mean , the "not earned" in the sim is ok as we are figuring they had that . But what the firm is making could be looked at. Not sure if that firm is building the Baylight district so it gets more revenue , the heritage ledger likely needs more gating on how you get on it I'm assuming , 50 million isn't really a "rockafellar" presence in a city" · "Probably not a bad idea to add a "firm" or something like that to iniative tracker as the awarded firm on iniatives to account for a boost of some sort"

**Goal:** the money game written down — how a citizen gains, how a citizen loses at every scale, where a firm's revenue comes from, and what makes a family line — so engine-sheet builds the pieces the doc names, in the order it names them, and nothing before.

**Rows:** engine.295 · **Owner:** research-build (the session is the builder + rb; engine-sheet builds from the result)

## What the engine does today (es read, 2026-10-16 — the baseline the session designs against)

**Gains.** Each Cycle an adult banks `Income ÷ 52 × SavingsRate` (rate 1–25% by wealth band, × education, × SuperCouple, × bank-rate weather) into NetWorth. The un-saved share is spent with no transaction. Income moves by promotion (+6–12%), hire (job-priced), layoff (−12–20%), hospital (−3–8%), owner draw (½ of the firm's revenue − wages, recomputed each Cycle). Windfall 0.2%/Cycle, $2–15k.

**Losses — every door, with how often it has fired on the live ledger:**

| Door | Size | Fired |
|---|---|---|
| Debt drag | $40 × DebtLevel per Cycle, capped at that Cycle's saving — NetWorth never goes negative from it | every indebted adult, every Cycle |
| Paying a level down (engine.276 lean) | $800 × level | 231 citizens stepped down C106→C111 (engine.276 live C110 — partly its first roll) |
| Unplanned expense | 0.4%/Cycle, $1.5–8k, shortfall → DebtLevel +1 | 36 lines on the ledger |
| Default | at DebtLevel 6 under the hood line, 1-in-debtDefaultCycles — NetWorth → 0, level → 1 | 9 ever |
| House purchase | 20% down out of the household's NetWorth | ~60 buys |
| Trade-up / forced sale | down payment; `homeLossChance` .017 | lines exist |
| Property tax (engine.271) | rate × hood home value, once a sim year, owners | live |
| Fines, custody weeks unpaid, casino losses, founding capital | income-scaled / Income÷52 × weeks / stake / class mint size | 35 / few / 40 / rare |

Rent: 684 LifeHistory lines, 0 debits. No door scales with wealth: a $100M citizen feels none of the above.

**The arc, C106→C111 (876 same Active citizens):** NetWorth up 487 / down 316 / flat 8; median change +0.02%, 10th percentile −0.67%, 90th +0.58%; total $13.09B → $13.10B. Income up 123 / down 7 / flat 746. Biggest drops were events: a house (Priya Nair $345k → $188k), a default (Isaac Martinez $36k → $20).

**Firms.** `applyBusinessDynamics.js` is the only Annual_Revenue writer: revenue drifts from the Cycle's event mix (chaos, hood retail vitality, coverage sentiment); an initiative lifts every business in its hoods once, the Cycle it changes phase; a stalled one drains. No path names a contractor. The engine's profit is revenue − wages, nothing else. Twenty firms carry an owner tag; the ten C107 mints: Coastline Construction 221 staff / $186M / **$843k revenue per head**, Anchor Build $810k, Foothill $871k, Northgate $826k, Oakland Tech Collective $976k, Pacific Standard $504k, Ridgeline Studio $533k, Coliseum District Development $629k — the 172-firm city reads median $117k/head, 90th percentile $505k. Canon (`docs/canon/INSTITUTIONS.md`) lists these firms as the slots Baylight / Health Center / Transit Hub need; **no award exists in canon or any edition.** Initiative_Tracker's `BizID` column is the business an initiative *creates*, not a contractor.

**Owners.** Off-heritage Tier 3–4 owners take ½ of (revenue − wages) as Income; on-line owners take ½ of profit ÷ 52 onto NetWorth instead. The eight principals: Income $8–84M; NetWorth $16–168M **seeded at mint** (~2× the draw, not accrued); all Tier 3; all seven households rent.

**Heritage.** Nine lines live: Varek $10.0B, Keane $450M, Dillon $396M, Kelley $375M (Established); Horn $90M, Paulson $76M, Reaves $50M, Corliss $2.5M, Villanueva $1.2M (Founding). Doors: A = 3 living members + $1M combined; B = one person $350M; C = one person $50M + an owned home. Standing = 10·log10(NW/$1M) + 3·(generations−1) + 3·civic + 3·fame + 4·businesses + 2·homes − 5·scandal; tiers Founding 0 / Established 30 / Prominent 50 / Dynasty 70. A $50M line scores 17 on wealth. Five principals (Achebe $168M, Salcedo $132M, Zavala $87M, Voss-Adeyemi $72M, Raman $54M) clear Door C's money and found a line the Cycle a house-buy roll lands.

## Settled (builder rulings 2026-10-16, verbatim above)

- S1 The money system is not broken: accumulation with event-type losses is the game. No cost model, no draw cap — the engine.295 build as drafted is not built.
- S2 The principals' seeded NetWorth stands as canon ("we are figuring they had that").
- S3 The firms' revenue is the thing to look at — and whether a firm holds the Baylight contract is a canon question, not a formula.
- S4 Heritage needs more gating on how a family gets on it; $50M is not a Rockefeller presence.
- S5 An awarded firm on an initiative is wanted — "a boost of some sort" while the work runs.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | **Risk at scale.** Write what a wealthy citizen can lose, through which doors, how often and how deep: a firm's bad year reaching the owner (Income and/or NetWorth), a failed venture, a lawsuit, a divorce settlement, a market loss. Each door written as start → peak → end → aftermath (SIM_DOCTRINE §15), with the rate as the dial. | rb + builder | not started |
| 2 | **Owner's fortune vs the firm's fate.** Rule whether an owner's NetWorth rides the firm (revenue falls → fortune falls; closure → what is lost), or only the draw does. Today only Income moves. | rb + builder | not started |
| 3 | **Where a firm's revenue comes from.** The AwardedFirm concept: a contractor column on Initiative_Tracker (distinct from `BizID`), the boost to the awarded firm's books while the initiative runs, and the loss when it stalls, is defunded or completes. Name the Baylight contractor (canon call) or rule the mint firms' revenue rebased to a per-head scale. | rb + builder | not started |
| 4 | **The ordinary household's loss side.** Is the treadmill (median NetWorth +0.02% over five Cycles) the intended feel, or should living cost something — and if so, as an event (a rent year that outran the raise) rather than a weekly debit. | rb + builder | not started |
| 5 | **Heritage gates and ladder.** What "Rockefeller presence" means in this city — money, time held, homes, businesses, generations — and rewrite Doors A/B/C and the standing bands from that, so the door and the ladder agree (today Door A admits $1.2M lines; Door C admits $50M that scores 17 of Dynasty's 70). Rule what happens to the nine existing lines. Builder re-raised 2026-10-21 (verbatim in [[2026-10-10-engine-214-mood-per-hood]] step 8, engine.309): "50M may be too low as that amount of money doesnt necesarrly make a person affluent in a city." engine.309 (off-heritage ascent) ends at this door and takes its number from here. | rb + builder | not started |
| 6 | **Build order.** From Tasks 1–5, the engine.* rows in sequence with their acceptance checks, each as its own plan or a section here; engine-sheet picks them up from ROLLOUT. | rb → es | not started |

## Acceptance

1. Every loss door for the wealthy is written with a trigger, a rate, a size and an aftermath — no door "that can't fire".
2. The owner / firm / initiative chain is one diagram: initiative → awarded firm's revenue → profit → owner's draw / fortune, with the loss path drawn too.
3. Heritage doors and standing bands agree: a line that clears a door reads at least the tier the door implies, and the nine live lines have a stated disposition.
4. Tasks 1–5 carry the builder's words verbatim; Task 6 is a sequenced list of engine rows es can execute without a design question.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| The money read (loss doors, C106→C111 arc, firms, heritage) | es | this doc §What the engine does today; ROLLOUT engine.295 | read-only |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | Money leaves a citizen only by event; spending is the un-saved share, no transaction | es · builder | generationalWealthEngine.js processMoneyLoop_ |
| A2 | No loss door scales with wealth | es · builder | §Losses table |
| A3 | The mint firms' books, not the draw formula, are the off-scale number | es · builder | live Business_Ledger read 2026-10-16 |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|
| P1 | The 231 debt paydowns C106→C111 are mostly engine.276's first roll, not steady state | es | the C111→C116 window re-run after the next snapshots | engine.276 live C110 |

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|
| N1 | AwardedFirm on Initiative_Tracker | builder 2026-10-16 | a named contractor's books rise and fall with civic work — the first wealth risk that arrives through the council, not dice | adopted into Task 3 |
| N2 | A contract is also a risk door (defund → the firm loses it) | es 2026-10-16 | pairs N1 with Task 1 | adopted into Task 1 |

## Open questions

- Does Coastline Construction hold the Baylight contract? — blocks Task 3; for the builder (canon).
- Do the nine existing heritage lines keep their standing under a rewritten gate, or are the small ones (Corliss, Villanueva) re-read? — blocks Task 5; for the builder.
- Does a divorce or a lawsuit exist as an event in the engine today? — blocks Task 1; es code read before the session.

## Changelog

- 2026-10-21 (research-build) — Task 5 re-raised by the builder ($50M too low); engine.308/309 filed under the engine-214 plan cross-link here; 309 ascent waits on this door number.
- 2026-10-16 (engine-sheet) — Created from the money read with the builder; engine.295 re-scoped to this doc; rulings S1–S5 verbatim; Tasks 1–6 for the research-build session.
