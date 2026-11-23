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

## Design (agy plan review folded, 2026-11-23)

1. **Tab `Engine_Run_Log`** (created on live 2026-11-23): `Cycle | StartedAt | State | Lifecycle | Part | Parts | RecordJSON`. `StartedAt` is **this execution's** start (`fire.entryMs`), never `fire.admission.startedMs` (a resume carries the original fire's start — `cycleCheckpoint.js:422`), so a checkpointed fire and its resume never share a key. Every data cell starts with `~` (the checkpoint chunk prefix, `cycleCheckpoint.js:27`) and the reader strips it — safe under any cell format and the RAW sync. A record over 45,000 characters splits across rows `Part 1..Parts` of the same `(Cycle, StartedAt)`, never inside a surrogate pair (the `cycleCheckpoint.js:137` guard).
2. **Record JSON:** `{ cycle, runStartedAt, admissionStartedAt, finishedAt, state, lifecycle, checkpointGen, wallMs, timing, engineErrors, auditIssues, rngDraws, log }`. `timing` is `ENGINE95_TIMING_DIAG` — on a resumed fire it already holds every phase (`resumeCore_` restores the saved `phaseTimings`, `cycleCheckpoint.js:491`), so it is never joined. `rngDraws` = `ctx.rng.draws`, else `ctx.resumed.draws`. `log` = `Logger.getLog()` lines **minus** the `PHASE_TIMING_BEGIN/END`, the timing JSON and the `Cycle completed.` lines (the renderer writes those once, from the record).
3. **Engine** (`godWorldEngine2.js`): `ENGINE95_TIMING_DIAG = null` at `runWorldCycle` entry; `writeRunRecord_(ss, fire, outcome)` in its `finally` after `closeCycleFire_`, before the lock is released. Never throws; null-safe on `ss`, `fire.admission` (refused or pre-admission → no row), `fire.ctx`, `outcome` (close threw → `state: 'unclosed'`). One `setValues` of the parts + `SpreadsheetApp.flush()`, no retry wrapper (the 360 s wall and the 88.7 s C117 tail). A missing tab is one `Logger.log` line, no Engine_Errors row. Direct write after the executor — a §9 row like `logEngineError_` (`SHEETS_MANIFEST.md` :136); the pre-commit write warning is acknowledged in the commit.
4. **Step 3.5** (`fetchExecutionLog.js`): read `Engine_Run_Log`, strip `~`, regroup parts; take the **latest** (by `StartedAt`) record for the Cycle with `state: done` **and** a non-empty `timing.timings`. If its `lifecycle` is `resumed`, prepend the log of the `checkpointed` record with the same `checkpointGen`. Write `output/execution_log_c{XX}.json` (the record) and `output/execution_log_c{XX}.txt`: line 1 `source: Engine_Run_Log | startedAt: <ISO>`, `Execution started`, the log lines, the timing JSON line, `Cycle completed. Engine errors logged: N; audit issues tracked: M; rng draws: R`. No qualifying record → today's Drive search; `--file` still forces Drive. `summarize` reads the **last** timing and completed lines, so a stray earlier one can never pass the gate.
5. **Docs in the same commit:** `schemas/SCHEMA_HEADERS.md` (regenerated — the tab is visible), `docs/engine/SHEETS_MANIFEST.md` §9, `/stub-engine` (`ENGINE_STUB_MAP.md`, `ENGINE_STUB_REVERSE.md`, `ENGINE_STUB_REVERSE.json`), run-cycle SKILL Step 3.5, pre-mortem SKILL line on the fire date.

Not carried: `console.warn` lines (`priorityEngine.js`) do not reach `Logger.getLog()`, so a rendered log reports `warnings: 0`; warnings do not gate. Tab growth (~50–80 KB a fire) has no cap yet — read at C130.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Advisor, then one external review (codex if up, else agy) of this plan; fold | es | not started |
| 2 | Builder's go to create `Engine_Run_Log` (header row only) on live; the sandbox gets it from the next live sync (`syncSandboxFromLive.js` creates tabs missing on the bench) | es / builder | done 2026-11-23 — builder "go"; created on live (88 → 89 tabs), header read back |
| 3 | Engine `writeRunRecord_` + manifest/schema/stub docs | es | not started |
| 4 | `fetchExecutionLog.js` row-first render, Drive fallback; skill Step 3.5 text | es | not started |
| 5 | Sandbox proof (research-build has nothing unbenched on the sandbox first; DEPLOY.md: what a live sync does to a sandbox-only tab): (a) a fire from a live sync — the record read back through Step 3.5's own reader equals what the engine wrote; its timing equals the fire's execution-log PHASE_TIMING; the log lines include the P6 BIRTH / compressLifeHistory / checkForPromotions lines; (b) a refused second fire writes no row; (c) a fire with the tab absent completes, one Logger line; (d) a fire that throws still lands its row; (e) checkpoint + resume, if the bench dials allow | es | not started |
| 6 | PROD push (standing go) with its smoke note; first live read C118 Sun 2026-11-29 — Step 3.5 passes with no export | es | not started |

## Reviews reconciled

| Review | Verdict | Pointer |
|---|---|---|
| agy plan review | HOLD | `output/antigravity/2026-11-23-review-engine358-plan.md` |

### Agreed

- #1 resume timing already holds every phase (`cycleCheckpoint.js:491`) — never joined; `summarize` first-match could pass a failed resume on the checkpointed part's lines — lines stripped at write, read last. #2 the resume reuses the original start (`:422`) — key on the execution's start; latest done; link by checkpoint gen. #3 rng from `ctx.resumed.draws`; no `Cycle completed` without timings; null guards; timing reset at entry. #4 `~` prefix, surrogate guard, no retry. #5 line 1 carries the start; warnings read 0. #6 visible tab, three stub files, commit acknowledges the write warning.

### Needs proof

- `Logger.getLog()` completeness and size on a real fire (Task 5).

### New concepts

- Tab retention cap — held, read at C130.

## Acceptance

1. Sandbox fire: one `Engine_Run_Log` row; its TimingsJSON equals the PHASE_TIMING block in that fire's execution log; Step 3.5's render passes the gate.
2. C118 live: Step 3.5 passes from the row, no Drive export asked for; the engine review and engine.95's tail read use the rendered file unchanged.
3. A fire with the tab missing completes as before (one Logger line, no Engine_Errors row from the record).

## Changelog

- 2026-11-23 (engine-sheet) — agy plan review HOLD folded (`output/antigravity/2026-11-23-review-engine358-plan.md`): execution start as the key, resume timing never joined, timing/completed lines stripped from the log and read last, latest done with real timings, null guards, `~` cells, no retry, all three stub files.
- 2026-11-23 (engine-sheet) — Builder "go": `Engine_Run_Log` created on live with its header (Cycle, StartedAt, State, Lifecycle, Part, Parts, RecordJSON), read back.
- 2026-11-23 (engine-sheet) — Advisor fold + builder's "should this be json? … automate as much as possible": the record is JSON carrying the full log; done-state pick; text-safe cells; checkpoint/resume join; bench edge cases.
- 2026-11-23 (engine-sheet) — Created on the builder's "item 10" from the C117 take-over list (G-EC42b) and the 11-22 log research.
