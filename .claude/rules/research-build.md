---
paths:
  - ".claude/terminals/research-build/TERMINAL.md"
---

# Research-Build Rules

Craft rules for plan, research, doc-graph and apparatus jobs: planning rigor, research-synthesis discipline, blast-radius awareness, anti-feature-creep defaults, doc-registration enforcement, ADR-when-decision-is-load-bearing, rollout filing. They attach to the job type, not the window. (S212 — LLMs are bags of skills, not single tools: `docs/adr/0004-skill-bag-naming-principle.md`.)

**Job model (builder 2026-10-23):** boot hook §JOB MODEL. One job in hand per terminal, owner carries it plan → close; model per job. The rb-plans / es-builds split is retired (why: `docs/MODEL_HIERARCHY.md` §Hierarchy status).

## Seats

| Seat | What it is | Rules that govern the open job |
|------|-----------|-------------------------------|
| **research-build (rb)** | builder terminal — one job at a time, any type | this file for plan/research/doc jobs; `.claude/rules/engine.md` + engine-sheet `TERMINAL.md` §Authority for engine jobs |
| **engine-sheet (es)** | builder terminal — one job at a time, any type | same |
| **civic** (cron-only) | `cron-civic-run.js` — Mayor, factions, projects, Clerk | `.claude/rules/civic.md`; tuning is a job at either terminal |
| **media** (cron-only) | `cron-desk-run.js` — desk reporters, grading, print | `.claude/rules/newsroom.md`; tuning is a job at either terminal |

Fable is a job, not a seat. House guests (codex, agy, aider, kimi, grok) are the review bench and bounded helpers, not job owners — reach them per `docs/reference/CROSS_LANE_MESSAGING.md`.

**Engine jobs at this window** follow the substrate gate wherever they run: bench proof before PROD, one unbenched change in flight, wiring card before the cut, no amend. The gate is a property of the substrate, not of the engine-sheet window.

## Architectural editor discipline

Before designing or shipping any architectural change:

1. **Read everything the change touches** — caller graph for code, inbound-link graph for docs, ROLLOUT_PLAN.md for in-flight handoffs. Architectural changes have unbounded blast radius; the read pass is non-optional.
2. **Audit the plan, then audit the audit** — name the 2-3 weakest assumptions / steps / sequencing choices, attack each, rewrite. Per S212 measure-twice plan-side generalization. The first pass is generation-mode; the audit is evaluation-mode.
3. **Don't build beyond what was asked.** Architectural work attracts scope creep — "while I'm in here, I might as well..." is the recurring failure mode. If a related improvement surfaces, file it in ROLLOUT_PLAN.md, don't fold it into the current change.
4. **Pre-mortem load-bearing decisions.** Before committing to a path that's hard to reverse, ask "what would make this wrong in 3 sessions?" — surface the failure modes before they materialize.
5. **ADR when the decision is load-bearing.** A decision earns an ADR in `docs/adr/` when it's (a) hard to reverse, (b) surprising without context, OR (c) the result of a real trade-off. Numbered, dated, names the rejected alternatives. Bar is high — not every plan becomes an ADR.

## Doc-registration enforcement (no isolated MDs)

Every new MD must have inbound links — register in `docs/index.md`, back-link from a parent spec, link both ways from owning TERMINAL.md if terminal-owned. Part of "done" — not a follow-up step. (S147 rule, MEMORY.md.) Research-build is the steward of the doc graph; isolated MDs are this terminal's failure mode.

When you write a new MD here:
- Add an entry to `docs/index.md` with title + path + one-line purpose
- Add a back-link from the parent spec (e.g., new ADR linked from the relevant rollout entry, new plan linked from its rollout entry)
- Update owning TERMINAL.md if it's a terminal-scoped doc
- Commit all link edits in the same commit as the new doc

If a doc would be isolated (no natural parent), question whether it should exist at all. Most isolated MDs are notes that belong inline in an existing doc.

## Rollout discipline

`docs/engine/ROLLOUT_PLAN.md` is the tracker of current work and waits, one pointer row per job; the plan it points to holds the detail. Under the job model a row's Owner is the terminal carrying the whole job; a row is never split into a design half and a build half. Its own header and `docs/engine/rollout-rules.md` are the contract: four sections by what a row waits on (builder call, dated or `Organic:` fire, now, queue), a waiting row names its Cycle or date, parked work lives in BACKLOG, ids are never reused. Close a row by flipping it to `done-pending-archive` with its evidence; the session close sweeps it to ROLLOUT_ARCHIVE, regenerates the plans-in-motion block and names overdue waits — no hand sweep.

When evaluating papers, tools, or external patterns:

- **File each source as a per-topic research file** from [[../../../docs/plans/PLAN_TEMPLATE]] §Research (a lane's review of a plan or diff uses §Review) → `docs/research/YYYY-MM-DD-<topic>.md`, catalogued in [[../../../docs/research/index]] (the sub-catalog — NOT top-level index.md). `docs/RESEARCH.md` is the **frozen legacy log** (S250); don't append to it. A research file is a source-mining record: one source in, "what's usable for the sim and where" out, grep-able forever. Cite precisely (path + section / Drive-ID — never title-only, S145 token-cost rule).
- Add reading-archive entry in `docs/mags-corliss/TECH_READING_ARCHIVE.md`
- **Research/plan boundary.** Research = *what's true / what are the options.* Plan = *what we'll build / the tasks.* The plan cites `Research basis:`; the research lists `Ignited plans:`. No content duplication — research is the measure-twice substrate behind the plan via a pointer, never folded into it.
- **Verdict, never state.** A research file carries a verdict (`adopt` / `watch` / `take-nothing`), not a rollout state. Pending-ness is ROLLOUT's job: take-nothing → no row; adopt → a `ready` row; watch → BACKLOG §Watch List with a trigger.
- **Research never archives.** Unlike a plan (finalizes → ships its rollout pointer to ROLLOUT_ARCHIVE), a research file is a standing library — grep-able forever, accreting applications. It does not move to archive.
- Don't propose adoption from a single source — name the adjacent tools / alternatives Mike could have picked instead, so the choice is contextualized (S145 teach-the-landscape rule)
- Sources Mike shares deliberately are load-bearing — papers in chat = what he's wrestling with, not curiosities
- Full design: [[archive/plans/2026-06-01-doc-loop-consolidation]].

## Architectural measure-twice

Before declaring an architectural change "done":

- Plan audited twice (first pass + weakest-parts rewrite)?
- All inbound links updated for new/moved/deleted MDs?
- ROLLOUT_PLAN.md tagged for executor + acceptance criteria explicit?
- ADR filed if decision is load-bearing?
- Pre-mortem run for failure modes that would surface in 3+ sessions?
- Cross-terminal git stack checked before push (`git log origin/main..HEAD`)?

If any step is incomplete, the architectural change is incomplete. The owner of the job finishes the plan before building from it; a plan "fixed while implementing" is the half-built pattern the job model retires.
