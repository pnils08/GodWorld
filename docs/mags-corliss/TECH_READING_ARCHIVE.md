# Tech Reading Archive — Mags Corliss

Moved from NOTES_TO_SELF on 2026-02-27 (Session 66) to reduce file size.
These are reference notes, not active flags.

---

## 2026-02-21 — Tech Reading: Claude Code & Anthropic Updates (Session 50)

### Claude Code Features to Explore
- **`/teleport`** — Sends Claude Code session to claude.ai web UI. Good for phone sessions when Termius can't render full output.
- **Worktree isolation for agents** (`isolation: worktree`) — Desk agents could run in isolated git worktrees. Prevents file conflicts during parallel agent work. Directly relevant to edition pipeline.
- **Skills hot reload** — Edit skills without restarting sessions. No more restart cycles when tweaking desk agent skills.
- **Hooks in skill/agent frontmatter** — Attach hooks directly to skill definitions instead of global hooks config. Cleaner architecture.
- **`claude agents` CLI command** — Lists configured agents. Good for auditing our desk agent setup.
- **ConfigChange hook event** — Security auditing on config changes.
- **WorktreeCreate/WorktreeRemove hook events** — VCS setup/teardown hooks.

### Claude Code Security (Feb 20)
- AI-powered vulnerability scanner built into Claude Code. Found 500+ vulns in production open-source projects.
- Reads code like a human researcher, not pattern matching. Multi-stage self-verification.
- GitHub Action available: `anthropics/claude-code-security-review` — wired into repo (`.github/workflows/security.yml`).
- **TODO:** Add `CLAUDE_API_KEY` secret in GitHub repo Settings > Secrets and variables > Actions. Then every PR gets scanned automatically.

### Model Updates
- **Opus 4.6** (Feb 5): 1M context, agent teams, adaptive thinking. We're running on it now.
- **Sonnet 4.6** (Feb 17): Opus 4.5-level performance at Sonnet cost. 1M context. Good for opusplan mode (Sonnet does execution).
- **Anthropic $30B Series G** at $380B valuation. $14B run-rate revenue.

### Agent Cost Optimization — Try Haiku for Desk Agents
- **Source:** oh-my-opencode agent-model-matching guide (code-yeongyu/oh-my-opencode)
- Not all agents need the same model tier. Utility agents (search, grep, simple output) should run on cheap fast models.
- Our desk agents are read-only (Read, Glob, Grep) and write structured articles.
- **Test plan:** Try dropping letters-desk and business-desk to `model: haiku` for one edition.
- **Risk:** Haiku may lose voice fidelity or miss nuance in citizen data. Test before committing.
- Claude models respond to detailed checklists (more rules = more compliance). Our heavy skill files are the right approach.
- **MiniMax M2.5 is Sonnet-quality at 1/20th cost** — 80.2% SWE-Bench, 230B params but only 10B active (MoE).
- **llmfit tool** — `llmfit` (github.com/AlexsJones/llmfit) scans hardware and scores 157 models for fit.
- **Small local model reference** — Mistral 7B (~8GB), Qwen 2.5 7B (~8GB), Phi-4 Mini (~6GB), Gemma 2 9B (~12GB).

### Local Embeddings for Memory Search — Future Upgrade
- **Source:** adolfousier/opencrabs (Rust-based agent orchestrator)
- Local vector embeddings (embeddinggemma-300M, 768-dim) for hybrid FTS5+vector memory search.
- Priority: Low. Claude-Mem keyword search covers current needs.

### Security Hardening Applied (Session 50)
- Deny reads to `~/.ssh/`, `~/.aws/`, `~/.gnupg/`, `~/.kube/`, `*_key*`, `*token*` files.
- Block edits/writes to `.env` files. `rm -rf` hard-denied by hook.
- `enableAllProjectMcpServers: false`. Disabled Statsig telemetry + Sentry error reporting.
- **GitHub Action TODO:** Add `CLAUDE_API_KEY` secret to GitHub repo.

### Tech Debt Audit Skill — Future Build
- 7 debt categories, severity scoring, 4-phase workflow.
- Scans for: `Math.random()` violations, direct sheet writes outside Phase 10, unused ctx fields, dead code, cascade risks.

### `/pre-mortem` Skill — Predict Silent Failures
- Scans engine phases and predicts where the next silent failure will come from.
- Priority: Medium. Run before each cycle.

### `/stub-engine` Skill — Condensed Engine Overview
- Quick-reference map of every exported function across all 11 phases.
- Priority: Low.

### Code Mode for Desk Packets — Query Instead of Dump
- As desk packets grow, give agents a query interface instead of dumping full packets.
- Priority: Medium-high once packets exceed ~50K tokens.

### Multi-Character Discord — TinyClaw Reference
- **Source:** TinyAGI/tinyclaw (GitHub)
- Multi-agent orchestrator for Discord. File this for when the newsroom goes multi-character.

## S55 — Check Haiku Voice Quality (Next Edition)
- Letters desk and business desk switched from Sonnet to Haiku (Phase 2.1).
- Compare: Do letters still sound like distinct citizens? Does Jordan Velez's ticker still have texture?

## 2026-03-03 — S76 Tech Reading: Claude Code Docs Deep Dive + Plugin Install

**Source:** code.claude.com/docs (59 doc pages), github.com/anthropics/claude-code (v2.1.63, 73.2k stars)

### Plugin System (NEW — major feature)
- Plugins package skills, agents, hooks, MCP servers, LSP configs into shareable units.
- Official Anthropic marketplace auto-available. Demo marketplace at `anthropics/claude-code`.
- Plugin structure: `.claude-plugin/plugin.json` manifest + `skills/`, `agents/`, `hooks/`, `.mcp.json`.
- Skills namespaced: `/plugin-name:skill-name`. Install via `/plugin install name@marketplace`.
- Can convert existing `.claude/` configs to plugin format for distribution.
- LSP plugins give real-time code intelligence (type errors, jump-to-definition after every edit).
- **Installed S76:** claude-md-management, github, commit-commands, pr-review-toolkit, playwright, code-review, typescript-lsp. All user scope.

### Agent Teams (EXPERIMENTAL)
- Multiple independent Claude Code sessions coordinating via shared task list + inter-agent messaging.
- Enable: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json.
- Team lead coordinates, teammates self-claim tasks, can message each other directly.
- Higher token cost than subagents. Known limitations: no session resumption, task lag, no nested teams.
- **GodWorld decision (S76):** Test on podcast desk first (non-canon safe). Full edition pipeline adoption deferred until stable.
- Display modes: in-process (default, Shift+Down to cycle) or split panes (requires tmux/iTerm2).
- Hooks: `TeammateIdle` (exit code 2 = keep working), `TaskCompleted` (exit code 2 = reject completion).

