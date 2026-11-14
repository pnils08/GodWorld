---
title: Agent Boot Templates — what each kind of cron agent wakes with
created: 2026-11-13
updated: 2026-11-13
type: reference
tags: [persona, citizens, civic, draft]
sources:
  - docs/research/2026-11-13-boot-templates-test-runs.md — the code read and Runs 1–4 every line here rests on
  - scripts/citizen-wake.js, scripts/cron-work-wake.js, scripts/cron-civic-run.js, scripts/cron-desk-writer.js, scripts/cron-rhea-gate.js (read 2026-11-13)
  - scripts/civic-office-map.json, scripts/work-wake-packages.json, output/beats/*.jsonl (C115)
  - docs/adr/0014-citizen-self-authorship-live-drift.md — authored canon is a starting character; the dials drift
pointers:
  - "[[../research/2026-11-13-boot-templates-test-runs]] — evidence, run by run; new runs are logged there, not here"
  - "[[../plans/2026-11-10-role-citizens-wake-as-themselves]] — pipeline.110 Task 9, the job that owns this page"
  - "[[../plans/2026-11-14-city-workers-answer-the-seats]] — civic.49, the ask step, built against §3 Worker"
  - "[[../plans/2026-11-10-stop-puppeting-the-newsroom]] — pipeline.111, owns the reporter harness (§4)"
  - "[[../index]] — registered here, same commit"
---

# Agent Boot Templates

**Status: draft, HELD by review.** Nothing in the crons has changed. agy's adversarial review (2026-11-14, `output/antigravity/2026-11-13-review-agent-boot-templates.md`) returned HOLD with 13 findings; each was checked against the code and the run files and all 13 stand. They are folded below as corrections; §Review says what each changed and what still has to be run. No template here is ready for the builder's approval except where its State line says so.

**Builder's words (2026-11-13):** "we want them to wake in their persona/identity, with access to their memory store … without being told what to say, having a template we know works is probably better than 40 different write ups" · "there can be different templates depending on the cron type" · "before we move too fast we have a set template for workers based on the police chief?" · "before we move to fine tune the workflows should we make sure our agent templates are set? … 'worker' , 'council/mayor', 'citizens' 'gates/rhea'" · "make sure proper documentation is occurring, if we need to retire current write up as legacy for the rewrites we can do that also". · "use the civic office ledger for the citizens who fit all these positions, we may need to check to make sure any new civic offices made it to the simualtion_ledger … make sure chaos cars are routed to the right desk when helpful, if ultimately a worker is thin it tells us the system needs teeth".

## 0. What holds for every template

| Part | Owned by | Source at wake time |
|---|---|---|
| Who the person is: name, age, role, hood | the sheet | `Simulation_Ledger` row |
| Temperament | the dials | `DialState` → `lib/citizenDials.js` `disposition` |
| Memory | the person's own page | `lib/citizenPage.js`, the page tag in `SMPageId` |
| Current state of the world and of their work | the engine's tabs | the pack or records the wake hands over |
| The task | the wake | the question, the week's work, the assignment |

- A written file never states a thing the sheet or the engine moves: age, home, health, who holds which office, a project's state. One file gives the fund director as 52, living in Laurel; the sheet says 42, Downtown (gap log C115 G-EC52).
- A written line about how a person does a thing is acted out. For a reporter that is the voice; for a worker it becomes the task ("You write memos" → a memorandum, 3 of 3). So a written part exists only where a run shows it changes the output in the way wanted, and it never states what to say, how to open or how to close.
- No file paths, tool names, output formats, ids or build notes in anything the model reads as its identity. Output format belongs to the wake's contract.

## 1. Citizen

**Who:** every ledger citizen on the daily wake (07:30, 12:30, 21:30).

| Order | Part | Source |
|---|---|---|
| 1 | The sheet line: "You are <name>, <age>, a <role> living in <hood>, Oakland." + temperament | `citizen-wake.js` `buildVoicePrompts` |
| 2 | Their recent life, family, bonds, what the city put in front of them | the same builder |
| 3 | Their page memory | page readback |
| 4 | One question | `selectProvocation` |

- **Written file:** none.
- **Evidence:** Run 1 — Vinnie Keane with and without the 300 characters lifted from his written file, 2 runs each, the same man. One citizen, a Tier-1 player with a deep page; Kai Marston's daily wake seen once, uncompared.
- **State:** supported on one high-record citizen; a low-record citizen and the other three authored voices are not run. Nothing written is what runs today.
- **Differs today:** the line "You are an ordinary person, not a writer" / "You are not a writer" (G-EC53); one question that drops the whole temperament list into a sentence (G-EC54); a dry run that appends to the offered-neighbours log (G-EC55).
- **Legacy on switch:** the four `citizen-voice-*` folders stay for the Discord conversations that load them (`lib/personaProvider.js`); the daily wake needs none of them.

## 2. Council / Mayor

**Who:** the Mayor and the nine council seats, weekday wake and Sunday chain.

| Order | Part | Source |
|---|---|---|
| 1 | The sheet line + temperament | ledger + dials |
| 2 | Their page memory (their own past positions) | `officeWall.loadPositionWall` |
| 3 | Their district and the city's nine | `civicSeat.districtBlock` |
| 4 | The week's pack and the wake's contract | `buildCivicOfficeSlice.js` `buildPack`, `datawakeUserPrompt`; the Sunday packet |
| 5 | (civic.49, not built) who they can ask | the worker roster, §3 |

- **Written file:** none needed on the evidence. Mayor: 20,959 characters of files, a 175-character sheet line and a 701-character sheet line + written part all filed the same move. Tran weekday ×9 and Rivers Sunday ×9 (the Mayor once per version): the same act and the same voice on all three; Rivers's own lines return word for word from her page.
- **State:** tested: 21 runs (Mayor 3, Tran 9, Rivers 9), three people, both wakes, each a single call without the live retry and evidence-read loop. No project director's Sunday step has been run.
- **Differs today:** IDENTITY + LENS + RULES load whole as the system turn (`readPersonaDir`); the shared council-seat LENS and RULES ride with every seat.
- **Sheet line for an office holder (live 2026-11-14):** the daily wake reads the office sheet: "You are Ramon Vega, 64, living in Lake Merritt, Oakland. You hold the office of City Council District 4 (Glenview, Dimond, Ivy Hill)." and every office holder gets the known-person sentence. Interviews still print the ledger role.
- **Open, and not a boot matter:** what they are handed. "D3 East Oakland" (G-EC48) and the hand-closed tracker rows come back in every statement because they are in the pack.
- **Legacy on switch:** `civic-office-mayor/`, `civic-office-council-d1…d9/`, `civic-office-council-seat/`, and the faction folders the seats fall back to (`civicSeat.personaDirFor`).

## 3. Worker

**Who:** a citizen who holds city records and answers for them. Template drawn from the police chief (Runs 3–4).

| Order | Part | Source |
|---|---|---|
| 1 | The sheet line + temperament | ledger + dials |
| 2 | Their page memory: statements, past answers, work docs | no one loader supplies this today: `loadOwnPageReadback` returns at most 3 private reflections of 320 characters and drops office statements (`lib/wakePerception.js:399-410`); statements come from `officeWall.loadPositionWall` (6, CIVIC docs) or the work wake's `loadOfficeWeek` |
| 3 | The whole of the records that are theirs, every column | the worker's tab or row, §3.1 |
| 4 | Their past decisions | their rows in `output/cron-civic/moves/`, looked up by POPID: the same person's moves are keyed three ways (`proj-*` registry key on weekdays, `civic-project-*` / `civic-office-*` on Sunday, `STAFF-*` on the office sheet) |
| 5 | Anything they are on record as promising | `output/mara-directives/promises.jsonl` (none held for any worker today) |
| 6 | The task: a question from a named seat, with the asker's seat and hoods | the ask step, civic.49 |

- **Written file:** none. The review's point stands: every "how they decide" line tried was a behaviour instruction in the second person ("when you are blocked you escalate rather than wait"; "You write memos"), so a written part is not proposed for workers.
- **Evidence:** Run 3 — the chief on his weekday data, 3 of 3 answers with no figure outside what he was handed, and "I'm not going to invent a corridor split". Run 4 — handed the whole crime sheet he answers with the response times and clearance rates; 5 of 5 answers grounded; one wrong comparison. Run 1 — the fund director with no question answers one anyway in 5 of 9 runs. One worker, one sheet, one asker: no director, and none of the thin workers, has been run.
- **State:** shape seen on one worker (5 answers); not ready to approve until a director is run and parts 2 and 4 have a loader.
- **Differs today:** a registry worker wakes on a clock (Tue / Thu) with four status lines and no question; every agented office outside the registry — the police chief, the Mayor, the council seats, Okoro — also wakes on Thursday as an auto office pack on a 700-character cut of its IDENTITY file (`cron-work-wake.js` `autoPackages`), so the chief has three boots today (weekday files, Sunday files, Thursday cut); the chief's weekday pack lacks `ResponseTimeAvg` and `ClearanceRate` (G-EC56) while the DA's crime node carries clearance and no response time; no worker is handed its move history; no worker has a tool; the EMS director's registry entry carries no first name.
- **Legacy on switch:** the registry's inline `roleLine` / `voiceNotes` (`scripts/work-wake-packages.json`); the five `civic-project-*` / `civic-office-baylight-authority` folders once the Sunday project step stops loading them (37–46k each).

### 3.1 Roster: who holds which records

**Who holds a position comes from `Civic_Office_Ledger`** (builder 2026-11-13). Read live 2026-11-13, C115: 39 positions, none vacant. Every holder is on `Simulation_Ledger` under the same POPID and name, Status Active, CIV flag yes, clock CIVIC; the four project-director rows added in October (STAFF-OARI, STAFF-HEALTHCTR, STAFF-STABFUND, STAFF-TRANSITHUB) are among them. `scripts/civic-office-map.json` holds the same 39 people, but the four project directors sit there under `PROJ-*` ids and on the office sheet under `STAFF-*`: a join on id drops them; join on POPID.

**Every worker gets an agent on this template** (builder 2026-11-14: "all the workers will get an agent template"). The roster is the 39 positions below less the Mayor and the nine council seats (§2); the 21 positions with no agent today are in scope.

**A thin worker is a finding about the system, not about the template** (builder: "if ultimately a worker is thin it tells us the system needs teeth"). Where a position's records are few or absent, the tables below say so; the template is not bent to cover it.

**Role on the citizen ledger against the office sheet: six corrected 2026-11-14** (builder: "Repair to its state from January, use the wording the engine uses"). Osei, Vega, Carter, Rivers, Crane and Delgado now carry their office Title word for word, the string the engine writes at a seat turnover; history, readers, writers and the before-and-after are in the evidence log §Office holders' role. The other four seats followed the same night; all nine read "City Council District <n>". The sheet line a wake builds prints `RoleType` as it stands: "a City Council District 4 living in Lake Merritt".

**Fits now** (an agent or pack exists and a tab holds their records):

| Worker | Records | Rows on disk (C115) | Handed today |
|---|---|---|---|
| Rafael Montez, police chief | `Crime_Metrics` | 22 neighborhoods × 13 columns | part: no response time, clearance |
| Marcus Webb, Stabilization Fund | `Initiative_Tracker` INIT-001 | 36 filled fields | 4 status lines |
| Vanessa Tran-Muñoz, OARI | INIT-002 | 36 fields | 4 status lines |
| Bobby Chen-Ramirez, Health Center | INIT-005 | 39 fields | 4 status lines |
| Elena Soria Dominguez, Transit Hub | INIT-003 | 25 fields (row hand-closed) | 4 status lines |
| Keisha Ramos, Baylight | INIT-006 | 30 fields (row hand-closed) | 4 status lines |
| Brenda Okoro, Deputy Mayor (community development) | `Initiative_Tracker` (Stabilization Fund), as the office map declares | INIT-001, shared with Webb | her own Sunday packet |

**Thin** (a pack exists; the records are few or missing):

| Worker | Records | Rows on disk |
|---|---|---|
| Clarissa Dane, district attorney | `Judicial_Ledger`; the judicial side of `Care_Justice_Census` | 0; 288 census rows |
| Priya Narang, EMS director | `Hospital_Ledger` admissions, `Health_Cause_Queue`; the hospital side of `Care_Justice_Census` | 3, 3; 1,008 census rows |
| Jonas Patel, medical examiner | deaths: `Hospital_Ledger` holds 3 rows, all recovered, 0 deaths; `LifeHistory_Log` holds 1 death (C114), which his node never reads | 0 that reach him |

**Named on the office map with a data domain, no agent** (candidates; who answers for which tab is the builder's call):

| Office (holder) | Declared domain (`civic-office-map.json`) | Tab that exists |
|---|---|---|
| City Manager (Aaron Whitfield) | city-operations-budget | `City_Treasury` (19) |
| Deputy Mayor, Econ Dev (Marcus Osei) | economy-business | `Business_Ledger` (283), `Employment_Roster` (971) |
| Fire Chief (Marcus Hollowell) | fire-incidents | none |
| Public Defender, Deputy Public Defender, Court Liaison, Reentry Director, two ADAs | justice | `Judicial_Ledger` (0); the 288 judicial rows of `Care_Justice_Census` |
| Emergency Management Director (Shawna Delgado) | emergency-crisis | none |
| Chief of Staff, Communications, Legal Counsel, Ombudsman, Police Review Chair, Internal Affairs, two Deputy Chiefs | staff and oversight | none of their own |

**Tabs with no office declared for them:** `Transit_Metrics` (684), `Community_Programs` (33), `Household_Ledger` (930), `Neighborhood_Demographics` (22), `Cycle_Weather` (40), `Faith_Organizations`, `Cultural_Ledger`. The City Planning Director (Mara Vance) is declared for planning, housing and development and runs as her own Sunday cron (civic.47 M1).

### 3.2 Chaos cars: which desk an event reaches

**What the engine fires** (`utilities/chaosCarsConfig.js`): twelve kinds — cop car, fire engine, ambulance, OARI van, building inspector, garbage truck, mail truck, ice cream truck, street sweeper, Estuary Power & Gas truck, BART train, container ship — each landing on a neighborhood, a business or a citizen.

**Where an event goes today:**

| Reader | Rule | Code |
|---|---|---|
| A council seat | by place only: the row's text has to name a hood on the seat's turf; at most ten facts a pack | `buildCivicOfficeSlice.js` `loadCycleEvents` / `eventHitsTurf`, `pickTurn` |
| The Mayor, the DA, the police chief (citywide roles) | none, unless the week's pulse picks one hood, then that hood's only | `buildCivicOfficeSlice.js:1410, 1423-1429` |
| Reporters | the civic-domain, health, transit and accountability slices read the `## Chaos Events` section that `buildWorldSummary.js` `emitChaosCars` writes; the civic-domain and health readers keep only rows whose metric is Hospitalized | `buildWorldSummary.js`, `buildCivicDomainSlice.js`, `buildHealthSlice.js`, `buildTransitSlice.js`, `buildJaxSlice.js` |
| Workers | none: the work wake has no event node | `cron-work-wake.js` `NODE_BUILDERS` |

**C113–C115, off the world summaries:** 30 events fired. A chaos fact reached six council packs, all by place. The two cop cars reached the police chief as nothing of his; the two OARI vans did not reach the OARI director, nor the two ambulances the EMS director. The 12 events on a business and the 4 on a citizen name no hood and reached no office.

**Routing by kind needs the target as well.** The first table here sent each kind to one worker; checked against `utilities/chaosCarsConfig.js` it was wrong on seven of twelve, because a kind lands on more than one sort of target. What the config says each kind can hit (which worker answers for which is the builder's call):

| Kind | Lands on (config `scopes`) | Who that touches |
|---|---|---|
| Cop car | citizen, neighborhood | police chief; the district seat |
| OARI van | citizen, neighborhood | OARI director; the district seat |
| Ambulance | citizen, neighborhood | EMS director; the district seat |
| Fire engine | business, neighborhood | fire chief (no agent); the district seat |
| Building inspector | business only | Deputy Mayor (Econ Dev) (no agent) |
| Garbage truck, Power & Gas truck | neighborhood, business | City Manager (no agent); the district seat; Econ Dev for the business hits |
| Street sweeper | neighborhood, citizen | City Manager; the district seat; its parking tickets write `City_Treasury` |
| Mail truck | citizen, business | Econ Dev for a business letter (contract, lawsuit, audit, premium); a citizen's letter is that citizen's own |
| BART train | neighborhood (transit-served), citizen | the district seat; its delays feed `Transit_Metrics`, which no office holds |
| Container ship | the port: a citywide shock to business growth across sectors | Econ Dev and the City Manager first; the Baylight director for the harbor |
| Ice cream truck | neighborhood | the district seat, by place, as today |

## 4. Reporter

**Who:** the newsroom, write wake. The angle and report wakes already run on the citizen path (`citizenVoice.js`).

| Order | Part | Source |
|---|---|---|
| 1 | The sheet line + temperament | ledger + dials |
| 2 | A short written background: who they are, how they work, how they talk (about 500 characters) | drawn from `docs/media/voices/<name>.md` |
| 3 | Their page memory | the writer's `memory_recall` tool |
| 4 | The assignment and its quotes | the packet |

- **Written file:** undecided. The run meant to show it was not clean (next line).
- **Evidence, corrected:** every version in Runs 1–2, the "lightest harness" included, still carried the reporter's hard-coded stance line and their bag file (`cron-desk-writer.js:1258-1282`; Tanya's reads "sideline dispatch … Short.", her bag "Short paragraphs"), the cascade rule, and the output contract. So the written part was never the only thing describing her voice. Prose word counts, intake footer left out — today's files, full harness: 470, 470, 375; today's files, lightest: 438, 290, 173; sheet line: 310, 235, 272; sheet line + written part: 189, 192, 156. The written-part runs are the shortest on average, but one lightest-harness run with no written part is shorter than two of them; "one-line paragraphs, last names, 3 of 3" was wrong (two of the three use full names and multi-sentence paragraphs). Kai Marston, one run a version: his written part says present tense and the piece is in past tense.
- **State:** not established. Needs a rerun with the stance line and the bag out, so the written part stands alone; that harness is research-build's (pipeline.111). The voice files themselves prescribe openings, closings and paragraph rhythm, so a written part cut from them carries direction unless those lines are left behind.
- **Differs today:** about 20 reporter folders hold a name, a beat and pointers to a voice file and a bag file; no wake loads any of the 30 voice files and the writer has no tool that opens a path. The harness and the package contract say how to open and close; the grade scores that (pipeline.111).
- **Legacy on switch:** each reporter's IDENTITY / LENS / RULES; `docs/media/voices/` becomes the source the written parts are cut from, then legacy.

## 5. Gate

**Who:** Rhea (the article gate), the city clerk (the Sunday close), the civic write-set gate. The final arbiter is not an agent: `scripts/finalArbiter.js` computes its verdict in code and loads no folder.

- **State:** not tested. No template proposed.
- **What loads today:** Rhea's IDENTITY + RULES, about 30k (`cron-rhea-gate.js`), beside a contract judge that loads none of her files and a set of checks in code that can override the model; the clerk's folder whole (`readPersonaDir('city-clerk')`, 15.6k) while the same rules are already in its user turn; the civic write-set gate (`cron-civic-gate.js`) already runs on rules alone with a one-line neutral auditor and no folder.
- **The question a test has to answer:** whether the verdict rides the rules, the persona or the packet. Comparing verdicts alone will not show it: for Rhea the code checks can decide the outcome whatever the model says, so the test has to read the model's own flags before the override; the clerk's input is the week's office filings, not drafts, and needs its own test set.


## 6. Outside the four

Mara Vance (asker; her own memory and tools; civic.47 M1), Elias Varek's journal (`civisJournal.js`: a directing preamble + his three files), Mags's reflections (`discord-reflection.js`), the show's pilots. Not covered here.

## 7. Retiring the current write-ups

**Builder (2026-11-13):** "if we need to retire current write up as legacy for the rewrites we can do that also".

- A folder retires when the last wake that loads it has switched, never before: the crons read these files live.
- Retire = move to a dated archive folder outside `.claude/agents/` (a folder left inside it can still be read as an agent), repoint inbound links, one commit per type. Nothing is deleted.
- Loaders to check before a move: `readPersonaDir` and `civicSeat.personaDirFor` (city hall), `agentIdentityNotes` (work wake), `loadVoiceTexture` (daily wake), `cron-desk-writer.js` AGENT_DIR / VOICE_DIR / SKILL_PATH (reporters and desks), `civisJournal.js` `promptFor`, `lib/personaProvider.js` (Discord), `cron-rhea-gate.js`, `refreshVoiceDispositionCache.js` (run in the weekly cycle chain; fails on an empty folder), `cron-civic-eval.js`, `modelFitRun.js`, `freezeModelFitInputs.js`, `runEngineAgent.js`, `djDirect.js`, `mdStalenessDetector.js`, `auditCanonDrift.js`, `buildPSlayerSlice.js` (pointer string), the skills that read the folders (`make-citizen-voice`, `interview`, `post-publish`, `write-edition`, `desk-slice`, `doc-audit`, `context-budget`), and the Agent-tool definitions that share the folders.

## 8. Where what was said is kept

| What | Where it lives today |
|---|---|
| An office's public statements | the holder's page (CIVIC docs); `output/cron-civic/datawake/`, `output/civic-voice/` |
| Decisions | `output/cron-civic/moves/moves_c<N>.jsonl` |
| Promises and whether they were kept | `output/mara-directives/promises.jsonl` (8 rows: the Mayor's and council's) |
| A worker's diary | the worker's page (`work` docs); `Reflection_Intake` |
| A question put to a worker and its answer | nowhere yet; civic.49 records it on the worker's page and in the seat's record |

**Builder (2026-11-13):** "if we run into issues on how to track things said we can consider a workbook for the crons if useful". Not needed for the templates. It becomes worth weighing when the ask step is live: questions, answers and promises would then sit in four places with no single readable view. Raised here so it is not lost; no design.

## 9. Where the documentation lives

| Thing | Home |
|---|---|
| These templates | this page; a change is a dated Changelog line |
| Evidence and every test run | [[../research/2026-11-13-boot-templates-test-runs]] |
| Raw outputs of the runs | `output/engine-sheet/2026-11-13-boot-three-way.md`, `…-run2.md`, `…-ask-dry-run.md`, `…-seat-asks-worker-dry-run.md` |
| The job | [[../plans/2026-11-10-role-citizens-wake-as-themselves]] Task 9 (pipeline.110) |
| The ask step | [[../plans/2026-11-14-city-workers-answer-the-seats]] (civic.49) |
| The test guard (no-write preload, in-memory file swap, self-test) | `scripts/guard/nowrite.js`, `scripts/guard/bootswap.js`, `scripts/guard/nowrite.selftest.js`; usage in each file's header |
| Observations made on the way | `output/production_log_run_cycle_c115_gaps.md` G-EC52–G-EC56 |
| On approval of a template | an ADR beside ADR-0014 (boot from the sheet, not a written persona) before the first wake switches |

## Review

| Review | Lane | Pointer | Result |
|---|---|---|---|
| The template concept | agy | `output/antigravity/2026-11-13-review-agent-boot-templates.md` (brief: `docs/for-claude-review/2026-11-13-es-brief-agy-agent-boot-templates.md`) | HOLD — 13 findings, all 13 verified against code and run files |

| # | Finding | What changed here | Still owed |
|---|---|---|---|
| 1 | Reporter runs were not clean: stance line and bag rode in every version; word counts included the intake footer; two "3 of 3" style claims false | §4 evidence and state rewritten | a rerun with stance and bag out (rb) |
| 2 | "Tested" said more than the runs: one citizen, 21 city-hall runs counted as 27, one worker | §1–§3 state lines | a low-record citizen; a director |
| 3 | "How they decide" and voice-file lines are direction | §3 written part dropped; §4 notes the voice files prescribe form | the builder's call on any written part |
| 4 | Ask harness dropped the chief's age in Run 4; "answers from the department's own data" steers; a real-world street name came back | recorded | the ask wording, in civic.49 |
| 5 | The named memory loader drops office statements and caps at 3 × 320 characters | §3 part 2 | a loader for a worker's whole page, in civic.49 |
| 6 | Three boots for the chief (Thursday auto pack); moves keyed three ways; no worker promise | §3 parts 4 and Differs today | reconcile the Thursday auto packs, in civic.49 |
| 7 | A wrong comparison passes the number check and reaches a proposal; the seat spends an `answer` move | already in civic.49's weak points | a comparison check, or none: the builder's call |
| 8 | The medical examiner has 0 deaths on his tab; his node never reads the one death on the life log | §3.1 | an engine finding (thin worker) |
| 9 | Office ids differ between sheet and map; six role mismatches written as two; the census is three-quarters hospital | §3.1 | — |
| 10 | Today's chaos routing: the emitter and the health slice missing; citywide roles get none by place | §3.2 today table | — |
| 11 | The kind-to-worker table wrong on 7 of 12 against the config | §3.2 table rebuilt on the config's scopes | the builder's call on who answers |
| 12 | Retirement list missed eight scripts and the skills | §7 | — |
| 13 | The final arbiter is code, not an agent; the civic write-set gate was missing; the gate test shape too thin | §5 rewritten | the gate tests |


## Changelog

- 2026-11-14 (engine-sheet) — The daily wake reads an office holder's title from the office sheet (live).
- 2026-11-14 (engine-sheet) — The test guard is in the repo (`scripts/guard/`), on the builder's "Put in the repo".
- 2026-11-14 (engine-sheet) — Six office holders' ledger roles corrected to their office Title on the builder's word; §2 caveat and §3.1 updated.
- 2026-11-14 (engine-sheet) — agy review HOLD folded: 13 findings, all verified. City-hall runs are 21, not 27; reporter evidence was not clean (stance line and bag in every version; word counts and style claims corrected); the worker memory loader named was wrong; the chief also wakes Thursdays; chaos table rebuilt on the config; gate and retirement sections corrected.
- 2026-11-14 (engine-sheet) — The ask step has its own row and plan: civic.49, [[../plans/2026-11-14-city-workers-answer-the-seats]]; pointers moved off civic.47 W1.
- 2026-11-14 (engine-sheet) — Builder: every worker gets an agent on the worker template; the six ledger-role mismatches are being traced (read-only) so they can be corrected on his go.
- 2026-11-13 (engine-sheet) — Roster re-based on `Civic_Office_Ledger` (39 positions, all on the citizen ledger; four role mismatches listed); §3.2 chaos-car routing added (today by place only; by kind proposed); thin worker = system finding (builder's words). Sent to agy for review.
- 2026-11-13 (engine-sheet) — Created as a draft from Runs 1–4 on the builder's go ("yes go on 1"). Citizen and Council / Mayor tested; Worker tested on the police chief; Reporter on two; Gate untested.
