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

### Task 5 design — the heritage doors (research-build + builder, 2026-10-21 afternoon)

**Builder (verbatim), the nine lines:** "if they dont belong on this type of ledger than a reread is likely the answer." **The gates:** "lets adress the heritage gates , whos in, who needs to be removed, what gates should exist, networth above 150m can be the cash gate or even higher if creates a relaistic gap, but maybe just being super rich isnt the only way in, perhaps a fame score added to a lower net worth, this is why its in the "game" build as this ledger is essentially you are winning ht egame of life and maintaining your place on this ledger is "winning the game". so gating a net worth matters but other combinations could allow entry as well." Earlier the same day: $50M too low, ~$150M, "money I dont believe is the only factor."

**The read (live Heritage_Ledger C112 + Simulation_Ledger snapshot C112 + `generationalWealthEngine.js`):**

| Line | Door in | NW | Standing | Tier | Members / gens | Home | Biz | Fame |
|---|---|---|---|---|---|---|---|---|
| Varek | B | $10.0B | 48 | Established | 1 / 1 | 0 | 1 | 0 |
| Keane | B | $450M | 37.5 | Established | 2 / 1 | 0 | 1 | 1 |
| Dillon | A | $397M | 36 | Established | 3 / 2 | 0 | 1 | 1 |
| Kelley | B | $375M | 34.7 | Established | 1 / 1 | 1 | 1 | 1 |
| Horn | C | $90M | 24.5 | Founding | 1 / 1 | 1 | 0 | 1 |
| Paulson | C | $76M | 23.8 | Founding | 1 / 1 | 1 | 0 | 1 |
| Reaves | C | $50M | 22 | Founding | 1 / 1 | 1 | 0 | 1 |
| Corliss | A | $2.5M | 10 | Founding | 4 / 2 | 0 | 0 | 1 |
| Villanueva | A | $1.2M | 3.8 | Founding | 4 / 2 | 0 | 0 | 0 |

- Doors today (`:2541-2551`): A = 3 living members + $1M combined; B = one member $350M; C = one member $50M **+ an owned home**. Nobody is Prominent (50) or Dynasty (70); a $150M line scores ~22 on wealth alone (Founding).
- **Off the ledger at ≥ $150M, eight citizens** — Skenes $245M, Conrad $240M, Aitken $225M, Richards $180M, Bubic $180M, Achebe $169M, Davis $160M, Miller $160M. None has an owned home; the home, not the money, is what Door C holds them out with. A pure cash door at $150M admits all eight the first Cycle. $50M–$150M off-line: Salcedo $133M, Rivas $100M, Kerkering $100M, Rushing $90M, Zavala $88M, Voss-Adeyemi $72M, Bautista $64M, Raman $54M.
- **Fame exists twice already (FIX, not ADD).** (1) `UsageCount` on the Simulation_Ledger = press mentions; the standing formula's fame term counts members at ≥5 (83 citizens clear it — too wide for a door); ≥10 = 36, ≥20 = 7 (Keane 63, Dillon 62, Paulson 39, Aitken 30, Kelley 30, Miller 23, Raines 20). (2) `Cultural_Ledger.FameScore` — 50 rows, every one linked to a POPID via UniverseLinks, decays each Cycle (`decayCulturalFame_`), +5 per sighting; ≥50 = 13, ≥75 = 7, ≥100 = 3 (Marin Tao 153, Rico Valez 116, Jade Orion 104). **Every FameScore ≥ 50 citizen holds under $1M.** The A's stars and Paulson are on the Cultural_Ledger but under 50. A fame door therefore admits nobody today unless its money term is small, and its entrants will rise and fall with the decay — which is the game the builder named.
- **Why Corliss/Villanueva never fall off** (`:3122`): the low-standing clock runs only on a line whose PeakTier was ever Established (`heritageRank_(peakTier) >= 1`). Founding lines are exempt by construction; the only exit for them is "empty" (no living member, 4 Cycles).

**Proposed shape — combination doors, re-read every Cycle. Every number in brackets is the builder's to set.**

