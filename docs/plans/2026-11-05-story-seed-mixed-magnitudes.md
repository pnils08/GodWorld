---
title: Story Seed Mixed Magnitudes Plan
created: 2026-11-05
updated: 2026-11-08
type: plan
tags: [engine, media, story-seeds, active]
sources:
  - output/production_log_run_cycle_c114_gaps.md G-ES3 (engine-sheet, found during the engine.331 trace)
  - phase07-evening-media/buildContractSeeds.js:466-476 (cluster key), :496-498 (sum), :524 (class gate) → :121-127 (contractSeedIsMajor_), :601-603 (What), :612 (Magnitude)
  - utilities/rippleLedger.js:40-98 (recordRipple_ → S.rippleEvents)
  - live Ripple_Ledger C110–C114 (359 rows) and output/beats/Story_Seed_Deck.jsonl C110–C114 (228 seeds), read 2026-11-08
  - wiring cards 2026-11-08 (engine-wiring): buildContractSeeds_, Story_Seed_Deck
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.334"
  - "[[2026-11-05-sports-feed-triggers]] — engine.331, where this was found"
  - "[[2026-11-07-coverage-reaction-seeds]] — engine.332, shares the builder; its rows must not move"
---

# Story Seed Mixed Magnitudes Plan

**Builder's words (2026-11-05):** "note the “outside the job” as its own plan with a pointed on rollout , we will take that job after the 2 you have queued already , just whatever you have on it now with the note to review deeper when plan picked up"

**Builder's words (2026-11-08):** "Go on the job"

**Goal:** a story seed's `What` line and `Magnitude` cell print each quantity in its own unit, and its major/texture class is decided per unit, so no seed adds a mood change to a head-count, a traffic delta to a mood delta, or a stack of fixed tags into a fake amount.

**Rows:** engine.334 · **Owner:** engine-sheet · **Sequence:** after engine.331 and engine.332 (builder 2026-11-05) — both PROD, live-observing

## What the read found (Task 1, 2026-11-08)

The stub's claim was wrong in one place: the head-count never decided the sports seed's class. C110–C114, the sports cluster is major by size (≥3 effects) in 4 Cycles and by mood alone in C111 (0.085 ≥ 0.05). Removing the counts from the sum flips 0 classes. The proven defect is the printed size and the `What` line, plus one rank flip from an unlike sum (below).

`magnitude` on a ripple has no single unit. Read at every `recordRipple_` producer (48 call sites, 24 files):

| Kind | Producers (causeType / effectType → magnitude) | Adds within a cluster? |
|---|---|---|
| dial delta | sports `sentiment` (feed trigger total + aftermath, `applySportsSeason.js:894,913`); edition-coverage `sentiment` / multi-dial (`applyCityDynamics.js:1758,1814` — the multi-dial row carries the traffic delta only); neighborhood-fold peaks (`:1613,1627`, each already the max-abs fold) | yes, within one effect |
| head-count | sports `game-night` (`applyGameNightMoments.js:632`), `game-night-household` (`runHouseholdEngine.js:636`), `game-night-texture` (`generateCitizensEvents.js:3911`) | yes, within one effect |
| points | economic-event impact incl. carryover (`economicRippleEngine.js:275`); approval-shift office-holder delta, ×0.003 into the same district mood (`updateCivicApprovalRatings.js:1093`) | yes, whole cluster (one unit per cause) |
| level / tag | hook severities 5–8 (`recordHookRipple_`: migration, trajectory, household, seat-filled…); fixed tags 0.01–0.1 (chaos, fame, faith, faith-join, city-event, sighting, crisis, youth, bond, weather, transit service-disruption/gridlock); initiative intensity 0–1 (`applyInitiativeImplementationEffects.js:752`, `civicInitiativeEngine.js:1948,2037`); business-closure −25/−40; crime peak spikes; coverage-reaction rating | no — a count of events and the peak |

