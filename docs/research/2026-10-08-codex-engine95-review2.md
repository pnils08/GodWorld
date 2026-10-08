---
title: Codex Review 2 — engine.95 checkpoint design Revision 1
created: 2026-10-08
updated: 2026-10-08
type: review
tags: [review, engine, infrastructure]
sources:
  - docs/plans/2026-07-31-platform-ceiling-resilience.md — Revision 1 and revised bench plan
  - docs/for-claude-review/2026-10-08-codex-engine95-design.md — Review 1
  - HEAD 5781f462
pointers:
  - "[[../plans/2026-07-31-platform-ceiling-resilience]] — owning plan"
  - "[[2026-10-08-codex-engine95-design]] — preceding review"
---

# Codex Review 2 — engine.95 checkpoint design Revision 1

**Target:** `docs/plans/2026-07-31-platform-ceiling-resilience.md:158`, eleven-part Revision 1, and revised bench plan at `:183`.

**Result: HOLD — five BLOCK, two FIX, one NOTE.** The commit boundary and initial summary inventory now cover the production tail. The remaining blockers concern partially completed resumes, save exceptions, admission/result ownership, deduplication, and classification of required-write failures.

**Scope:** HEAD `5781f462`. Source review and isolated, synthetic Node/VM probes only. No code changes, commits, deployments, trigger creation, bench fires, or Sheet reads/writes. Only this report is written. Existing output dirt and unrelated inbox files were preserved. Approved `330000 / 60000 / measured checkpointSaveMs` remain unchanged. This is a design review; proposed checkpoint functions, codecs, receipts, and force hooks do not exist at HEAD.

## Findings

### 1. BLOCK — The initial payload covers the tail, but phase-name receipts discard state produced during a resume.

**Plan:** parts 1, 3, 6, 7 (`docs/plans/2026-07-31-platform-ceiling-resilience.md:171`, `:173`, `:176`, `:177`).

The revised gate is correctly after the ledger intent is queued. An AST count finds **126 scheduled phases through CommitLedger, followed by five**, on each dispatch path. Production menu/web use the inline runner (`utilities/godWorldMenu.js:27`, `utilities/webTrigger.js:43`, `phase01-config/godWorldEngine2.js:420`). The remaining inline schedule is ExecuteIntents `:815`, MediaIntake `:824`, BusinessArchive `:825`, CitizenArchive `:826`, MaintainLifeHistoryLog `:831`, then finalizers `:837` and `:425`. Extracted equivalents are `:2478`, `:2485`, `:2486`, `:2487`, `:2491`; no production gate is needed there.

#### Complete summary-read inventory at this boundary

| Consumer | Top-level summary fields read, including called helpers | Evidence |
|---|---|---|
| ExecuteIntents, LifeHistory normalization | `cycleRef`, `absoluteCycle`, `cycle` | `phase10-persistence/persistenceExecutor.js:430`; `phase01-config/advanceSimulationCalendar.js:293` |
| MediaIntake | `season`, `holiday`, `holidayPriority`, `isFirstFriday`, `isCreationDay`, `sportsSeason`, `simMonth`, `month`, `simYear` | `phase07-evening-media/mediaRoomIntake.js:79`, `:179` |
| BusinessArchive | `businessClosures`, `cycleId` | `phase05-citizens/applyBusinessDynamics.js:734` |
| CitizenArchive | `cycleId`, `simYear`; `absoluteCycle` is a year-helper fallback if no usable cycle argument | `utilities/archiveCitizenExits.js:183`, `:213`; `phase01-config/advanceSimulationCalendar.js:345` |
| MaintainLifeHistoryLog | `cycleId`, `cycleRef`, `absoluteCycle`, `cycle` | `utilities/archiveLifeHistory.js:76`, `:94`, `:107`; calendar helper `:293` |
| All five safe-phase wrappers | `phaseTimings`; on errors, `auditIssues`, `engineErrorCount`, `cycleId` | `phase01-config/godWorldEngine2.js:78`, `:112`, `:159`, `:178` |
| Cache flush | **None.** Reads its closed-over write/append queues and Sheet/cache state | `utilities/sheetCache.js:189`, `:210`, `:271` |
| Completion, timing emission, fire close | `engineErrorCount`, `auditIssues`, `phaseTimings`, `cycleId` | `phase01-config/godWorldEngine2.js:193`, `:378`, `:865` |

