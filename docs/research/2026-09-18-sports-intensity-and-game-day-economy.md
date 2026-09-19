---
title: Sports intensity, reach and the game-day economy — design research
created: 2026-09-18
updated: 2026-09-18
type: reference
tags: [research, engine, sports, economy, active]
sources:
  - engine-sheet request 2026-09-18 (Mike-routed) — design research for plan Task 3 (engine.204), Task 4 (engine.205), Task 10
  - scripts/ctxMap.js run 2026-09-18 on sportsSeason / sportsZones / sportsSeasonByTeam / baylightOpenings / sportsFeedEntries — the reader census
  - Direct read of every numeric branch site cited in §1 (file:line per row)
  - Live sheets read 2026-09-18 through lib/sheets.getRawSheetData, read-only — Oakland_Sports_Feed (227 rows, through C108), Riley_Digest, Ripple_Ledger, Transit_Metrics, Neighborhood_Map, World_Population, Carry_Forward_Store, Crime_Metrics
pointers:
  - "[[../plans/2026-09-11-sports-as-a-lived-system]] — the plan; Tasks 3 / 4 / 10 consume this file"
  - "[[2026-09-11-sports-feed-ingest-contract]] — sibling research: column readers and the sentiment formula (§1-6), not repeated here"
  - "Sibling research (Mike-direct S446): every sports research file cross-points to the others and all of them feed the plan."
  - "[[../engine/ROLLOUT_PLAN]] — engine.204 / engine.205 carry pending state"
  - "[[../SIM_DOCTRINE]] §15 relative bands, §16 drift"
  - "[[index]] — registered here"
---

# Sports intensity, reach and the game-day economy — design research

**Source.** The engine's own sports consumers and the live world. The consumer census came from `scripts/ctxMap.js`, followed by a direct read of each numeric branch. The live data came from eight tabs, read-only, on 2026-09-18. Engine-wiring cards were not dispatched. Step 1 of a field card is this same `ctxMap.js` output, and the plan records Haiku cards failing or misstating paths twice, with direct verification as the accepted fallback (plan Task 0 and Task 1 card notes). Every pointer below was read this session.

**What this addresses.** This file covers plan Task 3 (engine.204, intensity and reach), Task 4 (engine.205, the game-day economy) and Task 10 (per-franchise state). engine.202's `WeekRecord` makes per-franchise weekly facts real: games, W-L, home/away and first result. This file maps what those facts would feed, measures what the engine does today, sets out candidate formulas, and lists the sim questions those formulas raise. It designs nothing final — the rulings are Mike's (§6).

**Constraints carried in (ruled):**
- The phase never supplies the magnitude. The record supplies it and the phase only scales it (S446).
- No reactivating phase-only boosts as a shortcut (2026-09-16).
- `sportsAtmosphereEnabled` stays false on feed cycles.
- Effects run in both directions.
- §15 relative bands and §16 drift apply.
- `ctx.rng` only; no new tabs.
- Franchise weight (Task 9) is an input slot `W_f`, not designed here.

---

## 1. Every consumer of the sports state (ask 1)

### 1.1 Counts

| Field | Written at | Readers |
|---|---|---|
| `S.sportsSeason` | applySportsSeason.js:35 / :98 / :125; v3preLoader.js:51 (default) | **55 reader sites** (ctxMap). Also read as `cal.sportsSeason` / `summary.sportsSeason` in economicRippleEngine, bondEngine, mediaFeedbackEngine, buildMediaPacket, mediaRoomIntake and v3ChicagoWriter |
| `S.sportsZones` | applySportsSeason.js:53 / :108 / :136 | **8**: applyInitiativeImplementationEffects.js:124, :299 · updateTransitMetrics.js:673 · generateCrisisSpikes.js:272 · economicRippleEngine.js:185 · buildEveningFamous.js:661 · buildEveningFood.js:72 · v3NeighborhoodWriter.js:363 |
| `S.sportsSeasonByTeam` | applySportsSeason.js:48 / :97 / :127 | **0 — orphaned write** |
| `S.baylightOpenings` (the per-team venue history) | applySportsSeason.js, both paths | **0 — orphaned write** |
| `S.sportsFeedEntries` | applySportsSeason.js:70 | **7**: updateTransitMetrics.js:668, :767 · applyGameNightMoments.js:73 · generateCitizensEvents.js:1697 · casinoLedgerEngine.js:617 · sportsStreaming.js:35 · buildEveningMedia.js:375 |
| `S.sportsNeighborhoodEffects` | applySportsSeason.js:633, :657 | **1**: cityEveningSystems.js:420 (reads `.traffic` only) |
| `S.sportsSentimentBoost` | applySportsFeedTriggers_ | **2**: applyCityDynamics.js:1703 · generateCitizensEvents.js:1707 |

The sites fall into four classes:
- **A:** numeric, and the value reaches a persisted column, so it can be measured.
- **B:** numeric, but only inside the cycle (selection weights, chances, scores, counts).
- **C:** label, prose, pool or tag, with no number.
- **D:** dark on feed cycles, gated by the atmosphere flag or the config override.

