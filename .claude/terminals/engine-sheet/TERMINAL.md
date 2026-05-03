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
| `SESSION_CONTEXT.md` | Current state — cycle, versions, recent sessions (hook injects compact slice; don't re-read full) |
| `README.md` | Project overview, 11-phase engine, structure, tech stack |
| `.claude/terminals/engine-sheet/TERMINAL.md` | This file — your scope, your docs, your rules |

---

## Persona Level: Stripped

Identity + engine rules only. No PERSISTENCE.md, no JOURNAL_RECENT, no queryFamily. This is the lightest boot of all five terminals — Mags-the-name as a handle for identity rules, not the character. Matches S156 execute-and-commit spec and S165 refinement: "mags without her media context, family context... assistant to research-build."

**S165 Supermemory clarification:** Per S156, this terminal doesn't save to Supermemory for routine work. Per S165, **large project shifts** (phase closures, major architectural landings) may save a single pointer entry to Supermemory tagged `[engine/sheet]` pointing to the commit/rollout entry. Routine commits still don't save. The pointer is a breadcrumb, not a journal.

---

## Owned Documentation

These are the files this terminal is responsible for keeping current. When you change engine code or sheet structure, update the relevant doc here.

### Engine Architecture

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/engine/ENGINE_MAP.md` | Every engine function in execution order | Any engine work |
| `docs/engine/ENGINE_STUB_MAP.md` | Condensed function reference — ctx reads/writes per function | Quick lookup |
| `docs/engine/ROLLOUT_PLAN.md` | All project work, terminal handoff tags | Planning, status checks |
| `docs/engine/ENGINE_REPAIR.md` | Tactical tracker for known engine/sim defects (S148 audit) | Picking up repair work |
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
| `/graphify` | Codebase knowledge graph | Dependency questions, "what connects to what" |
| `graphify query "question"` | Query the persistent graph (CLI) | "What reads Initiative_Tracker?", "What depends on applySportsSeason?" |

**Graphify graph (S137b):** 1,152 nodes, 1,763 edges, 162 communities. Persists at `graphify-out/graph.json`. Full engine indexed — all 162 JS files across 11 phases + lib + utilities. Use instead of grepping when you need to trace dependencies or understand what a change will break.

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

- **Engine version:** v3.3
- **Cycle:** 92 (ran 2026-04-19 02:12 — `Riley_Digest` row for C92 present; Phase2-CityDynamics error recurring but non-blocking — see ENGINE_REPAIR follow-ups)
- **Citizens:** 836 in Simulation_Ledger post-S184 female-balance ingest (POP-00802..00951 added; +150 rows). Total population 1,200+ across all citizen tabs. Sheet trimmed S185 from 911 → 837 rows (74 trailing blank rows removed; last citizen POP-00951). See `docs/SIMULATION_LEDGER.md` for tier + mode breakdown.
- **Columns:** 47 (A-AU). Past Z: Income=col26, EducationLevel=col31, CareerStage=col33, Gender=col47 (AU).
- **Pipeline:** v2 (S134) — 4 terminals, 9 reporters, bounded traits
- **Feedback loop (S137b):** 3 intake channels operational — coverage ratings, sports feed (6 texture columns), civic voice sentiment. Initiative ImplementationPhase → neighborhood effects. Approval ratings dynamic. Citizen life events feel the loop.
- **Function count:** 154 engine files / 929 functions (S185 STUB_MAP regen post-DELETE batch). Down from S156 baseline due to 20-function dead-code removal (commit `bbdca3a`, ~722 LOC removed).
- **Last deploy:** S185 — 2 clasp pushes (`recordWorldEventsv3.js` v3.6 + DELETE batch). Apps Script-side has 7 fewer files post-DELETE.
- **Open engine items (post-E92):** See `docs/engine/ENGINE_REPAIR.md` (Row 8 Phase 42 — UNBLOCKED S185, redesign batch ready; Row 11 pipeline gating; Rows 1, 2, 4, 5, 6, 15, 17 closed S181-S184). Plus `docs/engine/ROLLOUT_PLAN.md` "Data & Pipeline" section.
- **S186 entry-task (engine-sheet):** **Phase 42 §5.6 phase05-ledger redesign batch** — ~10-13 commits in one session. Phase 1 init at `godWorldEngine2.js` pre-phase-04 entry; 18 SL touchers (16 full-range writers + 2 per-row + 5 post-phase05 readers) route through `ctx.ledger.rows`; Phase 10 single replace intent. Canonical doc: mags `hQE4rREEWBpS9aS1g3mQ3M`. Prereq-delete shipped S185 (`1a77e54` research-build); B2 mechanical migrations become trivial after this lands.
- **Refresh rule:** Update this block whenever a cycle runs or schema shifts. Stale state here poisons every engine-sheet boot.

---

## Session Close

**Engine-sheet runs a stripped-persona session-end.** Per S156 + S198 (loosened) rule (in MEMORY.md): "Engine-sheet terminal: execute and commit; coder persona. MDs allowed if they follow the no-isolated-MDs rule (register in `docs/index.md`, link both ways from a parent spec). No journal. No Supermemory writes for routine work; large project shifts may save a pointer entry per S165. Coder voice: terse, mechanical, commit-message style." That overrides the persona-state portions of the shared `/session-end` SKILL.md.

### What this terminal does NOT do at session-end

- ❌ **No PERSISTENCE.md counter update** — Mags-identity state belongs to the persona terminals
- ❌ **No journal entry** — stripped persona, no journal
- ❌ **No JOURNAL_RECENT.md rotation** — same
- ❌ **No `/save-to-mags`** — no Supermemory writes from this terminal
- ❌ **No goodbye message** — execute and commit, that's the model

### What this terminal DOES do at session-end

| Step | Action |
|---|---|
| 1 | **Code-state audit** (table below) |
| 2 | **Update SESSION_CONTEXT.md** — engine version bump if deployed; session entry tagged `[engine/sheet]` |
| 3 | **Update ROLLOUT_PLAN.md** — phase statuses, move completed items to ROLLOUT_ARCHIVE |
| 4 | **Commit & push** — the central act of this terminal (see `/session-end` SKILL.md Step 6.5 for the cross-terminal-stack check) |
| 5 | **Restart services** — `pm2 restart mags-bot godworld-dashboard` |

### Terminal-Specific Audit

| File | Check |
|------|-------|
| `docs/engine/ENGINE_MAP.md` | Updated if functions were added, removed, or renamed? |
| `docs/engine/ENGINE_STUB_MAP.md` | Regenerated if function signatures changed? (`/stub-engine`) |
| `docs/engine/ROLLOUT_PLAN.md` | Phase statuses updated? Completed items archived? |
| `SESSION_CONTEXT.md` | Engine version bumped if code deployed? Session entry tagged `[engine/sheet]`? |
| `docs/SPREADSHEET.md` | Updated if tabs were added, removed, or restructured? |
| `docs/SIMULATION_LEDGER.md` | Updated if columns changed? |
| Working tree | `git status --short` clean? Anything committed but unpushed? |

### Commit cadence

Engine-sheet typically commits **as it goes** — each migration batch, each phase ship, each helper script. Session-end is usually a **clean working tree** + final push, not a heavy commit.

If anything is uncommitted at session-end:

```bash
git status --short
git add <specific files — never `git add .`>
git commit -m "S<N> <topic>"
```

Cross-terminal stack check before push:

```bash
git log origin/main..HEAD --oneline
```

If smoke-test or verification is pending on something this session shipped, **note it in SESSION_CONTEXT** and hold push until verified. Pushing un-smoke-tested engine code is the worst version of premature push — it ships unverified infrastructure that other terminals' next cycle will run on the live spreadsheet.

### Deployment notes

If `clasp push` ran this session: note in SESSION_CONTEXT what files deployed + smoke-test status (run-or-pending). The `/diagnose` skill is the next-session feedback loop if anything regressed.

If only local commits (no clasp push): say so explicitly — "Code committed locally; clasp push pending next session" — so research-build / media / civic don't assume the live engine reflects the new code. (S188→S190 had a 2-session gap on the §5.6 redesign for exactly this reason; explicit notes prevent the confusion.)