The part-3 list covers these **initial** inputs; `businessClosures` and `auditIssues` must be saved as their full structures, despite the heading calling them scalars. MediaIntake's `intakeProcessed` is an output (`mediaRoomIntake.js:89`), not another missing initial input. No tail state mutation requires resuming the RNG stream; retaining `ctx.rng.draws` would preserve the diagnostic at `godWorldEngine2.js:872`.

**Ledger timing:** `initSimulationLedger_` performs a fresh Sheet read (`phase01-config/initSimulationLedger.js:43`) and builds a clean ledger (`:48`). Reloading after the ledger range has successfully landed is correct for MediaIntake's ledger reader (`mediaRoomIntake.js:391`) and BusinessArchive's active-employee check (`applyBusinessDynamics.js:745`). An executor return alone is insufficient proof of success (Finding 5). A second resume must not replay the original ledger range after an archive has deleted ledger rows; durable executor receipts must precede those archives.

**Missing continuation state has a concrete loss path:** CitizenArchive deletes eligible rows, then may raise the POPID high-water mark for a hand-appended citizen (`utilities/archiveCitizenExits.js:229`, `:242`). `persistPopIdHighWater_` adds a new cache write and changes config (`utilities/popIdAllocator.js:94`). If CitizenArchive is receipted and the process dies before cache flush, the next attempt restores the **old** part-3 queues/config and skips CitizenArchive. The higher mark is lost, and its source citizen has already left the active ledger. A phase-name receipt does not carry this write.

The same omission breaks the 131-phase convention: safe-phase timings and error counters are updated during the first resume. Skip a receipted phase on attempt two while restoring only the original 126 timing entries, and its timing disappears. Repeating the executor wrapper can instead introduce a second executor timing. Newly logged errors can disappear from the final summary even though their Engine_Errors rows remain.

**Required design change:** A durable completion receipt must include the phase result, logical timing, and every continuation delta needed after skipping it, including added cache writes/config updates and error aggregates. Restore those deltas before continuing. Persist them together with the completion decision; do not publish the completion name first. Merge timings by scheduled phase identity, with retry overhead separately recorded. Define ledger success/reload and receipt ordering explicitly.

### 2. BLOCK — Manifest-last is useful, but save exceptions and terminal cleanup still have undefined recovery states.

**Plan:** parts 2, 4–6 (`docs/plans/2026-07-31-platform-ceiling-resilience.md:172`, `:174`, `:175`, `:176`).

The three arithmetic branches now use C, and the late-save choice is explicit. That closes the former unused-cost issue. It does not make all exits equivalent:

| Interruption | Consequence under the written design | Missing rule |
|---|---|---|
| Chunk save throws before a ready manifest | No `{checkpointed:true}` outcome exists | Existing inner `finally` flushes queued world writes and repairs the counter; outer `finally` closes the fire. The promised failed-save state with counter N−1 is not protected by a success-only exit flag. |
| Manifest lands, record write or trigger creation throws | Valid checkpoint exists, but successful outcome may never return | Same finalizers can execute the normal flush/close despite a pending checkpoint. Part 10's trigger-failure fallback depends on suppressing them. |
| Nonempty manifest/chunks are invalid | Part 4 treats this as “no checkpoint” | Distinguish absent from corrupt/incomplete/unsupported state. A record/counter that otherwise admits N+1 must not silently discard unfinished required writes. |
| Manifest becomes `committed`, then process dies before fire close | Part 6 accepts only `ready`; part 4 treats non-ready as absent | A close-only recovery must reconcile the original fire and final result without rerunning writes. |
| Chunks clear, then fire-record write fails | Recovery payload is gone and the old fire record remains | Durable terminal result and an idempotent record-reconciliation step must survive cleanup. |

The existing behavior behind the first two rows is `phase01-config/godWorldEngine2.js:837` (cache flush), `:858` (counter repair), `:425` (outer flush and close). Normal finalization must be suppressed **before beginning checkpoint persistence**, including save-failed and ready-but-unscheduled outcomes. Explicitly flush/verify the checkpoint's own writes before publishing success; skipping the normal world flush is not a substitute for establishing checkpoint durability.

The manifest schema also lacks the named `late` flag, persisted attempt counter, trigger identity, and final result. A `build` field without a compatibility check does not protect a pending payload from a deployment. Specify generation/target/build validation and prevent overwriting any unfinished generation. Define recovery of staged chunks, terminal manifests, and mismatching fire records separately; they are not all absence.

