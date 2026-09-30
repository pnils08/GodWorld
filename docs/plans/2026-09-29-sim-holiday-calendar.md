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

**Canon guard (engine-sheet):** a world-born holiday is named and told in-world only. The builder, the assistant, crons and the build are never named or implied in a holiday's name, text or story — they are marked by what the world gained that week (e.g. "the week the court opened"), per the never-reveal-the-builder rule and canon-leak-guard.

## Tasks

### Task 1 — inventory (codex, read-only)

- **Files:** every file in `phase*/`, `utilities/`, `lib/`, `scripts/`, `.claude/agents/`, `.claude/skills/`, `docs/media/` that names a holiday, a month, or a real-world observance.
- **Steps:** list the calendar source (`getSimHoliday.js`, `advanceSimulationCalendar.js`, `Simulation_Calendar` tab) and every hardcoded holiday or month read elsewhere, with file:line, what reads it, and what it changes (engine effects, story seeds, desk prompts). Classify each holiday: keep (basic shared) · drop (real-world political/heritage) · sports-driven (remove from engine) · world-born (keep/extend). Flag every month-name dependency.
- **Output:** `docs/for-claude-review/2026-09-29-codex-holiday-calendar-inventory.md`.
- **Status:** [ ] dispatched 2026-09-29.

### Task 2 — design (engine-sheet, after the inventory)

- The new cycle-of-year table, world-born holidays with in-world names (builder confirms names and weeks), tax-day week, and the removal list. Advisor + outside review before build.

## Changelog

- 2026-09-29 (engine-sheet) — Plan filed from builder direction; Task 1 dispatched to codex.
