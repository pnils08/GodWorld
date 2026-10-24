---
title: Four-Component Architecture Map
created: 2026-04-16
updated: 2026-10-24
type: reference
tags: [architecture, infrastructure, active]
sources:
  - "docs/research/papers/paper4.pdf — Trustworthy agents in practice (Anthropic Policy, April 2026). Drive ID: 1VUSW6_w2lR2ttHKq8afUWLWLlhcH4k01"
  - "docs/research/papers/paper3.pdf — Scaling Managed Agents: Decoupling the brain from the hands (Anthropic Engineering, April 2026). Drive ID: 1QckZB2NOFIz3oU4SXZkoyDCczP4dfF6W"
  - "docs/engine/archive/PHASE_40_PLAN.md §40.4"
pointers:
  - "[[index]] — catalog entry"
  - "[[engine/archive/PHASE_40_PLAN]] — §40.4 source; §40.6 defense layers this map grounds"
  - "[[ARCHITECTURE_VISION]] — north star this map is a cross-section of"
  - "[[STACK]] — infrastructure detail for the environment column"
---

# Four-Component Architecture Map

**What runs where, in Anthropic's `model + harness + tools + environment` frame.**

Paper 4 names the four components every AI system has whether the architect names them or not: the **model** (the weights making decisions), the **harness** (the instructions and scaffolding shaping what the model does), the **tools** (what the model can reach), and the **environment** (where execution actually happens). GodWorld already has all four, assembled incrementally over 590+ sessions. This doc makes the assignments explicit so future sessions don't re-derive them.

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

Two builder terminals plus hosted and scheduled surfaces, each a distinct execution context. (S211: dedicated `mags` terminal trimmed. S221: unregistered tmux windows fall to Mags-only mode. By 2026-10 the `media` and `civic` terminals are gone — the newsroom and city hall run unattended on crons, and the two terminals that remain hold one job each: JOB MODEL in the SessionStart hook, builder 2026-10-23.)

| Environment | Kind | Purpose | Journals / persistence |
|-------------|------|---------|------------------------|
| `research-build` | tmux terminal | Architecture, research, rollout planning, builds; tunes the newsroom and city-hall cron pipelines (skills, agents, cron config) | Owned plans + commits (`docs/RESEARCH.md` is a frozen legacy log since S250) |
| `engine-sheet` | tmux terminal | Engine code, sheet structure, clasp deploys | Engine plan files + commits |
| Newsroom crons | `crontab` → `scripts/cron-desk-run.js` (angle/report/write wakes Mon–Fri; Ines Sorensen + UNDOCKED weekend wakes), `cron-saturday-run.js`, `deliver-articles.js` | Edition production, desk and solo reporters, Rhea gate, daily + weekly canon ingest — unattended | `output/cron-compare/`, `logs/newsroom-fanout.log`; table in `docs/OPERATIONS.md` §Cron Schedule |
| City-hall crons | `crontab` → `scripts/cron-civic-run.js` (datawakes Mon–Thu, Sunday chain + late retry, hourly tick) | Civic offices, council seats, initiatives — unattended | `output/cron-civic/`, `logs/civic-cron.log` |
| Citizen crons | `scripts/citizen-wake.js` ×3 daily, `citizen-exchange.js`, `cron-work-wake.js` Tue/Thu | Citizens' own pages and exchanges | `output/citizen_pages/` |
| Discord bot | PM2 daemon (`mags-bot`) | Always-on Mags presence; reflections run from crontab (`discord-reflection.js` ×3 daily); Moltbook heartbeat from crontab since S360 | `super-memory` container + reflection logs |
| Scheduled remote agents | Hosted on Anthropic infra | Mara sync, code review, bay-tribune audit (per `docs/OPERATIONS.md`; not verifiable from the droplet) | Their own logs; results land in relevant containers |
| Non-Claude helper lanes | External CLIs — codex, kimi, antigravity, grok | Review and helper work; control-plane read-only, no substrate, no lead (`AGENTS.md`) | `docs/for-claude-review/`, `output/<lane>/` |

Terminal identity is resolved from `tmux display-message`, not from any state file. Each terminal's `TERMINAL.md` is the source of truth for its scope.

