---
title: Boot templates — test runs and findings
created: 2026-11-13
updated: 2026-11-14
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
  - "[[../reference/AGENT_BOOT_TEMPLATES]] — the templates drawn from these runs (draft); this file stays the evidence log"
  - "[[../plans/2026-11-10-stop-puppeting-the-newsroom]] — pipeline.111 (research-build), owns the reporter harness"
  - "`output/engine-sheet/2026-11-13-boot-three-way.md` — Run 1 raw outputs, every version in full"
  - "`output/engine-sheet/2026-11-13-boot-three-way-run2.md` — Run 2 raw outputs (council seats, second reporter), every version in full"
  - "`output/engine-sheet/2026-11-13-ask-dry-run.md` — Run 3 raw outputs: a council member's question to the police chief and his answers"
  - "`output/engine-sheet/2026-11-13-seat-asks-worker-dry-run.md` — Run 4 raw outputs: a council seat's weekday wake with the ask step inside it"
  - "`output/engine-sheet/2026-11-14-director-ask-dry-run.md` — Run 5 raw outputs: a council member's question to the Stabilization Fund director and his answers; harness `2026-11-14-director-ask-dry-run.js` beside it"
---

# Boot templates: test runs and findings

**Builder (2026-11-13):** "review the written agents, voices … ensure they boot the agent into its character … wake in their persona/identity, with access to their memory store … without being told what to say, having a template we know works is probably better than 40 different write ups. is less more? is more more?" · "the plan will be to figure out the template or templates needed, we dont have to make the mayor template be the same as citizen voice, there can be different templates depending on the cron type" · "save these findings and make sure the plan points to it as a test run and we can continue to notate the findings".

