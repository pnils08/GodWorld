---
title: Household map code and count review
created: 2026-10-23
updated: 2026-10-23
type: reference
tags: [engine, citizens]
sources:
  - docs/for-claude-review/2026-10-22-household-map-review-TASK.md
  - docs/plans/2026-10-22-household-to-heritage-map.md
  - docs/plans/2026-10-16-the-money-game.md
  - Live Simulation_Ledger, Household_Ledger, Cultural_Ledger, Heritage_Ledger reads via lib/sheets.getSheetAsObjects
pointers:
  - "[[plans/2026-10-22-household-to-heritage-map]]"
  - "[[plans/2026-10-16-the-money-game]]"
---

# Household map review — FIX; acceptance HOLD

Reviewed checkout `6119b662b2b9910b8faac9bf0675e3e5fc55c554`; reviewed source and both plans were clean despite extensive unrelated workspace dirt. Scope: the six TASK hunts; builder rulings accepted as given. Only this requested artifact was written. Source inspection plus live reads; no tests, engine execution, bench, cron, deployment, or external writes. Source behavior below is not verification of the deployed bundle.

Live receipt: 2026-10-23 05:00:48 UTC, exclusion follow-up 05:01:50 UTC. Read 1,044 Simulation rows, 875 Household rows (625 active), 50 Cultural rows, nine Heritage rows. Required headers checked; active Members parsed as POPID arrays, with no malformed arrays or duplicate active memberships; eligible NetWorth values finite. `lib/sheets.js:49-60` uses `values.get`; `lib/sheets.js:66-80` maps headers to objects. Reads are separate tab snapshots, not an atomic cross-tab transaction. Initial sandbox DNS failure was resolved through the authorized network read.

## Hunt 1 — five hops: FIX

**Hop 1 — FIX, P1: the map promotes a disabled function into the live first-roof mechanic.** Map `docs/plans/2026-10-22-household-to-heritage-map.md:47-52`, `:138`, and `:163` describe 15%, ages 22–28, cap three, no income term as firing. Those details describe `phase05-citizens/householdFormationEngine.js:876-960`, but its caller explicitly disables it at `:199-208`; repository caller search found no runtime invocation. The scheduled entry is `phase01-config/godWorldEngine2.js:669` / `:2386`.

The actual first-roof pass is `formCriteriaHouseholds_`: Active/Retired/Recovering, no current HouseholdId, adopt an existing active Members match first (`phase05-citizens/householdFormationEngine.js:373-417`). Married citizens, adults with unhoused tracked children, and qualifying orphan minors form family/couple roofs; otherwise solo establishment requires age ≥18 and Income ≥$85,000, then 10% × the establish maneuver factor, with no three-household cap (`:302-303`, `:424-488`). It writes a rented Household row and SL HouseholdId. Correct the map's causal account and withdraw the claimed missing-income defect; no new builder ruling or engine change is needed to report existing behavior.

**Hop 2 — SHIP with precision corrections.** `phase05-citizens/bondEngine.js:2348-2355` writes married and reciprocal `POPID Name` SpouseId on both rows when the columns exist. An active existing household with >1 member wins the join path (`:2364-2386`); there is no HeadOfHousehold test, despite the comment/map saying “heads.” Otherwise it creates a rented couple row and assigns both HouseholdIds (`:2434-2465`). Joiner children can move too (`:2387-2410`). The grown-romance gate is active bond, both people eligible to court, age window, intensity ≥8 (`:1904`, `:2246-2275`, `:2331-2338`). Housing boosts are owned ×2 / rented ×1.5 / none ×1, then best-tier multiplier; stepP caps at 0.5 and the 2% big-week branch is unchanged (`:1905-1906`, `:716-729`, `:2144-2155`). This supports the map's housing lever, not an ownership prerequisite.

