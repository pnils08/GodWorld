# agy brief — pipeline.115 diff read (engine-sheet, 2026-11-22)

**Read-only. Do not edit any file except your review output.** Write your review to `output/antigravity/2026-11-22-review-pipeline115.md`.

## What changed

Two commits: `8230195fe` and `3f016a164` (`git show` both). Plan: `docs/plans/2026-11-22-engine-out-of-the-sims-mouth.md`.

Builder's ruling (2026-11-22): city hall seats, reporters and Jax stop reading the engine as a speaker ("The engine's own review flags this", "Engine review HIGH"), stop getting a "move the phase or take a fail phase" order (contradicts the builder's 2026-11-03 ruling that a stuck reading carries no demand), stop seeing `output/engine_audit_cN.json` file pointers as their sources, and stop getting the audit checker's own written angle/hook lines. The record's words, metric names, severities and IDs STAY (builder 2026-10-18: engine words are never contamination — do not flag their presence).

## Attack these

1. **Identity.** `buildWorldSummary.js` now writes desk-signal refs as `<sheet> row(s) N; finding C<cycle>-<i>; storyline …`; `beatSliceKit.recordRef` converts an old `engine_audit` ref to the same string. Find any reader that keys on `ref` (dedup, `takenRefs`, `priorBeatKey` in `newsroom-fanout.js`, `buildCivicDomainSlice.js` :609 / :761, stink-scanner, Rhea, storyline tag parsing, `validateCanonFacts` / `refFile` / `refCycleNum` in `cron-desk-run.js`) that breaks or collides with the new form.
2. **Jax.** `buildJaxSlice.js` finds the audit pattern by `patterns[i]` or `finding C<n>-<i>`; `toRecordRefs` rewrites the written slice. Does any Jax path still need the raw pointer from the written JSON (`cron-desk-run.js` `loadJaxSlice`)?
3. **Picks.** `framed: true` replaces the checker-angle presence in the stink score (+3) and the fanout lead. Is any other reader's choice changed by `handle.angle` / `hookLine` now being absent (economic, safety, health, civic-domain slices)?
4. **Leaks left.** Any remaining place a seat, reporter or Jax receives "engine" as a speaker, an order to move/fail a phase, an `engine_audit` path, or a checker-written angle — in `scripts/`, `lib/`, `.claude/agents/civic-office-*`, `.claude/agents/freelance-firebrand`.
5. **Seat sentences.** `cron-civic-run.js` `ailmentPerception`: the new `improvement` case and default case. Any pattern type where the sentence is now false or empty?

For each finding: file:line, what breaks, the concrete input. Verdict line: `SHIP` / `SHIP-WITH-FIXES` / `HOLD`.
