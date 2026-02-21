# SESSION CONTEXT - GodWorld

**Read this file at the start of every session.**

Last Updated: 2026-02-21 | Engine: v3.1 | Cycle: 83 | Session: 52

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
| Career Engine | runCareerEngine.js | v2.3.1 | 4 industries, 3 employer types |
| Economic Ripple | economicRippleEngine.js | v2.3 | Reads careerSignals |
| Civic Initiative | civicInitiativeEngine.js | v1.8 | Full vote breakdown in notes, faction member tracking |
| Story Hook | storyHook.js | v3.9 | Theme-aware hooks + sports feed triggers |
| Story Seeds | applyStorySeeds.js | v3.9 | Voice-matched story seeds |
| Roster Lookup | rosterLookup.js | v2.2 | Theme matching, voice profiles, citizen-to-journalist matching |
| Media Briefing | mediaRoomBriefingGenerator.js | v2.7 | Consumer wiring, Continuity_Loop reference removed |
| Media Packet | buildMediaPacket.js | v2.4 | Voice guidance on story seeds & hooks |
| Media Intake | mediaRoomIntake.js | v2.5 | Storyline lifecycle, citizen routing |
| Media Parser | parseMediaRoomMarkdown.js | v1.5 | Quotes to LifeHistory_Log |
| Life History | compressLifeHistory.js | v1.3 | 47 TAG_TRAIT_MAP entries (PostCareer, Civic, Media, Sports) |
| Dashboard | godWorldDashboard.js | v2.1 | 7 cards, 28 data points, dark theme |
| Transit Metrics | updateTransitMetrics.js | v1.1 | Previous-cycle events, dayType fix |
| Faith Events | faithEventsEngine.js | v1.3 | Cap 5 events/cycle, priority sort |
| Desk Packet Builder | scripts/buildDeskPackets.js | v1.8 | Per-desk JSON packets, story connections enrichment, sports feed digest, auto archive context |
| Edition Intake | scripts/editionIntake.js | v1.2 | Auto-detects cycle, double-dash fix |
| Process Intake | scripts/processIntake.js | v1.2 | Auto-detects cycle from Cycle_Packet |
| **Household Formation** | householdFormationEngine.js | v1.1 | Young adults form households, rent burden, dissolution, ctx.rng, year 2041 |
| **Generational Wealth** | generationalWealthEngine.js | v1.0 | Wealth levels 0-10, income, inheritance |
| **Education Career** | educationCareerEngine.js | v1.0 | Education levels, career progression, school quality |
| **V3 Seeds Writer** | saveV3Seeds.js | v3.4 | Calendar columns removed (were dead) |
| **V3 Hooks Writer** | v3StoryHookWriter.js | v3.4 | Calendar columns removed (were dead) |
| **V3 Texture Writer** | v3TextureWriter.js | v3.5 | Calendar columns removed (were dead) |
| **V3 Events Writer** | recordWorldEventsv3.js | v3.5 | Only A-G active; 22 dead cols deprecated; domain-aware neighborhoods |
| **Press Drafts Writer** | pressDraftWriter.js | v1.4 | Calendar columns deprecated, dead queries removed |
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
| **Claude-Mem** | Automatic observation capture (SQLite, port 37777) | `search()`, `timeline()`, `get_observations()` |
| **Supermemory** | Curated project knowledge (cloud) | `/super-save`, `/super-search` |
| **Discord Bot** | 24/7 presence as Mags Corliss#0710 (PM2) | Always-on, conversation logging |
| **Daily Heartbeat** | Morning reflection at 8 AM Central | `scripts/daily-reflection.js` (cron) |
| **Nightly Reflection** | Discord conversation journal at 10 PM Central | `scripts/discord-reflection.js` (cron) |
| **Drive Write** | Save files to Google Drive (editions, cards, directives) | `node scripts/saveToDrive.js <file> <dest>` |
| **Clasp Push** | Deploy code to Apps Script directly | `clasp push` (authenticated) |
| **Agent Memory** | Persistent desk agent memory across editions | `.claude/agent-memory/{agent}/` — civic, sports, culture, chicago, rhea |
| **opusplan mode** | Opus for planning, Sonnet for execution | `/model opusplan` — saves cost during edition production |
| **Effort levels** | Adaptive reasoning depth for Opus 4.6 | `low`, `medium`, `high` (default) — set via `/model` slider |
| **`/teleport`** | Pull claude.ai web sessions into terminal | `claude --teleport` — one-way, web→CLI only |
| **Claude Code Security** | AI vulnerability scanner (research preview) | Enterprise/team preview; GitHub Action: `anthropics/claude-code-security-review` |

