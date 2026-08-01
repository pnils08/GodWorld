---
title: Sheets Ceiling & Export-to-DB — research
created: 2026-07-31
updated: 2026-07-31
type: reference
tags: [research, infrastructure, engine, active]
sources:
  - schemas/SCHEMA_HEADERS.md (auto-generated, live state 2026-07-27)
  - backups/sheets/2026-03-01/ (full CSV dump, 60 tabs)
  - docs/plans/2026-07-31-platform-ceiling-resilience.md (engine.95 — parent plan, Task 3 wall baseline)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.95 row; pending-state lives there"
  - "[[index]] — registered same commit"
  - "[[../plans/2026-07-31-platform-ceiling-resilience]] — parent plan (Tasks 6–7)"
---

# Sheets Ceiling & Export-to-DB — research

**Source:** Internal measurement, not an external source (template adapted). Two data points joined: current per-tab row/column counts from `schemas/SCHEMA_HEADERS.md` (2026-07-27) vs the only local full CSV dump `backups/sheets/2026-03-01/` (~5-month delta), plus the engine.95 Task 3 runtime baseline (bench 0720 @27, C106–C108).

**What this addresses:** engine.95 Track B — the external audit claimed "no migration path off Sheets… fine at current scale, risky as the ceiling." Is a migration/export design warranted now, and if not, what are the named triggers that would change the answer?

**What it shows:**

- **Raw ceiling: 4.6% used.** 56 documented tabs, 34,027 rows, 456,780 cells against the 10M-cell spreadsheet limit. At the measured growth rate the cell limit is a ~decade-scale concern, not a near-term one.
- **Growth is concentrated in append-ledgers** (rows/mo, Mar→Jul): LifeHistory_Log +1,469 (3.2k→10.5k), Relationship_Bond_Ledger +945, LifeHistory_Archive +877, Household_Ledger +126, Story_Hook_Deck +99, Engine_Errors +85. Combined ~+3.6k rows/mo.
- **Rotating-window tabs shrink or hold** (Media_Briefing −7,245, Cycle_Packet −2,309, Simulation_Ledger 3,417→931, Story_Seed_Deck −1,349) — the trim pattern works where it's applied.
- **Tab churn is healthy:** 21 tabs exist only in March (Chicago_* deleted per S229 canon death, Arc_Ledger superseded, `GitHub_token` credential tab long gone post-S156 isolation); 17 are new since (Ripple_Ledger, Election_Log, Employment_Roster, etc.).
- **The real coupling is time, not cells.** Full-tab reads of growing ledgers are what feed phase duration — the engine's most expensive phase is already `Phase11-MaintainLifeHistoryLog` at 19.1s mean / 23.8s max (Task 3 baseline). Ledger growth → slower reads → wall pressure. The Sheets ceiling and the 6-minute wall are the *same* risk seen from two sides, and Task 2's instrumentation now measures it every cycle.

**Extraction — what's usable:**

- Append-ledger growth is bounded by extending the existing LifeHistory trim pattern → Relationship_Bond_Ledger and the other two fast growers (engine-sheet, small config-style change, no new architecture).
- "Watch the wall, not the cells" → engine.95 Track A's PHASE_TIMING telemetry is already the right ceiling monitor; no separate Sheets-ceiling instrumentation needed.
- March-vs-July join method (SCHEMA_HEADERS vs dated CSV dump) is reusable → future ceiling checks are one script, not an audit.

**Not applicable / hazard:**

- **Export-to-DB build: rejected now.** Sheets is the canon authority with 40+ live consumers (dashboard, godworld MCP, desk packets, newsroom crons, engine). A DB migration without a full compatibility seam strands the ecosystem; building the seam is a multi-month project to solve a problem the data says is a decade away.
- **Do not measure the ceiling by cell count alone.** A future session that greps "10M cells" and relaxes is missing the point — the operative limit is per-cycle read/write *time* on fat tabs, measured by PHASE_TIMING.
- engine.36 (isolated staging, parked) is not a migration path; don't conflate.

**Verdict: take-nothing (migration build) / watch (with named triggers).** No export-to-DB design work. Re-open only on a trigger:

1. Total cell usage >50% of 10M (currently 4.6%).
2. Wall headroom <2 min on the PHASE_TIMING baseline trend (currently ~3.9 min).
3. `Phase11-MaintainLifeHistoryLog`-style trim phases trending up monotonically for 4+ consecutive cycles despite trim maintenance (the current +32s/3-cycle creep is the early version of this signal).
4. Sheets API quota errors appearing as a recurring class in Engine_Errors.

Adjacent accepted work (not migration): extend trim pattern to Relationship_Bond_Ledger + fast-growing append-ledgers — fold into engine.95 Task 4-era engine-sheet batch or file as its own small row when picked.

---

## Changelog

- 2026-07-31 — Initial (Kimi CLI, engine.95 Task 7). Internal-measurement eval; research template adapted for a non-external source.
