---
title: Sim holiday calendar — Codex Task 1 inventory
created: 2026-09-29
updated: 2026-09-29
type: reference
tags: [research, engine, media]
sources:
  - docs/plans/2026-09-29-sim-holiday-calendar.md §Builder direction and Task 1
  - phase02-world-state/getSimHoliday.js
  - phase01-config/advanceSimulationCalendar.js
pointers:
  - "[[plans/2026-09-29-sim-holiday-calendar]] — owning plan, engine.273"
  - "[[media/TIME_CANON_ADDENDUM]] — current media time doctrine and sports exception"
---

# Sim holiday calendar — Task 1 inventory

**Scope and method:** Static read-only scan of `phase*/`, `utilities/`, `lib/`, `scripts/`, `.claude/agents/`, `.claude/skills/`, and `docs/media/` on 2026-09-29. I followed the Phase 1 writer through `S` consumers, packet/Sheet readers, named literals, and numeric month gates. No live Sheet read, engine run, code edit, or deployment was made. `file:line` references are to the current local tree. Historical article indexes, fixtures, schema labels, and validation rules are distinguished from world writers. This is an inventory for Task 2, not a proposed replacement calendar.

## Source and propagation

| Source | Reader and consequence |
|---|---|
| `phase01-config/godWorldEngine2.js:280` and `:1994` | Both cycle entry paths call `advanceSimulationCalendar_` in Phase 1; `:471-472` and `:2182-2183` later call the story-seed and chaos-weight consumers. |
| `phase01-config/advanceSimulationCalendar.js:38-55`, `:61-114`, `:120-165` | Requires the `Simulation_Calendar` tab, derives 52-position cycle-of-year, a 12-slot `SimMonth` and `CycleInMonth`, season, holiday and metadata via `getSimHoliday_`/`getSimHolidayDetails_`, First Friday, and Creation Day at position 48. Missing tab exits before filling `S`. |
| `phase02-world-state/getSimHoliday.js:15-112`, `:129-191` | Sole `getSimHoliday_` cycle-to-name table (34 occupied positions) plus priority/neighborhood/type metadata. `:208-225` holds separate First Friday and Creation Day tests. `:297-337` repeats month mappings; `:351-375` repeats priority lists. Search found no callers of those latter helpers outside their definitions; the active Phase 1 path has its own mappings. |
| `phase01-config/advanceSimulationCalendar.js:180-188`, `:204-220` | Queues row 2 of `Simulation_Calendar`: A year, B `SimMonth`, C `CycleInMonth`, D season, E `HolidayFlag`, F cycle note. Simultaneously writes `S.simMonth`, `S.month`, `S.monthName`, `S.holiday`, `S.holidayDetails`, `S.holidayPriority`, `S.holidayNeighborhood`, `S.isFirstFriday`, `S.isCreationDay`. `:289-304` sets holiday energy and Creation Day weather mood. Tab layout is code-derived; the live tab was not inspected. |
| `phase10-persistence/buildCyclePacket.js:63-70`, `:99-123`, `:1140-1146` | Reads `S`, writes month name, holiday/priority, First Friday and Creation Day into `Cycle_Packet` text; this is a downstream newsroom source. |
| `scripts/buildDeskPackets.js:511-558`, `scripts/buildWorldState.js:84-110`, `scripts/buildWorldSummary.js:178-198` | Read `Simulation_Calendar` row and/or packet-derived context, then put month, season, holiday and First Friday into desk base context, world state and world summary. `buildDeskPackets.js:420-424` says its old six-desk packet loop is frozen; retain as a reader/contract dependency, not proof it currently publishes. |

**Important distinction:** `Holiday` is the emitted flag for Christmas (`getSimHoliday.js:108`), so the literal `Holiday` throughout engine code is not merely a generic type. `getSimHolidayDetails_` also returns a generic minor fallback for any unlisted name (`:183`). The source table does **not** emit `LunarNewYear`, `BlackFriday`, `WinterSolstice`, or the `ValentinesDay` alias found in consumers; those are currently unreachable from this writer unless another source supplies the exact flag. `OpeningDay` is emitted at position 17 even though `phase02-world-state/applySportsSeason.js:3-20` says sports timing comes from the feed/config rather than `SimMonth`.

## Classification of every emitted flag

The four bins implement the builder's specified holiday set in the owning plan. “Drop” means remove as a **hardcoded calendar holiday**; it does not decide whether a separately evidenced citizen practice, school schedule, faith event, or actual sports feed event can exist. Equinoxes/solstice and school return remain possible seasonal facts, but are not among the approved holiday flags. Christmas's present code key is `Holiday`; Task 2 must account for that alias.

