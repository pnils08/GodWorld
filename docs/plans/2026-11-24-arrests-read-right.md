---
title: Arrests Read Right Plan
created: 2026-11-24
updated: 2026-11-24
type: plan
tags: [engine, safety, active]
sources:
  - docs/plans/2026-11-23-hospital-record-reads-right.md §New concepts C1 (the C117 arrest numbers, the incident formula)
  - output/beats C117/C116 Crime_Metrics, Care_Justice_Census, Neighborhood_Map, Neighborhood_Demographics (read 2026-11-24)
  - engine-wiring cards 2026-11-24 (runCareJusticeDemand_ judicialIntakes; calculateNeighborhoodCrime_ incidentCount), in-session
  - docs/SIM_DOCTRINE.md §17
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.365"
  - "[[2026-11-23-hospital-record-reads-right]] — engine.364, the carry pattern this reuses"
  - "[[2026-09-21-care-and-justice-system]] — engine.254, the demand model and census"
---

# Arrests Read Right Plan

**Builder's words (2026-11-23):** "we will do arrests next". On three questions (carry the fraction; should crimes scale by residents; should a diverted case come off the arrests): "1 - yes 2 - yes, but there does need to be a mechanism in place for the smaller neighborhood that may run a higher crime rate, I think Dimond is one of the areas we choose to start here, instutions.md may shed some light on how we set out oakland post tech boom, 3 - yes diverted". 2026-11-24, on where a diversion comes off: "from charges before clearance, go with your recommendation".

**Goal:** a hood's crimes follow how many people live there at its own per-person rate, its arrests are the crimes not diverted times its clearance with the fraction carried, and the court's money and the custody count follow.

**Rows:** engine.365 · **Owner:** engine-sheet

## What was read (2026-11-24, C117)

| Thing | Found |
|---|---|
| Arrests | `careJusticeService.js` `Math.round(charges × clearance)`. 176 hood-Cycles C110–C117: 117 at 1, 55 at 2, 4 at 3, none at 0. C117 lost 1.76 of 29.76, C116 3.75 of 27.75. Court revenue (`judicialLifecycle.js` cityCourtRevenue_) and the custody stock (census, 2-Cycle stay) take the rounded number |
| Incidents | `updateCrimeMetrics.js` calculateNeighborhoodCrime_: `(propertyLevel + violentLevel) / 2 / 5.5`, then weather, per-event additions (chaos +2, celebration, pressure, nightlife +1, traffic +1), noise `round((rng − 0.5) × 4)`, one rounding. No population term. Lake Merritt (611 residents) 6, Downtown (2,797) 7 |
| Levels carry character already | From each hood's own causes (unemployment and youth against the city median, econ stress, hotspot pressure, chaos, sentiment, enforcement), reverting to the city median. C117 property level: Temescal (boom `behind`) 47.3; Dimond, Glenview, Ivy Hill (`skipped`) ~41; Downtown, West Oakland, Rockridge 36–37; Baylight (`anchor`) 33.2 |
| Diversions | OARI-deployed hoods: eligible = round(charges × 0.25), diverted = round(eligible × 0.5). Nothing subtracts them from arrests |
| Doctrine | SIM_DOCTRINE §17 (builder S470): "a hood-name-keyed numeric table on the cycle path is a canon violation". A per-hood crime dial is out; the mechanism reads each hood's own data |

## Design

