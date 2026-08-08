---
title: City vs neighborhood cascade — team review brief
created: 2026-08-07
updated: 2026-08-07
type: reference
tags: [research, engine, doctrine, active]
sources:
  - Mike-direct 2026-08-07 — address data outputs + ripple; city vs hood which is feed; migration sign consistency; flood/heat drivers; temper over-gracious numbers unless event-driven; complex → paper for full LLM team review
  - Mike S360 — cascade city→hood→citizen strictly; 1:443 at hood; per-metric WP fixes; WP self-overwrite defect; hospital exists
  - engine-sheet S360 code-truth review — /17 bug, 400k hardcode, three-scale live numbers, hospital writer live, checkHealthEvent_ hop
  - grok second pass — health dose math, multi employment graphs, weather siblings, build order
  - docs/SIM_DOCTRINE.md §1–4, §6–8
  - docs/adr/0015-world-config-tunable-values.md
  - docs/research/2026-08-07-city-metrics-sim-reality.md
  - docs/research/2026-08-07-world-population-bidirectional-design.md
  - phase02-world-state/applyWeatherModel.js
  - phase02-world-state/applyCityDynamics.js
  - phase03-population/applyDemographicDrift.js
  - phase03-population/updateNeighborhoodDemographics.js
  - phase04-events/generationalEventsEngine.js (checkHealthEvent_)
  - phase06-analysis/applyMigrationDrift.js
  - phase08-writers or packet path: buildCyclePacket.js persistHospitalLedger_
  - phase01-config/godWorldEngine2.js writeDigest_
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

**Audience (this pass):** **Kimi** (third reviewer after engine-sheet S360 + grok second pass).  
**Mode:** Design paper — **not** an implemented fix. Challenge locks, missing ripples, and work-order — don't rubber-stamp.

**Source:** Mike-direct 2026-08-07 + code + live sheet verification (c102 era) + dual prior reviews folded into the body below.

**What this addresses:** City-level outputs (World_Population, Riley, loads) vs neighborhood tables vs citizen ledger — **which is feed, which is sink**, why stories can lead on city rates while lives don't feel them, what would make flood/heat real, and how over-gracious numbers should be tempered unless an event earns them.

**How to read as Kimi:** §§1–9 are the **current agreed picture** (as-built + locked direction). §10 is open for your dissent. §11 is the proposed work order. Appendix A is prior-review provenance (skim if needed).

---

## 1. Problem in one paragraph

Oakland is simulated at **three scales that only half-talk**. City dials (illness ~10%, employment ~90%, migration count, civicLoad, shock flags) act as **high-level controlled dice** and cascade **down** into some systems, but **neighborhoods do not have to sum to the city**, **citizens need not match the dials**, and **news/civic often lead on the city face**. That breaks Sim Doctrine (causes from ledger/sample, no free outcomes, give citizens a life) when the paper narrates the thermostat as the census. Fix is architectural: lock cascade **city → neighborhood → citizen**, enforce consistency where claimed, put math in World_Config, add talk-back and ground impact (hospital already has a writer), temper vanilla prosperity unless events drive strain.

---

## 2. Layer map (what exists — corrected)

| Layer | Sheet / store | Scale (live ~c102) | Job today |
|-------|---------------|--------------------|-----------|
| **L0 Config** | `World_Config` | Global | Tunables: migrationRate / deathRate / growthRate + infra keys. **Illness/emp drift math still hardcoded** in `applyDemographicDrift_` |
| **L1 City face** | `World_Population` (1 row, **self-overwrites**) | ~386,587 model | City dials + cycle flags + loads snapshot. **No trend history** (`appendPopulationHistory_` deleted S237) |
| **L2 Cycle log** | `Riley_Digest` (append/cycle) | Per run | Flight recorder: event counts, weight, media/food/nightlife blobs, loads, flags — **not census** |
| **L3 Hood metrics** | `Neighborhood_Map` | ~22 hoods | Sentiment, CrimeIndex, RetailVitality, HousingPressure, etc. |
| **L4 Hood demography** | `Neighborhood_Demographics` | **21 hoods** | Students/Adults/Seniors/**Unemployed**/**Sick** counts (~32,249 people total — **~1:12 of city**) |
| **L5 Sample lives** | `Simulation_Ledger` + bonds/events | ~940 rows (~856 Active) ~**1:411 of city** | Named citizens — **doctrine truth for people** |
| **L6 Facility** | `Hospital_Ledger` | Ground | **Writer is live** (`persistHospitalLedger_` Phase 10). Lazy-creates tab on first `ctx.summary.hospitalEvents`. Schema: AdmissionId/POPID/Name/Neighborhood/Cause/AdmitCycle/StatusNow/… Missing: **census→city talk-back + crisis tiers** |