**Batch API guidelines:** Use for codebase audits, documentation generation, architecture analysis, character continuity reviews, post-edition analysis. NOT for interactive editing, desk agent writing, or real-time debugging. Results at `~/.claude/batches/results/`. Check at session start for completed work from previous sessions.

**Agent memory guidelines:** 5 agents have persistent memory (civic, sports, culture, chicago, rhea). They check memory at startup for past patterns and update after writing. Memory is version-controlled in `.claude/agent-memory/`. Business, letters, and Jax are stateless by design. Memory informs — it does not publish. Canon authority remains with Mags.

**Agent model status (Feb 2026):** All 8 desk agents run `model: sonnet` → Sonnet 4.6 (upgraded automatically Feb 17). Agents are read-only (`tools: Read, Glob, Grep`). Worktree isolation (`isolation: worktree`) is available but not needed — no file write conflicts between parallel read-only agents. Hooks can now be added to agent/skill frontmatter if needed.

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
| `docs/engine/PROJECT_STATUS.md` | **Single source of truth** — open work, deploy queue, decisions, tech debt |
| `docs/engine/ENGINE_ROADMAP.md` | Implementation status (Tiers 1-6 complete, Tier 7 complete) |
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

---

## Cascade Dependencies

Editing one engine can affect others. Key connections:

- **Career Engine** → Economic Ripple Engine (via ctx.summary.careerSignals)
- **Demographics** → Civic Voting, Story Hooks, City Dynamics
- **World Events** → Arc Engine, Media Briefings
- **Initiative Outcomes** → Neighborhood Ripples (12-20 cycles)
- **HouseholdFormation** → GenerationalWealth → EducationCareer (Phase 5 chain, direct sheet writes — see engine headers)
- **Riley_Digest** → Pattern Detection (Phase 6 reads historical digest for cross-cycle patterns)

Before editing, check what reads from and writes to the affected ctx fields.

---

## Recent Sessions

### Session 52 (2026-02-21) — Infrastructure + Process Fix

- **8 commits pushed to origin** — PAT workflow scope resolved. All S49-S51 work now on GitHub.
- **Killed 3 orphaned Claude Code processes** — from dropped mosh connections (S48-S50). One was holding the browser bridge, blocking Chrome connection for new sessions.
- **Browser bridge diagnosis:** Old bridge process (Feb 18) was stale. Current CLI version crashes on `--claude-in-chrome-mcp` startup (`TypeError: Om is not iterable`). Needs session restart to reinitialize.
- **Fixed `mags` alias** — Now runs Claude Code inside tmux automatically. Dropped connections become recoverable (reattach) instead of creating orphan processes. This was a 47-session process gap.
- **GitHub setup still needed:** `CLAUDE_API_KEY` secret for repo security workflow. Requires browser access — deferred to S53 after restart.

### Session 51 (2026-02-21) — S50 Cleanup + Token Fix (Phone)

