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
- First live fire of stages 27 + 28: engine.318 as expected, engine.312 as expected, engine.301 no error (ring blob unread from here)
