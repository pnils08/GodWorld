---
title: Platform Ceiling Resilience Plan (Cycle Runtime + Sheets Migration)
created: 2026-07-31
updated: 2026-10-04
type: plan
tags: [engine, infrastructure, architecture, active]
sources:
  - External codebase audit (commit af50e1f) gaps #5 + #6, verified against live repo 2026-07-31 (Kimi CLI verification)
  - phase10-persistence/persistenceExecutor.js:176-200 (persistWithRetry_ — S271 transient-write backoff)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (engine.95)"
  - "[[../research/2026-08-01-simulation-realism-audit]] — build-order step 1: Task 4 checkpoint/resume is the platform prerequisite for every heavy engine addition"
  - "[[../SPREADSHEET]] — tab audit (56 documented tabs)"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — registered same commit"
---

# Platform Ceiling Resilience Plan

**Goal:** A cycle that approaches the Apps Script 6-minute execution wall is seen coming, degrades safely, and recovers without state corruption — and the project knows its Sheets scaling ceiling from data, not vibes.

**Architecture:** Two tracks. **Track A — cycle runtime resilience.** The engine has **zero execution-time handling** today: no per-phase timing, no budget guard, no checkpoint/resume (verified by grep across `phase*/`, `utilities/`, `lib/`). The saving grace: writes are confined to Phase 10 via `ctx.writeIntents`, so a wall-clock kill *before* Phase 10 leaves Sheets untouched and a re-run is the recovery path; the corruption window is a kill *during* Phase 10, partially mitigated by `persistWithRetry_` (transient-error backoff 0/2/5/12s, atomic all-or-throw `setValues`). Track A therefore: (1) instruments per-phase elapsed time so the wall is measurable, (2) adds a budget guard that checkpoints Ctx before the wall and resumes next execution, (3) hardens Phase 10 intent commit to be resumable/idempotent. **Track B — Sheets ceiling eval.** Inventory tabs/rows/growth (56 documented tabs in `schemas/SCHEMA_HEADERS.md`; Simulation_Ledger 922 rows / 52 cols; daily CSV backups in `backups/sheets/YYYY-MM-DD/` via `scripts/backupSpreadsheet.js` are the measurement source), then write an export-to-DB **evaluation** as a research file (verdict adopt/watch/take-nothing per `docs/research/RESEARCH_TEMPLATE.md`) — no migration build without Mike approval.

**Terminal:** engine-sheet (Track B research file co-signed research-build)

**Pointers:**
- Related plan: [[engine/ROLLOUT_PLAN]] engine.36 (isolated staging environment, parked — separate concern, do not conflate)
- Verification basis: audit's "~65 tabs" was wrong (56 documented); audit's "backups solid" confirmed (`scripts/backupSpreadsheet.js` = Drive copy + per-tab CSV; `scripts/backup.sh` daily local + Drive). Audit's "no export-to-DB design anywhere" confirmed (grep across `docs/` finds only claude-mem SQLite and tool evaluations — nothing for the simulation store). Audit's "no execution-limit handling" confirmed; the nuance it missed is the writes-confined-to-Phase-10 architecture making pre-Phase-10 kills inherently safe.

**Acceptance criteria:**
1. Every cycle logs per-phase elapsed ms to a queryable surface; one can answer "how close was C&lt;N&gt; to the wall" from data.
2. A sandbox run with an artificially slowed phase demonstrates checkpoint → resume with zero double-writes and zero lost intents.
3. Ceiling research file delivered with row-growth projections and an adopt/watch/take-nothing verdict on export-to-DB.

---

## Tasks

### Task 1: Find the phase runner + current timing data
- **Files:** `phase01-config/godWorldEngine2.js` — read
- **Steps:** Locate the top-level phase-dispatch loop. Check whether any cycle-duration data already exists (dashboard session-events, `logs/`, Engine_Errors tab) — resolve Open question 1.
- **Verify:** runner location + existing-data answer in Build notes
- **Status:** [x] DONE 2026-07-31 (Kimi CLI) — runner = `runWorldCycle`/`runCyclePhases_`, seam = `safePhaseCall_`; no existing duration data anywhere

### Task 2: Instrument per-phase elapsed time
- **Files:** `phase01-config/godWorldEngine2.js` — modify
- **Steps:** Wrap each phase dispatch with `Date.now()` timing; log per-phase ms (Logger + a row to a durable surface per Task 1 findings). No behavior change.
- **Verify:** `node --check phase01-config/godWorldEngine2.js`; sandbox cycle prints per-phase timings
- **Status:** [x] DONE 2026-07-31 S346 — committed 769d921b (engine-sheet lands per AGENTS.md substrate gate; Kimi authored) + follow-up 718ebb7e (Task 2b): script has no GCP project so `clasp logs` is terminal-unreachable — timings also stash in `ENGINE95_TIMING_DIAG` and ride the web-trigger fire response (ENGINE59/61 diag precedent, `utilities/webTrigger.js`). Runtime-proven on bench 0720 deployment @27: 3 clean fires, 126 phases instrumented, 98.7% wall coverage.

