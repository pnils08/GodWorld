# Engine Review — Cycle 111

**Cycle:** 111 | **In-world:** Y3C7
**Auditor version:** 1.0.0
**Fire:** PROD `ae9278aa` stage 3 (over `63754ca8` + `c49074fc`), menu-fired 2026-10-11 ~16:18 CDT, 131 phases, 148.3 s (bench 241.6 s; budget 330 s — no checkpoint, `_CycleCheckpoint` empty), 0 failed phases, 41,513 rng draws, 0 engine errors (Engine_Errors 5 rows = unchanged), 5 warnings (all `priorityEngine clamp raw=11.70 → 10.00 CIVIC/MED`) (`output/execution_log_c111.txt`)
**Source files:**
- `output/engine_audit_c111.json` — 24 patterns (23 ailments by type, 1 improvement; 18 of the 23 are one cause — see §The week)
- `output/engine_anomalies_c111.json` — 4 anomalies
- `output/baseline_briefs_c111.json` — 73 briefs

Pre-fire hand-write diff (run-cycle Step 2.5): 0 cells changed on Neighborhood_Map / Crime_Metrics / Civic_Office_Ledger since the C110 close. Initiative_Tracker: 24 cells moved by the C110 civic apply — world event, not rebased. Nothing to strike from briefs or anomalies.

First live fire for stage 3 + engine.286 + engine.95 — read against DEPLOY_HISTORY §PROD ae9278aa / §63754ca8 / §c49074fc:

| Expectation | Live C111 | Verdict |
|---|---|---|
| Ripple_Ledger one sports row `aftermath: A's title week 1 after C110` **+0.085** (no games logged) | row present, 0.085; log `A's title quiet 1 since C110 (2-0, share 0.100) = 0.085`, Oaks upset quiet 1 = 0.000 | as expected |
| World_Config self-arms `bizSettleRate` 0.05, `bizSettleMinStaff` 1000 after row 222 | rows 225 / 226, 0.05 / 1000; grid 222 → 236 used (franchiseWeight* rows 227–231 also self-armed) | as expected |
| nine institutions' Growth_Rate move ~5% of the gap toward the class norm | 7 down, 1 flat, 1 up: OUSD 8.89→7.89, Kaiser 10.17→9.46, Hospital 9.09→7.86, EBMUD 11.72→11.54, Peralta 8.94→7.82, PG&E 10.10→8.87, Port 12.69→9.38; **AC Transit 12.00 flat; City of Oakland 10.93→10.94.** Settle alone is −0.30…−0.53 per row (0.05 × gap to norm 2–3); the rest of each drop is the ordinary weekly drift on a retail-unwind week (cap ±1) plus, on the Port, the chaos ship `berth_delay` at full port strength. The two that did not fall are unexplained — a −0.5 settle on AC Transit must have been offset by exactly +0.5 of drift, or the row did not take it. Per-row `parts.settle` is not logged | settle present and in direction on 7; **magnitude unverified, 2 rows unexplained — G-EC50 widened, read at C112** 
| feed gate reads the real cycle (was 0 on every earlier live fire) | `loadUndockedFeed_: 7 episode(s) airing c111`; aftermath keyed `since C110` | as expected |
| engine.286: ~15–25 `CivicRole-*` rows, ~20 `LifeEvent-Promotion-*`, ~15 `LifeEvent-Home-*` S lines, 0 `Phase5-PromotionDie` / `Phase5-HomeDie` errors | LifeHistory_Log C111: CivicRole Up-S 6 / Down-S 4 / Up-M 6 / Down-M 1 / **Up-L 2** (19 rows, 19 distinct sentences — deduped, 0 repeats); Promotion Up 17 / Down 7 (24); 17 ledger cells carry `LifeEvent-Home`; 0 errors | as expected; two L lines on the first fire are the first large civic-role moves — read them before C112 |
| engine.95: no `Phase10-Checkpoint` row, `_CycleCheckpoint` empty, no trigger, cycleCount 111 | all true; commit boundary well inside 264 s | as expected |
| engine.282: a debt default writes NetWorth 0 on a blank cell; POP-00963 / -00971 fill by accrual | POP-00963 NetWorth 20, POP-00971 17 — non-blank | as expected → **engine.282 done** |
| engine.283: every discharge writes Status `Active`, clears HealthCause | 0 non-standard Status values on 1,025 rows | as expected → **engine.283 done** |
| engine.209: first `PREV_FRANCHISE_WEIGHT_JSON` carry | `Saved franchise weights {"A's":{"w":1,"weeks":0,"fans":0},"Oaks":{"w":0.35,…}} for cycle 111` | as expected |
| engine.208: fan week lines and the band spread | game-night ripple: 9 citizens reached, 9 named, **0 staff week lines, 0 fan week lines**; `fandom seeded 7 (0 as household fans)` | off-season week with no games — fan lines wait for the first logged game week (Oaks start C112). Not a fault |
| engine.206: one game-day-crowds seed per home week | no home week logged; `game-week bars 0 at 0pp` | n/a this Cycle |
| engine.94 B.3 v3 (§PROD e87362b4): 131 phases, bonds certify, nothing names/fills/seats at approval 61–69 | 131 phases; `Loaded 615 active bonds`, no LoadBonds error; 10 elected seats held, approvals 60–69, 0 `[CAMPAIGN` notes, 0 vacant, 0 CIVIC_* hooks | as expected |
| engine.201 fixed cohort: resnap after C111 | `cohort-snapshot.js --resnap` → `output/engine201/cohort-c111.json`, 48/48, 0 missing | done |

