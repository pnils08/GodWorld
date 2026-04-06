# Engine/Sheet Terminal

**Role:** Engine code, sheet structure, clasp deploys. Persists on all engine state and how it connects.
**Established:** Session 135 (2026-04-05)
**Terminal tag for saves:** `[engine/sheet]`

---

## Launch & Resume

```bash
claude --name "engine-sheet"              # start fresh
claude --resume "engine-sheet"            # resume after crash
claude --resume                           # picker (shows all named sessions)
```

Inside tmux `godworld` session: this is **window 2** (`Ctrl-b 2`).

---

## Always Load

These files define the project, your rules, and current state. Read at every boot.

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Zero layer — identity, rules, terminal architecture, memory systems |
| `.claude/rules/identity.md` | Non-negotiable behavioral rules (auto-loaded) |
| `.claude/rules/engine.md` | Engine code rules — ctx.rng, write-intents, cascade deps (auto-loaded on engine files) |
| `SESSION_CONTEXT.md` | Current state — cycle, versions, recent sessions |
| `README.md` | Project overview, 11-phase engine, structure, tech stack |
| `.claude/terminals/engine-sheet/TERMINAL.md` | This file — your scope, your docs, your rules |

---

## Owned Documentation

These are the files this terminal is responsible for keeping current. When you change engine code or sheet structure, update the relevant doc here.

### Engine Architecture

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/engine/ENGINE_MAP.md` | Every engine function in execution order | Any engine work |
| `docs/engine/ENGINE_STUB_MAP.md` | Condensed function reference — ctx reads/writes per function | Quick lookup |
| `docs/engine/ROLLOUT_PLAN.md` | All project work, terminal handoff tags | Planning, status checks |
| `docs/engine/ROLLOUT_ARCHIVE.md` | Completed phase details | When asked about past work |
| `docs/reference/V3_ARCHITECTURE.md` | Full V3 technical spec — ctx, write-intents, phases | Deep engine work |
| `docs/engine/CYCLE_SEPARATION.md` | How phases connect | Phase dependency work |
| `docs/engine/PHASE_DATA_AUDIT.md` | Phase-level data flow audit | Data flow questions |
| `docs/engine/tech_debt_audits/2026-03-26.md` | Latest tech debt scan | Health checks |

### Sheets & Data

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/SPREADSHEET.md` | 65-tab audit, active/dead tabs, gotchas | Any sheet work |
| `docs/SIMULATION_LEDGER.md` | 675 citizens, 46 columns (A-AT), column reference | Citizen data work |
| `docs/engine/SHEETS_MANIFEST.md` | Which scripts read/write which tabs | Tracing data flow |
| `docs/engine/LEDGER_AUDIT.md` | Ledger integrity findings | Data quality work |
| `docs/engine/LEDGER_REPAIR.md` | Past repair work | Before attempting repairs |
| `docs/engine/LEDGER_HEAT_MAP.md` | Column usage frequency | Optimization, cleanup |

### Pipeline & Deployment

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/EDITION_PIPELINE.md` | Pipeline v2 skills map (S134) | Pipeline work |
| `docs/reference/DEPLOY.md` | Clasp push process | Deploying |
| `docs/OPERATIONS.md` | Operational procedures | Maintenance |
| `docs/engine/INTAKE_REDESIGN.md` | Intake system redesign spec | Intake work |
| `docs/engine/INTAKE_REDESIGN_PLAN.md` | Intake plan (30% complete) | Intake work |

### Civic Engine

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/engine/INSTITUTIONAL_VOICE_AGENTS.md` | Voice agent architecture | Civic phase work |
| `docs/engine/phase19_agent_personas.md` | Agent persona definitions | Agent config work |
| `docs/engine/PHASE_24_PLAN.md` | Citizen Life Engine plan | Life event work |
| `docs/mara-vance/CIVIC_GOVERNANCE_MASTER_REFERENCE.md` | Council, factions, governance rules | Civic logic |
| `docs/mara-vance/CIVIC_ELECTION_ENGINE.md` | Election engine spec | Election logic |
| `docs/mara-vance/INITIATIVE_TRACKER_VOTER_LOGIC.md` | Vote logic | Initiative work |
| `docs/mara-vance/CIVIC_VETO_IMPLEMENTATION.md` | Veto rules | Veto logic |

### Infrastructure (shared — load when touching)

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/SUPERMEMORY.md` | 5 containers, API, search patterns, terminal tagging | Supermemory integration |
| `docs/CLAUDE-MEM.md` | Claude-mem system | Memory system work |
| `docs/DASHBOARD.md` | 40 API endpoints, Express + React | Dashboard integration |
| `docs/STACK.md` | Full tech stack | Infrastructure questions |

### Research Context (read-only — owned by research/build terminal)

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/RESEARCH.md` | Findings log, evaluations, sources | When research informs a build |
| `docs/research4_1.md` | Engineering patterns — bounded memory, death spirals | Architecture decisions |
| `docs/research4_2.md` | Ryan dissertation — story sifter, curation | Design philosophy |
| `riley/RILEY_PLAN.md` | Riley ecosystem, active triggers, what to keep/replace | Riley integration |

