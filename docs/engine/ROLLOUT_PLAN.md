# GodWorld — Rollout Plan

**Current work and waits only.** A row is here because someone is working it now, because it waits on a dated fire or a named builder call, or because it is ruled and next in the queue. Closed work → [[ROLLOUT_ARCHIVE]]. Parked work and external watches → [[../plans/BACKLOG]] §Parked ideas and external watches. Row contract, states and the sweep → [[rollout-rules]]. Sim lens before touching a mechanic → [[SIM_DOCTRINE]] §15. Last trued 2026-10-07 (engine-sheet, against the C110 smoke, PROD `f2a61e5e` and codex's row chase [[../research/2026-10-07-codex-rollout-chase]]); engine-lane stale check 2026-10-22 (each ready / in-progress engine-sheet row read against the code and later builds; superseded rows closed with the superseding build named in their plan).

**Reading this file:** section 1 is the builder's list. Sections 2–4 are the lanes'. The plan list below is regenerated at every session close; any wait whose date has passed is named at close too. One line per job; the detail is in the plan the row names. Live Cycle C112 (fired Sun 2026-10-18 evening; engine.299 readback 22:16 CDT: 2,344 lines, 250 s); next live fire C113, Sunday 2026-10-25.

**Working order (builder 2026-10-22, "work through this list how you lay it out"):** ship what is already paid for (finished, reviewed code) first; then clear the builder's decisions; then builds ranked by "does it give the citizens a life", grouped by the file they touch; plumbing only when a build already has the file open. Nothing waits on the live fire (TERMINAL.md: the bench is the gate; a bench-proven change goes live the same session).

<!-- generated: plans in motion (docLoopStatus.js --plans --write; do not hand-edit) -->
**Plans in motion (52)** — each plan, its rows and the state each is in:

- [[../plans/2026-10-10-engine-214-mood-per-hood]]: engine.214 live-observing, engine.301 live-observing, engine.308 live-observing, engine.287 live-observing, engine.288 live-observing, engine.289 blocked, engine.305 live-observing, engine.306 live-observing, engine.307 live-observing, engine.309 needs-info, engine.311 needs-info
- [[../plans/2026-10-11-media-extension]]: pipeline.85 live-observing, pipeline.89 in-progress, pipeline.83 live-observing, pipeline.88 needs-info, pipeline.74 live-observing, pipeline.75 live-observing, pipeline.77 live-observing, pipeline.78 live-observing, pipeline.79 live-observing, pipeline.80 live-observing
- [[../plans/2026-09-11-sports-as-a-lived-system]]: engine.206 live-observing, engine.205 ready, engine.202 ready, engine.203d live-observing
- [[../plans/2026-09-21-care-and-justice-system]]: engine.254 live-observing, engine.271 live-observing, engine.272 live-observing, engine.298 live-observing
- [[../plans/2026-09-26-future-build-ideas]]: engine.238 live-observing, engine.264 needs-info, engine.261 ready
- [[../plans/2026-07-27-employment-living-system]]: engine.319 live-observing, engine.320 live-observing, engine.321 wontfix
- [[../plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards]]: engine.296 live-observing, engine.318 live-observing, engine.297 live-observing
- [[../plans/2026-09-10-inactivity-is-regression]]: engine.193 ready, engine.201 live-observing, engine.197 live-observing
- [[../plans/2026-10-08-engine-286-game-of-life-events]]: engine.286 live-observing, engine.302 live-observing, engine.304 live-observing
- [[../research/2026-10-02-engine-208-fandom-dial-read-before]]: engine.208 live-observing, engine.280 ready
- [[../plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots]]: research.29 live-observing, engine.291 live-observing
- [[../research/2026-10-03-engine-204-205-game-day-economy-read-before]]: engine.204 ready, engine.281 ready
- [[../plans/2026-08-10-economy-native-rebuild]]: engine.293 live-observing, engine.104 ready
- [[../DEPLOY_HISTORY]]: engine.303 ready, engine.310 live-observing
- [[../plans/2026-10-04-school-board]]: civic.43 needs-info
- [[../plans/2026-10-19-discord-voices-connected]]: research.30 live-observing
- [[../plans/2026-10-20-hood-character-standing]]: pipeline.71 needs-info
- [[../plans/2026-10-19-bay-tribune-master-index]]: pipeline.84 live-observing
- [[../plans/2026-07-31-citizen-memory-perception]]: engine.94 live-observing
- [[../plans/2026-10-06-supermemory-v5-migration]]: infrastructure.10 blocked
- `output/production_log_run_cycle_c112_gaps.md`: civic.45 live-observing
- [[../plans/2026-09-29-sim-holiday-calendar]]: engine.273 live-observing
- [[../plans/2026-05-07-chaos-cars-engine]]: engine.11 live-observing
- [[../plans/2026-08-16-new-life-intake]]: engine.108 live-observing
- [[../plans/2026-09-24-initiatives-in-the-world]]: engine.260 live-observing
- [[../plans/2026-08-29-employment-system-cascade]]: civic.33 live-observing
- [[../plans/2026-07-31-platform-ceiling-resilience]]: engine.95 live-observing
- [[../plans/2026-07-11-agent-exchange-engine]]: engine.53 live-observing
- [[../plans/2026-08-07-spacemolt-game-show]]: research.27 live-observing
- [[../plans/2026-07-06-citizen-loop-deepening]]: engine.48 live-observing
- [[../plans/2026-09-13-run-cycle-packages-the-world]]: pipeline.69 ready
- [[../plans/2026-08-29-boot-doc-consolidation]]: governance.51 ready
- [[../plans/2026-08-16-city-hall-nine-seat-table]]: civic.24 ready
- [[../canon/INSTITUTIONS]]: canon.5 ready
- [[../plans/2026-06-24-engine-output-canon-coverage]]: engine.41 ready
- [[../plans/2026-07-31-canon-ingest-backfill]]: engine.91 ready
- [[../plans/2026-08-02-neighborhood-truth-source-migration]]: engine.99 ready
- [[../plans/2026-08-17-sheet-weight-reduction]]: engine.116 ready
- [[../plans/2026-05-26-engine-27-wd-card-auto-invalidation]]: engine.27 ready
- [[../plans/2026-07-31-engine-observability-integrity]]: infrastructure.6 ready
- `docs/archive/for-claude-review/2026-10-25-codex-engine301-gate3-recheck.md`: engine.317 ready
- `output/antigravity/2026-10-19-review-engine214-prod-candidate.md`: engine.316 ready
- [[../plans/2026-10-15-engine-290-transit-rides-the-sim]]: engine.290 live-observing
- [[../reference/DEPLOY_HISTORY]]: engine.294 live-observing
- [[../plans/2026-10-16-the-money-game]]: engine.295 needs-info
- [[../docs/plans/2026-10-11-media-extension.md]]: pipeline.73 live-observing
- [[../research/2026-10-11-codex-engine194-cut]]: engine.194 live-observing
- [[../plans/2026-09-28-storylines-keyed-to-engine-events]]: engine.270 ready
- [[../research/2026-10-16-codex-engine285-hazards2-6-review]]: engine.285 live-observing
- [[../plans/2026-05-22-engine-regulatory-friction]]: engine.20d ready
- [[../research/2026-09-10-kimi-faith-lane-routing]]: engine.248 ready
- [[../plans/2026-10-18-event-engines-move-dials]]: engine.299 live-observing
<!-- /generated -->

## Pull order (builder, 2026-09-29; trued 2026-10-07)

1. **Sports as a lived system** — the 204/205/206/208/209/281 builds went live 2026-10-06; C111 is their first live fire. Open calls are in section 1.
2. **engine.94** citizen memory, then **engine.98** pets and **engine.264** the maker's hand.
3. Everything else by section.

---

## 1. Waiting on the builder — named calls

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| civic.43 | School board: T1 + T3 LIVE. T2 seating HELD (builder 2026-10-07): schools half built (hood school data, no schools in hoods); deep review first, then the canon-name fix | needs-info | research-build | [[../plans/2026-10-04-school-board]] §Builder's words (2026-10-07) |
| research.30 | Discord voices connected (builder 2026-10-19): brief, search first, Paulson bonds, talk recorder LIVE. Read 2026-10-25: first Cycle drain of DISCORD rows (C113) | live-observing | research-build | [[../plans/2026-10-19-discord-voices-connected]] |
| pipeline.71 | Each hood read against its own canon: every hood's INSTITUTIONS character is its own baseline and its own numbers say whether it lives up to it (builder 2026-10-20; the one-axis tech-boom design is superseded). Rewrite with the builder: which numbers express each hood's character | needs-info | research-build | [[../plans/2026-10-20-hood-character-standing]] |

## 2. Waiting on a fire — dated or organic

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| pipeline.84 | Organic: next unattended Jax assignment naming a covered citizen carries the earlier-coverage section. Built and live 2026-10-20 (index, landing, canon fix); detail in the plan | live-observing | research-build | [[../plans/2026-10-19-bay-tribune-master-index]] |
| engine.208 | Fandom: C112 4 fan lines, Oaks weight 0.35 → 0.3831; C113 4 fan lines, `fandom seeded 9`, weight → 0.4061 (weeks 2, fans 4). Band open; second read C114 Sun 2026-11-01 | live-observing | engine-sheet | [[../research/2026-10-02-engine-208-fandom-dial-read-before]] §Changelog 2026-10-08; `output/engine_review_c113.md` §C113 re-reads |
| engine.94 | B.3 v3 LIVE (PROD `e87362b4`). C111 read 2026-10-11: 131 phases, 615 bonds certified, 10 seats held at 60–69, 0 campaign notes/hooks. C115 B.2 bars; open sim call on challenger appeal → holder approval awaits the builder | live-observing | engine-sheet | [[../plans/2026-07-31-citizen-memory-perception]] §Status log engine.94 B.3 v3 live reads |
| engine.254 | C119: Phase10-CareJusticeCensus timing, point 2 of 2 (1,243 ms at C110); Task 9 review with it | live-observing | engine-sheet | [[../plans/2026-09-21-care-and-justice-system]] §Task 10 handoff |
| engine.271 | C120: first property-tax day. Fines, court and tickets proven at C110 | live-observing | engine-sheet | [[../plans/2026-09-21-care-and-justice-system]] §engine.271 read-before and design |
| engine.272 | ~C139: first citizen worn down far enough to reach the conduct-crime gate. Wear proven at C110 (35 of 35) | live-observing | engine-sheet | [[../plans/2026-09-21-care-and-justice-system]] §engine.272 cut |
| infrastructure.10 | Sun 2026-11-01: Supermemory v5 migration session, not before (builder 2026-10-07). Vendor cutoff ~2027-01-06 | blocked | engine-sheet | [[../plans/2026-10-06-supermemory-v5-migration]] |
| civic.45 | Fri 2026-10-30: did D9 (Uptown) or D2 (Downtown) pick up HousingPressure 9 over C113's civic week, unprompted (builder 2026-10-20)? Pickup = a move or referral, a tracker row, or an INIT-006 phase change; baseline and wiring in the gap log | live-observing | engine-sheet | `output/production_log_run_cycle_c112_gaps.md` §G-EC41 |
| engine.273 | Holidays LIVE; first Second Dawn C131. Open Court Week LIVE PROD `ae9278aa` (position 6, citywide, First Friday week; first live C162; unit-proven). Meaning sentences approved as working lines (desk carrier = pipeline.86); running-on-its-own week held until it happens | live-observing | engine-sheet | [[../plans/2026-09-29-sim-holiday-calendar]] §Builder's words (2026-10-07) |
| engine.11 | Organic: the first real Tier-1 chaos-car hit runs the civic cascade on live (T5.3). Synthetic shape proven | live-observing | engine-sheet | [[../plans/2026-05-07-chaos-cars-engine]] |
| engine.108 | Organic: the first generic citizen reaching EmergenceCount 3 gets promoted (max is 2) | live-observing | engine-sheet | [[../plans/2026-08-16-new-life-intake]] §2-3.1 |
| engine.238 | Organic: the chief's first live patrol move lands in World_Config at a close | live-observing | engine-sheet | [[../plans/2026-09-26-future-build-ideas]] §Builder rulings |
| engine.260 | Organic: the first live civic hire. None on the roster through C110 | live-observing | engine-sheet | [[../plans/2026-09-24-initiatives-in-the-world]] Job 4 |
| civic.33 | Organic: seat turnover at the approval-20 floor with city hall and media both running | live-observing | engine-sheet | [[../plans/2026-08-29-employment-system-cascade]] §civic.33 |

## 3. Now — current work

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| engine.319 | The intake mint places a citizen by clock: ClockMode folded at the door; GAME → the team in the title; unnamed CIVIC → City of Oakland; unnamed MEDIA → a news outlet. LIVE PROD @165 stage 29 2026-10-27 (builder go); first live fire C114. Opus | live-observing | engine-sheet | [[../plans/2026-07-27-employment-living-system]] Task 10 |
| engine.320 | An off-map intake hood refuses the whole queue up front, as the engine.319 clock does (it threw mid-pass: earlier mints committed, no queue row cleared). LIVE PROD @166 stage 30 2026-10-27 (builder go); first live fire C114. Opus | live-observing | engine-sheet | [[../plans/2026-07-27-employment-living-system]] Task 11 |
| pipeline.85 | Rhea gates the world's record, not the Packet (builder 10-25: gate the facts, not the color): writer fence + repair pass gone, audit never fails a draft, Rhea sees only what named citizens said + ledger + world state. Proof: 2026-10-26 fanout | live-observing | research-build | [[../plans/2026-10-11-media-extension]] §Status log pipeline.85 |
| pipeline.89 | Every journalist picks (builder 10-25: "All journalists should pick, they are AI"): every wake package gets the live tools the 3 tool seats have, the slice is a tip sheet not the assignment, Rhea is off every path; Ines first, same cut on all 28. First run 2026-10-28 | in-progress | research-build | [[../plans/2026-10-11-media-extension]] §pipeline.89 |
| engine.296 | Sports legends from retired MLB-origin ledger rows, no literal fallback — LIVE @143/@144; re-read on C113 (Sun 2026-10-25) | live-observing | engine-sheet | [[../plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards]] |
|  research.29 | UNDOCKED crossover: Moves 1–5 live (engine.291 on PROD @138). C112 readback 10-19: 46 audience lines, 15 name a pilot, 0 raw tokens. Sat 10-24 read: 10 crossings, 2 printed both sides (Yu Zen, Vinnie Keane), digest seat printed; next read Sat 2026-10-31 | live-observing | research-build | [[../plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots]]  |
| engine.214 | Mood per hood + 287/288 LIVE @148 (stage 5); 8a Cut A = engine.305 @151; Cut B (hood reactions) @152; **Cut C LIVE @153, rate 1-in-10 @154 = stage 17** (2026-10-20). First live fire C113 Sun 2026-10-25; next 8b `$VENUE` draws the citizen's spot | live-observing | engine-sheet | [[../plans/2026-10-10-engine-214-mood-per-hood]] |
| engine.204 | Builder 2026-10-22: remove HomeNeighborhood + EconomicFootprint (they move no number); wire FranchiseStability + CommunityInvestment; dashboard gains WeekRecord + the 11 sheet-only EventTypes; recurring off-list triggers become hooks | ready | engine-sheet | [[../research/2026-10-03-engine-204-205-game-day-economy-read-before]] §4 Builder ruling 2026-10-22, §5 |
| engine.205 | Weekly game economy LIVE since 2026-10-06; its column surface is built under engine.204 (builder 2026-10-22, all three) | ready | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Tasks 4, 10 |
| engine.281 | Sports-week ladder + venue (a–d) LIVE since 2026-10-06. (e) the column surface rides engine.204 (builder 2026-10-22, all three) | ready | engine-sheet | [[../research/2026-10-03-engine-204-205-game-day-economy-read-before]] §5 |
| engine.95 | Checkpoint/resume LIVE, gate 330000/60000/6000. C112: 131 phases, 250 s, no checkpoint; Phase11-MaintainLifeHistoryLog 25.4 → 45.7 s vs tailReserveMs 60000 (bench C123 308 s). Read C113 Sun 2026-10-25; grow tailReserveMs if that phase nears 60 s | live-observing | engine-sheet | [[../plans/2026-07-31-platform-ceiling-resilience]] §Changelog bench steps 0–5 |
| engine.193 | Adversity tiers LIVE; (b) settle LIVE `ae9278aa`; the per-institution settle log line LIVE since S553 (`9687e42f`) — C112's execution log carries 14 settle lines, the read is not written up (G-EC50). Then (a) public-employer budget squeeze; then CAT-layer design for the builder | ready |  | [[../plans/2026-09-10-inactivity-is-regression]] §engine.193 Builder's words (2026-10-07) |
| engine.301 | F1 crime carry + wave rung, `1e6beff5`: LIVE PROD @163 = stage 27 (2026-10-25, builder "Ok clear to push", rode with engine.312; DEPLOY_HISTORY §PROD stage 27). First live fire C113: crime lines only in hoods at level ≥ 1, `crimeWaveHoods` carried | live-observing | engine-sheet | [[../plans/2026-10-10-engine-214-mood-per-hood]] §engine.301 F1 |
| engine.53 | Organic: the first exchange-line candidate in a street pool. Mon 2026-10-05 fanout read 2026-10-08: none, because no transcript sentence named that day's highlights (fog, Oaks; 0 of 66 turns) | live-observing | research-build | [[../plans/2026-07-11-agent-exchange-engine]] |
|  research.27 | Organic: a flight since the 2026-10-18 landing closes a contract and its credits reach the feed row + board (§3.2). Stations Bayline 6 / Oakland 12 minted, seats open until the pipeline.73 reporter walk (builder 2026-10-12) | live-observing | research-build | [[../plans/2026-08-07-spacemolt-game-show]] §3.2 + §Post-ship (e)  |
| engine.48 | Organic: the first T8 tension-seed result off the cron; none recorded yet | live-observing | research-build | [[../plans/2026-07-06-citizen-loop-deepening]] |
| engine.201 | Fixed-cohort proof (48 citizens from C110) — resnap after C113, once Step 5 writes the world summary | live-observing | engine-sheet | [[../plans/2026-09-10-inactivity-is-regression]] §BUILD SPEC |
| pipeline.69 | Run-cycle packages the world: T1 texture by hood, T2 wake tells a citizen their seed, T3 seed floor, T5 C108 slice readback | ready |  | [[../plans/2026-09-13-run-cycle-packages-the-world]] |
| governance.51 | Boot docs: T8 (memory-write-gate hook, rotation to sl-memories). T3 memory dedup done — builder cleared the deletes (2026-10-22) | ready |  | [[../plans/2026-08-29-boot-doc-consolidation]] |
| civic.24 | Sunday nine-seat table: Task 10 sheet tab | ready | engine-sheet | [[../plans/2026-08-16-city-hall-nine-seat-table]] |
| canon.5 | Sheet renames LANDED live 2026-10-12: BIZ-00016 → Oakland City Schools, BIZ-00035 → Oakland Community College District, INIT-007 Notes (read back). Open: the Employer-column sweep (tied to engine.191 roster mismatch) | ready |  | [[canon/INSTITUTIONS]] §Education |
| engine.41 | Engine output to canon: build Wire 1b (SuggestedCitizenVoices, column cleared 2026-09-27), then re-verify Wire 3 | ready | engine-sheet | [[../plans/2026-06-24-engine-output-canon-coverage]] |
| engine.91 | Canon ingest: the wiki ingesters carry no customId | ready |  | [[../plans/2026-07-31-canon-ingest-backfill]] §S502 |
| engine.99 | Hood truth-source: ~49 files of hood literals, migrated as each is touched | ready |  | [[../plans/2026-08-02-neighborhood-truth-source-migration]] |
| engine.116 | Spreadsheet weight: T2 code repoint, T3 archives out, T5 dead-tab prune | ready |  | [[../plans/2026-08-17-sheet-weight-reduction]] |
| engine.197 | Wakes have no rules MERGED to main 2026-10-22 (codex SHIP 10-17, suite 297/297): one lottery over the whole pool, under 7 out, Corliss in, Mags's journal → one Reflection_Intake row a night. First proof Fri 2026-10-23: 07:30 wake pool line, 19:00 nightly row; C113 drain | live-observing | engine-sheet | [[../plans/2026-09-10-inactivity-is-regression]] §Changelog 2026-10-22 |
| engine.202 | Sports WeekRecord: trigger-word hooks, dashboard input (3b), 3c | ready |  | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 1 |
| engine.27 | Card auto-invalidation Phase B (cycle-end marker hook); Phase A daemon live | ready | engine-sheet | [[../plans/2026-05-26-engine-27-wd-card-auto-invalidation]] |
| infrastructure.6 | Sim-health observability: /api/sim-health + dashboard panel (Track A, not built). Track B ghost tabs + tab-reference test done (`c3fe1780`, `86f43999`, `1240a80a`; test 273 refs PASS 2026-10-22) | ready | engine-sheet | [[../plans/2026-07-31-engine-observability-integrity]] |
| pipeline.83 | Failure review: when a piece fails, whose failure was it. C111 pass done; first live UNDOCKED digest seat ran 2026-10-24 (audited accurate) — rb reads it 2026-10-27 | live-observing | research-build | [[../plans/2026-10-11-media-extension]] §pipeline.83 |
| engine.308 | Heritage business cap + cadence (builder 2026-10-22): cap 2 per citizen, line cap = living members + tier step, 12-Cycle cooldown. PROD @158; C113 check PASS (armed, no opening); first possible opening Dillon C121 | live-observing | engine-sheet | DEPLOY_HISTORY §PROD stage 21; [[../plans/2026-10-10-engine-214-mood-per-hood]] step 8, engine.308 design; `output/engine_review_c113.md` §C113 re-reads |
| engine.318 | Citizen_Usage_Intake read and written by header name (the old reader took B as the type and marked col E) — source of the 35 C90 POPID-for-type usage rows. LIVE PROD @164 stage 28 2026-10-25 (builder go); first live fire C113. Opus | live-observing | engine-sheet | [[../plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards]] §engine.318 |

## 4. Queue — ruled, not started

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| engine.206 | Streaks drive a game week toward a business headline (builder 2026-10-27: ordinary weeks stay under the .15 gate; streaks, team success and playoffs push it over). Playoffs + team success already feed it; the streak does not. Bench streak options, builder picks the rate | ready | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 6 §Builder's words (2026-10-27) |
| engine.321 | Is a tracked mint business growth (its headcount signal; 2+ at one business = BUSINESS_EXPANSION)? Builder 2026-10-27: "a citizen added to a buisness can result in a growth" — stands as built, no change | wontfix |  | [[../plans/2026-07-27-employment-living-system]] §Open questions |
| pipeline.90 | Dashboard COSTS tab: OpenRouter spend by day and model, what runs each model, credit left; live behind login. Builder to view; claude-mem own-key line dropped (it is free-only now) | done-pending-archive | research-build | [[../plans/2026-10-11-media-extension]] §Status log |
| pipeline.88 | Proposal, builder's call: daily seats (Ines, Tamsin) write angle/packet/draft under a Cycle-keyed stem, so five days share one file set and a failed day can see yesterday's plan (Ines Sun 10-25). Key their stems by day? | needs-info | research-build | [[../plans/2026-10-11-media-extension]] §Status log pipeline.87 |
| engine.317 | A read-only door for FIRE_ADMISSION_JSON (webTrigger getprop is carry-forward-only; a GET fires a Cycle), so a PROD push can prove no Cycle was admitted across it (codex engine.301 gate 3, 2026-10-25) | ready |  | `docs/archive/for-claude-review/2026-10-25-codex-engine301-gate3-recheck.md` |
| engine.316 | Five hoods' texture pools are empty after textureSigned_: Eastlake, Baylight District, East Oakland have 0 up / 0 down lines; Grand Lake, San Antonio 0 down (agy 2026-10-19 F6, split from engine.301). Author signed lines → builder approves → land under the substrate gate | ready | research-build | `output/antigravity/2026-10-19-review-engine214-prod-candidate.md` F6 |
| engine.290 | Transit rides the sim — LIVE PROD stage 4d. C113 clean (18 rows on the ledger base, the four C112 crew placed at BIZ-00014); open: crew ECL rows + governor (plan Sequencing 4), Trevor's slice first live read | live-observing | engine-sheet | [[../plans/2026-10-15-engine-290-transit-rides-the-sim]]; `output/engine_review_c113.md` §C113 re-reads |
| engine.294 | Raw "$MOOD" token in LifeHistory — fixed LIVE @138 stage 4g; C112 and C113 0 raw-token lines | done-pending-archive | engine-sheet | commit 71637c7a; [[../reference/DEPLOY_HISTORY]] §stage 4g; `output/engine_review_c113.md` §C113 re-reads |
| engine.295 | Owner draw → the money game: design session rb + builder, builds from the plan's Task 6. Household map written 2026-10-22; its §6: calls 1,2,4,5,6 ruled 2026-10-22 (Roots $25M, any household row, MaritalStatus; CIV/MED fame only; no rungs), call 3 left simple | needs-info | research-build | [[../plans/2026-10-16-the-money-game]] · [[../plans/2026-10-22-household-to-heritage-map]] |
| engine.293 | Arrivals born wrong (promotion-door pay) — LIVE @139 stage 4h; C113: the one arrival at 60000 is named by the log (no pay rule places "Urban garden worker"), as designed | done-pending-archive | engine-sheet | [[../plans/2026-08-10-economy-native-rebuild]] §Read 2026-10-16; `output/engine_review_c113.md` §C113 re-reads |
| engine.291 | UNDOCKED rows name the pilot ($PILOT / $PILOTROLE / $LEADER) — LIVE @138 stage 4g; C112 and C113 0 raw-token lines | done-pending-archive | engine-sheet | [[../plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots]] §Move 4; `output/engine_review_c113.md` §C113 re-reads |
| engine.297 | Fame sightings draw from the Cultural_Ledger (builder 2026-10-17). PROD stages 22–25; C113 check PASS: 3 sighted, 0 minted, no authored category rewritten, no positional calendar write (313/314/315 in the same receipt) | done-pending-archive | engine-sheet | DEPLOY_HISTORY §PROD stage 23; [[../plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards]] Task 9; `output/engine_review_c113.md` §C113 re-reads |
| pipeline.73 | Tamsin (Lives) + Ines (Voices) live since 2026-10-19. Lives rebuilt 2026-10-25 (thread + wide intake + family passages; EIC two-Cycle record; empty-day sit-out) — plan changelog 10-25. Read Tamsin's first wide run Mon 2026-10-26 06:15: people, length vs 450-1200, grade | live-observing | research-build | docs/plans/2026-10-11-media-extension.md |
| pipeline.74 | Organic: the next unattended Tanya / P Slayer / Noah write proves the rest of the swapped-model fixes (es c9d59d24) — off-season label, P Slayer POPIDs, Noah → grok-4.3; none has written unattended since. Angle cap 1600 PROVEN (capHits 0 on 10-15/16/19) | live-observing | engine-sheet | [[../plans/2026-10-11-media-extension]] |
| pipeline.75 | Organic: Tanya's next unattended write proves the feed names + Notes (the 10-14 runs were manual). Deterministic write checks (thin/verbatim/cap/toolCalls) PROVEN in every unattended fan-out results file 10-15 → 10-19 (landed es) | live-observing | engine-sheet | [[../plans/2026-10-11-media-extension]] |
| pipeline.77 | Reward loop on five seats (rubric seen = rubric judged, grade on the page, W1 reads it); C111 baseline staged; first unattended C112 runs Mon–Wed 10-19..21; mechanism 2 held | live-observing | engine-sheet | [[../plans/2026-10-11-media-extension]] |
| pipeline.78 | Staged readers take suffixed reruns (one matcher); Saturday 10-17 lands 16 C111 pieces incl. Nia's three; Friday reconciler + per-filing Packet folded (es a8095541, 734db7cd); next read Sat 10-24 (C112 pieces) | live-observing | engine-sheet | [[../plans/2026-10-11-media-extension]] |
| pipeline.79 | Every journalist graded; Saturday prints the best-graded first; printed pieces earn byline-published (tier credit, none written since C102); C111 backfilled; length graded as a floor only; next read Sat 10-24 (C112) | live-observing | engine-sheet | [[../plans/2026-10-11-media-extension]] |
| pipeline.80 | INTAKE names floor LIVE (4fabf88e); first floor entries 2026-10-19; read at the 2026-10-31 ingest (the 10-24 read was not done); tier bars 3/6/9 stay | live-observing | research-build | [[../plans/2026-10-11-media-extension]] §pipeline.80 |
| engine.287 | Citywide crime gate: floor 3 carried spikes, half share on each hood (builder 2026-10-10). Rides the engine.214 PROD. Live counts 2/0/0/1/1/1/2 (C113: Adams Point, Piedmont Ave; no wave); read over the builder's window longer than 20 Cycles | live-observing | engine-sheet | [[../plans/2026-10-10-engine-214-mood-per-hood]] §Tasks 17/18/19 — mechanism; `output/engine_review_c113.md` §C113 re-reads |
| engine.288 | Mood gates read both seed lists (builder 2026-10-10) — the newsroom's deck beside the engine list; benched @16 (seed hoods 7 → 14). C113 had no seed input (first adoption); first gated read C114 Sun 2026-11-01 | live-observing | engine-sheet | [[../plans/2026-10-10-engine-214-mood-per-hood]] §engine.288 bench results; `output/engine_review_c113.md` §C113 re-reads |
| engine.289 | Absolute CULTURE gates (`wCulture >= 3 / >= 6`, `applyCityDynamics.js`) were written while seed input was dead. C113 had none (first adoption), so C114 Sun 2026-11-01 is their first input: re-read, then keep, re-tier, or go relative (builder call) | blocked | engine-sheet | [[../plans/2026-10-10-engine-214-mood-per-hood]] §Tasks 17/18/19 — mechanism → Bench results; `output/engine_review_c113.md` §C113 re-reads |
| engine.264 | The maker's hand — builder intake tab the sim never sees; after engine.94 (builder 2026-09-29). Plan verdict is needs-info (sim call: how visible is the builder's hand) — row trued 2026-10-16 | needs-info | research-build | [[../plans/2026-09-26-future-build-ideas]] §Builder rulings |
| engine.203d | Season aftermath LIVE PROD `ae9278aa` (+ the feed gate's S.cycleId read; `sportsFadeRate` 0.85 row 222). C111 +0.085, C112 +0.072, C113 **+0.061 exactly** (0.072 × 0.85) | done-pending-archive | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 2; `output/engine_review_c113.md` §C113 re-reads |
| engine.194 | Record-driven sports sentiment + game-night intensity — LIVE; priced weeks C112 +0.004 (one win), C113 +0.010 (3–0) | done-pending-archive | engine-sheet | [[../research/2026-10-11-codex-engine194-cut]]; `output/engine_review_c113.md` §C113 re-reads |
| engine.270 | Review 1 ruled 2026-10-08: build the anomaly tag (D1), no age on first-seen stages (D2), Task 7 step 1 attach pass. Queued, not dispatched (es on other work). Step 2 and the scorer rewire wait the C113 read | ready | engine-sheet | [[../plans/2026-09-28-storylines-keyed-to-engine-events]] §Review 1 Disposition |
| engine.285 | Organic: Phase-11 + executor kill hazards — all LIVE @140/@141; item 4 waits on engine.95 receipts | live-observing | engine-sheet | `docs/research/2026-10-08-codex-engine95-design.md` §7; [[../research/2026-10-16-codex-engine285-hazards2-6-review]] |
| engine.286 | Life-event dice LIVE (`63754ca8`); forced sale .017 live; own-record wake `6489ab23`; scoreboard `c421b5d9`. C112 read 2026-10-25 in the plan changelog (25 dice lines, 21 T4; 2 bought / 3 sold / 0 forced / 0 promoted); wake-as-turn waits on the builder naming the game (N31/N32) | live-observing | research-build | [[../plans/2026-10-08-engine-286-game-of-life-events]] |
| engine.20d | Initiative seeds on movement only in buildWorldSummary's civic lane. Released from the engine.270 wait 2026-10-08; spec only, no code yet. Not dispatched | ready | engine-sheet | [[../plans/2026-05-22-engine-regulatory-friction]] §Task 5 |
| engine.280 | Fandom dial follow-up (read-before §2.9) | ready | engine-sheet | [[../research/2026-10-02-engine-208-fandom-dial-read-before]] §2.9 |
| engine.104 | Mint economy: arrivals born right. Mint paths take job titles from lists outside the Economic_Parameters job table; revision owes legacy mutating-path disposition + D2 proof (agy 2026-10-17) | ready | research-build | [[../plans/2026-08-10-economy-native-rebuild]] §Read 2026-10-16 |
| engine.248 | Faith orgs get a sim role: membership, a slight dial nudge, faith-life events | ready | engine-sheet | [[../research/2026-09-10-kimi-faith-lane-routing]] |
| engine.261 | Firm agents: three business owners get a wake slice to run their business | ready | engine-sheet | [[../plans/2026-09-26-future-build-ideas]] §Builder rulings |
| engine.298 | World summary and sports slices hand the desks one number per fact — LIVE; C113 hospital segment in the care trail's words, no load % | done-pending-archive | engine-sheet | [[../plans/2026-09-21-care-and-justice-system]] §engine.298; [[../plans/2026-10-11-media-extension]] §pipeline.83; `output/engine_review_c113.md` §C113 re-reads |
| engine.299 | Every hardcoded event moves a dial, no real-Oakland premise — LIVE @147 stage 4p, C112 readback PASS | live-observing | engine-sheet | [[../plans/2026-10-18-event-engines-move-dials]] |
| engine.302 | Bond system (builder 2026-10-19, rulings 1–12): five marital statuses, widowed + divorced court, wedding window 24–58, divorce on stacked crisis. PROD @149; C113: 23 new bonds (band ~25), 0 weddings / divorces / deaths, MaritalStatus clean | done-pending-archive | engine-sheet | [[../plans/2026-10-08-engine-286-game-of-life-events]] §Bench soak; `output/engine_review_c113.md` §C113 re-reads |
| engine.303 | Compression and archive outside the Cycle run? (builder 2026-10-19). Bench C123: Phase9-CompressLifeHistory 151 s of 308 s (wall 360); Phase11-MaintainLifeHistoryLog ~30 s every fire. Read the writers and what reads their output in-Cycle first | ready | engine-sheet | DEPLOY_HISTORY §SANDBOX 1004 @57 soak |
| engine.304 | Family lottery (builder R13–R19): 1% tier-weighted draw links a GC spouse/child/parent, waiting in the pool until usage brings it on; the wake names them. PROD @150; C113: 6 links (bench 6.8), 0 released, 6 arrivals named | done-pending-archive | engine-sheet | [[../plans/2026-10-08-engine-286-game-of-life-events]] §engine.304; `output/engine_review_c113.md` §C113 re-reads |
| engine.305 | A Down-graded Neighborhood line pulsed its hood +1; now −1 (engine.214 8a Cut A). PROD @151 stage 14, bench 15 hoods −0.01…−0.07. C113: 0 errors; the step is not separable on live, bench-proven | done-pending-archive | engine-sheet | [[../plans/2026-10-10-engine-214-mood-per-hood]] §PROD wave procedure step 8a; `output/engine_review_c113.md` §C113 re-reads |
| engine.306 | Business mints for hood character — 103 rows landed live 2026-10-21 (stage 18); C113 watch. C113 watch ACCEPT-CANDIDATE: 0 citizens moved by the rows, every spot line on the citizen's own spot | done-pending-archive | engine-sheet | [[../plans/2026-10-10-engine-214-mood-per-hood]] step 8, engine.306 hood-by-hood decisions + codex review fold; `output/engine_review_c113.md` §C113 re-reads |
| engine.307 | Lift the sports hiring guard: sports orgs hire staff roles, never athletes, same rate (builder 2026-10-21/22). `7f49f3db` bench B14 PASS, codex gates 1–8 folded; PROD @157 2026-10-22, first live C113. C113 guard PASS: 0 athletes moved, 0 sports hires | done-pending-archive | engine-sheet | DEPLOY_HISTORY §PROD stage 20; [[../plans/2026-10-10-engine-214-mood-per-hood]] step 8, engine.307; `output/engine_review_c113.md` §C113 re-reads |
| engine.309 | Off-heritage ownership with ascent and crash (builder 2026-10-21): founder door for an existing citizen in their own field; ascent via owner draw → home → Door C; crash = back to the hiring pool. Door number = money-game Task 5. After engine.308 | needs-info | engine-sheet | [[../plans/2026-10-10-engine-214-mood-per-hood]] step 8, engine.309 design |
| engine.311 | Business entry by opportunity (builder 2026-10-22): line tier decides which business types open; every business class gets entry gates (none today); line contents in combination raise an opportunity to buy/open; the citizen's wake decides, not a roll. Covers 309's door | needs-info | research-build | [[../plans/2026-10-10-engine-214-mood-per-hood]] step 8, builder 2026-10-22 under engine.308 |
| engine.310 | EventAttractiveness base: every staged city event once, whole words for the rest (builder option 2). PROD @156; C113 watch CLEAN (EA sum 114.29 → 114.12); C114 Sun 2026-11-01 reads migration drift + trajectory off the C113 map | live-observing | engine-sheet | DEPLOY_HISTORY §PROD stage 19; `docs/research/2026-10-21-engine310-diff-gate-TASK.md`; plan `docs/research/2026-10-21-engine310-plan-TASK.md`; `output/engine-sheet/2026-10-21-e310-check.json`; `output/engine_review_c113.md` §C113 re-reads |
