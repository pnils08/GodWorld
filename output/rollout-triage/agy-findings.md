# ROLLOUT_PLAN Stale Rows Triage Findings

Research triage of 23 stale rows from `docs/engine/ROLLOUT_PLAN.md` (60+ days without pointer doc edits). Conducted on 2026-09-29 (canonical cycle C109).

---

### governance.18 — CLOSE-OBSOLETE
- open items named: Rotating journal recent entries to archive (`scripts/rotateJournalRecent.js`) and integrating into `/session-end` Step 1.
- evidence:
  - `docs/plans/2026-07-11-session-close-journal-rotation.md:12-14` notes journal writing retired at S300 and frozen 2026-07-11.
  - Commit `cdef3eba` ("S366: purge dead pre-S353 journal wiring") deleted `scripts/rotateJournalRecent.js` and removed Step 1 from `.claude/skills/session-end/SKILL.md`.
  - `.claude/skills/session-end/SKILL.md:1-25` contains zero journal rotation steps in the active session-close sequence.
- proposed edit: `state: wontfix`

### governance.26 — CLOSE-OBSOLETE
- open items named: Moving `SESSION_CONTEXT.md` working notes out of repo root into `docs/session-context/active/`, per-role log subdirectories, and an archive sweep script.
- evidence:
  - Superseded by S260 `governance.36` (`commit 79c376af`), which tightened `SESSION_CONTEXT.md` to a strict 16-line file (1 PIN line + 1 NEXT line per lane).
  - Directory `docs/session-context/` was never created (path does not exist in repo).
  - `AGENTS.md:315-345` establishes strict rules forbidding prose, headers, or working notes in `SESSION_CONTEXT.md`.
- proposed edit: `state: wontfix`

### governance.33 — CLOSE-DELIVERED
- open items named: Cross-terminal release lock protocol: research-build track (branch/lock convention) and engine-sheet track (C97 deploy gate).
- evidence:
  - `docs/plans/2026-06-12-cross-terminal-release-lock-protocol.md:183-189` records RB track shipped in S256 (`commit 67351ee2`) and ES track code shipped across `commits 3d281c4, b760188, e9f06c8`.
  - C97 release gate and deploy completed; live engine is currently on C109 (`output/production_log_c109.md:1-30`).
- proposed edit: `state: done-pending-archive`

### governance.34 — CLOSE-DELIVERED
- open items named: Resolve ENGINE_REPAIR Rows 29 and 30 by verifying `generateBaselineBriefs.js` checks office-holder status.
- evidence:
  - `scripts/engine-auditor/generateBaselineBriefs.js:256` contains the office-holder validation check (`isCurrentOfficeHolder`).
  - `docs/engine/archive/ENGINE_REPAIR.md:91-92` explicitly marks Rows 29 and 30 resolved in S259.
- proposed edit: `state: done-pending-archive`

### governance.35 — CLOSE-OBSOLETE
- open items named: Session-startup hook PIN check reading `docs/engine/CURRENT_CYCLE.json` instead of hardcoding or grepping `SESSION_CONTEXT.md`.
- evidence:
  - `SESSION_CONTEXT.md:3` defines `PIN:` as authored whole-world operational status owned by Claude terminals per `AGENTS.md:329`.
  - `.claude/hooks/session-startup-hook.sh:86` implements direct grep on `SESSION_CONTEXT.md` for the PIN line; mechanical script generation was abandoned.
- proposed edit: `state: wontfix`

### civic.13 — CLOSE-DELIVERED
- open items named: G-PREP6 Koreatown Northgate (KONO) profile in `phase08-v3-chicago/v3NeighborhoodWriter.js`.
- evidence:
  - `phase08-v3-chicago/v3NeighborhoodWriter.js:19-21` defines the full KONO profile (`'KONO': { ... }`).
  - Shipped in S258 via commit `e9f06c8ae7bc3704aabf5cc05944128cbf086f24`.
- proposed edit: `state: done-pending-archive`

### pipeline.2 — CLOSE-DELIVERED
- open items named: Article/Edition format contract: frontmatter, body, citizen usage log, and names index; unified publishing for dispatches and supplementals.
- evidence:
  - Ingestion contracts enforced across live editions, e.g. `editions/cycle_pulse_dispatch_102_*.txt` and `editions/cycle_pulse_supplemental_102_*.txt`.
  - `.claude/skills/post-publish/SKILL.md:250-258` and `scripts/ingestPublishedEntities.js:24-85` enforce exact intake sections.
- proposed edit: `state: done-pending-archive`

