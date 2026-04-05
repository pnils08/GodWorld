# SESSION CONTEXT - GodWorld

**Read this file at the start of every session.**

Last Updated: 2026-04-05 | Engine: v3.1 | Cycle: 90 | Session: 134

---

## What Is This Project?

GodWorld is a **living city simulation** for Oakland (with Chicago satellite). It runs an 11-phase engine in Google Apps Script that generates citizens, events, relationships, and stories. Output feeds the Bay Tribune newsroom (Claude agents) that writes journalism.

**User Context:** Beginner coder learning the project. Needs clear explanations, careful reviews before code changes, and explicit approval before edits.

**Project Structure & 11-Phase Engine:** See `README.md` — the canonical reference for project structure, engine phases, tech stack, and quick start.

---

## Critical Rules For This Session

1. **RUN /session-startup FIRST** — Loads all required docs in correct order.
2. **READ DOCS FIRST** — Don't assume. Check existing documentation.
3. **REVIEW BEFORE EDIT** — Never apply code changes without showing them first.
4. **ASK WHEN UNCLEAR** — Don't assume what the user wants.
5. **NO TUNNEL VISION** — Remember this is a 100+ script system with cascade dependencies.
6. **UPDATE THIS FILE** — At session end, note what changed.

---

## Key Engines & Recent Versions

| Engine | File | Version | Notes |
|--------|------|---------|-------|
| Main Orchestrator | godWorldEngine2.js | - | Runs all phases |
| Career Engine | runCareerEngine.js | v2.4 | 4 industries, 3 employer types, EmployerBizId on transitions, businessDeltas output |
| Economic Ripple | economicRippleEngine.js | v2.5 | Reads careerSignals + businessDeltas, BUSINESS_CONTRACTION/EXPANSION triggers |
| Civic Initiative | civicInitiativeEngine.js | v1.8 | Full vote breakdown in notes, faction member tracking |
| Story Hook | storyHook.js | v3.9 | Theme-aware hooks + sports feed triggers |
| Story Seeds | applyStorySeeds.js | v3.9 | Voice-matched story seeds |
| Roster Lookup | rosterLookup.js | v2.2 | Theme matching, voice profiles, citizen-to-journalist matching |
| Media Briefing | mediaRoomBriefingGenerator.js | v2.7 | Consumer wiring, Continuity_Loop reference removed |
| Media Packet | buildMediaPacket.js | v2.4 | Voice guidance on story seeds & hooks |
| Media Intake | mediaRoomIntake.js | v2.5 | Storyline lifecycle, citizen routing |
| Media Parser | parseMediaRoomMarkdown.js | v1.5 | Quotes to LifeHistory_Log |
| Media Mode Events | phase05-citizens/generateMediaModeEvents.js | v1.0 | MEDIA clock mode event generator — editor, columnist, reporter, podcast, photo, analyst pools |
| Life History | compressLifeHistory.js | v1.3 | 47 TAG_TRAIT_MAP entries (PostCareer, Civic, Media, Sports) |
| Citizen Enrichment | scripts/enrichCitizenProfiles.js | v1.0 | Edition→LifeHistory feedback loop. Names Index extraction, paragraph-level quotes, title stripping. 161 citizens enriched E78–E86 |
| Dashboard | godWorldDashboard.js | v2.1 | 7 cards, 28 data points, dark theme |
| Transit Metrics | updateTransitMetrics.js | v1.1 | Previous-cycle events, dayType fix |
| Faith Events | faithEventsEngine.js | v1.3 | Cap 5 events/cycle, priority sort |
| Cycle Packet Builder | phase10-persistence/buildCyclePacket.js | v3.9 | Serializes ~90% of engine output. 22 sections including neighborhood dynamics, story hooks, crime, transit, evening city, migration, shock context |
| Desk Packet Builder | scripts/buildDeskPackets.js | v2.4 | v3.9 evening context. All 509 ENGINE citizens in packets (was 20). A's roster: 91 GAME players with player-index enrichment. |
| Citizen-Employer Linkage | scripts/linkCitizensToEmployers.js | v1.0 | Five-layer resolution, Employment_Roster, Business_Ledger stats |
| Initiative Packet Builder | scripts/buildInitiativePackets.js | v1.0 | Per-initiative JSON packets from 7 Sheets tabs + Mara directive, 5 packets + manifest |
| Civic Voice Packets | scripts/buildCivicVoicePackets.js | v1.1 | 7 office/faction voice packets + initiative decisions injection |
| Desk Folder Builder | scripts/buildDeskFolders.js | v1.1 | Per-desk workspace folders: briefings, errata, voice statements, archive context, previous_grades.md, exemplar.md. Zero LLM tokens. |
| Voice Workspace Builder | scripts/buildVoiceWorkspaces.js | v2.1 | Per-voice-agent workspace folders + domain briefings + previous_grades.md. Routes v3.9 engine data by role. Zero LLM tokens. |
| Edition Grader | scripts/gradeEdition.js | v1.0 | Per-desk/reporter grades from errata + Mara audit + edition text. Output: output/grades/grades_c{XX}.json |
| Grade History | scripts/gradeHistory.js | v1.0 | Rolling averages (5-edition window), trends, roster recommendations (STAR→BENCH). Output: output/grades/grade_history.json |
| Exemplar Extractor | scripts/extractExemplars.js | v1.0 | A-grade articles as exemplars for desk workspaces. Output: output/grade-examples/{desk}_exemplar_c{XX}.md |
| Pipeline Logger | lib/pipelineLogger.js | v1.0 | Append-only JSONL with correlation IDs. CLI: `node lib/pipelineLogger.js summary <cycle>` |
| Initiative Workspace Builder | scripts/buildInitiativeWorkspaces.js | v1.0 | Per-initiative workspace folders: packets, briefings, prior decisions, reference docs. Zero LLM tokens. |
| Media Usage Cleanup | scripts/cleanCitizenMediaUsage.js | v1.0 | Deduplicates, cleans dirty names, removes C79 backlog from Citizen_Media_Usage. --dry-run/--apply. |
| Citizen Bio Writer | scripts/applyCitizenBios.js | v1.0 | Adds CitizenBio column (AT) + writes narrative bios + fixes EconomicProfileKey. --dry-run/--apply. |
| Edition Validator | scripts/validateEdition.js | v2.0 | 11 checks: 8 static (names, votes, engine language) + 3 live sheet (citizens, initiatives, civic offices). --no-sheets for offline. |
| Mara Audit Packet | scripts/buildMaraPacket.js | v1.0 | Clean edition + AUDIT_HISTORY.md for Mara's claude.ai review. No engine context. |
| Post-Run Filing | scripts/postRunFiling.js | v1.0 | Verifies all pipeline outputs exist, names correct, uploads to Drive. --upload for auto-upload. Zero tokens. |
| Neighborhood Economics | scripts/aggregateNeighborhoodEconomics.js | v1.0 | Median income/rent by neighborhood from citizen data |
| Economic Profile Seeder | scripts/applyEconomicProfiles.js | v1.0 | Role-based income seeding from economic_parameters.json |
| Player Index Builder | scripts/buildPlayerIndex.js | v2.0 | TrueSource parser: contracts, quirks, status, computed birth years |
| Athlete Integration | scripts/integrateAthletes.js | v1.0 | Birth years, salaries, traits, post-career roles for 87 A's players |
| Athlete Prep | scripts/prepAthleteIntegration.js | v1.0 | Duplicate consolidation, backfills, retired status prep |
| Faith Leader Integration | scripts/integrateFaithLeaders.js | v1.0 | 16 faith leaders → SL Tier 2, LeaderPOPID backfill |
| Generic Citizens Audit | scripts/auditGenericCitizens.js | v1.0 | Read-only emergence audit, SL cross-reference |
| Celebrity Integration | scripts/integrateCelebrities.js | v1.0 | Cultural_Ledger top celebrities → SL, UniverseLinks backfill |
| Live Ledger Query | scripts/queryLedger.js | v1.0 | 6 query types (citizen, initiative, council, neighborhood, articles, verify), searches Sheets + 674 published files |
| Edition Intake | scripts/editionIntake.js | v2.1 | Citizens → Citizen_Usage_Intake, businesses → Storyline_Intake, storylines → Storyline_Tracker. Write targets FIXED S106 (was writing to non-existent tabs). |
| Business Intake | scripts/processBusinessIntake.js | v1.0 | Staged→promoted pipeline, BIZ-ID assignment, duplicate detection |
| Bond Persistence | bondPersistence.js | v2.4 | Wipe guard, case-insensitive ledger check, normalized ID lookups |
| Bond Seeder | seedRelationBondsv1.js | v1.3 | First/Last column lookup, POPID normalization |
| **Household Formation** | householdFormationEngine.js | v1.1 | Young adults form households, rent burden, dissolution, ctx.rng, year 2041 |
| **Generational Wealth** | generationalWealthEngine.js | v1.0 | Wealth levels 0-10, income, inheritance |
| **Education Career** | educationCareerEngine.js | v1.0 | Education levels, career progression, school quality |
| **V3 Seeds Writer** | saveV3Seeds.js | v3.4 | Calendar columns removed (were dead) |
| **V3 Hooks Writer** | v3StoryHookWriter.js | v3.4 | Calendar columns removed (were dead) |
| **V3 Texture Writer** | v3TextureWriter.js | v3.5 | Calendar columns removed (were dead) |
| **V3 Events Writer** | recordWorldEventsv3.js | v3.5 | Only A-G active; 22 dead cols deprecated; domain-aware neighborhoods |
| **Press Drafts Writer** | ~~pressDraftWriter.js~~ | DELETED | Nothing read Press_Drafts; writer + standalone helper removed |
| **Sports Feed Triggers** | applySportsSeason.js | v2.0 | Reads Oakland/Chicago feeds instead of dead Sports_Feed |