C110–C114 clusters: 228 seeds, 39 clusters mix effect types. Shapes seen on the deck: `sentiment +36.06` = mood 0.058 + 35 citizens + 1 household (C114); `CITIZEN_RELOCATED +75` = 15 moves × tag 5 (C110); `NEIGHBORHOOD_BOOM +14` = two severity-7 hooks (every Cycle); `tier-climb +0.2` = 4 × tag 0.05; `sentiment/communityEngagement/nightlife +2.7` = three initiatives' intensities; the edition-coverage row = traffic delta + mood delta.

Class branch tally C110–C114 (which test made each seed major): size≥3 24, magnitude 128, texture 76. The bar (`|m| ≥ 3`, or `0.05 ≤ |m| < 1`) is unit-blind; that is a sim call and sits in Open questions, not in this cut.

Readers (both wiring cards): no non-test code parses `What`. `Magnitude` is mapped by `buildEconomicSlice.js:270` and `draftContentRows.js:216` and never used after; it rides the Phase-9 carry as `m` "for the record" (`loadPreviousEvening.js:451`) and no engine code reads it. `/sift` treats `Magnitude` as a labeled signal, never priority (`.claude/skills/sift/SKILL.md:259`) and matches seeds on `Why`, not `What` (`:455`). `Class` matters: carry `major` → priority 3, `texture` → 2 (`finalizeCycleState.js:743`) → next Cycle's hood seed weight (`applyCityDynamics.js:1037`) and the 60-row carry cap drops texture first (`finalizeCycleState.js:766-767`); `buildLivesSlice.js:315` sorts major first; `draftContentRows.js:281` takes the first three majors; `/sift` sends texture to atmospheric-only (`SKILL.md:257`).

## The cut

One file, `phase07-evening-media/buildContractSeeds.js`, plus its test. Producers untouched; no column or schema change.

