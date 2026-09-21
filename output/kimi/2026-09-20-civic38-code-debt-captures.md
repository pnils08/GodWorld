# kimi code-debt captures — civic.38 build chain A (2026-09-20)

Standing builder directive: broken / spaghetti / stale-hardcoded code seen
along the way. Capture only — none of these were fixed in the civic.38 scope.

1. **`scripts/cron-civic-run.js` — `domainSlice()` (~:1861) is dead code.** No
   caller (codex review F1 verified; the live pack builder is `buildPack` in
   buildCivicOfficeSlice.js). ~40 lines of hardcoded initiative IDs
   (`INIT-002`, `INIT-001/006/007`, `INIT-005` by domain regex) that will rot
   against the tracker. Delete candidate the next time the datawake section is
   open.

2. **`scripts/civicMustDecide.js:184` — `checkDatawakeMove()` has no live
   caller and reads `rec.action`, which Task 1 retired.** Every new datawake
   rec now carries `action: null`; if this function is ever reactivated, a
   confronted seat's wake false-fails `no-action` even with a valid `answer`
   move. Re-point at `rec.moves` before reuse, or delete with its test.

3. **`INIT_TO_SLUG` (`scripts/assembleDecisions.js:52`) is a private static
   map; my `slugForInitiative()` (cron-civic-run.js) re-derives initiative→
   slug from existing decisions files with the same fallback transform
   (assembleDecisions.js:322).** If the static map is edited without a
   decisions file on disk yet, the two disagree. assembleDecisions.js is
   read-only to my lane — exporting the map is the fix, engine-sheet's call.

4. **`WRITEBACK_FIELDS` is mirrored in `applyTrackerUpdates.js:109` and
   `validateTrackerUpdates.js:55`** (by design, "keep in sync" comment) and a
   third near-copy lives in `cron-civic-gate.js:50` (`TRACKER_AUDIT_FIELDS`,
   already includes Status). Three copies of one allowlist = drift class.
   A shared export from one module would kill it; not cut in this scope.

5. **Stale comment class (confirmed fixed, watch for recurrence):**
   `applyInitiativeImplementationEffects.js:515-517` claimed no consumer for
   the hood-effects bus — engine.250 found two dead readers and the plan
   corrected it. Comments asserting "no caller/consumer" rot fastest; the
   grep is the truth.

6. **Pack size watch:** `datawakeUserPrompt` serializes the whole pack
   (now incl. the `game` block) into the prompt. Board/petition/working-city
   blocks are capped (~600 chars each) but watch token drift as the ledger
   and beats dumps grow — the next cap that goes is on `known[]`/exposure.
