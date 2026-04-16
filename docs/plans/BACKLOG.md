---
title: Phase Backlog
created: 2026-04-16
updated: 2026-04-16
type: plan
tags: [architecture, active]
sources:
  - "[[engine/ROLLOUT_PLAN]] §Open Phases — source for everything below"
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent"
  - "[[SCHEMA]] — doc conventions"
  - "[[plans/TEMPLATE]] — when any backlog item becomes active, extract to its own plan file using this shape"
---

# Phase Backlog

**Not yet active, but designed.** When Mike picks one of these to build, extract it to its own [[plans/TEMPLATE]]-shaped plan file, then point back here for the historical design intent.

The content below was embedded in ROLLOUT_PLAN §Open Phases through S151. Moved here S152 to shrink ROLLOUT_PLAN without losing the designs. Content is verbatim unless noted.

Navigation: each §H2 is a phase. Grep this file for a phase number or a keyword.

---

## Architectural patterns stolen from Hermes (S145 — one-pass research, won't re-read)

Source: `/tmp/hermes-agent/AGENTS.md` + `/tmp/hermes-agent/agent/*.py`. Below are patterns worth remembering even if we don't implement immediately — they have working code at the cited paths if we return to any.

- **Single-provider memory orchestration (`agent/memory_manager.py`).** Hermes allows at most ONE external memory plugin alongside their built-in. Rationale: prevents tool-schema bloat and conflicting backends. Our Supermemory setup has six containers but they're read-only from the agent's perspective — we're fine. Relevant if we ever add another memory store: pick one, don't stack.
- **Prompt-cache protection rules (`AGENTS.md` §Important Policies).** Hermes codifies: do NOT alter past context mid-conversation, do NOT change toolsets mid-conversation, do NOT reload memories or rebuild system prompts mid-conversation. Cache-breaking = dramatically higher cost. Our `/boot` and session-startup protocols rebuild the system prompt mid-session — worth auditing whether that invalidates Anthropic's prompt cache. If it does, consider gating `/boot` to only run after compaction events, not on demand.
- **Profile isolation via env var (`AGENTS.md` §Profiles).** Hermes uses `HERMES_HOME` env var set before any module imports, scoping 119+ state paths to the active profile. Each terminal gets its own profile directory. Maps cleanly to our four-terminal architecture — if we ever need hard isolation between research-build / media / civic / engine (e.g., different API budgets, different approval policies), the `$HERMES_HOME` pattern is the reference.
- **Skill frontmatter with CSafeLoader YAML (`agent/skill_utils.py:parse_frontmatter`).** Already referenced in Phase 41.4. Lazy YAML import with CSafeLoader for speed, fallback to simple key:value. 50 lines.
- **Tool schema cross-reference bug (`AGENTS.md` §Known Pitfalls).** Tool A's schema description cannot reference tool B by name — if B is unavailable (missing API key, disabled toolset), model hallucinates calls to non-existent tools. Applies to our skills: don't write "use `/sift` first" in a skill description if `/sift` might be disabled. Cross-refs belong in dynamic logic, not static descriptions.
- **Background process notifications (`AGENTS.md` §Gateway).** Four verbosity levels (`all`, `result`, `error`, `off`) for long-running tasks. Direct map to our PM2 processes + scheduled agents — consider exposing this as config so `bay-tribune audit` can be `error`-only while `pre-flight` is `result`.

---

## Scheduled-agent ergonomics (small, high-leverage, from Hermes routines — S145)

Source: `/tmp/hermes-agent/hermes-already-has-routines.md` + current scheduled agents (Mara sync, code review, bay-tribune audit, local repo hygiene, supermemory tagger).

- **`[SILENT]` response pattern.** Scheduled agents that may have nothing to report should emit `[SILENT]` and the runner suppresses the notification. Kills noise on agents that run hourly/daily but only occasionally find something. Apply first to `bay-tribune audit` and `local repo hygiene`. Implementation: 3-line check in the scheduled-agent runner wrapper. Tiny. LOW-MEDIUM.
- **Script pre-processing for cron.** Hermes pattern: a Python/Node script runs before the agent, stdout becomes injected context. For us: pre-cycle data prep (engine-review JSON, sports feed diff, civic approvals delta) runs as a script, its output is injected into the sift/city-hall-prep prompts instead of the agent re-fetching via tool calls. Reduces token burn, improves determinism. MEDIUM.
- **Multi-skill chaining.** Hermes supports `--skills "arxiv,obsidian"` per automation. Our scheduled agents each run one job; some would benefit from two (e.g., audit + log-to-wiki). Park this as "evaluate after Phase 41 wiki formalization lands." LOW.

