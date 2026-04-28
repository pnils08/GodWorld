---
title: Phase 42 — Writer Consolidation Plan
created: 2026-04-28
updated: 2026-04-28
type: plan
tags: [engine, infrastructure, architecture, draft]
sources:
  - docs/engine/tech_debt_audits/2026-04-15.md (S146 audit)
  - docs/engine/tech_debt_audits/2026-04-15.md §Changelog 2026-04-17 (Path 1 closeout — efficiency framing)
  - docs/engine/PHASE_42_INVENTORY.md (Phase 1 output, this session)
  - utilities/writeIntents.js (target API — 4 intent kinds + dryRun/replay)
  - phase10-persistence/persistenceExecutor.js (executor)
  - .claude/rules/engine.md (current exceptions list)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (ENGINE_REPAIR Row 8)"
  - "[[engine/PHASE_42_INVENTORY]] — Phase 1 inventory consumed by this plan"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered in same commit"
---

# Phase 42 — Writer Consolidation Plan

## Framing — efficiency, not correctness

The 2026-04-15 tech debt audit identified **38 undocumented direct-writer files / 197 call sites** outside `phase10-persistence/`. Path 1 closed S156 by adding all 38 files to the `engine.md` exceptions list with one-line justifications. Quote from the audit changelog (2026-04-17, S156):

> *"every file writes to an engine-owned tracking or intake tab consistent with the existing exceptions pattern (Engine_Errors, Simulation_Calendar, Riley_Digest, World_Population history, LifeHistory_Log, Simulation_Ledger citizen events, civic ledgers, media intake pipelines, health/continuity intake). **Zero were bugs.** All 38 added to `.claude/rules/engine.md` exceptions list with one-line justifications. **Path 2 (refactor-to-write-intents) remains a future phase for efficiency**; Path 1 closes the correctness question."*

This plan is Path 2. **No correctness defect is being fixed.** The work is architectural cleanup: shrink the exceptions list, route writes through the deterministic intent layer, unlock dryRun + replay benefits for engines that currently bypass them. Compared to photo pipeline rebuild (HIGH user-visible) and Perkins&Will scrub (HIGH regression risk), this is lower-priority by impact — and the inventory below makes a tiered stop-point explicit so cost can be capped at value-of-completion.

---

## Goal

Migrate the cycle-path direct-writers surfaced in [[engine/PHASE_42_INVENTORY]] to the `ctx.writeIntents` pattern, route through `executePersistIntents_` in Phase 10, and reduce the `engine.md` exceptions list to genuine carve-outs (Phase 1 engine core + schema-setup utilities).

**Scope (per Phase 1 inventory):**
- 37 files in scope (citizenFameTracker.js retired S184)
- 175 cycle-path direct-write sites
- 4 partially-migrated files (intents already dominate)
- 4 caller-passed-sheet helpers (signature change cascades)
- ~89 lazy-create signals (decision needed Phase 2)

**Tiered acceptance (explicit stop-points):**

| Stop point | Files | Sites | What this means |
|------------|-------|-------|-----------------|
| **B6 (Tier-1 except intake heavies)** | 29 | ~110 | 58% of audit scope migrated; 8 files / 65 sites parked as documented exceptions |
| **B7 (full close)** | 37 | 175 | All cycle-path writers on intents; exceptions list down to genuine carve-outs |

Mike calls B6 vs B7 after dryRun + replay diffs from B5/B6 land. Default expectation: **stop at B6** unless evidence is clean enough to justify the intake-heavy push.

---

## Why now / why not

**Why now:**
- Inventory locked + numbers fresh; no work on top of stale data
- Pattern proven (4 dual-pattern files in flight; ensure-tab utilities use it)
- dryRun + replay test harness already exists in API — finally usable as an engine-wide diff oracle
- Engine.md exceptions list is growing without an offsetting cleanup mechanism

**Why not (honest):**
- 175 site refactor in Apps Script with no Node test harness — live cycle is the test
- Each batch requires clasp deploy — cycle window risk accumulates
- Path 1 explicitly closed correctness; this is efficiency
- Higher-impact work parked (photo pipeline rebuild HIGH; Perkins&Will scrub HIGH)
- Tier-1 intake heavies (mediaRoomIntake 32 sites + lazy-create-heavy + caller-passed helpers) are the kind of refactor that surfaces edge cases nobody planned for

**Mitigation:** Tier-1 stop-point + per-batch dryRun verification + B7 deferred-by-default.

---

## Terminal split

- **Research-build owns Phases 1 + 2** (inventory + per-category decisions + verification regimen spec)
- **Engine-sheet owns Phases 3 + 4 + 5** (pattern-lock pilot + bulk migration + verify + cull exceptions)

