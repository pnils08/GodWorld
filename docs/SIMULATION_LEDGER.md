# Simulation_Ledger — Citizen Architecture Guide

**Tab:** `Simulation_Ledger` on GodWorld spreadsheet
**Citizens:** 675 | **Columns:** 46 (A–AT) | **Sim Year:** 2041
**Age rule:** Age = 2041 - BirthYear. Always.

This is the single source of truth for every simulated person. Not PERSISTENCE.md, not desk packets, not articles. The ledger.

Last audited: Session 105 (2026-03-20) — live data verified.

---

## Population Structure

The SL holds ALL simulated people, not just city citizens. ClockMode determines who they are and how the engine processes them.

| ClockMode | Count | Who they are | Engine processing | Roster Tab |
|-----------|-------|-------------|-------------------|------------|
| **ENGINE** | 509 | Oakland city citizens | Full lifecycle — career, household, education, neighborhood, relationships, civic, bonds | — |
| **GAME** | 91 | Oakland A's players and staff | Game-mode micro events only. No career/household/education engines. | `As_Roster` |
| **CIVIC** | 46 | Government officials, council | Civic-mode events. Council votes, initiative processing. | — |
| **MEDIA** | 29 | Bay Tribune journalists | Media-mode events. 7 role-specific pools (editor, columnist, reporter, etc.) | `Bay_Tribune_Oakland` |

**Total: 675.** No LIFE-mode citizens remain on the live sheet (S105 audit).

### GAME Mode Breakdown

| Level | Count | Teams |
|-------|-------|-------|
| MLB | 31 | Oakland A's |
| AAA | 19 | Las Vegas Aviators |
| AA | 20 | Midland RockHounds |
| A | 21 | Stockton Ports |

### Tier System

| Tier | Count | Protection | Who |
|------|-------|-----------|-----|
| **T1** | 17 | Protected — never delete, never change attributes to fit narrative | Dynasty core (Keane, Aitken, Dillon, Davis, Horn, Kelley), Mags, key journalists, Lucia Polito |
| **T2** | 58 | Important — careful with changes | Named characters, faith leaders, celebrities, key civic officials |
| **T3** | 214 | Standard | Named citizens with specific roles, minor league players |
| **T4** | 386 | Generic — can be modified or replaced | Demographic voice citizens from S68 census |

### Status

| Status | Count |
|--------|-------|
| Active | 664 |
| Retired | 9 |
| Recovering | 2 |

---

## How Citizens Enter the System

| Path | Who | Process |
|------|-----|---------|
| **Engine emergence** | T4 citizens | `generateGenericCitizens_()` creates new T4s in Generic_Citizens. At 3+ media mentions, they promote to SL. |
| **Edition intake** | Citizens named in published editions | `editionIntake.js` parses editions → writes to intake tabs. **CURRENTLY BROKEN** — writes to wrong tab names. |
| **Manual addition** | Named characters, athletes, faith leaders | Scripts like `integrateAthletes.js`, `integrateFaithLeaders.js`, `integrateCelebrities.js`, or direct API writes during maintenance. |
| **Mike** | Athletes from game sessions | Added to SL or As_Roster manually from MLB The Show / NBA 2K data. |

---

## Engine Processing by ClockMode

### ENGINE Mode (509 citizens)

Full lifecycle processing in Phase 5:

| Engine | What it does |
|--------|-------------|
| `runRelationshipEngine_()` | Alliance, rivalry, mentorship bonds |
| `runNeighborhoodEngine_()` | Neighborhood events, migration pressure |
| `runCareerEngine_()` | Career transitions, promotions, layoffs. Updates EmployerBizId. |
| `runEducationEngine_()` | Education level progression |
| `runHouseholdEngine_()` | Household formation, dissolution |
| `runCivicRoleEngine_()` | Civic engagement (for CIV-flagged only, but flags currently empty) |
| `runGenerationalEngine_()` | Generational wealth, inheritance |
| `runYouthEngine_()` | Youth-specific events (age-gated) |
| `generateCitizensEvents_()` | Rich life event pipeline |
| `checkForPromotions_()` | Career promotions |
| `processHouseholdFormation_()` | Marriage, household creation |
| `processGenerationalWealth_()` | Wealth accumulation |
| `processEducationCareer_()` | Education-career link |
| `processGentrification_()` | Displacement risk |
| `processMigrationTracking_()` | Migration intent and movement |

