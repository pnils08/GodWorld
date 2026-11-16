# Review: pipeline.110 Task 8 part 1

**Verdict: HOLD**

The representation change works for the current builder and the named live rows, but suppressing work receipts for every `complete` row is not reconciled with the initiative clock contract. There is also a live row whose `complete` phase conflicts with its latest milestone record, making this phase-only close decision consequential.

## Findings

### F1 — Completed staged rows still run the upkeep and untended clocks

`lib/initiativePhaseContract.js:538-565` applies `tendFactor` to every `Standing` and `Delivering` row without excluding `complete`; `lib/initiativePhaseContract.js:784-814` likewise lets `complete` rows enter the untended clock (only `stalled`, `blocked`, `suspended`, and `defunded` are excluded). `complete` is terminal in `LIFECYCLE` (`lib/initiativePhaseContract.js:35-55`), but it is not terminal to these clocks.

Input: a staged `Standing`/`Delivering` tracker row has `ImplementationPhase: complete`; after Task 8, the director stops filing work moves, so `LastWorkCycle` no longer advances. Output: phase intensity continues to be applied while upkeep decays and eventually the untended clock can stall the row. That may be intended for a completed service that still requires tending, but the new `initiative-closed` handling implies no further work and currently has no exception or documented resolution in the shared contract. The two current completed rows have blank `Stage`, so they are outside these clocks today; this is a future/other-row regression risk, not a demonstrated effect on INIT-003/006.

### F2 — Phase-only closure relies on a live row whose outcome and milestone history conflict with its phase

`scripts/cron-work-wake.js:184-191` treats the exact `complete` phase as sufficient to rename the node and omit the work move, without checking the row’s other fields. In the live `output/beats/Initiative_Tracker.jsonl` row for INIT-006, `ImplementationPhase` is `complete`, but `Outcome` is `PASSED`, not `COMPLETED`; the milestone history includes a C115 order saying no construction milestone passed and remediation, hotline, dust-control, and workforce oversight continue, followed by `C115: closed.` (`output/beats/Initiative_Tracker.jsonl:5`).

Input: a row is marked `complete` while its outcome and earlier C115 milestone records describe an incomplete review and continuing oversight; output: the branch describes the project as complete, says there is nothing left on the books, omits any next action, and files no work move. The final `C115: closed.` entry may resolve the earlier evidence, so this does not by itself prove a false positive in runtime behavior. It does show that `ImplementationPhase` is the sole authority for the close branch even where the live row’s other fields disagree. INIT-003 has `complete`/`COMPLETED` and blank stage, and is consistent with the branch’s completion premise.

## Requested checks

1. **Callers and consumers:** `NODE_BUILDERS` is consumed by `buildWorkPack` in `scripts/cron-work-wake.js:210-230`; `pack.blocks` is joined as text in prompt construction at lines 449 and 481; `pack.nodes` is consumed by `workMoveLine` at lines 247-250. Repository search found no other `NODE_BUILDERS` or `buildWorkPack` consumer under `scripts`, `lib`, `dashboard`, `phase*`, or `utilities`. The object form is unwrapped centrally, and the new `initiative-closed` name does not trigger the work-move gate. No current other builder returns an object. The generic `typeof block === 'object'` path does not validate `text` or `node`, though that is not an observed break with current builders.

2. **Terminal phase and live rows:** `complete` is the only terminal value at the end of the three positive lifecycle arcs in `lib/initiativePhaseContract.js:35-55`; the negative phases are explicitly down states and should not be treated as successful closure. The exact lowercased comparison is aligned with `canonicalizePhase` normalization. Current live rows with this phase are INIT-003 and INIT-006. INIT-003 has `Outcome: COMPLETED`; INIT-006 has `Outcome: PASSED` and the conflicting C115 milestone cited in F2. Both currently have blank `Stage`, so neither is exposed to the staged clocks in F1.

3. **Sunday fold and clocks:** The fold in `scripts/cron-civic-run.js:3211-3255` collects explicit `work` moves and stamps `LastWorkCycle` only for an initiative that has one. Thus omitting this move does not break folding or write an incorrect receipt; it deliberately leaves the last-work value unchanged. The current INIT-003/006 rows have blank `Stage`, and both already have `LastWorkCycle: 115`, so the contract’s staged untended/upkeep paths do not act on them. F1 describes the general staged-row interaction that remains unresolved.

4. **Test gaps:** The added block in `scripts/cron-work-wake.test.js:209-219` checks one synthetic exact-lowercase `complete` row, latest milestone extraction, absence of stage/next-action text, renamed node, and null work move. It does not assert compatibility across all existing string-returning builders after the generic object normalization; test the full pack’s `blocks` values are strings and node names remain the configured names. It also omits mixed-case phase normalization, empty milestone/outcome, or the live contradictory `complete`/ongoing-milestone shape. The existing builder test at `scripts/cron-civic-game.test.js:1094-1120` invokes the builder directly and does not exercise `buildWorkPack`’s object adaptation. No tests establish the intended `complete` + `Standing`/`Delivering` clock behavior.

## Wiring card

Required command attempted:

`node scripts/runEngineAgent.js --agent engine-wiring --model anthropic/claude-haiku-4.5 --task "Target: initiative-project"`

The command exited with `[FATAL] Connection error`; no wiring card was produced. This review therefore does not claim wiring-card verification.

## Scope and verification

Reviewed commit `5634525f9`’s `scripts/` diff against current source and the current local beats dump. No code was edited. No tests were run. The wiring-card request was attempted but unavailable due to the connection error.