**Hop 3 — FIX, P2: purchase gates and sale economics are materially incomplete.** `phase05-citizens/generationalWealthEngine.js:2080-2110` requires active rented housing, positive rent, living members, no standing default mark, combined NetWorth ≥35% of price, the hood wealth floor, and mortgage plus property tax ≤30% of household income. Price is max(market rent, lease) ×12×22; 20% is the closing debit, not the qualifying threshold (`:1761-1786`, `:1793-1815`). The normal roll is 1% × tier × maneuver × home-die modifier; a large favorable renter die can buy directly (`:2111-2143`). Writes include owned, payment in MonthlyRent, purchase price in HousingCost, proportional member NetWorth debits, history/hook, and line purchase counters (`:2133-2178`).

The map's “returns only its down share” / “nothing ... moves NetWorth toward it” (`docs/plans/2026-10-22-household-to-heritage-map.md:68`, `:130`, `:145`) is false as a general code claim. `homeSaleProceeds_` returns max(0, current market price − 80% of recorded purchase price); only a seeded home lacking purchase cost uses 20% of current price (`phase05-citizens/generationalWealthEngine.js:2302-2309`). Proceeds credit member NetWorth (`:2351-2355`), so appreciation or depreciation can change the recovered equity. No amortizing loan/payment deduction is modeled, but HousingCost does retain purchase price. Trade-up rechecks affordability without a purchase roll (`:2423-2462`). The owned-home loss path is correctly described as risk-gated: default or stretched carry after the savings buffer, homeLossChance roll, successful rented-state write, then sale payout/history/hook (`:2207-2254`, `:2263-2280`). Correct the map, without changing the ruled design.

**Hop 4 — FIX in gate precision; odds arithmetic SHIP.** `phase04-events/generationalEventsEngine.js:1076-1113` checks household presence, age 26–42 (`:81`), MaritalStatus married, and fewer than three **[Birth] tags in LifeHistory**, not NumChildren. Its caller treats any nonblank SL HouseholdId as presence; it does not verify active Household membership (`:532-552`). The stated base/child/age/family/dial/heritage/floor modifiers agree; September receives both ×2 and July–October ×1.3 = ×2.6. The caller also applies the cycle birth limit and BirthYear gate, then writes the milestone, increments NumChildren, creates the child, and triggers the cascade (`:560-573`). State these precise reads rather than promising a validated household row or a NumChildren cap.

**Hop 5 — SHIP for divorce rule; FIX the unconditional dissolution wording and pointer.** Divorce's 3 distinct kinds / current plus preceding 12 Cycles / ≥1 major is implemented in `phase05-citizens/householdFormationEngine.js:1023-1025`, `:1041-1062`, `:1116-1119`, not `bondEngine.js:2290-2340` (romance/marriage). Current health status counts directly; dated kinds use the 13-Cycle window. Reciprocal-pair/archive/bond-load and same-Cycle-marriage guards can defer/skip it (`:1096-1115`). It clears SpouseId, sets divorced, removes the departing HouseholdId, records history and resolves bonds; household edits are in memory for later reconciliation (`:1162-1201`). Stress alone does not guarantee dissolution: zero income is skipped, savings can shield the roof, and crisis severity gets a 10% roll (`:1613`, `:1622-1635`, `:1659`).

**Stub question — FIX the “dead code” label.** `generateBirths_` / `processMarriages_` are empty-array TODOs (`phase05-citizens/householdFormationEngine.js:985-1003`) but are actually invoked at `:213-218`, returning zero summary counts. They produce no births/weddings; substantive writers reside in Phase 4 and bondEngine. Call them reachable no-op stubs, not uncalled functions.

## Hunt 2 — Tier and draw: FIX

**P2: “richer named-pool events” is not an implemented isNamed branch.** The only executable uses of isNamed in `phase05-citizens/generateCitizensEvents.js` are admission of T1/2 alongside T3/4 (`:2599-2600`) and excluding named citizens from the T3/4 ENGINE Generic_Citizens surfacing lottery/floor (`:3104-3108`). Eligible adults across all ClockModes share the atmospheric pool; deceased/traded/pending and minors are excluded (`:2591-2603`, `:2637-2638`). Tier itself is passed to content Conditions (`:3237`, `:3301`) and output tags (`:3757`); live content rows can therefore make tier matter, but this review did not read Event_Content_Ledger or measure its distribution.

