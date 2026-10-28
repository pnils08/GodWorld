# Engine Review — Cycle 113

**Cycle:** 113 | **In-world:** Y3C9
**Auditor version:** 1.0.0
**Fire:** PROD @164 stage 28 (`5ed4ceba`; stage 27 `3e04d8a5`+`1e6beff5` and stage 28 both first live here), fired by the builder 2026-10-25 ~23:03 CDT, 132 phases, 205.9 s (C112: 131 phases, 249.7 s), 0 failed phases, 45,068 rng draws, 0 engine errors (Engine_Errors 4 rows = unchanged since C109), 0 warnings (C112 had 3 `priorityEngine clamp`) (`output/execution_log_c113.txt`)
**Source files:**
- `output/engine_audit_c113.json` — 19 patterns (8 math-imbalance, 1 cascade-failure, 1 coverage-gap, 1 production-imbalance, 8 improvements)
- `output/engine_anomalies_c113.json` — 2 anomalies
- `output/baseline_briefs_c113.json` — 80 briefs

Pre-fire hand-write diff (run-cycle Step 2.5): Neighborhood_Map / Crime_Metrics / Civic_Office_Ledger 0 cells since the C112 close; Initiative_Tracker 31 cells moved by the C112 civic apply — world event, not rebased. One sheet write by this seat before the fire: `Oakland_Sports_Feed` E251/E252 NamesUsed, a missing comma between "Austin Reaves (SG)" and "Harry Hayward (PF)" (input hygiene on the builder's own feed rows, not engine state; pre-flight re-read READY). Nothing to strike from briefs or anomalies.

## First live fire of stages 27 + 28 — readback against the DEPLOY_HISTORY watch lists

| Row | Expectation | Live C113 | Verdict |
|---|---|---|---|
| **engine.318** (stage 28) | no Engine_Errors from `Phase11-MediaIntake`; `Citizen_Usage_Intake` 0 pending by name, 912 rows unchanged; no new `media-room` usage row | Engine_Errors 4 = unchanged; intake 912 rows, 0 pending by Status; `Citizen_Media_Usage` 1,064 rows, 0 `media-room` rows; `populateMediaIntake_ v2.3: Populated 3 media mentions` | **as expected** |
| **engine.312** (stage 27) — fame from the paper | no Engine_Errors from `Phase7-FameFlush`; the 71 pending C112 usage rows marked Processed; `Source` header present; FameScore moves only on rows credited / sighted / decayed / floored | `flushCulturalFame_: touched 37, written 31, pending 0, paperCredited 10, paperNoRow 25, failed []`; C112 rows 71/71 Processed=Y Routed=Y; `Source` at col Q; 31 of 50 Cultural_Ledger rows moved vs the C112 beat dump — 25 decays of exactly −1, Jade Orion 104 → **100** (ceiling), credits Eric Taveras 26 → 31, Darrin Davis 15 → 20, Mark Aitken 25 → 30 (+5 = graded positive coverage), Vinnie Keane 31 → 34, Tara Ellison 68 → 69 and Claire Ashford 15 → 16 (+1); the 19 untouched rows hold (incl. legacy 153 / 116 above the ceiling — the clamp applies on write, not on rest) | **as expected** — the paper is the fame engine now; the re-base is the remaining step (dry run re-run on C113 below, apply = separate builder go) |
| **engine.301 F1** (stage 27) — crime carry | ring row carries `crimeWaveHoods`; crime-carry lines fall only in hoods at level ≥ 1 | `S.previousCycleState` persists as the `PREV_CYCLE_STATE_JSON` carry-forward blob (`loadPreviousEvening.js:276`), not a sheet column — not readable from this seat; 0 Engine_Errors from Phase 2; no organic wave expected (bench soak: 52 rises, 0 waves in 25 Cycles) | **no error, blob unread** — the live readback of `crimeWaveHoods` needs a Phase-2 log line or a blob dump; filed in the gap log as a watch, not a defect |
| engine.201 | resnap the 48-citizen cohort after C113 | `cohort-snapshot.js --resnap` → `cohort-c113.json`, n 48, missing 0 (run after Step 5 wrote the summary, so it read 113) | done; the C113 trace is codex's read |
| engine.286 / 302 | life-event dice; five marital statuses live | scoreboard below; see §Citizen Scoreboard on the 39 "newly married" | as expected |
| sports — Oaks C113 (3 games) | record-driven pricing on a 3-0 week | `sportsWeek Oaks: g 3 h 1 w 3 l 0 … signed 0.08`; `applyGameNightMoments_: 19 named, 10 staff, 4 fan line(s); weeks {"Oaks":"WIN"}`; `applyGameNightMoments_: unresolved feed names, cycle 113: Harry Hayward` — then the hiring engine minted him: **POP-01223 Harry Hayward, Oakland Oaks – Power Forward, KONO** and **POP-01224 Trevor Henderson, Oaks – Center, Lake Merritt** | as expected — the pre-flight "cannot interview Harry Hayward" warning resolved itself inside the fire; he is a citizen from C113 |

## C113 re-reads — first live fire of stages 5–25, and the C112-era rows dated to C113 (read 2026-10-27, engine-sheet)

Read two days after the fire; the Sunday review above covered stages 27 + 28 only. Sources: **dump** = the C113 beat dump (`output/beats/`, generated 2026-10-26 00:31 CDT — before the engine.312 re-base apply at 13:58 that day, so fire state); **log** = `output/execution_log_c113.txt` line; **live** = live sheet read 2026-10-27 (after the re-base apply's 413 Sentiment + 48 FameScore cells and the POP-01223/01224 ClockMode / employer correction — fame and those two rows are not fire state there); **ring** = the `Carry_Forward_Store` row stamped C113. Watch scripts are the ones each stage's DEPLOY_HISTORY entry names (`output/engine-sheet/`).

**Close (done-pending-archive):**

| Row (stage) | C113 | Source |
|---|---|---|
| engine.297 + 313/314/315 (22–25) fame sightings | `e297-check 113 live --base …-live-cultural-c112.json` **PASS**: 50→50 rows, 3 sighted (2 ledger buckets), 0 minted, no authored category rewritten, no positional calendar write, no POPID on two personal rows. Its "FameScore 39→0 / 15→0 — a dim or decay rode the window" notes on Marisol Rivera and Claire Ashford are the 10-26 re-base apply, not the fire (fire readback above: Ashford 15→16) | live |
| engine.307 (20) sports orgs hire staff, never athletes | `e307-check 113 live live` **PASS**: 0 onto / 0 off the 8 sports orgs, 0 athlete career or income moves, 0 sports hires (expected few or none); 8 intake mints. The first run printed FAIL: it counted the two Oaks rookies' intake "Added to Simulation_Ledger" rows as sports career lines — that placement is the intake mint's (engine.319's case, live since). Check fixed: a citizen absent from the pre-fire snap is a mint, listed apart | live; pre-fire snap 2026-10-22 |
| engine.306 (18) the 103 business rows | `e306-livewatch diff 113` **ACCEPT-CANDIDATE**: 283 rows read, 0 added / removed, high water 289; 0 citizens moved by the new rows (1 employer move, POP-00183 BIZ-00028 → BIZ-00094, neither new); the 103 drift revenue / growth like every row; 33 spot lines, each on the citizen's own spot. The first run's HOLD was one "stray": Daire Green (POP-00442, Retired) — the check skipped Retired citizens, the generator keeps them (`generateCitizensEvents.js:2602`); his own spot is Fruitvale Diner. Check fixed to the generator's pool | live; pre-fire snap 2026-10-21 |
| engine.214 Cut B (15) hood reactions | the three old trajectory lines: 21 at C112 → **0**; 36 reaction lines in 8 hoods; 25 of 36 run with the hood's trend (69% — the mechanism's 2:1; bench 62%); growth hoods carry grumbling (Uptown 3, Fruitvale 3, Downtown 1, West Oakland 1); the 3 decay-hood lines are all defend / humble, and 7 of 9 decay hoods drew none (small sample). KONO's brag: KONO was rising at C112 (`world_summary_c112.md:76`), steady on the C113 map | dump; live map |
| engine.214 Cut C rate (16/17) spot lines | 33 lift lines against the watch's "low teens (bench 8–15)". The lift is on every food spot in a hood carrying the game-week bar term — the venue hoods plus hoods at or above the nightlife median (`sportsWeekRecord.js:349-360`, `applyBusinessDynamics.js:721`), so Fruitvale (8) qualifies by nightlife. C113 lifted 8 hoods; 447 citizens hold a food spot there (432 Active + 15 Retired, production `bizSectorClass_` over the pre-fire spot set — corrected from 371 after codex's spot check); 33 drawn = 7.4%, under the weight-11 line's calibrated target of about 1 in 10 against the bench pool (`generateCitizensEvents.js:246-267`). The bench band was a one-win, narrower week | dump; pre-fire snap |
| engine.305 (14) hood pulse follows the line's sign | 0 errors; LifeHistory unchanged in kind (2,396 lines; C112 2,344). The −0.01…−0.07 per hood is not separable on live without a counterfactual; bench-proven (stage 14) | log, dump |
| engine.304 (13) family lottery | `familyLinks 6` (bench 6.8 a Cycle), `familyLinksReleased 0`; 6 arrivals named, in the background (4 spouses, 2 children — log 186–191); 0 `family-own-words` rows (no linked wake has spoken) | log 192, dump |
| engine.302 (9) bonds | 23 new bonds (soak band ~25), 645 total; 0 weddings, 0 divorces; 0 deaths, so no widowing to test; MaritalStatus off-enum 0; 205.9 s (band 154–240). Wedding rate stays the builder's dial (§Citizen Scoreboard) | log 156–181, live audit |
| engine.291 / 294 (4g) | 0 raw-token LifeHistory lines (C112 also 0) | dump |
| engine.293 (4h) arrival pay | one arrival at exactly 60000, named by the log as designed: `no pay rule places "Urban garden worker" (POP-01220) — kept 60000` | log 151 |
| engine.298 census line | summary hospital segment in the care trail's words, no load %: "35 admissions, 71 in care at the close (0 tracked), 71 beds occupied" | `world_summary_c113.md:10,14` |
| engine.194 priced week | `games 0.010` on a 3-win week (C112: +0.004 on one win) | log 41 |
| engine.203d aftermath | `A's title quiet 3 since C110 … = 0.061` — exactly the expectation (0.072 × 0.85); C114 would be 0.052 | log 37 |

**Re-dated (stay live-observing):**

| Row | C113 | Next |
|---|---|---|
| engine.288 / 289 seed gates, CULTURE gates; stage 5 "city steps down while hoods rise" | no seed input at C113, as stage 5 expected: first adoption, no carried blob (no `seedCarriedSeedList_` line in the log); Phase 9 then wrote `PREV_STORY_SEEDS_JSON` (30 seeds) and `PREV_CONTRACT_SEEDS_JSON` (42) stamped C113 (log 255–256, ring). Every seed gate read nothing; city sentiment −0.01 → −0.01 (ring `PREV_CITY_DYN_JSON`). Stage 5's other items hold: EE 4 unchanged, 2,396 LifeHistory lines, 0 raw, 57 advancements processed, 0 errors | C114 Sun 2026-11-01 — first Cycle the gates have input; engine.289's keep / re-tier call goes to the builder on those numbers |
| engine.310 (19) event draw | `e310-c114watch diff 113` **CLEAN**: EA sum 114.29 → 114.12, range 3–8.42, up 10 / down 8; 3 staged events, each counted once | C114: migration drift and trajectory read the C113 map (not automated) |
| engine.208 fandom | 4 fan lines, `fandom seeded 9`, Oaks weight 0.3831 → 0.4061 (weeks 2, fans 4) | C114, the band's second read |
| engine.308 (21) heritage cap + cadence | `e308-check 113 live` **PASS**: column armed, clocks 106 / 109 / 111 / 112, no opening | C121, Dillon's first possible opening |
| engine.287 crime gate | `compactCrimeSpikes_: carrying 2` — Adams Point and Piedmont Ave propertyCrime +5 (ring); no wave at floor 3. Counts on record 2/0/0/1/1/1 → 2 | the builder's window longer than 20 Cycles |
| engine.290 transit | 18 Transit_Metrics rows (`base: ledger`, game-day factors); the four C112 crew POP-01212–01215 Active at BIZ-00014 | open work is the plan's Sequencing 4 (crew ECL rows + governor) and Trevor's slice read — not a fire read |

**engine.301 F1 — gap log G-EC41 resolved:** the `PREV_CYCLE_STATE_JSON` blob is readable from this seat — the `Carry_Forward_Store` ring carries it. C113: `crimeWaveHoods []` (no wave), 2 spikes carried (above).

**engine.206 — the trace the row asked for (stays open on a builder call, no build):** the game-day-crowds seed is a `transit-event` ripple (`updateTransitMetrics.js:657`), routed to civic by design (`buildWorldSummary.js:771`); it reached `lanes.civic[47]` at C113, game-night reached `lanes.sports[8]`. The game-week bar money (`game-week bars 54 at 0.04pp`, log 140) is published as `S.sportsWeekBars` (`applyBusinessDynamics.js:754-767`) and Phase 6 already builds a `SPORTS_WEEK` economic ripple from it (`economicRippleEngine.js:487-507`) — but only for a week whose |signed| ≥ 0.15. The Oaks' weeks so far: C112 0.03 (one win), C113 0.08 (3–0); no week since this line was logged (C111) has reached 0.15. So the business desk saw nothing because of the threshold, not a missing path (first written here as "no ripple"; corrected after codex's spot check `docs/archive/for-claude-review/2026-10-27-codex-c113-reread-spotcheck.md` §4). Whether an ordinary week's bar money should reach the business desk is the builder's call.