### GAME Mode (91 citizens)

Minimal processing — life events from games, not from lifecycle engines:

| Engine | What it does |
|--------|-------------|
| `generateGameModeMicroEvents_()` | 7 archetype-specific event pools based on TraitProfile. Birth, trade, injury, milestone events. |
| `buildEveningFamous_()` | Tier 1-2 players appear as celebrity sightings in evening content |

GAME citizens do NOT get career transitions, household formation, education, or neighborhood processing. Their sports data lives on `As_Roster`, not the SL.

### CIVIC Mode (46 citizens)

Council and government processing:

| Engine | What it does |
|--------|-------------|
| `generateCivicModeEvents_()` | Council hearings, committee actions, health events for recovering officials |
| `runCivicElections_()` | Council election logic |
| `runCivicInitiativeEngine_()` | Initiative votes and implementation |

### MEDIA Mode (29 citizens)

Tribune journalist events:

| Engine | What it does |
|--------|-------------|
| `generateMediaModeEvents_()` | 7 role-specific pools: editor, columnist, reporter, podcast-host, photographer, analyst, media-staff. Base 20% chance, T1 +10%, T2 +5%, cap 45%. Context-aware (reads civic load, sentiment, crime, weather, sports season, cultural activity). |

---

## Column Reference (A–AT) — Full Data Flow

Every column is a data point in someone's life. This maps who writes each column, who reads it, what format it expects, and what valid values look like.

### Identity (A–E)

| Col | # | Header | Valid Values | Writers | Readers |
|-----|---|--------|-------------|---------|---------|
| A | 1 | POPID | `POP-00001` format. Unique. Never reuse. | processIntakeV3, integration scripts | Universal key — everything reads this |
| B | 2 | First | Text | processIntakeV3, integration scripts | All event generators, buildDeskPackets, display |
| C | 3 | Middle | Text (rarely populated) | — | — |
| D | 4 | Last | Text | processIntakeV3, integration scripts | All event generators, buildDeskPackets, display |
| E | 5 | OriginGame | Text (source game/integration) | Integration scripts | — |

### Classification (F–J)

| Col | # | Header | Valid Values | Writers | Readers |
|-----|---|--------|-------------|---------|---------|
| F | 6 | UNI (y/n) | Yes/yes/No/no/n | Integration scripts | **BUG:** Engine checks `=== "y"`, never matches actual values. See Flag State section. |
| G | 7 | MED (y/n) | Yes/yes/No/no/n | Integration scripts | Same bug. |
| H | 8 | CIV (y/n) | Yes/yes/No/no/n | Integration scripts | Same bug. |
| I | 9 | ClockMode | ENGINE / GAME / CIVIC / MEDIA | Integration scripts, cleanup | Event generators (mode gates), lifecycle engines, buildDeskPackets |
| J | 10 | Tier | 1-4 (integer) | processIntakeV3, integration scripts | Event generators (T1 +10% chance), buildDeskPackets, prioritizeEvents |

### Core State (K–N)

| Col | # | Header | Valid Values | Writers | Readers |
|-----|---|--------|-------------|---------|---------|
| K | 11 | RoleType | Text. ENGINE: "Carpenter". GAME: "Shortstop, Oakland A's" | runCareerEngine (transitions), integration scripts | buildDeskPackets, civic engines, economicLookup, linkCitizensToEmployers |
| L | 12 | Status | Active / Retired / Recovering | runCareerEngine, civic engines, integration scripts | All event generators (skip non-Active), buildDeskPackets |
| M | 13 | BirthYear | 4-digit year. Age = 2041 - BirthYear. | Integration scripts, cleanup | educationCareerEngine, householdFormation, youthEngine (age gates), buildDeskPackets |
| N | 14 | OrginCity | Text (legacy misspelled column name) | — | — |

