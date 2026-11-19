# Adversarial Review — `engine.350` Task 7, the Other Engines' Line Signs (`b78af111d`)

**Reviewed:** commit `b78af111dac97f6e3f4c6d8fa50c953b8c7faf26` (`phase05-citizens/runRelationshipEngine.js`, `phase05-citizens/runHouseholdEngine.js`, `phase05-citizens/runAsUniversePipeline.js`, `phase04-events/generateGenericCitizenMicroEvent.js`, `phase05-citizens/runNeighborhoodEngine.js`, `phase05-citizens/generateCitizensEvents.js`, `scripts/homeSocialLineSign.test.js`, `scripts/householdEngine.t4.test.js`, `scripts/engine32MultiCycle.test.js`), readers across `phase*`, `utilities/`, `lib/`, `scripts/`, `dashboard/`, live `Neighborhood_Map` (read-only via `lib/sheets.js`), `output/beats/LifeHistory_Log.jsonl`, and `output/simulation_ledger_snapshot.jsonl`.
**Reviewer:** Antigravity (agy lane, read-only; no code or sheet edits, no bench or engine fires).
**Verdict:** **HOLD**

All three modified test files pass as written (`node scripts/homeSocialLineSign.test.js`: 38 passed; `node scripts/householdEngine.t4.test.js`: 28 passed; `node scripts/engine32MultiCycle.test.js`: 19 passed), and `hoodTexturePool_` across all 22 live `Neighborhood_Map` neighborhoods returns zero unlisted lines for `runHouseholdEngine.js` and `runAsUniversePipeline.js`. However, the review finds: (1) `runRelationshipEngine.js` still pushes weather and media lines that are 100% unlisted (`0` overlap), dropping them while still burning `LIMIT = 8` (`globalEvents++`) and marking citizens active in `cycleActiveCitizens`; (2) `scripts/buildWorldSummary.js` (`WHO_LIVED_IT_TAGS`) exact-matches bare `'Relationship'` and `'Household'` and now drops every graded row; (3) `utilities/neighborhoodPulseMap.js` `pulseKindForLine_` still pulses `FirstFriday`, `Cultural`, and `Community` `*-Down-S` lines upward; (4) semantic disputes and internal contradictions in `RELATIONSHIP_SIGN_LINES_`, `HOUSEHOLD_SIGN_LINES_`, `POSTCAREER_SIGN_LINES_`, and `firstFridaySigns`; (5) remaining contradicting fixed-size writers (`Rivalry`, `Alliance`, `Mentorship`, `Arc`, `CreationDay`, `Public`, `Reputation`, `Faith`, `PostCareer-Influence`, `PostCareer-Wellness`); and (6) test stubs, source-text-only checks, and vacuous assertions in all three test files.

---

## 1. Each sign, by what the sentence says (disputed lines only)

### 1a. `RELATIONSHIP_SIGN_LINES_` (`phase05-citizens/runRelationshipEngine.js:49-88`)
- **`"relied on familiar social circles during cold period"` — listed `plain` (`:84`), says social behavior:** Relying on familiar circles describes selective social leaning (`openness:down` for sticking to the known, or `sociability:up`/`warmth:up`), contradicting the table's rule (`:45`, `"says nothing the citizen did or felt toward anyone"`).
- **`"felt romantic energy in social interactions"` — listed `plain` (`:85`), says what the citizen felt:** Explicitly names an affectionate/social feeling (`warmth:up`). Compare `phase04-events/generateGenericCitizenMicroEvent.js:403`, which signs `"felt the romantic atmosphere"` as `dial:warmth:up`.

