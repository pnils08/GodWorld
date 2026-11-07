---
title: Coverage Reaction Seeds Plan
created: 2026-11-07
updated: 2026-11-07
type: plan
tags: [engine, active]
sources:
  - output/production_log_run_cycle_c114_gaps.md G-ES2 (engine.330 sandbox observation, 2026-11-05)
  - phase02-world-state/applyEditionCoverageEffects.js:263-273 (strong-rating triggers)
  - phase07-evening-media/applyStorySeeds.js:1299-1320, :1408-1413 (the S202 seed; deck-dead note)
  - phase07-evening-media/buildContractSeeds.js:433-441, :535, :561-587 (cluster key, domain, row)
  - scripts/buildWorldSummary.js:797-809, :1408-1417 (desk-signal ripple lanes)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.332"
---

# Coverage Reaction Seeds Plan

**Builder's words (2026-11-05, on G-ES2):** "great catch excited to fix this"

**Builder's rulings (2026-11-07, engine-sheet asked three questions; his picks verbatim):**
- "When the city reacts strongly to last week's coverage of a beat, which desk should get the reaction seed?" → "The beat's own desk (Recommended)"
- "Should every strong reaction (rating ±3 or more) be a lead seed, or only the biggest?" → "Every ±3+ is a lead (Recommended)"
- "Should the seed name the reporter whose coverage the city reacted to?" → "Yes, as a fact (Recommended)"

Correction given to the builder the same session: the questions said a rating is how the city took a story; the code says it is the coverage's own tone (`rateEditionCoverage.js:360-392`, positive / negative word ratio → −5..+5), and the engine moves city mood in that direction. The seed text says so. The rulings do not hinge on it.

**Goal:** every beat whose coverage rated ±3 or more lands one lead row on Story_Seed_Deck and one entry in the desk signal, on that beat's desk, naming the beat, the tone, the rating and the reporter.

**Rows:** engine.332 · **Owner:** engine-sheet

## Current state (traced 2026-11-07)

- `applyEditionCoverageEffects_` (Phase 2) reads unprocessed Edition_Coverage_Ratings rows for this Cycle or the one before and pushes a trigger for each |rating| ≥ 3 onto `S.editionCoverageTriggers` (`:263-273`). Its only reader is `applyStorySeeds_` (`:1307`), which builds a "Citywide reaction" seed into `S.storySeeds`.
- `S.storySeeds` has not reached Story_Seed_Deck since saveV3Seeds v4.0 (S296). The deck is `S.contractSeeds`, built by `buildContractSeeds_` from ripples (`applyStorySeeds.js:1408-1413` says so; chaos-cars hit the same wall and moved to a ripple, `chaosCarsEngine.js:838-850`).
- The deck does carry one coverage row a Cycle: the two `edition-coverage` ripples `applyCityDynamics_` records (`:1757-1771` city metric shifts, `:1813-1823` sentiment) merge into one COMMUNITY row of numbers. 13 rows C101–C114. It names no beat, tone or reporter.
- Live Edition_Coverage_Ratings: 55 rows at |rating| ≥ 3 (C90–C113). "Citywide reaction" rows on the deck, ever: 0. The engine.330 bench plant (ECONOMIC +3, ENVIRONMENT +5) also wrote 0.
- The desk signal lanes ripples by CauseType (`buildWorldSummary.js:1408-1417`); an unmapped type goes to business.
- Rated domains C100+: CIVIC, CULTURE, ECONOMIC, SPORTS, HEALTH, ENVIRONMENT, INFRASTRUCTURE, EDUCATION, SAFETY, COMMUNITY, GENERAL — the reporters' beats (`scripts/persona-map.json`). The rater may also write any Domain_Tracker column (`rateEditionCoverage.js:114-119`); CRIME comes from an `accountability` section header.

## Design (engineering, from the code; the three sim calls are the rulings above)

