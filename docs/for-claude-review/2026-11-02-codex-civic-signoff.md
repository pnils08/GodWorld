VERDICT: PASS

# civic.47 three-fix sign-off — Codex

Scope: only the three fixes named in `output/codex/TASK-2026-11-02-civic-signoff-and-mara.md`. The reviewed source is present at `78563e9d8`; current HEAD `ab1abc7bb` makes no subsequent change to these files. This signs off the fixes, not the separate Mara directive review.

1. **Older comparison wording — PASS.** `scripts/cron-civic-run.js:332-349` now describes a math-imbalance as movement “since the last reading.” `scripts/engine-auditor/detectMathImbalances.js:153-175,256-263` supplies deltas and `priorCycle`, which may be older than one cycle; `scripts/cron-civic-prep-route.test.js:35-41` checks the new phrase. An older prior audit no longer becomes the false claim “this week.”
2. **Standing-only false mood fall — PASS.** `scripts/cron-civic-run.js:336-345` scans `fields.decaySignals` when present instead of the whole `fields` object. The producer adds `Sentiment` to that array only when its measured delta crosses the decay threshold (`scripts/engine-auditor/detectMathImbalances.js:153-163,256-263`). A `standing.Sentiment` entry with no Sentiment decay signal therefore cannot emit “the mood is slipping”; the exact case is asserted at `scripts/cron-civic-prep-route.test.js:42-43`.
3. **Readings error suffix — PASS.** `scripts/civicProblemContinuity.js:39-41,75-76` now throws neutral messages for an unknown territory and a prior shown record with zero count. `scripts/buildCivicOfficeSlice.js:1328-1330,1361-1365` still appends diagnostics, but those two known error paths no longer inject “problem” into the neutral fallback. `scripts/civicReviewFixes.test.js:209-218` checks both malformed-array and zero-count prior packs and rejects `problem` in the resulting text.

The scoped source search found no remaining `problem`, `passed over`, or `crisis` in the seat-visible prose of these three corrected cases. The JSON field `problemContinuity` remains in `scripts/buildCivicOfficeSlice.js:1246`; it is an existing machine key, not an instruction or condition label. Other `ailmentPerception` branches describe distinct high-severity pattern types and were outside these three fixes. The Mara directive is reviewed separately.

Verification boundary: read the changed source, producer, tests, and target brief. I did not rerun tests, call a model, read a Sheet, run a live Cycle, or change code. Only this review and the separately requested Mara review were written.
