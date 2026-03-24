# GodWorld — Rollout Plan

**Status:** Active | **Last Updated:** Session 114 (2026-03-24)
**North star:** `docs/ARCHITECTURE_VISION.md` — Jarvis + persistent sessions. Everything we build points there.
**Completed phase details:** `ROLLOUT_ARCHIVE.md` — read on demand, not at boot.
**Research context:** `docs/RESEARCH.md` — findings log, evaluations, sources.

---

## Next Session Priorities

### Open — Dashboard & Data Quality

- ~~**DESIGN: Supplemental display on frontend**~~ — **DONE S113.** Amber-themed supplemental cards on Edition tab below articles. Shows title, cycle badge, filename. 7 supplementals rendered from `/api/editions` `isSupplemental` flag.
- ~~**DESIGN: Chicago dashboard tab**~~ — **DONE S113.** Dedicated Chicago tab via hamburger menu. Bulls card (record, season, trend), feed events with stats, bureau coverage (15+ articles), reporter section (Grant + Finch). Red accent theme.
- ~~**FIX: Rebuild POPID article index**~~ — **DONE S113.** `scripts/buildPopidArticleIndex.js` created. Cross-references 675 citizens × 234 editions. 241 citizens indexed, 1,795 refs. Run with `--write` to update. Old index: 176 citizens from Feb 5.
- **CLEANUP: Dead spreadsheet tabs** — 8 dead tabs to archive/hide. Backup CSV first. See `docs/SPREADSHEET.md`.
- ~~**FIX: Press_Drafts ghost references**~~ — **DONE S113.** Removed Press_Drafts write from `mediaRoomIntake.js`, removed sheet creation/upgrade calls, cleaned comments in `applyStorySeeds.js`. Requires `clasp push` to deploy.
- **FIX: editionIntake.js broken for both formats** — Two bugs: (1) cycle number detection reads wrong number from supplemental filenames (logged "Edition 84" for C88 supplemental), (2) section parser returns 0 citizens/0 storylines from Cycle Pulse format — headers don't match parser expectations. **10 new citizens from education supplemental (teachers, students, staff) and 4 new schools are stuck — won't reach Simulation_Ledger until this is fixed.** Priority: HIGH for C89. See E88 errata carry-forward.
- **FIX: gradeEdition.js supplemental support** — Article parser, errata logging, desk mapping all need supplemental awareness.
- ~~**UPGRADE: Structured critique in gradeEdition.js**~~ — **DONE S113.** 3-signal feedback (reasoning, strengths/weaknesses, directive) per desk and reporter. Flows through `grades_c{XX}.json` → `buildDeskFolders.js` → `previous_grades.md` → agents read at boot. Based on Reagent + RLCF research.
- ~~**FEATURE: RD diversity injection for agents**~~ — **DONE S113.** 20 creative lenses for desk agents (buildDeskFolders.js), 10 political lenses for voice agents (buildVoiceWorkspaces.js). Random per run. Based on Harvard Recoding-Decoding (arxiv 2603.19519).

- ~~**FIX: Citizen freshness weighting in buildDeskPackets.js**~~ — **DONE S114.** buildDeskPackets.js v2.4 sorts by freshness. 425 citizens with zero appearances rank first. Briefings tag [FRESH]. buildPopidArticleIndex.js writes JSON usage counts.

- **FEATURE: Photo QA step in edition pipeline.** Send each AI-generated photo + article context to Claude Vision API. Evaluate: does the photo match the article? Wrong tone? Generic AI slop? Anachronistic details? Fits prosperity-era Oakland aesthetic? Flag or reject before PDF generation. Cost: ~16,000 tokens per edition (<$0.05). Fits between Step 15 (photos) and Step 16 (PDF). Script: read photo, base64-encode, send with article summary, get pass/fail + reason. **Priority: MEDIUM — build when next touching photo pipeline.** See `docs/RESEARCH.md` S115 Vision entry.

### Open — Architecture & Production