Phase 1 DONE this session — see [[engine/PHASE_42_INVENTORY]]. Phase 2 (decisions) lands research-build before engine-sheet starts execution.

---

## Phase 1 — Inventory (research-build) — DONE S184

Output: [[engine/PHASE_42_INVENTORY]].

Delivered:
- Per-file table (D / I / L / CS / Lns) for all 37 files
- Tier-1 (top 6 / 101 sites = 58%) / Tier-2 (3 files / 18 sites) / Tier-3 (24 files / 47 sites)
- Dual-pattern partial migrations (4 files / 9 direct sites left)
- Caller-passed-sheet helpers (4 files)
- Read-state-then-write hazard spot-check (2 high-hazard sites flagged)
- Schema-setup carve-out candidates
- Recommended migration batch order (B0–B7)

---

## Phase 2 — Pattern lock + per-category decisions (research-build)

Per-category decisions to lock before engine-sheet starts. Each is a deliverable in `docs/engine/PHASE_42_PATTERNS.md` (research-build writes this; engine-sheet reads it as the source of truth for migrations).

### 2.1 — Schema-setup carve-out decision

Files where direct writes fire **outside** the cycle path (lazy-create headers, column-add migrations, default-fills): `bondPersistence.js` (3 sites confirmed), `migrationTrackingEngine.js` (likely), `seedRelationBondsv1.js` (likely), portions of `mediaRoomIntake.js` lazy-create, others surfaced during execution.

**Decision options:**
- **A.** Document new carve-out category in `engine.md` exceptions list: "schema-setup writes — lazy-create headers, column-add migrations, default-fill on column-add. Fire outside cycle path." Refactor only cycle-path writes.
- **B.** Add `queueEnsureTabIntent_(tab, headers)` API to writeIntents.js. Phase 1 ensures all required tabs at cycle start; cycle-path writers assume tab exists. Schema-setup direct writes go away entirely.

**Recommendation (research-build):** **A** — new carve-out. Reasoning: option B forces a phase01 ensure-tabs pass that runs every cycle (cost), centralizes a concern that's currently distributed (decentralization is a feature here), and the schema-setup writes fire <1× per spreadsheet lifetime so the architectural cleanup return is low. Carve-out is honest about the rule's actual shape.

**Decision deliverable:** Phase 2 produces explicit list of files + line numbers carved out as schema-setup. Targets ~5–8 files.

### 2.2 — Read-state-then-write hazard decision

Phase 1 flagged 2 high-hazard sites: `mediaRoomIntake.js:405` and `continuityNotesParser.js:90` use `getLastRow() + 1` to compute write addresses. If two writers in same phase append to the same tab via cell/range intents at computed addresses, the second's address reads pre-first-intent state → row collision.

**Decision options:**
- **A.** Force these sites to `queueAppendIntent_` / `queueBatchAppendIntent_` — executor handles positioning, no manual address computation. Migration-side fix, no API change.
- **B.** Add `flushIntentsForSheet_(ctx, tab)` helper — writer can force materialize-pending-intents before re-reading sheet state. API addition, opt-in.

**Recommendation (research-build):** **A**. Reasoning: option B preserves the unsafe pattern with a footgun safety; option A removes the hazard category. The 2 flagged sites are both append patterns where executor positioning is the right semantic anyway.

**Decision deliverable:** Phase 2 produces refactor-shape spec for both flagged sites. Engine-sheet executes during Tier-1 intake heavies.

### 2.3 — Caller-passed-sheet helper decision

4 files have `function fn(sheet, ...)` signatures. Refactor `(sheet, ...)` → `(ctx, tab, ...)` cascades to every caller.

**Decision options:**
- **A.** Refactor signatures + audit callers. Each helper file carries a caller-list comment block.
- **B.** Keep `(sheet, ...)` signature, callers continue passing direct sheet refs. Carve out as a documented helper category.

**Recommendation (research-build):** **A** for the 3 small files (updateCityTier, updateTrendTrajectory, updateMediaSpread — single-helper, tight caller scope). For mediaRoomIntake's 4 internal helpers (CS:4): same-file refactor, no external caller cascade — straightforward.

**Decision deliverable:** Phase 2 produces caller-list per file (`grep -rn "updateCityTier_(" phase*/`) and confirms cascade is bounded.

### 2.4 — dryRun + replay verification regimen

`executePersistIntents_` already supports `ctx.mode.dryRun = true` — intents are visible without writing. Plan uses this as the per-batch test harness.

**Per-batch gate (engine-sheet, every commit in Phase 4):**

