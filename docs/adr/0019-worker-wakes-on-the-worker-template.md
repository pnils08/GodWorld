---
title: "ADR-0019: A city worker wakes on the worker template — the sheet, their records, their tools; no written persona"
created: 2026-11-14
updated: 2026-11-14
type: reference
tags: [architecture, civic, citizens, decision, active]
sources:
  - "Builder 2026-11-14 — \"This is the workers template and we are building it to the police chief spec, all workers are the same agent type but may have different data and tools but how they operate should be built from a template, we aren't trying to make 1 agent work , we are trying to build a rebuildable process\""
  - "Builder 2026-11-14, approval — \"I think the voice matters as the slight slips on data isn't as much an issue as not having the proper voice . The data we have , his voice is what we are after , Looks like this one is ready to move live\""
  - "docs/research/2026-11-13-boot-templates-test-runs.md — Runs 3–7, the evidence"
  - "scripts/workerWake.js, scripts/cron-civic-run.js runWorkerDatawake — the implementation"
pointers:
  - "[[0014-citizen-self-authorship-live-drift]] — authored canon is a starting character; the dials drift. This decision applies it to workers"
  - "[[../reference/AGENT_BOOT_TEMPLATES]] — §3, the template and the fill of each worker"
  - "[[../plans/2026-11-10-role-citizens-wake-as-themselves]] — pipeline.110 Tasks 9–10"
  - "[[../index]] — registered same commit"
---

# ADR-0019: A city worker wakes on the worker template

**Status:** Accepted — on for the police chief 2026-11-14 (builder: "Turn it on")
**Date:** 2026-11-14
**Deciders:** the builder (direction and approval), engine-sheet (codification)

## Context

| Fact | Value |
|---|---|
| What a worker is (builder 2026-11-14) | "data agents not decision makers … when a council, media need to know about crime they call on this agent for the answer … They wake with this data to \"make sense\" of it and speak on the record … they are telling us they can't make sense of the data, which is what we need to fix" |
| How the police chief woke before | written persona files as the system turn; a council seat's pack as the user turn (`empty: true`, "no move this cycle", an initiative board, the petition pool); his own crime sheet not in it; a fixed JSON form |
| What he said on it | "No public safety event … requires a statement" in 7 of 19 weekday statements; one 191-character statement whole in four Cycles |
| What he said on the template (Runs 6–7, the same Cycle) | a statement on his own figures 3 of 3; asked a seat's question, tools called and the limit of his records named ("we don't currently report by beat. That is itself the finding") |
| Written "how they decide" lines | acted out as orders in every run that carried one ("You write memos" → a memorandum 3 of 3) |

## Decision

1. **One agent type.** Every city worker wakes on the same six parts (`scripts/workerWake.js`): who they are off the sheet; the whole of their trade's records; their tools; their memory gathered for them; their past decisions. **The template is the harness, not the work** (builder 2026-11-14: "the template doesn't give the work , it's the harness for the cron"; "You have to be careful you aren't puppeting these"): it carries no task, no line on what the worker is doing and no note on what the data means or lacks. A question put to the worker is placed last in the asker's words; with none, nothing is added. A worker differs from another only in its fill (`FILLS[<officeId>]`: data, levers).
2. **No written persona file** is loaded by a worker wake. Who the person is comes from the ledger row, the office sheet and the dials; voice follows from those and the page.
3. **Memory is gathered, not handed by recency:** a search of the worker's whole page on what is in front of them, plus their two newest own entries. An earlier statement is current until changed (builder 2026-11-14). Lines carry the Cycle, never a calendar date.
4. **Tools are described, never directed:** read a city sheet, look up a citizen, what the paper printed, their own memory. A lever a worker alone holds (the chief's patrol strategy, engine.238) is a tool; what it stages passes the same move gate and ledger as a seat's move.
5. **The statement is the worker's whole.** No output form, no instruction on content, opening or close. Figures outside what was handed or read are logged, not gated (SIM_DOCTRINE §13).
6. **Facts worked in code are data** (the high and low of a column, a citywide average, the strategy in force beside each Cycle's figures). They are handed; they are not direction.
7. **Promises are not a template part** (builder 2026-11-14: "these will change and wouldn't be hardcoded").
8. **The model is chosen for the voice** (builder 2026-11-14). A call failure may fall to another model; an empty reply fails the wake rather than change the voice.

## Rejected

| Alternative | Why not |
|---|---|
| Keep the persona files and add the data | the files state what the sheet moves (age, home) and their "how you work" lines are acted out as tasks |
| Hand the newest N page entries | the chief's page shows the handed lines returning word for word across Cycles |
| A memory tool only, nothing gathered | 0 of 104 reporter tool calls at C115 were to their own memory; tool use varies run to run on one model |
| A fixed JSON form for the statement | a form is direction; the lever moved to a tool so the words are free |
| The second model (`openai/gpt-6-luna`), right on every comparison | it reads as an office's release; the builder chose the voice |

## Consequences

- A worker is built out by adding a fill; the police chief is the first (pipeline.110 Task 10). Each worker switches on the builder's word, and its written folder retires only after its last loader has switched (AGENT_BOOT_TEMPLATES §7).
- A worker saying its records cannot answer a question is the output that names a gap in the sim's data; where those lines are collected is not designed.
- Small figure slips in a worker's speech are accepted against the voice. They are visible in each record (`figuresNotHanded`, `toolTrace`).
- A worker's statement lands on its page whole (`officeWall.recordPosition` `maxChars`), where a seat's is cut to a line.