### 1b. `HOUSEHOLD_SIGN_LINES_` (`phase05-citizens/runHouseholdEngine.js:128-211`)
- **`"prepared the home for New Year's celebration"` (`:131`) and `"prepared the home for seasonal gatherings"` (`:134`) — listed `family:up`, vs. `"decorated the home for Halloween"` and `"decorated the home for the holidays"` listed `plain` (`:189`):** All four describe solitary home prep mentioning no household member or family interaction.
- **`"felt positive atmosphere inside the home"` (`:138`) — listed `family:up`, mentions no family/household members:** Describes home mood (`composure:up` or `warmth:up`), inconsistent with `"felt slight shift in home mood due to recent events"` being placed on `composure` (`:158`).
- **`"watched the snow fall from the window"` (`:149`), `"heard the avenue traffic fade in the evening"` (`:151`), `"heard the village street go quiet for the night"` (`:153`) — listed `composure:up`, actually plain sensory observations:** None contains a feeling verb (`"enjoyed"`, `"appreciated"`, `"relaxed"`). They match the exact phrasing of `plain` entries (`"watched joggers pass by from the window"`, `"heard the civic district go quiet from inside"`, `"noticed the main street quiet after closing"`, `:191-192, 203`). Borderline on the same pattern: `"noticed the tidy calm of the block from the window"` (`:151`) vs. `"noticed the upscale neighborhood calm"` (`plain`, `:205`).
- **`"felt slight shift in home mood due to recent events"` (`:158`) — listed `composure:down`, directionless:** Comes from `chaosPool` (`:330`). `S.worldEvents` includes positive civic/community events, so `"shift in home mood"` has no polarity — identical to `"felt social atmosphere shift due to today's happenings"`, which `RELATIONSHIP_SIGN_LINES_` (`:85`) puts in `plain`.
- **`"felt the tiredness of a hard-working street"` (`:160`) and `"felt the boom-time churn of the block from inside"` (`:161`) — listed `composure:down`, street observations:** Observing a working-class street's pace or boom-time construction activity is not the citizen losing composure. Compare the sibling `'clinic'` line `"felt the tired, caring pace of the block from inside"` signed `warmth:up` (`:165`), and `"observed development activity from the window"` / `"noticed the block's working rhythm from inside"` listed `plain` (`:201, 204`).
- **`"smelled cooking from a neighbor's kitchen"`, `"smelled cooking from a nearby home"`, `"smelled food from a nearby kitchen"` (`:166`) — listed `warmth:up`, vs. `"smelled cooking from nearby restaurants"` listed `plain` (`:208`):** Sensory smell observations with no feeling or social contact stated.
- **`"heard music from a studio down the block"` and `"noticed a new mural from the window"` (`:175`) — listed `openness:up`, passive window observations:** Hearing external music or seeing a mural out a window shows no creative engagement, contradicting `"heard music from a neighbor's gathering"` (`plain`, `:203`) and `"heard creative activity on the street"` / `"noticed the neighborhood's artistic character from home"` (`plain`, `:207`).
- **`"heard the crowd roar from the arena"` (`:184`) — listed `fandom:up`, passive neighborhood noise:** From `'stadium'` hood texture (`:53`), not sports participation or cheering; identical to `"noticed game-day traffic from the window"` (`plain`, `:201`).
- **`"prepared home for cooler fall conditions"` (`:187`), `"used fans or open windows to cool the home"`, `"adjusted the thermostat for the cold snap"`, `"secured items near windows during windy conditions"` (`:188`), `"tidied up after New Year's festivities"`, `"decorated the home for Halloween"`, `"decorated the home for the holidays"` (`:189`) — listed `plain`, concrete household actions:** All describe active chores/maintenance, while `"managed small chores and daily responsibilities"` and `"organized part of the home during seasonal transition"` are `drive:up` (`:178`).
- **`"appreciated the home's foundational meaning"` (`:190`) — listed `plain`, explicitly says what the citizen felt:** Every other `"appreciated ..."` line in `HOUSEHOLD_SIGN_LINES_` is signed `composure:up` (`:154-155`) or `openness:up` (`:176`). Compare `POSTCAREER_SIGN_LINES_` (`:181-182`), which signs Creation Day `"feeling connected to deep roots today"` and `"appreciating the community's origins"` as `warmth:up`.
- **`"felt the block's evening energy from inside"` (`:195`), `"felt the block's patchwork rhythm from inside"` (`:200`), `"felt the neighborhood's bustling energy"` (`:208`) — listed `plain`, inconsistent with identical `"felt ..."` lines signed up:** Compare `"felt the steady pace of the block from inside"` (`composure:up`, `:152`) and `"felt the creative energy from inside"` (`openness:up`, `:176`).

### 1c. `POSTCAREER_SIGN_LINES_` (`phase05-citizens/runAsUniversePipeline.js:142-204`)
- **`"watching the civic district from a bench in retirement"` (`:144`) and `"watching city life from a Downtown bench"` (`:150`) — listed `outabout:up`, vs. `"watching the commuter flow from a station bench"` (`:194`) and `"watching the neighborhood change from a bench"` (`:196`) listed `plain`:** Direct self-contradiction on identical bench-sitting observations.
- **`"attending openings along the corridor"` (`:148`) and `"attending gallery openings in the arts district"` (`:152`) — listed `outabout:up` vs. `openness:up`:** Gallery openings are cultural engagement (compare `"exploring the corridor's galleries in retirement"` and `"exploring KONO's street art and galleries"` under `openness:up`, `:167, 170`).
- **`"watching the birds at the lake"` (`:160`) and `"watching boats at the estuary"` (`:161`) — listed `composure:up`, passive observation:** No calm/feeling verb, unlike `"enjoying the lake's calming presence"` (`:159`); compare `HOUSEHOLD_SIGN_LINES_` (`"heard geese from the lake"`, `plain`, `:203`).
- **`"keeping appointments close to home"` (`:195`) — listed `plain`, concrete restriction/behavior:** Staying near home for appointments expresses `outabout:down` (or `composure:up`), not a passive look at the block.
- **`"appreciating the neighborhood's late energy from a distance"` (`:195`), `"appreciating the working rhythm of the neighborhood"` (`:196`), `"appreciating the neighborhood's character"` (`:198`), `"taking in the urban rhythm of Downtown Oakland"` (`:198`) — listed `plain`, explicit feeling/engagement verbs:** Contradicts `"appreciating the steady rhythm of the neighborhood"` (`composure:up`, `:158`), `"appreciating the community feel"` (`warmth:up`, `:181`), and `"taking in Jack London's waterfront scenery"` (`outabout:up`, `:152`).
- *(Note on `"continuing to adjust to post-career life"`, `:202`)*: Unreachable orphan — `b78af111d` deleted `if (pool.length === 0) pool.push("continuing to adjust to post-career life")` (`runAsUniversePipeline.js:528` diff), and `pool` is never empty for `retired` `ENGINE` citizens (`addAthleteLifestyle_` always pushes `wellnessPool` at `:431`).