**Cost details:** C must measure elapsed milliseconds for the defined durable checkpoint operation, not serialized size (part 3 currently calls that measurement C). State whether manifest validation, record publication, and trigger work are included or reserved separately. The counter begins at admission, after lock/open (`godWorldEngine2.js:415`, `:419`, `:420`); recording entry elapsed without using it leaves that overhead outside the bound. The late branch remains best effort. Saving the ledger before the checkpoint is an unmeasured contingency that creates another commit stage; the claimed tenfold reduction and unchanged state model are not established by code.

**Required design change:** Publish a transition table for absent/staging/ready/resuming/terminal/failed-save states, with a durable owner and recovery action at each write boundary. Use an explicit lifecycle outcome in both finalizers. Retain a terminal result until record reconciliation and cleanup are repeatable. Preserve the builder's three branches and numbers.

### 3. BLOCK — Manifest-first admission needs a complete engine.275 and web-result contract.

**Plan:** parts 4–6 and 8 (`docs/plans/2026-07-31-platform-ceiling-resilience.md:174`).

Part 4's explanation of today's duplicate window is false: a `running` record for N with Sheet count N−1 is refused at `phase01-config/godWorldEngine2.js:310` **regardless of elapsed guard time**. A VM probe confirmed refusal an hour beyond the window. If the counter already reached N, the next target is N+1; that is the pending-tail hazard manifest-first handling must prevent. A wall kill in earlier phases likewise does not automatically rerun today's Cycle; clearing/reconciling admission is required.

The proposed routing is sound in direction, but leaves these interfaces unspecified:

- **Lock and dispatch:** `runWorldCycle` currently assigns an admission then unconditionally runs the full body (`godWorldEngine2.js:420`). A resumed result cannot masquerade as an admission. Introduce distinct admitted/checkpointed/resumed/refused outcomes and a resume core that assumes the lock is held. The trigger wrapper acquires the lock; inline admission calls the core without reacquiring it or starting the full Cycle afterward.
- **`expect`:** current web admission compares it with the raw counter before examining the record (`godWorldEngine2.js:281`). During recovery, the same generation can have counter N−1 or N. Specify whether the original request's N−1 remains valid after the flush; reject unrelated expectations. Manifest-first must not become permission for any syntactically valid `expect` to resume an unrelated generation. Authentication remains before routing (`utilities/webTrigger.js:33`).
- **Record and guard:** add `checkpointed` to the allowed states and unfinished-record shape (`godWorldEngine2.js:236`, `:300`), preserve the original N/start time, and validate their agreement with the manifest. Resuming N must not consume the override for a new Cycle N+1. Ordinary later admission must still honor the guard window and consume an override only after recording admission (`:318`, `:333`). Part 8's “only” same-Cycle test omits these gates.
- **Retry ownership:** “two attempts” requires a durable attempt count and a defined re-arm after the first attempt fails or cannot acquire the lock. A one-shot creation does not describe that policy. Retain a stable exhausted state and alarm; a third invocation must not silently become a new Cycle. Bind trigger identity to generation; handler-name deletion alone does not identify one particular trigger.
- **Web result:** current `doGet` ignores the runner return and sets `ok:true` after it returns (`utilities/webTrigger.js:43`). The new checkpointed success meaning is an intentional API change and must reach callers. Specify the final manifest result schema/access path, including original Cycle/generation, terminal state, merged timing entries, errors, and elapsed-vs-active durations. The existing response also carries globals for engine diagnostics and citizen archive (`:47`–`:56`); these are absent in a fresh trigger execution unless serialized/restored or expressly removed from the contract. Emitting timings then clearing chunks does not itself store a readable final result.
- **Manual reset:** current `clearfire` deletes only the fire property (`utilities/webTrigger.js:115`); it knows nothing of checkpoint generations or triggers. With manifest-first routing it cannot be presented as a complete reset procedure. Specify how deliberate recovery reconciles both stores under the same lock.

**Required design change:** Define admission/resume as a single locked state machine, plus an explicit response schema and generation-aware reset procedure. Test the four combinations of raw counter N−1/N and original/stale `expect`, with guard on/off and override present/absent. Preserve the original admission timestamp while using a fresh execution clock for the resume budget.

