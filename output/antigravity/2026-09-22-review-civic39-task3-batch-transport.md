# Adversarial Review: civic.39 Task 3 Batch Transport (`9e076842`)

**Date:** 2026-09-22  
**Reviewer:** Antigravity (Standing Review Duty)  
**Target Commit:** `9e076842` (`kimi: civic.39 Task 3 — batch transport for hearing seats (orBatch importable + multi-request; batch-submit/batch-collect stages)`)  
**Follow-up Commit:** `ff52e941` (`kimi: NEXT[kimi] — civic.39 Task 3 landed (9e076842)`)  
**Files Inspected:**
- `scripts/orBatch.js`
- `scripts/cron-civic-run.js`
- `scripts/cron-civic-tick.test.js`
- `docs/plans/2026-09-21-civic-sunday-stage-machine.md`
- `output/kimi/or-pricing-probe.js` (untracked probe script)

**Status:** Resolved in `0f897824` (summary in `03cae03b`)  
**Resolution Commit:** `0f897824` (`civic.39: heal batch-collected seats back into hearing/ledger (agy Finding 2, 9e076842 review)`)

**Test Suites at HEAD (`03cae03b`):**
- `cron-civic-tick.test.js`: 46/46 passed (regression test added for Finding 2)
- `cron-civic-game.test.js`: 54/54 passed
- `cron-work-wake.test.js`: 37/37 passed
- `civicReviewFixes.test.js`: 15/15 passed
- `civicStageBoard.test.js`: 12/12 passed

---

## Executive Summary

Commit `9e076842` delivers the core architecture for OpenRouter batch transport on hearing seats. The pricing probe and model constraint logic strictly obey the builder's 2026-09-21 ruling: only `google/gemini-3.7-flash` (0.50x standard rate, $0.375 / $1.875 per MTok) is enabled for batching, which cleanly scopes batch transport to the three CRC council seats (`COUNCIL-D6`, `COUNCIL-D7`, `COUNCIL-D8`). All other political seats remain synchronous, and `claude-haiku-4.5:batch` is appropriately held out pending an approved live spend probe.

**Review Findings & Resolution (`0f897824`):**
1. **Finding 1 (RETRACTED / CALIBRATION):** Diff-reading false positive on `scripts/orBatch.js:175`. Direct check of `git show 9e076842:scripts/orBatch.js` confirms line 175 already read `ex.usage`, not bare `usage`.
2. **Finding 2 (HIGH — FIXED in `0f897824`):** Batch-collected voices were orphaned from `hearing_c{cycle}.json`, `cityHallLedger`, and downstream `mayor-gavel` / `close` stages. Fixed by adding heal-back logic into `hearing_c`, `voices_c`, and `cityHallLedger`, covered by new regression test in `cron-civic-tick.test.js`.
3. **Finding 3 (MEDIUM — FIXED in `0f897824`):** Missing per-slug `try/catch` in `batchCollectHearing`. Fixed by wrapping the collection step in `try/catch`, ensuring one failing seat cannot abort sibling collection or bypass manifest persistence.
4. **Finding 4 (LOW — FIXED in `0f897824`):** `orBatch.request` lacked an HTTP socket timeout. Fixed with `timeout: 60000` and `req.on('timeout', ...)`.
5. **Finding 5 (LOW — FIXED in `0f897824`):** `orBatch.submitBatch` hardcoded `output/or-batches.jsonl`. Fixed to respect `opts.registry` and `opts.root`.

---

## Ranked Findings

### Finding 1 (RETRACTED / CALIBRATION): `ReferenceError: usage is not defined` in `scripts/orBatch.js:175`