### 1d. `firstFridaySigns` (`phase05-citizens/runNeighborhoodEngine.js:456-479`)
Of the 11 pre-existing lines (all re-signed from `sociability:up`), **6** are signed `dial:outabout:up` even though the sentence describes noticing/feeling the neighborhood rather than the citizen going out:
- **Uptown:** `"noticed First Friday crowds filling the galleries"` (`:458`, passive observation of crowds -> `plain`), `"felt the monthly art walk energy in Uptown"` (`:459`, creative/arts energy -> `openness:up`, matching `"sensed the creative community coming alive"` at `:461`).
- **KONO:** `"felt KONO's First Friday buzz"` (`:466`, creative energy -> `openness:up`, matching `:467-469`).
- **Temescal:** `"noticed First Friday spillover into Temescal"` (`:474`, passive observation -> `plain`), `"felt the neighborhood's evening energy rise"` (`:475`, general mood/atmosphere -> `plain` or `openness:up`; compare `HOUSEHOLD_SIGN_LINES_` `"felt the block's evening energy from inside"`, `plain`, `:195`), `"observed art enthusiasts wandering the streets"` (`:476`, watching *other* people walk -> `plain`).

---

## 2. Readers of what changed

1. **`scripts/buildWorldSummary.js:301-313` (`WHO_LIVED_IT_TAGS`, `emitWhoLivedIt`) — MISSES:**
   - `WHO_LIVED_IT_TAGS` (`:301-302`) lists exact bare strings `'Relationship'` and `'Household'`, and `:310-311` checks `if (!WHO_LIVED_IT_TAGS.includes(tag)) continue;` on `LifeHistory_Log.EventTag` without `baseTag_` or `gradedParts_`.
   - **Effect:** Every graded `Relationship-<Dial>-<Up|Down>-S` and `Household-<Dial>-<Up|Down>-S` row in `LifeHistory_Log` now misses and is silently skipped; the `### Relationship (N)` and `### Household (N)` sections disappear from `## Who Lived It (cycle N)` in `output/world_summary_c{N}.md` (only untouched `Health` and `Recovering` rows survive).
2. **`utilities/neighborhoodPulseMap.js:29, 58, 61, 96-100, 147-149` + `phase04-events/generateGenericCitizenMicroEvent.js:666` + `phase05-citizens/generateCitizensEvents.js:3958` — WRONG-SIGN PULSE / STANDALONE MISS:**
   - `PULSE_MAP` holds `'Community'` (`{ sentiment: 2, attractiveness: 1 }`), `'Cultural'` (`{ vitality: 1, attractiveness: 2 }`), and `'FirstFriday'` (`{ attractiveness: 2, vitality: 1 }`). (`'Relationship'`, `'Household'`, `'PostCareer'`, `'Continuity'` have no `PULSE_MAP` entry.)
   - When `citizenDialMap.js` is co-loaded (production Apps Script), `pulseForEvent_` (`:99`) calls `baseTag_(tagS)`:
     - In `generateGenericCitizenMicroEvent.js:666`, `tag` is now `'Cultural-Openness-Up-S'` or `'Community-Sociability-Up-S'`. `baseTag_` strips both back to `'Cultural'` / `'Community'` (all 6 lines in `culturalActivityPool` and `communityPool` are `:up`, so polarity matches; if `neighborhoodPulseMap.js` is loaded standalone without `baseTag_`, `PULSE_MAP[tagS]` misses and becomes a no-op).
     - In `generateCitizensEvents.js:3958`, `recordPulse_(S, citizenHood, pulseKindForLine_(lineKind, primaryTag), tags, pick)` passes `pulseKindForLine_` (`utilities/neighborhoodPulseMap.js:147-149`), which **only** handles `lineKind === 'Neighborhood'` (`'Neighborhood-Down'`). For `lineKind === 'FirstFriday'`, `'Cultural'`, or `'Community'`, `*-Down-S` tags (including `FirstFriday-Outabout-Down-S`, `Cultural-Openness-Down-S`, `Community-Sociability-Down-S`) pass the bare positive `lineKind` and still push **positive** `EventAttractiveness`/`RetailVitality`/`Sentiment` onto `S.neighborhoodPulse[hood]`.
   - `runRelationshipEngine.js` and `runNeighborhoodEngine.js` do not call `recordPulse_`.
3. **`dashboard/server.js:2151` — MISSES (pre-existing parser defect):**
   - `part.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})?\s*[—-]*\s*(?:\[(\w+)\])?\s*(.*)/s)` uses `\w+` (no hyphens) and requires `YYYY-MM-DD`, so all graded tags (`Household-Family-Up-S`) and sim-stamped lines fall back to `tag: 'General'` (`:2164`).
4. **`utilities/compressLifeHistory.js:165-256, 1161, 1950-1956`:**
   - `TAG_TRAIT_MAP` (`:165, 172, 177, 198, 209-218, 245, 254-256`) has exact bare and calendar-suffixed keys read without `baseTag_` in `computeProfile_` (`:1161`), which would miss all graded tags — **but `computeProfile_` / `TAG_TRAIT_MAP` is dead v1 code (`:20-22`)**.
   - Live `formatDialFace_` (`:1950-1956`) tallies `entries[t].tag` verbatim into `TopTags`, splitting `Relationship`/`Household`/`PostCareer` across `<Kind>-<Dial>-<Up|Down>-S` tokens instead of pooling under one kind.
