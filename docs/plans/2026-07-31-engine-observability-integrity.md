---
title: Engine Observability & Tab Integrity Plan
created: 2026-07-31
updated: 2026-07-31
type: plan
tags: [infrastructure, engine, dashboard, active]
sources:
  - External codebase audit (commit af50e1f) gaps #7 + #8, verified against live repo 2026-07-31 (Kimi CLI verification)
  - docs/SPREADSHEET.md:155-174 (Ghost References table — 14 rows, 3 FIXED S106, 11 open)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (infrastructure.6)"
  - "[[../DASHBOARD]] — dashboard reference (stale in places; verify before citing)"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — registered same commit"
---

# Engine Observability & Tab Integrity Plan

**Goal:** Sim health is visible on the dashboard, and every engine tab reference fails loud instead of silently reading air.

**Architecture:** Two tracks. **Track A — sim-health surface.** The offline auditor already computes the health signals: `scripts/engineAuditor.js` (deterministic, no LLM) runs 9 ailment detectors in `scripts/engine-auditor/` and writes `output/engine_audit_c{XX}.json`, `engine_anomalies_c{XX}.json`, `baseline_briefs_c{XX}.json` — but nothing serves them. The dashboard's only health route is liveness (`dashboard/server.js:581` `/api/health` = `{status:'online'}` + file presence; grep finds zero sim-health metrics across its 39 routes). Track A adds `/api/sim-health` reading the latest audit JSONs + a small React panel. **Track B — ghost-tab sweep + regression guard.** `docs/SPREADSHEET.md` §Ghost References lists 14 engine-code references to nonexistent tabs (3 fixed S106, 11 open: `Intake`, `Advancement_Intake(1)`, `Business_Intake`, `Sports_Feed`, `Citizens`, `Citizen_Directory`, `City_Dynamics`, `Simulation_Config`, `Game_Intake`, `Health_Cause_Intake`, `MediaRoom_Paste`/`Raw_Continuity_Paste`, `Story_Hook_Archive`, `Continuity_Intake`; `Election_Log` reclassified — schema-documented and auto-created on write at `phase05-citizens/runCivicElectionsv1.js:220-229`). Runtime behavior is silent skip / fallback / auto-create (GAS `getSheetByName` returns null; every checked call site null-guards) — exactly the "silent failure" class the doctrine hates. Per reference: create the tab, repoint the code to the real tab, or delete the reference. Then a deterministic test asserts every tab name referenced in engine code exists in `schemas/SCHEMA_HEADERS.md` so ghosts can't regress. Distinct from engine.4 (dead tabs that exist but nothing reads — the inverse problem).

**Terminal:** engine-sheet

