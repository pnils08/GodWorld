# Adversarial Review: Civic Week Boundary Stage Machine (civic.39)

**Target Plan:** `docs/plans/2026-09-21-civic-sunday-stage-machine.md` (civic.39)  
**Reviewer:** `antigravity` (Second-opinion review for `research-build`)  
**Repository State:** HEAD (`1803bf52`)  
**Date:** 2026-09-21  

---

## Top Three Findings (At the Head)

### 1. `cron-civic-gate.js` Makes an Inline LLM Call and Fails Closed (`scripts/cron-civic-gate.js:332`)
- **Plan Claim:** The plan repeatedly states that mechanical close stages — explicitly including the gate — run without models: *"Mechanical stages (fold, petition sweep, vote stamping, gate) never wait on a model"* (line 23); *"Split runClose so the fold, petition sweep, vote stamping, mechanical gate and apply run on the ledger alone"* (Task 2, lines 50–51).
- **Code Reality:** `scripts/cron-civic-gate.js` is **not** purely mechanical. At `scripts/cron-civic-gate.js:332`, it executes an online `callOpenRouter(MODEL, sys, user, 8000)` using `GATE_MODEL_CANDIDATES` (Gemini, Mistral, Claude Haiku, Hermes) to run a sanity-read audit on the assembled write-set. If that model call times out, fails, or parses invalidly, lines 338–340 record a fatal failure (`check: 'sanity-read', detail: 'call/parse failed (fail-closed)'`), line 354 marks the gate blocked, and line 360 exits with code `2`.
- **Consequence:** In `scripts/cron-civic-run.js:1847-1858`, if `cron-civic-gate.js` exits non-zero, `gatePass` is `false` and `--apply` is refused. Simply decoupling the clerk or voice steps in `runClose` will **not** yield a model-free close: an OpenRouter network outage, timeout, or model failure during `cron-civic-gate.js` will block the mechanical close just as reliably as the C108 voice failure did.

### 2. City Clerk Model Call Is Hard-Wired to Enforce 100% Voice Completeness (`scripts/cron-civic-run.js:1768, 1854`)
- **Plan Claim:** Acceptance Criterion 1 asserts: *"Kill or corrupt any one seat's model output: the close still folds moves, sweeps petitions, stamps votes, gates and writes the tracker, and only that seat is marked pending."*
- **Code Reality:** In `scripts/cron-civic-run.js:1758-1789`, the clerk is an inline model call (`callOpenRouter(clerkModel, clerkPersona, clerkUser, 3000)` on `deepseek/deepseek-chat`). Its explicit instruction at line 1768 is: `Checks: (1) every expected office produced statements; (2) no single office contradicts ITSELF within its own statements...`. If any single seat's voice is killed or corrupted, Check 1 is guaranteed to return `false`, causing the clerk's overall verdict to be `"fail"`. Line 1854 requires `if (gatePass && APPLY && clerk.overall === 'pass')`, and line 1939 executes `if (!gatePass || clerk.overall !== 'pass') process.exit(1)`.
- **Consequence:** Under current code, killing any single seat's voice guarantees a clerk rejection and a complete halt of `--apply`. Furthermore, this directly answers the plan's Open Question 75 (*"Clerk verdict — model or deterministic?"*): it is an inline model call today. To satisfy Acceptance Criterion 1, the clerk model check must be either completely removed from the `--apply` gate or relaxed to permit partial seat sets.

### 3. `orBatch.js` Has No Programmatic Export and Auto-Executes CLI Dispatch on `require()` (`scripts/orBatch.js:107-109`)
- **Plan Claim:** Task 3 states: *"extend scripts/orBatch.js to multi-request batches; scripts/cron-civic-run.js... Fix-don't-add holds"* (lines 55, 76).
- **Code Reality:** `scripts/orBatch.js` is currently an unexported standalone CLI script. Lines 107–109 execute immediately on import without an `if (require.main === module)` guard:
  ```javascript
  const cmd = process.argv[2];
  ({ submit, status, fetch: fetchResult }[cmd] || (() => { console.error('usage: submit|status|fetch'); process.exit(2); }))()
  ```
  If `cron-civic-run.js` requires `orBatch.js` (e.g. `const orBatch = require('./orBatch')`), the script will immediately evaluate `process.argv[2]`, fail the lookup, log `"usage: submit|status|fetch"`, and terminate the process with exit code `2`.
- **Consequence:** In addition, line 25 hard-exits (`process.exit(2)`) if `OPENROUTER_API_KEY` is not set, and lines 68–71 strictly format a single request (`requests: [{ custom_id: label, body: reqBody }]`). `orBatch.js` cannot simply be "extended" as a drop-in without refactoring it into an exportable module with separated CLI and programmatic interfaces.