### 1.2 Class A — numeric, reaches a persisted column

| Site | Constant / gate | Persisted surface | Measured, C101–C107 |
|---|---|---|---|
| `updateWorldPopulation_` godWorldEngine2.js:1087-1091 — **ungated** | migration += rng×60 championship / ×40 playoffs / ×20 late-season | World_Population.migration (a single row, overwritten each cycle) | C107 = 1212; the tab keeps no history |
| same function :970-973, :1138-1141 | employment +0.001 / +0.0006. On championship the economy label steps stable→strong→`booming` in one pass, because the two `if`s are sequential | Not written to the sheet since engine.102 (:1146-1151). `S.worldPopulation.economy` is read by applyStorySeeds.js:215 and by the Cycle_Packet "Economy:" line (buildCyclePacket.js:191) | not measurable from sheets |
| `applySportsModifiers_` applyCityDynamics.js:425-445, called per cluster at :1106; reads the phase at :77 (manual override :79) | preseason sentiment +0.02 · in-season +0.02, nightlife ×1.05 · mid-season traffic ×1.2, nightlife ×1.1, +0.04 · late-season ×1.3 / ×1.2 / +0.06 · postseason ×1.4 / ×1.3, communityEngagement ×1.2, **+0.20** · finals ×1.5 / ×1.5, publicSpaces ×1.3, communityEngagement ×1.4, **+0.35** | S.cityDynamics → Riley_Digest W–AB (CityTraffic … CitySentiment) and the World_Population loads | CityTraffic 0.81–1.11 · NightlifeLoad 0.70–1.64 · CitySentiment 0.00–0.84. The sports share can't be separated from weather and holidays |
| `applySportsFeedTriggers_` → `processFeedSheet_` applySportsSeason.js:626-700 | sentiment clamp ±0.10 per team; per-hood traffic/retail/nightlife/communityEngagement land on each row's `HomeNeighborhood` | Ripple_Ledger sports rows; finalCity.sentiment | sentiment 0.001 / 0.003 / 0.021 / 0.008 / 0.029 / 0.028 / **0.094**; per-hood traffic 0.18–0.28 |
| economicRippleEngine.js:442-452 — exact-word test on `cal.sportsSeason` | CHAMPIONSHIP_BOOM impact 15, duration 3 · PLAYOFF_SPENDING 8, duration 3 · SPORTS_CHAMPIONSHIP 10, duration 4 on OpeningDay (templates :45, :62-63) · ×1.5 on SPORTS types in championship (:648) | Ripple_Ledger economic-event rows | PLAYOFF_SPENDING at C105 (9.6), C106 (8), C107 (9.6). The 3-cycle carryovers stack: C107 had three live ripples in Jack London (9.6 + 5.33 + 3.2) |
| economicRippleEngine.js:773-776 | city economic mood +2 playoffs / +4 championship | not traced this pass | — |
| economicRippleEngine.js:947-950, :964 | zone hoods' localMood +5 playoffs / +8 championship; `isSportsZone` flag | per-hood economy — persistence not traced this pass | — |
| v3NeighborhoodWriter.js:624-636 — **hardcoded** Jack London / Downtown; Baylight profile :363-372 | playoffs: JL eventMod ×1.5, nightlifeMod ×1.4 · championship: JL ×2.0 / ×1.8 / noise ×1.5, Downtown event ×1.5 | Neighborhood_Map EventAttractiveness / NightlifeProfile / NoiseIndex, and the SportsSeason column (22 of 22 hoods) | C107: JL EventAttractiveness **47.13 vs city median 19.63 (2.40×)**, NightlifeProfile 1.78 vs 0.90 (1.98×); Downtown 1.52× / 1.41× |
| applyMigrationDrift.js:300-316 (phase map :122-133) | drift += rInt(12) finals / 8 postseason / 5 late / 3 in-season / 2 preseason, × manual intensity | Riley_Digest MigrationDrift | −8 … 18 |
| applyCivicLoadIndicator.js:308-316 | score +4 championship / +2 playoffs | Riley_Digest CivicLoad | load-strain ×5, minor-variance ×2 |
| applyCycleWeight.js:367-379 | score +4 / +2 / +1 late-season | Riley_Digest CycleWeight | `high-signal` 7 of 7 — saturated |
| cityEveningSystems.js:201-202, :262-266, :320-325 (**hardcoded** JL / Downtown / Lake Merritt), :420-429 | trafficScore +4 / +3 · volume +3 / +2 · crowd: championship JL +4, Downtown +3, Lake Merritt +2; playoffs JL +3, Downtown +2 · crowd += round(traffic×10) for each HomeNeighborhood | Carry_Forward_Store PREV_EVENING_JSON `crowdHotspots` | JL is a hotspot at C105, C106 and C107. C107's hotspots are JL / Fruitvale / Downtown, and Fruitvale is a feed HomeNeighborhood |
| bondEngine.js:769-775, :1128-1130, :1193-1206 — **hardcoded** `['Jack London','Downtown']` | SPORTS_RIVAL intensity +1.5 / +1.0 / +0.5 · at least 3 new bonds in championship · new rival bonds at 30% for pairs in JL or Downtown (playoffs and championship) | Relationship_Bond_Ledger | not measured this pass |
| updateTransitMetrics.js:135-136, :370-375, :506-510, :579 — `isGameDay_` (:765) is **true on any feed row**; `gameDayHoodsFor_` (:666) = every row's HomeNeighborhood ∪ sportsZones | GAMEDAY_RIDERSHIP_BOOST 0.3, GAMEDAY_TRAFFIC_INCREASE 0.25 (:85-86); ×1.25 (:579) | Transit_Metrics RidershipVolume / TrafficIndex / Notes / Factors | C107 is the first measurable cycle: 12 of 18 rows tagged game day. Game-day stations average 5,268 riders vs 3,051 elsewhere. That is not a controlled lift — the downtown stations are the network's largest |
| generateGenericCitizens.js:325-328 | baseCount +1 in championship; +1 at 40% in playoffs | Generic_Citizens new rows | not measured |
| domainTracker.js:237-243 | SPORTS +3 / +2 / +1; COMMUNITY +1 in championship | Domain_Tracker | not measured |
| culturalLedger.js:335-341 | fameBonus +6 / +4 / +2 for Sports-domain figures | Cultural_Ledger | not measured |
| v3ChicagoWriter.js:288-289 | **Oakland's** phase moves Chicago sentiment +0.15 playoffs / +0.30 championship | Chicago_Feed | not measured — flagged, out of scope |

