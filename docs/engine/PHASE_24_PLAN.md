# Phase 24: Citizen Life Engine — Implementation Plan

**Created:** Session 85 (2026-03-08)
**Source specs:** `~/.claude/batches/results/media-clock-mode_phase24.md`, `event-cap-audit_phase24.md`, `context-aware-inputs_phase24.md`
**Engine version:** v3.1 | Cycle: 86 | GAS-based (Google Apps Script)

---

## Phase 0: Documentation Discovery (Complete)

### Allowed APIs & Patterns

**Event generator pattern** (follow `generateCivicModeEvents.js` as template):
```javascript
function generateMediaModeEvents_(ctx) {
  var ss = ctx.ss;
  var ledger = ss.getSheetByName('Simulation_Ledger');
  var rows = ledger.getDataRange().getValues();
  var headers = rows[0];
  // ... idx() for column lookup, clock mode filter, event pool, write-intents
}
```

**Write-intent API** (`utilities/writeIntents.js`):
- `queueRangeIntent_(ctx, tab, startRow, startCol, values, reason, domain, priority)`
- `queueBatchAppendIntent_(ctx, tab, rows, reason, domain, priority)`
- Always use with fallback: `if (typeof queueRangeIntent_ === 'function') { ... } else { direct setValues }`

**RNG** (`utilities/cycleModes.js`):
- `ctx.rng()` — seeded LCG, returns 0-1 float
- Never use `Math.random()` in engine code

**LifeHistory format** (append to existing text in column):
```
YYYY-MM-DD HH:MM — [Tag] Event text (Cycle N)
```

**TraitProfile format** (pipe-delimited, read-only in event generators):
```
Archetype:Watcher|Mods:curious,steady|reflective:0.73|social:0.45|...
```

**Engine router** (`phase01-config/godWorldEngine2.js`):
- No central switch — each generator called sequentially via `safePhaseCall_()`
- New generator added as new `safePhaseCall_()` line after CivicModeEvents

### Key File Locations

| File | Purpose | Lines |
|------|---------|-------|
| `phase05-citizens/generateMediaModeEvents.js` | **MEDIA mode events — BUILT S94** | v1.0, filter at MEDIA |
| `phase04-events/generationalEventsEngine.js` | Health/aging/milestones — ENGINE+CIVIC only | 163-395, filter at 244 |
| `phase04-events/generateGenericCitizenMicroEvent.js` | Daily micro-events — ENGINE only | 21-498, filter at 404, rates at 411-414 |
| `phase04-events/generateGameModeMicroEvents.js` | Game-mode events — GAME only | 34-580, filter at 484 |
| `phase05-citizens/generateCivicModeEvents.js` | Civic events — CIVIC only | 36-530, filter at 394 |
| `phase01-config/godWorldEngine2.js` | Engine orchestrator | 181-199 (Phase 5 calls) |
| `utilities/writeIntents.js` | Write-intent queue API | 1-411 |
| `utilities/compressLifeHistory.js` | LifeHistory compression + TraitProfile | 1-796 |
| `utilities/cycleModes.js` | ctx.rng seeded RNG | 44-65 |
| `utilities/sheetNames.js` | Sheet tab registry | 15-87 |

### Anti-Patterns

- Do NOT use `Math.random()` — always `ctx.rng()`
- Do NOT create new sheets without `ensure*` idempotent pattern
- Do NOT write directly to sheets — use write-intents with fallback
- Do NOT modify TraitProfile in event generators — that's Phase 9 (`compressLifeHistory_`)
- Do NOT add new columns to Simulation_Ledger without updating `ensureSchema*` utilities
- LIFE mode currently has ZERO processing — 25 citizens. Any fix must account for them.

### Existing Sheet Tabs Available

- `Neighborhood_Map` — neighborhood metadata (exists)
- `Neighborhood_Demographics` — 7 columns, 17 neighborhoods (exists)
- `Simulation_Ledger` — has `Neighborhood`, `Occupation`, `BirthYear`, `Tier`, `ClockMode`, `LifeHistory`, `TraitProfile` columns
- `LifeHistory_Log` — exists but optional/inconsistently used
- `Story_Hook_Deck` — exists (narrative seeds)
- `Media_Ledger` — exists (published story tracking)

### Sheets That Do NOT Exist Yet (proposed by batch specs)

- `Media_Event_Fatigue` — cooldown tracking per citizen per event tag
- `Source_Network` — journalist-source relationships
- `Story_Hooks` — active story tracking with heat scores (distinct from Story_Hook_Deck)