1. **Unit table in the builder** — `CONTRACT_SEED_UNIT` by causeType: `economic-event` and `approval-shift` → `sum` (whole cluster, one unit; keeps engine.206's `+16`); `sports` → `by-effect` (sum within each effect type, never across); any cause not listed → `level` (each effect type shows its count of events and its peak value). Lives where the adding happens; a new producer left off the table fails safe (prints `×N`, never a made-up total). A field on `recordRipple_` was weighed and set aside: 48 call sites in 24 files outside this job, and the Ripple_Ledger header would change.
2. **Groups** — a cluster's ripples split into unit groups per the table; the lead's group (first non-carryover, as now) prints first.
3. **`What`** — groups joined `; `. `sum` / `by-effect` group: `<effect> ±<sum>`. `level` group of one: `<effect> ±<value>` (unchanged from today). `level` group of more than one: `<effect> ×<n>`. The `(N related effects this cycle)` suffix stays.
4. **`Magnitude`** — the lead group's figure: its sum for `sum` / `by-effect`, its signed peak for `level`.
5. **Class** — major when the cluster has ≥3 effects (unchanged) or when any one group's figure clears the existing bar in its own unit. Merging never demotes an effect that would be major on its own, and never promotes by adding unlike things. Bars unchanged.

Modelled on the C110–C114 ripples (scratch replay, not the engine): 53 of 228 `What` lines change; 1 class flips — C114 edition-coverage, traffic +0.03 and mood +0.02, major → texture (neither clears 0.05; together they did). Sports C114 becomes `sentiment +0.06; game-night +35; game-night-household +1 (4 related effects this cycle)`, Magnitude 0.06, major. Economic, approval and coverage-reaction rows unchanged.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Read-before: `buildContractSeeds_` end to end, wiring cards on it and on `Story_Seed_Deck`, every reader of seed `magnitude` / `Class`, a C110–C114 count of mixed-unit clusters. Fill this plan | es | done (this edit) |
| 2 | Codex plan review (codex-es) → reconcile below | es / codex | not started |
| 3 | Build the cut in `buildContractSeeds.js`; tests in `buildContractSeeds.test.js`: the C114 sports shape, a 15-move migration cluster (`×15`, Magnitude 5), the edition-coverage pair (texture), the unit table's default; 5b.a, 5b.d and §11/§12 unchanged. `/stub-engine` in the same commit | es | not started |
| 4 | Replay C110–C114 Ripple_Ledger rows through the old and the new builder (`output/engine-sheet/`); every class flip and every changed `What` listed here | es | not started |
| 5 | Codex review of the exact deploy candidate; fold | es / codex | not started |
| 6 | Sandbox fire on live-synced state (one unproven change in flight across both terminals); read the Cycle's `Story_Seed_Deck` rows back; Engine_Errors unchanged | es | not started |
| 7 | PROD push, DEPLOY_HISTORY, live read at C116 Sun 2026-11-15 | es | not started |

## Acceptance

1. No `What` line prints a sum across two units — proven by the Task 3 test and the Task 4 replay.
2. Replay C110–C114: every class change listed, each explained by its units; the modelled expectation is 1 (C114 edition-coverage).
3. Existing exact-match tests pass unchanged: 5b.a (`sector-impact… +16`), 5b.d (`game-day-crowds +0.16`), engine.332 :418 (signed 3 / −3).
4. Sandbox fire: the Cycle's deck rows read back with no cross-unit sum; 0 new Engine_Errors.
5. Live C116 (Sun 2026-11-15): the sports row and any multi-event migration / trajectory row read back in their own units.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| Wiring card `buildContractSeeds_` | es (engine-wiring) | in-session 2026-11-08 | read-only |
| Wiring card `Story_Seed_Deck` | es (engine-wiring) | in-session 2026-11-08 | read-only |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | No non-test parser of `What`; `Magnitude` read by no engine code and never ranked | es · both cards | `beatSliceKit.js:152`, `loadPreviousEvening.js:451`, sift `SKILL.md:259` |
| A2 | `Class` moves next Cycle's hood seed weight (3 vs 2) and the carry cap | es · both cards | `finalizeCycleState.js:743,766`, `applyCityDynamics.js:1037` |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|
| P1 | The engine builder gives the same 53 / 1 as the scratch model | es | Task 4 replay through the real builder | this plan §The cut |

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|
| N1 | Map gaps: STUB_REVERSE lists no `Story_Seed_Deck` writer; SHEETS_MANIFEST §9 has no row for `saveV3Seeds.js` :74/:84 migrator writes, `cycleRollback.js:143`, `citizen-signal-detector.js:231,238`, `routePatternSeeds.js:699,706`; the two scripts write positionally to a v3 header the v4 deck lacks (their guards throw) | es · Story_Seed_Deck card | doc truth, two dead write paths | held — not this job; gap log |
| N2 | `compileHandoff.js:300-325` reads v3 columns (`SeedType`, `Priority`, `SeedText`) the v4 deck lacks — every row drops | es · Story_Seed_Deck card | a dead reader | held — not this job; gap log |

## Open questions

- The bar is unit-blind (C110–C114): a full-strength initiative (intensity 1.0) ranks texture while 0.05–0.9 rank major; every chaos, fame, crisis and service-disruption tag (0.05) ranks major, every faith, city-event and sighting tag (0.01–0.02) texture; a hook severity 5–8 always clears 3. Whether each kind gets its own bar is the builder's call — a new row if yes. Not in this cut.
- A multi-hood initiative ripple has a blank neighborhood (`applyInitiativeImplementationEffects.js:752`, `hoods.length === 1 ? hoods[0] : ''`), so three different initiatives merge into one citywide seed every Cycle. Not a units defect — a new ROLLOUT row candidate, for the builder.

## Changelog

- 2026-11-08 (engine-sheet) — Task 1 done: read-before on both wiring cards and live C110–C114 ripples; the head-count never set the sports class (0 flips); cut is one file, a unit table, per-unit What/Magnitude/class; modelled 53 What changes, 1 class flip.
- 2026-11-05 (engine-sheet) — Created as a stub from the engine.331 trace (G-ES3); builder: own plan, after engine.331 and engine.332, review deeper when picked up.
