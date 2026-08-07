---
title: City metrics vs sim reality — research
created: 2026-08-07
updated: 2026-08-07
type: reference
tags: [research, engine, civic, active]
sources:
  - Mike-direct 2026-08-07 — queue item C; correction that World_Population carries illnessRate/employmentRate (~10% / ~90%)
  - Live World_Population row cycle 102 (service account)
  - Live Neighborhood_Demographics (21 hoods) cycle 102
  - Live Simulation_Ledger n=931 (wrong surface for city rates — documented as error)
  - phase03-population/applyDemographicDrift.js (illness + employment physics)
  - phase03-population/updateNeighborhoodDemographics.js (expectedSick from city rate)
  - phase03-population/finalizeWorldPopulation.js (does NOT rewrite illness/employment)
  - phase06-analysis/processArcLifeCyclev1.js (illness thresholds 0.05 / 0.07)
pointers:
  - "[[2026-08-07-next-work-queue-pslayer-cron-city-metrics]]"
  - "[[2026-08-07-cron-lifecycle-review]]"
  - "[[../plans/2026-07-26-employment-reconciliation]]"
  - "[[../engine/ROLLOUT_PLAN]]"
---

# City metrics vs sim reality — research

**Source:** World_Population + Neighborhood_Demographics + code paths that write them. Mike correction 2026-08-07.

**What this addresses:** Whether ~**10% illness** and ~**90% employment** on `World_Population` are logical for the sim — and which layer is authority for “city health / jobs.”

**Correction (grok):** The first pass of this file measured **Simulation_Ledger** HealthCause/Status and claimed sick%≈0. That was the **wrong surface**. City rates live on **`World_Population`** (single-row state). Ledger HealthCause empty does **not** mean the city is healthy.

---

## Three layers (do not collapse)

| Layer | What it is | Cycle 102 face |
|-------|------------|----------------|
| **A. World_Population** | City-scale dials the engine drifts every cycle | pop ≈ **386,587** · **illnessRate 0.0985 (~9.9%)** · **employmentRate 0.8998 (~90.0%)** · civicLoad load-strain · high-signal · shock-flag |
| **B. Neighborhood_Demographics** | Per-hood counts (Students/Adults/Seniors/Unemployed/Sick) — small-scale buckets driven *from* city rates | Sum Sick **1,679** / sum people **32,249** → sick share **~5.2%**; Unemployed **1,557** / Adults **23,247** → unemp **~6.7%** (emp of adults **~93.3%**) |
| **C. Simulation_Ledger** | Representative citizen sample (~931 rows), jobs as EmployerBizId, health as Status/HealthCause | **85%** BIZ-linked · **9%** UNTRACKED · **0** HealthCause — **does not store city illnessRate** |

**Authority for “city illness% / employment%”:** **Layer A** (`World_Population`).  
Layer B is a **downstream target model** (expected sick/unemployed from A × hood mods).  
Layer C is a **named-citizen sample**, not a 386k census.

---

## Live World_Population (cycle 102) — Mike’s row

| Field | Value | Plain |
|-------|------:|-------|
| totalPopulation | 386587 | City model size (not ledger row count) |
| illnessRate | **0.0985** | **~9.9% of city “ill”** |
| employmentRate | **0.8998** | **~90.0% employed** |
| economy | stable | Label |
| civicLoad | load-strain | Matches high-signal + shock |
| patternFlag | strain-trend | |
| shockFlag | shock-flag | |
| worldEventsCount | 11 | High volume |
| loads | traffic 0.81 … retail 1.17 … | City dynamics face |

Drift history (World_Drift_Report C85): illness ~0.094, employment ~0.919 — same **band**, slow walk.

---

## How the rates are made (physics, not magic)

### Illness (`applyDemographicDrift_`)

- Starts from **previous row** (path-dependent random walk).  
- Base: slight downward drift; winter/fog/comfort/chaos/econ stress push **up**.  
- Holidays/crowds push up; high community engagement pushes down.  
- **Clamp: 0 … 0.15 (15% cap).**  
- Defaults if missing: **0.05**.

So **~10% is intentional elevated band**, not a bug by itself. Arc lifecycle treats:

- `illnessRate < 0.05` → health-crisis can resolve  
- `illnessRate > 0.07` → health pressure / arc fuel  

**0.098 is above 0.07** → system *should* feel “city is sick-er than calm baseline.” That **is** logical **inside this dial physics** during strain cycles. Whether it matches real-world “currently ill today” (~2–4% acute) is a **design taste** question — the sim chose a looser, more story-visible illness dial (up to 15%).

