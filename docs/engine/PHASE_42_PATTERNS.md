---
title: Phase 42 Writer Consolidation — Patterns + Decisions
created: 2026-04-28
updated: 2026-04-28
type: reference
tags: [engine, infrastructure, architecture, active]
sources:
  - docs/plans/2026-04-28-phase-42-writer-consolidation.md (parent plan)
  - docs/engine/PHASE_42_INVENTORY.md (Phase 1 inventory)
  - utilities/writeIntents.js (target API)
  - phase10-persistence/persistenceExecutor.js (executor)
  - .claude/rules/engine.md (current exceptions list — to cull at Phase 5)
pointers:
  - "[[plans/2026-04-28-phase-42-writer-consolidation]] — parent plan"
  - "[[engine/PHASE_42_INVENTORY]] — Phase 1 inventory consumed by this doc"
  - "[[SCHEMA]] — doc conventions"
---

# Phase 42 Writer Consolidation — Patterns + Decisions

**Engine-sheet's source of truth for Phases 3-5.** Every migration applies one of the 5 reference patterns below. Per-category decisions are locked — schema-setup carve-out shape, read-state-then-write hazard fix, caller-passed-sheet refactor, defensive-ensure-tab via new minimal API, dryRun verification regimen.

This doc replaces "ad-hoc per-file thinking" with "look up which pattern, apply it, run the verify gate." Don't deviate without flagging back to research-build for a pattern update.

---

## 1. Per-category decisions (all 5 locked S184)

### 1.1 Schema-setup carve-out — A + minimal API addition

Three lazy-create flavors exist; treatment differs by frequency:

| Flavor | Frequency | Treatment |
|--------|-----------|-----------|
| **True schema-setup** (column-add migrations, header-on-first-ever-write where headers are stable) | ≤1× per spreadsheet lifetime | **Documented carve-out** — engine.md exception entry, no API change |
| **Defensive runtime ensure-tab** (lazy-create that may fire when intake tab missing each cycle) | Up to 1× per cycle until tab populated | **New API: `queueEnsureTabIntent_(ctx, tab, headers)`** — executor checks at execute time, creates+writes header if missing, then proceeds with queued append/cell intents on same tab |
| **Pre-cycle phase01 mass-init** | Every cycle, defensive | **Rejected** — forces ensure-pass every cycle for a defensive concern; concentration over distribution is wrong here |

**Carve-out file list (engine-sheet adds engine.md exception entries during B3):**

| File | Lines | Reason |
|------|-------|--------|
| `phase05-citizens/bondPersistence.js` | 122 (lazy-create header), 714 (column-add header set), 724 (default-fill on column-add) | True schema-setup — fires ≤1× spreadsheet lifetime |

**Other carve-out candidates surfaced during execution** — engine-sheet flags any direct write where the same shape recurs (column-add migrations in `addCitizenFameColumns.js` retired-but-archived, etc.). When in doubt: use `queueEnsureTabIntent_` for defensive ensure; carve out only for truly-once writes.

### 1.2 Read-state-then-write hazard — A confirmed (force append-intent)

Pattern detected at `mediaRoomIntake.js:405-406` + `continuityNotesParser.js:90-91` + likely also `healthCauseIntake.js`:

```javascript
// HAZARDOUS (current)
sheet = lazyCreate(ss, name, HEADERS);
build rows[];
var startRow = sheet.getLastRow() + 1;       // <-- reads pre-intent state
sheet.getRange(startRow, 1, rows.length, NCOLS).setValues(rows);
```

If two writers in same phase queue cell/range intents at computed addresses for the same tab, second's startRow reads pre-first-intent state → row collision when executor runs.

**Fix: use `queueBatchAppendIntent_` — executor handles positioning, no manual address computation.**

```javascript
// SAFE (target)
queueEnsureTabIntent_(ctx, name, HEADERS);
build rows[];
queueBatchAppendIntent_(ctx, name, rows, 'intake processed', 'media');
```

Hazard category eliminated. Engine-sheet applies during B5 (healthCauseIntake) + B7 (mediaRoomIntake, continuityNotesParser).

### 1.3 Caller-passed-sheet helper — A confirmed (refactor signatures, single-file caller cascade)