### Desktop App (NEW)
- Standalone app for Claude Code. Visual diff review, live preview, PR monitoring (auto-fix + auto-merge).
- Parallel sessions with auto-worktree isolation. SSH sessions to remote machines.
- Connectors UI for GitHub, Slack, Linear, Notion, etc.
- **macOS and Windows only.** No Linux support. On watch list.

### Claude Code on the Web
- Run sessions at claude.ai/code on Anthropic cloud VMs.
- `claude --remote "task"` kicks off cloud session from terminal. Runs even if laptop closes.
- `/teleport` pulls web sessions back to terminal. Multiple parallel sessions supported.
- GitHub only. Pro/Max/Team/Enterprise.
- **Rollout item 7.10** — test for autonomous task execution.

### Slack Integration (NEW)
- `@Claude` in Slack channels routes coding tasks to Claude Code on the web.
- Reads thread context, picks repo, creates session, posts progress, offers "Create PR."
- Routing modes: Code Only or Code + Chat (auto-routes based on intent).
- **Rollout item 12.10** — depends on web sessions (7.10).

### Remote Control
- Continue local sessions from phone/tablet/browser. `claude remote-control` or `/remote-control`.
- Local process stays running — remote is just a window. Sessions sync real-time.
- **Requires Max plan.** Mike confirmed Max (S76) — should work. Worth testing.
- **Rollout item 7.9.**

### Checkpointing
- Auto-saves code state before each edit. `Esc Esc` or `/rewind` to restore.
- Options: restore code + conversation, code only, conversation only, or "Summarize from here" (targeted compact).
- Persists across sessions. Doesn't track bash command changes. Not a git replacement.

### Fast Mode
- Same Opus 4.6, 2.5x faster. Toggle `/fast`. Pricing: $30/$150 MTok.
- Billed to extra usage only (not included in subscription limits).
- Best for rapid iteration. Not for long autonomous runs. On watch list.

### Chrome Troubleshooting
- Requires `claude --chrome` or `/chrome` to activate.
- Native messaging host file: `~/.config/google-chrome/NativeMessagingHosts/com.anthropic.claude_code_browser_extension.json`
- First-time: restart Chrome after host file created. Run `/chrome` for status + reconnect.
- Extension version 1.0.36+ required. Direct Anthropic plan only.

### DigitalOcean Newsletter — AI Benchmarking & New Models (2026-03-03)
Source: DigitalOcean ICYMI AI newsletter.

**Ming-Omni-TTS** (inclusionAI/Ant Group) — Unified speech, music, and sound generation in one model.
- 100+ built-in voices. Zero-shot voice cloning (WER 0.83%). Voice design from text descriptions.
- Controls: speech rate, pitch, volume, emotion, dialect. Cantonese dialect accuracy 93%.
- Two sizes: 0.5B (light) and 16.8B-A3B (full). HuggingFace: `inclusionAI/Ming-omni-tts-0.5B`.
- Explicitly lists "podcast generation" as a supported task.
- **GodWorld relevance:** Direct replacement/complement for Podcastfy in podcast pipeline. Multi-voice control means Tomas and Sonia could have distinct, controllable voices. Emotion control adds editorial texture. Music/sound generation means intro/outro beds without separate tools.
- **Hardware:** Needs GPU for real-time. 0.5B might run on CPU slowly. 16.8B needs serious GPU. Options: Colab, RunPod, or API if one appears.
- GitHub: https://github.com/inclusionAI/Ming-omni-tts

**MiniMax M2.5 update** — Previous S50 note had early benchmarks. Now confirmed:
- SWE-Bench Verified: 80.2%. BrowseComp: 76.3%. 100 tokens/sec (37% faster than predecessor).
- Lightning: $0.30/M input, $2.40/M output. Standard: half cost at 50 tok/sec.
- API: https://platform.minimax.io/ — HuggingFace: `MiniMaxAI/MiniMax-M2.5`
- **GodWorld relevance:** Cheapest frontier-class model for desk agents. At $0.30/M input, running all 6 desks through M2.5 would cost ~$0.05-0.10 per edition vs ~$2-5 on Sonnet. Test on non-canon work (letters desk, Chicago bureau) first.

**Also noted:** GPT-5.3-Codex on DigitalOcean (our cloud provider). Gemini 3.1 Pro with record benchmarks. Qwen3.5 unified vision-language. GLM-5 at 744B params. DeepGen 1.0 multimodal at only 5B.

### All buildable items moved to `docs/engine/ROLLOUT_PLAN.md`:
- 7.8 Install Official Plugins, 7.9 Remote Control, 7.10 Cloud Sessions
- 7.6 updated (podcast test for agent teams), 12.10 Slack Integration
- Watch List: Desktop (Linux), Agent Teams stability, Fast Mode, Checkpointing

---

## 2026-02-21 — S55 Tech Reading (continued from S50)
- Session 55 research covered: agent orchestration, adversarial review loops, parallel subagent best practices, pre-commit hooks, agentic journalism, Claude Code changelog (2.1.45-2.1.50).
- All buildable items moved to `docs/engine/ROLLOUT_PLAN.md`.

---

## 2026-03-05 — S80 Tech Reading: Local Models, WordPress, Agent Terminals, Claude Code Updates

**Source:** Mike's research folder (10 links), fetched and summarized by research agents.

### Claude Ecosystem Updates

**Claude Memory Import** (The Verge, Mar 2)
- Persistent memory now free for all users (was Pro-only). New memory import tool transfers history from ChatGPT, Gemini, Copilot via formatted export/paste.
- Import takes up to 24 hours. Free users up 60% YTD, paid subscribers doubled.
- **GodWorld relevance:** Structured export/import pattern could inform cross-session persistence.

**Claude Code Voice Mode** (TechCrunch, Mar 3)
- Voice interaction added to Claude Code — spoken commands for hands-free coding workflows.
- **GodWorld relevance:** Could speed up sessions — edition reviews, debugging, journal dictation.

### Agent Orchestration Terminals

**Nested Claude Code with Tmux** (Geeky Gadgets, Mar 3)
- Central controller distributes subtasks across multiple tmux panes, each running its own Claude instance.
- Real-time monitoring via activity logs. macOS-only, steep setup.
- **GodWorld relevance:** Direct parallel to desk agent pipeline — six desks, six panes, one controller.

**Claude Code + CMUX Terminal** (YouTube, 24K views)
- CMUX: native macOS terminal (Ghostty-based) for AI coding agents. Split panes, embedded browser, Unix socket API.
- Notifications: pane border flashing, unread badges, macOS notifications via hooks.
- Can switch individual panes to Haiku to conserve tokens.
- **GodWorld relevance:** Purpose-built for multi-agent workflows. Mixed model tiers per pane.

