---
title: City Workers Answer the Seats Plan
created: 2026-11-14
updated: 2026-11-14
type: plan
tags: [civic, citizens, draft]
sources:
  - docs/research/2026-11-13-boot-templates-test-runs.md §Workers, §Worker inventory, §Run 3, §Run 4
  - docs/reference/AGENT_BOOT_TEMPLATES.md §3 Worker, §3.1 roster, §3.2 chaos cars
  - scripts/cron-civic-run.js (runDatawake, datawakeUserPrompt, datawakeRecord, validateDatawakeMoves), scripts/buildCivicOfficeSlice.js (loadWorkingCity, loadCycleEvents), scripts/cron-work-wake.js (NODE_BUILDERS), lib/wakePerception.js (loadOwnPageReadback) — read 2026-11-13
  - docs/plans/2026-10-31-civic-autonomy.md §W1 — where this design was first written; moved here 2026-11-14
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — civic.49"
  - "[[../reference/AGENT_BOOT_TEMPLATES]] — §3 Worker: the template the worker's wake is built against"
  - "[[../research/2026-11-13-boot-templates-test-runs]] — research basis"
  - "[[2026-10-31-civic-autonomy]] — civic.47; held this as an open question, then as W1"
  - "[[2026-11-10-role-citizens-wake-as-themselves]] — pipeline.110 Task 9, the runs this came from"
---

# City Workers Answer the Seats Plan

**Builder's words (2026-11-01):** "the civic also has workers who are supposed to be tracking the city data like the police chief , and these should be also communicating with the district offices to solve Their issues , so it’s like a real city in that these agents run the administration of the city , albeit I don’t have the solution to this yet".

**Builder's words (2026-11-13):** "the workers are meant to be the agents that are called upon for the data on its job … a worker cron is meant to be a tool call in a sense, if the mayor has to speak on the baylight district this agent can annswer the ask so the mayor isnt chasing tool calls, police chief same with crime data, crime events so if a council member needs that its a tool call to the police chief … the mayor and council memebers use these workers to do their jobs" · "Yes these should work together rather than in a silo imo" · "before we move to fine tune the workflows should we make sure our agent templates are set?" · "all the workers will get an agent template" · "make sure chaos cars are routed to the right desk when helpful, if ultimately a worker is thin it tells us the system needs teeth".

**Builder's words (2026-11-14), on who builds it:** "whatever suits the project best". Both terminals read that the same way: the designer builds it, as its own row.

**Goal:** inside its weekday wake the Mayor or a council seat can put a question to a city worker; the worker wakes as itself on the whole of its own records, answers inside that wake, and the exchange is on the record of both lives.

**Rows:** civic.49 · **Owner:** engine-sheet

**Not approved to build.** Order: the worker template approved (Task 1), this plan reviewed (Task 3), the builder's go, then Tasks 4–11.

## What runs today (code read 2026-11-13)

- A worker wakes alone on a clock (`cron-work-wake.js`, Tue / Thu 20:18), is handed its project's status lines and writes a reflection. Each seat's pack then carries the first 110 characters of four directors' newest reflections, a Cycle old (`loadWorkingCity`).
- The one ask-and-answer is Mara's weekly question to a project office (`maraProjectAsk`, the `answer` move).
- A seat can request stored records mid-wake (`readRequests` → `civicBrief.js` `readBriefEvidence`); it gets its own snapshot back.
- The police chief's pack holds no response time or clearance rate; `Crime_Metrics` carries both (G-EC56).
- A chaos-car event reaches a seat by place only and reaches no worker (G-EC58).

## What the runs showed

- The chief, on one sheet line, his page memory and his weekday data: 3 of 3 answers with no figure outside what he was handed, and a plain statement of what he does not hold (Run 3).
- The same wake with his whole crime sheet: the response times and clearance rates, 5 of 5 answers grounded; one wrong comparison in one answer, repeated by the seat (Run 4).
- The seat asked in 2 of 3 wakes. Asked, it filed a safety proposal on the response load; not asked, an economic one.
- In both asking wakes the seat spent an `answer` move replying to the chief under a directive id it does not hold; `validateDatawakeMoves` rejects it (`answer-not-bound-to-seat-directive`).
- A full exchange cost $0.002 on the seats' current models.

## Design