1. **Crimes scale by residents.** Per hood, `residentFactor = hood residents / city mean hood residents` (Neighborhood_Demographics students + adults + seniors, the `demo` already in calculateNeighborhoodCrime_; the mean over the 22 computed once in updateCrimeMetrics_Phase3_). It multiplies the level term and the noise — the per-person part. The per-event additions stay whole per event (a chaos event in Lake Merritt is still a chaos event). The city total holds near today's, since the factors average 1. C117 shape: Lake Merritt ~1.6 + events, Downtown ~7.2 + events.
2. **The small-hood high-rate mechanism is the level.** With incidents scaled by residents, the level becomes the hood's per-person rate. A small hood whose own causes push its level up runs a higher rate than a big hood at the city median, and Dimond's standing level (boom `skipped`, from its canon) carries through as its rate. No hood-keyed number (§17).
3. **Diversions come off the charges before clearance** (builder 2026-11-24). `expectedArrests = (charges − diverted) × clearance + carry`; arrests = the whole part; the remainder carries. Diverted ≤ eligible ≤ charges, so the base is never negative.
4. **The arrest fraction carries**, the engine.364 pattern: own key `PREV_ARREST_CARRY_JSON`, start 0.5 (= rounding on the first Cycle, with the diversion change it will differ in OARI hoods only), `careJusticeAdmitSplit_` reused.
5. **The incident count stays whole** (the cop-car named pass needs an integer; one incident is one charge). Its rounding is unbiased across the hoods; no carry on incidents.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Resident factor in `updateCrimeMetrics.js` (mean in the Phase-3 caller, factor on the level term and the noise; throws on a hood with no residents, as the care demand does) | es | built (this commit): `crimeResidentFactor_`, `crimeCityMeanResidents_`, `incidentParts` + one log line; crime tests 55/55, hood identity 38/38 |
| 2 | Arrests in `careJusticeService.js`: charges less diversions, times clearance, plus carry; carry save/seed on `PREV_ARREST_CARRY_JSON` (`finalizeCycleState.js`, `loadPreviousEvening.js`) | es | built (this commit); demand-v3 |
| 3 | Readers: police reporter's slice and the police chief worker show what the census now says (no code change expected; verify by render) | es | not started |
| 4 | Tests: carry, diversion, resident factor; existing fixtures that pin incident counts read | es | carry + diversion: careJusticeService 365a/b/c (29/29); census 102, court revenue 105, judicial 157 pass. Resident factor: with Task 1 |
| 5 | Truth docs: SHEETS_MANIFEST Carry_Forward_Store key; ENGINE_MAP; STUB_MAP | es | not started |
| 6 | Bench: two fires from a live sync; read per hood incidents vs residents × level, arrests = floor((charges − diverted) × clearance + carry), census complete, court revenue line | es | done — bench.log C118 PASS 178 s (city 143 incidents, 29 arrests), C119 PASS 158 s (134, 31; fire 1 carry read), every hood = floor((charges − diverted) × clearance + carry), census complete; final sync |
| 7 | agy adversarial review (builder 2026-11-24: "we will aslo have it review the arrest job after") | agy | not started |
| 8 | PROD push with engine.364's F3 (carry type check); smoke C119 | es | not started |

## Acceptance

1. Bench: each hood's incidents track residents × its level (Lake Merritt, KONO, Uptown, Baylight near 1–3; the big hoods near 6–9); the city total within ±15% of C117's 133.
2. Bench: arrests per hood = floor((charges − diverted) × clearance + carry); fire 2 reads fire 1's carry; census complete both fires.
3. Bench: court revenue cases = the arrests less tracked; the custody stock follows.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| wiring cards (two) | es | in-session 2026-11-24 | read-only |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | Diversions off the charges before clearance | builder | 2026-11-24 "from charges before clearance, go with your recommendation" |
| A2 | No per-hood crime dial; the mechanism is each hood's own level as a per-person rate | es | SIM_DOCTRINE §17 |

### Needs proof

| # | Claim | Proof that settles it |
|---|---|---|
| N1 | City-level bars (story seeds: true incidents > 10 / > 5, enforcement capacity < 0.6 / > 1.3; enforcement load) do not move, since the total holds | bench city totals vs C117 |

### New concepts

| # | Concept | Status |
|---|---|---|
| C1 | A stronger pull for the hoods the boom passed over (a term on BoomIndex / BoomExposure, its weight on World_Config) if Dimond's standing level is not the higher rate the builder means | held: his word |

## Changelog

- 2026-11-24 (engine-sheet) — Plan written: rulings 1–3 and the diversion order quoted; Dimond read against §17 and the levels.
- 2026-11-24 (engine-sheet) — Dry run on C117 (constant inputs, six weeks): small hoods 9–10 crimes per 1,000 now → 1.8–3.3 scaled; big hoods +1 each; city 133 → 136; Dimond 3.66 per 1,000, third; big hoods still alternate 1 and 2 arrests. Carry + diversion built ahead of the scaling (advisor: the fully ruled part first).
- 2026-11-24 (engine-sheet) — Builder "go" on the scaling as designed (rate from the crime system's causes; per-event additions whole, so a small busy hood runs higher per resident). Built Task 1; no feed marking (builder: "i dont want to puppet crons").
- 2026-11-24 (engine-sheet) — Bench two fires PASS on 87d311ba8. Small hoods by what happens in them: Lake Merritt, Baylight 2 incidents; KONO 4 (7.3 per 1,000) and Uptown 4 then 3 on their events; Dimond 3.2 then 2.7 per 1,000. agy review sent.
