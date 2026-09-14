---
title: Run-Cycle Packages the World to Its Readers Plan
created: 2026-09-13
updated: 2026-09-13
type: plan
tags: [engine, pipeline, citizen-loop, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md pipeline.69
  - output/engine_review_c107.md §Read this first
  - S456 measurements (this file §Baseline)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (pipeline.69; engine.214 is the engine-side sibling)"
  - "[[../.claude/skills/run-cycle/SKILL]] — the chain this plan wires"
  - "[[SIM_DOCTRINE]] §15 / §16 — a gate that can't fire is a trick; drift over static backfill"
  - "[[index]] — registered same commit"
---

# Run-Cycle Packages the World to Its Readers Plan

**Goal:** every artifact `/run-cycle` leaves on disk carries the whole engine's week for all 22 neighborhoods and 943 citizens to the crons that read it — the desk slices Monday 06:15, the citizen wakes three times a day, the Sunday civic chain — so that a resident of Laurel and a resident of Temescal each wake into their own street, not into "nothing much out of the ordinary."

**Architecture:** the engine fires once (Apps Script, the builder's hand); the chain reads sheets once and writes the package (`world_summary`, `desk_signal`, `beats/*.jsonl`, `neighborhood_texture`, `world_state.json`, `baseline_briefs`, snapshots); the crons read only the package, never the sheets. This plan wires the package to the engine's full output. It replaces nothing; it closes the gaps between what the engine writes and what the readers get. The engine-side sibling (ten hoods missing from 25 hood literals) is engine.214 + a literal sweep, filed here as Task 4 so the two halves are tracked in one place.

**Terminal:** engine/sheet (Tasks 1–3, 5, 6); engine/sheet on the bench for Task 4.

**Pointers:**
- Prior work: `scripts/buildNeighborhoodTexture.js` v1.1.0 (S456, `Story_Seed_Deck` in — hoods with signal 8→15, quiet citizens 360→85); `output/engine_review_c107.md`; `output/engine_anomalies_c107_followup.md`
- Related plan: [[2026-09-07-beat-slices-from-sheets-plan]] (pipeline.68 — the slice builders this package feeds)
- Research basis: research.19 T2 (texture as frozen per-cycle perception artifact), Mike-direct S456: "this is what sets the table for the lived experience"

**Acceptance criteria:**
1. At the next live fire (C108), `neighborhood_texture_c108.md` reads a non-quiet block for every hood with ≥20 citizen life events that cycle (C107: that is 16 of 22), and the quiet line only where the engine produced nothing for the hood.
2. A citizen named in a `Story_Seed_Deck` row (moved, climbing, hired) wakes with that event in their own prompt, not only in the shared hood block.
3. No engine file outside `canonNeighborhoodLoader.js` carries a hood-name literal list; `S.canonHoods.list` (22) is the only hood roster. Verified by the sweep in Task 4 returning zero files.
4. Monday 06:15 `cron-desk-run --stage=angle` builds all 14 C108 slices from the package with no `NO_PRIOR_CYCLE` where a prior beats dump exists.

---

## Baseline (C107, measured S456 — the reason each task exists)

| Hood | Citizens | Businesses | World events | Ripples | Citizen life events | Seeds | Texture |
|---|---|---|---|---|---|---|---|
| Laurel | 63 | 6 | 0 | 0 | **122** | 0 | quiet |
| Piedmont Ave | 54 | 7 | 1 | 0 | **106** | 0 | one venue line |
| Adams Point | 7 | 6 | 1 | 0 | 20 | 0 | quiet |
| Grand Lake | 3 | 6 | 0 | 0 | 12 | 0 | quiet |
| Dimond | 4 | 6 | 0 | 0 | 4 | 0 | quiet |
| Ivy Hill | 3 | 6 | 0 | 0 | 6 | 0 | quiet |
| San Antonio | 3 | 6 | 0 | 0 | 6 | 0 | quiet |
| Eastlake | 2 | 6 | 0 | 0 | 1 | 0 | quiet |
| Temescal (for scale) | 81 | 7 | 0 | 4 | 162 | 4 | seeds |

Three causes, not one:

1. **The texture reads the rare layers and skips the big one.** Its sources are world events (11 citywide at C107), evening venues (5 draws), city events (4), and since v1.1.0 the seed deck (46, built from 67 ripples). The engine also wrote **2,015 citizen life events** at C107 with a `Neighborhood` column — Laurel alone had 122 ("recognized the OARI van idling outside the corner store", "watched the ninth from a packed bar and walked home in a crowd that didn't want to disperse"). None of it reaches the hood block. Laurel and Piedmont Ave are quiet for this reason only.
2. **Ten hoods are outside the engine's hood literals.** 25 engine files list the canon twelve by name and none of the other ten (`applyCityDynamics`, `buildCityEvents`, `generateCitizensEvents`, `runCareerEngine`, `runNeighborhoodEngine`, `runHouseholdEngine`, `buildNightLife`, `recordWorldEventsv3`, `applyStorySeeds`, `textureTriggers`, … full list in Task 4). Generators do not place events, venues, or dynamics there. The canonical loader (`S.canonHoods.list`, ADR-0016) already exists and is the only roster that should be read.
3. **Six hoods have 2–7 citizens.** engine.174's short-hood feeder mints ~8 generic citizens per cycle across the five shortest hoods; at that rate Eastlake reaches 20 in ten cycles. Time helps; it does not fix causes 1 and 2. Whether to mint faster into the thin hoods is a sim ruling (builder), not a build.

---

## Tasks

### Task 1: Texture reads citizen life events per hood (v1.2.0)

- **Files:**
  - `scripts/buildNeighborhoodTexture.js` — modify (`assembleHoodSources`, the reads in `buildNeighborhoodTexture`)
- **Steps:**
  1. Read `LifeHistory_Log` rows for the cycle (sheet read, same pattern as `Story_Seed_Deck`; ~2,000 rows) and group `EventText` by `Neighborhood`.
  2. Keep only place-shaped lines: `EventTag` prefix in {`Neighborhood`, `PrevEvening`, `Sports|…gameNight`, `Daily|source:chaos`, `Community`, `Holiday`} — the tags whose text describes the street, not the citizen's interior (`Personal`, `Lifestyle|curiosity`, `Education` stay out). Drop lines that name a citizen (split on the ledger's name set, same as seeds) and lines carrying a metric.
  3. Per hood, feed at most 6 lines, chosen deterministically (`ctx`-free: sort by `EventTag` then text, take every k-th so one library line does not dominate). Prefix `SEEN:`; add one prompt rule: "SEEN lines are what individual residents already noticed this week — write the shared street they describe, never a person."
  4. Bump `SCRIPT_VERSION` to `1.2.0`; footer lists `LifeHistory_Log`.
- **Verify:** `TEXTURE_DEBUG=1 node scripts/buildNeighborhoodTexture.js 107 --dry-run 2>&1 | grep -c "(quiet)"` → ≤ 3 (Eastlake, and any hood with 0 rows); Laurel's block mentions the corner store / the bar crowd / the holiday, no names, no numbers.
- **Status:** [ ] not started

### Task 2: The wake tells a citizen their own seed event

- **Files:**
  - `scripts/citizen-wake.js` — modify (`buildVoicePrompts` inputs, the perception assembly at ~L281–L322)
  - `lib/wakePerception.js` — modify (new `loadOwnSeedLine(popId, cycle)`)
- **Steps:**
  1. `loadOwnSeedLine`: read `output/beats/Story_Seed_Deck.jsonl` (or the sheet when the dump's `meta.json` cycle ≠ current); find rows whose `Citizens` contains the POPID; render the seed's `Why` in second person via the same translator as texture (`seedSourceLines` exported from `buildNeighborhoodTexture.js`, then "someone new moved onto the block" → "you moved here from Chinatown"; "keeps coming up in conversation" → "people around the city have been saying your name"). One line max.
  2. Inject as `Something that happened to you this week: …` between the life tail and family, ahead of the hood block. Fail open ('') when absent.
  3. Add the line to `contextText` and to the `own` name-provenance bucket (it is the citizen's own fact).
- **Verify:** `node scripts/citizen-wake.js --wake=morning --dry-run --pop POP-00011` (Carmen Delaine at C107) → prompt contains "you moved here from Chinatown"; a citizen with no seed row → no line.
- **Status:** [ ] not started

### Task 3: Seed builder covers life events (engine side, optional if Task 1 lands)

- **Files:**
  - `phase07-evening-media/buildContractSeeds.js` — read first
- **Steps:**
  1. Read how `buildContractSeeds_` selects "texture" seeds from citizen events (log: `46 seeds (35 major / 11 texture) from 67 ripples + 1796 citizen events`). Measure per-hood coverage of the 11 texture seeds at C107 (4 hoods).
  2. If the per-hood floor is easy (one texture seed per hood with ≥N events), file it as its own engine.* row; otherwise close this task as "covered by Task 1" and record why.
- **Verify:** a written decision in this file's Changelog.
- **Status:** [ ] not started

### Task 4: One hood roster — sweep the 25 literals (engine.214 + siblings)

- **Files (each: modify, replace the literal with `S.canonHoods` / `getDistrictHoods_` / the sheet's `Adjacent` column):**
  - `phase02-world-state/applyCityDynamics.js` (engine.214 — the cluster table; first, alone on the bench)
  - `phase04-events/buildCityEvents.js`, `phase05-citizens/generateCitizensEvents.js`, `phase05-citizens/runAsUniversePipeline.js`, `phase05-citizens/runCareerEngine.js`, `phase05-citizens/runCivicRoleEngine.js`, `phase05-citizens/runEducationEngine.js`, `phase05-citizens/runHouseholdEngine.js`, `phase05-citizens/runNeighborhoodEngine.js`, `phase07-evening-media/buildNightLife.js`, `phase10-persistence/recordWorldEventsv3.js` (12/12 literals)
  - `phase07-evening-media/applyStorySeeds.js`, `cityEveningSystems.js`, `parseMediaRoomMarkdown.js`, `textureTriggers.js`, `mediaFeedbackEngine.js`, `storyHook.js`, `buildEveningFamous.js`; `phase02-world-state/calendarStorySeeds.js`, `applyWeatherModel.js`, `getSimHoliday.js`; `phase03-population/generateCrisisSpikes.js`; `phase05-citizens/generateGenericCitizens.js`, `runYouthEngine.js`; `phase06-analysis/economicRippleEngine.js` (partial literals)
- **Steps:**
  1. For each file, `engine-wiring` card first; classify the literal: roster (replace with `S.canonHoods.list`), profile table (keep the table, add the ten hoods with the sheet's `District`/`Adjacent` as the seed, or derive), or dead comment.
  2. One file per bench fire; read the 22-hood outputs back (Neighborhood_Map, WorldEvents by hood, venues by hood).
  3. Re-run the sweep: `node -e '<the S456 sweep>'` → zero files.
- **Verify:** C108 bench: world events, venues, and city events land in at least one of the ten hoods each cycle; Sentiment moves per hood, not in lockstep with the city scalar.
- **Status:** [ ] not started (engine.214 first)

### Task 5: Monday readback — the C108 slices

- **Files:** `output/slices/c108/*.md`, `output/cron-compare/*_slice_c108.json` — read
- **Steps:**
  1. After the 06:15 angle wake, count slices (14 expected), grep `NO_PRIOR_CYCLE` (should be 0 where `beats/prev/` has the C107 dump), read one beat slice per builder for a hood outside the canon twelve.
  2. File any builder that reads only the canon twelve as a row here.
- **Verify:** a table in the Changelog: builder → hoods covered.
- **Status:** [ ] not started

### Task 6: Thin-hood population — builder ruling

- **Question for the builder (sim, not code):** six hoods carry 2–7 citizens. Options: (a) leave engine.174's feeder at ~8/cycle and let time fill them; (b) raise the short-hood mint for N cycles; (c) mint authored anchors (a corner store owner, a school secretary) into each so the hood has a face. (c) is the "top-tier seats are authored" rule applied to places.
- **Status:** [ ] waiting on ruling

---

## Watch List (found while measuring, not in scope)

- Holiday library mismatch: Laurel C107 carries "Hanukkah lights twinkling in windows" on MLK Day (`Holiday|source:holiday|auth:auto`). The holiday texture library is keyed loosely; one line, wrong month.
- `buildEveningFamous` / venues: every hood shows exactly 6 businesses on the ledger except Downtown 19, West Oakland 14, Baylight 12 — the 6 is a seed floor, so venue draws favour the three.

## Changelog

- 2026-09-13 S456 — created after the C107 chain and the texture v1.1.0 cut; baseline measured; causes split three ways.
