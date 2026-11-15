---
title: Parcels on the Ledger Plan
created: 2026-11-15
updated: 2026-11-15
type: plan
tags: [engine, active]
sources:
  - world-view/README.md §Builder rulings (2026-11-10), §Parcels, §Homes, §The residential block
  - world-view/build.js layout() — the lots the page chooses today
  - output/beats/Business_Ledger.jsonl, output/beats/Household_Ledger.jsonl — headers read 2026-11-15
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.345"
  - "[[../../world-view/README]] — the page that reads the parcels"
---

# Parcels on the Ledger Plan

**Builder's words (2026-11-10):** "we would just need to add these to the ledger and create the parcels that with server addresses we give out. We can preattach the parcel by size and price." · "The building parcels would eventually be coded with addresses so the businesses occupy a parcel more deliberately than just the names on buildings randomly."

**Builder's words (2026-11-15):** "like the business , we would start to give the parcels and ID/address attached to the household , maybe renters are on the Main Street or a seperate block ? This way we can eventually move towards parcels carrying value in the home buying system on the sheets" · "I've said the parcels need Ids/addresses and added to business ledger and households in ever my session so if it's not done that's a huge concern" · on being told the idea and asked for the go and an address example: "Idc do whatever".

**Goal:** every business and every active household points at a parcel the sheet holds, with an id and an address, and the page draws from that instead of choosing lots.

**Rows:** engine.345 · **Owner:** research-build

## Where it stands (read 2026-11-15)

- `Business_Ledger` columns: BIZ_ID, Name, Sector, Neighborhood, Employee_Count, Avg_Salary, Annual_Revenue, Growth_Rate, Key_Personnel. No parcel, no address. 283 rows.
- `Household_Ledger` columns: HouseholdId, HeadOfHousehold, HouseholdType, Members, Neighborhood, HousingType, MonthlyRent, HousingCost, HouseholdIncome, FormedCycle, DissolvedCycle, Status, HouseholdSavings, LastGrantCycle, LastGrantInitiativeID, LastGrantAmount. No parcel, no address. 677 active.
- No Parcels tab on the sheet.
- The page (`world-view/build.js` `layout()`) lays every street out as lots and decides which business and household is on which, every build. Its ids (`grand-lake-e07`, block lots `grand-lake-re01`) are the same for the same inputs and move when a street's headcount moves. 14 ledger businesses have no street (10 `City-wide`, `Brooklyn Basin`, `Old Oakland`, `Coliseum`, `Telegraph corridor`).
- Engine files that name the tabs (grep 2026-11-15, not yet read): `Household_Ledger` in 11 files (householdFormationEngine, migrationTrackingEngine, generationalWealthEngine, maneuverEngine, bondEngine, casinoLedgerEngine, generationalEventsEngine, generateCitizensEvents, processAdvancementIntake, educationCareerEngine, lib/wakePerception); `Business_Ledger` in about 20 (applyBusinessDynamics, runCareerEngine, economicRippleEngine, chaosCarsEngine, commuteFlowEngine and others).

## Design

- A `Parcels` tab: one row per lot. `ParcelID`, `Neighborhood`, `Street` (main | block), `Side`, `Order` (place down the street), `Kind` (shop building | plain building | house | landmark), `Units` (how many households or businesses it holds), `Address`. Size and price columns wait on Open questions.
- `ParcelID` (and `Address`) as new columns at the right edge of `Business_Ledger` and `Household_Ledger`. A household in a building also carries its unit.
- First fill: the lots and the occupancy the page computes today for C115, written once. From then the tab is the truth: a parcel keeps its id, and a street's length follows its parcels, not its headcount.
- The page: `layout()` reads lots and occupancy from the dump and stops choosing. A business or household with no parcel is listed, not placed.
- The engine hands out and frees parcels when a household forms, moves, buys or dissolves and when a business opens or closes. Each of those is its own cut on its own function, after the tab exists.
- Parcels carrying value in home buying comes after that and starts with reading the home-buying path.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Wiring cards for `Business_Ledger` and `Household_Ledger`: every writer that appends or rewrites a row, every reader by column position. Settles whether a column at the right edge is safe for each. | rb (engine-wiring) | not started |
| 2 | The address format | builder | waiting: one example asked 2026-11-15 |
| 3 | Seed script (`scripts/`, Node, `lib/sheets`): builds the lot table from the layout for the current cycle, writes the `Parcels` tab and the two `ParcelID` columns. Dry-run prints counts and every business or household left without a parcel. Sandbox sheet, then read back. | rb | not started |
| 4 | Page reads the tab: `Parcels` into the beat dump, `layout()` takes lots and occupancy from it. Verified by the page check and by two builds a headcount apart giving the same ids. | rb | not started |
| 5 | Checker: every page lot is a `Parcels` row; every business and active household names a parcel that exists; no unit holds two. | rb | not started |
| 6 | Engine: parcel handed out or freed on household formation, move, purchase, dissolution; business opening, closure. One cut per function, from its wiring card, sandbox-proven. | rb | not started |
| 7 | Parcel value in home buying | rb | not started; begins with reading the home-buying code |
| 8 | Live sheet: the tab and the two columns | rb | waiting: the builder's explicit go for a write that touches every business and household row |

## Acceptance

1. On the sandbox sheet, every business whose neighborhood is one of the 22 streets and every active household has a `ParcelID` that is a row of `Parcels`; the 14 businesses with no street are listed with none — proven by the seed script's read-back.
2. Two page builds, the second with one household added to a street, give every existing business and household the same parcel — proven by Task 4's test.
3. A sandbox fire after the columns exist runs clean: no engine function writes into or shifts the new columns — proven by the fire and a read-back of both tabs.
4. The live sheet carries the same, after the builder's go — proven by read-back.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| none yet | | | |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|
| P1 | A column added at the right edge of either ledger breaks no engine write or read | rb | Task 1 wiring cards, then a sandbox fire | grep of the tab names, 2026-11-15 |
| P2 | The page's C115 occupancy is a fair first fill (renters over shops, owners in houses, the rest on the block) | rb | the builder's look at the seed's dry-run | world-view/README §Homes |

## Open questions

- What an address looks like ("server addresses we give out", builder 2026-11-10) — blocks the `Address` column in Task 3; for the builder. Ids do not wait on it.
- Whether a parcel carries a size and a price from the start ("We can preattach the parcel by size and price"), and what sets the price — blocks Task 7; for the builder.
- Whether the 14 businesses with no street get a parcel anywhere — for the builder.

## Changelog

- 2026-11-15 (research-build) — Created. Row widened from households to businesses and households the same day. No code, no sheet write.
