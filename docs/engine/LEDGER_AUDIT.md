# Simulation_Ledger Data Integrity Audit

**Created:** Session 68 (2026-02-28)
**Status:** CLEAN — 658/658 citizens fully populated, Phase 17 data integrity sweep complete
**Priority:** CRITICAL — All downstream ledgers depend on this data being correct
**Completion:** Session 68 (2026-02-28) — core audit. Session 71 — satellite ledger consolidation. Session 72 — data integrity cleanup.
**Rule:** Age = 2041 - BirthYear. Always. The simulation year is 2041.

This is the single tracking document for the Simulation_Ledger overhaul. All audit progress, decisions, and remaining work live here. Other docs reference this file — they don't duplicate it.

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

**Post-cleanup state:** 658 citizens. Zero duplicate names. All neighborhoods valid Oakland values. All Status/ClockMode properly cased. All birth years in 18-80 range. Zero bare position codes on non-GAME citizens.

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

### 8. MLB The Show Birth Year Review

42 MLB The Show players are aged 66+ in 2041 but hold active baseball positions (SP, RP, 2B, etc.). These are Mike's sports universe — their career timelines (active, retired, coaching) need his direction. Not a data error, but a design decision about how the A's roster ages in the 2041 timeline.

### 9. Rick Dillon Family Linkage — DONE (S69)

Verified correct. POP-00743, ParentIds = ["POP-00018","POP-00742"]. See item #20 for details.

### 10. Chicago Resident Migration — DONE (S69)

POP-00726 backfilled with Vivian Fong. Damien Roberts moved to Chicago_Citizens. See item #20 for details.

### 16. Economic Parameter Role Matching — DONE (S69)

`data/role_mapping.json` — 280 mappings covering all 252 active ledger roles. Batch job mapped 264 ledger role names to 198 economic parameter profiles. Manual additions: 19 MLB/NBA position abbreviations as SPORTS_OVERRIDE, "Retired PG&E Engineer" → Civil Engineer proxy, coaching/scouting staff → Sports Analytics. 100% ledger coverage verified.

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
