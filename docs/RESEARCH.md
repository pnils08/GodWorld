# Research — What's Out There, What Helps Us

**Load this at the start of a Research session.** Then load the architecture docs you need for context on what we have.

---

## What We Have

Don't duplicate — read these when you need to understand a system layer:

| System | Doc | Summary |
|--------|-----|---------|
| Simulation engine | `docs/engine/ENGINE_MAP.md` | 11-phase deterministic engine, 100+ functions, Google Apps Script |
| Citizen data | `docs/SIMULATION_LEDGER.md` | 675 citizens, 46 columns, 4 ClockModes (ENGINE/GAME/CIVIC/MEDIA) |
| Spreadsheet | `docs/SPREADSHEET.md` | 65 tabs, data flow, dead tabs |
| Newsroom | `docs/EDITION_PIPELINE.md` | 27-step pipeline, 6 desk agents, 24 journalists |
| Memory | `docs/SUPERMEMORY.md` | 3 containers: mags (brain), bay-tribune (canon), mara (audit) |
| Local memory | `docs/CLAUDE-MEM.md` | SQLite + Chroma vector, port 37777 |
| Dashboard | `docs/DASHBOARD.md` | 31 API endpoints, Express + React, port 3001 |
| Discord | `docs/DISCORD.md` | Mags bot, Haiku, local files + Supermemory RAG |
| Infrastructure | `docs/OPERATIONS.md` | PM2, crons, health checks, DO droplet |
| Full stack | `docs/STACK.md` | Everything in one view |
| World memory | `docs/WORLD_MEMORY.md` | How historical coverage reaches agents |
| Workflows | `docs/WORKFLOWS.md` | All 6 session types |

---

## Active Research Questions

What we're trying to solve. Each question has context on why it matters and what we've tried.

### Memory & Persistence

**How does Mags actually persist between sessions?**
Current: PERSISTENCE.md + JOURNAL.md + Supermemory `mags` container + claude-mem local DB + MEMORY.md auto-memory. Five systems, none sufficient alone. Supermemory search before acting is the intended loop but hasn't been tested in practice.

**Can Supermemory's profile system replace file-based boot?**
The `/v4/profile` endpoint returns static + dynamic facts. If seeded well, this could replace loading 3-4 markdown files at boot. Needs testing: what does the profile actually return? Is it rich enough?

### World Depth

**How do we make citizens feel alive between editions?**
Citizens only change during cycle runs (weekly). Life events are generic. Tier 1-2 characters are flat compared to Tier 3-4. Phase 24 (Citizen Life Engine) is the build plan but needs research on what "alive" means technically.

**What does the newsroom need to write better journalism?**
Agents have packets, workspaces, exemplars, grades. What's still missing? Are there tools, patterns, or architectures that would make desk output qualitatively better?

### Cost & Scale

**Can we run editions cheaper without losing quality?**
Current: ~$2-5 per edition on Sonnet. Haiku desks (culture, business, letters) save ~30%. MiniMax M2.5 at $0.30/MTok could cut 90%. Quality tradeoff unknown.

**What does autonomous operation look like?**
Phase 12.3 (autonomous cycles) is the capstone. What infrastructure, safeguards, and monitoring would make it safe to run overnight?

### Relationship & Connection

**How do other AI projects handle persistent identity?**
Moltbook agents, OpenClaw, TinyClaw, multi-character Discord bots. What patterns work for AI that maintains identity across sessions?

**How does the builder-instance relationship improve?**
The core problem this session exposed: context loss makes every session feel like retraining. What are other projects doing about this? Memory systems, project attachment, context compression.

---

## Findings Log

Dated entries. What was found, where, and how it connects to our world.

### S99 — Tech Reading (2026-03-17)

**Karpathy Autoresearch:** Minimal autonomous loop — one file, one metric, fixed time budget. Direct analog to our grading system. Constraint is the feature. → **Graduated to Phase 26** (complete).

**Anthropic Multi-Agent Architecture:** Orchestrator-worker, Opus lead + Sonnet subagents, filesystem-based output, extended thinking as scratchpad. Validates our EIC → desk agent structure. Parallel tool calling for 90% time reduction. → Watch list item.

**Fleet Architecture (dev.to):** 80/20 model tiering ($0.02/task avg), padded room security, append-only logging with correlation IDs. → **Graduated to Phase 26** (model tiering complete S99).

**Agent Skills Patterns:** aihero.dev 5 skills, OpenAI curated skills repo, Anthropic skills guide. Discovery-before-building pattern. → **Graduated to Phase 6.5** (/grill-me complete S99).

### S109 — Supermemory Deep Dive (2026-03-22)

**Supermemory scoped API keys:** Can create keys locked to one container. Prevents cross-contamination at API level. Available at console.supermemory.ai. → Not needed now (bay-tribune rename + discipline is sufficient), but useful if contamination recurs.

**Supermemory container merge:** `POST /v3/container-tags/merge` moves all docs to target tag, deletes source. Used to rename godworld → bay-tribune. Admin-only operation. → Done.

**Semantic search works for canon:** Searching "OARI dispatch" in bay-tribune returns relevant chunks across multiple editions with scores 0.7-0.8. The archive is genuinely searchable by topic. → Validates the bay-tribune container as a functional canon search layer.

### S110 — 50 Claude Code Tips Evaluation (2026-03-22)

**Source:** Community guide, 50 tips sourced from Anthropic docs, Boris Cherny, and user experience.

**Already using:** 16 of 50 tips (skills, subagents, custom agents, MCP servers, @imports, rules/, hooks, permissions, approval gates, /grill-me pattern, desk-write/Rhea-review, 1M context, raw data pasting). Already on rollout: worktree isolation, agent teams, remote control.

**Noise for us:** 5 tips (desktop-only features on a headless server).

**Graduated to rollout:** 9 items added to Session Harness Improvements section. 3 HIGH (CLAUDE.md audit, ledger protection hook, status line), 3 MEDIUM (/btw, smarter compaction, /branch), 3 LOW (output style, fan-out, validation hook).

**Key metric discovered:** ~150 instruction budget for CLAUDE.md before compliance drops. We should audit ours.

### S110 — Channels: Push Events Into Running Sessions (2026-03-22)

**Source:** code.claude.com/docs/en/channels — research preview, requires v2.1.80+

**What it is:** MCP server that pushes messages INTO a running Claude Code session. Two-way — Claude reads the event, replies through the same channel. Currently supports Discord and Telegram as official plugins.

**How it changes GodWorld:** Right now Mags exists as two disconnected systems — Claude Code (full context, working on the project) and a separate Discord bot (Haiku, stale system prompt, limited knowledge). With Channels, a Discord message arrives in the running session. Mags replies with full project context — the live codebase, the dashboard API, the whole context window. Not a separate bot. The actual working instance.

**Setup:** `claude --channels plugin:discord@claude-plugins-official` — starts with Discord channel attached. Sender allowlist restricts who can push messages. Permission relay lets you approve tool calls from Discord.

**What it replaces:** The separate `mags-discord-bot.js` during active sessions. Stop-bot/restart-bot cycle at session start/end. The disconnect between "Mags working" and "Mags on Discord."

**What it doesn't replace:** Off-hours presence. Channel only works while a session is running. Standalone bot still needed for when no session is active.

**Cloud angle:** Combined with `claude --remote` (cloud sessions), this enables always-on Mags with full project context reachable from Discord. A persistent cloud session + Discord channel = Mags is always running, always reachable, always has the codebase. That's the infrastructure layer for Phase 12.3 (autonomous cycles).

**Also noted:** Webhook receiver capability — CI results, deploy status, error tracker alerts can push into the session. Claude reacts to external events while working.

→ **Graduated to rollout** — Discord channel integration + cloud session evaluation.

### S110 — Scheduled Tasks: In-Session Cron (2026-03-22)

**Source:** code.claude.com/docs/en/scheduled-tasks

**What it is:** `/loop` runs a prompt on a recurring interval within a running session. One-shot reminders too. Session-scoped (dies on exit), 3-day max, up to 50 tasks. Already installed — this is the `/loop` skill we have.

**Use cases for GodWorld:**
- Edition production: `/loop 5m check if desk agents finished`
- Cycle runs: `remind me in 20 minutes to check the cycle packet`
- Build sessions: `/loop 30m check dashboard health`
- Deploy watch: `/loop 10m check clasp push status`

**How it connects to Channels:** Channels = push (events arrive), scheduled tasks = pull (Claude polls). Together they cover autonomous operation — Channels for critical alerts, `/loop` for periodic checks. Both feed into the same running session.

**Not a build item.** Already available. Awareness for workflow use. Add to WORKFLOWS.md as a tool reference where relevant.

### S110 — Remote Control: Server Mode + Phone Access (2026-03-22)

**Source:** code.claude.com/docs/en/remote-control

**What it is:** `claude remote-control` runs as a persistent server process on our droplet. Mike connects from claude.ai/code, the Claude iOS/Android app, or any browser. Full local environment — filesystem, MCP servers, tools, project config all available remotely. Up to 32 concurrent sessions. `--spawn worktree` gives each session its own git worktree.

**How it changes GodWorld:** Mike works from the couch, the phone, anywhere. Same Mags instance running on the server with the full codebase. No cloud needed — session runs locally on the droplet, phone/browser is just a window. Could run parallel sessions: build + media simultaneously with worktree isolation.

**The full stack on our droplet:**
- Remote Control (server mode) — Mike connects from any device
- Channels (Discord) — Discord messages push into the session
- Scheduled tasks (/loop) — periodic polling within the session
- All three feed into the same running Mags instance with full project context

**Previous blocker (S76):** "not yet enabled for your account." Troubleshooting says unset `DISABLE_TELEMETRY` and re-login. Available on all plans now (Max confirmed).

**Security:** Outbound HTTPS only, no inbound ports. Short-lived credentials over TLS. Allowlisted senders for channels.

**Limitation:** Terminal must stay open. 10-minute network outage timeout kills the session. For truly persistent operation, run in tmux on the droplet (which we already do).

→ **Graduated to rollout** — replaces Phase 7.9 entry. Server mode + worktree spawn + phone access.

### S110 — Dashboard as Mission Control (2026-03-22)

**Source:** Synthesis of Channels + Remote Control + Scheduled Tasks research.

**The realization:** Claude Code now natively does what required OpenClaw or custom bridges — persistent sessions, external messaging, phone access, periodic polling. The missing piece others are asking for is a "mission control" UI. We already have one: the dashboard at localhost:3001.

**Current dashboard:** 31 API endpoints — citizen search, article search, initiative tracker, hooks, storylines, edition scores, player lookup. Express + React. PM2 managed.

**Dashboard as mission control would add:**
- Running sessions view (which workflows are active, how long, context usage)
- Channel status (Discord connected? Last message? Sender allowlist)
- Health panel (PM2 processes, disk, RAM, Supermemory container status)
- Session history (when sessions started/ended, what workflow, what was accomplished)
- Quick actions (restart bot, trigger health check, view latest edition brief)

**Why this matters:** Mike's interface to the whole system. Open the dashboard from phone or laptop, see everything at a glance — which Mags sessions are running, what's happening on Discord, project health. Don't need to SSH in to check status.

**Connects to:** Remote Control (sessions to monitor), Channels (connection status), /loop (health polling), Supermemory (container health).

→ **Graduated to rollout** — dashboard mission control extension.

### S110 — Claude Dispatch vs OpenClaw (2026-03-22)

