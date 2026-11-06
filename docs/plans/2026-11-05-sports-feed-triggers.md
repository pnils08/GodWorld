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

**Builder's rulings on Q1-Q3 (2026-11-05, verbatim):** "Yeah the hot and cold streak can be a engine decision" · Q1: "Idk I thought being AI you’d have some ideas of trigger events and idk what to do with breaking news as you added it" · Q2: "Not sure what this means about a business hit steak  but I guess pick 1 number and keep it consistent?" · Q3: "Idk what mood triggers are but if the citizens don’t react then it’s not worth building the system". Resolutions in §Open questions. (`breaking-news` was not added by this plan: he typed it 16 times in the trigger column and 09-19 made it an EventType.)

**Builder's rulings 2026-11-06 (verbatim):** "No reasons to not cold streak set as well . and handle the dropdowm moods add to the night line" · "And 5 games sounds like the good numbers to use for rhe streaks"

**Earlier rulings this plan sits on:**
- 2026-09-19, as recorded in [[2026-09-11-sports-as-a-lived-system]]:80 (not his verbatim words): "An EventTrigger is a moment in the week (`draft-night`, not `draft`). His recurring non-hook words were SeasonType (`playoffs`, `pre-season`) and EventType (`breaking-news`, `awards`, `draft`, `community outreach`) values in the wrong column."
- 2026-10-22, engine.204, the option he chose (verbatim): "Remove HomeNeighborhood + EconomicFootprint; wire FranchiseStability and CommunityInvestment so they move numbers as you ruled; add the week record + missing event types to the dashboard and make the common ignored trigger words real hooks."

**Reading of the two (Q1 ruled 2026-11-05 on this reading):** they pull opposite ways on the words he types most. 09-19 moved phase words and entry kinds out of the trigger column; 10-22 says the common ignored words become hooks. This plan reads them together as: a recurring word that names a *moment* (awards, draft, community outreach, blockbuster-trade) becomes a dropdown moment word; a word that names a *season phase* (playoffs, pre-season, summer league, spring-training) stays out, because the phase already raises its own story idea. `breaking-news` (16 uses, the most common) is neither and stays an EventType.

**Goal:** a sports trigger is a moment that happened this week, on this row. A blank cell is no moment. Hot and cold come from the actual streak, not one game. The word list covers the off-season and gives both franchises good and bad moments, from a list the builder handed to engine-sheet (Q1).

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

1. **One reader of this Cycle's rows.** `readOaklandFeedEntries_` already builds `S.sportsFeedEntries` from the rows whose Cycle equals the running Cycle; it becomes the only place a row's trigger is read and canonicalized (mechanism 6). `processFeedSheet_` takes its moment rows from `S.sportsFeedEntries` (passed in by `applySportsFeedTriggers_`) instead of the carried team state. The reducer drops its `trigger` and `playerMood` fields; it keeps record, phase, streak, fan sentiment and media profile, which the sentiment log line and the aftermath path's second reducer call (`:968-995`) still use. Nothing else reads the dropped fields (codex trace §Engine readers; plan review F7). Gates (plan review F3):
   - **Running Cycle must be positive.** `readOaklandFeedEntries_` returns no current entries when `currentCycle` ≤ 0 (today a Cycle-0 row matches a 0 run, `:216-237`, and the reducer reads 0 as no upper bound, `:1069`).
   - **A's and Oaks only.** A moment is emitted only for those two franchises; `NFL` and retired labels make none (`normalizeOaklandFeedTeam_` returns `NFL`, `:470`).
   - **World_Config override = no feed moments.** The override already sets `S.sportsFeedEntries = []` and `S.sportsWeek = {}` (`:36-65`); with one reader, the hook path and engine.333's per-player path both see no moments under an override. One contract: an override declares a season, not moments. Today the hook path still pitches carried triggers under an override; no override is set on live World_Config (read 2026-11-05).
