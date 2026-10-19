# Engine Review — Cycle 112

**Cycle:** 112 | **In-world:** Y3C8
**Auditor version:** 1.0.0
**Fire:** PROD @147 stage 4p (`8acd5f30`, 14:07 CDT cut; propagation window long closed), menu-fired 2026-10-18 22:16:32 CDT, 131 phases, 249.7 s (bench @54 192 s; budget 360 s — no checkpoint, `_CycleCheckpoint` empty), 0 failed phases, 41,733 rng draws, 0 engine errors (Engine_Errors 4 rows = unchanged), 3 warnings (all `priorityEngine clamp raw=11.70 → 10.00 CIVIC/MED`; C111 had 5) (`output/execution_log_c112.txt`)
**Source files:**
- `output/engine_audit_c112.json` — 14 patterns (8 math-imbalance, 1 cascade, 1 coverage-gap, 1 production-imbalance, 3 improvements)
- `output/engine_anomalies_c112.json` — 0 anomalies
- `output/baseline_briefs_c112.json` — 74 briefs

Pre-fire hand-write diff (run-cycle Step 2.5): 1 cell on Neighborhood_Map since the C111 close — `Temescal.ChildAreas` += North Oakland (engine.290 Sequencing 3, `888c71a6`, builder ruling `c2bf57c1`), rebased into the C111 snapshot `655f96b4` before the fire. Crime_Metrics / Civic_Office_Ledger 0. Initiative_Tracker: 46 cells moved by the C111 civic apply — world event, not rebased. Nothing to strike from briefs or anomalies.

## First live fire of the stack since C111 — readback against the ROLLOUT `live-observing` rows