### Task 3: Baseline the wall distance
- **Files:** timing output from Task 2 — read
- **Steps:** Collect 3+ cycles of per-phase timings (or reconstruct from logs if Task 1 found history). Record mean/max per phase and total vs the 6-min wall in Build notes. This number drives how aggressive Task 4 must be.
- **Verify:** baseline table in Build notes
- **Status:** [x] DONE 2026-07-31 S346 — 3 bench cycles (C106–C108, bench 0720 @27), baseline table in Build notes, raw data `output/engine95_timing_baseline.json`. Bench ≈ live (synced state, same platform); confirm against next live fire.

### Task 4: Design checkpoint/resume (research-build consult, engine-sheet writes)
- **Files:** `phase01-config/godWorldEngine2.js`, `phase09-digest/finalizeCycleState.js` — read; this plan — modify
- **Steps:** Design: budget guard checks elapsed before each phase; at threshold, serialize Ctx (the `finalizeCycleState.js` snapshot pattern at :103-108 is the precedent for compacting ripple state) to `PropertiesService` + a continuation trigger (`ScriptApp.newTrigger` precedent: `phase10-persistence/cycleExportAutomation.js:469`); resume rehydrates and continues at the next phase. Guard against double-fire. Mike sign-off on the design before build.
- **Verify:** design in Build notes; Mike approval recorded
- **Status:** [~] DECISIONS LOCKED 2026-07-31 (Mike-direct): auto-resume (not manual gate), hidden-tab checkpoint store, threshold computed from live timing data. **Builder go 2026-10-07 (330000 / 60000 / measured). Codex Review 1 2026-10-08 HOLD — the 2026-10-04 design superseded by §Build notes "Revision 1"; Review 2 pending before code.** Input numbers refreshed there (bench 2026-09-20: tail = Phase10 12.8–14.9 s + Phase11 ~31–35 s; whole Cycle 133–177 s, 168 s on the C110 queue after engine.279).

### Task 5: Phase 10 commit resumability audit
- **Files:** `phase10-persistence/persistenceExecutor.js` — read
- **Steps:** Read the full intent-commit loop. Determine: if killed mid-commit, which intents are idempotent on re-run (append = duplicate risk; `setValues` = safe per :186 comment) and what a resume marker needs. Write findings + minimal fix (e.g. per-intent commit markers) to Build notes.
- **Verify:** resumability findings + fix proposal in Build notes
- **Status:** [x] DONE 2026-07-31 (Kimi CLI) — audit in Build notes. Verdict: every intent kind is kill-safe on blind re-run EXCEPT batch append (duplicate-row hazard after post-landing kill). Fix proposal: hash-dedup appends (Engine_Errors precedent) + 2-row commit journal in `_CycleCheckpoint`, shared with Task 4's resume path. Build awaits Mike/Fable.

### Task 6: Sheets ceiling inventory
- **Files:** `backups/sheets/` (latest CSV dump), `schemas/SCHEMA_HEADERS.md` — read
- **Steps:** From the latest CSV backup: row counts per tab, total cells, per-tab growth across the last 4 weekly dumps if present. Project against Sheets limits (10M cells/file, 40k new rows/day API). Table into Build notes.
- **Verify:** inventory + projection table in Build notes
- **Status:** [x] DONE 2026-07-31 (Kimi CLI) — only one CSV dump exists (2026-03-01), so growth computed as Mar→Jul delta vs SCHEMA_HEADERS, not 4 weekly dumps. 4.6% of cell limit; append-ledgers are the growers. Table in Build notes.

### Task 7: Export-to-DB evaluation (research file)
- **Files:** `docs/research/2026-07-31-sheets-ceiling-export-eval.md` — create (per `docs/research/RESEARCH_TEMPLATE.md`)
- **Steps:** Write the eval: current headroom (Task 6), options (stay-Sheets + hygiene / SQLite sidecar for cold tabs / full DB migration), cost-benefit, verdict. Register in `docs/research/index.md` per its sub-catalog rule. This is an evaluation, not a build plan.
- **Verify:** research file exists with verdict; indexed
- **Status:** [x] DONE 2026-07-31 (Kimi CLI) — `docs/research/2026-07-31-sheets-ceiling-export-eval.md`, registered in `docs/research/index.md`. Verdict: take-nothing (migration build) / watch with 4 named triggers.

---

## Build notes

**Task 1 (2026-07-31, Kimi CLI) — runner + existing-data findings:**

- **Phase runner:** `runWorldCycle()` (`phase01-config/godWorldEngine2.js:164`) is the main entry — inline phase calls from :205 to :504+. `runCyclePhases_(ctx)` (:1778) is the extracted v2.12 helper used by wrapper functions; it mirrors the same phase list. **Both funnel every phase through `safePhaseCall_(ctx, phaseName, fn)` (:154-162)** — one seam covers ~60+ phase calls across both dispatch structures. Task 2 instruments inside `safePhaseCall_`, not per-call-site.
- **Existing cycle-duration data: NONE.** Engine_Errors schema is Timestamp/Cycle/Phase/Error/Stack/Class/Source/Severity/Resolved/Hash — no duration field (`schemas/SCHEMA_HEADERS.md` §Engine_Errors, 567 rows). The cycle-completion summary (:531-537) is a `Logger.log` of error counts only, no timing, and lives only in Apps Script logs. Dashboard `session-events` (`dashboard/server.js:2431-2460`) is Claude-harness hook traffic, not engine cycles — confirmed not a source. No `Date.now`/elapsed guards anywhere in `phase*/` code (grep, this session).
- **Extraction precedent for Task 2:** the `PHASE42_VERIFY_BEGIN`/`PHASE42_VERIFY_END` pattern (:1659-1667) — JSON between Logger markers, captured via `clasp logs` then greped — is the established way to get structured data out of a GAS run. A `PHASE_TIMING_BEGIN {json} PHASE_TIMING_END` marker follows it exactly. Open question 1 RESOLVED: no historical duration data exists; Task 3 needs new collection (or `clasp logs` archaeology, which only reaches recent runs).
- **Durable-surface options for Task 2 (Fable review input):** (a) Logger marker + `clasp logs` pull to `output/` (matches PHASE42_VERIFY precedent, zero Sheets change); (b) dedicated tiny tab (new tab = sheet change, needs approval); (c) fold into Engine_Errors as a `timing` Class (wrong shape — pollutes an error log, not recommended). Default: (a).

