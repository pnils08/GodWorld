---
title: Reporters Wake As Themselves Plan
created: 2026-11-21
updated: 2026-11-21
type: plan
tags: [pipeline, newsroom, wakes, active]
sources:
  - scripts/cron-desk-run.js (beat slice leads the typed packet; evening pack as texture; STANCE lines; persona bag)
  - scripts/cron-desk-writer.js:1347-1420 (who block, system prompt, skill, packet contract, tool blocks)
  - scripts/reporterIdentity.js (sheet line + voice-file Essence)
  - scripts/newsroom-wake-packages.json "sharon-okafor" (reviewProfile, models)
  - scripts/testReporterDay.sh (pipeline.111 whole-day runner; free-rows / bare prompt)
  - output/slices/c112..c116/{evening,sharon-okafor}.md; output/cron-compare/staged/culture_c11[2-6]_sharon-okafor_*.staged.md
  - archive/non-articles/profiles/Name_ Sharon Okafor.txt
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.111"
  - "[[2026-11-10-role-citizens-wake-as-themselves]] — pipeline.110, §Reporter rulings (2026-11-17) still bind"
  - "[[../research/2026-11-17-reporter-records-roster]] — the approved records roster; Sharon's lead changes here"
---

# Reporters Wake As Themselves Plan

**Builder's words (2026-11-21):** "yeah i think we can work this group and curate the newer models we have been working on, we need to strip out build talk, notes on their files, CLI archectecture, we want to pull anything puppeting their output, they get told who they are , their canonized bio, their row details, then they get the beat of what they cover, ther tool list, and what we hand them via the engine output, we allow them to chase the angle they see fit, if their packer hands them a major event id rather trust it would chase that without being instructed too, may have some base canon on them in here , if not we will search the tribune files to see what we have on them"

Group named the same night: "Sharon Okafor , Maria keen , Kai marston, Mason Ortega , Celeste Tran".

On Sharon (2026-11-21): bio — "i like them both and love \"visits places she writes about\" thats connects great with the world-view build"; beat — "yes fame isnt her beat but she may she famous people crossover into her beat, but her tools will give her that context".

**Goal:** each of the five wakes with exactly: who they are (canon bio + ledger row), their beat, their tool list, and this Cycle's engine output on their records — no build talk, no code-written angle, stance, bag or opening; the reporter picks the story.

**Rows:** pipeline.111 · **Owner:** research-build. This job owns `.claude/agents/{sharon-okafor,maria-keen,kai-marston,mason-ortega,celeste-tran}/*` and `docs/media/voices/{sharon_okafor,maria_keen,kai_marston,mason_ortega,celeste_tran}.md`.

**Binding from 2026-11-17 (pipeline.110 plan §Reporter rulings):** reporters must not get worse; one reporter switches at a time, after the new piece is read beside the current one and the builder approves; the report and write steps stay; no model run without his word.

## State of the work (2026-11-25)

The "stop puppeting" build: every agent wakes as itself — who it is, its job, its record, its tools — and nothing tells it what to write (builder 2026-11-24: "job lines are fine, telling them what to say is puppeting"). Three groups, in this order:

| Group | Where it stands | Plan |
|---|---|---|
| City workers | 14 live on the worker template (pipeline.110); answers-only: Superintendent live, City Clerk + Culture director minted at C118; Gridiron Analytics (5 analysts) live, feed questions to Discord | [[2026-11-10-role-citizens-wake-as-themselves]] · this plan Tasks 25-31 |
| Reporters (media) — **in progress** | 23 of 28 seats on seat files: Talia (live Thu 11-26), Sharon, Maria, Kai, Mason, Celeste, Jordan, Graye, Noah, Trevor, Lila, Rachel, Angela, Carmen, Luis, Farrah, Jax, Tamsin, Ines, Nia (+weekly), **Anthony** (live Mon+Thu from 11-26), **P Slayer** (live Wed 11-25). Left: Selena (the Oaks, next), Hal (his own build), Marbury, Tanya, Simon. Then Mags's Saturday run as EIC: what reaches her | this plan |
| Council | After media. pipeline.110 Task 11 (a council seat on the council template) on hold; civic.24 (the Sunday nine-seat table) | [[2026-11-10-role-citizens-wake-as-themselves]] · [[2026-08-16-city-hall-nine-seat-table]] |

The mold for a sports seat (Anthony, P Slayer — repeat it): read everything the seat gets now (files, record builder, code lines, tools, models, last pieces) → the builder's calls (bio/origin, beat, models) → one SEAT.md (who he is, job, his own methods as craft, the record's rules, tools); the six old files archived at the seat's live read → the record from `scripts/sportsRecord.js` (`makeSportsRecord`: clubs, colleagues' pieces this Cycle, the feed's people as sources; read live each morning) → package: seatFile, seatMemory, seatDossier, writerTools, models; BEAT_BUILDERS + name; old branches guarded → test day under the no-write guard → agy after each step, findings checked against the code. Voice Essence stays on every seat (builder 2026-11-25: "test showed that bios improved the writing quality").

## Why (read 2026-11-21, C112–C116)

- Sharon's own slice (Cultural_Ledger fame) leads her typed packet by design (`cron-desk-run.js` "The slice leads the typed packet … the pack stays as texture"). Five cycles, five fame-fading pieces; in four the evening pack's top pulse was a quiet-nightlife venue marked for her.
- Kai, Celeste and Sharon all lead off Cultural_Ledger; nobody leads the evening record.
- Her writer prompt carries build talk (NotebookLM, paused edition pipeline, desk workspace, "Read IDENTITY/LENS/RULES", engine.102 W5) and coaching (code-written Angle/Hook/Approach, "room is yours", forbidden list, STANCE line, ten bag modes, reviewProfile opening/closing).
- Her reviewer's texture conditions bar first-person visits; the builder's bio keeps "visits the places she writes about".

## Sharon's wake (the shape the other four follow)