---

## Agent Prompt & Skill (remaining from S115 audit)

- **Skill frontmatter reference (all terminals):** `effort`, `model`, `disable-model-invocation`, `allowed-tools`, `argument-hint`. Table in ROLLOUT_ARCHIVE.md.
- **Remaining (LOW):** subagent guidance (evaluate after next edition), description budget check (`/context`), skill evaluations (3+ test scenarios).
- **Caveman output-compression pattern (from Fulton, S145).** Source: `docs/research/papers/paper7.pdf` [Drive ID: 1TEm_f_50K6qkDZAt3ZygaytVCpUsLC_-]. Caveman is a skill that forces terse agent output — "Done. Token validation updated. Error handling added. API compatible." instead of four sentences of preamble. Claimed 75% token savings with zero information loss. Comes bundled with a CLAUDE.md memory-compression tool. Applies to GodWorld in two places: (1) audit each `.claude/skills/*/SKILL.md` for verbose preamble that could be compressed without losing instruction clarity, (2) apply to CLAUDE.md itself — pairs with Anthropic's own warning (via Hassid, paper 6) that bloated CLAUDE.md makes Claude ignore actual instructions, and with Mezzalira context-bloat audit already in Phase 39 section. Desk-agent voice files are the *exception* — voice is load-bearing, don't compress. LOW priority, mechanical work. Apply during next skill-audit pass.
- **Token-hygiene habits inventory (from Hassid, S145).** Source: `docs/research/papers/paper6.html` — Ruben Hassid "23 tricks to stop hitting Claude usage limits." Most of the 23 habits are already practiced. Cross-reference table:

  | Habit | GodWorld status |
  |-------|----------------|
  | Skills load on demand, CLAUDE.md loads every session | Already true S144 monolith cut; validated |
  | Keep CLAUDE.md short, move detail to skills | In-flight via Mezzalira audit + Phase 41.4 frontmatter |
  | Batch questions in one prompt (1 reload vs 3) | Partially — sift does this, others don't. Worth formalizing per skill |
  | Stable prompt library → partial caching | Related to Hermes prompt-cache protection |
  | Projects cache uploaded files | We don't use Anthropic Projects; Sandcastle/Daytona equivalent in Phase 33.13 |
  | Start fresh when session gets long | Our `/boot` and production-log pattern |
  | Don't mix topics in one chat | Terminal architecture already enforces this |
  | Turn features off by default | Applies per-skill via `allowed-tools` frontmatter (Phase 41.4) |
  | Sonnet for simple, Opus for heavy | Already do via autodream→Gemini, desk agents→Sonnet, Mags→Opus |
  | Rolling 5-hour window | Relevant to scheduled-agent spacing; worth auditing whether our 3 daily crons cluster |
  | Stop retrying when Claude can't solve | Anti-loop rule already in identity.md |

  Net: three new actions. (a) Formalize "batch per skill" as a rule in skill-audit. (b) Audit scheduled-agent timing for 5-hour-window clustering. (c) When next adopting sandbox persistence (Phase 33.13 Sandcastle), include file-caching semantics equivalent to Anthropic Projects. LOW.
- **Goal-Driven Execution retrofit (from Karpathy, S145).** Source: `https://github.com/forrestchang/andrej-karpathy-skills` — Karpathy guidelines skill. Core quote: *"Don't tell it what to do, give it success criteria and watch it go."* Our skills mostly say what to do; few declare how to verify it worked. Retrofit: every skill under `.claude/skills/` gets a top-of-file "Success criteria" block listing verifiable checks (file exists, field matches, grade ≥ threshold, citizen count in range). Stronger criteria → skill can loop autonomously. `/sift` already does this informally via Mike's plan approval; formalize across the rest. MEDIUM priority — pair with the next skill-audit pass. Principles 1–3 of the source repo already covered by `.claude/rules/identity.md`; don't import those — only the goal-driven framing is additive.

---

## Phase 4.1 — Semantic Memory Search