**Pointers:**
- Prior work: `scripts/engineAuditor.js` + `scripts/engine-auditor/` (the health signals to surface)
- Related row: [[engine/ROLLOUT_PLAN]] engine.4 (dead-tab cleanup, blocked on engine.5 — inverse problem, keep separate)
- Verification basis: audit's "37 arcs stuck at 'early'" was **stale** (S83/S156-era finding; arc lifecycle disabled Mike-direct S313 at `phase01-config/godWorldEngine2.js:422-426`, residual is 36 arcs frozen at *peak* in a ledger nothing reads, `Ripple_Ledger` is the successor surface — no arc work in this plan). Audit's "40 endpoints of live world data" was overstated (many routes serve stale `output/` files per DASHBOARD.md's own flags).

**Acceptance criteria:**
1. `curl localhost:3001/api/sim-health` returns the latest audit cycle + pattern counts by type + anomaly count; panel renders in the dashboard UI.
2. Zero open rows remain in `docs/SPREADSHEET.md` §Ghost References — each of the 11 carries a recorded disposition (created / repointed / deleted).
3. `node scripts/tabReferenceIntegrity.test.js` passes, and fails when a fake tab reference is injected into engine code.

---

## Tasks

### Task 1: Shape the sim-health payload
- **Files:** `output/engine_audit_c99.json` (latest on disk), `output/engine_anomalies_c99.json` — read
- **Steps:** Record the JSON shapes (pattern fields, anomaly fields) and how to locate "latest cycle" deterministically (glob + max). Note: auditor output may lag the live cycle — surface the audit's cycle number in the payload so staleness is visible, not hidden.
- **Verify:** payload shape notes in Build notes
- **Status:** [ ] not started

### Task 2: Add `/api/sim-health` endpoint
- **Files:** `dashboard/server.js` — modify
- **Steps:** Add the endpoint following the existing `output/`-file route pattern (e.g. desk-packet routes). Payload: audit cycle, pattern counts by detector type, anomaly count, baseline-brief presence, audit-file mtime. Fail-soft with explicit `stale: true` when files are missing.
- **Verify:** `node --check dashboard/server.js`; `curl -s localhost:3001/api/sim-health | python3 -m json.tool` returns the payload (dashboard restart needs approval — verify post-restart or via a fresh port instance)
- **Status:** [ ] not started

### Task 3: Dashboard panel
- **Files:** `dashboard/src/` — modify
- **Steps:** Add a compact sim-health panel to the existing dashboard UI (pattern counts + audit cycle + staleness flag). Match the existing component style; no new dependencies.
- **Verify:** `cd dashboard && npm run build` succeeds; panel visible on reload
- **Status:** [ ] not started

### Task 4: Disposition the 11 ghost references
- **Files:** `docs/SPREADSHEET.md:155-174` — read; engine files per row — read
- **Steps:** For each of the 11 open ghost references: grep the referencing code, then classify — **create** (tab should exist), **repoint** (code should read a real tab, e.g. `Simulation_Config` → `World_Config` per SPREADSHEET.md:168), or **delete** (reference is dead code). Record each disposition in a Build-notes table before touching code. Note: creating tabs or repointing live engine reads touches Sheets behavior — batch the dispositions for one Mike approval before Task 5.
- **Verify:** disposition table (11 rows) in Build notes; Mike approval recorded
- **Status:** [ ] not started

### Task 5: Execute dispositions
- **Files:** per Task 4 table — modify
- **Steps:** Apply the approved dispositions. Code repoints/deletes in engine files; tab creations go through the normal sheet-change path (not ad-hoc). Update `docs/SPREADSHEET.md` §Ghost References rows with the disposition + date.
- **Verify:** `rg` per tab name shows intended state; SPREADSHEET.md updated
- **Status:** [ ] not started

### Task 6: Tab-reference integrity test
- **Files:** `scripts/tabReferenceIntegrity.test.js` — create
- **Steps:** Deterministic test: extract every `getSheetByName('...')` literal in `phase*/`, `utilities/`, `lib/`; assert each exists as a `## <Tab>` header in `schemas/SCHEMA_HEADERS.md` OR is on an explicit allowlist (auto-created tabs like `Election_Log`, with a comment citing the creating code). Fail loud with the offender list.
- **Verify:** test passes on clean tree; injecting `getSheetByName('Ghost_X')` into a scratch copy fails the test
- **Status:** [ ] not started

---

## Build notes

Filled as tasks complete.

---

## Open questions

- [ ] The auditor runs on-demand, not on cron — should Track A also schedule it (cron change requires Mike approval per AGENTS.md), or does `/api/sim-health` just surface the last manual run with its staleness visible? Default: surface-only; scheduling is a separate approval. — informs Task 2
- [ ] Any ghost tab whose data is actually *wanted* (e.g. `Health_Cause_Intake` at `phase11-media-intake/healthCauseIntake.js:273` currently no-ops returning `{processed:0}`) — create-the-tab dispositions mean a feature goes live, not just a fix; flag those explicitly in the Task 4 approval batch. — blocks Task 4

---

## Changelog

- 2026-07-31 — Initial draft (Kimi CLI, builder-directed external-audit remediation batch). Audit gaps #7+#8 combined (both are "the builder can't see when the engine is lying"). Audit's arcs bug dropped as stale (arc loop retired S313); ghost-tab claim confirmed with the Election_Log reclassification.
