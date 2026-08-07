---
title: City metrics vs sim reality — research
created: 2026-08-07
updated: 2026-08-07
type: reference
tags: [research, engine, civic, active]
sources:
  - Mike-direct 2026-08-07 — queue item C: sick%/employment%/city output metrics fine-tune to sim reality
  - Live Simulation_Ledger snapshot 2026-08-07 (service account, 931 rows)
  - Live Neighborhood_Map sample 2026-08-07
  - output/world_summary_c99.md math-imbalance patterns
  - docs/engine/ROLLOUT_PLAN.md engine.83, engine.85
  - schemas/SCHEMA_HEADERS.md StatusStartCycle / HealthCause
pointers:
  - "[[2026-08-07-next-work-queue-pslayer-cron-city-metrics]]"
  - "[[2026-08-07-cron-lifecycle-review]]"
  - "[[../plans/2026-07-26-employment-reconciliation]]"
  - "[[../plans/2026-07-27-employment-living-system]]"
  - "[[../engine/ROLLOUT_PLAN]]"
---

# City metrics vs sim reality — research

**Source:** Live ledger + neighborhood sample 2026-08-07 + world_summary patterns. Mike queue item C.

**What this addresses:** Before “fine-tuning” stories or civic voices, measure what the **sim actually outputs** for health, employment, and city-state metrics — and where “feels wrong” is physics vs translation.

**What it does:** Baseline inventory + first findings + where tune work should go (not voice sanding).

---

## Extraction — live baseline (2026-08-07)

### Simulation_Ledger (n = 931)

| Metric | Value | Read |
|--------|------:|------|
| Status Active | 848 (91.1%) | Main living pool |
| Traded | 48 | Athletes/roster churn, not “unemployed” |
| pending | 23 | Pipeline state |
| Retired | 7 | |
| deceased | 5 | |
| **EmployerBizId filled** (real BIZ) | **792 (85.1%)** | Linked employment |
| **UNTRACKED** | **87 (9.3%)** | engine.83 sentinel — organic hire pool |
| **Blank EmployerBizId** | **52 (5.6%)** | Still dark |
| HealthCause non-empty | **0** | No operator/engine cause strings live |
| Status ill/injury-like | **0** | No sick roster in Status enum use |
| “Ill-like proxy” (status OR HealthCause) | **0 (0%)** | **Sick% effectively zero at ledger face** |

### Neighborhood_Map (22 hoods) — sample face

| Hood | Sentiment | CrimeIndex | RetailVitality |
|------|-----------|------------|----------------|
| Downtown | 0.23 | 1.95 | 10.07 |
| Temescal | 0.18 | 2.0 | 10.38 |
| West Oakland | 0.08 | 2.98 | 5.5 |
| Fruitvale | 0.11 | 3.0 | 11.35 |

World_summary still surfaces **math-imbalance** decay patterns (Sentiment down, Crime up, Retail down) with no matching initiative — engine noise civic datawakes already react to.

### What civic/news already consume

- Datawake `domainSlice`: crime, health sections, city digest, tracker — **numbers must appear in slice** (ungrounded digit reject).  
- world_summary hood table: Sentiment / RetailVitality / EventAttractiveness / CrimeIndex.  
- Health lifecycle columns exist (StatusStartCycle, HealthCause) and are **wired but currently empty** on the live face.

---

## Findings (sim reality, not vibes)

1. **Employment looks mostly “real” at surface:** ~85% BIZ-linked; 9% UNTRACKED is intentional living-system feedstock (engine.83), not pure failure. Blank 5.6% is the residual dark set.  
2. **Sick% is not a live city output today.** If Mike wants hospitals/sick rates in civic health datawakes, the **engine must emit** illness/injury status or HealthCause volume — reporters/offices cannot invent it.  
3. **Crime/sentiment/retail are the loud city metrics** — and they already drive civic math-imbalance + police datawakes. Fine-tune here is **decay/calibration + initiative coverage**, not missing columns.  
4. **Do not teach models to invent sick%** to match real-world priors. Prosperity-era Oakland + empty HealthCause = healthy-by-default until lifecycle fires.

---

## Fine-tune lanes (if Mike wants work)

| Lane | Owner | Action |
|------|-------|--------|
| Employment blank 5.6% + UNTRACKED behavior | engine-sheet | Continue engine.83/85; don’t re-open in media |
| Sick/injury prevalence | engine-sheet | Verify `processHealthLifecycle_` firing rates; Health_Cause_Queue ops; sample N cycles for Status≠Active health |
| Hood Crime/Sentiment decay | engine-sheet | Chaos/pulse/gentrification clobber history; compare to initiative coverage |
| Summary translation | research-build | world_summary may over-alarm “decay” vs actual quality of life |
| Civic datawake honesty | already gated | Keep digit grounding; expand domainSlice only when engine emits health rates |

---

## Not applicable / hazard

- Fine-tuning **journalism** to invent employment crisis or epidemic = contamination.  
- “Employment%” must define denominator (Active adults vs all rows vs exclude Traded athletes).  
- Sports Traded ≠ civilian unemployment.

---

## Verdict: `adopt` (inventory baseline)

- **Sick%:** treat as **engine gap / prosperity default**, not reporting gap. Next measure: multi-cycle Status + HealthCause time series after an engine fire.  
- **Employment%:** treat as **mostly healthy** with known UNTRACKED/blank tails owned by engine.83/85.  
- **City stress metrics:** real and already loud — calibrate, don’t invent.

**Ignited plans:** none new — point engine-sheet at health lifecycle prevalence if Mike wants sick% > 0; else accept healthy city.

**Next measure (handoff):** one script `scripts/cityMetricsSnapshot.js` optional — or re-run this snapshot post-cycle.

---

## Applications (living)

- 2026-08-07 — Baseline for queue item C; informs civic health datawake expectations.

---

## Changelog

- 2026-08-07 (grok) — Live ledger n=931 + hood sample + findings.