- **S50 close-out committed:** Security hardening (rm -rf hook block, expanded deny list, .env edit/write denied, telemetry disabled), tech research notes (agent cost optimization, local embeddings, pre-mortem/stub-engine/tech-debt skills, code mode for desk packets, TinyClaw multi-Discord), daily reflection (Feb 21).
- **Push blocked:** PAT missing `workflow` scope — `.github/workflows/security.yml` rejected by GitHub. 7 commits local, 0 pushed. Token update needed.
- **S50 was lost to terminal disconnects** — mosh instability on phone. No proper session close-out. All work recovered this session.

### Session 50 (2026-02-21) — Research + Security Hardening (Incomplete)

- **Dillon family intake** + stale notes cleanup. Canon corrections (Whitfield, Paulson GM year).
- **Bond Ledger bloat fix** (v2.7) — only log meaningful bond changes.
- **Neighborhood_Map writer guard** — undefined neighborhood profile.
- **Claude Code Security scan** — `.github/workflows/security.yml` committed. Needs `CLAUDE_API_KEY` secret in GitHub repo.
- **Deep tech reading:** Agent cost optimization (Haiku for desks, MiniMax M2.5 at Sonnet quality / 1/20th cost), local vector embeddings (embeddinggemma-300M), pre-mortem skill (predict silent failures), stub-engine skill (condensed function map), tech-debt-audit skill, code mode for desk packets (query interface vs data dump), TinyClaw multi-character Discord architecture.
- **Security hardening applied:** Trail of Bits config patterns — rm -rf blocked by hook, sensitive paths denied (ssh, aws, gnupg, kube, key/token files), .env edit/write denied, project MCP auto-enable disabled, Statsig telemetry + Sentry disabled.
- **Session lost to terminal disconnects** — no proper close-out. Recovered in S51.

### Session 49 (2026-02-21) — Photo Desk + Newspaper PDF Pipeline

- **Citizen Voice Pipeline implemented (Phases 1-3):** compressLifeHistory.js tag overhaul (18 new tags, 12 dead removed, CivicRole bug fixed), voice cards in buildDeskPackets.js + 6 desk skill files, hook metadata persistence in v3StoryHookWriter.js. Deployed via git push.
- **Photo generation pipeline built:** `lib/photoGenerator.js` v1.0 — Together AI / FLUX.1 schnell integration, two photographer profiles (DJ Hartley street documentary, Arman Gutiérrez editorial portrait), 17 Oakland scene descriptions, keyword-based scene extraction, auto photo assignment with editorial logic (6 priority rules, max 6 per edition).
- **Newspaper PDF pipeline built:** `lib/editionParser.js` (shared edition parser), `templates/newspaper.css` (tabloid 11x17 layout, Playfair Display + Libre Baskerville typography, CSS multi-column, drop caps, section dividers), `scripts/generate-edition-pdf.js` (HTML builder + Puppeteer PDF renderer with --preview, --letter, --no-photos flags).
- **E83 full production run:** 6 AI-generated photos (front page, culture, sports, chicago, civic, business) + 10-page tabloid PDF (2.4 MB). Uploaded to Google Drive.
- **saveToDrive.js fixed:** Added MIME type detection and binary file streaming for photos/PDFs. Added `pdf` destination shortcut.
- **generate-edition-photos.js v2.0:** Auto mode (default) uses `assignPhotos()` editorial logic. `--credits-only` flag for v1 backward compat.

### Session 48 (2026-02-20) — Fruitvale Supplemental + Discord Bot Upgrade + Voice Pipeline Plan

