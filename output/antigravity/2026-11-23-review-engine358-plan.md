# agy plan review — engine.358 (`Engine_Run_Log` / Step 3.5)

- **Target plan:** [2026-11-23-engine-writes-its-run-record.md](file:///root/GodWorld/docs/plans/2026-11-23-engine-writes-its-run-record.md)
- **Brief:** [2026-11-23-es-brief-agy-engine358-plan.md](file:///root/GodWorld/docs/for-claude-review/2026-11-23-es-brief-agy-engine358-plan.md)
- **Verdict:** **HOLD** — 3 blocking design defects in the plan's checkpoint/resume, Step 3.5 gate, and row-keying rules, plus 3 medium/low operational & governance items to fold before Task 2/3 coding.

---

## Findings

### 1. [HIGH] Checkpoint + resume: `phaseTimings` double-count and `lines.find()` gate bypass on failed Phase 10/11 resume

- **Pointers:**
  - `phase10-persistence/cycleCheckpoint.js:34, 491, 501, 516-519, 527`
  - `phase01-config/godWorldEngine2.js:159-170, 459, 893-894, 916-940`
  - `scripts/fetchExecutionLog.js:41-42, 47`
  - `scripts/runCycle.js:124-126`
  - `docs/plans/2026-11-23-engine-writes-its-run-record.md:34-35`
- **Case A — Timing double-count (`cycleCheckpoint.js:34, 491, 527` vs. plan §Design item 3):**
  `CHECKPOINT_SUMMARY_FIELDS` (`cycleCheckpoint.js:34`) saves `phaseTimings` into the checkpoint payload. On resume, `resumeCore_` copies `payload.summary.phaseTimings` onto `ctx.summary.phaseTimings` (`cycleCheckpoint.js:491`), appends `Phase10-ExecuteIntents` and the four `Phase11-*` timings (`:501, :516-519`), and calls `emitPhaseTimings_(ctx)` (`:527`). Therefore, `ENGINE95_TIMING_DIAG` on the `resumed` fire **already holds all phases (both pre-checkpoint ~126 and tail ~5)**. Plan §Design item 3 states that the `resumed` row carries *"the tail's timing"* and *"The renderer joins both parts' timings"* — doing that would double-count all ~126 pre-checkpoint phases (`phaseCount` ~257, `totalMs` ~2x).
- **Case B — Step 3.5 gate passes when resume Phase 10/11 fails (`godWorldEngine2.js:933, 939` + `fetchExecutionLog.js:41-42`):**
  `runWorldCycleLocked_` calls `emitPhaseTimings_(ctx)` (`godWorldEngine2.js:933`) and `Logger.log('Cycle completed. ...')` (`:939`) inside its inner `finally` block — which executes **even when `checkpointGate_` returns `ckOutcome` (`:893-894`) or when `fatalError` is thrown (`:916-920`)**. So the `checkpointed` part's `Logger.getLog()` already contains a `{"cycle":...,"totalMs":...}` line (pre-checkpoint phases only, all `ok: true`) and a `Cycle completed.` line. Meanwhile `resumeCore_` calls `emitPhaseTimings_(ctx)` (`cycleCheckpoint.js:527`) into its own log and never logs `Cycle completed.`.
  If the renderer writes `Execution started`, then `checkpointed.log` + `resumed.log` verbatim, then the synthesized `PHASE_TIMING` + `Cycle completed.` lines at the end (plan §Design item 4):
  - Suppose `Phase11-CitizenArchive` throws inside `resumeCore_` (`cycleCheckpoint.js:518`). `safePhaseCall_` catches it, records `ok: false` in `phaseTimings`, and returns `false` (`godWorldEngine2.js:165-169`). `resumeCore_` does not throw, `World_Config.cycleCount` is already `N`, `fire.commitProblem` is `null`, so `closeCycleFire_` marks the resumed fire `done` (`godWorldEngine2.js:459`).
  - `scripts/fetchExecutionLog.js:41-42` uses `lines.find(...)` (first match, not last). `lines.find(l => /"totalMs"/.test(l))` matches **Part 1's** embedded `PHASE_TIMING` inside `checkpointed.log` (`failedPhases: []`) instead of the final `PHASE_TIMING` at the bottom, and `scripts/runCycle.js:125-126` **passes Step 3.5 despite a failed Phase 11 phase**.
- **Fix:**
  1. On a resumed cycle, take `timing` from the `resumed` record alone (do not concatenate `checkpointed.timing` + `resumed.timing`).
  2. Strip `PHASE_TIMING_BEGIN` / `{"cycle":...,"totalMs":...}` / `PHASE_TIMING_END` / `Cycle completed.` lines from `log[]` (either at write time or render time — stripping at write time also removes ~4.5 KB of duplicate `PHASE_TIMING` JSON per row), **and/or** update `fetchExecutionLog.js:41-42` to read the **last** matching `PHASE_TIMING` and `Cycle completed.` lines rather than `lines.find()`.

---

### 2. [HIGH] `StartedAt` collision between `checkpointed` and `resumed` rows; ambiguous `done` pick on re-fired cycles

- **Pointers:**
  - `phase10-persistence/cycleCheckpoint.js:29, 376, 422, 465, 533`
  - `phase01-config/godWorldEngine2.js:276-299, 368, 462, 472, 475`
  - `output/production_log_run_cycle_c116_gaps.md:355`
  - `docs/plans/2026-11-23-engine-writes-its-run-record.md:32-35`
- **Case A — `(Cycle, StartedAt)` collision breaks `Part 1..Parts` reassembly and `wallMs`:**
  `routeCheckpointAtAdmission_` (`cycleCheckpoint.js:422`) populates `fire.admission.startedMs` with `Number(manifest.startedMs)` — the **original checkpointed fire's** `startedMs`, not the resume execution's start timestamp. If `Engine_Run_Log`'s `StartedAt` column writes `fire.admission.startedMs`, both the `checkpointed` execution and the `resumed` execution write identical `(Cycle, StartedAt)`.
  - Any multi-row `Part 1..Parts` grouping keyed on `(Cycle, StartedAt)` will collide and corrupt/overwrite parts when either execution splits across >1 row.
  - Computing `wallMs = finishedAt - fire.admission.startedMs` on the resumed row includes the 60 s `CHECKPOINT_RESUME_DELAY_MS` sleep (`cycleCheckpoint.js:29`) rather than the resume execution's wall time (`Date.now() - t0` in `resumeCore_`, `:533`).
- **Case B — Multiple `done` or stale `checkpointed` rows for the same `Cycle`:**
  Live C116 was rolled back and fired twice (`godWorldEngine2.js:276`; `output/production_log_run_cycle_c116_gaps.md:355`), and the bench regularly re-runs cycles after `clearfire` / `syncSandboxFromLive`. `Engine_Run_Log` is append-only, so a `Cycle` can have:
  - two `done` rows (e.g. a rolled-back fire followed by the real fire): *"the Cycle's fire whose state is `done`"* does not specify taking the **latest** `done` row (first-match `find()` would return the rolled-back fire);
  - a stale `checkpointed` row from an earlier failed checkpoint/resume attempt followed by a normal `done` re-fire: joining *"its `checkpointed` part"* by `Cycle` alone without checking `lifecycle === 'resumed'` and matching checkpoint `gen` / `admission.startedMs` would attach the failed attempt's `checkpointed` log to an unrelated normal fire.
- **Fix:** Give each execution its own `execStartedAt` (e.g. `fire.entryMs` from `godWorldEngine2.js:472`) or unique `runId` as the `Part 1..Parts` group key; carry `admissionStartedAt` / `checkpointGen` (`manifest.gen` or `fire.checkpoint.gen`) to link a `resumed` row strictly to its matching `checkpointed` parent; and explicitly pick the **latest** `done` row for `Cycle`.

---

### 3. [HIGH] Null / missing-field edge cases in `writeRunRecord_` and Step 3.5 gate

- **Pointers:**
  - `phase10-persistence/cycleCheckpoint.js:435-448, 482, 489, 527`
  - `phase01-config/godWorldEngine2.js:192, 478, 493-495, 512-540, 571, 938`
  - `scripts/fetchExecutionLog.js:42-51`
  - `scripts/runCycle.js:124-126`
- **Case A — `rngDraws` is lost on every resumed fire (`cycleCheckpoint.js:489`):**
  In `resumeCore_`, `ctx.rng` is `null`, and the pre-checkpoint draw count is stored at `ctx.resumed.draws` (`cycleCheckpoint.js:489`). If `writeRunRecord_` reads `fire.ctx.rng.draws` (mirroring `godWorldEngine2.js:938`), every resumed fire records `rngDraws: null` / `'n/a'`. Read `(ctx.rng && typeof ctx.rng.draws === 'number') ? ctx.rng.draws : (ctx.resumed && typeof ctx.resumed.draws === 'number' ? ctx.resumed.draws : null)`.
- **Case B — A `done` record with `timing: null` passes Step 3.5 (`fetchExecutionLog.js:42-51`, `runCycle.js:124-126`):**
  In `scripts/fetchExecutionLog.js:42-51`, if no `"totalMs"` line is found in the text, `t` stays `null` and `failed` becomes `[]`. `scripts/runCycle.js:124-126` only checks `r.status === 0`, `/Execution started/`, `/Cycle completed\./`, and non-empty `failedPhases`. Thus if a `done` record ever has `timing: null` (or empty `timing.timings`) and the renderer still emits `Cycle completed.`, Step 3.5 passes with **0 verified phases**. Require `record.timing && Array.isArray(record.timing.timings) && record.timing.timings.length > 0` before emitting `Cycle completed.` (or fail Step 3.5 when `phases === null || phases === 0`).
- **Case C — `ss`, `fire.ctx`, or `outcome` can be `null` in `runWorldCycle`'s `finally` (`godWorldEngine2.js:478, 493-494, 537-540, 571`):**
  - `openSimSpreadsheet_()` throws (`:478`) → `ss === null`, `fire.admission === null`, `outcome === null`.
  - `ensureEngine*` throws (`:512-540`) or `resumeCore_` throws while loading (`cycleCheckpoint.js:482`) → `fire.ctx === null`.
  - `initSimulationLedger_` throws (`:571`, before inner `try/finally` at `:573`) → `fire.ctx` is set, `ctx.summary.cycleId === null` (`aborted`), `ENGINE95_TIMING_DIAG === null`.
  - `closeCycleFire_` throws (`:493-494`, e.g. `PropertiesService` failure) → `fire.admission` is non-null, `outcome` is `null`. Dereferencing `outcome.state` without a null guard throws inside `writeRunRecord_`.
  - Also reset `ENGINE95_TIMING_DIAG = null` at `runWorldCycle` entry so an in-process VM test harness (like `scripts/cycleCheckpointWiring.test.js`) cannot leak timing from an earlier fire into a subsequent early-aborted fire.
- **Note on close-only recovery (`cycleCheckpoint.js:435-448`):** If `resumeCore_` commits (`manifest.state === 'committed'`) and Google kills the execution before `runWorldCycle`'s `finally` runs, the next fire reconciles `FIRE_ADMISSION_JSON` inside `admitCycleFire_`, so no `done` row exists in `Engine_Run_Log` for that cycle and Step 3.5 cleanly falls back to Drive export.

---

### 4. [MEDIUM] Cell-format coercion (`'` vs. `@`), UTF-16 surrogate split, and 360 s wall / lock hold

- **Pointers:**
  - `phase10-persistence/cycleCheckpoint.js:27, 137-138, 289, 313`
  - `phase10-persistence/persistenceExecutor.js:197-231`
  - `phase01-config/engine94SheetContract.js:411-412`
  - `phase01-config/godWorldEngine2.js:474, 492-495`
  - `phase10-persistence/saveV3Seeds.js:118`
  - `lib/sheets.js:49-80`
  - `scripts/syncSandboxFromLive.js:86-97, 130`
  - `output/production_log_run_cycle_c117_gaps.md:262`
- **Leading apostrophe (`'`) breaks `JSON.parse` if a cell is Plain-Text (`@`) formatted:**
  `lib/sheets.getSheetData` (`lib/sheets.js:53-56`) uses default `valueRenderOption: 'FORMATTED_VALUE'`. In Apps Script, `appendRow` / `setValues` with `"'" + str` only strips `'` when the cell has General/auto number format (`saveV3Seeds.js:118`). If any `Engine_Run_Log` column is pre-formatted as Plain Text (`@`) in Sheets, Sheets keeps the leading `'` literally (`'{"cycle":...}`), breaking `JSON.parse` on read. By contrast, `cycleCheckpoint.js:27` prefixes data cells with `~` (`CHECKPOINT_CHUNK_PREFIX`) and strips `charAt(0) === '~'` on read — safe under every number format and `RAW` syncs. (If keeping `'`, the reader should defensively strip a leading `'` from `RecordJSON` only if `!raw.startsWith('{')`, or prefix JSON chunks with `~`.)
- **UTF-16 surrogate-pair split at 45,000 chars:**
  `Logger.log` lines include citizen/story text that can contain emoji / supplementary Unicode. Splitting at `45000` without `cycleCheckpoint.js:137-138`'s high-surrogate guard (`0xD800..0xDBFF`) can split a surrogate pair across two cells. Note: `45,000` is safely below `syncSandboxFromLive.js:86`'s `CELL_CAP = 49900` truncation threshold.
- **360 s wall budget and lock release (`godWorldEngine2.js:474, 492-495`):**
  In C117, the commit tail already ran `88.7 s` against `tailReserveMs` `60,000 ms` (`output/production_log_run_cycle_c117_gaps.md:262`), and `checkpointGate_` leaves `30 s` slack (`360s - wallBudgetMs 330s`, `engine94SheetContract.js:411-412`).
  - `writeRunRecord_` must **not** wrap its write in `persistWithRetry_` / `appendRowWithRetry_` (`persistenceExecutor.js:197-231`, up to `19 s` of `Utilities.sleep` + 4 RPCs), which could push a late checkpoint or slow tail past the 360 s hard kill before `lock.releaseLock()` (`:495`). A single fast write (`appendRow` for 1 part, `getRange(lastRow + 1, 1, rows.length, 7).setValues(rows)` for N parts) + `SpreadsheetApp.flush()` inside `try/catch` keeps overhead minimal while ensuring the row is visible immediately after the web trigger returns `{ok:true}` (since `:492`'s `flush()` runs *before* `closeCycleFire_` and `writeRunRecord_`).

---

### 5. [LOW / INFO] `Logger.getLog()` behavior, `console.warn` omission, and current readers

- **Pointers:**
  - `utilities/priorityEngine.js:292-299`
  - `scripts/fetchExecutionLog.js:45-46, 54`
  - `.claude/skills/pre-mortem/SKILL.md:28`
  - `.claude/skills/run-cycle/SKILL.md:71-82`
  - `lib/mags.js:539-558` (`lib/mags.searchDisk.test.js:53`)
  - `output/execution_log_c117.txt:1-2, 238, 298`
- **All current readers of `output/execution_log_c{XX}.txt`:** Grepping `scripts/`, `lib/`, and `.claude/skills/` finds two code consumers (`scripts/fetchExecutionLog.js:40-55, 72` and `scripts/runCycle.js:122-126`), one disk-search exclusion test (`lib/mags.searchDisk.test.js:53` — note `lib/mags.js:545` `SEARCH_SHELF_FILE_RE` uses an allowlist so the new `output/execution_log_c{XX}.json` stays excluded automatically), and two skills (`.claude/skills/run-cycle/SKILL.md:71-82` and `.claude/skills/pre-mortem/SKILL.md:28`).
- **`Logger.getLog()` completeness & format:** `Logger.getLog()` is per execution, captures `Logger.log(...)` (`Info`) lines prefixed by Apps Script's `[YY-MM-DD HH:MM:SS:SSS TZ] `, and omits `Notice Execution started/completed` and `console.warn`/`console.error` (`utilities/priorityEngine.js:293`, acknowledged in plan line 38). Consequently `fetchExecutionLog.js:45` will report `warnings: 0` when rendering from `Engine_Run_Log` (C117 had 1 `priorityEngine clamp` warning at `output/execution_log_c117.txt:238`). Platform log-buffer truncation ceiling will be measured empirically in Task 5 on the bench.
- **Line 1 / `pre-mortem/SKILL.md:28`:** `pre-mortem/SKILL.md:28` tells operators the fire date is on line 1 of `output/execution_log_c{XX-1}.txt` (already stale on `output/execution_log_c117.txt:1`, while `scripts/runCycle.js:87` derives `--since` from `c{XX-1}.json` Step 3 `at`). Rendering line 1 as `source: Engine_Run_Log | startedAt: <ISO>` satisfies both.
- **Long-term tab growth:** `sheets.getSheetData('Engine_Run_Log')` reads the entire tab on every Step 3.5 (~45–80 KB/fire, ~2.5–4 MB/year). Not a blocker now, but the plan has no retention/archive cap.

---

## 6. `.claude/rules/engine.md`, `engine.119`, and Hook Compliance

- **Pointers:**
  - `.claude/rules/engine.md:27, 45-48`
  - `docs/engine/SHEETS_MANIFEST.md:127-139`
  - `scripts/tabReferenceIntegrity.test.js:6-10, 48, 82-102`
  - `scripts/regenSchemaHeaders.js:59` (`utilities/exportSchemaHeaders.js:151`)
  - `scripts/preMortemScan.js:159-196, 225-299`
  - `scripts/stubEngine.js:8-10`
  - `.claude/hooks/pre-tool-check.sh:179-188`
  - `scripts/syncSandboxFromLive.js:57-61, 117-135`
- **Check 1 — `Engine_Run_Log` must be visible (not hidden) before Task 3 runs `tabReferenceIntegrity.test.js` / `regenSchemaHeaders.js`:**
  `scripts/tabReferenceIntegrity.test.js:48, 82-102` scans `phase*/`, `utilities/`, and `lib/` for literal `getSheetByName('<Tab>')` calls and fails if `<Tab>` is absent from `schemas/SCHEMA_HEADERS.md` (and not allowlisted). `scripts/regenSchemaHeaders.js:59` and `utilities/exportSchemaHeaders.js:151` skip hidden and `_`-prefixed tabs. Keep `Engine_Run_Log` visible (like `Engine_Errors` and `Carry_Forward_Store`) and create it on live in Task 2 *before* running `regenSchemaHeaders.js` in Task 3. (`preMortemScan.js` Scan 7 checks `requireTab_` literals only, so best-effort `ss.getSheetByName('Engine_Run_Log')` does not trigger Scan 7.)
- **Check 2 — Direct write outside Phase 10 & pre-commit hook:**
  `phase01-config/godWorldEngine2.js` is already in `SHEETS_MANIFEST.md` §9 (`:136-139`), and `preMortemScan.js` Scan 2 matches by basename (`:172, 184`), so adding a §9 row keeps Scan 2 clean. However, `.claude/hooks/pre-tool-check.sh:179-188` warns on any staged diff adding `getRange|setValue|setValues|appendRow` in `.js` files outside `phase10-persistence/` (requiring `[skipped]` / acknowledgement in the commit message, or putting the writer helper in `phase10-persistence/`).
- **Check 3 — `stubEngine.js` outputs:**
  Plan §Design item 5 names only `docs/engine/ENGINE_STUB_MAP.md`; `scripts/stubEngine.js:8-10` regenerates three files (`ENGINE_STUB_MAP.md`, `ENGINE_STUB_REVERSE.md`, `ENGINE_STUB_REVERSE.json`) — include all three in Task 3's commit.
- **Check 4 — Task 5 live-sync note:**
  `scripts/syncSandboxFromLive.js:57-61, 117-120` leaves a bench-only tab untouched during a live-to-bench sync (whereas once `Engine_Run_Log` exists on live, `syncSandboxFromLive.js` clears and overwrites the bench's `Engine_Run_Log` with live's rows).

---

## Attached Wiring Card

Ran pre-approved Haiku `engine-wiring` card (`node scripts/runEngineAgent.js --agent engine-wiring --model anthropic/claude-haiku-4.5 --task "Target: runWorldCycle, closeCycleFire_, emitPhaseTimings_, ENGINE95_TIMING_DIAG"` -> scratch `wiring_engine358.md`; `127/127` engine phase files opened, 100%). Per one-target rule, mapped `runWorldCycle`:

- **Definition:** `phase01-config/godWorldEngine2.js:471` (`runWorldCycle(opts)`, production entry; `runCyclePhases_` at `:2288`, `Phase10-ExecuteIntents` at `:897` / `:2596`).
- **Callers:** `utilities/webTrigger.js:102` (`runWorldCycle({ web: true, expect: ... })`), `phase10-persistence/cycleCheckpoint.js:548` (`runWorldCycle({ resumeOnly: true })`).
- **S / ctx / write path:** No direct `S.*` or tab references in `:471-503`; manages `lock` (`:473, :495`), local `fire` (`:475`), `openSimSpreadsheet_()` (`:478`), `admitCycleFire_` (`:479`), `resumeCore_` (`:482`) / `runWorldCycleLocked_` (`:484`), `SpreadsheetApp.flush()` (`:492`), `closeCycleFire_` (`:493`). No `Math.random` in `:471-503`.