Participation uses the common base and contextual/dial/usage modifiers, not isNamed (`phase05-citizens/generateCitizensEvents.js:2649-2717`). Recognition entries use UsageCount ≥8 or Cultural FameScore ≥25 (`:2956-2971`); occupation entries are ENGINE-only (`:2926`). Fame context is zero below the Cultural bar because `phase07-evening-media/culturalLedger.js:111-119` filters those rows. The “Tier-3/4 ENGINE only; LIMIT 10” footer at `generateCitizensEvents.js:4014-4015` is obsolete: the per-citizen draw attempts 1–4 events (`:722`, `:3500`). Correct map `docs/plans/2026-10-22-household-to-heritage-map.md:92` and `:108`; do not infer a richer named deck from historical comments at `:2583-2589`.

**Ladder/Famous — SHIP, with qualification.** Intake cannot lower an existing Tier (`phase05-citizens/processAdvancementIntake.js:785-791`). Active citizens climb from earned usage, min(cell, recorded citations); MEDIA uses published bylines ×2, other recognized modes citations less hard coverage, with ambiguous names skipped (`:1388-1407`). Bars are 3/6/9 (`:1165`). Famous instead reads the raw UsageCount cell ≥25, including seeded usage, for Active rows; stamps C<cycle>, floors Tier at 1 and requests Cultural registration/brightening (`:1215`, `:1345-1378`, `:1265-1277`). “25 mentions” is shorthand, not proof of 25 independently verified press records or successful persistence.

## Hunt 3 — Roots counts: FIX for table baseline; SHIP for both requested money thresholds

Re-derived predicate: SL POPID present, Status not deceased (matches `phase05-citizens/generationalWealthEngine.js:2740`); UNI/MED/CIV headers are literally `UNI (y/n)` etc., all trimmed/case-folded no or blank; Famous and LineageId blank; full First + Last absent from trimmed/case-folded Cultural Name; married; POPID listed in active Household Members; finite individual NetWorth ≥ floor. No ownership constraint for ruled Roots. Living = 1,044 (1,000 Active +44 Retired).

| $25M qualifying POPID | Name | NetWorth | Active rented household |
|---|---|---:|---|
| POP-01092 | Desmond Achebe | $168,607,985 | HH-0107-F026 |
| POP-01093 | Marguerite Salcedo | $132,626,692 | HH-0107-F027 |
| POP-01094 | Ignacio Zavala | $87,659,321 | HH-0107-F028 |
| POP-01095 | Helena Voss-Adeyemi | $71,874,877 | HH-0107-F029 |
| POP-01097 | Theodore Lindqvist | $37,777,040 | HH-0107-F030 |
| POP-01098 | Naomi Castellanos | $25,930,717 | HH-0107-F031 |

Exactly six; none missed. All six have blank SpouseId. At $10M **owned**, Gregory Mims POP-00023 alone: $12,827,859, HH-0101-B030. These confirm map `docs/plans/2026-10-22-household-to-heritage-map.md:121-124` and money-game `docs/plans/2026-10-16-the-money-game.md:141`.

**P2 correction:** the map's no-floor 410 any-roof /111 owned (`:114-118`, `:130`) omitted the Cultural exclusion at that floor. Correct counts are **405 /109**. The five excluded names are Evan Morello POP-00536 ($353,386, rented), Marin Tao POP-00537 ($81,988, rented), Derek Obi POP-00543 ($561,815, owned), Tara Ellison POP-00546 ($672,064, owned), Rico Valez POP-00632 ($110,706, rented). Before excluding them, the live read reproduces 410/111 exactly. Higher-floor any/owned counts match: $1M 103/33; $5M 9/2; $10M 8/1; $25M 6/0. They are exclusions, not missed entrants.

## Hunt 4 — SpouseId and marital door: SHIP

Among **Active** citizens: 500 married, 38 SpouseId nonblank, 462 blank; 488 under active roofs, 129 owning. Over **living** citizens: 520 married, 40 nonblank, 480 blank; 508 housed, 133 owning. The map's 38/500 is correct on its explicit Active denominator (`docs/plans/2026-10-22-household-to-heritage-map.md:39`, `:60-61`), not a living-population statistic.

