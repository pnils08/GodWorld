---
title: Hood-identity remainder after engine.135 — research
created: 2026-08-30
updated: 2026-08-30
type: reference
tags: [research, engine, neighborhoods, economy, crime, media, active]
sources:
  - live Business_Ledger + Neighborhood_Map read 2026-08-30 (175 BIZ rows, 22 hoods, IncomeTier present, floor-6 PASS)
  - docs/research/2026-08-29-business-ledger-hood-fill.md — grok fill + engine-sheet S398 Review (46 renames, pay re-base)
  - docs/plans/2026-08-29-employment-system-cascade.md — engine.135 A–F + E3 on prod @10; C105 unfired
  - docs/plans/2026-08-29-city-health-system.md — engine.134 filed (25 hood-list copies; plan TBD)
  - docs/plans/2026-08-27-sports-coupling-restore.md T7 — sports zone follows stadium; BUILT, ships dark; HELD until live T1–T4 smoke
  - docs/canon/INSTITUTIONS.md §Neighborhoods (S374)
  - civic.23 — character layer encodes 2026 Oakland where canon is silent
  - ADR-0016 — ledgers are the truth source; do not distribute alias maps
  - OpenRouter Haiku wiring cards 2026-08-30: Business_Ledger, mapToCanonicalNeighborhood_, buildEveningFood_, updateCrimeMetrics_
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.134 is the row this ignites; engine.131 T7 stays HELD"
  - "[[../research/index]] — register on accept"
  - "[[../research/2026-08-29-business-ledger-hood-fill]] — fill that made the remainder visible"
  - "[[../plans/2026-08-29-employment-system-cascade]] — B1 profile is the identity source to point at"
  - "[[../canon/INSTITUTIONS]] — essence"
---

# Hood-identity remainder after engine.135 — research

**Reviewer note (grok, 2026-08-30):** Inbox copy. Companion plan in the same folder: `2026-08-30-grok-hood-identity-remainder-plan.md`. Does not unhold engine.131 T7. Does not ask for a live cycle. Wiring cards ran OpenRouter Haiku (`runEngineAgent.js --model anthropic/claude-haiku-4.5`).

**Source:** Post-accept read of the live sheet + engine.135 cascade + four wiring cards (2026-08-30, grok). No external paper. Trigger: the 72-row fill is live and on-canon; coverage/economy/crime/sports-sighting still paint 2026 Oakland.

**What this addresses:** engine.135 B1 made `Neighborhood_Map` (IncomeTier, BoomIndex, EmployerCharacter, WealthMin/Max, MedianIncome) the employment identity source. Seeds, commute depth, and `hoodReferencePay_` now see 22 hoods with shops. Four remaining copies of "what a neighborhood is" still do not read that sheet: the 11-hood economy object, the crime-profile table, the evening-food name pools, and Opening-Day athlete sightings. engine.134 named the class (25 files, plan TBD). This file is the measured remainder after 135, not a second fill.

**What it does (verified 2026-08-30):** Live BL 175 rows, every `Neighborhood_Map` hood ≥ 6, spec-adjective names gone, child-fold extras left. Prod @10 carries 135 A–F+E3. Live still C104 — envelope has not stepped (cascadeAudit spread FAIL 1.72pp, expected). Stub map generated 2026-08-30 / 183 files / 1187 fns, current.

---

## Extraction — what's usable

- **Sheet is already the identity source → stop adding JS tables.** `loadNeighborhoodState_` already loads B1 into `S.neighborhoodState` (incomeTier, boomIndex, employerCharacter, wealthMin/Max, medianIncome). ADR-0016: reconcile ledgers, don't distribute alias maps. Remaining copies should iterate that object or the loaded ND set (W2a), not grow `NEIGHBORHOOD_ECONOMIES` / `NEIGHBORHOOD_CRIME_PROFILES` by hand.
- **Child-fold is hierarchy, not spelling → keep `COMMUTE_CHILD_HOOD_FOLD` as the one fold.** Old Oakland→Downtown, Telegraph corridor→Temescal, Brooklyn Basin→Jack London, Coliseum→East Oakland, City-wide excluded. `mapToCanonicalNeighborhood_` currently also folds Uptown/KONO→Downtown and Brooklyn Basin/Coliseum→Jack London (different from commute on Coliseum). One fold table, commute's. Uptown and KONO are live NM rows and must resolve to themselves.
- **Ripple skip is why new shops don't become economy cards → `detectCareerRipples_` `if (!hood) continue`.** Null today: Adams Point, Brooklyn, Eastlake, Glenview, Dimond, Ivy Hill, San Antonio, Piedmont Ave. `calculateNeighborhoodEconomies_` then only keys the 11-entry `NEIGHBORHOOD_ECONOMIES` object. `S.neighborhoodEconomies` IS consumed (applyCityDynamics, applyMigrationDrift, media briefing, cycle packet). Filling shops without extending this object means Glenview has a cafe and no mood blob.
- **`isSportsZone` already uses `S.sportsZones` (T7) → leftover Jack London literals are the defect.** `economicRippleEngine.js:857` is set-membership. Lines 831–836 still hardcode First Friday Temescal/Jack London and championship Jack London. `buildEveningFamous.js:486` OpeningDay/championship athletes: Jack London 60% / Downtown 40%. T7 is BUILT and ships dark, HELD until T1–T4 live smoke. Remedy for famous is consume `S.sportsZones` when present, not unhold T7.
- **Evening food never reads the ledger → dinner invents names the sheet does not have.** Wiring: `buildEveningFood_` Phase7-Food both entry points, writes `S.eveningFood` only, no sheet. Pools include Dollar Pho / Value Eats / Budget Bites / Crisis Coffee Co. (hardship register) and holiday fictions (Golden Dragon, Lucky Dim Sum). Overlap with live shops is accidental (Harborline Grill, Fruitvale Diner, Art Walk Cafe, Marigold Cafe, Green & Gold Tavern). engine.99 already deleted a dead 12-hood list in this file; the pools still are the list. Pattern to steal: `buildEveningFamous_` / `contractSeedBackdropIndex_` hood-keyed Business_Ledger read. Holiday bias = which hood, not a fake restaurant.
- **Crime engine iterates the JS table, not Neighborhood_Map → five live hoods silent-skip.** `updateCrimeMetrics.js:190` `Object.keys(NEIGHBORHOOD_CRIME_PROFILES)`. Present: Downtown, Temescal, Rockridge, Fruitvale, West Oakland, East Oakland, Lake Merritt, Jack London, Piedmont Ave, Montclair (ghost), Grand Lake, Chinatown, Adams Point, Dimond, Glenview, Laurel, Uptown, KONO. **Missing vs NM 22:** Brooklyn, Baylight District, Eastlake, Ivy Hill, San Antonio. Same skip class S256 already closed for Laurel/Uptown/KONO. East Oakland `violentCrimeMod 1.4` / `baseIncidents 11` / character `working class, underserved`; West Oakland `industrial transition, gentrifying`; Temescal `mixed commercial, family neighborhood` vs S374 health-left-behind. Age-mod table (`NEIGHBORHOOD_PROFILES`) is 22-complete; its `character` strings still leak (Temescal young professional, Brooklyn working class). Mods themselves are age weights — engine.135 left them age-only. Retune character strings; do not retune studentMod as prosperity.
- **`S.neighborhoodEmploymentWeights` is an orphaned write → delete or consume.** Writer: `updateNeighborhoodDemographics.js:290`. ctxMap + stub: zero readers. Envelope already writes Unemployed on the ND sheet. Either `cascadeAudit` / a story consumer reads it, or the assignment goes.
- **Fill blast radius is already employment, not just seeds.** Business_Ledger readers after 135: commute depth, `hoodReferencePay_`, D3 floor, E2 Growth_Rate, chaos, heritage append, seeds, famous venues. Remaining copies do not change that — they are why a shop can exist and the Pulse still describe the block as strife.

