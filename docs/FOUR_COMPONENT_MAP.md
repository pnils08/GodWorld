---
title: Four-Component Architecture Map
created: 2026-04-16
updated: 2026-04-16
type: reference
tags: [architecture, infrastructure, active]
sources:
  - "docs/research/papers/paper4.pdf — Trustworthy agents in practice (Anthropic Policy, April 2026). Drive ID: 1VUSW6_w2lR2ttHKq8afUWLWLlhcH4k01"
  - "docs/research/papers/paper3.pdf — Scaling Managed Agents: Decoupling the brain from the hands (Anthropic Engineering, April 2026). Drive ID: 1QckZB2NOFIz3oU4SXZkoyDCczP4dfF6W"
  - "docs/engine/PHASE_40_PLAN.md §40.4"
pointers:
  - "[[index]] — catalog entry"
  - "[[engine/PHASE_40_PLAN]] — §40.4 source; §40.6 defense layers this map grounds"
  - "[[ARCHITECTURE_VISION]] — north star this map is a cross-section of"
  - "[[STACK]] — infrastructure detail for the environment column"
---

# Four-Component Architecture Map

**What runs where, in Anthropic's `model + harness + tools + environment` frame.**

Paper 4 names the four components every AI system has whether the architect names them or not: the **model** (the weights making decisions), the **harness** (the instructions and scaffolding shaping what the model does), the **tools** (what the model can reach), and the **environment** (where execution actually happens). GodWorld already has all four, assembled incrementally over 150+ sessions. This doc makes the assignments explicit so future sessions don't re-derive them.

---

## 1. The four components in GodWorld

| Component | What it is here | Where to find it |
|-----------|-----------------|------------------|
| **Model** | The LLM making each decision. Different roles use different models. | Inline per role (§3) |
| **Harness** | Skill files, identity rules, agent prompts — the instructions that shape what each model does | `.claude/skills/`, `.claude/agents/`, `.claude/rules/`, `CLAUDE.md`, `docs/mags-corliss/identity files` |
| **Tools** | What a model can reach — scripts, libraries, MCP servers, the bash/read/write primitives | `scripts/`, `lib/`, `.mcp.json`, plus the Claude Code built-ins |
| **Environment** | Where execution happens — which terminal, which machine, which account | `.claude/terminals/*/TERMINAL.md`, PM2 daemons, cron, scheduled remote agents |

Components compose: every skill invocation is one `(model, harness, tools, environment)` tuple. Attack surfaces and failure modes live at the seams between components, not inside them — which is why naming the seams matters.

---

## 2. Environment inventory

Four terminals plus two hosted surfaces, each a distinct execution context.

| Environment | Kind | Purpose | Journals / persistence |
|-------------|------|---------|------------------------|
| `research-build` | tmux terminal, window 1 | Architecture, research, rollout planning, builds | `docs/mags-corliss/JOURNAL.md` + `docs/RESEARCH.md` + owned plans |
| `engine-sheet` | tmux terminal, window 2 | Engine code, sheet structure, clasp deploys | Engine plan files + commits |
| `media` | tmux terminal, window 3 | Edition production, desk agents, publish pipeline | `output/production_log_edition_c{XX}.md` |
| `civic` | tmux terminal, window 4 | City-hall, voice agents, initiative tracking | `output/production_log_city_hall_c{XX}.md` |
| Discord bot | PM2 daemon (`mags-bot`) | Always-on Mags presence, Moltbook, nightly reflections | `super-memory` container + nightly reflection cron |
| Scheduled remote agents | Hosted on Anthropic infra | Mara sync, code review, bay-tribune audit, autodream | Their own logs; results land in relevant containers |

Terminal identity is resolved from `tmux display-message`, not from any state file. Each terminal's `TERMINAL.md` is the source of truth for its scope.

---

## 3. Models by role

