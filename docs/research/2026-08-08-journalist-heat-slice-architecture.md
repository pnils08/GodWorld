---
title: Journalist heat-slice architecture — research
created: 2026-08-08
updated: 2026-08-08
type: reference
tags: [research, media, pipeline, active]
sources:
  - Mike-direct 2026-08-08 — nightlife/fame/restaurants/TV uncovered; formalize packs; Hal is sports historian not business; Anthony analytic bag; Hal bag own or share sports substrate
  - scripts/buildJaxSlice.js — civic stink heat slice (pipeline.46)
  - scripts/buildPSlayerSlice.js — sports fan-pulse heat slice (pipeline.47 Task 3)
  - scripts/newsroom-fanout.js — DAILY_QUOTAS + DESK_DOMAINS + lane seeds
  - scripts/buildWorldSummary.js — desk_signal emission + Riley evening texture
  - output/desk_signal_c102.json — live culture/business/sports/civic lane shape
  - output/world_summary_c102.md — ## Evening Texture + ## Sports ground truth
  - docs/plans/2026-08-07-p-slayer-fan-heat-seat.md
  - docs/plans/2026-08-07-anthony-hal-solo-sports-seats.md
  - docs/plans/2026-08-07-culture-sports-support-solo-seats.md
  - docs/plans/2026-08-07-civic-solo-seats.md
  - docs/media/ANTHONY_ANALYSIS_BAG.md
  - docs/media/HAL_ARCHIVE_BAG.md
  - docs/media/P_SLAYER_CHARGE_BAG.md
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.52"
  - "[[index]] — research sub-catalog"
  - "[[../plans/2026-08-08-journalist-heat-slice-packs]] — ignited plan"
---

# Journalist heat-slice architecture — research

**Source:** Live GodWorld headless path audit (2026-08-08) — fanout + desk_signal + world_summary + solo-seat plans + two shipped heat-slice builders. Builder session with Mike (not an external paper).

**What this addresses:** Solo personas and charge bags shipped for most Tribune seats, but only Jax and P Slayer get a **deterministic journalist heat slice**. Nightlife, fame, restaurants, TV, and real storefront business still feel uncovered even when Riley / sheets hold the facts. Need a durable architecture so the next builds are packs + overlays, not ad-hoc one-offs we forget.

**What it does:** Measures who has what, what culture/business lanes actually seed today, how that diverges from evening texture and sports feed truth, and locks shared-substrate + persona-overlay design with seat roles corrected (Hal = sports historian).

---

## Extraction — what's usable

### 1. Two “slice” eras (do not conflate)

| Kind | Owner | Purpose |
|------|-------|---------|
| **Mags desk-slice** (`/desk-slice`, pipeline.44) | EIC skill, pre-cron fork | Territory per *desk* for deep-dispatch |
| **Journalist heat slice** (`buildJaxSlice` / `buildPSlayerSlice`) | Headless cron | Assignment pack per *voice* |

Legacy multi-voice desks (sports-desk, culture-desk, civic-desk, business-desk) are **skills from before crons**, not the M–F machine. Task-style “mark legacy for headless” is bookkeeping, not a new cron.

### 2. Only two full heat slices exist

- **Jax** (`buildJaxSlice.js`) — stink scanner, contradiction, citizen interview pool, scene color  
- **P Slayer** (`buildPSlayerSlice.js`) — Oakland_Sports_Feed pulse classes, charge-bag modes, foil number, prior columns, PREWRITE  

All other solo seats: **persona-map + bag hard-inject + optional thin desk_signal seed**. No unpack of named evening venues into the assignment.

### 3. Data exists; seeds do not unpack it (C102 proof)

**Riley `## Evening Texture` holds:** famous people spotted, restaurants (named + hood), nightlife spots + volume/vibe, city events, evening TV, movies, sports broadcast, streaming/food trends.

**Culture `desk_signal` mostly holds:** hood texture/events, one evening **pointer** (“Named venues that moved…”) without expanding names, faith ripples, a few fame-rise/sightings.

→ Nightlife / restaurants / TV feel “uncovered” because cron seeds never materialize the Riley lines as a charge pack. Fix = **evening life pack**, not inventing venues.

**Business lane** is mostly economic/transit/housing ailments + neighborhood rising/cooling ripples — not Business_Ledger storefronts / kitchen labor / Key_Personnel. Fix = **economic/storefront pack**.

**Education** (Angela Reyes, EDUCATION domain) rides **civic** DESK_DOMAINS pool — no education lane, no school pack.

### 4. Quota wall