### 4. BLOCK — A matching append tail cannot receipt a whole sheet, and phase receipts do not cover an interrupted phase.

**Plan:** part 7, qualified by part 11 (`docs/plans/2026-07-31-platform-ceiling-resilience.md:177`, `:181`).

**Mixed-operation loss:** `executeSheetIntents_` catches a failed cell/range and continues into append processing (`phase10-persistence/persistenceExecutor.js:365`, `:394`, `:399`). The same updates group can contain both: engine.94 queues Generic_Citizens Emerged cells (`phase05-citizens/updateCivicApprovalRatings.js:1716`) and new pool rows (`:1784`). Attempt one can fail the cell and successfully append. Attempt two sees the saved batch at the tail. “Equal → ... skip and list” for `(updates, Generic_Citizens)` would receipt the missing cell as committed.

**Local proof using the actual executor:** synthetic cell `[2,2]` was rejected; the batch appended successfully; the cell remained `0` instead of requested `7`; typed tail equality was true. This is a demonstrated executor behavior, not a deployed checkpoint test.

If “skip” was intended to mean only the append, state that explicitly: replay/verify every other required operation and publish the sheet receipt only when all succeed. Preserve the executor's ordering and grouped batch normalization. Replace/ensure are currently a priority-sorted operation loop, not a per-sheet loop (`persistenceExecutor.js:79`, `:97`); several operations for one tab must not be collapsed into a receipt after only the first.

**Other unresolved windows:**

1. Content equality does not establish append identity. The exact same batch could already be the last k rows before this operation. No pre-append tail position/length or operation identity is saved. This is a counterexample to the general “exact” guarantee, not a claim that a specific current fixture already collides. Record enough pre-write evidence to distinguish already-present content from this operation landing.
2. If an append lands but receipt persistence fails, continuing to later writers can move the tail. Phase-11 MediaIntake appends Media_Ledger (`phase07-evening-media/mediaRoomIntake.js:672`), also an executor target. A subsequent last-k comparison can then append the original batch twice. Receipt failure must stop before downstream writers, outside the catch-and-continue safe-phase contract, or dedup must locate an identified batch independently of the current tail.
3. A completed BusinessArchive receipt prevents replay after a later CitizenArchive failure. It cannot protect a kill **inside** BusinessArchive, between its copy and deletion/receipt (`phase05-citizens/applyBusinessDynamics.js:779`). Similar unsafe gaps remain in CitizenArchive (`utilities/archiveCitizenExits.js:205`, `:216`, `:236`), LifeHistory trim (`utilities/archiveLifeHistory.js:207`), and intake (`mediaRoomIntake.js:241`). engine.285 is genuinely filed (`docs/engine/ROLLOUT_PLAN.md:132`), but automatic retry of an unreceipted interrupted phase still depends on those hazards. Either make the relevant phase resumable or mark it started and require reconciliation rather than blindly retrying it. Do not claim phase-name receipts resolve the intra-phase case.
4. The existing batch retry recomputes its append address (`persistenceExecutor.js:439`). A landed write with a lost acknowledgment can duplicate inside the first attempt before a successful sheet receipt exists. A later receipt/tail check cannot remove those duplicates. Filing this under engine.285 does not establish a zero-duplicate resumed executor.

