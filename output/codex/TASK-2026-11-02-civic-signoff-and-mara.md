# Two parts: sign-off on three unseen fixes, and a review of Mara's directive (civic.47)

Read-only: edit no code, commit nothing, push nothing. Write two files:
- `docs/for-claude-review/2026-11-02-codex-civic-signoff.md` — first line `VERDICT: PASS` or `VERDICT: HOLD`
- `docs/for-claude-review/2026-11-02-codex-mara-directive-review.md` — findings only, no verdict line

The builder asked for both. All code is on main at `78563e9d8` (committed locally, unpushed; live crons run this tree).

## Part 1 — sign-off on three fixes you have not seen

Each was made after the one re-review your earlier rounds allowed. The builder will not push without your sign-off. Judge only these three; earlier findings you already passed are out of scope.

1. Packet pressure, your re-review finding 1: an older comparison read "this week". Now `scripts/cron-civic-run.js:349` says "since the last reading" (`ailmentPerception`, from `:332`).
2. Packet pressure, your re-review finding 2: `standing.Sentiment` produced a false "mood is slipping". Now `scripts/cron-civic-run.js:341` scans `fields.decaySignals` when present. Tests: `scripts/cron-civic-prep-route.test.js` (standing-only case).
3. Readings, your re-review finding: a raw error message could name a "problem" in seat text. Now `scripts/civicProblemContinuity.js:41,76` use neutral messages; tests `scripts/civicReviewFixes.test.js:207-218` cover a malformed pack and a zero-count prior reading.

Is each fix right and complete? Any new defect? Is anything else seat-visible in these paths still saying "problem", "passed over", "crisis", or something similar?

## Part 2 — review Mara's directive (no change has been made)

Builder direction, verbatim: `docs/plans/2026-10-31-civic-autonomy.md` Changelog, the 2026-11-01 "Builder direction recorded verbatim" entry. In short: civic is not crisis reaction; the city is flourishing; crisis can happen and be taken on, but is not required; an initiative can be a small good thing.

The path: `runDirective` (`scripts/cron-civic-run.js:996`), its brief (`:1023`), the user prompt (`:1185-1220`), target selection (`directiveTargetSeats :948`, `seatUnansweredDemands`, `PETITION_VISIBILITY_LINE :926`), the block filter (`filterDirectiveBlocks :978`, five required fields including Silence consequence), the persona `docs/mara-vance/IN_WORLD_CHARACTER.md`, and where her output lands: Sunday packets (`:507-516`, `:762-768`) and the weekday confrontation (`scripts/buildCivicOfficeSlice.js`, `confrontation` / `YOU HAVE AN UNANSWERED DIRECTIVE` in `datawakeUserPrompt`). Real output: `output/mara-directives/mara_directive_c111_AUTO.txt` through `c114`, and `output/cron-civic/directive_c111.json` through `c114.json` (targets and reasons).

Report:
1. Every place in this path that forces a crisis, failure, or must-act frame on the seats, with file:line and the real output that shows it.
2. Target selection: in C114, 7 of 10 elected seats were named, all for "stall clock" (`NextActionCycle ≤ C+1`) on 11 initiatives. Is that a real signal or a data artifact? Check the tracker's NextActionCycle values against the C113–C114 board.
3. What downstream depends on her output (confrontation ids, answer moves, the readings block's answer handling, the gate, the week carry). What would break if the Silence consequence field were dropped or the brief changed.
4. The smallest change options that would match the builder direction, each with what it touches. Do not pick one; the builder decides.
