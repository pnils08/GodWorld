---
title: engine.290 — Station Ridership Share Read-Before (C111 Beats)
created: 2026-10-15
type: reference
tags: [engine, transit, readbefore, C111]
---

# engine.290 — Proposed Station Ridership Shares Read-Before (C111 Beats)

## 1. Parameters & Specification

- **Formula Source:** `docs/plans/2026-10-15-engine-290-transit-rides-the-sim.md` Move 3.
- **Weight Formula:** `w(h) = Adults(h) * (1 + inbound(h) / (inbound(h) + max(local(h), 1)))`
- **Station Load Formula:** `load(station) = sum_{h in served(station)} [ w(h) / stationsServing(h) ]`
- **Station Share Formula:** `share(station) = load(station) / totalLoad`
- **New Base Ridership:** `base(station) = share(station) * 60,000` (where 60,000 = today's table sum `transitCityRiders`)
- **Retail Term:** Skipped per task instruction (no beat file exists in `output/beats/` for `retailVitality` at C111).
- **Served Hoods Mapping:** `utilities/ensureTransitMetrics.js:37-99` `OAKLAND_BART_STATIONS` (`neighborhood` + `corridors` folded to canon hoods and deduplicated per station).
- **Demographics Data:** `output/beats/Neighborhood_Demographics.jsonl` (22 rows, `LastUpdated: 111`, column `Adults`).
- **Simulation Ledger Data:** `output/simulation_ledger_snapshot.jsonl` (1,032 total rows; 988 `Status=Active`, columns `Neighborhood`, `EmployerBizId`).
- **Business Ledger Data:** `output/beats/Business_Ledger.jsonl` (179 rows, columns `BIZ_ID`, `Neighborhood`).

## 2. Child Area Folding Justifications

Child areas with no row in `Neighborhood_Demographics` are folded to canon neighborhoods per `docs/canon/INSTITUTIONS.md` §Neighborhoods and `Neighborhood_Map.ChildAreas`:

1. **Coliseum -> East Oakland**:
   - `docs/canon/INSTITUTIONS.md` line 351 explicitly distinguishes Baylight District from the Coliseum: *"Not the Coliseum site — the Coliseum is the A's current home in East Oakland; Baylight is where they are moving."*
   - `docs/canon/INSTITUTIONS.md` line 392 (under East Oakland / District 5): *"Twenty years of boom reached here last and is arriving fast: the Coliseum sits here..."*
   - `utilities/ensureTransitMetrics.js:67-76` defines Coliseum station with `neighborhood: 'East Oakland'`.
   - `output/beats/Business_Ledger.jsonl` row BIZ-00029 (Coliseum District Development) sits in `Coliseum`, folding into East Oakland.
   - Authoritative mapping: `Neighborhood_Map.ChildAreas` for East Oakland specifies `Coliseum, Elmhurst`.

2. **Elmhurst -> East Oakland**:
   - `docs/canon/INSTITUTIONS.md` line 392 places the East flatlands under District 5 (Janae Rivers). Elmhurst is historically the southern section of the East Oakland flatlands.
   - Authoritative mapping: `Neighborhood_Map.ChildAreas` for East Oakland specifies `Coliseum, Elmhurst`.

3. **North Oakland -> Temescal**:
   - `docs/canon/INSTITUTIONS.md` lines 345 & 400 anchor District 7 (Warren Ashford) across the Temescal/Telegraph corridor north of Downtown.
   - MacArthur BART station (`utilities/ensureTransitMetrics.js:86-90`) sits at 40th & Telegraph in Temescal (`neighborhood: 'Temescal'`), characterized as *"transfer station, north-south junction"* serving North Oakland.
   - `Neighborhood_Map.ChildAreas` for Temescal defines `Telegraph corridor, Longfellow, Shafter`, the urban core of North Oakland.
   - *Note on Station Topology:* MacArthur station has raw corridors `['Temescal', 'Rockridge', 'North Oakland']`. Folding North Oakland to Temescal (or Rockridge) yields the identical deduplicated served hood set: `{Temescal, Rockridge}`.

4. **Montclair -> Piedmont Ave**:
   - `docs/canon/INSTITUTIONS.md` line 396 anchors District 6 (Elliott Crane) to Piedmont Ave as the commercial and medical corridor serving the elite lake/hills edge.
   - `Neighborhood_Map.ChildAreas` (and `docs/SPREADSHEET.md:47`) explicitly authors Montclair under Piedmont Ave (`Montclair -> Piedmont Ave`).
   - *Note on Station Topology:* Rockridge station has raw corridors `['Rockridge', 'Piedmont Ave', 'Montclair']`. Folding Montclair to Piedmont Ave (or Rockridge) yields the identical deduplicated served hood set: `{Rockridge, Piedmont Ave}`.

## 3. Citizen Count Coverage

| Metric | Count | % of Active | Notes |
|---|---:|---:|---|
| **Total Snapshot Rows** | **1,032** | — | `output/simulation_ledger_snapshot.jsonl` |
| Retired Citizens (`Status=Retired`) | 44 | — | Excluded from active commute flow |
| **Active Citizens (`Status=Active`)** | **988** | **100.00%** | Full active workforce population |
| Resolved to Employer Neighborhood | 432 | 43.72% | EmployerBizId maps to known business with geographic hood |
| — *Cross-hood commuters (`inbound(h)`)* | 343 | 34.72% | Lives in home hood, works in different employer hood |
| — *Same-hood employer (`local`)* | 89 | 9.01% | Lives in home hood, employer sits in home hood |
| Self-Employed / No Employer (`local`) | 315 | 31.88% | Works from/near home in residence hood |
| **Total Geographically Resolved** | **747** | **75.61%** | Total Active rows resolved to a specific hood (432 + 315) |
| City-wide Employers (non-hood) | 173 | 17.51% | By-design exclusion: OPD, OUSD, AC Transit, BART, Alta Bates |
| Off-Ledger Sentinel (`UNTRACKED`) | 68 | 6.88% | By-design exclusion: employed off tracked ledger |
| Dangling BIZ-IDs | 0 | 0.00% | Zero unresolved employer IDs |
| Businesses without Neighborhood | 0 | 0.00% | Zero unmapped business locations |
| **Total Reconciliation Check** | **988** | **100.00%** | 432 + 315 + 173 + 68 = 988 |

## 4. Inbound and Local Counts Per Neighborhood

The task defines:
- `inbound(h)` = Active citizens living outside `h` whose employer sits in `h`.
- `local(h)` = Active citizens living in `h` (primary interpretation: resident population living in `h`, 988 total).
- For complete transparency, `local_workers(h)` = Active citizens living in `h` who work in `h` (404 total: 89 same-hood employer + 315 self-employed) is also reported.

| Neighborhood | Adults(h) | Inbound | Local (Living) | Inbound Ratio (Living) | w(h) (Living) | Local (Workers) | Inbound Ratio (Workers) | w(h) (Workers) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Adams Point | 1781 | 0 | 8 | 0.0000 | 1781.00 | 3 | 0.0000 | 1781.00 |
| Baylight District | 411 | 111 | 9 | 0.9250 | 791.18 | 7 | 0.9407 | 797.62 |
| Brooklyn | 1483 | 0 | 9 | 0.0000 | 1483.00 | 5 | 0.0000 | 1483.00 |
| Chinatown | 1485 | 0 | 65 | 0.0000 | 1485.00 | 25 | 0.0000 | 1485.00 |
| Dimond | 1481 | 1 | 9 | 0.1000 | 1629.10 | 7 | 0.1250 | 1666.13 |
| Downtown | 2286 | 99 | 89 | 0.5266 | 3489.80 | 50 | 0.6644 | 3804.89 |
| East Oakland | 1530 | 3 | 15 | 0.1667 | 1785.00 | 1 | 0.7500 | 2677.50 |
| Eastlake | 1636 | 2 | 8 | 0.2000 | 1963.20 | 5 | 0.2857 | 2103.43 |
| Fruitvale | 1546 | 6 | 98 | 0.0577 | 1635.19 | 39 | 0.1333 | 1752.13 |
| Glenview | 1481 | 0 | 9 | 0.0000 | 1481.00 | 6 | 0.0000 | 1481.00 |
| Grand Lake | 1638 | 2 | 8 | 0.2000 | 1965.60 | 3 | 0.4000 | 2293.20 |
| Ivy Hill | 1334 | 0 | 9 | 0.0000 | 1334.00 | 6 | 0.0000 | 1334.00 |
| Jack London | 2176 | 25 | 76 | 0.2475 | 2714.61 | 45 | 0.3571 | 2953.14 |
| KONO | 420 | 2 | 16 | 0.1111 | 466.67 | 3 | 0.4000 | 588.00 |
| Lake Merritt | 453 | 2 | 97 | 0.0202 | 462.15 | 20 | 0.0909 | 494.18 |
| Laurel | 1494 | 0 | 58 | 0.0000 | 1494.00 | 25 | 0.0000 | 1494.00 |
| Piedmont Ave | 1492 | 3 | 57 | 0.0500 | 1566.60 | 12 | 0.2000 | 1790.40 |
| Rockridge | 1489 | 5 | 90 | 0.0526 | 1567.37 | 16 | 0.2381 | 1843.52 |
| San Antonio | 1513 | 2 | 10 | 0.1667 | 1765.17 | 3 | 0.4000 | 2118.20 |
| Temescal | 2118 | 12 | 60 | 0.1667 | 2471.00 | 40 | 0.2308 | 2606.77 |
| Uptown | 500 | 11 | 82 | 0.1183 | 559.14 | 47 | 0.1897 | 594.83 |
| West Oakland | 1651 | 57 | 106 | 0.3497 | 2228.34 | 36 | 0.6129 | 2662.90 |

## 5. Station Topology & Service Matrix

| Neighborhood `h` | Stations Serving `h` | `stationsServing(h)` | `w(h)` (Living) | `w(h) / stationsServing(h)` |
|---|---|---:|---:|---:|
| Adams Point | Lake Merritt | 1 | 1781.00 | 1781.00 |
| Baylight District | Coliseum | 1 | 791.18 | 791.18 |
| Chinatown | Lake Merritt | 1 | 1485.00 | 1485.00 |
| Dimond | Fruitvale | 1 | 1629.10 | 1629.10 |
| Downtown | 12th St Oakland City Center, 19th St Oakland, West Oakland | 3 | 3489.80 | 1163.27 |
| East Oakland | Fruitvale, Coliseum | 2 | 1785.00 | 892.50 |
| Fruitvale | Fruitvale | 1 | 1635.19 | 1635.19 |
| Jack London | West Oakland | 1 | 2714.61 | 2714.61 |
| Lake Merritt | 12th St Oakland City Center, 19th St Oakland, Lake Merritt | 3 | 462.15 | 154.05 |
| Piedmont Ave | Rockridge | 1 | 1566.60 | 1566.60 |
| Rockridge | MacArthur, Rockridge | 2 | 1567.37 | 783.68 |
| Temescal | 19th St Oakland, MacArthur | 2 | 2471.00 | 1235.50 |
| West Oakland | 12th St Oakland City Center, West Oakland | 2 | 2228.34 | 1114.17 |

## 6. Proposed Station Ridership Shares Table

### Primary Table: `local(h)` = Active Citizens Living in `h`

| Station | Served Hoods (After Folding) | Load | Share | New Base | Today Base | Delta |
|---|---|---:|---:|---:|---:|---:|
| 12th St Oakland City Center | Downtown, Lake Merritt, West Oakland | 2431.49 | 10.30% | 6180.1 | 12500 | -6319.9 |
| 19th St Oakland | Downtown, Lake Merritt, Temescal | 2552.82 | 10.81% | 6488.5 | 8500 | -2011.5 |
| Lake Merritt | Lake Merritt, Chinatown, Adams Point | 3420.05 | 14.49% | 8692.7 | 5000 | +3692.7 |
| Fruitvale | Fruitvale, Dimond, East Oakland | 4156.79 | 17.61% | 10565.3 | 7500 | +3065.3 |
| Coliseum | East Oakland, Baylight District | 1683.68 | 7.13% | 4279.4 | 6000 | -1720.6 |
| West Oakland | West Oakland, Jack London, Downtown | 4992.05 | 21.15% | 12688.2 | 4500 | +8188.2 |
| MacArthur | Temescal, Rockridge | 2019.18 | 8.55% | 5132.1 | 9000 | -3867.9 |
| Rockridge | Rockridge, Piedmont Ave | 2350.28 | 9.96% | 5973.7 | 7000 | -1026.3 |
| **Total** | — | **23606.34** | **100.00%** | **60,000.0** | **60,000** | **0.0** |

### Sensitivity Comparison: `local(h)` = Active Citizens Working in `h`

| Station | Served Hoods (After Folding) | Load | Share | New Base | Today Base | Delta |
|---|---|---:|---:|---:|---:|---:|
| 12th St Oakland City Center | Downtown, Lake Merritt, West Oakland | 2764.47 | 10.51% | 6303.1 | 12500 | -6196.9 |
| 19th St Oakland | Downtown, Lake Merritt, Temescal | 2736.41 | 10.40% | 6239.2 | 8500 | -2260.8 |
| Lake Merritt | Lake Merritt, Chinatown, Adams Point | 3430.73 | 13.04% | 7822.2 | 5000 | +2822.2 |
| Fruitvale | Fruitvale, Dimond, East Oakland | 4757.01 | 18.08% | 10846.2 | 7500 | +3346.2 |
| Coliseum | East Oakland, Baylight District | 2136.37 | 8.12% | 4871.0 | 6000 | -1129.0 |
| West Oakland | West Oakland, Jack London, Downtown | 5552.89 | 21.10% | 12660.9 | 4500 | +8160.9 |
| MacArthur | Temescal, Rockridge | 2225.15 | 8.46% | 5073.5 | 9000 | -3926.5 |
| Rockridge | Rockridge, Piedmont Ave | 2712.16 | 10.31% | 6183.9 | 7000 | -816.1 |
| **Total** | — | **26315.18** | **100.00%** | **60,000.0** | **60,000** | **0.0** |

## 7. Numerical Summary

- Total City Baseline Ridership pool: 60,000 rides.
- Served unique hoods across the 8 BART stations: 13 canon neighborhoods.
- Unserved hoods by BART (bus/corridor territory): 9 canon neighborhoods (Brooklyn, Eastlake, Glenview, Grand Lake, Ivy Hill, KONO, Laurel, San Antonio, Uptown).
- Primary Table Load Sum: 23,606.34.
- Top station by proposed share: **West Oakland** (12,688.2 / 21.15%, +8,188.2 vs 4,500 today) driven by sole service to Jack London (w=2,714.61) and shared service to Downtown and West Oakland.
- Second station by proposed share: **Fruitvale** (10,565.3 / 17.61%, +3,065.3 vs 7,500 today) driven by sole service to Fruitvale and Dimond plus shared East Oakland.
- Primary downward adjustments: **12th St Oakland City Center** (-6,319.9 to 6,180.1) and **MacArthur** (-3,867.9 to 5,132.1), reflecting 3-way station sharing of Downtown and 2-way sharing of Temescal and Rockridge.
