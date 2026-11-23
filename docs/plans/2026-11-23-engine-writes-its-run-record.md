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

**Builder's words (2026-11-23):** "item 10" — from the C117 gap list: the engine writes its own run record so the builder stops exporting the execution log by hand. On the record's content: "should this be json? and the goal would be to automate as much as possible" — the record carries the full log text, as JSON.

**Goal:** every fire leaves one JSON record on a sheet tab the service account can read — the run's numbers, its phase timings and every Logger line — and Step 3.5 writes `output/execution_log_c{XX}.json` and the `.txt` every reader already uses from it. The builder never exports; the Drive export is the fallback only for a fire that dies before writing.

**Rows:** engine.358 · **Owner:** engine-sheet

## Where it stands (read 2026-11-23)

- Step 3.5's gate needs: an `Execution started` line, the PHASE_TIMING JSON line (`totalMs`, `phaseCount`, `slowest`, `timings[{phase, ms, ok}]` — `ok:false` = a failed phase), the `Cycle completed.` line (`scripts/fetchExecutionLog.js:39-72`, `scripts/runCycle.js` Step 3.5). Warning/error counts print, do not gate.
- The engine holds all of it in memory and only `Logger.log`s it: `emitPhaseTimings_` (`godWorldEngine2.js:193`, also `ENGINE95_TIMING_DIAG`), the completed line (inner `finally`, ~:939: engine errors, audit issues, rng draws). The fire record (`closeCycleFire_`, script property `FIRE_ADMISSION_JSON`: cycle, startedMs, state, finishedMs) is unreadable by the service account. No GCP project, so `clasp logs` cannot pull Logger.
- Readers of the text log: Step 3.5 gate, the engine review (phase timings), engine.95's tail read, the pre-mortem's fire-date fallback.

## Design

1. **Tab `Engine_Run_Log`** (created once on live and the sandbox — engine.119: no runtime create). One row per admitted fire: `Cycle | StartedAt | State | Lifecycle | Part | Parts | RecordJSON`. The record is one JSON object, `{ cycle, startedAt, finishedAt, state, lifecycle, wallMs, timing: <the PHASE_TIMING payload>, engineErrors, auditIssues, rngDraws, log: [Logger lines] }`; a record over 45,000 characters is split across rows `Part 1..Parts` of the same fire (this week's log was 41,840 bytes). Every cell is written as text (leading apostrophe, the engine.340 SeedID treatment) so the sheet never coerces a timestamp or a number.
2. **Engine** (`godWorldEngine2.js`): `writeRunRecord_(ss, fire, outcome)` in `runWorldCycle`'s `finally`, after `closeCycleFire_`, before the lock is released. Best effort, never throws: a missing tab or a write error is one `Logger.log` line, no Engine_Errors row. A refused fire has no admission (`closeCycleFire_` returns null) and writes nothing. Log text from `Logger.getLog()` (its completeness and length on a real fire are measured on the bench — Task 5); timing from `ENGINE95_TIMING_DIAG`; counts from `fire.ctx.summary`. Modelled on `logEngineError_`'s direct append (same file, `SHEETS_MANIFEST.md` §9 row 136); a new §9 row of the same class.
3. **Checkpoint + resume:** a checkpointed fire writes its row (`state: checkpointed`, its phases' timing); the resume writes its own (`lifecycle: resumed`, the tail's timing — `resumeCore_` emits its own PHASE_TIMING, `cycleCheckpoint.js:527`). The renderer joins both parts' timings and logs in start order.
4. **Step 3.5** (`fetchExecutionLog.js`): read `Engine_Run_Log`; the record is the Cycle's fire whose state is `done` (joined with its `checkpointed` part when it resumed). Write `output/execution_log_c{XX}.json` (the record) and `output/execution_log_c{XX}.txt` (first line `source: Engine_Run_Log`, then `Execution started`, the Logger lines, the PHASE_TIMING JSON line, `Cycle completed. …`) in the shape the gate and every reader parse. No `done` record → today's Drive search; `--file` still forces Drive. Never prints `Cycle completed` from a non-done record.
5. **Docs in the same commit:** `schemas/SCHEMA_HEADERS.md` (the tab), `docs/engine/SHEETS_MANIFEST.md` (§9), `docs/engine/ENGINE_STUB_MAP.md` (`/stub-engine`), run-cycle SKILL Step 3.5.

Not carried: `console.warn` lines (`priorityEngine.js`) do not reach `Logger.getLog()`; they do not gate. Readers of log lines this week (G-EC45/46): births, the child grab, the dial fold, arrivals, migration, archive — all `Logger.log`; the bench confirms they are in the record.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Advisor, then one external review (codex if up, else agy) of this plan; fold | es | not started |
| 2 | Builder's go to create `Engine_Run_Log` (header row only) on live; the sandbox gets it from the next live sync (`syncSandboxFromLive.js` creates tabs missing on the bench) | es / builder | done 2026-11-23 — builder "go"; created on live (88 → 89 tabs), header read back |
| 3 | Engine `writeRunRecord_` + manifest/schema/stub docs | es | not started |
| 4 | `fetchExecutionLog.js` row-first render, Drive fallback; skill Step 3.5 text | es | not started |
| 5 | Sandbox proof (research-build has nothing unbenched on the sandbox first; DEPLOY.md: what a live sync does to a sandbox-only tab): (a) a fire from a live sync — the record read back through Step 3.5's own reader equals what the engine wrote; its timing equals the fire's execution-log PHASE_TIMING; the log lines include the P6 BIRTH / compressLifeHistory / checkForPromotions lines; (b) a refused second fire writes no row; (c) a fire with the tab absent completes, one Logger line; (d) a fire that throws still lands its row; (e) checkpoint + resume, if the bench dials allow | es | not started |
| 6 | PROD push (standing go) with its smoke note; first live read C118 Sun 2026-11-29 — Step 3.5 passes with no export | es | not started |

## Acceptance

1. Sandbox fire: one `Engine_Run_Log` row; its TimingsJSON equals the PHASE_TIMING block in that fire's execution log; Step 3.5's render passes the gate.
2. C118 live: Step 3.5 passes from the row, no Drive export asked for; the engine review and engine.95's tail read use the rendered file unchanged.
3. A fire with the tab missing completes as before (one Logger line, no Engine_Errors row from the record).

## Changelog

- 2026-11-23 (engine-sheet) — Builder "go": `Engine_Run_Log` created on live with its header (Cycle, StartedAt, State, Lifecycle, Part, Parts, RecordJSON), read back.
- 2026-11-23 (engine-sheet) — Advisor fold + builder's "should this be json? … automate as much as possible": the record is JSON carrying the full log; done-state pick; text-safe cells; checkpoint/resume join; bench edge cases.
- 2026-11-23 (engine-sheet) — Created on the builder's "item 10" from the C117 take-over list (G-EC42b) and the 11-22 log research.