**Three denominators, none reconciled:** city model (~387k) / hood demo (~32k) / ledger sample (~940). That is core architecture debt, not a measurement glitch.

**Mike framing (locked direction):** L1 is **controlled dice** for the week/city; it should cascade into neighborhoods; **citizens fork from their hood**, not from the city dial directly; ground should **talk back**; over-gracious dials stay tempered unless an **event** drives the storyline.

---

## 3. Which is feed? (as-built)

### 3.1 Direction of travel (verified)

```text
Phase 2  weather / city dynamics / sports / edition boosts
    │
    ▼
Phase 3  updateWorldPopulation_     → pop size, migration count (city)
         applyDemographicDrift_     → illnessRate, employmentRate (city dials)
         updateNeighborhoodDemographics_  ← READS city rates
              │                         → chases hood Sick / Unemployed (±3/hood/cycle)
              │                         → splits migration across hoods
    │
    ├─► Phase 4–7  events, chaos, citizens, media
    │        generationalEventsEngine.checkHealthEvent_
    │           → citizen sickness lottery READS city illnessRate  ← MISROUTE vs Mike lock
    │           → severe paths → hospitalEvents → Hospital_Ledger
    │
    ▼
Phase 6    applyMigrationDrift_     → migrationDrift score FROM city migration %
                                          (hardcodes totalPopulation = 400000)
Phase 9–10 finalize WP flags/loads; writeDigest_ → Riley; persistHospitalLedger_
```

| Relationship | Feed → sink (today) | Status |
|--------------|---------------------|--------|
| City illness/employment → hood Sick/Unemployed | **City is feed** (hoods chase expected counts, ±3/cycle) | Live |
| City migration count → hood age buckets | **City is feed** (`migration / 17 * inflowMod` per hood) | **Bug** — sheet has **21** hoods → ~1.24× over-allocation |
| City migration → migrationDrift label | **City is feed** (score, not people-count) | Live + **400k hardcode** |
| Weather salient → hood illness mod | **Weather is feed** (heat_wave +0.25, flood +0.15 on listed hoods) | Live |
| Crime QoL → hood illness mod | Crime metrics feed hood sick modulation | Live |
| City illness → **citizen** health lottery | `checkHealthEvent_` multiplies chance by `illnessRate/0.05` | Live but **weak dose** + **mis-routed** (should be hood) |
| Hood Sick rate → citizen health | **Not wired** | Missing — **Mike priority** |
| Ledger sick/jobs → World_Population | **Not wired** | No talk-back |
| Hospital census → city illness | **Not wired** | Writer exists; feedback missing |
| Hood metrics (Sentiment, Crime…) | Dynamics / writers, not sum of ledger | Live separate track |

### 3.2 Locked cascade (Mike + doctrine) — supersedes pure A/B/C vote

**Target chain:**

```text
World_Config physics
    → WP city face (controlled dice, config-bounded, earned)
    → Neighborhood_* (support + citizen fork point)
    → citizen (hood-scoped 1:443 dose)
    → Hospital_Ledger / story seeds
    ↻ talk-back upward (W3/W4)
```

**Publication dual truth:**

| Surface | Role |
|---------|------|
| L1 WP | City pressure / dice face — **not** bare news census |
| L4 ND | Hood support + citizen fork |
| L5 ledger | Lived proof at sample dose |
| News/civic | Lead L5 / L4 / events; city % only if **supported** or labeled pressure |

