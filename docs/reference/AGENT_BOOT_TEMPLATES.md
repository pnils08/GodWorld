---
title: Agent Boot Templates — what each kind of cron agent wakes with
created: 2026-11-13
updated: 2026-11-14
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

**Status: the Worker model (§3) is ON for the police chief, 2026-11-14 (builder 2026-11-14: "Turn it on , Thursday wakes won't be a thing anymore , 1 worker model , and then it has its citizens boot like everyone else , the old boot are retired for the new templates we are adding , all workers will run on a schedule like police chief"). The other types are draft.**

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

**Clean slate (2026-11-14).** No wake today uses tools and decides untold (evidence log §Council / Mayor: does any wake today use tools and decide untold). Builder: "this will be like the police chief in that we dont want to tell them what to do , however these will likely need some level of instruction on how to do things … the thing to watch is veering into puppeting them too much". Parts proposed, builder on them: "I like this". Not approved; no run.

| # | Part | How the city works (kept) | What to do (out) |
|---|---|---|---|
| 1 | Who they are: sheet line, office, temperament | — | — |
| 2 | The office can be lost: their approval and what moves it | under 40 a challenger is named; under 30 the challenger takes the seat; what moves the number (below) | — |
| 3 | Their data: their district's readings whole, the city's, their board, petitions waiting, each category's budget band | — | one initiative picked for them, "advance or hold", the pre-written claim |
| 4 | Their tools: the worker's four; asking a worker (agreed in principle; civic.49) | what each tool returns; who can be asked and what each holds | when to use one |
| 5 | Their memory: searched from their page, Cycle-labelled | — | the newest few handed in |
| 6 | Their past decisions and what came of each (passed, funded, landed) | — | — |
| 7 | The moves the office holds | what each move is and what follows it | which to make; a line saying what their statement is about |
| 8 | What is put to them, last, in the asker's words; on Sunday the agenda sits here | — | nothing added when nothing is put to them |