| Row | Expectation | Live C112 | Verdict |
|---|---|---|---|
| **engine.299** | `deadBranchScan.js --offenders` on live C112: acceptanceEmpty TRUE, 0 inert, ~8 bookkeeping markers, run time well under 360 s | `{"scannedLines":2344,"inert":0,"structural":8,"premise":62,"lifeVerbs":20,"acceptanceEmpty":true}` — **byte-for-byte the bench @54 line count (2,344)**; 249.7 s; the one `Household-GameNight` line present and folded as Household (Task 13 — 4p ran, not 4o); 0 raw `$TOKEN` in 2,344 texts; premise/lifeVerbs are the reported-not-blocking identifier and allowlisted hits (`output/engine299/offenders_c112_live.txt`) | **as expected → engine.299 passes its live readback.** Every event that fired moved a dial |
| engine.299 — texture repeats | ECL hood lines repeat 34–40× a Cycle (pre-existing, in the PIN) | 783 distinct texts over 2,344 lines; 16 texts ≥20×, top 38× ("dodged the running groups circling the lake…") | pre-existing; NEXT(7) `$VENUE`/`$INSTITUTION` is the fix path, not a 4p regression |
| engine.203d | Ripple_Ledger `aftermath: A's title week 2 after C110` = **+0.072** (0.085 × 0.85) | row present: `aftermath: A's title week 2 after C110 … 0.072`; log `A's title quiet 2 since C110 (2-0, share 0.100) = 0.072` | as expected |
| engine.194 | first record-driven pricing on a logged WeekRecord (Oaks open C112) | `sportsWeek Oaks: g 1 h 1 w 1 … exp 0.4 surprise 1 signed 0.03`; games row **+0.004** (0.5 × 0.03 × reach 0.25 ≈ 0.004, inside ±0.10); A's off-season 0 | as expected — the first priced game week |
| engine.208 | first fan week lines on the first logged game week | `applyGameNightMoments_: 11 named, 10 staff, 4 fan line(s); weeks {"Oaks":"WIN"}`; ripple row `reached 21 citizen(s)`; `fandom seeded 12` (C111: 7); 157 `Sports-*` LifeHistory lines; Oaks franchise weight 0.35 → 0.3831, `weeks 1, fans 4` carried | as expected — the fan band opened |
| engine.206 | one game-day-crowds seed per home week | `transit-event game-day-c112:Oaks — Oaks home week, 1 home game; crowds through Jack London, Downtown`; gridlock day traffic 86 on I-880 N | as expected |
| engine.290 | C112 mint read-back: the four BART crew Intake rows land as citizens on BIZ-00014 | POP-01212 Marisol Quintero (Train Conductor), POP-01213 Darnell Oyelaran (Train Operator), POP-01214 Priya Raghunathan (Rail Dispatcher), POP-01215 Tomás Villaseñor (Track Maintenance Technician) — all T4 ENGINE, EmployerBizId BIZ-00014; `ensureEngine290Config_: seeded 16 transit key(s)` | minted. **Finding, not a block:** three crew at $86,086, the track technician at **$214,800** — the engine's own job-rule pay draw (other technician titles in the ledger range $60k–$285k; 103 citizens earn ≥$200k), so it stands as lived; read the rule before the crew ECL rows + governor build (plan §Sequencing 4) |
| engine.292 | POP-00301 slip → void-gate (credits_sign 0 → void) | Casino_Ledger `78fdb90c…`: POP-00301, placed 111 settled 112, `undocked credits_sign c112:POP-00926 neg 519 @1.83 → payout 0, Status void-gate`; `processCasinoLedger_: settled 8 placed 25 carried 21 voided 1` | as expected → **engine.292 done** |
| engine.291 / 294 | UNDOCKED rows name the pilot; no raw `$MOOD` / `$PILOT` printed | 46 `Undocked-Audience` + 4 `Reputation|source:undocked` lines; pilots named in text (Briar Soto, Rosario Medina, Eric Taveras); `loadUndockedFeed_: 8 episode(s) airing c112 — pilots POP-01053, POP-00597, POP-00926`; **0 raw tokens** in any C112 line | as expected → engine.291 + 294 pass live |
| engine.296 | SPORTS_LEGENDS from the ledger's retired MLB-origin rows, no literal | 0 "Former A's Star Rodriguez / Warriors Alumni Thompson / Native MVP Davis" in LifeHistory C112 or WorldEvents C112; evening famous = Tara Ellison, Jade Orion, Vinnie Keane (all ledger) | as expected (the three template Cultural_Ledger rows stay Inactive; Celeste reads Fri 10-23) |
| engine.285 | no `Phase10-Checkpoint` row, `_CycleCheckpoint` empty, cycleCount 112 | all true; LifeHistory trim ran inside `Phase11-MaintainLifeHistoryLog` 45.7 s with 0 errors | as expected |
| engine.286 | life-event dice fire; civic-role / promotion / home lines | `CivicRole-*` 11 (incl. **1 L: POP-00146 Caleb Reyes `CivicRole-Down-L` — "A West Oakland elder stood in front of a full room and read every unanswered letter aloud, with dates"**); `LifeEvent-*` 20; `Promotion` 12; `checkForPromotions_: 6 promoted (6 by migration wave)`; scoreboard: 2 bought, 3 sold, 0 forced, 0 promoted-as-outcome | as expected; the scoreboard's zeros are the read (see §Citizen Scoreboard) |
| engine.293 | no arrival lands at exactly $60,000 unless unmapped | 12 new citizens, none at 60,000; ledger-wide 19 rows at exactly 60,000 (all pre-C112) | as expected |
| engine.197 (HOLD) | 13 spouses' future-stamped lines keep skipping until repaired | `FUTURE-STAMPED 13 lines / 13 watermarks past C112` | as recorded; repair still codex HOLD |
| engine.201 | resnap the 48-citizen cohort after C112 | `cohort-snapshot.js` reads its cycle from the world summary → ran as C111 and overwrote `cohort-c111.json` (restored from git); **resnap after Step 5 writes `world_summary_c112.md`** | pending in this chain |
| engine.298 | world summary hospital segment = Care_Justice_Census city row; feed record states season + tense | read at Step 5 | pending in this chain |
| engine.214 / 287 / 288, chaos-line signing, 22 bespoke up lines, storefront line | **not on PROD** — must not appear | not observed | correct absence |

## The week in one line

