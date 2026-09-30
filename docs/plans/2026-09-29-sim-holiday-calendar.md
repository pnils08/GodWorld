---
title: Sim holiday calendar — seasons and cycles, world-born holidays
created: 2026-09-29
updated: 2026-09-29
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

## Changelog

- 2026-09-29 (engine-sheet) — Plan filed from builder direction; Task 1 dispatched to codex.
- 2026-09-29 (research-build) — Task 1 verified and ruled (§Task 1 outcome): 4 missed engine readers added, scope set to engine hardcoding, 3 builder calls raised.
- 2026-09-29 (kimi) — Adversarial review of the ruling (§Task 1 review — kimi): agree; all sampled claims verified, 4 small same-class additions in `utilities/`.
- 2026-09-29 (research-build) — builder calls resolved (Mother's/Father's Day + First Friday kept; faith list to builder in Task 2); contamination test applied to agents/skills/crons: 4 directive fixes + month-carrier note.
