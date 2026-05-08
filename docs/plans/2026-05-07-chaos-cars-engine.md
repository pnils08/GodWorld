---
title: Chaos Cars Engine Plan
created: 2026-05-07
updated: 2026-05-07
type: plan
tags: [engine, architecture, draft]
sources:
  - docs/engine/ROLLOUT_PLAN.md §"IDEAS: Arc engine grafts + typed municipal-vehicle character system + micro-event overlap detection" (S190 entry, line 107) — Pattern C source
  - output/drive-files/GodWorld_Escalation_Engine_v1.0.txt (DeepSeek v1, rejected as-is — patterns kept)
  - output/drive-files/Micro_Event_Generator_v2.0.txt (DeepSeek v2, rejected as-is — flavor-set quality kept)
  - docs/plans/2026-05-07-engine-routing-foundation.md (consequenceFloor integration target — Phase 5 cascade)
  - docs/adr/0003-skills-as-shared-infrastructure.md (friction-log pattern this plan follows)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout; replaces line 107 Pattern C entry with pointer to this plan"
  - "[[plans/2026-05-07-engine-routing-foundation]] — sibling plan; chaos_cars Tier-1 cascade triggers Engine A's consequenceFloor flag"
  - "[[adr/0003-skills-as-shared-infrastructure]] — friction-log pattern applies to /chaos-dryrun + future chaos-related skills"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — register in same commit"
---

# Chaos Cars Engine Plan

**Goal:** Build a stochastic event-injection engine — typed municipal vehicles producing high-magnitude metric swings + emergent severe events on existing simulation surfaces — to break the cookie-cutter equilibrium that compounds across editions and force the simulation to react to disruption it didn't plan for.

**Architecture:** New `Chaos_Cars` sheet holds per-event source rows. New phase (Phase 4, sibling to existing event generators) fires a variable count of events per cycle (3–15 starter range). Each event = random vehicle × random target × dice roll across vehicle-typed outcome pool. Effects write to scope-appropriate existing ledgers (`Simulation_Ledger.LifeHistory_Log`, `Business_Ledger`, `Neighborhood_Map`) — chaos_cars ledger is source-of-truth, scope writebacks make the chaos visible to existing systems. Asymmetric decay (positive metric swings revert fast, negative linger) compounds toward dysfunction by design. When a Tier-1 citizen is hit, full canon cascade fires — world_summary tagging, voice-agent pending_decisions auto-populate, Storyline_Tracker arc creation, routing plan's `consequenceFloor` flag forces front-page coverage.

**Terminal:** research-build (vehicle config table design + decay rule design + canon cascade wiring) + engine/sheet (engine implementation + sheet creation + Phase 4 wiring + writebacks).

