# GodWorld — Rollout Plan

**Status:** Active | **Last Updated:** Session 137b (2026-04-08)
**North star:** `docs/ARCHITECTURE_VISION.md` — Jarvis + persistent sessions. Everything we build points there.
**Completed phase details:** `ROLLOUT_ARCHIVE.md` — read on demand, not at boot.
**Research context:** `docs/RESEARCH.md` — findings log, evaluations, sources.
**Terminal handoffs:** Items tagged `(engine terminal)` or `(media terminal)` are handed off to that persistent chat. Research/build terminal designs; engine/sheet terminal executes code.

---

## Open Work Items

### E91 Post-Publish (S139)

- **CANONIZE: Faction full names — DONE S139.** OPP = Oakland Progressive Party, CRC = Civic Reform Coalition, IND = Independent. Fixed in engine code, Mara reference docs, and all agent files. Engine had "People's Party" — canonized to "Progressive Party" to match agents.
- **REINGEST: A's truesource → citizen profile cards** — Player data in world-data is incomplete. Reingest all A's players from truesource to citizen cards so MCP lookups return age, gender, position, contract. Mesa gender/age drift caused by missing data. HIGH.
- **FIX: validateEdition.js false positives** — 96% false positive rate in E91 (25/26). Needs: hyphenated name handling, sentence fragment filtering, citizen vs player name disambiguation, cycle reference whitelist. MEDIUM.
- **ADD: Gender to citizen briefs** — Simulation Ledger has no gender column. All angle briefs must specify gender for every citizen. Consider adding gender column to ledger long-term. MEDIUM.
- **ADD: Maurice Franklin to ledger — DONE S139.** POP-00801, Tier 3, Rockridge, retired transit supervisor, born 1978. Added to Simulation_Ledger.
- **FIX: Mayor Santana gender — DONE S139.** She/her locked in mayor IDENTITY.md + 8 civic agent files + buildDecisionQueue.js. Published editions with old pronouns are historical — canon corrects forward, not backward.

### Data & Pipeline

- **CLEANUP: Dead spreadsheet tabs — PARTIAL S139.** 6 of 8 tabs backed up and hidden (Press_Drafts, MLB_Game_Intake, NBA_Game_Intake, Sports_Calendar, Arc_Ledger, LifeHistory_Archive). **Faith_Ledger stays** — `ensureFaithLedger.js` actively writes 125 faith events. Needs a consumer (see below). **Youth_Events stays** — `youthActivities.js` actively writes, but ledger has only 1 citizen under age 20 (one 11-year-old). Engine works, population doesn't. Needs kids.
- **ADD: Faith_Ledger consumer (engine-sheet terminal)** — 125 faith events with no reader. Culture desk should receive faith activity in briefings. Either feed into `buildDeskFolders.js` or surface via MCP. Connects to 36.1 (institutions — faith orgs as first-class entities). MEDIUM.
- **FIX: Youth population gap (engine-sheet terminal)** — Youth engine (5-22 age range) finds only 21 eligible citizens, 1 actual child. Household formation engine should produce children. Either seed 20-30 children into the ledger manually, or fix `householdFormationEngine.js` to generate offspring for established households. Connects to Phase 24 (citizen life engine). MEDIUM.
- **Intake system — DONE (S137b).** Three feedback channels operational. Wiki ingest (`ingestEditionWiki.js`) + coverage ratings + citizen cards + tracker updates. Old scripts (`editionIntake.js`, `editionIntakeV3.js`, `processEditionIntake.js`) and old design docs (`INTAKE_REDESIGN.md`, `INTAKE_REDESIGN_PLAN.md`) are legacy — cleanup only.
- **PROJECT: World Memory remaining (engine-sheet terminal)** — (3) ingest key archive articles to bay-tribune, (5) historical context in desk workspaces. See `docs/WORLD_MEMORY.md`. MEDIUM.
- **Supplemental strategy (media terminal)** — One supplemental per cycle minimum. Ongoing.
- **BUILD: `/dispatch` skill (media terminal)** — New publication format: immersive scene piece. One reporter, one location, one moment. No analysis, no multi-angle coverage — you're *there*. Maria Keen at Heinold's when Horn's homer clears the wall. Carmen riding with the OARI co-responder at 2am. Produces a single article through the same print pipeline as editions/supplementals. Skill needs: reporter selection, scene brief (location + moment + mood), canon lookup for grounding, output to `output/reporters/{reporter}/articles/`, photo prompt generation. Three publication formats: editions report, supplementals explain, dispatches immerse. Source: S139 external reviews (Mika). HIGH.
- **BUILD: `/interview` skill (media terminal)** — Two modes. (1) **Paulson interview:** A reporter agent interviews Mike in character as GM Mike Paulson. Real-time back-and-forth conversation. Produces a published Q&A piece. Mags or any reporter can conduct. (2) **Agent-to-character interview:** A reporter agent interviews a simulation character — citizen, council member, A's player, civic official. Agent-to-agent conversation using voice agent profiles and citizen data from MCP. Produces a published interview transcript. Both modes output to `output/reporters/{reporter}/articles/` and go through print pipeline. Skill needs: interviewer selection, subject lookup (MCP citizen/council/roster data), conversation loop (back-and-forth turns), transcript formatting, canon grounding so questions reference real history. Source: S139 Mike Paulson. HIGH.
- **EVALUATE: Document processing pipeline (research-build terminal)** — Qianfan-OCR (Baidu, 4B params) does end-to-end document parsing: PDF/image → structured markdown in one pass. Layout analysis, table extraction, chart understanding, document QA. Could feed real civic documents (council minutes, zoning permits, budget reports) into the civic terminal as structured data. Replaces manual text extraction. MEDIUM — evaluate when civic pipeline needs real-world document input. Added S137.

