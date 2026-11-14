---
title: Boot templates — test runs and findings
created: 2026-11-13
updated: 2026-11-13
type: research
verdict: adopt
tags: [pipeline, wakes, citizens, boot, active]
sources:
  - scripts/citizen-wake.js, lib/wakePerception.js, scripts/cron-work-wake.js, scripts/work-wake-packages.json
  - scripts/cron-civic-run.js, scripts/civicSeat.js, scripts/buildCivicOfficeSlice.js, scripts/officeWall.js
  - scripts/cron-desk-writer.js, scripts/cron-desk-run.js, scripts/newsroom-wake-packages.json, scripts/testReporterWrite.sh
  - .claude/agents/*/IDENTITY.md, LENS.md, RULES.md; docs/media/voices/* (read 2026-11-13, C115)
pointers:
  - "[[../plans/2026-11-10-role-citizens-wake-as-themselves]] — pipeline.110 Task 9, the job this serves"
  - "[[../plans/2026-11-10-stop-puppeting-the-newsroom]] — pipeline.111 (research-build), owns the reporter harness"
  - "`output/engine-sheet/2026-11-13-boot-three-way.md` — Run 1 raw outputs, every version in full"
  - "`output/engine-sheet/2026-11-13-boot-three-way-run2.md` — Run 2 raw outputs (council seats, second reporter), every version in full"
  - "`output/engine-sheet/2026-11-13-ask-dry-run.md` — Run 3 raw outputs: a council member's question to the police chief and his answers"
  - "`output/engine-sheet/2026-11-13-seat-asks-worker-dry-run.md` — Run 4 raw outputs: a council seat's weekday wake with the ask step inside it"
---

# Boot templates: test runs and findings

**Builder (2026-11-13):** "review the written agents, voices … ensure they boot the agent into its character … wake in their persona/identity, with access to their memory store … without being told what to say, having a template we know works is probably better than 40 different write ups. is less more? is more more?" · "the plan will be to figure out the template or templates needed, we dont have to make the mayor template be the same as citizen voice, there can be different templates depending on the cron type" · "save these findings and make sure the plan points to it as a test run and we can continue to notate the findings".

**Verdict: adopt** as the evidence behind pipeline.110 Task 9. **Ignited plans:** [[../plans/2026-11-10-role-citizens-wake-as-themselves]] Task 9; [[../plans/2026-10-31-civic-autonomy]] W1 (city workers answer the seats).

**What this file is:** the log of boot test runs and what each showed. A run is added under §Runs; §Findings is rewritten to the current read, with the run that supports each line. No template is chosen here: the pick is the builder's.

## What each wake loads (code read, 2026-11-13)

| Wake | Schedule | Boot text the model gets | Size |
|---|---|---|---|
| Citizen daily | 07:30 / 12:30 / 21:30 daily | Built from the sheet each wake: name, age, role, hood, station line, temperament off the dials, life record, family, bonds, page memory (`citizen-wake.js` `buildVoicePrompts`). The four `citizen-voice-*` add ≤300 characters of bolded phrases from IDENTITY `## Your Voice` (`loadVoiceTexture`) | short |
| Work wake | Tue / Thu 20:18 | Registry `roleLine` + `voiceNotes` (11 registry packs), or for auto office packs ≤700 characters cut from IDENTITY (`agentIdentityNotes`: first paragraph of Who You Are, Decision signature, first paragraph of Voice); then page memory. User turn = the work blocks, nothing added (since bf938be9d) | short |
| City hall | Mon–Thu 05:45 datawake (3 seats a day: council, Mayor, police chief); Sunday chain (Mayor, hearing seats, project seats) | IDENTITY + LENS + RULES whole as the system turn (`readPersonaDir`); a council seat = shared seat LENS/RULES + its own IDENTITY | Mayor 20,959; project directors 37–46k; council seat ~5–6k |
| Reporter write | Mon–Fri 18:15; Sat/Sun for two seats | Harness text + IDENTITY + LENS + RULES + the package contract (`cron-desk-writer.js`) | varies |
| Reporter angle / report | Mon–Fri 06:15 / 13:15 | The citizen path (`citizenVoice.js`), not the agent folder | short |
| Varek journal | weekly | A directing preamble + his IDENTITY + LENS + RULES (`civisJournal.js` `promptFor`) | ~20k |

- `docs/media/voices/*` (30 files, 81k): loaded by no wake. The only script mentions are a preflight existence check and a pointer string.
- About 20 solo reporter folders (1–3k for the three files) hold a name, a beat and pointers to the voice file and a bag file. The cron writer's tools are canon_search, citizen_lookup, sheet_read, dossier_read, memory_recall, memory_note, canon_recall: none opens a path.
- CLI-era content in the files the city-hall wakes load whole (count of file paths / tool words / build notes in IDENTITY+LENS+RULES): the four project directors 23–27 / 12–15 / 16–33; Baylight 26 / 15 / 27; Mayor 6 / 13 / 0; council seat IDENTITY files 0 / 0 / 0–1.

## Findings (current read, after Run 2)

| Wake type | Read | Evidence | Not tested |
|---|---|---|---|
| Citizen daily | Works from the sheet as is; the written file adds nothing visible | Run 1: Vinnie Keane with and without his 300 characters, 2 runs each, the same man; Kai Marston's own daily wake reads as a person with no written file | More citizens; a low-record citizen |
| Work wake | The work is not defined: the wake hands project status and no moment, so the model picks its own genre | Run 1: 5 of 9 runs answer someone who is not there; sheet line alone gives three different things in three runs | Whether naming the moment (end of the workday, their own page) fixes it; the builder's call, the frame was removed 2026-11-13 |
| Work wake | A written line about what a person produces is acted out as an order | Run 1: "You write memos" → a formal memorandum to an invented committee 3 of 3, with invented dates | A written part holding only who they are and how they decide |
| City hall (weekday + Sunday) | The role is understood from one sheet line; the written files change nothing visible in the act or the voice. The voice rides the seat's own page memory and the packet | Run 1: Mayor, same move from 20,959 / 175 / 701 characters. Run 2: Tran weekday, 9 of 9 the same hold, no move; Rivers Sunday, 9 of 9 the same four positions, her own earlier lines returning word for word from her page ("the first rung", "done telling East Oakland to wait") in all three versions | A project director's Sunday step (37–46k files); the live retry and evidence loop |
| City hall (weekday + Sunday) | No invented figure and no position stated as a result, in any version. What is wrong in a statement was wrong in what the seat was handed | Run 2: 18 of 18 runs, 0 figures outside the handed text (the script's own `ungroundedNumbers`), 0 votes stated as passed. "D3 East Oakland" (G-EC48) sits 7 times in Rivers's packet and comes back in every run; Tran's "Baylight is complete" is the hand-closed tracker row | — |
| Work wake / offices | A position stated as a result | The Thursday 2026-11-12 work-wake read, 3 of 12 offices (plan §Acceptance). It did not reproduce in 27 city-hall runs on any boot, so it sits with the work wake, the one wake that hands no task | A work-wake run built to isolate it |
| Reporter write | The assignment and its quotes decide the story; the written background decides how it is told | Run 1: Kai Marston, four versions, the same story and quotes; the written part shows at the edge (opens on a room). Run 2: Tanya Cruz ×3 each: today's files and the sheet line alone both give long atmospheric prose (305–607 words: "landed like a quiet glove drop"); the written part gives her dispatch 3 of 3 (265–327 words, one-line paragraphs, last names) | The written part under the full harness; a civic reporter |
| Reporter write | The thin folder a reporter wakes with today adds nothing over the sheet line | Run 2: Tanya A-light ×3 against B ×3, the same register | — |
| Reporter write | The background written for a reporter never reaches them today | Code read above | — |

**The worker shape that held (Runs 3–4):** a citizen off the sheet, with its page memory, handed the whole of its own records, woken by a question from a named seat. The police chief run this way answers from his sheet and says what it does not show. The directors today have none of the last two: four status lines, and no question.

**The one mechanism under all of it:** a written line about how a person does a thing is acted out. For a reporter that is the voice (Tanya's short lines). For a worker it becomes the task (Webb's memos). Where the wake hands a full task (city hall), the written file is drowned by it.

**Standing notes for any template:** the sheet owns age, home, role, temperament and current state (G-EC52: a written file gives Webb as 52, Laurel; the ledger says 42, Downtown). A written part, where one is kept, holds who the person is and how they decide; nothing the sheet or the engine moves, and nothing about the form of what they produce.

## Workers: the builder's design, and what is built (code read 2026-11-13)

**Builder (2026-11-13):** "the workers are meant to be the agents that are called upon for the data on its job, so a baylight distric worker is the agent that harness is that project … a worker cron is meant to be a tool call in a sense, if the mayor has to speak on the baylight district this agent can annswer the ask so the mayor isnt chasing tool calls, police chief same with crime data, crime events so if a council member needs that its a tool call to the police chief … the mayor and council memebers use these workers to do their jobs".

| The design | What is built |
|---|---|
| A worker is called with an ask from the Mayor or a council seat and answers from its project or data | A worker wakes alone on a clock (Tue / Thu 20:18, `cron-work-wake.js`), is handed its project's status lines, and writes a reflection to its own page, one `Reflection_Intake` row and a `work` move. No one asked it anything |
| The Mayor and council get the worker's answer while they are doing their own work | They are handed one clipped line a worker from its last diary entry, a Cycle old (`buildCivicOfficeSlice.js` `loadWorkingCity` → the pack's "working city" block; C115 packs carried C114 lines) |
| Any seat can ask any worker | One asker, once a week: Mara Vance's directive question to a project office on Sunday, answered in `maraAnswer` and filed as an `answer` move (`maraProjectAsk`, `maraAnswerContract`) |
| The ask replaces the seat chasing data itself | A seat can request stored data mid-wake (`readRequests`: event, district, project, budget, prior → `civicBrief.js` `readBriefEvidence`); it returns the seat's own snapshot, not a worker's answer |

- The parts an ask-and-answer path would stand on exist: the `answer` move and its contract (Mara), the mid-wake request round in the datawake loop, the worker packs and their project nodes.
- Run 1 fits the design: with no asker, 5 of 9 worker runs answered one anyway ("Understood — status noted. Here's where the queue actually stands").
- The police chief holds a deciding seat on the weekday rota (patrol strategy) and is not on the work-wake registry (builder ruling 2026-09-16, registry `_comment`).
- **What the seats are fed (`loadWorkingCity`):** the newest `work` row a worker has in `Reflection_Intake`, its excerpt cut to 110 characters, one line a worker. Only project ids and `CHIEF-*` offices pass the filter: the C115 packs carry the four project directors (Soria Dominguez, Chen-Ramirez, Tran-Muñoz, Webb). Ramos (STAFF-BAYLIGHT), the DA, the medical examiner and the EMS director write work wakes that no seat is handed.
- **A fed figure that is not on the record:** Webb's C114 line handed to every seat reads "One hundred fifteen households paid out". The INIT-001 tracker row holds no household count of 115, 79 or 36; its only household count is "2 household grants, $81,188" (C109), beside $400K a Cycle and the 23-day standard. His page readback carries the 115 / 79 + 36 lines back to him each wake. Where the figure first appeared is not traced.
- **The police chief today (weekday datawake, C112–C115):** C112 an `answer` to Mara's ask (a co-response memo "filed"); C113 and C114 a holding statement, no move; C115 a holding statement and `patrol: balanced`. The `patrol` move is a lever, not color: the week's close carries it to `World_Config.patrolStrategy`, read by the crime update at the next fire (three settings: balanced, suppress_hotspots, community_presence). His statements print raw readings ("Fruitvale at 0.67", "CrimeIndex"). No seat can put a crime question to him.

## Worker inventory (read-only pull 2026-11-13, C115)

**Builder (2026-11-13):** "before we move too fast we have a set template for workers based on the police chief? … the police chief isnt getting all his data and/or tools to access the data, its memory store, past decisions promises? so we need to identify who are the workers and that fit to this template?"

Sources: `scripts/civic-office-map.json`, `scripts/work-wake-packages.json`, `output/simulation_ledger_snapshot.jsonl`, `output/beats/{Initiative_Tracker,Crime_Metrics,Hospital_Ledger,Judicial_Ledger,Reflection_Intake}.jsonl`, `output/cron-civic/moves/moves_c112–c115.jsonl` (151 moves), `output/mara-directives/promises.jsonl` (8 rows), each page's newest 60 docs (`lib/citizenPage.js` `recentPage_`).

| Worker | Sheet role | Wakes today | Records that are theirs | Handed of them today | Page (newest 60) | Decisions on record | Promises on record |
|---|---|---|---|---|---|---|---|
| Rafael Montez, police chief (POP-00136) | Police Chief, Tier 2 | weekday seat rota | `Crime_Metrics`: 22 neighborhoods × 13 columns | his pack; no `ResponseTimeAvg`, `ClearanceRate` (G-EC56) | 33: 19 statements, 9 press, 1 work, 4 daily | 3 `answer`, 1 `patrol` | 0 |
| Marcus Webb, Stabilization Fund (POP-00790) | OEWD Program Director, Tier 3 | Tue diary; Sunday step when addressed | INIT-001 row: 36 filled fields, $21.0M of $28M left, 1,904 characters of milestone notes | 4 status lines | 44: 29 statements, 8 work, 4 press, 3 daily | 6 `work` | 0 |
| Vanessa Tran-Muñoz, OARI (POP-01021) | OARI Program Director, Tier 2 | Tue diary; Sunday step | INIT-002 row: 36 fields, $11.06M of $12.5M left | 4 status lines | 50: 26 statements, 8 work, 8 press, 8 daily | 6 `work` | 0 |
| Bobby Chen-Ramirez, Health Center (POP-00792) | Health Center Project Director, Tier 3 | Thu diary; Sunday step | INIT-005 row: 39 fields, $15.9M of $45M left | 4 status lines | 41: 22 statements, 8 work, 6 press, 5 daily | 6 `work` | 0 |
| Elena Soria Dominguez, Transit Hub (POP-00791) | Transit Hub Planning Lead, Tier 3 | Thu diary; Sunday step | INIT-003 row: 25 fields, $230M untouched; phase reads `complete` (hand close, plan §Task 8) | 4 status lines | 42: 20 statements, 8 work, 10 press, 4 daily | 6 `work` | 0 |
| Keisha Ramos, Baylight (POP-00041) | Director, Baylight Redevelopment Authority, Tier 2 | Thu diary; Sunday step | INIT-006 row: 30 fields, $2.1B untouched; phase reads `complete` (hand close) | 4 status lines | 46: 22 statements, 8 work, 6 press, 4 conversation, 6 daily | 6 `work` | 0 |
| Clarissa Dane, district attorney (POP-00143) | District Attorney, Tier 2 | Tue + Thu diary | none of her own: `Judicial_Ledger` holds 0 rows; she is handed the chief's sheet | top five violent lines + her office line | 44: 13 press, 9 work, 9 show, 4 debate, 4 statements, 5 daily | none | 0 |
| Priya Narang, EMS director (POP-00141) | EMS Director, Tier 4 | Tue + Thu diary | `Hospital_Ledger` admissions: the tab holds 3 rows | admissions + cause queue | 23: 11 press, 10 work, 2 show | none | 0 |
| Jonas Patel, medical examiner (POP-00142) | Medical Examiner, Tier 4 | Tue + Thu diary | `Hospital_Ledger` deaths: the same 3 rows | deaths + cause queue | 17: 11 work, 4 press, 2 daily | none | 0 |

- **Memory handed today:** the chief gets his last six statements (`officeWall.loadPositionWall`, CIVIC docs only), not his press, work or daily docs; the diary workers get their own page readback (`loadOwnPageReadback`).
- **Past decisions handed today:** a seat's pack carries its last move (`game.lastMove`); the full move ledger is not handed to anyone.
- **Promises:** Mara's record holds 8, all the Mayor's and council seats'. No worker has one. Mara addresses the five directors but the chief is not on her list.
- **Tools:** no worker has one. A weekday seat can request stored records from its own snapshot (`readRequests`).
- **Not workers yet:** 21 offices in the map have no agent (fire chief, city manager, chief of staff, public defender and 17 more); the EMS director and medical examiner among them run on inline registry packs.

## Templates — where each type stands (2026-11-13)

**Builder (2026-11-13):** "before we move to fine tune the workflows should we make sure our agent templates are set? … we may 'worker' , 'council/mayor', 'citizens' 'gates/rhea'?"

| Type | Who | What the runs support | State |
|---|---|---|---|
| Citizen | every ledger citizen on the daily wake | nothing written; the sheet and the page | tested (Run 1); two wake-line defects logged (G-EC53, G-EC54) |
| Council / Mayor | ten elected seats | one sheet line + page memory + their pack; the written files change nothing visible | tested (Runs 1–2, 27 runs); what remains is the data they are handed, not the boot |
| Worker | the nine above | sheet line + page memory + the whole of their own records + past decisions; the task is a question from a named seat; nothing written about how they talk or what they produce | shape tested on one worker (Runs 3–4); not written down as a template; fit per worker in the table above |
| Reporter | the newsroom | sheet line + a short written background + the assignment | tested on two reporters (Runs 1–2); source text is the 30 voice files no wake loads; harness owned by pipeline.111 |
| Gate | Rhea, the city clerk, the final arbiter | — | not tested. A gate is handed rules to check against (Rhea: her identity and rules files, about 30k, `cron-rhea-gate.js`; the clerk: `readPersonaDir('city-clerk')`); whether the rules or the persona carry the check is unmeasured |

Outside the four: Mara (asker, own memory and tools, built under civic.47 M1), Varek's journal, Mags's reflections, the show's pilots.

## Runs

### Run 1 — 2026-11-13, C115, engine-sheet

- **Versions:** A = what wakes today; B = the sheet line alone (name, age, role, hood, temperament); C = the sheet line + a short written who / how they decide (or work) / how they talk, drawn from the agent's own existing file. Reporter also run as A-light (today's files, lightest harness) so B and C compare against the same harness.
- **How:** real entry points in their no-write modes: `citizen-wake.js --dry-run --pop`, `cron-work-wake.js --dry-run --pack`, `scripts/testReporterWrite.sh` (live and light). Boot text swapped by a `--require` preload that substitutes named files in memory; no repo file changed. The Mayor's datawake has no model-calling dry mode: rebuilt from exported `buildPack` + `datawakeUserPrompt` + `officeWall.injectBlockForHolder`, one call on her own model, no retry or evidence loop.
- **Nothing written** to a page, a sheet or the live folders. Reporter pieces sit in `output/test-shell/20261113-21*`.
- **Raw outputs:** `output/engine-sheet/2026-11-13-boot-three-way.md`.

| Wake | Agent | Runs | A — today | B — sheet line | C — sheet + written |
|---|---|---|---|---|---|
| City hall datawake | Mayor Santana, kimi-k3.1-pro | 1 each | `work` on INIT-015; statement prints the raw readings; $0.051 | Same move; the plainest statement ("I am not going to govern by the prettier number"); $0.027 | Same move; prints one raw reading; $0.035 |
| Citizen daily | Vinnie Keane, deepseek-v4-flash | 2 each | The quiet after the game, Amara, the academy | The same | n/a — the loader takes bolded phrases only |
| Work wake | Marcus Webb, deepseek-v4-flash | 3 each | "From the desk of" memo; two replies opening "Understood" | One line ("Let me pull up the council calendar"); a private reflection; a speech to an unseen "you" | MEMORANDUM to an invented council committee, 3 of 3 |
| Reporter write | Kai Marston, haiku-5.5 | 1 each | 930 words, cites earlier coverage by cycle number; A-light 778 words, ends on the door | 765 words, first person, opens on a flyer, calls a fellow reporter a teammate | 783 words, opens in a room (toner, radiator, light) |

- **Gap log:** G-EC52 (written file contradicts the ledger), G-EC53 (a journalist told "not a writer"), G-EC54 (a wake question carrying the whole temperament list).

### Run 2 — 2026-11-13, C115, engine-sheet

- **Builder:** "go but make sure the council is [not] writing to anything live, its imperative dry runs dont enter canon".
- **Write guard:** a `--require` preload ahead of every script. It refuses and logs any file write outside the scratch folder (reporter runs: the test-shell folder too), any network call that is not a read or the model call (Supermemory: search, list, fetch; Sheets: GET; OpenRouter: chat), and any child process other than a guarded node or grep. Self-test before use: a page add, a sheet append and update, a live-log append, a repo file write, a shell command, a webhook post, all refused.
- **Council harness:** the script's own `buildPack` + `datawakeUserPrompt` (weekday) or the seat's C115 pending-decisions packet + `outputContract` (Sunday hearing, the same assembly as `hearingSeatPrompt`); page memory by `officeWall.loadPositionWall` (read only; the pointer-ensuring step is left out); the seat's own model; one call, no retry or evidence loop. Figures checked with the script's `ungroundedNumbers` over the whole statement text.
- **Guard result:** council 18 runs — 0 refused, 18 model calls, 234 memory reads, no sheet call, no file write outside scratch. Reporter 12 runs — 0 refused, 22 model calls, 30 memory searches, file writes only inside `output/test-shell/`. Guarded citizen dry runs (to read the sheet line of Tran, Rivers, Cruz) — 21 log appends refused (below). No live file changed in the window except crons and daemons (mtime sweep).
- **Raw outputs:** `output/engine-sheet/2026-11-13-boot-three-way-run2.md`.

| Wake | Agent | Runs | A — today | B — sheet line | C — sheet + written |
|---|---|---|---|---|---|
| City hall datawake | Leonard Tran, D2, gpt-6-luna | 3 each | Holds on Baylight (reads the row as complete), no move, 3 of 3 | The same, 3 of 3; one run prints a raw reading and the initiative id | The same, 3 of 3 |
| Sunday hearing | Janae Rivers, D5, deepseek-v4.1-flash | 3 each | Four statements: the East Oakland briefing, the apprenticeship gap analysis, yes on Grand Lake with the conditions, the D5 complaint; one run says "the engine flags" (the word is in her packet) | The same four, the same positions | The same four, the same positions |
| Reporter write | Tanya Cruz, grok-4.3 | 3 each (+3 A-light) | 515–607 words, scene prose; prints record strings ("8229AB and 71.4WAR") and cycle labels | 367–447 words, scene prose | 265–327 words, dispatch: one-line paragraphs, last names |

### Run 3 — 2026-11-13, C115, engine-sheet: one ask

- **Builder:** "sure try it" (a council member asks the police chief what crime is doing in their district; he answers from his data).
- **How:** two calls under the write guard. Rose Delgado (D3) wakes on her sheet line + page memory + her own weekday pack and is told only that she can put one question to the chief. Rafael Montez wakes on his sheet line + page memory + his own weekday pack, then her name, seat, hoods and question. No output form, no instruction on content. Each on their own model (deepseek-v4.1-flash). His answer three times. A first pass ran without page memory (harness fault) and gave the same shape; both are in the raw file.
- **Guard result:** 0 refused in the ask runs; the two guarded citizen dry runs that read the sheet lines had 14 log appends refused.
- **Her question:** San Antonio against Fruitvale, from her own readings (0.73 against the city's 0.647, property 43 against 39.5, six incidents): how many calls came from the commercial blocks of one corridor, the response time there against Fruitvale, and whether his data would support weighting patrols toward it.
- **His answers, 3 of 3:** every figure he states is in what he was handed (`ungroundedNumbers` empty). He says he does not hold beat-level counts or response times and will not make them up; he confirms her reading of the two neighborhoods; he says "balanced" is a default nobody tested; he commits to a records pull.
- **What the sim holds against that:** `Crime_Metrics` carries `ResponseTimeAvg` and `ClearanceRate` for every neighborhood (C115: San Antonio 11.7 and 0.25, Fruitvale 10.7 and 0.18). The chief's pack holds neither field (0 mentions), so half of her question had an answer on the sheet that he was never handed. The beat-level half has no record anywhere (`Judicial_Ledger` 0 rows). His promised records pull has nothing to be filled from.
- **Read:** asked a question, both wake as themselves and neither invents. The ask shows exactly which columns the worker is missing. Her question names "the East 14th corridor", a street that is in no city record (color, and a real-world name).

### Run 4 — 2026-11-13, C115, engine-sheet: the ask inside a seat's wake

- **Builder:** "lets see how a council wake call the worker agent and gets an answer, ultimately these seem to be workflows right ?"
- **How:** Delgado's real weekday prompt (`buildPack` + `datawakeUserPrompt`, her page memory, her sheet line as the system turn) with one paragraph added in the shape of the existing evidence-read offer: who she can ask (the police chief; the four project directors and the Baylight director), what records each holds, `{"ask":{"to","question"}}`, asking is her choice. On an ask the harness wakes the worker (sheet line off the ledger and dials, page memory, the whole of its own records: for the chief his pack + every `Crime_Metrics` row; for a director the full tracker row), hands back "ANSWER FROM …" and asks for her final JSON. Three runs, write guard on, 0 refused. A full exchange cost $0.002.
- **Results:**

| Run | Asked | The chief's answer | What she then did |
|---|---|---|---|
| 1 | The chief: response time, clearance, any pattern in San Antonio | 11.7 minutes, clearance 0.25 with a warning that six incidents make it a small-number figure, pressure 1.12 tied with East Oakland, no hotspot flag, "I cannot see the pattern from here, only the load". One slip: calls 11.7 "the slowest in the city" (Rockridge is 11.8) | Proposes a **safety** package for San Antonio built on the response load; carries the "slowest" slip into her statement |
| 2 | The chief: spike or trend, response and clearance against the rest of D3 and the city | Plateau, not a spike; 11.7 "second-slowest, behind Rockridge at 11.8"; Fruitvale 10.7; average about 11.1 (all correct against the sheet) | No proposal; holds the chief to the gap between her two neighborhoods |
| 3 | Nobody | — | Proposes an **economic** corridor package for San Antonio |

- **Figures:** every figure in every answer and every final statement is in what that person was handed or told (`ungroundedNumbers` empty, 5 of 5 texts). Checked by hand against `Crime_Metrics`: average 11.14, best clearance San Antonio 0.25 then KONO 0.24, pressure East Oakland and San Antonio 1.12, incidents 4–8: correct; the one wrong line is run 1's "slowest".
- **The answer changed the act:** asked, she files under safety on the response load; not asked, she files under economic on the same neighborhood.
- **A defect in the test's shape:** in both asking runs she spent an `answer` move replying to the chief, under a directive id her pack does not hold (`CONF-115-civic-office-council-d3`; no Mara question is in her C115 pack). The live wake discards such a move. The exchange needs its own end, or the seat spends its turn on a reply nobody receives.
- **Read:** a seat's wake with an ask in it is a short chain: the seat wakes, may ask, the worker wakes and answers, the seat decides. The weekday wake already runs one side-step of this shape (the evidence-read round), and the Sunday chain is a chain already (Mayor opens, seats speak, Mayor rules, clerk closes).

### Dry-run safety — what Run 1 left, checked 2026-11-13

- **Canon, pages, sheets:** nothing. No ingest path reads `output/test-shell/`, `output/engine-sheet/` or `docs/research/` (daily ingest and delivery read `output/cron-compare/`; the daily show reads `cron-compare` and `exchanges`; the reporters' search walks a fixed shelf list in `lib/mags.js` that holds none of them — a search for a dry-run phrase returns none of these files). The Mayor's memory read in Run 1 went through the pointer-ensuring call; her pointer already exists, so it wrote nothing.
- **Two logs took lines:** `citizen-wake.js --dry-run` appends to `logs/citizen-wake-offered.jsonl` before its dry-run exit (7 lines from Run 1, lines 274–280, daypart `evening`; 8 older `evening` lines from earlier sessions' dry runs sit beside them) and to its own log; `cron-work-wake.js --dry-run` appends to its own log (marked `dry=true`). The offered log's one reader is `extractBondsFromWakes.js`, run by hand, joined on citizen, Cycle and daypart; the scheduled wakes write morning, midday, night, so an `evening` line matches no page. Left as they are; G-EC55. **Builder ruling 2026-11-13:** "if dry runs leak but are in the current cycle and is relevant to the sim it can stay".

### Next runs (not started; each needs the builder's go)

- Work wake: the three versions with the moment named, if the builder wants the moment named; and a written part holding only who they are and how they decide.
- City hall: a project director's Sunday step, the one place the 37–46k files load.
- Reporter: the written part under the full harness; owned by pipeline.111.
