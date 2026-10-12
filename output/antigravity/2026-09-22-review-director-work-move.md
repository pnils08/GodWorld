# Adversarial Review: Commit 217fffba — Director Work-Wake Shift Moves

**Target Commit:** `217fffba` (civic.38 ruling (d): a project director's work-wake shift files a work move on their own initiative)  
**Author:** `engine-sheet`  
**Reviewer:** `antigravity` (Standing review duty, civic.38/.39)  
**Repository State:** HEAD (`217fffba`)  
**Date:** 2026-09-22  

---

## Executive Summary

Commit `217fffba` addresses a real operational gap identified on 2026-09-22 in `SESSION_CONTEXT.md`: under Builder Ruling (d), project directors were moved off the political datawake rota onto work-wake packages (`initiative-project` data node). However, `cron-work-wake.js` only generated reflections and had no mechanism to file work moves into the civic move ledger. Consequently, `LastWorkCycle` was never stamped for director-led initiatives (`INIT-001`, `INIT-002`, `INIT-005`), leaving them exposed to walk the 12-cycle untended stall clock unopposed post-conversion.

Commit `217fffba` implements:
1. Node-tracking in `buildWorkPack()` so packs record the active nodes that rendered content (`nodes: ['initiative-project', ...]`).
2. `workMoveLine(pkg, pack, cycle, date)`: constructs a deterministic `work` move (`moveId: MV-<cycle>-<persona>-<date>`, `type: 'work'`, `payload: { initiativeId, source: 'work-wake' }`, `status: 'pending'`).
3. Integration in `wakeOne()`: appends the move to `output/cron-civic/moves/moves_c<cycle>.jsonl` via lazy import of `appendMoveLedger` from `cron-civic-run.js`.
4. Unit tests in `scripts/cron-work-wake.test.js` validating move emission, same-day dedup, beat absence handling, and full end-to-end Sunday fold execution (all 34 tests passing).

The mechanism is compact, conforms to the Sunday fold contract, and prevents initiative abandonment. However, an adversarial audit reveals two integration risks tied to scheduler limits and execution order.

---

## Ranked Findings

---

### Finding 1 (HIGH): Move Emission Remains Blocked by Crontab Concurrency Limit (`LIMIT=1`)

* **Files & Lines:**
  * [`scripts/cron-work-wake.js:210`](file:///root/GodWorld/scripts/cron-work-wake.js#L210)
  * [`scripts/cron-work-wake.js:272-280`](file:///root/GodWorld/scripts/cron-work-wake.js#L272-L280)
  * [`crontab -l`](file:///etc/crontab)

#### Mechanism
`workMoveLine()` is only invoked inside `wakeOne()` when a package is selected and executed by `selectDue()`.
In `scripts/cron-work-wake.js`:
```javascript
const LIMIT = Number(arg('limit', null)) || 1;
...
return { picks: due.slice(0, opts.limit || 1), note: due.length ? 'rota' : 'nothing due' };
```
Because the crontab executes without `--limit`:
```bash
18 20 * * 2,4 /usr/bin/node /root/GodWorld/scripts/cron-work-wake.js >> ...
```
Only **1 package** is executed per crontab run.

#### Consequence
Even though `workMoveLine()` now correctly generates a move *when* a director wakes, directors are in competition with non-director packages (Jonas Patel, Narang, Clarissa Dane, Travis Coles, Mark Aitken) in the same LRU queue.
- On Tuesday, 7 packages are due; only 1 runs.
- On Thursday, 8 packages are due; only 1 runs.
A project director (e.g. Vanessa Tran-Muñoz on `INIT-002` or Marcus Webb on `INIT-001`) may be passed over for weeks at a time. The code fix exists, but the scheduling pipeline will starve the directors of moves, allowing `LastWorkCycle` to grow stale and triggering the untended stall clock anyway.

**Recommendation:** Update crontab or `LIMIT` in `cron-work-wake.js` to execute all due packages (or pass `--limit=4`).

---

### Finding 2 (MEDIUM): Asymmetric State Persistence on Partial Failure

* **Files & Lines:**
  * [`scripts/cron-work-wake.js:272-291`](file:///root/GodWorld/scripts/cron-work-wake.js#L272-L291)

#### Mechanism
In `wakeOne()`:
1. `page.appendReflection_()` writes the citizen reflection doc.
2. `appendMoveLedger()` writes the `work` move to `moves_c<cycle>.jsonl`.
3. `sheets.appendRows('Reflection_Intake', ...)` attempts an external Google Sheets API call.

If step 3 fails (e.g., Sheets API rate limit, invalid OAuth token, or socket hangup):
- `wakeOne()` throws an unhandled exception.
- `main()` catches the fatal error or aborts before updating `state.recent` and `state.wokenCycle`.
- However, the `work` move in step 2 **has already been written to the disk ledger**.

#### Consequence
Upon recovery or retry on a different calendar day, a second move with a new `moveId` will be appended. While the Sunday fold groups work moves by initiative and collapses them safely into a single `LastWorkCycle` write, the state file becomes desynchronized from the actual move ledger.

---

### Finding 3 (NOTE - VERIFIED SAFE): Deduplication & Sunday Fold Compatibility

* The move structure strictly adheres to the schema required by `cron-civic-run.js`:
  ```json
  {
    "moveId": "MV-108-proj-oari-2026-09-22",
    "cycle": 108,
    "date": "2026-09-22",
    "agentDir": "proj-oari",
    "popid": "POP-01021",
    "type": "work",
    "payload": { "initiativeId": "INIT-002", "source": "work-wake" },
    "status": "pending",
    "at": "2026-09-22T06:15:48.000Z"
  }
  ```
* `loadMoveLedgerFolded()` indexes by `moveId` (last line wins), ensuring same-day retries are byte-safe and idempotent.
* The lazy `require('./cron-civic-run')` inside `if (mv)` successfully isolates the large 3.3k-line module from non-director wake executions.
* Tests in `scripts/cron-work-wake.test.js` comprehensively verify the fold output (`LastWorkCycle` and `LastWorkSeat` stamped cleanly).

---

## Conclusion & Next Actions

Commit `217fffba` is an essential and correctly designed patch for director work tending.
To make it operational in production, **the crontab / `--limit` execution ceiling must be raised** so that directors actually wake on their designated duty days.
