# Plan: Mara Reference Files

**Status:** COMPLETE | **Completed:** Session 105 (2026-03-20) | **Created:** 2026-03-19

## Problem

Mara (claude.ai) audits every edition but has no clean reference data. The PDF citizen ledger was unreadable. Agents get player names, neighborhoods, and business names wrong because there's no single source of truth they can check against.

## What Was Built

### Step 1 — Roster Ledger Tabs (Mike, S105)

Mike created two new tabs on the GodWorld spreadsheet:
- **As_Roster** (89 rows) — POPID, First, Last, Tier, Position, Team, MLB Prospect Rank
- **Bay_Tribune_Oakland** (29 rows) — POPID, First, Last, Tier, RoleType

Both link to Simulation_Ledger via POPID. As_Roster gives the sports desk clean player data (position, team) that the SL doesn't carry. Bay_Tribune_Oakland gives a clean journalist roster.

### Step 2 — Reference File Script (S105)

`scripts/buildMaraReference.js` — one script, one command, pulls 6 tabs:

| File | Source Tab | Records |
|------|-----------|---------|
| `citizen_roster.txt` | Simulation_Ledger (ENGINE mode) | 509 |
| `as_roster.txt` | As_Roster | 89 |
| `tribune_roster.txt` | Bay_Tribune_Oakland | 29 |
| `chicago_roster.txt` | Chicago_Citizens | 123 |
| `business_registry.txt` | Business_Ledger | 51 |
| `faith_registry.txt` | Faith_Organizations | 16 |

Output: `output/mara-reference/` — clean, ctrl+F friendly text files. Ages calculated from BirthYear vs sim year 2041.

### Step 3 — Supermemory Seeding (S105)

Reference files pushed to Supermemory containers:
- **`mara` container** — citizen roster, tribune roster, chicago roster, business registry, faith registry. Mara can recall these on claude.ai during audits.
- **`bay-tribune` container** — A's roster. Available to desk agents and Mags in Claude Code.

`buildMaraPacket.js` NOT updated — Mara doesn't need rosters bundled in every audit packet. She has persistent access through Supermemory. The packet stays focused on the edition text + audit history.

## Resolved Questions

- Chicago_Citizens: 123 rows, CHI-* IDs, includes Bulls players and Chicago city citizens
- Refresh cadence: re-run `buildMaraReference.js` after major ledger changes, not every cycle
- Roster tabs are manual (Mike maintains them from game data)

## Documentation

Full Supermemory architecture: `docs/SUPERMEMORY.md`
