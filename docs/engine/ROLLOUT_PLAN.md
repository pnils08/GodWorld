# GodWorld — Rollout Plan

**Status:** Active | **Last Updated:** Session 110 (2026-03-22)
**North star:** `docs/ARCHITECTURE_VISION.md` — Jarvis + persistent sessions. Everything we build points there.
**Completed phase details:** `ROLLOUT_ARCHIVE.md` — read on demand, not at boot.
**Research context:** `docs/RESEARCH.md` — findings log, evaluations, sources.

---

## Next Session Priorities

### Open — Dashboard & Data Quality

- **DESIGN: Supplemental display on frontend** — 7 supplementals detected with cycles. Need visual placement on Edition tab or filter view.
- **DESIGN: Chicago dashboard tab** — 123 citizens, 2 reporters, Bulls data, Paulson GM. Currently buried in Sports tab. See `docs/DASHBOARD.md`.
- **FIX: Rebuild POPID article index** — `ARTICLE_INDEX_BY_POPID.md` generated Feb 5 from old Drive downloads. No automated builder. Needs script.
- **CLEANUP: Dead spreadsheet tabs** — 8 dead tabs to archive/hide. Backup CSV first. See `docs/SPREADSHEET.md`.
- **FIX: Press_Drafts ghost references** — `applyStorySeeds.js` and `mediaRoomIntake.js` still reference deleted tab.
- **FIX: gradeEdition.js supplemental support** — Article parser, errata logging, desk mapping all need supplemental awareness.

### Open — Architecture & Production

- **DESIGN: Agent knowledge separation** — Agents should use `bay-tribune` for canon data, not `mags` for personal memory. Local workspaces + dashboard API is the clean path.
- **PROJECT: World Memory** — Phase 1 DONE (dashboard reads archive). Remaining: (3) ingest key archive articles to bay-tribune, (5) historical context in desk workspaces. See `docs/WORLD_MEMORY.md`.
- **Supplemental strategy (ongoing)** — One supplemental per cycle minimum.

### Open — Infrastructure & Maintenance

- **CLEANUP: Archive old session transcripts** — 1.1GB in `.claude/projects/`. Archive oldest 30 to Drive. See `output/DISK_MAP.md`.
- **Node.js security patch** — Scheduled March 24, 2026.
- **CLEANUP: ~22 duplicate docs in bay-tribune container** — From double-ingestion S106. Harmless but bloated.

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
- **7.9 Remote Control (Server Mode):** `claude remote-control` on the droplet. Mike connects from phone/browser. `--spawn worktree` for parallel sessions. S76 blocker likely `DISABLE_TELEMETRY` env var — unset and re-test. See RESEARCH.md S110. **Priority: HIGH.**
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
- **12.3 Autonomous Cycle Execution:** Long-term capstone. Depends on: Remote Control (7.9), Channels (Discord), dashboard mission control.
- **12.10 Fish Audio TTS:** Deferred — $11/mo cost rejected S77.
- **12.11 MiniMax M2.5:** Not started. Test on next edition for cost comparison.
- **12.12 Slack Integration:** Not started. Depends on 7.10.

### Phase 20: Public Tribune — WordPress + Claude

WordPress 7.0 (April 2026) ships AI Client SDK supporting Claude function calling. Could wire to dashboard API. Not started.

### Phase 21: Local Model Pipeline

Qwen 3.5 9B, LM Studio/Ollama, local RAG over canon archive. Research phase. Long-term cost reduction path.

### Phase 23: Cross-AI Feedback (selected open items)

- **23.2 Entity Registry:** Partial — Rhea checks added, full `entity-registry.json` not built.
- **23.6 Jax Caldera Voice:** Not started. Low effort merge.

### Phase 24: Citizen Life Engine — NOT STARTED

Rich context-aware life histories. 24.1 MEDIA mode DONE (S94). Remaining: 24.2 Tier 1-2 event caps, 24.3 Context-aware events, 24.4 Daily simulation, 24.5 Sports transactions.