Caller audit (S184): all 3 small helpers (`updateCityTier_`, `updateTrendTrajectory_`, `updateMediaSpread_`) are called from a single file — `culturalLedger.js:336/339/342`. Cascade is bounded.

mediaRoomIntake's 4 internal CS helpers are intra-file (intake pipeline internal). Same-file refactor.

**Refactor:** `(sheet, ...)` → `(ctx, tab, ...)`. Helpers' bodies switch from `sheet.getRange(...).setValue(...)` to `queueCellIntent_(ctx, tab, ...)`. Callers in `culturalLedger.js` update to pass `(ctx, ledgerName, ...)`. One commit covers all 3 helpers + 3 caller sites + culturalLedger.js's own 9 direct writes.

This is **B4** in the migration order — but bundles with **B6 (culturalLedger Tier-1)** because they touch the same file. Engine-sheet's call: keep separate or combine.

### 1.4 Defensive ensure-tab API — `queueEnsureTabIntent_` spec

**API (additive to `utilities/writeIntents.js`):**

```javascript
/**
 * Queues an ensure-tab intent (creates tab + writes header if missing).
 * Fires at execute time before any append/cell intents on same tab.
 *
 * @param {Object} ctx - Engine context
 * @param {string} tab - Sheet name
 * @param {any[]} headers - 1D array of column header strings
 * @param {string} reason - Description (e.g. 'intake tab ensure')
 * @param {string} domain - Owning domain
 */
function queueEnsureTabIntent_(ctx, tab, headers, reason, domain) {
  if (!ctx.persist) initializePersistContext_(ctx);
  var intent = createWriteIntent_(
    tab,
    'ensure',
    null,
    [headers],         // values = 1 row of headers
    reason || 'ensure tab exists',
    domain || 'unknown',
    25                 // priority — runs before replace (50), update (100), append (100), log (200)
  );
  ctx.persist.replaceOps.push(intent);
  return intent;
}
```

**Executor change** (`phase10-persistence/persistenceExecutor.js`): add `'ensure'` to validKinds list; handler creates tab + writes headers if missing; no-op if tab exists. Idempotent within a cycle (multiple ensure intents on same tab collapse).

**Engine-sheet builds this during B0 pattern-lock pilot** (additive change to writeIntents.js + executor). Once shipped, defensive ensure-tab pattern across mediaRoomIntake / continuityNotesParser / healthCauseIntake / others routes through it.

### 1.5 dryRun + replay verification regimen — minimal spec

Engine-sheet picks implementation form. Required behavior:

1. **Apps Script entry point** wraps the cycle: sets `ctx.mode.dryRun = true`, runs full pipeline through Phase 10, dumps `getIntentSummary_(ctx)` as JSON. Form options:
   - Logger.log + manual copy
   - Drive write (`phase42_verify/c{XX}_pre.json` / `c{XX}_post.json`)
   - Spreadsheet tab (`Phase42_Verify`) side-channel
2. **Pre-batch baseline:** run dryRun BEFORE edits, capture snapshot
3. **Apply batch:** edits + syntax-check + clasp deploy
4. **Post-batch snapshot:** run dryRun AFTER deploy, capture
5. **Diff:** only changes are in migrated writers' intent counts; zero drift in unrelated writers
6. **Smoke-test live cycle** (non-dryRun): no errors, expected sheet writes land
7. **Commit + push** only if 5+6 green

**Per-batch acceptance:**
- Diff matches expected scope (e.g. for B0: `+2 intents from runHouseholdEngine, -2 direct writes from runHouseholdEngine, 0 elsewhere`)
- Live cycle clean
- engine.md exceptions list updated to remove migrated entries

**Rollback path:** if 5 fails (unrelated drift) or 6 fails (live cycle error): revert commit, undo clasp deploy via prior tag, debug from baseline snapshot. Don't push broken state forward.

---

## 2. Reference migrations (5 patterns)

Engine-sheet uses these as templates. Copy-paste-adapt; don't reinvent.

### 2.1 Pure cycle-path append (Pattern P1)

**Reference file:** `phase05-citizens/runHouseholdEngine.js:480-488` (logSheet.appendRow)

