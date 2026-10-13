---
title: Media Extension Plan — every desk writes for a purpose, citizens' lives in the slices
created: 2026-10-11
updated: 2026-10-12
type: plan
tags: [media, newsroom, draft]
sources:
  - scripts/newsroom-fanout.js:47 (WEEK_GRID — the 22 weekly seats)
  - scripts/cron-desk-run.js:46 (BEAT_BUILDERS — 13 seats written from a slice)
  - scripts/beatSliceKit.js (shared slice shape; sportsSubject at :355)
  - scripts/buildHealthSlice.js (approach + ineligible = K.sportsSubject)
  - scripts/dumpBeatTabs.js (BEAT_TABS — no LifeHistory_Log)
  - scripts/buildWorldSummary.js:280 (WHO_LIVED_IT_TAGS) · :1129 emitDeskSignal
  - Bay_Tribune_Oakland tab (live staff roster, read 2026-10-11)
  - LifeHistory_Log live, C105–C111 tag census (read 2026-10-11)
  - editions/cycle_pulse_c110.txt (read in full 2026-10-11)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.73"
  - "[[2026-09-07-beat-slices-from-sheets-plan]] — pipeline.68, the slice layer this extends"
---

# Media Extension Plan — every desk writes for a purpose, citizens' lives in the slices

**Builder's words (2026-10-11):**

> "each reporter is basically assigned to element of what the engine produces or is added into the engine — Civic for that, Sports for that, Health for that. The problem is they are likely writing about the system of say the health system and ask citizens about that. Undocked similar, cover the system that it is and ask citizens about it."

> "All these journalist are core members of the sim, before crons. So the only method to give a citizen a life was in a media interview. It's was quite literally the point of the media interview the beginning. Now the crons live their own lives, whether it be engine events to life history or cron reflections. So the interviewing them still happens and it's what pushes their usage and tiers, but the Citizen experience has since grown a lot and it's the only element running daily now also."

> "the health desk should be reporting on hospital stays, the questions becomes on who is writing and why. So we have 22 or 23 journalists, the idea is to cover the sim, which isn't just a traditional news room set up. The citizens here aren't private, if someone lost at the casino that is news, if a couple got divorced that is news, if Isley Kelley opened a business that is news. That is the sim game happening."

> "The crime data and health rates are good to know but also easy to find for me, how deacon Seymour week went while in the hospital, I have no idea. But it happened."

> "it's not that I don't want to have Carmen cover the politics cause that's what keeps them honest but them as the citizens is likely more important than the civic initiatives, health desk should be covering the citizens and their health. Mentioning the numbers is fine if they are being used to state a change but [dropping] them without any context doesn't do much."

> "Let's start make it part of a media extension plan … making sure each are writing for a purpose, what lane they cover and why, and injecting citizens lives into slices that make sense and deciding who is the journalist that should just report on random citizens … We can walk through tech reporter and understand what they do and why." — "tech reporter" is dictation for **each reporter** (misread as a tech seat 2026-10-11, corrected the same session).

> "I'd be careful making direct changes without proper reviews and blast radius code checks with wiring cards."

> "We will do a deep canon search on what each journalist has written to see who they are if it's not obvious."

> (2026-10-12) "Civic is likely 10% and Citizens is likely 90%. Same with seeds from the engine, I'd say is 5-10% civic and 90-95% everything else." — "my point is civic is the least important part of the sim and makes up for almost all of the coverage." — "it's the same story written since c 89 yet the As manager gets hurt at work and no one covered it. The crons aren't covering the news, they are writing the same story over and over." — "The reason is there is very little civic to cover, no one is paying attention to it, it's what you're obsessed with pushing on me."

