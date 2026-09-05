---
title: engine.70 — Weather Events + Transit Citizen Coupling
created: 2026-07-20
updated: 2026-07-20
type: plan
tags: [engine, weather, transit, ripples, story-surface, active]
sources:
  - Mike S326 (2026-07-20) — "we can look at transit and how it can wire into the system and we need to add weather events"
  - phase02-world-state/applyWeatherModel.js (1442 lines — full model: temp/wind/precip fronts/visibility + per-hood microclimates, S.weather + S.neighborhoodWeather)
  - phase02-world-state/updateTransitMetrics.js (648 lines — on-time/traffic metrics, weather/event/season-influenced, getTransitStorySignals_ → Phase 6)
  - utilities/rippleLedger.js — recordRipple_ (the V2-5 emission mechanism)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.70 row points here"
  - "[[2026-06-15-story-seed-deck-engine-emergence]] §V2-5 — the pattern this extends (state → citizen coupling → ripple)"
  - "[[../index]] — registered same commit"
---

# engine.70 — Weather Events + Transit Citizen Coupling

## Thesis

Both systems already exist as rich world-state and both fail the universal-protagonism test the
same way: **weather happens around citizens, never to them; transit is a dashboard, not a lived
system.** No storm ever fells a tree on a named citizen's block; no one misses a shift because
BART broke down. The build is the V2-5 pattern extended: existing state → discrete salient events
with exact entities attached at generation → ripple into the story surface. FIX-don't-ADD: all
work lands inside the two existing engines + bounded blocks in existing citizen engines. No new
files without Mike's explicit approval at build time.

## W-lane — weather events

**What exists:** `applyWeatherModel.js` (Phase 2) computes `S.weather` {type, impact, temp,
windSpeed, precipitationIntensity/Type, frontState, frontStrength, visibility} +
`S.neighborhoodWeather` per-hood microclimates. Consumed today as ambient mood/pool modifiers
only (household weatherMood, transit, city dynamics).

**Design — detection (Phase 2, inside applyWeatherModel.js):** a salience pass at the end of the
model run reads its own outputs and emits discrete events to `S.weatherEvents[]` + ripples:

