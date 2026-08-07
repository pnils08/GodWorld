---
title: City vs neighborhood cascade — team review brief
created: 2026-08-07
updated: 2026-08-07
type: reference
tags: [research, engine, doctrine, active]
sources:
  - Mike-direct 2026-08-07 — address data outputs + ripple; city vs hood which is feed; migration sign consistency; flood/heat drivers; temper over-gracious numbers unless event-driven; complex → paper for full LLM team review
  - docs/SIM_DOCTRINE.md §1–4, §6–8
  - docs/adr/0015-world-config-tunable-values.md
  - docs/research/2026-08-07-city-metrics-sim-reality.md
  - docs/research/2026-08-07-world-population-bidirectional-design.md
  - phase02-world-state/applyWeatherModel.js (heat_wave, flood_conditions, salient events)
  - phase02-world-state/applyCityDynamics.js (loads, sentiment, cluster bleed)
  - phase03-population/applyDemographicDrift.js (illness/employment dials)
  - phase03-population/updateNeighborhoodDemographics.js (migration split, Sick/Unemployed chase)
  - phase06-analysis/applyMigrationDrift.js (migrationDrift score from city migration %)
  - phase01-config/godWorldEngine2.js writeDigest_ (Riley)
  - Live: World_Population c102, Neighborhood_Demographics, World_Config keys
pointers:
  - "[[../engine/ROLLOUT_PLAN]]"
  - "[[../SIM_DOCTRINE]]"
  - "[[0015-world-config-tunable-values]]"
  - "[[2026-08-07-world-population-bidirectional-design]]"
  - "[[2026-08-07-city-metrics-sim-reality]]"
  - "[[2026-08-07-cron-lifecycle-review]]"
---

# City vs neighborhood cascade — team review brief

**Audience:** Full LLM team (research-build, engine-sheet, media, civic, grok/kimi/codex).  
**Mode:** Design paper — **not** an implemented fix. Challenge, don't rubber-stamp.

**Source:** Mike-direct 2026-08-07 + code read of population/weather/dynamics/migration paths.

**What this addresses:** City-level outputs (World_Population, Riley, loads) vs neighborhood tables vs citizen ledger — **which is feed, which is sink**, why stories can lead on city rates while lives don't feel them, what would make flood/heat real, and how over-gracious numbers should be tempered unless an event earns them.

---

## 1. Problem in one paragraph

Oakland is simulated at **three scales** that only **half-talk**. City dials (illness ~10%, employment ~90%, migration count, civicLoad, shock flags) act as **high-level controlled dice** and cascade **down** into some systems, but **neighborhoods do not have to sum to the city**, **citizens need not match the dials**, and **news/civic often lead on the city face**. That breaks Sim Doctrine (causes from ledger/1:443, no free outcomes, give citizens a life) when the paper narrates the thermostat as the census. Fix is architectural: clarify feed order, enforce consistency where claimed, put math in World_Config, add talk-back and ground impact (hospital / hood crisis), temper vanilla prosperity unless events drive strain.

---

## 2. Layer map (what exists)

| Layer | Sheet / store | Scale | Job today |
|-------|---------------|-------|-----------|
| **L0 Config** | `World_Config` | Global | Tunables (growth/death/migrationRate keys exist; **illness/emp drift math still mostly hardcoded**) |
| **L1 City face** | `World_Population` (1 row) | ~387k model | City dials + cycle flags + loads snapshot |
| **L2 Cycle log** | `Riley_Digest` (append/cycle) | Per run | Flight recorder: event counts, weight, media/food/nightlife blobs, loads, flags |
| **L3 Hood metrics** | `Neighborhood_Map` | ~22 hoods | Sentiment, CrimeIndex, RetailVitality, HousingPressure, etc. |
| **L4 Hood demography** | `Neighborhood_Demographics` | ~21 hoods | Students/Adults/Seniors/**Unemployed**/**Sick** counts |
| **L5 Sample lives** | `Simulation_Ledger` + bonds/events | ~1:443 | Named citizens — **doctrine truth for people** |
| **L6 Facility (missing/partial)** | Hospital / health queue | Ground | Health_Cause_Queue exists; **Hospital tab not live** on 2026-08-07 probe |

**Mike framing (adopt as working thesis):** L1 is **controlled dice** for the week/city; it should cascade into event engines; ground should **talk back**; over-gracious dials stay tempered unless an **event** drives the storyline.

---

## 3. Which is feed? (as-built, not as-desired)

### 3.1 Direction of travel (verified)