The Oaks opened at home and won — AJ Dybantsa's rookie debut, 4 fan lines, 10 staff lines, the first priced game week — while the title glow kept fading on schedule (aftermath +0.072, CitySentiment 0.85 → 0.44 → **0.32**). Council passed the West Oakland Tenant Defense Fund (INIT-010); 15 households moved, 11 of them into West Oakland, Jack London, Fruitvale or Chinatown "for a better fit" or "moving up" — among them **Mike Paulson (POP-00527), Jack London → West Oakland, sold up and bought**. Housing pressure sits at 9/10 in Downtown and Uptown with no detector-matched initiative on Uptown.

## Citizen Scoreboard

| Outcome | Citizens | Who |
|---|---|---|
| married | 0 | — |
| born | 0 | — |
| promoted | 0 | — (`checkForPromotions_` moved 6 by migration wave; none stamped as a Promotion outcome line) |
| laid off | 0 | — |
| hired | 0 | — (12 new citizens minted: 6 generic arrivals, 2 Bay Tribune journalists POP-01210/01211, 4 BART crew POP-01212–01215; the ledger `BUSINESS_EXPANSION_112: Bay Tribune added 2 employees`) |
| bought a home | 2 | Lucia Polito (POP-00004), Miguel Allen (POP-01029) |
| sold a home | 3 | Bonnie Brown (POP-00345), Mike Paulson (POP-00527), Waymen Brown (POP-00672) |
| forced sale | 0 | — |
| heritage step | 1 | Elias Varek (POP-00789) |

Real outcomes 6 of 2,335 stamped lines. Since C111: tier up 0 · tier down 0 · newly married 0 · new owners 2 · stopped owning 0 · died 0 · new citizens 12.

**The zeros are the finding.** Second Cycle running with no wedding, no birth, no layoff, no hire-as-outcome across ~1,030 citizens; the two purchases and three sales are the migration engine's "sold up and bought" moves, not the home die. Rate and severity are the dials (`project_citizens-are-players-rate-and-severity-are-the-dials`) — this is the builder's read, not an engine defect: the dice fired (`Promotion` 12, `LifeEvent` 20, `CivicRole` 11 lines) but none crossed into a scoreboard outcome. Carry to the gap log as the week's judgment entry.

## Ailments

### 1. KONO came down — sentiment, retail and housing pressure all moved the wrong way, no initiative on the hood (HIGH)
- **Tech diagnosis:** `detectMathImbalances` on Neighborhood_Map row 19: Sentiment −0.31 (now −0.01, 11 of 22), RetailVitality −0.60 (now 7.88, 13 of 22, city median 8.88), HousingPressure +0.5 (now 0.5). The trajectory engine reads the same hood as `KONO turning upward: retail busy, events drawing crowds, people moving in` (NEIGHBORHOOD_RISING) — the one-week deltas and the multi-week trajectory disagree, which is what a hood at the middle of every table looks like on an unwind week. Mart Johns (POP-00648) moved in from Adams Point this Cycle.
- **Existing mitigators:** none (`matchingActiveInitiatives: []`).
- **Why working/not:** nothing in motion to address this. Severity HIGH is the detector's three-signal rule, not a crisis: KONO ranks mid-table on all three.
- **Remedy path:** `propose-new-initiative` targeting KONO (council: any). World-side only; `techSide` not triggered.
- **Tribune framing:** simulation — "Felt in KONO; candidate voices include Tatiana Flores (POP-00859), Makayla Wu (POP-00867)"; AJ Dybantsa (POP-01024) is the third resolved resident — the Oaks' rookie lives here the week he debuted. Hooks: `covers KONO`, `cites a KONO resident`, `quotes Tatiana Flores (POP-00859)`.
- **Measure next cycle:** KONO Sentiment / RetailVitality / HousingPressure vs C112 (−0.01 / 7.88 / 0.5); whether the civic chain files anything on the hood.