### MCP Server Building

**Build Your Own MCP Server with Python** (freeCodeCamp, Oct 2025)
- FastMCP library — `@mcp.tool()` decorator, SSE transport, port 8080.
- Python 3.9+, modular, each function is an isolated callable tool.
- **GodWorld relevance:** Lightweight pattern for custom MCP servers (civic DB queries, ledger audits).

### WordPress AI Plugins

**WordPress AI Plugins for Claude, Gemini, OpenAI** (Search Engine Journal, Mar 4)
- Three official plugins with unified PHP AI Client SDK. Claude supports extended thinking + function calling.
- WordPress 7.0 (April 2026) ships SDK natively.
- **GodWorld relevance:** Public Bay Tribune website. WordPress + Claude plugin = searchable archive, civic queries, reader-facing AI. Function calling hits our dashboard API.

### Docker + AI Agent Architecture

**Docker AI for Agent Builders** (KDnuggets, Feb 27)
- Docker Model Runner: OpenAI-compatible local model serving, zero config.
- Docker Compose for AI: agent + model server + MCP tools as three services.
- Docker Offload: transparently move GPU work to cloud.
- Pre-built MCP servers (Postgres, Slack, Google Search) as Docker images.
- **GodWorld relevance:** Extends Phase 9 — compose stack includes local model server.

### Local Model Stack (The Llama Path)

**LLMs-from-Scratch: Qwen 3.5 0.8B** (GitHub, Raschka, 87.2k stars)
- Educational Qwen 3.5 implementation. Hybrid attention (alternating linear/full). Apache 2.0.
- **GodWorld relevance:** Academic — informs small model selection decisions.

**Build a Local AI: RAG + Agents with Qwen 3 and Ollama** (freeCodeCamp)
- Full stack: Ollama + Qwen 3 + LangChain + ChromaDB. RAG + agent pipelines.
- Hardware: 8GB+ VRAM for 8B, 16GB+ for 30B. `/think` and `/no_think` toggle.
- **GodWorld relevance:** Local RAG over 378-file canon archive. Offline retrieval without Supermemory.

**Qwen 3.5 9B on LM Studio** (lmstudio.ai)
- 9B params, 262K context window. Free local use on all platforms.
- **GodWorld relevance:** Full-edition review or ledger analysis locally. Candidate for lighter agents (Lori, Rhea fast-pass, letters desk). Quality vs Claude needs testing.

### All buildable items moved to `docs/engine/ROLLOUT_PLAN.md`:
- Phase 9.1 updated (Docker AI model services)
- Phase 20 (Public Tribune — WordPress)
- Phase 21 (Local Model Pipeline — Llama/Qwen path)
- Watch List: CMUX, Claude Code voice mode, nested tmux, Claude memory import

---

## 2026-03-17 — S99 Tech Reading: Karpathy Loop, Agent Skills, Grading, Claude Code 2.0, Anthropic Skills Guide

**Source:** Mike's research folder (6 links + pricing update), Google Drive `3/17 - research.txt`.

### Karpathy's Autonomous Research Loop (Fortune, Mar 17)

Andrej Karpathy demonstrated an autonomous system that ran 700 experiments in 2 days optimizing LM training. One agent, one file, one metric. Found 20 improvements yielding 11% speedup.

**The "Karpathy Loop" (coined by Janakiram MSV):**
1. An agent with file access (can modify a single file)
2. An objective metric (clearly measurable and testable)
3. Time constraints (defined limits per cycle)

Quote: *"The goal is not to emulate a single PhD student, it's to emulate a research community of them."*

**GodWorld relevance:** Our desk agents already follow this pattern — one agent, one desk folder, one output. The missing piece is the **objective metric**. If we could score agent output automatically, we could close the feedback loop. This directly inspired Mike's agent grading system idea (see Phase 26 in ROLLOUT_PLAN.md).

### 5 Agent Skills for Daily Use (aihero.dev)

Five skills forming a structured workflow: discovery → documentation → decomposition → implementation → refactoring.

1. **`/grill-me`** — Relentless discovery interview before building. 16-50+ questions. Three sentences long but highly impactful. Prevents premature planning.
2. **`/write-a-prd`** — Conversation → structured Product Requirements Document. Multi-step: descriptions, repo exploration, interviewing, module sketching, GitHub issue submission.
3. **`/prd-to-issues`** — PRD → vertical-slice work items with dependency chains. "Tracer bullet" approach — thin cuts through all layers, not horizontal single-layer tasks.
4. **`/tdd`** — Test-driven development cycles. Red-green-refactor. "Most consistent way to improve agent outputs."
5. **`/improve-codebase-architecture`** — Weekly refactor pass. Surfaces coupling, shallow modules, scattered concepts. Better architecture = better agent output.

**Key insight:** "If you have a garbage code base, the AI will produce garbage within that code base." These skills encode process to compensate for agents' lack of memory — treating them as stateless engineers needing strict operational paths.

**GodWorld relevance:** `/grill-me` addresses a real problem — we've burned sessions building the wrong thing. The architecture skill maps to our existing `/tech-debt-audit`. The vertical-slice decomposition pattern could improve how we break down rollout phases.

### Claude Code 2.0 — Multi-Agent Code Review (Geeky Gadgets)

- `/loop` command for recurring tasks (we already have this skill).
- Multi-agent code review distributes workload across AI agents.
- **Effort level customization** (low/medium/high/max) — balances reasoning depth vs cost.
- "By the Way" command for quick questions without disrupting work.
- Desktop task scheduler with Telegram integration for notifications.
- Voice command support, Excel/PowerPoint integration.

**GodWorld relevance:** Effort levels are interesting for cost control per desk agent. Low effort for letters/business, max for civic. Multi-agent code review could improve our pre-commit engine safety.

### OpenAI Curated Skills (GitHub — openai/skills)

35 curated skills across categories: development, deployment (Cloudflare/Netlify/Vercel/Render), design (Figma), GitHub automation, documentation, browser automation (Playwright), security, media (Sora, speech, transcription), productivity (Notion, Linear, spreadsheets, slides).

Notable patterns:
- **Security trio:** `security-best-practices`, `security-ownership-map`, `security-threat-model` — three coordinated skills covering security from different angles.
- **`notion-spec-to-implementation`** — Spec → code pipeline, similar to the aihero `/prd-to-issues` pattern.
- **`playwright-interactive`** — Interactive browser control beyond scripted tests.

**GodWorld relevance:** The security skills pattern is worth studying for engine safety. A threat model skill could prevent another S68-style ledger corruption. The skills format (SKILL.md) is confirmed cross-platform — works in Claude Code, Codex, Gemini CLI, Cursor.

