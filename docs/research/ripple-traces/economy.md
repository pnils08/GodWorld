---
title: Ripple Trace — Economy (economicRipple, gentrification, migration, wealth)
created: 2026-07-04
type: research
tags: [engine, ripples, attribution, economy, trace, reference]
pointers:
  - "[[../2026-07-04-ripple-attribution-trace]] — synthesis doc (findings E1–E6 derive from this trace)"
  - "[[TEMPLATE]] — the trace template this instantiates"
---

# Ripple Trace: ECONOMIC state shifts

> Raw S291 trace, preserved verbatim as reference. These documents are impossible to
> reconstruct without this level of detail (Mike-direct S291). File future domain traces
> in this folder using [[TEMPLATE]].

**Execution order (all Phase 6 except gentrification/migration in Phase 5):** `runCareerEngine` (P5) → `processGentrification_` (P5) → `processMigrationTracking_` (P5) → `runEconomicRippleEngine_` (P6) → `applyMigrationDrift_` (P6) → `applyShockMonitor_` (P6) → `saveV3NeighborhoodMap_`/`v3NeighborhoodWriter` (P8/P10) → `finalizeCycleState` (P9). Confirmed by file headers (`economicRippleEngine.js:30-33`, `applyMigrationDrift.js:35-37`).

**Litmus answer up front:** A later reader **cannot** reconstruct "the C95 migration pulse raised Fruitvale density which lowered retail vitality." Four independent reasons, each proven below: (a) `migrationDrift` is never serialized cross-cycle; (b) `economicRipples` + `neighborhoodEconomies` evaporate at cycle end; (c) the one persisted per-hood migration number (`MigrationFlow`, NM col P) is written bare with zero cause attribution; (d) `RetailVitality` is a chaos/citizen-event derivative that economics *reads* as input — the ripple→retail chain is never computed, and "density" is not a tracked field at all.

---

## 1. CAUSAL MECHANISMS

### A. Economic ripple detection (all compute into `ctx.summary`, transient)
`runEconomicRippleEngine_` (`economicRippleEngine.js:111`) builds `S.economicRipples[]` from six detectors:

- **Migration-triggered** `detectMigrationRipples_` (`:205`): reads `prevCycle.migrationDrift` (`:156`). `≥30`→POPULATION_SURGE(+8); `≥20`→WORKFORCE_GROWTH(+6); `≤-30`→POPULATION_EXODUS(-10); `≤-20`→WORKFORCE_DECLINE(-8) (`:213-228`).
- **Career-triggered** `detectCareerRipples_` (`:236`): reads `S.careerSignals`. `layoffs≥3`→MAJOR_LAYOFFS(-15) @Downtown (`:244`); `promotions≥4`→WORKFORCE_GROWTH(+6) (`:252`); `sectorShifts≥3`→`S.careerChurn=true` (`:261`). Per-business: `businessDeltas[BIZ].lost≥2 && net<0`→BUSINESS_CONTRACTION(-8) at the business's hood; `.gained≥2 && net>0`→BUSINESS_EXPANSION(+5) (`:275-282`). Hood resolved via `Business_Ledger` read (`:126-137`) + `mapToCanonicalNeighborhood_` (`:288`).
- **Calendar** `detectCalendarRipples_` (`:308`): holiday/festival/sports/First-Friday/seasonal → ripples (`:313-412`).
- **Event text-match** `detectNewRipples_` (`:420`): substring-matches `worldEvents`+`citizenEvents` headlines ("investment"→TECH_INVESTMENT, "layoff"→MAJOR_LAYOFFS, "grand opening"→NEW_BUSINESS, etc.) (`:435-461`); `domains['BUSINESS']≥3`→NEW_BUSINESS (`:464`); crisis/weather (`:468-479`).

Each `createRipple_` (`:483`) pushes `{type, impact, sectors, primaryNeighborhood, startCycle, endCycle=cycle+duration, currentStrength, source, holiday…}` onto `S.economicRipples`.

