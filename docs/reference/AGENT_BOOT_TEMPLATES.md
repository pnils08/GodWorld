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
  - "[[../plans/2026-10-31-civic-autonomy]] — civic.47 W1, built against §3 Worker"
  - "[[../plans/2026-11-10-stop-puppeting-the-newsroom]] — pipeline.111, owns the reporter harness (§4)"
  - "[[../index]] — registered here, same commit"
---

# Agent Boot Templates

**Status: draft, proposed for the builder's approval.** Nothing in the crons has changed. Each template says what the runs support; the builder approves a template before any wake is switched to it.

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
- **Evidence:** Run 1 — Vinnie Keane with and without the 300 characters lifted from his written file, 2 runs each, the same man.
- **State:** tested; matches what runs today.
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
| 5 | (civic.47 W1, not built) who they can ask | the worker roster, §3 |

- **Written file:** none needed on the evidence. Mayor: 20,959 characters of files, a 175-character sheet line and a 701-character sheet line + written part all filed the same move. Tran weekday ×9 and Rivers Sunday ×9: the same act and the same voice on all three; Rivers's own lines return word for word from her page.
- **State:** tested (27 runs, three people, both wakes).
- **Differs today:** IDENTITY + LENS + RULES load whole as the system turn (`readPersonaDir`); the shared council-seat LENS and RULES ride with every seat.
- **Sheet line caveat:** two holders' `RoleType` disagrees with their office (§3.1): on the sheet line alone Vega wakes as "City Council President - D1" and Osei as "City Council Member".
- **Open, and not a boot matter:** what they are handed. "D3 East Oakland" (G-EC48) and the hand-closed tracker rows come back in every statement because they are in the pack.
- **Legacy on switch:** `civic-office-mayor/`, `civic-office-council-d1…d9/`, `civic-office-council-seat/`, and the faction folders the seats fall back to (`civicSeat.personaDirFor`).

## 3. Worker

**Who:** a citizen who holds city records and answers for them. Template drawn from the police chief (Runs 3–4).

| Order | Part | Source |
|---|---|---|
| 1 | The sheet line + temperament | ledger + dials |
| 2 | Their page memory: statements, past answers, work docs | page readback (`loadOwnPageReadback`), not only the six statements `loadPositionWall` returns |
| 3 | The whole of the records that are theirs, every column | the worker's tab or row, §3.1 |
| 4 | Their past decisions | their rows in `output/cron-civic/moves/` |
| 5 | Anything they are on record as promising | `output/mara-directives/promises.jsonl` (none held for any worker today) |
| 6 | The task: a question from a named seat, with the asker's seat and hoods | the ask step, civic.47 W1 |

- **Written file:** none. A written part, if the builder wants one, holds who they are and how they decide; nothing on how they talk on paper or what they produce.
- **Evidence:** Run 3 — the chief on his weekday data, 3 of 3 answers with no figure outside what he was handed, and "I'm not going to invent a corridor split". Run 4 — handed the whole crime sheet he answers with the response times and clearance rates; 5 of 5 answers grounded; one wrong comparison. Run 1 — the fund director with no question answers one anyway in 5 of 9 runs.
- **State:** tested on one worker; proposed.
- **Differs today:** a worker wakes on a clock with four status lines and no question; the chief's pack lacks `ResponseTimeAvg` and `ClearanceRate` (G-EC56); no worker is handed its move history; no worker has a tool.
- **Legacy on switch:** the registry's inline `roleLine` / `voiceNotes` (`scripts/work-wake-packages.json`); the five `civic-project-*` / `civic-office-baylight-authority` folders once the Sunday project step stops loading them (37–46k each).

### 3.1 Roster: who holds which records

**Who holds a position comes from `Civic_Office_Ledger`** (builder 2026-11-13). Read live 2026-11-13, C115: 39 positions, none vacant. Every holder is on `Simulation_Ledger` under the same POPID and name, Status Active, CIV flag yes, clock CIVIC; the four project-director rows added in October (STAFF-OARI, STAFF-HEALTHCTR, STAFF-STABFUND, STAFF-TRANSITHUB) are among them. `scripts/civic-office-map.json` holds the same 39.

**A thin worker is a finding about the system, not about the template** (builder: "if ultimately a worker is thin it tells us the system needs teeth"). Where a position's records are few or absent, the tables below say so; the template is not bent to cover it.

