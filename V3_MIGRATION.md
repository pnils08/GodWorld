# GodWorld V3 Migration Plan
## Draft v0.2 - Incorporating Maker's V3 Architecture

**Created:** Jan 2026
**Authors:** Claude Code, Maker
**Status:** DRAFT - Architecture defined, migration strategy TBD

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

### Option C: Hybrid
- Build V3 scaffold now
- Run V3 in `dryRun` mode alongside V2
- Compare outputs, validate parity
- Cut over when confident
- **Risk:** Requires dual-run infrastructure

**Maker: Which approach fits your constraints?**

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

**Phase:** Pre-migration (architecture review)
**Next Task:** Decide migration strategy (A/B/C)
**Blockers:** None - awaiting direction

---

*V3 = deterministic, write-intent, domain-isolated architecture*