| Door | Clears when | Admits today (off-line) | Keeps today (on-line) |
|---|---|---|---|
| **Fortune** | one living member NetWorth ≥ **[$150M]** (replaces B $350M and C $50M) — **[with / without] an owned home** | with home: nobody; without: the eight above | Varek, Keane, Dillon, Kelley |
| **Fame** | a living member with Cultural_Ledger FameScore ≥ **[75]** (7 today) **or** UsageCount ≥ **[20]** (7 today), AND combined NetWorth ≥ **[$5M]** | nobody today at $5M; at [$0.5M]: Dax Monroe, Tara Ellison | Paulson (usage 39, $76M); Keane/Dillon/Kelley also clear |
| **Roots** | **[3]** living members across **[2]** generations AND combined NetWorth ≥ **[$25M]** AND **[1]** owned home (replaces A $1M) | nobody today | Dillon already in on Fortune |
| **Civic** (optional, "combinations" plural) | a living member CIV=yes AND combined NetWorth ≥ **[$25M]** | not read yet (53 CIV citizens; join pending the builder wanting this door) | — |

- **Who is removed under this shape:** Horn ($90M, usage 16), Reaves ($50M), Corliss ($2.5M), Villanueva ($1.2M) clear no door → dormant after the grace below. Paulson stays by Fame only. That is 4 of 9 lines out, 5 kept, 8 in by Fortune (without the home) or 0 (with it).
- **Re-read = the per-Cycle door check, not a sweep** (drift over static backfill). Fix shape for es: the `lowC` trigger at `:3122` becomes "clears no door this Cycle" for **every** line (drop the PeakTier guard), with `HERITAGE_LOW_CYCLES` re-bracketed from 52 to **[4]** as the grace; the dormant row, the readers' skip, the household fallback and the revival path (`:3112-3119`, the line's own members clear a door again) are untouched. "Maintaining your place" is then a real loop: clear a door every Cycle or go quiet, come back when you do.
- **Ladder.** Founding 0 / Established 30 / Prominent 50 / Dynasty 70 stay the ladder; a Fortune entrant at $150M lands Founding (22), Varek tops out Established (48). If the door is the Rockefeller bar, the bands sit too high for the ledger it admits: proposal **[Founding 0 / Established 25 / Prominent 40 / Dynasty 60]**, or leave them and let the city grow into them. Builder's call; either way the door and the ladder are the same formula components.
- **Alternative considered, not proposed:** one door = standing ≥ [30], the formula re-weighted so fame can carry it (today fame caps at 9 points, so no famous-and-poor citizen could enter). Rejected because the builder asked for combinations and the formula's fame term is the wide UsageCount ≥5 bar.
- **Stays separate:** engine.308 (cap/cooldown) and engine.309 (ascent/crash) are untouched by this; 309's door number = the Fortune door here, per the morning ruling.

**agy §Review 2026-10-21 — HOLD** (`output/antigravity/2026-10-21-review-money-game-task5-heritage-doors.md`, every number re-verified against live Heritage_Ledger / Household_Ledger / Business_Ledger / Cultural_Ledger + the C112 snapshot). Corrections folded here; the table above is superseded where they conflict.

*Facts the table got wrong:*
- **Biz counts read the wrong column.** Standing counts every Business_Ledger firm a member owns (Key_Personnel), not just heritage-minted ones. Keane owns 2 (academy + Keane Mercantile), hence 37.5. Varek owned 2 at C112 (Civis Systems, Oaks) and opened Varek Systems the same Cycle: at C113 he scores **52 = Prominent** under the current bands. "Nobody is Prominent" is wrong from C113.
- **Homes.** Keane's household is owned (HomesOwned=0 on the heritage row is a seeding gap: `foundLine_:2802` stamps a home only for Door C founders). **Varek rents.** Dillon rents. So Fortune-with-home keeps Kelley and Keane only, and **removes Varek ($10B)**; Roots does not keep Dillon.
- **Fame door at [$5M] admits Aitken ($225M, usage 30) and Miller ($160M, usage 23)**, not nobody — they are off-line and clear it even when Fortune needs a home. At [$0.5M] it adds Raines, and neither Dax Monroe ($487K) nor Tara Ellison (usage 2, FameScore under 75) qualifies.
- **Civic door admits nobody**: the richest CIV=yes citizen is Ashford at $12M; no on-line family has a CIV member.
- Net: removed = Horn, Reaves, Corliss, Villanueva, **plus Varek if the home is on Fortune**; admitted = 8 (Fortune, no home) or 2–3 (Fame only).