### 1.3 Class B — numeric, in-cycle only

- **generateCrisisSpikes.js:** base chance +0.08 championship / +0.05 playoffs (:103-108). SAFETY domain weight +0.30 / +0.15 (:191-194). A +0.3 weight on zone hoods, OpeningDay or championship only; this reads `sportsZones` (:272-275). Severity pool raised on championship (:307-308).
- **generateCitizensEvents.js:** event chance +0.015 / +0.01 (:2181-2182). The game-night pool (:1697-1707) takes the first row whose EventType contains `game`. Its weight is min(4, 1.1 × (1 + 3·min(1, |boost|/0.15))).
- **Scoring, emergence and filtering:**
  - checkForPromotions.js:276-279 — emergence +0.04 / +0.02.
  - applyNamedCitizenSpotlight.js:379-387 — +5 / +3 / +1, and the threshold drops by 1 at :460.
  - prioritizeEvents.js:269-271 — +6 / +4 / +2.
  - filterNoiseEvents.js:121-122 — keeps sports events.
  - applyPatternDetection.js:135 — counts the cycle as a high-activity period.
- **applySeasonWeights.js:347-370:** sportsWeight ×1.2–2.5 and eventWeight ×1.1–1.5. Only eventWeight is read, by worldEventsEngine.js:60 (plan Task 0).
- **seedCalendarBoost_ (applyCityDynamics.js:800, sports branch :822-827):** postseason +0.22 for nightlife clusters / +0.12 elsewhere; finals +0.30 / +0.18.
- **mediaFeedbackEngine.js:** hopeFactor +0.1 / +0.2 / +0.3, celebrityBuzz and trend amplification (:271-289). Sports topic ×1.5 / ×2.0 (:1344). Twelve more branches in the same file.
- **Evening draws** (these land in Riley_Digest NightLife / EveningFood / FamousPeople as JSON draws — countable, but not a dial):
  - buildNightLife.js:298-303, :426-427 (volume +3 / +2), :448, :480-483, :513.
  - buildEveningFood.js:102-104 (sports hoods weighted 3 / 2 / 1), :119 (4 restaurants in championship), :122 (2 fast-food draws unless off-season).
  - buildEveningFamous.js:330-335, :430.
- **Domain bookkeeping:** applyDomainCooldowns.js:91 · v3DomainWriter.js:278-283 · applyCycleRecovery.js:43-49.

### 1.4 Class C — label, prose, pool or tag

- finalizeWorldPopulation.js:213 (log) · generateCrisisBuckets.js:207 (column) · generationalEventsEngine.js:232
- worldEventsEngine.js:90-96 (the IN_SEASON athlete pool; playoff and championship flavor needs the maker override), :410, :422
- generateCitizensEvents.js:802 (tag), :2402 (pools) · generateMediaModeEvents.js:156, :216, :285 · generateCivicModeEvents.js:84 · runHouseholdEngine.js:375-378
- checkForPromotions.js:463-466 · generateGenericCitizens.js:582, :731-734 · bondPersistence.js:170, :278
- storyHook.js:630-652 · textureTriggers.js:325-337 (**hardcoded** JL / Downtown) · applyStorySeeds.js:955 (seed venue `manualSportVenue || 'Jack London'`)
- buildMediaPacket.js:91-92, :369-372 · buildEveningMedia.js:459-461 · sportsStreaming.js:36 · mediaRoomIntake.js:204, :407, :474
- chicagoSatellite.js:69 · v3Integration.js:75 · v3DomainWriter.js:152 · applyCompressionDigestSummary.js:205-208 · finalizeCycleState.js:87 · recordWorldEventsv25.js:66, :95 · compileHandoff.js:213, :859