### B. Ripple → mood → employment → sheet
- `calculateEconomicMood_` (`:565`): sums `currentStrength` of active ripples ×0.1 into `S.economicMood`; adds migration terms (`:594-605`), calendar terms; sets `S.economicMoodDesc` (`:642-652`).
- `calculateNeighborhoodEconomies_` (`:720`): per-hood local mood from ripples × `NEIGHBORHOOD_ECONOMIES[nh].sensitivity` (primary hood ×1.5), holiday/sports zones → `S.neighborhoodEconomies[nh] = {mood, descriptor, activeRipples…}` (`:774`).
- `deriveEmploymentRate_` (`:660`): `0.82 + mood/100*0.14`, migration adjust → **direct sheet write** to `World_Population.employmentRate` and `.economy` descriptor, row 2 only (`:691-711`). This is the engine's single economic write to a durable sheet.

### C. Gentrification (`gentrificationEngine.js`)
`processGentrification_` (`:70`). `updateGentrificationPhases_` (`:104`) reads NM 5yr-change cols (`MedianIncomeChange5yr`/`MedianRentChange5yr`/`WhitePopulationChange5yr`/`HighEducationPct`/`DisplacementPressure`), computes phase via `detectGentrificationPhase_` (`:208`) and `DemographicShiftIndex` (0-10, `:185-194`). Writes via cell-scoped `queueCellIntent_`: `GentrificationPhase` (`:170`), `GentrificationStartCycle` (`:176`), `DemographicShiftIndex` (`:200`). `generateGentrificationHooks_` (`:256`) pushes ctx-transient `S.storyHooks` (ACCELERATING sev8, EARLY sev5, TRANSFORMATION sev6, DISPLACEMENT_CRISIS sev9) with cause-in-description ("rent up X% in 5 years, displacement pressure Y/10").

### D. Migration tracking (`migrationTrackingEngine.js`)
`processMigrationTracking_` (`:91`). `assessDisplacementRisk_` (`:135`) computes 0-10 `DisplacementRisk` from NM `DisplacementPressure` + `Household_Ledger` rent burden + no-college + senior; writes to `ctx.ledger.rows` (`:205`, committed by Phase 10). `updateMigrationIntent_` (`:284`) sets `MigrationIntent` staying/considering/planning by risk ≥5/≥8 (`:311-317`). `generateMigrationHooks_` (`:392`) pushes ctx-transient hooks FORCED_MIGRATION (sev7, `:431`) and MASS_EXODUS (sev8, 5+/hood, `:449`). **`processMigrationEvents_` (`:337`) and `checkForDisplacedCitizens_` (`:354`) are placeholders — no citizen is relocated; the `Migration_Events` sheet log is a TODO** (`:38`, `:338-339`).

### E. Migration drift (`applyMigrationDrift.js`)
`applyMigrationDrift_` (`:91`): reads `S.economicMood`, `S.economicRipples`, `S.neighborhoodEconomies` (`:189-192`) + `World_Population` + NM metrics. Computes city `drift` (-50..50) from mood/ripple-count/weather/chaos/sentiment/employment/holiday/sports (`:216-317`). Per-hood `neighborhoodMigration[nh]` from NM `CrimeIndex`/`Sentiment`/`RetailVitality`/`EventAttractiveness` (read as **inputs**, `:342-345`) + neighborhoodEconomies. **Direct sheet write** of per-hood drift to NM col P `MigrationFlow` (`:391-405`). Feedback: mutates `S.economicMood` (`:425`) and `S.neighborhoodEconomies[hood].mood` (`:460`) in place — same-cycle only.

---

## 2. PERSISTENCE — where effects land, and whether cause survives

