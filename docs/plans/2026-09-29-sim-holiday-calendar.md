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
- **Scope is what the engine hardcodes** (clarified 2026-09-29). Loose mentions of months or holidays in desk/agent prose are not the problem; the target is engine code that keys behaviour off a hardcoded holiday or month.

**Canon guard (engine-sheet):** a world-born holiday is named and told in-world only. The builder, the assistant, crons and the build are never named or implied in a holiday's name, text or story — they are marked by what the world gained that week (e.g. "the week the court opened"), per the never-reveal-the-builder rule and canon-leak-guard.

## Tasks

### Task 1 — inventory (codex, read-only)

- **Files:** every file in `phase*/`, `utilities/`, `lib/`, `scripts/`, `.claude/agents/`, `.claude/skills/`, `docs/media/` that names a holiday, a month, or a real-world observance.
- **Steps:** list the calendar source (`getSimHoliday.js`, `advanceSimulationCalendar.js`, `Simulation_Calendar` tab) and every hardcoded holiday or month read elsewhere, with file:line, what reads it, and what it changes (engine effects, story seeds, desk prompts). Classify each holiday: keep (basic shared) · drop (real-world political/heritage) · sports-driven (remove from engine) · world-born (keep/extend). Flag every month-name dependency.
- **Output:** `docs/for-claude-review/2026-09-29-codex-holiday-calendar-inventory.md`.
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

**Builder calls (sim):**
- (a) Mother's Day, Father's Day, St Patrick's, Earth Day and Summer Festival are not political or heritage days, but they are not on the keep list either. The inventory drops them. Confirm.
- (b) First Friday is a monthly cadence built on the 12-month structure. Keep it as a world rhythm on a cycle cadence, or drop it?
- (c) Faith holy days are month-timed. Drop the automatic observances, or keep faith life on cycle timing?

### Task 2 — design (engine-sheet, after the inventory)

- The new cycle-of-year table, world-born holidays with in-world names (builder confirms names and weeks), tax-day week, and the removal list. Advisor + outside review before build.

## Changelog

- 2026-09-29 (engine-sheet) — Plan filed from builder direction; Task 1 dispatched to codex.
- 2026-09-29 (research-build) — Task 1 verified and ruled (§Task 1 outcome): 4 missed engine readers added, scope set to engine hardcoding, 3 builder calls raised.
