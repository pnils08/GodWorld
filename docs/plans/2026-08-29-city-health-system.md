---
title: City Health System Plan
created: 2026-08-29
updated: 2026-08-29
type: plan
tags: [plan, engine, illness, cascade, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md engine.133
  - docs/research/2026-08-27-cascade-loop-closure-design.md §Applications 2026-08-29 (builder direction)
  - docs/reference/DEPLOY.md §SANDBOX 0827 (engine.132 bench numbers)
  - docs/SIM_DOCTRINE.md rules 1, 2, 3
  - supermemory sl-godworld MyjiSRqBV5v9C7qmkzHRxB (engine.132 bench-proven)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[research/2026-08-27-cascade-loop-closure-design]] — the why, protected; this plan is the mechanism"
  - "[[reference/DEPLOY]] — bench + Groundhog loop"
  - "[[SIM_DOCTRINE]] — read before touching"
  - "[[index]] — registered"
---

# City Health System Plan

**Goal:** The city illness rate sits at a low real baseline and rises only when the seasonal events the weather engine already fires strain it; the neighborhoods split that rate unevenly from their own canon data; a hood crossing the threshold puts named citizens in the story.

**Architecture:** Fix-or-fold inside the existing illness path — three functions, no new engine. `applyDemographicDrift_` gets a baseline attractor; the existing seasonal pushes become bumps the attractor pulls back instead of a ratchet, and the salient weather events (frost, storm, flood, heat) are the waves. `updateNeighborhoodDemographics_` allocates the city rate across hoods by structural weight, normalized so the hood aggregate lands inside the city envelope. `applyStorySeeds_` health seed keys off the hoods that crossed, carrying the citizens who lived it. Engine.132's relief wire and convergence stay as the repair side.

**Terminal:** engine/sheet