- **The guard on every "how" line:** it describes the city; none addresses the seat with a verb of what to do (§0: a written line about how a person does a thing is acted out).
- **The move limit (builder 2026-11-14): "the old wakes set it as you get one move but it doesn't have to be so restrictive in that way".** Today's wake: at most one work or decision move a week, plus answers (`cron-civic-run.js` `datawakeUserPrompt`). Still the builder's call: the two-read limit; no figure unless handed.
- **What moves approval (builder 2026-11-14): "The initiates in their districts hit them and how the media covers what they do hits them. So doing nothing is a good way to get removed".** The engine (`phase05-citizens/updateCivicApprovalRatings.js`): initiatives touching the district (the Mayor: all; a sponsor: its own) — advancing a phase +2 owned / +1, finishing +3 owned / +1 once, choosing fail −2 owned, silence (overdue or never scheduled) −3 / −2 / −1 a week owned; a target the number closes toward each Cycle from the district's mood and readings against the city and the week's press; a scandal roll at sustained high approval. **The press term is the paper's rating of the week — the civic desk and the whole paper, half and half — one number for every seat, not coverage of the seat** (`mediaScore_`, `mediaDelta_`). The paper's grade is -5 to +5 per desk from what it published (`rateEditionCoverage.js` → `Edition_Coverage_Ratings` → `applyEditionCoverageEffects_`). Its own job, engine.342 (builder 2026-11-14: "also need to file the media grading plays into the sim").
- **The gap (builder 2026-11-14): "they have some initiative creation the can do but don't have alot of ability to do much else . So that's a gap in this I see".** Every council move works through an initiative: propose (a candidate the council votes on), work (stands a funded row up, keeps a running one tended), call-vote, renew, answer (Mara's question), canvass. Canvass is validated and recorded and changes nothing in the engine (no reader outside the move record). Outside initiatives, the one move in the wake's closed set is the chief's patrol. Its own job, civic.50 (builder 2026-11-14: "That will be its own job , the template can still be built on the current set up"); the template is built on the moves that exist.

**Built on one seat, the template only (2026-11-15).** Builder: "you need to focus on building one that works rather than doing them all at once , like the plan state build the templates then the work flows , and agree the mayor is likely its own template". The spec is Terrence Mobley, District 9 (`scripts/seatWake.js` `BUILT`; tests `scripts/seatWake.test.js`); each other seat is built out after his works. The Mayor is her own template, not started. Nothing is wired into any run: the print harness `output/engine-sheet/2026-11-15-seat-wake-print.js` writes `…seat-wake-print.council-d9.txt` (no model call). The workflow — the weekday runner, the moves filed through the gate held each to its own rule, one ledger id per move, his record and page, the Sunday hearing — is plan Task 11, after approval. Tool budget 6 a wake (the chief's). A resident call is read-only (`citizenVoice.js`, no `--record`); whether a visit lands on the resident's page is the turn-on call. Data: the pack as built, less `task` / `pulse` / `prewrite` / `limits` / `output`, the build notes, and the brief's retrieval index (its district readings kept); a record that cannot be read says so. Seen in the print, for the pack check: the faction table prints 95 / 85 / 85 where the office sheet holds 63 / 59 / 60; a reporter's "filed:" line sits among the district's complaints; one fact repeats in "On the record".

**The template on the current moves — draft wording (builder 2026-11-14: "the template can still be built on the current set up"; "Once those are with a rollout line we can proceed on the template , then we will check their wake pack").** Not agreed; no run; no code. Built as the chief's (`scripts/workerWake.js`): the sheet line and gathered memory as the system turn; data blocks titled by their data, then their decisions, then what is put to them; the reply is the statement, whole; a move is a tool, staged and filed through the same move gate (`validateDatawakeMoves`), as the chief's patrol is. No JSON form on the weekday wake.

**What a council seat is (builder 2026-11-14), on the draft: "This all looks good for the first build to test".** "An iniative isn't the job and the way you write this it makes it seem like that's what they do. Like a police chief this is a different form of a data agent . So the reason media affects them is Because the media gets to interview them or call on them . So of Carmen wants to know something they need to be Able to answer for it . In their voice with tools to provide the answer. In their wakes they get to \"walk\" their districts , call on citizens in their districts and ask them the concerns or excitement for their hood. One of their abilities is to create an Iniative to serve their districts, which they vote on in the city hall run , when big events happen in there districts they respond to media and check in on the citizens." On approval: "the explanation of the approval rating doesn't serve them , it probably would be better as somethings that a script edits each week so it show what their approval ratings is , what is was last cycle and what puts them out of office . Explanation isn't needed".

| What he named | In the code today |
|---|---|
| The media interviews them or calls on them; they answer in their voice, with tools | A reporter reaches a seat only as a citizen interview (`citizenVoice.js` from `cron-desk-run.js` `collectQuoteAsks`): Vega 5, Santana 1, Rivers 1 across every `*_asks.json` on disk; none with the seat's records or tools |
| They walk their district and call on its citizens | No seat tool. `citizenVoice.js` voices one citizen on an ask, read-only by default |
| They create an initiative for their district, voted on in the city hall run | `propose` → Proposed at the week's close → a seat's call-vote → the vote; live |
| Big events in their district: they respond to media and check in on citizens | The event duty (`planDutyRota`, a fresh major event owed to an elected seat) runs only under `--civic47-pilot`, off by default |

| Part | What the seat reads (draft) | Source |
|---|---|---|
| 1 | the live line, e.g. "You are Ramon Vega, 64, living in Lake Merritt, Oakland. You hold the office of City Council District 4 (Glenview, Dimond, Ivy Hill)." + temperament | live (`wakePerception.identityLine`) |
| 2 | Block "Your approval", written by the harness each wake: now, last Cycle, and what puts them out of office ("Approval 61; last Cycle 63. A challenger is named below 40; below 30 the challenger takes the seat."). No explanation | `Civic_Office_Ledger` now and its last-Cycle snapshot (`output/beats/prev/Civic_Office_Ledger.jsonl`); thresholds from `updateCivicApprovalRatings.js` v1.8 |
| 3 | Their district, the city, their board, petitions waiting, categories with budget bands — every column; titles name the data | the fill: checked at the pack read, next |
| 4 | The worker's four tools, same wording (`workerWake.TOOLS`) | live for the chief |
| 5 | "From your own memory:" entries gathered by search, each with its Cycle | `workerWake.gatherMemory` |
| 6 | "What you have decided and said on the record:" each move, with what came of it | `workerWake.pastDecisions` + the outcome (the pack read) |
| 7 | The moves, as tools (below) | `cron-civic-run.js` closed set + eligibility rules |
| 8 | A question last, in the asker's words, with who asks; Mara's question here. Sunday: the agenda here | — |

**Their tools (draft descriptions — what each is and what follows; nothing on when). Records first, then people, then council business; an initiative is one ability among them:**
- The worker's four, same wording: a city sheet, a citizen's record, what the paper has printed, their own memory.
- `resident_call` — "Call on a resident of your district and put a question to them; they answer in their own words." Built on `citizenVoice.js` (read-only); not wired to a seat. The walk is this call; `canvass`, which sets nothing (civic.50), is not carried.
- `initiative_propose` — "Put an initiative before the council to serve your district: its name, what it is for, the category of city life it touches, its reach and a budget inside the category's band. It is entered as Proposed at the week's close; the council votes on it at the city hall run once a vote is called."
- `vote_call` — "Send a proposed initiative with no vote scheduled to the next city hall vote. The Mayor may call any; a district seat one with a neighborhood in its district. One call per initiative a week."
- `program_renew` — "Ask the council to re-fund a running program on your board that is running low or has run dry, with an amount inside its category's band. The council votes the next week; the money lands the week after."
- `initiative_work` — "Put your office's work into an initiative on your board. A funded one stands up once work lands on it; a running one weakens when left untended."
- `directive_answer` — present only when Mara has asked: "Reply on the record to the question the City Planning Director put to your office."
- What is put to them (part 8): a reporter's question with who asks (Carmen Delaine, Civic Ledger), Mara's, a worker's answer; a big event in the district. Routing a reporter's question to the seat's own wake is not built; the event duty is pilot-only (table above).
- Asking a worker: civic.49, not built.

**Left to the builder:** how many moves a wake (draft: no count; each tool's own rule stands); the tool-call budget a wake (the chief's is 6 reads and moves together); a figure not handed — as the chief, logged on the record, not stated to the seat. The Sunday hearing's form (`outputContract`) is the wake's, read with the pack.

**The draft from Runs 1–2 (superseded by the clean slate above):**

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
- **The office can be lost, and no wake says so (builder 2026-11-14: "the council seats hold those based on approval rating so part of their harness is that they can lose that office … before we move of council the template is in place").** The engine: under 40 approval a challenger is named on the office row; under 30 the named challenger takes the seat that Cycle (`phase05-citizens/updateCivicApprovalRatings.js` header v1.8, `turnoverLedger_`). What a seat is handed: its number ("holds COUNCIL-D1 at approval 63"; Sunday "Your approval stands at …"; an `approval-pressure` item under 55, `buildCivicOfficeSlice.js:597`). No pack, packet or file says what the number does; `challenger` and `CAMPAIGN` appear in none of the wake builders. C115 approvals: 56 (Vega) to 72 (Santana), no challenger named. Not in any run so far; the part is owed before this template is approved.
- **Open, and not a boot matter:** what they are handed. "D3 East Oakland" (G-EC48) and the hand-closed tracker rows come back in every statement because they are in the pack.
- **Legacy on switch:** `civic-office-mayor/`, `civic-office-council-d1…d9/`, `civic-office-council-seat/`, and the faction folders the seats fall back to (`civicSeat.personaDirFor`).

## 3. Worker

**Builder (2026-11-14):** "This is the workers template and we are building it to the police chief spec, all workers are the same agent type but may have different data and tools but how they operate should be built from a template, we aren't trying to make 1 agent work , we are trying to build a rebuildable process so once we know the police chief works and his template does what we want every worker will love to this template and be built out just like we are doing with the police chief".

**What a worker is (builder 2026-11-14):** "The workers are data agents not decision makers , along with some ability to answer for the data but the workers aren't able to fix "the engine" as much as they can control the data . So when a council, media need to know about crime they call on this agent for the answer. So the more they have access to the better the answer the mayor , media districts get . They wake with this data to "make sense" of it and speak on the record about the issues . So it a lot of ways the workers aren't being held accountable, they are telling us they can't make sense of the data, which is what we need to fix , this is what Elias Varek agent is doing , pulling it high level about what isn't happening or makes little sense to a cron that wakes ."

**Who:** every position in §3.1. One agent type. The template is how each of them operates; one worker differs from another only in its fill (data, tools). The police chief is the spec: the template is built and proven on him, then every other worker is built out the same way. Only the police chief is worked until then, and nothing is run until the template is decided (builder 2026-11-14: "we are literally only working on the police chief"; "no runs … until templates are set").

**The template — the harness, the same for every worker:**

| # | Part | What the worker wakes with | Per worker | Built |
|---|---|---|---|---|
| 1 | Who they are | The sheet line: name, age, home, office, temperament. No written file | values only (ledger, office sheet, dials) | the functions exist (`wakePerception.identityLine`, `citizenDials.disposition`, live in the daily wake); no worker wake uses them |
| 2 | Their data | The whole of the records of their trade, every column | **the fill:** which tabs | no |
| 3 | Their tools | (live: `workerWake.toolsFor` / `toolExecutor`) Read a city sheet; look up a citizen; what the paper has printed; read their own memory. Described to them, nothing on when to use one. Asking another worker: agreed in principle, not built | same for all (the fill may add) | in the dry-run harness only (Run 6); the loop and three of the four are the reporters' (`cron-desk-writer.js`) |
| 4 | Their memory | Entries from their whole page, gathered for them by what is in front of them (the question, or the Cycle's data); not the newest few handed in | same for all | no — `citizenPage.searchPage_` exists, no wake calls it, and it lags the newest Cycles |
| 5 | Their past decisions | Their own moves, each with the question it answered, looked up by POPID (moves are keyed `proj-*`, `civic-project-*` / `civic-office-*`, `STAFF-*` for one person) | same for all | no |
| — | The work | **Not part of the template** (builder 2026-11-14: "the template doesn't give the work , it's the harness for the cron"; "You have to be careful you aren't puppeting these"). The harness carries no task, no line on what the worker is doing, and no note on what the data means, shows or lacks; a title names its data and nothing else. A question someone puts to the worker is placed last in the asker's own words with who asks. With no question nothing is added | — | weekday wake: live, nothing added; asked = civic.49, not approved to build |

- **Part 3, the builder's word (2026-11-14):** "Yeah I think that's a good start for the tools , even though the memory isn't called much it should be available"; on a worker asking another worker: "It's a good idea I wouldn't be opposed to it, that's how a city works so it makes sense".
- **What a worker said before stands until it is changed (builder 2026-11-14):** "the fact he cited something he said in 102 is pretty cool, and that may be a current fact albeit said in a older cycle , if it wasn't changed since then it's current". Memory lines carry the Cycle they were said in, never a calendar date.
- **Not parts of the template.** A written persona file (below). Promises — builder 2026-11-14: "Promises aren't the template as these will change and wouldn't be hardcoded . There can be a part of the template that makes them aware of promises but the entire point of this is to not puppet them so beearw of veering into having your hand on everything." On who keeps a worker's word in front of them: "Mara may be good as the accountability agent , but may require a workflow of both to record it properly". Not designed; evidence log §Tracking what is said.
- **What a worker cannot make sense of is output.** His words above: a worker saying the data does not add up is the finding to fix. Where those lines are collected is not designed; Varek's journal is the pattern he named.
- **Part 4, why gathered and not handed.** Builder 2026-11-11: "writer should never wait on a search: a gatherer agent gathers, the writer writes" (supermemory `sl-godworld`, 2026-11-11). His question 2026-11-14 and the read of the chief's page are the next bullet.
- **Handed or searched: the builder's question (2026-11-14: "should the last 3 memories load for a worker or should it be given a search tool of its memory ? Does forcing its last 3 memories flatten them?").** The chief's page shows the handed lines coming back: one 191-character statement is his whole statement in four Cycles and opens a fifth; three of the six statements handed to him today open on nothing-to-state; two of his reflections share four sentences. A search of one's own page exists (`citizenPage.searchPage_`, used only by Discord) and returned on-topic entries from C102–C107 for three questions, nothing newer. Not compared in a run. Evidence log §Worker memory.

**The police chief — the spec, first fill:**

| Slot | Fill | State |
|---|---|---|
| Data | `Crime_Metrics`, every column (response time and clearance included, G-EC56), with the high and low of each numeric column worked out in code (builder 2026-11-14: "Agree on the idea for #1"); the judicial rows of `Care_Justice_Census` (arrests, custody, by hood, C110–C115); the Cycle's cop-car rows on `Chaos_Cars`; the patrol setting (`World_Config.patrolStrategy`); the TICKETS and COURT lines of `City_Treasury` | proposed from the data map (evidence log §Worker data map); which tabs are his is the builder's call |
| Tools | the template's four; `sheet_read` reaches the reporters' 12 tabs plus `Chaos_Cars`, `City_Treasury`, `Judicial_Ledger` | run once (Run 6) |
| Past decisions | three `answer` moves (C110–C112) and one `patrol` move (C115) | on disk |
| Model | the office map's (`deepseek/deepseek-v4.1-flash` today) | run on it twice (Runs 6, 7) and once on `openai/gpt-6-luna` (Run 7): the second is right on every comparison and half the length, and reads as an office release; which model is the builder's |

- **What he wakes on today** (`output/cron-civic/packs/CHIEF-POLICE_c115.json` and his 2026-11-12 weekday record, read 2026-11-14): a council seat's pack. `empty: true`; task `role-week`, goal "no move this cycle"; prewrite "no due action on this seat this cycle"; an empty initiative board, the petition pool, proposal categories with budget bands, 18k characters of sick-resident counts by hood, Mara's old question ids; crime only as the per-hood `CrimeIndex` in the district readings, not his sheet. His statement that day opens "No public safety event in this cycle's export requires an institutional statement from this office." He also has three boots: weekday files, Sunday files, and the Thursday auto office pack on a 700-character cut of his IDENTITY file (`cron-work-wake.js` `autoPackages`).
- **His past decisions:** three `answer` moves (C110–C112) replying to Mara Vance's C105–C107 questions, and one `patrol` move (C115). She is the City Planning Director and is named to the offices she asks; her roster today is the Mayor, the nine seats and the five project seats, so she can no longer ask him. Her question files are on disk, so an answer can be handed with its question. Evidence log §Mara's directives.

**Building a worker out — the process, as it is being done on the chief** (a proposal until he has been through it):

1. Name the worker's fill: data and tools. Which tabs are whose is the builder's call.
2. Build the fill. Parts 1, 4, 5 and 6 are shared code, built once.
3. Print what the worker would wake with, no model call; the builder reads it.
4. The builder decides the template. Then one run.
5. On his approval the worker's wakes switch to the template and its old write-up retires (§7).

- **Written file:** none. The review's point stands: every "how they decide" line tried was a behaviour instruction in the second person ("when you are blocked you escalate rather than wait"; "You write memos"), so a written part is not proposed for workers.
- **Evidence:** Run 3 — the chief on his weekday data, 3 of 3 answers with no figure outside what he was handed, and "I'm not going to invent a corridor split". Run 4 — handed the whole crime sheet he answers with the response times and clearance rates; 5 of 5 answers grounded; one wrong comparison. Run 1 — the fund director with no question answers one anyway in 5 of 9 runs. Run 5 — the Stabilization Fund director on his whole tracker row, asked by the District 1 seat: 3 of 3 answers with no figure off the row, no vote called, no memo; where memory and row disagree (C115 against C116) he follows the row; the row's build notes ("not playable, no Delivering gate yet") come back as the world (G-EC62), and "who decides" gets three answers because the row names no decider. Two workers, two askers, one model: none of the thin workers has been run.
- **State:** written 2026-11-14 from the builder's words; run once on the chief with tools (Run 6: speaks on his data 3 of 3 on his own wake; asked, calls tools 3 of 3 and names what his records cannot answer; a comparison slip 3 of 3, an old memory read as current, history the sheet does not hold); **approved by the builder 2026-11-14 on the police chief**, on his own model (voice over small data slips); nothing in the crons has changed yet (pipeline.110 Task 10). Run 7: with the high and low handed, the comparison slip is gone on his own model; builder 2026-11-14: "This is solid though , very much speaking as the police chief". Parts 1, 2, 4, 5 and 6 exist as a print harness on the chief, no model call: `output/engine-sheet/2026-11-14-worker-wake-print.js` (one `FILLS` entry per worker; the other parts shared), output `…worker-wake-print.CHIEF-POLICE.own.md` — 3,988 characters of system turn (sheet line, six memory entries: two newest of his own, four from a search of his page), 7,971 of user turn (crime sheet 22 × 12, arrests and custody C110–C115 citywide and by hood, four patrol-car events, patrol strategy, court and ticket revenue, his four decisions with Mara's questions, one task line). Part 3 (tools) not built.
- **Differs today, the other workers:** a registry worker wakes on a clock (Tue / Thu) with four status lines and no question; every agented office outside the registry also wakes on Thursday as an auto office pack; the DA's crime node carries clearance and no response time; no worker is handed its move history; no worker has a tool; the EMS director's registry entry carries no first name.
- **Legacy on switch:** the registry's inline `roleLine` / `voiceNotes` (`scripts/work-wake-packages.json`); the five `civic-project-*` / `civic-office-baylight-authority` folders once the Sunday project step stops loading them (37–46k each).

### 3.1 Roster: who holds which records

**Who holds a position comes from `Civic_Office_Ledger`** (builder 2026-11-13). Read live 2026-11-13, C115: 39 positions, none vacant. Every holder is on `Simulation_Ledger` under the same POPID and name, Status Active, CIV flag yes, clock CIVIC; the four project-director rows added in October (STAFF-OARI, STAFF-HEALTHCTR, STAFF-STABFUND, STAFF-TRANSITHUB) are among them. `scripts/civic-office-map.json` holds the same 39 people, but the four project directors sit there under `PROJ-*` ids and on the office sheet under `STAFF-*`: a join on id drops them; join on POPID.

**Every worker gets an agent on this template** (builder 2026-11-14: "all the workers will get an agent template"). The roster is the 39 positions below less the Mayor and the nine council seats (§2); the 21 positions with no agent today are in scope.

**A thin worker is a finding about the system, not about the template** (builder: "if ultimately a worker is thin it tells us the system needs teeth"). Where a position's records are few or absent, the tables below say so; the template is not bent to cover it. Builder 2026-11-14: "The thin ones the gap is the sim isn't generating enough data for them yet, if chaos cars and city level numbers aren't enough that's a separate issue". Mapped the same day (evidence log §Worker data map): thin is two things — records the sim keeps and routes to no worker (the care-and-justice census of arrests, custody and hospital intakes; court and ticket revenue; the chaos-car sheet; transit), and trades the engine generates nothing for (fire, emergency management, public defender, reentry, cause of death, permits, the staff offices). Gap log G-EC65.

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

- 2026-11-15 (engine-sheet) — §2: the council template on Mobley (D9) alone, template only; the runner wiring taken out (plan Task 11, after approval); the Mayor her own template, not started.
- 2026-11-15 (engine-sheet) — §2 seat template: codex review folded (events print fact, Cycle, where, size; the resident ledger unreadable is unavailable; one proposal of a title a wake).
- 2026-11-15 (engine-sheet) — §2: the seat template built, off (`scripts/seatWake.js`, `--seat-template` with `--dry-run` / `--no-write` only); prints for District 9 and the Mayor; three pack defects seen in them carried to the pack check.
- 2026-11-14 (engine-sheet) — §2: the builder's word on what a council seat is (a data agent for the district, answerable to the media; walks the district and calls on its citizens; an initiative one ability; responds to big events) recorded with the code beside each; approval block cut to now / last Cycle / what puts them out; tools reordered records → people → council business, `resident_call` added on `citizenVoice.js`, `canvass` not carried.
- 2026-11-14 (engine-sheet) — §2: the council template drafted on the current moves, built as the chief's: the reply is the statement, each move a tool with what it is and what follows (wording from the eligibility code), the office-can-be-lost block in words; move count, tool budget left to the builder. Not agreed, no run.
- 2026-11-14 (engine-sheet) — §2 Council / Mayor from a clean slate: eight parts proposed, each sorted into how the city works (kept) and what to do (out); builder: "I like this" (not approved, no run). His word on the one-move limit, on what moves approval, and the gap (every council move works through an initiative; canvass changes nothing in the engine), with the code read beside each; the press term is one number for every seat.
- 2026-11-14 (engine-sheet) — Worker model ON for the police chief on the builder's word; an office with a fill is dropped from the Thursday wake (`cron-work-wake.js` `autoPackages`).
- 2026-11-14 (engine-sheet) — **Nothing is approved** (builder 2026-11-14: "I've literally approved nothing"). Every line below or above that reads "approved" or "live" for the worker template is withdrawn; the worker wake is switched off in the runner (`--worker-template` only). See the plan's changelog.
- 2026-11-14 (engine-sheet) — The work and every sentence of the build's own are out of what a worker reads (builder 2026-11-14: "the template doesn't give the work , it's the harness for the cron"; "You have to be careful you aren't puppeting these"). Removed from the live wake: the closing line "It is the close of Cycle N. You are speaking on the record as <office>."; the title notes "the department's sheet; it keeps this Cycle only", "No reading this Cycle: …", "the patrol strategy in force and what was recorded under it (…)", "(none this Cycle)"; the three neighborhoods the memory search named by pressure ratio. The crime sheet is printed as it stands, the blank column included. What he reads that is not data or his own words is now the sheet line, "From your own memory:", seven plain titles and "What you have decided and said on the record:".
- 2026-11-14 (engine-sheet) — The worker template is repo code and the police chief's weekday wake runs on it (pipeline.110 Task 10): `scripts/workerWake.js` (shared parts, `FILLS`, tools), `runWorkerDatawake`, ADR-0019 ([[../adr/0019-worker-wakes-on-the-worker-template]]). To build another worker out: add its `FILLS` entry. Patrol is a tool; the fill sets the strategy in force beside each Cycle's figures. His Thursday auto pack and Sunday statement still load the old files.
- 2026-11-14 (engine-sheet) — **Worker template approved on the police chief** (builder: "I think the voice matters as the slight slips on data isn't as much an issue as not having the proper voice . The data we have , his voice is what we are after , Looks like this one is ready to move live"). Live move: pipeline.110 Task 10.
- 2026-11-14 (engine-sheet) — Run 7: the high and low of each column handed (his word), Cycle labels on memory, the chief rerun on his own model and on a second; his ruling that an earlier statement stands until changed.
- 2026-11-14 (engine-sheet) — Part 3 (tools) set on the builder's word and Run 6 logged: the template run on the chief, own wake and asked.
- 2026-11-14 (engine-sheet) — The worker template printed on the police chief, no model call (§3 State): what he would wake with, for the builder to read before any run.
- 2026-11-14 (engine-sheet) — §3 Worker rewritten as one template for every worker with the police chief as its spec (builder: "This is the workers template and we are building it to the police chief spec … we are trying to build a rebuildable process"): the six parts every worker shares, the fill that differs (data, tools), the chief's fill, the build-out steps; promises taken out of the template on his word; what the chief wakes on today (a council seat's pack marked empty) recorded. No wake changed; not approved.
- 2026-11-14 (engine-sheet) — §3 Worker: the builder's question on memory (handed or searched) recorded with the read of the chief's page; part 4 corrected from Mara's code (his answers are to her C105–C107 questions; she cannot ask him now); part 5 recorded as an open gap in his words; §3.1 thin split into recorded-not-routed and not-generated from two agent maps. No wake changed; no template approved.
- 2026-11-14 (engine-sheet) — Run 5: one project director run as the chief ran (builder: "Go on 1"). §3 evidence and state updated; review finding 2's "a director" is met by one. Evidence log §Run 5.
- 2026-11-14 (engine-sheet) — The daily wake reads an office holder's title from the office sheet (live).
- 2026-11-14 (engine-sheet) — The test guard is in the repo (`scripts/guard/`), on the builder's "Put in the repo".
- 2026-11-14 (engine-sheet) — Six office holders' ledger roles corrected to their office Title on the builder's word; §2 caveat and §3.1 updated.
- 2026-11-14 (engine-sheet) — agy review HOLD folded: 13 findings, all verified. City-hall runs are 21, not 27; reporter evidence was not clean (stance line and bag in every version; word counts and style claims corrected); the worker memory loader named was wrong; the chief also wakes Thursdays; chaos table rebuilt on the config; gate and retirement sections corrected.
- 2026-11-14 (engine-sheet) — The ask step has its own row and plan: civic.49, [[../plans/2026-11-14-city-workers-answer-the-seats]]; pointers moved off civic.47 W1.
- 2026-11-14 (engine-sheet) — Builder: every worker gets an agent on the worker template; the six ledger-role mismatches are being traced (read-only) so they can be corrected on his go.
- 2026-11-13 (engine-sheet) — Roster re-based on `Civic_Office_Ledger` (39 positions, all on the citizen ledger; four role mismatches listed); §3.2 chaos-car routing added (today by place only; by kind proposed); thin worker = system finding (builder's words). Sent to agy for review.
- 2026-11-13 (engine-sheet) — Created as a draft from Runs 1–4 on the builder's go ("yes go on 1"). Citizen and Council / Mayor tested; Worker tested on the police chief; Reporter on two; Gate untested.
