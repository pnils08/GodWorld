# GodWorld — Rollout Plan

**This file is canonical for open/closed work** (S207). Pointer-only: one line per job, detail lives in the pointer doc — never here (S286 hard rule, Mike-direct).

**Status:** ACTIVE (building) | **Last Updated:** 2026-08-15 — S371 consolidation (research-build). This file is now the ONLY open-work tracker: [[archive/ENGINE_REPAIR]] retired to history, its 2 unique open rows migrated as `engine.106`/`engine.107`, and `engine.105` registered retroactively after shipping live with no row. S371 sweep moved 6 `done-pending-archive` rows out. 110 rows open — of the 107 triaged at sweep close, 40 were touched within 30 days, 53 are stale past 30 days, and 14 have never been cited by any commit; the other 3 are `engine.105`/`106`/`107`, registered after the triage ran. Full triage table + the 14 ids: [[ROLLOUT_ARCHIVE]] §S371 triage.
**Filing protocol (S212):** semantic groups + pointer-only entries — see [[rollout-rules]] §3–§5 (taxonomy, add, close). Full design: [[../adr/0005-rollout-plan-structure]].
**North star:** `docs/ARCHITECTURE_VISION.md` — Jarvis + persistent sessions. Everything we build points there.
**Completed phase details:** [[engine/ROLLOUT_ARCHIVE]] — read on demand, not at boot.
**Research context:** `docs/RESEARCH.md` — findings log, evaluations, sources.
**Wiki layer:** [[SCHEMA]] (conventions) + [[index]] (catalog) — read at boot. (Phase 41.1 + 41.2, S146.)
**Plan-file contract:** [[plans/PLAN_TEMPLATE]] — every new plan copies this shape (S152). Also referenced from [[rollout-rules]] §4.
**Phase backlog:** [[plans/BACKLOG]] — designs catalogued but not yet scheduled. Promote to its own plan file when a session picks one up.
**Terminal owners:** `engine-sheet` / `research-build`. Research-build owns this
doc; engine-sheet executes substrate work. Media and civic are generator
terminals: they run skills and record findings in production gap logs, but never
own rollout rows.

---

## Next Session Priorities (S406 → next, engine-sheet)

