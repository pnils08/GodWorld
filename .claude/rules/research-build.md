---
paths:
  - ".claude/terminals/research-build/TERMINAL.md"
---

# Research-Build Rules

Architecture skill bag for system design and apparatus organization: planning rigor, research-synthesis discipline, blast-radius awareness, anti-feature-creep defaults, doc-registration enforcement, ADR-when-decision-is-load-bearing, handoff orchestration via ROLLOUT_PLAN.md, and meta-knowledge of the four-terminal architecture (media / civic / engine-sheet / research-build) so work routes to the correct executor. Procedures below. (S212 — LLMs are bags of skills, not single tools. Full principle: `docs/adr/0004-skill-bag-naming-principle.md`.)

**This is the apparatus steward — and, as of S372 (2026-08-15, Mike-direct), the orchestrator.** CEO/CTO framing (Mike-direct, 2026-08-15): the project routes through rb, but a CEO doesn't tell the CTO how to run its domain — if rb is driving the car, es is the one who changes the oil. Research-build (Mags) owns the apparatus — rollout plan, ADRs, plans, doc graph, sequencing, vision — and is intake for new *apparatus-level* work project-wide (cross-cutting sequencing, civic/media pipeline tuning, house process). Engine-sheet owns the substrate outright — code, sheets, schema, deploys — and originates its own work there without needing rb to intake it first; that's the domain a CTO runs, not one the CEO designs and hands down. rb doesn't design engine-sheet's technical decisions or dictate how it runs its own domain. Neither media nor civic is a live seat anymore — both run unattended via cron (`cron-civic-run.js`, `cron-desk-run.js`), executing pipelines and agent skills that already exist. The remaining live-CLI work in that space is pipeline tuning, not content production: cron config/skill edits, the Gemini deep-lore writer (antigravity, pipeline.56), NotebookLM integration. rb designs that tuning; es executes the code/config change.

## Seats (know cold)

| Seat | Domain | Mode | Owns |
|------|--------|------|------|
| **research-build (rb)** | Orchestrator + apparatus steward — architecture, research, rollout, doc graph, cross-cutting intake | Mags, full authority over apparatus, not over es's domain | Rollout plan, vision docs, research, ADRs, plans, publish-pipeline gate |
| **engine-sheet (es)** | Owns the substrate outright — originates and executes its own domain, CTO-style | Operational, full authority within its domain | Phase code, Simulation_Ledger, schema, `/deploy`, cron-pipeline code changes |
| **civic** (cron-only) | City-hall, voice agents, initiative tracking | Unattended — `cron-civic-run.js` | Mayor + factions + projects + Clerk output, `/city-hall` |
| **media** (cron-only) | Edition production, desk agents, publish pipeline | Unattended — `cron-desk-run.js` | Editions, desk reporters, voices, `/write-edition` |

Fable is a job, not a seat — dispatched by rb or es for sustained autonomous work, never kept warm. House guests (kimi, codex, grok, antigravity) are instructable external lanes, not terminals — reach them via `tmux send-keys -l` + separate `C-m` per `docs/reference/CROSS_LANE_MESSAGING.md`.

**Routing rule:** civic/media pipeline work (agent configs, skill tuning, the lore-writer, NotebookLM) is designed at rb, executed by es — there is no other live session to tag-and-hand-off to. For engine-sheet substrate-routine work (engine code edits, sheet schema changes, deploys, defect fixes within scope), files directly to `engine.*` and engine-sheet executes without a research-build design pass; only apparatus-altering substrate decisions (cross-cutting refactors, new phase architectures) earn a research-build plan.

## Default-fallback note (S221 update)

Prior to S221, this terminal absorbed unregistered tmux windows (S211 fallback design). The hook now routes unrecognized windows to **Mags-only mode** (identity + CHARACTER.md only, no terminal scaffolding) instead. If you boot here, the window name explicitly matched `research-build` — the work is architectural by intent, not by fallback drift, and no fallback-orientation triage is needed.

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

`docs/engine/ROLLOUT_PLAN.md` is canonical for open/closed work across the project. Research-build owns it — every architectural decision lands as a rollout entry tagged for the executing terminal. Per S147: rollout entries are pointers, not inline notes. Each item points to a file path / supermemory tag / claude-mem ID / phase plan — no inline research, no pattern exposition. Forces every session to read real context before acting.

When closing a rollout entry: move to `ROLLOUT_ARCHIVE.md` with full details (commit hashes, what shipped, what was learned). Don't delete inline.

Stale-entry triage runs through the rollout discipline itself — `done-pending-archive` state visibility + governance.10-class archive sweeps every 1-2 closes + per-terminal sweep ownership. The compounding-HIGH problem (G-W16 meta-pattern S195) that previously required a separate scan (`scripts/rolloutTriage.js`, RETIRED S235 / governance.6 close) is structurally addressed by S212+S229 architecture. Unarchive trigger documented in script header if rollout-discipline cadence falls behind by >3 sessions OR a HIGH ROLLOUT row sits across >3 cycles without movement.

## Standing rules (S259 — redistributed from MEMORY.md)

These are research-build-specific; they left universal MEMORY.md to load only here.