MaritalStatus is the supported marriage-state door: `phase05-citizens/bondEngine.js:2348-2355` writes both fields for a tracked pair; `phase04-events/generationalEventsEngine.js:1080-1082` tests marital state independently. Household criteria deliberately accommodates an off-camera spouse (`phase05-citizens/householdFormationEngine.js:417`, `:459-463`); SpouseId denotes a tracked link. Requiring it would reject 92.4% of Active married rows, including all six current Roots candidates. Historical causes of the 462 blanks remain untraced; the old rollout comment alone does not prove their cause. The approved term is already in money-game Settled #6/#10, so the map's still-open defect framing at `:61` / `:139` is stale.

## Hunt 5 — HomesOwned: SHIP, precisely bounded

`foundLine_` seeds 1 only for Door C (`phase05-citizens/generationalWealthEngine.js:2834`); Step 6 runs before Step 7 (`:204-211`). Purchases count once per distinct already-linked lineage in that household (`:2159-2166`, `:2194-2195`), then Step 7 adds purchases and subtracts sales, flooring at zero (`:3107-3115`). Thus even a purchase immediately before A/B founding that Cycle has no LineageId to credit. Sales after Step 7 decrement directly; trade-ups are net-zero (`:2375-2384`, `:2410-2416`). “Every purchase” should mean this accounting, not a recount of all currently owned roofs.

Live: Vinnie Keane POP-00001 and Amara Keane POP-00002 occupy owned HH-KEANE; LIN-00003 is active, FoundedDoor B, FoundedCycle 103, HomesOwned **0**. Existing ownership alone never backfills it: `ownedHomePops` contributes to eligibility/revival (`phase05-citizens/generationalWealthEngine.js:2918`, `:3079`, `:3152`), while HomesOwned remains the counter above. His retained home does not automatically reach standing; a future qualifying purchase or an authorized seed repair could change the counter. This verifies map `docs/plans/2026-10-22-household-to-heritage-map.md:110` / `:141`, without claiming future events are impossible.

## Hunt 6 — record consistency: FIX

The final answers agree: map `docs/plans/2026-10-22-household-to-heritage-map.md:158-162` and money-game `docs/plans/2026-10-16-the-money-game.md:138`, `:141`, `:145` say unflagged, not Famous, not Cultural, any active roof, MaritalStatus married, individual NetWorth ≥$25M; CIV/MED do not enter Roots; no rung tally. `ownedHomePops` is a HomesOwned seed input only. These rulings are not reopened by this review.

**Still-current-looking contradictions to correct:** map `:103` calls [$10M] “Ruled ... 2026-10-21/22”; `:109` leaves owned bracketed; `:61` / `:139` say the build shape still names SpouseId; `:149-154` and the start of `:162` still present answered calls as open. Money-game `:131` prescribes owned + SpouseId and `:133` calls [$10M] open without a local supersession notice. Settled #7 at `:142` still describes the household choice as put to the builder. These can send a reader to the wrong implementation despite the correct final answers.

**History, not a new live contract:** Settled #6's opening “owned home + spouse + life ladder” is superseded later in the same line; Settled #10's opening “Roots tally” is explicitly superseded on that line. The earlier proposal tables/rounds, `:241` / `:243` tally, and dated changelog can remain historical if clearly marked and pointed to the final predicate. Prefer a clean operative summary plus labeled history; preserve the builder's actual rulings. Map `:163` additionally needs the source correction from Hunt 1, not another design question.

## Final gate and changelog

**HOLD acceptance of the map as an accurate implementation guide** until its active formation path, home-sale economics/gates, named-draw claim, no-floor Cultural counts, and operative Roots summaries are corrected. Hunt verdicts: **1 FIX · 2 FIX · 3 FIX (threshold counts SHIP) · 4 SHIP · 5 SHIP · 6 FIX**. No source repair or deployment is authorized or performed by this review. Actual live event distributions, historical blank-SpouseId causes, and deployed-code equivalence remain unverified.

- 2026-10-23 (codex) — Completed all six requested hunts with current source pointers and fresh read-only ledger counts; delivered only this named review.
