# G-EC82 — eight incomes through the C107 income writer order (read-only evidence)

Prepared by engine-sheet for codex, 2026-09-14 ~00:50 CDT. No edits, no commits, no sheet writes. Fires held.

## Verdict of the trace

**Writer identified: `applyUntrackedJobReference_`** (`phase05-citizens/generationalWealthEngine.js:829-856`), Step 1.6 of `processGenerationalWealth_` (`:138`), Phase5-GenerationalWealth (`phase01-config/godWorldEngine2.js:385`). It is RAISE-ONLY to `jobReferencePay_` (`:786-827`). Recomputing that reference offline from each citizen's C107 ledger row reproduces the C107 Income **to the dollar for all eight**:

| POPID | Role | Stage / yrs / edu | C106 → C107 | Recomputed reference | Match |
|---|---|---|---|---|---|
| POP-00784 | Plumber | mid-career / 4.5 / trade-cert | 45,800 → 99,200 | 99,200 | exact |
| POP-00812 | Plumber | entry-level / 8.7 / hs | 47,800 → 98,900 | 98,900 | exact |
| POP-00867 | Electrician | mid-career / 16 / hs | 46,800 → 110,200 | 110,200 | exact |
| POP-00874 | Independent Bookstore Owner (SELF_EMPLOYED) | entry-level / 7.9 / hs | 28,522 → 61,000 | 61,000 | exact |
| POP-00889 | Environmental Consultant (SELF_EMPLOYED) | entry-level / 8.8 / bachelors | 44,500 → 121,200 | 121,200 | exact |
| POP-00899 | Plumber | senior / 34.4 / doctorate | 60,100 → 126,500 | 126,500 | exact |
| POP-00909 | Plumber | mid-career / 20.9 / hs | 46,800 → 109,400 | 109,400 | exact |
| POP-00951 | Plumber | mid-career / 20.5 / hs | 49,300 → 111,300 | 111,300 | exact |

Method: vm-loaded `generationalWealthEngine.js`, `educationCareerEngine.js`, `citizenDerivation.js`, `applyMigrationDrift.js`, `applyPatternDetection.js` (the files defining `jobReferencePay_`, `payProfileFromRow_`, `careerStageClass_`, `credentialRank_`, `roleFieldOf_`, `seedUnit_`, `ECONOMIC_PARAMETERS`); called `jobReferencePay_(RoleType, SkillTags, CareerStage, POPID, payProfileFromRow_(header, row, null))` on each row of `output/simulation_ledger_snapshot.jsonl` (meta: cycle 107, 943 rows). All eight are Tier 4, `CareerMobility: stagnant`, `LastPromotionCycle` blank, DialState drive 50 (neutral). None appears in `output/beats/Business_Ledger.jsonl` Key_Personnel, so the owner's draw (Step 1.7) never touched them.

Bands (`jobPayTable_`, `:715-733`, from `ECONOMIC_PARAMETERS`): Plumber 85,000–140,000 (med 112,000, Trades); Electrician 88,000–145,000; Environmental Consultant 98,000–175,000; Independent Bookstore Owner 45,000–98,000. Every one of the eight sat **below the band minimum** at C106, so the floor moved each of them to their band position in one step. The "doubling" is the distance from a legacy draw to the catalog band minimum, not a ×2 rule.

## Why C107 and not C106

