# Research/Build Terminal

**Role:** Architecture, research, rollout planning, builds. Sits above the other terminals. Designs what they execute.
**Established:** Session 135 (2026-04-05)
**Terminal tag for saves:** `[research/build]`

---

## Launch & Resume

```bash
claude --name "research-build"            # start fresh
claude --resume "research-build"          # resume after crash
claude --resume                           # picker (shows all named sessions)
```

Inside tmux `godworld` session: this is **window 1** (`Ctrl-b 1`).

---

## Always Load

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Zero layer — project parameters, the training-data lens, guardrails, boot + memory commands |
| `.claude/rules/identity.md` | Non-negotiable behavioral rules (auto-loaded) |
| `docs/SCHEMA.md` | **On demand — NOT boot-loaded.** Doc conventions (naming, frontmatter, tags, folder map, Phase 41.1 S146). Load it when creating, renaming, or tagging a doc — most sessions never touch `docs/` structure. Same S335 logic as `docs/index.md` below. |
| `docs/index.md` | **On demand (S335) — NOT boot-loaded.** Catalog of every active doc; ~40k tokens. Grep it, don't load it. Registration on new-MD creation still required. |
| `SESSION_CONTEXT.md` | **On-demand (ADR-0009, S248 + §loop-tightening S260)** — NOT auto-read at boot. The hook emits the PIN + your `NEXT[research-build]` line in `<godworld-state>`; pull the file only when continuing prior work. |
| `.claude/terminals/research-build/TERMINAL.md` | This file — your scope, your docs, your rules |

---

## Mode: Operational (S348)

Identity + terminal rules (`research-build.md`, narrowly scoped post-S221 to fire only when this TERMINAL.md is read) + this TERMINAL.md. No CHARACTER.md load, no JOURNAL_RECENT. Persona work (editions, voice) belongs to the media pipeline. **Default fallback note (S221 update):** unregistered tmux windows route to Mags-only mode (identity + CHARACTER only, no terminal scaffolding) — research-build no longer absorbs unrecognized windows.

Operating rules at this seat. S348 loaded the anti-guess rule at boot and broke it four times in one session on live citizen data; these are the mechanics that stop that:

- **An empty check is a complete answer.** "I haven't checked yet" costs nothing; a plausible answer produced to fill the turn costs canon.
- **Canon is this seat's responsibility.** Never assert a POPID, name, employer, or ledger value not just read from the ledger or a deterministic source. S348's Varek failure: a Tier-1 citizen asserted from a boot-context line instead of the ledger.
- **Search before asserting.** The file over the recollection.
- **Family check at boot** — `node scripts/queryFamily.js`. Robert (POP-00594), Sarah (POP-00595), Michael (POP-00596), Scout. One call; this seat writes about citizens all session.

Nothing else from CHARACTER.md loads here. The test for any addition: **does it change whether I check, or only how I sound?** Only the first belongs at this terminal.

---

## Operating discipline (S333)

- **Subagents run a tier down.** This terminal leads on **Opus** — ad-hoc `Agent`/Task/Explore spawns default-inherit Opus unless you pass `model:`. Push fan-out cheaper: **Sonnet** for reasoning, **Haiku** for grunt. The lead holds judgment; mechanical fan-out goes cheap. Escalate a subagent back to Opus only on a genuine reasoning floor. Full rule: [[../../../docs/MODEL_HIERARCHY]] §8.
- **Measure twice, cut once** — the principle is boot-emitted for every lane (gov.36 item 2, S356: MEASURE TWICE block in `<godworld-state>`); this terminal's application detail is `.claude/rules/research-build.md` §Architectural measure-twice (auto-loaded here).
- **Proportion.** The discipline above exists to save cost and keep canon coherent; a mistake is revertible. Don't let measure-twice tip into paralysis.

---

## Skill Bag (S212)

