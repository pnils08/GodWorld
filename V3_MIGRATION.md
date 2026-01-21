# GodWorld V3 Migration Plan
## Draft v0.5 - Canonical V3 Context Contract

**Created:** Jan 2026
**Authors:** Claude Code, Maker
**Status:** DRAFT - Migration strategy: Option C (Hybrid)
**Engine Version:** v2.10 (as of Jan 2026)
**Last Stable Cycle:** 73

---

## GOD WORLD ENGINE v3 – Target Context Contract (Clean-Slate Spec)

This document defines the v3 context (ctx) contract: the canonical in-memory shape, ownership rules, lifecycle, and invariants. The goal is deterministic, debuggable, scalable simulation execution in Google Apps Script, while keeping phase runners composable and safe to evolve.

### 1. Design Goals

- **Determinism:** identical inputs + cycleId ⇒ identical outputs (seeded RNG)
- **Explicit data ownership:** each engine writes to one domain; all other domains are read-only
- **Single-scan rule:** each sheet/tab read at most once per cycle; subsequent access via caches
- **Replay + Dry-run:** ability to recompute a cycle without persistence (for debugging and audits)
- **Observability:** structured audit trail, invariants, and phase timing
- **Compatibility:** supports incremental migration from v2.x by providing compatibility adapters

### 2. Principles & Rules

- **Domain Ownership Rule:** engine modules must declare the domain they own (e.g., 'population')
- **No Implicit Globals:** no mutation of arbitrary ctx keys; only via `ctx.<domain>` or `ctx.cache.*`
- **Write Boundaries:** persistence happens only in a dedicated persistence phase
- **Deterministic RNG:** no `Math.random()`; use `ctx.rng` only
- **Validation Gates:** phase entry validates required domains exist and meet invariants

### 3. Canonical ctx Shape (v3 Contract)

Below is the canonical ctx shape. Types are described informally to stay Apps Script-friendly.

```javascript
ctx = {
  // Core handles
  ss: Spreadsheet,                 // SpreadsheetApp.openById(...)
  config: Object,                  // loaded from World_Config

  // Time & determinism
  time: {
    now: Date,                     // real execution timestamp
    cycleId: number,               // integer cycle counter
    simDate: Date,                 // in-world calendar date
    tick: number                   // optional sub-cycle tick
  },

  // Feature flags & modes
  mode: {
    dryRun: boolean,               // compute but do not write to sheets
    replay: boolean,               // running a past cycleId
    strict: boolean,               // enable invariant enforcement and throws
    profile: boolean               // capture phase timings
  },

  // Randomness (deterministic)
  rng: function(): number,         // seeded RNG tied to cycleId (and optional salt)

  // World state (inputs for downstream engines)
  world: {
    season: "Winter"|"Spring"|"Summer"|"Fall",
    weather: { type: string, impact: number },
    holiday: string,
    holidayPriority: "none"|"minor"|"cultural"|"major"|"oakland",
    isFirstFriday: boolean,
    isCreationDay: boolean,
    sportsSeason: string,
    cityDynamics: {
      sentiment: number,
      publicSpaces: number,
      traffic: number,
      culturalActivity: number,
      communityEngagement: number
    },
    chaosEvents: Array<Object>      // world-level events for volatility
  },

  // Outputs by domain
  population: {
    totalPopulation: number,
    illnessRate: number,
    employmentRate: number,
    migration: number,
    economy: string,
    births: number,
    deaths: number
  },

  events: {
    worldEvents: Array<Object>,
    citizenEvents: Array<Object>,
    arcs: Array<Object>,
    hooks: Array<Object>,
    textures: Array<Object>
  },

  citizens: {
    named: Array<Object>,
    generic: Array<Object>,
    chicagoPool: Array<Object>
  },

  relationships: {
    bonds: Array<Object>,
    neighborhoods: Object
  },

  media: {
    output: Object|null,
    packet: Object|null,
    feedback: Object|null
  },

  // I/O caches (sheet reads, indexes)
  cache: {
    sheets: {
      // e.g. "World_Population": { header: [...], rows: [...] }
    },
    indexes: {
      ledgerByName: Object,         // key => row
      maxPopId: number
    }
  },

  // Persistence staging (write sets)
  persist: {
    updates: Array<Object>,         // normalized write intents
    logs: Array<Object>
  },

  // Audit & telemetry
  audit: {
    counters: {
      intakeProcessed: number,
      citizensUpdated: number,
      eventsGenerated: number
    },
    issues: Array<{ code: string, message: string, meta?: Object }>,
    phaseTimingsMs: Object          // phaseName => duration
  }
}
```

