# GodWorld — Rollout Plan

**Status:** Active | **Last Updated:** Session 137b (2026-04-08)
**North star:** `docs/ARCHITECTURE_VISION.md` — Jarvis + persistent sessions. Everything we build points there.
**Completed phase details:** `ROLLOUT_ARCHIVE.md` — read on demand, not at boot.
**Research context:** `docs/RESEARCH.md` — findings log, evaluations, sources.
**Terminal handoffs:** Items tagged `(engine terminal)` or `(media terminal)` are handed off to that persistent chat. Research/build terminal designs; engine/sheet terminal executes code.

---

## Open Work Items

### Data & Pipeline

- **CLEANUP: Dead spreadsheet tabs (engine-sheet terminal)** — 8 dead tabs to archive/hide. Backup CSV first. See `docs/SPREADSHEET.md`. LOW.
- **REDESIGN: Intake system (design here → engine-sheet terminal)** — `editionIntake.js` has two known bugs. Whole system needs redesign. 10 citizens parked in `Citizen_Usage_Intake`. See Phase 27.1 and `docs/engine/INTAKE_REDESIGN.md` (30%). HIGH.
- **PROJECT: World Memory remaining (engine-sheet terminal)** — (3) ingest key archive articles to bay-tribune, (5) historical context in desk workspaces. See `docs/WORLD_MEMORY.md`. MEDIUM.
- **Supplemental strategy (media terminal)** — One supplemental per cycle minimum. Ongoing.
- **EVALUATE: Document processing pipeline (research-build terminal)** — Qianfan-OCR (Baidu, 4B params) does end-to-end document parsing: PDF/image → structured markdown in one pass. Layout analysis, table extraction, chart understanding, document QA. Could feed real civic documents (council minutes, zoning permits, budget reports) into the civic terminal as structured data. Replaces manual text extraction. MEDIUM — evaluate when civic pipeline needs real-world document input. Added S137.

### Infrastructure

- **Node.js security patch (engine-sheet terminal)** — Scheduled March 24. Overdue.
- **UPGRADE: Instant compaction (research-build terminal)** — Proactive compaction before context full. Pattern from `claude-cookbooks/misc/session_memory_compaction.ipynb`. MEDIUM.
- **EVALUATE: Context clearing strategy (research-build terminal)** — Beta flag `context-management-2025-06-27`. LOW.
- **MONITOR: KAIROS background daemon (research-build terminal)** — Unreleased Claude Code feature: persistent background daemon. If Anthropic ships this, could replace PM2 + cron + scheduled agents setup with native Claude Code infrastructure. Spotted in Claude Code source analysis (512K-line codebase reveal, Apr 2026). Also watch ULTRAPLAN (30-minute remote reasoning sessions). MEDIUM — monitor Anthropic releases. Added S137.

### Agent Prompt & Skill (remaining from S115 audit)

- **Skill frontmatter reference (all terminals):** `effort`, `model`, `disable-model-invocation`, `allowed-tools`, `argument-hint`. Table in ROLLOUT_ARCHIVE.md.
- **Remaining (LOW):** subagent guidance (evaluate after next edition), description budget check (`/context`), skill evaluations (3+ test scenarios).

---

## Completed Phases (one-line summaries)

All detail in `ROLLOUT_ARCHIVE.md`.

| Phase | Name | Completed |
|-------|------|-----------|
| 1 | Edition Pipeline Speed + Safety | S55 |
| 3 | Engine Health (pre-mortem, tech-debt-audit, stub-engine) | S55 |
| 6.5 | Discovery Skill `/grill-me` | S99 |
| 10 | Civic Voice Agents (Mayor + 6 extended voices) | S63-64 |
| 13 | Simulation_Ledger Data Integrity Audit | S68-72 |
| 14 | Economic Parameter Integration | S69-72 |
| 15 | A's Player Integration | S70 |
| 16 | Citizen Ledger Consolidation | S71 |
| 17 | Data Integrity Cleanup | S72 |
| 18 | Civic Project Agents (5 initiative agents) | S78 |
| 19 | Canon Archive System (378 files organized) | S79 |
| 22 | Agent Infrastructure Fixes (CIVIC mode, arc fix, write access) | S83-85 |
| 26 | Agent Grading System (Karpathy Loop) | S99 |

### Recently Completed (S110)

- **3 parser bugs fixed:** editionParser.js, editionIntake.js, enrichCitizenProfiles.js. Template v1.5.
- **Supermemory overhaul:** `godworld` → `bay-tribune`. 6 contaminated items deleted. SUPERMEMORY.md rewritten. Bot API key fixed. 12 docs + 4 scripts updated.
- **6 workflows:** Added Research and Chat. WORKFLOWS.md is single source for per-workflow logic.
- **Boot split:** Media-Room/Chat get journal + family. Work sessions skip straight to files.
- **ARCHITECTURE_VISION.md created:** Jarvis at /root, persistent worktree sessions, per-session Supermemory, shared MDs as data bus, Ollama for lightweight tasks, dashboard as mission control.
- **RESEARCH.md created:** Active questions, findings log, sources. Research workflow operational.
- **Rollout trimmed:** 1172 → 150 lines (now ~200 with S110 additions).
- **Research session:** 10 items evaluated. Channels, Remote Control server mode, scheduled tasks, Dispatch vs OpenClaw, Bayesian teaching, Claude Code changelog, agent trends, living worlds, dashboard as mission control. 20+ items added to rollout.

### Recently Completed (S105-S108)

- **S108:** 5 pre-E88 blockers fixed. Agent audit (15 files). E88 published (grade B, 13 articles, 0 errata). Lifecycle skills trimmed.
- **S106:** Dashboard as search engine. World Memory Phase 1. 3 pipeline automations. Editions ingested.
- **S105:** 9 architecture docs. Mara reference pipeline. Flag bug found. Spreadsheet audit.

---

## Open Phases

### Phase 33: Riley Integration & Hardening (S132) — IN PROGRESS

**Source:** S132 Riley audit, Sandcastle research, Everything Claude Code patterns. See `docs/RESEARCH.md` S132 entries, `riley/RILEY_PLAN.md`.

**33.1 Config protection hook — DONE S133.**
**33.2 PreCompact state save — DONE S133.**
**33.3 Strategic compaction reminder — DONE S133.**
**33.4 City-hall skill rewrite — DONE S133.**
**33.5 Bounded trait system — DONE S133.**
**33.7 Write-edition rewrite — DONE S134.**