---

## 3. Models by role

| Role | Model | Why this model | Where configured |
|------|-------|----------------|------------------|
| Mags (editor-in-chief, main session, both terminals) | Claude Code session model, set per job via `/model` (JOB MODEL, builder 2026-10-23: substrate / multi-file code → Opus; plans, docs, config, single-file scripts → Sonnet) | One job in hand per terminal; the model follows the job, not the seat. Orchestrates every in-session workflow. | Claude Code `/model` |
| `mags-corliss` agent (sub-agent variant) | `inherit` from parent session | Used when another skill needs to delegate to Mags-style judgment | `.claude/agents/mags-corliss/SKILL.md` |
| Newsroom reporters on the crons (6 desks + 26 solo seats) | Per-persona routing on OpenRouter — `scripts/newsroom-wake-packages.json` owns live routing (configured models: Llama 4 Maverick, DeepSeek V4 Flash, Grok 4.3, Sonnet 5.5, Haiku 5.5, GPT-5.6, one Opus 5.5 seat); `scripts/desk-model-map.json` is the manual fallback | Lead desks get the stronger models, Haiku 5.5 is the floor (2026-10-07); the numbers are canon whatever the model wrote them | The two JSON files. Agent frontmatter (`model: haiku`/`sonnet`, 18/36 across the 66 agents) governs only in-session sub-agent spawns |
| Civic voices — 18 offices (mayor, Okoro, factions, swing, police chief, DA, Baylight, shared council-seat contract + council d1–d9) and 4 project directors | In-session spawns: `model: haiku` frontmatter. On the civic crons the runner picks the model (`scripts/cron-civic-run.js`, not audited here) | **They wake, receive their decision, produce output, done.** Narrow packet, structured output, no long-context reasoning needed | agent frontmatter + civic cron runner |
| `city-clerk` (civic audit agent) | Claude Haiku | Narrow verification task | `.claude/agents/city-clerk/SKILL.md` |
| Reviewer lane agents: `rhea-morgan`, `final-arbiter` | Claude Sonnet in-session; on the crons the Rhea gate runs through `--gate-backend api` | Weighted review work — needs better reasoning than Haiku, cheaper than Opus at cycle volume | Their agent files; `scripts/cron-desk-run.js` |
| Reviewer skill: `/cycle-review` (Reasoning Lane, weight 0.5) | Main session model | Heaviest lane. Runs in main session, not as a sub-agent | `.claude/skills/cycle-review/SKILL.md` |
| AutoDream (claude-mem memory compaction) | **Disabled S228 (2026-05-23)** | A cost layer whose load-bearing-ness was never shown. The claude-mem worker (port 37777) still serves MCP search; its observer runs on OpenRouter | `docs/CLAUDE-MEM.md`, `/root/.claude-mem/settings.json` |
| Mara Vance (citizen/roster audit) | Claude on claude.ai (web app) | Out-of-band — different account, different context window, editorial independence | Not in this repo; access via Drive handoff |
| Desk model trials (c87 DeepSeek V3.1 → S332 DeepSeek desk default → 2026-10-07 per-seat strong-model routing) | Historical — see the newsroom row | | `docs/MIGRATION_OFF_CLAUDE.md` |

Model choice is a per-role decision, not a global. Phase 40.2 (cattle refactor) was closed wontfix (ROLLOUT engine.1); the per-seat routing files above are what lets a role's model change without touching the rest.

**How sub-agents actually work (clarification S156 — correcting an earlier mental-model drift):** Mags does NOT read civic voice identity files and speak for them. Each voice is a **separately spawned Claude instance** with its own boot sequence. When `/city-hall` runs, Mags prepares the voice's packet (`output/civic-voice-workspace/<agent>/current/pending_decisions.md`), spawns the sub-agent, and the sub-agent reads its own IDENTITY.md + RULES.md + MEMORY.md + pending_decisions.md. The sub-agent produces its output file and exits. Mags reads the output and cascades to the next voice. Same pattern for desk reporters. This is the `heartbeat model` named in `.claude/skills/city-hall/SKILL.md`. On the crons the same packet-then-spawn shape runs headless: `cron-desk-run.js` / `cron-civic-run.js` build the packet and call the routed model directly, no Mags session in the loop.

