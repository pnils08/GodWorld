VERDICT: HOLD

# civic.47 weekday health and safety readings — Codex review

Scope: `output/codex/civic-readings/change.diff`, the corresponding `/root/GodWorld-wt-packet` implementation, saved C114 before/after text, and the prompt and prior-pack consumers. The normal C114 block has the requested neutral heading, sorted hood lines, and no passed-over or problem wording. Two text paths still misstate the evidence.

## Findings

1. **MEDIUM — The unavailable-data fallback still labels this block a problem.** `scripts/buildCivicOfficeSlice.js:1361-1365` supplies `Problem continuity unavailable` when the board fails to load, confrontation evidence is unavailable, or `loadProblemContinuity` throws. `scripts/buildCivicOfficeSlice.js:1246` and `scripts/cron-civic-run.js:2403-2417` pass that fallback text into the seat prompt. **Failing input → wrong output:** a malformed prior pack causes a load error; the seat sees `Problem continuity unavailable — ...` in the block whose normal text was changed to plain readings. The two changed assertions exercise the successful derivation path and cannot catch this fallback. Rename the fallback in the same wording change.

2. **LOW — A missing move ledger is reported as an unavailable week.** `scripts/civicProblemContinuity.js:82-84` records a missing fold when a prior displayed reading persists but its closed move ledger is absent. The new note at `scripts/civicProblemContinuity.js:98-99` says `N earlier weeks unavailable`. **Failing input → wrong output:** with a valid C114 pack, a still-positive C115 reading, and no `moves_c114` ledger, a local read-only derivation returned `missingFoldCycles:[114]` and `1 earlier weeks unavailable.` The earlier pack and current readings were available; the missing evidence is the move ledger. Name that evidence precisely, with singular/plural wording.

## Other checks

- `scripts/civicProblemContinuity.js:95-111` appends whole hood groups to both text and `visibleProblems`. On the local C114 snapshot with the helper's 600-character cap, 9 hood lines and all 15 records for those hoods were displayed; 13 hoods were omitted with an intact omission note. With `cap:Infinity`, all 22 hoods and 33 positive records were displayed. The actual pack caller passes `BLOCK_CAP = Infinity` (`scripts/buildCivicOfficeSlice.js:21,1275-1290`).
- A read-only synthetic C115 replay using the 600-cap C114 result and a closed C114 ledger produced 15 `passedOver` records, all from the prior `visibleProblems`; its text did not expose the passed-over tag. The prior-pack reader at `scripts/civicProblemContinuity.js:68-84` uses each record's hood, condition key, and count, which the new grouping retains. No partial hood was found in this bounded check.
- `gamePromptView` exposes only the block's `available` and `text` to the model (`scripts/buildCivicOfficeSlice.js:1234-1249`); it does not expose the internal `passedOver` array. No other script consumer of the old text was found in the scoped search. The saved C114 output covers the mayor, police chief, and nine council seats.

Verification: read the brief, diff, implementation, prompt path, and saved output. Ran `git diff --check` on the three changed worktree files, `node --check` on the changed implementation, and the local read-only derivations described above. The task reports all civic tests passing; I did not rerun that suite, contact a model or Sheet, or run a live Cycle. Only this review file was written.