### Infrastructure

- **Node.js security patch — DONE S139.** v20.20.0 → v20.20.2. Applied 2026-04-09.
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

**Additional EIC tabs identified from S139 external reviews:**
- **Coverage Gap Tracker** — Flags storylines that were active 3+ cycles ago with no recent mention. "Refrigerator test" — stories the paper dropped that citizens would still be talking about. Auto-populated from Arc_Ledger + edition content. Generates follow-up assignments. (Source: KIMI review)
- **"What We Got Wrong" Queue** — Tracks narrative predictions/profiles that didn't hold up. Player profiled as emergent who got sent down, initiative covered positively that stalled, citizen who appeared in 3 stories then vanished. Feeds a rotating accountability section every 3rd edition. (Source: KIMI review)
- **Correction Log** — When the paper gets something wrong, track the error, the correction, and whether citizens referenced the error in subsequent Letters. Corrections become narrative material, not just errata. Connects to folk memory (27.9). (Source: KIMI review)
- **Arc Dashboard** — When Phase 37 (arc state machines) is built, surface arc phase + tension + linked citizens here so Mags sees story trajectory at a glance during edition planning. (Source: Grok review)

These tabs turn the EIC sheet from a production tracker into an editorial intelligence system. Many external review suggestions (coverage gaps, corrections, accountability sections, arc awareness) converge on this same tool — Mags needs a sheet that shows what the paper is missing, not just what it's producing.

**33.13 Sandcastle proof-of-concept — EVALUATE (research-build terminal).**
Run one reporter agent via Sandcastle in a Docker container with real shell access and Supermemory queries. Requires Docker on server. See `docs/RESEARCH.md` S132 Sandcastle entry.

**33.14 Tool-restricted reporter agents — BUILD (media terminal).**
Add `allowed-tools: ["Read", "Grep", "Glob"]` to reporter agent skill frontmatter. Reporters get read-only during writing. Only compile/publish gets write access. From everything-claude-code's hierarchical delegation pattern.

**33.15 Iterative retrieval for canon — DESIGN (research-build terminal) → BUILD (media terminal).**
3-cycle search-evaluate-refine pattern for reporters accessing canon. Score results 0-1, stop at 3+ files scoring 0.7+. Replaces context dumps. From everything-claude-code.

**33.16 World-data citizen cards — DONE S137b.**
`scripts/buildCitizenCards.js` — reads Simulation_Ledger (POPID, First, Last, Tier, RoleType, BirthYear, TraitProfile, Neighborhood, CitizenBio), searches bay-tribune for appearances, compiles per-citizen card, writes to world-data Supermemory. Cards compound with each edition — wiki ingest adds memories, citizen cards synthesize them. Tier 1 (17), Tier 2 (60) written. Tier 3-4 in progress. Supports `--tier`, `--name`, `--limit` filters. GodWorld MCP `lookup_citizen` queries these cards. **Remaining:** businesses (52), neighborhoods (17), faith/cultural (51) — separate scripts needed.