**Before:**
```javascript
if (logSheet) {
  logSheet.appendRow([
    ctx.now,
    row[iPopID],
    ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim(),
    eventTag,
    pick,
    neighborhood,
    cycle
  ]);
}
```

**After:**
```javascript
queueAppendIntent_(
  ctx,
  'Household_Events_Log',           // or whatever the live sheet name is — confirm at migration time
  [
    ctx.now,
    row[iPopID],
    ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim(),
    eventTag,
    pick,
    neighborhood,
    cycle
  ],
  'household event',
  'citizens'
);
```

Drop the `if (logSheet)` guard — `queueAppendIntent_` handles missing sheet at execute time. If sheet is required-but-missing, queue an `ensureTabIntent_` first (pattern P5 below).

### 2.2 Range commit / batch update (Pattern P2)

**Reference file:** `phase05-citizens/runHouseholdEngine.js:507` (commit-after-mutation)

**Before:**
```javascript
ledger.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
```

**After:**
```javascript
queueRangeIntent_(
  ctx,
  ledgerName,                        // confirm at migration time — `Simulation_Ledger`?
  2,                                 // startRow (skip header)
  1,                                 // startCol
  rows,                              // 2D array
  'commit ledger row updates',
  'citizens'
);
```

Note: `queueRangeIntent_` carries the 2D array's width via `values`; executor uses `values[0].length` for write width. No need to thread `rows[0].length` separately.

### 2.3 Single cell update with dryRun guard removal (Pattern P3)

**Reference file:** `phase05-citizens/updateCivicApprovalRatings.js:286-292`

**Before:**
```javascript
if (!isDryRun && changes.length > 0) {
  for (var ci = 0; ci < changes.length; ci++) {
    var c = changes[ci];
    ledgerSheet.getRange(c.row, iApproval + 1).setValue(c.newApproval);
  }
  Logger.log('updateCivicApprovalRatings_ v1.0: Updated ' + changes.length + ' approval ratings');
}
```

**After:**
```javascript
if (changes.length > 0) {                                       // dryRun guard DROPPED
  for (var ci = 0; ci < changes.length; ci++) {
    var c = changes[ci];
    queueCellIntent_(
      ctx,
      ledgerName,
      c.row,
      iApproval + 1,
      c.newApproval,
      'approval recompute',
      'civic'
    );
  }
  Logger.log('updateCivicApprovalRatings_ v1.1: Queued ' + changes.length + ' approval intents');
}
```