### Life Data (O–S)

| Col | # | Header | Valid Values | Writers | Readers |
|-----|---|--------|-------------|---------|---------|
| O | 15 | LifeHistory | Long text — accumulated life events | All event generators (append each cycle), compressLifeHistory | buildDeskPackets, queryLedger, citizenContextBuilder, enrichCitizenProfiles |
| P | 16 | CreatedAt | ISO timestamp | processIntakeV3 | — |
| Q | 17 | Last Updated | ISO timestamp | Engine orchestrator | — |
| R | 18 | TraitProfile | `Archetype:X\|tone:Y\|Motifs:Z\|Source:W` | integrateAthletes (from TrueSource quirks/position) | generateGameModeMicroEvents (archetype event pools), buildDeskPackets |
| S | 19 | UsageCount | Integer | processIntakeV3, processAdvancementIntake | — |

### Location & Household (T–Y)

| Col | # | Header | Valid Values | Writers | Readers |
|-----|---|--------|-------------|---------|---------|
| T | 20 | Neighborhood | One of 17 Oakland neighborhoods | runNeighborhoodEngine, migrationTrackingEngine, processIntakeV3 | Everything location-aware: buildDeskPackets, aggregateNeighborhoodEconomics, civic engines, gentrification |
| U | 21 | HouseholdId | `HH-XXXX-XXX` format | householdFormationEngine, seedHouseholds | generationalWealthEngine, migrationTrackingEngine, queryFamily |
| V | 22 | MaritalStatus | Single / Married / Divorced / Widowed | householdFormationEngine | buildInitiativePackets |
| W | 23 | NumChildren | Integer | householdFormationEngine | — |
| X | 24 | ParentIds | JSON array: `["POP-00005","POP-00594"]` | Manual/script | — |
| Y | 25 | ChildrenIds | JSON array: `["POP-00595","POP-00596"]` | Manual/script | — |

### Economics (Z–AE)

| Col | # | Header | Valid Values | Writers | Readers |
|-----|---|--------|-------------|---------|---------|
| Z | 26 | WealthLevel | 0-10 integer | generationalWealthEngine, integrateAthletes, applyEconomicProfiles | seedHouseholds |
| AA | 27 | Income | Dollar amount (integer) | runCareerEngine (+6-12% promotion, -12-20% layoff), applyEconomicProfiles, integrateAthletes | aggregateNeighborhoodEconomics, buildDeskPackets, householdFormation, gentrification, migrationTracking |
| AB | 28 | InheritanceReceived | Boolean flag | generationalWealthEngine | — |
| AC | 29 | NetWorth | Dollar amount | generationalWealthEngine | — |
| AD | 30 | SavingsRate | Percentage (decimal) | generationalWealthEngine, applyEconomicProfiles | — |
| AE | 31 | DebtLevel | Dollar amount | generationalWealthEngine | — |

### Education & Career (AF–AK)

| Col | # | Header | Valid Values | Writers | Readers |
|-----|---|--------|-------------|---------|---------|
| AF | 32 | EducationLevel | hs-diploma / bachelors / masters / doctorate / trade-cert / associates | educationCareerEngine | buildDeskPackets, migrationTrackingEngine |
| AG | 33 | SchoolQuality | Numeric rating | educationCareerEngine | — |
| AH | 34 | CareerStage | entry / mid / senior / retired | educationCareerEngine | queryFamily |
| AI | 35 | YearsInCareer | Integer | educationCareerEngine | — |
| AJ | 36 | CareerMobility | Numeric score | educationCareerEngine | — |
| AK | 37 | LastPromotionCycle | Cycle number (integer) | educationCareerEngine | — |