**33.17 Missing trait profiles — DESIGN (research-build terminal) → BUILD (engine-sheet terminal).**
343 of 685 citizens have no TraitProfile. Build a script that generates Archetype/Tone/Motifs/Traits from LifeHistory events and engine data. Tags are literary instructions — bounded personality earned from simulation, not assigned. Same philosophy as bounded traits on agents but tag-based instead of numeric.

**33.18 Clean stale world-data memories — BUILD (engine-sheet terminal).**
S131 document ingest created fragmented memories. Replace with Memories API records. Remove old fragments after new memories are confirmed searchable.

**33.19 Physical details in citizen cards (S139, from DeepSeek review).**
Reporters invent physical details per article — a limp, a raspy voice, a nervous habit. But these aren't stored or shared. If Carmen writes "Marcus has a limp" in E88, Maria doesn't know that in E91. Add a `PhysicalDetails` section to citizen cards: gait, voice quality, distinguishing habits, sensory details. Generated once per citizen (Tier 1-2 first), stored in world-data, available to all reporters via MCP `lookup_citizen`. Solves cross-edition consistency for character descriptions. **Implementation:** Extend `buildCitizenCards.js` to include a physical details block. For existing Tier 1-2 citizens, mine bay-tribune for any physical descriptions already published and canonize them. For citizens without published descriptions, generate from TraitProfile + occupation + age. **Connects to:** 33.17 (trait profiles feed physical detail generation), Phase 35.1 (wiki ingest should capture physical descriptions from new articles). **Priority: LOW — quality-of-life improvement. Build after 33.17 (trait profiles) since traits inform physical details.**

---

### Phase 31: Canon-Grounded Briefings — DONE (S134, designed into pipeline v2)

Incorporated into `/write-edition` Step 3: verify citizens + write angle briefs. Each reporter gets `output/reporters/{reporter}/c{XX}_brief.md` with verified citizens, canon history from bay-tribune, and atomic topic checkout. Civic production log feeds in at Step 1. World summary built from Riley_Digest + Sports Feed + civic log. The manual bridge IS the pipeline now.

**End state:** Phase 21.2 (Canon Grounding MCP) automates this — agents search bay-tribune themselves during writing. Until then, Mags does the research at Step 3.

---

### Phase 2.2: Desk Packet Query Interface — SUPERSEDED BY MCP (S137b)

**Replaced by GodWorld MCP server (Phase 21.2).** The MCP provides direct tool access to all data agents need — citizen lookup, initiative state, canon search, roster, neighborhoods. Agents call MCP tools instead of curl or file reading. No further work needed on this phase.

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

2. **21.2 Canon Grounding MCP — DONE S137b.** `scripts/godworld-mcp.py` — FastMCP server exposing 10 tools: lookup_citizen, lookup_initiative, search_canon, search_world, search_articles, get_roster, get_neighborhood, get_council_member, get_domain_ratings. Backs onto Supermemory (bay-tribune + world-data), Dashboard API, truesource. Registered in `.mcp.json`. ~250x token reduction per citizen lookup vs reading truesource. Available to all Claude Code sessions, agents, and future local models. **HTTP mode available for remote agents:** `python3 scripts/godworld-mcp.py --http 3032`.

3. **21.3 Local photo prompt generation.** The photo prompt conversion step (article → image prompt) doesn't need Anthropic tokens. A local Qwen 3.5 9B can run an "art director" role that produces structured JSON (thesis, mood, motifs, composition, image_prompt) from article text. Pattern from hn_local_image (github.com/ivanfioravanti/hn_local_image) — intermediate art direction step before image generation. Could also run the image generation itself locally via MLX/FLUX models on Apple Silicon if any work moves to Mike's laptop. See `docs/RESEARCH.md` S134 entry.

**Depends on:** Phase 27 (agent autonomy) may change what "routine" means — if culture desk gets creative latitude, it may need a stronger model.

### Phase 23: Cross-AI Feedback (selected open items)

- **23.2 Entity Registry:** Partial — Rhea checks added, full `entity-registry.json` not built.
- **23.6 Jax Caldera Voice:** Not started. Low effort merge.

### Phase 24: Citizen Life Engine — NOT STARTED

