---
title: Employment System Cascade Plan
created: 2026-08-29
updated: 2026-08-29
type: plan
tags: [engine, employment, economy, neighborhoods, cascade, active]
sources:
  - Builder direction 2026-08-29 (S397 engine-sheet) — the six-point brief captured verbatim in §Direction below
  - docs/canon/INSTITUTIONS.md §Neighborhoods (lines 324–420) — the penned hood canon; THE base every layer here derives from
  - docs/research/2026-08-27-cascade-loop-closure-design.md — employment open-loop trace, retune + steering + talk-back extraction
  - docs/plans/2026-08-29-city-health-system.md — engine.133, the illness half this mirrors (§Next filed engine.135)
  - docs/for-claude-review/2026-08-29-grok-business-ledger-hood-fill.md — grok's 72-row fill (review delegated to engine-sheet 2026-08-29, align to canon essence)
  - docs/plans/2026-08-09-wealthlevel-networth-bands.md — S363 WealthLevel = pure NetWorth bands (the scale this plan revisits)
  - docs/research/2026-08-01-simulation-realism-audit.md — S361 hazard: wealth scale calibrated from real-world Oakland
  - Live sheet read 2026-08-29 C104 (scratchpad hoodEmp.js): WP employmentRate 0.9015 / attractor 0.90; 21 ND hoods 5.3–7.3% unemployed, 6.69% city; Neighborhood_Map.MedianIncome 11/22 placeholder (73.5–73.7k), Piedmont Ave 72k, KONO 32.7k; Business_Ledger Σ Employee_Count Downtown 6738 … Temescal 89, Laurel 13, five hoods 0; East Oakland has no ND row
pointers:
  - "[[engine/ROLLOUT_PLAN]] — engine.135 row (parent); engine.134 hood identity folds in here"
  - "[[2026-08-29-city-health-system]] — the illness twin; same discipline (wiring cards → test → bench → live)"
  - "[[../research/2026-08-27-cascade-loop-closure-design]] — trace + extraction this executes"
  - "[[../canon/INSTITUTIONS]] §Neighborhoods — the spec"
  - "[[../reference/DEPLOY]] — nothing in this plan enters the 2026-08-30 window"
  - "[[index]] — registered same commit"
---

# Employment System Cascade Plan

**Goal:** The employment layer — city dial, hood distribution, tracked businesses, citizen salary/wealth, career engine, placement — derives from the penned neighborhood canon and moves by life events, not per-cycle rewrites.

**Architecture:** Same shape as engine.133 (illness), applied to money. World_Config sets a realistic-with-boom-kick city employment number; `updateNeighborhoodDemographics_` fills that envelope unevenly from a machine-readable hood economic profile derived from INSTITUTIONS §Neighborhoods; Business_Ledger gets its six-per-hood floor with rows written to the same profile; the Simulation_Ledger salary/net-worth scale is re-based on the same profile so WealthLevel, career soft-push and net-worth-driven moves true up; the per-cycle career/salary rewriters are quieted so employment changes are events with consequences. Replaces: the flat `adults × (1 − rate)` copy, the 0.90 setpoint, the four training-data hood tables as economic authority, and every forcing loop the wiring cards name.

**Terminal:** engine-sheet (owns every task). research-build: none. Guest lanes: grok's fill is input, not authority.

**Status:** ACTIVE — approved 2026-08-29 22:21 (Q1–Q4 answered); tasks expand per phase as each is picked up. **Sequencing lock:** nothing here touches the 2026-08-30 live window (deploy engine.132+133 → one illnessRate cell → builder fires). This plan benches after that cycle lands.

---

## Direction (builder, 2026-08-29 — the spec; do not paraphrase away)

1. **City dial.** Like illness, the city employment number must not sit at an unrealistic 90%. World_Config is set the way the illness work was: real-world realistic, with a kick toward boom-city.
2. **Hood layer.** As the health system did: neighborhood numbers sit inside the city number, never flat across, and align with the sim's essence placed on each neighborhood in 2041 boom-city Oakland. The penned canon (INSTITUTIONS §Neighborhoods, S374) is the core base for building out these systems. *Where it is saved / used today:* saved at `docs/canon/INSTITUTIONS.md:324-420`; read by NO engine placement or economy code — `NEIGHBORHOOD_PROFILES` (`utilities/ensureNeighborhoodDemographics.js:48`), `NEIGHBORHOOD_CRIME_PROFILES` (`utilities/ensureCrimeMetrics.js`), `NEIGHBORHOOD_ECONOMIES` (`phase*/economicRippleEngine.js:105`, 11 hoods only) and `Neighborhood_Map.MedianIncome` all predate it and were filled from training-data Oakland (civic.23 finding). Only `lib/districtMap.js` (district assignment) conforms to it.
3. **Business fill.** Review of grok's 72 new businesses (`output/grok/business-ledger-hood-fill-c104.json` + inbox md) is delegated to engine-sheet: names and data must align to the sim and the seeded canon essence. Essence-leak names (spec adjectives as shop signs) get renamed; Emp/Salary/Revenue re-based to the scale in point 4.
4. **Wealth scale.** Realign the true wealth-level scale in Simulation_Ledger — revisit salaries and neighborhood demographics against the same canon base — so the career engine's soft push and citizens moving to areas appropriate to their net worth true up cleanly.
5. **Quiet the rewriters.** Stop the employment roster from rewriting each cycle: too much career change, salary adjustment, and any old system forcing employment stops in favour of what this plan produces.
6. Use engine subagents as needed; ask before starting where unclear.

