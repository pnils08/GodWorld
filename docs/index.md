---
title: GodWorld Documentation Index
created: 2026-04-14
updated: 2026-04-17
type: reference
tags: [architecture, infrastructure, active]
sources:
  - docs/SCHEMA.md (companion — defines the shape this catalog lists)
  - docs/engine/ROLLOUT_PLAN.md (Phase 41.2)
pointers:
  - "[[SCHEMA]] — conventions every entry follows"
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

## Top level — `docs/`

### Schema & navigation
- **[[SCHEMA]]** — conventions for naming, frontmatter, tags, links, folder map. Read first when creating any new doc. *(reference, architecture, active)*
- **[[index]]** — this file. The catalog. *(reference, architecture, active)*

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
- **[[engine/REVIEWER_LANE_SCHEMA]]** — Phase 39.6 contract. Four fields (process / outcome / controllableFailures / uncontrollableFailures) every reviewer lane JSON must satisfy. Four-quadrant interpretation. *(reference, media, active)*
- **[[engine/PHASE_DATA_AUDIT]]** — gap map between engine output and what desk agents see. *(reference, engine, active)*
- **[[engine/CYCLE_SEPARATION]]** — S113 architecture notes on growth ceiling. *(concept, engine, active)*
- **[[engine/INSTITUTIONAL_VOICE_AGENTS]]** — voice agent architecture: 7 voices, IDENTITY+RULES+SKILL pattern. *(reference, engine, active)*
- **[[engine/phase19_agent_personas]]** — three administrative agent personas (City Clerk and others). *(reference, engine, active)*
- **[[engine/SHEETS_MANIFEST]]** — generated manifest of sheet IDs and tabs. *(reference, infrastructure, active)*
- **[[engine/LEDGER_AUDIT]]** — Simulation_Ledger integrity audit. CLEAN since S68. *(reference, citizens, active)*
- **[[engine/LEDGER_HEAT_MAP]]** — sheet health, bloat risk, cleanup priorities. *(reference, infrastructure, active)*
- **[[engine/LEDGER_REPAIR]]** — S94 ledger recovery record. RECOVERY COMPLETE. *(reference, citizens, archived)*
- **[[engine/DOCUMENTATION_LEDGER]]** — older registry of active docs (predates this index). Will fold in over time. *(reference, architecture, active)*

---

## `docs/media/` — newsroom artifacts, criteria, indexes

### Criteria (S144 — sift + write-edition assertions)
- **[[media/story_evaluation]]** — story scoring rubric. Carries changelog. *(reference, media, active)*
- **[[media/brief_template]]** — angle brief template. Carries changelog. *(reference, media, active)*
- **[[media/citizen_selection]]** — citizen selection rubric for briefs. Carries changelog. *(reference, media, active)*
- **[[media/intake]]** — edition intake section reference. *(reference, media, active)*

### Newsroom architecture & style
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
- **[[mara-vance/AUDIT_HISTORY]]** — Mara's audit history across editions. *(reference, civic, active)*

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
- **[[plans/BACKLOG]]** — consolidated backlog of parked phase designs (Phase 4.1, 5.4, 7, 8.6, 9, 11.1, 12, 20, 21, 23, 24, 25, 26.2, 26.3, 27, 28, 29, 30, 32, 35, 36, 37, 41 remainder) + research reference material. Extracted from ROLLOUT_PLAN S152. *(plan, architecture, active)*
- **[[plans/skill-eval-framework]]** — Anthropic skill-creator eval loop pulled into GodWorld. Grades against story_evaluation/brief_template/citizen_selection. HIGH priority, not started. *(plan, architecture, active)*
- **[[plans/2026-04-16-phase-38-5-measurement-loop]]** — Phase 38.5 enricher: compares prior-cycle remedy predictions against observed engine state, adds `measurement` field per pattern. Engine/sheet terminal. *(plan, engine, active)*
- **[[plans/2026-04-16-phase-38-6-skill-shrink]]** — Phase 38.6 skill shrink: `/engine-review` Step 7 consumes structured `measurement` from 38.5 instead of parsing prior-cycle markdown. Research-build terminal. Blocked-by 38.5 for full test. *(plan, media, active)*
- **[[plans/2026-04-16-phase-40-1-session-log-interface]]** — Phase 40.1 session-log interface: `lib/sessionLog.js` read-only helper returning positional slices (last N / since timestamp). DONE S156 — `readByTag` dropped from MVP per inventory; session-end skill migrated as proof. *(plan, engine, complete)*
- **[[plans/2026-04-16-phase-40-6-injection-defense]]** — Phase 40.6 layered injection defense: six-layer stack (input refusal, memory fence, memory-write gate, context scan, tool gate, Rhea review). Layers 2 and 4 ported from Hermes. Research-build drafted; engine/sheet builds. *(plan, security, active)*
- **[[plans/2026-04-16-phase-40-3-credential-audit]]** — Phase 40.3 credential isolation audit: full inventory of env secrets + on-disk credentials, reachability analysis across 5 injection surfaces + 27 sub-agents, 8-task relocation plan. Research-build drafted S156; engine/sheet picks up when priority rises. *(plan, security, active)*
- **[[plans/mara-reference-files]]** — Mara reference files plan. COMPLETE S105. *(plan, civic, archived)*
- **[[plans/2026-04-17-briefing-bundle-trim]]** — trim per-desk c-cycle briefing bundle: `base_context.json` shared load, always-empty packet fields deleted, `interviewCandidates` 520→20 via relevance scoring, briefing versioning added via post-publish. Addresses recs 1/2/3/7 from the S156 bloat audit. Research-build drafted S156; media terminal executes. *(plan, media, active)*
- **[[plans/2026-04-21-memento-cbr-case-bank]]** — 4-phase rollout for Memento-style case-based retrieval: concept framing + reward-tuple capture now (standalone value), learned-retrieval build contingent on ≥500 accumulated tuples and droplet headroom. Research basis: arXiv:2508.16153v2, `docs/research/papers/Memento_fine_tuning.pdf`. *(plan, architecture, research, active)*
- **[[plans/2026-04-21-md-audit-skill]]** — `/md-audit` skill: existence-staleness detection for MDs (complementary to `/doc-audit` which does content staleness). Three-signal detector, four-bucket classifier, human-gated archival (never auto-delete). Operationalizes S156 no-isolated-MD rule as a scheduled check. *(plan, architecture, active)*
- **[[plans/2026-04-25-photo-pipeline-rebuild]]** — `/edition-print` Step 1 rebuild: `djDirect.js` invokes `subagent_type=dj-hartley` to produce 5–8 art-direction specs as JSON (120–180-word prompts each); `generate-edition-photos.js` consumes JSON verbatim; `photoQA.js` template-bug fix + 1-retry regen loop; `/edition-print` trigger extended to all four journalism skills. Together AI/FLUX default + OpenAI gpt-image-1 A/B task. DJ four-file canon-fidelity structure LOCKED. 13 tasks. Supermemory mags doc `hzvGaG7nh7A8nszmLzzAtF`. *(plan, media, draft)*
- **[[plans/2026-04-25-canon-fidelity-rollout]]** — S174 canon-fidelity rollout, COMPLETE S175. Per-agent four-file structure (IDENTITY + LENS + RULES + SKILL) applying three-tier framework from [[canon/CANON_RULES]]. 25 of 25 agents converted (Wave A 8 + Wave B 12 + Reviewer rebuild 4 + EIC mags-corliss 1; engine-validator scope-noted N/A as code-only). S175 sports-history carveout added per Mike's sports-universe-laxer policy. 5 trap-test validations passed. Q1/Q2/Q3 resolved. Out-of-scope findings (Hal voice file, stale cycle-rule sweep) flagged for follow-up. *(plan, canon, architecture, complete)*

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

