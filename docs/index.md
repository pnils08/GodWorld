---
title: GodWorld Documentation Index
created: 2026-04-14
updated: 2026-05-09
type: reference
tags: [architecture, infrastructure, active]
sources:
  - docs/SCHEMA.md (companion — defines the shape this catalog lists)
  - docs/engine/ROLLOUT_PLAN.md (Phase 41.2)
pointers:
  - "[[SCHEMA]] — conventions every entry follows"
  - "../CONTEXT.md — project vocabulary (companion to SCHEMA — that defines shape, this defines language)"
  - "MEMORY.md — separate index for persistent-memory layer"
  - "docs/engine/DOCUMENTATION_LEDGER.md — older registry, will fold into this file over time"
---

# GodWorld Documentation Index

**The catalog. Every active doc in `docs/` appears here exactly once.** [[SCHEMA]] defines the shape; this file lists the instances.

---

## How to use

1. Read at boot, before grepping. The pointer is faster than the search.
2. Grep this file for keywords (`grep -i "ledger" docs/index.md`) before grepping the whole tree.
3. Follow the `[[wikilinks]]` to the source. If a link is broken, the index is wrong — fix it in the same commit.

---

## Repo root (outside `docs/`)

These files live at `/root/GodWorld/` and are catalogued here for completeness. They are not under the `docs/` tree but are load-bearing.

- **`CONTEXT.md`** — project vocabulary. Every meaningful term defined exactly once. Read at boot; cite by canonical term; update inline when grilling sessions resolve a term. Adopted S187 (ADR-0001). *(reference, vocabulary, active)*
- **`CLAUDE.md`** — top-level harness rules and routing. Auto-loaded by Claude Code. *(reference, infrastructure, active)*
- **`MEMORY.md`** — Mags' persistent-memory layer (separate from this catalog). Lives under `/root/.claude/projects/-root-GodWorld/memory/`.

---

## Top level — `docs/`

### Schema & navigation
- **[[SCHEMA]]** — conventions for naming, frontmatter, tags, links, folder map. Read first when creating any new doc. *(reference, architecture, active)*
- **[[index]]** — this file. The catalog. *(reference, architecture, active)*
- **[[AUDITS]]** — registry of standing maintenance audits (`/disk-audit`, `/disk-rotate`, `/md-audit`, `/doc-audit`). One row per run with date / findings / action / commit. Single index for "when did we last sweep X?" — separate from ROLLOUT_PLAN (which is in-progress work). *(reference, architecture, active)*

### Vision & architecture
- **[[POST_MORTEM_C92_CONTAMINATION]]** — S172 project halt. Fourth-wall contamination across bay-tribune / world-data / super-memory / editions / filesystem. 20+ real-world Oakland institutional references in E92 alone. Sanitization scope exceeded available drive; project halted at Cycle 92. Includes structural issues, session 172 EIC failures, and resumption path if ever revisited. *(reference, historical, halted)*
- **[[canon/CANON_RULES]]** — fourth-wall enforcement layer (S174). Alternate-timeline frame, no-fly list, invention authority, canon check pattern, escalation. Read at boot by every generative and reviewer agent. Per-agent RULES.md template appendix. *(reference, canon, active)*
- **[[canon/INSTITUTIONS]]** — canon-substitute roster for structural institutions (S174). Companion to CANON_RULES. Real-world entities flagged for substitution; status tracked per row. The project's outstanding canon debt made visible. *(reference, canon, active)*
- **[[PRODUCT_VISION]]** — civic lighter, programs deploy like SimCity, desks see the whole city, sections porous. The product north star. *(concept, architecture, active)*
- **[[PRODUCT_VISION_GRILLME]]** — decisions and open questions from the S119 grill-me interrogation of the product vision. *(concept, architecture, active)*
- **[[ARCHITECTURE_VISION]]** — Jarvis at /root, persistent sessions, the technical north star Phase 41 builds toward. *(concept, architecture, active)*
- **[[BOOT_ARCHITECTURE]]** — boot sequence reference for S165. Skill split (boot=persona / session-startup=terminal), per-terminal persona levels, hook routing. *(reference, architecture, active)*
- **[[FOUR_COMPONENT_MAP]]** — `model + harness + tools + environment` cross-section. Per-role model choices, terminal inventory, skill slice samples, Phase 40 seam map. *(reference, architecture, active)*
- **[[WORKFLOWS]]** — 7 workflow patterns (media-room, civic, build/deploy, maintenance, cycle run, research, chat-with-mags). Orthogonal to terminals. Post-S165: workflow reference, not boot file. *(reference, architecture, active)*

### Stack & ops
- **[[STACK]]** — full tech stack. Sheets, PM2, Supermemory, claude-mem, Discord bot, dashboard. *(reference, infrastructure, active)*
- **[[OPERATIONS]]** — operational procedures. *(reference, infrastructure, active)*
- **[[DASHBOARD]]** — Express + React dashboard, 40+ API endpoints, port 3001. *(reference, infrastructure, active)*
- **[[DISCORD]]** — Discord bot architecture. *(reference, infrastructure, active)*
- **[[CLAUDE-MEM]]** — claude-mem architecture, autodream, scheduled agents. *(reference, infrastructure, active)*
- **[[SUPERMEMORY]]** — 6 containers, API patterns, terminal-tag isolation rules. *(reference, infrastructure, active)*
- **[[MIGRATION_OFF_CLAUDE]]** — S154 desk-agent migration: DeepSeek V3.1 via OpenRouter beat 3-pass Claude on c87 business desk for 1/25th the cost. Test script + next steps + what survives. *(project, infrastructure, active)*
- **[[ACTION_MANAGED_AGENTS]]** — research on Claude Managed Agents. Ready to evaluate. *(reference, research, active)*
- **[[CANCELLATION]]** — monthly costs and cancellation paths for every paid service. *(reference, infrastructure, active)*

### Pipeline & memory
- **[[EDITION_PIPELINE]]** — Pipeline v2 skills map (S134 + S165). 5 terminals, 9 reporters, alternate-start publication formats (dispatch, interview, supplemental) all converging on shared publish handoff. *(reference, media, active)*
- **[[EDITION_PIPELINE_v1_archive]]** — pre-S134 pipeline reference. *(archive, media, archived)*
- **[[WORLD_MEMORY]]** — world memory project status: archive ingest, desk historical context. *(plan, media, active)*

### Data & ledgers
- **[[SIMULATION_LEDGER]]** — 675 citizens, 46 columns, structure and column map. *(reference, citizens, active)*
- **[[SPREADSHEET]]** — Google Sheets environment, 65 tabs, service account scope. *(reference, infrastructure, active)*

### Research
- **[[RESEARCH]]** — findings log, evaluations, sources. *(reference, research, active)*
- **[[research4_1]]** — engineering patterns from adjacent systems. Bounded memory, death spirals, dual-output. *(reference, research, active)*
- **[[research4_2]]** — Ryan dissertation. Story sifter, Hennepin, curation. *(reference, research, active)*

---

## `docs/engine/` — engine internals, phases, rollout