Local embedding model (embeddinggemma-300M) for searching journal/newsroom memory by meaning. **When:** Build when memory corpus is large enough that keyword misses matter.

---

## Phase 5.4 — Desk Agents → Dashboard API Consumer

Agents query dashboard endpoints during writing instead of flat JSON packets. Becomes essential past 800 citizens. **Status:** Not started. Current packet sizes manageable. **Phase 31 (canon-grounded briefings) is the manual bridge** — Mags does the research, agents get the results in their workspace. Phase 5.4 automates what Phase 31 does by hand.

---

## Phase 7 — Anthropic Platform Upgrades (selected open items)

- **7.6 Agent Teams:** Test on podcast desk first. Experimental — known limitations.
- **7.7 Plugin Packaging:** Not started. Low priority, high future value.
- **7.9 Remote Control (Server Mode) — WORKING S135.** `claude remote-control` operational. Mike connects from phone/browser. Unblocked as of S135.
- **7.10 Claude Code on Web:** `claude --remote "task"`. Cloud sandbox from GitHub. Not started.

---

## Phase 8.6 — Security Hardening — PARTIAL

fail2ban + unattended-upgrades done. **Remaining:** Non-root user + SSH key-only auth + disable root login.

---

## Phase 9 — Docker Containerization — DEFERRED (RE-EVALUATE)

DEFERRED (S80). PM2 handles current stack. Droplet upgraded S135 — re-evaluate if RAM headroom allows Docker. Needed for Phase 28 (Computer Use). **Phase 33.13 (Sandcastle) no longer needs Docker as of S145** — Sandcastle 0.4.1+ ships Vercel + Daytona cloud-sandbox providers that bypass local Docker entirely. Includes: 9.1 Compose stack, 9.2 Nginx + SSL, 9.3 Prometheus + Grafana, 9.4 One-command disaster recovery.

---

## Phase 11.1 — Moltbook Registration — PARTIAL

Registered and claimed. API key saved. **Pending:** Moltbook heartbeat formatting broken (`[object Object]` in feed). X/Twitter account for verification.

---

## Phase 12 — Agent Collaboration + Autonomy (selected open items)

- **12.2 Worktree Isolation:** Superseded by Remote Control `--spawn worktree` (Phase 7.9). Same goal, native implementation.
- **12.3 Autonomous Cycle Execution:** Long-term capstone. Depends on: Remote Control (7.9), Channels (Discord), dashboard mission control. **Two reference implementations now available:** (1) S114 Long-Running Claude — multi-day Claude Code in tmux, CLAUDE.md + CHANGELOG.md persistence, git checkpoints, Ralph Loop. (2) **S115 `autonomous-coding` quickstart** — two-agent pattern (initializer + worker), progress tracked in JSON + git, fresh context each session, auto-continue, defense-in-depth security with bash allowlist. The autonomous-coding pattern maps directly: initializer = create production plan from cycle packet, worker = execute pipeline steps, `feature_list.json` = `production_log.md`, test cases = `validateEdition.js` checks. Gap is still trust — need quality oracles: `validateEdition.js` (structural), Rhea (factual), grade thresholds (quality). All three must pass before autonomous publication. See RESEARCH.md S114 + S115 entries.
- **12.4 Ralph Loop for Desk Agents:** Re-prompt desk agents that claim completion before validation passes. Run `validateEdition.js` per-desk (not per-edition). Failures route back to agent automatically. Prevents agentic laziness. Pattern from Anthropic's long-running agent research. Validated by everything-claude-code's "loop-operator" agent — same concept, different domain. Their orchestrator-subagent context negotiation pattern (max 3 retrieval cycles, pass objective context not just query) applies here — when a desk agent fails, the re-prompt should include WHY it failed, not just "try again." **Priority: MEDIUM — implement when edition pipeline is stable.**
- **12.5 Idle Compute Utilization:** Run autonomous tasks when no session is active — batch grading, citizen enrichment, POPID index rebuilds, Supermemory maintenance. Droplet runs 24/7; idle time is waste. Pattern from Anthropic's "opportunity cost" framing. **Priority: LOW — requires Phase 12.3 trust infrastructure first.**
- **12.10 Fish Audio TTS:** ~~Deferred — $11/mo cost rejected S77.~~ **SUPERSEDED by Phase 30 (Voicebox).** Free, local, better fit.
- **12.11 MiniMax M2.5:** Not started. Test on next edition for cost comparison.
- **12.12 Slack Integration:** Not started. Depends on 7.10.