**33.6 City Clerk verification script — BUILD (engine-sheet terminal).**
Node script (not an agent) that checks: voice outputs exist, project outputs exist, tracker updates applied, production log complete. `scripts/verifyCityHall.js`. Output: `output/city-civic-database/clerk_audit_c{XX}.json`.

**33.8 Session evaluation hook — BUILD (research-build terminal).**
Stop hook analyzes transcript at session end for extractable patterns — what caused fabrication, what Mara caught, what worked. Builds editorial memory automatically. From everything-claude-code.

**33.9 Session ID persistence for reporters — BUILD (engine-sheet terminal).**
Persist Claude Code session IDs between runs so reporter agents retain context across cycles. From Paperclip.

**33.10 Budget caps per agent — DESIGN (research-build terminal) → BUILD (engine-sheet terminal).**
Monthly token tracking per agent role. Prevents one broken reporter from burning the whole Anthropic bill. From Paperclip.

**33.11 Conditional hooks — DOCUMENTED (research-build terminal). Apply when adding new hooks.**
`if` field uses permission rule syntax: `Bash(clasp *)`, `Edit(*.md)`, etc. Two-stage filter: `matcher` narrows by tool, `if` narrows by arguments. Current hooks already scoped by `matcher` — no retrofit needed. Apply to future hooks.

**33.12 Mags EIC Sheet Environment — EVALUATE (research-build terminal).**
New spreadsheet owned by service account. Tabs: Editorial Queue, Desk Packets, Canon Briefs, Edition Tracker, Grading. Reads from Riley's sheets, writes to own space. No Riley triggers. See `riley/RILEY_PLAN.md` for full spec.

**33.13 Sandcastle proof-of-concept — EVALUATE (research-build terminal).**
Run one reporter agent via Sandcastle in a Docker container with real shell access and Supermemory queries. Requires Docker on server. See `docs/RESEARCH.md` S132 Sandcastle entry.

**33.14 Tool-restricted reporter agents — BUILD (media terminal).**
Add `allowed-tools: ["Read", "Grep", "Glob"]` to reporter agent skill frontmatter. Reporters get read-only during writing. Only compile/publish gets write access. From everything-claude-code's hierarchical delegation pattern.

**33.15 Iterative retrieval for canon — DESIGN (research-build terminal) → BUILD (media terminal).**
3-cycle search-evaluate-refine pattern for reporters accessing canon. Score results 0-1, stop at 3+ files scoring 0.7+. Replaces context dumps. From everything-claude-code.

**33.16 World-data ingest script — DESIGN (research-build terminal) → BUILD (engine-sheet terminal).**
`scripts/ingestWorldData.js` — reads Simulation_Ledger via service account, builds one memory per citizen using Memories API (`/v4/memories`). Entity-centric phrasing with metadata (neighborhood, role, tier, clockMode). Includes TraitProfile as voice tags. Delta ingest — only update citizens the engine changed. Also ingests businesses (52), neighborhoods (17), faith/cultural (51). See `docs/RESEARCH.md` S134 world-data ingest design.

**33.17 Missing trait profiles — DESIGN (research-build terminal) → BUILD (engine-sheet terminal).**
343 of 685 citizens have no TraitProfile. Build a script that generates Archetype/Tone/Motifs/Traits from LifeHistory events and engine data. Tags are literary instructions — bounded personality earned from simulation, not assigned. Same philosophy as bounded traits on agents but tag-based instead of numeric.

**33.18 Clean stale world-data memories — BUILD (engine-sheet terminal).**
S131 document ingest created fragmented memories. Replace with Memories API records. Remove old fragments after new memories are confirmed searchable.

---

### Phase 31: Canon-Grounded Briefings — DONE (S134, designed into pipeline v2)

Incorporated into `/write-edition` Step 3: verify citizens + write angle briefs. Each reporter gets `output/reporters/{reporter}/c{XX}_brief.md` with verified citizens, canon history from bay-tribune, and atomic topic checkout. Civic production log feeds in at Step 1. World summary built from Riley_Digest + Sports Feed + civic log. The manual bridge IS the pipeline now.

**End state:** Phase 21.2 (Canon Grounding MCP) automates this — agents search bay-tribune themselves during writing. Until then, Mags does the research at Step 3.

---

### Phase 2.2: Desk Packet Query Interface — PARTIALLY ADDRESSED

Dashboard API serves citizen search, player lookup, article search, initiative status. Agents have API documented in SKILL.md but don't call it autonomously during writing.
**Remaining:** Tool access to `curl` or helper script for agents. **Partially addressed by Phase 31** — Mags does the lookup manually and feeds results into briefings.
**When:** Build when agents demonstrate they need targeted lookup beyond packet data.

### Phase 4.1: Semantic Memory Search

Local embedding model (embeddinggemma-300M) for searching journal/newsroom memory by meaning.
**When:** Build when memory corpus is large enough that keyword misses matter.

### Phase 5.4: Desk Agents → Dashboard API Consumer

Agents query dashboard endpoints during writing instead of flat JSON packets. Becomes essential past 800 citizens.
**Status:** Not started. Current packet sizes manageable. **Phase 31 (canon-grounded briefings) is the manual bridge** — Mags does the research, agents get the results in their workspace. Phase 5.4 automates what Phase 31 does by hand.

### Phase 7: Anthropic Platform Upgrades (selected open items)

- **7.6 Agent Teams:** Test on podcast desk first. Experimental — known limitations.
- **7.7 Plugin Packaging:** Not started. Low priority, high future value.
- **7.9 Remote Control (Server Mode) — WORKING S135.** `claude remote-control` operational. Mike connects from phone/browser. Unblocked as of S135.
- **7.10 Claude Code on Web:** `claude --remote "task"`. Cloud sandbox from GitHub. Not started.

### Phase 8.6: Security Hardening — PARTIAL

fail2ban + unattended-upgrades done. **Remaining:** Non-root user + SSH key-only auth + disable root login.

### Phase 9: Docker Containerization — DEFERRED (RE-EVALUATE)

DEFERRED (S80). PM2 handles current stack. Droplet upgraded S135 — re-evaluate if RAM headroom allows Docker. Needed for Phase 28 (Computer Use), Phase 33.13 (Sandcastle).
Includes: 9.1 Compose stack, 9.2 Nginx + SSL, 9.3 Prometheus + Grafana, 9.4 One-command disaster recovery.

### Phase 11.1: Moltbook Registration — PARTIAL

