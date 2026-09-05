---
title: Hood-identity remainder — point leftover copies at Neighborhood_Map B1
created: 2026-08-30
updated: 2026-08-30
type: plan
tags: [engine, neighborhoods, economy, crime, media, active]
sources:
  - docs/for-claude-review/2026-08-30-grok-hood-identity-remainder.md — research basis (this inbox sibling)
  - docs/engine/ROLLOUT_PLAN.md engine.134 — the row this executes
  - docs/plans/2026-08-29-employment-system-cascade.md — B1 profile + sportsZones already on the economy blob
  - docs/plans/2026-08-27-sports-coupling-restore.md T7 — HELD; this plan consumes S.sportsZones, does not unhold
  - OpenRouter Haiku cards 2026-08-30: mapToCanonicalNeighborhood_, buildEveningFood_, updateCrimeMetrics_, Business_Ledger
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.134"
  - "[[../research/2026-08-30-hood-identity-remainder]] — research (name after Claude moves the inbox copy)"
  - "[[../canon/INSTITUTIONS]]"
  - "[[../adr/0016]] — sheet is truth"
---

# Hood-identity remainder — point leftover copies at Neighborhood_Map B1

**Goal:** After engine.135, every remaining engine/media copy of "what this neighborhood is" iterates `S.neighborhoodState` (or the loaded ND set) and the live Business_Ledger, so a Glenview cafe can appear in economy, dinner, and crime the same way it already appears in seeds and pay. Done = 22 hoods in `S.neighborhoodEconomies`, crime updates, and evening-food names that exist on the ledger; athlete sightings follow `S.sportsZones` when that set is non-empty.

**Architecture:** No fifth table. B1 already lives on Neighborhood_Map and in `S.neighborhoodState`. (1) `mapToCanonicalNeighborhood_` uses commute's child-fold only, then identity. (2) `calculateNeighborhoodEconomies_` iterates `S.neighborhoodState` keys; `primary`/`sensitivity` derived from `employerCharacter` + `boomIndex`. Delete `NEIGHBORHOOD_ECONOMIES`. (3) Crime iterates the same 22 keys; missing profiles get a derived default from boomIndex, not 2026 strife literals; East Oakland / West Oakland / Temescal / Brooklyn character strings retuned to S374; Montclair stays a non-iterated ghost (no NM row). (4) `buildEveningFood_` draws restaurant names from Business_Ledger food-class rows the way famous/seeds already do; holiday bias picks a hood. (5) `buildEveningFamous_` OpeningDay/championship uses `S.sportsZones` if length>0, else today's Jack London/Downtown fallback until T7 lights. (6) `S.neighborhoodEmploymentWeights`: one consumer (`cascadeAudit` or delete the write).

**Terminal:** engine-sheet (every task). research-build: none. Grok: research+plan only.

**Pointers:**
- Prior work: engine.135 B1, grok fill S398, engine.134 count
- Related: engine.131 T7 (HELD), engine.136 (after C105, not this)
- Research basis: inbox `2026-08-30-grok-hood-identity-remainder.md`

**Sequencing lock:** nothing here benches against live until Mike's C105 on prod @10 is verified per the employment-cascade §Acceptance. Same lock 135 used against the 08-30 illness window.

**Acceptance criteria:**
1. `S.neighborhoodEconomies` has exactly the 22 `Neighborhood_Map` names (no Montclair, no City-wide). A BUSINESS_EXPANSION/CONTRACTION on a Brooklyn or Glenview row survives `mapToCanonicalNeighborhood_` (hood !== null).
2. `updateCrimeMetrics_Phase3_` writes a Crime_Metrics row for Brooklyn, Baylight District, Eastlake, Ivy Hill, and San Antonio. East Oakland character string is not `working class, underserved`. Montclair is not in the iteration set.
3. `S.eveningFood` restaurant names are a subset of live Business_Ledger.Name (food/cafe/restaurant/nightlife/F&B sectors). Dollar Pho / Value Eats / Budget Bites / Crisis Coffee Co. / Golden Dragon / Lucky Dim Sum do not appear.
4. When `S.sportsZones` is non-empty, OpeningDay/championship famous sightings pick from that set; Jack London is not hardcoded. When empty, today's fallback remains (T7 still dark).
5. `S.neighborhoodEmploymentWeights` is either read by `cascadeAudit` or the write is gone. Stub reverse matches. Unit tests green. Bench 0827, then live replay of any Crime_Metrics row-adds (ensure* appends need replay).

---

## Wiring cards (required)

Ran 2026-08-30, OpenRouter Haiku. Full text in `output/grok/wiring-*.md`.