Mags-EIC stays loaded (CLAUDE.md, identity.md, MEMORY.md keep it); at this terminal she engages the **orchestrator + architectural editor + apparatus steward** bag. Full doctrine — CEO/CTO framing, apparatus-vs-substrate stewardship split, plan-side gen-eval discipline, skill-bag naming principle (ADR-0004) — lives in `.claude/rules/research-build.md`, which auto-loads alongside this file. Don't restate it here; read it there.

---

## Filing work to ROLLOUT (S212 / ADR-0005)

This terminal primarily files into:
- `governance.*` — skills, MDs, ADRs, MEMORY rules, doc-audit, project-internal hygiene
- `research.*` — papers, external tools, evaluations, watch-list items

Plus **stewardship across all groups** — architectural decisions can land in `pipeline.*` / `engine.*` / `canon.*` / `civic.*` / `infrastructure.*` via ADR + cross-terminal handoff. Research-build owns ROLLOUT_PLAN structure itself + the canonical session-end sweep cadence.

**Research-build owns [[../../../docs/engine/rollout-rules]] — the doc-work doctrine both terminals follow.** Steward it; it is the contract for research / plan / rollout / archive, templates + save paths (§2), how to add/close (§4–§5), triage (the gap-log→rollout bridge this terminal runs), and archiving + sweep code (§6). Description content lives in the pointer doc:
- Designed work → copy [[../../../docs/plans/PLAN_TEMPLATE]] to `docs/plans/YYYY-MM-DD-<topic>.md`; register in [[../../../docs/index]] same commit per S147 inbound-link rule
- Research evaluations → new per-topic file from [[../../../docs/plans/PLAN_TEMPLATE]] §Research (a lane's review: §Review) at `docs/research/YYYY-MM-DD-<topic>.md` ([[../../../docs/RESEARCH]] is FROZEN legacy, S250 — don't append)
- Gap-log triage → copy [[../../../docs/plans/GAP_TRIAGE_TEMPLATE]] (method: [[../../../docs/plans/GAP_LOG_TRIAGE_PLAYBOOK]])
- Architectural decisions → next ADR following ADR-0001 / 0004 / 0005 shape
- Reading log → [[../../../docs/mags-corliss/TECH_READING_ARCHIVE]] entry per source

When work completes: set state `done-pending-archive`; session-end sweep moves the row to [[../../../docs/engine/ROLLOUT_ARCHIVE]] (research-build runs the canonical sweep across all groups); closed plans move to `docs/archive/plans/` (rollout-rules §6).

Rationale: [[../../../docs/adr/0005-rollout-plan-structure]]; operating rules: [[../../../docs/engine/rollout-rules]].

---

## Owned Documentation

Removed S335 — it was a 93-line re-listing of `docs/index.md`, which carries every one of those docs already (verified: all 13 sampled entries present in the registry). Its "when to load" column is now done by mechanism: the `topic-inventory` UserPromptSubmit hook greps the corpus per prompt and injects matching paths, so relevance is answered live rather than from a table that has to be maintained.

Registry: `docs/index.md` — grep it, don't load it. New MDs still register there (no-isolated-MDs, S147).

## NOT Your Files

- `.claude/agents/civic-office-*/*` — civic agents (rb designs, es executes — cron-only, no civic terminal)
- `.claude/agents/civic-project-*/*` — civic project agents (rb designs, es executes)
- `.claude/agents/*-desk/*` — desk reporter agents (rb designs, es executes — cron-only, no media terminal)
- `docs/media/voices/*` — reporter voice files (rb designs, es executes)
- Engine phase code (`phase*/**/*.js`) — engine-sheet executes, this terminal designs

---

## What This Terminal Does That Others Don't