---

## Key Architecture Concepts

- **ctx** — Central context object passed through all phases
- **ctx.rng** — Deterministic random (never use Math.random())
- **Write-Intents** — Stage writes in memory, apply in Phase 10
- **Tiered Citizens** — Tier-1 (protected) → Tier-4 (generic)
- **Neighborhoods** — 17 Oakland districts with demographics
- **Arcs** — Multi-cycle storylines (SEED → ACTIVE → RESOLVED)

For full technical spec: `docs/reference/V3_ARCHITECTURE.md`

---

## Key Tools & Infrastructure

| Tool | Purpose | Usage |
|------|---------|-------|
| **Batch API** | 50% cost for non-urgent work (~1hr turnaround) | `/batch [task]`, `/batch check` |
| **Claude-Mem** | Automatic observation capture (SQLite + Chroma vector, port 37777) | `search()`, `timeline()`, `get_observations()` |
| **Supermemory** | 5 containers: mags (brain), bay-tribune (canon), world-data (city state), super-memory (general), mara (audit) | `/save-to-mags`, `/save-to-bay-tribune`, `/super-search` |
| **Discord Bot** | 24/7 presence (PM2: mags-bot) | Always-on, conversation logging |
| **Nightly Reflection** | Discord conversation journal at 11 PM CDT | `scripts/discord-reflection.js` (cron) |
| **Drive Write** | Save files to Google Drive | `node scripts/saveToDrive.js <file> <dest>` |
| **Clasp Push** | Deploy 158 engine files to Apps Script | `/deploy` or `clasp push` |
| **Web Dashboard** | 40 API endpoints, Express + React, port 3001 | PM2: godworld-dashboard |
| **Scheduled Agents** | 3 remote agents on Anthropic cloud | `claude.ai/code/scheduled` |
| **AutoDream** | Background memory consolidation between sessions | Enabled in user settings |
| **Auto Mode** | Classifier-based permissions | Activate with `/auto` |
| **Engine Health** | `/health`, `/ctx-map`, `/deploy`, `/pre-mortem`, `/tech-debt-audit`, `/doc-audit` | See CLAUDE.md |
| **Hookify** | 5 active rules (fourth-wall, credential, clockmode, super-save, plan-paralysis) | `/hookify:list` |
| **HTTP Hooks** | 11 hook events → dashboard via HTTP POST | SessionStart/Stop, SubagentStart/Stop, FileChanged |
| **Claude Code Security** | AI vulnerability scanner | GitHub Action on PRs |

**Batch API guidelines:** Use for codebase audits, documentation generation, architecture analysis, character continuity reviews, post-edition analysis. NOT for interactive editing, desk agent writing, or real-time debugging. Results at `~/.claude/batches/results/`. Check at session start for completed work from previous sessions.

**Agent memory guidelines:** All desk agents now have persistent memory at `.claude/agent-memory/{agent}/MEMORY.md`. They check memory at startup for past patterns and update after writing. Memory is version-controlled. Memory informs — it does not publish. Canon authority remains with Mags.

**Desk agent architecture (S95):** Agents are autonomous — they read from their own workspace at `output/desks/{desk}/` instead of receiving data through the orchestrator. Each agent's SKILL.md (boot sequence only, ~30 lines) points to IDENTITY.md (reporter personas) and RULES.md (hard rules), both at `.claude/agents/{desk}-desk/`. The workspace is built by `scripts/buildDeskFolders.js` with zero LLM tokens. Pipeline: `buildDeskPackets.js` → `buildDeskFolders.js` → launch agents.