5. **Verified non-breaking readers (no miss, no double-count):**
   - `utilities/citizenDialMap.js:404-406`: `nudgesForEvent_` checks `gradedNudges_(tagS)` before `DIAL_MAP[baseTag_(tagS)]`, so graded tags fold 1-step without double-counting legacy `DIAL_MAP` entries (`:80, 84, 91, 97, 114`). `Household-GameNight` (`runHouseholdEngine.js:516`) still strips `-GameNight` via `CALENDAR_SUFFIXES` (`:334`) to `Household` (`family: 5`).
   - `scripts/buildLivesSlice.js:53-55, 178`: `LIFE_TAGS` (`(?=$|-)`) and `SIGNAL_TAG` (`^...` prefix) match all new graded tags (`PostCareer-*` stays rank 0; `Relationship-*`, `Community-*`, `Cultural-*`, `Household-*` stay rank 2; `Continuity` not in either, unchanged).
   - `scripts/newsroomSourcing.js:14-16`: `streetKind_` calls `gradedParts_(t)` -> `'Cultural'` matches `STREET_TAGS`.
   - `phase05-citizens/educationCareerEngine.js:1017`: `settleYouthCounts_` regex already accepts `Cultural-<Dial>-<Up|Down>-<S|M|L>` and `Community-<Dial>-<Up|Down>-<S|M|L>`.
   - `ctx.summary.householdEvents[].tag`: grepped across `phase*`, `utilities/`, `lib/`, `scripts/`, `dashboard/` — **zero production readers** (written at `runHouseholdEngine.js:728-748`, read only in tests).

---

## 3. The dropped draw

| Path / Field | `runRelationshipEngine.js` (`:582-592`) | `runHouseholdEngine.js` (`:694-703`) | `runAsUniversePipeline.js` (`:634-642`) |
|---|---|---|---|
| `ctx.summary.cycleActiveCitizens` | **Still pushed (`:589`)** on dropped draw. Citizen enters `bondEngine.js` (`:532, 611`), `generateCitizensEvents.js` (`:730`), and `computeRecurringCitizens.js` (`:57`) / `exportCycleArtifacts.js` (`:156`) with **no written line**. | Not used by this engine. | Not used by this engine. |
| `globalEvents` / cap (`LIMIT`) | **`globalEvents++` still executes (`:590`)** against `LIMIT = 8` (`:160, 381`). Dropped plain/unlisted draws consume cap slots, reducing written lines below 8. | **`count++` is skipped (`continue` at `:700`, `count++` at `:736`)**. `LIMIT = 6` (`:279, 572`) counts written lines only (asymmetric with `runRelationshipEngine`). | No cap in engine. |
| `eventsGenerated` | **Not incremented** (`:622` skipped). **Disagrees with `globalEvents`**: `globalEvents` can hit `LIMIT = 8` while `eventsGenerated` rises by `< 8`. | **Not incremented** (`:737` skipped). Matches written `count`. | **Not incremented** (`:664` skipped). Matches written `postCareerEvents`. |
| `householdEvents` / story signals | No per-engine summary array. | **`householdEvents.push` skipped (`:728`)**. `S.householdEvents` holds written events only. | **`postCareerEvents++` skipped (`:663`)**. `S.postCareerEvents` (`:683`) holds written events only. |
| `gameNightTouched` + Ripple | N/A | **`gameNightPool` is handled before `householdLineTag_` (`:688-690`)**, so game-night draws are never dropped and `gameNightTouched` / `recordRipple_` (`:751-765`) remain exact. | N/A |
| `LifeHistory_Log` / `logRows` | `queueAppendIntent_` skipped (`:606`). | `queueAppendIntent_` skipped (`:711`). | `logRows.push` skipped (`:653`). |
| `row[iLastUpd]` / `rows[r]` | `row[iLastUpdated]` skipped (`:600`); `ctx.ledger.dirty = true` still set unconditionally at `:630`. | `row[iLastUpd]` skipped (`:709`); `ctx.ledger.dirty = true` still set unconditionally at `:743`. | `row[iLastUpd]` skipped (`:651`); `rows[r] = row` at `:640` (unmutated) and `ctx.ledger.dirty = true` still set at `:674`. |

---

## 4. Lines from outside the lists

1. **`hoodTexturePool_` on all 22 live `Neighborhood_Map` hoods (`runHouseholdEngine.js:654`, `runAsUniversePipeline.js:613`):**
   - Executed `loadCanonNeighborhoods_` + `hoodTexturePool_` against live `Neighborhood_Map` (22 hoods, read-only via `lib/sheets.js`) across all 17 `EmployerCharacter` labels (`institutional`, `clinic`, `schools-retail`, `campus`, `transit-retail`, `nightlife`, `professional`, `residential`, `retail`, `medical`, `family-retail`, `mixed`, `village-retail`, `service-labor`, `arts`, `stadium`, `construction`) and all 12 bespoke hood pools.
   - **Result:** **0 unlisted lines** in either engine across all 22 live neighborhoods (`HOUSEHOLD_SIGN_BY_TEXT_`: 0/102 unlisted; `POSTCAREER_SIGN_BY_TEXT_`: 0/102 unlisted).
