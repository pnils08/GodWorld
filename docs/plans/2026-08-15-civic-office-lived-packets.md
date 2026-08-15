---
title: Civic office lived-experience packets Plan
created: 2026-08-15
updated: 2026-08-15
type: plan
tags: [civic, architecture, active]
sources:
  - docs/research/2026-08-14-civic-process-install.md — parent: Mon–Thu living + district heat
  - docs/adr/0017-typed-lived-experience-packets.md — Packet law (actor → task → signal → exposure → known → limits → output)
  - docs/research/2026-08-08-journalist-heat-slice-architecture.md — shared substrate + overlay (media civic desks shipped)
  - docs/plans/2026-08-08-journalist-heat-slice-packs.md — Task 6 reporter civic-domain pack (Carmen family)
  - docs/plans/2026-07-28-civic-cron-city-hall.md — civic.15 Sunday chain + weekday datawake
  - scripts/cron-civic-run.js domainSlice — current office input (world_summary hoods + INIT ids)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — civic.17"
  - "[[../research/2026-08-14-civic-process-install]] — research basis"
  - "[[../adr/0017-typed-lived-experience-packets]] — Packet contract"
  - "[[2026-08-08-journalist-heat-slice-packs]] — media civic desks already shipped; this is the office sibling"
  - "[[2026-07-28-civic-cron-city-hall]] — civic.15; this plan does not flip --apply"
  - "[[index]] — registered same commit"
---

# Civic office lived-experience packets Plan

**Goal:** When a civic office clocks in, they get the same kind of typed pack the civic *reporters* already get — who they are, their district’s people and projects, what they may say, what they must not invent — so weekday living and Sunday decisions run on city lists, not a blank prompt.

**Architecture:** One shared **office substrate** (district / citywide facts from disk snapshots) plus a thin **office overlay** (Mayor vs council vs project vs chief). Shape matches ADR-0017 and the journalist heat-slice pattern. Weekday datawake is the first consumer. Sunday prep is the second, after weekday works. civic.15 still owns the stamp; this plan does not write Initiative_Tracker.

**Terminal:** grok / kimi on `scripts/` + `docs/`; engine-sheet only if a live sheet read is later approved. Sandbox before any live sheet touch.

**Pointers:**
- Prior work: journalist civic-domain pack + civic.15 datawake
- Related: [[2026-08-09-three-wake-lived-packet-pilot]] (media proving path)
- Research basis: [[../research/2026-08-14-civic-process-install]]

**Acceptance criteria:**
1. A weekday office wake receives a Packet with actor, task, signal, named constituents from the ledger snapshot (or an explicit empty list), known project facts from the tracker snapshot, and limits. No invented POPID or name.
2. Offline test: missing snapshot rebuilds from `engine_audit` the same way the tracker already does; missing constituent list is empty, not guessed.
3. One dry weekday run on disk produces a readable pack + statement for at least one office. No tracker `--apply`.

---

## What they should get (sheet → pack)

Disk-first. Same wipe lesson: if a copy is gone, rebuild from the cycle audit or leave the field empty. Do not invent.

| They need | Where it lives | In the pack |
|---|---|---|
| Who I am (name, seat, district, faction) | `civic-office-map.json` + office-ledger snap if present | `actor` |
| What I am doing today | weekday = live with last decisions + district heat; Sunday = decide | `task` |
| How my turf feels | `world_summary` hood table (already parsed) | `signal` |
| My projects | `initiative_tracker.json` (already rebuilds) | `known` FACT |
| People I serve | `simulation_ledger_snapshot` rows in my district hoods — name, hood, work. Cap. No quotes invented. | `exposure.subjects` |
| Last thing I said | position wall / prior datawake if on disk | `exposure.sources` |
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
- **Status:** [ ] open

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
- **Status:** [ ] open

### Task 3: Wire weekday datawake to the pack

- **Files:** `scripts/cron-civic-run.js` — modify `runDatawake` only
- **Steps:**
  1. Build pack before the model call. Prompt is the Packet + existing IDENTITY/RULES. Drop raw `domainSlice` prose as the main body (keep as a fallback signal field inside the pack if useful).
  2. Keep the ungrounded-number wall.
  3. No `--apply`. No Sunday change in this task.
- **Verify:** `node --check scripts/cron-civic-run.js`; one `--stage=datawake --dry-run` shows pack path + non-empty limits.
- **Status:** [ ] open

### Task 4: One attended dry run, then stop

- **Files:** output under `output/cron-civic/` only
- **Steps:**
  1. Run one weekday office (or rota of 3) dry. Show Mike what they were handed and what they said.
  2. Do not stamp the tracker. Do not start Sunday inject until he says the pack looks like their job.
- **Verify:** pack file + statement on disk; Mike has seen both.
- **Status:** [ ] open

### Task 5: Sunday prep inject (gated)

- **Files:** `scripts/cron-civic-run.js` `runPrep` — only after Task 4
- **Steps:** Attach the same pack to the pending-decisions packet so Sunday decide uses it. civic.15 gate and `--apply` stay as they are.
- **Verify:** prep packet cites pack path; no sheet write.
- **Status:** [ ] blocked on Task 4

---

## Status log

- 2026-08-15 (grok) — Plan filed. Media civic desks already work; this is the office sibling. No code yet.

---

## Changelog

- 2026-08-15 (grok) — Initial plan, civic.17. Research basis [[../research/2026-08-14-civic-process-install]].