---

## Phase 1: P0 Quick Wins — Fix the Narrative Inversion

**Goal:** 10x more life events for T1-T2 citizens. 2 hours of work, 60% of the impact.
**Session estimate:** 1 session
**Depends on:** Nothing

### 1.1 Fix generationalEventsEngine.js — Process ALL Clock Modes

**What:** Remove the ENGINE+CIVIC gate so all citizens age, get sick, have birthdays, and die regardless of clock mode.

**File:** `phase04-events/generationalEventsEngine.js`
**Line 244:** Change `if (mode !== "ENGINE" && mode !== "CIVIC") continue;`
**To:** Remove this line entirely, or replace with a comment explaining all modes now process.

**Why:** 35 T1-T2 citizens in GAME and LIFE modes don't age. Biology doesn't care about clock mode.

**Verification:**
- [ ] Grep for `mode !== "ENGINE" && mode !== "CIVIC"` — should be gone
- [ ] Run a dry-run cycle — GAME and LIFE citizens should appear in generational event output
- [ ] Spot-check: a GAME-mode T1 citizen (athlete) should get health events

### 1.2 Raise Generic Micro-Event Rates for T1-T2

**What:** Increase probability gates so T1-T2 ENGINE citizens get meaningful event rates.

**File:** `phase04-events/generateGenericCitizenMicroEvent.js`
**Lines 411-414:** Change rates:
```javascript
// CURRENT:
if (tier <= 1) chance = 0.008;      // 0.8%
else if (tier === 2) chance = 0.015; // 1.5%
else chance = 0.03;                  // 3%

// PROPOSED:
if (tier <= 1) chance = 0.50;        // 50% — T1 should feel alive every cycle
else if (tier === 2) chance = 0.25;  // 25% — T2 regular texture
else chance = 0.10;                  // 10% — T3-4 ambient depth
```

**Why:** T1 citizens currently get 0.12 events/cycle. At 50%, they'll average ~0.5 events from this generator alone, plus generational events from 1.1.

**Verification:**
- [ ] Run dry-run cycle, count events per tier
- [ ] T1 should average 1-2 events/cycle (micro + generational combined)
- [ ] T4 event count should not increase significantly
- [ ] Total event budget should stay under ~300/cycle

### 1.3 Fix LIFE Mode — Allow Generic Micro-Events

**What:** Remove or relax the ENGINE-only gate in generateGenericCitizenMicroEvent.js so LIFE-mode citizens also get micro-events.

**File:** `phase04-events/generateGenericCitizenMicroEvent.js`
**Line 404:** Change `if (mode !== "ENGINE") continue;`
**To:** `if (mode !== "ENGINE" && mode !== "LIFE") continue;`

**Why:** 25 LIFE-mode citizens (including T1-T2) currently get ZERO events of any kind. This is the most critical dead zone.

**Verification:**
- [ ] LIFE-mode citizens appear in micro-event output
- [ ] Combined with 1.1, LIFE-mode citizens now get generational + micro-events

---

## Phase 2: Unified Event Dispatcher — tierEventScheduler.js

**Goal:** Central budget control for event distribution across all tiers. Replaces per-generator probability with explicit tier budgets.
**Session estimate:** 2-3 sessions
**Depends on:** Phase 1 (quick wins deployed and verified)

### 2.1 Build tierEventScheduler.js

**What:** New file in `phase04-events/tierEventScheduler.js`. Orchestration layer that:
1. Loads all citizens with tier + clock mode
2. Computes event slots per citizen based on tier budget
3. For each slot, delegates to the appropriate existing generator
4. Enforces total event cap

**Pattern to follow:** `generateCivicModeEvents.js` for structure, but this file calls OTHER generators instead of building its own pool.

**Budget constants:**
```javascript
var TIER_BUDGET = {
  1: { perCitizen: 3.0, slots: ['BODY', 'HEART', 'WORLD'], min: 2, max: 5 },
  2: { perCitizen: 1.5, slots: ['BODY_OR_HEART', 'WORLD'], min: 1, max: 3 },
  3: { perCitizen: 0.5, slots: ['ANY'], min: 0, max: 2 },
  4: { perCitizen: 0.16, slots: ['ANY'], min: 0, max: 1 }
};
```