1. ~~**engine.135 acceptance**~~ — ACCEPTED S405. Spread lane 1.72pp FAIL → **2.74pp PASS**, 5/5 invariants green post-C105. "Zero denominator" was a misread log line (the trailing count is businesses that *contracted*, not businesses in scope). `Career: 0` is E1 by design. **Builder ruling: career mobility waits on EDUCATION — do not widen E3.** There is no reliable system for *why* a citizen changes job / is promoted / is fired; education is the next system to build and it supplies that reason. Build order: families → households → business cascade → tier work → **education**. Start from [[../for-claude-review/2026-08-30-grok-education-system]], not a fresh design. Generic citizens (untracked T5-in-waiting) are in scope as job-fillers. Detail: [[../plans/2026-08-29-employment-system-cascade]] §acceptance verdict.
2. **ONE BENCH WAVE IS OWED and three undeployed changes ride it** — engine.139 (civic scoring re-wire), engine.138 G-PF33 (engine clock hold), and grok's 4b casino (tracked S406, `Casino_Ledger` unarmed, arming gated on builder sign-off). **Read [[../plans/2026-08-31-c105-chase-sessions]] §S-A addendum before firing: `advanced` cannot be proven by a plain bench fire** — no chain runs on a bench, so no phase ever changes and the transition path never executes. The wave needs a hand-staged tracker phase edit between cycles, with the C104 counterfactual (−13 → 0) as the expected shape. PROD @12's S405 smoke-test is also still pending at the next live cycle.
3. **engine.138 — the C105 chase. START HERE, and take ONE session at a time.** Backlog carved into five bounded sessions in [[../plans/2026-08-31-c105-chase-sessions]] — **S-A is DONE (S406) — all three civic readings were correct; two ruled intentional and documented, the third fixed as a wording defect, no stored number retro-corrected. G-PF33 opened: the engine scores a clock only the offline civic chain can wind. S-B, S-C and S-D are DONE (S407/S408); next up is S-E instrumentation debt.** Builder-direct: chase precedes both the unfinished business cascade and the education build, because a sim running on known-broken civic logic manufactures new anomalies every cycle. **Every engine-code session ends committed-and-undeployed** — the bench predates C105 and standing up a fresh one is a builder action, so all engine fixes batch into one wave.
4. ~~**engine.137**~~ — CLOSED S405. G-PF16's mechanism was wrong (eventArcEngine is retired, not misordered; finalizeWorldPopulation runs at Phase9, not Phase3) and its scope incomplete. Root cause was the ordering scan keying off the phase directory — fixed, see §G-PF27. Six real sites wired to `previousCycleState`. Follow-ons opened: §G-PF28 (mediaEffects), §G-PF29 (sports/seasonal ordering), §G-PF30, §G-PF31.
5. **Gap logs** — `output/production_log_run_cycle_c105_gaps.md` carries 20 operator + 56 mechanical entries. Open and unowned: G-PF11 (pre-flight auto-derive), G-PF14 (flaky coverage test), G-PF22 (`Name`-column trap), G-PF23 (hood texture blind to INSTITUTIONS.md), G-PF24 (dead hood gate discarding 5 of 6 rows), G-PF25 (world-state fold ordering), G-PF26 (no sports-feed name validation).

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
| pipeline.35 | Cycle-init "admin" skill + one-true-cycle-source | ready | research-build / engine-sheet | [[../plans/2026-05-31-cycle-init-admin-skill]] + [[../plans/2026-05-24-governance-14-edition-pipeline-rewrite]] — detail in pointer (relocated 2026-07-02) |
| pipeline.41 | Tensions → /sift story seeds — /sift reads the open tension register as door-knock candidates (subjective material, never publishable as fact) | ready | research-build | [[../plans/2026-07-06-citizen-loop-deepening]] §Task 8 |
| pipeline.43 | Citizen voice quote supply (PRIORITY, Mike-direct S312) — ALL T1–5 built (T1–2 live-verified S312); acceptance rides first live edition (C101 /write-edition) | in-progress | research-build | [[../plans/2026-07-11-citizen-voice-quote-supply]] |
| pipeline.44 | Desk-slice fork (FLAGSHIP, Mike-direct S313) — T1–T4 done S313 (3 skills live); open: T5 post-publish fit, T6 pilot | in-progress | engine-sheet / research-build | [[../research/2026-07-11-desk-slice-fork]] |
| pipeline.45 | Saturday canon flow installed; C103 dry sweep proves 18 exact Rhea-hash Articles including weather, while live apply and Phase 4 graduation remain on the scheduled gate | in-progress | engine-sheet / research-build | [[../plans/2026-08-04-newsroom-canon-flow]] |
| pipeline.46 | Jax sim stink-audit (grok) — scanner + weekly firebrand force-slot + approach override; Tasks 1-5 shipped 2026-08-06; live fanout observe remains | in-progress | research-build | [[../plans/2026-08-06-jax-sim-stink-audit]] |
| pipeline.47 | P Slayer fan-heat seat (grok) — sports writers IN M-F fanout; solo p-slayer persona; multi-voice sports-desk legacy for headless | in-progress | research-build | [[../plans/2026-08-07-p-slayer-fan-heat-seat]] |
| pipeline.48 | Anthony + Hal solo sports seats (grok) — persona maps + stance; agent packages on disk; Claude lands .claude agents | in-progress | research-build | [[../plans/2026-08-07-anthony-hal-solo-sports-seats]] |
| pipeline.49 | Civic solo seats (grok) — five persona stacks + bags; multi-voice civic-desk legacy for headless; Claude lands agents | in-progress | research-build | [[../plans/2026-08-07-civic-solo-seats]] |
| pipeline.50 | Culture + sports-support solos (grok) — 6 culture + Tanya/Simon/Marbury; Marbury deep-analysis bag for canon path | in-progress | research-build | [[../plans/2026-08-07-culture-sports-support-solo-seats]] |
| pipeline.51 | NotebookLM Daily News — direction/archive hook landed; Phase 6 approved: deterministic Cycle/wake/article-state branch router, five-run shadow proof, then separately gated format activation | in-progress | engine-sheet | [[../plans/2026-07-10-notebooklm-bridge-deploy]] §Phase 6 + [[../research/2026-08-20-notebooklm-daily-branching]] |
| pipeline.53 | Citizen day digest (kimi) — 24h people-slice folded into the 8am notebooklmDailyNews bounded source, written + audio per Mike 2026-08-09; engine-sheet lands config rebalance | in-progress | engine-sheet | [[../plans/2026-08-09-citizen-day-digest]] |
| pipeline.54 | Restore S344 human story slots; pressure-test Article voice, Packet entity walls, and assignment coherence while scheduled wakes continue | in-progress | engine-sheet | [[../plans/2026-08-20-s344-human-story-template-pressure-test]] + [[../research/2026-08-20-s344-human-story-template]] |
| pipeline.61 | Weekly lore-writer cron (Fri 15:00), generate-only — grading is never delegated. Round-robins Tier-1/2 citizens lacking a passed lore entry; flags a quarantine file for `/lore-ingest`. | ready | research-build | [[../plans/2026-08-15-lore-writer]] — crontab installed, tests `scripts/loreTargetSelect.test.js` pass, `--dry-run` verified end-to-end |
| engine.123 | engineAuditor diffs a stale prior (C103 audit, 2026-08-11) → 54 false C104 anomalies, 18/19 patterns no-prior-match. Re-baseline. Not an engine defect. | ready | engine-sheet | [[../../output/engine_anomalies_c104_followup.md]] |
| engine.124 | Initiative-mitigator `expectedField` watches RetailVitality; effects actually land in sentiment. Manufactures false remedy-not-firing + a spurious bugReport. | ready | engine-sheet | [[../../output/engine_review_c104.md]] |
| engine.131 | Sports coupling — restore the real per-team season, move the sports zone with the stadium. Live: T1-T4. Built+unshipped: T7, civic override, Rhea roster fix. | in-progress | engine-sheet | [[../plans/2026-08-27-sports-coupling-restore]] |
| governance.51 | Boot-doc consolidation — rule-only boot docs under a confirmed size ceiling, no stacked change-logs; 121 memory files deduped via /batch, builder-reviewed deletes. | in-progress | engine-sheet | [[../plans/2026-08-29-boot-doc-consolidation]] |
| engine.134 | Hood identity — the engine has no single source for "what the neighborhoods are": 25 files declare their own hood list/table (~30 constants), 70 name a hood literally, hand-maintained lists bit twice … (folded into engine.135; see plan) | ready | engine-sheet | [[../plans/2026-08-29-city-health-system]] §Blast radius (measure); plan TBD |
| engine.139 | civic scoring re-wire — positives are events, negatives are conditions; symmetric media; width ladders; committed undeployed | in-progress | engine-sheet | [[../plans/2026-08-31-c105-chase-sessions]] §G-PF34 |
| engine.138 | C105 chase — 5 bounded sessions (S-A…S-E); S-A…S-D done; next is S-E | in-progress | engine-sheet | [[../plans/2026-08-31-c105-chase-sessions]] §Session order |
| engine.140 | S-B — the storyline return path. Storyline_Ledger read back into desk_signal + desk packets so a thread can be continued and closed; Saturday cron's 0-index write bug fixed and 5 corrupted rows repaired; Phase-8 ager off-path (undeployed) | in-progress | engine-sheet | [[../plans/2026-08-31-c105-chase-sessions]] §Session S-B |
| engine.142 | Dead-file delete batch (G-PF32 S-D): `eventArcEngine.js`, `processArcLifeCyclev1.js`, `v3LedgerWriter.js` (all S313), `parseMediaIntake.js` (S325), `mediaRoomBriefingGenerator.js` (S328), `processIntakeV3.js` (never wired) — 0 live references (S408 sweep of engine/lib/scripts/tests/skills/html), each tagged `delete candidate engine.142` in its `@cycle-status` header. The cost is the truth-doc truing, not the rm: ENGINE_MAP, SHEETS_MANIFEST, COUPLING_MAP, TRUTH_MAP, CODEBASE_MAP, SIMULATION_LEDGER_COL_MAP.json, TIER_MOBILITY, pre-mortem SKILL/known_gaps, engine-validator IDENTITY, plus STUB_MAP/STUB_REVERSE regen — same commit. Leave the commented engine slots as the record. Rides the bench wave; clasp push must drop the remote files | ready | engine-sheet | [[../plans/2026-08-31-c105-chase-sessions]] §Session S-D |
| engine.141 | `monitorStorylineHealth_` still reads the DISCONTINUED Storyline_Tracker and publishes S.storyHooks + S.storylineHealth into ctx from it — caller-graph pass, then repoint or retire. Surfaced by engine.140 | ready | engine-sheet | [[../engine/SHEETS_MANIFEST]] §Storyline_Tracker |
| engine.137 | ctx read-before-write — ordering scan repointed at the orchestrator; 6 sites wired to carry-forward; bench-proven C106/C107, LIVE at PROD @12 | done-pending-archive | engine-sheet | [[../../output/production_log_run_cycle_c105_gaps]] §G-PF16 (corrected), §G-PF27 |
| canon.6 | Dillon Brooks + Pablo Almanzar in the C104 sports feed with no citizen row; POP-01023/01024 are the minting precedent. Canon write — needs Mike. | blocked | engine-sheet | [[../../output/world_summary_c104.md]] |
| infrastructure.7 | Consolidate model calls on OpenRouter — Rhea, Saturday run, Discord pair. Price the models FIRST; OpenRouter margin may beat "cheaper". Vision/image paths need separate proof. | ready | engine-sheet | [[../plans/2026-08-20-consolidate-model-calls-on-openrouter]] |
| pipeline.57 | lived-context basis systemically unreachable — no builder populates packet.exposure.evidence. Correct per ADR-0017, needs a real evidence-source design pass | needs-info | research-build | [[../adr/0017-typed-lived-experience-packets]] §1 |