**Why not pure B (ground primary) today:** ground is too thin to aggregate from (0 ledger sick statuses, hospital tab may not have minted yet, hood layer itself synthetic).  
**Why not pure A forever:** dice without forced support fails doctrine at publication.  
**Why "C" is incomplete as a label:** destination is **Mike chain + publication hygiene**, not "L1 never exists."

---

## 4. Consistency hazards (proven + class)

### 4.1 Migration — **bug proven** (not just hazard)

- Code: `updateNeighborhoodDemographics.js` — each hood gets `round(migration / 17 * inflowMod)`.
- Live ND: **21 hoods** (divisor written when sheet had 17).
- Baseline sum ≈ **21/17 ≈ 1.24× city migration** before calendar boosts (inflow mods 1.3–2.0 on holidays).
- Live c102 class: city migration +1085 → hood layer absorbs ~1,340+ allocated migrants.
- **Sign inversion** (all-hoods influx under city outflow) is **not** possible on this path alone — negative × positive mod keeps sign per hood.
- **Fix shape:** normalize by `Σ inflowMod` over **live hood count**, not constant 17.

**Also:** `applyMigrationDrift.js` hardcodes `totalPopulation = 400000`; live WP ≈ 386,587. Drift score (−50..+50) is against a stale constant.

**Invariant (proposed):** `Σ hood migration deltas ≈ city migration ±10%` after divisor fix. Document intentional exceptions (e.g. sports influx to one hood only).

### 4.2 Illness — three-scale divergence confirmed live

| Surface | Live (c102 era) |
|---------|-----------------|
| WP illnessRate | **~9.85%** |
| Hood Sick sum / hood people | **~5.2%** (1,679 / 32,249) |
| Ledger HealthCause / sick Status | **0** in ~940 rows |

**Mechanisms (not mystery):**

1. **Chase lag by design:** ±3 Sick/hood/cycle → max ~63/cycle citywide. Gap ~1,500 sick ≈ **~24 cycles** behind dial at full clamp.
2. **No hood→citizen bridge.**
3. **City→citizen hop is real but tiny** — see §4.5 dose math.
4. Different denominators (387k vs 32k vs 940).

### 4.3 Employment — multi-headed definitions

Not one graph:

| Definition | Where |
|------------|--------|
| WP `employmentRate` | City dial → ND Unemployed chase |
| Hood Unemployed / hoodPop | Crime metrics, some dynamics |
| `applyCityDynamics` demoAgg unemployment | Own path; **0.05 sicknessRate-style fallbacks** also free-number class |
| Civic initiative unemp aggregates | Yet another rollup |
| Ledger `EmployerBizId` | Job link — UNTRACKED ~9% is intentional feedstock (engine.83), **not** WP unemployment |

W1 for employment must map **all** of these, not only WP→ND.

### 4.4 News lead

Riley / WP / world_summary often **lead** editions and civic datawakes. Two publication surfaces for loads/flags (WP finalize **and** Riley). If L1 is controlled dice without L5 support, **journalism amplifies non-lived rates** — doctrine failure at publication layer.

**migrationDrift** is a **scaled score**, not "−3 people left." Label debt for W5.

### 4.5 Health lottery dose (why 0 sick Status is expected today)

`checkHealthEvent_` (engine.52 A2):

- Base chance roughly ~0.0005–0.003 × `(illnessRate / 0.05)`.
- At ~9.85% illness ≈ **2× baseline**, still ~1/500–1/1000 per eligible draw.
- ~856 Active adults × mean c ≈ 0.002 → **E[hits] ≈ 1–2 per cycle**.
- Many hits are **minor** (LifeHistory only, **no Status**).
- Only severe (and some moderate) set hospitalized / injured / serious-condition + `hospitalEvents`.
- Cap: `healthCount >= 3` → no more health milestones (damps epidemic storytelling on sample).

So: city dial can scream 10% ill while sample shows ~0 Status sick — **not** "health engine dead"; **dose + status gate + wrong feed source** fail support-rule viability.

### 4.6 WP history defect