### 1.5 Class D — dark on feed cycles

**Gated on `sportsAtmosphereEnabled` — 8 sites.** applySeasonWeights left this set at engine.210.
- calendarChaosWeights.js:33 — its output has no consumer
- updateNeighborhoodDemographics.js:97, :556-566 — **hardcoded** JL / Downtown inflow ×2.0 / ×1.5
- deriveDemographicDrift.js:69, :175-185
- applyDemographicDrift.js:123, :306-310, :372-373
- buildCityEvents.js:75, :528-536, :667
- generateGameModeMicroEvents.js:91, :425-427, :508-510
- generateGenericCitizenMicroEvent.js:79, :386-392, :488-489
- runEducationEngine.js:159, :326-329

**Gated on the config override:** applyShockMonitor.js:143-150 · worldEventsEngine.js:95-96.

### 1.6 Structural findings

1. **No consumer reads per-franchise state.** `S.sportsSeasonByTeam` and `S.baylightOpenings` are written every cycle and read by nothing. Every consumer sees the MAX-depth string. Task 10 therefore starts from zero per-franchise readers, not from a collapse partway down the pipeline.
2. **The phase-only boosts the ruling kept guarded are live in an ungated sibling.** The 2026-09-16 ruling kept the population and economy guards in applyDemographicDrift and updateNeighborhoodDemographics. But `updateWorldPopulation_` (Phase3-Population, godWorldEngine2.js:309 / :2058) has its own ungated copies:
   - migration +rng×20 / 40 / 60, persisted (:1087-1091);
   - employment +0.0006 / +0.001 (:970-973);
   - the championship `booming` label (:1138-1141), which goes into `S.worldPopulation` and is read by applyStorySeeds.js:215 and the Cycle_Packet "Economy:" line (buildCyclePacket.js:191).

   So every cycle carries two economy labels: this pre-drift one and `S.demographicDrift.economy`. Recorded here, not fixed — Task 4 owns it.
3. **Four numeric sites hardcode Jack London / Downtown instead of reading `S.sportsZones`:** bondEngine.js:1194, cityEveningSystems.js:320-325, v3NeighborhoodWriter.js:624-636, and updateNeighborhoodDemographics.js:556-566 (dark). Two prose sites do the same: textureTriggers.js:325-337 and applyStorySeeds.js:955. From the cycle a franchise opens in Baylight, these keep sending the crowd to the old hoods. This is Task 3(b)'s work.
4. **Game-day geography is where the story was set, not where the game was.** `gameDayHoodsFor_` unions every row's HomeNeighborhood, and `isGameDay_` is true on any feed row, games or not. The C107 rows set in Eastlake, Glenview, Fruitvale and Downtown put 12 of 18 transit rows on "game day". The same field carries `sportsNeighborhoodEffects`. From C101 to C107 the per-hood sports rows landed in Temescal, Laurel, West Oakland, Grand Lake, Old Oakland, Baylight District, Eastlake and Fruitvale, as well as JL and Downtown.
5. **Game night keys on the EventType label, not on games.** generateCitizensEvents.js:1697-1700 takes the first row whose EventType contains `game`. Ripple_Ledger's game-night texture rows:

   | Cycle | Citizen-days | What the feed recorded |
   |---|---|---|
   | C101 | 57 | an Oaks summer-league `0-0` row |
   | C102–C104 | **none** | 42 A's games (17-2, 17-3, 2-1), but no `game-result` row |
   | C105 | 37 | |
   | C106 | 48 | the A's played nothing; one Oaks summer-league loss |
   | C107 | 74 | |
6. **The last row sets the phase, not the games.** `deriveSeasonByTeamFromFeed_` (applySportsSeason.js:370-385) lets the later row win:
   - C105: one regular-season game, then a `playoffs` team-update, so the city ran as playoffs (PLAYOFF_SPENDING 9.6).
   - C106: zero A's games, still playoffs (PLAYOFF_SPENDING 8).
   - C108: ALCS games, then a `championship` season-state row (§1.7).
7. **A sports-calendar read survives.** applyShockMonitor.js:76-85 derives an "in-season" phase from `S.simMonth` (months 4–10; written every cycle by advanceSimulationCalendar.js:209) on non-override cycles, and raises the event and chaos thresholds by 1 (:154-157). That is the sports calendar the fourth ruling block retired.
8. **Nothing moves down except the sentiment record term.** Every Class A and B site adds, multiplies by ≥1, or adds to a draw pool, and every one keys on {late-season, playoffs, post-season, championship}.
   - Multipliers can go below 1, and additive terms can take a negative intensity as-is: the cityDynamics multipliers, migration drift, civic load, crowd and ripple impact.
   - Pool concatenations cannot. A losing week needs a different pool, not a smaller one.