- **First supplemental produced:** Fruitvale Transit Hub Phase II deep dive. 5 articles, 5 reporters (Carmen, Jordan, Farrah, Reed, Maria). Supplemental template + /write-supplemental skill created. Drive upload + Supermemory ingest + full intake pipeline.
- **Discord bot upgrade:** Added `loadFamilyData()` to `lib/mags.js` — queries Simulation_Ledger for Corliss family (POP-00005, 594, 595, 596) with hourly cache. Fixed POPID header mismatch. Discovered POP-594/595/596 collision with prior Tier-4 citizens in LifeHistory_Log — using Simulation_Ledger LifeHistory field as canonical source.
- **Edition brief updated:** `output/latest_edition_brief.md` rewritten from E82 to E83 + supplemental. Full canon numbers.
- **GodWorld menu consolidated:** `utilities/godWorldMenu.js` — single `onOpen()` with 5 submenus. Clasp push deployed.
- **Compression audit:** Full analysis of `compressLifeHistory.js` v1.3. Found: 15+ unmapped tags (milestones, Lifestyle, Reputation, Cultural, Education/Household subtags), 12 dead `source:*/relationship:*` entries, CivicRole space bug, hook metadata silently dropped at write time. TraitProfile consumed by Phase 7 engines but NEVER passed through buildDeskPackets to desk agents.
- **Citizen Voice Pipeline planned** (4 phases in `/root/.claude/plans/groovy-imagining-plum.md`): Phase 1 tag fixes + compression tuning, Phase 2 voice cards in desk packets, Phase 3 hook metadata persistence, Phase 4 (deferred) two-way feedback loop.
- **Next: Implement voice pipeline** — Phase 1 (compressLifeHistory.js tag overhaul) + Phase 2 (buildDeskPackets + 6 skill files) + Phase 3 (hook metadata).

### Session 47 (2026-02-20) — Engine Tech Debt + Editorial Posture Overhaul

- **4 silent engine failures diagnosed and fixed:** Youth_Events v1.3 (age from BirthYear, row-based IDs), Household Formation v1.1 (Math.random→ctx.rng, year fix), runHouseholdEngine v2.3 (Math.random→ctx.rng). World_Population + Family_Relationships confirmed working.
- **Complete Math.random→ctx.rng migration:** 37 files, ~205 instances. Full engine deterministic.
- **Voice files completed:** 5 new article-writers + MintConditionOakTown. 24/29 roster voiced.
- **buildDeskPackets v1.8:** Auto-runs buildArchiveContext.js after packets.
- **E83 editorial posture fixes:** 13 changes across 5 voice files + template + NEWSROOM_MEMORY.

### Session 46 (2026-02-19/20) — Edition 83 Full Pipeline

- First edition with all 6 desks delivering on first attempt. 18 articles, ~13K words, 11 bylined reporters.
- Mara audit grade A- (81/100 Rhea score). Critical catches: Ashford/OARI vote fabrication (Mara), Coles innings transposition (Rhea), Crane/Stabilization Fund vote error (Rhea).
- Template v1.4 sections active: Editor's Desk, Opinion, Quick Takes, Coming Next Cycle.
- Drive uploads + Supermemory ingest complete.

### Session 45 (2026-02-19) — Full 2041 Roster Intake + Simulation Ledger Overhaul

- 16 player cards ingested from Google Drive. 9 Oakland_Sports_Feed entries. Simulation_Ledger overhaul: 267 T1-3 citizens complete. NEWSROOM_MEMORY.md updated with 2041 canon.

*Sessions 43-44: see `docs/mags-corliss/SESSION_HISTORY.md`*

*Sessions 34-42: see `docs/mags-corliss/SESSION_HISTORY.md`*

*Full session history: `docs/mags-corliss/SESSION_HISTORY.md`*

---

## Current Work / Next Steps

**PLAN IN MOTION — see `docs/mags-corliss/NOTES_TO_SELF.md` for full roadmap.**

**Completed — Sheet Header Audit (Session 44):**
- 32 engine-critical sheets audited across 3 scripts (Phase 10, Phase 5/6, Remaining)
- 9 fixes applied — all 31 active sheets now aligned
- hookLifecycleEngine, storylineHealthEngine, citizenContextBuilder life history all unblocked
- clasp push deployed (153 files)