### 2. The post-title unwind, week two — 7 more "decay" patterns on hoods that are at the top of the city (LOW ×4, MEDIUM ×3)
- **Tech diagnosis:** Downtown, West Oakland, Fruitvale, Jack London (LOW — all four have a mitigator and all four rank **1–5 of 22** on Sentiment: 0.09 / 0.19 / 0.19 / 0.14 against a city median of −0.025); Chinatown, Dimond, Uptown (MEDIUM, no mitigator). Sentiment fell 0.31–0.39 on every one of them — the same across-the-board step the C111 review called: the mood model's 30% carry unwinding the C110 championship band (CitySentiment 0.85 → 0.44 → 0.32).
- **Existing mitigators:** INIT-006 Baylight (Downtown, Jack London — `effects-firing`, `netSwamped: true`), INIT-001 + INIT-007 (West Oakland), INIT-007 (Fruitvale). Chinatown / Dimond / Uptown `no-mitigator`.
- **Why working/not:** `remedy-working` by gap on the four with initiatives — the measurement says otherwise (see §Measurement): INIT-006's EventAttractiveness read **−5.16** against an expected +0.02 on both Downtown and Jack London (`remedy-not-firing`), i.e. the construction-active Baylight lift is swamped by the unwind. **The real signal under the mood noise is still HousingPressure**: Downtown 9 and Uptown 9 (21st and 22nd of 22), Jack London 7.5, Fruitvale 5.5, Grand Lake 5.5 — the +0.5/+1.0 a Cycle climb C110 and C111 both flagged, now at the top of the scale on two hoods. The trajectory engine wrote `HOUSING_PRESSURE_HIGH` on both this Cycle.
- **Remedy path:** Downtown / Jack London: `advance-initiative` INIT-006; West Oakland / Fruitvale: monitor INIT-001 / INIT-007 (INIT-010 Tenant Defense Fund passed this Cycle — West Oakland gains a third mitigator next read). Chinatown / Dimond / Uptown: `propose-new-initiative`. **Uptown at HousingPressure 9 with no initiative is the one to file.**
- **Tribune framing:** the city-desk story is Uptown and Downtown rents, not "decay" — both hoods are at BOOM momentum 10/10 with housing pressure 9/10 ("rents climbing, households stretching to stay"). Dimond is the one hood actually at the bottom (Sentiment −0.18, 22 of 22; `Eastlake cooling off` next door).
- **Measure next cycle:** CitySentiment (0.32 → ?; the pre-title slide was 0.51 → 0.45 → 0.36, so one more step down is the unwind completing, a step up is the floor); HousingPressure Downtown / Uptown (9 → ?); INIT-006 EventAttractiveness sign.

### 3. Youth Apprenticeship Pipeline active, two of its three hoods silent (MEDIUM)
- **Tech diagnosis:** `detectCascadeFailures` — INIT-007 `implementation-active` (advanced from operational this Cycle), AffectedNeighborhoods West Oakland / East Oakland / Fruitvale; West Oakland and East Oakland show no initiative-tagged signal this Cycle. The Ripple_Ledger carries `Oakland Youth Apprenticeship Pipeline is implementation-active — ongoing workforce effects in West Oakland, East Oakland, Fruitvale`, so the effect row landed; the hood-level trace didn't.
- **Existing mitigators:** itself. **Why working/not:** `remedy-working` — first Cycle in phase, no prior to measure. **Remedy path:** monitor. **Tribune framing:** the LifeHistory line "read the flyer for the Oakland Youth Apprenticeship Pipeline and wondered who was actually going to get those…" fired 34× this Cycle — the citizens are asking the same question the detector is. **Measure:** C113 signal on West Oakland / East Oakland.

### 4. Faith produced 5 events, zero Tribune coverage last Cycle (MEDIUM, coverage-gap)
- Telegraph Presbyterian (tutoring expands; choir), Bharat Mandir (food pantry), Or Hashalom (health fair), Cathedral of the Living Word (cleanup; +1 congregant POP-00697). `routingHint: roundup-thread-acceptable` — Elliot Graye's seat. No engine action.