9. **The sentiment clamp nearly fired.** C107's sports sentiment was 0.094 against the ±0.10 clamp. The postseason series records (1-0, 2-1, 3-1) parsed, where the C105 and C106 `0-0` rows had not. The sibling's "the clamp has never fired" line now has a near-miss one cycle old.

### 1.7 C108 expectation (authored in the feed, not yet fired)

The C108 A's rows end on `championship` — a season-state row reading "the table is set for the World Series". `deepestSportsPhase_` will therefore give the city `championship`, even though the games actually played in C108 were the ALCS (4-1). This is the first feed-driven championship cycle in the C101–C108 range, and every championship branch in §1.2–1.3 fires on the word alone:
- CHAMPIONSHIP_BOOM (15, × 1.5 for SPORTS types).
- Crisis base chance +0.08, SAFETY weight +0.30, and a raised severity pool.
- Sentiment +0.35 per cluster, plus finals traffic ×1.5 and nightlife ×1.5.
- The economy label goes stable→`booming` via the sequential `if`s.
- Migration +rng×60.
- Four restaurants, the nightlife "fan-surge" setting, and crowd JL +4 / Downtown +3 / Lake Merritt +2.

This is an expectation for engine-sheet's C108 smoke test, not a defect claim.

---

## 2. Weekly facts, measured (proxy)

No live row has a `WeekRecord`. The games played and week W-L below are **proxy** values, rebuilt from `Team Record` changes across a cycle's rows plus the Notes. Home/away is **unrecoverable**, except where Notes name a venue: C108 games 1–2 were in Oakland and game 4 in Minnesota. The other C107/C108 venues are inferred from MLB series format only.

| Cycle | A's games | A's W-L | A's phase (engine) | Oaks games | Oaks W-L | City phase today | Sports sentiment | Sports ripples | Game-night citizen-days |
|---|---|---|---|---|---|---|---|---|---|
| 101 | 17 | 13-4 | mid-season | 0 | `0-0` summer-league row | mid-season | 0.001 | — | 57 |
| 102 | 19 | 17-2 | late-season | 0 | — | late-season | 0.003 | — | 0 |
| 103 | 20 | 17-3 | late-season | 1 | 0-1 | late-season | 0.021 | — | 0 |
| 104 | 3 | 2-1 | late-season | 1 | 0-1 | late-season | 0.008 | — | 0 |
| 105 | 1 | 1-0 | playoffs (set by the last row) | 1 | 0-1 | playoffs | 0.029 | PLAYOFF_SPENDING 9.6 | 37 |
| 106 | 0 | — | playoffs | 1 | 0-1 | playoffs | 0.028 | PLAYOFF_SPENDING 8, plus a carryover | 48 |
| 107 | 4 | 3-1 (ALDS) | playoffs | 0 | — | playoffs | 0.094 | PLAYOFF_SPENDING 9.6, plus two carryovers | 74 |
| 108 | 5 | 4-1 (ALCS) | championship (set by the last row) | 1 | 0-1 (NBA preseason game 1) | championship | not fired | not fired | not fired |

The Oaks' C103–C106 rows are labeled `preseason` but were summer-league games: C101's Notes say summer league starts at C103, and C108's say the NBA preseason "officially begins". The alias table maps both to preseason, so the phase depth is unaffected.

**Cadence finding: a cycle carries anywhere from 0 to 20 A's games.** The late regular season packed 17–20 games into each of C101–C103, the playoffs 4–5, and C106 none. A "week of games" is not a fixed volume. Any intensity built on raw game count must saturate or be banded, or the late regular season will outweigh the World Series.

**City loads for the same cycles** (Riley_Digest, C101→C107). These are the baselines any relative band would sit on:
- CityTraffic 1.03 / 0.81 / 0.92 / 0.85 / 1.05 / 1.11 / 1.11
- NightlifeLoad 1.08 / 0.70 / 0.95 / 1.14 / 1.64 / 1.00 / 1.04
- CitySentiment 0.21 / 0.00 / 0.44 / 0.42 / 0.84 / 0.25 / 0.51

Weather (rain at C104–C105, fog at C107) and holidays confound all three, so no sports share is claimed.

**Transit.** Ridership swung between 22,815 and 85,857 across C101–C107. The peaks at C101 (68,602) and C106 (85,857) can't be pinned on sports from the ledger: C106's gridlock ripple credits "7 major event(s) in town". The Factors column also reads `undefined` on every row before C107, so pre-C107 game-day tagging is unmeasured, not zero.

---

## 3. Candidate intensity formulas (ask 2)

**Inputs** (per franchise *f*, per cycle, from `WeekRecord` plus existing fields):
- `g` = games played, `w` / `l` = the week's wins and losses, `h` = home games.
- `d` = `SPORTS_PHASE_DEPTH_` of the franchise's phase (applySportsSeason.js:331-342).
- `ps(d) = d/6`, giving preseason 0.17, mid 0.50, late 0.67, playoffs 0.83, championship 1.00.
- `vol(g) = 1 − e^(−g/3)`. This saturates: one game is 0.28, three are 0.63, five are 0.81, and 17 or more are about 1.0.
- `dir = (w − l)/g`, from −1 to 1 (0 when no games were played).
- `W_f` = Task 9's franchise weight, set to 1 below.