### Direction, second pass (builder, 2026-08-29 22:11 — answers Q1 + Q2, adds the placement + business rules)

7. **Q1 = scale change + pay-scale realignment.** No row sweep.
8. **WealthLevel is NetWorth-derived, by code, every cycle** — agree and set the bands (see §WealthLevel bands below).
9. **Neighborhoods admit WealthLevel / NetWorth bands.** A citizen moves into a hood only if their WealthLevel fits its band — a WL9 does not live in a WL1–3 hood.
10. **Every business on the ledger — the 103 existing and the 72 new — is revised to embody the INSTITUTIONS boom history of its hood.** Businesses and canon tell the same story.
11. **Pay scales realigned to the sim's current state as canon lays it out.** The intent: neighborhoods accurate → businesses in them accurate → citizens moving into them accurately → rows self-heal.
12. **Tracked-employer floor:** a citizen already working a tracked business has Income raised to that business's minimum if below; never reduced if above. **Sports-layer salaries exempt** (game engine owns them).
13. **Self-employed and UNTRACKED / off-ledger** salaries are adjusted to the new scale too.
14. **Employment roster is append-only / individual-change-only. "Nothing free."** No promotion because N cycles passed. **CareerStage is age-related.** A chaos car or a dice-roll lottery may hit someone; there is no standing job-hopping or salary drift for no reason. Every old system that pushes everything up is out.
15. **Business success is the causation:** a business's success drives its layoffs, hiring, **and** promotions / raises for current staff.
16. **Retired or deceased → Income 0.**

---

## WealthLevel bands (proposal — engine-sheet, pending builder sign-off on the hood column)

NetWorth → WealthLevel: S363 thresholds 0–9 stay (`deriveWealthLevel_`, `generationalWealthEngine.js:594`): 0 <1k · 1 ≥1k · 2 ≥10k · 3 ≥25k · 4 ≥50k · 5 ≥100k · 6 ≥250k · 7 ≥500k · 8 ≥1M · 9 ≥5M. **Top extended 10 → 12 (builder pushback 2026-08-29: Varek at $10B and a $50M citizen are not the same level):** 10 ≥$50M · 11 ≥$250M · 12 ≥$1B. Live fit (snapshot 2026-08-29): ≥$50M = 18 rows (athletes $90M–$225M → 10), ≥$250M = 4 (Keane 450, Dillon 400, Kelley 375 → 11), ≥$1B = 1 (Varek → 12). Nobody below 10 moves. Readers to extend in the same commit: `SAVINGS_RATE_BY_WEALTH` (`:100`, add 11: 0.22, 12: 0.25), the 3 numeric `wealthLevel >=` comparisons (grep at task time), the hood band column below (elite hoods open-ended: `8+`). Recomputed every cycle by `captureWealthLevels_` (`:560-590`, already live). Live distribution (snapshot 2026-08-29): WL0 105 · 1–4 54 · 5 111 · 6 247 · 7 219 · 8 200 · 9 27 · 10 1 — the ledger skews rich; the hood bands below are what make that skew land somewhere specific.

Hood admission band (WealthLevel min–max for a move-in; residents already inside a hood are not evicted by this table — mismatches heal by moves, Phase F). Each line cites the INSTITUTIONS entry it reads from.

| Hood | WL band | Canon line |
|---|---|---|
| Lake Merritt | 8+ | inherited money, the elite address the boom never touched |
| Rockridge | 7–11 | earned money — doctors and directors |
| Piedmont Ave | 7–11 | boutique/medical corridor serving the lake-ring money |
| West Oakland | 6+ | boom born here; built-out and expensive; first-wave money (Mims WL9 canon-pinned) |
| Baylight District | 6+ | new-build showcase, tech buyers, brand-new units |
| Brooklyn | 6–8 | newest mid-rise after Baylight, quieter |
| Jack London | 5–8 | waterfront office + nightlife |
| Downtown | 5–8 | institutional spine, money administered |
| Grand Lake | 5–7 | lake ring's public face, family retail |
| Fruitvale | 4–7 | transit-hub young professional over a multigenerational base |
| Uptown | 4–7 | young-professional entertainment district |
| Adams Point | 4–7 | younger and renting, the lake without the lineage |
| Chinatown | 3–7 | refused; multigenerational family businesses that predate the campuses |
| KONO | 3–6 | emerging arts corridor |
| Eastlake | 3–6 | lake money thins into the flatlands |
| Laurel | 3–6 | family belt that stayed reachable; works in the boom without living in it |
| Dimond | 3–6 | village living down a name; prosperity arrived late |
| Glenview | 3–6 | intact, unremarkable, cheap by reputation |
| Ivy Hill | 3–6 | quiet to invisibility |
| East Oakland | 2–6 | frontier, the boom arriving fast — widest band in the city |
| San Antonio | 2–5 | working core, pressured, where the people who service the boom live |
| Temescal | 2–5 | left behind, health-strained; not squalor |