1. **The cause is recorded where it is computed.** In `applyEditionCoverageEffects_`, beside the trigger push, one `recordRipple_` per |rating| ≥ 3 row (guarded `typeof recordRipple_ === 'function'`, as `applyCityDynamics_` does): causeType `coverage-reaction`, causeId `<DOMAIN>:C<rating cycle>`, effectType `<DOMAIN> coverage reaction`, targetScope `citywide`, magnitude = the rating, duration 1, sourceEngine `applyEditionCoverageEffects`. causeDetail (≤300): `Citywide reaction: last week's Tribune <DOMAIN> coverage, <tone> (rating ±N, K article(s), <Reporter>), pulled the city's mood up|down.` — "this week's" when the rating's Cycle is the fire's own; the reporter clause drops when the cell is blank. Up/down is the rating's sign: the domain's mood term is `rating × 0.015 × sentimentWeight` and every weight is positive (`:224`). The new type keeps it out of the merged `edition-coverage` row.
2. **One row per beat.** `buildContractSeeds_` clusters by causeType + neighborhood (`:438`), so every beat this Cycle would merge into one citywide row. For causeType `coverage-reaction` the key also carries the causeId.
3. **The beat's desk (ruling 1).** The deck's Domain stays in its six-value vocabulary (`saveV3Seeds.js:39`); the beat stays in What and Why. `contractSeedCoverageDomain_(beat)`: CIVIC / HEALTH / INFRASTRUCTURE → CIVIC, SAFETY → SAFETY, ECONOMIC → ECONOMIC, CULTURE / COMMUNITY / EDUCATION / ENVIRONMENT → COMMUNITY, SPORTS → SPORTS, GENERAL → GENERAL — the newsroom's beat → lane table (`bayTribuneRoster.js:171-183` LANE_BY_DOMAIN) read through the deck's existing desk table (`CONTRACT_SEED_DESK`); CRIME → SAFETY and HOUSING / TRANSIT → INFRASTRUCTURE → CIVIC per the engine's coverage normalizer (`priorityEngine.js:98-102`); BUSINESS → ECONOMIC per `rosterLookup.js:833`; any other → GENERAL (desk civic, the deck's existing default, `:560`). Desk = `CONTRACT_SEED_DESK[domain]`.
4. **Lead at ±3 (ruling 2).** Magnitude = the rating, so |magnitude| ≥ `CONTRACT_SEED_MAJOR_MAG` (3) makes the row `major` with no new rule. Nothing sums ripple magnitudes into a dial: the readers are the deck builder, the desk signal, the world summary's What Moved list, and `routePatternSeeds` (drops causeTypes outside its rank table, `:69-97`).
5. **Who is on the row.** The `coverage-reaction` reader hint is the one `edition-coverage` uses (`:145`, citizens whose event this Cycle mentions the paper), then the existing citywide draw.
6. **The desk signal follows the same table.** `emitDeskSignal`: a `coverage-reaction` row's lane = `CONTRACT_SEED_DESK[contractSeedCoverageDomain_(<beat from CauseId>)]`, required from `buildContractSeeds.js` (Node-loadable, as its test does) — one table for both readers. `RIPPLE_LANE_MAP` is unchanged.
7. **The dead block stays and says so.** The S202 block in `applyStorySeeds_` still feeds the UI renderer and Riley_Digest's StorySeedCount; its comment is corrected to point at the Phase-2 ripple. No code change there.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Builder rulings recorded verbatim (above) | builder / es | done 2026-11-07 |
| 2 | Design 1 in `applyEditionCoverageEffects.js`; Design 2, 3, 5 in `buildContractSeeds.js` (+ export); Design 6 in `buildWorldSummary.js`; Design 7 comment in `applyStorySeeds.js`. Tests: `buildContractSeeds.test.js` (one row per beat, desk per beat, major at ±3, ±2 none upstream, unknown beat → civic, the table agrees with LANE_BY_DOMAIN for every beat but GENERAL), a new `applyEditionCoverageEffects.test.js` (ripple per strong row, none at ±2, prose, up/down, blank reporter), `buildWorldSummary.test.js` (lane per beat). STUB_MAP regenerated in the same commit | es | not started |
| 3 | Codex review of the diff (exact deploy candidate); one re-review of the fold at most | codex | not started |
| 4 | Sandbox proof on the exact candidate, live-synced bench: bench-only Edition_Coverage_Ratings rows at Cycle N−1 (Reporter carries `E332-BENCH`): HEALTH −4, ENVIRONMENT +5, SPORTS +3, CIVIC +2, plus a same-beat pair (ENVIRONMENT +3 at Cycle N beside the +5 at N−1). Fire 1 read: Ripple_Ledger, Story_Seed_Deck, Engine_Errors; then `buildWorldSummary.js` against the bench cycle for the desk signal lanes. Final sync from live | es | not started |
| 5 | PROD push with smoke note; first live fire with a ±3 rating in its window read back | es | not started |

## Acceptance

1. Each planted beat at |rating| ≥ 3 → exactly one Story_Seed_Deck row: Class `major`, Desk = its beat's desk (HEALTH civic, ENVIRONMENT culture, SPORTS sports), What `<BEAT> coverage reaction ±N`, Why the prose naming tone, rating, article count and reporter, Magnitude = the rating — bench fire 1.
2. CIVIC +2 → no ripple, no row — bench fire 1.
3. A same-beat pair across two rating Cycles → two rows, not one merged — bench fire 1.
4. One `coverage-reaction` Ripple_Ledger row per strong rating; the `edition-coverage` aggregate row still lands as before — bench fire 1.
5. Desk signal: each `coverage-reaction` entry in its beat's lane — `buildWorldSummary.js` on the bench cycle.
6. 0 Engine_Errors from Phase 2 / Phase 7 / Phase 10 seeds — bench fire 1.
7. First live fire after PROD with a ±3 rating in its window: Acceptance 1 and 4 on live — live read.

## Pre-mortem

- A follow-up that rates strong again brings another reaction seed the next week. The builder accepted this with ruling 1 (the option said so).
- Deck growth: 2–3 rows a Cycle at past rates (55 strong ratings over 24 Cycles).
- `draftContentRows.js:289` turns any major COMMUNITY seed into a moving-trucks line; its `hood=Citywide; displacement>=4` condition already meets the merged coverage row today. Observation for the gap log, not this row.
- The bench resync wipes the evidence (`project_bench-resync-destroys-dial-evidence`): reads are taken before the final sync.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|

## Open questions

- none

## Changelog

- 2026-11-07 (engine-sheet) — Created from G-ES2; trace, three builder rulings, design.
