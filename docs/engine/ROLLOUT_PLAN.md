# GodWorld — Rollout Plan

**This file is canonical for open/closed work** (S207). Pointer-only: one line per job, detail lives in the pointer doc — never here (S286 hard rule, Mike-direct).

**Status:** ACTIVE (building) | **Last Updated:** 2026-09-20 (S477, research-build sweep). This file is the ONLY open-work tracker; [[archive/ENGINE_REPAIR]] retired to history.
**Filing protocol (S212):** semantic groups + pointer-only entries — see [[rollout-rules]] §3–§5 (taxonomy, add, close). Full design: [[../adr/0005-rollout-plan-structure]].
**North star:** `docs/ARCHITECTURE_VISION.md` — Jarvis + persistent sessions. Everything we build points there.
**The lens (S441, Mike-direct):** [[SIM_DOCTRINE]] §15 — a gate that can't fire is a trick. Check every threshold against its column's live range; the chain to test is start → peak → end → aftermath → referenced. Read before touching any mechanic.
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

## Next work

Current assignments ride `SESSION_CONTEXT.md` `NEXT[<lane>]` lines; the open rows are below.

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
| pipeline.64 | Pre-Saturday coverage sweep (Sat 12:00) — reconciles unfiled Rhea verdicts, retries any stuck-uncompiled reporter before the 16:00 compile. Acceptance = next unattended Saturday firing | in-progress | research-build | [[../plans/2026-09-04-pre-saturday-coverage-sweep]] |
| pipeline.68 | Beat slices from sheets — T5 approach strings, T6 gate audit, T7b latency, T8 docs | in-progress | engine-sheet | [[../plans/2026-09-07-beat-slices-from-sheets-plan]] |
| pipeline.69 | Run-cycle packages the world to its readers: T1 texture reads life events per hood; T2 wake tells a citizen their own seed; T3 seed floor (decide); T4 one hood roster (engine.214 first); T5 C108 slice readback | in-progress | engine-sheet | [[../plans/2026-09-13-run-cycle-packages-the-world]] |
| governance.51 | Boot-doc consolidation — rule-only boot docs under a confirmed size ceiling, no stacked change-logs; 121 memory files deduped via /batch, builder-reviewed deletes. | in-progress | engine-sheet | [[../plans/2026-08-29-boot-doc-consolidation]] |
| engine.139 | civic scoring re-wire — positives are events, negatives are conditions; symmetric media; width ladders. **Bench-proven C108–C109 (advanced path hand-staged: mayor 21 vs 12 counterfactual), LIVE PROD @13 2026-09-01; smoke pending next live cycle** | in-progress | engine-sheet | [[../plans/2026-08-31-c105-chase-sessions]] §G-PF34 |
| infrastructure.7 | Consolidate model calls on OpenRouter — Rhea, Saturday run, Discord pair. Price the models FIRST; OpenRouter margin may beat "cheaper". Vision/image paths need separate proof. | ready | engine-sheet | [[../plans/2026-08-20-consolidate-model-calls-on-openrouter]] |

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
| engine.90 | Citizen Archive — long tail | in-progress | engine-sheet | [[../plans/2026-08-21-citizen-archive]] |
| engine.91 | Canon ingest backfill & sweep — customId idempotency, deterministic sweep (reporters corpus + Deep Canon Drive), post-publish tail + cron, drive-files scope call | ready | engine-sheet | [[../plans/2026-07-31-canon-ingest-backfill]] |
| engine.99 | Neighborhood truth-source — long tail | in-progress | engine-sheet | [[../plans/2026-08-02-neighborhood-truth-source-migration]] §Changelog 2026-09-05 + [[../adr/0016-data-ledgers-are-the-truth-source]] |
| engine.104 | Economy native rebuild — salaries/education/career-stage born right; five S364 doctrines; S362 vet complete, NOT safe — plan revision required before code; revision input filed 2026-08-27 (kimi, cascade loop-closure trace + design; Claude review gated) | ready | research-build → kimi/codex | [[../plans/2026-08-10-economy-native-rebuild]] + [[../research/2026-08-27-cascade-loop-closure-design]] |
| engine.105 | Hospital ledger reads the Status column — missed-admission reconcile. Shipped + live-deployed 2026-08-14; registered retroactively S371 (row was missing while the code ran) | in-progress | engine-sheet | git `engine.105:` commits 2026-08-14; state needs engine-sheet confirm |
| engine.102 | City/hood cascade integrity — T1–T8 done; W4 bench-proven C114–C115 (kimi, criterion 5 PASS); T9 cron rule landed + /sift skill diff drafted (output/kimi/engine102); open: control-plane land only | in-progress | kimi | [[../plans/2026-08-08-engine-102-cascade-consistency]] + [[../research/2026-08-07-city-neighborhood-cascade-team-review]] |
| engine.93 | Per-hood political consequence — ALL BUILDS SHIPPED S349 (Tasks 5-7 fold + Tasks 9-10 commute matrix/housing response, 3 sandbox suites, mutation-tested); open: live-cycle proof only; capital pool deferred to civic.14 | in-progress | engine-sheet | [[../plans/2026-07-31-per-hood-political-consequence]] |
| engine.94 | Citizen memory & approval ceiling — Track A live; ambition ruled by engine.157; grudge/folk-memory gated on research.17 + Mike | needs-info | research-build / engine-sheet | [[../plans/2026-07-31-citizen-memory-perception]] |
| engine.95 | Platform ceiling resilience — instrumentation live + wall baselined at 34–38% of 6-min wall (Tasks 1–3, 5–7 complete); remaining build: Task 4 checkpoint/resume + Task 5 append-dedup, Mike decisions locked, design + constraints in plan | in-progress | engine-sheet | [[../plans/2026-07-31-platform-ceiling-resilience]] |
| engine.96 | Business lifecycle generator — Tasks 5/6/7/10/11 LIVE @40; top-8 principals minted live (S440); Task 12 owner door + reel-2 authored-owner rewrite `68dc5a66` (S441) UNBENCHED → @7/C109; open: Task 8/9 | in-progress | engine-sheet | [[../plans/2026-08-01-business-lifecycle-generator]] |
| engine.98 | Pets as household members — Scout is canon with no carrier; open: SL column vs Household_Pets tab, entity vs attribute. Mike-deferred S350 | parked | research-build | [[../mags-corliss/CHARACTER]] §Family |
| engine.175 | Undocked cast drawn in the engine + show markets keyed to the pilot — bench-proven 0831 C119–C121; live `Undocked_Draw` tab exists; deploys to PROD with the dials wave (176–182) | in-progress | engine-sheet / kimi (apparatus, landed) | [[../plans/2026-08-07-spacemolt-game-show]] §Post-ship (a′) + [[../research/2026-09-08-kimi-casino-undocked-trueup]] §Review |
| engine.176 | Dials: the negative pole from causes + ambient as tint — CUT LOCALLY S438 (pressureTags 41/41), unbenched; lands WITH engine.177 on a fresh live re-sync | in-progress | engine-sheet | [[../plans/2026-09-08-dials-as-a-game-plan]] §engine.176 |
| engine.177 | Dials: watermark fold every cycle, mood persisted + decays, edge-damped hardening — CUT LOCALLY S438 (dial suites green, offline C106 replay clean), unbenched; lands WITH engine.176 | in-progress | engine-sheet | [[../plans/2026-09-08-dials-as-a-game-plan]] §engine.177 |
| engine.178 | Dials close doors: relocation openness, casino integrity/composure, bond warmth as maintenance, owner composure/drive, holder integrity on scandals — CUT LOCALLY S438 (dialGates 30/30), unbenched | in-progress | engine-sheet | [[../plans/2026-09-08-dials-as-a-game-plan]] §engine.178 |
| engine.179 | Contests by character: contestRoll_ at job slot, heritage stake, civic challenger, romantic triangle; §10 lotteries fenced — CUT LOCALLY S438 (contestRoll 31/31), unbenched | in-progress | engine-sheet | [[../plans/2026-09-08-dials-as-a-game-plan]] §engine.179 |
| engine.180 | The cron reads the game: thrown/stance, posture-changed wake slot, clamped one-notch push via Resolves — CUT LOCALLY S438 (cronStance 32/32); proves on scheduled wakes after deploy | in-progress | engine-sheet | [[../plans/2026-09-08-dials-as-a-game-plan]] §engine.180 |
| engine.181 | The citywide floor (RimWorld counterweight) — after 176+177 run three live cycles, design only if negative share > 35% or a hood's mean composure band hits −1 | needs-info | engine-sheet | [[../plans/2026-09-08-dials-as-a-game-plan]] §engine.181 |
| engine.182 | Ambition costs: overwork Strain that never adapts, burnout ×2 on health events, burnout + slipping integrity opens crime — CUT LOCALLY S438 (pressureTags 41/41), unbenched; rides the 176+177 bench | in-progress | engine-sheet | [[../plans/2026-09-08-dials-as-a-game-plan]] §engine.182 |
| engine.183 | Transit × hoods: game day = the feed, v3 event hoods, Coliseum → East Oakland, initiative slice, `Factors` column — slice SHIPPED `0806aba5`; engine batch CUT S440 (transitCauses 75/75), unbenched — rides the next 0908 fire | in-progress | engine-sheet | [[../plans/2026-09-09-transit-hood-alignment-plan]] §Tasks 2–6 |
| engine.185 | Sentiment repriced onto severity tiers (bench C114-C119); HOLD from PROD until engine.188 | in-progress | engine-sheet | [[../plans/2026-09-09-health-slice-freshness]] |
| engine.189 | Faith routing: add FAITH row to buildContractSeeds (3 tables) + bylineEngine keyword map; persist-or-delete S.faithStorySignals; shares hook loop with engine.190 | in-progress | engine-sheet | [[../research/2026-09-10-kimi-faith-lane-routing]] §Proposed engine cuts + §Review |
| engine.191 | School-district roster mis-mapped: 12/29 active BIZ-00016/35 rows off-role (plumber, line cooks, taxi driver, a Grade Schooler b.2030) — `EmployerBizId` set by the Education skill tag, not the job. Targeted restore of the 12 + linker guard, never a sweep | ready | engine-sheet | [[../plans/2026-09-07-beat-slices-from-sheets-plan]] §Changelog 2026-09-10 (kimi education lane) |
| engine.193 | Adversity tiers unreachable (unemployment/sickness fire 0/22 hoods). **RULED (Mike-direct S443): fix the generators, not thresholds** — "real world, not real-world Oakland," same doctrine as engine.185/§15 | ready | engine-sheet | commit `8db9ee1b` + [[../SIM_DOCTRINE]] §15 |
| engine.194 | Record-driven sentiment and game-night intensity; codex authors under Task 7, engine-sheet lands after Tasks 1–4. | in-progress | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 7 |
| engine.195 | Carrier fix for publicSpaces / communityEngagement / tourism / nightlife (engine.188 pattern): live-range check on the gates first, bench before PROD | ready | engine-sheet | commit `8db9ee1b`; [[../plans/2026-09-10-inactivity-is-regression]] |
| engine.196 | Holiday peaks saturate hoods (Independence 1.00 on 20 of 22): lower top holiday values to ~+0.25-0.30, bench any holiday change | ready | engine-sheet | ROLLOUT row (S443); [[../plans/2026-09-10-inactivity-is-regression]] |
| engine.197 | 5 pins at 100 ruled seeder saturation, not chased; open: openness-down volume (engine.201) and ~60% all-neutral share via event-engine reach | in-progress | engine-sheet | [[../plans/2026-09-10-inactivity-is-regression]] §Acceptance results |
| engine.199 | Economic_Parameters collapses to one runtime source (sheet, single read per cycle-run, cached) — the 3-copy scatter was never a platform requirement, `buildIntakeSalaryPools_` already proves the 1-read pattern. Retires the embedded Apps Script array | ready | engine-sheet | [[../plans/2026-09-10-economic-parameters-one-source]] |
| engine.200 | RoleType/EconomicProfileKey/SkillTags/EmployerBizId is a 4-field overlap never adjudicated (engine.87 closed the same disagreement as 'both fields are real' without deciding). Evaluate: collapse fields or keep, and why | ready | engine-sheet | [[../plans/2026-09-10-economic-parameters-one-source]] |
| engine.201 | **RULED 2026-09-14 (builder): tagging out (cut S451 @79, verified absent), the rest stays, engine-sheet reviews — no further sim ruling.** Open: fixed-cohort causal proof on the next live fires | in-progress | engine-sheet | [[../plans/2026-09-10-inactivity-is-regression]] §BUILD SPEC + [[../plans/2026-09-13-codex-dial-drift-review]] |
| engine.202 | Sports feed WeekRecord LIVE PROD @98; remaining: trigger-word hooks (Mike), dashboard WeekRecord input (3b), 3c contract needs, cuts 4-6 into Tasks 3-4 | in-progress | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 1 |
| engine.204 | Record × phase drives city-wide impact, concentrated in canonical stadium zones; replace authored geography. | ready | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 3 |
| engine.205 | Weekly game economy in both directions; retain per-franchise effects, record-driven magnitude and downside. | ready | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Tasks 4, 10 |
| engine.206 | Sports consequences emit transit, restaurant, economic and civic seeds; domain routing and Event_Content_Ledger links. | ready | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 6 |
| engine.207b | First-result casino selection accepted S447; stored EventId comparison parked until intake changes. | parked | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 5 |
| engine.203d | D3: inactivity decays toward the city baseline; no snap-to-zero or permanent carry. Build after engine.210. | ready | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 2 |
| engine.208 | Dial 9 fandom: shared DIALS prerequisite accepted; Event_Content_Ledger selection and signed event feedback remain. | in-progress | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 8 |
| engine.209 | Derived franchise weight drifts on results, tenure and attendance; one feed tab, per-team downstream state. | ready | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Tasks 9–10 |
| engine.213 | Approval reads the CITY, LIVE PROD @84; open: mood sawtooth (engine.214) and Mon-Thu office datawakes reaching no sheet | in-progress | engine-sheet | `phase05-citizens/updateCivicApprovalRatings.js`, [[../reference/DEPLOY_HISTORY]] §PROD @84 |
| engine.214 | Ten of 22 hoods sit outside the Phase-2 `CLUSTERS` literal and ride the city scalar 1:1 (engine.165 root cause). S458 cut REJECTED (kept a twelve-hood literal) and REVERTED off HEAD S459; rebuild from ledger truth + World_Config, no hood names or constants in the engine | parked | engine-sheet | [[../plans/2026-09-13-run-cycle-packages-the-world]] Task 4 |
| engine.215 | `illnessConvergenceRate` + `illnessInitiativeRelief` seeded via the engine.133 self-arm list (`4ac7b17c`) — the only 2 of 16 `cfgNum_` keys absent on live. Bench C115: 133→135 rows, Issues empty. LIVE PROD @104; open until live C108 shows both keys and no notice | in-progress | engine-sheet | [[../reference/DEPLOY_HISTORY]] §PROD @104 |
| engine.227 | Phase-6 media readers (shock monitor, prioritize, season weights) read `S.mediaEffects` before its Phase-8 writer — dead; the grain is last Cycle's carried media. First fix the producer: coverageIntensity stuck saturated 90 of 103 Media_Ledger rows (events × 0.08 + stuck shock) | ready | engine-sheet | [[../plans/2026-09-13-run-cycle-packages-the-world]] §Status log 227 |
| engine.234 | `stubEngine.js` scans a file's TRAILING block comment as the last function's body, so `S.x` in a comment invents map edges — two instances (S465 `findColumnIndex_`, S466 `readOaklandFeedEntries_`), both cleared by de-prefixing. Fix the extractor, not the comments. | ready | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 0 findings |
| engine.216 | Four Tier-4 incomes doubled at C107 with no cohort (POP-00784/812/951/874 + four more): find the writer, cap the re-price at the stage band | ready | engine-sheet | `output/engine_anomalies_c107_followup.md` §B, gap log G-EC82; [[../plans/2026-08-29-employment-system-cascade]] |
| engine.210 | Landed 44cf056f; 13/13 + 251/251. BENCH-PROVEN @52 C114 (order idx 8<9, 0 errors, 22/22 hoods `playoffs`). LIVE on PROD @97 (2026-09-18) — holds open until it smokes at live C108 (expect `championship` 22/22), per house pattern. Pop/economy deferred to Tasks 3–4. | in-progress | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 0 |
| engine.211 | Replace extreme phase-only gates and downstream team collapse with relative, record-driven effects. | ready | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] §1 F8–F9 |
| engine.212 | Crime_Metrics carries forward, PROD @79; open: dead reads at generateCivicModeEvents.js:200 and updateNeighborhoodDemographics.js:359, retire NEIGHBORHOOD_CRIME_PROFILES | in-progress | engine-sheet | [[../plans/2026-09-10-inactivity-is-regression]] §Acceptance results |
| engine.235 | Crime verdicts memory-only — persist `S.crimeMetrics.context` (hood trend/hotspot, city trend/headroom) where Rachel's slice reads. Unblocked by engine.237 (hotspots were never non-empty). | ready | engine-sheet | [[../research/2026-09-15-kimi-environment-safety-audit]] Safety 1/2 |
| engine.237 | Crime reaches the citizens: one reader contract `S.crimeMetrics.context` (10 dead v1.2 reads), relative hotspots, city-sized police capacity, clearance off the 0.15 floor, packet crime keys. 45/45. | in-progress | engine-sheet | commit `5f7b6393`; [[../reference/DEPLOY_HISTORY]] |
| engine.238 | Sim ruling needed: nothing sets patrol strategy (always `balanced`; suppress/community branches never fire). Setter candidates: chief's office, initiative, World_Config. Watch: defaultNeighborhoodShare 1/12. | blocked | engine-sheet | commit `5f7b6393` message §Not changed |
| engine.239 | Hoods read their own canon (SIM_DOCTRINE §17): cuts a-c bench-proven on C108; PROD state in the plan Status log | in-progress | engine-sheet | [[../plans/2026-08-30-hood-identity-remainder-plan]]; commit messages; bench SANDBOX 0908 @59-@62 |
| engine.243 | Crisis arcs named at onset + lifecycle world events, LIVE PROD @103; open until live C108 smoke names CRISIS-105-WESTOAKL | in-progress | engine-sheet | [[../reference/DEPLOY_HISTORY]] §PROD @103; `output/engine-sheet/2026-09-20-bench-c11{2,3}-engine243-predictions.md`; `scripts/crisisNaming.test.js` |
| engine.246 | Desk packets carry an empty citizen archive: rebuild ARTICLE_INDEX_BY_POPID.md first, then fix parsePopIdIndex (buildDeskPackets.js:379), not the regex alone | ready | research-build / engine-sheet | [[../plans/2026-09-13-run-cycle-packages-the-world]]; found during engine.245 |
| engine.248 | Faith orgs get a sim role (builder-direct): OWN SESSION opens as review, inventory each faith surface and its readers, then design | needs-info | engine-sheet (sim judgement — builder included) | [[../research/2026-09-10-kimi-faith-lane-routing]]; gap log C108 G-EC55; `docs/canon/INSTITUTIONS.md` §Canon substitution table |
| engine.249 | Hood demographics take the whole migration in 22 equal shares (RULED items 1-3): fix through sim causes (§16 drift), NO rebase in any wrapper | ready | engine-sheet | [[../plans/2026-08-30-hood-identity-remainder-plan]]; gap log C108 G-EC62 |
| engine.250 | Both hood effect buses live; stall drain ruled half weight (`bizInitiativeStallDrag` 0.5); PROD @108 = clasp v95, read back | done-pending-archive | engine-sheet | [[../reference/DEPLOY_HISTORY]] §PROD @106–@108 |
| engine.251 | Housing lever: tenant rent relief carried on the initiative bus into the Household_Ledger writer; after civic.38 Task 4 step 1; wiring card + pre-mortem before the cut | blocked | engine-sheet | [[../plans/2026-09-20-housing-lever]] |
| engine.236 | `Civic_Ledger` tab has no writer: SHEETS_MANIFEST names it the factions tab, but updateCivicLedgerFactions.js writes Faction/VotingPower onto Civic_Office_Ledger. Fix the manifest; keeping or removing the empty tab is the builder's go. | ready | engine-sheet | [[../research/2026-09-15-kimi-civic-lane]] |