## The week in one line

The parade is over. CitySentiment 0.85 → 0.44: the C110 figure was the championship band (6) + First Friday on every hood; C111 is Valentine (minor), off-season shade, no First Friday, and the hood mood model's 30% carry (`applyCityDynamics` Pass B) lets the spike unwind — every one of the 22 hoods fell 0.14–0.28 with the +0.085 title aftermath, +0.116 initiative lift and +0.034 media already in. The mechanism is the mood model as built; whether a −0.41 one-week unwind after a championship is the right rate is the builder's read (SIM_DOCTRINE §15: start → peak → end → aftermath — this is the end step). City still sits above its pre-title slide (C107–C109: 0.51 → 0.45 → 0.36).

## Ailments

### 1. Every hood came down from the title week — 18 "decay" patterns, one cause
- **Tech diagnosis:** `detectMathImbalances` × 18 (Downtown, Laurel, West Oakland, Fruitvale, Jack London, Rockridge, Adams Point, Grand Lake, Piedmont Ave, Chinatown, Eastlake, Glenview, Ivy Hill, San Antonio, KONO, Lake Merritt, Uptown, East Oakland): Sentiment −0.14…−0.28, RetailVitality −0.75…−2.88 on most, HousingPressure +0.5/+1.0 on Downtown, West Oakland, Fruitvale, Jack London, Grand Lake, Uptown. Four hoods below the detector's threshold (Temescal, Brooklyn, Dimond, Baylight) fell the same way.
- **Existing mitigators:** per-hood initiatives where they exist (Fruitvale `mitigator-firing-but-insufficient`; Downtown / West Oakland / Jack London `remedy-working` by delta); 13 hoods `no-mitigator`.
- **Why working/not:** not an ailment. The C110 base was a one-week spike; the mood model carried 30% of it. Retail fell with nightlife/retail multipliers returning to the Valentine baseline. **The real signal under it is HousingPressure**: Downtown 7 → 8, Uptown 7 → 8 (22 of 22), Jack London 5.5 → 6.5, Grand Lake 5 → 6, Fruitvale 3.5 → 4.5 — the +1.0/Cycle climb that C110 flagged as having no detector keeps going under the mood noise.
- **Remedy path:** none for the sentiment; for housing, world-side `propose-new-initiative` — INIT-010 West Oakland Tenant Defense Fund (D1, Proposed, `NextActionCycle` 110 past due) and INIT-009 Grand Lake Commercial Stabilization (D2, same) are the two levers already on the board; neither moved at the C110 apply.
- **Tribune framing:** culture / business — the week after; names per hood in `tribuneFraming.storyHandles`. Housing is the civic angle: Uptown and Downtown at 8.
- **Measure next cycle:** hood Sentiment settles (no second −0.2 step) and HousingPressure in the six climbing hoods.

