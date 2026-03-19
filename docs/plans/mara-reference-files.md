# Plan: Mara Reference Files

**Status:** Planned | **Target:** Session 105+ | **Created:** 2026-03-19

## Problem

Mara (claude.ai) audits every edition but has no clean reference data. The PDF citizen ledger was unreadable. Agents get player names, neighborhoods, and business names wrong because there's no single source of truth they can check against.

## What Mara Needs

1. **Citizen roster** — name, age, neighborhood, occupation, tier, status. All 675 citizens.
2. **A's roster** — players, positions, career stats, contract status. Currently on the Simulation_Ledger as GAME-mode / UNI=Y citizens (~97).
3. **Bulls roster** — players, positions, stats, contract status. Paulson's GM role stated clearly. Currently on Chicago_Citizens tab.
4. **Business registry** — name, sector, neighborhood, employees, key personnel. Business_Ledger (51 rows).
5. **Venue/faith registry** — org, tradition, neighborhood, status. Faith_Ledger (105 rows).

## Data Sources (all on GodWorld spreadsheet)

| File | Source Tab | Filter | Key Columns |
|------|-----------|--------|-------------|
| Citizen roster | Simulation_Ledger | All 675 | First, Last, BirthYear (calc age from 2041), Neighborhood, RoleType, Tier, Status |
| A's roster | Simulation_Ledger | ClockMode=GAME or UNI(y/n)=y | First, Last, RoleType, Status + whatever stats/position data exists |
| Bulls roster | Chicago_Citizens | TBD — need to read tab headers | TBD |
| Business registry | Business_Ledger | All 51 | BIZ_ID, Name, Sector, Neighborhood, Employee_Count, Key_Personnel |
| Faith/venue registry | Faith_Ledger | All 105 | Organization, FaithTradition, Neighborhood, Status |

## Deliverables

### 1. Script: `scripts/buildMaraReference.js`
- One script, one run, pulls all tabs
- Outputs clean text files to `output/mara-reference/`
- Citizen ages calculated from BirthYear vs current sim year (2041)
- Readable format — not raw CSV, but clean columns Mara can ctrl+F

### 2. Supermemory seeding (godworld container)
- Same data pushed to `godworld` container as reference documents
- Any agent with godworld read access can query ("what neighborhood is Dante Nelson in?")
- Citizen roster as one document, business registry as one document, etc.
- Not 675 individual memories — consolidated reference docs

### 3. Audit packet integration
- `buildMaraPacket.js` updated to include files from `output/mara-reference/`
- Mara gets reference data with every audit packet automatically

## Execution Order

**Step 1 — Build roster ledgers (do this FIRST)**
- Create `As_Roster` tab on spreadsheet: name, position, stats (ERA/AVG/HR etc), contract status, acquisition method (draft/trade/free agent), acquisition date, POPID (links to SL for life events)
- Create `Bulls_Roster` tab: same structure adapted for basketball (PPG/RPG/APG etc), Paulson's GM role stated in tab header or pinned row
- Seed from existing data: SL GAME-mode citizens + MLB/NBA_Game_Intake events
- These become the sports desk's source of truth. SL keeps giving players life events. Roster tabs give the desk sports facts.

**Step 2 — Build reference file script**
- `scripts/buildMaraReference.js` pulls from: Simulation_Ledger (citizens), As_Roster, Bulls_Roster, Business_Ledger, Faith_Ledger
- Outputs to `output/mara-reference/`
- Clean, readable, ctrl+F friendly

**Step 3 — Supermemory + audit packet**
- Push reference docs to `godworld` container
- Update `buildMaraPacket.js` to include reference files

## Open Questions

- [ ] Read Chicago_Citizens tab to understand Bulls data structure
- [ ] Define stat columns for each sport (what does Mike track in the games?)
- [ ] Decide refresh cadence — rebuild after every cycle? Every edition?
- [ ] Should game intake events auto-update the roster tabs, or manual?

## Notes

A's players live on the Simulation_Ledger as GAME-mode citizens (ClockMode=GAME) or UNI=Y. ~97 citizens. They get life events through the engine like any citizen. But the sports desk needs sports data (stats, position, contract) that the SL doesn't carry. That's why dedicated roster tabs come first — they hold the sports facts, SL holds the life facts, both link via POPID.