- Live C106 fired 2026-09-06 (DEPLOY_HISTORY: builder's editor fire, `lastRun 9/6`).
- PROD @68 engine.168 "the economic catalog gets the working jobs — 108 roles the engine mints but the catalog never listed" (2026-09-07 ~16:00, `27f9c662`) and PROD @70 engine.172 "a life places the citizen in the job's band" (2026-09-07 ~21:45, `77653f25`), plus @67/@69/@73 (engine.166 v2, 169/170, 167) all landed **between the two live fires**.
- C107 (2026-09-13) was therefore the first live fire with Plumber/Electrician/etc. in the catalog band and the band position computed from years/credential/drive. The "peer share 0–19%" is because most other Plumbers were already at or above reference (see census) or are tracked-BIZ rows on the D3 floor.
- `historicalContext.priorCycles` shows the same rows already stepping C105→C106 (e.g. POP-00784 31,186 → 34,400 → 45,800): earlier floors (engine.135 D4 hood-reference, retired by engine.166) moved them in smaller steps before the catalog band existed for the role.

## Recurring floors vs event pay cuts — the writer order inside one fire (C107 execution log)

| Time | Phase (godWorldEngine2.js) | Income effect | file:line |
|---|---|---|---|
| 8:31:29 | Phase5-Maneuver (`:359`) | none on Income (posture only) | log: "climb 201 / hold 588 / retreat 43" |
| 8:31:30 | Phase5-Career (`:360`) | **cuts**: layoff −12–20% `runCareerEngine.js:320`, `:1461`; hospitalization −3–8% `:943`; raises: promotion +6–12% `:302`, rehire +5–10% / field change ×0.95–1.05 `:1330`, field-change re-price to reference `:1323` | log: 0 hired, 0 career changes at C107 |
| 8:31:48 | Phase5-Promotions (`:373`) | new-mint Income from catalog median `checkForPromotions.js:386-399` (emergence rows only) | log: 6 promoted by migration wave |
| 8:31:48 | Phase5-Bonds (`:382`) | spouse mint Income via `jobReferencePay_` `bondEngine.js:2408`, `:2604` | — |
| 8:31:49–8:32:45 | Phase5-Advancement (`:383`) | role change re-derives Income `processAdvancementIntake.js:716-731` (reference first, salary pool fallback); intake mint `:805-819`; `applyTierLadderState_` (`:1150`) — **no Income write** (grep: Income appears only at :716-819, :2146) | log: 8 promoted (tier ladder), advancementsProcessed 70 |
| 8:32:57–8:33:03 | Phase5-GenerationalWealth (`:385`) | Step 1 `calculateCitizenIncomes_` fills blanks only (`:520-541`, skips EconomicProfileKey rows); Step 1.5 `applyTrackedEmployerFloor_` raise-only BIZ rows (`:600-643`); **Step 1.6 `applyUntrackedJobReference_` raise-only UNTRACKED/SELF_EMPLOYED to reference (`:829-856`)**; Step 1.7 `applyOwnerDraw_` sets Income := profit share, cut OR raise (`:1000-1016`) | log: "Income: 5" = Step 1 blank fills; Step 1.6's `raised` count is **not logged** (`:139` stores it in `results.hoodReferenceRaised`, the Complete line at `:229` does not print it) |
| 8:33:04 | Phase5-EducationCareer (`:386`) | Income: 0 at C107 | log: Stagnant 272 |

Consequences, read straight off the order:

1. **Layoff cuts do NOT re-floor — corrected after codex's qualification.** Both layoff paths blank the employer in the same write (`runCareerEngine.js:320-321` sets Income ×0.80–0.88 then `vRow[iEmp] = ''`; `:1461-1462` the same), and Step 1.6 skips any row whose employer is not exactly `UNTRACKED` or `SELF_EMPLOYED` (`:846-847`), so a laid-off citizen leaves the floor's scope in the same cycle. Layoffs also only reach staff of a tracked business (`b.staff`, `trackedBy[fBizId]`), never UNTRACKED rows. C107 recorded 0 `Career-Layoff` lines. The earlier sentence claiming same-fire restoration for layoffs was wrong.
2. **Hospital cut on an UNTRACKED / SELF_EMPLOYED row — hypothesis, not proven.** `:943` cuts ×0.92–0.97 on a stay ≥2 cycles (once per admission, `[IncomeHit A…]` marker) without touching the employer; Step 1.6 excludes only deceased/retired/inactive (`:841-842`), so a hospitalized UNTRACKED row stays in scope and a cut below reference would be raised back the same fire. This needs a sequence test through the real Career → Wealth order (codex's call to author). C107 has 2 hospitalized rows: POP-00194 (SELF_EMPLOYED, Insurance Agent, admitted C107 — no hit yet) and POP-00801 (BIZ-00052, D3 floor path, not 1.6).
3. **Owner rows — hypothesis, not proven.** Step 1.7 (owner's draw, `:1000-1016`) runs AFTER Step 1.6 and writes Income := draw, cut or raise; the next fire's Step 1.6 would raise it back if draw < reference, then 1.7 cuts again. None of the eight is an owner in Business_Ledger. Needs the same sequence test.
4. **What the snapshot does establish (C107, offline recompute over the whole ledger):** UNTRACKED/SELF_EMPLOYED, Tier 3–4, active, non-GAME rows with a placeable band: **238**; exactly at reference **93**; below **9**; above **136**; 27 more have no band (student/retired stage or an unplaced role). For those 93 the current Income is a deterministic function of (role, years, credential, drive, tier); which event paths can move it down is the sequence-test question above, not a settled claim. The reference itself only climbs (years in career grow each cycle; the ±5% jitter is seeded by POPID, `:825`).
4. **Plumber census (26 rows):** every active UNTRACKED Plumber now sits in 98,900–126,500 (band position), the BIZ-employed Plumbers sit on the D3 employer floor or above (85,000–299,000), two students at ~29k. The 2× moves were the UNTRACKED ones that were still on legacy draws at C106.

What did NOT write these rows at C107: `applyTierLadderState_` (no Income write), engine.157 maneuver (posture only), Phase5-Career (0 hires / 0 changes / no layoff lines for these POPIDs — none of the eight appears in `output/execution_log_c107.txt`), `applyOwnerDraw_` (not owners), `checkForPromotions_` (emergence mints only).

## C107 Cycle_Packet — neighborhood economy mood

`Cycle_Packet` (cols Timestamp, Cycle, PacketText; one row per cycle) at C107 carries sections CALENDAR, CITY DYNAMICS, MEDIA CLIMATE, WEATHER MOOD, EVENING CITY, CRIME SNAPSHOT, END. **There is no neighborhood economy section in the C107 packet.** `buildCyclePacket.js:671-690` builds a `--- NEIGHBORHOOD ECONOMIES ---` section (`hood: mood=…, moodDesc, emp=…, growth=…`) from `S.neighborhoodEconomies`, but `KEEP_SECTIONS` at `:767-773` (`CALENDAR, CITY DYNAMICS, MEDIA CLIMATE, WEATHER MOOD, …`) drops it before the packet is persisted — the same filter that drops POPULATION. So the per-hood economy mood is computed every cycle and reaches no sheet through the packet; the C107 values cannot be read back from Cycle_Packet. City-level values the packet does carry at C107:

```
--- CITY DYNAMICS ---   Sentiment 0.51 · Traffic 1.11 · Retail 1.27 · Nightlife 1.04 · PublicSpaces 0.62 · Tourism 0.6 · CulturalActivity 1.36 · CommunityEngagement 1.57
--- EVENING CITY ---    CrowdMap Jack London=13, Fruitvale=10, Downtown=9, West Oakland=4, Temescal=3 · EveningSafety tense · EveningTraffic gridlock
```

Where the per-hood economy mood lives instead: producer `phase06-analysis/economicRippleEngine.js:871` (`S.neighborhoodEconomies = nhEconomies`, Phase 6 — AFTER Phase-2 `applyCityDynamics_` reads `S.neighborhoodEconomies` at `applyCityDynamics.js:~101`); reader/patcher `phase06-analysis/applyMigrationDrift.js:210, :384, :517-538`; packet reader `buildCyclePacket.js:674`. No beats dump carries it (`output/beats/` has no economy tab). Whether it survives the cycle boundary into `previousCycleState` is the question codex is already tracing (finalizeCycleState).

## Current World_Config (read-only dump)

`output/codex/world_config_readonly_2026-09-14.json` — 127 keys (Key, Value, Description), read via `lib/sheets.js getSheetAsObjects('World_Config')` at ~00:45 CDT. Pay-related keys present: `employmentFloor 0.88`, `employmentConvergenceRate 0.25`, `bizGrowthFloor -10`, `bizClosureRevenueFloorPct 40`, `hoodRentShare 0.3`, `relocationMaxShare 0.05`, `hoodCitizenFloor 12`, `hoodFloorPromotePerCycle 6`, `bizOwnerMinProfit 0`, `dialFrictionRentBurden 50`, `dialOpenMoveThresholdMult 0.8`. **No World_Config key governs the job-reference floor, the band position formula, or a per-cycle income change cap** — those constants live in code (`generationalWealthEngine.js:786-827`, `PAY_EXPECTED_CREDENTIAL_ :738`, `OWNER_DRAW_SHARE :~870`, `STAGE_FACTOR :608`). No `Economic_Parameters` tab exists on the live sheet under that name (`listSheets` matched nothing for /econ|param|catalog/); `ECONOMIC_PARAMETERS` is a code literal in `utilities/citizenDerivation.js` (engine.198 says a tab was pushed 2026-09-13 03:27 — name unverified here).

## Sources read

`phase05-citizens/generationalWealthEngine.js` :106-200, :500-560, :600-660, :715-860, :1000-1016 · `phase05-citizens/runCareerEngine.js` :302, :320, :943, :1300-1340, :1461 · `phase05-citizens/processAdvancementIntake.js` :716-731, :805-819, :1150 · `phase05-citizens/checkForPromotions.js` :360-405 · `utilities/citizenDerivation.js` :408 · `phase01-config/godWorldEngine2.js` :359-386, :1350-1395 · `phase10-persistence/buildCyclePacket.js` :574, :674 · `output/execution_log_c107.txt` :100-145 · `output/engine_anomalies_c107.json` (the eight `citizen-income` entries with `historicalContext`) · `output/engine_anomalies_c107_followup.md` §B · `output/production_log_run_cycle_c107_gaps.md` G-EC82 · `docs/reference/DEPLOY_HISTORY.md` §PROD @66–@74 · `output/simulation_ledger_snapshot.jsonl` (C107) · live `Cycle_Packet`, `World_Config`, `Neighborhood_Map` via read-only loaders.