| Part | Source |
|---|---|
| Who she is | ledger row line (`reporterIdentity` sheet line: age, hood, family, temperament) + canon bio: archived profile ("Lifestyle & Social Dynamics Reporter. Psychology degree; writes about daily life, routines, behavior trends, local rituals; focuses on why people do what they do. Tone: warm, analytical, accessible.") + voice-file Essence, both kept |
| Her beat | nightlife and the city's evenings: the bars, the block parties, who was spotted where, what the city watched |
| Her tools | canon_recall, canon_search, citizen_lookup, sheet_read incl. Cultural_Ledger (fame crossover comes through here) |
| Her records | this Cycle's evening record (world summary Evening Texture + desk_signal culture lane), every row as the engine wrote it, event ids intact |
| Nothing else | no angle, hook, approach, stance, bag, opening, "room is yours", forbidden list in the writer prompt; the gate keeps its blockers |

## The mold (every seat, in this order — the next session follows it)

1. Read the seat: agent folder, voice file Essence, archived profile (`archive/non-articles/profiles/`), package (`scripts/newsroom-wake-packages.json`), last three staged headlines, the live slice (`build<Seat>Slice(cycle)`).
2. Bring the builder three calls: bio (profile + Essence), beat line + record (what the engine has, counted), morning model = the writer's model (cost). Name engine gaps found; do not fix them here.
3. Build (thinking: package `seatReasoning` low|medium|high when the beat needs it — Carmen medium): `.claude/agents/<seat>/SEAT.md` (bio, job, five tools incl. ask_worker naming the workers who answer for the beat); the slice builder — whole-city record in name order, no code-picked hood/angle/hook/hooks/approach/roomIsYours, people with their own line as the reason, the row's age where the craft names ages, `K.isMediaStaff` + self off, `sitsOutWhenEmpty`, version bump; package — `seatFile`, angle model = write model, reviewProfile = the three fact blockers (location, citizen, data point), textureConditions [], still graded.
4. Checks: rewrite the seat's old pick/hook checks in the beat-slice suite, the package and handoff suites; add the seat to the roomIsYours exemption list (test unlock from the builder).
5. Test day on the newest cycle with `scripts/testReporterDay.sh` under the no-write guard (spend unlock from the builder); restore the slice cache files after; copy the piece to `output/research-build/2026-11-21-p111/`. Check invented ages/tenures and engine-stamp leaks.
6. Commit path-specifically (shared files may carry engine-sheet hunks); plan task row + changelog; ROLLOUT row <=160 chars.