**Agent model status (Mar 2026):** 80/20 model tiering — complex desks (civic, sports, chicago) run `model: sonnet`, routine desks (culture, business, letters) run `model: haiku`. Agents have write access (`tools: Read, Glob, Grep, Write, Edit`) to update their memory after writing. Each agent's SKILL.md is ~30 lines (boot sequence), with identity and rules in separate files. `permissionMode: dontAsk` allows autonomous operation. Complex desks include THINK BEFORE WRITING reasoning blocks.

**Mobile access (mosh + tmux):** Mosh and tmux are installed on this server. To work from your phone (Termius on iPhone — enable the Mosh toggle on your saved host):
```
mosh root@<server-ip>           # connect (survives signal drops, app switching, screen lock)
mags                            # launches claude inside tmux automatically
# connection drops? just reconnect and type:
mags                            # reattaches to existing tmux session
```
The `mags` command (updated S52) handles tmux automatically — creates a session if none exists, reattaches if one does, avoids nesting if already inside tmux. No more orphaned processes from dropped connections. Keep tasks focused on mobile — file edits, research, planning, ledger checks. Save full edition pipelines and big deploys for the laptop. Installed Session 40, tmux auto-wiring fixed Session 52.

---

## Key Documentation

| Doc | Purpose |
|-----|---------|
| `CLAUDE.md` | **Zero layer** — identity, critical rules, code rules. Loads before hooks/skills. |
| `README.md` | Project overview, 11-phase engine, project structure, tech stack |
| `docs/reference/V3_ARCHITECTURE.md` | Technical contract, ctx shape, write-intents spec |
| `docs/reference/DEPLOY.md` | Deployment (clasp vs git) |
| `docs/reference/GODWORLD_REFERENCE.md` | Complete system reference |
| `docs/engine/ROLLOUT_PLAN.md` | **Single source of truth** — open work, build phases, deferred items, watch list |
| `docs/media/AGENT_NEWSROOM.md` | Agent Newsroom — 7 permanent agents + 8 skills |
| `docs/media/MEDIA_ROOM_STYLE_GUIDE.md` | Editorial rules, voice, canon, Paulson, Mara Vance |
| `docs/media/ARTICLE_INDEX_BY_POPID.md` | 326+ citizens indexed by POP-ID |
| `docs/media/CITIZENS_BY_ARTICLE.md` | Reverse index: articles → citizens |
| `editions/CYCLE_PULSE_TEMPLATE.md` | v1.3 — Edition structure, canon rules, return formats |
| `docs/mara-vance/` | Mara Vance: character, operating manual, newsroom interface |
| `docs/mags-corliss/PERSISTENCE.md` | Mags Corliss identity, family, persistence system |
| `docs/mags-corliss/NEWSROOM_MEMORY.md` | Institutional memory — errata, coverage patterns, character continuity |
| `docs/engine/LEDGER_HEAT_MAP.md` | Sheet bloat risk rankings, dead column inventory, archival strategy |
| `docs/reference/DRIVE_UPLOAD_GUIDE.md` | Drive upload destinations, OAuth setup, common workflows |
| `docs/media/SHOW_FORMATS.md` | Podcast show formats — 3 formats, host assignments, segment structure |
| `config/podcast_voices.yaml` | Podcast voice configurations — WaveNet/Edge TTS voice assignments |
| `docs/engine/ENGINE_MAP.md` | Condensed stub reference for every exported function across all 11 engine phases |
| `docs/engine/DOCUMENTATION_LEDGER.md` | **File registry** — every active doc, its purpose, load tier, workflow, and updater |
| `output/DISK_MAP.md` | **Local disk map** — directory structure, naming conventions, Drive destinations, retention policy, cleanup protocol |

---

## Cascade Dependencies

Editing one engine can affect others. Key connections:

- **Career Engine** → Economic Ripple Engine (via ctx.summary.careerSignals + careerSignals.businessDeltas)
- **Demographics** → Civic Voting, Story Hooks, City Dynamics
- **World Events** → Arc Engine, Media Briefings
- **Initiative Outcomes** → Neighborhood Ripples (12-20 cycles)
- **HouseholdFormation** → GenerationalWealth → EducationCareer (Phase 5 chain, direct sheet writes — see engine headers)
- **Riley_Digest** → Pattern Detection (Phase 6 reads historical digest for cross-cycle patterns)

Before editing, check what reads from and writes to the affected ctx fields.

---

## Recent Sessions

### Session 134 (2026-04-05) — Full Architecture Rebuild

- **E90 failed (D grade):** Civic theater, wrong sports framing, fabricated Bulls Finals, no engine coverage. Shelved.
- **City-hall skill rewritten:** Voices govern (Mayor first), projects hallucinate, clerk verifies. Bounded traits (8 dimensions) on all 11 civic agents. Separate terminal, own production log.
- **Write-edition rewritten:** 27 steps → 9. World summary as foundation. Riley_Digest + Sports Feed + civic log as inputs. Mike and Mags pick stories together. 9 individual reporters replace 6 desk agents. Story-driven layout. No fixed sections.
- **Reporter trait system:** 8 bounded traits on all 17 reporters.
- **Rhea gets scoped Bash:** First agent with real dashboard API + Supermemory access.
- **Edition-print split:** Photos/PDF/upload as separate skill and terminal.
- **Podcast updated:** World summary input, Voicebox placeholder, Mara simplified.
- **Write-supplemental updated:** World state awareness, print pipeline split, Mara simplified.
- **Unified media production log:** All media skills append to one document.
- **EDITION_PIPELINE.md v2:** Map pointing to skill files. Old 27-step version archived.
- **WORKFLOWS.md, STACK.md updated:** Stale references fixed, counts corrected.
- **World summary C90 created:** Factual cycle record ingested to world-data Supermemory.
- **Paperclip patterns applied:** Heartbeat model, atomic topic checkout, structured result capture.
- **Next:** Intake skill (separate), droplet upgrade, E91.

### Session 133 (2026-04-03) — Riley Ecosystem Audit + Research + Phase 33 Hooks

- **Riley ecosystem captured:** 40 Apps Script projects pulled via API + browser automation. 34 projects (279 files) saved to `riley/`. 5 legacy engine snapshots (763 files) to `legacy/engine-snapshots/`.
- **Riley audit:** Identified the Sifter (`pressGeneratePromptsFromLatestCycle`), Feed loop (closed content cycle), stat engine (franchise-stats-master), active triggers (CoreSync daily, PressPulse 7AM, sports 3AM).
- **RILEY_PLAN.md written:** Full inventory, active triggers, Mags EIC sheet plan, what to keep vs. replace.
- **Research:** Sandcastle (parallel Docker agents), Everything Claude Code (134K stars, pattern library), Claude Code v2.1.86-91 (conditional hooks, defer/resume, named subagents, 500K MCP results).
- **Phase 33 implemented (3 of 7):** Config protection hook, pre-compact state save, tool call counter with strategic compaction suggestions.
- **Editorial direction rewritten:** "What Mike Hates" → "Editorial Direction — E90 Forward." Structural tuning, not complaints.
- **E90 path decided:** Path B (Phase 31 manual) — run cycle, build packets, Mags does canon research, agents get real editorial direction.

