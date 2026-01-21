# GOD WORLD ENGINE v3 - Architecture Reference

**Purpose:** Technical contract for v3 engine implementation.
**Companion:** See `ENGINE_ROADMAP.md` for implementation sequence.

---

## 1. Design Goals

- **Determinism:** identical inputs + cycleId = identical outputs (seeded RNG)
- **Explicit data ownership:** each engine writes to one domain; all other domains are read-only
- **Single-scan rule:** each sheet/tab read at most once per cycle; subsequent access via caches
- **Replay + Dry-run:** ability to recompute a cycle without persistence
- **Observability:** structured audit trail, invariants, and phase timing

---

## 2. Canonical ctx Shape

```javascript
ctx = {
  // Core handles
  ss: Spreadsheet,
  config: Object,

  // Time & determinism
  time: {
    now: Date,
    cycleId: number,
    simDate: Date,
    tick: number
  },

  // Feature flags & modes
  mode: {
    dryRun: boolean,
    replay: boolean,
    strict: boolean,
    profile: boolean
  },

  // Randomness (deterministic)
  rng: function(): number,

  // World state
  world: {
    season: "Winter"|"Spring"|"Summer"|"Fall",
    weather: { type: string, temp: number, impact: number, advisory: string },
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
    }
  },

  // Population domain
  population: {
    totalPopulation: number,
    illnessRate: number,
    employmentRate: number,
    migration: number,
    economy: string,
    births: number,
    deaths: number
  },

  // Neighborhoods domain
  neighborhoods: {
    // keyed by neighborhood ID
    "TEMESCAL": {
      students: number,
      adults: number,
      seniors: number,
      unemployed: number,
      sick: number
    }
    // ... etc
  },

  // Events domain
  events: {
    worldEvents: Array<Object>,
    citizenEvents: Array<Object>,
    arcs: Array<Object>,
    hooks: Array<Object>
  },

  // Citizens domain
  citizens: {
    named: Array<Object>,
    generic: Array<Object>,
    chicagoPool: Array<Object>
  },

  // Civic domain
  civic: {
    council: Array<Object>,
    initiatives: Array<Object>
  },

  // Media domain
  media: {
    roster: Array<Object>,
    output: Object|null,
    packet: Object|null
  },

  // I/O caches
  cache: {
    sheets: {},
    indexes: {
      ledgerByName: Object,
      maxPopId: number
    }
  },

  // Persistence staging
  persist: {
    updates: Array<Object>,
    logs: Array<Object>
  },

  // Audit & telemetry
  audit: {
    counters: {
      intakeProcessed: number,
      citizensUpdated: number,
      eventsGenerated: number
    },
    issues: Array<{ code: string, message: string }>,
    phaseTimingsMs: Object
  }
}
```

---

## 3. Phase Runner Contract

| Phase | Name | Responsibility |
|-------|------|----------------|
| 0 | Bootstrap | Open spreadsheet, initialize ctx, seed rng, set mode flags |
| 1 | Config & Time | Load config, advance cycleId, compute simDate/calendar |
| 2 | World State | Season, weather, sports, holidays, city dynamics |
| 3 | Population | Update population totals, demographics, crisis models |
| 4 | Events | World + citizen events, arcs, prioritization |
| 5 | Citizens | Generation, bonds, neighborhoods, roles, careers |
| 6 | Analysis | Patterns, shock monitor, digest, weights |
| 7 | Media | Build packet, feedback loop, journalist assignment |
| 8 | Civic | Council state, initiative resolution |
| 9 | Persistence | Apply ctx.persist write intents (or skip in dryRun) |
| 10 | Post | Finalize audit, emit logs |

---

## 4. Engine Module Interface

Each engine declares what it owns and requires:

```javascript
const Engine = {
  name: 'updateNeighborhoodDemographics',
  owns: 'neighborhoods',
  requires: ['time', 'population', 'citizens'],
  run: function(ctx) { /* mutations only within owns domain */ }
};
```

---

## 5. RNG Spec

- Seed from `ctx.time.cycleId` plus optional stable salts
- Never use `Math.random()`
- All randomness via `ctx.rng()` or `ctx.rngFor('salt')`
- Record seed in `ctx.audit` for reproducibility

```javascript
function seededRng_(seed) {
  let state = hashInt32_(seed);
  return function() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xFFFFFFFF;
  };
}
```

---

## 6. Caching & Single-Scan Rule

- All sheet reads through `readSheet_(ctx, tabName)` which caches `{header, rows}`
- Indexes computed once, stored in `ctx.cache.indexes`
- No direct `getDataRange().getValues()` outside caching layer

---

## 7. Write-Intents Model

Engines do not write to sheets directly. They create write intents:

```javascript
{
  tab: 'Neighborhood_Demographics',
  kind: 'cell' | 'range' | 'append',
  address: { row: 2, col: 5 },
  values: [[...]],
  reason: 'update Temescal demographics',
  domain: 'neighborhoods'
}
```

Persistence phase applies all intents. In `dryRun` mode, intents are logged but not executed.

---

## 8. Invariants

| Rule | Validation |
|------|------------|
| Population non-negative | `population.totalPopulation >= 0` |
| Illness rate bounded | `0 <= population.illnessRate <= 0.15` |
| Employment rate bounded | `0 <= population.employmentRate <= 1` |
| Demographics sum to 100% | Per-neighborhood age groups sum correctly |
| Domain ownership | No writes outside `engine.owns` |
| Write boundary | No sheet writes outside Persistence Phase |

---

## 9. Mode Flags

| Flag | Purpose |
|------|---------|
| `dryRun` | Compute full cycle, skip all writes |
| `replay` | Re-run past cycleId with same seed |
| `strict` | Throw on invariant violations (vs log-and-continue) |
| `profile` | Capture phase timings in `ctx.audit.phaseTimingsMs` |

---

*This document defines HOW to build. See ENGINE_ROADMAP.md for WHAT to build.*
