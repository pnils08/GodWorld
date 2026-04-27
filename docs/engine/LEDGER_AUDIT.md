# Simulation_Ledger Data Integrity Audit

**Created:** Session 68 (2026-02-28)
**Last Refresh:** Session 181 (2026-04-27) — S94 RECOVERY VERIFIED; small post-S94 drift identified
**Priority:** CRITICAL — All downstream ledgers depend on this data being correct
**Rule:** Age = 2041 - BirthYear. Always. The simulation year is 2041.

This is the single tracking document for the Simulation_Ledger overhaul. All audit progress, decisions, and remaining work live here. Other docs reference this file — they don't duplicate it.

> **Document timeline.** S68 baseline (this doc) → S94 corruption recovery (`LEDGER_REPAIR.md`) → S99 schema bump + civic-officials cleanup (`LEDGER_REPAIR.md` post-recovery section) → S181 verification + drift snapshot (this section, below). Read top-down for current state; the historical S68 / S69 / S72 sections below are archive.

---

## Current State — S181 refresh (2026-04-27)

**Verifier:** `scripts/auditSimulationLedger.js` (run from engine-sheet to refresh).

### Headline numbers

| Metric | Value | Note |
|--------|-------|------|
| Schema | 47 cols A–AU | Was 46 A–AT post-S99; Gender (AU) added since |
| Total rows | 760 | Includes blank-row gaps |
| Extant citizens | 686 | S94 closure reported 675 → +11 net since |
| POPID range | POP-00001 → POP-00801 | |
| POPID gaps | 115 | LEDGER_REPAIR §"What Happened" reported 113; +2 new gaps since |
| Tier distribution | 17 T1 / 60 T2 / 218 T3 / 391 T4 | All numeric ✓ |
| Status enum | 675 Active, 9 Retired, 1 "Recovering", 1 "recovering" | Case-mismatch sentinel — see drift |
| Age sanity (2041 anchor) | 0 out-of-bounds | All BirthYear values yield ages 0–110 ✓ |
| RoleType="Citizen" sentinel | **4 citizens** | Drift — see below |

### S94 recovery claims — **VERIFIED HOLDING**

LEDGER_REPAIR.md §"Recovery Status: COMPLETE (S94)" claims hold against live data:

| Claim | S94 baseline | S181 live | Holds? |
|-------|--------------|-----------|--------|
| 0 missing names | 0 | 0 missing First, 0 missing Last | ✅ |
| 0 "Citizen" RoleTypes | 0 | 4 (post-S94 drift only — see below) | ✅ for S94 cohort; ⚠ for new |
| Tiers all numeric | yes | yes (1–4) | ✅ |
| EducationLevel populated | 100% | 98.5% (10 missing — all post-S94 additions) | ✅ for S94 cohort |
| Income populated | 100% | 100% | ✅ |
| Headcount | 675 | 686 (+11) | ✅ growth, no shrinkage |

**Verdict:** S94 recovery stands. The historical corruption (S68 mass-role-mangling, age-shift contamination, 4 institution-as-citizen entries, etc.) does not regenerate. New drift is small and localized.

### Tier × ClockMode matrix (S181)

| | ENGINE | GAME | CIVIC | MEDIA | LIFE |
|---|---|---|---|---|---|
| **T1** | 4 | 12 | 0 | 1 | 0 |
| **T2** | 45 | 5 | 7 | 3 | 0 |
| **T3** | 88 | 72 | 34 | 24 | 0 |
| **T4** | 384 | 1 | 5 | 1 | 0 |

LIFE clock mode is in the enum but has 0 citizens — never adopted. Worth removing from documentation if not planned.

### Drift surfaced by S181 audit

1. **`RoleType="Citizen"` literal — 4 citizens** (all post-S94 additions, all T4 ENGINE):
   - POP-00794 Irene Fay (West Oakland, female)
   - POP-00795 Marisol Trujillo (Fruitvale, female)
   - POP-00798 Grace Yamamoto (Adams Point, female)
   - POP-00801 Maurice Franklin (Rockridge, male)

   **Root cause:** intake/generation default fallback. `phase05-citizens/processAdvancementIntake.js:296` does `var roleType = iRoleType >= 0 ? (row[iRoleType] || 'Citizen') : 'Citizen';` — when the intake row doesn't specify a role, the default is the literal string "Citizen", which is exactly the anti-pattern S94 fixed (399 such cases).

   **Tracked:** `ENGINE_REPAIR.md` Row 17.

2. **Status case-mismatch — 1 row.** "Recovering" + "recovering" both present. Free-text input drift; trim/casefold at write time would prevent.

3. **POPID gap drift — +2 since S94.** Recovery left 113 gaps; live now has 115. Indicates 2 rows were created then deleted (or POPIDs were skipped). Not actionable without a writer trace.