- **mapToCanonicalNeighborhood_** — `economicRippleEngine.js:368`, one caller `:345` inside `detectCareerRipples_`. Pure. Phase6 both entry points, before Phase10. Not in STUB_REVERSE.
- **calculateNeighborhoodEconomies_** (same file `:804`) — writes `S.neighborhoodEconomies` (readers: applyCityDynamics, applyMigrationDrift, generateEconomicSummary, media briefing, buildCyclePacket). Iterates `NEIGHBORHOOD_ECONOMIES`. Leftover Jack London literals at `:831` and `:836`; `isSportsZone` at `:857` already uses `cal.sportsZones`.
- **buildEveningFood_** — Phase7-Food `:454`/`:2116`. WRITE `S.eveningFood`. No ledger read.
- **updateCrimeMetrics_Phase3_** — Phase3-Crime `:302`/`:1966`. Iterates `NEIGHBORHOOD_CRIME_PROFILES` keys. `S.crimeMetrics` has real readers. Crime_Metrics INTENT+DIRECT via ensure*.
- **buildEveningFamous_** — Phase7-Famous `:455`. Ledger venuesByHood already. Athletes `:486` Jack London/Downtown. Does not read `S.sportsZones`.
- **Business_Ledger** — 4 INTENT writers, 10 readers including `loadHoodBusinessPay_` / seed / famous. Fill already live; this plan only *reads* it.

---

## Tasks

### Task 1: Unit test first — fold + economy keys + food names

- **Files:**
  - `scripts/hoodIdentityRemainder.test.js` — create
- **Steps:**
  1. Fixture: 22 NM names + the four child-fold inputs + City-wide.
  2. Assert fold: Old Oakland→Downtown, Telegraph corridor→Temescal, Brooklyn Basin→Jack London, Coliseum→East Oakland, City-wide→null, Uptown→Uptown, KONO→KONO, Brooklyn→Brooklyn, Glenview→Glenview, Piedmont Ave→Piedmont Ave.
  3. Assert economy object keys === 22 NM names when given `S.neighborhoodState` with those keys.
  4. Assert a food picker given a BL slice returns only names from that slice; a pool containing Dollar Pho is rejected.
- **Verify:** `node scripts/hoodIdentityRemainder.test.js` → failing RED (functions not yet pointed).
- **Status:** [ ] not started

### Task 2: One fold — `mapToCanonicalNeighborhood_`

- **Files:**
  - `phase06-analysis/economicRippleEngine.js` — modify
- **Steps:**
  1. Replace the 11-name array + Uptown/KONO/Brooklyn Basin/Coliseum/Piedmont Avenue/City-wide aliases with: (a) `COMMUTE_CHILD_HOOD_FOLD` copy or a shared constant (do not require commuteFlowEngine — duplicate the four-entry object in this file with a comment pointing at `commuteFlowEngine.js:59`, or lift both to a tiny `lib/` only if engine-sheet already has that pattern; prefer the four-entry duplicate + comment over a new shared module this wave). (b) If name is a key of `S.neighborhoodState` or equals a Neighborhood_Map string passed in, return it. (c) City-wide / Chicago / Bridgeport → null.
  2. Delete `n.indexOf(canonical[i])` substring match (that is how "Piedmont Ave" never hit "Piedmont Avenue" and how accidental substrings happen).
  3. `detectCareerRipples_` stays `if (!hood) continue` — after this, Brooklyn/Glenview survive.
- **Verify:** Task 1 fold cases GREEN. `node --check phase06-analysis/economicRippleEngine.js`.
- **Status:** [ ] not started

### Task 3: Economy blob from B1, delete `NEIGHBORHOOD_ECONOMIES`

- **Files:**
  - `phase06-analysis/economicRippleEngine.js` — modify
