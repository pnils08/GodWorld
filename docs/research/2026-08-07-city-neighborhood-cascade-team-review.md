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

## Reviews

### engine-sheet (S360, 2026-08-07) — code-truth pass

Every checkable claim verified against code + live sheets. Layer map §2 and feed table §3.1 are accurate. Additions and corrections:

**Proven live, upgrade from "hazard" to bug (§4.1):** the migration split over-allocates every cycle. `updateNeighborhoodDemographics.js:97` gives each hood `migration/17 × inflowMod`, and the loop iterates the ND sheet's **21 hoods** (divisor was written when the sheet had 17). Baseline sum = 21/17 ≈ **1.24× city migration** before calendar boosts (mods run 1.3–2.0 on holidays). Live c102: city migration +1085 → hood layer absorbs ~1,340+ allocated migrants. Sign inversion (all-hoods-influx under city outflow) is NOT possible in this path — `round(negative × positive mod)` keeps sign per-hood — but magnitude never reconciles. Fix shape: normalize by `Σ inflowMod` over live hood count, not a constant.

**Second hardcoded denominator (missed by paper):** `applyMigrationDrift.js:133` hardcodes `totalPopulation = 400000`; live WP = 386,587. The −50..+50 drift score is computed against a stale constant, not the sheet. Same W2 config-ization bucket.

**Three-scale divergence confirmed live (§4.2), with a sharper framing:** WP illness **9.85%** / hood Sick sum **5.2%** (1,679 of 32,249) / ledger **0** — zero HealthCause values AND zero sick statuses in 940 rows (856 active, 49 traded, 23 pending, 7 retired, 5 deceased). The citizen layer cannot support ANY illness rate today. Also: hoodPop 32,249 vs cityPop 386,587 means the hood layer is its own **~1:12 scale** — three denominators (1:1 model, 1:12 hoods, 1:411 sample), none reconciled anywhere. The 5.2% vs 9.85% gap is chase lag by construction: ±3/hood/cycle clamp = max ~63/cycle convergence citywide; the gap is ~1,500 sick, i.e. ~24 cycles behind the dial.

**Hardcoded drift math confirmed (§6/W2):** `applyDemographicDrift.js` is all literals — illness steps 0.0002–0.0006, cap 0.15, employment attractor band 0.90–0.93 (free prosperity, never earned). `World_Config` live keys: migrationRate/deathRate/growthRate + infra keys only — zero illness/employment/hospital keys. W2 is real and cheap.

**Hospital (§7):** ~~confirmed no Hospital tab on live sheet~~ **CORRECTED same-session (Mike):** the tab is absent but its WRITER IS LIVE — `buildCyclePacket.js persistHospitalLedger_` (Phase 10) lazy-creates `Hospital_Ledger` (AdmissionId/POPID/Name/Neighborhood/Cause/AdmitCycle/StatusNow/LastTransitionCycle/DischargeCycle/Outcome/CyclesInCare) on the first `ctx.summary.hospitalEvents` from Phase 4. §7's "needs schema + writer design" is stale — both exist; what's missing is the census→city talk-back and crisis tiers. C103 is the first live chance for the tab to mint.