---

## Wiring cards (OpenRouter Haiku, 2026-08-30)

Full artifacts: `output/grok/wiring-card-business-ledger.md`, `wiring-mapToCanonicalNeighborhood.md`, `wiring-buildEveningFood.md`, `wiring-updateCrimeMetrics.md`. Condensed:

**Business_Ledger (tab)** — map current. Writers (all INTENT, before Phase10): chaos fold, chaos decay, heritage append, career headcount. Readers (10): commute, chaos load, settle pool, tracked-employer floor, `loadHoodBusinessPay_`, mint pool, employer success, economic ripple, seed backdrop, famous venues.

**mapToCanonicalNeighborhood_** — `economicRippleEngine.js:368`, one caller `:345`. Pure. Not in STUB_REVERSE (unrecorded helper). Phase6-EconomicRipple both entry points, before executor. History includes engine.131 T7 (`e9ce67a5`).

**buildEveningFood_** — `:33`, Phase7-Food `:454` / `:2116`. WRITE `S.eveningFood`. No tab. No Business_Ledger. engine.99 trimmed a dead hood list (`5599b933`).

**updateCrimeMetrics_** — COLLISION of names: Phase3 `updateCrimeMetrics_Phase3_` vs utilities `updateCrimeMetrics_(ctx, neighborhood, metrics)`. Phase3-Crime `:302` / `:1966`. Writes Crime_Metrics via ensure* INTENT+DIRECT carve-out. Iterates profile keys. `S.crimeMetrics` has real readers (conduct, citizen events, v3 writer, packet).

---

## Not applicable / hazard

- **Do not unhold engine.131 T7.** Mike-direct: T7 stays dark until a live cycle smokes T1–T4. This remainder may consume `S.sportsZones` fail-soft; it may not bump the sports deployment.
- **Do not remap the four child-fold Business_Ledger rows.** Commute fold and S374 district canon still disagree (Brooklyn Basin→Jack London vs Brooklyn D1). That is a named fold change, not this file.
- **Do not scrub existing real-world BL names** (Kaiser, PG&E, real churches). Out of scope.
- **Do not run a row-sweep of citizen Income.** engine.135 Q1 closed: raise-only floors.
- **Do not add Montclair to Neighborhood_Map** from this file. Crime table keeps it (civic.20; no NM row). Ghost Crime_Metrics rows persist until a hand delete + live replay (ensure* has no delete path).
- **Do not mix this wave with C105.** 135's first live fire is the builder's. This plan benches after that cycle is verified, same sequencing lock 135 used against the 08-30 illness window.
- **Do not grow a fifth identity table.** Extending `NEIGHBORHOOD_ECONOMIES` to 22 by copy-paste is the engine.134 failure mode.
- **D6 leftover** (institutions / tech / construction / faith / sports pay; casino; institutional Annual_Revenue garbage) stays on engine.135, not here.
- **engine.136** (silent cache flush) stays its own row, after C105.

**Verdict:** `adopt` — remainder is measured, B1 is the target to point at, engine.134 is the existing row (replace "plan TBD" with the companion plan). Not a new group id unless Claude splits it.

**Ignited plans:** [[2026-08-30-grok-hood-identity-remainder-plan]] (inbox sibling; Claude moves both).

---

## Applications (living)

- 2026-08-30 — Written so engine.134 has a spec instead of a count; companion plan carries the tasks.

---

## Changelog

- 2026-08-30 (grok) — Initial extraction after live fill verify + four Haiku wiring cards.
