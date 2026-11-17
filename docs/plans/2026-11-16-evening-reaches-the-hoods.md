---
title: The Evening Reaches the Hoods Plan
created: 2026-11-16
updated: 2026-11-16
type: plan
tags: [engine, active]
sources:
  - output/production_log_run_cycle_c116_gaps.md §C114–C116 watch re-reads (engine.289 row)
  - phase07-evening-media/applyStorySeeds.js (Riley evening layer block)
  - phase02-world-state/applyCityDynamics.js:1198-1220 (CULTURE / NIGHTLIFE domain gates)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.289"
---

# The Evening Reaches the Hoods Plan

**Builder's words (2026-11-16):** "Fix the culture bar" · "Then fix the night life issues , the sims completely ignores. It" · "Of course restutaunts matter" · on the evening layer: "that's my favorite phase of the engine and never hear anything about it , it goes nowhere and is a shame cause it's the most creative thing the engine produces and would be the most interesting thing the media could Cover".

**Goal:** the evening layer's culture and nightlife land on the hood they happened in, so the Phase-2 CULTURE and NIGHTLIFE gates credit that hood the next Cycle.

**Rows:** engine.289 · **Owner:** research-build

## Read (2026-11-16)

- The gates: `applyCityDynamics.js:1198-1220` sums carried seed weight per hood per domain; CULTURE ≥ 3 → culturalActivity ×1.03, ≥ 6 → ×1.05 and publicSpaces ×1.03; NIGHTLIFE ≥ 3 → nightlife ×1.03, ≥ 6 → ×1.05 and traffic ×1.03. A seed with no hood goes to the citywide term, never a hood.
- Input C115–C117 (carried blobs, live `Carry_Forward_Store`): every CULTURE seed had `n: ''`; one hood reached 3 once (Uptown, at C115), none 6. NIGHTLIFE: one seed a week, no hood.
- Cause: `applyStorySeeds.js` wrote city-event and famous-sighting seeds with the literal `''`, though `S.cityEventDetails` and `S.famousSightings` (both Phase 7, earlier) carry the hood. The night's spots (`S.nightlife.spotDetails`) and the dinner crowd (`S.eveningFood.restaurantDetails`), each placed at a hood, made no seed at all; the one NIGHTLIFE seed fires only when the city's nightlife is ≥ 1.3 (it ran 0.99–1.03).
- The gate credits a hood only when its name is a key of `profiles` — the 22 canon hoods (`getCanonNeighborhoods_`, `applyCityDynamics.js:856-862`). Business_Ledger: 269 of 283 rows carry a canon hood; the other 14 (10 `City-wide`, Brooklyn Basin, Old Oakland, Coliseum, Telegraph corridor) fall to the citywide term, as before.
- Not changed: the bars (3 / 6). They are read again once hooded input has run (Acceptance 2).

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | `applyStorySeeds.js`: city-event seeds take their hood from `S.cityEventDetails`; famous sightings one CULTURE seed per hood (a hoodless sighting stays on the citywide line); one NIGHTLIFE seed per night spot (`nightlife-spot`) and per restaurant (`dining-spot`) at its hood; all priority 2 | rb | done (this commit) |
| 2 | `v3NeighborhoodWriter.js` `eventAttractBase_`: skip `famous-sighting`, `nightlife-spot`, `dining-spot` so EventAttractiveness is unchanged (a name with "art" in it would otherwise count) | rb | done (this commit) |
| 3 | `scripts/eveningSeedHoods.test.js`: seeds on their hood, EA unchanged (fails on the old writer: 0 vs 1), carry keeps hood and domain | rb | done (this commit), 11/11 |
| 6 | `applyCityDynamics.js`: one log line per fire naming each hood at or past 3 on CULTURE or NIGHTLIFE with its weight; the gates had no record of their own (read only, no behavior) | rb | done (fix-up commit); cityDynamicsCarry 9, hoodBlindTables 22, hoodEconomyCarry 20, hoodEconomyRelative 29, perHoodDynamics 92 |
| 4 | Sandbox fire on the exact candidate: read the C+1 carry blob for hooded CULTURE / NIGHTLIFE seeds and the C+2 gate effect; EA sum unchanged by these seeds | rb | done: @201, C117 + C118 PASS, `output/research-build/2026-11-16-e289-reads.jsonl` |
| 5 | PROD push, DEPLOY_HISTORY stage | rb | done: stage 49 @184, 2026-11-16 20:30 CST |

## Acceptance

1. At the first live fire after PROD, the carried story-seed blob holds CULTURE seeds with a hood for each staged city event and each hooded sighting, and NIGHTLIFE seeds for each night spot and restaurant — proven by a `Carry_Forward_Store` read.
2. Over the next three fires, record per week which hoods reach CULTURE and NIGHTLIFE 3 / 6 at the gate's own weight (priority × type × calendar) — proven by the `applyCityDynamics_ engine.289: evening bars (3 / 6) reached` line in each execution log (Task 6). That count is what the builder's bar call reads.

## Side effects read (wiring card 2026-11-16, engine-wiring agent)

- Readers of `S.storySeeds` after Phase 7: Riley_Digest / WorldEvents_Ledger / Media_Ledger seed counts (rise by ~5–10 a week), the cycle checksum (count), `applyCycleWeight_` (count bars at 10 / 15; C116 already had 31, no change), `v3DomainWriter` (domain tally: NIGHTLIFE and CULTURE rise — the intended effect), `eventAttractBase_` (Task 2), `compactStorySeeds_` (the carry, cap 60 by priority; live counts 30–44 before this).
- `buildMediaPacket_` reads the list before Phase 7 writes it; the Story_Seed_Deck does not read this list (deck-dead since S296). Media coverage of the evening is not this job.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|

### Needs proof

| # | Item | Held by | Proof |
|---|---|---|---|

### New concepts

| # | Item | Held by | Sources |
|---|---|---|---|
| N1 | The evening layer's content (who was seen where, which restaurants, what is on TV) reaches the world summary and the paper's seed list; today the summary carries one nightlife line and the deck only numbers | rb (2026-11-16, offered; the builder chose the culture fix first) | `output/world_summary_c116.md:19`; Story_Seed_Deck C116 rows |

## Changelog

- 2026-11-16 (research-build) — Plan written; Tasks 1–3 built and unit-proven (11/11; illnessEnvelope 34, activityObservationsCarry 61, perHoodDynamics 92 unchanged). Sandbox blocked on the version cap.
- 2026-11-16 (research-build) — Task 6: the bars' reach is logged per fire (Acceptance 2 reads it). STUB_MAP regenerated. Bench order once the versions are cleared: stage 48 first (live, unbenched), this job on top.
- 2026-11-16 (research-build) — Versions cleared by the builder. Bench @201 stage 49: C117 192 s, C118 174 s, PASS, 0 errors; hooded seeds as designed; to C119 Uptown CULTURE 8, KONO 4, Lake Merritt 4. PROD stage 49 @184. First live read C117 Sun 2026-11-22.