**Task 2 (2026-07-31, Kimi CLI) — diff drafted for Fable review:** proposal at `output/codex/engine95-task2-phase-timing-proposal.md` (option a). One function modified (`safePhaseCall_`), two added, one emit line at cycle close. Known deliberate gap: `runCyclePhases_` wrapper paths collect but never emit (no cycle-close block there) — flagged as review point 2. Engine_Errors health-verified first: `logEngineError_` (:74-127) writes 10-col deduped rows directly with a documented meta-error carve-out; the "silent degradation never throws" gap is infrastructure.6 territory, not this diff.

**Task 3 baseline (S346 2026-07-31, bench 0720 @27, 3 cycles C106–C108, zero phase failures):**

| Metric | C106 | C107 | C108 |
|---|---|---|---|
| Wall (ranMs) | 105.9s | 128.3s | 138.0s |
| Instrumented total | 104.5s | 126.7s | 135.8s |
| Phases | 126 | 126 | 126 |

**Wall distance: mean 124s / max 138s against the 360s wall → 34–38% consumed, ~3.9-min headroom at worst.** Not an emergency, but the trend inside the window was monotonic (+32s over 3 cycles) — likely LifeHistory_Log growth between Phase-11 trims; watch whether it saw-tooths after a trim or keeps climbing.

Top phases by mean ms: Phase11-MaintainLifeHistoryLog 19.1s (max 23.8) · Phase10-ExecuteIntents 15.4s (max 18.3) · Phase5-HouseholdFormation 9.5s · Phase5-Advancement 8.8s · Phase5-Education 6.8s · Phase5-CitizenEvents 6.7s · Phase7-ContractSeeds 5.4s · Phase7-Famous 4.5s · Phase5-Promotions 4.4s. Full per-phase data: `output/engine95_timing_baseline.json`.

**Read for Task 4:** the two biggest costs sit at Phase 10/11 — exactly the phases a mid-cycle checkpoint must NOT split (intent commit + trim are the transactional tail). A checkpoint design that only considers Phases 1–9 covers ~70s of a 124s cycle; the budget guard threshold has to fire before Phase 10 starts, not mid-tail.

**Task 2 APPLIED 2026-07-31 (Fable review passed, 2 conditions met):** diff applied verbatim (+39 lines, `node --check` OK). Fable verified the one real hazard — `ctx.summary = S` at :959 is a same-object reassignment, no timing loss — and 261 `safePhaseCall_` call sites confirmed. Condition 1: wrapper-emission follow-up deferred (dry-run/replay timings would pollute the Task 3 baseline). Condition 2 done same-change: `scripts/stubEngine.js` regenerated ENGINE_STUB_MAP + REVERSE (1,124 functions; `S.phaseTimings` now indexed), and `S.phaseTimings` noted as observation-only in `docs/engine/PHASE_DATA_AUDIT.md` (post-write orphan-guard flag expected + deliberate — hook allowlist is control-plane, not editable by Kimi). **Deploy:** local change only — rides a future clasp push; Fable noted engine.88 is already live-push-pending, so Task 2 code waits for that batch or a clean window (no interleaved unverified pushes). NOT committed — commit awaits Mike's explicit go.

**ctx-map cross-check (2026-07-31):** `node scripts/ctxMap.js phaseTimings` reports "ORPHANED WRITE — Read by: NONE". Verified this is the tool's vocabulary, not a defect: the detail view counts only *external* readers (`scripts/ctxMap.js` :185 — readers in files that don't also write), and `phaseTimings`'s writer + sole reader both live in `godWorldEngine2.js` (write :175, reads :186-187). A deliberate single-file leaf — consumed by Logger emission, not another phase. Future audits: do not re-flag; the field is documented observation-only in `docs/engine/PHASE_DATA_AUDIT.md`.

**Task 6 (2026-07-31, Kimi CLI) — Sheets ceiling inventory.** Only one local CSV dump exists (`backups/sheets/2026-03-01`, 60 tabs) — joined against live `schemas/SCHEMA_HEADERS.md` (2026-07-27, 56 tabs) for a ~5-month delta. Headline: **456,780 cells of 10M = 4.6% used** (34,027 rows). Growth concentrated in append-ledgers (rows/mo): LifeHistory_Log +1,469, Relationship_Bond_Ledger +945, LifeHistory_Archive +877, Household_Ledger +126. Trimmed rotating tabs shrink or hold (Media_Briefing −7,245, Simulation_Ledger 3,417→931). Tab churn healthy (Chicago_* gone per S229; Ripple_Ledger etc. new). Full analysis + projection: `docs/research/2026-07-31-sheets-ceiling-export-eval.md`.

