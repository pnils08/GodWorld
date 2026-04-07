# Engine Connectivity Rollout — Phase 34

**Source:** S136 full-pipeline audit (4 agents, all 11 phases)
**Created:** 2026-04-07
**Status:** Active — work items ready

---

## What This Is

S136 audited every ctx.summary field read and write across all 11 engine phases. Found broken feedback loops, orphaned fields, dead writes, and missing persistence. This document is the fix list.

---

## 34.1 — Persist previousCycleState (PRIORITY 1)

**Problem:** Phase 9 `finalizeCycleState` writes `S.previousCycleState` with shock flag, pattern flag, recovery level, civic load, active cooldowns, cycle weight. Phase 6 `applyShockMonitor` reads it next cycle. But it's **in-memory only** — never saved to PropertiesService or sheets. If the spreadsheet closes between cycles, all cross-cycle state is lost.

**What breaks without this:**
- Multi-cycle shock arcs reset to zero
- Pattern escalation forgets what happened
- Recovery trajectories restart
- Civic load history disappears
- Cooldown tracking resets

**Fix:**
- In `finalizeCycleState.js`: save `S.previousCycleState` to PropertiesService as `PREV_CYCLE_STATE_JSON` (same pattern as `PREV_EVENING_JSON`)
- In `loadPreviousEvening.js` (or new Phase 1 function): restore `S.previousCycleState` from PropertiesService
- Fields to persist: cycle, events, chaosCount, sentiment, econMood, civicLoad, civicLoadScore, patternFlag, shockFlag, shockStartCycle, weatherType, weatherImpact, cycleWeight, cycleWeightScore, recoveryLevel, overloadScore, activeCooldowns, holiday, sportsSeason, season

**Files:** `phase09-digest/finalizeCycleState.js`, `phase01-config/loadPreviousEvening.js`
**Effort:** Low — mirror the existing eveningSnapshot pattern
**Risk:** None — additive, no existing behavior changes

---

## 34.2 — Media Effects → City Dynamics Feedback (PRIORITY 2)

**Problem:** Phase 7 `mediaFeedbackEngine.js` writes `S.mediaEffects` — coverage profiles, sentiment pressure, anxiety factor, hope factor, crisis saturation, celebrity buzz, neighborhood effects, trend amplification. Phase 2 `applyCityDynamics.js` reads `S.mediaEffects` (line exists) but **only from the current cycle**, not the previous one. Since mediaFeedbackEngine runs AFTER applyCityDynamics (Phase 7 vs Phase 2), it only affects the current cycle through applySeasonWeights.

The simulation generates media coverage but the city never reacts to it next cycle.

**What this enables:**
- Heavy crisis coverage → next cycle's city sentiment drops
- Positive media buzz → next cycle's community engagement rises
- Celebrity spotlight on a neighborhood → next cycle's tourism/retail boost there
- Media-driven anxiety → next cycle's nightlife volume drops

**Fix:**
- Add `mediaEffects` to the `previousCycleState` persistence (34.1)
- In Phase 2 `applyCityDynamics.js`: read `S.previousCycleState.mediaEffects` and apply modifiers to sentiment, culturalActivity, communityEngagement
- Keep modifiers small (±0.02-0.05 range) — media influences mood, doesn't control it

**Files:** `phase02-world-state/applyCityDynamics.js`, `phase09-digest/finalizeCycleState.js`
**Effort:** Medium
**Depends on:** 34.1

---

## 34.3 — Economic Narrative into Media Briefing (PRIORITY 3)

**Problem:** Phase 6 `economicRippleEngine.js` writes `S.economicRipples`, `S.economicNarrative`, `S.economicSummary`, `S.neighborhoodEconomies`. All four are **orphaned** — nobody reads them. The media briefing gets `S.economicMood` (a single number) but not the narrative explaining WHY the economy shifted or which neighborhoods are affected.

