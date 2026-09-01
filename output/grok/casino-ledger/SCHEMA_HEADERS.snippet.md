## Casino_Ledger

- **Rows:** 1 (HOUSE seed) until armed
- **Columns:** 15

| Col | Header |
|-----|--------|
| A | WagerId |
| B | CyclePlaced |
| C | CycleSettled |
| D | POPID |
| E | HouseholdId |
| F | MarketFamily |
| G | MarketId |
| H | EventId |
| I | Side |
| J | Stake |
| K | Odds |
| L | Payout |
| M | Status |
| N | HouseFloatAfter |
| O | Seed |

`WagerId=HOUSE` is the float row (`HouseFloatAfter` starts at 250000). Citizen rows are append-only. `schemas/SCHEMA_HEADERS.md` is engine-sheet to land — this snippet is the payload, not the registration.
