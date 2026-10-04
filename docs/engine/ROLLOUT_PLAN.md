# GodWorld — Rollout Plan

**Open work only, pointer-only:** one line per job, detail lives in the plan the row names. Closed work → [[ROLLOUT_ARCHIVE]]. Adding, closing and states → [[rollout-rules]]. Unscheduled designs → [[../plans/BACKLOG]]. Sim lens before touching any mechanic → [[SIM_DOCTRINE]] §15. Last updated 2026-09-29.

**Reading this file:** read only down to the lookup table (first 32 lines) — that is the front door; pick a workstream, open its plan. Do not read the row table top to bottom; grep an id (`grep "^| engine.254 " docs/engine/ROLLOUT_PLAN.md`). Owners: engine-sheet (es) executes substrate, research-build (rb) keeps this file; media and civic are crons, not seats, and log to per-cycle gap logs, not here.

## Pull order (builder, 2026-09-29)

1. **engine.254** care and justice — the active build (es). Current assignments ride `SESSION_CONTEXT.md` `NEXT[<lane>]`.
2. **Sports as a lived system** — HIGH priority, mid-build (engine.202 WeekRecord and engine.210 sports phase already live).
3. **engine.94** citizen memory, then **engine.98** pets and **engine.264** the maker's hand (ruled, not started).
4. Everything else by state. `ready` rows carry their own builder rulings.

## Workstreams

| Workstream | Rows | Plan |
|---|---|---|
| Care and justice | engine.254 271 272 273 | [[../plans/2026-09-21-care-and-justice-system]] |
| Sports as a lived system | engine.194 202 204 205 206 208 209 210 211 | [[../plans/2026-09-11-sports-as-a-lived-system]] |
| Dials, adversity, approval | engine.193 197 201 213 214 | [[../plans/2026-09-10-inactivity-is-regression]] |
| Civic game loop and initiatives | civic.24 33 38, engine.238 252 253 259 260 | [[../plans/2026-09-19-civic-wake-game-loop]] |
| Household and citizen economy | engine.5 96 104 248 256 257 261 | [[../plans/2026-09-22-initiative-budget-disbursement]] + [[../plans/2026-08-10-economy-native-rebuild]] |
| Citizen life and memory | engine.38 48 51 53 90 94 98 99 108 264, research.19 21 | [[../plans/2026-09-26-future-build-ideas]] + [[../plans/2026-07-06-citizen-loop-deepening]] |
| Storylines and chaos | engine.11 266 268 270 | [[../plans/2026-09-28-storylines-keyed-to-engine-events]] |
| Newsroom and daily news | pipeline.2 48 49 51 53 54 60 64 68 69, engine.41 76 91, research.27 | [[../plans/2026-09-13-run-cycle-packages-the-world]] |
| Model use and autonomy | research.2 4 9 12 28, engine.7 | [[../plans/2026-09-22-agent-model-fit-test]] |
| Engine health, boot, infra | engine.27 95 116, governance.51, infrastructure.3 6 8, canon.5 | [[../plans/2026-07-31-platform-ceiling-resilience]] |

**States:** `in-progress` being built now · `live-observing` shipped, waiting on a fire or smoke test · `ready` pickable · `needs-info` waits on the builder or another lane · `blocked` waits on a named dependency · `parked` shelved, trigger in the row. Log cycle-level issues in the production gap logs, not as rows here.

---

## Open Work — lookup table (grep an id; do not read top to bottom)

Per ADR-0005: each entry codes as `<group>.<n>`. State per [[rollout-rules]] §3. Description lives in pointer doc, NOT in the row. Heavy-skill gap logs (civic + media pipelines) follow [[../plans/GAP_LOG_TEMPLATE]].

