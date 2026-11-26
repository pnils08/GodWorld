Now I have a complete picture. Let me compile the wiring card:

```
WIRING CARD — S.nightlife (field)   map: 2026-11-21 / 179 files   

DEFINITION
  phase07-evening-media/buildNightLife.js:277  S.nightlife = { spots, spotDetails, volume, vibe, movement, weatherImpact, trafficLoad, economicInfluence, calendarContext }   v2.4 (engine.356)

PHASE POSITION (WRITER: buildNightlife_)
  production entry : Phase7-Nightlife @ godWorldEngine2.js:765  — BEFORE Phase10-ExecuteIntents (:896)
  cycle-phases     : Phase7-Nightlife @ godWorldEngine2.js:2484  — BEFORE Phase10-ExecuteIntents (:2595)

READERS (7)
  phase01-config/godWorldEngine2.js:2042  S.nightlife ? JSON.stringify(S.nightlife) : ""
  phase07-evening-media/cityEveningSystems.js:58  var nightlife = S.nightlife || {}
  phase07-evening-media/applyStorySeeds.js:1458  var nightSpots = (S.nightlife && S.nightlife.spotDetails) || []
  phase09-digest/finalizeCycleState.js:401  var nightlife = S.nightlife || {}
  phase10-persistence/buildCyclePacket.js:440  var nightlife = S.nightlife || {}
  phase07-evening-media/buildMediaPacket.js:312  var nightlife = s.nightlife || {}
  scripts/livedExperiencePacket.js:257  ...(texture.nightlife || []).map(v => v && v.name)  [PROSE-PARSER: parsing names]

S FIELDS READ BY buildNightlife_
  READ  season @ :53   (S.season, no fallback)
  READ  weather @ :54   (S.weather)
  READ  weatherMood @ :55   (S.weatherMood)
  READ  worldEvents @ :56   (S.worldEvents)
  READ  cityDynamics @ :57   (S.cityDynamics)
  READ  economicMood @ :63   (S.economicMood)
  READ  holiday @ :68   (S.holiday)
  READ  holidayPriority @ :69   (S.holidayPriority)
  READ  isFirstFriday @ :70   (S.isFirstFriday)
  READ  isCreationDay @ :71   (S.isCreationDay)
  READ  sportsSeason @ :72   (S.sportsSeason)
  READ  sportsCity @ :75   (S.sportsCity)
  READ  neighborhoodEconomies @ :96   (S.neighborhoodEconomies)
  READ  neighborhoodDynamics @ :109   (S.neighborhoodDynamics)
  READ  sportsZones @ :127   (S.sportsZones)

OTHER CTX
  ctx.rng (via safeRand_) @ :47

WRITE PATH
  None (no queueCellIntent_, queueAppendIntent_, queueRangeIntent_, queueReplaceIntent_, setValue, setValues, appendRow, clearContent, deleteRows, insertSheet, or getRange calls detected in body)

OPEN WORK
  engine.356  the night's spots come from the ledger (builder 2026-11-21: "The businesses should come from the ledger"). Repo only — NOT on PROD, no sandbox run, no test run (both blocked by the builder); out to agy for a read.  | ROLLOUT_PLAN.md:65 (engine.289 — Evening culture and nightlife land on their hood)
  engine.289  Evening culture and nightlife land on their hood: LIVE stage 49 @184 (bench C117/C118 PASS). Read C117 Sun 2026-11-22: seed carry + the bars log line | ROLLOUT_PLAN.md:65
  docs/plans/2026-11-16-evening-reaches-the-hoods.md
  docs/plans/2026-11-21-a-moment-has-a-place.md
  docs/plans/2026-09-13-run-cycle-packages-the-world.md (mentions nightlife multiple times; related context)

HISTORY
  b2cd0177  engine.356: the night's spots come from the ledger
  aa2eac7f  engine.281 (a1): the row-named numeric phase-word sites read the week's band
  c3c38aa0  engine.273 wave 2 A: dropped-holiday branches, lists and pools deleted
  fbd796e3  engine.240h (kimi review): the holiday seed bank, the First Friday / Creation Day seeds
  17233d75  engine.240g: chaos / upscale / budget venues open where the condition is, not on pinned hoods
  2119396c  S180 engine-sheet: ENGINE_REPAIR Row 12 — utilityFunctions rng threading

FILES OPENED
  phase07-evening-media/buildNightLife.js
  phase01-config/godWorldEngine2.js
  phase07-evening-media/cityEveningSystems.js
  phase07-evening-media/applyStorySeeds.js
  phase09-digest/finalizeCycleState.js
  phase10-persistence/buildCyclePacket.js
  phase07-evening-media/buildMediaPacket.js
  scripts/livedExperiencePacket.js
  scripts/eveningSeedHoods.test.js
  scripts/hoodBlindTables.test.js
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **127**
- opened by this run: **127** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=28 toolCalls=31 in=667987 out=4863_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._