| Cycle-of-year | Emitted flag (`getSimHoliday.js` line) | Task 2 bin |
|---:|---|---|
| 1 | `NewYear` `:21` | keep |
| 3 | `MLKDay` `:22` | drop |
| 6 | `BlackHistoryMonth` `:28` | drop |
| 7 | `Valentine` `:29` | keep |
| 8 | `PresidentsDay` `:30` | drop |
| 11 | `StPatricksDay` `:36` | drop |
| 12 | `SpringEquinox` `:37` | drop as holiday; season marker separate |
| 15 | `Easter` `:43` | keep |
| 16 | `EarthDay` `:44` | drop |
| 17 | `OpeningDay` `:45` | sports-driven; leave engine holiday code |
| 18 | `CincoDeMayo` `:51` | drop |
| 19 | `MothersDay` `:52` | drop from small approved set |
| 21 | `MemorialDay` `:53` | drop |
| 22 | `OaklandPride` `:54` | drop |
| 23 | `PrideMonth` `:60` | drop |
| 24 | `Juneteenth` `:61` | drop |
| 25 | `FathersDay` `:62` | drop from small approved set |
| 26 | `SummerSolstice` `:63` | drop as holiday; season marker separate |
| 27 | `Independence` `:69` | drop |
| 28 | `SummerFestival` `:70` | drop pending evidence/name ruling for any world-born replacement |
| 33 | `BackToSchool` `:76` | drop as holiday; school schedule separate |
| 34 | `ArtSoulFestival` `:77` | drop |
| 36 | `LaborDay` `:83` | drop |
| 37 | `PatriotDay` `:84` | drop |
| 38 | `FallEquinox` `:85` | drop as holiday; season marker separate |
| 41 | `IndigenousPeoplesDay` `:91` | drop |
| 44 | `Halloween` `:92` | keep |
| 45 | `DiaDeMuertos` `:98` | drop |
| 46 | `VeteransDay` `:99` | drop |
| 47 | `Thanksgiving` `:100` | keep |
| 48 | `CreationDay` `:101` | world-born; keep at position 48 (`advanceSimulationCalendar.js:164`) |
| 50 | `Hanukkah` `:107` | drop as automatic citywide calendar flag; see faith map below |
| 51 | `Holiday` (Christmas) `:108` | keep Christmas; alias must be handled |
| 52 | `NewYearsEve` `:109` | keep |

**Holiday-free now:** positions **2, 4, 5, 9, 10, 13, 14, 20, 29, 30, 31, 32, 35, 39, 40, 42, 43, 49** (18/52, computed from `getSimHoliday.js:21-111`). This is **holiday-flag-free**, not necessarily low activity: First Friday runs at 1, 6, 10, 14, 18, 23, 27, 31, 36, 40, 45, 49 (`getSimHoliday.js:208-210`); current holiday-free First Fridays are **10, 14, 31, 40, 49**. Tax-day placement requires the engine-sheet Task 2 decision, including checking other activity gates.

## Engine consumers with named holiday branches

Each row identifies where names are hardcoded, what reads them, and the output/effect. References within a single module are grouped where the same reader owns them; generic `S.holiday` pass-throughs are covered in the source/contract sections.

