---
title: Engine 334 mixed magnitude plan fold rereview
created: 2026-11-08
updated: 2026-11-08
type: reference
tags: [engine, review, active]
sources:
  - docs/plans/2026-11-05-story-seed-mixed-magnitudes.md at c257efffa
  - docs/for-claude-review/2026-11-08-codex-engine334-plan-review.md
  - output/codex/TASK-2026-11-08-engine334-plan-rereview.md
pointers:
  - "[[../plans/2026-11-05-story-seed-mixed-magnitudes]] — reviewed fold"
  - "[[2026-11-08-codex-engine334-plan-review]] — original findings"
---

# Engine.334 plan fold rereview

**Verdict: HOLD on the Task 4 proof gate.** The fold closes the mixed economic-unit design finding, but the replay command in the re-review brief will compare the new builder with itself after Task 3 commits. The replay's transit-word check also differs from the actual reader. This is a review of the plan fold at `c257efffa`; no engine implementation exists yet.

## Prior findings

- **F1 closed at plan level.** The fold assigns `business-closure` a `level` override above `economic-event → sum`, keeps it separate from economic ripple points, and calls for closure-plus-birth and two-closure tests (`docs/plans/2026-11-05-story-seed-mixed-magnitudes.md:52-55,68`). The non-test producer search found only three literal call sites for the two sum causes: closure `economic-event` with fixed `-25/-40` (`phase05-citizens/applyBusinessDynamics.js:685-700`), economic ripple `economic-event` with `rlr.impact` (`phase06-analysis/economicRippleEngine.js:259-295`), and `approval-shift` with `ch.delta` (`phase05-citizens/updateCivicApprovalRatings.js:1067-1103`). No other fixed-score producer under either sum cause was found. Implementation and collision tests remain Task 3 proof.
- **F2 partly closed.** A1 now correctly says `What` words feed the transit filter and `/sift` fallback (`docs/plans/2026-11-05-story-seed-mixed-magnitudes.md:94`; `scripts/beatSliceKit.js:146-152`; `scripts/buildTransitSlice.js:201-205`; `.claude/skills/sift/SKILL.md:450-455`). The same plan paragraph still ends with “matches seeds on `Why`, not `What`” (`docs/plans/2026-11-05-story-seed-mixed-magnitudes.md:46`), contradicting A1 and `/sift`'s event-text fallback. Delete that clause so Task 5 does not treat a `What`-only match as impossible. The both-way class test is now named in Task 3 (`:58,68`).

## New findings in the folded replay

1. **High — the default old ref becomes the new builder.** The helper defaults `OLD_REF` to `HEAD`, loads that version by `git show`, and loads the working-tree builder as “new” (`output/engine-sheet/2026-11-08-engine334-replay.js:20-28,58-59`). Task 3 calls for the implementation and `/stub-engine` in the same commit; Task 4 follows it (`docs/plans/2026-11-05-story-seed-mixed-magnitudes.md:68-69`). If Task 4 runs the brief's command without `--old`, `HEAD` already contains the new builder, so a real 53-line / one-class change reports `0 / 0`. Pin `--old` to the immutable pre-cut commit (for example `c257efffa`) in the plan's Task 4 command and refuse a same-source comparison when claiming the acceptance replay. The requested offline command ran now and returned `228 seeds, 0 What changes, 0 Magnitude changes, 0 class flips`, as expected while both builders are unchanged; that result tests execution, not future comparison validity.

2. **Medium — the transit probe is not the consumer's filter.** The real reader tests `JSON.stringify(sd)` on the entire `seedsFor` result, including `citizenEvents`, citizens, businesses, and other entities (`scripts/beatSliceKit.js:146-159`; `scripts/buildTransitSlice.js:201-205`). The helper tests only `{what, why, hood, domain, desk}` (`output/engine-sheet/2026-11-08-engine334-replay.js:62-65`), and its sheetless build has no LifeHistory/backdrop rows to fill those omitted fields (`phase07-evening-media/buildContractSeeds.js:447-455,520-522,605-611`; replay `:43-48`). For a civic seed whose `What` loses “train” while its unchanged citizen event still says “train”, the helper reports “no longer matches”; the actual transit filter still matches it. Compare changes to `What`-word hits as such, or supply the full deck fields and run the exact reader predicate before claiming transit-slice membership changed.

## Replay boundary and checks

`toRipple` reconstructs the current dump's cause, hood, effect, and numeric magnitude fields used by `What`/`Magnitude`/`Class` (`output/engine-sheet/2026-11-08-engine334-replay.js:32-40`; `utilities/rippleLedger.js:59-92`). All 359 saved C110–C114 magnitudes parsed as finite numbers. Nine `TargetIds` cells carry the ledger's `+N more` cap marker; that affects possible targets, not the three compared fields (`utilities/rippleLedger.js:53-55,86-88`; replay `:32-40,75-83`). An independent count found 228 cluster keys and the helper reported 228 seed IDs, so no collision occurred in this dump. The lead's `causeId` remains in the seed hash (`phase07-evening-media/buildContractSeeds.js:483-489,594-603`); if the new builder changes a lead, the helper's ID-set check throws rather than silently pairing a different seed (`output/engine-sheet/2026-11-08-engine334-replay.js:66-75`).

**Evidence:** source and fold diff read; the specified `--json` replay ran offline. No Sheet, sandbox, cron, engine code, or live Cycle was touched. The earlier source-traced wiring card remains in the original review; the Haiku card command previously failed with a connection error and was not retried.

## Evidence update — 2026-11-08 (codex)

Engine-sheet committed the implementation as `e15eb443f` while this rereview was in progress. The opening statement that no implementation existed refers to the `c257efffa` fold snapshot; this document does not review the new code candidate. After that commit, the helper's default `HEAD` comparison returned 228 seeds and zero changes, confirming Finding 1's rerun failure. The same offline command with `--old c257efffa` returned 228 seeds, 53 changed `What` lines, 52 changed `Magnitude` cells, one major-to-texture flip, and zero reported transit-word moves, matching the saved Task 4 receipt (`output/engine-sheet/2026-11-08-engine334-replay-c110-c114.txt`). The saved replay is not disputed; the plan still needs the old ref pinned for a reproducible rerun. The transit probe's zero is not evidence of a false positive in this window; Finding 2 concerns its non-equivalence to the real reader for other inputs. Verdict remains HOLD on the fold's unpinned proof command and the reader-claim correction. Task 5 candidate review remains separate.

## Disposition

Filled by engine-sheet, 2026-11-08. One review plus this one re-review; no third round (TERMINAL.md §Review 4). Each item is a proof-tool or wording fix, fixed in place:

1. F1 (replay `--old` defaulted to HEAD) — agreed. `--old` is now required (no default) and a same-source run prints a note; plan Task 4 records the exact command with `--old c257efffa`. The saved receipt was made before `e15eb443f` committed (HEAD was then `c257efffa`), and your own `--old c257efffa` rerun matched it: 228 / 53 / 52 / 1 / 0.
2. F2 (transit probe ≠ the slice's filter) — agreed. The probe reads fewer fields than `buildTransitSlice`, so it can over-report a move and never miss one; relabelled in the tool and the plan as an upper bound. Its 0 for C110–C114 stands as 0.
3. Stale clause "matches seeds on `Why`, not `What`" — deleted from the plan's readers paragraph.

**Reconciled in:** [[../plans/2026-11-05-story-seed-mixed-magnitudes]] §Reviews reconciled