### engine.* — Engine code, ledger, schema

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| engine.1 | Phase 40.2 cattle refactor (needs plan) | blocked | engine-sheet | [[engine/archive/PHASE_40_PLAN]] §40.2 |
| engine.2 | Phase 42 writer consolidation | in-progress | engine-sheet | [[../plans/2026-04-28-phase-42-writer-consolidation]] + [[engine/archive/PHASE_42_PATTERNS]] — detail in pointer (relocated 2026-07-02) |
| engine.3 | Advance-initiative remedy threshold calibration (post-E92 audit) | needs-info | engine-sheet | [[archive/ENGINE_REPAIR]]; `output/engine_review_c92.md` |
| engine.5 | Household + family simulation (Representative Sample model, reframed S243) — functional youth seed → engine life-event simulation → publication-driven family materialization. Steward authority granted S243. | in-progress | engine-sheet | [[engine/archive/LEDGER_REPAIR_HOUSEHOLDS]] |
| engine.6 | Press_Drafts.LinkedStoryline 0% populated (DEAD-COLUMN, 164 rows) | blocked | engine-sheet | [[archive/ENGINE_REPAIR]] row |
| engine.7 | Engine Routing Foundation — Phase 6 cutover (gated on 3 cycles shadow data) | in-progress | research-build / engine-sheet | [[../plans/2026-05-07-engine-routing-foundation]] |
| engine.8 | Header-drift detector C93 Type-2 triage (16 MED clusters) + C94 sweep absorbed S225 (G-EC5–G-EC21 orphan literals + G-EC24–G-EC32 defensive-fallback noise + G-RC7 KONO civic.10b follow-up) per triage cluster C11 | blocked | engine-sheet | [[../plans/2026-05-05-writer-header-alignment-detector]] §Triage; C11 fold ref [[../plans/2026-05-22-c94-gap-log-triage]] §3 C11 |
| engine.10 | Phase 43 — Engine Expansion (city-functions, 5-domain priority order) | needs-info | research-build / engine-sheet | [[../research/godworld_city_functions_analysis_2026-04-20.pdf]] |
| engine.11 | Chaos-cars engine | in-progress | engine-sheet / research-build | [[../plans/2026-05-07-chaos-cars-engine]] — detail in pointer (relocated 2026-07-02) |
| engine.15 | ENGINE_REPAIR `Pattern` column | needs-info | engine-sheet | [[archive/ENGINE_REPAIR]] — detail in pointer (relocated 2026-07-02) |
| engine.20d | Sift Step 5 `covered-by-feature` triage handle — absorb regulatory-process noise into civic round-up. Cadence cap: at most 1 dedicated article per cycle per initiative AND only if actual movement (not process-tick). | blocked | research-build | blocked on pipeline.24 (sift v2); plan [[../plans/2026-05-22-engine-regulatory-friction]] §Task 5, cross-link C2 plan Task 5 |
| engine.27 | wd-card auto-invalidation hook | in-progress | engine-sheet | [[../plans/2026-05-26-engine-27-wd-card-auto-invalidation]] — detail in pointer (relocated 2026-07-02) |
| engine.29 | Citizen lifecycle & fame system | parked | engine-sheet | [[../plans/2026-05-30-citizen-lifecycle-fame-system]] + [[archive/ENGINE_REPAIR]] — detail in pointer (relocated 2026-07-02) |
| engine.41 | Engine-output → canon coverage | in-progress | engine-sheet | [[../plans/2026-06-24-engine-output-canon-coverage]] — detail in pointer (relocated 2026-07-02) |
| engine.43 | Voices/agents sync contract — BUILT S306, runtime smoke pending (detail: plan §Build notes) | in-progress | engine-sheet | [[../adr/0014-citizen-self-authorship-live-drift]] + [[../plans/2026-07-04-voice-dial-sync-contract-build]] |
| engine.45 | Ripple ledger — T1–T3b live in prod; T3c retired + T3e folded S311; open: T3d, per-hood fold, T0 traces | in-progress | engine-sheet | [[../plans/2026-07-04-ripple-ledger-attribution]] |
| engine.47 | Game-night connection design — one game traced through 10 hops, gaps close in 4 existing engines; build awaits Mike approval (S296 moratorium gate) | needs-info | engine-sheet | [[../plans/2026-07-05-game-night-connection-design]] |
| engine.48 | Citizen-loop deepening — engine-sheet lane COMPLETE S312 (T1–5, T9–13); open: T8 /sift tension seeds (media) + T13 speculative-pairs call (Mike, see plan §T13 handoff) | in-progress | research-build | [[../plans/2026-07-06-citizen-loop-deepening]] |
| engine.51 | Citizen intake unification — T1-T7 done; prod Intake tab S305; T8 extraction built S305 (dry-run verified, sandbox --apply pending Mike cycle-fire) | in-progress | research-build (T8) + engine-sheet | [[../plans/2026-07-07-citizen-intake-unification]] |
| engine.53 | Agent exchange engine — T1–5 SHIPPED S312 (3 formats live-verified, 17:00 cron wired; conversations idle until engine.48 T4 ripple writer); open: T6 /sift sourcing | in-progress | research-build | [[../plans/2026-07-11-agent-exchange-engine]] |
| engine.76 | Compile-layer rebuild — W1–W3 + W5 complete (half 2 shipped S336: usage-rotated per-lane byline candidate in desk_signal, 3-cycle bench proven); OPEN: W4 two-stack consolidation only, gated on the fork proving (pipeline.44) | in-progress | engine-sheet | [[../plans/2026-07-26-compile-layer-rebuild]] |
| engine.90 | Citizen Archive — implement Citizen_Archive (v1 deceased+Traded); popIdHighWater first; restore before live Traded move | ready | engine-sheet | [[../plans/2026-08-21-citizen-archive]] |
| engine.91 | Canon ingest backfill & sweep — customId idempotency, deterministic sweep (reporters corpus + Deep Canon Drive), post-publish tail + cron, drive-files scope call | ready | engine-sheet | [[../plans/2026-07-31-canon-ingest-backfill]] |
| engine.99 | Neighborhood truth-source migration (ADR-0016 first application) — one canonical hood set from Neighborhood_Map + drift detector; 53 structural files across ~8 copy-pasted namespaces. Cohort 1 then re-price; a week where discovery is the output | ready | engine-sheet | [[../plans/2026-08-02-neighborhood-truth-source-migration]] + [[../adr/0016-data-ledgers-are-the-truth-source]] |
| engine.104 | Economy native rebuild — salaries/education/career-stage born right; five S364 doctrines; S362 vet complete, NOT safe — plan revision required before code; revision input filed 2026-08-27 (kimi, cascade loop-closure trace + design; Claude review gated) | ready | research-build → kimi/codex | [[../plans/2026-08-10-economy-native-rebuild]] + [[../research/2026-08-27-cascade-loop-closure-design]] |
| engine.105 | Hospital ledger reads the Status column — missed-admission reconcile. Shipped + live-deployed 2026-08-14; registered retroactively S371 (row was missing while the code ran) | in-progress | engine-sheet | git `engine.105:` commits 2026-08-14; state needs engine-sheet confirm |
| engine.106 | Crisis arcs fed fabricated specificity to desk packets — C97 pull done; rebuild as a connected per-hood story signal, do NOT restore the city-wide illnessRate read | ready | engine-sheet | [[archive/ENGINE_REPAIR]] Row 28 (migrated S371) |
| engine.107 | ARC milestone EventText is engine bookkeeping, not person-readable — starves citizen-perception continuity; supply side of research.19 T1a' | ready | engine-sheet | [[archive/ENGINE_REPAIR]] Row 32 (migrated S371) |
| engine.102 | City/hood cascade integrity — T1–T8 done; W4 bench-proven C114–C115 (kimi, criterion 5 PASS); T9 cron rule landed + /sift skill diff drafted (output/kimi/engine102); open: control-plane land only | in-progress | kimi | [[../plans/2026-08-08-engine-102-cascade-consistency]] + [[../research/2026-08-07-city-neighborhood-cascade-team-review]] |
| engine.93 | Per-hood political consequence — ALL BUILDS SHIPPED S349 (Tasks 5-7 fold + Tasks 9-10 commute matrix/housing response, 3 sandbox suites, mutation-tested); open: live-cycle proof only; capital pool deferred to civic.14 | in-progress | engine-sheet | [[../plans/2026-07-31-per-hood-political-consequence]] |
| engine.94 | Citizen memory and approval ceiling — Track A code-only self-arm plus grief and approval mechanics sandbox-proven through C116. Track B typed grudge, ambition, and folk-memory design remains gated on research.17 and a Mike design session | needs-info | research-build / engine-sheet | [[../plans/2026-07-31-citizen-memory-perception]] |
| engine.95 | Platform ceiling resilience — instrumentation live + wall baselined at 34–38% of 6-min wall (Tasks 1–3, 5–7 complete); remaining build: Task 4 checkpoint/resume + Task 5 append-dedup, Mike decisions locked, design + constraints in plan | in-progress | engine-sheet | [[../plans/2026-07-31-platform-ceiling-resilience]] |
| engine.96 | Business lifecycle generator — sequence after engine.85 per realism-audit build order; BIZ-ID allocator SHIPPED S357 (all 3 minters), detail in plan changelog | ready | research-build / engine-sheet | [[../plans/2026-08-01-business-lifecycle-generator]] |
| engine.98 | Pets as household members — Scout is canon with no carrier; open: SL column vs Household_Pets tab, entity vs attribute. Mike-deferred S350 | parked | research-build | [[../mags-corliss/CHARACTER]] §Family |