**Important:** drop the `!isDryRun` guard. Executor (`executePersistIntents_`) checks `ctx.mode.dryRun` and logs without writing — guarding at writer site is now redundant + breaks dryRun visibility (intents wouldn't even be queued, so getIntentSummary would lie).

Same pattern applies to `applyEditionCoverageEffects.js:362-367` (mark-processed loop).

### 2.4 Caller-passed-sheet helper (Pattern P4)

**Reference file:** `phase03-population/updateCityTier.js`

**Before (signature + body):**
```javascript
function updateCityTier_(sheet, row, fameScore, mediaCount) {
  if (!sheet) return;
  // ... compute tier ...
  if (tierCol > 0) {
    sheet.getRange(row, tierCol).setValue(tier);
  }
}
```

**After:**
```javascript
function updateCityTier_(ctx, tab, row, fameScore, mediaCount) {
  if (!ctx || !tab) return;
  // ... compute tier ...
  // Note: getRange reads for headers/spread/trend may need ctx.snapshot or pass-through args
  // — this helper currently reads sheet state during compute. See "Helper-internal sheet reads" below.
  if (tierCol > 0) {
    queueCellIntent_(
      ctx,
      tab,
      row,
      tierCol,
      tier,
      'tier promotion',
      'media'
    );
  }
}
```

**Caller update** (`phase07-evening-media/culturalLedger.js:336/339/342`):
```javascript
// Before
updateMediaSpread_(sheet, i + 1, journalistName);
updateTrendTrajectory_(sheet, i + 1, newFame);
updateCityTier_(sheet, i + 1, newFame, mc);

// After
updateMediaSpread_(ctx, ledgerName, i + 1, journalistName);
updateTrendTrajectory_(ctx, ledgerName, i + 1, newFame);
updateCityTier_(ctx, ledgerName, i + 1, newFame, mc);
```

**Helper-internal sheet reads:** `updateCityTier_` reads `headers`, `spread`, `trend` from the live sheet during compute (lines 18, 28, 34). These are READS not writes — they don't violate the write-intents rule. They CAN stay as direct sheet reads (helper still needs sheet handle to read), OR if `ctx.snapshot` already carries the relevant column data, swap to snapshot reads. Engine-sheet's call at migration time — keep direct reads if simpler, swap if snapshot path is already in ctx.

If keeping direct reads, the helper signature becomes `(ctx, tab, sheet, row, ...)` — passes both ctx (for write intents) AND sheet handle (for reads). Caller resolves sheet via `ss.getSheetByName(tab)` once and passes both.

### 2.5 Defensive ensure-tab + batch append (Pattern P5)

**Reference site:** `phase11-media-intake/continuityNotesParser.js:74-91` (lazy-create + batch append at computed startRow)

**Before:**
```javascript
var intakeSheet = ss.getSheetByName('Continuity_Intake');
if (!intakeSheet) {
  intakeSheet = ss.insertSheet('Continuity_Intake');
  intakeSheet.appendRow(['NoteType', 'Description', 'RelatedArc', 'AffectedCitizens', 'Status']);
}
// ... build rows[] ...
var startRow = intakeSheet.getLastRow() + 1;
intakeSheet.getRange(startRow, 1, rows.length, 5).setValues(rows);
```

**After:**
```javascript
var INTAKE_HEADERS = ['NoteType', 'Description', 'RelatedArc', 'AffectedCitizens', 'Status'];
queueEnsureTabIntent_(ctx, 'Continuity_Intake', INTAKE_HEADERS, 'continuity intake ensure', 'media-intake');

// ... build rows[] ...

queueBatchAppendIntent_(ctx, 'Continuity_Intake', rows, 'continuity notes parse', 'media-intake');
```

Read-state-then-write hazard eliminated (no `getLastRow()`); ensure-tab routed through intent layer (defensive every-cycle, idempotent within cycle); batch append handled by executor. This is the highest-value migration shape — applies to mediaRoomIntake intake tabs (4+), healthCauseIntake intake tab, parseMediaRoomMarkdown intake tabs.

---

## 3. Per-file decision map

For each file in [[engine/PHASE_42_INVENTORY]], the pattern(s) that apply:

### Tier 1 (top 6, ~100 sites)

| File | Sites | Patterns | Notes |
|------|-------|----------|-------|
| mediaRoomIntake.js | 32 | P5 (intake tabs) + P3 (cell updates) + P4 (4 internal CS helpers) | B7 — defer until last; biggest migration |
| finalizeWorldPopulation.js | 27 | P2 (range commits) + P3 (cell updates) | B5; uses `getLastColumn()` reads — confirm not write-position |
| processAdvancementIntake.js | 14 | P5 (intake tab + ledger appends) + P3 (cleanup-clear cells) | B7; appendRow then getRange.clearContent for cleanup — clearContent stays direct (it's a clear, not a write) OR build clearContent intent kind (out of scope) |
| continuityNotesParser.js | 10 | P5 (intake tab batch append) | B7; canonical P5 reference |
| parseMediaRoomMarkdown.js | 9 | P5 (multiple intake tabs) | B7; 9 sheets each with lazy-create |
| culturalLedger.js | 9 | P3 (cell updates) + P1 (one append at line 402) | B6; bundle with caller-passed P4 cascade for `updateCityTier_` / `updateMediaSpread_` / `updateTrendTrajectory_` |

### Tier 2 (3 files, 18 sites)

| File | Sites | Patterns | Notes |
|------|-------|----------|-------|
| godWorldEngine2.js | 7 | P1 (logs) + P3 (cells) + likely P5 (engine init ensure-tabs) | B5; engine core; high criticality |
| advanceSimulationCalendar.js | 6 | P3 (calendar cell updates) | B5 |
| healthCauseIntake.js | 5 | P5 (intake tab batch) | B5; P5 canonical |

### Tier 3 (24 files, 47 sites)

Most are P1 (append) + P3 (cell) + occasional P2 (range commit). Notable picks:

| File | Sites | Patterns | Notes |
|------|-------|----------|-------|
| **runHouseholdEngine.js** | 2 | P1 + P2 | **B0 PILOT** — both append + range in one file |
| applyEditionCoverageEffects.js | 1 | P3 | B5; mark-processed loop |
| updateCivicApprovalRatings.js | 1 | P3 | B2; canonical P3 reference |
| updateCityTier.js | 1 | P4 | B4 (or B6 bundle) |
| updateTrendTrajectory.js | 1 | P4 | B4 (or B6 bundle) |
| updateMediaSpread.js | 2 | P4 | B4 (or B6 bundle) |
| run*Engine.js (×4: Relationship, Neighborhood, Career, CivicRole) | 8 | P1 | B2; mechanical |
| migrationTrackingEngine.js | 2 | P5 (ensure-tab heavy) | B3; carve-out review |
| seedRelationBondsv1.js | 1 | true schema-setup carve-out OR P5 | B3; carve-out review |
| bondPersistence.js | 3 | True schema-setup carve-out (all 3) | B1 — confirms carve-out, no migration |
| Others | varies | P1/P3 mix | B2 |

### Dual-pattern (4 files, 9 direct sites left)

| File | Direct | Existing intents | Notes |
|------|--------|-----------------|-------|
| generateGameModeMicroEvents.js | 2 | 7 | B1; finish remaining 2 → P1 |
| generateCivicModeEvents.js | 2 | 5 | B1; finish remaining 2 → P1 |
| generateMediaModeEvents.js | 2 | 5 | B1; finish remaining 2 → P1 |
| bondPersistence.js | 3 | 4 | B1; **all 3 direct = schema-setup carve-out, NO migration** |

---

## 4. Verification regimen — minimum spec

Engine-sheet implements per Phase 1.5 above. Output artifacts per batch:

| Artifact | When | Format | Purpose |
|----------|------|--------|---------|
| Pre-batch dryRun snapshot | Before edits | `getIntentSummary_(ctx)` JSON — Logger output OR Drive `/phase42_verify/b{N}_pre.json` OR Phase42_Verify sheet tab | Baseline |
| Post-batch dryRun snapshot | After edits + clasp deploy | Same shape | Compare to baseline |
| Diff report | Computed from above | Per-sheet × per-domain × per-kind delta | Acceptance evidence |
| Smoke-test cycle log | After dryRun gate green | Apps Script run log | No-error proof |
| Commit message | After smoke-test green | Includes per-file site count + dryRun summary delta | Audit trail |

**Acceptance criteria per batch:**
1. Pre/post diff: only intent counts in migrated writers change; zero drift elsewhere
2. Smoke-test cycle runs end-to-end with no Apps Script errors
3. Live sheet writes match pre-migration behavior (sample-check 3-5 written rows)
4. engine.md exceptions list updated — migrated entries removed

**Rollback if any fail:** revert commit + clasp deploy prior tag; debug from baseline snapshot; do not push forward.

---

## 5. Open carry-forward issues

Engine-sheet flags back to research-build during execution if any of these surface:

1. **`queueEnsureTabIntent_` API** — research-build specced shape; engine-sheet builds during B0. If executor implementation surfaces complications (intent ordering, idempotency, header validation against existing-tab headers), flag back.
2. **Helper-internal sheet reads** (Pattern P4) — `updateCityTier_` reads sheet state during compute. Decision deferred to migration time: keep direct reads via passed `sheet` handle, OR swap to `ctx.snapshot` reads. Engine-sheet picks per-helper.
3. **`processAdvancementIntake.js` clearContent cleanup** — current code does `intakeSheet.getRange(rowsToClear[c], 1, 1, intakeSheet.getLastColumn()).clearContent()` after promotion. Clear is a write but doesn't fit cell/range/append/replace. Options: (a) keep direct (pragmatic carve-out — clear isn't a value write), (b) build new `'clear'` intent kind (out of scope, but flag if pattern recurs). Engine-sheet's call at B7.
4. **Intent ordering across writers in same phase** — multiple writers in Phase 7 may queue intents to same tab. Executor priority handles cell/range/append correctly. If any phase has two writers doing range-update at computed addresses, flag back — that's a hazard the migration didn't anticipate.
5. **Apps Script execution time budget** — full cycle dryRun may exceed 6-minute Apps Script limit (cycle is currently ~2-3 min). If dryRun + intent serialization pushes over, build a phase-scoped dryRun (run only Phase 7 in dryRun, etc.) instead of full-cycle. Engine-sheet picks if needed.
6. **PHASE05-LEDGER FULL-RANGE COMMIT BLOCKER (surfaced S184 B0 canary).** 8 engines in `phase05-citizens/` perform `ledger.getRange(2, 1, rows.length, rows[0].length).setValues(rows)` on `Simulation_Ledger` — full-table read-mutate-write per cycle. Sites: `runAsUniversePipeline.js:587`, `runEducationEngine.js:454`, `generateNamedCitizensEvents.js:715`, `generateMediaModeEvents.js:471`, `runNeighborhoodEngine.js:529`, `runRelationshipEngine.js:596`, `runHouseholdEngine.js:507`, `runCivicRoleEngine.js:437`. **Currently works because direct writes materialize immediately** — downstream engines in same phase read post-previous-engine state. **Under intent semantics this BREAKS** — all 8 queue identical-range intents at `(2, 1, rows.length × cols)`; Phase 10 executor runs them in order; last-write-wins clobbers earlier mutations. **Pattern P2 as written cannot migrate any of these without redesign.** This is a blocker for B2 (mechanical Tier-3 P1 migrations include `run*Engine.js` × 4) and for any future phase05-citizens migration. **Two redesign sketches for research-build evaluation:** (a) In-memory shared `ctx.ledger` — engines mutate a shared array across phase, Phase 10 commits final state once via single `replace` intent. Preserves read-modify-read chain, bigger refactor. (b) Per-row cell intents on changed rows only — each engine tracks which row indices its mutation touched, queues per-cell or per-row-block intents for just those rows. Less disruptive shape but read-modify-read chain still depends on Phase 10 ordering, so downstream engine in phase05 reads stale sheet state, mutates, queues — collisions still possible if two engines mutate same row. (c) Hybrid — engines that read fresh ledger state mid-phase (relationship reads household state) need (a); engines whose mutations are independent (e.g., `generate*ModeEvents` writing event columns) might tolerate (b). Surface during research-build redesign session before B2 starts. **finalizeWorldPopulation.js was originally suspected to be a peer hazard** — confirmed not (27 sites are P3 cell writes to `World_Population`, single-row scope, different sheet). B5 mechanical migration unblocked. **B0 canary impact:** runHouseholdEngine.js B0 carved to P1 append-only (`LifeHistory_Log` line 480). Range-commit at line 507 deferred to Phase 42.5 redesign work.

---

## 6. Migration checklist (engine-sheet pre-flight per file)

Before applying a pattern to a file, confirm:

- [ ] File appears in inventory (Tier 1/2/3/Dual)
- [ ] Pattern(s) identified per §3 decision map
- [ ] Live sheet name confirmed (don't trust audit's tab references — re-grep at migration time)
- [ ] Helper signatures audited if Pattern P4 applies
- [ ] dryRun guards identified for removal (Pattern P3)
- [ ] `queueEnsureTabIntent_` available in writeIntents.js (B0 deliverable; required for P5)
- [ ] Pre-batch dryRun snapshot captured

After applying:

- [ ] Syntax-check (clasp push will catch JS-side, but local node parse first)
- [ ] Post-batch dryRun snapshot
- [ ] Diff: scope matches expected, no unrelated drift
- [ ] Live cycle smoke-test
- [ ] engine.md exceptions list updated
- [ ] Commit message includes per-file site count + dryRun delta

---

## Changelog

- 2026-04-28 — Initial draft (S184, research-build). All 5 per-category decisions locked Mike sign-off: schema-setup carve-out (A + minimal `queueEnsureTabIntent_` API addition); read-state-then-write hazard fix (force `queueBatchAppendIntent_`); caller-passed-sheet refactor (A — single-file caller cascade confirmed); dryRun verification regimen (minimum spec, engine-sheet picks form); reference migrations (5 patterns P1–P5 with before/after from real reference files). Per-file decision map covers all 37 files. 5 carry-forward issues queued for engine-sheet flag-back during execution. Phase 3 B0 pilot (runHouseholdEngine.js) starts after `queueEnsureTabIntent_` API ships.
