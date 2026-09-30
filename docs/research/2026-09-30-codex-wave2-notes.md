---
title: engine.273 Wave 2 Commit A classifications
created: 2026-09-30
updated: 2026-09-30
type: reference
tags: [engine, active]
sources:
  - docs/plans/2026-09-29-sim-holiday-calendar.md
pointers:
  - "[[../plans/2026-09-29-sim-holiday-calendar]] — Wave 2 build scope"
---

# engine.273 Wave 2 Commit A classifications

Counts are gross removed lines in the uncommitted engine diff. Flag-gated lines were reachable only through dropped holiday flags. Comment-only lines had no runtime reachability.

- `phase01-config/advanceSimulationCalendar.js` | 1 lines removed | comment-only; no executable branch.
- `phase01-config/godWorldEngine2.js` | 29 lines removed | flag-gated.
- `phase02-world-state/applyCityDynamics.js` | 23 lines removed | flag-gated.
- `phase02-world-state/applySeasonWeights.js` | 98 lines removed | flag-gated.
- `phase02-world-state/applyWeatherModel.js` | 22 lines removed | flag-gated.
- `phase02-world-state/calendarChaosWeights.js` | 117 lines removed | flag-gated.
- `phase02-world-state/calendarStorySeeds.js` | 139 lines removed | flag-gated.
- `phase03-population/applyDemographicDrift.js` | 7 lines removed | flag-gated.
- `phase03-population/deriveDemographicDrift.js` | 52 lines removed | flag-gated.
- `phase03-population/generateCrisisSpikes.js` | 31 lines removed | flag-gated.
- `phase03-population/updateNeighborhoodDemographics.js` | 29 lines removed | flag-gated.
- `phase04-events/buildCityEvents.js` | 109 lines removed | flag-gated.
- `phase04-events/generateGameModeMicroEvents.js` | 7 lines removed | flag-gated.
- `phase04-events/generateGenericCitizenMicroEvent.js` | 55 lines removed | flag-gated.
- `phase04-events/generationalEventsEngine.js` | 2 lines removed | flag-gated.
- `phase04-events/worldEventsEngine.js` | 53 lines removed | flag-gated.
- `phase05-citizens/applyNamedCitizenSpotlight.js` | 18 lines removed | flag-gated.
- `phase05-citizens/bondEngine.js` | 4 lines removed | flag-gated.
- `phase05-citizens/bondPersistence.js` | 1 lines removed | comment-only; no executable branch.
- `phase05-citizens/checkForPromotions.js` | 22 lines removed | flag-gated.
- `phase05-citizens/generateCitizensEvents.js` | 13 lines removed | flag-gated.
- `phase05-citizens/generateGenericCitizens.js` | 41 lines removed | flag-gated.
- `phase05-citizens/runAsUniversePipeline.js` | 29 lines removed | flag-gated.
- `phase05-citizens/runCareerEngine.js` | 11 lines removed | flag-gated.
- `phase05-citizens/runCivicRoleEngine.js` | 74 lines removed | flag-gated.
- `phase05-citizens/runEducationEngine.js` | 42 lines removed | flag-gated.
- `phase05-citizens/runHouseholdEngine.js` | 36 lines removed | flag-gated.
- `phase05-citizens/runNeighborhoodEngine.js` | 47 lines removed | flag-gated.
- `phase05-citizens/runRelationshipEngine.js` | 40 lines removed | flag-gated.
- `phase06-analysis/applyCivicLoadIndicator.js` | 17 lines removed | flag-gated.
- `phase06-analysis/applyMigrationDrift.js` | 6 lines removed | flag-gated.
- `phase06-analysis/applyPatternDetection.js` | 6 lines removed | flag-gated.
- `phase06-analysis/applyShockMonitor.js` | 12 lines removed | flag-gated.
- `phase06-analysis/economicRippleEngine.js` | 20 lines removed | flag-gated.
- `phase06-analysis/filterNoiseEvents.js` | 1 lines removed | flag-gated.
- `phase06-analysis/prioritizeEvents.js` | 29 lines removed | flag-gated.
- `phase07-evening-media/applyStorySeeds.js` | 82 lines removed | flag-gated.
- `phase07-evening-media/buildEveningFamous.js` | 33 lines removed | flag-gated.
- `phase07-evening-media/buildEveningFood.js` | 17 lines removed | flag-gated.
- `phase07-evening-media/buildEveningMedia.js` | 70 lines removed | flag-gated.
- `phase07-evening-media/buildNightLife.js` | 76 lines removed | flag-gated.
- `phase07-evening-media/cityEveningSystems.js` | 19 lines removed | flag-gated.
- `phase07-evening-media/culturalLedger.js` | 33 lines removed | flag-gated; always-reachable historical `SummerFestival, mid-season` Sheet value documented at line 558.
- `phase07-evening-media/domainTracker.js` | 22 lines removed | flag-gated.
- `phase07-evening-media/mediaFeedbackEngine.js` | 62 lines removed | flag-gated; always-reachable `Media-OaklandPride` under Creation Day retained at line 1245.
- `phase07-evening-media/mediaRoomIntake.js` | 1 lines removed | comment-only; no executable branch.
- `phase07-evening-media/sportsStreaming.js` | 48 lines removed | flag-gated.
- `phase07-evening-media/storyHook.js` | 130 lines removed | flag-gated.
- `phase07-evening-media/textureTriggers.js` | 56 lines removed | flag-gated.
- `phase08-v3-chicago/applyDomainCooldowns.js` | 10 lines removed | flag-gated.
- `phase08-v3-chicago/v3NeighborhoodWriter.js` | 36 lines removed | flag-gated.
- `phase09-digest/applyCompressionDigestSummary.js` | 24 lines removed | flag-gated.
- `phase09-digest/applyCycleWeight.js` | 2 lines removed | flag-gated.

## Validation

- Dropped-name grep in `phase*/`, `utilities/`, and `lib/`: only the two listed always-reachable exceptions remain.
- Syntax: 53 changed scripts passed `node --check`; function-collision audit: 0 collisions.
- Loading suites: 74 run, 72 passed. `scripts/illnessEnvelope.test.js` fails two assertions that inject Lunar New Year or MLK Day; `scripts/hoodIdentityRemainder.test.js` fails one Lunar New Year assertion. Test files are outside this edit scope.
- Required engine wiring-card call failed with `[FATAL] Connection error.`; local source tracing and tests provide the available proof.

- 2026-09-30 correction — Human-readable `Opening Day` remains always reachable as a baseball movie title in `phase07-evening-media/buildEveningMedia.js:353` (listed file, no holiday guard) and as an event-domain token in untouched `phase10-persistence/recordWorldEventsv3.js:134`; the parser skip term in untouched `phase07-evening-media/parseMediaRoomMarkdown.js:731` remains under the explicit parser exclusion.