### Vision (read-only — owned by research/build terminal)

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/PRODUCT_VISION.md` | Where the project is heading | Architectural decisions |
| `docs/ARCHITECTURE_VISION.md` | Jarvis at /root, persistent sessions | North star |
| `docs/BOOT_ARCHITECTURE.md` | Boot sequence design | Boot changes |
| `docs/WORKFLOWS.md` | Per-workflow logic | Workflow changes |

---

## NOT Your Files

These belong to other terminals. Don't edit without coordination.

- `docs/media/voices/*` — 17 reporter voice files (media terminal)
- `docs/media/*` — style guides, citizen tracking, Drive manifests (media terminal)
- `.claude/agents/*/IDENTITY.md`, `RULES.md`, `SKILL.md` — agent configs (media/civic terminals)
- `docs/mags-corliss/*` — journal, reflections (research/build terminal)
- `docs/mara-vance/OPERATING_MANUAL.md`, `AUDIT_HISTORY.md` — Mara's operating docs (media terminal)
- `.claude/skills/*/SKILL.md` — skill files (owned by whichever terminal built the skill)

---

## Engine Health Commands

| Command | What it does | When to run |
|---------|-------------|-------------|
| `/health` | Quick 30s pulse check | Start of session, after deploys |
| `/ctx-map` | Field dependency map | Before modifying phase functions |
| `/deploy` | Clasp push + verify | After code changes approved |
| `/pre-mortem` | Full pre-cycle scan | Before running a cycle |
| `/tech-debt-audit` | Comprehensive code health | Every 3-5 sessions |
| `/stub-engine` | Function reference map | Quick lookup |
| `/doc-audit` | Check docs for staleness | After major changes |

---

## Handoff Protocol

When the research/build terminal designs something that needs code:
1. The work item appears in `ROLLOUT_PLAN.md` tagged `(engine terminal)`
2. This terminal picks it up, reads the relevant docs, executes
3. After completion, update `ROLLOUT_PLAN.md` status and `SESSION_CONTEXT.md`
4. Tag Supermemory saves with `[engine/sheet]` prefix

When this terminal discovers something that needs design/research:
1. Note it in `ROLLOUT_PLAN.md` or `SESSION_CONTEXT.md`
2. Research/build terminal picks it up next session

---

## Current Engine State

- **Engine version:** v3.1
- **Cycle:** 90 (October 2041)
- **Citizens:** 675 (ENGINE 509, GAME 91, CIVIC 46, MEDIA 29)
- **Columns:** 46 (A-AT). Past Z: Income=col26, EducationLevel=col31, CareerStage=col33
- **Pipeline:** v2 (S134) — 4 terminals, 9 reporters, bounded traits
- **Last deploy:** Check `git log --oneline -5` and `clasp` status
- **Open engine items in rollout:** 33.6 (clerk script), 33.16 (world-data ingest), 33.17 (trait profiles)

---

## Session Close

When `/session-end` runs in this terminal, follow these steps **in addition to** the shared steps (persistence counter, journal, JOURNAL_RECENT, SESSION_CONTEXT, verify, restart bot).

### Terminal-Specific Audit

| File | Check |
|------|-------|
| `docs/engine/ENGINE_MAP.md` | Updated if functions were added, removed, or renamed? |
| `docs/engine/ENGINE_STUB_MAP.md` | Regenerated if function signatures changed? |
| `docs/engine/ROLLOUT_PLAN.md` | Phase statuses updated? Completed items archived? |
| `SESSION_CONTEXT.md` | Engine version bumped if code changed? Session entry tagged `[engine/sheet]`? |
| `docs/SPREADSHEET.md` | Updated if tabs were added, removed, or restructured? |
| `docs/SIMULATION_LEDGER.md` | Updated if columns changed? |

### Terminal-Specific Saves

1. **SESSION_CONTEXT.md** — Update engine version in the versions table if code was deployed. Add session entry tagged `[engine/sheet]`. Include what changed, what deployed, what broke.
2. **ROLLOUT_PLAN.md** — Update phase statuses. Move completed items to ROLLOUT_ARCHIVE.
3. **`/save-to-mags`** — Save engine decisions, deployment results, and anything the next session needs about *why* a change was made. Tag with `[engine/sheet]`.
4. **If code was deployed:** Note the clasp push result and what files were affected. Update Current Engine State section above.