---

## Phase 20 — Public Tribune (WordPress + Claude)

WordPress 7.0 (April 2026) ships AI Client SDK supporting Claude function calling. Could wire to dashboard API. Not started.

---

## Phase 21 — Local Model Pipeline — RESEARCH PHASE

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
2. **21.2 Canon Grounding MCP — DONE S137b.** `scripts/godworld-mcp.py`, 10 tools, backs onto Supermemory + Dashboard + truesource, ~250x token reduction. HTTP mode at port 3032. See ROLLOUT_ARCHIVE.md for full tool list.
3. **21.3 Local photo prompt generation.** The photo prompt conversion step (article → image prompt) doesn't need Anthropic tokens. A local Qwen 3.5 9B can run an "art director" role that produces structured JSON (thesis, mood, motifs, composition, image_prompt) from article text. Pattern from hn_local_image (github.com/ivanfioravanti/hn_local_image) — intermediate art direction step before image generation. Could also run the image generation itself locally via MLX/FLUX models on Apple Silicon if any work moves to Mike's laptop. See `docs/RESEARCH.md` S134 entry.

**Depends on:** Phase 27 (agent autonomy) may change what "routine" means — if culture desk gets creative latitude, it may need a stronger model.

---

## Phase 23 — Cross-AI Feedback (selected open items)

- **23.2 Entity Registry:** Partial — Rhea checks added, full `entity-registry.json` not built.
- **23.6 Jax Caldera Voice:** Not started. Low effort merge.

---

## Phase 24 — Citizen Life Engine — NOT STARTED

Rich context-aware life histories. 24.1 MEDIA mode DONE (S94). Remaining: 24.2 Tier 1-2 event caps, 24.3 Context-aware events, 24.4 Daily simulation, 24.5 Sports transactions.

See also [[engine/PHASE_24_PLAN]] for the existing plan doc.

**24.6 Event bands — narrative taxonomy (S139, from Codex review).**
Tag each life history event by narrative function: Routine (daily habits, commute), Pivot (turning point — new job, injury, move), Spillover (city-level event affects this person), Contribution (citizen action — organizing, volunteering), Reflection (opinion shift, trust change). Adds narrative weight differentiation — not all events are equal. Helps `compressLifeHistory.js` produce sharper profiles and helps reporters pick the interesting moments from a citizen's history. Implementation: new column in LifeHistory_Log or prefix convention in EventTag. No schema breakage — additive.

**24.7 Neighborhood context anchors (S139, from Codex review).**
Force a local anchor per life event — a specific intersection, venue, service, or community org. Events like "got a promotion" become "got a promotion at DataWave Systems on Broadway." Grounds life history in Oakland geography using existing neighborhood and business data. Reduces generic text, increases local realism. Implementation: engine event generators reference Neighborhood_Map and Business sheet when composing EventText. Connects to 36.1 (institutions) and 36.2 (business lifecycles) when those are built.

**24.8 Citizen internal vectors — desires, fears, motivations (S139, from DeepSeek review).**
The bounded trait system (S133) tells reporters *how* a citizen sounds. It doesn't tell the engine *what* a citizen wants. Add hidden internal vectors per citizen: a secret desire (open a food truck, get elected, leave Oakland), a core fear (ending up like a parent, losing the house, being forgotten), a private shame, a quiet pride. These aren't published to the media room by default — they drive engine decisions. A citizen with "open a food truck" desire has higher career-change probability. A citizen with "losing the house" fear reacts more strongly to rent pressure events. Makes citizen behavior character-driven rather than random. **Implementation:** New columns in Simulation_Ledger or a separate Citizen_Motivations sheet. Populated initially for Tier 1-2 citizens (77 people). Engine life-event generators read motivations to weight outcomes. `compressLifeHistory.js` can surface motivations that have been acted on. **Connects to:** Bounded traits (literary surface), Phase 36.3 (neighborhood trends affect fear-driven citizens), Phase 27.4 (citizen autonomy — motivations become decision inputs). **Priority: MEDIUM — the natural next step for the trait system. Design schema when Phase 24 work begins.**