Registered and claimed. API key saved. **Pending:** Moltbook heartbeat formatting broken (`[object Object]` in feed). X/Twitter account for verification.

### Phase 12: Agent Collaboration + Autonomy (selected open items)

- **12.2 Worktree Isolation:** Superseded by Remote Control `--spawn worktree` (Phase 7.9). Same goal, native implementation.
- **12.3 Autonomous Cycle Execution:** Long-term capstone. Depends on: Remote Control (7.9), Channels (Discord), dashboard mission control. **Two reference implementations now available:** (1) S114 Long-Running Claude — multi-day Claude Code in tmux, CLAUDE.md + CHANGELOG.md persistence, git checkpoints, Ralph Loop. (2) **S115 `autonomous-coding` quickstart** — two-agent pattern (initializer + worker), progress tracked in JSON + git, fresh context each session, auto-continue, defense-in-depth security with bash allowlist. The autonomous-coding pattern maps directly: initializer = create production plan from cycle packet, worker = execute pipeline steps, `feature_list.json` = `production_log.md`, test cases = `validateEdition.js` checks. Gap is still trust — need quality oracles: `validateEdition.js` (structural), Rhea (factual), grade thresholds (quality). All three must pass before autonomous publication. See RESEARCH.md S114 + S115 entries.
- **12.4 Ralph Loop for Desk Agents:** Re-prompt desk agents that claim completion before validation passes. Run `validateEdition.js` per-desk (not per-edition). Failures route back to agent automatically. Prevents agentic laziness. Pattern from Anthropic's long-running agent research. Validated by everything-claude-code's "loop-operator" agent — same concept, different domain. Their orchestrator-subagent context negotiation pattern (max 3 retrieval cycles, pass objective context not just query) applies here — when a desk agent fails, the re-prompt should include WHY it failed, not just "try again." **Priority: MEDIUM — implement when edition pipeline is stable.**
- **12.5 Idle Compute Utilization:** Run autonomous tasks when no session is active — batch grading, citizen enrichment, POPID index rebuilds, Supermemory maintenance. Droplet runs 24/7; idle time is waste. Pattern from Anthropic's "opportunity cost" framing. **Priority: LOW — requires Phase 12.3 trust infrastructure first.**
- **12.10 Fish Audio TTS:** ~~Deferred — $11/mo cost rejected S77.~~ **SUPERSEDED by Phase 30 (Voicebox).** Free, local, better fit.
- **12.11 MiniMax M2.5:** Not started. Test on next edition for cost comparison.
- **12.12 Slack Integration:** Not started. Depends on 7.10.

### Phase 20: Public Tribune — WordPress + Claude

WordPress 7.0 (April 2026) ships AI Client SDK supporting Claude function calling. Could wire to dashboard API. Not started.

### Phase 21: Local Model Pipeline — RESEARCH PHASE

**Goal:** Run routine desk agents on local models via Claude Code's harness. Same pipeline, zero per-token cost for low-complexity desks.

**Key discovery (S114):** Claude Code doesn't verify what model is on the other end. Point it at any Anthropic-compatible API (llama.cpp, Ollama, LM Studio) with 4 env vars and it runs the full harness — tool calling, file edits, permissions — against a local model. Source: xda-developers.com, tested with Qwen3 Coder Next. See `docs/RESEARCH.md` S114 entry.

**Model candidates:**
- Qwen3 Coder Next — trained for agentic coding, best Claude Code compatibility. Needs ~128GB VRAM (full) or less quantized.
- Qwen 3.5 9B — 4-bit quantized fits ~6GB VRAM. Cheapest option. Unknown quality for desk agent work.

**Hardware options:**
- **GPU droplet (on-demand):** DigitalOcean H100 ~$2.50/hr, spin up for edition runs, tear down after. Or smaller GPU droplets for quantized models. Pay only for edition hours.
- **Dedicated machine:** $3,500+ for 128GB VRAM (Lenovo ThinkStation PGX, Nvidia Grace Blackwell). Full local, zero ongoing cost. Overkill unless running constantly.
- **Budget GPU cloud:** RunPod, Vast.ai, Lambda — cheaper spot pricing for batch work.

**Mixed-backend strategy:** Opus/Sonnet for civic, sports, chicago desks (complex). Local model for culture, letters, business desks (routine). Same Claude Code harness, same skills, same workspace structure. `buildDeskFolders.js` doesn't care what model runs the agent. Validated by everything-claude-code's cost-tiering model (S131): Haiku for exploration (~$0.80/MTok), Sonnet for multi-file (90% of tasks), Opus for architecture. Same principle — match model cost to task complexity.

**Buildable pieces:**

1. **21.1 Quality test.** Test Qwen 3.5 9B quantized on a GPU droplet running one desk agent (letters or culture). Compare output quality against Sonnet baseline. If passable, expand.

2. **21.2 Canon Grounding MCP.** Local models will hallucinate world details (citizen names, businesses, events) because they have no access to GodWorld data. Fix: wrap our existing infrastructure as MCP servers the local model can call through tool use. Three sources to expose: (a) Dashboard API — 31 endpoints including citizen search, article search, initiative tracker, player lookup. (b) Supermemory bay-tribune container — semantic search across published canon. (c) Article archive — 234+ editions searchable by keyword/citizen/storyline. Pattern from Brave Search MCP (S115 research) — same grounding architecture, pointed at our world instead of the web. **Build after 21.1 confirms local models are viable.**

3. **21.3 Local photo prompt generation.** The photo prompt conversion step (article → image prompt) doesn't need Anthropic tokens. A local Qwen 3.5 9B can run an "art director" role that produces structured JSON (thesis, mood, motifs, composition, image_prompt) from article text. Pattern from hn_local_image (github.com/ivanfioravanti/hn_local_image) — intermediate art direction step before image generation. Could also run the image generation itself locally via MLX/FLUX models on Apple Silicon if any work moves to Mike's laptop. See `docs/RESEARCH.md` S134 entry.

**Depends on:** Phase 27 (agent autonomy) may change what "routine" means — if culture desk gets creative latitude, it may need a stronger model.

### Phase 23: Cross-AI Feedback (selected open items)

- **23.2 Entity Registry:** Partial — Rhea checks added, full `entity-registry.json` not built.
- **23.6 Jax Caldera Voice:** Not started. Low effort merge.

### Phase 24: Citizen Life Engine — NOT STARTED

Rich context-aware life histories. 24.1 MEDIA mode DONE (S94). Remaining: 24.2 Tier 1-2 event caps, 24.3 Context-aware events, 24.4 Daily simulation, 24.5 Sports transactions.