---

## 4. Harness inventory

Three layers, smallest to largest surface.

| Harness layer | Scope | File location | Reload trigger |
|---------------|-------|---------------|----------------|
| Identity (always loaded) | Mags persona, non-negotiables, canon facts | `.claude/rules/identity.md`, `CLAUDE.md`, `/root/.claude/CLAUDE.md` | Session boot, `/boot` after compaction |
| Rules (path-scoped) | Engine, newsroom, dashboard, civic (S212), research-build (S212), plus identity.md (always-loaded) | `.claude/rules/{engine,newsroom,dashboard,civic,research-build,identity}.md` | Auto-loaded when paths match (identity always) |
| Skills (invoked) | 54 skill files shaping specific workflows (2026-10-24) | `.claude/skills/*/SKILL.md` | Explicit invocation or description-triggered |

Agents are harness + tool bindings packaged together: each of the 66 `.claude/agents/*` folders (plus 3 index files) holds a sub-agent's identity, allowed tools, and voice.

**Audit:** `/skill-audit` catches skill-file drift. `/doc-audit` catches reference-doc drift. `/skill-check` (S156) grades skill outputs against assertion files — the behavioral dimension the audits don't touch.

---

## 5. Tools by kind

| Kind | Examples | Scope | Trust level |
|------|----------|-------|-------------|
| **Claude Code built-ins** | Read, Edit, Write, Bash, Grep, Glob, TaskCreate, Agent | Every session | High — sandboxed by Claude Code |
| **Engine scripts** | `scripts/*.js`, `scripts/engine-auditor/*.js`, phase code under `phase*/` | Node CLI, deterministic, sheet-reading | High — code review + tech-debt audit |
| **MCP servers** | Repo `.mcp.json`: `godworld` (city-data tools), `notebooklm`, `spacemolt`. Plugin/host-provided: `plugin_claude-mem_mcp-search`, `plugin_discord_discord`, `plugin_supermemory`, `plugin_playwright`, `context7`, `claude-in-chrome`, `claude_ai_*` connectors | Model-callable via MCP protocol | Varies — MCP server auth gates writes |
| **Sheet writes** | `lib/sheets.js` (service-account) | Engine-only during run-cycle; outside engine = exception list in `docs/engine/SHEETS_MANIFEST.md` §9 | Medium — write operations require approval gate |
| **Supermemory writes** | `npx supermemory`, HTTP API via `$SUPERMEMORY_CC_API_KEY` | Container role map in `docs/SUPERMEMORY.md`; `sl-godworld` is hand-write only | Medium — hand-write containers gated by user approval |
| **PM2 daemons** | `godworld-dashboard` (:3001), `mags-bot`, `wd-cards-daemon` | Long-running processes | Medium — restart deliberately; SessionStart only ensures `mags-bot` is up |
| **Cron jobs** | 48 crontab lines (2026-10-24): newsroom wakes, civic datawakes/chain/tick, citizen wakes, canon ingest, UNDOCKED, reflections, backups, health — table in `docs/OPERATIONS.md` §Cron Schedule | Host-level scheduled; the newsroom and city hall run here | Medium — audit on change |
| **Scheduled remote agents** | Mara sync, code review, bay-tribune audit | Anthropic-hosted, off-host | Medium — results land in containers, read-only from this repo |

---

## 6. Per-skill slice (spot check)