**Pointers:**
- Prior work: engine.71 CR-1 (`b21f01f0`, per-hood causes), engine.102 W2b/W3/W4 (config keys, hood-dose, hospital talk-back), engine.132 (`95a7359a`, relief + convergence, bench-proven 0827 C108–C110)
- Related rows: engine.106 (do NOT restore the city-wide illnessRate read into crisis arcs — this plan doesn't), engine.132 (this plan supersedes its target math; ships as one wave with it)
- Wiring cards pulled 2026-08-29 for `updateNeighborhoodDemographics_` and `S.demographicDrift.illnessRate` — findings folded into §Blast radius

**Acceptance criteria:**
1. On the bench, `World_Population.illnessRate` descends from 0.1023 toward `illnessBaseline` over ≥8 cycles with no wave active — a story-scale recovery, not a snap (no single cycle moves more than `illnessAttractorPull` × gap).
2. With no salient weather event, the rate holds within ±1pp of `illnessBaseline` (winter sits at the high side — honest seasonal offset) and never trends monotonically over 5 consecutive cycles — the ratchet is gone (attractor pull at 1pp gap > worst ordinary-cycle push sum; proven in a unit test, then on the bench).
3. Hood Sick rates are **uneven**: max/min hood rate ≥ 1.4 at convergence, AND Σ hood Sick ≤ cityRate × Σ hood pop + 2pp (inside the envelope, never a flat copy).
4. A salient weather event on the bench (storm / flood / heat wave — the weather engine's own dice; a bench-only `weatherFrontTracking` nudge if none lands in the proving window) lifts the city rate by `illnessEventStrain`, the attractor pulls it back over the following cycles, and the event's hoods run hotter than their structural share while it lasts.
5. A hood crossing `illnessSupportThreshold` produces ≥1 `[Health]` LifeHistory event on a citizen IN that hood within `illnessSupportCycles`, and that cycle's HEALTH story seed names the crossing hood(s) — never a hardcoded `'Temescal'` — and carries those citizens' names.
6. `scripts/cascadeAudit.js` passes with the envelope assertion replacing the ±2pp flat-convergence assertion; 0 new `Engine_Errors` across the proving fires.

---

## Decisions (mechanism — stated, not forked)

**D1 — What determines a wave: the seasonal events the weather engine already fires. No new roll, no new actor.** *(revised 2026-08-29 on builder direction: don't let the health path become its own beast; health is a reactor to the seasons, not a driver.)*
`applyWeatherModel_` already rolls the seasons and fires typed events — `first_frost` (freeze warning / arctic outbreak), `first_snow`, `storm`, `flood_conditions`, `heat_wave` / `heat_wave_declared`, `first_warm_day` — with the salient three (storm, flood, heat; `applyWeatherModel.js:1121,1168,1221`) carrying `hoods`. That is the wave engine; it exists. Illness reacts to it: a salient event adds `illnessEventStrain` to the city rate that cycle (a real bump, not a +0.0002 nudge), and the attractor (D2) pulls it back over the following cycles — the decay tail IS the wave. At hood level `updateNeighborhoodDemographics_` already multiplies heat and flood hoods (`:172-178`); storm joins that table. Cold-season firsts (`first_frost`, `first_snow`) are city-wide pushes with no hood scope — a freeze strains everyone.

The calendar pressures the drift already knows (winter, fog, gathering holidays, First Friday, low comfort, low econ mood) stay exactly where they are and at their size — with an attractor under them they are bumps that decay instead of a ratchet. Zero-event cycles are the normal cycle. No wave state, no carry-forward, no origin-hood config: the weather engine owns what fires and where.

Parked, captured in the cascade doc: chaos cars as a season-reactor too (it already reads `S.weatherEvents` at `chaosCarsEngine.js:633`) — not this plan.

**D2 — The ticker: a baseline attractor, employment's own pattern.**
`applyDemographicDrift_` already does this for employment (`employmentAttractor` 0.90, `applyDemographicDrift.js:83`). Illness never had one — its base term is `(rng() − 0.6) × 0.0004` (mean −0.00004/cycle) against nudges of +0.0002 each, so any single pressure overwhelms the pull and the number only goes up: 0.05 default → 0.1023 live at C104 → 0.111 on the 0814 bench at C115. New: `ill += (illnessBaseline − ill) × illnessAttractorPull` each cycle. The nudges stay; the attractor now beats their average (equilibrium sits at baseline + avg push / pull ≈ +0.25pp, winter a little higher) and only a salient event moves the number visibly. Hospital talk-back (W4) stays — a census over capacity is ground talking back, a real cause, and it is bounded by the same attractor.

The descent from 10.2% is **story** (initiatives-are-the-repair doctrine): at pull 0.12/cycle the city takes ~15 cycles to reach 4.5% — long enough to be covered, short enough that crons see it.

**D3 — The envelope: population-weighted normalization in `updateNeighborhoodDemographics_`.**
Same shape W2a used for migration (`inflowModSum` normalization). Per hood: `w_h = structural_h × event_h`, `w̄ = Σ(w_h × pop_h) / Σ pop_h`, `expectedSick_h = pop_h × cityRate × (w_h / w̄)`. Σ expectedSick = cityRate × Σ pop exactly (modulo rounding) — the city number is an envelope the hoods fill unevenly, never 22 copies of one rate.

*Structural weights come from full-coverage layers only* (verified 22/22 populated on live C104):
- age mix — seniors share vs city seniors share (ND `Seniors / pop`)
- density proxy — `Neighborhood_Map.NoiseIndex` (2.28–13.31, 22/22)
- income — `Neighborhood_Map.MedianIncome` inverse (32,770–114,491, 22/22)
Each enters as a bounded multiplicative factor around 1.0. **Not** `HousingPressure` (8/22 nonzero — a half-populated weight silently flattens the spread). **Not** `Business_Ledger` healthcare presence — the ledger is the tracked ~0.25% subset and its gaps are design; "no tracked clinic row" would be read as "no healthcare", the denominator error the standing memory forbids. Canon health institutions already reach illness through `S.initiativeHealthRelief` (engine.132).

*Event weights* are the existing same-cycle causes, unchanged in kind: heat wave / flood (engine.70), QoL (Phase3-Crime), and storm joining heat/flood in the salient-event table.

*Relief applies after normalization*, not inside the weights. The direction says hoods fall "**within**" the city rate — a ceiling, not an identity. Inside the weights, Temescal's clinic would push its patients' share onto Downtown; that is a bookkeeping artifact, not a cause. After normalization, a delivering clinic pulls its hood under its share and the aggregate sits under the envelope — engine.132's relief arithmetic survives in shape, and city-level recovery flows through D2's attractor.

*Clamp re-derived, not inherited.* The `[0.75, 1.5]` bound is a flat-era artifact (engine.71 sized it for weather + QoL nudges). Structural spread is bounded on `w_h` at `[0.5, 2.0]` before normalization; the post-normalization ratio is whatever the data says.

*Convergence stays* at engine.132's 25%/cycle, floor 3.

*Calibration on the live C104 fixture (Task 3):* age linear, density and income at 0.35 gain, sub-factors clamped [0.6, 1.6] → max/min 2.08 at convergence. Chinatown 1.48 (dense, older, modest income) … Rockridge 1.16 (oldest, rich) … Temescal 0.77 … Jack London 0.72, Baylight 0.71 (young, rich). Gains are code constants; the product clamp is config.

**D4 — The threshold wire: absolute thresholds, faces in the seed.**
Every consumer's threshold is absolute (`illnessSupportThreshold` 0.08 in `checkHealthEvent_`; seeds 0.06/0.08; stink-scanner ≥8%) and every one of them is **saturated today** at a 10.2% city rate — the seed fires every cycle, the scanner always has a candidate. A ~3.5% baseline restores signal to all of them without touching them, and structurally vulnerable hoods cross an absolute bar more easily — uneven hurt, doctrine rule 3. `checkHealthEvent_` already keys the dose off the hood rate with the W3 support floor above threshold; it is left alone.

What changes is the story side. `applyStorySeeds.js:1391-1399` hardcodes `'Temescal'` for any city rate > 0.08 — invented specificity, the class engine.71 killed in crisis buckets. New: the seed reads `S.neighborhoodDemographics` for the hoods at/over threshold this cycle and `S.generationalEvents` (tag `Health`, `applyMilestone_` carries `popId` + `neighborhood`) for the citizens in those hoods, and names both. No hoods over threshold → no health seed. Crisis buckets get **no new illness channel** — its hospital channel picks up a wave's admissions by construction; if the bench proves it misses, that becomes a question, not a build.

**D5 — No new state.** Nothing carries between cycles that doesn't already: `weatherFrontTracking` (weather engine) and `World_Population.illnessRate` (the sheet) hold everything the reaction needs. *(Revised 2026-08-29 — the wave-state carry from the first draft is gone with the roll.)*

**D6 — Config keys, self-armed.** New physics literals go to `World_Config` via `cfgNum_` (loud on missing, engine.102 W2b pattern), self-armed by code the engine.94 way (`engine94SheetContract.js`) so a fresh bench arms itself:

| key | default | role |
|---|---|---|
| `illnessBaseline` | 0.035 | the ticker's resting level |
| `illnessAttractorPull` | 0.12 | fraction of the gap closed per cycle |
| `illnessEventStrain` | 0.015 | city-rate bump per salient weather event that cycle |
| `illnessHoodWeightMin` / `Max` | 0.5 / 2.0 | structural clamp before normalization |

Defaults are tuning, not truth — retune from bench evidence; cheap to retune in-world later without a commit.

**D7 — Ships as one wave with engine.132.** Engine.132 alone, pushed live now, would drag every hood toward the 10.2% target over ~5 cycles — that is the grind the direction rejects, made visible. Both changes touch the same function; both prove on the same bench; they go live as one diff behind one smoke. Engine.132's live push is therefore **held for this plan**, not for the standing wave's smoke alone.

---

## Blast radius (from the wiring cards, 2026-08-29)

**Files that change**
| file | change |
|---|---|
| `phase03-population/applyDemographicDrift.js` | D2 attractor + D1 salient-event strain; existing nudges and talk-back unchanged — **done `01a1549e`** |
| `phase02-world-state/loadNeighborhoodState.js` | +`noiseIndex`, +`medianIncome` on `S.neighborhoodState` (the D3 structural layers; found missing at Task 3) — **done** |
| `phase03-population/updateNeighborhoodDemographics.js` | D3 `buildHoodIllnessWeights_` + envelope allocation; storm joins the salient table; relief post-normalization; clamp re-derived; publishes `S.neighborhoodIllnessWeights` — **done** |
| `phase07-evening-media/applyStorySeeds.js` | D4 health seed — crossing hoods + faces, `'Temescal'` hardcode removed — **done** |
| `phase01-config/engine94SheetContract.js` + `godWorldEngine2.js:220` | `ENGINE133_CONFIG_SEEDS` + `ensureEngine133Config_` (sibling list, engine.94's fourteen stay exact) wired after the engine.94 contract — **done** |
| `scripts/cascadeAudit.js` | `sick-rate-band` → envelope (−3pp relief … +2pp lag); new `sick-rate-spread` (max/min ≥ 1.3); ≥8% support rule unchanged — **done** |
| `docs/engine/ENGINE_STUB_MAP.md` | regen same commit — **done** (183 files / 1173 fns) |
| tests | `scripts/illnessEnvelope.test.js` 23/23; `hospitalTalkback.test.js` attractor zeroed to isolate W4 (24/24); `engine94SheetContract.test.js` 24/24 — **done** |

**Readers that do NOT change (verified live-wired, thresholds stay absolute)**
- `generationalEventsEngine.js:1270 checkHealthEvent_` — hood-rate dose + W3 floor; gets real signal back
- `buildMediaPacket.js:64` — display
- `utilities/cycleModes.js:328` — hash input
- `scripts/buildWorldSummary.js`, `stink-scanner.js`, `buildCivicVoicePackets.js`, `buildJaxSlice.js`, `buildInitiativePackets.js`, `buildNeighborhoodCards.js` — read the sheet columns, no threshold change

**Dead readers (not touched, noted so nobody "fixes" them into life)**
- `eventArcEngine.js:176` (no callers), `mediaRoomBriefingGenerator.js:222` (phantom `S.illnessRate`, caller commented out), `processArcLifeCyclev1.js:213-270` (caller commented out)

**Map gaps surfaced by the cards, logged not fixed here**
- `ENGINE_STUB_REVERSE.json` lists `Neighborhood_Demographics` writers as `[]` — misses `batchUpdateNeighborhoodDemographics_` (SHEETS_MANIFEST `:121` has it)
- `S.demographicDriftFactors` is read at Phase3 (`updateNeighborhoodDemographics.js:68`) but written at Phase8 — a same-cycle order gap; the read only ever sees last cycle (currently unused by the illness math — irrelevant to this plan; recorded here, no separate gap log exists for engine)
- `S.demographicShiftsCount` — orphaned write

**Hood identity (builder question 2026-08-29):** this plan adds no hood list. D3 iterates the loaded ND set (W2a pattern), D4 reads `S.neighborhoodDemographics`, and the `'Temescal'` literal leaves `applyStorySeeds.js`. The codebase-wide count (25 files declaring their own hood list/table, 70 naming Temescal literally, no engine-side loader off `Neighborhood_Map`) is filed as engine.134.

**Phase order (both entry points):** Phase2-InitiativeEffects → Phase2-Weather → Phase3-Population → Phase3-Demographics (D1/D2) → Phase3-Crime → Phase3-NeighborhoodDemo (D3) → … Phase5-Generational (`checkHealthEvent_`) → Phase7-StorySeeds (D4) → Phase10. Every read this plan adds is upstream-written in the same cycle.

---

## Tasks

1. ✅ `799b09d8` **Unit test first** — `scripts/illnessEnvelope.test.js`: (a) attractor inequality at 0.5pp gap vs max ordinary pressure; (b) envelope sum; (c) spread ≥1.4 on the live C104 hood data as fixture; (d) relief post-normalization never lifts the aggregate above the envelope.
2. ✅ `01a1549e` `applyDemographicDrift.js` — D2 attractor + D1 salient-event strain.
3. ✅ `updateNeighborhoodDemographics.js` — D3 (+ `loadNeighborhoodState.js` layers).
4. ✅ Self-arm D6 keys.
5. ✅ `applyStorySeeds.js` — D4 (verify `applyMilestone_` output carries `popId` + `neighborhood` before wiring; if not, that is the one-line fix that goes first).
6. ✅ `cascadeAudit.js` — envelope/spread assertions.
7. ✅ `/stub-engine` regen; commit with the caller-graph findings in the message.
8. Bench: 0827, deployment @5 = `799fd841` + engine.132 diff + this diff. Groundhog fires until criteria 1–6 hold (ran C111–C120; any bench-only nudge logged in DEPLOY.md). ✅
9. Live: one smoke behind the standing wave; engine.132 + this as one diff. NEXT line + DEPLOY.md updated.

## Next — the other side of this plan (builder direction 2026-08-29, next session)

Illness was the first half. The same shape is still flat on the employment side, and the hood layer has no economic depth to weight from:

1. **Employment city → hoods, same envelope.** `updateNeighborhoodDemographics.js:220-228` today: `expectedUnemployed = adults × (1 − employmentRate)`, ±3/cycle — one city number copied 21 times, exactly the pre-engine.133 illness shape. Fix-or-fold: population-normalized hood weights from the hood's own canon (income, `Business_Ledger` employer depth, sector mix), Σ hood unemployed inside the city envelope, uneven; employment already has its attractor (`employmentAttractor`), so no ticker work.
2. **Business_Ledger depth — grok's 72-row six-per-hood fill.** Inbox: `docs/for-claude-review/2026-08-29-grok-business-ledger-hood-fill.md` (verdict adopt; live append after Mike signs off the names; 5 hoods at 0 rows today, so any employer-weighted envelope is blind there until it lands). Accept flow per the inbox README: move to `docs/research/`, register, file the row.
3. **Alignment with kimi's casino-ledger record** (`docs/for-claude-review/2026-08-29-kimi-casino-ledger.md`): stake caps key off citizen/hood economics, and the S361 trace found the wealth scale real-world-calibrated — honest hood employment + employer depth is upstream of that design, not parallel to it.

Filed as engine.135 (ROLLOUT). Same discipline as this plan: wiring cards first, unit test before code, bench before live.

## Changelog
- 2026-08-29 — Plan written (S396 engine-sheet) from the builder direction of 2026-08-29 + two wiring cards + live C104 read.
- 2026-08-29 (15:10) — Live cycle runs 2026-08-30: DEPLOY.md §LIVE checklist rewritten to deploy → cell → cycle (Mike-direct). §Next added — employment envelope + Business_Ledger depth (engine.135), aligned with kimi's casino-ledger record.
- 2026-08-29 — **Bench-proven, SANDBOX 0827 @5/@6, C111–C126.** Criteria: (1) ✅ descent 0.0518 → 0.0405 over 9 cycles, attractor arithmetic exact, no snap; (2) ✅ 0.55pp above baseline at C119 and still converging, no upward drift; (3) ✅ spread 2.56 at C119, aggregate inside the envelope every cycle; (4) ⚠️ unit-proven only (A3) — no salient weather event fired in 9 bench cycles; (5) ✅ bench-proven C122–C125 with the bar lowered bench-only to 0.055: 8 Chinatown `[Health]` events in 4 cycles (floor → dose → milestone), severities shifted; seed half proven in test block C (same `S.generationalEvents` objects); (6) ✅ cascadeAudit PASS ×3 against the bench. **The live deploy's one data write:** `World_Population!illnessRate` ← hood-lived aggregate (live: 0.0518), so the hoods do not chase the ratchet number — Mike's call at the live gate (his pushback on the manufactured-pandemic arc, same day). Numbers: [[../reference/DEPLOY]] §SANDBOX 0827.
- 2026-08-29 — **Deploy trajectory, simulated coupled from live C104 state** (drift → hoods chained, winter pushes, no salient events; `scratchpad/transition.js` off the test harness): the flat ~5.2% hood residue RISES into a visible wave while the city ticker falls — peak C108–109 with 7 hoods ≥ 8% (Chinatown 10.4%, Piedmont Ave 8.9%, Ivy Hill 8.7%), 18 hoods ≥ 6%; priority-3 crossing seeds C106–C118; no hood ≥ 8% from C119; city 4.4% and one hood ≥ 6% by C124 (20 cycles). The audit `sick-rate-band` trips −3.2pp on C105 only (named in its note). This is the mechanism working on honest numbers (doctrine rule 8) — the hoods finally live the 70-cycle 10% the city has carried — and it is the forecast to carry into the gate report. Bench fires needed for criteria 1–6: ~15 (descent) — the sim replaces the earlier guess.
- 2026-08-29 — Pre-bench checks: `auditFunctionCollisions` 0/1152; SHEETS_MANIFEST §9 row added for the `engine94SheetContract.js` World_Config self-arm (missing since engine.94).
- 2026-08-29 — Tasks 1–7 built and committed (`799b09d8`, `01a1549e`); suite 183/184 (djDirect = pre-existing fixture gap). Bench (Task 8) is the next gate.
- 2026-08-29 — D1 revised on builder direction (same session): no outbreak roll; illness reacts to the weather engine's seasonal events. D5 wave-state carry dropped; D6 shrinks to four keys. Hood-identity finding filed as engine.134.
