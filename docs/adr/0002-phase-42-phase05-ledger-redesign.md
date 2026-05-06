---
title: "ADR-0002: Phase 42 §5.6 — phase05-ledger redesign via shared `ctx.ledger`"
created: 2026-05-01
updated: 2026-05-06
type: reference
tags: [architecture, engine, decision, active]
sources:
  - S185 Phase 42 §5.6 amended spec (Supermemory `mags/hQE4rREEWBpS9aS1g3mQ3M`)
  - S185 original decision reasoning (Supermemory `mags/fTzSivJgpXmaBcB5vrPEn1`)
  - S185 engine-sheet §5.6.6 audit (Supermemory `mags/2Lh8xsEHc6BMbBARM6mwHU`)
  - "[[engine/PHASE_42_PATTERNS]] §5.6 — canonical spec carrying the redesign"
  - "[[plans/2026-04-28-phase-42-writer-consolidation]] — parent plan"
pointers:
  - "[[adr/0001-adopt-context-and-adrs]] — pattern source for this ADR"
  - "[[engine/PHASE_42_PATTERNS]] — full spec, per-batch verification, before/after diffs"
  - "[[engine/PHASE_42_INVENTORY]] — 37-file / 175-site classification"
  - "[[engine/ROLLOUT_PLAN]] §Data & Pipeline — active rollout entry"
---

# ADR-0002: Phase 42 §5.6 — phase05-ledger redesign via shared `ctx.ledger`

**Status:** Accepted (S185), Implemented (S188)
**Date:** 2026-04-29 (decision) / 2026-04-29 (implementation)
**Deciders:** Mike (the Maker) + Mags (research-build) + engine-sheet (audit + execution)

## Context

Phase 42 §B0 canary (S184, engine-sheet) surfaced a systemic blocker in Phase 42 Writer Consolidation: 11 cycle-path engines do full-table read-mutate-write on `Simulation_Ledger` per cycle. Cohort A (8 direct-writers — `runHouseholdEngine`, `runRelationshipEngine`, `runEducationEngine`, `runCareerEngine`, `runNeighborhoodEngine`, `runCivicRoleEngine`, `runAsUniversePipeline`, `generateNamedCitizensEvents`) materialize sequentially — downstream engines read post-previous-engine state, so they appear safe. Cohort B (3 already shipping `queueRangeIntent_` — `generateGameModeMicroEvents`, `generateCivicModeEvents`, `generateMediaModeEvents`) is shipping a **live bug today**: 2 of 3 engines' mutations get clobbered at Phase 10 last-write-wins each cycle, masked because cohort A's direct-writes prop the chain forward.

The collision class is **read-staleness, not write-overlap.** Engine B reads `Simulation_Ledger` before engine A's queued write has flushed — so engine B sees pre-A state regardless of how A's write is queued. Any solution that only changes how writes happen (queueing, batching, intent-recording) inherits the staleness flaw.

S185 engine-sheet `§5.6.6` audit added 7 findings: 5 additional full-range writers (`generateGenericCitizenMicroEvent`, `generationalEventsEngine`, `generateCitizensEvents`, `runCivicElectionsv1`, `compressLifeHistory`) + 2 per-row writers (`checkForPromotions`, `processAdvancementIntake`) + 4 post-phase05 readers (`bondEngine`, `buildEveningFamous`, `mediaRoomIntake`, `compressLifeHistory`) + 1 latent function-name collision (`generateCitizensEvents_` defined in both `phase04-events/generateCitizenEvents.js` v2.4 dead and `phase05-citizens/generateCitizensEvents.js` v2.8 live; phase04 dead, lost flat-namespace race). All verified against actual code.

Final scope: **18 cycle-path SL touchers** + 1 prerequisite-delete + 1 Phase 1 init + 1 Phase 10 commit handler.

## Decision

**Approach (a) — shared in-memory `ctx.ledger`.**

Phase 1 (`phase01-config/godWorldEngine2.js`, pre-phase-04 entry) reads `Simulation_Ledger` once into `ctx.ledger`:

```javascript
var ledgerSheet = ss.getSheetByName('Simulation_Ledger');
var ledgerValues = ledgerSheet.getDataRange().getValues();
ctx.ledger = {
  sheet: 'Simulation_Ledger',
  headers: ledgerValues[0],
  rows: ledgerValues.slice(1),
  dirty: false
};
```

All 18 SL touchers route reads/writes through `ctx.ledger.rows`; `ctx.ledger.headers` is immutable post-init. Phase 10 commits via single replace intent from `ctx.ledger.rows` to row 2 onward — header preserved.

Side benefits:
- Cohort B clobber bug closes the moment redesign lands (no more last-write-wins on stale reads).
- ~10 fewer `Simulation_Ledger` reads per cycle (was 11 + audit-found 5 + readers; becomes 1).
- B2 (run*Engine × 4 mechanical migrations) unblocked — already converted away from direct writes by the redesign.

## Consequences

### Positive

- **Cohort B silent-clobber bug closed** — verified at S188 redesign batch land. No more masked last-write-wins.
- **Read-staleness eliminated** — every engine sees the same ledger view; downstream engines see upstream mutations within the same cycle.
- **Performance gain** — ~10 fewer full-table SL reads per cycle.
- **B2 unblocked** — `run*Engine × 4` mechanical migrations become trivial post-redesign.
- **Phase 42 Writer Consolidation can proceed** to B6 stop-point (~58%) or B7 (full) without contending with phase05 special cases.

### Negative

- **18 sites touched in one batch** — large blast radius if anything goes wrong. Mitigated by per-batch verification regimen documented in PHASE_42_PATTERNS, plus dryRun checkpoints.
- **`ctx.ledger` becomes load-bearing** — engines now depend on Phase 1 init succeeding. New cycle-path engine authors must route through `ctx.ledger`, not direct sheet access. Discipline required.
- **Scope expanded twice** — original 11 → audit-amended 18 → S188 implementation found 3 more readers not in spec. Future spec audits should expect ~10-15% miss on first pass.
- **Smoke-test pending** — clasp push + live cycle run still hadn't run as of S190. Verification deferred to next cycle.

## Alternatives considered

### (b) Per-row cell intents

Each engine queues per-cell `setValue` intents to a Phase 10 batched flush. **Rejected.** Doesn't fix read-staleness — engine B still reads pre-A state regardless of how A's writes are queued. The flaw is upstream of the write pattern.

### (c) Hybrid (intents for some, direct for others)

Some engines use queued intents, others continue direct writes, with sequencing guarantees per pair. **Rejected.** Inherits (b)'s read-staleness flaw plus a second maintenance pattern. Two ways to write the same field forever.

### (d) Status quo with documented warning

Leave the 11 direct-writers in place, document cohort B as a known bug, accept the per-cycle clobber. **Rejected at canary time.** Cohort B is shipping incorrect data every cycle; "documented" doesn't fix it. Discovery only happened because canary tooling surfaced it — the bug is invisible in normal operation.

## Migration

**Prerequisite (research-build, S185):** delete `phase04-events/generateCitizenEvents.js`. Function-name collision with live `phase05-citizens/generateCitizensEvents.js`. Phase04 v2.4 is strict subset of phase05 v2.8 — nothing to salvage. Smoke-test confirms cycle runs unchanged.

**Redesign batch (engine-sheet, S188):** 9 commits `0e31e66..6609c4a` migrated all 16 full-range writers + 2 per-row + 5 spec'd readers + 3 audit-miss readers + Phase 1 init + Phase 10 commit handler to shared `ctx.ledger`. Per-commit breakdown: PHASE_42_PATTERNS Changelog 2026-04-29 (S188).

**Post-redesign (S188+):** B2 mechanical migrations unblocked.