### Phase 25: Storage Strategy — NOT STARTED

Deduplicate across 4 layers (disk, Drive, GitHub, Supermemory). Quick wins done S85. Full audit not started.

---

## Session Harness Improvements (from S110 research)

Source: "50 Claude Code Tips" community guide, evaluated against GodWorld stack.

| Item | What | Priority | Status |
|------|------|----------|--------|
| **CLAUDE.md instruction audit** | Audit against ~150 instruction budget. Every unnecessary line dilutes the important ones. Count instructions, cut noise. | HIGH | Not started |
| **PreToolUse ledger protection hook** | Block destructive commands (`rm -rf`) + block direct sheet writes outside persistence scripts. Protect 675 citizens from accidental corruption. | HIGH | Not started |
| **Terminal status line** | Show session number, cycle, workflow, and rate limit usage at bottom of terminal. Mike sees state at a glance. `/statusline` generates the script. `rate_limits` field available since mid-March. | HIGH | Not started |
| **/btw for side questions** | Use during edition production for quick questions without context pollution. No build needed — just awareness. | MEDIUM | Available now |
| **Smarter compaction hook** | Current post-compact hook exists but is basic. Re-inject: current workflow, active task, modified files, key constraints. | MEDIUM | Upgrade existing |
| **/branch for risky approaches** | Try experimental fixes without losing context. Both paths stay alive. | MEDIUM | Available now |
| **Output style per workflow** | Concise for build, explanatory for research. `/config` to set. | LOW | Not started |
| **Fan-out `claude -p` for batch ops** | Batch file migrations, bulk doc updates with `--allowedTools` scoping. | LOW | Not started |
| **PostToolUse validation hook** | Run a check after every file edit — e.g., grep for `godworld` in agent-facing files, catch container contamination at write time. | LOW | Not started |
| **Effort frontmatter in skills** | Set effort level per skill — research/letters low, civic/sports high. No manual `/effort` switching. Claude Code mid-March feature. | MEDIUM | Not started |
| **HTTP hooks → dashboard** | Hooks POST to dashboard URLs instead of running shell commands. Session events (start, edit, error) feed into mission control panel. Mar 3 feature. | MEDIUM | Not started |

---

## Discord Channel + Cloud Sessions (from S110 research)

Source: code.claude.com/docs/en/channels. See RESEARCH.md S110 Channels entry for full context.

| Item | What | Priority | Status |
|------|------|----------|--------|
| **Discord Channel plugin** | Replace separate Discord bot during active sessions. Mike DMs Mags on Discord → message arrives in running Claude Code session with full project context. `claude --channels plugin:discord@claude-plugins-official`. Standalone bot still covers off-hours. | HIGH | Not started |
| **Cloud session + Channel** | `claude --remote` + Discord channel = always-on Mags with full context, reachable from Discord. Infrastructure for Phase 12.3 (autonomous cycles). | HIGH | Not started — evaluate after Discord channel works |
| **Webhook receiver** | CI results, deploy status, error alerts push into session. Claude reacts to external events. | MEDIUM | Not started |

---

## Dashboard Mission Control (from S110 research)

Source: Synthesis of Channels + Remote Control research. See RESEARCH.md S110 Dashboard entry.

| Item | What | Priority | Status |
|------|------|----------|--------|
| **Session status panel** | Show running sessions, workflow type, duration, context usage. Mike sees at a glance what's alive. | HIGH | Not started |
| **Channel status** | Discord connected? Last message? Sender allowlist health. | MEDIUM | Not started |
| **Health panel** | PM2 processes, disk, RAM, Supermemory containers. Replaces SSH-and-check pattern. | MEDIUM | Not started |
| **Session history** | When sessions started/ended, workflow, key accomplishments. Persistent log. | LOW | Not started |
| **Quick actions** | Restart bot, trigger health check, view latest brief. Buttons instead of terminal commands. | LOW | Not started |

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
| NPM Package Drift | 7 packages behind. Batch update in maintenance session. |
