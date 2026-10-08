# engine.95 Checkpoint/Resume Adversarial Review (2026-10-08)

**Target:** `bfd12ae0` and `cda93865`
**Design:** `docs/plans/2026-07-31-platform-ceiling-resilience.md` (Task 4 + 5 design — Revision 2)
**Verdict:** SHIP

All 7 hunted vectors have been verified against the code.

### 1. Cache flush, counter repair, and closure on split/failed fires
- `flushCacheAndVerify_` is safely guarded in `runWorldCycleLocked_`'s `finally` block by `if (ctx && ctx.cache && !(fire && fire.lifecycle))`. Because `checkpointGate_` sets `fire.lifecycle = 'checkpointing'` before any save, any checkpointing fire (successful or failed) skips the world flush and the counter repair. 
- `closeCycleFire_` explicitly branches on `fire.lifecycle`: 
  - `checkpointed` returns `state: 'checkpointed'`.
  - `save-failed` and `checkpointing` return `state: 'failed'` and write `failed` to the fire record.
  - `resumed` with a `commitProblem` (set by the executor's failure) closes as `failed` as well.
  - `resuming` (meaning it threw a runtime error before completing) closes as `failed`.
- A fully successful resume (`fire.lifecycle === 'resumed'` without a `commitProblem`) correctly evaluates `advanced` to `true` (since `resumeCore_` rebuilds `ctx.summary.cycleId = cycle`) and closes as `done`.

### 2. Admission path for new Cycle while manifest exists
- `routeCheckpointAtAdmission_` accurately implements the state table:
  - `ready` triggers an inline resume and bypasses the remaining normal admission checks. It safely enforces `expect === N - 1` or `N`.
  - `staging`, `save-failed`, or `corrupt` are logged as warnings, the checkpoint tab is cleared, and admission returns `null` to let a fresh Cycle run. 
  - `resuming`, `commit-failed`, and `resume-failed` refuse the run explicitly, naming the door to reconcile.
  - `committed` implements the close-only recovery by overwriting the fire record to `done` or `failed` and then returning `null` to admit the next Cycle.

### 3. `resumeCore_` context vs Phase 11 / executor requirements
- `mediaRoomIntake.js`, `applyBusinessDynamics.js`, `archiveCitizenExits.js`, and `archiveLifeHistory.js` all depend on summary fields: `season`, `holiday`, `isFirstFriday`, `isCreationDay`, `sportsSeason`, `month`, `simYear`, `cycleId`, `businessClosures`, and `cycleRef`. 
- Every one of these fields is correctly listed in `CHECKPOINT_SUMMARY_FIELDS` and restored by `resumeCore_` onto `ctx.summary`.
- Phase 11 also reads the ledger directly (e.g. `ctx.ledger.headers` and `ctx.ledger.rows`), which is correctly satisfied by `resumeCore_` explicitly calling `initSimulationLedger_(ctx)` after the executor lands the data.

### 4. The codec vs actual queued intent values
- `ckEncodeValue_` explicitly handles `Date` objects (like `ctx.now` used in Phase 5 append intents) and wraps them as `{"$d": iso}`.
- If an array contains `undefined`, it correctly pushes `{"$u": 1}` and decodes it back to `undefined`. If an object contains a value of `undefined`, it simply drops the key (which safely evaluates to `undefined` on read, matching the contract).
- The codec's object `$obj` wrapping handles exact collisions. If the engine ever queued a raw object `{ "$d": "2023-01-01" }`, the codec wraps it as `{"$obj": {"$d": "2023-01-01"}}`, and `ckDecodeValue_` perfectly restores the original without falsely treating it as a `Date`.
- `Date.prototype.toJSON` bypass: Because `ckEncodeValue_` explicitly intercepts and builds `{"$d": iso}` wrappers before `JSON.stringify` is ever called on the root object, the host's `toJSON` method is safely bypassed.

### 5. Save ordering vs the state table (interruption safety)
- `saveCycleCheckpoint_` executes in the exact order specified:
  - Writes `staging` manifest.
  - Writes data chunks and `SpreadsheetApp.flush()`.
  - Reads back the chunks using `joinChunks_` to prove durability.
  - Writes `ready` manifest.
  - Generates the trigger and writes it to the manifest.
- A kill at any point prior to the `ready` manifest leaves the state in `staging` (or `save-failed` if caught). The next admission correctly clears it and proceeds.
- A kill after `ready` but before `checkpointed` leaves the fire record as `running`. The next admission parses the `ready` manifest and executes an inline resume, successfully bypassing the fire record lock.

### 6. Trick code, silent catches, and fallback states
- `joinChunks_` uses rigorous strict equality checks against the manifest for chunk count (`n`), chunk indexes, and the SHA-1 digest. There are no weakened assertions.
- `readCheckpointManifest_` gracefully catches JSON parse errors but returns `{state: 'corrupt'}` rather than `null`. This prevents the engine from silently ignoring a corrupted payload and starting a new cycle; instead, the `'corrupt'` state flows into `routeCheckpointAtAdmission_`, which clears the tab and logs the error, safely proceeding as designed.
- `checkExecutorStats_` sets `fire.commitProblem` but returns it directly, allowing `runWorldCycleLocked_` to continue to Phase 11. This is explicitly the expected behaviour per the design plan, avoiding a behaviour change on non-checkpointed runs while correctly failing the Cycle on closure.

### 7. Web contract constraints
- Both `doGet` and `doPost` in `utilities/webTrigger.js` strictly validate the `CYCLE_TRIGGER_TOKEN` before evaluating any action parameters (like `action=checkpoint` or `action=clearcheckpoint`).
- Normal fires correctly receive their `expect` logic, and `runWorldCycle` accurately exposes its outcome (`state`, `lifecycle`, and `checkpoint` status) to the caller.