| Effect | Lands in | Cause recorded alongside? |
|---|---|---|
| `employmentRate`, `economy` descriptor | **World_Population sheet** row 2, direct (`economicRippleEngine.js:699,710`) | **No.** Bare value/descriptor. No ripple type, no trigger. |
| `GentrificationPhase`, `GentrificationStartCycle`, `DemographicShiftIndex` | **Neighborhood_Map sheet** cell intents (`gentrificationEngine.js:170,176,200`) | Partial. `StartCycle` records *when*; phase/index record *state*. The driving 5yr-change cols are pre-existing NM inputs, so the "why-now" is inferable from same-row data — but no event linkage. |
| `DisplacementRisk`, `MigrationIntent` | **Simulation_Ledger** via `ctx.ledger` (`migrationTrackingEngine.js:205,320`), committed Phase 10 | **No.** Per-citizen scalar; the contributing factors (pressure/rent/education/age) are recomputed, not stored. |
| `MigrationFlow` (per-hood drift) | **Neighborhood_Map col P** direct (`applyMigrationDrift.js:402`) | **No.** Bare integer. The `factors[]` array and `neighborhoodMigration{}` metrics that produced it stay in `S`, unpersisted. |
| `economicRipples[]`, `economicMood`, `neighborhoodEconomies`, `economicSummary`, `economicNarrative`, `migrationDrift`, `migrationDriftFactors` | **`ctx.summary` only** | **Evaporate at cycle end** — see Gaps. |
| Story hooks (gentrification + migration) | **`ctx.summary.storyHooks` only** | Carry cause-in-description, but never written to any sheet (`grep`: no Phase-10 storyHooks sheet writer; `buildCyclePacket.js:541,578` reads them into text only). |

**Cross-cycle serialization is the choke point.** `finalizeCycleState` (`finalizeCycleState.js:47-101`) writes `PREV_CYCLE_STATE_JSON` and `applyShockMonitor` (`applyShockMonitor.js:394`) writes `currentCycleState`. Grep for `migrationDrift|economicRipples|neighborhoodEconomies|economicSummary` in both returned **empty**. The snapshot carries only `econMood` (a scalar), sentiment, chaos, pattern/shock, calendar, `neighborhoodDynamics`, `domainPresence`. So of all economic computation, **only the `economicMood` scalar and the sheet-persisted NM/World_Population columns survive the cycle boundary.**

---

## 3. MEDIA SURFACE

**Visible (persisted sheet columns → reach briefs/audit):**
- `engine_audit_c99.json` contains NM columns `GentrificationPhase`, `GentrificationStartCycle`, `DisplacementPressure`, `MigrationFlow` (21 rows each) — but **zero** `economicMood`/`economicSummary`/`ripple`/`storyHooks`/`neighborhoodEconomies` keys (`grep -c` = 0). The audit surfaces persisted *state*, not transient causal data.
- `lib/neighborhoodSlice.js` surfaces `retailVitality`, `medianIncome`, `medianRent`, `displacementPressure`, `gentrificationPhase` (`:62-90`) — all read from Neighborhood_Map. `generateBaselineBriefs.js:27-29` feeds these into baseline briefs. So displacement pressure, median income/rent, and gentrification phase reach briefs as **current-state + cycle-over-cycle deltas**, never as attributed cause chains.

**Text-only, in-cycle (not durable):**
- `buildCyclePacket.js` renders `economicSummary` (`:348`), `neighborhoodEconomies` (`:655`), and `storyHooks` with `@neighborhood` tags (`:578-590`) into the cycle text packet. This is the only surface where ripple narrative + hook + hood co-occur, but it is a transient media-room packet, not a queryable record.
- `mediaRoomBriefingGenerator.js:241-256` and `buildMediaPacket.js:170-174` print `economicMood`/`economicNarrative`/`economicSummary`/per-hood economies into the media brief text.

**Invisible:**
- **Story_Seed_Deck:** no production engine writes it — only `scripts/engineCycleAuditTest.js:93` references the tab. Story hooks/seeds live in `ctx.summary` and reach the deck only through the media pipeline as text, carrying no structured cause→effect edge.

---

## 4. GAPS — computed but unattributed / unpersisted / hollow