### canon.* — World-fidelity layer

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|

### civic.* — City-hall, voice agents, council

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| civic.13 | City-hall engine-sheet reconciliation | blocked | engine-sheet | [[../plans/2026-05-22-c94-gap-log-triage]] — detail in pointer (relocated 2026-07-02) |
| civic.14 | Initiative_Tracker contract + fine-tune | in-progress | research-build / engine-sheet | [[../plans/2026-06-01-initiative-tracker-contract]] + [[../research/2026-06-01-initiative-tracker-state]] — detail in pointer (relocated 2026-07-02) |
| civic.15 | Civic cron city-hall (Mike-direct S343); Phases 0-4 built S344, dry-Sunday probation before --apply flip | in-progress | engine-sheet | [[../plans/2026-07-28-civic-cron-city-hall]] |
| civic.18 | District map reconciliation — 4 drifted copies vs 22 live hoods; Task 3 + 4th copy shipped Node-side, Task 4 reversed per ADR-0016 (§7), Apps-Script half deploy-gated | in-progress | engine-sheet | [[../plans/2026-08-15-district-map-reconciliation]] §7 |
| civic.19 | Council as actors — districts own approval, author their own initiatives | blocked | research-build | [[../plans/2026-08-15-district-map-reconciliation]] §6 — ALSO blocked on the INIT-006 tag ruling (credits Tran, not Rivers) |
| civic.20 | Civic edge truth migration — entity layer is anchored, edges are not; 6 cohorts, writer-before-data | ready | engine-sheet | [[../plans/2026-08-15-civic-edge-truth-migration]] — §8 cheapest win, §9 escalation |
| civic.21 | All 22 hoods RANKED live. But feeder SKIPS every cycle (pool at floor F60/60, M204/40) so new hoods gain nobody — ranking necessary, not sufficient. Remainder: the infusion is a seeding op | in-progress | engine-sheet | [[../plans/2026-08-15-civic-edge-truth-migration]] §11.3b |
| civic.25 | New-life intake (Mike-direct) — civic.21's seeding op needs a grounded-biography process, not a stat-block spawn. Rides the same hoods-online moment | needs-info | research-build | [[../plans/2026-08-15-civic-edge-truth-migration]] §11.3b |
| civic.24 | Sunday nine-seat table — grok Tasks 1-9 closed (`b75bb28c` dry C104). Open: Task 10 sheet tab (engine-sheet). Crontab still `--apply` | in-progress | engine-sheet | [[../plans/2026-08-16-city-hall-nine-seat-table]] |
| engine.108 | Media promotion is structurally DEAD — S205 stripped all Generic_Citizens reads from the seed/packet path, S320 restored GC as entry but not as readable, so a Tier-5 can never be covered. Fix: tracked-first fallback read, presence-before-voice | ready | engine-sheet | [[../plans/2026-08-16-new-life-intake]] §2-3.1 |
| engine.114 | 4 canon-ingestion writers report success on partial ingest failure — ingestEdition.js is the Saturday canon door. Verified, escalated to Mike | ready | engine-sheet | [[../plans/2026-08-16-writer-fixed-artifact-persists-audit]] §governance.49 first run |
| engine.109 | New-life intake — household mint path (complete family = the reason, S320 held for lone names); route through the promotion populator; reduce Advancement_Intake to solely promotion | ready | engine-sheet | [[../plans/2026-08-16-new-life-intake]] §3.2 |
| civic.22 | Initiative authorship — 0 proposer cols vs 5 mayoral-action cols; no createInitiative_; all 6 live INITs read LeadFaction=OPP as a result. Surfaces hard once civic.24 seats speak for themselves | ready | research-build | [[../plans/2026-08-15-civic-edge-truth-migration]] §7 + §10 |