- ~~**DESIGN: Agent knowledge separation**~~ — **DONE S113 (audit).** Already correctly configured: `.claude/.supermemory-claude/config.json` sets `repoContainerTag: "bay-tribune"`, `personalContainerTag: "mags"`. Desk agents don't call supermemory directly — they use local workspaces. `/super-search` searches `bay-tribune` only. Discord bot reads both (intentional). Fixed one stale doc reference in `/write-supplemental`.
- **PROJECT: World Memory** — Phase 1 DONE (dashboard reads archive). Remaining: (3) ingest key archive articles to bay-tribune, (5) historical context in desk workspaces. See `docs/WORLD_MEMORY.md`.
- ~~**BUILD: Voice-Agent-World-Action-Pipeline**~~ — **DONE S113.** Fully operational. `buildDecisionQueue.js` + `applyTrackerUpdates.js` wired into `/write-edition` Step 2.5. All 5 initiatives in BLOCKER_MAP. All 6 voice agents read `pending_decisions.md`. Production-tested C85-C87. Rollout entry was stale — pipeline survived the S113 crash intact. Confirmed S114 audit.
- **Supplemental strategy (ongoing)** — One supplemental per cycle minimum.
- **DESIGN: Agent Autonomy & Feedback Loop (Phase 27)** — Agents shape the world, not just report it. Intake pipeline evolves to feed agent-generated details back into engine. Inspired by SpaceMolt emergent behavior research. **Priority: HIGH — design direction for GodWorld's next phase.** First step: 27.1 intake evolution. See Phase 27 below.

### Open — Agent Prompt & Skill Audit (from S115 research) — PRIORITY: HIGH

Source: Anthropic prompting guide, extended thinking docs, skill best practices, Claude Code skills reference. See `docs/RESEARCH.md` S115 entries (5 entries).

**TOOL: ~~Install `skill-creator`~~ — DONE S115.** Installed `skill-creator@claude-plugins-official`. Also installed: ralph-loop, hookify, claude-code-setup.

**~~A. Skill Frontmatter Upgrade~~** — **DONE S115.** `disable-model-invocation: true` added to 12 side-effect skills. Effort levels tuned (culture→medium, business→low). Argument hints on 4 pipeline skills.

Every one of our 21 skills should get these frontmatter fields reviewed and set:

| Field | What to set | Why |
|-------|-------------|-----|
| `effort` | `high` for civic/sports/chicago, `medium` for culture/letters/business, `low` for mechanical skills | Per-skill thinking depth. Complex desks get deeper reasoning. |
| `model` | Leave default for now. Phase 21: set routine desks to local model. | This IS the Phase 21 mechanism. Zero code changes — just frontmatter. |
| `disable-model-invocation` | `true` on `/run-cycle`, `/write-edition`, `/session-end`, `/write-supplemental`, `/podcast`, `/run-city-hall` | SAFETY GAP: Claude can currently auto-trigger side-effect skills. |
| `allowed-tools` | Production skills: `Read, Write, Bash, Glob, Grep`. Read-only skills: `Read, Grep, Glob`. | Eliminates approval prompts during pipeline runs. |
| `argument-hint` | `/write-edition [cycle]`, `/write-supplemental [topic]`, `/podcast [edition]` etc. | Autocomplete UX improvement. |

**B. Dynamic Context Injection (HIGH — integrate into edition pipeline)**

The `` !`command` `` syntax injects live data into skill prompts BEFORE Claude sees them. This could replace manual packet-loading steps:
- Desk skills inject fresh briefing data: `` !`cat output/desk_packets/civic_packet.json` ``
- Grade history injected automatically: `` !`cat output/grades/grades_c88.json | jq '.civic'` ``
- Active storylines pre-loaded: `` !`node scripts/getActiveStorylines.js` ``

Evaluate which `/write-edition` steps can be replaced by bash injection in skill frontmatter. Could eliminate 2-3 manual pipeline steps.

**~~C. Prompt De-escalation~~** — **DONE S115.** Scanned all agent SKILL.md and RULES.md files. MUST/NEVER usage is all editorial guardrails (factual accuracy, fourth-wall, journalism rules) — NOT tool-triggering language. No changes needed. No prefilled responses found.

**D. Thinking Migration (HIGH — urgent, deprecated feature)**