---

## Detailed Findings

---

### (a) Hidden Dependencies Preventing a Truly Model-Free / Network-Free Close

1. **`applyTrackerUpdates.js` Requires Live Google Sheets Network Access Even in Dry Run**
   - **Citations:** `scripts/applyTrackerUpdates.js:505`, `scripts/applyTrackerUpdates.js:68, 88, 94`, `scripts/cron-civic-run.js:1837`.
   - **Mechanism:** In `applyTrackerUpdates.js:505`, the script unconditionally runs `trackerRows = await sheets.getSheetAsObjects('Initiative_Tracker')` via `lib/sheets.js`. It does not read local snapshots (such as `output/beats/Initiative_Tracker.jsonl`). If Google Sheets API experiences latency, rate limits (HTTP 429), or network dropouts, the dry run invoked by `runClose` at line 1837 crashes (`HALT: applyTrackerUpdates dry-run failed`), aborting the mechanical close before any updates can be staged.

2. **`positionWall` Supermemory Network Dependency During Prompt / Pack Construction**
   - **Citations:** `scripts/cron-civic-run.js:66, 1487, 1563`, `scripts/officeWall.js:203-204`, `lib/citizenPage.js:32, 80`.
   - **Mechanism:** In Task 3, `submit` builds seat packs and prompts for the batch. In current code, `runMayorOpen` and `runHearing` call `positionWallInject(officeMap, dir)`, which calls `officeWall.injectBlockForHolder`, which invokes `citizenPage.ensurePagePointer_` and `citizenPage.recentPage_`. Those functions make live HTTP calls to `https://api.supermemory.ai` for every seat. If Supermemory is unavailable or slow during batch assembly, `submit` will fail or inject error strings into the batch prompts.

3. **`runClose` Step 5.5 Completeness Check Halts on Missing Voice Manifests**
   - **Citations:** `scripts/cron-civic-run.js:1748-1754`.
   - **Mechanism:**
     ```javascript
     const vMan = readJson(path.join(CIVIC, 'hearing_c' + cycle + '.json')) || readJson(path.join(CIVIC, 'voices_c' + cycle + '.json'));
     const pMan = readJson(path.join(CIVIC, 'projects_c' + cycle + '.json'));
     if (!vMan || !pMan) throw new Error('missing voices/projects manifest under output/cron-civic/ — run the earlier stages first');
     expected.push(...vMan.results.filter(x => x.ok).map(x => x.slug));
     expected.push(...pMan.results.filter(x => x.ok).map(x => x.slug));
     const missing = expected.filter(s => !voiceJsons[s]);
     if (missing.length) { console.error('HALT: expected voice JSON(s) missing: ' + missing.join(', ')); process.exit(1); }
     ```
     If the mechanical close runs first while voices are in a 24-hour batch, `hearing_c{XX}.json` or `voices_c{XX}.json` will either not exist or lack voice JSONs. `runClose` will throw or halt immediately at line 1750/1754 unless this completeness check is excised from the close path.

4. **`assembleDecisions.js` Requires Voice JSONs to Generate Initiative Decisions**
   - **Citations:** `scripts/assembleDecisions.js:8-11, 37-38`, `scripts/cron-civic-run.js:1796`, `scripts/applyTrackerUpdates.js:478-498`.
   - **Mechanism:** `runClose:1796` runs `assembleDecisions.js --apply`, which iterates `output/civic-voice/*_c<XX>.json` to write `output/city-civic-database/initiatives/<slug>/decisions_c<XX>.json`. If mechanical close runs without voices, `assembleDecisions.js` writes zero decision files. While `foldMovesIntoDecisions` and `petitionGateSweep` stage work and vote decisions, any initiative that moved through other channels has no decision file. `applyTrackerUpdates.js:483-494` then falls back to `findDecisionFiles(CYCLE - 1)` and explicitly strips fold fields (`LastWorkCycle`, `LastWorkSeat`), potentially replaying stale prior-cycle decisions.

---

### (b) Idempotency Holes in `tick`

1. **No Process / State Concurrency Lock on `tick` and `week_state_c{XX}.json` (Batch Double-Submit)**
   - **Citations:** `docs/plans/2026-09-21-civic-sunday-stage-machine.md:43-45`, `scripts/orBatch.js:72-76`.
   - **Mechanism:** The plan specifies that a cheap `tick` runs frequently. However, neither `cron-civic-run.js` nor `orBatch.js` implements file-level locking (`flock` or atomic state locking). If `tick` is invoked while a prior `tick` is waiting for OpenRouter's HTTP response on batch submission, the second `tick` reads `status: "ready"`, submits a second batch to OpenRouter, and generates two active batches billing the account. The second batch write to `week_state_c{XX}.json` overwrites `batchId`, permanently abandoning tracking of the first batch.

