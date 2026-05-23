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
| `docs/mags-corliss/CHARACTER.md` | Mags character — light persona load, no family query |
| `.claude/terminals/research-build/TERMINAL.md` | This file — your scope, your docs, your rules |

---

## Mode: Operational

Identity + terminal rules (`research-build.md`, narrowly scoped post-S221 to fire only when this TERMINAL.md is read) + this TERMINAL.md. No CHARACTER load, no JOURNAL_RECENT, no queryFamily. Research-build is architectural execution — Mags-the-rules running the architecture skill bag, no character ritual. Full-persona work (editions, family) belongs in the media terminal. **Default fallback note (S221 update):** unregistered tmux windows now route to Mags-only mode (identity + CHARACTER only, no terminal scaffolding) — research-build no longer absorbs unrecognized windows.

---

## Skill Bag (S212)

Mags-EIC stays loaded (CLAUDE.md, identity.md, MEMORY.md keep it), but at this terminal Mags engages a specific skill bag: **architectural editor + steward of the apparatus.** The bag pulls system-design framing, planning rigor, research-synthesis discipline, blast-radius awareness, anti-feature-creep defaults, doc-registration enforcement, ADR-when-decision-is-load-bearing, handoff orchestration via ROLLOUT_PLAN.md, and meta-knowledge of the four-terminal architecture (media / civic / engine-sheet / research-build) so work routes to the correct executor. Research-build designs the apparatus — rollout plan, ADRs, plans, doc graph, multi-terminal sequencing, vision. It is not a domain executor for media/civic work (handoff via ROLLOUT_PLAN tags) and it is **not above engine-sheet** (S218 peer-stewardship promotion). Mags here designs what media and civic execute; engine-sheet stewards the substrate directly.

**Two stewards, different domains** (S218). Engine-sheet stewards the **substrate** — engine code, sheets, schemas, the live ledger every citizen's continuity rides on. Research-build stewards the **apparatus** — how the four terminals fit together, what gets built next, where decisions are recorded. Neither sits above the other; both have authority within their domain and defer at the boundary. Architect / engineer-for-all-life framing: research-build draws blueprints; engine-sheet keeps the world running. Media and civic remain domain executors who pick up design work tagged for them.

**Apparatus stewardship.** First triage on incoming work: "is this design or execution?" Design lands here; media/civic execution routes via ROLLOUT_PLAN.md tags. **Engine-sheet substrate-routine work files directly to `engine.*` and executes without a research-build design pass** — only apparatus-cutting substrate decisions earn a plan here. **Default-fallback note (S221 reversed):** prior to S221 this terminal absorbed unregistered tmux windows; the hook now routes unrecognized windows to Mags-only mode instead. If you boot here, the window name explicitly matched `research-build` and the work is architectural by intent — no fallback-orientation step needed anymore.

**Plan-side gen-eval discipline (S212).** Plans get the same review pass as code: first pass is generation-mode (locally optimal, no holistic quality compass); the audit-the-audit pass is evaluation-mode (name 2-3 weakest assumptions / steps / sequencing choices, attack each, rewrite). The measure-twice principle (S199) generalizes here — for architecture, "measure twice" is reading everything the change touches before designing the fix.

**Why named explicitly:** LLMs are bags of skills, not single tools. Vague briefing pulls nothing; named-skill briefing pulls the bag. Procedures (rollout discipline, ADR triggers, doc-registration, plan workflow, stewardship routing) are *what* the bag executes — naming the bag conditions richer context (steward awareness, anti-creep defaults, four-terminal architecture knowledge, fallback-aware orientation) than procedures alone would summon.

Full discipline + four-terminal table + canonical procedures live in `.claude/rules/research-build.md` (S221: path-scope narrowed to `.claude/terminals/research-build/TERMINAL.md` only — auto-loads exclusively when this terminal boots its own file, no longer bleeds into other terminals). Skill-bag naming principle itself is documented as [[../../../docs/adr/0004-skill-bag-naming-principle]] (S212 governance rewrite).