1. **Pre-batch baseline:** run cycle in dryRun mode against current code; capture `getIntentSummary_(ctx)` output (totals by sheet + by domain + by kind) + intent count per writer.
2. **Apply batch:** make file edits, syntax-check, clasp push to sandbox project (or main project + immediate revert if smoke fails).
3. **Post-batch dryRun:** re-run cycle in dryRun; capture new `getIntentSummary_(ctx)`.
4. **Diff:** delta should be **+N intents from migrated writers, -N direct writes from migrated writers, zero change everywhere else**. Any unrelated drift = abort + rollback.
5. **Smoke test:** run live cycle (non-dryRun); confirm no errors, expected sheet writes land.
6. **Commit + clasp deploy** only if 4+5 green.

**Acceptance per batch:** dryRun summary diff matches expected scope. No regression in non-migrated writers. Live cycle clean.

**Decision deliverable:** Phase 2 produces `scripts/phase42VerifyBatch.js` — Node-side helper that runs cycle in dryRun, dumps `getIntentSummary` + per-writer counts, diffs against prior snapshot. Engine-sheet uses this as the per-batch gate.

### 2.5 — Pattern reference migrations

For each of 4 pattern categories, pick the smallest reference file from inventory + write its full before/after spec:

| Pattern | Reference file | Sites | Use as Phase 3 pilot? |
|---------|---------------|-------|------------------------|
| Pure cycle-path append | `runHouseholdEngine.js` (D:2 / L:0 / CS:0) | 2 | **Yes — B0 pilot** |
| Cell update | `updateCivicApprovalRatings.js` (D:1 / L:1) | 1 | No — has lazy-create wrinkle |
| Lazy-create + write | `applyEditionCoverageEffects.js` (D:1 / L:1) | 1 | No — schema-setup carve-out candidate |
| Caller-passed-sheet helper | `updateCityTier.js` (D:1 / L:1 / CS:1) | 1 | No — wait until B4 |

**Decision deliverable:** Phase 2 produces reference migration code (before/after diffs) for 5 patterns: pure-append, batch-append, single-cell, range-update, caller-passed-sheet helper.

---

## Phase 3 — Pattern-lock pilot (engine-sheet) — B0

Single commit, single file: `phase05-citizens/runHouseholdEngine.js`. 2 direct-write sites → 2 intents.

**Steps:**
1. Read Phase 2's reference migration for "pure cycle-path append"
2. Apply pattern to runHouseholdEngine.js
3. Run `scripts/phase42VerifyBatch.js` pre-edit (baseline) + post-edit (diff)
4. Verify diff = `+2 intents from runHouseholdEngine, -2 direct writes from runHouseholdEngine, 0 change elsewhere`
5. Live cycle smoke-test
6. Commit + clasp deploy

**Acceptance:** dryRun diff exactly matches expected. Live cycle runs clean. Engine.md exceptions list updated to remove runHouseholdEngine entry.

**This is the canary.** If B0 surfaces any unanticipated edge case, rework Phase 2 spec before B1.

---

## Phase 4 — Bulk migration (engine-sheet)

Per inventory's recommended batch order. Each batch = 1 commit + clasp deploy + per-batch verification gate.

| Batch | Files | Sites | Notes |
|-------|-------|-------|-------|
| **B1 — Dual-pattern finish-line** | 4 (generateGameModeMicroEvents, generateCivicModeEvents, generateMediaModeEvents, bondPersistence) | 9 (3 may carve-out as schema-setup) | Smallest surface; pattern in flight |
| **B2 — Pure cycle-path Tier-3** | 8 (run*Engine.js x4 + small low-L writers) | 15-20 | Mechanical migrations |
| **B3 — Schema-setup carve-out decisions** | up to 5 (migrationTrackingEngine, seedRelationBondsv1, others) | 5-8 | Apply Phase 2.1 decisions per-file |
| **B4 — Caller-passed-sheet helpers (small)** | 3 (updateCityTier, updateTrendTrajectory, updateMediaSpread) | 4 | Apply Phase 2.3 signature change |
| **B5 — Phase 1+2+3 mid writers** | 6 (godWorldEngine2, advanceSimulationCalendar, applyEditionCoverageEffects, finalizeWorldPopulation, generateMonthlyDriftReport, healthCauseIntake) | ~50 | Engine core; high-criticality. finalizeWorldPopulation alone is 27 sites — may warrant own commit |
| **B6 — Tier-1 culturalLedger** | 1 (culturalLedger.js) | 9 | No lazy-create; cleanest large migration |
| **STOP POINT** | — | — | **Mike call:** ship at B6 or push B7? |
| **B7 — Tier-1 intake heavies** | 4 (parseMediaRoomMarkdown, continuityNotesParser, processAdvancementIntake, mediaRoomIntake) | 65 | Each its own commit + cycle. mediaRoomIntake especially. Apply Phase 2.2 read-state-then-write fixes here. |

