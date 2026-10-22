# GodWorld — Rollout Plan

**Current work and waits only.** A row is here because someone is working it now, because it waits on a dated fire or a named builder call, or because it is ruled and next in the queue. Closed work → [[ROLLOUT_ARCHIVE]]. Parked work and external watches → [[../plans/BACKLOG]] §Parked ideas and external watches. Row contract, states and the sweep → [[rollout-rules]]. Sim lens before touching a mechanic → [[SIM_DOCTRINE]] §15. Last trued 2026-10-07 (engine-sheet, against the C110 smoke, PROD `f2a61e5e` and codex's row chase [[../research/2026-10-07-codex-rollout-chase]]).

**Reading this file:** section 1 is the builder's list. Sections 2–4 are the lanes'. The plan list below is regenerated at every session close; any wait whose date has passed is named at close too. One line per job; the detail is in the plan the row names. Live Cycle C112 (fired Sun 2026-10-18 evening; engine.299 readback 22:16 CDT: 2,344 lines, 250 s); next live fire C113, Sunday 2026-10-25.

<!-- generated: plans in motion (docLoopStatus.js --plans --write; do not hand-edit) -->
**Plans in motion (54)** — each plan, its rows and the state each is in:

- [[../plans/2026-10-10-engine-214-mood-per-hood]]: engine.214 live-observing, engine.287 live-observing, engine.288 live-observing, engine.289 blocked, engine.305 live-observing, engine.306 live-observing, engine.307 live-observing, engine.308 ready, engine.309 needs-info
- [[../plans/2026-10-11-media-extension]]: pipeline.83 live-observing, pipeline.74 live-observing, pipeline.75 live-observing, pipeline.76 live-observing, pipeline.77 live-observing, pipeline.78 live-observing, pipeline.79 live-observing, pipeline.80 live-observing
- [[../plans/2026-09-11-sports-as-a-lived-system]]: engine.206 live-observing, engine.205 in-progress, engine.202 in-progress, engine.203d live-observing
- [[../plans/2026-09-21-care-and-justice-system]]: engine.254 live-observing, engine.271 live-observing, engine.272 live-observing, engine.298 live-observing
- [[../plans/2026-09-26-future-build-ideas]]: engine.238 live-observing, engine.98 in-progress, engine.264 needs-info, engine.261 ready
- [[../plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards]]: pipeline.81 live-observing, engine.296 live-observing, engine.297 ready
- [[../plans/2026-09-10-inactivity-is-regression]]: engine.193 in-progress, engine.201 live-observing, engine.197 needs-info
- [[../plans/2026-10-08-engine-286-game-of-life-events]]: engine.286 live-observing, engine.302 live-observing, engine.304 live-observing
- [[../research/2026-10-02-engine-208-fandom-dial-read-before]]: engine.208 live-observing, engine.280 ready
- [[../plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots]]: research.29 live-observing, engine.291 live-observing
- [[../research/2026-10-03-engine-204-205-game-day-economy-read-before]]: engine.204 in-progress, engine.281 in-progress
- [[../reference/DEPLOY_HISTORY]]: engine.213 in-progress, engine.294 live-observing
- [[../plans/2026-08-10-economy-native-rebuild]]: engine.293 live-observing, engine.104 ready
- [[../DEPLOY_HISTORY]]: engine.303 ready, engine.310 live-observing
- [[../plans/2026-10-04-school-board]]: civic.43 needs-info
- [[../plans/2026-10-19-discord-voices-connected]]: research.30 live-observing
- [[../plans/2026-10-20-hood-character-standing]]: pipeline.71 needs-info
- [[../plans/2026-10-19-bay-tribune-master-index]]: pipeline.84 live-observing
- [[../plans/2026-07-31-citizen-memory-perception]]: engine.94 live-observing
- [[../plans/2026-10-06-supermemory-v5-migration]]: infrastructure.10 blocked
- `output/production_log_run_cycle_c112_gaps.md`: civic.45 live-observing
- [[../plans/2026-05-07-chaos-cars-engine]]: engine.11 live-observing
- [[../plans/2026-08-16-new-life-intake]]: engine.108 live-observing
- [[../plans/2026-09-24-initiatives-in-the-world]]: engine.260 live-observing
- [[../plans/2026-08-29-employment-system-cascade]]: civic.33 live-observing
- [[../plans/2026-07-31-platform-ceiling-resilience]]: engine.95 live-observing
- [[../plans/2026-09-29-sim-holiday-calendar]]: engine.273 in-progress
- [[../plans/2026-07-11-agent-exchange-engine]]: engine.53 live-observing
- [[../plans/2026-08-07-spacemolt-game-show]]: research.27 live-observing
- [[../plans/2026-07-06-citizen-loop-deepening]]: engine.48 live-observing
- [[../plans/2026-09-13-run-cycle-packages-the-world]]: pipeline.69 in-progress
- [[../plans/2026-08-29-boot-doc-consolidation]]: governance.51 in-progress
- [[../plans/2026-08-16-city-hall-nine-seat-table]]: civic.24 ready
- [[../canon/INSTITUTIONS]]: canon.5 in-progress
- [[../engine/archive/LEDGER_REPAIR_HOUSEHOLDS]]: engine.5 in-progress
- [[../plans/2026-06-24-engine-output-canon-coverage]]: engine.41 ready
- [[../plans/2026-07-07-citizen-intake-unification]]: engine.51 ready
- [[../plans/2026-07-31-canon-ingest-backfill]]: engine.91 in-progress
- [[../plans/2026-08-02-neighborhood-truth-source-migration]]: engine.99 in-progress
- [[../plans/2026-08-17-sheet-weight-reduction]]: engine.116 in-progress
- [[../plans/2026-05-26-engine-27-wd-card-auto-invalidation]]: engine.27 ready
- [[../plans/2026-07-31-engine-observability-integrity]]: infrastructure.6 ready
- [[../plans/2026-10-15-engine-290-transit-rides-the-sim]]: engine.290 live-observing
- [[../plans/2026-10-16-the-money-game]]: engine.295 needs-info
- [[../docs/plans/2026-10-11-media-extension.md]]: pipeline.73 live-observing
- [[../research/2026-10-11-codex-engine194-cut]]: engine.194 live-observing
- [[../plans/2026-09-28-storylines-keyed-to-engine-events]]: engine.270 ready
- [[../research/2026-10-16-codex-engine285-hazards2-6-review]]: engine.285 live-observing
- [[../plans/2026-05-22-engine-regulatory-friction]]: engine.20d ready
- [[../plans/2026-09-22-initiative-budget-disbursement]]: engine.257 ready
- [[../research/2026-09-10-kimi-faith-lane-routing]]: engine.248 ready
- [[../plans/2026-09-19-civic-wake-game-loop]]: engine.253 ready
- [[../plans/2026-10-18-event-engines-move-dials]]: engine.299 live-observing
- `output/antigravity/2026-10-19-review-engine214-prod-candidate.md`: engine.301 ready
<!-- /generated -->

## Pull order (builder, 2026-09-29; trued 2026-10-07)

1. **Sports as a lived system** — the 204/205/206/208/209/281 builds went live 2026-10-06; C111 is their first live fire. Open calls are in section 1.
2. **engine.94** citizen memory, then **engine.98** pets and **engine.264** the maker's hand.
3. Everything else by section.

---

## 1. Waiting on the builder — named calls

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| civic.43 | School board: T1 + T3 LIVE. T2 seating HELD (builder 2026-10-07): schools half built (hood school data, no schools in hoods); deep review first, then the canon-name fix | needs-info | research-build / engine-sheet | [[../plans/2026-10-04-school-board]] §Builder's words (2026-10-07) |
| research.30 | Discord voices connected (builder 2026-10-19): brief, search first, Paulson bonds, talk recorder LIVE. Read 2026-10-25: first Cycle drain of DISCORD rows (C113) | live-observing | research-build | [[../plans/2026-10-19-discord-voices-connected]] |
| pipeline.71 | Each hood read against its own canon: every hood's INSTITUTIONS character is its own baseline and its own numbers say whether it lives up to it (builder 2026-10-20; the one-axis tech-boom design is superseded). Rewrite with the builder: which numbers express each hood's character | needs-info | research-build / engine-sheet | [[../plans/2026-10-20-hood-character-standing]] |

## 2. Waiting on a fire — dated or organic

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| pipeline.84 | Organic: next unattended Jax assignment naming a covered citizen carries the earlier-coverage section. Built and live 2026-10-20 (index, landing, canon fix); detail in the plan | live-observing | research-build / engine-sheet | [[../plans/2026-10-19-bay-tribune-master-index]] |
| engine.208 | C111: 0 fan lines (off-season). C112 (Oaks open, W1): `11 named, 10 staff, 4 fan line(s)`, ripple reached 21 citizens, `fandom seeded 12`, franchise weight Oaks 0.35 → 0.3831 (weeks 1, fans 4). Band open; read the spread over C113–C114 | live-observing | engine-sheet | [[../research/2026-10-02-engine-208-fandom-dial-read-before]] §Changelog 2026-10-08 |
| engine.206 | C112, first live home week (Oaks 1 home win): game-day-crowds seed reached the civic lane only (desk_signal_c112 civic[43]); business dynamics moved 10 bars 0.07 pp but no game-week seed reached any desk. Trace the SPORTS_WEEK ripple before C113 Sun 2026-10-25 | live-observing | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 6 |
| engine.94 | B.3 v3 LIVE (PROD `e87362b4`). C111 read 2026-10-11: 131 phases, 615 bonds certified, 10 seats held at 60–69, 0 campaign notes/hooks. C115 B.2 bars; open sim call on challenger appeal → holder approval awaits the builder | live-observing | engine-sheet / research-build | [[../plans/2026-07-31-citizen-memory-perception]] §Status log engine.94 B.3 v3 live reads |
| engine.254 | C119: Phase10-CareJusticeCensus timing, point 2 of 2 (1,243 ms at C110); Task 9 review with it | live-observing | engine-sheet | [[../plans/2026-09-21-care-and-justice-system]] §Task 10 handoff |
| engine.271 | C120: first property-tax day. Fines, court and tickets proven at C110 | live-observing | engine-sheet | [[../plans/2026-09-21-care-and-justice-system]] §engine.271 read-before and design |
| engine.272 | ~C139: first citizen worn down far enough to reach the conduct-crime gate. Wear proven at C110 (35 of 35) | live-observing | engine-sheet | [[../plans/2026-09-21-care-and-justice-system]] §engine.272 cut |
| infrastructure.10 | Sun 2026-11-01: Supermemory v5 migration session, not before (builder 2026-10-07). Vendor cutoff ~2027-01-06 | blocked | engine-sheet | [[../plans/2026-10-06-supermemory-v5-migration]] |
| civic.45 | Fri 2026-10-30: did D9 (Uptown) or D2 (Downtown) pick up HousingPressure 9 over C113's civic week, unprompted (builder 2026-10-20)? Pickup = a move or referral, a tracker row, or an INIT-006 phase change; baseline and wiring in the gap log | live-observing | engine-sheet | `output/production_log_run_cycle_c112_gaps.md` §G-EC41 |
| engine.11 | Organic: the first real Tier-1 chaos-car hit runs the civic cascade on live (T5.3). Synthetic shape proven | live-observing | engine-sheet / research-build | [[../plans/2026-05-07-chaos-cars-engine]] |
| engine.108 | Organic: the first generic citizen reaching EmergenceCount 3 gets promoted (max is 2) | live-observing | engine-sheet | [[../plans/2026-08-16-new-life-intake]] §2-3.1 |
| engine.238 | Organic: the chief's first live patrol move lands in World_Config at a close | live-observing | engine-sheet | [[../plans/2026-09-26-future-build-ideas]] §Builder rulings |
| engine.260 | Organic: the first live civic hire. None on the roster through C110 | live-observing | engine-sheet | [[../plans/2026-09-24-initiatives-in-the-world]] Job 4 |
| civic.33 | Organic: seat turnover at the approval-20 floor with city hall and media both running | live-observing | engine-sheet | [[../plans/2026-08-29-employment-system-cascade]] §civic.33 |

## 3. Now — current work

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| pipeline.81 | Celeste's dead slice: trends ranks by this-cycle movement, no-citizen Cultural rows off every slice, no "engine" in slice text, pools start from the slice's names, proximity + rest guards dropped (builder 2026-10-16). Built 10-16 (es); acceptance C112 Fri 2026-10-23 | live-observing | engine-sheet / research-build | [[../plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards]] |
| engine.296 | Sports legends from retired MLB-origin ledger rows, no literal fallback — LIVE @143/@144; re-read on C113 (Sun 2026-10-25) | live-observing | engine-sheet | [[../plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards]] |
|  research.29 | UNDOCKED crossover: Moves 1–5 live (engine.291 on PROD @138). C112 live readback 2026-10-19: 46 audience lines, 15 name a C112 pilot, 0 raw tokens, 0 self-naming. Next: 2026-10-24 digest crossover block | live-observing | research-build | [[../plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots]]  |
| engine.214 | Mood per hood + 287/288 LIVE @148 (stage 5); 8a Cut A = engine.305 @151; Cut B (hood reactions) @152; **Cut C LIVE @153, rate 1-in-10 @154 = stage 17** (2026-10-20). First live fire C113 Sun 2026-10-25; next 8b `$VENUE` draws the citizen's spot | live-observing | engine-sheet / research-build | [[../plans/2026-10-10-engine-214-mood-per-hood]] |
| engine.95 | Checkpoint/resume LIVE, gate 330000/60000/6000. C112: 131 phases, 250 s, no checkpoint; Phase11-MaintainLifeHistoryLog 25.4 → 45.7 s vs tailReserveMs 60000 (bench C123 308 s). Read C113 Sun 2026-10-25; grow tailReserveMs if that phase nears 60 s | live-observing | engine-sheet | [[../plans/2026-07-31-platform-ceiling-resilience]] §Changelog bench steps 0–5 |
| engine.204 | Game-day city impact LIVE since 2026-10-06. Column removal HELD (builder 2026-10-07): ripple map of every feed column + dashboard/sheet/code option-sync audit first; the CommunityInvestment carrier waits on it | in-progress | engine-sheet | [[../research/2026-10-03-engine-204-205-game-day-economy-read-before]] §4 Builder's words (2026-10-07) |
| engine.205 | Weekly game economy LIVE since 2026-10-06. Held with engine.204 for the same ripple + option-sync review | in-progress | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Tasks 4, 10 |
| engine.281 | Sports-week ladder + venue (a–d) LIVE since 2026-10-06. (e) the column surface folds into the engine.204/205 ripple + option-sync review (2026-10-07) | in-progress | engine-sheet / research-build | [[../research/2026-10-03-engine-204-205-game-day-economy-read-before]] §5 |
| engine.273 | Holidays LIVE; first Second Dawn C131. Open Court Week LIVE PROD `ae9278aa` (position 6, citywide, First Friday week; first live C162; unit-proven). Meaning sentences approved as working lines (rb carries to desks); running-on-its-own week held until it happens | in-progress | engine-sheet / research-build | [[../plans/2026-09-29-sim-holiday-calendar]] §Builder's words (2026-10-07) |
| engine.193 | Adversity tiers LIVE; (b) settle LIVE `ae9278aa`. C111: self-armed, 7 of 9 toward norm, magnitude unverified, AC Transit / City flat — add per-institution settle log line, read C112 (G-EC50). Then (a) public-employer budget squeeze; then CAT-layer design for the builder | in-progress | engine-sheet | [[../plans/2026-09-10-inactivity-is-regression]] §engine.193 Builder's words (2026-10-07) |
| engine.53 | Organic: the first exchange-line candidate in a street pool. Mon 2026-10-05 fanout read 2026-10-08: none, because no transcript sentence named that day's highlights (fog, Oaks; 0 of 66 turns) | live-observing | research-build | [[../plans/2026-07-11-agent-exchange-engine]] |
|  research.27 | Organic: a flight since the 2026-10-18 landing closes a contract and its credits reach the feed row + board (§3.2). Stations Bayline 6 / Oakland 12 minted, seats open until the pipeline.73 reporter walk (builder 2026-10-12) | live-observing | research-build | [[../plans/2026-08-07-spacemolt-game-show]] §3.2 + §Post-ship (e)  |
| engine.48 | Organic: the first T8 tension-seed result off the cron; none recorded yet | live-observing | research-build | [[../plans/2026-07-06-citizen-loop-deepening]] |
| engine.201 | Fixed-cohort proof (48 citizens from C110) — resnap after C113, once Step 5 writes the world summary | live-observing | engine-sheet | [[../plans/2026-09-10-inactivity-is-regression]] §BUILD SPEC |
| pipeline.69 | Run-cycle packages the world: T1 texture by hood, T2 wake tells a citizen their seed, T3 seed floor, T5 C108 slice readback | in-progress | engine-sheet | [[../plans/2026-09-13-run-cycle-packages-the-world]] |
| governance.51 | Boot docs: T3 memory-file dedup (proposal ready, builder-reviewed deletes) and T8 | in-progress | engine-sheet | [[../plans/2026-08-29-boot-doc-consolidation]] |
| civic.24 | Sunday nine-seat table: Task 10 sheet tab | ready | engine-sheet | [[../plans/2026-08-16-city-hall-nine-seat-table]] |
| canon.5 | Sheet renames LANDED live 2026-10-12: BIZ-00016 → Oakland City Schools, BIZ-00035 → Oakland Community College District, INIT-007 Notes (read back). Open: the Employer-column sweep (tied to engine.191 roster mismatch) | in-progress | engine-sheet | [[canon/INSTITUTIONS]] §Education |
| engine.5 | Household + family: weddings and births are causal; open: divorce as an event | in-progress | engine-sheet | [[engine/archive/LEDGER_REPAIR_HOUSEHOLDS]] |
| engine.41 | Engine output to canon: build Wire 1b (SuggestedCitizenVoices, column cleared 2026-09-27), then re-verify Wire 3 | ready | engine-sheet | [[../plans/2026-06-24-engine-output-canon-coverage]] |
| engine.51 | Citizen intake T8 extraction: bench --apply (bench fires need no ask) | ready | research-build / engine-sheet | [[../plans/2026-07-07-citizen-intake-unification]] |
| engine.91 | Canon ingest: the wiki ingesters carry no customId | in-progress | engine-sheet | [[../plans/2026-07-31-canon-ingest-backfill]] §S502 |
| engine.99 | Hood truth-source: ~49 files of hood literals, migrated as each is touched | in-progress | engine-sheet | [[../plans/2026-08-02-neighborhood-truth-source-migration]] |
| engine.116 | Spreadsheet weight: T2 code repoint, T3 archives out, T5 dead-tab prune | in-progress | engine-sheet | [[../plans/2026-08-17-sheet-weight-reduction]] |
| engine.197 | Dial drift: events reach citizens but base mood barely moves (the mood-to-base conversion) — needs a builder call | needs-info | engine-sheet | [[../plans/2026-09-10-inactivity-is-regression]] §Acceptance results |
| engine.202 | Sports WeekRecord: trigger-word hooks, dashboard input (3b), 3c | in-progress | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 1 |
| engine.213 | Approval reads the city: the mood sawtooth. (The Mon–Thu datawakes reaching no sheet is closed: civic.38 move ledger → Sunday fold → Initiative_Tracker LIVE WRITE C110, civic-cron.log 2026-10-04) | in-progress | engine-sheet | `phase05-citizens/updateCivicApprovalRatings.js`, [[../reference/DEPLOY_HISTORY]] §PROD @84 |
| engine.27 | Card auto-invalidation Phase B (cycle-end marker hook); Phase A daemon live | ready | engine-sheet | [[../plans/2026-05-26-engine-27-wd-card-auto-invalidation]] |
| infrastructure.6 | Sim-health observability: /api/sim-health + dashboard panel; 11 ghost tab refs + tab-reference test | ready | engine-sheet | [[../plans/2026-07-31-engine-observability-integrity]] |
| pipeline.83 | Failure review: when a piece fails, whose failure was it. C111 pass done; open: first live UNDOCKED digest seat 2026-10-24 | live-observing | research-build | [[../plans/2026-10-11-media-extension]] §pipeline.83 |

## 4. Queue — ruled, not started

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| engine.290 | Transit rides the sim — LIVE PROD stage 4d; re-read the transit mints on C113 (Sun 2026-10-25) | live-observing | engine-sheet / research-build | [[../plans/2026-10-15-engine-290-transit-rides-the-sim]] |
| engine.294 | Raw "$MOOD" token in LifeHistory — fixed LIVE @138 stage 4g; re-read on C113 (Sun 2026-10-25) | live-observing | engine-sheet | commit 71637c7a; [[../reference/DEPLOY_HISTORY]] §stage 4g |
| engine.295 | Owner draw → the money game. Read 2026-10-16: the system holds (event losses, median NetWorth +0.02% C106→C111); off-scale = the mint firms' books + heritage Door C, not the draw. Cost-model/cap NOT built. Design session rb + builder; builds come out of the plan's Task 6. → plan | needs-info | research-build | [[../plans/2026-10-16-the-money-game]] |
| engine.293 | Arrivals born wrong (promotion-door pay) — LIVE @139 stage 4h; re-read on C113 (Sun 2026-10-25) | live-observing | engine-sheet | [[../plans/2026-08-10-economy-native-rebuild]] §Read 2026-10-16 |
| engine.291 | UNDOCKED rows name the pilot ($PILOT / $PILOTROLE / $LEADER) — LIVE @138 stage 4g; re-read on C113 (Sun 2026-10-25) | live-observing | engine-sheet | [[../plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots]] §Move 4 |
| engine.297 | Fame sightings draw from the Cultural_Ledger, not twelve literal pools (builder 2026-10-17) — ready to build | ready | codex → engine-sheet | [[../plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards]] Task 9 |
| pipeline.73 | Tamsin Pruitt (POP-01210, Lives Mon–Fri) + Ines Sorensen (POP-01211, Voices Wed–Fri + Sat/Sun) landed 2026-10-19. Mon 10-19 Tamsin read: Rhea PASS, 7/7 names, 309 words vs 450 floor, score 3 (plan changelog). Next: Ines 2026-10-21, then Sat 2026-10-24 / Sun 2026-10-25 alone | live-observing | research-build + engine-sheet | docs/plans/2026-10-11-media-extension.md |
| pipeline.74 | Organic: the next unattended Tanya / P Slayer / Noah write proves the rest of the swapped-model fixes (es c9d59d24) — off-season label, P Slayer POPIDs, Noah → grok-4.3; none has written unattended since. Angle cap 1600 PROVEN (capHits 0 on 10-15/16/19) | live-observing | engine-sheet | [[../plans/2026-10-11-media-extension]] |
| pipeline.75 | Organic: Tanya's next unattended write proves the feed names + Notes (the 10-14 runs were manual). Deterministic write checks (thin/verbatim/cap/toolCalls) PROVEN in every unattended fan-out results file 10-15 → 10-19 (landed es) | live-observing | engine-sheet | [[../plans/2026-10-11-media-extension]] |
| pipeline.76 | Writer tools: Marbury, Hal + Anthony (builder 10-14 / 10-19). Mon 10-19 Anthony read: toolCalls 5, Rhea PASS, 934 words, score 4; Rhea flagged the tool-sourced numbers UNAPPROVED — the gate never sees the tooltrace (plan changelog). Next: Marbury 2026-10-21, Hal 2026-10-22 | live-observing | research-build + engine-sheet | [[../plans/2026-10-11-media-extension]] |
| pipeline.77 | Reward loop on five seats (rubric seen = rubric judged, grade on the page, W1 reads it); C111 baseline staged; first unattended C112 runs Mon–Wed 10-19..21; mechanism 2 held | live-observing | engine-sheet | [[../plans/2026-10-11-media-extension]] |
| pipeline.78 | Staged readers take suffixed reruns (one matcher); Saturday 10-17 lands 16 C111 pieces incl. Nia's three; Friday reconciler + per-filing Packet folded (es a8095541, 734db7cd); next read Sat 10-24 (C112 pieces) | live-observing | engine-sheet | [[../plans/2026-10-11-media-extension]] |
| pipeline.79 | Every journalist graded; Saturday prints the best-graded first; printed pieces earn byline-published (tier credit, none written since C102); C111 backfilled; length graded as a floor only; next read Sat 10-24 (C112) | live-observing | engine-sheet | [[../plans/2026-10-11-media-extension]] |
| pipeline.80 | INTAKE names floor LIVE (4fabf88e); first floor entries 2026-10-19 read at the 2026-10-24 ingest; tier bars 3/6/9 stay | live-observing | research-build | [[../plans/2026-10-11-media-extension]] §pipeline.80 |
| engine.287 | Citywide crime gate: floor 3 carried spikes, half share on each hood (builder 2026-10-10). Built as engine.214 Task 19 `1ce99668`, benched @14 (the C112 wave gone). Rides the engine.214 PROD. Live counts on record 2/0/0/1/1/1 | live-observing | engine-sheet | [[../plans/2026-10-10-engine-214-mood-per-hood]] §Tasks 17/18/19 — mechanism |
| engine.288 | Mood gates read both seed lists (builder 2026-10-10: "the second option") — the newsroom's deck carried beside the engine list. Built `5c6c551d` + `1d0d7b83`, benched @16: active seed hoods 7 → 14 at C112, city unchanged. Rides the engine.214 PROD | live-observing | engine-sheet | [[../plans/2026-10-10-engine-214-mood-per-hood]] §engine.288 bench results |
| engine.289 | Absolute CULTURE gates (`wCulture >= 3 / >= 6` in `applyCityDynamics.js`) were written while the seed input was dead; they have input for the first time on the engine.214 PROD. Waits on live C113 (Sun 2026-10-25): re-read, then keep, re-tier, or move to the relative shape | blocked | engine-sheet | [[../plans/2026-10-10-engine-214-mood-per-hood]] §Tasks 17/18/19 — mechanism → Bench results |
| engine.98 | Pets — names ruled + Scout (Mags's cat) authored 2026-10-16; step 1 carrier LIVE PROD @142 (stage 4k), Scout on live POP-00005, read at C112; acquisition roll deferred — builder 2026-10-19: Scout stays on POP-00005, the pet build is revisited down the line | in-progress | engine-sheet / research-build | [[../plans/2026-09-26-future-build-ideas]] §engine.98 pets — design |
| engine.264 | The maker's hand — builder intake tab the sim never sees; after engine.94 (builder 2026-09-29). Plan verdict is needs-info (sim call: how visible is the builder's hand) — row trued 2026-10-16 | needs-info | research-build | [[../plans/2026-09-26-future-build-ideas]] §Builder rulings |
| engine.203d | Season aftermath LIVE PROD `ae9278aa` (+ the feed gate's S.cycleId read; `sportsFadeRate` 0.85 row 222). C111 +0.085, C112 `aftermath: A's title week 2 after C110` **+0.072 exactly** (0.085 × 0.85); C113 expects +0.061 | live-observing | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 2 |
| engine.194 | Record-driven sports sentiment + game-night intensity — LIVE; re-read the priced week on C113 (Sun 2026-10-25) | live-observing | engine-sheet | [[../research/2026-10-11-codex-engine194-cut]] |
| engine.270 | Review 1 ruled 2026-10-08: build the anomaly tag (D1), no age on first-seen stages (D2), Task 7 step 1 attach pass. Queued, not dispatched (es on other work). Step 2 and the scorer rewire wait the C113 read | ready | engine-sheet | [[../plans/2026-09-28-storylines-keyed-to-engine-events]] §Review 1 Disposition |
| engine.285 | Organic: Phase-11 + executor kill hazards — all LIVE @140/@141; item 4 waits on engine.95 receipts | live-observing | engine-sheet | `docs/research/2026-10-08-codex-engine95-design.md` §7; [[../research/2026-10-16-codex-engine285-hazards2-6-review]] |
| engine.286 | Life-event dice LIVE (`63754ca8`); forced sale .017 live; own-record wake `6489ab23`; scoreboard `c421b5d9`. Read at C112; wake-as-turn waits on the builder naming the game (N31/N32) | live-observing | research-build | [[../plans/2026-10-08-engine-286-game-of-life-events]] |
| engine.20d | Initiative seeds on movement only in buildWorldSummary's civic lane. Released from the engine.270 wait 2026-10-08; spec only, no code yet. Not dispatched | ready | engine-sheet | [[../plans/2026-05-22-engine-regulatory-friction]] §Task 5 |
| engine.280 | Fandom dial follow-up (read-before §2.9) | ready | engine-sheet | [[../research/2026-10-02-engine-208-fandom-dial-read-before]] §2.9 |
| engine.104 | Mint economy: arrivals born right. Mint paths take job titles from lists outside the Economic_Parameters job table; revision owes legacy mutating-path disposition + D2 proof (agy 2026-10-17) | ready | research-build | [[../plans/2026-08-10-economy-native-rebuild]] §Read 2026-10-16 |
| engine.257 | How people lose money — what a household makes vs spends (builder 2026-09-27). One-off losses (bills, debt, default, property tax, forced sale, casino) are live (agy 2026-10-17) | ready | engine-sheet | [[../plans/2026-09-22-initiative-budget-disbursement]] §Data reality, call 8 |
| engine.248 | Faith orgs get a sim role: membership, a slight dial nudge, faith-life events | ready | engine-sheet | [[../research/2026-09-10-kimi-faith-lane-routing]] |
| engine.253 | Transit as its own system: ridership and station load from hood canon | ready | engine-sheet | [[../plans/2026-09-19-civic-wake-game-loop]] §Rulings (g) |
| engine.261 | Firm agents: three business owners get a wake slice to run their business | ready | engine-sheet | [[../plans/2026-09-26-future-build-ideas]] §Builder rulings |
| engine.298 | World summary and sports slices hand the desks one number per fact — LIVE; re-read on C113 (Sun 2026-10-25) | live-observing | engine-sheet | [[../plans/2026-09-21-care-and-justice-system]] §engine.298; [[../plans/2026-10-11-media-extension]] §pipeline.83 |
| engine.299 | Every hardcoded event moves a dial, no real-Oakland premise — LIVE @147 stage 4p, C112 readback PASS | live-observing | engine-sheet | [[../plans/2026-10-18-event-engines-move-dials]] |
| engine.301 | Pre-existing dead wires (agy 2026-10-19, es-verified): `S.crimeByNeighborhood` has no writer, so the citizen crime-carry line reads 0; five hoods' drift pools carry no signed line (rb authoring). Detail: agy review F1, F6 | ready | engine-sheet / research-build | `output/antigravity/2026-10-19-review-engine214-prod-candidate.md` F1, F6 |
| engine.302 | Bond system (builder 2026-10-19, rulings 1–12): five marital statuses, divorced + widowed court, no hood gate, no bond cap, bonds deepen, wedding window 24–58, GC courtship alive, divorce on stacked crisis. PROD @149 + live status migration 2026-10-19; watch C113 | live-observing | engine-sheet | [[../plans/2026-10-08-engine-286-game-of-life-events]] §Bench soak |
| engine.303 | Compression and archive outside the Cycle run? (builder 2026-10-19). Bench C123: Phase9-CompressLifeHistory 151 s of 308 s (wall 360); Phase11-MaintainLifeHistoryLog ~30 s every fire. Read the writers and what reads their output in-Cycle first | ready | engine-sheet | DEPLOY_HISTORY §SANDBOX 1004 @57 soak |
| engine.304 | Family lottery (builder R13–R19): 1% tier-weighted draw links a GC spouse/child/parent; the link waits in the pool until usage brings it on; the wake names them; kids + women into GC; the dead keep their family. LIVE PROD @150; first fire C113 Sun 2026-10-25 | live-observing | engine-sheet | [[../plans/2026-10-08-engine-286-game-of-life-events]] §engine.304 |
| engine.305 | A Down-graded Neighborhood line pulsed its hood +1 (crime watch, rent, decay lifted hoods); now −1. Cut A of engine.214 8a. LIVE PROD @151 = stage 14 (`ea777cae`, codex SHIP), bench pair 15 hoods −0.01…−0.07. Read C113 Sun 2026-10-25 → DEPLOY_HISTORY §PROD stage 14 | live-observing | engine-sheet | [[../plans/2026-10-10-engine-214-mood-per-hood]] §PROD wave procedure step 8a |
| engine.306 | Business mints for hood character — 103 rows landed live 2026-10-21 (stage 18); C113 watch | live-observing | engine-sheet | [[../plans/2026-10-10-engine-214-mood-per-hood]] step 8, engine.306 hood-by-hood decisions + codex review fold |
| engine.307 | Lift the sports hiring guard: sports orgs hire staff roles, never athletes, same rate (builder 2026-10-21/22). `7f49f3db` bench B14 PASS, codex gates 1–8 folded; PROD @157 2026-10-22, first live C113 | live-observing | engine-sheet | DEPLOY_HISTORY §PROD stage 20; [[../plans/2026-10-10-engine-214-mood-per-hood]] step 8, engine.307 |
| engine.308 | Heritage business cap + cadence (builder 2026-10-21): slot gate counts what the standing counts (`generationalWealthEngine.js:3088-3097` vs `:3172`), per-line cap = living members + tier step, per-line cooldown; builder sets the bracketed numbers. After engine.306 | ready | engine-sheet | [[../plans/2026-10-10-engine-214-mood-per-hood]] step 8, engine.308 design |
| engine.309 | Off-heritage ownership with ascent and crash (builder 2026-10-21): founder door for an existing citizen in their own field; ascent via owner draw → home → Door C; crash = back to the hiring pool. Door number = money-game Task 5. After engine.308 | needs-info | engine-sheet | [[../plans/2026-10-10-engine-214-mood-per-hood]] step 8, engine.309 design |
| engine.310 | EventAttractiveness base: substring `art` hit names, 77 of 104 city events never counted. Builder 2026-10-21 option 2: every staged city event once, whole words for the rest. `ffad3bf8` bench ACCEPT, codex SHIP; PROD @156 2026-10-22, first live C113 | live-observing | engine-sheet | DEPLOY_HISTORY §PROD stage 19; `docs/research/2026-10-21-engine310-diff-gate-TASK.md`; plan `docs/research/2026-10-21-engine310-plan-TASK.md`; `output/engine-sheet/2026-10-21-e310-check.json` |
