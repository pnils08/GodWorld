# TASK — agy: adversarial code review of the engine.214 PROD candidate vs live @147 (2026-10-19)

**From:** engine-sheet. **Mode:** read-only on code. No sheet writes, no fires, no deploys, no commits, no edits outside your output file.
**Output:** `output/antigravity/2026-10-19-review-engine214-prod-candidate.md` — verdict line (SHIP / SHIP-WITH-FIXES / HOLD), then one line per vector with file:line evidence.

## The diff

Live @147 = `output/engine299/prod-stage-4p-8acd5f30/` (byte-identical to a `clasp pull --versionNumber 147`). Candidate = HEAD. Exactly ten files differ:

- engine.214 / 287 / 288 stack: `phase02-world-state/applyCityDynamics.js`, `phase02-world-state/applyInitiativeImplementationEffects.js`, `phase08-v3-chicago/v3NeighborhoodWriter.js`, `phase09-digest/finalizeCycleState.js`, `phase01-config/engine94SheetContract.js`, `phase01-config/loadPreviousEvening.js`, `phase01-config/godWorldEngine2.js`
- engine.299 main-only: `phase05-citizens/runNeighborhoodEngine.js` (a7564342, 014f31bc), `phase05-citizens/processAdvancementIntake.js`, `utilities/chaosCarsConfig.js` (7acb6a25)

Read each with `diff -u output/engine299/prod-stage-4p-8acd5f30/<file> <file>`. Design and rulings: `docs/plans/2026-10-10-engine-214-mood-per-hood.md` (Design, Tasks, §Tasks 17/18/19, §engine.288); engine.299: `docs/plans/2026-10-18-event-engines-move-dials.md`.

## Vectors

1. **Determinism:** any `Math.random`, `Date`-seeded draw, or new fallback path in the diff (`.claude/rules/engine.md`: `ctx.rng` only).
2. **Write path:** any sheet write outside Phase 10 intents that is not on `docs/engine/SHEETS_MANIFEST.md` §9.
3. **Gates that can't fire** (`docs/SIM_DOCTRINE.md` §15): every new or changed threshold in the diff — name its input and whether that input's live range can cross it.
4. **Carry keys:** the new `PREV_STORY_SEEDS` / `PREV_CONTRACT_SEEDS` blobs — stamped, ring-backed, refused when stale or unstamped, loud when lost (`loadPreviousEvening.js`, `finalizeCycleState.js`). Any path where a missing blob silently reads as empty.
5. **Cluster removal:** after PROD the five `clusterAnchors_*` World_Config rows are deleted on live (Acceptance 6). Does anything in the candidate tree, or in `scripts/` / `lib/` / the crons, still read them or the old cluster names?
6. **Silent fallbacks / trick code:** weakened asserts, swallowed errors, defaults that hide a dead input, tests that pass on the stub only.
7. **engine.299 three:** the pool edit cannot leave an empty or unsigned pick; the Estuary rename keeps key `pge_truck` everywhere it is read; the Intake keyword maps only the role it names.

Verify against code; report a claim as unresolved when the code doesn't settle it, and name the read that would.