- **File & Line:** [`scripts/orBatch.js:175`](file:///root/GodWorld/scripts/orBatch.js#L175)
- **Status:** RETRACTED (False positive — verified against commit `9e076842`)
- **Calibration Note:**
  During review of commit `9e076842`, the diff on `scripts/orBatch.js` was misread:
  ```diff
  -  fs.writeFileSync(out, text);
  -  console.log(`wrote ${out} (${text.length} chars)` + (usage ? ` usage=${JSON.stringify(usage)}` : ''));
  +  fs.writeFileSync(out, ex.text);
  +  console.log(`wrote ${out} (${ex.text.length} chars)` + (ex.usage ? ` usage=${JSON.stringify(ex.usage)}` : ''));
  ```
  The `-` line held bare `usage` (from prior code), whereas the `+` line had already cleanly updated it to `ex.usage`. Directly inspecting `git show 9e076842:scripts/orBatch.js` confirmed that line 175 already read `ex.usage`. No change was required; retracted for reviewer calibration.

---

### Finding 2 (HIGH): Batch-collected voices are orphaned from `hearing_c{cycle}.json`, `cityHallLedger`, and downstream `mayor-gavel` / `close` stages

- **File & Line:** [`scripts/cron-civic-run.js:1820-1833`](file:///root/GodWorld/scripts/cron-civic-run.js#L1820-L1833) (`batchCollectHearing`), [`scripts/cron-civic-run.js:1864-1873`](file:///root/GodWorld/scripts/cron-civic-run.js#L1864-L1873) (`runMayorGavel`), [`scripts/cron-civic-run.js:1996-2003`](file:///root/GodWorld/scripts/cron-civic-run.js#L1996-L2003) (`runClose`)
- **Severity:** HIGH (Architectural & Downstream Integration Defect)
- **Mechanism:**
  Consider the normal Sunday lifecycle with batch transport:
  1. `batch-submit` submits D6, D7, and D8 at e.g. 18:00.
  2. `hearing` runs at 20:00 (synchronous run for D1–D5, D9).
     Inside `runHearing`:
     ```javascript
     if (batchInFlight.has(slug)) {
       results.push({ dir, slug, model, ok: false, pending: true, error: 'batch in flight ...' });
       return;
     }
     ```
     `runHearing` writes `hearing_c{cycle}.json` and `voices_c{cycle}.json` recording `ok: false` for D6, D7, and D8. Only synchronous seats are appended to `cityHallLedger`.
  3. At 20:15, OpenRouter completes the batch. `tick` runs `batchCollectHearing`.
     `batchCollectHearing` parses results, validates schema and grounding, writes `council_d6_c{cycle}.json`, and updates `manifest.seats[slug].status = 'collected'`.
     **However, `batchCollectHearing` touches neither `hearing_c{cycle}.json` nor `cityHallLedger`!**
  4. Now examine the downstream consequences:
     - **Mayor's Gavel (`runMayorGavel:1868`):**
       `for (const x of (hearingMan.results || []).filter(r => r.ok))`
       Because `r.ok` is still `false` in `hearing_c{cycle}.json`, D6, D7, and D8 are **100% excluded** from the Mayor's gavel transcript! The Mayor never hears or cites them.
     - **Close Stage (`runClose:1999-2002`):**
       `const seatResults = [...(vMan ? vMan.results || [] : []), ...(pMan ? pMan.results || [] : [])];`
       `const pendingVoices = seatResults.filter(x => !x.ok || !voiceJsons[x.slug]).map(x => x.slug);`
       `const arrived = expected.concat(seatResults.filter(x => x.ok).map(x => x.slug)).filter(s => voiceJsons[s]);`
       Because `x.ok` is `false` in `vMan`, `council_d6`, `council_d7`, and `council_d8` are classified as `pendingVoices` and excluded from `arrived`, even though their valid voice JSONs exist on disk.
     - **City Hall Ledger:**
       `output/cron-civic/city-hall-ledger_c{cycle}.json` never receives the hearing rows for D6, D7, D8.
     - **Week State Derivation (`refreshWeekState:3282`):**
       `hearingPending = (hearingMan.results || []).filter(x => !x.ok || !voiceExists(x.slug)).map(x => x.slug)`
       Because `!x.ok` remains true, `refreshWeekState` permanently marks D6, D7, D8 as pending on the hearing stage.
- **Why It Escaped CI:**
  The new tests in `cron-civic-tick.test.js` test `batchSubmitHearing` and `batchCollectHearing` in isolation with a fake client; they never invoke `runMayorGavel`, `runClose`, or `refreshWeekState` on the collected output.
- **Proposed Diff:**
  In `batchCollectHearing`, after landing `voicePath`:
  ```javascript
  // 1. Record in cityHallLedger (idempotent append)
  const seatRow = civicSeat.resolveOfficeRow(officeMap, seat.dir);
  const packRef = districtPackRef(seat.dir, cycle, officeMap, root);
  let ledger = cityHallLedger.loadOrCreate(cycle, root);
  ledger = cityHallLedger.appendHearing(ledger, cityHallLedger.hearingRow(seatRow, v.json, voicePath, {
    seatStatus: civicSeat.seatStatus(seatRow),
    lever: (packRef && packRef.lever) || '',
  }));
  cityHallLedger.save(ledger, root);

  // 2. Heal hearing_c and voices_c manifests if already written
  for (const manName of ['hearing_c' + cycle + '.json', 'voices_c' + cycle + '.json']) {
    const manPath = path.join(root, 'output', 'cron-civic', manName);
    const man = readJson(manPath);
    if (man && Array.isArray(man.results)) {
      const idx = man.results.findIndex(r => r.slug === slug);
      const entry = {
        dir: seat.dir, slug, model: seat.model, ok: true, output: voicePath,
        statements: v.json.statements.length, attempts: seat.attempt,
        seat: seatRow, voiceJson: v.json, lever: (packRef && packRef.lever) || '',
      };
      if (idx >= 0) man.results[idx] = entry;
      else man.results.push(entry);
      fs.writeFileSync(manPath, JSON.stringify(man, null, 2) + '\n');
    }
  }
  ```

---

### Finding 3 (MEDIUM): Lack of per-seat `try/catch` in `batchCollectHearing` can abort sibling collections and corrupt manifest sync

- **File & Line:** [`scripts/cron-civic-run.js:1804-1830`](file:///root/GodWorld/scripts/cron-civic-run.js#L1804-L1830)
- **Severity:** MEDIUM (Error Isolation)
- **Mechanism:**
  In `batchCollectHearing`, the iteration over `for (const slug of slugs)` has no `try/catch` block:
  ```javascript
  for (const slug of slugs) {
    ...
    const hp = await hearingSeatPrompt(seat.dir, cycle, officeMap, initiatives, opts);
    const v = validateVoiceJson(ex.text);
    ...
    fs.writeFileSync(voicePath, JSON.stringify(v.json, null, 2));
    ...
  }
  fs.writeFileSync(batchManifestPath(cycle, root), JSON.stringify(manifest, null, 2) + '\n');
  ```
  If `hearingSeatPrompt` throws (e.g. missing packet file or read failure), or if an unexpected exception occurs while checking or writing, the entire `batchCollectHearing` aborts immediately.
  Consequences:
  1. Any subsequent seats in the same batch are not collected.
  2. `fs.writeFileSync(batchManifestPath...)` is skipped, leaving the manifest on disk stating `status: 'submitted'` even for seats in that batch that were already collected and recorded to disk.
- **Contrast with `runHearing`:**
  In `runHearing` (lines 1561-1603), each seat is explicitly wrapped in `try { ... } catch (e) { results.push({ dir, slug, ok: false, error: e.message }); }`.
- **Proposed Diff:**
  Wrap the body of the `for (const slug of slugs)` loop in a `try/catch`, recording `fail(e.message)` on throw, and ensure manifest persistence in a `finally` block.

---

### Finding 4 (LOW / Operational): `orBatch.request` lacks an HTTP socket timeout

- **File & Line:** [`scripts/orBatch.js:51-67`](file:///root/GodWorld/scripts/orBatch.js#L51-L67)
- **Severity:** LOW (Resilience)
- **Mechanism:**
  `orBatch.request` uses `https.request` with no timeout option and no `req.on('timeout', ...)` handler.
  By comparison, `cron-civic-run.js:867` sets `timeout: 180000` and `req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); })`.
  If an HTTP GET to OpenRouter (`/api/beta/batches/:id`) stalls indefinitely due to network/provider socket drops, `runTick` will hang indefinitely.
- **Proposed Diff:**
  Add a 60-second timeout to `https.request` in `orBatch.js`:
  ```javascript
  const req = https.request({
    hostname: 'openrouter.ai', path: p, method, timeout: 60000,
    headers: ...
  }, res => { ... });
  req.on('timeout', () => { req.destroy(); reject(new Error('OpenRouter request timed out')); });
  ```

---

### Finding 5 (LOW / Operational): `orBatch.submitBatch` hardcodes registry to workspace root

- **File & Line:** [`scripts/orBatch.js:33`](file:///root/GodWorld/scripts/orBatch.js#L33), [`scripts/orBatch.js:106-107`](file:///root/GodWorld/scripts/orBatch.js#L106-L107)
- **Severity:** LOW (Sandbox Hygiene)
- **Mechanism:**
  `const REGISTRY = path.join(ROOT, 'output', 'or-batches.jsonl');` is hardcoded. When `submitBatch` is called with custom `opts.root` (e.g. in test fixtures or sandbox benched runs), it writes to `ROOT/output/or-batches.jsonl` rather than respecting the caller's root workspace.
- **Remedy:** Support `opts.registry || path.join((opts && opts.root) || ROOT, 'output', 'or-batches.jsonl')`.

---

### Finding 6 (INFORMATIONAL): Pricing & Model Inventory Audit

- **Audit Findings:**
  - `google/gemini-3.7-flash:batch` is the ONLY model in `civic-office-map.json` with a `:batch` variant priced $\le 1.0\times$ ($0.50\times$, \$0.375 / \$1.875 per MTok).
  - In `civic-office-map.json`, this maps exactly to:
    - `COUNCIL-D6` (Elliott Crane, CRC)
    - `COUNCIL-D7` (Warren Ashford, CRC)
    - `COUNCIL-D8` (Nina Chen, CRC)
  - All other 8 political seats (`MAYOR-01`, `DA-01`, `PD-01`, `COUNCIL-D1`, `COUNCIL-D2`, `COUNCIL-D3`, `COUNCIL-D4`, `COUNCIL-D5`, `COUNCIL-D9`) remain synchronous on their respective models.
  - `anthropic/claude-haiku-4.5:batch` is held out of `BATCH_PROFILES` pending an approved live spend probe.
  - **Verdict:** Pricing and model constraints strictly satisfy the builder's rulings in `docs/plans/2026-09-21-civic-sunday-stage-machine.md` §Open questions.

---

## Conclusion & Recommendations

The architecture of commit `9e076842` cleanly implements the batch transport separation, local whole-batch validation, and safe polling without inline retries. However:
1. **Finding 1** must be patched before any manual or scripted use of `node scripts/orBatch.js fetch`.
2. **Finding 2** must be patched before the builder installs the crontab schedule for batch submit/collect, otherwise the CRC council seats (D6, D7, D8) will be silenced in the Mayor's gavel transcript and orphaned in `cityHallLedger`.