2. **Every row's moment counts, not only the team's last row.** Reading of 09-19 ("a moment in the week") plus the column contract ("One event per row"): C105's A's rows carried `hot-streak` on the game and `awards` on five feature rows, and only `awards` spoke. `storyHook` dedupes one pitch per team per word (`storyHook.js:593-595`). Stated, not asked — the builder can overrule.
3. **Blank, `-` and `none` are all "no moment on this row,"** resolved inside the canonicalizer before any unknown-word check. Nothing to clear from the dashboard once nothing carries; the dashboard needs no `none`. The sandbox seeder stops writing `none` / `quiet` and writes blanks (`seedSandboxFeeds.js:210-217` behavior + `seedSandboxFeeds.test.js:112-114`), so no bench row prints `Trigger: none` / `trigger=none` through the raw readers (plan review F7).
4. **Hot and cold are the engine's, decided once — one number, one rule, everywhere (Q2 ruled).** In `applySportsSeason_`, right after `markSportsStreakHeadline_` (`:118-127`): `S.sportsWeek[team].hotCold` = `hot` when `wk.streakHeadline` is set and `wk.streakRun.dir` is `W`, `cold` when set and `L`, else `''`. So hot/cold *is* the business desk's streak headline: a game week (`g > 0`), the last game row's run at or past World_Config `sportsStreakHeadline` (builder set 5 on 2026-10-27, `sportsWeekRecord.js:421-426`), and the week's signed result not running against it (`:447-458`). No second rule, no second bar read; an unusable dial already logs one Engine_Error and returns `null` (`:433-445`), then no team is hot or cold anywhere that Cycle. The hard-coded W6/L6 (`inferFeedTrigger_` `:1168-1169`) goes. **Game night reads the same decision:** `gameNightBucket_` (`applyGameNightMoments.js:64-71`) drops its W4 literal and stays pure: `gameNightBucket_(entry, hotCold)`, the caller resolving the row's team — named players (`applyGameNightMoments.js:230`, `weeks[team]`), fans (`generateCitizensEvents.js:2187`, `gnTeam` / `gnWeeks`), households (`runHouseholdEngine.js:413`, `normalizeOaklandFeedTeam_(gameEntry.teamsUsed)` guarded with `typeof` like the fans caller); `householdEngine.t4.test.js:150` loads the function alone. The row's result decides first: a W row → `winStreak` in a `hot` week, else `win`; an L row → `coldStreak` in a `cold` week, else `loss` (a loss row in a hot week stays a loss). Mood sets the tone only on a game row with no Streak (Mechanism 8). Behavior change for fans and households: today a `confident` mood on an L row returns `win` (`:69`); after this the result wins. **Cold set (Q4 ruled yes):** a `coldStreak` pool in all three — `GAME_NIGHT_POOLS` (players), the fans' `gnTexts`, `GAME_NIGHT_HOUSEHOLD_` (lines in §Game-night lines). Text only: the named tag (`Sports-Played` / `-PlayedWin` from the week `cls`, `:140-141`) and the fan / household tags are unchanged, so no dial moves differently. `processFeedSheet_` pushes `hot-streak` / `cold-streak` from `wk.hotCold`, with this Cycle's streak in the pitch. A typed `hot-streak` / `cold-streak` canonicalizes to no word (status `engine-only`, logged), so `S.sportsFeedEntries` never carries it and engine.333 cannot route a typed one (plan review F4, F5). The two words leave the dropdown. "Game week" is the engine's accepted WeekRecord games (`S.sportsWeek[team].g > 0`), the rule sentiment, the casino and the bars use; a game-result row with no WeekRecord (live C110's A's title row) is no game week here either.
5. **`championship` fires on the clinch row, not the final round and not the week lens.** The week lens is the team's last row of the Cycle, any row (`deriveSportsWeekFromFeed_` `:325`), so it cannot prove a clinch (plan review F1). The engine's own pick: one of the team's accepted game rows this Cycle (`entry.weekGames > 0`) has raw SeasonType `championship` — the column contract's clinch game (`setupSportsFeedValidation.js:188`). Order-independent; `world-series` / `finals` game rows get no inferred title pitch. A typed `championship` still speaks.
6. **One pure canonicalizer, one caller that logs.** `canonicalFeedTrigger_(raw)` returns `{ word, status }`, status one of `blank` / `known` / `alias` / `engine-only` / `unknown`: trim, lowercase, spaces → `-`; blank / `-` / `none` → `blank`; then the alias map (Q1 ruled; e.g. `awards` → `award`). It logs nothing. `readOaklandFeedEntries_` calls it per row, sets `entry.eventTrigger` to the word (`''` unless `known` / `alias`, and `''` on any row whose team is not the A's or the Oaks — the reader still returns `NFL` and retired-label rows for their other fields, `:216-250`, `:458-477`, so the team gate sits on the field itself and every reader of it, engine.333's named route included, inherits it; re-review new 1), and logs each `unknown` / `engine-only` word once per Cycle (a per-Cycle seen set). The raw cell is untouched for the raw readers, which read the sheet themselves (handoff, beat slices, dashboard). An alias applies only to the EventTrigger cell; an EventType `awards` or SeasonType `spring-training` never makes a moment (plan review vocabulary note).
7. **Mood triggers stop (Q3 ruled).** `processFeedSheet_` no longer pushes `player-frustration` / `player-energy` (`:1020-1037`, header comment `:796`): no pitch, no citizen reads them. The PlayerMood cell is untouched and keeps its readers — game-night lines (`gameNightBucket_`), the citizen wake text (`cron-work-wake.js:151`), the newsroom handoff (`compileHandoff.js:1615`) and Oaks ground slice. Moment pitches use only fields the trigger object carries (`team`, `neighborhood`, `streak`); none names a player or a deal.
8. **Every dropdown mood colors the players' night line (builder 2026-11-06).** On a game row, each named player's game-night line gains a closing clause from the row's PlayerMood: `<result line> — <mood clause>`. One pool of three per word of `PLAYER_MOOD_VALUES` (nine words, `setupSportsFeedValidation.js:116-127`) in `GAME_NIGHT_MOOD_CLAUSES_`; a blank or off-list mood adds nothing; a pin test holds the keys equal to the dropdown minus `''`. Fans and households react to the result, not the clubhouse mood: only on a game row with no Streak does the mood set their tone, through `GAME_NIGHT_MOOD_TONE_` (confident, dominant, locked-in, electric → `win`; frustrated, uncertain → `loss`; hungry, reflective, quiet → `neutral`), replacing the regex that matched three words not on the dropdown (G-ES4). Text only, tags unchanged. The clause is one more `safeRand_` draw per named player, so later picks in the phase shift against a pre-change fire (expected; bench reads are by tag, not by text).