**Slot-to-generator routing:**
- BODY → `runGenerationalEngine_` health subset (aging, illness, recovery)
- HEART → relationship/social events (new pool or subset of generic micro)
- WORLD → mode-aware: ENGINE→generic, GAME→game, CIVIC→civic, MEDIA→media, LIFE→generic

**Write-intent pattern:** Use `queueRangeIntent_()` + `queueBatchAppendIntent_()` with fallback.

**Key design decisions:**
- Existing generators become callable libraries (export their pool-building functions)
- The scheduler replaces autonomous scheduling, not the event pool content
- T1 citizens are processed FIRST (guaranteed slots before budget cap)

**Verification:**
- [ ] T1 citizens get 2-5 events/cycle, never zero
- [ ] T2 citizens get 1-3 events/cycle
- [ ] Total events/cycle is 200-300 (bounded)
- [ ] T1:T4 per-capita ratio is ~19:1
- [ ] All existing event types still fire (no regression)

### 2.2 Integrate Scheduler into Engine Pipeline

**What:** Add `safePhaseCall_()` to `godWorldEngine2.js`. The scheduler runs BEFORE individual generators, pre-allocating slots. Individual generators check whether slots were pre-allocated and defer to the scheduler's budget.

**File:** `phase01-config/godWorldEngine2.js`
**After line 181 (Phase 5a):** Add:
```javascript
safePhaseCall_(ctx, 'Phase5-TierEventScheduler', function() { runTierEventScheduler_(ctx); });
```

**Transition strategy:** Phase 1 quick wins stay in place as fallback. The scheduler layer is additive — if it's not loaded, generators run autonomously with Phase 1 rates. This allows incremental rollout.

**Verification:**
- [ ] Engine runs without errors with scheduler enabled
- [ ] Engine runs without errors with scheduler disabled (fallback to Phase 1 behavior)
- [ ] Event count report logged at end of Phase 5

### 2.3 Post-Cycle Audit Function

**What:** `auditCycleEvents_(ctx)` — runs at end of Phase 5, logs event distribution by tier. Alerts if any T1 citizen got zero events.

**File:** Add to `tierEventScheduler.js` or new `utilities/eventAudit.js`

**Output:** Writes to `Engine_Errors` sheet if T1 zero-event detected.

**Verification:**
- [ ] Audit report appears in cycle log
- [ ] Alert fires correctly when T1 citizen has zero events (test with dry-run)

---

## Phase 3: MEDIA Clock Mode — generateMediaModeEvents.js

**Goal:** Fourth clock mode for journalist/media citizens. Rich, contextual events drawn from 7 event pools with fatigue cooldowns and personality modulation.
**Session estimate:** 3-4 sessions
**Depends on:** Phase 2 (scheduler provides budget framework)

### 3.1 Migrate Eligible Citizens to MEDIA Mode

**What:** Update ClockMode on Simulation_Ledger for journalist citizens. Eligibility criteria from batch spec:
- role_tag contains JOURNALIST, EDITOR, REPORTER, COLUMNIST, PHOTOGRAPHER, PRODUCER
- Currently in GAME mode with MED flag
- 8 OakTown Echo journalists: POP-00773 through POP-00780

**How:** Node.js script using `lib/sheets.js` to update ClockMode column. Not an engine change — one-time data migration.

**Verification:**
- [ ] `queryLedger.js` confirms 8 citizens now in MEDIA mode
- [ ] No citizens accidentally migrated (check role_tag filter)
- [ ] Engine still runs — MEDIA citizens currently just get micro-events from Phase 1 fallback

### 3.2 Build generateMediaModeEvents.js

**What:** New file in `phase05-citizens/generateMediaModeEvents.js`. Pattern follows `generateCivicModeEvents.js`.

**Clock mode gate:** `if (mode !== "MEDIA") continue;`

**7 Event Pools (from batch spec):**
1. DEADLINE_PRESSURE — stress, rhythm, stakes of publishing
2. SOURCE_DEVELOPMENT — building/losing source relationships
3. EDITORIAL_TENSION — internal outlet politics
4. BEAT_DISCOVERY — finding unexpected stories
5. COVERAGE_FATIGUE — burnout, disillusionment
6. BEAT_REACTION — reacting to simulation outcomes (game results, votes, arcs)
7. VOICE_AND_IDENTITY — journalist as person, evolving perspective

**Pool 8 (HEALTH_LIFECYCLE)** is handled by the shared generational engine (already fixed in Phase 1).