| File:line | Reader → change |
|---|---|
| `phase01-config/godWorldEngine2.js:897-946`, `:1006-1044` | `updateWorldPopulation_` reads `S.holiday` arrays for illness, employment, travel/migration and civic-rest effects. Includes `OpeningDay`, heritage flags, and orphan `BlackFriday`/`LunarNewYear`. |
| `phase02-world-state/applyCityDynamics.js:350-454` | `applyHolidayModifiers_` reads exact flags/priority/Creation Day/First Friday and changes hood nightlife, public space, retail, traffic, community, cultural activity and sentiment; its scaled sentiment goes into city dynamics. |
| `phase02-world-state/applySeasonWeights.js:102-125`, `:132-333` | Exact flags and priority alter event, media, school, sports, civic, economic, cultural, community and nightlife weights in `S.seasonal`. Includes sports `OpeningDay:273`. |
| `phase02-world-state/applyWeatherModel.js:317-339`, `:871-909`, `:976-1002`, `:1312-1313` | Named holidays bias front transitions and weather/texture effects; the month keyed climate baseline is separate below. |
| `phase02-world-state/calendarChaosWeights.js:122-365` | Named holiday, First Friday and Creation Day multipliers alter the 17 chaos category weights, including sports, civic, accidents, crime and community. |
| `phase02-world-state/calendarStorySeeds.js:99-396` | Exact flags emit `S.storySeeds` text, domain and sometimes hood for every holiday family; `OpeningDay:281-288` authors baseball events. `:459-460` explicitly says sports-season seeds were removed but `OpeningDay` remained a calendar holiday. |
| `phase03-population/applyDemographicDrift.js:193-208`, `:303-311`, `:332-387` | `S.holiday` branches alter aggregate illness, employment/migration/economy drift; `NewYear` is also used as a January correction. |
| `phase03-population/deriveDemographicDrift.js:79-160`, `:186` | Exact flags add migration/visitor/family drift factors; `OpeningDay` supplies a sports-linked factor. Includes orphan `LunarNewYear`. |
| `phase03-population/generateCrisisSpikes.js:97-129`, `:194-248`, `:282-308` | Peaceful, crowd, civic-rest, shopping and cultural name lists change crisis odds, domain weights and descriptions; includes `OpeningDay`, `BlackFriday`, `LunarNewYear`. |
| `phase03-population/updateNeighborhoodDemographics.js:579-614` | Named holidays select hood-specific visitor/retail/culture adjustments, including `OpeningDay:606`. |
| `phase04-events/buildCityEvents.js:272-455`, `:505-538`, `:679-683` | Holiday-named city-event pools and conditions sample synthetic events and increase event count. `OpeningDay:528` is a hardcoded sports event; First Friday and Creation Day use separate flags. |
| `phase04-events/generateGenericCitizenMicroEvent.js:195-308`, `:383-391`, `:476-486` | Holiday-specific microevent phrase pools change citizens' lived events and draw chance; `:230` says “October spirit.” |
| `phase04-events/generateGameModeMicroEvents.js:335-344`, `:430-432`, `:504-505` | Holiday public-appearance pool and priority alter game-mode citizen events/chance. |
| `phase04-events/worldEventsEngine.js:153-177`, `:182-272`, `:380-384` | Named flags add weighted world-event lists, alter count and severity. `OpeningDay:230-232` creates sports events; orphan `LunarNewYear:200` remains. |
| `phase04-events/generationalEventsEngine.js:87-93`, `:892-898`, `:980-1004`, `:1049-1051`, `:1261-1343` | `S.holiday` changes weddings/health and named milestone odds; month gates affect graduation, weddings, births, promotions and retirements. `ValentinesDay` at `:983` is an alias not emitted by the source. |
| `phase05-citizens/applyNamedCitizenSpotlight.js:159-172`, `:303-329` | Holiday-to-domain map/priority gives named citizens spotlight score and reason; `OpeningDay:166` selects sports. |
| `phase05-citizens/bondEngine.js:778-796`, `:1255-1257` | Holiday lists affect family/culture bond opportunities and shared event choices; `:2756` carries Holiday/First Friday/Creation Day context. |
| `phase05-citizens/checkForPromotions.js:225-253`, `:294-296`, `:433-460` | Named holidays affect citizen promotion/advancement scoring and narrated reason/context; `OpeningDay:243,441`. |
| `phase05-citizens/generateCitizensEvents.js:1907-1940`, `:2415-2432` | Exact holiday pools create citizen LifeHistory/event texture; `:1910` writes “January” in a New Year line. |
| `phase05-citizens/generateGenericCitizens.js:292-346`, `:566-598`, `:701-715` | Name lists alter generic resident migration/illness/employment/community odds and event text, including `OpeningDay`. |
| `phase05-citizens/runAsUniversePipeline.js:369-421`, `:511-568` | Holiday branches feed universe activity prose/selection and carry First Friday/Creation Day state. |
| `phase05-citizens/runCareerEngine.js:779-843` | Name checks select citizen career notes (long weekend, holiday retail, `BlackFriday`, school return), plus First Friday and Creation Day texture. |
| `phase05-citizens/runCivicRoleEngine.js:208-275`, `:328-340` | Hardcoded civic-duty notes and role emphasis for political/heritage days; `:220` writes “July Fourth.” |
| `phase05-citizens/runEducationEngine.js:246-281`, `:285-295` | Holiday checks write education notes for civic/heritage days and school return; First Friday and Creation Day produce separate notes. |
| `phase05-citizens/runHouseholdEngine.js:225-321`, `:540-546` | Named flags produce household LifeHistory texture and change family activity draw; `Holiday:265` says Christmas; `:253` says Fourth of July. |
| `phase05-citizens/runNeighborhoodEngine.js:327-403`, `:494-512` | Named flags choose neighborhood-scoped resident experience (including `OpeningDay:367`) and downstream hood context. |
| `phase05-citizens/runRelationshipEngine.js:192-278`, `:408-420` | Holiday branches change relationship/bond event text and chance; `OpeningDay:253` and Fourth of July prose `:219`. |
| `phase06-analysis/applyCivicLoadIndicator.js:257-299` | Holiday groups change civic load/demand score; `OpeningDay:268`. |
| `phase06-analysis/applyMigrationDrift.js:278-301` | Named travel, celebration and culture groups change aggregate migration drift; `OpeningDay:283`. |
| `phase06-analysis/applyPatternDetection.js:126-140` | Named holidays modify pattern baseline/threshold context. |
| `phase06-analysis/applyShockMonitor.js:111-143`, `:329-357` | Named holidays modify expected shocks and their severity/domain; `OpeningDay:112,122`. |
| `phase06-analysis/economicRippleEngine.js:174-175`, `:429-502`, `:806-832` | Shopping/culture/Opening Day lists create typed economic ripples; month gates independently create December shopping, summer tourism, winter doldrums and economic mood changes. |
| `phase06-analysis/prioritizeEvents.js:137-165`, `:237-253` | Holiday/domain affinity boosts event priority; `OpeningDay:158` boosts sports. |
| `phase07-evening-media/applyStorySeeds.js:611-792` | Named flags emit additional story seed rows; First Friday and Creation Day emit separate rows. `OpeningDay:682` is engine-authored sports copy. |
| `phase07-evening-media/buildEveningFamous.js:272-315`, `:481-495` | Named holidays shift celebrity/cultural event pools and neighborhood attention; `OpeningDay:291,488`. |
| `phase07-evening-media/buildEveningFood.js:96-148` | Holiday flags change food-service/crowd/restaurant flavor and counts; `OpeningDay:98,143`. |
| `phase07-evening-media/buildEveningMedia.js:103-220` | Holiday-specific TV/movie/media listings are authored, including political/heritage programming and `OpeningDay:184`. |
| `phase07-evening-media/buildNightLife.js:261-310`, `:420-491` | Names change nightlife activity, intensity and venue descriptions; `:183` hardcodes a “Fourth of July Tavern.” |
| `phase07-evening-media/cityEveningSystems.js:144-267`, `:339-346` | Holiday flags alter city evening traffic, venue/event lists and citywide texture; `OpeningDay:191,267`, First Friday and Creation Day separate. |
| `phase07-evening-media/culturalLedger.js:251-306`, `:386-388`, `:580-587` | Holiday lists alter cultural-entity activity/fame/spread and persist context to Cultural_Ledger; `OpeningDay:280`. |
| `phase07-evening-media/domainTracker.js:195-245` | Named holidays change domain presence/decay for culture, civic, community, sports and other beats; `OpeningDay:245`. |
| `phase07-evening-media/mediaFeedbackEngine.js:191-255`, `:1121-1152`, `:1302-1318` | Holiday and year-end gates alter coverage profile, hope/anxiety, fame and culture feedback. Orphan Lunar New Year remains at `:233,1136`. |
| `phase07-evening-media/sportsStreaming.js:253-286` | Sports-content prompts/streaming flavor keyed to holiday names, including political/heritage observances and orphan Lunar New Year; sports truth is otherwise feed-driven. |
| `phase07-evening-media/storyHook.js:390-620`, `:1273-1311` | Named holiday hook text, priority and domains enter Story_Hook_Deck; includes real-world observances, `OpeningDay:535`, Creation Day, equinox/solstice. |
| `phase07-evening-media/textureTriggers.js:207-310` | Exact names emit location-specific texture triggers; `OpeningDay:297-300` invents baseball/parade atmosphere. |
| `phase08-v3-chicago/applyDomainCooldowns.js:68-110`, `:129-132` | Named celebration, festival, Opening Day and quiet-family lists shorten or lengthen domain cooldowns. |
| `phase08-v3-chicago/v3NeighborhoodWriter.js:661-712`, `:751-761` | Named flags change persistent Neighborhood_Map event/nightlife/noise/sentiment modifiers and labels; `OpeningDay:707-710`. |
| `phase09-digest/applyCompressionDigestSummary.js:169-225` | Name-to-abbreviation map writes holiday tags into compressed digest. Orphan `BlackFriday`/`LunarNewYear` still mapped. |
| `phase09-digest/applyCycleWeight.js:316-361` | Priority/high-signal names and First Friday/Creation Day add cycle-weight score and reasons; `OpeningDay:336` adds high-signal points. |

