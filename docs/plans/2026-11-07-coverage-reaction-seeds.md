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

1. **The cause is recorded where it is computed.** In `applyEditionCoverageEffects_`, beside the trigger push, one `recordRipple_` per |rating| ≥ 3 row (guarded `typeof recordRipple_ === 'function'`, as `applyCityDynamics_` does): causeType `coverage-reaction`, causeId `<DOMAIN>:C<rating cycle>:R<sheet row>` (one per rating row, codex F3), effectType `<DOMAIN> coverage reaction`, targetScope `citywide`, magnitude = the rating, duration 1, sourceEngine `applyEditionCoverageEffects`. causeDetail (≤300): `Citywide reaction: last week's Tribune <DOMAIN> coverage rated ±N (<tone>, K article(s), <Reporter>).` — "this week's" when the rating's Cycle is the fire's own; a blank tone, count or reporter drops out. No mood claim (codex F2): one beat's share can vanish under the ±0.20 / ±0.25 clamps, and the rater can leave a +3 labelled negative (`rateEditionCoverage.js:444-450`); the merged `edition-coverage` row carries what was applied. The new type keeps it out of the merged `edition-coverage` row.
2. **One row per beat.** `buildContractSeeds_` clusters by causeType + neighborhood (`:438`), so every beat this Cycle would merge into one citywide row. For causeType `coverage-reaction` the key also carries the causeId, so two rows for one beat never merge and cancel.
3. **The beat's desk (ruling 1).** The deck's Domain stays in its six-value vocabulary (`saveV3Seeds.js:39`); the beat stays in What and Why. `contractSeedCoverageDomain_(beat)`: CIVIC / HEALTH / INFRASTRUCTURE → CIVIC, SAFETY → SAFETY, ECONOMIC → ECONOMIC, CULTURE / COMMUNITY / EDUCATION / ENVIRONMENT → COMMUNITY, SPORTS → SPORTS, GENERAL → GENERAL — the newsroom's beat → lane table (`bayTribuneRoster.js:171-183` LANE_BY_DOMAIN) read through the deck's existing desk table (`CONTRACT_SEED_DESK`); CRIME → SAFETY and HOUSING / TRANSIT → INFRASTRUCTURE → CIVIC per the engine's coverage normalizer (`priorityEngine.js:98-102`); BUSINESS → ECONOMIC per `rosterLookup.js:833`; any other → GENERAL (desk civic, the deck's existing default, `:560`). Desk = `CONTRACT_SEED_DESK[domain]`.
4. **Lead at ±3 (ruling 2).** Magnitude = the rating, so |magnitude| ≥ `CONTRACT_SEED_MAJOR_MAG` (3) makes the row `major` with no new rule. Nothing sums ripple magnitudes into a dial: the readers are the deck builder, the desk signal, the world summary's What Moved list, and `routePatternSeeds` (drops causeTypes outside its rank table, `:69-97`). **But the deck itself carries** (codex F1): Phase 9 compacts every contract seed into next Cycle's seed gates (`finalizeCycleState.js` `compactContractSeeds_`, major → weight 3, unsigned) and `applyCityDynamics_` lifts every hood on the citywide weight (`:1153-1167`). The S202 seed already carries the same rating through the engine list (`compactStorySeeds_`, priority 5–7). So the seed object carries its `causeType` (not a deck column) and `compactContractSeeds_` skips `coverage-reaction`: the rating counts once, next Cycle's dynamics are unchanged from today.
5. **Who is on the row.** The `coverage-reaction` reader hint is the one `edition-coverage` uses (`:145`, citizens whose event this Cycle mentions the paper), then the existing citywide draw.
6. **The desk signal follows the same table.** `emitDeskSignal`: a `coverage-reaction` row's lane = `CONTRACT_SEED_DESK[contractSeedCoverageDomain_(<beat from CauseId>)]`, required from `buildContractSeeds.js` (Node-loadable, as its test does) — one table for both readers. `RIPPLE_LANE_MAP` is unchanged.
7. **The dead block stays and says so.** The S202 block in `applyStorySeeds_` still feeds the UI renderer, Riley_Digest's StorySeedCount and next Cycle's seed gates (Design 4); its comment says so, points at the Phase-2 ripple, and warns not to drop it without moving that carry. No code change there.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Builder rulings recorded verbatim (above) | builder / es | done 2026-11-07 |
| 2 | Design 1 in `applyEditionCoverageEffects.js`; Design 2, 3, 5 in `buildContractSeeds.js` (+ export); Design 6 in `buildWorldSummary.js`; Design 7 comment in `applyStorySeeds.js`. Tests: `buildContractSeeds.test.js` (one row per beat, desk per beat, major at ±3, ±2 none upstream, unknown beat → civic, the table agrees with LANE_BY_DOMAIN for every beat but GENERAL), a new `applyEditionCoverageEffects.test.js` (ripple per strong row, none at ±2, prose, up/down, blank reporter), `buildWorldSummary.test.js` (lane per beat). STUB_MAP regenerated in the same commit | es | done `2048ad406`; review fold (F1 carry skip in `finalizeCycleState.js`, F2 prose, F3 per-row causeId + tests in `activityObservationsCarry.test.js`, `buildWorldSummary.test.js` through `emitDeskSignal`) in the fold commit |
| 3 | Codex review of the diff (exact deploy candidate); one re-review of the fold at most | codex | done 2026-11-07: review HOLD → F1-F3 folded `c47769766`; re-review SHIP; round cap reached |
| 4 | Sandbox proof on the exact candidate (four files after the fold: + `phase09-digest/finalizeCycleState.js`), live-synced bench: bench-only Edition_Coverage_Ratings rows at Cycle N−1 (Reporter carries `E332-BENCH`): HEALTH −4, ENVIRONMENT +5, SPORTS +3, CIVIC +2, plus a same-beat pair (ENVIRONMENT +3 at Cycle N beside the +5 at N−1). Fire 1 read: Ripple_Ledger, Story_Seed_Deck, Engine_Errors, the desk signal (`emitDeskSignal` on the bench rows, nothing written to `output/`), the contract carry (Carry_Forward_Store `PREV_CONTRACT_SEEDS_JSON`); fire 2 with the seeder only. Final sync from live | es | done 2026-11-07: run 1 on the pre-fold `2048ad406` (@188, C115 260 s + C116 219 s) and run 2 on the fold `c47769766` (@189, C115 243 s + C116 173 s), every fire PASS, 0 Engine_Errors; Acceptance 1-7 read on run 2 (`output/engine-sheet/2026-11-07-e332-bench-2.log`, `…-e332-reads.jsonl` labels `e332-2-*`) |
| 5 | PROD push with smoke note; first live fire with a ±3 rating in its window read back | es | PROD @176 = stage 40 2026-11-07 ~15:36 CST (`.DONE` 15:57) (DEPLOY_HISTORY §PROD stage 40); live read open — the Saturday run (16:00 2026-11-07) rated C114 INFRASTRUCTURE −3 (Trevor Shimizu) and COMMUNITY +3 (Tamsin Pruitt), so C115 Sun 2026-11-08 is the read: two lead rows, civic and culture desks |