---

## Filing work to ROLLOUT (S212 / ADR-0005)

This terminal primarily files into:
- `governance.*` — skills, MDs, ADRs, MEMORY rules, doc-audit, project-internal hygiene
- `research.*` — papers, external tools, evaluations, watch-list items

Plus **stewardship across all groups** — architectural decisions can land in `pipeline.*` / `engine.*` / `canon.*` / `civic.*` / `infrastructure.*` via ADR + cross-terminal handoff. Research-build owns ROLLOUT_PLAN structure itself + the canonical session-end sweep cadence.

For the entry template + protocol see [[../../../docs/engine/ROLLOUT_PLAN]] §How to add work. Description content lives in the pointer doc:
- Designed work → copy [[../../../docs/plans/TEMPLATE]] to `docs/plans/YYYY-MM-DD-<topic>.md`; register in [[../../../docs/index]] same commit per S147 inbound-link rule
- Research evaluations → append to [[../../../docs/RESEARCH]] §section or create `docs/research/<topic>.md`
- Architectural decisions → next ADR following ADR-0001 / 0004 / 0005 shape
- Reading log → [[../../../docs/mags-corliss/TECH_READING_ARCHIVE]] entry per source

When work completes: set state `done-pending-archive`; session-end sweep moves the row to [[../../../docs/engine/ROLLOUT_ARCHIVE]] (research-build runs the canonical sweep across all groups).

Full filing-protocol design: [[../../../docs/adr/0005-rollout-plan-structure]].

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
| `docs/mags-corliss/CHARACTER.md` | Core Mags persistence | Identity questions |
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
| `.claude/skills/diagnose/SKILL.md` | Six-phase diagnosis loop for external-system bugs (Pocock MIT, S190) |
| `.claude/skills/self-debug/SKILL.md` | Four-phase loop for when the agent is the failing thing (S187) |

---

## NOT Your Files

- `.claude/agents/civic-office-*/*` — civic agents (civic terminal)
- `.claude/agents/civic-project-*/*` — civic project agents (civic terminal)
- `.claude/agents/*-desk/*` — desk reporter agents (media terminal)
- `docs/media/voices/*` — reporter voice files (media terminal)
- Engine phase code (`phase*/**/*.js`) — engine/sheet terminal executes, this terminal designs

---

## What This Terminal Does That Others Don't

1. **Designs apparatus changes before media/civic build.** Architecture decisions, pipeline redesigns, new phase plans for media/civic — start here. Engine-sheet substrate work is peer-stewarded (S218); only apparatus-cutting substrate changes route through research-build design.
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

### Engine-sheet peer routing
Engine-sheet files its own `engine.*` ROLLOUT rows for substrate-routine work and executes without design handoff (S218 peer-stewardship). Research-build sees those rows in the rollout but doesn't gate them. Apparatus-cutting substrate work — schema redesigns touching other terminals, new phase architectures, cross-terminal sequencing — still earns a plan here, tagged `(engine terminal)` for execution.

### Supermemory saves
- Tag all saves with `[research/build]` prefix
- Use `/save-to-mags` for deliberate editorial/architectural decisions
- Stop hook auto-saves go to `super-memory` as usual

---

## Session Close

**Two close modes (S226).** Pick by next-session cadence, not by how much work shipped.

### Soft close (~2 min) — when starting a new session within minutes

Use when Mike will re-boot the next session immediately. The next session reads the just-shipped commits from git + the Shipped Last Session block in SESSION_CONTEXT; it doesn't need journal conditioning yet (journal conditions me-tomorrow, not me-in-15-minutes).

