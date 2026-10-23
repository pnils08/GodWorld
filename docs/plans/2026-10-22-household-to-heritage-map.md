---
title: The Household Map — how a household forms, holds, and reaches the heritage gates
created: 2026-10-22
updated: 2026-10-22
type: plan
tags: [engine, citizens, household, heritage, economy, draft]
sources:
  - phase05-citizens/householdFormationEngine.js (processHouseholdFormation_ :143; formCriteriaHouseholds_ :344 — the live first roof, SOLO_INCOME_FLOOR :302; formNewHouseholds_ :876 is DISABLED at :199-203; divorce :1023-1119; detectHouseholdStress_ :1607; processMarriages_ :996 / generateBirths_ :985 are called no-op stubs)
  - phase05-citizens/bondEngine.js (weddings :316; courtship housing boost engine.74/153 :716-728; marryCitizens_ :2343-2465; the engine.302 divorce text at :2290-2340 is the comment — the code is in householdFormationEngine)
  - docs/research/2026-10-22-codex-household-map-review.md (codex 2026-10-23, FIX / HOLD — folded here)
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

**Live, C112 (read 2026-10-22):** 1,000 Active citizens · 625 active households · 694 citizens under a roof (546 renting, 148 owning) · by shape: couple/rented 321, couple/owned 112, solo/rented 143, family/rented 34, family/owned 12, single/rented 2, solo/owned 1. The hop counts in §2 are over the 1,000 Active; **the door reads *living* = not deceased (`generationalWealthEngine.js:2740`) — 1,044, the Active plus 44 Retired** — so the §4 door counts are over 1,044.

## 2. How a household forms, holds and breaks — the hops the engine runs

Traced backwards from the ledger, written in the order a citizen lives it. Each hop: the gate (what must be true), what it writes, the live count past it, real or thin.

### Hop 1 — a roof: the first household