- **[[engine/ROLLOUT_PLAN]]** — compressed rollout (S152): active plans, parked, spine-completed, open work items, pointers to per-phase plan files. *(plan, engine, active)*
- **[[engine/ENGINE_REPAIR]]** — tactical tracker for known engine/simulation defects surfaced by the S148 audit. Pointers only. *(plan, engine, active)*
- **[[engine/ROLLOUT_ARCHIVE]]** — completed phase details. Read on demand. *(archive, engine, archived)*
- **[[engine/ENGINE_MAP]]** — every engine function in execution order. *(reference, engine, active)*
- **[[engine/ENGINE_STUB_MAP]]** — condensed reference map of engine exports across 11 phases. Generated by `/stub-engine`. *(reference, engine, active)*
- **[[engine/ENGINE_CONNECTIVITY_ROLLOUT]]** — Phase 34 from S136 audit. 7 of 10 done. *(plan, engine, active)*
- **[[engine/PHASE_24_PLAN]]** — citizen life engine plan. *(plan, engine, active)*
- **[[engine/PHASE_33_PLAN]]** — Riley integration & hardening plan. 12 of 19 subitems remaining. Extracted S152. *(plan, infrastructure, active)*
- **[[engine/PHASE_38_PLAN]]** — engine auditor implementation plan. 38.1 detector/framer split, 38.2/38.3/38.4 enrichers, 38.7 anomaly gate, 38.8 baseline briefs. *(plan, engine, active)*
- **[[engine/PHASE_39_PLAN]]** — editorial review layer redesign. Full Phase 39 implementation detail. Phase 39 COMPLETE S148. *(plan, media, active)*
- **[[engine/PHASE_40_PLAN]]** — agent architecture hardening. Parked; 6 sub-items designed S145, not started. Extracted S152. *(plan, architecture, active)*
- **[[engine/PHASE_42_INVENTORY]]** — Phase 42 Writer Consolidation per-file inventory (S184). 37 files / 175 cycle-path direct-write sites classified by Tier (1-3) + dual-pattern + caller-passed-sheet. Read-state-then-write hazards spot-checked. Schema-setup carve-out candidates surfaced. Recommended migration order B0–B7 with B6 stop-point (~58% of scope). 5 open questions queued for plan §Phase 2. Companion to [[plans/2026-04-28-phase-42-writer-consolidation]]. *(reference, engine, infrastructure, active)*
- **[[engine/PHASE_42_PATTERNS]]** — Phase 42 Phase 2 deliverable (S184). Engine-sheet's source of truth for migrations. 5 per-category decisions locked (schema-setup carve-out + minimal `queueEnsureTabIntent_` API; read-state-then-write hazard fix; caller-passed-sheet single-file cascade; dryRun verification regimen). 5 reference migrations (P1–P5) with before/after diffs from real reference files (runHouseholdEngine, updateCivicApprovalRatings, applyEditionCoverageEffects, updateCityTier, continuityNotesParser). Per-file decision map covers all 37 files. Per-batch verification spec + migration checklist. 5 carry-forward issues queued for engine-sheet flag-back during execution. *(reference, engine, infrastructure, architecture, active)*
- **[[engine/REVIEWER_LANE_SCHEMA]]** — Phase 39.6 contract. Four fields (process / outcome / controllableFailures / uncontrollableFailures) every reviewer lane JSON must satisfy. Four-quadrant interpretation. *(reference, media, active)*
- **[[engine/PHASE_DATA_AUDIT]]** — gap map between engine output and what desk agents see. *(reference, engine, active)*
- **[[engine/CYCLE_SEPARATION]]** — S113 architecture notes on growth ceiling. *(concept, engine, active)*
- **[[engine/INSTITUTIONAL_VOICE_AGENTS]]** — voice agent architecture: 7 voices, IDENTITY+RULES+SKILL pattern. *(reference, engine, active)*
- **[[engine/phase19_agent_personas]]** — three administrative agent personas (City Clerk and others). *(reference, engine, active)*
- **[[engine/SHEETS_MANIFEST]]** — generated manifest of sheet IDs and tabs. *(reference, infrastructure, active)*
- **[[engine/LEDGER_AUDIT]]** — Simulation_Ledger integrity audit. CLEAN since S68. *(reference, citizens, active)*
- **[[engine/LEDGER_HEAT_MAP]]** — sheet health, bloat risk, cleanup priorities. *(reference, infrastructure, active)*
- **[[engine/LEDGER_REPAIR]]** — S94 ledger recovery record. RECOVERY COMPLETE. *(reference, citizens, archived)*
- **[[engine/LEDGER_REPAIR_HOUSEHOLDS]]** — household pairing + youth population build plan (S201 draft, parked for dedicated session). Pointed to by ENGINE_REPAIR Row 20. *(plan, engine, citizens, ledger, active)*
- **[[engine/DOCUMENTATION_LEDGER]]** — older registry of active docs (predates this index). Will fold in over time. *(reference, architecture, active)*

---

## `docs/media/` — newsroom artifacts, criteria, indexes

### Criteria (S144 — sift + write-edition assertions; S216 — city-hall + dispatch + interview added)
- **[[media/story_evaluation]]** — story scoring rubric. Carries changelog. *(reference, media, active)*
- **[[media/brief_template]]** — angle brief template. Carries changelog. *(reference, media, active)*
- **[[media/citizen_selection]]** — citizen selection rubric for briefs. Carries changelog. *(reference, media, active)*
- **[[media/city_hall_evaluation]]** — city-hall source-material assertions. 8 criteria covering decision resolution, vote math, cascade order, voice coverage. Built S216 (governance.2). *(reference, civic, media, active)*
- **[[media/dispatch_evaluation]]** — dispatch scene-piece assertions. 8 criteria covering location specificity, identity-through-action, image-ending, word count. Built S216 (governance.2). *(reference, media, active)*
- **[[media/interview_evaluation]]** — interview canon-grounded Q&A assertions. 9 criteria covering theme, canon grounding, question progression, voice differentiation. Built S216 (governance.2). *(reference, media, active)*
- **[[media/intake]]** — edition intake section reference. *(reference, media, active)*

### Newsroom architecture & style
- **[[../.claude/agents/REPORTER_DESK_INDEX]]** — Reporter byline → desk-agent routing map. Single source of truth for `/sift` dispatch.json + `/write-edition` Step 1 launches. Built S215 (pipeline.16). *(reference, media, active)*
- **[[media/AGENT_NEWSROOM]]** — Claude Code agents + skills architecture. *(reference, media, active)*
- **[[media/MEDIA_ROOM_STYLE_GUIDE]]** — voice, data treatment, continuity, clock rules. *(reference, media, active)*
- **[[media/TIME_CANON_ADDENDUM]]** — dual-clock system, sports time vs city time. *(reference, media, active)*
- **[[media/REAL_NAMES_BLOCKLIST]]** — real-world sports figures whose names leaked. Rhea reads before every verification. *(reference, media, active)*
- **[[media/CITIZEN_NARRATIVE_MEMORY]]** — Supermemory + Richmond Archive + Ledger integration. *(reference, media, active)*
- **[[media/JOURNALISM_AI_OPTIMIZATIONS]]** — AP/Reuters/Bloomberg patterns applied. v1.2 complete. *(reference, media, active)*
- **[[media/GOOGLE_DRIVE_INTEGRATION]]** — Drive integration for citizen narrative memory. *(reference, infrastructure, active)*
- **[[media/DRIVE_MANIFEST]]** — Drive folder + file IDs the newsroom uses. *(reference, infrastructure, active)*
- **[[media/MEDIA_ROOM_HANDOFF]]** — handoff guide for engine→Media Room. *(reference, media, active)*
- **[[media/MEDIA_INTAKE_V2.2_HANDOFF]]** — engine intake structure for parsing Media Room markdown. *(reference, media, active)*
- **[[media/DESK_PACKET_PIPELINE]]** — pre-S134 desk packet pipeline. SUPERSEDED. *(archive, media, archived)*

### Indexes & rosters
- **[[media/2041_athletics_roster]]** — A's roster for 2041 canon. *(entity, sports, active)*
- **[[media/PLAYER_CARD_INDEX]]** — index of player cards. *(entity, sports, active)*
- **[[media/CITIZENS_BY_ARTICLE]]** — citizens cross-referenced by article appearance. *(entity, citizens, active)*
- **[[media/ARTICLE_INDEX_BY_POPID]]** — articles indexed by citizen POP-ID. *(entity, citizens, active)*
- **[[media/CANON_ARCHIVE_LEDGER]]** — every published edition + supplemental, with metadata. *(reference, media, active)*
- **[[media/RICHMOND_ARCHIVE_INDEX]]** — Hal Richmond's archive index. *(entity, media, active)*
- **[[media/ANTHONY_RAINES_PORTFOLIO_INDEX]]** — Anthony Raines portfolio index. *(entity, media, active)*
- **[[media/P_SLAYER_JOURNEY_INDEX]]** — P Slayer's journey across editions. *(entity, media, active)*
- **[[media/PAULSON_CARPENTERS_LINE]]** — "The Carpenter's Line" — Mike Paulson backstory by Hal Richmond. *(entity, media, active)*