**Task 7 (2026-07-31, Kimi CLI) — export-to-DB eval delivered:** `docs/research/2026-07-31-sheets-ceiling-export-eval.md`, registered in `docs/research/index.md` same change. Verdict **take-nothing (migration build) / watch** with 4 named triggers (>50% cells; <2 min wall headroom on PHASE_TIMING; 4-cycle monotonic trim-phase creep; quota-error class in Engine_Errors). Key reframe: the operative ceiling is per-cycle read *time* on fat tabs coupling into the 6-min wall (Phase 11 trim already 19.1s mean), not cell count. Adjacent accepted work: extend the LifeHistory trim pattern to Relationship_Bond_Ledger + fast append-ledgers (engine-sheet batch or small standalone row).

**Task 5 (2026-07-31, Kimi CLI) — Phase 10 commit resumability audit.** Read: `phase10-persistence/persistenceExecutor.js` (528 lines, full).

Execution order: replaceOps (ensure @25 → replace @50) → updates by sheet (cells → ranges → batch appends) → logs by sheet (appends). Per-sheet errors are isolated (collected into `stats.errors`, loop continues) — a failed tab doesn't abort the commit.

Idempotency of a **blind full-cycle re-run** after a wall-clock kill *during* Phase 10 (re-run is valid because seeded RNG makes the intent stream deterministic given the same sheet state):

| Intent kind | Kill-safe? | Why |
|---|---|---|
| ensure | YES | Tab exists → no-op (`:222-227`) |
| replace | YES (one caveat) | clear+rewrite is self-healing on re-run. Caveat: a kill landing *between* `clearContent()` and `setValues()` inside the retry (`:283-285`) leaves the tab **wiped** until the re-run heals it — the S271 comment (:266) covers transient timeouts, not wall-clock kills |
| cell | YES | `setValue` same cell/value (`:347`) |
| range | YES | `setValues` fixed address, atomic all-or-throw (`:366`) |
| **append** | **NO — the one real hazard** | Batch append computes `startRow = getLastRow()+1` inside the retry (`:410-412`). The :407-409 comment proves safety only for *thrown* setValues. A kill **after** a batch lands server-side → the re-run re-appends identical rows → **duplicate rows in the canonical append-ledgers** (LifeHistory_Log, Ripple_Ledger, Election_Log, etc.). Window is one `setValues` per sheet, but duplicates in ledgers are canon contamination |

Cross-tab torn state (kill mid-commit → some tabs updated, others stale) **converges on re-run** for every kind except the append-duplication above.

`persistWithRetry_` (:188) covers *transient* Google errors (0/2/5/12s backoff, transient-class regex). It does **nothing** for a 6-min wall kill — that kill type isn't recoverable inside the run by definition. This is the boundary between "already handled" (transient) and "Task 5's gap" (wall).

**Minimal fix proposal (for Fable/Mike, not built):**
1. **Append dedup via the existing hash pattern.** Append intents carry `(cycle, rowHash)`; the append path in `executeSheetIntents_` skips rows whose hash is already present on the target tab. Precedent in-repo: Engine_Errors `Hash` column + `computeShortHash_` (`godWorldEngine2.js:109-110`), mirrored node-side by `lib/diagnosticLedger.computeHash()`. Determinism means re-run duplicates are *exact* duplicates, so hash-dedup is exact, not fuzzy.
2. **Two-row commit journal** (`cycle N commit: pending → committed`, written before Phase 10 starts and after it succeeds). On cycle start, an incomplete journal = previous run died mid-commit → log loud + engage dedup mode. Rows can live in Mike's chosen `_CycleCheckpoint` tab (Task 4 decision) — same mechanism serves both Task 4 resume and Task 5 dedup.
3. Task 4 implication: a resume run should re-queue intents and route appends **through the dedup path** — resume and re-run then share one safe mechanism instead of two.

**Task 4 design (engine-sheet, 2026-10-04) — checkpoint at the Phase-10 gate; the resume is the tail alone.**

Numbers (bench SANDBOX 0908, four fires C112–C115, 2026-09-20, `output/engine-sheet/2026-09-20-bench-c11[2-5]-fire.json`): wall 133–140 s; Phase10-ExecuteIntents 12.8–14.9 s; Phase11-MaintainLifeHistoryLog 27.0–30.3 s; Phase11-MediaIntake 1.5–3.3 s; Phase11-CitizenArchive 1.0–2.1 s; Phase11-BusinessArchive ~0. **Tail (Phase 10 + 11) ≈ 45–50 s.** Since then: the C110 intake queue (124 rows) ran 239–285 s until engine.279 cut it to 168 s (2026-10-02); engine.206's C119 bench ran 177 s; daytime fires have run near 2× night (three died at the 360 s cap on 2026-09-15). The July baseline (124 s mean) is stale — the Cycle grew with the queue and the ledger.