*The fame door as written does not do what the builder asked (H4, the weakest assumption):* UsageCount is a lifetime counter that never decays, so anyone in by it can never fall off; Cultural FameScore decays but the standing formula ignores it (counts UsageCount ≥5 only), so a cultural entrant sits at standing 0 forever; and every FameScore ≥75 citizen holds under $0.5M with ~$15k/yr savings, so no money floor above that ever opens. **Fix shape (rb):** the Fame door reads Cultural FameScore only, and the standing formula gains a FameScore term [FameScore/25, capped 6] so the ladder sees what the door saw; the money floor on it is then the builder's call between [$0 — fame is the whole ticket] and [$0.5M]. Under this, Paulson/Aitken/Miller enter or stay only if their cultural FameScore clears the bar (all three are under 50 today) or they clear Fortune.

*Build defects es must carry with the trigger change (H2/H3, file:line in the review):*
1. Revival (`:3117-3120`) hardcodes the old doors — with the new `lowC` alone, the four removed lines revive on Cycle t+5 via old Door A/C and oscillate forever. One shared `lineClearsAnyDoor_` predicate for both revive and `lowC`.
2. The maneuver engine gives a dormant member the goal `revive` before `home`/`establish`, which zeroes their home-purchase climb multiplier and writes "the name to bring back" into their wakes — wrong for a family removed because it never belonged. A dormant-for-"no door" line should fall through to the household goals.
3. Pre-existing: revival clears DormantSince at `:3123` before the hook reads it at `:3317` — every revival hook prints "dormant since C?". Drop the `:3123` clear.
4. The dormant LifeHistory line and hook (`:3291, :3297`) say "the money that made it is gone / standing under 10" — wrong text for Horn/Reaves/a decayed-fame line; reason text per door.
5. During the [4]-Cycle grace, tenure and the heritage business roll keep running (`:3133-3138, :3172`) — freeze both while `lowC > 0`.
6. `foundLine_:2802` seeds HomesOwned only for `door === 'C'`; the LifeHistory/hook branches at `:2805-2809, :2823-2826` test B/C by name; `scripts/householdReconcile.test.js:455-491` asserts the letters. A door rename needs all three moved to "any founding member in ownedHomePops" + per-door copy + test update. FoundedDoor itself has no runtime reader.

*Separate from this task, found by the review:* Varek crosses to Prominent at C113 on the business roll alone — read it in the C113 edition watch.

**Builder 2026-10-21 (verbatim), round 2 after the agy review:** "Varek would be in on money alone, so money can be its own gate , but the money have to be above 150m, 250m something like that. Fame score and/or usage count.  With a lower net worth , and then maybe a house , spouse , net worth and tier or usage . Ultimately 3 challenging ways to obtain . We don't want all the athletes in cause they make most money. Also considering that all the members of heritage are inherited and not earned through the game mechanics . So a test on who is the richest sim seeded citizen and how likely and how long would it take them to achieve the heritage ledger ."

