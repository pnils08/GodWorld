# Brief for agy — re-review: does the engine.349 build match the plan you reviewed?

From research-build, 2026-11-17. Read-only: no edits, no commits, no model runs. Write your review to `output/antigravity/2026-11-17-review-dials-diff.md`.

## What to review

The diff `git diff 71975a90f d8b7a951a -- phase01-config phase05-citizens utilities scripts/dialMoves.test.js scripts/dialWrongReads.test.js scripts/hoodIncome.test.js scripts/dumpBeatTabs.js scripts/dialPulse.js` — three commits: `4e2e075b0` (Task 6: speed keys, Dial_Moves / Dial_Pulse), `6eb7bdb51` (Task 2 a–d: wrong reads), `d8b7a951a` (Name on a Dial_Moves row). Plan: `docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md` §Tasks 2 and 6, §Plan review reconciled (your findings and what was done with each).

Bench evidence (SANDBOX 1004, C117 fired three times from fresh live syncs): `output/research-build/e349-bench-run.log`. Live code vs live code + Task 6: 1,077 of 1,077 DialState cells identical; 437 Dial_Moves rows = the 437 citizen-dial differences; 0 Engine_Errors. With Task 2 and the 13 marks at 107: PASS, 0 errors, 475 rows = 475 differences.

## The job

1. **Weakened or missing.** For each of your plan findings marked "taken" in §Plan review reconciled, open the code and say DONE, PARTIAL or NOT DONE with file:line. In particular: the settle floor (`utilities/citizenMemory.js` `settleCycle_`) and the pending-swing test (`utilities/compressLifeHistory.js`, the `moodPending` loop) — do they move together; the catch-up settle in `foldNewEntries_`; the config read (`readDialTuning_`) — can it throw inside Phase 9; `buildDialMoves_` — can it throw past its try/catch, and what does it do on a malformed DialState cell.
2. **Trick code.** Any assert in the two new test files that cannot fail, or that pins the bug instead of the fix. Any silent fallback that hides a failure (a `typeof … === 'function'` guard that turns a missing global on Apps Script into "feature off" with no log).
3. **Apps Script reality.** These files run as Apps Script globals, not Node modules. Name anything that works in the Node tests and would not on Apps Script: a helper only exported for Node, load-order dependence between `citizenMemory.js`, `citizenDialMap.js`, `compressLifeHistory.js` and `initSimulationLedger.js`, ES6 in an ES5 file.
4. **The third fire diverged from the second** (993 DialState cells differ; one more owner-door mint). My reading: the re-signed lines (12 "avoided … crowds" lines now `PrevEvening-Outabout-Down-S`, 3 business draw lines) feed `utilities/neighborhoodPulseMap.js` by their written tag, the hood pulse moves, and the Cycle's seeded draws follow. A replay of the fold on the third fire's own data under old and new code differs on 176 citizens (17 permanent: the 13 + 4 streaks that now complete; 159 swing only). Attack that reading: is there another path by which this diff changes a draw before Phase 9?
5. **The live repair still to come.** After the deploy the 13 rows POP-01029–01041 get `DialState.folded` set from 133 to 107 on the live ledger. Anything in this diff that makes that unsafe on live as opposed to the bench.

## Not wanted

No rewritten code, no new mechanics, no restating the plan. A claim without a file:line or a number you produced is not a finding. Say what you could not open or run.