### Vocabulary (Q1 ruled 2026-11-05: the builder handed the list to engine-sheet; the whole proposal below is adopted, any word he strikes before PROD comes off)

Additions, each with its sign and pitch (pitch style follows `TRIGGER_HOOKS`; `<hood>` only on a home week). Every word is a pitch now and, through engine.333's routing table, a line in the life of each player named on the row; a word with no citizen route is not worth keeping (builder's Q3 test, Task 9).

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
| breaking-news | 16 | none: an EventType since the 09-19 ruling (`setupSportsFeedValidation.js:111`); it names the kind of entry, not what happened |
| playoffs, pre-season, summer league | 9, 5, 2 | none: SeasonType words, the phase raises its own pitch |
| contract-year, legacy, contract, big-contract, roster-decision, closer-battle, star-power, quiet-excellence, Game of the Week, analysis | 1-2 each | none (no single moment; the new words cover the contract ones going forward) |

### Game-night lines (builder 2026-11-06: cold set yes, moods into the night line; color, builder may strike or rewrite any)

All sport-neutral (the Oaks ride these pools too), they/them only.

**`coldStreak`:**

| Pool | Lines |
|---|---|
| Players (`GAME_NIGHT_POOLS`) | got the "hang in there" texts from everyone and answered none of them · stayed late at the facility looking for whatever has gone missing · heard the skid come up at the gas station and kept walking · stopped checking the standings and started counting the days to the off-day |
| Fans (`gnTexts`) | heard the bus stop arguing over who to blame for the skid · left the cap at home for the first time in weeks · watched another loss with the patience wearing thin |
| Households (`GAME_NIGHT_HOUSEHOLD_`) | kept the game off at dinner to keep the peace · let the kids pick the channel with the skid still going · sighed at the score and changed the subject |

**Mood clauses** (appended after ` — `):