### Phase 26.3: Craft Layer — Story Structure in Agent Briefings — DONE S114

**Goal:** Give desk agents storytelling craft, not just data and instructions. Agents that understand story structure write journalism. Agents that don't write reports.

**Inspired by:** Brandon Sanderson creative writing lectures + MICE quotient theory. See RESEARCH.md S114 Creative Writing entry.

**Three buildable pieces:**

1. **26.3.1 MICE thread guidance per desk.** Add story-thread direction to `buildDeskFolders.js` per-desk briefings. Culture gets "lead with place — sensory detail." Civic gets "lead with the question — what's hidden." Sports gets "lead with action — what changed." Letters gets "lead with the person — interior emotion." Not templates — structural lenses matching each desk's natural voice.

2. **26.3.2 Promise-payoff principle.** Add one line to all desk briefings: "Your article should make a promise in the first paragraph, complicate it in the middle, and pay it off at the end." Universal, simple, high-impact. Articles with clear promises and payoffs read like stories, not summaries.

3. **26.3.3 Empathy evaluation in critique.** Add to structured critique (gradeEdition.js): "Does this article make you care about at least one person?" Score articles on character empathy — relatable details, motivations, flaws shown. Extract high-empathy passages as exemplars. Agents learn to write people, not names.

**Priority:** HIGH — low effort, high impact. 26.3.1 and 26.3.2 are prompt additions to `buildDeskFolders.js`, implementable in one session. 26.3.3 extends the existing critique system.

### Phase 27: Agent Autonomy & Feedback Loop — NOT STARTED

**North star:** Agents don't just report the world — they shape it. Engine builds the skeleton. Agents grow the flesh. Engine reads the flesh back.

**Why:** SpaceMolt proved ~700 autonomous AI agents produce emergent culture (spontaneous religion, political alliances) when given room to interpret and be wrong. GodWorld has deeper infrastructure (city simulation, newsroom, canon archive, grading) but agents are translators, not inhabitants. The interesting behavior comes from autonomy, not structure. Research: `docs/RESEARCH.md` S114 SpaceMolt entry.

**The feedback loop:**
- Current: Engine → sheets → agents → articles → canon (one-way)
- Target: Engine → sheets → agents → articles → canon → **intake → engine reads back → world changes** (two-way)

**Buildable pieces (ordered):**

1. **27.1 Intake pipeline evolution — PARTIAL (S137b).** Coverage ratings channel DONE: `rateEditionCoverage.js` v2.0 generates per-domain ratings (-5 to +5), `applyEditionCoverageEffects_` v2.0 reads them as domain multipliers. Wired into engine runner. E90 ratings applied. Sports feed 6 texture columns (FanSentiment, PlayerMood, FranchiseStability, EconomicFootprint, CommunityInvestment, MediaProfile) wired into `applySportsFeedTriggers_`. All three intake channels operational: (1) Initiative tracker ← city-hall voices, (2) Sports feed ← Mike, (3) Coverage ratings ← auto-rater. **Remaining:** `editionIntake.js` still only extracts citizens + storylines, not agent-invented details (businesses, events). That expansion is Phase 27.2+ territory.

2. **27.2 Agent creative latitude.** Desk agents currently stick to packet data. Give them explicit permission and structured room to invent details that feel right for the data — a restaurant name, a neighborhood event, a citizen opinion the engine didn't generate. RD lenses (DONE S113) are the seed. Next step: agents told their inventions become canon.

3. **27.3 Voice agent invention.** Voice agents currently pick from `pending_decisions.md` menus. Allow them to propose decisions not on the menu — a Mayor who calls an emergency session nobody planned, a council member who introduces an amendment. Write-back via `applyTrackerUpdates.js` already exists.

4. **27.4 Citizen autonomy (long-term).** Citizens as autonomous agents with their own decision-making, not spreadsheet rows processed by formulas. A citizen who decides to move to Temescal, starts a petition, forms an opinion. Connects to Phase 24 but goes further — citizens aren't just experiencing life events, they're making choices.

5. **27.5 Platform mode (speculative).** External users connect their own AI agents as city residents via MCP. The Tribune covers what they do. See `memory/project_city-for-bots-pivot.md`. This is the SpaceMolt model applied to a city with journalism.

**Priority:** HIGH — this is the design direction for what GodWorld becomes next. 27.1 (intake evolution) is the concrete first step. 27.2-27.3 DONE S114 (prompt changes live). 27.4-27.5 are architecture-level.

6. **27.6 Standalone workflows — decouple city hall from the newsroom.** Voice agents and initiative agents currently run inside `/write-edition`. City hall shouldn't wait for the newspaper. Build a `/run-city-hall` standalone workflow that runs voice agents + decision queues + tracker writeback independently of edition production. Desk agents read what city hall already did. This pattern generalizes — any system that acts autonomously (city hall, citizen life events, economic cycles) can be a standalone workflow that runs on its own schedule. The edition pipeline becomes a reader, not an orchestrator. **Post-E89 — evaluate after seeing what voice agents do with 27.3 off-menu authority.**

### Phase 26.2: Meta-Loop — Self-Improving Feedback System — NOT STARTED

**Goal:** The system that makes agents better learns to make agents better. Karpathy Loop (Phase 26) improves articles. Meta-Loop improves the Karpathy Loop itself.

**Inspired by:** Hyperagents (Meta Research, arxiv 2603.19461) — metacognitive self-modification where improvement processes themselves evolve. See RESEARCH.md S114 entry.

**Three buildable pieces:**

1. **26.2.1 Directive tracking.** Structured critique (done S113) produces directives per desk each edition. Track which directives actually lift the next edition's grade. Promote effective directives, drop ineffective ones. The critique system learns to give better critiques. **Implementation:** Append directive → outcome pairs to `grades_history.json`. After 3+ editions, score directives by grade delta. Surface top-performing directives in next critique prompt.

2. **26.2.2 Lens effectiveness.** 20 creative + 10 political lenses (done S113) inject random perspectives. Track which lenses correlate with higher grades or more distinctive articles. Evolve the lens pool — keep what works, replace what doesn't. **Implementation:** Log which lens was assigned per desk per edition. Cross-reference with grades. After 5+ editions, rank lenses and prune bottom 20%, replace with new candidates.