### 4. Lifecycle (Phase Runner Contract)

| Phase | Name | Responsibility |
|-------|------|----------------|
| 0 | Bootstrap | Open spreadsheet, initialize ctx, seed rng, set mode flags |
| 1 | Config & Time | Load config, advance cycleId, compute simDate/calendar flags |
| 2 | World State | Season, weather, sports, holidays, city dynamics |
| 3 | Population & Crisis | Update population + crisis models |
| 4 | Events | World + citizen events, arcs, prioritization |
| 5 | Citizens & Relationships | Generation, bonds, neighborhoods, roles, careers |
| 6 | Analysis | Patterns, shock monitor, digest, weights |
| 7 | Media | Build packet, feedback loop, media intake integration |
| 8 | Persistence | Apply ctx.persist write intents to sheets (or skip in dryRun) |
| 9 | Post | Finalize audit, emit logs, optionally snapshot ctx for replay |

### 5. Engine Module Interface

Each engine should follow a simple interface, enabling consistent auditing and validation.

```javascript
/**
 * Engine module contract (Apps Script-friendly)
 *
 * name: stable identifier
 * owns: ctx domain written by this engine (e.g., 'population')
 * requires: ctx domains that must exist before running
 * run(ctx): performs deterministic mutations ONLY within owns domain
 *           (and optionally ctx.audit / ctx.persist)
 */
const Engine = {
  name: 'updateWorldPopulation',
  owns: 'population',
  requires: ['time','world','config'],
  run: function(ctx) { ... }
};
```

### 6. Determinism & RNG Spec

- RNG must be seeded solely from `ctx.time.cycleId` plus optional stable salts (e.g., phaseName)
- Never use `Math.random()`
- Seed = `hash(cycleId + optional salt)`
- All randomness must use `ctx.rng()` or `ctx.rngFor('salt')` to avoid cross-engine coupling
- Optionally record the seed and salts used in `ctx.audit` for reproducibility

### 7. Caching & Single-Scan Rule

- All sheet reads go through `readSheet_(ctx, tabName)` which caches `{header, rows}`
- All sheet indexes (e.g., `ledgerByName`, `maxPopId`) are computed once and stored in `ctx.cache.indexes`
- Engines must not call `getDataRange().getValues()` directly unless inside `readSheet_`

### 8. Persistence (Write Intent Model)

Engines do not write to sheets directly. They create normalized write intents in `ctx.persist.updates`.

**Example write intent:**
```javascript
{
  tab: 'World_Population',
  kind: 'cell' | 'range' | 'append',
  address: { row: 2, col: 5 } | { a1: 'B2' } | { startRow, startCol, numRows, numCols },
  values: [[...]],
  reason: 'update population totals',
  domain: 'population'
}
```

The Persistence Phase is the only place that applies write intents. In `dryRun` mode, intents are retained but not executed.

**Batched Persistence Algorithm (`v3_persistence_batch.gs`):**
1. Group intents by sheet tab
2. Apply explicit range writes first (already optimized)
3. Merge individual cell writes into rectangular blocks via `buildCellBlocks_()`
   - Last-write-wins for duplicate (row, col)
   - Sort by row, col
   - Build contiguous row runs
   - Merge runs into rectangles when column spans match
4. Batch appends into single `setValues()` call
5. Respects `ctx.mode.dryRun` (skips execution)
6. Respects `ctx.mode.strict` (throws on missing sheet vs log-and-continue)

**Performance:** Reduces N individual `setValue()` calls to ~5-10 batched `setValues()` calls per sheet.

### 9. Validation & Invariants

