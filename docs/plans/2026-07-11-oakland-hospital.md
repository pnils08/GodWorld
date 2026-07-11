---
title: Oakland_Hospital — Health as a Fate-Driver Plan
created: 2026-07-11
updated: 2026-07-11
type: plan
tags: [engine, citizens, health, draft]
sources:
  - docs/engine/ROLLOUT_PLAN.md §engine.52
  - phase04-events/generationalEventsEngine.js (health state machine, read S312)
  - phase03-population/applyDemographicDrift.js (illnessRate drift, read S312)
  - scripts/buildDeskPackets.js §S256 arc-feed removal comment (~L2068) — Mike's standing rebuild decision
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (engine.52)"
  - "[[engine/ENGINE_COUPLING_MAP]] — health/composure dial couplings verified there"
  - "[[SIMULATION_LEDGER]] — Status / StatusStartCycle / HealthCause columns"
  - "[[index]] — registered same commit"
---

# Oakland_Hospital — Health as a Fate-Driver Plan

**Goal:** Illness and injury become causal inputs on citizen fates — the city's illness rate drives who actually gets sick, sick citizens appear in a Hospital ledger with income/household consequences, and the hospital census reaches the desks.

**Architecture:** No new engine and no new .js file. The existing per-citizen health state machine (`generationalEventsEngine.js`) gets its incidence wired to the already-drifting city `illnessRate`; admissions/discharges are collected in `ctx.summary` and persisted to one new sheet tab (`Hospital_Ledger`) via write-intents at Phase 10; career and household engines read hospital status for consequences; desk packets and world summary surface the census where the dead crisis-arc feed used to sit (S256 removal, `buildDeskPackets.js` ~L2068 — this plan is the "connected per-hood story signal" rebuild Mike ordered there).

**Terminal:** engine-sheet (Phases A–C, Apps Script) + research-build (Phase D, node scripts)

**Pointers:**
- Health state machine: `phase04-events/generationalEventsEngine.js` — `HEALTH_TRANSITIONS` L105, `processHealthLifecycle_` L435, `checkHealthEvent_` L848, mode gate L264
- illnessRate producer: `phase03-population/applyDemographicDrift.js` L88–141 (drift math, 15% cap, writes `S.demographicDrift.illnessRate`) — Phase 3 runs before Phase 4, so the signal is available
- Neighborhood sick headcounts: `phase03-population/updateNeighborhoodDemographics.js` L116 (`expectedSick = totalPop * illnessRate`, statistical only)
- Career income seam: `phase05-citizens/runCareerEngine.js` L807–869 (transition income adjustments — the pattern hospital consequences copy)
- Availability penalties already live: `generateCivicModeEvents.js` L397–428, `generateMediaModeEvents.js` L349–381 (healthPenalty 0.3/0.6), council exclusion per [[engine/ENGINE_COUPLING_MAP]]
- Operator cause loop (kept as-is): `phase11.../healthCauseIntake.js` — Health_Cause_Queue feeds `HealthCause`, which Hospital_Ledger rows cite

**Acceptance criteria:**
1. Same-seed comparison: a cycle run with `illnessRate` forced to 0.09 produces measurably more new health events than at 0.05 (incidence is coupled, not fixed).
2. A health transition into hospitalized/critical creates a `Hospital_Ledger` row; discharge/death closes it with outcome + cycles-in-care. Census count lands in the cycle packet.
3. A citizen hospitalized ≥2 cycles shows an income reduction in the ledger and skips career advancement that cycle.
4. Desk packets carry a hospital census block with linked citizen rows (POPID + name + neighborhood + cause); world summary carries the census line next to the illness rate.

**Doctrine guard (universal protagonism / sample-is-qualitative):** sampled admissions are 1:443 qualitative representation. Do NOT force the per-hood `sick` headcounts to numerically reconcile with sampled admissions — headcounts stay statistical; admissions are the protagonists. The two share `illnessRate` as common cause, which is coupling enough.

---

## Tasks

### Phase A — Incidence wiring (engine-sheet)

### Task A1: Verify mode-gate ordering for the health lifecycle

- **Files:**
  - `phase04-events/generationalEventsEngine.js` — read L240–410