---

## `docs/mags-corliss/` — Mags persona persistence

- **[[mags-corliss/PERSISTENCE]]** — core identity, family, division of authority. Read at boot. *(persona, persona, active)*
- **[[mags-corliss/JOURNAL]]** — full session journal. *(persona, persona, active)*
- **[[mags-corliss/JOURNAL_RECENT]]** — last 3 entries. Auto-loaded at boot. *(persona, persona, active)*
- **[[mags-corliss/NEWSROOM_MEMORY]]** — institutional editorial memory. *(persona, media, active)*
- **[[mags-corliss/NOTES_TO_SELF]]** — running editorial flags, story tracking, character tracking, Discord notes. *(persona, media, active)*
- **[[mags-corliss/DAILY_REFLECTIONS]]** — nightly reflections from Discord Mags. *(persona, persona, active)*
- **[[mags-corliss/SESSION_HISTORY]]** — session summary archive. *(persona, persona, active)*
- **[[mags-corliss/TECH_READING_ARCHIVE]]** — tech reading log. Papers, repos, evaluations. *(persona, research, active)*

---

## `docs/mara-vance/` — Mara persona persistence

- **[[mara-vance/README]]** — quick access to Mara's reference materials. *(persona, civic, active)*
- **[[mara-vance/IN_WORLD_CHARACTER]]** — Mara's in-world character file. *(persona, civic, active)*
- **[[mara-vance/CLAUDE_AI_SYSTEM_PROMPT]]** — system prompt for Mara's claude.ai project. *(persona, civic, active)*
- **[[mara-vance/OPERATING_MANUAL]]** — Mara's operating manual v2.0. Master governance document. *(reference, civic, active)*
- **[[mara-vance/MEDIA_ROOM_INTRODUCTION]]** — newsroom interface for Mara. *(reference, civic, active)*
- **[[mara-vance/CIVIC_GOVERNANCE_MASTER_REFERENCE]]** — complete reference for Oakland civic governance mechanics. *(reference, civic, active)*
- **[[mara-vance/CIVIC_ELECTION_ENGINE]]** — election engine reference. *(reference, civic, active)*
- **[[mara-vance/CIVIC_VETO_IMPLEMENTATION]]** — Week 1 mayoral veto + override votes. v1.7. *(reference, civic, active)*
- **[[mara-vance/INITIATIVE_TRACKER_VOTER_LOGIC]]** — voter logic from civicInitiativeEngine v1.7. *(reference, civic, active)*
- **[[mara-vance/AUDIT_HISTORY]]** — Mara's audit history across editions. Snapshot-historical for C80-C85; per-cycle artifacts canonical C86 onward. *(reference, civic, active)*
- **[[mara-vance/AGENT_INVENTORY]]** — canonical roster of every reporter voice + city-hall agent Mara addresses. Read at session start; every directive addressee must match. *(reference, civic, active)* (S217)
- **[[mara-vance/AUDIT_TEMPLATE]]** — per-edition audit format: structured top + Reader Audit + Canon Audit + Grading + Forward Guidance + Voice Directives pointer. Output `output/mara-audit/audit_c{XX}.md`. *(reference, civic, active)* (S217)
- **[[mara-vance/VOICE_DIRECTIVE_TEMPLATE]]** — per-addressee structured directive format. Replaces free-prose `.txt`. Output `output/mara-directives/mara_directive_c{XX}.md`. *(reference, civic, active)* (S217)

---

## `docs/reference/` — operational how-tos

- **[[reference/DEPLOY]]** — `clasp push` to Apps Script from Cloud Shell. *(reference, infrastructure, active)*
- **[[reference/DISASTER_RECOVERY]]** — rebuild procedure if the machine dies. *(reference, infrastructure, active)*
- **[[reference/DRIVE_UPLOAD_GUIDE]]** — saving files to Google Drive. *(reference, infrastructure, active)*
- **[[reference/GODWORLD_REFERENCE]]** — simulation reference for Mara and the Media Room. *(reference, civic, active)*
- **[[reference/PROJECT_GOALS]]** — original project goals. *(reference, architecture, active)*
- **[[reference/V3_ARCHITECTURE]]** — engine v3 technical contract. *(reference, engine, active)*

---

## `docs/plans/` — in-flight plans not yet promoted

