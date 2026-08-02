---
title: Business Lifecycle Generator Plan
created: 2026-08-01
updated: 2026-08-01
type: plan
tags: [engine, economy, citizens, media, active]
sources:
  - docs/research/2026-08-01-simulation-realism-audit.md — verdict adopt, build-order item 6 (the one genuinely undesigned gap); builder approved the row 2026-08-01
  - docs/plans/BACKLOG.md §27.10 (negative feedback loops, HIGH, Grok review S139) and §27.7 (delayed-fuse seeds, adjacency)
  - phase05-citizens/applyChaosDecay.js — the only existing per-cycle Business_Ledger economic writer (pattern to copy)
  - phase05-citizens/runCareerEngine.js v2.6/v2.7 — Employee_Count write-back + rehire matcher; reads Growth_Rate as the hiring signal (:1081-1082)
  - scripts/ingestPublishedEntities.js economicSeedForSector() — mint-time seeding; Growth_Rate is never written again after mint
  - docs/research/godworld_city_functions_analysis_2026-04-20.pdf — Phase 43 city-functions analysis (5-domain priority order)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout (engine.96)"
  - "[[../research/2026-08-01-simulation-realism-audit]] — research basis; this plan is build-order item 6"
  - "[[2026-07-27-employment-living-system]] — engine.85, business BIRTH (mint) stays there; this plan owns decline/death"
  - "[[2026-07-31-citizen-memory-perception]] — engine.94 Track A owns the scandal-ceiling slice of 27.10; not duplicated here"
  - "[[../research/2026-07-29-citizen-archive]] — the Citizen_Archive pattern this plan mirrors for businesses (builder-generalized to all sim exits 2026-08-01)"
  - "[[2026-07-31-platform-ceiling-resilience]] — engine.95 Task 4 (checkpoint/resume) is the platform prerequisite for heavy engine additions"
  - "[[SCHEMA]] — doc conventions"
  - "[[../index]] — registered same commit"
---

# Business Lifecycle Generator Plan

**Goal:** Businesses in `Business_Ledger` live on a per-cycle economic trajectory — `Growth_Rate` and `Annual_Revenue` drift with city state, sustained decline produces layoffs through the existing career-engine path, and terminal decline produces a closure the newsroom can report — so success has consequences and no economic figure stays mint-static.

**Architecture:** One new per-cycle evaluator, `phase05-citizens/applyBusinessDynamics.js`, modeled on `applyChaosDecay.js` (the only existing per-cycle `Business_Ledger` economic writer: reads the sheet directly, queues cell intents via `queueCellIntent_`, fails loud on missing columns). It drifts `Growth_Rate`/`Annual_Revenue` from city state plus tunable thresholds (`utilities/businessDynamicsConfig.js`), routes decline into the *existing* layoff/rehire machinery (`runCareerEngine` businessDeltas → Phase-6 `economicRippleEngine` narration), and emits closure events into `worldEvents` for the desks. Birth is explicitly out of scope: engine.85 Task 8 already mints businesses economically alive. Scandal ceilings are explicitly out of scope: engine.94 Track A owns that slice of BACKLOG 27.10. This plan owns the remaining 27.10 items — business death, outside-investment disruption, success-pressure coupling — the audit's one genuinely undesigned gap.

**Terminal:** Design + config research-build → engine code engine-sheet.