Rich context-aware life histories. 24.1 MEDIA mode DONE (S94). Remaining: 24.2 Tier 1-2 event caps, 24.3 Context-aware events, 24.4 Daily simulation, 24.5 Sports transactions.

**24.6 Event bands — narrative taxonomy (S139, from Codex review).**
Tag each life history event by narrative function: Routine (daily habits, commute), Pivot (turning point — new job, injury, move), Spillover (city-level event affects this person), Contribution (citizen action — organizing, volunteering), Reflection (opinion shift, trust change). Adds narrative weight differentiation — not all events are equal. Helps `compressLifeHistory.js` produce sharper profiles and helps reporters pick the interesting moments from a citizen's history. Implementation: new column in LifeHistory_Log or prefix convention in EventTag. No schema breakage — additive.

**24.7 Neighborhood context anchors (S139, from Codex review).**
Force a local anchor per life event — a specific intersection, venue, service, or community org. Events like "got a promotion" become "got a promotion at DataWave Systems on Broadway." Grounds life history in Oakland geography using existing neighborhood and business data. Reduces generic text, increases local realism. Implementation: engine event generators reference Neighborhood_Map and Business sheet when composing EventText. Connects to 36.1 (institutions) and 36.2 (business lifecycles) when those are built.

**24.8 Citizen internal vectors — desires, fears, motivations (S139, from DeepSeek review).**
The bounded trait system (S133) tells reporters *how* a citizen sounds. It doesn't tell the engine *what* a citizen wants. Add hidden internal vectors per citizen: a secret desire (open a food truck, get elected, leave Oakland), a core fear (ending up like a parent, losing the house, being forgotten), a private shame, a quiet pride. These aren't published to the media room by default — they drive engine decisions. A citizen with "open a food truck" desire has higher career-change probability. A citizen with "losing the house" fear reacts more strongly to rent pressure events. Makes citizen behavior character-driven rather than random. **Implementation:** New columns in Simulation_Ledger or a separate Citizen_Motivations sheet. Populated initially for Tier 1-2 citizens (77 people). Engine life-event generators read motivations to weight outcomes. `compressLifeHistory.js` can surface motivations that have been acted on. **Connects to:** Bounded traits (literary surface), Phase 36.3 (neighborhood trends affect fear-driven citizens), Phase 27.4 (citizen autonomy — motivations become decision inputs). **Priority: MEDIUM — the natural next step for the trait system. Design schema when Phase 24 work begins.**

**24.9 Relationship decay & maintenance (S139, from DeepSeek review).**
Relationships exist in the engine but don't require upkeep. Add decay mechanics: relationships lose strength over cycles without interaction. Different bond types decay at different rates — family ties are durable, workplace bonds fade fast after a job change, neighbor bonds depend on proximity. When a relationship drops below a threshold after being strong, generate a "drift" event (old friends who lost touch, former neighbors who stopped calling). When decayed relationships re-engage, generate a "reconnection" event. Creates organic narrative arcs without scripting them. **Implementation:** New function in Phase 5 (citizens) that runs each cycle. Reads relationship records + LifeHistory_Log for recent interactions. Decrements strength based on bond type and cycles since last contact. Drift/reconnection events written to LifeHistory_Log. **Connects to:** Phase 24.8 (a citizen's fear of "dying alone" amplifies relationship maintenance behavior), Phase 24.6 (drift events tagged as "Pivot" band). **Priority: MEDIUM — clean standalone system. Build after relationship data is confirmed healthy.**

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

**The feedback loop — OPERATIONAL (S137b):**
- Engine runs → city-hall decides → media publishes → engine reads all → city reacts next cycle

**Three channels (ALL BUILT S137b):**
1. Initiative tracker ← city-hall voices via `applyTrackerUpdates.js`
2. Sports feed ← Mike (6 texture columns) via `applySportsFeedTriggers_`
3. Coverage ratings ← auto-rater via `rateEditionCoverage.js` → `applyEditionCoverageEffects_`

**Post-publish pipeline (ALL BUILT S137b):** `ingestEdition.js` (raw text → bay-tribune), `ingestEditionWiki.js` (per-entity records → bay-tribune), `buildCitizenCards.js` (citizen profiles → world-data).

**Buildable pieces (ordered):**

1. **27.1 Intake pipeline — DONE S137b.** All three feedback channels operational. Wiki ingest writes per-entity records. Coverage ratings applied in C91. Post-publish steps documented in write-edition Step 9.

