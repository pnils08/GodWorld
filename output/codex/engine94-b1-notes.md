# engine.94 B.1 patch notes

Patch: `output/codex/engine94-b1.patch`, based on HEAD `fc2c52dc`. It is a proposal only; no tracked file was edited, staged, committed, or pushed.

## Read

- `docs/plans/2026-07-31-citizen-memory-perception.md` Track B design B.0, B.1, B.5 (and the adjacent B.2/B.4 acceptance context).
- `phase02-world-state/loadEventContentLedger.js` field table, parser, and fail-closed loader rules.
- `phase05-citizens/generateCitizensEvents.js` whole-tab LifeHistory_Log loop, condition evaluator, bond lookup, and condition scopes.
- `phase04-events/generationalEventsEngine.js` grief cascade producer; `utilities/compressLifeHistory.js` actual grief register writer and DialState serializer; `utilities/citizenMemory.js` DialState round-trip.
- `phase05-citizens/generationalWealthEngine.js` debt-default stamp; `phase01-config/engine94SheetContract.js` self-arm seed and post-write check; `phase05-citizens/judicialLifecycle.js` case schema/cache; `phase05-citizens/runRelationshipEngine.js` active-bond filter; `phase05-citizens/applyBusinessDynamics.js` RoutineRetrenched writer; Phase-5 ordering in `phase01-config/godWorldEngine2.js`.
- Focused test files extended or run: `scripts/contentLedgerLoader.test.js`, `scripts/contentLedgerCompose.test.js`, `scripts/engine94SheetContract.test.js`, `scripts/griefPeriod.test.js`, `scripts/compressLifeHistory.dial.test.js`.

## Patch choices and limits

- The plan points at `generationalEventsEngine.js` as the grief register writer. That file only queues the cascade; `compressLifeHistory.js` writes `MemoryRegisters.grief` in Phase 9. The patch stamps `DialState.grief` in that actual writer and preserves it through both DialState serializers. The stamp becomes visible to the generator on the following Cycle.
- The log pass accepts only exact primary tags from a locked seven-tag set. Ledger Neighborhood wins for a matching POPID; log Neighborhood is fallback. Closure counts come from stamped ledger LifeHistory lines. Judicial counts use the cached Judicial_Ledger rows, so cases opened in the current Cycle may first appear in folk memory after their queued write persists.
- Missing personal stamps/cases yield null scopes; empty hood counts yield zero. `folkMemoryWindow` is seeded as 8 and capped to 12 at runtime. The generator uses 8 for a missing config key in isolated fixtures; live entry self-arms the key before the Cycle.
- No sandbox bench, live Sheet, deployment, or 20k-row timing was run. The engine-wiring card command was attempted with the prescribed Haiku model and `/tmp` output, but failed with `Connection error`; the relevant source pointers above were checked directly. A pre-existing unrelated edit to `phase01-config/engine94SheetContract.js` remains in the shared working tree; the patch is against HEAD.

## Scratch validation

The diff was generated from HEAD copies, then `git apply --whitespace=error --check` passed against a fresh HEAD scratch copy. The patch itself was applied to a separate scratch copy before running tests. `node --check` passed for all nine changed JavaScript files.

| Test | Result |
|---|---:|
| `node scripts/contentLedgerLoader.test.js` | 33/33 |
| `node scripts/contentLedgerCompose.test.js` | 23/23 |
| `node scripts/engine94SheetContract.test.js` | 24/24 |
| `node scripts/griefPeriod.test.js` | 38/38 |
| `node scripts/compressLifeHistory.dial.test.js` | 50/50 |

The fixture assertions cover the eight scopes, null and zero semantics, active sports rivalry, ledger hood precedence and log fallback, log window boundary and 12-Cycle cap, closure stamp, and Judicial_Ledger arrest counts.
