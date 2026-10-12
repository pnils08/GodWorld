# Read-only Review: Commit fa5cf0eb..abb7a502 (Task 10 talk-back cut)

**Verdict:** SHIP

Every hunt vector was verified against the code and the spec. No strains misfire, no throws escape, the read boundaries are exact, type edges are safely handled, tests are robust, and the writer's anchor refactor preserves existing logic exactly.

### Findings

**(1) A state that strains when it should not or never strains when it should:**
PASS. Strain correctly requires `state === 'ok'` and `excess > 0`. `ratio` calculates using standard float division (`head.beds / middle`), and `excess` cleanly checks `ratio - 1 - input.band > 0`. A small middle (< 10) correctly defaults to `warming` and avoids strain entirely via the `HOSPITAL_STRAIN_MIN_MIDDLE` threshold. Division by zero is impossible.
*Evidence: utilities/careJusticeAccounting.js:984-990*

**(2) A throw that can escape `applyDemographicDrift_`:**
PASS. The configuration readers (`hospitalStrainCfg_` which can throw on missing keys) and the core logic (`careJusticeHospitalStrain_`, `readHospitalCensusTail_`) execute entirely inside the try/catch block. The catch delegates to `hospitalTalkbackError_` which safely logs using `logEngineError_`, preventing any escape.
*Evidence: phase03-population/applyDemographicDrift.js:225-234*

**(3) A read that can miss Cycle K or read outside Cycles K-8..K or columns A-R:**
PASS. 
*Cycle K-8..K:* The backward row scan evaluates `cv < K - input.window`. It breaks immediately upon hitting the first row strictly older than the window, leaving `first` pointing accurately to the oldest row *inside* the window. Blank rows above the block are correctly skipped without moving the anchor.
*Columns A-R:* `readHospitalCensusTail_` optimizes the `width` based strictly on the 6 requested `names`. If `BedsOccupied` is in its default position (Column M, index 12), `width` resolves to 13. It safely reads columns A-M, a clean and performant subset of A-R. 
*Evidence: phase03-population/applyDemographicDrift.js:480-498*

**(4) Apps Script vs Node type differences (Date or string cells, numbers as strings):**
PASS. Handled flawlessly via `careJusticeWhole_` and defensive bounds parsing. Apps Script Date objects read as epoch milliseconds via `Number()` inside the anchor scan (evaluating to a massive future cycle number that accurately preserves the scan), while `careJusticeWhole_` safely evaluates them as `NaN` -> `null`, properly resolving the final state to `malformed`. 
*Evidence: utilities/careJusticeAccounting.js:908-911, phase03-population/applyDemographicDrift.js:490*

**(5) Weakened or vacuous asserts in the tests:**
PASS. The test mocks simulate precise `city` vs `neighborhood` blocks. Assertions explicitly verify the row arithmetic (e.g., `D24` asserts `wide[0].nr === 9 * 4`), confirm strain bounds correctly (`D13` excess capped at 0.5), and validate nuanced state transitions (`D8`, `D9`, `D18`) without masking evaluation conditions.
*Evidence: scripts/hospitalTalkback.test.js:315-325*

**(6) Anything the writer change (readTail anchor lifted to careJusticeAnchorRow_) breaks:**
PASS. `careJusticeAnchorRow_` iterates exactly the same `cv !== '' && cv !== null && String(cv).replace(/^\s+|\s+$/g, '') !== ''` logic over the exact same `colA` subset. The refactor leaves the Phase-10 `buildCyclePacket.js` logic completely unharmed and identical in behavior.
*Evidence: utilities/careJusticeAccounting.js:892-897, phase10-persistence/buildCyclePacket.js:1181*