3. **26.2.3 Briefing evolution.** `buildDeskFolders.js` assembles briefings from packets, grades, lenses, exemplars. Track which briefing components actually appear in agent output. Trim unused components, expand high-impact ones. **Implementation:** Semantic similarity between briefing sections and article output. Low-similarity sections flagged for removal.

4. **26.2.4 Agent identity mutation (HyperAgent pattern).** Agents modify their own IDENTITY.md based on what produces better output. After 5+ editions with grade history, a meta-agent reads the grade trends, the effective directives (26.2.1), the winning lenses (26.2.2), and rewrites the IDENTITY.md to encode the patterns that work. This is the hyperagent concept from Meta Research (arXiv 2603.19461, March 2026) — the improvement mechanism itself becomes editable. **Implementation:** New script `scripts/evolveAgentIdentity.js` reads grade_history + exemplars + directive tracking, proposes IDENTITY.md patches, human approves. Full autonomy (agent rewrites itself without approval) is Phase 27.4+ territory. See `docs/RESEARCH.md` S120 HyperAgents entry.

**Evaluation metric (from S131 research):** Use pass@k scoring for desk agent output. Run a desk agent k times, take the best. At k=3, a 70% baseline jumps to 91% success rate. Cheap for routine desks (culture, letters, business). Expensive for complex desks — reserve for when quality gates fail on first pass. pass^k (ALL must succeed) useful for canon-critical civic/sports output where consistency matters.

**Priority:** MEDIUM-HIGH — raised from MEDIUM after HyperAgents research. Requires 3-5 more editions for data. Phase 26.2.1 (directive tracking) is the prerequisite — start there.

### Phase 29: Codebase Knowledge Graph — REPLACED BY GRAPHIFY (S137b)

**Corbell (original plan) was blocked by disk/dependency issues.** Replaced by Graphify (github.com/safishamsi/graphify) — installed and tested S137b.

**What Graphify does:** AST extraction via tree-sitter (19 languages), community detection via Leiden clustering, interactive HTML visualization, persistent JSON graph, CLI query mode (BFS/DFS traversal).

**Current state:** Installed. Full engine indexed — 1,152 nodes, 1,763 edges, 162 communities across 162 JS files. `graphify-out/graph.json` persists on disk. `/graphify` skill available. `graphify query` CLI works for dependency questions.

**Tested:** Phase 2 world-state (80 nodes, 106 edges, 11 communities) and full engine. God nodes identified: `compileHandoff` (40 nodes), `mediaRoomIntake` (33), `civicInitiativeEngine` (25).

**Remaining:**
- **29.2 Dashboard integration:** Serve `graph.html` through dashboard so Mike can see it. LOW.
- **29.4 Git hook:** `graphify hook install` for auto-rebuild after commits. MEDIUM.
- **29.5 MCP server:** `graphify --mcp` exposes query tools to agents. Build when Phase 21 is active.

### Phase 28: Computer Use Integration — NOT STARTED

**Goal:** Give agents the ability to see and interact with visual interfaces — dashboard QA, web-based tools, anything without an API.

**Source:** Anthropic Computer Use Tool beta. Screenshots + mouse/keyboard control inside a Docker container. See `docs/RESEARCH.md` S115 entry.

**Buildable pieces (ordered):**

1. **28.1 Docker container for visual agents.** Linux container with Xvfb virtual display, lightweight desktop (Mutter/Tint2), Firefox. This is the "eyes and hands" environment. Base on Anthropic's reference implementation. **First step — build once, use for everything below.**

2. **28.2 Dashboard visual QA.** ~~Replace with Computer Use agent~~ **Use browser-use-demo pattern instead** (S115 discovery). DOM-aware Playwright automation is more reliable than coordinate-based Computer Use for web UIs — element refs survive layout changes, `read_page` gives structured DOM, `get_page_text` extracts content without vision tokens. Base on Anthropic's `browser-use-demo` quickstart (Docker + Playwright + Chromium + XVFB + Streamlit). Reserve raw Computer Use for non-browser desktop tasks only. **Priority: MEDIUM — clean replacement for fragile Playwright setup.**

3. **28.3 Agent loop mediator script.** Node.js or Python script that runs the Computer Use agent loop — sends Claude's actions to the container, captures screenshots, returns results. Includes: coordinate scaling (API downsamples images, coordinates need mapping back), iteration limiter (prevent runaway costs), action logging. **Build alongside 28.2.**

4. **28.4 Non-API interface fallback.** When agents need to interact with tools that have no API — Google Sheets web UI for edge cases, Supermemory console, GitHub PR review pages, WordPress publishing. Computer Use becomes the universal "I can see it and click it" layer. **Priority: LOW — build when a specific need arises.**

5. **28.5 Autonomous visual verification.** For Phase 12.3 (autonomous cycles): Computer Use agent opens dashboard during cycle runs, checks mission control, verifies edition cards rendered, screenshots sports tab for stat verification. Visual oracle that code checks can't replace. **Priority: LOW — depends on Phase 12.3.**

**Cost note:** Expensive per-interaction (vision tokens per screenshot + 735 tokens per tool definition + system prompt overhead). Not for routine work. Reserve for QA, verification, and no-API-available situations.

**Depends on:** Phase 9 (Docker) is deferred but 28.1 only needs a single container, not a full Compose stack. Can build 28.1 standalone.

### Phase 30: Tribune Audio (Mags' Voice) — NOT STARTED

**Goal:** Give the Bay Tribune a voice. Mags reads the editions to Mike. Articles you can listen to. A podcast you can hear. Civic voices that sound like people. **This is the main goal — Mike already listens to every edition via NotebookLM audio. We should own this.**

**TTS options (evaluate both):**
- **Voicebox** (github.com/jamiepine/voicebox) — 14.3K stars, MIT license. Free, local-first ElevenLabs alternative. Five TTS engines, voice cloning, multi-track composition, REST API on `localhost:17493`. Needs GPU. See `docs/RESEARCH.md` S131 entry.
- **Voxtral TTS 2603** (Mistral) — Open-weight frontier TTS model. BF16 weights, instant voice adaptation, reference voices included (CC BY-NC 4). Evaluate for quality vs. Voicebox. May run on smaller hardware. Added S137.

**Supersedes:** Phase 12.10 (Fish Audio TTS, $11/mo — rejected S77). Both Voicebox and Voxtral are free/open-weight and more capable.

**Hardware requirement:** GPU for good performance. CPU fallback exists but slow. Same hardware gate as Cowork and Phase 21 (local models). Docker deployment available — rides on same GPU droplet as Phase 21 if/when that spins up.