**Feed row for the builder:** the first Oaks game of C113 (91–78 at Detroit per its StoryAngle) carries WeekRecord `H:W`; the engine read it as a home game (`sportsWeek Oaks: g 3 h 1`), so Downtown and Jack London got game-day crowds and the venue lift. The other two carry `A:W`.

## The week in one line

The Oaks went 4–0 to open their first season (91–78 at Detroit, 115–93 at New York, 105–62 at Washington) and the engine minted their rookie power forward as a citizen; Mark Aitken, heading into free agency saying he stays in Oakland, bought a home the same week his paper record pushed his fame to 30; Theo Bautista was born in Chinatown; 25 households formed (875 → 900); city sentiment +0.10, hospital 35 admissions / 71 in care; Chinatown is the one hood decaying on all three dials with nothing on the council floor for it.

## Citizen Scoreboard

| Outcome | Citizens | Who |
|---|---|---|
| married | 0 | — |
| born | 1 | Theo Bautista (POP-01216), Chinatown, household HH-0084-359 |
| promoted | 1 | Maren Johns (POP-00470), psychotherapist, Rockridge |
| laid off | 0 | — |
| hired | 1 | Toby Lamont (POP-00183), mutual aid organizer, Fruitvale |
| bought a home | 4 | Mark Aitken (POP-00003), Dalton Rushing (POP-00129), Caroline Cabrera (POP-00847), Farah Vasquez (POP-00927) |
| sold a home | 3 | Ariana Reyes (POP-00133), Linda Chow (POP-00749), Austin Reaves (POP-01027) |
| forced sale | 0 | — |
| heritage step | 3 | Mark Aitken (POP-00003), Dalton Rushing (POP-00129), Elias Varek (POP-00789) |