- **Steps:**
  1. `calculateNeighborhoodEconomies_`: `for (nh in S.neighborhoodState)` instead of `for (nh in NEIGHBORHOOD_ECONOMIES)`. Skip if `!S.neighborhoodState[nh]`.
  2. Derive `sectors` from `employerCharacter` (B1 labels already on the sheet: residential, professional, medical, campus, stadium, institutional, nightlife, retail, transit-retail, family-retail, arts, mixed, schools-retail, village-retail, construction, service-labor, clinic). Map to the existing short lists (`['retail','food']` etc.) in one `employerCharacter → primary[]` table in this file — that table is a sector vocabulary adapter, not a hood list.
  3. `sensitivity = clamp(1 + 0.3 * boomIndex, 0.7, 1.3)` (new-build more sensitive; Temescal −0.7 quieter). Replaces the hardcoded 0.8–1.3 per 11 hoods.
  4. Replace `:831` First Friday (`nh === 'Temescal' || nh === 'Jack London'`) with: First Friday bonus if `employerCharacter` is `arts` or `nightlife`.
  5. Replace `:836` championship `nh === 'Jack London'` with the existing `isSportsZone` test (already at `:857`). Do not unhold T7; if `sportsZones` is empty the bonus is zero, which is correct while T7 is dark.
  6. Delete `var NEIGHBORHOOD_ECONOMIES = { ... }`.
  7. `HOLIDAY_ECONOMIC_ZONES`: add Baylight District next to Jack London on sports-adjacent holidays only if T7 is still dark *and* the holiday is OpeningDay — actually no: leave holiday zones as hood names that exist in NM; add `'Baylight District'` to OpeningDay/Pride only as a *second* zone, do not remove Jack London (T7's decline story needs Jack London still able to receive a holiday). Prefer: holiday zones stay, but any zone not in `S.neighborhoodState` is skipped at apply time.
- **Verify:** Task 1 economy-keys GREEN. 11-hood object grep in this file → 0.
- **Status:** [ ] not started

### Task 4: Crime iterates 22 NM keys; retune strife literals

- **Files:**
  - `utilities/ensureCrimeMetrics.js` — modify `NEIGHBORHOOD_CRIME_PROFILES`
  - `phase03-population/updateCrimeMetrics.js` — modify iteration
- **Steps:**
  1. Iteration source: `Object.keys(S.neighborhoodState || {})` if non-empty, else `Object.keys(NEIGHBORHOOD_CRIME_PROFILES)` (boot/ensure path without ctx.summary). Never iterate Montclair as a live place: drop `'Montclair'` from the profile object (ghost Crime_Metrics row stays on the sheet until a hand delete — log it in the plan Status as a live-replay sheet write, do not add a delete path to ensure*).
  2. Add missing profile entries for Brooklyn, Baylight District, Eastlake, Ivy Hill, San Antonio. Mods from boom/prosperity register, not 2026 underserved: Brooklyn ~ Rockridge-quiet new-build (property 0.7 / violent 0.5 / base 3); Baylight ~ Jack London entertainment (1.1 / 0.9 / 7); Eastlake ~ Adams Point (0.8 / 0.6 / 4); Ivy Hill ~ Glenview (0.65 / 0.45 / 3); San Antonio ~ Fruitvale-without-the-strife-label (1.0 / 0.8 / 6). Character strings from INSTITUTIONS short form (quiet new waterfront; sports mecca new-build; lake money thinning; smallest D4 village; working core).
  3. Retune existing character strings only (mods: change East Oakland violent 1.4 → 1.0 and baseIncidents 11 → 7; West Oakland violent 1.3 → 0.9, drop gentrifying). Characters: East Oakland `frontier, Baylight money arriving`; West Oakland `boom campus, Civis`; Temescal `boom left behind, clinic corridor`; Brooklyn if present in the old table was not — skip. Do not retune `NEIGHBORHOOD_PROFILES` studentMod/adultMod (age-only, engine.135).
  4. Retune `NEIGHBORHOOD_PROFILES` **character** strings only: Temescal `boom left behind`; Brooklyn `new-build waterfront`; West Oakland `boom campus`. Leave the numeric mods.
- **Verify:** A unit fixture of 22 NM keys produces 22 crime outputs; Montclair absent. Grep `underserved` / `gentrifying` in `utilities/ensureCrimeMetrics.js` → 0. `node --check` both files.
- **Status:** [ ] not started

### Task 5: Evening food from Business_Ledger

- **Files:**
  - `phase07-evening-media/buildEveningFood.js` — modify
- **Steps:**
  1. Copy the fail-soft hood-keyed BL read from `buildEveningFamous.js:445-469` (BIZ_ID, Name, Neighborhood, plus Sector). Filter Sector matching `/restaurant|cafe|dining|food|nightlife|beverage/i`.
  2. Replace UPSCALE/CASUAL/NIGHTLIFE_FOOD/BUDGET_SPOTS/CHAOS_FOOD and the holiday-named pools with: pick N names from that index. Holiday/First Friday/OpeningDay bias = overweight a hood (Chinatown on LunarNewYear, Fruitvale on Cinco/Dia, `S.sportsZones[0]` or Jack London fallback on OpeningDay, Uptown/KONO/Temescal/Jack London on First Friday — those four already exist as `artsNeighborhoods` in famous).
  3. Delete Dollar Pho, Value Eats, Budget Bites, Crisis Coffee Co., Golden Dragon, Lucky Dim Sum, and any other name not on the live ledger. If a live shop already shares a pool name (Harborline Grill, Fruitvale Diner, Art Walk Cafe, Marigold Cafe, Green & Gold Tavern, KONO Kitchen, OakHouse, West Side Cafe, Dockhouse BBQ, Midnight Bistro, Miso Metro), it survives *because it is on the ledger*, not because it is in the pool file.
  4. Empty hood food pool → skip that hood, do not invent.
- **Verify:** Task 1 food-picker GREEN. Grep `Dollar Pho|Value Eats|Budget Bites|Crisis Coffee|Lucky Dim Sum` in this file → 0. `node --check`.
- **Status:** [ ] not started

### Task 6: Famous sightings consume `S.sportsZones`

- **Files:**
  - `phase07-evening-media/buildEveningFamous.js` — modify
- **Steps:**
  1. At the OpeningDay/championship athlete branch (`:484-486`): if `Array.isArray(S.sportsZones) && S.sportsZones.length`, pick `S.sportsZones[floor(rng * length)]`. Else keep Jack London 0.6 / Downtown 0.4 (T7 still dark — fail-soft).
  2. Do not edit engine.131 files. Do not clasp T7.
- **Verify:** Fixture with sportsZones `['Baylight District']` → neighborhood Baylight. Fixture with `[]` → Jack London or Downtown. `node --check`.
- **Status:** [ ] not started

### Task 7: Orphan `S.neighborhoodEmploymentWeights`

- **Files:**
  - `scripts/cascadeAudit.js` — modify **or** `phase03-population/updateNeighborhoodDemographics.js` — delete the write
- **Steps:**
  1. Prefer consume: cascadeAudit's unemployment-spread lane already reads ND + NM. If the S. blob is a same-cycle convenience, have cascadeAudit read it when present as a cross-check against the sheet. If that is a stretch, delete `:290` assignment and the comment "audit + story consumers".
  2. Do not leave an unused S. field. Stub regen in Task 8 will show readers: [] or the new reader.
- **Verify:** `node scripts/ctxMap.js neighborhoodEmploymentWeights` → CONNECTED or field gone. Not ORPHANED WRITE.
- **Status:** [ ] not started

### Task 8: Stub regen + collision note

- **Files:**
  - `docs/engine/ENGINE_STUB_MAP.md` / `ENGINE_STUB_REVERSE.json` — regenerate via existing `/stub-engine` path (`scripts/stubEngine.js`)
- **Steps:**
  1. Regen in the same commit as Tasks 2–7.
  2. Confirm `mapToCanonicalNeighborhood_` appears or stays unrecorded (helpers often do — if still unrecorded, that is acceptable; do not force a stub of every inner function).
  3. Record in the commit message: `updateCrimeMetrics_` name collision (Phase3 vs utilities) is pre-existing, not introduced here.
- **Verify:** stub generated date = commit day; `neighborhoodEconomies` writers still Phase6; `NEIGHBORHOOD_ECONOMIES` gone from engine JS.
- **Status:** [ ] not started

### Task 9: Bench, then live sheet replay for crime appends

- **Files:**
  - none in repo except DEPLOY/plan Status log
- **Steps:**
  1. SANDBOX 0827 only. Groundhog 2–3 cycles. Confirm 22 economy keys in a dumped `S.neighborhoodEconomies` or cycle packet; 5 new Crime_Metrics hoods appended; eveningFood names ⊆ BL; no Engine_Errors.
  2. Live: Crime_Metrics row-adds are sheet writes (ensure* append). Replay after bench proof. Economy/food/famous are code-only (clasp). Sequencing: after C105 verify.
  3. Montclair Crime_Metrics ghost: log as a one-row hand delete, separate replay, not this task's auto path.
- **Verify:** bench HTTP 200, 0 new Engine_Errors; live read-back of Crime_Metrics includes the five hoods.
- **Status:** [ ] not started

---

## Open questions

- [ ] **Montclair Crime_Metrics row** — civic.20 kept the profile because four derived artifacts still name it; NM has no row. This plan stops iterating it. Hand-delete of the ghost row needs Mike (irreversible-ish sheet row). Does not block Tasks 1–8.
- [ ] **Shared fold constant** — Task 2 prefers a four-line duplicate over a new lib module. If engine-sheet already has `lib/canonNeighborhoods.js` as the child-fold home, use that instead of duplicating. Check at task time; do not invent a new lib file if the existing one already folds.

No question blocks the plan from starting after C105.

---

## Proposed ROLLOUT change (Claude files)

Do not invent an id. **Repoint engine.134** from "plan TBD / city-health blast radius" to this plan, state `ready` (or `blocked` on C105 if Claude wants the sequencing lock in the tracker). One line, pointer only.

Leave engine.131 T7 and engine.136 untouched.

---

## Changelog

- 2026-08-30 (grok) — Initial plan from remainder research + four Haiku wiring cards. Inbox copy for Claude.