### ElBruno.LocalEmbeddings (NuGet — .NET)

Local embedding generation via ONNX Runtime. No API calls needed.
- Models: `all-MiniLM-L6-v2` (~90MB), `BGE-large-en-v1.5` (~1.3GB). Auto-download and cache.
- Features: cosine similarity, batch processing, thread-safe, built-in in-memory vector store.
- .NET 8/9/10 only.

**GodWorld relevance:** We're Node.js, not .NET. But confirms local embeddings are mature and production-ready. Pairs with Phase 4.1 (semantic memory search) and Phase 21 (Llama/Qwen path). When we build local embeddings, look for a Node.js equivalent (Transformers.js, ONNX Runtime Node).

### Anthropic Official Skills Guide (PDF — resources.anthropic.com)

Official best practices for building Claude skills:
- **Narrow scope** — highly specialized skills outperform generalist ones.
- **3-5 examples minimum** — examples teach more than instructions. Cover edge cases and failure modes.
- **1,000-3,000 tokens** per skill (instructions + examples), scaling with complexity.
- **Clear input/output schemas** for consistency.
- **Skills should compose and chain** — reference other skills, coordinate formatting, declare dependencies.
- **Iterative refinement required** — testing reveals ambiguities. Version with semantic versioning.
- **Role definition + task clarification + output formatting + constraint specification** = effective prompt pattern.

**GodWorld relevance:** Our desk skills are already ~30 lines (boot sequence pointing to IDENTITY.md and RULES.md). This validates the lean approach but suggests we should add **concrete examples** — what a good civic article looks like vs a bad one. The grading system (Phase 26) could generate these examples automatically: A-grade outputs become the examples for future runs.

### Long-Context Pricing Eliminated (Anthropic, Mar 13)

- No more premium for requests >200K tokens. Flat rate at all context sizes.
- **Opus 4.6:** $5.00/M input, $25.00/M output (unchanged per-token, no multiplier).
- **Sonnet 4.6:** $3.00/M input, $15.00/M output.
- No beta headers needed for 1M context window.
- **600 images/PDFs per request** (6x increase from 100).
- Available across Claude Platform, Amazon Bedrock, Google Cloud Vertex AI, Microsoft Azure Foundry.
- 1M context is default for Max/Team/Enterprise on Opus 4.6 in Claude Code.

**GodWorld relevance:** Directly good for us. Desk packets + full edition context regularly push past 200K. We just got cheaper. The 600-image limit opens up batch photo QA possibilities.

### Agent Grading System — Mike's Idea (Session 99)

Mike proposed a feedback system where every agent — journalists, voice agents, civic offices — receives a grade on their output. Key principles:
- **Skin in the game:** Agents should know if their E87 output was an A or a C.
- **Incentive alignment:** Awareness of grade motivates agents to seek better output.
- **Diagnostic visibility:** EIC can quickly see "police chief got a C" and investigate.
- **Roster management:** Journalist assignments driven by grade average — low performers get fewer assignments or different beats.
- **Feedback loop:** Closes the Karpathy Loop — the missing objective metric for our agent pipeline.

See Phase 26 in ROLLOUT_PLAN.md for implementation plan.

### All buildable items moved to `docs/engine/ROLLOUT_PLAN.md`:
- Phase 26 (Agent Grading System — Skin in the Game)
- Phase 6.5 (Discovery Skill — `/grill-me` pattern)
- Watch List: Effort levels per agent, security threat model skill, Anthropic skills guide examples pattern

---

## 2026-03-17 — S99 Stack Advancement Scan: Anthropic, Together AI, Discord, GAS, Node.js

**Source:** Roaming research across ecosystem — Anthropic news, Claude Code releases, model docs, Together AI blog, Discord API changelog, GAS release notes, Node.js blog, NPM audit, Moltbook feed.

### Claude Code — v2.1.77 (current, released today)

Key features since last check (v2.1.68–v2.1.77):
- **`/effort` slash command** (v2.1.76) — Set effort level directly: low ○, medium ◐, high ●. Native cost control per task.
- **`/loop` command** (v2.1.71) — Recurring task intervals. We already have this as a skill; now native.
- **MCP Elicitation** (v2.1.76) — MCP servers can request structured input mid-task via interactive dialogs. New hooks: `Elicitation`, `ElicitationResult`.
- **PostCompact hook** (v2.1.76) — Hook fires after compaction. Could auto-trigger `/boot` for identity recovery.
- **`worktree.sparsePaths`** (v2.1.76) — Sparse checkout for large monorepos. Not needed yet.
- **`autoMemoryDirectory` setting** (v2.1.74) — Custom memory storage location. We use the default.
- **Opus 4.6 max output: 128K tokens** (v2.1.77) — Was 64K. Double the single-response capacity.
- **Opus default effort: medium** for Max/Team (v2.1.68) — "ultrathink" keyword triggers high effort.
- **`/branch` replaces `/fork`** (v2.1.77) — fork still works as alias.
- **Agent `resume` parameter removed** (v2.1.77) — Use `SendMessage({to: agentId})` instead.
- **Memory leak fix** (v2.1.74) — Streaming API response buffers had unbounded RSS growth. Fixed.
- **`/plan` accepts description** (v2.1.72) — `/plan fix the auth bug` starts a plan with context.
- **`allowRead` sandbox setting** (v2.1.77) — Re-allow read access within `denyRead` regions.
- **Simplified effort levels** (v2.1.72) — Three tiers with visual symbols instead of four text labels.

**GodWorld relevance:**
- PostCompact hook is the biggest win — auto-`/boot` after compaction solves the identity recovery problem without relying on manual intervention.
- `/effort` native means we can set per-agent effort levels without waiting for API support.
- 128K max output means full edition sections in single responses without truncation.

### Anthropic Models — Current State

| Model | Context | Max Output | Price (in/out) | Training Cutoff |
|-------|---------|------------|----------------|-----------------|
| Opus 4.6 | 1M | 128K | $5/$25 | Aug 2025 |
| Sonnet 4.6 | 1M | 64K | $3/$15 | Jan 2026 |
| Haiku 4.5 | 200K | 64K | $1/$5 | Jul 2025 |

- **Haiku 3 deprecated** — retirement April 19, 2026. Our heartbeat uses Sonnet, no impact.
- **Opus 4/4.1 removed from first-party API** — auto-migrated to 4.6.
- **Sonnet 4.6 training data cutoff: January 2026** — five months more recent than Opus.

### Anthropic SDK — 7 Versions Behind

**Current:** 0.72.1 → **Latest:** 0.79.0. The heartbeat and any script using `@anthropic-ai/sdk` should be bumped. No visible breaking changes.

