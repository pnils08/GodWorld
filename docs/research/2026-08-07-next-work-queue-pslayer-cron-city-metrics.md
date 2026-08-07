---
title: Next work queue — P Slayer slice, cron lifecycle, city metrics — research
created: 2026-08-07
updated: 2026-08-07
type: reference
tags: [research, media, engine, civic, active]
sources:
  - Mike-direct 2026-08-07 — next work: (A) P Slayer slice, (B) cron life cycle review, (C) city data output metrics (sick%/employment%/etc.), fine-tune data to sim reality
  - docs/plans/2026-08-07-p-slayer-fan-heat-seat.md Task 3 open
  - scripts/buildJaxSlice.js — pattern for sports fan-pulse slice
  - AGENTS.md Live automation crontab table
  - docs/engine/ROLLOUT_PLAN.md engine.83 / engine.85 employment; civic.15; pipeline.45
pointers:
  - "[[../engine/ROLLOUT_PLAN]]"
  - "[[../plans/2026-08-07-p-slayer-fan-heat-seat]]"
  - "[[../plans/2026-07-28-civic-cron-city-hall]]"
  - "[[../plans/2026-07-27-employment-living-system]]"
  - "[[../plans/2026-07-26-employment-reconciliation]]"
---

# Next work queue — P Slayer slice, cron lifecycle, city metrics — research

**Source:** Mike-direct 2026-08-07 (session direction after civic.16 / solo seats closed).

**What this addresses:** Park the finished newsroom/civic-wall thread and name the **next deliberate queue** with existing surfaces, hazards, and a sensible order — so Claude/grok/engine-sheet don’t restart from zero.

**What it does:** Captures three workstreams Mike named, maps each to live code/docs/rollout, and gives a sequencing recommendation.

---

## Extraction — what's usable

### A. P Slayer slice (fan-pulse)

| Fact | Detail |
|------|--------|
| Status | **Open** — plan Task 3 only remaining build on pipeline.47 |
| Pattern | Parallel `scripts/buildJaxSlice.js` + inject in `cron-desk-run` for firebrand |
| Product | Sports-signal pack: roster move / loss / quiet win / blocked prospect → charge brief + wall prior takes |
| Inputs | `Oakland_Sports_Feed`, `As_Roster` deltas, wall `cp-POP-00008`, optional TrueSource |
| Not | Anthony board memo; multi-voice sports-desk |

**Verdict lean:** `adopt` as small build (grok or media) — plan already exists; no new research needed beyond feed-field check.

### B. Cron life cycle review

| Fact | Detail |
|------|--------|
| Status | Not a single plan — **audit** across live automation |
| Surfaces | Crontab (backup, digest, desk fanout, reflection, citizen-wake, exchange, NotebookLM, Saturday pipeline.45, health, maintenance, snapshot); PM2 (dashboard, mags-bot, wd-cards, moltbook) |
| Civic | Sun chain + Mon–Thu datawake + position walls (civic.16) |
| Newsroom | M–F three-wake fanout + Sat 16:00 canon door |
| Citizen | wakes 3×/day, exchange 1×/day |
| Risk | Overlap/gaps (who owns Fri office-holders as citizens?), double-spend models, silent fails, timezone UTC vs intent, first Sat pipeline.45 (Aug 8 watch) |

**Deliverable shape:** One research or ops note: job → schedule → writes → fail mode → owner terminal. No code until gaps named.

**Verdict lean:** `adopt` as **read-only audit first** (research-build / grok), then file rows only for real holes.

### C. City data output metrics — fine-tune to sim reality

| Fact | Detail |
|------|--------|
| Status | Cross-cutting engine + civic perception |
| Visible outputs | `world_summary` hood table (Sentiment, RetailVitality, EventAttractiveness, CrimeIndex); Riley/audit patterns; health lifecycle (HealthCause, StatusStartCycle); employment (engine.83 UNTRACKED shipped, engine.85 living system still open T4/T5/T7/T8) |
| Mike examples | sick%, employment%, etc. — map to **real columns/rates**, not invent dashboards |
| Hazard | Civic datawake already grounded against slice numbers; if city metrics are “off,” fix **engine truth** or **summary translation**, not voice agents sanding numbers |
| Related open | engine.83 employment recon; engine.85 employment living; chaos decay calibration; math-imbalance patterns in world_summary |

**Deliverable shape:** Metric inventory (source sheet/col → who reads → sample distribution last N cycles → “feels real?” → tune or accept). Then engine-sheet owns physics changes.

**Verdict lean:** `adopt` as **measure-twice audit** before any rebalance; split “display/translation” vs “sim physics.”

---

## Sequencing (recommended)

```text
1. B Cron lifecycle review (read-only map)     — cheap, orients A+C
2. C City metrics inventory (sick/employ/etc.) — grounds civic+engine truth
3. A P.Slayer fan-pulse slice                  — contained media/sports build
```

**Why this order:** Cron map prevents building slices against a broken wake schedule; metrics inventory prevents “fine-tuning” voices to lie about the city; P Slayer slice is ready pattern work once sports feed reality is clear.

**Alternate if Mike wants fun first:** A alone (1–2 sessions, low blast radius).

---

## Not applicable / hazard

- Don’t “fix” sick%/employment% by teaching reporters softer language — fix or accept engine rates.  
- Don’t expand multi-voice desks while slices land.  
- Cron review is not a license to rewrite crontab without approval.  
- Employment work already has owners (engine.83/85) — metrics review should **point at** those rows, not fork a third employment plan.

---

## Verdict: `adopt` (queue as three streams)

- **A** → continue [[../plans/2026-08-07-p-slayer-fan-heat-seat]] Task 3  
- **B** → new short research instance or ops section when audit runs  
- **C** → new research instance when inventory starts; may ignite engine-sheet tune plan  

**Ignited plans:** none new yet — A already has a plan; B/C research-first.

---

## Applications (living)

- 2026-08-07 — Mike named queue after civic.16/solo-seat close; filed for sequencing.

---

## Changelog

- 2026-08-07 (grok) — Initial queue capture + recommended order.