### Employment (`applyDemographicDrift_`)

- Explicit: **“Tend toward 0.90–0.93 band.”**  
- Floor **0.80**, cap **0.98**.  
- Sentiment/econ mood/holidays/sports nudge tiny steps.  
- Default if missing: **0.91**.

So **~90% employment is the design setpoint**, not an accident. Prosperity-era Oakland with high employment is **on-doctrine**. ~10% not-in-employment-rate is **not** the same as ledger “unemployed adults” — it’s a city dial.

### Downstream hood demo

`updateNeighborhoodDemographics_` does:

- `expectedSick ≈ hoodPop × illnessRate × hoodIllnessMod`  
- `expectedUnemployed ≈ workingPop × (1 − employmentRate)`

Live hood sums show **sick ~5%**, **adult unemp ~7%** — **not identical** to World_Population 9.9% / 10% unemp. Possible causes: hood mods, different denominators (total vs adults), lag, or demo scale (32k vs 386k) not rebased to city pop. **Worth a follow-up engine measure** if Mike wants layer B to track A tightly.

---

## Is 10% illness + 90% employment logical?

| Question | Answer |
|----------|--------|
| Logical **as implemented code?** | **Yes.** Employment is hard-attracted to ~90–93%. Illness random-walks under strain with 15% cap; 10% is elevated-but-legal. |
| Logical **as prosperity-era story?** | **Employment yes.** **Illness is the open taste call:** 10% citywide “ill” is high for a healthy prosperity frame *if* it means acute sickness; moderate if it means “not fully well / burden / under care.” Engine consumers treat >7% as pressure — so **story systems expect ~10% to feel strained.** |
| Logical **vs ledger sample?** | **Must not compare 1:1.** Ledger has no illnessRate column; empty HealthCause ≠ healthy city. Employment on ledger (85% BIZ-linked) is a **different definition** (named employer ID, not city dial). |
| Logical **together?** | Compatible: high employment + elevated illness = working city under health load (absenteeism/strain) without mass unemployment. Matches high-signal / shock / load-strain row. |

**Verdict on the pair Mike pasted:** **Internally consistent with demographic drift design and with a strained high-signal cycle.** Not nonsense. Fine-tune only if Mike wants **lower default illness** (re-center walk toward 0.05) or **tighter coupling** of hood Sick counts to World_Population.

---

## First-pass error (accountable)

| Wrong claim | Why wrong |
|-------------|-----------|
| “Sick% ≈ 0” | Measured ledger HealthCause, not World_Population.illnessRate |
| “Employment mostly fine via BIZ%” | True for **sample jobs linkage**, not the city employmentRate dial |

**Lesson:** City output metrics audit **starts at World_Population**, then hood demographics, then ledger — never ledger alone for city rates.

---

## Fine-tune options (only if Mike wants change)

1. **Accept** 90% emp / ~5–10% illness as prosperity + pressure band (no code).  
2. **Illness re-center:** bias drift toward 0.04–0.06 so “calm” city sits under arc threshold 0.05; leave room to spike on shocks.  
3. **Reconcile layer B:** audit why hood Sick sum rate (~5%) ≠ city illnessRate (~10%).  
4. **Ledger health face (optional later):** if citizen pages should reflect city illness, health lifecycle must actually mint Sick/HealthCause — separate from World_Population dial.  
5. **Employment:** leave dial; continue engine.83/85 for **named** employment truth on ledger.

---

## Not applicable / hazard

- Do not “fix” 10% illness by deleting it from civic speech — physics says elevated.  
- Do not treat 386k pop as ledger count (931).  
- Do not redefine employmentRate as EmployerBizId fill rate.

---

## Verdict: `adopt` (corrected inventory)

- **World_Population is the city face Mike quoted — correct to take seriously.**  
- **~90% employment is designed.**  
- **~10% illness is elevated-by-design under strain, capped at 15%; story systems already treat >7% as load.**  
- **Open engineering question:** hood Sick rate lag/desync vs city dial.  
- **Open design question:** should prosperity-era baseline illness sit closer to 5%?

**Ignited plans:** none until Mike picks accept vs re-center illness vs reconcile Neighborhood_Demographics.

---

## Applications (living)

- 2026-08-07 — Wrong-surface first pass.  
- 2026-08-07 — Corrected after Mike World_Population paste; physics read from applyDemographicDrift_.

---

## Changelog

- 2026-08-07 (grok) — Initial (incorrect ledger-only) pass.  
- 2026-08-07 (grok) — Full rewrite: World_Population authority, drift physics, 10%/90% logic, layer desync note.