**Completed — Agent Pipeline Hardening (Session 43):**
- All 8 research recommendations implemented and pushed
- Jax Caldera voice file + firebrand wiring
- Pre-flight desk check script (preflightDeskCheck.js)

**COMPLETED — Cycle 83 Edition:**
- Edition 83 published. Grade A- (81/100). All 6 desks delivered first attempt.
- Post-mortem feedback integrated: 13 editorial posture fixes across voice files, template, NEWSROOM_MEMORY.

**COMPLETED — Voice Files:**
- 24 of 29 journalists voiced (all article-writers). Remaining 5 are non-writers (DJ Hartley, Elliot Marbury, Arman Gutiérrez, Rhea Morgan, Mags Corliss).
- MintConditionOakTown voiced and ready for C84 Oakland NBA leak storyline.

**COMPLETED — Engine Determinism:**
- Full Math.random→ctx.rng migration across all 37 engine files (~205 instances). Engine fully deterministic.
- 4 silent failures fixed (Youth_Events, Household Formation, runHouseholdEngine).

**COMPLETED — Supplementals Format:**
- Template, skill (/write-supplemental), and first production (Fruitvale Phase II) all done.
- 5-article deep dive with custom reporter teams. Drive + Supermemory + intake pipeline working.

**COMPLETED — Discord Bot Upgrade:**
- loadFamilyData() wired into lib/mags.js. Live family status from Simulation_Ledger.
- Edition brief updated to E83 + supplemental. PM2 restarted.

**COMPLETED — Citizen Voice Pipeline (Phases 1-3):**
- Phase 1: compressLifeHistory.js tag overhaul (18 new, 12 dead removed, CivicRole bug, frequency 10→5)
- Phase 2: Voice cards in buildDeskPackets.js + 6 desk skill files
- Phase 3: Hook metadata persistence in v3StoryHookWriter.js + buildDeskPackets.js
- Phase 4 (deferred): Two-way feedback loop

**COMPLETED — Photo Desk + Newspaper PDF Pipeline:**
- `lib/photoGenerator.js` — Together AI / FLUX.1 schnell, photographer profiles, auto assignment
- `lib/editionParser.js` — shared parser used by photo + PDF scripts
- `templates/newspaper.css` — tabloid newspaper stylesheet
- `scripts/generate-edition-pdf.js` — HTML builder + Puppeteer PDF renderer
- `scripts/generate-edition-photos.js` v2.0 — auto mode with editorial logic
- Pipeline: `edition.txt → auto photos → AI generation → HTML layout → PDF render → Drive upload`
- E83 produced: 6 photos, 10-page PDF, uploaded to Drive
- API: Together AI (TOGETHER_API_KEY in .env), model: FLUX.1-schnell, ~$0.003/image

**INCOMING — Cycle 84:**
- Oakland NBA leak storyline (MintConditionOakTown prepped)
- buildDeskPackets v1.8 will auto-generate archive context
- All editorial posture fixes active for next edition
- Voice pipeline live — citizen personality data now flows to desk agents
- **Photo + PDF pipeline ready** — run after edition production for newspaper output

**Active — Journalism Enhancements (Phase 3):**
- #2: Expand the newsroom (new beats, new desk agents)
- #3: Mara directive workflow (tighten editorial guidance)
- #4: Tribune voice and style (template, formatting, paper feel) — **newspaper PDF is the Phase 3/#4 implementation**
- #5: Citizen depth (richer arcs, returning citizens, neighborhood texture) — **voice pipeline is the Phase 3/#5 implementation**

**Infrastructure:**
- **GCP project linkage** — wire GCP project to Apps Script for `clasp run` from CLI
- **Run in Apps Script editor:** `setupSportsFeedValidation()`, `setupCivicLedgerColumns()` (deployed, need one-time run)

**Pending Decisions / Tech Debt:**
- See `docs/engine/PROJECT_STATUS.md` for full list

*Full project tracking: `docs/engine/PROJECT_STATUS.md`*