Pay scale follows the same table: a hood's income tier sets the salary band for its businesses (`Avg_Salary`) and for UNTRACKED / self-employed residents; the tracked-employer floor (point 12) = `Avg_Salary × 0.75` (entry/early) · `1.0` (mid) · `1.3` (senior). Numbers re-based against the S363 thresholds so a mid-career resident of a WL 6–8 hood accrues toward WL6–7 on that hood's pay, not past it.

**Canon-pinned exemptions (engine-sheet rule):** Tier-1 citizens are never auto-moved or re-paid by this plan; Tier-2 only by a story event. Sports-layer rows untouched (point 12). Real-world Stack rows (INSTITUTIONS §The Stack) keep their names.

**Existing-business revision scope (engine-sheet rule, pending builder confirmation):** fields re-base (Avg_Salary, Employee_Count, Growth_Rate, Sector where wrong); names and Neighborhood stay — the four child-fold rows are still not remapped; real-world names already on the ledger stay per the S361 mutation line unless the builder says otherwise.

**CareerStage from age (point 14):** student <22 · early 22–29 · mid 30–44 · senior 45–64 · retired ≥65; `YearsInCareer` breaks ties at the edges (a 46-year-old with 3 years is mid). This is a derivation, so it re-stamps CareerStage on every civilian row once — engine.82 (`docs/plans/2026-08-11-careerstage-salary-coherence.md`) designed the canonical enum + derivation + per-role salary bands S366 and was **reverted in full** (`f05a59e4`) because the column-repair script's 0-indexed `startCol` clobbered YearsInCareer (940 cells; restored, verified) — an incident, not a design rejection. Its Tasks 1–3 fold into this plan; the lesson binds: **stage/pay derivations run inside the engine on `ctx.ledger` rows (Phase-10 persist), never as a column-position script**; the 216 false-retired + 10 spelling variants it measured at C103 are this plan's CareerStage baseline. engine.82 row → superseded by engine.135 on accept.

---

## Phases (tasks expand under each once cards + answers land)