2. **27.2 Agent creative latitude.** Desk agents currently stick to packet data. Give them explicit permission and structured room to invent details that feel right for the data — a restaurant name, a neighborhood event, a citizen opinion the engine didn't generate. RD lenses (DONE S113) are the seed. Next step: agents told their inventions become canon.

3. **27.3 Voice agent invention.** Voice agents currently pick from `pending_decisions.md` menus. Allow them to propose decisions not on the menu — a Mayor who calls an emergency session nobody planned, a council member who introduces an amendment. Write-back via `applyTrackerUpdates.js` already exists.

4. **27.4 Citizen autonomy (long-term).** Citizens as autonomous agents with their own decision-making, not spreadsheet rows processed by formulas. A citizen who decides to move to Temescal, starts a petition, forms an opinion. Connects to Phase 24 but goes further — citizens aren't just experiencing life events, they're making choices.

5. **27.5 Platform mode (speculative).** External users connect their own AI agents as city residents via MCP. The Tribune covers what they do. See `memory/project_city-for-bots-pivot.md`. This is the SpaceMolt model applied to a city with journalism.

**Priority:** HIGH — this is the design direction for what GodWorld becomes next. 27.1 DONE S137b. 27.2-27.3 DONE S114 (prompt changes live). 27.4-27.5 are architecture-level.

6. **27.7 Delayed-fuse narrative seeds (S139, from DeepSeek review).** The engine generates events that resolve within the same cycle. This adds a *plant-and-payoff* mechanic: low-signal events tagged with an escalation horizon (e.g., "foundation cracks noticed at 14th & Broadway" in C92 → "sinkhole closes intersection" in C98). Distinct from existing `calendarStorySeeds.js`, which generates per-cycle story prompts for reporters. Delayed-fuse seeds are engine-level facts that persist in a tracking sheet, dormant until their trigger cycle arrives, then escalate into full events. Creates multi-cycle narrative arcs the engine doesn't currently produce. **Implementation:** New sheet `Narrative_Seeds` (SeedID, PlantedCycle, TriggerCycle, Domain, Severity, Description, Status). New engine function reads seeds each cycle, checks if any have reached their trigger, promotes triggered seeds to `worldEvents`. Planting function runs during event generation phases, probabilistically creating seeds based on city state. **Connects to:** Phase 24 (citizen life events could plant personal seeds), Phase 36.1 (institutions could plant institutional seeds — hospital budget shortfall → staffing crisis 5 cycles later). **Priority: MEDIUM — genuine narrative gap. Design the schema first, build when Phase 24 is active.**

7. **27.8 Weather as world texture (S139, from DeepSeek review — PARTIALLY BUILT).** The weather system is more developed than the reviewer knew: `applyWeatherModel.js` already generates `S.weather`, `S.weatherMood`, `S.weatherEvents`, `S.weatherTracking`, and `S.neighborhoodWeather` (per-neighborhood variation). Weather feeds into 25+ downstream functions including seasonal weights, life history, nightlife, evening simulation, and story hooks. `recordCycleWeather.js` persists to `Cycle_Weather` sheet. **What's missing:** (1) Seasonal traditions that citizens anticipate (First Friday in summer vs winter, Lake Merritt in fog season). (2) Weather-driven commerce effects (rain kills foot traffic in commercial districts, heat drives ice cream/beer sales). (3) Multi-cycle weather patterns (3 cycles of rain → flood risk, drought → fire season anxiety). These connect weather to the economic layer and neighborhood trends (Phase 36.3). **Priority: LOW — the system works. These are depth additions, not structural gaps.**

8. **27.9 Folk memory — neighborhood-filtered collective recall (S139, from Gemini review).** The simulation tracks what happened. It doesn't track what people *think* happened. Add a collective memory layer where neighborhoods remember the same event differently based on demographics, economic position, and political alignment. Fruitvale remembers the transit vote as a betrayal; Rockridge remembers it as fiscal responsibility. The Letters desk draws from neighborhood-filtered memory to generate genuinely conflicting citizen perspectives rather than differently-worded versions of the same fact. **Implementation:** After each cycle, a new function generates 2-3 "folk memory" records per major event — short neighborhood-perspective summaries stored in a `Folk_Memory` sheet or appended to neighborhood state. Keyed by event + neighborhood. Reporters and Letters desk receive these as part of their briefing data. Over time, folk memories compound — a neighborhood that felt betrayed by 3 consecutive council votes develops a persistent distrust narrative. **Connects to:** Phase 36.3 (neighborhood trend momentum — folk memory feeds sentiment), Phase 24.8 (citizen motivations shaped by collective neighborhood memory), Phase 35 (wiki could track how events are remembered differently across the city). **Priority: MEDIUM — genuinely original idea. No other reviewer proposed this. Buildable as a post-cycle function once neighborhood state tracking is stable.**

