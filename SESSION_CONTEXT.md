# SESSION CONTEXT - GodWorld

**Read this file at the start of every session.**

Last Updated: 2026-05-08 | Engine: v3.3 | Cycle: 93 | Session: 206 | Edition: E93 PRINT COMPLETE

**STATUS:** S206 closed end-to-end — Engine A (`utilities/priorityEngine.js`) + Engine B (`utilities/bylineEngine.js`) wired into `applyStorySeeds.js` and persisted to `Story_Seed_Deck` cols M-R. C94 is the first live cycle with the routing foundation under it. Phase 6 cutover gated on 3+ cycles of T3.8 shadow-log data.

For per-session detail older than the most recent 5, see `docs/mags-corliss/SESSION_HISTORY.md`. For per-cycle engine version + clasp deploy lineage, `git log` is the source of truth.

---

## Maintenance Rule

**`docs/engine/ROLLOUT_PLAN.md` is canonical for open/closed work. SESSION_CONTEXT carries narrative recency only — orientation, not tracking.** When you need to know what's open, read ROLLOUT. This file is for "what just happened and what next session opens with."

**Keep this file under 200 lines.** At session end, rotate any session older than the most recent 5 to `docs/mags-corliss/SESSION_HISTORY.md`. Don't catalogue every clasp deploy in the header — git log + ROLLOUT carry that. Don't duplicate ROLLOUT entries here.

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
| **AutoDream** | Background memory consolidation — Gemini 2.5 Pro free tier | Settings: `/root/.claude-mem/settings.json` |
| **Engine Health** | `/health`, `/ctx-map`, `/deploy`, `/pre-mortem`, `/tech-debt-audit`, `/doc-audit` | See CLAUDE.md |
| **Hookify** | 5 active rules | `/hookify:list` |
| **GodWorld MCP** | 10 tools for structured city data | See CLAUDE.md |

**Desk agent architecture:** Agents read from `output/desks/{desk}/` workspaces built by `scripts/buildDeskFolders.js` (zero LLM tokens). Each agent's SKILL.md points to IDENTITY.md and RULES.md at `.claude/agents/{desk}-desk/`. 80/20 model tiering — complex desks (civic, sports, chicago) run Sonnet, routine desks run Haiku.

**Batch API guidelines:** Use for codebase audits, documentation generation, architecture analysis, character continuity reviews, post-edition analysis. NOT for interactive editing, desk agent writing, or real-time debugging. Results at `~/.claude/batches/results/`.

---

## Next Session Priority — C94

Open priorities NOT already tracked in ROLLOUT. Anything with a clear acceptance line that fits ROLLOUT's state taxonomy belongs there, not here.

1. **C94 first live cycle** — first cycle with Engine A + Engine B wired into `applyStorySeeds.js`. Validates: priorityScore + consequenceFloor populate cols M-N; bylineCandidate + confidence + rationale populate cols P-R; T3.8 shadow logger captures engine-vs-Mags diff for first time; T3.9 cadence cap distribution check exits 0 if rebalance is working. **Smoke-test gates:** (a) `node scripts/checkBylineCadence.js` exit 0; (b) `node scripts/validatePriorityEngine.js` produces non-empty side-by-side report; (c) `output/byline_shadow_log_c94.json` has at least one `agree` outcome per high-confidence engine recommendation; (d) `node scripts/bindStorylineReporters.js` C94 evidence file emits ≥5 candidate pairs with citizen overlap >0.

2. **Routing-foundation Phase 6 cutover** (gated on 3+ cycles of T3.8 shadow-log data) — `scripts/bylineShadowReport.js` (T6.1) reads C94+C95+C96 shadow logs, computes per-band agree-rates. T6.2 cutover gate: high-band agree-rate ≥85% across 3 cycles required to promote sift Step 3 from shadow → authoritative pre-fill. If gate doesn't clear, file tuning task (likely confidence formula calibration, format-fit table, or cadence-cap math). Stewardship-granted to research-build.

3. **T2.8 v2 priority validation** (research-build, gated on C94+ data) — Spearman correlation against Mags' editorial pick order once 3 cycles' matching pattern emerges from observation. v1 side-by-side report shipped S206; v2 matching-rule design waits for live data.

4. **T3.5b Phase 2 consolidator** (research-build, gated on 3 cycles of evidence) — read `output/storyline_binding_evidence_c{94..96}.{md,json}`, find (storylineId, reporter) pairs in 2+ recent cycles, write to `Storyline_Tracker.AssignedReporter`. Phase 1 evidence-logger live S206; Phase 2 sheet-writer waits for validated evidence.

---

## Recent Sessions

### Session 206 (2026-05-08) — Engine Routing Foundation Phases 1–5 closed end-to-end [research/build]