**Sequencing (audit build order):** after engine.83/84 (reconciliation — kills the static-economy bug class this extends), engine.93, engine.94 Track A, and engine.85 (hire/fire write-back — this plan's decline path rides it). engine.95 Task 4 (checkpoint/resume) is the platform prerequisite for any heavy engine addition; this plan's per-cycle pass must be measured against the engine.95 instrumentation before deploy.

**Acceptance criteria:**
1. Every `Business_Ledger` row's `Growth_Rate` and `Annual_Revenue` move per cycle from city state — no value stays mint-static. Bench output is deterministic (seeded, no wall-clock).
2. A business pushed into sustained decline sheds headcount through the *existing* `runCareerEngine`/`economicRippleEngine` path — this plan adds no second headcount writer.
3. A business crossing the closure threshold emits a `worldEvents` closure event the desks can report, and its workers enter the existing rehire matcher as unemployed (a lived state), not deletion.
4. The pass's cycle-time cost is measured against engine.95's per-phase instrumentation and documented in this plan's changelog before deploy.

---

## Tasks

### Task 1: Establish the layoff-trigger contract (read-only)

- **Files:**
  - `phase05-citizens/runCareerEngine.js` — read (:1050-1290, the v2.6 write-back + v2.7 matcher)
  - `docs/research/2026-07-27-employment-as-a-living-system.md` — read (the layoff/businessDeltas design)
- **Steps:**
  1. Determine exactly what causes `runCareerEngine` to emit a layoff today. Specifically: does a negative `Growth_Rate` on a `Business_Ledger` row already produce layoffs via the openings formula (:1081-1082), or is an explicit decline signal required?
  2. Record the answer as a comment block at the head of the new config file (Task 3) — Task 6's shape depends on it.
- **Verify:** the answer is written down with a `runCareerEngine.js` line reference; if negative growth already lays off, Task 6 shrinks to "write the drifted value and let the existing engine fire."
- **Status:** [ ] not started

### Task 2: Extract the writer pattern (read-only)

- **Files:**
  - `phase05-citizens/applyChaosDecay.js` — read (whole file; the queueCellIntent_ pattern for Business_Ledger)
  - `phase05-citizens/applyChaosDecay.test.js` — read (the bench harness shape: fake sheet, header row, intent assertions)
- **Steps:**
  1. Note the exact call signature of `queueCellIntent_` for `Business_Ledger` cells and the fail-loud header check (`applyChaosDecay.js:82` throws on missing trimmed columns — copy this behavior).
  2. Confirm where `applyChaosDecay_` is invoked in the cycle (which phase calls it) so the new pass lands adjacently.
- **Verify:** invocation site identified by file:line.
- **Status:** [ ] not started

### Task 3: Thresholds config (design — research-build, Mike review)

- **Files:**
  - `utilities/businessDynamicsConfig.js` — create
- **Steps:**
  1. Define tunables per BACKLOG 27.10: drift bounds per sector class (reuse `economicSeedForSector()`'s 9 keyword classes in `scripts/ingestPublishedEntities.js:812+`), decline-streak length before layoffs, closure threshold (e.g. N consecutive cycles of negative drift AND revenue below floor), success-pressure modifiers (sustained high growth/prosperity attracts disruption: incumbent drift penalty when neighborhood prosperity indicators stay high for 3+ cycles).
  2. Canon constraint (CLAUDE.md prosperity-era doctrine): modifiers are *consequences of success*, never imported recession cynicism. State this in the file header.
  3. Include the Task 1 layoff-contract finding as a header comment.
- **Verify:** `node --check utilities/businessDynamicsConfig.js` clean; Mike signs off on threshold defaults before Task 5.
- **Status:** [ ] not started

### Task 4: Live-state calibration pull (approved Sheets read)

- **Files:**
  - none modified — an approved read-only pull (dashboard API or approved script)
- **Steps:**
  1. Pull current `Business_Ledger` economic columns and recent approval/prosperity trend data.
  2. Use it to sanity-check Task 3 defaults against live distributions (shared with engine.94 Open question 1 — one pull serves both plans).
- **Verify:** distributions recorded in this plan's changelog; defaults adjusted or confirmed.
- **Status:** [x] DONE 2026-08-01 (Kimi, builder-approved pull). Dashboard API is session-gated (401 without login — credentials not inspected per policy); pull ran over the derived-card layer (MCP world-data) + on-disk world summaries instead, which proved decisive:
  - **Growth_Rate is uniform and static in live data**: 6/6 sampled businesses (OPD BIZ-00024, Oakland Athletics BIZ-00005, SpeedyBurger BIZ-00051, Oakland Tech Collective BIZ-00030, Green & Gold Tavern BIZ-00041, Marigold Cafe BIZ-00068) all read exactly 8% (wd-business cards built 2026-07-17 from the live ledger). Matches the code finding (no post-mint writer) and confirms Task 3's drift bounds must assume every legacy row starts at the same value.
  - **Approval trend C92–C99** (`output/world_summary_c{92..99}.md`): Mayor 78→88→93→95→95 (monotonic, pinned at 95), D1 Carter 72→94, OPP cohort rising; CRC/IND seats −1/cycle to 58–59. Sustained-prosperity trigger for the success-pressure modifiers is real for the governing faction; design detail recorded in [[2026-07-31-citizen-memory-perception]] Open question 1.
  - **Neighborhood sentiment hovers near zero** (San Antonio −0.01, Eastlake +0.01) while retail vitality varies (Grand Lake 9.27 vs San Antonio 6.13) — vitality, not sentiment, is the livelier per-hood prosperity input for the drift pass.

### Task 5: Drift pass implementation (engine-sheet)

- **Files:**
  - `phase05-citizens/applyBusinessDynamics.js` — create
  - phase invocation site from Task 2 step 2 — modify (add the call)
- **Steps:**
  1. Read `Business_Ledger` directly (chaos-decay pattern); per row, compute drifted `Growth_Rate` and `Annual_Revenue` from config + city state inputs available in `ctx` (verify which state objects exist at that phase — candidates: neighborhood prosperity/sentiment from Phase 3, `S.weather`/seasonal weights, initiative effects after engine.93 lands).
  2. Queue cell intents via `queueCellIntent_`; never write directly. Fail loud on missing trimmed columns (copy `applyChaosDecay.js:82`).
  3. Deterministic only: seed from cycle + BIZ_ID hash, no `Math.random()` without seed, no wall-clock.
- **Verify:** `node --check` clean; bench (Task 9) shows every row's values move and re-running with the same seed reproduces identical output.
- **Status:** [ ] not started

### Task 6: Decline → layoff wiring (engine-sheet)

- **Files:**
  - `phase05-citizens/applyBusinessDynamics.js` — modify
  - possibly `phase05-citizens/runCareerEngine.js` — modify (only if Task 1 shows an explicit signal is required)
- **Steps:**
  1. If Task 1 found negative `Growth_Rate` already lays off: nothing to wire — the drifted write (Task 5) is the whole mechanism; document that and skip to Task 7.
  2. Otherwise: emit decline records into the existing `careerSignals.businessDeltas` shape so the v2.6 write-back and Phase-6 ripple narration consume them unchanged. Do not build a second headcount writer.
- **Verify:** bench: force a business into decline streak; its `Employee_Count` falls via the existing write-back and a ripple narration row references it.
- **Status:** [ ] not started

### Task 7: Closure mechanic (engine-sheet)

- **Files:**
  - `phase05-citizens/applyBusinessDynamics.js` — modify
  - `docs/SPREADSHEET.md` — modify (Business_Ledger row, same commit, if the schema changes)
- **Steps:**
  1. Closure representation RESOLVED 2026-08-01 (Mike): a closure ledger — `Business_Archive`, mirroring the adopted `Citizen_Archive` pattern ([[../research/2026-07-29-citizen-archive]]): full-row snapshot + exit metadata (`ArchiveReason=closed`, `ExitCycle`, `SourceEventId`), copy-verify-remove, BIZ-IDs permanent and never reissued. Mike generalized the principle: every sim exit (death, traded, closed business) lands on an archive ledger; the ledger enforces ID non-reuse. WARNING — the POPID max-id hazard documented in that research applies to BIZ-IDs too: `phase05-citizens/generationalWealthEngine.js:1499` mints from a lazy max-id read over the active sheet, which breaks the moment rows move out. BIZ-ID allocation must read active + archive (or a persisted high-water mark) BEFORE the first archive move ships; verify this in this task, not after.
  2. In-cycle marking: on threshold cross, zero the headcount through the existing layoff path (workers become unemployed — the v2.7 matcher already treats the freshly fired as waiting a cycle, a lived state) and push a closure event into `worldEvents` with business name, neighborhood, and sector so desks can report it (E95/E98/E101 symptom sample showed the newsroom has almost no closure material — this is the fix). No Status column needed: a zero-headcount row fails every capacity check, so hiring pools skip it same-cycle with no schema change.
  3. Post-commit move: at the verified post-commit finalization point (the citizen-archive movement protocol — never mid-cycle while consumers hold `ctx`), append the full `Business_Ledger` row + exit metadata to `Business_Archive`, read back and verify by BIZ-ID, then remove the active row. Document the new tab in `docs/SPREADSHEET.md` in the same commit.
- **Verify:** bench: threshold-crossed business drains headcount via the existing path, closure event present in `worldEvents`, archive append → read-back → active-row remove protocol runs clean, pool rebuild excludes it, and the BIZ-ID allocator provably does not reissue the freed number.
- **Status:** [ ] not started

### Task 8: Success-pressure coupling (27.10 remainder)

- **Files:**
  - `phase05-citizens/applyBusinessDynamics.js` — modify
  - `utilities/businessDynamicsConfig.js` — modify (modifier values)
- **Steps:**
  1. Wire the Task 3 success-pressure modifiers into the drift computation: sustained neighborhood prosperity (3+ cycles) applies competitive-pressure drift penalty to incumbent high-growth businesses; outside-investment disruption probability rises with sustained city-wide growth.
  2. Thresholds stay probabilistic and tunable per 27.10 — "correction isn't guaranteed but becomes increasingly likely."
- **Verify:** bench: a sustained-prosperity fixture measurably increases incumbent drift penalty vs a flat-prosperity fixture.
- **Status:** [ ] not started

### Task 9: Tests + bench + cycle-time measurement

- **Files:**
  - `phase05-citizens/applyBusinessDynamics.test.js` — create (copy `applyChaosDecay.test.js` harness shape)
- **Steps:**
  1. Cover: drift determinism, decline-streak → layoff path, closure threshold → event + pool exclusion, success-pressure modifier on/off, fail-loud on missing columns.
  2. Run the pass under engine.95's per-phase instrumentation; record cycle-time cost in this plan's changelog.
- **Verify:** `node phase05-citizens/applyBusinessDynamics.test.js` green; timing recorded; `git diff --check` clean.
- **Status:** [ ] not started

---

## Open questions

- [x] **Closure representation** — RESOLVED 2026-08-01 (Mike): a closure ledger. `Business_Archive` mirrors `Citizen_Archive`; full-row snapshot + exit metadata; BIZ-IDs never reissued. Mike's general principle: any sim exit (death, traded, closed business) lands on an archive ledger. Detail in Task 7.
- [ ] **Phase placement** — 27.10 says "Phase 2 or Phase 3"; the writer pattern (`applyChaosDecay`) lives in Phase 5 beside the career engine it feeds. Task 2 step 2 produces the concrete invocation options; decide at Task 5. Blocks Task 5.
- [ ] **Golden-era confirmation** — does C91+ live data confirm the sustained-prosperity pattern 27.10 assumes? Shared with engine.94 Open question 1; gated on the Task 4 approved pull. Tunes thresholds, does not block the build.

---

## Changelog

- 2026-08-01 — Initial draft (Kimi CLI). Builder approved the new row from [[../research/2026-08-01-simulation-realism-audit]] build-order item 6. Scoped to the genuinely undesigned gap: business decline/death + 27.10 non-scandal counter-pressure. Birth stays engine.85, scandal ceilings stay engine.94 Track A. All mechanics routed through existing write-back/ripple machinery — no parallel writers.
- 2026-08-01 — Open question 1 RESOLVED (Mike): closure ledger. `Business_Archive` mirrors the adopted `Citizen_Archive` pattern; BIZ-IDs permanent. Mike generalized the archive-ledger principle to every sim exit (death, traded, closed business). Task 7 rewritten: in-cycle zero-headcount marking (no Status column needed), post-commit copy-verify-remove, BIZ-ID allocator hazard flagged (active-sheet max-id reads break once rows move out — same trap the citizen-archive research documented for POPIDs).
- 2026-08-01 — Task 4 DONE (builder-approved pull via derived cards + on-disk summaries; dashboard API is session-gated). Live data confirms the audit's core claims: Growth_Rate uniform 8% across all sampled businesses (static, matches "no post-mint writer"), golden-era approval pattern confirmed C92–C99 for the governing faction. Calibration notes in Task 4 status: drift bounds must assume all legacy rows start at 8%; retail vitality is a livelier per-hood prosperity input than sentiment.