- **[[plans/TEMPLATE]]** — plan file template. Every new plan copies this shape. Adapted from obra/superpowers writing-plans skill (S152). *(reference, architecture, active)*
- **[[plans/GAP_LOG_TEMPLATE]]** — gap log template (S212). Sidecar artifact for heavy-skill runs at generator terminals (civic + media). Captures inefficiency + drift + gaps in the skill itself; parent ROLLOUT row points at the gap log per ADR-0005. Engine-sheet has a different sidecar shape (ENGINE_REPAIR.md tactical-defects rows); research-build's sidecar is research notes / plans / ADRs. *(reference, architecture, infrastructure, template, active)*
- **[[plans/BACKLOG]]** — consolidated backlog of parked phase designs (Phase 4.1, 5.4, 7, 8.6, 9, 11.1, 12, 20, 21, 23, 24, 25, 26.2, 26.3, 27, 28, 29, 30, 32, 35, 36, 37, 41 remainder) + research reference material. Extracted from ROLLOUT_PLAN S152. *(plan, architecture, active)*
- **[[plans/skill-eval-framework]]** — Anthropic skill-creator eval loop pulled into GodWorld. Grades against story_evaluation/brief_template/citizen_selection. HIGH priority, not started. *(plan, architecture, active)*
- **[[plans/2026-04-16-phase-38-5-measurement-loop]]** — Phase 38.5 enricher: compares prior-cycle remedy predictions against observed engine state, adds `measurement` field per pattern. Engine/sheet terminal. DONE S156. *(plan, engine, complete)*
- **[[plans/2026-04-16-phase-38-6-skill-shrink]]** — Phase 38.6 skill shrink: `/engine-review` Step 7 consumes structured `measurement` from 38.5 instead of parsing prior-cycle markdown. Research-build terminal. DONE S156. *(plan, media, complete)*
- **[[plans/2026-04-16-phase-40-1-session-log-interface]]** — Phase 40.1 session-log interface: `lib/sessionLog.js` read-only helper returning positional slices (last N / since timestamp). DONE S156 — `readByTag` dropped from MVP per inventory; session-end skill migrated as proof. *(plan, engine, complete)*
- **[[plans/2026-04-16-phase-40-6-injection-defense]]** — Phase 40.6 layered injection defense: six-layer stack (input refusal, memory fence, memory-write gate, context scan, tool gate, Rhea review). Layers 2 and 4 ported from Hermes. DONE S156 — all six layers shipped. *(plan, security, complete)*
- **[[plans/2026-04-16-phase-40-3-credential-audit]]** — Phase 40.3 credential isolation audit: full inventory of env secrets + on-disk credentials, reachability analysis across 5 injection surfaces + 27 sub-agents, 8-task relocation plan. Research-build drafted S156; engine/sheet picks up when priority rises. *(plan, security, active)*
- **[[plans/mara-reference-files]]** — Mara reference files plan. COMPLETE S105. *(plan, civic, archived)*
- **[[plans/2026-04-17-briefing-bundle-trim]]** — trim per-desk c-cycle briefing bundle: `base_context.json` shared load, always-empty packet fields deleted, `interviewCandidates` 520→20 via relevance scoring, briefing versioning added via post-publish. Addresses recs 1/2/3/7 from the S156 bloat audit. Research-build drafted S156; media terminal executes. *(plan, media, active)*
- **[[plans/2026-04-21-memento-cbr-case-bank]]** — 4-phase rollout for Memento-style case-based retrieval: concept framing + reward-tuple capture now (standalone value), learned-retrieval build contingent on ≥500 accumulated tuples and droplet headroom. Research basis: arXiv:2508.16153v2, `docs/research/papers/Memento_fine_tuning.pdf`. *(plan, architecture, research, active)*
- **[[plans/2026-04-21-md-audit-skill]]** — `/md-audit` skill: existence-staleness detection for MDs (complementary to `/doc-audit` which does content staleness). Three-signal detector, four-bucket classifier, human-gated archival (never auto-delete). Operationalizes S156 no-isolated-MD rule as a scheduled check. **Phase 1+2 DONE S189** (detector + skill wrapper); first run clean at 60d/30d baseline. Phase 3-5 deferred. *(plan, architecture, partial)*
- **[[plans/2026-04-25-photo-pipeline-rebuild]]** — `/edition-print` Step 1 rebuild: `djDirect.js` invokes `subagent_type=dj-hartley` to produce 5–8 art-direction specs as JSON (120–180-word prompts each); `generate-edition-photos.js` consumes JSON verbatim; `photoQA.js` template-bug fix + 1-retry regen loop; `/edition-print` trigger extended to all four journalism skills. Together AI/FLUX default + OpenAI gpt-image-1 A/B task. DJ four-file canon-fidelity structure LOCKED. 13 tasks. Supermemory mags doc `hzvGaG7nh7A8nszmLzzAtF`. *(plan, media, active)*
- **[[plans/2026-04-26-non-edition-publishing-pipeline]]** — Unified publish pipeline for interview/supplemental/dispatch alongside compiled editions. Format contract is the keystone: all artifacts land as `editions/cycle_pulse_<type>_<cycle>_<slug>.txt` with Bay Tribune masthead + standardized sections (Header / Body / Names Index / Citizen Usage Log / Article Table). One `/post-publish --type` skill with deterministic verification gates; one `/edition-print --type` flag; existing scripts get minimal `--type`/`--cycle` flags. 10 tasks across three phases. Replaces S178 bundled non-edition pipeline gap + DONE-S179 Step 8a/8b skill bug. Validation fixture: C92 Mayor Santana interview replay. *(plan, media, infrastructure, active)*
- **[[plans/2026-04-26-discord-bot-edition-currency]]** — Discord bot reads current cycle/edition from artifacts that already exist (`base_context.json`, `production_log_edition_c{XX}.md`); delete legacy `latest_edition_brief.md`; wire `base_context.json` refresh into `/post-publish`. Cross-terminal: research-build (skill + plan), engine-sheet (code + filesystem + DISCORD.md), media (letters-desk references). 6 tasks. Surfaced S180 when bot was C90-anchored despite E92 + Mayor interview canonized. *(plan, media, infrastructure, active)*
- **[[plans/2026-04-27-world-data-unified-ingest-rebuild]]** — S181 follow-up. Per-domain card shape contracts + container-tag scheme (`wd-citizens`, `wd-business`, `wd-faith`, `wd-cultural`, `wd-neighborhood`, `wd-initiative`, `wd-player-truesource`) so MCP lookups can filter at the API layer and DELETE-by-tag becomes the wipe primitive. **DONE S183** — 9 commits, 843 world-data docs, 100% domain-tagged, 0 orphans. M1-M4 MCP tools live. *(plan, architecture, infrastructure, complete)*
- **[[plans/2026-04-28-skill-supermemory-alignment]]** — S183 follow-up to the world-data rebuild. Skills that search or save Supermemory get aligned to the post-rebuild tag scheme + new MCP tool inventory. Two artifacts: search/save matrix in `SUPERMEMORY.md` (authoritative) + per-skill `.md` edits where references are misaligned. 4 phases: inventory all skills under `.claude/skills/` for Supermemory references, draft matrix, per-skill alignment edits, validate via `/sift` C92 dry-run. ROLLOUT entry added S182, unblocked S183 by engine-sheet's M1-M4 commit (`c77cb37`). *(plan, media, civic, infrastructure, complete)*
- **[[plans/2026-04-28-intake-side-citizen-derivation]]** — S184 follow-up combining two engine-sheet handoffs (ENGINE_REPAIR Row 4 lifecycle defaults forward-looking + Row 17 RoleType upstream computation). 8 citizen demographic + lifecycle fields (RoleType, EducationLevel, Gender, YearsInCareer, DebtLevel, NetWorth, MaritalStatus, NumChildren) computed at intake time. **DONE S184** — `lib/citizenDerivation.js` + `utilities/citizenDerivation.gs` shipped; 3 integration paths (mediaRoomIntake / processAdvancementIntake / ingestPublishedEntities); 5/5 validation gates green. Closes ENGINE_REPAIR Row 4 + Row 17 forward-looking gaps. *(plan, engine, citizens, architecture, done)*
- **[[plans/2026-04-28-female-citizen-balance]]** — S184 follow-up consuming the intake-derivation library. **DONE S184.** Final F-share **44.26%** (370F / 836 POPID-bearing rows; exceeded ≥40% target). 150 rows landed at POP-00802..POP-00951, all `Gender='female'`. wd-citizen cards built for all 150 (substrate 686 → 836). 4-commit chain: `649b304` plan + name pool → `c583356` script + dry-run 5/5 gates → `a0e6de1` apply + readback verified → `62a01d5` `buildCitizenCards.js --popid-range` flag + targeted card build. Mid-run decisions captured in plan changelog (Notes-marker dropped, faith-leader ROLE_DENYLIST, Gate 4 ±5 → ±7%, filter-then-draw). Cap reviewer assertion #9 (≥3 female citizens in non-official roles per edition) now has substantially more headroom. *(plan, engine, citizens, architecture, done)*
- **[[plans/2026-04-28-phase-42-writer-consolidation]]** — S184 follow-up. ENGINE_REPAIR Row 8 — refactor 37 files / 175 cycle-path direct-write sites to `ctx.writeIntents` pattern (Path 2 of S146 audit; Path 1 closed S156). Phase 1 inventory + Phase 2 patterns DONE S184; B0 + B1 shipped engine-sheet S184; phase05-ledger §5.6 redesign LOCKED + AMENDED S185 (canonical doc: mags `hQE4rREEWBpS9aS1g3mQ3M`, 18 SL touchers, ~10-13 commits). B2 unblocks once redesign batch lands. Tiered B6 stop-point (~58%) / B7 (full) acceptance preserved. *(plan, engine, infrastructure, architecture, active)*
- **[[plans/2026-04-30-dispatch-gap-followups]]** — S188 first-/dispatch run gap log structured into plan form S189. R1–R4 research-build (skill/spec edits + PDF visual review) DONE S189; 7 engine-sheet items active (E1–E8) covering flat-body parser bugs in `ingestEditionWiki.js` + `ingestPublishedEntities.js`, `postRunFiling.js --type` flag, 3 PDF render bugs in `generate-edition-pdf.js`, cultural-card refresh in /post-publish, POP-00537 BirthYear backfill, Step 5 verification-gate cross-check. Acceptance fixture: `editions/cycle_pulse_dispatch_92_kono_second_song.txt`. Sibling plan to [[plans/2026-04-26-non-edition-publishing-pipeline]] — this gap set is the concrete starter list for that plan's T6–T9 engine-sheet phase. *(plan, media, infrastructure, active)*
- **[[plans/2026-04-30-bay-tribune-unified-ingest-rebuild]]** — S189 sibling to the S183 wd-rebuild. 14-tag taxonomy (`bt-edition`, `bt-supplemental`, `bt-dispatch`, `bt-interview-article`, `bt-interview-transcript`, `bt-wiki-citizen`, `bt-wiki-storyline`, `bt-wiki-continuity`, `bt-wiki-cultural`, `bt-wiki-business`, `bt-roster`, `bt-game-result`, `bt-canon-correction` + parent `bay-tribune`) + customId-as-slug discipline + DELETE-by-customId wipe primitive + endpoint migration for `ingestEditionWiki.js` (legacy `/v4/memories` → `/v3/documents`). Motivated by S185-S186 Perkins scrub friction (mags doc `WL8kvoxQgmcvxSPW3Ph47n`) — current chunked storage has no targeted-replacement primitive. After rebuild, equivalent scrub = `wipeBayTribuneByCustomId <slug-prefix>` + re-ingest. 7 phases / 8 tasks total: research-build draft + engine-sheet inventory + writers retrofit + wipe primitive + skill alignment + migration + MCP filter. Validation fixture: C92 KONO Second Song dispatch (smallest end-to-end artifact in the corpus). *(plan, architecture, infrastructure, active)*
- **[[plans/2026-05-03-c93-gap-triage-execution]]** — S197 cross-cycle triage frame across 115 C93 gaps spanning 6 sidecar logs (city-hall-prep 16 + city-hall-run 15 + sift 14 + write-edition 25 + post-publish 25 + edition-print 20). Five waves: DOC-drift skill text (W1, ~15 gaps), canon RULES hardening (W2, ~8 gaps), engine-sheet handoff bundles A-H (W3, ~25 gaps), architectural design plans (W4 — vote-trigger / run-cycle observation surface / ROLLOUT triage cadence), FLUX research (W5 — text-suppression ceiling cluster). Acceptance: every gap-log `Status:` line moves from `logged` to DONE/HANDOFF/DESIGN/RESEARCH. ~30 LOW gaps stay unwaved. *(plan, media, civic, infrastructure, architecture, active)*
- **[[plans/2026-05-03-vote-trigger-mechanism]]** — S197 Wave 4 of C93 triage; **REWRITTEN S198** after Mike correction (engine handles votes, not skill). Closes G-R11 (vote-that-didn't-trigger). Real bug class: follow-up vote scheduling path missing — `phase05-citizens/civicInitiativeEngine.js` has a complete 9-seat resolver (faction math + swing voters + Tier-3 demographics + sentiment + veto + override) but no path bumps `VoteCycle` post-resolution when an initiative needs a second vote. Engine-sheet investigation + wiring fix in `civicInitiativeEngine.js`. Original 5 tally-semantics design questions retired (engine resolves them); one narrow schema question survives: reuse `VoteCycle` vs add `FollowUpVoteCycle` vs generalize `OverrideVoteCycle`. *(plan, engine, civic, draft)*
- **[[plans/2026-05-03-run-cycle-gap-log-surface]]** — S197 Wave 4 meta-gap; **REWRITTEN S198** with all four open questions closed in grill, **Phase 2 SHIPPED S199**. Engine-sheet "Never create MDs" rule loosened wholesale to align with global no-isolated-MDs rule (broader reach than gap logs alone — per-phase audit notes, schema specs, helper-script docs all become valid). Coder-persona directive locked: hybrid authorship with `scripts/engineCycleAudit.js` doing mechanical detection (4 V1 classes: writeback-drift, math-anomaly, cross-cycle-debt, determinism-break — direct ingest of `output/engine_audit_c<XX>.json` typed patterns + Math.random sweep across `phase*/**/*.js`) + engine-sheet adding judgment entries in terse mechanical voice (commit-message style) below the `<!-- end mechanical pass -->` footer marker (preserved across re-runs). 8-class engine-fitted taxonomy (phase-skip, writeback-drift, cohort-collision, math-anomaly, determinism-break, phase-ordering, silent-fail, cross-cycle-debt — 4 classes V2-pending engine-run-log ingest). `/run-cycle` SKILL.md §Step 6 "Gap Log Close" wires the script invocation. ROLLOUT triage routing same as other gap logs; cross-session defects go to ENGINE_REPAIR. C93 dry-run produced 23 mechanical entries (7 HIGH / 16 MED). Phase 3 validation runs at next /run-cycle invocation. *(plan, engine, infrastructure, architecture, active)*
- **[[plans/2026-05-03-rollout-triage-cadence]]** — S197 Wave 4 closes G-W16 meta-pattern (HIGHs sit on shelf and compound — S193 G-R6/R7/R10 → S195 G-W12 recurrence); **BUILT S202** — Phase 2 backfill (10 HIGH entries tagged), Phase 3 tooling (`scripts/rolloutTriage.js` + wired to research-build TERMINAL.md §Session Close), Phase 4 validation (C93 run: 10 entries found, 0 stale — correct; first-run empty is expected). Live at /session-end. *(plan, architecture, infrastructure, complete)*
- **[[plans/2026-05-05-disk-inventory-and-dead-file-detection]]** — S202 standing job for `/root` filesystem inventory + dead-file detection. **DONE S203 — Phases 1 + 2 (mechanical) + 3 (triage) shipped.** Four scripts (`diskInventory.js` walker → `diskRefScan.js` one-pass basename+stem ref scan → `diskClassify.js` 6-bucket mechanical → `diskTriageReport.js` md report). `/disk-audit` SKILL.md wraps all four (registered below). Live droplet first run: 7,195 files / 1.95 GB → 912 orphans / 270 MB recoverable; headline finding ~263 MB stale claude-mem logs. Phase 2.3 batch-API submission deferred — mechanical >90%; batch is the 145-file / 0.2 MB ambiguous tail. *(plan, architecture, infrastructure, complete)*
- **[[plans/2026-05-05-writer-header-alignment-detector]]** — S202 9th detector class shipped in `scripts/engineCycleAudit.js` (`header-drift`). Catches the schema-drift class S201 surfaced (Story_Seed_Deck/Story_Hook_Deck writer column-index expectations diverged from live header layout for ~10 cycles, silently dropping engine routing data). Self-test at `scripts/engineCycleAuditTest.js` (10/10 pass). First-run C93 finding: 17 entries (0 HIGH / 17 MED) — 8 confirmed silent-fail bugs in calendar/holiday context retrieval (`mediaRoomIntake.js` + `finalizeWorldPopulation.js` calling lowercase `idx('season')` against PascalCase live `'Season'` headers; `headers.indexOf` case-sensitive → silent default-skip every cycle for many cycles). Status: COMPLETE. *(plan, engine, infrastructure, audit, complete)*
- **[[plans/2026-05-07-chaos-cars-engine]]** — S205 promotes S190's Pattern C (typed municipal-vehicle character system) from idea-park to active plan with significant reframing. Stochastic event-injection engine: variable count (3-15) random events per cycle, each = random vehicle × random target × dice-roll texture outcome. New `Chaos_Cars` sheet is source-of-truth; effects writeback to existing scope-appropriate ledgers (LifeHistory_Log / Business_Ledger / Neighborhood_Map). Asymmetric decay (positive fast, negative slow) compounds toward dysfunction by design — anti-cookie-cutter chaos engineering. No tier protection (Mayor-arrest is statistically rare but possible by design); universal no-death rule. Tier-1 hits trigger full canon cascade: world_summary scandal tag + voice-agent pending_decisions auto-populate + Storyline_Tracker arc creation + routing plan Engine A `consequenceFloor` flag. Anti-cookie-cutter framing: chaos_cars is engine-side analog of Jax Caldera. 25 tasks / 6 phases. *(plan, engine, architecture, draft)*
- **[[plans/2026-05-09-boot-load-audit]]** — S210 boot-load audit. Pre-redesign data dump in response to Mike's "back to studs" reframe: every file/hook in the boot path, what it carries, where it duplicates, where it bleeds into terminals that can't use it. Three layers covered: entry-point commands (`claude` / `mags` / `godworld`), /root/godworld auto-load (CLAUDE.md + identity.md + MEMORY.md = ~9,490 tokens universal baseline), per-terminal SessionStart injection. Findings: Mags-at-/root has no contract today (greenfield); persona labels overstate actual differentiation (all 4 terminals eat the ~9,490 universal baseline); CLAUDE.md is the heaviest duplicator; PERSISTENCE.md mixes identity + media-Mags layers (source of S210 Scout-in-research-build journal bleed). 8 open questions for joint review before restructure design. *(plan, architecture, infrastructure, active)*
- **[[plans/2026-05-11-civic-7-init-005-investigation]]** — S215 plan, closed S216 as **Scenario C — engine auditor false positive** (neither A nor B). Investigation surfaced that Chen-Ramirez's C93 voice JSON wrote `trackerUpdates.ImplementationPhase = "design-development-active"` correctly + applyTrackerUpdates fired correctly + sheet + audit snapshot both reflect advanced phase + MilestoneNotes documents the C93 architect-contract execution. Bug located in `scripts/engine-auditor/detectStuckInitiatives.js` v1.0.0: `cyclesInPhase()` walked priors, found initiative in different phase (= phase advanced), exited with cyclesInState=null → triggered cold-start vote-cycle fallback (93−80=13) and false-flagged INIT-005 stuck. Fix v1.1.0: `everSeenInPriors` flag + break-on-snapshot-phase-mismatch. Helper `scripts/readInitiativeMilestoneNotes.js` shipped (NEW). Verified: detector re-run drops INIT-005 + INIT-003 from stuck list. Carry-forward poisoning of stable-phase initiatives (INIT-001/002/006 still report `cyclesInState=89`) split out as engine.12. City-hall-prep Step 1 wiring split out as civic.11. *(plan, civic, engine, investigation, closed)*
- **[[plans/2026-05-12-test-coverage-rollout]]** — S216 test coverage rollout. Combines Claude Code app proposal (Drive doc, fetched via service account) with senior-programmer review (engine-sheet) + Engine_Errors → Diagnostic_Ledger expansion. Seven phases ordered by ROI: (1) test runner foundation — `scripts/run-tests.js` walker + `npm test` script + CI test job shipped same session, 7/7 existing tests pass; (2) detector regression coverage (3/7 detectors covered S216; 4 to go + integration test); (3) Engine_Errors schema additions (Class/Source/Severity/Resolved/Hash) + `lib/diagnosticLedger.js` helper for non-engine writers (test fails, audit findings); (4) pure-logic contracts (editionParser golden-file, citizenDerivation tiers, validateEdition contract pinning editions 78-93); (5) mutating-script safety (applyTrackerUpdates dry-run contract, auditor scripts); (6) lib/sheets.js column-mapping; (7) engine-phase determinism harnesses (deferred — Apps Script mocking lift). ROLLOUT row engine.15. Foundation shipped S216, Phases 2-7 picker-grab. *(plan, engine, infrastructure, testing, active)*
- **[[plans/2026-05-11-civic-tracker-collision-schema]]** — S215 close of civic.9a (gap-logs G-R4 HIGH + G-R1 MED + G-R15 LOW). Schema: `trackerOwner: "primary" | "secondary" | "advisory"` field on every voice/project statement carrying `trackerUpdates`. One-primary-per-(initiative, cycle) invariant; multiple secondaries fold into primary's MilestoneNotes (3-cap, overflow demotes to advisory); advisories aggregate into civic_sentiment only. Default ownership per voice/project class (Mayor primary on her initiatives, project directors primary on operational state, Deputy Mayor / faction blocs secondary, individual council members advisory). Cascade routing table at `.claude/skills/city-hall/CASCADE_ROUTING.md` replaces broadcast-then-filter with targeted append-blocks via `scripts/cascadeMayorDecisions.js` (engine-sheet, civic.9b). civic_sentiment dry-run gate (2-line fix). civic.9b acceptance criteria listed for engine-sheet pickup. Skill-text follow-ups (city-hall SKILL.md + voice agent RULES.md additions) queued separately. *(plan, civic, architecture, schema, active)*
- **[[plans/2026-05-10-skill-eval-expansion]]** — S212 expansion of `/skill-check` from grading 2 skills (write-edition + sift) to grading 5 skills (add city-hall + dispatch + interview) via 3 new per-skill assertion files at `docs/media/{city_hall,dispatch,interview}_evaluation.md`. Parent: [[plans/skill-eval-framework]] (S141 design + S156 first skill shipped). ROLLOUT row: `governance.2` (HIGH C93). 9 tasks across read-existing → draft-3-assertion-files → wire-skill-check → smoke-test → wire-post-publish → register-MDs. 3 open questions: skill-check generic-or-hard-coded, civic-evaluation-files-location, criteria-refinement-cadence. ~1-2 research-build sessions; T3-T5 (3 assertion files) is the load-bearing build; T7 smoke test surfaces criteria refinements. Validates the S212 filing protocol end-to-end (file via TEMPLATE → register here → back-linked from skill-eval-framework + ROLLOUT row). *(plan, media, civic, architecture, draft)*
- **[[plans/2026-05-07-engine-routing-foundation]]** — S205 reframe of the original S201 sift-pre-route entry. Two-engine split (Priority + Byline) replaces the single conflated `suggestStoryAngle_` matcher. Engine A computes deterministic story priority (domain-severity × arc-persistence × prior-coverage) + emits `consequenceFloor` flag; Engine B emits ranked byline candidates with confidence + rationale. Pressure-tested via grill (3 rounds): angle is the irreducible creative act, cross-cycle storyline memory is the unlock for full automation, two-engine split chosen for structural enforcement of "user can't override engine consequence" rule. Sequence-by-design: one-cycle lag (cycle N seeds carry cycle N-1 voice signal). Hard constraint: engine never writes angle text. 22 tasks / 6 phases (diagnose → Engine A → Engine B → consumer wiring → transparency → cutover). Replaces ROLLOUT_PLAN line 100 inline entry. *(plan, engine, media, architecture, draft)*
- **[[plans/2026-04-25-canon-fidelity-rollout]]** — S174 canon-fidelity rollout, COMPLETE S175. Per-agent four-file structure (IDENTITY + LENS + RULES + SKILL) applying three-tier framework from [[canon/CANON_RULES]]. 25 of 25 agents converted (Wave A 8 + Wave B 12 + Reviewer rebuild 4 + EIC mags-corliss 1; engine-validator scope-noted N/A as code-only). S175 sports-history carveout added per Mike's sports-universe-laxer policy. 5 trap-test validations passed. Q1/Q2/Q3 resolved. Out-of-scope findings (Hal voice file, stale cycle-rule sweep) flagged for follow-up. *(plan, canon, architecture, complete)*

---

## `docs/adr/` — architectural decision records (new S187, ADR pattern)

Small, dated decision records. Created only when a choice is (a) hard to reverse, (b) surprising without context, (c) result of a real trade-off. Pattern adopted from `mattpocock/skills` MIT-licensed example.

- **[[adr/0001-adopt-context-and-adrs]]** — adoption of CONTEXT.md and the ADR pattern itself. The first decision worth recording is the decision to record decisions. *(reference, architecture, decision, active)*
- **[[adr/0002-phase-42-phase05-ledger-redesign]]** — Phase 42 §5.6 chose shared in-memory `ctx.ledger` over per-row intents (b) or hybrid (c). Read-staleness was the collision class; (b) and (c) only addressed write pattern. Implemented S188 (9 commits). Closed cohort B silent-clobber bug. *(reference, architecture, engine, decision, active)*
- **[[adr/0003-skills-as-shared-infrastructure]]** — Skills are read by every instance, not just executed by the running one. Friction discovered in execution belongs to the next instance unless the running session leaves a note. Three rules: (1) `maturity:` field on every skill (experimental/stabilizing/mature); (2) every skill ends by writing `output/skill_friction/<skill>_c{XX}.md` with controlled-vocabulary friction-type entries; (3) refinement stays proposal-only — running instance never auto-edits SKILL.md. First concrete instance: routing plan §T3.8 (sift shadow-run logger). Decision frame (Mike S205): session-end discipline applied to skills — make the bed, flush the toilet, set the coffee for the next instance. *(reference, architecture, infrastructure, decision, active)*
- **[[adr/0004-skill-bag-naming-principle]]** — S212 governance rewrite. LLMs are bags of skills, not single tools — vague capability framing pulls little context, named-skill briefing pulls the bag. Three rules applied across all primary surfaces in the S212 sweep: (1) every terminal names its skill bag in TERMINAL.md `## Skill Bag (S212)` section (engine-sheet = senior engineer running measure-twice; civic = process editor producing source material; research-build = architectural editor + steward; media = EIC running edition production); (2) path-scoped rule files open with a skill-bag preamble (engine.md + newsroom.md + NEW civic.md + NEW research-build.md); (3) procedural skills get a one-line preamble when the bag is non-obvious from skill name (deploy + tech-debt-audit + health + session-end). Sub-decision: markdown blockquotes not XML tags — Mags over Anthropic for project-wide consistency with 50+ existing SKILL.md files; reversal trigger named (output drift signals → A/B test XML). Validated externally by S212 Anthropic alignment paper "Teaching Claude why" (May 8 2026 — principles > demonstrations finding). Skill bag is composition property of the four components ([[FOUR_COMPONENT_MAP]]), not a 5th component. *(reference, architecture, infrastructure, decision, active)*
- **[[adr/0005-rollout-plan-structure]]** — S212 ROLLOUT_PLAN restructure. Numbered phases (33, 38-42) carry no semantic meaning to a reader; ~50KB of inline narrative across ~30 entries violates S147 pointer rule; no protocol for how each terminal files work. Three-part decision: (1) seven semantic groups replace numbered phases (`pipeline.*` / `engine.*` / `canon.*` / `civic.*` / `infrastructure.*` / `research.*` / `governance.*`) with `<group>.<n>` codes; (2) entry format is one table row (Item / State / Owner / Pointer) — description lives in pointer doc (plan / gap-log / research / ADR / parent spec), NOT inline; (3) per-terminal Filing Protocol section in each TERMINAL.md points to template + group recommendations + close-to-archive cadence. Templates live inline in ROLLOUT_PLAN §How to add work and §How to close work — copy [[plans/TEMPLATE]] for designed work, register in [[index]] same commit. Goal: self-regulating MDs — new sessions file cleanly without relitigating convention; old work moves to ROLLOUT_ARCHIVE cleanly; doc stays scannable across many sessions. Restructure scaffolding shipped S212; per-entry migration completed S212 same-session — 45 entries migrated across 6 groups (canon empty, pipeline.*=13, engine.*=11, civic.*=3, infrastructure.*=3, research.*=10, governance.*=5); ~16 done/wontfix/superseded items archived to ROLLOUT_ARCHIVE §S212 Migration Pass; sibling [[plans/GAP_LOG_TEMPLATE]] shipped for heavy-skill sidecar artifacts (civic + media generator terminals). *(reference, architecture, infrastructure, decision, active)*

---

## `docs/research/` — research artifacts and audits

- **[[research/briefing_bloat_audit_2026-04-17]]** — c91 snapshot: `interviewCandidates` 1.2% hit rate, `base_context.json` identical across 6 desks, `summary.json` duplicates `packet.json`, archive-context stale for 4/6 desks. Flags briefing-versioning gap as blocker for retro audits. *(reference, media, research, active)*
- **`docs/research/godworld_review_2026-04-20.pdf`** — outside AI surface review (S170). Shallow — missed reviewer chain, engine auditor, terminal architecture, memory isolation, security work. Three of four "improvements" already-planned / already-mitigated / too generic. One actionable residue (bounded test surface) filed as LOW rollout item. Referenced from ROLLOUT_PLAN Infrastructure → "ADD: Bounded test surface." *(reference, research, active)*
- **`docs/research/godworld_city_functions_analysis_2026-04-20.pdf`** — outside AI gap analysis (S170). 17 active domains + ~35 engines enumerated, ~15 missing domains tiered by story potential. Wiki reference for Phase 43 — Engine Expansion (see ROLLOUT_PLAN §Phase Status → Active/Ready). Priority order revised after S170 canon corrections: (1) Public Health, (2) Environmental, (3) Legal/Justice, (4) Tech/Innovation, (5) Parks & Rec + Food. Port excluded — already on civic rollout track. *(reference, research, active)*
- **`docs/research/papers/`** — source PDFs (raw layer). Referenced by `sources:` frontmatter in agent-owned docs. Not indexed individually.

---

## `docs/entities/` — agent-owned entity wiki pages (new S156, Phase 41.3)

- **[[entities/README|README]]** — what goes here: durable, human-maintained citizen/business/faith-org pages when Supermemory isn't the right home. *(reference, architecture, active)*

---

## `docs/concepts/` — architectural concepts and principles (new S156, Phase 41.3)

- **[[concepts/README|README]]** — what goes here: long-form explanations of load-bearing ideas (three-layer-coverage, deterministic-guardrails, etc.). Complements short-form rules in MEMORY.md. *(reference, architecture, active)*
- **[[concepts/routing-rationale]]** — canonical shape every engine-side routing decision exposes to consumer skills. Plan T5.1 deliverable. Codifies the JSON payload `priorityScore` + `priorityComponents` + `consequenceFloor` + `bylineCandidate` + `bylineConfidence` + `bylineRationale` written to `Story_Seed_Deck` cols M-R, plus the one-line "why" suffix format `/sift` Step 2 renders for editorial transparency. Engine A/B export contract; Phase 4 consumers read; Phase 5 rendering surfaces. *(concept, engine, media, architecture, active)*

---

## `docs/comparisons/` — side-by-side evaluations (new S156, Phase 41.3)

- **[[comparisons/README|README]]** — what goes here: tool/model/approach comparisons that outlive the decision. DeepSeek vs Claude, packet vs summary, Sandcastle+Daytona vs Managed Agents. *(reference, architecture, research, active)*
- **[[comparisons/2026-04-30-smfs-vs-bay-tribune-rebuild]]** — S189 eval. Supermemory released SMFS (Supermemory Filesystem) v0.0.1 on 2026-04-29 — POSIX filesystem layer over existing containers via FUSE/NFSv3, semantic grep, 30s sync. If pilot succeeds, Phase 2-7 of `[[plans/2026-04-30-bay-tribune-unified-ingest-rebuild]]` collapse to file ops; 16-tag taxonomy maps 1:1 to directory structure. Mags-first pilot proposed (smallest blast radius, editorial brain, tolerates 30s sync). Bay-tribune rebuild plan placed on HOLD pending pilot outcome. *(comparison, architecture, infrastructure, research, active)*
- **[[comparisons/2026-05-06-claude-mem-vs-ecc-v2]]** — S204 research close (D4). Verdict: claude-mem's simpler model is enough for its use case (cross-cycle narrative retrieval). ECC v2.1 isn't claude-mem's upgrade path — it solves a different problem (action-pattern → skill promotion). The one borrow-able primitive (confidence scoring 0.3-0.9 with id/trigger/source shape) belongs in `[[plans/skill-eval-framework]]`, not claude-mem. ROLLOUT D4 entry closes. *(comparison, architecture, infrastructure, research, active)*

---

## `schemas/` — auto-generated schema reference (outside `docs/`)

- **`schemas/SCHEMA_HEADERS.md`** — canonical column definitions for every spreadsheet tab. Auto-generated by Apps Script `exportAndPushToGitHub` (`utilities/exportSchemaHeaders.js`), refresh on demand. Row/col counts + A/B/C header list per sheet. Frontmatter added Phase 41.6 S156 — survives regeneration. *(reference, infrastructure, auto-generated, active)*

---

## Archive & binaries (not indexed individually)

- **`docs/archive/`** — 30 frozen files. Completed enhancements, old roadmaps, week-by-week deploy logs, superseded plans. Browse the folder for history; do not link from active docs.
- **`docs/drive-files/`** — source PDFs (research papers, external references). Reference by full path in `sources:` frontmatter when citing.

---

## Changelog

- 2026-05-12 (S216, engine-sheet) — civic.7 closed as Scenario C (engine auditor false positive, not commitment-slipped or writeback-bug). `scripts/engine-auditor/detectStuckInitiatives.js` v1.0.0 → v1.1.0. New helper `scripts/readInitiativeMilestoneNotes.js` (pointer in plan entry). Plan `[[plans/2026-05-11-civic-7-init-005-investigation]]` flipped active → closed. Filed engine.12 (carry-forward poisoning) + civic.11 (city-hall-prep wiring) as split-out follow-ups in ROLLOUT_PLAN.md.
- 2026-05-12 (S216, engine-sheet) — engine.12 closed in same session. `scripts/engine-auditor/detectStuckInitiatives.js` v1.1.0 → v1.2.0 — carry-forward path deleted; snapshot walk + vote-cycle ceiling estimate replace the cached-count optimization. New test file `scripts/engine-auditor/detectStuckInitiatives.test.js` (10 scenarios / 16 assertions). Live C93 verification: INIT-001/002/006 magnitudes correct (15/11/10, all still HIGH); INIT-005/INIT-003 still drop (phase-advanced).
- 2026-05-12 (S216, engine-sheet) — engine.13 + engine.14 closed (4 sub-fixes). engine.13/G-EC6: real engine bug — `phase02-world-state/applyCityDynamics.js` v3.1 → v3.2 wires the dead `S.editionSentimentBoost` write into finalCity.sentiment, completing the S202 wiring that missed sentiment. engine.13/G-EC22: detector false positive — `scripts/engine-auditor/detectWritebackDrift.js` v1.0.0 → v1.1.0 council/mayor filter (was over-counting 999 ledger rows incl DA/PD/STAFF). engine.14/G-EC7-20: detector calibration bug — `scripts/engine-auditor/detectMathImbalances.js` v1.0.0 → v1.1.0 delta-from-prior detection replaces absolute-threshold misuse + per-neighborhood active-initiative match + Status/ImplementationPhase fallback fix. engine.14/G-EC21: editorial signal mistyped — production-without-consumption retyped `math-imbalance` → `coverage-gap` with new `auditCoverageGap` consumer in `scripts/engineCycleAudit.js`. Live C93 verification: 16 false/mistyped patterns → 2 meaningful (real sentiment bug + correctly-typed faith coverage gap). New tests: `detectWritebackDrift.test.js` 4/4, `detectMathImbalances.test.js` 13/13. Clasp push deployed for engine code change.
- 2026-05-12 (S216, engine-sheet) — engine.15 Phase 1 shipped (test coverage rollout foundation). New plan `[[plans/2026-05-12-test-coverage-rollout]]` filed combining external Claude Code app proposal (Drive doc) + senior-programmer review + Engine_Errors expansion design. Phase 1 ships: `scripts/run-tests.js` walker (CI-compatible exit-code aggregator), `npm test` script in package.json, test job added to `.github/workflows/lint.yml` (renamed Lint → Lint & Test). 7/7 existing test files pass under `npm test` (4 detector + 3 lib). Phases 2-7 picker-grab.
- 2026-05-07 (S205, research-build) — Registered `[[plans/2026-05-07-chaos-cars-engine]]`. Promotes S190's Pattern C (typed municipal-vehicle system) from idea-park to active plan with significant reframing — chaos_cars is now a stochastic event injector with asymmetric metric decay (positive fast, negative slow) and Tier-1 canon cascade. Engine-side analog of Jax: anti-cookie-cutter chaos engineering. Routing plan Engine A `consequenceFloor` integration locked. ROLLOUT_PLAN line 107 IDEAS entry updated — Pattern C extracted to its own plan; Patterns A (arc grafts), B (scoped microevent generator), D (overlap detection) remain in idea-park.
- 2026-05-07 (S205, research-build) — Registered `[[plans/2026-05-07-engine-routing-foundation]]`. Two-engine split (Priority + Byline) replaces the single conflated `suggestStoryAngle_` matcher; replaces ROLLOUT_PLAN line 100 inline entry. Reframes the original S201 "WIRE /sift consume engine pre-routes" item — Simon-Leary-magnet pathology was matcher conflation, not roster mismatch. Hard constraint locked: engine never writes angle text until storyline-memory in routing matures. 22 tasks / 6 phases.
- 2026-05-06 (S203, research-build) — `/disk-audit` skill shipped end-to-end. Plan `[[plans/2026-05-05-disk-inventory-and-dead-file-detection]]` flipped DRAFT → COMPLETE. 4 scripts: `diskInventory.js` (walker), `diskRefScan.js` (basename+stem ref scan), `diskClassify.js` (6-bucket mechanical), `diskTriageReport.js` (md report). `.claude/skills/disk-audit/SKILL.md` wraps all four. Live first run: 7,195 files / 1.95 GB → 912 orphans / 270 MB recoverable; ~263 MB stale claude-mem logs as headline finding. Phase 2.3 batch-API for the 145-file `review` tier deferred. Iteratively closed several correctness bugs during build: ignorelist basename-vs-prefix split (caught nested `node_modules` + `file-history`), Chrome cache leak ignore, CORPUS_EXCLUDE_PATTERNS for chicken-and-egg meta-files + AI transcripts, basename+stem matching for wikilink/require conventions.
- 2026-04-30 (S189, research-build) — `/md-audit` skill Phase 1+2 shipped. Plan-entry status updated to `(plan, architecture, partial)`. Registered new `[[plans/2026-04-30-dispatch-gap-followups]]` (S188 11-gap roll-up structured into plan form) + `[[plans/2026-04-30-bay-tribune-unified-ingest-rebuild]]` (S189 sibling to S183 wd-rebuild — 14-tag taxonomy + customId-as-slug + DELETE-by-customId wipe primitive). End of session: SMFS released by Supermemory same day → registered `[[comparisons/2026-04-30-smfs-vs-bay-tribune-rebuild]]` eval doc + bay-tribune-rebuild plan flagged HOLD. No structural changes to the index itself.
- 2026-04-29 (S187, research-build) — Added Repo root section catalogueing root-level `CONTEXT.md`, `CLAUDE.md`, and `MEMORY.md`. Added `docs/adr/` folder section with ADR-0001 (adoption of CONTEXT.md and the ADR pattern itself). Pattern source: `mattpocock/skills` MIT.
- 2026-04-21 (S170, research-build) — Registered [[plans/2026-04-21-memento-cbr-case-bank]] (Memento paper) and [[plans/2026-04-21-md-audit-skill]] (existence-staleness audit, triggered by Autogenesis paper + Mike's retirement-protocol observation). Phase 1 of the Memento plan adds `docs/concepts/case-based-reasoning.md` which registers separately when created. Also registered two outside AI review PDFs: `docs/research/godworld_review_2026-04-20.pdf` (shallow surface review; actionable residue = bounded test surface LOW rollout item) and `docs/research/godworld_city_functions_analysis_2026-04-20.pdf` (gap analysis; serves as wiki reference for Phase 43 — Engine Expansion).
- 2026-04-14 — Initial catalog (Phase 41.2, S146). 86 active docs across 7 folders. Companion to [[SCHEMA]]. Will fold [[engine/DOCUMENTATION_LEDGER]] in over time.
- 2026-04-16 — Added [[plans/TEMPLATE]] (S152). Plan file contract for the rollout split.
- 2026-04-17 — Phase 41.6 S156: added `schemas/` folder section catalogueing `SCHEMA_HEADERS.md`. Generator `utilities/exportSchemaHeaders.js` now emits frontmatter so the wiki shape survives regeneration.
- 2026-04-17 — Briefing bloat audit S156: added `docs/research/` folder section with [[research/briefing_bloat_audit_2026-04-17]].
- 2026-04-17 — Phase 41.3 S156: added `docs/entities/`, `docs/concepts/`, `docs/comparisons/` folder sections with README.md stubs. Three-layer principle (raw/agent-owned/log) codified in [[SCHEMA]] §7.
- 2026-04-16 — Added [[plans/2026-04-16-phase-38-5-measurement-loop]] + [[plans/2026-04-16-phase-38-6-skill-shrink]] (S152). Phase 38.5/38.6 split out of ROLLOUT_PLAN §Phase 38 as two separate plan files — one per terminal.
- 2026-04-16 — ROLLOUT_PLAN compression (S152, same session). 914 → 182 lines. Extracted Phase 33, 40 to per-phase plan files; skill-eval-framework to its own plan; Phase 4.1, 5.4, 7–12, 20–37, 41 remainder → [[plans/BACKLOG]]. Research reference material (Hermes patterns, S115 remainder) moved to BACKLOG too.