**Context and persistence without additional specific-name decisions:** `phase05-citizens/bondPersistence.js:66-69,166-169`, `phase05-citizens/seedRelationBondsv1.js:415-418`, `utilities/ensureRelationshipBonds.js:35-38`, `utilities/citizenDialMap.js:160-162`, `utilities/compressLifeHistory.js:187-210`, `phase08-v3-chicago/v3DomainWriter.js:64-67`, `phase08-v3-chicago/v3Integration.js:71-82`, `phase10-persistence/recordWorldEventsv3.js:267-270` copy holiday/First Friday/Creation Day fields into bonds, dials, LifeHistory, v3 rows or world events. `phase07-evening-media/buildMediaPacket.js:73-88`, `phase07-evening-media/mediaRoomIntake.js:168-201,670-682`, `phase08-v3-chicago/v3preLoader.js:254-257`, `phase09-digest/finalizeCycleState.js:851-854`, `phase10-persistence/compileHandoff.js:200-212,686-692`, and `phase10-persistence/recordWorldEventsv25.js:63-96` serialize the context to media/packets/ledgers. These names/columns are reader contracts even where no exact holiday is branched on.

## Separate observance and month systems

| File:line | Reader → change / decision surface |
|---|---|
| `phase02-world-state/getSimHoliday.js:208-210`; `phase01-config/advanceSimulationCalendar.js:151-157`; `scripts/buildDeskPackets.js:533-538` | First Friday is fixed to the first position of each **old month**, independently of the holiday table. It affects city dynamics, weights, events, media, cycle weight and desk context (examples above). It is a real-world recurring event baked into 12-month structure, not one of the four classified holiday bins; Task 2 needs an explicit cadence/evidence ruling. |
| `utilities/ensureFaithLedger.js:304-380`, `:660-663`; `phase04-events/faithEventsEngine.js:111-123,251-265` | `HOLY_DAYS` maps numeric month to Epiphany, Lent, Easter, Pentecost, Advent/Christmas, Assumption, All Saints, Purim, Passover, Rosh Hashanah, Yom Kippur, Sukkot, Shavuot, Hanukkah, Ramadan, Eids, Losar, Vesak, Obon, Holi, Janmashtami, Diwali, Vaisakhi, Gurpurab and Winter Solstice. Faith events read `S.simMonth`, then can write observance events. **Drop as automatic month-timed observances** under the proposed seasons/cycles calendar; separately source-grounded faith life is a builder/engine-sheet ruling, not answered by deleting a citywide flag. |
| `phase05-citizens/runYouthEngine.js:55-73`, `:146-149`, `:364`, `:838-840`, `:927-945` | `ACADEMIC_CALENDAR[1..12]` hardcodes Black History Month, Thanksgiving break, school start/graduation/homecoming, etc. It selects youth LifeHistory texture, school-wide events and event probabilities. School timing does **not** come from `getSimHoliday_`. |
| `phase05-citizens/runCivicElectionsv1.js:23,63`; `phase10-persistence/buildCyclePacket.js:1033` | Election window is described as November / cycles 45-48 in even years; cycle rule remains a separate hardcode and should be reviewed if month language disappears. |
| `phase04-events/buildCityEvents.js:300-379`, `:396-455`; `phase07-evening-media/buildEveningMedia.js:124-131`; `phase07-evening-media/storyHook.js:434-439`; `phase05-citizens/runCivicRoleEngine.js:219-220` | Literal “Fourth of July,” “MLK,” “Presidents Day,” “Día de los Muertos,” etc. occur inside content pools, not only flag comparisons. Dropping flags leaves these texts dormant from this calendar, but any reused pool or external tag could still expose them. |
| `phase02-world-state/getSimHoliday.js:177-180`, `:324-337`; `phase02-world-state/calendarStorySeeds.js:387-396` | `WinterSolstice` has metadata/consumer branches but no emitted cycle; spring/summer/fall markers are emitted as holidays. Keep season calculation conceptually separate from holiday flags. |