**Total estimated sessions:** 6–8 engine-sheet sessions.

**Per-batch deliverable:**
- Code edits
- `scripts/phase42VerifyBatch.js` output (pre + post + diff)
- Smoke-test cycle log
- Commit message with per-file site count + dryRun summary delta
- engine.md exceptions list updated to remove migrated entries

---

## Phase 5 — Verify + cull engine.md exceptions list (engine-sheet)

After final batch (B6 or B7):

1. **End-state /tech-debt-audit run** — expect "0 undocumented writers" or "N writers in documented carve-out categories" (schema-setup, caller-passed if any retained).
2. **engine.md exceptions list cull** — remove every migrated file's entry; retain only:
   - Phase 1 engine core (godWorldEngine2, advanceSimulationCalendar) — IF they migrated, remove
   - Schema-setup carve-out files (per Phase 2.1 decision)
   - Caller-passed-sheet helpers retained as `(sheet, ...)` (per Phase 2.3 decision, if any)
3. **Live cycle end-to-end** — C93+ runs clean, all expected sheet writes land, no regression in Phase 39 review or Phase 38 measurement.
4. **Mara C93 audit signal** — confirm no engine-state-drift findings traceable to migration.
5. **ROLLOUT_PLAN.md update:** ENGINE_REPAIR Row 8 → DONE; this plan changelog → DONE.

---

## Out of scope

- citizenFameTracker.js (retired S184)
- New write-intent kinds beyond cell/range/append/replace (existing 4 cover all current patterns)
- Phase 10 executor changes (handles all intent kinds correctly today)
- Test framework install (jest/vitest deferred until droplet headroom — see Bounded test surface ROLLOUT item)
- Adding new intent metadata fields beyond domain/reason/timestamp/priority (current schema sufficient)
- `recordWorldEventsv3.deriveDomain` keyword classifier polish (separate ROLLOUT followup, S184)

---

## Open questions

1. Phase 2.1 schema-setup carve-out — research-build recommendation **A**, awaits Mike sign-off
2. Phase 2.2 read-state-then-write — research-build recommendation **A** (force-append-intent), awaits Mike sign-off
3. Phase 2.3 caller-passed-sheet — research-build recommendation **A** for small files, awaits Mike sign-off + caller-list audit
4. Phase 4 STOP POINT — at what evidence threshold (B5 + B6 dryRun diff cleanliness, error rate, regression count) does Mike call B6 done vs push B7?
5. Phase 4 batch sequencing — is the inventory's B1→B7 order correct, or should B5 (engine core) come earlier as the highest-criticality test of the pattern?

All five resolved during Phase 2 research-build session (next session) before engine-sheet picks up Phase 3 pilot.

---

## Risks

- **Apps Script-only refactor; no Node test harness.** Mitigated by per-batch dryRun + replay verification (Phase 2.4 regimen) + live cycle smoke-test at every batch.
- **175 sites; bulk migration risk.** Mitigated by per-phase batching (8 batches) + B0 canary + STOP POINT after B6.
- **Read-state-then-write hazards in 2 Tier-1 files.** Mitigated by Phase 2.2 decision (force-append).
- **Schema-setup carve-out grows the exceptions list back.** Mitigated by Phase 2.1 explicit category + per-file justification rule.
- **mediaRoomIntake.js (32 sites + 30 lazy-create + 4 caller-passed) is the highest-risk single migration.** Mitigated by deferring to B7 (post-stop-point) — only attempted after every other writer has shipped clean.
- **Mid-cycle clasp deploy.** Mitigated by deploying at session-end, not mid-session; live cycle smoke-test before commit-push.
- **Cycle-time regression.** New writers add intent-creation overhead per call site. Mitigated: Phase 5 measures cycle-time delta vs baseline; if regression >5%, investigate executor batching.

---

## Changelog

- 2026-04-28 — Initial draft (S184, research-build). Phase 1 inventory done same session — see [[engine/PHASE_42_INVENTORY]]. Real numbers used: 37 files (citizenFameTracker.js retired), 175 cycle-path direct writes (vs audit's 181 net). Frame: efficiency not correctness, per audit's S156 Path 1 closeout. Tiered scope with explicit B6 stop-point. dryRun + replay regimen as test harness (Phase 2.4 ships `scripts/phase42VerifyBatch.js`). 5 open questions queued for Phase 2 research-build session before engine-sheet pilot. Estimated 6–8 engine-sheet sessions for full B0–B7 close; B0–B6 ships ~58% of scope as the recommended stop point.