**What this enables:**
- Reporters get real economic story angles: "Fruitvale retail up 12% from transit hub construction" instead of "economy is good"
- Neighborhood-specific economic reporting
- Economic ripple effects as storylines

**Fix:**
- In `mediaRoomBriefingGenerator.js`: read `S.economicNarrative`, `S.economicSummary`, `S.neighborhoodEconomies` and include in briefing output
- In `buildMediaPacket.js`: add economic detail section

**Files:** `phase07-evening-media/mediaRoomBriefingGenerator.js`, `phase07-evening-media/buildMediaPacket.js`
**Effort:** Low
**Depends on:** Nothing

---

## 34.4 — Neighborhood Memory (PRIORITY 4)

**Problem:** Phase 8 `v3NeighborhoodWriter` writes detailed neighborhood dynamics to the `Neighborhood_Map` sheet every cycle — nightlife, noise, crime, retail vitality, sentiment per neighborhood. But **no phase ever reads it back**. Neighborhoods reset to blank every cycle and get recalculated from scratch by `applyCityDynamics`.

**What this enables:**
- Neighborhood momentum — a busy Jack London district stays busy
- Declining neighborhoods continue declining until something intervenes
- Construction, events, crime create lasting neighborhood effects
- Gentrification and displacement play out over multiple cycles

**Fix:**
- Option A: Read `Neighborhood_Map` in Phase 2 `applyCityDynamics` and use previous cycle's neighborhood state as starting point instead of recalculating from zero
- Option B: Add neighborhood state to `previousCycleState` (34.1) — lighter, no sheet read
- Option A is better (sheet is the source of truth, survives across sessions)

**Files:** `phase02-world-state/applyCityDynamics.js`, possibly `phase08-v3-chicago/v3NeighborhoodWriter.js`
**Effort:** Medium
**Depends on:** Nothing (but pairs well with 34.1)

---

## 34.5 — Fix isWeekend (PRIORITY 5)

**Problem:** Phase 2 `applySeasonWeights.js` reads `S.isWeekend || false`. Phase 1 `advanceSimulationCalendar.js` never writes it. Weekend logic is permanently dead — seasonal weights never get weekend adjustments.

**What this enables:**
- Weekend cycles get different event weighting (more nightlife, less work events)
- Weekend sports events feel different from weekday

**Fix:**
- In `advanceSimulationCalendar.js`: derive `S.isWeekend` from cycle position. The simulation runs ~3 cycles per month, so map cycle-in-month position to a weekend probability or deterministic pattern.
- Simple: `S.isWeekend = (S.cycleInMonth % 3 === 0)` — every third cycle is a weekend. Or use `ctx.rng` for ~28% probability.

**Files:** `phase01-config/advanceSimulationCalendar.js`
**Effort:** Low
**Risk:** Low — downstream reads already default to false

---

## 34.6 — Domain Cooldown Persistence (PRIORITY 6)

**Problem:** Phase 7 `domainTracker.js` writes `S.domainPresence` — tracking which story domains dominated (civic, crime, sports, culture, etc.). Phase 8 `v3DomainWriter` writes this to `Domain_Tracker` sheet. But **neither is read back** next cycle. Domains start fresh every cycle.

**What this enables:**
- Automatic editorial balance — overdone domains cool down, underreported domains surface
- If crime dominated for 3 cycles, crime events get suppressed and culture events get boosted
- Story fatigue mechanics

**Fix:**
- Read `Domain_Tracker` last row in Phase 2 (or add to previousCycleState)
- In Phase 7 `domainTracker.js`: apply cooldown penalties to domains that dominated last cycle
- In Phase 4 `worldEventsEngine.js`: weight event generation away from hot domains

**Files:** `phase07-evening-media/domainTracker.js`, `phase04-events/worldEventsEngine.js`
**Effort:** Medium
**Depends on:** Nothing

---

## 34.7 — Document Phase 3 Sheet Write Exceptions (PRIORITY 7)