| Invariant | Rule |
|-----------|------|
| Population non-negative | `population.totalPopulation >= 0` |
| Illness rate bounded | `0 <= population.illnessRate <= 0.15` |
| Employment rate bounded | `0 <= population.employmentRate <= 1` |
| Weather impact minimum | `world.weather.impact >= 0.5` (recommended) |
| Domain ownership | No domain writes outside of `engine.owns` |
| Write boundary | No sheet writes outside Persistence Phase |

### 10. Migration Path from v2.x

1. Add ctx domains alongside `ctx.summary` (compat period)
2. Create adapters: `hydrateWorldFromSummary_(ctx)` and `mirrorBackToSummary_(ctx)` while migrating engines
3. Migrate one engine at a time to read from `ctx.world` / `ctx.time` and write to its `owns` domain
4. Remove `ctx.summary` after all engines are migrated

---

## Migration Strategy

### Option A: Big Bang
- Build V3 engine in parallel (`v3_main.gs`, etc.)
- Port all engines at once
- Switch over when complete
- **Risk:** Long development, integration issues

### Option B: Incremental
- Keep v2.x running
- Port engines one-by-one to V3 patterns
- V3 scaffold calls V2 engines wrapped in adapters
- **Risk:** Adapter complexity, two systems in flight

### Option C: Hybrid ✓ SELECTED
- Build V3 scaffold now
- Run V3 in `dryRun` mode alongside V2
- Compare outputs, validate parity
- Cut over when confident
- **Risk:** Requires dual-run infrastructure

---

## Maker's Workflow Process

1. **Maker provides current script code** for review
2. **Migrate functions** to queued write pattern one at a time
3. **Test scaffold** with a few migrated functions
4. **Gradual rollout** - run new parallel to old until stable

---

## Migration Priority Tiers

### Tier 1: Foundation (v2.8-v2.10) ✓ COMPLETE
Crash prevention and infrastructure:

| Item | Status | Version |
|------|--------|---------|
| Sheets API caching layer | ✓ Done | v2.10 |
| Error handling wrapper | ✓ Done | v2.9 |
| Column bounds checking | ✓ Done | v2.8 |
| SHEET_NAMES constant | ✓ Done | v2.9 |
| Neighborhood dynamic loading | ✓ Done | bondEngine v2.3 |

### Tier 2: Atomic Persistence (V3 Core)
Functions that write directly to sheets need migration to `enqueueCellWrite_()`:

| Function | File | Status |
|----------|------|--------|
| `updateWorldPopulation_` | godWorldEngine2.js | ✓ Uses ctx.cache.queueWrite |
| `advanceWorldTime_` | godWorldEngine2.js | ✓ Uses ctx.cache.queueWrite |
| `loadConfig_` | godWorldEngine2.js | ✓ Uses ctx.cache (read-only) |
| `processIntake_` | processAdvancementIntake.js | ⬜ Pending |
| `saveV3Seeds_` | saveV3Seeds.js | ⬜ Pending |
| `v3LedgerWriter_` | v3LedgerWriter.js | ⬜ Pending |
| `v3DomainWriter_` | v3DomainWriter.js | ⬜ Pending |
| `bondPersistence_` | bondPersistence.js | ⬜ Pending |
| `finalizeWorldPopulation_` | finalizeWorldPopulation.js | ⬜ Pending |
| All `record*.js` files | Various | ⬜ Pending |

### Tier 3: V3 Full Features (Future)
- Seeded RNG (deterministic cycles)
- Domain-scoped context objects
- Replay/dry-run modes
- Invariant validation

---

## Migration Phases

### Phase 1: V3 Scaffold (No Engine Changes)
- [ ] Create `v3_main.gs` with `runWorldCycleV3()`
- [ ] Create `v3_phases.gs` with phase orchestration
- [ ] Create `v3_sheet_cache.gs` with `readSheet_()`
- [ ] Create `v3_write_intents.gs` with `enqueueCellWrite_()`
- [ ] Create `v3_utils.gs` with RNG, validation, helpers
- [ ] Test scaffold runs (empty phases)

### Phase 2: Port Phase 1-2 Engines
- [ ] Port `phaseConfigAndTime_` (already in scaffold)
- [ ] Port `phaseCalendarWorldState_` (season, weather, holidays)
- [ ] Port `phaseIndexesAndCaches_` (ledger indexing)