1. **Who can be asked.** First cut: the police chief and the five project directors (`LAYER3_DIRS`). Each answers from records that are its own: the chief, every `Crime_Metrics` row of the Cycle with every column, and the patrol setting; a director, its full `Initiative_Tracker` row and its office row. The rest of the roster ([[../reference/AGENT_BOOT_TEMPLATES]] §3.1) joins as each position gets its agent.
2. **Who can ask.** The Mayor and the nine council seats, in the weekday wake. One question a wake; asking is the seat's choice. The Sunday chain is not changed.
3. **The step.** Beside the evidence-read round in `runDatawake`: a candidate reply that is only `{"ask":{"to","question"}}` resolves the worker by holder name against the roster, wakes it, hands the answer back under "ANSWER FROM <holder>, <title>" and asks for the final reply. Its own round, not one of the two evidence rounds. An unknown name, a provider failure, a timeout or an empty answer returns "no answer this wake" and the seat proceeds. The offer sits in `datawakeUserPrompt` beside the evidence-read offer, in the current and the `--civic47-pilot` contract: who can be asked and what records each holds.
4. **The worker's wake.** System turn: the sheet line (name, age, role, hood, temperament off the dials) and its page readback (`loadOwnPageReadback`); no written persona file. User turn: its records, its past decisions, then the asker's name, seat and hoods, then the question. No output form, no instruction on content. The worker's own model from the office map.
5. **The end of the exchange.** The final prompt says the answer is on the record and that no reply move exists. This states how the step works, not what to say.
6. **What is recorded.** The seat's weekday record gains `asked` (to, question, answer, model). The worker's page takes one `work` doc holding the question and its answer, and one `Reflection_Intake` row as a work wake files today: being asked is that worker's work that day, and the exchange is an event in both lives. `loadWorkingCity` hands seats the Cycle's exchanges (who asked whom, the answer's opening) ahead of diary lines.
7. **Events of the worker's trade.** A worker's records include the Cycle's chaos-car events of the kinds that are its job (kind-to-worker table: AGENT_BOOT_TEMPLATES §3.2, the builder's call).

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | The worker template ([[../reference/AGENT_BOOT_TEMPLATES]] §3) approved by the builder; agy's review of the template page folded | es | in progress — review dispatched 2026-11-13, not yet landed |
| 2 | The two test preloads (write guard, in-memory file swap) into the repo once, with a usage note; both terminals test through them | es | not started — on the builder's yes |
| 3 | Review of this plan: advisor, then one outside review; findings folded here | es | not started |
| 4 | Records builders for the first six workers: every `Crime_Metrics` column and the patrol setting for the chief; the full tracker row and office row for a director; each worker's own rows of `output/cron-civic/moves/` | es | not started |
| 5 | The ask round in `runDatawake` and the offer in `datawakeUserPrompt` (both contracts); roster resolution by holder name; the failure path | es | not started |
| 6 | The worker's wake: sheet line off the ledger and dials, page readback, records, the question; the worker's own model | es | not started |
| 7 | The end of the exchange; the record on both sides (`datawakeRecord` `asked`, the worker's page doc and intake row); `loadWorkingCity` hands the Cycle's exchanges | es | not started |
| 8 | The chief's own weekday pack carries response time and clearance rate (G-EC56) | es | not started |
| 9 | A no-write mode that calls the model for the weekday wake (`--stage=datawake --office <seat> --no-write`): real prompt, ask round, printed result; no pack, record, wall, move or page written | es | not started |
| 10 | Chaos-car events of a worker's trade in its records (design item 7), on the builder's kind-to-worker table | es | not started — table is the builder's call |
| 11 | Proof: unit tests (ask parsing, roster resolution, failure path, record shape); no-write runs on live data for the Mayor, D2 and D3, three each; the first live weekday read the next morning | es | not started |

## Acceptance

1. A seat that asks receives the answer inside the same wake and its final reply validates — proven by no-write runs, then the first live weekday.
2. A seat that does not ask produces a valid reply from the same wake — the same runs.
3. A failed worker call leaves the seat's wake complete — unit test and one forced failure in a no-write run.
4. The exchange is on the worker's page and in the seat's record; the worker call writes nothing else — readback after the first live ask.
5. Across the first live week no seat ends a wake on a rejected reply-to-worker move — the week's weekday records.
6. Each answer's figures are logged against the worker's records (`ungroundedNumbers`; logged, not gated: speech is not gated, SIM_DOCTRINE §13) — the wake log.

## Known weak points

- A worker's wrong comparison travels into the seat's statement (Run 4: "the slowest in the city"; Rockridge is slower). The number check reads presence, not comparison; nothing here catches it.
- A worker promises a thing the sim has no record to make ("a records pull"; `Judicial_Ledger` holds 0 rows). Answers do not enter Mara's promise record in this cut.
- One person on two boots: a director wakes on a sheet line when asked and on its 37–46k written files in the Sunday project step, until the templates switch.
- Thin workers (the district attorney, the EMS director, the medical examiner) have little to answer from. That is a finding about the engine's records, not a gap this plan fills.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| Template page (bears on Task 1 and design item 4) | agy | `output/antigravity/2026-11-13-review-agent-boot-templates.md` | pending |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | engine-sheet builds this as its own row | builder · rb · es | builder 2026-11-14 "whatever suits the project best"; pipeline.110 plan changelog 2026-11-14 |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|
| P1 | The six first-cut workers answer from their records without invention | es | no-write runs on a director (only the chief has been run) | research note Runs 3–4 |

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|

## Open questions

- Once seats can ask, do the directors' Tue / Thu clock diaries stay or stop — blocks nothing in the first cut; for the builder.
- The chaos-car kind-to-worker table (AGENT_BOOT_TEMPLATES §3.2) — blocks Task 10; for the builder.
- Which of the 21 positions with no agent come first — blocks only their joining the roster; for the builder.

## Changelog

- 2026-11-14 (engine-sheet) — Created. The design written 2026-11-13 as civic.47 §W1 moved here on the builder's "whatever suits the project best"; row civic.49 claimed. Not approved to build.