**Smoke-test (engine-sheet, S191):** C93 cycle ran end-to-end. Pre-flight caught critical missing wiring — `runWorldCycle` block had no `Phase10-CommitLedger` call (S188 batch wired only `runCyclePhases_`); production entry would have silently dropped every staged ledger write. Closed commit `188ce5b`. Two function-name collisions in non-§5.6 paths surfaced (`loadActiveStorylines_` + `getCurrentCycle_`, same A4 pattern as `generateCitizensEvents_`); closed `2926e76`. Two cohort-C-equivalent migration debts surfaced — `generationalWealthEngine` + `educationCareerEngine` bypass `ctx.ledger`, get clobbered by Phase 10 commit. Logged as ENGINE_REPAIR Row 18.

**Cohort-C followup (engine-sheet, S200):** ENGINE_REPAIR Row 18 closed via Path (b) — all 4 cohort-C engines migrated to `ctx.ledger` in one batch: `householdFormationEngine` v1.2 (`a829c7f`), `generationalWealthEngine` v2.1 (`ed25ea8`), `educationCareerEngine` v2.1 (`7f95521`), `migrationTrackingEngine` v1.1 (`93cd3a4`). Plus `c589b0a` godWorldEngine2.js Session-30 stale rationale ×2 occurrences replaced with §5.6-aware note + commit pointers. Spec scope updated **18 → 22 SL writers + 5 readers** all routing through `ctx.ledger`. Side fix in `educationCareerEngine.detectCareerMobility_`: pre-fix gated SL write on `events > 0` so Mobility was computed every cycle but persisted only when a stagnation hook fired; v2.1 flips dirty unconditionally so Mobility always commits.

**Audit lesson (recorded in PHASE_42_PATTERNS A7):** the S185 §5.6.6 audit had grep'd file names instead of `process<thing>_` exposed function names — Apps Script flat-namespace dispatches by function name, not file name. 4 of 6 supposed "orphans" were live in the cycle path. Future cycle-path orphan checks must grep BOTH `<file-name>` AND `process<thing>_`.

**Clasp deploy (engine-sheet, S201):** cohort-C engines pushed live to Apps Script.

**C94 acceptance (operator-gated):** Mike fires `runWorldCycle()` in Apps Script; engine-sheet picks up post-cycle audit. SESSION_CONTEXT S203 §E enumerates 7 cohort-C ledger-routing checks: Income recalc lands (32% of citizens via fallback band), WealthLevel updates land per cycle, EducationLevel persists per cycle, CareerStage promotions land, CareerMobility flags land per-cycle (side-fix verification), HouseholdId backfill on new households, DisplacementRisk + MigrationIntent land. Engine_Errors should be clean of `Phase5-HouseholdFormation / Phase5-GenerationalWealth / Phase5-EducationCareer / Phase5-MigrationTracking / Phase10-CommitLedger`.

**Spec entry caveat:** spec entry A1 #8 `generateNamedCitizensEvents:715` confirmed orphan at S188 (zero cycle callers). Documented inline at `phase01-config/godWorldEngine2.js:1079`. Migration touched the file for completeness but the engine doesn't fire in normal cycle path.

## References

- **Canonical spec:** [[engine/PHASE_42_PATTERNS]] §5.6 (carries amendments inline + per-commit changelog)
- **Inventory:** [[engine/PHASE_42_INVENTORY]]
- **Parent plan:** [[plans/2026-04-28-phase-42-writer-consolidation]]
- **Original decision (a)/(b)/(c) trade-off:** Supermemory `mags/fTzSivJgpXmaBcB5vrPEn1`
- **Engine-sheet audit findings:** Supermemory `mags/2Lh8xsEHc6BMbBARM6mwHU`
- **Verified amendments + final spec:** Supermemory `mags/hQE4rREEWBpS9aS1g3mQ3M`
- **Implementation commits (S188):** `0e31e66`, `..6609c4a` (engine-sheet), `1a77e54` (research-build prerequisite-delete S185)
- **ROLLOUT entry:** [[engine/ROLLOUT_PLAN]] §Data & Pipeline — Phase 42
