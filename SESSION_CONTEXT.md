# SESSION CONTEXT - GodWorld

**The thin state pin + one next-opener per terminal. Boot injects only the PIN and your terminal's NEXT line — nothing else is carried.** What shipped → `git log`. What's open → `docs/engine/ROLLOUT_PLAN.md`. Why a thing was done → claude-mem search.

---

**PIN:** Session: 262 | Day: 161 | Cycle: 97 | Edition: C97 published (E97, Arbiter A/0.856) — pending /post-publish + /edition-print

**NEXT[media]:** /post-publish c97 FIRST (canon ingest — do NOT defer per terminal rule), then /edition-print c97. Edition `editions/cycle_pulse_edition_97.txt`; Drive folder `1p0FHmofwhZl7ItWpvfa6xrOP5ibskMxC`.
**NEXT[civic]:** run `node scripts/buildInitiativePackets.js` each cycle so the tracker JSON doesn't re-stale (last auto-refresh ~C89, civic.14).
**NEXT[engine-sheet]:** C98 pre-cycle steps DONE S261 — deck widened S→T live (grid 18→20, verified) + clasp push LIVE (`saveV3Seeds.js` S/T schema + `applyStorySeeds.js` Phase-1 followup gate). **Awaiting Mike to run C98.** After it runs: `/engine-review` → `routePatternSeeds.js --apply --cycle 98` (Node) → smoke the full stacked deploy (Phase-1 followup gate halves + zero Chicago; engine.33 pulse-fold/microclimate + Neighborhood_Map 17→21; engine.31/.32 dial folds + T8 round-trip; generationalEventsEngine no CIV retirement) → ES-1 col-O cycle stamp. Sequence in ROLLOUT engine.35. **NEW: engine.36 filed** (isolated staging environment — run cycles on a sheet copy; post-C98 build, finish ctx.ss migration + fail-loud SIM_SSID default).
**NEXT[research-build]:** **Citizen-loop build is the live thread (research.14) — bot credits ADDED S261, fully unblocked.** Phase 2 design DONE + voice VALIDATED (Gemini + DeepSeek, N=4); build handed to engine-sheet+bot, **start with the reflection→tag classifier**; Mags stays the fixed anchor (research-build coordinates). Also ready (research-build): gov.38 (helper-offload — inventory + wire). Shipped S261: gov.39 rollout-lint (rows now WARN-guarded at write-time; states must be bare canonical tokens) — 5 engine.* rows pending engine-sheet tighten. Still gated: gov.37 cheap-closer (≥2-3 clean CLOSES; this close = #1 of 3); engine.35 Phase 5 (C98 smoke); gov.35-remnant (engine-sheet wires 3 PIN fields). OpenRouter live (~$10). Detail → ROLLOUT + plans; voice harness `scripts/_probe_voice_{grounded,openrouter}.js`.

---

## Maintenance Rule

**This file carries exactly two things: the PIN (current sim-state) and one NEXT line per terminal (what that terminal's next instance opens with).** Boot injects only the PIN + your terminal's NEXT line. That is also the whole write side — at session-end the closing terminal updates the PIN and its own NEXT line, nothing else.

- **What shipped** → `git log` (authoritative — no Shipped block here).
- **What's open** → `docs/engine/ROLLOUT_PLAN.md` (canonical for open/closed work).
- **Why a thing was done** → claude-mem search / commit bodies.

No STATUS narrative, no Shipped block, no Recent Sessions log — those duplicated git/ROLLOUT/claude-mem and went stale, so they're retired (ADR-0009 §loop-tightening). **The contract: boot-read set ≡ session-end-write set = {PIN, NEXT[terminal]}.** Prior narrative lives in git history of this file + `docs/mags-corliss/SESSION_HISTORY.md`.

Engine versions, cascade dependencies, and the documentation registry live in `docs/engine/DOCUMENTATION_LEDGER.md`. Project description lives in `README.md`. Critical rules live in `.claude/rules/identity.md`. Architecture concepts live in `docs/reference/V3_ARCHITECTURE.md`. Mobile/mosh instructions live in `docs/OPERATIONS.md`.

---

## Key Tools & Infrastructure

| Tool | Purpose | Usage |
|------|---------|-------|
| **Batch API** | 50% cost for non-urgent work (~1hr turnaround) | `/batch [task]`, `/batch check` |
| **Claude-Mem** | Automatic observation capture (SQLite + Chroma vector, port 37777) | `search()`, `timeline()`, `get_observations()` |
| **Supermemory** | 6 containers: mags (brain), bay-tribune (canon), world-data (city state), super-memory (bridge), mara (audit) | `/save-to-mags`, `/super-search` |
| **Discord Bot** | 24/7 presence (PM2: mags-bot) | Always-on, conversation logging |
| **Nightly Reflection** | Discord conversation journal at 11 PM CDT | `scripts/discord-reflection.js` (cron) |
| **Drive Write** | Save files to Google Drive | `node scripts/saveToDrive.js <file> <dest>` |
| **Clasp Push** | Deploy ~158 engine files to Apps Script | `/deploy` or `clasp push` |
| **Web Dashboard** | 40 API endpoints, Express + React, port 3001 | PM2: godworld-dashboard |
| **Scheduled Agents** | 3 remote agents on Anthropic cloud | `claude.ai/code/scheduled` |
| **AutoDream** | **DISABLED S228** — redundant with MD persistence + Supermemory + claude-mem observations | `autoDreamEnabled: false` in `~/.claude/settings.json` |
| **Engine Health** | `/health`, `/ctx-map`, `/deploy`, `/pre-mortem`, `/tech-debt-audit`, `/doc-audit` | See CLAUDE.md |
| **Hookify** | 5 active rules | `/hookify:list` |
| **GodWorld MCP** | 10 tools for structured city data | See CLAUDE.md |

**Desk agent architecture:** Agents read from `output/desks/{desk}/` workspaces built by `scripts/buildDeskFolders.js` (zero LLM tokens). Each agent's SKILL.md points to IDENTITY.md and RULES.md at `.claude/agents/{desk}-desk/`. 80/20 model tiering — complex desks (civic, sports, chicago) run Sonnet, routine desks run Haiku.

**Batch API guidelines:** Use for codebase audits, documentation generation, architecture analysis, character continuity reviews, post-edition analysis. NOT for interactive editing, desk agent writing, or real-time debugging. Results at `~/.claude/batches/results/`.

---

## Current Work

See `docs/engine/ROLLOUT_PLAN.md` — the single source for all project work status (active, pending, completed, deferred).