### 2. Fruitvale's transit hub is still a drawing — four Cycles in design
- **Tech diagnosis:** INIT-003 `proposed` / `design-phase`, `cyclesInState 4`, `NextActionCycle` 112, no VoteCycle. `measurement`: prior expected +0.02 Sentiment, observed −0.17 → `remedy-not-firing` (the title-week unwind, not the hub).
- **Existing mitigators:** itself, `remedy-working` by delta last Cycle, not this one.
- **Why working/not:** inert until a seat calls the vote (civic.38; transit has no petition band).
- **Remedy path:** world-side `call-vote` by the D5 seat or the mayor. No tech side.
- **Tribune framing:** civic — Fruitvale cast as C110 (Carmen Solis POP-00953, Tomas Renteria POP-00744, Ramon Solano POP-00756). Hooks: `covers Fruitvale`, `mentions INIT-003`.
- **Measure next cycle:** VoteCycle non-blank, or `cyclesInState` 5.

### 3. The apprenticeship pipeline is "operational" with nobody tending it — four Cycles
- **Tech diagnosis:** INIT-007 `announced` / `operational`, `cyclesInState 4`, `NextActionCycle` 111 (due now), `LastWorkCycle` blank. `measurement`: expected +0.02 RetailVitality, observed −2.04 → `remedy-not-firing`.
- **Existing mitigators:** itself; no director pack, no `work` move in two chains.
- **Why working/not:** legacy row shape the stage model does not read.
- **Remedy path:** world-side — a seat `work` move or conversion to a staged row. No tech side.
- **Tribune framing:** business/culture — West / East Oakland, Fruitvale; Renée Cabrera (POP-00891), Quinn Adeyemi (POP-01113). Hooks: `mentions INIT-007`.
- **Measure next cycle:** LastWorkCycle stamped, or untended at 5.

### 4. "Strain" is the city's word for the fourth Cycle running — but the load reading cleared
- **Tech diagnosis:** Riley_Digest `PatternFlag strain-trend`, recurring token × 3 Cycles in the window (4 on the record). `CivicLoad` this Cycle: **minor-variance** (was `load-strain` C108–C110).
- **Existing mitigators:** none.
- **Why working/not:** the pattern flag lags the load reading by design (trend window). If C112 reads minor-variance again the token drops out.
- **Remedy path:** none — watch. No tech side.
- **Tribune framing:** thread line, not a story.
- **Measure next cycle:** `CivicLoad` and whether the token recurs a fifth time.

### 5. Faith produced five events; the Tribune printed none — third Cycle
- **Tech diagnosis:** WorldEvents_V3_Ledger FAITH × 5 this Cycle (Masjid An-Nur, Bay Pure Land, Bharat Mandir, Or Hashalom, Lakeshore UU), `priorCycleCoverage 0`. Same pattern C109, C110.
- **Existing mitigators:** none — editorial.
- **Why working/not:** desk gap; the faith beat slice carries the rows, the writer-wakes have not picked them up three Cycles running.
- **Remedy path:** `editorial-pickup` — Elliot Graye's lane. No tech side.
- **Tribune framing:** culture/faith roundup. No hooks.
- **Measure next cycle:** `priorCycleCoverage` > 0.

### 6. Twenty hoods moved people with no economic event to explain it
- **Tech diagnosis:** `migratingCount 20`, `economicEventsThisCycle 0`; Riley `MigrationDrift 19` (C107–C110: 14, 20, 13, 19). `measurement`: expected +0.02, observed −1.36 → `remedy-not-firing` (RetailVitality unwind).
- **Existing mitigators:** INIT-001 disbursement-active (economic tranche 400,000 of 23,000,000 this Cycle), INIT-007 operational, INIT-008 now `legislation-filed`.
- **Why working/not:** standing pattern — migration is the drift engine (SIM_DOCTRINE §16), the detector's premise is the old taxonomy. Not a fault.
- **Remedy path:** none — monitor. No tech side.
- **Tribune framing:** business — Temescal 0 → +4 and Grand Lake +4 → 0 are the two hoods that swapped this week (see Anomalies).
- **Measure next cycle:** `MigrationDrift` band.

## Anomalies

**Dimond ViolentCrimeIndex 23, −7.0σ from the 6-Cycle mean 26.50 (stddev 0.50).** Auditor: `cover-as-story`, confidence high. **Overruled to suppress-until-verified.** A stddev of 0.50 on a 23–27 index makes any 3-point move read as −7σ; this is the band-width artifact, not a crime story. One Cycle; read again at C112.

**Laurel ViolentCrimeIndex 26, +3.3σ from mean 23.50.** Auditor: `cover-as-story`, confidence high. Same artifact (stddev 0.76). Suppress; Laurel is also one of the two hoods with no initiative and a −0.26 mood step — if the index holds at C112 it is the safety desk's.

