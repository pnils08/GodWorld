---
title: Discord Voices Lookups Plan
created: 2026-11-05
updated: 2026-11-05
type: plan
tags: [media, discord, active]
sources:
  - logs/mags-discord-out.log 2026-11-03 23:52 – 11-04 00:04 CST (the seven logged search_world queries)
  - logs/discord-conversation-history.json, logs/discord-history-POP-00001.json (the two talks)
  - scripts/mags-discord-bot.js (SEARCH_TOOL, searchEverything, callClaude)
  - lib/mags.js searchDisk / searchRoots / isCanonSearchPath
  - lib/personaProvider.js buildVoiceBrief_ / sportsLines_ / editionLines_
  - lib/supermemory.js (v3 results carry metadata.cycle + updatedAt)
  - docs/plans/2026-10-19-discord-voices-connected.md (research.30 — the search-first build this corrects)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — research.32"
  - "[[2026-10-19-discord-voices-connected]] — research.30, live-observing; the forced first search comes from there"
  - "[[2026-11-03-mags-memory-one-home]] — pipeline.100 (engine-sheet): Mags' profile dump is that row's, not this one's"
---

# Discord Voices Lookups Plan

**Builder's words (2026-11-04/05):**
- "Chase their tool calls and what they query, they say accurate stuff but can't find a lot and can't connect it"
- "Yea and if they need a boot on the voice/persona file on the basics of who they are before they search? Mags should be using her wiki container, I'd think? Their search engine would be bay-tribune, citizen cards, business cards?"
- "Citizen pages are wiki search containers, that's what I've always called them" · "Yeah let's try your approach then"

**Goal:** Mags and Vinnie can look a person, a neighborhood, a team or a business up as a record — newest fact first — instead of one three-word keyword search, so a talk connects what the records already hold.

**Rows:** research.32 · **Owner:** research-build

## Measured 2026-11-04 (the talks, replayed)

Both personas run exactly one forced `search_world` per message (research.30), 2–3 keywords, every word must match, then answer. Replayed against live data (`scratchpad/replay.js`; the bot logs the query, not the result):

| Query (logged) | Disk returned | Canon (Supermemory world-data + bay-tribune) returned |
|---|---|---|
| `Vinnie Keane retire` | 75 files; top 8 shown; the C114 feed row "Vinnie Keane made it clear" ranked 64th | Cycle-76-era farewell pieces, a retirement-reaction piece — no cycle order |
| `Keane farewell season` | C78–C94 editions | same |
| `KONO illness` | 1 file (a page-index line) — the hood table `KONO, Sick 17` is a number, not a word | the C114 health piece saying Chinatown has the most sick (Mags passed over it) |
| `Oaks record` | Amara Keane's ledger row first (AND-match on "record") | C112 staged sports pieces |
| `A's championship` | C83–C98 editions; C111 parade in world summaries | C111 parade note |
| `Adash Stanley Oaks` | Derek Simmons' ledger row first | his citizen card, C107–C108 pieces |
| `West Oakland academy` | Dalton Rushing's ledger row | school cards |