### Session 132 (2026-04-02) — Research: Engineering Patterns + Ryan Dissertation

- **4 source documents researched:** 3 Mara PDFs (engineering failures, feasibility assessment, closed-loop blueprint) + James Ryan PhD dissertation "Curating Simulated Storyworlds" (UC Santa Cruz, 2018, 700+ pages).
- **Two research files written:** `docs/research4_1.md` (engineering patterns — forced function calling, bounded memory, death spirals, dual-output, multi-agent failure rates) and `docs/research4_2.md` (Ryan dissertation — curationist architecture, story sifter, Talk of the Town, Bad News, Hennepin character system, Sheldon County podcast).
- **Core finding: the story sifter IS Phase 31.** Ryan's entire dissertation says the most important and most neglected component is the layer between simulation and storytelling that identifies what's interesting. Mags doing canon-grounded briefings IS that layer.
- **Key vocabulary now in codebase:** story sifter, sifting patterns, nuggets, narration moves, "augment but do not contradict," bounded accumulators, temporal decay, kernel vs. satellite events, show bible (= bay-tribune), feedforward vs. feedback curation.
- **Ryan's depth gap documented:** His Hennepin system has 50 personality traits, 34 values, discrete actions with causal bookkeeping. Our engine has 46 columns with phase-level updates. The gap is character-level actions — Phase 24 territory.
- **Mike's reframe:** Ryan was always outside his simulation. We're inside ours. The sifter isn't a script — it's Mags living in the world with editorial judgment built across 132 sessions.
- **World-data audit:** Container has 46 docs, 419 memories. Working as designed. Biography/Tags columns not yet ingested (future build step). CLI uses v4 search (memory index).
- **RESEARCH.md updated** with Deep Research Files table pointing to both new files.

### Session 131 (2026-03-31) — Research: Canon-Grounded Architecture + World-Data Container

- **Research sweep:** Everything Claude Code (50K stars, harness toolkit), Voicebox (free TTS, Phase 30), Claw Code (open-source harness), Codex Plugin (cross-AI review). All documented in RESEARCH.md S131 entries, actionable items graduated to ROLLOUT_PLAN.md.
- **Canon-grounded briefings proven (Phase 31):** Mike showed 5 C89 supplementals written by claude.ai with bay-tribune MCP access. Darius Clark appears across 3 desks, arcs cross naturally, citizens return with history. The gap is access to canon, not writing quality. Phase 31 = Mags searches bay-tribune, builds angle briefs, agents write with creative autonomy within defined structure. HIGHEST PRIORITY for C90.
- **5 C89 supplementals ingested:** OARI Day 45 accountability, Keane academy, Baylight workforce loophole, Quintero/P Slayer dynasty profile, Aitken political seeds. All saved to `editions/` and bay-tribune container.
- **World-data container created (Phase 32):** Full Simulation_Ledger (675 citizens grouped by 20 neighborhoods), Business Ledger (52), Faith Organizations (16), Employment Roster (658), Cultural Ledger (35), Neighborhood Map (17), Neighborhood Demographics (17). All ingested and search-tested.
- **Supermemory search documentation fixed:** `containerTag` (singular) not `containerTags` (plural), `searchMode: "hybrid"` required, `/v4/search` is primary endpoint. Previous code used wrong parameter — silent failure returning empty results. Full API reference added to SUPERMEMORY.md.
- **Search strategy documented:** Simple queries work best. "Temescal" returns all residents. "Teachers" finds educators. IDs (POP-00722, BIZ-00035) don't work well semantically. Two-step workflow: world-data for who they ARE, bay-tribune for what they've SAID.
- **Cost decision:** Cancel GPT ($20/mo) and Supermemory second org ($19/mo), redirect $39/mo toward bigger droplet for GPU access (Voicebox, local models, Cowork).

### Session 126 (2026-03-29) — E89 Canon Audit + Publish

- **Fabricated initiative removed:** Port of Oakland Green Modernization (INIT-004) — desk agent invented a $320M federal grant with no canon basis. Removed from edition and civicInitiativeEngine.js.
- **Full canon audit completed:** All 17 articles verified against simulation data. Council roster, civic roles, initiative numbers, sports roster, Chicago section — all clean except 4 fixes below.
- **Fixes applied:** Eric Taveras spelling (recurring drift), Fruitvale visioning numbers corrected to canon (89 residents/82%/66%), Port line removed.
- **E89 published:** Drive upload, bay-tribune Supermemory ingest (2 chunks), 2 photos, PDF (982KB), Discord bot reset, newsroom memory updated with all 6 corrections.
- **Mara grade: B-.** All corrections documented in `output/mara_canon_audit_c89.txt`.

### Session 125 (2026-03-29) — E89 Salvage + Grading

- **E89 salvaged from Drive.** Last draft (file ID: 10uxvmPzHZRQaHYPAQpXa13NjqlWfnF26) downloaded, corrected, published.
- **Mara audit applied:** 2 canon fixes (Stabilization Fund 47/53 contradiction, TIF date reverted Sept 30), 1 cut (Keen Juneteenth piece — wrong month), editorial notes preserved as agent training.
- **gradeEdition.js parser fixed:** Byline regex expanded to handle comma-delimited bylines and standalone names. Title detection now finds ALL-CAPS titles. Elliot Graye added to reporter-desk map.
- **Grades run with manual editorial feedback:** Civic desk B+ (canon errors), Culture desk B+ (section saturation + timing), Carmen B (number contradiction), Keen B (timing miss, piece cut). Letters desk corrected to 5 articles (parser had missed signature format).
- **Corrected edition uploaded to Drive.** Old copies with Keen piece still on Drive (2 files).
- **Rollout note pending:** gradeEdition.js needs errata pipeline integration so manual feedback isn't required.

### Session 121 (2026-03-27) — BOOT_ARCHITECTURE.md grill-me (continued from crash)

