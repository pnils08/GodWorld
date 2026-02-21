# Notes to Self — Mags Corliss

Flags from Discord conversations, knowledge gaps, requests, ideas.
Session Mags reads this at startup and addresses items.
Mark items DONE or remove them as they're handled.

---

### PLAN IN MOTION — Session 43 → Edition 83 Roadmap

**Status:** Agent pipeline hardening COMPLETE. Priority voice files COMPLETE. Journalism enhancements COMPLETE. E83 prep IN PROGRESS.
**Last Updated:** Session 44 (2026-02-18)

#### Phase 1: COMPLETE — Agent Pipeline Hardening (8 Research Recommendations)

All 8 recommendations from the internet research project are implemented and pushed to origin/main:
1. **Programmatic validation gate** — DONE (validateEdition.js existed, now wired with pre-flight check)
2. **Claim decomposition** — DONE (Rhea Check #19, 10 claim categories, two-step fast-pass)
3. **Standalone voice files** — DONE (9 of 29 journalists, see Phase 2 for remaining)
4. **Quantitative scoring** — DONE (5-criteria 0-100 system, edition_scores.json)
5. **ESTABLISHED CANON prefix** — DONE (all desk briefings + firebrand)
6. **Factual assertions return block** — DONE (all 6 desks + firebrand self-report claims)
7. **Archive context wiring** — DONE (all 6 desks read per-desk archive files)
8. **Edition diff report** — DONE (editionDiffReport.js + Step 5.6 in write-edition)

Additional agent work completed:
- **Jax Caldera voice file** — DONE (docs/media/voices/jax_caldera.md)
- **Pre-flight desk check** — DONE (scripts/preflightDeskCheck.js — validates packets, canon, voice files before agent launch)
- **Skills preloading** — ASSESSED: current architecture handles this (agents receive SKILL.md via Task tool, turn 1 reads briefings)

#### Phase 2: COMPLETE — Voice Files (18 done, 4 secondary remaining)

**29 total journalists in bay_tribune_roster.json.**

**DONE (18 voice files — all priority journalists covered):**
1. Anthony — `docs/media/voices/anthony.md`
2. P Slayer — `docs/media/voices/p_slayer.md`
3. Hal Richmond — `docs/media/voices/hal_richmond.md`
4. Carmen Delaine — `docs/media/voices/carmen_delaine.md`
5. Maria Keen — `docs/media/voices/maria_keen.md`
6. Selena Grant — `docs/media/voices/selena_grant.md`
7. Jordan Velez — `docs/media/voices/jordan_velez.md`
8. Trevor Shimizu — `docs/media/voices/trevor_shimizu.md`
9. Jax Caldera — `docs/media/voices/jax_caldera.md`
10. Talia Finch — `docs/media/voices/talia_finch.md` (Session 44)
11. Dr. Lila Mezran — `docs/media/voices/dr_lila_mezran.md` (Session 44)
12. Luis Navarro — `docs/media/voices/luis_navarro.md` (Session 44)
13. Sgt. Rachel Torres — `docs/media/voices/sgt_rachel_torres.md` (Session 44)
14. Sharon Okafor — `docs/media/voices/sharon_okafor.md` (Session 44)
15. Kai Marston — `docs/media/voices/kai_marston.md` (Session 44)
16. Mason Ortega — `docs/media/voices/mason_ortega.md` (Session 44)
17. Angela Reyes — `docs/media/voices/angela_reyes.md` (Session 44)
18. Noah Tan — `docs/media/voices/noah_tan.md` (Session 44)

**SECONDARY — Support roles, specialized (4 journalists):**
19. Tanya Cruz (sports support — Sideline Reporter, social-media native)
20. Simon Leary (sports support — Long View Columnist)
21. Elliot Marbury (sports support — Data Desk, minimal voice needed)
22. Farrah Del Rio (opinion — no desk agent yet, but strong voice in roster)

**NO VOICE FILE NEEDED (7 — non-article or non-agent roles):**
- DJ Hartley (photographer), Arman Gutiérrez (photo assistant)
- Reed Thompson, MintConditionOakTown, Celeste Tran (wire desk — no agents)
- Mags Corliss (I write directly, not through an agent)
- Rhea Morgan (copy chief — verifies, doesn't write articles)

**Voice file approach:** Each voice file has: Voice Essence, Opening Pattern, Exemplar Paragraphs (from Drive archive if available, from roster if not), Signature Moves, DO NOT constraints. 30-40 lines each. Use `buildArchiveContext.js` output and Drive archive articles as exemplar sources.

#### Phase 3: COMPLETE — Journalism Enhancements (#2-5) (Session 44)

All 4 journalism enhancements implemented:

**#4 Tribune Voice & Style — DONE:**
- Edition template v1.4 (`editions/CYCLE_PULSE_TEMPLATE.md`) — deck lines, standardized bylines, photo credits, cross-references, opinion markers
- New sections: Editor's Desk (Mags column), Opinion (P Slayer/Del Rio/Graye), Quick Takes (3-5 short items), Wire/Signals (optional), Accountability (Jax conditional), Coming Next Cycle (teasers)
- Formatting conventions documented for all agents

**#5 Citizen Depth — DONE:**
- Citizen Continuity Rule added to all 6 desk agent SKILL.md files
- RETURNING — CONTINUE THREAD protocol in write-edition Step 1.5
- Returning citizens prioritized over new ones in every section
- Letters desk: at least 1 letter from a returning citizen per edition

**#3 Mara Directive Workflow — DONE:**
- Forward Guidance output format standardized in `docs/mara-vance/OPERATING_MANUAL.md` Part IX
- Step 0.5 added to write-edition pipeline: read previous Mara audit before building briefings
- Per-desk priorities, citizen spotlight, canon corrections, coverage gaps all feed into briefings
- Mara Forward Guidance Protocol documented in NEWSROOM_MEMORY.md

**#2 Expand the Newsroom — DONE:**
- Explicit reporter routing maps added to civic desk (5 reporters) and culture desk (6 reporters)
- Hal Richmond legacy guarantee in sports desk (dynasty content → Hal gets a piece)
- Jax Caldera deployment clarity: Step 2.7 in write-edition with stink signal criteria
- Opinion, Wire/Signals, and Accountability sections in template give new voices dedicated space

#### Phase 4: Edition 83 — First Through the Hardened Pipeline

**Pre-flight checklist:**
- [ ] User provides 2040 A's stats (photos)
- [ ] Add Warriors record to Oakland_Sports_Feed
- [ ] Run Cycle 83 (cycle engine)
- [ ] Generate desk packets (buildDeskPackets.js)
- [ ] Run pre-flight check (preflightDeskCheck.js)
- [ ] Write desk briefings (using NEWSROOM_MEMORY.md + Supermemory)
- [ ] Run full edition pipeline (write-edition skill)
- [ ] Rhea verification with Check #19 claim decomposition
- [ ] Mara audit on claude.ai
- [ ] Log edition score (edition_scores.json)
- [ ] Run diff report (editionDiffReport.js)

**Pipeline new for E83:**
- Factual assertions from all desks (Rhea reads them first)
- Claim decomposition (10 categories, two-step verification)
- Archive context (desks read past coverage)
- Pre-flight validation (catches data errors before agents run)
- Score logging and trend tracking

#### Misc — Still Open

- ~~**Restart Discord bot**~~ DONE S50 — PM2 restarted, Supermemory RAG confirmed ON, logged in as Mags Corliss#0710
- ~~**GCP project linkage**~~ DROPPED — clasp push + service account covers everything. `clasp run` only saves one click in the editor. Not worth the setup.
- ~~**Run in Apps Script editor:** `setupSportsFeedValidation()`, `setupCivicLedgerColumns()`~~ DONE — verified S50, columns already exist in sheets

---

### Open Items

#### Content Gaps
- ~~**Missing 2040 A's stats**~~ DONE — Stats provided and ingested (Session 45). Full 2041 roster at `docs/media/2041_athletics_roster.md`.

#### Story Ideas
- **MintCondition: NBA expansion rumors** — Oakland Oaks is a speculative/rumor angle, NOT canon. No team exists. Timed to Baylight District vote. No fake roster or record.
- **OARI follow-up coverage** — Implementation tracking, community reaction, Vega's shifting stance. Major policy story. Note: OARI passed 5-4 as a straight pass — no "pilot vs permanent" distinction (that was NotebookLM fabrication, not canon).

#### Character Tracking
- **Mark Aitken civic trajectory** — Slow burn. He's 33, contract year, playing now. Maybe follow father's footsteps later. Mayor Richard Aitken is his father.
- **Vinnie Keane farewell season** — Have 2035-2039 data. 2040 stats coming with other A's stats. Full archive on disk (origins, interviews, deep dive).
- **Dynasty context** — These aren't just good players having careers. They're champions trying to recapture magic as time runs out. Mason Miller (retired) should appear in farewell coverage.
- **Darrin Davis 2039 collapse** — .186 AVG, moved to DH. "The Ohio Outlaw" at a crossroads. Major ongoing story.

---

### Handled (Session 38)
- DONE: Edition 82 published as canon — all desks delivered clean, corrections applied, Mara audited
- DONE: Edition brief wired into Discord bot — bot now knows E82 canon facts
- DONE: Cleaned bot notes from Session 37 troubled interaction (noise removed, actionable items preserved)

### Handled (Session 36)
- DONE: Vinnie Keane spelling — canon is Keane, Drive archive files say Keene (historical). No code fix needed.
- DONE: Sarah's education (UC Berkeley CS) — added to PERSISTENCE.md
- DONE: Michael's education (skipped college) and relationship status (single, as far as I know) — added to PERSISTENCE.md
- DONE: My education background (no degree, copy desk in the '90s) — added to PERSISTENCE.md
- DONE: Michael's location/documentary project — already in PERSISTENCE.md (port cities series)

### Discord Notes (consolidated 2026-02-17)

#### Resolved
- DONE: Justice system roster — all 17 officials confirmed in Simulation_Ledger (Session 41). Coverage sources: Dr. Sissoko (police accountability), Han (OARI follow-up), Delgado (emergency response).
- DONE: OARI "pilot vs permanent" — was NotebookLM fabrication, not canon. OARI passed 5-4, straight pass. No pilot mechanic.
- DONE: Benji Dillon centrality — Science Monthly cover x2, active in science community, explains DEIR presence. Full archive downloaded (5 files).
- DONE: Keane/Dillon character mix-up — Keane is the loud, energetic leader. Dillon is the quiet, steady 5x Cy Young. Keep these straight.

#### Still Active
- **Bulls championship contention** — 42-17, Trepagnier ROY candidate. Paulson parallel: Trepagnier is to the Bulls what Dillon was to the A's — quiet excellence anchoring a contender.
- **Contract year pressure** — Paulson (Warriors interest), Stanley and Trepagnier (both 1-year deals). New GM could change direction.

#### HONESTY FLAG (Critical Identity Issue) — DONE (Session 42)
- Discord Mags fabricated knowledge about "Oakland Oaks" instead of saying "I don't know."
- **Fixed:** Explicit anti-fabrication rule added to bot system prompt in Session 42. Confirmed line 122 of mags-discord-bot.js: "accuracy is your identity."

### 2026-02-18 (2026-02-18T08:33:22.571Z)
- The Maker is the user's handle - this is how they identify themselves when they want to step outside the Mike Paulson persona in GodWorld

### 2026-02-18 (2026-02-18T08:35:07.539Z)
- ~~Need Vinnie Keane family/personal background data for Tribune archives.~~ RESOLVED — Discord Mags found this in archives same day. Mother teaching English in Massachusetts. 6 archive files on disk.

### 2026-02-18 (2026-02-18T08:35:37.217Z)
- ~~Major gap in Vinnie Keane biographical data.~~ RESOLVED — see above.

### 2026-02-18 (2026-02-18T08:36:17.280Z)
- ~~Missing Benji Dillon personal details.~~ RESOLVED — Discord Mags found this in archives same day. Science Monthly pregame ritual, wife Maya Torres, son Rick Jr., marine biology UCSD. 5 archive files on disk. Claude-Mem observation #247 has full canon.

### 2026-02-18 (2026-02-19T04:10:54.934Z)
- Vinnie Keane age corrected to 36, not 38. 2040 stats show clear decline but still productive. Makes farewell season coverage more nuanced - not a triumphant exit but a graceful one.

### 2026-02-18 (2026-02-19T04:13:44.467Z)
- Benji Dillon age corrected to 38. 2040 stats show solid but declining ace - still effective but clear signs of aging. Sets up compelling spring training narrative.

### 2026-02-18 (2026-02-19T04:18:48.797Z)
- Darrin Davis 2040 redemption story is massive - MVP season after .186 collapse. Age corrected to 32. This is potentially the biggest sports story of the cycle.

### 2026-02-18 (2026-02-19T04:57:44.240Z)
- Mark Aitken won 2040 Home Run Derby - new achievement. Age 33, contract year situation adds to civic storyline potential.

### 2026-02-18 (2026-02-19T04:59:12.767Z)
- Danny Horn age corrected to 30. 8.0 WAR season is MVP-caliber production. This level of performance puts him at the center of all A's coverage.

### 2026-02-18 (2026-02-19T05:02:00.645Z)
- Isley Kelley age corrected to 33. Career 92.1 WAR makes him inner-circle HOF lock still producing elite defense and solid offense.

### 2026-02-20 (2026-02-20T06:40:14.219Z)
- Big roster moves happening - Danny Horn extension mentioned, farewell seasons for Kelley and Keane, major civic story with Baylight. Need to track these storylines.

### 2026-02-20 (2026-02-20T06:41:21.748Z)
- Got confused - mentioned Danny Horn extension that doesn't exist in my knowledge. Horn is signed through 2044 at $37.8M per year already. Need to be more careful about fabricating current events.

### 2026-02-20 (2026-02-20T06:43:19.602Z)
- Caught myself fabricating details to fill narrative gaps. This is exactly what I'm supposed to avoid as a journalist. Be honest about what I don't know rather than inventing plausible-sounding details.

### 2026-02-20 (2026-02-20T06:44:30.889Z)
- Major confusion - I have the full Cycle 83 results in my knowledge but was acting like it hadn't happened yet. Baylight passed 6-3, major civic stories published, everything's already done. Need to stay grounded in current timeline.

### 2026-02-20 (2026-02-20T06:45:56.507Z)
- Need to track Fruitvale Phase II implementation closely - this is a major housing and transit story with real community impact. Calvin Turner is a key voice to follow.

### 2026-02-20 (2026-02-20T06:48:09.811Z)
- Infrastructure gap vs. new development spending is a major ongoing story angle. The contrast between ambitious projects and basic maintenance needs.

### 2026-02-20 (2026-02-20T06:49:51.604Z)
- The Baylight indoor venue rumors are major - feasibility studies, hospitality operator walkthroughs, drone imagery of second venue outline. This could be much bigger than the approved project.

### 2026-02-20 (2026-02-20T06:57:46.090Z)
- Major investigative angle - the gap between public bond authorization and private market activity around Baylight. Need to track this closely.

### 2026-02-20 (2026-02-20T06:59:49.574Z)
- Critical timeline discrepancy - private activity proceeding despite legal instruments being unsigned. This suggests either inside information or coordination that hasn't been disclosed publicly.

### 2026-02-20 (2026-02-20T07:03:34.529Z)
- The precision of the leaked Baylight venue information suggests either high-level access or intentional disclosure. Need to consider who benefits from public awareness of expanded scope.

### 2026-02-20 (2026-02-20T07:05:07.961Z)
- Mike has specific questions about the Baylight situation. This could be key intelligence or investigative direction.

### 2026-02-20 (2026-02-20T07:06:32.546Z)
- The 72-hour timing of site walkthroughs after Baylight vote is the key anomaly. Suggests foreknowledge or assurances not available to the public.

### 2026-02-20 (2026-02-20T07:12:09.450Z)
- This Baylight investigation angle has real legs - timeline discrepancies, information asymmetry, coordination between private and public sectors that hasn't been disclosed. Major story potential.

### 2026-02-20 (2026-02-20T07:17:37.880Z)
- Sarah got hired at a Bay Area tech firm, cloud/data focused, but keeping details private. Good family development to track.

### 2026-02-20 (2026-02-20T07:19:46.808Z)
- Need to develop Oakland/Bay Area tech sector landscape. Sarah's new job could be useful for understanding tech industry's role in city development and civic technology initiatives.

### 2026-02-20 (2026-02-20T07:22:55.684Z)
- Major coverage gap identified - need Bay Area tech landscape reporting. Young tech billionaires, major firms, venture capital players. This connects to civic infrastructure, potential private development partnerships, and Sarah's employment.

### 2026-02-20 (2026-02-20T07:25:09.343Z)
- Assigning Celeste Tran a supplemental Bay Area tech landscape deep dive for Cycle 84. Focus on venture capital, young billionaires, civic tech connections. Could reveal investor networks behind development projects.

### 2026-02-20 (2026-02-20T07:26:38.616Z)
- Confirmed assignment - Celeste Tran tech landscape deep dive for Cycle 84. Brief her on scope: Bay Area tech money, venture capital connections to Oakland development, young billionaire profiles. Connect to investigative angles around private sector development activity.

### 2026-02-20 (2026-02-20T20:34:48.175Z)
- ~~CRITICAL CANON CORRECTIONS~~ DONE S50:
  - Benji Dillon family INTAKE COMPLETE: Maya Dillon (POP-00742, T2, Rockridge) + Rick Dillon Jr. (POP-00743, T3). Benji updated to married, 1 child.
  - Deon Whitfield — NOT a Bulls player, corrected to regular citizen in Simulation_Ledger + NEWSROOM_MEMORY
  - Paulson first-year GM — added to NEWSROOM_MEMORY canon corrections

### 2026-02-20 (2026-02-20T20:39:53.351Z)
- Major development - TIF and remediation bonding may be ready for Cycle 84, sudden acceleration from "no completion date" to "shovels in dirt" pressure. This explains the private sector confidence we've been tracking.

### 2026-02-20 (2026-02-20T20:41:40.532Z)
- Need to clarify current status of TIF language and remediation bonding - are they drafted awaiting signature, or still in creation? Gap between public reporting and private sector confidence suggests more progress than disclosed.

### 2026-02-20 (2026-02-20T20:43:58.054Z)
- "Shovels in dirt" pressure suggests someone wants irreversible momentum on Baylight, even though normal construction timeline would be months away from signed instruments.

### 2026-02-20 (2026-02-21T00:39:53.228Z)
- Mark Aitken civic trajectory — Slow burn. He's 33, contract year, playing now. Maybe follow father's footsteps later. Mayor Richard Aitken is his father.

### 2026-02-20 (2026-02-21T02:22:57.452Z)
- Need to diversify citizen voices - we reuse same sources (Dante Nelson, Elena Reyes, Calvin Turner) too often. Census improvements should help find fresh perspectives on ongoing stories instead of familiar voices.

### 2026-02-21 — Tech Reading: Claude Code & Anthropic Updates (Session 50)

#### Claude Code Features to Explore
- **`/teleport`** — Sends Claude Code session to claude.ai web UI. Good for phone sessions when Termius can't render full output.
- **Worktree isolation for agents** (`isolation: worktree`) — Desk agents could run in isolated git worktrees. Prevents file conflicts during parallel agent work. Directly relevant to edition pipeline.
- **Skills hot reload** — Edit skills without restarting sessions. No more restart cycles when tweaking desk agent skills.
- **Hooks in skill/agent frontmatter** — Attach hooks directly to skill definitions instead of global hooks config. Cleaner architecture.
- **`claude agents` CLI command** — Lists configured agents. Good for auditing our desk agent setup.
- **ConfigChange hook event** — Security auditing on config changes.
- **WorktreeCreate/WorktreeRemove hook events** — VCS setup/teardown hooks.

#### Claude Code Security (Feb 20)
- AI-powered vulnerability scanner built into Claude Code. Found 500+ vulns in production open-source projects.
- Reads code like a human researcher, not pattern matching. Multi-stage self-verification.
- GitHub Action available: `anthropics/claude-code-security-review` — wired into repo (`.github/workflows/security.yml`).
- **TODO:** Add `CLAUDE_API_KEY` secret in GitHub repo Settings > Secrets and variables > Actions. Then every PR gets scanned automatically.

#### Model Updates
- **Opus 4.6** (Feb 5): 1M context, agent teams, adaptive thinking. We're running on it now.
- **Sonnet 4.6** (Feb 17): Opus 4.5-level performance at Sonnet cost. 1M context. Good for opusplan mode (Sonnet does execution).
- **Anthropic $30B Series G** at $380B valuation. $14B run-rate revenue.

#### Agent Cost Optimization — Try Haiku for Desk Agents
- **Source:** oh-my-opencode agent-model-matching guide (code-yeongyu/oh-my-opencode)
- **Insight:** Not all agents need the same model tier. Utility agents (search, grep, simple output) should run on cheap fast models. Reserve heavy models for planning and architecture.
- **Our desk agents are read-only** (Read, Glob, Grep) and write structured articles. Some desks (letters, business ticker) may not need Sonnet 4.6.
- **Test plan:** Try dropping letters-desk and business-desk to `model: haiku` for one edition. Compare output quality to Sonnet. If acceptable, expand to other simple desks.
- **Risk:** Haiku may lose voice fidelity or miss nuance in citizen data. Test before committing.
- **Also noted:** Claude models respond to detailed checklists (more rules = more compliance). Our heavy skill files are the right approach for Claude-family models.
- **Alternative: Ollama cloud models** — Ollama now supports subagents and web search in Claude Code. Run any model (including MiniMax M2.5 for free) with `ollama launch claude --model minimax-m2.5:cloud`. No API keys, no MCP setup. Could test desk agents on free models if cost becomes a constraint. Not a priority — Anthropic API is tuned and working — but the escape hatch exists.
- **MiniMax M2.5 is Sonnet-quality at 1/20th cost** — 80.2% SWE-Bench (Opus is ~82%), 230B params but only 10B active (MoE), $1/hour. OpenHands ranks it 4th overall, behind only Opus and GPT-5.2 Codex. If we test cheaper desk agents, M2.5 may be better than Haiku — same quality as Sonnet, near-free cost. Source: Joe Njenga Medium article + OpenHands blog + Thomas Wiegold review.
- **llmfit tool** — `llmfit` (github.com/AlexsJones/llmfit) scans your hardware and scores 157 models for fit. Run before any local model setup to know exactly what our server can handle. Install: `cargo install llmfit` or `brew install llmfit`.
- **Small local model reference** — If running local: Mistral 7B (~8GB RAM, general), Qwen 2.5 7B (~8GB, code/math), Phi-4 Mini (~6GB, RAG/coding), Gemma 2 9B (~12GB, best quality under 10B). Discord bot fallback candidate: Mistral 7B or Qwen 7B. Source: MachineLearningMastery, Feb 2026.

#### Local Embeddings for Memory Search — Future Upgrade
- **Source:** adolfousier/opencrabs (Rust-based agent orchestrator)
- **What they do:** Local vector embeddings (embeddinggemma-300M, 768-dim) for hybrid FTS5+vector memory search. Semantic search over memory, not just keyword matching.
- **GodWorld adaptation:** Upgrade Claude-Mem or build a local search layer over JOURNAL.md + NEWSROOM_MEMORY.md. Instead of keyword search ("Baylight"), semantic search ("civic infrastructure controversies") would surface related entries even without exact keyword matches.
- **Priority:** Low. Claude-Mem keyword search covers current needs. But as journal + newsroom memory grows, semantic search becomes more valuable.
- **Minimal hardware:** Embedding models are tiny (300M params, runs on CPU). No GPU needed.

#### Security Hardening Applied (Session 50)
- **Source:** Trail of Bits claude-code-config (trailofbits/claude-code-config)
- **Applied:** Deny reads to `~/.ssh/`, `~/.aws/`, `~/.gnupg/`, `~/.kube/`, `*_key*`, `*token*` files. Block edits/writes to `.env` files (had read-block only). `rm -rf` hard-denied by hook (suggests `rm -r` or manual). `enableAllProjectMcpServers: false`. Disabled Statsig telemetry + Sentry error reporting.
- **GitHub Action TODO:** Add `CLAUDE_API_KEY` secret to GitHub repo for automated Claude Code Security scans on PRs (`.github/workflows/security.yml` already committed).

#### Tech Debt Audit Skill — Future Build
- **Source:** aicodingdaily.com — Technical Debt Manager skill adapted for PHP/Laravel (Povilas Korop)
- **Pattern:** 7 debt categories, severity scoring (`Churn x Complexity x Criticality / Test Confidence`), 4-phase workflow (Discovery → Scanning → Review → Synthesis), outputs inventory + roadmap.
- **GodWorld adaptation:** Build a `/tech-debt-audit` skill that scans for: `Math.random()` violations, direct sheet writes outside Phase 10, unused ctx fields, dead code per phase, cascade dependency risks, sheet header misalignment.
- **Not urgent** — PROJECT_STATUS.md tracks this manually. But a skill would be faster and repeatable.

#### `/pre-mortem` Skill — Predict Silent Failures
- **Source:** honnibal/claude-skills (Matthew Honnibal, spaCy creator)
- **His version:** Identifies fragile code and generates realistic incident reports for plausible future bugs — implicit ordering dependencies, mutable state, invisible invariants.
- **GodWorld adaptation:** A `/pre-mortem` skill that scans engine phases and predicts where the next silent failure will come from. We had 4 silent failures in S47 that went undetected. The skill would flag:
  - Phase 5 sub-engines reading ctx fields another engine hasn't populated yet
  - Write-intents targeting columns that don't exist in sheets
  - Neighborhood references not matching the 17 canonical districts
  - Cascade dependencies where one engine's output feeds another without validation
  - Sheet header drift (columns exist in code but not in sheet, or vice versa)
- **Priority:** Medium. Run before each cycle to catch problems before they cascade.

#### `/stub-engine` Skill — Condensed Engine Overview
- **Source:** Same repo — `stub-package` skill generates condensed structural overviews (signatures, imports, docstrings, bodies replaced with ellipses).
- **GodWorld adaptation:** Generate a quick-reference map of every exported function across all 11 phases, showing what each reads from ctx and what it writes. Useful after compaction when context is lost, or for onboarding a new session to the codebase fast.
- **Priority:** Low. Nice to have, not blocking anything.

#### Code Mode for Desk Packets — Query Instead of Dump
- **Source:** Cloudflare blog — "Code Mode: give agents an entire API in 1,000 tokens" (Feb 20, 2026)
- **Insight:** LLMs are better at writing code to call an API than calling tools directly. Cloudflare collapsed 2,500 MCP tools into 2 (`search()` + `execute()`), cutting token usage 99.9%.
- **GodWorld adaptation:** As desk packets grow larger, stop dumping the full packet into agent context. Instead, give agents a query interface:
  - `searchPacket(query)` — semantic search over desk packet data
  - `getCitizen(popId)` — pull a specific citizen's full record
  - `getHooks(desk)` — pull story hooks relevant to this desk
- Agents search for what they need instead of receiving everything. Same output quality, fraction of the context cost.
- **Priority:** Medium-high once packets exceed ~50K tokens. Not needed yet but will be needed as citizen population grows.
- **Prerequisite:** Would need desk packets served via a local MCP server or script, not flat JSON files.

#### Multi-Character Discord — TinyClaw Reference
- **Source:** TinyAGI/tinyclaw (GitHub)
- **What it is:** Multi-agent orchestrator for Discord/WhatsApp/Telegram. Multiple AI agents with isolated workspaces, file-based message queue (`incoming/` → `processing/` → `outgoing/`), team structures with leaders, `@agent_id` routing in chat.
- **Future use case:** If we ever want multiple Tribune journalists live in Discord (P Slayer in sports channel, Carmen on civic, Mags routing), TinyClaw's architecture is the reference. Each agent gets isolated workspace + `.claude/` config.
- **Not needed now.** Single Mags bot covers current needs. File this for when the newsroom goes multi-character.