2. **`runRelationshipEngine.js:537-557` (`getWeatherEvent_`, `weatherEventPools.special`, `getMediaInfluencedEvent_`) — 100% UNLISTED:**
   - `runRelationshipEngine.js:537-557` still pushes into `pool`:
     - `getWeatherEvent_(ctx, false)` at `rng() < 0.2` (`:538`), which draws from `S.weatherEventPools.{holiday, enhanced, base}` (`phase02-world-state/applyWeatherModel.js:894-984, 1262-1303`),
     - **all** of `ctx.summary.weatherEventPools.special` whenever `hasWeatherCondition_(ctx, 'heat_wave')` is true (`:545-549`, `applyWeatherModel.js:934-964, 1114-1217`), and
     - `getMediaInfluencedEvent_(ctx)` at `rng() < 0.15` (`:553`), which draws from `pools.{oakland_pride, festival, holiday, arts, sports, crisis, anxious, hopeful, celebrity}` (`phase07-evening-media/mediaFeedbackEngine.js:560-648, 1057-1139, 1249-1345`).
   - **Cross-check against `RELATIONSHIP_SIGN_BY_TEXT_`:** **0 overlap** with `applyWeatherModel.js` and `mediaFeedbackEngine.js`.
   - **Consequence:** Every draw that lands on a weather or media line hits `relationshipLineTag_` -> `{ tag: '', why: 'unlisted' }` (`:583`), increments `S.engine299.noDialBySource['runRelationshipEngine:Relationship:unlisted']`, writes nothing, **still pushes the citizen into `cycleActiveCitizens` (`:589`)**, and **still consumes one of the `LIMIT = 8` slots (`globalEvents++` at `:590`)**. During a `heat_wave`, concatenating `weatherEventPools.special` (3–6+ lines onto a ~10–20-line pool) drops ~20%–40% of qualifying draws as `unlisted`.

---

## 5. Sizes and the fold (`utilities/citizenMemory.js`, `utilities/compressLifeHistory.js`)

### 5a. Old vs. new sizes and annual budget
Fire-rate ceiling per citizen over a 52-Cycle year:
- `runRelationshipEngine.js`: was `Relationship` (`sociability +5, warmth +2`), `Cultural` (`openness +4, outabout +3`), `Community` (`sociability +4, warmth +2`) -> now `<Kind>-<Dial>-<Up|Down>-S` (`±1` on 1 dial). Capped at `LIMIT = 8` across ~850 eligible Tier-3/4 citizens (top-of-ledger `driftChance` 0.02–0.15 -> ~1–3 hits/yr; citywide mean ~0.5/yr): a citizen who drew 2 `Relationship` lines/yr drops from `+10 sociability, +4 warmth` to at most `+2` (or `-2`).
- `runHouseholdEngine.js`: was `Household` (and `-FirstFriday/-CreationDay/-Holiday`, `family +5`) -> now `Household-<Dial>-<Up|Down>-S` (`±1` across 8 dials; `33/163` lines are `family:up`, `2/163` `family:down`). Capped at `LIMIT = 6` across ~850 eligible citizens (~0.4/yr citywide mean; ~1–2/yr near top of ledger): a citizen who drew 2 `Household` lines/yr drops from `+10 family` to at most `+1` or `+2` (and across all lines, ~60% of `Household` hits were non-`family` or `plain`).
- `runAsUniversePipeline.js`: was `PostCareer` (`family +4, openness +2`, plus calendar/sports suffixes) -> now `PostCareer-<Dial>-<Up|Down>-S` (`±1`; only `2/124` lines are `family:up`, `0` `family:down`). Uncapped (`chance` 0.02–0.10 -> ~1.0–2.5 draws/yr per retired UNI citizen): drops from `+4 to +10 family` and `+2 to +5 openness`/yr to `~0–1` on `family` and `~0–2` on the drawn dial (`outabout`/`composure`/`openness`/`fandom`).
- `generateGenericCitizenMicroEvent.js`: `Cultural` (`openness +4, outabout +3`) and `Community` (`sociability +4, warmth +2`) -> `±1` (`Cultural-Openness-Up-S`, `Community-Sociability-Up-S`). Uncapped (`chance` up to 0.12 -> ~2–6 lines/yr total across all pools, ~0.1–0.3 cultural/community lines/yr).
- `runNeighborhoodEngine.js`: `firstFridaySigns` stays `±1` (`FirstFriday-<Dial>-<Up|Down>-S`), shifting 11 lines off `sociability +1` onto `outabout`/`openness` plus 5 down lines.
- `generateCitizensEvents.js`: `Continuity` follow-up lines go from `0` (dropped as unsigned) to `±1` (`Composure-Down-S`, `Sociability-Up-S`, `Drive-Up-S`).

