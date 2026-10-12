WIRING CARD — S.initiativeNeighborhoodEffects (field)   map: 2026-09-21 / 184 files   

DEFINITION
  phase02-world-state/applyInitiativeImplementationEffects.js:624  `if (!S.initiativeNeighborhoodEffects) S.initiativeNeighborhoodEffects = {};`  v1.1

PHASE POSITION
  production entry : Phase2-InitiativeEffects @ godWorldEngine2.js:296  — BEFORE Phase10-ExecuteIntents (:598)
  cycle-phases     : Phase2-InitiativeEffects @ godWorldEngine2.js:2048 — BEFORE Phase10-ExecuteIntents (:2336)

WRITERS (1)
  applyInitiativeImplementationEffects_ (phase02-world-state/applyInitiativeImplementationEffects.js:194-657)
    — Phase2-InitiativeEffects @godWorldEngine2.js:296 (production), :2048 (cycle-phases)
    — Writes per-neighborhood initiative effects (traffic, retail, nightlife, publicSpaces, communityEngagement, sentiment, schoolQuality) and advanced count
    — Merges into S.initiativeNeighborhoodEffects at :624–637; does not clear; accumulates per cycle

READERS (4 external)
  phase02-world-state/applyCityDynamics.js:1290–1291
    READ  `var initiativeBus = (S.initiativeNeighborhoodEffects && typeof S.initiativeNeighborhoodEffects === 'object') ? S.initiativeNeighborhoodEffects : {};`
    — Phase2-CityDynamics, folds six metric fields into hood state per-cycle (engine.93)

  phase03-population/updateNeighborhoodDemographics.js:656
    READ  `var initEff = S.initiativeNeighborhoodEffects || {};`
    — Phase3-DriftNeighborhoodEducation reads schoolQuality field for hood education shifts

  phase05-citizens/applyBusinessDynamics.js:411
    READ  `var initHood = S.initiativeNeighborhoodEffects || {};`
    — Phase5-BusinessDynamics reads advanced count (event) and sentiment sign (condition) for business yield deltas

  phase02-world-state/applyInitiativeImplementationEffects.js:626–629 (internal)
    READ  `if (!S.initiativeNeighborhoodEffects[nh])` and `var existing = S.initiativeNeighborhoodEffects[nh]`
    — Same function; merges new effects into existing per-neighborhood map

WRITE PATH
  INTENT  queueCellIntent_(..., 'Initiative_Tracker', ..., 'engine.131 T7...') @ :390 → Initiative_Tracker
          (Phase 2 upstream of Phase10-ExecuteIntents, commits normally)

TABS
  Initiative_Tracker
    writers: applyInitiativeImplementationEffects_ (:203 read, :390 queue)
    manifest: SHEETS_MANIFEST.md (search Initiative_Tracker)

SURVIVAL
  • Initialized/written @ Phase2-InitiativeEffects (:624), never cleared
  • Folded into neighborhood state @ Phase2-CityDynamics (:1290)
  • Read @ Phase3-DriftNeighborhoodEducation (:656)
  • Read @ Phase5-BusinessDynamics (:411)
  • **SURVIVES the entire cycle** — carries through Phase 2, 3, 5; no phase clears or deletes it

OPEN WORK
  NOT FOUND (no ROLLOUT engine.* rows for this field; no civic.* plan docs)

RECENT CHANGES (since 2026-09-20)
  2026-09-22  8c41f7da  cron-work-wake: every due pack wakes per run (builder ruling 2026-09-22 — workers wake as their jobs need; --limit still caps); housing lever ruled and engine.251 → in-progress
  2026-09-22  ebc931c7  civic.38 Task 4 step 4 LIVE: six-row conversion applied on the live tracker at C108 (7 stage cols armed AF–AL, 4 rows written + read back); beats dump + SCHEMA_HEADERS regenerated; bench 0908 re-synced from live; ROLLOUT row, plan changelog, bench pointer, handoff
  2026-09-21  164aa93e  SESSION_CONTEXT: engine-sheet back, Mike live-driving the six-row conversion
  2026-09-21  03cae03b  SESSION_CONTEXT: note 0f897824's commit message got mangled, record the clean summary
  2026-09-21  0f897824  civic.39: heal batch-collected seats back into hearing/ledger (agy Finding 2, 9e076842 review)
  2026-09-20  c57179fc  engine.250 + civic.38 Task 5 guard, business side: a revival from a failing phase is not an advance — a stall/revive loop cannot farm the business lift

FILES OPENED
  phase02-world-state/applyInitiativeImplementationEffects.js (writer, header + body :194–657)
  phase02-world-state/applyCityDynamics.js (reader, :1270–1319)
  phase03-population/updateNeighborhoodDemographics.js (reader, :656)
  phase05-citizens/applyBusinessDynamics.js (reader, :411)
  phase05-citizens/applyBusinessDynamics.test.js (test contexts, :78 :116 :140 :222 :243)
  phase01-config/godWorldEngine2.js (entry points, :296 :598 :2048 :2336)
  lib/initiativePhaseContract.js (documentation, :218 :776–778)
  docs/engine/ENGINE_STUB_REVERSE.json (map)