One row rewritten per cycle. Population history append was deleted (v3.2 / S237). Trend truth is scattered (Riley partial) or lost. History/trend mechanism is in fix scope (Mike #4).

---

## 5. Flood / heat — code already arms majors

Not pure vanilla forever — weather model has salient majors (`applyWeatherModel.js`):

| Event | Rough arming | Downstream examples |
|-------|--------------|---------------------|
| **heat_wave** | Hot streak / HEAT front | Hood illness mod +0.25; generational hospitalize 1–2 on salient heat; relationship hooks; story hooks |
| **flood_conditions** | Sustained wet + precip | Hood illness mod +0.15; chaos cars storm/flood; texture |
| **storm** | Salient weather | Chaos / transit hooks |
| Seasonal markers | first_snow, first_frost, … | Texture / media |

**Rates:** rare majors (heat-wave ~0.16/yr order class) — a few majors per year, not daily drama.  
**Vanilla OK if realistic:** clear cool day with low loads is fine.  
**Mike rule to codify:** over-gracious **or** over-crisis city numbers tempered unless a salient event (or multi-cycle earned trend) drives them. No free permanent prosperity **or** free permanent 10% plague without ground story.

**Weather is a sibling feed** on the illness metric (alongside WP dial) — full ripple map must include it, not only dial→hood.

---

## 6. What "controlled dice" should mean

| Concept | Proposal |
|---------|----------|
| **Config (World_Config)** | Bounds & step physics: illness calm/cap/step, employment floor/attractor/step, migration clamps, hospital load coefficients, crisis thresholds — **not** free permanent rates (ADR-0015) |
| **City face (WP)** | State after dice + talk-back; slow ticks OK; **history retained** somehow |
| **Cascade** | City → hood → citizen (hood-scoped dose); weather modulates |
| **Support rule** | If WP claims rate R, within T cycles L4 (and/or hospital) within band of R, or fail audit |
| **Sample-support (minimum)** | illnessRate ≥ 8% sustained 3+ cycles ⇒ ≥1 ledger citizen carries sick status/HealthCause (Heavy lottery, viable dose) |
| **Talk-back** | Hospital load, hood Sick totals, sample health/employment → adjust next WP |
| **News rule** | Lead from L5/L4/L6 + events; city % only if **supported** or labeled system pressure |

**Hardcoded today (W2b targets):** `applyDemographicDrift_` illness steps 0.0002–0.0006, cap 0.15, employment attractor band **0.90–0.93 (free prosperity, never earned)**. World_Config has zero illness/employment/hospital keys live.

---

## 7. Hospital / ground impact (corrected status)

**Exists:** writer + schema via lazy `Hospital_Ledger` on first hospital event. C103+ is first live mint chance if events fire.

**Missing:**

| Depth | Need |
|-------|------|
| Light | Occupancy proxy / wait strain / crisis flag from illnessRate or hood Sick sum |
| Medium | Neighborhood crisis tier when Sick/pop or weather+ill exceeds threshold |
| Heavy | Sample lottery dose so support rule can ever fire — **hood-scoped** per Mike |
| Feedback | Hospital census → next WP illness (talk-back) |

**Not greenfield schema design** — wire, dose, crisis, talk-back.

---

## 8. Must-have invariants (proposed — soft first)

1. `Σ hood migration deltas ≈ city migration ±10%` (after /N fix).
2. Hood Sick/pop within ±2pp of illnessRate × mean mod after **10-cycle** convergence window (or redesign chase).
3. Same class for unemployed vs `1 − employmentRate`.
4. Sample-support: illnessRate ≥ 8% sustained 3+ cycles ⇒ ≥1 ledger sick status/HealthCause.
5. Sign(city migration) preserved in aggregate hood migration (already true on ND path; protect when other writers exist).

**Enforcement:** soft tolerance + audit report first (W1). Hard fail only after divisor + lag classes fixed — enforcing against known-broken math is noise.

---

## 9. Work streams (locked order proposal)

| Order | Work | Owner (proposal) | Why |
|-------|------|------------------|-----|
| **0** | Mike lock recorded: city→hood→citizen + per-metric WP | — | Done (S360) |
| **W1** | **Per-metric** cascade audit script (illness, employment, migration, loads…) — consumer graph + scale table | engine-sheet / grok | Measure twice; no code physics until quantified |
| **W2a** | Fix migration `/N` normalize by live hoods + kill `400000` hardcode | engine-sheet | Proven bug, low risk |
| **W2b** | World_Config-ize illness/emp steps/caps/attractors | engine-sheet | ADR-0015; kill free 0.90–0.93 |
| **W3** | Reroute health incidence to **hood** rate; raise dose so support rule (4) can fire | engine-sheet | Mike #1–2 |
| **W4** | Hospital live path + crisis tiers + talk-back design | engine-sheet (+ research-build design if heavy) | Writer exists |
| **W5** | Media/civic: **no bare WP rate leads** until support | media / research-build | **Parallel anytime** |
| **W6** | Event probability vs macro flags (heat/flood gates vs high-signal flags) | engine-sheet | After W1 data |

**Per-metric rule (Mike #3):** each WP column has a different downstream graph. Trace then fix per metric — not one omnibus rewrite of all dials.

**Partial-ship risk:** Fixing W2a only still leaves **10% city ill / 0 sample sick**. Fixing W3 without talk-back still leaves WP free to drift. **Don't ship partial without stating which truth news may use.**

---

## 10. Open for Kimi (challenge these)

Prior reviewers filled most of the original §8. **Your job is dissent + missed ripples**, not re-deriving the layer map.

1. **Cascade lock:** city→hood→citizen — agree, or is a controlled city→citizen hop still needed for rare citywide crises?
2. **Support-rule numbers:** ±10% migration, ±2pp sick after 10 cycles, ≥1 sick at 8%×3 — too soft, too hard, or wrong denominators?
3. **Hood scale ~1:12 vs sample ~1:411:** which density should drive "few citizens sick when hood rate rises"? Document one scaling story.
4. **Employment multi-graph:** is W1 enough, or must employment get its own plan before illness W3?
5. **WP history:** revive append tab vs Riley-as-trend-view vs new history sheet?
6. **News ban until W3/W4:** yes hard rule, soft guidance, or gate only illness/employment (allow migration %)?
7. **World_Config key draft:** propose the key list for W2b (illness/emp/hospital) if you have a cleaner set than "whatever the literals are today."
8. **Neighborhood_Map vs Neighborhood_Demographics:** two hood sheets — any integrity hazard dual review under-weighted?
9. **W order:** would you swap W2b before W3, or hospital talk-back before health reroute?
10. **Anything missing** that would make W1 audit blind (consumers, writers, sheets)?

---

## 11. Not applicable / hazard

- Do not "fix" rates by inventing sick citizens in journalism.
- Do not big-bang migrate all config in one PR (ADR-0015: on touch / this package only).
- Do not conflate migrationDrift (−3 score) with "−3 people."
- Do not treat Riley as census.
- Do not re-open pure B until ground can carry aggregates.
- Substrate code (`phase*/`) lands via engine-sheet — out-of-band agents propose, don't deploy.

---

## Verdict: `adopt`

**Paper is the product this turn.** Plan (`engine.102`) waits on Kimi review + Mike go.

**Ignited plans:** none yet — review first.

**Watch trigger for plan filing:** Mike confirms order after Kimi pass → research-build/engine-sheet file plan; rollout row already `needs-info` at engine.102.

---

## Kimi review checklist (pass 5, 2026-08-08 — FILLED)

- [x] **Layer map + hospital status still accurate?** Yes on spot-checks: `/17` hardcode confirmed `updateNeighborhoodDemographics.js:97`; `400000` hardcode confirmed `applyMigrationDrift.js:133` (with a second fallback at `:145`); city-illness feed confirmed `generationalEventsEngine.js:1262` — **which carries its own `|| 0.05` fallback**, same free-number class as the realism audit's 0.91 employment fallback (see missed ripples). NM=22 live vs ND=21 confirmed; the missing-hood identity is a W1 deliverable.
- [x] **Cascade lock city→hood→citizen — adopt / amend?** **Adopt with one amendment: no direct city→citizen hop, even for crises.** A citywide crisis (pandemic-class) should express as universal hood modulation — the city event raises every hood's mod, citizen dose stays hood-scoped. One fork point, no exception channel to rot. Storytelling loses nothing; the mechanism stays single.
- [x] **Must-have invariants — adopt / amend numbers?** **Amend invariant 2's window.** The paper's own math (§4.2) says the ±3/hood/cycle chase closes a ~1,500-person gap in ~24 cycles; a 10-cycle convergence window alarms against by-design lag. Set the window to ≥25 cycles or raise the chase clamp — but don't ship an invariant that fires when the system is healthy. Also: denominators must use live hood count post-W2a, and the ND-21-vs-NM-22 reconciliation must land before any invariant computes hood sums, or the invariant bakes in the drift it measures.
- [x] **W1→W6 order — adopt / reorder?** **Reorder one: W2a parallel with W1, not after.** Two proven hardcodes (wrong divisor, stale constant) are fix-on-sight; landing them first makes W1's measurements truthful instead of measuring known-broken math. Rest of order adopted.
- [x] **News ban scope — yes / soft / scoped?** **Scoped, and extended.** Gate illness/employment/crisis *rate* leads until support; migration counts may run as labeled flows. Extension: the ban must cover the **dashboard** — see missed ripples.
- [x] **World_Config key draft:** (camelCase per ADR-0015) `illnessCalmStep`, `illnessStepUp`, `illnessStepDown`, `illnessCap`, `illnessSupportThreshold` (0.08), `illnessSupportCycles` (3), `employmentFloor`, `employmentAttractor`, `employmentStep`, `prosperityEarnedOnly` (bool gate on the 0.90–0.93 attractor), `migrationHoodDivisor` ('liveCount'), `migrationClampLow`, `migrationClampHigh`, `hospitalBaseCapacity`, `hospitalLoadPerSick`, `hospitalTalkbackGain`.
- [x] **Missed ripples / writers / consumers listed** — below.
- [x] **Residual risks you would block plan on** — none blocking; two watch items below.

### Missed ripples (the pass-5 contribution)

1. **The dashboard is now a publication surface and W5 doesn't name it.** As of 2026-08-04 the dashboard renders `Neighborhood_Map` live (CITY tab, WORLD choropleth) — it will narrate dice as census with a prettier face, exactly the §4.4 doctrine failure. Both flagged defects this week (East Oakland's zeroed row, the /17 over-allocation's 1.24×) were *surfaced by the visual layer*. W5 scope should read "media / civic / dashboard," and once the support rule exists, dashboard metrics should carry a provenance chip (dice vs supported) — cheap, since every metric already flows through one API.
2. **The support rule must reach the cron layer or illness isn't *lived*.** Builder-direct 2026-08-04 (loop doctrine, filed in [[2026-08-03-game-environment-review]] addendum): sheets are persistence, the cron is life. W3's dose raises ledger sick statuses — but `lib/wakePerception.js` reads bonds and LifeHistory milestones, not `HealthCause`/hospital status directly. A hospitalized citizen should wake *changed*, not just row-changed. Add to W3 scope: wake-perception health read. Otherwise the support rule passes on paper while the citizens never feel the plague the city face is screaming about — the same failure at the experience layer.
3. **W2b should sweep all drift fallbacks, not just steps/caps.** `generationalEventsEngine.js:1262`'s `|| 0.05`, the realism audit's `0.91` employment fallback (`updateNeighborhoodDemographics.js:68`), the `400000` pair at `applyMigrationDrift.js:133,145` — one class of defect (silently plausible constants), four known sites. A fallback grep pass belongs in W2b.
4. **Sickness has a social layer the dose math ignores.** Illness touching only Status misses bonds: a sick partner should show up in family wakes. This is engine.94's grief-consumer pattern applied to health — not a blocker, a note that W3's dose creates the material the cron layer consumes, and the bond web (live on the dashboard as of 2026-08-04) is where it becomes visible.

### Watch items (not blockers)

- **W2a ordering hazard:** normalize by live hood count *after* identifying the ND-vs-NM missing hood, or the divisor fix re-bakes the drift.
- **engine.99 overlap:** the two-hood-sheet integrity hazard (Q8) is already engine.99 territory (canonical hood set + drift detector). W1's audit should consume engine.99's canonical set when it lands rather than minting a third hood list.

**Kimi verdict: adopt with amendments** — cascade lock (crisis-through-hoods amendment), invariant window fixed to match the paper's own convergence math, W2a parallel to W1, W5 extended to dashboard, W3 extended to wake perception, W2b extended to the fallback class, key draft offered. Plan (engine.102) is clear to file when Mike confirms order.

---

## Appendix A — Review provenance (do not re-litigate without new evidence)

| Pass | Lane | What it locked / found |
|------|------|------------------------|
| 1 | grok | Initial brief: three scales half-talk, A/B/C options, W1–W6 sketch |
| 2 | engine-sheet S360 | Live verify; **/17 bug**; **400k hardcode**; three-scale numbers; hospital **writer live**; city→citizen hop exists; C-via-A interim vote; soft invariants |
| 3 | Mike S360 | **city→hood→citizen** strict; 1:443 at hood; per-metric WP; WP history defect; hospital wiring not greenfield |
| 4 | grok second pass | Dose math E≈1–2/cycle; multi employment graphs; weather siblings; reconcile Mike vs C-vote; W2a/b + W3 reroute order |
| 4b | engine-sheet S360 bench fires | Bench 0720 synced + HEAD pushed, C103 cold + C104 warm fired (Mike-direct "fire on sandbox"). PROVEN: East Oakland row self-heals Phase 8; hospital path live (3 admissions, multi-cycle lifecycle); Content_Telemetry + traj DSL fire; 9 fresh mints got 16 first-cycle events; illness 9.85→10.24%. NEW GAP: hospital `Cause` blank on all rows — HealthCause chain never feeds `ev.cause` (add to W4). CAUGHT+FIXED+PROD-PUSHED: (a) `.agents/**` Node file killed the whole Apps Script load (`require is not defined`) — live carried it since S357, Sunday would have died at load; `.claspignore` fixed; (b) S357 youthActivities retirement deleted `ACADEMIC_CALENDAR` while runYouthEngine references the bare identifier — Phase5-Youth threw; const restored inline (A7 class: grep identifiers, not filenames). C104: 0 errors, 217 youth/school rows. Bench-verify hygiene: bench-only tabs survive sync, so cycle numbers RECUR across eras — filter proofs by write-era, not AdmitCycle. |
| 5 | **kimi** | Adopt-with-amendments pass (2026-08-08): crisis-through-hoods (no city→citizen hop), invariant-window fix to match the paper's own 24-cycle convergence math, W2a parallel to W1, W5 extended to the dashboard as a publication surface, W3 extended to wake perception (loop doctrine), W2b extended to the free-number fallback class, World_Config key draft. Spot-verified /17, 400k, and the illness feed's 0.05 fallback. Clear to file engine.102 plan on Mike's order confirmation. |

Full narrative of passes 2–4 lived in earlier file revisions; body above is the merged truth.

---

## Applications (living)

- 2026-08-07 — Written for full LLM team review per Mike.
- 2026-08-07 — engine-sheet code-truth + Mike direction + hospital corrections.
- 2026-08-07 — grok second pass (dose, employment multi-graph, build order).
- 2026-08-07 — **Unified body for Kimi review** (corrections folded; open questions retargeted).

---

## Changelog

- 2026-08-07 (grok) — Initial team review brief from Mike direction + code map.
- 2026-08-07 (engine-sheet S360) — Code-truth review + hardcode finds + C-via-A vote.
- 2026-08-07 (engine-sheet S360) — Hospital/health hop corrections + Mike direction.
- 2026-08-07 (grok) — Second-pass re-review: agree/dissent, missed ripples, dose math, build order.
- 2026-08-07 (grok) — **Kimi-facing rewrite:** fold all corrections into §§1–9; §10 open for Kimi; Appendix A provenance; checklist retargeted.
- 2026-08-07 (engine-sheet S360) — Bench proving fires C103/C104 (Appendix A pass 4b): hospital path + East Oakland self-heal + mints proven; 2 live-fire landmines fixed and prod-pushed; hospital Cause-blank gap added to W4 scope.
- 2026-08-08 (kimi) — Pass 5 filled: adopt-with-amendments review complete; checklist answered, 4 missed ripples (dashboard-as-publication, wake-perception health read, fallback-class sweep, illness→bond social layer), 2 watch items; verdict adopt with amendments, engine.102 plan clear to file on Mike's order confirmation.