### 5b. Does anything still move `family`, `sociability`, or `warmth` for good at today's speed keys (`dialLineScale = 1, dialDirectShare = 0`)?
In `utilities/citizenMemory.js` (`HARDEN_STREAK = 3` at `:41`, `MOOD_DECAY = 0.8` at `:37`, settle floor `0.5 * room` at `:230`), a `±1` push fades `1.0 -> 0.8 -> 0.64 -> 0.512 -> 0` on the **4th** quiet Cycle (`3` intervening quiet Cycles max to continue a streak). At `dialLineScale = 1, dialDirectShare = 0`:
- **`runHouseholdEngine`, `runRelationshipEngine`, `runAsUniversePipeline` alone** (`~0.4–2.5` draws/yr) almost never hit 3 same-dial same-direction Cycles with gaps `<= 3` Cycles, so `Household-*-S` alone no longer hardens `family`.
- **What STILL moves them permanently at `(1, 0)`:**
  1. **Direct-to-base reflections** (`accreteReflectionsIntoBase_`, `utilities/citizenMemory.js:197-214`): bypasses the 3-streak gate for all three dials (`Warm`, `Angry`, `Resentful`, `Spat`, plus event tags in `Reflection_Intake`).
  2. **Multi-step (`|delta| >= 2`) tags that remain in `DIAL_MAP` (`utilities/citizenDialMap.js`):**
     - `family`: `Household-GameNight` / `-GameNight-Win` / `-GameNight-Loss` (`+5`, fades in 10 Cycles, `runHouseholdEngine.js:516-545`), `Wedding` / `Birth` (`+10`), `Divorce` (`-8`), `Retirement` (`+4`), `LifeEvent-Home-Up-M/L` (`+2/+4`), `LifeEvent-Home-Down-L` (`-2`), plus **`overwork` `Strain`** (`family: -1`, `runCareerEngine.js:1515`, which fires consecutive Cycles until `PRESSURE_NO_ADAPT`).
     - `sociability`: `Alliance` (`+4`), `Rivalry` (`+2`), `Reputation` (`+2`), `CivicRole` (`+5`) / `CivicRole-Up-M/L` (`+2/+3`), `Edition` (`+2`), `PostCareer-Influence/Community/Fundraiser` (`+3/+2/+2`), `Public` (`+4`).
     - `warmth`: `Mentorship` (`+6`), `Faith` (`+3`), `Wedding`/`Birth` (`+4`), `PostCareer-Community` (`+2`), `youth-community_support` (`+4`).
  3. **High-frequency `generateCitizensEvents.js` `±1` lines** (`~1–2` draws/Cycle every Cycle for every eligible citizen, so `sociability`, `warmth`, and `family` `±1` streaks within 4-Cycle gaps can still occur).

### 5c. `compressLifeHistory.js` `foldNewEntries_` at the builder's ruled middle row (`dialLineScale = 2, dialDirectShare = 0.25`)
Executed directly via `compressLifeHistory.js` `foldNewEntries_` + `citizenMemory.js` `settleCycle_` (200,000 Cycles per point, `base` reset to `50` each step so `room = 1`, `moodFade = 0.8`, `hardenShare = 0.4`, `±1` tag `Household-Family-Up-S` / `-Down-S`):

Because `directShare = 0.25` writes `2 * 0.25 = ±0.5` directly to `base` on every active Cycle, **permanent move counts (`upMoves : downMoves`) match the push share**, while **total permanent `base` magnitude (`upSum : downSum`)** adds the 3-streak hardenings (`1.5` mood fades in 5 quiet Cycles):

| Share of pushes up | `(2, 0.25)` `pActive = 0.5` move count `up : down` (`% down`) | `(2, 0.25)` `pActive = 0.5` `base` sum `up : down` | `(2, 0.25)` `pActive = 0.1` (`~5/yr`) `base` sum `up : down` | `(1, 0)` `pActive = 0.5` move count `up : down` (`% down`) |
|---|---|---|---|---|
| **50%** | `1.00 : 1` (`50.0%`) | `1.00 : 1` | `1.00 : 1` | `1.01 : 1` (`49.7%`) |
| **55%** | `1.22 : 1` (`45.0%`) | `1.38 : 1` | `1.27 : 1` | `2.08 : 1` (`32.5%`) |
| **60%** | `1.50 : 1` (`40.0%`) | `1.92 : 1` | `1.61 : 1` | `4.32 : 1` (`18.8%`) |
| **70%** | `2.33 : 1` (`30.0%`) | `3.68 : 1` | `2.65 : 1` | `21.49 : 1` (`4.4%`) |
| **85%** | `5.61 : 1` (`15.1%`) | `11.20 : 1` | `6.80 : 1` | `645.44 : 1` (`0.2%`) |

---

## 6. What is still out there (other fixed-size contradicting writers in `phase*`)

Counts below are from `output/beats/LifeHistory_Log.jsonl` (C115–C116) and `output/simulation_ledger_snapshot.jsonl` (`Y*C1–C12`, `C48–C52`):

1. **`Rivalry`** (`utilities/citizenDialMap.js:82`, `{ sociability: 2, composure: -3 }`) — `phase05-citizens/runRelationshipEngine.js:324-330, 566` and `phase05-citizens/generateCitizensEvents.js:2407-2416, 3217-3219`:
   - **Rate:** `1/Cycle` in `LifeHistory_Log.jsonl` (C115–C116), `1–3/Cycle` in snapshot.
   - **Contradicting lines:** `"avoided someone they've had friction with"` (`runRelationshipEngine.js:329` — actively avoiding people, yet `+2 sociability`), `"caught themselves measuring the week against <rivalName>'s"` (`generateCitizensEvents.js:3219` — private brooding, `+2 sociability`), `"felt a flicker of tension thinking about a competitor"` (`runRelationshipEngine.js:325`).