### canon.* — World-fidelity layer

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|

### civic.* — City-hall, voice agents, council

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| civic.13 | City-hall engine-sheet reconciliation | blocked | engine-sheet | [[../plans/2026-05-22-c94-gap-log-triage]] — detail in pointer (relocated 2026-07-02) |
| civic.14 | Initiative_Tracker contract + fine-tune | in-progress | research-build / engine-sheet | [[../plans/2026-06-01-initiative-tracker-contract]] + [[../research/2026-06-01-initiative-tracker-state]] — detail in pointer (relocated 2026-07-02) |
| civic.15 | Civic cron city-hall (Mike-direct S343); Phases 0-4 built S344, dry-Sunday probation before --apply flip | in-progress | engine-sheet | [[../plans/2026-07-28-civic-cron-city-hall]] |
| civic.19 | Council as actors — districts own approval, author their own initiatives. Authorship half ruled 2026-09-19 and folded into civic.38 | blocked | research-build | [[../plans/2026-08-15-district-map-reconciliation]] §6 — ALSO blocked on the INIT-006 tag ruling (credits Tran, not Rivers) |
| civic.25 | New-life intake (Mike-direct) — civic.21's seeding op needs a grounded-biography process, not a stat-block spawn. Rides the same hoods-online moment | needs-info | research-build | [[../plans/2026-08-15-civic-edge-truth-migration]] §11.3b |
| civic.24 | Sunday nine-seat table — grok Tasks 1-9 closed (`b75bb28c` dry C104). Open: Task 10 sheet tab (engine-sheet). Crontab still `--apply` | in-progress | engine-sheet | [[../plans/2026-08-16-city-hall-nine-seat-table]] |
| engine.108 | Media promotion path — Tier-5 read restored as a bounded fallback (LANDED `e371d815` 2026-08-16; row was stale); never converted a GC yet (max EmergenceCount 2, bar 3, 2026-09-02); quoted citizens now credited at the canon door (S412) | in-progress | engine-sheet | [[../plans/2026-08-16-new-life-intake]] §2-3.1 |
| engine.109 | New-life intake — household door BUILT S419, bench C107/C108 proven, **LIVE PROD @50** (Tasks 3–6: `queueHouseholdIntake_` → `Advancement_Intake1` → populator → `formIntakeHouseholds_`; 35/35); open: Task 7 the builder seeds the families | in-progress | engine-sheet | [[../plans/2026-08-16-new-life-intake]] §4 + §Changelog S419 |
| civic.22 | Initiative authorship — S406 'hand-fed' ruling SUPERSEDED 2026-09-19 (Mike: seats author); folds into civic.38. Grok's §12 draft is prior art | blocked | research-build | [[../plans/2026-08-15-civic-edge-truth-migration]] §12 |
| civic.33 | Recall/challenger fall-rate — threshold-20 confirmed live; tiers 2/3 of the door not yet bench-exercised. Needs N sandbox cycles with city-hall + media active | ready | engine-sheet | [[../plans/2026-08-29-employment-system-cascade]] §Status log |
| civic.37 | Work-wake packs — ME/EMS on civic beats, A's players on the sports feed; live 2026-09-19, crontab Tue/Thu 20:18. Acceptance: first unattended run (Tue 2026-09-22), read back | in-progress | engine-sheet | [[../plans/2026-09-16-work-wake-packs]] |
| civic.38 | Civic game board — build plan filed: closed move set + Sunday-gated write path, 3-stage initiatives with losing clock, petitions from condition data, Mara confrontation, rota split | ready | research-build / engine-sheet | [[../plans/2026-09-19-civic-wake-game-loop]] + [[../research/2026-09-19-kimi-initiative-stage-voting-and-wake-incentives]] + [[../research/2026-09-20-codex-civic38-game-loop-review]] (Codex review — accepted + reconciled into the plan 2026-09-20; Task 7 withdrawn, Task 2 rebuilt, engine.250 filed) |
| civic.39 | Civic week boundary — Sunday chain becomes an idempotent stage machine: model-free mechanical close, structured terse decisions, batch submit/collect with a ~24h window (builder direction 2026-09-21). Acceptance: one seat's failed output no longer stops the tracker write; `tick` is idempotent | draft | research-build (scripts: kimi lane) | [[../plans/2026-09-21-civic-sunday-stage-machine]] + [[../research/2026-09-21-batch-inference-options]] |

