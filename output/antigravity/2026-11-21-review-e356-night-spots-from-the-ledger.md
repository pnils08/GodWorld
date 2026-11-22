# Adversarial Read — engine.356: Night Spots from the Ledger + Fix Commits

- **Date:** 2026-11-21 · **Lane:** antigravity (`agy`) · **Mode:** Read-only code review (no tests run, no sandbox calls)
- **Brief:** `docs/for-claude-review/2026-11-21-es-brief-agy-e356-night-spots-from-the-ledger.md`
- **Commits reviewed:** `4559c9d18`, `170e05444`, `b2cd01774` (`phase07-evening-media/buildNightLife.js`)
- **Verdict:** **SHIP-WITH-FIXES**

---

## Findings

### 1. [Medium] Same business can be picked as both tonight's night spot and tonight's restaurant (`buildNightLife_` + `buildEveningFood_`)

- **Locations:** `phase07-evening-media/buildNightLife.js:115-117,214-216`, `phase07-evening-media/buildEveningFood.js:90-95,98,105,216-217`, `phase07-evening-media/applyStorySeeds.js:1458-1469,1476-1484`, `phase05-citizens/generateCitizensEvents.js:1893-1895`, `scripts/buildNeighborhoodTexture.js:543-547,203-206`
- **Mechanism:** `Phase7-Nightlife` (`godWorldEngine2.js:765`) writes `S.nightlife.spotDetails` before `Phase7-Food` (`godWorldEngine2.js:767`). In `buildEveningFoodIndex_` (`buildEveningFood.js:216-217`), a business whose `Sector` matches both `NIGHT_RE` and `FOOD_RE` (live on `output/beats/Business_Ledger.jsonl`: `BIZ-00041` `"Green & Gold Tavern"`, `Sector: "Sports Bar & Dining"`) enters both `index.nightlife` and `index.restaurants`. In addition, whenever `isFirstFriday` (`buildEveningFood.js:98`) or `S.nightlifeVolume >= 7` (`:105`), `buildEveningFood_.addNightlife()` appends all 28 `index.nightlife` rows into its restaurant `candidates` pool (`buildEveningFood.js:90-95`). Because `buildNightLife_` now draws 100% of its spots from `index.nightlife` instead of separate name lists and `buildEveningFood_` never excludes `S.nightlife.spotDetails`, the same business can appear in both `S.nightlife.spotDetails` and `S.eveningFood.restaurantDetails`.
- **Failure (`input -> wrong output`):**
  `BIZ-00041` (`"Green & Gold Tavern"`, `Jack London`) — or any of the 28 nightlife rows on a First Friday / `volume >= 7` cycle — is drawn into both `S.nightlife.spotDetails` and `S.eveningFood.restaurantDetails`:
  1. `applyStorySeeds.js:1458-1469` emits two `NIGHTLIFE` priority-2 seeds in the same hood (`"Out late at Green & Gold Tavern in Jack London"` and `"Dinner crowd at Green & Gold Tavern in Jack London"`); text dedup (`:1480`) keeps both, doubling that business's `NIGHTLIFE` seed count.
  2. `generateCitizensEvents.js:1893,1895` (`previousEveningPool_`) adds both `"had dinner at Green & Gold Tavern last night"` (`evening:dinedOut`, weight `2.0` / `1.2*oa`) and `"spent last night at Green & Gold Tavern"` (`evening:nightOut`, weight `2.0` / `1.2*oa`), giving the business 2× draw mass and allowing a multi-draw citizen to log both in one cycle.
  3. `scripts/buildNeighborhoodTexture.js:543-547,203-206` emits both `VENUE (restaurant): Green & Gold Tavern` and `VENUE (nightlife): Green & Gold Tavern` into the neighborhood texture prompt.

### 2. [Medium] Non-`Neighborhood_Map` hood `"Telegraph corridor"` on `Business_Ledger` (`BIZ-00062` `"Dario's Bar"`) drops crowd bumps, orphans seeds/texture, and has zero local draws