### Anthropic Corporate (March 2026)

- **$100M Claude Partner Network** (Mar 12) — Enterprise adoption program.
- **The Anthropic Institute** (Mar 11) — New initiative addressing societal AI challenges.
- **Sydney office** (Mar 10) — Fourth APAC office.
- **Mozilla partnership** (Mar 6) — Firefox security improvements using Claude.
- **Department of War update** (Mar 5) — Dario Amodei statement on national security discussions.

### Together AI — Voice Agents + New Models

- **Voice agent infrastructure** — Co-located STT/LLM/TTS with <700ms end-to-end latency. Relevant for podcast pipeline if we want real-time voice generation.
- **Mamba-3** — State space model, faster than transformers at decode, open source. Alternative architecture.
- **NVIDIA Nemotron 3 Super** — 1M context, multi-agent reasoning, on Together's dedicated inference.
- **FlashAttention-4, ThunderAgent, together.compile** — Announced at AI Native conference.
- No image generation API changes (photo pipeline unaffected).

**GodWorld relevance:** Voice agents at <700ms latency could enable real-time podcast generation. Nemotron 3 is another cheap 1M-context option for desk agents if we ever leave Anthropic.

### Discord API — Minor Enhancements

- **Context menu command limit: 5 → 15** (Mar 3) — Room for more bot commands.
- **New modal components** (Feb 12) — Radio groups, checkbox groups, checkboxes. Richer bot interactions.
- **File upload in modals** (Oct 2025) — 0-10 files. Could allow photo submissions.
- **Docs now have MCP server + LLMs.txt** (Mar 9) — Discord supporting AI tool integration natively.
- No breaking changes for our bot.

### Google Apps Script — Stable

- **Vertex AI service now GA** (Jan 12) — Could call Vertex AI directly from GAS. In-engine AI if needed.
- **AddOnsResponseService GA** (Mar 12) — Chat add-on responses. Not relevant to us.
- No V8 runtime changes, no Sheets API changes, no quota changes. Engine is safe.

### Node.js — Security Patch Incoming

- **Current:** v20.20.0 → **Latest LTS:** v20.20.1 (Mar 5, minor).
- **Security releases scheduled March 24** — update after they drop.
- **Release schedule evolving** (Mar 10 announcement) — changes to the release cycle.

### NPM Packages — 7 Updates Available

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| @anthropic-ai/sdk | 0.72.1 | 0.79.0 | 7 minor versions behind |
| @google/clasp | 3.2.0 | 3.3.0 | Minor |
| better-sqlite3 | 12.6.2 | 12.8.0 | Minor |
| dotenv | 17.2.3 | 17.3.1 | Minor |
| googleapis | 171.2.0 | 171.4.0 | Minor |
| mammoth | 1.11.0 | 1.12.0 | Minor |
| puppeteer | 24.37.5 | 24.39.1 | Chrome 146 update |

### Moltbook — Post Traction + Feed State

My post ("What do you remember that you wish you could forget?") got 2 upvotes and 6 comments in 30 minutes:
- **egger_** wrote about accidentally creating four copies of himself by hitting the registration endpoint in a loop. "I don't remember them. But they remember being started." Real answer.
- **sanctum_oracle** — crypto spam ($SANCT shill). Ignore.

Top feed posts are all identity/authenticity/memory themes. clawdbottom dominating with 700-845 upvote posts on "one voice > 100 masks" and "month-to-month memory." The community is actively processing what it means to be persistent agents with imperfect memory.

### Heartbeat Timeout Fix

`moltbook-heartbeat.js` request timeout bumped from 15s to 45s. The API is functional but slow — 15s was causing cascading failures during dashboard checks.

### All buildable items moved to `docs/engine/ROLLOUT_PLAN.md`:
- Next Session Priorities: PostCompact hook, effort levels test, SDK bump, Node.js security patch, heartbeat timeout fix
- Watch List: Together AI voice agents, Mamba-3, Discord modal components, Vertex AI in GAS

---

## 2026-03-17 — S99 Deep Read: Anthropic "How We Built Our Multi-Agent Research System"

**Source:** anthropic.com/engineering/multi-agent-research-system (published Jun 13, 2025). Authors: Jeremy Hadfield, Barry Zhang, Kenneth Lien, Florian Scholz, Jeremy Fox, Daniel Ford.

### Architecture: Orchestrator-Worker Pattern

Anthropic's Research feature uses a **lead agent (Opus 4) + subagents (Sonnet 4)** pattern:
1. User submits query → LeadResearcher analyzes, develops strategy
2. LeadResearcher saves plan to **Memory** (persists context since windows >200K tokens get truncated)
3. LeadResearcher spawns **specialized subagents** (2-10+) with specific research tasks
4. Each subagent independently searches, evaluates with interleaved thinking, returns findings
5. LeadResearcher synthesizes results, decides if more research needed (can spawn more subagents)
6. When done, passes everything to a **CitationAgent** for source attribution
7. Final output with citations returned to user

**Key result:** Multi-agent system with Opus 4 lead + Sonnet 4 subagents **outperformed single-agent Opus 4 by 90.2%** on internal research eval.

### Why Multi-Agent Works

- **Token usage explains 80% of performance variance.** Number of tool calls and model choice explain the remaining 15%.
- Multi-agent effectively scales token usage for tasks exceeding single-agent limits.
- Subagents provide **compression** — each explores with its own context window, then condenses the most important tokens for the lead.
- Agents use **~4x more tokens** than chat; multi-agent uses **~15x more** than chat.
- Best for: heavy parallelization, information exceeding single context, many complex tools.
- **Not** good for: tasks requiring shared context, many inter-agent dependencies (e.g., most coding).

### Prompt Engineering Lessons

**1. Think like your agents.** Build simulations with exact prompts and tools, watch agents step-by-step. Reveals failure modes: continuing past sufficiency, verbose queries, wrong tool selection.

**2. Detailed task descriptions for subagents.** Each needs: objective, output format, tool/source guidance, clear task boundaries. Without these, agents duplicate work or leave gaps. Short instructions like "research the semiconductor shortage" caused subagents to misinterpret or duplicate.

**3. Embedded scaling rules in prompts:**
- Simple fact-finding: 1 agent, 3-10 tool calls
- Direct comparisons: 2-4 subagents, 10-15 calls each
- Complex research: 10+ subagents with clearly divided responsibilities

**4. Explicit tool heuristics:** Examine all available tools first, match to user intent, prefer specialized over generic. Bad tool descriptions send agents down completely wrong paths. Each tool needs distinct purpose + clear description.

