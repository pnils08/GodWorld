# Adversarial Review: Tracker Freshness & Build Open Milestones (`12289fdb`, `3e2cf3cf`)

**Date:** 2026-09-25  
**Reviewer:** Antigravity (Standing Adversarial Review Duty per `engine-sheet`)  
**Target Commits:**
1. `12289fdb` (`Job 3: the open is written — one MilestoneNotes line when a site opens`)
2. `3e2cf3cf` (`Tracker state reaches weekday packs within the hour, stage-aware`)

**Files Inspected:**
- [`phase05-citizens/civicInitiativeEngine.js`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js) (`applyCivicBuildOpen_`, `stageIx` mapping, `CIVIC_CONSTRUCTION_PHASES_`)
- [`lib/initiativePhaseContract.js`](file:///root/GodWorld/lib/initiativePhaseContract.js) (`stageRequirement`, `stageRequirementWith`)
- [`lib/initiativePhaseContract.test.js`](file:///root/GodWorld/lib/initiativePhaseContract.test.js) (applier MilestoneNotes assertions, idempotency test)
- [`scripts/initiativeTrackerSnapshot.js`](file:///root/GodWorld/scripts/initiativeTrackerSnapshot.js) (`refreshFromLive`, `fromAuditRows`, `stageState`, cycle guard, atomic rename)
- [`scripts/cron-civic-run.js`](file:///root/GodWorld/scripts/cron-civic-run.js) (`runTickAndRefresh`, STAGES.tick mapping, export list)
- [`scripts/cron-work-wake.js`](file:///root/GodWorld/scripts/cron-work-wake.js) (`initiative-project` node builder, `cap(..., 600)`, milestone truncation)
- [`scripts/cron-civic-game.test.js`](file:///root/GodWorld/scripts/cron-civic-game.test.js) (`testAsync` harness, tracker refresh test, work-wake assertions)
- Readers/writers audited: [`scripts/cron-civic-gate.js`](file:///root/GodWorld/scripts/cron-civic-gate.js), [`scripts/civicMustDecide.js`](file:///root/GodWorld/scripts/civicMustDecide.js), [`scripts/buildInitiativePackets.js`](file:///root/GodWorld/scripts/buildInitiativePackets.js), [`scripts/godworld-mcp.py`](file:///root/GodWorld/scripts/godworld-mcp.py), [`scripts/buildCivicOfficeSlice.js`](file:///root/GodWorld/scripts/buildCivicOfficeSlice.js), [`dashboard/server.js`](file:///root/GodWorld/dashboard/server.js)

**Test Executions:**
- `node scripts/cron-civic-game.test.js`: PASS (55 passed, 0 failed, async suite verified)
- `node lib/initiativePhaseContract.test.js`: ALL 287 PASS
- Regression suites: `node scripts/civicReviewFixes.test.js` (15 pass), `node scripts/civicStageBoard.test.js` (12 pass), `node scripts/buildCivicOfficeSlice.test.js` (pass).

---

## Executive Verdict

**CLEAN PASS (VERIFIED RESILIENT — WITH 2 NON-BLOCKING OBSERVATIONS):**

The two cuts successfully close the gap between live sheet mutations and offline weekday packs while ensuring site completion is visibly written in in-world ledger copy:
1. `12289fdb` ensures that physical site openings are durably stamped into `MilestoneNotes` in canonical in-world copy (`C{N}: opened — construction complete, open to the public.`). The append operation is strictly coupled to the phase transition (`CIVIC_CONSTRUCTION_PHASES_ -> CIVIC_STANDING_PHASE_`), guaranteeing that the open milestone line is never duplicated across multiple engine passes or subsequent cycles.
2. `3e2cf3cf` resolves the multi-day lag where weekday packs and council seats read stale cycle-dump tracker data. The hourly civic tick (`--apply`) refreshes both `output/beats/Initiative_Tracker.jsonl` and `output/initiative_tracker.json` directly from the live sheet using atomic temporary-file writes (`.tmp` + `fs.renameSync`). A strict cycle guard prevents publishing post-fire data before `dumpBeatTabs` has dumped the rest of the world. All downstream consumers safely tolerate or benefit from the new stage fields.

---

## Detailed Audit Against Hunt Directives

### 1. The Refresh Making the Beats Dump Look Newer Than the Other Tabs

**Verdict: VERIFIED SAFE (Strict Cycle Guard & Unmutated Meta).**

A critical risk with refreshing a single beat tab (`Initiative_Tracker.jsonl`) mid-week is corrupting the cycle-synchronization contract of `output/beats/` or making the dump appear to be from a newer cycle than its peer tabs (`Crime_Metrics.jsonl`, `Transit_Metrics.jsonl`, etc.).

- **Post-Fire / Pre-Dump Cycle Guard ([`scripts/initiativeTrackerSnapshot.js:103-105`](file:///root/GodWorld/scripts/initiativeTrackerSnapshot.js#L103-L105)):**
  ```javascript
  const meta = JSON.parse(fs.readFileSync(path.join(beatsDir, 'meta.json'), 'utf8'));
  if (Number(meta.cycle) !== Number(o.cycle)) {
    return { refreshed: false, reason: 'beats dump at c' + meta.cycle + ', current c' + o.cycle + ' — waiting for the cycle dump' };
  }
  ```
  When the live engine fires on Sunday (advancing the world to cycle $N+1$), `detectCycle()` immediately resolves $N+1$. If the civic tick runs before `dumpBeatTabs.js` has completed for cycle $N+1$, `meta.json.cycle` is still $N$. The guard detects `Number(meta.cycle) !== Number(o.cycle)`, aborts the write, and leaves the prior dump untouched.
- **Untouched Meta Metadata:**
  `refreshFromLive()` writes exclusively to `output/beats/Initiative_Tracker.jsonl` and `output/initiative_tracker.json`. It **never** mutates `output/beats/meta.json` (leaving `generatedAt`, `cycle`, and `prevCycle` untouched) and **never** touches `output/beats/prev/`.
- **Filesystem Mtime Isolation:**
  Audit of all beat consumers (`scripts/beatSliceKit.js`, `scripts/build*Slice.js`, `scripts/newsroom-fanout.js`) confirmed that zero slice builders or persona scripts check the filesystem `mtime` of individual `.jsonl` files in `output/beats/`. Slices determine cycle validity strictly via `meta.json` or explicit cycle arguments. Mid-week updates to `Initiative_Tracker.jsonl` provide immediate intra-cycle freshness without spoofing beat cohort timestamps.

---

### 2. A Failed Read Clobbering a Good Copy

**Verdict: VERIFIED RESILIENT (Atomic Write & Fail-Closed Guards).**

If the Google Sheets API experiences a network failure, rate limiting, or returns malformed/empty data, the existing disk files must never be truncated or clobbered.

- **Pre-Write Array and Non-Empty Validation ([`scripts/initiativeTrackerSnapshot.js:108`](file:///root/GodWorld/scripts/initiativeTrackerSnapshot.js#L108)):**
  ```javascript
  const rows = await sheets.getSheetAsObjects('Initiative_Tracker');
  if (!Array.isArray(rows) || !rows.length) throw new Error('Initiative_Tracker read returned no rows');
  ```
  If `sheets.getSheetAsObjects` throws, or if the sheet returns an empty array, execution aborts before any filesystem operations occur.
- **Atomic Two-Step Write Pattern ([`scripts/initiativeTrackerSnapshot.js:109`](file:///root/GodWorld/scripts/initiativeTrackerSnapshot.js#L109)):**
  ```javascript
  const write = (p, text) => { const tmp = p + '.tmp'; fs.writeFileSync(tmp, text); fs.renameSync(tmp, p); };
  ```
  Both files are written to `.tmp` files first and then atomically renamed via `fs.renameSync`. A crash or process kill during serialization or disk write leaves the target file intact.
- **Caller Isolation ([`scripts/cron-civic-run.js:3642-3648`](file:///root/GodWorld/scripts/cron-civic-run.js#L3642-L3648)):**
  `refreshFromLive` is invoked inside a `try / catch` within the `finally` block of `runTickAndRefresh`. If an error occurs, it logs loudly to `console.error('[tick] TRACKER REFRESH FAILED — weekday packs read the prior copy: ' + e.message)` and allows the process to complete without aborting the tick or corrupting state.
- **Dry-Run Protection ([`scripts/cron-civic-run.js:3640`](file:///root/GodWorld/scripts/cron-civic-run.js#L3640)):**
  The refresh is guarded by `if (process.argv.includes('--apply'))`. Running `cron-civic-run.js` in preview or dry-run mode will never mutate disk copies.

---

### 3. Readers of `initiative_tracker.json` Breaking on the New Fields

**Verdict: VERIFIED COMPATIBLE (Zero Reader Breakages).**

The new fields added to each item in `initiative_tracker.json` (`stage`, `state`, `opensCycle`, `lastStageChangeCycle`, `lastWorkCycle`, `budgetRemaining`) were audited across all repository consumers:

1. **[`scripts/cron-civic-gate.js:217-218`](file:///root/GodWorld/scripts/cron-civic-gate.js#L217-L218):**
   Reads `(trackerSnap && trackerSnap.initiatives || []).length` to compute `--max-rows` diff ceiling. Immune to object properties.
2. **[`scripts/civicMustDecide.js:35-45, 26-33`](file:///root/GodWorld/scripts/civicMustDecide.js#L35-L45):**
   Reads `row.id || row.InitiativeID`, `row.name || row.Name`, and `phaseOf(row)` checks `init.ImplementationPhase || (init.implementation && init.implementation.phase)`. Because `fromAuditRows()` populates both `init.implementation` (with `phase`, `status`, `summary`) and the top-level keys, `civicMustDecide.js` extracts ID, name, and phase cleanly.
3. **[`scripts/godworld-mcp.py:412-471`](file:///root/GodWorld/scripts/godworld-mcp.py#L412-L471) (`lookup_initiative`):**
   Loads `output/initiative_tracker.json` as a Python dictionary. Matches `it.get('id')` and `it.get('name')`. Accesses `impl.get('phase')`, `impl.get('status')`, `match.get('domain')`, etc. Extra keys are ignored by Python dict lookups; tool does not crash or raise exceptions.
4. **[`scripts/buildCivicOfficeSlice.js:425-451`](file:///root/GodWorld/scripts/buildCivicOfficeSlice.js#L425-L451):**
   Extracts `init.id`, `init.name`, `init.budget`, `init.implementation.phase`, and `init.implementation.summary`. All expected properties remain fully populated.
5. **[`dashboard/server.js:1381-1433`](file:///root/GodWorld/dashboard/server.js#L1381-L1433):**
   Loads `tracker.initiatives` and spreads `...tracked`. This directly enriches the dashboard API with `stage`, `state`, and `opensCycle` without breaking any existing dashboard card logic.
6. **[`scripts/buildInitiativePackets.js:642-675`](file:///root/GodWorld/scripts/buildInitiativePackets.js#L642-L675):**
   Does not read `output/initiative_tracker.json` (reads the Google Sheet directly). *(See Architectural Observation 2 below regarding its writer block).*

---

### 4. The 600-Character Cap in `cron-work-wake.js`

**Verdict: VERIFIED SAFE & PRIORITY-PRESERVED.**

In `scripts/cron-work-wake.js`, the `initiative-project` node builder constructs the operational briefing for initiative directors (e.g. Temescal clinic director):

```javascript
const lines = [
  `Your project: ${row.Name} (${row.InitiativeID}).`,
  `It is in ${row.ImplementationPhase || '—'}${row.Stage ? ', stage ' + row.Stage : ''} (status ${row.Status || '—'}).`,
];
const state = require('./initiativeTrackerSnapshot').stageState(row);
if (state) lines.push('Where it stands: ' + state + '.');
if (row.MilestoneNotes) lines.push('Latest milestone: ' + cap(row.MilestoneNotes, 180));
if (row.NextScheduledAction) lines.push('Next on the books: ' + cap(row.NextScheduledAction, 120) + (row.NextActionCycle ? ' (cycle ' + row.NextActionCycle + ').' : '.'));
return cap(lines.join('\n'), 600);
```

- **Line Budget Calculation:**
  - Header lines: ~110 chars
  - `Where it stands:` (derived from `stageRequirement`): ~70–95 chars
  - `Latest milestone:` (`cap(..., 180)`): ~200 chars max
  - `Next on the books:` (`cap(..., 120)`): ~150 chars max
  - Nominal total: ~530–560 chars, comfortably within the 600-character cap.
- **Structural Resilience Against Truncation:**
  By placing `Where it stands: ${state}.` on Line 3 (ahead of `Latest milestone` and `Next on the books`), the civic requirement line is guaranteed to survive if a long initiative name or schedule causes the total block to reach 600 chars. The tail truncation in `cap(lines.join('\n'), 600)` trims only the bottom-most schedule details, never the city's state determination. Verified by unit assertion:
  `assert(site.indexOf('Where it stands') < site.indexOf('Latest milestone'))` and `assert(rendered.length <= 600)`.

---

### 5. A Repeated Open Line in `applyCivicBuildOpen_`

**Verdict: VERIFIED IDEMPOTENT (Zero Duplicate Milestones).**

In `phase05-citizens/civicInitiativeEngine.js`:
```javascript
function applyCivicBuildOpen_(ctx, row, ix, cycle) {
  if (!(ix.opens >= 0) || !(ix.phase >= 0)) return false;
  var cell = function (i) { return i >= 0 ? row[i] : ''; };
  var phase = String(cell(ix.phase) || '').trim().toLowerCase();
  if (CIVIC_CONSTRUCTION_PHASES_.indexOf(phase) < 0) return false;
  ...
  if (res.open) {
    var left = phase;
    row[ix.phase] = CIVIC_STANDING_PHASE_;
    changed = true;
    ...
    if (ix.milestone >= 0) {
      var prior = String(cell(ix.milestone) == null ? '' : cell(ix.milestone)).trim();
      row[ix.milestone] = (prior ? prior + '\n' : '') + 'C' + cycle + ': opened — construction complete, open to the public.';
    }
  }
}
```

- **Phase State-Machine Gate:**
  `CIVIC_CONSTRUCTION_PHASES_ = ['construction-planning', 'construction-active']`.
  When a site reaches its opening cycle (`cycle >= opensCycle`), `applyCivicBuildOpen_` sets `row[ix.phase] = CIVIC_STANDING_PHASE_` (`'operational'`).
- **Idempotency Across Passes and Cycles:**
  Because the phase mutation is applied in the exact same step as the milestone note write, any subsequent call in the same fire or any subsequent cycle (e.g. C114 after opening at C113) encounters `phase === 'operational'`. Because `'operational'` is not in `CIVIC_CONSTRUCTION_PHASES_`, line 3597 immediately returns `false` without evaluating notes or appending text.
  Verified by test suite:
  `ok(E.applyCivicStageStep_(..., 120) === false, 'applier: an open clinic does not open twice');`
  and verified on bench: fixture opened at C113 with the open line, C114 produced zero duplicates.

---

## Non-Blocking Observations for Future Maintenance

1. **Milestone Head-Slicing in `cron-work-wake.js`:**
   In `scripts/cron-work-wake.js:76`, `cap = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s`.
   Because `MilestoneNotes` accumulates history chronologically with each new event appended at the bottom, taking `s.slice(0, 179)` extracts the *oldest* notes from the top of the cell. For rows with extensive histories (e.g. `INIT-005` currently has 369 characters spanning C107 to C108), the newest milestone line at the bottom is cut off under the `'Latest milestone:'` header. Because `Where it stands:` now explicitly provides current operational standing, this does not blind the director, but future iterations could split on `\n` and take the final non-empty line.
2. **Transient Schema Drift via `buildInitiativePackets.js`:**
   `scripts/buildInitiativePackets.js:645-673` contains a legacy inline writer for `output/initiative_tracker.json` that does not include the new fields (`stage`, `state`, `opensCycle`, `lastStageChangeCycle`, `lastWorkCycle`, `budgetRemaining`). If `buildInitiativePackets.js` is run manually during cycle prep, it temporarily overwrites `initiative_tracker.json` with the legacy schema until the next hourly civic tick runs `trackerSnapshot.refreshFromLive()`. Refactoring `buildInitiativePackets.js` to delegate to `trackerSnapshot.fromAuditRows()` will permanently unify the schema.

---

## Conclusion

Commit `12289fdb` and Commit `3e2cf3cf` are verified resilient, fail-closed, and safe for production operations.
