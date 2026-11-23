---
title: Engine Writes Its Run Record Plan
created: 2026-11-23
updated: 2026-11-23
type: plan
tags: [engine, infrastructure, draft]
sources:
  - output/production_log_run_cycle_c117_gaps.md G-EC42b
  - phase01-config/godWorldEngine2.js (runWorldCycle :471, closeCycleFire_ :410, emitPhaseTimings_ :193)
  - scripts/fetchExecutionLog.js, scripts/runCycle.js Step 3.5
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.358"
  - "[[2026-11-09-run-cycle-step-gate]] — governance.59 (Step 3.5)"
---

# Engine Writes Its Run Record Plan

**Builder's words (2026-11-23):** "item 10" — from the C117 gap list: the engine writes its own run record so the builder stops exporting the execution log by hand.

**Goal:** every fire leaves one row on a sheet tab the service account can read — cycle, start, finish, state, phase timings, failed phases, engine-error count — and Step 3.5 writes `output/execution_log_c{XX}.txt` from that row, with the Drive export as the fallback when the row is missing.

**Rows:** engine.358 · **Owner:** engine-sheet

## Where it stands (read 2026-11-23)

- Step 3.5's gate needs: an `Execution started` line, the PHASE_TIMING JSON line (`totalMs`, `phaseCount`, `slowest`, `timings[{phase, ms, ok}]` — `ok:false` = a failed phase), the `Cycle completed.` line (`scripts/fetchExecutionLog.js:39-72`, `scripts/runCycle.js` Step 3.5). Warning/error counts print, do not gate.
- The engine holds all of it in memory and only `Logger.log`s it: `emitPhaseTimings_` (`godWorldEngine2.js:193`, also `ENGINE95_TIMING_DIAG`), the completed line (inner `finally`, ~:939: engine errors, audit issues, rng draws). The fire record (`closeCycleFire_`, script property `FIRE_ADMISSION_JSON`: cycle, startedMs, state, finishedMs) is unreadable by the service account. No GCP project, so `clasp logs` cannot pull Logger.
- Readers of the text log: Step 3.5 gate, the engine review (phase timings), engine.95's tail read, the pre-mortem's fire-date fallback.

## Design

1. **Tab `Engine_Run_Log`** (created once on live and the sandbox — engine.119: no runtime create). One row per fire: `Cycle | StartedAt | FinishedAt | State | Lifecycle | WallMs | TotalMs | PhaseCount | FailedPhases | EngineErrors | AuditIssues | RngDraws | TimingsJSON`.
2. **Engine** (`godWorldEngine2.js`): `writeRunRecord_(ss, fire, outcome)` in `runWorldCycle`'s `finally`, after `closeCycleFire_`, before the lock is released. Best effort, never throws: a missing tab or a write error is one `Logger.log` line. Reads `fire.admission` (cycle, startedMs), `outcome.state`, `fire.lifecycle`, `ENGINE95_TIMING_DIAG`, `fire.ctx.summary` (engineErrorCount, auditIssues, rng draws). A direct write after the Phase-10 executor — the Phase-11 carve-out class; one row in `SHEETS_MANIFEST.md` §9. An aborted or checkpointed fire also writes its row (state says which).
3. **Step 3.5** (`fetchExecutionLog.js`): read `Engine_Run_Log`, take the newest row for the Cycle; render `output/execution_log_c{XX}.txt` in the shape the gate and readers already parse (`Execution started`, the PHASE_TIMING JSON line, `Cycle completed. Engine errors logged: N; audit issues tracked: M; rng draws: R`) with a first line `source: Engine_Run_Log row N`. No row → today's Drive search; `--file` still forces Drive.
4. **Docs in the same commit:** `schemas/SCHEMA_HEADERS.md` (the tab), `docs/engine/SHEETS_MANIFEST.md` (§9 carve-out), `docs/engine/ENGINE_STUB_MAP.md` (`/stub-engine`), run-cycle SKILL Step 3.5.

Not carried: Logger warning lines (`console.warn` in `priorityEngine.js` is not countable from the engine); they do not gate.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Advisor, then one external review (codex if up, else agy) of this plan; fold | es | not started |
| 2 | Builder's go to create `Engine_Run_Log` (header row only) on live and the sandbox; create, read back | es / builder | not started |
| 3 | Engine `writeRunRecord_` + manifest/schema/stub docs | es | not started |
| 4 | `fetchExecutionLog.js` row-first render, Drive fallback; skill Step 3.5 text | es | not started |
| 5 | Sandbox proof: one fire from a live sync; read the row back; Step 3.5's renderer on the sandbox row passes the same gate the Drive log passes; diff timings vs the sandbox execution log | es | not started |
| 6 | PROD push (standing go) with its smoke note; first live read C118 Sun 2026-11-29 — Step 3.5 passes with no export | es | not started |

## Acceptance

1. Sandbox fire: one `Engine_Run_Log` row; its TimingsJSON equals the PHASE_TIMING block in that fire's execution log; Step 3.5's render passes the gate.
2. C118 live: Step 3.5 passes from the row, no Drive export asked for; the engine review and engine.95's tail read use the rendered file unchanged.
3. A fire with the tab missing completes as before (one Logger line, no Engine_Errors row from the record).

## Changelog

- 2026-11-23 (engine-sheet) — Created on the builder's "item 10" from the C117 take-over list (G-EC42b) and the 11-22 log research.
