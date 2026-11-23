# agy diff review — engine.358 (`6556c0980`)

- **Commit:** `6556c0980495eba0b49258343f6f1af10777d858`
- **Plan:** [2026-11-23-engine-writes-its-run-record.md](file:///root/GodWorld/docs/plans/2026-11-23-engine-writes-its-run-record.md)
- **Brief:** [2026-11-23-es-brief-agy-engine358-diff.md](file:///root/GodWorld/docs/for-claude-review/2026-11-23-es-brief-agy-engine358-diff.md)
- **Verdict:** **SHIP-WITH-FIXES** — the implementation in `godWorldEngine2.js` and `fetchExecutionLog.js` is clean across every path asked in the brief, with one test-wiring gap (`cycleCheckpointWiring.test.js` omits `Engine_Run_Log` from `w.sheets`, so `writeRunRecord_`'s write path `:499-529` never executed in tests) and three minor edge notes below.

---

## Checks Performed (local, no Sheets/Drive calls)

- `node --check phase01-config/godWorldEngine2.js && node --check scripts/fetchExecutionLog.js` — clean.
- `node scripts/runCycle.test.js` — `40 passed, 0 failed`.
- `node scripts/cycleCheckpointWiring.test.js` — `115 passed, 0 failed` (with `Engine_Run_Log` absent in `w.sheets`, see Finding 1).
- `node scripts/tabReferenceIntegrity.test.js` — `PASS: 274 tab references across 78 engine files` (11 allowlisted).
- `node lib/mags.searchDisk.test.js` — `71 path rules ok`.
- `node phase01-config/godWorldEngine2.cycleCount.test.js` — `29/29 passed`.

---

## Brief Point-by-Point & Findings

### 1. `writeRunRecord_` / `runRecordLogLines_` (`phase01-config/godWorldEngine2.js:479-572`)

- **Throws past `try`:** No. The entire body of `writeRunRecord_` (`:495-532`) sits inside `try { ... } catch (e) { try { Logger.log(...); } catch (_) {} }`, so no JS exception can escape to `runWorldCycle`'s `finally` (`:563-564`) or break `lock.releaseLock()`.
- **Lock release delay:** `writeRunRecord_` executes before `lock.releaseLock()` (`:563-564`) with no retry/sleep loop (one `getSheetByName`, one `getLastRow`, one `setValues`, one `SpreadsheetApp.flush()` — ~0.5–2 s; returns immediately without `setValues`/`flush` when `Engine_Run_Log` is missing at `:498`).
- **Refused fire:** `admitCycleFire_` throws before `fire.admission` is assigned (`:547`); `:496` returns immediately when `!fire.admission`, so refused fires write nothing.
- **Start / state / timing across paths:**
  - **Normal (`done`/`failed`/`unpersisted`/`unverified`):** `runStartedAt` uses `fire.entryMs` (`:501, :509`), `state` uses `outcome.state` (`:512`), `lifecycle` is `'run'` (`:513`), `timing` is `ENGINE95_TIMING_DIAG` (`:516`), `rngDraws` is `ctx.rng.draws` (`:505`).
  - **Checkpointed:** `lifecycle` is `'checkpointed'`, `state` is `'checkpointed'`, `checkpointGen` is `fire.checkpoint.gen` (`:502`), `timing` is `ENGINE95_TIMING_DIAG` (~126 pre-checkpoint phases).
  - **Resumed:** `runStartedAt` uses this execution's `fire.entryMs` (so it does not collide with `checkpointed`'s `runStartedAt`, while `admissionStartedAt` preserves `fire.admission.startedMs` at `:510`); `checkpointGen` resolves via `ctx.resumed.gen || fire.admission.manifest.gen` (`:503-504`); `rngDraws` reads `ctx.resumed.draws` (`:506`); `wallMs` measures only the resume execution (`:515`); `timing` is `ENGINE95_TIMING_DIAG` (already containing all ~131 phases via `cycleCheckpoint.js:491, 527`).
  - **Aborted:** `state` is `'aborted'`, `lifecycle` is `'run'`, `fire.ctx === null` (`ensure*` throw at `:581-608`) and `ENGINE95_TIMING_DIAG === null` (`initSimulationLedger_` throw at `:640`) are both null-guarded (`:499, 516-519`).
  - **Close threw (`closeCycleFire_`):** `outcome` is `null` -> `state: 'unclosed'` (`:512`).
- **`chunkEncoded_` scope:** Defined in `phase10-persistence/cycleCheckpoint.js:130`. In Apps Script all pushed files share one global scope; in `scripts/cycleCheckpointWiring.test.js:77`, `cycleCheckpoint.js` is loaded into the same `vm` context before `godWorldEngine2.js`.

#### Finding 1 [MEDIUM] — `writeRunRecord_` write path (`:499-529`) and `fetchExecutionLog.js` parser/picker have zero committed test execution in repo
- **Pointers:** `scripts/cycleCheckpointWiring.test.js:54`, `phase01-config/godWorldEngine2.js:498-529`, `scripts/fetchExecutionLog.js:67-111`
- **Input / case:** Running `node scripts/cycleCheckpointWiring.test.js`. `w.sheets` (`:54`) defines `World_Config`, `Engine_Errors`, `_CycleCheckpoint`, and `Simulation_Ledger`, but **not `Engine_Run_Log`**.
- **What breaks:** Every fire in `cycleCheckpointWiring.test.js` exits `writeRunRecord_` at `if (!sh)` (`godWorldEngine2.js:498`), so `chunkEncoded_` splitting, `setValues`, `ctx.resumed.draws`, `runRecordLogLines_`, and `outcome === null` (`:499-529`) are never exercised by any test in the repo. Similarly, `scripts/fetchExecutionLog.js` exports `summarize`, `recordsFromRows`, `pickRecord`, `renderRecord`, `unTilde` (`:161`), with no committed `scripts/fetchExecutionLog.test.js` (the commit cites an ad-hoc fixture run). Add `Engine_Run_Log` to `cycleCheckpointWiring.test.js` (and assert the written rows round-trip through `recordsFromRows` / `pickRecord`) plus a small `scripts/fetchExecutionLog.test.js`.

#### Finding 2 [LOW] — Minor engine entry / empty-tab edge notes
- **Pointers:** `phase01-config/godWorldEngine2.js:528, 540`, `scripts/fetchExecutionLog.js:117`
- **Cases:**
  1. `ENGINE95_TIMING_DIAG = null;` (`godWorldEngine2.js:540`) runs before `lock.tryLock(5000)` (`:542`). Safe in Apps Script (separate per-execution V8 isolates); in a shared-VM test harness, a lock-refused call clears `ENGINE95_TIMING_DIAG` before throwing. Moving it after `:542` avoids even that.
  2. If `Engine_Run_Log` is ever created on a sheet as an empty 0-row tab with no header (`sh.getLastRow() === 0`), `godWorldEngine2.js:528` writes the first fire to row `1`, and `fetchExecutionLog.js:117` (`(data || []).slice(1)`) skips row `1`. (Live already has its header row from Task 2.)

---

### 2. `Logger.getLog()` line format vs. `runRecordLogLines_` (`phase01-config/godWorldEngine2.js:482-492`)

- `runRecordLogLines_` (`:488`) drops empty lines and lines matching `/PHASE_TIMING_(BEGIN|END)/`, `/"totalMs"/`, or `/Cycle completed\./`.
- **Timing line kept?** No: `emitPhaseTimings_` (`:207-209`) logs `PHASE_TIMING_BEGIN`, single-line `JSON.stringify(payload)` (which always contains `"totalMs"`), and `PHASE_TIMING_END`; `godWorldEngine2.js:1008` logs `'Cycle completed. ...'`. All four are matched and stripped.
- **Real log line dropped?** No normal phase log in `phase*/` or `utilities/` matches `PHASE_TIMING_BEGIN/END`, `"totalMs"`, or `Cycle completed.` (verified by repo grep). Note that even if a future log line matched `"totalMs"` or `Cycle completed.`, `summarize` (`fetchExecutionLog.js:49-50`) uses `lines.findLast(...)`, so `renderRecord`'s authoritative bottom lines always win.
- **Format compatibility:** Apps Script `Logger.getLog()` prefixes lines with `[YY-MM-DD HH:MM:SS:SSS TZ] ` rather than `\tInfo\t`. `fetchExecutionLog.js:62` (`done.replace(/^.*\tInfo\t/, '')`) leaves the rendered `Cycle completed. ...` line intact, and `summarize` counts `warnings`/`errors` as `0` (as planned; `console.warn` in `utilities/priorityEngine.js:293` is not in `Logger.getLog()`).

---

### 3. `scripts/fetchExecutionLog.js` (`:45-161`), `scripts/runCycle.js:120-126`, and `~`-prefix coercion

- **`recordsFromRows` (`:70-85`):** Groups by `unTilde(r[0]) + '|' + unTilde(r[1])` (`Cycle|StartedAt`). Because `StartedAt` is each execution's `runStartedAt` (`fire.entryMs`), a `checkpointed` part and its `resumed` part never share a group key. Sorts numerically by `Part`, requires `1..n` contiguous parts, and catches malformed JSON.
  - *Minor (`:81`):* Checks `parts.length !== n` and `p.part !== i + 1` without checking `p.parts !== n` (corrupt mixed `Parts` values would still fail `JSON.parse` on partial data, though checking `p.parts !== n` is stricter).
- **`pickRecord` (`:87-97`):** Filters to `Number(r.cycle) === Number(cyc) && r.state === 'done' && r.timing && Array.isArray(r.timing.timings) && r.timing.timings.length > 0`, sorts descending by `runStartedAt` (fixed-width 24-char UTC ISO strings from `toISOString()`), and if `done.lifecycle === 'resumed' && done.checkpointGen != null`, prepends the matching `checkpointed` part's `log` while keeping `done.timing` whole.
- **`renderRecord` vs. `summarize` vs. `runCycle.js` Step 3.5 (`:120-126`):** `renderRecord` (`:99-111`) outputs `Execution started`, `rec.log`, `PHASE_TIMING_BEGIN`, `JSON.stringify(rec.timing)`, `PHASE_TIMING_END`, `Cycle completed. ...`. `summarize` (`:45-64`) uses `findLast` (`Node 22.23.4` in env; requires Node >= 18) for `Cycle completed.` and `"totalMs"`. If a resumed fire fails any `Phase10-ExecuteIntents` or `Phase11-*` phase (`ok: false`), `done.timing.timings` contains `ok: false`, `failedPhases` prints non-empty, and `scripts/runCycle.js:125-126` fails Step 3.5 as intended.
  - *Minor (`fetchExecutionLog.js:119-121` vs. `runCycle.js:65`):* A Sheets 429 read-quota error inside `fromRunRecord` is caught, printed to `stderr`, and falls through to Drive search before `runCycle.js:65` retries Step 3.5 (if Drive fails, `QUOTA_RE` on `stderr` still triggers the 65 s retry).
- **`lib/sheets.getSheetData` (`FORMATTED_VALUE`) coercion of `'~'`:** `'~'` is not a Sheets number, formula, or quote-escape prefix, so Sheets stores `'~118'`, `'~2026-11-23T...'`, and `'~{"cycle":...}'` verbatim as literal strings; `getSheetData` returns them unchanged and `unTilde` (`:67`) strips the leading `'~'`.

---

### 4. PROD fire that never reaches the new code (tab missing / pre-deploy PROD)

- **New engine code pushed where `Engine_Run_Log` tab is missing:** `writeRunRecord_` (`godWorldEngine2.js:497-498`) uses `ss.getSheetByName('Engine_Run_Log')`, logs one `Logger.log` line, and returns cleanly without throwing, flushing, or writing `Engine_Errors`. `preMortemScan.js` Scan 7 (`requiredTabLiterals`) inspects only `requireTab_` calls, and Scan 2 matches `godWorldEngine2.js` against `SHEETS_MANIFEST.md:137`; `tabReferenceIntegrity.test.js` passes (`schemas/SCHEMA_HEADERS.md:683`).
- **Pre-358 PROD fire while `scripts/fetchExecutionLog.js` is already on `main`:** `fromRunRecord` (`fetchExecutionLog.js:113-123`) gets no `done` record (header-only sheet -> `[]`, or missing tab -> caught -> `null`) and falls through to the existing Drive search (`:140-157`) unchanged.