## Acceptance

1. Each planted beat at |rating| ≥ 3 → exactly one Story_Seed_Deck row: Class `major`, Desk = its beat's desk (HEALTH civic, ENVIRONMENT culture, SPORTS sports), What `<BEAT> coverage reaction ±N`, Why the prose naming rating, tone, article count and reporter, Magnitude = the rating — bench fire 1.
2. CIVIC +2 → no ripple, no row — bench fire 1.
3. A same-beat pair across two rating Cycles → two rows, not one merged; two rows for one beat and Cycle → two leads (unit test 11l, codex F3) — bench fire 1.
4. One `coverage-reaction` Ripple_Ledger row per strong rating; the `edition-coverage` aggregate row still lands as before — bench fire 1.
5. Desk signal: each `coverage-reaction` entry in its beat's lane — `buildWorldSummary.js` on the bench cycle.
6. 0 Engine_Errors from Phase 2 / Phase 7 / Phase 10 seeds — bench fire 1.
7. The contract carry saved at fire 1 holds every deck row but the coverage reactions; fire 2 records no causeId from fire 1 (processed rows stay quiet) — bench fires 1-2.
8. First live fire after PROD with a ±3 rating in its window: Acceptance 1 and 4 on live — live read.

## Pre-mortem

- A follow-up that rates strong again brings another reaction seed the next week. The builder accepted this with ruling 1 (the option said so).
- Deck growth: 2–3 rows a Cycle at past rates (55 strong ratings over 24 Cycles).
- `draftContentRows.js:289` turns any major COMMUNITY seed into a moving-trucks line. Logged as G-ES8 in the C114 gap log, not this row. Traced 2026-11-07: inert on live — the rule is the stub backend only (`/run-cycle` runs `openrouter`), and the `hood=Citywide` gate is rejected before write (`normalizeHoodGate` → null).
- The bench resync wipes the evidence (`project_bench-resync-destroys-dial-evidence`): reads are taken before the final sync.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| plan + diff review of `2048ad406` | codex | [[../for-claude-review/2026-11-07-codex-engine332-review]] | HOLD → F1-F3 folded `c47769766` |
| re-review of the fold `c47769766` (last round) | codex | [[../for-claude-review/2026-11-07-codex-engine332-rereview]] | SHIP |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | F1: contract seeds carry into next Cycle's seed gates (unsigned weight 3 for a major); the S202 seed already carries the rating → `compactContractSeeds_` skips `coverage-reaction`, the rating counts once, dynamics unchanged | es · codex | review:20; `finalizeCycleState.js:715-739`, `applyCityDynamics.js:208-221,1036-1085,1153-1167` |
| A2 | F2: "pulled the city's mood up/down" can be false (clamps; a +3 the rater labels negative) → the Why states the rating row only | es · codex | review:22; `applyEditionCoverageEffects.js:318-340`, `rateEditionCoverage.js:444-450` |
| A3 | F3: two rows for one beat and Cycle shared a causeId and cancelled into a texture row → causeId carries the sheet row | es · codex | review:24; `buildContractSeeds.js` cluster key |
| A4 | Coverage seeds draw citizens with `ctx.rng` ahead of later clusters, so later seeds' citizen picks and shared draw offsets shift. Deterministic on replay; accepted, as with any new ripple | es · codex | review:29 |
| A6 | "The rating counts once" in next Cycle's seed gates is the ordinary path, not a per-row guarantee: the S202 seed has no row identity, identical texts dedupe and the engine list caps at 60. Pre-existing S202 behavior; the fold adds no contract-list weight. Recorded, not fixed | codex · es | rereview:30; `applyStorySeeds.js:1440-1454`, `finalizeCycleState.js:748-768` |
| A5 | The six Domain_Tracker names no beat or section emits (WEATHER, NIGHTLIFE, FESTIVAL, HOLIDAY, ARTS, TECHNOLOGY) fall to GENERAL / civic — a stated default | es · codex | review:30 |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|

