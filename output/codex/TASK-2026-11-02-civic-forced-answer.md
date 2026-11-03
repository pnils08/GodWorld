# Review: civic forced-answer removal (civic.47)

Adversarial code review. Read-only: edit no code, commit nothing, push nothing. Write one file: `docs/for-claude-review/2026-11-02-codex-civic-forced-answer-review.md`. First line `VERDICT: PASS` or `VERDICT: HOLD`. Findings carry file:line, severity, and the failing input.

## Context

Follow-on to your 2026-11-01 packet-pressure reviews. Builder direction, verbatim, in `docs/plans/2026-10-31-civic-autonomy.md` Changelog (2026-11-01 entries): civic is not crisis reaction; the city is flourishing; an initiative can be a small good thing, not only an answer to a problem. The builder picked three items from your remaining-pressure inventory.

The change: `output/codex/civic-forced-answer/change.diff` (diff of main working tree → worktree `/root/GodWorld-wt-packet`). The worktree also carries the folded packet-pressure change, identical to main. Live crons run from `/root/GodWorld`, which does not have this change.

## What changed

1. Sunday packets: "No decision is not an option this cycle" removed. Each non-constituent decision now says act, hold, or let it pass, with a reason if passing. The empty-board fallback no longer mentions crisis or "nothing on fire".
2. Weekday datawake: "THIS WEEK'S LEVER (respond to this)" becomes "This week's pulse from your pack (yours to take up or leave)"; the statement no longer has to answer it. Slice lever strings "stand with [hood] or leave it" and "defend the district or go quiet" become neutral. Sunday week-carry line renamed to match.
3. A propose move no longer needs a problem. The prompt asks for `purpose` (what it is for); validation copies `purpose` into `payload.problem` when problem is empty, then drops `purpose`. Downstream readers keep the `problem` key. An empty one files.

## Real output

- `output/codex/civic-forced-answer/after/`: 15 C114 Sunday packets from `--stage=prep --cycle=114` in the worktree.
- `output/codex/civic-forced-answer/weekday-pulse-lines.txt`: the datawake lever line for mayor + 9 council seats, before (main) and after (worktree), both on live C114 data (`levers.js` produced it).

## Check

1. Correctness of the diff.
2. Downstream of a propose with empty or purpose-only problem: tracker write, gate, clerk, close, applyTrackerUpdates notes, civic47 pilot path, anything that assumes problem is non-empty.
3. Anything that parsed or graded against the old lever wording or the "No decision" line, including the hearing, number gate, eval, and city-hall ledger `lever` field.
4. Does a seat that passes on every Sunday decision still produce a valid voice file, or does any stage now fail or drop it?

Not in scope: Mara's directive, program categories and budget floor, project director cadence. Those wait on the builder.

## Test state

All 24 civic test files pass in the worktree, including the new `T1.7b` in `scripts/cron-civic-game.test.js`.