2. **`Alliance`** (`utilities/citizenDialMap.js:81`, `{ sociability: 4 }`) — `phase05-citizens/runRelationshipEngine.js:332-338, 568` and `phase05-citizens/generateCitizensEvents.js:2395-2405, 3205-3207`:
   - **Rate:** `1` in C115 `LifeHistory_Log.jsonl`, `0–3/Cycle` in snapshot.
   - **Contradicting lines:** `"felt reassured by a solid friendship"` (`runRelationshipEngine.js:335`), `"appreciated the loyalty of a close contact"` (`runRelationshipEngine.js:337` — internal feeling, no social interaction, yet `sociability +4`).
3. **`Mentorship`** (`utilities/citizenDialMap.js:93`, `{ warmth: 6, drive: 2 }`) — `phase05-citizens/runRelationshipEngine.js:340-345, 570` and `phase05-citizens/generateCitizensEvents.js:2430-2439, 3233-3234`:
   - **Rate:** `0` in C115–C116 `LifeHistory_Log.jsonl` and snapshot.
   - **Contradicting lines:** `"reflected on guidance from someone experienced"` (`runRelationshipEngine.js:341`), `"felt responsibility toward someone looking up to them"` (`runRelationshipEngine.js:344` — passive thought/weight pushed `warmth +6, drive +2`).
4. **`Arc`** (`utilities/citizenDialMap.js:50`, `{ drive: 4, openness: 2 }`) — `phase05-citizens/runRelationshipEngine.js:350-355, 572` and `phase05-citizens/generateCitizensEvents.js:2419-2428, 3293-3295`:
   - **Rate:** `0` in C115–C116 `LifeHistory_Log.jsonl` and snapshot.
   - **Contradicting lines:** `"felt the social weight of unfolding events"` (`runRelationshipEngine.js:351`), `"felt the mounting pressure of unfolding events"` (`generateCitizensEvents.js:2420` — social weight/pressure pushed `drive +4, openness +2`).
5. **`CreationDay` (pool-signed)** (`CreationDay-Warmth-Up-S`, `{ warmth: 1 }`) — `phase05-citizens/runNeighborhoodEngine.js:490-495, 643`:
   - **Rate:** `1` in snapshot `Y*C48` (`"felt connected to Oakland's story"`).
   - **Contradicting lines:** `"felt something foundational in the neighborhood air"` (`:491`), `"noticed neighbors reflecting on how things began"` (`:493` — ambient observation, not personal warmth). (`holidayNeighborhoodEvents` at `:437, 632-634` is currently `{}` so `0` lines/Cycle, though `:633` still hardcodes `'dial:sociability:up'`.)
6. **`Public`** (`utilities/citizenDialMap.js:88`, `{ sociability: 4 }`) — `phase04-events/generateGameModeMicroEvents.js:123-132, 163-168, 213-219, 528-529` and `phase05-citizens/generateCivicModeEvents.js:210, 235, 319, 473-474`:
   - **Rate:** `3` in C116 `LifeHistory_Log.jsonl`, `2–3/Cycle` in snapshot (`Y*C8/C9/C12`).
   - **Contradicting lines:** `"prepared public safety statements for the press"` (`generateCivicModeEvents.js:210` — desk prep pushed `sociability +4`), `"fulfilled a sponsor obligation"` (`generateGameModeMicroEvents.js:129`), `"attended a Spring Equinox civic observance"` (`LifeHistory_Log.jsonl` C116).
7. **`Reputation`** (`utilities/citizenDialMap.js:85`, `{ integrity: 3, sociability: 2 }`) and **`Faith`** (`utilities/citizenDialMap.js:94`, `{ warmth: 3, composure: 2 }`) — `phase05-citizens/generateCitizensEvents.js:1975-2000, 3104-3115, 3831`:
   - **Rate:** `Reputation` `10–11/Cycle` in C115–C116 `LifeHistory_Log.jsonl` (up to `36` in snapshot `Y*C5`); `Faith` `5–6/Cycle` in C115–C116 `LifeHistory_Log.jsonl` (up to `19` in snapshot `Y*C5`).
   - **Contradicting lines:** Because neither `Reputation` nor `Faith` is in `GRADED_ONLY_KIND_` (`:1234`) and both have non-empty `DIAL_MAP` entries (`kindMovesNothing_` is `false` at `:3831`), `generateCitizensEvents.js` always writes them bare: `"overheard their own name in a conversation outside the cafe"` (`:3108`) gives `integrity +3, sociability +2`, and `"the scent of incense drifts from the temple doors left ajar"` (`LifeHistory_Log.jsonl` C115–C116) gives `warmth +3, composure +2`.
8. **`PostCareer-Influence`** (`{ sociability: 3 }`) and **`PostCareer-Wellness`** (`{ composure: 3 }`) — `phase05-citizens/runAsUniversePipeline.js:391-421, 627-630`:
   - **Rate:** `PostCareer-Influence` `1/Cycle` in C115 `LifeHistory_Log.jsonl` (`1` in snapshot `Y*C4/C5/C9/C11`).
   - **Contradicting lines:** `"handled a few personal business tasks with an advisor"` (`:420`) and `"considered a media or coaching opportunity without committing"` (`:419`) push `sociability +3`; `"kept up a light training routine for health and structure"` (`:413`) pushes `composure +3`.

---

## 7. Trick code in the three test files

