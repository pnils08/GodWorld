# Simulation_Ledger — Citizen Architecture Guide

**Tab:** `Simulation_Ledger` on GodWorld spreadsheet
**Simulation_Ledger rows:** 922 (S282 live count) | **Columns:** 52 (A–AZ; StatusStartCycle AY + HealthCause AZ added S312 engine.52 — activated dormant health-lifecycle wiring in `generationalEventsEngine.js`, which reads both by header name; added to prod AND sandbox; MemoryRegisters added at AX S282 — seams plan B1+B3 substrate, DialState-pattern JSON `{"biases":[...],"unlived":[...]}`, written ONLY by the Phase-9 compressor fold; `.biases` LIVE-in-code S283 Task 6 (bias-intent drain — cap 5, asymmetric reinforce/challenge), `.unlived` LIVE-in-code S283 Task 8 (branch-event capture at fold — cap 3); both clasp-deploy pending; SMPageId at AW S262; DialState at AV S256, engine.31) | **Sim Year:** 2041
**Age rule:** Age = 2041 - BirthYear. Always.

This is the single source of truth for every simulated person in the main ledger. Other ledgers (Generic_Citizens, Cultural_Ledger, Business_Ledger, Faith_Organizations, Chicago_Citizens) hold additional populations — total world population is **1,200+** across all ledgers combined.

**Canonical column definitions:** `schemas/SCHEMA_HEADERS.md` under `## Simulation_Ledger` — auto-generated header list, refreshed via Apps Script `exportAndPushToGitHub`. Live sheet is **52 columns** as of S312 — the A–AZ table below covers all 52, including AU (Gender, confirmed S146), AV (DialState, added S256 — engine.31 per-citizen 8-dial JSON machine state; TraitProfile col R is the derived face), AW (SMPageId, added S262 — citizen-loop Phase 2 per-citizen Supermemory-page pointer; lazy-filled, blank until a citizen is first woken), AX (MemoryRegisters, added S282 — persistence-seams B1 bias ledger + B3 unlived register, one shared DialState-pattern JSON cell `{"biases":[...],"unlived":[...]}`; additive fields, defensive parse, never wiped; sole writer is the Phase-9 compressor fold — `.biases` drain LIVE-in-code S283 seams Task 6 (`utilities/compressLifeHistory.js` `foldBiasIntents_`, fed by `S.biasIntents` from the `generateCitizensEvents.js` bias-lite pool), `.unlived` capture LIVE-in-code S283 Task 8 (branch-tagged events leaving the raw-20 window at `foldAgedOutEntries_`, cap 3, actual-event-only per B3 derivation rule); both clasp-deploy pending), AY (StatusStartCycle, added S312 engine.52 — cycle a health status was entered; drives duration brackets/forced resolution in `processHealthLifecycle_` and the career income-hit timing) and AZ (HealthCause, added S312 engine.52 — filled by the Health_Cause_Queue operator loop, cited on Hospital_Ledger rows) — folded into §Column Reference's new `### Wake & Health (AU–AZ)` subsection at S321. SCHEMA_HEADERS reports 52 (regenerated S312). When the sheet drifts from this doc, SCHEMA_HEADERS is ground truth. *(Phase 41.6 backlink, S156.)*

**S256 engine.31/.32 live deploy notes:** LifeHistory (col O) **cleared** for all 904 citizens — full history (4051 entries) archived to `LifeHistory_Archive` (rows 567–4617, schema Timestamp/POPID/Name/EventTag/EventText/Neighborhood/Cycle). DialState seeded via dampened back-date fold (`scripts/backdateCitizenDials.js`). Col O now accumulates fresh entries per cycle; live fold-on-trim compressor (engine.32) folds + archives on overflow. Citizen-card milestones read archive + O (`scripts/buildCitizenCards.js`).

