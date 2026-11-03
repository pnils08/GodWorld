# Review: weekday "passed over" block → plain readings (civic.47)

Adversarial code review. Read-only: edit no code, commit nothing, push nothing. Write one file: `docs/for-claude-review/2026-11-02-codex-civic-readings-review.md`. First line `VERDICT: PASS` or `VERDICT: HOLD`. Findings carry file:line, severity, and the failing input.

## Context

Same line as your PASS on `2026-11-02-codex-civic-forced-answer-review.md`: the builder wants the city's seats to see a flourishing city, with no forced crisis or failure frame. The weekday pack's condition block labeled every count above zero a "problem" (some residents are always sick; half the hoods are always above the median) and tagged it "[passed over Cn]" when the seat made no move touching it. Builder's go: replace with plain readings.

The change: `output/codex/civic-readings/change.diff` (main working tree → worktree `/root/GodWorld-wt-packet`). Text only, in `scripts/civicProblemContinuity.js`:
- heading "Condition problems at Cn; prior Sunday folds through …" → "Health and safety readings this week (Cn)."
- one line per hood ("87 residents sick; violence above the city middle"), hoods in sorted order, no "[passed over]" tag, passed-over no longer listed first
- footer "No passed-over problem proven." / "No earlier pack proves a displayed condition." dropped; unavailable notes kept in plain words
- `passedOver`, `problems`, `visibleProblems`, `available`, `issues`, `missingFoldCycles` return values unchanged in meaning

## Real output

`output/codex/civic-readings/before.txt` and `after.txt`: the block for mayor, police chief and the 9 council seats on live C114 data, from main and the worktree (`readings.js` produced them).

## Check

1. Correctness. In particular `visibleProblems` now fills per hood group inside the 600 cap: does next week's derivation (prior packs' `visibleProblems`) still read correctly, and can a partly shown hood or the cap produce a wrong or malformed record?
2. Anything else that reads the block's text or the old wording (slice `block()`, BLOCK_CAP clip, prompts, Mara directive, eval, tests).
3. Any pressure or failure wording left in this block.

Not in scope: Mara's directive, program categories and floor, project directors.

## Test state

All civic test files pass in the worktree; two text asserts changed from expecting "passed over" to expecting it absent, with the `passedOver` count asserts unchanged.
