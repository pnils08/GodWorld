# ROLLOUT_PLAN staleness scan — run 2026-09-16, research-build

Method: last commit (all branches) citing the row ID as a whole token, vs last git-touch of the pointer file if one is a real path. Not a "done" proof — silence can mean genuinely blocked, not finished. Rows with SHIPPED/LANDED/DONE/LIVE PROD language in the item text but a non-terminal state are flagged separately for archive review.

Total rows scanned: 148

## NEVER-CITED (7)

| id | terminal | state | last cite | last pointer touch | item (truncated) |
|---|---|---|---|---|---|
| engine.181 | engine-sheet | needs-info | — (—) | — (—) | The citywide floor (RimWorld counterweight) — after 176+177 run three live cycles, design … |
| engine.203d | engine-sheet | ready | — (—) | — (—) | D3: inactivity decays toward the city baseline; no snap-to-zero or permanent carry. Build … |
| engine.215 | engine-sheet | ready | — (—) | — (—) | `illnessConvergenceRate` has been missing from World_Config for three cycles (`Riley_Diges… |
| research.3 | research-build | needs-info | — (—) | — (—) | Document processing pipeline evaluation (Qianfan-OCR for civic-doc ingest) |
| research.7 | research-build | needs-info | — (—) | — (—) | KAIROS background daemon monitoring (Anthropic future feature) |
| research.8 | research-build | needs-info | — (—) | — (—) | Hermes Agent (NousResearch) reference architecture monitoring |
| research.10 | research-build / engine-sheet | blocked | — (—) | — (—) | Arc engine grafts + Patterns A/B/D in idea-park (chaos-cars sibling, deferred) |

## VERY-STALE (21)

| id | terminal | state | last cite | last pointer touch | item (truncated) |
|---|---|---|---|---|---|
| pipeline.2 | research-build / engine-sheet | in-progress | 2026-05-26 (113d) | — (—) | Non-edition publishing pipeline (interview/dispatch/supplemental format contract) |
| pipeline.8 | research-build | in-progress | 2026-05-26 (113d) | — (—) | Supplemental strategy — one per cycle minimum |
| pipeline.24 | research-build | in-progress | 2026-05-26 (113d) | — (—) | /sift v2 rebuild |
| pipeline.35 | research-build / engine-sheet | ready | 2026-06-11 (97d) | — (—) | Cycle-init "admin" skill + one-true-cycle-source |
| engine.15 | engine-sheet | needs-info | 2026-05-12 (127d) | — (—) | ENGINE_REPAIR `Pattern` column |
| engine.20d | research-build | blocked | 2026-05-26 (113d) | — (—) | Sift Step 5 `covered-by-feature` triage handle — absorb regulatory-process noise into civi… |
| civic.13 | engine-sheet | blocked | 2026-06-16 (92d) | — (—) | City-hall engine-sheet reconciliation |
| infrastructure.3 | research-build | needs-info | 2026-05-25 (114d) | — (—) | Reviewer lanes → Claude Managed Agents (Dreaming pilot, Anthropic preview-access gated) |
| infrastructure.5 | [[../plans/2026-05-22-supermemory-load-bearing-audit]] + [[../adr/0008-speaker-attribution-for-auto-save-writers | research-build | 2026-06-01 (107d) | — (—) | Supermemory load-bearing audit | in-progress |
| research.4 | research-build | needs-info | 2026-05-25 (114d) | — (—) | Desk agents migration off Claude → DeepSeek (research/watch — cost/limits trigger) |
| research.5 | research-build | blocked | 2026-05-10 (129d) | — (—) | Instant compaction — Strategic compact PreToolUse hook port (`affaan-m/everything-claude-c… |
| research.9 | research-build | blocked | 2026-05-31 (108d) | — (—) | Inter-agent conversation harness |
| engine.36 | engine-sheet | parked | 2026-06-16 (92d) | — (—) | Isolated staging environment |
| governance.3 | research-build | blocked | 2026-05-12 (127d) | — (—) | Mags-at-/root steward layer |
| governance.8 | research-build | needs-info | 2026-05-12 (127d) | — (—) | Plugin gating per terminal |
| governance.9 | research-build | needs-info | 2026-05-12 (127d) | — (—) | `/post-pattern <name>` micro-skill |
| governance.18 | research-build | in-progress | 2026-06-01 (107d) | — (—) | C12 boot-conditioning residual |
| governance.22 | research-build | needs-info | 2026-05-28 (111d) | — (—) | Claude Code v2.1.149–v2.1.153 feature adoption |
| governance.26 | research-build / engine-sheet | in-progress | 2026-06-15 (93d) | — (—) | SESSION_CONTEXT on-demand log redesign |
| governance.33 | research-build / engine-sheet | in-progress | 2026-06-12 (96d) | — (—) | C96 gap-log triage |
| governance.35 | engine-sheet (design: research-build DONE) | ready | 2026-06-15 (93d) | — (—) | REDUCED S260 by governance.36 §loop-tightening to the PIN-self-derive remnant |

## STALE (29)

| id | terminal | state | last cite | last pointer touch | item (truncated) |
|---|---|---|---|---|---|
| pipeline.13 | research-build | in-progress | 2026-07-05 (73d) | — (—) | Photo pipeline rebuild |
| engine.7 | research-build / engine-sheet | in-progress | 2026-07-06 (72d) | — (—) | Engine Routing Foundation — Phase 6 cutover (gated on 3 cycles shadow data) |
| engine.8 | engine-sheet | blocked | 2026-07-05 (73d) | — (—) | Header-drift detector C93 Type-2 triage (16 MED clusters) + C94 sweep absorbed S225 (G-EC5… |
| engine.10 | research-build / engine-sheet | needs-info | 2026-08-01 (46d) | — (—) | Phase 43 — Engine Expansion (city-functions, 5-domain priority order) |
| engine.27 | engine-sheet | in-progress | 2026-06-23 (85d) | — (—) | wd-card auto-invalidation hook |
| engine.29 | engine-sheet | parked | 2026-06-22 (86d) | — (—) | Citizen lifecycle & fame system |
| engine.41 | engine-sheet | in-progress | 2026-07-21 (57d) | — (—) | Engine-output → canon coverage |
| engine.43 | engine-sheet | in-progress | 2026-07-12 (66d) | — (—) | Voices/agents sync contract — BUILT S306, runtime smoke pending (detail: plan §Build notes… |
| engine.45 | engine-sheet | in-progress | 2026-07-26 (52d) | — (—) | Ripple ledger — T1–T3b live in prod; T3c retired + T3e folded S311; open: T3d, per-hood fo… |
| engine.47 | engine-sheet | needs-info | 2026-07-06 (72d) | — (—) | Game-night connection design — one game traced through 10 hops, gaps close in 4 existing e… |
| engine.51 | research-build (T8) + engine-sheet | in-progress | 2026-07-11 (67d) | — (—) | Citizen intake unification — T1-T7 done; prod Intake tab S305; T8 extraction built S305 (d… |
| engine.53 | research-build | in-progress | 2026-07-11 (67d) | — (—) | Agent exchange engine — T1–5 SHIPPED S312 (3 formats live-verified, 17:00 cron wired; conv… |
| engine.76 | engine-sheet | in-progress | 2026-07-26 (52d) | — (—) | Compile-layer rebuild — W1–W3 + W5 complete (half 2 shipped S336: usage-rotated per-lane b… |
| engine.95 | engine-sheet | in-progress | 2026-07-31 (47d) | — (—) | Platform ceiling resilience — instrumentation live + wall baselined at 34–38% of 6-min wal… |
| civic.14 | research-build / engine-sheet | in-progress | 2026-07-05 (73d) | — (—) | Initiative_Tracker contract + fine-tune |
| infrastructure.4 | [[../SUPERMEMORY]] + [[../adr/0008-speaker-attribution-for-auto-save-writers | engine-sheet | 2026-07-26 (52d) | — (—) | supermemory-claude plugin auto-saved session transcripts to `mags` as `session_turn` do… |… |
| research.12 | research-build | in-progress | 2026-06-26 (82d) | — (—) | Autonomy roadmap |
| engine.30 | engine-sheet | blocked | 2026-06-22 (86d) | — (—) | Citizen card full-life enrichment |
| engine.34 | engine-sheet | parked | 2026-07-12 (66d) | — (—) | Ledger is a representative sample |
| research.13 | research-build | needs-info | 2026-06-23 (85d) | — (—) | Citizen-autonomous PoC |
| research.16 | research-build + engine-sheet | in-progress | 2026-07-10 (68d) | — (—) | Tier-1 character voice agents |
| research.17 | research-build | needs-info | 2026-07-12 (66d) | — (—) | Storyline-spine memory — REGROUNDED S306 (Mike-direct, design WITH Mike); prior P1/P2 plan… |
| research.19 | research-build → engine-sheet | in-progress | 2026-06-30 (78d) | — (—) | Citizen perception & immersion access layer |
| engine.39 | engine-sheet | in-progress | 2026-06-26 (82d) | — (—) | `citizenDialMap` pure-integrity |
| research.20 | research-build → engine-sheet | in-progress | 2026-07-11 (67d) | — (—) | Autonomous deep-dispatch |
| research.21 | research-build → engine-sheet | in-progress | 2026-07-11 (67d) | — (—) | Citizen-signal story emergence |
| research.24 | engine-sheet | in-progress | 2026-07-26 (52d) | — (—) | Entity protagonism — business/faith event gen, Riley lifestyle → seed backdrop, Community_… |
| research.25 | research-build → engine-sheet | in-progress | 2026-07-30 (48d) | — (—) | Headless newsroom pipeline — M–F writer-wakes + Sat compile; Phase 1 + Phase 2.0 done, nex… |
| governance.34 | research-build / engine-sheet | in-progress | 2026-06-18 (90d) | — (—) | C97 gap-log triage |

## RECENT (26)

| id | terminal | state | last cite | last pointer touch | item (truncated) |
|---|---|---|---|---|---|
| pipeline.43 | research-build | in-progress | 2026-08-31 (16d) | — (—) | Citizen voice quote supply (PRIORITY, Mike-direct S312) — ALL T1–5 built (T1–2 live-verifi… |
| pipeline.45 | engine-sheet / research-build | in-progress | 2026-08-07 (40d) | — (—) | Saturday canon flow installed; C103 dry sweep proves 18 exact Rhea-hash Articles including… |
| pipeline.46 | research-build | in-progress | 2026-08-06 (41d) | — (—) | Jax sim stink-audit (grok) — scanner + weekly firebrand force-slot + approach override; Ta… |
| pipeline.47 | research-build | in-progress | 2026-08-16 (31d) | — (—) | P Slayer fan-heat seat (grok) — sports writers IN M-F fanout; solo p-slayer persona; multi… |
| pipeline.49 | research-build | in-progress | 2026-08-07 (40d) | — (—) | Civic solo seats (grok) — five persona stacks + bags; multi-voice civic-desk legacy for he… |
| pipeline.50 | research-build | in-progress | 2026-08-07 (40d) | — (—) | Culture + sports-support solos (grok) — 6 culture + Tanya/Simon/Marbury; Marbury deep-anal… |
| pipeline.51 | engine-sheet | in-progress | 2026-08-20 (27d) | — (—) | NotebookLM Daily News — direction/archive hook landed; Phase 6 approved: deterministic Cyc… |
| pipeline.53 | engine-sheet | in-progress | 2026-08-09 (38d) | — (—) | Citizen day digest (kimi) — 24h people-slice folded into the 8am notebooklmDailyNews bound… |
| pipeline.54 | engine-sheet | in-progress | 2026-08-22 (25d) | — (—) | Restore S344 human story slots; pressure-test Article voice, Packet entity walls, and assi… |
| governance.51 | engine-sheet | in-progress | 2026-08-29 (18d) | — (—) | Boot-doc consolidation — rule-only boot docs under a confirmed size ceiling, no stacked ch… |
| infrastructure.7 | engine-sheet | ready | 2026-08-31 (16d) | — (—) | Consolidate model calls on OpenRouter — Rhea, Saturday run, Discord pair. Price the models… |
| engine.5 | engine-sheet | in-progress | 2026-08-15 (32d) | — (—) | Household + family simulation (Representative Sample model, reframed S243) — functional yo… |
| engine.48 | research-build | in-progress | 2026-08-09 (38d) | — (—) | Citizen-loop deepening — engine-sheet lane COMPLETE S312 (T1–5, T9–13); open: T8 /sift ten… |
| engine.104 | research-build → kimi/codex | ready | 2026-08-29 (18d) | — (—) | Economy native rebuild — salaries/education/career-stage born right; five S364 doctrines; … |
| engine.105 | engine-sheet | in-progress | 2026-08-31 (16d) | — (—) | Hospital ledger reads the Status column — missed-admission reconcile. Shipped + live-deplo… |
| engine.106 | engine-sheet | ready | 2026-08-15 (32d) | — (—) | Crisis arcs fed fabricated specificity to desk packets — C97 pull done; rebuild as a conne… |
| engine.93 | engine-sheet | in-progress | 2026-08-24 (23d) | — (—) | Per-hood political consequence — ALL BUILDS SHIPPED S349 (Tasks 5-7 fold + Tasks 9-10 comm… |
| engine.98 | research-build | parked | 2026-08-02 (45d) | — (—) | Pets as household members — Scout is canon with no carrier; open: SL column vs Household_P… |
| civic.19 | research-build | blocked | 2026-08-15 (32d) | — (—) | Council as actors — districts own approval, author their own initiatives |
| civic.25 | research-build | needs-info | 2026-08-16 (31d) | — (—) | New-life intake (Mike-direct) — civic.21's seeding op needs a grounded-biography process, … |
| civic.24 | engine-sheet | in-progress | 2026-08-29 (18d) | — (—) | Sunday nine-seat table — grok Tasks 1-9 closed (`b75bb28c` dry C104). Open: Task 10 sheet … |
| engine.67 | engine-sheet | in-progress | 2026-08-17 (30d) | — (—) | Event pools — steps 1-9 + involvedCitizens wire LIVE S325, sweeps done; OPEN: Mike's live … |
| engine.83 | engine-sheet | in-progress | 2026-08-17 (30d) | — (—) | Employment reconciliation — UNTRACKED sentinel SHIPPED S357 (Mike-approved): generic fallb… |
| research.27 | research-build | in-progress | 2026-09-01 (15d) | — (—) | UNDOCKED/SpaceMolt — S379: §2.5 daily cadence LIVE (draw F7 fix, EpisodeId seq, auto-appro… |
| pipeline.60 | engine-sheet | in-progress | 2026-08-18 (29d) | — (—) | Nia Rook newsroom dispatch — BUILT S379 (undocked desk quota, feed-built lane via buildNia… |
| governance.47 | research-build | blocked | 2026-08-15 (32d) | — (—) | Cross-lane message bus — stop hand-relaying between lanes; deterministic transport + routi… |

## ACTIVE (65)

| id | terminal | state | last cite | last pointer touch | item (truncated) |
|---|---|---|---|---|---|
| pipeline.44 | research-build (pilot, media absorbed) | ready | 2026-09-06 (10d) | — (—) | Desk-slice fork (FLAGSHIP, Mike-direct S313) — T1–T5 done (3 skills live, T5 verified clea… |
| pipeline.48 | research-build | in-progress | 2026-09-06 (10d) | — (—) | Anthony + Hal solo sports seats (grok) — persona maps + stance; agent packages on disk; Cl… |
| pipeline.64 | research-build | in-progress | 2026-09-05 (11d) | — (—) | Pre-Saturday coverage sweep (Sat 12:00) — reconciles unfiled Rhea verdicts, retries any st… |
| pipeline.68 | engine-sheet | in-progress | 2026-09-07 (9d) | — (—) | Beat slices from sheets — T5 approach strings, T6 gate audit, T7b latency, T8 docs |
| pipeline.69 | engine-sheet | in-progress | 2026-09-14 (2d) | — (—) | **Run-cycle packages the world to its readers (Mike-direct S456).** The chain's disk packa… |
| engine.139 | engine-sheet | in-progress | 2026-09-13 (3d) | — (—) | civic scoring re-wire — positives are events, negatives are conditions; symmetric media; w… |
| engine.1 | engine-sheet | blocked | 2026-09-04 (12d) | — (—) | Phase 40.2 cattle refactor (needs plan) |
| engine.6 | engine-sheet | blocked | 2026-09-04 (12d) | — (—) | Press_Drafts.LinkedStoryline 0% populated (DEAD-COLUMN, 164 rows) |
| engine.11 | engine-sheet / research-build | in-progress | 2026-09-05 (11d) | — (—) | Chaos-cars engine — all 4 cascade outputs + all 3 validators now built (S423); only gate l… |
| engine.90 | engine-sheet | in-progress | 2026-09-09 (7d) | — (—) | Citizen Archive — long tail |
| engine.91 | engine-sheet | ready | 2026-09-06 (10d) | — (—) | Canon ingest backfill & sweep — customId idempotency, deterministic sweep (reporters corpu… |
| engine.99 | engine-sheet | in-progress | 2026-09-07 (9d) | — (—) | Neighborhood truth-source — long tail |
| engine.102 | kimi | in-progress | 2026-09-09 (7d) | — (—) | City/hood cascade integrity — T1–T8 done; W4 bench-proven C114–C115 (kimi, criterion 5 PAS… |
| engine.94 | research-build / engine-sheet | needs-info | 2026-09-04 (12d) | — (—) | Citizen memory & approval ceiling — Track A live; ambition ruled by engine.157; grudge/fol… |
| engine.96 | engine-sheet | in-progress | 2026-09-10 (6d) | — (—) | Business lifecycle generator — Tasks 5/6/7/10/11 LIVE @40; top-8 principals minted live (S… |
| engine.175 | engine-sheet / kimi (apparatus, landed) | in-progress | 2026-09-08 (8d) | — (—) | Undocked cast drawn in the engine + show markets keyed to the pilot — bench-proven 0831 C1… |
| engine.176 | engine-sheet | in-progress | 2026-09-13 (3d) | — (—) | Dials: the negative pole from causes + ambient as tint — CUT LOCALLY S438 (pressureTags 41… |
| engine.177 | engine-sheet | in-progress | 2026-09-08 (8d) | — (—) | Dials: watermark fold every cycle, mood persisted + decays, edge-damped hardening — CUT LO… |
| engine.178 | engine-sheet | in-progress | 2026-09-08 (8d) | — (—) | Dials close doors: relocation openness, casino integrity/composure, bond warmth as mainten… |
| engine.179 | engine-sheet | in-progress | 2026-09-08 (8d) | — (—) | Contests by character: contestRoll_ at job slot, heritage stake, civic challenger, romanti… |
| engine.180 | engine-sheet | in-progress | 2026-09-08 (8d) | — (—) | The cron reads the game: thrown/stance, posture-changed wake slot, clamped one-notch push … |
| engine.182 | engine-sheet | in-progress | 2026-09-08 (8d) | — (—) | Ambition costs: overwork Strain that never adapts, burnout ×2 on health events, burnout + … |
| engine.183 | engine-sheet | in-progress | 2026-09-09 (7d) | — (—) | Transit × hoods: game day = the feed, v3 event hoods, Coliseum → East Oakland, initiative … |
| engine.185 | engine-sheet | in-progress | 2026-09-15 (1d) | — (—) | Sentiment had no downward range (62 dead `<= -0.3` branches / 37 files). Repriced onto sev… |
| engine.187 | engine-sheet | ready | 2026-09-11 (5d) | — (—) | Shock detector stuck-on — **ROOT CAUSE FOUND S443, and it is NOT in `applyShockMonitor.js`… |
| engine.189 | engine-sheet | in-progress | 2026-09-16 (0d) | — (—) | Faith lane routing. LANDED in engine.231/232 (PROD @93/@94): `FAITH` in the storyHook desk… |
| engine.191 | engine-sheet | ready | 2026-09-10 (6d) | — (—) | School-district roster mis-mapped: 12/29 active BIZ-00016/35 rows off-role (plumber, line … |
| engine.193 | engine-sheet | ready | 2026-09-10 (6d) | — (—) | Adversity tiers unreachable (unemployment/sickness fire 0/22 hoods). **RULED (Mike-direct … |
| engine.194 | engine-sheet | in-progress | 2026-09-14 (2d) | — (—) | Record-driven sentiment and game-night intensity; codex authors under Task 7, engine-sheet… |
| engine.195 | engine-sheet | ready | 2026-09-11 (5d) | — (—) | The engine.188 carrier fix, for the other four metrics: `publicSpaces` / `communityEngagem… |
| engine.196 | engine-sheet | ready | 2026-09-11 (5d) | — (—) | Holiday peaks still flatten the city: engine.188 fixed the RESTING level but the biggest h… |
| engine.197 | engine-sheet | in-progress | 2026-09-13 (3d) | — (—) | **RULED S451 (builder): the 5 pins at exactly 100 (POP-00001 drive; POP-00170/198/210/231 … |
| engine.199 | engine-sheet | ready | 2026-09-10 (6d) | — (—) | Economic_Parameters collapses to one runtime source (sheet, single read per cycle-run, cac… |
| engine.200 | engine-sheet | ready | 2026-09-11 (5d) | — (—) | RoleType/EconomicProfileKey/SkillTags/EmployerBizId is a 4-field overlap never adjudicated… |
| engine.201 | engine-sheet | in-progress | 2026-09-14 (2d) | — (—) | **RULED 2026-09-14 (builder): tagging out (cut S451 @79, verified absent), the rest stays,… |
| engine.202 | engine-sheet | ready | 2026-09-11 (5d) | — (—) | Wire or remove dead feed fields; repurpose weekly-record input and publish vocabulary. |
| engine.204 | engine-sheet | ready | 2026-09-12 (4d) | — (—) | Record × phase drives city-wide impact, concentrated in canonical stadium zones; replace a… |
| engine.205 | engine-sheet | ready | 2026-09-12 (4d) | — (—) | Weekly game economy in both directions; retain per-franchise effects, record-driven magnit… |
| engine.206 | engine-sheet | ready | 2026-09-11 (5d) | — (—) | Sports consequences emit transit, restaurant, economic and civic seeds; domain routing and… |
| engine.207 | engine-sheet | in-progress | 2026-09-13 (3d) | — (—) | Team-specific odds accepted (fe057fab); weekly input contract remains. C106 open slips wer… |
| engine.207b | engine-sheet | parked | 2026-09-12 (4d) | — (—) | First-result casino selection accepted S447; stored EventId comparison parked until intake… |
| engine.208 | engine-sheet | in-progress | 2026-09-12 (4d) | — (—) | Dial 9 fandom: shared DIALS prerequisite accepted; Event_Content_Ledger selection and sign… |
| engine.209 | engine-sheet | ready | 2026-09-12 (4d) | — (—) | Derived franchise weight drifts on results, tenure and attendance; one feed tab, per-team … |
| engine.213 | engine-sheet | in-progress | 2026-09-16 (0d) | 2026-09-15 (1d) | **Approval reads the CITY (Mike-direct S455).** Council = district composite vs the city m… |
| engine.214 | engine-sheet | parked | 2026-09-14 (2d) | — (—) | Ten of 22 hoods sit outside the Phase-2 `CLUSTERS` literal and ride the city scalar 1:1 (e… |
| engine.227 | engine-sheet | ready | 2026-09-15 (1d) | — (—) | Phase-6 media readers (shock monitor, prioritize, season weights) read `S.mediaEffects` be… |
| engine.234 | engine-sheet | ready | 2026-09-16 (0d) | — (—) | `stubEngine.js` scans a file's TRAILING block comment as the last function's body, so `S.x… |
| engine.216 | engine-sheet | ready | — (—) | 2026-09-13 (3d) | Four Tier-4 incomes doubled in one pass at C107 with no cohort — POP-00784 45,800→99,200, … |
| engine.210 | engine-sheet | in-progress | 2026-09-16 (0d) | — (—) | Landed 44cf056f; 13/13 + 251/251. BENCH-PROVEN @52 C114 (order idx 8<9, 0 errors, 22/22 ho… |
| engine.211 | engine-sheet | ready | 2026-09-12 (4d) | — (—) | Replace extreme phase-only gates and downstream team collapse with relative, record-driven… |
| engine.212 | engine-sheet | in-progress | 2026-09-15 (1d) | — (—) | **BUILT S451 — Crime_Metrics carries forward from last cycle (builder-direct 2026-09-13: a… |
| civic.15 | engine-sheet | in-progress | 2026-09-06 (10d) | — (—) | Civic cron city-hall (Mike-direct S343); Phases 0-4 built S344, dry-Sunday probation befor… |
| engine.108 | engine-sheet | in-progress | 2026-09-02 (14d) | — (—) | Media promotion path — Tier-5 read restored as a bounded fallback (LANDED `e371d815` 2026-… |
| engine.109 | engine-sheet | in-progress | 2026-09-08 (8d) | — (—) | New-life intake — household door BUILT S419, bench C107/C108 proven, **LIVE PROD @50** (Ta… |
| civic.22 | research-build | blocked | 2026-09-05 (11d) | — (—) | Initiative authorship — BLOCKED by S406 ruling 1 (chase plan §S-A addendum): initiatives s… |
| civic.33 | engine-sheet | ready | 2026-09-04 (12d) | — (—) | Recall/challenger fall-rate — threshold-20 confirmed live; tiers 2/3 of the door not yet b… |
| infrastructure.6 | engine-sheet | ready | 2026-09-09 (7d) | — (—) | Sim-health observability + ghost-tab integrity — `/api/sim-health` off engineAuditor JSON … |
| infrastructure.8 | engine-sheet | parked | 2026-09-14 (2d) | — (—) | Hidden-tab audit + disposition (kimi) — 16 hidden tabs classified vs live code (3 load-bea… |
| research.2 | research-build | blocked | 2026-09-04 (12d) | — (—) | Memento CBR case-bank (Phase 1 ready; Phase 2 blocked on ≥500 tuples + droplet headroom) |
| engine.38 | research-build → engine-sheet | in-progress | 2026-09-12 (4d) | — (—) | Living City — full-population coverage |
| engine.82 | engine-sheet | ready | 2026-09-04 (12d) | — (—) | CareerStage integrity — S366 attempt REVERTED (Mike-direct; YearsInCareer clobber restored… |
| engine.85 | engine-sheet (T4,T5,T7,T8) | in-progress | 2026-09-03 (13d) | — (—) | Employment living system — write-back consumer, Generic_Citizens employer column + skill t… |
| engine.116 | engine-sheet | in-progress | 2026-09-06 (10d) | — (—) | Spreadsheet weight — T1 + T2-data SHIPPED; open: T2 code half, T3 archives out, T4 Chicago… |
| canon.5 | engine-sheet | ready | 2026-09-14 (2d) | — (—) | OUSD + Peralta CCD ruled contaminants (S368 Mike-direct); Oakland City Schools + Oakland C… |
| governance.30 | research-build | in-progress | 2026-09-04 (12d) | — (—) | ROLLOUT v2.0 migration — retire this junk box, stand up a fresh structured rollout. **Cut … |

## SHIPPED-LANGUAGE BUT STILL OPEN (34)

Item text claims shipped/landed/done/live-prod, but the row's own state column doesn't say so — candidates for either archiving or state-cell correction.

| id | state | verdict | terminal | item (truncated) |
|---|---|---|---|---|
| pipeline.44 | ready | ACTIVE | research-build (pilot, media absorbed) | Desk-slice fork (FLAGSHIP, Mike-direct S313) — T1–T5 done (3 skills live, T5 verified clean); open: T6 pilot o… |
| pipeline.46 | in-progress | RECENT | research-build | Jax sim stink-audit (grok) — scanner + weekly firebrand force-slot + approach override; Tasks 1-5 shipped 2026… |
| pipeline.51 | in-progress | RECENT | engine-sheet | NotebookLM Daily News — direction/archive hook landed; Phase 6 approved: deterministic Cycle/wake/article-stat… |
| pipeline.69 | in-progress | ACTIVE | engine-sheet | **Run-cycle packages the world to its readers (Mike-direct S456).** The chain's disk package is the only world… |
| engine.139 | in-progress | ACTIVE | engine-sheet | civic scoring re-wire — positives are events, negatives are conditions; symmetric media; width ladders. **Benc… |
| engine.43 | in-progress | STALE | engine-sheet | Voices/agents sync contract — BUILT S306, runtime smoke pending (detail: plan §Build notes) |
| engine.48 | in-progress | RECENT | research-build | Citizen-loop deepening — engine-sheet lane COMPLETE S312 (T1–5, T9–13); open: T8 /sift tension seeds (media) +… |
| engine.51 | in-progress | STALE | research-build (T8) + engine-sheet | Citizen intake unification — T1-T7 done; prod Intake tab S305; T8 extraction built S305 (dry-run verified, san… |
| engine.53 | in-progress | STALE | research-build | Agent exchange engine — T1–5 SHIPPED S312 (3 formats live-verified, 17:00 cron wired; conversations idle until… |
| engine.76 | in-progress | STALE | engine-sheet | Compile-layer rebuild — W1–W3 + W5 complete (half 2 shipped S336: usage-rotated per-lane byline candidate in d… |
| engine.104 | ready | RECENT | research-build → kimi/codex | Economy native rebuild — salaries/education/career-stage born right; five S364 doctrines; S362 vet complete, N… |
| engine.105 | in-progress | RECENT | engine-sheet | Hospital ledger reads the Status column — missed-admission reconcile. Shipped + live-deployed 2026-08-14; regi… |
| engine.106 | ready | RECENT | engine-sheet | Crisis arcs fed fabricated specificity to desk packets — C97 pull done; rebuild as a connected per-hood story … |
| engine.102 | in-progress | ACTIVE | kimi | City/hood cascade integrity — T1–T8 done; W4 bench-proven C114–C115 (kimi, criterion 5 PASS); T9 cron rule lan… |
| engine.93 | in-progress | RECENT | engine-sheet | Per-hood political consequence — ALL BUILDS SHIPPED S349 (Tasks 5-7 fold + Tasks 9-10 commute matrix/housing r… |
| engine.95 | in-progress | STALE | engine-sheet | Platform ceiling resilience — instrumentation live + wall baselined at 34–38% of 6-min wall (Tasks 1–3, 5–7 co… |
| engine.183 | in-progress | ACTIVE | engine-sheet | Transit × hoods: game day = the feed, v3 event hoods, Coliseum → East Oakland, initiative slice, `Factors` col… |
| engine.189 | in-progress | ACTIVE | engine-sheet | Faith lane routing. LANDED in engine.231/232 (PROD @93/@94): `FAITH` in the storyHook desk table + angle match… |
| engine.200 | ready | ACTIVE | engine-sheet | RoleType/EconomicProfileKey/SkillTags/EmployerBizId is a 4-field overlap never adjudicated (engine.87 closed t… |
| engine.216 | ready | ACTIVE | engine-sheet | Four Tier-4 incomes doubled in one pass at C107 with no cohort — POP-00784 45,800→99,200, POP-00812 47,800→98,… |
| engine.210 | in-progress | ACTIVE | engine-sheet | Landed 44cf056f; 13/13 + 251/251. BENCH-PROVEN @52 C114 (order idx 8<9, 0 errors, 22/22 hoods `playoffs`). NOT… |
| engine.212 | in-progress | ACTIVE | engine-sheet | **BUILT S451 — Crime_Metrics carries forward from last cycle (builder-direct 2026-09-13: a persistent ledger i… |
| civic.15 | in-progress | ACTIVE | engine-sheet | Civic cron city-hall (Mike-direct S343); Phases 0-4 built S344, dry-Sunday probation before --apply flip |
| civic.24 | in-progress | RECENT | engine-sheet | Sunday nine-seat table — grok Tasks 1-9 closed (`b75bb28c` dry C104). Open: Task 10 sheet tab (engine-sheet). … |
| engine.108 | in-progress | ACTIVE | engine-sheet | Media promotion path — Tier-5 read restored as a bounded fallback (LANDED `e371d815` 2026-08-16; row was stale… |
| engine.109 | in-progress | ACTIVE | engine-sheet | New-life intake — household door BUILT S419, bench C107/C108 proven, **LIVE PROD @50** (Tasks 3–6: `queueHouse… |
| engine.67 | in-progress | RECENT | engine-sheet | Event pools — steps 1-9 + involvedCitizens wire LIVE S325, sweeps done; OPEN: Mike's live C102 verify + storyl… |
| engine.83 | in-progress | RECENT | engine-sheet | Employment reconciliation — UNTRACKED sentinel SHIPPED S357 (Mike-approved): generic fallback live (87 cells),… |
| engine.85 | in-progress | ACTIVE | engine-sheet (T4,T5,T7,T8) | Employment living system — write-back consumer, Generic_Citizens employer column + skill tags, age-18 ladder, … |
| engine.116 | in-progress | ACTIVE | engine-sheet | Spreadsheet weight — T1 + T2-data SHIPPED; open: T2 code half, T3 archives out, T4 Chicago, T5 dead-tab+dead-c… |
| research.25 | in-progress | STALE | research-build → engine-sheet | Headless newsroom pipeline — M–F writer-wakes + Sat compile; Phase 1 + Phase 2.0 done, next is Phase 2 daily w… |
| research.27 | in-progress | RECENT | research-build | UNDOCKED/SpaceMolt — S379: §2.5 daily cadence LIVE (draw F7 fix, EpisodeId seq, auto-approve gate, cron-undock… |
| pipeline.60 | in-progress | RECENT | engine-sheet | Nia Rook newsroom dispatch — BUILT S379 (undocked desk quota, feed-built lane via buildNiaSlice, recap ledger,… |
| governance.30 | in-progress | ACTIVE | research-build | ROLLOUT v2.0 migration — retire this junk box, stand up a fresh structured rollout. **Cut 1+2 DONE S251** (rul… |