| Mood | Clauses |
|---|---|
| confident | sure the next one belongs to them too · already talking about the next game like it was settled · sleeping easy, certain the work was done |
| frustrated | still chewing on the one play that went wrong · short with everyone and sorry about it by morning · unable to let the night go |
| hungry | already asking for more · alarm set early to get back to work · texting the coaches a question at midnight |
| reflective | turning the whole season over for a long while · looking through old photos from the first year with the club · up late thinking about how far it has come |
| dominant | feeling like nobody in the league could touch them · walking in the door like the block was theirs · not bothering to check anyone else's score |
| uncertain | wondering how much longer the role will hold · reading every comment online and wishing they hadn't · asking the family what they thought and not liking the answer |
| locked-in | already running the next game in their head · keeping the routine down to the minute · barely saying a word, all focus |
| quiet | keeping all of it to themselves · saying maybe ten words all night · letting the house stay quiet around them |
| electric | unable to stop pacing the kitchen · calling three friends before midnight just to talk about it · still buzzing hours after the game |

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Builder rulings Q1-Q3 (below) recorded verbatim in this plan | builder / es | done 2026-11-05 (Changelog) |
| 2 | Mechanism 1-6 in `applySportsSeason.js` (`applySportsSeason_` hotCold beside the streak headline, `readOaklandFeedEntries_` gates + canonical word + one log, `applySportsFeedTriggers_` passes entries, `processFeedSheet_`, `reduceFeedTeamState_`, `inferFeedTrigger_` replaced, `canonicalFeedTrigger_`), and `gameNightBucket_` + its three callers (`applyGameNightMoments.js`, `generateCitizensEvents.js`, `runHouseholdEngine.js`); the `coldStreak` pools and `GAME_NIGHT_MOOD_CLAUSES_` / `GAME_NIGHT_MOOD_TONE_` (Mechanism 8, §Game-night lines); `householdEngine.t4.test.js` 5.2 and `gameNightMoments.test.js` move to the `hotCold` argument (W4 → no streak lines; W5 at the bar → streak lines; W5 on a week whose signed result runs against it → none; L5 cold → `coldStreak`; `confident` on an L row → `loss`), plus a pin test: mood clause keys == `PLAYER_MOOD_VALUES` minus `''`, an off-list mood adds no clause. New unit test `scripts/sportsFeedTriggers.test.js`: carry gone; the un-deduped trigger array (two rows one word → two entries); blank/`-`/`none`; typed hot/cold → no word, logged once; W2 vs bar; unusable dial → no hot/cold, one error; clinch row both orders (world-series game + championship non-game row → none; championship game + later row → title); alias; unknown word on two rows → one log; Cycle 0; NFL and retired labels; override (entries `[]`) → no moments. Rewrite to the new contract: `sportsFeedParser.test.js:77-92` (dash/blank carry), `:117-120` (prior-Cycle carry), the `none`-clears test. Other sports tests stay green | es | done 2026-11-06 `592707c09` (319/319 test files; new `sportsFeedTriggers.test.js` 15) |
| 3 | Vocabulary per Q1: `TRIGGER_HOOKS` (`storyHook.js`), `EVENT_TRIGGER_VALUES` + header notes for EventTrigger / PlayerMood / Streak (`setupSportsFeedValidation.js`; the Streak note gains: for hot/cold, the streak goes on the week's last game row — a Streak typed only on a feature row is no run, `applySportsSeason.js:329-331`), the pin in `sportsFeedContract.test.js:477-493` (dropdown == hook keys minus the two engine-only words), `storyHookRouting.test.js:85`, `visual-qa.js:158` fixture | es | done `592707c09` (39 words, 5 aliases, 2 engine-only; pin moved) |
| 4 | Mood triggers stop (Q3): drop the push at `applySportsSeason.js:1020-1037` and the `:796` / `:815` comments; unit test that a `frustrated` / `electric` row makes no trigger | es | done `592707c09` |
| 5 | Seeder writes blank EventTrigger / PlayerMood (`seedSandboxFeeds.js:210-217` behavior and comment, `seedSandboxFeeds.test.js:112-114`). Truth docs in the build commit: `docs/OAKLAND_SPORTS_FEED.md` (K row :117, audit :127-137, Phase 2 behavior, override contract), `/stub-engine` regen, DEPLOY_HISTORY entry at push | es | done `592707c09` (DEPLOY_HISTORY at push) |
| 6 | Sandbox proof on the exact candidate, live-synced bench, bench-only planted rows (marker in Notes), ruled words. Fire 1: three A's off-season rows = word X, word X again, blank; three Oaks rows = (a) a game-result row with an accepted WeekRecord, Streak W2, EventTrigger typed `hot-streak`; (b) a non-game row with word Y; (c) a non-game row with word Z. Fire 2: every cell blank; Oaks game week at or past the bar. Each fire: team-qualified Story_Hook_Deck moment pitches (the three phase hooks, `storyHook.js:518-551`, excluded by their fixed texts); Ripple_Ledger trigger labels only where the games share is nonzero, the aftermath row read on its own; Engine_Errors rows of this Cycle from Phase2-SportsSeason / Phase2-SportsFeed / story hooks | es | running 2026-11-06: stage 38 = stage 37 + 7 files (`output/engine-sheet/2026-11-06-e331-bench.sh`, `…-push-e331-bench.sh`, reads `…-e331-reads.jsonl`) |
| 7 | Codex review of the diff (exact deploy candidate); one re-review of the fold at most | codex | not started |
| 8 | PROD push with smoke note; `pm2 restart godworld-dashboard` (dashboard reads the list at start); builder re-runs **Setup Sports Feed Validation** from the GodWorld menu (validation only, no cell values), then one EventTrigger cell's validation rule is read back as the sheet receipt; first live fire read | es / builder | not started |
| 9 | Handoff to engine.333: the ruled vocabulary — every word gets a route in its table, because a word no citizen reacts to is not worth keeping (builder, Q3) — `retirement` on the list, canonical word on `S.sportsFeedEntries[i].eventTrigger` (never `hot-streak` / `cold-streak`; a per-player hot line, if 333 wants one, reads `S.sportsWeek[team].hotCold`); override = no entries; its routing table re-pointed at surviving words; one shared test that a typed W2 `hot-streak` on a named row writes no streak line, and one that an `NFL` row's `retirement` retires no one. **Conflict on record (re-review F4):** engine.333 Design 1 routes `hot-streak` / `cold-streak` from `entry.eventTrigger`, and its Task 3 / Acceptance 2 plant and prove a typed `hot-streak` line; after this row that word never reaches the field, so that route and proof cannot fire. engine.333's plan is research-build's to revise at its read-before (drop the route, or read `S.sportsWeek[team].hotCold` for a named player on a game row) | es → rb | not started |

## Acceptance

1. The A's, carrying `hot-streak` from an earlier Cycle with only blank rows this Cycle, get no A's moment pitch; the A's labels in any sports Ripple row carry no trigger — bench fire 2 readback, team-qualified.
2. The Oaks W2 week typed `hot-streak` gets no Oaks hot/cold pitch (and one `engine-only` log line); the Oaks week at or past the bar gets `hot-streak` with this Cycle's streak in the text — bench fires 1 and 2.
3. An A's off-season row with a new word gets that word's pitch for the A's, no hood — bench fire 1.
4. Oaks words Y and Z on two rows → two Oaks pitches; A's word X on two rows → one A's pitch on the deck, two entries in the un-deduped array — bench fire 1 + unit test.
5. A team with rows but no game and no word gets no moment pitch (the C114 A's case) — bench fire 2.
6. A `world-series` / `finals` game row raises no title pitch in either row order; a `championship` game row does — unit test (no live title week to bench on).
7. Cycle 0, `NFL`, retired labels and an override make no moments; an unusable bar dial makes no hot/cold and one Engine_Error — unit test.
8. No new Engine_Errors rows of either fire's Cycle from Phase2-SportsSeason, Phase2-SportsFeed or story hooks.
9. The dashboard serves exactly the ruled list after restart (`GET` the intake options) and accepts a row with a new word; the sheet dropdown receipt (Task 8) shows the same list.
10. One decision, three readers: a team whose week ends on W4 gets no hot pitch and no streak lines for its players, fans or households; at W5 (the bar) it gets all four, and the business headline — unit test + bench fire 2 (Oaks at the bar: `[source:sports|gameNight]` streak lines on players and households).
11. No `player-frustration` / `player-energy` in the trigger array or any Ripple label — unit test + both fires.
12. The L side of 10: a week ending L5 at the bar gets the cold pitch and `coldStreak` lines on players, fans and households; L4 gets the plain loss lines — unit test (bench: only if the live-synced bench has an L5 week to plant).
13. Every named player's line on a game row with a dropdown mood ends in that mood's clause; a blank or off-list mood leaves the line as it was — pin test + bench fire 1 (set a mood on the Oaks game row) LifeHistory readback.
14. First live fire after PROD: every SPORTS moment pitch on Story_Hook_Deck (the `TRIGGER_HOOKS` texts; the three phase-hook texts excluded) traces to a word on that Cycle's rows or a hot/cold week at the bar — live read.

## Pre-mortem

- **The author has written against the carry for 14 Cycles.** The header note says "a blank row keeps the earlier trigger"; after this, blank means no moment. The note and the K row say so the day it ships, and the reply to the builder says it plainly.
- **Sports pitches drop in number.** Most weeks will have fewer pitches than today, because the carried ones were most of them (C114: 2 of 2). Fewer, true pitches is the goal; sports desk volume should be read at the first live fire.
- **engine.333 builds on this vocabulary.** If the list moves after 333 builds its routing, 333's table drifts. The Q1 ruling, not the PROD push, unblocks 333's design.
- **The sandbox is shared.** One unproven change in flight across both terminals; this bench waits its turn.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| engine.331 trigger trace | codex | [[../research/2026-11-05-codex-engine331-trigger-trace]] | read-only |
| engine.331 plan review | codex | [[../research/2026-11-05-codex-engine331-plan-review]] | HOLD → 9 of 9 verified in code and folded 2026-11-05 |
| engine.331 plan re-review (round cap) | codex | [[../research/2026-11-05-codex-engine331-plan-rereview]] | HOLD → 7 closed; F3 + new 1 (team gate on the field) and new 2 (fire-1 rows) fixed in place; F4 recorded as a cross-plan conflict for engine.333 (P2). No third round: the 11-06 builder-ordered scope (cold set, Mechanism 8) is reviewed in the Task 7 diff review |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | Carried trigger labels reach Ripple_Ledger CauseDetail → Story_Seed_Deck `Why` → world summary, not only the hook deck (C114 seed fd4277fa, verified) | es · codex | trace:23, :33; `buildContractSeeds.js:464` |
| A2 | `none` is the only value that stops the carry; the dashboard rejects it | es · codex | trace:17; `sportsFeedContract.js:297-299` |
| A3 | Mood reaches named-player, household and generic game-night lines through `gameNightBucket_`, this Cycle's rows only; trigger does not | es · codex | trace:18, :24 |
| A4 | `player-frustration` / `player-energy` are produced and reach no pitch | es · codex | trace:22, :28; `storyHook.js:567-603` |
| A5 | Off-list words pass into the trigger array, make no pitch, and block the engine's own pick | es · codex | trace:17; `applySportsSeason.js:1014-1018` |
| A6 | F1: the week lens is the last row's SeasonType, any row; a clinch must be read off the accepted game row → Mechanism 5 | es · codex | review:23; `applySportsSeason.js:320-337` |
| A7 | F2: under an override the hook path read the grid while `S.sportsFeedEntries` is `[]` → one reader, override = no moments (Mechanism 1) | es · codex | review:25; `applySportsSeason.js:36-65`, `:841-854` |
| A8 | F3: no positive-Cycle gate on the current-row read; `NFL` survives normalization → gates in Mechanism 1 | es · codex | review:27; `applySportsSeason.js:216-237`, `:470`, `:1069` |
| A9 | F4: a typed hot/cold on the per-row field would let engine.333 write a streak line the hook path refused → typed hot/cold canonicalizes to no word; `hotCold` on the week (Mechanism 4, Task 9) | es · codex | review:29; sibling plan Tasks |
| A10 | F5: a second bar read would double-log an unusable dial; the headline's sign gate is unstated → one read in `applySportsSeason_`; sign gate superseded by Q2 (hot/cold = the headline's own rule) | es · codex | review:31; `sportsWeekRecord.js:433-458` |
| A11 | F6: a logging canonicalizer called by two readers warns twice; `none` must resolve before the unknown check → pure canonicalizer, one logging caller (Mechanism 6) | es · codex | review:33 |
| A12 | F7: `sportsFeedParser.test.js` asserts the carry; the seeder's `none` prints as a raw "Trigger: none" fact → tests rewritten, seeder writes blanks (Tasks 2, 5) | es · codex | review:35; `sportsFeedParser.test.js:77-92,117-120`; `seedSandboxFeeds.test.js:112-114` |
| A13 | F8: phase hooks (`storyHook.js:518-551`) also land as SPORTS → Acceptance 10 scoped to moment pitches, phase texts excluded | es · codex | review:37 |
| A14 | F9: the bench recipe lacked a same-word pair and team-qualified reads; Ripple labels exist only with a games share → Task 6 recipe, Acceptance 1-4, 8 | es · codex | review:39; `applySportsSeason.js:868-904` |
| A15 | Re-review new 1: the canonical word on an `NFL` / retired row would reach engine.333's named route → `entry.eventTrigger` is `''` off the A's and Oaks (Mechanism 6, Task 9 test) | es · codex | rereview:43; `applySportsSeason.js:216-250`; `applyGameNightMoments.js:217-233` |
| A16 | Re-review new 2: fire 1 needed one cell per Oaks value → three Oaks rows (Task 6) | es · codex | rereview:45 |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|
| P1 | Fewer sports pitches does not starve the sports desk slices | es | first live fire after PROD: desk slice hook counts vs C112-C114 | Pre-mortem |
| P2 | engine.333's hot/cold route and its Acceptance 2 cannot fire once this row lands; its plan must change before it builds the named route | codex | research-build's engine.333 read-before revises Design 1, Task 3, Acceptance 2 | rereview:29; `2026-11-05-feed-triggers-to-life-history.md:91,118,124` |

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|
| N1 | Changing either column changes `civicEventView`'s whole-row `sourceRevision` hash for a qualifying row | codex · trace:27 | a feed edit can re-key a civic duty event | held — not touched by this plan (cells are not rewritten) |
| N2 | `S.eveningSportsDetails` holds the last entry and has no reader | codex · trace:28 | dead summary field | parked (not this row) |
| N3 | A stable source field on hook rows so a moment pitch and a phase hook can be told apart without matching texts | codex · review:37 | provenance proof that survives a pitch-text edit | held — not adopted: it adds a deck column; the fixed-text exclusion is checkable today |
| N4 | Pitches that name the player, the deal or the milestone number | codex · review:57 | richer pitches | held for builder — needs row fields added to the trigger object; not in this row |

## Open questions

- **Q1 — ruled 2026-11-05.** The builder handed the list to engine-sheet: the whole proposal, the six aliases; `breaking-news` stays an EventType (09-19). He may strike words before PROD.
- **Q2 — ruled 2026-11-05.** One number, kept consistent: World_Config `sportsStreakHeadline` (5), and one rule — hot/cold is the business headline's decision, read by the pitch and all three game-night readers (Mechanism 4). Supersedes A10's "no sign gate" and the earlier "winStreak 4 stays."
- **Q3 — ruled 2026-11-05.** The mood triggers stop (no citizen reacts to them). The mood cell stays.
- **Q4 — ruled 2026-11-06: yes.** A `coldStreak` set for players, fans and households (Mechanism 4, §Game-night lines).
- **Moods into the night line — ruled 2026-11-06** (builder's own addition, pulls G-ES4 into this row): Mechanism 8.

## Changelog

- 2026-11-06 (engine-sheet) — Builder: cold game-night set yes, every dropdown mood into the players' night line (Mechanism 8, G-ES4 pulled in), 5 confirmed. Lines drafted in §Game-night lines; reviewed with the diff.
- 2026-11-05 (engine-sheet) — Q1-Q3 ruled (words verbatim at top): list adopted whole; hot/cold = the streak headline's decision at 5, read by pitch + game night (W4, W6 go); mood triggers stop. Q4 (cold game-night set) to the builder.
- 2026-11-05 (engine-sheet) — Codex re-review (round cap) HOLD: 7 closed; team gate on the shared field and fire-1 rows fixed in place; engine.333 hot/cold conflict recorded (P2, Task 9). Reviews filed to research.
- 2026-11-05 (engine-sheet) — Codex plan review HOLD folded (9 of 9 verified): one row reader, Cycle/team/override gates, hotCold decided once, clinch off the game row, pure canonicalizer, seeder blanks, scoped proofs.
- 2026-11-05 (engine-sheet) — Created from G-ES1, the engine-sheet trace and the codex independent trace; takes engine.204's trigger-word piece (10-22 ruling); Q1-Q3 to the builder; codex plan review next.