**Typed comparison:** Dates converted to bare ISO strings collide with literal ISO strings. `false`, `0`, and empty string must remain distinct; define null/undefined handling. `getValues` can return Dates, numbers, booleans, or strings, and `setValues` interprets an initial `=` as a formula. Saved input is therefore not universally identical to readback, even after padding. Define supported cell values and how formula/readback coercion is handled; do not claim JSON equality proves typed equality. [Google Range reference](https://developers.google.com/apps-script/reference/spreadsheet/range).

**Required design change:** Separate operation completion from content comparison; preserve type tags; stop on ambiguous write/receipt outcomes. Normal-fire **dedup reads** can remain zero by branching before all dedup work. Total normal-fire reads are not zero-extra because manifest-first admission itself adds a read. Resume-only dedup also deliberately leaves ordinary-fire retry hazards outside Task 5's protection.

### 5. BLOCK — Part 8 catches reported executor errors, but does not define failure of the persistence tail as a whole.

**Plan:** parts 6 and 8 (`docs/plans/2026-07-31-platform-ceiling-resilience.md:176`, `:178`).

Reading `ctx.persist.executionStats.errors` after a normally returning executor works: stats are saved at `phase10-persistence/persistenceExecutor.js:174`, and `utilities/writeIntents.js:366` clears the three queues, not those stats. That is a real improvement over HEAD's discarded return.

Four qualifications prevent the proposed line from being sufficient:

1. **Wrong state name:** with counter N and `fire.commitProblem`, `closeCycleFire_` produces **`failed`**, not `unpersisted` (`phase01-config/godWorldEngine2.js:397`). `unpersisted` means the counter differs (`:394`). A VM probe confirmed `failed`. The record at `:404` carries no sheet/problem text; only the error log does. “The record names the sheet” requires a record/schema change or a durable result pointer.
2. **Missing stats is not success:** an unexpected executor exception before `:174` is swallowed by `safePhaseCall_` (`godWorldEngine2.js:159`). The early no-context/mode returns also do not install executionStats (`persistenceExecutor.js:54`, `:66`). Capture the phase success result and validate stats; do not rely on an unchecked property access or an empty/default errors array.
3. **Phase 11 is persistence too:** all four writers are wrapped with `safePhaseCall_`. A thrown archive/intake write currently becomes a tolerated phase error. A completion receipt must not be written simply because the wrapper returned. The failed/tolerated distinction must follow required-write outcomes, including returned partial results, cache failures, and receipt failures; it cannot be only “simulation phase versus executor stats.”
4. **Failed writes versus cleanup:** part 6 still transitions the manifest to `committed` and clears payload before closing a problematic fire. A known missing write then loses its recovery payload, possibly after archives changed row layout. “Counter advanced, so N+1 admits” describes today's possible forward-progress policy, subject to guard/expect; it does not establish that the checkpointed Cycle committed. Conversely, keeping a ready manifest means manifest-first routing resumes N instead of admitting N+1. Choose and document the failure disposition rather than asserting both.

**Required design change:** Define success for each required persistence stage; retain a recoverable or explicitly reconciled failure state and final result. Do not run destructive dependent phases or publish `committed` after a failed required predecessor. Specify the policy for partial world advancement, correct the engine.275 state names, and make admission agree with that policy. Ordinary tolerated simulation errors may remain tolerated.

### 6. FIX — The serialization contract needs recursive types, exact cache shape, and a bound on the stored cell.

**Plan:** parts 3–4 (`docs/plans/2026-07-31-platform-ceiling-resilience.md:173`). No codec is implemented yet; these are requirements for the proposed codec, not allegations against nonexistent code.

- Dates occur inside two-dimensional intent values and cache writes (`phase01-config/godWorldEngine2.js:938`; ledger timestamps at `phase05-citizens/generateCitizensEvents.js:3352`). A JSON replacer checking `value instanceof Date` is insufficient: Date's `toJSON` runs first. A local probe produced ordinary ISO strings for both nested and array Dates. Traverse/tag recursively before JSON encoding, or use an equivalent correct codec. Validate dates and escape collisions with literal objects shaped like `{"$d": ...}`.
- “Everything else is JSON” needs a supported-value contract. Undefined object members disappear, undefined array values and nonfinite numbers become null, and circular/host objects fail. Validate/reject unsupported values before publishing ready. Preserve already-serialized cell strings: `Riley_Digest` WorldEvents is JSON text (`godWorldEngine2.js:1937`), not a nested object to reinterpret on restore. Supporting nested transport objects does not authorize arbitrary objects as Sheet cell values; `utilities/writeIntents.js:406` does not validate that distinction.
- Export both cache queues with tab identity: cell `{row,col,value}`, row `{row,rowValues}`, and append row arrays (`utilities/sheetCache.js:129`, `:145`, `:160`). Preserve queue order, last-cell/last-row semantics, and the flush's full-row-before-cell order (`:223`, `:235`). Import must restore queued-read visibility as queueWrite does (`:133`), without enqueuing twice or losing post-checkpoint deltas from Finding 1.
- Padding must match the executor's **combined per-loop/per-sheet batch**, after priority ordering, not independently pad each intent (`persistenceExecutor.js:84`, `:403`, `:412`). Normalize LifeHistory stamps with the saved summary (`:430`). Freeze the saved write plan so later normalization cannot change the comparison target.
- A 45,000-character `data` string is not a 45,000-character stored `{gen,i,n,data}` cell: escaping expands it. A synthetic 45,000-quote payload encoded to **90,041 characters**. Apply the cap to the final encoded cell, or put metadata in separate columns. Specify Unicode splitting, hash encoding, contiguous indexes, chunk count, and byte-versus-character units. “Rows 2..n” also needs clarification if `n` means number of chunks.

**Required validation:** Round-trip nested Dates, booleans, numeric zero, empty strings, literal ISO strings, literal tag-shaped objects, Unicode, quotes/backslashes, padded mixed-width batches, and actual exported cache queues. Reject corrupt/missing/reordered chunks without returning “no checkpoint.” Measure total save duration separately from payload bytes.

### 7. FIX — The bench comparison is not reproducible as written, and the force seams omit decisive failures.

**Plan:** revised bench at `docs/plans/2026-07-31-platform-ceiling-resilience.md:183`–`:189`.

**Baseline:** two successive fires from one resync do not have the same cycleId; the counter advances. `utilities/cycleModes.js:186` seeds by cycleId, so identical seeds require restoring the same pre-Cycle state. Steps 1–2 actually call for a second resync, contradicting the “one resync” explanation. Re-reading a moving live source is not an immutable A/B baseline either.

`scripts/syncSandboxFromLive.js:10` explicitly leaves bench-only tabs and ScriptProperties alone; `:67` reads unformatted values/date serials and `:127` writes RAW values. It does not restore trigger inventory, fire records, checkpoint state, or all type/format semantics. After restoring count N−1, the prior record for N still refuses admission (`godWorldEngine2.js:310`). After checkpointing, the bench-only checkpoint tab can still route to an older generation. `clearfire` alone cannot reset it. The bench pointer also no longer describes a current live-C110 resync: `docs/reference/DEPLOY.md:59` records a later live-C111-based fixture run. Verify the chosen baseline rather than copying that stale cycle label.

**Necessary correction:** capture one immutable baseline, restore it before A and before B, and explicitly reconcile the bench's admission/carry-state properties, checkpoint tab, and pending triggers. Compare typed input state before firing. Preserve formats where the intended typed readback depends on them. Treat deliberate force/cost config differences and checkpoint control artifacts separately from simulated-world equality.

#### Wall-clock exclusions: the written list is incomplete and has three wrong pointers

| Surface | Evidence / correction |
|---|---|
| WorldEvents_Ledger timestamp | Correct: `phase10-persistence/recordWorldEventsv25.js:45`. |
| World_Config `lastRun` | Missing: queued Date, `phase01-config/godWorldEngine2.js:938`; flushed in the tail. |
| Simulation_Ledger `LastUpdated`, and minted `CreatedAt` | Missing: `phase05-citizens/generateCitizensEvents.js:3352`, `phase05-citizens/checkForPromotions.js:467`, `:468`; consolidated range lands in the tail. |
| Citizen_Archive inherited timestamp columns | Archive copies the source row (`utilities/archiveCitizenExits.js:134`). Exclude only known changed wall-clock columns. The cited `:284` is **restoreCitizenPlan_**, not an archive timestamp written by Phase 11. |
| Riley_Digest column U, nested event timestamps | Missing: serializes worldEvents at `godWorldEngine2.js:1937`; events include `timestamp:ctx.now` at `phase03-population/generateCrisisBuckets.js:183`, `phase05-citizens/applyBusinessDynamics.js:645`. Mask defined timestamp paths or freeze the input clock; do not exclude the whole event payload. |
| Initiative_Tracker `LastUpdated` | Whole-tab comparison includes earlier direct timestamps (`phase05-citizens/civicInitiativeEngine.js:727`); this is also a tail target via `phase02-world-state/applyInitiativeImplementationEffects.js:442`, `:486`. A tail-written-tab comparison includes cells written before the tail. |
| Engine_Errors timestamp | `godWorldEngine2.js:117`. Only normalize the clock when comparing equivalent expected errors; never discard unexpected rows or error content. Fault cases legitimately have different error receipts. |
| MediaRoom_Paste A1 | Cited `mediaRoomIntake.js:1272` belongs to **processRawCitizenUsageLogManual**, declared at `:1236`, not the scheduled Phase-11 intake. It is not an ordinary tail exclusion. |
| `cycleFinalizedAt` | Summary-only assignment at `phase09-digest/finalizeCycleState.js:203`, after the persisted snapshot is constructed and assigned at `:198`. No runtime consumer/persisted cell found. Not a demonstrated tail-written cell. |
| Carry_Forward_Store timestamp, if comparing the whole Cycle | `phase01-config/loadPreviousEvening.js:79`; outside the revised tail but relevant if “tabs exported” means all Cycle output. |
| Checkpoint/control output | Generation, save/start/elapsed times, durations, force/C settings intentionally differ. Validate their contracts separately; a checkpoint tab cannot be byte-equal between normal A and checkpointed B. |

This table proves the proposed four-entry list is insufficient. Build the final comparator's explicit column/path inventory from all selected targets and the concrete baseline; do not certify an exhaustive exclusion list from these four pointers. In-world LifeHistory timestamps must remain compared (`persistenceExecutor.js:430`, `utilities/archiveLifeHistory.js:107`).

#### Force and interruption matrix

| Proposed seam | Required completion of the bench contract |
|---|---|
| Force 1, initial measurement | C defaults to zero and arming requires nonzero C. Specify the bench-only force precedence that permits the first measurement. Measure elapsed save cost, not size, then apply the approved 1.5 multiplier. |
| Force 2, late branch | Force the branch without confusing it with an actual platform kill. Verify durable `late` metadata, both finalizers, and the same recovery protocol. |
| Force 3, save throws | Exercise throws before chunks, mid-chunks, after ready manifest, during record publication, and at trigger creation. One throw before any write does not test Finding 2. Assert counter/queues/record/manifest at each point. |
| Force 4, return before trigger | Useful for inline fallback, provided it takes the checkpoint outcome and suppresses both normal finalizers. Also test actual interruption after ready publication, and the case where a trigger exists but its creation acknowledgment is lost. |
| `checkpointKillAfterSheet` | Distinguish after durable receipt from **write landed before receipt**, and receipt write failed/acknowledgment lost. A clean after-receipt throw proves only the easy branch. Test the mixed cell-fail/append-success case. |
| “Inside a batch” | Define the simulated boundary: before write, landed write with lost acknowledgment, or interrupted retry. Throwing JS before a batch call does not prove partial-service-outcome behavior. Include the executor's own retry address issue. |
| Phase-11/cache/close seams | Missing: archive mid-copy/delete, receipt after new high-water queue, cache flush before/after counter write, terminal manifest before record close, cleanup interruption, and second-attempt timing restoration. |

Bind fault keys to the bench target, not merely their default-zero values. Step 5's two clean fires can measure normal cost and gate arming; they cannot replace the interruption matrix. No bench acceptance is claimed by this review.

### 8. NOTE — Claims resolved by Revision 1, and remaining factual qualifications.

This is the disposition of the revision's other assertions, to avoid reopening already corrected Review 1 findings:

| Claim | Verification against HEAD |
|---|---|
| Twenty producers before the new gate | Twenty scheduled phases between FinalizeCycleState and ExecuteIntents is correct (`godWorldEngine2.js:772`–`:813`); saying all twenty “write direct” is inaccurate. CommitLedger queues a range (`phase10-persistence/commitSimulationLedger.js:25`), and several others queue intents. The reason to move the boundary is valid. |
| Actual queue names; executor clears after errors | Correct: `utilities/writeIntents.js:46`; `persistenceExecutor.js:174`, `:177`. |
| Earlier direct writers | Correct examples: `phase03-population/applyDemographicDrift.js:387`, `phase05-citizens/casinoLedgerEngine.js:873`. Their partial-write exposure is acknowledged. Automatic same-Cycle rerun is not today's admission behavior (Finding 3). |
| Extracted runner writes suppressed | Executor honors dryRun/replay (`persistenceExecutor.js:66`). The broader claim is unsafe: extracted schedule still invokes direct Phase-11 writers (`godWorldEngine2.js:2485`); their entrypoints do not all test mode (`archiveCitizenExits.js:177`, `archiveLifeHistory.js:76`, `applyBusinessDynamics.js:734`). Inline-only gate is correct; do not use that wording as a proof of dry-run safety. |
| Phase-11 no RNG, cache private queues | Reachable tail consumers require no RNG continuation. Whole-file “0 hits” is not a reliable proof because applyBusinessDynamics.js also contains the RNG-using producer. Cache queue closures/no exporter are confirmed at `utilities/sheetCache.js:129`, `:330`. |
| Historical timing arithmetic | Recomputed from `output/engine-sheet/2026-09-20-bench-c115-fire.json`: 132 phases; Phases 1–9 **78,771 ms**, producers **6,820 ms**, executor **12,837 ms**, Phase 11 **31,258 ms**. Executor + Phase 11 is **44,095 ms**, excluding cache flush/close/checkpoint overhead. `DEPLOY.md:59` supports later 190–237 s totals. Total durations alone do not prove attribution of all growth to Phases 1–9/trim, or bound today's worst-case tail at 60 s. Keep the approved reserve and measure it on the revised bench. |
| Writer location, manifest class, hook | Proposed `phase10-persistence/cycleCheckpoint.js` plus an explicit checkpoint row resolves placement in design. `SHEETS_MANIFEST.md:117`, `:119` is the contract. `.githooks/pre-commit:94`, `:102`, `:114` do not implement a general direct-write location check. Precreation remains a deployment prerequisite. |
| Trigger API and scope | `cycleExportAutomation.js:466` really creates a time trigger, with `.create()` at `:469`. `appsscript.json:1` has no explicit oauthScopes; webapp executes as deployer at `:22`. Google documents `script.scriptapp` authorization for trigger creation and `after(60000)` as a minimum delay, not an exact schedule. The proposed chain must finish with `.create()`. Trigger entry can acquire the same script lock; use the separate locked core for inline resume. [ScriptApp](https://developers.google.com/apps-script/reference/script/script-app), [ClockTriggerBuilder](https://developers.google.com/apps-script/reference/script/clock-trigger-builder). |
| Builder reauthorization | Correctly made an explicit prerequisite rather than claimed accomplished. Existing trigger-creation code already references the scope, so neither “the scope is necessarily new” nor “first creation necessarily fails without a fresh authorization” is proven from source. Installed consent and actual deployer identity remain deployment evidence, not source facts. Trigger-failure recovery still needs Finding 2. |
| Six engine.285 hazards filed | The listed code paths and tracker row `docs/engine/ROLLOUT_PLAN.md:132` are real. Filing them does not make their interruption points safe for engine.95 automatic retry; Finding 4 identifies the dependency precisely. |

## Validation and disposition

- AST inventory: both runners contain **131** scheduled safe-phase calls; revised gate leaves **126 + 5**.
- Actual-executor VM probe: failed cell plus successful append yields matching tail and a missing required write.
- Actual-admission VM probe: same-Cycle running record refuses beyond the guard window.
- Actual-close VM probe: advanced counter plus commitProblem yields **failed**.
- Codec model probes: ordinary Date replacer loses nested type tags; a 45k raw chunk can exceed 90k characters after its JSON envelope.
- Source and timing-fixture inspection only; these probes do not prove Apps Script termination behavior, trigger authorization, real-Sheet typing, or bench parity.

**HOLD for design revision.** Preserve the accepted boundary, initial summary set, writer placement, and builder numbers. Resolve Findings 1–5 before implementation; specify the codec and reproducible/faulted bench acceptance in Findings 6–7. engine.285 can remain separately tracked, but automatic retry must either handle its affected operation or stop explicitly for reconciliation.

## Changelog

- 2026-10-08 (codex) — Review 2 against HEAD 5781f462; five BLOCK, two FIX, one NOTE. Requested report only; no code edits or commits.

## Final HEAD check — 2026-10-08 (codex)

HEAD advanced during review to **cae8e860**, through `6148846e` and `cae8e860`. The diff from the reviewed snapshot changes only `docs/reference/DEPLOY.md` and the engine.94 citizen-memory plan. All engine sources and the reviewed engine.95 Revision 1 section are unchanged, so the findings still apply at final HEAD.

**Correction to Finding 7's bench-pointer observation:** concurrent commit `6148846e` now records SANDBOX 1004 resynced from live C110, guard zero, and `clearfire&cycle=112` completed. The old pointer objection is resolved by that documented resync; this review did not independently read the Sheet. The immutable A/B baseline, ScriptProperties/checkpoint/trigger reset, and exclusion-list findings remain. The manifest's `executeAs: USER_DEPLOYING` property cited in Finding 8 is specifically `appsscript.json:21` (line 22 closes that object).

Report reference-existence/line-bounds and whitespace checks passed. Repository-wide `git diff --check` reported existing whitespace in unrelated output files; none were changed by this review.
