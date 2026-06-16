# SESSION CONTEXT - GodWorld

**The thin state pin + one next-opener per terminal. Boot injects only the PIN and your terminal's NEXT line — nothing else is carried.** What shipped → `git log`. What's open → `docs/engine/ROLLOUT_PLAN.md`. Why a thing was done → claude-mem search.

---

**PIN:** Session: 260 | Day: 161 | Cycle: 97 | Edition: C97 published (E97, Arbiter A/0.856) — pending /post-publish + /edition-print

**NEXT[media]:** /post-publish c97 FIRST (canon ingest — do NOT defer per terminal rule), then /edition-print c97. Edition `editions/cycle_pulse_edition_97.txt`; Drive folder `1p0FHmofwhZl7ItWpvfa6xrOP5ibskMxC`.
**NEXT[civic]:** run `node scripts/buildInitiativePackets.js` each cycle so the tracker JSON doesn't re-stale (last auto-refresh ~C89, civic.14).
**NEXT[engine-sheet]:** C98 deploy window — service-account widen `Story_Seed_Deck` cols S→T, clasp push `saveV3Seeds.js`, then post-cycle `routePatternSeeds.js --cycle 98 --apply`; + ES-1 col-O cycle stamp; + engine.33/.31/.32 smoke. Sequence in ROLLOUT engine.35.
**NEXT[research-build]:** engine.35 Phase 3 (WHY/causal layer) + Phase 5 (rewire /sift off the deck→packet surface); loop-tightening follow-on = governance.35 remnant (engine-sheet self-derives the PIN's mechanical fields from `output/`).

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