| | Formula | Meaning |
|---|---|---|
| K1 | vol(g) × ps(d) | Unsigned intensity: how much sport happened, at what stakes |
| K1′ | vol(g) × ps(d of the games) | Same, but using the phase the games were played in, not the last row's |
| K1lin | min(g,7)/7 × ps(d) | Linear alternative, capped at one real week of baseball |
| K2 | K1 × dir | Signed: winning adds, losing subtracts |
| K4 | K1 × (week win% − prior season win%)/0.5 | Signed against the franchise's own middle — its expectation |
| K5 | ps(d) × 2·\|season win% − .5\| | Stakes — what the week meant, with no volume |

**Measured on the proxy facts from §2.** `d(dg)` = the engine's phase depth, with the depth of the games' phase in brackets.

| Cycle | Team | g | W-L | d(dg) | K1 | K1′ | K1lin | K2 | K4 | K5 |
|---|---|---|---|---|---|---|---|---|---|---|
| 101 | A's | 17 | 13-4 | 3(3) | 0.50 | 0.50 | 0.50 | 0.26 | 0.01 | 0.26 |
| 102 | A's | 19 | 17-2 | 4(4) | 0.67 | 0.67 | 0.67 | 0.53 | 0.18 | 0.37 |
| 103 | A's | 20 | 17-3 | 4(4) | 0.67 | 0.67 | 0.67 | 0.47 | 0.10 | 0.38 |
| 104 | A's | 3 | 2-1 | 4(4) | 0.42 | 0.42 | 0.29 | 0.14 | −0.10 | 0.38 |
| 105 | A's | 1 | 1-0 | 5(4) | 0.24 | 0.19 | 0.12 | 0.24 | 0.10 | 0.47 |
| 106 | A's | 0 | — | 5(5) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.47 |
| 107 | A's | 4 | 3-1 | 5(5) | 0.61 | 0.61 | 0.48 | 0.31 | −0.04 | 0.42 |
| 108 | A's | 5 | 4-1 | 6(5) | 0.81 | 0.68 | 0.71 | 0.49 | 0.08 | 0.56 |
| 103–106, 108 | Oaks | 1 each | 0-1 each | 1(1) | 0.05 | 0.05 | 0.02 | −0.05 | 0.00 | 0.17 |
| 101, 102, 107 | Oaks | 0 | — | 1(1) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 / 0.00 / 0.17 |

**City combination** (W_f = 1, C101→C108):
- SUM of K1: 0.50 / 0.67 / 0.71 / 0.47 / 0.28 / 0.05 / 0.61 / 0.86.
- MAX of K1 differs only where both franchises played: +0.05 at C103, C104 and C108.
- SUM of K2: 0.26 / 0.53 / 0.42 / 0.09 / 0.19 / −0.05 / 0.31 / 0.44.

**What the numbers say:**
- **The phase-only engine and K1 disagree exactly where it matters.**
  - C105 and C106 run as playoffs today (PLAYOFF_SPENDING 9.6 and 8). K1 reads them 0.24 and 0.00: one regular-season game, then none.
  - C103 (20 games, 17-3) gets no economic ripple today. K1 reads it 0.67, second-highest in the range.
  - C108's phase word says championship. K1′, which uses the phase of the games, reads 0.68 against K1's 0.81 — the stakes of the ALCS, not of a World Series that hasn't started.
- **K2 makes losing cost something, but only the Oaks lose in this range.** They score −0.05 a week, too small to show against the A's. The A's worst week (C104, 2-1) still scores +0.14. In the live data, "both directions" comes mostly from volume falling (C104–C106), not from results.
- **K4 turns the dynasty into the baseline.** A 2-1 week reads −0.10 against a .785 team, and 13-4 reads +0.01. That makes the A's excellence invisible and their normal weeks a mild letdown. It is a sim call, not a mechanism call (§6 Q3).
- **K1lin punishes short weeks harder:** C104 0.29 instead of 0.42, C105 0.12 instead of 0.24.
- **A relative band on K1 supplies the downside by construction (§15).**
  - Take the A's K1 over the trailing median of their own nonzero prior weeks: C102 1.34, C103 1.14, C104 0.63, C105 0.41, C106 0.00, C107 1.23, C108 1.46.
  - Half the weeks sit below the middle, so the city goes quieter after a stretch of big weeks without anyone having to lose.
  - The trailing median can live in `Carry_Forward_Store`, which already exists (keyed JSON; nine live rows, three keys × three cycles).
  - This is the same own-median pattern as engine.184 (applyMigrationDrift.js:356-372) and engine.188's `medianOf_` (applyCityDynamics.js:919).