### pipeline.8 — CLOSE-OBSOLETE
- open items named: Ongoing investigative threads across editions (multi-cycle story continuity tracking).
- evidence:
  - Originated in S87 as an ungrounded general aspiration (`commit 1b4776f4`); `docs/EDITION_PIPELINE.md` contains no active tasks or implementation plan.
  - Interactive media terminal seats retired (`commit af48ec9c`); superseded by `engine.270` (`docs/plans/2026-09-28-storylines-keyed-to-engine-events.md:1-50`), which keys storylines to engine crisis arcs.
- proposed edit: `state: wontfix`

### pipeline.35 — CLOSE-OBSOLETE
- open items named: Production log skill (`/production-log`) to create cycle execution records.
- evidence:
  - `scripts/cron-civic-run.js:830` and `scripts/cron-desk-run.js:342` autonomously generate and append to `output/production_log_c{XX}.md` (e.g. `output/production_log_c109.md`).
  - Interactive skill concept superseded by autonomous headless cron logging.
- proposed edit: `state: wontfix`

### engine.7 — CLOSE-OBSOLETE
- open items named: Story priority engine and byline engine migration from shadow data cutover to production cutover.
- evidence:
  - `utilities/priorityEngine.js:1-40` and `utilities/bylineEngine.js:1-50` are active in production.
  - Manual shadow cutover superseded by autonomous desk routing in `engine.231`/`engine.232` (`commit ecf6d5ce`) and `scripts/cron-desk-writer.js`.
- proposed edit: `state: wontfix`

### engine.45 — CLOSE-DELIVERED
- open items named: Ripple Ledger attribution: T1-T3b schema and write logic; Tasks 4-6 contract seeds and post-cycle routing.
- evidence:
  - `docs/plans/2026-07-04-ripple-ledger-attribution.md:158` states: "This plan takes no further tasks. S311 — closed as delivered."
  - `Ripple_Ledger` tab active in production per `docs/engine/SHEETS_MANIFEST.md:61`.
  - Tasks 4-6 replaced by contract seeds via commit `b8359fc9`.
- proposed edit: `state: done-pending-archive`

### engine.51 — CLOSE-DELIVERED
- open items named: Intake ledger append: write lean 8-column rows to `Intake!A1` on post-publish ingestion.
- evidence:
  - `scripts/ingestPublishedEntities.js:787-847, 1390-1411` appends lean rows to `Intake!A1`.
  - `Intake` tab active in production per `docs/engine/SHEETS_MANIFEST.md:32`.
- proposed edit: `state: done-pending-archive`

### engine.53 — CLOSE-DELIVERED
- open items named: Citizen exchanges: 2-3 citizen dialogue generations per cycle, persistent storage, and media consumption.
- evidence:
  - `scripts/citizen-exchange.js:1-60` shipped in S312; crontab runs daily at 17:00 (`crontab.txt:9`).
  - Over 30 dialogue exchanges generated in `output/exchanges/` through C108.
  - Manual `/sift` consumption (T6) retired with media live seats.
- proposed edit: `state: done-pending-archive`

### engine.5 — CLOSE-DELIVERED
- open items named: Ledger repair households: resolve ENGINE_REPAIR Rows 20, 22, 24, 25 (household sizing and distribution anomalies).
- evidence:
  - Representative Sample model shipped via commit `d173310` (Phase 2b Track 1).
  - `docs/engine/archive/ENGINE_REPAIR.md:72-85` marks Rows 20, 22, 24, and 25 resolved.
  - Parent plan `docs/engine/archive/LEDGER_REPAIR_HOUSEHOLDS.md` archived.
- proposed edit: `state: done-pending-archive`

### engine.67 — CLOSE-DELIVERED
- open items named: ECL (Entity-Centric Ledger) deepening: Steps 1-9 schema expansion and storyline weaving integration.
- evidence:
  - Steps 1-9 shipped in S325 via commits `d1d28693` and `2865dfe9`; `involvedCitizens` active in event generation (`phase05-afternoon-events/generateAfternoonEvents.js:32-45`).
  - Remnant storyline weaving frozen/retired per `SESSION_CONTEXT.md:5`.
- proposed edit: `state: done-pending-archive`

### research.2 — CLOSE-OBSOLETE
- open items named: Memento CBR (Case-Based Reasoning) local fine-tuning on droplet.
- evidence:
  - Work was never started (0 commits touching Memento CBR model training); noted in S371 triage (`commit 12ea59b4`) as never cited.
  - Local fine-tuning abandoned in favor of external API model tiers (`docs/MODEL_HIERARCHY.md`).