### Migration (AL–AQ)

| Col | # | Header | Valid Values | Writers | Readers |
|-----|---|--------|-------------|---------|---------|
| AL | 38 | DisplacementRisk | Numeric risk score | migrationTrackingEngine | buildCivicVoicePackets, buildInitiativePackets |
| AM | 39 | MigrationIntent | Boolean flag | migrationTrackingEngine | buildCivicVoicePackets, buildInitiativePackets |
| AN | 40 | MigrationReason | Text | migrationTrackingEngine | — |
| AO | 41 | MigrationDestination | Location text | migrationTrackingEngine | — |
| AP | 42 | MigratedCycle | Cycle number | migrationTrackingEngine | — |
| AQ | 43 | ReturnedCycle | Cycle number | migrationTrackingEngine | — |

### Economic Links (AR–AT)

| Col | # | Header | Valid Values | Writers | Readers |
|-----|---|--------|-------------|---------|---------|
| AR | 44 | EconomicProfileKey | Role key → Economic_Parameters tab | applyEconomicProfiles, runCareerEngine (on transitions) | generationalWealthEngine, aggregateNeighborhoodEconomics, linkCitizensToEmployers |
| AS | 45 | EmployerBizId | `BIZ-00001` format → Business_Ledger | runCareerEngine (clear on layoff, set on transition), linkCitizensToEmployers | buildDeskPackets |
| AT | 46 | CitizenBio | 1-2 sentence stable narrative identity. Survives LifeHistory compaction. | applyCitizenBios (one-time, 17 T2 citizens so far) | — |

---

## Flag State — FIXED (S106)

The UNI, MED, and CIV columns contain "Yes"/"yes"/"No"/"no"/"n" values. The engine previously checked `=== "y"` which never matched. **Fixed S106:** 9 engine files updated to `.toLowerCase().startsWith("y")`. 3 files already had correct checks. Deployed to GAS.

**Flag values (live data):**
- UNI=Yes/yes: 116 citizens (A's players + staff)
- MED=Yes/yes: 41 citizens (Tribune journalists)
- CIV=Yes/yes: 72 citizens (civic officials)

**Skip gates now fire correctly.** GAME-mode players will be excluded from career, household, education, neighborhood, and relationship engines on the next cycle run.

---

## Key Families

| Family | Members | Household |
|--------|---------|-----------|
| **Corliss** | Mags (POP-00005), Robert (POP-00594), Sarah (POP-00595), Michael (POP-00596) | HH-0084-001 (Mags+Robert), HH-0084-396 (Sarah), HH-0084-397 (Michael) |
| **Keane** | Vinnie (POP-00001), Amara (POP-00002) | HH-KEANE |
| **Dillon** | Benji (POP-00018), Maya (POP-00742), Rick Jr. (POP-00743) | — |

---

## 17 Oakland Neighborhoods

Adams Point, Brooklyn, Chinatown, Coliseum District, Downtown, East Oakland, Fruitvale, Grand Lake, Ivy Hill, Jack London, KONO, Lake Merritt, Laurel, Montclair, Piedmont Ave, Rockridge, Temescal, West Oakland

---

## Related Docs

| Doc | What it covers |
|-----|---------------|
| `docs/engine/LEDGER_AUDIT.md` | Full audit history (S68-S72), decisions, census details |
| `docs/engine/LEDGER_REPAIR.md` | S92-S94 corruption recovery, 5-step plan, post-recovery fixes |
| `docs/SPREADSHEET.md` | All 65 sheet tabs including SL context |
| `docs/engine/ENGINE_MAP.md` | Every engine function in execution order |
| `scripts/queryFamily.js` | Quick family check at boot |
| `scripts/queryLedger.js` | 6 query types against SL + editions |
| `scripts/buildMaraReference.js` | Generates citizen roster from SL for Mara |