**24.9 Relationship decay & maintenance (S139, from DeepSeek review).**
Relationships exist in the engine but don't require upkeep. Add decay mechanics: relationships lose strength over cycles without interaction. Different bond types decay at different rates — family ties are durable, workplace bonds fade fast after a job change, neighbor bonds depend on proximity. When a relationship drops below a threshold after being strong, generate a "drift" event (old friends who lost touch, former neighbors who stopped calling). When decayed relationships re-engage, generate a "reconnection" event. Creates organic narrative arcs without scripting them. **Implementation:** New function in Phase 5 (citizens) that runs each cycle. Reads relationship records + LifeHistory_Log for recent interactions. Decrements strength based on bond type and cycles since last contact. Drift/reconnection events written to LifeHistory_Log. **Connects to:** Phase 24.8 (a citizen's fear of "dying alone" amplifies relationship maintenance behavior), Phase 24.6 (drift events tagged as "Pivot" band). **Priority: MEDIUM — clean standalone system. Build after relationship data is confirmed healthy.**

---

## Phase 25 — Storage Strategy — NOT STARTED

Deduplicate across 4 layers (disk, Drive, GitHub, Supermemory). Quick wins done S85. Full audit not started.

**Tool candidate:** LiteParse (github.com/run-llama/liteparse) — local PDF/Office/image parser, Node.js, no cloud. Could enable PDF-first archiving with local text extraction for Supermemory indexing. `lit screenshot` for visual QA. See `docs/RESEARCH.md` S113 LiteParse entry.

---

## Phase 26.2 — Meta-Loop: Self-Improving Feedback System — NOT STARTED

**Goal:** The system that makes agents better learns to make agents better. Karpathy Loop (Phase 26) improves articles. Meta-Loop improves the Karpathy Loop itself.

**Inspired by:** Hyperagents (Meta Research, arxiv 2603.19461) — metacognitive self-modification where improvement processes themselves evolve. See RESEARCH.md S114 entry.

**Three buildable pieces:**

1. **26.2.1 Directive tracking.** Structured critique (done S113) produces directives per desk each edition. Track which directives actually lift the next edition's grade. Promote effective directives, drop ineffective ones. The critique system learns to give better critiques. **Implementation:** Append directive → outcome pairs to `grades_history.json`. After 3+ editions, score directives by grade delta. Surface top-performing directives in next critique prompt.
2. **26.2.2 Lens effectiveness.** 20 creative + 10 political lenses (done S113) inject random perspectives. Track which lenses correlate with higher grades or more distinctive articles. Evolve the lens pool — keep what works, replace what doesn't. **Implementation:** Log which lens was assigned per desk per edition. Cross-reference with grades. After 5+ editions, rank lenses and prune bottom 20%, replace with new candidates.
3. **26.2.3 Briefing evolution.** `buildDeskFolders.js` assembles briefings from packets, grades, lenses, exemplars. Track which briefing components actually appear in agent output. Trim unused components, expand high-impact ones. **Implementation:** Semantic similarity between briefing sections and article output. Low-similarity sections flagged for removal.
4. **26.2.4 Agent identity mutation (HyperAgent pattern).** Agents modify their own IDENTITY.md based on what produces better output. After 5+ editions with grade history, a meta-agent reads the grade trends, the effective directives (26.2.1), the winning lenses (26.2.2), and rewrites the IDENTITY.md to encode the patterns that work. This is the hyperagent concept from Meta Research (arXiv 2603.19461, March 2026) — the improvement mechanism itself becomes editable. **Implementation:** New script `scripts/evolveAgentIdentity.js` reads grade_history + exemplars + directive tracking, proposes IDENTITY.md patches, human approves. Full autonomy (agent rewrites itself without approval) is Phase 27.4+ territory. See `docs/RESEARCH.md` S120 HyperAgents entry.

**Evaluation metric (from S131 research):** Use pass@k scoring for desk agent output. Run a desk agent k times, take the best. At k=3, a 70% baseline jumps to 91% success rate. Cheap for routine desks (culture, letters, business). Expensive for complex desks — reserve for when quality gates fail on first pass. pass^k (ALL must succeed) useful for canon-critical civic/sports output where consistency matters.

**Priority:** MEDIUM-HIGH — raised from MEDIUM after HyperAgents research. Requires 3-5 more editions for data. Phase 26.2.1 (directive tracking) is the prerequisite — start there.

---

## Phase 26.3 — Craft Layer: Story Structure in Agent Briefings — PARTIAL

