---
title: engine.102 — City/hood cascade consistency Plan
created: 2026-08-08
updated: 2026-08-08
type: plan
tags: [engine, infrastructure, active]
sources:
  - docs/research/2026-08-07-city-neighborhood-cascade-team-review.md — the five-pass review paper (grok → engine-sheet → Mike → grok → kimi)
  - docs/research/2026-08-03-game-environment-review.md — loop-doctrine addendum (builder-direct 2026-08-04)
  - docs/adr/0015-world-config-tunable-values.md — World_Config pattern + camelCase key convention
  - Mike go 2026-08-08: "start to build it; use World_Config for the variables so they aren't buried in code, like we started to do for the businesses"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — row engine.102"
  - "[[../research/2026-08-07-city-neighborhood-cascade-team-review]] — full evidence + amendments"
  - "[[../../output/kimi/engine102/README]] — kimi-built patch proposals for engine-sheet"
---

# engine.102 — City/hood cascade consistency Plan

**Goal:** City dials (World_Population) cascade city → hood → citizen with enforced consistency, config-driven physics, and ground talk-back — so news, dashboard, and citizen wakes all narrate numbers the ledgers actually support.

**Architecture:** Keep the three scales but lock the direction: World_Config physics → WP city face (controlled dice) → Neighborhood_* (support + citizen fork point) → citizen (hood-scoped dose) → Hospital_Ledger → talk-back upward. Hardcoded drift constants move to World_Config keys (auto-loaded into `ctx.config` by `loadConfig_`, phase01-config/godWorldEngine2.js:597-613 — a new sheet row is immediately readable; no loader work needed). Proven hardcode bugs (migration `/17`, population `400000`) fixed first so measurement is truthful.

**Terminal:** engine-sheet (substrate landing + deploy); kimi builds the W1 audit + W2 patch proposals + dashboard half of W5. Research-build owns the doctrine wording in W5.

**Pointers:**
- Research basis: [[../research/2026-08-07-city-neighborhood-cascade-team-review]] (all five passes, incl. kimi amendments: crisis-through-hoods, ≥25-cycle invariant window, W2a parallel W1, W5 extended to dashboard, W3 extended to wake perception, fallback-class sweep)
- Related: [[2026-07-31-platform-ceiling-resilience]] (engine.95), engine.99 (canonical hood set — W1 must not mint a third hood list), engine.94 (grief consumer = sibling pattern for illness-in-bonds)
- Patch proposals: `output/kimi/engine102/` (built by kimi, reviewed/landed by engine-sheet)

**Acceptance criteria:**
1. `Σ hood migration deltas ≈ city migration ±10%` on a live or bench cycle (divisor normalized by live hood count; `400000` hardcode gone).
2. World_Population illness/employment physics read from World_Config keys; `rg` finds no numeric step/cap/attractor literals in `applyDemographicDrift_` and no `|| 0.05` / `|| 0.91` drift fallbacks anywhere in the cascade path.
3. Audit report (`output/audit-reports/cascade-audit-*.md`) shows the per-metric consumer graph + three-scale table + invariant checks, reproducible on demand.
4. Illness dose rerouted to hood rate; a bench cycle with illnessRate ≥ 8% sustained 3 cycles produces ≥1 ledger sick status/HealthCause (sample-support rule fires) — and a hospitalized citizen's next wake perceives the event (wakePerception health read).
5. Hospital `Cause` populated on new admissions (Cause-blank gap from bench pass 4b) and hospital census feeds the next WP illness computation (talk-back).

---

## Tasks

### Task 1: W1 — cascade audit script (kimi, scripts/)

- **Files:**
  - `scripts/cascadeAudit.js` — create
  - `output/audit-reports/cascade-audit-<date>.md` + `.json` — create (generated)
- **Steps:**
  1. Read-only pulls: World_Population, Neighborhood_Map, Neighborhood_Demographics, World_Config, Simulation_Ledger (status/HealthCause counts), Hospital_Ledger (if present), via `lib/sheets.js` with the standard dotenv idiom.
  2. Emit: three-denominator scale table (city model / hood demo / ledger sample, with live ratios); per-metric table (illness, employment, migration, loads) with current values at each scale; invariant checks per the review paper §8 (migration sum ±10%, sick-rate band with the amended ≥25-cycle convergence window, unemployment band, sample-support rule); ND-vs-NM hood-set diff (which hood is missing from each).
  3. Report is markdown + machine-readable JSON; deterministic ordering; no writes anywhere.
- **Verify:** `node scripts/cascadeAudit.js` → report written; invariants section shows PASS/FAIL per item; run twice, identical numbers (modulo live sheet drift).
- **Status:** [ ] not started

### Task 2: W2a/W2b patch proposals (kimi, output/ only)

