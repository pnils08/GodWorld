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
| `SESSION_CONTEXT.md` | **On-demand (ADR-0009, S248 + §loop-tightening S260)** — NOT auto-read at boot. The hook emits the PIN + your `NEXT[research-build]` line in `<godworld-state>`; pull the file only when continuing prior work. |
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

**Research-build owns [[../../../docs/engine/rollout-rules]] — the doc-work doctrine all four terminals follow.** Steward it; it is the contract for research / plan / rollout / archive, templates + save paths (§2), how to add/close (§4–§5), triage (the gap-log→rollout bridge this terminal runs), and archiving + sweep code (§6). Description content lives in the pointer doc:
- Designed work → copy [[../../../docs/plans/TEMPLATE]] to `docs/plans/YYYY-MM-DD-<topic>.md`; register in [[../../../docs/index]] same commit per S147 inbound-link rule
- Research evaluations → new per-topic file from [[../../../docs/research/TEMPLATE]] at `docs/research/YYYY-MM-DD-<topic>.md` ([[../../../docs/RESEARCH]] is FROZEN legacy, S250 — don't append)
- Gap-log triage → copy [[../../../docs/plans/GAP_TRIAGE_TEMPLATE]] (method: [[../../../docs/plans/GAP_LOG_TRIAGE_PLAYBOOK]])
- Architectural decisions → next ADR following ADR-0001 / 0004 / 0005 shape
- Reading log → [[../../../docs/mags-corliss/TECH_READING_ARCHIVE]] entry per source

When work completes: set state `done-pending-archive`; session-end sweep moves the row to [[../../../docs/engine/ROLLOUT_ARCHIVE]] (research-build runs the canonical sweep across all groups); closed plans move to `docs/archive/plans/` (rollout-rules §6).

Rationale: [[../../../docs/adr/0005-rollout-plan-structure]]; operating rules: [[../../../docs/engine/rollout-rules]].

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
| `docs/research/TEMPLATE.md` | Research-file template (S250) — source-mining record shape + verdict-not-state + never-archives rules | Filing any new research source |
| `docs/research/index.md` | Research sub-catalog — every per-topic research instance | Finding prior research before re-reviewing a source |
| `docs/RESEARCH.md` | **FROZEN legacy learning log** (S99–S248) — findings + early AI-literacy. New research → per-topic files via the template | Historical reference only |
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

### Mags Persistence (read-on-demand — journal is media-owned)

**The journal is media-only (S249 governance.20).** This terminal does not write `JOURNAL.md` / `JOURNAL_RECENT.md` at session-close — operational mode reads no JOURNAL_RECENT at boot, so a journal write conditions nothing here. Architectural reasoning lands in ROLLOUT close-notes / RESEARCH.md / commit bodies. Sole journal owner: media TERMINAL.md.

| File | What it covers | When to load |
|------|---------------|--------------|
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
| `.claude/skills/save-to-profile/SKILL.md` | Deliberate static User Profile write — identity layer (S238 / governance.17) |
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
4. **Captures architectural reasoning** — research findings, build decisions, architecture outcomes land in `RESEARCH.md`, ROLLOUT close-notes, and commit bodies (NOT the journal — that's media-only, S249 governance.20).
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
- No Stop-hook auto-save exists (neutralized S221, verified S283 — the project stop-hook is reminder-text only; the supermemory plugin's summary hook returns null via `~/.supermemory-claude/settings.json`). Session continuity = claude-mem + git + MDs; Supermemory writes are deliberate-only (`/save-to-mags`, `/supermemory-save`).

---

## Skill Iteration (S241 governance.22)

When editing skill files (`.claude/skills/**/SKILL.md`) mid-session, run `/reload-skills` to apply changes without restarting Claude Code. Source: Claude Code v2.1.152. Research-build edits skills constantly — adoption-only, no build.

---

## End-of-Session Diagnostic (S241 governance.22)

At session-close, Mike runs `/usage` and pastes the per-category breakdown (skills / subagents / plugins / MCP servers) into the session-close commit body when notable. Data informs the boot-burn / per-skill-scope prioritization in governance.22. Source: Claude Code v2.1.149.

---

## Session Close

**Two close modes (S226).** Pick by next-session cadence, not by how much work shipped.

### Soft close (~2 min) — when starting a new session within minutes

Use when Mike will re-boot the next session immediately. The next session boots on the carried set — PIN + this terminal's NEXT line in SESSION_CONTEXT — plus git log on demand. (This terminal writes no journal at all — S249 governance.20 — so there's no conditioning to defer; the soft/hard distinction here is purely about the sweep + audit overhead.)

**The carried set (ADR-0009 §loop-tightening): SESSION_CONTEXT carries exactly `{PIN, NEXT[terminal]}`, and that is exactly what boot reads.** No STATUS paragraph, no Shipped block — both retired. Soft and hard close write the *same* two things. **Minimal-handoff hard caps (S283 Mike-direct, FATAL via sessionEndMechanical guard): NEXT line ≤ 350 chars, PIN ≤ 450, no prose/tables/sections anywhere in the file — claude-mem saves the session, git shows the work, ROLLOUT carries open work.**

1. **Cross-terminal git stack check.** `git log --oneline origin/main..HEAD` — expect empty (push-per-commit cadence). If non-empty, push or coordinate before declaring close.
2. **Update the carried set in SESSION_CONTEXT.md** — the `**PIN:**` line (Session N→N+1, Day/Cycle/Edition as they changed) + your `**NEXT[research-build]:**` line (one line: what next session opens with). Don't touch other terminals' NEXT lines. That is the whole write.
3. **Commit** SESSION_CONTEXT.md (with any work commits). Push.

Skip on soft close: journal entry, JOURNAL_RECENT rotation, plan tag drift audit, done-pending-archive sweep, RESEARCH.md update, `/save-to-mags`, PM2 restart, write-verification reads. Next session's boot can run the deterministic ones (`auditPlanTagDrift`) if it cares; the rest accumulate until the next hard close. (`rolloutTriage` RETIRED S235 — governance.6 close; compounding-HIGH problem now structurally addressed by state taxonomy + per-terminal sweep + governance.10 archive cadence.)

### Hard close (~5-10 min) — end of day, multi-day break, or cold-pickup boundary

Use when no immediate next session is queued, OR when soft closes have chained for several sessions and conscience checkpoint is due (rule of thumb: ≥3 chained soft closes → hard close at next natural break).

**Trade-off honesty:** research-build writes no journal (S249 governance.20), so the chained-soft-close conscience cost that bites the media terminal does not apply here. The real soft-close risk is ROLLOUT / RESEARCH.md drift accumulating — done-pending-archive rows not swept, findings not logged. Hard close at end-of-day catches those up.

Per S229 governance.7 the hard-close ritual collapsed from 13 steps to 4 model + 1 mechanical (`scripts/sessionEndMechanical.js`). Run the slimmed `/session-end` SKILL: Step 0 detect terminal → **Step 1 journal is SKIPPED here (media-only, S249 governance.20)** → Step 2 SESSION_CONTEXT PIN + NEXT[research-build] + ROLLOUT updates → Step 3 mechanical script → Step 4 commit & push. Full skill: `.claude/skills/session-end/SKILL.md` v2.3.

### Terminal-Specific Audit

Read before Step 2 — surface any stale files in the NEXT line or fix inline.

| File | Check |
|------|-------|
| `docs/engine/ROLLOUT_PLAN.md` | Next Session Priorities refreshed? Phase statuses updated? Completed items moved to ROLLOUT_ARCHIVE? |
| `docs/RESEARCH.md` | New findings logged? Sources cited? (research sessions only) |
| `docs/mags-corliss/TECH_READING_ARCHIVE.md` | New research reading added? (if papers/tools were evaluated) |
| `docs/ARCHITECTURE_VISION.md` | Updated if architecture decisions were made? |
| `SESSION_CONTEXT.md` | PIN refreshed + `NEXT[research-build]` line updated? |

### Terminal-Specific Saves (Step 2 — model judgment)

Update during Step 2 of the slimmed SKILL alongside SESSION_CONTEXT + ROLLOUT:

- **ROLLOUT_PLAN.md** — refresh Next Session Priorities; flip closed rows to `done-pending-archive`; move fully-closed clusters to `ROLLOUT_ARCHIVE.md` with full details. Tag handoff items with their target terminal.
- **RESEARCH.md** — if research was done, log findings with date, source, and actionable takeaways.
- **`/save-to-mags`** — save architecture decisions, design rationale, anything the next session needs to understand *why* a choice was made. Tag with `[research/build]`. Optional — model judgment.
- **SESSION_CONTEXT.md PIN + NEXT[research-build] line** — refresh the PIN (Session/Day/Cycle/Edition); one NEXT line: what next session opens with. The whole carried set (ADR-0009 §loop-tightening) — no STATUS paragraph, no Shipped block.

**Mechanical (Step 3) — auto-runs from `sessionEndMechanical.js --terminal=research-build`:** `auditPlanTagDrift` (informational, never fatal) + cross-terminal git stack check + opt-in `--rotate-history` SESSION_CONTEXT → SESSION_HISTORY rotation + `pm2 restart`. (`writeShippedBlock` RETIRED ADR-0009 §loop-tightening — the carried set is `{PIN, NEXT[terminal]}`, hand-written in Step 2. No `rotateJournalRecent` / JOURNAL content-quality — media-only per S249 governance.20; the script auto-skips them for this terminal arg.) Plan: [[../../../docs/plans/2026-05-23-session-end-collapse]]. (`rolloutTriage` step removed S235 — see governance.6 close.)