- **Steps:**
  1. Confirm whether the `mode !== "ENGINE" && mode !== "CIVIC"` gate (L264) sits BEFORE the `processHealthLifecycle_` call (L276). If yes: a MEDIA/GAME-mode citizen with `Status=hospitalized` never transitions — frozen in hospital forever.
  2. If confirmed, move the health-lifecycle block (status read + `processHealthLifecycle_` + status write) ABOVE the mode gate so all non-deceased citizens with a non-active status transition every cycle. Milestones stay behind the gate unchanged.
- **Verify:** dry-run a cycle in sandbox with a MEDIA-mode citizen manually set `Status=hospitalized`, `StatusStartCycle` = cycle−6 → citizen transitions (forced resolution fires at duration ≥5).
- **Status:** [ ] not started

### Task A2: Couple `checkHealthEvent_` incidence to illnessRate

- **Files:**
  - `phase04-events/generationalEventsEngine.js` — modify `checkHealthEvent_` L848–862 and its call site L399
- **Steps:**
  1. Pass `ctx` illness signal into the function: read `var illness = (ctx.summary.demographicDrift && ctx.summary.demographicDrift.illnessRate) || 0.05;`
  2. Scale base chance: `c *= (illness / 0.05)` — at the 5% baseline nothing changes; at 15% cap incidence triples. Keep the existing age/season/holiday multipliers and the 3-lifetime-`[Health]` cap.
  3. Severity distribution: at `illness >= 0.08`, shift severe from 0.05 → 0.08 and moderate 0.20 → 0.28 (an epidemic doesn't just mean more colds).
- **Verify:** two sandbox runs, same `rngSeed`, illnessRate forced 0.05 vs 0.12 → event-count delta visible in LifeHistory_Log appends. (Acceptance 1.)
- **Status:** [ ] not started

### Task A3: Severe events enter the state machine, not just the log

- **Files:**
  - `phase04-events/generationalEventsEngine.js` — modify the `checkHealthEvent_` result handling at ~L399–434
- **Steps:**
  1. Currently a severe result writes a LifeHistory line ("was hospitalized…") without setting `Status` — verify by reading the applyMilestone path for HEALTH_EVENT.
  2. If confirmed: severity `severe` → set `Status="hospitalized"`, `StatusStartCycle=cycle`, leave `HealthCause` blank for the Health_Cause_Queue operator loop to fill. Severity `moderate` at `rand < 0.3` → `Status="injured"` or `"serious-condition"` (pick by cause pool). Minor stays log-only.
- **Verify:** sandbox cycle with seed that fires a severe event → ledger row shows `Status=hospitalized` + `StatusStartCycle` stamped.
- **Status:** [ ] not started

### Phase B — Hospital_Ledger (engine-sheet)

### Task B1: Collect admissions/transitions in ctx.summary

- **Files:**
  - `phase04-events/generationalEventsEngine.js` — modify where `processHealthLifecycle_` results and new severe events are applied
- **Steps:**
  1. Push every status change into `ctx.summary.hospitalEvents` (init `[]`): `{popId, name, neighborhood, cause, from, to, cycle}`.
  2. No sheet writes here — Phase 4 stays intent-free for this feature.
- **Verify:** `ctx.summary.hospitalEvents.length > 0` logged in a sandbox cycle containing at least one transition.
- **Status:** [ ] not started

### Task B2: Persist Hospital_Ledger at Phase 10

- **Files:**
  - `phase10-persistence/buildCyclePacket.js` — read first (it already reads S.illnessRate); pick this or the existing Phase-10 persist site that owns ledger appends — modify
- **Steps:**
  1. Schema-setup carve-out (Phase 42 §1.1): lazy-create `Hospital_Ledger` tab with headers `AdmissionId | POPID | Name | Neighborhood | Cause | AdmitCycle | StatusNow | LastTransitionCycle | DischargeCycle | Outcome | CyclesInCare`.
  2. For each `ctx.summary.hospitalEvents` entry: `to` ∈ {hospitalized, critical, serious-condition} and no open row → append (via `queueAppendIntent_` if before the executor, direct if the chosen site is Phase 10/11 per engine.md post-executor rule — match the site's existing pattern); `to` ∈ {active, deceased} → close the open row (StatusNow/DischargeCycle/Outcome/CyclesInCare).
  3. Compute `ctx.summary.hospitalCensus = {open: N, admitsThisCycle, dischargesThisCycle, deathsThisCycle, load: N / capacity}` with `capacity = 40` (config constant — see Open questions).
  4. Add census to the cycle packet fields.
- **Verify:** sandbox cycle → tab exists, admission row appended, census in Cycle_Packet.
- **Status:** [ ] not started

### Phase C — Consequences (engine-sheet)

### Task C1: Career engine reads hospital status

- **Files:**
  - `phase05-citizens/runCareerEngine.js` — modify main loop (idx setup at ~L43–70)
- **Steps:**
  1. Read `Status` column. If ∈ {hospitalized, critical}: skip advancement/transition rolls entirely this cycle (continue after state parse).
  2. If hospitalized/critical AND `cycle − StatusStartCycle >= 2` AND has econ profile with `Income > 0`: one-time income adjustment `× (0.92 + roll() * 0.05)` (−3% to −8%), guarded so it applies once per admission (stamp a `[IncomeHit C{n}]` marker in the career state string, same pattern as existing markers ~L920).
  3. `recovering`: advancement roll allowed, transition rolls skipped.
- **Verify:** sandbox citizen set hospitalized 3 cycles → Income reduced once, no promotion events in LifeHistory for the span.
- **Status:** [ ] not started

### Task C2: Household engine reacts to a hospitalized member

- **Files:**
  - `phase05-citizens/runHouseholdEngine.js` — modify circumstance pools (~L360, engine.32 T4 pattern)
- **Steps:**
  1. Add a hospital circumstance pool gated on `Status` ∈ {hospitalized, critical} for the citizen: family-strain lines ("kept vigil at the hospital", "juggled shifts to cover for {name}") emitting `Household` tag (family dial) — same gating shape as the MaritalStatus/NumChildren pools at L508/L512 per [[engine/ENGINE_COUPLING_MAP]].
  2. Rate-bound: max 1 hospital-strain line per household per cycle.
- **Verify:** sandbox hospitalized married citizen → spouse-side strain line appears ≤1× in cycle output.
- **Status:** [ ] not started

### Phase D — Media surface (research-build)

### Task D1: Hospital census block in desk packets

- **Files:**
  - `scripts/buildDeskPackets.js` — modify at the S256 arc-removal marker (~L2068–2082)
- **Steps:**
  1. Read `Hospital_Ledger` open + recently-closed rows (last 3 cycles) alongside the existing sheet reads.
  2. Emit a `hospital` block in the civic + culture desk packets: census counts, load state (normal <60% / strained 60–90% / crisis >90% of capacity), and the linked citizen rows (POPID, name, neighborhood, cause, cycles in care). This replaces the fabricated crisis-arc feed with measured signal + real protagonists — the S256 rebuild decision. Leave `arcs = []` as-is; do not resurrect the arc system.
- **Verify:** `node scripts/buildDeskPackets.js` against sandbox → packet JSON contains `hospital` block with ≥1 linked citizen when the ledger has open rows.
- **Status:** [ ] not started

### Task D2: World summary census line

- **Files:**
  - `scripts/buildWorldSummary.js` — modify the population line (~L193)
- **Steps:**
  1. Append hospital census to the existing illness-rate line: `| Hospital: N in care (load%)` read from Cycle_Packet census fields.
- **Verify:** `node scripts/buildWorldSummary.js` → line renders with census when packet carries it, degrades cleanly (no crash) when absent.
- **Status:** [ ] not started

---

## Parked (explicitly out of scope — do not fold in)

- **Injury inflow from world events** (SAFETY/TRAFFIC city events injuring sampled citizens) — real coupling gap, separate row when this ships.
- **Named hospital institution page / staff citizens** (doctors, nurses as Tier-3s) — publication-driven materialization per [[engine/LEDGER_REPAIR_HOUSEHOLDS]] model; earn it through coverage first.
- **Neighborhood-level hospital load differentials** — one hospital citywide until census data suggests otherwise.

## Open questions

- [ ] Capacity constant: 40 beds is a placeholder scaled to ~900 sampled citizens × qualitative representation. Mike may want a different number or a config-sheet cell instead of a code constant. (Blocks B2 step 3 only — default 40 if no answer.)

---

## Changelog

- 2026-07-11 — Initial draft (S312). Read-pass findings: three disconnected health layers (city rate / hood headcounts / citizen state machine), zero career-household consequence coupling, S256 standing rebuild decision. Approved-in-shape by Mike before write.
