---
title: Sports Feed Triggers Plan
created: 2026-11-05
updated: 2026-11-05
type: plan
tags: [engine, sports, feed, story-hooks, draft]
sources:
  - output/production_log_run_cycle_c114_gaps.md G-ES1 (+ builder 2026-11-05), G-ES3, engine.331 trace line
  - docs/research/2026-11-05-codex-engine331-trigger-trace.md (codex independent trace, read-only)
  - phase02-world-state/applySportsSeason.js:819-916 (applySportsFeedTriggers_), :929-1055 (processFeedSheet_), :1063-1106 (reduceFeedTeamState_), :1161-1180 (inferFeedTrigger_)
  - phase07-evening-media/storyHook.js:554-606 (TRIGGER_HOOKS, moment hooks)
  - utilities/setupSportsFeedValidation.js:116-154 (PLAYER_MOOD_VALUES, EVENT_TRIGGER_VALUES), :209-216 (header notes)
  - utilities/sportsWeekRecord.js:418-458 (sportsStreakHeadline bar)
  - live Oakland_Sports_Feed read 2026-11-05 (265 rows); output/beats/Story_Hook_Deck.jsonl C113-C114
  - docs/plans/2026-09-11-sports-as-a-lived-system.md:80, :384 (2026-09-19 trigger ruling, latent carry noted)
  - docs/research/2026-10-03-engine-204-205-game-day-economy-read-before.md §4 Builder ruling 2026-10-22
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.331 (this plan); engine.204 (its trigger-word piece moves here); engine.333 (reads the vocabulary this settles)"
  - "[[2026-11-05-feed-triggers-to-life-history]] — engine.333, sibling"
  - "[[2026-11-05-story-seed-mixed-magnitudes]] — engine.334, found during this trace"
  - "[[../OAKLAND_SPORTS_FEED]] — the column contract this changes (K row, header notes)"
---

# Sports Feed Triggers Plan

**Builder's words (2026-11-05, G-ES1, verbatim):** "the issue is there aren't any triggers that aren't "in-season" and there isn't much variety , not sure if all need a trigger but if they do there really isn't anything for the oaks off season decisions, and a team is either hot or cold when winning or losing 1 game wouldn't be either . So have ing some more variety on positive and negative type triggers."

**Builder's words (2026-11-05, engine.333 plan, verbatim):** "some of this feeds into the job es just handed off for its next session that there are too few 'event triggers' in that they don't support enough event types."

**Builder's words (2026-11-05, this session, verbatim):** "Ok let’s start the plan … then get the extensive plan on triggers writren Jo and Hand to codex to review"

**Earlier rulings this plan sits on:**
- 2026-09-19, as recorded in [[2026-09-11-sports-as-a-lived-system]]:80 (not his verbatim words): "An EventTrigger is a moment in the week (`draft-night`, not `draft`). His recurring non-hook words were SeasonType (`playoffs`, `pre-season`) and EventType (`breaking-news`, `awards`, `draft`, `community outreach`) values in the wrong column."
- 2026-10-22, engine.204, the option he chose (verbatim): "Remove HomeNeighborhood + EconomicFootprint; wire FranchiseStability and CommunityInvestment so they move numbers as you ruled; add the week record + missing event types to the dashboard and make the common ignored trigger words real hooks."

**Reading of the two (for the builder to confirm in Q1):** they pull opposite ways on the words he types most. 09-19 moved phase words and entry kinds out of the trigger column; 10-22 says the common ignored words become hooks. This plan reads them together as: a recurring word that names a *moment* (awards, draft, community outreach, blockbuster-trade) becomes a dropdown moment word; a word that names a *season phase* (playoffs, pre-season, summer league, spring-training) stays out, because the phase already raises its own story idea. `breaking-news` (16 uses, the most common) is neither; Q1 asks him.

**Goal:** a sports trigger is a moment that happened this week, on this row. A blank cell is no moment. Hot and cold come from the actual streak, not one game. The word list covers the off-season and gives both franchises good and bad moments, from a list the builder picks.

**Rows:** engine.331 · **Owner:** engine-sheet · takes over engine.204's "off-list triggers become hooks" piece (engine.204 keeps the column work)

## Current state (traced 2026-11-05; codex trace agrees)