**Problem:** Three Phase 3 files write directly to sheets, violating the Phase 10 persistence rule:
- `applyDemographicDrift.js` → World_Population (lines 262-265)
- `updateNeighborhoodDemographics.js` → Neighborhood_Demographics
- `updateCrimeMetrics.js` → Crime_Metrics

These aren't in the documented exceptions list in `engine.md`.

**Fix:**
- Add these three to the documented exceptions in `.claude/rules/engine.md`
- OR migrate to write-intent pattern (larger effort, lower priority)

**Files:** `.claude/rules/engine.md`
**Effort:** Low (document) or High (migrate)

---

## 34.8 — Phase 11 Media Intake Integration (EVALUATE)

**Problem:** Phase 11 has two files — `continuityNotesParser.js` and `healthCauseIntake.js`. Neither feeds back into the engine in any meaningful way.
- `continuityNotesParser.js` writes to `Continuity_Intake` sheet — engine never reads it
- `healthCauseIntake.js` writes narrative causes to Simulation_Ledger.HealthCause — engine can read it but rarely does

Phase 11 is effectively dead code from the engine's perspective.

**Options:**
- Archive Phase 11 if media intake is handled differently now (pipeline v2 uses desk agents, not intake sheets)
- OR wire continuity notes into Phase 4 event generation as story seeds
- Evaluate based on whether the intake redesign (Phase 27.1 in ROLLOUT_PLAN.md) supersedes this

**Effort:** Evaluate first

---

## 34.9 — Clean Up Orphaned Phase 6 Fields (LOW)

Seven Phase 6 fields are written but never consumed:

| Field | Writer | Action |
|-------|--------|--------|
| `economicRipples` | economicRippleEngine | Wire into 34.3 (media briefing) |
| `economicNarrative` | economicRippleEngine | Wire into 34.3 |
| `economicSummary` | economicRippleEngine | Wire into 34.3 |
| `neighborhoodEconomies` | economicRippleEngine + applyMigrationDrift | Wire into 34.3 + 34.4 |
| `arcLifecycleResults` | arcLifecycleEngine | Evaluate — may be debug-only |
| `storylineHealth` | storylineHealthEngine | Evaluate — could inform media briefing |
| `hookLifecycle` | hookLifecycleEngine | Evaluate — could inform story seed generation |

Items 1-4 get wired by 34.3. Items 5-7 need evaluation.

---

## 34.10 — Chicago Phase 8 Deprecation (EVALUATE)

**Status:** Chicago sports phased out in S136. `chicagoSatellite.js` still runs, generates weather/sentiment/events for Chicago. `v3ChicagoWriter.js` writes to `Chicago_Snapshot` sheet (never read back).

**Options:**
- Skip Phase 8 Chicago in the phase runner (add guard in godWorldEngine2.js)
- OR keep running but mark as texture-only (no simulation impact)
- Don't delete code — Chicago may return if Bulls coverage resumes or new storylines need it

**Effort:** Low (guard) or None (leave running as texture)

---

## Execution Order

```
34.1  Persist previousCycleState          ← do first, everything depends on it
34.5  Fix isWeekend                       ← quick win, no dependencies
34.3  Economic narrative into briefing    ← quick win, no dependencies
34.7  Document Phase 3 exceptions         ← quick win, no dependencies
34.2  Media effects → city dynamics       ← depends on 34.1
34.4  Neighborhood memory                 ← pairs with 34.1
34.6  Domain cooldown persistence         ← standalone
34.9  Clean up orphaned fields            ← follows 34.3
34.8  Phase 11 evaluation                 ← evaluate
34.10 Chicago deprecation                 ← evaluate
```

---

## Reference

- Full audit data from S136 4-agent pipeline scan (Phases 1-3, 4-5, 6-7, 8-11)
- Sports rewrite also completed S136: `applySportsSeason.js` v3.0, `sportsStreaming.js` v3.0, `buildEveningMedia.js` v3.0
- Related rollout items: Phase 33 (Riley Integration), Phase 27 (Agent Autonomy)