### Every operational month-name / numeric-month dependency found

| File:line | Reader → change |
|---|---|
| `phase01-config/advanceSimulationCalendar.js:61-114,194-212` | 12 uneven month ranges produce numeric `S.simMonth`, `S.month`, `S.cycleInMonth` and English `S.monthName`; Sheet B/C and packet consumers inherit them. |
| `phase02-world-state/getSimHoliday.js:18-109,297-337,383-418`; `phase02-world-state/getsimseason.js:17-51` | Calendar comments and month helpers align 52 positions with named months; `getSimSeason_` fallback maps numeric months to seasons. |
| `phase02-world-state/applyWeatherModel.js:61-77,122,228,401` | `OAKLAND_MONTHLY_CLIMATE[1..12]` changes sampled temperature by `S.simMonth`; “June gloom” is literal weather texture. This survives removing holiday names. |
| `phase04-events/generationalEventsEngine.js:229-236,892-898,949,980-1004,1050-1051,1261,1292-1293,1343` | Numeric month changes citizen milestone caps and probabilities; “June wedding” can enter LifeHistory. |
| `phase05-citizens/runYouthEngine.js:61-73,364,838-840,927-945`; `utilities/ensureFaithLedger.js:304-380,660-663` | Numeric month drives school/youth and faith observance content and odds (above). |
| `phase06-analysis/economicRippleEngine.js:211-223,435-447,506-521,806-832`; `phase07-evening-media/mediaFeedbackEngine.js:116-125,242-249,317-329` | Numeric `S.month` drives December shopping/year-end, summer tourism, January/February doldrums, economy mood and media narrative/tone. `scripts/economicInputs.test.js:64-128` explicitly protects these once-dead-now-live branches. |
| `phase07-evening-media/mediaRoomIntake.js:190-202,670-682`; `phase10-persistence/recordWorldEventsv25.js:63-96`; `phase10-persistence/buildCyclePacket.js:63-70,99-103,1140-1146` | Month goes to media intake, `World_Events` Month column and packet text; packet converts 1..12 to English names. |
| `scripts/buildDeskPackets.js:513-551`; `scripts/buildInitiativeWorkspaces.js:72`; `scripts/buildVoiceWorkspaces.js:406` | Desk base context converts Sheet month number to name (also `--month` CLI override); two workspace builders paste `baseContext.month` into prompts. |
| `scripts/buildWorldState.js:92-100`; `scripts/buildWorldSummary.js:178-198`; `scripts/post-cycle-review.js:29` | Sheet numeric month is copied into orientation, world-summary header and review fields. |
| `lib/editionParser.js:366,395-405`; `scripts/capability-reviewer/parseEdition.js:336`; `scripts/validateEdition.js:754-829,1230-1232`; `scripts/canon-name-check.js:42-43` | Edition date parsers and name/canon validators explicitly recognize all English month names. `validateEdition` warns on real-month prose but exempts narrow baseball idioms. These are **guards/parsers**, not world time writers; update carefully so the no-month guard does not disappear. |
| `scripts/daily-reflection.js:114-116,212-215` | Uses wall-clock `Date.getMonth()` to date engineering/personal reflection output, not the sim calendar. Scope decision should distinguish it from world-facing month text. |
| `phase02-world-state/applySportsSeason.js:275-300`; `phase05-citizens/civicInitiativeEngine.js:1011-1014` | `Date.getMonth()` reparses Sheets auto-formatted W-L or vote strings; these are conversion mechanics, not simulation-month season derivation. |