### infrastructure.* — Supermemory, services, ingest

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| infrastructure.3 | Reviewer lanes → Claude Managed Agents (Dreaming pilot, Anthropic preview-access gated) | needs-info | research-build | [[../ACTION_MANAGED_AGENTS]] |
| infrastructure.4 | supermemory-claude plugin auto-saved session transcripts to `mags` as `session_turn` do… | in-progress | engine-sheet | [[../SUPERMEMORY]] + [[../adr/0008-speaker-attribution-for-auto-save-writers|ADR-0008]] — detail in pointer (relocated 2026-07-02) |
| infrastructure.5 | Supermemory load-bearing audit | in-progress | research-build | [[../plans/2026-05-22-supermemory-load-bearing-audit]] + [[../adr/0008-speaker-attribution-for-auto-save-writers|ADR-0008]] — detail in pointer (relocated 2026-07-02) |
| infrastructure.6 | Sim-health observability + ghost-tab integrity — `/api/sim-health` off engineAuditor JSON + dashboard panel; disposition 11 ghost tab refs + tab-reference integrity test | ready | engine-sheet | [[../plans/2026-07-31-engine-observability-integrity]] |
| infrastructure.8 | Hidden-tab audit + disposition (kimi) — 16 hidden tabs classified vs live code (3 load-bearing, 6 dead); Task 1 doc truth pass, Task 2 builder keep/delete rulings, Task 3 backup-then-delete. **Builder 2026-09-14: low priority — pick up only once the engine runs clean.** | parked | engine-sheet | [[../plans/2026-09-09-hidden-tab-audit]] |
| infrastructure.10 | Supermemory plugin recall reads an empty auto-tag and docs/SUPERMEMORY.md is stale: decide leave, or point recall at sl-godworld | needs-info | research-build | [[../SUPERMEMORY]]; plugin `hooks/lib/container-tag.js` |
| infrastructure.11 | claude-mem observer on nemotron-3-super-120b since 2026-09-20 17:19: close when a day of log shows near-zero timeouts; fallback qwen3.8-27b; verify chroma sync | in-progress | engine-sheet | [[../plans/2026-08-20-consolidate-model-calls-on-openrouter]]; `~/.claude-mem/logs/claude-mem-2026-09-20.log` |

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
| canon.5 | OUSD + Peralta CCD ruled contaminants (S368 Mike-direct); Oakland City Schools + Oakland CCD minted, repo text swapped. OPEN sheet renames: BIZ-00016, Peralta row, INIT-007 Notes; then Employer-column sweep | ready | engine-sheet | [[canon/INSTITUTIONS]] §Education |
| research.25 | Headless newsroom pipeline — M–F writer-wakes + Sat compile; Phase 1 + Phase 2.0 done, next is Phase 2 daily writer-wakes (was gated on engine.76 W5 half 1, now shipped) | in-progress | research-build → engine-sheet | [[../plans/2026-07-20-headless-newsroom-pipeline]] |
| research.27 | UNDOCKED/SpaceMolt — S379: §2.5 daily cadence LIVE (draw F7 fix, EpisodeId seq, auto-approve gate, cron-undocked-run.js orchestrator, undockedStandings.js). C104 retarget done S378 | in-progress | research-build | [[../plans/2026-08-07-spacemolt-game-show]] §2.5 |
| pipeline.60 | Nia Rook newsroom dispatch — BUILT S379 (undocked desk quota, feed-built lane via buildNiaSlice, recap ledger, NIAROOK-UNDOCKED-1 package, roster row + beat rule); acceptance = next unattended 06:15 wake chain | in-progress | engine-sheet | [[../plans/2026-08-07-spacemolt-game-show]] §2.5 |

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
| governance.47 | Cross-lane message bus — Tasks 1-4 shipped (file-mailbox transport, lane registry, transcript log, hop limit), live-verified against real lane states; open: Task 5 routing table | in-progress | research-build | [[../plans/2026-08-15-cross-lane-message-bus]] |

---

## Watch List

Tracking for future adoption. Not building.

| Feature | Trigger to Act |
|---------|---------------|
| **Frozen-column audit** — a `deadBranchScan.js`-shaped scan for beat-slice/story-hook columns with no phase writer (SIM_DOCTRINE §16) | A second instance surfaces past engine.192 (schools), OR a lane-program pass (kimi) flags one on its own — then it earns a script, not a one-off find |
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
