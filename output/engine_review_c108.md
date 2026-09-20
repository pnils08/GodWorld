# Engine Review — Cycle 108

**Cycle:** 108 | **In-world:** Y3C4 (Riley_Digest Timestamp), no holiday, fog
**Auditor version:** engineAuditor 1.0.0 (detectIncoherence 2.1.0, detectStuckInitiatives 1.4.0, detectMathImbalances 1.3.0, generateBaselineBriefs 1.2.0; full list in the audit JSON `detectorVersions`)
**Source files:**
- `output/engine_audit_c108.json` — 20 patterns (18 ailments, 2 improvements)
- `output/engine_anomalies_c108.json` — 22 anomalies
- `output/baseline_briefs_c108.json` — 87 briefs
- `output/execution_log_c108.txt` — Apps Script execution log for the live fire (Drive file `1BU6WN9o…`, pulled by the service account)

**Cycle execution:** 132 phases, all ok, 131.7s (C107: 185.6s), **1 engine error**, 1 audit issue, 28,028 rng draws. Slowest: Advancement 30.6s, ExecuteIntents 12.4s, MediaIntake 12.1s, MaintainLifeHistoryLog 10.6s, MigrationTracking 6.3s. 4 warnings, all `priorityEngine clamp raw=11.70 final=10.00 domain=CIVIC`.

**First live fire on PROD @104 (over @103, @102, @97/@98).** Smoke against `docs/reference/DEPLOY_HISTORY.md`:

| Expectation | Result | Source |
|---|---|---|
| 0 Engine_Errors | **1 row** — `Phase2-SportsSeason:WeekRecord` "games require game-result (Oakland_Sports_Feed row 226)". The engine.202 reject path working as built: row 226 is an A's `season-state` row carrying `WeekRecord=A:W`; the cell is refused, the row still counted (6 feed entries). Feed authoring, not code | `Engine_Errors`, log :21 |
| Every crisis-spike row described | PASS — 10 C108 world events, 0 blank; "Medium-severity civic spike in Dimond", "Low-severity health spike in KONO" | `WorldEvents_V3_Ledger` |
| No C108 hook reads "undefined" | PASS — 57 hooks, 0 | `Story_Hook_Deck` |
| World_Config gains the 2 illness keys | PASS — both 0.25; tab 127 → 134 rows (engine.133 seeded 2, engine.192 seeded 4 `school*`, engine.221 seeded 1) | `World_Config`, log :4/:14/:15 |
| No missing-key Issue | PASS — Issues cell carries only the WeekRecord line | `Riley_Digest` |
| `CRISIS-105-WESTOAKL` named | PASS — **"The West Oakland Crime Spike"**, `nameChannel: crime`, phase `decline`, tension 2.74 → 1.67, consecutiveGood 2. `crisisMemory` empty (nothing resolved yet) | `Carry_Forward_Store` |
| Crime in the engine.212 band | PASS — 22/22 hoods updated @108; largest move 5 index points (Dimond), from the recalibrated C107 base | `Crime_Metrics` |
| shockFlag → `shock-resolved` | PASS (C107 carried `shock-flag`). PatternFlag still `strain-trend`, as predicted until ~C114 | `World_Population`, `Riley_Digest` |
| Sports `championship` 22/22 | **`playoffs` 22/22** — matches the feed as authored today: no C108 row carries SeasonType `championship` (A's rows `playoffs`, Oaks `preseason`). The expectation was written against the 09-18 feed; the feed changed, the engine read it correctly | `Neighborhood_Map.SportsSeason`, feed rows 223–228 |
| 0 WeekRecord error rows | 1 — see row 1. Rows 224 (`H:W`) and 228 (`A:L`) are game-results and were accepted; first live cycle with the weekly casino path armed | feed |
| Retail ranking canon-shaped; no two hoods on the city Sentiment | PASS — Jack London / Downtown / Piedmont Ave / Uptown top; West Oakland 11th; Temescal, Adams Point, San Antonio, Ivy Hill, Glenview bottom. City 0.45; hoods 0.25–0.44, 15 distinct values | `Neighborhood_Map` |
| Hood markers spread | PASS — Mild inflow 9, Inflow surge 7, Stable 3, Mild outflow 2, Civic pressure zone 1; Downtown no longer "Shock event zone" | `Neighborhood_Map` |
| engine.216 doubled incomes | 1 of 867 comparable citizens: POP-00957 David Okonkwo 29,950 → 123,500 on `[Career-Hired] Hired at Alameda County Courts`; RoleType still "Retired Insurance Adjuster", CareerStage `senior` | `Simulation_Ledger` vs C107 snapshot |

`ENGINE187_DIAG` is not available for this fire: it rides the web-app fire response only (`utilities/webTrigger.js:52`), and the live fire is an editor run. The flag landed on its predicted value, so nothing needed explaining.

**Ledger:** 943 → 952 rows (8 generic citizens minted into the engine.174 short hoods — Baylight 2, East Oakland 2, Glenview 2, Brooklyn 1, Dimond 1 — plus 1 emergence promotion). 3 tier promotions, 67 advancements, 52 usage rows.

---

## Read this first — two hand writes and one deploy step sit under this cycle's diffs

1. **Civis recalibration (engine.241, hand-written to live 2026-09-19).** `engine_audit_c107.json` was rebased to the recalibrated values BEFORE the fire (`snapshotNotes`, commit `cb108e84`), so every `Crime_Metrics` / `CrimeIndex` / `RetailVitality` delta in this audit is C108's own movement. One residue: the anomaly detector's 5-cycle mean still holds C103–C106 on the old scale. **KONO "violent crime 21 at −3.0σ from mean 26.20" is mostly scale** — the real C108 move is 23 → 21. Rockridge (22 → 20) and Laurel (24 → 22) are real −2 moves whose σ reads large because the series was flat. None is a crime collapse; the in-world carrier of the recalibration is the three `Ripple_Ledger` rows.
2. **Ten hoods came off the city scalar (engine.239b/c, first live cycle).** Through C107 the ten hoods outside the Phase-2 cluster table rode the citywide sentiment (C107 review §Read this first; +0.30 that cycle). At C108 they run their own track: Dimond −0.39, Ivy Hill −0.32, Grand Lake −0.30, Adams Point −0.28, Glenview −0.28, Brooklyn −0.24, San Antonio −0.23. The twelve table hoods moved −0.03 to −0.16. **The large "decays" are the borrowed C107 lift being handed back, once** — read C109's deltas, not these, as hood mood.
3. **RetailVitality fell in every reported hood** (−0.59 Glenview … −2.12 Grand Lake, −2.07 Chinatown) on a no-holiday fog cycle after MLK Day. City-wide and same-signed, so it is a season/holiday term, not 14 local stories. Mechanism not traced this session.

**For every consumer:** the 14 `math-imbalance` rows are one city-level fact (the MLK/playoff lift came off, and ten hoods stopped borrowing the city's mood), not fourteen neighborhood crises. The four rated `high` (Fruitvale, Jack London, Grand Lake, Uptown) earn it on `HousingPressure +1` alongside the retail drop — that part is local and real.

---

## Ailments

### 1. **HIGH ×4** — housing pressure stepped up where retail fell: Fruitvale, Jack London, Grand Lake, Uptown (and Downtown, Rockridge at medium)
- **Tech diagnosis:** `Neighborhood_Map.HousingPressure` +1.000 in six hoods in one cycle; RetailVitality −1.07 to −2.12 in the same rows. Uptown Sentiment 0.25 (20 of 22).
- **Existing mitigators:** none matched by the auditor (`no-mitigator`) except Temescal → INIT-005.
- **Why not:** no housing initiative in the tracker covers these hoods; INIT-001 is West Oakland only.
- **Remedy path:** world-side — a housing item from the district seats (`Neighborhood_Map.District`: D2 Downtown + Jack London, D3 Fruitvale, D7 Rockridge, D8 Grand Lake, D9 Uptown). No tech-side trigger.
- **Measure next cycle:** `HousingPressure` in the six hoods — a second +1 is a trend; a return is noise.

### 2. "Strain" — fifth consecutive cycle, unowned, and now expected
- `PatternFlag strain-trend`, `CivicLoad load-strain`. DEPLOY_HISTORY §PROD @102 predicts the flag persists while pre-fix rows age out of the 7-row digest window (clear by ~C114). Mechanism, not world. Do not staff it.

### 3. "World" token recurring 3 cycles — detector residue
- The repeating-event detector tokenises `Riley_Digest.Issues`. C105–C107 carried the `World_Config … illnessConvergenceRate missing` notice; C108 does not (keys seeded). The pattern ages out as those rows leave the window. No action.

### 4. Temescal — INIT-005 `remedy-not-firing` on Sentiment (expected +0.02, observed −0.08)
- One of the twelve table hoods, so the −0.08 is its own. RetailVitality −1.03 to 5.02 (18 of 22). The health-center build is not yet moving the hood's mood. Low severity; second measurement next cycle.

### 5. Faith — 5 events, zero coverage last cycle (second cycle running)
- `coverage-gap`, medium. Editorial, not civic. Culture lane of `desk_signal_c108.json` carries it.

### 6. 19 hoods report migration flow with zero economic events
- `production-imbalance`, medium. Measurement on the prior pattern reads `remedy-overshot` on RetailVitality (+0.28 vs +0.02 expected) — that figure is against the rebased C107 retail and is the West Oakland footprint only.

### 7–18. Neighborhood rows — see §Read this first; itemised in the audit JSON, not restated.

## Anomalies

- **POP-00957 income +312% (`route-to-engine-debug`, high).** Routed: engine.216. A citizen whose RoleType reads "Retired Insurance Adjuster" was hired at Alameda County Courts at 123,500. Two questions for the engine session: why a retired row is in the hire pool, and whether the hire sets income from the employer's band without reading the citizen's prior. Suppress from coverage until cleared.
- **Violent crime −3.0σ to −4.5σ in Rockridge, Laurel, KONO (`cover-as-story`, high).** Downgrade: real moves of −2 index points each; σ inflated by flat series and, for KONO, by the pre-recalibration scale in the history window. Not a story on its own.
- **Migration flow shifted in 18 hoods (`suppress-until-verified`, medium).** East Oakland −3 → +3, Eastlake −2 → +3, Adams Point −1 → +4, San Antonio −3 → +1, Laurel +2 → −2, KONO +2 → −1. `MigrationFlow` is median-relative (engine.184), so a city-wide reshuffle moves every hood at once; 8 generic citizens also landed in five of these hoods. Suppress as individual items.

## Improvements

- **OARI (INIT-002) advanced `implementation-active` → `dispatch-live`** — written by the C107 city-hall apply (2026-09-13 21:11), first seen by the engine this fire. Footprint West Oakland / Fruitvale / East Oakland; ViolentCrimeIndex across the three −7 against −0.05 expected (`remedy-overshot`). With the West Oakland crisis in `decline` at tension 1.67 and two good cycles banked, **the crisis resolves at C109 if West Oakland holds** — that would be the first named crisis to end on live and the first `crisisMemory` entry.

## Baseline Briefs (cron-civic-run required input)

- Total: 87 (world-event 10, initiative-milestone 1, citizen-life-event 76). With promotion hints: 86.
- None derives from a `Crime_Metrics` / `Neighborhood_Map` snapshot diff, so none carries the recalibration.
- Source: `output/baseline_briefs_c108.json`

## Measurement Check

| Pattern | Affected | Prior remedy | Expected | Observed | Verdict |
|---|---|---|---|---|---|
| math-imbalance | Temescal (INIT-005) | none | Sentiment +0.02 | −0.08 | remedy-not-firing |
| production-imbalance | 19 hoods | none | RetailVitality +0.02 | +0.28 | remedy-overshot |
| improvement | INIT-002 footprint | incoherence | ViolentCrimeIndex −0.05 | −7 | remedy-overshot |
| all other patterns | — | — | — | — | — (`no-prior-match`) |

## Summary

- Ailments: 18 (4 high, 13 medium, 1 low) — of which 14 are one city-level sentiment/retail step
- Anomalies: 22 (1 engine-debug, 3 cover-as-story downgraded here, 18 suppress)
- Improvements: 2 (both OARI)
- Baseline briefs: 87 (86 with promotion hints)
- Routed to engine-debug: POP-00957 hire income (engine.216); city-wide RetailVitality term untraced
- For the builder's lane: feed row 226 `WeekRecord=A:W` sits on a `season-state` row and was refused; if the A's week was meant to settle the casino off that cell, it belongs on a `game-result` row