**Event selection algorithm:**
1. Filter pools by trigger condition (ctx state)
2. Filter events by `requires` conditions
3. Check fatigue cooldown (needs new tracking — see 3.3)
4. Apply weight modifiers (arc tension, fatigue level, sports season, tier)
5. Weighted random selection up to tier-based cap
6. Personality modulation via TraitProfile (string replacement, not LLM)
7. Append to LifeHistory column

**Event caps (MEDIA-specific):**
- T1-T2: 2 MEDIA events + 1 health = 3 total
- T3: 1 MEDIA event + 1 health = 2 total
- T4: 1 MEDIA event every other cycle

**Context assembly** (runs before event selection):
- `beat` — from new `beat_primary` field or inferred from role_tag
- `storyHooks` — from Story_Hook_Deck sheet, filtered by beat
- `mediaFeedback` — from Media_Ledger (recent publish count, audience reception)
- `sourceNetwork` — initially empty, built over cycles by side effects
- `outletDynamics` — hardcoded for Bay Tribune initially
- `arcs` — from ctx.summary.eventArcs
- `traitProfile` — parsed from TraitProfile column

**Write-intent pattern:** `queueRangeIntent_()` + `queueBatchAppendIntent_()` with fallback.

**Verification:**
- [ ] MEDIA citizens generate 1-3 events/cycle
- [ ] Events reference actual story hooks from Story_Hook_Deck
- [ ] Different pools selected when cap > 1 (variety enforcement)
- [ ] Non-MEDIA citizens unaffected
- [ ] LifeHistory entries tagged with `[MEDIA]` or `[MEDIA-Deadline]` etc.

### 3.3 Fatigue Cooldown Tracking

**What:** Track which event templates have recently fired for each citizen, preventing repetition.

**Two options (decide at implementation time):**

**Option A — Sheet-based (simpler, matches GAS architecture):**
- New sheet: `Media_Event_Fatigue` with columns: `CitizenId, FatigueTag, LastFiredCycle, FireCount`
- `ensure*` function creates it if missing
- Queried at event selection time, updated via write-intent after selection

**Option B — LifeHistory-based (no new sheet):**
- Parse recent LifeHistory entries to extract fatigue tags
- Slower but no schema change
- Less precise (depends on LifeHistory not being compressed away)

**Recommendation:** Option A for reliability. The sheet is small (citizens x tags, maybe 200 rows) and fits the existing pattern.

**Verification:**
- [ ] Same event template doesn't fire for same citizen within cooldown window
- [ ] Cooldown resets correctly after enough cycles pass
- [ ] Sheet stays bounded (old entries cleaned up)

### 3.4 Engine Router Integration

**What:** Add MEDIA mode to godWorldEngine2.js pipeline.

**File:** `phase01-config/godWorldEngine2.js`
**After CivicModeEvents call:** Add:
```javascript
safePhaseCall_(ctx, 'Phase5-MediaModeEvents', function() { generateMediaModeEvents_(ctx); });
```