**Other hardcoded English month prose/prompt examples:** `phase04-events/generateGenericCitizenMicroEvent.js:230` (“October spirit”); `phase05-citizens/generateCitizensEvents.js:1910` (“January”); `phase05-citizens/runCivicRoleEngine.js:220`, `phase05-citizens/runHouseholdEngine.js:253`, `phase05-citizens/runRelationshipEngine.js:219` (“Fourth of July”); `phase07-evening-media/buildEveningMedia.js:156` (“October Dark”); `phase05-citizens/runCivicElectionsv1.js:23,63` (November); `utilities/rosterLookup.js:116,164,187,221,242` (reporter style samples with October/November/December). `scripts/buildInitiativePackets.js:103` includes a fixed “September 15” deliverable in prompt data; it is not sourced from `Simulation_Calendar`. `phase02-world-state/applyWeatherModel.js:122` is weather texture, not a timing gate.

## Media / agent instructions and static records

These paths can affect prompts, validators, or downstream presentation even after engine flags change. The `.claude/**` entries are read-only control-plane files; no edit is proposed here.

| File:line | Reader → consequence |
|---|---|
| `.claude/agents/culture-desk/IDENTITY.md:24,28,126`; `LENS.md:29,37,40,70,108,183-184`; `RULES.md:30,42` | Culture desk persona and lens prompt First Friday, Fourth of July, September school start and April/October/May anecdotes as recurring texture. |
| `.claude/agents/sports-desk/LENS.md:39`; `.claude/agents/sports-desk/RULES.md:43` | Sports desk voice/angle examples use “January Tuesday” and Opening Day; sports source must remain game/feed evidence. |
| `.claude/agents/letters-desk/IDENTITY.md:18`; `RULES.md:53` | Letters examples contain an April move; rule requires human-readable holiday labels (e.g. Summer Festival). |
| `.claude/agents/freelance-firebrand/IDENTITY.md:61`; `RULES.md:64,181,197`; `.claude/agents/civic-office-mayor/RULES.md:69` | Commentary/office prompts can mention First Friday, political dates or a generic seasonal address; check evidence gate before any story/public action. |
| `.claude/agents/engine-validator/IDENTITY.md:26`; `.claude/skills/run-cycle/SKILL.md:133`; `.claude/skills/stub-engine/SKILL.md:70` | Validator checks calendar fields; run-cycle/content-draft instructions consume holiday facts; stub-engine documents `ctx.config.holiday`. |
| `.claude/skills/dispatch/SKILL.md:228`; `.claude/skills/write-edition/SKILL.md:209,282`; `.claude/skills/write-supplemental/SKILL.md:58-60,143` | Prompt examples contain “First Friday in October” and recurring First Friday beat/assignment. `write-supplemental/SKILL_archive.md:35,92` repeats the archived example, not a live instruction. |
| `.claude/agents/civic-desk/RULES.md:115`; `.claude/agents/civic-office-{baylight-authority,crc-faction,okoro}/RULES.md:189,197,94`; `.claude/agents/civic-project-{health-center,oari,stabilization-fund,transit-hub}/RULES.md:226,205,275,203`; `.claude/agents/final-arbiter/RULES.md` | Month/date examples here are **forbidden date examples** or review checks, not month-based event triggers. Preserve their protective function. |
| `docs/media/TIME_CANON_ADDENDUM.md:29,50-64,108,176-182` | Doctrine allows sports month language when supplied by game data while rejecting civil-calendar month inference. It needs reconciliation with the new “seasons and cycles” direction; no source was silently changed. |
| `docs/media/MEDIA_ROOM_HANDOFF.md:85,120,306,336-338`; `docs/media/DESK_PACKET_PIPELINE.md:157,395`; `docs/media/MEDIA_INTAKE_V2.2_HANDOFF.md:36,73,83,154,285-288` | Handoff and packet examples expose month/holiday sections and old Juneteenth story examples. These are historical/contracts, not fresh proof of a current event. |
| `docs/media/intake.md:18`; `docs/media/KAI_ARTS_BAG.md:13`; `docs/media/voices/kai_marston.md:3,34`; `docs/media/voices/maria_keen.md:7`; `docs/media/PAULSON_CARPENTERS_LINE.md:41` | First Friday, October, Fourth of July and Christmas are embedded as prompt/voice/history texture. |
| `docs/media/voices/{carmen_delaine,celeste_tran,farrah_del_rio,hal_richmond,sharon_okafor,trevor_shimizu}.md:15,11,15,15,25,15`; `docs/media/HAL_ARCHIVE_BAG.md:84` | Voice examples contain month-name framing; they shape desk language, not engine timing. |
| `docs/media/ANTHONY_RAINES_PORTFOLIO_INDEX.md:97,154,235,259`; `docs/media/P_SLAYER_JOURNEY_INDEX.md:31,37,49,65,69,132,139,370,382,419`; `docs/media/CITIZEN_NARRATIVE_MEMORY.md:196-208`; `docs/media/CITIZENS_BY_ARTICLE.md:328,679,915,920,1356,1698,2509`; `docs/media/ARTICLE_INDEX_BY_POPID.md:85,184,742`; `docs/media/DRIVE_MANIFEST.md:27,51,219`; `docs/media/RICHMOND_ARCHIVE_INDEX.md`; `docs/media/story_evaluation.md:118-120` | Historical article/portfolio/index entries repeat old month and holiday titles/events. They are retrieval/history records, not current holiday writers; do not rewrite history to make the new calendar look applied retroactively. |

