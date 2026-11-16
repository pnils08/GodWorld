# Brief: codex diff review — pipeline.110 Task 8 part 1 (commit 5634525f9)

Review the diff `git show 5634525f9 -- scripts/` against the code. Adversarial.

Claim: on an Initiative_Tracker row with ImplementationPhase `complete`, the `initiative-project` node in `scripts/cron-work-wake.js` returns `{ node: 'initiative-closed', text }`; `buildWorkPack` accepts that object form; `workMoveLine` then files no work move (it requires `initiative-project` in pack.nodes). Two registry role lines in `scripts/work-wake-packages.json` lost stale project state.

Check:
1. Any other caller of NODE_BUILDERS or consumer of pack.nodes / pack.blocks that breaks on the object form or the new node name (grep scripts lib dashboard phase* utilities).
2. Is `complete` the only terminal phase that should take this path (lib/initiativePhaseContract.js)? A false positive/negative case on the live rows (`output/beats/Initiative_Tracker.jsonl`).
3. Does dropping the work move on a complete row break the Sunday fold or any decay/untended clock that reads LastWorkCycle for completed initiatives.
4. Test gaps in `scripts/cron-work-wake.test.js` new block.

Out of scope: part 2 (position written as outcome) is held; G-EC51 readback parroting is recorded, not built.

Write findings to `docs/archive/for-claude-review/2026-11-13-codex-pipeline110-task8-review.md`. Do not edit code.
