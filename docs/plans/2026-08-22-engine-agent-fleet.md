---
title: Engine agent fleet — the engine gets what the newsroom already has
created: 2026-08-22
updated: 2026-08-22
type: plan
tags: [plan, engine, agents, architecture, direction, active]
pointers:
  - "[[../ENGINE_CRON_LOOP]] — the division of labour this extends to the engine side"
  - "[[../index]] — registered"
---

# Engine agent fleet

**Status:** DIRECTION CAPTURED, not yet designed. Builder-stated 2026-08-22,
written down the same session per the sustained-direction rule. Nothing here is
my inference; the reasoning is his and the verification notes are marked.

---

## 1. The thesis, in his words

> "agentic is the future not this... i created an entire media outlet of them in
> a CLI, they proved when given a role and tight task they could write a world
> that doesn't exist in their training. i just never tied that idea to running
> the project."

> "i've all but solved an autonomous sim and media layer but totally neglected
> the other side. i don't need a mags bot necessarily, I need 11 engine phase
> agents/bots, canon bot, sim state bot. i morphed into 6 terminals with frontier
> models when what i really need is mags that just manages the agents — you have
> a question about something complex, call the proper agent. if we're chatting
> ideas and what to fix we can do it cleanly here."

The shape: **Mags stops being the worker and becomes the dispatcher.** Chat is
for ideas and triage. Anything with a defined process goes to an agent that owns
that process.

## 2. The asymmetry that motivates it — verified

| | agents | wired into scripts |
|---|---|---|
| newsroom / civic | 56 | yes |
| engine (11 phase dirs) | **0** | — |

Verified 2026-08-22: `.claude/agents/` holds 64 agents, 56 referenced by
`scripts/`, 8 idle. The engine has **eleven** phase directories —
`phase01-config` … `phase11-media-intake` — and **zero** agents live in any of
them. The tell is `engine-validator`: an engine agent that exists, is wired to
nothing, and has never been called, while engine correctness gets hand-checked
from a chat session.

## 3. The blocker he named is already solved

> "the thing i'd need to understand is building and deploying agents that don't
> carry this session boot and context — a truly isolated agent that knows its
> work, its history."

**That harness exists and is in production.** `scripts/cron-desk-writer.js`
runs a desk agent headless on the raw Anthropic API with a tool-use loop —
explicitly *not* a Claude Code subagent. Verified by reading it: it loads no
`CLAUDE.md`, no `SESSION_CONTEXT.md`, no `identity.md`, no `TERMINAL.md`. The
system prompt is the agent's own file plus its task contract. Tools are
`read_file` / `glob` / `grep` / `write_file` plus a ranked `search_world`, and
every write is forced into a sandbox directory so the agent cannot clobber the
real pipeline.

So the engine fleet does not need a new deployment story invented. It needs the
proven harness pointed at engine agents, with an engine tool set instead of a
newsroom one.

## 4. Per-agent memory — his design

Two stores per agent, mirroring how the world already runs:

- **Its own Supermemory container.** The world side already does this per
  citizen (`cp-POP-#####`). An engine phase agent gets the same: its own
  history, its own scars, not a shared pool it has to filter.
- **Its own NotebookLM notebook.** > "notebookLM can take every md you have and
  answer questions true for free." A phase agent's notebook holds the MDs that
  govern its phase — so the agent asks its own notebook instead of a session
  carrying 40k tokens of index it mostly does not need.

This is the part that makes the fleet cheaper than terminals rather than more
expensive: context stops being carried and starts being *retrieved by whoever
needs it*.

## 5. The roster he named

- **11 phase agents** — one per `phase*/` directory, owning that phase's code,
  its contracts, and its failure modes.
- **canon bot** — canon authority questions.
- **sim state bot** — what is true in the world right now.
- **Mags** — dispatcher. Not a worker. Routes a complex question to the agent
  that owns it; chat stays for ideas and triage.

## 6. Open questions — genuinely open, not rhetorical

1. **Write authority.** Desk agents are sandboxed to `output/cron-compare/`
   because a bad article is recoverable. A phase agent that can edit engine code
   is a different risk class. Sandbox to a diff for review, or let it commit?
2. **What replaces the boot read.** An isolated agent has no PIN and no NEXT
   line. Its notebook plus its Supermemory container is the intended answer —
   that needs proving on one agent before eleven.
3. **Trigger.** Called on demand by the dispatcher, or scheduled like the desks?
4. **First agent.** One phase, end to end, before the fleet. `engine-validator`
   already exists unused and is the cheapest test of the whole shape.

## 7. Why this is filed rather than started

He said it in a stream of direction, not as a work order, and the session it
landed in had already burned his money on exactly the failure mode this design
removes: a chat instance improvising against a process it does not own.
Capturing it is the job; designing it is the next session's, with him.