**Role on the citizen ledger against the office sheet** (the sheet line a wake builds reads `RoleType`; not edited, the builder's call):

| Position | Office sheet | Citizen ledger `RoleType` |
|---|---|---|
| Marcus Osei (POP-00036) | Deputy Mayor (Econ Dev) | City Council Member |
| Ramon Vega (POP-00042) | City Council District 4 | City Council President - D1 |
| Denise Carter, Janae Rivers, Elliott Crane | Districts 1, 5, 6 | City Council Member (no district) |
| Rose Delgado (POP-00503) | City Council District 3 | City Council District - D3 |

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
| Clarissa Dane, district attorney | `Judicial_Ledger` | 0 |
| Priya Narang, EMS director | `Hospital_Ledger` admissions, `Health_Cause_Queue` | 3, 3 |
| Jonas Patel, medical examiner | `Hospital_Ledger` deaths; deaths in `LifeHistory_Log` | 3 |

**Named on the office map with a data domain, no agent** (candidates; who answers for which tab is the builder's call):

| Office (holder) | Declared domain (`civic-office-map.json`) | Tab that exists |
|---|---|---|
| City Manager (Aaron Whitfield) | city-operations-budget | `City_Treasury` (19) |
| Deputy Mayor, Econ Dev (Marcus Osei) | economy-business | `Business_Ledger` (283), `Employment_Roster` (971) |
| Fire Chief (Marcus Hollowell) | fire-incidents | none |
| Public Defender, Deputy Public Defender, Court Liaison, Reentry Director, two ADAs | justice | `Judicial_Ledger` (0), `Care_Justice_Census` (1,296) |
| Emergency Management Director (Shawna Delgado) | emergency-crisis | none |
| Chief of Staff, Communications, Legal Counsel, Ombudsman, Police Review Chair, Internal Affairs, two Deputy Chiefs | staff and oversight | none of their own |

**Tabs with no office declared for them:** `Transit_Metrics` (684), `Community_Programs` (33), `Household_Ledger` (930), `Neighborhood_Demographics` (22), `Cycle_Weather` (40), `Faith_Organizations`, `Cultural_Ledger`. The City Planning Director (Mara Vance) is declared for planning, housing and development and runs as her own Sunday cron (civic.47 M1).

### 3.2 Chaos cars: which desk an event reaches

**What the engine fires** (`utilities/chaosCarsConfig.js`): twelve kinds — cop car, fire engine, ambulance, OARI van, building inspector, garbage truck, mail truck, ice cream truck, street sweeper, Estuary Power & Gas truck, BART train, container ship — each landing on a neighborhood, a business or a citizen.

**Where an event goes today:**

| Reader | Rule | Code |
|---|---|---|
| A council seat or the Mayor | by place only: the row's text has to name a hood on the seat's turf | `buildCivicOfficeSlice.js` `loadCycleEvents` / `eventHitsTurf` |
| Reporters | the civic-domain, transit and accountability slices read the week's events | `buildCivicDomainSlice.js`, `buildTransitSlice.js`, `buildJaxSlice.js` |
| Workers | none: the work wake has no event node | `cron-work-wake.js` `NODE_BUILDERS` |

**C113–C115, off the world summaries:** 30 events fired. A chaos fact reached six council packs, all by place. The two cop cars reached the police chief as nothing of his; the two OARI vans did not reach the OARI director, nor the two ambulances the EMS director. The 12 events on a business and the 4 on a citizen name no hood and reached no office.

**Proposed: route by kind to the worker whose job it is, beside the seat whose turf it is** (which worker answers for which kind is the builder's call):

| Kind | Worker | Exists as an agent |
|---|---|---|
| Cop car | Police chief | yes |
| OARI van | OARI director | yes |
| Ambulance | EMS director | pack only |
| Fire engine | Fire chief | no |
| Building inspector | City Planning Director or City Manager | Mara runs as her own cron; the Manager has no agent |
| Garbage truck, street sweeper, Power & Gas truck | City Manager | no |
| Mail truck: a lawsuit or a contract landing on a business | Deputy Mayor (Econ Dev) | no |
| BART train | no office holds transit; `Transit_Metrics` has no owner | — |
| Container ship | Baylight director (the harbor) | yes |
| Ice cream truck | the district seat, by place, as today | yes |

## 4. Reporter

**Who:** the newsroom, write wake. The angle and report wakes already run on the citizen path (`citizenVoice.js`).

| Order | Part | Source |
|---|---|---|
| 1 | The sheet line + temperament | ledger + dials |
| 2 | A short written background: who they are, how they work, how they talk (about 500 characters) | drawn from `docs/media/voices/<name>.md` |
| 3 | Their page memory | the writer's `memory_recall` tool |
| 4 | The assignment and its quotes | the packet |

- **Written file:** yes, short. This is the one type where a run shows the written part doing wanted work.
- **Evidence:** Run 2 — Tanya Cruz ×3 each: today's folder and the sheet line alone both give long scene prose (305–607 words); with the written part, her dispatch 3 of 3 (265–327 words, one-line paragraphs, last names). Run 1 — Kai Marston: the written part shows at the edge (opens on a room). The assignment decides the story in every version.
- **State:** tested on two reporters under the lightest harness; proposed. Not tested under the full harness.
- **Differs today:** about 20 reporter folders hold a name, a beat and pointers to a voice file and a bag file; no wake loads any of the 30 voice files and the writer has no tool that opens a path. The harness and the package contract say how to open and close; the grade scores that (pipeline.111).
- **Legacy on switch:** each reporter's IDENTITY / LENS / RULES; `docs/media/voices/` becomes the source the written parts are cut from, then legacy.

## 5. Gate

**Who:** Rhea (the article gate), the city clerk (the Sunday close), the final arbiter.

- **State:** not tested. No template proposed.
- **What loads today:** Rhea's IDENTITY + RULES, about 30k (`cron-rhea-gate.js`); the clerk's folder whole (`readPersonaDir('city-clerk')`, 15.6k).
- **The question a test has to answer:** a gate checks a draft against rules. Whether the verdict rides the rules, the persona or the packet it is handed is unmeasured. Test shape: the same held and passed drafts through today's files and through the rules alone; compare verdicts.

## 6. Outside the four

Mara Vance (asker; her own memory and tools; civic.47 M1), Elias Varek's journal (`civisJournal.js`: a directing preamble + his three files), Mags's reflections (`discord-reflection.js`), the show's pilots. Not covered here.

## 7. Retiring the current write-ups

**Builder (2026-11-13):** "if we need to retire current write up as legacy for the rewrites we can do that also".

- A folder retires when the last wake that loads it has switched, never before: the crons read these files live.
- Retire = move to a dated archive folder outside `.claude/agents/` (a folder left inside it can still be read as an agent), repoint inbound links, one commit per type. Nothing is deleted.
- Loaders to check before a move: `readPersonaDir` and `civicSeat.personaDirFor` (city hall), `agentIdentityNotes` (work wake), `loadVoiceTexture` (daily wake), `cron-desk-writer.js` AGENT_DIR (reporters), `civisJournal.js` `promptFor`, `lib/personaProvider.js` (Discord), `cron-rhea-gate.js`, and the Agent-tool definitions that share the folders.

## 8. Where what was said is kept

| What | Where it lives today |
|---|---|
| An office's public statements | the holder's page (CIVIC docs); `output/cron-civic/datawake/`, `output/civic-voice/` |
| Decisions | `output/cron-civic/moves/moves_c<N>.jsonl` |
| Promises and whether they were kept | `output/mara-directives/promises.jsonl` (8 rows: the Mayor's and council's) |
| A worker's diary | the worker's page (`work` docs); `Reflection_Intake` |
| A question put to a worker and its answer | nowhere yet; civic.47 W1 records it on the worker's page and in the seat's record |

**Builder (2026-11-13):** "if we run into issues on how to track things said we can consider a workbook for the crons if useful". Not needed for the templates. It becomes worth weighing when the ask step is live: questions, answers and promises would then sit in four places with no single readable view. Raised here so it is not lost; no design.

## 9. Where the documentation lives

| Thing | Home |
|---|---|
| These templates | this page; a change is a dated Changelog line |
| Evidence and every test run | [[../research/2026-11-13-boot-templates-test-runs]] |
| Raw outputs of the runs | `output/engine-sheet/2026-11-13-boot-three-way.md`, `…-run2.md`, `…-ask-dry-run.md`, `…-seat-asks-worker-dry-run.md` |
| The job | [[../plans/2026-11-10-role-citizens-wake-as-themselves]] Task 9 (pipeline.110) |
| The ask step | [[../plans/2026-10-31-civic-autonomy]] W1 (civic.47) |
| Observations made on the way | `output/production_log_run_cycle_c115_gaps.md` G-EC52–G-EC56 |
| On approval of a template | an ADR beside ADR-0014 (boot from the sheet, not a written persona) before the first wake switches |

## Changelog

- 2026-11-13 (engine-sheet) — Roster re-based on `Civic_Office_Ledger` (39 positions, all on the citizen ledger; four role mismatches listed); §3.2 chaos-car routing added (today by place only; by kind proposed); thin worker = system finding (builder's words). Sent to agy for review.
- 2026-11-13 (engine-sheet) — Created as a draft from Runs 1–4 on the builder's go ("yes go on 1"). Citizen and Council / Mayor tested; Worker tested on the police chief; Reporter on two; Gate untested.
