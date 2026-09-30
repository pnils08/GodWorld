---
title: Sim holiday calendar — seasons and cycles, world-born holidays
created: 2026-09-29
updated: 2026-09-30
type: plan
tags: [engine, calendar, draft]
sources:
  - Builder direction 2026-09-29 (engine-sheet session, after the tax-day ruling)
  - phase02-world-state/getSimHoliday.js — the cycle-of-year holiday table
  - phase01-config/advanceSimulationCalendar.js — Creation Day at cycle-of-year 48
pointers:
  - "[[plans/2026-09-21-care-and-justice-system]] — tax day (engine.271) sits on this calendar"
  - "[[SIM_DOCTRINE]] — canon beats real-world priors"
  - "[[index]] — registered same commit"
---

# Sim holiday calendar

**Goal:** the sim's calendar runs on seasons and cycles, not a 12-month year, and its holidays are a small set of basic shared ones plus holidays born in the world itself — so stories stay in the sim.

**ROLLOUT:** engine.273.

## Builder direction (2026-09-29)

- **Seasons and cycles, not months.** The sim does not run on a 12-month year; aligning months to it can collide with when the builder plays the sports entries. Major holidays align cycle-to-week.
- **Nothing sports-driven is hardcoded as a holiday.** "Opening Day" cannot be engine code — the two teams are not run by the engine.
- **Real-world storylines as little as possible.** Drop the real-world political and heritage observances (the table carries e.g. MLK Day, Black History Month, Presidents Day, Pride Month, Memorial Day, Cinco de Mayo). Keep basic shared ones: New Year, Valentine's, Easter, Halloween, Thanksgiving, Christmas, New Year's Eve.
- **Add world-born holidays that celebrate the world and its accomplishments.** Creation Day already is one (cycle-of-year 48, the world's founding anniversary — `advanceSimulationCalendar.js:164`). Candidates from the builder: the week the world began running on its own, the week the court system opened, the week at Cycle 79.
- **Tax day** (engine.271) is a cycle with no holiday and low engine activity.
- **The contamination test (clarified 2026-09-29).** Loosely mentioning a month is not contamination. Contamination is a month or holiday that *directs* something (an engine branch, a cron, an agent or skill instruction), or any use of a holiday the world doesn't honor. Scope covers engine, crons, agents and skills under that test.
- **Keep list extended (2026-09-29):** Mother's Day, Father's Day, First Friday are kept. St Patrick's, Earth Day, Summer Festival drop. Faith: Easter (and Christmas) are on the keep list; the rest of the automatic real-world holy-day calendar needs decisions, under the rule *more sim storylines, less real-world influence*.

**Canon guard (engine-sheet):** a world-born holiday is named and told in-world only. The builder, the assistant, crons and the build are never named or implied in a holiday's name, text or story — they are marked by what the world gained that week (e.g. "the week the court opened"), per the never-reveal-the-builder rule and canon-leak-guard.

## Tasks

### Task 1 — inventory (codex, read-only)

- **Files:** every file in `phase*/`, `utilities/`, `lib/`, `scripts/`, `.claude/agents/`, `.claude/skills/`, `docs/media/` that names a holiday, a month, or a real-world observance.
- **Steps:** list the calendar source (`getSimHoliday.js`, `advanceSimulationCalendar.js`, `Simulation_Calendar` tab) and every hardcoded holiday or month read elsewhere, with file:line, what reads it, and what it changes (engine effects, story seeds, desk prompts). Classify each holiday: keep (basic shared) · drop (real-world political/heritage) · sports-driven (remove from engine) · world-born (keep/extend). Flag every month-name dependency.
- **Output:** [[research/2026-09-29-codex-holiday-calendar-inventory]] (filed from the review inbox 2026-09-30, engine-sheet, when Task 2 was handed over).
- **Status:** [x] inventory landed 2026-09-29; verified by research-build (outcome below).

#### Task 1 outcome — research-build ruling (2026-09-29)

**Verdict:** adopt the inventory as the Task 2 source map, plus the additions below. Scope is engine hardcoding (`phase*/`, `utilities/`, `lib/`, and scripts that read `Simulation_Calendar` fields as contracts). The inventory's §Media / agent instructions is out of scope, except edition validators: the `validateEdition.js` month guard must survive.

**Verified against code:**
- Holiday table: 34 flags, positions and line numbers exact (`getSimHoliday.js:21-109`).
- Calendar writer fields and sheet row 2 (`advanceSimulationCalendar.js:180-220`).
- Creation Day fires twice at position 48: holiday flag plus `S.isCreationDay`.
- Sports boundary is feed-only (`applySportsSeason.js:3-20`).
- Five helpers have zero callers: `getMonthFromCycle_`, `getSimMonthFromCycle_`, `getHolidayPriority_`, `isCreationDay_`, `getCreationDayAnniversary_`.
- 5/5 sampled consumer citations are exact.
- Codex's `S.seasonalStorySeeds` correction holds.

**Missed engine readers (add to Task 2 scope):**
1. `phase06-analysis/filterNoiseEvents.js:50-54,102-135`
   - `OpeningDay` hardcode (`:126`) keeps sports events through the noise filter.
   - Priority and holiday neighbourhood keep events through the filter.
   - First Friday and Creation Day have their own branches.
2. `phase08-v3-chicago/applyCycleRecovery.js:38-41,70-80,131-140`
   - `bigCelebrations` name list (oaklandpride, artsoulfestival, newyearseve, independence) and `oakland` priority raise the recovery thresholds.
   - Three of the four names are in the drop bin.
3. `phase02-world-state/updateTransitMetrics.js:123-124`: any holiday other than none sets transit `dayType='holiday'`. This branch does not check names, but its fire rate changes as the table shrinks.
4. `phase05-citizens/generateCivicModeEvents.js:428`, `generateMediaModeEvents.js:379`: priority major/oakland adds +0.02 to the event chance. These depend on the priority metadata.

- Pass-through only: `generateCrisisBuckets.js:345-346,490`, `lib/mags.js:99`, `finalizeWorldPopulation.js:213`, `utilities/cycleModes.js:248,324,375`.
- Stale, not in scope: `utilities/godWorldDashboard.js:190` reads a World_Population `isFirstFriday` column that `finalizeWorldPopulation.js:195` says was removed.

**Mechanism guidance for Task 2 (engine-sheet's call):**
- Month-keyed tables are timing curves, not holidays: weather climate, academic calendar, economy/media month gates, generational month gates, faith `HOLY_DAYS`. Rekey them to cycle-of-year or season ranges rather than deleting them. What leaves is the English month name as output.
- Keep one priority table. The live table is `getSimHoliday.js:137-191`; `:351-375` is dead.
- `OpeningDay`: every branch, now including `filterNoiseEvents`, either reads the sports feed (`S.sportsFeedEntries`) or is deleted. No fixed cycle.

**Builder calls — resolved 2026-09-29:**
- Mother's Day, Father's Day and First Friday are kept. St Patrick's, Earth Day and Summer Festival are dropped.
- First Friday moves from "first cycle of each old month" to a cycle cadence (engine-sheet sets the cadence).
- Faith: Easter and Christmas stay. For the rest of `HOLY_DAYS`, Task 2 brings the list to the builder for decisions, under *more sim storylines, less real-world influence*.
- Dropped holidays' content pools are **deleted**, not left dormant. The inventory notes that a reused pool could still expose dormant text.

#### Task 1 review — the contamination test applied beyond the engine (research-build, 2026-09-29)

The test: a month or holiday that *directs* a cron, agent or skill, or any use of a holiday the world doesn't honor. Loose mentions pass.

**Directive contamination found (fix in Task 2's build, engine-sheet executes):**
1. `.claude/agents/culture-desk/IDENTITY.md:28` and `LENS.md:184`: the desk's editorial-stance example is "a Fourth of July that feels different". Swap it for an honored or world-born moment.
2. "Summer Festival" is the model holiday label in `letters-desk/RULES.md:53`, `sports-desk/RULES.md:43` and `culture-desk/RULES.md:42`. It is now dropped, so swap the example for an honored holiday.
3. `.claude/skills/write-supplemental/SKILL.md:58`: "If Rosh Hashanah is happening across three neighborhoods, a culture piece acknowledges it" directs a real-world observance. Swap it for a sim storyline; this follows the faith ruling.
4. `scripts/buildInitiativePackets.js:103`: "5 deliverables due September 15" is a hard calendar deadline in a packet that `run-cycle/SKILL.md:150` still builds. Convert it to a cycle or drop the date.
5. The engine's month reaches agents through `scripts/buildWorldSummary.js:198` ("Month N"), the month name in `buildDeskPackets.js:511-558`, and the workspace headers in `buildVoiceWorkspaces.js:406` and `buildInitiativeWorkspaces.js:72` (both legacy per `city-hall/SKILL.md:365-368`). These carry whatever the engine emits: they drop the month when `monthName`/`simMonth` leave output, and season stays.

**Checked and passing (loose or guard):**
- Martin Luther King Jr. Way is a street (`freelance-firebrand`).
- The mayor's "Oakland pride" is a word, not the holiday.
- The script hits for "independence rule" and "quiet pride" are not holidays.
- The April, "January Tuesday" and October voice examples are loose mentions.
- First Friday appears across the culture desk and skills; it is now honored.
- `dispatch/SKILL.md:228` "First Friday in October" is loose.
- Forbidden-date examples and `validateEdition.js` month checks are guards, so keep them.
- Codex's script coverage held: the six extra script files a sweep flagged are all false positives.

#### Task 1 review — kimi (2026-09-29)

**Verdict: agree.** Restored by research-build from kimi's report; its first write was overwritten by a concurrent research-build edit.
1. The 4 missed readers are verified and exact:
   - `filterNoiseEvents.js`: `:126` OpeningDay keep; `:130-135` priority/neighbourhood keep; `:102-117` First Friday / Creation Day branches.
   - `applyCycleRecovery.js`: `:70` bigCelebrations (3 of 4 names in the drop bin); `:77-81` oakland-priority threshold raise.
   - `updateTransitMetrics.js:123-124`: any holiday other than none sets `dayType='holiday'`.
   - `generateCivicModeEvents.js:428` and `generateMediaModeEvents.js:379`: +0.02 chance.
2. The 5 zero-caller helpers are confirmed, with no callers in `phase*/ utilities/ lib/ scripts/`.
3. The sweep found 4 additions of the same kind in `utilities/`, none contradicting the ruling:
   - `ensureTransitMetrics.js:510-511`: consumes the holiday `dayType` (transit ×0.4).
   - `neighborhoodPulseMap.js:51`: the FirstFriday tag pulses attractiveness/vitality.
   - `bylineEngine.js:140,632`: firstfriday seed type sets the dispatch format.
   - `loadEventContentLedger.js:44-45`: holiday/firstFriday/creationDay source tags (pass-through).
   - False positives cleared: `initiativePhaseContract.js:722` ("observation holiday" is a grace-period metaphor) and `restoreCarryForward103.js` (fixture data).

### Task 2 — design (engine-sheet, after the inventory)

- The new cycle-of-year table, world-born holidays with in-world names (builder confirms names and weeks), tax-day week, and the removal list. Advisor + outside review before build.

#### Task 2 design (engine-sheet, 2026-09-30 — awaiting outside review)

**Read-before (2026-09-30, code).** `getSimHoliday_` (`getSimHoliday.js:15-112`) and `getSimHolidayDetails_` (`:129-191`) are the only live sources; `isFirstFridayCycle_` (`:208`) has one caller (`advanceSimulationCalendar.js:151`), which also carries its own fallback list (`:154-156`). Zero callers: `isCreationDay_` `:224`, `getCreationDayAnniversary_` `:242`, `getMonthFromCycle_` `:297`, `getSimMonthFromCycle_` `:324`, `getHolidayPriority_` `:351` (grep over `phase* utilities lib scripts dashboard`). Reach of the names the build touches: `OpeningDay` 45 files; the Christmas flag literal `'Holiday'` 91 hits in 63 files; `S.monthName` is written (`advanceSimulationCalendar.js:212`) and read by nothing — the English month reaches output through `buildCyclePacket.js:102` (`getMonthName_Packet_` `:1140`), `buildDeskPackets.js:513-529`, and `buildWorldSummary.js` ("Month N" in the calendar line). Absolute Cycle → year position is `((c − 1) % 52) + 1` (`advanceSimulationCalendar.js:55`): C79 → position 27, C110 → 6.

**The table (engine, one source).** `getSimHoliday.js` holds one `SIM_HOLIDAYS` object keyed by year position → `{ name, label, priority, neighborhood, type }`; `getSimHoliday_` and `getSimHolidayDetails_` read it; the metadata map at `:137-181` and the dead helpers above are deleted.

| Pos | Flag | Label (output) | Priority | Hood | Basis |
|---:|---|---|---|---|---|
| 1 | `NewYear` | New Year | major | Downtown | keep list |
| 7 | `Valentine` | Valentine's | minor | — | keep list |
| 15 | `Easter` | Easter | major | — | keep list |
| 19 | `MothersDay` | Mother's Day | minor | — | keep list (2026-09-29) |
| 25 | `FathersDay` | Father's Day | minor | — | keep list (2026-09-29) |
| 44 | `Halloween` | Halloween | major | Temescal | keep list |
| 47 | `Thanksgiving` | Thanksgiving | major | — | keep list |
| 48 | `CreationDay` | Creation Day | major | Oakland | world-born, standing (priority unchanged) |
| 51 | `Holiday` | Christmas | major | — | keep list — flag value unchanged (91 reads), label carries the name |
| 52 | `NewYearsEve` | New Year's Eve | major | Downtown | keep list |
| *builder* | world-born | *builder names* | oakland | *builder* | reserved, below |

Everything else in today's table leaves it: the real-world political and heritage observances, St Patrick's, Earth Day, Summer Festival, `OpeningDay` (sports-driven — the teams are not engine-run), and the three season markers and `BackToSchool` (not on the keep list; season stays in `S.season`, school timing stays in `runYouthEngine`'s own calendar). 34 flagged weeks become 10 plus the world-born ones.

**Priority `oakland` becomes the world-born tier.** Today it holds only dropped names (`OpeningDay`, `OaklandPride`, `ArtSoulFestival`, `SummerFestival`, `EarthDay`); every new world-born holiday takes it. Creation Day stays `major` — moving it would change what its week does, which nobody ruled. The readers that key on priority (`generateCivicModeEvents.js:428`, `generateMediaModeEvents.js:379` +0.02; `applyCycleRecovery.js:77-81` threshold raise; `filterNoiseEvents.js:130-135` keep) keep working on the key without a rename — the tier means "the city's own days."

**World-born holidays — reserved, builder names them.** From the builder's candidates: *the week at Cycle 79* → position 27 (C79 = Y2C27); *the week the court system opened* and *the week the world began running on its own* → positions set from the in-world Cycle each happened, which the builder confirms. Names are in-world only, marked by what the world gained that week, never by who built it (canon guard above). Until named, no slot is emitted — the table ships with the ten above.

**First Friday cadence (engine-sheet's call, ruled 2026-09-29).** Every fourth week from position 2: 2, 6, 10, … 50 — 13 a year, one source (`isFirstFridayCycle_`), no fallback list in the calendar writer. The cadence touches no keep-list position, so a First Friday never shares a week with a kept holiday.

**Creation Day, one form.** `S.isCreationDay = (S.holiday === 'CreationDay')` in the writer; the separate `cycleOfYear === 48` test goes. Every reader that checks both `S.holiday === 'CreationDay'` and `S.isCreationDay` is read in the build and applies the effect once — the inventory lists them (`applyCityDynamics`, `calendarChaosWeights`, `calendarStorySeeds`, `buildCityEvents`, `applyCycleWeight`, `applyStorySeeds`, `cityEveningSystems`, the Phase-5 engines); each is a named line in the build diff. **Fold only duplicates:** where the two guards apply the same effect, one goes; where they gate two different effects, both stay (both now fire from the same week, as today) and the note says so — folding distinct effects is a sim change nobody ruled.

**Months: English names leave output; the month index stays as a rhythm key.** Deliberate departure from §Task 1 outcome's "rekey to cycle-of-year or season ranges": re-keying changes no value, only churn, so the index stays and is re-derived from year position as today. `S.simMonth` / `S.month` (1–12, derived from year position) keep driving the timing curves — climate, academic calendar, economy and media gates, generational month gates, faith — whose values do not change in this build; re-keying them to year-position ranges is identical behaviour for churn. What goes: `S.monthName` (no reader); the English month in `Cycle_Packet` (`buildCyclePacket.js:102`, `getMonthName_Packet_`), desk base context (`buildDeskPackets.js:513-551` and its `--month` override), and the world-summary calendar line — each replaced with season + `Y<n>C<m>`; month prose inside engine content pools ("October spirit" `generateGenericCitizenMicroEvent.js:230`, "January" `generateCitizensEvents.js:1910`, "June wedding" `generationalEventsEngine.js`, "June gloom" `applyWeatherModel.js:122`, "October Dark" `buildEveningMedia.js:156`, election "November" `runCivicElectionsv1.js:23,63`) rewritten to season or cycle wording. `Simulation_Calendar` column B stays numeric (sheet contract, rhythm key). The six named sites are examples; **the rule is enumerable**: every English-month string literal in `phase*/ utilities/ lib/` outside tests — 43 hits in 22 files at 2026-09-30 (`grep -rnE "['\"\`][^'\"\`]*\b(January|…|December)\b" phase* utilities lib --include=*.js`, comments and `*.test.js` excluded) — is rewritten to season/cycle wording or classified a guard or parser in the build notes, one line each. The engine.222 month gates (`economicRippleEngine`, `mediaFeedbackEngine`) emit no month words (grep 0) and stay timing curves. Guards stay untouched: `validateEdition.js` month checks, `editionParser`, `canon-name-check`, forbidden-date examples in agent rules. **The label reaches output:** `Cycle_Packet`, desk base context and the world-summary calendar line print the holiday's `label` ("Christmas"), never the flag (`Holiday`), which today reaches the newsroom as `holiday=Holiday`.

**Readers (the sweep).** Every branch, list entry and content pool keyed only on a dropped flag is deleted (builder: pools are deleted, not left dormant); every `OpeningDay` branch is deleted (sports effects come from the sports feed, `applySportsSeason.js:3-20`). Checked for the one site where deletion could silence the feed: `filterNoiseEvents.js:120-127` keeps sports events by the feed's own phase (`championship`/`playoffs`/`post-season`, set from `S.sportsSeasonByTeam`, `applySportsSeason.js:97,378-388`); the `OpeningDay` line is the only holiday-driven keep and is dead once the flag stops, so an opening-week game passes the filter by the normal rules — no feed route needed; orphan aliases the source never emits (`LunarNewYear`, `BlackFriday`, `ValentinesDay`, `WinterSolstice`) are deleted; `applyCycleRecovery.js:70` `bigCelebrations` keeps `newyearseve` only. The inventory's reader table (`docs/research/2026-09-29-codex-holiday-calendar-inventory.md` §Engine consumers, plus the four readers in §Task 1 outcome and kimi's four in `utilities/`) is the checklist; each file is a line in the build notes.

**Build in three waves, each its own commit and proof.**
1. **Source** — the table, the First Friday cadence, Creation Day's one form, `S.monthName` and the packet/desk/summary month names, dead helpers. This is the only wave that changes behaviour (dropped holidays stop firing). Bench: the sandbox sits at C110 = position 6 (old `BlackHistoryMonth`, a First Friday under both cadences); two forward fires cover it — C111 = position 7 (`Valentine`, kept: flag + label emitted) and C112 = position 8 (`PresidentsDay`, dropped: `none`, no First Friday). Assert flag, label, `S.isFirstFriday`, and the `Cycle_Packet` / desk calendar lines (season + `Y<n>C<m>`, no month name); 0 new `Engine_Errors`. Resync from live first if a live fire has landed.
2. **Reader sweep** — every dropped-name hit is classified in the build notes as **flag-gated** (sits inside a guard keyed only on a name the new source never emits — dead after wave 1, deletion neutral) or **always-reachable** (the string is in a pool or venue list drawn regardless of flag — `buildCityEvents.js:300-379`, `buildEveningMedia.js:124-131`, `storyHook.js:434-439`, `runCivicRoleEngine.js:219-220`, the "Fourth of July Tavern" at `buildNightLife.js:183`, and any the sweep finds). Flag-gated deletions are neutral; the proof is structural — the reviewer checks each deleted line's guard against the new table — plus every touched file's existing suite green. There is no whole-engine Node harness to replay 52 positions (checked: none in `scripts/`), so none is claimed. Always-reachable deletions and the month-prose rewrites are the named **non-neutral** list: they change pool lengths and so rng outcomes, ruled by the builder (pools deleted, not dormant), and ship in a separate commit from the neutral deletions so each proof stays clean.
3. **Directive fixes outside the engine** (research-build's five, §Task 1 review): culture-desk "Fourth of July" example → an honored or world-born moment; "Summer Festival" example label in letters-, sports-, culture-desk `RULES.md` → an honored holiday; `write-supplemental/SKILL.md:58` Rosh Hashanah → a sim storyline; `buildInitiativePackets.js:103` "September 15" → a cycle; the month carriers drop with wave 1. Agent/skill files are coordinated with research-build before edit (`TERMINAL.md` §Authority).

**Faith (`HOLY_DAYS`, `ensureFaithLedger.js:304-380`) — to the builder, unchanged until ruled.** The table keys 13 traditions by month index to real-world observances. Easter and Christmas entries stay (ruled). Every other entry is the builder's call under *more sim storylines, less real-world influence*; the build does not touch the table until the list comes back (§6 morning list).

**Tax day** is engine.271's placement, on a holiday-free, non-First-Friday position; this table reserves nothing for it.

**Consequences, stated.** Holiday-driven boosts fire in 10 weeks a year instead of 34: transit `dayType='holiday'` (`updateTransitMetrics.js:123`), city dynamics, event counts, story seeds and cycle weight all go quiet in the 24 weeks that lose a flag. That is the ruling working — ordinary weeks are ordinary — and the world-born holidays add their weeks back as the builder names them.

**Not in this design.** Re-keying timing curves off the month index; the sports clock (independent, feed-driven); historical records (`docs/media/*` indexes and archives are history, never rewritten); tax day (engine.271).

## Changelog

- 2026-09-29 (engine-sheet) — Plan filed from builder direction; Task 1 dispatched to codex.
- 2026-09-29 (research-build) — Task 1 verified and ruled (§Task 1 outcome): 4 missed engine readers added, scope set to engine hardcoding, 3 builder calls raised.
- 2026-09-29 (kimi) — Adversarial review of the ruling (§Task 1 review — kimi): agree; all sampled claims verified, 4 small same-class additions in `utilities/`.
- 2026-09-29 (research-build) — builder calls resolved (Mother's/Father's Day + First Friday kept; faith list to builder in Task 2); contamination test applied to agents/skills/crons: 4 directive fixes + month-carrier note.
- 2026-09-30 (engine-sheet) — Task 2 design written: 10-flag table + reserved world-born slots, First Friday every 4th week from 2, Creation Day one form, English month names out of output, three-wave build (source → behaviour-neutral reader sweep → directive fixes); faith list and world-born names to the builder.