**Path.** Cell → `processFeedSheet_` → `S.sportsEventTriggers` → `storyHookEngine_` `TRIGGER_HOOKS` → `Story_Hook_Deck` (sports pitch). The same labels also land in the `sports` Ripple_Ledger `CauseDetail` on any week with a game share (`applySportsSeason.js:868-885`) → the Story_Seed_Deck `Why` (`buildContractSeeds.js:464`) → world summary "What Moved" (`buildWorldSummary.js:270-286`). No number in the city reads a trigger. Separately, the raw cell of this Cycle's rows goes to the newsroom unchanged (media handoff, Oaks beat slice, Simon slice, dashboard cards).

**Carry.** `reduceFeedTeamState_` (`:1063-1106`) keeps each team's last non-blank, non-`-` trigger, mood and streak from *any earlier Cycle*; a team with any row this Cycle then speaks the carried trigger (`:995`, `:1004`, `:1014-1018`). Only a typed `none` stops it (`:1040`), and the dashboard rejects `none` (not in `SAFE_ENUMS`, `sportsFeedContract.js:297-299`).

**Live, C114.** Every C114 trigger cell is blank. The deck got "A's on a W3. Fan energy rising. Momentum story." (A's off-season, no game: C113's authored `hot-streak` carried, W3 carried from the C110 title game) and "Oaks on a W2. Fan energy rising in Jack London." (C113's `hot-streak` carried onto a W2 week). Ripple / seed / world summary carry `A's W3 [player-energy]; A's W3 [hot-streak]; Oaks W2 [hot-streak]`. C112-C113 the author typed `hot-streak` on A's off-season rumor rows and on Oaks W1-W3 rows: the list offers nothing else.

**The 18 words** (all in-season; `EVENT_TRIGGER_VALUES` == `TRIGGER_HOOKS` keys, pinned by `sportsFeedContract.test.js:477-493`):

| Sign | Words |
|---|---|
| Good, 11 | hot-streak, playoff-push, playoff-clinch, championship, home-opener, injury-return, debut, all-star, series-clinch, walk-off, no-hitter |
| Bad, 3 | cold-streak, eliminated, injury |
| Neither, 4 | rivalry, season-finale, draft-night, trade-deadline |

**Three bars for "hot", one with none.** Engine's own pick: W6/L6 (`inferFeedTrigger_` `:1168-1169`, hard-coded). Business-desk streak headline: World_Config `sportsStreakHeadline` = 5 (builder's dial, `sportsWeekRecord.js:418-448`). Player win-streak night: W4 (`applyGameNightMoments.js:68`). A typed `hot-streak`: no bar.

**Off-list words typed into the sheet** (live, 265 rows; the sheet dropdown allows any text): breaking-news 16, playoffs 9, awards 7, pre-season 5, draft 4, community outreach 4, contract-year 2, legacy 2, summer league 2, and one each of contract, big-contract, blockbuster-trade, call-up, roster-decision, spring-training, closer-battle, star-power, quiet-excellence, Game of the Week, analysis. Each made no story and blocked the engine's own pick.

**Mood triggers.** `frustrated`/`angry` → `player-frustration`, `electric`/`confident` → `player-energy` (`:1021-1037`). No pitch exists for either (open since 09-19, lived-system plan :384 item ii); they reach only the Ripple / seed text. Mood's real effect is elsewhere and is not touched here: the game-night line tone (`gameNightBucket_`), read per row, this Cycle only.

**Championship.** `inferFeedTrigger_` fires `championship` ("CHAMPIONSHIP! City-wide celebration") on the canonical phase, and `world-series` / `finals` alias to that phase — but the column contract says those mean the final round is on, and `championship` typed is the clinch game (`setupSportsFeedValidation.js:187-188`). A finals week is pitched as a title won.

## Design

### Mechanism (engineering; built from the code)