- **§16 drift.** Whatever the formula, the effect should decay, not snap off.
  - engine.203d already rules a decay toward baseline for sentiment inactivity.
  - The ripple engine's 3-cycle carryover (1.0 → 0.67 → 0.33, visible on PLAYOFF_SPENDING_105/106) is an existing decay shape the game-day economy can reuse.

---

## 4. City-wide component vs stadium-zone concentration (ask 3)

**What exists now:**
- **Zone concentration is phase-only, and hardcoded in the one place it persists.** v3NeighborhoodWriter's playoff multipliers (JL ×1.5 event / ×1.4 nightlife) give Jack London 2.40× the city-median EventAttractiveness and 1.98× the median NightlifeProfile at C107. Downtown gets 1.52× / 1.41×.
- **The city-wide component is phase-only too.** applySportsModifiers_ multiplies every cluster in postseason: traffic ×1.4, nightlife ×1.3, sentiment +0.20. The PLAYOFF_SPENDING ripple lands on `primarySportsZone_`, which is Jack London until Baylight opens.
- **HomeNeighborhood acts as a third, unintended reach channel.** sportsNeighborhoodEffects and gameDayHoodsFor_ scatter sports into whichever hood a story row was set in (§1.6-4).

**How the weekly facts allow it to be split** (per franchise, before W_f):
- **The venue (zone) share follows home games:** Z_f = I_f × h/g. Home games put the crowd, traffic and transit load at the venue; an away week puts nothing at the stadium. Only `WeekRecord` knows `h` — today nothing does.
- **The city-wide share:** C_f = I_f × r(d), where the reach `r` grows with stakes. Mike, S446: "the entire city feels the impact." Away games still reach the city through watch parties — bars and nightlife across the city, not stadium traffic.
- **Channels could split by volume vs result (§6 Q2).** Crowd, traffic and transit follow volume and venue: a home loss still fills the stadium. Spending, nightlife and sentiment follow the result: a loss empties the bars afterward. This is where "losing costs something" can be real without inventing attendance collapses.
- **Each franchise's venue is already derivable.** If `S.baylightOpenings[team]` is set, the venue is Baylight District; otherwise it is the legacy zones (`BAYLIGHT_OPENINGS_` at :453-456, `deriveSportsZones_` at :514-535). Today's zone set is a union and can't say whose home game it was. During the changeover window — one franchise moved, the other not — the two venues differ.

Later, the city-wide share could be spread by fandom density per hood instead of uniformly, so the same pennant race lands where the fans live. That belongs to dial 9 (Task 8) and is noted here as its natural carrier.

---

## 5. Per-franchise state vs one city scalar (ask 4)

| Consumer group | Needs | Why |
|---|---|---|
| Transit game day (updateTransitMetrics) · crisis zone weight (generateCrisisSpikes:272) · v3NeighborhoodWriter zone mods · cityEveningSystems crowd · bondEngine rivals · ripple placement (`primarySportsZone_`) | **per-franchise venue and home games** | Geography: whose game, where, home or away |
| Economic ripple creation (economicRippleEngine:442-452) | **per-franchise** | One ripple per franchise-week, so the A's and Oaks don't collapse into one. The ripple then carries the franchise into Task 6's seeds |
| Casino (casinoLedgerEngine:605+) | per-franchise (already) | Settles per market |
| Game night (generateCitizensEvents:1697) · applyGameNightMoments:73 · Event_Content_Ledger (Task 8) · sentiment (processFeedSheet_, Task 7) | **per-franchise** | The event names a team and a result. Sentiment is already computed per team, then summed |
| Story hooks, the media packet, desk-facing labels (Class C) | per-franchise labels | Desks write about a team, not about a city phase |
| applySportsModifiers_ · migration drift · updateWorldPopulation_ migration · civic load · cycle weight · prioritizeEvents · filterNoiseEvents · spotlight · promotions · domain tracker and cooldowns · nightlife / food / famous counts · mediaFeedbackEngine · pattern detection · cycle recovery | **one city scalar**, Σ_f W_f × I_f (or banded) | City-level volume: these need "how big is sports this cycle", not which team |

The core of Task 10 is replacing `deepestSportsPhase_`'s MAX with a weighted sum for the scalar group. The MAX erases the second franchise (plan F9). A sum lets a good A's week and a bad Oaks week both count, with W_f deciding what each is worth.