**Script-side editorial readers:** `scripts/buildSeasonFeelSlice.js:12,50,79-82` recognizes `holiday=Holiday`, Christmas/Advent to build season-feel slices; `scripts/buildEveningSlice.js:317-321,705` recognizes First Friday/Christmas content and suggests First Friday desk modes; `scripts/engine-auditor/routePatternSeeds.js:480-520` reads holiday/First Friday from world-summary text to explain cross-hood patterns; `scripts/cleanupStorylineTracker.js:54,156` embeds First Friday in a tracker cleanup description; `scripts/auditStorylineDomainRouting.js:89,98` has an observance keyword bank; `scripts/auditCanonDrift.js:152,174,186` has Opening Day/First Friday/Summer Festival terms in its lexical rules. `lib/photoGenerator.js:207-208,522` chooses event scenes/photographer from First Friday text. `_compile_c97.js:27,46` and `docs/media/story_evaluation.md:118-120` are C97 historical build/evaluation examples, not current calendar authorities. `scripts/validateEdition.js:65-67` also scans for raw `FirstFriday`/`CreationDay` tokens.

**Tests/fixtures and schema-only literals:** `scripts/economicInputs.test.js:64-128`, `scripts/buildSeasonFeelSlice.test.js:8-23`, `scripts/capability-reviewer/parseEdition.test.js:54`, `scripts/validateEdition.test.js:259-262`, `scripts/educationLoop.test.js:345`, `scripts/hoodBlindTexture.test.js:67-79`, `scripts/illnessEnvelope.test.js:128-335`, `scripts/engine-auditor/detectLedgerCompleteness.test.js:35-71`, `scripts/griefPeriod.test.js:103-104`, `scripts/citizenDials.test.js:83-92`, `scripts/economicMoodCarry.test.js:111`, `scripts/employmentEnvelope.test.js:88,160`, `scripts/patternShockRelative.test.js:191`, `scripts/sentimentRestingLevel.test.js:70`, `scripts/mediaPhaseOwnership.test.js:55` and `scripts/hoodIdentityRemainder.test.js:125-175` contain calendar assertions/synthetic context, not extra world writers. `scripts/householdReconcile.test.js:634-643` uses **June as a person name**, not a month dependency. `scripts/__fixtures__/realLifeHistory.json:8,17-18` and `scripts/fixtures/hood-scenes.json:2-23` are fixture text. Schema/repair tools name columns (`scripts/auditSheetHeaders.js:31,75-96`, `scripts/auditRemainingHeaders.js:73`, `scripts/repairArcLedgerHeaders.js:43-46`, `scripts/mintCanonBonds.js:82-83`, `scripts/processEditionIntake.js:140-143`, `scripts/post-cycle-review.js:29`, `scripts/testNeighborhoodLoop.js:127`); changing calendar fields requires checking those contracts, not treating header names as holiday events. `docs/media/REAL_NAMES_BLOCKLIST.md:15,90` and `docs/media/CITIZEN_NARRATIVE_MEMORY.md:384` contain **Jrue Holiday**, a person name, not a calendar hit.

