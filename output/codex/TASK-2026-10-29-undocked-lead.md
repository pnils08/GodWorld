# TASK — codex holds the lead on UNDOCKED: why the pilots do not score (builder 2026-10-29)

Builder-direct: "Just give the task to codex." Codex leads. research-build executes nothing on it. Read first: `output/codex/TASK-2026-10-28-nia-rook-lead.md` (the builder's 10-28 rulings, verbatim) and the plan `docs/plans/2026-08-07-spacemolt-game-show.md` (last two changelog lines, 10-29).

## The builder, 2026-10-29 (verbatim)
- 10-28: "The issue with undocked is no one knows how to play, Eric Taveras scored a lot on 1 run and no other cron has figured out how to play."
- 10-29: "It's a fucking game with rules, it's nothing you need to create, it's already a game, the space molt is likely a agent game."
- 10-29: "You're just a boring system engineer making system you can predict when that's the literal opposite of what I'm trying to build."
- 10-29: "Why are you telling them to stay in Sol?" (about the v3 brief edit, now reverted)
- Standing: pilots are agents playing an existing game. Do not coach them, do not make the show predictable.

## What research-build did and undid
Built `UNDOCKED-BRIEF/3` (leave Sol when belts read 0) on its own read, against the 10-28 rule that codex leads. Reverted: brief is back on `/2`, tests pass. The first plan line also had a wrong cause; the correction line (10-29) stands. Your own review is at `docs/for-claude-review/2026-10-29-codex-undocked-brief-v3.md`.

## Verified (record, not guess)
- Board (`output/spacemolt-show/standings.json`): Taveras 1,170 over 3 episodes; next pilot 317; at least 12 pilots at 5 credits or less.
- Taveras 10-16, from the saved game events in time order: accepted "Market Participation: Selling" 01:30:16; sold 6+36+128 credits of ore; mission completed for 1,000 at 01:37:25 in Sol; jumped Sol to Sirius 01:39:33. Credits were earned before the jump.
- `spacemolt/mine` errored in 20 of 29 October runs (error present, not 20 dead flights); 18 and 13 clean mine calls on 10-13 and 10-14.
- 10-26 pilot read `remaining: 0` on three Sol belts, then the same flight logged one copper yield at Main Belt.
- The runner enforces no home-space rule; the brief text and stale per-pilot briefs on disk carry "Stay in home space".

## Not known (do not fill in)
- Which pilots were offered the 1,000-credit starter mission, and whether it repeats per account.
- Why a contract read 0/30 with 30 ore already in the hold (10-26).
- What the builder wants built. He has said what it is not (coaching, prediction, a system to create), not what it is.

## Deliverable
A plan or diff for the builder's approval before any build, as in the 10-28 task. Writable scope per AGENTS.md: `scripts/**`, `output/**`, `docs/**`. No game-server calls, no sheet writes, no cron edits, no deploy. Write the proposal to `docs/for-claude-review/2026-10-29-codex-undocked-<topic>.md`. A real blocker goes to research-build per `docs/reference/CROSS_LANE_MESSAGING.md`.
