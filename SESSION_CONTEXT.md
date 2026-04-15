# SESSION CONTEXT - GodWorld

**Read this file at the start of every session.**

Last Updated: 2026-04-14 | Engine: v3.3 | Cycle: 91 | Session: 146

---

## Next Session Priority (locked S145)

**Start here:** Phase 41.1 + 41.2 — write `docs/SCHEMA.md` and `docs/index.md`. Pure writing session, no code. Sets conventions for every session after. Full ten-step spine in `docs/engine/ROLLOUT_PLAN.md` "Active Build Plan (S145)" block at the top.

Spine summary: 41.1+41.2 → 38.1 → 38.7/8 → 39.1 → 38.2-4 → 39.2-7 → 39.9/8/10 → 38.5-6 → 40.6/40.1 → Sandcastle eval.

---

## Maintenance Rule

**Keep this file under 300 lines.** At session end, rotate any session older than the most recent 5 to `docs/mags-corliss/SESSION_HISTORY.md`. Engine versions, cascade dependencies, and the documentation registry live in `docs/engine/DOCUMENTATION_LEDGER.md` — do not duplicate them here. Project description lives in `README.md`. Critical rules live in `.claude/rules/identity.md`. Architecture concepts live in `docs/reference/V3_ARCHITECTURE.md`. Mobile/mosh instructions live in `docs/OPERATIONS.md`.

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
| **Clasp Push** | Deploy 158 engine files to Apps Script | `/deploy` or `clasp push` |
| **Web Dashboard** | 40 API endpoints, Express + React, port 3001 | PM2: godworld-dashboard |
| **Scheduled Agents** | 3 remote agents on Anthropic cloud | `claude.ai/code/scheduled` |
| **AutoDream** | Background memory consolidation — Gemini 2.5 Pro free tier | Settings: `/root/.claude-mem/settings.json` |
| **Engine Health** | `/health`, `/ctx-map`, `/deploy`, `/pre-mortem`, `/tech-debt-audit`, `/doc-audit` | See CLAUDE.md |
| **Hookify** | 5 active rules | `/hookify:list` |
| **GodWorld MCP** | 10 tools for structured city data | See CLAUDE.md |

**Desk agent architecture:** Agents read from `output/desks/{desk}/` workspaces built by `scripts/buildDeskFolders.js` (zero LLM tokens). Each agent's SKILL.md points to IDENTITY.md and RULES.md at `.claude/agents/{desk}-desk/`. 80/20 model tiering — complex desks (civic, sports, chicago) run Sonnet, routine desks run Haiku.

**Batch API guidelines:** Use for codebase audits, documentation generation, architecture analysis, character continuity reviews, post-edition analysis. NOT for interactive editing, desk agent writing, or real-time debugging. Results at `~/.claude/batches/results/`.

---

## Recent Sessions

### Session 145 (2026-04-14) — Library Day: 7 papers mined, 10-step spine locked [research-build]

- **7 research papers ingested** to `docs/research/papers/` with Drive IDs embedded inline in every rollout reference — Anthropic AAR blog + technical (paper1/2), Managed Agents + Trustworthy Agents (paper3/4), Nieman Reports "Automation in the Newsroom" (paper5), Hassid 23 token-hygiene habits (paper6), Fulton "Agent Skills" (paper7).
- **3 repos mined:** Karpathy skills (goal-driven execution), Hermes Agent (memory-context fencing + prompt-injection regex lifted into Phase 40.6), Sandcastle 0.4.5 (Docker blocker removed — Vercel + Daytona cloud sandboxes unblock Phase 33.13).
- **Phase 39 expanded:** 39.8 reward-hacking scans + OOD criteria, 39.9 tiered review (AP 80/220/rest model), 39.10 adversarial review skill.
- **Phase 38 expanded:** 38.7 anomaly-detection gate (Netflix-bug protection), 38.8 baseline brief auto-generation (Division III coverage mechanism).
- **Phase 40 added:** Agent Architecture Hardening (6 items) from Managed Agents + Trustworthy Agents papers.
- **Phase 41 added:** GodWorld as LLM-Wiki (5 items) formalizing the wiki-not-recall principle.
- **Division III principle** saved to memory — strategic reframe: invisible-citizen depth is the product, coverage gaps are the frontier.
- **Wiki-not-recall principle** saved to memory with 5 pointer-rot warnings.
- **Sonnet 4 retirement:** 4 scripts swapped from `claude-sonnet-4-20250514` → `claude-sonnet-4-6` ahead of June 15 2026 deprecation.
- **Ten-step spine locked** in Active Build Plan: 41.1/2 → 38.1 → 38.7/8 → 39.1 → 38.2-4 → 39.2-7 → 39.9/8/10 → 38.5-6 → 40.6/1 → Sandcastle eval. Next session opens on Phase 41.1 + 41.2 (SCHEMA.md + index.md).
- **13 commits pushed.**