**Authoritative current-state pointer:** `docs/engine/archive/LEDGER_AUDIT.md` — refreshed via `scripts/auditSimulationLedger.js` (engine-sheet's lane). Last refresh S234 (captures S232 canon.3 T9 backfill +22 rows + NEW pending-Status drift + lowercase 'active' regression). Headline counts in this doc are approximate; LEDGER_AUDIT is ground truth for tier/status/POPID-gap distributions.

Last audited: Session 250 (2026-06-01, real-time refresh via `auditSimulationLedger.js`) — total 903. Tier: T1 21 / T2 64 / T3 210 / T4 608 (T4 +45 vs S234 = the S243 youth seed). Status: 872 Active + 22 pending + 9 Retired (the S234 lowercase 'active' sentinel has since normalized to Active). Prior: S234 (858; S232 canon.3 T9 backfill POP-00958..00973 + 6 squatter realignments).

---

## Population Structure

The SL holds ALL simulated people, not just city citizens. ClockMode determines who they are and how the engine processes them.

| ClockMode | Count | Who they are | Engine processing | Roster Tab |
|-----------|-------|-------------|-------------------|------------|
| **ENGINE** | 509 | Oakland city citizens | Full lifecycle — career, household, education, neighborhood, relationships, civic, bonds | — |
| **GAME** | 91 | Oakland A's players and staff | Game-mode micro events only. No career/household/education engines. | `As_Roster` |
| **CIVIC** | 46 | Government officials, council | Civic-mode events. Council votes, initiative processing. | — |
| **MEDIA** | 29 | Bay Tribune journalists | Media-mode events. 7 role-specific pools (editor, columnist, reporter, etc.) | `Bay_Tribune_Oakland` |

**Simulation_Ledger total: ~837 rows** (S185 post-trim count; max POPID POP-00951 after S184 female-balance +150). ClockMode breakdown above is from S105 audit and confirmed drifted — re-run `scripts/auditSimulationLedger.js` for current sub-counts. **Full world population: 1,200+** across Simulation_Ledger + Generic_Citizens (286) + Cultural_Ledger (39) + Business_Ledger (53) + Faith_Organizations (17) + Chicago_Citizens (125). No LIFE-mode citizens remain on the live sheet.

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

## Column Wiring (S321 audit)

4-agent wiring audit, 2026-07-16 — every one of the 52 Simulation_Ledger columns classified CAUSAL (a cycle-path read changes an outcome), RECORD (written/displayed, no behavioral read), or DEAD (no cycle-path writer or reader). RECORD splits: **RECORD-by-design** (timestamps, display names, pointers — correct as-is, nothing to fix) vs. **RECORD-gap** (computed or written every cycle but nothing reads it — candidate to wire or kill).

| Verdict | Count | Columns |
|---|---|---|
| CAUSAL | 43 | A, E–M, O, R, S, T–Y, Z–AK, AL, AM, AN, AO, AP, AR, AS, AU, AV, AX, AY, AZ |
| RECORD-by-design | 8 | B, C, D, N, P, Q, AT, AW |
| DEAD | 1 | AQ |
| **Total** | **52** | |

**S321 gap closures (same session as the audit — all four gaps wired, cycle-proven 0716b):**
- **MaidenName (C)** — was `Middle ` (DEAD, 3 stray values preserved into CitizenBio). Repurposed S321 Mike-direct: GC-spouse promotion (`bondEngine.js` `setC('MaidenName', pick.last)`) keeps the spouse's birth surname so heritage survives marriage. RECORD-by-design until heritage scoring consumes it. Header renamed on sandbox AND live (S321 deploy window); SCHEMA_HEADERS regen'd from live same window.
- **CareerMobility (AJ)** — CAUSAL. First reader: `runCareerEngine.js` `maybeTransition_` — stagnant citizens roll shift/lateral at 1.25× (declining 1.4×), applied before the physics clamps. One-cycle lag by phase order.
- **MigrationReason/Destination/MigratedCycle (AN–AP)** — CAUSAL. First reader: `processSettledInCheck_` (`migrationTrackingEngine.js`) — 10 cycles after a move, the verdict line ("the move worked" / "same problems, new address") is decided by reason-appropriate physics (cost moves judged on landing-hood housingPressure, opportunity moves on trajectory). Proven C119: Eric Taveras, exactly the predicted citizen.
- **ReturnedCycle (AQ)** — still DEAD. No cycle-path writer or reader (legacy — no writer since exit states removed S313). Kill candidate at next schema cleanup (explicit-go).

**Correction to the raw audit:** the A–O auditor block classified LifeHistory (O) as RECORD ("never parsed to gate behavior") — that's wrong. `educationCareerEngine.js` `settleAdulthood_` gates the fire-once 18th-birthday settlement on `indexOf('[Adulthood]')`; `generationalWealthEngine.js` `processMoneyLoop_` checks for `'crossed six figures'` as a once-only milestone; `deriveEducationLevels_` checks `indexOf('Graduation')`; `calculateCitizenIncomes_` extracts an income band via `extractIncomeBand_`. Reclassified CAUSAL here and in §Column Reference below.

**Scope note:** verdicts for Z–AK reflect engine.60/61 (commits a90ce599/6bbed839) — cycle-proven on sandbox 0716b, live push pending. Re-check SavingsRate/DebtLevel/CareerMobility against whatever actually ships if the sandbox iteration changes shape before deploy.

---

## Column Reference (A–AZ) — Full Data Flow

Every column is a data point in someone's life. This maps who writes each column, who reads it, what format it expects, and what valid values look like. Audit verdicts (S321) are appended per column — see §Column Wiring above for the summary and the gap/dead list.

### Identity (A–E)

| Col | # | Header | Valid Values | Writers | Readers | S321 Verdict |
|-----|---|--------|-------------|---------|---------|--------------|
| A | 1 | POPID | `POP-00001` format. Unique. Never reuse. | processIntakeV3, integration scripts | Universal key — everything reads this | **CAUSAL** — `generateGameModeMicroEvents.js:502` `getCitizenDialBands_` lookup |
| B | 2 | First | Text | processIntakeV3, integration scripts | All event generators, buildDeskPackets, display | RECORD-by-design (display) |
| C | 3 | MaidenName | Birth surname (repurposed S321; was `Middle `) | bondEngine GC-spouse promotion (`setC('MaidenName', pick.last)`) | heritage scoring (future) | **RECORD-by-design** — keeps the birth-line after marriage; header renamed both sheets S321 |
| D | 4 | Last | Text | processIntakeV3, integration scripts | All event generators, buildDeskPackets, display | RECORD-by-design (display) |
| E | 5 | OriginGame | Text (source game/integration) | Integration scripts | — | **CAUSAL** — `generateGameModeMicroEvents.js:363` MLB check routes event pool |

### Classification (F–J)

| Col | # | Header | Valid Values | Writers | Readers | S321 Verdict |
|-----|---|--------|-------------|---------|---------|--------------|
| F | 6 | UNI (y/n) | Yes/yes/No/no/n | Integration scripts | **BUG:** Engine checks `=== "y"`, never matches actual values. See Flag State section. | **CAUSAL** — `generateGameModeMicroEvents.js:368` + `runEducationEngine.js:128` + `generationalEventsEngine.js:196` gate event pools |
| G | 7 | MED (y/n) | Yes/yes/No/no/n | Integration scripts | Same bug. | **CAUSAL** — routes media archetype, skips education |
| H | 8 | CIV (y/n) | Yes/yes/No/no/n | Integration scripts | Same bug. | **CAUSAL** — routes civic pools |
| I | 9 | ClockMode | ENGINE / GAME / CIVIC / MEDIA | Integration scripts, cleanup | Event generators (mode gates), lifecycle engines, buildDeskPackets | **CAUSAL** — `generateGameModeMicroEvents.js:480` mode routing, central lifecycle router |
| J | 10 | Tier | 1-4 (integer) | processIntakeV3, integration scripts | Event generators (T1 +10% chance), buildDeskPackets, prioritizeEvents | **CAUSAL** — `runEducationEngine.js:130` T3/T4-only education; event-frequency bias T1+10%/T2+5% |

### Core State (K–N)

| Col | # | Header | Valid Values | Writers | Readers | S321 Verdict |
|-----|---|--------|-------------|---------|---------|--------------|
| K | 11 | RoleType | Text. ENGINE: "Carpenter". GAME: "Shortstop, Oakland A's" | runCareerEngine (transitions), integration scripts | buildDeskPackets, civic engines, economicLookup, linkCitizensToEmployers | **CAUSAL** — `generateGameModeMicroEvents.js:364` pitcher-role event routing; media-role routing |
| L | 12 | Status | Active / Retired / Recovering | runCareerEngine, civic engines, integration scripts | All event generators (skip non-Active), buildDeskPackets | **CAUSAL** — universal skip gate (inactive/deceased/retired); `generationalWealthEngine.js:286` |
| M | 13 | BirthYear | 4-digit year. Age = 2041 - BirthYear. | Integration scripts, cleanup | educationCareerEngine, householdFormation, youthEngine (age gates), buildDeskPackets | **CAUSAL** — age linchpin: `runEducationEngine.js:139`, household adult gate, youth engine, money-loop minor gate |
| N | 14 | OrginCity | Text (legacy misspelled column name) | — | — | RECORD-by-design |

### Life Data (O–S)

| Col | # | Header | Valid Values | Writers | Readers | S321 Verdict |
|-----|---|--------|-------------|---------|---------|--------------|
| O | 15 | LifeHistory | Long text — accumulated life events | All event generators (append each cycle), compressLifeHistory | buildDeskPackets, queryLedger, citizenContextBuilder, enrichCitizenProfiles | **CAUSAL** (S321 corrects the raw A–O auditor's RECORD call — see §Column Wiring) — `educationCareerEngine.js` `settleAdulthood_` gates the fire-once 18th-birthday settlement on `indexOf('[Adulthood]')`; `generationalWealthEngine.js` `processMoneyLoop_` checks `'crossed six figures'` once-only milestone; `deriveEducationLevels_` checks `indexOf('Graduation')`; `calculateCitizenIncomes_` extracts income band via `extractIncomeBand_` |
| P | 16 | SpouseId | 'POP-NNNNN First Last' (ID + name) | bondEngine `marryCitizens_` (both spouses) | spouse-drip tooling | **RECORD** (S321 regen caught live rename CreatedAt→SpouseId — the `marryCitizens_` 'prod no-ops until rollout rename' guard is now live-active; full verdict next audit) |
| Q | 17 | Last Updated | ISO timestamp | Engine orchestrator | — | RECORD-by-design (timestamp) |
| R | 18 | TraitProfile | `Archetype:X\|Mods:a,b\|social:0.7\|...\|V:1.5\|Updated:cNN` | compressLifeHistory v1.5 (Phase 9), integrateAthletes | generateCitizensEvents v2.8 (archetype weights, tone, motifs), buildDeskPackets (voice cards) | **CAUSAL** — `generateCitizensEvents.js:371-407` archetype weights event pools 1.3-1.4x; `storyHook.js:1214` persona match; derived from DialState by `compressLifeHistory.js:426` |
| S | 19 | UsageCount | Integer | processIntakeV3, processAdvancementIntake | — | **CAUSAL** — `generateCitizensEvents.js:130` + `:2083` — UsageCount >= 8 gates PUBLIC_FIGURE_CAP + fame-recognition events |

### Location & Household (T–Y)

| Col | # | Header | Valid Values | Writers | Readers | S321 Verdict |
|-----|---|--------|-------------|---------|---------|--------------|
| T | 20 | Neighborhood | Canonical Oakland neighborhood (see `lib/canonNeighborhoods.js`; 21-name map roster as of S256) | runNeighborhoodEngine, migrationTrackingEngine, processIntakeV3 | Everything location-aware: buildDeskPackets, aggregateNeighborhoodEconomics, civic engines, gentrification | **CAUSAL** — `loadNeighborhoodState.js:37` per-hood dynamics; neighborhood event pools; engine.61 `creditFactorFor_` (banking credit) |
| U | 21 | HouseholdId | `HH-XXXX-XXX` format | householdFormationEngine, seedHouseholds | generationalWealthEngine, migrationTrackingEngine, queryFamily | **CAUSAL** — `generationalEventsEngine.js:343-366` birth physics requires household; household reconciliation grouping |
| V | 22 | MaritalStatus | Single / Married / Divorced / Widowed | householdFormationEngine | buildInitiativePackets | **CAUSAL** — `generationalEventsEngine.js:352` birth eligibility; bondEngine marriage/divorce logic |
| W | 23 | NumChildren | Integer | householdFormationEngine | — | **CAUSAL** — 3-child cap in `checkBirth_`; `runHouseholdEngine.js:523` family flavor |
| X | 24 | ParentIds | JSON array: `["POP-00005","POP-00594"]` | Manual/script | — | **CAUSAL** — `generationalWealthEngine.js:727` inheritance flow; `educationCareerEngine.js:536` 18th-birthday settlement parent-edu leg; `bondEngine.js:1722` family bonds |
| Y | 25 | ChildrenIds | JSON array: `["POP-00595","POP-00596"]` | Manual/script | — | **CAUSAL** — `householdFormationEngine.js:297` family-tree reconcile branch logic; JSON array mirror of ParentIds |

### Economics (Z–AE)

| Col | # | Header | Valid Values | Writers | Readers | S321 Verdict |
|-----|---|--------|-------------|---------|---------|--------------|
| Z | 26 | WealthLevel | 0-10 integer | generationalWealthEngine, integrateAthletes, applyEconomicProfiles | seedHouseholds | **CAUSAL** — writer `generationalWealthEngine.js:567`; `generateCitizensEvents.js:2158` gates micro-event pool by bracket; `:975` mobility diff (engine.61 T5) |
| AA | 27 | Income | Dollar amount (integer) | runCareerEngine (+6-12% promotion, -12-20% layoff), applyEconomicProfiles, integrateAthletes | aggregateNeighborhoodEconomics, buildDeskPackets, householdFormation, gentrification, migrationTracking | **CAUSAL** — scales accrual (income/52×rate×eduF×superF×yieldF); `migrationTrackingEngine.js:244` rent-burden gate |
| AB | 28 | InheritanceReceived | Boolean flag | generationalWealthEngine | — | **CAUSAL** — `deriveWealthLevel_` inheritance boost gate (`:605-606`) |
| AC | 29 | NetWorth | Dollar amount | generationalWealthEngine | — | **CAUSAL** — accrual state + effective income (income + NetWorth×0.05) feeds WealthLevel |
| AD | 30 | SavingsRate | Percentage (decimal) | generationalWealthEngine, applyEconomicProfiles | — | **CAUSAL** — accrual multiplier (first reader: engine.60 S320) |
| AE | 31 | DebtLevel | Dollar amount | generationalWealthEngine | — | **CAUSAL** — drag multiplier; WealthLevel penalty >= 5; moves both ways (crisis accrual / surplus paydown / shocks) |

### Education & Career (AF–AK)

| Col | # | Header | Valid Values | Writers | Readers | S321 Verdict |
|-----|---|--------|-------------|---------|---------|--------------|
| AF | 32 | EducationLevel | hs-diploma / bachelors / masters / doctorate / trade-cert / associates | educationCareerEngine | buildDeskPackets, migrationTrackingEngine | **CAUSAL** — EDU_SAVINGS_FACTOR yield 1.0-1.2x; `eduRank_` gates mid→senior advancement; migration displacement-risk gate (`:254`) |
| AG | 33 | SchoolQuality | Numeric rating | educationCareerEngine | — | **CAUSAL** — `settleAdulthood_` career-entry draw (sq>=8 +2, >=6 +1); stamped on minors from Neighborhood_Demographics |
| AH | 34 | CareerStage | entry / mid / senior / retired | educationCareerEngine | queryFamily | **CAUSAL** — advancement state machine gates |
| AI | 35 | YearsInCareer | Integer | educationCareerEngine | — | **CAUSAL** — tenure gates (>=5 entry→mid, >=10 mid→senior) |
| AJ | 36 | CareerMobility | advancing / stagnant / declining | educationCareerEngine | runCareerEngine `maybeTransition_` (S321 wire) | **CAUSAL** — stagnant 1.25× / declining 1.4× on shift/lateral transition rolls |
| AK | 37 | LastPromotionCycle | Cycle number (integer) | educationCareerEngine | — | **CAUSAL** — cyclesSincePromotion gates all advancement + stagnation (>=40) |

### Migration (AL–AQ)

engine.55 (S316): AN–AP went live with intra-city relocation — the intent
ladder resolves as moved-within (whole household units sort toward
economically-fitting neighborhoods, max 2 units/cycle). Nodes permanent:
Neighborhood only ever changes to another canonical Neighborhood_Map node.

| Col | # | Header | Valid Values | Writers | Readers | S321 Verdict |
|-----|---|--------|-------------|---------|---------|--------------|
| AL | 38 | DisplacementRisk | 0–10 risk score | migrationTrackingEngine | buildCivicVoicePackets, buildInitiativePackets, generateCitizensEvents | **CAUSAL** — `migrationTrackingEngine.js:381` >=8 planning-to-leave, >=5 considering |
| AM | 39 | MigrationIntent | staying / considering / planning-to-leave | migrationTrackingEngine | buildCivicVoicePackets, buildInitiativePackets | **CAUSAL** — `:537` relocation lane eligibility |
| AN | 40 | MigrationReason | job / family / cost / crime / opportunity / displaced | migrationTrackingEngine (relocation, engine.55) | `processSettledInCheck_` (S321 wire) | **CAUSAL** — picks the settled-in verdict physics (cost→pressure test, opportunity→trajectory test) |
| AO | 41 | MigrationDestination | Canonical neighborhood name | migrationTrackingEngine (relocation, engine.55) | `processSettledInCheck_` (S321 wire) | **CAUSAL** — verdict skipped if the citizen drifted off the recorded destination |
| AP | 42 | MigratedCycle | Cycle number of last intra-city move | migrationTrackingEngine (relocation, engine.55) | `processSettledInCheck_` (S321 wire) | **CAUSAL** — fires the once-only verdict at +10 cycles |
| AQ | 43 | ReturnedCycle | Cycle number (legacy — no writer since exit states removed S313) | — | — | **DEAD** — no cycle-path writer or reader |

### Economic Links (AR–AT)

| Col | # | Header | Valid Values | Writers | Readers | S321 Verdict |
|-----|---|--------|-------------|---------|---------|--------------|
| AR | 44 | EconomicProfileKey | Role key → Economic_Parameters tab | applyEconomicProfiles, runCareerEngine (on transitions) | generationalWealthEngine, aggregateNeighborhoodEconomics, linkCitizensToEmployers | **CAUSAL** — seeded-vs-unseeded income model selection (`generationalWealthEngine.js:425`); career income scaling (`runCareerEngine.js:69,537`); settlement + money-loop skip guard |
| AS | 45 | EmployerBizId | `BIZ-00001` format → Business_Ledger | runCareerEngine (clear on layoff, set on transition), linkCitizensToEmployers | buildDeskPackets | **CAUSAL** — `runCareerEngine.js:841` self-employment branch; career transitions write `:862-913` |
| AT | 46 | CitizenBio | 1-2 sentence stable narrative identity. Survives LifeHistory compaction. | applyCitizenBios (one-time, 17 T2 citizens so far) | — | RECORD-by-design (display in buildCitizenCards) |

### Wake & Health (AU–AZ)

Added S321 to §Column Reference — previously described only in the header prose (see line 9 history). All 6 read/written on the wake side (citizen-loop, Phase 9 compressor, health lifecycle) rather than the main Phase-5 cycle loop, but 5 of 6 are still CAUSAL: they change what fires next.

| Col | # | Header | Valid Values | Writers | Readers | S321 Verdict |
|-----|---|--------|-------------|---------|---------|--------------|
| AU | 47 | Gender | Text (confirmed S146) | Integration scripts | generationalEventsEngine, bondEngine | **CAUSAL** — `generationalEventsEngine.js:372` single-motherhood birth path; bondEngine opposite-sex marriage gate |
| AV | 48 | DialState | JSON 8-dial machine state (engine.31, S256) | Phase-5 dial engines | 9 Phase-5 engines via `getCitizenDialBands_` | **CAUSAL** — every phase-5 engine reads `getCitizenDialBands_` for frequency multipliers 0.5-1.5x: education `:401`, neighborhood `:437`, relationship `:467`, career `:792`, household `:498`, conduct `:176`, youth `:364`, generational `:327`, gameMode `:514` |
| AW | 49 | SMPageId | Supermemory page pointer (S262) | Citizen-loop Phase 2 (lazy-filled) | Citizen-loop wake side only | RECORD-by-design — Supermemory page pointer, wake-side; explicit no-cycle-read contract `lib/citizenPage.js:19-20` |
| AX | 50 | MemoryRegisters | JSON `{"biases":[...],"unlived":[...]}` (S282) | Phase-9 compressor fold only (`foldBiasIntents_`, `foldAgedOutEntries_`) | compressLifeHistory, resonanceRecall | **CAUSAL** — `compressLifeHistory.js:382-383` folds biases into DialState base dials; `resonanceRecall.js:115-116` recall candidates |
| AY | 51 | StatusStartCycle | Cycle number (engine.52, S312) | processHealthLifecycle_ | processHealthLifecycle_ | **CAUSAL** — `generationalEventsEngine.js:261-277` health status duration → transition odds |
| AZ | 52 | HealthCause | Text (Health_Cause_Queue operator loop, S312) | Health_Cause_Queue operator loop | processHealthLifecycle_ | **CAUSAL** — `processHealthLifecycle_` transition probabilities by cause |

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

## Oakland Neighborhoods (col T value space)

**Single source of truth: `lib/canonNeighborhoods.js`** (do not hand-copy the list here — this section drifted into a stale 4th roster before S256). Three layers:
- `CANON_12` — core sim neighborhoods (citizen-residence assignment draws from this).
- `MAP_NEIGHBORHOODS` — the Neighborhood_Map roster, **21 as of S256** (was MAP_17; +Lake Merritt, Uptown, KONO, Baylight District).
- `CHILDREN` — sub-areas that legitimately appear in data (Montclair, Dimond, etc.).
- `CANONICAL_HOODS` — lowercased union; the membership test auditSimulationLedger + preMortemScan use.

**S256 roster alignment:** citizen-residence (CANON_12) and the map writer (`phase08 v3NeighborhoodWriter.js` NMAP_NEIGHBORHOODS) had drifted apart — 205 citizens lived in untracked hoods. Added Lake Merritt (98)/Uptown (89)/KONO-profile (12)/Baylight District to the writer; **live Neighborhood_Map still has 17 rows until the phase08 change deploys at C97** (new rows populate the cycle after). 6 stray col-T values reassigned to canon (Coliseum District→Baylight District, East Oakland→San Antonio, Montclair→Dimond, Jingletown→Fruitvale, Downtown Oakland→Downtown) — 0 strays remain. 'East Oakland' + 'Jingletown' are deliberately NON-canon (broad-region tokens) per canonNeighborhoods.

---

## Related Docs

| Doc | What it covers |
|-----|---------------|
| `docs/engine/archive/LEDGER_AUDIT.md` | Full audit history (S68-S72), decisions, census details |
| `docs/engine/archive/LEDGER_REPAIR.md` | S92-S94 corruption recovery, 5-step plan, post-recovery fixes |
| `docs/SPREADSHEET.md` | All 65 sheet tabs including SL context |
| `docs/engine/archive/ENGINE_MAP.md` | Every engine function in execution order |
| `scripts/queryFamily.js` | Quick family check at boot |
| `scripts/queryLedger.js` | 6 query types against SL + editions |
| `scripts/buildMaraReference.js` | Generates citizen roster from SL for Mara |
