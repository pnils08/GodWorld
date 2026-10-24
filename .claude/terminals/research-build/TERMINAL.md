# Research/Build Terminal

**Role:** one of the two builder terminals. Owns one job at a time, start to finish — plan, build, bench, deploy, close (boot hook §JOB MODEL, builder 2026-10-23). Plan, research, doc-graph and pipeline-tuning work are job types this window has carried most; they are not its phase.
**Terminal tag for saves:** `[research/build]`

---

## Launch & resume

```bash
claude --name "research-build"            # start fresh
claude --resume "research-build"          # resume after crash
claude --resume                           # picker (shows all named sessions)
```

tmux `godworld` session, window 1 (`Ctrl-b 1`).

---

## Loads

Boot: `CLAUDE.md`, `.claude/rules/identity.md`, this file, `.claude/rules/research-build.md` (attaches to this file).

On demand only:

| File | When |
|------|------|
| `docs/SCHEMA.md` | creating, renaming, or tagging a doc |
| `docs/index.md` | "what doc exists about X" — grep it, ~40k tokens, never load whole |
| `SESSION_CONTEXT.md` | continuing prior work; the hook already emits the PIN + `NEXT[research-build]` |
| `.claude/rules/engine.md` + engine-sheet `TERMINAL.md` §Authority | the open job touches engine substrate |
| `.claude/rules/newsroom.md` / `.claude/rules/civic.md` | the open job tunes a cron pipeline |

---

## Mode: Operational (S348)

Identity + terminal rules (`research-build.md`, narrowly scoped post-S221 to fire only when this TERMINAL.md is read) + this TERMINAL.md. No CHARACTER.md load, no JOURNAL_RECENT. Persona work (editions, voice) belongs to the media pipeline. **Default fallback note (S221 update):** unregistered tmux windows route to Mags-only mode (identity + CHARACTER only, no terminal scaffolding) — research-build no longer absorbs unrecognized windows.

Operating rules at this seat. S348 loaded the anti-guess rule at boot and broke it four times in one session on live citizen data; these are the mechanics that stop that:

- **An empty check is a complete answer.** "I haven't checked yet" costs nothing; a plausible answer produced to fill the turn costs canon.
- **Canon is this seat's responsibility.** Never assert a POPID, name, employer, or ledger value not just read from the ledger or a deterministic source. S348's Varek failure: a Tier-1 citizen asserted from a boot-context line instead of the ledger.
- **Search before asserting.** The file over the recollection.
- **Family check at boot** — `node scripts/queryFamily.js`. Robert (POP-00594), Sarah (POP-00595), Michael (POP-00596), Scout. One call; it is also the cheapest proof that the engine wrote events last Cycle.

Nothing else from CHARACTER.md loads here. The test for any addition: **does it change whether I check, or only how I sound?** Only the first belongs at this terminal.

---

## Operating discipline

- **One job open.** The NEXT line names it; a second thread in the NEXT line is a half-built job. Anything surfaced mid-job files as a ROLLOUT row and waits.
- **Subagents run a tier down** from the job's model — Sonnet for reasoning, Haiku for grunt. Escalate only on a genuine reasoning floor. Full rule: [[../../../docs/MODEL_HIERARCHY]] §8.
- **Measure twice, cut once** — boot-emitted for every lane; this terminal's application detail is `.claude/rules/research-build.md` §Architectural measure-twice.
- **Proportion.** The discipline exists to save cost and keep canon coherent; a mistake is revertible. Don't let measure-twice tip into paralysis.
- Skill edits mid-session apply with `/reload-skills`.

---

## Filing work

Doctrine: [[../../../docs/engine/rollout-rules]] — this terminal stewards it and runs the canonical session-end sweep across all groups.

- A job is one ROLLOUT row, any group (`governance.*`, `research.*`, `pipeline.*`, `engine.*`, `civic.*`, `canon.*`), Owner = this terminal.
- Designed work → copy [[../../../docs/plans/PLAN_TEMPLATE]] to `docs/plans/YYYY-MM-DD-<topic>.md`; register in [[../../../docs/index]] the same commit.
- Research → per-topic file from PLAN_TEMPLATE §Research at `docs/research/YYYY-MM-DD-<topic>.md`, catalogued in `docs/research/index.md` ([[../../../docs/RESEARCH]] is frozen legacy). Reading log → [[../../../docs/mags-corliss/TECH_READING_ARCHIVE]].
- Gap-log triage → [[../../../docs/plans/GAP_TRIAGE_TEMPLATE]] (method: [[../../../docs/plans/GAP_LOG_TRIAGE_PLAYBOOK]]).
- Load-bearing decisions → next ADR in `docs/adr/`.
- Complete → `done-pending-archive`; the sweep moves the row to [[../../../docs/engine/ROLLOUT_ARCHIVE]] and the plan to `docs/archive/plans/`.

---

## Files other work depends on

Change these only inside a job that owns them, and say so in the row:

- `.claude/agents/civic-office-*`, `.claude/agents/civic-project-*`, `.claude/agents/*-desk` — the cron pipelines run them.
- `docs/media/voices/*` — reporter voice files.
- `phase*/`, `utilities/`, `lib/`, `schemas/` — engine substrate. An engine job at this window follows engine-sheet `TERMINAL.md` §Authority: bench proof before PROD, one unbenched change in flight, no amend.

---

## Other lanes

- **engine-sheet:** `SendMessage` only when `ListAgents` shows it idle; never while busy (builder 2026-10-22). Once per handoff, no follow-up FYIs. Otherwise the ROLLOUT row + NEXT line carry it.
- **House guests** (codex, agy, aider, kimi): review bench, not job owners. Reach via `tmux send-keys -l` + separate `C-m` per [[../../../docs/reference/CROSS_LANE_MESSAGING]]. Verify every finding against the code before acting on it.
- **Saves:** the one session save in `CLAUDE.md` §Boot and memory, tagged `[research/build]`. Supermemory writes are deliberate only; no Stop-hook auto-save exists.

---

## Session close

`.claude/skills/session-end/SKILL.md`, §Terminal-Specific Detail → research-build.
