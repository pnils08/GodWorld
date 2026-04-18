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
| `CLAUDE.md` | Zero layer — identity, rules, terminal architecture, memory systems |
| `.claude/rules/identity.md` | Non-negotiable behavioral rules (auto-loaded) |
| `docs/SCHEMA.md` | Doc conventions — naming, frontmatter, tags, folder map (Phase 41.1, S146) |
| `docs/index.md` | Catalog of every active doc — grep here before grepping the tree (Phase 41.2, S146) |
| `SESSION_CONTEXT.md` | Current state — cycle, versions, recent sessions (hook injects compact slice; don't re-read full) |
| `docs/mags-corliss/PERSISTENCE.md` | Mags character — light persona load, no family query |
| `.claude/terminals/research-build/TERMINAL.md` | This file — your scope, your docs, your rules |

---

## Persona Level: Light

Identity + PERSISTENCE (Mags-as-thinking-partner). No JOURNAL_RECENT, no queryFamily. The character shows up for research conversations and architectural planning without the newsroom/family ritual. Matches S165 spec: "my idea tank... we research together and create MDs." Full-persona work (editions, family) belongs in media or mags terminals.

---

## Owned Documentation

### Vision & Architecture

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/PRODUCT_VISION.md` | Where the project is heading | Architectural decisions |
| `docs/ARCHITECTURE_VISION.md` | Jarvis at /root, persistent sessions, north star | Big picture planning |
| `docs/BOOT_ARCHITECTURE.md` | Boot sequence design | Boot changes |
| `docs/WORKFLOWS.md` | Per-workflow logic, room definitions | Workflow changes |
| `docs/STACK.md` | Full tech stack | Infrastructure questions |

### Research

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/RESEARCH.md` | Findings log, all evaluations, sources | Any research |
| `docs/research4_1.md` | Engineering patterns — bounded memory, death spirals, dual-output | Architecture decisions |
| `docs/research4_2.md` | Ryan dissertation — story sifter, Hennepin, curation | Design philosophy |

### Planning & Rollout

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/engine/ROLLOUT_PLAN.md` | All project work, terminal handoff tags | Every session |
| `docs/engine/ROLLOUT_ARCHIVE.md` | Completed phase details | Past work reference |
| `docs/engine/REVIEWER_LANE_SCHEMA.md` | Phase 39.6 contract — four fields every reviewer lane JSON must satisfy | Phase 39.x work |

### Riley Integration

| File | What it covers | When to load |
|------|---------------|--------------|
| `riley/RILEY_PLAN.md` | Riley ecosystem inventory, active triggers, what to keep/replace | Riley work |

### Infrastructure Docs

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/SUPERMEMORY.md` | 5 containers, API, search patterns, terminal tagging | Memory system work |
| `docs/CLAUDE-MEM.md` | Claude-mem architecture | Memory system work |
| `docs/DASHBOARD.md` | 40 API endpoints, Express + React | Dashboard planning |
| `docs/DISCORD.md` | Bot architecture | Discord work |
| `docs/OPERATIONS.md` | Operational procedures | Process changes |

### Pipeline Design

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/EDITION_PIPELINE.md` | Pipeline v2 skills map (S134) | Pipeline design |

### Mags Persistence (owned — journals from this terminal)

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/mags-corliss/JOURNAL.md` | Full journal | Session end |
| `docs/mags-corliss/JOURNAL_RECENT.md` | Last 3 entries | Every boot |
| `docs/mags-corliss/PERSISTENCE.md` | Core Mags persistence | Identity questions |
| `docs/mags-corliss/NEWSROOM_MEMORY.md` | Newsroom institutional memory | Editorial planning |
| `docs/mags-corliss/NOTES_TO_SELF.md` | Running notes | On demand |
| `docs/mags-corliss/SESSION_HISTORY.md` | Session summary history | Session patterns |
| `docs/mags-corliss/TECH_READING_ARCHIVE.md` | Tech reading log | Research sessions |
| `docs/mags-corliss/DAILY_REFLECTIONS.md` | Nightly reflections | On demand |

### Session & Lifecycle Skills

| File | What it does |
|------|-------------|
| `.claude/skills/boot/SKILL.md` | Reload identity after compaction |
| `.claude/skills/session-startup/SKILL.md` | Manual fallback boot |
| `.claude/skills/session-end/SKILL.md` | Session close |
| `.claude/skills/save-to-mags/SKILL.md` | Deliberate brain save |
| `.claude/skills/grill-me/SKILL.md` | Deep interrogation of plans |

### Engine Health Skills (shared with engine terminal)

| File | What it does |
|------|-------------|
| `.claude/skills/health/SKILL.md` | Quick 30s pulse |
| `.claude/skills/pre-mortem/SKILL.md` | Pre-cycle scan |
| `.claude/skills/tech-debt-audit/SKILL.md` | Comprehensive code health |
| `.claude/skills/stub-engine/SKILL.md` | Function reference map |
| `.claude/skills/ctx-map/SKILL.md` | Field dependency map |
| `.claude/skills/deploy/SKILL.md` | Clasp push + verify |
| `.claude/skills/doc-audit/SKILL.md` | Check docs for staleness |
| `.claude/skills/visual-qa/SKILL.md` | Dashboard visual QA |

---

## NOT Your Files

- `.claude/agents/civic-office-*/*` — civic agents (civic terminal)
- `.claude/agents/civic-project-*/*` — civic project agents (civic terminal)
- `.claude/agents/*-desk/*` — desk reporter agents (media terminal)
- `docs/media/voices/*` — reporter voice files (media terminal)
- Engine phase code (`phase*/**/*.js`) — engine/sheet terminal executes, this terminal designs

---

## What This Terminal Does That Others Don't

1. **Designs before others build.** Architecture decisions, pipeline redesigns, new phase plans — all start here.
2. **Owns the rollout plan.** Tags work items with `(engine terminal)`, `(media terminal)`, `(civic terminal)` for handoff.
3. **Runs research sessions.** Evaluates external tools, reads papers, audits patterns. Writes to `docs/RESEARCH.md`.
4. **Journals.** Research findings, build decisions, architecture outcomes. Updates `JOURNAL.md` and `JOURNAL_RECENT.md`.
5. **Can do engine work if needed.** But the engine/sheet chat is the persistent home for engine state and connections.

---

## Handoff Protocol

### Handing work TO other terminals
1. Design the work, document in `ROLLOUT_PLAN.md`
2. Tag with `(engine terminal)`, `(media terminal)`, or `(civic terminal)`
3. Include: what to build, which docs to read, acceptance criteria
4. The other terminal picks it up and executes

### Receiving work FROM other terminals
1. Other terminals flag design/research needs in `ROLLOUT_PLAN.md` or `SESSION_CONTEXT.md`
2. This terminal picks it up in the next research/build session
3. Designs the solution, hands back for execution

### Supermemory saves
- Tag all saves with `[research/build]` prefix
- Use `/save-to-mags` for deliberate editorial/architectural decisions
- Stop hook auto-saves go to `super-memory` as usual

---

## Session Close

When `/session-end` runs in this terminal, follow these steps **in addition to** the shared steps (persistence counter, journal, JOURNAL_RECENT, SESSION_CONTEXT, verify, restart bot).

### Terminal-Specific Audit

| File | Check |
|------|-------|
| `docs/engine/ROLLOUT_PLAN.md` | Next Session Priorities refreshed? Phase statuses updated? Completed items moved to ROLLOUT_ARCHIVE? |
| `docs/RESEARCH.md` | New findings logged? Sources cited? (research sessions only) |
| `docs/mags-corliss/TECH_READING_ARCHIVE.md` | New research reading added? (if papers/tools were evaluated) |
| `docs/ARCHITECTURE_VISION.md` | Updated if architecture decisions were made? |
| `SESSION_CONTEXT.md` | Session entry tagged `[research/build]`? |

### Terminal-Specific Saves

1. **ROLLOUT_PLAN.md** — Refresh Next Session Priorities. Move completed items to ROLLOUT_ARCHIVE with full details. Tag any handoff items with their target terminal.
2. **RESEARCH.md** — If research was done, log findings with date, source, and actionable takeaways.
3. **`/save-to-mags`** — Save architecture decisions, design rationale, and anything the next session needs to understand *why* a choice was made. Tag with `[research/build]`.
4. **SESSION_CONTEXT.md** — Add session entry tagged `[research/build]`. Include what was designed, what was handed off, what's next.
