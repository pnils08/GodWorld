---
title: Journalist heat-slice packs Plan
created: 2026-08-08
updated: 2026-08-08
type: plan
tags: [media, pipeline, active]
sources:
  - docs/research/2026-08-08-journalist-heat-slice-architecture.md
  - Mike-direct 2026-08-08 — adopt packs architecture; Hal sports historian; Anthony analytic; evening first
  - scripts/buildJaxSlice.js
  - scripts/buildPSlayerSlice.js
  - docs/media/ANTHONY_ANALYSIS_BAG.md
  - docs/media/HAL_ARCHIVE_BAG.md
pointers:
  - "[[engine/ROLLOUT_PLAN]] — pipeline.52"
  - "[[../research/2026-08-08-journalist-heat-slice-architecture]] — research basis"
  - "[[2026-08-07-p-slayer-fan-heat-seat]] — sibling sports fan heat (shipped Task 3)"
  - "[[2026-08-07-anthony-hal-solo-sports-seats]] — Anthony + Hal personas"
  - "[[2026-08-07-culture-sports-support-solo-seats]] — culture solos + bags"
  - "[[2026-08-06-jax-sim-stink-audit]] — Jax stink pack"
---

# Journalist heat-slice packs Plan

**Goal:** Every headless journalist wake gets a real assignment pack built from sheet/Riley truth — via a few **shared substrate packs** plus **persona charge overlays** — so nightlife, fame, restaurants, TV, storefronts, and sports analytic/archive seats stop going silent.

**Architecture:** Do not clone a full custom scorer per seat. Pattern:

```
shared substrate pack → persona charge overlay → optional heat-force in fanout
```

Shipped exemplars: Jax (stink substrate + firebrand overlay), P Slayer (sports fan pulse + charge bag). Next: **evening life pack** (culture consumers), **economic/storefront pack** (business), **sports substrate shared by Anthony + Hal** with separate bags (analysis vs archive). Legacy multi-voice desks remain skills for deep/edition; crons stay persona-only.

**Terminal:** scripts + docs (grok / kimi writable); media terminal for any control-plane skill notes; engine-sheet only if sheet schema changes (not expected for pack builds).

**Research basis:** [[../research/2026-08-08-journalist-heat-slice-architecture]]

**Acceptance criteria:**
1. Evening pack unpacks named restaurants, nightlife, TV/movies, city events, fame sightings from `world_summary` / Riley into machine-readable JSON + markdown slice; culture fanout/persona inject can load it.
2. Economic pack surfaces real Business_Ledger (or world_summary economic) storefronts / workforce pointers without inventing employees.
3. Anthony and Hal both consume a **shared sports substrate** (feed + player POPIDs + line stats when present); Anthony overlay uses `ANTHONY_ANALYSIS_BAG`; Hal overlay uses `HAL_ARCHIVE_BAG` (historian, not fan heat, not business).
4. Plan + research + rollout row registered; no isolated MDs.
5. Offline tests for each new pack builder (mirror `buildPSlayerSlice.test.js`).

---

## Seat map (locked)

| Seat | Role | Substrate | Overlay bag |
|------|------|-----------|-------------|
| P Slayer | Fan heat | Sports fan pulse (**shipped**) | `P_SLAYER_CHARGE_BAG` |
| Anthony Raines | Analytic | Shared sports substrate | `ANTHONY_ANALYSIS_BAG` |
| Hal Richmond | Sports historian | Shared sports substrate (same players/feed) | `HAL_ARCHIVE_BAG` |
| Jax | Accountability | Stink (**shipped**) | Firebrand approach |
| Mason / Kai / Sharon / Maria | Kitchen / arts / lifestyle / ground | **Evening pack** | Per-seat bags |
| Elliot Graye | Faith | Evening + faith registry | `GRAYE_FAITH_BAG` |
| Business seats | Storefront economy | **Economic pack** | seat stance if any |
| Civic domain family | Council / infra / safety / health / env / education | Civic/engine (extend later) | Per-seat bags |
| Tanya / Simon | Clubhouse / long view | Sports substrate | Their bags |
| Marbury / Ariana | Deep analysis memos | Sports line + TrueSource | Data bags |

**Hal correction:** sports historian journalist only — never treat as business desk. Share substrate with Anthony; **do not** share analysis bag.

---

## Tasks

### Task 1: Evening life pack (P0)

- **Files:**
  - `scripts/buildEveningSlice.js` — create
  - `scripts/buildEveningSlice.test.js` — create
  - `scripts/cron-desk-run.js` — inject for culture personas (mason/kai/sharon/maria/graye)
  - `scripts/newsroom-fanout.js` — optional enrich when culture seat is one of the evening consumers
- **Steps:**
  1. Parse `output/world_summary_c{N}.md` `## Evening Texture` (restaurants, nightlife, TV, movies, city events, famous people, trends) + culture lane fame/sighting entries from `desk_signal`.
  2. Emit scored “life pulses” (quiet nightlife, named restaurant, TV slate, fame sighting, city event) with **named** venues only from sources — never invent.
  3. Write `output/slices/c{N}/evening.md` + `output/cron-compare/evening_slice_c{N}.json`.
  4. Persona overlay: recommend which consumer bag fits top pulse (kitchen vs arts vs lifestyle vs ground) without forcing all four.