- **MIGRATE: Adaptive thinking.** `budget_tokens` is explicitly deprecated for Opus 4.6, will be removed. Switch civic/sports/chicago desk prompts to adaptive thinking. Gets interleaved thinking for free — Claude reasons between tool calls. Combined with `effort` per skill (section A), this gives fine-grained thinking control.
- **EVALUATE: `display: "omitted"` for production runs.** Faster streaming, still charged for tokens. **Priority: LOW — test after migration.**

**E. Skill Structure (MEDIUM — do when touching skills)**

- **AUDIT: SKILL.md line counts.** Body under 500 lines. Move excess to reference files (one level deep).
- **AUDIT: Skill descriptions.** Third person, include WHAT + WHEN. Check with `/context` for budget warnings.
- **AUDIT: Degrees of freedom.** Pipeline skills = LOW freedom. Research/chat = HIGH freedom.
- ~~**ADD: Compaction survival prompt.**~~ **DONE S115.** Added to `pre-compact-hook.sh`.
- **REVIEW: Subagent guidance.** When to fork vs direct call. Opus 4.6 over-spawns.
- **CHECK: Description budget.** Run `/context` to see if 21 skills exceed the 2% / 16,000 char budget. Override with `SLASH_COMMAND_TOOL_CHAR_BUDGET` if needed.
- **FUTURE: Skill evaluations.** 3+ test scenarios per skill. Do when we next rewrite a skill.

### Open — Infrastructure & Maintenance

- ~~**CLEANUP: Archive old session transcripts**~~ — **DONE S113.** Cleaned 650MB. Observer + root sessions >14d deleted. GodWorld sessions >14d archived to `output/archives/godworld-sessions-pre-20260309.tar.gz` (69MB). Disk: 72% → 70%.
- **Node.js security patch** — Scheduled March 24, 2026.
- ~~**INSTALL: Ralph Loop plugin.**~~ **DONE S115.** Installed. Test on E89: `/ralph-loop "Write the civic section" --completion-promise "SECTION COMPLETE" --max-iterations 10`.
- ~~**INSTALL: Hookify plugin.**~~ **DONE S115.** Installed + 2 rules created: `fourth-wall-guard` (agent file contamination), `credential-guard` (service account/API key exposure).
- ~~**RUN: claude-automation-recommender.**~~ **DONE S115.** Result: context7 MCP + sqlite MCP installed. ESLint auto-fix hook recommended (not yet implemented).
- ~~**RUN: claude-md-improver.**~~ **DONE S115.** CLAUDE.md upgraded: Quick Commands section + Infrastructure section added. Score: B (82/100).
- ~~**ADD: Security review on commits — CONFIRMED WILL DO.**~~ **DONE S115.** GitHub Action updated with custom scan rules (`docs/security-scan-rules.txt`). Covers: fourth-wall contamination, credential exposure, container contamination, script injection. `/security-review` available for manual use.
  3. **Custom scan instructions:** Create `docs/security-scan-rules.txt` with GodWorld-specific rules: flag "godworld", "simulation", "engine", "builder", "user" in files under `.claude/agents/` (fourth-wall contamination). Flag service account email or credential paths in any non-config file. Flag bay-tribune container references in non-Supermemory code. This extends the post-write hook (`post-write-check.sh`) with security-review-time coverage.
  **Priority: HIGH — do in next Build session.**
- **UPGRADE: Instant compaction pattern.** Replace reactive compaction (wait until full, user waits for summary) with proactive instant compaction — background thread builds session memory once soft threshold is met, ready to swap in instantly when context is full. Pattern from `claude-cookbooks/misc/session_memory_compaction.ipynb`. Uses prompt caching for ~10x cheaper background updates. **Priority: MEDIUM — improves every session, especially long production runs.**
- **EVALUATE: Context clearing strategy.** Clear old thinking blocks first, then old tool results, while preserving memory files. Beta flag `context-management-2025-06-27`. Pattern from `claude-cookbooks/tool_use/memory_cookbook.ipynb`. **Priority: LOW — evaluate when compaction issues arise.**
- ~~**CLEANUP: ~22 duplicate docs in bay-tribune container**~~ — **DONE S113.** 26 duplicates found and deleted via supermemory API. All from S106 double-ingestion (Mar 21 23:25 originals + Mar 22 02:06 re-ingest). Kept newer copies. Zero duplicates remaining.

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