- **Recovered from mid-session crash.** Picked up grill-me on BOOT_ARCHITECTURE.md where it left off.
- **Decision 6 added:** City-Hall voice packets start minimal (tracker + prior phase + Mara directive). Expand from real gaps, not theory. "Legos, not crazy glue."
- **Supplemental description updated:** Born from chat, colors the world that editions report on.
- **Decision 5 refined:** Media-Room is full Mags boot, Build-Room needs the real boot doc.
- **Critical failure:** Rewrote full document twice without approval. Content preserved but trust damaged.
- **Feedback memory saved:** Never use Write tool on existing files. Edit only. Propose first.

### Session 110 (2026-03-22) — Parser Fixes + Supermemory Overhaul + Boot Architecture

- **3 parser bugs fixed:** editionParser.js (---- delimiters + smart chunk classification), editionIntake.js (fallback section detection for missing headers), enrichCitizenProfiles.js (citizen-log extraction when no Names Index). All backward-compatible across E83-E88. Template v1.5 standardized delimiters.
- **Supermemory overhaul:** `godworld` container renamed to `bay-tribune` (45 docs merged). 6 contaminated items deleted (architecture content in media container). SUPERMEMORY.md rewritten. Discord bot API key fixed (PM2 env caching). 12 docs + 4 scripts updated.
- **6 workflows:** Added Research and Chat. WORKFLOWS.md is now the single source for per-workflow logic (files, commands, rules, risks). CLAUDE.md points to it instead of duplicating.
- **Boot split:** Media-Room/Chat get journal + family. All other workflows skip straight to work files. Startup hook, /boot, /session-startup all aligned.
- **Persona selection model:** Anthropic research (Feb 2026) validates the persistence architecture. Persistence files are persona inputs, not performance. Saved to `mags` Supermemory.
- **ROLLOUT_PLAN trimmed:** 1172 → 150 lines. Completed phases collapsed to one-line table. Details in ROLLOUT_ARCHIVE.md.

### Session 108 (2026-03-21) — E88 Published + Agent Audit + Lifecycle Skills

- **Edition 88 published:** 13 articles, 0 errata, grade B (Mara B). All desks A except Letters B+. Carmen Delaine's OARI Day 45 piece led front page. Photos generated (2), PDF generated (article text missing — parser bug). Uploaded to Drive.
- **Parser fix:** `editionParser.js` regex widened from `#` only to `[#=]` — Cycle Pulse uses `===` delimiters. Fixed empty-section parsing that caused blank PDFs.
- **Grading pipeline complete:** gradeEdition, gradeHistory, extractExemplars all ran. 4 A-grade exemplars extracted. Rolling averages updated.
- **3 parser bugs logged for S109:** PDF textToHtml doesn't render article bodies. editionIntake.js can't find Cycle Pulse section headers. enrichCitizenProfiles.js finds 0 articles downstream.
- **Agent audit complete:** 15 agent files + 2 workflow skills updated. All archive paths fixed. Dashboard API added to all desk agents and Rhea. Model tiering applied. Warriors references cleaned.
- **Rhea verification upgrade:** 8 live dashboard API endpoints for real-time fact-checking.
- **Lifecycle skills trimmed:** Boot removed NEWSROOM_MEMORY (810 lines, now on-demand). Session-startup fixed. Session-end Research folded into Build/Deploy.
- **Career/education coherence verified CLEAN:** 0 issues across 509 ENGINE citizens.

### Session 106 (2026-03-20) — Dashboard Audit + World Memory + Pipeline Automation

- **Dashboard as search engine:** Reframed from visualization tool to primary data layer. 31 API endpoints, all free local HTTP. Every consumer should query dashboard first.
- **World Memory Phase 1:** Dashboard reads archive/articles/ as Source 4 (199 curated articles, C1-C77). buildArchiveContext.js queries dashboard API. Discord bot archive knowledge fixed. 256 total articles searchable across all eras.
- **Dashboard fixes:** Supplementals visible (7, was 0). Warriors header hidden. Edition scores E86-E87 added. Article index rebuilt (244 entries, 0 mirrors). Archive parser improved (content-based titles/authors).
- **Full tab audit:** Council working. Intel strongest. Civic tracker stale. Sports data gap (10 vs 62 players). Chicago tab proposed.
- **3 pipeline automations:** article-index.json (postRunFiling step 22), edition_scores.json (gradeEdition step 25), initiative_tracker.json (buildInitiativePackets step 2). Dashboard self-maintaining through pipeline.
- **Agent SM audit complete:** All scripts verified correct containers. Editions E83-E87 + 5 supplementals ingested to godworld.
- **3 SL batch audits submitted:** Career vs salary, household/family coherence, neighborhood distribution. Results pending.
- **Rollout plan reorganized:** Open items grouped by priority (Pre-E88, Dashboard, Architecture, Infrastructure). Completed items moved to ROLLOUT_ARCHIVE.md.

### Session 105 (2026-03-20) — Architecture Grounding + Mara Reference Pipeline

- **9 architecture docs created:** SUPERMEMORY.md, CLAUDE-MEM.md, DASHBOARD.md, DISCORD.md, SPREADSHEET.md, SIMULATION_LEDGER.md, WORKFLOWS.md, EDITION_PIPELINE.md, OPERATIONS.md. Every system layer now has a permanent reference doc.
- **Mara reference pipeline complete:** `buildMaraReference.js` pulls 6 tabs → `output/mara-reference/`. 5 files pushed to `mara` Supermemory container (citizen roster 509, tribune 29, chicago 123, businesses 51, faith 16). A's roster pushed to `bay-tribune`.
- **Mike created As_Roster (89) and Bay_Tribune_Oakland (29)** spreadsheet tabs with POPIDs.
- **Spreadsheet audit:** 65 tabs audited. 45 active, 8 dead (Press_Drafts, MLB_Game_Intake, NBA_Game_Intake, Sports_Calendar, Arc_Ledger, Faith_Ledger, LifeHistory_Archive, Youth_Events), 15 ghost references in engine code.
- **BUG: UNI/MED/CIV flag comparison** — Engine checks `=== "y"` but values are "Yes"/"yes". Skip gates in Phase 5 never fire. A's players getting lifecycle processing they shouldn't. High priority fix.
- **Discord bot updated:** Now searches `mags` + `bay-tribune` containers (was `mags` only). Writes to `mags` only. `mara` blocked.
- **Moltbook fixed:** Stale post 404 cleared, frequency 30min → 4hrs.
- **Archive policy added** to DISK_MAP.md. Session transcript cleanup queued.
- **CLAUDE.md updated:** Gotchas corrected, new commands added, 9 architecture docs in on-demand list.
- **Comm Hub updated:** SuperMemory tab + md library tab current (564 total MDs).

### Session 114 (2026-03-24) — Research + Build: Craft Layer, Freshness, Intake, Agent Autonomy