Where a kill hurts (Task 5 + the runner): Phases 1–9 write nothing (every write is a queued intent until Phase10-ExecuteIntents; Phase 11 writes direct) — a kill there is a clean re-run, except that engine.275's fire record stays `running` with no finish, so the next fire is refused until the record is aborted. Mid-Phase-10 = a torn commit plus duplicate appends (Task 5's one real hazard). Phase 11 = direct writes, each idempotent except the archive appends. So the only place a checkpoint earns its cost is **before Phase 10 starts** — the plan's own "read for Task 4" line — and the only state worth saving is the intent queue.

Mechanism, six parts:

1. **The gate.** One unwrapped call after Phase9-FinalizeCycleState: `elapsed = now − fire.admission.startedMs`. Three World_Config keys, self-arm contract: `wallBudgetMs` (360 s less the platform's own slack; propose 330000), `tailReserveMs` (tail p95 + margin; propose 60000 from the numbers above), `checkpointSaveMs` (the cost of step 2, measured on the bench's first fire; placeholder 20000). `elapsed + tailReserveMs ≤ wallBudgetMs` → Phase 10/11 run as today (the common case: 168 + 60 ≪ 330). Otherwise → checkpoint. The threshold is data, not a guess (Mike-direct).
2. **The checkpoint** (hidden tab `_CycleCheckpoint`, Mike-direct): row 1 = journal `{cycle, state: 'pending', startedMs, elapsedMs, phasesDone}`; rows 2..n = JSON chunks (≤45,000 chars a cell) of `ctx.writeIntents` plus the cache's queued cell writes (the `cycleCount` / `lastRun` bump from Phase1-AdvanceTime lives there, `loadConfig_`/`advanceWorldTime_` :908–960) — the ledger range intent (963 rows × ~50 columns) is the bulk; measure its serialized size on the bench before fixing `checkpointSaveMs`. Then the fire record moves to a new state `checkpointed` and the run returns with zero sheet writes beyond the tab and the record.
3. **Auto-resume** (Mike-direct, not a manual gate): at checkpoint time the script creates a one-shot time-based trigger on `resumeWorldCycle` (`ScriptApp.newTrigger(...).timeBased().after(60 * 1000)` — the precedent is `phase10-persistence/cycleExportAutomation.js:466`, so the trigger scope is already granted). `resumeWorldCycle` takes the script lock, reads the journal, refuses unless `state === 'pending'` and `cycle === cycleCount + 1`, rebuilds a minimal ctx (ss, cache, config, `summary.cycleId`, `writeIntents` from the chunks — plus the one piece of Phase 1–9 state Phase 11 reads: `S.businessClosures` for `archiveClosedBusinesses_` (`applyBusinessDynamics.js:734`); `archiveCitizenExits_`, `maintainLifeHistoryLog_` and `processMediaIntake_` read only `cycleId` / the sheets — checked 2026-10-04), runs Phase10-ExecuteIntents through the Task 5 dedup path, then Phase 11 and the end-of-cycle `ctx.cache.flush()` (`godWorldEngine2.js:842`, where the `cycleCount` bump lands; `repairCycleCount_` :1030 already covers a lost counter), marks the journal `committed`, clears the chunk rows, closes the fire record `done`, and deletes its own trigger. A resume that dies mid-commit leaves `pending` + a partial commit; the next resume (or the next hand fire) sees `pending`, engages dedup on appends (Task 5 §1–2) and re-runs Phase 10 from the saved intents — safe by Task 5's table.
4. **engine.275 integration.** `admitCycleFire_` refuses a new Cycle while the journal is `pending` (the message names the resume, not "fire again"); `checkpointed` is a legal fire-record state between `running` and `done`; the web trigger's `expect` stays the cycleCount before the Cycle; the resume carries the journal's cycle, never `expect`.
5. **The fallback is the old behaviour.** If the checkpoint write itself fails, log `Phase9-Checkpoint` to Engine_Errors and run the tail anyway — the guard must never be the thing that loses a Cycle. Clean-stop + alarm stays the fallback if the guard itself fails (Mike-direct).
6. **Task 5 in the same build.** Append intents carry `(cycle, rowHash)` (`computeShortHash_`, the Engine_Errors precedent); the executor skips rows whose hash is already on the target tab for that cycle; the journal row is written before Phase 10 and after it in every fire, checkpointed or not — one tab, one mechanism for resume and for re-run.

Bench plan: set `wallBudgetMs` to 1 on the bench so every fire takes the checkpoint path; let the trigger resume it; compare the resumed Cycle's tabs with a normal fire of the same seed (byte-equal save timestamps); then kill a resume mid-Phase-10 by hand (a `wallBudgetMs` tuned to fall inside the commit) and prove the re-run lands zero duplicate rows. Builder's three numbers and the go are the gate (§Status).

**Builder's words (2026-10-07) — Task 4 go:** asked for the go and the three numbers (total budget 330 s, tail reserve 60 s, checkpoint save measured on the bench before it is set). **Verbatim:** "i agree, go with those numbers". **Reading:** build Task 4 + Task 5 as designed; `wallBudgetMs` 330000, `tailReserveMs` 60000, `checkpointSaveMs` from the bench's first checkpoint fire.

