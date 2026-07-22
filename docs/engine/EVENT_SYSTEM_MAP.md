# Event System Map — Event Ripple Logic and Narrative Flow (engine.32 T1)

**Created:** 2026-06-09 (S255, engine-sheet) · **Updated:** 2026-07-20 (Ripple & Narrative Cascade Update)
**Parent:** [[../plans/2026-05-31-life-event-generation]] (engine.32) · **Companions:** [[TAG_REGISTRY]], `utilities/citizenDialMap.js`, [[ENGINE_COUPLING_MAP]].

This map documents how narrative events are generated, how they shape citizen dials (the O → R → AT spine), and how they ripple outward into the city ecosystem across execution phases. It tracks the transformation of a micro-event into a macro-ripple and eventually into evening media.

---

## 1. The Ripple Spine: Flow of Narrative Events

A citizen event does not happen in isolation. The system bridges micro-level citizen events to macro-level city shifts through a defined ripple pipeline, coordinated across phases:

### Phase 2: World State & Infrastructure Ripples
Macro events trigger baseline ripples that set the daily stage.
- **`applyWeatherModel.js` & `updateTransitMetrics.js`:** Emit discrete `recordRipple_` events for storms, disruptions, and heat waves (SAFETY/CIVIC domains).
- **`applySportsSeason.js` & `applyCityDynamics.js`:** Write tracking events via `recordRipple_` for sports outcomes and crime/sentiment shifts.
- **`applyInitiativeImplementationEffects.js`:** Translates civic policy into `sentimentBoost` and emits `recordRipple_` tracking entries into the Ripple_Ledger.

### Phase 4/5: Citizen Micro-Loops & Stakes Engines
Generators draw upon Phase 2 world states and dial bands.
- **Generational Lifecycle:** Real state mutations (deaths, weddings) cascade into wealth inheritance (`generationalWealthEngine.js`) and structural relationship bonds.
- **Career Engine (`runCareerEngine.js`):** Transitions (promotions/layoffs) emit `careerSignals.businessDeltas`, capturing precise BIZ gained/lost impacts.
- **Trajectory Hooks:** `neighborhoodTrajectoryEngine.js` evaluates housing pressure and momentum, emitting `recordHookRipple_('trajectory', ...)` to the Ripple_Ledger for neighborhood boom/cooling.
- **Pulse Fan-Out:** `recordPulse_` pushes individual citizen public-footprint events up into neighborhood-level metrics (Phase 8).

### Phase 6: Analysis & Economic Ripple
Micro events aggregate back into the city macro.
- **`economicRippleEngine.js`:** The core cross-engine consumer. Reads Phase 5 `careerSignals` (e.g., `layoffs ≥ 3` → `MAJOR_LAYOFFS`), migration drift, and world/citizen events to create broad economic ripples. It recomputes `economicMood` and writes `employmentRate`/`economy` descriptors directly back to `World_Population`.
- **Feedback Loop:** `economicMood` is read by Phase 5 citizen engines *next cycle*, darkening or brightening the entire city's event texture (ripple duration 4–12 cycles).
- **Arc Resolution:** Phase 6 engines (`storylineHealthEngine`, `processArcLifeCycle`) parse events and ripples to advance or resolve city-wide narrative tension arcs.

### Phase 7: Evening Media & Story Contracts
Ripples become digested narrative media for LLMs.
- **`buildContractSeeds.js`:** Queries `ctx.summary.rippleEvents` and accesses GAS Ledgers (e.g., `LifeHistory_Log`, `Faith_Organizations`, `Business_Ledger`) to forge concrete "story seeds" linking raw macro-ripples to specific named entities and citizens.
- **`applyStorySeeds.js`:** Analyzes arcs, world events, and ripples to prioritize hooks and breaking news for media coverage.
- **`mediaRoomIntake.js` & `culturalLedger.js`:** Digests LLM-generated articles, tracks fame/recurring citizens, and writes back `TrendTrajectory` and `MediaSpread` mutations directly to the spreadsheet.

---

## 2. Citizen-Memory Writers (Phase 4/5)

*(Emits into LifeHistory col O + LifeHistory_Log. Layer 1 selection probability coupled to Layer 2 Dial nudges)*