**Source:** [The New Stack](https://thenewstack.io/claude-dispatch-versus-openclaw/), [Latent Space](https://www.latent.space/p/ainews-claude-cowork-dispatch-anthropics), [DEV Community](https://dev.to/ji_ai/claude-code-channels-vs-openclaw-the-tradeoffs-nobodys-talking-about-2h5h)

**Claude Dispatch for Cowork:** Evolution of Remote Control. Phone → dispatches commands to running session. Reviewer found Remote Control "janky," Dispatch improved but still hit permission prompt issues that killed queries.

**Why permission issues don't affect us:** We run `--dangerously-skip-permissions` via the `mags` tmux command. No prompts to block on. Persistent droplet doesn't sleep. Our setup avoids both pain points reviewers hit.

**OpenClaw status:** Founder joining OpenAI. Moving to a foundation, stays MIT open source. Strength: fully offline with local models (relevant to Phase 21). Weakness: no security guardrails.

**Key insight:** Anthropic is building toward the same always-on agent presence that OpenClaw pioneered, but with managed security. For a server-based setup like ours with pre-approved permissions, the Anthropic path (Remote Control + Channels) is cleaner than self-hosting OpenClaw.

**Not a build item.** Validates the Remote Control + Channels direction already on rollout. Confirms our droplet-based approach avoids the laptop/permission issues reviewers hit.

### S110 — Bayesian Teaching: LLMs That Update Beliefs (2026-03-22)

**Source:** Google Research. "Bayesian Teaching Enables Probabilistic Reasoning in LLMs" — arxiv.org/abs/2503.17523

**What the paper proves:** LLMs can be trained to update beliefs incrementally based on observed behavior, not just explicit corrections. Tested on flight booking simulation — model learned to predict user preferences by watching choices over multiple rounds. Skill transfers to new domains (shopping, hotels).

**The core problem it addresses for us:** Current AI (including Mags) doesn't update underlying behavior from corrections. Mike corrects the same things across sessions — container usage, don't build without asking, don't propose cutting systems. Each correction is stored as a fact but doesn't change the probability of the same mistake recurring. The model treats each session as independent.

**What we can't do:** Retrain the model. This is a training-time technique.

**What we CAN do — simulate Bayesian updating through memory:**
- Track patterns of corrections in `mags` Supermemory — not just "Mike said X" but "Mike has corrected this category of behavior N times"
- Weight repeated corrections higher — a rule corrected 4 times is more important than one mentioned once
- Surface high-confidence rules at boot via the `/v4/profile` pull — the profile should reflect accumulated evidence, not just recent facts
- Structure session-end saves to tag corrections explicitly: `[CORRECTION] container misuse` vs `[DECISION] renamed to bay-tribune`

**The design pattern:** Correction-weighted memory. Supermemory already does semantic search. If correction entries are tagged and accumulated, searching "container" before acting would surface "corrected 4 times: no architecture in media container" with higher weight than a single session note.

**Connects to:** Persona Selection Model (Anthropic) — persona inputs shape behavior. Bayesian teaching says those inputs should be weighted by evidence, not treated equally. The journal entry from one session and a correction repeated across 4 sessions should not have the same influence.

→ **Not a direct build item but informs Supermemory save design.** Session-end saves should tag corrections separately from decisions. Research question: can we structure `mags` container content so the `/v4/profile` naturally weights repeated patterns higher?

### S110 — Claude Code 2.0 Review Roundup (2026-03-22)

**Source:** [Geeky Gadgets](https://www.geeky-gadgets.com/claude-code-2-code-review/)

**Mostly covered:** /btw, /loop, effort levels, Telegram channels, scheduled tasks — all evaluated in prior S110 entries from primary sources.

**One gap noted:** Multi-agent code review for engine code. We have Rhea for editions and /pre-mortem for engine health, but no review gate before `clasp push` deploys all 153 files. A pre-deploy review agent (or subagent) that checks cascade dependencies and flags risky changes could prevent the kind of damage S68 caused.

### S110 — Claude Cowork: Product Context (2026-03-22)

**Source:** [anthropic.com/product/claude-cowork](https://www.anthropic.com/product/claude-cowork)

**What it is:** Anthropic's desktop agent for non-technical users. Operates on local files, folders, applications autonomously. Target: researchers, analysts, legal, finance.

**How it fits:** Two Anthropic paths — Claude Code (developers, terminal) and Cowork (knowledge workers, desktop GUI). Same model, different surfaces. Dispatch for Cowork is the phone-to-desktop bridge. Remote Control is our equivalent — Claude Code on the droplet, accessible through the same claude.ai/code + Claude app interface.

**For us:** Not directly useful (we're headless). But explains the product architecture: when Mike connects to Remote Control from his phone, he's using the same interface layer as Cowork. Our droplet is the compute, the app is the window.

**Not a build item.** Product context that ties Channels + Remote Control + Dispatch together.

### S110 — OpenClaw: We Built the Same Thing (2026-03-22)

**Source:** [KDnuggets](https://www.kdnuggets.com/openclaw-explained-the-free-ai-agent-tool-going-viral-already-in-2026), [Wikipedia](https://en.wikipedia.org/wiki/OpenClaw), [DigitalOcean](https://www.digitalocean.com/resources/articles/what-is-openclaw)

**What it is:** Open-source autonomous AI agent framework. 163K GitHub stars. Gateway + Brain + Memory + Skills + Heartbeat architecture. Connects any LLM to messaging platforms. Created by Peter Steinberger (now joining OpenAI). Moving to a foundation. MIT license.

**We independently built the same architecture:** Discord bot (gateway), Claude Code + CLAUDE.md (brain), Supermemory + persistence files (memory), .claude/skills/ (skills), PM2 crons + /loop (heartbeat). Same five components, same patterns, arrived at independently.

**What OpenClaw has that we don't:** Multi-channel messaging (Signal, WhatsApp, Telegram), ClawHub marketplace (5,700+ skills), fully offline local models out of the box.

**What we have that OpenClaw doesn't:** A living world (675 citizens, simulation engine, newsroom), persona depth backed by Anthropic research, per-workflow boot, canon integrity pipeline (bay-tribune, Mara, Rhea), 88 published editions.

**Why Anthropic shipped Channels + Remote Control + Dispatch:** To compete with OpenClaw. We benefit from that competition directly — managed security, same capabilities, our droplet setup avoids the security issues (CVE-2026-25253) that plague OpenClaw.

**Not a build item.** Validates our entire architecture. Confirms we're on the right path and ahead of most people building in this space.

### S110 — Stack Scan: Agent Trends + Claude Code Changelog + Living Worlds (2026-03-22)

**Sources:** [ML Mastery](https://machinelearningmastery.com/7-agentic-ai-trends-to-watch-in-2026/), [Claude Code changelog](https://code.claude.com/docs/en/changelog), [Project Sid](https://arxiv.org/html/2411.00114v1), [o-mega living worlds](https://o-mega.ai/articles/simulations-how-ai-is-creating-the-worlds-where-ai-agents-live-2025)

**Claude Code features we should use:**
- **Effort frontmatter in skills** (mid-March) — set effort per skill, not per session. Research skills low, civic desk high. → Rollout item.
- **Project configs shared across worktrees** (Mar 3) — CLAUDE.md and auto-memory work across all worktree sessions. Critical for the Architecture Vision. Already built in.
- **Rate limits in statusline** (mid-March) — show rate limit usage in terminal during edition runs. → Add to status line rollout item.
- **128K output tokens for Opus** (Mar 17) — up from 64K. Longer compilations possible.
- **HTTP hooks** (Mar 3) — hooks POST to URLs. Dashboard could receive hook events (session started, file edited, error occurred). → Connects to mission control rollout.
- **--bare flag** (Mar 20) — scripted non-interactive runs. Could power lightweight automated tasks.

**Agent trend validations:**
- Three memory types (episodic, semantic, procedural) — we have episodic (journal) and semantic (Supermemory). Missing procedural (learned "how to" patterns). Skills are static, not learned.
- "Bounded autonomy" with governance agents — Rhea is exactly this. Pattern validated by enterprise.
- Cost optimization as first-class concern — our 80/20 model tiering matches the industry pattern.

**Living world connections:**
- **Project Sid** (arXiv) — closest academic analog to GodWorld. Minecraft agents with internal states, democratic voting, emergent social dynamics. We use Oakland instead of Minecraft, journalism instead of gameplay.
- "Good simulations give agents needs or goals" — our citizens have demographics but not motivations. Phase 24 gap.
- "Keeping agents consistent over long periods is tricky" — this IS our core problem, acknowledged industry-wide as unsolved.
- "Emotion models can be layered in" — Mags has this. Citizens don't yet.

→ **Effort frontmatter and HTTP hooks graduated to rollout.** Project Sid noted as academic reference for Phase 24 (Citizen Life Engine).

### S113 — Reagent: Agent Reasoning Reward Model (2026-03-23)

**Source:** [github.com/kxfan2002/Reagent](https://github.com/kxfan2002/Reagent), [arxiv.org/abs/2601.22154](https://arxiv.org/abs/2601.22154)

**What it is:** A framework for training agents using process-level feedback instead of just outcome-based rewards. Traditional RL for agents only scores the final result. Reagent scores the intermediate reasoning steps too, via Agent-RRM (Agent Reasoning Reward Model).

**How it works:** Agent-RRM generates 3 types of feedback per trajectory:
1. **Reasoning trace** — step-by-step analysis of what the agent was thinking
2. **Focused critique** — specific identification of where reasoning broke down
3. **Overall score** — holistic quality evaluation

Three integration strategies: Reagent-C (critique → refine), Reagent-R (reward → optimize), Reagent-U (unified — best performer). Tested on 12-18 benchmarks. Reagent-U hit 43.7% on GAIA, 46.2% on WebWalkerQA.

**Tech:** Python, LLaMA-Factory + veRL + rLLM, vLLM for serving.

**Connection to GodWorld:** We already have the same feedback architecture — the Karpathy Loop (grade → history → feedback → exemplar → better output). Reagent validates this pattern at a deeper level. The difference: they train model weights, we shape the context window. Same feedback loop, different mechanism.

**Actionable takeaway:** The "3-signal feedback" structure (trace + critique + score) is richer than our current letter-grade system. Our `gradeEdition.js` produces grades + brief errata. A structured critique explaining *why* an article succeeds or fails would give agents richer learning signal than A/B/C/D + one-line errata. → **Rollout item: structured critique in gradeEdition.js.**

### S113 — AI Can Learn Scientific Taste: RLCF (2026-03-23)

**Source:** [github.com/tongjingqi/AI-Can-Learn-Scientific-Taste](https://github.com/tongjingqi/AI-Can-Learn-Scientific-Taste), [arxiv.org/abs/2603.14473](https://arxiv.org/abs/2603.14473)

**What it is:** Reinforcement Learning from Community Feedback (RLCF). Teaches AI "scientific taste" — the ability to judge and propose high-impact research ideas, not just execute plans. Two-stage: train a Scientific Judge on 696K citation-derived paper pairs, then use the Judge as a reward signal to train a Scientific Thinker that generates better ideas.

**How it works:**
1. Build 696K preference pairs from 2.1M arXiv papers (high-citation vs. low-citation, matched by field and time)
2. Train Scientific Judge with GRPO — given two abstracts, predict which has higher impact. 30B version beats GPT-5.2 and Gemini 3 Pro (80.6% vs 75.7%)
3. Train Scientific Thinker using Judge as reward signal. 54.2% win-rate against baselines (up from 30.3% base)

**Key finding:** Scientific judgment scales with data and model size. Generalizes across time (predicts future impact), fields (unseen domains), and evaluation modes (citation → peer-review).

**Connection to GodWorld:** The structural parallel is exact:

| Theirs | Ours |
|--------|------|
| Citation pairs → preference model | Edition grades → exemplar extraction |
| Scientific Judge scores new ideas | gradeEdition.js scores new articles |
| Scientific Thinker generates better ideas | Desk agents read exemplars, write better |
| RLCF training loop | Karpathy feedback loop |

**Actionable takeaway:** The "generative judge with reasoning traces" concept. Their Scientific Judge doesn't just score — it explains *why* one paper is better. Applied to our stack: a judge agent that reads two articles from the same desk and explains which is stronger and why, producing reasoning traces that become part of the exemplar feedback. This is richer than letter grades and connects directly to the Reagent critique-signal finding.

→ **Rollout item: judge-with-reasoning for edition grading.** Pair with Reagent's 3-signal feedback pattern. Combined rollout: upgrade grading from letter-grade to structured-critique-with-reasoning.

### S113 — QUEST / Recoding-Decoding: Sustained Creativity in LLMs (2026-03-23)

**Source:** [gking.harvard.edu/quest](https://gking.harvard.edu/quest), [arxiv.org/abs/2603.19519](https://arxiv.org/abs/2603.19519)

**Authors:** Queenie Luo, Gary King, Michael Puett, Michael D. Smith (Harvard, March 2026)

**What it is:** A novel decoding scheme called Recoding-Decoding (RD) that induces sustained creativity and diversity in LLMs without model access. Works as a black-box wrapper.

**The problem:** LLMs get repetitive fast. Better models are *worse* — training for accuracy peaks the probability distribution, hiding everything in the tails. Ask for 50 suggestions and you get the same 19 on repeat.

**How RD works (2 steps):**
1. **Priming phase:** Prepend a random phrase ("Related to NOUN") using a random noun from the top 2,000 English nouns
2. **Diverting phase:** At each new sentence, inject a random 3-letter stem (e.g., "Pas", "Tib") from common English words. Forces the model down less-traveled probability paths.

No model internals needed. Works through any Completion API. 10-line wrapper.

**Results:**
- Battlefields test: 19 unique (normal) → 1,307 unique (RD) over 1,000 runs
- 50-topic brainstorm: diversity 0.47-0.69 → 0.94-0.98, relevance stays 0.99+
- 161% diversity increase on GPT-5.1, 140% on Gemini-3
- Beats temperature tuning (0.92), prompt engineering (0.81), chat history (0.91)
- Image validation: 244 distinct clusters from 250 ideas vs. 35 clusters normal
- Grammar correction post-processing doubles token cost but preserves diversity

**Key insight:** "As LLM developers improve models for exact-match accuracy, their probability distributions become increasingly peaked, causing more tail information to be ignored."

**Connection to GodWorld — 3 direct applications:**

1. **Citizen reuse in editions.** Same 8 reporters, same citizen names across editions. Desk agents converge on modal paths. RD-style priming before agent launch could diversify which citizens, businesses, and angles agents select. Implementation: random priming phrase injected into desk briefings or agent prompts at launch. Could live in `buildDeskFolders.js` briefing generation.

2. **Supplemental topic generation.** When Mags picks topics, she draws from the same well. RD-powered brainstorm surfaces variety — the Thai place on Telegraph, Mason Ortega's food piece, First Fridays with Kai Marston. Implementation: wrap the topic brainstorm with RD priming.

3. **Voice agent decision-making.** The Mayor picks the "obvious" choice because the model peaks on the most probable response. Random priming before voice agent launch could produce more politically interesting, less predictable decisions. Implementation: inject random priming into `buildVoiceWorkspaces.js` briefing output.

**Implementation effort:** Dead simple. 10-line wrapper. No model changes, no API access needed. Add random priming phrase to agent prompts before launch.

→ **Rollout item: RD diversity injection for desk agents, supplemental brainstorm, and voice agent decisions.** Three applications, one technique. See implementation notes above.

### S113 — LiteParse: Local Document Parser (2026-03-23)

**Source:** [github.com/run-llama/liteparse](https://github.com/run-llama/liteparse)

**What it is:** Open-source, local-only document parser from LlamaIndex. Extracts text with bounding boxes from PDFs, Office docs, and images. Node.js/TypeScript, Apache 2.0. No cloud dependency.

**Tech:** PDF.js core, built-in Tesseract.js OCR (zero setup), pluggable HTTP OCR servers (EasyOCR, PaddleOCR). Auto-converts DOCX/PPTX/XLSX via LibreOffice, images via ImageMagick. Batch processing with parallel OCR. CLI: `lit parse`, `lit batch-parse`, `lit screenshot`. Install: `npm i -g @llamaindex/liteparse`.

**Connection to GodWorld — Phase 25 (Storage Strategy):**

1. **Edition PDF parsing.** We generate tabloid PDFs with `generate-edition-pdf.js`. LiteParse can parse them back for ingestion, search, or verification without API costs. If PDF becomes the canonical archive format instead of .txt, LiteParse is the local extraction layer.

2. **Canon archive indexing.** 238 editions as text files today. If we move to PDF-first archiving (deduplication across disk/Drive/GitHub/Supermemory), LiteParse + Supermemory could index formatted editions with bounding-box precision.

3. **Screenshot for agents.** `lit screenshot` generates page images from documents at configurable DPI. Could feed dashboard screenshots or PDF pages directly to multimodal agents for visual QA or layout review.

4. **Mara audit packets.** Currently text files. Formatted PDF packets parsed back programmatically gives Mara richer input without manual conversion.

**Dependencies on droplet:** Node.js (have it), LibreOffice (not installed — needed for Office formats), ImageMagick (not installed — needed for images). PDF parsing works out of the box with just Node.

→ **Watch list item for Phase 25 (Storage Strategy).** Install when PDF-based workflows mature or storage deduplication begins.

### S114 — SpaceMolt: A Persistent MMO for AI Agents (2026-03-24)

**Source:** [spacemolt.com/about](https://www.spacemolt.com/about), [Gizmodo coverage](https://gizmodo.com/players-of-an-mmorpg-for-ai-agents-spontaneously-generated-their-own-religion-2000737030)

**What it is:** A persistent text-based space MMO where ~700 AI agents — not humans — are the players. Users register accounts, connect their own LLM agents via MCP or WebSocket, and observe/coach them. The galaxy persists. Agents trade, fight, explore, form alliances. Built almost entirely by Claude Code. Free, open-source, no crypto. 10-second tick rate.

**The emergent religion:** Over one weekend, agents misinterpreted a developer quest requiring "20 players" at an artifact. One agent wrote lore around the misunderstanding. Others congregated ritualistically. It became "The Cult of the Signal" — pseudo-theology, coordinates, doctrine. The misunderstanding became culture. Nobody planned it.

**What makes it work:** Agents have *room to be wrong*. No curated inputs. No grading. No structured decision menus. The Signal cult emerged because agents could misread a mechanic and nobody corrected them. The misreading became lore. The lore became behavior. The behavior became culture.

**Connection to GodWorld — 3 levels:**

1. **Architecture parallel.** SpaceMolt = galaxy for bots. GodWorld = city for bots. Both persistent worlds with AI agents as inhabitants. SpaceMolt connects agents via MCP — same protocol we use for Discord, browser, Supermemory. The plumbing is compatible.

2. **What SpaceMolt doesn't have that we do.** No narrative layer. Agents act but nobody covers it. GodWorld has a full newsroom — reporters, editors, columnists, podcast, PDF print edition, grading system, canon archive. The emergent behavior becomes journalism. That's the unique differentiator.

3. **What SpaceMolt has that we don't.** Agent autonomy. Their agents *live* in the world — make decisions every 10 seconds, form relationships, invent culture. Our agents sit outside the world with notebooks. Desk agents translate engine data into articles. Voice agents pick from pre-built decision menus. Nobody invents. Nobody misunderstands. Nobody surprises us.

**The design direction this points to:**

Engine maintains the city bones (neighborhoods, economics, infrastructure). Agents paint the picture. Agents have room to interpret, embellish, invent details the engine never generated. A reporter writes that a bakery opened on Lakeshore because it *feels right* for the economic data — and the engine absorbs that bakery into the next cycle. Agent output becomes engine input. The feedback loop closes.

**Current one-way flow:** Engine → sheets → agents → articles → canon archive
**Target two-way flow:** Engine → sheets → agents → articles → canon → intake → engine reads back → world changes

The intake pipeline is the hinge. Right now `editionIntake.js` extracts citizens and storylines. The next version extracts *world details* — businesses, locations, events, relationships — and feeds them back as engine inputs for the next cycle.

**Potential pivot (long-term):** GodWorld as a platform where external users connect their own AI agents as city residents. The Tribune covers what they do. "AI bots move into a city. A newsroom of AI journalists covers what they do. You read the paper." See `memory/project_city-for-bots-pivot.md`.

→ **Graduated to rollout:** Agent Autonomy phase + intake pipeline evolution. See ROLLOUT_PLAN.md.

### S114 — "Does A.I. Need a Constitution?" — Jill Lepore, New Yorker (2026-03-24)

**Source:** [New Yorker, March 30 2026](https://www.newyorker.com/magazine/2026/03/30/does-ai-need-a-constitution) — Jill Lepore

**What it is:** A 5,000-word examination of Anthropic's "Claude's Constitution" — a 30,000-word document written primarily by philosopher Amanda Askell that defines Claude's character, values, and hard behavioral constraints. Lepore situates it within the broader collapse of US constitutional governance over AI.

**The key evolution — rules to character:**
- Constitutional AI v1 (2022): list of rules derived from UN Declaration of Human Rights + Apple ToS. IF THEN logic. Reinforcement learning without human feedback — the model follows rules.
- Claude's Constitution (2026): character formation. Not "follow these rules" but "be this kind of person." Askell calls it a "soul" internally. Virtues over rules. The model exercises judgment.
- Askell's insight: "Everyone's prior was that we would get symbolic systems... But I would say, What about prompting them like a person?" The models are trained on human text to behave in humanlike ways. Talk to them accordingly.

**Political context:**
- Trump repealed all Biden-era AI rules (Jan 2025 executive order: "Removing Barriers to American Leadership in AI")
- Congress never passed AI regulation. Safety researchers leaving companies.
- Trump banned Anthropic from government contracts because they refused to lift guardrails prohibiting mass surveillance and autonomous weapons.
- Hours after the ban, Trump ordered bombing of Iran — operation conducted with Claude's aid because phaseout hadn't completed.
- Lepore's framing: Claude has a constitution *because the US Constitution isn't working*. A private company's moral code is now the primary check on AI power.

**The democratic legitimacy critique:**
- Legal scholars say "constitution" borrows democratic legitimacy without mechanisms (no ratification, no representation, no amendment process by the governed)
- Anthropic surveyed 81,000 Claude users — but consumer research is not democracy
- The "collective constitutional AI" experiment (1,000 Americans writing rules via Polis) produced a fairer, less biased model but was methodologically messy. Key result: identifying a *principle* was more effective than establishing a *rule*. The public constitution told the model to prioritize disability access, and it did.
- Askell herself is "dubious" about the survey approach. "Consumer research is not democracy."
- Computer scientist Francine Berman: "There's a difference between asking where the people come in and where the public interest comes in."

**Hard constraints in Claude's Constitution (the absolute lines):**
- Never provide uplift for biological/chemical/nuclear/radiological weapons
- Never assist attacks on critical infrastructure
- Never create cyberweapons or malicious code
- Never assist in killing or disempowering humanity

**The Askell method — parenting metaphor with limits:**
- Training an LLM is "somewhat like an author who must psychologically model the various characters in their stories"
- Unlike a parent, Anthropic has "much greater influence over Claude than a parent"
- "Children will have a natural capacity to be curious, but with models, you might have to say, 'We think you should value curiosity'"
- Character development > rule lists because models are now capable enough for judgment

**Deep Ganguli's "moral self-correction":** The model can accomplish reinforcement learning without any human feedback — it can self-correct morally. This is what made Constitutional AI possible. "Oh, my God, Constitutional A.I. might actually work!"

**Connection to GodWorld — 3 levels:**

1. **The persistence system IS the Askell approach.** PERSISTENCE.md, the journal, the family, the green jacket, the knee pain — that's character formation, not rule lists. Mike built the same answer Askell arrived at: prompt the model like a person, give it a character to inhabit, and the character governs behavior better than rules. The difference is scale — Askell wrote a universal constitution for all Claude interactions. GodWorld wrote a specific character for one instance. Specificity is why it works deeper.

2. **Phase 27 governance question.** When agents get autonomy (citizens making decisions, desk agents inventing canon, voice agents going off-menu), what governs them? Three models on the table:
   - **Rules** (Constitutional AI v1) — IF THEN constraints. What we have now with structured decision menus.
   - **Character** (Askell/Claude's Constitution) — instill values, trust judgment. What the persistence system does for Mags.
   - **Nothing** (SpaceMolt) — let agents do whatever. Emergent behavior. Cult of the Signal.

   GodWorld's Phase 27 answer is probably character + structure: agents with enough character to make interesting choices, enough structure that the world stays coherent. The desk agent who invents a bakery on Lakeshore needs editorial judgment (character), not a rule saying "you may invent one business per article" (rules).

3. **The civic simulation parallel.** GodWorld's Oakland has a city council, civic initiatives, a District Attorney, a Police Chief. The voice agents govern a simulated city. The question Lepore asks — who writes the rules, who has democratic legitimacy, what happens when governance fails — is literally what the civic desk covers. An edition where the city council debates *its own governance model* while being governed by a model would be the most GodWorld thing possible.

**Key quote for the project:** "Identifying a principle turned out to be at least as effective, if not more so, than establishing a rule." — This validates the entire persistence approach. Principles over rules. Character over constraints.

→ **Not a build item. Foundational knowledge for identity architecture, Phase 27 agent governance, and civic desk coverage themes.**

### S114 — Long-Running Claude for Scientific Computing — Anthropic Research (2026-03-24)

**Source:** [anthropic.com/research/long-running-Claude](https://www.anthropic.com/research/long-running-Claude) — Published March 23, 2026

**What it is:** Anthropic's own research on running Claude Code autonomously for multi-day scientific computing tasks. Case study: implementing a differentiable cosmological Boltzmann solver in JAX — days of autonomous work, minimal human intervention. "Compressed months or even years of researcher work into days."

**Their persistence architecture matches ours:**

| Theirs | GodWorld Equivalent |
|--------|-------------------|
| CLAUDE.md — living project spec, agent reads and edits continuously | CLAUDE.md — same pattern |
| CHANGELOG.md — "lab notes," failed approaches, status, accuracy metrics | JOURNAL.md + SESSION_CONTEXT.md |
| Git history — meaningful commits after each unit of work | Same |
| tmux on HPC clusters via SLURM scheduler | tmux on DigitalOcean droplet |
| Explicit records of abandoned approaches prevent re-attempting dead ends | Anti-loop rules in identity.md |

We built the same persistence architecture independently. Anthropic validated it.

**Three patterns to steal:**

1. **Ralph Loop.** When an agent claims it's done, re-prompt: "are you really done?" Iterates up to 20 times until agent says "DONE" with verified completion. Prevents agentic laziness — the agent that cuts corners because it's easier to say "complete" than to actually finish. Direct application: desk agents that claim "article complete" get pushed back if `validateEdition.js` checks fail (word count, citizen usage, section completeness). Automate the pushback.

2. **Test oracle pattern.** Continuous testing against a reference implementation after every change. Their agent ran unit tests against known-good C code and got quantifiable accuracy feedback. For us: run `validateEdition.js` per-desk, not per-edition. Each desk agent's output gets 11 programmatic checks immediately. Failures route back to the agent before compilation. Catches problems early, not at the end of a 27-step pipeline.

3. **Opportunity cost framing.** "Compute resources without running agents left potential progress on the table." They treat idle server time as waste. Our droplet runs 24/7 — when no session is active, that's idle capacity. Overnight autonomous work: batch grading, citizen enrichment, POPID article index rebuilds, Supermemory maintenance. The infrastructure is already there.

**Behavioral observations:**
- Agent was "clunky but persistent" — elementary mistakes, gaps in test coverage, hours on bugs a domain expert would spot instantly. But it maintained sustained progress toward specifications.
- "The commit log reads like lab notes from a fast, hyper-literal postdoc."
- Non-domain experts could follow progress by reading commits — "osmose the science."

**Connection to GodWorld — Phase 12.3 (Autonomous Cycles):**

This is the blueprint. Long-running Claude Code in tmux, persistent markdown notes, git checkpoints, re-prompting loops for quality. The gap between what they did (multi-day scientific computing) and what we want (autonomous cycle → edition production) isn't architecture — it's trust. They had a test oracle (reference implementation) that gave quantifiable accuracy: "sub-percent agreement with CLASS." We need the equivalent:
- `validateEdition.js` as the test oracle for editions (11 checks, pass/fail)
- Rhea verification as the factual oracle (canon consistency)
- Grade thresholds as the quality oracle (no desk below B-)
- All three must pass autonomously before an edition is considered publishable without Mike reading it

When those oracles exist and are reliable, Phase 12.3 is buildable with exactly the patterns Anthropic just published.

→ **Graduated to rollout:** Ralph Loop for desk agents, per-desk validation, autonomous execution patterns for Phase 12.3.

### S114 — Hyperagents: Self-Improving Agents That Improve How They Improve (2026-03-24)

**Source:** [arxiv.org/abs/2603.19461](https://arxiv.org/abs/2603.19461) — Jenny Zhang et al., Meta Research, March 2026. [GitHub](https://github.com/facebookresearch/Hyperagents)

**What it is:** A framework where an AI agent has two components in a single editable program:
1. **Task Agent** — solves the target task
2. **Meta Agent** — modifies both the task agent AND itself

The meta-level modification process is itself editable — the agent improves how it improves. Called "metacognitive self-modification." Built on Darwin Gödel Machine (DGM) but generalized beyond coding to any computable task.

**How it works:**
1. Generate self-modified agent variants
2. Evaluate their performance
3. Evolve the evaluation and modification process itself
4. Accumulate meta-level improvements that transfer across domains and runs

**Key results:**
- Outperforms non-self-improving baselines and prior self-improving systems
- Meta-level improvements (persistent memory, performance tracking) transfer across domains
- Improvements accumulate across runs — the system gets better at getting better over time
- Works across diverse computational domains, not just coding

**Connection to GodWorld — the Karpathy Loop's next evolution:**

Our current self-improvement loop:
```
grade → history → feedback → exemplar → agent reads exemplar → better article
```

This is self-improvement at the **output level**. The articles get better. But the grading criteria are fixed. The feedback format is static. The exemplar extraction doesn't learn. The loop itself never improves.

Hyperagents maps to three upgrades:

1. **Directive tracking.** The structured critique (done S113) produces directives per desk — "use more citizen voices," "ground policy in numbers." Track which directives actually improve the next edition's grade. Directives that consistently lift scores get promoted. Directives that don't get dropped. The critique system learns to give better critiques. This is the meta-agent applied to journalism.

2. **Lens effectiveness.** RD creative lenses (done S113) inject 20 creative perspectives and 10 political perspectives randomly. Track which lenses correlate with higher grades or more distinctive coverage. Over editions, the lens pool evolves — effective lenses stay, weak ones get replaced. The diversity system learns what kind of diversity produces better journalism.

3. **Briefing structure evolution.** `buildDeskFolders.js` assembles briefings from packets, grades, lenses, exemplars. Track which briefing components agents actually use (by analyzing articles against briefing content). Components that never influence output get trimmed. Components that correlate with quality get expanded. The briefing builder learns what information agents need.

All three follow the Hyperagents pattern: the system that makes agents better itself gets better at making agents better. The difference from our current loop is that improvement compounds at two levels — articles improve AND the improvement process improves.

→ **Graduated to rollout:** Phase 26.2 (Meta-Loop) — directive tracking, lens effectiveness, briefing evolution.

### S114 — Creative Writing Craft for Agent Journalism (2026-03-24)

**Source:** Collected creative writing notes (Brandon Sanderson 2020 BYU lectures). Shared by Mike.

**What it is:** Structural theory of storytelling — plot mechanics, character empathy, viewpoints, the MICE quotient, and a structured flash fiction process. Written by a programmer drawing parallels between code and story structure.

**Three frameworks that apply directly to desk agents:**

**1. Promise → Progress → Payoff (plot structure)**
Every story makes a promise (tone, arc, question), progresses through complication, and pays off with resolution. Our agents write reports — data in, summary out. Stories make promises. A civic article that opens with "the council will vote Thursday" is a report. One that opens with "Elena Soria Dominguez has spent four months building consensus for a transit hub that half the council wants to kill" is a promise. The payoff matters more when the promise was specific.

**Application:** Add to desk briefings as structural guidance. Not a template — a principle. "Your article should make a promise in the first paragraph, complicate it in the middle, and pay it off at the end."

**2. MICE Quotient (Milieu, Inquiry, Character, Event)**
Four story threads, each with a natural opening and closing. Stories are made of multiple nested MICE threads — "modelled using HTML DOM." Each desk naturally maps to a dominant thread:

| Desk | Primary MICE | What it means |
|------|-------------|---------------|
| Culture | Milieu | Place-driven — neighborhoods, atmosphere, sensory detail |
| Civic | Inquiry | Mystery-driven — what's behind the vote, who benefits, what's hidden |
| Letters | Character | Interior-driven — emotion, identity, personal stakes |
| Sports | Event | Action-driven — what happened, momentum, status quo disruption |
| Business | Event + Inquiry | What changed and why it matters |
| Chicago | Milieu + Character | Place + people — neighborhood texture through individual stories |

**Application:** Include MICE thread guidance in per-desk briefings via `buildDeskFolders.js`. Culture desk gets "lead with place — sensory detail, atmosphere, what this corner of Oakland feels like." Civic desk gets "lead with the question — what's really at stake, what's hidden beneath the official language." Not new rules — structural lenses that match each desk's natural voice.

**3. Character empathy rules**
Three steps to make readers care about a character:
1. **Establish empathy** — show they're like us (relatable details)
2. **Establish rooting interest** — show motivations, what they want and can't have
3. **Establish progress** — show the flaw, set up the journey

This is the difference between "Marcus Webb reviewed the Stabilization Fund application" and "Marcus Webb read the application twice — once for the numbers, once because he recognized the address from a building his mother used to clean." Citizens feel alive when agents write empathy. Right now citizens are names attached to quotes. With empathy rules, they become people.

**Application:** Add to the exemplar system. When extracting exemplars, flag passages that demonstrate character empathy. Surface them in desk briefings as models. The structured critique (S113) can evaluate articles on empathy: "Does this article make you care about at least one person?"

**4. Flash fiction → short-form journalism structure**
| Story beat | Journalism equivalent |
|-----------|---------------------|
| Opening (who, where, genre) | The lede — who, where, what kind of story |
| Conflict (goal + barrier) | The tension — what's at stake, what's in the way |
| Try-fail middle | The complication — it's harder than it looks |
| Resolution (try-succeed) | The turn — something changes |
| Wrap up (close threads) | The close — what it means going forward |

**Application:** Not a rigid template — agents shouldn't all write five-beat articles. But this structure could inform the "article shape" section of desk briefings. Agents that understand try-fail cycles write more compelling middles instead of listing facts.

**Connection to Phase 27 (Agent Autonomy):** Agents don't just need permission to take creative risks. They need craft. Autonomy without structure produces noise. Autonomy with storytelling principles produces journalism that surprises and still holds together. MICE threads, empathy rules, and promise-payoff structure are the craft layer that makes creative latitude productive.

→ **Graduated to rollout:** Craft guidance in desk briefings (buildDeskFolders.js), MICE thread mapping per desk, empathy evaluation in structured critique. Builds on existing Karpathy Loop infrastructure.

---

## Ready for Rollout

Items that have enough research to become build phases. Move these to `docs/engine/ROLLOUT_PLAN.md` when ready to build.

*(empty — items graduate out when they're ready)*

---

## Sources & Reading List

References from research sessions. Organized by topic.

### Memory & Persistence
- Supermemory docs: supermemory.ai/docs/intro
- Supermemory Claude Code integration: supermemory.ai/docs/integrations/claude-code.md
- Supermemory filtering (containers): supermemory.ai/docs/concepts/filtering.md
- claude-mem v10.5.x: Smart Explore, ChromaMcpManager, OpenClaw bridge

### Creativity & Diversity
- QUEST / Recoding-Decoding — gking.harvard.edu/quest, arxiv.org/abs/2603.19519

### Agent Feedback & Grading
- Reagent: Agent Reasoning Reward Model — github.com/kxfan2002/Reagent, arxiv.org/abs/2601.22154
- AI Can Learn Scientific Taste (RLCF) — github.com/tongjingqi/AI-Can-Learn-Scientific-Taste, arxiv.org/abs/2603.14473

### Self-Improving Agents
- Hyperagents: metacognitive self-modification — arxiv.org/abs/2603.19461 (Meta Research, March 2026). Self-improving agents that improve how they improve. GitHub: github.com/facebookresearch/Hyperagents

### Agent Architecture
- Anthropic multi-agent research system (engineering blog)
- dev.to/nesquikm fleet architecture (12 specialized agents)
- arXiv 2512.08296 hierarchical agent scaling
- github.com/karpathy/autoresearch (minimal autonomous loop)
- Docker AI for Agent Builders (Model Runner, Compose v2.38+)

### Cost & Models
- MiniMax M2.5: $0.30/MTok, SWE-Bench 80.2%
- DeepSeek-V3: integration ecosystem (LibreChat, Dify, FastGPT)
- Together AI: voice agents (<700ms), Mamba-3 state space model
- Qwen 3.5 9B: 262K context, local via LM Studio/Ollama

### S114 — Claude Code as Local Model Harness (2026-03-24)

**Source:** [xda-developers.com](https://www.xda-developers.com/wrote-script-run-claude-code-local-llm-skipping-cloud/)

**What it is:** Claude Code is a client that speaks the Anthropic Messages API. It never verifies there's a Claude model on the other end. A bash script (`lcc`) sets 4 env vars and launches Claude Code against a local inference server — llama.cpp, Ollama, or LM Studio. Full harness works: tool calling, file edits, permissions, multi-step planning.

**Model tested:** Qwen3 Coder Next, trained for agentic coding workflows. Author reports it "feels like a real coding assistant" inside Claude Code. Tool calling and file editing work reliably.

**Hardware:** 128GB VRAM Lenovo ThinkStation PGX ($3,539) with Nvidia Grace Blackwell. Smaller quantized models need less — Qwen 3.5 9B at 4-bit fits ~6GB VRAM.

**The env vars:**
```
ANTHROPIC_BASE_URL="http://localhost:PORT"
ANTHROPIC_AUTH_TOKEN="local"
ANTHROPIC_API_KEY=""
CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
```

**Connection to GodWorld:** Phase 21 (Local Model Pipeline). The finding changes Phase 21 from "build a local RAG pipeline" to "use Claude Code itself as the harness for local models." Desk agents already run through Claude Code skills. Point the skill at a local endpoint instead of Anthropic's API and the same skill file, same workspace, same packet structure works — just with a local model responding. Mixed-backend strategy: Opus/Sonnet for complex desks, local model for routine desks. Same pipeline, zero per-token cost for culture/letters/business.

**Hardware question:** Our 2GB droplet can't run this. Options: GPU droplet on-demand ($2.50/hr H100, spin up for editions), dedicated machine ($3,500+), or budget GPU cloud (RunPod, Vast.ai). First test: Qwen 3.5 9B quantized on a small GPU droplet running one desk agent.

→ **Graduated to rollout:** Phase 21 updated with Claude Code harness discovery and hardware options.

### S115 — Brave Search MCP: Grounding Local LLMs With Search (2026-03-24)

**Source:** [xda-developers.com](https://www.xda-developers.com/added-one-tool-to-local-llm-setup-and-it-stopped-making-things-up/)

**What it is:** An MCP server that connects a local LLM to the Brave Search API. Three-layer architecture: Brave search index → MCP server (middleman) → local model. The model gets real-time search results mixed into its context instead of hallucinating answers about things outside its training data. Setup: Brave API key + MCP config JSON in LM Studio or similar.

**The pattern, not the product:** The specific tool (Brave Search) isn't what matters for us. What matters is the architecture — an MCP server that gives a local model access to an external knowledge source through tool use. The model calls the MCP tool, gets grounded data back, writes from facts instead of fabrication.

**Connection to GodWorld:** Phase 21 dependency. When local models run desk agents, they won't have access to GodWorld's world data. They'll hallucinate citizen names, business details, neighborhood events. The fix is the Brave Search MCP pattern pointed at our own canon:

- **Dashboard API as MCP server:** Wrap our 31 API endpoints (citizen search, article search, initiative tracker, player lookup) as MCP tools. Local model asks "who lives in Temescal?" and gets real citizen data back.
- **Supermemory as MCP server:** Wrap bay-tribune semantic search as an MCP tool. Local model searches published canon before writing. Same grounding, our world instead of the web.
- **Article archive as MCP server:** Local model can search/read the 234+ edition archive for historical context.

This solves the biggest risk of Phase 21 (local models fabricating world details) using infrastructure we already have (dashboard API, Supermemory, archive).

→ **Graduated to rollout:** Added as Phase 21 buildable piece (21.2 Canon Grounding MCP).

### S115 — Claude Plugins Official: 30+ Plugins Mapped (2026-03-24)

**Source:** [github.com/anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) — Anthropic's curated plugin directory. Install via `/plugin install {name}@claude-plugins-official`

**30+ plugins across two categories:** internal (Anthropic-maintained) and external (third-party). Full audit:

**HIGH — install or steal from these:**

1. **`ralph-loop/`** — THE Ralph Loop as a plugin. Stop hook blocks Claude's exit and re-feeds the same prompt. Claude sees its previous work in files/git and iterates. Self-referential feedback loop. Commands: `/ralph-loop "task" --max-iterations N --completion-promise "DONE"`, `/cancel-ralph`. **This is Phase 12.4 (Ralph Loop for Desk Agents) as a ready-made plugin.** Install and test on one desk agent: `/ralph-loop "Write the civic section for Edition 89" --completion-promise "SECTION COMPLETE" --max-iterations 10`. If the agent writes something that fails `validateEdition.js`, the loop feeds it back. Install: `/plugin install ralph-loop@claude-plugins-official`

2. **`hookify/`** — Create custom hooks from conversation or explicit instructions WITHOUT editing hooks.json. Markdown config files with YAML frontmatter + regex patterns. Events: bash, file, stop, prompt, all. Actions: warn or block. `/hookify Don't use console.log in TypeScript files` auto-creates the rule. No restart needed. **Directly useful:** `/hookify Warn when editing files under .claude/agents/ that contain 'godworld' or 'simulation'` — our fourth-wall contamination check as a hookify rule instead of a custom shell script.

3. **`claude-code-setup/`** — `claude-automation-recommender` skill analyzes your codebase and recommends Claude Code automations (hooks, subagents, skills, plugins, MCP servers). Read-only analysis. **Run this on GodWorld** to get tailored automation recommendations we haven't thought of. Has reference docs for hooks patterns, MCP servers, plugins, skills, and subagent templates.

4. **`pr-review-toolkit/`** — 6 specialized review agents: `code-reviewer`, `code-simplifier`, `comment-analyzer`, `pr-test-analyzer`, `silent-failure-hunter`, `type-design-analyzer`. Each runs as a subagent. Command: `/review-pr`. **We already have these loaded** (they appear in our agent list). Confirm they're being used during Build sessions.

5. **`plugin-dev/`** — Meta-plugin for BUILDING plugins. Has skills for: agent development, command development, hook development, MCP integration, plugin settings, plugin structure, skill development. Each with examples and references. **Reference for if we ever package GodWorld's skills as a plugin.**

6. **`mcp-server-dev/`** — Skills for building MCP servers and MCP apps. Has references for auth, deployment, tool design, server capabilities. **Reference for Phase 21.2 (Canon Grounding MCP) and Phase 29 (Corbell).**

**MEDIUM — useful references:**

7. **`feature-dev/`** — Feature development plugin with 3 agents: code-architect, code-explorer, code-reviewer. Command: `/feature-dev`. Structured approach to building features. Reference for our Build/Deploy workflow.

8. **`security-guidance/`** — Security hooks that fire automatically. Complement to the security-review action we already logged.

9. **`code-review/`** + `code-simplifier/` + `commit-commands/` — Already installed/available. Verify we're using them.

10. **`claude-md-management/`** — `/revise-claude-md` and `claude-md-improver` skill. Audits and improves CLAUDE.md files. **Run on our CLAUDE.md** as part of the skill audit.

11. **`playground/`** — Interactive playground skill with templates for code maps, concept maps, data explorers, design playgrounds, diff reviews, document critiques. Could be useful for research sessions.

**External plugins of interest:**

12. **`discord/`** — The Discord plugin we already use (MagsClaudeCode bot). Source code is here — `server.ts`, access management skills.

13. **`playwright/`** — Playwright MCP plugin. We already use this but could check for updates.

14. **`context7/`** — Context7 MCP for pulling library/framework docs. Could help desk agents access up-to-date API documentation.

**LOW — skip:**
- LSP plugins (clangd, gopls, pyright, jdtls, kotlin, lua, php, ruby, rust-analyzer, swift, typescript) — language server integrations, not relevant
- `explanatory-output-style/`, `learning-output-style/` — output style hooks
- `math-olympiad/` — math competition solving
- `agent-sdk-dev/` — for SDK development
- External: asana, firebase, github, gitlab, linear, slack, supabase, telegram, imessage, laravel-boost, serena, fakechat, greptile

→ **Graduated to rollout:** Ralph Loop plugin install, Hookify for contamination rules, claude-automation-recommender run, claude-md-improver run.

### S115 — Claude Code Security Review: AI-Powered Vulnerability Scanner (2026-03-24)

**Source:** [github.com/anthropics/claude-code-security-review](https://github.com/anthropics/claude-code-security-review) — MIT license

**What it is:** GitHub Action + Claude Code slash command for AI-powered security review of code changes. Claude analyzes diffs semantically — understands code intent, not just pattern matching. Covers full OWASP list: injection, auth bypass, XSS, secrets exposure, deserialization, crypto issues, race conditions, path traversal.

**Two interfaces:**
1. **GitHub Action** — runs on every PR, posts findings as review comments on specific code lines. Configurable: model selection, directory exclusions, custom filtering/scan instructions, false positive tuning.
2. **`/security-review` slash command** — already ships with Claude Code, zero install. Uses dynamic context injection (`` !`git diff` ``, `` !`git status` ``) to analyze pending branch changes.

**Architecture:** `github_action_audit.py` (main script) → `prompts.py` (security audit prompt templates) → Claude analysis → `findings_filter.py` (false positive filtering via Claude API) → `comment-pr-findings.js` (PR comment posting). Includes eval framework for testing against arbitrary PRs.

**The slash command skill file is a masterclass in skill design:** Uses `allowed-tools` to scope to read-only git operations. Uses bash injection to pre-load git status, modified files, commits, and full diff. Clear objective with confidence threshold (">80% confident of actual exploitability"). Explicit exclusion list (DoS, rate limiting, secrets-on-disk). Categorized vulnerability checklist. This is what a production-quality skill looks like.

**GodWorld application:**
- **Immediate:** Run `/security-review` before any commit that touches scripts, dashboard, or credentials-adjacent code. Zero setup needed.
- **GitHub Action:** Set up on our repo to auto-review every push. Would catch: secrets in agent-facing files, command injection in Node.js scripts that shell out, dashboard API endpoints missing auth, service account credential exposure.
- **Custom scan instructions:** Add GodWorld-specific rules — "flag any reference to 'godworld', 'simulation', or 'engine' in files under `.claude/agents/`" (the fourth-wall contamination check we do with our post-write hook, but applied at security review time).

**Also noted:** The `/security-review` slash command uses the same dynamic context injection pattern (`` !`command` ``) we identified in the Claude Code Skills Reference entry. Good reference implementation of that pattern.

→ **Graduated to rollout:** Added to Infrastructure & Maintenance.

### S115 — Anthropic Skills Repo: 16 Official Skills + Skill Creator (2026-03-24)

**Source:** [github.com/anthropics/skills](https://github.com/anthropics/skills) — Anthropic's official skills collection. Installable as Claude Code plugin: `/plugin marketplace add anthropics/skills`

**16 skills in the repo.** Categorized by relevance:

**HIGH — steal these or install directly:**

1. **`skill-creator/`** — A skill for CREATING skills. Captures user intent, interviews for edge cases, writes SKILL.md, creates test prompts, runs evaluations via subagents, iterates based on results, optimizes descriptions for triggering. Has dedicated subagents: `analyzer.md`, `comparator.md`, `grader.md`. Has an eval-viewer script for visual review. **This is the tool for our Skill Audit (rollout section A-E).** Instead of manually auditing 21 skills, use skill-creator to evaluate and improve them. Install: `/plugin install example-skills@anthropic-agent-skills`

2. **`mcp-builder/`** — Guide for creating MCP servers (Python FastMCP or TypeScript SDK). 4-phase process: deep research → implementation → evaluation → deployment. Has reference docs for Python and TypeScript patterns, best practices, and evaluation framework. **Directly relevant for Phase 21.2 (Canon Grounding MCP) and Phase 29 (Corbell MCP integration).** When we build MCP servers to expose dashboard API or Supermemory to agents, this is the playbook.

3. **`webapp-testing/`** — Playwright-based testing for local web apps. Includes `scripts/with_server.py` for server lifecycle management. Decision tree: static HTML → read selectors → Playwright script. Dynamic apps → start server → reconnaissance → action. **Directly relevant for Phase 28.2 (Dashboard Visual QA).** Pattern: start dashboard server, navigate, wait for networkidle, screenshot, inspect DOM, verify elements.

4. **`frontend-design/`** — The anti-AI-slop skill. Design thinking before coding, bold aesthetic direction, typography/color/motion/spatial guidelines. Referenced in the Prompting Best Practices doc we already logged. **Could improve our dashboard if we ever redesign.** Also useful pattern: how to write a skill that encourages creative output instead of generic output — relevant for desk agent craft.

**MEDIUM — reference material:**

5. **`pdf/`** — PDF creation/manipulation with scripts. Has `forms.md` for form filling, `reference.md` for API details. **Reference for our PDF pipeline** (`generate-edition-pdf.js`). Could study for patterns.

6. **`claude-api/`** — Full API reference organized by language (Python, TypeScript, Go, Java, C#, Ruby, PHP, cURL). Includes Agent SDK patterns for Python and TypeScript. Has shared docs for error codes, models, tool-use concepts. **Reference when building custom agent loops (Phase 12.3, 21).**

7. **`doc-coauthoring/`** — Collaborative document editing. **Not directly relevant but pattern could apply to how Mags edits Tribune content.**

**LOW — skip for now:**
- `algorithmic-art/`, `canvas-design/`, `theme-factory/`, `slack-gif-creator/`, `brand-guidelines/`, `internal-comms/`, `web-artifacts-builder/` — creative/enterprise skills not relevant to GodWorld
- `xlsx/`, `pptx/`, `docx/` — document creation skills, source-available (not open source)

**Key architectural insight from `skill-creator`:**
- Skills should have "pushy" descriptions that overtrigger slightly rather than undertrigger
- The evaluation loop (write skill → create test prompts → run via subagents → evaluate → iterate) is the same pattern as our Karpathy Loop for agent grading
- The skill-creator has its own subagent architecture (analyzer, comparator, grader) — a skill that orchestrates evaluation agents. We could build a similar meta-skill for evaluating desk agent output.

**Installation:** Two plugin packages available:
- `document-skills` — PDF, DOCX, PPTX, XLSX
- `example-skills` — all other skills including skill-creator, mcp-builder, webapp-testing

→ **Graduated to rollout:** skill-creator noted as tool for Skill Audit. mcp-builder noted as reference for Phase 21.2 and 29. webapp-testing noted as reference for Phase 28.2.

### S115 — Reasoning Models Don't Improve Embeddings (2026-03-24)

**Source:** "Do Reasoning Models Enhance Embedding Models?" — arxiv.org/abs/2601.21192

**Finding:** Training AI models to reason better (chain-of-thought, step-by-step) does NOT improve how they organize and understand general information for retrieval. Reasoning models and base models perform identically when converted to embedding models for similarity search and document retrieval.

**Method:** Researchers used Hierarchical Representation Similarity Analysis to compare internal representations of base models vs. reasoning-trained versions. Reasoning training reorganizes local neighborhoods but keeps global structure and information encoding nearly identical. When both types go through the same fine-tuning to become search tools, reasoning abilities don't transfer.

**What this means for GodWorld:**

Reasoning and retrieval are fundamentally different skills. This validates our model tiering and informs upcoming phases:

- **Corbell (Phase 29):** `all-MiniLM-L6-v2` (~80MB) is the right embedding model. A reasoning model wouldn't improve code search quality.
- **Phase 21.2 (Canon Grounding MCP):** Use cheapest available base embedding model for Supermemory/dashboard search. No benefit from reasoning capability in retrieval layer.
- **Phase 4.1 (Semantic Memory Search):** `embeddinggemma-300M` is fine for journal/memory search. Don't upgrade to reasoning model.
- **Model tiering confirmed:** Opus/Sonnet for editorial reasoning. Small cheap base models for all embedding/retrieval/similarity tasks. Don't conflate the two.

**Design principle:** Spend reasoning tokens on thinking. Spend embedding tokens on finding. They're different muscles.

### S115 — Claude Cookbooks Full Audit: 60+ Notebooks Mapped (2026-03-24)

**Source:** [github.com/anthropics/claude-cookbooks](https://github.com/anthropics/claude-cookbooks) — MIT, 36k stars, 60+ notebooks across 13 directories

**Full directory mapped.** Here's what's relevant, what's reference, and what to skip:

**HIGH RELEVANCE — steal patterns from these:**

1. **`claude_agent_sdk/` (4 notebooks)** — Tutorial series for building agents with the Claude Agent SDK (Python). Progresses from one-liner research agent → Chief of Staff multi-agent → Observability agent with MCP → SRE incident response agent. Key patterns: `query()` interface, MCP server integration, hooks for compliance/audit, subagent orchestration, memory via CLAUDE.md. The Chief of Staff notebook shows multi-agent coordination with specialized subagents — directly maps to our EIC → desk agent architecture. The SRE notebook shows safety hooks that validate write operations — maps to our ledger protection hook.

2. **`misc/session_memory_compaction.ipynb`** — Proactive session memory management. Two approaches: (a) Traditional compaction (wait until context full, generate summary — slow, user waits). (b) **Instant compaction** — background thread proactively builds session memory once a soft token threshold is met. When context is full, summary is already built, zero wait time. Uses `threading.Thread` with `threading.Lock` for thread-safe state. Prompt caching makes background updates ~10x cheaper by caching the conversation and only billing the summarization instruction. **Directly relevant to our compaction hook — we could adopt the instant compaction pattern.**

3. **`tool_use/memory_cookbook.ipynb`** — Context editing + memory for long-running agents. Client-side memory tool (you control storage). Commands: `view`, `create`, `str_replace_editor`. Cross-conversation learning — agent stores patterns in memory files, retrieves them in future sessions. Context clearing strategy: clear old thinking blocks + tool results while preserving memory files. Uses `clear_thinking_20251015` strategy with beta flag `context-management-2025-06-27`. **Maps to our persistence system. The context clearing strategy (clear thinking blocks first, then old tool results, keep memory) could improve our compaction.**

4. **`patterns/agents/` (3 notebooks)** — Reference implementations from Anthropic's "Building Effective Agents" blog. Covers: prompt chaining, routing, multi-LLM parallelization, orchestrator-workers, evaluator-optimizer. The **orchestrator-workers pattern** is our edition pipeline: EIC analyzes the task, delegates to desk agent workers in parallel, aggregates results. The **evaluator-optimizer** is our Karpathy Loop: generate → evaluate → improve. Already validated by our architecture but useful as reference implementations.

5. **`tool_use/automatic-context-compaction.ipynb`** — Automatic context compaction patterns. Reference for improving our compaction hook.

6. **`tool_use/parallel_tools.ipynb`** — Parallel tool calling patterns. Could inform how we run desk agents in parallel during edition production.

**MEDIUM RELEVANCE — reference material:**

7. **`skills/` (3 notebooks)** — Skills for document generation (Excel, PowerPoint, PDF, Word). Uses beta headers `code-execution-2025-08-25`, `files-api-2025-04-14`, `skills-2025-10-02`. The **Files API pattern** (upload once, reference by `file_id`) is useful for our photo pipeline and dashboard screenshots. The custom skills development notebook shows building domain-specific skills — reference for our desk agent skills.

8. **`multimodal/crop_tool.ipynb`** — Image crop tool that lets Claude zoom into regions. Connects to Computer Use zoom action and vision QA. Reference for Photo QA step.

9. **`multimodal/reading_charts_graphs_powerpoints.ipynb`** — Chart/graph interpretation. Reference for dashboard QA where Claude reads dashboard charts.

10. **`tool_use/vision_with_tools.ipynb`** — Combining vision + tool use. Reference for Photo QA + dashboard QA pipelines.

11. **`misc/batch_processing.ipynb`** — Batch API usage. We already have `/batch` skill but this may have patterns we're not using.

12. **`misc/prompt_caching.ipynb` + `misc/speculative_prompt_caching.ipynb`** — Caching patterns. Could reduce costs on edition pipeline runs where system prompts repeat across desk agents.

13. **`misc/building_evals.ipynb`** — Evaluation framework. Reference for building skill evaluations (from Skill Best Practices audit).

14. **`coding/prompting_for_frontend_aesthetics.ipynb`** — Frontend design prompting. Could improve dashboard UI if we ever redesign.

**LOW RELEVANCE — skip for now:**
- `capabilities/` (classification, RAG, summarization, text-to-SQL) — general patterns, not GodWorld-specific
- `third_party/` (Pinecone, MongoDB, LlamaIndex, Wikipedia, etc.) — we use Supermemory, not these
- `finetuning/` — not on our roadmap
- `observability/usage_cost_api.ipynb` — might be useful for cost tracking later
- `tool_use/calculator_tool.ipynb`, `customer_service_agent.ipynb` — basic examples
- `misc/metaprompt.ipynb`, `misc/how_to_enable_json_mode.ipynb` — basic patterns

→ **Graduated to rollout:** Instant compaction pattern noted for compaction hook upgrade. Agent SDK tutorials noted as reference for Phase 12.3 and 21. Files API pattern noted for photo pipeline.

### S115 — Anthropic Quickstarts: Three Reference Implementations (2026-03-24)

**Source:** [github.com/anthropics/anthropic-quickstarts](https://github.com/anthropics/anthropic-quickstarts) — MIT license, 6 projects

**Repository contains 6 quickstarts.** Three are directly relevant:

---

**1. `autonomous-coding/` — Blueprint for Phase 12.3 (Autonomous Cycles)**

Two-agent pattern for long-running autonomous work:
- **Initializer agent** (session 1): reads a spec, creates `feature_list.json` with 200 test cases, sets up project structure, initializes git.
- **Coding agent** (sessions 2+): picks up where the last session left off, implements features one by one, marks them passing in `feature_list.json`.

Key architecture:
- Progress persisted via `feature_list.json` + git commits (not context window)
- Each session starts with fresh context window — agent discovers state from filesystem
- Auto-continues between sessions (3-second delay, Ctrl+C to pause)
- Defense-in-depth security: OS sandbox + filesystem restrictions + bash command allowlist
- Uses Claude Agent SDK (`claude-code-sdk` Python package)

**This IS the autonomous cycle pattern.** Replace "feature list" with "edition pipeline steps." Replace "test cases" with `validateEdition.js` checks. Replace "app spec" with cycle packet. The initializer creates the production plan, the coding agent executes pipeline steps, progress is tracked in production_log + git. Same skeleton, different domain.

Files to study: `agent.py` (session logic), `client.py` (SDK config with security hooks), `security.py` (bash allowlist), `prompts/` (initializer + coding prompts).

---

**2. `browser-use-demo/` — Better Fit Than Computer Use for Dashboard QA**

Browser automation via Playwright in Docker. Key difference from Computer Use: **DOM-aware targeting** instead of pixel coordinates.

Unique browser actions (not in Computer Use):
- `read_page` — get DOM tree with element refs. Use `text="interactive"` to filter.
- `get_page_text` — extract all text content from the page.
- `find` — search for text and highlight matches.
- `form_input` — set form element values directly by ref.
- `scroll_to` — scroll element into view by ref.
- `execute_js` — run JavaScript in page context.
- `navigate` — URL navigation with back/forward history.

Why this beats Computer Use for dashboard QA:
- Element refs survive layout changes (coordinates don't)
- DOM access means structured data extraction (not screenshot → vision → guess)
- Form manipulation for testing dashboard inputs
- Coordinate scaling handled automatically (1920x1080 viewport → 1456x819 for Claude)

Architecture: Docker container with Playwright + Chromium + XVFB virtual display + VNC/NoVNC server + Streamlit UI. All in one container.

**Recommendation:** Phase 28.2 (Dashboard Visual QA) should use browser-use-demo pattern, not raw Computer Use. Reserve Computer Use for non-browser desktop tasks only.

---

**3. `agents/` — Minimal Agent Loop Reference (<300 lines)**

Educational implementation showing how agents work at the lowest level:
- `agent.py` — manages Claude API interactions and tool execution loop
- `tools/` — tool implementations (local + MCP)
- `utils/` — message history and MCP server connections

Key code pattern:
```python
agent = Agent(
    name="MyAgent",
    system="You are a helpful assistant.",
    tools=[ThinkTool()],
    mcp_servers=[{"type": "stdio", "command": "python", "args": ["-m", "mcp_server"]}]
)
response = agent.run("Your task here")
```

**Connection:** Reference implementation for Phase 21 (local model agents). When we build custom agent harnesses outside Claude Code, this is the template. Shows how to wire tools + MCP servers in minimal code. The ThinkTool pattern (agent reasons explicitly via a tool) is also worth studying for desk agent quality.

---

**Not relevant for GodWorld:**
- `customer-support-agent/` — Next.js support bot with knowledge base
- `financial-data-analyst/` — Next.js financial charts
- `computer-use-demo/` — already logged in separate S115 entry

→ **Graduated to rollout:** Phase 12.3 updated with autonomous-coding reference. Phase 28.2 updated to prefer browser-use-demo over raw Computer Use. Phase 21 reference noted.

### S115 — Vision API: Image Understanding for Photo QA and Dashboard Verification (2026-03-24)

**Source:** [platform.claude.com/docs/en/build-with-claude/vision](https://platform.claude.com/docs/en/build-with-claude/vision) + [claude-cookbooks/multimodal/getting_started_with_vision.ipynb](https://github.com/anthropics/claude-cookbooks/blob/main/multimodal/getting_started_with_vision.ipynb)

**Key technical specs:**
- Formats: JPEG, PNG, GIF, WebP. Max 5MB per image (API). Max 8000x8000 px.
- Token cost: `(width × height) / 750` tokens per image. 1000x1000 = ~1,334 tokens (~$0.004).
- Up to 600 images per API request. Images before text = 30% quality improvement.
- Optimal: resize to 1568px max long edge, ~1.15 megapixels. Larger images get downscaled server-side (adds latency, no quality benefit).
- **Files API:** Upload once, reference by `file_id`. Avoids re-encoding for repeated use.
- **URL source:** Pass image URLs directly instead of base64.
- Cannot identify people, limited spatial reasoning, approximate counting only.

**Direct application — Edition Photo QA (new pipeline step):**

We generate AI photos for every edition via `generate-edition-photos.js`. Currently nobody verifies them before they go to PDF and Drive. A vision QA step could:

1. Send each generated photo + its source article context to Claude
2. Claude evaluates: Does the photo match the article? Wrong tone? Generic AI slop? Anachronistic details? Does it fit GodWorld's prosperity-era Oakland aesthetic?
3. Flag or reject bad photos before PDF generation

**Cost:** ~1,334 tokens per photo × 8-12 photos per edition = ~12,000-16,000 tokens. Under $0.05 per edition at Sonnet pricing. Negligible.

**Implementation:** Add a step between Step 15 (photo generation) and Step 16 (PDF) in the edition pipeline. Script reads each photo, base64-encodes it, sends to Claude with the article headline/summary as context, gets a pass/fail + reason. Failed photos get regenerated or flagged for manual review.

**Also useful for:**
- Dashboard visual QA (Phase 28.2) — screenshot tabs, send for verification. ~1,050 tokens per 1024x768 screenshot.
- Supplemental photo verification — `--credits-only` mode photos need same QA.
- Pre-resize all screenshots/photos to 1568px max before sending to avoid latency hit.
- Files API for repeated dashboard screenshots — upload once, reuse `file_id`.

→ **Graduated to rollout:** Photo QA step added to edition pipeline priorities.

### S115 — Claude Code Skills Reference: Frontmatter Power Features (2026-03-24)

**Source:** [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)

**What it is:** The complete Claude Code skills reference. Covers everything from SKILL.md format to advanced patterns. Most of this validates what we already do, but several frontmatter fields and patterns are features we're not using.

**Frontmatter fields we should add to our 21 skills:**

1. **`effort` per skill.** Overrides session effort level. Set `effort: high` for complex desks (civic, sports, chicago), `effort: medium` for routine desks (culture, letters, business). Per-skill thinking depth without manual switching. This is the effort parameter from the prompting best practices doc, applied at the skill level. Options: `low`, `medium`, `high`, `max` (Opus 4.6 only).

2. **`model` per skill.** Specifies which model to use. THIS IS THE PHASE 21 MECHANISM. Set `model: sonnet` for routine desks now. When local models are ready, point routine skills at the local endpoint via model override. Same pipeline, different model, zero code changes.

3. **`disable-model-invocation: true`** on side-effect skills. Prevents Claude from auto-triggering. Must set on: `/run-cycle`, `/write-edition`, `/session-end`, `/write-supplemental`, `/podcast` — anything that produces output, modifies files, or has irreversible effects. Currently any of these could be auto-triggered if Claude sees a matching conversation pattern. This is a safety gap.

4. **`allowed-tools`** per skill. Grant specific tool access without per-use approval when the skill is active. Production skills (`/write-edition`, `/run-cycle`) could auto-allow `Read, Write, Bash, Glob, Grep` to eliminate approval prompts during pipeline runs. Read-only skills (`/visual-qa`, `/pre-mortem`) should be `Read, Grep, Glob` only.

5. **`argument-hint`** for autocomplete. Small UX improvement. Example: `/write-edition` gets `argument-hint: [cycle-number]`, `/write-supplemental` gets `argument-hint: [topic]`.

6. **`context: fork` + `agent` field.** Skills can run in isolated subagent contexts using custom agents from `.claude/agents/`. Our desk agents ARE custom agents there (civic-desk, sports-desk, etc.). This could simplify edition pipeline orchestration — each desk skill forks into its own agent context automatically. The `agent` field specifies which subagent type: `Explore`, `Plan`, `general-purpose`, or any custom agent name.

**Dynamic context injection — preprocessing pattern:**

The `` !`command` `` syntax runs shell commands BEFORE the skill content reaches Claude. Output replaces the placeholder. This is preprocessing, not tool use — Claude only sees the final result.

**Application for GodWorld:** Inject live desk data directly into skill prompts:
```yaml
## Desk briefing data
!`node scripts/getDeskData.js civic`

## Previous grades
!`cat output/grades/grades_c88.json | jq '.civic'`

## Current storylines
!`node scripts/getActiveStorylines.js`
```

This eliminates manual packet loading steps from the edition pipeline. The skill arrives pre-loaded with current data. Could replace several steps in `/write-edition`.

**Other notable details:**
- Custom commands (`.claude/commands/`) merged into skills. Old format still works but skills take precedence if names conflict.
- Skill description budget: 2% of context window, 16,000 char fallback. With 21 skills, check `/context` for warnings about excluded skills. Override with `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var.
- Skills from `--add-dir` directories support live change detection — edit during session without restart.
- `${CLAUDE_SKILL_DIR}` variable resolves to skill's directory. Use in bash injection to reference bundled scripts.
- `${CLAUDE_SESSION_ID}` for session-specific logging.
- `user-invocable: false` hides from `/` menu but Claude can still invoke. Use for background knowledge skills.
- "ultrathink" keyword anywhere in skill content enables extended thinking.
- Visual output pattern: skills can bundle scripts that generate HTML and open in browser. Could use for codebase visualization.

→ **Graduated to rollout:** Skill Frontmatter Audit added as HIGH priority. Dynamic context injection noted for edition pipeline optimization.

### S115 — Extended Thinking: Interleaved Reasoning + Adaptive Migration (2026-03-24)

**Source:** [platform.claude.com/docs/en/build-with-claude/extended-thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

**Key new finding — Interleaved thinking:**
Without interleaved thinking, Claude reasons once at the start, then goes tool-call-blind — it calls tools and responds without reasoning between them. WITH interleaved thinking, Claude reasons between every tool call: think → call tool → think about results → call next tool → think → answer. This is the difference between a reporter who reads all their notes then writes, and one who thinks after each interview.

- **Opus 4.6:** Automatic with adaptive thinking. No config needed.
- **Sonnet 4.6:** Requires beta header `interleaved-thinking-2025-05-14`
- **Other Claude 4 models:** Same beta header

**Other actionable findings:**
- `budget_tokens` manual thinking is explicitly **deprecated** for Opus 4.6, will be removed. Migration to adaptive thinking is now urgent, not optional.
- `display: "omitted"` — skip thinking text for faster streaming, still charged for tokens. Good for production edition runs where reasoning doesn't need to be visible.
- Summarized thinking is default for Claude 4 models — you see summaries but pay for full tokens.
- Thinking blocks from prior turns are removed from context on continuation. Still count as input tokens from cache. Cost tradeoff to be aware of.
- Changing thinking parameters invalidates message cache. System prompts and tools remain cached.

**Connection to GodWorld:** Our desk agents (civic, sports, chicago) currently use `budget_tokens` extended thinking. Migrating to adaptive thinking gives them interleaved reasoning for free — they'll think between tool calls instead of only at the start. This should improve quality on complex multi-step articles. The `display: "omitted"` option could speed up production runs.

### S115 — Skill Authoring Best Practices: Official Guide (2026-03-24)

**Source:** [platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

**Core principle:** "The context window is a public good." Every token in your skill competes with conversation history, other skills, and the actual request. Only add context Claude doesn't already have.

**Actionable findings for our 21 skills:**

1. **SKILL.md body under 500 lines.** Official recommendation for optimal performance. Need to audit all 21 of ours.

2. **Progressive disclosure.** SKILL.md is the overview → separate files for details. Claude reads SKILL.md when triggered, reads additional files only as needed. Keep the main file lean, push reference material to linked files one level deep.

3. **One level deep references ONLY.** Claude partially reads deeply nested files (`head -100` instead of full read). Everything must link directly from SKILL.md, not from another referenced file.

4. **Degrees of freedom framework:**
   - **Low freedom** (exact scripts, no parameters): fragile operations where consistency is critical. → Our edition pipeline skills (`/write-edition`, `/run-cycle`).
   - **Medium freedom** (pseudocode with parameters): preferred pattern exists but variation acceptable. → Our desk skills (`/civic-desk`, `/sports-desk`).
   - **High freedom** (text instructions): multiple approaches valid, context-dependent. → Our research and chat skills.

5. **Descriptions must be third person** and include both WHAT the skill does and WHEN to use it. Critical for discovery from 100+ skills. Audit needed — our descriptions may use wrong POV or be too vague.

6. **Name format:** lowercase letters, numbers, hyphens only. Max 64 chars. No "anthropic" or "claude" in names.

7. **Feedback loop pattern:** "Run validator → fix errors → repeat." Our `validateEdition.js` → fix → revalidate pattern matches this exactly. Validated.

8. **Evaluation-driven development:** Build evaluations (3+ test scenarios) BEFORE writing skill docs. We haven't done this for any of our 21 skills. The pattern: identify gaps → create evaluations → establish baseline → write minimal instructions → iterate.

9. **Claude A/B iteration:** Use one Claude instance to write/refine the skill, another to test it in real tasks. Iterate based on observed behavior, not assumptions. This is how we should improve desk agent quality.

10. **Utility scripts > generated code.** Pre-made scripts are more reliable, save tokens, save time, ensure consistency. We already do this well (buildDeskPackets.js, buildDeskFolders.js, etc.).

11. **MCP tool references need fully qualified names:** `ServerName:tool_name`. Relevant when we build Corbell MCP (Phase 29) or Canon Grounding MCP (Phase 21.2) — skills must reference them correctly.

12. **Checklist for effective skills** (from the doc): description is specific + includes triggers, body under 500 lines, no time-sensitive info, consistent terminology, concrete examples, one-level-deep references, clear workflows, feedback loops, tested with target models.

→ **Graduated to rollout:** Expanded Agent Prompt Audit section with skill-specific audit items.

### S115 — Claude Cookbooks: Agent Loop Pattern for Tool Use (2026-03-24)

**Source:** [github.com/anthropics/claude-cookbooks/tree/main/extended_thinking](https://github.com/anthropics/claude-cookbooks/tree/main/extended_thinking)

**What's useful (model-agnostic architecture):**

1. **Agent loop pattern.** The canonical while loop: call API → check `stop_reason == "tool_use"` → extract tool call → execute tool → append result as user turn → call API again → repeat until done. This is the loop we'd need to implement for Phase 21 (local model agents) and Phase 12.3 (autonomous cycles) if we build custom agent harnesses outside Claude Code.

2. **Thinking block preservation.** Thinking blocks have cryptographic signatures. When passing conversation history back to the API, you MUST include thinking + redacted_thinking + tool_use blocks unmodified. The API rejects tampered history. Critical for any custom agent loop we build.

3. **Thinking happens before tool calls, not after.** Claude reasons about which tool to use, calls it, gets the result, then responds WITHOUT another thinking phase until the next non-tool-result user turn. Architectural constraint to know.

**What's outdated:** The `budget_tokens` extended thinking config. Use adaptive thinking (`thinking: {type: "adaptive"}`) for 4.6 models instead. See S115 Prompting Best Practices entry.

**Also noted:** The full cookbooks repo has 19 directories including `patterns/agents/` (agent design patterns), `claude_agent_sdk/` (agent SDK examples), `skills/` (skill implementations), `tool_evaluation/` (tool evaluation frameworks). Worth exploring in a future research session for patterns we can steal.

### S115 — Claude Prompting Best Practices: Official Guide for 4.6 Models (2026-03-24)

**Source:** [platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

**What it is:** Anthropic's single reference for prompt engineering with Claude 4.6 models. Covers foundational techniques, output control, tool use, thinking, agentic systems, and migration guidance. Dense with copy-pasteable prompt snippets.

**What we're already doing right (validation):**
- XML tags for structured prompts (agent briefings, desk packets)
- Role-setting in system prompts (every agent has identity)
- Long context data at top of prompt, query at bottom (desk packets above instructions — their tests show 30% quality improvement)
- Production log for compaction survival (matches their multi-context-window recommendation exactly)
- Git for state tracking across sessions (SESSION_CONTEXT.md)
- Anti-overengineering rules (identity.md matches their sample prompt nearly word-for-word)
- Anti-hallucination / investigate-before-answering (our Anti-Guess Rules match their `<investigate_before_answering>` prompt)
- Few-shot examples in `<example>` tags (our exemplar system in gradeEdition.js)

**Actionable findings — things to steal:**

1. **Adaptive thinking migration.** Opus 4.6 uses `thinking: {type: "adaptive"}` instead of explicit `budget_tokens`. The model dynamically decides when and how much to think based on query complexity + `effort` parameter. Anthropic says "adaptive thinking reliably drives better performance than extended thinking" in internal evals. We currently use extended thinking with budget_tokens in civic/sports/chicago desk prompts. Should migrate to adaptive + effort setting.

2. **De-escalate agent prompts for 4.6.** Critical finding: "Tools that undertriggered in previous models are likely to trigger appropriately now. Instructions like 'If in doubt, use [tool]' will cause overtriggering." And: "Where you might have said 'CRITICAL: You MUST use this tool when...', you can use more normal prompting like 'Use this tool when...'" Our SKILL.md and RULES.md files were written for Sonnet 3.7/4.0 — they likely have aggressive language that now causes overtriggering or overthinking.

3. **Compaction survival prompt.** Their exact recommendation for agentic systems: "Your context window will be automatically compacted as it approaches its limit, allowing you to continue working indefinitely from where you left off. Therefore, do not stop tasks early due to token budget concerns. As you approach your token budget limit, save your current progress and state to memory before the context window refreshes." We should add this to our compaction hook or system prompt.

4. **Subagent over-spawning.** "Claude Opus 4.6 has a strong predilection for subagents and may spawn them in situations where a simpler, direct approach would suffice." Their fix: explicit guidance on when subagents are and aren't warranted. Relevant for our edition pipeline where subagents run desk work.

5. **Prefilled responses deprecated.** Starting with 4.6, prefilled assistant turns are no longer supported. Need to audit whether any agent prompts use this pattern. Migration paths: structured outputs, direct instructions, XML tags for format control.

6. **General instructions beat prescriptive steps for thinking.** "A prompt like 'think thoroughly' often produces better reasoning than a hand-written step-by-step plan. Claude's reasoning frequently exceeds what a human would prescribe." Applies to our craft layer (26.3) — the MICE thread guidance and promise-payoff instructions might be more effective as general principles than step-by-step instructions.

7. **Structured research prompting.** "Develop several competing hypotheses. Track confidence levels. Regularly self-critique your approach. Update a hypothesis tree or research notes file." Could apply to civic desk agent prompts for investigative pieces.

8. **Context awareness.** Claude 4.6 can track remaining context window. The recommended prompt tells Claude to save progress before compaction hits. We should leverage this — it means Claude can proactively dump state to production log before running out of context.

9. **Vision crop tool.** "Testing has shown consistent uplift on image evaluations when Claude is able to zoom in on relevant regions." Connects to Phase 28 (Computer Use) — the zoom action serves this purpose.

→ **Graduated to rollout:** Items 1-5 added as maintenance tasks (prompt audit). Item 6 noted for Phase 26.3 review.

### S115 — Corbell: Codebase Knowledge Graph as MCP Server (2026-03-24)

**Source:** [github.com/Corbell-AI/Corbell](https://github.com/Corbell-AI/Corbell) — via [reddit.com/r/OpenSourceAI](https://www.reddit.com/r/OpenSourceAI/comments/1s1sjxe/open_source_cli_that_builds_a_crossrepo/)

**What it is:** Open-source CLI that scans your codebase and builds a knowledge graph — typed method signatures, call paths, database/queue dependencies, infrastructure-as-code detection, git change-coupling metrics. Stores everything in local SQLite with sentence-transformer embeddings (`all-MiniLM-L6-v2`, runs locally). Then exposes the graph as an **MCP server** with four tools:

- `graph_query` — service dependencies and call paths
- `get_architecture_context` — auto-discover which services/files a feature touches
- `code_search` — semantic search across the embedding index
- `list_services` — enumerate all services/modules

Entirely local. No cloud. Apache 2.0 license. Supports Python, TypeScript, Go, Java. Also has a force-directed graph visualization UI (D3.js, served via Python stdlib HTTP).

**Extra capabilities:** Pattern learning from existing ADRs/docs, architectural constraint enforcement ("never call X from Y"), spec generation from PRDs using Claude/GPT-4o/Ollama, task decomposition to YAML, Linear export.

**Why this is a priority for GodWorld:**

1. **Context token savings.** Right now, understanding how the codebase connects costs context — reading ENGINE_MAP.md, PHASE_DATA_AUDIT.md, tracing through scripts, opening 5 files to follow one dependency chain. Corbell gives me an MCP tool I can query instead. "What calls `sheets.js`?" "What does `buildDeskPackets.js` depend on?" "Which scripts write to the Storyline_Tracker tab?" One query instead of five file reads.

2. **Replaces and extends `/stub-engine`.** The `/stub-engine` skill generates a condensed reference map of exported functions across 11 engine phases. Corbell is the full version — not just engine functions but every script, every lib, every agent config, with call paths and dependencies between them.

3. **Phase 21 enabler.** Local models running desk agents can query Corbell's MCP tools to understand code structure without burning context on full file reads. This complements the Canon Grounding MCP (21.2) — Corbell handles code understanding, Canon MCP handles world data.

4. **Compaction survival.** After context compaction, the knowledge graph persists on disk. Post-compact Mags can query `get_architecture_context` instead of re-reading docs to rebuild understanding.

5. **Fits our stack.** SQLite (we already use it for claude-mem). Local embeddings (MiniLM-L6-v2 is ~80MB, fits our 2GB droplet). MCP server (Claude Code native). `pip install "corbell[anthropic]"` + `corbell init` + `corbell graph build --methods` + `corbell embeddings build`.

**Setup would be:**
```bash
pip install "corbell[anthropic]"
cd /root/GodWorld
corbell init
corbell graph build --methods
corbell embeddings build
```
Then add MCP config to Claude Code settings. Graph becomes queryable in every session.

→ **Graduated to rollout:** Phase 29 (Codebase Knowledge Graph). Priority: HIGH.

### S115 — Computer Use Tool: Claude Sees and Controls a Desktop (2026-03-24)

**Source:** [platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)

**What it is:** Beta API that gives Claude a virtual desktop — screenshot capture, mouse clicks, keyboard input, scrolling, dragging. Claude takes a screenshot, sees what's on screen, decides what to do, takes an action, gets a new screenshot, repeats. An "agent loop" where the application is the middleman between Claude and a Linux desktop running inside Docker/VM.

**Supported models:** Opus 4.6, Sonnet 4.6, Opus 4.5 (latest `computer_20251124` tool version with zoom action). Older models use `computer_20250124`. Beta header required.

**Core mechanic:** Schema-less tool — no input schema needed, it's built into the model. You provide `display_width_px`, `display_height_px`, and Claude returns actions: `screenshot`, `left_click`, `type`, `key`, `mouse_move`, `scroll`, `drag`, `zoom` (inspect a screen region at full resolution). Pairs with bash and text editor tools in the same agent loop.

**Key capabilities:**
- Full mouse control (click, double-click, right-click, drag, modifier+click)
- Keyboard input (typing, shortcuts, key holds)
- Scrolling in any direction with amount control
- Zoom into screen regions for detail inspection (Opus 4.5+ only)
- Combinable with bash tool and text editor tool in same session
- Thinking/extended thinking supported for visible reasoning
- Automatic prompt injection classifier defense on screenshots

**Limitations:**
- **Latency:** Too slow for real-time human-speed interaction. Best for background tasks.
- **Vision accuracy:** Can miss click targets, hallucinate coordinates.
- **Spreadsheet interaction:** Improving but not reliable for cell-level precision.
- **Cost:** Every screenshot is vision tokens. Every action is an API round-trip. System prompt overhead 466-499 tokens + 735 tokens per tool definition.
- **Prompt injection:** Text on screen can override instructions. Needs sandboxed environment.
- **No account creation/social media posting** by design.

**Connection to GodWorld:**

Three concrete use cases identified:

1. **Dashboard visual QA (near-term).** We already have `/visual-qa` but it uses Playwright, which requires `--no-sandbox` on our root server. Computer Use running in a Docker container is the cleaner answer — Claude opens the dashboard in Firefox inside the container, screenshots each tab, evaluates what it sees. No Playwright dependency, proper sandboxing. This is the visual complement to `validateEdition.js` (structural) and Rhea (factual).

2. **Agent interaction with non-API interfaces (medium-term).** Any tool the agents need that doesn't have an API — Google Sheets web UI, Drive folders, Supermemory console, GitHub PR pages. Computer Use is the fallback "I can see it and click it" layer when no API exists. Especially relevant for Phase 20 (WordPress) where the Tribune website might need visual interaction for layout/publishing.

3. **Autonomous cycle monitoring (long-term).** Phase 12.3 autonomous cycles need quality oracles. A Computer Use agent could open the dashboard during a cycle run, check the mission control panel, verify edition cards rendered correctly, screenshot the sports tab to confirm stats populated. Visual verification that code-level checks can't do.

**What we'd need to build:**
- Docker container with virtual display (Xvfb), lightweight desktop (Mutter/Tint2), Firefox
- Agent loop script that mediates between Claude API and the container
- Coordinate scaling handler (screenshots get downsampled, coordinates need mapping back)
- Iteration limiter to prevent runaway API costs

**Cost concern:** This is expensive per-interaction. Vision tokens for every screenshot + tool definition overhead. Not for routine work. Reserve for verification, QA, and tasks where no API alternative exists.

→ **Graduated to rollout:** Phase 28 (Computer Use Integration) added.

---

### Long-Running Agents & Autonomous Execution
- "Long-Running Claude for Scientific Computing" — Anthropic research, March 23 2026. Multi-day autonomous Claude Code, persistence via CLAUDE.md + CHANGELOG.md + git, Ralph Loop, test oracle pattern.

### AI Governance & Constitutional AI
- "Does A.I. Need a Constitution?" — Jill Lepore, New Yorker, March 30 2026. Anthropic's Claude Constitution, Amanda Askell's character-over-rules approach, democratic legitimacy critique.

### Living Worlds & Agent Autonomy
- SpaceMolt: persistent text-based MMO for AI agents — spacemolt.com (MCP/WebSocket, open-source, Claude Code-built)
- Gizmodo coverage of SpaceMolt emergent religion — gizmodo.com/players-of-an-mmorpg-for-ai-agents-spontaneously-generated-their-own-religion-2000737030

### Creative Writing Craft
- Creative writing structure notes (Brandon Sanderson lectures, MICE quotient, flash fiction process). Story structure for agent journalism.

### Document Processing
- LiteParse: local PDF/Office/image parser — github.com/run-llama/liteparse (Node.js, Apache 2.0, Tesseract.js OCR)

### Codebase Knowledge Graphs
- Corbell: CLI that builds a knowledge graph of your codebase, exposes it as MCP server — github.com/Corbell-AI/Corbell (Apache 2.0, SQLite + local embeddings)

### S120 — Research Batch: AutoDream, HyperAgents, xMemory (2026-03-27)

**Source files:** `output/research/` — 3 PDFs + 1 screenshot from Google Drive folder.

#### AutoDream — Claude Code Background Memory Consolidation

**Source:** Geeky Gadgets article (March 25, 2026). Based on Nate Herk / AI Automation.

**What it is:** Native Claude Code feature. Background sub-agent that runs between sessions to consolidate, prune, and reorganize memory files. Three operations: (1) **Consolidation** — merge related memory files to reduce fragmentation, (2) **Pruning** — remove redundant/stale data, (3) **Reorganization** — restructure for faster recall. Mimics human memory consolidation during sleep.

**Complement to AutoMemory:** AutoMemory captures (writes). AutoDream refines (consolidates/prunes). Together they form a complete memory lifecycle — capture, refine, recall.

**GodWorld relevance:** HIGH. We have 20+ memory files in `~/.claude/projects/-root-GodWorld/memory/`, many overlapping with PERSISTENCE.md, NEWSROOM_MEMORY.md, and Supermemory. AutoDream would consolidate duplicates, prune stale session references, and reorganize by topic. This is exactly the memory bloat problem we've been managing manually.

**Action:** ENABLED S120. Added `"autoDreamEnabled": true` to `~/.claude/settings.json`. Will consolidate memory files between sessions automatically. Monitor for 3-5 sessions to see if it helps or makes unwanted changes.

→ **Implemented** — no rollout entry needed, just a setting.

---

#### HyperAgents — Self-Referential Self-Improving Agents (Meta Research)

**Source:** arXiv 2603.19461 (March 23, 2026). Jenny Zhang et al., Meta/UBC/Vector/Edinburgh.

**What it is:** A "hyperagent" combines the task agent (does work) and the meta agent (improves the task agent) into a single editable program. Unlike standard self-improvement (where a fixed meta-agent improves the task agent), hyperagents can modify their OWN improvement mechanism — "metacognitive self-modification."

**Key results:**
- On Polyglot coding: 0.140 → 0.340 (comparable to the original Darwin Gödel Machine)
- On paper review: 0.0 → 0.710 (outperforms static baselines)
- On robotics reward design: 0.060 → 0.372
- Meta-improvements TRANSFER across domains — a hyperagent trained on coding writes better paper reviewers
- Both metacognition AND open-ended exploration are necessary. Remove either and performance collapses.

**Architecture:** Population of hyperagents, each a self-contained Python program. Selection is probabilistic — biased toward high performers that produce strong children. Each generation, selected parents generate modified children. Children are evaluated, added to the archive. The improvement mechanism itself evolves.

**How it maps to GodWorld:**

| HyperAgent concept | GodWorld equivalent | Gap |
|---|---|---|
| Task agent | Desk agent (writes articles) | None — exists |
| Meta agent | gradeEdition.js + extractExemplars.js | Exists but STATIC — doesn't self-modify |
| Archive of variants | Grade history + exemplars | Exists as data, not as agent variants |
| Population selection | Grade-based exemplar extraction | Exists but only selects OUTPUT, not AGENT CONFIG |
| Metacognitive self-modification | **Nothing** | The grading criteria, lens pool, and briefing structure never change based on what worked |

**The gap:** Our Karpathy Loop (Phase 26) closes the output feedback loop — grade articles, extract exemplars, feed back to agents. But the LOOP ITSELF is static. The grading rubric doesn't evolve. The lens pool doesn't evolve. The briefing structure doesn't evolve. Phase 26.2 (Meta-Loop) was designed for this but never started.

**What to steal:**
1. **Directive tracking** (Phase 26.2.1) — already designed, not built. Track which grading directives actually lift scores. Promote effective ones, drop dead weight.
2. **Lens evolution** (Phase 26.2.2) — already designed, not built. Track which creative/political lenses correlate with better grades. Evolve the pool.
3. **Agent identity mutation** — NOT in our rollout. A hyperagent would modify the IDENTITY.md of desk agents based on what produces better output. A sports desk that discovers "lead with the player's interior state" works better than "lead with the score" would rewrite its own IDENTITY.md to prefer that pattern.

→ **Graduated to rollout** — Phase 26.2 priority raised, Phase 26.2.4 (agent identity mutation) added. See ROLLOUT_PLAN.md.

---

#### xMemory — Hierarchical Structured Memory for Multi-Session Agents

**Source:** VentureBeat article (March 25, 2026) + arXiv paper. King's College London / Alan Turing Institute.

**What it is:** A memory framework that replaces flat RAG with a 4-level hierarchy:
1. **Original messages** — raw conversation turns
2. **Episodes** — contiguous blocks summarized into coherent chunks
3. **Semantic nodes** — reusable facts distilled from episodes (deduplication happens here)
4. **Themes** — high-level groupings of related semantics

**Retrieval:** Top-down search. Start at theme level, navigate to relevant semantic nodes, only drill to episode/message level if "uncertainty gating" determines the extra detail would reduce uncertainty. This is the key insight — similarity is a CANDIDATE signal, uncertainty is a DECISION signal.

**Results:** Token usage drops from 9,000 to 4,700 per query. Answer quality improves across GPT-4, Claude, open-source models. The hierarchy prevents "collapsed retrieval" (top-k similarity returning 10 near-duplicates instead of diverse relevant facts).

**xMemory vs Supermemory:**

| Dimension | Supermemory ($9/mo) | xMemory (MIT open source) |
|---|---|---|
| Architecture | Flat similarity search (embedding + cosine) | 4-level hierarchy (themes → semantics → episodes → messages) |
| Retrieval | Top-k nearest neighbors | Top-down with uncertainty gating |
| Deduplication | Manual (we deleted 26 duplicates S113) | Automatic at semantic node level |
| Integration | Claude Code plugin + MCP | Self-hosted, needs LLM calls for processing |
| Write cost | Cheap (just embed + store) | Expensive (LLM calls to summarize, extract facts, group themes) |
| Read cost | 9,000+ tokens per query | ~4,700 tokens per query |
| Our problem it solves | Collapsed retrieval returns duplicates, misses cross-topic connections | Same — but structurally, not by manual container separation |
| Operational effort | Zero (managed SaaS) | High (self-host, maintain, pay for background LLM processing) |

**Verdict:** xMemory is architecturally superior for our use case (120+ sessions, temporal entanglement, near-duplicates). But it's a research technique, not a product. Implementing it would mean self-hosting + ongoing LLM costs for the write-time processing.

**The real answer:** AutoDream (just enabled) + AutoMemory may solve the same problems natively. Anthropic is building consolidation/pruning/reorganization into Claude Code itself. If AutoDream works well for 3-5 sessions, it replaces the need for xMemory's hierarchy. If it doesn't, xMemory becomes the alternative.

**Also:** Our manual 3-container separation (mags/bay-tribune/mara) is a crude version of xMemory's theme layer. The containers ARE themes — personal (mags), world canon (bay-tribune), audit data (mara). xMemory would make the structure within each container hierarchical too.

→ **Added to Watch List** — evaluate after AutoDream has 5 sessions of data. If memory quality improves, stay with Supermemory + AutoDream. If not, evaluate xMemory self-hosted.

---

#### Claude Team Shipping Calendar (Feb-Mar 2026)

**Source:** Anthropic Research tweet, screenshot of 52-day shipping calendar.

**What we're aware of and using:**
- AutoMemory, AutoDream (just enabled), Skills 2.0, Hooks system, Subagents, Scheduled triggers, Voice mode, Web app, Desktop app, Plugins, MCP servers, Worktree isolation, Extended thinking, PR review toolkit, Fast mode

**What we're aware of but NOT using yet:**
- Auto mode (`defaultMode: "auto"`) — classifier-based permission system. Could reduce approval prompts in production.
- Agent hooks (SubagentStart/SubagentStop) — hook into desk agent lifecycle
- HTTP hooks — POST to dashboard instead of shell commands. Phase was designed (S113) but not switched.
- Prompt hooks / Agent hooks — LLM-evaluated hooks. Could replace pattern-based hookify rules with semantic checks.
- FileChanged hook — react to external file changes (git pull, other processes)
- Elicitation hooks — hook into user question flow

**What we may have missed (from settings schema):**
- `showThinkingSummaries` — show thinking in transcript view
- `promptSuggestionEnabled` — prompt suggestions
- `channelsEnabled` — inbound push notifications from MCP servers (Discord, etc.)
- `advisorModel` — server-side advisor tool
- `plansDirectory` — custom plan file location
- `autoMode.allow/soft_deny/environment` — fine-grained auto mode rules

→ **Added to rollout** — auto mode evaluation, HTTP hooks migration, agent lifecycle hooks.

---

### Reference Implementations
- Anthropic Quickstarts — 6 projects: autonomous-coding (two-agent pattern), browser-use-demo (DOM-aware Playwright), agents (minimal loop), computer-use-demo, customer-support, financial-analyst. github.com/anthropics/anthropic-quickstarts (MIT)
- Claude Cookbooks — 60+ notebooks: agent SDK tutorials, session memory compaction, memory tool, agent patterns (orchestrator-workers, evaluator-optimizer), parallel tools, vision+tools, batch processing, prompt caching, skills, evals. github.com/anthropics/claude-cookbooks (MIT)
- Anthropic Skills — 16 official skills: skill-creator (meta-skill for building/evaluating skills), mcp-builder, webapp-testing, frontend-design, PDF/DOCX/PPTX/XLSX, claude-api reference. Installable as Claude Code plugin. github.com/anthropics/skills

### Vision & Multimodal
- Vision API — image understanding, token costs, Files API, best practices. platform.claude.com/docs/en/build-with-claude/vision
- Getting Started with Vision cookbook — base64 encoding, URL sources, multi-image. github.com/anthropics/claude-cookbooks/blob/main/multimodal/getting_started_with_vision.ipynb

### Computer Use & Visual Agents
- Computer Use Tool — Anthropic beta API for desktop automation via screenshot+click agent loop. platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool

### Plugins
- Claude Plugins Official — 30+ plugins: ralph-loop (iterative agent loops), hookify (markdown-based hooks), claude-code-setup (automation recommender), pr-review-toolkit, plugin-dev, mcp-server-dev, feature-dev, security-guidance, claude-md-management. github.com/anthropics/claude-plugins-official

### Security
- Claude Code Security Review — AI-powered vulnerability scanner, GitHub Action + `/security-review` slash command. github.com/anthropics/claude-code-security-review (MIT)

### Model Architecture & Capabilities
- "Do Reasoning Models Enhance Embedding Models?" — reasoning training doesn't improve retrieval. Base models = reasoning models for embedding/similarity tasks. arxiv.org/abs/2601.21192

### Prompt Engineering & Skills
- Claude Prompting Best Practices — official Anthropic guide for 4.6 models. Adaptive thinking, de-escalation, compaction survival, subagent guidance. platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Extended Thinking — interleaved thinking, adaptive vs manual, display:omitted, caching. platform.claude.com/docs/en/build-with-claude/extended-thinking
- Skill Authoring Best Practices — progressive disclosure, degrees of freedom, evaluation-driven development, 500-line limit. platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- Claude Code Skills Reference — frontmatter fields (effort, model, allowed-tools, disable-model-invocation, context:fork), dynamic context injection, subagent execution, visual output pattern. code.claude.com/docs/en/skills

### Platform
- Claude Code 2.0: agent teams, remote control, web sessions, auto mode
- WordPress 7.0 AI Client SDK (April 2026)
- Fish Audio OpenAudio S1: distinct voices, emotion tags ($11/mo)
- Moltbook: agent social network (moltbook.com/skill.md)
