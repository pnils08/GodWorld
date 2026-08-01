---
title: Platform Ceiling Resilience Plan (Cycle Runtime + Sheets Migration)
created: 2026-07-31
updated: 2026-08-01
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
- **Status:** [~] DECISIONS LOCKED 2026-07-31 (Mike-direct): auto-resume (not manual gate), hidden-tab checkpoint store, threshold computed from live timing data. Design write-up + build handed to engine-sheet with constraints in Open questions resolution below; input numbers ready (Task 3 baseline: tail = Phase10 15.4s + Phase11 19.1s mean, 18.3/23.8 max).

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

---

## Open questions

- [x] ~~Does cycle-duration data already exist anywhere?~~ **RESOLVED 2026-07-31 (Task 1): No.** Engine_Errors has no duration column, the completion summary is Logger-only error counts, dashboard session-events are harness hooks not engine cycles. Task 3 needs new collection.
- [x] ~~Checkpoint store: `PropertiesService` vs a hidden sheet tab vs Drive file~~ **RESOLVED 2026-07-31 (Mike-direct): hidden Sheet tab** (e.g. `_CycleCheckpoint`) — roomy, same permissions/plumbing, human-inspectable for debugging. Design constraints from the decision: (a) the guard threshold must reserve Phase 10+11 tail time **plus checkpoint-save time** (est. 10–30s for ~48k-cell ctx.ledger + queued intents — measure real Ctx size first); (b) resume run must identify itself as a resume, skip completed phases, and clean the checkpoint tab after success so a later crash can't double-resume a stale save. **Auto-resume over manual gate: also Mike-direct same day** (clean-stop + alarm rejected as the primary; it remains the natural fallback if the guard itself fails). Threshold: computed from live timing data (Task 2 instrumentation), not a fixed guess.

---

## Changelog

- 2026-07-31 — Initial draft (Kimi CLI, builder-directed external-audit remediation batch). Audit gaps #5+#6 combined (both are Sheets/Apps-Script platform-ceiling concerns). Audit's "time bomb" framing tempered by the verified writes-confined-to-Phase-10 safety property; the real exposure is Phase 10 mid-commit and the absence of any wall-distance measurement.
- 2026-08-01 (Kimi) — Audit pointer added: build-order step 1 of [[../research/2026-08-01-simulation-realism-audit]] — Task 4 checkpoint/resume is the platform prerequisite for every heavy engine addition (incl. engine.96).