### infrastructure.* — Supermemory, services, ingest

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| infrastructure.1 | Bay-tribune unified ingest rebuild (Phase 1+1.5 done; 2-7 blocked on SMFS pilot) | blocked | research-build / engine-sheet | [[../plans/2026-04-30-bay-tribune-unified-ingest-rebuild]] |
| infrastructure.2 | World Memory remaining (bay-tribune ingest of key archive articles + desk historical context) | ready | engine-sheet | [[../WORLD_MEMORY]] |
| infrastructure.3 | Reviewer lanes → Claude Managed Agents (Dreaming pilot, Anthropic preview-access gated) | needs-info | research-build | [[../ACTION_MANAGED_AGENTS]] |
| infrastructure.4 | supermemory-claude plugin auto-saved session transcripts to `mags` as `session_turn` do… | in-progress | engine-sheet | [[../SUPERMEMORY]] + [[../adr/0008-speaker-attribution-for-auto-save-writers|ADR-0008]] — detail in pointer (relocated 2026-07-02) |
| infrastructure.5 | Supermemory load-bearing audit | in-progress | research-build | [[../plans/2026-05-22-supermemory-load-bearing-audit]] + [[../adr/0008-speaker-attribution-for-auto-save-writers|ADR-0008]] — detail in pointer (relocated 2026-07-02) |
| infrastructure.6 | Sim-health observability + ghost-tab integrity — `/api/sim-health` off engineAuditor JSON + dashboard panel; disposition 11 ghost tab refs + tab-reference integrity test | ready | engine-sheet | [[../plans/2026-07-31-engine-observability-integrity]] |

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
| engine.36 | Isolated staging environment | parked | engine-sheet | [[archive/ENGINE_REPAIR]] — detail in pointer (relocated 2026-07-02) |
| engine.67 | Event pools — steps 1-9 + involvedCitizens wire LIVE S325, sweeps done; OPEN: Mike's live C102 verify + storylineWeaving status gap | in-progress | engine-sheet | [[../plans/2026-07-18-event-pools-design]] |
| research.13 | Citizen-autonomous PoC | needs-info | research-build | [[../plans/2026-05-31-citizen-autonomous-poc]] — detail in pointer (relocated 2026-07-02) |
| research.14 | Citizen-loop Phase 2 | in-progress | engine-sheet | [[../plans/2026-06-04-mags-citizen-loop]] — detail in pointer (relocated 2026-07-02) |
| research.16 | Tier-1 character voice agents | in-progress | research-build + engine-sheet | [[../plans/2026-06-16-tier1-character-voice-agents]] — detail in pointer (relocated 2026-07-02) |
| research.17 | Storyline-spine memory — REGROUNDED S306 (Mike-direct, design WITH Mike); prior P1/P2 plans + ADR-0011 DEAD | needs-info | research-build | [[../research/2026-06-20-layered-memory-architecture]] §S306 regrounding |
| research.19 | Citizen perception & immersion access layer | in-progress | research-build → engine-sheet | [[../plans/2026-06-23-citizen-perception-immersion-layer]] — detail in pointer (relocated 2026-07-02) |
| engine.39 | `citizenDialMap` pure-integrity | in-progress | engine-sheet | [[../plans/2026-06-21-tier1-dial-essence-backfill]] — detail in pointer (relocated 2026-07-02) |
| engine.38 | Living City — full-population coverage | in-progress | research-build → engine-sheet | [[../plans/2026-06-19-living-city-full-population-coverage]] + [[../plans/2026-06-30-central-generator-atmospheric-expansion]] + [[../plans/2026-07-01-persistence-seams-content-ledger]] |
| research.20 | Autonomous deep-dispatch | in-progress | research-build → engine-sheet | [[../adr/0012-autonomous-deep-dispatch-write-edition]] + [[../plans/2026-06-25-deep-dispatch-write-edition-build]] — detail in pointer (relocated 2026-07-02) |
| research.21 | Citizen-signal story emergence | in-progress | research-build → engine-sheet | [[../plans/2026-06-26-citizen-signal-story-emergence]] + [[../plans/2026-06-29-citizen-signal-detector-build]] — detail in pointer (relocated 2026-07-02) |
| research.24 | Entity protagonism — business/faith event gen, Riley lifestyle → seed backdrop, Community_Programs ledger | in-progress | engine-sheet | [[../plans/2026-07-12-entity-protagonism]] |
| engine.82 | CareerStage integrity — S366 attempt REVERTED (Mike-direct; YearsInCareer clobber restored, code rolled back); defect stands: 216 false-retired + 10 spelling variants; incident + revert detail in plan | ready | engine-sheet | [[../plans/2026-08-11-careerstage-salary-coherence]] |
| engine.83 | Employment reconciliation — UNTRACKED sentinel SHIPPED S357 (Mike-approved): generic fallback live (87 cells), 20 generic keyword rules demoted, career engine hires from UNTRACKED organically; OPEN: 2 PENDING org-name ties await Mike (Hayes→WOCC, Mehta→BART) | in-progress | engine-sheet | [[../plans/2026-07-26-employment-reconciliation]] |
| engine.85 | Employment living system — write-back consumer, Generic_Citizens employer column + skill tags, age-18 ladder, field-matched rehiring, economically-alive business mint. research-build half DONE S335 (T1-T3, T6) | in-progress | engine-sheet (T4,T5,T7,T8) | [[../plans/2026-07-27-employment-living-system]] |
| engine.116 | Spreadsheet weight — T1 + T2-data SHIPPED; open: T2 code half, T3 archives out, T4 Chicago, T5 dead-tab+dead-code pruning (Mike-direct S380) | in-progress | engine-sheet | [[../plans/2026-08-17-sheet-weight-reduction]] |
| engine.119 | Cycle persistence hardening — C104 double-crash class: no runtime sheet creation, Phase-10 timeout retry, ghost-proof state saves, bench-parity check | ready | engine-sheet | [[../plans/2026-08-18-cycle-persistence-hardening]] |
| engine.117 | Ledger true-up sweep — 348/961 rows carry ≥1 defect; scope is only the classes no open row covers | ready | engine-sheet | [[../plans/2026-08-17-ledger-trueup-sweep]] |
| engine.118 | Fame-permanence door (Mike-direct design 2026-08-18): FameScore ≥25 → permanent Tier 1 floor + never-un-famous marker; FameScore thereafter grades A/D-list only. Verified unwired — zero fame→Tier writes exist. Tier-touching: design doc before build | ready | engine-sheet | [[TIER_MOBILITY]] §3 |
| canon.5 | OUSD + Peralta CCD ruled contaminants (S368 Mike-direct); Oakland City Schools + Oakland CCD minted, repo text swapped. OPEN sheet renames: BIZ-00016, Peralta row, INIT-007 Notes; then Employer-column sweep | ready | engine-sheet | [[canon/INSTITUTIONS]] §Education |
| research.25 | Headless newsroom pipeline — M–F writer-wakes + Sat compile; Phase 1 + Phase 2.0 done, next is Phase 2 daily writer-wakes (was gated on engine.76 W5 half 1, now shipped) | in-progress | research-build → engine-sheet | [[../plans/2026-07-20-headless-newsroom-pipeline]] |
| research.27 | UNDOCKED/SpaceMolt — S379: §2.5 daily cadence LIVE (draw F7 fix, EpisodeId seq, auto-approve gate, cron-undocked-run.js orchestrator, undockedStandings.js). C104 retarget done S378 | in-progress | research-build | [[../plans/2026-08-07-spacemolt-game-show]] §2.5 |
| pipeline.60 | Nia Rook newsroom dispatch — BUILT S379 (undocked desk quota, feed-built lane via buildNiaSlice, recap ledger, NIAROOK-UNDOCKED-1 package, roster row + beat rule); acceptance = next unattended 06:15 wake chain | in-progress | engine-sheet | [[../plans/2026-08-07-spacemolt-game-show]] §2.5 |
| pipeline.58 | Nia Rook (UNDOCKED beat) landed, wall-pending POPID mint. 2.2's feed carries no quote field yet — she writes facts-only until that's added | ready | engine-sheet (mint) / research-build (2.2 quote field) | [[../plans/2026-08-07-spacemolt-game-show]] §3.1 |

