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

`search_world` fixes (after the codex fold, below): file-level exact-phrase-then-AND matching stays as it is. For a jsonl shelf the shown row is the newest row that itself matches every term (row-level AND; order by `Cycle`, else `LastUpdated`, else file order), falling back to the first file-match row labelled as such; the ledger snapshot follows the same row-level rule, which is what removes Amara/Derek/Dalton (their rows carry one term, not all). A text shelf keeps its file match and shows the line carrying the most query terms, bounded. A query-matched beats row from the live Cycle or the one before ranks with the editions (rank 1), so a current feed row is no longer buried under rank 3.

First move (codex F1/F2, revised in the build): the bot runs record lookups itself, before the first model call, for what the message names — a hood from the Neighborhood_Demographics names, a team token (A's / Oaks), an exact citizen full name or POPID from the ledger snapshot, an exact business name from Business_Ledger — and attaches them to the prompt, so the right record is in front of the voice whether or not it searches. The round-0 `search_world` stays forced where the model allows a forced call (Haiku 5.5) and becomes `auto` + the first-move instruction where it does not: **Sonnet 5.5 returns 400 on a forced `tool_choice` and on `thinking: disabled`** (read 2026-11-05 against the direct API; its no-thinking setting is `between_tools`), so the research.30 invariant could not survive the model move as a forced call — the deterministic attach is what carries it. Rounds 1–3 carry the four tools with dispatch by tool name (one result per `tool_use_id`, unknown tool → an explicit error result). "Oaks record" therefore gets the team record even if the model would have reached for the business card.

Vinnie's brief (codex F16): feed lines newest-first, each with its Cycle, and the sentence names both records with their Cycles — "the C114 feed reports you stepping away; the C114 ledger row still says Active" — rather than asserting one is newer. An announced departure and a standing status can both be true.

## Build log (2026-11-05)

- `lib/discordLookups.js`: the four lookups (pure over rows + disk wrappers), `detectEntities`, `recordsForMessage`, `runTool` dispatch, `TOOLS`; `lib/discordLookups.test.js` 51 checks on C114-shaped fixtures through the real readers (`sickShare`/`SPIKE_WATCH` exported from `buildHealthSlice.js`, `censusTrail`, `parseSportsWeekRecord_`).
- `lib/mags.js searchDisk`: file match unchanged; jsonl shows the newest row carrying every term (ledger rows matched on identity fields, not LifeHistory; no ledger fallback), a current beats row ranks with editions, `output/beats/prev/` off the shelves. Replay: "Oaks record" → the C114 feed row 2nd, no stranger ledger rows; "Adash Stanley Oaks" → his ledger row, the C114 feed row, his LifeHistory; "Vinnie Keane retire" → editions (the C114 feed row says "retiring", not "retire" — `lookup_citizen` carries it, Acceptance 1 met by that path).
- `lib/personaProvider.js buildVoiceBrief_`: feed newest-first with season; the two-records sentence (codex F16).
- `scripts/mags-discord-bot.js`: records attached to the prompt before the first call; four tools + dispatch by name; per-call log line (tool, arg, result length, first line); `MAGS_BOT_MODEL` setting, Sonnet 5.5 default; request shape per model (`between_tools` / no forced call on Sonnet 5.5; `disabled` / forced on Haiku); `stop_reason` other than end_turn/tool_use logged.
- Harness (scratchpad, Sonnet 5.5 direct, Vinnie): "the club said it at the parade: Benji and I step away… my ledger row still says active, so the books haven't caught up"; KONO "17 sick, 3.2%, watch line 6%, flat… Chinatown is the high one at 137"; Adash "showed up at the Firehouse 29 academy… story notes around Cycle 106 to 108" (world_summary C107, which he could not find on 11-03). 12–16k tokens in, ~240–385 out per reply.
- Tests: `mags.searchDisk.test.js` path regex tolerates the row tag; `Claude` moved to the no-hit list (its only hit was a `prev/` row naming a model slug — pipeline.99); `personaProviderBrief.test.js` labels + newest-first check.
- Observed, left alone: Vinnie's own page carries a C114 TENSION "one more run, or step away for good?" written by the talk recorder from the 11-03 Discord talk — his recorded words; they now shape his answers. Not a fix.

## Reviews reconciled

| Review | Verdict | Pointer |
|---|---|---|
| codex-rb plan review, 2026-11-05 | HOLD → folded, all 16 verified against the cited code | [[../for-claude-review/2026-11-05-codex-research32-plan-review]] |
| codex-rb diff review of `f974fbad6`, 2026-11-05 | HOLD, 26 points → 18 folded (what a voice says, a number's stamp, the trust boundary); 8 named as ceilings below (builder's stop test 10-30: fold what changes what a citizen lives) | [[../for-claude-review/2026-11-05-codex-research32-diff-review]] |

### Agreed
- F1 dispatch by tool name; F2 first move kept as forced `search_world` + bot-side record lookups for named entities (Design §First move). Source: `scripts/mags-discord-bot.js:523-542`.
- F3 current beats rows rank with editions; F4/F6/F7 row-level AND for jsonl shelves with per-shelf recency fields; F5 text shelves keep the file match, best-line snippet. Source: `lib/mags.js:665-752`.
- F8 `lookup_citizen` resolves an exact POPID or exact full name; two or more matches (two Jacob Perez rows, POP-00203 / POP-01089) return the candidates and stop. F9 page entries are labelled as that citizen's own recollections, fenced, show docs skipped, an error reads as unavailable; they never outrank a ledger fact.
- F10 `lookup_neighborhood` returns count, share, the 6% watch bar and the prior-Cycle movement as separate facts (Chinatown 137/2213 is over the bar and highest by count, and fell from 140); the formula is `buildHealthSlice.js` `sickShare` / `SPIKE_WATCH` / `SPIKE_RISE`, exported from there rather than copied. F11 census via `beatSliceKit.censusTrail` (Cycle + System + `all`, scopes apart, incomplete withheld), admissions and closing occupancy named separately.
- F12 `lookup_team`: record from the newest row of that exact team whose `Team Record` is usable, with its Cycle and event type; `WeekRecord` parsed by `utilities/sportsWeekRecord.js` as ordered game outcomes; "no current record on this feed" when none. F13 no roster claim from TrueSource (it is every GAME-clock citizen, not a club list); names come from the feed rows.
- F14 `lookup_business`: exact name or BIZ_ID in Business_Ledger, else Business_Archive with `ExitCycle`/`ArchiveReason` (closed, not "never existed"); card secondary.
- F15 canon hits via the raw `lib/supermemory.search`; hits carrying `metadata.cycle` first, Cycle desc; Cycle-less cards after, labelled undated. F16 brief sentence as in Design.

- Diff review, folded: F16 the brief's club rows are the voice's own club and the sentence is generic (an Oaks voice no longer reads "you stepping away"); sports lines newest first across the set. F12 team recency by Cycle then file position; a record from a season other than the newest entry's is "last recorded (from the X entries, not this Y)"; the name join ignores periods (Wendell Carter Jr). F14 a `canon-duplicate-of` archive row is a retired record pointing at the live one, not a closure; archived numbers stamped at the exit Cycle. F15 a card counts only on the record's own ID (metadata or text) or the name in its title; the hood card is fetched. F2 up to two of each kind; names without periods; "Athletics" alone is not a team. F6 only the LifeHistory field is dropped from a ledger row, not the columns after it. F7 the ledger ranks and labels by its own snapshot Cycle; no stamp prints `?`, never `Cnull`. F4 no partial-row fallback on any jsonl shelf. F10 a missing population cell gives no total and no share. F11 a missing census tab reads "source unavailable". Bot: a final round with no text replies with the last text the model wrote. Trust boundary: the attached records are fenced as data (`memoryFence.wrap`, source `city-records`).

### Needs proof
- F3 acceptance 1 — the C114 feed row says "retiring", not "retire"; the disk search cannot carry it for that query. Acceptance 1 is restated on the `lookup_citizen` path (the record attached for any message naming him, and the tool).
- F2 on Sonnet 5.5: no forced first search exists on that model; small talk and an unrecognised name get no attached record and the model may answer without a tool. Accepted by design (the brief carries the voice's own record; the builder's next talks are the measure).

### New concepts (ceilings, not built)
- F4 one row per jsonl file: several same-Cycle events are carried by the team / citizen lookups, not the keyword search (a pointer, eight lines).
- F5 text-shelf snippet shows one line, not a bounded excerpt around every matched term.
- F7 `output/beats/prev/` stays off the keyword shelves (last Cycle's copy of the same tabs); the prior-Cycle value reaches the voice through `lookup_neighborhood`'s movement line. No manifest hash / row-count check before a table is read.
- F2 an inexact business name ("West Oakland academy" for "Firehouse 29 West Oakland Baseball Academy") is not detected; the model can still call `lookup_business` or search.
- Codex could not run the engine-wiring card (connection error) nor the replay (grep blocked in its sandbox); both ran here before the build and the diff review.

Logging: every tool call logs tool, query, result length and the first returned line, so the next review reads the log instead of replaying.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | `lib/mags.js searchDisk`: newest jsonl row carrying every term per file (ledger on identity fields, no fallback); best-line snippet for text shelves; current beats rows rank with editions; `beats/prev/` off. Verified by the seven-query replay before/after | rb | done `f974fbad6` |
| 2 | `lib/discordLookups.js` (both personas share): `lookupCitizen`, `lookupNeighborhood`, `lookupTeam`, `lookupBusiness` reading the tables above through the existing readers; canon hits via raw `lib/supermemory.search`, Cycle-stamped first. 51 unit checks on fixture rows | rb | done `f974fbad6` |
| 3 | `scripts/mags-discord-bot.js`: the four tools beside `search_world`, dispatch by name; records attached before the first call; forced round-0 search only where the model allows it; per-call result logging | rb | done `f974fbad6` |
| 4 | `buildVoiceBrief_`: feed newest-first with season; the two-records sentence (codex F16) | rb | done `f974fbad6` |
| 5 | Codex plan review (codex-rb), fold — done; build — done; codex diff review of `f974fbad6`; `npm test`; `pm2 restart mags-bot`; smoke: one message per channel from the builder | rb / codex | in progress |
| 7 | Builder (11-05): "consider to put the bots on sonnet 5.5" · "moving them to my Anthropic api". `MAGS_BOT_MODEL` setting, Sonnet 5.5 default on each route — done `f974fbad6`; provider set to `anthropic` in the env file at the restart (direct key proven 11-05) | rb | in progress |
| 6 | Cycle gap log: Vinnie Status `Active` vs feed "stepping away"; note for pipeline.100: the `mags` profile dump | rb | not started |

## Acceptance

1. Replay of the seven logged queries: `Oaks record` / `Adash Stanley Oaks` / `West Oakland academy` list no unrelated ledger row, and a current feed row ranks with the editions; the C114 "made it clear" line reaches the voice through `lookup_citizen` (attached for any message naming him) — proven by the before/after replay and the unit test.
2. `lookup_neighborhood("KONO")` returns sick 17, its rank, and names Chinatown 137 as the city's highest — proven by the unit test and one live call.
3. `lookup_citizen("Vinnie Keane")` returns the C114 feed line before the ledger row's status — proven by the unit test.
4. The bot restarts clean and both channels answer; the log shows tool + result line per call — proven by the builder's next talk (the real proof; this row stays live-observing until he reads one).

## Changelog

- 2026-11-05 — codex diff review HOLD (26): 18 folded, 8 ceilings (§Reviews reconciled). 64 unit checks. Harness: Vinnie reads KONO vs Chinatown and Oaks vs A's in one reply, A's 11-3 labelled last recorded. Sent for the one re-review.
- 2026-11-05 — build landed `f974fbad6` (§Build log). Sonnet 5.5 rejects forced tool_choice and `disabled` thinking, so records attach before the first call. Harness on Sonnet 5.5 passes the three 11-03 misses.
- 2026-11-05 — codex plan review HOLD, 16 findings verified and folded (§Reviews reconciled): first move stays forced search_world + bot-side entity lookups; row-level AND on jsonl shelves; health bar and census read through the existing readers; no roster claim; brief names both records.
- 2026-11-05 — builder: bots to Sonnet 5.5 on his Anthropic key (task 7); the direct route exists (`MAGS_BOT_PROVIDER=anthropic`) and the key answered a Sonnet 5.5 call.
- 2026-11-05 — feed carries `Team Record`/`Streak`/`WeekRecord` (178 rows); lookup_team leads with them. Sent to codex-rb for plan review.
- 2026-11-05 — plan written from the 11-04 replay; row research.32 claimed on the builder's "let's try your approach"; Mags' profile dump handed to pipeline.100.
