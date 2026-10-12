# Read-only diff review — engine.254 Task 10 slices (no edits)

Target: `git diff e4f42227..48e974d2` — scripts/beatSliceKit.js, scripts/buildSafetySlice.js, scripts/buildHealthSlice.js, scripts/buildNeighborhoodSlice.js, scripts/buildEconomicSlice.js, scripts/buildCivicDomainSlice.js and their tests.
Context: docs/plans/2026-09-21-care-and-justice-system.md §"Task 10 handoff" (the data map); the census writer utilities/careJusticeAccounting.js.

Verify each claim against the code with file:line evidence, PASS or FAIL, then a verdict SHIP or HOLD. Write the review to docs/research/2026-10-02-agy-task10-slices-diff.md in the same shape as docs/research/2026-10-02-agy-engine278-diff.md, then stop.

1. `censusTrail` reads only `IntakeType === 'all'` rows and never sums a typed row on top of them; a `city` row never folds into a hood line; a row whose `Completeness` is not `complete` contributes no numbers and the line prints "numbers withheld".
2. Every hood trail line ends in tracked names off the ledger, or the literal "none tracked", or "tracked residents not named on this beat" when `TrackedOccupancy` is positive with no name.
3. No POPID or case ID (`J-C<n>-POP-<n>`) can reach a fact `text` from `courtCases`, `receiptHookFacts`, `treasuryWeek`, `censusFacts` or `debtPattern`; they live only in `src`.
4. `sportsSubject` keeps a GAME-clock, SPORTS_OVERRIDE or athlete-role citizen out of every people list and every name in a fact, in all five slices.
5. `courtCases` joins the fine to the case by the COURT-NAMED note (`case <id>, …`) for the current Cycle only; a case not touched this Cycle and not in custody never rides.
6. `treasuryWeek`: opening = `BalanceAfter` of the last row before this Cycle (or the first week row minus its amount when none); closing = last row this Cycle; outflows are APPROPRIATION/RENEWAL or negative amounts; PREFUNDED never counted; the totals reconcile.
7. `debtPattern` parses `DialState` soft (string or object; unparseable = no default), uses the engine's line `DebtLevel >= 5`, and narrows every count to the hood when one is given.
8. The circular require between beatSliceKit and buildEconomicSlice is safe in both entry orders (`node scripts/buildEconomicSlice.js` as main; a seat that requires the kit first) — say why.
9. The three new tabs are hard-required by safety, health, neighborhood and economic (fail loud on a missing file like the other tabs) and soft in the civic domain slice; `output/beats/` on disk now carries all three files.
10. `hooksForBusiness`, the safety `domainHooks` regex and Maria's unchanged hooks regex: no hook class that reached a desk before is lost.
