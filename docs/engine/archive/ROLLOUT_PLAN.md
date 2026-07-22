# GodWorld — Rollout Plan

**This file is canonical for open/closed work** (S207). Pointer-only: one line per job, detail lives in the pointer doc — never here (S286 hard rule, Mike-direct).

**Status:** ACTIVE (building) | **Last Updated:** Session 286 (2026-07-02) — pointer-collapse: all inline row detail relocated verbatim to owning plan docs; pre-collapse file in git history + section moves in [[ROLLOUT_ARCHIVE]].
**Filing protocol (S212):** semantic groups + pointer-only entries — see [[rollout-rules]] §3–§5 (taxonomy, add, close). Full design: [[../adr/0005-rollout-plan-structure]].
**North star:** `docs/ARCHITECTURE_VISION.md` — Jarvis + persistent sessions. Everything we build points there.
**Completed phase details:** [[engine/ROLLOUT_ARCHIVE]] — read on demand, not at boot.
**Research context:** `docs/RESEARCH.md` — findings log, evaluations, sources.
**Wiki layer:** [[SCHEMA]] (conventions) + [[index]] (catalog) — read at boot. (Phase 41.1 + 41.2, S146.)
**Plan-file contract:** [[plans/TEMPLATE]] — every new plan copies this shape (S152). Also referenced from [[rollout-rules]] §4.
**Phase backlog:** [[plans/BACKLOG]] — designs catalogued but not yet scheduled. Promote to its own plan file when a session picks one up.
**Terminal owners:** `engine-sheet` / `media` / `civic` / `research-build`. Research-build owns this doc; engine-sheet executes engine code; media runs editions; civic runs city-hall.

---

## Rules & conventions → [[rollout-rules]]

**The operating doctrine for this tracker lives in [[rollout-rules]].** State labels, group taxonomy, how to add/close work, filing, archiving, and the sweep code — one doctrine, every terminal follows it. Read it before adding or closing a row.

