---
title: Transit × Hoods Alignment Plan
created: 2026-09-09
updated: 2026-09-09
type: plan
tags: [engine, transit, neighborhoods, active]
sources:
  - kimi session 2026-09-09 (builder-approved four-item scope; v2 corrections Mike-direct in review)
  - docs/canon/INSTITUTIONS.md §Civic Agencies, §Neighborhoods
  - docs/research/2026-09-05-hood-blind-engines.md (transit literal cleanup already landed S423)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — engine.183 (filed on accept, S440)"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — register on accept"
---

# Transit × Hoods Alignment Plan

**Goal:** The transit engine's numbers carry their causes — game day is the sports feed, initiative phases move the stations they build, and the transit desk can say *why* ridership moved.

**Architecture:** Four items, one engine batch + one shipped slice fix. (0) Foundation: kill the dead SPORTS-domain scan and 15% rng game-day roll in `updateTransitMetrics.js` — game day = `S.sportsFeedEntries` has rows this cycle, game-day hoods = feed `HomeNeighborhood` ∪ `S.sportsZones`; prev-cycle events read from `WorldEvents_V3_Ledger` (has Domain/Neighborhood; v2.1 doesn't). (A) `applyInitiativeImplementationEffects.js` publishes a per-initiative transit slice on `S.initiativeImplementationEffects.transit`; the transit engine maps live tracker phases to station/corridor effects. (B) Coliseum station keyed to East Oakland (hood, not child area); Baylight District added to its corridors. (C) `Factors` cause column on Transit_Metrics + causal fields in `getTransitStorySignals_`; AC Transit per-line simulation HELD (Mike ruling). (D) Supermemory canon garbage delete — gated on Mike's go.

**Terminal:** engine-sheet (substrate lands there; kimi authored, slice half shipped)

**Sequencing constraint (Mike, 2026-09-09):** SANDBOX 0908 is the dials acceptance run — pure dials measurement, 11 cycles to go, one unbenched change in flight. The engine batch waits for a fresh transit bench after that run. Slice work had no gate and shipped.

**Wiring card:** ATTACHED — see §Dated note (`output/agent_engine-wiring_2026-09-09T03-47-57.md`, `…T04-53-26.md`); the manual trace below matched both cards.

**Manual wiring trace (verified by reading source 2026-09-09):**
- `updateTransitMetrics_Phase2_` called at `phase01-config/godWorldEngine2.js:301` (and second entry point :2045).
- Phase-2 order: SportsSeason (:286, sets `S.sportsFeedEntries` :70 / `S.sportsZones` :53 via `applySportsSeason.js`) → SportsFeed → CivicSentiment → EditionCoverage → InitiativeEffects (:290, `applyInitiativeImplementationEffects_` reads Initiative_Tracker, publishes `S.initiativeImplementationEffects` :458) → Weather → CommuteFlows → CityDynamics → Transit (:301). All inputs transit needs are published upstream.
- `S.transitState` consumers: `generateCrisisBuckets_` (Phase 3), `generateCitizensEvents_` (Phase 5, :2673), `finalizeCycleState_` (Phase 9). `S.transitMetrics` consumers: `getTransitStorySignals_` (Phase 6 via godWorldEngine2.js:425/:2167), `buildCyclePacket_` (Phase 10).
- All five `getTransit*/getBARTStation*` lookup utilities in `utilities/ensureTransitMetrics.js` have zero external callers (dead; not deleted — minimal change).
- Slice consumer: `scripts/buildTransitSlice.js` (Trevor Shimizu cron desk) reads `output/beats/Transit_Metrics.jsonl` via `scripts/dumpBeatTabs.js` (header-verbatim dump — new columns flow automatically). `dashboard/server.js:1586` treats `Station` values as stations — no bus rows land, so no impact.

**Live state anchors (Mike read tonight, kimi verified in code):**
- INIT-003 Fruitvale Transit Hub Phase II: phase `visioning-complete` (design kickoff C106). PHASE_INTENSITY knows `visioning-complete` 0.15 / `design-phase` 0.2 / `construction-active` 0.8 / `operational` 0.9 / `complete` 0.5 (`applyInitiativeImplementationEffects.js:179–200`).
- INIT-006 Baylight: phase `construction-planning`. T7 (:278–291) force-advances Baylight to `operational` when `S.sportsZones` contains Baylight District and overrides hoods to `S.sportsZones` — sport, not tracker phase, is truth for Baylight.
- `WorldEvents_V3_Ledger` columns A–G: Timestamp, Cycle, Desc, Type, Domain, Severity, Neighborhood (`recordWorldEventsv3.js:41`; v3.5 deprecation confirms only A–G read downstream).
- Neighborhood_Demographics has East Oakland, no Coliseum row; 4 tracked citizens carry East Oakland, 0 carry Coliseum — the 30% disruption draw at `generateCitizensEvents.js:2673` has never hit a Coliseum-station resident.
- Baylight sits on the former Coliseum site (`docs/canon/INSTITUTIONS.md:336`) — corridor add is canon.

**Acceptance criteria:**
1. Game day is feed-derived (no rng, no dead domain scan); a feed row with `HomeNeighborhood` boosts stations/corridors serving that hood.
2. Coliseum station disruption puts `East Oakland` in `S.transitState.affectedHoods` (citizen-gated draw can fire).
3. INIT-003 at `design-phase` produces a cause tag on Fruitvale rows; at `construction-active` moves Fruitvale on-time/ridership and International Blvd traffic; at `operational`/`complete` lifts Fruitvale ridership ×1.20.
4. Every Transit_Metrics row carries a `Factors` cause string; `getTransitStorySignals_` data names drivers; Trevor's slice prints the why.
5. Bench (fresh, post-dials): N cycles, zero Engine_Errors, metrics within expected bands.
6. Slice: corridor deltas distinct per corridor (regression test), cause named when Factors present.

---

## Tasks

### Task 1: Slice fix (SHIPPED — kimi, commit 0806aba5)

- **Files:** `scripts/buildTransitSlice.js`, `scripts/beatSlices.test.js` — modify
- **What landed:** prevBy composite key (stations key `S:<name>`, corridors `C:<name>` — was Station-only, 10 corridors collided under `''`); corridor rows render as traffic-index facts; `Factors` column read with `Notes` fallback; inventory fact counts stations + corridors separately, ridership sums stations only; 4 new test assertions.
- **Verify:** `node scripts/beatSlices.test.js` → 0 failures. Suite: 223/224 files pass (`scripts/djDirect.schema-and-slot.test.js` fails pre-existing — missing `output/sift_proposals_c94.json` fixture, unrelated).
- **Status:** [x] done — 2026-09-09 (kimi), commit 0806aba5, pushed.

### Task 2: Item B — Coliseum hood key

- **Files:** `utilities/ensureTransitMetrics.js` — modify
- **Steps:**
  1. `OAKLAND_BART_STATIONS` Coliseum entry: `neighborhood: 'Coliseum'` → `'East Oakland'`. Station name string unchanged (corridors still list `'Coliseum'`, child-area lookups still resolve).
  2. Add `'Baylight District'` to that entry's `corridors` array.
- **Verify:** bench cycle → Coliseum station ridership uses East Oakland demographics (no 0.6 default); a disruption worst-listing Coliseum puts `East Oakland` in `affectedHoods`.
- **Status:** [ ] not started

### Task 3: Item 0 — foundation fix (game day = the feed)

- **Files:** `phase02-world-state/updateTransitMetrics.js` — modify
- **Steps:**
  1. `isGameDay_` → return `((ctx.summary || {}).sportsFeedEntries || []).length > 0`. Delete the 15% season rng roll and the prev-cycle SPORTS-domain scan (dead: v2.1 ledger has no Domain column).
  2. Game-day hoods: collect feed `HomeNeighborhood` values from `S.sportsFeedEntries` ∪ `S.sportsZones`; publish on context + `S.transitMetrics.factors.gameDayHoods`.
  3. Station game-day boost: replace `station.station.indexOf('Coliseum') !== -1` with "station `neighborhood` or `corridors` intersects game-day hoods". Corridor game-day boost: same hood-intersection rule instead of the 880/580 literal pair (corridor→hood mapping: use each station's corridors the corridor name appears in, or a minimal authored map — pick the simplest that covers I-880/I-580 East for Coliseum/Baylight).
  4. `loadPreviousCycleEvents_` → read `WorldEvents_V3_Ledger` (SHEET_NAMES key if present, else literal), columns Domain/Severity/Neighborhood; return `{domain, severity, neighborhood}` per row.
  5. `countMajorEvents_` unchanged in shape (domain branch now live); add per-hood tally → stations whose `corridors` include an event hood get +0.04 ridership mod per hood-event, cap +0.12. Publish tally as `S.transitMetrics.factors.eventHoods`.
- **Verify:** bench → game day cycles match feed rows exactly; event-hood lift appears only where v3 rows carry a Neighborhood.
- **Status:** [ ] not started

### Task 4: Item A — initiative slice published + consumed

- **Files:** `phase02-world-state/applyInitiativeImplementationEffects.js` — modify; `phase02-world-state/updateTransitMetrics.js` — modify
- **Steps:**
  1. In `applyInitiativeImplementationEffects_` main loop: collect `{ name, phase, intensity, hoods }` for rows where `domain === 'transit'` or `isBaylightInitiative_(name)` (post-T7 reconciliation, so the corrected phase/hoods are what publish). Attach as `S.initiativeImplementationEffects.transit`. No second tracker read.
  2. Transit engine reads that slice. Phase map (live values only): `design-phase`/`visioning-complete` → cause tag, no numeric effect; `construction-active` → station on-time −0.03, ridership ×0.95, +8 traffic to the corridor serving the hood (INIT-003: Fruitvale station, International Blvd); `operational`/`complete` → ridership ×1.20, on-time +0.02. Baylight name-matched rows: `construction-planning`/`construction-active` → I-880 N/S +6, Coliseum station ×1.05; `operational` → no extra effect (feed/game-day path covers it).
  3. Initiative tags join the row `Factors` string and `S.transitMetrics.factors.initiatives`.
- **Verify:** bench with tracker at `design-phase` → Fruitvale rows tagged, numbers unchanged; flip bench tracker to `construction-active` → numbers move as mapped.
- **Status:** [ ] not started

### Task 5: Item C — causal frame (Factors column + signals)

- **Files:** `utilities/ensureTransitMetrics.js` — modify; `phase02-world-state/updateTransitMetrics.js` — modify
- **Steps:**
  1. `TRANSIT_METRICS_HEADERS` append `'Factors'` (append-safe; `ensureTransitMetricsSchema_` self-arms missing headers). `recordTransitMetrics_`/`batchRecordTransitMetrics_` row builders add the factors value (column order = header order).
  2. Assemble per-row cause string from: weather type, dayType, game-day hoods, event hoods, initiative tags, station/corridor notes.
  3. `getTransitStorySignals_`: each signal's `data` gains the causal fields (factors object + per-station causes); ridership/performance headlines name drivers.
- **Verify:** bench → Transit_Metrics rows carry Factors; slice md prints "— <cause>" per row; story signal data names game-day/event/initiative drivers.
- **Status:** [ ] not started

### Task 6: Doc propagation (same change as engine batch)

- **Files:** `docs/engine/EVENT_SYSTEM_MAP.md`, `docs/engine/ENGINE_COUPLING_MAP.md`, `schemas/SCHEMA_HEADERS.md` (or `docs/SIMULATION_LEDGER.md` pointer), `docs/index.md` — modify
- **Steps:** update transit entries for: feed-derived game day, v3-ledger event source, Factors column, initiative coupling, East Oakland key. Fix the stale ENGINE_COUPLING_MAP:475 entry (describes functions not in the file).
- **Status:** [ ] not started

### Task 7: Item D — canon garbage delete (GATED on Mike's go)

- **What:** delete Supermemory `bay-tribune` record `j7jcZLkY5LQvjBgEj3Ztdv` ("Cycle Pulse Edition 30 (Full)" — extracted memory whose entire content is the degenerate "AC Transit extends mandatory mandatory Mand Mand…" text; `id === rootMemoryId`). Then rebuild the derived AC Transit business card (`buildBusinessCards` path) and verify via `lookup_business "AC Transit"` the appearance is gone.
- **Why delete not edit:** the memory is 100% garbage; replacement prose would be invented canon. Local mirrors (`archive/editions/Cycle_1-69_*`) are clean — corruption exists only in Supermemory + derived card.
- **Status:** [x] done — 2026-09-09 (kimi, builder go in-session); engine-sheet verified the same night: `npx supermemory search "AC Transit extends mandatory" --tag bay-tribune` no longer returns `j7jcZLkY5LQvjBgEj3Ztdv`.

---

## Out of scope (Mike rulings)

- AC Transit per-line simulation — held (invented ridership no citizen carries; overlaps sports-is-the-world lever).
- Dead lookup utilities (`getTransit*/getBARTStation*`) — noted, not deleted.
- No live deploy/cycle/sheet writes from kimi; bench only, after the 0908 dials run clears.

## Changelog

- 2026-09-09 (engine-sheet, S440) — ACCEPTED: moved to `docs/plans/`, indexed, ROLLOUT engine.183 filed; Task 1 re-verified green, Task 7 verified gone; Tasks 2–6 = engine-sheet batch on a fresh bench after the 0908 dials run.
- 2026-09-09 (kimi) — v2 filed for review: builder corrections folded (foundation fix, single tracker read, live phase values, v3 ledger, bus lines held, bench sequencing). Task 1 shipped, commit 0806aba5.
- 2026-09-09 (kimi) — v1 drafted and rejected in review (dead SPORTS flag, duplicate tracker read, wrong phase values, v2.1 regex source, bench conflict).

---

## Dated note — 2026-09-09 (kimi): wiring cards attached

Credits restored; both cards ran clean (Haiku, 133/133 phase files opened):

- `output/agent_engine-wiring_2026-09-09T03-47-57.md` — **updateTransitMetrics_Phase2_**: callers godWorldEngine2.js:301/:2045; S reads absoluteCycle/weather/season/holiday/commuteFlows/previousCycleState; S writes transitMetrics (readers: getTransitStorySignals_, buildCyclePacket_) + transitState (readers: generateCrisisBuckets_, generateCitizensEvents_, finalizeCycleState_); write path = queueBatchAppendIntent_ → Transit_Metrics + recordRipple_ → Ripple_Ledger. Matches the plan's manual trace exactly.
- `output/agent_engine-wiring_2026-09-09T04-53-26.md` — **applyInitiativeImplementationEffects_**: callers :290/:2034; S writes initiativeImplementationEffects (reader: applyCityDynamics_ only — adding a `.transit` sub-field is safe), initiativeHealthRelief, initiativeNeighborhoodEffects; T7 queueCellIntent_ → Initiative_Tracker @ :284; reads S.sportsZones @ :294.

Two deltas vs the plan body, both in engine-sheet's favor:

1. Card 2 OPEN WORK names `docs/plans/2026-06-01-initiative-tracker-contract.md` as the PHASE_INTENSITY baseline authority with a partial-match mirror step pending — Task 4's phase map should mirror that contract, not invent a second vocabulary.
2. `S.initiativeImplementationEffects` has exactly one reader (applyCityDynamics_, which reads `.sentimentBoost`) — the `.transit` sub-field addition provably breaks no consumer.

(First run of card 2, `...T04-51-57.md`, exhausted its 30-turn budget before emitting the card — superseded by T04-53-26; ignore it.)
