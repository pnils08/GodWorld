---
title: Civic office lived-experience packets Plan
created: 2026-08-15
updated: 2026-08-15
type: plan
tags: [civic, architecture, active]
sources:
  - docs/research/2026-08-14-civic-process-install.md — parent: Mon–Thu living + district heat
  - docs/adr/0017-typed-lived-experience-packets.md — Packet order only. Media and civic are different teams.
  - docs/research/2026-08-08-journalist-heat-slice-architecture.md — pack *shape* (substrate + overlay), not the newsroom civic desk
  - docs/plans/2026-07-28-civic-cron-city-hall.md — civic.15 Sunday chain + weekday datawake
  - docs/plans/2026-08-07-office-holder-position-wall.md — civic.16 wiki already saves stated:/datawake: to cp-POP
  - scripts/cron-civic-run.js domainSlice — current office input (world_summary hoods + INIT ids)
  - Mike-direct 2026-08-15 — Sunday = city-hall packets; Mon–Thu = district packs; each wake reads prior wiki so Sunday they fight for what they learned
pointers:
  - "[[engine/ROLLOUT_PLAN]] — civic.17"
  - "[[../research/2026-08-14-civic-process-install]] — research basis"
  - "[[../adr/0017-typed-lived-experience-packets]] — Packet contract"
  - "[[2026-08-08-journalist-heat-slice-packs]] — newsroom only (Carmen et al. cover City Hall). Not this plan."
  - "[[2026-07-28-civic-cron-city-hall]] — civic.15 Sunday packets; this plan does not flip --apply"
  - "[[2026-08-07-office-holder-position-wall]] — civic.16 wall is the persist layer; do not invent a second wiki"
  - "[[index]] — registered same commit"
---

# Civic office lived-experience packets Plan

**Goal:** By Sunday city-hall, each office is already layered with a week of their district — so they fight for what they know and what that turf needs, not a cold brief.

**Architecture:** Two handoffs, one memory.

- **Mon–Thu:** district package (ADR-0017 Packet: people, projects, how the turf feels). They live with last week’s choices.
- **Sunday:** city-hall packets (civic.15). Same office also gets that week’s district packs plus their wiki so the decide step is not a blank Monday.
- **Every wake reads and writes the existing office wiki** (`officeWall.js` / cp-POP, daypart CIVIC). Thoughts persist to the next action. Do not build a second diary.

civic.15 still owns the stamp. This plan does not write Initiative_Tracker.

**Terminal:** grok / kimi on `scripts/` + `docs/`; engine-sheet only if a live sheet read is later approved. Sandbox before any live sheet touch.

**Pointers:**
- Prior work: civic.15 Sunday packets + weekday datawake + civic.16 office wiki
- Pattern only: ADR-0017 Packet order (not the newsroom wake)
- Research basis: [[../research/2026-08-14-civic-process-install]]

**Acceptance criteria:**
1. Mon–Thu wake: district Packet + prior wiki lines injected; statement saved back to the same wiki.
2. Sunday prep: city-hall packet includes that office’s week of wiki + latest district pack. They are not starting from zero.
3. No invented people. No tracker `--apply` in this plan.

---

## What they should get (sheet → pack)

Disk-first. Same wipe lesson: if a copy is gone, rebuild from the cycle audit or leave the field empty. Do not invent.

| They need | Where it lives | In the pack |
|---|---|---|
| Who I am (name, seat, district, faction) | `civic-office-map.json` + office-ledger snap if present | `actor` |
| What I am doing today | **Mon–Thu = district package.** **Sunday = city-hall packet** (decide). | `task` |
| How my turf feels | `world_summary` hood table (already parsed) | `signal` |
| My projects | `initiative_tracker.json` (already rebuilds) | `known` FACT |
| People I serve | All active ledger people in my hoods. **Tier 4 first**, then 3, 2, 1. Athletes and names are fair game, not first. Cap. | `exposure.subjects` |
| My civic job | `Civic_Office_Ledger` + crime + neighborhood rows for my turf (from cycle audit) | `known` + `role` |
| What I already thought | **civic.16 office wiki** (cp-POP, `stated:` / `datawake:`). Load on every wake; save after. | `exposure.sources` + prompt inject |
| Must not invent | people, counts, “complete,” votes | `limits` |
| What I turn in | existing statement JSON (weekday); trackerUpdates stay civic.15 Sunday | `output` |