`DAILY_QUOTAS`: civic 2 · sports 2 · culture **1** · business **1**. Even perfect packs cannot cover arts + kitchen + lifestyle + faith on one culture slot/day. Packs raise quality of the seat that wakes; capacity is a separate fanout decision.

### 5. Architecture locked (Mike-agreed)

```
shared substrate pack  →  persona charge overlay  →  optional heat-force
```

- **Shared substrate** — unpack cycle data once (evening, economic, sports feed, civic/stink-adjacent).  
- **Persona overlay** — bag modes, friction frame, foil style, prior takes / wall.  
- **Dedicated heat builder** — only when scoring physics is special (stink scanner, sports fan classes, maybe investigation silence, roster audit memo).

**Best practice product:** every journalist wake gets a real assignment pack.  
**Best practice code:** do **not** clone `buildPSlayerSlice` eighteen times.

### 6. Seat roles (corrections + sports trio)

| Seat | Role | Substrate | Overlay |
|------|------|-----------|---------|
| **P Slayer** | Fan heat | Sports feed pack (shipped as buildPSlayerSlice) | `P_SLAYER_CHARGE_BAG` |
| **Anthony Raines** | Analytic beat — board, fit, process | **Sports substrate** (feed + As_Roster/TrueSource line + player POPIDs) | `ANTHONY_ANALYSIS_BAG` |
| **Hal Richmond** | **Sports historian** (not business; not bleacher) | **Share sports substrate** with Anthony (same players/feed/present facts) | `HAL_ARCHIVE_BAG` (variety of time / continuity) |
| **Jax** | Civic stink / accountability | Stink pack (shipped) | Firebrand approach |
| **Mason / Kai / Sharon / Maria** | Kitchen / arts / lifestyle / ground | **Shared evening pack** | Per-seat bags |
| **Elliot Graye** | Faith / quiet work | Evening when faith overlaps; faith registry | `GRAYE_FAITH_BAG` |
| **Business rota** | Storefronts / workforce | **Economic pack** | Seat bag if any |
| **Carmen / Luis / Trevor / Torres / Mezran / Noah / Angela** | Civic domain family | Civic/engine substrate + domain filter | Per-seat bags |
| **Tanya / Simon** | Clubhouse / long view | Sports substrate | Their bags |
| **Marbury / Ariana** | Deep analysis memos | Sports line + TrueSource | Data bags (canon-path numbers) |

Hal and Anthony **share player/feed substrate**, not each other’s bags. Hal must not land on business seeds by domain accident without a story; persona reverse-map already tags him SPORTS.

### 7. Who is missing a proper pack (priority)

| Priority | Gap | Consumers |
|----------|-----|-----------|
| **P0** | Evening life unpack | Mason, Kai, Sharon, Maria (+ Graye edge) |
| **P0** | Economic / storefront | Business quota seats, Mason edge |
| **P1** | Anthony analytic pulse (own builder or sports pack + analysis overlay) | anthony-raines |
| **P1** | Hal archive pulse (sports pack + archive overlay; share players with Anthony) | hal-richmond |
| **P2** | Education / youth | Angela |
| **P2** | Civic domain overlays on shared civic substrate | Carmen, Luis, Trevor, Torres, Mezran, Noah |
| **P3** | Marbury/Ariana memo packs (numbers-first, not column heat) | data seats |

---

## Not applicable / hazard

- **Not** replacing Mags desk-slice or unfreezing edition path.  
- **Not** inventing nightlife/restaurant/TV facts — only unpack Riley / ledgers.  
- **Not** one culture slot covering every culture solo every day — packs ≠ quota.  
- **Hazard:** treating Hal as business (fanout mis-seed) — he is sports historian; keep SPORTS domain + sports substrate.  
- **Hazard:** Anthony bag inventing x-stats — already bag-hard-ruled; analytic slice must foil only from As_Roster / TrueSource / feed.  
- **Hazard:** business pack inventing employees — employment living-system research still binds (tracked rows only).

---

## Verdict: `adopt`

Mike-agreed 2026-08-08: shared packs + persona overlays; evening first; Anthony analytic; Hal sports historian with own bag on shared sports substrate. Ignites plan [[../plans/2026-08-08-journalist-heat-slice-packs]] and rollout **pipeline.52**.

**Ignited plans:** [[../plans/2026-08-08-journalist-heat-slice-packs]]

---

## Applications (living)

- 2026-08-08 — Architecture locked; plan + pipeline.52 filed for build start.

---

## Changelog

- 2026-08-08 (grok) — Initial research from live audit + Mike session (evening gap, packs design, Hal/Anthony roles).