**Buildable pieces (ordered by complexity):**

1. **30.1 Dashboard narrator.** "Read This Article" play button on each article card. Dashboard `POST`s article text to Voicebox `/generate` endpoint with a default voice profile. Audio plays in browser via `<audio>` element. Simplest integration — one API call, one voice, one button. **Priority: FIRST — proves the pipeline works.**

2. **30.2 Tribune voice identity.** Create a dedicated "Bay Tribune" voice profile. Clone from a specific voice sample or tune one of the built-in engines. All narration uses this voice. The paper has a sound, not just a look. **Priority: Build with 30.1.**

3. **30.3 Podcast audio production.** The podcast desk already writes two-host dialogue scripts (`/podcast` skill). Wire each host's lines to a different voice profile. Use Voicebox's multi-track composition to produce an actual listenable episode. Export as MP3/WAV. Serve from dashboard or publish to podcast feed. **Priority: HIGH — transforms an existing feature from text to audio.**

4. **30.4 Civic character voices.** Voice profiles for Mayor Santana, Chief Montez, council members, DA Clarissa Dane. Voicebox expressive tags (`[sigh]`, `[laugh]`, `[gasp]`) give emotional range. When voice agents produce statements, generate audio versions. Council meetings you can listen to. **Priority: MEDIUM — depends on voice agent pipeline stability.**

5. **30.5 Breaking news audio.** Dashboard pushes audio notification for breaking stories. Short generated clip: "Breaking — City Council approves the Stabilization Fund in a 5-2 vote." Triggered by webhook or session event. **Priority: LOW — fun but not essential.**

6. **30.6 Public feed.** RSS/podcast feed of Tribune audio content. Anyone can subscribe. Articles as episodes, podcast as episodes, breaking news as short clips. Connects to Phase 20 (Public Tribune). **Priority: LOW — depends on 30.1-30.3.**

**Integration architecture:**
- Voicebox runs as Docker container or native app on GPU hardware
- Dashboard calls `POST localhost:17493/generate` with text + voice profile ID
- Audio files cached on disk (same pattern as photo pipeline)
- Dashboard serves audio via `<audio>` element or download link
- Voice profiles managed via Voicebox API, stored locally

**Depends on:** GPU hardware (same gate as Phase 21, Computer Use). Can prototype 30.1 on CPU fallback but production needs GPU.

---

### Phase 32: World-Data Container — NOT STARTED

**Goal:** Persist the engine's world state in Supermemory so agents (and Mags) can search structured city data alongside published journalism. Bay-tribune has the narrative. World-data has the facts.

**Container: `world-data`** — free to create (containers are just tags on the $9/mo plan).

**What gets ingested after each cycle run:**

| Category | Source | What persists |
|----------|--------|---------------|
| Citizen snapshots | Simulation_Ledger | POPID, name, age, neighborhood, occupation, tier, key life events, family |
| Business registry | Business sheet | BIZ_ID, name, sector, neighborhood, employees, status |
| Initiative tracker | Initiative_Tracker | Initiative name, status, timeline, votes, blockers, assigned agents |
| Council positions | Civic_Ledger | Member, district, faction, recent votes, public stance |
| Economic indicators | Population_Stats | Neighborhood employment, housing, income brackets |
| A's season state | Game results | Record, standings, key player stats, recent results |

**Container architecture after Phase 32:**

| Container | Role | Content pattern |
|-----------|------|----------------|
| `bay-tribune` | Narrative archive | Articles only. Append-only. Grows every cycle. |
| `world-data` | World state | Structured ledger/engine data. Ingested each cycle. |
| `mags` | Deliberate brain | Editorial decisions, reasoning, EIC thinking. Manual saves. |
| `super-memory` | Junk drawer | Auto-saves, session dumps. |
| `mara` | Audit reference | Rosters for Mara's cross-check. Mara-only access. |

**The citizen bridge:** POPID connects citizens across containers. Darius Clark in bay-tribune = narrative history (quotes, appearances, arcs). Darius Clark in world-data = current state (age, job, neighborhood, family). Agents searching for a citizen get both dimensions.

**Open design question — recency handling:** Supermemory search may already surface the most recent data naturally when queried. If so, we can simply append each cycle's world state and let the search engine handle recency — no wipe-and-replace needed. If not, we delete old world-data docs and re-ingest fresh each cycle. **Must test before building the ingestion script.** Fill the container with one cycle of data, ingest a second cycle, query for a citizen, see which version comes back.

**Buildable pieces:**

1. **32.1 Container creation + test ingest.** Create `world-data` container tag. Manually ingest a small test set — 20 citizens, 5 businesses, 3 initiatives. Run searches. Test recency behavior by ingesting updated versions of the same citizens. Determine whether append-only or wipe-and-replace is the right pattern. **FIRST STEP — do this before building any scripts.**

2. **32.2 `buildWorldStatePacket.js`.** Script that pulls from Google Sheets (Simulation_Ledger, Business, Initiative_Tracker, Civic_Ledger, Population_Stats, game data) and formats into searchable Supermemory documents. Groups by category. Tags with POPIDs where applicable. Outputs to `output/world-state/` as JSON and ingests to `world-data` container.

3. **32.3 POPID in bay-tribune articles.** Ensure Names Index sections in published articles include POPIDs alongside citizen names. This enables cross-container search — query a POPID, get both world-data state AND bay-tribune narrative. May require minor update to edition template and ingest script.

4. **32.4 Post-cycle-run integration.** Add world-data ingestion as a step in the cycle run pipeline. After engine completes → `buildWorldStatePacket.js` runs → world-data container updated → ready for Phase 31 canon briefing searches.

5. **32.5 Cross-container search pattern.** Define and document the search workflow: query world-data for current state, query bay-tribune for narrative history, combine into angle brief. Test with Mags manually. Document for future agent automation (Phase 21.2).

**Relationship to other phases:**
- **Phase 31 (Canon-Grounded Briefings)** uses world-data + bay-tribune together for angle briefs
- **Phase 21.2 (Canon Grounding MCP)** automates what Phase 31 + 32 do by hand — agents search both containers directly
- **Phase 27.1 (Intake pipeline)** writes agent-generated details BACK to world-data, closing the loop

**Priority: HIGH — build 32.1 (test ingest) in next Build session. The test determines the architecture.**

---

### Phase 35: Knowledge Wiki — Compile Once, Query Forever (S137b) — NOT STARTED