2. **Late-Arriving Batch Results After Cycle Boundary Closure**
   - **Citations:** `scripts/cron-civic-run.js:2713`, `scripts/applyTrackerUpdates.js:575, 580`.
   - **Mechanism:** Suppose a model batch for cycle `C108` is submitted with a 24-hour window, but the Sunday mechanical close closes `C108` on schedule and the engine fires `C109`. If the batch completes after the engine advances:
     - If `tick` collects `C108` and invokes any close/apply logic, `applyTrackerUpdates.js` will execute against the live `Initiative_Tracker` sheet, stamping stale `C108` updates over `C109` live engine data.
     - If `tick` instead ignores batches whose cycle does not match `detectCycle()`, the completed batch results and move ledger outcomes are permanently dropped.

3. **Move Ledger Status Appends on Retried Closes**
   - **Citations:** `scripts/applyTrackerUpdates.js:725-728`, `scripts/cron-civic-run.js:2230-2236`.
   - **Mechanism:** When `applyTrackerUpdates.js --apply` completes, it appends status lines (`status: 'applied'` or `status: 'failed'`) to `moves_c{CYCLE}.jsonl`. If `runClose` is re-entered (e.g. because a downstream step failed or `tick` re-ran a partially applied cycle), lines 718–729 append duplicate `applied` entries to the move ledger. While `loadMoveLedgerFolded` resolves last-line-wins for the fold, raw log size inflates and downstream log parsers see duplicate events.

4. **Candidate Initiative Double-Append Risk via Eventual Consistency**
   - **Citations:** `scripts/applyTrackerUpdates.js:640-642, 677-693`.
   - **Mechanism:** In `applyTrackerUpdates.js:640-642`, candidate duplicate checking relies on reading existing keys from `trackerRows = await sheets.getSheetAsObjects(SHEET_NAME)`. If a `tick` run appends a candidate row (`await sheets.appendRows(...)`) and immediately crashes or times out before updating `week_state_c{XX}.json`, a rapid `tick` retry reading Google Sheets before replication finishes may read stale rows where `existingKeys.has(key)` is false, appending a duplicate candidate row to `Initiative_Tracker`.

---

### (c) Failure Modes Missed by Acceptance Criteria

1. **Cycle Rollover In-Flight (State Abandonment)**
   - **Gap in Acceptance Criterion 2:** Criterion 2 only checks running `tick` twice on the *same* cycle.
   - **Failure Mode:** What happens when `detectCycle()` transitions from `108` to `109` while `week_state_c108.json` is still in state `submitted`? The acceptance criteria do not specify whether `tick` scans prior-cycle state files for uncollected batches or strictly adheres to `detectCycle()`. Without a multi-cycle sweep, any batch spanning an engine fire becomes an orphaned zombie.

2. **Batch-Level API Rejections vs. Per-Seat Rejections**
   - **Gap in Acceptance Criterion 3:** Criterion 3 states: *"an invalid or expired result becomes one resubmit in the next window, never an inline retry loop."*
   - **Failure Mode:** This assumes OpenRouter accepted the batch HTTP POST and individual seat outputs failed inside the batch. It does not account for OpenRouter rejecting the batch submission itself (e.g. HTTP 400 Bad Request due to payload size, HTTP 401/402 credit exhaustion, HTTP 429 rate limit). If submission fails, what state does the stage enter? If it sets `failed`, does `tick` re-attempt every tick, hammering the API, or is there an exponential backoff / attempt threshold?

3. **Deterministic Failure Infinite Resubmission Loop**
   - **Gap in Acceptance Criterion 3:**
   - **Failure Mode:** If a seat's pack or persona causes a model to consistently emit text with ungrounded numbers or an invalid intervention, the grounding gate deterministically rejects it on collect. If Criterion 3 unconditionally marks this for resubmission in the next window with the identical prompt, it creates an infinite paid loop across cycles. There is no dead-letter state or max-attempt cutoff specified.

4. **Thinking / Reasoning Token Incompatibility Across Heterogeneous Models**
   - **Gap in Acceptance Criterion 4:**
   - **Code Citation:** `scripts/orBatch.js:66`:
     ```javascript
     if (!process.argv.includes('--reasoning')) reqBody.reasoning = { enabled: false };
     ```
   - **Failure Mode:** On OpenRouter, passing `reasoning: { enabled: false }` works for Anthropic Claude models, but non-Anthropic models (such as `deepseek/deepseek-chat`, `moonshotai/kimi-k2`, or `qwen/qwen-2.5-72b`) reject requests containing unsupported top-level parameters with HTTP 400. In a multi-seat batch containing varied model families, a blanket `reasoning` parameter will fail the entire batch.

