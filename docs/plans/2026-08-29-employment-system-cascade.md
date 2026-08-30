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

### Phase A — City dial (World_Config + one WP cell)
- `employmentAttractor` 0.90 → **0.96** (4% unemployment: realistic 5%, boom kick −1pp) — engine-sheet's number, builder may override. `employmentFloor` 0.80 → 0.88. `employmentFallbackRate` 0.91 → 0.96.
- WP `employmentRate` cell written to the hood-lived aggregate at write time (live C104: 0.933) — a cell alone is dead (the band steps it back within cycles), so retune + cell + envelope bench together as one wave. Config retunes get a bench fire (engine.102 proof pattern).

### Phase B — Hood economic profile + envelope
- **B1 — machine-readable canon.** One table, `lib/hoodEconomicProfile.js` (or a `Neighborhood_Map` column set — decided at task time), one row per INSTITUTIONS hood: `incomeTier` (inherited-elite / earned-affluent / professional / working / pressured / behind), `boomExposure` (born / anchor / transit / crossing / untouched / refused / skipped / behind), `employerCharacter` (institutional / campus / nightlife / retail-village / residential / medical / …). Every value cites its INSTITUTIONS line. This is engine.134's deliverable, folded here — the profile replaces the four training-data tables as the economic authority; the age-mod tables stay age-only.
- **B2 — `buildHoodEmploymentWeights_`** in `updateNeighborhoodDemographics.js`, mirror of `buildHoodIllnessWeights_` (:315): structural = profile incomeTier × boomExposure × bounded employer depth (Business_Ledger Σ Employee_Count / adults, tracked-subset so presence-only, absent = neutral); event = chaos business cuts in the hood this cycle (+), economic initiatives in the hood (−), Σ ledger growth in the hood (−). Σ hood unemployed = city × Σ adults; clamp + converge as illness; `S.neighborhoodEmploymentWeights` for audit/story.
- **B3 — East Oakland ND row** seeded through `ensureNeighborhoodDemographics` (21 vs 22 today; the loaded-set rule silently skips it).
- **B4 — `Neighborhood_Map.MedianIncome` canon pass** — 11 placeholder hoods + Piedmont Ave 72k + KONO 32.7k re-based from the B1 profile (engine.133 illness weights already read this column live; contamination is deployed).

### Phase C — Business_Ledger six-per-hood fill (grok's 72, reviewed)
- Rename essence-leak rows (Reachable Market, Continuity Market, Between Hub Market, Working Core Pharmacy, Thin Line Market, Pressure Laundry, Ordinary Street Kitchen, Frontier Market, Crossing Cafe, Spillover Cafe, + any found on full pass); check each hood's mix against its INSTITUTIONS entry (D4 villages quiet; Chinatown family continuity; Piedmont Ave clinic-class; East Oakland frontier not blight).
- Re-base Avg_Salary / Employee_Count / Annual_Revenue to the Phase D scale before append.
- Append via `lib/sheets.js` with `getBizIdHighWater` re-scan at write time (heritage may mint a BIZ row on 2026-08-30); ids are proposals. No remap of the four child-fold rows; no scrub of existing real-world rows.
- Accept flow per `docs/for-claude-review/README.md` on landing.

### Phase D — Wealth / salary scale realign
- Measure: ledger Income p10/p50/p90 = 31k/81k/180k, max 100M; NetWorth p50 442k, max 10B (snapshot 2026-08-29). WealthLevel bands are already GodWorld's own (S363, pure NetWorth). The defect is the Income/NetWorth VALUES and their hood placement, not the band edges.
- Design: per-hood income envelope from the B1 profile (tier → salary band + net-worth band); `applyEconomicProfiles` / mint / settle draw from the hood band; `deriveWealthLevel_` bands re-checked against the new envelope.
- Existing rows: **see Open question 1** — scale change (bands + future draws + outlier diff-restore) vs a row sweep.

### Phase E — Quiet the rewriters (career engine soft push)
- **Measured (LifeHistory_Log, live 2026-08-29):** career-tagged events/cycle C94–C102 = 12–16 (mostly `Career` flavour text, no ledger change; 2 `Promotion`/cycle); **C103 = 35, C104 = 51** — `Promotion` 13 → 29, `Career-Hired` 8 → 5, `Career-FieldChange` 3 → 5.
- **The rewriter:** `updateCareerProgression_` (`phase05-citizens/educationCareerEngine.js:~395-420`) — every non-sports adult 22–64 in class MID with `YearsInCareer ≥ 10` and ≥ 20 cycles since `LastPromotionCycle` rolls 5/10/15% (by education) **every cycle** → `senior` + LifeHistory line + `Promotion` log row. Ledger today: 347 mid-class, 652 citizens with ≥ 10 years, 354 blank `LastPromotionCycle` → ~24 promotions/cycle, the whole mid class senior in ~15 cycles. Stage-only (Income untouched) but it is the roster rewrite the builder sees. Entry→Mid twin at 15%/cycle after 10 cycles. `YearsInCareer` accrual is already gated (+0.5 per 26 cycles, engine.62b).
- **`runCareerEngine_` `maybeTransition_` (`runCareerEngine.js:367-400`):** per-citizen per-cycle promo ≤ 8% (+6–12% Income), layoff ≤ 7% (−12–20%), sector shift ≤ 5% (−10–+5%), lateral ≤ 5% (±3%), 6-cycle gap between transitions, LIMIT 10 events/cycle; `matchUnemployedToOpenings_` (`:1160-1199`, Career-Hired, +5–10% / ±5%) and the headcount-reconciliation layoff (`:1326`, −12–20%). These are the Income movers.
- **Not employment:** `checkForPromotions_` is Generic_Citizens → ledger emergence (tier), leave alone. `generationalWealthEngine.js:456,490` Income writes — classify at task time (retirement/inheritance context).
- **Cut (pending Q2):** (a) `updateCareerProgression_` stage rolls → event-driven only (a promotion is a `runCareerEngine_` transition with an Income consequence, not a calendar roll); (b) `maybeTransition_` odds re-based so expected churn ≈ 1–2 Income-moving transitions per cycle across the ledger, pressure-steered by the dial-vs-attractor gap; (c) reconciliation layoff kept (ground truth), rate-limited.

### Phase F — Placement by net worth
- `migrationTrackingEngine` / `householdFormationEngine` / intake placement read the B1 income tier so moves land where a citizen's net worth belongs. Fold, not add.

---

## Acceptance criteria (draft)
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

---

## Changelog
- 2026-08-29 (22:21) — **Approved.** WealthLevel scale extended 10→12 on builder pushback (≥$50M / ≥$250M / ≥$1B); elite hood bands open-ended; Q3/Q4 closed; plan ACTIVE.
- 2026-08-29 (22:11) — Builder second pass captured (points 7–16): Q1/Q2 answered, hood admission bands, tracked-employer floor, business-success causation, CareerStage by age, retired/deceased Income 0. WealthLevel band table proposed; Q3/Q4 opened.
- 2026-08-29 (16:20) — Wiring cards returned (`runCareerEngine_`, `checkForPromotions_`); churn measured from LifeHistory_Log; the C103–C104 promotion spike traced to `updateCareerProgression_`; Phase E filled, Q2 sharpened.
- 2026-08-29 — Direction captured (S397 engine-sheet); phases sketched; wiring cards dispatched for `runCareerEngine_` and `checkForPromotions_`; live C104 numbers recorded in sources.
