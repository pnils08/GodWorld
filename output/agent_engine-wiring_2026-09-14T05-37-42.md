Perfect. Now I have everything. Let me generate the complete wiring card:

```
WIRING CARD — applyCityDynamics_, S.neighborhoodDynamics, loadCanonNeighborhoods_ (3 targets)   map: 2026-09-13 / 183 files / 1386 functions   [MAP FRESH]

═══════════════════════════════════════════════════════════════════════════════
TARGET 1: applyCityDynamics_ (function)
═══════════════════════════════════════════════════════════════════════════════

DEFINITION
  phase02-world-state/applyCityDynamics.js:56  function applyCityDynamics_(ctx)
  Version: v3.2 (ES5) [header: v3.2; function: v3.2 — match]

PHASE POSITION
  production entry  : Phase2-CityDynamics @ godWorldEngine2.js:298   — BEFORE Phase10-ExecuteIntents (:589)
  cycle-phases      : Phase2-CityDynamics @ godWorldEngine2.js:2043  — BEFORE Phase10-ExecuteIntents (:2320)

CALLERS (2)
  phase01-config/godWorldEngine2.js:298   applyCityDynamics_(ctx)
  phase01-config/godWorldEngine2.js:2043  applyCityDynamics_(ctx)

S FIELDS (READS)
  READ  season              @ :69    writers: advanceSimulationCalendar_, v3preLoader_
  READ  holiday             @ :70    writers: advanceSimulationCalendar_, v3preLoader_
  READ  weather             @ :72    writers: advanceWeatherModel_
  READ  sportsSeason        @ :77    writers: applySportsSeason_, v3preLoader_
  READ  neighborhoodDemographics @ :91    writers: applyCityDynamics_, updateNeighborhoodDemographics_
  READ  neighborhoodEconomies    @ :98    writers: economicRippleEngine_
  READ  worldEvents         @ :101   writers: generateCrisisBuckets_, worldEventsEngine_, faithEventsEngine_
  READ  storySeeds          @ :102   writers: applyStorySeeds_
  READ  eventsGenerated     @ :103   writers: (none found — PHANTOM)
  READ  crimeSpikes         @ :113   writers: (none found — PHANTOM)
  READ  mediaCoverage       @ :114   writers: (none found — PHANTOM)
  READ  shockFlag           @ :150   writers: applyShockMonitor_
  READ  neighborhoodAdjacency @ :726   writers: loadCanonNeighborhoods_
  READ  cityCapacity        @ :773   writers: (none found — PHANTOM)
  READ  activityObservations @ :838   writers: (self, same function)
  READ  storySeedSignals    @ :1094  writers: (self, same function)
  READ  initiativeNeighborhoodEffects @ :1355  writers: applyInitiativeImplementationEffects_
  READ  approvalNeighborhoodEffects   @ :1357  writers: updateCivicApprovalRatings_
  READ  commuteInbound      @ :1370  writers: buildCommuteFlows_
  READ  neighborhoodWeather @ :1431  writers: applyWeatherModel_
  READ  previousCycleState  @ :1485  writers: loadPreviousCycleState_, finalizeCycleState_
  READ  previousCityDynamics @ :1687  writers: (self, same function)

S FIELDS (WRITES)
  WRITE canonHoods (via helper) — NOT DIRECT (loadCanonNeighborhoods_)
  WRITE clusterDefinitions @ :760   readers: (self), getClusterDynamics_
  WRITE cityDynamicsLag @ :784,1899 readers: (self, momentum blend loop)
  WRITE activityObservations @ :838,1913 readers: (self)
  WRITE storySeedSignals @ :1094 readers: (none found — ORPHAN)
  WRITE initiativeNeighborhoodEffects @ :1572 readers: applyBusinessDynamics_
  WRITE approvalNeighborhoodEffects @ :1573 readers: (none found — ORPHAN after fold)
  WRITE previousCityDynamics @ :1893 readers: (self, momentum blend)
  WRITE cityDynamics @ :1857 readers: [48 callers across engine]
  WRITE clusterDynamics @ :1897 readers: (accessor only)
  WRITE neighborhoodDynamics @ :1898 readers: updateCrimeMetrics_, v3NeighborhoodWriter_, finalizeCycleState_, buildCyclePacket_
  WRITE cityDynamicsCapacity @ :1900 readers: (none found — ORPHAN)
  WRITE previousNeighborhoodDynamics @ :1683 writers: (self-reset)

OTHER CTX
  ctx.summary (alias S) @ :64
  ctx.config @ :62
  ctx.ss — IMPLICIT in reader functions (not direct)
  ctx.ledger — IMPLICIT in helper (aggregateDemographics_ needs it via callers)

WRITE PATH
  RIPPLE (recordRipple_) @ :1130,1537,1551,1760,1831
    :1130  → Ripple_Ledger (story-seed-signals entry)
    :1537  → Ripple_Ledger (neighborhood-fold: initiative-implementation)
    :1551  → Ripple_Ledger (neighborhood-fold: approval-shift)
    :1760  → Ripple_Ledger (edition-coverage → city metrics)
    :1831  → Ripple_Ledger (edition-coverage → city sentiment)
  NO DIRECT SHEET WRITES (read-only, in-memory computation)
  NO Math.random (passes)

NEIGHBORHOOD INPUTS
  CLUSTER LITERALS (AUTHORED, line 575–622):
    'DOWNTOWN_CORE':     anchors [Downtown, Uptown], 0.28 weight
    'WATERFRONT_WEST':   anchors [Jack London, West Oakland], 0.18 weight
    'LAKE_CORRIDOR':     anchors [Lake Merritt, Piedmont Ave], 0.22 weight
    'NORTH_HILLS':       anchors [Rockridge, Temescal], 0.17 weight
    'EAST_OAKLAND':      anchors [Fruitvale, Laurel], 0.15 weight
    Membership: anchors only; all 22 canon hoods flood-filled from Neighborhood_Map.Adjacent (engine.214)
    Result: S.clusterDefinitions[cname].neighborhoods = assigned hoods via adjacency flood (line 748)

  NEIGHBORHOOD STATE SOURCES (line 1410–1527, per-hood loop):
    BASE: clusterDynamics[cname] (blended & clamped cluster metrics)
    MICROCLIMATE: S.neighborhoodWeather[hood] (fog, hot penalties) @ :1431
    LOCAL SEEDS: seedSignals.byNeighborhood[hood] (weighted story-seed boost) @ :1438
    DEMOGRAPHICS: neighborhoodDemographics[hood] (students/seniors/sick micro-modifiers) @ :1446
    ECONOMY: neighborhoodEconomies[hood] (mood >= 70 / <= 30 adjustments) @ :1460
    CRIME: crimeByNeighborhood[hood] (nightlife/sentiment penalties) @ :1467
    MOMENTUM: prevNhoodState[hood] (30% carry from previousCycleState.neighborhoodDynamics) @ :1485
    POLITICAL FOLD: initiativeNeighborhoodEffects[hood] + approvalNeighborhoodEffects[hood] @ :1499
    COMMUTE LIFT: commuteInbound[hood] (retail +12%, traffic +8% at cap) @ :1506
    RESULT: neighborhoodDynamics[nhood] = nm (clamped) @ :1525

LITERAL CHARACTER/WEIGHTS (per cluster, line 604–620):
  weights: { traffic: 1.0–1.4, retail: 0.9–1.1, tourism: 0.6–1.2, nightlife: 0.9–1.1, 
             publicSpaces: 0.95–1.25, culturalActivity: 1.05–1.1, communityEngagement: 1.05–1.15 }
  capacitySensitivity: 0.6–1.4 (EAST_OAKLAND 0.6 least affected, DOWNTOWN_CORE 1.4 most affected)

CARRY-FORWARD & CONSUMERS
  CARRY-FORWARD: prevNhoodState.neighborhoodDynamics (3-line blend @ :1485–1495)
    30% momentum on: sentiment, nightlife, retail, tourism, publicSpaces, communityEngagement
    Blended PRE-CLAMP, PRE-FOLD: allows same-cycle political effects to land at full strength
  
  CONSUMERS OF S.neighborhoodDynamics:
    phase03-population/updateCrimeMetrics.js:142  @ READ  (fallback {} if absent)
    phase08-v3-chicago/v3NeighborhoodWriter.js:411 @ READ  (per-hood sentiment base input)
    phase09-digest/finalizeCycleState.js:94        @ READ  (compact for snapshot)
    phase10-persistence/buildCyclePacket.js:574    @ READ  (packet log line)

MISSING INPUTS & OVERWRITTEN CONSEQUENCES
  PHANTOM READS (no writer found):
    - S.eventsGenerated (line 103: used as cycle event count; no writer = 0)
    - S.crimeSpikes (line 113: fallback to prevCrimeSpikes if missing)
    - S.mediaCoverage (line 114: fallback to S.mediaCount, neither has writer)
    - S.cityCapacity (line 773: fallback to ctx.config.cityCapacity, non-populated)
  
  ORPHANED WRITES (write but no external reader):
    - S.storySeedSignals (line 1094: 4-level nested structure, zero readers found)
      → Used inside applyCityDynamics_ (line 1259, 1438) but not exposed
    - S.cityDynamicsCapacity (line 1900: full capacity packet, zero readers)
      → Computed every cycle, never read; appears in buildCyclePacket log only (line 576)
    - S.approvalNeighborhoodEffects (line 1573: cleared after fold)
      → Bus pattern: written to (line 1356), folded (line 1499), cleared (line 1573)
      → No tail reader; cycle-only delta channel

  OVERWRITTEN CONSEQUENCES:
    - S.initiativeNeighborhoodEffects cleared @ :1572 after fold (engine.93 Task 5)
    - S.approvalNeighborhoodEffects cleared @ :1573 after fold (same)
    → Both consume-and-clear on PURPOSE: per-cycle delta channels, not state
    → If later phase throws, buses already cleared; next cycle rewrites fresh

═══════════════════════════════════════════════════════════════════════════════
TARGET 2: S.neighborhoodDynamics (field)
═══════════════════════════════════════════════════════════════════════════════

DEFINITION
  Written @ phase02-world-state/applyCityDynamics.js:1898
    S.neighborhoodDynamics = neighborhoodDynamics;
  Schema: { [hood]: { traffic, retail, tourism, nightlife, publicSpaces, sentiment, culturalActivity, communityEngagement } }

CTX MAP
  Field: neighborhoodDynamics
  Writers: phase02-world-state/applyCityDynamics.js::applyCityDynamics_ (line 1898)
  Readers (4):
    phase03-population/updateCrimeMetrics.js:142
    phase08-v3-chicago/v3NeighborhoodWriter.js:411
    phase09-digest/finalizeCycleState.js:94
    phase10-persistence/buildCyclePacket.js:574

READS (all non-write, READ classification):
  phase03-population/updateCrimeMetrics.js:142
    var neighborhoodDynamics = S.neighborhoodDynamics || {};
    Purpose: crime-multiplier per-hood baseline (used line 160–265)
    
  phase08-v3-chicago/v3NeighborhoodWriter.js:411
    var nd = (S.neighborhoodDynamics && S.neighborhoodDynamics[name]) || null;
    Purpose: per-hood dynamics base (sentiment, inputs to texture/write)
    Context: BEFORE Phase-10 executor; texture columns written DIRECT after write-path assembly
    
  phase09-digest/finalizeCycleState.js:94
    neighborhoodDynamics: compactNeighborhoodDynamics_(S.neighborhoodDynamics),
    Purpose: snapshot carry to nextCycle.previousCycleState
    
  phase10-persistence/buildCyclePacket.js:574
    var nhDynamics = S.neighborhoodDynamics || {};
    Purpose: log output (not written to sheet)

PHASE POSITION OF WRITER
  phase02-world-state/applyCityDynamics.js @ Phase2-CityDynamics (godWorldEngine2.js:298)
  — runs BEFORE Phase10-ExecuteIntents (:589)
  — all readers are Phase3+ (after city dynamics is final)

ALL WRITES
  Single WRITE @ line 1898 (see applyCityDynamics_ card above for construction chain)

═══════════════════════════════════════════════════════════════════════════════
TARGET 3: loadCanonNeighborhoods_ (function)
═══════════════════════════════════════════════════════════════════════════════

DEFINITION
  phase01-config/canonNeighborhoodLoader.js:62  function loadCanonNeighborhoods_(ctx)
  Version: v1 (engine.99 Cohort 1 Task 2 — ADR-0016 first application) [ES5-safe]

PHASE POSITION
  production entry  : Phase1-CanonHoods @ godWorldEngine2.js:275   — BEFORE Phase10-ExecuteIntents (:589)
  cycle-phases      : Phase1-CanonHoods @ godWorldEngine2.js:2020  — BEFORE Phase10-ExecuteIntents (:2320)

CALLERS (2 direct)
  phase01-config/godWorldEngine2.js:275   loadCanonNeighborhoods_(ctx)
  phase01-config/godWorldEngine2.js:2020  loadCanonNeighborhoods_(ctx)

S FIELDS (WRITES)
  WRITE canonHoods @ :146  structure: { list, set, core, district, byDistrict, children, childList, weatherZone, attention, character, scenes }
  WRITE canonHoodCount @ :149
  WRITE neighborhoodAdjacency @ :152   source: Neighborhood_Map.Adjacent column (flatten + mirror + validate)

OTHER CTX
  ctx.summary @ :63
  ctx.ss (spreadsheet) @ :65 — getSheetByName('Neighborhood_Map')

SHEET READ PATH
  READ Neighborhood_Map @ :65
    Columns consumed:
    - Neighborhood (required, error if missing) @ :76
    - CoreSimRank (optional, rank-order for core subset) @ :80
    - District (optional, civic.18 4c mapping) @ :81
    - ChildAreas (optional, parent mapping for child zones engine.99 #9) @ :82
    - WeatherZone (optional, engine.148 P2) @ :83
    - Adjacent (optional, engine.148 P2, cluster adjacency flood source) @ :84
    - AttentionWeight (optional, engine.148 P2, 0–2 attention knob) @ :85
    - EmployerCharacter (optional, engine.148 P3, texture pool key label) @ :86
    - Scenes (optional, engine.148 P3, comma-list tag:weight story seeds) @ :87

VALIDATION (FAIL-LOUD, ADR-0016)
  Missing Neighborhood_Map tab → throw (line 66)
  Empty data rows → throw (line 72)
  Missing "Neighborhood" header → throw (line 78)
  Adjacent hood name not on map → throw (line 166)
  EmployerCharacter blank on any hood → throw (getHoodCharacter_, line 213)
  AttentionWeight blank or non-numeric on any hood → throw (getHoodAttention_, line 302)
  Scenes tag malformed → throw (parseSceneTags_, line 197)
  ChildAreas name is itself a hood (circular) → skip, continue (line 131)

EXPOSED HELPERS (read-only accessors, all throw if unseeded)
  getCanonNeighborhoods_(ctx) @ :396  returns S.canonHoods.list copy
  getCoreSimNeighborhoods_(ctx) @ :410  returns S.canonHoods.core copy (empty = throw)
  isCanonNeighborhood_(ctx, name) @ :425  case-insensitive membership test
  resolveHoodOrChild_(ctx, name) @ :441  fold child areas to parent hood (or null)
  getDistrictHoods_(ctx, districtId) @ :382  returns byDistrict[d] copy or []
  getHoodCharacter_(ctx, hood) @ :207  throws if blank (texture pool key)
  getHoodScenes_(ctx, hood) @ :219  returns scenes[hood] or {}
  hoodSceneWeight_(ctx, hood, tag) @ :231  returns weight or 0
  hoodsWithScene_(ctx, tag) @ :237  returns [[hood, weight]] pairs
  getHoodWeatherZone_(ctx, hood) @ :283  throws if blank
  getHoodAttention_(ctx, hood) @ :295  throws if blank/non-numeric
  getAdjacentHoods_(ctx, hood) @ :175  returns adjacency[hood] copy or throws if absent
  eventHoodOrNull_(ctx, name) @ :310  resolves event hood field (null if blank)
  getHoodHeadcount_(ctx, hood) @ :343  returns headcount from ledger or 0
  hoodFloorDeficit_(ctx, hood) @ :356  returns (floor - count) / floor or 0
  underFloorHoods_(ctx) @ :366  returns core hoods below citizen floor
  hoodTexturePool_(ctx, hood, byCharacter, bespoke, caller) @ :265  assembled texture pool (throws if pool missing)
  countTrackedByHood_(ctx) @ :318  returns { hood: count } from ledger (engine.148)

BUILD INTERNALS
  buildAdjacencyFromSheet_(ctx, raw) @ :155
    - Mirrors adjacency (symmetric); validates every name; throws on name not found
    - Called line 152
  
  parseSceneTags_(ctx, hood, raw) @ :187
    - Parses "tag" or "tag:weight" comma-list
    - Throws on malformed weight
    - Called line 124

NO WRITE PATH (read-only function — zero sheet writes, zero intents, zero direct calls)

LITERAL CHARACTER/WEIGHTS
  None in this function (loadCanonNeighborhoods_ reads all authority from Neighborhood_Map)

CARRY-FORWARD
  None; Phase 1 seed only (no prior-cycle state read)

CONSUMERS
  Direct readers of S.canonHoods:
    Phase 2+: all hood/district accessors (getCanonNeighborhoods_, etc.)
    phase03-population/updateNeighborhoodDemographics.js (via getCanonNeighborhoods_)
    phase05-citizens/runNeighborhoodEngine.js (via getCoreSimNeighborhoods_)
    phase06-analysis/applyMigrationDrift.js (via getCanonNeighborhoods_)
    phase07-evening-media/storyHook.js (via isCanonNeighborhood_)
    applyCityDynamics_ (via getCanonNeighborhoods_) @ :640

MISSING INPUTS & CONSTRAINTS
  INPUT GAPS:
    - Neighborhood_Map columns past "Scenes" are author-extended (not enforced)
    - CoreSimRank ties → deterministic stable sort (line 142, rank order)
    - Empty core set → throws (line 415)
    - Blank District cell → hood excluded from byDistrict (design: not a guess)
    - Blank weatherZone → iZone < 0, weatherZone → null in canonHoods (optional)
  
  VALIDATION TEETH (ADR-0016 — never fallback):
    - Missing tab → throw (line 66)
    - Missing column → throw (line 78 Neighborhood; others optional)
    - Off-map Adjacent name → throw (line 166)
    - Off-map child area parent → throw (handled, never guessed)
    - Empty hood name after trim → skipped (dedupe, line 103)

PLAN & OPEN WORK
  docs/plans/2026-08-02-neighborhood-truth-source-migration.md
    Cohort 1 Task 2 complete (line 90); Cohort 2 underway (engine.148 P2/P3)
    Finding #1: live C102 map held 21 hoods; code had 12/18/19-hood lists (drifted namespace)
    Finding #2: child areas (Old Oakland, Brooklyn Basin, Montclair) now ledger truth
    Finding #9: engine.99 child-area fold (resolveHoodOrChild_) unified 3 engine + 1 Node list
    Cohort 2: weather zones (P2) and texture-pool character labels (P3) engine.148

HISTORY (git)
  9fa4cf43 S427 engine.148 P3 — texture pools key by hood's place label; arts/holiday lists are Neighborhood_Map column
  1a20a32f S423 engine.148 P2a — weather zones, adjacency and attention knob are Neighborhood_Map columns
  9dcc2a78 S423 engine.148 Phase 1 — the doors into the ledger see all 22 hoods: migration wave + floor dials on World_Config
  835cb097 S423 engine.99 Finding #9 — child areas become ledger truth: Neighborhood_Map.ChildAreas, one Phase-1 seed, three folds retired
  c962f83f S423 civic.18 4c/4d — the approval engine reads its districts from Neighborhood_Map
  07d61a45 S352 engine.99 Cohort 2 — core-sim subset becomes ledger truth (CoreSimRank)

FILES OPENED (all grep/read operations)
  phase01-config/canonNeighborhoodLoader.js
  phase01-config/godWorldEngine2.js
  phase02-world-state/applyCityDynamics.js
  phase03-population/updateCrimeMetrics.js
  phase08-v3-chicago/v3NeighborhoodWriter.js
  phase09-digest/finalizeCycleState.js
  phase10-persistence/buildCyclePacket.js
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ROLLOUT_PLAN.md
  docs/plans/2026-08-02-neighborhood-truth-source-migration.md
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **132**
- opened by this run: **132** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=22 toolCalls=38 in=990699 out=9820_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._