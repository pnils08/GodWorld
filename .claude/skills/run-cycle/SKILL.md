---
name: run-cycle
description: Orchestrate a full engine cycle — pre-flight, pre-mortem, engine run, engine review, world summary.
version: "1.1"
updated: 2026-05-24
tags: [engine-sheet, active]
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

### Step 5.5: Neighborhood texture (citizen perception — research.19 T2)

Translate the cycle's per-hood engine signal into the lived particulars a resident would *notice* — the shared, frozen perception artifact the citizen-wake loop reads. **Wake-input only — never published, never canon.**

```bash
node scripts/buildNeighborhoodTexture.js {XX}
```

Reads the same Riley_Digest + Neighborhood_Map sources as Step 5 (structured, not the world_summary markdown), runs ONE batched DeepSeek generation (~21 short blocks), deterministic real-name blocklist sweep (fail-loud). Output: `output/neighborhood_texture_c{XX}.md`, frozen for the cycle. Hoods with no engine signal get a quiet-week line (no invented drama). The cron `citizen-wake.js` reads each citizen's hood block via `loadNeighborhoodTexture` and injects it as `Around your neighborhood:`. Adds one cheap LLM gen/cycle; degrades gracefully (wake omits the line) if absent.

**Gate:** File exists on disk.

### Step 5.6: Content-ledger drafter (engine.49 T4)

Draft condition-gated Event_Content_Ledger rows from what this cycle actually produced (Story_Seed_Deck seeds, Neighborhood_Map pressures, Cycle_Seeds weather/holiday). Cheap-helper LLM (OpenRouter deepseek default), never premium tokens.

```bash
node scripts/draftContentRows.js --cycle {XX} --apply
```

Validation is parity-by-execution — every candidate runs through the real `loadEventContentLedger_`, so a row the loader would skip is never written. Caps 10/3/2 + dedup + `auth:auto` provenance; rows land `Active=yes` (T4 auto-active — the fail-closed loader is the standing guard, `Active=no` in-sheet is Mike's kill switch). Script prints a draft report (written / invalid / dup / capped) and readback-verifies the append. If OpenRouter is unreachable it exits 1 with `ERR` — treat as non-blocking for the rest of the chain (the cycle already ran; pools just don't grow this cycle). Don't retry-loop; note the miss in the Step 6 gap log.

Plan: `docs/plans/2026-07-06-content-ledger-auto-authoring.md` (engine.49).

**Gate:** Draft report printed; on `--apply`, script exits 0 with rows verified (0 written is a valid outcome on a quiet cycle).

### Step 5.7: Initiative packets refresh (G-PREP1)

Refresh the derived initiative JSON from the live sheet so downstream skills never read stale phases (C100: `initiative_tracker.json` carried past-cycle nextActionCycle values while the live sheet had moved on).

```bash
node scripts/buildInitiativePackets.js {XX}
```

**Gate:** `output/initiative_tracker.json` regenerated this run (mtime is this session).

### Step 6: Gap Log Close (engine-sheet)

Run the mechanical baseline audit and append judgment-layer entries.

```bash
node scripts/engineCycleAudit.js {XX} --write
```

**Run-order dependency (G-EC1):** this step reads `engine_audit_c{XX}.json` from Step 4 — the script now aborts with a clear message (no gap log written) if the file is missing, instead of filing a false-HIGH `audit-input` finding. If it aborts, run Step 4 first.

Writes `output/production_log_c{XX}_run_cycle_gaps.md` with `[mechanical]`-tagged entries across 5 detector classes (`writeback-drift`, `math-anomaly`, `cross-cycle-debt`, `determinism-break`, `header-drift`). 4 V2-runtime classes (`phase-skip`, `cohort-collision`, `phase-ordering`, `silent-fail`) appended as stubs — they need an engine-run-log ingest path that doesn't exist yet.

`header-drift` (S202 build) is a structural class — runs against repo state vs `schemas/SCHEMA_HEADERS.md`, flags writers whose field-name lookups or `setValues()` ranges don't match live headers. Self-test: `node scripts/engineCycleAuditTest.js` (synthetic fixture validating the detector would have caught the S201 Story_Seed_Deck/Story_Hook_Deck drift). Plan: `docs/plans/2026-05-05-writer-header-alignment-detector.md`.

After the script runs, engine-sheet appends `[judgment]` entries below the `<!-- end mechanical pass -->` footer marker. The script preserves anything below that marker on re-run, so judgment entries survive a re-audit pass.

Coder-persona voice for judgment entries: terse, mechanical, commit-message style (no narrative prose). G-EC{N+} numbering continues from the mechanical pass.

If 0 mechanical entries observed: file states "0 mechanical gaps observed" with cycle headline metrics for context (vs being absent, which would be ambiguous). Engine-sheet judgment review still recommended.

**Gate:** File exists on disk. ROLLOUT pointer added under `Edition Post-Publish` for any HIGH-severity findings: `RUN-CYCLE C{XX} GAP LOG — S{N} (engine-sheet), N entries, severity`.

Plan: `docs/archive/plans/2026-05-03-run-cycle-gap-log-surface.md` (Phase 2 done S199; Phase 3 validation runs at next /run-cycle invocation).

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