**Health engine wiring (correction to §3.1 feed table):** "Ledger sick → city: not wired" is true, but the REVERSE hop exists and the paper misses it: `generationalEventsEngine.checkHealthEvent_` (engine.52 A2) couples citizen sickness incidence DIRECTLY to the city dial — `c *= illnessRate/0.05` (~2× at today's 9.85%) with severity shifting severe-ward at ≥8%. So today's cascade is city→hood AND city→citizen in parallel; hood→citizen does not exist. L4 and L5 each chase L1 independently and never reconcile with each other — the precise mechanism of the three-worlds symptom.

**Vote on §8.1 (A/B/C): C as destination, A-with-support-rule as the transition.** B (ground primary) is not buildable today — the ground layers are too thin to aggregate from (0 sick citizens, no hospital, hood layer itself synthetic). Pure A is the current half-built state and fails doctrine at publication. So: keep L1 as controlled dice feeding story engines, enforce the §6 support rule (L4 within band of L1 within T cycles — W1 audit makes this measurable), build talk-back incrementally (W3), and gate news leads on support (W5). This matches Mike's thermostat thesis without pretending the census exists.

**Must-have invariants (§8.2) from this lane:** (1) `Σ hood migration deltas ≈ city migration ±10%` (after divisor fix); (2) `hood Sick/pop within ±2pp of illnessRate × mean mod` after 10-cycle convergence window; (3) same for unemployed vs `1−employmentRate`; (4) sample-support: illnessRate ≥ 8% sustained 3+ cycles ⇒ ≥1 ledger citizen carries a sick status/HealthCause (the Heavy lottery in §7, minimum viable dose). Soft tolerance + audit report first (W1), hard enforcement only after the divisor and lag classes are fixed — enforcing invariants against known-broken math just makes noise.

**W1–W6 order (engine-sheet view):** W1 first and alone (audit script quantifies everything before any change — measure twice); then W2 (mechanical, unblocks tuning); W6 rides W1's data; W3 design next; W4 after W3 picks the talk-back signals; W5 (media) can run parallel any time. W1+W2 are single-session engine-sheet jobs.

### Mike direction (S360, 2026-08-07 — recorded verbatim-in-substance; answers much of §8)

1. **Cascade chain is city → neighborhood → citizen, strictly.** City ties to neighborhoods; citizens fork from THEIR NEIGHBORHOOD'S data, never from the city dial directly. (Today's `checkHealthEvent_` city→citizen coupling is therefore mis-routed — reroute the incidence input from `demographicDrift.illnessRate` to the citizen's own hood rate.)
2. **1:443 plays at the hood level.** A hood rate rises → a few sample citizens IN THAT HOOD wind up sick, aligned with the ripple. Rate spikes hard → the story seed carries a healthy list of affected citizens drawn from what's already in place (existing health lifecycle + hospital writer), feeding coverage.
3. **World_Population metrics get addressed one by one, following each metric's own cascade.** Each WP column has a different downstream graph (illness → hoods+citizens+hospital; migration → hoods+drift; employment → hoods only). Trace, then fix, per metric — not one omnibus pass. (Refines W1: per-metric audit, not monolith.)
4. **WP self-overwrite is a defect for trend truth.** One row rewritten per cycle; `appendPopulationHistory_` was deleted (v3.2 bug, S237, no readers) so trend data is scattered/lost and the ledger has never demonstrably tracked the lived world. A history/trend mechanism (or Riley-derived view) is part of the fix scope.
5. Hospital tab + health-event engine already exist in code (see corrections above) — the work is wiring, not building.

### grok second pass (2026-08-07) — re-review after engine-sheet + Mike block

**Job:** Catch missed elements/ripples; agree/dissent with engine-sheet; lock a coherent build story for Mike.

#### Verdict on engine-sheet review

| Finding | Grok call |
|---------|-----------|
| Layer map + city→hood feed table mostly accurate | **Agree** |
| migration `/17` over 21 hoods → ~1.24× over-allocation | **Agree — ship-fix class** (W2 mini / W1 quant) |
| `totalPopulation = 400000` hardcode in applyMigrationDrift | **Agree** |
| Three denominators (WP ~387k / hood demo ~32k / ledger ~940) | **Agree — core architecture debt** |
| Hood Sick lag vs dial (±3/hood/cycle) | **Agree** — explains 5.2% vs 9.85% without mystery |
| Hospital_Ledger writer live, tab lazy | **Agree** — paper §7 was wrong; corrected |
| City→citizen hop via `checkHealthEvent_` | **Agree hop exists; add dose math below** |
| Vote C destination / A+support transition | **Agree as interim** — superseded in *routing* by Mike city→hood→citizen |
| W1 first alone | **Agree** |

#### Mike block vs engine-sheet vote (reconcile)

Mike: **strict city → neighborhood → citizen**; 1:443 dose **at hood**; citizens must **not** read city dial directly.  
Engine-sheet: C destination, A+support transition; noted city→citizen as today's parallel hop.

**Grok synthesis (recommended lock):**

1. **Target cascade (doctrine + Mike):**  
   `World_Config physics → WP city face → Neighborhood_* → citizen (hood-scoped) → Hospital_Ledger / story seeds`  
   with **talk-back** upward (W3).

2. **Transition:** keep WP as controlled dice **only if** support rules hold; **reroute** `checkHealthEvent_` illness input from `demographicDrift.illnessRate` to **citizen's hood sick rate** (or hood expectedSick/pop) — matches Mike #1.

3. **C vs A:** Destination is **not pure C** (rates never news-lead alone) and **not pure B** yet (ground too thin). Destination is **Mike chain + dual truth**:  
   - L1 = city pressure / dice face (earned, config-bounded)  
   - L4 = hood support + citizen fork  
   - L5 = lived proof at sample dose  
   - News leads L5/L4/events, not bare L1  

Engine-sheet "C via A+support" ≈ same if "C" means publication hygiene + eventual ground support, not "L1 never exists."

#### Missed / under-weighted ripples (add to paper)

**1. Health lottery is real but tiny (explains 0 sick statuses)**  
`checkHealthEvent_`: base chance ~0.0005–0.003 × `(illnessRate/0.05)`. At 9.85% illness ≈ **2× baseline**, still ~1/500–1/1000 per eligible draw. Even ~856 Active adults at mean c≈0.002 → **E[hits] ≈ 1–2/cycle**, many **minor** (LifeHistory only, **no Status**). Only severe (and some moderate) set hospitalized/injured/serious-condition + hospitalEvents. So:

- City dial can scream 10% ill  
- Sample still shows ~0 Status sick  
- Not "health engine dead" — **dose + status gate** too weak for support rule (4)

**2. Parallel unemployment graphs (employment ripple is multi-headed)**  
- WP `employmentRate` → ND Unemployed chase  
- Crime metrics use **hood Unemployed/totalPop** (not WP directly)  
- `applyCityDynamics` demoAgg has its **own** unemploymentRate path  
- Civic initiative modifiers use yet another unemp aggregate  
- Ledger EmployerBizId = fourth definition  

W1 per-metric for **employment** must map **all four**, not only WP→ND.

**3. MigrationDrift vs migration count (semantics trap for news/civic)**  
`migrationDrift` is a **scaled score** from migration % of pop (and hardcodes 400k), not hood sum. Civic/datawake "drift −3" ≠ "three people left." Paper said this; team must treat as **label debt** in W5.

**4. Weather → more than illness mod**  
Already: heat/flood → hood sick mod, chaos cars, hospital events on severe heat path, relationship/engine hooks, story hooks, crisis buckets (`generateCrisisBuckets` reads prev hospitalEvents). Full ripple map for **illness metric** should include **weather as sibling feed**, not only WP dial.

**5. Riley vs WP duplication**  
Loads/sentiment/flags appear on **both** WP finalize and Riley row — two publication surfaces for same family. Audit "who leads the news" must list **both** consumers (world_summary, Riley, desk packets, civic domainSlice).

**6. applyCityDynamics sicknessRate 0.05 fallback**  
Separate free-number class (demoAgg default) — W2 bucket alongside demographicDrift.

**7. Health event caps**  
`healthCount >= 3` → no more health milestones — dampens epidemic storytelling on the sample even when city dial is high.

**8. Promotion path commented / limited**  
Mike noted "no massive promotions" — generational promotion block appears **commented out** in the health-adjacent scan region; employment story won't show career lottery from city emp dial. Separate from illness but same "macro without micro" class.

**9. Scale story for 1:443**  
Mike: 1:443 at **hood** level. Today hood layer is ~1:12 of city pop (32k vs 387k), sample ~1:411 of city — **three scales**. Any "few citizens sick when hood rate rises" math must pick **one** scaling story (hood sample density vs city sample density) and document it.

#### Elements still thin / need W1 quant (not assumed fixed)

| Element | Status after dual review |
|---------|---------------------------|
| City→hood migration magnitude | **Bug proven** (/17) |
| City→hood sick/unemp lag | **By design** (±3) — may need wider chase or talk-back |
| City→citizen health | **Wired weak** — dose + status gate |
| Hood→citizen | **Missing** (Mike priority) |
| Talk-back ground→city | **Missing** |
| Hospital census→city | **Missing** (writer exists) |
| WP history/trend | **Missing** (self-overwrite; appendPopulationHistory_ dead) |
| Employment multi-definition | **Mapped, not audited** |
| News consumer list for WP/Riley | **Not fully enumerated** (W5) |
| Event probability vs macro flags | **W6 still open** |
| Neighborhood_Map vs ND consistency | **Not fully traced** (metrics vs demography two hood sheets) |

#### Recommended build order (updated)

| Order | Work | Why |
|-------|------|-----|
| **0** | Mike locks cascade: city→hood→citizen + per-metric passes | Direction already recorded § Mike block |
| **W1** | Per-metric cascade audit script (illness, employment, migration, loads…) | Measure; include consumer graph + scale table |
| **W2a** | Fix migration `/N` normalize + kill 400000 hardcode | Proven bug, low risk |
| **W2b** | World_Config-ize illness/emp steps/caps/attractors | ADR-0015; kill free 0.90–0.93 as permanent |
| **W3** | Reroute health incidence to **hood** rate; dose so support rule (4) can ever fire | Mike #1–2 |
| **W4** | Hospital_Ledger live path + crisis tiers + talk-back design | Writer exists; wire + feedback |
| **W5** | Media/civic: no bare WP rate leads until support | Parallel anytime |
| **W6** | Probability vs macro (heat/flood gates vs high-signal flags) | After W1 data |

#### Grok checklist fill (§ team checklist)

- [x] Layer map vs code — confirmed + hospital/health hop corrections  
- [x] A/B/C — **Mike chain + C-publication hygiene**; not pure B  
- [x] Must-have invariants — engine-sheet list + dose caveat  
- [x] Hospital — existing writer; not greenfield  
- [ ] News ban — **recommend yes** until W3/W4 support  
- [ ] World_Config key draft — **still needed** (W2b deliverable)  
- [x] Owner order — table above  

#### Residual risks if team ships W2a only

Fixing `/17` without W3 still leaves **10% city ill / 0 sample sick**. Fixing W3 without talk-back still leaves WP free to drift. **Don't ship partial without saying which truth news may use.**

---

## Applications (living)

- 2026-08-07 — Written for full LLM team review per Mike.
- 2026-08-07 — engine-sheet code-truth review pass (S360): claims verified live, /17 divisor + 400000 constant found, C-via-A vote recorded.
- 2026-08-07 — Mike cascade direction block recorded (city→hood→citizen, per-metric WP, hospital exists, WP history defect).
- 2026-08-07 — grok second pass: health dose math, multi employment graphs, weather sibling feeds, reconcilation of votes, updated build order.

---

## Changelog

- 2026-08-07 (grok) — Initial team review brief from Mike direction + code map.
- 2026-08-07 (engine-sheet S360) — Code-truth review + hardcode finds + C-via-A vote.
- 2026-08-07 (engine-sheet S360) — Hospital/health hop corrections + Mike direction.
- 2026-08-07 (grok) — Second-pass re-review: agree/dissent, missed ripples, dose math, build order.