Real outcomes 13 of 2,489 stamped lines (C112: 6 of 2,335). Since C112: tier up 3 (Elliot Marbury POP-00166, Tara Ellison POP-00546, Ines Sorensen POP-01211 — all journalists, the MEDIA usage ladder) · tier down 0 · newly married 39 · new owners 4 · stopped owning 1 (Ariana Reyes) · died 0 · new citizens 9 (Theo Bautista born; Elijah Campbell, Jerri Brown, Adriana Bello, Clara Dubois, Margot Crenshaw, Astrid Freeman arrivals; Harry Hayward and Trevor Henderson, Oaks roster mints).

**The 39 "newly married" are not a C113 event.** They are the engine.302 live MaritalStatus migration of 2026-10-19 (`2026-10-19-engine302-marital-migrate.js --target live --apply`: 39 partnered → married, 70 blank adult → single, 47 minors → youth — DEPLOY_HISTORY stage @149) landing between the C112 audit (10-18) and this one. No wedding line, correctly: "partnered is not a status" (`runHouseholdEngine.js:536`). The scoreboard's married 0 is the true wedding count. Struck from the week's story; recorded in the gap log.

**The rate moved.** 13 real outcomes against last week's 6: a birth, a promotion as an outcome, a hire as an outcome, four purchases of which two (Aitken, Rushing) are also heritage steps — the home-as-rung path firing in the same week as the money. Still no wedding and no layoff across ~1,050 citizens; two Cycles running on both. The builder's dial, not a defect.