### Phase A — City dial (World_Config + one WP cell) — CODE DONE, BENCH WRITES DONE 2026-08-29; proving next
- `applyDemographicDrift_`: the 0.0003 step is replaced by a pull — `emp += (attractor − emp) × employmentAttractorPull` (0.12), symmetric, illness-style (engine.133 D2). Defaults 0.96 / floor 0.88. Bench World_Config keys retuned + WP cell written (DEPLOY.md bench-write log #2).
- `employmentAttractor` 0.90 → **0.96** (4% unemployment: realistic 5%, boom kick −1pp) — engine-sheet's number, builder may override. `employmentFloor` 0.80 → 0.88. `employmentFallbackRate` 0.91 → 0.96.
- WP `employmentRate` cell written to the hood-lived aggregate at write time (live C104: 0.933) — a cell alone is dead (the band steps it back within cycles), so retune + cell + envelope bench together as one wave. Config retunes get a bench fire (engine.102 proof pattern).

### Phase B — Hood economic profile + envelope
- **B1 — machine-readable canon. DONE on bench 2026-08-29 (22/22 read-back exact); LIVE REPLAY PENDING at the wave deploy.** Home = six `Neighborhood_Map` columns (ADR-0016: sheet is truth; the v3 writer owns only A–O so appended columns persist): `IncomeTier` 1–6, `BoomExposure` label, `BoomIndex` −1…+1, `EmployerCharacter` label, `WealthMin`/`WealthMax` (admission band), plus `MedianIncome` re-based (B4 folded in). `loadNeighborhoodState_` reads them into `S.neighborhoodState` (`incomeTier, boomExposure, boomIndex, employerCharacter, wealthMin, wealthMax`). Writer script: scratchpad `hoodProfile.js` (table below is the durable copy; re-run against live with `--apply` at deploy — it resizes the grid, appends headers, writes rows, reads back). The table replaces the four training-data hood tables as the economic authority; the age-mod tables stay age-only.

  | Hood | Tier | Boom | Idx | Employer | WL | MedianIncome | INSTITUTIONS line |
  |---|---|---|---|---|---|---|---|
  | Lake Merritt | 6 | untouched | 0.3 | residential | 8–12 | 185000 | :332 |
  | Rockridge | 5 | earned | 0.7 | professional | 7–11 | 160000 | :387 |
  | Piedmont Ave | 5 | corridor | 0.4 | medical | 7–11 | 150000 | :381 |
  | West Oakland | 5 | born | 0.9 | campus | 6–12 | 145000 | :347 |
  | Baylight District | 5 | anchor | 1.0 | stadium | 6–12 | 140000 | :336 |
  | Brooklyn | 4 | new-build | 0.8 | residential | 6–8 | 130000 | :349 |
  | Downtown | 4 | spine | 0.6 | institutional | 5–8 | 120000 | :353 |
  | Jack London | 4 | evening | 0.6 | nightlife | 5–8 | 118000 | :357 |
  | Grand Lake | 3 | public-face | 0.4 | retail | 5–7 | 105000 | :393 |
  | Fruitvale | 3 | transit | 0.7 | transit-retail | 4–7 | 98000 | :361 |
  | Uptown | 3 | nightlife | 0.6 | nightlife | 4–7 | 96000 | :334 |
  | Adams Point | 3 | spillover | 0.4 | residential | 4–7 | 95000 | :391 |
  | Chinatown | 3 | refused | 0.0 | family-retail | 3–7 | 84000 | :355 |
  | KONO | 3 | emerging | 0.3 | arts | 3–6 | 82000 | :330 |
  | Eastlake | 3 | mixed | 0.0 | mixed | 3–6 | 84000 | :395 |
  | Laurel | 3 | reachable | −0.1 | schools-retail | 3–6 | 86000 | :399 |
  | Dimond | 2 | skipped | −0.4 | village-retail | 3–6 | 80000 | :369 |
  | Glenview | 2 | skipped | −0.4 | residential | 3–6 | 82000 | :371 |
  | Ivy Hill | 2 | skipped | −0.4 | residential | 3–6 | 78000 | :373 |
  | East Oakland | 2 | crossing | 0.2 | construction | 2–6 | 72000 | :377 |
  | San Antonio | 2 | absorbed | −0.3 | service-labor | 2–5 | 70000 | :363 |
  | Temescal | 1 | behind | −0.7 | clinic | 2–5 | 68000 | :385 |
- **B2 — `buildHoodEmploymentWeights_` — CODE DONE 2026-08-29, unit-proven (`scripts/employmentEnvelope.test.js` 18/18; illness suite 29/29 untouched).** structural = income (city mean / MedianIncome, ±0.5, clamp 0.5–1.8) × boom (1 − 0.35 × BoomIndex, 0.6–1.4) × depth (log2 of tracked jobs-per-adult vs city mean × −0.15, clamp 0.8–1.2, no rows = neutral); product clamped [employmentHoodWeightMin, Max]. **event = 1.0 this wave** — chaos business cuts + economic initiatives land with Phase E (employer success as cause), not as a bolt-on here. Σ hood unemployed = (1 − city) × Σ adults; converge 25%/cycle floor 3; `S.neighborhoodEmploymentWeights`. Employer depth = `S.hoodEmployerDepth` folded into `buildCommuteFlows_`'s existing Business_Ledger read (Phase 2, exact hood match). Config self-arm `ensureEngine135Config_` (4 keys).
- **B3 — East Oakland ND row — DONE on bench S398 (C130: 795/2500/523/156/136, read-back exact); LIVE REPLAY at the wave deploy** (DEPLOY.md bench-write log #3, formula recomputes from the target sheet's peers — NOT `seedNeighborhoodDemographicsFromLedger_`, which counts ledger rows and would seed ~46 people).
- **B4 — `Neighborhood_Map.MedianIncome` canon pass** — 11 placeholder hoods + Piedmont Ave 72k + KONO 32.7k re-based from the B1 profile (engine.133 illness weights already read this column live; contamination is deployed).

### Phase C — Business_Ledger six-per-hood fill (grok's 72, reviewed)
- **DONE on bench S398 (2026-08-30, C131 state): 72 rows appended BIZ-00115–00186, read-back 72/72 exact, high-water 186; every ND hood ≥ 6 (only the four child-fold aliases sit under). LIVE REPLAY at the wave deploy** — payload `output/grok/business-ledger-hood-fill-c104.reviewed.json` (ids reassigned from live high-water at write time; salaries recomputed from live's `MedianIncome` — **B1 NM replay must land first**, the script refuses if `IncomeTier` is absent). 46 of 72 renamed (map in the JSON): every spec-adjective / essence-phrase name (Spillover, Continuity, Reachable, Frontier, Crossing, Thin Line, Pressure, Working Core, Between Hub, Ordinary Street, Lake Ring ×2, Belt ×2, Rim ×3, Pocket ×2, Settled, Flatlands, Corridor, Slope ×3 …) → street / geographic / plain names. Employee_Count and Growth_Rate kept from grok (no headcount scale exists to re-base to; growth already tracks BoomIndex). Avg_Salary + Annual_Revenue re-based to §Pay scale below (grok's were real-world 2026 wages, 35–52k flat across hoods).
- Rename essence-leak rows (Reachable Market, Continuity Market, Between Hub Market, Working Core Pharmacy, Thin Line Market, Pressure Laundry, Ordinary Street Kitchen, Frontier Market, Crossing Cafe, Spillover Cafe, + any found on full pass); check each hood's mix against its INSTITUTIONS entry (D4 villages quiet; Chinatown family continuity; Piedmont Ave clinic-class; East Oakland frontier not blight).
- Re-base Avg_Salary / Employee_Count / Annual_Revenue to the Phase D scale before append.
- Append via `lib/sheets.js` with `getBizIdHighWater` re-scan at write time (heritage may mint a BIZ row on 2026-08-30); ids are proposals. No remap of the four child-fold rows; no scrub of existing real-world rows.
- Accept flow per `docs/for-claude-review/README.md` on landing.

### Phase D — Wealth / salary scale realign
- **§Pay scale (engine-sheet, set S398 for Phase C; Phase D code draws from the same rule):** a business's `Avg_Salary` = its hood's `Neighborhood_Map.MedianIncome` (B1) × sector factor, rounded to 1k; `Annual_Revenue` = `Employee_Count × Avg_Salary × 2.0` (payroll ≈ half of revenue for a storefront). Sector factors: Retail 0.55 · Services 0.55 · Cafe / dining 0.50 · Restaurant & Dining 0.52 · Food & Beverage 0.52 · Nightlife & Entertainment 0.55 · Healthcare 0.95 (ledger comparables: Kaiser 102k on Piedmont Ave 150k ⇒ 0.68, Temescal CHC 88k on 68.5k ⇒ 1.28; 0.95 sits between). Result on the fill: Temescal/San Antonio storefronts 35–39k, Laurel 43–47k, Grand Lake 53–58k, Brooklyn 65–71k, Rockridge 84–89k, clinics 74k (Ivy Hill) → 154k (Rockridge). Professional / tech / construction factors are Phase D's to set when the 103 existing rows are re-based (Q4). Tracked-employer floor (point 12) reads `Avg_Salary` × 0.75 / 1.0 / 1.3 by stage.
- Measure: ledger Income p10/p50/p90 = 31k/81k/180k, max 100M; NetWorth p50 442k, max 10B (snapshot 2026-08-29). WealthLevel bands are already GodWorld's own (S363, pure NetWorth). The defect is the Income/NetWorth VALUES and their hood placement, not the band edges.
- Design: per-hood income envelope from the B1 profile (tier → salary band + net-worth band); `applyEconomicProfiles` / mint / settle draw from the hood band; `deriveWealthLevel_` bands re-checked against the new envelope.
- Existing rows: **see Open question 1** — scale change (bands + future draws + outlier diff-restore) vs a row sweep.
- **D1 — DONE on bench S398:** `deriveWealthLevel_` 10 ≥$50M · 11 ≥$250M · 12 ≥$1B; `SAVINGS_RATE_BY_WEALTH` 11: 0.22 / 12: 0.25 (commit a2b6d2b1).
- **D5 — DONE on bench S398:** `calculateCitizenIncomes_` zeroes Income for Status deceased/retired or CareerStage retired; sports layer exempt outright. C133: 112 retired + 16 deceased zeroed; 0 GAME rows touched.
- **D6 — the 103 existing rows, fields-only (Q4) — storefront class DONE on bench S398 (DEPLOY.md bench-write log #5):** 32 rows in Restaurant/Cafe/Fast-food/F&B/Nightlife/Retail/Services/Corporate sectors re-based by the §Pay scale (`Avg_Salary`, `Annual_Revenue`; `Growth_Rate` only where it was the template `8` → boom-derived `clamp(2 + 3×BoomIndex, 1, 6)`). Examples: Temple Lounge 105k→67k, Fruitvale Diner 105k→51k, Merritt Club 160.6k→102k, Talent Agency 300k→67k, Presti Accounting 300k→122k, Vance's Vintage 42k→80k (West Oakland's boom pay). **Left for a later pass:** institutions / tech / construction / architecture / faith / sports rows (near-scale already; their sector factors are not set), `Oakland Casino Town` (kimi's casino-ledger watch, Mike-only sign-off), the four child-fold aliases, and the bench-minted heritage rows (BIZ-00108+, bench-only). `Annual_Revenue` garbage on institutional rows (negative numbers, currency strings) is read by `chaosCarsEngine` decay — a follow-up.
- **D3 — tracked-employer floor — DONE on bench S398 (bench @11, C134: 0 new errors; 456 tracked Tier-3/4 workers checked, 289 raised to floor, 0 below; tracked-worker Income p50 100k; WealthLevel now spans 0–12 with 11 ×3 / 12 ×1 as predicted). Sports-franchise employers set no floor (guard added after the prediction caught a front-office row at the athletes' 3.3M average):** `applyTrackedEmployerFloor_` in `generationalWealthEngine.js`, Step 1.5 after `calculateCitizenIncomes_`. Floor = employer `Avg_Salary` × 0.75 / 1.0 / 1.3 by stage class; raise-only; Tier 3–4 only; sports / student / retired / deceased / untracked / no-salary employers exempt; silent (no LifeHistory). Sequenced after D6 so template salaries never set a floor.
- **D2 / D4 — NEXT:** per-hood income envelope for new draws (`drawIntakeProfile_` in godWorldEngine2, `processAdvancementIntake_`, `householdFormationEngine`, `bondEngine` GC_SPOUSE_INCOME constant, `calculateIncomeFromBand_` fallback) scaled by `S.neighborhoodState[hood].medianIncome` / city mean; UNTRACKED / SELF_EMPLOYED (237 rows) re-based to the hood band.

### Phase E — Quiet the rewriters (career engine soft push)
- **E1 — DONE on bench S398 (2026-08-30; commit a2b6d2b1; SANDBOX 0827 @9, fire C133: 0 new errors).** `updateCareerProgression_` now DERIVES CareerStage from age via `deriveCareerStageFromAge_` (student <22 · entry 22–29 · mid 30–44 · senior 45–64 · retired ≥65; YearsInCareer breaks ties downward; 0/blank years = unknown → pure age band). The ENTRY→MID / MID→SENIOR calendar rolls are deleted — no rng, no LastPromotionCycle write, no `stampPromotion_` (kept for E2). Sports layer untouched. Bench C133 result: 323 re-stamps on first fire (166 senior→mid, 9 false-retired <65 corrected, 24 blanks); afterwards every non-sports row is age-consistent (22–29 all entry; 30–44 267 mid; 45–64 362 senior; 65+ 111 retired). Proof: `scripts/careerStage.test.js`.
- **E2 — NEXT:** promotions / raises / layoffs / hiring caused by employer success (`runCareerEngine_` `maybeTransition_` re-based to ≈1–2 Income-moving transitions per cycle, pressure-steered by dial-vs-attractor; `stampPromotion_` becomes its narrative; `detectCareerMobility_`'s CAREER_STAGNATION hook (5%/cycle of rows ≥40 cycles since promotion) needs re-basing too, since LastPromotionCycle now only moves on a real promotion).
- **Measured (LifeHistory_Log, live 2026-08-29):** career-tagged events/cycle C94–C102 = 12–16 (mostly `Career` flavour text, no ledger change; 2 `Promotion`/cycle); **C103 = 35, C104 = 51** — `Promotion` 13 → 29, `Career-Hired` 8 → 5, `Career-FieldChange` 3 → 5.
- **The rewriter:** `updateCareerProgression_` (`phase05-citizens/educationCareerEngine.js:~395-420`) — every non-sports adult 22–64 in class MID with `YearsInCareer ≥ 10` and ≥ 20 cycles since `LastPromotionCycle` rolls 5/10/15% (by education) **every cycle** → `senior` + LifeHistory line + `Promotion` log row. Ledger today: 347 mid-class, 652 citizens with ≥ 10 years, 354 blank `LastPromotionCycle` → ~24 promotions/cycle, the whole mid class senior in ~15 cycles. Stage-only (Income untouched) but it is the roster rewrite the builder sees. Entry→Mid twin at 15%/cycle after 10 cycles. `YearsInCareer` accrual is already gated (+0.5 per 26 cycles, engine.62b).
- **`runCareerEngine_` `maybeTransition_` (`runCareerEngine.js:367-400`):** per-citizen per-cycle promo ≤ 8% (+6–12% Income), layoff ≤ 7% (−12–20%), sector shift ≤ 5% (−10–+5%), lateral ≤ 5% (±3%), 6-cycle gap between transitions, LIMIT 10 events/cycle; `matchUnemployedToOpenings_` (`:1160-1199`, Career-Hired, +5–10% / ±5%) and the headcount-reconciliation layoff (`:1326`, −12–20%). These are the Income movers.
- **Not employment:** `checkForPromotions_` is Generic_Citizens → ledger emergence (tier), leave alone. `generationalWealthEngine.js:456,490` Income writes — classify at task time (retirement/inheritance context).
- **Cut (pending Q2):** (a) `updateCareerProgression_` stage rolls → event-driven only (a promotion is a `runCareerEngine_` transition with an Income consequence, not a calendar roll); (b) `maybeTransition_` odds re-based so expected churn ≈ 1–2 Income-moving transitions per cycle across the ledger, pressure-steered by the dial-vs-attractor gap; (c) reconciliation layoff kept (ground truth), rate-limited.

### Phase F — Placement by net worth
- `migrationTrackingEngine` / `householdFormationEngine` / intake placement read the B1 income tier so moves land where a citizen's net worth belongs. Fold, not add.

---

## Live-wave replay checklist (engine-sheet, Tier A — moved here from DEPLOY.md 2026-08-30; DEPLOY.md holds protocol + pointers only)

Code: the bench @11 tree (prod @7 + engine.135 A/B1/B2 files + `runYouthEngine.js`, `educationCareerEngine.js`, `generationalWealthEngine.js`) pushed to prod as one wave. Sheet writes replayed on live IN THIS ORDER, each dry-run → apply → read-back:

1. `Neighborhood_Map` B1 profile (six cols + MedianIncome) — §B1 table is the durable copy. Everything below refuses without `IncomeTier`.
2. `Neighborhood_Demographics` East Oakland row — recompute from live peers (§B3).
3. `World_Config` B24–B26 (`employmentFallbackRate`/`employmentFloor`/`employmentAttractor` → 0.96/0.88/0.96) + `World_Population!D2 employmentRate` ← hood-lived aggregate over the 22 live ND rows at write time.
4. `Business_Ledger` 72-row fill — `output/grok/business-ledger-hood-fill-c104.reviewed.json`, ids from live high-water.
5. `Business_Ledger` 32 storefront rows re-based (§D6 rule).
6. Same commit: `SCHEMA_HEADERS` + `docs/SPREADSHEET.md` counts (ND 22 rows, NM 30 cols, BL +72).

Bench record (verbatim from DEPLOY.md, S397–S398):
- **Bench-side sheet writes to REPLAY at the engine.135 live deploy (log every one here):** (1) 2026-08-29 `Neighborhood_Map` — six appended cols `IncomeTier, BoomExposure, BoomIndex, EmployerCharacter, WealthMin, WealthMax` + `MedianIncome` re-based, 22 rows (scratchpad `hoodProfile.js --apply`, table in the employment-cascade plan §B1; grid resized 24→30). (2) 2026-08-29 `World_Config` B24–B26: `employmentFallbackRate` 0.91→0.96, `employmentFloor` 0.80→0.88, `employmentAttractor` 0.90→0.96; `World_Population!D2 employmentRate` ← hood-lived aggregate **computed at write time** (bench: 0.9109→0.9344; live will differ — recompute, never paste) (scratchpad `phaseA.js --apply`). The four engine.135 physics keys (`employmentAttractorPull`, `employmentHoodWeightMin/Max`, `employmentConvergenceRate`) self-arm via `ensureEngine135Config_` on first fire — no replay. (3) 2026-08-29 S398 `Neighborhood_Demographics` — **East Oakland row appended** (B3; ND was 21 hoods vs Neighborhood_Map 22, and the loaded-set rule skips a hood with no row). Values are **recomputed from the target sheet at write time, never pasted**: Students = mean(San Antonio, Fruitvale) × 1.2 (NEIGHBORHOOD_PROFILES studentMod), Adults/Seniors = peer mean, Unemployed = Adults × (1 − WP.employmentRate), Sick = pop × WP.illnessRate, LastUpdated = WP.cycle, the five school cols = peer mean. Bench result C130: 795/2500/523/156/136. NOT via `seedNeighborhoodDemographicsFromLedger_` — that path counts ledger rows (would land ~46 people against peers at ~2,500 adults). Replay on live with the same formula (live peers ≈ 335/1315/262 at C104). **Replay (3) BEFORE (2)'s `World_Population!D2` cell** — that cell is the hood-lived aggregate computed over ND at write time and should see 22 hoods, not 21 (sub-0.1pp either way; the attractor self-corrects — accepted noise if the order slips). (4) 2026-08-30 S398 `Business_Ledger` — **72 rows appended** (engine.135 Phase C, grok's six-per-hood fill reviewed: 46 renames, Avg_Salary/Annual_Revenue re-based to the plan's §Pay scale from `Neighborhood_Map.MedianIncome`). Bench ids BIZ-00115–00186, high-water → 186. **Replay ORDER on live: (1) Neighborhood_Map B1 profile first, then (4) this fill** — the fill recomputes salaries from the target's `MedianIncome` at write time, and live's column is still the contaminated placeholder set (KONO 32.7k) until B1 lands; the fill script refuses to run when `IncomeTier` is absent. Payload: `output/grok/business-ledger-hood-fill-c104.reviewed.json` (ids reassigned from live high-water at write time; expect BIZ-00108+ unless heritage minted). Read-back 72/72 exact on bench. (5) 2026-08-30 S398 `Business_Ledger` — **32 existing storefront-class rows re-based** (engine.135 D6, fields only: `Avg_Salary` + `Annual_Revenue` by the plan §Pay scale from `Neighborhood_Map.MedianIncome`; `Growth_Rate` only where it was the template `8`). Ids ≤ BIZ-00107 only; `BIZ-00100` casino skipped; institutions/tech/construction/faith/sports untouched. **Replay ORDER on live: after (1) B1.** Recompute at write time (scratchpad `rebaseBL.js` logic: sector-class regex → factor table in the plan §Pay scale; refuses without `IncomeTier`). Read-back 32/32.
- **S398 (2026-08-30) deployments @8–@11 = the @7 tree (799fd841 + engine.132/133 + engine.135 A/B1/B2) + exactly three files at repo HEAD: `phase05-citizens/runYouthEngine.js` (OAKLAND_SCHOOLS canon-voice fix), `phase05-citizens/educationCareerEngine.js` (E1), `phase05-citizens/generationalWealthEngine.js` (D1/D3/D5).** Staged from a `clasp pull` of the bench itself + those three files, so the HELD engine.131 T7 / civic-override files never moved (pull-back diff vs the pre-session bench: 0 other files). Fires C131 (B3 + schools), C132 (Phase C fill), C133 (E1/D1/D5), C134 (D3) — all HTTP 200, 0 new `Engine_Errors`. Bench Engine_Errors stays at 6 rows (2 cold-start FATAL + 4 pre-fix OAKLAND_SCHOOLS throws at C127–C130).

## Acceptance criteria (draft)
**Status S398 (bench @11, C134):** (1) formally PASS — `cascadeAudit` `unemployment-band` on the bench (hood 3.85% vs target 5.06%, inside ±2pp; WP not stepping back, 0.9377→0.9494 over C131–C134). (2) spread ≥2pp met by hand (Temescal ~10% vs Baylight ~3%) — **`cascadeAudit` has no `unemployment-spread` lane; owed before the live-wave gate**, and its `unemployment-band` divides by pop, not by Adults as Q5 defines — re-base the audit lane to Σ Unemployed / Σ Adults in the same change. (3) met (every ND hood ≥6, no spec-adjective names). (4) partial — WealthLevel 0–12 all populated, no longer capped; hood-banded draws are D2. (5) partial — calendar promotions gone (E1); Income churn now floor-only until E2 lands.

1. World_Config employment dial at the realistic-boom number; WP `employmentRate` inside 1pp of Σ hood-lived after one bench cycle and not stepping back.
2. Hood unemployment spread ≥ 2pp between the profile's top and bottom tiers within 5 bench cycles; Σ hood unemployed = city × Σ adults every cycle (cascadeAudit invariant).
3. Every ND hood (22) carries ≥ 6 Business_Ledger rows, none with a spec-adjective name.
4. Ledger Income/NetWorth draws for new/settled citizens land inside their hood's band; WealthLevel distribution no longer bimodal at 0 / 6–8.
5. Per-cycle Income/EmployerBizId churn on bench drops to the event-driven rate named in Phase E; no citizen changes employer without a LifeHistory event.

---

## Open questions

- [x] **Q1 — answered 2026-08-29:** scale change + pay-scale realignment; no row sweep. The only row-level Income writes are the tracked-employer floor (raise-only), UNTRACKED/self-employed re-base, and retired/deceased → 0.
- [x] **Q2 — answered 2026-08-29:** remove. No promotion because cycles passed; CareerStage is age-derived; promotions/raises/layoffs/hiring are caused by the employer's success (Phase E redesign).
- [x] **Q3 — approved 2026-08-29** (band table), with the pushback that extended the scale to 12.
- [x] **Q4 — approved 2026-08-29:** fields-only revision of the 103; names + hoods stay.
- [x] **Q5 — what `World_Population.employmentRate` measures — RESOLVED S398 (2026-08-29, builder delegated: "do whatever" to the direct question).** It is the **employed share of ND Adults 23–64**, the definition the hood code has enforced since 2026-01-26 (`Unemployed = Adults × (1 − rate)`), NOT the whole-population employed share (~50%). Attractor stays at the approved 0.96 = 4% adult unemployment. Zero code churn across the 16 readers; the 0.83 / two-number guesses stay rejected. Written into `SHEETS_MANIFEST.md` §1.

---

## Changelog
- 2026-08-30 (S398 close, later) — Acceptance status recorded; cascadeAudit run against the bench (unemployment-band PASS); audit owes an unemployment-spread lane + adults denominator.
- 2026-08-30 (S398 close) — D3 proven C134 (289 raises, invariant holds). Bench @11 carries A/B1/B2/B3/C/D1/D3/D5/D6/E1 + the youth fix; bench writes #1–#5 logged for the live replay. Remaining: D2/D4, E2, F, then the live wave (gated on Mike's smoke of prod @7).
- 2026-08-30 (S398, later) — E1 + D1 + D5 code shipped to bench (@9) and proven C133; D6 storefront re-base written to bench (32 rows); D3 floor coded + unit-proven, bench proof next. Plan §Phase D/E rows updated with DONE/NEXT state.
- 2026-08-30 (S398) — Phase C landed on bench (72 rows, 46 renames, pay re-base; §Pay scale set). Bench C131 (post-B3, post-schools fix): 0 new errors, ND 22 hoods, East Oakland integrated 807/2546/533, WP 0.9377→0.942, hood spread Temescal 10.2% … Baylight 3.0%. Schools fix proven in Node (vm): month 6 → graduation events, month 10 → homecoming, all in canon voice (C131 was sim month 7, so the bench could not exercise it). Grok's inbox file accepted → `docs/research/`.
- 2026-08-29 (S398) — Q5 dial definition resolved (adults 23–64 employed share, 0.96 kept; builder delegated). B3 East Oakland ND row seeded on bench. Side defect fixed: `runYouthEngine.js` `OAKLAND_SCHOOLS` (deleted S357) rebuilt in canon voice — six "an Oakland City Schools high school in <hood>" entries, no real names (INSTITUTIONS:93), youth phase no longer throws on graduation/homecoming cycles. Next: Phase C (grok's 72).
- 2026-08-29 (23:30, session close) — Engine-sheet departed from the plan mid-wave (changed the approved 0.96 to 0.83, invented a two-number model); reverted to the plan as approved. Bench config back at 0.96/0.88/0.96. Next session executes Phases B3→F as written.
- 2026-08-29 (23:30) — Phases A + B2 built: dial pull + envelope + depth + self-arm; test written first (RED 7 → GREEN 18/18); bench World_Config retune + WP cell written; STUB_MAP regenerated. Bench proving next.
- 2026-08-29 (23:00) — B1 written to SANDBOX 0827 (six columns + MedianIncome, 22/22 exact); loader reads them; live replay deferred to the wave deploy (builder rule: sandbox proves, live runs proven code + replayed writes).
- 2026-08-29 (22:21) — **Approved.** WealthLevel scale extended 10→12 on builder pushback (≥$50M / ≥$250M / ≥$1B); elite hood bands open-ended; Q3/Q4 closed; plan ACTIVE.
- 2026-08-29 (22:11) — Builder second pass captured (points 7–16): Q1/Q2 answered, hood admission bands, tracked-employer floor, business-success causation, CareerStage by age, retired/deceased Income 0. WealthLevel band table proposed; Q3/Q4 opened.
- 2026-08-29 (16:20) — Wiring cards returned (`runCareerEngine_`, `checkForPromotions_`); churn measured from LifeHistory_Log; the C103–C104 promotion spike traced to `updateCareerProgression_`; Phase E filled, Q2 sharpened.
- 2026-08-29 — Direction captured (S397 engine-sheet); phases sketched; wiring cards dispatched for `runCareerEngine_` and `checkForPromotions_`; live C104 numbers recorded in sources.