## Open questions

- none

## Changelog

- 2026-11-09 (engine-sheet) — C115 live read PASS: Acceptance 1 (INFRASTRUCTURE −3 → civic major, COMMUNITY +3 → culture major, Magnitude = rating, Why names tone/count/reporter) and 4 (one coverage-reaction ripple each; edition-coverage rows still land).
- 2026-11-07 (engine-sheet) — The C114 Saturday ratings hold two at ±3 (INFRASTRUCTURE −3, COMMUNITY +3): C115 is the live read. G-ES8 traced inert on live (Current state). engine.335 stacked on PROD @177 (no file overlap).
- 2026-11-07 (engine-sheet) — Bench run 2 on the fold (@189) PASS, Acceptance 1-7; `npm test` 321/321; PROD @176 = stage 40. Live read (Acceptance 8) open.
- 2026-11-07 (engine-sheet) — Bench run 1 (pre-fold, @188) PASS; codex re-review of the fold SHIP; S202 carry ceiling recorded (A6).
- 2026-11-07 (engine-sheet) — Built `2048ad406`; codex HOLD (F1 deck carry double-counts, F2 mood claim, F3 same-key cancel) folded: carry skip, rating-only Why, per-row causeId.
- 2026-11-07 (engine-sheet) — Created from G-ES2; trace, three builder rulings, design.
