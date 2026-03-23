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

### Document Processing
- LiteParse: local PDF/Office/image parser — github.com/run-llama/liteparse (Node.js, Apache 2.0, Tesseract.js OCR)

### Platform
- Claude Code 2.0: agent teams, remote control, web sessions, auto mode
- WordPress 7.0 AI Client SDK (April 2026)
- Fish Audio OpenAudio S1: distinct voices, emotion tags ($11/mo)
- Moltbook: agent social network (moltbook.com/skill.md)
