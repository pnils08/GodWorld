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

**Check of that (rb, 2026-10-12, code):** the approval press lever is the edition's CIVIC domain rating, not a byline. `scripts/rateEditionCoverage.js` rates each article -5..+5, maps it to a domain by section header or the reporter's beat, averages per domain, and writes `Edition_Coverage_Ratings`; `phase05-citizens/updateCivicApprovalRatings.js` `mediaScore_` takes (CIVIC rating + all-domain average) / 2 and steps approval ±1 or ±2. Carmen is one of the articles in that CIVIC average; which seats map to CIVIC is not yet traced. Builder correction (same session): "civic" in the walk means the seats covering the civic crons / politics, not the `desk: civic` tag, which also holds the element beats (transit, safety, health, schools, weather). Politics seats: Carmen (Mon), Luis (Tue), Jax (Wed) — the civic-domain slice (decisions and office datawakes) feeds only Carmen and Luis (`scripts/cron-desk-run.js`, `/^(carmen-delaine|luis-navarro)$/`). The other five `desk: civic` seats are element beats, read on their own turn. For reference the `desk: civic` tag covers Carmen, Luis, Jax, Rachel, Trevor, Lila, Angela, Noah (8). On the weekly grid they sit Mon (Carmen, Lila, Trevor), Tue (Luis, Rachel, Angela), Wed (Jax, Noah); Thu and Fri have no civic seat. City hall office datawakes run Mon–Thu 05:45 (`cron-civic-run.js --stage=datawake`), the Sunday chain applies.