**Pointers:**
- Prior framing: ROLLOUT_PLAN S190 entry Pattern C (typed municipal-vehicle character system) + Pattern B (scoped microevent generator) + Pattern D (overlap detection — deferred from this plan, picks up after Phase 6 ships).
- Companion: routing plan's Engine A `consequenceFloor` flag is the integration point for Tier-1 chaos cascades (Phase 5 of this plan).
- Anti-cookie-cutter framing: chaos engineering / antifragility principle (S205 grill, Mike's research-source). Engine-side analog of Jax Caldera — agent destabilizes through perspective, engine destabilizes through event.

**Acceptance criteria:**

1. `Chaos_Cars` sheet exists with schema (T1.1 column list); rows populate after each live cycle run.
2. Cycle produces 3–15 chaos events; sample of 5+ live cycles shows variety across all 10 vehicle types (no single type dominating > 30%).
3. Effects write to scope-appropriate ledgers — citizen events appear in `Simulation_Ledger.LifeHistory_Log` column, business events in `Business_Ledger` metric columns, neighborhood events in `Neighborhood_Map` metric columns. chaos_cars ledger is the source row for every effect.
4. **Universal constraint enforced:** zero death-class outcomes (`death`, `died`, `fatal`, `kill`, `killed`) across 5+ live cycles. Validator throws if any vehicle config contains a forbidden outcome string.
5. **Tier-1 cascade test:** synthetic Tier-1 hit (forced via dry-run script) produces all four cascade outputs: (a) `world_summary_c{XX}.md` carries scandal/event entry, (b) all voice agents' `pending_decisions.md` auto-populated next cycle with chaos-event reaction prompt, (c) new `Storyline_Tracker` row created with arc state, (d) routing plan Engine A `consequenceFloor: true` set on the auto-generated seed.
6. **Asymmetric decay observable:** positive metric swings (ice cream → mood UP) revert toward baseline within 1–2 cycles; negative swings (garbage → mood DOWN, cop → crime UP) persist 3–5+ cycles. Measurement script T6.2 confirms.
7. Frequency stays within 3–15 bound across 5 dry-run cycles. No cycle produces 0 events; no cycle exceeds 15.

---

## Tasks

Tasks numbered T<phase>.<idx>. Each is 2–5 min focused work unless flagged DESIGN (judgment-heavy, longer). Terminal tag in [brackets].

### Phase 1 — Foundation

#### T1.1: Define chaos_cars ledger schema [research-build]

- **Files:**
  - `docs/plans/2026-05-07-chaos-cars-engine.md` (this file) — modify §Schema appendix below Open Questions
- **Steps:**
  1. Document column list. Initial schema:
     ```
     A: CycleId
     B: EventId (uuid8)
     C: VehicleType (e.g., "cop_car", "ice_cream_truck")
     D: TargetScope (citizen | business | neighborhood)
     E: TargetId (POP-XXXXX | BIZ-XXXXX | neighborhood name)
     F: TargetTier (1-4 for citizens; null otherwise)
     G: DiceOutcome (e.g., "ticket", "arrested", "helped")
     H: PrimaryMetric (e.g., "neighborhood_mood", "crime", "business_profit")
     I: MetricMagnitude (signed integer, large by design)
     J: ConsequenceFloorFired (TRUE | FALSE — true when Tier-1 cascade triggered)
     K: ChaosNarrativeSeed (one-line text, optional, for desk packets)
     L: TimestampUtc
     ```
  2. Confirm column letters match the order; engine-sheet may revise positions during T1.3 sheet creation.
- **Verify:** schema appendix in this plan committed; engine-sheet reads it for T1.3.
- **Status:** [ ] not started

#### T1.2: Resolve Phase placement decision [research-build]

- **Files:**
  - `docs/plans/2026-05-07-chaos-cars-engine.md` — resolve Open Question Q1
- **Steps:**
  1. Read `phase04-events/` files (existing event generators) to confirm chaos_cars fits as sibling.
  2. Confirm chaos_cars fires AFTER `applyDemographicDrift` (Phase 3) but BEFORE `applyEditionCoverageEffects` and any Phase 6 arc/hook engines — chaos events should be visible to Phase 6 storyline engine for arc creation in same cycle.
  3. Recommendation: **Phase 4 sibling** — joins `generateGenericCitizenMicroEvent`, `generateGameModeMicroEvents`, `generationalEventsEngine`. Engine-sheet may revise during T1.4 wiring if dependency ordering forces Phase 4.5.
  4. Delete Open Question Q1, replace with decision in §Hard Constraints.
- **Verify:** Q1 closed; decision recorded.
- **Status:** [ ] not started

#### T1.3: Create Chaos_Cars sheet [engine/sheet]

- **Files:**
  - Apps Script: manual sheet creation (service account cannot create spreadsheets per CLAUDE.md gotchas)
  - `schemas/SCHEMA_HEADERS.md` — regen via `utilities/exportSchemaHeaders.js` after creation
- **Steps:**
  1. Create `Chaos_Cars` tab in the live spreadsheet.
  2. Add header row matching T1.1 schema (12 columns A-L).
  3. Run `node scripts/exportSchemaHeaders.js` to refresh SCHEMA_HEADERS.md.
- **Verify:** SCHEMA_HEADERS.md shows `Chaos_Cars` 12-column entry.
- **Status:** [ ] not started

#### T1.4: Universal no-death constraint [engine/sheet]

- **Files:**
  - `lib/chaosCarsConfig.js` — create
- **Steps:**
  1. Define `FORBIDDEN_OUTCOMES = ['death', 'died', 'dying', 'fatal', 'killed', 'kill', 'deceased', 'dead']`.
  2. Implement `validateOutcome_(outcomeText)` — throws `Error('chaos_cars: forbidden outcome detected: ' + matched)` if any forbidden token appears (case-insensitive substring match).
  3. Export validator for use in Phase 2 config-loading + Phase 3 dice roll.
- **Verify:** unit test in file footer — feed `'died in accident'` → throws; feed `'minor injury'` → returns true.
- **Status:** [ ] not started

---

### Phase 2 — Vehicle config table

#### T2.1: Per-vehicle config schema [research-build]

- **Files:**
  - `lib/chaosCarsConfig.js` — modify
- **Steps:**
  1. Define `VEHICLE_CONFIG_SCHEMA`. Per-vehicle entry shape:
     ```javascript
     {
       name: 'cop_car',
       displayName: 'Cop car',
       scopes: ['citizen'],                    // which target scopes this vehicle hits
       baseFrequencyWeight: 1.0,               // multiplier for picker probability
       textureOutcomes: [
         { outcome: 'ticket',           weight: 0.5, severity: 'low' },
         { outcome: 'arrested',         weight: 0.15, severity: 'high' },
         { outcome: 'helped_by_police', weight: 0.35, severity: 'low' }
       ],
       metricImpacts: [
         { metric: 'crime', direction: 'up', magnitudeRange: [3, 8] }
       ]
     }
     ```
  2. `loadConfig_()` returns array of all vehicle entries.
  3. Add validation step — every textureOutcomes entry's `outcome` field passes `validateOutcome_` from T1.4.
- **Verify:** unit test — load config, all entries pass schema validation.
- **Status:** [ ] not started

#### T2.2: Vehicle config table — DESIGN PASS [research-build]

- **Files:**
  - `lib/chaosCarsConfig.js` — modify (full vehicle table)
- **Steps:**
  1. **DESIGN — Mike + Mags one-shot pass.** Fill in all 10 vehicles per S190's locked list:
     - cop_car, fire_engine, ambulance, oari_van, building_inspector, garbage_truck, mail_truck, ice_cream_truck, street_sweeper, pge_truck
  2. Per vehicle: scopes, baseFrequencyWeight, 2-3 texture outcomes with weights, 1-2 metric impacts with magnitude ranges.
  3. Decay direction encoded in metric impact `direction` field: `up` for positive (ice cream → mood up), `down` for negative (garbage → mood down). Decay rates set in Phase 4 (T4.1).
  4. **OARI van canon-anchor (S190):** OARI textureOutcomes must include a `coverageContribution` boolean field that signals to Phase 5 cascade — every OARI call is evidence for the C95 D2 expansion vote.
  5. Save config; commit DESIGN PASS.
- **Verify:** all 10 vehicles populated; config validates against schema; OARI van entry has `coverageContribution` field on at least one outcome.
- **Status:** [ ] not started — **BLOCKS T3.x until complete**

---

### Phase 3 — Generator

#### T3.1: Variable event count picker [engine/sheet]

- **Files:**
  - `phase04-events/chaosCarsEngine.js` — create
- **Steps:**
  1. Implement `pickEventCount_(rng)` returning random integer in [3, 15] using `ctx.rng` (NEVER `Math.random()` per engine.md rules).
  2. Constants `MIN_EVENTS = 3`, `MAX_EVENTS = 15` exported for tuning.
- **Verify:** unit test 1000 calls — all results in [3, 15], distribution roughly uniform.
- **Status:** [ ] not started

#### T3.2: Random vehicle picker [engine/sheet]

- **Files:**
  - `phase04-events/chaosCarsEngine.js` — modify
- **Steps:**
  1. Implement `pickVehicle_(rng, config)` returning vehicle entry weighted by `baseFrequencyWeight`.
  2. Use weighted-sample-without-replacement pattern.
- **Verify:** unit test 1000 calls — distribution within ±10% of weights.
- **Status:** [ ] not started

#### T3.3: Random target picker (citizen scope) [engine/sheet]

- **Files:**
  - `phase04-events/chaosCarsEngine.js` — modify
- **Steps:**
  1. Implement `pickCitizenTarget_(rng, ctx)` reading `ctx.ledger.rows` (post-Phase 42 §5.6 redesign).
  2. Random uniform across all citizens regardless of Tier (per Mike S205 — full random, no tier protection).
  3. Returns `{ popId, tier, neighborhood }`.
- **Verify:** unit test against synthetic ctx.ledger — 1000 calls produce all tier ranges proportional to ledger composition.
- **Status:** [ ] not started

#### T3.4: Random target picker (business scope) [engine/sheet]

- **Files:**
  - `phase04-events/chaosCarsEngine.js` — modify
- **Steps:**
  1. Implement `pickBusinessTarget_(rng, ctx)` reading from `Business_Ledger` via shared in-memory cache or direct read.
  2. Returns `{ bizId, sector, neighborhood }`.
- **Verify:** unit test produces real BIZ-IDs from synthetic Business_Ledger fixture.
- **Status:** [ ] not started

#### T3.5: Random target picker (neighborhood scope) [engine/sheet]

- **Files:**
  - `phase04-events/chaosCarsEngine.js` — modify
- **Steps:**
  1. Implement `pickNeighborhoodTarget_(rng, ctx)` reading from `Neighborhood_Map` rows.
  2. Returns `{ neighborhoodName, currentMood, currentCrime }`.
- **Verify:** unit test produces real neighborhood names.
- **Status:** [ ] not started

#### T3.6: Dice-roll outcome [engine/sheet]

- **Files:**
  - `phase04-events/chaosCarsEngine.js` — modify
- **Steps:**
  1. Implement `rollOutcome_(rng, vehicle)` weighted-sample from `vehicle.textureOutcomes`.
  2. Run `validateOutcome_` from T1.4 on result before returning.
  3. Returns `{ outcome, weight, severity, coverageContribution? }`.
- **Verify:** unit test 1000 calls per vehicle; distribution within ±10% of weights; no forbidden outcomes ever returned.
- **Status:** [ ] not started

#### T3.7: Magnitude sampler [engine/sheet]

- **Files:**
  - `phase04-events/chaosCarsEngine.js` — modify
- **Steps:**
  1. Implement `sampleMagnitude_(rng, metricImpact)` returning random integer within `magnitudeRange`.
  2. Apply `direction` sign — `down` returns negative magnitude.
- **Verify:** unit test — `[3,8]` up returns positive in range; `[3,8]` down returns negative in range.
- **Status:** [ ] not started

#### T3.8: Citizen LifeHistory writeback [engine/sheet]

- **Files:**
  - `phase04-events/chaosCarsEngine.js` — modify
- **Steps:**
  1. Implement `writeCitizenEvent_(ctx, target, vehicle, outcome, magnitude)` using `queueAppendIntent_` (Phase 42 patterns) to LifeHistory_Log.
  2. Row format: `[cycle, popId, eventType='chaos_cars', vehicleType, outcome, magnitude, narrativeSeed]`.
- **Verify:** dryRun shows queued LifeHistory_Log row matching shape.
- **Status:** [ ] not started

#### T3.9: Business writeback [engine/sheet]

- **Files:**
  - `phase04-events/chaosCarsEngine.js` — modify
- **Steps:**
  1. Implement `writeBusinessEvent_(ctx, target, vehicle, outcome, magnitude)`.
  2. Update relevant Business_Ledger metric column (e.g., `Annual_Revenue` for profit-loss outcomes, `Employee_Count` for churn).
  3. Use `queueCellIntent_` per Phase 42.
- **Verify:** dryRun shows queued Business_Ledger update.
- **Status:** [ ] not started

#### T3.10: Neighborhood writeback [engine/sheet]

- **Files:**
  - `phase04-events/chaosCarsEngine.js` — modify
- **Steps:**
  1. Implement `writeNeighborhoodEvent_(ctx, target, vehicle, outcome, magnitude)`.
  2. Update relevant Neighborhood_Map metric column (mood, crime, etc. per `metricImpacts`).
  3. Use `queueRangeIntent_` per Phase 42.
- **Verify:** dryRun shows queued Neighborhood_Map update.
- **Status:** [ ] not started

#### T3.11: chaos_cars ledger row writer [engine/sheet]

- **Files:**
  - `phase10-persistence/saveChaosCars.js` — create
- **Steps:**
  1. Implement append to `Chaos_Cars` sheet using `queueAppendIntent_`.
  2. Row schema matches T1.1 12-column spec.
  3. Called once per generated event from T3.x orchestrator.
- **Verify:** dryRun shows queued Chaos_Cars row matching schema.
- **Status:** [ ] not started

#### T3.12: Phase 4 orchestrator [engine/sheet]

- **Files:**
  - `phase04-events/chaosCarsEngine.js` — modify (top-level entry)
- **Steps:**
  1. Implement `runChaosCarsEngine_(ctx)`:
     ```javascript
     var n = pickEventCount_(ctx.rng);
     for (var i = 0; i < n; i++) {
       var vehicle = pickVehicle_(ctx.rng, config);
       var scope = pickFromArray_(ctx.rng, vehicle.scopes);
       var target = pickTargetByScope_(ctx.rng, ctx, scope);
       var outcome = rollOutcome_(ctx.rng, vehicle);
       var impact = pickFromArray_(ctx.rng, vehicle.metricImpacts);
       var magnitude = sampleMagnitude_(ctx.rng, impact);
       writeByScope_(ctx, target, vehicle, outcome, magnitude, scope);
       writeChaosCarsRow_(ctx, /* full event payload */);
     }
     ```
  2. Append to `ctx.summary.chaosCarsEvents` array for downstream Phase 5 consumers.
- **Verify:** unit test invokes orchestrator with synthetic ctx; produces N events with all writebacks queued; events array populated.
- **Status:** [ ] not started

#### T3.13: Wire into godWorldEngine2 [engine/sheet]

- **Files:**
  - `phase01-config/godWorldEngine2.js` — modify
- **Steps:**
  1. Add `runChaosCarsEngine_(ctx)` call in Phase 4 alongside existing event generators.
  2. Confirm placement after `applyDemographicDrift` (Phase 3) and before Phase 6 storyline engines.
- **Verify:** live cycle dry-run shows Phase 4 chaos_cars output in `Engine_RunLog`.
- **Status:** [ ] not started

---

### Phase 4 — Asymmetric decay

#### T4.1: Per-metric decay rule table — DESIGN PASS [research-build]

- **Files:**
  - `lib/chaosCarsDecay.js` — create
- **Steps:**
  1. Define `DECAY_RULES` per metric. Initial values:
     ```javascript
     var DECAY_RULES = {
       'neighborhood_mood':   { upRevertPerCycle: 1.5,  downRevertPerCycle: 0.3 },
       'crime':               { upRevertPerCycle: 0.4,  downRevertPerCycle: 1.0 },  // crime spikes stick
       'business_profit':     { upRevertPerCycle: 1.0,  downRevertPerCycle: 0.2 },  // profit losses stick
       'business_employees':  { upRevertPerCycle: 0.0,  downRevertPerCycle: 0.0 },  // churn permanent
       'neighborhood_pulse':  { upRevertPerCycle: 1.2,  downRevertPerCycle: 0.4 }
     };
     ```
  2. Asymmetry rule: positive direction decays at 2-4× the rate of negative direction. Phase 6 tuning may adjust per-metric.
- **Verify:** rule table validates — every metric has both directions; up rate > down rate per asymmetric-decay rule.
- **Status:** [ ] not started — **BLOCKS T4.2**

#### T4.2: Decay applier engine [engine/sheet]

- **Files:**
  - `phase05-citizens/applyChaosDecay.js` — create
- **Steps:**
  1. Implement `applyChaosDecay_(ctx)`:
     - Read recent chaos_cars rows where ConsequenceFloorFired = false (Tier-1 cascades resolve via storyline arcs, not metric decay)
     - For each, compute residual swing (initial magnitude × pow(1 - decayRate, cyclesSinceEvent))
     - Apply current cycle's decay step to relevant metric column
  2. Place in Phase 5 (post-citizen-life, pre-Phase-6).
- **Verify:** unit test — synthetic chaos event from cycle N-1, run decay at cycle N, metric moves toward baseline at expected rate.
- **Status:** [ ] not started

#### T4.3: Wire decay applier into engine [engine/sheet]

- **Files:**
  - `phase01-config/godWorldEngine2.js` — modify
- **Steps:**
  1. Add `applyChaosDecay_(ctx)` call in Phase 5.
- **Verify:** live cycle log shows decay applier ran; metric swings observably decay across 3 cycles.
- **Status:** [ ] not started

---

### Phase 5 — Canon cascade (Tier-1 hits)

#### T5.1: Tier-1 hit detector [engine/sheet]

- **Files:**
  - `phase04-events/chaosCarsEngine.js` — modify (hooks into T3.12 orchestrator)
- **Steps:**
  1. After `pickCitizenTarget_` returns, check `target.tier === 1`.
  2. If Tier-1, set `event.consequenceFloorFired = true` AND append to `ctx.summary.tier1ChaosEvents` array.
  3. Tier-1 events log to chaos_cars row with column J (ConsequenceFloorFired) = TRUE.
- **Verify:** synthetic Tier-1 hit produces consequenceFloorFired=true in chaos_cars row.
- **Status:** [ ] not started

#### T5.2: World summary scandal tag [research-build]

- **Files:**
  - `.claude/skills/build-world-summary/SKILL.md` — modify
- **Steps:**
  1. After existing world-summary section, add new section reading `ctx.summary.tier1ChaosEvents` (or chaos_cars rows where ConsequenceFloorFired=true for current cycle).
  2. Render each as a "scandal/event" entry with vehicle + outcome + named target.
  3. Section header: `## Chaos Events — Cycle {XX}`.
- **Verify:** synthetic Tier-1 chaos event → world_summary contains Chaos Events section with the named entity.
- **Status:** [ ] not started

#### T5.3: Voice agent pending_decisions auto-populate [research-build]

- **Files:**
  - `.claude/skills/city-hall-prep/SKILL.md` — modify Step 2
- **Steps:**
  1. When chaos_cars Tier-1 event exists for current cycle, prepend a "Cycle Chaos Reaction" decision block to every voice's `pending_decisions.md`.
  2. Block format: `**[CHAOS CASCADE]** [Named entity] was hit by [vehicle] this cycle, outcome: [dice-rolled outcome]. Decision required: how does {voice} respond?`
  3. Reads chaos_cars rows where ConsequenceFloorFired=TRUE.
- **Verify:** city-hall-prep run with synthetic Tier-1 chaos event shows CHAOS CASCADE block in mayor's pending_decisions.md.
- **Status:** [ ] not started

#### T5.4: Storyline_Tracker arc creation [engine/sheet]

- **Files:**
  - `phase06-analysis/storylineWeavingEngine.js` — modify
- **Steps:**
  1. After existing storyline weave logic, scan `ctx.summary.tier1ChaosEvents`.
  2. For each, create new Storyline_Tracker row: `{ arcId, plantedCycle, storylineDomain, primaryActor, status='active', source='chaos_cars' }`.
  3. Use existing `queueAppendIntent_` pattern.
- **Verify:** synthetic Tier-1 chaos event → new Storyline_Tracker row appears with source='chaos_cars'.
- **Status:** [ ] not started

#### T5.5: Routing plan consequenceFloor integration [engine/sheet]

- **Files:**
  - `phase07-evening-media/applyStorySeeds.js` — modify
- **Steps:**
  1. At seed-emission time, scan chaos_cars rows for current cycle where ConsequenceFloorFired=TRUE.
  2. For each, emit a seed with:
     - `seedType: 'chaos-cascade'`
     - `priorityScore: 9.5` (force high — see routing plan T2.4)
     - `consequenceFloor: true`
     - `domain: <derived from chaos event domain>`
     - `themes: ['scandal','accountability','breaking']`
  3. Engine A's priority output already respects consequenceFloor; this just emits the seed in the first place.
- **Verify:** synthetic Tier-1 chaos event → seed deck contains a chaos-cascade seed with consequenceFloor=true and priorityScore≥9.
- **Status:** [ ] not started

---

### Phase 6 — Validation + tuning

#### T6.1: Dry-run script [research-build]

- **Files:**
  - `scripts/chaosCarsDryRun.js` — create
- **Steps:**
  1. Run a synthetic 5-cycle simulation via `runChaosCarsEngine_` against a fixture ctx with realistic ledger composition.
  2. Capture per-cycle: event count, vehicle distribution, scope distribution, outcome distribution, Tier-1 hit count.
  3. Emit `output/chaos_cars_dryrun_report.md`.
- **Verify:** report file exists; data shape matches T6.2/T6.3 input expectations.
- **Status:** [ ] not started

#### T6.2: Magnitude tuning report [research-build]

- **Files:**
  - `scripts/chaosCarsMagnitudeReport.js` — create
- **Steps:**
  1. Read 3+ live cycles' chaos_cars rows.
  2. Per metric: distribution of magnitudes, post-decay residual at cycle+1/+2/+3.
  3. Surface: "neighborhood_mood positive recovers in X cycles, negative persists Y cycles" — confirm asymmetry holds.
- **Verify:** runs against real cycle data; report shows asymmetric decay observable.
- **Status:** [ ] not started

#### T6.3: Frequency cap validator [research-build]

- **Files:**
  - `scripts/chaosCarsFrequencyCheck.js` — create
- **Steps:**
  1. Read live cycles' Engine_RunLog or chaos_cars row counts per cycle.
  2. Fail (exit 1) if any cycle has count < 3 or > 15. Else emit a one-line summary.
- **Verify:** runs against C94+ live cycles; first run passes.
- **Status:** [ ] not started

#### T6.4: Friction-log skill at orchestrator end [engine/sheet]

- **Files:**
  - `phase04-events/chaosCarsEngine.js` — modify (end-of-orchestrator)
- **Steps:**
  1. Per ADR-0003, write `output/skill_friction/chaos_cars_engine_c{XX}.md` at end of `runChaosCarsEngine_` execution.
  2. Empty file = clean run. Friction entries (e.g., target picker had to retry due to empty Business_Ledger, vehicle config had unknown metric) appended one paragraph per occurrence.
- **Verify:** live cycle produces friction file (likely empty for clean runs).
- **Status:** [ ] not started

---

## Open questions

Questions that block a task. Resolve and delete.

- [ ] **Q1 — Vehicle config table specifics (T2.2 DESIGN PASS).** All 10 vehicles need texture outcomes + weights + metric impacts + magnitudes. Mike's grill gave 3 of cop_car's outcomes (ticket / arrested / helped); other 9 vehicles need same-shape design. Single design session expected; placeholder values can ship if tuning Phase 6 surfaces issues.
- [ ] **Q2 — Decay rate calibration (T4.1).** Initial values in T4.1 are starter; real values come from observing 3-5 cycles of metric swings. Phase 6 magnitude report (T6.2) is the data path.
- [ ] **Q3 — chaos_cars + arcLifecycle interaction.** Storyline_Tracker arc creation (T5.4) opens an arc; existing `arcLifecycleEngine.js` may close it via existing rules. Need confirmation that chaos-sourced arcs interact cleanly with existing arc lifecycle (resolution / collapse). Engine-sheet finds out at T5.4 implementation; if cross-effects emerge, file a follow-up.
- [ ] **Q4 — Existing Pattern D (overlap detection) integration timing.** Pattern D (vehicle_business / citizen_vehicle / vehicle_vehicle overlap narratives) deferred from this plan. After Phase 6 ships and chaos_cars produces real cycles, decide: integrate Pattern D into chaos_cars itself (cross-event overlap inside chaos_cars), or as separate follow-up plan reading chaos_cars + existing micro-events together.

---

## Hard Constraints

(Locked from grill — non-negotiable for this plan.)

- **No death events.** Universal constraint enforced at config-load time + dice-roll time. Every textureOutcome string passes `validateOutcome_` against `FORBIDDEN_OUTCOMES`. Tier-1 hit can produce arrest, scandal, injury, disease — never death.
- **No tier protection.** Random target picker uses uniform distribution across all citizens regardless of Tier. Tier-1 hits are statistically rare (1 of ~30 Tier-1 of ~1357 citizens) but possible every cycle. Rarity is the design feature.
- **Asymmetric decay.** Positive metric swings always revert faster than negative on the same metric. Per-metric ratio is tunable (T4.1) but the inequality direction is locked.
- **Phase 4 placement.** Chaos_cars fires after Phase 3 demographic drift, before Phase 6 storyline engines, alongside other event generators. Engine-sheet may revise to Phase 4.5 if dependency ordering forces, but stays in the same phase neighborhood.
- **chaos_cars ledger is source-of-truth.** Every chaos event produces a chaos_cars row first, scope writebacks second. If a writeback fails, the source row must remain — chaos_cars row is canonical, downstream effects are derived.
- **Tier-1 hit forces full cascade.** Cannot ship cascade selectively (e.g., world_summary tag without voice-agent reaction). All four cascade outputs (T5.2/T5.3/T5.4/T5.5) must be live before Phase 5 closes.

---

## Schema Appendix

**Chaos_Cars sheet** (12 columns A-L):

| Col | Header | Type | Notes |
|---|---|---|---|
| A | CycleId | int | Cycle this event fired in |
| B | EventId | string (uuid8) | Unique per event |
| C | VehicleType | string | Snake_case from config (cop_car / ice_cream_truck / etc.) |
| D | TargetScope | enum | citizen | business | neighborhood |
| E | TargetId | string | POP-XXXXX | BIZ-XXXXX | neighborhood name |
| F | TargetTier | int|null | 1-4 for citizens; null for business/neighborhood |
| G | DiceOutcome | string | textureOutcome name (ticket / arrested / etc.) |
| H | PrimaryMetric | string | metric name impacted (neighborhood_mood / crime / etc.) |
| I | MetricMagnitude | int (signed) | Sampled from vehicle's magnitudeRange; signed by direction |
| J | ConsequenceFloorFired | bool | TRUE when Tier-1 cascade triggered |
| K | ChaosNarrativeSeed | string | Optional one-line text for desk packets |
| L | TimestampUtc | ISO 8601 | When the event was generated this cycle |

---

## Changelog

- 2026-05-07 — Initial draft (S205, research-build). Six grill rounds: Q1 vehicle list (S190 10 municipal types, no commercial yet); Q2 data model (scope-targeted writebacks + chaos_cars source ledger); Q3 framing shift (texture → severe events injector with metric swings as core mechanic); Q4 calibration philosophy (asymmetric decay — positive fast, negative slow); Q5 tier policy (no protection, full random, no death events); Q6 frequency (variable bounded 3-15 random per cycle). Anti-cookie-cutter framing locked: chaos_cars is engine-side analog of Jax Caldera — both inject disruption into a system that otherwise self-confirms. Routing plan integration confirmed: Tier-1 hits trigger Engine A's `consequenceFloor`. ADR-0003 friction-log applies (T6.4). 25 tasks across 6 phases.
