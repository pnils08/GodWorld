HOLD

1. **The read-before is true, and a fourth case exists (short-run rewrite).**
   - **Evidence:** `phase10-persistence/buildCyclePacket.js:1210-1216` (`careJusticeTargetProblem_`); `utilities/careJusticeAccounting.js:776-850` (`careJusticeWritePlan_`).
   - **Severity:** Medium.
   - **Detail:** The three unseen cases (skip, equal-length rewrite, append) are real because the target check bounds itself to the cells the write covers (`span`). A fourth unseen case is a short-run rewrite: if a short block (e.g. 10 rows) is replaced by a full block (216 rows), `careJusticeTargetProblem_` checks exactly 216 rows. An orphan located immediately below the new block (at `startRow + 216`) is unseen.

2. **The after-outcome check throws falsely on a healthy tab (stale anchor).**
   - **Evidence:** `docs/plans/2026-09-21-care-and-justice-system.md:903` (cut text: "if the tab's last row is past the anchor").
   - **Severity:** Critical.
   - **Detail:** If the check reuses the anchor from the pre-write `readTail()`, that anchor is stale after any write (append, gap blocks, short-run rewrite). The tab's new last row is `anchor + 216`. The check scans the newly written valid block, finds the Cycle number, and falsely throws `row N below it holds "110" with no Cycle`. 

3. **A throw after a successful write spams Engine_Errors permanently.**
   - **Evidence:** `phase01-config/godWorldEngine2.js:159-170` (`safePhaseCall_`), `godWorldEngine2.js:789`.
   - **Severity:** High.
   - **Detail:** The write succeeds, and the next Cycle's R2-7 read is unbroken (it reads the valid block). However, because `safePhaseCall_` catches the false throw and logs a `medium` error to `Engine_Errors`, every single healthy write will log a false alarm, spamming the tab 52 times a sim-year and breaking diagnostics.

4. **Reusing the skip attempt read is fatally stale.**
   - **Evidence:** `docs/plans/2026-09-21-care-and-justice-system.md:903`.
   - **Severity:** Critical.
   - **Detail:** Same mechanism as Finding 2. The old read does not know the tab just grew, leading it to flag the newly written block as an orphan.

5. **The tests pass by matching the false throw, proving nothing.**
   - **Evidence:** `scripts/careJusticeCensus.test.js:228-231` (loose `throws` matching) and `docs/plans/2026-09-21-care-and-justice-system.md:903-906`.
   - **Severity:** High.
   - **Detail:** The tests expect a throw when an orphan is present. Because the stale anchor causes a false throw on the newly written block, the test catches this false throw. If the assertion uses loose substring matching (like `"with no Cycle"`), it passes, hiding the fact that the check flagged valid data instead of the orphan. The tests would fail if the check were deleted (no throw), but their passing does not prove correct behavior.

6. **Leaving the column-A scan unbounded risks an instant OOM crash.**
   - **Evidence:** `phase10-persistence/buildCyclePacket.js:1165-1181` (`readTail`).
   - **Severity:** High.
   - **Detail:** `getLastRow()` counts whitespace. A single stray space at row 50,000 forces the column-A scan to read 50,000 cells. Worse, the full-width orphan check would read `50000 - anchor` rows × 22 columns into memory, which would instantly exceed Apps Script memory limits and crash the engine. The scan must be bounded (e.g. scanning only the last 3,000 rows upwards).