Not in v1: full voice-file rewrite, election/chair-change, live Sheet writes.

---

## Tasks

### Task 1: Field map (this plan’s table is the draft)

- **Files:** this plan §What they should get — confirm against `simulation_ledger_snapshot` headers and `DISTRICT_HOODS` in `updateCivicApprovalRatings.js` / `lib/districtMap.js`
- **Steps:**
  1. List exact snapshot column names for name, hood, role. If snapshot missing, builder must fail empty, not call Sheets, unless Mike approves a read.
  2. Mayor / chief / project: citywide or listed hoods, not “all 900 people.” Cap (e.g. 8 named constituents) by district then role, deterministic sort.
- **Verify:** table in this plan names real columns (no invented fields).
- **Status:** [x] columns are POPID, Name (or First+Last), Neighborhood, RoleType, Status on `simulation_ledger_snapshot.jsonl`

### Task 2: `scripts/buildCivicOfficeSlice.js`

- **Files:**
  - `scripts/buildCivicOfficeSlice.js` — create
  - `scripts/buildCivicOfficeSlice.test.js` — create (synthetic names only)
- **Steps:**
  1. Shared substrate: cycle world_summary hoods + tracker snapshot + ledger snapshot filter.
  2. Overlay from office map `dataDomain` / district.
  3. Emit Packet JSON (ADR-0017 order) + a short markdown audit file under `output/cron-civic/packs/`.
  4. Reuse `livedExperiencePacket.js` helpers if they fit without dragging reporter wakes. Do not clone eighteen journalist builders.
- **Verify:** `node scripts/buildCivicOfficeSlice.test.js` PASS; fixture office with no ledger rows gets `subjects: []`.
- **Status:** [x] builder + test shipped (grok 2026-08-15). C103 Ashford pack on disk. Cron not wired yet.

### Task 3: Wire weekday datawake to the pack

- **Files:** `scripts/cron-civic-run.js` — modify `runDatawake` only
- **Steps:**
  1. Build the **district pack** before the model call. Prompt = Packet + IDENTITY/RULES + **prior wiki** (`loadPositionWall`). Drop raw `domainSlice` as the main body.
  2. After a good statement, **save to the same wiki** (already wired; keep it).
  3. Keep the ungrounded-number wall. No `--apply`.
- **Verify:** `node --check scripts/cron-civic-run.js`; one `--stage=datawake --dry-run` shows pack path + non-empty limits.
- **Status:** [ ] open

### Task 4: One attended dry run, then stop

- **Files:** output under `output/cron-civic/` only
- **Steps:**
  1. Run one weekday office (or rota of 3) dry. Show Mike what they were handed and what they said.
  2. Do not stamp the tracker. Do not start Sunday inject until he says the pack looks like their job.
- **Verify:** pack file + statement on disk; Mike has seen both.
- **Status:** [ ] open

### Task 5: Sunday city-hall packet carries the week (gated)

- **Files:** `scripts/cron-civic-run.js` `runPrep` — only after Task 4
- **Steps:**
  1. Sunday stays the city-hall packet (questions, cascade). Add: this office’s **wiki week** + latest **district pack**.
  2. Goal: they arrive fighting for what they already learned Mon–Thu, not rereading a cold city report.
  3. civic.15 gate and `--apply` stay as they are.
- **Verify:** prep packet contains a “this week on the wall” block sourced from wiki, plus a pointer to the district pack. No sheet write.
- **Status:** [ ] blocked on Task 4

---

## Status log

- 2026-08-15 (grok) — Plan filed for **offices** (Mayor, council, projects, chief). Newsroom civic reporters are a different team and stay on their own packs.
- 2026-08-15 (grok) — Week locked: Sunday = city-hall packets; Mon–Thu = district packs; wiki (civic.16) is the persist layer so Sunday is not a cold start.

---

## Changelog

- 2026-08-15 (grok) — Pack: T4-first people; chaos/news events on turf; appointed citywide (Montez et al.) get role numbers not neighbor filler. Short keys — cron food.
- 2026-08-15 (grok) — Split locked: civic media ≠ civic offices. This plan is offices only.
- 2026-08-15 (grok) — Week locked (Sunday city-hall / Mon–Thu district / wiki carry-forward).
- 2026-08-15 (grok) — Initial plan, civic.17. Research basis [[../research/2026-08-14-civic-process-install]].
