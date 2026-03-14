# Ledger Repair — Read This First

**DO NOT re-analyze the damage. DO NOT propose blind restore from backup. START FROM THE 5-STEP PLAN.**

Last Updated: 2026-03-14 | Session 94 | **RECOVERY COMPLETE**

---

## What Happened

In Session 68 (Feb 28, 2026), Phase 13 made mass changes to Simulation_Ledger via direct API calls (no script saved). Commit `6a2b05e`. Full documentation in `docs/engine/LEDGER_AUDIT.md` (git show 6a2b05e).

### The Damage (Simulation_Ledger)

1. **399 citizens with "Citizen" role were given narrative roles** (167 unique). These were meant as "demographic voices" — longshoremen, teachers, herbalists, sourdough bakers. Some may be fine. Some are garbage.
2. **55 non-MLB birth years shifted +15 years** — anyone 66+ with a working-age role. Only sports players should have been fixed. Civilians got wrongly aged. Kids became adults.
3. **18 NBA players removed, POP-IDs backfilled** with new Oakland citizens. This was INTENTIONAL — athletes don't belong on Simulation_Ledger. The new citizens at those POPIDs are legitimate.
4. **4 institution entries replaced with citizens** on their POP-IDs.
5. **113 POPID gaps** exist in the sequence 1-780 (667 rows, last ID POP-00780). These gaps were NOT in the backup either — they were created after the backup.
6. **Phase 15** (same session): 87 A's players got birth years corrected — this was CORRECT.
7. **Phase 15.5**: 63 citizens remapped to canonical neighborhoods — this changed neighborhoods.
8. **Phase 17** (Session 72, commit `43a5d41`): cleanupSimulationLedger.js ran 6 more fix categories including another round of birth year shifts and neighborhood normalization.

### LifeHistory_Log Contamination (Found S92, Fixed S93)

`editionIntake.js` had a function `parseDirectQuotes` that wrote to LifeHistory_Log. Fixed in v1.3 — writes removed.

- **121 intake rows** with "Quoted" tag — DELETED from practice sheet
- **774 rows** with wrong/empty names — FIXED via POPID→Name cross-reference
- Engine code was writing `''` for Name column — FIXED across 9 engine files (S93)
- Contamination started **February 8, 2026** — 5 weeks of bad writes

### Downstream Sheet Damage