### 7a. `scripts/homeSocialLineSign.test.js`
1. **Unconditional `hoodTexturePool_` stub (`:101, 136`):** `global.hoodTexturePool_ = (ctx, hood, byLabel, bespoke) => flat(byLabel).concat(flat(bespoke))` replaces `canonNeighborhoodLoader.js`, bypassing `resolveHoodOrChild_` / `getHoodCharacter_` and feeding every hood's pool into every citizen.
2. **Weather/media functions omitted from `runRelationshipEngine` test (`:22, 62-96`):** `getWeatherEvent_`, `getMediaInfluencedEvent_`, `weatherEventPools.special`, and `getCitizenDialBands_` (`:22`) are absent/null in the sandbox, so `typeof ... === 'function'` at `runRelationshipEngine.js:537, 552` is `false`. That hides the live bug that every weather/media draw is `unlisted` (`:93` asserts `!bySrc['runRelationshipEngine:Relationship:unlisted']` only because those pools never entered).
3. **Hardcoded deleted line in `poolTexts` (`:140-141`):** Manually concatenates `['continuing to adjust to post-career life']` (`:141`) even though `b78af111d` removed that fallback from `runAsUniversePipeline.js` — masking the fact that `"continuing to adjust to post-career life"` in `POSTCAREER_SIGN_LINES_.plain` (`:202`) is now an unreachable orphan.
4. **Partial source slice & brittle string regex (`:32, 64-65`):** `strings()` (`:32`) matches only double-quoted lowercase strings `>= 11` chars with a space (silently skipping single-quoted or short lines); `:64` slices `runRelationshipEngine.js` before `var rivalryRels`, skipping bond pools.
5. **Section 3 (`:166-193`) never executes any of the three engines:** Only runs regex/substring checks on source files (`:170` `/var KIND_HAS_DELTAS_ = \{\};/`, `:171-177`, `:186-187`, `:190-192`). None of `generateGenericCitizenMicroEvents_`, `runNeighborhoodEngine_`, or `generateCitizensEvents_` is invoked, so `Continuity` graded emission, `FirstFriday` down-tag emission, and `recordPulse_` interaction remain unexecuted. Note `:186` also whitelists `composure` in `/^dial:(outabout|openness|sociability|composure):(up|down)$/` even though `firstFridaySigns` has zero `composure` lines.
6. **Assertions weaker than their labels (`:94, 124-129, 149, 160`):**
   - `:94`: checks total `active === written + dropped`, not that plain-draw citizens specifically entered `cycleActiveCitizens` (or reached `bondEngine`).
   - `:124`: reads only `ctx.summary.householdEvents` (never checks `row[iLife]` or `queueAppendIntent_` `LifeHistory_Log` payloads in the household block), and excludes `GameNight` from `wrong` (`:124-125`).
   - `:129`: `Object.keys(dials).length >= 6` does not require `family-`, `outabout+`, or `outabout-` to appear in 20,000 runs.
   - `:149, 160-163`: `ss: { getSheetByName: () => null }` skips `logRows` / `LifeHistory_Log` verification for `runAsUniversePipeline`.

### 7b. `scripts/householdEngine.t4.test.js`
1. **Bespoke-only `hoodTexturePool_` stub (`:20`):** `(ctx, hood, byLabel, bespoke) => (bespoke && bespoke[hood] ? bespoke[hood].slice() : [])` omits `HOUSEHOLD_TEXTURE_BY_CHARACTER_` (half of Temescal's texture pool), inflating `ailmentPool`/`wellnessPool`/`partneredPool`/`parentPool`/`gameNightPool` draw share.
2. **Reads `ctx.summary.householdEvents`, not `LifeHistory` or `LifeHistory_Log` (`:24, 74, 148, 173`):** `queueAppendIntent_` is a no-op and `row[iLife]` is never inspected.
3. **Tautological `5.6` draw-count check (`:196-198`):** `quiet.length + quiet.unwritten === winStreak.length + winStreak.unwritten` sums written + dropped draws, which is strictly determined by the pre-pool `hRng() < chance` gate (`runHouseholdEngine.js:646`) and passes regardless of whether game-night lines changed the written count.
4. **Loosened `>=` in `5.13` (`:212`):** Uses `>=` instead of exact equality across all game-night runs because `mixed` (`:200`) and `neutral` (`:210`) also appended to `ripples`.

### 7c. `scripts/engine32MultiCycle.test.js`
1. **Bespoke-only `hoodTexturePool_` stub (`:65`):** Identical stub dropping all 17 `HOUSEHOLD_TEXTURE_BY_CHARACTER_` pools in Trace A and Trace B.
2. **Vacuous `B3b` zero-movement assertion on legacy `C0` path (`:71, 313-317`):** `inWorldStamp_` (`:71`) reads `ctx.config.cycleCount` (unset in `makeCtx`/`runTrace`, `:153`), stamping every line `C0` (`cycle = 0`). `compressLifeHistory.js:1820` skips `cycle > 0` checks and routes every aged-out line through legacy `foldAgedOutEntries_` (`foldOneEntry_` per line), never `foldNewEntries_`. `B3b` (`:314`, `movers === 0 && sd === 0`) would also pass if `Household-*` lines moved no dials at all; `B3c` (`:315-317`) checks only the surviving 20-line tail via regex (`!/\[Household(-FirstFriday|-Holiday|-CreationDay)?\]/`, which omits `-Weather` if one existed) without verifying `nudgesForEvent_` or `mood.family` on those lines.