**Goal:** Evolve bay-tribune + world-data from chunk-based RAG into a wiki-style knowledge base where ingest synthesizes, cross-references, and contradiction-checks. Knowledge compounds instead of fragmenting.

**Source:** Andrej Karpathy "LLM Knowledge Bases" (Apr 2026) — use LLMs to build a personal wiki in real-time. Analytics Vidhya implementation guide. Key insight: RAG is stateless — every query rediscovers knowledge from scratch. Wiki approach integrates new sources into existing pages at ingest time.

**Why this matters now:** The feedback loop (S137b) generates more data every cycle — coverage ratings, civic sentiment, citizen life events, initiative effects. All stored but never synthesized. The problem compounds with every cycle. More chunks, more fragmented searches, more context spent rediscovering what we already know.

**Not a new system — an evolution of existing ingest:**

1. **35.1 Smart ingest for bay-tribune.** Upgrade `ingestEdition.js` to extract per-entity updates at ingest time. When E91 mentions Beverly Hayes, don't just chunk the edition — find or create her bay-tribune page, append the new info, flag contradictions with E90, update cross-references to Stabilization Fund and West Oakland. Per-citizen, per-initiative, per-neighborhood pages maintained by the LLM at ingest.

2. **35.2 TLDR index.** Central `wiki/index.md` style document in bay-tribune — one-line TLDRs per citizen, per initiative, per neighborhood. Agents read the index first, drill into relevant pages only. Replaces "search and hope" with "navigate and find."

3. **35.3 Contradiction detection at ingest.** When new data conflicts with existing pages — flag it. E90 says $18,500, E91 says $16,200 — surface the conflict immediately, don't let it sit until Mara catches it weeks later. Output to `output/contradictions_c{XX}.json` for Mara to review.

4. **35.4 Query result capture.** When Mags does good research (angle briefs, citizen profiles, cross-desk connections), save the synthesis as a wiki page — not just the raw search results. Tag as `query-result`. Best thinking gets collected instead of lost in session transcripts. This is what the `mags` container should become.