What this produced in the talks: Vinnie called his own retirement "mixed records" (his boot brief carries both `status Active | Designated Hitter` from the ledger row and the C114 feed line "Keane and Dillon stepping away", and is told records beat his character file but not which record is newer); Mags said "no KONO spike" without stepping to Chinatown (Neighborhood_Demographics: KONO sick 17 flat; Chinatown 137, the city's highest; C113 Pulse ran the Chinatown hospital cluster).

What is already right and stays: both boot on their persona files (Vinnie: IDENTITY/LENS/RULES/SKILL + a records brief; Mags: identity, two page reflections, city header, notes, digest, newsroom week); the containers searched are the ones the builder named — `bay-tribune` and `world-data`, and the citizen cards (`wd-citizens`, 940) and business cards (`wd-business`) are filed under `world-data` too; citizen pages (`citizen-page:<POPID>` store — the builder's "wiki containers") are read for the voice's own page only.

Not in this row: Mags' per-message "profile" loads the whole `mags` container (~12k chars, ignores who is talking) — that is pipeline.100's scope (engine-sheet). Vinnie's ledger Status is `Active` while the C114 feed says he is stepping away: an observation for the cycle gap log, not a fix here (never hand-edit a citizen).

## Design

Four record lookups beside `search_world`, all read from disk tables the crons already write, canon hits ordered by `metadata.cycle` (v3 results carry it; no transport change):

| Tool | Reads | Returns |
|---|---|---|
| `lookup_citizen(name or POPID)` | ledger snapshot row (name or POPID match) · that citizen's page, newest entries (`citizenPage.recentPage_`, fenced — the wiki container) · `wd-citizens` card · newest sports-feed rows naming them · newest Tribune lines · bay-tribune hits by cycle desc | one record, newest first, cycles labelled |
| `lookup_neighborhood(name)` | `Neighborhood_Demographics` row (students/adults/seniors/unemployed/sick, LastUpdated) · `Care_Justice_Census` current-cycle hospital + judicial `all` rows · citywide rank of the sick count ("3rd lowest of 22; highest is Chinatown 137") · `wd-neighborhood` card | the numbers Mags needed, with the neighbour that does have the spike |
| `lookup_team(team)` | `Oakland_Sports_Feed` newest rows for A's or Oaks (season type, event type, notes) and the newest row's `Team Record` / `Streak` / `WeekRecord` (Oaks C114: 6-1, W2 — Mags said she had "no clean standings line"; it was in the feed) · A's roster from truesource (status, position) | record line first, then newest feed rows. No Oaks roster exists — the tool says so rather than inventing one |
| `lookup_business(name)` | `Business_Ledger` row · `wd-business` card · bay-tribune hits by cycle desc | one record |

`search_world` fixes: a jsonl shelf returns its newest matching row by `Cycle`, not line 1 (the C36 row is why C114 vanished); a text shelf's snippet is the line matching every term, not the first line matching the first term; the ledger snapshot is listed only when the row's Name contains a query term (kills Amara/Derek/Dalton noise, keeps Vinnie for "Vinnie Keane retire"); within a rank, newest cycle first (already so for editions; extend to jsonl rows and staged pieces).

First move: round 0 stays a forced tool call but becomes `tool_choice: any` with the instruction "a name → lookup_citizen; a neighborhood → lookup_neighborhood; a team → lookup_team; a business → lookup_business; anything else → search_world; follow a lead with a second lookup". Four rounds stay.

Vinnie's brief: feed lines newest-first, and one sentence — where the ledger row and the sports feed disagree, the feed is newer.

Logging: every tool call logs tool, query, result length and the first returned line, so the next review reads the log instead of replaying.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | `lib/mags.js searchDisk`: newest jsonl row by Cycle per file; all-terms snippet line for text shelves; ledger snapshot only on a Name match; cycle-desc within rank. Verified by the seven-query replay before/after | rb | not started |
| 2 | `lib/personaProvider.js` (or a new `lib/discordLookups.js` both personas share): `lookupCitizen`, `lookupNeighborhood`, `lookupTeam`, `lookupBusiness` reading the tables above; canon hits via `lib/supermemory.search` sorted by `metadata.cycle` desc. Unit test on fixture rows (KONO 17 / Chinatown 137; Vinnie C114 feed first) | rb | not started |
| 3 | `scripts/mags-discord-bot.js`: register the four tools beside `search_world`; round-0 `tool_choice: any` + the first-move instruction; per-call result logging | rb | not started |
| 4 | `buildVoiceBrief_`: feed newest-first; the "feed is newer than the ledger row" sentence | rb | not started |
| 5 | Codex plan review (codex-rb), fold; build; codex diff review of the exact candidate; `npm test`; replay; `pm2 restart mags-bot`; smoke: one message per channel from the builder | rb / codex | not started |
| 6 | Cycle gap log: Vinnie Status `Active` vs feed "stepping away"; note for pipeline.100: the `mags` profile dump | rb | not started |

## Acceptance

1. Replay of the seven logged queries: `Vinnie Keane retire` shows the C114 feed row in the first three disk lines; `Oaks record` / `Adash Stanley Oaks` / `West Oakland academy` list no unrelated ledger row — proven by the before/after replay in the plan changelog.
2. `lookup_neighborhood("KONO")` returns sick 17, its rank, and names Chinatown 137 as the city's highest — proven by the unit test and one live call.
3. `lookup_citizen("Vinnie Keane")` returns the C114 feed line before the ledger row's status — proven by the unit test.
4. The bot restarts clean and both channels answer; the log shows tool + result line per call — proven by the builder's next talk (the real proof; this row stays live-observing until he reads one).

## Changelog

- 2026-11-05 — feed carries `Team Record`/`Streak`/`WeekRecord` (178 rows); lookup_team leads with them. Sent to codex-rb for plan review.
- 2026-11-05 — plan written from the 11-04 replay; row research.32 claimed on the builder's "let's try your approach"; Mags' profile dump handed to pipeline.100.
