---
title: Phase 42 Writer Consolidation — Inventory
created: 2026-04-28
updated: 2026-04-28
type: reference
tags: [engine, infrastructure, audit, active]
sources:
  - docs/engine/tech_debt_audits/2026-04-15.md (S146 audit identifying 38 files / 197 sites)
  - .claude/rules/engine.md (current exceptions list, S156 Path 1 closeout)
  - utilities/writeIntents.js (target API — 4 intent kinds + dryRun/replay)
  - phase10-persistence/persistenceExecutor.js (executor for write intents)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[plans/2026-04-28-phase-42-writer-consolidation]] — plan file consuming this inventory"
  - "[[SCHEMA]] — doc conventions"
---

# Phase 42 Writer Consolidation — Inventory

**Methodology:** S146 audit listed 38 files / 197 direct-write sites. citizenFameTracker.js retired S184 (-16 sites). This inventory re-greps each remaining file in the engine codebase as of 2026-04-28 and classifies by migration profile: direct-write count, existing intent usage, lazy-create signals, caller-passed-sheet signature, file size.

**Headline numbers (post-S184 reality):**
- **37 files** in scope (citizenFameTracker.js excluded — retired)
- **175 cycle-path direct-write sites** (vs audit's 181-after-retirement; ±6 from S180/S181/S184 churn)
- **4 partially-migrated files** already use `queueXIntent_` helpers
- **4 caller-passed-sheet helpers** (signature `function fn(sheet, ...)` cascades on refactor)
- **Lazy-create-heavy:** top 6 files account for 65 of 89 lazy-create signals

---

## Per-file classification

Columns:
- **D** = direct-write count (`setValue` / `setValues` / `appendRow`)
- **I** = existing `queueXIntent_` count (any helper)
- **L** = lazy-create signals (`insertSheet` / `if (!sheet)` patterns)
- **CS** = caller-passed-sheet function count (`function fn(sheet, ...)`)
- **Lns** = total file lines (Apps Script .js)
- **Tier** = T1/T2/T3/D/CS — see legend at end

### Tier 1 — Concentration writers (top 6 files, ~100 sites)

| File | D | I | L | CS | Lns | Notes |
|------|---|---|---|----|-----|-------|
| `phase07-evening-media/mediaRoomIntake.js` | **32** | 0 | **30** | 4 | 1571 | Highest concentration; lazy-create on every intake tab; CS=4 helpers; both Tier-1 AND CS-helper category |
| `phase03-population/finalizeWorldPopulation.js` | **27** | 0 | 3 | 0 | 351 | Cycle-end snapshot writer; uses `getLastColumn()` before sets (read-state-then-write) |
| `phase05-citizens/processAdvancementIntake.js` | **14** | 0 | 8 | 0 | 518 | Advancement intake → SL + LifeHistory_Log + intake clear; appendRow + getRange.clearContent |
| `phase11-media-intake/continuityNotesParser.js` | **10** | 0 | 5 | 0 | 383 | Lazy-create then `getLastRow()+1` start-row computation |
| `phase07-evening-media/parseMediaRoomMarkdown.js` | **9** | 0 | 10 | 0 | 923 | 9 sheets, all lazy-create-then-write; complex parser pipeline |
| `phase07-evening-media/culturalLedger.js` | **9** | 0 | 0 | 0 | 481 | No lazy-create; pure cycle-path writes; cleanest Tier-1 candidate |

**Tier-1 total: 101 of 175 sites (58%).**

### Tier 2 — Mid writers (5–7 sites each)

| File | D | I | L | CS | Lns |
|------|---|---|---|----|-----|
| `phase01-config/godWorldEngine2.js` | 7 | 0 | 6 | 0 | 1628 |
| `phase01-config/advanceSimulationCalendar.js` | 6 | 0 | 1 | 0 | 315 |
| `phase11-media-intake/healthCauseIntake.js` | 5 | 0 | 1 | 0 | 614 |

**Tier-2 total: 18 sites.**

### Tier 3 — Low writers (1–4 sites each)

| File | D | I | L | CS | Lns |
|------|---|---|---|----|-----|
| `phase02-world-state/applyEditionCoverageEffects.js` | 1 | 0 | 1 | 0 | 390 |
| `phase03-population/generateMonthlyDriftReport.js` | 2 | 0 | 2 | 0 | 130 |
| `phase03-population/updateCityTier.js` | 1 | 0 | 1 | **1** | 77 |
| `phase04-events/generateGenericCitizenMicroEvent.js` | 3 | 0 | 0 | 0 | 612 |
| ~~`phase04-events/generateCitizenEvents.js`~~ | ~~2~~ | ~~0~~ | ~~1~~ | ~~0~~ | ~~951~~ DELETED S185 (dead duplicate of phase05/generateCitizensEvents.js) |
| `phase04-events/worldEventsLedger.js` | 2 | 0 | 2 | 0 | 126 |
| `phase04-events/generationalEventsEngine.js` | 2 | 0 | 1 | 0 | 1089 |
| `phase05-citizens/updateCivicApprovalRatings.js` | 1 | 0 | 1 | 0 | 370 |
| `phase05-citizens/bondEngine.js` | 2 | 0 | 2 | 0 | 1596 |
| `phase05-citizens/migrationTrackingEngine.js` | 2 | 0 | 6 | 0 | 463 |
| `phase05-citizens/generateChicagoCitizensv1.js` | 4 | 0 | 2 | 0 | 438 |
| `phase05-citizens/runCivicRoleEngine.js` | 2 | 0 | 0 | 0 | 468 |
| `phase05-citizens/runHouseholdEngine.js` | 2 | 0 | 0 | 0 | 548 |
| `phase05-citizens/generateGenericCitizens.js` | 1 | 0 | 1 | 0 | 735 |
| `phase05-citizens/runRelationshipEngine.js` | 2 | 0 | 0 | 0 | 684 |
| `phase05-citizens/runNeighborhoodEngine.js` | 2 | 0 | 0 | 0 | 566 |
| `phase05-citizens/seedRelationBondsv1.js` | 1 | 0 | 3 | 0 | 462 |
| `phase05-citizens/gentrificationEngine.js` | 1 | 0 | 2 | 0 | 325 |
| `phase05-citizens/runCareerEngine.js` | 2 | 0 | 0 | 0 | 934 |
| `phase05-citizens/runCivicElectionsv1.js` | 4 | 0 | 1 | 0 | 536 |
| `phase07-evening-media/storylineWeavingEngine.js` | 3 | 0 | 3 | 0 | 551 |
| `phase07-evening-media/updateTrendTrajectory.js` | 1 | 0 | 1 | **1** | 87 |
| `phase07-evening-media/mediaRoomBriefingGenerator.js` | 2 | 0 | 3 | 0 | 2089 |
| `phase07-evening-media/updateMediaSpread.js` | 2 | 0 | 1 | **1** | 43 |

**Tier-3 total: 47 sites across 24 files.**

### Dual-pattern (already partially migrated to intents)

| File | D | I | L | CS | Lns | Notes |
|------|---|---|---|----|-----|-------|
| `phase04-events/generateGameModeMicroEvents.js` | 2 | **7** | 0 | 0 | 664 | Intents dominate; finish remaining 2 direct |
| `phase05-citizens/generateCivicModeEvents.js` | 2 | **5** | 1 | 0 | 575 | Intents dominate; finish remaining 2 direct |
| `phase05-citizens/generateMediaModeEvents.js` | 2 | **5** | 0 | 0 | 490 | Intents dominate; finish remaining 2 direct |
| `phase05-citizens/bondPersistence.js` | 3 | **4** | 3 | 0 | 772 | All 3 direct writes are schema-setup (lazy-create header + column-add + default-fill on column add) — **may legitimately stay direct** as schema-setup carve-out |

**Dual-pattern total: 9 direct sites across 4 files.** These are the smallest-surface migrations and the natural pilots for Phase 3 pattern-lock.

### Caller-passed-sheet helpers (signature change cascades)

| File | D | I | L | CS | Lns | Notes |
|------|---|---|---|----|-----|-------|
| `phase03-population/updateCityTier.js` | 1 | 0 | 1 | 1 | 77 | Single helper; tight scope |
| `phase07-evening-media/updateTrendTrajectory.js` | 1 | 0 | 1 | 1 | 87 | Single helper; tight scope |
| `phase07-evening-media/updateMediaSpread.js` | 2 | 0 | 1 | 1 | 43 | Single helper; tight scope |
| `phase07-evening-media/mediaRoomIntake.js` | 32 | 0 | 30 | 4 | 1571 | **Already in Tier 1** — 4 caller-passed helpers internal to the intake pipeline (likely lazy-create + log helpers) |

**Decision needed Phase 2:** signature change `(sheet, ...)` → `(ctx, tab, ...)` cascades to every caller. For mediaRoomIntake's internal helpers, this is a same-file refactor. For the three small files, callers are external — needs caller audit.

---

## Read-state-then-write pattern (spot-check Tier-1)

Sampled 6 Tier-1 files for "read sheet state, compute address, then write" patterns:

| File | Pattern detected | Hazard? |
|------|------------------|---------|
| finalizeWorldPopulation.js | `getLastColumn()` before `setValues` ranges (lines 82, 245) | LOW — column count drives values 2D-array width; intent's `values` field carries width, executor uses it |
| processAdvancementIntake.js | `appendRow` then later `getRange(row, 1, 1, getLastColumn()).clearContent()` for cleanup | MEDIUM — clear is for intake-row cleanup after promotion; ordering: append-then-clear within same function. Intent ordering must preserve. |
| mediaRoomIntake.js | `var startRow = trackerSheet.getLastRow() + 1;` (line 405) | **HIGH** — uses sheet state to compute next row for batch insert. If two writers in same phase append to same tab, second's `startRow` reads pre-first-intent state → row collision when executor runs. |
| parseMediaRoomMarkdown.js | `var lastRow = pasteSheet.getLastRow();` (line 38) — read for parse, not for write | LOW — read is for parse-input-extent, not write-position |
| continuityNotesParser.js | `var startRow = intakeSheet.getLastRow() + 1;` (line 90) — same pattern as mediaRoomIntake | **HIGH** — same single-writer-per-cycle assumption; ok if engine.js cycle order guarantees no parallel writers to this tab |
| culturalLedger.js | None detected | NONE |

**Architectural finding:** the `getLastRow() + 1` pattern is **only safe under single-writer-per-tab-per-cycle** guarantee. Cycle order is deterministic, but if Phase 7 has two writers append to the same tab, they collide. Mitigations available in the writeIntents API:
- Use `queueAppendIntent_` instead of `queueRangeIntent_` at computed startRow — executor handles positioning
- For batch appends preserving order, use `queueBatchAppendIntent_` (single intent, multi-row)

**No file currently does multi-tab cross-writer collision** based on this scan, but the migration is a chance to remove the latent hazard.

---

## Schema-setup vs cycle-path classification

`bondPersistence.js` is the cleanest example of writes that **may legitimately stay direct**:
- Line 122: `sheet.appendRow(BOND_SHEET_HEADERS)` — lazy-create header on first run, fires once per spreadsheet lifetime
- Line 714: `sheet.getRange(1, lastCol+1, 1, newHeaders.length).setValues([newHeaders])` — column-add for migration
- Line 724: `sheet.getRange(2, lastCol+1, lastRow-1, 5).setValues(defaults)` — default-fill on column-add

These fire **outside the cycle path** (one-time schema setup). Routing through write intents would force them through phase10 executor unnecessarily and complicate first-run / migration logic.

**Pattern decision needed Phase 2:** schema-setup writes carve out as a documented exception, OR refactor with `queueEnsureTabIntent_` API addition.

Other candidates for schema-setup carve-out (from L≥3 + low D pattern):
- `phase05-citizens/migrationTrackingEngine.js` (D:2 / L:6) — 6 lazy-create signals on 2 writes ⇒ heavily schema-setup
- `phase05-citizens/seedRelationBondsv1.js` (D:1 / L:3) — seed scripts often schema-setup-heavy
- Various `ensure*` utility files (`ensureCrimeMetrics.js`, `ensureTransitMetrics.js`, `ensureFaithLedger.js`) — already use intent helpers per S183 audit; reference pattern for schema-setup

---

## Recommended migration order

Sequence proposed for plan-file Phase 4. Based on:
- (a) smallest blast radius first (prove pattern, low rollback cost)
- (b) finish-what's-started before greenfield (dual-pattern files first)
- (c) save concentrations for last (most complex, most QA)
- (d) bundle by phase folder for clasp deploy efficiency

| Batch | Files | Sites | Rationale |
|-------|-------|-------|-----------|
| **B0 — Pattern lock pilot** | 1 chosen Tier-3 file (e.g. `runHouseholdEngine.js` D:2 / L:0 / CS:0 — pure cycle-path) | 2 | Establish pattern + dryRun verification gate before any other migration. Single commit, single deploy. |
| **B1 — Dual-pattern finish-line** | 4 files (generateGameModeMicroEvents, generateCivicModeEvents, generateMediaModeEvents, bondPersistence) | 9 | Smallest surface; pattern already in flight; bondPersistence may carve out as schema-setup |
| **B2 — Pure cycle-path Tier-3** | 8 files (run*Engine.js + small low-L writers) | 15-20 | Cleanest mechanical migrations; build muscle memory |
| **B3 — Schema-setup carve-out decisions** | up to 5 files with high L (`migrationTrackingEngine`, `seedRelationBondsv1`, `bondPersistence`, etc.) | 5-8 | Phase 2 decides per-file: refactor vs documented schema-setup exception |
| **B4 — Caller-passed-sheet helpers (small)** | 3 files (updateCityTier, updateTrendTrajectory, updateMediaSpread) | 4 | Signature change + caller updates; tight scope |
| **B5 — Phase 1 + 2 + 3 mid writers** | godWorldEngine2, advanceSimulationCalendar, applyEditionCoverageEffects, finalizeWorldPopulation, generateMonthlyDriftReport, healthCauseIntake | 50+ | Engine core; high-criticality; finalizeWorldPopulation is largest non-intake concentration |
| **B6 — Tier-1 culturalLedger** | culturalLedger.js | 9 | Tier-1 with no lazy-create or read-state-write — easiest large migration |
| **B7 — Tier-1 intake heavies (separate sessions)** | parseMediaRoomMarkdown, continuityNotesParser, processAdvancementIntake, mediaRoomIntake | 65 | Each warrants its own commit + deploy + smoke-test cycle. mediaRoomIntake especially (32 sites + lazy-create-heavy + caller-passed helpers). |

**Total: 8 engine-sheet sessions (estimate).** Tier-1 gates can ship incrementally; if cost > value, **stop after B6** (29 files / ~110 sites done; 8 files / ~65 sites parked as documented exceptions). That's the explicit early-exit point.

---

## Open questions for plan-spec phase

1. **Schema-setup carve-out:** new exception category in engine.md, OR `queueEnsureTabIntent_(tab, headers)` API addition? Plan §Phase 2 must decide.
2. **`getLastRow() + 1` hazard:** force migration to `queueAppendIntent_` / `queueBatchAppendIntent_` (no manual positioning), OR build a `flushIntentsForSheet_(ctx, tab)` helper for read-after-queue cases? Plan §Phase 2 must decide.
3. **Caller-passed-sheet helpers:** signature `(sheet, ...)` → `(ctx, tab, ...)` — do callers also migrate, or are some helpers retained as `(sheet, ...)` for non-cycle-path callers (utilities outside engine cycle)?
4. **Tier-1 stop-point:** at what evidence threshold (per-batch dryRun + replay diff size, error rate, regression count) does Mike call "good enough" and ship without B7?
5. **Apps Script-only refactor:** no Node-side test harness. Plan §Phase 4 must specify the per-batch verification regimen (dryRun snapshot diff + smoke-test cycle + Mara C93 audit signal).

---

## Changelog

- 2026-04-28 — Initial inventory (S184, research-build). All 37 files re-grepped against S184 codebase state. citizenFameTracker.js excluded (retired). Real cycle-path direct-write count: 175 (vs audit's 181 after retirement). 4 dual-pattern files identified. 4 caller-passed-sheet helpers identified. Tier-1 (top 6 files / 101 sites) is 58% of scope. Read-state-then-write hazards spot-checked in 6 Tier-1 files; 2 high-hazard sites flagged (`mediaRoomIntake.js:405`, `continuityNotesParser.js:90`). Schema-setup carve-out candidates surfaced: bondPersistence.js (3 sites), migrationTrackingEngine.js (heavy lazy-create), seedRelationBondsv1.js. 5 open questions queued for plan §Phase 2 decisions.