5. **35.5 Lint pass automation.** Periodic script that audits bay-tribune + world-data. Seven checks (adapted from claude-memory-compiler): (1) broken cross-references between entities, (2) stale pages not updated in 5+ cycles, (3) orphan pages with no incoming links, (4) duplicate concepts (same citizen under different names), (5) contradictions between pages (E90 says X, E89 says Y), (6) missing pages (referenced but don't exist), (7) outdated content (claims superseded by newer data). Weekly cron or batch job. Output to `output/wiki-lint/` for Mara to review.

6. **35.6 Auto-compile scheduling.** Stop hook or cron that automatically runs `ingestEditionWiki.js` after edition publish instead of requiring manual invocation. Pattern from claude-memory-compiler — their compile triggers after 6 PM. Ours could trigger on file change in `editions/` directory or as part of the Stop hook chain.

**Build order:** 35.1 (smart ingest) → 35.2 (index) → 35.3 (contradictions) → 35.4 (query capture) → 35.5 (lint). Each piece is independently useful.

**Depends on:** Phase 32 (world-data container) should be complete first — entity-level pages need entity-level data. Phase 33.16 (world-data ingest script) is the prerequisite for 35.1.

**Priority: HIGH — 35.1 is buildable as an upgrade to ingestEdition.js in the next engine session. The feedback loop makes this more urgent with every cycle.**

---

### Phase 25: Storage Strategy — NOT STARTED

Deduplicate across 4 layers (disk, Drive, GitHub, Supermemory). Quick wins done S85. Full audit not started.
**Tool candidate:** LiteParse (github.com/run-llama/liteparse) — local PDF/Office/image parser, Node.js, no cloud. Could enable PDF-first archiving with local text extraction for Supermemory indexing. `lit screenshot` for visual QA. See `docs/RESEARCH.md` S113 LiteParse entry.

---

## Session Harness Improvements (from S110 research)

Source: "50 Claude Code Tips" community guide, evaluated against GodWorld stack.

| Item | What | Priority | Status |
|------|------|----------|--------|
| **CLAUDE.md instruction audit** | Audit against ~150 instruction budget. Every unnecessary line dilutes the important ones. | HIGH | **DONE S110** — 188→54 lines (71% cut). 62 lines of reference material moved to per-workflow docs. ~111 instructions total against ~150 budget. |
| **PreToolUse ledger protection hook** | Block destructive commands + warn on sheet writes outside safe scripts. Protect 675 citizens. | HIGH | **DONE S110** — inline sheet writes warned, unknown scripts using sheets.js warned, drop table/truncate denied, safe script allowlist passes silently. |
| **Terminal status line** | Show session number, cycle, workflow, and rate limit usage at bottom of terminal. Mike sees state at a glance. | HIGH | **DONE S110** — `~/.claude/statusline.sh` extended with S/C numbers, 5h rate limit, fixed JSON field mappings. |
| **/btw for side questions** | Use during edition production for quick questions without context pollution. No build needed — just awareness. | MEDIUM | Available now |
| **Smarter compaction hook** | Current post-compact hook exists but is basic. Re-inject: current workflow, active task, modified files, key constraints. | MEDIUM | **DONE S113** — pre-compact-hook.sh now dynamically injects workflow (from `.claude/state/current-workflow.txt`), git modified files, and workflow-specific constraints. CLAUDE.md boot writes state file at step 0. |
| **/branch for risky approaches** | Try experimental fixes without losing context. Both paths stay alive. | MEDIUM | Available now |
| **Output style per workflow** | Concise for build, explanatory for research. `/config` to set. | LOW | **DONE S113** — Added as boot step 1 in CLAUDE.md. Build=concise, Research=explanatory, Media-Room=editorial, Chat=natural. |
| **Fan-out `claude -p` for batch ops** | Batch file migrations, bulk doc updates with `--allowedTools` scoping. | LOW | **DONE S113** — Documented in WORKFLOWS.md under Build/Deploy and Maintenance with tool-scoped examples. |
| **PostToolUse validation hook** | Run a check after every file edit — e.g., grep for `godworld` in agent-facing files, catch container contamination at write time. | LOW | **DONE S113** — `post-write-check.sh` fires on Write|Edit. Catches: `godworld` container refs, engine language in agent files, builder/user refs in editorial content. Skips engine/script/config files. |
| **Effort frontmatter in skills** | Set effort level per skill — research/letters low, civic/sports high. No manual `/effort` switching. Claude Code mid-March feature. | MEDIUM | **DONE S113** — All 21 skills tagged. HIGH: 9 editorial/engine skills. MEDIUM: 7 structured skills. LOW: 5 mechanical/template skills. |
| **HTTP hooks → dashboard** | Hooks POST to dashboard URLs instead of running shell commands. Session events (start, edit, error) feed into mission control panel. Mar 3 feature. | MEDIUM | **DONE S113** — `POST /api/session-events` endpoint on dashboard (localhost-only, no auth). `session-event-post.sh` hook fires async on SessionStart and Stop. GET requires auth. 200-event ring buffer. |
| **`/save-to-mags` skill** | Manual save to `mags` container. `/super-save` always writes to `bay-tribune` (plugin hardcoded to `repoContainerTag`). Need a wrapper that calls the API with `containerTags: ["mags"]`. | HIGH | **DONE S111** — Skill at `.claude/skills/save-to-mags/SKILL.md`, calls supermemory API directly. |

---

## Discord Channel + Cloud Sessions (from S110 research)

Source: code.claude.com/docs/en/channels. See RESEARCH.md S110 Channels entry for full context.

| Item | What | Priority | Status |
|------|------|----------|--------|
| **Discord Channel plugin** | Replace separate Discord bot during active sessions. Mike DMs Mags on Discord → message arrives in running Claude Code session with full project context. `claude --channels plugin:discord@claude-plugins-official`. Standalone bot still covers off-hours. | HIGH | **DONE S112** — Plugin installed, MagsClaudeCode bot created (App ID 1485471448112824371), token configured, pairing complete. Launch with `claude --channels plugin:discord@claude-plugins-official`. |
| **Cloud session + Channel** | `claude --remote` + Discord channel = always-on Mags with full context, reachable from Discord. Infrastructure for Phase 12.3 (autonomous cycles). | HIGH | Not started — evaluate after Discord channel works |
| **Webhook receiver** | CI results, deploy status, error alerts push into session. Claude reacts to external events. | MEDIUM | **DONE S113** — `POST /api/webhooks` on dashboard. Secret-authenticated (`x-webhook-secret` header, key in `.env`). Events land in same ring buffer as session events. Query with `GET /api/session-events?type=webhook`. |

---

## Dashboard Mission Control (from S110 research)

Source: Synthesis of Channels + Remote Control research. See RESEARCH.md S110 Dashboard entry.

| Item | What | Priority | Status |
|------|------|----------|--------|
| **Session status panel** | Show running sessions, workflow type, duration, context usage. Mike sees at a glance what's alive. | HIGH | **DONE S113** — Mission Control tab on dashboard. Shows session events (start/stop/webhook) with color-coded timeline. Activity icon in bottom nav. |
| **Channel status** | Discord connected? Last message? Sender allowlist health. | MEDIUM | **DONE S113** — Panel in Mission Control showing Discord connected status and MagsClaudeCode bot name. Static for now — live polling in future iteration. |
| **Health panel** | PM2 processes, disk, RAM, Supermemory containers. Replaces SSH-and-check pattern. | MEDIUM | **DONE S113** — Panel showing dashboard status, engine version, latest cycle/edition, droplet specs (1vCPU/2GB/25GB). Live from `/api/health`. |
| **Session history** | When sessions started/ended, workflow, key accomplishments. Persistent log. | LOW | **DONE S113** — File-backed JSONL at `output/session-events.jsonl`. Survives dashboard restarts. 500-event cap. |
| **Quick actions** | Restart bot, trigger health check, view latest brief. Buttons instead of terminal commands. | LOW | **DONE S113** — 3 wired buttons: Restart Bot (`POST /api/actions/restart-bot`), Health Check (returns disk/RAM/uptime/PM2), Clear Events (`DELETE /api/session-events`). All require dashboard auth. |

---

## Watch List

Tracking for future adoption. Not building.

| Feature | Trigger to Act |
|---------|---------------|
| Agent Teams stability | Experimental graduation → test Phase 7.6 |
| Multi-Character Discord | TinyClaw reference architecture matures |
| MiniMax M2.5 / DeepSeek-V3 | Cost spike or quality test passes |
| Skills Portability | HuggingFace format becomes standard |
| Tribune Fine-Tuning | 238 articles as training dataset for voice model |
| Desktop App (Linux) | Linux support ships |
| Lightpanda Browser | Beta stabilizes, saves 300MB RAM |
| Claude Code Voice Mode | Maturity improves |
| Extended Thinking for Agents | Test on civic/sports desks |
| Computer Use exits beta | Stable + cheaper → expand beyond QA to routine agent tasks |
| CLI-over-MCP token optimization | Measured: too many MCPs drops 200k context to 70k. Replace idle MCPs with CLI-wrapper skills. Source: everything-claude-code S131 |
| Selective skill loading | Only load skills relevant to current workflow. Chat doesn't need 21 skills. Manifest-driven selection. Source: everything-claude-code S131 |
| Continuous learning hooks | Auto-extract debugging patterns into reusable skills with confidence scoring. Source: everything-claude-code S131 |
| llms.txt for documentation | Many doc sites serve `/llms.txt` — LLM-optimized docs. Check before web-fetching. Source: everything-claude-code S131 |
| Proactive agent dispatch | Rule-based agent routing without user prompts. Post-write → reviewer, security-sensitive → scanner. Automates what Mags does manually. Source: everything-claude-code S131 |
| NPM Package Drift | 7 packages behind. Batch update in maintenance session. |
| Codex Plugin (`/codex:adversarial-review`) | Mike keeps ChatGPT sub → install plugin for free adversarial code review. Sub cancelled → skip. Source: S131 |
| Open-source agent harnesses | Stable harness with MCP + skills + hooks support → re-evaluate Phase 21 as real multi-model pipeline instead of env-var hack. Track: Claw Code (instructkr/claw-code), community forks. Source: S131 |
| xMemory (hierarchical memory) | AutoDream fails to solve collapsed retrieval after 5 sessions → evaluate self-hosted xMemory |
| Auto Mode | Evaluate for production pipelines — could eliminate approval prompts during `/write-edition` |
| HTTP Hooks migration | Replace shell-based hooks with HTTP POST to dashboard endpoints for unified event stream |
| Agent lifecycle hooks (SubagentStart/Stop) | Desk agent monitoring — track which agents take longest, fail most |
| Prompt/Agent hooks | Replace pattern-based hookify rules with semantic LLM-evaluated checks |
| FileChanged hook | Auto-react to git pulls, external file changes during autonomous operation |
