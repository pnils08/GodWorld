---
title: Feed Triggers to Life History Plan
created: 2026-11-05
updated: 2026-11-05
type: plan
tags: [engine, sports, draft]
sources:
  - phase05-citizens/applyGameNightMoments.js (engine.208 — the feed-named line, routed by EventType)
  - phase02-world-state/applySportsSeason.js:195-250, 794-864 (EventTrigger read into S.sportsEventTriggers — team-scoped, hooks only)
  - lib/wakePerception.js:722-828 (the wake loop perceives a [Retirement] LifeHistory tag as "you retired")
  - output/beats/Oakland_Sports_Feed.jsonl (265 rows; EventTrigger filled on 163 — hot-streak 59, breaking-news 16, cold-streak 14, home-opener 9, playoffs 9, playoff-push 8, awards 7, pre-season 5, championship 5, draft 4, community outreach 4, legacy 2, contract-year 2, rivalry 2)
  - output/simulation_ledger_snapshot.jsonl (1,015 Active / 43 Retired; no engine phase writes Status Retired — grep 2026-11-05)
  - docs/plans/2026-11-05-discord-voices-lookups.md §Build log (how the gap surfaced: Vinnie's Discord voice reads "the club says I'm stepping away; my row says Active")
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.333; engine.331 (sports triggers: vocabulary, re-fire) is the sibling"
  - "[[2026-11-05-discord-voices-lookups]] — research.32, where the gap surfaced"
  - "[[2026-09-11-sports-as-a-lived-system]] — the sports-as-engine frame this sits in"
---

# Feed Triggers to Life History Plan

**Builder's words (2026-11-05):**
- "the retirement sounds like an intake item? Maybe I need to also run an Oakland sports feed entry as retirement, maybe we start to lean on the event triggers on Oakland sports feed to write lines to players life History, 'name used' with the 'event trigger' can start to add that to the players (game engine / Uni flag) life history, retired, hot streak, etc. That way if a player is named and covered in media, their life history also record the team, name used, event trigger."
- "some of this feeds into the job es just handed off for its next session that there are too few 'event triggers' in that they don't support enough event types. Not sure if they are the same work but we can start to make this a plan.md template and start to prep your one handoff to take this next session."
- "Vinnie Keane discord works and what he said is true and it's his own output given what's occurred and you're absolutely right regardless if this was announced as the 'farewell season' Vinnie would still need to have his press conference."

**Goal:** a player named on a sports-feed row carries that row's Event Trigger on their own life history, team and trigger in the tag; a few triggers are milestones that change the row itself — `retirement` writes `[Retirement]` and flips Status to Retired — so the wake loop, the brief and the Discord voice all read the same event the next Cycle. Vinnie's press conference is a feed row.

**Rows:** engine.333 · **Owner:** research-build (next session) · **Sibling:** engine.331 (engine-sheet) — the trigger vocabulary and the blank-cell re-fire

## What exists (read 2026-11-05)

| Piece | State |
|---|---|
| Feed row → named player's LifeHistory line | LIVE (engine.208, `applyGameNightMoments.js`): every row whose NamesUsed resolves by name writes one line, routed by **EventType** (game → Sports-Played / -PlayedWin; injury → Sports-Injured; roster-move / trade / re-signing / draft → Sports-Moved; feature / awards → Reputation; else a plain [Sports] line). Tag carries `source:sports\|feedNamed\|event:<type>\|team:<team>`. Vinnie Y3C10: "got recognized twice at the grocery store after the story ran" from the C114 player-feature. |
| Team week line for every GAME-clock player and staffer of a club that played | LIVE (engine.208 line 2) |
| EventTrigger | Read into `S.sportsEventTriggers` **per team** for story hooks (`applySportsSeason.js`, `storyHook.js:565`). Not read per named player. No trigger changes a row. A blank cell re-fires the team's last value (G-ES1 → engine.331). |
| Retirement | No engine path writes Status Retired or a `[Retirement]` life line. The 43 Retired rows were minted so. The wake loop would perceive `[Retirement]` ("you retired") if it were written. |
| Advancement_Intake | Exists (engine.329); a retirement could be filed there, but the club announces a retirement — that is a feed row (NamesUsed = the player, EventTrigger = retirement), which is the builder's game as the input. Intake stays for what happens off the field. |

## Design (draft — the next session audits it before building)

1. **Trigger routing beside type routing.** In the NAMED line of `applyGameNightMoments_`, after the EventType route, read the row's EventTrigger. A recognised trigger writes a second signed line (or replaces the plain [Sports] line when the type gave nothing specific), tag `source:sports|feedNamed|event:<type>|trigger:<trigger>|team:<team>`. Routing table, first cut: `hot-streak` → Sports-Streak-Hot; `cold-streak` → Sports-Streak-Cold; `awards` → Reputation-Award; `championship` → Sports-Champion; `legacy` / `community outreach` → Reputation; `breaking-news`, `contract-year`, `rivalry`, `home-opener`, `playoffs`, `playoff-push`, `pre-season`, `draft` → the type route stands, trigger kept in the tag. A trigger not in the table writes nothing extra and is counted in the engine log, so the vocabulary engine.331 settles on is what this reads.
2. **Milestone triggers change the row.** `retirement` → LifeHistory `[Retirement]` line ("retired from the <team>, announced <event type> C<N>"), Status → Retired, RoleType keeps the position with "Retired" prefixed the way the 43 minted rows read ("Retired former As, …" — read the exact convention off those rows before writing). UNI flag stays (ruling: retired players keep UNI). The wake loop perceives it next Cycle. Candidate second milestone: `signed` / `traded-away` are already Sports-Moved by type — no change. No other trigger touches Status.
3. **Idempotence.** One milestone per player per Cycle per trigger (a re-fired blank cell, G-ES1, must not retire him twice; engine.331's fix is upstream of this). A player already Retired ignores a second `retirement`.
4. **Readers.** `buildVoiceBrief_` and `lookup_citizen` (research.32) already show feed lines newest first and the ledger status; once Status flips, the "club says / books say" split closes itself. The citizen-voice character files (`IDENTITY.md` "farewell season, bench role") stay as written — the brief says the records win.
5. **Not in this row:** the trigger vocabulary and re-fire (engine.331); whether a Discord talk's hedge should write a TENSION to the voice's page (research.32 observation, builder's call); any hand edit to Vinnie's row (never — his retirement is the feed row the builder files, run by the engine).

## Open with the builder

- Owner: research-build next session (his words), or engine-sheet with engine.331 as one job — his call.
- Sequence: engine.331 first (vocabulary + re-fire), then this; or this defines `retirement` + the table and 331 adopts.
- The `retirement` feed row for Vinnie: his press conference. The builder files it when he judges the world is there; the engine does the rest at the next fire.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Read-before: `applyGameNightMoments_` NAMED path end to end; the 43 Retired rows' RoleType/Status convention; wakePerception `[Retirement]` read; engine.331 plan when written. Wiring card on `applyGameNightMoments_` and `S.sportsEventTriggers` | rb | not started |
| 2 | Cut: trigger routing table + milestone `retirement` (Status, RoleType, `[Retirement]` line), idempotent per player/Cycle | rb | not started |
| 3 | Sandbox: plant one `retirement` row (NamesUsed = a bench-only name, never a live citizen), fire, read back Status + LifeHistory + the wake line; plant a `hot-streak` named row, read the line | rb | not started |
| 4 | Codex review of the exact candidate; PROD push; DEPLOY_HISTORY | rb / codex | not started |

## Acceptance

1. A feed row `EventTrigger=retirement, NamesUsed=<player>` fired on the sandbox leaves the player Status Retired, RoleType in the minted convention, one `[Retirement]` LifeHistory line with team and Cycle; a second fire with the same row changes nothing — proven by sandbox readback.
2. A `hot-streak` named row writes one Sports-Streak-Hot line tagged with team and trigger on each named player — proven by sandbox readback.
3. After the live fire that carries Vinnie's press-conference row, the wake loop's next entry on his page speaks from "you retired", and `lookup_citizen("Vinnie Keane")` shows Status Retired beside the feed line — proven by his page and one bot log line.

## Changelog

- 2026-11-05 — drafted from the research.32 finding (no engine retirement path; EventTrigger read only per team) and the builder's words; row engine.333 filed ready, owner research-build next session; sibling engine.331 named.