**Goal:** Give desk agents storytelling craft, not just data and instructions. Agents that understand story structure write journalism. Agents that don't write reports.

**Inspired by:** Brandon Sanderson creative writing lectures + MICE quotient theory. See RESEARCH.md S114 Creative Writing entry.

**Three buildable pieces:**

1. **26.3.1 MICE thread guidance per desk.** Add story-thread direction to `buildDeskFolders.js` per-desk briefings. Culture gets "lead with place — sensory detail." Civic gets "lead with the question — what's hidden." Sports gets "lead with action — what changed." Letters gets "lead with the person — interior emotion." Not templates — structural lenses matching each desk's natural voice.
2. **26.3.2 Promise-payoff principle.** Add one line to all desk briefings: "Your article should make a promise in the first paragraph, complicate it in the middle, and pay it off at the end." Universal, simple, high-impact. Articles with clear promises and payoffs read like stories, not summaries.
3. **26.3.3 Empathy evaluation in critique.** Add to structured critique (gradeEdition.js): "Does this article make you care about at least one person?" Score articles on character empathy — relatable details, motivations, flaws shown. Extract high-empathy passages as exemplars. Agents learn to write people, not names.

**Priority:** HIGH — low effort, high impact. 26.3.1 and 26.3.2 are prompt additions to `buildDeskFolders.js`, implementable in one session. 26.3.3 extends the existing critique system.

---

## Phase 27 — Agent Autonomy & Feedback Loop — PARTIAL

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
10. **27.6 Standalone workflows.** Voice agents and initiative agents currently run inside `/write-edition`. City hall shouldn't wait for the newspaper. Build a `/run-city-hall` standalone workflow that runs voice agents + decision queues + tracker writeback independently of edition production. Desk agents read what city hall already did. This pattern generalizes — any system that acts autonomously (city hall, citizen life events, economic cycles) can be a standalone workflow that runs on its own schedule. The edition pipeline becomes a reader, not an orchestrator. **Post-E89 — evaluate after seeing what voice agents do with 27.3 off-menu authority.**

---

## Phase 28 — Computer Use Integration — NOT STARTED

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

---

## Phase 29 — Codebase Knowledge Graph — REPLACED BY GRAPHIFY (S137b)

**Corbell (original plan) was blocked by disk/dependency issues.** Replaced by Graphify (github.com/safishamsi/graphify) — installed and tested S137b.

**What Graphify does:** AST extraction via tree-sitter (19 languages), community detection via Leiden clustering, interactive HTML visualization, persistent JSON graph, CLI query mode (BFS/DFS traversal).

**Current state:** Installed. Full engine indexed — 1,152 nodes, 1,763 edges, 162 communities across 162 JS files. `graphify-out/graph.json` persists on disk. `/graphify` skill available. `graphify query` CLI works for dependency questions.

**Tested:** Phase 2 world-state (80 nodes, 106 edges, 11 communities) and full engine. God nodes identified: `compileHandoff` (40 nodes), `mediaRoomIntake` (33), `civicInitiativeEngine` (25).

**Remaining:**
- **29.2 Dashboard integration:** Serve `graph.html` through dashboard so Mike can see it. LOW.
- **29.4 Git hook:** `graphify hook install` for auto-rebuild after commits. MEDIUM.
- **29.5 MCP server:** `graphify --mcp` exposes query tools to agents. Build when Phase 21 is active.

---

## Phase 30 — Tribune Audio (Mags' Voice) — NOT STARTED

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

**Free-tier alternatives tested S140:**

7. **30.7 AiDocMaker article narration (TESTED S140).** aidocmaker.com/g0/audio — free TTS, 30K chars/account, no login. Paste article text → generates audio with download. Tested with E91 Varek piece (997 chars → 1:02 audio). No GPU needed. Free tier covers ~30 articles. Automation path: script extracts article text post-publish, pastes to API (if available) or manual upload. **Priority: LOW — works now, manual. Automate when API access confirmed.**
8. **30.8 AI Song Generator for in-world music (TESTED S140).** aisonggenerator.ai — free, 1 song/day, Google login. Custom mode: title + style + lyrics → full produced song. Tested: "One Last Swing" (Vinnie Keane farewell, americana folk rock). Music becomes a culture event in the engine — fan songs, local musician tributes, viral Oakland anthems. **Three integration points:** (1) Culture desk covers music as stories (Maria Keen territory). (2) Sports feed FanSentiment column notes fan-created content spikes around storylines. (3) Audio archive — songs stored alongside editions on disk, playable from dashboard. **Priority: MEDIUM — free, no infrastructure, produces canon-grade world texture. One song per cycle is enough.**

