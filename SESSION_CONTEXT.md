# SESSION CONTEXT - GodWorld

**The thin state pin + one next-opener per terminal. Boot injects only the PIN and your terminal's NEXT line — nothing else is carried.** What shipped → `git log`. What's open → `docs/engine/ROLLOUT_PLAN.md`. Why a thing was done → claude-mem search.

---

**PIN:** Session: 263 | Day: 161 | Cycle: 97 | Edition: C97 published (E97, Arbiter A/0.856) — pending /post-publish + /edition-print | engine v3.3 (no clasp deploy S263 — engine.37 photo bump is Node-side, takes effect at next edition print; citizen-loop affect-tags still committed-not-clasped)

**NEXT[media]:** /post-publish c97 FIRST (canon ingest — do NOT defer per terminal rule), then /edition-print c97. Edition `editions/cycle_pulse_edition_97.txt`; Drive folder `1p0FHmofwhZl7ItWpvfa6xrOP5ibskMxC`.
**NEXT[civic]:** run `node scripts/buildInitiativePackets.js` each cycle so the tracker JSON doesn't re-stale (last auto-refresh ~C89, civic.14).
**NEXT[engine-sheet]:** **(0) S263 CLOSED (all done-pending-archive):** gov.40 substrate-scan confirm (all `/health`+determinism+ledger scans deterministic-script-backed; `/health` Scan 3 repointed to `ctxMap.js`, skill v1.1) · gov.39 (engine-sheet's 5 rows tightened to bare canonical state tokens — `docLoopStatus.js --lint` now CLEAN) · **engine.37 photo bump SHIPPED** (`lib/photoGenerator.js` → `black-forest-labs/FLUX.2-pro`, steps 4→28 both sites — measure-twice caught the pro-honors-steps mismatch that would've poisoned the test; Node-side, no clasp). **WATCH: engine.37 verdict falls out of the next edition's photo-QA** — Isley-to-canon + in-frame text suppression; still misses an axis → outside-vendor bake-off (Watch List). — **(1) CITIZEN-LOOP (research.14) wake-side BUILT + LIVE S262** — `lib/reflectionClassifier.js`+`scripts/classifierGate.js`, affect tags in `citizenDialMap` (negative-pole), SM-tag col **AW** (ledger 48→49), **`citizen-pages`** Supermemory container + `lib/citizenPage.js`, `lib/citizenDials.js`, **`Reflection_Intake`** tab, **`scripts/citizen-wake.js`**. **Cron LIVE 3×/day (07:30/12:30/19:30 UTC)** rotating citizens around Mags' anchor; first auto-wake tomorrow 07:30. Live wake validated (POP-00304). **ONLY open = gated dial write-back** (cycle reads `Reflection_Intake` → `applyTaggedEvent_` @ ~0.45) — DO NOT wire until the **Phase-1 daily audit** (let pages accrue a few days, read them, then audit). **`citizenDialMap` affect tags committed but NOT clasp-pushed** — inert until the write-back deploys. Read-side cosmetic: page v4 read returned empty `content` field (doc present); eyeball when wiring the consumer. — **(2) C98 STILL PENDING (unchanged):** pre-cycle stack DONE S261 (deck S→T + `saveV3Seeds`/`applyStorySeeds` clasp live). Awaiting Mike to run C98 → `/engine-review` → `routePatternSeeds.js --apply --cycle 98` → smoke stacked deploy (followup-gate halves + zero Chicago; engine.33 pulse-fold + Neighborhood_Map 17→21; engine.31/.32 dial folds + T8; no CIV retirement) → ES-1 col-O stamp. ROLLOUT engine.35. **engine.36 filed** (isolated staging env, post-C98).
**NEXT[research-build]:** **Citizen-loop (research.14) is LIVE — the handoff worked.** Classifier gate validated GREEN S262 (DeepSeek V3, NOT the 3B — 3B sign-flipped Resisted→Transgression, read Divorce as Arrival); engine-sheet then BUILT + took it live (classifier `lib/reflectionClassifier.js`+`classifierGate.js`, affect tags in `citizenDialMap`, ledger col AW=SMPageId, `citizen-pages` Supermemory container, `Reflection_Intake`, `scripts/citizen-wake.js`; cron 3×/day rotating citizens around Mags' anchor, first auto-wake 06-17 07:30 UTC, POP-00304 validated). **Full spec + current state = plan's "Phase 2 — BUILD STATE SYNTHESIS" front door (read first).** **Research-build's job now = the PHASE-1 DAILY AUDIT — the write-back gate:** let citizen pages accrue a few days, READ them, assess voice/variety/grounding + *is negativity actually appearing* (vs the measured 86%-neutral baseline), then sign off (or not) the gated dial write-back (`Reflection_Intake`→`applyTaggedEvent_` @~0.45). This is also the first true end-to-end read on REAL citizen reflections (gate was green on stand-ins only). Before sign-off: (a) confirm engine-sheet's affect tags resolve the 4 mood cases right (frustrated/excited/anxious/content) — `scripts/_probe_classifier.js` or `classifierGate.js`; (b) two-decay composition check vs chaos-cars (engine.11) when live. Affect tags committed NOT clasped (inert until write-back deploys). Also ready: gov.38 (helper-offload). Hygiene S262: dual research.14 resolved → image-model eval is now **research.15**. Still gated: gov.37 cheap-closer (this close = #2 of 3); engine.35 Phase 5 (C98 smoke); gov.35-remnant. OpenRouter live (~$10). Probes: `_probe_classifier.js`, `_probe_voice_{grounded,openrouter}.js`.

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