**Processing exclusions (MEDIA mode does NOT get):**
- Random career changes (journalists don't randomly become bakers)
- Migration (anchored to outlet/city)
- Random economics events (no "found $20" noise)
- Generic micro-events (replaced by contextual MEDIA pools)

**Verification:**
- [ ] MEDIA citizens get MEDIA events, not generic micro-events
- [ ] MEDIA citizens still get generational health events (from Phase 1 fix)
- [ ] MEDIA citizens do NOT get career engine processing
- [ ] Engine completes without errors

---

## Phase 4: Context-Aware Life Events

**Goal:** Events consider neighborhood, income, time-of-day, weather, and family status. Applies to ALL clock modes, not just MEDIA.
**Session estimate:** 3-4 sessions
**Depends on:** Phase 1 (rates fixed), Phase 3 partially (MEDIA pools show the pattern)

### 4.1 Neighborhood Flavor Profiles

**What:** Data file defining 12 Oakland neighborhoods with thematic tags and weights.

**New file:** `phase04-events/neighborhoodProfiles.js`
**Content:** Object mapping neighborhood names to:
- `themes[]` — thematic tags (e.g., Fruitvale: ["community", "transit-hub", "cultural-latinx"])
- `nightlifeWeight` — 0-1 float
- `density` — population density modifier
- `gentrificationPressure` — "low" | "rising" | "high" | "advanced"
- `transitHubs[]` — BART stations, bus stops
- `landmarks[]` — parks, venues, streets

**Scoring formula:** Events tagged with themes that overlap citizen's neighborhood get weight boost:
```javascript
var score = countOverlap(event.tags, neighborhood.themes) * neighborhood.density;
```

**Neighborhoods to define (from batch spec + existing Neighborhood_Demographics):**
Downtown/Uptown, Temescal, West Oakland, Fruitvale, Jack London Square, Rockridge, Lake Merritt/Adams Point, Chinatown, East Oakland, Piedmont Avenue, Grand Lake, San Antonio

**Verification:**
- [ ] Each neighborhood has at least 3 themes
- [ ] Fruitvale citizen gets community/transit events more often than waterfront events
- [ ] Scoring function is deterministic (uses ctx.rng)

### 4.2 Income-Tier Event Gates

**What:** Income-based event gating. Citizens below a threshold can't access "fine dining" events; citizens above a threshold don't get "rent worry" events.

**Implementation:** Derive income tier from `Occupation` + `Tier` (no Income column exists yet on ledger):
```javascript
function getIncomeTier(citizen) {
  // Infer from occupation and tier
  // T1-T2 with professional occupation = comfortable/affluent
  // T3-T4 with service occupation = low/moderate
  // Unemployed = poverty
}
```

**5 tiers:** POVERTY (<$25K), LOW ($25-50K), MODERATE ($50-90K), COMFORTABLE ($90-150K), AFFLUENT ($150K+)

**Gate examples:**
- Fine dining: MODERATE+ only
- BART commute with cost anxiety: POVERTY-LOW only
- Side hustle events: POVERTY-LOW only
- Rent worry: when economicMood < threshold, scales by income tier

**Verification:**
- [ ] Low-income citizens never get "artisanal pour-over" events
- [ ] Affluent citizens never get "rent worry" events
- [ ] Income tier derivation produces reasonable distribution across population

### 4.3 Time-of-Day Event Pools

**What:** Morning, Afternoon, Evening pools with different context inputs.

**Implementation:** Each micro-event generation call gets a time slot (randomized per citizen per cycle using ctx.rng). Time slot determines which sub-pool to draw from.

**Pools (from batch spec):**
- MORNING (6am-11am): commute, school dropoff, exercise, gig hustle, anxiety
- AFTERNOON (11am-5pm): lunch, protest, park, errands, gallery, sports buzz
- EVENING (5pm-11pm): First Friday, bars, family dinner, game watch, lake walk, side gig

**Context inputs per slot:**
- Morning: weather, transitMetrics, economicMood
- Afternoon: weather, culturalActivity, sportsSeason, crisisBuckets
- Evening: weather, nightlife, sportsFeed, holiday, crimeMetrics

**Verification:**
- [ ] Events reference appropriate time-of-day context
- [ ] Weather blocks outdoor events during heavy rain
- [ ] First Friday events only fire when `ctx.summary.isFirstFriday === true`

### 4.4 Family Status Modifiers

**What:** Family status reshapes event probability distribution.

**Family contexts (from batch spec):**
- Young parent (youngest child < 6): nightlife 0.1x, family 2.0x, evening 70% home-based
- School parent (children 6-17): school events 1.5x, youth sports 1.2x
- Young single (18-30, no children): nightlife 1.8x, dating 1.3x
- Middle single/coupled (31-54): career 1.3x, cultural 1.3x
- Empty nester (55+, adult children): reflective 1.6x, health 1.4x, nostalgia 1.4x
- Elderly (70+): health 2.0x, nightlife 0.05x, weather sensitivity 1.8x

**Implementation:** Derive family context from existing ledger fields:
- `BirthYear` → age
- `ChildrenIds` or household data → has children, child ages
- `MaritalStatus` or household → single/coupled

**Verification:**
- [ ] 75-year-old citizen doesn't go clubbing
- [ ] Parent with toddler gets mostly home-based evening events
- [ ] Young single gets nightlife and dating events

### 4.5 Weather Integration

**What:** Weather data (already in `ctx.summary.weather`) modifies event selection.

**Rules:**
- `heavy_rain` blocks outdoor events (park, lake walk, community garden)
- `extreme_heat` blocks physical activity, boosts splash pad/AC events
- `fog` adds atmospheric flavor text to outdoor events
- Temperature thresholds affect event descriptions (not just eligibility)

**Implementation:** Add `weatherBlock` field to event templates. Selection algorithm skips events whose weatherBlock matches current weather.

**Verification:**
- [ ] No outdoor events during heavy rain
- [ ] Fog events only fire when weather.type includes fog
- [ ] Indoor events (bars, home, office) unaffected by weather

---

## Phase 5: Integration, Testing, and Monitoring

**Goal:** End-to-end verification, monitoring, and documentation.
**Session estimate:** 1-2 sessions
**Depends on:** Phases 1-4

### 5.1 Dry-Run Cycle Validation

**What:** Run engine in dry-run mode (`ctx.mode.dryRun = true`) and validate event distribution.

**Checks:**
- [ ] T1 citizens: 2-5 events each, zero-event count = 0
- [ ] T2 citizens: 1-3 events each, zero-event rate < 20%
- [ ] T3 citizens: ~50% get an event
- [ ] T4 citizens: ~16% get an event
- [ ] Total events: 200-300 range
- [ ] T1:T4 per-capita ratio: ~19:1
- [ ] MEDIA citizens get MEDIA-tagged events
- [ ] LIFE citizens get micro + generational events
- [ ] No duplicate events (same template same citizen same cycle)
- [ ] Events reference real neighborhoods, not placeholders
- [ ] Weather blocking works correctly

### 5.2 Update ENGINE_MAP.md

**What:** Add new functions to the engine map:
- `runTierEventScheduler_(ctx)` — Phase 5, tier-aware event dispatcher
- `generateMediaModeEvents_(ctx)` — Phase 5, MEDIA clock mode events
- `auditCycleEvents_(ctx)` — Phase 5 post-processing, event distribution report

### 5.3 Update ROLLOUT_PLAN.md

**What:** Mark Phase 24 sub-phases complete as they ship:
- 24.1 MEDIA Clock Mode → Complete
- 24.2 Tier Event Cap → Complete
- 24.3 Context-Aware Life Events → Complete
- 24.4 Daily Simulation Trigger → Deferred (separate phase)

### 5.4 Update SESSION_CONTEXT.md

**What:** Add version bumps for modified files:
- `generationalEventsEngine.js` v2.0 (all-mode processing)
- `generateGenericCitizenMicroEvent.js` v3.0 (tier-aware rates + LIFE mode)
- `tierEventScheduler.js` v1.0 (new)
- `generateMediaModeEvents.js` v1.0 (new)
- `neighborhoodProfiles.js` v1.0 (new)

---

## Execution Order Summary

| Phase | Sessions | Risk | Impact |
|-------|----------|------|--------|
| **Phase 1: P0 Quick Wins** | 1 | Low — 3 line changes in existing files | 60% of problem solved |
| **Phase 2: Unified Dispatcher** | 2-3 | Medium — new orchestration layer | Central budget control |
| **Phase 3: MEDIA Clock Mode** | 3-4 | Medium — new generator + schema | Rich journalist events |
| **Phase 4: Context-Aware Inputs** | 3-4 | Low-Medium — additive data layer | All citizens get textured events |
| **Phase 5: Integration** | 1-2 | Low — verification + docs | Confidence + monitoring |

**Total: 10-14 sessions**

Phase 1 should ship immediately — it's 3 line changes that solve 60% of the narrative inversion problem. Phases 2-4 can be sequenced or partially parallelized (Phase 4 neighborhood profiles are independent of Phase 3 MEDIA pools).

---

## Dependencies & Blockers

| Dependency | Status | Impact |
|------------|--------|--------|
| Phase 22.2 — Arc engine fix (arcs stuck at "early") | In progress | Phase 4 BEAT_REACTION events need working arcs |
| Simulation_Ledger schema | Stable | No new columns needed for Phase 1-2. Phase 3 may need `beat_primary`. Phase 4 may need `IncomeTier`. |
| Story_Hook_Deck sheet | Exists | MEDIA events reference story hooks — verify data is populated |
| Media_Ledger sheet | Exists | MEDIA feedback context needs recent publish data |
| LifeHistory compression | Working (Phase 9) | New event tags must be added to `compressLifeHistory.js` tag map |

---

## What Phase 24 Does NOT Include

- **24.4 Daily Simulation Trigger** — deferred to separate phase (requires 24.1-24.3 stable first)
- **Cross-citizen relationship events** (T1 citizen A's event affects T1 citizen B) — Phase 2 P2 item, not P0/P1
- **Event history awareness** (avoid narrative repetition across cycles) — Phase 2 P2 item
- **Source_Network table** — deferred until MEDIA mode proves value. Use LifeHistory references initially.
- **FAITH clock mode** — explicitly out of scope per batch spec