4. **Post-S94 EducationLevel + Gender gaps.** 10 of 13 post-S94 citizens have empty EducationLevel; 3 have empty Gender. Same intake path as the "Citizen" role default — citizens emerged via media-room intake don't get demographic backfill.

### Per-column completeness (cols below 100%)

Population tracked by `auditSimulationLedger.js`. Highlights:

| Column | Populated | % | Note |
|--------|-----------|---|------|
| Middle | 3 | 0.4% | Rarely used, expected sparse |
| OriginGame | 224 | 32.7% | Set only for sports/game-mode citizens |
| OrginCity | 259 | 37.8% | Set only for non-Oakland origin |
| LifeHistory | 649 | 94.6% | 37 citizens with empty narrative |
| Last Updated | 265 | 38.6% | Most rows never re-stamped |
| TraitProfile | 342 | 49.9% | Half the population missing personality JSON |
| UsageCount | 162 | 23.6% | Media-usage tracking sparse |
| HouseholdId | 532 | 77.6% | 154 unhoused — see Phase 24 plan |
| MaritalStatus / NumChildren / ParentIds / ChildrenIds | 596–607 | 86–88% | Lifecycle-engine baseline coverage |
| WealthLevel / Income / NetWorth / SavingsRate / DebtLevel | 595–676 | 87–98.5% | Economic engine coverage |
| EducationLevel | 676 | 98.5% | 10 missing (post-S94) |
| **MigrationReason** | **0** | **0%** | **Column exists, never written by any engine** |
| **MigrationDestination** | **0** | **0%** | **Same — orphan column** |
| MigratedCycle / ReturnedCycle / MigrationIntent | 596 | 86.9% | Migration writer covers intent + cycles, not reason/destination |
| EconomicProfileKey | 655 | 95.5% | |
| EmployerBizId | 658 | 95.9% | Phase 5 employer assignment |
| **CitizenBio** | **32** | **4.7%** | S99 added for 17 T2 citizens; 32 now — slow growth, expected |
| Gender | 683 | 99.6% | 3 missing (post-S94) |

Two columns at 0%: `MigrationReason` and `MigrationDestination`. Schema reservation, no writer. Either (a) a planned engine never landed, (b) the intent-only writer path was meant to populate them and doesn't, or (c) safe to drop. Worth a future ENGINE_REPAIR row.

### Narrative-column observations

- **LifeHistory 94.6%** is healthy — 37 citizens with empty narrative are mostly post-S94 additions and a few legacy gaps.
- **TraitProfile 49.9%** is half-populated. The trait-bounded refactor (S134 pipeline v2 / research4_1) was meant to standardize this. Status of the rollout: unclear from live data.
- **CitizenBio 4.7%** is by-design narrow per S99 (T2 narrative anchors).

### Non-canon-12 neighborhood occurrences

169 citizens use neighborhood strings outside the canon-12 list this audit checks:

| Count | Value | Likely classification |
|-------|-------|----------------------|
| 69 | Uptown | Fine-grained child of Downtown (Row 14 ontology) |
| 50 | Laurel | Fine-grained child of East Oakland |
| 44 | Piedmont Ave | Format drift of "Piedmont Avenue" |
| 1 each | HH-KEANE, KONO, Downtown Oakland, Coliseum District, Jingletown | One-offs — possible household-ID leak ("HH-KEANE"), legitimate neighborhood ("KONO" = Koreatown-Northgate-Oakland), or fine-grained children |

Per Row 14 closure (S180), engine code is correct under canon-12 ← fine-grained-17 parent-child layering — child names are accepted. The audit's canon-12 check above flags everything below the parent layer, so 119 of these are NOT actual drift, they're correct fine-grained children. The format-drift cases (`Piedmont Ave` vs `Piedmont Avenue`, `Downtown Oakland` vs `Downtown`) and the HH-KEANE leak are the candidates for cleanup. Low priority; localized.

### Refresh cadence

Run `node scripts/auditSimulationLedger.js` whenever a major ledger-touching cycle ships, or before any decision that depends on ledger health. JSON output (`--json`) suitable for ingestion into reviewer pipelines.

---

## Governing Principles

1. **Simulation_Ledger is the single source of truth.** Not PERSISTENCE.md, not desk packets, not articles. The ledger.
2. **queryLedger.js makes the ledger queryable.** Agents and scripts can now reach the data directly. No more stale static briefs.
3. **Birth years use 2041 math.** A 30-year-old citizen was born in 2011. A 55-year-old was born in 1986. Every entry must pass this test.
4. **No phantom entries.** Every POP-ID is a real person with a name, role, neighborhood, and birth year. No empty shells, no duplicates.
5. **Franchise scope:** Only Oakland Athletics (baseball) and Chicago Bulls (basketball). No Warriors. No other NBA/MLB teams tracked.
6. **MUBA stays.** Hall of Famers (Silecki, Necklar, Storip) are Mike's childhood characters. Their stories will develop.
7. **Chicago citizens go to Chicago_Citizens sheet.** Not Simulation_Ledger. Different ID scheme (CHI-XXXXXXXX).