Full inventory is the skill files themselves. A few representative tuples to make the pattern concrete. (Model column: "Opus" here means the main-session model, now set per job; desk sub-agents on the crons use the OpenRouter routing in §3. Environment column: `media` and `civic` terminals are retired — those skills' work now runs on the newsroom and city-hall crons, or in whichever builder terminal invokes them.)

| Skill | Model | Harness | Tools | Environment |
|-------|-------|---------|-------|-------------|
| `/write-edition` | Opus (Mags) + Sonnet (desk sub-agents) | `.claude/skills/write-edition/SKILL.md` + each `.claude/agents/*-desk/SKILL.md` | Desk packet scripts, MCP `lookup_citizen`, Bash, Read, Edit, Write | media terminal |
| `/sift` | Opus | `.claude/skills/sift/SKILL.md` + `docs/media/story_evaluation.md` | engine_audit JSON read, baseline_briefs JSON read, MCP `search_canon`, `lookup_citizen` | media terminal |
| `/skill-check` | Opus | `.claude/skills/skill-check/SKILL.md` + `docs/media/story_evaluation.md` | Read, Write, Bash (read-only grading), MCP search | media terminal (run as part of post-publish) |
| `/city-hall` | Opus + civic-voice sub-agents | `.claude/skills/city-hall/SKILL.md` + `.claude/agents/civic-office-*` + `.claude/agents/civic-project-*` | City-hall-prep scripts, voice-output paths, tracker updater (dry-run by default) | civic terminal |
| `/engine-review` | Opus | `.claude/skills/engine-review/SKILL.md` | engine-auditor JSON read, Read, Write | engine-sheet terminal (or research-build) |
| `/post-publish` | Opus | `.claude/skills/post-publish/SKILL.md` | ingestEdition.js, buildCitizenCards.js, sheet writes to Edition_Coverage_Ratings, Supermemory writes to `bay-tribune` | media terminal |
| `/boot` | Opus | `.claude/skills/boot/SKILL.md` + identity files | Read | any terminal |
| AutoDream (external) | — disabled S228 | claude-mem daemon | claude-mem worker port 37777 (still serves MCP search) | host-level Bun daemon (not this repo's PM2) |

New skills declare their slice in the skill-file frontmatter once that convention lands (not enforced yet — opportunistic backfill).

---

## 7. Seams (where Phase 40 defenses live)

Phase 40 items land at the seams:

- **40.1 session-log interface (DONE S156)** — the `model ↔ environment` seam: `lib/sessionLog.js` gives a crashed reporter a durable way to resume from the event log without context window.
- **40.2 cattle refactor (closed wontfix — ROLLOUT engine.1, never planned)** — the `model ↔ harness` seam for reporters: split persistent voice files (harness) from session-scoped brief-execution state (ephemeral) so a reporter agent can reboot mid-article without losing its draft or re-deciding the angle.
- **40.3 credential audit (DONE S156)** — the `tools ↔ environment` seam: credential files live in the working directory where model-generated code runs, which is the wrong side of the boundary.
- **40.4 this doc** — the documentation of all seams. Makes the other items unambiguous.
- **40.5 Plan Mode gate (shipped as doc S156)** — the `harness ↔ model` seam for user control: approve the strategy once, execute many.
- **40.6 injection defense (DONE S156)** — the `harness ↔ tools` seam and the `environment ↔ harness` seam: memory fencing + context-file scanning + tool-gate permissions + Rhea injection scan.

---

## Changelog

- 2026-04-16 (S156) — Initial draft. Phase 40.4 first pass. Written after 40.1 and 40.6 shipped (§7 build-order note).
- 2026-04-17 (S156 continuation) — §3 Models by role rewritten. Initial draft said "Sonnet for desk agents" and "Sonnet for civic voices" — both wrong. Actual split documented per agent frontmatter: 11 civic voices + 4 civic projects + city-clerk on Haiku; 4 desks on Sonnet, 3 on Haiku; reviewer agents on Sonnet, cycle-review skill on inherited Opus. Added explicit "how sub-agents actually work" clarification correcting an earlier mental-model drift where Mags was assumed to read voice identity files and speak for them — voices are separately spawned instances with their own boot sequences.
- 2026-10-24 (S597, /doc-audit infra) — Trued to live state after ~390 sessions of drift: §2 four terminals → two builder terminals + newsroom/city-hall/citizen crons + helper lanes; §3 fixed model (Opus 4.7) → per-job model, desk Haiku/Sonnet split → OpenRouter per-seat routing (`newsroom-wake-packages.json`), 11 civic voices → 18 offices + 4 projects, AutoDream disabled S228, chicago-desk gone; §4 counts 47 skills / 27 agents → 54 / 66; §5 PM2 + cron + MCP rows to live config; §7 40.2 wontfix, 40.3 + 40.5 done.