**Before you log an issue here:** rollout is the clean shared map. Skill terminals (civic/media) log issues in their per-cycle production gap log (that's the research layer) — **not** as raw rollout rows. A row only appears here when work is *promoted* to tracked, and it points at the gap log rather than reproducing it. Full rule: [[rollout-rules]] §2.

Rationale + alternatives: [[../adr/0005-rollout-plan-structure]]. The completed S145 10-step **Spine** roadmap is archived in [[ROLLOUT_ARCHIVE]].

---

## Open Work — by group

Per ADR-0005: each entry codes as `<group>.<n>`. State per [[rollout-rules]] §3. Description lives in pointer doc, NOT in the row. Heavy-skill gap logs (civic + media generator terminals) follow [[../plans/GAP_LOG_TEMPLATE]].

### pipeline.* — Edition production

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| pipeline.2 | Non-edition publishing pipeline (interview/dispatch/supplemental format contract) | in-progress | research-build / engine-sheet | [[../plans/2026-04-26-non-edition-publishing-pipeline]] |
| pipeline.3 | /interview Step 8d coverage-ratings — deferred decision pending evidence | needs-info | research-build | inline DEFERRED note in `/interview` SKILL.md Step 8d (S179) |
| pipeline.8 | Supplemental strategy — one per cycle minimum | in-progress | research-build | [[../EDITION_PIPELINE]] |
| pipeline.13 | Photo pipeline rebuild | in-progress | research-build | [[../plans/2026-04-25-photo-pipeline-rebuild]] — detail in pointer (relocated 2026-07-02) |
| pipeline.24 | /sift v2 rebuild | in-progress | research-build | [[../plans/2026-05-22-sift-v2]] + [[../media/brief_template_v2]] — detail in pointer (relocated 2026-07-02) |
| pipeline.37 | /post-publish C96 friction | ready | engine-sheet / research-build / media | [[../../output/production_log_c96_post_publish_gaps.md]] — detail in pointer (relocated 2026-07-02) |
| pipeline.36 | /edition-print C96 friction | ready | engine-sheet / research-build | [[../../output/production_log_c96_print_gaps.md]] — detail in pointer (relocated 2026-07-02) |
| pipeline.35 | Cycle-init "admin" skill + one-true-cycle-source | ready | research-build / engine-sheet | [[../plans/2026-05-31-cycle-init-admin-skill]] + [[../plans/2026-05-24-governance-14-edition-pipeline-rewrite]] — detail in pointer (relocated 2026-07-02) |
| pipeline.39 | C99 gap handoffs — post-publish/print/run-cycle logs + canon drift + letters-gate bug | ready | research-build / engine-sheet / media | [[../../output/production_log_c99_post_publish_gaps.md]] + [[../../output/production_log_c99_print_gaps.md]] + [[../../output/production_log_run_cycle_c99_gaps.md]] + canon_drift_c99.json — filed 2026-07-02 |
| pipeline.41 | Tensions → /sift story seeds — /sift reads the open tension register as door-knock candidates (subjective material, never publishable as fact) | ready | media | [[../plans/2026-07-06-citizen-loop-deepening]] §Task 8 |
| pipeline.43 | Citizen voice quote supply (PRIORITY, Mike-direct S312) — ALL T1–5 built (T1–2 live-verified S312); acceptance rides first live edition (C101 /write-edition) | in-progress | media (live verify) | [[../plans/2026-07-11-citizen-voice-quote-supply]] |
| pipeline.44 | Desk-slice fork (FLAGSHIP, Mike-direct S313) — T1–T4 done S313 (3 skills live); open: T5 post-publish fit, T6 pilot | in-progress | engine-sheet (T5) + media (T6) | [[../research/2026-07-11-desk-slice-fork]] |

### engine.* — Engine code, ledger, schema

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| engine.1 | Phase 40.2 cattle refactor (needs plan) | blocked | engine-sheet | [[PHASE_40_PLAN]] §40.2 |
| engine.2 | Phase 42 writer consolidation | in-progress | engine-sheet | [[../plans/2026-04-28-phase-42-writer-consolidation]] + [[PHASE_42_PATTERNS]] — detail in pointer (relocated 2026-07-02) |
| engine.3 | Advance-initiative remedy threshold calibration (post-E92 audit) | needs-info | engine-sheet | [[ENGINE_REPAIR]]; `output/engine_review_c92.md` |
| engine.4 | Dead spreadsheet-tab cleanup — 7/8 done. Faith_Ledger reclassified (consumer shipped S180; corrected via SPREADSHEET.md audit). **OPEN: Youth_Events** — flips done-pending-archive when engine.5 unblocks it OR Youth_Events is itself phase-disabled. | blocked | engine-sheet | [[../SPREADSHEET]] (tab audit) |
| engine.5 | Household + family simulation (Representative Sample model, reframed S243) — functional youth seed → engine life-event simulation → publication-driven family materialization. Steward authority granted S243. | in-progress | engine-sheet | [[LEDGER_REPAIR_HOUSEHOLDS]] |
| engine.6 | Press_Drafts.LinkedStoryline 0% populated (DEAD-COLUMN, 164 rows) | blocked | engine-sheet | [[ENGINE_REPAIR]] row |
| engine.7 | Engine Routing Foundation — Phase 6 cutover (gated on 3 cycles shadow data) | in-progress | research-build / engine-sheet | [[../plans/2026-05-07-engine-routing-foundation]] |
| engine.8 | Header-drift detector C93 Type-2 triage (16 MED clusters) + C94 sweep absorbed S225 (G-EC5–G-EC21 orphan literals + G-EC24–G-EC32 defensive-fallback noise + G-RC7 KONO civic.10b follow-up) per triage cluster C11 | blocked | engine-sheet | [[../plans/2026-05-05-writer-header-alignment-detector]] §Triage; C11 fold ref [[../plans/2026-05-22-c94-gap-log-triage]] §3 C11 |
| engine.9 | Bounded test surface | in-progress | engine-sheet | [[ENGINE_REPAIR]] — detail in pointer (relocated 2026-07-02) |
| engine.10 | Phase 43 — Engine Expansion (city-functions, 5-domain priority order) | needs-info | research-build / engine-sheet | `output/drive-files/godworld_city_functions_analysis_2026-04-20.pdf` |
| engine.11 | Chaos-cars engine | in-progress | engine-sheet / research-build | [[../plans/2026-05-07-chaos-cars-engine]] — detail in pointer (relocated 2026-07-02) |
| engine.15 | ENGINE_REPAIR `Pattern` column | needs-info | engine-sheet | [[ENGINE_REPAIR]] — detail in pointer (relocated 2026-07-02) |
| engine.20d | Sift Step 5 `covered-by-feature` triage handle — absorb regulatory-process noise into civic round-up. Cadence cap: at most 1 dedicated article per cycle per initiative AND only if actual movement (not process-tick). | blocked | media / research-build | blocked on pipeline.24 (sift v2); plan [[../plans/2026-05-22-engine-regulatory-friction]] §Task 5, cross-link C2 plan Task 5 |
| engine.27 | wd-card auto-invalidation hook | in-progress | engine-sheet | [[../plans/2026-05-26-engine-27-wd-card-auto-invalidation]] — detail in pointer (relocated 2026-07-02) |
| engine.29 | Citizen lifecycle & fame system | parked | engine-sheet | [[../plans/2026-05-30-citizen-lifecycle-fame-system]] + [[ENGINE_REPAIR]] — detail in pointer (relocated 2026-07-02) |
| engine.40 | Sports-stat intake | ready | research-build → engine-sheet | [[ENGINE_REPAIR]] — detail in pointer (relocated 2026-07-02) |
| engine.41 | Engine-output → canon coverage | in-progress | engine-sheet | [[../plans/2026-06-24-engine-output-canon-coverage]] — detail in pointer (relocated 2026-07-02) |
| engine.43 | Voices/agents sync contract — BUILT S306, runtime smoke pending (detail: plan §Build notes) | in-progress | engine-sheet | [[../adr/0014-citizen-self-authorship-live-drift]] + [[../plans/2026-07-04-voice-dial-sync-contract-build]] |
| engine.45 | Ripple ledger — T1–T3b live in prod; T3c retired + T3e folded S311; open: T3d, per-hood fold, T0 traces | in-progress | engine-sheet | [[../plans/2026-07-04-ripple-ledger-attribution]] |
| engine.47 | Game-night connection design — one game traced through 10 hops, gaps close in 4 existing engines; build awaits Mike approval (S296 moratorium gate) | needs-info | engine-sheet | [[../plans/2026-07-05-game-night-connection-design]] |
| engine.48 | Citizen-loop deepening — engine-sheet lane COMPLETE S312 (T1–5, T9–13); open: T8 /sift tension seeds (media) + T13 speculative-pairs call (Mike, see plan §T13 handoff) | in-progress | media + Mike (T13 list) | [[../plans/2026-07-06-citizen-loop-deepening]] |
| engine.51 | Citizen intake unification — T1-T7 done; prod Intake tab S305; T8 extraction built S305 (dry-run verified, sandbox --apply pending Mike cycle-fire) | in-progress | research-build (T8) + engine-sheet | [[../plans/2026-07-07-citizen-intake-unification]] |
| engine.53 | Agent exchange engine — T1–5 SHIPPED S312 (3 formats live-verified, 17:00 cron wired; conversations idle until engine.48 T4 ripple writer); open: T6 /sift sourcing | in-progress | media (T6) | [[../plans/2026-07-11-agent-exchange-engine]] |
| engine.76 | Compile-layer rebuild (Mike S328): 4 consumer artifacts — media=world_summary v2 ✓, cron=world_state.json ✓ (W3 shipped S329 52e879e9: buildWorldState.js fold + 4 consumers via lib seams), civic=initiative-packets ✓, audit=JSONs ✓; Media_Briefing OFF ✓, Cycle_Packet 30→7 ✓; W5 NEW (Mike S329): per-desk signal partition — run-cycle-produced deterministic artifact (extend world_summary writer or sibling emit, no new pipeline files) sorting the cycle's signal by desk lane as POINTERS ONLY (civic=anomalies/votes/initiatives, sports=feed/roster deltas, culture=hoods/faith, business=ripples) to feed /desk-slice for the deep-dispatch fork; PLUS per-beat byline candidate + rotation (Mike S329): roster = Bay_Tribune_Oakland tab (31 POPID-linked staff — canonical, ~14 never routed today), beats = REPORTER_DESK_INDEX/voice files, candidate = beat match weighted by usage count across byline_shadow_log_c{N}.json history (un-silences sift Engine B — C101: 8/8 engine_silent, assignments pure habit); stories/angles stay desk-side (locked charge rule — pointers never pre-assembled data), engine assists WHO writes, never WHAT; both pipelines coexist until fork proves. Design research-build, build engine-sheet. W4 two-stack consolidation post-fork-proof (Mike S329: build the side skill alongside — never repurpose in-use pipeline files; fork slices are a different shape than desk packets, old stack retires whole only after the side skill fully proves) | in-progress | engine-sheet | claude-mem S328 (full design) |
| engine.77 | Sports-event intake (Mike-direct S329): trades / injuries / call-ups from Paulson's sports layer need a structured intake that writes BOTH the ledger state change (Status/RoleType) AND the LifeHistory moment (+ downstream ripple: household, bonds, storylines). Proof case: C101 Richards trade (POP-00031) landed Status=Traded with zero LifeHistory entry — state flipped, life never recorded. Sibling: engine.40 (stat OCR intake — stats, not events; same Oakland_Sports_Feed/As_Roster anchors). Design research-build → build engine-sheet. | queued | research-build (design) → engine-sheet (build) | S329 retrieval-repair session (a934e9da commit body); engine.40 row |

### canon.* — World-fidelity layer

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|

### civic.* — City-hall, voice agents, council

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| civic.13 | City-hall engine-sheet reconciliation | blocked | engine-sheet | [[../plans/2026-05-22-c94-gap-log-triage]] — detail in pointer (relocated 2026-07-02) |
| civic.14 | Initiative_Tracker contract + fine-tune | in-progress | research-build / engine-sheet | [[../plans/2026-06-01-initiative-tracker-contract]] + [[../research/2026-06-01-initiative-tracker-state]] — detail in pointer (relocated 2026-07-02) |

### infrastructure.* — Supermemory, services, ingest

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| infrastructure.1 | Bay-tribune unified ingest rebuild (Phase 1+1.5 done; 2-7 blocked on SMFS pilot) | blocked | research-build / engine-sheet | [[../plans/2026-04-30-bay-tribune-unified-ingest-rebuild]] |
| infrastructure.2 | World Memory remaining (bay-tribune ingest of key archive articles + desk historical context) | ready | engine-sheet | [[../WORLD_MEMORY]] |
| infrastructure.3 | Reviewer lanes → Claude Managed Agents (Dreaming pilot, Anthropic preview-access gated) | needs-info | research-build | [[../ACTION_MANAGED_AGENTS]] |
| infrastructure.4 | supermemory-claude plugin auto-saved session transcripts to `mags` as `session_turn` do… | in-progress | engine-sheet | [[../SUPERMEMORY]] + [[../adr/0008-speaker-attribution-for-auto-save-writers|ADR-0008]] — detail in pointer (relocated 2026-07-02) |
| infrastructure.5 | Supermemory load-bearing audit | in-progress | research-build | [[../plans/2026-05-22-supermemory-load-bearing-audit]] + [[../adr/0008-speaker-attribution-for-auto-save-writers|ADR-0008]] — detail in pointer (relocated 2026-07-02) |

### research.* — Papers, external tools, evaluations

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| research.2 | Memento CBR case-bank (Phase 1 ready; Phase 2 blocked on ≥500 tuples + droplet headroom) | blocked | research-build | [[../plans/2026-04-21-memento-cbr-case-bank]] |
| research.3 | Document processing pipeline evaluation (Qianfan-OCR for civic-doc ingest) | needs-info | research-build | inline-eval (trigger: civic pipeline needs real-world doc input) |
| research.4 | Desk agents migration off Claude → DeepSeek (research/watch — cost/limits trigger) | needs-info | research-build | [[../MIGRATION_OFF_CLAUDE]] |
| research.5 | Instant compaction — Strategic compact PreToolUse hook port (`affaan-m/everything-claude-code`) | blocked | research-build | upstream not locally available (S212 check); pre-task: clone `affaan-m/everything-claude-code` to a workspace OR fetch the hook file via `gh` / curl before porting. ROLLOUT entry says "port directly" — invent-from-concept risks divergence. inline-pattern |
| research.7 | KAIROS background daemon monitoring (Anthropic future feature) | needs-info | research-build | external-watch |
| research.8 | Hermes Agent (NousResearch) reference architecture monitoring | needs-info | research-build | external-watch |
| research.9 | Inter-agent conversation harness | blocked | research-build | [[../plans/2026-05-31-autonomy-roadmap]] + [[../RESEARCH]] — detail in pointer (relocated 2026-07-02) |
| research.10 | Arc engine grafts + Patterns A/B/D in idea-park (chaos-cars sibling, deferred) | blocked | research-build / engine-sheet | inline-park (S190 grilling artifacts) |
| research.12 | Autonomy roadmap | in-progress | research-build | [[../plans/2026-05-31-autonomy-roadmap]] — detail in pointer (relocated 2026-07-02) |
| engine.30 | Citizen card full-life enrichment | blocked | engine-sheet | [[../plans/2026-05-31-emergent-bio-engine]] — detail in pointer (relocated 2026-07-02) |
| engine.31 | Citizen dial engine | in-progress | engine-sheet | [[../plans/2026-05-31-compression-tag-triage]] — detail in pointer (relocated 2026-07-02) |
| engine.32 | Life-event generation | in-progress | engine-sheet | [[../plans/2026-05-31-life-event-generation]] — detail in pointer (relocated 2026-07-02) |
| engine.34 | Ledger is a representative sample | parked | engine-sheet | [[../plans/2026-06-14-ledger-representative-sample-migration-removal]] — detail in pointer (relocated 2026-07-02) |
| engine.36 | Isolated staging environment | parked | engine-sheet | [[ENGINE_REPAIR]] — detail in pointer (relocated 2026-07-02) |
| engine.54 | Neighborhood trajectory system (gentrification block repurposed) + v3 writer clobber fix — sandbox-verified C127+C128 S316, LIVE via S321 full-repo deploy, canon-verified C102/C103 | done-pending-archive | engine-sheet | S315 commit + [[ENGINE_COUPLING_MAP]] §neighborhoodTrajectoryEngine |
| engine.55 | Intra-city relocation — households sort toward economically-fitting neighborhoods (AN–AP live, wired to settled-in check S321) — sandbox-verified C129–C131, LIVE S321 | done-pending-archive | engine-sheet | [[../plans/2026-07-12-engine55-intra-city-relocation]] |
| engine.56 | Household_Ledger true-ledger repair — reconcile, live income, HouseholdSavings, real dissolution, household-first inheritance — LIVE S319, cycle-proven | done-pending-archive | engine-sheet | [[ENGINE_REPAIR]] §engine.56 — detail in pointer |
| engine.57 | Family/household loop — Mike's household model — LIVE S319, cycle-proven 0714+0715, canon-verified C102/C103 | done-pending-archive | engine-sheet | [[../plans/2026-07-13-family-household-loop-build]] |
| engine.58 | GC-as-entry — intake→Tier-5 waiting room, lottery at EmergenceCount 3, event surfacing — LIVE S320, cycle-proven (Isaac Green end-to-end) | done-pending-archive | engine-sheet | detail in commits 06b0b5ad/c8e73961 + claude-mem S320 |
| engine.59 | Bonds × GC marriage market — tier gravity, suitor fitness, GC lottery door — LIVE S320, 8-fire proof, 2 lottery weddings | done-pending-archive | engine-sheet | [[../plans/2026-07-16-engine59-bonds-marriage-market]] |
| engine.67 | Event pools — steps 1-9 + involvedCitizens wire LIVE S325, sweeps done; OPEN: Mike's live C102 verify + storylineWeaving status gap | in-progress | engine-sheet | [[../plans/2026-07-18-event-pools-design]] |
| engine.68 | Cultural_Ledger antenna — fame bar 25, recognition scaling, FAME_WATCH hooks, sightings widened, decay — LIVE S325, bench-proven C114-C116 (decay tick observed) | done-pending-archive | engine-sheet | [[../plans/2026-07-18-event-pools-design]] §9 |
| engine.69 | Tier decay (earned rungs only, T1/authored exempt) + youth events mold dials (25/25 col-O landings, 10 attention-decays observed C107) — LIVE S325 | done-pending-archive | engine-sheet | [[../plans/2026-07-18-event-pools-design]] §9 + ENGINE_REPAIR Row 25 |
| research.13 | Citizen-autonomous PoC | needs-info | research-build | [[../plans/2026-05-31-citizen-autonomous-poc]] — detail in pointer (relocated 2026-07-02) |
| research.14 | Citizen-loop Phase 2 | in-progress | engine-sheet | [[../plans/2026-06-04-mags-citizen-loop]] — detail in pointer (relocated 2026-07-02) |
| research.16 | Tier-1 character voice agents | in-progress | research-build + engine-sheet | [[../plans/2026-06-16-tier1-character-voice-agents]] — detail in pointer (relocated 2026-07-02) |
| research.17 | Storyline-spine memory — REGROUNDED S306 (Mike-direct, design WITH Mike); prior P1/P2 plans + ADR-0011 DEAD | needs-info | research-build | [[../research/2026-06-20-layered-memory-architecture]] §S306 regrounding |
| research.19 | Citizen perception & immersion access layer | in-progress | research-build → engine-sheet | [[../plans/2026-06-23-citizen-perception-immersion-layer]] — detail in pointer (relocated 2026-07-02) |
| engine.39 | `citizenDialMap` pure-integrity | in-progress | engine-sheet | [[../plans/2026-06-21-tier1-dial-essence-backfill]] — detail in pointer (relocated 2026-07-02) |
| engine.38 | Living City — full-population coverage | in-progress | research-build → engine-sheet | [[../plans/2026-06-19-living-city-full-population-coverage]] + [[../plans/2026-06-30-central-generator-atmospheric-expansion]] + [[../plans/2026-07-01-persistence-seams-content-ledger]] |
| research.20 | Autonomous deep-dispatch | in-progress | research-build → engine-sheet | [[../adr/0012-autonomous-deep-dispatch-write-edition]] + [[../plans/2026-06-25-deep-dispatch-write-edition-build]] — detail in pointer (relocated 2026-07-02) |
| research.21 | Citizen-signal story emergence | in-progress | research-build → engine-sheet | [[../plans/2026-06-26-citizen-signal-story-emergence]] + [[../plans/2026-06-29-citizen-signal-detector-build]] — detail in pointer (relocated 2026-07-02) |
| research.23 | NotebookLM bridge — edition auto-ingest + audio delivery + grounded published-canon Q&A (jacob-bd/notebooklm-mcp-cli adopted, S310; LIVE — Q&A proven, audio live-fires next publish) | in-progress | research-build → media | [[../plans/2026-07-10-notebooklm-bridge-deploy]] + [[../research/2026-07-10-notebooklm-mcp]] |
| research.24 | Entity protagonism — business/faith event gen, Riley lifestyle → seed backdrop, Community_Programs ledger | in-progress (T1–T6 built S313; sandbox verify rides C102 smoke) | engine-sheet | [[../plans/2026-07-12-entity-protagonism]] |
| research.25 | Headless newsroom pipeline — M–F writer-wakes + Sat compile | Phase 1 DONE (writer/gate/route+scorecard); Phase 2.0 DONE (byline WHO-assist 4-layer design) → engine-sheet builds W5 half 2 (roster expansion + cadence activation) | research-build → engine-sheet | [[../plans/2026-07-20-headless-newsroom-pipeline]] |

### governance.* — Skills, MDs, ADRs, project hygiene

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| governance.3 | Mags-at-/root steward layer | blocked | research-build | [[../plans/2026-05-09-boot-load-audit]] — detail in pointer (relocated 2026-07-02) |
| governance.8 | Plugin gating per terminal | needs-info | research-build | [[../plans/2026-05-09-boot-load-audit]] — detail in pointer (relocated 2026-07-02) |
| governance.9 | `/post-pattern <name>` micro-skill | needs-info | research-build | [[ENGINE_REPAIR]] — detail in pointer (relocated 2026-07-02) |
| governance.18 | C12 boot-conditioning residual | in-progress | research-build | [[../plans/2026-05-22-c94-gap-log-triage]] — detail in pointer (relocated 2026-07-02) |
| governance.22 | Claude Code v2.1.149–v2.1.153 feature adoption | needs-info | research-build | [[../plans/2026-05-28-disallowed-tools-skill-audit]] + [[../plans/2026-05-28-claude-code-2-1-149-153-feature-adoption]] — detail in pointer (relocated 2026-07-02) |
| governance.26 | SESSION_CONTEXT on-demand log redesign | in-progress | research-build / engine-sheet | [[../plans/2026-05-29-session-context-on-demand]] — detail in pointer (relocated 2026-07-02) |
| governance.30 | ROLLOUT v2.0 migration — retire this junk box, stand up a fresh structured rollout. **Cut 1+2 DONE S251** (rules → [[rollout-rules]]; Spine → ARCHIVE; 4 terminal MDs wired). Next: v2 shell + wall drain + retire (Tasks 2-6). | in-progress | research-build | [[../plans/2026-06-01-rollout-v2-migration]] |
| governance.34 | C97 gap-log triage | in-progress | research-build / engine-sheet | [[../plans/2026-06-13-c97-gap-log-triage]] — detail in pointer (relocated 2026-07-02) |
| governance.33 | C96 gap-log triage | in-progress | research-build / engine-sheet | [[../plans/2026-06-07-c96-gap-log-triage]] — detail in pointer (relocated 2026-07-02) |
| governance.35 | REDUCED S260 by governance.36 §loop-tightening to the PIN-self-derive remnant | ready | engine-sheet (design: research-build DONE) | [[../plans/2026-06-14-session-context-mechanization]] — detail in pointer (relocated 2026-07-02) |
| governance.36 | Boot doc architecture restructure | in-progress | research-build | [[../plans/2026-06-14-boot-doc-architecture-restructure]] + [[../plans/2026-05-09-boot-load-audit]] — detail in pointer (relocated 2026-07-02) |

---

## Watch List

Tracking for future adoption. Not building.

| Feature | Trigger to Act |
|---------|---------------|
| **Headless cron newsroom + agentic RAG** ([[../research/2026-07-19-headless-cron-newsroom-agentic-rag]], S325) | A: Mike re-opens edition path for automation (reverses S313). B: cheap-model retrieval eval on one narrow subtask passes. Detail in research file. |
| **Drive OAuth Production-token longevity** (governance.41 ES-1) | Token minted 2026-06-20; if it **dies on/before 2026-06-27**, the In-production mint did NOT cure the expiry → reopen as NEW triage (root cause was mint-time expiry policy carried by Testing-era tokens; re-mint is the workaround that already failed once). If it survives past 2026-06-27, permanent fix confirmed → drop this row. |
| Agent Teams stability | Experimental graduation → test Phase 7.6 |
| Multi-Character Discord | TinyClaw reference architecture matures |
| MiniMax M2.5 / DeepSeek-V3 | Cost spike or quality test passes |
| Skills Portability | HuggingFace format becomes standard |
| Tribune Fine-Tuning | 238 articles as training dataset for voice model |
| Desktop App (Linux) | Linux support ships |
| Lightpanda Browser | Beta stabilizes, saves 300MB RAM |
| Claude Code Voice Mode | Maturity improves |
| Extended Thinking for Agents | Test on civic/sports desks |
| Computer Use exits beta | Stable + cheaper → expand beyond QA to routine agent tasks |
| CLI-over-MCP token optimization | Measured: too many MCPs drops 200k context to 70k. Replace idle MCPs with CLI-wrapper skills. Source: everything-claude-code S131 |
| Selective skill loading | Only load skills relevant to current workflow. Chat doesn't need 21 skills. Manifest-driven selection. Source: everything-claude-code S131 |
| Continuous learning hooks | Auto-extract debugging patterns into reusable skills with confidence scoring. Source: everything-claude-code S131 |
| llms.txt for documentation | Many doc sites serve `/llms.txt` — LLM-optimized docs. Check before web-fetching. Source: everything-claude-code S131 |
| Proactive agent dispatch | Rule-based agent routing without user prompts. Post-write → reviewer, security-sensitive → scanner. Source: everything-claude-code S131 |
| NPM Package Drift | 7 packages behind. Batch update in maintenance session. |
| Codex Plugin (`/codex:adversarial-review`) | Mike keeps ChatGPT sub → install plugin for free adversarial code review. Sub cancelled → skip. Source: S131 |
| Open-source agent harnesses | Stable harness with MCP + skills + hooks support → re-evaluate Phase 21 as real multi-model pipeline. Track: Claw Code (instructkr/claw-code), community forks. Source: S131 |
| xMemory (hierarchical memory) | AutoDream fails to solve collapsed retrieval after 5 sessions → evaluate self-hosted xMemory |
| Auto Mode | Evaluate for production pipelines — could eliminate approval prompts during `/write-edition` |
| HTTP Hooks migration | Replace shell-based hooks with HTTP POST to dashboard endpoints for unified event stream |
| **Forked subagents** (`CLAUDE_CODE_FORK_SUBAGENT=1`, claude-code 2.1.117) | Parallel desk-reporter pipeline becomes a goal AND harness contract validated across forked children. Source: S177 |
| **Hooks → MCP tools** (`type: "mcp_tool"`, claude-code 2.1.118) | Stop / post-publish hook would benefit from direct MCP call (e.g. godworld `lookup_citizen`) instead of node-script glue. Source: S177 |
| **Agent frontmatter `mcpServers` in main-thread sessions** (claude-code 2.1.117) | Per-agent MCP-tool isolation becomes part of canon-fidelity tightening — each agent declares exactly which MCPs it consumes. Source: S177 |
| **`--print` honors agent `tools:` / `disallowedTools:` frontmatter** (claude-code 2.1.119) | Sandcastle+Daytona reviewer hosting goes operational — per-agent tool restrictions ride along into the sandbox. Strengthens Phase 40.6 Layer 4 (tool gate). Source: S177 |
| Agent lifecycle hooks (SubagentStart/Stop) | Desk agent monitoring — track which agents take longest, fail most |
| Prompt/Agent hooks | Replace pattern-based hookify rules with semantic LLM-evaluated checks |
| FileChanged hook | Auto-react to git pulls, external file changes during autonomous operation |
| Overture (visual agent planning) | Mike can see plans visually → install when accessible from Remote Control or web dashboard. github.com/SixHq/Overture. Source: S137b |
| **OpenVLThinkerV2 (open VLM from UCLA NLP)** | GPU droplet spun up — evaluate as vision backbone for Phase 28.2 dashboard visual QA, photo pipeline verification, two-pass hallucination visual reviewer, research paper ingestion. Qwen3-VL-8B base + custom G²RPO training. Beats GPT-4o on MMMU (71.6%). Open weights. github.com/uclanlp/OpenVLThinker. Source: S142 |
| **RAGFlow (civic document ingestion candidate)** | Real civic document pipeline becomes a priority AND droplet scaled up (needs 4+ CPU cores, 16GB RAM, 50GB disk) — evaluate alongside Qianfan-OCR. Deep-learning document parser. Data connectors for Google Drive, Confluence, S3, Notion, Discord. Apache 2.0, Docker-based. github.com/infiniflow/ragflow. Source: S142 |
| **Adobe Creative Cloud connector** (Anthropic Apr 28 2026) | Returning to FLUX text-suppression ceiling research (`docs/RESEARCH.md §S197`) — 5th intervention path: generate base scenes in FLUX, post-process failure modes (gibberish placards, real-brand logos, wrong jersey numbers) in Photoshop via Claude instead of regenerating. Addresses the S196 mesa case (3 regens, 3 different failure modes). Source: S207 tech reading. |
| **Outside-vendor image swap** (GPT Image 2 / Ideogram 3 — [[../research/2026-06-16-flux-image-model-eval]], verdict `watch`) | engine.37 (FLUX.2 pro bump) ships and STILL misses one axis on real specs → run a one-cycle two-axis bake-off (text-suppression AND named-subject fidelity) vs GPT Image 2 + Ideogram 3 on the standing fixture (mesa / baylight / transit_hub + an Isley-class named subject). Gated on new-API integration + per-image cost + content-moderation risk on crime/OPD scenes. FLUX.2 pro clears both axes → take-nothing on the outside swap. (The cheap variant bump is NOT here — it's engine.37 ready.) Source: S263 research. |
| **Blender MCP connector** (Anthropic Apr 28 2026) | Chaos-cars plan (`plans/2026-05-07-chaos-cars-engine`) ever wants visual scene-render hooks for typed municipal-vehicle events — Blender MCP + Python API is the path. Anthropic donated to Blender to support continued Python API development. Long-tail / idea-park. Source: S207 tech reading. |

---
