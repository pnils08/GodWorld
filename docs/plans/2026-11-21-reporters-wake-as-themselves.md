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

Done: Sharon, Maria, Kai, Mason, Celeste, Jordan, Graye, Noah, Trevor, Lila, Rachel, Angela, Carmen, Luis, Farrah (new seat), Jax, Tamsin, Ines, Nia. Next: finish the City Clerk after C118, then a sports roster worker, then the sports seats (builder 2026-11-24: sports last). Not yet: the sports seats, Marbury, Jax, Nia, Tamsin, Ines.

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
| 22 | Interviews: the citizen gets their own life and the reporter's own question, never the plan (ownLifeInterviewPacket, all seat-file seats) | rb | live; read every seat's next quotes |
| 23 | Jax Caldera: seat file, people-first record + Varek's journal (buildJaxRecordSlice), sheet bio trimmed, Grok plans / Sonnet interviews and writes, memory_recall | rb | live Wed 11-26; watch a couple of weeks (builder) |
| 24 | Tamsin, Ines, Nia (daily + weekly): seat files, coaching off; Nia's seat carries what the show is and how the board ranks | rb | live; Tamsin and Nia untested (see changelog) — read their next pieces |
| 25 | City Clerk worker (Odessa Arceneaux) for the civic trio: intake row queued, worker records + job written | rb | after the C118 mint (Sun 11-29): office map entry with her POPID and answersOnly true, Civic_Office_Ledger row, the trio's seat files name her, one test ask |
| 26 | Superintendent of Schools worker (Achterberg) for Angela; Director of Cultural Affairs worker (Kiran Tavakoli, intake row queued for C118) for Kai, Sharon, Celeste | rb | superintendent live and asked once (answered from the record, one unsourced detail being traced); culture: map entry (answersOnly) + the three seat files after the mint |
| 27 | Gridiron Analytics, the sports data house: the team cards pulled from the sports folder and read to fields (gridironCards.js); five analysts on the worker template, one record each, the other four a read away; a code router picks the analyst, no model; a question no record covers gets no call (gridiron.js, gridironAsk.js) | rb | built, not live; the A's feed added as a sixth record every analyst can read (builder: "if the feed is cheaper to pull in this way is should be added") |
| 28 | Test set: one answerable question per record, one across two records (a pitcher's trade value), two the record cannot answer (an Oaks lineup, who starts Friday); every figure in each answer checked by script against the record it was handed | rb | done — 9 asks (output/research-build/2026-11-24-gridiron/test1.json). The script found no figure absent from the records handed (a substring check across all records: it cannot catch a right number on the wrong player); the two real errors were found by hand against the cards. Fixes below; two re-asked clean |
| 29 | Wire: Gridiron is one door on ask_worker (GRIDIRON → the router → the analyst) — every seat on its seat file can ask it now; the sports seats as each moves to its seat file. Before: route() over real question strings (3 of ~14 phrasings missed in the test); Oaks player names route (the router knows only A's names); a miss lets the reporter name the area | rb | on ask_worker, live; asked once through it (Jade Soy on Ty Jerome, answered from the record); Oaks names route by the roster tab; an unplaced question names the five areas |
| 30 | The card fields on the sheet (builder 2026-11-24: "Approved use it so its useful"): on their own tab per team, As_Player_Data (Oaks_Player_Data when the Oaks folder holds cards) — the roster tabs stay as they are, because the dashboard's sports page and the feed writer refuse a roster tab with columns they do not list; pull every Sunday at /run-cycle Step 1 ("every Sunday before the cycle") | rb | done — 28 rows written and read back, Pulled For Cycle 118 |
| 31 | Feed questions to Gridiron (builder 2026-11-24: "The feed questions should only route to the 'names Used' column … to put the data team behind me"): a `question` row naming Gridiron Analytics (or one analyst) is answered by the router's analyst as the general manager's data house and sent to his Discord (the gate's webhook); private, once a row, three tries (gridironFeedQuestions.js) | rb | built, not scheduled; one dry run and one real row owed (spend unlock) before the cron line |

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

## Acceptance

1. Sharon's live writer prompt holds only the five parts above — proven by the printed prompt of her first live wake after the switch.
2. Her first live piece after the switch opens from her own evening record or a crossover she chose — proven by reading the staged piece.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| Six reporters, live | agy | [[../../output/antigravity/2026-11-23-review-pipeline111-reporters]] | HOLD — #1–#5 verified and fixed `36f0eec26`; #6–#8 held (low) |
| Morning tools, ask_worker, Graye, trims | agy | [[../../output/antigravity/2026-11-23-review-pipeline111-pass2]] | HOLD — #1–#5 verified and fixed `69f6adf70`; #1 proven through the live gate (PASS) |

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
