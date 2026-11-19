---
title: Agent Boot Templates — GARBAGE; kept for the data research only
created: 2026-11-13
updated: 2026-11-18
type: reference
tags: [persona, citizens, civic, parked]
sources:
  - docs/research/2026-11-13-boot-templates-test-runs.md — code read and runs
  - docs/research/2026-11-15-worker-records-all-tabs.md — all 85 tabs read for which worker holds them
  - docs/research/2026-11-17-reporter-records-roster.md — each reporter's records and days, approved
  - scripts/civic-office-map.json, output/beats/*.jsonl (C115)
pointers:
  - "[[../research/2026-11-13-boot-templates-test-runs]] — evidence, run by run"
  - "[[../plans/2026-11-10-role-citizens-wake-as-themselves]] — pipeline.110 Task 9, the job that owns this page"
  - "[[../research/2026-11-15-worker-records-all-tabs]] — the data search, workers"
  - "[[../research/2026-11-17-reporter-records-roster]] — the data search, reporters"
  - "[[../index]] — registered here, same commit"
---

# Agent Boot Templates

**GARBAGE (builder, 2026-11-18).** Every template drafted on this page — citizen, council and Mayor, worker, reporter, gate — is marked garbage and is not to be built from. What is kept is the data search: which records each cron should have, and who holds them. The reporters' is [[../research/2026-11-17-reporter-records-roster]]; the workers' is below and in [[../research/2026-11-15-worker-records-all-tabs]]. The earlier text of this page is in git history.

### 3.1 Roster: who holds which records

**Who holds a position comes from `Civic_Office_Ledger`**. Read live 2026-11-13, C115: 39 positions, none vacant. Every holder is on `Simulation_Ledger` under the same POPID and name, Status Active, CIV flag yes, clock CIVIC; the four project-director rows added in October (STAFF-OARI, STAFF-HEALTHCTR, STAFF-STABFUND, STAFF-TRANSITHUB) are among them. `scripts/civic-office-map.json` holds the same 39 people, but the four project directors sit there under `PROJ-*` ids and on the office sheet under `STAFF-*`: a join on id drops them; join on POPID.

**Every worker is in scope.** The roster is the 39 positions below less the Mayor and the nine council seats; the 21 positions with no agent today are in scope.

**A thin worker is a finding about the system, not about the harness.** Where a position's records are few or absent, the tables below say so. Thin is two things: records the sim keeps and routes to no worker (the care-and-justice census of arrests, custody and hospital intakes; court and ticket revenue; the chaos-car sheet; transit), and trades the sim does not yet generate data for. Mapped 2026-11-14 in [[../research/2026-11-13-boot-templates-test-runs]] §Worker data map.

**Role on the citizen ledger against the office sheet: six corrected 2026-11-14.** Osei, Vega, Carter, Rivers, Crane and Delgado now carry their office Title word for word, the string the engine writes at a seat turnover; the other four seats followed the same night; all nine read City Council District <n>. Trace: [[../research/2026-11-13-boot-templates-test-runs]] §Office holders' role.

**Fits now** (an agent or pack exists and a tab holds their records):

| Worker | Records | Rows on disk (C115) | Handed today |
|---|---|---|---|
| Rafael Montez, police chief | `Crime_Metrics` | 22 neighborhoods × 13 columns | part: no response time, clearance |
| Marcus Webb, Stabilization Fund | `Initiative_Tracker` INIT-001 | 36 filled fields | 4 status lines |
| Vanessa Tran-Muñoz, OARI | INIT-002 | 36 fields | 4 status lines |
| Bobby Chen-Ramirez, Health Center | INIT-005 | 39 fields | 4 status lines |
| Elena Soria Dominguez, Transit Hub | INIT-003 | 25 fields (row hand-closed) | 4 status lines |
| Keisha Ramos, Baylight | INIT-006 | 30 fields (row hand-closed) | 4 status lines |
| Brenda Okoro, Deputy Mayor (community development) | `Initiative_Tracker` (Stabilization Fund), as the office map declares | INIT-001, shared with Webb | her own Sunday packet |

**Thin** (a pack exists; the records are few or missing):

| Worker | Records | Rows on disk |
|---|---|---|
| Clarissa Dane, district attorney | `Judicial_Ledger`; the judicial side of `Care_Justice_Census` | 0; 288 census rows |
| Priya Narang, EMS director | `Hospital_Ledger` admissions, `Health_Cause_Queue`; the hospital side of `Care_Justice_Census` | 3, 3; 1,008 census rows |
| Jonas Patel, medical examiner | deaths: `Hospital_Ledger` holds 3 rows, all recovered, 0 deaths; `LifeHistory_Log` holds 1 death (C114), which his node never reads | 0 that reach him |

**Named on the office map with a data domain, no agent** (candidates; who answers for which tab is the builder's call):

| Office (holder) | Declared domain (`civic-office-map.json`) | Tab that exists |
|---|---|---|
| City Manager (Aaron Whitfield) | city-operations-budget | `City_Treasury` (19) |
| Deputy Mayor, Econ Dev (Marcus Osei) | economy-business | `Business_Ledger` (283), `Employment_Roster` (971) |
| Fire Chief (Marcus Hollowell) | fire-incidents | none |
| Public Defender, Deputy Public Defender, Court Liaison, Reentry Director, two ADAs | justice | `Judicial_Ledger` (0); the 288 judicial rows of `Care_Justice_Census` |
| Emergency Management Director (Shawna Delgado) | emergency-crisis | none |
| Chief of Staff, Communications, Legal Counsel, Ombudsman, Police Review Chair, Internal Affairs, two Deputy Chiefs | staff and oversight | none of their own |

**Tabs with no office declared for them:** `Transit_Metrics` (684), `Community_Programs` (33), `Household_Ledger` (930), `Neighborhood_Demographics` (22), `Cycle_Weather` (40), `Faith_Organizations`, `Cultural_Ledger`. The City Planning Director (Mara Vance) is declared for planning, housing and development and runs as her own Sunday cron (civic.47 M1).

### 3.2 Chaos cars: which desk an event reaches

**What the engine fires** (`utilities/chaosCarsConfig.js`): twelve kinds — cop car, fire engine, ambulance, OARI van, building inspector, garbage truck, mail truck, ice cream truck, street sweeper, Estuary Power & Gas truck, BART train, container ship — each landing on a neighborhood, a business or a citizen.

**Where an event goes today:**

| Reader | Rule | Code |
|---|---|---|
| A council seat | by place only: the row's text has to name a hood on the seat's turf; at most ten facts a pack | `buildCivicOfficeSlice.js` `loadCycleEvents` / `eventHitsTurf`, `pickTurn` |
| The Mayor, the DA, the police chief (citywide roles) | none, unless the week's pulse picks one hood, then that hood's only | `buildCivicOfficeSlice.js:1410, 1423-1429` |
| Reporters | the civic-domain, health, transit and accountability slices read the `## Chaos Events` section that `buildWorldSummary.js` `emitChaosCars` writes; the civic-domain and health readers keep only rows whose metric is Hospitalized | `buildWorldSummary.js`, `buildCivicDomainSlice.js`, `buildHealthSlice.js`, `buildTransitSlice.js`, `buildJaxSlice.js` |
| Workers | none: the work wake has no event node | `cron-work-wake.js` `NODE_BUILDERS` |

**C113–C115, off the world summaries:** 30 events fired. A chaos fact reached six council packs, all by place. The two cop cars reached the police chief as nothing of his; the two OARI vans did not reach the OARI director, nor the two ambulances the EMS director. The 12 events on a business and the 4 on a citizen name no hood and reached no office.

**Routing by kind needs the target as well.** The first table here sent each kind to one worker; checked against `utilities/chaosCarsConfig.js` it was wrong on seven of twelve, because a kind lands on more than one sort of target. What the config says each kind can hit (which worker answers for which is the builder's call):

| Kind | Lands on (config `scopes`) | Who that touches |
|---|---|---|
| Cop car | citizen, neighborhood | police chief; the district seat |
| OARI van | citizen, neighborhood | OARI director; the district seat |
| Ambulance | citizen, neighborhood | EMS director; the district seat |
| Fire engine | business, neighborhood | fire chief (no agent); the district seat |
| Building inspector | business only | Deputy Mayor (Econ Dev) (no agent) |
| Garbage truck, Power & Gas truck | neighborhood, business | City Manager (no agent); the district seat; Econ Dev for the business hits |
| Street sweeper | neighborhood, citizen | City Manager; the district seat; its parking tickets write `City_Treasury` |
| Mail truck | citizen, business | Econ Dev for a business letter (contract, lawsuit, audit, premium); a citizen's letter is that citizen's own |
| BART train | neighborhood (transit-served), citizen | the district seat; its delays feed `Transit_Metrics`, which no office holds |
| Container ship | the port: a citywide shock to business growth across sectors | Econ Dev and the City Manager first; the Baylight director for the harbor |
| Ice cream truck | neighborhood | the district seat, by place, as today |

## Changelog

- 2026-11-18 (engine-sheet) — Templates on this page marked garbage; page cut to the worker data search (§3.1, §3.2). Earlier text in git history.