- **Fires in:** `formCriteriaHouseholds_` (householdFormationEngine.js:344; engine.64 S322 criteria formation + engine.73 solo establishment), called from `processHouseholdFormation_` (:207). **`formNewHouseholds_` (:876 — the 15% roll, cap 3, no income term) is disabled by its caller (:199-203, engine.57 P2, S318: *"Mike's model: no household has one person; households form ONLY at marriage (or single-parent events)"*) and has no runtime invocation.** rb wrote it up as the live mechanic in the first draft and put it to the builder three times; that was rb's error — the caller was never checked. Withdrawn, corrected here, nothing for the builder to rule.
- **Gate, as it runs:** Active / Retired / Recovering, no HouseholdId; a citizen already listed in an active household's Members is adopted into it first (:373-417). Then **married citizens, adults with unhoused tracked children, and qualifying orphan minors form a couple / family roof** the Cycle the record already says family (computed, never backfilled; no hook — record-keeping, not an event). Otherwise the one non-group door, **solo establishment: age ≥ 18 and Income ≥ $85,000 (`SOLO_INCOME_FLOOR` :302), then a 10% roll × the citizen's `establish` maneuver factor (:435-436; engine.153: income alone, no Tier gate)**; no per-Cycle cap.
- **Writes:** a rented Household_Ledger row (HouseholdIncome = own income, plus the off-camera spouse's estimate when married); the citizen's HouseholdId.
- **Live:** 694 of 1,000 Active under a roof. The 306 without one are mostly design (1:443; an untracked spouse or a childhood home is not a defect) — not a count to close.
- **Real / thin:** real — and it reads income. The first roof is the builder's own model: a household is a family, or an established single; never a random one.

### Hop 2 — a spouse: marriage

- **Fires in:** `bondEngine.js` — *"Weddings live HERE now (Mike: marriage comes from bonds)"* (:316). A romance bond's intensity climbs week by week (the pace constants at :1919); `marryCitizens_` (:2343) is the wedding.
- **The household's lever (engine.74, S328, builder-direct; engine.153):** *"the household ledger is a causal input on family fates — an established home (either partner holds a household, incl. engine.73 solo establishment) makes courtship steps likelier. Boosts the step chance only; the rare big week stays dice."* `courtshipHousingBoost_` reads both partners' households — **owned > rented > none** — times the pair's best Tier (engine.151), the step chance capped at 0.5. A renter marries; a citizen with no roof marries; owning makes it likelier and faster. **This is the lever the builder confirmed correct on 2026-10-22.**
- **Writes:** MaritalStatus = married on both rows; SpouseId (ID + name) on both; the household — if either partner already heads a roof with other members (their kids), the spouse **joins** it (engine.59, the Jessup fix: no child left alone in the family home), otherwise a couple household forms.
- **The formation engine's own `processMarriages_` (:996) is a TODO stub returning [] — called at :217, a reachable no-op, not dead code.** Not a defect in what fires — marriage lives in the bond engine by the builder's ruling — but the household engine does not own this hop.
- **Live:** **500 married** of 1,000; 488 under a roof (129 owning, 359 renting).
- **Defect, door-side:** **SpouseId is set on 38 of the 500 married and blank on 462.** Why most are blank is not traced here and does not need to be: a married citizen whose spouse is off the ledger is design (1:443 — the untracked spouse is the rule, not a gap), and the engine's own comment says the column reached PROD late (:2355). Either way the fact stands and the consequence follows. **MaritalStatus is the ledger's truth** — `checkBirth_` already reads it that way (engine.57 P6: *"the LEDGER is the truth"*). The Task 5 build shape (money-game Settled #10) names `SpouseId` for the Roots door; read that way the door misses 92% of married citizens (all six current Roots entrants have a blank SpouseId). → ruled 2026-10-22: the door reads MaritalStatus (§6, answer 2).

### Hop 3 — a home: owning

- **Fires in:** `trackHomeOwnership_` (generationalWealthEngine.js:2080-2178). Gates: a **rented** active household with positive rent and living members, no member carrying a default mark (engine.276), the hood's wealth floor, **combined NetWorth ≥ 35% of the price**, and **payment + property tax ≤ 30% of HouseholdIncome**; price = the hood's market rent × 12 × 22 (engine.158). The roll is **1% × tier × the maneuver factor × the home-die modifier**, or a large favorable renter die buys outright (:2111-2143). ~60 buys on the C106→C111 arc (money-game baseline). `sellHouseholdHome_` sells; a trade-up re-checks affordability without a roll (:2423-2462); the home die (engine.286, :2204) rolls only for owned households at risk; the forced sale is the large setback.
- **Writes:** HousingType rented → owned, MonthlyRent becomes the payment, HousingCost holds the purchase price (:2133-2178); a 20% closing debit comes off the members' NetWorth proportionally; HomesOwned on the line, if a member is on one (§4, standing).
- **What a sale returns (`homeSaleProceeds_` :2302-2309):** max(0, current market price − 80% of the recorded purchase price), credited to the members' NetWorth — a home sold in a hood whose rents rose returns more than the down share, one whose rents fell returns less. A seeded home with no purchase cost returns 20% of current price. No loan balance, no amortization, no payment ever deducted — the builder's 2026-09-24 "status rung, not a wealth store" holds for the carry; the sale does track the hood's market.
- **Live:** 148 Active citizens own, in 125 households. 129 of the 500 married own.
- **Real / thin:** real, with its losing side (the die, the forced sale) real.

### Hop 4 — kids

- **Fires in:** `checkBirth_` (generationalEventsEngine.js:1076), Phase 4.
- **Gate — the builder's own, verbatim in the code (engine.57 P4):** *"no kid is born unless there is a household."* — the caller treats any non-blank HouseholdId as a roof (:532-552), not a verified active membership. Then: age 26–42 (:81), **MaritalStatus = married** (the ledger, not a text scan), fewer than three `[Birth]` tags on LifeHistory (not NumChildren).
- **Odds:** base 0.3% a Cycle, −0.1% per child already; +0.2% at 28–35, −0.1% past 38; a `family`-type roof ×1.25 (engine.74: *"kids thrive in 2-parent households"*); September ×2 and July–October ×1.3 (September compounds to ×2.6); the Family dial 0.5–1.5 (engine.32); **the line's heritage tier ×1.15 Founding … ×1.6 Dynasty** (engine.65); floor 0.05%. The dice decide.
- **So the household is the gate on kids, exactly as ruled 2026-10-22** — a roof, not a deed. A renting couple has children at the same base odds as an owning one; only the `family` shape and the heritage tier move it.
- **The formation engine's own `generateBirths_` (:985) is a TODO stub — called at :213, returns nothing, a reachable no-op.** Births live in Phase 4.
- **Live:** 57 citizens with children; 48 of them married and under a roof.
- **Real / thin:** real. The odds are small by design (1:443 — two births a Cycle is ~900 citywide).

### Hop 5 — holding it: income, stress, the loss side

- `updateHouseholdIncomes_` (:1228) sums the roof's earners each Cycle. `detectHouseholdStress_` (:1607) → `dissolveStressedHouseholds_` (:1643): a roof that cannot carry its rent *may* dissolve — zero-income roofs are skipped, savings can shield it, and crisis severity gets a 10% roll (:1613-1659); the rent-burden hook (:1734) reaches the newsroom. Fund disbursement (:1472) is the civic hand that reaches a household.
- **Divorce (engine.302 cut 3, builder ruling 10, verbatim in code — implemented in householdFormationEngine.js `processDivorces_` :1066 / `divorceCrisisKinds_` :1041, dials :1023-1025; the bondEngine :2290-2340 text is the comment, not the code):** *"This needs to happen when a set amount of crisis hits but in a major loss situation, multiple issues would need to cause it."* A marriage ends when the couple's record holds **3 distinct crisis kinds inside 13 Cycles, at least one a major loss** (a debt default, a bereavement, being out of work, a forced home sale). **Never on one issue, never by a die.** The record is what the citizen already carries (DialState, LifeHistory) — no new storage.
- **This is the money-game plan's Task 4 (the ordinary household's loss side) and ROLLOUT engine.257, absorbed here.** What exists: money leaves only by event (plan Agreed A1); the roof breaks on stress; the marriage breaks on compounded crisis. What the plan still asks the builder — is the treadmill (median NetWorth +0.02% over five Cycles) the intended feel — now has its numbers in §4.

## 3. Tier — the events a citizen is dealt and the attention they get

The builder's third point, confirmed in code:

- **Tier reaches the draw through the content, not a separate deck.** `generateCitizensEvents.js:2599`: `isNamed = (tier === 1 || tier === 2)` — its only executable uses are admitting Tier 1–2 alongside 3–4 (:2600) and keeping named citizens out of the Generic_Citizens surfacing lottery (:3104-3108). Every eligible adult, any ClockMode, draws from the same atmospheric pool, 1–4 events a Cycle (:722, :3500); the "Tier-3/4 ENGINE only, limit 10" header (:4014) is obsolete. **What tier does:** it rides into every draw's Conditions (:3237, :3301) and onto every event's tags (:3757) with the line's `heritage` tier, `fame` (0 below the 25 bar), occupation, life-state, age, hood, displacement (:3228-3245) — so a content row can be written for a Tier-1 life and never fire for a Tier-4 one. Whether the live Event_Content_Ledger does that was not measured here (codex 2026-10-23). The first draft's "richer named-pool events" was read off an old comment (:2583-2589), not code — corrected.
- **Tier climbs on attention.** engine.150: the Tier ladder is a state — press usage lifts it, an intake row never lowers it (processAdvancementIntake.js:785). At **25 media mentions** the row is stamped `Famous` for life, Tier floors at 1, and the citizen is registered on the Cultural_Ledger (engine.118). That is the usage path to the Fame door.
- **The household feeds attention** (engine.304, live stage 13, first live fire C113): the family lottery draws 1% of citizens with an untracked spouse / child / parent; the wake names the family; a citizen's own words are usage. A roof with people in it is more to write about.
- **Live:** Tier 1: 21 · Tier 2: 55 · Tier 3: 171 · Tier 4: 753. **Famous: 5** (Keane, Aitken, Dillon, Kelley, Paulson — all stamped C106; all UNI). No MED, CIV or unflagged citizen is Famous. Flags: UNI 59 · MED 47 · CIV 53 · unflagged 841.

## 4. The heritage gates — how a household helps the odds at each

**The Roots door, operative (ruled 2026-10-22):** unflagged (UNI / MED / CIV all no or blank) · not Famous · not on the Cultural_Ledger · MaritalStatus = married · listed in an active Household_Ledger row, owned or rented · own NetWorth ≥ $25M. Living = not deceased. Today: six (table below). Everything else in this section is the reading that got there.

The doors as the live engine runs them today, and as the builder ruled them in Task 5 (not yet built). For each: what a household moves.

**Live today** (generationalWealthEngine.js:2545-2555, :2918-2965): Door A — 3 living members + $1M combined. Door B — $350M, one citizen. Door C — *"the household door"*: an **owned, active household with no member on a line**, every living member joins, at **$50M** alone or combined, *"no Tier gate"* (builder 2026-09-03). **Nine lines, 17 living members** (UNI 6, unflagged 10, MED 1).

**Ruled, Task 5 (2026-10-21/22), not built:** Fortune $1B alone · Fame = `Famous` + a floor by flag (UNI $250M / MED $35M / CIV $35M + Approval / unflagged $25M) · Roots = unflagged, not Famous, not on the Cultural_Ledger, married (MaritalStatus), any active household row, NetWorth ≥ **$25M** (ruled 2026-10-22; the first draft bracketed [$10M] and an owned home).

| Gate | What the door reads | What a household moves | Live — who is close |
|---|---|---|---|
| **Fortune** ($1B ruled; B $350M live) | one citizen's NetWorth, or the **line's** TotalNetWorth = its living members | A spouse's money joins the line's total **only if they took the surname** (`updateHeritage_:2751-2779`, plan line 76); kids inherit the line. The roof adds nothing — a household's NetWorth is not a line's. | Varek alone. Nobody off a line within reach. |
| **Fame** (Famous + floor) | the `Famous` stamp (25 mentions) + the citizen's own NetWorth by flag | Through attention (§3): a family named in wakes is usage; Tier 1–2 draw the named pool. Through money: a working spouse raises HouseholdIncome, not the citizen's NetWorth — the floor is per citizen. | 5 Famous, all UNI; 3 clear $250M (Keane, Dillon, Kelley). Within 7 mentions: P Slayer (MED u18), Raines (MED u20), Miller (unflagged u23). |
| **Roots** (the household door) | **the household is the door:** unflagged, not Famous, no line, married, any active household row, own NetWorth ≥ $25M (ruled 2026-10-22) | Every hop above is this door's input — the roof (1), the spouse (2), the home (3), the kids (4) — all live, all firing. | **The counts below. The money floor is the wall, not the family.** |
| **Standing, once on** (HeritageScore → Founding 0 / Established 30 / Prominent 50 / Dynasty 70) | 10×log10(NetWorth/$1M) + generations + civic members + fame members + 4×businesses + 2×homes − 5×scandal, recomputed each Cycle (engine.156) | Directly: HomesOwned (every purchase after founding, decrement on sale — a home bought **before** the line existed counts only for a Door C founder, `foundLine_:2834`), Generations and LivingMembers (the kids), FameMembers, BusinessesOwned (engine.306 owner door; engine.308 cap 2 per citizen, line cap, 12-Cycle cooldown). **And the tier pays back into the household:** birth odds ×1.15–1.6 by tier (hop 4); Established opens the business roll. | 9 lines; Corliss 10 Founding; Varek 48 → Prominent at C113 (plan). |

### The Roots counts — the question in one table

Living citizens (1,044 — Active + Retired, as the door reads them), not Famous, not on a line, not on the Cultural_Ledger (checked: none of the ≥ $1M names below are), married by MaritalStatus, C112 live:

| Floor | **owned** household, unflagged (round 10 wording) | owned, unflagged **+ CIV** (Settled #3) | **any** roof, unflagged (2026-10-22 wording) | any roof **+ CIV** |
|---|---|---|---|---|
| no floor | **109** (111 before the Cultural_Ledger exclusion) | 119 † | **405** (410 before) | 444 † |
| ≥ $1M | 33 | 38 | 103 | 113 |
| ≥ $5M | **2** — Mims $12.8M, Necklar $6.4M | 2 | 9 | 11 |
| ≥ $10M — the earlier bracket | **1** — Gregory Mims (POP-00023) | 1 | **8** | 9 |
| ≥ $25M — **the ruled floor (builder 2026-10-22)** | **0** | 0 | **6** — Achebe, Salcedo, Zavala, Voss-Adeyemi, Lindqvist, Castellanos: all renting mint principals (codex 2026-10-23 re-derived: exactly these six, none missed) | 6 |

† CIV columns not re-run after the Cultural_Ledger exclusion; CIV does not walk Roots (ruled), history only. The five the exclusion removes at no floor: Morello POP-00536, Tao POP-00537, Obi POP-00543, Ellison POP-00546, Valez POP-00632 — on the Cultural_Ledger, out by the door's own term.

**Who the 8 are at $10M under any roof:** Mims — and **seven of the eight mint principals** (POP-01092–01099: Achebe $168.6M, Salcedo $132.6M, Zavala $87.7M, Voss-Adeyemi $71.9M, Lindqvist $37.8M, Castellanos $25.9M, Price $16.3M — all unflagged, all married, **all renting**; Raman $54.1M is single with no roof). They are the money-game plan's "eight principals … NetWorth seeded at mint, all seven households rent" and its "eight off-line citizens ≥ $150M held out by Door C's home, not its money." **So the door's household term (§6 call 1) is not one family vs eight — it is whether seeded mint money walks Roots. Ruled: it does (§6, answer 1).** Owned keeps it out; any roof lets it in. With CIV counted (Settled #3), the +1 at $10M is **Warren Ashford** ($12.0M, Tier 1, renting); Mayor Santana ($6.5M) clears $5M — §6 call 6. **Ruled 2026-10-22: CIV does not walk Roots (§6, answer 6) — the CIV columns are history only.**

**Johhny Necklar** (POP-00509): Retired, ENGINE, **unflagged** (UNI = no), Tier 2, $6.37M, married, owns his home, no line — Roots-eligible as round 4 said; he drops out only at the $10M floor. The door reads him (Retired is living).

**Reconciled with the money-game plan's round 3** ("152 in an owned household, 10 married with no line; at $5M Mims + Necklar; at $10M Mims"): the $5M and $10M names agree exactly. The "10 married" was read by SpouseId (set on 38 of 500 married); by MaritalStatus the same set is 111. Round 3's 152 owned was over Active; this table is over living. Nothing in the plan's door design changes; its count line is corrected in its changelog.

**Read:** the household path is well-walked — 109 owning married families, 405 under any roof. The money floor removes all but one or two of them, and the ones "any roof" lets back in are seeded fortunes, not families that climbed. Little in hops 1–5 moves a citizen's NetWorth toward the floor: rent is paid; a home returns the market price less 80% of what was paid (hop 3) — a real but small equity move, never a fortune; a spouse's pay is the household's, not the citizen's; kids cost nothing and earn nothing. The plan's own number stands — the top ordinary saver needs 525 years to $150M. **A household opens every life door and none of the money doors.** Whether that is the game (Roots is meant to be rare) or the gap (a household should *earn*) is the builder's call — Task 4's question, now with its numbers (§6 call 4). **Ruled 2026-10-22 (§6, answer 1): the floor is $25M and the door reads any household row — so today's Roots entrants are those six mint principals, by the builder's deliberate call with these numbers in front of him; Mims drops out at $25M.**

## 5. Real vs. thin — the honest list

"Thin" means a mechanic that cannot fire or reads the wrong thing. Sparse data is design (1:443), not thinness.

| # | Finding | Where | Kind |
|---|---|---|---|
| 1 | ~~The first roof has no income gate (a 15% roll)~~ — **withdrawn 2026-10-23, rb's error:** that function is disabled by its caller (:199-203, engine.57 P2); the live first roof forms at marriage / family, or as an established single at Income ≥ $85k + a 10% roll (:302-303, :435-436) | householdFormationEngine.js:199-203, :302-303, :435 | real, as the builder's model says — no finding |
| 2 | **SpouseId blank on 462 of 500 Active married** (480 of 520 living) — most will be off-ledger spouses (design, 1:443); the cause is not traced and does not change the consequence. The ledger's truth is MaritalStatus; the first Task 5 build shape named SpouseId — **ruled MaritalStatus 2026-10-22** | bondEngine.js:2348-2355; money-game Settled #6/#10 | closed — the door reads MaritalStatus, as checkBirth_ does |
| 3 | `processMarriages_` and `generateBirths_` in the formation engine are TODO stubs, called (:213, :217) and returning [] | householdFormationEngine.js:985-1003, :213-218 | reachable no-ops, not a gap — the hops fire in bondEngine / Phase 4 |
| 4 | HomesOwned on a line counts purchases **after** founding plus a Door C founding home; a Door A/B founder's earlier home never reaches standing (Keane owns; the row says 0) | generationalWealthEngine.js:2834; agy 2026-10-21 | thin on the standing term; the Task 5 build shape already moves the seed to `ownedHomePops` |
| 5 | Ownership is a lever (owned > rented > none on courtship odds), never a gate — **builder 2026-10-22: correct as built** | bondEngine.js:716-728 | real, as intended |
| 6 | The household is the gate on kids (*"no kid is born unless there is a household"*) — a roof, not a deed | generationalEventsEngine.js:1077-1082 | real, matches the 2026-10-22 ruling |
| 7 | The loss side is real: stress dissolves a roof; divorce on 3 crisis kinds / 13 Cycles / 1 major; the home die; money leaves by event only | householdFormationEngine.js:1023-1119 (divorce), :1607-1710 (stress) | real — Task 4 / engine.257 absorbed here |
| 8 | Nothing on the path moves NetWorth toward a floor | §4 counts | the open question — not a defect to fix without the builder |

## 6. Open — the builder's calls, in his words

1. **The Roots door's household term.** Round 10 (2026-10-22): *"the owned household with a spouse, at the money floor."* The same day, on the path: *"whether you need to own a home I guess isn't necessarily a requirement as I was meaning more that you need a line on household ledger."* Both are the builder's; they read the door two ways. **Owned** at $10M = Mims alone. **Any roof** at $10M = Mims + seven renting mint principals whose fortunes were seeded, not climbed (§4). Which does the door read — and is seeded mint money meant to walk Roots?
2. **The Roots door reads MaritalStatus, not SpouseId** (finding 2) — confirm, so es builds it that way.
3. ~~Does the first roof read Income, or is the 15% roll the feel?~~ **Withdrawn 2026-10-23 — rb's error.** The 15% roll is disabled code (engine.57 P2); the live first roof already reads Income ≥ $85k (§2 hop 1). No call.
4. **Task 4, with its numbers:** a household opens every life door and none of the money doors. Is Roots meant to be that rare, or should a household *earn* — and if so, as events (the plan's own shape: a rent year that outran the raise; a spouse's promotion that lands on NetWorth), never a weekly debit?
5. *"Using some rungs isn't a terrible idea if we need other elements"* — which, if any, beyond the roof / spouse / home / kids already on the path, and for which gate? (Not a tally at the door — round 9 stands.)
6. **Does CIV walk Roots?** The money-game plan says both. Settled #3, from round 3 verbatim (*"CIVIC + Approval"*): *"CIV: Fame at $35M (+Approval where the citizen holds office) and Roots."* Settled #6, rb's consolidation: *"Roots = unflagged."* Live case: Warren Ashford — CIV, $12.0M, Tier 1, married, renting — in under any-roof Roots if CIV walks it, out if not; Mayor Santana ($6.5M) behind him. Which line stands?

### Answered 2026-10-22 (builder, verbatim) — and what stays open

- **Call 2 — MaritalStatus, not SpouseId: approved.** *"If that's what the review turned up then I approved."* Closed; es builds the door on MaritalStatus.
- **Call 4 — the money side: difficult, not rare; the earning paths are builds to come.** *"It's meant to be difficult not rare, but this is the heritage ledger so it's not supposed to be many achieving this in one life time. It'd be rare to make it quick and it allows a bloodline to potentially make it over time and rn there aren't many paths to acquire this amount of money so that's the accessories builds to apply the methods and placing the decision on the cron on paths, payouts for things."* Read: the treadmill is not the final feel — the ways a household *earns* are accessory builds still to design, shaped as the citizen's own decision on the cron (the wake chooses a path) with payouts for what they do; not a weekly debit, not a roll. Task 4 closes into that; the builds get rows when designed (engine.311's "the citizen's wake decides instead of a roll" is the same shape).
- **Call 5 — rungs: none.** *"I don't remember any of them you built that without me. I just offer it if needed but things don't need to be overly complicated."* The money-game Settled #6 rung list was rb's reading of the engine's mechanics, never a builder ruling; no rung is added — the path is the roof, the spouse, the home, the kids as the engine runs them. Closed; the plan's Settled #6 carries the correction.
- **Call 6 — CIV (and MED) do not walk Roots.** *"civ and media need 35m so a household is a better chance to arrive at that, fame allows is required. So they can't make it with root but having that helps their chances to have more money and more family means more ways to get attention and media usage."* Settled #6 stands; Settled #3's "and Roots" for CIV is struck. The household's value to a CIV/MED citizen is the lever, not the door: more money under the roof, more family, more ways to be written about → usage → Famous. Closed; the §4 CIV columns are history only.
- **Call 1 — still open, and the floor moved under it.** The builder, recalling the amounts: *"I think root is 25m now I think, 35 for civic media flags + fame and 250m plus fame for athletes, 1b fortune entrance?"* The record (Settled #3, round 5): UNI Fame $250M; MED/CIV Fame $35M; **unflagged Fame $25M; Roots [$10M]**. Two readings: Roots stays [$10M] and the $25M is the unflagged *fame* floor — or Roots moves to $25M. **Live at $25M (owned, unflagged, married, no line, not Famous): nobody. Any roof at $25M: six, all renting mint principals (Achebe, Salcedo, Zavala, Voss-Adeyemi, Lindqvist, Castellanos).** At [$10M]: owned = Mims alone; any roof = Mims + seven. Either way the household term decides one thing — whether seeded mint money walks Roots. **Ruled 2026-10-22 (builder, on the two forks with the live numbers shown): Roots at $25M; the door reads any household row.** Seeded mint money walks Roots — deliberate. Closed. The Roots door is now fully ruled: unflagged, not Famous, not on the Cultural_Ledger, any active household row, married by MaritalStatus, NetWorth ≥ $25M.
- **Call 3 — withdrawn 2026-10-23: rb's error, caught by codex.** The builder asked three times what the 15% was (*"What's a 15% coin flip? Never heard of that"*, *"Idk what this is"*) and rb answered three times as if it were live. It is not: `formNewHouseholds_` is disabled by its caller (engine.57 P2, S318 — the builder's own model, no one-person households by dice), and the live first roof reads Income ≥ $85k (§2 hop 1). The builder had never heard of it because it does not run. Nothing to rule.

## Changelog

- 2026-10-22 (research-build) — Map written: the household as the engine runs it, Tier → events and attention, the four gates and what a household moves at each, Roots counts, eight findings, builder calls; supersedes the September needs-a-house rule.
- 2026-10-22 (research-build) — advisor pass folded: base = living (1,044), CIV columns, $5M/$10M names, Cultural_Ledger none, Necklar eligible, round 3 reconciled (SpouseId → MaritalStatus), call 6 added (CIV on Roots); six calls open.
- 2026-10-22 (research-build) — builder answered: 2 approved (MaritalStatus); 4 difficult not rare, earning paths = accessory builds, cron decides + payouts; 5 no rungs (the list was rb's); 6 CIV/MED do not walk Roots. Open: 1 (Roots $10M or $25M; owned or any roof), 3 (the 15% roll).
- 2026-10-22 (research-build) — builder ruled call 1: Roots $25M, any household row (the six renting mint principals walk in — deliberate); call 3 explained again, left simple as a known thin spot. Door fully ruled.
- 2026-10-23 (research-build) — codex HOLD folded: the 15% roof roll is disabled code, the live roof reads Income ≥ $85k (rb's error, withdrawn); home gates + sale proceeds corrected; named-draw claim corrected; no-floor counts 405/109; operative Roots summary; stale open wording closed.