9. **27.10 Negative feedback loops — corrective pressure for golden eras (S139, from Grok review).** The feedback loop (S137b) moves approval ratings and neighborhood effects based on coverage, but it doesn't prevent runaway positive spirals. High approval + winning sports team + steady fund disbursement + rising economic indicators = a smooth ride with no friction. Real cities don't work that way. Add soft ceilings: rapid development spawns housing pressure and displacement anxiety. High approval makes politicians overreach or become complacent (scandal probability rises with sustained high approval). Winning sports teams breed ticket price increases that squeeze lower-income fans. Steady economic growth attracts outside investment that disrupts existing businesses. These aren't random shocks — they're *consequences of success* that create organic counter-pressure. **Implementation:** New engine function in Phase 2 or Phase 3 that reads sustained positive indicators (3+ cycles of rising approval, 5+ cycles of economic growth, etc.) and generates corrective pressure events. Feeds into `worldEvents` and `neighborhoodEffects`. Tunable thresholds so correction isn't guaranteed but becomes increasingly likely. **Connects to:** Phase 36.3 (neighborhood trends — success pressure drives displacement), Phase 36.2 (business lifecycles — growth attracts competition that threatens incumbents), Phase 27.7 (narrative seeds — corrective events can be planted as slow-fuse consequences of prosperity). **Priority: HIGH — this is a balance mechanic the engine genuinely needs. Without it, long runs flatten into comfortable stability. Design thresholds first, build when feedback loop data from C91+ confirms the golden-era pattern.**

10. **27.6 Standalone workflows Voice agents and initiative agents currently run inside `/write-edition`. City hall shouldn't wait for the newspaper. Build a `/run-city-hall` standalone workflow that runs voice agents + decision queues + tracker writeback independently of edition production. Desk agents read what city hall already did. This pattern generalizes — any system that acts autonomously (city hall, citizen life events, economic cycles) can be a standalone workflow that runs on its own schedule. The edition pipeline becomes a reader, not an orchestrator. **Post-E89 — evaluate after seeing what voice agents do with 27.3 off-menu authority.**

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

### Phase 32: World-Data Container — PARTIAL (S137b)

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
- **Phase 27.1 (Intake pipeline — DONE S137b)** feedback loop operational, wiki ingest writes to world-data

**Priority: HIGH — build 32.1 (test ingest) in next Build session. The test determines the architecture.**

---

### Phase 35: Knowledge Wiki — Compile Once, Query Forever (S137b) — PARTIAL

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

### Phase 36: World Depth — Institutions, Business Lifecycles, Neighborhood Trends (S139) — NOT STARTED

**Source:** External review ("Code Pilot", 2026-04-09). 10 suggestions evaluated — 3 noise (already built), 4 partial/interesting, 3 genuinely new. These are the items with real value.

**Why this matters:** The engine models citizens and neighborhoods well, but the layer between them — institutions, businesses, economic momentum — is thin. Citizens work at businesses that never change. Neighborhoods have mood but not trajectory. Schools and hospitals exist in articles but not in the engine. Deepening this layer makes the city feel like a city.

**36.1 Institution simulation — DESIGN (research-build terminal).**
Schools, hospitals, unions, churches, nonprofits, developer firms as first-class ledger entities. Each institution owns: budget, reputation, staffing level, neighborhood, alliances, agenda. Institutions generate pressure on events and citizens — a hospital closure affects health outcomes, a union contract affects wages, a school rating affects family migration. Engine phases read institutional state the way they already read citizen state.

**Connects to:** Phase 24 (Citizen Life Engine — context-aware events could reference institutions), Phase 27.4 (citizen autonomy — citizens choose based on institutional quality), Phase 33.16 (remaining entity cards — institutions need cards too).