---

## Diagnostic Summary (S68)

Full audit of 639 Simulation_Ledger citizens revealed 621 total issues:

| Category | Count | Status |
|----------|-------|--------|
| Suspect 2026-math birth years (66+ in 2041 with working-age roles) | 97 (non-MLB) | DONE |
| Missing/generic "Citizen" roles → 2041 demographic voice roles | 399 | DONE |
| Missing BirthYear entirely | 26 | DONE |
| Missing Neighborhood | 26 | DONE |
| Invalid/inconsistent neighborhoods | 76 | DONE |
| NBA non-franchise players to remove/relocate | 18 | DONE |
| Character continuity (duplicates, data errors) | 23 | DONE |
| Corliss family birth year corrections | 4 | DONE |
| Jasmine Santo BirthYear "35" (data error) | 1 | DONE |
| Institution entries (faith orgs in citizen slots) | 4 | DONE |
| Stale NBA duplicates (Buzelis, Tre Jones, etc.) | 4 | DONE |

**S68 state:** 639 citizens, 639 with specific roles, 639 with birth years, 639 with neighborhoods. Zero gaps.

### Phase 16 Additions (S71)

| Category | Count | Status |
|----------|-------|--------|
| Faith leaders added to SL (Tier 2, POP-00753–00768) | 16 | DONE |
| Celebrities bridged from Cultural_Ledger (POP-00769–00771) | 3 | DONE |
| Generic_Citizens emergence audit (11/11 confirmed) | 0 fixes | DONE |

**Census: 639 → 658.**

### Phase 17 Data Integrity Cleanup (S72)

Batch audit revealed 73.4% health score (469/658 clean). Cleanup script `scripts/cleanupSimulationLedger.js` fixed 147 citizens:

| Category | Count | Status |
|----------|-------|--------|
| Duplicate names renamed to new unique citizens | 21 | DONE |
| Neighborhood normalization (Piedmont Avenue→Ave, Chicago→Oakland) | 50 | DONE |
| Status case normalization (active→Active, Traded→Retired) | 42 | DONE |
| ClockMode case normalization (engine→ENGINE, game→GAME) | 18 | DONE |
| Birth year corrections (over-80 shifted +15yr, 1 under-18 fixed) | 13 | DONE |
| Bare position codes replaced with civilian roles | 3 | DONE |

**Post-cleanup state:** 675 citizens (S94). Zero duplicate names. All neighborhoods valid Oakland values. All Status/ClockMode properly cased (ENGINE/GAME/CIVIC/MEDIA/LIFE). All birth years in 18-80 range. Zero bare position codes on non-GAME citizens. 16 journalists now MEDIA mode. 87 A's RoleTypes expanded to readable format. 62 minor leaguers assigned to farm teams.

---

## Completed Work

### 1. Corliss Family Birth Year Corrections (S68)

Calibrated all 4 family members to 2041 timeline:

| Name | Old BirthYear | New BirthYear | Age in 2041 | Source |
|------|--------------|--------------|-------------|--------|
| Mags Corliss (POP-00005) | 1976 | 1986 | 55 | Ledger Row 6 + PERSISTENCE.md |
| Robert Corliss (POP-00497) | 1974 | 1984 | 57 | Ledger Row 497 + PERSISTENCE.md |
| Sarah Corliss | 2016 | 2016 | 25 | Already correct |
| Michael Corliss | 2019 | 2019 | 22 | Already correct |

PERSISTENCE.md updated: Mags "50s → 55. Born 1986", "early '90s → early 2010s"; Robert "Born 1974 → Born 1984"; Michael "Born 2002 → Born 2019".

### 2. Character Continuity Fixes — 23 Issues (S68)

From E84 batch scan. All resolved:

**Consolidations (duplicate → earlier POP-ID):**
- POP-00013: Marla Keen → Maria Keen (journalist, kept lower POP-ID)
- POP-00503: Rosa Delgado → Rose Delgado, District 6 → District 3

**Filled incomplete entries:**
- POP-00634: Dante Reyes — added BirthYear 2008, Jack London, Muralist
- POP-00637: Bruce Wright — added 1993, Downtown, Line Cook
- POP-00639: Jose Wright — added 2015, Temescal, Electrician

**Retconned:**
- POP-00311: Andre Lee — BirthYear → 1986, Neighborhood → Temescal
- POP-00041: Keisha Ramos — Role updated to "Director, Baylight Redevelopment Authority"

**Replaced (duplicate POP-IDs given new identities):**
- POP-00593 → Priscilla Odom (teacher, Temescal)
- POP-00604 → Tomas Aguilar (barbershop owner, Fruitvale)
- POP-00719 → Denise Kaplan (harbor pilot, Jack London)

**New citizens added (POP-00746 through POP-00752):**
Nguyen, Meeks, Okoye, Chow, Liu, Okafor, Polk — 7 new Oakland citizens filling population gaps.