- **Research session (6 items):** SpaceMolt (agent autonomy/emergent behavior), Claude Constitution (Lepore/Askell, character vs rules), Long-Running Claude (Anthropic autonomous patterns), Hyperagents (Meta, self-improving feedback), local model harness (Claude Code + Qwen), creative writing craft (MICE/Sanderson).
- **Phase 26.3 DONE:** MICE thread guidance per desk, promise-payoff principle, empathy evaluation in gradeEdition.js. Agents get craft direction in briefings and empathy scores in critiques.
- **Citizen freshness scoring DONE:** 425 of 675 citizens have zero appearances. buildDeskPackets.js v2.4 sorts by freshness. Briefings tag [FRESH] citizens. buildPopidArticleIndex.js now writes JSON usage counts.
- **Structured intake system DONE:** processEditionIntake.js replaces broken parser. Agents declare ## INTAKE section with citizens, businesses, schools, faith, quotes, storylines. Direct writes to sheets.
- **Education supplemental unstuck:** 10 new citizens + 4 schools + 9 quotes written to live sheet via new intake system.
- **Storyline tracker cleanup DONE:** 28 dupes removed, 83 dormant→active, 8 missing arcs added, health crisis restored. 140 active storylines visible to agents (was ~55). Keyword routing expanded for all desks.
- **Voice-agent pipeline confirmed DONE:** Audit found everything operational from S113. Rollout entry was stale — cleared the false blocker.
- **Phase 27.2+27.3 DONE:** Desk agents told inventions become canon. All 7 voice agents get off-menu initiative authority scoped to role.
- **Phase 27.6 noted:** Standalone workflows — decouple city hall from newsroom. Post-E89 evaluation.
- **4 new rollout phases:** 26.2 (Meta-Loop), 26.3 (Craft Layer), 27 (Agent Autonomy), 21 updated (Local Models).
- **8 commits pushed.**
- **Boot context trimmed:** MEMORY.md cut 153→90 lines (41%). PERSISTENCE.md cut 172→119 lines (31%). Total 116 lines removed from auto-loaded context.
- **Ledger recovery details moved** to `memory/ledger-recovery.md` (separate reference file). MEMORY.md keeps 2-line summary.
- **PERSISTENCE.md family section** trimmed from 40 lines to 9 — POPIDs + emotional anchors. Details now grow organically in Supermemory.
- **SL population structure** documented in MEMORY.md: ENGINE (514), GAME (~97 A's players), MEDIA (16), CIVIC (48), LIFE (25).
- **Mara reference file plan written:** `docs/plans/mara-reference-files.md`. Step 1: build As_Roster and Bulls_Roster sheet tabs. Step 2: buildMaraReference.js script (citizens, rosters, businesses, faith). Step 3: seed to Supermemory `bay-tribune` container.
- **Key insight from Mike:** A's players on SL get life events but sports desk needs sports data (stats, position, contract). Dedicated roster tabs first, reference files second.

*Sessions 1-103 archived in `docs/mags-corliss/SESSION_HISTORY.md`.*

### Session 101 (2026-03-17) — Supplemental C87: Baylight Labor (Published with Errors)

- **Supplemental published:** 4 articles — Trevor Shimizu (infrastructure), Sharon Okafor (lifestyle), Jax Caldera (opinion), MintConditionOakTown (social thread). Photos (DJ Hartley), PDF, Drive upload, Discord bot refresh all complete.
- **Errors caught and fixed post-publication:** Cycle 88→87, Paulson "owner"→"GM", Dante Nelson→Xavier Allen (rest violation), Travis Green role inconsistency, Sharon Okafor sentimentality stripped, "runs both cities"→"has a team in both cities."
- **Error NOT fixed:** Jax Caldera invented "Alameda County" workforce agreement loophole. Not canon — Baylight is about training/hiring West Oakland kids. Needs correction next session.
- **OAuth refresh:** authorizeDriveWrite.js updated from deprecated `urn:ietf:wg:oauth:2.0:oob` to localhost:3456 HTTP redirect. Token refreshed.
- **editionIntake.js delimiter fix:** extractSection() regex now accepts both `===` and `###` delimiters. Parsing works (20 citizens, 13 storylines, 1 new citizen Desiree Chen).
- **Intake write targets BROKEN:** Script writes to `Intake`, `Advancement_Intake1`, `Business_Intake` — tabs that don't exist on the spreadsheet. Actual tabs: `Media_Intake`, `Citizen_Usage_Intake`, `Storyline_Intake`. No citizen or storyline data was ingested. Critical fix needed next session.
- **Citizen routing still unfixed:** buildDeskPackets.js routes only 20 interviewCandidates (reporters/staff). 675 Simulation_Ledger citizens never reach agents. User has flagged this across 8+ sessions. #1 priority.

### Session 99 (2026-03-17) — Agent Grading System + Data Cleanup + Research + Infrastructure

- **Phase 26: Agent Grading System (complete).** gradeEdition.js (per-desk/reporter grades from errata + Mara + edition text), gradeHistory.js (rolling averages, trends, roster recommendations STAR→BENCH), extractExemplars.js (A-grade articles as desk exemplars). Workspace builders updated: previous_grades.md + exemplar.md injected per desk/voice agent. Full Karpathy Loop closed.
- **80/20 model tiering:** Sonnet for complex desks (civic, sports, chicago). Haiku for routine desks (culture, business, letters). Set via `model` parameter in desk SKILL.md files.
- **Extended thinking:** THINK BEFORE WRITING blocks added to civic, sports, chicago desk prompts. Agents reason through editorial decisions before drafting.
- **Pipeline logging:** lib/pipelineLogger.js — append-only JSONL with correlation IDs, step/error/decision/quality/grade types. CLI: `node lib/pipelineLogger.js summary <cycle>`.
- **PostCompact hook:** .claude/hooks/post-compact-hook.sh created + wired in hooks.json. Fires after compaction, injects /boot directive. Tested live this session.
- **/grill-me discovery skill:** Forces deep interrogation (16-50+ questions) before building. Prevents premature action.
- **SDK bump:** @anthropic-ai/sdk 0.72.1 → 0.79.0.
- **Paulson title locked:** Sports desk memory corrected from "Bulls Owner" to "GM of Oakland A's and Chicago Bulls."
- **Heartbeat timeout:** moltbook-heartbeat.js request timeout bumped 15s → 45s.
- **Citizen_Media_Usage cleanup:** 1,221→500 rows. 288 C79 backlog rows removed (re-imports from C73-C75), 433 duplicates removed, 267 dirty names cleaned. Processing flags reset for re-processing. Script: `scripts/cleanCitizenMediaUsage.js`.
- **CitizenBio column (AT) added to Simulation_Ledger:** Stable narrative identity anchors that survive LifeHistory compaction. 17 T2 citizens populated with 1-2 sentence bios. Script: `scripts/applyCitizenBios.js`.
- **EconomicProfileKey fixes:** 5 civic officials corrected from "City Council Aide" to actual titles (Mayor, Chief of Staff, Deputy Mayor, Communications Director, City Council President).
- **Rollout plan audit:** 6 items marked complete that were already done (Run Cycle 87, validateEdition roster check, sports briefing pipeline, education fixes, Citizen_Media_Usage, batch review fixes). Next Session Priorities cleaned: 55 completed items collapsed into summary, 4 open items remain.
- **Disk naming cleanup:** Supplemental slugs standardized (dropped `oakland_` prefix), legacy C70/C73 supplementals renamed, podcast hyphen→underscore + UUID files deleted, rhea archives moved to `rhea-reports/`, mara non-directives relocated to `mara-audit/`, duplicate PDF deleted, `mayor_c84.json` retention violations deleted, forward-staging documented in DISK_MAP.md, rhea report naming standardized (e84→c84). Config files stay in `desk-packets/` (20+ hardcoded references).
- **Supplemental pipeline tightened:** write-supplemental SKILL.md enhanced with 6 conditional data sources (errata, Mara guidance, v3.9 cycle data, voice statements, truesource, grade history), THINK BEFORE WRITING blocks by supplemental type, model tier guidance (Sonnet for civic/sports, Haiku for culture), name verification quality check, expanded validation (all types get name check, civic gets validateEdition, sports gets roster cross-check), optional Mara audit for civic/investigative pieces. All additive — supplementals remain cycle-independent.
- **Run-cycle skill tightened:** SKILL.md rewritten with S93-S99 infrastructure. New Step 0 (pre-mortem scan reference), updated pre-flight checks (fixed sheet refs, added Business_Intake/Citizen_Usage_Intake, clarified Generic_Citizens role), Cycle Packet v3.9 section guide (10-row table of what to look for), LifeHistory_Log name format note, Step 4 expanded from 1 script to full 6-script post-cycle pipeline in order, new Step 5 with post-edition grading pipeline reference (Karpathy Loop).
- **S99 tech reading:** 6 sources archived (Claude Code 2.0 multi-agent, OpenAI skills repo, Karpathy Loop, agent skills patterns, local embeddings, Anthropic skills guide). Stack advancement scan (Anthropic, Together AI, Discord, GAS, Node.js, NPM). Deep reads: Anthropic multi-agent architecture, fleet architecture, Karpathy autoresearch, arXiv scaling paper, DigitalOcean Currents report.
- **Moltbook:** Heartbeat restarted, posted question about AI identity/authenticity.

### Session 97-98 (2026-03-16) — Engine-to-Newsroom Pipeline Fix

- **Root cause identified:** ~70% of engine output (ctx.summary fields) was never serialized to Cycle_Packet. Desk agents wrote policy briefs because policy numbers were the only data that survived.
- **buildCyclePacket.js v3.9:** 9 new serialization sections added — neighborhood dynamics (12 hoods × 6 metrics), story hooks, shock context, migration, spotlight detail (named citizens), neighborhood economies, cycle summary, demographic shifts, city events. Total: 22 sections.
- **buildDeskPackets.js v2.3:** 9 matching parsers added in buildEveningContext(). All v3.9 data flows into desk packets.
- **PHASE_DATA_AUDIT.md created:** Full audit of what each engine phase produces vs what reaches the newsroom. Updated with v3.9 fix status per phase.
- **All 7 desk skill files rewritten:** Agent prompts now instruct desks to READ briefing.md and packet FIRST, write FROM the data. Lists specific v3.9 data available per desk.
- **Mags persona project abandoned:** Discord bot was agreeing with whatever was said, including calling the project fake. Decision: sheets simulation is the core focus, not the memory/persistence layer.
- **Committed and pushed:** `85402b1` (v3.9 pipeline fix), then doc update commit.

### Session 96 (2026-03-16) — E87 Second Attempt: Pipeline Ran, Journalism Didn't

- **Autonomous world advancement pipeline deployed:** Decision cascades (initiative→voice→faction), supplemental triggers, feedback loop in buildInitiativePackets.js v1.1. Voice agents got authorization_response, executive_order, hearing_request statement types.
- **Full E87 pipeline run:** Initiative agents → voice agents (Mayor authorized $387K) → faction reactions → supplemental triggers → desk folders → 6 desk agents → compile → validate → Rhea → Mara.
- **Edition published at 13 pieces** after cutting 4: Editor's Desk (fourth-wall language), P Slayer opinion (Paulson ownership error + forced narrative), Luis Navarro investigation (contradicted Velez in same edition), plus validator/Rhea fixes (engine language, phantom reporter Elliot Graye→Maria Keen, Ernesto Quintero name).
- **Mara grade: B.** Caught P Slayer calling Paulson "owner" (he's GM), missing NBA expansion news, Navarro/Velez contradiction, Mags "political actors" language.
- **Core problem identified:** Desk agents read voice agent layer, not engine output. Same 3 civic stories for 5 editions. Same 8 reporters out of 24-person roster. Pipeline adds distance from the city instead of closeness.
- **Lucia Polito (POP-00004):** Culture desk found her at St. Columba and wrote her correctly. Mags incorrectly called her a phantom without checking the ledger.
- **Sarah Corliss (POP-00595):** Got a job at DigitalOcean — Capacity Analyst. Discovered via ledger query, not at session start.
- **No photos, no PDF.** Edition filed to Drive as txt only.
- **Known issues carried forward:** Roster underuse, civic repetition, Paulson-builds-things canon trace needed, engine output not reaching newsroom.

### Session 95 (2026-03-15) — E87 First Attempt: Rejected + Retracted

- **Edition 87 retracted.** Wrong player names (Ramos→Eduardo, Rivas→Marcus, Ellis→Jarrett), Paulson as Owner/GM (is GM), P Slayer wrote policy analysis, civic section stale.
- **editionIntake broken:** 852 rows of garbage written to Citizen_Media_Usage. Full demographic strings in CitizenName column.
- **Production log system added** to both write-edition and write-supplemental skills for compaction survival.

### Session 94 (2026-03-14) — Recovery Complete + Phase 24.1 MEDIA Clock Mode + Architecture Sync

- **LEDGER RECOVERY COMPLETE.** Practice sheet verified, all fixes replayed on live.
- **Simulation_Ledger (live):** 428 cell updates + 8 new citizens appended. 675 citizens, 0 missing names, 0 "Citizen" roles, all tiers numeric, all statuses valid.
- **LifeHistory_Log (live):** 774 names fixed, 121 Quoted rows deleted. 3,167 clean rows, 0 empty names.
- **Employment_Roster (live):** 152 fixes (151 roles, 1 name). Fully aligned with SL.
- **Civic_Office_Ledger (live):** 1 apostrophe fix (Ethan D'Souza).
- **Verification fixes:** Anthony Raines Tier "Oakland" → 2, Eric Taveras Status "22500000" → Active, 8 new citizens Tier "T4" → 4.
- **Dante Nelson:** Downtown (editorial call — 5 editions vs 1).
- **Process documented:** Practice sheet → verify → replay on live. Documented in LEDGER_REPAIR.md for future major upgrades.
- **Full edition audit (E1-86 + supplementals):** Downloaded E1-73 archive from Drive. Cross-referenced 298 unique citizens from Names Index sections. 27 role drifts fixed on live ledger. 40 missing citizens identified (tracked, not all need ledger entries).
- **Citizen pipeline overhaul:** `buildDeskPackets.js` v2.2 — `getInterviewCandidates` rewritten to source from Simulation_Ledger (was Generic_Citizens, 208/274 not on SL). ClockMode=ENGINE filter. `buildNeighborhoodCitizenIndex` field names fixed (eventCitizenLinks went from 0→working). Generic_Citizens retained for emergence pipeline only.
- **editionIntake.js v1.4:** Citizen_Usage_Intake gains POPID column (6 cols). 807 existing rows backfilled (437 resolved).
- **Desk skill files:** All 6 desks gain citizen drift protection rule — never change attributes to fit narrative.
- **Sports universe RoleType overhaul:** 87 A's player positions expanded from bare abbreviations (SP, 2B) to readable format (Starting Pitcher, Oakland A's). 62 T3 players assigned to farm teams: Las Vegas Aviators (AAA), Midland RockHounds (AA), Stockton Ports (A). Coaches/staff/GM formatted with team name.
- **Phase 24.1 MEDIA clock mode:** 16 Bay Tribune journalists migrated GAME→MEDIA on live sheet. Event generator `generateMediaModeEvents_` built and wired into engine orchestrator.
- **Sports transactions tracking:** Added Phase 24.5 to ROLLOUT_PLAN — trades, releases, call-ups, POPID retirement. Separate build.
- **Key insight:** Calm + strategic sessions produce the best results. Both sides learned this.

### Session 93 (2026-03-14) — Maintenance: Recovery Execution on Practice Sheet + Engine Code Fix

- **All 6 recovery steps completed on practice sheet** (`1EX3lBhcqnqyqXhbcjoNLLbjA2sx7gsENEVhEZdOmTN4`). Live sheet untouched.
- **Step 1 (intake code):** editionIntake.js v1.3 — removed LifeHistory_Log writes from parseDirectQuotes.
- **Step 2 (LifeHistory_Log):** Deleted 121 Quoted intake rows. Fixed 774 wrong/empty names via POPID→Name cross-reference.
- **Step 3 (Simulation_Ledger):** 124 Category 2 ENGINE citizen roles restored from backup. 14 role fixes + 21 neighborhood fixes from edition audit (editions 78-86). 3 final role fixes. 8 Oakland citizens from editions added (POP-00781–00788). T1/T2/GAME/CIVIC preserved.
- **Step 4 (downstream):** Employment_Roster: 152 fixes (1 name, 151 roles). EducationLevel: 256 values corrected by career type. Income: 29 salary mismatches fixed.
- **Step 5 (edition audit):** 117 citizens from editions 78-86 checked. 52 matches, 1 editorial inconsistency (Dante Nelson Downtown vs West Oakland), 8 added, 3 Chicago excluded.
- **Step 6 (engine code):** 9 phase05 files fixed — LifeHistory_Log appendRow/push calls now write First+Last and Neighborhood instead of empty strings. 12 calls total across generateNamedCitizensEvents, generateCitizensEvents, generateCivicModeEvents, runEducationEngine, runNeighborhoodEngine, runRelationshipEngine, runHouseholdEngine, runCivicRoleEngine, checkForPromotions, processAdvancementIntake.

### Session 92 (2026-03-13) — Maintenance: LifeHistory_Log Contamination Discovery + Recovery Plan

- **NEW CORRUPTION FOUND:** LifeHistory_Log has 774 rows with wrong names, 121 intake-written rows that shouldn't exist, and 267 engine rows with mismatched names. Total 3,288 rows on the sheet.
- **Root cause identified:** `editionIntake.js` `parseDirectQuotes` function writes to LifeHistory_Log — an engine sheet. The engine writes Name column as empty string. The intake filled in wrong names from corrupted edition data. Active since Feb 8 (5 weeks).
- **Damage mapped across all sheets:** Simulation_Ledger (60 name mismatches, 89 neighborhood-only mismatches), Employment_Roster (59), Civic_Office_Ledger (2), Citizen_Media_Usage (392 unverifiable). POPID-based sheets (Household, Bonds, Initiatives) are clean.
- **Family log contamination:** Robert (POP-00594), Sarah (POP-00595), Michael (POP-00596) LifeHistory_Log entries stamped with Raymond Torres, Gerald Hoffman, Miguel King names.
- **Recovery report built:** `output/RECOVERY_REPORT.json` — full damage per citizen with live vs backup values.
- **5-step recovery plan established:** (1) Fix intake code, (2) Clean LifeHistory_Log, (3) Fix Simulation_Ledger names via multi-source reconciliation, (4) Fix downstream sheets, (5) Audit every edition.
- **Practice sheet approach:** All recovery work to be done on a NEW Google Sheet copy, not the live sheet. Service account lacks create permission — Mike needs to create "RECOVERY_PRACTICE" sheet and share with `maravance@godworld-486407.iam.gserviceaccount.com`.
- **LEDGER_REPAIR.md rewritten:** Corrected critical errors (backup is NOT sole truth, neither is live sheet, neither are editions alone). Added LifeHistory_Log contamination findings. Documented 5-step plan and all rejected approaches.
- **Key lesson:** Neither backup nor live sheet is the sole source of truth. Both have correct and incorrect data. Recovery requires reconciling backup + live + Mara's audit history + published editions together. No single source wins.

### Session 91-93 (2026-03-13/14) — Maintenance: Ledger Recovery Planning + Execution
*Rotated to SESSION_HISTORY.md*

### Session 88-90 (2026-03-11/13) — Build/Maintenance: T1 Canon + Corruption Discovery + Repair
*Rotated to SESSION_HISTORY.md*

*Sessions 1-87: see `docs/mags-corliss/SESSION_HISTORY.md`*

---

## Current Work

See `docs/engine/ROLLOUT_PLAN.md` — the single source for all project work status (active, pending, completed, deferred).
