---
title: World_Population as controlled dice + bidirectional feedback — research
created: 2026-08-07
updated: 2026-08-07
type: reference
tags: [research, engine, doctrine, active]
sources:
  - Mike-direct 2026-08-07 — WP is high-level controlled dice cascading into events; slow ticks + prosperity/health settings; sim reacts but doesn't talk back; rates belong in World_Config; hospital tab for ground impact of illness
  - phase03-population/applyDemographicDrift.js
  - phase03-population/updateNeighborhoodDemographics.js
  - phase01-config/godWorldEngine2.js writeDigest_ / loadConfig_
  - docs/adr/0015-world-config-tunable-values.md
  - docs/SIM_DOCTRINE.md §1–4, §6–8
  - docs/research/2026-08-07-city-metrics-sim-reality.md
pointers:
  - "[[0015-world-config-tunable-values]]"
  - "[[../SIM_DOCTRINE]]"
  - "[[2026-08-07-city-metrics-sim-reality]]"
  - "[[../engine/ROLLOUT_PLAN]]"
---

# World_Population as controlled dice + bidirectional feedback — research

**Source:** Mike-direct 2026-08-07 (session clarification after metrics / doctrine thread).

**What this addresses:** Correct mental model of World_Population + Riley, and the fix shape: config-owned math, cascade to events, **talk-back** from ground systems (hospital / citizens / hoods), not one-way thermostat.

---

## Mike's model (confirmed / sharpened)

| Claim | Verdict |
|-------|---------|
| WP is early/high-level "controlled dice" for the week/city face | **Yes** — Phase 3 drift dials before many event engines; rates seed hood targets + later consumers |
| Those dials cascade into event / stress systems | **Partially yes** — arcs, crime stress, hood Sick/Unemployed *targets*, press face; **not** ledger sick rows |
| Slow ticks + high prosperity / health-crisis band right now | **Yes** — employment attractor ~0.90–0.93; illness elevated ~0.10 under strain, cap 0.15; step sizes tiny (0.000x per cycle) |
| Citizens "don't feel it" (no sick POP rows, no mass promotions) | **Yes** — one-way: dial → some systems; **not** dial → citizen health jobs lottery at sample scale |
| Riley = pull of engine events/state to one ledger row per cycle | **Yes** — `writeDigest_` appends `ctx.summary` counters, flags, media/event blobs, loads |
| WP not "wrong," **under-connected** | **Yes** |
| Event probability often casual / gated so ground doesn't match macro | **Plausible** — hood Sick moves max ±3/cycle; health lifecycle on ledger can stay quiet while dial is loud |
| Math belongs in **World_Config** | **Matches ADR-0015** — tunables in config; **earned** modifiers from live state; no free permanent 0.91 |
| Sim must **talk back** to WP | **Doctrine-correct fix** — currently mostly react-only |
| Hospital (or equivalent) should show ground impact of city illness | **Right product** — city rate → facility load / neighborhood crisis / optional sample hits — not necessarily full 1:443 count |

---

## Current data flow (as built)

```text
World_Config (few keys today: growth/death/migration rates, cycleCount…)
        │ loadConfig_ → ctx.config
        ▼
Phase 3: updateWorldPopulation_ (size/migration…)
Phase 3: applyDemographicDrift_  ◄── HARDCODED attractors + rng (illness/emp math NOT in World_Config yet)
        │ writes World_Population.illnessRate / employmentRate
        ▼
Phase 3: updateNeighborhoodDemographics_  → Sick/Unemployed counts chase dial
Later:   arcs / crime / shocks / Riley / press  READ dials & flags
Ledger:  citizen health/jobs  mostly INDEPENDENT (no talk-back to WP)
```

**Riley** = end-of-cycle **flight recorder** of `ctx.summary` (what engines did + city face), not "summary of ledger sick."

---

## Target architecture (Mike direction)

```text
World_Config
  illnessCalm / illnessCap / illnessStep*
  employmentFloor / employmentAttractor / employmentStep*
  hospitalLoadPerIllnessPoint, crisis thresholds, …
        │
        ▼
World_Population (city face — controlled dice state)
        │ cascade
        ├──► event engines (probability / severity modulated by rates)
        ├──► Neighborhood_Demographics.Sick / Unemployed
        ├──► Hospital tab (beds, intake, neighborhood crisis flags)
        └──► optional: sample-scale health/employment pressure on ledger
        ▲
        │ talk-back (MISSING TODAY)
        ├── hospital utilization / unresolved cases
        ├── hood Sick totals vs target
        ├── ledger HealthCause / Status ill counts (scaled or raw)
        └── employment: blank/UNTRACKED/Active job reality (scaled)
```

**Doctrine fit:** Config = **physics bounds** (ADR-0015). Live rates **earned** by talk-back + dice, not permanent free 0.91. Ground systems must **feel** macro pressure or the dial is decoration.

---

## What to review (work package)

1. **Code audit:** every reader/writer of `illnessRate` / `employmentRate` / WP loads; probability gates that soft-pedal ground impact.  
2. **World_Config migration (on touch / this build):** move drift attractors, caps, step sizes out of `applyDemographicDrift_` into named config keys; fail loud if missing.  
3. **Talk-back design:** which ground signals update WP each cycle (hospital, hood Sick, sample health, employment fill).  
4. **Hospital tab:** schema + write path so 10% illness → measurable load / crisis tier (citywide vs hood drill-down) — tab may need create (not live as `Hospital` / `Oakland_Hospital` on sheet probe 2026-08-07).  
5. **News/civic rule:** lead from ground + earned rates, not free dials alone.

---

## Verdict: `adopt`

Mike's framing is the correct repair story. Next: engine-sheet plan (or extend existing realism/employment/health rows) for **WP bidirectional + World_Config math + hospital ground path**.

**Ignited plans:** none yet — waiting Mike go to file plan/rollout.

---

## Applications (living)

- 2026-08-07 — Captured Mike model after metrics/doctrine thread.

---

## Changelog

- 2026-08-07 (grok) — Initial design research.