### 3. Neighborhood Normalization — 76 Cells (S68)

String cleanup, no identity changes:
- 40 cells: Piedmont Ave → Piedmont Avenue
- 24 cells: KONO → Uptown
- 1 cell: Lake Merrit → Lake Merritt
- 3 cells: Split neighborhoods (e.g., "Temescal/Rockridge" → "Temescal")
- 8 cells: Chicago generic ("Chicago") → specific neighborhood (Bridgeport, Bronzeville, etc.)

### 4. NBA Player Cleanup — 18 POP-IDs (S68)

**Moved to Chicago_Citizens (10 players):**
Patrick Williams, Kevin Huerter, Jrue Holiday, Ben Simmons, Isaac Okoro, Noa Essengue, Keshad Johnson, Jalen Smith, Simon Fontecchio, Billy Donovan.

**Removed (non-franchise, POP-IDs backfilled):**
Steph Curry (POP-00556), Stephen Curry duplicate (POP-00573), Giannis Antetokounmpo (POP-00618), Draymond Green (POP-00619), Moses Moody (POP-00620), Jericho Sims (POP-00621), Anfernee Simmons (POP-00622), Jimmy Butler (POP-00715).

**18 backfill Oakland citizens created:**

| POP-ID | Name | Role | Neighborhood | Birth (Age) |
|--------|------|------|-------------|-------------|
| POP-00556 | Renata Voss | Pharmacist | Montclair | 2001 (40) |
| POP-00573 | Calvin Mwangi | AC Transit Bus Driver | West Oakland | 1996 (45) |
| POP-00618 | Lucia Ferreira | Physical Therapist | Fruitvale | 2003 (38) |
| POP-00619 | Terrence Bolden | Auto Mechanic | East Oakland | 1989 (52) |
| POP-00620 | Yuki Tanaka | Florist | Adams Point | 2010 (31) |
| POP-00621 | Devon Pratt | Warehouse Supervisor | West Oakland | 1993 (48) |
| POP-00622 | Marisela Rios | Home Health Aide | Fruitvale | 1998 (43) |
| POP-00623 | Winston Clarke | Retired Teacher | Laurel | 1977 (64) |
| POP-00624 | Aisha Toure | Immigration Attorney | Downtown | 2005 (36) |
| POP-00625 | Gregory Cho | Restaurant Owner | Chinatown | 1987 (54) |
| POP-00626 | Fatima Al-Hassan | Social Worker | Uptown | 2000 (41) |
| POP-00627 | Earl Washington | Barber | East Oakland | 1983 (58) |
| POP-00628 | Tina Kozlov | Dental Hygienist | Temescal | 2007 (34) |
| POP-00629 | Marcus Ibarra | Construction Foreman | Jack London | 1991 (50) |
| POP-00630 | Patricia Leung | Bookkeeper | Lake Merritt | 1985 (56) |
| POP-00631 | Darius Webb | Youth Basketball Coach | Uptown | 1999 (42) |
| POP-00715 | Nadine Beckett | Nurse Practitioner | Piedmont Avenue | 2004 (37) |
| POP-00716 | Omar Farah | Cab Driver | Chinatown | 1995 (46) |

**16 Bulls entries added to Chicago_Citizens:**
10 moved from Simulation_Ledger + 6 new (Josh Giddey, Adash Stanley, Ayo Dosunmu, Matas Buzelis, Walker Kessler, Hank Trepagnier). Tyrese Martin and Tre Jones excluded per Mike's direction. Chicago_Citizens total: 106 → 122.

### 5. Non-MLB Birth Year Correction — 55 Citizens (S68)