- **Files:**
  - `output/kimi/engine102/README.md` — create (what each patch does, landing notes, verification)
  - `output/kimi/engine102/w2a-updateNeighborhoodDemographics.js` — create (full proposed function)
  - `output/kimi/engine102/w2a-applyMigrationDrift.js` — create (full proposed function)
  - `output/kimi/engine102/w2b-applyDemographicDrift-config.js` — create (World_Config reads replacing literals)
  - `output/kimi/engine102/world-config-keys.md` — create (exact key rows for the World_Config sheet)
- **Steps:**
  1. W2a: `updateNeighborhoodDemographics.js:97` — replace `/ 17` with live hood count and normalize by Σ inflowMod (proposed invariant: `Σ hood deltas ≈ city ±10%`). `applyMigrationDrift.js:133,145` — replace `400000` with live WP totalPopulation read, keep a config fallback.
  2. W2b: illness steps 0.0002–0.0006, cap 0.15, employment attractor 0.90–0.93 → `ctx.config.*` reads per the key draft in the review paper pass 5 (camelCase per ADR-0015), each with the current literal as the inline default so behavior is unchanged until keys land.
  3. Fallback sweep: `generationalEventsEngine.js:1262 || 0.05`, `updateNeighborhoodDemographics.js:68 || 0.91` — proposed config reads with loud-default comments.
- **Verify:** `node --check` n/a (Apps Script ES5 — verify by review); each proposal carries a "landing notes" block stating exact original line(s) replaced.
- **Status:** [ ] not started

### Task 3: W2a land + bench (engine-sheet)

- **Files:** `phase03-population/updateNeighborhoodDemographics.js`, `phase06-analysis/applyMigrationDrift.js` — modify (from `output/kimi/engine102/` proposals)
- **Steps:** review proposal → apply → sandbox bench fire → confirm migration sum invariant ±10%.
- **Verify:** bench cycle report; `rg "400000|/ 17" phase03-population phase06-analysis` → empty.
- **Status:** [ ] not started — **owner: engine-sheet**

### Task 4: World_Config key rows (engine-sheet or Mike — Sheet write)

- **Files:** World_Config tab (live Sheet)
- **Steps:** add the key rows from `output/kimi/engine102/world-config-keys.md` with current-literal values (behavior-preserving), then tune.
- **Verify:** `loadConfig_` surfaces keys (bench log or a config dump line).
- **Status:** [ ] not started — **owner: engine-sheet/Mike**

### Task 5: W2b land (engine-sheet)

- **Files:** `phase03-population/deriveDemographicDrift.js` / `applyDemographicDrift.js`, plus fallback sites from Task 2 step 3.
- **Verify:** acceptance criterion 2.
- **Status:** [ ] not started — **owner: engine-sheet**

### Task 6: W3 — hood reroute + dose + wake perception (engine-sheet; lib/ read)

- **Files:** `phase04-events/generationalEventsEngine.js` (`checkHealthEvent_` feed: city illnessRate → hood Sick rate), `lib/wakePerception.js` (add HealthCause/hospital status to wake context)
- **Steps:** per review §7 "Heavy" + kimi amendment 2; dose sized so the sample-support rule can fire (`E[carriers] = hoodRate × hoodSampleSize`).
- **Verify:** acceptance criterion 4 on bench.
- **Status:** [ ] not started — **owner: engine-sheet**

### Task 7: W4 — hospital talk-back + Cause fix (engine-sheet)

- **Files:** `phase10-persistence/buildCyclePacket.js` (`persistHospitalLedger_` Cause wiring), `phase03-population/applyDemographicDrift.js` (census → next WP illness)
- **Verify:** acceptance criterion 5 on bench.
- **Status:** [ ] not started — **owner: engine-sheet**

### Task 8: W5 dashboard half — provenance chip (kimi, dashboard/)

- **Files:** `dashboard/server.js` (provenance field on metric payloads), `dashboard/src/components/tabs/CityMap.jsx` + `CityTab.jsx` (dice-vs-supported chip)
- **Steps:** once Task 5 lands and a support flag exists per metric, surface it. Blocked until then; do not invent the flag client-side.
- **Status:** [ ] blocked on Task 5

### Task 9: W5 media half — no bare rate leads (research-build → media)

- **Files:** sift/desk guidance (scoped ban: illness/employment/crisis rates until supported; migration flows allowed with label)
- **Status:** [ ] not started — **owner: research-build/media**

---

## Open questions

- [ ] ND (21 hoods) vs NM (22 hoods): which hood is missing from which — Task 1's audit must answer this before Task 3's divisor normalization lands (watch item from kimi pass 5).

## Changelog

- 2026-08-08 (kimi) — Initial draft on Mike's go, per the five-pass cascade review with kimi amendments. kimi builds Tasks 1–2 (+8 later); engine-sheet lands/deploys substrate Tasks 3–7.
