# Adversarial Review: Transit Ledger & Sim Coupling (`engine.290`)

**Date:** 2026-10-14  
**Reviewer:** Antigravity (Standing Adversarial Review Duty per `AGENTS.md`)  
**Target:** `engine.290` — Initial review of the transit ledger and how to attach transit to the simulation  
**Builder Verbatim:** *"tie the transit system to the sim so it peaks and slows with the sim, make sure it is staffed enough with having at least 1 employee as conductor, engineer, etc."*  
**Files Audited:**
- [`output/beats/Transit_Metrics.jsonl`](file:///root/GodWorld/output/beats/Transit_Metrics.jsonl) (612 rows across C78→C111; 18 rows/cycle = 8 stations + 10 corridors)
- [`phase02-world-state/updateTransitMetrics.js`](file:///root/GodWorld/phase02-world-state/updateTransitMetrics.js) (v1.3 header, lines 1–1104)
- [`utilities/ensureTransitMetrics.js`](file:///root/GodWorld/utilities/ensureTransitMetrics.js) (lines 1–594)
- [`output/beats/Employment_Roster.jsonl`](file:///root/GodWorld/output/beats/Employment_Roster.jsonl) (859 roster rows at C111)
- [`output/beats/Business_Ledger.jsonl`](file:///root/GodWorld/output/beats/Business_Ledger.jsonl) (179 business rows at C111)
- [`data/economic_parameters.json`](file:///root/GodWorld/data/economic_parameters.json) (lines 280–350)
- [`data/employer_mapping.json`](file:///root/GodWorld/data/employer_mapping.json) (lines 35–80)
- [`phase05-citizens/processAdvancementIntake.js`](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js) (lines 52–85, 1545–1585)
- [`phase01-config/advanceSimulationCalendar.js`](file:///root/GodWorld/phase01-config/advanceSimulationCalendar.js) (lines 175–205)
- [`phase02-world-state/getSimHoliday.js`](file:///root/GodWorld/phase02-world-state/getSimHoliday.js) (lines 1–65)
- [`phase02-world-state/loadNeighborhoodState.js`](file:///root/GodWorld/phase02-world-state/loadNeighborhoodState.js) (lines 12–25, 120–145)
- [`phase02-world-state/applyCityDynamics.js`](file:///root/GodWorld/phase02-world-state/applyCityDynamics.js) (lines 40–50, 1840–1855)
- [`phase02-world-state/applySportsSeason.js`](file:///root/GodWorld/phase02-world-state/applySportsSeason.js) (lines 25–35, 100–125)
- [`docs/SIM_DOCTRINE.md`](file:///root/GodWorld/docs/SIM_DOCTRINE.md) (§1, §2, §6, §15, §16, §17)
- [`docs/engine/ROLLOUT_PLAN.md`](file:///root/GodWorld/docs/engine/ROLLOUT_PLAN.md) (row `engine.290`)

---

## Verdict

**FAIL (UNCOUPLED SCENERY WITH WRITE-CORRUPTION & PHANTOM WORKFORCE):**  
While total station ridership moves aggressively between cycles (21,674 to 99,582 riders) and corridor congestion fluctuates (TrafficIndex 21 to 100), the transit ledger is currently corrupted at the schema write boundary and operates as isolated scenery:
1. **Schema write bug:** In `utilities/ensureTransitMetrics.js:463-464`, `m.onTimePerformance || 0.85` and `m.trafficIndex || 50` coerce valid numeric `0` values. Consequently, **100% of station rows (272/272) sit frozen at `TrafficIndex = 50`**, and **100% of corridor rows (340/340) sit frozen at `OnTimePerformance = 0.85`**.
2. **Artificial OTP clamp:** Station OnTimePerformance is tightly pinned (mean 0.82, std dev 0.03, range 0.73–0.90 across 34 cycles). It never experiences genuine operational collapse or real drift.
3. **Ghost workforce:** Transit operates with zero coupling to labor. `Employment_Roster.jsonl` contains **zero conductors, zero train engineers/operators, and zero transit dispatchers**. BART Oakland Division (`BIZ-00014`, 900 nominal employees) has exactly two rostered citizens: a Station Manager and a PR specialist. Transit performance never checks staffing, suffering zero penalty for a completely vacant operations cabin.
4. **Desynchronized rhythms:** Transit rolls its own private coin-flip for weekend detection (`updateTransitMetrics.js:127`) instead of reading `S.isWeekend`, and crushes all holidays (from New Year's to Valentine's Day) under a uniform 60% ridership penalty, completely blind to `S.holidayNeighborhood` surges, `S.isFirstFriday`, `S.neighborhoodState`, and `S.sportsCity`.

---

## Attack on Weakest Assumptions

### 1. Assumption: "Transit Metrics Reflect Real Physical Conditions"
*Attacked:* The recorded table is corrupted by JavaScript falsy coercion in the batch append intent builder.
- In `phase02-world-state/updateTransitMetrics.js:466`, `calculateStationMetrics_` explicitly defines `trafficIndex: 0 // Stations don't have traffic index`.
- In `phase02-world-state/updateTransitMetrics.js:569-570`, `calculateCorridorTraffic_` explicitly defines `ridershipVolume: 0, onTimePerformance: 0`.
- But in `utilities/ensureTransitMetrics.js:463-464`, `batchRecordTransitMetrics_` executes:
  ```javascript
  m.onTimePerformance || 0.85,
  m.trafficIndex || 50,
  ```
- Because `0` is falsy in JavaScript, `0 || 50` evaluates to `50`, and `0 || 0.85` evaluates to `0.85`.
- *Empirical proof:* In `output/beats/Transit_Metrics.jsonl`, **272 out of 272 station rows across C78–C111 report `TrafficIndex = 50` (100.0%)**, and **340 out of 340 corridor rows report `OnTimePerformance = 0.85` (100.0%)**. Rather than displaying blank or zero metrics for non-applicable fields, the sheet writes back static defaults that masquerade as live measurements, violating `SIM_DOCTRINE.md` §16 ("A column that never moves is scenery, not simulation").

### 2. Assumption: "BART and AC Transit Operate as Living Employers in the Sim"
*Attacked:* Transit agencies are economic shells with no operational workforce.
- `Business_Ledger.jsonl` gives `AC Transit` (`BIZ-00013`) 2,101 employees and `BART Oakland Division` (`BIZ-00014`) 900 employees (`output/beats/Business_Ledger.jsonl`).
- On `Employment_Roster.jsonl`, however, BART has only two citizens: `POP-00617` Eleanor Rivera ("BART Station Manager") and `POP-01039` Ximena Mehta ("Bart Transit PR").
- There is **not a single train conductor, train engineer, locomotive operator, or rail dispatcher** anywhere on the active roster.
- AC Transit has 5 bus operators/drivers (`POP-00200`, `POP-00338`, `POP-00442`, `POP-00448`, `POP-00573`), 1 mechanic (`POP-00218`), and 1 janitor (`POP-00280`), but zero dispatchers.
- In `phase02-world-state/updateTransitMetrics.js:448-460`, the on-time calculation reads weather, initiative phase, previous events, and RNG. It never touches `Employment_Roster` or `ctx.summary.employment`. Transit runs with high reliability (0.83 on-time) even when zero human beings are operating the trains. This directly violates `SIM_DOCTRINE.md` §6 ("No ghost people").

### 3. Assumption: "Transit Captures the Sim's Civic Rhythms"
*Attacked:* Transit operates in an isolated temporal silo, desynchronized from the calendar engine.
- Phase 1 calendar advances time and sets `S.isWeekend = rng() < 0.29` (`phase01-config/advanceSimulationCalendar.js:197`).
- In `phase02-world-state/updateTransitMetrics.js:127`, transit ignores `S.isWeekend` and rolls its own separate random number: `rng() < TRANSIT_FACTORS.WEEKEND_PROBABILITY`. Transit and the rest of the sim can therefore disagree on whether a cycle is a weekend.
- When `S.holiday` is non-empty, `updateTransitMetrics.js:127` collapses the cycle into `dayType = 'holiday'`, which triggers `calculateRidershipModifier_` (`utilities/ensureTransitMetrics.js:511`) to cut ridership by 60% (`mod *= 0.4`) and `calculateCorridorTraffic_` (`updateTransitMetrics.js:534`) to cut traffic by 50% (`trafficMod *= 0.5`).
- Under `engine.273`, minor observances like `OpenCourtWeek` (C110), `Valentine` (C7), or `BackToSchool` (C33) (`phase02-world-state/getSimHoliday.js:9, 10, 17`) are treated as full municipal shutdowns where 60% of transit riders disappear. Meanwhile, neighborhood-specific celebrations like Halloween in Temescal or Summer Solstice at Lake Merritt (`getSimHoliday.js:15, 19`) produce zero localized transit surge because `S.holidayNeighborhood` is completely unread.

---

## Detailed Audit Questions & Findings

### Question 1: Does the ledger move?
*Per station/corridor across C78–C111: variance of RidershipVolume and OnTimePerformance, how often TrafficIndex sits at 50, how often Factors is empty, whether game days / weather / holidays visibly show.*

#### A. Ledger Overview & Row Distribution
- File: [`output/beats/Transit_Metrics.jsonl`](file:///root/GodWorld/output/beats/Transit_Metrics.jsonl)
- Span: Cycles 78 through 111 (34 cycles total).
- Volume: Exactly 18 rows per cycle = 612 total rows (8 BART stations, 10 traffic corridors).

#### B. Station Variance (RidershipVolume & OnTimePerformance)
Station ridership varies dramatically cycle-to-cycle (driven by game days, weather, and initiative multipliers), but OnTimePerformance is tightly clamped to a narrow band around 0.82:

| Station | Base | Mean Ridership | Std Dev | Min Ridership | Max Ridership | Mean OTP | OTP Std Dev | OTP Min | OTP Max |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **12th St Oakland City Center** | 12,500 | 10,068.88 | 5,373.41 | 4,645 (C78) | 23,848 (C109) | 0.83 | 0.03 | 0.77 | 0.88 |
| **19th St Oakland** | 8,500 | 6,752.09 | 3,749.42 | 3,167 (C78) | 17,104 (C109) | 0.80 | 0.03 | 0.75 | 0.88 |
| **Lake Merritt** | 5,000 | 3,469.68 | 1,873.62 | 1,813 (C104) | 8,484 (C109) | 0.82 | 0.03 | 0.77 | 0.87 |
| **Fruitvale** | 7,500 | 5,274.09 | 2,642.16 | 2,603 (C104) | 11,735 (C109) | 0.81 | 0.04 | 0.73 | 0.90 |
| **Coliseum** | 6,000 | 4,432.74 | 2,380.03 | 1,975 (C78) | 9,724 (C109) | 0.81 | 0.03 | 0.75 | 0.87 |
| **West Oakland** | 4,500 | 3,485.50 | 2,003.64 | 1,660 (C104) | 8,680 (C109) | 0.82 | 0.03 | 0.75 | 0.88 |
| **MacArthur** | 9,000 | 6,674.79 | 3,049.08 | 2,979 (C78) | 12,368 (C109) | 0.83 | 0.03 | 0.78 | 0.88 |
| **Rockridge** | 7,000 | 5,119.65 | 2,405.15 | 2,690 (C78) | 9,343 (C109) | 0.83 | 0.04 | 0.75 | 0.90 |

*Key finding:* Station OTP has a system-wide standard deviation of only ~0.03. In `phase02-world-state/updateTransitMetrics.js:448-460`, baseline OTP is 0.85, reduced only by -0.15 for storms, -0.05 for rain/fog, and -0.03 for crowding (`events > 2`), with a random variance of `±0.05`. Because storms are rare and negative events are capped, OTP never genuinely craters below 0.73.

#### C. Corridor Variance (TrafficIndex)
Corridor congestion shows substantial variance, responding to freeway vs surface designation and game-day venue routing:

| Corridor | Freeway? | Base Index | Mean Index | Std Dev | Min Index | Max Index | Rows at 50 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **I-880 North** | Yes | 65 | 66.15 | 23.85 | 34 (C100) | 100 (C108) | 0 / 34 |
| **I-880 South** | Yes | 60 | 61.32 | 23.30 | 25 (C78) | 100 (C109) | 0 / 34 |
| **I-580 East** | Yes | 70 | 67.62 | 23.52 | 33 (C97) | 100 (C109) | 0 / 34 |
| **I-580 West** | Yes | 55 | 54.21 | 22.89 | 28 (C100) | 100 (C108) | 1 / 34 |
| **I-980** | Yes | 45 | 45.09 | 23.43 | 21 (C78) | 100 (C109) | 0 / 34 |
| **Broadway** | No | 50 | 51.68 | 22.47 | 26 (C100) | 100 (C109) | 0 / 34 |
| **International Blvd** | No | 55 | 53.68 | 23.42 | 22 (C78) | 100 (C109) | 2 / 34 |
| **MacArthur Blvd** | No | 45 | 46.91 | 19.24 | 25 (C78) | 90 (C108) | 0 / 34 |
| **Telegraph Ave** | No | 50 | 51.21 | 21.56 | 21 (C78) | 100 (C109) | 0 / 34 |
| **Grand Ave** | No | 40 | 41.35 | 16.53 | 23 (C100) | 78 (C108) | 0 / 34 |

#### D. How Often TrafficIndex Sits at 50
- **Total Ledger Rows:** 612 rows.
- **Total Rows with TrafficIndex = 50:** 275 rows (44.9%).
- **Station Breakdown:** **272 out of 272 station rows (100.0%) sit at 50**.
  - *Mechanism:* `utilities/ensureTransitMetrics.js:464` executes `m.trafficIndex || 50`. Since `calculateStationMetrics_` assigns `trafficIndex: 0`, JavaScript evaluates `0 || 50 → 50`.
- **Corridor Breakdown:** Only **3 out of 340 corridor rows (0.88%) sit at 50** (I-580 West at C88; International Blvd at C85 and C89).
- *Mirror Bug:* All 340 corridor rows (100.0%) report `OnTimePerformance = 0.85` because `utilities/ensureTransitMetrics.js:463` executes `m.onTimePerformance || 0.85`, coercing corridor `onTimePerformance: 0` to `0.85`.

#### E. How Often Factors is Empty
- **Total Rows with Empty Factors:** **522 out of 612 rows (85.3%)**.
- **Cycles 78 through 106 (29 cycles = 522 rows):** **100% empty (522/522)**.
- **Cycles 107 through 111 (5 cycles = 90 rows):** **0% empty (0/90)**.
- *Mechanism:* The `Factors` column was introduced by `engine.183` in `phase02-world-state/updateTransitMetrics.js:489-496` (`factorsString_`) and landed live starting in Cycle 107. Since C107, every row provides explanatory factors (e.g., `fog; holiday; game day (Downtown); events in Downtown ×2, Lake Merritt ×2; Baylight District — Final Council Vote: construction-active`).

#### F. Do Game Days, Weather, and Holidays Visibly Show?
**YES, with sharp regime differences:**
1. **Weather:**
   - Rain in C104 (`output/beats/Cycle_Weather.jsonl:104`, `Type: rain`, `Impact: 1.33`) drops total ridership to **22,815** (vs normal baseline ~35,000).
   - Rain in C105 drops system average OTP to **0.77** (lowest in the 34 cycles).
   - Fog in C107, C108, C110 holds OTP at 0.78–0.79 (`updateTransitMetrics.js:451`).
2. **Holidays:**
   - C107 (`getSimHoliday.js:6` New Year): DayType is flagged as holiday. Despite game day crowds and multiple downtown events, total ridership is throttled to **33,277** and average traffic is **46.2** due to the 60% ridership cut and 50% traffic cut.
   - C111 (holiday): Total ridership is **36,303**, traffic is **40.3**.
3. **Game Days & Stadium Construction:**
   - C108 (weekend game day): Total ridership surges to **70,489**, average traffic hits **92.5**.
   - C109 (game day + Baylight construction): Ridership peaks at **99,582**, average traffic hits **94.6** (all freeways hit 100).
   - C110 (game day + Baylight active construction): Ridership reaches **91,564**, average traffic hits **94.8**.
   - Identical runs in C78/C79 (total ridership exactly **21,674** both cycles) and C91/C92 (total ridership **69,573** vs **69,576**) reveal that when weather and game-day inputs are static, the RNG variance (`0.9 + rng() * 0.2`) produces near-deterministic outputs.

---

### Question 2: Which sim rhythms exist in ctx.summary today that transit does not read?
*Work week, holidays engine.273, hood economies, dials, sports week — naming S.* fields with file:line.*

Today, `updateTransitMetrics.js` reads only:
- `S.absoluteCycle` (`updateTransitMetrics.js:108`)
- `S.weather.type` / `S.weather.frontState` (`updateTransitMetrics.js:117-124`)
- `S.season` (`updateTransitMetrics.js:125`)
- `S.holiday` (`updateTransitMetrics.js:126`)
- `S.sportsWeek[f].h`, `venue`, `unsigned`, `venueShare` (`updateTransitMetrics.js:708-728`)
- `S.initiativeImplementationEffects.transit` (`updateTransitMetrics.js:743-795`)
- `S.commuteFlows` (`updateTransitMetrics.js:390-398`)
- `S.previousCycleState.transitDisrupted` (`updateTransitMetrics.js:232`)

It **completely ignores** the following active simulation rhythms already published in `ctx.summary`:

#### 1. Work Week vs Weekend Synchronization
- **`S.isWeekend`** ([`phase01-config/advanceSimulationCalendar.js:197`](file:///root/GodWorld/phase01-config/advanceSimulationCalendar.js#L197)): Generated deterministically in Phase 1 for the cycle (`rng() < 0.29`).
  - *Current Transit Behavior:* [`phase02-world-state/updateTransitMetrics.js:127`](file:///root/GodWorld/phase02-world-state/updateTransitMetrics.js#L127) rolls its own independent RNG (`rng() < TRANSIT_FACTORS.WEEKEND_PROBABILITY`), decoupling transit from the rest of the engine.
- **`S.cycleInMonth`** ([`phase01-config/advanceSimulationCalendar.js:181`](file:///root/GodWorld/phase01-config/advanceSimulationCalendar.js#L181)): Position within month (1–5). Unread.
- **`S.simMonth` / `S.month`** ([`phase01-config/advanceSimulationCalendar.js:183-184`](file:///root/GodWorld/phase01-config/advanceSimulationCalendar.js#L183-L184)): Seasonal monthly rhythm used by generational events and media. Unread.

#### 2. Calendar Holidays & Civic Observances (`engine.273`)
- **`S.holidayPriority`** ([`phase01-config/advanceSimulationCalendar.js:190`](file:///root/GodWorld/phase01-config/advanceSimulationCalendar.js#L190), derived from [`phase02-world-state/getSimHoliday.js:38`](file:///root/GodWorld/phase02-world-state/getSimHoliday.js#L38)): Distinguishes `'major'` municipal holidays (Christmas, Thanksgiving) from `'minor'` (Valentine's, Back to School) and `'oakland'` (Open Court Week). Unread. Transit treats all holidays identically with a blanket 60% ridership wipeout.
- **`S.holidayNeighborhood`** ([`phase01-config/advanceSimulationCalendar.js:191`](file:///root/GodWorld/phase01-config/advanceSimulationCalendar.js#L191), derived from [`phase02-world-state/getSimHoliday.js:39`](file:///root/GodWorld/phase02-world-state/getSimHoliday.js#L39)): Canon neighborhood host for holiday crowds:
  - Halloween (`cycleOfYear: 44`): `'Temescal'` (MacArthur BART)
  - Summer Solstice (`cycleOfYear: 26`): `'Lake Merritt'` (Lake Merritt BART)
  - New Year's Eve (`cycleOfYear: 52`): `'Downtown'` (12th St / 19th St BART)
  - *Current Transit Behavior:* Completely unread. A Halloween surge in Temescal or Solstice crowd at Lake Merritt never reaches the local station.
- **`S.holidayDetails.type`** ([`phase02-world-state/getSimHoliday.js:40`](file:///root/GodWorld/phase02-world-state/getSimHoliday.js#L40)): Category (`'celebration'`, `'godworld'`, `'civic'`, `'family'`). Unread.
- **`S.isFirstFriday`** ([`phase01-config/advanceSimulationCalendar.js:192`](file:///root/GodWorld/phase01-config/advanceSimulationCalendar.js#L192), [`phase02-world-state/getSimHoliday.js:45-47`](file:///root/GodWorld/phase02-world-state/getSimHoliday.js#L45-L47)): Fired every 4 cycles (`cycleOfYear % 4 === 2`). Directly impacts KONO, Uptown, and Downtown nightlife/transit corridors (Telegraph, Broadway). Completely unread by transit.
- **`S.isCreationDay`** ([`phase01-config/advanceSimulationCalendar.js:193`](file:///root/GodWorld/phase01-config/advanceSimulationCalendar.js#L193)): Cycle 48 celebration. Unread.

#### 3. Neighborhood Economies & Micro-Dynamics
- **`S.neighborhoodState[hood]`** ([`phase02-world-state/loadNeighborhoodState.js:120-140`](file:///root/GodWorld/phase02-world-state/loadNeighborhoodState.js#L120-L140)): Loaded during Phase 2 from `Neighborhood_Map`. Includes:
  - `retailVitality` (`loadNeighborhoodState.js:123`): Commercial corridor foot traffic.
  - `nightlifeProfile` (`loadNeighborhoodState.js:132`, `engine.205`): Evening corridor load.
  - `boomIndex` / `boomExposure` (`loadNeighborhoodState.js:135-136`): Economic expansion/contraction.
  - `housingPressure` (`loadNeighborhoodState.js:127`): Commuter density and rent strain.
  - `employerCharacter` (`loadNeighborhoodState.js:137`): Institutional, commercial, or residential zoning.
  - *Current Transit Behavior:* Zero fields read. Stations in booming retail hubs have the exact same economic modifier as economically depressed zones.
- **`S.neighborhoodDynamics[hood]`** ([`phase02-world-state/applyCityDynamics.js:43, 1847`](file:///root/GodWorld/phase02-world-state/applyCityDynamics.js#L43)): Eight live cycle dynamics per canon hood: `traffic`, `retail`, `tourism`, `nightlife`, `publicSpaces`, `sentiment`, `culturalActivity`, `communityEngagement`. Completely unread by transit.
- **`S.cityDynamics`** ([`phase02-world-state/applyCityDynamics.js:41-42`](file:///root/GodWorld/phase02-world-state/applyCityDynamics.js#L41-L42)): Macro citywide movement. Unread.

#### 4. System Dials & Shock Signals
- **`S.shockFlag`** ([`phase02-world-state/applyCityDynamics.js:269, 788`](file:///root/GodWorld/phase02-world-state/applyCityDynamics.js#L269)): Citywide emergency or civil disruption indicator. Unread.
- **`ctx.config.cityCapacity` / `S.cityCapacity`** ([`phase02-world-state/applyCityDynamics.js:848`](file:///root/GodWorld/phase02-world-state/applyCityDynamics.js#L848)): Saturation thresholds for infrastructure. Unread.
- **`ctx.config.dialHoodPressureBar`** ([`phase01-config/engine94SheetContract.js:465`](file:///root/GodWorld/phase01-config/engine94SheetContract.js#L465)): Neighborhood congestion friction bar. Unread.

#### 5. Sports Intensity & Fan Gravity
- **`S.sportsCity`** ([`phase02-world-state/applySportsSeason.js:31, 116`](file:///root/GodWorld/phase02-world-state/applySportsSeason.js#L31)): Derived citywide sports intensity and atmosphere. Unread.
- **`S.sportsSeason`** ([`phase02-world-state/applySportsSeason.js:40, 102`](file:///root/GodWorld/phase02-world-state/applySportsSeason.js#L40)): Current season phase (`'championship'`, `'playoffs'`, `'regular-season'`, `'off-season'`). Unread. (C111 featured the A's championship rally, documented on `output/beats/Oakland_Sports_Feed.jsonl`, yet transit metrics registered zero sports lift because `S.sportsWeek[f].h` was 0).
- **`S.sportsZones`** ([`phase02-world-state/applySportsSeason.js:57, 113`](file:///root/GodWorld/phase02-world-state/applySportsSeason.js#L57)): Venue footprint. Unread (transit computes its own local hood intersection instead).

---

### Question 3: Staffing
*What role floor and which employer rows the engine hiring path (Intake mints + hiring, never a hand-move — feedback 2026-10-11) would need so each transit role has ≥1 citizen; where ridership could then feel staffing (delay when a role is empty).*

#### A. Current Census of Transit Staffing on `Employment_Roster.jsonl`
Total active citizens employed at transit businesses: **10 citizens across 3 employers**.

1. **`BIZ-00013`: AC Transit** (Employee_Count: 2,101; 7 rostered citizens):
   - `POP-00200` Evan Lewis — `Bus driver`
   - `POP-00218` Joel Wren — `Mechanic`
   - `POP-00280` Jerald Jensen — `Janitor`
   - `POP-00338` Coen Cartier — `Transit Operator (AC Transit)`
   - `POP-00442` Daire Green — `Transit Operator (AC Transit)`
   - `POP-00448` Ray Neal — `AC Transit Bus Operator`
   - `POP-00573` Calvin Mwangi — `AC Transit Bus Driver`
2. **`BIZ-00014`: BART Oakland Division** (Employee_Count: 900; 2 rostered citizens):
   - `POP-00617` Eleanor Rivera — `BART Station Manager`
   - `POP-01039` Ximena Mehta — `Bart Transit PR`
3. **`BIZ-00096`: Fruitvale Transit Hub Authority** (Employee_Count: 18; 1 rostered citizen):
   - `POP-00791` Elena Soria-Dominguez — `Transit Hub Planning Lead`

*Roster Gap Analysis:*
- **Train Conductor:** 0 citizens.
- **Locomotive / Train Engineer:** 0 citizens (all 10 "Engineer" hits on `Employment_Roster` are software/ML/systems engineers at Oakmesh, Vertical Farms, or EBMUD).
- **Transit Dispatcher:** 0 citizens.
- **Rail Track / Systems Maintenance Technician:** 0 citizens.

#### B. The Required Role Floor
To satisfy the builder's requirement (*"make sure it is staffed enough with having at least 1 employee as conductor, engineer, etc."*), the minimum operational floor is:

| Agency | Business ID | Required Operational Role | Current Rostered | Floor | Minimum Mints Needed |
| :--- | :---: | :--- | :---: | :---: | :---: |
| **BART Oakland Division** | `BIZ-00014` | **Train Conductor** (or BART Conductor) | 0 | 1 | +1 |
| **BART Oakland Division** | `BIZ-00014` | **Train Engineer** (or BART Train Operator) | 0 | 1 | +1 |
| **BART Oakland Division** | `BIZ-00014` | **Transit Dispatcher** (Rail Operations) | 0 | 1 | +1 |
| **BART Oakland Division** | `BIZ-00014` | **Station Manager** | 1 (`POP-00617`) | 1 | 0 (Satisfied) |
| **BART Oakland Division** | `BIZ-00014` | **Track / Systems Maintenance Tech** | 0 | 1 | +1 |
| **AC Transit** | `BIZ-00013` | **Bus Operator / Driver** | 5 rostered | 1 | 0 (Satisfied) |
| **AC Transit** | `BIZ-00013` | **Bus Fleet Mechanic** | 1 (`POP-00218`) | 1 | 0 (Satisfied) |
| **AC Transit** | `BIZ-00013` | **Transit Dispatcher** (Bus Operations) | 0 | 1 | +1 |
| **Fruitvale Transit Hub** | `BIZ-00096` | **Transit Hub Planning / Operations Lead** | 1 (`POP-00791`) | 1 | 0 (Satisfied) |

*Total net-new citizens needed to establish the baseline floor:* **5 citizens** (3 at BART, 1 at AC Transit, 1 track/systems tech).

#### C. The Engine Hiring Path (Intake Mints + Engine Hiring — Never a Hand-Move)
Per builder ruling 2026-10-11 in [`docs/plans/2026-08-07-spacemolt-game-show.md:93`](file:///root/GodWorld/docs/plans/2026-08-07-spacemolt-game-show.md#L93):
> *"NO citizen moves — 'you're changing their lives for your benefits not theirs.' 'If you need staff you either mint them or leave them as open jobs. We don't change a citizen.' Stations are staffed only by new citizens through the Intake tab (builder names them) or stay open until the engine's own hiring fills them; the employer rules route future station-titled citizens there."*

Existing citizens (e.g. PG&E engineers or autonomous systems engineers) must **never** be reassigned. The engine hiring path requires four mechanical updates so newly minted or promoted citizens route properly:

1. **Economic Catalog Additions** ([`data/economic_parameters.json`](file:///root/GodWorld/data/economic_parameters.json)):
   - `Transit Dispatcher` already exists in catalog (`medianIncome: 82000`, `category: "Transit & Infrastructure"`).
   - Add canonical entries for:
     - `Train Conductor` (Transit & Infrastructure, salary band $75,000–$110,000, median $88,000).
     - `Train Engineer` (Transit & Infrastructure, salary band $85,000–$130,000, median $102,000).
     - `Transit Maintenance Technician` (Transit & Infrastructure, salary band $70,000–$105,000, median $84,000).
2. **Employer Mapping Rules** ([`data/employer_mapping.json`](file:///root/GodWorld/data/employer_mapping.json)):
   - Currently, `keywordRules` (`lines 50-56`) only matches `"AC Transit" → BIZ-00013` and `"BART" → BIZ-00014`.
   - If a citizen is minted as "Train Conductor", they match neither keyword and fall to `UNTRACKED`.
   - Add explicit pattern matches:
     - `"Train Conductor" → BIZ-00014`
     - `"Conductor" → BIZ-00014`
     - `"Train Engineer" → BIZ-00014`
     - `"Train Operator" → BIZ-00014`
     - `"Transit Dispatcher" → BIZ-00014` (or split between BART/AC Transit by parenthetical).
3. **Intake Processing Sync** ([`phase05-citizens/processAdvancementIntake.js`](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js)):
   - Add the same keywords to `MINT_KEYWORD_RULES` (`line 1560`).
   - Add `'Train Conductor'`, `'Train Engineer'`, `'Transit Dispatcher'` to `DEMOGRAPHIC_VOICE_ROLES` (`line 58`) so generic emergency mints can draw them.
4. **Intake Tab Submission:**
   - Mint 3–5 named citizens via the `Intake` tab with titles such as `"BART Train Conductor"`, `"BART Train Engineer"`, `"BART Rail Dispatcher"`. The engine's Intake processor will automatically assign POPIDs and append them to `Employment_Roster.jsonl` under `BIZ-00014`.

#### D. Where Ridership and On-Time Performance Feel Staffing
Staffing should act as a hard operational governor inside `phase02-world-state/updateTransitMetrics.js:448-460`:

1. **Dispatcher Absence → Systemwide Latency & Cascading Delay:**
   - If BART has `0` active dispatchers on `Employment_Roster`:
     - Systemwide on-time baseline drops from `0.85` to `0.70` (representing uncoordinated headways and manual dispatch hold-ups).
     - Increases vulnerability to weather: rain penalty doubles from `-0.05` to `-0.10`.
2. **Conductor / Train Engineer Absence → Fleet Bottleneck & Headway Stretch:**
   - If BART has `0` train engineers/conductors:
     - The system cannot run scheduled train sets. Ridership volume is capped at 60% of capacity (`ridershipMod *= 0.60`).
     - Crowding penalty on OTP triples (`onTime -= 0.09`), as stations become severely congested with stranded passengers.
3. **Station-Level Coupling (Station Manager & Maintenance):**
   - Stations without an assigned Station Manager or Maintenance Technician experience higher variance and degraded station notes (`"station maintenance backlog"`, `"equipment breakdown"`).
4. **Worker Life Events as Transit Disruption Seeds:**
   - When a rostered transit employee experiences a severe life event in Phase 5 (illness, burnout, accident, labor grievance), Phase 2 of the subsequent cycle can read their status to trigger a Salient Transit Event (`updateTransitMetrics.js:286-298`, `causeType: 'transit-event'`, `causeDetail: 'BART delays — crew shortage / dispatch breakdown'`), establishing a true citizen-to-infrastructure causal loop.

---

### Question 4: Risks — Real-World Names
*BART and AC Transit are real-world names already on the Business_Ledger — note it as a question for the builder, not a finding.*

#### Architectural Context
- `AGENTS.md` states:
  > *"GodWorld is a constructed city simulation on Google Sheets, Apps Script, Node.js, generated Markdown, and agent-driven civic/newsroom workflows. The Sheets and their citizens are the simulated world — fiction in an alternate timeline. Never import real-world Oakland people, institutions, businesses, teams, events, or assumptions."*
- `docs/SIM_DOCTRINE.md` §15 states:
  > *"Real life and real-world Oakland are two separate things. Prosperity-era bars importing Oakland's problems and cynicism; it never barred adversity."*
- `BART` (Bay Area Rapid Transit) and `AC Transit` (Alameda-Contra Costa Transit District) are real-world municipal entities.
- However, they are already deeply entrenched across the GodWorld repository:
  - `Business_Ledger.jsonl`: `BIZ-00013` ("AC Transit") and `BIZ-00014` ("BART Oakland Division").
  - `Employment_Roster.jsonl`: 7 AC Transit employees, 2 BART employees.
  - Core code: `phase02-world-state/updateTransitMetrics.js:173` (`OAKLAND_BART_STATIONS`), `utilities/ensureTransitMetrics.js:104` (`AC_TRANSIT_LINES`).
  - Newsroom editions and reporter lexicons: Extensively referenced across scores of published editions.

#### Question for the Builder
> **Builder Question on Transit Canon:**  
> Should GodWorld preserve `BART Oakland Division` and `AC Transit` as permanently canonized legacy institutions in the simulation ledger (similar to how the Oakland A's are retained as the city's legacy baseball franchise), or does the builder plan an in-world rebranding or civic transition (e.g. to fictionalized entities such as "Bay Area Rail Transit", "Bay Metro", or the emerging "Fruitvale Transit Hub Authority" / `BIZ-00096`) to align strictly with the alternate-timeline doctrine?
