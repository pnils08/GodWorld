---
title: engine.211 phase-word site census (agy, 2026-10-04)
created: 2026-10-04
updated: 2026-10-04
type: reference
tags: [engine, sports, census, accepted]
sources:
  - docs/plans/2026-09-11-sports-as-a-lived-system.md
pointers:
  - "[[plans/2026-09-11-sports-as-a-lived-system]] — §1 F8–F9, engine.211"
---

# engine.211 — what is left of the phase-word gates (agy census, verified by engine-sheet)

**Disposition (engine-sheet, 2026-10-04 03:30):** every one of agy's 13 "N" sites read against the code. None is a feed-path numeric gate on an extreme word any more — that class is what engine.204/205 (slices A–E) and engine.281 (a1/a2, `sportsRung_`) removed. What remains:
- **Override-only, dormant on live** (`S.sportsAtmosphereEnabled` is always false under the feed; the Maker override is the builder's open §6 question of 2026-10-03 05:35): `generateGameModeMicroEvents.js:502-504`, `generateGenericCitizenMicroEvent.js:433-434`, `applyShockMonitor.js:142-146, 323` (`sportsIsOverride`). The `"regular"` branch at `generateGameModeMicroEvents.js:504` never matched the vocabulary (`regular-season`) — dead under both paths.
- **Season-structure reads on `off-season`, not extreme-word gates**: `bondEngine.js:835` (rivalry bonds decay when the sport is not being played), `mediaFeedbackEngine.js:480` (sports events lift hope only in season), `buildEveningFood.js:121` (two fast-food picks in season, one out), `v3DomainWriter.js:279` (outer gate; the inner ladder already reads `sportsRung_`). A 127-win regular season satisfies all four. Accepted as the lens.
- **Bookkeeping**: `bondPersistence.js:339` tallies bonds by the word; no number moves.
F9: `deepestSportsPhase_` still sets `S.sportsSeason` — as the lens word for the 75 L sites, which engine.281 (a1) ruled stay on the lens; no numeric reader remains. **engine.211 closes on this census.**

# agy-engine211-census
Counts: N=13, L=75, X=0

| File:Line | Class | Target moved & Scope |
| :--- | :--- | :--- |
| phase03-population/updateNeighborhoodDemographics.js:622 | L | Lens/Text/Pool |
| phase03-population/updateNeighborhoodDemographics.js:629 | L | Lens/Text/Pool |
| phase03-population/generateCrisisSpikes.js:394 | L | Lens/Text/Pool |
| phase03-population/deriveDemographicDrift.js:136 | L | Lens/Text/Pool |
| phase03-population/deriveDemographicDrift.js:140 | L | Lens/Text/Pool |
| phase03-population/deriveDemographicDrift.js:143 | L | Lens/Text/Pool |
| phase03-population/deriveDemographicDrift.js:249 | L | Lens/Text/Pool |
| phase03-population/applyDemographicDrift.js:304 | L | Lens/Text/Pool |
| phase03-population/applyDemographicDrift.js:306 | L | Lens/Text/Pool |
| phase04-events/buildCityEvents.js:84 | L | Lens/Text/Pool |
| phase04-events/buildCityEvents.js:445 | L | Lens/Text/Pool |
| phase04-events/buildCityEvents.js:448 | L | Lens/Text/Pool |
| phase04-events/buildCityEvents.js:451 | L | Lens/Text/Pool |
| phase04-events/buildCityEvents.js:584 | L | Lens/Text/Pool |
| phase04-events/worldEventsEngine.js:93 | L | Lens/Text/Pool |
| phase04-events/worldEventsEngine.js:95 | L | Lens/Text/Pool |
| phase04-events/worldEventsEngine.js:96 | L | Lens/Text/Pool |
| phase04-events/generateGameModeMicroEvents.js:99 | L | Lens/Text/Pool |
| phase04-events/generateGameModeMicroEvents.js:419 | L | Lens/Text/Pool |
| phase04-events/generateGameModeMicroEvents.js:420 | L | Lens/Text/Pool |
| phase04-events/generateGameModeMicroEvents.js:421 | L | Lens/Text/Pool |
| phase04-events/generateGameModeMicroEvents.js:502 | N | Moves: chance (micro-event freq). Scope: No (but S is in scope) |
| phase04-events/generateGameModeMicroEvents.js:503 | N | Moves: chance (micro-event freq). Scope: No (but S is in scope) |
| phase04-events/generateGameModeMicroEvents.js:504 | N | Moves: chance (micro-event freq). Scope: No (but S is in scope) |
| phase04-events/generateGenericCitizenMicroEvent.js:331 | L | Lens/Text/Pool |
| phase04-events/generateGenericCitizenMicroEvent.js:337 | L | Lens/Text/Pool |
| phase04-events/generateGenericCitizenMicroEvent.js:433 | N | Moves: chance (micro-event freq). Scope: No (but S is in scope) |
| phase04-events/generateGenericCitizenMicroEvent.js:434 | N | Moves: chance (micro-event freq). Scope: No (but S is in scope) |
| phase05-citizens/generateCitizensEvents.js:800 | L | Lens/Text/Pool |
| phase05-citizens/generateCitizensEvents.js:2440 | L | Lens/Text/Pool |
| phase05-citizens/checkForPromotions.js:444 | L | Lens/Text/Pool |
| phase05-citizens/checkForPromotions.js:446 | L | Lens/Text/Pool |
| phase05-citizens/bondPersistence.js:339 | N | Moves: counts.bySportsSeason (tally). Scope: No |
| phase05-citizens/bondPersistence.js:550 | L | Lens/Text/Pool |
| phase05-citizens/generateMediaModeEvents.js:157 | L | Lens/Text/Pool |
| phase05-citizens/generateMediaModeEvents.js:217 | L | Lens/Text/Pool |
| phase05-citizens/generateMediaModeEvents.js:286 | L | Lens/Text/Pool |
| phase05-citizens/generateGenericCitizens.js:700 | L | Lens/Text/Pool |
| phase05-citizens/generateGenericCitizens.js:702 | L | Lens/Text/Pool |
| phase05-citizens/bondEngine.js:835 | N | Moves: intensity (bond decay). Scope: No (but ctx.summary is) |
| phase05-citizens/bondEngine.js:1207 | L | Lens/Text/Pool |
| phase06-analysis/applyShockMonitor.js:142 | N | Moves: threshold mods. Scope: Yes (S.sportsCity.band via sportsCityShock) |
| phase06-analysis/applyShockMonitor.js:146 | N | Moves: threshold mods. Scope: Yes (S.sportsCity.band via sportsCityShock) |
| phase06-analysis/applyShockMonitor.js:323 | N | Moves: shock (boolean state). Scope: Yes (S.sportsCity.band via sportsCityShock) |
| phase06-analysis/economicRippleEngine.js:1045 | L | Lens/Text/Pool |
| phase07-evening-media/culturalLedger.js:361 | L | Lens/Text/Pool |
| phase07-evening-media/textureTriggers.js:272 | L | Lens/Text/Pool |
| phase07-evening-media/textureTriggers.js:277 | L | Lens/Text/Pool |
| phase07-evening-media/textureTriggers.js:281 | L | Lens/Text/Pool |
| phase07-evening-media/buildMediaPacket.js:369 | L | Lens/Text/Pool |
| phase07-evening-media/buildMediaPacket.js:372 | L | Lens/Text/Pool |
| phase07-evening-media/buildEveningFood.js:121 | N | Moves: draw count (2 vs 1). Scope: Yes (S.sportsCity.band via sportsBand) |
| phase07-evening-media/buildEveningFood.js:136 | L | Lens/Text/Pool |
| phase07-evening-media/buildEveningFood.js:138 | L | Lens/Text/Pool |
| phase07-evening-media/buildEveningMedia.js:394 | L | Lens/Text/Pool |
| phase07-evening-media/buildEveningMedia.js:396 | L | Lens/Text/Pool |
| phase07-evening-media/buildNightLife.js:260 | L | Lens/Text/Pool |
| phase07-evening-media/buildNightLife.js:262 | L | Lens/Text/Pool |
| phase07-evening-media/buildNightLife.js:264 | L | Lens/Text/Pool |
| phase07-evening-media/buildNightLife.js:436 | L | Lens/Text/Pool |
| phase07-evening-media/buildNightLife.js:438 | L | Lens/Text/Pool |
| phase07-evening-media/buildNightLife.js:469 | L | Lens/Text/Pool |
| phase07-evening-media/mediaFeedbackEngine.js:248 | L | Lens/Text/Pool |
| phase07-evening-media/mediaFeedbackEngine.js:251 | L | Lens/Text/Pool |
| phase07-evening-media/mediaFeedbackEngine.js:254 | L | Lens/Text/Pool |
| phase07-evening-media/mediaFeedbackEngine.js:480 | N | Moves: effects.hopeFactor. Scope: No (but cal is in scope) |
| phase07-evening-media/mediaFeedbackEngine.js:548 | L | Lens/Text/Pool |
| phase07-evening-media/mediaFeedbackEngine.js:550 | L | Lens/Text/Pool |
| phase07-evening-media/mediaFeedbackEngine.js:552 | L | Lens/Text/Pool |
| phase07-evening-media/mediaFeedbackEngine.js:560 | L | Lens/Text/Pool |
| phase07-evening-media/mediaFeedbackEngine.js:568 | L | Lens/Text/Pool |
| phase07-evening-media/mediaFeedbackEngine.js:626 | L | Lens/Text/Pool |
| phase07-evening-media/mediaFeedbackEngine.js:803 | L | Lens/Text/Pool |
| phase07-evening-media/mediaFeedbackEngine.js:805 | L | Lens/Text/Pool |
| phase07-evening-media/mediaFeedbackEngine.js:1295 | L | Lens/Text/Pool |
| phase07-evening-media/mediaFeedbackEngine.js:1386 | L | Lens/Text/Pool |
| phase07-evening-media/storyHook.js:521 | L | Lens/Text/Pool |
| phase07-evening-media/storyHook.js:532 | L | Lens/Text/Pool |
| phase07-evening-media/storyHook.js:543 | L | Lens/Text/Pool |
| phase08-v3-chicago/v3preLoader.js:51 | L | Lens/Text/Pool |
| phase08-v3-chicago/v3DomainWriter.js:279 | N | Moves: presence["SPORTS"]. Scope: Yes (sportsRung_) |
| phase09-digest/applyCompressionDigestSummary.js:190 | L | Lens/Text/Pool |
| phase09-digest/applyCompressionDigestSummary.js:191 | L | Lens/Text/Pool |
| phase09-digest/applyCompressionDigestSummary.js:192 | L | Lens/Text/Pool |
| phase09-digest/applyCompressionDigestSummary.js:193 | L | Lens/Text/Pool |
| utilities/rosterLookup.js:563 | L | Lens/Text/Pool |
| utilities/rosterLookup.js:566 | L | Lens/Text/Pool |
| utilities/rosterLookup.js:569 | L | Lens/Text/Pool |

### Additional Answers
- **Does deepestSportsPhase_ still set S.sportsSeason?** Yes, in `phase02-world-state/applySportsSeason.js:102`.
- **Which sites read cal.sportsSeason or S.sportsSeason numerically?** None. It is treated purely as a string (checked via `===` against string literals like "championship", "playoffs", etc.) across all 88 sites, though `bondPersistence.js` uses it as an object key for a tally count.
