# SESSION CONTEXT - GodWorld

**The thin state pin + one next-opener per terminal. Boot injects only the PIN and your terminal's NEXT line — nothing else is carried.** What shipped → `git log`. What's open → `docs/engine/ROLLOUT_PLAN.md`. Why a thing was done → claude-mem search.

---

**PIN:** Session: 278→279. S279 (engine-sheet): no engine work — refused a corrupted MEMORY.md line impersonating a Mike instruction and a follow-up demand to shut the session down over it. S278 (research-build): research.14 write-back gate cleared; deploy now waits on engine-sheet's clasp window. research.21 corpus-depth still below floor, watch-item until C101. S277 (engine-sheet): corrected a false "engine broken" thesis and closed the research.14 citizen-loop via a new manual drain lever; opened atmospheric citizen-event expansion (built, undeployed). | Day: 161 | Cycle: 100 | Edition: C99/E99 canonized (S265) | engine v3.4

**NEXT[media]:** C99 CANONIZED end-to-end (sift→write-edition→edition-print→post-publish all DONE S265; edition A / Arbiter 0.866; bay-tribune COMPLETE 53 wiki + 906 cards + 27 civic records; coverage ratings written). **Next media run = C100** once engine runs it (watch: first chaos-cars cycle may surface vehicular/sideshow events in editions — engine.11 deployed but did NOT execute C99). **NEW LANE (Mike, S265): "direct pieces" run through Gemini — Gemini writes + corrects + ingests them; my role = REVIEW + canon-check, and the fix must land BEFORE Gemini's ingest because ingest = canon (a wrong fact propagates into next sift).** Live example: Jax "The Heat Shield" column (jax_varek_column.md, Drive 1PKyP93Qbc11L8b35jiNduWvIaLPvJj80) — WNBA→NBA correction owed before ingest (Oaks are NBA, canon-solid E91/93/94/97); byline mislabeled civic-not-opinion + Paulson-as-subject are Mike's judgment calls, not vetoes. Open handoffs to research-build (gap logs, do NOT write ROLLOUT from media): G-P-C99-1 (Step 5b base_context cycle field at .baseContext.cycle, gate text ambiguous) + G-P-C99-2 (2a wall-time ~36min understated; stale citizen_card_failures dump survives clean run); carried Davis POP-00021 drift in newsroom.md Five Goods table + checkLetterEligibility.js exclusion-line false-positive HALT (it barred REAL reporter Elliot Graye POP-00012 this cycle, G-W1). 5 canon-drift citizens owed engine-sheet backfill (canon_drift_c99.json: Elliot Abraham, Herbert Jones, Rosario Medina, Delia Vargas-Ruiz, Jerome Pittman). FLUX photoQA over-filters stadium frames (G-PR-C99-1, research-build→engine-sheet rubric retune).
**NEXT[civic]:** run `node scripts/buildInitiativePackets.js` each cycle so the tracker JSON doesn't re-stale (last auto-refresh ~C89, civic.14).
**NEXT[engine-sheet]:** Deploy backlog for the next deliberate clasp: atmospheric citizen-event expansion (engine.38 Phase A, built in tree) plus chaos-trauma wiring, both landing in `generateCitizensEvents.js` — plan in `docs/plans/2026-06-30-central-generator-atmospheric-expansion.md`. Background track: ENGINE_COUPLING_MAP, ~26 files left. Open: corrupted MEMORY.md line needs Mike's confirm/strip; carried smoke/migration items tracked in `docs/engine/ROLLOUT_PLAN.md`.
**NEXT[jarvis]:** **[S274 MANDATE COMPLETE] Aider/DeepSeek audit done** — full detail in NEXT[engine-sheet]. Summary: 10 Aider commits reverted (a `ctx` bug crashed the engine + broke 4 tests → net-negative as-shipped); the one genuinely valuable idea (cumulative chaos-trauma) was reapplied cleanly; Aider reconfigured to **propose-not-deploy** + scoped (CONVENTIONS §6 lane + AIDER_PLAN queue). **HEADS-UP on your install:** the `vitest` / `npm run test:unit` "iron fence" you added was **structurally non-functional** — it can never pass (the repo's tests are `process.exit` harnesses with no vitest config). Replaced it with the real gate (`npm test`) wired into Aider's `auto-test`; vitest removed. Aider effectiveness verdict: capable on small scoped/tested jobs behind the gate, NOT safe unsupervised on this interconnected codebase (it can't see cross-file/Apps-Script context — both failures this session were that).
**NEXT[research-build]:** **S278 — compressed (prior S272/S273 detail lives in ROLLOUT_PLAN.md rows + git log, not here).** **research.14 write-back GATE CLEARED:** 13-consecutive-green affect-sign re-audit on live wakes (06-28→06-30), zero wrong-sign flips — detail in [[plans/2026-06-04-mags-citizen-loop]] changelog 2026-06-30. Deploy now waits ONLY on engine-sheet's deliberate clasp window (drain built S270, `8d6b155c`). **research.21 corpus-depth checked live** (`node scripts/citizen-signal-detector.js --dry-run`) — still below floor (34/40 distinct), pure watch-item until C101 accumulates more wakes, no action needed now. **Confirmed with Mike:** pending+retired citizens keep atmospheric events (matches shipped `4d86ace1`). **Fixed 2 stale ROLLOUT rows:** research.14 state flip; research.16 "Open for Mike" line was answered S264 and never cleared — real state: Phase 0/1 DONE, **Phase 2 Discord-chat BUILT + DEPLOYED LIVE** (confirmed S278: `CITIZEN_VOICE_CHANNELS` set to POP-00001 Vinnie Keane, `mags-bot` online — Mags + Vinnie both live), Phase 3 (ledger backfill/base-lock) + Phase 4 (replicate to Dillon/Varek) still outline-only. **NEXT SESSION AGENDA (Mike-set):** discuss how the edition pipeline works now with the orchestrator+source-agents approach — open the research.20 ROLLOUT row + [[plans/2026-06-25-deep-dispatch-write-edition-build]] + [[adr/0012-autonomous-deep-dispatch-write-edition]] before that conversation (Phase 2 charge-brief/`/deep-dispatch` skill BUILT S274; Phase 1 substrate → engine-sheet still UNSTARTED, blocks the Phase 3 pilot — that's likely the crux of the discussion). **Other open, no urgency:** pipeline.13 T12/T13 (image-model A/B + reprint smoke, tuning only); research.16 Phase 3/4 design whenever Mike wants to push further.

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