- proposed edit: `state: wontfix`

### research.4 — CLOSE-DELIVERED
- open items named: Desk agents migration off Claude to cheaper models (DeepSeek-V3 / Haiku).
- evidence:
  - Shipped S332: `scripts/desk-model-map.json:1-140` routes desk writers to DeepSeek-V3 (`deepseek/deepseek-chat`).
  - Active execution in `scripts/cron-desk-writer.js:45-80` and `scripts/call-deepseek.js:1-50`.
- proposed edit: `state: done-pending-archive`

### research.13 — CLOSE-DELIVERED
- open items named: Citizen autonomous proof-of-concept: perception, memory retrieval, reflection generation, dial write-back.
- evidence:
  - PoC smoke-validated in S249 per `docs/plans/2026-05-31-citizen-autonomous-poc.md:174`.
  - Fully implemented in production via `scripts/citizen-wake.js:1-450` running 3x/day on crontab (`crontab.txt:7`).
- proposed edit: `state: done-pending-archive`

### research.17 — CLOSE-OBSOLETE
- open items named: Dynamic narrative arcs (P1/P2 storylines, ADR-0011).
- evidence:
  - Prior implementation declared dead at S306 due to ungrounded citizen slugs.
  - Rebuilt and replaced by `engine.270` (`docs/plans/2026-09-28-storylines-keyed-to-engine-events.md:1-50`) running under observation.
- proposed edit: `state: wontfix`

### research.19 — CLOSE-DELIVERED
- open items named: Citizen perception immersion layer: Tasks 1a/b/c, 2, 1a', 5 (neighborhood state, weather, memory priming, provocation diversity).
- evidence:
  - Tasks 1-2, 1a', 5 built and active in `scripts/citizen-wake.js:20-60` and `lib/wakePerception.js:1-120`.
  - T3/T4 out of scope per plan notes.
- proposed edit: `state: done-pending-archive`

### research.20 — CLOSE-DELIVERED
- open items named: Autonomous deep-dispatch for `/write-edition`: Phase 1 substrate (per-desk corpus storage, byline/desk tags), Phase 2 harness, Phase 3 pilot.
- evidence:
  - Phase 1 substrate shipped S311 in `scripts/postRunFiling.js:221` (`fileDeskArticles`) and `scripts/ingestEdition.js:289` (`extractBylineMeta`).
  - Phase 2 design shipped S274 in `.claude/skills/deep-dispatch/SKILL.md`; row already marked `done-pending-archive` in `docs/engine/ROLLOUT_PLAN.md:112`.
- proposed edit: none (already `done-pending-archive`; ready for sweep)

### research.21 — CLOSE-OBSOLETE
- open items named: Citizen-signal story emergence: detector build, post-cycle scheduling, affect↔engine corroboration, seed deck consumption.
- evidence:
  - Detector script was built in S277 (`scripts/citizen-signal-detector.js:1-294`, commit `43747d60`), but scheduling (Task 5) was never wired.
  - Feeding `Story_Seed_Deck` for manual `/sift` is obsolete; replaced by headless autonomous newsroom (`scripts/cron-desk-run.js`, `scripts/cron-saturday-run.js:541-570`) and `engine.270` (`docs/plans/2026-09-28-storylines-keyed-to-engine-events.md:21-39`), which keys storylines to engine crisis arcs rather than reflection convergence.
- proposed edit: `state: wontfix`

### infrastructure.3 — CLOSE-OBSOLETE
- open items named: Reviewer lanes to Claude Managed Agents: install SDK (`pip install claude-agent-sdk`), create `scripts/run-edition-managed.py`, pilot Carmen Delaine.
- evidence:
  - `docs/ACTION_MANAGED_AGENTS.md:1-144` created S137b (2026-04-08, commit `e02b45f7`) and untouched for 170+ days; `scripts/run-edition-managed.py` was never created and SDK was never installed.
  - Reviewer and desk execution was delivered via local VPS crons and OpenRouter/DeepSeek (`scripts/cron-desk-writer.js:45-80`, `scripts/desk-model-map.json`), rendering cloud-managed Anthropic agent infrastructure moot.
- proposed edit: `state: wontfix`

---

## Summary Table

