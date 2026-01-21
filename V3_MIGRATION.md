# GodWorld V3 Migration Plan
## Draft v0.4 - Maker's Workflow + Migration Priorities

**Created:** Jan 2026
**Authors:** Claude Code, Maker
**Status:** DRAFT - Migration strategy: Option C (Hybrid)
**Engine Version:** v2.10 (as of Jan 2026)
**Last Stable Cycle:** 73

---

## V3 Architecture (Maker's Design)

### Core Principles

1. **Deterministic Cycles**
   - Seeded RNG (`seededRng_()` using Park-Miller LCG)
   - Domain-specific salts via `ctx.rngFor(salt)`
   - Same cycle ID = same outputs (enables replay/debugging)

2. **Write-Intents Model**
   - Engines NEVER write directly to sheets
   - All writes go through `enqueueCellWrite_()` / `enqueueRangeWrite_()`
   - Single `phasePersistence_()` executes all writes
   - Enables dry-run mode, audit trails, batching

3. **Single-Scan Sheet Cache**
   - `readSheet_()` loads entire sheet once, caches in `ctx.cache.sheets`
   - Eliminates redundant API calls
   - Enforces read discipline

4. **Domain Isolation**
   - Engines read from `ctx.<domain>` and write ONLY to their owned domain
   - Clear data ownership prevents cross-contamination
   - Example: population engine owns `ctx.population`, writes only population intents

5. **Mode Flags**
   - `dryRun` - Queue writes but don't execute (testing)
   - `replay` - Re-run historical cycle (debugging)
   - `strict` - Throw on errors vs log-and-continue
   - `profile` - Track phase timings

6. **Invariant Validation**
   - `validateInvariants_()` checks domain constraints post-cycle
   - Catches bad data before it persists

---

## V3 ctx Contract

```javascript
ctx = {
  ss,                    // Spreadsheet reference
  config,                // World_Config key-value pairs

  time: { now, cycleId, simDate, tick },

  mode: { dryRun, replay, strict, profile },

  rng,                   // Seeded RNG for this cycle
  rngFor(salt),          // Domain-specific RNG

  world: {               // World state (owned by calendar/weather engines)
    season, weather, holiday, holidayPriority,
    isFirstFriday, isCreationDay, sportsSeason,
    cityDynamics, chaosEvents
  },

  population: {},        // Owned by population engine

  events: {              // Owned by event engines
    worldEvents, citizenEvents, arcs, hooks, textures
  },

  citizens: {            // Owned by citizen engines
    named, generic, chicagoPool
  },

  relationships: {       // Owned by bond/neighborhood engines
    bonds, neighborhoods
  },

  media: {               // Owned by media engines
    output, packet, feedback
  },

  cache: {               // Read cache (managed by readSheet_)
    sheets, indexes
  },

  persist: {             // Write intents (consumed by phasePersistence_)
    updates, logs
  },

  audit: {               // Diagnostics
    counters, issues, phaseTimingsMs
  }
}
```

---

## V3 Phase Structure

```javascript
runPhases_(ctx, [
  phaseConfigAndTime_,        // Load config, advance cycle
  phaseCalendarWorldState_,   // Season, weather, holidays
  phaseIndexesAndCaches_,     // Build ledger indexes
  phasePopulation_,           // Population dynamics
  // ... citizen engines ...
  // ... event engines ...
  // ... media engines ...
  phasePersistence_,          // Execute all write intents
  phasePost_,                 // Invariant validation, audit
]);
```

---

## V3 Component Details

### Batched Persistence (`v3_persistence_batch.gs`)

Optimized write execution that minimizes API calls.

**Intent Types:**
```javascript
// Single cell
{ kind: 'cell', tab: 'World_Config', address: { row: 5, col: 2 }, value: 'newValue' }

// Range (pre-batched by caller)
{ kind: 'range', tab: 'Citizens', address: { startRow: 2, startCol: 1, numRows: 10, numCols: 5 }, values: [[...]] }

// Append row
{ kind: 'append', tab: 'Event_Log', values: [['timestamp', 'event', 'details']] }
```

**Algorithm:**
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

**Key Functions:**
- `phasePersistence_(ctx)` - Main entry point
- `groupUpdatesByTab_(updates)` - Organize by sheet
- `buildCellBlocks_(cellUpdates)` - Merge cells into rectangles
- `applyCellBlocks_(sheet, blocks)` - Execute with `setValues()`
- `enqueueRangeWrite_(ctx, tab, startRow, startCol, values2d, reason, domain)` - Helper

**Performance:** Reduces N individual `setValue()` calls to ~5-10 batched `setValues()` calls per sheet.

---

## Migration Strategy

### Option A: Big Bang
- Build V3 engine in parallel (`v3_main.gs`, etc.)
- Port all engines at once
- Switch over when complete
- **Risk:** Long development, integration issues

### Option B: Incremental (Recommended?)
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