| Role | Model | Why this model | Where configured |
|------|-------|----------------|------------------|
| Mags (editor-in-chief, all terminals) | Claude Opus 4.7 (1M context) | Long-context, judgment-heavy, persistent persona | Claude Code default model |
| Desk agents (business, civic, culture, sports, chicago, letters, podcast, city-clerk) | Claude Sonnet 4.6 via Claude Code sub-agents | Volume production, fast, cheap enough per edition | `.claude/agents/*-desk/SKILL.md` (inherits Claude Code default) |
| Civic voices (mayor, 4 projects, 4 factions, police chief, DA, IND swing) | Claude Sonnet 4.6 via sub-agents | Same | `.claude/agents/civic-office-*`, `.claude/agents/civic-project-*` |
| Reviewers (cycle-review, final-arbiter, rhea-morgan) | Claude Opus / Sonnet per lane weight | Lane 39.4 = 0.5 weight (cycle-review), 0.3 (rhea), 0.2 (mara) — heaviest lane gets Opus | Their agent files |
| AutoDream (claude-mem memory compaction) | Gemini 2.5 Pro (free tier) | Token burn fix S141 — was burning 10%/day on Sonnet | `/root/.claude-mem/settings.json` |
| Mara Vance (citizen/roster audit) | Claude on claude.ai (web app) | Out-of-band — different account, different context window, editorial independence | Not in this repo; access via Drive handoff |
| DeepSeek desk test (c87 business) | DeepSeek V3.1 via OpenRouter | Research, not production | `scripts/testOpenRouterDesk.js`, `docs/MIGRATION_OFF_CLAUDE.md` |

Model choice is a per-role decision, not a global. A Phase 40.2 cattle refactor would let us swap a role's model without re-touching the rest.

---

## 4. Harness inventory

Three layers, smallest to largest surface.

| Harness layer | Scope | File location | Reload trigger |
|---------------|-------|---------------|----------------|
| Identity (always loaded) | Mags persona, non-negotiables, canon facts | `.claude/rules/identity.md`, `CLAUDE.md`, `/root/.claude/CLAUDE.md` | Session boot, `/boot` after compaction |
| Rules (path-scoped) | Engine rules, newsroom rules, dashboard rules | `.claude/rules/engine.md`, `.claude/rules/newsroom.md`, `.claude/rules/dashboard.md` | Auto-loaded when paths match |
| Skills (invoked) | 41 skill files shaping specific workflows | `.claude/skills/*/SKILL.md` | Explicit invocation or description-triggered |

Agents are harness + tool bindings packaged together: each of the 27 `.claude/agents/*` folders holds a sub-agent's identity, allowed tools, and voice.

**Audit:** `/skill-audit` catches skill-file drift. `/doc-audit` catches reference-doc drift. `/skill-check` (S156) grades skill outputs against assertion files — the behavioral dimension the audits don't touch.

---

## 5. Tools by kind

| Kind | Examples | Scope | Trust level |
|------|----------|-------|-------------|
| **Claude Code built-ins** | Read, Edit, Write, Bash, Grep, Glob, TaskCreate, Agent | Every session | High — sandboxed by Claude Code |
| **Engine scripts** | `scripts/*.js`, `scripts/engine-auditor/*.js`, phase code under `phase*/` | Node CLI, deterministic, sheet-reading | High — code review + tech-debt audit |
| **MCP servers** (auto-loaded via `.mcp.json`) | `godworld` (10 city-data tools), `plugin_claude-mem_mcp-search`, `plugin_discord_discord`, `plugin_playwright_playwright`, `claude_ai_Slack`, `claude_ai_Gmail`, `claude_ai_Figma`, `context7`, `claude-batch`, `claude-in-chrome`, `claude_ai_Mara`, `godworld` | Model-callable via MCP protocol | Varies — MCP server auth gates writes |
| **Sheet writes** | `lib/sheets.js` (service-account) | Engine-only during run-cycle; outside engine = exception list in `.claude/rules/engine.md` | Medium — write operations require approval gate |
| **Supermemory writes** | `npx supermemory`, HTTP API via `$SUPERMEMORY_CC_API_KEY` | Containers: `mags`, `bay-tribune`, `world-data`, `super-memory`, `mara` | Medium — `mags`/`bay-tribune` writes gated by user approval |
| **PM2 daemons** | dashboard (:3001), `mags-bot` discord | Long-running processes | Medium — restart via session-end only |
| **Cron jobs** | Discord reflection, backup, server health (see `crontab -l`) | Host-level scheduled | Medium — audit on change |
| **Scheduled remote agents** | Mara sync, code review, bay-tribune audit, autodream | Anthropic-hosted, off-host | Medium — results land in containers, read-only from this repo |

