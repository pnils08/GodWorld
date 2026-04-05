# GodWorld — Rollout Plan

**Status:** Active | **Last Updated:** Session 120 (2026-03-27)
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
- **REDESIGN: Intake system rebuild** — `editionIntake.js` has two known bugs (cycle detection, section parser) but the whole system needs redesign to better support journalism intake. 10 new citizens from education supplemental are parked in `Citizen_Usage_Intake` (status: pending) — route through new jlibs-based intake when ready. Spec draft: `docs/engine/INTAKE_REDESIGN.md` (30% — needs Mike's input). **Priority: Post-E89 target.** See also Phase 27.1.
- ~~**FIX: gradeEdition.js supplemental support**~~ — **DONE S116.** Supplemental section headers, desk mapping, dynamic desk lists, separate output files (`grades_c{XX}_supplemental_{topic}.json`), type-aware deduplication in `edition_scores.json`. Tested against both C87 baylight and C88 education supplementals.
- ~~**UPGRADE: Structured critique in gradeEdition.js**~~ — **DONE S113.** 3-signal feedback (reasoning, strengths/weaknesses, directive) per desk and reporter. Flows through `grades_c{XX}.json` → `buildDeskFolders.js` → `previous_grades.md` → agents read at boot. Based on Reagent + RLCF research.
- ~~**FEATURE: RD diversity injection for agents**~~ — **DONE S113.** 20 creative lenses for desk agents (buildDeskFolders.js), 10 political lenses for voice agents (buildVoiceWorkspaces.js). Random per run. Based on Harvard Recoding-Decoding (arxiv 2603.19519).

- ~~**FIX: Citizen freshness weighting in buildDeskPackets.js**~~ — **DONE S114.** buildDeskPackets.js v2.4 sorts by freshness. 425 citizens with zero appearances rank first. Briefings tag [FRESH]. buildPopidArticleIndex.js writes JSON usage counts.

- ~~**FEATURE: Photo QA step in edition pipeline.**~~ — **DONE S116.** `scripts/photoQA.js` — Claude Haiku Vision evaluates each photo against article context. Pass/flag/fail verdicts, QA report to `qa_report.json`. ~4K tokens per photo. Tested against E88 (2 photos) and education supplemental (3 photos). Fits between Step 15 and Step 16.

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

**~~B. Dynamic Context Injection~~** — **DONE S115.** Added `!`command`` injection to write-edition (packet manifest, production log, desk folder status) and write-supplemental (trigger list, recent supplementals). Desk skills don't benefit — agents already read their own workspace files via the agent loop. The injection wins are in orchestrator skills, not worker skills.

**~~C. Prompt De-escalation~~** — **DONE S115.** Scanned all agent SKILL.md and RULES.md files. MUST/NEVER usage is all editorial guardrails (factual accuracy, fourth-wall, journalism rules) — NOT tool-triggering language. No changes needed. No prefilled responses found.

**~~D. Thinking Migration~~** — **DONE S115.** No migration needed — we never used `budget_tokens` directly. Claude Code uses adaptive thinking automatically. The `effort` frontmatter field (set in section A) IS the thinking control. Interleaved thinking is automatic with Opus 4.6. `display: "omitted"` remains a future optimization for production runs.

**~~E. Skill Structure~~** — **DONE S115 (audit complete, no critical issues).**
- Line counts: all under 500. `write-supplemental` at 473 is highest — approaching but OK.
- Descriptions: all third person, functional. Desk descriptions are thin but `disable-model-invocation` means they're menu labels, not discovery triggers.
- ~~Compaction survival prompt~~ — DONE.
- **Remaining (LOW):** subagent guidance (evaluate after E89), description budget check (run `/context`), skill evaluations (3+ test scenarios, do when rewriting skills).

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

### Phase 33: Riley Integration & Hardening (S132) — IN PROGRESS

**Source:** S132 Riley audit, Sandcastle research, Everything Claude Code patterns. See `docs/RESEARCH.md` S132 entries, `riley/RILEY_PLAN.md`.

**33.1 Config protection hook — STEAL NOW.**
PreToolUse hook blocks edits to PERSISTENCE.md, identity.md, CLAUDE.md. From everything-claude-code's config-protection pattern.

**33.2 PreCompact state save — STEAL NOW.**
Hook dumps current pipeline state before compaction for recovery. Writes room, active task, and key state to `.claude/state/pre-compact-state.json`.

**33.3 Strategic compaction reminder — STEAL NOW.**
Counter-based PreToolUse hook suggests `/compact` after N tool calls at task boundaries. Prevents random mid-work compaction.

**33.4 City-hall skill rewrite — DONE S133.**
Voices govern (Mayor first, then parallel). Projects hallucinate world details within political frame. City Clerk becomes closer/verifier. No more 7-tab data dumps — IDENTITY.md + pending_decisions.md only. Mags and Mike are the sifters.

**33.5 Bounded trait system — DONE S133.**
8 traits (1-10 scale) added to all 11 civic agents: Institutional Loyalty, Risk Tolerance, Public Profile, Civic Trust, Pragmatism, Urgency, Empathy, Territorial. Based on Hennepin (Ryan 2018), Dwarf Fortress, Victoria 3. Traits drive decisions — agents read traits before options. Verified against Oakland_Political_System_v1.1.

**33.6 City Clerk verification script — BUILD.**
Node script (not an agent) that checks: voice outputs exist, project outputs exist, tracker updates applied, production log complete. `scripts/verifyCityHall.js`. Output: `output/city-civic-database/clerk_audit_c{XX}.json`.

**33.7 Write-edition rewrite — DONE S133.**
City-hall separated. Sift-first architecture. 9 individual reporter agents (Carmen, P Slayer, Anthony, Hal, Jordan, Maria, Jax, Mezran, Letters). Story-driven layout — no fixed sections, no filler. Input stack: media production log, civic production log, Riley_Digest (3 cycles), Oakland Sports Feed (3 cycles). Bypass buildDeskPackets 22-tab dump and Media_Briefing. Reporter bounded traits (8 dimensions). Chicago moved to supplemental-only. Paperclip patterns: heartbeat model, atomic topic checkout, structured result capture.

**33.8 Session evaluation hook — BUILD NEXT.**
Stop hook analyzes transcript at session end for extractable patterns — what caused fabrication, what Mara caught, what worked. Builds editorial memory automatically. From everything-claude-code.

**33.9 Session ID persistence for reporters — BUILD NEXT.**
Persist Claude Code session IDs between runs so reporter agents retain context across cycles. From Paperclip.

**33.10 Budget caps per agent — BUILD NEXT.**
Monthly token tracking per agent role. Prevents one broken reporter from burning the whole Anthropic bill. From Paperclip.

**33.11 Conditional hooks — BUILD NEXT.**
Add `if` field (permission rule syntax) to existing hooks so they fire only for specific operations. Claude Code v2.1.86 feature.

**33.12 Mags EIC Sheet Environment — EVALUATE.**
New spreadsheet owned by service account. Tabs: Editorial Queue, Desk Packets, Canon Briefs, Edition Tracker, Grading. Reads from Riley's sheets, writes to own space. No Riley triggers. See `riley/RILEY_PLAN.md` for full spec.

**33.13 Sandcastle proof-of-concept — EVALUATE.**
Run one reporter agent via Sandcastle in a Docker container with real shell access and Supermemory queries. Requires Docker on server. See `docs/RESEARCH.md` S132 Sandcastle entry.

**33.14 Tool-restricted reporter agents — BUILD NEXT.**
Add `allowed-tools: ["Read", "Grep", "Glob"]` to reporter agent skill frontmatter. Reporters get read-only during writing. Only compile/publish gets write access. From everything-claude-code's hierarchical delegation pattern.

**33.15 Iterative retrieval for canon — BUILD NEXT.**
3-cycle search-evaluate-refine pattern for reporters accessing canon. Score results 0-1, stop at 3+ files scoring 0.7+. Replaces context dumps. From everything-claude-code.

---

### Phase 31: Canon-Grounded Briefings — IMMEDIATE PRIORITY

**Goal:** Until agents can search Supermemory themselves, Mags does the research upfront and feeds canon context into agent briefings. Agents get the world's history before they write, not after they guess.

**Why this exists:** S131 proof of concept. Claude.ai with bay-tribune MCP access produced five C89 supplementals where citizens cross storylines, arcs build across desks, and the world feels like one city. Our desk agents, working from isolated packets, produce competent but disconnected section copy. The gap is NOT writing quality — it's access to canon. These five supplementals are now published canon (ingested to bay-tribune, saved to `editions/`).

**The interim workflow (until agents get direct Supermemory access):**

1. **Mags searches bay-tribune** for every major story, citizen, and arc relevant to the cycle
2. **Mags builds angle briefs** — not flat data dumps, but researched prep docs with: archive quotes, returning citizen history, cross-desk connections, identified story angles, journalist assignment recommendations. Reference: `output/desk-packets/aitken_profile_prep_c89.txt`
3. **Angle briefs go into desk agent workspaces** alongside existing packets — agents read the research before writing
4. **Story structure is defined upfront** — which citizens return, which arcs cross, where the threads connect. This is editorial direction, not micromanagement.
5. **Agent gets creative autonomy WITHIN the structure** — how the story is told, what details emerge, the voice, the craft. Define the what. Let the agent own the how.

**What changes in `buildDeskFolders.js`:** Add an `angle_briefs/` directory to each desk workspace. Mags populates it manually pre-run. Agents are instructed to read angle briefs first, packets second.

**What this replaces:** The current model where agents see only their own desk's packet data and invent connections. Agents should DISCOVER connections in the brief, not fabricate them.

**The five C89 supplementals as exemplars:**
- Civic: OARI Day 45 — returning citizens (Castillo Day 35 callback, Edmonds prediction, Meeks expansion concern)
- Culture: Keane academy — cross-desk citizens (Nelson from OARI, Hayes from Stabilization Fund, Clark from everywhere)
- Business: Baylight workforce — Jax Caldera bar count framing, sub-tier loophole investigation
- Sports: Quintero profile — Darius Clark connecting baseball to Stabilization Fund to neighborhood
- Culture: Aitken profile — political seeds planted from council meeting attendance, Baylight workforce thread

**End state:** Phase 21.2 (Canon Grounding MCP) makes this workflow automatic — agents search bay-tribune themselves during writing. Phase 31 is the manual bridge that gets us the same quality output NOW.

**Priority: HIGHEST — this is the single biggest quality lever we have. Do this for C90.**

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

4. **26.2.4 Agent identity mutation (HyperAgent pattern).** Agents modify their own IDENTITY.md based on what produces better output. After 5+ editions with grade history, a meta-agent reads the grade trends, the effective directives (26.2.1), the winning lenses (26.2.2), and rewrites the IDENTITY.md to encode the patterns that work. This is the hyperagent concept from Meta Research (arXiv 2603.19461, March 2026) — the improvement mechanism itself becomes editable. **Implementation:** New script `scripts/evolveAgentIdentity.js` reads grade_history + exemplars + directive tracking, proposes IDENTITY.md patches, human approves. Full autonomy (agent rewrites itself without approval) is Phase 27.4+ territory. See `docs/RESEARCH.md` S120 HyperAgents entry.

**Evaluation metric (from S131 research):** Use pass@k scoring for desk agent output. Run a desk agent k times, take the best. At k=3, a 70% baseline jumps to 91% success rate. Cheap for routine desks (culture, letters, business). Expensive for complex desks — reserve for when quality gates fail on first pass. pass^k (ALL must succeed) useful for canon-critical civic/sports output where consistency matters.

**Priority:** MEDIUM-HIGH — raised from MEDIUM after HyperAgents research. Requires 3-5 more editions for data. Phase 26.2.1 (directive tracking) is the prerequisite — start there.

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

### Phase 30: Tribune Audio (Voicebox) — NOT STARTED

**Goal:** Give the Bay Tribune a voice. Articles you can listen to. A podcast you can hear. Civic voices that sound like people.

**Source:** Voicebox (github.com/jamiepine/voicebox) — 14.3K stars, MIT license. Free, local-first ElevenLabs alternative. Five TTS engines, voice cloning, multi-track composition, REST API on `localhost:17493`. See `docs/RESEARCH.md` S131 entry.

**Supersedes:** Phase 12.10 (Fish Audio TTS, $11/mo — rejected S77). Voicebox is free, local, and more capable.

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