### governance.* — Skills, MDs, ADRs, project hygiene

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| governance.3 | Mags-at-/root steward layer | blocked | research-build | [[../plans/2026-05-09-boot-load-audit]] — detail in pointer (relocated 2026-07-02) |
| governance.8 | Plugin gating per terminal | needs-info | research-build | [[../plans/2026-05-09-boot-load-audit]] — detail in pointer (relocated 2026-07-02) |
| governance.9 | `/post-pattern <name>` micro-skill | needs-info | research-build | [[archive/ENGINE_REPAIR]] — detail in pointer (relocated 2026-07-02) |
| governance.18 | C12 boot-conditioning residual | in-progress | research-build | [[../plans/2026-05-22-c94-gap-log-triage]] — detail in pointer (relocated 2026-07-02) |
| governance.22 | Claude Code v2.1.149–v2.1.153 feature adoption | needs-info | research-build | [[../plans/2026-05-28-disallowed-tools-skill-audit]] + [[../plans/2026-05-28-claude-code-2-1-149-153-feature-adoption]] — detail in pointer (relocated 2026-07-02) |
| governance.26 | SESSION_CONTEXT on-demand log redesign | in-progress | research-build / engine-sheet | [[../plans/2026-05-29-session-context-on-demand]] — detail in pointer (relocated 2026-07-02) |
| governance.30 | ROLLOUT v2.0 migration — retire this junk box, stand up a fresh structured rollout. **Cut 1+2 DONE S251** (rules → [[rollout-rules]]; Spine → ARCHIVE; 4 terminal MDs wired). Next: v2 shell + wall drain + retire (Tasks 2-6). | in-progress | research-build | [[../plans/2026-06-01-rollout-v2-migration]] |
| governance.34 | C97 gap-log triage | in-progress | research-build / engine-sheet | [[../plans/2026-06-13-c97-gap-log-triage]] — detail in pointer (relocated 2026-07-02) |
| governance.33 | C96 gap-log triage | in-progress | research-build / engine-sheet | [[../plans/2026-06-07-c96-gap-log-triage]] — detail in pointer (relocated 2026-07-02) |
| governance.35 | REDUCED S260 by governance.36 §loop-tightening to the PIN-self-derive remnant | ready | engine-sheet (design: research-build DONE) | [[../plans/2026-06-14-session-context-mechanization]] — detail in pointer (relocated 2026-07-02) |
| governance.47 | Cross-lane message bus — stop hand-relaying between lanes; deterministic transport + routing at a judgment seat | blocked | research-build | [[../plans/2026-08-15-cross-lane-message-bus]] |
| governance.50 | Cycle-output compaction — archive cycle-tagged `output/` files per cycle past a threshold, bound disk/git growth | in-progress | research-build | [[../plans/2026-08-18-cycle-output-compaction]] |