---

## `docs/comparisons/` — side-by-side evaluations (new S156, Phase 41.3)

- **[[comparisons/README|README]]** — what goes here: tool/model/approach comparisons that outlive the decision. DeepSeek vs Claude, packet vs summary, Sandcastle+Daytona vs Managed Agents. *(reference, architecture, research, active)*

---

## `schemas/` — auto-generated schema reference (outside `docs/`)

- **`schemas/SCHEMA_HEADERS.md`** — canonical column definitions for every spreadsheet tab. Auto-generated by Apps Script `exportAndPushToGitHub` (`utilities/exportSchemaHeaders.js`), refresh on demand. Row/col counts + A/B/C header list per sheet. Frontmatter added Phase 41.6 S156 — survives regeneration. *(reference, infrastructure, auto-generated, active)*

---

## Archive & binaries (not indexed individually)

- **`docs/archive/`** — 30 frozen files. Completed enhancements, old roadmaps, week-by-week deploy logs, superseded plans. Browse the folder for history; do not link from active docs.
- **`docs/drive-files/`** — source PDFs (research papers, external references). Reference by full path in `sources:` frontmatter when citing.

---

## Changelog

- 2026-04-21 (S170, research-build) — Registered [[plans/2026-04-21-memento-cbr-case-bank]] (Memento paper) and [[plans/2026-04-21-md-audit-skill]] (existence-staleness audit, triggered by Autogenesis paper + Mike's retirement-protocol observation). Phase 1 of the Memento plan adds `docs/concepts/case-based-reasoning.md` which registers separately when created. Also registered two outside AI review PDFs: `docs/research/godworld_review_2026-04-20.pdf` (shallow surface review; actionable residue = bounded test surface LOW rollout item) and `docs/research/godworld_city_functions_analysis_2026-04-20.pdf` (gap analysis; serves as wiki reference for Phase 43 — Engine Expansion).
- 2026-04-14 — Initial catalog (Phase 41.2, S146). 86 active docs across 7 folders. Companion to [[SCHEMA]]. Will fold [[engine/DOCUMENTATION_LEDGER]] in over time.
- 2026-04-16 — Added [[plans/TEMPLATE]] (S152). Plan file contract for the rollout split.
- 2026-04-17 — Phase 41.6 S156: added `schemas/` folder section catalogueing `SCHEMA_HEADERS.md`. Generator `utilities/exportSchemaHeaders.js` now emits frontmatter so the wiki shape survives regeneration.
- 2026-04-17 — Briefing bloat audit S156: added `docs/research/` folder section with [[research/briefing_bloat_audit_2026-04-17]].
- 2026-04-17 — Phase 41.3 S156: added `docs/entities/`, `docs/concepts/`, `docs/comparisons/` folder sections with README.md stubs. Three-layer principle (raw/agent-owned/log) codified in [[SCHEMA]] §7.
- 2026-04-16 — Added [[plans/2026-04-16-phase-38-5-measurement-loop]] + [[plans/2026-04-16-phase-38-6-skill-shrink]] (S152). Phase 38.5/38.6 split out of ROLLOUT_PLAN §Phase 38 as two separate plan files — one per terminal.
- 2026-04-16 — ROLLOUT_PLAN compression (S152, same session). 914 → 182 lines. Extracted Phase 33, 40 to per-phase plan files; skill-eval-framework to its own plan; Phase 4.1, 5.4, 7–12, 20–37, 41 remainder → [[plans/BACKLOG]]. Research reference material (Hermes patterns, S115 remainder) moved to BACKLOG too.