- **Verify:** `node scripts/buildEveningSlice.test.js` PASS; `node scripts/buildEveningSlice.js --cycle 102` names venues from C102 summary (e.g. The 44th Table, KONO Cocktails).
- **Status:** [ ] not started

### Task 2: Economic / storefront pack (P0)

- **Files:**
  - `scripts/buildEconomicSlice.js` — create
  - `scripts/buildEconomicSlice.test.js` — create
  - Wire fanout `business` desk + cron inject
- **Steps:**
  1. Prefer disk: world_summary business-ish ripples + any Business_Ledger snapshot/export if present; fail-soft offline.
  2. Surface neighborhood rising/cooling **with** named businesses when available; never invent Employee_Count or Key_Personnel.
  3. Artifacts: `output/slices/c{N}/economic.md` + `output/cron-compare/economic_slice_c{N}.json`.
- **Verify:** offline tests; dry fanout enrich path non-fatal if empty.
- **Status:** [ ] not started

### Task 3: Shared sports substrate module (P1)

- **Files:**
  - `scripts/sportsSubstrate.js` (or fold helpers out of `buildPSlayerSlice.js`) — create/extract
  - Refactor P Slayer to call shared parse of world_summary Sports where safe
- **Steps:**
  1. One parser for Sports section rows (cycle, team, event, StoryAngle, Notes, Stats, record/streak/mood/fan, names→POPID).
  2. Export pure functions used by P Slayer, Anthony, Hal builders.
  3. Keep P Slayer scoring/modes private to fan heat.
- **Verify:** existing `buildPSlayerSlice.test.js` still PASS.
- **Status:** [ ] not started

### Task 4: Anthony analytic pulse (P1)

- **Files:**
  - `scripts/buildAnthonySlice.js` — create
  - `scripts/buildAnthonySlice.test.js` — create
  - `scripts/cron-desk-run.js` + `newsroom-fanout.js` — persona `anthony-raines`
- **Steps:**
  1. Consume sports substrate; score for board-architecture heat (resign, trade, WAR/ERA lines, award board) not bleacher charge.
  2. PREWRITE aligned to `ANTHONY_ANALYSIS_BAG` (one evaluative claim, foil from line stats only).
  3. Artifacts: `output/slices/c{N}/anthony.md` + `pslayer`-style cron-compare JSON name `anthony_slice_c{N}.json`.
- **Verify:** tests PASS; third-person analytic approach string; no fan “we.”
- **Status:** [ ] not started

### Task 5: Hal archive pulse (P1)

- **Files:**
  - `scripts/buildHalSlice.js` — create
  - `scripts/buildHalSlice.test.js` — create
  - cron + fanout for `hal-richmond`
- **Steps:**
  1. Same sports substrate as Anthony (players/feed present facts).
  2. Overlay `HAL_ARCHIVE_BAG`: present fact first, then era echo; closing palette; not FO PR, not fan heat.
  3. Prior columns from `output/reporters` / desks for Hal if present; wall at wake remains cron-owned.
- **Verify:** tests PASS; approach names historian/continuity; never assigns business desk.
- **Status:** [ ] not started

### Task 6: Civic family + education note (P2)

- **Files:** plan status log + optional thin `buildCivicDomainSlice.js` later
- **Steps:**
  1. Document that Angela/education has no dedicated lane yet — either civic substrate filter or future education pack.
  2. Do not block P0/P1 on this.
- **Verify:** open question resolved or deferred with trigger.
- **Status:** [ ] not started

### Task 7: Legacy desk skill note (bookkeeping)

- **Files:** optional one-liner in culture-desk / sports-desk / business-desk IDENTITY or plan only
- **Steps:** Mark multi-voice desks as pre-cron skills; headless uses personas + packs. No cron rewrite required if already persona-only.
- **Status:** [ ] not started — media terminal may land control-plane notes

---

## Build order (Mike-agreed)

1. Task 1 Evening (biggest “data exists, coverage doesn’t”)  
2. Task 2 Economic  
3. Task 3 Sports substrate extract  
4. Task 4 Anthony  
5. Task 5 Hal  
6. Tasks 6–7 as capacity allows  

---

## Open questions

- [ ] Fanout **culture quota = 1**: after evening pack, should high-heat evening force a second culture seat some days? (quota change = separate Mike call)
- [ ] Business pack: live Sheets `Business_Ledger` vs disk-only until snapshot exists — default disk-first offline, optional Sheets behind explicit approve
- [ ] Task 6 education pack trigger: when youth/school rows appear on feed or world events

---

## Status log

- 2026-08-08 (grok) — Plan filed from research; ready to build Task 1 when session continues.

---

## Changelog

- 2026-08-08 (grok) — Initial plan; pipeline.52; Hal locked as sports historian on shared sports substrate with Anthony; evening + economic P0.