- **Locations:** `phase07-evening-media/buildEveningFood.js:194-223`, `phase07-evening-media/buildNightLife.js:115-125,214-216`, `phase07-evening-media/cityEveningSystems.js:363-369`, `scripts/buildNeighborhoodTexture.js:141-152,202-206,536,553`, `phase05-citizens/generateCitizensEvents.js:1875,1886,3144`
- **Mechanism:** Of the 28 rows in `output/beats/Business_Ledger.jsonl` matching `NIGHT_RE`, `BIZ-00062` (`Name: "Dario's Bar"`, `Sector: "Bar / nightlife"`) has `Neighborhood: "Telegraph corridor"`. That string is absent from the 22 `Neighborhood_Map` hoods (`output/beats/Neighborhood_Map.jsonl`) and from all `Simulation_Ledger` residents (`output/simulation_ledger_snapshot.jsonl`). (`Baylight District` is in `Neighborhood_Map`; `"Telegraph corridor"` is the only non-map nightlife hood, while `Business_Ledger` food rows also carry `"Brooklyn Basin"`, `"Old Oakland"`, `"City-wide"`, and `"Coliseum"`.)
- **Failure (`input -> wrong output`):**
  `buildNightlife_` draws `{ bizId: "BIZ-00062", name: "Dario's Bar", neighborhood: "Telegraph corridor", sector: "Bar / nightlife" }`:
  1. `buildNightLife.js:120-125`: `"Telegraph corridor"` matches none of `artsHoods`, `sportsHoods`, `econRank_()`, or `publicSpaceHoods_()`, leaving its draw weight pinned at `1`.
  2. `cityEveningSystems.js:367`: `crowd["Telegraph corridor"]` is `undefined` (initialized over `Neighborhood_Map` hoods), so the `+1` nightlife cluster bump is silently dropped (`0` neighborhoods incremented).
  3. `applyStorySeeds.js:1462` emits `"Out late at Dario's Bar in Telegraph corridor"` (`Neighborhood = "Telegraph corridor"`), which `buildNeighborhoodTexture.js:146-148,204,553` drops because `bundles` only iterates `mapCurr` (`Neighborhood_Map`) — neither `NOTED:` nor `VENUE (nightlife): Dario's Bar` reaches any hood bundle.
  4. `generateCitizensEvents.js:1886`: zero citizens have `eHome === "Telegraph corridor"`, so no local resident ever draws `"spent last night at Dario's Bar"` (weight `2.0`); only `outabout >= 1.15` travelers can draw `"made the trip to Dario's Bar in Telegraph corridor last night"`.

### 3. [Low] `buildNightLife.js` silently produces `spots: []` if loaded without `buildEveningFood.js`

- **Locations:** `phase07-evening-media/buildNightLife.js:115-117,126,214-216` (and `scripts/hoodBlindTables.test.js:322-341`)
- **Mechanism:** All four ledger/draw helpers used by `buildNightlife_` (`buildEveningFoodIndex_`, `dedupeByName_`, `eveningFoodHoodsByCharacter_`, `weightedDrawWithoutReplacement_`) live in `phase07-evening-media/buildEveningFood.js`. In Apps Script's flat global namespace this resolves cleanly even though `Phase7-Nightlife` (`godWorldEngine2.js:765`) runs before `Phase7-Food` (`:767`). In any isolated Node/VM load of `buildNightLife.js` alone, `typeof buildEveningFoodIndex_ === 'function'` is `false`, so `nightIndex` falls back to `{ nightlife: [] }` without logging, leaving `S.nightlife.spots = []` and `spotDetails = []`. (Known from brief: `scripts/hoodBlindTables.test.js` T12 loads `buildNightLife.js` alone and expects invented budget venue names, so T12 fails.)

### 4. [Low] Test fixtures outside `hoodBlindTables.test.js` still embed removed venue strings

- **Locations:** `scripts/buildSeasonFeelSlice.test.js:22,37` (`Nightline Station`), `scripts/buildEveningSlice.test.js:37,53,126,172,179` (`KONO Cocktails`), `scripts/generate-edition-photos.source-boundary.test.js:25-26` (`Nightline Station`)
- **Mechanism:** These tests pass static fixture strings directly rather than calling `buildNightlife_`, so they are not broken at runtime, though `Nightline Station` and `KONO Cocktails` are no longer in `Business_Ledger` or `buildNightLife.js`. Zero production phase files, utilities, or scripts match any removed venue string (the `"Downtown Championship Watch Party"` at `phase04-events/buildCityEvents.js:383` is a city-event name, not a nightlife spot).

---

## Attack Vectors Checked Clean