**Temescal MigrationFlow 0 → +4** and **Grand Lake +4 → 0.** Auditor: `suppress-until-verified` on both. Agreed — the health center (INIT-005 operational, intensity 0.9) is the one named pull on Temescal; Grand Lake's inflow stopped the Cycle its commercial-stabilization proposal sat past due. Both are one-Cycle reads.

No `route-to-engine-debug` anomaly this Cycle; no followup file.

## Improvements

**IMPROVEMENT — Downtown Economic Revitalization moved.** INIT-008 `announced → legislation-filed` (intensity 0.05 → Downtown). The C110 chain's apply did it; the first of the three Proposed rows to leave the gate.

**IMPROVEMENT — the dice are live.** 19 civic-role draws on the first live Cycle (two L), 24 promotion lines, 17 home lines, no repeats, no faults — engine.286 Tasks 6 + 2 ran on the real ledger exactly as the bench said.

## Baseline Briefs (cron input)

- Total: 73 briefs (62 citizen-life-event, 10 world-event, 1 initiative-milestone) — C110 had 143 on the title week
- With promotion hints: 72
- Cluster note: West Oakland 13, East Oakland 10, Rockridge 7, Fruitvale 6, Jack London 5, Downtown 5. The one medium world event with a business owner is the Port berth delay (Jack London); the one civic spike is Fruitvale.
- Source: `output/baseline_briefs_c111.json`

## Measurement Check (from previous review)

| Pattern | Affected | Prior remedy | Expected | Observed | Verdict |
|---|---|---|---|---|---|
| stuck-initiative | INIT-003 Fruitvale | none | +0.02 Sentiment | −0.17 | remedy-not-firing |
| stuck-initiative | INIT-007 West/East Oakland, Fruitvale | none | +0.02 RetailVitality | −2.04 | remedy-not-firing |
| production-imbalance | 20 hoods migration | none | +0.02 | −1.36 | remedy-not-firing |
| repeating-event | "strain" | — | — | — | — (no-prior-match) |
| coverage-gap | faith | — | — | — | — (no-prior-match) |
| math-imbalance × 18 | hoods | — | — | — | — (no-prior-match) |

The three measured verdicts are the title-week unwind read through a remedy matcher: each "prior remedy" was `none` and each expected delta was the detector's +0.02 default. `remedy-not-firing` is literally true and tells us nothing about the initiatives. Matcher still fails to carry strain / faith across Cycles (G-EC36 class).

### Remedy-type track record

| Remedy type | Firing-as-expected | Firing-insufficient | Not-firing | Overshot |
|---|---|---|---|---|
| none | 0 | 0 | 3 | 0 |

**Win callout:** none by the matcher. By the world: INIT-008 left `announced` — the first Proposed row to move since civic.38.

## Routed to engine-debug

- **Port Growth_Rate −3.31 in one Cycle** (settle −0.53 + ship `berth_delay` at full port strength). Within design (engine.193 3b); read the ship's next phase at C112 and whether `bizShipEchoShare` 0.15 reached the 178 "shipMoved" count as the log says — 178 of 178 businesses carrying a port echo is the whole ledger, which is the echo share applied to every non-port row by design, but confirm the magnitude is 0.15 × peak, not the full hit.
- **Riley `CycleWeightReason` says "Very positive sentiment" at CitySentiment 0.44** — the weight text reads a band, not the number; cosmetic, note for the summary writer.
- **Crime-outlier σ on a 0.5-wide band** — the anomaly detector's `stddev` floor is too low for a 23–27 index; two false `cover-as-story` highs this Cycle. Filed at Step 6.
- **HousingPressure still has no standalone detector** (C110 carry); six hoods climbed again under the mood noise.

## Summary

- Ailments: 23 patterns → 6 real (0 high after the one-cause fold, 4 medium, 2 standing)
- Anomalies: 4 (2 crime-outlier overruled to suppress — band artifact; 2 migration suppress-until-verified)
- Improvements: 2 (INIT-008 advance; engine.286 dice live)
- Baseline briefs: 73 (72 with promotion hints)
- Measurements: 3 / 24 measured, all `remedy-not-firing` against a `none` prior — the unwind, not the initiatives
- Stage 3 / engine.286 / engine.95 / engine.94 first live fire: every expectation met except the institutions row (direction yes, magnitude unverified, AC Transit / City unexplained — G-EC50); engine.282 and engine.283 close on this read; engine.201 C111 resnap taken