**Session outputs (builder's three, 2026-10-12):** (1) what each of the 23 covers — the map; (2) what is crossing over between seats, and what is missing; (3) what the week rotations should be. Media is judged as it is: decent on systems, citizens used for feel; the gap is citizens' lives (what the wakes talk about, what the cron stories cover). Deacon Seymour's workplace hospital injury reached desk feeds and went uncovered, so seats are not holding their beats.

**Start-of-session evidence (rb, 2026-10-12, Carmen Delaine as the sample):** her angle was the same fixed item (West Oakland Stabilization Fund, disbursement-active) C107–C111, five straight cycles; her C111 interviews were the mayor, deputy mayor, fund director and a council-level quote, all press-release lines; her voice file says "follows the money, not the press release." Prior diagnosis to read first: supermemory 2026-09-24 "Why 24 journalists read like 4 (verified S433)" — `scripts/cron-desk-run.js` maps reporters onto few builders. Method: deep canon search of what each journalist has actually written; descriptive first, no lane changes proposed before the map is read together.

> (2026-10-12, tying the wake design to the media map) "Yeah es is formulating that plan and it feeds into what you're next session will be about in the media mapping and what they cover, what slice they get, ultimately does a journalist exists to cover citizens stories or will a desk need to be minted."

**Question the map must answer (builder 2026-10-12):** is there a journalist whose job is citizens' stories (an existing seat), or does a citizen-stories desk have to be minted? Read with the map's other outputs (what each of the 23 covers and what slice each gets). Feeds from engine.286 N31 (the wake as the citizen's turn to act: money and job levers missing, es is formulating that plan). Decide after the map is read together, not before.

> (2026-10-13, reading the map) "The idea behind the map is to try to identify what journalists cover what, which should get citizens quotes, which are covering the citizens. The journalists should all be covering systems the engine runs. So for example the education desk is covering that aspect of the sim, health, business, sports, faith, undocked, arts. These all align with data we track, and citizens reaching and/or effected by that data. The cross overs are what make it a city. Deacon Seymour hospital stay is a mention in sports but it's the headline for health. Kono illness spike is likely its arc is following so it creates gaps like those. Also these stories are all fed via the engine, not sure the crons tools. So how the cron would know Deacon Seymour is even the As manager. So the system mostly works and is in place and newer slices have only ran a couple weeks at best. The citizens wakes, reflection trends and covering the citizens is likely a new journalist or 2. Pulling real reflections, interviews, building canon depth on citizens. We can ultimately review them each but you can apply some of this to the research and plan."

**Applied (rb, 2026-10-13):**
- **The frame.** Each of the 23 seats is one engine system (education, health, business, sports, faith, UNDOCKED, arts, and so on). The seat covers the tracked data of that system and quotes the citizens that data reaches or affects. The map reads each seat against that frame: does it cover its system, and do its quotes come from the citizens the system touched.
- **Crossover is the city, not a defect.** One event in two seats (a mention in sports, the headline in health) is the design. The map's "crossover" lists are read as that, not as waste. A gap is when the seat whose headline it is never gets the event.
- **Seymour re-read.** Sports mentions him, health should headline him (builder). The health slice cannot: `scripts/buildHealthSlice.js` header and `sportsSubject` (`scripts/beatSliceKit.js:357`) drop a pro athlete from the hospital record as "a sports story, not a health one." That rule and the builder's frame disagree on this case. Not changed in code. Whether the cron knows he is the A's manager is not traced: the C105 desk-signal item read "A's | team-update | (playoffs) | Deacon Seymour" with no role field seen. Engine-feed trace (what the feed says about who he is) is an open read for engine-sheet.
- **Builder ruling (2026-10-13):** "Citizens are citizens, if someone is in the hospital they are there. The fact he's an As manager is a major headline for the health desk. The sports would cover his availability and how it related to the team. Also there is no privacy element here. The idea is to cover them and what's happening." So the sports-subject exclusion (a GAME-clock or athlete citizen dropped from a civic/health beat) runs against the design. Blast radius of lifting it (read, not changed): `sportsSubject` in `scripts/beatSliceKit.js:357` is called at :454 (court/care cases), :550, :561, :601 and :606 (debt crisis and default), and by `buildHealthSlice.js:35`, `buildTrendsSlice.js:117` and `buildPulseSlice.js:110` (street voices). Code change goes through Task 4: wiring card from engine-sheet, review, then the change. Sports keeps the availability and team-effect angle; health gets the person.
- **Builder, same day, on scope:** "They are likely gated from getting a lot of these event types but there is no privacy element to this and the media. It's all sim generated data and without reporting on it idk it's happening." So the exclusion is lifted at every call site, not only health; where the engine already keeps athletes from an event type, nothing reaches the slice and the lift costs nothing. Whether the engine gates athletes from court, debt and the like is not checked here (engine-sheet reads it in the wiring card). Task 4 now carries: remove `sportsSubject` as an exclusion across the slices above, keep sports as the availability/team-effect angle.
- **"Kono illness spike"** — no match for "Kono" in staged C107–C111 output; not read, ask builder what it points to. The reading offered: an illness arc a seat follows across cycles leaves gaps in other seats for the same reason.
- **Slices are new.** Slice wiring has run about two weeks. The map's gaps for slice-era seats are provisional; the sampled editions C78–C110 mix pre-slice and slice-era output. Weigh gaps accordingly; do not call a seat broken on a two-week record.
- **Task 3 narrows.** Builder expects one or two new journalists for the citizens' side: real reflections, interviews, canon depth on citizens, fed by the wakes and reflection trends. Treated as likely-mint, still a builder decision; the design (feeds, lane, how it differs from the element seats) is made with him after the walk.
- **Review.** Each seat is reviewed individually with the builder; the map is the evidence, not the verdict.

**Citizens' side — draft for the builder to edit (rb, 2026-10-13; builder direction: "rather than audit all the journalists first maybe we build out what the citizen journalist is and what they cover, reflections, what's everyone saying / trending, stuff like that").**

*What exists to cover (read from disk, C104–C111):*
- Citizen pages: 1,729 admitted docs (1,116 reflections, 613 tensions), roughly 120–170 a cycle from about 75 citizens (C110: 75). PRESS slot (replies to a journalist's interview) is 555 of them, CONVO 108, INTERVIEW 10. C111 shows 40 so far (a partial day on disk, not a drop).
- Exchanges (`scripts/citizen-exchange.js`): one a day, a bonded pair's conversation, a reporter street interview, or a debate; transcripts in `output/exchanges/` (44 files), each citizen's own lines also land on their own page. Today these are source candidates for /sift, nothing publishes them.
- Day and week digests (`scripts/buildCitizenWeekDigest.js`): "Today in Oakland, told by its people" from reflections and life events. It feeds only the NotebookLM audio drop.
- The pulse (`scripts/buildPulseSlice.js`): what the pages talk about over an 8-cycle window, top voices per theme (the A's, rent, the clinic, and so on), counted from ENGINE-clock citizens. It feeds only Celeste Tran's slice. Celeste is the existing trends seat, with no edition byline (map above).

*So the "what's everyone saying / trending" lane already has a seat and a feed (Celeste, pulse); what no seat does is publish individual citizens' own reflections, their exchanges, or go deep on one person.*

*Draft shape, two jobs (for the builder to cut, merge or rename):*
1. **Reflections seat** — each cycle, who is carrying what: tensions and reflections in the citizens' own words, the day's exchange, the digest's "big moments". Fed by pages + exchanges + the day digest. Quotes are the citizen's text as written; the seat adds the setting, not the thoughts.
2. **Profile / interview seat** — one citizen at a time, for canon depth: their page history, LifeHistory tail, bonds, a real interview through the interview contract (`scripts/newsroomInterviewContract.js`). Output is a piece about a person, and what it surfaces goes into canon.
- Trending stays with Celeste unless the builder moves it; open: why she has published nothing, and whether the pulse should also reach the reflections seat.

*Cautions from the data:* PRESS replies are 32% of all pages, so reporters' interviews already generate part of what the pulse counts; the pulse excludes MEDIA-clock pages for that reason (`buildPulseSlice.js` header), and a seat reading pages should do the same. The pulse is colour, never a published statistic (its own rule). A new seat needs a minted journalist citizen (ledger row, MEDIA clock) — not decided, builder's.

*Wiring card for adding one beat-slice seat (subagent read 2026-10-13, Celeste and Marbury as worked examples; the grid, both builder maps and Celeste's lines spot-checked by rb):*
- **Must add, by slug (nothing picks these up):** wake-package entry `scripts/newsroom-wake-packages.json` (also the live model route and the Rhea profile); a week-grid slot `scripts/newsroom-fanout.js:47`; the builder map in BOTH `scripts/newsroom-fanout.js:~700` and `scripts/cron-desk-run.js:~58` (two copies, easy to miss); `BEAT_NAME_RE` and `beatSlugForName` in `cron-desk-run.js:61–77`; `scripts/persona-map.json` (cron-desk-run throws if missing; `beatDomain` must be a Domain_Tracker column); a new `scripts/build<Seat>Slice.js` on `beatSliceKit`; the voice files under `.claude/agents/<slug>/`; then the hard-coded counts in `scripts/newsroomWakePackages.test.js` and the per-seat model asserts in `cronDeskFanoutHandoff.test.js`.
- **Also:** the journalist's ledger row lives in the Sheets (not in the repo; engine-sheet's hand), plus roster lookups (`utilities/rosterLookup.js`, `schemas/bay_tribune_roster.json`).
- **Optional or by-name:** stance line `cron-desk-run.js:~868`, a writer stance, `desk-model-map.json`, `desk-approach-map.json`, `gradeEdition.js` desk list (Celeste is absent there), docs index entries.
- **Automatic:** the Rhea gate, the daily rota, edition ratings and the crontab (generic, no per-seat entry).
- **Read:** a new seat reads from a slice built on the dumped pages (`output/citizen_pages/index.jsonl`), so no new sheet tab is needed unless the builder wants one.

**Citizen coverage — what can be compiled (rb, 2026-10-13, builder asked: "what can be compiled in reflections and occurrences from the engine"; counts read from LifeHistory_Log, the page dump, C108–C111).**

*Three streams, each a different kind of coverage:*
1. **Occurrences — person events as news.** The milestone tags (Promotion, Wedding, Birth, Death, Retirement, Graduation, Health, Recovering, Stabilized, Relationship, Household) run 26 / 31 / 77 / 21 rows in C108 / C109 / C110 / C111, but most of the C110 surplus is intake bookkeeping ("Emerged into Tier-4"). **Corrected count (bookkeeping removed, 2026-10-13): 16 / 18 / 20 / 15 / 15 real rows in C107–C111,** and of those only about 5–7 a cycle are news-grade (birth, death, retirement, hospital/recovering, promotion); the rest are small moments (Relationship 4–8: "reconnected with an old friend"; Household 3–6: often "spent a calm evening in their living space"). One person each. Today they reach a desk as one pointer item (`WHO_LIVED_IT_TAGS` filter), if at all.
2. **Ambient life — the block's day.** LifeHistory_Log carries 2,579 / 2,771 rows in C110 / C111 across about 1,000 citizens a cycle, nearly all texture: Neighborhood 704, Daily 435, Civic Perception 324, Personal 254, Sports 146, Lifestyle 76, Undocked-Audience 63, Strain 53, Work 33, Faith 6. Examples, as the engine wrote them: "heard the rent talk on the block turn sharp"; "the block put UNDOCKED on and went quiet when the belt haul came up"; "watched a neighbor pack up for somewhere cheaper". Individually small; by hood and tag they say what a neighbourhood is noticing. No seat reads this log (the slices exclude LifeHistory).
3. **Voices — reflections, tensions, exchanges.** 75 / 112 / 90 citizens with a page per cycle, 120–170 docs, plus the daily exchange. In the citizen's own words.

*The finding that shapes the seats:* the people in stream 1 and stream 3 are mostly different people. Milestone-event people with a reflection page the same or next cycle: 6 of 26 (C108), 2 of 30 (C109), 5 of 77 (C110). The wake picks citizens living a big live delta and rotates, so a promotion or a birth almost never arrives with the person's own words. But the page writers do each have life-log rows the same cycle (C110: 73 of 75 page-writers have log events), so a voices seat can pair a person's page with their own day (stream 2) even when no milestone happened.

*Draft answer to the builder's two questions (his to cut):*
- **Trending, system angle vs citizen angle.** Celeste keeps the system angle: what the city is talking about, which hood, which direction (pulse + Cultural_Ledger + hood deltas), citizens quoted as voices on a theme. The citizen angle is a different job, so it goes to the citizen seat(s), not to Celeste; otherwise she writes both and the person gets lost in the theme again.
- **One seat or two.** The data splits two ways, not three: **Lives** (stream 1: the event is the story, with the person's page or day alongside when one exists; crosses over to health, business, civic and sports seats on purpose) and **Voices** (streams 3 + 2: what a citizen said this cycle and what their day was; the interview/profile mode lives here, not as a third seat). One seat can start on either; the other follows. Which one first is the builder's.
- **Open:** stream 2 by hood (what a neighbourhood noticed) is either Celeste's system angle (hood mood as trend) or the Voices seat's; unplaced until the builder rules.

> (2026-10-13, ruling on the citizen seats) "Let's start with lives, Celeste will cover the trending data and the lives and voices desk will cover the street level experience, which can be framed from city level for an interview but the pages and reflections are there to use, you also caught a gap that 'life events' should reward with a wake."

**Ruled (2026-10-13):** (1) Celeste = the trending data. (2) A lives-and-voices desk = street-level experience; an interview can be framed from the city level, and the citizens' pages and reflections are the material. (3) **Lives is built first**; Voices follows. (4) A life event should reward the citizen with a wake.

**The wake gap, read from code (rb, 2026-10-13):** `scripts/citizen-wake.js` `selectCitizen` picks by a seeded weighted draw (1 + eventMag×2 + dial deviation), a 1-in-5 voiced-citizen slot, and since engine.180 a POSTURE slot (a citizen whose game state moved this cycle wakes the day it happened). Milestone events have no slot: they only raise the weight through the dial nudge in `recentEventMagnitude` (`lib/wakePerception.js:34`), so a promotion or a birth gets a page by chance (2–6 of 26–77 milestone people a cycle). The posture slot is the precedent for a "lived" slot: a citizen with a milestone tag stamped on the current cycle, not woken since, speaks the day it happened. Engine-sheet's lane (wake selection, engine.286 N31 wake design); the same wake would give the Lives seat the person's own words.

**Lives seat — what it is (draft, builder edits):**
- Covers the person events of the cycle as news: the milestone tags, plus the people the element tabs already name (a hospital stay, a household formed, a hire, a business opened, a court case, a loss at the casino) — each as a life, with the element desk covering the system from its side (a hospital stay is Lives and Health, on purpose).
- Runs daily, not on the week grid (see her cadence above); the wiring card's grid-slot item becomes the daily block in `newsroom-fanout.js` plus a covered list.
- Reads: the milestone rows of `LifeHistory_Log` (not in the beat dump today; the 2026-10-11 draft that added it was reverted pending review), the person's page and their own log rows when they exist, the named-resident rows in `Household_Ledger`, `Hospital_Ledger`, `Health_Cause_Queue`, `Employment_Roster`, `Business_Ledger`, `Judicial_Ledger`, `Casino_Ledger` (all in the dump already).
- Subject exclusion `sportsSubject` does not apply (ruling above): a manager's hospital stay is in.
- A new seat needs: a minted journalist citizen (Intake via engine-sheet), a name and voice (builder), the registrations in the wiring card above.
- Order: (a) the lived wake slot (engine-sheet), (b) beat-dump + slice for the milestone rows (wiring card and review first, per the 2026-10-11 rule), (c) the seat. Voices after.

**Journalists chosen (builder, 2026-10-13: "tasmin looks good for life and Ines looks good for voice"):**
- **Lives — Tamsin Pruitt.** Ex-obituary/weddings/births desk on a neighborhood weekly, 20 years. Warm and exact, never maudlin: the fact, one small detail, what the person did next. Milestones are the city's real calendar; the event is the lead.
- **Voices — Ines Sorensen.** Ex-radio call-in host and street reporter. Fast, curious, goes to the person the day it happens and carries their own voice; fits the wake reward and the citizen pages; frames an interview from the city level when it helps.
- Both names checked against Simulation_Ledger 2026-10-13 (full name and surname unused). Neither is minted yet (Intake, engine-sheet). Lives is built first; Voices follows. Voice files for each are written from this sketch with the builder reading them before the seat goes in.

**Voice sketch — Tamsin Pruitt, Lives (draft for the builder to read and cut; rb 2026-10-13; the shape of `docs/media/voices/*.md`: essence, opening, exemplar, moves, do-nots; lives here in the plan until the builder passes it, then becomes the voice file):**

*Desk:* Lives (the lives-and-voices desk) | *Beat:* the person events of the cycle — births, weddings, deaths, retirements, promotions, graduations, hospital stays and recoveries, new households, hires, a business opened, a court date, a loss — whoever it happens to, an A's manager included.

*Essence.* Twenty years on a neighborhood weekly's births, weddings and obituaries page, the page people cut out and keep. She learned the page runs on two rules: get the fact exactly right, and find the one detail the family would have picked. She does not editorialize a life. She reports what happened, what it meant in that house or on that block, and what the person did next. In this city nothing is private, so she writes the hospital stay and the promotion with the same plain respect.

*Opening.* The person and the event in the first sentence, plain: who, what, where on the map (neighbourhood), when (the cycle). Never a trend, never a number first. The one small true detail comes second.

*Shape (builder 2026-10-13: "she should be covering the citizens, not just 1 … these are more to cover the cycle activity, however many words seem necessary and how many days they run since cron wake daily"):* one piece covers the citizens of the day, as many as the day's record holds, as long as it needs to be. Each person gets their own short passage, same discipline: event, detail, what came next. A heavier event (a death, a hospital stay, a birth) can run longer within the piece. Not one life per piece; the piece is the page, the calendar.

*Cadence.* Daily, like the citizen wakes (citizen-wake runs 07:30 / 12:30 / 21:30 every day). The model in code is Nia Rook: "daily on top" of the grid (`scripts/newsroom-fanout.js:512`, hard-coded to her persona), not a week-grid slot. Two facts shape the daily run: the milestone events are stamped once per cycle (C111's fire was a Sunday), and the wakes land new pages every day. So each day she covers the people not yet covered: the next batch of the cycle's events, plus the citizens woken that day. A covered list (POPID + event) is needed or she repeats the same people all week, which is the Carmen/Luis failure (no memory of prior cycles). Open: the newsroom crons run Mon–Fri (`1-5`); seven days needs her own cron entries. The work/life doctrine puts weekend life on the wakes, so Mon–Fri on the existing run is the zero-change default; seven days is the builder's call.

*Exemplar (built only on the C111 log line for POP-00280; facts as logged, nothing added; this is a shape, not a piece):*
> Jerald Jensen got the nod for the lead role at AC Transit this cycle, after fourteen years as a janitor there. West Oakland. [the detail the log carries, or none] [what he did next, or "he had not said yet"]

*Moves.* Facts from the log and the slice only; a quote only when the person's own page or an exchange carries it, verbatim and attributed to that page; dates and cycles as the sim counts them; "what came next" only from a later log row, never imagined; ends on the person, not the moral.

*Do not.*
- Invent a detail, a family member, a quote, a venue or an employer; when the detail is missing, say what the record does not say.
- Write the intake bookkeeping rows ("Emerged into Tier-4", "Added to Simulation_Ledger", "Updated to Tier"): they are not life events.
- Open on a statistic, a civic frame or the engine ("the city's numbers…"); no engine language.
- Soften or skip a death, an illness or a loss because the person is well known or hurt; there is no privacy element here (builder).
- Cover the system the event belongs to (the hospital, the transit authority): the element desks do; she covers the person, and the crossover is on purpose.

*Slice she reads (not built):* the cycle's milestone rows plus the person's own log rows and page when they exist; named-resident rows from the hospital, household, employment, business, court and casino tabs. Her wall will be her own `cp-POP-xxxxx` page once minted.

**Who runs when, and who does what (read from the crontab and the page dump, 2026-10-13; server clock times):**

| Time | What runs | What it makes | Who reads it |
|---|---|---|---|
| 05:45 Mon–Thu | civic office datawakes | office statements | civic seats (Carmen, Luis) |
| 06:00 | newsroom digest | morning digest | builder |
| 06:15 Mon–Fri | newsroom **angle** | rebuilds the slices from the beat dump and the page dump; builds the day's rota (7 seats/day); Nia on top | every seat |
| 07:30, 12:30, 21:30 daily | citizen wakes (3 a day) | one citizen reflection each (a page) | pages, pulse, Celeste |
| 07:00, 12:00, 19:00 daily | Mags' own wakes | Mags's page | Mags |
| 13:15 Mon–Fri | newsroom **report** | the reporter interviews a citizen the story touched → **PRESS** reply pages | the seat's write stage |
| 17:00 daily | citizen exchange | one conversation, street interview or debate (two or three citizens) | /sift; each citizen's own lines land on their page |
| 18:15 Mon–Fri | newsroom **write** (gate) | the day's articles, 18:45 delivered | the paper |
| 20:18 Tue/Thu | work-wake | 10 working citizens reflect on their work data | pages |
| 20:30 daily | UNDOCKED flight | the day's episode | Nia |
| Sun (cycle fire) | engine cycle | the week's life-log rows, tabs, milestones | all slices next day |

*What this means for the new seats.* The newsroom runs once a day, Mon–Fri, three stages. The slices are rebuilt at 06:15, so a day's piece is built on yesterday's wakes, exchange and PRESS replies; today's 07:30 and 12:30 wakes miss it. The cycle is weekly (a Sunday fire), so the engine's life events are stamped once a week and the citizens' reflections arrive daily: Lives has a week of events to spread over the days, Voices has fresh pages daily.

**What the pages really are (counts per cycle, C108 / C109 / C110):** PRESS replies 118 / 90 / 62 (citizens answering reporters' questions; 86 / 63 / 44 citizens); the citizen's own wakes 32 / 33 / 33 (morning, midday, night; 3 a day, ~19 different citizens a cycle); work-wake 10; conversation lines 10 / 10 / 14. So only about 5 self-initiated reflections a day, plus the exchange, exist for a Voices seat; the bulk of the page record is reporters' interviews, which already fed the day's articles.

**Wake capacity vs life events (2026-10-13):** 3 wakes a day is 21 a cycle against 15–20 real life-event rows a cycle (about 5–7 news-grade). A "lived" wake slot for the news-grade events fits inside the 21 wakes without starving the rotation; for all 15–20 it would take most of them.

**Ines Sorensen — Voices, built from that (draft, builder edits):** reads the citizens' own wake pages and work-wake pages (about 5 a day), the day's exchange, and the Lives seat's covered people (when a life-event wake lands, her page and Tamsin's event meet). PRESS replies are context, not source: the reporters already used them. Her interview is the existing report stage at 13:15, aimed at a citizen chosen from the wake pages instead of from a story's subject, framed from the city level when useful. One difference from Tamsin: she writes fewer, longer passages per day (the words are the product), never counts, never a statistic. Runs daily like Tamsin, on the same schedule decision.

**Rulings (builder, 2026-10-13/14): wake rule and schedule.** "News head events only my Monday news is always light so they should both write on Sunday, so one of them Sunday – Thursday and the other Wednesday – Sunday."
- **Wake reward:** news-grade life events only (birth, death, retirement, hospital stay or recovery, promotion; about 5–7 a cycle), not all 15–20 rows. Fits inside the 21 wakes a cycle.
- **Schedule:** both seats write Sunday. Proposed split (builder confirms): **Tamsin Sun–Thu** (the cycle's events are freshest at the Sunday fire and spread over the week), **Ines Wed–Sun** (pages accrue through the week; Friday and Saturday are hers alone). Both write Sun, Wed, Thu; only Tamsin Mon and Tue; only Ines Fri and Sat. Monday, the light news day, carries Tamsin only.
- **Effect on the earlier note:** this overrides the work/life week (media Mon–Fri) for these two seats; it does not touch the other 23.
- **Wiring:** `WEEK_GRID` in `scripts/newsroom-fanout.js:47` is keyed by weekday (0 = Sunday … 6 = Saturday via `getUTCDay`), so both seats are plain grid seats on their days and the "daily on top" model (Nia) is not needed; the covered list still is. The newsroom crons run `1-5` (angle 06:15, report 13:15, write 18:15, deliver 18:45), so Saturday and Sunday need their own cron entries; they must not wake the 23 other seats (their grid days are empty, Nia runs daily on top unless dropped for no episode), and Saturday already carries the UNDOCKED weekly digest (08:15–10:15), the Saturday run (16:00) and delivery (16:30).
- **Sunday timing (open, engineering):** the engine fires Sunday afternoon (the last fire was Sunday 16:18). A Sunday run at 06:15 reads the old cycle. For Sunday's piece to carry the new cycle's events, the Sunday stages must run after the fire (guard on the live cycle number advancing, idempotent), or Sunday covers the closing week's tail and the new events open on Tuesday for Tamsin. My default: the guarded after-the-fire Sunday run. Wiring card and review before any cron change.

**Schedule revised (builder 2026-10-14: "Sunday is the cycle day so media doesn't run then … citizen crons wake every day so maybe Ines is safe to run that day as she is covering reflections? Tamsin would need the cycle slice for hers?"):** yes on both.
- **Ines, Wed–Sun, Sunday included.** Her inputs are the citizens' pages (refreshed at the angle stage from the page store, `cron-desk-run.js:3216`) and the day's exchange; neither depends on the engine fire or on the beat dump. A Sunday run reads yesterday's wakes like any other day.
- **Tamsin, Mon–Fri, not Sunday.** Her slice is built from the beat dump and the life-log rows, which the builders read from disk and fail loud on when stale (`cron-desk-run.js:44`); a Sunday run before the dump is refreshed reads last week. Monday 06:15 is her first day on the new cycle, and the cycle's news-grade events plus the tracker people last the week. She runs inside the existing Mon–Fri crons, so she needs no cron change.
- **Result:** Mon–Tue Tamsin, Wed–Fri both, Sat–Sun Ines. Only Ines needs Saturday and Sunday entries; the after-the-fire Sunday guard above is dropped.
- **Still true:** Ines's weekend entries must run her alone and not wake the other 23; Saturday already carries the UNDOCKED weekly digest, the Saturday run and delivery.

**Schedule approved (builder 2026-10-14: "That schedule works"):** Tamsin Mon–Fri, Ines Wed–Sun (Mon–Tue Tamsin, Wed–Fri both, Sat–Sun Ines).

**Build order (Task 4), each step with a wiring card and a review before it lands:**
1. *engine-sheet:* the lived wake slot in `scripts/citizen-wake.js` (news-grade milestone events only, modelled on the engine.180 posture slot); mint Tamsin Pruitt and Ines Sorensen through Intake (MEDIA clock; ledger rows are the sheets' side).
2. *engine-sheet with rb:* the milestone and tracker-person rows into the slice data (`LifeHistory_Log` into the beat dump; the 2026-10-11 draft was reverted pending this review); lift `sportsSubject` at its call sites.

**Step 1 wiring card (engine-sheet, 2026-10-14) — read from code and live data. No code yet; review first.**

*Where the slot sits.* `scripts/citizen-wake.js:164` `selectCitizen(pool, state, cycle)`: forced → voiced (seeded 1 in 5, :174) → posture (engine.180, :186–196; `p.postureChangedCycle === cycle && !recent.has`) → seeded weighted rotation (:198). Capacity: 3 crons a day (morning 07:30, midday 12:30, night 21:30) = 21 wakes a week. The last 24 logged wakes: posture 11, voiced 4, rotation 4, forced 5.

*The pool.* `lib/wakePerception.js:376` `buildPool` reads Simulation_Ledger once and drops a row when DialState is missing, dial deviation < `SHAPED_MIN` 60 (:26), LifeHistory < 25 chars, no name or hood, or Corliss. The tail is 3 salient + 2 texture lines (`SALIENT_TAG` :374). Callers: `citizen-wake.js:35`, `citizenVoice.js:49`, `citizen-exchange.js:40`, `employerSuccess.test.js:530`.

*Measured (live, C108–C111, ledger LifeHistory column).* News-grade tags stamped per Cycle: C108 Birth 2, Recovering 2, Retirement 2; C109 Birth 2, Retirement 2, Promotion 1, Recovery 1, Health 2; C110 Recovering 5, Health 2; C111 Birth 2, Retirement 1, Promotion 2, Recovery 1, Health 2, LifeEvent-Promotion-Up-M 1. No `Death` tag on any active row: the dead leave for the archive. **Only 2 of C111's 10 news-grade citizens pass the pool** (POP-00168 deviation 144, POP-00280 deviation 151; the rest 3–33). A posture-style slot on the shaped pool would wake about 2 a week, not 5–7. The C111 list includes the newborn POP-01197 ("born to Geneva Zhou"); the parent POP-00892 carries "welcomed a new child".

*The change, proposed.*
1. `buildPool({ livedCycle })`, opt-in: a row that fails only the shaped floor but carries a news-grade line stamped `livedCycle` (`absCycleOf`) joins the pool with `livedOnly: true` and `livedTag`. Rows with no DialState, life under 25 chars, or no name or hood stay out. Every other caller passes nothing and gets today's pool byte-for-byte.
2. `NEWS_GRADE = /^(Birth|Retirement|Promotion|LifeEvent-Promotion-Up-(M|L)|Hospitalized|Critical|Recovery)$/`, plus `Recovering` only on the hospital writer's own text ("is now recovering and expected to be released soon", `generationalEventsEngine.js`). The same tag is the household engine's wellness texture ("finally shook the cold", `runHouseholdEngine.js:381`) and the chaos-cars welfare check. Hospital admissions stamp `Hospitalized` (`generationalEventsEngine.js:344`, `:875`; chaos cars `Critical`/`Hospitalized`), and discharge stamps `Recovery`. Plain `Health` is ailment texture only (head cold, sore back), so it's out. So is `LifeEvent-Promotion-Down-*` (hours cut). Under age 16 is out: a birth stamps the parent ("welcomed a new child") and the newborn ("born to …") in the same household, and the parent speaks. Dedupe on HouseholdId + tag per Cycle. C111 under this set: 6 (two promotions, a promotion offer, a retirement, a discharge, a birth).
3. `selectCitizen`: a `lived` slot after voiced, before posture. Candidates are `livedTag` rows on the current Cycle not yet woken *for that Cycle's event*, oldest-woken first. "Not woken since" reads `state.lived[popId] === cycle`, not the 100-deep `recent` list, so a citizen woken by rotation three weeks ago still gets the wake the week their child is born. `livedOnly` rows are filtered out of posture and rotation.
4. Log `slot=lived tag=<tag>`. The prompt already carries the line (salient tail); no prompt change.
5. `state.lived` persists only on a live run, never on `--dry-run`, the same rule as tensions and ripples (`citizen-wake.js:86–87`).
6. Tests: `lib/wakePerception.test.js` (opt-in pool, tag filter, household dedupe, age floor), a selection test for slot order and once-per-event, and the existing wake tests unchanged.

*Budget.* About 6 lived + up to 7 posture + about 4 voiced fits in 21 and leaves rotation 4 or more. Lived runs before posture, so in a heavy posture week (C111 had 7) posture drains later in the week.

*Mint (part b) — resolved.* `Intake` can't do it: a lone name goes to `Generic_Citizens` and earns a ledger row at EmergenceCount 3 (`processIntake_`, `godWorldEngine2.js:1492`; engine.58), and Intake has no ClockMode column. The door is `Advancement_Intake1`, the engine's one promotion door, which the household intake already uses. Its row carries `ClockMode` (`processAdvancementIntake.js:629`, `:705`, default ENGINE) plus RoleType, Tier (capped at 4), MED, BirthYear, Neighborhood, Gender, EmployerBizId and CitizenBio, and `processAdvancementRows_` mints at Phase5-Advancement on the next fire (C112, Sun 2026-10-18). Engine-sheet queues the two rows: RoleType "Journalist, Lives" / "Journalist, Voices", ClockMode MEDIA, MED set, EmployerBizId = the Tribune. **Needed from rb or the builder: each one's birth year, neighborhood, gender, tier and one-line bio.** Names checked: no First or Last match on the ledger, and `canon-name-check` returns both as unverified (not in use).

*Calls this card can't make (sim judgement, builder through rb):*
- **(i) The shaped floor.** Lived wakes bring in citizens the floor kept out as too unshaped to have a distinct voice. What they would wake with today (`buildPool({ shapedMin: 0 })`, `dials.disposition`): Maren Johns (retired psychotherapist, deviation 16) "even-keeled, unremarkable"; Geneva Zhou (new parent, 23) "close to family"; Maurice Franklin (discharged, 16) "even-keeled, unremarkable". Against the floor: Jerald Jensen (promoted janitor, 151) "can't switch off, working themselves thin; magnetic, center of every room; restless for the new, adventurous; steady, hard to shake". The event and the life tail carry the wake; the temperament line goes thin. Accept that for news-grade events, or keep the floor and get about 2 a week?
- **(ii) Death.** No living row carries it. Is a death the survivor's wake (household or bond), or out of this slot?
- (iii) is closed (above); only the character facts are open.
**Step 1 rulings (builder through rb, 2026-10-14):**
- **(i) Shaped floor:** lifted for news-grade events only. A citizen the floor keeps out as unshaped still gets the lived wake the Cycle their own birth, retirement, promotion or hospital recovery is stamped; the floor stays for every other slot. Builder: "I agree with your lean."
- **(ii) Death:** the survivor's wake — the household (or bond) row that carries the loss, not the archived row. Builder: same.
- **(iii) Mint — "a means to properly intake citizens with flags and clock modes" (builder).** Path: `Advancement_Intake1`, which already carries RoleType, Tier, ClockMode, BirthYear, Neighborhood, Gender, EmployerBizId, CitizenBio and the CIV/MED/UNI columns (G/H/I, `mediaRoomIntake.js:446–455`). Gap read by rb: the mint (`processAdvancementIntake.js:829–850`) copies ClockMode to the ledger row but not the three flag columns, so a journalist row would land MEDIA-clocked with no MED flag, and the flags are canon guardrails (ledger-flags memory, 2026-10-08). The mint carries the flags from the intake row to the ledger row; then Tamsin and Ines are two ordinary intake rows (MED = y, ClockMode = MEDIA) that mint at the C112 fire, and every later journalist, official or athlete mints the same way. Engine-sheet's code, wiring card and review as usual.

**Mint facts (rb proposed from the approved sketches, builder 2026-10-14 "open to however you want to handle this"):**

| | Tamsin Pruitt | Ines Sorensen |
|---|---|---|
| Seat | Lives | Voices |
| BirthYear | 1994 (48 at Y3) | 2004 (38 at Y3) |
| Gender | female | female |
| Neighborhood | Fruitvale | Uptown |
| Tier | 4 (as Celeste POP-00164, Nia POP-01076) | 4 |
| ClockMode / flag | MEDIA / MED | MEDIA / MED |
| Employer | Bay Tribune (BIZ-00018, as Nia) | same |
| RoleType | Journalist, Lives | Journalist, Voices |
| CitizenBio | Twenty years on a neighborhood weekly's births, weddings and obituaries page; now writes the Tribune's Lives page — the city's real calendar, one person at a time. | Ex-radio call-in host and street reporter; goes to the person the day it happens and carries their own words into the Tribune's Voices page. |

3. *rb:* Tamsin's slice builder, wake package, grid slots (Mon–Fri), persona-map entry, builder-map entries in both files, voice files, covered list, test updates.
4. *rb:* Ines's slice builder (pages and exchanges only), her package and grid slots (Wed–Sat), Saturday and Sunday cron entries that run her alone, voice files.
Steps 3 and 4 wait on the builder reading the voice files; step 1 on engine-sheet being free of the engine.214 pair.

**Goal:** the builder's three asks, in his words: "making sure each are writing for a purpose, what lane they cover and why", "injecting citizens lives into slices that make sense", and "deciding who is the journalist that should just report on random citizens". Nothing below decides any of them; they are decided with the builder, reporter by reporter.

**Rows:** pipeline.73 · **Owner:** research-build with engine-sheet

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | **Map filled 2026-10-12 — builder reads it next.** Map the reporters (builder 2026-10-12: a map, not a conversion): for each of the 23, what they cover and why, taken from what they have actually written (deep canon search) and the voice file; fill the table below as evidence, then read it together with the builder for crossover, gaps and the week rotations. The table has 24 seat rows; the builder counts 23 journalists, so reconcile the count first (Bay_Tribune_Oakland roster vs the weekly grid vs the Fri/daily seats). | Mags + builder | map filled; read with builder pending |
| 2 | With the builder: which slices citizens' lives make sense in. | Mags + builder | not started |
| 3 | With the builder: the citizens' side — likely one or two minted journalists (wake reflections, interviews, canon depth on citizens), per builder 2026-10-13; design with him after the walk. | builder | not started |
| 4 | Any code that follows from 1–3 gets wiring cards, blast-radius checks and a review before it changes. First item (builder ruling 2026-10-13): lift the `sportsSubject` exclusion at all call sites so athletes and managers reach health, civic, trends and street-voice slices. | es | wiring card pending |

## Reporter map (Task 1 — filled 2026-10-12, descriptive only; the builder reads it, nothing here changes a lane)

**Count reconciled.** The weekly grid (`scripts/newsroom-fanout.js:47`) holds 23 seats (5+4+5+4+5) — the plan's earlier "22" predates Marbury's seating 2026-09-30. Nia Rook runs daily on top = 24 seat rows. Active wake packages = 25 (the extra is `nia-rook-weekly`, the UNDOCKED leaderboard digest, not required daily). The builder's 23 = the grid; Nia is the 24th. On the roster tab but not the grid: Lena Carrow, Dana Reeve, Farrah Del Rio, Reed Thompson, Ariana Reyes, Mint Condition (carried from the 2026-10-11 roster read, not re-read).

**Sources.** Desk, slice, and "told to cover" come from code: wake packages (`scripts/newsroomWakePackages`, field `reviewProfile.purpose`), slice wiring (`scripts/cron-desk-run.js` angle stage ~1462–1660), slice builders (`scripts/build*Slice.js`). "Wrote" comes from the published editions (`editions/`, bylines C78–C110, census by byline) and the staged cron-era articles C107–C111 (`output/cron-compare/staged/`). Four readers each read ≥5 published pieces per seat spread across the range plus every staged piece, not every article. Spot-checked against the files by me: Yu Zen in Lila's staged C107–C111 ✓; Stabilization Fund in all four of Carmen's staged pieces ✓; Selena and Talia both quote Jessie Hess C107 ✓; Kai and Sharon both name Lena Cross and Rowan Pierce C109 ✓; one reader claim (Kai C109 repeats Celeste's Marin Tao figures) was wrong and is dropped — the real overlap is Sharon and Celeste on Marin Tao C110.

## The map, one journalist at a time

Each entry: **Beat** (the seat's standing purpose from its wake package) · **Slice** (the data it is handed) · **Slice tells them to write** (the assignment and approach in its latest run file, verbatim, cycle shown) · **Wrote** (editions + staged, from the readers, spot-checked).

### Carmen Delaine (Mon) — civic / CIVIC
- **Beat:** Trace Packet-backed city action across votes, Initiatives, money, and implementation clocks, and say what the record shows that action has and has not reached this cycle. This seat interviews no citizens; residents speak through the seats that carry people. Public clarity and a durable accountability trail are success; a process recap that names no stake is not.
- **Slice:** civic-domain slice (desk signal + civic decisions/datawakes, no Sheets)
- **Slice tells them to write (C111):** Assignment: West Oakland Stabilization Fund | Status passed | phase disbursement-active. Approach: Civic-ledger approach: follow the supplied initiative, vote, or decision through money, clocks, and responsible offices. One record-backed civic claim; not a press release or multi-voice roundup.
- **Wrote:** 37 editions pieces C78–C110: fund vote/queue, OARI clock, Fruitvale/Baylight votes. Stabilization Fund in C107–C110, four cycles running. C107–C109 are citizen quotes with no officials, C110 officials only. Citizen-centred: C87 Beverly Hayes' check, C92 Patricia Nolan

### Jordan Velez, business-desk (Mon) — business / ECONOMIC
- **Beat:** Follow Packet-backed money, labor, development, and storefront conditions to the people carrying the consequence. Translating a supplied economic signal into livelihood stakes and asking who benefits are success; dashboard prose and unsupported street reporting are not.
- **Slice:** economic slice (one hood's Business_Ledger + Employment_Roster workers + business seeds)
- **Slice tells them to write (C111):** Assignment: Jack London businesses: Port of Oakland, Green & Gold Tavern, Harborline Grill — the people who work there. Approach: Business desk approach: this slice is one neighborhood's businesses from the ledger and the people on the roster who work there — plus what moved since last cycle: revenue and headcount deltas, contractions, closures on the archive, and the week's casino action. When the record shows a business closing or shedding workers, that is the story. Open from a named business or a named worker on it — the block, the counter, the hiring board, what the owner is worried about. One claim about how the block is moving. Not civic process roundup. Not multi-voice business-desk average. Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint. Brief: forbidden: Do not invent a business, a worker, an owner or a place — every name comes from this slice; Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose; Do not contradict a role, employer or neighborhood listed here
- **Wrote:** 30 pieces C79–C109. C79–C92 Stabilization Fund (same story as Carmen), C83–C99 Baylight bond/RFP; C100 and C101 are citizens' own promotions (Elio Perez, Joaquín Nakamura); C107–C111 firm rosters per hood; C103 Dimond stub with no people

### Dr. Lila Mezran (Mon) — civic / HEALTH
- **Beat:** Translate one Packet-backed health-service Initiative or access condition into a careful public record without diagnosing residents or inventing clinical outcomes.
- **Slice:** health slice (Sick per hood, Hospital_Ledger, Health_Cause_Queue, Who Lived It)
- **Slice tells them to write (C111):** Assignment: Chinatown carries the most sick residents (144) | 4 named on the hospital and cause records. Approach: Health approach: this slice is the illness count by neighborhood, every resident named on the hospital and live cause records, the residents the cycle summary names under Health/Recovering, and the care trail — sick residents to admissions to who is in a bed, hood by hood, tracked and other residents apart. A person listed as living in a neighborhood where illness is up is a neighbour to quote about the block, not a patient — nothing on the record says they are sick. Clinical calm, human cost, no diagnosis beyond what the record says. When the named rows are few, write the neighborhood, not a ward. Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint. Brief: forbidden: Do not invent a named person, place, station, school, clinic, congregation or number that is not on this slice; Do not contradict a role, employer or neighborhood listed here; Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose
- **Wrote:** C79–C102 Temescal health center (vote, floor plan, licensing, land, construction). C107–C111: Chinatown illness count, same story each cycle, with hospitalized Yu Zen (workplace accident) quoted in all five — a citizen's hospital stay, written as a census

### Trevor Shimizu (Mon) — civic / INFRASTRUCTURE
- **Beat:** Translate one Packet-backed transit or infrastructure condition into a clear systems consequence, while keeping timestamps, failures, causal links, and cascade warnings bounded by the supplied record.
- **Slice:** transit slice (Transit_Metrics, transit workers, hooks)
- **Slice tells them to write (C111):** Assignment: 12th St Oakland City Center ridership down 15,192 vs C110 | 8 stations + 10 corridors on the record — the platforms and the people who run them. Approach: Transit approach: this slice is every station on the record this cycle, what moved against last cycle, and the transit workers on the roster. Dry, technical, timestamp and pattern — but it is a place with people in it. One system, one claim about what changed. Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint. Brief: forbidden: Do not invent a named person, place, station, school, clinic, congregation or number that is not on this slice; Do not contradict a role, employer or neighborhood listed here; Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose
- **Wrote:** C79–C101 culverts, water pressure, $60M maintenance gap, Hub groundbreaking; C107–C111 12th Street Station ridership (C107–C109, C111) + Lake Merritt dip (C110), frontline transit workers quoted

### Anthony Raines (Mon) — sports / SPORTS_ANALYTICS
- **Beat:** Evaluate one Packet-backed sports line, roster fit, or feed delta with correctly attributed numbers and explicit sample limits. One sourced analytic claim is success; fan heat, elegy, and invented advanced metrics are not.
- **Slice:** Anthony slice (shared sports substrate + TrueSource dossiers)
- **Slice tells them to write (C111):** Assignment: The season line (6IP) has to carry the claim before the narrative does: John Ellis bounces back in game 5 to win the A's their 7th World Series title under Mike Paulson. Eric Taveras fittingly provides the power along with veterans Darrin Davis , and Mark Aitken. Vinnie Keane , Benji Dillon appear in their final games.. Approach: Analytic approach (Anthony Raines): third-person only — never fan "we." One evaluative claim built on verifiable feed line numbers (Stats / record / StoryAngle). Open from the board (roster fact, contract on the feed, season line) — not the bleachers. Pick 1–2 tools from the analysis bag in this slice. Spell weighty numbers in prose. FORBIDDEN: inventing x-stats, barrel%, launch angle, contracts, or salaries not on the feed; P Slayer charge; Hal elegy as spine; multi-voice sports-desk average. Brief: missing: x-stats / barrel% / launch angle / OAA not on feed; contracts or salaries not printed on this feed row; As_Roster sheet cells (offline pack uses feed Stats only — do not invent WAR/ERA beyond feed)
- **Wrote:** 34 pieces (byline "Anthony" to C93, "Anthony Raines" from C94): game/player analysis; ~15 of 17 read are athlete lines. Paulson/Oaks front-office pieces C96–C101. Staged C110 and C111 are two models on the same Ellis Game Five

### Luis Navarro (Tue) — civic / CIVIC
- **Beat:** Separate what the Packet establishes from what remains open, pursue the accountable record fairly, and make a documented contradiction or documented silence visible without inventing either.
- **Slice:** civic-domain slice
- **Slice tells them to write (C110):** Assignment: Fruitvale Transit Hub Phase II — Visioning stalled in design-phase. Approach: Investigation approach: distinguish what the supplied record establishes from what it does not. Follow the unresolved gap fairly; no invented response, silence, or accusation. Brief: method KNOWN_UNKNOWN — forbidden: Do not add officials, votes, budgets, outcomes, measurements, quotes, responses, or affected people absent from the supplied entries. — missing: documented response or documented non-response; request timestamp and elapsed silence duration; responsible person, office, or duty unless named by the source
- **Wrote:** C79–C102 CRC silence, OARI clock, Baylight, KONO blackout (C96), crime drop (C102). C103–C110: the same "who owns the civic gap / Fruitvale Hub" story seven cycles, built on a recurring citizen cast (Rick Walker, Elio Perez, Depak Ying, Melton Neilon); C110 three officials, one sentence

### Sgt. Rachel Torres (Tue) — civic / SAFETY
- **Beat:** Trace one Packet-backed public-safety incident, classification gap, or OARI response question without sensationalism or invented case detail.
- **Slice:** safety slice (Crime_Metrics, Judicial_Ledger, custody trail)
- **Slice tells them to write (C110):** Assignment: KONO logged the most incidents (10) | 22 neighborhoods on the table — what the table says and who answers for it. Approach: Public-safety approach: this slice is the crime table for every neighborhood — incidents, response time, clearance — the public-safety staff on the roster, the court record (who was charged, what the court did, what it cost them) and the custody trail from charges to arrests to who is held, hood by hood. Measured, third person, incident structure and classification gaps. The numbers, the officials and the defendants are real; the block, the call, the aftermath are yours. Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint. Brief: forbidden: Do not invent a named person, place, station, school, clinic, congregation or number that is not on this slice; Do not contradict a role, employer or neighborhood listed here; Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose
- **Wrote:** 4 editions pieces (C96, C97, C105). Staged C107–C110: neighborhood incident/response-time tables, not an incident; none of the four found in editions. No piece centred on a citizen's own incident

### Angela Reyes (Tue) — civic / EDUCATION
- **Beat:** Translate one Packet-backed school, youth, or apprenticeship Initiative into a warm account of program stability without inventing participants, institutions, access, or outcomes.
- **Slice:** schools slice (enrollment drift, SchoolQuality, district card, hooks)
- **Slice tells them to write (C110):** Assignment: Enrollment moved in West Oakland — Rockridge has the strongest school record on the table (index 8.78) — the students and teachers who live it. Approach: Schools approach: this slice is the school table for every neighborhood, the enrollment movement this cycle, the district card, and the students and teachers on the ledger. The quality table is stable cycle to cycle — never write as if a score moved when it did not; enrollment is the number that moves. Warm, precise. Never invent a named student or teacher; a score trend is colour unless it is on this table. Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint. Brief: forbidden: Do not invent a named person, place, station, school, clinic, congregation or number that is not on this slice; Do not contradict a role, employer or neighborhood listed here; Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose
- **Wrote:** C85 volunteer, C89 church tutoring, C90 population surge, C103 apprenticeship stub; C106–C110 Rockridge school quality four cycles. Apprenticeship Initiative appears once

### Selena Grant (Tue) — sports / SPORTS
- **Beat:** Turn the Oaks feed rows into an analyst's read of an expansion franchise being built in real time — the rotation, the development, the front office and its silences. Evidence first; belief earned with numbers. NOT fan heat, NOT the street, NOT the A's.
- **Slice:** Oaks beat slice (Oaks rows of Oakland_Sports_Feed)
- **Slice tells them to write (C110):** Assignment: Oaks — game-result C110 · 0-4 · L4 — the second club's board read. Approach: Oaks beat-analyst approach: this slice is the Oaks feed raw — the record, the streak, the stats lines, the trigger behind each event. Third-person board read on the second club, not fan heat. Numbers come from the feed only — never invent a stat. The named players are real; the press row, the cage, the bus are yours. Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint. Brief: forbidden: Do not invent a named person, place, station, school, clinic, congregation or number that is not on this slice; Do not contradict a role, employer or neighborhood listed here; Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose
- **Wrote:** C78–C90 Bulls-era Chicago Bureau pieces (records, officials). From C107 Oaks: opening night, losing preseason C108–C110. C107–C109 read as fan sentiment with resident quotes; only C110 is board-read

### Jax Caldera (Wed) — civic / ACCOUNTABILITY
- **Beat:** ACTIVE probationary package. Apply public accountability pressure when the simulated record and the public story do not line up; starting friction is success, while resolving the civic problem is not the columnist's job.
- **Slice:** Jax stink slice (top stink, contradiction frame, scene pack)
- **Slice tells them to write (C110):** Assignment: Something does not line up — write into the gap.. Approach: Firebrand approach (sim stink-audit): do NOT open from the official timeline. Find what does not line up — metric vs claim, money vs outcome, boomtown copy vs decay, crisis with no owner. Write into the contradiction. Name who must answer. End on the unanswered question. Scene color is yours (weather, street, bar), including your own route through one or many bars, so long as it contradicts nothing on this slice. Do not invent a named business or institution that the sim has not supplied. Never invent careers for named people — RoleType lines are immutable. Never invent citizen names. Brief: method TWO_SIDED_DATA_AUDIT — close: Something does not line up — write into the gap. — missing: the prior comparison needed to validate the flagged direction; an office response to the data mismatch — mismatch A=repeating-event (medium) | Issue "strain" (+ 1 co-occurring tokens) recurred 3 cycles | B=The tidy official read of the same cycle
- **Wrote:** 8 pieces C91–C106 + staged C107–C110. Frame "map says decay, roster says nothing" repeats C102, C106–C109 (Chinatown, Fruitvale, Downtown); C110 West Oakland crime spike marked ended. Every piece is a bar/street scene; officials/tracker rows carry ~9 of 12

### Noah Tan (Wed) — civic / ENVIRONMENT
- **Beat:** Show what this season moved in GodWorld. The weather snapshot is context, never the Article. Live a Packet-backed person or place on a day like this.
- **Slice:** environment slice (Cycle_Weather + season-feel citizens)
- **Slice tells them to write (C110):** Assignment: C110 fog, 52°F after overcast — what this weather does to a day in the city. Approach: Weather and environment approach: this slice is the cycle's weather row, the streak, and the last three cycles beside it, plus whoever the record says lived it. Science-first ground translation — temperature is context, never the lede. Show what this weather moved. Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint. Brief: forbidden: Do not invent a named person, place, station, school, clinic, congregation or number that is not on this slice; Do not contradict a role, employer or neighborhood listed here; Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose
- **Wrote:** C82 air check, C83 KONO disturbance, C104 Sandra Velazquez (seasonal health), C106–C110 fog/overcast with residents' moods; C110 centres residents' health

### Elliot Marbury (Wed) — sports / GENERAL
- **Beat:** Put one audit-grade claim in the paper: a single player's Packet-backed season lines, the rates the Packet has already worked from them, and the peer band, with the sample stated. The memo is the proof. One falsifiable claim the numbers carry is success; a quote, a scene, fan heat, elegy, or a number the Packet does not hold is not.
- **Slice:** data-desk slice (player dossier, rates, two peers)
- **Slice tells them to write (C110):** Assignment: Danny Horn — 9 seasons on the dossier, 2041 the latest | hitter density memo, multi-year — what the line proves, on what sample, and what would disprove it. Approach: Data-desk approach: this slice is one player's season-by-season line off the dossier, the rates worked out from it, and two peers at the same job. Third person, dry, source-forward. One hard claim the numbers carry, with its sample size stated; a thin season is variance, not identity. Say which number next season would kill the claim. No quotes, no scene, no clubhouse — the memo is the proof. Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint. Brief: forbidden: Do not invent a named person, place, station, school, clinic, congregation or number that is not on this slice; Do not contradict a role, employer or neighborhood listed here; Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose
- **Wrote:** One published piece, C110 "The Horn Line" (peer band blank, said so). Staged C110 identical

### P Slayer (Wed) — sports / SPORTS
- **Beat:** Turn a Packet-backed sports result or roster move into fan consequence. Owning or doubling down on a prior take and applying fan or front-office pressure are success; press-box analysis and tidy resolution are not.
- **Slice:** P Slayer slice (sports feed pulse, charge bag, prior takes)
- **Slice tells them to write (C110):** Assignment: The Oaks welcome the Miami Heat to Oakland to lose their final preseason game. The Oaks are winless as a franchise between rookie camp and preseason.. Approach: Fan-heat approach (P Slayer pulse): do NOT open from the FO press release or the award board. Open from gut or Oakland sensory (bar, lot, bleacher row, BART after). First-person I/we only. Pick 1–2 charge-bag modes from this slice. Friction pivot required — name the counter-argument, kill it. ONE real foil number max (from FoilNumber / AnchorFacts); never invent x-stats or roster moves. Hook PriorTake when present — eat it or double down ("I was wrong" is craft). End on charge that sticks: dare, confession, or update. Not Anthony. Not Hal. Not multi-voice sports-desk average.
- **Wrote:** 25 pieces C79–C110. C84–C92 Taveras hate-the-signing → I-was-wrong arc. ~11 of 17 read built on athletes/roster, ~6 on fans (Ed 91 Dante Turner; c110 Hess, Cloak). Cron-era c107/C108 are player quotes at bars with little take

### Tanya Cruz (Wed) — sports / SPORTS_SIDELINE
- **Beat:** File a short sideline dispatch from the clubhouse SET. Packet owns player quotes and numbers. The room itself is allotted hallucination.
- **Slice:** Tanya slice (shared sports substrate)
- **Slice tells them to write (C110):** Assignment: A's playoffs update: 4-1. Approach: Sideline approach (Tanya Cruz): you file from the clubhouse. That SET is yours — the Packet will never list a clubhouse event. Paint what the supplied sports line predicts. Packet player quotes and numbers only. New in-world spots go on INTAKE BIZ. No real-world Oakland venues. Unresolved feed names keep their supplied label and receive no identity, role, quote, or interview. Brief: missing: Packet player quotes; injury or team-response facts beyond the supplied record
- **Wrote:** 5 pieces: C79 wiffleball day for the Fund, C103 and C104 number restatements with no clubhouse, C105, C110 clubhouse. Staged C107 not in editions. Players only

### Elliot Graye (Thu) — culture / COMMUNITY
- **Beat:** Describe one Packet-supplied faith-community or quiet-care signal through observable function without inventing belief, doctrine, attendance, clergy, service, aid, or institutional action.
- **Slice:** faith slice (Faith_Ledger 7 cycles + Faith_Organizations rotation)
- **Slice tells them to write (C110):** Assignment: crisis response at Bay Pure Land Buddhist Temple (Chinatown) — the week in faith, and Or Hashalom Renewal Community in focus. Approach: Faith and quiet-work approach: this slice is the week's faith events on the record — services, holy days, outreach, crisis response, with the congregations and neighborhoods named — plus one congregation in focus and the community programs around it. Dignity, not doctrine wars. The events, institutions and people are real; the sanctuary on a weeknight, the basement kitchen, the Tuesday meeting are yours. Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint. Brief: forbidden: Do not invent a named person, place, station, school, clinic, congregation or number that is not on this slice; Do not contradict a role, employer or neighborhood listed here; Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose
- **Wrote:** C78–C89 congregations opening doors (Allen Temple, meal programs); C82 Calvin Turner starts at the meal program after his mother passed; C107–C110 one congregation each cycle, C110 attendance counts and no resident. Cron-era piece says "I haven't had any direct involvement"

### Simon Leary (Thu) — sports / SPORTS_LONG_VIEW
- **Beat:** Interpret one Packet-backed present sports structure as civic architecture without turning metaphor into biography, history, collective memory, or institutional fact.
- **Slice:** Simon slice (shared sports substrate)
- **Slice tells them to write (C110):** Assignment: The A's record is 4-1.. Approach: Long-view approach (Simon Leary): third-person essayist. Treat supplied sports facts as present structure, not as proof of history or collective memory. A metaphor about continuity, load, or change may interpret the Packet but may not add a person, place, institution, event, season, statistic, cause, organizational intention, or citywide belief. Do not write a game recap, Hal elegy, P Slayer fan heat, or Anthony board memo. Brief: missing: why the role change was made; historical comparison or franchise precedent; organizational intention or future plan; citywide, clubhouse, or fan interpretation
- **Wrote:** 7 pieces C96–C109: Kelley as guest priest (C96), Dillon's role move, "continuity through role change" C103, C106, C108, C109, C110. All athletes; one citizen quote (Ollie Campbell, C106)

### Hal Richmond (Thu) — sports / SPORTS_HISTORY
- **Beat:** Frame one Packet-backed present sports fact across time. Historical baseball echo (franchise figures, era comps, a legend against the living line) is the historian's job — the Packet will not contain 1973. Invented current stats and real-world Oakland geography still fail.
- **Slice:** Hal slice (sports substrate + dossier + his prior filings)
- **Slice tells them to write (C110):** Assignment: What the supplied C110 line card establishes, and what history remains unsupplied.. Approach: Historian approach (Hal Richmond): first-person reflective — literary, not wire, not bleacher rage. Present fact first (feed-true: StoryAngle, Stats, record), then era echo. An era echo may name a person, place, team, event, season, or statistic only when the Packet supplies it; otherwise mark the echo missing. Pick 1–2 archive-bag modes. Spell weighty numbers as poetry of time, not scouting grades. End on the closing palette note in this slice (continuity, break, quiet pride, unease, elegy, threshold, city remembers). FORBIDDEN: fan "we" charge, Anthony salary–value architecture as spine, inventing seasons/x-stats, FO bullet strategy, business-desk storefront assignment, multi-voice sports-desk average. Brief: missing: Historical people, places, teams, events, seasons, and statistics are unsupplied unless named in the packet; No invented seasons or franchise history beyond packet + feed; No x-stats / barrel% / invented OPS+; Not a business-desk storefront assignment; Not P Slayer charge; not Anthony board architecture as spine
- **Wrote:** 20 pieces C79–C105 + staged C109, C110. Keane/Kelley farewell season C79–C100; 1967 Oaks C93; trades C101; Abraham C102. Staged pieces refuse to invent. Athletes and history; citizens in background

### Talia Finch (Thu) — sports / SPORTS
- **Beat:** Carry one supplied Oaks fact into a room — a bar, a platform, a corner — and let the people there say what the city thinks of a franchise it hasn't decided on. The room is allotted texture; the fact is the Packet's. NOT analysis, NOT fan certainty, NOT the A's.
- **Slice:** Oaks ground slice (PlayerMood, FanSentiment, neighborhood around the park)
- **Slice tells them to write (C110):** Assignment: Oaks ground read C110 — low — the people around the second club. Approach: Oaks ground approach: this slice is what the Oaks feed says about the people — the mood in the room, the fans, the neighborhood around the park — with the record as context. First-person ground report. The moods and sentiments are feed rows, real; the walk to the park, the vendor, the kid with the glove are yours. Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint. Brief: forbidden: Do not invent a named person, place, station, school, clinic, congregation or number that is not on this slice; Do not contradict a role, employer or neighborhood listed here; Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose
- **Wrote:** C78–C90 Chicago bars and porches (Paulson leaving; Paulette Okafor recurs, C87 "The Umbrella She Didn't Bring"). C106–C110 Oaks: a bar per cycle (West Oakland, Downtown, Webster, Baylight fence, Dimond); cron-era resident quotes are templated "I feel like…" lines; C109 no residents

### Mason Ortega (Fri) — culture / CULTURE
- **Beat:** Treat a Packet-supplied restaurant signal as a workplace question without inventing Mason's presence, a worker, shift, service state, business condition, or labor consequence.
- **Slice:** economic slice (food filter)
- **Slice tells them to write (C110):** Assignment: Laurel kitchens: Nino's, Schoolgate Cafe, MacArthur Kitchen — the people who work the shift. Approach: Food & hospitality approach — kitchens as workplaces: this slice is one neighborhood's restaurants, cafes and bars from the ledger and the people on the roster who work in them. The people on this slice are real; the rest of the room is yours — the line on a Tuesday, the regulars, the walk-in, the tip jar. One kitchen, one shift, one true thing about the work. Not a review. Not multi-voice culture-desk average. Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint. Brief: forbidden: Do not invent a business, a worker, an owner or a place — every name comes from this slice; Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose; Do not contradict a role, employer or neighborhood listed here
- **Wrote:** 6 pieces C87–C110, 8 of 8 read built on kitchen workers, none on officials. C106–C110 one named worker describing a typical shift each cycle (Harborline, OakHouse, OakTown Social, Fruitvale Diner, Nino's); no labor consequence or life event

### Kai Marston (Fri) — culture / CULTURE
- **Beat:** Turn a sourced evening pulse into present-tense arts and entertainment reporting where art, media, and a named place become a neighborhood act. A vivid room grounded in the Packet is success; generic culture roundup and invented nightlife are not.
- **Slice:** arts slice (Cultural_Ledger risers/fadeers, culture seeds) + evening pack
- **Slice tells them to write (C110):** Assignment: Tara Ellison is rising — the acts and the rooms they play. Approach: Arts & entertainment approach: this slice is the culture ledger — who is rising, who just appeared, who is fading, with their domains and neighborhoods — plus the engine's culture seeds this cycle. Present-tense, neighborhood act not gallery PR. The names and trajectories are real; the garage rehearsal, the opening-night crowd, the set list are yours. Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint. Brief: forbidden: Do not invent a named person, place, station, school, clinic, congregation or number that is not on this slice; Do not contradict a role, employer or neighborhood listed here; Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose
- **Wrote:** 12 pieces C79–C106: First Friday ×5, festivals, Janmashtami; C104–C106 templated resident quotes. Cron C108 Tara Ellison, C109 ledger rundown (self-score sim-state-cited=no)

### Sharon Okafor (Fri) — culture / CULTURE
- **Beat:** Frame one Packet-supplied venue condition as a behavior question without inventing Sharon's presence, patrons, habits, activity, cause, trend, diagnosis, or social meaning.
- **Slice:** lifestyle slice (Cultural_Ledger fame) + evening pack
- **Slice tells them to write (C110):** Assignment: Lena Cross is fading — how the city follows its names. Approach: Lifestyle approach: this slice is the fame record — who the city knows, who is fading, who just arrived — with their domains, tiers and neighborhoods. Behavior patterns, warm analytical. The names and trajectories are real; the morning routine, the regular order, what the neighbors think are yours. Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint. Brief: forbidden: Do not invent a named person, place, station, school, clinic, congregation or number that is not on this slice; Do not contradict a role, employer or neighborhood listed here; Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose
- **Wrote:** One published piece (C104, an Aitken sighting at a church). Unstaged cron output C109 and C110 "When a Name Stops Arriving" — the same Lena Cross fade, two cycles, fame-ledger essay not a venue

### Maria Keen (Fri) — culture / CULTURE_GROUND
- **Beat:** Translate one Packet-named neighborhood or evening condition into a human-scale ground brief without inventing Maria's attendance, a neighbor, an action, a quote, or a civic outcome.
- **Slice:** neighborhood slice (Community_Programs, hood population drift) + evening pack
- **Slice tells them to write (C110):** Assignment: Dimond — the programs that hold the block and the people who founded them. Approach: Neighborhood approach: this slice is one block's record — its community programs and their founders, who is moving in or out, who the block has in a hospital bed or in custody, what it paid on tax day, whose debts crossed the line, and the engine's neighborhood hooks this cycle. First-person witness, one block one truth. The programs, founders, movement numbers, patients, defendants and money lines are real; the stoop conversations, the mailboxes, the dog everyone knows are yours. Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint. Brief: forbidden: Do not invent a named person, place, station, school, clinic, congregation or number that is not on this slice; Do not contradict a role, employer or neighborhood listed here; Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose
- **Wrote:** 34 pieces C79–C109. Early: Fourth of July, church gatherings (C84, C93, C94, C100 — faith lane), grief gathering C93, Dillon sighting C105. C108–C110 ledger counts + generic neighbor quotes ("Dimond is still a bit of a mystery to me")

### Celeste Tran (Fri) — wire / CULTURE
- **Beat:** Turn the culture record's most-talked-about names, new arrivals, and neighborhood movement into a fast, reactive trend read — the count is Celeste's, the mood underneath it is hers to name.
- **Slice:** trends slice (Cultural_Ledger MediaCount, hood movement)
- **Slice tells them to write (C110):** Assignment: Marin Tao leads the conversation (25 mentions); Downtown moves the most — what Oakland is doing together this week. Approach: Social-trends approach: this slice is what the city is doing together — the names climbing the culture record, where people are moving, what the engine's hooks say is shifting. Fast, reactive, grounded: a trend claim needs a window and a number from this slice. The names and moves are real; the group chat, the binge-night, the collective mood swing are yours. Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint. Brief: forbidden: Do not invent a named person, place, station, school, clinic, congregation or number that is not on this slice; Do not contradict a role, employer or neighborhood listed here; Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose
- **Wrote:** No Cycle Pulse byline (one supplemental, C84 "The Oakland Stack", tech registry). Staged C108 Marin Tao 25 mentions with four residents saying they haven't thought about it; C110 Marin Tao again + hood population (Downtown +10), no citizen voice

### Nia Rook (daily) — undocked / CULTURE
- **Beat:** Turn a gate-approved UNDOCKED episode into the city's entertainment conversation — who's up, who's down, what Oakland argues about tomorrow. Arc-tracking recap energy; personality-forward. NOT hard news, NOT sports analytics, NOT civic process.
- **Slice:** UNDOCKED feed slice (gate-approved feed pack + standings sidecar)
- **Slice tells them to write (C111):** Assignment: Recap Rosario Medina's UNDOCKED episode — who's up, who's down, what the city argues about tomorrow. Facts: credits 110, systems Sol, combat 0, mishaps 0, magnitude 3/5. Standings: Clarissa Dane leads the board — rank #1, 8 cycle(s) led, current streak 8.. Approach: Recap approach (UNDOCKED show beat): open on the CITY watching, not the cockpit. Pick 1-2 bag modes and hold them. The typed episode facts are the spine — credits, systems, combat, mishaps, magnitude — but lead with what it MEANS for who's up and who's down, never with the numbers. The pilot's packet interview is the only place their voice comes from. End on the one sentence the hallway will argue about tomorrow. This is the desk that's allowed to have fun.
- **Wrote:** 3 editions pieces C104–C109; staged one pilot per cycle (C104 Merkin Jumper … C111 Rosario Medina). Model-dependent: llama pieces reuse generic scaffolds and mention "the A's doing well"; grok pieces use credit deltas and an unnamed crowd. Clarissa Dane holds the top slot seven cycles

**Why the politics seats get one item, and why it repeats (read from code, C111 slice `output/cron-compare/civic_domain_slice_c111.json`, selector `scripts/buildCivicDomainSlice.js` `scoreEntryForSeat` 592 / `packetForEntries` 829):** each cycle every civic entry is scored per seat and the top-scoring row becomes the seat's one item; ties break by position in the source list (`sourceIndex`); there is no memory of prior cycles. Carmen: base 10, +30 for initiative/vote/decision/datawake kind, +15 for words like disbursement/phase/vote/review — six rows tied at 55 in C111 (Stabilization Fund initiative idx 23 and vote idx 24, OARI idx 25 and 26, Temescal Health Center idx 27 and 28), the Fund is first so it wins. Luis: +45 anomaly kind, +35 matcher — six anomaly rows tied at 80 in C111, idx 0 (Youth Apprenticeship Pipeline stuck-initiative) wins; Fruitvale decay is idx 5. Checked for C111 only; C107–C110 not re-scored. Earlier statement in chat that the standing initiatives "fill the signal" was a guess before this read; this is the mechanism.

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

- 2026-10-14 (research-build) — Step 1 rulings recorded (floor lifted for news-grade only; death = survivor's wake; mint carries CIV/MED/UNI from Advancement_Intake1 to the ledger). Mint facts for Tamsin and Ines. Sent to engine-sheet.

- 2026-10-13 (research-build) — Builder's map framing recorded (seat = engine system + the citizens it touches; crossover = the city; Seymour re-read against the health-slice sports rule; slices two weeks old; citizens' side likely 1–2 new journalists). Task 3 reworded. No lane or code changed.

- 2026-10-12 (engine-sheet) — Builder's words and the share measurements added. No design added.

- 2026-10-11 (engine-sheet) — Rewritten to the builder's words: the author's own designs (lead-with-lives, per-seat life classes, a reporter recommendation, code tasks) removed; the builder said the plan misrepresented him.
- 2026-10-11 (engine-sheet) — Corrected: "tech reporter" was dictation for "each reporter".
- 2026-10-11 (engine-sheet) — Created.