1. **Triggers come from this Cycle's rows only.** `processFeedSheet_` stops reading trigger and mood from `reduceFeedTeamState_`; it scans the rows whose Cycle equals the running Cycle (same rule as `readOaklandFeedEntries_`). The reducer drops its `trigger` and `playerMood` fields; it keeps record, phase, streak, fan sentiment and media profile, which the sentiment log line and the aftermath path (`:975`) still use. Nothing else reads the dropped fields (codex trace §Engine readers).
2. **Every row's moment counts, not only the team's last row.** Reading of 09-19 ("a moment in the week") plus the column contract ("One event per row"): C105's A's rows carried `hot-streak` on the game and `awards` on five feature rows, and only `awards` spoke. `storyHook` already dedupes one pitch per team per word (`storyHook.js:593-595`). Stated, not asked — the builder can overrule.
3. **Blank, `-` and `none` are all "no moment on this row."** Nothing to clear from the dashboard once nothing carries; the dashboard needs no `none`. `seedSandboxFeeds.js:210-217`'s `none` / `quiet` sentinels become unnecessary (left in place, comment trued).
4. **Hot and cold are the engine's, from the Streak column, on a game week.** `hot-streak` / `cold-streak` fire when the team played this Cycle and its week streak (`S.sportsWeek[team].streak`, the last game row's Streak, engine.206) is at or past the bar ruled in Q2. A typed `hot-streak` / `cold-streak` is not a moment the author picks: the two words leave the dropdown and a typed one is ignored with a log line. The pitch prints this Cycle's streak, never a carried one. An authored word never blocks the engine's pick any more. "Game week" is the engine's accepted WeekRecord games (`S.sportsWeek[team].g > 0`), the same rule sentiment, the casino and the bars use; a game-result row with no WeekRecord (live C110's A's title row) is no game week here either.
5. **`championship` fires on the clinch, not the final round.** The engine's own pick reads the week's raw lens (`S.sportsWeek[team].lens`) = `championship` on a game week; `world-series` / `finals` weeks get no inferred title pitch. A typed `championship` still speaks.
6. **One word canonicalizer.** `canonicalFeedTrigger_(raw)`: trim, lowercase, spaces → `-`, then the alias map ruled in Q1 (e.g. `awards` → `award`). `processFeedSheet_` and `readOaklandFeedEntries_` both use it, so `S.sportsFeedEntries[i].eventTrigger` carries the canonical word — the per-player reader engine.333 builds reads that (codex: no semantic reader of that field today). An unknown word makes no pitch and is logged once per Cycle.
7. **Mood triggers** per Q3. Default if unruled: unchanged words, but from this Cycle's rows only (mechanism 1).

### Vocabulary (sim — builder picks; pick-from, not take-all)

Proposed additions, each with its sign and the pitch it would get (pitch style follows `TRIGGER_HOOKS`; `<hood>` only on a home week). Any subset works; words not picked are dropped from the plan.