### pipeline.* — Edition production

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| pipeline.48 | Anthony + Hal solo sports seats (grok) — agents landed; open: Task 4 live-observe only (Task 5 media-terminal note is moot per engine.246) | live-observing | research-build | [[../plans/2026-08-07-anthony-hal-solo-sports-seats]] |
| pipeline.49 | Civic solo seats (grok) — agents landed (on disk, confirmed); open: Task 3 live-observe only (Task 4 media-terminal note is moot per engine.246) | live-observing | research-build | [[../plans/2026-08-07-civic-solo-seats]] |
| pipeline.51 | NotebookLM Daily News — direction/archive hook landed; Phase 6 approved: deterministic Cycle/wake/article-state branch router, five-run shadow proof, then separately gated format activation | live-observing | engine-sheet | [[../plans/2026-07-10-notebooklm-bridge-deploy]] §Phase 6 + [[../research/2026-08-20-notebooklm-daily-branching]] |
| pipeline.53 | Citizen day digest (kimi) — 24h people-slice folded into the 8am notebooklmDailyNews bounded source, written + audio per Mike 2026-08-09; engine-sheet lands config rebalance | in-progress | engine-sheet | [[../plans/2026-08-09-citizen-day-digest]] |
| pipeline.54 | Restore S344 human story slots; pressure-test Article voice, Packet entity walls, and assignment coherence while scheduled wakes continue | live-observing | engine-sheet | [[../plans/2026-08-20-s344-human-story-template-pressure-test]] + [[../research/2026-08-20-s344-human-story-template]] |
| pipeline.64 | Pre-Saturday coverage sweep (Sat 12:00) — acceptance MET 2026-10-03 unattended: 4 candidates retried, 2 staged, 2 left for /sift (Sharon Okafor culture, Celeste Tran wire) — a reporter problem, not a sweep problem; status file written | done-pending-archive | research-build | [[../plans/2026-09-04-pre-saturday-coverage-sweep]] |
| pipeline.68 | Beat slices from sheets — sourcing modes + Civis Journal merged `234e5c1e` after two kimi passes; Varek on Sonnet 5.5; run-cycle Step 5.58 wired `e5e29d91`; open: the world-gap build (OPD/OFD staff, director office rows, Transit Hub lead's name — §Builder rulings 22:52) | in-progress | research-build → codex → engine-sheet | [[../plans/2026-09-07-beat-slices-from-sheets-plan]] §Design: sourcing modes |
| pipeline.70 | Citizen pages drive canon (builder go 2026-10-03): page index + admission gate, street page-line evidence, packet INTERPRETATION claims, Celeste THE PAGES SAY pulse, letters pool, Rhea page-contradiction. Six seams landed; acceptance = Mon 2026-10-05 06:15 fanout (plan §3). | live-observing | research-build | [[../plans/2026-10-03-citizen-pages-drive-canon]] |
| pipeline.69 | Run-cycle packages the world to its readers: T1 texture reads life events per hood; T2 wake tells a citizen their own seed; T3 seed floor (decide); T4 one hood roster (engine.214 first); T5 C108 slice readback | in-progress | engine-sheet | [[../plans/2026-09-13-run-cycle-packages-the-world]] |
| governance.51 | Boot-doc consolidation — rule-only boot docs under a confirmed size ceiling, no stacked change-logs; 121 memory files deduped via /batch, builder-reviewed deletes. | in-progress | engine-sheet | [[../plans/2026-08-29-boot-doc-consolidation]] |

### engine.* — Engine code, ledger, schema

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| engine.5 | Household + family simulation (Representative Sample model, reframed S243) — functional youth seed → engine life-event simulation → publication-driven family materialization. Steward authority granted S243. | in-progress | engine-sheet | [[engine/archive/LEDGER_REPAIR_HOUSEHOLDS]] |
| engine.7 | Engine Routing Foundation — Phase 6 cutover (gated on 3 cycles shadow data) | in-progress | research-build / engine-sheet | [[../plans/2026-05-07-engine-routing-foundation]] |
| engine.11 | Chaos-cars engine — all 4 cascade outputs + all 3 validators now built (S423); only gate left is T5.3 live-fire on a real Tier-1 hit | live-observing | engine-sheet / research-build | [[../plans/2026-05-07-chaos-cars-engine]] — detail in pointer (relocated 2026-07-02) |
| engine.20d | Initiative coverage cadence — one piece per initiative per cycle is structural (fanout + engine.270); movement-only is a `buildWorldSummary.js` civic-lane cut (seed only when a stage/disbursement/vote/mayoral column hits the cycle), held for the engine.270 review week | ready | research-build | [[../plans/2026-05-22-engine-regulatory-friction]] §Task 5 |
| engine.27 | Phase A re-enabled 09-26 post infra.12 PATCH fix; Phase B (B1-B4 not started, Apps Script + cycle-critical-path — retagged S501, was stale) | in-progress | engine-sheet | [[../plans/2026-05-26-engine-27-wd-card-auto-invalidation]] |
| engine.41 | Engine-output → canon coverage — Wire 1 fixed `a5b03e96` (bench C143); Wire 1b column CLEARED 2026-09-27 (`SuggestedCitizenVoices` on Story_Seed_Deck) — build; Wire 3 re-verify | ready | engine-sheet | [[../plans/2026-06-24-engine-output-canon-coverage]] — detail in pointer (relocated 2026-07-02) |
| engine.48 | Citizen-loop deepening — T1–5 and T9–13 shipped, T6–7 moved to engine.53, T13 ruled (no speculative pairs); T8 tension seeds cron-wired, waiting on a scheduled fire | live-observing | research-build | [[../plans/2026-07-06-citizen-loop-deepening]] |
| engine.51 | Citizen intake unification — T1-T7 done; prod Intake tab S305; T8 extraction built S305 (dry-run verified, sandbox --apply pending Mike cycle-fire) | in-progress | research-build (T8) + engine-sheet | [[../plans/2026-07-07-citizen-intake-unification]] |
| engine.53 | Agent exchange engine — T1–5 SHIPPED S312 (17:00 cron; 37 transcripts to C109); T6 SHIPPED 2026-10-04 re-scoped to the live seam: transcripts are `exchange-line` street evidence after life-line/page-line, packeted as INTERPRETATION. Acceptance = Mon 06:15 fanout. | live-observing | research-build | [[../plans/2026-07-11-agent-exchange-engine]] |
| engine.76 | Compile-layer rebuild — W1–W3 + W5 complete (half 2 shipped S336: usage-rotated per-lane byline candidate in desk_signal, 3-cycle bench proven); OPEN: W4 two-stack consolidation only, gated on the fork proving (pipeline.44) | in-progress | engine-sheet | [[../plans/2026-07-26-compile-layer-rebuild]] |
| engine.90 | Citizen Archive — long tail | in-progress | engine-sheet | [[../plans/2026-08-21-citizen-archive]] |
| engine.91 | Canon ingest — T2 sweep rewritten + T6 Drive backfill done (125 files); T4 weekly cron live Sat 17:30 (proof 2026-10-03). Open: wiki ingesters carry no customId | in-progress | engine-sheet | [[../plans/2026-07-31-canon-ingest-backfill]] §S502 |
| engine.99 | Neighborhood truth-source — long tail | in-progress | engine-sheet | [[../plans/2026-08-02-neighborhood-truth-source-migration]] §Changelog 2026-09-05 + [[../adr/0016-data-ledgers-are-the-truth-source]] |
| engine.104 | Citizen mint economy — arrivals born with role-consistent salary, education, career stage; builder 2026-09-29: an untracked employer is written UNTRACKED, never blank; plan revision before code (kimi/codex vet first) | ready | research-build → kimi/codex | [[../plans/2026-08-10-economy-native-rebuild]] + [[../research/2026-08-27-cascade-loop-closure-design]] |
| engine.94 | Citizen memory Track B: B.1 + B.2a (54c10b76) + B.3 TENSION seed (6cfe7ef5) landed; B.1 bench-proven C110/C111 on SANDBOX 1004. Open: B.3 bench (inert until C201), B.2 bars from the bench histogram, then --pool memory --apply. | in-progress | engine-sheet / research-build | [[../plans/2026-07-31-citizen-memory-perception]] |
| engine.95 | Platform ceiling resilience — Tasks 1–3, 5–7 done; Task 4 checkpoint/resume DESIGN written 2026-10-04 (with T5 dedup, one build); build waits on the builder's numbers + go | in-progress | engine-sheet | [[../plans/2026-07-31-platform-ceiling-resilience]] |
| engine.96 | Business lifecycle generator — Tasks 5–12 live (Task 12 owner door `68dc5a66` in PROD, Tasks 8/9 trued done S440); open: nothing named in the plan beyond watching the live mint | live-observing | engine-sheet | [[../plans/2026-08-01-business-lifecycle-generator]] |
| engine.98 | Pets — ruled 2026-09-27; DESIGNED 2026-10-04 on engine.94 rails: DialState.pet stamp, Phase-9 acquisition roll (warmth × solitude × tenure), personality picks cat/dog/none, pet events as DSL-gated content rows, loss stamp. Builds after engine.94 B.1. | ready | engine-sheet / research-build | [[../plans/2026-09-26-future-build-ideas]] §engine.98 pets — design |
| engine.193 | Adversity tiers — cuts 1–3 + 3b LIVE PROD @120; employmentFloor 0.85 on live. Open: citywide contraction generator (builder call, plan §engine.193) | in-progress | engine-sheet | [[../plans/2026-09-10-inactivity-is-regression]] §engine.193 |
| engine.194 | Record-driven sentiment and game-night intensity; codex authors under Task 7, engine-sheet lands after Tasks 1–4. | blocked | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 7 |
| engine.197 | 5 pins at 100 ruled seeder saturation, not chased; open: openness-down volume (engine.201) and ~60% all-neutral share via event-engine reach | in-progress | engine-sheet | [[../plans/2026-09-10-inactivity-is-regression]] §Acceptance results |
| engine.201 | **RULED 2026-09-14 (builder): tagging out (cut S451 @79, verified absent), the rest stays, engine-sheet reviews — no further sim ruling.** Open: fixed-cohort causal proof on the next live fires | live-observing | engine-sheet | [[../plans/2026-09-10-inactivity-is-regression]] §BUILD SPEC + [[../plans/2026-09-13-codex-dial-drift-review]] |
| engine.202 | Sports WeekRecord — per-game fold LIVE PROD @120. Next: trigger-word hooks, dashboard input (3b), 3c | in-progress | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 1 |
| engine.204 | Record × phase drives city-wide impact, concentrated in canonical stadium zones; replace authored geography. | in-progress | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 3 · [[../research/2026-10-03-engine-204-205-game-day-economy-read-before]] (read-before + cut 2026-10-03; all four sim calls RULED 2026-10-03 — build-ready; builds on the 208 week object) · BUILT slices A–D 2026-10-03 (`d33e6252` week intensity + `S.sportsCity` band, `9a64c3d2` city-scale consumers, `29648b1e` venue consumers, `e24ee501` bars fill + `66872579`/`29720956` Public-sector class fix, `a0ccd111` E engine reads; 284/284) — BENCHED (C110 real week @192, synthetic home-loss C111 @193, synthetic away/home C112 @194: 0 new errors), not PROD; open: the live column delete (HomeNeighborhood + EconomicFootprint off the tab, with validation/contract/compileHandoff/newsroom readers — builder's go) and CommunityInvestment's carrier (builder's call, overnight §6 04:45) |
| engine.205 | Weekly game economy in both directions; retain per-franchise effects, record-driven magnitude and downside. — absorbs engine.47 Hop 6 (bars fill on game nights, builder 2026-09-28) | in-progress | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Tasks 4, 10 · [[../research/2026-10-03-engine-204-205-game-day-economy-read-before]] (read-before + cut 2026-10-03; all four sim calls RULED 2026-10-03 — build-ready; builds on the 208 week object) · BUILT slices A–D 2026-10-03 (`d33e6252` week intensity + `S.sportsCity` band, `9a64c3d2` city-scale consumers, `29648b1e` venue consumers, `e24ee501` bars fill + `66872579`/`29720956` Public-sector class fix, `a0ccd111` E engine reads; 284/284) — BENCHED (C110 real week @192, synthetic home-loss C111 @193, synthetic away/home C112 @194: 0 new errors), not PROD; open: the live column delete (HomeNeighborhood + EconomicFootprint off the tab, with validation/contract/compileHandoff/newsroom readers — builder's go) and CommunityInvestment's carrier (builder's call, overnight §6 04:45) |
| engine.206 | Sports consequences seed the business and civic desks — bars ride the game-week ripple, one game-day-crowds seed per home week; built d7ac5fff, BENCH-PROVEN C119 @200, agy review then PROD after C110 | in-progress | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 6 |
| engine.207b | First-result casino selection accepted S447; stored EventId comparison parked until intake changes. | parked | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 5 |
| engine.203d | D3 slow fade — cut as §2.9 C10 (`processFeedSheet_` last-row share × fade rate); UNBUILT pending the builder's sign after a won title (overnight doc §6 02:39: dip first, or the glow fades). | blocked | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 2 · [[../research/2026-10-02-engine-208-fandom-dial-read-before]] §2.9 C10 |
| engine.208 | Dial 9 fandom BUILT + BENCH-PROVEN (slices A–E `23aa8c5a`..`a2cecddd`, bench @191 C110 every predicted count exact); M1 LIVE PROD `e59e89f8`. Next: agy diff review fold → PROD after the C110 live fire → live seed on the builder's go (overnight doc §6). | in-progress | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 8 · [[../research/2026-10-02-engine-208-fandom-dial-read-before]] §2.9 |
| engine.280 | Fandom dial follow-up (read-before §2.9) | ready | engine-sheet | [[../research/2026-10-02-engine-208-fandom-dial-read-before]] §2.9 |
| engine.281 | Sports-week ladder + venue: (a1/a2/b/c/d) built + benched @199 debf1afd, PROD after C110; Baylight D2; open (e) column surface (builder + rb) | in-progress | engine-sheet | [[../research/2026-10-03-engine-204-205-game-day-economy-read-before]] §1.4 / §2.2 |
| engine.209 | Derived franchise weight drifts on results, tenure and fan reach, carried on PREV_FRANCHISE_WEIGHT_JSON, five World_Config dials; built + unit-proven, bench waits on the new bench script project, then PROD | in-progress | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Tasks 9–10 |
| engine.213 | Approval reads the CITY, LIVE PROD @84; open: mood sawtooth (engine.214) and Mon-Thu office datawakes reaching no sheet | in-progress | engine-sheet | `phase05-citizens/updateCivicApprovalRatings.js`, [[../reference/DEPLOY_HISTORY]] §PROD @84 |
| engine.214 | Cluster anchors out of the engine — World_Config `clusterAnchors_<CLUSTER>` rows, string self-arm; bench-proven C110 on SANDBOX 1004 (5 rows self-armed, 0 errors); builder question §6 03:54 | in-progress | engine-sheet | [[../plans/2026-09-13-run-cycle-packages-the-world]] Task 4 |
| engine.210 | Sports phase from the feed — LIVE PROD @97. Live C108 = `playoffs` 22/22, correct (last A's C108 row is playoffs; the championship row was typed for C109). Closes on the C109 smoke: `championship` 22/22 | live-observing | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] Task 0 |
| engine.211 | Extreme phase-word gates replaced by record-driven effects (204/205 + 281); census of the 88 remaining sites verified — override-only or season-structure reads, no feed-path numeric gate left | done-pending-archive | engine-sheet | [[../plans/2026-09-11-sports-as-a-lived-system]] §1 F8–F9, [[../research/2026-10-04-agy-engine211-census]] |
| engine.238 | Patrol strategy — chief's `patrol` move → World_Config patrolStrategy LIVE (runner scripts); engine read bench-proven C117. Proof: first live chief patrol move at a close | live-observing | engine-sheet | [[../plans/2026-09-26-future-build-ideas]] §Builder rulings |
| engine.248 | Faith orgs get a sim role — ruled 2026-09-27: trackable membership, slight dial nudge + faith-life events (giving, volunteering), consider a faith chaos car; copy from the sim, not real-world Oakland | ready | engine-sheet (sim judgement — builder included) | [[../research/2026-09-10-kimi-faith-lane-routing]]; gap log C108 G-EC55; `docs/canon/INSTITUTIONS.md` §Canon substitution table |
| engine.252 | Retail-gated initiative domains have no lever (economic, workforce, sports marked not playable after the matched-control pair): design a provable measurable per domain, bring to the builder, flip only on a bench pair | ready | engine-sheet | [[../plans/2026-09-19-civic-wake-game-loop]] §Matched-control measurement; data `output/engine-sheet/2026-09-21-matched-control-c108-c112.json` |
| engine.253 | Transit made true as its own system (builder 2026-09-21, own session): ridership and station load driven by hood canon: businesses in each served hood, where citizens live and work; initiatives are one input, not the frame. Design against SIM_DOCTRINE first; sim calls → builder | ready | engine-sheet | [[../plans/2026-09-19-civic-wake-game-loop]] §Rulings (g); prior work engine.183 [[../plans/2026-09-09-transit-hood-alignment-plan]] |
| engine.257 | Household stress — ruled 2026-09-27: build spending (makes vs spends) so stress comes from real outflows, not a savings-share tweak | ready | engine-sheet (sim call — builder included) | gap log `output/production_log_run_cycle_c108_gaps.md` G-EC72; [[../plans/2026-09-22-initiative-budget-disbursement]] §Data reality, call 8 |
| engine.259 | The fund moves: per-Cycle drain + grants to stressed households, keyed on `disbursement-active` (builder 2026-09-24). LIVE PROD @128 `578c2237`; INIT-001 seeded 23.8M live; first live drain C109. → [[../reference/DEPLOY_HISTORY]] §PROD @128 | live-observing | engine-sheet | `scripts/fundDisbursement.test.js` |
| engine.260 | Civic-initiative employer path — BizID link + tracked-hire slots (builder-ruled 2026-09-25) LIVE PROD @131; C109 is the first live fire that can land a civic hire | live-observing | engine-sheet | [[../plans/2026-09-24-initiatives-in-the-world]] Job 4 |
| engine.256 | Leases one hood-median stamp — ruled 2026-09-27: draw within ±15% of the hood's rent, each renewal closes 25% of the gap to the hood's current rent. kimi WIP in stash@{0} (reroute writes via intents) | ready | engine-sheet (sim calls — builder included) | gap log `output/production_log_run_cycle_c108_gaps.md` G-EC71; [[../plans/2026-09-22-initiative-budget-disbursement]] §Data reality |
| engine.254 | Care and justice — Tasks 1–8 LIVE PROD; Task 10 (dump + five slices) and the hood-spike neighbours built 2026-10-02 (rb). Acceptance = C110 2026-10-04 smoke + the next unattended slice run. Open: scan timing re-measure, Task 9 review | live-observing | engine-sheet · research-build (Task 10 C110 read) | [[../plans/2026-09-21-care-and-justice-system]] §Task 10 handoff + [[../research/2026-09-28-codex-care-justice-intake-plan]] |
| engine.261 | Firm agents — ruled 2026-09-27: test basis, 3 business owners get a wake slice to go to work and run their business | ready | engine-sheet (sim judgement — builder included) | [[../plans/2026-09-26-future-build-ideas]] §Builder rulings |
| engine.264 | The maker's hand — ruled 2026-09-27: an intake tab with dropdowns (seed, type, hood, +/−, level, systems); the sim never sees it, citizens only wonder 'sim or maker' — after engine.94 (builder 2026-09-29) | ready | research-build (sim judgement — builder call) | [[../plans/2026-09-26-future-build-ideas]] §Builder rulings |
| engine.266 | C109 dead paths + Storyline_Tracker retirement — LIVE PROD @122; hold until the C110 smoke 2026-10-04 confirms live, then flip to done-pending-archive | live-observing | engine-sheet | `output/production_log_run_cycle_c109_gaps.md` G-EC59–61, 66, 71; ruling: `docs/plans/2026-09-28-storyline-tracker-retirement-ruling.md` |
| engine.268 | Storyline tabs deleted (LIVE `13e6502f`); the null scorer plumbing cut 2026-10-04, unit-proven, PROD with the next push | done-pending-archive | engine-sheet | [[../plans/2026-09-28-storyline-tracker-retirement-ruling]] §Status log |
| engine.270 | Storylines keyed to engine events — BUILT and running; review the week of 2026-10-05. Builder 2026-10-02: rewire the seed scorer to the registry if the reporter needs it, else remove the dead path — two prerequisites in the plan, decided at the review | needs-info | engine-sheet — gated on the review | [[../plans/2026-09-28-storylines-keyed-to-engine-events]] §Observation and review |
| engine.271 | City revenue — fines and tickets as % of salary with caps, court money from hood charges, yearly property tax scaled by hood (thin hoods pooled), business tax 1%, hooks for the desks — LIVE PROD `a6e36842` 2026-10-02; first fire C110, tax day C120 | live-observing | engine-sheet | [[../plans/2026-09-21-care-and-justice-system]] §engine.271 read-before and design |
| engine.272 | Conduct crime gate can't fire (§15). Integrity wear LIVE PROD @134, ON since 2026-10-01 (standing hardship, rate 1, floor 10); first step C110 2026-10-04, first crime-reachable citizen ~C139. Blocks R5 investigations (engine.254) until then | live-observing | engine-sheet | [[../plans/2026-09-21-care-and-justice-system]] §engine.272 cut |
| engine.273 | Sim holiday calendar — cycles not months, world-born names only. Waves 1–4 and Second Dawn (position 27) LIVE PROD `bce69997`; first live Second Dawn C131. Open: two more world-born weeks wait on the builder's names — detail in plan | needs-info | engine-sheet | [[../plans/2026-09-29-sim-holiday-calendar]] |
| engine.274 | Career walk stopped at row 386 of 963 every Cycle (10-event cap broke the loop). Full pass, cap on events only, rotated start — LIVE PROD @134 2026-10-01; smoke at C110 2026-10-04 (POP-00801 pay hit, lines past row 386) | live-observing | engine-sheet | [[../plans/2026-09-21-care-and-justice-system]] §engine.274 cut |
| engine.275 | A Cycle cannot fire twice: one lock for every caller, admission from the script's own fire record, `expect` on the web trigger — LIVE PROD @135 2026-10-01. First live fire under it is C110 2026-10-04 (bootstrap); a second click that day must be refused | live-observing | engine-sheet | [[../plans/2026-09-21-care-and-justice-system]] §engine.275 cut |
| engine.276 | Debt follows net worth vs one year of hood median income: a rate each way, drag capped, job loss/promotion move a level, default at the top under the line — LIVE PROD `5a65a82a` 2026-10-02; first fire C110 2026-10-04. Build calls and dials confirmed by the builder 2026-10-02 | live-observing | engine-sheet | [[../plans/2026-09-21-care-and-justice-system]] §engine.276 cut |
| engine.277 | Ambient lines — builder 2026-10-02 "reads the tribune no, job and faith yes", corrected 2026-10-03: job and faith lines move dials, Tribune left as wired. A build on a backwards reading went live as `46832db3` and was reverted 2026-10-03 before any live fire; net no change | done-pending-archive | engine-sheet | [[../plans/2026-09-21-care-and-justice-system]] §engine.272 run-forward notes |
| engine.278 | The mint lands a citizen where the job fits: the mapping's named organisation, else a business in the role's field (hood first), `SELF_EMPLOYED` / `UNTRACKED` otherwise; four-bucket draw removed — LIVE PROD `dc118fb4` 2026-10-02; first fire C110 2026-10-04 | live-observing | engine-sheet | [[../plans/2026-07-27-employment-living-system]] §Task 9 engine.278 cut |
| engine.279 | The mint pass logs once and reads Generic_Citizens once — LIVE PROD `1c391906` 2026-10-02; bench C110 on the 124-row queue 226 → 168 s, output identical. Smoke at C110 2026-10-04: `Phase5-Advancement` ms | live-observing | engine-sheet | [[../plans/2026-09-13-run-cycle-packages-the-world]] §Status log 279 |

### canon.* — World-fidelity layer

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|

### civic.* — City-hall, voice agents, council

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| civic.24 | Sunday nine-seat table — grok Tasks 1-9 closed (`b75bb28c` dry C104). Open: Task 10 sheet tab (engine-sheet). Crontab still `--apply` | in-progress | engine-sheet | [[../plans/2026-08-16-city-hall-nine-seat-table]] |
| engine.108 | Media promotion path — Tier-5 read restored as a bounded fallback (LANDED `e371d815` 2026-08-16; row was stale); never converted a GC yet (max EmergenceCount 2, bar 3, 2026-09-02); quoted citizens now credited at the canon door (S412) | in-progress | engine-sheet | [[../plans/2026-08-16-new-life-intake]] §2-3.1 |
| civic.33 | Recall/challenger fall-rate — acceptance by observation: challenger tiers 2/3 unit-proven only; watch seat turnover at the 20-approval floor with city-hall + media both running | needs-info | engine-sheet | [[../plans/2026-08-29-employment-system-cascade]] §civic.33 — status |
| civic.43 | Oakland Unified school board — T1 approval + T3 board votes education (845b85cc, 9ee6e057 + fold) bench-proven C111 on SANDBOX 1004. Open: T2 seat the seven (rb, after the C110 smoke; shortlist in plan), T4 desk lines. Hospital board: no. | in-progress | engine-sheet / research-build | [[../plans/2026-10-04-school-board]] |

### infrastructure.* — Supermemory, services, ingest

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| infrastructure.3 | Reviewer lanes → Claude Managed Agents (Dreaming pilot, Anthropic preview-access gated) — parked 2026-09-29: preview-access gated, 174 days quiet; revisit when Anthropic opens access | parked | research-build | [[../ACTION_MANAGED_AGENTS]] |
| infrastructure.6 | Sim-health observability + ghost-tab integrity — `/api/sim-health` off engineAuditor JSON + dashboard panel; disposition 11 ghost tab refs + tab-reference integrity test | ready | engine-sheet | [[../plans/2026-07-31-engine-observability-integrity]] |
| infrastructure.8 | Hidden-tab audit + disposition (kimi) — 16 hidden tabs classified vs live code (3 load-bearing, 6 dead); Task 1 doc truth pass, Task 2 builder keep/delete rulings, Task 3 backup-then-delete. **Builder 2026-09-14: low priority — pick up only once the engine runs clean.** | parked | engine-sheet | [[../plans/2026-09-09-hidden-tab-audit]] |
| infrastructure.9 | Daytime autonomy — builder 2026-10-01: run the overnight loop every session so rb works the ROLLOUT list without the builder; Discord as the reach-out channel. Design after a week of clean nights | parked | research-build | [[../reference/overnight_autonomy_session]] |

### research.* — Papers, external tools, evaluations

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|
| research.2 | Memento CBR case-bank (Phase 1 ready; Phase 2 blocked on ≥500 tuples + droplet headroom) — parked 2026-09-29: Phase 2 needs 500+ tuples and droplet headroom, 159 days quiet; revisit on that data | parked | research-build | [[../plans/2026-04-21-memento-cbr-case-bank]] |
| research.4 | Desk agents migration off Claude → DeepSeek (research/watch — cost/limits trigger) — parked 2026-09-29: cost/limits trigger only, 153 days quiet; revisit if a desk budget or rate limit bites | parked | research-build | [[../MIGRATION_OFF_CLAUDE]] |
| research.9 | Inter-agent conversation harness — blocker (Phase 40.2 cattle refactor / engine.1) just wontfixed, will never clear as stated; needs re-scoping — parked 2026-09-29: blocker wontfixed; revisit if agent-to-agent conversation is scoped again | parked | research-build | [[../plans/2026-05-31-autonomy-roadmap]] + [[../RESEARCH]] |
| research.12 | Autonomy roadmap | in-progress | research-build | [[../plans/2026-05-31-autonomy-roadmap]] — detail in pointer (relocated 2026-07-02) |
| research.19 | Citizen perception & immersion access layer — parked: two open design questions, no build in flight (es confirmed 2026-09-29); revisit when a citizen-facing surface is next scoped | parked | research-build | [[../plans/2026-06-23-citizen-perception-immersion-layer]] |
| engine.38 | Living City full-population coverage — parked: plan's 8 tasks never started (last touched 2026-08-13), es holds nothing; revisit when the citizen-loop or archive work reaches the unmapped tail | parked | research-build | [[../plans/2026-06-19-living-city-full-population-coverage]] + [[../plans/2026-06-30-central-generator-atmospheric-expansion]] + [[../plans/2026-07-01-persistence-seams-content-ledger]] |
| research.21 | Citizen-signal story emergence — parked: detector build tasks never started (last touched 2026-07-28), es holds nothing; revisit with engine.270's storyline review | parked | research-build | [[../plans/2026-06-26-citizen-signal-story-emergence]] + [[../plans/2026-06-29-citizen-signal-detector-build]] |
| engine.116 | Spreadsheet weight — T1 + T2-data SHIPPED, T4 Chicago retirement CLOSED S501; open: T2 code half, T3 archives out, T5 dead-tab pruning | in-progress | engine-sheet | [[../plans/2026-08-17-sheet-weight-reduction]] |
| canon.5 | OUSD + Peralta CCD ruled contaminants (S368 Mike-direct); Oakland City Schools + Oakland CCD minted, repo text swapped. OPEN sheet renames: BIZ-00016, Peralta row, INIT-007 Notes; then Employer-column sweep | ready | engine-sheet | [[canon/INSTITUTIONS]] §Education |
| research.27 | UNDOCKED/SpaceMolt — fixes 7b403b5c/8a96d677 proved on 09-30 flight; acceptance = Sat 10-03 10:15 weekly write + Citizen_Media_Usage credit | live-observing | research-build | [[../plans/2026-08-07-spacemolt-game-show]] §Post-ship (e) |
| research.28 | Model-fit test, open-character tier reported; Mags narration on Sonnet 5.5 since 2026-10-01 (builder-confirmed); proof = Sat 10-03 16:00 `cycle_pulse_c109.md` 900–1200 words, no truncation | live-observing | research-build | [[../research/2026-10-01-model-fit-open-character-results]] |
| pipeline.60 | Nia Rook newsroom dispatch — BUILT S379 (undocked desk quota, feed-built lane via buildNiaSlice, recap ledger, NIAROOK-UNDOCKED-1 package, roster row + beat rule); acceptance = next unattended 06:15 wake chain | live-observing | engine-sheet | [[../plans/2026-08-07-spacemolt-game-show]] §2.5 |

### governance.* — Skills, MDs, ADRs, project hygiene

| # | Item | State | Terminal | Pointer |
|---|------|-------|----------|---------|

---

## Watch List

Tracking for future adoption. Not building.

| Feature | Trigger to Act |
|---------|---------------|
| **Unidentified EmployerBizId re-linker** — 6 of engine.191's 12 school-district rows moved to other employers between 2026-09-10 and 09-26 with no `[Career-*]` LifeHistory line (POP-00040/217/239/267/539/743); a writer not on SHEETS_MANIFEST §9 or an off-ledger hand fix | Any further EmployerBizId change on live with no Career line — then trace the writer |
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