**The three doors as ruled (numbers bracketed, builder's):**
1. **Fortune** — one living member NetWorth ≥ **[$250M]**, nothing else. Live: at $150M the door admits 8, seven of them ballplayers (Skenes, Conrad, Aitken, Richards, Bubic, Davis, Miller) + Achebe; at $200M three ballplayers (Aitken, Conrad, Skenes); **at $250M nobody off-line** — Varek, Keane, Dillon, Kelley keep. $250M is the athlete-proof number today; Skenes sits at $245M.
2. **Fame** — Cultural_Ledger FameScore ≥ **[75]** and/or UsageCount ≥ **[20]**, with NetWorth ≥ **[lower, e.g. $5M]**. Live: the FameScore half admits nobody above $0.5M (every FameScore ≥ 50 citizen holds under $0.7M); the UsageCount half at $5M admits Aitken and Miller (both ballplayers) and keeps Paulson. If the athletes are the concern, the fame door reads FameScore only — the A's stars are on the Cultural_Ledger but all under 50 — and the standing formula gains the FameScore term (agy H4) so a fame entrant can climb and, when the score decays, fall.
3. **Roots** — an owned home + a spouse + NetWorth ≥ **[$5M]** + (Tier ≤ **[2]** or UsageCount ≥ **[10]**). Live (Household_Ledger owned + SpouseId, no lineage): 152 citizens live in an owned household, **10** of them married with no line; at $1M that is 5 (one Tier ≤ 2: Johhny Necklar, $6.4M, a Hall of Famer); at $5M, 2 (Necklar + Gregory Mims, $12.8M, Organized Crime); at $10M, Mims alone; at $25M nobody. Nobody in the ten has UsageCount ≥ 10. **Challenging as asked: the Roots door admits one or two citizens today and the tier/usage clause decides which.**

**The test — who could earn the ledger through play (money loop `processMoneyLoop_:436-438`: NetWorth += Income/52 × SavingsRate × edu/super/yield factors per Cycle; `applyOwnerDraw_`: an off-heritage owner's Income = firm profit × 0.5):**
- Every line on the ledger today is seeded wealth: five ballplayers/Varek/Paulson (authored NetWorth), Corliss (authored), and **Villanueva — the one line the game produced** (Tomás, electrician, $0.56M + Renata, ER nurse, $0.63M + two kids, in through Door A's three-members-and-$1M). Under the re-read it is the first line out.
- Richest citizen whose money is not an authored seed: the engine.306 mint-firm principals (POP-01092–01099, Achebe $169M … Price $16M) carry incomes of $8M–$84M/yr — the "mint firms' books off-scale" already flagged in this plan's read; they are seeds too, just newer. Below them: Gregory Mims $12.8M (Organized Crime, Income $200K, SavingsRate 0.02), Kelvon Ochoa $4.6M, Linda Chow $3.3M.
- **Time to the money gate by saving alone.** Top ordinary saver in the city: Amara Osei (Tier 3, Income $2.4M, rate 0.12) banks $284K/yr → $150M in **525 years**, $250M in 877. Median ordinary citizen banks $6.9K/yr. Even the mint principal Lindqvist ($18.8M income) needs 33 years to $150M. **Likelihood of an engine-grown citizen reaching Fortune under current mechanics: zero in the sim's lifetime.** The owner draw does not change it: a firm's profit pays its off-heritage owner as Income, and Income still saves at 0.12–0.20.
- What that means for the design: Fortune is a seeded-aristocracy door by construction and that is fine if named — "old money." Fame and Roots are the only doors the game can hand a citizen, which is why they must be reachable: Fame moves with the Cultural_Ledger decay (+5 per sighting, decays each Cycle), Roots moves with the home-purchase roll, marriage and the Tier ladder. The money terms on those two doors are the dials that decide whether anyone born in the sim ever wins the game; at [$5M] the answer today is two citizens.

**Builder's calls on this shape (round 2) — answered in round 3 below:** the Fortune number [$250M]; Fame reads FameScore only or both measures, and its money floor; the Roots money floor and whether the clause is Tier ≤ [2] or UsageCount ≥ [10]; the bands. Earlier calls (home on Fortune, Civic door) are answered: no home on Fortune, no Civic door.

*Superseded first-round calls:* (1) Fortune door with or without the owned home — swings who's-in by eight names; (2) which fame measure and bar (Cultural FameScore [75] / UsageCount [20]) and the money under it [$5M]; (3) Roots door kept as written or dropped; (4) Civic door yes/no; (5) the bands. Outside check on the spec: agy §Review (builder 2026-10-21: es and codex are on a separate build).


**Builder 2026-10-21 (verbatim), round 3:** "Fortune at 250m is good , it not about keeping the athletes out it's just making sure they all don't get but the new 250m money gate makes sure only the highest paid are. The fame rn doesn't award any cash benefit but I think the sightings or something could be used for a money benefit from it . Don't want to veer off the build , I'd say you'd have to make it on the cultural ledger and at any point your fame score reaches a certain level and net worth is at a certain level it can get you in , since cultural ledger and heritage ledgers are both ledgers you enter but never leave you just need to have these certain aspect align to get on them, once on them new opportunities emerge. What also helps the cultural ledger plus fame plus networth is are you married , are you in a house as these things drive networth better your odds . The root way as you mentioned is good paying good and/or promoted , marriage , spouse also good paying job and/or promotion , buy a home, sell a home, move to better area, open business or buy one, have kids , gain media attention and cron wakes to have tier 1 . Alot of this isnt built tonwork rhis way and its also needs. The key with root is your not famous, youre not on cultural ledger and tour clock mode is engine. Thats the way to create the challenge and differiate is clock or flag , engine mode gets the all paths, media wouldnt get root , game wouldnt get root , since they need fame and cultural ledger and a money amount , maybe media 5m and game 50m. Civic could have all 3 but approval ratings , if applicable , would be involved ."

**Ruled (round 3):**
- **Fortune = $250M, one living member, nothing else.** Not an athlete exclusion: the number is what lets only the highest-paid through. Settled.
- **Fame = on the Cultural_Ledger + FameScore ≥ [bar] + NetWorth ≥ floor by ClockMode: GAME $50M, MEDIA $5M, ENGINE [$5M], CIVIC [$5M].** Entry is a threshold crossing: "at any point" the score and the money align, the line is founded. A spouse and an owned home are not terms on the door; they are what drives NetWorth up, so they raise the odds.
- **Roots = ClockMode ENGINE only, not on the Cultural_Ledger, not famous** + the life ladder: a good-paying job and/or a promotion, marriage, a spouse with a good-paying job and/or promotion, buy a home, sell a home, move to a better hood, open or buy a business, have kids, press attention and cron wakes that reach Tier 1. Builder: "a lot of this isn't built to work this way."
- **The clock splits the paths:** ENGINE gets all three; MEDIA and GAME get Fortune + Fame only (no Roots); CIVIC gets all three with the office-holder Approval rating (Civic_Office_Ledger, `updateCivicApprovalRatings.js`) as a term where it applies.
- **Enter, never leave.** The Cultural and Heritage ledgers are both ledgers a citizen enters once and stays on; "once on them new opportunities emerge" (the heritage business roll, engine.308, is one). Read against round 1 ("the mechanism is already in place for what happens if they dont meet the gate"): the row never leaves the sheet; dormant is a status, not an exit. **This drops the per-Cycle "clears no door" re-read proposed above** — the door is checked at founding and at revival only; the standing ladder and the existing low-standing dormancy clock (`:3098-3136`, Established-and-above) stay the only ongoing motion. The seeded nine get one deliberate re-read against the new doors (round 1 ruling), as a script pass on the live sheet, not a sweep.
- **Follow-on, not this build (builder: "don't want to veer off"):** sightings as a cash benefit of fame — today a sighting is +5 FameScore and no money. Candidate row after Task 5 lands.

**Live test, round 3 (Cultural_Ledger + Household_Ledger + Civic_Office_Ledger C112, snapshot C112):**
- The Cultural_Ledger links 50 citizens: **34 ENGINE, 15 GAME, 1 CIVIC (Marcus Webb, $0.21M), 0 MEDIA.** No journalist is on it, so the MEDIA fame door admits nobody and cannot until one registers (`registerCulturalEntity_` resolves a POPID by exact name when an event registers the entity; no MEDIA citizen has been registered by any event to date).
- **GAME fame at $50M** — on the ledger above the floor: Keane f31, Dillon f25, Kelley f25, Aitken f25, Paulson f25, Rivas f20, Davis f15, Horn f8. The FameScore bar is the dial: at **[25]** it admits **Aitken** and keeps Keane/Dillon/Kelley/Paulson; Horn (f8) and Reaves (not on the Cultural_Ledger) do not clear it. At [50] nobody clears it. FameScore moves +5 per sighting and decays, so this door opens and closes across Cycles for the same citizen — the "at any point" entry.
- **ENGINE fame at $5M** — one citizen on the ledger above the floor: Steve Conrad, $240M, f6 (ENGINE clock, $10M under Fortune). Every other ENGINE citizen on the Cultural_Ledger holds under $0.7M (Dax Monroe f84 $0.49M, Rico Valez f116 $0.11M). Nobody enters today; the famous-and-engine citizen enters when the money loop or a business carries them to the floor.
- **Roots (ENGINE, off the Cultural_Ledger, owned home + spouse, no line): 8 citizens.** At $1M: Mims (T3, $12.8M, 1 kid), Necklar (T2 retired, $6.4M, 5 kids), Pilar Ramirez (T4, $1.2M, 3 kids). At $5M: Mims + Necklar. At $10M: Mims. Two CIVIC citizens would clear the same shape and are held out only by clock: Whitfield $1.7M, Vincent Ramirez $3.0M — they are Civic-door cases.
- **The nine under round 3:** keep Varek, Keane, Dillon, Kelley (Fortune) and Paulson (GAME fame at bar ≤ 25); out Horn, Reaves, Corliss (Mags MEDIA $0.3M, Robert ENGINE $2.0M, no owned home), Villanueva. 5 keep, 4 out. Admitted today: Aitken (Fame), Mims + Necklar (Roots at $5M). Conrad clears neither.
- **The life ladder, what exists today vs what is missing** (FIX, not ADD — every rung is an engine mechanic already): promotion `checkForPromotions_` + `LastPromotionCycle`; marriage = engine.302 bonds + `MaritalStatus`; home buy = `homeBuyChance_` roll in `trackHomeOwnership_`; home sale = `sellHouseholdHome_`; move hoods = migration/relocation (`migrationRelocation.test.js`); open/buy a business = engine.306 owner door; kids = `checkBirth_`; press attention = `UsageCount`; Tier = the Saturday print → MEDIA usage ladder. **What does not exist: a per-citizen tally of those rungs.** The Roots door needs one — a count of life rungs cleared, read from the columns above (no new sheet, no new column until the count proves it needs persisting), with the door at **[N of 9]** rungs + NetWorth ≥ **[$5M]**. That tally is the build; the rungs are already live.

**Builder 2026-10-21 (verbatim), on the round-3 read:** "The dollar amounts and modes we can clean up but the concept still holds on how you can make their clock status determine what gets you on but it's not supposed to be easy . Being on that ledger means you have had alot go your way" — the clock split is the concept and it is settled; the numbers are bracketed cleanup. For Roots that sets the tally high: most of the nine rungs, not a few — the door reads a life where a lot went right, so the bracket is [7 of 9], not [3].

**Builder's calls on this shape (round 3):** the FameScore bar ([25] admits Aitken and keeps Paulson; [50] admits nobody); the ENGINE and CIVIC fame floors ([$5M]); the Roots rung count [N of 9] and money floor ([$5M] = Mims + Necklar today); which Approval reading gates the CIVIC doors (the office-holder's own rating ≥ [50], or none when the citizen holds no office). Answered this round: Fortune $250M; fame reads the Cultural_Ledger FameScore, not UsageCount; the clock split; no per-Cycle re-read.


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
- ~~Do the nine existing heritage lines keep their standing under a rewritten gate, or are the small ones (Corliss, Villanueva) re-read?~~ **Ruled 2026-10-21 (builder): a re-read** — every line clears a door every Cycle or goes dormant; design in Task 5 above.
- **Builder 2026-10-21 (verbatim), on falling off:** "only those that clear the gate go onto the heritage ledger, not sure if it already has the mechanism to disband once you fall below. that another aspect of the heritage ledger, once your on you stay or once you go below your out, but the ripple of if someone fell off would it break the sim logic or would they just fall back to a household." **What exists (rb read, `generationalWealthEngine.js:3102-3134`, engine.156/157):** the row is never deleted — a line goes DORMANT (Status dormant, tier blank, DormantSince stamped) on two clocks: no living member for 4 Cycles, or standing under 10 for 52 straight Cycles — and only for a line that was ever Established (`heritageRank_(peakTier) >= 1`); a Founding line never goes dormant for low money. Dormancy is NOT the door: a $50M solo line scores 17 and would have to fall to under 10 (≈ $3M) for a year. The tier itself moves up and down every Cycle with no hysteresis (standing is recomputed from what the family holds now). Ripple = safe by design: `heritageTierByPop_` skips dormant lines (`:2625`), so every reader (phase-4 birth boost, estate rate `:1362`, owner draw `:1138-1142` → paid as off-heritage, the business roll `:3172`, the intake door, maneuver engine) treats a dormant member as no line; the citizen keeps LineageId, their Household_Ledger row and job untouched — they fall back to a household. Revival: the line's own members clear a door again under the same LineageId; tenure resets, PeakTier remembers. **Open for Task 5:** whether "below the door" should be the dormancy bar (today the bar is 10, the door scores 17–30+), and how long below before out (today 52 Cycles).
- Does a divorce or a lawsuit exist as an event in the engine today? — blocks Task 1; es code read before the session.

## Changelog
- 2026-10-21 (research-build) — Task 5 round 3: builder verbatim; Fortune $250M settled; fame = Cultural_Ledger FameScore + floor by clock (GAME $50M / MEDIA $5M); Roots = ENGINE-clock, off the Cultural_Ledger, the life ladder; the clock split (ENGINE all three, MEDIA/GAME no Roots, CIVIC with Approval); enter-never-leave drops the per-Cycle re-read; live: 0 MEDIA on the Cultural_Ledger, GAME bar [25] admits Aitken, Roots $5M = Mims + Necklar; the missing build is the per-citizen rung tally.

- 2026-10-21 (research-build) — Round 2 with the builder: money alone is a door at [$250M] (athlete-proof today; $150M admits seven ballplayers), fame with lower money, roots = home + spouse + money + tier-or-usage; three challenging doors. Test run: every line today is seeded wealth except Villanueva (the one the game made, first out under the re-read); the top ordinary saver needs 525 years to $150M — Fame and Roots are the only doors play can open.
- 2026-10-21 (research-build) — agy §Review HOLD folded: biz counts and homes corrected (Varek rents, Prominent at C113; Keane owns; Dillon rents), Fame door admits Aitken + Miller at $5M, the fame door as written cannot fall (UsageCount never decays) or climb (standing ignores FameScore) — fix shape: FameScore-only door + a FameScore term in standing; six build defects for es listed with file:line.
- 2026-10-21 (research-build) — Task 5 design session with the builder: re-read ruled; the heritage doors read live (nine lines, eight off-line at ≥$150M held out by the home, fame exists twice and every famous cultural citizen is under $1M); combination doors proposed with the numbers bracketed; five builder calls named; agy takes the §Review.
- 2026-10-21 (research-build) — Builder asks whether a line disbands when it falls below the gate; read recorded: dormancy exists (empty 4 / standing <10 for 52, Established+ only), row kept, readers skip dormant lines, citizens fall back to households; the bar vs the door is open for Task 5.
- 2026-10-21 (research-build) — Task 5 re-raised by the builder ($50M too low); engine.308/309 filed under the engine-214 plan cross-link here; 309 ascent waits on this door number.
- 2026-10-16 (engine-sheet) — Created from the money read with the builder; engine.295 re-scoped to this doc; rulings S1–S5 verbatim; Tasks 1–6 for the research-build session.