**Task 4 + 5 design — Revision 1 (engine-sheet, 2026-10-08), after codex Review 1 (`docs/for-claude-review/2026-10-08-codex-engine95-design.md`, HOLD: 6 BLOCK / 3 FIX / 1 NOTE). The builder's numbers stand (330000 / 60000 / measured). The mechanism below replaces the 2026-10-04 design; nothing above it is built.**

What Review 1 proved, each verified against HEAD this session:

- "After Phase 9" is not an intent-only boundary. Twenty Phase-10 producer phases write direct between `Phase9-FinalizeCycleState` and `Phase10-ExecuteIntents` (`phase01-config/godWorldEngine2.js:772–813` / `:815`), and the ledger's range intent is only created by `Phase10-CommitLedger` (`:813`, `phase10-persistence/commitSimulationLedger.js:25`). The queue is `ctx.persist.{replaceOps,updates,logs}` (`utilities/writeIntents.js:46`); `ctx.writeIntents` does not exist.
- Phases 3 and 5 write direct too (World_Population 3 cells `phase03-population/applyDemographicDrift.js:387`; Household savings `phase05-citizens/casinoLedgerEngine.js:873`; both `SHEETS_MANIFEST` §9 own-tab). A kill in Phases 1–9 re-runs the same seed over slightly moved inputs — today's behaviour, not changed by this build.
- The executor swallows failures: errors collected in `stats.errors`, every queue cleared regardless (`phase10-persistence/persistenceExecutor.js:177`), and the runner discards the return (`godWorldEngine2.js:815`). "Committed" has no signal today.
- The fire record: `FIRE_STATES` `:236`; the shape check allows a missing `finishedMs` only for `running` (`:300`); both `finally` blocks flush, repair the counter and close (`:837`, `:425`).
- Phase 11 draws no RNG (grep of the four Phase-11 files, 0 hits). The cache's queues are closures with no export (`utilities/sheetCache.js:330`).
- Bench C115 (2026-09-20, 132 phases, `output/engine-sheet/2026-09-20-bench-c115-fire.json`): Phases 1–9 78.8 s · Phase-10 producers 6.8 s · executor 12.8 s · Phase 11 31.3 s. The Cycle has since grown to 190–237 s on 1004 (DEPLOY.md pointer); the growth is in 1–9 and the trim. The commit tail is ~45–50 s.

The mechanism, revised (eleven parts):

