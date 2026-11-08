# engine.338 Task 2a — final diff rereview of `1869536c4`

Scope: the fold over `673e8be44` in `phase05-citizens/applyGameNightMoments.js`, `scripts/gameNightMoments.test.js`, and `docs/SPREADSHEET.md`. One local source/fixture review; no new Sheet, Apps Script, sandbox, or PROD call.

## Findings

**R1 — blocks — `phase05-citizens/applyGameNightMoments.js:463-470,499-514,584-586`; `phase01-config/godWorldEngine2.js:159-169,624,860`; `phase10-persistence/commitSimulationLedger.js:25-36`.** F1 is closed for ClockMode, EconomicProfileKey, RoleType, and Income: `sportsRetire_` now checks columns and config at `:291-295` before changing them. The claim that a refusal leaves the **row** untouched is false. The NAMED loop calls `write` before the retirement preflight; `write` appends the type line to `LifeHistory` and holds its `LifeHistory_Log` row in a local array. The throw is caught by `safePhaseCall_`, so `:584-586` never appends that log row. If any other phase marks the shared ledger dirty, Phase 10 can persist the unpaired life line. A synthetic local failure probe with the ledger already dirty confirmed GAME/key/role/Income unchanged, one new `[Sports-Sociability-Up-S]` life line, and zero log writes. That breaks this file's `:437-438` paired-evidence rule and can duplicate the type line on a later fire. **Fix:** preflight the retirement before the NAMED `write`, then retain the existing type-before-milestone order on success; assert the entire LifeHistory and log are unchanged on refusal.

**R2 — should-fix — `phase01-config/godWorldEngine2.js:78-85,111-126,159-169`; `phase05-citizens/applyGameNightMoments.js:281-282,294-295,507-514`.** The missing-key and missing-column throws contain neither POPID nor citizen name. `safePhaseCall_` passes only those messages and the phase label to `Engine_Errors`; `NamesUsed` remains on the separate feed row and can name several people. A failed retirement cannot be located from its Engine_Errors row alone. **Fix:** include the resolved POPID/name in the thrown retirement preflight error while preserving the underlying key or column detail.

## Fold disposition

- **F1:** retirement cells fixed; R1 leaves the prior named line/log boundary open. `docs/SPREADSHEET.md:111` also overstates that a missing key refuses the retirement “whole.”
- **F2:** unchanged. Dry-run and replay call `runCyclePhases_` without the production self-arm (`godWorldEngine2.js:2090-2123,2198-2233,505`). A pre-seed simulation with a retirement still returns an incomplete result after the caught error; F1's permanent off-clock state is gone. This is a tooling ceiling, not evidence of a production-entry failure.
- **F3:** missing Tier/Income headers now throw before retirement-cell mutation (`applyGameNightMoments.js:291-295`); the test covers missing Income only (`gameNightMoments.test.js:289-296`). R1 also applies to this throw. A blank Tier value still takes the `null` path (`applyGameNightMoments.js:278-280`); the C114 local snapshot showed no invalid GAME Tier.
- **F4:** closed: both config keys, ranges, defaults, and meanings appear in `docs/SPREADSHEET.md:109-116`.
- **F5:** re-fire Income and selected refusal cells are now asserted (`gameNightMoments.test.js:253,283-296`), but the refusal test checks zero **Retirement** lines, not unchanged LifeHistory or paired log integrity. The first bench readback reports config values as strings (`output/engine-sheet/2026-11-07-e338a-reads.jsonl:1`; bench reader `output/engine-sheet/2026-11-07-e338a-bench.js:87-92`), so it confirms seeded values and successful consumer behavior, not a direct typed `ctx.config` readback.

## Verification boundary

`node scripts/gameNightMoments.test.js` passed; `node --check phase05-citizens/applyGameNightMoments.js` passed. The first bench artifact is for `673e8be44`; at this rereview, the second bench log for `1869536c4` shows push, sync, and plant through C115, with no completed fire/readback yet. The fold adds no normal-path Income re-price or RNG draw; the successful Tier 1/2/3 path remains covered by the focused test. The existing generated wiring card predates this cut; source lines above trace the current writer, phase wrapper, and persistence handoff under the one-file write limit.

HOLD