| Generator | Phase | Mode gate | Pools / Events | Dial Seam / Mechanics |
|---|---|---|---|---|
| `generateGenericCitizenMicroEvent.js` | 4 | ENGINE | ~200 ambient texture | `mult.outabout`; pulse feeds Phase 8 nbhd map |
| `generateGameModeMicroEvents.js` | 4 | GAME | ~72 role pools + 7 trait-pools | `mult.outabout`; reads TraitProfile |
| `generationalEventsEngine.js` | 4 | ENGINE+CIVIC | 12 milestones (Graduation, Death, etc.) | Mutates `Status`, `NumChildren`, `MaritalStatus`. Plumbed to `familyFreq`/`careerFreq`. |
| `generateCitizensEvents.js` | 5 | ENGINE (T3-4) | ~100+ weighted pools + T3 fame recognition | Richly individuated via `getCitizenDialBands_` + bonds/arcs. |
| `generateNamedCitizensEvents.js` | 5 | ENGINE | ~50 type-first pools | Type-primary (Skip dial seam) |
| `generateMediaModeEvents.js` | 5 | MEDIA | ~40 role pools | Reads arcs/metrics/votes. (Skip dial seam) |
| `generateCivicModeEvents.js` | 5 | CIVIC | ~40 role pools | Reads actual votes/grants. (Skip dial seam) |
| `runCareerEngine.js` | 5 | ENGINE (T3-4) | transitions [promo/layoff/sector] | `careerFreq`. **Ripples to Phase 6 `economicRippleEngine`** |
| `runRelationshipEngine.js` | 5 | ENGINE (T3-4) | ~60 bond/arc-aware events | `mult.sociability`. Pushes to Bond Engine loop. |
| `runHouseholdEngine.js` | 5 | ENGINE (T3-4) | ~70 home/family texture | `familyFreq`. MaritalStatus/NumChildren gates pools. |
| `runEducationEngine.js` | 5 | ENGINE (T3-4) | ~50 learning texture | `mult.openness` |
| `runNeighborhoodEngine.js` | 5 | ENGINE (T3-4) | ~70 neighborhood mood + holiday | `mult.outabout`. Assigns Neighborhood if missing. |
| `runConductEngine.js` | 5 | ENGINE (T3-4) | petty/serious/grave/resist | **CORE:** `crimeReachable` gates commit. |
| `runYouthEngine.js` | 5 | (none) | academic/sports/civic/resilience | `mult.drive` |

---

## 3. Context Producers & Fan-Outs

| Engine | Phase | Output / Ripple Focus |
|---|---|---|
| `buildCityEvents.js` | 4 | `S.cityEvents[]`. **T8 Fan-Out:** feeds prev-evening carry-forward to Phase 5 citizensEvents. |
| `worldEventsEngine.js` | 4 | `S.worldEvents[]`. The global bus. Creates "chaos" for citizen events; read by Phase 6 pattern detection. |
| `faithEventsEngine.js` | 4 | `S.worldEvents` (FAITH). `recordPulse_` updates neighborhood faith sentiment. |
| `bondEngine.js` | 5 | Relationship_Bonds + Bond_Ledger. Closes social loop: events → active-citizens → bonds → event probability. |
| `chaosCarsEngine.js` | 4 | Writes `Chaos_Cars`. Tri-scope impact: citizen (trauma dial), business (revenue), and neighborhood (metrics). |
| `civicInitiativeEngine.js` | 5 | Mutates `Initiative_Tracker`. Triggers neighborhood sentiment/economic ripples upon vote outcome. |

---

## 4. The Compressor (O → R → AT)

The entire ripple ecosystem ultimately depends on the Phase 9 **Compressor** (`compressLifeHistory.js`), which resolves events back into citizen identity (dials):

1. **O (Observations):** Raw lines placed into `LifeHistory` log by the generators.
2. **R (Resolution):** Once every 5 cycles, raw lines aging out of the 20-entry window are mapped to `citizenDialMap.js`. The event's tag resolves to a delta (e.g., `Birth` → `family:10`, `Layoff` → `drive:-4`) and hardens permanently into the citizen's `DialState` (base + streak).
3. **AT (Atmosphere/Traits):** The resultant `DialState` determines the bands (0.5–1.5x) accessed by `getCitizenDialBands_` in Phase 5.
   - **Drive** scales Career/Youth events.
   - **Sociability** scales Relationships.
   - **Family** scales Household.
   - **Openness** scales Education.
   - **Outabout** scales Neighborhood/Ambient.
   - **Integrity / Composure** scales Conduct and reflection texture.

By closing this loop, the engine ensures every generator's output organically feeds back into both the city's macro-economy (Phase 6) and the individual's micro-tendencies (Phase 9/5), leaving zero inert data.