### 5. 19 hoods report migration flow with zero economic events (MEDIUM, production-imbalance)
- `migration-without-economic-cause` — 15 units relocated (`processRelocations_`), 17 `Relocation-*` lines (Drive-Up-M on the "sold up and bought" moves, Composure-Up-M on "better fit"), while the economic ripple engine wrote 5 ripples (4 carryovers + Bay Tribune's 2 hires). Measurement reads `remedy-overshot` on RetailVitality (+2.9 vs +0.02 expected) — the retail swing is the mood unwind, not a remedy. The moves are the engine.299 Task 7 "household-income fit" phrasing live for the first time (`Juliet Choi moved from Downtown to East Oakland — household income fit favored East Oakland over Downtown`). Mechanism, not ailment; monitor.

## Anomalies

No anomalies flagged this cycle.

## Improvements

**IMPROVEMENT** — INIT-007 Oakland Youth Apprenticeship Pipeline advanced operational → implementation-active (West Oakland / East Oakland / Fruitvale; voices Rick Walker POP-00198, Carmen Solis POP-00953).
**IMPROVEMENT** — INIT-009 Commercial Stabilization for Grand Lake advanced announced → legislation-filed (voices Sarah Huang POP-01049, Amara Keane POP-00002).
**IMPROVEMENT** — INIT-010 West Oakland Tenant Defense Fund advanced announced → vote-scheduled and **passed** (council-vote brief, OPP lead; voices Robert Jaston POP-00758, Sage Vienta POP-00771). Its initiative row already carries effects `unemployment −0.03 / retail +0.1 / sentiment +0.06`.

Approval moved with them: Santana 69 → 72, Carter (D1) 62 → 65, Tran (D2) 67 → 69, Delgado (D3) 62 → 64, Rivers (D5) 62 → 64, Chen (D8) 64 → 65 on "advanced (+2)"; Vega (D4) 60 → 59 on the Ivy Hill initiative sitting.

## Baseline Briefs (cron input)

- Total: 74 briefs (59 citizen-life-event, 11 world-event, 3 initiative-milestone, 1 council-vote)
- With promotion hints: 71
- Cluster note: West Oakland 14, Rockridge 9, Fruitvale 8, Downtown 6, Uptown 6 — the moves and the Tenant Defense Fund vote stack on West Oakland. World events: Baylight civic spike (HIGH), Grand Lake public-works spike, Fruitvale tailgate grill fire (Oaks opener), Uptown staff walkout, Port of Oakland berth delay over, five faith events.
- Source: `output/baseline_briefs_c112.json`

## Measurement Check (from previous review)

| Pattern | Affected | Prior remedy | Expected | Observed | Verdict |
|---|---|---|---|---|---|
| math-imbalance | Downtown (INIT-006) | none | EventAttractiveness +0.02 | −5.16 | remedy-not-firing |
| math-imbalance | Jack London (INIT-006) | none | EventAttractiveness +0.02 | −5.16 | remedy-not-firing |
| math-imbalance | West Oakland (INIT-001/007) | none | RetailVitality +0.02 | +2.90 | remedy-overshot |
| production-imbalance | 19 hoods | none | RetailVitality +0.02 | +2.90 | remedy-overshot |
| math-imbalance | Fruitvale | — | — | — | — (no-prior-match) |
| math-imbalance | Chinatown / KONO / Uptown | — | — | — | no prior expectation |
| math-imbalance | Dimond | — | — | — | — (no-prior-match) |
| coverage-gap / cascade-failure / improvements ×3 | — | — | — | — | — (no-prior-match) |

No win callout: nothing flipped from `remedy-not-firing` to `remedy-firing-as-expected`. The two "overshot" verdicts are the unwind's retail swing, not a remedy.

### Remedy-type track record

| Remedy type | Firing-as-expected | Firing-insufficient | Not-firing | Overshot |
|---|---|---|---|---|
| none (no prior remedy) | 0 | 0 | 2 | 2 |

## Summary

- Ailments: 11 (1 high, 6 medium, 4 low) — 8 of them the one post-title unwind; KONO is the only HIGH and is mid-table on every measure; Uptown at HousingPressure 9 with no initiative is the one worth filing
- Anomalies: 0
- Improvements: 3 (INIT-007 / 009 / 010 advanced; INIT-010 passed)
- Baseline briefs: 74 (71 with promotion hints)
- Measurements: 0 / 4 firing as expected; 2 not firing (INIT-006 swamped), 2 overshot (the unwind)
- Live readback: engine.299 passes (0 inert, acceptanceEmpty true, 2,344 lines = bench); 203d / 194 / 208 / 206 / 290 mint / 292 / 291 / 294 / 296 / 285 / 286 / 293 all as expected; engine.292 done; one pay outlier on the BART crew to read; engine.201 resnap and engine.298 pending Step 5
