---
title: engine.273 Second Dawn diff — adversarial review
created: 2026-10-02
updated: 2026-10-02
type: reference
tags: [engine, research, draft]
sources:
  - commit 9708018a
  - docs/plans/2026-09-29-sim-holiday-calendar.md §Second Dawn cut
pointers:
  - "[[plans/2026-09-29-sim-holiday-calendar]] — reviewed specification"
---

# engine.273 Second Dawn diff review

**Verdict: HOLD.** Source review of `9708018a` against the Second Dawn cut. The calendar row and new in-world wording are consistent with position 27, but the cut's `oakland` inventory is incomplete and the claim that the holiday flag is out of prose is false. No bench or Sheet read was performed. `node scripts/simHolidayCalendar.test.js` passed 12/12 locally; the coverage gaps below remain.

## Findings

1. **HIGH — Holiday flags still enter persisted prose.** `phase07-evening-media/storyHook.js:379-385` builds a major-holiday hook with `holiday + ' observance citywide'`; `phase08-v3-chicago/v3StoryHookWriter.js:80-88` writes its text to `Story_Hook_Deck` column H. Christmas therefore writes `Holiday observance citywide`, and `NewYearsEve` writes its flag. `phase06-analysis/applyCivicLoadIndicator.js:258-264,370-373` similarly adds `NewYearsEve public load` to `S.civicLoadFactors`; `phase10-persistence/buildCyclePacket.js:566-575` can print that factor in `Cycle_Packet`. `phase07-evening-media/buildEveningMedia.js:177-182,434-441` writes `NewYear programming`, `MothersDay programming`, etc. into `S.eveningMedia.specialProgramming`, which `phase01-config/godWorldEngine2.js:1928-1930` serializes to the `World_Population` EveningMedia cell. The cut already acknowledges another off-cycle packet leak at `phase10-persistence/compileHandoff.js:684-690`; it remains. These are prose fields, not `holiday:<flag>` machine tags. The six edited sites use `holidayLabel || holiday`, so they also fall back to flag prose if called without a label, although the normal calendar writer supplies one.

2. **MEDIUM — The tier table omits eight `oakland` branch sites and understates the blast radius.** `phase08-v3-chicago/applyCycleRecovery.js:77-81` raises light/moderate/heavy recovery thresholds by 2/2/3 for `SecondDawn`; `phase08-v3-chicago/v3DomainWriter.js:256-262` adds FESTIVAL presence; `phase08-v3-chicago/applyDomainCooldowns.js:73-75` releases COMMUNITY and CULTURE cooldowns. `phase05-citizens/bondEngine.js:1118-1120` raises the new-bond cap from 2 to 4; its separate festival-bond branch at `:1166-1169` requires authored Scene hoods and cannot fire from the citywide `null` row alone. `phase06-analysis/applyCivicLoadIndicator.js:278-284` adds one civic-load point; `phase05-citizens/runNeighborhoodEngine.js:450-453` adds 0.012 neighborhood drift chance; `phase07-evening-media/buildEveningFood.js:111-115` forces three restaurant picks. The cut's `mediaFeedbackEngine.js:619,791` wording also reads as unconditional: the generic celebrity pool and `festival_celebration` narrative lose precedence to playoff/championship branches. All other listed tier effects match their cited branches on source inspection. The `null` neighborhood is guarded at the neighborhood-sensitive readers (`filterNoiseEvents.js:128-132`, `prioritizeEvents.js:221`, `runRelationshipEngine.js:381`, `runNeighborhoodEngine.js:468`, `applyNamedCitizenSpotlight.js:311`, `buildCyclePacket.js:114`); I found no `SecondDawn` null-neighborhood throw.

3. **MEDIUM — The added tests do not prove the cut's output claims.** `scripts/simHolidayCalendar.test.js:191-217` tests the calendar writer, packet calendar line, desk context and summary header, but does not run the new seasonal seeds, story seeds, story hook, texture trigger, media-packet hint, ripple ledger, or any newly awakened tier behavior. Its `:220-233` source rule searches only six files for narrow bare-concatenation patterns and accepts `holidayLabel` anywhere in each file; it misses the three live prose paths in finding 1 and the off-cycle handoff. `:236-247` manually injects both flag and label into the cycle-weight context, proving that one formatter only. The 52-position test at `:54-66` computes expected details from the same table it is testing, so it adds little independent validation of position 27; the separate exact-row assertion at `:47-52` is meaningful.

## Checked without a finding

- **Unknown holiday names:** name-keyed pool reads are guarded (`generateGenericCitizenMicroEvent.js:328,336`, `generateGameModeMicroEvents.js:424-426`, `generateCitizensEvents.js:2407-2408`, `runAsUniversePipeline.js:513-514`, `applyStorySeeds.js:668-672`, `buildEveningMedia.js:177-178`, `prioritizeEvents.js:210-211`, `applyNamedCitizenSpotlight.js:295-296`, `generateGenericCitizens.js:679-680`, `checkForPromotions.js:426-427`). The digest abbreviation has a `substring` fallback (`applyCompressionDigestSummary.js:171-185`), and `applyCycleRecovery.js:38,71-96` defaults the flag to a string before lowercasing. I found no unguarded name lookup that throws on an unknown string.
- **Non-`oakland` weeks:** the deleted `Opening Day` comment in `filterNoiseEvents.js:122-126` was inert; the deleted sports cap was wholly inside `holidayPriority === 'oakland'` (`:158-161`). Neither deletion changes a non-`oakland` week.
- **New telling:** the row at `getSimHoliday.js:13` is the sole calendar source for `SecondDawn` at position 27; the new seed/hook/trigger/hint branches read that flag (`calendarStorySeeds.js:130-135`, `applyStorySeeds.js:616-620,668-676`, `storyHook.js:482-490`, `textureTriggers.js:253-255`, `buildMediaPacket.js:363-365`). Their text contains no builder, tool, or edition-number reference. The tier-generic `city_celebration` trigger and `OAKLAND CELEBRATION` hint fire for any `oakland` holiday by design; the specifically named Second Dawn text is reachable on the normal calendar path only at position 27.
