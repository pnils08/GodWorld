---
title: Employment System Cascade Plan
created: 2026-08-29
updated: 2026-08-29
type: plan
tags: [engine, employment, economy, neighborhoods, cascade, draft]
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

**Status:** DRAFT — direction captured 2026-08-29; tasks fill in after the wiring cards (`runCareerEngine_`, `checkForPromotions_`) return and the builder answers §Open questions. **Sequencing lock:** nothing here touches the 2026-08-30 live window (deploy engine.132+133 → one illnessRate cell → builder fires). This plan benches after that cycle lands.

---

## Direction (builder, 2026-08-29 — the spec; do not paraphrase away)

1. **City dial.** Like illness, the city employment number must not sit at an unrealistic 90%. World_Config is set the way the illness work was: real-world realistic, with a kick toward boom-city.
2. **Hood layer.** As the health system did: neighborhood numbers sit inside the city number, never flat across, and align with the sim's essence placed on each neighborhood in 2041 boom-city Oakland. The penned canon (INSTITUTIONS §Neighborhoods, S374) is the core base for building out these systems. *Where it is saved / used today:* saved at `docs/canon/INSTITUTIONS.md:324-420`; read by NO engine placement or economy code — `NEIGHBORHOOD_PROFILES` (`utilities/ensureNeighborhoodDemographics.js:48`), `NEIGHBORHOOD_CRIME_PROFILES` (`utilities/ensureCrimeMetrics.js`), `NEIGHBORHOOD_ECONOMIES` (`phase*/economicRippleEngine.js:105`, 11 hoods only) and `Neighborhood_Map.MedianIncome` all predate it and were filled from training-data Oakland (civic.23 finding). Only `lib/districtMap.js` (district assignment) conforms to it.
3. **Business fill.** Review of grok's 72 new businesses (`output/grok/business-ledger-hood-fill-c104.json` + inbox md) is delegated to engine-sheet: names and data must align to the sim and the seeded canon essence. Essence-leak names (spec adjectives as shop signs) get renamed; Emp/Salary/Revenue re-based to the scale in point 4.
4. **Wealth scale.** Realign the true wealth-level scale in Simulation_Ledger — revisit salaries and neighborhood demographics against the same canon base — so the career engine's soft push and citizens moving to areas appropriate to their net worth true up cleanly.
5. **Quiet the rewriters.** Stop the employment roster from rewriting each cycle: too much career change, salary adjustment, and any old system forcing employment stops in favour of what this plan produces.
6. Use engine subagents as needed; ask before starting where unclear.

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
- From the wiring cards: list every per-cycle writer of Income / EmployerBizId / CareerStage / Occupation and its rate. Cut per-cycle salary adjustment and career-change rolls to event-driven, low-rate paths; the dial-vs-attractor gap steers `runCareerEngine_` hiring/layoff pressure (cascade doc: steering, never dosing). Old forcing systems named and disabled by row.

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

- [ ] **Q1 (blocks Phase D):** existing 967 rows — redefine the scale (bands + future draws) and correct only provable outliers by diff-restore, or rewrite Income/NetWorth for every row? Recommendation: scale change, not sweep (`project_simulation-ledger-no-column-is-true` — repair is guard + targeted restore, never a sweep).
- [ ] **Q2 (blocks Phase E scope):** which of the per-cycle employment writers named by the cards die outright vs get throttled to event-driven? Answer after the cards list them.

---

## Changelog
- 2026-08-29 — Direction captured (S397 engine-sheet); phases sketched; wiring cards dispatched for `runCareerEngine_` and `checkForPromotions_`; live C104 numbers recorded in sources.