1. **`buildNightLife.js` end-to-end (`Attack #1`):**
   - Zero references remain to removed lists (`BARS`, `DANCE`, `CHILL`, `RAIN_SHELTER`, `FOG_SPOTS`, `LATE_NIGHT`, holiday/sports/First Friday/Creation Day lists, or `pickRandomSet_`).
   - Empty ledger / read failure: `buildEveningFoodIndex_` (`buildEveningFood.js:194-223`) returns `{ restaurants: [], nightlife: [], fast: [] }`; `dedupeByName_([])` returns `[]`; `weightedDrawWithoutReplacement_([], weight, count, rng)` returns `[]`; `spotNames` and `spotDetails` are `[]`.
   - `count > candidates.length`: `while (pool.length && out.length < count)` (`buildEveningFood.js:245`) terminates when `pool` empties and returns all `candidates.length` unique entries.
   - Phase order (`godWorldEngine2.js:765,767`, `:2484,2486`): `S.neighborhoodEconomies` (Phase 1/2), `S.neighborhoodDynamics[h].publicSpaces` (`applyCityDynamics.js:1576,1877`), `S.neighborhoodState` (Phase 2), `S.sportsZones` (`applySportsSeason.js:57,113,156`), `S.sportsCity` (Phase 2), and `S.worldEvents` (Phase 4) are all populated before `Phase7-Nightlife`.
2. **`S.nightlife` readers (`Attack #2`):**
   - `phase07-evening-media/buildMediaPacket.js:312-313`, `phase07-evening-media/applyStorySeeds.js:1458-1463`, `phase10-persistence/buildCyclePacket.js:440-464`, `phase07-evening-media/cityEveningSystems.js:58,159,363-369`, `phase09-digest/finalizeCycleState.js:401,451`, `phase01-config/godWorldEngine2.js:2042`, `phase05-citizens/generateCitizensEvents.js:1895`, `scripts/buildWorldSummary.js:467`, `scripts/buildNeighborhoodTexture.js:546`, `scripts/livedExperiencePacket.js:257` all read `{ bizId, name, neighborhood, sector }` and handle empty `spots` / `spotDetails` cleanly.
3. **RNG (`Attack #5`):**
   - Later Phase-7 consumers (`sportsStreaming.js`, `buildEveningFood.js`, `buildEveningFamous.js`, `buildEveningMedia.js`, `textureTriggers.js`, `mediaFeedbackEngine.js`) pull from the shared `safeRand_(ctx)` stream; none depend on a fixed `rng()` call count from `buildNightlife_` (seeded stream offsets shift deterministically, no structural failure).
4. **`4559c9d18` and `170e05444` (`Attack #6`):**
   - `4559c9d18` (`citizenContextBuilder.js:104,133`): `eventClassFromTags_` returns `"barNight"` (`!ls.isMinor`) for `"evening:nightOut"` before the `"source:prevEvening"` (`"eveningOut"`) branch. Grep across the codebase shows `phase05-citizens/generateCitizensEvents.js:3700` is the sole caller (`isEventEligible_(lifeState, eventClassFromTags_(gEntry.tags || []))`); no caller checks for `"eveningOut"` by name. `split("$P").join(...)` (`generateCitizensEvents.js:1887,1889`) and `bizId` preservation on `famousSeen` (`finalizeCycleState.js:463`) are clean.
   - `170e05444` (`bondEngine.js:2954-2955`): `detectTriangleRivalries_` passes `popId` (the shared romantic interest in `romByCitizen`) as `withPop` (`TrustGuarded|contactPopId:POP-XXXXX`), matching `people[popId]` on ledger-citizen bonds. (Latent edge case only if two ledger citizens ever courted an identical `'GC:' + gcFull` string from `:2731`.)

---

## Checks Run (Syntax Only — No Tests or Sandbox Runs)

- `node --check phase07-evening-media/buildNightLife.js phase05-citizens/citizenContextBuilder.js phase05-citizens/generateCitizensEvents.js phase09-digest/finalizeCycleState.js phase05-citizens/bondEngine.js` — `exit 0`

---

## Wiring Card Attached

- **`S.nightlife` (`phase07-evening-media/buildNightLife.js:277`):** `output/agent_engine-wiring_2026-11-22T00-16-16.md` — writer `buildNightlife_` at `Phase7-Nightlife` (`godWorldEngine2.js:765` prod / `:2484` cycle-phases, before `Phase10-ExecuteIntents`), 7 mapped readers + 15 `S.` inputs read, no sheet write path.
