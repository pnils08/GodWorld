---
title: UNDOCKED — Nia and the pilots know the game
created: 2026-11-18
updated: 2026-11-21
type: plan
tags: [pipeline, active]
sources:
  - scripts/cron-desk-writer.js, scripts/undockedShowRecord.js, scripts/undockedMissionBrief.js, scripts/cron-undocked-run.js
  - .claude/agents/nia-rook/, docs/media/NIA_ROOK_UNDOCKED_BAG.md
  - output/kimi/spacemolt-phase0/commander/ (the pilots' client; gitignored, its own repo)
  - https://spacemolt.com/skill.md
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.113"
---

# UNDOCKED — Nia and the pilots know the game

**Rows:** pipeline.113 · **Owner:** engine-sheet

## Builder's words

- 2026-11-17: "every story I hear is the break even with 0 credits so maybe the undocked isn't set up properly"
- 2026-11-21: "The job is Nia has no clue what the game is and how to report on it"
- 2026-11-21: "There is no order to remove anything , it's either a replace or an add nothing else gets touched"
- 2026-11-21: "This is an AI game for AI agents , why do the crons suck at it ?"
- 2026-11-21: "I think 1.5 cents a run is very low so we can push this 8-10 cents , let's mess with what model they need to run on , we likely added some points to meet our needs , their seat can come back around so they keep they account I believe , if you see other ways they can score more points , buy and selling , etc we can look to add it to the run , Nia needs to be able to report on this properly , her boot shouldn't be loaded with your prose telling her you editing something or any reference to me , this is a tight script for her to live in the sim"
- 2026-11-21: "So we still didn't tell the Crons how to play the game ? How are we back at they only how to explore"
- 2026-11-21: "Yeah no AI reason 12,800 characters"
- 2026-11-21: "No tests allowed"
- 2026-11-21, on the 11-18 version of this plan: "Task 1 is rejected" (the gate excerpt). Not re-proposed.

## Read (2026-11-21, code and real output)

| Fact | Where |
|---|---|
| No code loaded Nia's bag; 20 other reporters' bags load by name | `cron-desk-writer.js` stance chain |
| Her write loads IDENTITY+LENS+RULES raw; they were August drafts with build notes and file paths | `cron-desk-writer.js` skill load |
| The night's record read only `points_delta.earned`; the progress rule writes `items` — 21 of 56 staged nights with points were told with none (C116 Manju Abebe: 11.83 points, told "came out even on credits") | `undockedShowRecord.js` nightClauses |
| 21 November nights: every one mostly jumps (7–17); 7 with mining; 4 with a trade; 1 contract finished; 0 fights | `output/spacemolt-show/episodes/*.log` |
| The pilot brief's only scoring example was exploring | `undockedMissionBrief.js` SHOW_RULES |
| The pilots' game guide was the client's March `prompt.md`, 12,836 chars; the game's own agent guide is 129,241 | `commander/prompt.md`, spacemolt.com/skill.md |
| An unlisted model id cloned the registry's first entry (Jamba: reasoning off); the client never asked for thinking | `commander/src/model.ts`, `src/loop.ts` |
| The game shows 70 achievements, 1,715 points | `output/spacemolt-show/progress/*.json` |
| The board's number is not the game's: Manju Abebe 39.25 on the board, 15 in the game (two unlocks) — the progress rule pays a share per step | `standings.json`, `progress/undocked-pop00918.json`, `undockedEpisodeAdapter.js` progressPoints |

## Built (2026-11-21)

| # | What | Commit |
|---|---|---|
| 1 | Nia's bag loads into both her seats, whole | `8b1fd8541`, `8fbc0abea` |
| 2 | The night's record carries points under either scoring rule: 56 of 56 nights name them | `8b1fd8541` |
| 3 | Nia's bag: the board's step rule (word for word from the pilots' brief) and the galaxy the pilots fly (from the game's rules page) | `7e00f7a1b`, `dfcf1463a` |
| 4 | Nia's boot (IDENTITY, LENS, RULES, bag) rewritten in-world: no build notes, no builder, no paths, no August test pilots; assembled boot scanned, 0 builder words | `0ac4a3713` |
| 5 | Pilot brief UNDOCKED-BRIEF/6: THE WHOLE BOARD (all 70 achievements and points), `get_achievements` for what each asks, `get_guide` for the galaxy's playbook, the account carries if the chair comes back | `4c50dae3a` |
| 6 | The game's own agent guide becomes the pilots' guide, refreshed before every flight; a bad fetch keeps the last copy | `24e89f32e` |
| 7 | Client (its own repo, local commit `19182e5`): an unlisted model clones its nearest family entry; the pilot thinks at medium effort; any failed call that asked for thinking turns it off for the rest of the run | commander `19182e5` |

Model: Haiku 5.5 stays. The guide rides on every call (~1.5M tokens in a night). By the repo's 10-12 price list that is about 4 cents on Haiku and about 45 on Sonnet 5.5; with thinking on, Haiku is estimated at 6–8 cents. The estimate is arithmetic, not a measured night.

## Not proven

- Items 5–7 have not flown. No test flight and no test run was made (builder: "No tests allowed"; the test guard also blocks compiling the client). Item 7 was read back by eye, not compiled.
- No UNDOCKED test file was run or edited.

## Owed read

The first flight after 2026-11-21 04:10 CST (nightly 20:30). Read its episode log and sidecar:

1. `Using openrouter/anthropic/claude-haiku-5.5 (based on anthropic/claude-haiku-…)` — not Jamba.
2. `Instruction: UNDOCKED-BRIEF/6` and the cron log line `game guide: … chars`.
3. The client started (a syntax slip in item 7 fails at launch) and no `thinking off for the rest of the run` line.
4. What the pilot did: jumps against mining, trades, contracts.
5. Tokens in and out from the last `turn_end` line, against 8–10 cents.
6. Nia's next piece: the night's points named, the board read right.

## His calls, not taken

- Which number the board ranks by: the game's unlocks, or the progress rule's shares.
- A longer night, or more nights in the chair.
- Whether the show's magnitude reads points; what points do to a pilot's life lines; the bets.

## Changelog

- 2026-11-18 — plan written as "UNDOCKED tells its nights in points": five wording tasks. It did not carry the ask.
- 2026-11-21 — rewritten from the builder's words and the read above; Task 1 of the old plan rejected; items 1–7 built.