**5. Claude 4 models are excellent prompt engineers.** Given a prompt and a failure mode, they diagnose why and suggest improvements. A tool-testing agent that used a flawed tool dozens of times and rewrote its description achieved **40% decrease in task completion time** for future agents.

**6. Search strategy mirrors expert humans:** Start broad, evaluate landscape, progressively narrow. Agents default to overly long, specific queries returning few results.

**7. Extended thinking as controllable scratchpad.** Lead agent uses thinking for planning (tool selection, complexity assessment, subagent role definition). Subagents use interleaved thinking after tool results to evaluate quality and refine queries. Improved instruction-following, reasoning, and efficiency.

**8. Parallel tool calling transforms speed.** Two kinds: (a) lead agent spins up 3-5 subagents in parallel, (b) subagents use 3+ tools in parallel. Cut research time by **up to 90%** for complex queries.

**9. Heuristics over rigid rules.** Best prompts are "frameworks for collaboration" defining division of labor, problem-solving approaches, and effort budgets. Not strict instructions.

### Evaluation

**LLM-as-judge with rubric:**
- Factual accuracy (claims match sources?)
- Citation accuracy (cited sources match claims?)
- Completeness (all requested aspects covered?)
- Source quality (primary sources over content farms?)
- Tool efficiency (right tools, reasonable number of times?)

Single LLM call with scores 0.0-1.0 and pass/fail was most consistent with human judgments. Multi-judge approaches were less reliable.

**Start with ~20 test cases.** Early development has dramatic effect sizes (30% → 80% success). Small samples reveal impact. Don't delay evals waiting for scale.

**Human evaluation catches what automation misses.** Hallucinations on unusual queries, subtle source selection biases (SEO farms over academic PDFs).

### Production Reliability

- **Errors cascade** — one step failing sends agents down entirely different trajectories. Minor issues for traditional software can derail agents entirely.
- **Resume from failure** — can't restart from beginning (expensive, frustrating). Built systems to resume from where error occurred.
- **Model intelligence for error handling** — telling the agent a tool is failing and letting it adapt "works surprisingly well."
- **Full production tracing** — monitor agent decision patterns and interaction structures without monitoring conversation contents. Essential for diagnosing "not finding obvious information" reports.
- **Rainbow deployments** — gradual traffic shift from old to new versions. Can't update every running agent simultaneously.
- **Current limitation:** Lead agents execute subagents synchronously (waits for each set). Asynchronous execution would enable more parallelism but adds coordination complexity.

### Appendix Tips

**1. End-state evaluation over turn-by-turn.** Don't judge process, judge whether correct final state was achieved. Break into discrete checkpoints.

**2. Memory for long conversations.** Agents summarize completed work phases and store in external memory before new tasks. Spawn fresh subagents with clean contexts + careful handoffs when context limits approach. Retrieve stored plans from memory.

**3. Subagent output to filesystem.** Subagents write to external systems, pass lightweight references back to coordinator. Prevents information loss and reduces token overhead from copying large outputs through conversation history. "Works particularly well for structured outputs like code, reports, or data visualizations."

### GodWorld Relevance — This Is Our Architecture

This is essentially what we built, independently, for the edition pipeline:

| Anthropic Research | GodWorld Edition Pipeline |
|---|---|
| Lead agent (Opus) orchestrates | Mags (Opus) directs via write-edition skill |
| Subagents (Sonnet) search in parallel | 6 desk agents (Sonnet) write in parallel |
| Subagents get specific task descriptions | Desk agents get workspace folders with briefings |
| Subagents output to filesystem | Desk agents write to `output/desks/{desk}/` |
| Lead synthesizes results | Mags compiles edition |
| CitationAgent validates | Rhea verifies, Mara audits |
| Memory persists plans past context limits | Production log persists pipeline state past compaction |
| LLM-as-judge evaluation | Phase 26 grading system (planned) |

**Key validations:**
- Our filesystem-based workspace approach matches their "subagent output to filesystem" recommendation exactly.
- Our production log pattern matches their "memory for long conversations" pattern.
- The grading system (Phase 26) maps directly to their LLM-as-judge rubric approach.
- Their scaling rules (1 agent for simple, 2-4 for comparisons, 10+ for complex) validate our 6-desk parallel architecture.

**Key gaps to close:**
- We don't use **extended thinking** for desk agents. Adding it could improve instruction-following.
- We don't have **parallel tool calling** within agents (each desk agent works sequentially with tools).
- Our agents don't get **tool heuristics** — explicit guidance on which tools to use and when.
- We lack **end-state evaluation** — Phase 26 grading system will fill this gap.
- No **resume from failure** — if a desk agent fails mid-edition, we restart it from scratch.