```text
Phase 2  weather / city dynamics / sports / edition boosts
    │
    ▼
Phase 3  updateWorldPopulation_     → pop size, migration count (city)
         applyDemographicDrift_     → illnessRate, employmentRate (city dials)
         updateNeighborhoodDemographics_  ← READS city rates
              │                         → chases hood Sick / Unemployed
              │                         → splits migration across hoods
    │
    ▼
Phase 4–7  events, chaos, citizens, media  (many READ city + weather)
Phase 6    applyMigrationDrift_     → migrationDrift score FROM city migration %
Phase 9–10 finalize WP flags/loads; writeDigest_ → Riley
```

| Relationship | Feed → sink (today) |
|--------------|---------------------|
| City illness/employment → hood Sick/Unemployed | **City is feed** (hoods chase expected counts, ±3/cycle) |
| City migration count → hood pop age buckets | **City is feed** (`migration / 17 * inflowMod` per hood — note fixed divisor) |
| City migration → migrationDrift label | **City is feed** (drift = f(migration / totalPopulation)) |
| Weather salient events → hood illness mod | **Weather is feed** (heat_wave +0.25, flood +0.15 on listed hoods) |
| Crime QoL → hood illness mod | **Crime metrics feed** hood sick modulation |
| Hood metrics (Sentiment, Crime…) | Largely from **dynamics / writers**, not sum of ledger |
| Ledger sick/jobs → World_Population | **Not wired (no talk-back)** |
| Hospital → city illness | **Not wired** (tab not standing) |

### 3.2 Desired direction (Mike + doctrine — for team debate)

**Option A — City thermostat is primary (keep controlled dice)**  
L1 rolls/drifts → L3/L4/L6 must **support** it (sums and crisis tiers reconcile). Ledger sample feels pressure at 1:443 or facility layer shows load.

**Option B — Ground is primary**  
L4/L5/L6 accumulate → L1 **reports** aggregates (illnessRate = sick/pop, employment from working-age). Config only sets physics bounds.

**Option C — Split roles**  
L1 = pressure indices for story engines only; **never** news-lead as census; L5 is life truth; L4 is hood truth; hospital is facility truth.

Team must pick A/B/C (or hybrid). Current code is **A half-built** (dice without forced support or talk-back).

---

## 4. Consistency hazards (examples, not all proven live bugs)

### 4.1 Migration sign / hood influx

- City `migration` can be positive (net in) or negative (net out).  
- Hood path: `neighborhoodMigration = round(migration / 17 * inflowMod)` — **same sign for all hoods**, magnitude varies by modifier.  
- **migrationDrift** (e.g. −3) is a **derived score** from migration % of pop, not “three people left.”  
- **Hazard:** Drift score −3 (outward pressure story) while **modifiers still push some hoods up** via calendar/profile, or **other systems** write hood growth independently — team should audit whether any path can show **all hoods influx under city outflow**. Mike’s example is the **right class of invariant to enforce**, even if not confirmed this hour.

**Invariant to specify:**  
`sign(sum of hood migration deltas) == sign(city migration)` within tolerance, or document intentional exceptions (sports influx to Coliseum hood only).

### 4.2 Illness 10% city vs ~5% hood Sick share vs ~0 ledger

Already measured: WP ~9.9% ill; hood Sick sum / hood people ~5.2%; ledger HealthCause ~0.  
**Cause class:** chase lag (±3), hood mods, different denominators, **no ledger bridge**.

### 4.3 Employment 90% city vs ledger EmployerBizId

Different definitions (dial vs BIZ link). UNTRACKED 9% is intentional feedstock (engine.83), not WP unemployment.

### 4.4 News lead

Riley/WP/world_summary often **lead** editions and civic datawakes. If L1 is controlled dice without L5 support, **journalism amplifies non-lived rates** — doctrine failure at publication layer.

---

## 5. What would make a flood / heat index happen? (code exists)

Not pure vanilla forever — **weather model already has salient majors** (`applyWeatherModel.js`, engine.70 era):

| Event | Rough arming (code) | Downstream examples |
|-------|---------------------|---------------------|
| **heat_wave** | Hot streak / HEAT front; salient entry with hoods | Hood illness mod +0.25; generationalEvents hospitalize 1–2 on salient heat; relationship/engine weather hooks; story hooks |
| **flood_conditions** | Sustained wet run + precip | Hood illness mod +0.15; chaos cars storm/flood coupling; texture/ripples |
| **storm** | Salient weather event | Chaos/transit hooks |
| Seasonal markers | first_snow, first_frost, summer_arrives… | Texture / media |

**Rates:** comments cite rare majors (e.g. heat-wave ~0.16/yr order) — “a few majors per year,” not daily drama.  
**Vanilla OK if realistic:** clear cool day with low loads is fine.  
**Mike rule to codify:** **over-gracious or over-crisis city numbers must be tempered unless a salient event (or multi-cycle earned trend) drives them.** No free permanent prosperity **or** free permanent 10% plague without ground story.

