---
title: Chaos Cars Engine Plan
created: 2026-05-07
updated: 2026-05-07
type: plan
tags: [engine, architecture, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md §"IDEAS: Arc engine grafts + typed municipal-vehicle character system + micro-event overlap detection" (S190 entry, line 107) — Pattern C source
  - output/drive-files/GodWorld_Escalation_Engine_v1.0.txt (DeepSeek v1, rejected as-is — patterns kept)
  - output/drive-files/Micro_Event_Generator_v2.0.txt (DeepSeek v2, rejected as-is — flavor-set quality kept)
  - docs/plans/2026-05-07-engine-routing-foundation.md (consequenceFloor integration target — Phase 5 cascade)
  - docs/adr/0003-skills-as-shared-infrastructure.md (friction-log pattern this plan follows)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout; replaces line 107 Pattern C entry with pointer to this plan"
  - "[[plans/2026-05-07-engine-routing-foundation]] — sibling plan; chaos_cars Tier-1 cascade triggers Engine A's consequenceFloor flag"
  - "[[plans/2026-06-04-mags-citizen-loop]] §The seam to Chaos-Cars — chaos-cars supplies the OBJECTIVE adversity (negative LifeHistory/neighborhood events); the citizen-loop is the SUBJECTIVE reaction. Join at the citizen's perception slice. Two decay systems must compose consciously (S262)."
  - "[[adr/0003-skills-as-shared-infrastructure]] — friction-log pattern applies to /chaos-dryrun + future chaos-related skills"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — register in same commit"
  - "[[engine/CHAOS_CARS_DEPLOY]] — C99-gated deploy runbook (S265); execute when the gate clears"
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
3. Effects reach scope-appropriate surfaces — **[S265 CORRECTED, see §S265 + AC#3-corrected]** citizen events via col O + a DIAL_MAP tag (NOT only the archive append), business via `queueCellIntent_` on `Business_Ledger` E/G (trimmed lookup), neighborhood via the Phase-10 **writer fold** (NOT a `Neighborhood_Map` column write — that is clobber-certain). chaos_cars ledger is the source row for every effect.
4. **Universal constraint enforced:** zero death-class outcomes (`death`, `died`, `fatal`, `kill`, `killed`) across 5+ live cycles. Validator throws if any vehicle config contains a forbidden outcome string.
5. **Tier-1 cascade test:** synthetic Tier-1 hit (forced via dry-run script) produces all four cascade outputs: (a) `world_summary_c{XX}.md` carries scandal/event entry, (b) all voice agents' `pending_decisions.md` auto-populated next cycle with chaos-event reaction prompt, (c) new `Storyline_Tracker` row created with arc state, (d) routing plan Engine A `consequenceFloor: true` set on the auto-generated seed.
6. **Asymmetric decay observable:** positive metric swings (ice cream → Sentiment UP) revert toward baseline within 1–2 cycles; negative swings (garbage → Sentiment DOWN, fire → Annual_Revenue DOWN) persist 3–5+ cycles. **[S265: measurable only after T1.5 clobber fix; neighborhood decays in the writer fold, business in applyChaosDecay — see §S265.]** Measurement script T6.2 confirms.
7. Frequency stays within 3–15 bound across 5 dry-run cycles. No cycle produces 0 events; no cycle exceeds 15.

---

## S265 Design Finalization (research-build) — CORRECTS Phases 2–4, supersedes the config-draft

> Authored S265 after adversarial substrate-verification (5-agent workflow `wf_dc6874a9-2dc`) against live engine code. The original Phase-3/4 task text was naive about three substrate realities and would have built **wrong code**; the corrected model is below and the affected tasks (T3.8/T3.9/T3.10/T4.1/T4.2) carry inline `[S265 CORRECTED]` banners. The scratch `docs/plans/2026-06-20-chaos-cars-config-draft.md` is retired into this section.

### The three substrate facts that reshaped the design

1. **`Neighborhood_Map` is rebuilt every cycle at Phase 10, not Phase 8.** `saveV3NeighborhoodMap_` lives in `phase08-v3-chicago/` but is *wired* as `Phase10-NeighborhoodMap` (`phase01-config/godWorldEngine2.js:430` + dup `:1740`), doing a `replace rows 2:N` `setValues`. Because it fires LAST, every in-cycle reader (`applyMigrationDrift` P6, `loadNeighborhoodState` P2) sees **last cycle's** folded value — chaos lands with a clean one-cycle lag, identical to the shipped pulse fold. **A direct Phase-4 column write is wiped; chaos must inject through the writer's fold, not a column write.**
2. **The gentrification clobber (latent bug — affects the SHIPPED pulse fold too).** `gentrificationEngine` (Phase 5) queues a **full-width 16-col** `Neighborhood_Map` range intent whenever any one hood's phase changes (`gentrificationEngine.js:184`), and `executePersistIntents_` (`godWorldEngine2.js:458`) commits it **after** the Phase-10 writer — reverting the 4 metric columns to last-cycle values. So neither the chaos fold nor the **already-shipped engine.33 pulse fold** "persists natively." **Resolution (see clobber-fix task T1.5 below).**
3. **The citizen affect seam is col O + a DIAL_MAP tag, not the archive append.** `LifeHistory_Log` is an append-only archive; the affect/dial path reads the citizen's **col O `LifeHistory` cell** (`row[iLife]`, `generateCitizensEvents.js:1706-1709`) + `ctx.ledger.dirty=true`. A novel `chaos_cars` tag falls through `DIAL_MAP` to `DEFAULT_AMBIENT` (+composure) — the **inverse** of intended adversity. Every citizen outcome must carry an **existing DIAL_MAP tag** (Mike, S265: "tagged properly for the dials").

### Per-scope writeback — CORRECTED

| Scope | Mechanism | Decay owner | Notes |
|---|---|---|---|
| **citizen** | (a) append archive row to `LifeHistory_Log` in the **live 7-col schema** `[Date, POPID, Name, EventTag, Text, NeighborhoodOrEngine, Cycle]`; (b) **mutate col O** `row[iLife] = existing ? existing+"\n"+line : line` (`line = "{ts} — [Tag] {text}"`) + set `ctx.ledger.dirty=true` | `compressLifeHistory` col-O objective fold (one-time, **no separate decay**) | `EventTag` = `"{DialTag}\|chaos_cars\|{vehicle}"` (pipe-delimited; PrimaryTag is the real DIAL_MAP tag, `chaos_cars` is provenance). The bracket `[Tag]` in col O **must** be the DIAL_MAP tag. |
| **business** | `queueCellIntent_` to `Business_Ledger` (NOT a raw direct write — engine.md rule). **Trim header before lookup** (`headers.findIndex(h => h.trim()==='Annual_Revenue')` — col G is stored `'  Annual_Revenue  '`; literal `indexOf` returns −1 and silently drops). Match row on the **hyphen** BIZ-ID value (`BIZ-000NN`). Empty cell → base 0. | `applyChaosDecay` (Phase 5 nudge), **business-scope rows ONLY** | persists natively vs the per-cycle engine (only `runCareerEngine`/`economicRippleEngine` touch the sheet, neither writes E/G). Fragility: standalone `linkCitizensToEmployers.js`/`processBusinessIntake.js` recompute E from scratch — gate any future cycle-wiring. |
| **neighborhood** | NO column write. Accumulate the swing into off-sheet residual **`ctx.summary.chaosNeighborhoodFold[hood][column]`**; the Phase-10 writer consumes it the way it consumes `S.neighborhoodPulse` (additive at `v3NeighborhoodWriter.js:318-321`) and **decays the residual in-place each cycle** (residual cannot be read back from the rebuilt sheet). | writer fold re-apply (intrinsic, Phase 10) | Targets the 4 citizen-movable cols only: `Sentiment / CrimeIndex / RetailVitality / EventAttractiveness`. **`NoiseIndex` dropped** (zero readers, not a fold column). Decay applies the larger swing — keep the writer's `Math.max(0,…)` + `round2` guards. |

**Tri-partite decay ownership (resolves the double-count, Q-new):** business → `applyChaosDecay` (Phase 5); neighborhood → writer fold residual (Phase 10); citizen → `compressLifeHistory` col-O fold (no separate decay). `applyChaosDecay` MUST filter to business-scope rows.

**Tier-1 + the col-O fold (resolves Q-cascade):** a Tier-1 citizen hit gets **both** the col-O dial movement (they feel it — composure/integrity moves) **and** the full Phase-5 cascade. The plan's "Tier-1 resolves via arcs, not metric decay" clause scopes to neighborhood/business **metric** decay only — it does NOT suppress the citizen's own dial fold.

### Finalized vehicle table (T2.2) — 10 vehicles, ~62% negative by frequency-weighted exposure (Mike: "lean negative")

`lifeHistoryTag` = the DIAL_MAP tag emitted when the outcome hits a **citizen**; tag by the citizen's *role* — **agent** (own conduct) → `integrity`; **victim/subject** → `composure/warmth`, never integrity. **bold** = high-severity, cascade-capable, carries `narrativeSeed` (Chaos_Cars col K). Neighborhood/business impacts name **real columns**, `direction` + `magnitudeRange`.

| Vehicle | Wt | Scopes | Outcomes (severity → lifeHistoryTag) | Nbhd/Biz impacts (real cols) | Net |
|---|---|---|---|---|---|
| cop_car | 1.2 | citizen, nbhd | ticket(lo→`Setback`) · pulled_over_warning(lo→`Background`) · helped_by_police(lo→`Recovering`) · **arrested**(hi→`Transgression-Serious`) | CrimeIndex ↓[2-6] | – |
| fire_engine | 0.8 | biz, nbhd | false_alarm(lo) · minor_fire(lo) · **major_blaze_contained**(hi) | Annual_Revenue ↓[10-25] · Sentiment ↓[3-8] | – |
| ambulance | 0.9 | citizen, nbhd | minor_injury(lo→`Health`) · **medical_emergency**(hi→`Critical`) · **workplace_accident**(hi→`Hospitalized`) | Sentiment ↓[2-5] | – |
| **oari_van** | 1.0 | citizen, nbhd | welfare_check(lo→`Recovering`) · **deescalated**(hi→`Stabilized`, *coverageContribution*) · **substance_intervention**(hi→`Recovery`, *coverageContribution*) | Sentiment ↑[3-7] · CrimeIndex ↓[2-5] | + |
| building_inspector | 0.7 | biz | passed(lo) · **code_violation_cited**(hi) · **forced_temporary_closure**(hi) | Annual_Revenue ↓[5-15] · Employee_Count ↓[0-2] on closure | – |
| garbage_truck | 1.1 | nbhd, biz | dumping_cleared(lo) · missed_pickup(lo) · **sanitation_strike_delay**(hi) | Sentiment ↓[3-8] · RetailVitality ↓[1-3] · Annual_Revenue ↓[3-8] | – |
| mail_truck | 1.0 | citizen, biz | vital_document_delivered(lo→`Background`) · lost_package(lo→`Setback`) · **mail_theft_reported**(hi→`Setback`, victim) | Annual_Revenue ↑[1-3] | + |
| ice_cream_truck | 0.5 | nbhd | summer_morale_boost(lo) · block_party_catalyst(lo) · noise_complaint(lo) | Sentiment ↑[3-6] · EventAttractiveness ↑[1-4] | + |
| street_sweeper | 0.8 | nbhd, citizen | street_beautification(lo) · parking_ticket(lo→`Setback`) · traffic_jam(lo→`Background`) | RetailVitality ↑[1-3] · Sentiment ↓[1-3] | ± |
| pge_truck | 0.7 | nbhd, biz | planned_shutoff(lo) · **power_outage_restored**(hi) · **transformer_blowout**(hi) | Sentiment ↓[4-10] · Annual_Revenue ↓[5-15] | – |

Negative-dominant (cop/fire/ambulance/inspector/garbage/pge) freq-weight 5.4 of 8.7 ≈ **62%**; positive (oari/mail/ice_cream) 2.5 ≈ 29%; mixed (sweeper) 0.8 ≈ 9%. ice_cream + street_sweeper carry no high-severity outcome → never trigger a Tier-1 scandal (intentional levity contrast).

### Decay table (T4.1) — real columns, good-direction reverts faster

```javascript
var DECAY_RULES = {
  'Sentiment':           { upRevertPerCycle: 1.5, downRevertPerCycle: 0.3 }, // mood: good=up reverts fast
  'CrimeIndex':          { upRevertPerCycle: 0.3, downRevertPerCycle: 1.0 }, // good=down; crime spikes stick
  'RetailVitality':      { upRevertPerCycle: 1.2, downRevertPerCycle: 0.3 },
  'EventAttractiveness': { upRevertPerCycle: 1.2, downRevertPerCycle: 0.3 },
  'Annual_Revenue':      { upRevertPerCycle: 1.0, downRevertPerCycle: 0.2 }, // profit losses linger
  'Employee_Count':      { upRevertPerCycle: 0.0, downRevertPerCycle: 0.0 }  // churn permanent
};
```
Sentiment/CrimeIndex/RetailVitality/EventAttractiveness decay in the **Phase-10 writer fold** (off-sheet residual); Annual_Revenue/Employee_Count decay in **`applyChaosDecay`** (Phase-5, business rows only). Citizen scope has no decay row — the col-O fold is one-time. Composes with the citizen-loop affect decay at the perception slice (S262) — do not couple further until the Phase-1 affect gate clears (obs 31554).

### New acceptance tests (replace/augment AC#3 + AC#6)

- **AC#3 (corrected):** business events appear via `queueCellIntent_` on `Business_Ledger` E/G (trimmed lookup); neighborhood events appear as a **writer-fold residual** reflected in the rebuilt Neighborhood_Map row (NOT a direct column write); citizen events appear as a col-O entry with a DIAL_MAP tag (NOT only the archive append).
- **AC#8 — CLOBBER-SURVIVAL:** on a gentrification-firing cycle, read the neighborhood metric **after** `executePersistIntents_` and confirm the chaos fold survived (i.e. T1.5 fix holds).
- **AC#9 — CITIZEN AFFECT-SEAM:** confirm col O carries a DIAL_MAP-recognized tag and `compressLifeHistory` moves the citizen dial in the intended direction (composure DOWN for an arrest, etc.).

### Engine-sheet build-time notes

- Apply ALL wiring + the T1.5 fix to **both** `godWorldEngine2.js` entry blocks (~225-458 production + ~1552-1762 dup) or behavior diverges.
- Read **live** `Neighborhood_Map` at build to determine if the gentrification clobber is firing today (active bug) or latent (input cols `MedianIncomeChange5yr` etc. unpopulated) — either way T1.5 is the durable fix.
- `Business_Ledger` empty-cell base value + fail-loud assert if the trimmed header lookup misses.

### Cross-terminal build split — the cascade closes across BOTH terminals

The Hard-Constraint "Tier-1 hit forces full cascade — all four outputs live" canNOT close from engine-sheet alone. The four cascade outputs split 2/2:

| Output | Task | Terminal |
|---|---|---|
| world_summary scandal tag | T5.2 (`build-world-summary` SKILL) | **research-build** |
| voice pending_decisions | T5.3 (`city-hall-prep` SKILL) | **research-build** |
| Storyline_Tracker arc | T5.4 | engine-sheet |
| routing consequenceFloor seed | T5.5 | engine-sheet |

**Engine-sheet** builds the substrate + producer: T1.3 (sheet), T1.5 (clobber fix), T3.x (generator + writebacks), T4.2/T4.3 (business decay + wiring), T5.1 (Tier-1 detector), T5.4, T5.5, T6.4 (friction log). **Research-build retains its own pieces** — the cascade CONSUMERS (T5.2/T5.3, skill files) + validators (T6.1 dry-run / T6.2 magnitude / T6.3 frequency, scripts). These consume the producer, so research-build picks them up **right behind** engine-sheet's T5.1 + T3.12 (dry-run path) and authors+verifies them against a real synthetic Tier-1 event (measure-twice — read the dry-run output, then write the consumer; not blind). Neither terminal's half is optional for the cascade Hard Constraint.

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
- **Status:** [x] DONE S229 (engine-sheet). `lib/chaosCarsConfig.js` shipped (158 LOC) — `FORBIDDEN_OUTCOMES` frozen array expanded beyond plan's named-minimum to cover stem variants (dies / dying / fatality / fatalities / kills / killing / perish / perished / casualty / casualties / homicide / suicide / murder / murdered — 21 tokens total; cost of over-enumeration < cost of false-negative). `validateOutcome(text)` uses word-boundary regex (`\b`) not substring — `deadline` / `killdeer` / `dieseling` / `fatalism` all pass (false-positive avoidance verified in test 5). Bonus `validateVehicleConfig(config)` convenience wrapper scans full `textureOutcomes[]` and names both offending vehicle + forbidden token in the throw message (Phase 2 will call this at config-load time). Tests live in parallel `lib/chaosCarsConfig.test.js` per project convention (not "file footer" as plan suggested — `scripts/run-tests.js` picks up `*.test.js`). 66 assertions across 8 test groups, all green. Module exports: `FORBIDDEN_OUTCOMES`, `validateOutcome`, `validateVehicleConfig` — stable contract for Phase 2 consumption.

#### T1.5: Fix the Neighborhood_Map gentrification clobber [engine/sheet] — **NEW S265, BLOCKS neighborhood scope**

- **Why:** `gentrificationEngine.js:184` queues a full-width 16-col `Neighborhood_Map` range intent when any hood's phase changes; `executePersistIntents_` (`godWorldEngine2.js:458`) commits it AFTER the Phase-10 writer (`:430`), reverting the 4 metric columns. This wipes the chaos fold AND the already-shipped engine.33 pulse fold. (Adversarial-verify finding, `wf_dc6874a9-2dc`.)
- **Files:** `phase05-citizens/gentrificationEngine.js`
- **Steps:**
  1. Read live `Neighborhood_Map` to classify active-vs-latent (are `MedianIncomeChange5yr` / `MedianRentChange5yr` / `WhitePopulationChange5yr` populated → does `updated>0` ever fire?).
  2. **Fix (recommended — root cause):** make the gentrification writeback **column-scoped** — queue cell/narrow-range intents for ONLY `GentrificationPhase` / `GentrificationStartCycle` / `DemographicShiftIndex`, never the 4 metric columns. Fallback if column-scoping is hard: re-apply the chaos+pulse residual after `executePersistIntents_`.
  3. Apply to both `godWorldEngine2.js` entry blocks.
- **Verify:** AC#8 clobber-survival — on a gentrification-firing cycle, the writer's fold survives `executePersistIntents_`.
- **Status:** [ ] not started — **engine-sheet; verify live state first (measure-twice)**

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
- **Status:** [x] DESIGN RESOLVED S265 — schema finalized in §S265 Design Finalization: `textureOutcomes[]` gains `lifeHistoryTag` (DIAL_MAP tag for citizen hits) + optional `narrativeSeed`; `metricImpacts[]` are **scope-keyed** (`scope` + real `column` + `direction` + `magnitudeRange`). Engine-sheet codes the schema constant + `loadConfig_()` from the section.

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
- **Status:** [x] DESIGN RESOLVED S265 — full 10-vehicle table finalized in §S265 Design Finalization (~62% negative, real columns, `lifeHistoryTag` per outcome, narrative seeds, OARI `coverageContribution`). Engine-sheet transcribes it into `lib/chaosCarsConfig.js VEHICLE_CONFIGS`.

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
  1. **[S265 CORRECTED — see §S265 Design Finalization. Original steps below would corrupt the ledger + miss the affect seam.]**
  2. `writeCitizenEvent_` does TWO writes: (a) `queueAppendIntent_` to `LifeHistory_Log` in the **live 7-col schema** `[Date, POPID, Name, EventTag, Text, NeighborhoodOrEngine, Cycle]` — `EventTag = "{DialTag}|chaos_cars|{vehicle}"`; (b) **mutate col O** `row[iLife] = existing ? existing+"\n"+line : line` where `line = "{ts} — [{DialTag}] {text}"`, then `ctx.ledger.dirty=true` (mirror `generateCitizensEvents.js:1706-1709`).
  3. `{DialTag}` is the outcome's `lifeHistoryTag` (a real DIAL_MAP tag) — NEVER `chaos_cars` as the bracket tag (falls through to `DEFAULT_AMBIENT` +composure, inverse of intent).
- **Verify:** AC#9 — col O carries a DIAL_MAP tag; `compressLifeHistory` moves the dial in the intended direction. Old `[cycle, popId, eventType, …]` row format is **abandoned** (column-misaligned).
- **Status:** [ ] not started — **[S265 CORRECTED]**

#### T3.9: Business writeback [engine/sheet]

- **Files:**
  - `phase04-events/chaosCarsEngine.js` — modify
- **Steps:**
  1. **[S265 CORRECTED — header-trim + intent routing, see §S265.]** `writeBusinessEvent_` uses `queueCellIntent_` (NOT a raw direct write — engine.md write-intent rule).
  2. Target `Annual_Revenue` (col G) / `Employee_Count` (col E) via a **trimmed** header lookup `headers.findIndex(h => h.trim()===name)` — col G is stored `'  Annual_Revenue  '`; a literal `indexOf` returns −1 and **silently drops** the write. Fail-loud assert if the trimmed lookup misses.
  3. Match the target row on the **hyphen** BIZ-ID value (`BIZ-000NN`, not the `BIZ_ID` underscore header). Empty cell → base 0.
- **Verify:** dryRun shows a queued `Business_Ledger` cell intent on the correct (trimmed) column; sparse-cell case defined.
- **Status:** [ ] not started — **[S265 CORRECTED]**

#### T3.10: Neighborhood writeback [engine/sheet]

- **Files:**
  - `phase04-events/chaosCarsEngine.js` — modify
- **Steps:**
  1. **[S265 CORRECTED — NO column write; the `queueRangeIntent_` approach is clobber-certain, see §S265.]**
  2. Accumulate the swing into off-sheet residual `ctx.summary.chaosNeighborhoodFold[hood][column]` (column ∈ {Sentiment, CrimeIndex, RetailVitality, EventAttractiveness}). The **Phase-10 writer** (`v3NeighborhoodWriter.js:318-321`) consumes it additively alongside `S.neighborhoodPulse`, and **decays the residual in place each cycle** per `DECAY_RULES` (residual can't be read back from the rebuilt sheet). Keep `Math.max(0,…)`+`round2` guards for the larger swing.
  3. Depends on **T1.5** (gentrification clobber fix) or the fold is reverted by `executePersistIntents_`.
- **Verify:** AC#8 clobber-survival — chaos residual reflected in the rebuilt row after `executePersistIntents_`.
- **Status:** [ ] not started — **[S265 CORRECTED]** depends on T1.5

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
- **Status:** [x] DESIGN RESOLVED S265 — `DECAY_RULES` keyed to **real columns** finalized in §S265 (the draft's `neighborhood_mood`/`crime`/`business_profit`/`business_employees` renamed; dead `neighborhood_pulse` dropped). Tri-partite decay ownership documented (business→applyChaosDecay, neighborhood→writer fold, citizen→col-O fold).

#### T4.2: Decay applier engine [engine/sheet]

- **Files:**
  - `phase05-citizens/applyChaosDecay.js` — create
- **Steps:**
  1. **[S265 CORRECTED — business-scope rows ONLY, else double-counts, see §S265.]** Implement `applyChaosDecay_(ctx)`:
     - Read recent chaos_cars rows **where TargetScope = business** (neighborhood decays in the Phase-10 writer fold; citizen in the col-O fold — decaying all scopes here double-counts). Note: with the business-only filter, the `ConsequenceFloorFired=false` clause is a no-op (business has no tier) — keep it harmless or drop.
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

- **[S265 file-pointer CORRECTED]** `build-world-summary` is a **deterministic Node writer** — section structure is owned by the script, and the SKILL.md explicitly says "do NOT edit prose in this skill." So the real work is a new **emitter function in `scripts/buildWorldSummary.js`** + its test, NOT the SKILL.md.
- **Files:**
  - `scripts/buildWorldSummary.js` — add a `## Chaos Events — Cycle {XX}` section emitter reading `Chaos_Cars` rows where `ConsequenceFloorFired=TRUE` for the current cycle (the writer already reads sheets via `lib/sheets.js`)
  - `scripts/buildWorldSummary.test.js` — add a fixture + assertion group
  - `.claude/skills/build-world-summary/SKILL.md` — add the new section to the §"What the script emits" list (doc-sync only)
- **Steps:**
  1. Emitter renders each Tier-1 chaos row as a scandal entry: vehicle + dice outcome + named target + `ChaosNarrativeSeed` (col K).
- **Verify:** AC#9-adjacent — synthetic Tier-1 chaos row → world_summary contains the Chaos Events section with the named entity.
- **Status:** [ ] not started — **producer-blocked: reads `Chaos_Cars` rows; pick up AFTER engine-sheet ships T1.3 + T5.1 (Tier-1 detector). Author emitter + fixture together against a real synthetic row.**

#### T5.3: Voice agent pending_decisions auto-populate [research-build]

- **Files:**
  - `.claude/skills/city-hall-prep/SKILL.md` — modify Step 2
- **Steps:**
  1. When chaos_cars Tier-1 event exists for current cycle, prepend a "Cycle Chaos Reaction" decision block to every voice's `pending_decisions.md`.
  2. Block format: `**[CHAOS CASCADE]** [Named entity] was hit by [vehicle] this cycle, outcome: [dice-rolled outcome]. Decision required: how does {voice} respond?`
  3. Reads chaos_cars rows where ConsequenceFloorFired=TRUE (via a Step-1 helper like `readInitiativeMilestoneNotes.js`/`dumpLedger.js` — a `dumpChaosCascade.js {XX}` read helper is the likely engine-sheet companion).
- **Verify:** city-hall-prep run with synthetic Tier-1 chaos event shows CHAOS CASCADE block in mayor's pending_decisions.md.
- **Status:** [ ] not started — **producer-blocked: reads `Chaos_Cars` rows; pick up AFTER engine-sheet ships T1.3 + T5.1. The Step-2 prose rule is authorable against the locked §S265 schema, but the read mechanism + verification need the producer — author + test together, not blind.**

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

- [x] **Q1 — RESOLVED S265.** All 10 vehicles finalized in §S265 Design Finalization (real columns, `lifeHistoryTag` per outcome, scope-keyed impacts, narrative seeds, ~62% negative per Mike's "lean negative" dial). Phase 6 tuning may adjust magnitudes.
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

## Status log

### engine.11 — status (drained from ROLLOUT, 2026-06-26 / S274)

Chaos-cars engine — typed municipal-vehicle stochastic event injection. **DESIGN FINALIZED S265** (research-build): T2.1/T2.2/T4.1 RESOLVED + T3.8/9/10 + T4.2 corrected + T1.5 added — all in plan §S265 (adversarial-verify `wf_dc6874a9-2dc`). Build is a **cross-terminal split (§S265 Cross-terminal build split)** — NOT engine-sheet-only. **engine-sheet** = substrate + producer + 2 cascade outputs (T1.3/T1.5/T3.x/T4.2-3/T5.1/T5.4/T5.5/T6.4; **first pickup = T1.5** — gentrification full-width range intent clobbers the Phase-10 Neighborhood_Map fold, also a LATENT bug on the SHIPPED engine.33 pulse fold, verify live state first). **research-build RETAINS** the other 2 cascade outputs (T5.2 build-world-summary SKILL, T5.3 city-hall-prep SKILL) + validators (T6.1/2/3 scripts) — sequenced right behind engine-sheet's T5.1+T3.12, authored+verified vs a real synthetic Tier-1 event (not blind). Cascade Hard-Constraint "all four outputs live" closes across BOTH terminals. **ENGINE-SHEET HALF BUILT S265** (ultracode, 8 commits on main `486d070a`→`8822e6b5`, 323 test assertions, 5-agent verify `wf_4e2b7b99-1b4` — neighborhood-fold blocker fixed via PropertiesService residual). **CLASP-DEPLOYED LIVE S265 (Mike go-call, commit `825059a1`); engine-sheet SMOKE PENDING C100** — first chaos cycle: Chaos_Cars tab lazy-creates, 3-15 events, 0-1 scale, NM fold consumes-not-accumulates, Tier-1 hit → createChaosArcs_ cascade. **RESEARCH-BUILD HALF (T5.2/T5.3 + T6.1/2/3) now UNBLOCKED + live-verifiable at C100** (producer deployed) — do T6.1 dry-run first (yields the synthetic Tier-1 fixture), then T5.2 (`buildWorldSummary.js` emitter+test) / T5.3 (city-hall-prep Step-2 rule + `dumpChaosCascade.js`) / T6.2/3; author+verify vs the dry-run event. Open Q3 chaos-arc↔arcLifecycle — observe C100. **Deploy procedure staged: [[CHAOS_CARS_DEPLOY]] (S265 runbook — gate criteria, 10-file deploy surface, pre/post-deploy gates).**

## Changelog

- 2026-06-20 — **S265 Design Finalization (research-build).** Finalized T2.1/T2.2/T4.1 (DESIGN RESOLVED) + corrected T3.8/T3.9/T3.10/T4.2 + added T1.5 (gentrification clobber fix). Adversarial 5-agent substrate-verification (`wf_dc6874a9-2dc`) caught: writer is Phase 10 not Phase 8; gentrification full-width intent clobbers the fold (+ latent risk to the shipped engine.33 pulse fold); decay double-counted scope-blind → tri-partite ownership; citizen affect seam is col O + DIAL_MAP tag not the archive append (Mike: "tag properly for the dials"); Business_Ledger header whitespace + write-intent routing. Drama dial: Mike chose lean-negative (~60%). Scratch `2026-06-20-chaos-cars-config-draft.md` retired into §S265. Build is **go-with-fixes** — engine-sheet picks up T1.5 → Phase 2/3/4 per the corrected spec.
- 2026-05-07 — Initial draft (S205, research-build). Six grill rounds: Q1 vehicle list (S190 10 municipal types, no commercial yet); Q2 data model (scope-targeted writebacks + chaos_cars source ledger); Q3 framing shift (texture → severe events injector with metric swings as core mechanic); Q4 calibration philosophy (asymmetric decay — positive fast, negative slow); Q5 tier policy (no protection, full random, no death events); Q6 frequency (variable bounded 3-15 random per cycle). Anti-cookie-cutter framing locked: chaos_cars is engine-side analog of Jax Caldera — both inject disruption into a system that otherwise self-confirms. Routing plan integration confirmed: Tier-1 hits trigger Engine A's `consequenceFloor`. ADR-0003 friction-log applies (T6.4). 25 tasks across 6 phases.