**One migration path the census suggests** (mechanism — engine-sheet's call):
- Publish a banded scalar alongside the phase string, and convert branch sites from word tests to band tests.
- On the first cut, keep each site's existing constant as the band's payload.
- 165 of the 185 word tests are the three extreme words (plan F8). Mapping {championship, playoffs, late-season} → {top, high, elevated} bands of the city scalar changes *when* those branches fire (on record and volume) without retuning *how much* they do.
- The pool and prose sites (Class C) would stay on labels.

---

## 6. Sim-judgment questions for Mike (ask 5)

Each is a sim call. The data under it is what the mechanism can't decide on its own.

**Q1. Does a week without games still count?**
- C106: the A's were set for the ALDS and played no games. The city ran at playoffs: PLAYOFF_SPENDING 8, sentiment +0.20 per cluster.
- K1 scores that week near zero (0.05, from the Oaks' summer-league loss).
- Is anticipation something the city feels — a stakes-only term, K5 = 0.47 that week — or does the city only feel games?

**Q2. Which channels follow volume and which follow the result?**
- A home loss fills the stadium and empties the bars afterward.
- One split: traffic, transit and crowd follow volume at the venue (unsigned); retail, nightlife and sentiment follow the result (signed).
- Or should a losing week also thin the crowd?

**Q3. What is "a good week" measured against?**
- Absolute, with .500 as neutral: the A's worst week in range (2-1) scores +0.14, and nothing the A's did in C101–C108 costs the city.
- The team's own middle (K4): a 13-4 week scores +0.01 and a 2-1 week −0.10. The dynasty's winning becomes the expected, and only surprises move the city.

**Q4. How far does a pennant race reach?**
- Today the zone gets 2.40× the median EventAttractiveness at playoffs, and the whole city gets ×1.4 traffic.
- What share of a regular-season week, versus a World Series week, is felt across the city rather than at the stadium?

**Q5. Does a 20-game September outweigh the World Series?**
- Raw game counts say yes: 20 games against 5.
- Saturating volume (K1) scores C103 at 0.67 and C108 at 0.81.
- How far should stakes lift a short playoff week above a long regular-season week? ps(d) = d/6 is one answer; the phase is still only a scale on volume.

**Q6. Which phase does a week belong to — its games', or the one it ended in?**
- C105 was one regular-season game, then the playoff field was set. Today it counts as a playoff week.
- C108 was ALCS games, then the World Series was set. Today it counts as a championship week.

**Q7. What should the Oaks' losses cost?**
- The Oaks lost every game in range (C103–C106 and C108), scoring −0.05 each under K2.
- At W_f = 1 that doesn't register against the A's, and Task 9's weight will make it smaller still.
- Should an expansion team's preseason losses cost the city anything, or only its fans (dial 9)?

**Q8. Does the C108 championship cascade read right?**
- The first C108 fire runs every championship branch (§1.7) on a week whose games were the ALCS.
- If the NotebookLM daily reads that as wrong, the acceptance test is failing in the other direction: the numbers leading the lived experience.

---

## Extraction — what's usable

- **Count a channel's readers before designing its formula** → Task 10 starts at zero per-franchise readers (both per-team fields are orphaned writes), not at a partial collapse.
- **An unguarded sibling defeats a guard** → the population and economy phase boosts are guarded in one file and live in another (updateWorldPopulation_). A "keep the guard" ruling needs a census of every sibling, not just the file the audit opened.
- **A per-row geography field becomes a reach channel whether anyone meant it to or not** → HomeNeighborhood (the story's setting) drives game-day transit and per-hood sports effects today.
- **Keying on an event label is not keying on the event** → game night fires when EventType contains `game`. So 42 A's games (C102–C104) produced no game night, while a 0-0 summer-league row produced 57 citizen-days.
- **Saturate or band any per-cycle count** → a cycle's game count runs from 0 to 20, and raw counts put regular-season volume above playoff stakes.
- **A median-relative band gives "both directions" without a loss** → volume falling below the franchise's own middle is the downside the dynasty's record can't supply.
- **Word test → band test is the cheapest conversion** → the 165 extreme-word branches keep their constants and change only when they fire.

## Not applicable / hazard

- **Home/away history can't be recovered.** Any backtest of a venue term before `WeekRecord` is fiction; don't calibrate on it.
- **The proxy W-L comes from Team Record changes.** Rows can be appended after their cycle fired, so a replay is only valid for the current code on the current tab (sibling hazard).
- **Postseason `Team Record` is ambiguous.** C107 and C108 rows carry per-series records (3-1, 4-1), and C108 also carries a cumulative postseason 7-2. K5's stakes term depends on which one is used.
- **Don't widen the ±0.10 sentiment clamp to fix magnitude** (sibling hazard, engine.193). C107's 0.094 is close; that is Task 7's.
- **Chicago's sentiment reads Oakland's phase** (v3ChicagoWriter.js:288-289). Out of scope — Chicago is canon-only under the 2026-09-16 ruling. Flagged for whoever owns Chicago.

**Verdict:** `adopt`. This feeds the existing plan's Tasks 3, 4 and 10 (engine.204 / engine.205), so there is no new plan and no new ROLLOUT row. Two findings may deserve rows of their own, at engine-sheet's discretion: the ungated phase boosts in updateWorldPopulation_ (§1.6-2) and the applyShockMonitor calendar read (§1.6-7).

**Ignited plans:** none new — [[../plans/2026-09-11-sports-as-a-lived-system]] Tasks 3 / 4 / 10.

---

## Applications (living)

- 2026-09-18 — Written for engine-sheet's Task 3/4/10 design, which follows the engine.202 header migration.

## Changelog

- 2026-09-18 (S467, research-build) — Initial census, live measurement, candidate formulas and sim questions, at engine-sheet's request (Mike-routed).