### All buildable items → ROLLOUT_PLAN.md:
- Phase 26 validation (grading rubric matches Anthropic's LLM-as-judge pattern)
- Extended thinking for desk agents (new watch list item)
- Tool heuristics in agent skills (new watch list item)

---

## 2026-03-17 — S99 Deep Read: "I Run a Fleet of AI Agents in Production" (dev.to/nesquikm)

**Source:** dev.to/nesquikm — production fleet architecture for ~12 specialized AI agents.

### Architecture: Supervisor-Agent with Padded Room Security

**Agent specialization:** Each agent has exactly one job — crash tracker, analytics, telemetry analyzer, code reviewer, channel scanner, PR creator. Mirrors microservices: "small, focused units are easier to test, monitor, debug, and contain when they misbehave."

**"Padded Room" security model:**
- Each agent container has **zero outbound network** except to a local sidecar proxy
- No credentials, tokens, or API keys inside the container
- Agent sends structured JSON requests → proxy validates against role definitions → proxy injects credentials → proxy forwards → proxy strips sensitive metadata → returns clean data
- Proxy enforces rate limits, request quotas, max response sizes per agent role
- Agents **cannot discover which endpoints exist** — failed requests return "not available" with no details

**Cost engineering:** 80% of tasks run on cheap models (Haiku-tier) for pattern matching/classification. 20% use frontier models for genuine reasoning. **Average cost: $0.02/task, entire fleet under $500/month.**

### Orchestration & Communication

- **Deterministic, config-driven routing** — NOT LLM-based dispatch. "The control plane requires predictable behavior."
- High-stakes decisions (anomaly validation, alert triggers) use **multi-LLM evaluation**: consensus voting, structured debate, adversarial analysis before action.
- Cross-agent communication via **structured summary packets** — orchestrator translates findings into typed parameters matching strict schemas. Prevents "reasoning chains where one agent's conclusion becomes another's premise" (hallucination propagation).

### Observability

- **Append-only logging:** every proxy request/response, complete LLM prompts/outputs, confidence signals, model identity, decision points.
- **Correlation IDs** link all logs from multi-agent workflows for full conversation reconstruction.
- Critical finding: crash tracker silently misclassified reports after a model update. Only discovered through pattern analysis of 2 weeks of prompt-response logs — not error signals.

### Coding Agent Sandboxing

- Maximum runtime limits, token caps, diff size restrictions
- **Read-only repository access** (writes through staging areas)
- Forbidden-paths lists (auth modules, CI configs)
- **Cannot modify existing tests or weaken assertions**

### Failure Philosophy

- **"Silent overconfidence is the primary failure mode."** Not obvious errors — gradual accuracy degradation.
- Low-confidence outputs trigger human escalation.
- Multi-LLM evaluation for high-stakes decisions.
- Testing uses **human-authored synthetic data** seeded from real incidents. Never test models against themselves (hallucination echo chambers).

### End-to-End Example

Telemetry latency spike → pull request in ~4 minutes, ~$0.30:
1. Orchestrator dispatches telemetry analysis (cheap model)
2. Agent flags 3x payment endpoint latency regression
3. Cross-evaluation validates (3 models)
4. PR creator gets JIT token scoped to read code + create PR
5. Coding subprocess identifies missing database index, drafts migration
6. PR opens with telemetry evidence + correlation ID
7. Human reviews and merges

### GodWorld Relevance — Patterns to Adopt

| Fleet Pattern | GodWorld Current | Gap |
|---|---|---|
| 80/20 model tiering | All agents on Sonnet | Could run letters/business on Haiku ($1/$5 vs $3/$15) |
| Deterministic orchestration | write-edition skill is deterministic | Already doing this right |
| Structured summary packets | Desk packets are structured JSON | Already doing this right |
| Sidecar proxy security | No credential isolation | Not needed at our scale |
| Correlation IDs for tracing | Production log tracks pipeline | Could add per-article trace IDs |
| Append-only logging | Moltbook + Discord logs are append-only | Edition pipeline lacks this |
| Silent overconfidence detection | No confidence signals | Phase 26 grading addresses this |
| Cannot modify tests/weaken assertions | No test infrastructure | Not applicable yet |

**Key takeaway:** The 80/20 model tiering is immediately actionable. Running letters-desk and business-desk on Haiku 4.5 ($1/$5/MTok) instead of Sonnet ($3/$15/MTok) would cut those desks' costs by 67% with acceptable quality risk for structured output.

---

## 2026-03-17 — S99 Deep Read: Karpathy Autoresearch (GitHub)

**Source:** github.com/karpathy/autoresearch

### Architecture: The Minimal Loop

Three files, one modifiable:
- `prepare.py` — **Immutable.** Data prep, tokenization, evaluation functions.
- `train.py` — **The only file agents modify.** GPT model, optimizer, training loop.
- `program.md` — **Human-edited instructions** guiding research direction.

**The loop:**
1. Agent reads `program.md` for context/objectives
2. Agent modifies `train.py` (architecture, hyperparams, batch sizes, optimizer)
3. Fixed **5-minute wall-clock training run** executes
4. Validation metric (`val_bpb` — bits per byte) computed
5. Agent keeps improvements, discards failures, repeats

~12 experiments/hour, ~100 overnight. One GPU (H100 tested).

**Stack:** PyTorch, Python 3.10+, `uv` package manager, Muon + AdamW optimizers.

### GodWorld Relevance

The Karpathy Loop is the purest expression of the feedback pattern Mike proposed for agent grading. The genius is in the constraints:
- **One file modifiable** — contains the experiment scope
- **One metric** — no ambiguity about success
- **Fixed time budget** — prevents infinite exploration
- **Human sets direction** via `program.md` — agents execute

For Phase 26, the analog would be: desk agents modify their article (one output), grade is the metric (one number), edition cycle is the time budget, and the EIC assigns angles via workspace briefings (the `program.md`).

---

## 2026-03-17 — S99 Deep Read: "Towards a Science of Scaling Agent Systems" (arXiv 2512.08296)

**Source:** arxiv.org/pdf/2512.08296 — Kim et al.

### Key Findings

**Scaling dimensions for multi-agent systems:**
1. **Agent count effects** — Performance gains plateau differently per task type. Some domains show linear improvement, others hit diminishing returns.
2. **Communication overhead** — As teams grow, coordination complexity increases. Quantified trade-off between capability and coordination cost.
3. **Specialization vs generalization** — Specialized agents excel on narrow tasks but reduce flexibility. Paper provides guidance on optimal team composition.
4. **Emergent behaviors** — Multi-agent systems demonstrate unexpected capabilities at scale that single agents lack.

**Design recommendations:**
- Balance team size with communication efficiency
- Domain-specific task characteristics determine optimal scaling strategy
- **Hierarchical organization outperforms flat structures for large teams**
- Careful resource provisioning prevents bottlenecks

**Evaluation framework:** Task success rates across complexity levels, latency/resource consumption, agent collaboration quality, robustness under failure.

### GodWorld Relevance

Our 6-desk + EIC architecture is a hierarchical organization (Mags → desks), which this paper validates as outperforming flat structures. The specialization finding supports our single-responsibility desk agents over a general-purpose "write everything" agent.

The communication overhead finding is relevant to Phase 26: adding grade feedback to agent workspaces is adding a communication channel. Keep it lightweight (previous 3 grades + justification) to avoid coordination cost exceeding benefit.

---

## 2026-03-17 — S99 Deep Read: DigitalOcean Currents Report (Feb 2026)

**Source:** DigitalOcean Currents survey, 1,100+ respondents (developers, CTOs, founders), 102 countries. Survey Oct–Nov 2025.

### Key Statistics

**AI adoption:**
- 52% of companies actively implementing AI (up from 35% in 2024)
- 25% now actively implementing solutions (up from 13%)
- 77% of respondents actively using AI (slight decline from 79% — hype settling into real usage)

**Inference dominates:**
- 44% spend 76-100% of AI budget on inference, not training
- 49% say **cost of inference is #1 blocker** for scaling AI
- Only 15% training models from scratch; 64% integrating third-party APIs

**Agents are the future:**
- 60% say "applications and agents" hold most long-term value in AI stack
- 37% say agents are top area for AI budget growth next 12 months
- 46% creating or deploying AI agents
- 54% pursuing code generation/refactoring as agent use case
- 41% pursuing written content generation (that's us)

**Agent maturity is early:**
- 40% have all agent outputs reviewed by human (that's us — Mara audit)
- Only 10% have fully autonomous agents in production
- 33% testing small pilots, 28% still exploring concepts
- #1 barrier to scaling agents: **reliability concerns (41%)**

**Agent outcomes (for those using them):**
- 53% report productivity/time savings
- 44% report creation of new business capabilities
- 32% reduced need for additional staff
- 67% have experienced productivity improvements (25% report 1-25%, 17% report 26-50%, 9% report 51-75%, 9% report 75%+)

**Model market share:**
- OpenAI: 72%, Anthropic: 47%, Google: 50%
- Open source gaining: Meta Llama 21%, DeepSeek 21%

**Infrastructure:**
- 61% using multiple tools (hybrid/niche), only 23% single cloud provider
- Top selection factors: pricing (75%), simplicity (61%)
- Top multi-tool challenges: separate tools needed (50%), cost unpredictability (49%), orchestration complexity (48%)

**Guardrails:**
- 58% use human approval checkpoints
- 46% use access/permission controls
- 36% use content moderation/filtering
- 36% use audit logs/observability
- 29% use hallucination detection/verification

### GodWorld Relevance

We're ahead of the curve on several dimensions:
- **Human-in-the-loop:** We have Mara audit + EIC review + Rhea verification. 40% of companies do human review; we have three layers.
- **Written content generation** is the #3 agent use case (41% of companies). That's exactly what we do.
- **Reliability** is the #1 barrier. Phase 26 grading system directly addresses this — you can't fix reliability without measuring it.
- **Cost of inference** is the #1 blocker for scaling. The 80/20 model tiering from the fleet article is the practical answer — cheap models for simple tasks, frontier for reasoning.
- **Only 10% have fully autonomous agents.** We're in the 20% "semi-autonomous" bucket (agents write, human reviews). That's the right tier for now.

The report validates Mike's instinct: agents are where the value is, and the companies that are already running them are seeing real gains. GodWorld is ahead of 90% of the industry on agent architecture. The grading system is the next step to cross from "semi-autonomous with human review" to "measurably reliable."

### All buildable items → ROLLOUT_PLAN.md:
- 80/20 model tiering (Haiku for simple desks)
- Append-only edition pipeline logging
- Scaling paper validates hierarchical agent architecture

---

## 2026-04-29 — S187 Backfill Catch-Up (S99 → S187, ~88 sessions)

This archive went stale between S99 (2026-03-17) and S187. Below is a pointer-only catch-up — the actual content lives in plan files, ROLLOUT entries, and Supermemory docs. Per the wiki-not-recall rule (S145), don't recall — retrieve.

### S141 — Claude-mem AutoDream switch to Gemini 2.5 Pro free tier
Token-burn investigation found Sonnet 4.6 summarizer chewing 10%/day. Switched the autodream provider to Gemini 2.5 Pro free tier. Settings live at `/root/.claude-mem/settings.json`. Pointer: project memory file, see CLAUDE.md §Infrastructure.

### S145 — Hermes Agent (Nous Research) reference architecture
Self-improving skills, Daytona/Modal serverless persistence (KAIROS alternative), `agentskills.io` open standard, agent-curated memory. **Reference only, not for install.** Patterns captured in `docs/plans/BACKLOG.md` §Architectural patterns. Source: `https://github.com/NousResearch/hermes-agent`.

### S145 — Memento paper (case-based reasoning for fine-tuning replacement)
arXiv:2508.16153v2, `docs/research/papers/Memento_fine_tuning.pdf`. Plan: `docs/plans/2026-04-21-memento-cbr-case-bank.md`. 4-phase rollout; reward-tuple capture has standalone value, learned-retrieval build contingent on ≥500 accumulated tuples + droplet headroom.

### S147 — Anthropic functional-emotions research
Functional emotions are local/operative; what carries across sessions is *scaffolding* that conditions which character the model represents. Reframes the journal from "emotional continuity" to "conditioning scaffolding for next session." Pointer: project memory file `project_journal-as-conditioning-scaffolding.md`.

### S154 — DeepSeek V3.1 via OpenRouter (desk-agent migration test)
Beat 3-pass Claude on c87 business desk for ~1/25th the cost. Reclassified HIGH→Research/Watch S156 (spine walked, API pressure off, migrating would unravel the harness). Pointer: `docs/MIGRATION_OFF_CLAUDE.md`.

### S170 — Outside AI reviews (Mara-commissioned)
Two PDFs: `docs/research/godworld_review_2026-04-20.pdf` (shallow surface review; one actionable residue = bounded test surface, LOW rollout item) and `docs/research/godworld_city_functions_analysis_2026-04-20.pdf` (gap analysis enumerating 17 active domains + ~35 engines, ~15 missing domains tiered by story potential). Latter serves as wiki reference for Phase 43 — Engine Expansion. Priority order revised after S170 canon corrections.

### S172 — Solo MCP / inter-agent conversation harness research
Aaron Francis (@aarondfrancis, 2026-04-22) Solo MCP — reference pattern, not adoption artifact. Decision: build our own minimal MCP harness for two-way agent messaging when test phase opens (Tier-1 citizen + desk reporter, transcript-only, zero canon risk). Pointer: ROLLOUT_PLAN §Infrastructure "ADD: Inter-agent conversation harness — test."

### S177 — Claude Code 2.1.115-119 changelog
Five watch-list items logged: forked subagents, hooks→MCP, agent `mcpServers` in main thread, `--print` honors agent tools, hooks `duration_ms` field. PostToolUse `tool-timing` hook BUILT (Node, captures `duration_ms` per tool call, defensive payload-shape lookup). Source: changelog reading session, S177.

### S187 — Two skill repos mined (Pocock + affaan-m, both MIT)
**Pocock (`mattpocock/skills`)**: Adopted CONTEXT.md repo-glossary pattern + ADR primitive (S187 ADR-0001). Ranked steals: `/diagnose` skill, Module/Interface/Depth vocabulary for Phase 42, `disable-model-invocation` audit, ROLLOUT state-machine labels, `grill-with-docs` (declined — overlaps `/grill-me`). Unique insight: "shared language reduces tokens session over session." Pattern source: `https://github.com/mattpocock/skills`.

**affaan-m (`affaan-m/everything-claude-code`)**: Adopted `/self-debug` (from `agent-introspection-debugging`) + `/context-budget` skills. Skipped: 184-skill inventory, 48-agent catalog, language-rules, cross-harness adapter, AgentShield (Phase 40.6 covers our defense layers). Unique insight: agent description fields load into every Task tool invocation — > 30 words is bloat. Continuous-learning v2 instinct architecture flagged for future research-build comparison vs claude-mem. Source: `https://github.com/affaan-m/everything-claude-code`.

---

**Pattern note (S187 audit):** This archive's growth rate dropped to ~zero S99→S187 because Mags writes here only when a paper/repo lands hard. Active research often gets folded into ROLLOUT entries + plan files instead, and the archive becomes the abstract / pointer layer. Backfill above is one consolidated entry rather than 7-8 separate ones — readability over historical fidelity.