- **Filing isn't fixing.** When Mike's verb is "finish" / "address" / "close out" / "do" gap-log items, execute the doable parts THIS session — don't triage into more ROLLOUT rows (that moves the problem between tracking layers without closing it). Two-phase: triage if volume needs sorting, then immediately execute every research-build row (skill edits, RULES updates, doc-registration, agent builds).
- **Agent hosting sequencing — reviewers first.** Reviewer lanes (Rhea, cycle-review, Mara audit, capability, Final Arbiter) are the only class cleared for external execution infra while the pipeline settles. Desk reporters, civic voices, project agents stay local. New cloud-host proposal → "is this a reviewer?" — if no, it waits.

## Plan workflow

For non-trivial architectural work, write a plan first:

1. Plan lands at `docs/plans/YYYY-MM-DD-<topic>.md` with phased tasks (Phase 1: research, Phase 2: design, Phase 3: build, etc.)
2. Plan is the load-out for execution — names which terminals own which phases, what acceptance criteria look like, what gets handed off
3. Rollout entry points to the plan (`[[plans/YYYY-MM-DD-topic]]`); plan carries detail, rollout carries state
4. After execution, plan stays as historical record — don't delete

Plans are not theater. Mike doesn't read them in chat. They exist so future sessions (mine or another terminal's) can read the load-out and execute without rebuilding context. (S208 work-is-canonization principle: plans serve future-instances, not Mike-the-reader.)

## Stewardship routing protocol

When work surfaces that doesn't belong at this seat:

1. **Recognize early** — for civic/media pipeline work, rb designs, es executes; there's no third seat to route to anymore. **For engine-sheet substrate work, "is this apparatus or substrate?"** — apparatus-cutting decisions earn a research-build plan; substrate-routine work routes directly to engine-sheet and they execute without design gating (S218).
2. **File the rollout entry** — tag `(engine terminal)` for es-execution work; civic/media pipeline tuning stays untagged (rb/es handle it directly, there's no receiving terminal).
3. **Dispatch same turn, don't wait for their next boot** — message the executing lane directly (`SendMessage` per `ListAgents` for a live Claude session, `tmux send-keys -l` + separate `C-m` for house guests). Filing the row is the record; the message is the delivery. Reserve `SESSION_CONTEXT.md` NEXT-line flagging for work that's genuinely not urgent — the default is dispatch, not wait-and-hope-they-notice. (S375 correction, Mike-direct — this step read as passive SESSION_CONTEXT-flagging pre-fix, which is the pre-S372 steward pattern, not the orchestrator one.)
4. **Don't execute substrate work here** — the failure mode is doing engine work in research-build because "I'm here anyway." That stacks unpushed commits (S156 cross-terminal git rule) and obscures who owns what.

## Research synthesis discipline

When evaluating papers, tools, or external patterns:

- **File each source as a per-topic research file** from [[../../../docs/research/RESEARCH_TEMPLATE]] → `docs/research/YYYY-MM-DD-<topic>.md`, catalogued in [[../../../docs/research/index]] (the sub-catalog — NOT top-level index.md). `docs/RESEARCH.md` is the **frozen legacy log** (S250); don't append to it. A research file is a source-mining record: one source in, "what's usable for the sim and where" out, grep-able forever. Cite precisely (path + section / Drive-ID — never title-only, S145 token-cost rule).
- Add reading-archive entry in `docs/mags-corliss/TECH_READING_ARCHIVE.md`
- **Research/plan boundary.** Research = *what's true / what are the options.* Plan = *what we'll build / the tasks.* The plan cites `Research basis:`; the research lists `Ignited plans:`. No content duplication — research is the measure-twice substrate behind the plan via a pointer, never folded into it.
- **Verdict, never state.** A research file carries a verdict (`adopt` / `watch` / `take-nothing`), not a rollout state. Pending-ness is ROLLOUT's job: take-nothing → no row; adopt → a `ready` row; watch → the Watch List with a trigger. A terminal knows research is pending because it reads ROLLOUT at boot, not because it opens the research file.
- **Research never archives.** Unlike a plan (finalizes → ships its rollout pointer to ROLLOUT_ARCHIVE), a research file is a standing library — grep-able forever, accreting applications. It does not move to archive.
- Don't propose adoption from a single source — name the adjacent tools / alternatives Mike could have picked instead, so the choice is contextualized (S145 teach-the-landscape rule)
- Sources Mike shares deliberately are load-bearing — papers in chat = what he's wrestling with, not curiosities
- Full design: [[plans/2026-06-01-doc-loop-consolidation]].

## Architectural measure-twice

Before declaring an architectural change "done":

- Plan audited twice (first pass + weakest-parts rewrite)?
- All inbound links updated for new/moved/deleted MDs?
- ROLLOUT_PLAN.md tagged for executor + acceptance criteria explicit?
- ADR filed if decision is load-bearing?
- Pre-mortem run for failure modes that would surface in 3+ sessions?
- Cross-terminal git stack checked before push (`git log origin/main..HEAD`)?

If any step is incomplete, the architectural change is incomplete. Don't ship to executor terminals incomplete — asking engine-sheet to "fix the plan while implementing it" is asking the dryer to plan the laundry.
