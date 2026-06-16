---
title: engine.33 Citizen↔Neighborhood Texture Loop Plan
created: 2026-06-10
updated: 2026-06-10
type: plan
tags: [engine, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md — engine.33 row (S255 Mike-direct direction note)
  - S256 design-session inventory (this plan's §Inventory)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout (engine.33 row)"
  - "[[2026-05-30-citizen-lifecycle-fame-system]] — sibling: engine.30/.31/.32 stack this builds on"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — registered same commit"
---

# engine.33 Citizen↔Neighborhood Texture Loop Plan

**Goal:** Citizen events move neighborhood metrics, and neighborhood state (metrics + per-neighborhood weather + faith events) flavors citizen events — a closed loop at neighborhood grain with one-cycle lag.

**Architecture:** Mirror of the engine.31 dial architecture: a neighborhood is a citizen-like accumulator. Outbound — generators record a per-neighborhood "pulse" at event-emit time (tag→metric vocabulary, sibling of `utilities/citizenDialMap.js`); the existing phase08 `v3NeighborhoodWriter` folds the dampened pulse into the Neighborhood_Map row it already writes (no new write path). Inbound — a phase02 loader reads last cycle's Neighborhood_Map into `S.neighborhoodState`; citizen event pools gain state-conditioned entries, the conduct engine reads local (not citywide) crime pressure, weather pools read the already-built-but-unconsumed `S.neighborhoodWeather`, and faith events fan out T8-style to same-neighborhood citizens.

**Terminal:** engine/sheet

**Pointers:**
- Dial vocabulary: `utilities/citizenDialMap.js` (engine.31 v2 — tag/text → dial deltas; pulse map is its neighborhood-grain sibling)
- T8 fan-out pattern: `phase09-digest/finalizeCycleState.js` (snapshot.cityEvents) + `phase05-citizens/generateCitizensEvents.js` `previousEveningPool_` (attended-vs-heard by neighborhood match)
- Neighborhood_Map writer: `phase08-v3-chicago/v3NeighborhoodWriter.js` `saveV3NeighborhoodMap_` (currently city dynamics × static per-hood mods + rng)
- Per-hood weather (built, 1 consumer): `phase02-world-state/applyWeatherModel.js` writes `S.neighborhoodWeather`; only `applyCityDynamics.js:1068` reads it
- Faith engine: `phase04-events/faithEventsEngine.js` (writes `S.faithEvents`; **zero citizen-side consumers** as of S256); orgs in `Faith_Organizations` (Neighborhood col C, LeaderPOPID col I)
- Local crime data: `S.crimeMetrics.neighborhoodBreakdown` (phase03 `updateCrimeMetrics.js`); conduct engine currently reads citywide only (`phase05-citizens/runConductEngine.js:84`)
- Neighborhood_Map schema: `schemas/SCHEMA_HEADERS.md` §Neighborhood_Map (28 cols)

**Acceptance criteria:**
1. A cycle's citizen events measurably move the four citizen-movable Neighborhood_Map columns (Sentiment, CrimeIndex, RetailVitality, EventAttractiveness), bounded by clamps; slow columns (MedianIncome/Rent, gentrification cols) untouched.
2. Same-neighborhood citizens receive faith-event attendance entries tagged `Faith` (dial map already routes them); other-hood citizens can hear about them.
3. Citizen weather events differ by neighborhood when `S.neighborhoodWeather` differs.
4. Conduct test/commit rates respond to the citizen's own neighborhood crime, not just citywide pressure.
5. Determinism: full run under fixed `rngSeed` produces identical pulse + folds; zero `Math.random()`; node test harness passes.

---

## §Inventory (S256 design session — why each task exists)

- `Neighborhood_Map` values today = citywide dynamics × static per-hood modifier table + rng (`v3NeighborhoodWriter.js:198-208`). Citizens never feed it. `S.conductEvents` has zero consumers. Crime_Metrics computed from static profiles, not actual conduct.
- Citizen event **probability** already reads neighborhood QoL/hotspots/crowds (`generateCitizensEvents.js:1053-1100`); **flavor** never reads persistent state (gentrification, displacement, retail, rent).
- Initiatives already loop (S137b ImplementationPhase → neighborhood effects). City events already fan out (engine.32 T8). Cultural/business events flow through tags the pulse picks up automatically. Transit: no citizen seam worth building. Scope confirmed by Mike S256: loop + weather + faith = all of it.

---

## Tasks

### Task 1: Pulse vocabulary — `utilities/neighborhoodPulseMap.js` (create)

- **Files:** `utilities/neighborhoodPulseMap.js` — create (ES5-safe, pure logic, Node + Apps Script)
- **Steps:**
  1. Export `PULSE_MAP`: dial-map tag classes → metric deltas. Families: family/community/faith tags (`Wedding`, `Birth`, `Community`, `Neighborhood`, `Faith`, `Mentorship`) → `sentiment +`; `Transgression-Petty/-Serious/-Grave` → `crime +` (scaled by severity), `Resisted` → `crime −` small; business/career-venture content + `Cultural`/`Education-Cultural` → `vitality +`; `Cultural`, `FirstFriday`, `Sports`, `evening:cityEventAttend` → `attractiveness +`; `Critical`/`Hospitalized`/`Setback`/`Divorce` → `sentiment −` small.
  2. Export `recordPulse_(S, neighborhood, tags)` — resolves tags against PULSE_MAP, accumulates into `S.neighborhoodPulse[hood] = {sentiment, crime, vitality, attractiveness, events}` (events = raw count for the fold's per-capita scaling). No-op on empty hood.
  3. Module export guard (`typeof module !== 'undefined'`) per citizenDialMap.js pattern.
- **Verify:** `node -e "var m=require('./utilities/neighborhoodPulseMap.js'); var S={}; m.recordPulse_(S,'Temescal',['Wedding']); console.log(JSON.stringify(S.neighborhoodPulse))"` → Temescal sentiment > 0
- **Status:** [ ] not started

### Task 2: Pulse map unit test

- **Files:** `utilities/neighborhoodPulseMap.test.js` — create (pattern: `lib/*.test.js` plain-node tests)
- **Steps:**
  1. Cases: every PULSE_MAP key produces bounded deltas; transgression severity ordering (Grave > Serious > Petty); unknown tag = no-op; accumulation across multiple events; empty-hood no-op.
- **Verify:** `node utilities/neighborhoodPulseMap.test.js` → exit 0
- **Status:** [ ] not started

### Task 3: Emit-time recording — wire `recordPulse_` into generators

- **Files:**
  - `phase05-citizens/generateCitizensEvents.js` — modify (at the emit site where LifeHistory row + tags are final)
  - `phase04-events/generateGenericCitizenMicroEvent.js` — modify (same)
  - `phase05-citizens/generateNamedCitizensEvents.js` — modify (same)
  - `phase05-citizens/runConductEngine.js` — modify (COMMIT events only, not tests/resists — resists record `Resisted`)
- **Steps:**
  1. At each emit site call `recordPulse_(S, neighborhood, tags)` guarded by `typeof recordPulse_ === 'function'` (Apps Script flat namespace; graceful no-op Node-side without injection).
  2. Caller-graph check first (engine.md step 2): confirm each file's emit funnel — one call per *written* event, no double-record on dedup/skip paths.
- **Verify:** `grep -c "recordPulse_" phase05-citizens/generateCitizensEvents.js phase04-events/generateGenericCitizenMicroEvent.js phase05-citizens/generateNamedCitizensEvents.js phase05-citizens/runConductEngine.js` → ≥1 each; node harness (Task 11) shows populated `S.neighborhoodPulse`
- **Status:** [ ] not started

### Task 4: Outbound fold — `v3NeighborhoodWriter.js`

- **Files:** `phase08-v3-chicago/v3NeighborhoodWriter.js` — modify
- **Steps:**
  1. In `saveV3NeighborhoodMap_`, after existing per-hood value computation, read `S.neighborhoodPulse[hood]`; fold: `value += clamp(delta * DAMPEN, -CAP, +CAP)`. Constants: `DAMPEN_SENTIMENT=0.02/event-point cap ±0.15`; `DAMPEN_CRIME` cap ±0.1; `DAMPEN_VITALITY`/`DAMPEN_ATTRACT` cap ±0.1. Final clamp to each column's existing range (read current live ranges before picking exact constants — measure-twice step 3).
  2. Only Sentiment / CrimeIndex / RetailVitality / EventAttractiveness. Comment-mark the four fold sites `// engine.33 pulse fold`.
- **Verify:** node harness (Task 11): seeded run, hood with wedding events → Sentiment row value > no-pulse baseline; deltas ≤ caps
- **Status:** [ ] not started

### Task 5: Inbound loader — `S.neighborhoodState`

- **Files:**
  - `phase02-world-state/loadNeighborhoodState.js` — create
  - `phase01-config/godWorldEngine2.js` — modify (wire both entry points, after applyCityDynamics, pattern of existing `safePhaseCall_` pairs ~L211/L1530)
- **Steps:**
  1. `loadNeighborhoodState_(ctx)` — read Neighborhood_Map, keep only **latest cycle's** row per hood (sheet is append-per-cycle; filter on max Cycle value), parse into `S.neighborhoodState[hood] = {sentiment, crimeIndex, retailVitality, eventAttractiveness, gentrificationPhase, displacementPressure, medianRent, migrationFlow}`. Read-only — no writes.
  2. Wire `safePhaseCall_(ctx, 'Phase2-NeighborhoodState', ...)` at both entry points.
- **Verify:** harness run logs `S.neighborhoodState` keyed by ~19 hoods with numeric fields
- **Status:** [ ] not started

### Task 6: State-conditioned event flavor — `generateCitizensEvents.js`

- **Files:** `phase05-citizens/generateCitizensEvents.js` — modify
- **Steps:**
  1. New `neighborhoodStatePool_(neighborhood)` beside `previousEveningPool_`: entries conditioned on `S.neighborhoodState[hood]` — gentrificationPhase active → rent-pressure/moving-conversation entries (tags `["source:nbhdState","Neighborhood"]`); displacementPressure high → community-meeting entries (`Community`); retailVitality high → new-shop/market entries (`Lifestyle`/`Cultural`); crimeIndex high → watchfulness entries (`Neighborhood`); sentiment strongly ± → matching mood entries. All tags route through existing dial map — no new dial vocab.
  2. Add pool to the citizen's draw alongside existing pools.
- **Verify:** harness: citizen in a high-displacement hood draws ≥1 state-conditioned entry across seeded runs; tag resolution covered by existing dial-map test
- **Status:** [ ] not started

### Task 7: Neighborhood-grain weather flavor

- **Files:** `phase05-citizens/generateCitizensEvents.js`, `phase04-events/generateGenericCitizenMicroEvent.js` — modify
- **Steps:**
  1. In `weatherV35Pool_` (and micro-event equivalent), prefer `S.neighborhoodWeather[neighborhood]` fields over citywide `S.weather` when present (fallback unchanged — accessor contract same shape as engine.31's `crimeReachable` pattern).
- **Verify:** harness with divergent per-hood weather → different weather entries for citizens in different hoods
- **Status:** [ ] not started

### Task 8: Local crime pressure — `runConductEngine.js`

- **Files:** `phase05-citizens/runConductEngine.js` — modify
- **Steps:**
  1. Per citizen, blend local into the counterweight: `localPressure = neighborhoodBreakdown[hood] ? (propertyCrime+violentCrime)/2 : citywide`; use `0.6*local + 0.4*citywide` for the spike/test/commit modifiers (citywide kept as floor so empty breakdown degrades to current behavior).
- **Verify:** harness: two same-dial citizens in low- vs high-crime hoods show different test rates under fixed seed
- **Status:** [ ] not started

### Task 9: Faith fan-out — inbound

- **Files:**
  - `phase05-citizens/generateCitizensEvents.js` — modify
  - `phase04-events/faithEventsEngine.js` — read; modify only if `S.faithEvents` entries lack `neighborhood`/`organization` fields (confirm shape first — measure-twice step 1)
- **Steps:**
  1. New `faithPool_(neighborhood)` from `S.faithEvents` (phase04 runs before phase05 — same-cycle, no carry-forward needed): same-hood → attendance entries (tags `["source:faith","Faith"]`, weight 1.2, attend-vs-heard split per T8 `previousEveningPool_` cityEvents pattern); other-hood → heard-about for `interfaith`/`crisis` priority events only.
  2. Cap: max 2 faith entries per citizen pool per cycle.
- **Verify:** harness: faith event in hood X → ≥1 same-hood citizen logs Faith-tagged entry; dial map routes `Faith` (already mapped, `citizenDialMap.js:53`)
- **Status:** [ ] not started

### Task 10: Faith → pulse — outbound

- **Files:** `phase04-events/faithEventsEngine.js` — modify
- **Steps:**
  1. After event generation, `recordPulse_(S, org.neighborhood, ['Faith','Community'])` per emitted event (guarded like Task 3). `crisis`-type events record `sentiment −` via a dedicated `Faith-Crisis` PULSE_MAP key (add in Task 1).
- **Verify:** harness: faith-active hood shows sentiment/attractiveness pulse > 0
- **Status:** [ ] not started

### Task 11: Node test harness — loop integration

- **Files:** `scripts/testNeighborhoodLoop.js` — create (pattern: engine.31 Phase 6 multi-cycle harness, global-injection via `Object.keys` spread — claude-mem obs 28136/28122)
- **Steps:**
  1. Stub ctx (fixed `rngSeed`, in-memory sheets, synthetic ledger ~30 citizens across 4 hoods, divergent per-hood weather + crime + one faith event + high-displacement hood).
  2. Run: loader → generators → conduct → fold. Assert acceptance criteria 1–5 (pulse populated; fold bounded; faith fan-out lands; weather differs; conduct rates differ; two identical-seed runs byte-identical).
- **Verify:** `node scripts/testNeighborhoodLoop.js` → exit 0, prints per-criterion PASS
- **Status:** [ ] not started

### Task 12: Docs + close-out (same commits as the code they describe — S250 truth-doc discipline)

- **Files:**
  - `docs/engine/ENGINE_STUB_MAP.md` — regen (`/stub-engine`) in the commit that adds/changes functions
  - `docs/engine/ROLLOUT_PLAN.md` — engine.33 row → `done-pending-archive` at completion
  - `.claude/terminals/engine-sheet/TERMINAL.md` §Current Engine State — note loop landing + deploy status
  - `docs/index.md` — this plan registered (done at plan commit)
- **Steps:**
  1. Per-commit STUB_MAP regen; final row state + TERMINAL block update at ship.
- **Verify:** `git log --oneline` shows doc updates riding code commits, not trailing
- **Status:** [ ] not started

---

## Deploy gate

Local commits as tasks complete; **single `clasp push` at the end on Mike's go-call** (cross-boundary op). Sequence per S250 deploy-attribution discipline: engine.33 deploy must not ride an unverified prior deploy — C97 should verify the S256 engine.31/.32 stack (live dial folds + T8 round-trip + full card rebuild) before or together with this push, Mike's call on ordering. First post-deploy cycle = smoke-test: confirm Neighborhood_Map deltas bounded, no Engine_Errors rows, dial activity from faith/state-pool tags.

## Open questions

*None — design approved S256. Dampening/cap constants in Task 4 are build-time decisions inside approved scope (measure live column ranges first).*

## Changelog

- 2026-06-10 — Initial draft from S256 design session (engine-sheet). Scope confirmed by Mike: citizen↔neighborhood both directions + per-hood weather inbound + faith both directions; initiatives/city-events already looped, cultural/business ride the pulse tags, transit out of scope.
