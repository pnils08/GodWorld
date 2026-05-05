---
name: run-cycle
description: Orchestrate a full engine cycle — pre-flight, pre-mortem, engine run, engine review, world summary.
version: "1.0"
updated: 2026-04-17
tags: [media, active]
effort: high
disable-model-invocation: true
argument-hint: "[cycle-number]"
---

# /run-cycle — Engine Cycle Orchestrator

## Purpose

Runs the full engine cycle pipeline by calling individual skills in order. Each step produces output on disk that the next step reads.

## The Chain

### Step 1: /pre-flight
Verify manual inputs are ready — sports feed entries, initiative tracker structure, coverage ratings from last edition. Citizen/business/storyline intake not wired yet (placeholder).

**Gate:** READY → proceed. NOT READY → stop and fix.

### Step 2: /pre-mortem
Scan engine code for determinism violations, dependency chain breaks, sheet header misalignment, cascade risks.

**Gate:** CLEAN → proceed. CRITICAL → stop and fix.

### Step 3: Run Cycle
Tell Mike to run `runWorldCycle()` in Google Apps Script. The engine runs in Google's cloud — cannot be triggered from here. Wait for confirmation it finished.

**Gate:** Mike confirms engine completed.

### Step 4: /engine-review
Read world state from sheets. Identify ailments, improvements, incoherence. Produce 7-field briefs per finding. Output: `output/engine_review_c{XX}.md`

**Gate:** File exists on disk.

### Step 5: /build-world-summary
Read Riley_Digest (3 cycles), Sports Feed (3 cycles), civic production log (if exists), and engine review output. Produce factual world summary. Output: `output/world_summary_c{XX}.md`. Ingest to world-data Supermemory.

**Gate:** File exists on disk + ingest confirmed.

### Step 6: Gap Log Close (engine-sheet)

Run the mechanical baseline audit and append judgment-layer entries.

```bash
node scripts/engineCycleAudit.js {XX} --write
```

Writes `output/production_log_run_cycle_c{XX}_gaps.md` with `[mechanical]`-tagged entries across 5 detector classes (`writeback-drift`, `math-anomaly`, `cross-cycle-debt`, `determinism-break`, `header-drift`). 4 V2-runtime classes (`phase-skip`, `cohort-collision`, `phase-ordering`, `silent-fail`) appended as stubs — they need an engine-run-log ingest path that doesn't exist yet.

`header-drift` (S202 build) is a structural class — runs against repo state vs `schemas/SCHEMA_HEADERS.md`, flags writers whose field-name lookups or `setValues()` ranges don't match live headers. Self-test: `node scripts/engineCycleAuditTest.js` (synthetic fixture validating the detector would have caught the S201 Story_Seed_Deck/Story_Hook_Deck drift). Plan: `docs/plans/2026-05-05-writer-header-alignment-detector.md`.

After the script runs, engine-sheet appends `[judgment]` entries below the `<!-- end mechanical pass -->` footer marker. The script preserves anything below that marker on re-run, so judgment entries survive a re-audit pass.

Coder-persona voice for judgment entries: terse, mechanical, commit-message style (no narrative prose). G-EC{N+} numbering continues from the mechanical pass.

If 0 mechanical entries observed: file states "0 mechanical gaps observed" with cycle headline metrics for context (vs being absent, which would be ambiguous). Engine-sheet judgment review still recommended.

**Gate:** File exists on disk. ROLLOUT pointer added under `Edition Post-Publish` for any HIGH-severity findings: `RUN-CYCLE C{XX} GAP LOG — S{N} (engine-sheet), N entries, severity`.

Plan: `docs/plans/2026-05-03-run-cycle-gap-log-surface.md` (Phase 2 done S199; Phase 3 validation runs at next /run-cycle invocation).

## What Happens After

These run as separate skills (may be same or different sessions):

- `/city-hall-prep` — reads world summary + engine review + sheets → writes pending decisions per voice
- `/city-hall` — reads pending decisions → launches voice agents → applies tracker updates → production log
- `/sift` (planned) — reads world summary + engine review + city-hall log → story picks + angle briefs
- `/write-edition` — reads sift output → launches reporters → compile → publish

**Handoff:** run-cycle produces `output/world_summary_c{XX}.md` and `output/engine_review_c{XX}.md`. City-hall-prep verifies both exist before starting.

## Legacy Reference

The following scripts were part of the old inline pipeline. Not called by this skill but preserved for future use:

- `scripts/buildDeskPackets.js` — per-desk JSON packets from cycle packet
- `scripts/buildDeskFolders.js` — per-desk workspace folders
- `scripts/buildInitiativePackets.js` — per-initiative JSON packets
- `scripts/buildInitiativeWorkspaces.js` — per-initiative workspace folders
- `scripts/buildVoiceWorkspaces.js` — per-voice-agent workspace folders
- `scripts/buildDecisionQueue.js` — pending decisions for voice agents
- `scripts/checkSupplementalTriggers.js` — supplemental edition candidates

## Sheet Access

Service account via `lib/sheets.js`. Spreadsheet ID from `.env`.