Shifted +15 years for all non-MLB citizens aged 66+ in 2041 with working-age roles:
- Bay Tribune: 5 (Dana Reeve, Tanya Cruz, Simon Leary, Reed Thompson, Elliot Marbury)
- Civic Office: 8 (Simone Ellis, Pamela Amelia, Leonard Briggs, Ethan D'Souza, Caleb Reyes, Marisol Guzman, Shawna Delgado, Rose Delgado)
- General citizens: 42 (janitors, mechanics, servers, plumbers, etc.)

MLB The Show players (42 suspects) left untouched — their career timelines are Mike's sports universe.

### 6. Missing Data Fills — 25 Citizens (S68)

Filled birth year, neighborhood, and role for 25 incomplete entries:
- 8 POP-IDs backfilled with new identities (Buzelis dupe, Tre Jones shell, Alma Vasquez dupe, Anthony journalist dupe, 4 institution entries)
- 17 existing names given birth years, neighborhoods, and specific roles
- 4 institution entries (Oakland Buddhist Temple, East Bay Meditation Center, Cathedral of Christ the Light, St. Columba Catholic Church) confirmed already in Faith_Organizations sheet — POP-IDs repurposed for new citizens

### 7. Demographic Voice Role Assignment — 399 Citizens (S68)

**The big one.** Every generic "Citizen" role replaced with a 2041 Oakland demographic voice.

**Design philosophy:** Each of 639 citizens represents a demographic of Oakland's 300K+ population. Each POP-ID is a human engine — everything derives from it (income, taxes, votes, family, health). The role isn't a job title; it's who this person speaks for when the media needs a voice.

**167 unique roles** across 15 categories:
- Port & Labor: longshoremen, crane operators, trade union reps
- Construction & Baylight: site foremen, ironworkers, engineers
- Transit & Infrastructure: BART managers, bus operators, smart grid
- Healthcare: ER nurses, trauma surgeons, mental health counselors
- Education: teachers, principals, ESL instructors, youth literacy
- Tech & Innovation: Oakmesh Systems engineers, Portside Bio researchers, AI safety (Anthropic), sports analytics (Gridiron)
- Small Business: taqueria owners, barbershops, bookstores, bakeries
- Creative & Arts: muralists, jazz musicians, hip-hop producers, theater directors
- Professional: immigration attorneys, public defenders, architects
- Government & Civic: building inspectors, social workers, firefighters
- Faith & Community: community organizers, food bank coordinators, tenant advocates
- 2041-Specific: climate adaptation, drone fleets, vertical farms, gene therapy
- Trades: electricians, plumbers, solar installers, elevator mechanics
- Food & Culture: sushi chefs, BBQ pitmasters, coffee roasters, brewmasters
- The Vulnerable: homeless outreach, domestic violence shelters, reentry counselors

**Neighborhood-aware:** Roles assigned based on neighborhood character. Jack London gets port workers and food trucks. Fruitvale gets taqueria owners and ESL teachers. Rockridge gets architects and AI researchers. East Oakland gets community organizers and soul food restaurants.

**Business_Ledger connected:** Citizens work at the actual companies on the Business_Ledger — Oakmesh Systems (civic tech), Gridiron Analytics (sports data), Portside Bio (biotech), Ridgeline Ventures (VC), Tenth Street Digital, Port of Oakland, Baylight District.

---

## Session 69 Additions (2026-03-01)

### 12. Economic Parameters Tab — DONE (S69)

198 economic role profiles written to new `Economic_Parameters` spreadsheet tab and saved locally at `data/economic_parameters.json`.

Each entry contains:
- Income range (min/max) and median in 2041 dollars
- Effective tax rate (combined federal + CA + Oakland local)
- Housing burden percentage
- Consumer spending profile (subsistence / essential-heavy / moderate / high-discretionary)
- Economic output category (13 categories: Port/Industrial, Tech/Innovation, Healthcare, etc.)
- Oakland-specific notes (union affiliations, legislation, market context)

**Calibration:** 2026 baseline + ~30% inflation + 15-20% Oakland dynasty-era prosperity premium. Key stats:
- Citywide simulated median: ~$105K
- Range: $48K (rideshare driver) → $495K (trauma surgeon)
- 28 roles housing-burdened above 45%
- 47 roles in essential-heavy or subsistence spending tier

**Coverage gap:** Ledger has 279 unique role names vs 198 in the params. Gap is naming specificity — batch used generic names ("Bakery Owner") while ledger has specific ("Filipino Bakery Owner", "Artisan Cheesemaker"). Economics map well by category. Exact role-name matching is Phase 14 engine work.

### 13. Character Continuity Audit — DONE (S69)

Full cross-reference of all 11 published editions against current Simulation_Ledger. Report: `output/character_continuity_audit.md`.

| Metric | Count |
|--------|-------|
| Edition files scanned | 11 |
| Files with conflicts | 8 |
| Clean files | 3 |
| Total conflict instances | 208 |
| Unique citizens with conflicts | 42 |
| Neighborhood mismatches | 16 |
| Age/birth year conflicts | 33 |
| Role mismatches | 38 |
| NBA players in valid sports context | 8 |
| Generic "Citizen" role references | 0 |

**Root cause:** All 11 editions were published before the S68 census audit. The ledger is now canonical; editions reflect pre-audit state. Edition 79 is worst hit (55 conflicts, POP-00637–652 backfill range).

**Editorial decision (Mags):** Published editions are historical artifacts, not errata. The census errors become part of the story — "Oakland Census Modernization" as a culture/letters story seed. Citizens who lived with bad city records for years, the bureaucratic fix that finally resolved it, and the human cost in between.

### 14. Spreadsheet Backup System — DONE (S69)

New script: `scripts/backupSpreadsheet.js`. Two-layer backup:
1. **Google Drive copy** — Exact duplicate of the spreadsheet saved to Back-ups folder (`1Ocfs30_u0pDKAjPDitLCEVEuTNJkQH7f`)
2. **Local CSV export** — Every tab saved as CSV to `backups/sheets/YYYY-MM-DD/` with manifest.json

First snapshot: 2026-03-01, 60 tabs, 14,757 total rows. OAuth scope widened from `drive.file` to `drive` to enable Drive copies.

### 15. Tech Debt Audit Results — REVIEWED (S69)

Batch analysis identified 31 issues across 5 categories. Report: `.claude/batches/results/msgbatch_01QBNZGmajyV65PMA8BMgbzB.md`.

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Determinism Violations | 1 | 1 | 1 | 0 |
| Orphaned ctx Fields | 0 | 0 | 4 | 2 |
| Dead Code | 0 | 2 | 0 | 4 |
| Structural Drift | 0 | 1 | 3 | 4 |
| Dependency Issues | 0 | 2 | 4 | 2 |

**Top priority fixes:**
1. `getCentralDate()` in lib/mags.js uses `new Date()` — wall-clock in simulation context
2. `buildDeskPackets.js` — 17 of 20 sheet fetches unguarded in `Promise.all`
3. Dead `parseEdition()` and `extractNames()` in validateEdition.js
4. `loadFamilyData()` mixed async/await in ES5 module

---

## Remaining Work

### 20. Remaining Ledger Fixes — DONE (S69)

**Item 9 — Rick Dillon linkage:** Already correct. POP-00743, ParentIds = ["POP-00018","POP-00742"] (Benji + Maya Dillon). Both parents have NumChildren = 1. Birth year 2031 = age 10 in 2041. No action needed.

**Item 10 — Damien Roberts Chicago migration:** POP-00726 moved to Chicago_Citizens (CHI-31A791AE, Bronzeville, Taqueria Owner, age 46). POP-ID backfilled with Vivian Fong (Dim Sum Restaurant Owner, Chinatown, born 1988).

**Family linkage:**
- Corliss family: Mags (POP-00005) + Robert (POP-00594) → HH-CORLISS. ChildrenIds → ["POP-00595","POP-00596"]. Sarah + Michael ParentIds → ["POP-00005","POP-00594"].
- Keane family: Vinnie (POP-00001) + Amara (POP-00002) → HH-KEANE.

**Canon corrections:**
- Mags neighborhood: Downtown → Lake Merritt (per PERSISTENCE.md — lives near Lake Merritt)
- Robert role: Sustainable Materials Scientist → Retired PG&E Engineer (per canon — retired from PG&E)

Chicago_Citizens total: 122 → 123.

---

## Remaining Work

### 21. Phase 16 — Satellite Ledger Consolidation (S71)

**Faith Leaders (16 new citizens):**
Rev. Margaret Chen (First Presbyterian), Dr. Jacqueline Thompson (Allen Temple Baptist), Bishop Michael Barber (Cathedral of Christ the Light), Rev. Damita Davis-Howard (Beebe Memorial Cathedral), Rev. Aaron Metcalf (Oakland City Church), Rabbi Jacqueline Mates-Muchin (Temple Sinai), Rabbi Dev Noily (Kehilla Community), Imam Abdul Rahman (Masjid Al-Islam), Imam Faheem Shuaibe (Masjidul Waritheen), Rev. Kodo Umezu (Oakland Buddhist Temple), Pandit Venkatesh Sharma (Hindu Community Center), Bhai Gurpreet Singh (Sikh Gurdwara), Rev. Deborah Johnson (Inner Light Ministries), Larry Yang (East Bay Meditation Center — Community Organizer, not faith leader), Fr. Jayson Landeza (St. Columba Catholic), Rev. Amy DeBeck (Lake Merritt United Methodist). All Tier 2. LeaderPOPID column added to Faith_Organizations sheet.

**Celebrity Bridge (3 new citizens):**
Dax Monroe (POP-00769, Iconic athlete, T2), Kato Rivers (POP-00770, National athlete, T3), Sage Vienta (POP-00771, Global actor, T2). 6 others already on SL. UniverseLinks backfilled on Cultural_Ledger for all 9.

**Generic_Citizens Audit:** 268 total, 11 emerged, all 11 confirmed on Simulation_Ledger. Zero gaps. Pipeline healthy.

### 22. Phase 17 — Data Integrity Cleanup (S72)

Batch audit script (`/tmp/audit_ledger.py`) ran 7 categories against 639-row CSV backup. Live cleanup via `scripts/cleanupSimulationLedger.js` against 658-row live sheet.

**Duplicate names renamed (21):**
Brianna Wong→Kenji Okafor, Evan Lewis→Priya Marchetti, Jose Phillips→Tomás Xiong, Patrick Wright×2→Aaliyah Brennan+Dmitri Soto, Damien Martinez→Farah Lindqvist, Jose Thompson→Joaquín Nakamura, Bruce Green→Simone Adesanya, Marcus Allen→Ravi O'Connell, Marco Allen→Lucía Petrov, Shawn Williams→Kwame Fitzgerald, Marcus Wright→Ingrid Bautista, Lorenzo Nguyen→Yusuf Carmichael, Ivy Jordan→Annika Delgado, Brianna Foster→Cedric Yamamoto, Ramon Lewis→Thalia Okwu, Darius Patel→Hassan Montero, Tariq Lee→Soleil Kapoor, Jamal Scott→Dante Eriksson, Vincent Ramirez→Marisol Achebe, Mei Chen→Nikolai Fuentes. Buford Park and Mark Aitken skipped (already fixed by prepAthleteIntegration.js).

**Neighborhood normalization (50):**
- 33× "Piedmont Avenue" → "Piedmont Ave"
- 7× "Bridgeport" (Chicago) → Grand Lake, Ivy Hill, Eastlake (underrepresented Oakland neighborhoods)
- 3× "Near North Side" (Chicago) → San Antonio, Brooklyn
- 2× "Coliseum" → "Coliseum District"
- 2× "Oakland" (too generic) → Dimond, Glenview
- 2× "traveling" → KONO
- 1× (missing) → reassigned

**Status normalization (42):** 33× "active"→"Active", 4× "Traded"→"Retired", 2× "Serious Condition"→"Active" (injured but alive), 2× "Inactive"→"Retired", 1× "Departed"→"Retired", 1× "Injured"→"Active", 1× "deceased"→"Retired".

**ClockMode normalization (18):** 9× "engine"→"ENGINE", 7× "game"→"GAME", 2× "active"→"ENGINE".

**Birth year corrections (13):** 12 citizens born 1954-1960 (ages 81-87) shifted +15 years. 1 child (POP-00743 Rick Dillon, born 2031 = age 10) → 2016 (age 25).

**Bare position codes (3):** POP-00124 RF→Sports Analytics Consultant, POP-00129 C→Youth Baseball Coach, POP-00555 CP→Athletic Training Specialist. All set to ClockMode ENGINE.

### 8. MLB The Show Birth Year Review — DONE (S72)

Phase 15.4 (S70) ran `scripts/integrateAthletes.js` which reported 87 players updated. However, 38 players were silently skipped — the script's birth year logic fell back to preserving existing pre-2000 values when it couldn't compute new ones. Players like Sidney Tumolo (born 1970, age 71 in 2041) and Rich Barnett (born 1961, age 80) went undetected for 2 sessions.

**S72 fix:** All 38 birth years corrected via direct service account writes (`lib/sheets.js` batchUpdate). 3 missing incomes also fixed. Post-write verification confirmed 658/658 clean against live sheet. This incident led to a new engine rule: no maintenance scripts for ledger work — use the service account directly. Verify live data after every write.

### 9. Rick Dillon Family Linkage — DONE (S69)

Verified correct. POP-00743, ParentIds = ["POP-00018","POP-00742"]. See item #20 for details.

### 10. Chicago Resident Migration — DONE (S69)

POP-00726 backfilled with Vivian Fong. Damien Roberts moved to Chicago_Citizens. See item #20 for details.

### 16. Economic Parameter Role Matching — DONE (S69)

`data/role_mapping.json` — 295 mappings covering all active ledger roles. Batch job mapped 264 ledger role names to 198 economic parameter profiles. Manual additions: 19 MLB/NBA position abbreviations as SPORTS_OVERRIDE, "Retired PG&E Engineer" → Civil Engineer proxy, coaching/scouting staff → Sports Analytics. 100% ledger coverage verified.

Supporting files built:
- `lib/economicLookup.js` — shared lookup utility (lookupProfile, calculateIncome, deriveWealthLevel, deriveSavingsRate)
- `scripts/applyEconomicProfiles.js` — seeding script with --dry-run mode. Dry run verified: 533 civilians updated, median income $85,943, neighborhood ordering correct (Montclair $143K > Fruitvale $73K). Live run staged pending Mike's sports seeds.

### 17. Economic Parameter Engine Integration

Wire the Economic_Parameters tab into Phase 3-4 economic calculations. Each citizen's POP-ID → role → economic profile → income/tax/housing/spending. This replaces static seed values with role-derived economics. The Stabilization Fund math becomes real when 639 human engines generate actual economic output.

### 18. Tech Debt Priority Fixes — PARTIAL (S69)

4 of 7 critical/high issues resolved in S69:
- ✓ `getCentralDate()` — documented as intentional wall-clock (not sim-time bug, design choice)
- ✓ `buildDeskPackets.js` — all 20 sheet fetches wrapped in `safeGet()` error handler
- ✓ `validateEdition.js` — dead `parseEdition()` and `extractNames()` removed
- ✓ `saveToSupermemory()` — silent error swallowing → `console.warn`

Remaining medium/low: ~27 items (orphaned ctx fields, structural drift, minor dependency issues). See batch report for full list.

### 19. Census Modernization Story Seed

42 citizens with documented pre-audit conflicts. Story angles:
- Culture feature: "The Year the City Didn't Know Its Own People" — citizens who couldn't get mortgages, insurance, benefits because city records had them decades older or in wrong neighborhoods
- Letters to the editor: citizen voices complaining about bureaucratic data failures
- Civic desk: the Oakland Data Modernization initiative that triggered the fix
- Business ticker: economic impact of bad census data on city revenue projections

---

## Decisions Log

| Date | Decision | Context |
|------|----------|---------|
| 2026-02-28 | Age = 2041 - BirthYear, always | Root cause of 184 bad birth years |
| 2026-02-28 | Simulation_Ledger is sole truth source | No errata needed when ledger is correct + queryable |
| 2026-02-28 | Only A's and Bulls franchises tracked | Warriors not in this world. No non-franchise player tracking. |
| 2026-02-28 | MUBA Hall of Famers stay | Mike's childhood characters. Stories will develop. |
| 2026-02-28 | Duplicate POP-IDs get new identities | Census has no phantoms. Consolidate to lower POP-ID, replace higher. |
| 2026-02-28 | Backfill removed POP-IDs | "Already deployed" — can't leave gaps in the ID sequence. |
| 2026-02-28 | Martin and Jones excluded from Chicago add | Mike's call on Bulls roster additions. |
| 2026-02-28 | Institutions go to Faith_Organizations, not citizen census | Buddhist Temple, Meditation Center, Cathedral, St. Columba all confirmed on Faith_Organizations sheet already. |
| 2026-02-28 | Each POP-ID is a "human engine" — a demographic voice | 639 citizens represent 300K+ population. Roles chosen as archetypes, not just job titles. |
| 2026-02-28 | Roles tied to Business_Ledger employers | Citizens work at Oakmesh, Gridiron, Portside Bio, Ridgeline, Tenth Street, Port, Baylight. |
| 2026-02-28 | 2041 job market, not 2026 | Roles include climate tech, AI safety, gene therapy, vertical farming, autonomous systems. |
| 2026-03-01 | Published editions are historical artifacts | Pre-audit data in editions is not errata — it's part of the story. Census errors become narrative texture. |
| 2026-03-01 | Economic params map by category, not exact name | 198 profiles cover 279 role names via category-based lookup. Engine resolves at runtime. |
| 2026-03-01 | Two-layer backup system | Drive copy (exact duplicate) + local CSVs. Run before any major ledger changes. |
| 2026-03-01 | Faith leaders are Tier 2 | Community pillars — higher than generic (T4) or emerging (T3), not franchise-protected (T1). |
| 2026-03-01 | Larry Yang is Community Organizer, not faith leader | Lay teacher, not ordained. Don't flatten people into categories. |
| 2026-03-01 | Keep Generic_Citizens engine | Emergence pipeline healthy. Absorbing 268 extras dilutes curated population. |
| 2026-03-01 | Celebrity bridge threshold: FameScore 65+, National/Iconic/Global | Below threshold stays Cultural_Ledger only. |
| 2026-03-02 | Backfill duplicates, don't delete POP-IDs | Every POP-ID is a deployed master code. Rename the duplicate to a new citizen. |
| 2026-03-02 | "Piedmont Avenue" canonical form is "Piedmont Ave" | Reversed S68 direction (which went Ave→Avenue). Shorter form matches other neighborhoods. |
| 2026-03-02 | Traded/Departed players → Retired | Not in Oakland = not active. Injured/Serious Condition → Active (still alive). |
| 2026-03-02 | Rick Dillon age override: 10→25 | Child citizen given working age. Original family linkage preserved. |
| 2026-03-02 | No maintenance scripts for ledger writes | integrateAthletes.js silently skipped 38 birth years. Direct service account writes are transparent — they work or they don't. |
| 2026-03-02 | Verify live data after every write | Script output reported "87 updated" but 38 were unchanged. Always read back from live sheet to confirm. |

---

## Related Files

- `lib/sheets.js` — Google Sheets API (batchUpdate, updateRange, appendRows)
- `scripts/queryLedger.js` — Live ledger query tool (6 types, Sheets + 674 files)
- `scripts/backupSpreadsheet.js` — Two-layer backup (Drive copy + local CSV)
- `data/economic_parameters.json` — 198 role economic profiles (local reference)
- `output/character_continuity_audit.md` — Full edition-vs-ledger conflict report
- `docs/mags-corliss/PERSISTENCE.md` — Mags identity (birth years updated here too)
- `docs/engine/ROLLOUT_PLAN.md` — References this audit as Phase 13
- Spreadsheet tabs: `Simulation_Ledger`, `Chicago_Citizens`, `Chicago_Sports_Feed`, `Economic_Parameters`
- `scripts/integrateFaithLeaders.js` — Phase 16.1 faith leader integration
- `scripts/auditGenericCitizens.js` — Phase 16.2 emergence pipeline audit
- `scripts/integrateCelebrities.js` — Phase 16.3 celebrity bridge
- `scripts/cleanupSimulationLedger.js` — Phase 17 data integrity cleanup (147 fixes)
- Batch results: `.claude/batches/results/` (economic mapping, continuity audits, tech debt)