---

## 6. Per-skill slice (spot check)

Full inventory is the skill files themselves. A few representative tuples to make the pattern concrete:

| Skill | Model | Harness | Tools | Environment |
|-------|-------|---------|-------|-------------|
| `/write-edition` | Opus (Mags) + Sonnet (desk sub-agents) | `.claude/skills/write-edition/SKILL.md` + each `.claude/agents/*-desk/SKILL.md` | Desk packet scripts, MCP `lookup_citizen`, Bash, Read, Edit, Write | media terminal |
| `/sift` | Opus | `.claude/skills/sift/SKILL.md` + `docs/media/story_evaluation.md` | engine_audit JSON read, baseline_briefs JSON read, MCP `search_canon`, `lookup_citizen` | media terminal |
| `/skill-check` | Opus | `.claude/skills/skill-check/SKILL.md` + `docs/media/story_evaluation.md` | Read, Write, Bash (read-only grading), MCP search | media terminal (run as part of post-publish) |
| `/city-hall` | Opus + civic-voice sub-agents | `.claude/skills/city-hall/SKILL.md` + `.claude/agents/civic-office-*` + `.claude/agents/civic-project-*` | City-hall-prep scripts, voice-output paths, tracker updater (dry-run by default) | civic terminal |
| `/engine-review` | Opus | `.claude/skills/engine-review/SKILL.md` | engine-auditor JSON read, Read, Write | engine-sheet terminal (or research-build) |
| `/post-publish` | Opus | `.claude/skills/post-publish/SKILL.md` | ingestEdition.js, buildCitizenCards.js, sheet writes to Edition_Coverage_Ratings, Supermemory writes to `bay-tribune` | media terminal |
| `/boot` | Opus | `.claude/skills/boot/SKILL.md` + identity files | Read | any terminal |
| AutoDream (external) | Gemini 2.5 Pro | claude-mem daemon | claude-mem worker port 37777 | host-level Bun daemon (not this repo's PM2) |

New skills declare their slice in the skill-file frontmatter once that convention lands (not enforced yet — opportunistic backfill).

---

## 7. Seams (where Phase 40 defenses live)

Phase 40 items land at the seams:

- **40.1 session-log interface (DONE S156)** — the `model ↔ environment` seam: `lib/sessionLog.js` gives a crashed reporter a durable way to resume from the event log without context window.
- **40.2 cattle refactor (pending)** — the `model ↔ harness` seam for reporters: split persistent voice files (harness) from session-scoped brief-execution state (ephemeral) so a reporter agent can reboot mid-article without losing its draft or re-deciding the angle.
- **40.3 credential audit (pending)** — the `tools ↔ environment` seam: credential files live in the working directory where model-generated code runs, which is the wrong side of the boundary.
- **40.4 this doc** — the documentation of all seams. Makes the other items unambiguous.
- **40.5 Plan Mode gate (pending)** — the `harness ↔ model` seam for user control: approve the strategy once, execute many.
- **40.6 injection defense (DONE S156)** — the `harness ↔ tools` seam and the `environment ↔ harness` seam: memory fencing + context-file scanning + tool-gate permissions + Rhea injection scan.

---

## Changelog

- 2026-04-16 (S156) — Initial draft. Phase 40.4 first pass. Written after 40.1 and 40.6 shipped (§7 build-order note).