### Phase 2.2: Desk Packet Query Interface — PARTIALLY ADDRESSED

Dashboard API serves citizen search, player lookup, article search, initiative status. Agents have API documented in SKILL.md but don't call it autonomously during writing.
**Remaining:** Tool access to `curl` or helper script for agents.
**When:** Build when agents demonstrate they need targeted lookup beyond packet data.

### Phase 4.1: Semantic Memory Search

Local embedding model (embeddinggemma-300M) for searching journal/newsroom memory by meaning.
**When:** Build when memory corpus is large enough that keyword misses matter.

### Phase 5.4: Desk Agents → Dashboard API Consumer

Agents query dashboard endpoints during writing instead of flat JSON packets. Becomes essential past 800 citizens.
**Status:** Not started. Current packet sizes manageable.

### Phase 7: Anthropic Platform Upgrades (selected open items)

- **7.6 Agent Teams:** Test on podcast desk first. Experimental — known limitations.
- **7.7 Plugin Packaging:** Not started. Low priority, high future value.
- **7.9 Remote Control (Server Mode):** `claude remote-control` on the droplet. Mike connects from phone/browser. `--spawn worktree` for parallel sessions. Account-gated — confirmed S112 still blocked. **Priority: HIGH.**
- **7.10 Claude Code on Web:** `claude --remote "task"`. Cloud sandbox from GitHub. Not started.

### Phase 8.6: Security Hardening — PARTIAL

fail2ban + unattended-upgrades done. **Remaining:** Non-root user + SSH key-only auth + disable root login.

### Phase 9: Docker Containerization — DEFERRED

DEFERRED (S80). PM2 handles current stack. Docker overhead ~200MB on 2GB droplet. Revisit at 4GB+ or when adding services.
Includes: 9.1 Compose stack, 9.2 Nginx + SSL, 9.3 Prometheus + Grafana, 9.4 One-command disaster recovery.

### Phase 11.1: Moltbook Registration — PARTIAL

Registered and claimed. API key saved. **Pending:** Moltbook heartbeat formatting broken (`[object Object]` in feed). X/Twitter account for verification.

### Phase 12: Agent Collaboration + Autonomy (selected open items)

- **12.2 Worktree Isolation:** Superseded by Remote Control `--spawn worktree` (Phase 7.9). Same goal, native implementation.
- **12.3 Autonomous Cycle Execution:** Long-term capstone. Depends on: Remote Control (7.9), Channels (Discord), dashboard mission control. **Two reference implementations now available:** (1) S114 Long-Running Claude — multi-day Claude Code in tmux, CLAUDE.md + CHANGELOG.md persistence, git checkpoints, Ralph Loop. (2) **S115 `autonomous-coding` quickstart** — two-agent pattern (initializer + worker), progress tracked in JSON + git, fresh context each session, auto-continue, defense-in-depth security with bash allowlist. The autonomous-coding pattern maps directly: initializer = create production plan from cycle packet, worker = execute pipeline steps, `feature_list.json` = `production_log.md`, test cases = `validateEdition.js` checks. Gap is still trust — need quality oracles: `validateEdition.js` (structural), Rhea (factual), grade thresholds (quality). All three must pass before autonomous publication. See RESEARCH.md S114 + S115 entries.
- **12.4 Ralph Loop for Desk Agents:** Re-prompt desk agents that claim completion before validation passes. Run `validateEdition.js` per-desk (not per-edition). Failures route back to agent automatically. Prevents agentic laziness. Pattern from Anthropic's long-running agent research. **Priority: MEDIUM — implement when edition pipeline is stable.**
- **12.5 Idle Compute Utilization:** Run autonomous tasks when no session is active — batch grading, citizen enrichment, POPID index rebuilds, Supermemory maintenance. Droplet runs 24/7; idle time is waste. Pattern from Anthropic's "opportunity cost" framing. **Priority: LOW — requires Phase 12.3 trust infrastructure first.**
- **12.10 Fish Audio TTS:** Deferred — $11/mo cost rejected S77.
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