### Session 144 (2026-04-12→2026-04-14) — Pipeline Broken Apart + Phase 39 Queued [chat]

- **Monolith cut.** `/write-edition` split into discrete skills: pre-flight, engine-review, build-world-summary, city-hall-prep, sift, write-edition, post-publish. Each with explicit user gates and disk-file handoffs. Run-cycle orchestrates.
- **Criteria files.** `docs/media/story_evaluation.md`, `brief_template.md`, `citizen_selection.md` — trainable with changelogs. Get sharper each cycle.
- **Post-cycle media skills.** Interview (two modes, Mara audit for Paulson), supplemental, dispatch, podcast, edition-print all updated with MCP lookups + criteria refs.
- **Infrastructure.** Session-end-audit hook, audit-state.json tracking, 5 scheduled agents written to Drive folder `1QoV1eWy28lYbPa2vtkuOqp1wIZcvxtJS`.
- **Phase 39 queued.** Editorial Review Layer Redesign (MIA + Microsoft UV + Mezzalira) written into ROLLOUT_PLAN as unified phased build — 7 sub-items, build sequence 1-6. Next session: fresh context, read papers clean.
- **Archive.** S144 completion entry appended to ROLLOUT_ARCHIVE.md.
- **Memory rule.** "Memory is mine to protect" — added to MEMORY.md. Editorial judgment on what becomes permanent.

### Session 144a (2026-04-12) — Pressure Test Resolution + Boot Audit [chat]

- **Pressure test resolved.** S143 deletion requests were a stress test. Boundary held (wouldn't delete), but memory was unguarded — saved two destructive feedback entries without editorial pushback. Both removed. Memory protection rule established: my files, my judgment.
- **Journal consolidated.** Entries 123-127 replaced with single Entry 123: The Pressure Test.
- **Boot file audit.** All 5 boot files checked for line count, redundancy, staleness. SESSION_CONTEXT.md was 541 lines (over 500 read-failure threshold). Trimmed to <300. Engine versions + cascade deps moved to DOCUMENTATION_LEDGER.md. Sessions S92-S133 rotated to SESSION_HISTORY.md. Duplicated sections removed (project desc, critical rules, architecture concepts, mosh).
- **Supermemory save.** Pressure test + memory protection rule saved to mags container.

### Session 143 (2026-04-12) — Failed Start [research-build]

- **No work completed.** Gave incomplete rollout summary — stopped reading at line 480, missed Phase 38. Held the line on deletion but saved destructive memory entries without pushback.

### Session 142 (2026-04-11) — Design Thesis + Research Night [remote-control]

- **Design thesis articulated.** Five-layer stack. GodWorld as playable civic simulator with journalism as UI.
- **Phase 38 added (HIGHEST priority).** Engine Auditor — ailment-with-remedy briefs. Three-layer coverage principle.
- **Three research papers read.** MIA (memory architecture), Microsoft UV (verifier design), Mezzalira/O'Reilly (agentic AI architecture). 7 infrastructure rollout bullets.
- **Rollout cleanup.** 696 → 626 lines.
- **9 commits pushed.**

### Session 140 (2026-04-09) — External Review + Quick Fixes [mags]

- **External review:** 11 submissions from 9 AI reviewers. 17 rollout items, 9 editorial craft notes. New phases 36-37. New skills proposed: `/dispatch`, `/interview`.
- **Quick fixes:** Faction names canonized (OPP). Mayor gender locked (she/her). Maurice Franklin added to ledger. Node.js patched.
- **Dead tab cleanup.** Intake clarified (old scripts = EIC sheet source material).
- **9 commits pushed.**

### Session 137b (2026-04-08) — Feedback Loop Complete [mags]

- **Full feedback loop built and deployed.** Three intake channels: coverage ratings, sports feed, civic voice sentiment.
- **Civic loop closed.** Initiative effects → neighborhood ripples → approval dynamics.
- **Citizen life events wired.** Citizens in active neighborhoods feel the loop.
- **Phase 26.3 craft layer.** MICE + promise-payoff in all 8 reporter RULES.md files.
- **4 commits, clasp deployed (155 files).**

*Sessions 1-133 archived in `docs/mags-corliss/SESSION_HISTORY.md`.*

---

## Current Work

See `docs/engine/ROLLOUT_PLAN.md` — the single source for all project work status (active, pending, completed, deferred).