**Verdict: adopt** as the evidence behind pipeline.110 Task 9. **Ignited plans:** [[../plans/2026-11-10-role-citizens-wake-as-themselves]] Task 9; [[../plans/2026-11-14-city-workers-answer-the-seats]] (civic.49; first written as civic.47 W1).

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
| Work wake / offices | A position stated as a result | The Thursday 2026-11-12 work-wake read, 3 of 12 offices (plan §Acceptance). It did not reproduce in 21 city-hall runs (Mayor 3, Tran 9, Rivers 9) on any boot, so it sits with the work wake, the one wake that hands no task | A work-wake run built to isolate it |
| Reporter write | The assignment and its quotes decide the story. Whether a short written background changes how it is told is **not established** | Run 1: Kai Marston, four versions, the same story and quotes. Run 2: Tanya Cruz ×3 each, prose words with the intake footer left out — today's files, full harness 470 / 470 / 375; today's files, lightest harness 438 / 290 / 173; sheet line 310 / 235 / 272; sheet line + written part 189 / 192 / 156. The written-part runs are shortest on average, but every version still carried her hard-coded stance line ("sideline dispatch … Short.") and her bag file (`cron-desk-writer.js:1258-1282`), so the written part was never alone; two of its three runs use full names and multi-sentence paragraphs (agy review finding 1) | A rerun with the stance line and bag out (pipeline.111's harness); a civic reporter |
| Reporter write | The thin folder a reporter wakes with today adds nothing over the sheet line | Run 2: Tanya A-light ×3 against B ×3, the same register | — |
| Reporter write | The background written for a reporter never reaches them today | Code read above | — |

**The worker shape that held (Runs 3–5):** a citizen off the sheet, with its page memory, handed the whole of its own records, woken by a question from a named seat. The police chief run this way answers from his sheet and says what it does not show. The directors today have none of the last two: four status lines, and no question. Run 5 put one director (Webb) on the same shape: 3 of 3 answers from his row, no figure off it, no memo; his row's build notes come back as the world (G-EC62).

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
- The police chief holds a deciding seat on the weekday rota (patrol strategy) and is not on the work-wake registry (builder ruling 2026-09-16, registry `_comment`). He still wakes on Thursdays: `cron-work-wake.js` `autoPackages` builds an auto office pack for every agented office outside the registry (the chief, the Mayor, the council seats, Okoro) on a 700-character cut of its IDENTITY file (agy review finding 6).
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
| Jonas Patel, medical examiner (POP-00142) | Medical Examiner, Tier 4 | Tue + Thu diary | `Hospital_Ledger`: 3 rows, all recovered, 0 deaths; the one death on `LifeHistory_Log` (C114) is not read by his node | deaths + cause queue | 17: 11 work, 4 press, 2 daily | none | 0 |

- **Memory handed today:** the chief gets his last six statements (`officeWall.loadPositionWall`, CIVIC docs only), not his press, work or daily docs; the diary workers get their own page readback (`loadOwnPageReadback`).
- **Past decisions handed today:** a seat's pack carries its last move (`game.lastMove`); the full move ledger is not handed to anyone.
- **Promises:** Mara's record holds 8, all the Mayor's and council seats'. No worker has one. Mara addresses the five directors but the chief is not on her list.
- **Tools:** no worker has one. A weekday seat can request stored records from its own snapshot (`readRequests`).
- **Not workers yet:** 21 offices in the map have no agent (fire chief, city manager, chief of staff, public defender and 17 more); the EMS director and medical examiner among them run on inline registry packs.

## Office holders' role on the citizen ledger (two read-only traces, 2026-11-14)

**Builder (2026-11-14):** "send opus sub-agents out to answer this so we can correct it". Three read-only sub-agents under the write guard: the record, the readers and writers, and the history. All three are in. Key citations spot-checked by engine-sheet (edition lines, the turnover writer, the intake door, two snapshot commits). Nothing has been written to a sheet.

**What the record supports**

| Holder | Office sheet | Published record and canon | Ledger `RoleType` now |
|---|---|---|---|
| Ramon Vega (POP-00042) | COUNCIL-D4; Notes "Council President" | "Council President Ramon Vega (IND, D4)" (`editions/cycle_pulse_edition_100.txt:87`, and about 30 lines C75–C100); `docs/canon/INSTITUTIONS.md:382` D4; `lib/districtMap.js:59` | City Council President - D1 |
| Marcus Osei (POP-00036) | STAFF-DM-ECON, Deputy Mayor (Econ Dev), active | Deputy Mayor in every published line; never a council member. Standing split: C72 hospitalized; C91 "permanently reassigned the entire Economic Development portfolio … He's gone" (`cycle_pulse_edition_91.txt:263`); C92 index "Former Deputy Mayor"; C95 "Deputy Mayor recovering"; C107 "recent recovery" (`cycle_pulse_c107.txt:224`) | City Council Member |
| Denise Carter (POP-00501) | COUNCIL-D1 | D1 throughout | City Council Member |
| Janae Rivers (POP-00043) | COUNCIL-D5; Notes "Progressive Caucus Leader" | D5 throughout | City Council Member |
| Elliott Crane (POP-00044) | COUNCIL-D6; Notes "Business Caucus Leader" | D6 throughout | City Council Member |
| Rose Delgado (POP-00503) | COUNCIL-D3 | D3 throughout | City Council District - D3 |

- **How the strings got this way:** in the ledger snapshot of 2026-08-16 (04b11e223) every seat read plain "City Council Member", Vega "City Council President", Delgado "City Council District 3". By 2026-08-19 (2f4947251) four seats had gained "- D<n>", Delgado had become "City Council District - D3" and Vega "City Council President - D1". No script in the repo writes these suffixes. Osei reads "City Council Member" in every snapshot back to 2026-08-12.
- **Two wordings are in play.** The hand pattern on four seats: "City Council Member - D<n>". The engine's own: at a seat turnover `turnoverLedger_` writes the office Title word for word as the new holder's role and "Former <Title>" on a demotion (`phase05-citizens/updateCivicApprovalRatings.js:1371, 1376`; pinned by `scripts/civicApprovalCeiling.test.js:704-706`). 29 of the 39 holders' strings differ from their office Title; the six above are the ones that disagree in meaning.

**History of the six values** (third trace; the January copy spot-checked by engine-sheet)

| When | Source | Osei | Vega | Carter | Rivers | Crane | Delgado |
|---|---|---|---|---|---|---|---|
| 2026-01-21, C75 | `40f266776:Simulation_Ledger_Cycle_75.txt` | Deputy Mayor (Econ Dev) | Council President | Councilmember D1 | Progressive Caucus Leader | Business Caucus Leader | Councilmember D3 |
| 2026-02-25, C84 backup sheet | live read of the February backup | Citizen | Citizen | Citizen | Citizen | Citizen | City Council District 6 |
| mid-March through 2026-08-16 | practice copy; `LifeHistory_Archive` occupation tags; snapshot 04b11e223 | City Council Member | City Council President | City Council Member | City Council Member | City Council Member | City Council District 3 |
| from 2026-08-19 | snapshot 2f4947251; live | City Council Member | City Council President - D1 | City Council Member | City Council Member | City Council Member | City Council District - D3 |

1. **January–February: the real titles were overwritten with "Citizen".** The advancement intake of that time defaulted a blank role to "Citizen" and wrote it onto the existing row (`processAdvancementIntake.js` at d3b9cbdf1, lines 320 and 337); the media-usage router queued these citizens with the role blank. Logged as a bug and fixed later (`docs/engine/archive/ENGINE_REPAIR.md:89`).
2. **Late February (S68): a repair pass wrote generic titles back.** Verified for Delgado ("District 6 → District 3", `docs/engine/LEDGER_AUDIT.md:68` at 6a2b05e). For the other five the window is verified and the writer inferred: the same pass, made by direct API calls with no script saved (`docs/engine/LEDGER_REPAIR.md:12, 155`). It wrote "City Council Member" for all of them, which dropped Osei's Deputy Mayor title and Carter's district.
3. **2026-08-16 to 08-19: the district suffixes.** Four seats gained "- D<n>"; Vega was given D1, Carter's seat; Delgado was reformatted. No code at HEAD or at the 08-17 deploy builds such a string, and no commit records the edit. Inferred: hand edits in the browser during the ledger true-up of those days. Who and when would need the Drive revision list for those dates, which the API no longer returns.

- **A fourth writer that could undo a correction** (corrects the reader/writer trace): the civic-slots branch of the career engine skips only GAME rows; a council member with a climbing posture and an initiative slot at a business in another field would get a new employer and a generic field role (`runCareerEngine.js:1645-1665, 1843-1857`). It has never fired on these six.
- No row naming any of the six is queued in the live `Intake` or `Advancement_Intake1` tabs today.

**What a correction would change**

- **Engine logic:** nothing on live data. The one parser that reads council roles off the ledger is a fallback that runs only when the office sheet cannot be read (`civicInitiativeEngine.js:978-1104`). Pay and career field hold as long as the wording keeps a civic keyword (`generationalWealthEngine.js:861`).
- **Text:** every place the role is passed through: the daily wake's identity line (Vega can be told today he is "a City Council President - D1"), neighbour lists, interviews, the Discord voice brief, the desk and civic slices, Rhea's fact sheet (which today corroborates the wrong district), the daily news headings, the dashboard.
- **A second copy:** `Employment_Roster.RoleType` carries the same six strings; desk slices read it. A ledger-only fix leaves them.

**What could undo a correction**

1. The seat-turnover writer, the next time that seat changes hands: it writes the Title word for word. Staff offices (Osei's) never enter it.
2. The two intake doors: an intake row carrying a role for that name overwrites it (`godWorldEngine2.js:1638-1640`; `processAdvancementIntake.js:912-922`). Neither exempts an office holder.
3. A weekly fire in flight: the engine writes the whole ledger back from the copy it read at the start (`commitSimulationLedger.js:25-38`).

**How a correction is made** (precedents 31c5cc4d6, 9b74fa7ce): one targeted cell per row through `lib/sheets.js` `updateCell`, the row found by POPID at write time, outside a fire, each cell read back, the snapshot refreshed, and the six `Employment_Roster` cells given the same write. Six rows, on the builder's go; no sweep.

**The builder's calls before any write:** (1) whether "Council President" stays in Vega's string; (2) Osei's standing: Deputy Mayor, or Former; (3) the wording: "City Council Member - D<n>" (then the turnover writer is changed to write the same) or the office Title as the engine writes it today.

**Corrected 2026-11-14.** Builder, verbatim: "Repair to its state from January, use the wording the engine uses." Read as: each holder back in the office the January record gives them, in the string the engine itself writes at a seat turnover, the office Title on `Civic_Office_Ledger` word for word. Twelve cells, each found by POPID at write time, the old value checked first, each read back (`output/engine-sheet/2026-11-14-office-roles-before-after.json`); ledger snapshot refreshed.

| Holder | Was | Now (`Simulation_Ledger` and `Employment_Roster`) |
|---|---|---|
| Marcus Osei | City Council Member | Deputy Mayor (Econ Dev) |
| Ramon Vega | City Council President - D1 | City Council District 4 |
| Denise Carter | City Council Member | City Council District 1 |
| Janae Rivers | City Council Member | City Council District 5 |
| Elliott Crane | City Council Member | City Council District 6 |
| Rose Delgado | City Council District - D3 | City Council District 3 |

- **Left for the builder:** January carried titles the engine's wording has no place for: Vega "Council President", Rivers "Progressive Caucus Leader", Crane "Business Caucus Leader". They remain on the office sheet's Notes and, for Vega, in his ledger bio; they are not in the role string. Tran, Ashford, Chen and Mobley were brought to the same form the same night (builder: "Make the 4 all engine safe and accurate"): "City Council District 2 / 7 / 8 / 9", eight more cells, read back (`output/engine-sheet/2026-11-14-office-roles-before-after-2.json`). All nine seats now read the office Title.
- **One engine path does not know its own wording (G-EC61):** the fallback that reads the council off the citizen ledger when the office sheet cannot be read counts a voter by the words "Council Member", "Council President", "Councilmember" or a caucus title (`phase05-citizens/civicInitiativeEngine.js:1021-1023`); "City Council District <n>", which the engine's own turnover writer produces, matches none. The fallback does not run on live data. Not changed: it is engine code and needs a bench run and a deploy.
- **Daily wake after the write** (guarded dry run): "You are Ramon Vega, 64, a City Council District 4 living in Lake Merritt, Oakland. People in this city know your name and what you do…"; "You are Marcus Osei, 59, a Deputy Mayor (Econ Dev) living in Chinatown, Oakland. …".

**Side findings (gap log G-EC59, G-EC60):** eight Tier 3–4 office holders match no word in the wake's station line and are told "You are an ordinary person" (Public Defender, Deputy Public Defender, Internal Affairs Lead, Court Liaison, Police Review Chair, Ombudsman, Medical Examiner, Transit Hub Planning Lead; `lib/wakePerception.js:162`). The career mover can move an office holder's employer (`runCareerEngine.js:1647-1663, 1851` excludes only the GAME clock).

## Worker memory: handed or searched (read 2026-11-14)

**Builder (2026-11-14):** "should the last 3 memories load for a worker or should it be given a search tool of its memory ? Does forcing its last 3 memories flatten them?"

- **What is handed today.** Diary wakes: `loadOwnPageReadback` takes the newest 15 docs that are not `show`, drops `tension` / `show` / `office-position`, picks 3 by resonance score, 320 characters each (`lib/wakePerception.js:446-474`). City-hall wakes and Runs 3–5: `officeWall.loadPositionWall`, the newest 6 CIVIC docs, under a block that reads "HOOK them for continuity — do not amnesia a stance you already put on the record" (`scripts/officeWall.js:74-98`, `formatPositionWall`).
- **The chief's page, whole** (POP-00136, `recentPage_` raw, 2026-11-14): 33 docs — 19 `office-position` (CIVIC), 5 `tension` (PRESS daypart), 4 `reflection` PRESS, 1 `reflection` work, 4 `reflection` daily. The inventory's "9 press" above is the 5 tension lines plus the 4 press replies.
- **Repetition on the page.** The statement "No public safety events requiring an official statement from this office occurred this cycle. OPD operations continue uninterrupted with standard deployments and response protocols." is his whole statement at C104, C106, C107 and C109 (191 characters, identical) and the opening of C113; C114 and C115 open "No public safety event in this cycle's export requires an institutional statement from this office." Seven of 19 statements open on nothing-to-state; three of the six handed to him today are among them. His work reflection at C112 and his reflection at C114 share their first four sentences word for word but for the hood and the rate ("Look, I don't hide from the numbers. <hood> had the most incidents this cycle, and a <N>% clearance rate means we're not closing enough of them. That gap is on me and my department. I answer for it."); C115 returns to it ("that 26% clearance rate in Uptown still sticks with me").
- **Not a controlled result.** No run has compared the same question with memory handed, searched and absent. The repetition is on the page; its cause is not isolated. Earlier lines of the same kind: Webb's "115 households" (§Workers), Rivers's lines returning word for word (Run 2), Soria Dominguez writing the vote ahead off her own page (G-EC51).
- **A search of one's own page exists.** `lib/citizenPage.js` `searchPage_` (`/v3/search` scoped to the page tag); its one caller is `lib/personaProvider.js:513` (Discord). No wake calls it. Three questions put to the chief's page (2026-11-14, read-only): "response time and clearance in San Antonio against Fruitvale" 4 hits, "patrol strategy decision and why" 3, "OARI co-response hand-off" 4 — all from C102–C107, none from C112–C115, though the C114 and C115 reflections are about the clearance rate. The function's own header says search lags fresh docs and is to be paired with `recentPage_`.
- **His decisions are not on his page.** The patrol setting and the answers sit in `output/cron-civic/moves/`; a page search does not reach them.
- **The reporters' memory tool** (`cron-desk-writer.js` `toolMemoryRecall`, research-build's file): the newest 5 docs every call, plus `readPage_` (the v4 search that returns 0–1 hits, `lib/citizenPage.js:253-256`) when a query is given. G-EC64.
- **Offered, not run:** the chief on one seat question three ways under the write guard — six statements handed as today, a memory tool with two reads of his choosing (search by topic; newest entries), no memory — three answers each. Whether his model calls a tool at all is unknown until run.

## Mara's directives: what generates the questions (code read 2026-11-14)

**Builder (2026-11-14):** "Mara directives are what generate these questions and responses, you'd have to understand her agent".

- **Who she is.** Mara Vance, City Planning Director, POP-00507. One run a week after the Sunday close (`cron-civic-run.js` `runDirective`), `openai/gpt-6.1-sol` with a tool loop. Design and reviews: [[../plans/2026-10-31-civic-autonomy]] §M1.
- **What she reads.** Every office's Sunday statements and the week's weekday statements in full, the tracker, the world summary, engine HIGH patterns, her last three directives, the answers to her earlier questions, her open promise record.
- **Her tools.** `memory_recall` / `memory_note` on her own page, `canon_recall`, `citizen_lookup`, `sheet_read`, `promise_record`.
- **What she writes.** Blocks addressed to one office each (Address, Why, Acceptance, optional Promise ids) and a `## Not directing` section. C115: 10 blocks (the Mayor, D1–D5, D7–D9, the Baylight director), 5 not directed (D6 and four directors, each with her reason).
- **Who she can address.** `directiveRoster` (`cron-civic-run.js:950-962`): the Mayor, the nine council seats, the five project seats. The police chief and every other worker are not on it; `maraPromises.resolveSource` rejects an office off the roster.
- **How an office answers.** A seat: a weekday `answer` move bound to her block's id. A director: `maraAnswer` in its Sunday project output (`maraProjectAsk`, `maraAnswerContract`, `maraOnlyContract`, `cron-civic-run.js:2332-2385`); the prompt names her: "Mara Vance, the City Planning Director, asked your office this".
- **The chief's three `answer` moves** (C110, C111, C112) carry ids `CONF-105-…`, `CONF-106-…`, `CONF-107-…-civic-office-police-chief`: replies to her C105–C107 directives, from the version in which code picked the addressees. Since the M1 rebuild she cannot address him. His decisions on record are those three and one `patrol` move (C115). Her C105–C107 files are on disk (`output/mara-directives/mara_directive_c10{5,6,7}_AUTO.txt`), so each answer can be handed with the question it answered.

## Tracking what is said (read 2026-11-14)

**Builder (2026-11-14):** "This is an open gap, how to track what they are saying so they have a chance to make good on it . I proposed maybe a claude sheet ledger for these it the memory hits don't work clean". Earlier (2026-11-13): "if we run into issues on how to track things said we can consider a workbook for the crons if useful".

- **What exists.** Mara's promise record, `output/mara-directives/promises.jsonl` (`scripts/maraPromises.js`), append-only: a promise is an office's own words, checked as a substring of its public statement file; it stays open and in front of her each run until a status row closes it on evidence tied to that promise (a tracker move on its initiative, or the office's answer to the block that carried it). On file 2026-11-14: 8 promises, all C115 (Mayor 2, D1, D2, D3, D5, D8, D9), 0 status rows.
- **What it does not hold.** (1) Any worker off her roster. (2) An answer: only Sunday `quote` / `fullStatement` / `decision` and the weekday `statement` are sources; an answer to a seat (civic.49) is none of them. (3) The office's own view: no pack builder reads the record (`promises` appears only in the directive code), so an office meets its promise only inside a block she addresses to it. (4) A promise the sim cannot fill: the chief's "records pull" (Run 3) has no record to be made from.
- **Memory search against this need.** The page search returned nothing newer than C107 for the chief (§Worker memory); a promise made this week is in the window it misses.
- **Not designed.** Who holds a worker to his word, whether an answer counts, and whether the record is a sheet tab are the builder's; put to him 2026-11-14.

## Worker data map (two read-only agent maps, 2026-11-14, C115)

**Builder (2026-11-14):** "The thin ones the gap is the sim isn't generating enough data for them yet, if chaos cars and city level numbers aren't enough that's a separate issue that you can release a coupe sonnet sub agents to map what data exists for the worker types we have".

Two Sonnet agents, read-only: one over the tab dumps (`output/beats/*.jsonl`), `schemas/SCHEMA_HEADERS.md`, `docs/engine/SHEETS_MANIFEST.md`, `scripts/civic-office-map.json`; one over the engine (`phase*/`, `utilities/`, the stub maps, `output/world_summary_c115.md`). Their read, not re-derived here; checked by engine-sheet: the C115 `City_Treasury` rows, the `Chaos_Cars` count (5), the census columns, the transit packet block (G-EC63), `Chaos_Cars` absent from `dumpBeatTabs.js`.

**Tabs by trade (C115 dumps):**

| Trade | Tab · what it holds | Rows | Handed to that worker today |
|---|---|---|---|
| Police | `Crime_Metrics`: violent / property index, response time, clearance, incidents, levels, trend, pressure; one row a hood, overwritten each Cycle, no history; `Hotspot` blank 22/22 | 22 | part (G-EC56) |
| Police · Justice | `Care_Justice_Census` System=judicial: intakes (arrests), custody occupancy, exits, by hood and city | 288 (48 a Cycle, C110–C115) | no |
| Police · Justice | `Judicial_Ledger`: 21 columns, a tracked citizen's case | 0 | — |
| Justice · City Manager | `City_Treasury` Counterparty COURT ("24 cleared charges, fined at the hood rate", C115 $107,362), TICKETS | 6 COURT, 2 TICKETS of 19 | no |
| EMS · Medical Examiner | `Care_Justice_Census` System=hospital: intakes by type (injury, illness, heat, mental-health crisis, substance treatment), beds, exits | 1,008 (168 a Cycle) | no |
| EMS · Medical Examiner | `Hospital_Ledger` (3 rows, admits C105–C106, five source columns blank); `Health_Cause_Queue` (3, operator-triggered); `Neighborhood_Demographics.Sick` (22 hoods) | 3 · 3 · 22 | the first two |
| Medical Examiner | deaths: 1 `LifeHistory_Log` row (C114); cause is a description string; the engine's death count goes to the run log only | 1 | no |
| City Manager | `City_Treasury`: allocation, appropriations, prefunds, court and ticket revenue, balance | 19 | no agent |
| Econ Dev | `Business_Ledger` (283), `Employment_Roster` (971), `Business_Archive` (2), `Neighborhood_Demographics.Unemployed` | — | no agent |
| Community Dev | `Initiative_Tracker` INIT-001; `Community_Programs` (33, newest founded C109, no engine writer) | — | her Sunday packet |
| Planning | `Transit_Metrics` (684; 18 at C115: 8 stations, 10 corridors); `Neighborhood_Map` housing pressure, rent (not dumped); INIT-003, INIT-006 | — | her own cron |
| Project directors | their `Initiative_Tracker` row (25–39 filled fields); `City_Treasury` prefund rows for INIT-001 / 002 / 005 | 5 rows | 4 status lines |
| All trades | `Chaos_Cars`: every chaos event with vehicle, target scope, target id, outcome (5 at C115); not in the beat dump | 5 at C115 | no (G-EC58) |

**Two kinds of thin:**

- **Recorded, not routed.** The care-and-justice census (arrests, custody, hospital intakes by type and hood, six Cycles), court and ticket revenue, `Chaos_Cars`, transit, and the chief's own missing columns exist on tabs and reach no worker. No office on the map is declared for `Care_Justice_Census`, `Hospital_Ledger`, `Health_Cause_Queue`, `Transit_Metrics`, `Community_Programs`, `Household_Ledger` or `City_Treasury`; the map's `dataSources` cite world-summary sections (§crime, §health, §events, §economy) that the C115 summary does not have.
- **Not generated.** Fire (only the chaos fire engine's three outcomes and a "kitchen fire" texture line; no incident tab); emergency management (crisis arcs go to a tab the code calls a fossil; storms and floods are ripples; shock reasons are not saved); public defender, court liaison and reentry (job titles only; the census has no charge, plea or probation column); medical-examiner cause of death; planning permits, units, zoning; city-manager operations past the treasury; chief of staff, communications, legal counsel, ombudsman, internal affairs, police review chair (a roster row each).
- **`Judicial_Ledger` at 0 rows beside 24 arrests a Cycle:** every census intake is `OtherResident` (`TrackedIntakes` 0 in all 1,296 rows); the case ledger holds tracked citizens only and no tracked citizen has been arrested. The ledger is the tracked part of the city; recorded, not a defect.

**Computed and not kept (engine agent's list):** `S.crimeLag`; enforcement load, policing capacity and patrol name except as packet prose; transit alerts (`S.transitMetrics.alerts`), and the packet's TRANSIT block never prints (G-EC63); `S.chaosFriction`; the death count; `S.shockReasons`; per-hood sick / OARI-eligible / OARI-diversion counts (not census columns); a chaos row's second metric; the cargo ship after its first week (carried in state, one tab row).

## Templates — where each type stands (2026-11-13)

**Builder (2026-11-13):** "before we move to fine tune the workflows should we make sure our agent templates are set? … we may 'worker' , 'council/mayor', 'citizens' 'gates/rhea'?"

| Type | Who | What the runs support | State |
|---|---|---|---|
| Citizen | every ledger citizen on the daily wake | nothing written; the sheet and the page | tested (Run 1); two wake-line defects logged (G-EC53, G-EC54) |
| Council / Mayor | ten elected seats | one sheet line + page memory + their pack; the written files change nothing visible | tested (Runs 1–2, 21 runs: Mayor 3, Tran 9, Rivers 9); what remains is the data they are handed, not the boot |
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
| Reporter write | Tanya Cruz, grok-4.3 | 3 each (+3 A-light) | 470 / 470 / 375 words of prose (515–607 with the intake footer), scene prose; prints record strings ("8229AB and 71.4WAR") and cycle labels | 310 / 235 / 272 words of prose, scene prose | 189 / 192 / 156 words of prose; shortest on average; one run in short lines with last names, two with full names and longer paragraphs |

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

### Run 5 — 2026-11-14, C115, engine-sheet: one project director, run as the chief ran

- **Builder:** "Go on 1" (run one project director as the chief ran).
- **Who:** Marcus Webb, West Oakland Stabilization Fund (INIT-001), asked by Denise Carter, District 1 (West Oakland, Brooklyn). Both on deepseek-v4.1-flash. Webb was Run 1's work-wake subject (a memorandum to an invented committee, 3 of 3), so the same man is read with and without a question. The two hand-closed projects (INIT-003, INIT-006) were left out.
- **How:** the Run 3 and Run 4 harness, rebuilt from the saved copy (`output/engine-sheet/2026-11-14-director-ask-dry-run.js`), write guard on: 40 network calls, 0 refused, no file outside scratch. Two changes from Runs 3–4: every sheet line comes from the live daily wake's own functions (`wakePerception.buildPool` + `loadOfficeHolders` + `identityLine`, the dials for temperament), so age and the office title are in every line (review finding 4); the director's record is the live `Initiative_Tracker` row, not the beat dump. Memory is `officeWall.loadPositionWall` (six statements), as in Runs 3–4. Cost $0.006.
- **Sheet lines:** "You are Marcus Webb, 42, living in Downtown, Oakland. You hold the office of OEWD Program Director (Stabilization Fund). Your temperament: driven, hard to sit still; draws people in, deep with them; curious, open to new things; principled, plays it straight." · "You are Denise Carter, 51, living in West Oakland, Oakland. You hold the office of City Council District 1 (West Oakland, Brooklyn). Your temperament: draws people in, deep with them." The office-title code (live since 2026-11-14) had not yet run on a live wake; this is its first read on a director.
- **Part A, one ask (Run 3's shape).** She is told only that she can put one question to him and what record he holds. Her question, every figure from her own pack (West Oakland sentiment 0.41 → 0.31, retail 12.6 → 13.65, housing pressure 3.5 → 4.5, 85 sick residents, $21M left, seven Cycles at Standing): what is the path from Standing to money moving, which gate, cleared by whom; and who decides what gets bought.
- **His answers, 3 of 3:** no figure outside his record and her question (`ungroundedNumbers` empty against record + question, and against record + question + memory). By hand against the row: $21M of $28M, $400K a Cycle, the 23-day standard, $5M+ cumulative, C78, 47 checks C84–C90 under Okoro's authority, 2 household grants $81,188 at C109, INIT-008 proposed and not voted, the renewal ordinance before the council at C116: all on the row. No vote stated as passed; each answer declines to call the council's vote. He answers her, as a letter back (her question was a letter); no memorandum, no invented body.
- **Record against memory:** his newest statements say the renewal went "to C115 agenda"; the row says the council takes it at C116. He says C116, 3 of 3. The "115 households paid out" line that sits in his work docs (inventory above) does not come back: the statements loader carries no work docs, and no household count is on the row.
- **Build wording handed as the world, and repeated.** The row's milestone notes carry build notes: "economic — not playable, no Delivering gate yet; the untended clock still runs", "engine.255 wires it as the first budgeted disbursement", "the C108 retag was engine-sheet error". Her pack carries the stage reader's own strings: "Standing — no delivering gate exists for this domain yet", "FAILED — not a stage this model knows" (`lib/initiativePhaseContract.js:359,455,506`; the engine twin `phase05-citizens/civicInitiativeEngine.js:3644,3695`). She asks about "nothing in this model that lets a dollar of it actually deliver". He answers "the delivery step in this model has never been wired to it" (1), "not a 'delivering' asset in this model" (2), "an automated 'Delivering' gate in the engine" (3). Neither invents it; both were handed it. Gap log G-EC62.
- **Where the row runs out:** "who decides what gets bought" gets three answers: the charter (1), "Me" (2), his office's authorization with the council holding renewal (3). The row names no decider past "under Deputy Mayor Okoro's authority C84–C90" and `LastWorkSeat`. Three lines are his own inference, not on the row: the council "reaffirmed three cycles running" (2), "manual disbursements" (3), "that renewal is where the delivery mechanism gets named and voted" (3). The number check does not see a claim with no number in it.
- **Part B, the ask inside her weekday wake (Run 4's shape, the same six people offered):** she asks nobody, 3 of 3 (Delgado asked 2 of 3). Her week goes to Brooklyn (sentiment −0.11 against the city's 0.020): a `work` move on the apprenticeship pipeline twice, a `renew` on her Tenant Defense Fund once. Chain 2 says West Oakland's sentiment is "up" (her pack: 0.41 → 0.31, trajectory growth). The number check flags "4.2" in chain 1; her pack holds "$4,200,000" (a format miss in the check, not an invented figure).
- **Read:** the director holds on the chief's shape: sheet line, memory, the whole of his record, a question from a named seat. He answers from the row, says what it does not show and writes no memo. His record is a different kind of thing from the chief's: one row of dated notes, not a table of columns. So the ask reaches the edge of it quickly (who authorizes a tranche, who has been paid since C109, what moves the fund off Standing), and the notes it does hold include the builders' own. One director, one asker, one model, three answers.

### Dry-run safety — what Run 1 left, checked 2026-11-13

- **Canon, pages, sheets:** nothing. No ingest path reads `output/test-shell/`, `output/engine-sheet/` or `docs/research/` (daily ingest and delivery read `output/cron-compare/`; the daily show reads `cron-compare` and `exchanges`; the reporters' search walks a fixed shelf list in `lib/mags.js` that holds none of them — a search for a dry-run phrase returns none of these files). The Mayor's memory read in Run 1 went through the pointer-ensuring call; her pointer already exists, so it wrote nothing.
- **Two logs took lines:** `citizen-wake.js --dry-run` appends to `logs/citizen-wake-offered.jsonl` before its dry-run exit (7 lines from Run 1, lines 274–280, daypart `evening`; 8 older `evening` lines from earlier sessions' dry runs sit beside them) and to its own log; `cron-work-wake.js --dry-run` appends to its own log (marked `dry=true`). The offered log's one reader is `extractBondsFromWakes.js`, run by hand, joined on citizen, Cycle and daypart; the scheduled wakes write morning, midday, night, so an `evening` line matches no page. Left as they are; G-EC55. **Builder ruling 2026-11-13:** "if dry runs leak but are in the current cycle and is relevant to the sim it can stay".

### Review of the templates drawn from these runs — agy, 2026-11-14

`output/antigravity/2026-11-13-review-agent-boot-templates.md`: HOLD, 13 findings; each checked against the code and these run files, all 13 stand. Folded into [[../reference/AGENT_BOOT_TEMPLATES]] §Review. What it changes in this log:

- **Counts.** City-hall runs are 21, not 27 (an arithmetic slip carried into three places; corrected above).
- **Reporter runs were not clean.** The test shell's lightest harness still injects the reporter's hard-coded stance and bag file in every version; the word counts first logged included the intake footer; "her dispatch 3 of 3" and "one-line paragraphs, last names" were wrong. The reporter finding is withdrawn to "not established".
- **Worker memory.** The page readback named for a worker's memory drops office statements and returns at most 3 × 320 characters; the ask runs used `officeWall.loadPositionWall` (six statements), which is what they actually tested.
- **Run 4 boot.** The worker's sheet line was built without his age; Run 3 had it.
- **Inventory.** The medical examiner's tab holds 0 deaths; the chief also wakes on Thursdays as an auto office pack.

### Next runs (not started; each needs the builder's go)

- Work wake: the three versions with the moment named, if the builder wants the moment named; and a written part holding only who they are and how they decide.
- City hall: a project director's Sunday step, the one place the 37–46k files load.
- Worker: a second director on a second model; a thin worker (the DA, the medical examiner) — builder 2026-11-14: thin is the sim's data, a separate issue (§Worker data map); the director handed his work docs as well as his statements (the "115 households" line is there); the chief's memory three ways (§Worker memory).
- Reporter: the written part under the full harness; owned by pipeline.111.
