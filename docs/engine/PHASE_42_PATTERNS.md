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
  - "[[adr/0002-phase-42-phase05-ledger-redesign]] — §5.6 redesign decision record"
  - "[[SCHEMA]] — doc conventions"
---

# Phase 42 Writer Consolidation — Patterns + Decisions

**Phase 42 is a deepening exercise.** Today's cycle path has 175 direct-write sites against shared Sheets — every write crosses the simulation seam (engine ↔ Sheets), making the seam shallow and the calling sites both noisy and fragile. Phase 42 deepens `ctx` as the canonical Module behind that seam: callers route through `ctx.writeIntents` (most paths) and `ctx.ledger` (the §5.6 phase05 path), each a small Interface hiding the materialization mechanics underneath. The §5.6 redesign (ADR-0002) is the canonical Deep-module example — one Phase 1 init + one Phase 10 commit handler hide 18 SL touchers. Vocabulary: see `CONTEXT.md` §Architecture → Refactor lens.

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
6. **SIMULATION_LEDGER FULL-RANGE COMMIT BLOCKER (surfaced S184 B0 canary, expanded by S184 B1 audit).** 11 engines target `Simulation_Ledger` range `(2, 1, full-table)` — full read-mutate-write per cycle. **Currently works in production via a fragile invariant** (engines run sequentially; each direct write materializes before the next reads). **Under intent semantics this BREAKS or is already broken** — multiple engines queue identical-range intents at the same address; Phase 10 last-write-wins clobbers earlier engines' mutations.

   **Two cohorts:**

   *Direct-write (8 engines, B0 canary list — unmigrated):*
   `runAsUniversePipeline.js:587`, `runEducationEngine.js:454`, `generateNamedCitizensEvents.js:715`, `runNeighborhoodEngine.js:529`, `runRelationshipEngine.js:596`, `runHouseholdEngine.js:507`, `runCivicRoleEngine.js:437`, plus `runHouseholdEngine.js:507` (B0 deferred its line 507 ledger commit to this redesign).

   *Already-queued (3 engines, B1 audit — call `queueRangeIntent_` in production today, AND have phase05-ledger range collision shipping live):*
   `phase04-events/generateGameModeMicroEvents.js` (queueRangeIntent_ at line ~557), `phase05-citizens/generateCivicModeEvents.js` (line ~506), `phase05-citizens/generateMediaModeEvents.js` (line ~467). These were the dual-pattern files; B1 removed their dead direct-write fallbacks but their intent-queuing path was always the one shipping. They contribute to the same collision class and need the redesign too.

   **Pattern P2 as written cannot resolve this without redesign.** Blocks B2 (mechanical Tier-3 P1 migrations include `run*Engine.js` × 4) and any future phase05-citizens range-commit migration.

   **REDESIGN LOCKED S185 (research-build, Mike sign-off + engine-sheet audit complete): approach (a) — shared in-memory `ctx.ledger`.** Full chain: original decision mags doc `fTzSivJgpXmaBcB5vrPEn1` → engine-sheet audit mags doc `2Lh8xsEHc6BMbBARM6mwHU` → amendments mags doc `hQE4rREEWBpS9aS1g3mQ3M` (this is the canonical retrieval point — covers original reasoning + audit findings + verified amendments). Retrieve: `curl -s "https://api.supermemory.ai/v3/documents/hQE4rREEWBpS9aS1g3mQ3M" -H "Authorization: Bearer $SUPERMEMORY_CC_API_KEY"`.

   *Why not (b) or (c):* the collision class is **read-staleness**, not write-overlap. Per-cell intents (b) reduce the write surface but engine B still reads the unmutated sheet — its computation operates on stale state regardless of how the write is queued. The chain is held together today by direct-writes propagating through the sheet between engines; under intent semantics that propagation channel goes away, and only a shared-memory channel restores it. (c) hybrid inherits (b)'s read-staleness for any engine routed through (b), plus adds two patterns to maintain. (a) is the minimal change that matches what the engines are *semantically* doing — read-mutate chain on a shared array — and replaces "sheet-as-IPC" with actual shared memory.

   *Side benefit:* the live shipping bug (cohort B's 3 engines clobbering each other at Phase 10) goes away the moment (a) lands, even before the cohort A direct-writers are migrated. One ledger read per phase instead of 11 also drops cycle-time.

   **Spec:** *[NOTE: this original spec block is historical — references "11 engines" and a TBD init location. **Superseded by A1–A6 amendments below** (S185, post-audit). Engine-sheet implements per the amendments: 18 writer-files + 4 reader-files; init locked at `godWorldEngine2.js` pre-phase-04. The shape of each step (1-6) is unchanged; only the scope expanded.]*

   1. **Phase 1 init** (engine core, location TBD by engine-sheet — `godWorldEngine2.js` pre-phase setup or first phase05 entry):
      ```javascript
      var ledgerSheet = ss.getSheetByName('Simulation_Ledger');
      var ledgerValues = ledgerSheet.getDataRange().getValues();
      ctx.ledger = {
        sheet: 'Simulation_Ledger',
        headers: ledgerValues[0],
        rows: ledgerValues.slice(1),    // body rows only — index 0 = data row 2
        dirty: false
      };
      ```

   2. **Each of the 11 engines** drops its own `ledger.getDataRange().getValues()` and reads from `ctx.ledger.rows`. Header lookup (`var iLife = headers.indexOf('Life')` etc.) reads from `ctx.ledger.headers`.

   3. **Mutations** happen in place on `ctx.ledger.rows[r]`. Any engine that mutates flips `ctx.ledger.dirty = true`. (Setting it once at engine entry if the engine ever mutates is fine — false positives just trigger a no-op-equivalent commit.)

   4. **Each engine drops its `ledger.getRange(2, 1, rows.length, rows[0].length).setValues(rows)` commit.** No more direct ledger writes from any of the 11. Cohort B's `queueRangeIntent_` calls also go away — no per-engine intent at all.

   5. **Phase 10 commit handler:**
      ```javascript
      if (ctx.ledger && ctx.ledger.dirty) {
        queueRangeIntent_(
          ctx,
          ctx.ledger.sheet,
          2,                                // skip header
          1,
          ctx.ledger.rows,
          'phase05-ledger consolidated commit',
          'citizens'
        );
      }
      ```
      Single intent, single domain, last-writer-wins semantics now apply only to "this consolidated final state vs whatever else queued an intent on Simulation_Ledger" — which should be nothing else by design (any other writer to Simulation_Ledger is a bug to surface during the audit step below).

   6. **Audit step (engine-sheet, before B2 ships):** *[STATUS: COMPLETE S185 — see "Audit findings — S185 engine-sheet" subsection below; results folded into A1–A6 amendments.]* grep the entire engine codebase for any non-phase05 read or write of `Simulation_Ledger` that runs *during* the cycle (not pre-cycle init / not phase01 setup). Anything found needs to either:
      - read from `ctx.ledger.rows` instead of the sheet (so it sees mid-cycle mutations), or
      - move to phase01 (pre-mutation) or post-Phase 10 (after commit), or
      - get flagged as a separate hazard for follow-up.

      Known candidates to verify: phase02 world-state writers (`updateNeighborhoodDemographics.js`, `updateCrimeMetrics.js`, `finalizeWorldPopulation.js`) — these write to *other* sheets but may *read* Simulation_Ledger. Cross-phase readers like `phase06-tracking/economicRippleEngine.js`. Phase 7 fame propagation if any path still reads SL. Phase 11 health/continuity intake (writes only, but verify no read-then-mutate pattern on SL columns).

   *Cost estimate:* 11 engines × 2 edits (~30-50 lines changed each, mostly removals) + 1 init helper + 1 Phase 10 commit handler + audit pass. ~6-8 commits in a single engine-sheet session if the audit finds nothing surprising; longer if non-phase05 readers need migrating.

   *Verification regimen:* per §1.5 — pre-batch dryRun snapshot (one full-range intent on SL is the expected delta from baseline); post-batch dryRun (same shape, only phase05 engines' per-engine intent counts drop); live cycle smoke-test confirms downstream readers (phase06 onward) see the consolidated state correctly.

   *Ordering:* this redesign ships **before B2**. Once it lands, B2 mechanical migrations (`run*Engine.js` × 4 P1 patterns) become trivial — they're already converted away from direct-writes by this redesign. B2 then only needs the per-row LifeHistory_Log appends + summary stitching, which are clean P1 cases.

   **Carry-forward to engine-sheet for verification before B2 starts:**
   - Confirm Phase 1 init location (godWorldEngine2.js pre-phase setup vs first phase05 entry — engine-sheet's call based on actual entry-point structure).
   - Confirm header alignment: do all 11 engines use the same `headers` row indices? Any engine that recomputes `headers.indexOf` per-row vs caches at top — preserve current cache pattern.
   - Run the audit step in §5.6.6 before any code change. Surface unexpected non-phase05 readers.
   - If audit surfaces a writer (not just reader) of SL outside these 11 + phase01 init + phase10 commit, flag back — that's a hazard the redesign didn't anticipate.

   **Audit findings — S185 engine-sheet (§5.6.6 pass complete, no code shipped):** Read-only grep of 162 engine files for `Simulation_Ledger` reads/writes during cycle execution. Pointer to mags Supermemory doc `2Lh8xsEHc6BMbBARM6mwHU` (audit summary + spec amendment list, retrieve: `curl -s "https://api.supermemory.ai/v3/documents/2Lh8xsEHc6BMbBARM6mwHU" -H "Authorization: Bearer $SUPERMEMORY_CC_API_KEY"`). Cleared categorically: orphans (`educationCareerEngine`, `generationalWealthEngine`, `householdFormationEngine`, `migrationTrackingEngine`, `gentrificationEngine`, `processIntakeV3` — no cycle caller, owned by separate dead-code audit); `civicInitiativeEngine` (writes Initiative_Tracker, not SL); `bondEngine` writes (Relationship_Bond_Ledger, not SL); `healthCauseIntake.js:348` (manual operator, between-cycle); `lib/*.js` (Node-side, not Apps Script cycle); comment-only refs (`storylineHealthEngine`, `continuityNotesParser`, `sheetNames`, `godWorldMenu`, `rosterLookup`); pre-phase05 reads (phase03 `ensureNeighborhoodDemographics_` runs before mutations).

   **🚩 New cycle-path SL writers — same hazard class as cohort A (full-range read-mutate-write), MUST fold into redesign scope:**

   | Phase entry | File | Write line |
   |-------------|------|------------|
   | Phase5-GenericMicroEvents (godWorldEngine2:187) | `phase04-events/generateGenericCitizenMicroEvent.js` | 540 |
   | Phase5-Generational (godWorldEngine2:211) | `phase04-events/generationalEventsEngine.js` | 385 |
   | Phase5-CitizenEvents (godWorldEngine2:220) | `phase05-citizens/generateCitizensEvents.js` | 1447 |
   | Phase5-Elections (godWorldEngine2:202) | `phase05-citizens/runCivicElectionsv1.js` | 451 (starts at row 1, includes header) |
   | Phase9-CompressLifeHistory (godWorldEngine2:329) | `utilities/compressLifeHistory.js` | 281 |

   All five run `getDataRange().getValues()` → mutate → `getRange(...).setValues(rows)`. Same shape, same read-staleness exposure, same redesign treatment (read from `ctx.ledger.rows`, mutate in place, drop own commit, single Phase 10 consolidated commit covers all). `compressLifeHistory_` at Phase 9 is post-everyone-else, currently winning every race because it's last — under the redesign it must route through `ctx.ledger` like the rest, OR Phase 10 commit must run after it (fragile, rejected).

   **🚩 New per-row SL writers — different write shape, same read-staleness exposure:**

   | Phase entry | File | Write lines |
   |-------------|------|-------------|
   | Phase5-Promotions (godWorldEngine2:221) | `phase05-citizens/checkForPromotions.js` | 487 (single-row setValues) |
   | Phase5-Advancement (godWorldEngine2:222) | `phase05-citizens/processAdvancementIntake.js` | 296, 299, 411–413 (per-row setValue), 463 (appendRow) |

   Don't contribute to cohort B's clobbering pattern (no full-range commits), but read SL mid-cycle and mutate per-row mid-cycle. Under the redesign these route through `ctx.ledger.rows` for both reads and per-row mutations. The `appendRow` at processAdvancementIntake:463 (new citizen added during cycle) needs a decision: queue an `append` intent + push to `ctx.ledger.rows` (so downstream phases see the new row), OR queue append-only and let Phase 10 commit handler skip the new row range (it'll already be in ctx.ledger.rows by phase05's end). Engine-sheet picks at impl, but research-build should call out the preferred shape.

   **🚩 Post-phase05 SL readers — read-staleness hazard introduced BY the redesign:**

   | Phase | File | Read line |
   |-------|------|-----------|
   | Phase5-Bonds fallback path | `phase05-citizens/bondEngine.js` | 457 |
   | Phase 7 | `phase07-evening-media/buildEveningFamous.js` | 189 |
   | Phase 7 | `phase07-evening-media/mediaRoomIntake.js` | 531-532, 1077 |
   | Phase 9 | `utilities/compressLifeHistory.js` | 210 (read before its own line 281 write) |

   Today these see post-mutation state via the sheet. Under the redesign the sheet doesn't reflect mutations until Phase 10 — they'd see pre-mutation state. Each routes through `ctx.ledger.rows`.

   **🚩 Latent bug (separate from Phase 42, surfaces in audit):** `generateCitizensEvents_` is defined in BOTH `phase04-events/generateCitizenEvents.js:28` AND `phase05-citizens/generateCitizensEvents.js:50`. Apps Script flat namespace — one wins, the other is dead code. Both files contain full-range SL writes. **Must resolve (delete dead file or rename) BEFORE migrating either**, or the migration touches the wrong copy.

   **Spec amendments LOCKED S185 (research-build, post-audit verification):**

   **A1. Scope expansion** — original 11 cycle-path SL writers (8 cohort A + 3 cohort B); now **18 writer-files + 4 reader-files**, of which 1 (`compressLifeHistory`) is both. Net new vs original: +7 writer-files (5 full-range + 2 per-row) + 3 reader-only files. Full enumeration:

   *Writers — full-range read-mutate-write (13):*

   | # | Phase | File | Commit line |
   |---|-------|------|-------------|
   | 1 | Phase4-GenericMicroEvents | `phase04-events/generateGenericCitizenMicroEvent.js` | 540 |
   | 2 | Phase4-Generational | `phase04-events/generationalEventsEngine.js` | 385 |
   | 3 | Phase4-GameMode | `phase04-events/generateGameModeMicroEvents.js` | 556 (queueRangeIntent_) |
   | 4 | Phase5-Household | `phase05-citizens/runHouseholdEngine.js` | 507 |
   | 5 | Phase5-Relationship | `phase05-citizens/runRelationshipEngine.js` | 596 |
   | 6 | Phase5-Education | `phase05-citizens/runEducationEngine.js` | 454 |
   | 7 | Phase5-Career | `phase05-citizens/runCareerEngine.js` | 882 |
   | 8 | Phase5-Neighborhood | `phase05-citizens/runNeighborhoodEngine.js` | 529 |
   | 9 | Phase5-CivicRole | `phase05-citizens/runCivicRoleEngine.js` | 437 |
   | 10 | Phase5-AsUniverse | `phase05-citizens/runAsUniversePipeline.js` | 587 |
   | 11 | Phase5-NamedEvents | `phase05-citizens/generateNamedCitizensEvents.js` | 715 |
   | 12 | Phase5-CitizenEvents | `phase05-citizens/generateCitizensEvents.js` | 1447 |
   | 13 | Phase5-CivicMode | `phase05-citizens/generateCivicModeEvents.js` | 505 (queueRangeIntent_) |
   | 14 | Phase5-MediaMode | `phase05-citizens/generateMediaModeEvents.js` | 466 (queueRangeIntent_) |
   | 15 | Phase5-Elections | `phase05-citizens/runCivicElectionsv1.js` | 451 (**from row 1, includes header** — `simLedger.getRange(1, 1, ...)`) |
   | 16 | Phase9-CompressLife | `utilities/compressLifeHistory.js` | 281 |

   (Count is 16 entries above because the original 11 already included the 3 cohort-B queueRangeIntent_ writers. Net new since original: +5 writers, with row-1 quirk on #15.)

   *Per-row writers (different shape, same staleness — 2):*

   | # | Phase | File | Lines |
   |---|-------|------|-------|
   | 17 | Phase5-Promotions | `phase05-citizens/checkForPromotions.js` | 487 (single-row setValues) |
   | 18 | Phase5-Advancement | `phase05-citizens/processAdvancementIntake.js` | 296, 299, 411–413 (per-row setValue), 463 (appendRow) |

   *Impl shape for #18 `appendRow` (engine-sheet's call, locked S185 post-review):* push the new citizen row to `ctx.ledger.rows` directly — **no separate append intent.** Phase 10's consolidated `queueRangeIntent_(2, 1, ctx.ledger.rows)` auto-extends the sheet because Apps Script `setValues` writes beyond current bounds. A separate append intent would double-write. Downstream phases reading `ctx.ledger.rows` see the new row immediately. Engine-sheet documents this choice in the migration commit message.

   *Post-phase05 readers — read-staleness introduced BY redesign (5):*

   | Phase | File | Line | Note |
   |-------|------|------|------|
   | Phase5 (fallback) | `phase05-citizens/bondEngine.js` | 457 | rare path |
   | Phase 7 | `phase07-evening-media/buildEveningFamous.js` | 189 | real-player roster |
   | Phase 7 | `phase07-evening-media/mediaRoomIntake.js` | 531-532, 1077 | existence checks |
   | Phase 9 | `utilities/compressLifeHistory.js` | 210 | reads before its own line 281 write |

   All 5 readers route through `ctx.ledger.rows` after redesign — no exceptions. Engine-sheet ships the read-substitution edits in the same batch.

   **A2. Phase 1 init location LOCKED: `phase01-config/godWorldEngine2.js` pre-phase-04 entry.** Two writers run during phase04 (`generateGenericCitizenMicroEvents_` at line 187, `runGenerationalEngine_` at line 211 — both before any phase05 entry). Init must precede these. Engine-sheet places the init helper just before the first phase04 `safePhaseCall_` block.

   **A3. Compressed-LifeHistory routing LOCKED: Phase 9 `compressLifeHistory_` routes through `ctx.ledger`** (no special case). Both its read at line 210 and its write at line 281 redirect to `ctx.ledger.rows`. Phase 10 commit handler then commits the final state including compress's mutations. The alternative (direct write + Phase 10 sequenced after) is fragile — rejected.

   **A4. Function-name collision LOCKED — prerequisite-delete commit before redesign batch:**

   Two files both define `generateCitizensEvents_(ctx)`:
   - `phase04-events/generateCitizenEvents.js` (note: file name has no `s` after Citizen) — v2.4, 951 lines, basic tagged pool. **DEAD** (loses flat-namespace race to phase05 — `.clasp.json` has empty `filePushOrder` so push is alphabetical; `phase05-citizens/` sorts after `phase04-events/`; phase05 file loads last and overrides).
   - `phase05-citizens/generateCitizensEvents.js` (file name has `s` — Citizens) — v2.8, 1536 lines, full feature set (TraitProfile, archetypes, motifs, crime metrics, weather v3.5, patrol awareness). **LIVE** — strict superset of v2.4; nothing to salvage from the dead file.

   Caller: `phase01-config/godWorldEngine2.js:220` calls `generateCitizensEvents_` by bare name (resolved by flat namespace at load time → phase05 wins).

   **Prerequisite step (research-build ships before engine-sheet redesign batch):** delete `phase04-events/generateCitizenEvents.js`. Single-commit, no logic change, smoke-test confirms cycle still runs. Once shipped, engine-sheet's redesign batch can migrate `phase05-citizens/generateCitizensEvents.js:1447` without ambiguity.

   **A5. Cost estimate revised: ~10-13 commits in one engine-sheet session** (was 6-8). Includes 18 writer/reader edits + 1 init helper + 1 Phase 10 commit handler + audit verification. Prerequisite-delete is a separate single commit (not in the count).

   **A6. Row-1 quirk for `runCivicElectionsv1.js:451`:** current code writes from row 1 (`simLedger.getRange(1, 1, simData.length, simData[0].length)`) — includes header row in the rewrite. Under redesign, route through `ctx.ledger`: read includes header (`headers = ledgerValues[0]`, `rows = ledgerValues.slice(1)`) — Elections engine should mutate `ctx.ledger.rows` only (header is `ctx.ledger.headers`, immutable post-init). Phase 10 commit writes from row 2 with `ctx.ledger.rows`; header is preserved as the original. If Elections engine was ever rewriting headers (it isn't, per code review — it just reads then writes back the same values), redesign covers it. Engine-sheet confirms at impl: header values pre-init match header values that would have been written by line 451.

   Decision (a) shared `ctx.ledger` is still right for the amended scope — read-staleness is the underlying issue regardless of how many engines participate. Approach (b) and (c) get worse with more engines, not better.

   **Status:** §5.6 redesign DONE S188 (engine-sheet). 9-commit batch `0e31e66..6609c4a` migrated all 16 full-range writers + 2 per-row writers + 5 spec'd readers + 3 audit-miss readers + Phase 1 init + Phase 10 commit handler to shared `ctx.ledger`. Prerequisite-delete shipped S185 (`1a77e54`, research-build). Spec entry A1 #8 `generateNamedCitizensEvents:715` confirmed orphan (zero cycle callers; documented inline at `phase01-config/godWorldEngine2.js:1079`). B2 mechanical migrations (run*Engine × 4) unblocked — already converted away from direct writes by the redesign. Smoke-test (clasp push + cycle run) pending.

   **finalizeWorldPopulation.js was originally suspected to be a peer hazard** — confirmed not (27 sites are P3 cell writes to `World_Population`, single-row scope, different sheet). B5 mechanical migration unblocked.

   **B0 canary impact:** `runHouseholdEngine.js` B0 carved to P1 append-only (`LifeHistory_Log` line 480). Range-commit at line 507 deferred to Phase 42.5 redesign work.

   **B1 impact:** dead-code-removal only. Three already-queued engines lost their fallback paths but kept their intent-queuing path unchanged. Their hazard contribution to this list is unchanged from pre-B1 state — the production bug was already shipping; B1 just made the code intent-only.

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
- 2026-04-29 — §5.6 phase05-ledger redesign LOCKED (S185, research-build). Mike sign-off pending engine-sheet verification. Approach (a) shared in-memory `ctx.ledger` selected over (b) per-row cell intents and (c) hybrid. Rationale: collision class is read-staleness not write-overlap; (b) doesn't fix it because engine B reading the sheet still sees pre-A state regardless of how A's write is queued. Spec covers Phase 1 init shape, per-engine read/mutate/commit changes, Phase 10 single-intent commit, audit step for non-phase05 SL readers. Ships before B2. Carry-forward checklist for engine-sheet verification embedded in §5.6.
- 2026-04-29 — §5.6 SPEC AMENDED post-engine-sheet audit (S185, research-build). Engine-sheet's §5.6.6 audit (mags doc `2Lh8xsEHc6BMbBARM6mwHU`) surfaced 7 additional findings: 5 new full-range writers (phase04 generic-micro + generational, phase05 generateCitizensEvents + civicElections, phase09 compressLifeHistory) + 2 per-row writers (checkForPromotions + processAdvancementIntake) + 4 post-phase05 readers (bondEngine fallback, buildEveningFamous, mediaRoomIntake, compressLifeHistory pre-write read) + 1 latent function-name collision (`generateCitizensEvents_` defined in both phase04 + phase05 files; phase04 v2.4 dead, phase05 v2.8 live). All findings verified against actual code. Amendments locked: scope 11→18, Phase 1 init at godWorldEngine2 pre-phase-04, compressLifeHistory routes through ctx.ledger, prerequisite-delete `phase04-events/generateCitizenEvents.js` (dead) before redesign batch, runCivicElectionsv1.js:451 row-1 quirk handled, cost revised to ~10-13 commits. Approach (a) confirmed correct for amended scope. Pending: prerequisite-delete commit → engine-sheet redesign batch.
- 2026-04-29 — §5.6.6 audit complete (S185, engine-sheet). Read-only grep pass across 162 engine files. Surfaced 7 additional cycle-path SL writers (5 full-range cohort-A-equivalent + 2 per-row) + 4 post-phase05 readers + 1 function-name collision NOT in original spec. Decision (a) still correct for amended scope. **Spec amendments required** before engine-sheet ships redesign batch: scope 11→18 touchers; Phase 1 init must be `godWorldEngine2.js` pre-phase-04 (was flexible); Phase 9 `compressLifeHistory_` routing decision; resolve `generateCitizensEvents_` duplicate-definition prerequisite; cost ~6-8 → ~10-13 commits. Engine-sheet HOLDING on B2 + redesign batch pending research-build amendment. Audit findings embedded in §5.6 above.
- 2026-04-29 — §5.6 amendments LOCKED (S185, research-build) + reviewed by engine-sheet. A1 scope (18 writer-files + 4 reader-files); A2 init at `godWorldEngine2.js` pre-phase-04; A3 `compressLifeHistory_` routes through `ctx.ledger`; A4 prerequisite-delete `phase04-events/generateCitizenEvents.js` (verified dead via empty `filePushOrder` → alphabetical → phase05 wins flat-namespace race); A5 cost ~10-13 commits; A6 row-1 quirk for `runCivicElectionsv1.js:451` covered by `ctx.ledger.headers` immutability. Original §5.6 Spec block + §5.6.6 audit step marked superseded inline. Impl shape for #18 `appendRow` locked: push to `ctx.ledger.rows`, no separate append intent. Engine-sheet still holding pending research-build's prerequisite-delete commit.
- 2026-04-29 — §5.6 redesign batch DONE (S188, engine-sheet). 9 commits `0e31e66..6609c4a` shipped in one session, within the ~10-13 estimate: (1) `0e31e66` Phase 1 init at godWorldEngine2 pre-phase-04 (`initSimulationLedger.js`) + Phase 10 commit handler (`commitSimulationLedger.js`); (2) `4e2682d` 4 cohort-A writers — generateGenericCitizenMicroEvent, generationalEventsEngine, runHouseholdEngine, runRelationshipEngine; (3) `4b602ae` 4 cohort-A run*Engine writers — runEducationEngine, runCareerEngine, runNeighborhoodEngine, runCivicRoleEngine; (4) `4fbb876` cohort-A final batch — runAsUniversePipeline, generateCitizensEvents, runCivicElectionsv1 (row-1 quirk handled per A6) + audit-miss writer `updateNamedCitizens_` in godWorldEngine2; (5) `9870130` cohort-B writers (generateGameModeMicroEvents, generateCivicModeEvents, generateMediaModeEvents) + Phase 9 compressLifeHistory; (6) `23f3be9` 2 per-row writers (checkForPromotions, processAdvancementIntake); (7) `ec82f1a` 3 spec'd readers (bondEngine fallback, buildEveningFamous, mediaRoomIntake); (8) `e5cb1f5` 3 audit-miss readers (seedRelationBondsv1, runYouthEngine.getNamedYouth_, civicInitiativeEngine.getCouncilState_); (9) `6609c4a` processIntake_ Phase 10 clobber fix (advisor-caught audit-miss; closes deferred follow-up flagged in commit 4). Spec entry A1 #8 `generateNamedCitizensEvents:715` skipped — verified orphan (zero callers in phase01/04/05; orphan note inline at `phase01-config/godWorldEngine2.js:1079`). B2 (run*Engine × 4 mechanical migrations) unblocked — already converted away from direct writes by the redesign. Smoke-test (clasp push + live cycle run) pending — last engine-sheet step before §5.6 fully archives.