1. **The gate sits at the commit boundary** — after `Phase10-CommitLedger`, before `Phase10-ExecuteIntents`, inline runner only (`runCyclePhases_` is dry-run/replay with writes suppressed: no gate). Every producer has written by then; what remains is the executor, the four Phase-11 phases, the cache flush, the counter verify and the close. That is the tail the 60 s reserve was sized for.
2. **Three branches, all three numbers.** E = elapsed since `fire.admission.startedMs` (also record elapsed since function entry — admission is stamped after lock + open). B = `wallBudgetMs`, T = `tailReserveMs`, C = `checkpointSaveMs`. E + T ≤ B → run the tail as today. Else E + C ≤ B → checkpoint (part 4). Else → the save is attempted anyway, with the manifest's `late` flag set: by part 4's ordering a save the wall kills leaves exactly the half-written world a stop would (the producers have landed Cycle N's rows, the counter is still N−1), and a save that completes keeps the Cycle. Stop + alarm — Engine_Errors `Phase10-Checkpoint` row, fire record `failed` naming the producer tabs that already wrote — is reserved for a save that **throws**; that is the builder's fallback for the guard failing, not for the arithmetic saying no. Recovery from a failed save is the same hand recovery as a wall kill today (clear the record, fire again; the producer tabs carry Cycle N twice) — named, not hidden. **Arming:** the gate runs only when all three keys are nonzero; the keys self-arm at 330000 / 60000 / 0 and C is set by hand from the bench measurement. Until then PROD behaves exactly as today, and a push before C is set certifies nothing about the gate.
3. **The payload is what the resume needs and nothing else.** `ctx.persist` (three queues, saved in the executor's persisted form — padding and the LifeHistory stamp normalization applied at save time, so saved = written); the cache's queues (new `exportQueues()` / `importQueues()` on `sheetCache.js`, plain arrays); `ctx.config` post-AdvanceTime (cycleCount = N); the Phase-11 summary scalars — `cycle`, `cycleRef`, `absoluteCycle`, `cycleId`, `season`, `holiday`, `holidayPriority`, `isFirstFriday`, `isCreationDay`, `sportsSeason`, `simMonth`, `month`, `simYear`, `businessClosures`, `engineErrorCount`, `auditIssues`; the completed `phaseTimings` array; the fire admission. `ctx.ledger` is not saved: the resume reloads it from the sheet after the executor lands the range intent (`phase01-config/initSimulationLedger.js:48`) — that is what BusinessArchive's employee check and MediaIntake read. Dates serialize as `{"$d": iso}`; everything else is JSON. Measure the serialized size on the bench's first forced checkpoint; that measurement is C. Contingency if C comes back large: the ledger's range intent is the bulk of the payload, and landing that one fixed-address range before the save (it is address-fixed and re-applicable) shrinks the payload roughly tenfold without changing the state model — named here, not taken now.
4. **Save ordering on `_CycleCheckpoint`** (hidden; created by hand on each target before the push, Judicial_Ledger precedent; never at runtime). Chunks first (rows 2..n, ≤45,000 chars, each `{gen, i, n, data}`), then the manifest in row 1 last — `{gen, cycle, state:'ready', n, bytes, sha, build, startedMs, elapsedMs, savedMs, done:[]}` — then the fire record → `checkpointed` (a legal state with `finishedMs` undefined), then the one-shot trigger. A manifest whose state is not `ready`, or whose chunk count or digest does not match, is no checkpoint. A kill between the manifest and the trigger is recoverable: `admitCycleFire_` reads the manifest **before** its stale-record and guard-window tests (a `running` record with no finish would otherwise be admitted again after `fireGuardMinutes`, and Cycle N would run twice over a `ready` checkpoint). A `ready` manifest turns that fire into the resume, inline, under the lock it already holds — never a new Cycle; the web response carries `state:'resumed'` and the final result.
5. **Checkpoint exit.** `runWorldCycleLocked_` returns a `{checkpointed:true, gen}` outcome; both `finally` blocks test it and skip the flush, the counter repair and the close; the lock releases normally. The web response carries `state:'checkpointed'` and `gen`; `ok` stays true (admitted and saved). The bench tooling reads the final result from the manifest after the resume.
6. **Resume.** `resumeWorldCycle()` runs from `ScriptApp.newTrigger('resumeWorldCycle').timeBased().after(60000)` (precedent `phase10-persistence/cycleExportAutomation.js:466`): script lock; read the manifest; refuse unless `state === 'ready'` and `World_Config.cycleCount` ∈ {N−1, N} (N−1 = flush not landed; N = flush landed, close did not); rebuild ctx — ss, cache with imported queues, config, the summary scalars, persist, phaseTimings, fire; run ExecuteIntents in resume mode (part 7), reload the ledger, Phase 11 ×4, cache flush, `verifyCycleCountPersisted_`, emit the merged timings (the saved entries plus the five resumed = one logical entry per scheduled phase, the 131-phase convention; save/wait/resume overhead goes in the manifest, not the phase sum), manifest → `committed`, chunks cleared, fire record → `done` (or `unpersisted` on a commit problem), delete only the trigger whose handler is `resumeWorldCycle`. The resume's own budget runs from its own start. Two resume attempts; the third refusal alarms. Never through `admitCycleFire_`.
7. **Dedup — resume mode only (Task 5).** In resume mode the executor runs its three loops (replaceOps → updates → logs) and appends a `(loop, sheet)` receipt to the manifest's `done` list after each sheet's intents in that loop land — one sheet can appear in all three loops, so a per-sheet receipt would skip a later loop's rows. The four Phase-11 phase names join the same list as each completes, so a resume that dies in CitizenArchive does not re-run BusinessArchive's copy-then-delete (engine.285's hazards are not re-opened by this build's own retry). A second resume skips every receipted item. For an unreceipted sheet with batch appends it first reads the sheet's last k rows (k = batch length) with `getValues` (typed) and compares them to the padded and normalized batch after both sides pass the same canonicalization (Dates → iso, blank → '', numbers as numbers); equal → the batch landed, skip and list. Zero extra reads on a normal fire. Exact, because the saved payload is the persisted form and the stream is deterministic. Cell, range and replace intents are address-fixed and re-applied (safe while row layout is unchanged — and nothing between the executor and the archives changes layout). No new columns on any tab.
8. **The executor's silence (Review 1 F8), in scope.** The runner reads `ctx.persist.executionStats.errors` after `Phase10-ExecuteIntents` and sets `fire.commitProblem` when non-empty — the path the cache flush already uses (`godWorldEngine2.js:848`) — so `done` vs `unpersisted` means what it says on every fire, checkpointed or not. The line between tolerated and failed: a simulation-phase error caught by `safePhaseCall_` stays tolerated (an Engine_Errors row, the Cycle continues); an entry in the executor's `stats.errors` is a required write that did not land, and the record names the sheet. An `unpersisted` record does not brick the next fire: admission refuses only when the prior record's Cycle ≥ the target (`godWorldEngine2.js:310`), and the counter has advanced, so Cycle N+1 admits with the record's warning in the notes.
9. **Writer location + manifest.** The writer, reader and validator live in `phase10-persistence/cycleCheckpoint.js`; the runner calls them. `SHEETS_MANIFEST` §9 gains a row, class `checkpoint`, naming the pre-executor write, the resume writes and the cleanup. Pre-commit does not gate this (it checks canon-leak, civic refusal and script exit codes — `.githooks/pre-commit:94,102,114`); the manifest row is the rule.
10. **Scope.** `appsscript.json` lists no `oauthScopes`, so the trigger scope is inferred from the code. The deployer on both the bench and PROD is the builder (DEPLOY.md: authorization set by the builder), so the new scope is **a builder step, not an outcome**: Mike re-authorizes from the editor on the bench before bench step 2 and on PROD before the push; until he does, the first forced checkpoint fails at `newTrigger` and the manifest stays `ready` (the next fire resumes inline by part 4). Written into the bench plan and the §PROD expectation with his name on it.
11. **Out of scope, filed as engine.285.** The Phase-11 intra-phase kill hazards Review 1 surfaced are hazards on every fire today and this build only shrinks their exposure (a ~50 s tail under a fresh 360 s wall): LifeHistory trim clears the source before rewriting retained rows (`utilities/archiveLifeHistory.js:207–221`); BusinessArchive copies then deletes without a copy identity (`phase05-citizens/applyBusinessDynamics.js:779–783`); CitizenArchive's existing-copy check skips the source removal (`utilities/archiveCitizenExits.js:205`); MediaIntake marks rows processed before writing their outputs (`phase07-evening-media/mediaRoomIntake.js:241–336`); ensure-tab inserts then writes the header (`persistenceExecutor.js:254–256`); the batch-append retry recomputes the tail inside the retry while `appendRowWithRetry_` fixes the address (`:439` vs `:217`).

Bench plan, revised (SANDBOX 1004, resynced from live C110 first):

1. Normal fire → tabs exported (baseline A).
2. **Prerequisite: Mike re-authorizes the bench script from the editor (new trigger scope).** Resync. World_Config `checkpointForce` 1 (bench-only key, default 0, read only at the gate) → the checkpoint branch; C read from the manifest's `savedMs`; the trigger resumes; tabs exported (B). Diff A vs B: every tab the tail writes byte-equal (typed values, row counts), 131 logical phases in the merged timings. The seed is the cycleId (`utilities/cycleModes.js:188–201`), so two fires from one resync run the same stream; the diff's exclusion list is the wall-clock cells only — WorldEvents_Ledger's stamp (`recordWorldEventsv25.js:45`), Citizen_Archive's stamp (`archiveCitizenExits.js:284`), the media paste sheet's A1 (`mediaRoomIntake.js:1272`), the cycle state's `cycleFinalizedAt` (`finalizeCycleState.js:203`). Anything else that differs is a finding.
3. Resync. `checkpointForce` 1 + `checkpointKillAfterSheet` k (bench-only, resume mode only): the first resume throws after sheet k; re-arm; the second resume lands zero duplicate rows (row counts vs A; the `done` list). Then k inside a batch-append sheet.
4. `checkpointForce` 2 → the late branch (save attempted with `late` set); `checkpointForce` 3 → the save throws (bench-only fault): record `failed` naming the producer tabs, Engine_Errors row, next fire refused until cleared. Then a kill between manifest and trigger (`checkpointForce` 4: return before `newTrigger`): the next hand fire must resume inline and return the final result.
5. Set `checkpointSaveMs` = measured C × 1.5, `checkpointForce` 0; two clean fires; timings on the record.

Review 2 (codex) on this revision before any code.

---

## Open questions

- [x] ~~Does cycle-duration data already exist anywhere?~~ **RESOLVED 2026-07-31 (Task 1): No.** Engine_Errors has no duration column, the completion summary is Logger-only error counts, dashboard session-events are harness hooks not engine cycles. Task 3 needs new collection.
- [x] ~~Checkpoint store: `PropertiesService` vs a hidden sheet tab vs Drive file~~ **RESOLVED 2026-07-31 (Mike-direct): hidden Sheet tab** (e.g. `_CycleCheckpoint`) — roomy, same permissions/plumbing, human-inspectable for debugging. Design constraints from the decision: (a) the guard threshold must reserve Phase 10+11 tail time **plus checkpoint-save time** (est. 10–30s for ~48k-cell ctx.ledger + queued intents — measure real Ctx size first); (b) resume run must identify itself as a resume, skip completed phases, and clean the checkpoint tab after success so a later crash can't double-resume a stale save. **Auto-resume over manual gate: also Mike-direct same day** (clean-stop + alarm rejected as the primary; it remains the natural fallback if the guard itself fails). Threshold: computed from live timing data (Task 2 instrumentation), not a fixed guess.

---

## Changelog

- 2026-10-08 (engine-sheet, S541) — codex Review 1 HOLD (6 BLOCK): the 2026-10-04 gate was not an intent-only boundary. Revision 1 written (§Build notes): gate at the commit boundary, payload = persist + cache queues + Phase-11 scalars, resume-mode-only tail-match dedup, executor errors reach the fire record; Phase-11 intra-phase hazards filed as engine.285. Codex Review 2 before code.
- 2026-10-07 (engine-sheet, S536) — Builder go on Task 4/5 with wallBudgetMs 330000, tailReserveMs 60000, checkpointSaveMs measured on the bench (verbatim above §Open questions). ROLLOUT engine.95 → section 4, ready.

- 2026-10-04 (engine-sheet, overnight) — Task 4 design written (§Build notes): gate before Phase 10 on three World_Config numbers, intents to `_CycleCheckpoint`, trigger resumes the tail with Task 5 dedup; timing refreshed. Build waits on the builder.
- 2026-07-31 — Initial draft (Kimi CLI, builder-directed external-audit remediation batch). Audit gaps #5+#6 combined (both are Sheets/Apps-Script platform-ceiling concerns). Audit's "time bomb" framing tempered by the verified writes-confined-to-Phase-10 safety property; the real exposure is Phase 10 mid-commit and the absence of any wall-distance measurement.
- 2026-08-01 (Kimi) — Audit pointer added: build-order step 1 of [[../research/2026-08-01-simulation-realism-audit]] — Task 4 checkpoint/resume is the platform prerequisite for every heavy engine addition (incl. engine.96).