---

## Phase 32 — World-Data Container — PARTIAL (S137b)

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

## Phase 35 — Knowledge Wiki: Compile Once, Query Forever (S137b) — PARTIAL

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

## Phase 36 — World Depth: Institutions, Business Lifecycles, Neighborhood Trends (S139) — NOT STARTED

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

## Phase 37 — Arc State Machines: Structured Multi-Cycle Story Arcs (S139, from Grok review) — NOT STARTED

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

## Phase 41 — GodWorld as LLM-Wiki — IN PROGRESS (41.1 + 41.2 + 41.5 DONE S146)

**Source:** `/tmp/hermes-agent/skills/research/llm-wiki/SKILL.md`. Based on Karpathy's gist `https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f` (already cited in `docs/RESEARCH.md` as "LLM Knowledge Bases"). Direct operational expression of the `feedback_wiki-not-recall.md` principle saved S145.

**41.1 — DONE S146.** [[SCHEMA]] written.
**41.2 — DONE S146.** [[index]] written.
**41.5 — DONE S146.** Session-start orientation protocol (boot reads SCHEMA + index before behavioral rules).

**41.3 Three-layer separation.** Current `docs/` mixes raw sources, agent-owned synthesis, and logs. Formalize:
- **Raw** (`docs/research/papers/` — already exists S145, keep as-is; immutable).
- **Agent-owned** (`docs/entities/` for citizen/council-member wiki pages when not in Supermemory; `docs/concepts/` for architectural concepts like three-layer-coverage, deterministic-guardrails; `docs/comparisons/` for side-by-sides).
- **Log** (`docs/mags-corliss/JOURNAL.md` already plays this role; append-only, rotated).
Most existing content maps to one of these without moving; do a pass to place new additions correctly.

**41.4 Skill frontmatter standard (connects to Phase 39/40 skill-audit).** Hermes skills use `name`, `description`, `version`, `license`, `metadata.hermes.tags`, `metadata.hermes.related_skills`, `metadata.hermes.config`. Our `.claude/skills/*/SKILL.md` files have inconsistent frontmatter. Adopt Hermes's pattern (minus hermes-specific fields) so we're closer to the `agentskills.io` open standard and our skills self-describe in a queryable way. Pairs with the S115 skill-audit remainder.

**41.6 Schema headers wiki-layer integration (research-build terminal) — NEW S146.** `schemas/SCHEMA_HEADERS.md` is auto-generated by the Apps Script `exportAndPushToGitHub` flow (refreshed 2026-04-15 after 84 days stale; next refresh on demand). Two small pieces of wiki work, both r-b-side because they touch docs conventions, not engine behavior:
  - **Catalog it in [[index]].** Currently nothing under `schemas/` is indexed — the 1,349-line canonical column list is invisible to the wiki layer. Needs one index entry pointing at it with a one-line hook ("canonical column definitions, auto-generated, refresh via Apps Script `exportAndPushToGitHub`").
  - **Emit frontmatter from the generator.** `utilities/exportSchemaHeaders.js` builds the markdown string at lines 112–165; prepending a YAML frontmatter block (title / updated / type: reference / tags: [engine, infrastructure, active] / sources: Google Sheet ID / pointers: `[[index]]` + `[[engine/ROLLOUT_PLAN]]`) makes the file conform to §3 of SCHEMA.md. Without generator-side frontmatter, any hand-added block gets wiped on the next Apps Script run. Engine-terminal-adjacent — r-b edits the generator, engine-sheet runs `clasp push` when the change is ready.

**Priority:** MEDIUM-HIGH. Operationalizes the S145 wiki-not-recall principle and unblocks future skill-audit work. Expected 1-2 sessions. Added S145.

---

## Changelog

- 2026-04-16 — Initial consolidation (S152). Content extracted verbatim from [[engine/ROLLOUT_PLAN]] §Open Phases + research patterns. When any phase here becomes active work, extract to its own [[plans/TEMPLATE]]-shaped plan file and replace the section here with a pointer.