| id | verdict | one-line reason |
|---|---|---|
| governance.18 | CLOSE-OBSOLETE | Journal writing retired S300 / frozen 2026-07-11; commit `cdef3eba` purged dead rotation script and skill step. |
| governance.26 | CLOSE-OBSOLETE | Superseded by S260 `governance.36` (`commit 79c376af`) establishing 16-line `SESSION_CONTEXT.md`; `docs/session-context/` never built. |
| governance.33 | CLOSE-DELIVERED | RB release lock shipped S256 (`commit 67351ee2`); ES track code shipped across `commits 3d281c4, b760188, e9f06c8`; C97 deploy done. |
| governance.34 | CLOSE-DELIVERED | Office-holder check shipped in `scripts/engine-auditor/generateBaselineBriefs.js:256`; ENGINE_REPAIR Rows 29/30 closed S259. |
| governance.35 | CLOSE-OBSOLETE | PIN is authored operational status owned by Claude terminals (`AGENTS.md:329`); startup hook directly greps `SESSION_CONTEXT.md:86`. |
| civic.13 | CLOSE-DELIVERED | KONO profile defined in `phase08-v3-chicago/v3NeighborhoodWriter.js:19-21` and shipped in S258 (`commit e9f06c8a`). |
| pipeline.2 | CLOSE-DELIVERED | Article/edition format contract and intake sections live in `.claude/skills/post-publish/SKILL.md:250-258` and published editions. |
| pipeline.8 | CLOSE-OBSOLETE | Ungrounded S87 aspiration with no plan tasks; media seats retired; superseded by `engine.270` engine-keyed storylines. |
| pipeline.35 | CLOSE-OBSOLETE | Interactive skill replaced by autonomous cron logging in `scripts/cron-civic-run.js:830` and `scripts/cron-desk-run.js:342`. |
| engine.7 | CLOSE-OBSOLETE | Priority and byline engines live; manual shadow cutover superseded by autonomous desk routing (`engine.231`/`232`). |
| engine.45 | CLOSE-DELIVERED | T1-T3b live in `Ripple_Ledger` tab (`SHEETS_MANIFEST.md:61`); Tasks 4-6 replaced by contract seeds (`commit b8359fc9`); plan closed S311. |
| engine.51 | CLOSE-DELIVERED | Intake append logic shipped in `scripts/ingestPublishedEntities.js:787-847, 1390-1411` writing lean 8-column rows to live `Intake!A1`. |
| engine.53 | CLOSE-DELIVERED | Citizen exchanges shipped in `scripts/citizen-exchange.js:1-60` on 17:00 daily cron; 30+ exchanges generated in `output/exchanges/`. |
| engine.5 | CLOSE-DELIVERED | Representative Sample model shipped (`commit d173310`); ENGINE_REPAIR Rows 20, 22, 24, 25 resolved in `docs/engine/archive/ENGINE_REPAIR.md`. |
| engine.67 | CLOSE-DELIVERED | ECL deepening Steps 1-9 shipped S325 (`commits d1d28693, 2865dfe9`); `involvedCitizens` active; storyline weaving retired. |
| research.2 | CLOSE-OBSOLETE | Memento CBR local fine-tuning never started (0 commits); noted in S371 triage (`commit 12ea59b4`) as never cited; API tiers adopted. |
| research.4 | CLOSE-DELIVERED | Desk agent migration to DeepSeek-V3 shipped S332 via `scripts/desk-model-map.json:1-140` and `scripts/cron-desk-writer.js:45-80`. |
| research.13 | CLOSE-DELIVERED | PoC validated S249; production citizen wake loop running 3x/day via `scripts/citizen-wake.js:1-450` on cron (`crontab.txt:7`). |
| research.17 | CLOSE-OBSOLETE | P1/P2 storylines declared dead S306; rebuilt and replaced by `engine.270` (`docs/plans/2026-09-28-storylines-keyed-to-engine-events.md`). |
| research.19 | CLOSE-DELIVERED | Perception immersion layer built in `scripts/citizen-wake.js:20-60` and `lib/wakePerception.js:1-120` (Tasks 1a/b/c, 2, 1a', 5). |
| research.20 | CLOSE-DELIVERED | Deep-dispatch Phase 1 substrate shipped S311 (`postRunFiling.js:221`, `ingestEdition.js:289`); row already `done-pending-archive`. |
| research.21 | CLOSE-OBSOLETE | Detector built S277 (`scripts/citizen-signal-detector.js:1-294`, `commit 43747d60`) but unscheduled; seed flow superseded by `engine.270`. |
| infrastructure.3 | CLOSE-OBSOLETE | Anthropic Managed Agents SDK never installed; autonomous newsroom runs locally via crons and DeepSeek (`scripts/cron-desk-writer.js`). |