Done: see §State of the work.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Print Sharon's new wake for C116 beside what she got (no model call); builder reads | rb | done `e57933b47`, `1c52b41cb` |
| 2 | Build her wake to the print: identity + bio, beat line, tool list, evening record leading; build talk and coaching off her writer prompt; reviewer allows her first-person visits | rb | done `982ca9ec6` — seat file on her package; record = evening texture + prevEvening lines |
| 3 | One test-shell day on C116 (`testReporterDay.sh`), his go; new piece beside her C116 piece | rb | done — run 3 approved ("Run 3 lock it in"); live path proven through the runner's today variant `982ca9ec6` |
| 4 | His approval → her live Friday wake switches; read the first live piece | rb | live 2026-11-21; read Fri 2026-11-27 after 18:15 (C117): her pick, tool calls, Rhea, grade |
| 5 | Maria: seat file, every-hood record, package, evening pack off | rb | live `1e0ac867b`, packet trim `7b5c99f55`, voice retry `aafcaff3f`; test day 'Before the Shuttles' meets his '2'; read Fri 11-27 |
| 6 | Kai: seat file, arts record, package, evening pack off | rb | live `11b50a52d`; test day C117 'Who Gets Through the Door'; read Fri 11-27 |
| 7 | Mason: seat file, own food record (buildFoodSlice), package | rb | live `f72796514`; test day C117 'Muscle Memory at the Rail'; read Fri 11-27 |
| 8 | Celeste: seat file, trends record (watching: shows, UNDOCKED, game night, shared moments) | rb | live `37ed5d76e`; read Fri 11-27 |
| 9 | Jordan (business desk): seat file, own economy record incl. the casino, Sonnet 5.5 | rb | live `7482c334d`; read Mon 11-23 (his day) |
| 10 | Tribune staff (MED) off the new-mold source lists | rb | done `37ed5d76e` |
| 11 | Morning tool loop (dig before picking) | rb | live `36f0eec26` |
| 12 | ask_worker: reporters ask the 14 city workers; answers become the worker's quote | rb | live `c3e678b80` |
| 13 | Elliot Graye: seat file, every-congregation faith record | rb | live `7109f6cf7`; read Thu 11-26 |
| 14 | Noah Tan: seat file, weather and environment record | rb | live `d08529a29`; read Wed 11-25 |
| 15 | Trevor Shimizu: seat file, transit record without the sports feed | rb | live; read Mon 11-30 |
| 16 | Lila Mezran: seat file, health record (every hood's hospital line, discharges said) | rb | live `72165640a`; read Mon 11-30 |
| 17 | Rachel Torres: seat file, every-hood safety record | rb | live; read Tue 11-24 |
| 18 | Angela Reyes: seat file, every-hood schools record, staff and students | rb | live; read Tue 11-24 |
| 19 | Carmen Delaine: seat file, whole civic record (buildCivicSlice), thinking medium (package seatReasoning) | rb | live; read Mon 11-30 |
| 20 | Luis Navarro: seat file + sheet bio, initiative clocks + decisions record (buildInvestigationsSlice), Haiku 5.5 thinking medium | rb | live; read Tue 11-24 (one-run sample: is he still apart from Carmen) |
| 21 | Farrah Del Rio: new opinion seat (Thursdays), the week's record (buildOpinionSlice), Sonnet thinking medium | rb | live; first wake Thu 11-26 |
| 22 | Interviews: the citizen gets their own life and the reporter's own question, never the plan (ownLifeInterviewPacket, all seat-file seats) | rb | live; 11-25: the seat asks whom it picks (`91385f174`, agy `edd2083d8`); the citizen wakes as their own cron (`c4260bb48`, agy `009d5620e`); read every seat's next quotes |
| 23 | Jax Caldera: seat file, people-first record + Varek's journal (buildJaxRecordSlice), sheet bio trimmed, Grok plans / Sonnet interviews and writes, memory_recall | rb | live Wed 11-26; watch a couple of weeks (builder) |
| 24 | Tamsin, Ines, Nia (daily + weekly): seat files, coaching off; Nia's seat carries what the show is and how the board ranks | rb | live; Tamsin and Nia untested (see changelog) — read their next pieces |
| 25 | City Clerk worker (Odessa Arceneaux) for the civic trio: intake row queued, worker records + job written | rb | after the C118 mint (Sun 11-29): office map entry with her POPID and answersOnly true, Civic_Office_Ledger row, the trio's seat files name her, one test ask |
| 26 | Superintendent of Schools worker (Achterberg) for Angela; Director of Cultural Affairs worker (Kiran Tavakoli, intake row queued for C118) for Kai, Sharon, Celeste | rb | superintendent live and asked once (answered from the record, one unsourced detail being traced); culture: map entry (answersOnly) + the three seat files after the mint |
| 27 | Gridiron Analytics, the sports data house: the team cards pulled from the sports folder and read to fields (gridironCards.js); five analysts on the worker template, one record each, the other four a read away; a code router picks the analyst, no model; a question no record covers gets no call (gridiron.js, gridironAsk.js) | rb | built, not live; the A's feed added as a sixth record every analyst can read (builder: "if the feed is cheaper to pull in this way is should be added") |
| 28 | Test set: one answerable question per record, one across two records (a pitcher's trade value), two the record cannot answer (an Oaks lineup, who starts Friday); every figure in each answer checked by script against the record it was handed | rb | done — 9 asks (output/research-build/2026-11-24-gridiron/test1.json). The script found no figure absent from the records handed (a substring check across all records: it cannot catch a right number on the wrong player); the two real errors were found by hand against the cards. Fixes below; two re-asked clean |
| 29 | Wire: Gridiron is one door on ask_worker (GRIDIRON → the router → the analyst) — every seat on its seat file can ask it now; the sports seats as each moves to its seat file. Before: route() over real question strings (3 of ~14 phrasings missed in the test); Oaks player names route (the router knows only A's names); a miss lets the reporter name the area | rb | on ask_worker, live; asked once through it (Jade Soy on Ty Jerome, answered from the record); Oaks names route by the roster tab; an unplaced question names the five areas |
| 30 | The card fields on the sheet (builder 2026-11-24: "Approved use it so its useful"): on their own tab per team, As_Player_Data (Oaks_Player_Data when the Oaks folder holds cards) — the roster tabs stay as they are, because the dashboard's sports page and the feed writer refuse a roster tab with columns they do not list; pull every Sunday at /run-cycle Step 1 ("every Sunday before the cycle") | rb | done — 28 rows written and read back, Pulled For Cycle 118 |
| 31 | Feed questions to Gridiron (builder 2026-11-24: "The feed questions should only route to the 'names Used' column … to put the data team behind me"): a `question` row naming Gridiron Analytics (or one analyst) is answered by the router's analyst as the general manager's data house and sent to his Discord (the gate's webhook); private, once a row, three tries (gridironFeedQuestions.js) | rb | live — every 30 minutes (crontab, log logs/gridiron-feed.log); first two rows answered and sent (Dawson Nguyen: the 2042 lineup; Wesley Clark: the Mesa trade). Analysts think before answering (medium): with no thinking the lineup left third base empty |
| 32 | Anthony Raines on his seat: SEAT.md, live A's record (buildAnthonyRecord), team cards + memory + Gridiron, Sonnet + thinking, Mon+Thu; 4 agy reviews folded | rb | live Mon 11-30 (Thu 11-26 first); test piece output/research-build/2026-11-24-anthony/ |
| 33 | P Slayer on his seat: SEAT.md, live A's + Oaks record with colleagues' pieces and the feed's people (buildPSlayerRecord on sportsRecord.js), Haiku plans / Grok writes; agy folded | rb | live Wed 11-25; test piece output/research-build/2026-11-25-pslayer/ |
| 34 | The Oaks seats: Selena Grant (data), Talia Finch (street, apart from P Slayer) | rb | Talia live Thu 11-26 (`84839ec34`, agy folded `861a22447`, Essence `71345f6f6`); test day held for the builder's word; Selena next (Tue 12-01) |
| 35 | Hal Richmond (history, pre-2025 real sports history open), then Marbury, Tanya, Simon; archive each seat's old files at its first live read | rb | not started |
| 36 | What the editor hands the seats: the city feed (builder 2026-11-26, "city feed is a good idea … approved") — plan [[2026-11-26-city-feed]]. Mags's Saturday run: what reaches the EIC from the new seats, after it | rb | plan written 2026-11-26; its Task 1 started |

## Gridiron Analytics — the sports data house (Tasks 27-30)

**Builder's words (2026-11-24):** "this could be cool if we build it right in that this is who gridiron analytics is , we will officially make them the buisness that is the handling out Oakland sports data, we can see the roster we have so far on the sim ledger and truely wake them in that role as a worker agent … a branch type workflow that enacts the specific data agent the orchestartor needs to return it to the sports media and to questions posed in Oakland_Sports_Feed, lineup recommendations, pitching rotation, trade bait, etc. the idea would be to return quick accurate results and a fraction of the cost as each data agent has a specific responsibility". Then: "we have oakland sports feed and the As and Oaks roter tabs can be coverted to cover lineups, rotations, etc as it not a highly read ledger yet". Then: "1. yes cards are the source, 2041 is the most recent completed season , 2042 is the next season, godworld in is 2042 currently … 2 - we align with what the data job is best we can and set them as that, 3 - Oaks will be built the same and the team in an exapnsion team so we are building that data house next 4 - lets set the how this will flow and start to test it".

Flow:

1. **Source.** The sports folder on Drive (one folder per team; players active and inactive, coaches, seasons). `scripts/gridironCards.js` pulls every card with the service account and reads it to fields → `output/gridiron/cards.json`. Lines about how a card was made (screens, the folder, its approval footer) are dropped there. Season lines are by year (2041 the last completed); age, overall, contract and roster status are as of 2042.
2. **Records.** Built in code from the cards and the sheets, one per analyst: the A's hitters (hand, splits by pitcher hand, plate skills, seasons); the A's pitchers (role, stamina, pitches, seasons, the staff who work the arms); the A's roster and money (contracts by year, options, service, staff pay, the budget); the Oaks (Oaks_Roster + the Oaks rows on the sports feed); what the Tribune has printed (the archive index; the words a canon_recall away).
3. **Front door.** A question comes in; `route()` reads which record it is about — print, money and Oaks words first, then a named A's player (pitcher → pitching, hitter → hitting), then pitching or hitting words. No record → "Gridiron Analytics does not hold a record on that", no model call.
4. **Analyst.** The worker template (`workerWake.buildWake`): the citizen's ledger line and memory, the job line + the record duty, their own record in front of them, the other four records a read away (record_read), the worker tools. One call on the workers' model. Gridiron's offices are registered at ask time, never on the city's office map: no weekday rota, not in ask_worker's list.
5. **Back.** The answer returns word for word with who gave it; the seat may quote it (Task 29).

The five, set by job (builder: "align with what the data job is best"): Dawson Nguyen (Sports Analytics Lead) — hitting; Wesley Clark (Sports Analytics Lead) — pitching; Daniel Yoon (Co-Founder) — roster and money; Jade Soy (Data Analyst) — the Oaks; Christine Nakamura (Co-Founder) — the printed record. Ariana Reyes holds a Tribune seat and is not one of them (proposal, said to the builder). Their ledger rows are not edited; the job line carries the area.

Feed questions: the feed's `question` word stays the builder's private word to a citizen (engine.338). Whether Gridiron answers feed questions, and under which word, is open (below).

## The sports seats (Tasks 32+) — Anthony Raines first

**Builder's words (2026-11-24):** "lets start with Anthony Raines, now these are going to be similar to the other media builds but want to make sure we dont lose too much of them in the process … i truely think we can make them really incorporate the sims history into its views as the cycles progress and their memories start to settle into who they are and what they want to remember … their canon is deeper than all others in the project so we just want to remove the puppeting and tighter the instructions, if they have tools and stat methods they use we dont want to lose them to fit a mold, we want to set the mold so they are easily repeated". Then: "1. His is the former AA A'S prospect … Where they live should come from the sheets, where he is from can be in his bio but must make the sheets Orgin city 2 - He is just a sports journalist who's angle is data drive takes, as you will see P Slayer is the opposite, the emotional fan take. So Anthony , P Slayer and … Elliot Marbury … all cover the same A's but from different lens , they don't have to cover the same stories they can choose … they see the headlines and they cover the stories, oaks will have a similar set up , Hal Richmond is the historical context angle , the long form who they are , how they compare , our Oakland pivots in 2025 to the timeline , so real world history exists but it's pre 2025 … 3. Like other media , morning wake matches the writing , thinking mode can be considered and PSlayer would have to be haiku so to they don't sound the same".

Anthony's wake today (read 2026-11-24, C117): who he is across six files that disagree (sheet bio: former AA A's prospect; IDENTITY: Pioneer League statistician 2008, against BirthYear 2001; portfolio + his own canon interview in Drive "The Game That Built the Analyst": Berkeley Owls scholarship player; voice file: scout analyst; CITIZEN_NARRATIVE_MEMORY: "Mike Paulson's brother" against IDENTITY "no relation"); a code-picked story (buildAnthonySlice top pulse score), a code-written claim, code-picked bag tools, an approach paragraph, an A/B frame, a scored candidate list; the stance three times (cron-desk-run, writer hard stance, kickoff) and the whole 10-method bag every wake; tools dossier_read (the Sept TrueSource mirror), canon_search, canon_recall, sheet_read, citizen_lookup, 6 calls; morning deepseek flash, write Sonnet 5.5; no memory read.

Keep: the ten methods as his own craft (he picks), rate arithmetic, sourcing (every number named to its source), third-person press-box voice, the canon blockers, all his tools, Sonnet. Take away: the code-picked story, claim, methods, approach, frame, scored list, tripled stance, stale notes. Add: the whole A's record (every feed row, unranked), Gridiron to ask, his own memory, dossier_read on the new cards. No citizen quotes (records seat, builder 2026-10-02).

**Bio rule (builder 2026-11-25):** "bios need not repeat in the sheet what the row already tells them, its the deeper history of them and hardcoding their current life is not a good mechnism" — CitizenBio holds deep history only; age, origin, hood, job, family stay on the row.

**Talia Finch's wake today (read 2026-11-25, C114–C117; archive C43–C116 read by a sub-agent, two claims checked):**
- Who she is, five sources that disagree: sheet bio "Former Chicago Bulls Reporter , Now the Ground Reporter for The Oakland Oaks" (word for word Selena's) + OrginCity Chicago; IDENTITY (traits table, "covers the Oaks the way Maria Keen covers Oakland", no past); voice Essence (same line); `utilities/rosterLookup.js` "Chicago Ground Reporter … Covers Chicago the way Maria Keen covers Oakland" (desk "chicago", also in `gradeEdition.js`); persona-map note. RULES and the package canonBlockers forbid "Chicago, the Bulls, or any prior bureau" — against her row and against 20 published Chicago pieces.
- Canon (archive): Chicago bureau C43–C90 — Benchmark Bar (West Loop) at the branch debut; Bridgeport C80–C90: Romano's on 35th (checked, C83), Calhoun's Tap on 31st, Darius Reeves's tamale truck at 35th and Halsted; a recurring cast (Paulette Okafor, Raymond Polk) carried C83–C90 on the summer the city waited on Paulson ("the silence is the statement", the phone face-up / face-down); "The Kid from Kraków" (C76), Adash Stanley before he was an Oaks player. She returns to the same room, keeps a source's name when asked (C83), takes her own photos (C90). No piece C91–C105; the text never says how she came to Oakland. Oaks C106–C116.
- Code-picked: the slice (`buildOaksGroundSlice.js`, Sunday's beats copy, not the live feed) takes the newest Oaks row, makes its FanSentiment / PlayerMood word the hook ("excited", C116), the angle ("Oaks ground read C116 — excited — the people around the second club") and the hood (the feed's HomeNeighborhood); its people are the feed's names — GM, coach, Paulson, players. Approach + roomIsYours lines; desk-approach-map line; package purpose, opening ("a specific real-Oakland place and one sensory channel"), closing ("atmosphere, not analysis"), authorizedTexture, textureConditions. Writer prompt: "street grain: a named regular, a named counter", build talk (edition pipeline paused, desk workspace, NotebookLM), "Read IDENTITY/LENS/RULES", PREWRITE form, "write by turn 6".
- Interviews (C116): the code's people list sent her generic question to the coach and the GM ("What's your take on the team's performance so far?"); The street path (`newsroomSourcing.js` street) run for her on C117 returns 13 people, every one a past PRESS interviewee (C102–C115 pages), none from this week's lives (G-EC78) — the same cast in every Oaks piece. Stanley's repeated line is his interview answer repeating (in the C113/C114 packet quotes). The Chicago ban came in with the 2026-09-06 seating commit `f8d2abdf8` as the session's own guard; the builder's word that day: "both are Oaks reporters, dedicated seats". Canon (search_canon) holds no account of her move from Chicago.
- Tools: canon_recall only (not on WRITER_TOOLS_SEATS). Models: Maverick plans and interviews, Luna writes.
- Pieces: C114 staged 4/4; C115 2/3 (players quoted, not the room); C116 1/3 (no room; GM, coach, Paulson quoted; drifts to Aitken through the baker). Stanley's "the whole city is waking up with the team" reused C107, C108, C113, C114 (checked); one register for players, GM, coach and fans; no named Oakland place in eleven pieces. Chicago C80–C90 is her best work: named rooms, a cast that changes over weeks, distinct speech.
- Engine gaps (gap log): G-EC76 citizens argue about "the Oaks bullpen depth"; G-EC78 her street sources.

**Selena Grant's wake today (read 2026-11-25, C113–C117; archive C43–C117 read by a sub-agent, three claims checked):**
- Who she is, sources that disagree: sheet bio "Former Chicago Bulls Reporter , Now the Beat Reporter for The Oakland Oaks", row West Oakland, born 2006 (36), married (Ronald Williams), one child, OrginCity Chicago, Tier 2; IDENTITY "Thirty-one … D-III point guard at Oberlin … five years on an NBA beat … Chinatown"; voice Essence ("hungrier … still proving herself … Calls Anthony on Tuesdays"); `utilities/rosterLookup.js` "Chicago native who grew up watching Bulls games at her grandmother's apartment" (desk "chicago"). Oberlin, D-III, five years, the grandmother and the Tuesday call are in no published piece. RULES and the package blockers forbid "Chicago, the Bulls, or any prior bureau".
- Canon (archive): the Chicago bureau's Bulls beat from the branch debut (C43, "three players on condition of anonymity"); Paulson's three picks (C45); the deadline (C79, "The whiteboard in the front office on West Madison…", checked); the summer of his silence (C83–C89); "I watched this team play fifty-four games before I was willing to call it real" (C90). Thesis-first ("Let me be precise", C82–C87, checked), numbers carry the argument, unnamed front-office sources, short player/Paulson quotes. Stanley the one player carried from Chicago. No piece C91–C106; the text never says how she came to Oakland. C102 (Jax): "a journalist who lives in the neighborhood" (checked).
- Code-picked: `buildOaksBeatSlice.js` (Sunday's beats copy) makes the newest Oaks row the story, writes the angle ("Oaks — team-update C117 · 11-2 · W2 — the second club's board read"), the hook (the row's StoryAngle) and the hood; hands EventTrigger and FranchiseStability as facts (her pieces print "the franchise's stability is growing", C113, C114, C117). Approach + roomIsYours; desk-approach-map ("open on a supplied number … never a scene … End on what the front office still owes"); package purpose, opening, closing ("the decision or number the front office still owes"), texture conditions; RULES PREWRITE form, STANCE line, "write by turn 6". Five of seven Oaks pieces close on what is "owed".
- Sourcing `records` (builder 2026-10-02: "Selena Grant is the stats-and-data reporter for the Oaks"): no interviews; zero quotation marks in C110–C117.
- Tools: canon_recall only (not on WRITER_TOOLS_SEATS); C116 10 calls, C117 6, all canon_recall. Oaks_Roster (live per-game lines) is not on SHEET_READ_ALLOWLIST; Gridiron's Jade Soy (GIA-OAKS) reads it. Models: Maverick plans, Luna writes.
- Pieces: C113–C117 all staged and graded full; accurate box-score reads, hedge-heavy ("does not prove"); C114 and C116 staged with no headline; C113 "Ausin Reaves", Stanley's opening game misdated. Chicago C79, C83–C86, C90 her best work. The same Oaks story as Talia and Simon most weeks C112–C116.

## Acceptance

1. Sharon's live writer prompt holds only the five parts above — proven by the printed prompt of her first live wake after the switch.
2. Her first live piece after the switch opens from her own evening record or a crossover she chose — proven by reading the staged piece.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| Six reporters, live | agy | [[../../output/antigravity/2026-11-23-review-pipeline111-reporters]] | HOLD — #1–#5 verified and fixed `36f0eec26`; #6–#8 held (low) |
| Morning tools, ask_worker, Graye, trims | agy | [[../../output/antigravity/2026-11-23-review-pipeline111-pass2]] | HOLD — #1–#5 verified and fixed `69f6adf70`; #1 proven through the live gate (PASS) |
| Anthony step 1, the seat file | agy | [[../../output/antigravity/2026-11-24-review-anthony-step1-seat]] | HOLD — #1-3 tools: true, wired in steps 3-4; #4 OrginCity: stale snapshot (sheet written N17); #5, #7-12 verified and folded into SEAT.md + voices/anthony.md Essence; #6 held (newsroom rule: Paulson family is out of canon); #13 'and the rest' removed |
| Anthony step 2, the live record | agy | [[../../output/antigravity/2026-11-24-review-anthony-step2-record]] | HOLD — #1 (rows cut at 500, Stats lost on 9 of 10) fixed: prewrite.factChars, packet carries 10 of 10 whole; #2 privacy fails closed (no EventTrigger column → no copy / no rows); #3 a copy over 20 h old sits him out; #5 window label + blank Cycle + sim-local date; #7 the morning read time-boxed at 60 s; #4 the fanout's old buildAnthonySlice call and #6 the kit's 'paint' lines → step 4 (the seat writer is sent no limits block; proven in the step 4 print) |
| Anthony step 3, his tools | agy | [[../../output/antigravity/2026-11-24-review-anthony-step3-tools]] | HOLD — #1 fixed: the team cards answer first only for a seatDossier seat (Hal and Marbury keep the older dossiers); #2 fixed: age is the ledger's (sim year − BirthYear), the card's only with no ledger row; #3 fixed: a team-card line is anchored on the surname, one of its numbers suffices (Ramos: slider 86, walks 97, 2043 $8.2M, age 26 all approved); #5 duplicates / staff / empty seasons; long card lines split under the 500 clip; #7 As_Player_Data only for a seatDossier seat. Held: #4 three AAA players with no ledger row (builder); #6 morning reads not carried to the writer (he re-reads; 6 calls); #7 unfiltered tab read shows 10 of 28 (match or Gridiron) |
| Anthony step 4, the switch + test day | agy | [[../../output/antigravity/2026-11-25-review-anthony-step4-switch]] | SHIP-WITH-FIXES — #1 fixed: a quote is a quoted source when any sentence of the answer is in the piece; a worker's answer on the CLAIM line capped at 400; #4 fixed: a leading-dot decimal reads as one number (.762), a team-card line counts by its labelled number in a piece that names the player; #5 fixed: the grade's page key carries the day (Monday's survives Thursday's). Rejected: #2 the voice Essence is trued to his origin and the builder ruled Essence stays; #3 a seat-file wake is bare live too (bareWrite = SEAT_FILE) and the writer is sent no limits block. Open: Gonzalez's age is 27 on the feed, 28 on his card, 26 on the ledger — the gate reads the ledger (builder/duet) |
| P Slayer on his seat (steps 1-4 + test day) | agy | [[../../output/antigravity/2026-11-25-review-pslayer-seat]] | SHIP-WITH-FIXES — #1 fixed: the writer takes the run's Cycle (--cycle; it took the newest world summary and saved under N+1 — live after a Sunday fire too); #2 fixed: writerTools 6 + on both tool lists (without it Grok wrote in canon_recall-only mode). Held: #3 W1 reward loop off for seat-file seats (the mold took the plan line out), the 25-person cap on his pool, the street pool reading the beat dump; #4 voice Essence stays (builder), Haiku's checks not forwarded to the writer, the test piece's three stretched facts (the gate's); #5 colleagues' headlines as approved facts (headline only, low) |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | A W1 pass must end the day cleanly at W3 | agy · rb | review #1; cron-desk-run.js runWrite |
| A2 | Empty record sits the seat out; casino people before movers' workers | agy · rb | review #3 |
| A3 | Own-record seats never take the evening pack; staff/self/cap gate on every person | agy · rb | review #4, #5 |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|
| N1 | Missing world summary / texture file should throw in every builder, not drop sections | agy #6 | loud failure | held (low) |
| N2 | Cache keyed on version only; prev/ cycle not checked | agy #6 | stale-cache guard | held (low) |
| N3 | Fanout re-attaches approach; legacy --wake path skips the seat switch | agy #7, #8 | artifact hygiene | held (low; not in the live prompts) |

## Open questions


## Changelog

- 2026-11-26 (research-build) — Task 36 becomes the city feed: non-sports seats get sports-feed-shaped entries (event, canon history, people, open questions), written unattended. Plan [[2026-11-26-city-feed]]; builder approved the vision and a three-entry C117 test.
- 2026-11-26 (research-build) — C117 read: the seat-file civic pieces (Angela, Lila, Trevor, Carmen, Rachel) write the tables back, worse than C116; the morning facts hold no FACT on the job line's angles; "the engine's" in 14 job lines (gap log C117 G-EC80, G-EC81). A people-first facts change was made and reverted (builder: "I don't approve"). No fix; builder's call owed.
- 2026-11-25 (research-build) — Interviews wake the citizen as their own cron ("Why wouldn't the citizens wake as the Cron ?"): the wake's prompt builder shared (lib/citizenWakePrompt.js), the reporter's question as the wake's question, the citizen's own model; their words are the quote. agy folded. Talia live Thu with her Essence reframed ("fandom is a dial").
- 2026-11-25 (research-build) — Interviews: a seat-file reporter asks whom it picks ("take the restriction out, keep the cap"; "if it chases a different angle we dont want to punish them"); the record still lists who the week touched; a pick gives its reason and answers from its own life; refused only off-ledger, inactive, self, Tribune staff. Talia's bio on her row ("relocated her to Oakland to follow paulson"); her tools and job approved ("looks good"). `91385f174`
- 2026-11-25 (research-build) — Talia read in full (builder: "take his more seriously like last session did"); bio = deep history only ("hardcoding their current life is not a good mechnism"). Her street sources are her past interviewees (G-EC78).

- 2026-11-25 (research-build) — §State of the work added (builder: record the true state of the stop-puppeting work; media in progress, council after); Tasks 32-36; the sports mold written down.

- 2026-11-25 (research-build) — Builder on the voice Essence line (agy has twice asked to switch it off for a seat-file seat): "Leave it for now , test showed that bios improved the writing quality". It stays on every seat.

- 2026-11-25 (research-build) — P Slayer next (builder: "the natural next take … is P Slayer since he rides similar tools"). Rulings: "Of his writing is good leave him on grok on that wake 3 but give him haiku for the wake1 , go on the bio , rest looks good"; Paulson may be interviewed ("Mike Paulson can be interviewed in the sim and it's a nice touch"; the C116 quote traced to his W2 ask, legit). His CitizenBio written (Simulation_Ledger AT8, read back). Open: A's only or the Oaks as well.

- 2026-11-25 (research-build) — Builder: card ages are right ("keane is 37 based on the card … the sheets may have age drift issues"; duet checks them as it builds cards); until a ledger row is trued, a contested age is left out (the gate reads the ledger). Mint ("sure we can mint them"): Fry, Hendricks, Kirkland queued on Advancement_Intake1 rows 261-263 for the C118 mint, read back.

- 2026-11-24 (research-build) — Anthony step 3 built and folded (agy HOLD). The cards' ages disagree with the ledger's BirthYear on 15 players (Keane 37 vs 39, Ramos 27 vs 26): the ledger rules (newsroom age rule), the mismatch goes to the builder. Note: engine-sheet's e788cafe7 carried this lane's staged options fix and step 3 brief (shared index).

- 2026-11-24 (research-build) — Anthony step 2: his record read live from the sports feed each morning (builder: "just read the sheets live"); agy HOLD folded — whole rows reach the packet (10 of 10 with Stats), privacy fails closed, a stale copy sits him out, the read is time-boxed.

- 2026-11-24 (research-build) — Anthony step 1 folded after agy's HOLD: third person and one claim, blunt with evidence; rates only from filled numbers, innings in thirds; no merged lines, team record is the club's; no splits, projections, injuries or front-office mind-reading; PANDAS/Statcast supply no current numbers; Gridiron quotable, citizens not interviewed; three stock phrasings out; voice Essence origin trued.

- 2026-11-24 (research-build) — Sports seats begin with Anthony: his wake read whole; builder rulings on his origin, the sports lenses and models recorded verbatim. Open: Berkeley Owls (his own canon interview) vs the builder's memory of Mags; Paulson's brother vs no relation; OrginCity blank.

- 2026-11-24 (research-build) — Task 31 live: two builder rows answered to Discord. Lineup test: no thinking → eight starters, third base empty; medium thinking → nine, a split vs LHP, every checked claim on the cards. Gridiron thinks by default (GRIDIRON_REASON=0 off).

- 2026-11-24 (research-build) — Feed questions to Gridiron built (Task 31). Supermemory: the account's Google Drive connector (made 2026-02-05, never imported before) pulled 958 Drive files at 00:20 UTC 11-25 on a "manual" sync — 8.7M rich tokens, the balance to 0; disconnected on the builder's word, documents kept pending Supermemory's reply. Record: output/research-build/2026-11-24-supermemory-drive/.

- 2026-11-24 (research-build) — Builder: Keane's card moved ("claude duet moved if"); Gridiron "under contract" to the clubs; pull "every Sunday before the cycle"; tab "Approved use it so its useful". As_Player_Data live (own tab, not the roster tab); Step 1 pulls; Gridiron on ask_worker.

- 2026-11-24 (research-build) — Found open and closed: the builder's private question rows (engine.338) reached a reader through sheet_read on the feed — the reporters' tool and the workers' tool — and Gridiron's Oaks record. All three now filter through lib/feedPrivacy.js. Live on save (crons run from the tree); suites not run (test guard).

- 2026-11-24 (research-build) — Gridiron test: 0 figures off the record. Fixed: options misread (now "used 0 of 3 (3 left)"), an empty 2042 line read as last season, "who starts" unrouted, and a reply that was a tool call written as text — caught in both ask paths (workerAsk isAnswer).

- 2026-11-24 (research-build) — Gridiron Analytics as the sports data house (Tasks 27-30): cards pulled and read (28 A's players, the 2042 staff; the Oaks folders are empty); five analysts by job; code router. Built, not live; tab conversion held for his go.

- 2026-11-24 (research-build) — Superintendent's first ask invented Claremont Hills and an $85,000 parent-teacher group (traced: in no record, canon or page). Builder: workers' job is data integrity; RECORD_DUTY added to every worker; the re-ask answered from the record and named its limits.
- 2026-11-24 (research-build) — Culture director approved ("culture director looks good"); intake row written to the next empty row from column A (no append). Builder: workers are at work — they get their job responsibilities, never what to say.
- 2026-11-24 (research-build) — Workers: superintendent built (answers only); culture director to be minted; Internal Affairs (Viteri) held by the builder until the sim keeps conduct records (none exist). answersOnly on the office map keeps a worker off the scheduled rota.
- 2026-11-24 (research-build) — City Clerk: no clerk existed; builder ruled a mint (young, data-savvy), answers only (no report). Intake row queued for C118; worker code in place, off until her POPID exists.
- 2026-11-24 (research-build) — Tamsin, Ines, Nia live on seat files. Landmine: building Tamsin's record (buildLivesSlice, even a read with node -e) marks the day's batch covered in output/cron-compare/lives_covered.json — a session read at 02:41 marked 10 of Tue 11-24's people; the 10 marks were removed before her 06:15 wake (backup in the session scratchpad). Never build her record by hand. Builder order next: a data worker for Carmen, a sports roster worker, then sports.
- 2026-11-24 (research-build) — Jax: Grok morning, Sonnet interviews and write, thinking medium, his own memory (recall), Varek's journal on his record. Builder: watch him a couple of weeks as he builds on it.
- 2026-11-24 (research-build) — Builder rulings: job lines are fine, telling them what to say is puppeting ("telling a cop to arrest people isnt puppeting … telling that cop to talk with an accent is puppeting"); bios, tone lines and voice Essence stay ("it gives them a sense of themselves"); a CitizenBio says who they are, never age or home (the row carries those, live). The story, not the data: "I dont want 22 media crons citing data from the sheets to me … whats the story" — records lead with people and power; interviews return the citizen's own view.
- 2026-11-24 (research-build) — Interviews fixed for every seat-file seat (the reporter's plan and others' record lines no longer reach the citizen; officials get the reporter's own question). Jax live on a people-first record.
- 2026-11-24 (research-build) — Watch row pipeline.117 (builder: "add a watch line on rollout for this"): do Carmen, Luis and Farrah keep landing on one civic story; read Thu 11-26 and Tue 12-01.
- 2026-11-24 (research-build) — Farrah seated: the opinion column on Thursdays, reading the week as published. A new seat needs persona-map, package, WEEK_GRID, WRITER_TOOLS_SEATS, both BEAT_BUILDERS, an agent folder naming the voice file, and the test lists; GODWORLD_TEST_NEW_SEAT=1 tests it before its first rota.
- 2026-11-24 (research-build) — Luis on Haiku 5.5 (builder: different model, different voice from Carmen); bio written to his CitizenBio cell.
- 2026-11-24 (research-build) — Luis live; the engine's self-check findings no longer reach him. Overlap with Carmen (same C118 due list) flagged to the builder.
- 2026-11-24 (research-build) — Carmen live with her own civic record and thinking at medium. Builder order: Luis next, then Farrah.
- 2026-11-23 (research-build) — The mold written into the plan for the next session (builder: "I want to make sure the model we are following carries").
- 2026-11-23 (research-build) — Angela live. He noted a school superintendent worker is owed (no schools worker today).
- 2026-11-23 (research-build) — Rachel live. Arrests by hood are 1 or 2 everywhere (coarse, like hospital). Officials asked through the interview path decline; ask_worker reaches them.
- 2026-11-23 (research-build) — Lila live. Her hospital lines hid discharges and cut the census to five hoods (handoff, fixed); engine gaps for his call: StatusNow never flips on discharge; small hoods round to 0 admissions. `72165640a`
- 2026-11-23 (research-build) — Trevor live: game write-ups off ("he doesn't need sports outcomes"); morning worker answer carried to the manifest in a live-path run.
- 2026-11-23 (research-build) — Noah live, "Same approach as the rest"; engine models one weather row a Cycle (a fuller environment model is its own job). `d08529a29`
- 2026-11-23 (research-build) — agy pass 2 folded: a quoted worker now backs the gate's intake check (proven PASS on Jordan's Osei piece); worker asks capped per wake and never fatal. `69f6adf70`
- 2026-11-23 (research-build) — Workers on call ("media crons can call on worker crons"): ask_worker, 2 a wake, read-only on the worker's record. Graye live, seventh seat. `7109f6cf7`
- 2026-11-23 (research-build) — Morning tool loop live ("allow them to dig and and be journlists"); agy HOLD folded #1–#5. Jordan and Maria trimmed mornings. `36f0eec26`
- 2026-11-23 (research-build) — Celeste and Jordan live. Staff off source lists ("1 and 2 yes"); Celeste's Essence back (his allowance); Jordan on Sonnet 5.5 for morning and write ("be curius if sonnet 5.5 would be sufficient"). Gaps for him: a trending page (who watched which show); the engine's per-week business cause.
- 2026-11-22 (research-build) — Mason live, "mason next": trend = each business's move since last Cycle; the engine keeps no per-week cause (engine gap, his call on a row). Ages ride from the row after a 34-for-20 invention. `f72796514`
- 2026-11-22 (research-build) — Test-run pieces are not staged (builder: "3" — test runs stay tests; first live pieces Fri 11-27 take the full path). Kai live `11b50a52d`.
- 2026-11-22 (research-build) — Maria approved on "2" once packet-talk was out: writer Packet trimmed to facts/people/quotes/her plan; interviews retry a busy provider (Maverick flapped all evening). `aafcaff3f`
- 2026-11-22 (research-build) — Maria on the Sharon mold, "You got it": bio = voice Essence + traits, beat = neighborhoods and their people, evening pack off. Test day failed at W1: OpenRouter out of credits. `1e0ac867b`
- 2026-11-21 (research-build) — Tools: "Depending on how the Article is written perhaps the extra depth wasn't needed"; models differ on tool use — which media crons get a tool-calling model is his call per seat, not one model for all. Zero calls is not a defect.
- 2026-11-21 (research-build) — LIVE: "Run 3 lock it in and turn that live, loosen her reviewer to stick to facts about locations , citizens data points". Still graded (builder 10-15). `982ca9ec6`
- 2026-11-21 (research-build) — "her 3 wakes are the media Cron, pull out around Oakland": morning plan on her seat file; gate profile off the writer's Packet. Run 3 on the Kelley block party; no visit, 0 tool calls. `3fe3a575e`
- 2026-11-21 (research-build) — Game night on her beat: "Those onto stay if they are in context of the nightlife her best covers". Test run 1 filed on Aitken: her morning plan carries the city sports line.
- 2026-11-21 (research-build) — Opened on the builder's ruling; Sharon first: both bio pieces kept, she leads nightlife and evenings, fame through her tools.
