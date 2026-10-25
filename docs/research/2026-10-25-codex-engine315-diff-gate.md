---
title: engine.314 and engine.315 candidate diff gate
created: 2026-10-25
updated: 2026-10-25
type: reference
tags: [engine, media, reference]
sources:
  - docs/for-claude-review/2026-10-25-engine315-diff-gate-TASK.md
  - commit 3109503e
  - output/engine-sheet/2026-10-25-e315-bench-G3.log
pointers:
  - "[[../plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards]]"
  - "[[2026-10-25-codex-engine313-diff-gate2]]"
---

# engine.314 / engine.315 — candidate diff gate

**Final gate: SHIP for commit `3109503e` as one candidate stage over PROD stage 24, subject to engine-sheet's separate PROD landing gate.** Both source fixes, the specified receipt predicates, focused tests, and saved G3 sandbox leg pass. This review did not independently read a Sheet or prove a PROD deployment or live Cycle. The reviewed implementation and test files were clean; I changed only this requested review file.

## engine.315 — SHIP

The existing-row path now chooses an authored FameCategory before computing the bonus: if it is neither blank nor `unknown`, `fam.cat` is that category and `fam.dom` is the row's CulturalDomain, with a classifier fallback only for an empty domain (`phase07-evening-media/culturalLedger.js:297-317`). Its UPDATE queues category/domain cells only when the old category was blank or `unknown` and classification finds a category (`:523-528`). On a POPID match that fill classifies the target row's own RoleType; on an exact-name match it uses the caller's role word (`:313-315`). This preserves the row identity and category in the dynasty/artist bridge case and the exact-name category case (`scripts/sportsWeekCity.test.js:535-559`, `:561-597`).

I found no caller deliberately using registration to reclassify an authored category. The evening caller passes the selected sighting's role, which can be a ledger bucket's RoleType, an A's player/legend word, or a bridge-copied category (`phase07-evening-media/buildEveningFamous.js:69-90`, `:216-248`, `:552-556`). The other call site, advancement intake, registers only when neither the POPID nor name has a linked cultural row; linked rows take the brighten/linked branch (`phase05-citizens/processAdvancementIntake.js:1247-1277`). This is a source-based caller audit, not a claim about external/manual Sheet edits.

The bonus change **does reach beyond FameScore**. `fam` controls the existing First Friday, sports, culinary, civic, and activity bonuses (`culturalLedger.js:345-420`); the resulting `newFame` is queued for FameScore and passed immediately to `updateTrendTrajectory_` and `updateCityTier_` (`:517-565`). Those helpers can write TrendTrajectory and CityTier, respectively (`phase07-evening-media/updateTrendTrajectory.js:59-87`; `phase03-population/updateCityTier.js:39-76`). The update summary also carries the category, domain, score, and bonus (`culturalLedger.js:583-596`), and later Cycles' cultural fame-bar selection reads the committed FameScore (`:111-136`). The new legend test proves the **40→51** Sports bonus (+5 base, +6 championship), but does not assert the resulting trend/tier values (`scripts/sportsWeekCity.test.js:607-611`). That is a downstream test-coverage limit, not evidence of a wrong helper call.

## engine.314 — SHIP

The pending-create repeat now updates LastSeenHoliday/CalendarContext through their header indices, if present, instead of writing array positions 18/19 (`phase07-evening-media/culturalLedger.js:470-493`). On the live 20-column header those positions are HolidayPriority/SportsSeason and the two old v2.2 names are absent (`schemas/SCHEMA_HEADERS.md:446-472`), so the initial CREATE's header-resolved Holiday/HolidayPriority/SportsSeason cells stand (`culturalLedger.js:629-646`). The other repeat writes are positions 9/10/11, matching the unchanged live J/K/L LastSeenCycle/MediaCount/FameScore columns (`:482-485`; `schemas/SCHEMA_HEADERS.md:461-465`). No other positional repeat write crosses the live calendar columns. Synthetic tests cover the live header and an older v2.2 header (`scripts/sportsWeekCity.test.js:622-645`). A natural G3 leg need not repeat a newly created name, so these tests are the direct engine.314 proof.

## Receipt — SHIP for the specified guards

The receipt compares each existing row's authored baseline category and nonblank domain with the current row before the sighting-window filter; a rewrite HOLDs (`output/engine-sheet/2026-10-22-e297-check.js:89-93`). For new rows it HOLDs when nonempty HolidayPriority equals Holiday or SportsSeason contains the joined calendar separator `, ` (`:72-80`). The fixtures exercise an authored rewrite, an allowed unknown→artist fill, the calendar-corruption signature, and a clean new row (`output/engine-sheet/2026-10-25-e313-receipt.test.js:81-99`). **20/20** fixture assertions passed.

This is a signature guard, not a complete proof that every calendar cell is valid. For example, a lone `FirstFriday` written into SportsSeason with no holiday and an off-season sports value lacks both tested signatures (`culturalLedger.js:422-430`; `2026-10-22-e297-check.js:75-79`). The source fix and same-Cycle repeat tests close that case for this candidate. The task reports that applying the new predicate to G2 held exactly Benji Dillon and Mike Paulson; I did not rerun a Sheet-backed G2 comparison, so I treat that before-state claim as supplied context. G3's saved receipts provide the candidate readback check.

## Tests — SHIP

`node scripts/sportsWeekCity.test.js` passed **94/94**. Running this current suite with only the registrar loaded from stage 24 (`3b2de7c5`) gave **86 passed, 8 failed**: the two strengthened engine.313 assertions, five engine.315 assertions, and the live-header engine.314 assertion. The candidate checks cover Celebrity/musician, legend/athlete, sports-figure, unknown/blank fills, POPID own-RoleType fill, and both calendar header shapes (`scripts/sportsWeekCity.test.js:535-559`, `:600-645`). `node output/engine-sheet/2026-10-25-e313-receipt.test.js` passed **20/20**. `node --check` passed on the changed registrar and Node scripts; `git diff --check 3109503e^ 3109503e` passed for the reviewed files. These are local, synthetic checks.

## Bench G3 — SHIP as saved sandbox evidence

The G3 manifest matches the `3109503e` registrar hash and differs from the stage-24 G2 manifest at that file alone (`output/engine-sheet/stage24-e315-G3.sha256:90`; `output/engine-sheet/stage23-e313-G2.sha256:90`; `output/engine-sheet/2026-10-25-e315-bench-G3.log:1-8`). The log records four fire PASS results and four engine.297 receipt PASS results, followed by a pull-back restoring stage-24 bench code (`2026-10-25-e315-bench-G3.log:42-130`). The C113–C116 G3 receipts each have zero HOLDs; the final window has 53→54 rows, one Martin Richards creation, 10 existing-row sightings, and a C116 Dante Reyes binding to existing `CUL-CEF9BF70` / `Muralist Dante Reyes`, MediaCount **8→9** (`output/engine-sheet/2026-10-22-e297-check-G3-c113.json`; `...-G3-c114.json`; `...-G3-c115.json`; `...-G3-c116.json:120-159`; `2026-10-25-e315-bench-G3.log:108-130`). G3's generated Martin Richards CUL-ID differs from G2's; the invariant checked here is one creation and no duplicate citizen fame row, not byte-identical generated IDs. The saved bench evidence does not prove PROD or live Sheet behavior.