**Mixed-backend strategy:** Opus/Sonnet for civic, sports, chicago desks (complex). Local model for culture, letters, business desks (routine). Same Claude Code harness, same skills, same workspace structure. `buildDeskFolders.js` doesn't care what model runs the agent.

**Buildable pieces:**

1. **21.1 Quality test.** Test Qwen 3.5 9B quantized on a GPU droplet running one desk agent (letters or culture). Compare output quality against Sonnet baseline. If passable, expand.

2. **21.2 Canon Grounding MCP.** Local models will hallucinate world details (citizen names, businesses, events) because they have no access to GodWorld data. Fix: wrap our existing infrastructure as MCP servers the local model can call through tool use. Three sources to expose: (a) Dashboard API — 31 endpoints including citizen search, article search, initiative tracker, player lookup. (b) Supermemory bay-tribune container — semantic search across published canon. (c) Article archive — 234+ editions searchable by keyword/citizen/storyline. Pattern from Brave Search MCP (S115 research) — same grounding architecture, pointed at our world instead of the web. **Build after 21.1 confirms local models are viable.**

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

1. **27.1 Intake pipeline evolution.** `editionIntake.js` currently extracts citizens + storylines. Expand to extract world details — new businesses, locations, events, relationships, cultural developments — and write them to a sheet or structured file the engine can read at next cycle. This is the hinge that closes the loop.

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

**Priority:** MEDIUM — requires 3-5 more editions to generate enough data. The Karpathy Loop needs to run a few more times before the meta-loop has signal to work with.

### Phase 29: Codebase Knowledge Graph (Corbell) — NOT STARTED

**Goal:** Give Mags and all agents a queryable map of the entire GodWorld codebase — every function, every dependency, every call path — accessible as MCP tools without reading files.

**Source:** Corbell (github.com/Corbell-AI/Corbell). Open-source CLI, Apache 2.0. See `docs/RESEARCH.md` S115 Corbell entry.

**Why priority HIGH:** Every session starts with context cost — reading docs, tracing dependencies, understanding how scripts connect. Corbell replaces that with MCP queries against a persistent local knowledge graph. After compaction, the graph survives on disk. Extends and replaces `/stub-engine`. Enables Phase 21 local models to understand codebase structure.

**Buildable pieces:**

1. **29.1 Install and index.** `pip install "corbell[anthropic]"`, `corbell init`, `corbell graph build --methods`, `corbell embeddings build`. Index all 153 engine files, 11+ scripts, lib/, agent configs. **BLOCKED S115:** Not on PyPI yet (install from GitHub source). Sentence-transformers + PyTorch dependency requires ~3GB disk — doesn't fit on current 2GB droplet (2.7GB free, 89% full). **Unblock by:** (a) disk cleanup or droplet resize, OR (b) install graph-only without embeddings if Corbell supports `--no-deps` mode.

2. **29.2 MCP server integration.** Add Corbell MCP config to Claude Code settings. Verify the four tools work in-session: `graph_query`, `get_architecture_context`, `code_search`, `list_services`. Test: "What calls sheets.js?" "Which scripts write to Storyline_Tracker?" "What does buildDeskPackets.js depend on?"

3. **29.3 Graph visualization.** Corbell ships a D3.js force-directed graph UI served via Python HTTP. Test on our server — could integrate with dashboard or run standalone. Visual map of the whole codebase. **Low priority — nice to have.**

4. **29.4 Rebuild hook.** Auto-rebuild graph after code changes. Either a post-commit hook or a cron job. Keeps the graph fresh as the codebase evolves. **Build after 29.1-29.2 are working.**

5. **29.5 Agent access.** Expose Corbell MCP tools to desk agents and local models (Phase 21). Agents can query code structure during writing — "what initiative agents exist?" "what does the voice pipeline do?" — without reading files into their context. **Build when Phase 21 is active.**

**Stack fit:** SQLite (same as claude-mem), local embeddings (MiniLM-L6-v2, ~80MB), MCP server (Claude Code native), Python (already on server). No new infrastructure.

**Priority: HIGH — low effort install, high daily value. Build in next Build/Deploy session.**

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
| NPM Package Drift | 7 packages behind. Batch update in maintenance session. |