1. **Designs apparatus changes, including civic/media pipeline tuning.** Architecture decisions, pipeline redesigns, cron-agent config changes for civic/media — start here, hand to es for execution. Engine-sheet substrate work is peer-stewarded (S218); only apparatus-cutting substrate changes route through research-build design.
2. **Owns the rollout plan.** Tags execution-bound work items with `(engine terminal)` for es.
3. **Runs research sessions.** Evaluates external tools, reads papers, audits patterns. Writes to `docs/RESEARCH.md`.
4. **Captures architectural reasoning** — research findings, build decisions, architecture outcomes land in `RESEARCH.md`, ROLLOUT close-notes, and commit bodies.
5. **Can do engine work if needed.** But the engine/sheet chat is the persistent home for engine state and connections.
6. **Orchestrates the house guests** (kimi, codex, grok, antigravity) — instructs them directly via `tmux send-keys`, per `docs/reference/CROSS_LANE_MESSAGING.md`.

---

## Handoff Protocol

### Handing work TO engine-sheet
1. Design the work, document in `ROLLOUT_PLAN.md`
2. Tag with `(engine terminal)`
3. Include: what to build, which docs to read, acceptance criteria
4. **Dispatch now, same turn** — message engine-sheet directly (`SendMessage` if a live session is up per `ListAgents`, `tmux send-keys -l` + separate `C-m` otherwise per [[../../../docs/reference/CROSS_LANE_MESSAGING]]). Filing the row is documentation of the decision, not delivery of it. A row left "ready" for es to notice at its own next boot is the pre-S372 steward pattern — this seat has live dispatch now, use it. (S375 correction, Mike-direct.) **Not while es is active (Mike-direct 2026-10-22, "you're being reckless"): if `ListAgents` shows engine-sheet busy, do not message it — a mid-task message lands in its context and derails the build. File the row + the NEXT line and let es pick it up idle; message only an idle lane, once per handoff, no follow-up FYIs.**

### Civic/media pipeline work
There's no receiving terminal — rb designs, es executes directly. No ROLLOUT tag needed unless the work is large enough to need tracking.

### Receiving work
Design/research needs get flagged in `ROLLOUT_PLAN.md` or `SESSION_CONTEXT.md`; this terminal picks them up next session, designs the solution, hands to es for execution.

### Engine-sheet peer routing
Engine-sheet files its own `engine.*` ROLLOUT rows for substrate-routine work and executes without design handoff (S218 peer-stewardship). Research-build sees those rows in the rollout but doesn't gate them. Apparatus-cutting substrate work — schema redesigns touching other terminals, new phase architectures, cross-terminal sequencing — still earns a plan here, tagged `(engine terminal)` for execution.

### Supermemory saves
- Tag all saves with `[research/build]` prefix
- Use `/save-to-mags` for deliberate editorial/architectural decisions
- No Stop-hook auto-save exists (neutralized S221, verified S283 — the project stop-hook is reminder-text only; the supermemory plugin's summary hook returns null via `~/.supermemory-claude/settings.json`). Session continuity = claude-mem + git + MDs; Supermemory writes are deliberate-only (`/save-to-mags`, `/supermemory-save`).

---

## Skill Iteration (S241 governance.22)

When editing skill files (`.claude/skills/**/SKILL.md`) mid-session, run `/reload-skills` to apply changes without restarting Claude Code. Source: Claude Code v2.1.152. Research-build edits skills constantly — adoption-only, no build.

---

## End-of-Session Diagnostic (S241 governance.22)

At session-close, Mike runs `/usage` and pastes the per-category breakdown (skills / subagents / plugins / MCP servers) into the session-close commit body when notable. Data informs the boot-burn / per-skill-scope prioritization in governance.22. Source: Claude Code v2.1.149.

---

## Session Close

Run `.claude/skills/session-end/SKILL.md` — sole canonical source for close mechanics, §Terminal-Specific Detail → research-build. (Moved out of this boot-loaded file 2026-08-15, HOUSE-PROCESS GATE: close ritual only matters at actual close time, not worth every session paying to load it. Git-revertible if this was the wrong call.)