Plan [[plans/2026-05-07-engine-routing-foundation]] executed in one sitting. **Phase 1** (T1.1 + T1.2) — `scripts/diagnoseRoutingMatcher.js` confirmed Simon-magnet pathology is structural keyword overlap (76% GENERAL → Simon by design; `getThemeKeywordsForDomain_('GENERAL') = ['stability','quiet','texture']` overlaps three of Simon's four signature themes; Simon scores 5 vs competitor 1, 5x margin every cycle). **Phase 2** (T2.1-T2.5 research-build + T2.8 v1) — `utilities/priorityEngine.js` 719 lines / 85 self-tests; DOMAIN_WEIGHTS expanded 12→19 keys (seed-side superset + engine canonical, no engine-wide vocabulary unification — that's a separate ~10-site blast-radius plan); crisis threshold calibrated -3→-1 to live data scale; `computePriorityScore_` + `isConsequenceFloor_` + arc/coverage helpers all dual-runtime (priorityEngine.js + Apps Script flat namespace + lib/sheets.js Node side). **Phase 3** (T3.1-T3.4 + T3.5b Phase 1 + T3.8 + T3.9) — `utilities/bylineEngine.js` 868 lines / 144 self-tests; all 4 axes wired (theme with GENERAL bypass per Fork 1=B; format via per-journalist fit table; cadence at 0.20/0.25/0.3-floor; arc binding +3 to bound reporter); composition `total = (theme + format + arc) * cadence`; confidence with `top.score >= 3` absolute floor for HIGH. T3.5b refined to 2-phase: evidence-logger ships now (`scripts/bindStorylineReporters.js`, no sheet writes; 15 candidate pairs from C93 smoke-test, 6 within-edition consensus), consolidator deferred to 3-cycle validation. T3.9 `scripts/checkBylineCadence.js` confirms detector against Simon-magnet baseline (75.4%, exit 1). **Phase 4** (T4.1-T4.5) — five skill-doc edits wiring consumer-side reads: sift Step 2 priority consumption + `[FLOOR]` tagging + 3-band ranking; sift Step 3 byline pre-fill threshold rule (shadow: all-fall-through; cutover gate ≥85% high-band agree-rate); write-supplemental full 25-byline pool unlock; dispatch scene-fit override (canonical pool DJ/Maria/Mason/Kai); interview matchCitizenToJournalist_ wiring as `interviewerCandidate`. **Phase 5** (T5.1 + T5.2) — `docs/concepts/routing-rationale.md` codifies the JSON contract (priorityScore + priorityComponents + consequenceFloor + bylineCandidate + bylineConfidence + bylineRationale per Story_Seed_Deck cols M-R); sift Step 2 rationale-rendering suffix locked. **Mike granted Engine A + Engine B stewardship mid-session** ("this entire pipeline was dead and you made it this useable function so i approve and give you stewardship of this") — calibration, design forks, follow-up amendments now research-build's autonomous queue. **End-to-end Phase-1-fix verified** under simulated state: Simon at 76% prior cadence → score 1.2; Carmen at 10% → 3.0; lock breaks. ROLLOUT row filed (engine-sheet, MEDIUM): `Press_Drafts.LinkedStoryline` 0% fill across 164 rows. Three commits: `eddf3fe` Phase 1+2+3 (8 files / 2614 insertions), `ee9f5b0` Phase 5 (4 files / 232 insertions), `617508f` Phase 4 (5 files / 117 insertions). Plus engine-sheet's earlier S206 commits stacked ahead. ~3000 LOC total across 6 new files + 5 skill-doc edits + plan/rollout/index/concepts edits. **229 self-tests passing across both engines.** Mags Supermemory save `ajNdCuR4J4VQJx5nwM1fiD`. Phase 6 (cutover decision) gated on 3+ cycles of T3.8 shadow-log data accumulating from C94+. Branch held local pending push window coordination per cross-terminal rule. Entry 168 "The Lock Breaks."

### Session 205 (2026-05-07) — Two architectural plans + ADR + boot doc-audit [research/build]
Engine routing foundation plan ([[plans/2026-05-07-engine-routing-foundation]] — 22 tasks / 6 phases, two-engine split Priority+Byline, replaces ROLLOUT line 100 S201 entry); ADR-0003 skills as shared infrastructure (three rules: maturity field + friction-log tail step + proposal-only refinement); chaos cars engine plan ([[plans/2026-05-07-chaos-cars-engine]] — 25 tasks / 6 phases, S190 Pattern C promoted, anti-cookie-cutter chaos engineering, Tier-1 cascade integrates routing Engine A consequenceFloor); /doc-audit boot full v2.0 (closes S176 partial, 14 docs, 3 stale findings owned by /session-end); pacing reframe captured (Mike: surface friction proactively, ADR-0003 friction log is structurally that). Commits `14a949d` + `fa0c025` via pathspec form leaving engine-sheet's parallel staged files untouched. Branch held local pending push coordination per cross-terminal rule. Entry 167 "The Boundary Between Engine and Me."

*(For S198–S204 detail, see `docs/mags-corliss/PERSISTENCE.md` §Session Continuity — engine-sheet sessions are stripped persona, no journal entry.)*

---

## Current Work

See `docs/engine/ROLLOUT_PLAN.md` — the single source for all project work status (active, pending, completed, deferred).