---

## 6. What “controlled dice” should mean (proposal for review)

| Concept | Proposal |
|---------|----------|
| **Config (World_Config)** | Bounds & step physics: illness calm/cap/step, employment floor/attractor/step, migration clamps, hospital load coefficients, crisis thresholds — **not** free permanent rates (ADR-0015 + “everything earned”) |
| **City face (WP)** | State after dice + talk-back; slow ticks OK |
| **Cascade** | Event engines **modulate probability/severity** from city face **and** salient weather |
| **Support rule** | If WP claims rate R, then within T cycles, L4 (and/or hospital) must be **within band of R**, or fail audit |
| **Talk-back** | Hospital load, hood Sick totals, sample health/employment → adjust next WP (bidirectional) |
| **News rule** | Lead from L5/L4/L6 + events; city % only if **supported** or labeled as system pressure |

---

## 7. Hospital / ground impact (open design)

**Intent:** City illness ~10% should produce **some** ground impact without requiring a full 1:443 sick cast every cycle.

| Depth | Mechanism |
|-------|-----------|
| Light | Hospital tab: beds, occupancy proxy = f(illnessRate × cityPop or hood Sick sum), wait strain, crisis flag |
| Medium | Neighborhood crisis tier when Sick/pop or weather+ill exceeds threshold |
| Heavy | Sample lottery: N = f(illnessRate, sample size) citizens receive health status/cause (doctrine: causes then dice) |

**Status:** Hospital tab **not present** on live sheet probe; Health_Cause_Queue exists but is not the city-illness sink. **Needs schema + writer design in plan phase.**

---

## 8. Open questions for the full LLM team

1. **Primary truth for city rates:** controlled dice (A), ground aggregate (B), or split (C)?  
2. **Strict sum invariants** for migration and sick/unemployed — enforce in Phase 3 audit or soft tolerance?  
3. **Should news be banned** from bare WP illness/employment leads until support exists?  
4. **Hospital schema** — new tab vs extend Health_Cause_Queue / Neighborhood_Demographics?  
5. **Talk-back gain:** how hard can ground push WP per cycle without fighting “slow tick” design?  
6. **World_Config key list** — name the full set for demographic drift + hospital (fail loud).  
7. **1:443 presentation:** when printing “city ill count,” always scale from sample **or** from WP dial + disclaimer?  
8. **Prosperity doctrine:** what employment/illness calm band is *earned* for this Oakland (not real-world import cynicism, not free utopia)?

---

## 9. Suggested work streams (after team review — not started)

| Stream | Owner (proposal) | Deliverable |
|--------|------------------|-------------|
| **W1** Invariant audit script | engine-sheet / grok | Report: city vs sum(hood) migration, sick, unemp each cycle |
| **W2** World_Config-ize drift math | engine-sheet | Keys + applyDemographicDrift_ reads ctx.config |
| **W3** Talk-back design | research-build → engine-sheet | Spec: which ground signals update WP |
| **W4** Hospital ground path | engine-sheet | Schema + cycle writer + crisis tiers |
| **W5** News/civic lead hygiene | media / research-build | Rules: no unsupported rate leads |
| **W6** Event probability review | engine-sheet | Are heat/flood/casual gates too soft vs macro flags? |

---

## 10. Not applicable / hazard

- Do not “fix” rates by inventing sick citizens in journalism.  
- Do not big-bang migrate all config in one PR (ADR-0015: on touch / this package only).  
- Do not conflate migrationDrift (−3 score) with “−3 people.”  
- Do not treat Riley as census.  
- Multi-agent review should **challenge** Option A vs B vs C before code.

---

## Verdict: `adopt`

**Paper is the product this turn.** Ignite a multi-terminal plan only after team review answers §8 (especially primary truth A/B/C).

**Ignited plans:** none yet — review first.

**Watch trigger for plan filing:** Mike or research-build records A/B/C choice + go on W1–W4.

---

## Team review checklist (copy into review threads)

- [ ] Confirm layer map vs code (any missing writers?)  
- [ ] Vote A / B / C for city rate truth  
- [ ] List must-have invariants (migration, sick, emp)  
- [ ] Hospital: new tab vs existing health sheets  
- [ ] News ban until support: yes/no  
- [ ] World_Config key draft  
- [ ] Owner + order for W1–W6  

---

## Applications (living)

- 2026-08-07 — Written for full LLM team review per Mike.

---

## Changelog

- 2026-08-07 (grok) — Initial team review brief from Mike direction + code map.