> (2026-10-12, correcting rb's approach to the Carmen Delaine walk) "You're taking the wrong approach to that but we will do that work last, finish the smaller items and then we will look at the failed crons and the media will get its own session, we aren't changing them all to talk about citizens. We are graphing who they are what they cover and why. Maybe some of these will get a citizen angle but most won't so you have the approach wrong."

**Reading (2026-10-12):** the media work is a MAP — who each reporter is, what they cover, why — not a conversion of every desk to citizen stories. Some seats will get a citizen angle; most will not. Do not propose a lane change per reporter (the Carmen walk proposed three, all citizen-leaning; the builder rejected the framing). Order: smaller builder-call items first, then the failed crons, then media in its own session, last.

> (2026-10-12, framing the media session) "I think we need a clean session since I want to try to map out each journalist, and the lane they are covering. The media has been decent on covering systems and using the citizens for the feel of them. What you uncovered was nothing is really covering the citizens lives, what the wakes are talking about, the cron stories, we did find that desks are getting things like Deacon Seymour in the hospital with a work place injury but it didn't get covered. So that suggest some current journalists aren't strict to their beats. So we have 23 journalists, knowing what all 23 are covering could show us what crossing over, what's missing, and what the week rotations should be."

> (2026-10-12, starting the walk) "let's walk through the map together, take 1 at a time. in the case of the sports reporters they are meant to cover different angles albeit the same sports stories but once we arrive on those we will discuss, as we take them one or by desk we can make sure they cover different elements and they given the opportunity of variety" — the walk goes one seat or one desk at a time; the sports seats are meant to share the same stories from different angles, so the sports overlap in the map is read at the sports desk, not treated as a defect beforehand. Goal per seat/desk: distinct elements and room for variety.

> (2026-10-12, walk — civic desk) "civic has a desk or journalists and Carmen is the lead of that desk, She is the voice that drives a "positive" or "negative" angle that effects their approval rating. So she is the high level what moved what didnt, who stalled, etc. civic runs daily and has city hall, so depending on how many civic reporters their are may determine the best way to balance the workload"

**Check of that (rb, 2026-10-12, code):** the approval press lever is the edition's CIVIC domain rating, not a byline. `scripts/rateEditionCoverage.js` rates each article -5..+5, maps it to a domain by section header or the reporter's beat, averages per domain, and writes `Edition_Coverage_Ratings`; `phase05-citizens/updateCivicApprovalRatings.js` `mediaScore_` takes (CIVIC rating + all-domain average) / 2 and steps approval ±1 or ±2. Carmen is one of the articles in that CIVIC average; which seats map to CIVIC is not yet traced. Seats with `desk: civic` in the wake packages: Carmen, Luis, Jax, Rachel, Trevor, Lila, Angela, Noah (8). On the weekly grid they sit Mon (Carmen, Lila, Trevor), Tue (Luis, Rachel, Angela), Wed (Jax, Noah); Thu and Fri have no civic seat. City hall office datawakes run Mon–Thu 05:45 (`cron-civic-run.js --stage=datawake`), the Sunday chain applies.

**Session outputs (builder's three, 2026-10-12):** (1) what each of the 23 covers — the map; (2) what is crossing over between seats, and what is missing; (3) what the week rotations should be. Media is judged as it is: decent on systems, citizens used for feel; the gap is citizens' lives (what the wakes talk about, what the cron stories cover). Deacon Seymour's workplace hospital injury reached desk feeds and went uncovered, so seats are not holding their beats.

**Start-of-session evidence (rb, 2026-10-12, Carmen Delaine as the sample):** her angle was the same fixed item (West Oakland Stabilization Fund, disbursement-active) C107–C111, five straight cycles; her C111 interviews were the mayor, deputy mayor, fund director and a council-level quote, all press-release lines; her voice file says "follows the money, not the press release." Prior diagnosis to read first: supermemory 2026-09-24 "Why 24 journalists read like 4 (verified S433)" — `scripts/cron-desk-run.js` maps reporters onto few builders. Method: deep canon search of what each journalist has actually written; descriptive first, no lane changes proposed before the map is read together.

> (2026-10-12, tying the wake design to the media map) "Yeah es is formulating that plan and it feeds into what you're next session will be about in the media mapping and what they cover, what slice they get, ultimately does a journalist exists to cover citizens stories or will a desk need to be minted."

**Question the map must answer (builder 2026-10-12):** is there a journalist whose job is citizens' stories (an existing seat), or does a citizen-stories desk have to be minted? Read with the map's other outputs (what each of the 23 covers and what slice each gets). Feeds from engine.286 N31 (the wake as the citizen's turn to act: money and job levers missing, es is formulating that plan). Decide after the map is read together, not before.

**Goal:** the builder's three asks, in his words: "making sure each are writing for a purpose, what lane they cover and why", "injecting citizens lives into slices that make sense", and "deciding who is the journalist that should just report on random citizens". Nothing below decides any of them; they are decided with the builder, reporter by reporter.

**Rows:** pipeline.73 · **Owner:** research-build with engine-sheet

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | **Map filled 2026-10-12 — builder reads it next.** Map the reporters (builder 2026-10-12: a map, not a conversion): for each of the 23, what they cover and why, taken from what they have actually written (deep canon search) and the voice file; fill the table below as evidence, then read it together with the builder for crossover, gaps and the week rotations. The table has 24 seat rows; the builder counts 23 journalists, so reconcile the count first (Bay_Tribune_Oakland roster vs the weekly grid vs the Fri/daily seats). | Mags + builder | map filled; read with builder pending |
| 2 | With the builder: which slices citizens' lives make sense in. | Mags + builder | not started |
| 3 | With the builder: who is the journalist that just reports on random citizens. | builder | not started |
| 4 | Any code that follows from 1–3 gets wiring cards, blast-radius checks and a review before it changes. | es | not started |

## Reporter map (Task 1 — filled 2026-10-12, descriptive only; the builder reads it, nothing here changes a lane)

**Count reconciled.** The weekly grid (`scripts/newsroom-fanout.js:47`) holds 23 seats (5+4+5+4+5) — the plan's earlier "22" predates Marbury's seating 2026-09-30. Nia Rook runs daily on top = 24 seat rows. Active wake packages = 25 (the extra is `nia-rook-weekly`, the UNDOCKED leaderboard digest, not required daily). The builder's 23 = the grid; Nia is the 24th. On the roster tab but not the grid: Lena Carrow, Dana Reeve, Farrah Del Rio, Reed Thompson, Ariana Reyes, Mint Condition (carried from the 2026-10-11 roster read, not re-read).

**Sources.** Desk, slice, and "told to cover" come from code: wake packages (`scripts/newsroomWakePackages`, field `reviewProfile.purpose`), slice wiring (`scripts/cron-desk-run.js` angle stage ~1462–1660), slice builders (`scripts/build*Slice.js`). "Wrote" comes from the published editions (`editions/`, bylines C78–C110, census by byline) and the staged cron-era articles C107–C111 (`output/cron-compare/staged/`). Four readers each read ≥5 published pieces per seat spread across the range plus every staged piece, not every article. Spot-checked against the files by me: Yu Zen in Lila's staged C107–C111 ✓; Stabilization Fund in all four of Carmen's staged pieces ✓; Selena and Talia both quote Jessie Hess C107 ✓; Kai and Sharon both name Lena Cross and Rowan Pierce C109 ✓; one reader claim (Kai C109 repeats Celeste's Marin Tao figures) was wrong and is dropped — the real overlap is Sharon and Celeste on Marin Tao C110.

| Seat (day) | Desk / domain | Slice it gets | Told to cover (package purpose, short) | Wrote (editions C78–C110 + staged C107–C111) |
|---|---|---|---|---|
| Carmen Delaine (Mon) | civic / CIVIC | civic-domain slice (desk signal + civic decisions/datawakes, no Sheets) | Trace votes, Initiatives, money, clocks; interviews no citizens | 37 editions pieces C78–C110: fund vote/queue, OARI clock, Fruitvale/Baylight votes. Stabilization Fund in C107–C110, four cycles running. C107–C109 are citizen quotes with no officials, C110 officials only. Citizen-centred: C87 Beverly Hayes' check, C92 Patricia Nolan |
| Jordan Velez, business-desk (Mon) | business / ECONOMIC | economic slice (one hood's Business_Ledger + Employment_Roster workers + business seeds) | Follow money, labor, development to the people carrying it | 30 pieces C79–C109. C79–C92 Stabilization Fund (same story as Carmen), C83–C99 Baylight bond/RFP; C100 and C101 are citizens' own promotions (Elio Perez, Joaquín Nakamura); C107–C111 firm rosters per hood; C103 Dimond stub with no people |
| Dr. Lila Mezran (Mon) | civic / HEALTH | health slice (Sick per hood, Hospital_Ledger, Health_Cause_Queue, Who Lived It) | One health-service Initiative or access condition; no diagnosing | C79–C102 Temescal health center (vote, floor plan, licensing, land, construction). C107–C111: Chinatown illness count, same story each cycle, with hospitalized Yu Zen (workplace accident) quoted in all five — a citizen's hospital stay, written as a census |
| Trevor Shimizu (Mon) | civic / INFRASTRUCTURE | transit slice (Transit_Metrics, transit workers, hooks) | One transit/infrastructure condition → systems consequence | C79–C101 culverts, water pressure, $60M maintenance gap, Hub groundbreaking; C107–C111 12th Street Station ridership (C107–C109, C111) + Lake Merritt dip (C110), frontline transit workers quoted |
| Anthony Raines (Mon) | sports / SPORTS_ANALYTICS | Anthony slice (shared sports substrate + TrueSource dossiers) | One sourced analytic claim; sample limits stated | 34 pieces (byline "Anthony" to C93, "Anthony Raines" from C94): game/player analysis; ~15 of 17 read are athlete lines. Paulson/Oaks front-office pieces C96–C101. Staged C110 and C111 are two models on the same Ellis Game Five |
| Luis Navarro (Tue) | civic / CIVIC | civic-domain slice | What the Packet establishes vs what stays open; documented silence | C79–C102 CRC silence, OARI clock, Baylight, KONO blackout (C96), crime drop (C102). C103–C110: the same "who owns the civic gap / Fruitvale Hub" story seven cycles, built on a recurring citizen cast (Rick Walker, Elio Perez, Depak Ying, Melton Neilon); C110 three officials, one sentence |
| Sgt. Rachel Torres (Tue) | civic / SAFETY | safety slice (Crime_Metrics, Judicial_Ledger, custody trail) | One public-safety incident, classification gap, or OARI question | 4 editions pieces (C96, C97, C105). Staged C107–C110: neighborhood incident/response-time tables, not an incident; none of the four found in editions. No piece centred on a citizen's own incident |
| Angela Reyes (Tue) | civic / EDUCATION | schools slice (enrollment drift, SchoolQuality, district card, hooks) | One school/youth/apprenticeship Initiative as program stability | C85 volunteer, C89 church tutoring, C90 population surge, C103 apprenticeship stub; C106–C110 Rockridge school quality four cycles. Apprenticeship Initiative appears once |
| Selena Grant (Tue) | sports / SPORTS | Oaks beat slice (Oaks rows of Oakland_Sports_Feed) | Analyst's read of the expansion build; "NOT fan heat, NOT the street" | C78–C90 Bulls-era Chicago Bureau pieces (records, officials). From C107 Oaks: opening night, losing preseason C108–C110. C107–C109 read as fan sentiment with resident quotes; only C110 is board-read |
| Jax Caldera (Wed) | civic / ACCOUNTABILITY | Jax stink slice (top stink, contradiction frame, scene pack) | Accountability pressure where record and public story diverge | 8 pieces C91–C106 + staged C107–C110. Frame "map says decay, roster says nothing" repeats C102, C106–C109 (Chinatown, Fruitvale, Downtown); C110 West Oakland crime spike marked ended. Every piece is a bar/street scene; officials/tracker rows carry ~9 of 12 |
| Noah Tan (Wed) | civic / ENVIRONMENT | environment slice (Cycle_Weather + season-feel citizens) | What the season moved; weather is context, live a person on a day like this | C82 air check, C83 KONO disturbance, C104 Sandra Velazquez (seasonal health), C106–C110 fog/overcast with residents' moods; C110 centres residents' health |
| Elliot Marbury (Wed) | sports / GENERAL | data-desk slice (player dossier, rates, two peers) | One audit-grade claim a number carries; interviews nobody | One published piece, C110 "The Horn Line" (peer band blank, said so). Staged C110 identical |
| P Slayer (Wed) | sports / SPORTS | P Slayer slice (sports feed pulse, charge bag, prior takes) | Turn a result into fan consequence; own or double down on a prior take | 25 pieces C79–C110. C84–C92 Taveras hate-the-signing → I-was-wrong arc. ~11 of 17 read built on athletes/roster, ~6 on fans (Ed 91 Dante Turner; c110 Hess, Cloak). Cron-era c107/C108 are player quotes at bars with little take |
| Tanya Cruz (Wed) | sports / SPORTS_SIDELINE | Tanya slice (shared sports substrate) | Short clubhouse dispatch; room is allotted texture | 5 pieces: C79 wiffleball day for the Fund, C103 and C104 number restatements with no clubhouse, C105, C110 clubhouse. Staged C107 not in editions. Players only |
| Elliot Graye (Thu) | culture / COMMUNITY | faith slice (Faith_Ledger 7 cycles + Faith_Organizations rotation) | One faith-community or quiet-care signal through observable function | C78–C89 congregations opening doors (Allen Temple, meal programs); C82 Calvin Turner starts at the meal program after his mother passed; C107–C110 one congregation each cycle, C110 attendance counts and no resident. Cron-era piece says "I haven't had any direct involvement" |
| Simon Leary (Thu) | sports / SPORTS_LONG_VIEW | Simon slice (shared sports substrate) | One present sports structure as civic architecture | 7 pieces C96–C109: Kelley as guest priest (C96), Dillon's role move, "continuity through role change" C103, C106, C108, C109, C110. All athletes; one citizen quote (Ollie Campbell, C106) |
| Hal Richmond (Thu) | sports / SPORTS_HISTORY | Hal slice (sports substrate + dossier + his prior filings) | One present fact across time; historical echo | 20 pieces C79–C105 + staged C109, C110. Keane/Kelley farewell season C79–C100; 1967 Oaks C93; trades C101; Abraham C102. Staged pieces refuse to invent. Athletes and history; citizens in background |
| Talia Finch (Thu) | sports / SPORTS | Oaks ground slice (PlayerMood, FanSentiment, neighborhood around the park) | A supplied Oaks fact carried into a room; what the city thinks | C78–C90 Chicago bars and porches (Paulson leaving; Paulette Okafor recurs, C87 "The Umbrella She Didn't Bring"). C106–C110 Oaks: a bar per cycle (West Oakland, Downtown, Webster, Baylight fence, Dimond); cron-era resident quotes are templated "I feel like…" lines; C109 no residents |
| Mason Ortega (Fri) | culture / CULTURE | economic slice (food filter) | Restaurant signal as a workplace question | 6 pieces C87–C110, 8 of 8 read built on kitchen workers, none on officials. C106–C110 one named worker describing a typical shift each cycle (Harborline, OakHouse, OakTown Social, Fruitvale Diner, Nino's); no labor consequence or life event |
| Kai Marston (Fri) | culture / CULTURE | arts slice (Cultural_Ledger risers/fadeers, culture seeds) + evening pack | Present-tense arts/entertainment scene; a named place as neighborhood act | 12 pieces C79–C106: First Friday ×5, festivals, Janmashtami; C104–C106 templated resident quotes. Cron C108 Tara Ellison, C109 ledger rundown (self-score sim-state-cited=no) |
| Sharon Okafor (Fri) | culture / CULTURE | lifestyle slice (Cultural_Ledger fame) + evening pack | One venue condition as a behavior question | One published piece (C104, an Aitken sighting at a church). Unstaged cron output C109 and C110 "When a Name Stops Arriving" — the same Lena Cross fade, two cycles, fame-ledger essay not a venue |
| Maria Keen (Fri) | culture / CULTURE_GROUND | neighborhood slice (Community_Programs, hood population drift) + evening pack | One named neighborhood or evening condition as human-scale ground brief | 34 pieces C79–C109. Early: Fourth of July, church gatherings (C84, C93, C94, C100 — faith lane), grief gathering C93, Dillon sighting C105. C108–C110 ledger counts + generic neighbor quotes ("Dimond is still a bit of a mystery to me") |
| Celeste Tran (Fri) | wire / CULTURE | trends slice (Cultural_Ledger MediaCount, hood movement) | Fast trend read; count is hers, mood hers to name | No Cycle Pulse byline (one supplemental, C84 "The Oakland Stack", tech registry). Staged C108 Marin Tao 25 mentions with four residents saying they haven't thought about it; C110 Marin Tao again + hood population (Downtown +10), no citizen voice |
| Nia Rook (daily) | undocked / CULTURE | UNDOCKED feed slice (gate-approved feed pack + standings sidecar) | Recap the gate-approved episode: who's up, who's down | 3 editions pieces C104–C109; staged one pilot per cycle (C104 Merkin Jumper … C111 Rosario Medina). Model-dependent: llama pieces reuse generic scaffolds and mention "the A's doing well"; grok pieces use credit deltas and an unnamed crowd. Clarissa Dane holds the top slot seven cycles |

**Same story, one seat, many cycles (as written):** Carmen — the Fund (C84–C98, C107–C110); Luis — Fruitvale/civic gap (C103–C110); Jax — decay frame (C102, C106–C109); Lila — Chinatown illness / Yu Zen (C107–C111); Trevor — 12th Street ridership (C107–C111); Angela — Rockridge (C106–C110); Noah — fog (C106–C110); Mason — one kitchen worker each cycle (C106–C110); Simon — role change continuity (C103–C110); Selena/Talia — losing preseason (C108–C110).

**Crossover (same fact or same people, two or more seats):**
- Oaks: Selena + Talia on the same facts and the same residents every cycle C107–C110 (Hess, Trevor, Nawan; Dimond bar C110); P Slayer c110 uses Hess and Cloak; Tanya, Selena, P Slayer share the "electric/energy" quote register c104–c110; Nia's llama pieces reuse the same residents (Nawan, Cloak, Fay, Clark).
- Culture ledger: Kai + Sharon C109 (Lena Cross, Rowan Pierce); Sharon + Celeste C110 (Marin Tao 25 mentions, Rico Valez 19) — three seats read the same Cultural_Ledger rows the same weeks.
- Stabilization Fund: Carmen and Jordan Velez C79–C92; also Jax C93/C98, Graye C78/C84, Tanya C79, Anthony C78. Fruitvale Hub: Luis + Trevor C103, Carmen. OARI: Carmen, Luis, Rachel C96–C97, Maria C84.
- Faith: Maria C84/C93/C94/C100, Angela C89, Simon C96 (Kelley as guest priest) all in Graye's lane. Health: Noah C104 and C110, Maria C110 (arrests, hospital beds). Sports front office: Anthony C96–C101, Hal C101/C102, Jax C95, Jordan C94.
- Same player, two sports seats: Horn (Anthony c108, Marbury c110); Ellis (Tanya, Anthony C110); Richards (Hal C101, Simon c106).

**Gaps (what no seat wrote):**
- Deacon Seymour's workplace injury and hospital stay (C105 → recovery): grep of C105–C110 editions and all staged files finds no piece naming Seymour with hospital/injury/accident/recovery. The seats that carry the A's (Anthony, P Slayer, Hal, Tanya, Simon) have none; Lila's health slice drops sports figures by rule.
- A citizen's own life event as the subject is rare: Lila C107–C111 (Yu Zen), Graye C82 (Calvin Turner), Jordan C100/C101 (promotions), Carmen C87/C92, Talia C87. None in the cron-era sports, culture or wire seats.
- Cron-era quotes: templated resident lines and disclaimers ("I haven't really thought about Marin Tao…" Celeste C108; "I haven't had any direct involvement…" Graye C109) in Talia, Kai, Maria, Mason, Celeste, Nia llama.
- Thin or absent record: Celeste no edition byline; Sharon one piece; Marbury one; Rachel and Jax staged C107–C110 not found in editions (staged ≠ published).
- Feed concentration: eight seats draw on sports material (P Slayer, Anthony, Hal, Tanya, Simon on one shared sports substrate; Selena and Talia on the Oaks feed; Marbury on player dossiers) = 8 of 24. Eight civic-family seats (Carmen, Luis, Jax, Rachel, Trevor, Lila, Angela, Noah) plus Jordan on business. Four on the culture ledger (Kai, Sharon, Celeste, Maria). No slice carries LifeHistory_Log (the beat dump excludes it).

**Not decided here (builder reads this table, then):** week rotations; whether an existing seat is the citizens'-stories journalist or a desk is minted (Task 3); which slices citizens' lives go into (Task 2).

## Record (measured 2026-10-11, data only)

- 13 of the 22 grid seats write from a slice (`scripts/cron-desk-run.js:46`). The slices are built from the beat-tab dump (`scripts/dumpBeatTabs.js`), which does not include `LifeHistory_Log`.
- The other seats draw from the desk signal. C111: civic 54, business 46, culture 20, sports 8 items. Citizens' lives: one pointer item, filtered by `WHO_LIVED_IT_TAGS` (`scripts/buildWorldSummary.js:280`), which passed 21 of 2,771 C111 log rows.
- C110 edition: 6 of 9 pieces quote a citizen, 5 of them on someone else's story; 1 piece (Colin Phillips, Nino's) on a citizen's own work; no LifeHistory event in any piece.
- Deacon Seymour: ambulance (workplace accident) C105, then "recovering", then "full recovery, returned to duties". No health slice existed C105/C106. `buildHealthSlice.js` drops sports figures from the hospital record. He appears in C108 only as the manager quoted on Danny Horn.
- Measured 2026-10-12 (engine-sheet, data only): C110 daily news source (142,600 chars) = civic 33%, sports 31%, culture/fame/faith 17%, citizens' lives 12%, UNDOCKED/wire/meta 8%. Cron disk output Oct 5–11: civic ~736 KB vs citizen reflections + exchanges ~26 KB. Desk-signal civic lane C105–C111: 21–33 of 30–58 items each cycle are the same standing initiatives (6–8 initiative + 6 vote items every cycle). Stabilization Fund / Transit Hub named in nearly every edition C89–C110. Seymour C105: the only desk-signal item was sports lane 7 of 12, "A's | team-update | (playoffs) | Deacon Seymour" — the injury itself never reached a desk.
- A draft code change (LifeHistory into the dump, a lived-events pass in `beatSliceKit.js`) was written and reverted 2026-10-11 on the builder's instruction about reviews and wiring cards.

## Acceptance

1. Every reporter on the table has a purpose, lane and why that the builder confirmed.
2. The builder has named the slices citizens' lives go into, and the journalist who reports on random citizens.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| — | — | — | none yet |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|

## Open questions

- Should a Tier-2 A's manager be able to get hurt by the ambulance event in the middle of a championship run? The builder raised it ("should he be able to get hurt like that?").
- Why did the A's championship run go uncovered? The builder raised it ("The As are in a championship run and no one covers that?").

## Changelog

- 2026-10-12 (engine-sheet) — Builder's words and the share measurements added. No design added.

- 2026-10-11 (engine-sheet) — Rewritten to the builder's words: the author's own designs (lead-with-lives, per-seat life classes, a reporter recommendation, code tasks) removed; the builder said the plan misrepresented him.
- 2026-10-11 (engine-sheet) — Corrected: "tech reporter" was dictation for "each reporter".
- 2026-10-11 (engine-sheet) — Created.