## Task 2 handoff facts

1. Removing rows from `getSimHoliday_` alone prevents those exact source flags but leaves literal event pools, month keyed writers, First Friday, packet display, historical prompts, orphan holiday aliases, and field/schema contracts. The old table's priority metadata and the duplicate priority list also need coherent treatment (`getSimHoliday.js:137-191,351-375`).
2. `OpeningDay` has causal writers for population, city dynamics, crisis, events, citizens, analysis, media, v3 neighborhoods and cycle weight (examples above); a feed-controlled sports event needs an explicit route rather than a fixed cycle flag. `applySportsSeason.js:3-20` already states the feed/config boundary.
3. `CreationDay` exists in **two** forms at position 48: `S.holiday='CreationDay'` and `S.isCreationDay=true` (`advanceSimulationCalendar.js:164,214-220`). Many readers check both, so Task 2 should preserve one coherent anniversary and avoid duplicate effects.
4. No new world-born name/week has been approved in the plan. The week the world ran on its own, court opening, Cycle 79, and tax day remain design decisions. No holiday-free position has yet been proven low engine activity by this static inventory.

**Verdict:** adopt this as the Task 1 source map for engine.273 Task 2 design; verify changed behaviors with local/sandbox evidence before claiming a new calendar is active.

## Changelog

- 2026-09-29 (codex) — Read-only Task 1 inventory completed for Claude review.

## Correction — 2026-09-29

- The `calendarStorySeeds.js:99-396` inventory row says `S.storySeeds`; the assignment at `calendarStorySeeds.js:489` is `S.seasonalStorySeeds`.
