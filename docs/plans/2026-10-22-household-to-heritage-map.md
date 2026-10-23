---
title: The Household Map — how a household forms, holds, and reaches the heritage gates
created: 2026-10-22
updated: 2026-10-22
type: plan
tags: [engine, citizens, household, heritage, economy, draft]
sources:
  - phase05-citizens/householdFormationEngine.js (processHouseholdFormation_ :143, formCriteriaHouseholds_ :344, formNewHouseholds_ :876, processDivorces_ :1066, detectHouseholdStress_ :1607; processMarriages_ :996 and generateBirths_ :985 are TODO stubs)
  - phase05-citizens/bondEngine.js (weddings :316; courtship housing boost engine.74/153 :716-728; marryCitizens_ :2343; divorce engine.302 cut 3 :2290-2340)
  - phase04-events/generationalEventsEngine.js (checkBirth_ :1076)
  - phase05-citizens/generationalWealthEngine.js (door constants :2545-2555; Door C :2918-2965; HERITAGE_BIRTH_MULT :2590; HomesOwned accrual :1758 / :2194 / :2834 / :3107)
  - phase05-citizens/generateCitizensEvents.js (isNamed tier draw :2599; draw context :3228-3245; tier tag :3757)
  - live Simulation_Ledger + Household_Ledger + Heritage_Ledger, read 2026-10-22 (C112 live) through lib/sheets.getSheetAsObjects
  - docs/plans/2026-10-16-the-money-game.md §baseline, line 76 (household ≠ line), line 241 (the mechanics), §Task 5 (the doors)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.295 (this map is the money-game plan's deferred 'beginning part', Settled #7); engine.257 absorbed here as §2 hop 5 / §6 call 4"
  - "[[2026-10-16-the-money-game]] — the doors this map climbs to"
---

# The Household Map

**Builder's words (2026-10-22):** "we will give this a map, and I agree to trace backwards and see how household behaves and how it can ascend to heritage. Root path is here but all citizens types can have a household so we will look at the various heritage gates and how a household helps to improve odds." · "my chain was just a loose example and the way the code is correct so my apology for setting that as the path. So whether you need to own a home I guess isn't necessarily a requirement as I was meaning more that you need a line on household ledger, and using some rungs isn't a terrible idea if we need other elements, tiers matter to the events they get and attention the received"

**Goal:** the household written down as the engine runs it — what a household is, how one forms, holds and breaks, and at each heritage gate how holding one changes a citizen's odds — with the live count at every hop, so the builder sees where the path is real, where it is thin, and where the gate actually sits. **A read, not a build:** no build order, no new mechanic. Where a mechanic is missing, the number shows it and the call is the builder's.

**What this supersedes:** the September rule "a citizen needs a house to have a wife and children" (memory `project_ownership-vs-rental-are-separate-progression-vehicles`, now amended) — ruled a loose example 2026-10-22. The requirement is a Household_Ledger row; ownership is a lever on the odds, as the engine already runs it.

## 1. What a household is

Two things on two sheets — the money-game plan's line 76 rule, confirmed in code:

| | Where | What it holds |
|---|---|---|
| **The household** — the roof | `Household_Ledger`, one row per roof | HouseholdId, HeadOfHousehold, HouseholdType (solo / single / couple / family), Members (POPIDs), Neighborhood, HousingType (rented / owned), MonthlyRent, HousingCost, HouseholdIncome, FormedCycle, DissolvedCycle, Status |
| **The family** — the blood | the citizen's own `Simulation_Ledger` row | MaritalStatus, SpouseId, ChildrenIds, ParentIds, NumChildren, HouseholdId (points at the roof), LineageId (the surname line, once on the Heritage_Ledger) |

A household carries no bloodline; a line carries no address. The Corliss four live at three addresses (plan line 76). Every citizen type can hold a household — the formation pass reads Active, Retired and Recovering (builder S322); only Traded never forms.

**Live, C112 (read 2026-10-22):** 1,000 Active citizens · 625 active households · 694 citizens under a roof (546 renting, 148 owning) · by shape: couple/rented 321, couple/owned 112, solo/rented 143, family/rented 34, family/owned 12, single/rented 2, solo/owned 1.

## 2. How a household forms, holds and breaks — the hops the engine runs

Traced backwards from the ledger, written in the order a citizen lives it. Each hop: the gate (what must be true), what it writes, the live count past it, real or thin.

### Hop 1 — a roof: the first household

- **Fires in:** `formNewHouseholds_` (householdFormationEngine.js:876) and `formCriteriaHouseholds_` (:344, engine.73 solo establishment).
- **Gate:** age 22–28, no HouseholdId, MaritalStatus single — then **a 15% roll per Cycle**, at most 3 new households a Cycle. Forms a `single` **rented** household; rent estimated from the hood.
- **No money gate.** The code's own comment (:893): *"Check if they have minimum income (would need income column) — For now, random chance."* Income is on the ledger; the term was never wired.
- **Writes:** the Household_Ledger row; the citizen's HouseholdId.
- **Live:** 694 of 1,000 under a roof. The 306 without one are mostly design (the ledger samples 1:443; an untracked spouse or a childhood home is not a defect) — not a count to close.
- **Real / thin:** real, it fires. Thin: no income term — a $0 single and a $2M single form a roof at the same odds. → §6 call 3.

### Hop 2 — a spouse: marriage

- **Fires in:** `bondEngine.js` — *"Weddings live HERE now (Mike: marriage comes from bonds)"* (:316). A romance bond's intensity climbs week by week (the pace constants at :1919); `marryCitizens_` (:2343) is the wedding.
- **The household's lever (engine.74, S328, builder-direct; engine.153):** *"the household ledger is a causal input on family fates — an established home (either partner holds a household, incl. engine.73 solo establishment) makes courtship steps likelier. Boosts the step chance only; the rare big week stays dice."* `courtshipHousingBoost_` reads both partners' households — **owned > rented > none** — times the pair's best Tier (engine.151), the step chance capped at 0.5. A renter marries; a citizen with no roof marries; owning makes it likelier and faster. **This is the lever the builder confirmed correct on 2026-10-22.**
- **Writes:** MaritalStatus = married on both rows; SpouseId (ID + name) on both; the household — if either partner already heads a roof with other members (their kids), the spouse **joins** it (engine.59, the Jessup fix: no child left alone in the family home), otherwise a couple household forms.
- **The formation engine's own `processMarriages_` (:996) is a TODO stub returning [].** Not a defect in what fires — marriage lives in the bond engine by the builder's ruling — but the household engine does not own this hop.
- **Live:** **500 married** of 1,000; 488 under a roof (129 owning, 359 renting).
- **Defect, door-side:** **SpouseId is set on 38 of the 500 married and blank on 462.** The column landed late (*"column exists on sandbox; prod no-ops until rollout rename"*, :2355) and only weddings since fill it. **MaritalStatus is the ledger's truth** — `checkBirth_` already reads it that way (engine.57 P6: *"the LEDGER is the truth"*). The Task 5 build shape (money-game Settled #10) names `SpouseId` for the Roots door; read that way the door misses 92% of married citizens. → §6 call 2.

### Hop 3 — a home: owning

- **Fires in:** `trackHomeOwnership_` → `homeBuyChance_` (generationalWealthEngine.js; the money-game baseline): 20% down out of the household's NetWorth, ~60 buys on the C106→C111 arc. `sellHouseholdHome_` sells; a trade-up sells here and buys there (:2423); the home die (engine.286, :2204) rolls only for owned households at risk; the forced sale is the large setback.
- **Gate:** a household row (the buy is the household's), the down payment, the roll.
- **Writes:** HousingType rented → owned, MonthlyRent becomes the payment (:1755); HomesOwned on the line, if the citizen is on one (§4, standing).
- **A home is a status rung, not a wealth store** (builder 2026-09-24): no stored value, no loan, no payment ever deducted; a sale returns the sim's own down share, never a windfall.
- **Live:** 148 citizens own, in 125 households. 129 of the 500 married own.
- **Real / thin:** real, with its losing side (the die, the forced sale) real.

### Hop 4 — kids

- **Fires in:** `checkBirth_` (generationalEventsEngine.js:1076), Phase 4.
- **Gate — the builder's own, verbatim in the code (engine.57 P4):** *"no kid is born unless there is a household."* Then: the age window, **MaritalStatus = married** (the ledger, not a text scan), fewer than 3 children.
- **Odds:** base 0.3% a Cycle, −0.1% per child already; +0.2% at 28–35, −0.1% past 38; a `family`-type roof ×1.25 (engine.74: *"kids thrive in 2-parent households"*); September ×2, July–October ×1.3; the Family dial 0.5–1.5 (engine.32); **the line's heritage tier ×1.15 Founding … ×1.6 Dynasty** (engine.65); floor 0.05%. The dice decide.
- **So the household is the gate on kids, exactly as ruled 2026-10-22** — a roof, not a deed. A renting couple has children at the same base odds as an owning one; only the `family` shape and the heritage tier move it.
- **The formation engine's own `generateBirths_` (:985) is a TODO stub.** Births live in Phase 4.
- **Live:** 57 citizens with children; 48 of them married and under a roof.
- **Real / thin:** real. The odds are small by design (1:443 — two births a Cycle is ~900 citywide).

### Hop 5 — holding it: income, stress, the loss side

- `updateHouseholdIncomes_` (:1228) sums the roof's earners each Cycle. `detectHouseholdStress_` (:1607) → `dissolveStressedHouseholds_` (:1643): a roof that cannot carry its rent dissolves; the rent-burden hook (:1734) reaches the newsroom. Fund disbursement (:1472) is the civic hand that reaches a household.
- **Divorce (engine.302 cut 3, builder ruling 10, verbatim in code):** *"This needs to happen when a set amount of crisis hits but in a major loss situation, multiple issues would need to cause it."* A marriage ends when the couple's record holds **3 distinct crisis kinds inside 13 Cycles, at least one a major loss** (a debt default, a bereavement, being out of work, a forced home sale). **Never on one issue, never by a die.** The record is what the citizen already carries (DialState, LifeHistory) — no new storage.
- **This is the money-game plan's Task 4 (the ordinary household's loss side) and ROLLOUT engine.257, absorbed here.** What exists: money leaves only by event (plan Agreed A1); the roof breaks on stress; the marriage breaks on compounded crisis. What the plan still asks the builder — is the treadmill (median NetWorth +0.02% over five Cycles) the intended feel — now has its numbers in §4.

## 3. Tier — the events a citizen is dealt and the attention they get

The builder's third point, confirmed in code:

- **Tier splits the draw.** `generateCitizensEvents.js:2599`: `isNamed = (tier === 1 || tier === 2)`. Tier 3–4 draw the daily-life texture pool; named citizens get *"ambient texture on top of their sim life"* plus the richer named-pool events. The draw context carries `tier`, the line's `heritage` tier, `fame` (0 below the 25 bar), occupation, life-state, age, hood, displacement (:3228-3245); every event is tagged `tier:N` (:3757). **Who you are shapes what the engine deals you.**
- **Tier climbs on attention.** engine.150: the Tier ladder is a state — press usage lifts it, an intake row never lowers it (processAdvancementIntake.js:785). At **25 media mentions** the row is stamped `Famous` for life, Tier floors at 1, and the citizen is registered on the Cultural_Ledger (engine.118). That is the usage path to the Fame door.
- **The household feeds attention** (engine.304, live stage 13, first live fire C113): the family lottery draws 1% of citizens with an untracked spouse / child / parent; the wake names the family; a citizen's own words are usage. A roof with people in it is more to write about.
- **Live:** Tier 1: 21 · Tier 2: 55 · Tier 3: 171 · Tier 4: 753. **Famous: 5** (Keane, Aitken, Dillon, Kelley, Paulson — all stamped C106; all UNI). No MED, CIV or unflagged citizen is Famous. Flags: UNI 59 · MED 47 · CIV 53 · unflagged 841.

## 4. The heritage gates — how a household helps the odds at each

The doors as the live engine runs them today, and as the builder ruled them in Task 5 (not yet built). For each: what a household moves.

**Live today** (generationalWealthEngine.js:2545-2555, :2918-2965): Door A — 3 living members + $1M combined. Door B — $350M, one citizen. Door C — *"the household door"*: an **owned, active household with no member on a line**, every living member joins, at **$50M** alone or combined, *"no Tier gate"* (builder 2026-09-03). **Nine lines, 17 living members** (UNI 6, unflagged 10, MED 1).

**Ruled, Task 5 (2026-10-21/22), not built:** Fortune $1B alone · Fame = `Famous` + a floor by flag (UNI $250M / MED $35M / CIV $35M + Approval / unflagged $25M) · Roots = unflagged, not Famous, not on the Cultural_Ledger, the household at **[$10M]**.

| Gate | What the door reads | What a household moves | Live — who is close |
|---|---|---|---|
| **Fortune** ($1B ruled; B $350M live) | one citizen's NetWorth, or the **line's** TotalNetWorth = its living members | A spouse's money joins the line's total **only if they took the surname** (`updateHeritage_:2751-2779`, plan line 76); kids inherit the line. The roof adds nothing — a household's NetWorth is not a line's. | Varek alone. Nobody off a line within reach. |
| **Fame** (Famous + floor) | the `Famous` stamp (25 mentions) + the citizen's own NetWorth by flag | Through attention (§3): a family named in wakes is usage; Tier 1–2 draw the named pool. Through money: a working spouse raises HouseholdIncome, not the citizen's NetWorth — the floor is per citizen. | 5 Famous, all UNI; 3 clear $250M (Keane, Dillon, Kelley). Within 7 mentions: P Slayer (MED u18), Raines (MED u20), Miller (unflagged u23). |
| **Roots** (the household door) | **the household is the door:** unflagged, not Famous, no line, married, [owned — §6 call 1] at the floor | Every hop above is this door's input — the roof (1), the spouse (2), the home (3), the kids (4) — all live, all firing. | **The counts below. The money floor is the wall, not the family.** |
| **Standing, once on** (HeritageScore → Founding 0 / Established 30 / Prominent 50 / Dynasty 70) | 10×log10(NetWorth/$1M) + generations + civic members + fame members + 4×businesses + 2×homes − 5×scandal, recomputed each Cycle (engine.156) | Directly: HomesOwned (every purchase after founding, decrement on sale — a home bought **before** the line existed counts only for a Door C founder, `foundLine_:2834`), Generations and LivingMembers (the kids), FameMembers, BusinessesOwned (engine.306 owner door; engine.308 cap 2 per citizen, line cap, 12-Cycle cooldown). **And the tier pays back into the household:** birth odds ×1.15–1.6 by tier (hop 4); Established opens the business roll. | 9 lines; Corliss 10 Founding; Varek 48 → Prominent at C113 (plan). |

### The Roots counts — the question in one table

Living citizens, unflagged, not Famous, not on a line, married (by MaritalStatus), C112 live:

| Floor | …in an **owned** household (round 10 wording) | …under **any** roof (2026-10-22 wording) |
|---|---|---|
| no floor | **107** | **395** |
| ≥ $1M | 30 | 90 |
| ≥ $5M | 1 | 8 |
| ≥ $10M — the ruled bracket | **1** | **8** |

**Read:** the household path is well-walked — 107 owning married families, 395 under any roof. The money floor removes 99 of every 100. Nothing in hops 1–5 moves a citizen's NetWorth toward it: rent is paid, a home returns only its down share, a spouse's pay is the household's not the citizen's, kids cost nothing and earn nothing. The plan's own number stands — the top ordinary saver needs 525 years to $150M. **A household opens every life door and none of the money doors.** Whether that is the game (Roots is meant to be rare) or the gap (a household should *earn*) is the builder's call — Task 4's question, now with its numbers (§6 call 4).

## 5. Real vs. thin — the honest list

"Thin" means a mechanic that cannot fire or reads the wrong thing. Sparse data is design (1:443), not thinness.

| # | Finding | Where | Kind |
|---|---|---|---|
| 1 | The first roof has **no income gate** — a 15% roll for any single aged 22–28 | householdFormationEngine.js:889-896 | thin: the comment says the term was never wired |
| 2 | **SpouseId blank on 462 of 500 married.** The ledger's truth is MaritalStatus; the Task 5 Roots build shape names SpouseId | bondEngine.js:2355; money-game Settled #10 | defect in the door spec, not the engine — read MaritalStatus, as checkBirth_ does |
| 3 | `processMarriages_` and `generateBirths_` in the formation engine are TODO stubs | householdFormationEngine.js:985-1027 | dead code, not a gap — the hops fire in bondEngine / Phase 4; es may delete the stubs |
| 4 | HomesOwned on a line counts purchases **after** founding plus a Door C founding home; a Door A/B founder's earlier home never reaches standing (Keane owns; the row says 0) | generationalWealthEngine.js:2834; agy 2026-10-21 | thin on the standing term; the Task 5 build shape already moves the seed to `ownedHomePops` |
| 5 | Ownership is a lever (owned > rented > none on courtship odds), never a gate — **builder 2026-10-22: correct as built** | bondEngine.js:716-728 | real, as intended |
| 6 | The household is the gate on kids (*"no kid is born unless there is a household"*) — a roof, not a deed | generationalEventsEngine.js:1077-1082 | real, matches the 2026-10-22 ruling |
| 7 | The loss side is real: stress dissolves a roof; divorce on 3 crisis kinds / 13 Cycles / 1 major; the home die; money leaves by event only | householdFormationEngine.js:1607-1710; bondEngine.js engine.302 cut 3 | real — Task 4 / engine.257 absorbed here |
| 8 | Nothing on the path moves NetWorth toward a floor | §4 counts | the open question — not a defect to fix without the builder |

## 6. Open — the builder's calls, in his words

1. **The Roots door's household term.** Round 10 (2026-10-22): *"the owned household with a spouse, at the money floor."* The same day, on the path: *"whether you need to own a home I guess isn't necessarily a requirement as I was meaning more that you need a line on household ledger."* Both are the builder's; they read the door two ways — owned (1 at $10M) or any roof (8 at $10M). Which does the door read?
2. **The Roots door reads MaritalStatus, not SpouseId** (finding 2) — confirm, so es builds it that way.
3. **Does the first roof read Income** (finding 1), or is the 15% roll the feel?
4. **Task 4, with its numbers:** a household opens every life door and none of the money doors. Is Roots meant to be that rare, or should a household *earn* — and if so, as events (the plan's own shape: a rent year that outran the raise; a spouse's promotion that lands on NetWorth), never a weekly debit?
5. *"Using some rungs isn't a terrible idea if we need other elements"* — which, if any, beyond the roof / spouse / home / kids already on the path, and for which gate? (Not a tally at the door — round 9 stands.)

## Changelog

- 2026-10-22 (research-build) — Map written with the builder: the household as the engine runs it (roof vs. blood; five hops; the loss side), Tier → events and attention, the four gates and what a household moves at each, the Roots counts at every floor (owned 107 / 30 / 1 / 1; any roof 395 / 90 / 8 / 8), eight real-vs-thin findings, five calls for the builder. Supersedes the September "needs a house for a wife and kids" rule → a Household_Ledger row, ownership a lever (builder 2026-10-22). Absorbs money-game Task 4 + ROLLOUT engine.257.
