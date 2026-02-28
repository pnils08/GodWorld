# Simulation_Ledger Data Integrity Audit

**Created:** Session 68 (2026-02-28)
**Status:** CORE AUDIT COMPLETE — 639/639 citizens fully populated
**Priority:** CRITICAL — All downstream ledgers depend on this data being correct
**Completion:** Session 68 (2026-02-28) — all citizens have role, birth year, and neighborhood
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

**Final state:** 639 citizens, 639 with specific roles, 639 with birth years, 639 with neighborhoods. Zero gaps.

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

## Remaining Work

### 8. MLB The Show Birth Year Review

42 MLB The Show players are aged 66+ in 2041 but hold active baseball positions (SP, RP, 2B, etc.). These are Mike's sports universe — their career timelines (active, retired, coaching) need his direction. Not a data error, but a design decision about how the A's roster ages in the 2041 timeline.

### 9. Rick Dillon Family Linkage

POP-ID for Rick Dillon (son of Benji Dillon POP-00018 and Maya Dillon). Birth year confirmed correct (age 10 in 2041 → born 2031). Verify ParentIds/ChildrenIds columns are linked.

### 10. Chicago Resident Migration

POP-00726: Damien Roberts (Line Cook, Bronzeville) is in Simulation_Ledger but has a Chicago neighborhood. Should move to Chicago_Citizens with POP-ID backfilled.

### 11. Economic Parameter Wiring

With every citizen now having a specific role, the engine can calculate realistic income distributions, tax bases, and economic indicators. Phase 3-4 economic parameters should pull from these roles instead of static seeds. This is what makes the Stabilization Fund math real — 639 human engines generating actual economic output.

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

---

## Related Files

- `lib/sheets.js` — Google Sheets API (batchUpdate, updateRange, appendRows)
- `scripts/queryLedger.js` — Live ledger query tool (6 types, Sheets + 674 files)
- `docs/mags-corliss/PERSISTENCE.md` — Mags identity (birth years updated here too)
- `docs/engine/ROLLOUT_PLAN.md` — References this audit as Phase 13
- Spreadsheet tabs: `Simulation_Ledger`, `Chicago_Citizens`, `Chicago_Sports_Feed`