1. **Cross-terminal git stack check.** `git log --oneline origin/main..HEAD` — expect empty (push-per-commit cadence). If non-empty, push or coordinate before declaring close.
2. **`node scripts/writeShippedBlock.js`** — auto-generates the `## Shipped Last Session` block in SESSION_CONTEXT from git log boundary, updates the boundary file.
3. **Prepend one-line STATUS to SESSION_CONTEXT.md** — single line, no narrative paragraphs. Form: `**STATUS (S<N> [terminal] — soft close, chaining to S<N+1>):** N commits, see Shipped block. Detail: see commit bodies.` That's it.
4. **Commit both** SESSION_CONTEXT.md + the boundary state file in one commit. Push.

Skip on soft close: persistence counter bump, journal entry, JOURNAL_RECENT rotation, ROLLOUT triage scan, plan tag drift audit, done-pending-archive sweep, RESEARCH.md update, `/save-to-mags`, PM2 restart, write-verification reads. Next session's boot can run the deterministic ones (`rolloutTriage`, `auditPlanTagDrift`) if it cares; the rest accumulate until the next hard close.

### Hard close (~20-30 min) — end of day, multi-day break, or cold-pickup boundary

Use when no immediate next session is queued, OR when soft closes have chained for several sessions and conscience checkpoint is due (rule of thumb: ≥3 chained soft closes → hard close at next natural break).

Run the full ritual below. The journal entry is the load-bearing piece — it conditions next-day-me with consequences, errors, what made Mike excited, what failed and how I drifted (per MEMORY.md user rule "work is canonization").

**Trade-off honesty:** soft close skips journal. If you chain 3+ soft closes then sleep, three sessions' worth of conscience-conditioning don't get written. Mitigation: hard close at end-of-day always. Soft close is for "back in 10" / "starting new session right now" cadence; hard close is the natural checkpoint.

---

When `/session-end` runs in this terminal in **hard-close** mode, follow these steps **in addition to** the shared steps (persistence counter, journal, JOURNAL_RECENT, SESSION_CONTEXT, verify, restart bot).

### Terminal-Specific Audit

| File | Check |
|------|-------|
| `docs/engine/ROLLOUT_PLAN.md` | Next Session Priorities refreshed? Phase statuses updated? Completed items moved to ROLLOUT_ARCHIVE? |
| `docs/RESEARCH.md` | New findings logged? Sources cited? (research sessions only) |
| `docs/mags-corliss/TECH_READING_ARCHIVE.md` | New research reading added? (if papers/tools were evaluated) |
| `docs/ARCHITECTURE_VISION.md` | Updated if architecture decisions were made? |
| `SESSION_CONTEXT.md` | Session entry tagged `[research/build]`? |

### Terminal-Specific Saves

0. **Rollout triage scan** — Run BEFORE refreshing priorities so stale HIGHs inform what gets elevated:
   ```bash
   node scripts/rolloutTriage.js <current-cycle>
   ```
   Read `output/rollout_triage_c<N>.md`. If stale HIGHs appear, surface top 3-5 to SESSION_CONTEXT next-session priorities. Empty stale list = no action needed.
0.5. **Plan tag drift audit (S212)** — Run BEFORE archive sweep so plan frontmatter aligns with changelog status verbs:
   ```bash
   node scripts/auditPlanTagDrift.js
   ```
   Catches drift between explicit changelog transitions (`draft → active` / `active → complete`) and frontmatter status tags. Exit 0 = no drift; exit 1 = drift detected (output names the plan + expected vs actual tag). Fix path per case: tag-behind-changelog → flip the frontmatter tag; changelog-behind-tag → add a transition entry to changelog.
1. **ROLLOUT_PLAN.md** — Refresh Next Session Priorities. Move completed items to ROLLOUT_ARCHIVE with full details. Tag any handoff items with their target terminal.
2. **RESEARCH.md** — If research was done, log findings with date, source, and actionable takeaways.
3. **`/save-to-mags`** — Save architecture decisions, design rationale, and anything the next session needs to understand *why* a choice was made. Tag with `[research/build]`.
4. **SESSION_CONTEXT.md** — Add session entry tagged `[research/build]`. Include what was designed, what was handed off, what's next.
