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

## Next Session Priorities (S425 → next, engine-sheet)

1. **Live smoke of PROD @58** at the builder's next fire — thirteen deployments (@46–@58) ride it, all bench-proven on live-synced C105. engine.148 expectations: World_Config +6 rows self-armed; 6 'migration wave' ledger rows in the emptiest hoods, women first; feeder adds up to 8 women; 22 Crime_Metrics rows refreshed; no throw on Neighborhood_Map AE–AI (all cells read back); a label-pool texture line on a ten-hood citizen (P3). Earlier waves' expectations on their rows. **Scenes behavioural proof** waits for the first First Friday / hosted-holiday cycle: KONO in the arts spotlight, crowd boosts on tagged hoods, an arts/festival bond in a tagged hood.
2. **engine.148 follow-through** — after the smoke, the row moves to done-pending-archive (bench C109 closed the Glenview / Ivy Hill / Brooklyn check: ten of ten hoods draw); the plan's Findings (wave roles price at 60000 in employer-less hoods) stays filed, not a task.
3. **engine.109 Task 7** is the builder's (families on the Intake tab). **Montclair ghost row** `Crime_Metrics` row 11 on live + bench — builder's hand.

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
| pipeline.8 | Supplemental strategy — one per cycle minimum | in-progress | research-build | [[../EDITION_PIPELINE]] |
| pipeline.13 | Photo pipeline rebuild | in-progress | research-build | [[../plans/2026-04-25-photo-pipeline-rebuild]] — detail in pointer (relocated 2026-07-02) |
| pipeline.24 | /sift v2 rebuild | in-progress | research-build | [[../plans/2026-05-22-sift-v2]] + [[../media/brief_template_v2]] — detail in pointer (relocated 2026-07-02) |
| pipeline.35 | Cycle-init "admin" skill + one-true-cycle-source | ready | research-build / engine-sheet | [[../plans/2026-05-31-cycle-init-admin-skill]] + [[../plans/2026-05-24-governance-14-edition-pipeline-rewrite]] — detail in pointer (relocated 2026-07-02) |
| pipeline.41 | Tensions → newsroom story color (subjective, never quoted as fact). Live wire shipped S424 into cron-desk-run.js; acceptance rides Mon 2026-09-07 06:15 fanout | done-pending-archive | research-build | [[../plans/2026-07-06-citizen-loop-deepening]] §Task 8 |
| pipeline.43 | Citizen voice quote supply (PRIORITY, Mike-direct S312) — ALL T1–5 built (T1–2 live-verified S312); acceptance rides first live edition (C101 /write-edition) | in-progress | research-build | [[../plans/2026-07-11-citizen-voice-quote-supply]] |
| pipeline.44 | Desk-slice fork (FLAGSHIP, Mike-direct S313) — T1–T5 done (3 skills live, T5 verified clean); open: T6 pilot only | ready | research-build (pilot, media absorbed) | [[../research/2026-07-11-desk-slice-fork]] |
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
| pipeline.64 | Pre-Saturday coverage sweep (Sat 12:00) — reconciles unfiled Rhea verdicts, retries any stuck-uncompiled reporter before the 16:00 compile. Acceptance = next unattended Saturday firing | in-progress | research-build | [[../plans/2026-09-04-pre-saturday-coverage-sweep]] |
| pipeline.65 | Edition-type Supermemory ingest duplicates article bodies stepSweep already owns per-article — reframe to masthead+narration-only, not a chunker (engine-sheet catch) | ready | research-build | [[../research/2026-07-11-desk-slice-fork]] §Task 5 |
| engine.123 | engineAuditor diffs a stale prior (C103 audit, 2026-08-11) → 54 false C104 anomalies, 18/19 patterns no-prior-match. Re-baseline. Not an engine defect. **CLOSED S428: the baseline re-trued itself when C105 fired — `engine_audit_c105.json` diffs `previousCycle: 104` (2026-08-20 snapshot, post-backfill), 0 income anomalies, summary high 1 / med 3 / low 26. Residual 24/30 no-prior-match at C105 is structural, not stale: 21 are `improvement` patterns (one-cycle artifacts minted from the prior cycle's remedy verdicts, `detectImprovements.js:107`) and the remaining 3 are new-this-cycle types; no fix.** | done-pending-archive | engine-sheet | [[../../output/engine_anomalies_c104_followup.md]] |
| engine.124 | Initiative-mitigator `expectedField` watches RetailVitality; effects actually land in sentiment. Manufactures false remedy-not-firing + a spurious bugReport. **CLOSED S428 — the premise was half-right: retail DOES reach per-hood RetailVitality (engine.93 T5 fold, `applyCityDynamics.js:1104+`), at +0.08×intensity, which a −4 net move swamps; the defect was reading the NET column delta as the initiative's silence. Fix: `checkMitigators.computeEffect` now proves contribution from the engine's own `Ripple_Ledger` `initiative-implementation` row for that initiative at the current cycle (snapshot list gains `Ripple_Ledger`); verdict stays `effects-firing`/`effects-not-firing` (the strings recommendRemedy/framing consume), with `contribution`, `netDelta`, `netSwamped` beside it. `expectedMetric` untouched. Test 5 in `checkMitigators.test.js` (20/20); acceptance = the next live engineAuditor run shows INIT-001 `netSwamped` instead of `remedy-not-firing`.** | done-pending-archive | engine-sheet | [[../../output/engine_review_c104.md]] |
| governance.51 | Boot-doc consolidation — rule-only boot docs under a confirmed size ceiling, no stacked change-logs; 121 memory files deduped via /batch, builder-reviewed deletes. | in-progress | engine-sheet | [[../plans/2026-08-29-boot-doc-consolidation]] |
| engine.139 | civic scoring re-wire — positives are events, negatives are conditions; symmetric media; width ladders. **Bench-proven C108–C109 (advanced path hand-staged: mayor 21 vs 12 counterfactual), LIVE PROD @13 2026-09-01; smoke pending next live cycle** | in-progress | engine-sheet | [[../plans/2026-08-31-c105-chase-sessions]] §G-PF34 |
| engine.147 | Bloodline ascent — chain cuts 1–9 all live; open: the wake-pack seam | ready | research-build / engine-sheet | [[../plans/2026-09-02-bloodline-ascent]] |
| canon.6 | Dillon Brooks + Pablo Almanzar in the C104 sports feed with no citizen row; POP-01023/01024 are the minting precedent. Canon write — needs Mike. | blocked | engine-sheet | [[../../output/world_summary_c104.md]] |
| infrastructure.7 | Consolidate model calls on OpenRouter — Rhea, Saturday run, Discord pair. Price the models FIRST; OpenRouter margin may beat "cheaper". Vision/image paths need separate proof. | ready | engine-sheet | [[../plans/2026-08-20-consolidate-model-calls-on-openrouter]] |
| pipeline.57 | lived-context basis systemically unreachable — no builder populates packet.exposure.evidence. Correct per ADR-0017, needs a real evidence-source design pass | needs-info | research-build | [[../adr/0017-typed-lived-experience-packets]] §1 |

### engine.* — Engine code, ledger, schema

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| engine.1 | Phase 40.2 cattle refactor (needs plan) | blocked | engine-sheet | [[engine/archive/PHASE_40_PLAN]] §40.2 |
| engine.5 | Household + family simulation (Representative Sample model, reframed S243) — functional youth seed → engine life-event simulation → publication-driven family materialization. Steward authority granted S243. | in-progress | engine-sheet | [[engine/archive/LEDGER_REPAIR_HOUSEHOLDS]] |
| engine.6 | Press_Drafts.LinkedStoryline 0% populated (DEAD-COLUMN, 164 rows) | blocked | engine-sheet | [[archive/ENGINE_REPAIR]] row |
| engine.7 | Engine Routing Foundation — Phase 6 cutover (gated on 3 cycles shadow data) | in-progress | research-build / engine-sheet | [[../plans/2026-05-07-engine-routing-foundation]] |
| engine.8 | Header-drift detector C93 Type-2 triage (16 MED clusters) + C94 sweep absorbed S225 (G-EC5–G-EC21 orphan literals + G-EC24–G-EC32 defensive-fallback noise + G-RC7 KONO civic.10b follow-up) per triage cluster C11 | blocked | engine-sheet | [[../plans/2026-05-05-writer-header-alignment-detector]] §Triage; C11 fold ref [[../plans/2026-05-22-c94-gap-log-triage]] §3 C11 |
| engine.10 | Phase 43 — Engine Expansion (city-functions, 5-domain priority order) | needs-info | research-build / engine-sheet | [[../research/godworld_city_functions_analysis_2026-04-20.pdf]] |
| engine.11 | Chaos-cars engine — all 4 cascade outputs + all 3 validators now built (S423); only gate left is T5.3 live-fire on a real Tier-1 hit | in-progress | engine-sheet / research-build | [[../plans/2026-05-07-chaos-cars-engine]] — detail in pointer (relocated 2026-07-02) |
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
| engine.148 | Hood-blind engines — one source for neighborhoods (builder 2026-09-05: hood tweaks must not need 50 code edits; in scope as a PROJECT, overriding ADR-0015 §2 for hoods). **Reversed same day:** Generic_Citizens already holds all 22 hoods (275 active) — the dead door is GC→ledger emergence (13 ever; surfacing is a 6% roll that prefers the event's hood, events happen where tracked citizens live). engine.58 "a reason we are tracking you" collides with a gifted bypass — builder's call, earned path built. **Phase 1 LIVE PROD @54 (S423 2026-09-05; bench @51 C106/C107 clean, 12 wave rows Dimond/Eastlake/Brooklyn/Glenview/Ivy Hill, ticks landed in under-floor hoods, 0 errors, pull-back 0 differing):** builder ruled 2026-09-05 the drip won't fill ten hoods → **migration wave** (`hoodFloorPromotePerCycle` 6/cycle, most-deficient hood first, no tick gate) + earned quota (`hoodFloorSurfaceQuota` 20) + `hoodCitizenFloor` 12 + `gcSurfaceChance` 0.06, all self-armed on World_Config (`ensureEngine148Config_`); lazy per-cycle headcount (`getHoodHeadcount_`/`hoodFloorDeficit_`/`underFloorHoods_`); feeder literal → `feederHoodWeights_` (rank order × deficit, throws on a missing hood); surfacing `pickUnderFloorGc_` + ChildAreas fold on the pool; `selectFloorWaveRows_` in promotions. `scripts/hoodBlindDoors.test.js` 16/16, suite 201/202. Bench: expect Generic_Citizens Emerged rows landing in Eastlake/Brooklyn/Glenview first, `S.hoodFloorWaveCount` 6, LifeHistory 'Arrived in … with the Cycle N migration wave' (all seen on bench). **P1c LIVE PROD @56 (builder-ruled 2026-09-05: the sim runs male-heavy, the room skews female):** feeder floors → World_Config `gcPoolFloorFemale` 120 / `gcPoolFloorMale` 40, refill at the full 8/cycle cap while under floor; the wave draws the sex the ledger is short of first (`waveSexPreference_`); a row minted this cycle waits one cycle (bench C110 had promoted 4 of 8 new women the same cycle). Bench C109–C111: room F 61→69 while the wave ran, 0 errors, pull-back 0 differing. **Findings:** wave roles in employer-less hoods all price at 60000 (`lookupIncome_` default — engine.135 D2 has no Business_Ledger reference pay there; resolves as businesses arrive). **Phase 2 LIVE PROD @55 (S423; bench C108 clean; 66 live cells):** Neighborhood_Map AF–AH `WeatherZone` / `Adjacent` / `AttentionWeight` (authored, `scripts/fixtures/hood-geography.json`); weather for every hood via a 10-zone table; crime spillover from the sheet seed; spotlight/priority from the attention knob; crisis weight earned from IncomeTier + CrimeIndex (Temescal 0.9→1.26, West Oakland 1.3→0.79 — canon over priors, table in the plan); gender table + dead transit map deleted. Plan: [[../plans/2026-09-05-hood-blind-engines-plan]]. **Phase 3 code complete S427 (2026-09-05):** 7 texture pools (9 pool sets) key by `EmployerCharacter` via `hoodTexturePool_` (17 label pools each, twelve bespoke on top, silent defaults deleted); new `Neighborhood_Map.Scenes` (col AI, tag:weight) replaces the arts lists, festival hosts, arts spotlight and evening crowd tables — seeded live 22/22 then bench re-synced from live C105; `scripts/hoodBlindTexture.test.js` 23/23, suite 203/204 (djDirect pre-existing). **LIVE PROD @57 + @58 door guard** (`processAdvancementIntake.js` folds/refuses an authored hood at mint; bench @57 C108 clean) (bench @56 C106/C107: 0 errors, 12 wave rows, 68 exact label-pool + 254 venue lines strict, ten-hood hits 10 of 10 by C109; Scenes readers calendar-gated — unit-proven + no-throw, behavioural proof at the first First Friday / hosted holiday; pull-back 0 differing). `lib/photoGenerator.js` (media lane) not touched. Relocation untouched (gate, not pull) | in-progress | engine-sheet | [[../research/2026-09-05-hood-blind-engines]] |
| engine.99 | Neighborhood truth-source migration (ADR-0016) — entity set (Cohort 1–2) live; **Finding #9 child areas LIVE PROD @53 S423** (`Neighborhood_Map.ChildAreas` → Phase-1 seed → `resolveHoodOrChild_`; three fold literals gone; drift audit reconciles children, 0 findings). Remaining: the ~49-file hood-literal long tail, migrated on touch; first named site: `utilities/citizenDerivation.js` `NEIGHBORHOOD_GENDER_VARIANCE_` (20 keys — 5 tracked hoods absent → base 0.51 on promotion-minted gender: East Oakland, Baylight District, Dimond, Grand Lake, Brooklyn; 3 stale: Coliseum, Montclair, Elmhurst) | in-progress | engine-sheet | [[../plans/2026-08-02-neighborhood-truth-source-migration]] §Changelog 2026-09-05 + [[../adr/0016-data-ledgers-are-the-truth-source]] |
| engine.104 | Economy native rebuild — salaries/education/career-stage born right; five S364 doctrines; S362 vet complete, NOT safe — plan revision required before code; revision input filed 2026-08-27 (kimi, cascade loop-closure trace + design; Claude review gated) | ready | research-build → kimi/codex | [[../plans/2026-08-10-economy-native-rebuild]] + [[../research/2026-08-27-cascade-loop-closure-design]] |
| engine.105 | Hospital ledger reads the Status column — missed-admission reconcile. Shipped + live-deployed 2026-08-14; registered retroactively S371 (row was missing while the code ran) | in-progress | engine-sheet | git `engine.105:` commits 2026-08-14; state needs engine-sheet confirm |
| engine.106 | Crisis arcs fed fabricated specificity to desk packets — C97 pull done; rebuild as a connected per-hood story signal, do NOT restore the city-wide illnessRate read | ready | engine-sheet | [[archive/ENGINE_REPAIR]] Row 28 (migrated S371) |
| engine.107 | ARC milestone EventText is engine bookkeeping, not person-readable — starves citizen-perception continuity; supply side of research.19 T1a' | ready | engine-sheet | [[archive/ENGINE_REPAIR]] Row 32 (migrated S371) |
| engine.102 | City/hood cascade integrity — T1–T8 done; W4 bench-proven C114–C115 (kimi, criterion 5 PASS); T9 cron rule landed + /sift skill diff drafted (output/kimi/engine102); open: control-plane land only | in-progress | kimi | [[../plans/2026-08-08-engine-102-cascade-consistency]] + [[../research/2026-08-07-city-neighborhood-cascade-team-review]] |
| engine.93 | Per-hood political consequence — ALL BUILDS SHIPPED S349 (Tasks 5-7 fold + Tasks 9-10 commute matrix/housing response, 3 sandbox suites, mutation-tested); open: live-cycle proof only; capital pool deferred to civic.14 | in-progress | engine-sheet | [[../plans/2026-07-31-per-hood-political-consequence]] |
| engine.94 | Citizen memory & approval ceiling — Track A live; ambition ruled by engine.157; grudge/folk-memory gated on research.17 + Mike | needs-info | research-build / engine-sheet | [[../plans/2026-07-31-citizen-memory-perception]] |
| engine.95 | Platform ceiling resilience — instrumentation live + wall baselined at 34–38% of 6-min wall (Tasks 1–3, 5–7 complete); remaining build: Task 4 checkpoint/resume + Task 5 append-dedup, Mike decisions locked, design + constraints in plan | in-progress | engine-sheet | [[../plans/2026-07-31-platform-ceiling-resilience]] |
| engine.96 | Business lifecycle generator — Tasks 5/6/7/10/11 LIVE @40 (drift, decline sheds, closure wind-down → Business_Archive, the owner's draw, the heritage business born in the family's field); open: Task 8 success-pressure tuning, Task 9 cycle-time record, revenue floor at 0 | in-progress | engine-sheet | [[../plans/2026-08-01-business-lifecycle-generator]] |
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
| civic.19 | Council as actors — districts own approval, author their own initiatives | blocked | research-build | [[../plans/2026-08-15-district-map-reconciliation]] §6 — ALSO blocked on the INIT-006 tag ruling (credits Tran, not Rivers) |
| civic.21 | All 22 hoods RANKED live. Feeder SKIPS every cycle (pool at floor) so ranking alone seeded nobody — live read S423: the ten newly-ranked hoods still hold 0–3 citizens 20 days on. Remainder: engine.148 (the GC→ledger emergence door is dead for the ten hoods — pool holds them, nobody surfaces them; authored households on Intake are the patch, not the fix) | in-progress | engine-sheet | [[../plans/2026-08-15-civic-edge-truth-migration]] §11.3b |
| civic.25 | New-life intake (Mike-direct) — civic.21's seeding op needs a grounded-biography process, not a stat-block spawn. Rides the same hoods-online moment | needs-info | research-build | [[../plans/2026-08-15-civic-edge-truth-migration]] §11.3b |
| civic.24 | Sunday nine-seat table — grok Tasks 1-9 closed (`b75bb28c` dry C104). Open: Task 10 sheet tab (engine-sheet). Crontab still `--apply` | in-progress | engine-sheet | [[../plans/2026-08-16-city-hall-nine-seat-table]] |
| engine.108 | Media promotion path — Tier-5 read restored as a bounded fallback (LANDED `e371d815` 2026-08-16; row was stale); never converted a GC yet (max EmergenceCount 2, bar 3, 2026-09-02); quoted citizens now credited at the canon door (S412) | in-progress | engine-sheet | [[../plans/2026-08-16-new-life-intake]] §2-3.1 |
| engine.114 | 4 canon-ingestion writers report success on partial ingest failure — the Saturday canon door | done-pending-archive | research-build + engine-sheet | [[../plans/2026-08-16-writer-fixed-artifact-persists-audit]] §engine.114 blast-radius correction |
| engine.109 | New-life intake — household door BUILT S419, bench C107/C108 proven, **LIVE PROD @50** (Tasks 3–6: `queueHouseholdIntake_` → `Advancement_Intake1` → populator → `formIntakeHouseholds_`; 35/35); open: Task 7 the builder seeds the families | in-progress | engine-sheet | [[../plans/2026-08-16-new-life-intake]] §4 + §Changelog S419 |
| civic.22 | Initiative authorship — BLOCKED by S406 ruling 1 (chase plan §S-A addendum): initiatives stay hand-fed, `createInitiative_` stays unwired until city-hall seats work a full week autonomously and there is something to author from. Grok's Task 1 draft (§12) stays on the shelf | blocked | research-build | [[../plans/2026-08-15-civic-edge-truth-migration]] §12 |
| civic.33 | Recall/challenger fall-rate — threshold-20 confirmed live; tiers 2/3 of the door not yet bench-exercised. Needs N sandbox cycles with city-hall + media active | ready | engine-sheet | [[../plans/2026-08-29-employment-system-cascade]] §Status log |

### infrastructure.* — Supermemory, services, ingest

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
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
| engine.34 | Ledger is a representative sample | parked | engine-sheet | [[../plans/2026-06-14-ledger-representative-sample-migration-removal]] — detail in pointer (relocated 2026-07-02) |
| engine.36 | Isolated staging environment | parked | engine-sheet | [[archive/ENGINE_REPAIR]] — detail in pointer (relocated 2026-07-02) |
| engine.67 | Event pools — steps 1-9 + involvedCitizens wire LIVE S325, sweeps done; OPEN: Mike's live C102 verify + storylineWeaving status gap | in-progress | engine-sheet | [[../plans/2026-07-18-event-pools-design]] |
| research.13 | Citizen-autonomous PoC | needs-info | research-build | [[../plans/2026-05-31-citizen-autonomous-poc]] — detail in pointer (relocated 2026-07-02) |
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
| engine.119 | Cycle persistence hardening — C104 double-crash class: no runtime sheet creation, Phase-10 timeout retry, ghost-proof state saves, bench-parity check. **ALL FIVE TASKS SHIPPED S428, bench-proven SANDBOX 0831 @58/@60: C106 clean on Wave A (T1 `requireTab_` ×33 sites incl. 8 Phase-11, T2 retry on the crash site + carry-forward mirror, T5 pre-mortem scan 7; T4 decided no journal); C107 clean + the simulated-crash re-fire on Wave B (T3 cycle-stamped blobs, 3-slot sheet ring, self-ghost guard) — three ghosts skipped, three recoveries from the ring, cycleCount 107, 0 Engine_Errors, no property wipe. Live smoke at the builder's next fire: `carryForward` absent from the fire JSON, 0 Engine_Errors, Carry_Forward_Store grows to two rows per key (105 + 106)** | done-pending-archive | engine-sheet | [[../plans/2026-08-18-cycle-persistence-hardening]] |
| engine.117 | Ledger true-up sweep — 348/961 rows carry ≥1 defect; scope is only the classes no open row covers | ready | engine-sheet | [[../plans/2026-08-17-ledger-trueup-sweep]] |
| canon.5 | OUSD + Peralta CCD ruled contaminants (S368 Mike-direct); Oakland City Schools + Oakland CCD minted, repo text swapped. OPEN sheet renames: BIZ-00016, Peralta row, INIT-007 Notes; then Employer-column sweep | ready | engine-sheet | [[canon/INSTITUTIONS]] §Education |
| research.25 | Headless newsroom pipeline — M–F writer-wakes + Sat compile; Phase 1 + Phase 2.0 done, next is Phase 2 daily writer-wakes (was gated on engine.76 W5 half 1, now shipped) | in-progress | research-build → engine-sheet | [[../plans/2026-07-20-headless-newsroom-pipeline]] |
| research.27 | UNDOCKED/SpaceMolt — S379: §2.5 daily cadence LIVE (draw F7 fix, EpisodeId seq, auto-approve gate, cron-undocked-run.js orchestrator, undockedStandings.js). C104 retarget done S378 | in-progress | research-build | [[../plans/2026-08-07-spacemolt-game-show]] §2.5 |
| pipeline.60 | Nia Rook newsroom dispatch — BUILT S379 (undocked desk quota, feed-built lane via buildNiaSlice, recap ledger, NIAROOK-UNDOCKED-1 package, roster row + beat rule); acceptance = next unattended 06:15 wake chain | in-progress | engine-sheet | [[../plans/2026-08-07-spacemolt-game-show]] §2.5 |
| pipeline.58 | Nia Rook (UNDOCKED beat) — both halves done: POPID minted, quotes landing live | done-pending-archive | engine-sheet / research-build | [[../plans/2026-08-07-spacemolt-game-show]] §3.1 |

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