---

## Watch List

Tracking for future adoption. Not building.

| Feature | Trigger to Act |
|---------|---------------|
| **Headless cron newsroom + agentic RAG** ([[../research/2026-07-19-headless-cron-newsroom-agentic-rag]], S325) | A: Mike re-opens edition path for automation (reverses S313). B: cheap-model retrieval eval on one narrow subtask passes. Detail in research file. |
| **Instance-unification / model-triage pivot** ([[../research/2026-07-25-instance-unification-model-triage]], S333) | Collapse four terminals → one Mags core, model as the division axis. Trigger: coordination pain justifies a real dispatch layer, OR a one-session proving-run confirms the Claude Code harness drives on a non-Claude brain (Kimi/DeepSeek base-URL) — attack the proving-run first. Subagent-cost rule + live model map already extracted to MODEL_HIERARCHY §8. |
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
| ~~RAGFlow~~ **RETIRED S332** (Mike-direct — no longer defers) | Take-nothing verdict: retrieval need already covered (GodWorld MCP search + NotebookLM bridge LIVE + `source-search` agent + Supermemory); wrong-shaped for GodWorld's data (its edge is PDF/complex-layout parsing — GodWorld is Sheets + generated markdown, already structured); 50GB + 16GB RAM + 4 CPU standing footprint fails cost/benefit even with disk freed. Do not re-propose absent a retrieval gap the existing stack genuinely can't close. (was S142 watch) |
| **Adobe Creative Cloud connector** (Anthropic Apr 28 2026) | Returning to FLUX text-suppression ceiling research (`docs/RESEARCH.md §S197`) — 5th intervention path: generate base scenes in FLUX, post-process failure modes (gibberish placards, real-brand logos, wrong jersey numbers) in Photoshop via Claude instead of regenerating. Addresses the S196 mesa case (3 regens, 3 different failure modes). Source: S207 tech reading. |
| **Outside-vendor image swap** (GPT Image 2 / Ideogram 3 — [[../research/2026-06-16-flux-image-model-eval]], verdict `watch`) | engine.37 (FLUX.2 pro bump) ships and STILL misses one axis on real specs → run a one-cycle two-axis bake-off (text-suppression AND named-subject fidelity) vs GPT Image 2 + Ideogram 3 on the standing fixture (mesa / baylight / transit_hub + an Isley-class named subject). Gated on new-API integration + per-image cost + content-moderation risk on crime/OPD scenes. FLUX.2 pro clears both axes → take-nothing on the outside swap. (The cheap variant bump is NOT here — it's engine.37 ready.) Source: S263 research. |
| **Blender MCP connector** (Anthropic Apr 28 2026) | Chaos-cars plan (`plans/2026-05-07-chaos-cars-engine`) ever wants visual scene-render hooks for typed municipal-vehicle events — Blender MCP + Python API is the path. Anthropic donated to Blender to support continued Python API development. Long-tail / idea-park. Source: S207 tech reading. |

---
