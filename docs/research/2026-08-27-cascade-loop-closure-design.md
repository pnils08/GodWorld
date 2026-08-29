---
title: Cascade loop closure — employment/illness/sentiment as one system — research
created: 2026-08-27
updated: 2026-08-27
type: reference
tags: [research, engine, active]
sources:
  - Builder questions 2026-08-27 (S391): why 90% employment / 10.5% illness; mayor approval −13 against record stats; does the sim read the dial or the dial read the sim; how does a 960-citizen sample loop with a 386k model city
  - Three-lane read-only trace 2026-08-27 (kimi + explore subagents) across phase01-config, phase02-world-state, phase03-population, phase04-events, phase05-citizens, phase08-v3-chicago, phase10-persistence, phase11-media-intake, utilities/, lib/, scripts/, dashboard/
  - docs/research/2026-08-07-city-neighborhood-cascade-team-review.md — engine.102 basis (direction lock city→hood→citizen)
  - docs/research/2026-08-07-world-population-bidirectional-design.md — WP controlled-dice + talk-back design seed
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.104 row (this doc is its revision input)"
  - "[[../plans/2026-08-10-economy-native-rebuild]] — the plan this revises"
  - "[[../plans/2026-08-08-engine-102-cascade-consistency]] — the consistency work this extends from"
  - "[[index]] — registered here, same commit"
---

# Cascade loop closure — employment/illness/sentiment as one system — research

**Source:** Builder challenge 2026-08-27 (S391): no real city runs 90% employment or 10.5% standing illness; a mayor losing 13 approval points while the dials claim record efficiency is incoherent; and the media rule correctly suppresses the numbers until they're accurate — so the fix is accurate numbers, not cleverer coverage. Followed by a three-lane read-only trace of every writer, reader, dispersal formula, and feedback path for employment, illness, and sentiment.

**What this addresses:** engine.104's open design question — how city dials, hood dispersal, and a 960-citizen sample (1:~411) act as ONE system, given the sample can never literally hold the city's rates. Feeds the engine.104 plan revision ("NOT safe — plan revision required before code").

**What the trace found (verified, file:line):**

Current direction is locked top-down per engine.102: dials are autonomous (World_Config attractors + calendar/weather noise), hoods read the city, citizens read the hood *for illness only*, and almost nothing reads back up.

- **Illness is the one complete path.** `applyDemographicDrift.js` writes `World_Population.illnessRate` (sole writer; steps up/down 0.0002, calm 0.0004, cap 0.15, plus hospital-strain talk-back at `:184-208`) → `updateNeighborhoodDemographics.js:171-197` disperses to hood Sick with real modifiers (salient heat +0.25, flood +0.15, QoL ±0.10, clamp [0.75,1.5], delta capped ±3) → `generationalEventsEngine.js:1270-1369` `checkHealthEvent_` doses citizens off the hood rate (fallback hood→city→config), with the sample-support floor `c = max(c, rate/illnessSupportCycles)` above 8% → ledger Status/HealthCause → `buildCyclePacket.js:820-1006` mints/closes Hospital_Ledger beds → open census above `hospitalBaseCapacity` (100) pushes next cycle's city rate up. The loop closes, but only at hospital overflow; recovery (`processHealthLifecycle_`) never decrements hood Sick.
- **Employment is a fully open loop.** `applyDemographicDrift.js:224-228` steps the rate toward the `employmentAttractor` band [0.90, 0.93] — 90% is literally the setpoint, not a measurement → hoods get `adults × (1 − rate)` smeared uniformly (`updateNeighborhoodDemographics.js:204-212`), the only dispersed metric with zero hood modifiers → **citizens are never dosed**: jobs come from `runCareerEngine_` matching citizens to `Business_Ledger` headcount × Growth_Rate (`:1123-1242`), a parallel system that never reads the dial → and nothing reads back up: actual blank/UNTRACKED `EmployerBizId` counts are observed only by the read-only audit (`cascadeAudit.js:240-263`). The dial answers to nothing.
- **Sentiment is mostly top-down with one thin return path.** `applyCityDynamics.js` builds city sentiment from clusters/events/media → `v3NeighborhoodWriter.js:355-365` disperses to hoods (city base + frozen profile mod + variance + pulse fold) → citizen dials (`utilities/citizenMemory.js`, 8 dials) are fully independent and roll up nowhere. The only upward path: public-footprint citizen events → `neighborhoodPulseMap.js` → hood Sentiment/Crime/Retail/Events (cap ±0.15).
- **The sample problem is already solved once, for illness.** The engine's own answer to 1:411: don't make the sample hold the rate — dose stochastically off the rate, and gate ground-truth corrections behind significance thresholds (`illnessSupportThreshold`/`illnessSupportCycles`). `runCareerEngine.js:1275-1276` and `applyCityDynamics.js:1095` both state the 1:443 qualitative-representation doctrine; `migrationTrackingEngine.js:60-72` tops out at planning-to-leave because one node exit can't assert hundreds leaving.