| Event | Fires when (from the model's own fields) | Scope / entities | Magnitude | Ripple effectType |
|---|---|---|---|---|
| storm | high precipitationIntensity + windSpeed over bar (calibrate to model's real ranges at build) | worst-hit hoods from S.neighborhoodWeather; businesses via chaos-business-fold pattern | 0.05 major | `storm` |
| flood-conditions | precipitationType rain + intensity at max band, frontStrength high | low-lying hoods (profile-tagged at build) | 0.05 major | `flood` |
| heat-wave | temp over bar for N consecutive cycles (cross-cycle state via PropertiesService — chaos-residual precedent) | citywide or hottest-microclimate hoods | 0.05 major | `heat-wave` |
| fog-day | visibility under bar | fog-prone hoods (fogChance profiles already exist) | 0.02 texture | `fog` |

**Design — citizen coupling (Phase 4/5, bounded blocks in existing engines):** salient
`S.weatherEvents` feed the lifecycles the same way chaos does — the crisis-igniter doctrine:
- heat-wave → elderly/vulnerable citizen health entry via the chaos-domain pattern
  (Status flip to hospitalized where life-state allows; HealthCause human prose) —
  bounded block in the same class as `writeCitizenEvent_`'s engine.67 step 8.
- storm/flood → citizen event lines (ECL vocab rows; 151-row-library precedent) +
  business hits via the existing `chaosBusinessFold` accumulator.
- Coupled citizen hits ripple `targetScope: 'citizen'` with the POPID, on top of the
  hood-scope event ripple.

**Ripple spec:** causeType `weather-event`, domain map → **SAFETY** (civic desk); a coupled
health hit additionally surfaces via the existing storyHook classes.

## T-lane — transit coupling

**What exists:** `updateTransitMetrics.js` (Phase 2) computes on-time performance
(BASE_ON_TIME 0.85 ± variance), traffic index, event/weather/season modifiers, and
`getTransitStorySignals_` already wired to Phase 6.

**Design — salience (inside updateTransitMetrics.js):** detect the bad-day states from its own
computation: `service-disruption` (on-time below bar / breakdown roll) and `gridlock-day`
(traffic index over bar + major event). Write `S.transitState` + ripple:

| Event | Scope / entities | Magnitude | Ripple effectType |
|---|---|---|---|
| service-disruption | citywide or corridor hoods | 0.05 major | `service-disruption` |
| gridlock-day | event hood + neighbors | 0.02 texture | `gridlock` |

**Design — citizen coupling:** commute events gated on life-state (`ls.working === 'working'` —
the engine.67 gate helper): on a disruption day, working citizens in affected hoods can draw
commute-disruption lines (ECL vocab rows), feeding dials the normal way. No status flips —
transit inconveniences, it doesn't hospitalize.

**Ripple spec:** causeType `transit-event`, domain map → **CIVIC** (infrastructure story, civic
desk).

## Consumer maps

`buildContractSeeds.js` CONTRACT_SEED_DOMAIN adds: `weather-event: 'SAFETY'`,
`transit-event: 'CIVIC'`. Desk map already covers both domains.

## Build order (each its own bounded commit + groundhog bench fire)

1. W-1 weather salience detection + hood-scope ripples (applyWeatherModel.js)
2. W-2 heat-wave cross-cycle tracking (PropertiesService)
3. W-3 citizen coupling: health entry + ECL vocab rows + business fold
4. T-1 transit salience + ripples (updateTransitMetrics.js)
5. T-2 commute coupling (ECL vocab + life-state gate)
6. Consumer map adds + bench acceptance (fires until each causeType observed or verified condition-gated)

**Calibration rule (measure-twice):** every threshold above is set AGAINST THE MODEL'S REAL
OUTPUT DISTRIBUTION at build time — read several cycles of live S.weather/transit values before
picking bars; a bar set from training-data intuition will fire never or always.

## Design calls — ANSWERED (Mike, S327)

(a) heat-wave health coupling: **rare — 1-2 vulnerable citizens max per event**;
(b) storm frequency: **seasonal — a few majors per sim year, each one remembered**;
(c) fog-day: **pure texture, no ripple** — the fog row is dropped from the event table.

## Changelog

- 2026-07-20 — Drafted (S326, engine-sheet) from Mike's direction; grounded in full-file reads of
  both engines + the V2-5 shipped pattern. Build queued behind fresh-session boot (S327).
- 2026-07-20 — W-1 SHIPPED (S327). Calibration bench exposed a prerequisite defect:
  `weatherFrontTracking` was never carried across cycles (absent from finalizeCycleState
  snapshot), so multi-day fronts re-rolled every cycle — heat_wave alert empirically
  unreachable (max hot streak 2 vs bar 6 over 400 bench years), majors 0.24/yr. Fix = v1.9
  front carry (same class as v1.7 weatherTracking carry). **W-2 collapses into W-1**: the
  spec's PropertiesService step is unnecessary — previousCycleState already persists via
  PropertiesService; heat streak + flood accumulator ride the carried objects. Bars set
  against 1000-yr bench WITH carry: storm p≥0.60 ∧ wind≥20 once/wet-run (1.06/yr, includes
  strong-RAIN "atmospheric river" tier — STORM-front-only fires 0.19/yr), flood run≥3 ∧
  cum-precip≥2.2 (0.78/yr), heat-wave hot-streak≥4 ∧ temp≥78°F fired-flag (0.14/yr,
  Summer-dominant, temp floor kills 55°F winter false fires). ≈2 majors/yr total = call (b).
- 2026-07-20 — **engine.70 COMPLETE (S327).** W-3: texture pools (storm/flood/heat lines ride the
  existing getWeatherEvent_ draw + hood pools); heat hospitalizes 1-2 seniors 70+ via a bounded
  pre-loop block in generationalEventsEngine (chaos step-8 class — Status flip into the real
  health lifecycle, retiree guard, HealthCause prose, citizen-scope ripple w/ POPID);
  storm/flood dent 1-3 exposed-hood businesses through the existing chaosBusinessFold (pre-flush
  block in chaosCarsEngine, Annual_Revenue [-8,-20], chaos family). T-1: measure-twice find —
  transit's storm branches (−0.15 on-time, ×1.3 traffic) were DEAD since landing
  (S.weather.type never holds 'storm'); fixed via frontState key. Salience: service-disruption
  (on-time<0.72 ∨ 1.5% breakdown, ~1.6/yr, consecutive-cycle dedup via snapshot flag) +
  gridlock-day (traffic≥78 ∧ events/game-day, 0.02 texture). T-2: working citizens draw commute
  lines (30% affected hoods / 12% else, double life-state gated). Consumer map: weather-event→
  SAFETY, transit-event→CIVIC. Acceptance: 1000-yr Node bench through real compactors (1975
  events = 1975 well-formed ripples); SANDBOX 0717 fired C112+C113 clean (0 errors, weather
  streak carry visible 10→11, salience condition-gated as designed). Production pushed S327;
  canonical proof = Mike's C102 live fire. Commits: 7fffc251 (W-1/2), 01539049 (W-3),
  904aa1d5 (T-1), 770eea3c (T-2), fff05f96 (consumer map).