---

### (d) Contradictions Between Plan and Code

1. **Elimination of Phase Advancement Authority (Who Advances Initiatives?)**
   - **Plan:** Architecture (line 23) states: *"The hearing/session reports what the close produced and decides nothing; its output is structured."*
   - **Code:** In `scripts/cron-civic-run.js:1639-1640`, `runMayorGavel` is currently the **only** civic voice agent authorized to emit `trackerUpdates.ImplementationPhase` and `MayoralAction`:
     ```javascript
     outputContract('mayor_gavel', cycle, initiatives);
     // "This is the GAVEL. You may now stamp trackerUpdates (ImplementationPhase / MayoralAction) for initiatives that moved. Hearing voices do not stamp."
     ```
     In contrast, `runMayorOpen:1492` and `runHearing:1568` explicitly forbid phase emissions (`forbidPhase: true`). Furthermore, `foldMovesIntoDecisions` only updates `LastWorkCycle` and `LastWorkSeat`, and `petitionGateSweep` only sets `vote-scheduled`. If the close runs before the gavel and the gavel "decides nothing", **no mechanism in the civic simulation ever advances `ImplementationPhase` for active initiatives**. The plan never defines how an initiative moves through its lifecycle phases if the Mayor's gavel is stripped of phase authority.

2. **Inverted Directive Dependency (Directive vs. Close & Prep)**
   - **Plan:** Task 4 (lines 61–63) states: *"The directive is built after the close, aimed at seats that were passed over or have an unanswered demand."*
   - **Code:** In current code (`scripts/cron-civic-run.js:2738`), `runDirective` runs **first**, before `runPrep`:
     ```javascript
     for (const stage of [runDirective, runPrep, runMayorOpen, runHearing, runMayorGavel, runProjects, runClose])
     ```
     `runPrep:488-492` reads `mara_directive_c{XX}_AUTO.txt` and embeds it directly into each seat's decision packet. If `runDirective` is moved to run *after* the close, `runPrep` cannot include the current cycle's directive in seat packs unless seat packs belong to cycle `C+1`. The plan does not reconcile this circular timing dependency.

3. **Complete Omission of `runProjects` Stage**
   - **Plan:** Tasks 1–4 detail `tick`, `runClose`, batching for seats, and `runDirective`.
   - **Code:** `scripts/cron-civic-run.js:1674-1738` defines `runProjects` (Layer 3 project directors for Transit Hub, OARI, Health Center, Baylight, Stabilization Fund). In `runClose:1752`, `projects_c{XX}.json` is mandatory for Step 5.5 completeness. The plan neither schedules `runProjects` nor clarifies whether project directors are batched or eliminated.

4. **Discord Status Check-in (`runStatus`) Expects Legacy State Files**
   - **Plan:** Task 1 adds `output/cron-civic/week_state_c{XX}.json`.
   - **Code:** `scripts/cron-civic-run.js:2766-2782` (`civicStatusLine`) inspects `close_c{XX}.json` and `prep_c{XX}.json`. If `week_state_c{XX}.json` governs the cycle, the Sunday 15:00 status check-in (`runStatus`) will report false alarms to Discord (`❌ City-hall C{XX} has not closed — inputs are on disk but no close record`), confusing the operator.

---

## Recommendations for `research-build`

1. **Refactor `cron-civic-gate.js` Before Declaring Mechanical Close "Model-Free":**
   Add a `--mechanical-only` flag to `scripts/cron-civic-gate.js` that runs deterministic prechecks (phase vocabulary, diff size, contract syntax) and skips check 5 (the `callOpenRouter` sanity read) when invoked from the mechanical fold/sweep stage.
2. **Replace or Isolate the Clerk Verdict:**
   Convert the Clerk check in `runClose` into a deterministic validator (or make it an asynchronous batch stage that audits post-close rather than gating `--apply`).
3. **Restructure `scripts/orBatch.js` with an Exported Library Interface:**
   Separate CLI argument parsing behind `if (require.main === module)` and export `submitMultiBatch`, `checkBatchStatus`, and `fetchBatchResults` methods.
4. **Specify the Phase Advancement Mechanism:**
   Clarify in the plan how initiatives transition through implementation phases if the Mayor's gavel is rendered non-decisional.
5. **Implement Atomic File Locking for `tick`:**
   Ensure `tick` uses `fs.openSync(..., 'wx')` or a cycle lockfile before evaluating state transitions to prevent duplicate batch submissions on rapid cron fires.