**Chain breaks found in the trace (engine-substrate, engine-sheet's to land):**

1. `buildCyclePacket.js:184` renders `S.worldPopulation.illnessRate` — the stale pre-drift Phase-1 value (`updateWorldPopulation_` still computes dead values at `godWorldEngine2.js:754-999` and stores them at `:1019-1024`; `applyDemographicDrift_` never refreshes S). Cycle packet prints the wrong illness number.
2. Hood illness dispersal's QoL fold reads `S.crimeMetrics.neighborhoodBreakdown`, but the crime writer stores under `byNeighborhood` — the QoL ±0.10 modifier is inert.
3. `buildDeskPackets.js:1138` reads a WP column named `Employment`; the column is `employmentRate` — desk packets get empty employment context.
4. `updateWorldPopulation_` dead computation (Gap E above) is a misleading duplicate source of truth.
5. `chaosCarsEngine.js:333-360` and `sportsFeedWriter.js:932-974` write citizen health statuses without pushing `hospitalEvents` (caught today only by the engine.105 missed-admission reconcile).
6. No ledger→hood recalibration exists for any metric: hood Sick/Unemployed chase the dial, never the ledger.
7. Mayor approval dynamics don't read prosperity stats — the −13-points-against-record-employment incoherence the builder named.

**Extraction — the design (what's usable for engine.104):**

- **Dials set climate; hoods localize; citizens sample; ground truth corrects** → the cascade contract, generalized from the illness path to every dial. One sentence: *dials set the climate, hoods localize it, citizens sample it stochastically, and ground truth applies bounded correction pressure back — every upward path threshold-gated so the sample informs the model without pretending to be it.*
- **Retune before rebuild** → World_Config only, zero code: `employmentAttractor` 0.90 → ~0.945 (≈5.5% unemployment, real boom-city), `employmentFloor` 0.80 → ~0.85 (15% = genuine depression). Illness needs one code addition: it has cap and steps but no downward anchor — add `illnessBaseline` (~0.025) so calm cycles revert to 2–3%, with outbreaks arriving as named event arcs that push and decay instead of drift noise near the cap.
- **Close employment by steering, not dosing** → you can't fire 960 citizens to track a 0.4% dial move, so don't dose: translate dial-vs-attractor gap into pressure on `runCareerEngine_` — rate below attractor → hiring multiplier drops, layoff odds rise; above → hiring accelerates. The dial steers the system that actually employs people instead of competing with it.
- **Bounded talk-back for employment, illness-style** → tracked-unemployment rate (blank/UNTRACKED EmployerBizId ÷ working-age tracked) plus Σ Business_Ledger headcount deltas feed the city rate as a small weighted nudge, binding only outside a significance band (e.g. >2pp sustained 3 cycles, mirroring the illness support rule). Business ground truth joins citizen ground truth — businesses, citizens, and dials become one system.
- **Hood modifiers for employment** → unemployment is the only dispersed metric with no per-hood cause; a recession that hits the Port and the hills identically is wrong on its face. Add employment modifiers to the NEIGHBORHOOD_PROFILES pattern (industrial/port hoods take it first and hardest; high-income hoods dampened).
- **Sentiment: use the pipes that exist** → fold mean citizen-dial drift (composure/mood) into `neighborhoodPulseMap` as a pulse term; hood sentiment already aggregates upward through `applyCityDynamics_` clusters. Two small reads, no new machinery.
- **Approval coupling** → mayor/council approval dynamics must read the prosperity dials (employment, illness burden, crime) as one input among several — enough that record employment is visible in approval, not determinative of it.

**Not applicable / hazard:**

- Do NOT dose citizens directly off the employment rate (mass hire/fire to match a dial) — the sample can't hold it and it would fight the career engine's business-capacity logic. Steering-pressure only.
- Do NOT let raw ledger rates write city dials ungated — a 960-row sample of deliberately-interesting people is not a representative survey; threshold-gated corrections only.
- Do NOT loosen the media cascade rate rule to cover the gap — builder-direct 2026-08-27: the ban is correct and flips off when the numbers become accurate. The fix is accurate numbers.
- Do NOT retune dials without a bench fire — engine.102 proved config reads bind (illnessCap probe, bench C107/C108); same proof pattern applies here.

**Verdict:** `adopt` — as the revision input to engine.104 (existing `ready` row, research-build → kimi/codex). This is the "plan revision required before code" content: current-state truth, chain breaks, and the loop-closure design. Claude review requested by the builder before any code.

**Ignited plans:** none new — revises [[../plans/2026-08-10-economy-native-rebuild]] (engine.104). Chain breaks 1–3 are candidates for a small engine-sheet fix batch independent of engine.104.

---

## Applications (living)

- 2026-08-27 — Filed as engine.104 revision input; Claude review pending (builder-direct).

---

## Changelog

- 2026-08-27 — Initial extraction (S391): three-lane trace (employment / illness / sentiment+dispersal) + loop-closure design, builder-approved capture for Claude review.