## Ailments

### 1. Chinatown is the only hood falling on all three dials, and nothing is on the floor for it (HIGH)
- **Tech diagnosis:** `detectMathImbalances` on Neighborhood_Map Chinatown: Sentiment −0.050 (now −0.06, 20 of 22, city median 0.03), RetailVitality −2.07 (now 7.78, 9 of 22, median 7.165), HousingPressure +1.0 (now 1.5, 14 of 22, median 0). `matchingActiveInitiatives: []`. A newborn (Theo Bautista) and a low-severity health spike (world-event brief) landed in the same hood.
- **Existing mitigators:** none — `no-mitigator-needs-new-initiative`.
- **Why not:** nothing in motion to address this. Downtown's retail revival and Grand Lake's commercial stabilization sit on neighbouring hoods; Chinatown has no row.
- **Remedy path:** world-side first — `propose-new-initiative` (council:any, a general Chinatown initiative); second, `mayoral-pressure` (the mayor's office naming the gap). No tech-side trigger.
- **Tribune framing:** simulation layer "Felt in Chinatown; candidate voices Jose Colon (POP-00599), Mei Chen (POP-00635)". Cast: Jose Colon, Mei Chen, Timmie Hall (POP-00439). Not a front-page candidate by the auditor's flag; the newborn and the health spike are the human doors.
- **Measure next cycle:** Neighborhood_Map.Chinatown Sentiment (expect ≥ −0.06, sign +), RetailVitality (expect ≥ 7.78), HousingPressure (expect ≤ 1.5); any Initiative_Tracker row naming Chinatown.
- Hooks: `covers Chinatown`, `cites a Chinatown resident`, `quotes Jose Colon (POP-00599)`.

### 2. The post-title unwind, week three — 7 more "decay" patterns on hoods at the top of the city (LOW ×4, MEDIUM ×3)
- **Tech diagnosis:** RetailVitality −1.1 to −2.2 on Downtown (now 11.31, 6 of 22), West Oakland (9.68, 8th), Fruitvale (11.35, 5th), Jack London (13.4, **1st**), Grand Lake (11.57, 4th), Uptown (11.07, 7th), Temescal (5.29, 17th — the one genuinely low hood, with Sentiment −0.06 too); HousingPressure +1.0 on six of them. City median RetailVitality 7.165 (C112: 8.88): the whole table is settling from the C110 title spike, and the top of the table is where the decay reads largest.
- **Existing mitigators:** Downtown, West Oakland, Fruitvale, Jack London read `remedy-working` (Stabilization Fund disbursement-active, Youth Pipeline implementation-active, Downtown Revitalization legislation-filed); Grand Lake, Uptown, Temescal `no-mitigator`.
- **Why working/not:** on the four remedy-working hoods the gap is closing on the auditor's own read — this is the unwind, not a failure. Temescal is the one to watch: 17 of 22 on retail and negative sentiment, no initiative, the health center project is its only civic presence.
- **Remedy path:** none on the top-of-table hoods (monitor); Temescal — `propose-new-initiative` or mayoral pressure.
- **Tribune framing:** the measurement overshoot (below) is the honest line: last week's "expected +0.02" became +2.9 on Downtown and Jack London — the retail engine recovered harder than the remedy model predicted, then gave some back. Not a decline story on Jack London at 1st of 22.
- **Measure next cycle:** city median RetailVitality (7.165 → ?); Temescal Sentiment sign.

### 3. Youth Apprenticeship Pipeline active, two of its three hoods silent (MEDIUM, cascade-failure)
- **Tech diagnosis:** INIT-007 `implementation-active`, AffectedNeighborhoods West Oakland / East Oakland / Fruitvale; `silentNeighborhoods: West Oakland, East Oakland`. Status still `announced`; NextActionCycle 112 passed with the first cohort placement report undelivered (C112 civic: D3's work move on INIT-007 refused as a second consequential move).
- **Existing mitigators:** itself — `effectsFiring: true`, verdict `effects-firing`; gap `remedy-working`.
- **Why:** the program's effects fire; the two hoods just carry no other signal this Cycle. The missed report is the civic story (approval reads silence off the overdue clock — the mayor's office pays).
- **Remedy path:** none (monitor). World-side: the C113 hearing's own agenda.
- **Tribune framing:** "Felt in West Oakland, East Oakland; voices Elias Varek (POP-00789), Carmen Delaine (POP-00011)"; cast + Selena Grant (POP-00591). Hooks: `covers West Oakland`, `covers East Oakland`, `mentions INIT-007`, `cites a West Oakland resident`, `quotes Elias Varek (POP-00789)`.
- **Measure next cycle:** MilestoneNotes carries a C113/C114 line; NextActionCycle restamped > 113.

### 4. Faith produced 5 events, zero Tribune coverage last Cycle (MEDIUM, coverage-gap)
- **Tech diagnosis:** domain faith eventCount 5, priorCycleCoverage 0, `production-without-consumption`, routingHint `roundup-thread-acceptable`. Same pattern as C112.
- **Mitigators / why:** none — editorial, not engine. Elliot Graye's lane.
- **Remedy path:** `editorial-pickup`.
- **Measure next cycle:** faith coverage count > 0 in the C113 paper.

### 5. 20 hoods report migration flow with zero economic events (MEDIUM, production-imbalance)
- **Tech diagnosis:** `migration-without-economic-cause`, migratingCount 20, economicEventsThisCycle 0; `updateNeighborhoodDemographics_: city migration 1348 → table 148`. C112 read 19 hoods.
- **Existing mitigators:** seven initiatives named; four firing (Stabilization Fund, Youth Pipeline, Downtown Revitalization, Grand Lake Commercial), three not (Tenant Defense Fund — operational but not firing; Ivy Hill and Dimond — `announced`, never worked).
- **Why:** gap `remedy-working` on the firing four. The three not-firing rows are the city-hall-behind finding from pre-flight: Vega's two revitalizations have had no work since filing.
- **Remedy path:** none (monitor).
- **Tribune framing:** "Felt in Downtown, Temescal, Laurel; voices Liliana Salazar (POP-01128), Wren Choi (POP-01137)"; + Solveig Anand (POP-01194). Hooks: `covers Downtown`, `covers Temescal`, `cites a Downtown resident`, `quotes Liliana Salazar (POP-01128)`.
- **Measure next cycle:** economic events > 0; INIT-011 / INIT-012 LastWorkCycle stamped.

## Anomalies

**Eastlake migration flow −2 → −5** — `suppress-until-verified`, confidence medium. One prior data point (−2); a band-3 shift on a single Cycle with no economic event behind it. Hold until C114 confirms direction.

**Glenview migration flow −2 → −5** — `suppress-until-verified`, confidence medium. Same shape, same reasoning; note Glenview sentiment *rose* 0.12 the same week (improvement below), so the outflow is not a mood story yet.

Neither routes to engine-debug; no follow-up file.

## Improvements

- **West Oakland Tenant Defense Fund (INIT-010) advanced vote-scheduled → operational.** Council passed it at C112; it is live. (Not yet firing effects — see Ailment 5.)
- **Five hoods' sentiment rose:** Adams Point +0.10 (−0.14 → −0.04), Brooklyn +0.12 (−0.12 → 0), Glenview +0.12 (−0.09 → 0.03), Dimond +0.16 (−0.18 → −0.02), **East Oakland +0.17 (0.03 → 0.20)** — the Darrin Davis / Montez youth-outreach announcement landed in East Oakland this week (feed row 254); the hood's dial moved the same direction.
- **Remedy overshot on RetailVitality ×2** (Downtown, Jack London: expected +0.02, observed +2.9 from the prior math-imbalance / production-imbalance remedies). The auditor files overshoot under improvements: the retail engine recovered well past the model.

## Baseline Briefs (cron input)

- Total: 80 briefs (citizen-life-event 68, world-event 11, initiative-milestone 1)
- With promotion hints: 75
- Cluster note: Rockridge 13, West Oakland 12, Jack London 8, Fruitvale 6, Lake Merritt 6, Laurel 6, Uptown 6, Piedmont Ave 5, Chinatown 4 (incl. the health spike + the birth), Downtown 4. The world-event briefs are the hood health spikes (Chinatown low) and the civic milestone (INIT-010 operational).
- Source: `output/baseline_briefs_c113.json`

## Measurement Check (from previous review)

| Pattern | Affected | Prior remedy | Expected | Observed | Verdict |
|---|---|---|---|---|---|
| math-imbalance | Downtown | none | +0.02 | +0.24 | remedy-overshot |
| math-imbalance | Temescal | — | — | — | — (no prior match) |
| math-imbalance | West Oakland | none | +0.02 | −1.87 | remedy-not-firing |
| math-imbalance | Fruitvale | none | +0.02 | −1.87 | remedy-not-firing |
| math-imbalance | Jack London | none | +0.02 | +0.24 | remedy-overshot |
| math-imbalance | Grand Lake | — | — | — | — (no prior match) |
| math-imbalance | Chinatown | — | — | — | no prior expectation |
| math-imbalance | Uptown | — | — | — | no prior expectation |
| coverage-gap | faith | — | — | — | — (no prior match) |
| cascade-failure | INIT-007 / West Oakland | none | +0.02 | −1.48 | remedy-not-firing |
| production-imbalance | Downtown | none | +0.02 | −1.87 | remedy-not-firing |
| improvement ×8 | — | — | — | — | — (no prior / no expectation) |

No win callout: no pattern flipped from `remedy-not-firing` to `remedy-firing-as-expected`. Every measured prior carries `priorRemedyType: none` — the C112 patterns had no initiative action behind them, so "not firing" measures the unwind, not a failed program.

### Remedy-type track record

| Remedy type | Firing-as-expected | Firing-insufficient | Not-firing | Overshot |
|---|---|---|---|---|
| none | 0 | 0 | 4 | 2 |

## Chain notes (what the crons will and won't get this week)

- **Civis journal: no journal this week.** `civisJournal.js --cycle 113` → `{"skipped":"assertion-failure"}`: Sonnet's entry failed "Oaks/Paulson exceeds one line", the reasoner fallback failed "repeats a sentence from an earlier entry". Stderr does not show `Civis Sonnet failed or returned invalid output`, so per the step table: no re-run. Neither file exists; `deliver-articles` sends nothing for C113. Gap log carries the line.
- Content-ledger drafter: 9 rows written + verified (1 invalid dropped).
- Texture 17/22 hoods with signal (42 seeds); dispositions 4/4 at c113; ledger snapshot + 27 beat tabs at 113 (prev = 112); initiative packets, base_context 113, world_state 40.5 KB `canon current`.
- engine.312 re-base: dry run re-run on C113 (`2026-10-25-e312-rebase.js freeze` + `dry 113`); the apply is a separate builder go.

## Summary

- Ailments: 11 (1 HIGH, 6 MEDIUM, 4 LOW)
- Anomalies: 2 (2 suppress-until-verified)
- Improvements: 8
- Baseline briefs: 80 (75 with promotion hints)
- Measurements: 0 / 6 firing as expected; 4 not firing (all `priorRemedyType: none`), 2 overshot
- First live fire of stages 27 + 28: engine.318 as expected, engine.312 as expected, engine.301 no error (ring blob unread from here — read 2026-10-27 from Carry_Forward_Store: no wave, 2 spikes)
- C113 re-reads (2026-10-27): 13 rows close as expected; seed and CULTURE gates had no input (first input C114); engine.206 traced — the bar money's business-desk ripple waits on a week worth 0.15 (C113 was 0.08); codex spot check 4 CONFIRM / 2 REFUTE, both folded
