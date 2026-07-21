---
title: engine.71 — Crisis Detection Rebuild (ENGINE_REPAIR Row 28)
created: 2026-07-20
updated: 2026-07-20
type: plan
tags: [engine, crisis, arcs, neighborhoods, ripples, active]
sources:
  - Mike S327 (2026-07-20) — "let's look into row 28" → "Proceed" (plan MD + build approved; rarity + scope taste-calls delegated to recommended settings)
  - ENGINE_REPAIR Row 28 (S256) — fabricated-specificity diagnosis + do-NOT-restore ruling
  - docs/SIM_DOCTRINE.md — rules 1/2/3/7/8 govern this design
  - S327 machinery/consumer/sheet-state maps (3-agent sweep, this session)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.71 row points here"
  - "[[2026-06-15-story-seed-deck-engine-emergence]] §crisis-arc — Row 28 fold; rebuild relocated here"
  - "[[../engine/ENGINE_REPAIR]] — Row 28"
  - "[[2026-07-20-weather-transit-citizen-coupling]] — engine.70 events are detector channels"
  - "[[../index]] — registered same commit"
---

# engine.71 — Crisis Detection Rebuild

## Thesis

The old system GENERATED crises: one citywide illnessRate, dice-picked hood, pool-picked label —
invented specificity with zero citizen attribution, and it STILL RUNS (`generateCrisisBuckets_`,
Phase 3, live both entry points) feeding 9 in-cycle consumers. The rebuild inverts it: a crisis
is a state the world is already in, DETECTED from converging real per-hood channels, with the
actual affected citizens attached at detection. Causes, then dice (doctrine rule 2); the world
allowed to hurt (rule 3); no caps — zero crises is a normal cycle, three hoods at once is
allowed (rule 1). Detector-framer split: detection is deterministic code; narrative framing
stays downstream (seed contract / desks).

## Live-state findings the design stands on (S327 maps)

- `generateCrisisBuckets_` LIVE at Phase3-CrisisBuckets (godWorldEngine2 L235/L1811); its arcs
  die with ctx each cycle — lifecycle (processArcLifecycle_) + ledger load (v3preLoader L140)
  disabled S313; Event_Arc_Ledger is a fossil (654 rows, CycleCreated 70–81, 252 frozen 'peak').
- 9 live S.eventArcs consumers (civic load, spotlight, media-mode events, shock monitor,
  digest, v3 writers, recurring citizens) — arc SHAPE must stay compatible; no consumer edits.
- Neighborhood_Demographics Sick is FLAT (94–96 every real hood; writer smears the citywide
  rate) — the health channel is blind until CR-1 derives per-hood counts from SL rows.
- Channels with real variance today: Neighborhood_Map Sentiment/RetailVitality/HousingPressure/
  MigrationFlow/Trajectory; Chaos_Cars hits; hospitalEvents (live Hospital_Ledger writer);
  engine.70 weather/transit salient events (hood-scoped, shipped this session).

## Mechanic

**CR-1 — health/unemployment truth writer.** `updateNeighborhoodDemographics` derives per-hood
Sick/Unemployed from actual Simulation_Ledger rows (Status + Neighborhood counts, 1:443
scaling) instead of smearing citywide rates. Rows drive the number (universal protagonism).

**CR-2 — detector (inside generateCrisisBuckets.js, keeping its live Phase-3 slot).** Per hood:
stress channels normalized against city baseline — sentiment deviation, retail slump, housing
pressure, migration outflow, sick/unemployed excess (post-CR-1), chaos-hit cluster (prev
cycle — Phase-3 position makes prev-cycle the honest grain, crimeSpikes precedent),
hospitalization cluster (prev cycle), weather/transit salient event hits (same cycle, Phase 2).
**Convergence bar: ≥2 independent channels beyond bar → crisis onset.** Arc born with
citizens/businesses attached from the channel sources (the hospitalized, the displaced, the
hit businesses — POPIDs/BIZ-IDs at generation, no post-hoc finder). Arc shape = existing
S.eventArcs contract (arcId/type/phase/tension/neighborhood/domainTag/summary + citizens).
Tension = continuous function of channel deviation — physics, not increments. Ripple at onset:
causeType `crisis-event`, magnitude 0.05, hood scope + citizen scope for attached citizens.

**CR-3 — lifecycle + persistence.** Crisis arcs survive cycles: compact carry on
previousCycleState (weatherFrontTracking pattern, NOT the fossil ledger loader — no L236
clobber class). Each cycle the detector re-reads channels for carried arcs: still-degraded →
persist/escalate (phase early→rising→peak by sustained deviation), recovering → decline →
resolved (mean-reversion IS the recovery physics; no age counters). Arc rows append to
Event_Arc_Ledger via intents at transitions (onset/peak/resolved) — audit trail, not state
store. Fossil rows C70–81 left untouched (canon; rule 8).

**CR-4 — retire the dice.** Same commit the detector proves on bench: `generateCrisisBuckets_`
dice-spawn path removed (worldEvents push retained per Row 28 ruling — only the arc decision
moves). `generateCrisisSpikes_` untouched this build (Mike scope call: buckets first, spikes
assessed after first proven cycle).

**CR-5 — bench acceptance + deploy.** Node bench on live-read channel distributions to set
bars (engine.70 calibration rule: never training-data intuition); target ≈2–4 hood-crises per
sim year (Mike rarity call, recommended setting); 0717 groundhog fires; production push in a
clean window.

## Consumer map

Ripple causeType `crisis-event` → CONTRACT_SEED_DOMAIN `SAFETY` (civic desk), added at CR-5
with the bench. Existing 9 S.eventArcs consumers unchanged.

## Build order (bounded commits, each benched)

1. CR-1 truth writer (updateNeighborhoodDemographics)
2. CR-2 detector + onset ripples
3. CR-3 lifecycle carry + ledger audit rows
4. CR-4 dice retirement
5. CR-5 consumer map + bench + deploy

## Changelog

- 2026-07-20 — Drafted + approved (S327, Mike "Proceed"; rarity ≈2–4/yr + buckets-first scope
  on recommended settings). Grounded in 3-agent live maps (machinery/consumers/sheet state).