- **Employment_Roster:** 152 fixes applied on practice sheet (1 name, 151 roles)
- **Civic_Office_Ledger:** 1 apostrophe fix applied (Ethan D'Souza). 1 remaining mismatch.
- **Citizen_Media_Usage:** 392 entries with unverifiable names (no POPID column)
- **Citizen_Usage_Intake:** Had no POPID column — fixed S94 (6-col format, 437/807 backfilled)

### Sheets That Are CLEAN (POPID-based, no name corruption)

- Household_Ledger (529 rows)
- Relationship_Bonds (209 rows)
- Initiative_Tracker, Domain_Tracker, Event_Arc_Ledger

### Cascade Damage

20 cycles of deterministic simulation ran on corrupted data. Career, Household, Neighborhood, Relationship, Civic, Education engines all used wrong roles, ages, and neighborhoods. LifeHistory accumulated events based on wrong identities.

---

## The Sources of Truth

**NEITHER the backup NOR the live sheet is the sole truth. Both contain correct AND incorrect data. Recovery requires reconciling ALL sources.**

### Backup Sheet
- **Sheet ID:** `1ZbCj6sYM4oEQGmfGetmhe6_l1UoisThK9a-d0y678qo`
- **Title:** "Copy of Simulation_Narrative - February 25, 11:01 PM"
- **Cycle:** 84 (World_Population timestamp 2/24/2026)
- **Citizens:** 630 (all have POPIDs)
- Has original citizen identities BEFORE corruption
- BUT is outdated: contains athletes that were intentionally removed, missing legitimate post-backup changes

### Live Sheet
- Has legitimate changes Mike made manually (~8 citizens, March 3/6/7)
- Has legitimate changes from Claude (T1 rewrites S88, civic officials, 37 new citizens)
- Has intentional athlete removals (e.g., Josh Giddey, Steph Curry POPIDs reused for new citizens)
- BUT also has corruption: wrong names, kids aged to adults, wrong neighborhoods

### Mara Vance Audits
- `docs/mara-vance/AUDIT_HISTORY.md` — institutional memory with canon corrections
- Mara audits every edition on claude.ai with ZERO ledger access
- She catches citizen errors every edition — names, roles, vote fabrications
- Her corrections are canon authority
- Canon Corrections Registry tracks what was fixed

### Published Editions
- `editions/cycle_pulse_edition_81.txt` through `_86.txt` plus supplementals
- Audited by Mara before publication
- Contain citizen details (name, age, neighborhood, occupation) in Names Index and article text

---

## The 5-Step Recovery Plan

**Practice on a NEW sheet first. Do NOT touch the live sheet until the practice is verified.**

Mike needs to create a blank Google Sheet called "RECOVERY_PRACTICE" and share it with `maravance@godworld-486407.iam.gserviceaccount.com` (editor access). Service account cannot create sheets.

### Step 1: Fix the intake code — DONE (S93)
Removed LifeHistory_Log writes from `editionIntake.js` v1.3. `parseDirectQuotes` still runs for dry-run visibility but no longer calls appendRows.

### Step 2: Clean LifeHistory_Log — DONE (S93, practice sheet)
- Deleted 121 intake-written rows (EventTag = "Quoted")
- Fixed 774 wrong/empty names using POPID→Name cross-reference from Simulation_Ledger

### Step 3: Fix Simulation_Ledger roles — DONE (S93, practice sheet)
- 124 Category 2 ENGINE citizens restored to backup roles (nonsensical job swaps)
- 14 additional role fixes from edition verification (editions 78-86)
- 3 final role fixes (Bruce Lee, Xavier Campbell, Ronald Scott)
- T1/T2/GAME/CIVIC citizens properly preserved — not reverted
- 21 neighborhoods corrected from edition data
- 8 Oakland citizens from editions added (POP-00781 through POP-00788)

### Step 4: Fix downstream sheets — DONE (S93, practice sheet)
- Employment_Roster: 152 fixes (1 name, 151 roles synced to corrected ledger)
- Education vs career: 256 EducationLevel values corrected based on RoleType
- Career vs salary: 29 Income values corrected for misaligned roles

### Step 5: Audit every edition — DONE (S93)
Cross-referenced 117 citizens from editions 78-86 against practice ledger.
- 52 exact matches
- 1 editorial inconsistency: Dante Nelson — Downtown (C79-84) vs West Oakland (C86), needs editorial call
- 8 Oakland citizens not on ledger → added (Step 3)
- 3 Chicago citizens correctly excluded (don't belong on Simulation_Ledger)

### Step 6: Fix engine code — DONE (S93)
LifeHistory_Log appendRow calls across 9 engine files were writing `''` for Name and Neighborhood columns. Fixed all 12 calls to write `First Last` and neighborhood. Files changed:
- generateNamedCitizensEvents.js
- generateCitizensEvents.js
- generateCivicModeEvents.js
- runEducationEngine.js
- runNeighborhoodEngine.js
- runRelationshipEngine.js
- runHouseholdEngine.js
- runCivicRoleEngine.js
- checkForPromotions.js
- processAdvancementIntake.js

---

## What Does NOT Work (Rejected Approaches)

- **Blind restore from backup** — REJECTED 8+ times. Overwrites legitimate changes. The backup is NOT the sole truth.
- **Backup as sole truth** — WRONG. Backup is outdated. Live has legitimate changes.
- **Live sheet as sole truth** — WRONG. Live has corruption mixed with legitimate changes.
- **Editions as sole truth** — WRONG. Editions were built on corrupted data. But Mara's corrections on them provide canon data points.
- **Any single source as sole truth** — WRONG. All sources together, none alone.
- **Citizen-by-citizen manual review** — impossible for Mike who is not technical
- **LifeHistory wipe** — breaks career continuity

---

## What's Legitimate After the Backup

Mike changed approximately 8 citizens manually. He does not remember which ones.

Mike's edits to the Google Sheet were on these dates (from Drive revision history):
- March 3 (revisions 22563, 22611, 22612) — pnils08
- March 6 (revisions 22642, 22791, 22890) — pnils08
- March 7 (revision 22912) — pnils08

Claude/Mags also made some CORRECT changes after the backup:
- Session 88: T1 citizen rewrites (Robert, Sarah, Michael Corliss; athletes Vinnie Keane, Mark Aitken, Isley Kelley; Lucia Polito; journalists)
- Civic officials given proper roles and CIVIC clock modes
- 37 new citizens added (POP-00634 onward, not in backup)
- 18 NBA players intentionally removed from ledger, POPIDs reused for new citizens

Google Sheets API export does NOT support revision-specific downloads (tested — all revisions return current data). The version history is only viewable in the browser UI by Mike.

---

## Recovery Data

- `output/RECOVERY_REPORT.json` — Full damage report (S92): every damaged POPID with live vs backup values, LifeHistory_Log contamination counts, Employment_Roster mismatches, categorized damage
- `output/batch-reviews/ledger_repair_plan.md` — Category 2 citizen list (140 citizens with role swaps)

## Recovery Status: COMPLETE (S94, 2026-03-14)

**All fixes applied to LIVE sheet.** Practice sheet verified, then replayed on live.

### What was applied to live:
- **Simulation_Ledger:** 428 cell updates (248 EducationLevel, 137 RoleType, 21 Income, 20 Neighborhood, 1 Tier, 1 Status) + 8 new citizens appended (POP-00781–00788)
- **LifeHistory_Log:** 774 names fixed, 121 Quoted intake rows deleted (3,288 → 3,167 rows)
- **Employment_Roster:** 152 fixes (151 RoleType, 1 CitizenName)
- **Civic_Office_Ledger:** 1 apostrophe fix (Ethan D'Souza)
- **Additional fixes found during verification:** Anthony Raines Tier "Oakland" → 2, Eric Taveras Status "22500000" → Active, 8 new citizens Tier "T4" → 4
- **Dante Nelson:** Downtown (editorial call, 5 editions vs 1)

### Live sheet post-recovery stats:
- 675 citizens, 0 missing names, 0 "Citizen" roles
- Tiers: 17 T1, 55 T2, 217 T3, 386 T4 (all numeric)
- Statuses: 660 Active, 13 Retired, 2 medical
- EducationLevel + Income: 100% populated
- LifeHistory_Log: 0 empty names, 0 Quoted rows

### Practice sheet (reference):
**ID:** `1EX3lBhcqnqyqXhbcjoNLLbjA2sx7gsENEVhEZdOmTN4` — keep as a pre-recovery snapshot.

### Post-recovery pipeline fixes (S94):
- **buildDeskPackets.js:** `getInterviewCandidates()` was sourcing from Generic_Citizens (274 rows, 208 not on SL). Rewritten to source from Simulation_Ledger directly. ClockMode=ENGINE filter prevents athletes/officials from appearing as interview subjects. `buildNeighborhoodCitizenIndex()` field names fixed (was using `c.Name`, `c.POP_ID`, `c.Occupation` — none of which exist on SL objects). `eventCitizenLinks` went from 0 results to working.
- **editionIntake.js v1.4:** Citizen_Usage_Intake gains POPID column (6 cols). Names resolved from SL at write time. 807 existing rows backfilled (437 matched).
- **All 6 desk skill files:** Citizen drift protection rule added — agents must never change citizen attributes to fit a narrative.
- **Generic_Citizens sheet:** 274 rows, 208 not on SL. Stale 2026-era occupations. Was being used as interview candidate pool, creating split-brain `occupation`/`roleType` conflicts in desk packets. No longer used for candidate selection. Sheet retained for emergence pipeline only.
- **Sports universe RoleTypes (S94):** 87 A's players expanded from bare position abbreviations (SP, 2B) to "Position, Team" format. 62 T3 minor leaguers assigned to farm teams (Las Vegas Aviators AAA, Midland RockHounds AA, Stockton Ports A). 16 Bay Tribune journalists migrated GAME→MEDIA clock mode.

### Process for future major sheet upgrades:
1. Copy live sheet → practice sheet
2. Develop and test all fixes on practice
3. Verify practice sheet is clean
4. Replay specific fixes on live (not tab overwrite)
5. Verify live after applying

## Simulation_Ledger Full Column Reference

**675 citizens, 45 columns (A–AS).** Updated S94.

| Col | # | Header | Notes |
|-----|---|--------|-------|
| A | 1 | POPID | Unique ID (POP-00001 format) |
| B | 2 | First | First name |
| C | 3 | Middle | Rarely populated |
| D | 4 | Last | Last name |
| E | 5 | OriginGame | Source game/integration |
| F | 6 | UNI (y/n) | Sports universe flag |
| G | 7 | MED (y/n) | Media flag |
| H | 8 | CIV (y/n) | Civic flag |
| I | 9 | ClockMode | ENGINE / GAME / CIVIC / MEDIA / LIFE |
| J | 10 | Tier | 1 (protected) through 4 (generic) |
| K | 11 | RoleType | Role description (e.g. "Shortstop, Oakland A's") |
| L | 12 | Status | Active, Retired, Traded, etc. |
| M | 13 | BirthYear | Sim birth year |
| N | 14 | OrginCity | Origin city (misspelled, legacy) |
| O | 15 | LifeHistory | Full life history text (heaviest column) |
| P | 16 | CreatedAt | Creation timestamp |
| Q | 17 | Last Updated | Last update timestamp |
| R | 18 | TraitProfile | Personality traits JSON |
| S | 19 | UsageCount | Media usage count |
| T | 20 | Neighborhood | Oakland neighborhood |
| U | 21 | HouseholdId | Household grouping |
| V | 22 | MaritalStatus | Married, Single, etc. |
| W | 23 | NumChildren | Number of children |
| X | 24 | ParentIds | Parent POPIDs |
| Y | 25 | ChildrenIds | Children POPIDs |
| Z | 26 | WealthLevel | Wealth tier |
| AA | 27 | Income | Salary value |
| AB | 28 | InheritanceReceived | Inheritance flag |
| AC | 29 | NetWorth | Net worth |
| AD | 30 | SavingsRate | Savings rate |
| AE | 31 | DebtLevel | Debt level |
| AF | 32 | EducationLevel | hs-diploma, bachelors, masters, doctorate, trade-cert, associates |
| AG | 33 | SchoolQuality | School quality rating |
| AH | 34 | CareerStage | Career stage |
| AI | 35 | YearsInCareer | Years in current career |
| AJ | 36 | CareerMobility | Mobility score |
| AK | 37 | LastPromotionCycle | Last promotion cycle |
| AL | 38 | DisplacementRisk | Economic displacement risk |
| AM | 39 | MigrationIntent | Migration intent flag |
| AN | 40 | MigrationReason | Why they'd migrate |
| AO | 41 | MigrationDestination | Where they'd go |
| AP | 42 | MigratedCycle | Cycle they migrated |
| AQ | 43 | ReturnedCycle | Cycle they returned |
| AR | 44 | EconomicProfileKey | Links to economic profile |
| AS | 45 | EmployerBizId | Links to Business_Ledger |