1. **Cross-cycle migration→ripple loop is dead.** `detectMigrationRipples_` reads `S.previousCycleState.migrationDrift` (`economicRippleEngine.js:156`), but `migrationDrift` is never serialized into `PREV_CYCLE_STATE_JSON` (`finalizeCycleState.js:47-101`) or `currentCycleState` (`applyShockMonitor.js:394`). It therefore always resolves to `0` via the `|| 0` default. Consequence: POPULATION_SURGE/EXODUS/WORKFORCE_GROWTH/DECLINE migration ripples **never fire from migration** (`:213-228`); the mood migration block (`:594-605`) and `deriveEmploymentRate_` migration adjust (`:669-683`) **never fire**. The header's advertised "bidirectional connection with applyMigrationDrift_" (`:24`) is inert across cycles. (Within a cycle it also can't fire: `applyMigrationDrift_` runs *after* `economicRipple`, so this-cycle drift isn't available yet.)

2. **Ripple duration/decay is hollow.** `S.economicRipples` is read as `S.economicRipples || []` each cycle (`:118`) and is never restored from any snapshot (absent from both serializers; grep confirms only downstream *reads*). So every ripple has `startCycle === currentCycle` → in `processActiveRipples_` (`:537`), `elapsed=0` → `decayFactor=1` (`:550-552`); ripples live exactly one cycle. The `duration 4-12` fields (`:42-79`) and the `endCycle > currentCycle` dedup guards (holiday/summer/winter, `:319-411`) are structurally unreachable. `neighborhoodEconomies` is likewise never persisted, so the ripple→per-hood-economy result has no durable landing regardless.

3. **The task's example chain is not computed.** `RetailVitality` is written **only** by `v3NeighborhoodWriter.js:351` — additively from the engine.33 citizen-event **pulse fold** ('vitality' delta) and the engine.11 **chaos-cars fold** (`:336,351`), neither of which reads `economicMood`, `economicRipples`, or `neighborhoodEconomies`. `applyMigrationDrift.js:344` reads `RetailVitality` as an **input** to migration. So the direction is retail→migration, not migration→retail. There is **no "density" NM field** (`grep -iw density` in phase02/phase08/neighborhoodSlice = empty) — density appears only in flavor-text engines (`buildNightLife.js`, `storyHook.js`). The specific chain "migration pulse → density → lower retail vitality" is neither computed nor persisted anywhere.

4. **Business open/close events are not produced.** economicRipple only **reads** `Business_Ledger` for BIZ→hood resolution (`:126`) and consumes `careerSignals.businessDeltas` (employee gains/losses). The Business_Ledger production side writes only `Annual_Revenue`/`Employee_Count` folds (`chaosCarsEngine.js:147-165`) and `EmployerBizId` updates (`runCareerEngine.js:15` — "Never changes … Status"). No cycle-path engine writes business open/close lifecycle rows, so "business openings/closures" as attributed economic events don't exist as durable records; BUSINESS_CONTRACTION/EXPANSION ripples derive from employee deltas and evaporate per Gap 2.

5. **Migration is assessed but never enacted.** `processMigrationEvents_`/`checkForDisplacedCitizens_` are explicit placeholders (`migrationTrackingEngine.js:337-339,354`); the `Migration_Events` log is a documented TODO (`:38`). Risk/intent columns update, hooks fire, but no citizen is relocated and no per-event migration record with cause is written.

**Net:** The only durable, cross-cycle economic artifacts are (a) `World_Population.employmentRate`/`economy` (bare, unattributed), (b) NM `GentrificationPhase`/`StartCycle`/`DemographicShiftIndex`, `DisplacementPressure`, `MigrationFlow` (bare or state-only), (c) SL `DisplacementRisk`/`MigrationIntent` (per-citizen scalars), and (d) the `economicMood` scalar in the cycle snapshot. Every cause→effect linkage — which ripple moved which hood's mood, which migration pulse drove which flow — lives only in `ctx.summary` and is discarded at cycle end.