**Build path:** (1) Design institution schema + ledger tab. (2) Seed 10-15 institutions from existing canon (Temescal Health Center, Oakland schools mentioned in articles, faith orgs already in the ledger). (3) Add institution state reads to relevant engine phases. (4) Institutions evolve each cycle based on funding, events, council decisions.

**Priority: MEDIUM — high realism gain but significant engine work. Design first, build when citizen life engine (Phase 24) is active.**

**36.2 Business lifecycles — DESIGN (research-build terminal) → BUILD (engine-sheet terminal).**
Businesses currently exist as static rows in the Business sheet (52 entries). They never open, close, expand, relocate, unionize, or get acquired. Add lifecycle events: new business opens in a neighborhood (driven by economic indicators), existing business expands or contracts (driven by neighborhood trend + sector health), business fails (driven by sustained negative pressure), business relocates (neighborhood too expensive → moves to cheaper district). Citizens work there, neighborhoods depend on them, the Tribune covers them.

**Connects to:** Phase 32 (world-data container — business registry already spec'd), Phase 14 (economic parameters — business health feeds from these), 36.3 (neighborhood trends drive business decisions and vice versa).

**Build path:** (1) Add lifecycle columns to Business sheet (Status, Founded, Revenue_Trend, Employee_Count_Delta). (2) New engine function in economic phase that evaluates business health each cycle. (3) Business events feed into Story_Hooks for media coverage. (4) Business failures/openings affect neighborhood economic indicators.

**Priority: MEDIUM — natural extension of existing economic layer. Lower complexity than 36.1. Could build standalone.**

**36.3 Neighborhood trend momentum — DESIGN (research-build terminal) → BUILD (engine-sheet terminal).**
Neighborhoods already have mood, demographics, and economic indicators. What's missing is *trajectory* — is Temescal heating up or cooling off? Add trend momentum: rent pressure (rising/stable/falling), displacement risk (low/medium/high/critical), transit access score, commercial activity index. Each cycle, trends compound — a neighborhood heating up for 3 cycles starts seeing displacement. Citizens migrate in response — families leave high-displacement neighborhoods, young professionals move toward heating neighborhoods. The engine already tracks neighborhood mood; this adds directionality.

**Connects to:** Phase 24 (citizen life engine — migration as a life event), 36.2 (business lifecycles respond to neighborhood trends), Phase 27.9 (folk memory — media coverage of gentrification affects neighborhood perception).

**Build path:** (1) Add trend columns to Neighborhood_Map or Population_Stats (RentPressure, DisplacementRisk, TrendMomentum, CommercialActivity). (2) New engine function that calculates trend from 3-cycle rolling window of economic indicators. (3) Citizen migration logic reads trend data. (4) Displacement events generate Story_Hooks.

**Priority: MEDIUM — cleanest of the three to build. Extends existing neighborhood engine with minimal new schema. Good candidate for first implementation.**

**36.4 Informal economy & mutual aid networks (S139, from Gemini review).**
The economic layer tracks formal businesses and employment. It doesn't track the informal economy: neighbors watching each other's kids, tool libraries, community fridges, under-the-table repair work, bartering between small vendors. In prosperity-era Oakland, this isn't a "shadow economy" — it's community texture. Lower-income neighborhoods have denser mutual aid networks; wealthier neighborhoods have less. These networks act as economic buffers — when rent pressure rises (36.3), neighborhoods with strong mutual aid absorb the shock better. **Implementation:** Per-neighborhood `MutualAidStrength` score (0-1) influenced by demographics, community engagement (`cityDynamics.communityEngagement`), and faith/cultural org density. High mutual aid dampens negative economic effects. Engine events can reference mutual aid ("neighbors organized a fundraiser for displaced tenants"). Reporters get mutual aid state in desk briefings as neighborhood texture. **Connects to:** Phase 36.1 (faith orgs and nonprofits as institutions that anchor mutual aid), Phase 36.3 (mutual aid as buffer against displacement), Phase 24.7 (neighborhood context anchors — mutual aid events grounded in specific places). **Priority: LOW — world texture, not structural. Build when neighborhood trend system (36.3) is active.**

---

### Phase 37: Arc State Machines — Structured Multi-Cycle Story Arcs (S139, from Grok review) — NOT STARTED

**Source:** Grok review (2026-04-09). The engine tracks arcs in Arc_Ledger and Initiative_Tracker, but arcs don't have explicit structure. They're labels on events, not story trajectories.

**The gap:** An arc like "OARI rollout" or "Okoro power consolidation" currently advances because events happen to reference it. There's no tension meter, no phase progression, no failure condition. The arc doesn't *know* if it's in setup, escalation, crisis, or resolution. Reporters decide that editorially. This works at 91 cycles but won't scale — arcs drift, overlap, or stall without structure.

**What this adds:** First-class arc objects with state machines. Each arc has:
- **Phases:** Setup → Development → Escalation → Crisis → Resolution (or Failure) → **Legacy**
- **Tension meter:** 0-100, influenced by events, council votes, citizen actions, coverage
- **Advancement conditions:** What moves the arc to the next phase (e.g., "3 council members publicly oppose" → escalation)
- **Failure conditions:** What kills the arc — but failures **pivot, not terminate** ("failing forward"). OARI dispatch delay doesn't kill the arc — it spawns a "pilot friction" sub-arc. Failure states redirect the story.
- **Legacy phase:** Resolved arcs don't vanish — they linger for 3-10 cycles as reputation, callback material, and context. "OARI's 84% success rate" becomes a recurring citation in future civic coverage. Legacy arcs influence new arcs in the same domain.
- **Cross-arc pollination:** Arcs feed each other's tension. NBA bid gains +15 tension if A's streak arc is in Climax. Creates emergent drama without scripting it.
- **Arc density cap:** Max 8 active major arcs to prevent overload. Citizen-scale arcs stay lightweight (status + closure only). Prioritize by tension or editorial interest.
- **Cooldown:** Arcs that resolve or fail enter cooldown before spawning sequel arcs

**Implementation:**
1. **37.1 Arc schema.** New columns in Arc_Ledger or a dedicated Arc_States sheet: ArcID, Title, Type (civic/sports/personal/cross-cutting), CurrentPhase, TensionScore, Momentum (-10 to +10), LinkedCitizens (POP-IDs), AdvanceCondition, FailCondition, CyclesInPhase, LastPhaseChange, LegacyCycles, MediaHooks (JSON). DESIGN.
2. **37.2 Arc evaluator function.** New engine function (Phase 3 or Phase 6) that reads arc state + recent events + initiative status, evaluates advance/fail conditions, updates phase and tension. Writes phase transitions to `worldEvents` as high-priority story hooks. Includes cross-arc pollination pass (arcs in same domain or sharing citizens influence each other's tension).
3. **37.3 Arc-aware briefings.** `buildDeskFolders.js` includes arc phase, tension, and media hooks in reporter briefs. A reporter covering OARI knows it's in "Escalation" at tension 72, not just that it exists. Changes how they frame the story.
4. **37.4 Arc seeding from narrative seeds.** When a delayed-fuse seed (27.7) triggers, it can spawn a new arc in Setup phase rather than just a standalone event. Seeds become arc origins.
5. **37.5 Legacy integration.** Resolved arcs enter Legacy phase. Legacy arcs are read-only but visible to reporters and influence new arcs in the same domain. After LegacyCycles expires, arc moves to archive. `compressLifeHistory.js` can reference legacy arcs when building citizen profiles.

**Design details (from Grok deep-dive, 2026-04-09):** Tension update logic runs one pass over active arcs per cycle. Base change ±5 from neighborhood mood/weather/season. Modifiers from citizen bonds (+10 positive, -15 failure event, +8 sports tie-in). Threshold triggers: ≥80 forces milestone event, ≤20 triggers decay risk (arc fizzles or pivots). Tension ≥95 forces crisis event with cooldown to prevent every cycle being apocalyptic. Orphaned arcs (all linked citizens gone) auto-decay to Legacy.

**Connects to:** Phase 27.7 (narrative seeds spawn arcs), Phase 27.10 (negative feedback loops generate arc tension), Phase 24.8 (citizen motivations interact with arc phase — a citizen whose desire is "stop Baylight" has higher agency during Escalation phase), Phase 27.9 (folk memory — how neighborhoods remember resolved arcs feeds Legacy phase).

**Priority: MEDIUM — structural improvement to multi-cycle storytelling. Design the schema first (37.1). Build after 27.7 (narrative seeds) since seeds feed arcs.**

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
| Overture (visual agent planning) | Mike can see plans visually instead of text walls → install when accessible from Remote Control or web dashboard. github.com/SixHq/Overture. MCP server, React Flow canvas, localhost:3031. Source: S137b |
