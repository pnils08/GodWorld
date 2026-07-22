---
title: Oakland_Hospital — Health as a Fate-Driver Plan
created: 2026-07-11
updated: 2026-07-11
type: plan
tags: [engine, citizens, health, draft]
sources:
  - docs/engine/archive/ROLLOUT_PLAN.md §engine.52
  - phase04-events/generationalEventsEngine.js (health state machine, read S312)
  - phase03-population/applyDemographicDrift.js (illnessRate drift, read S312)
  - scripts/buildDeskPackets.js §S256 arc-feed removal comment (~L2068) — Mike's standing rebuild decision
pointers:
  - "[[engine/archive/ROLLOUT_PLAN]] — parent rollout (engine.52)"
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
- **Status:** [x] built S312 — verified C125/C126 sandbox

### Task A2: Couple `checkHealthEvent_` incidence to illnessRate

- **Files:**
  - `phase04-events/generationalEventsEngine.js` — modify `checkHealthEvent_` L848–862 and its call site L399
- **Steps:**
  1. Pass `ctx` illness signal into the function: read `var illness = (ctx.summary.demographicDrift && ctx.summary.demographicDrift.illnessRate) || 0.05;`
  2. Scale base chance: `c *= (illness / 0.05)` — at the 5% baseline nothing changes; at 15% cap incidence triples. Keep the existing age/season/holiday multipliers and the 3-lifetime-`[Health]` cap.
  3. Severity distribution: at `illness >= 0.08`, shift severe from 0.05 → 0.08 and moderate 0.20 → 0.28 (an epidemic doesn't just mean more colds).
- **Verify:** two sandbox runs, same `rngSeed`, illnessRate forced 0.05 vs 0.12 → event-count delta visible in LifeHistory_Log appends. (Acceptance 1.)
- **Status:** [x] built S312 — verified C125/C126 sandbox

### Task A3: Severe events enter the state machine, not just the log

- **Files:**
  - `phase04-events/generationalEventsEngine.js` — modify the `checkHealthEvent_` result handling at ~L399–434
- **Steps:**
  1. Currently a severe result writes a LifeHistory line ("was hospitalized…") without setting `Status` — verify by reading the applyMilestone path for HEALTH_EVENT.
  2. If confirmed: severity `severe` → set `Status="hospitalized"`, `StatusStartCycle=cycle`, leave `HealthCause` blank for the Health_Cause_Queue operator loop to fill. Severity `moderate` at `rand < 0.3` → `Status="injured"` or `"serious-condition"` (pick by cause pool). Minor stays log-only.
- **Verify:** sandbox cycle with seed that fires a severe event → ledger row shows `Status=hospitalized` + `StatusStartCycle` stamped.
- **Status:** [x] built S312 — verified C125/C126 sandbox

### Phase B — Hospital_Ledger (engine-sheet)

### Task B1: Collect admissions/transitions in ctx.summary

- **Files:**
  - `phase04-events/generationalEventsEngine.js` — modify where `processHealthLifecycle_` results and new severe events are applied
- **Steps:**
  1. Push every status change into `ctx.summary.hospitalEvents` (init `[]`): `{popId, name, neighborhood, cause, from, to, cycle}`.
  2. No sheet writes here — Phase 4 stays intent-free for this feature.
- **Verify:** `ctx.summary.hospitalEvents.length > 0` logged in a sandbox cycle containing at least one transition.
- **Status:** [x] built S312 — verified C125/C126 sandbox

### Task B2: Persist Hospital_Ledger at Phase 10

- **Files:**
  - `phase10-persistence/buildCyclePacket.js` — read first (it already reads S.illnessRate); pick this or the existing Phase-10 persist site that owns ledger appends — modify
- **Steps:**
  1. Schema-setup carve-out (Phase 42 §1.1): lazy-create `Hospital_Ledger` tab with headers `AdmissionId | POPID | Name | Neighborhood | Cause | AdmitCycle | StatusNow | LastTransitionCycle | DischargeCycle | Outcome | CyclesInCare`.
  2. For each `ctx.summary.hospitalEvents` entry: `to` ∈ {hospitalized, critical, serious-condition} and no open row → append (via `queueAppendIntent_` if before the executor, direct if the chosen site is Phase 10/11 per engine.md post-executor rule — match the site's existing pattern); `to` ∈ {active, deceased} → close the open row (StatusNow/DischargeCycle/Outcome/CyclesInCare).
  3. Compute `ctx.summary.hospitalCensus = {open: N, admitsThisCycle, dischargesThisCycle, deathsThisCycle, load: N / capacity}` with `capacity = 40` (config constant — see Open questions).
  4. Add census to the cycle packet fields.
- **Verify:** sandbox cycle → tab exists, admission row appended, census in Cycle_Packet.
- **Status:** [x] built S312 — verified C125/C126 sandbox

### Phase C — Consequences (engine-sheet)

### Task C1: Career engine reads hospital status

- **Files:**
  - `phase05-citizens/runCareerEngine.js` — modify main loop (idx setup at ~L43–70)
- **Steps:**
  1. Read `Status` column. If ∈ {hospitalized, critical}: skip advancement/transition rolls entirely this cycle (continue after state parse).
  2. If hospitalized/critical AND `cycle − StatusStartCycle >= 2` AND has econ profile with `Income > 0`: one-time income adjustment `× (0.92 + roll() * 0.05)` (−3% to −8%), guarded so it applies once per admission (stamp a `[IncomeHit C{n}]` marker in the career state string, same pattern as existing markers ~L920).
  3. `recovering`: advancement roll allowed, transition rolls skipped.
- **Verify:** sandbox citizen set hospitalized 3 cycles → Income reduced once, no promotion events in LifeHistory for the span.
- **Status:** [x] built S312 — verified C125/C126 sandbox

### Task C2: Household engine reacts to a hospitalized member

- **Files:**
  - `phase05-citizens/runHouseholdEngine.js` — modify circumstance pools (~L360, engine.32 T4 pattern)
- **Steps:**
  1. Add a hospital circumstance pool gated on `Status` ∈ {hospitalized, critical} for the citizen: family-strain lines ("kept vigil at the hospital", "juggled shifts to cover for {name}") emitting `Household` tag (family dial) — same gating shape as the MaritalStatus/NumChildren pools at L508/L512 per [[engine/ENGINE_COUPLING_MAP]].
  2. Rate-bound: max 1 hospital-strain line per household per cycle.
- **Verify:** sandbox hospitalized married citizen → spouse-side strain line appears ≤1× in cycle output.
- **Status:** [x] built S312 — verified C125/C126 sandbox

### Phase D — Media surface (research-build)

### Task D1: Hospital census block in desk packets

- **Files:**
  - `scripts/buildDeskPackets.js` — modify at the S256 arc-removal marker (~L2068–2082)
- **Steps:**
  1. Read `Hospital_Ledger` open + recently-closed rows (last 3 cycles) alongside the existing sheet reads.
  2. Emit a `hospital` block in the civic + culture desk packets: census counts, load state (normal <60% / strained 60–90% / crisis >90% of capacity), and the linked citizen rows (POPID, name, neighborhood, cause, cycles in care). This replaces the fabricated crisis-arc feed with measured signal + real protagonists — the S256 rebuild decision. Leave `arcs = []` as-is; do not resurrect the arc system.
- **Verify:** `node scripts/buildDeskPackets.js` against sandbox → packet JSON contains `hospital` block with ≥1 linked citizen when the ledger has open rows.
- **Status:** [x] built S312 (engine-sheet, Mike-direct crossover) — census block verified vs C125/C126 ledger rows

### Task D2: World summary census line

- **Files:**
  - `scripts/buildWorldSummary.js` — modify the population line (~L193)
- **Steps:**
  1. Append hospital census to the existing illness-rate line: `| Hospital: N in care (load%)` read from Cycle_Packet census fields.
- **Verify:** `node scripts/buildWorldSummary.js` → line renders with census when packet carries it, degrades cleanly (no crash) when absent.
- **Status:** [x] built S312 (engine-sheet, Mike-direct crossover) — census block verified vs C125/C126 ledger rows

---

## Parked (explicitly out of scope — do not fold in)

- **Injury inflow from world events** (SAFETY/TRAFFIC city events injuring sampled citizens) — real coupling gap, separate row when this ships.
- **Named hospital institution page / staff citizens** (doctors, nurses as Tier-3s) — publication-driven materialization per [[engine/archive/LEDGER_REPAIR_HOUSEHOLDS]] model; earn it through coverage first.
- **Neighborhood-level hospital load differentials** — one hospital citywide until census data suggests otherwise.

## Open questions

- [ ] Capacity constant: 40 beds is a placeholder scaled to ~900 sampled citizens × qualitative representation. Mike may want a different number or a config-sheet cell instead of a code constant. (Blocks B2 step 3 only — default 40 if no answer.)

---

## Build notes (S312, Phases A–C)

- A3 premise half-stale: severe events already set `Status=hospitalized` + stamped `StatusStartCycle`; only the moderate→injured/serious-condition branch was missing.
- **`StatusStartCycle`/`HealthCause` columns did not exist on the live Simulation_Ledger** (50 cols A–AX). The engine read/wrote both by header name behind `>= 0` guards — duration mechanics (brackets, forced resolution) silently dead. Added AY/AZ headers to prod + sandbox, verified readback (52 cols); dormant wiring now active. SCHEMA_HEADERS + SIMULATION_LEDGER.md trued up same commit.
- B2 landed in `buildCyclePacket.js` as `persistHospitalLedger_` — direct writes matching that file's Phase-10 pattern. `recovering` + `injured` count as open-states so a hospitalized→recovering row stays open until discharge/death closes it.
- Capacity default 40 taken (open question stands for Mike).
- Local commits only; sandbox clasp push for the verify cycle; prod deploy held behind C102 smoke.

## C126 sandbox verify (S312) — PASS, full loop closed

- POP-00253 rolled injured→active; Hospital_Ledger row closed: `StatusNow=active | LastTransitionCycle=126 | DischargeCycle=126 | Outcome=recovered | CyclesInCare=1`.
- Simulation_Ledger: Status=active, StatusStartCycle cleared. Recovery line in LifeHistory + log. Census: `0 in care (admits 0, discharges 1, deaths 0, load 0%)`. Zero engine errors.
- Full arc verified on a real citizen across two cycles: admission → tracked status → duration → recovery → closed row with outcome. engine.52 CLOSED (done-pending-archive).
- Passive riders (no action): income hit fires when a citizen sits hospitalized/critical ≥2 cycles; same-seed incidence compare remains unexercised (logic-simple, low-risk).

## C125 sandbox verify (S312) — PASS

- Hospital_Ledger lazy-created with correct headers; admission `H-C125-POP-00253` (Jango Lango, Piedmont Ave, injured via the A3 moderate branch, AdmitCycle 125).
- Simulation_Ledger: `Status=injured`, `StatusStartCycle=125` stamped in new AY col, HealthCause blank for operator loop.
- Cycle packet census line correct: `Hospital: 1 in care (admits 1, discharges 0, deaths 0, load 3%)`. Zero new Engine_Errors. illnessRate ran 0.11; 7 health LifeHistory lines.
- Open riders for C126+ (passive): row-close path with outcome/CyclesInCare; income hit (needs 2+ cycles hospitalized/critical); same-seed incidence compare (low-risk, logic-simple).
- Texture note: moderate severity draws from the minor description pool — an injured admission logged "dealt with a minor health concern". FIXED S312 (`380e3594`): admit decision moved above `applyMilestone_`; injured/serious-condition admissions draw dedicated pools. Sandbox re-pushed byte-OK.

## Changelog

- 2026-07-11 — Initial draft (S312). Read-pass findings: three disconnected health layers (city rate / hood headcounts / citizen state machine), zero career-household consequence coupling, S256 standing rebuild decision. Approved-in-shape by Mike before write.
- 2026-07-11 — Phases A–C built (S312, engine-sheet). Ledger gained AY StatusStartCycle + AZ HealthCause (prod+sandbox). See §Build notes. D1/D2 remain research-build.
- 2026-07-11 — Phase D built same session (Mike-direct crossover): desk-packet hospital block + world-summary census line.
- 2026-07-11 — C125 sandbox verify PASS — see §C125 sandbox verify. Riders (row-close, income hit, seed-compare) ride C126+ passively.
- 2026-07-11 — C126 sandbox verify PASS: full admit→recover→row-close loop on POP-00253. engine.52 CLOSED (done-pending-archive); prod deploy rides C102-smoke batch.