**Off-season and front office** (both franchises; the A's now, the Oaks after their season):

| Word | Sign | Pitch (draft) |
|---|---|---|
| re-signed | good | `<team>` keep a player. Loyalty story, what the deal says about next season, clubhouse reaction. |
| signed | good | `<team>` sign a new player. Who he is, where he fits, fan verdict. |
| departed | bad | `<team>` lose a player to another club. What leaves with him, who fills the hole, fan reaction. |
| traded | either | `<team>` make a trade. Who went, who came, winners and losers, clubhouse ripple. |
| released | bad | `<team>` let a player go. End of a road, roster math, what is next for him. |
| retirement | milestone | `<team>` player retires. Career look-back, the farewell press conference, what the city remembers. (engine.333 needs this word) |
| coaching-change | either | `<team>` change the bench. Why now, who is in, what changes. |
| trade-rumor | neither | `<team>` trade talk. Who is on the block, what it would cost, fan temperature. |
| camp-opens | good | `<team>` open camp. First look at the roster, battles to watch, fresh-start energy. |
| award | good | `<team>` player wins an award. Recognition story, the season behind it, hometown pride. |
| community-outreach | good | `<team>` in the community. Who showed up, who it helped, the club off the field. |

**In-season, good:**

| Word | Sign | Pitch (draft) |
|---|---|---|
| big-win | good | `<team>` big win. The game that mattered, who delivered, fan energy `<hood>`. |
| comeback | good | `<team>` come back to win. The turn, the hero, the crowd. |
| career-night | good | `<team>` player has a career night. Box-score story, the player behind it. |
| milestone | good | `<team>` player reaches a career milestone. The number, the road there, what it means. |
| shutout | good | `<team>` throw a shutout. Pitching story, the staff, the zeros. (baseball) |
| buzzer-beater | good | `<team>` win at the buzzer. The shot, the shooter, the arena. (basketball) |

**In-season, bad:**

| Word | Sign | Pitch (draft) |
|---|---|---|
| tough-loss | bad | `<team>` drop a close one. The play that turned it, the mood after, what is next. |
| blowout-loss | bad | `<team>` blown out. What went wrong, who answers for it, fan frustration. |
| blown-lead | bad | `<team>` let a lead slip. Where it turned, the late innings or quarter, the clubhouse after. |
| slump | bad | `<team>` player in a slump. The numbers, the work, the patience question. |
| suspension | bad | `<team>` player suspended. What happened, how long, the roster hole. |
| clubhouse-tension | bad | `<team>` clubhouse tension. What is behind it, who is talking, does it reach the field. |

With all of it the list goes from 11 good / 3 bad / 4 neither (all in-season) to 22 good / 11 bad / 6 neither / 1 milestone, 11 of them off-season. Pitch priority 2 for all, 3 for `retirement` (the existing clinch/title words are 3).

**Typed words → aliases (10-22 ruling, per word):**

| Typed | Uses | Proposed |
|---|---|---|
| awards | 7 | → award |
| draft | 4 | → draft-night |
| community outreach | 4 | → community-outreach |
| blockbuster-trade | 1 | → traded |
| spring-training | 1 | → camp-opens |
| call-up | 1 | → debut |
| breaking-news | 16 | builder's call (Q1): no moment named; already an EventType |
| playoffs, pre-season, summer league | 9, 5, 2 | none: SeasonType words, the phase raises its own pitch |
| contract-year, legacy, contract, big-contract, roster-decision, closer-battle, star-power, quiet-excellence, Game of the Week, analysis | 1-2 each | none (no single moment; the new words cover the contract ones going forward) |

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Builder rulings Q1-Q3 (below) recorded verbatim in this plan | builder / es | not started |
| 2 | Mechanism 1-6 in `applySportsSeason.js` (`processFeedSheet_`, `reduceFeedTeamState_`, `inferFeedTrigger_` replaced by the game-week pick, `canonicalFeedTrigger_`, `readOaklandFeedEntries_`); bar read through the Q2 config. Unit test `scripts/sportsFeedTriggers.test.js`: carry gone, every row speaks, blank/`-`/`none`, W2 vs bar, finals vs clinch, alias, off-season row. Existing sports tests stay green | es | not started |
| 3 | Vocabulary per Q1: `TRIGGER_HOOKS` (`storyHook.js`), `EVENT_TRIGGER_VALUES` + header notes for EventTrigger / PlayerMood / Streak (`setupSportsFeedValidation.js`), the pin in `sportsFeedContract.test.js:477-493` (dropdown == hook keys minus the two engine-only words), `storyHookRouting.test.js:85`, `visual-qa.js:158` fixture | es | not started |
| 4 | Mood triggers per Q3 (`applySportsSeason.js`, `storyHook.js` if pitched) | es | not started |
| 5 | Truth docs in the build commit: `docs/OAKLAND_SPORTS_FEED.md` (K row :117, audit :127-137, Phase 2 behavior), `seedSandboxFeeds.js` comment, `/stub-engine` regen, DEPLOY_HISTORY entry at push | es | not started |
| 6 | Sandbox proof on the exact candidate, live-synced bench, bench-only planted rows (marker in Notes): fire 1 = A's off-season rows (a new word + blanks), Oaks game rows typed `hot-streak` at W2 and a second word on another row; fire 2 = both teams blank cells, Oaks W≥bar. Readback Story_Hook_Deck, Ripple_Ledger, Engine_Errors per fire | es | not started |
| 7 | Codex review of the diff (exact deploy candidate); one re-review of the fold at most | codex | not started |
| 8 | PROD push with smoke note; `pm2 restart godworld-dashboard` (dashboard reads the list at start); builder re-runs **Setup Sports Feed Validation** from the GodWorld menu (validation only, no cell values); first live fire read | es / builder | not started |
| 9 | Handoff to engine.333: the ruled vocabulary, `retirement` on the list, canonical word on `S.sportsFeedEntries[i].eventTrigger`; its routing table re-pointed at surviving words | es → rb | not started |

## Acceptance

1. A team whose earlier Cycle carried `hot-streak` and whose rows this Cycle are blank gets no `hot-streak` pitch and no `[hot-streak]` in Ripple_Ledger — bench fire 2 readback.
2. A W2 game week typed `hot-streak` gets no hot/cold pitch; a game week at or past the bar gets `hot-streak` with this Cycle's streak in the text — bench fires 1 and 2.
3. An off-season row with a new word gets that word's pitch for its team, no hood — bench fire 1.
4. One team, two rows, two words → two pitches; two rows, one word → one — bench fire 1.
5. A team with rows but no game and no word gets no sports trigger pitch (the C114 A's case) — bench fire 2.
6. A `world-series` / `finals` week raises no CHAMPIONSHIP pitch; a clinch week (SeasonType `championship`) does — unit test (no live title week to bench on).
7. 0 new Engine_Errors on both fires.
8. The dashboard offers exactly the ruled list after restart (`GET` the intake options) and accepts a row with a new word.
9. First live fire after PROD: the sports pitches in Story_Hook_Deck all trace to a word on that Cycle's rows or to a streak at the bar — live read.

## Pre-mortem

- **The author has written against the carry for 14 Cycles.** The header note says "a blank row keeps the earlier trigger"; after this, blank means no moment. The note and the K row say so the day it ships, and the reply to the builder says it plainly.
- **Sports pitches drop in number.** Most weeks will have fewer pitches than today, because the carried ones were most of them (C114: 2 of 2). Fewer, true pitches is the goal; sports desk volume should be read at the first live fire.
- **engine.333 builds on this vocabulary.** If the list moves after 333 builds its routing, 333's table drifts. The Q1 ruling, not the PROD push, unblocks 333's design.
- **The sandbox is shared.** One unproven change in flight across both terminals; this bench waits its turn.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| engine.331 trigger trace | codex | [[../research/2026-11-05-codex-engine331-trigger-trace]] | read-only |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | Carried trigger labels reach Ripple_Ledger CauseDetail → Story_Seed_Deck `Why` → world summary, not only the hook deck (C114 seed fd4277fa, verified) | es · codex | trace:23, :33; `buildContractSeeds.js:464` |
| A2 | `none` is the only value that stops the carry; the dashboard rejects it | es · codex | trace:17; `sportsFeedContract.js:297-299` |
| A3 | Mood reaches named-player, household and generic game-night lines through `gameNightBucket_`, this Cycle's rows only; trigger does not | es · codex | trace:18, :24 |
| A4 | `player-frustration` / `player-energy` are produced and reach no pitch | es · codex | trace:22, :28; `storyHook.js:567-603` |
| A5 | Off-list words pass into the trigger array, make no pitch, and block the engine's own pick | es · codex | trace:17; `applySportsSeason.js:1014-1018` |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|
| P1 | Fewer sports pitches does not starve the sports desk slices | es | first live fire after PROD: desk slice hook counts vs C112-C114 | Pre-mortem |

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|
| N1 | Changing either column changes `civicEventView`'s whole-row `sourceRevision` hash for a qualifying row | codex · trace:27 | a feed edit can re-key a civic duty event | held — not touched by this plan (cells are not rewritten) |
| N2 | `S.eveningSportsDetails` holds the last entry and has no reader | codex · trace:28 | dead summary field | parked (not this row) |

## Open questions

- **Q1 — the word list.** Which of the proposed words go on the list (any subset), the alias table, and `breaking-news`: a moment word of its own, or left out? Recommendation: the off-season set whole, the in-season sets as drafted, the six aliases, `breaking-news` left out (it names the kind of entry, not what happened). Blocks Tasks 3, 9.
- **Q2 — the hot/cold bar.** Recommendation: the World_Config `sportsStreakHeadline` dial he already set at 5, so "hot" means one thing to the city and the business desk. Alternative: keep today's 6. Either way the player win-streak night stays at 4 unless he says otherwise. Blocks Task 2's bar read.
- **Q3 — the two mood triggers.** Give them a pitch on game rows, or stop making them (mood still sets the game-night line tone and goes to the newsroom). Recommendation: stop making them — they have never produced a story. Blocks Task 4.

## Changelog

- 2026-11-05 (engine-sheet) — Created from G-ES1, the engine-sheet trace and the codex independent trace; takes engine.204's trigger-word piece (10-22 ruling); Q1-Q3 to the builder; codex plan review next.