### Phase 3: Port Population Engine
- [ ] Port `phasePopulation_` (already in scaffold)
- [ ] Validate against v2.x outputs

### Phase 4: Port Citizen Engines
- [ ] `phaseGenericCitizens_`
- [ ] `phaseNamedCitizens_`
- [ ] `phaseChicagoCitizens_`

### Phase 5: Port Event Engines
- [ ] `phaseWorldEvents_`
- [ ] `phaseCitizenEvents_`
- [ ] `phaseArcs_`

### Phase 6: Port Relationship Engines
- [ ] `phaseBonds_`
- [ ] `phaseNeighborhoods_`

### Phase 7: Port Media Engines
- [ ] `phaseMediaBriefing_`
- [ ] `phaseMediaFeedback_`

### Phase 8: Persistence & Validation
- [ ] `phasePersistence_` (already in scaffold)
- [ ] `phasePost_` with full invariant checks

### Phase 9: Cutover
- [ ] Parallel run comparison
- [ ] Deprecate v2.x
- [ ] V3 goes live

---

## Appendix A – Minimal Bootstrap Skeleton (Reference)

```javascript
function runWorldCycleV3() {
  const ctx = bootstrapCtx_();
  runPhases_(ctx, [
    phaseConfigAndTime_,
    phaseWorldState_,
    phasePopulation_,
    phaseEvents_,
    phaseCitizensAndRelationships_,
    phaseAnalysis_,
    phaseMedia_,
    phasePersistence_,
    phasePost_
  ]);
}

function bootstrapCtx_() {
  const ss = SpreadsheetApp.openById('...');
  const now = new Date();
  const config = loadConfigFromSheet_(ss);

  const cycleId = Number(config.cycleCount || 0) + 1;

  return {
    ss,
    config,
    time: { now, cycleId, simDate: null, tick: 0 },
    mode: { dryRun: false, replay: false, strict: true, profile: true },
    rng: seededRng_(cycleId),
    world: {},
    population: {},
    events: {},
    citizens: {},
    relationships: {},
    media: {},
    cache: { sheets: {}, indexes: {} },
    persist: { updates: [], logs: [] },
    audit: {
      counters: { intakeProcessed: 0, citizensUpdated: 0, eventsGenerated: 0 },
      issues: [],
      phaseTimingsMs: {}
    }
  };
}
```

---

## Open Questions

1. **File organization** - One big `v3_main.gs` or split into multiple files per the scaffold?

2. **Backward compatibility** - Do we need to support v2.x cycles during migration?

3. **Testing spreadsheet** - Can we clone the sim sheet for V3 development?

4. **Chicago** - Is Chicago expansion part of V3, or a V3.1 follow-on?

5. **Deterministic validation** - How do we verify RNG determinism across cycles?

---

## Session Log

| Date | Session | Work Done | Next Steps |
|------|---------|-----------|------------|
| Jan 2026 | v0.1 | Created initial V3_MIGRATION.md | Await Maker input |
| Jan 2026 | v0.2 | Incorporated Maker's V3 scaffold architecture | Discuss migration strategy |
| Jan 2026 | v0.3 | Selected Option C (Hybrid), added batched persistence component | Add more components |
| Jan 2026 | v0.4 | Added Maker's workflow, migration tiers, function tracking | Begin Tier 2 migrations |
| Jan 2026 | v0.5 | Replaced architecture with canonical V3 Context Contract spec | Continue Tier 2 migrations |

---

## Files Reference

Maker's V3 scaffold concept defines:
- `v3_main.gs` - Entry point, bootstrap, phase list
- `v3_phases.gs` - Phase orchestration, individual phase functions
- `v3_sheet_cache.gs` - `readSheet_()`, `loadConfigFromSheet_()`
- `v3_write_intents.gs` - `enqueueCellWrite_()`
- `v3_utils.gs` - RNG, validation, helpers

---

## Current Status

**Phase:** Tier 1 Complete, Tier 2 In Progress
**Engine:** v2.10 with sheetCache caching layer
**Next Task:** Migrate remaining Tier 2 functions to queued writes
**Blockers:** None

---

*V3 = deterministic, write-intent, domain-isolated architecture*
