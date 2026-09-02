---
title: Education system (ledger, youth, careers) — research
created: 2026-08-30
updated: 2026-09-01
type: reference
tags: [research, engine, citizens, education, careers, neighborhoods, active]
sources:
  - output/simulation_ledger_snapshot.jsonl — C104 local dump, 968 rows (EducationLevel / SchoolQuality / BirthYear / Neighborhood / UNI)
  - schemas/SCHEMA_HEADERS.md — Simulation_Ledger AF–AK; Neighborhood_Demographics H–L; Youth_Events A–K; Business_Ledger A–I
  - docs/SIMULATION_LEDGER.md §Education & Career (AF–AK)
  - phase05-citizens/educationCareerEngine.js — processEducationCareer_ / deriveEducationLevels_ / updateCareerProgression_ / updateMinorSchoolQuality_ / settleAdulthood_ / checkSchoolQuality_ / eduRank_
  - phase05-citizens/runEducationEngine.js — flavor learning; never writes degrees
  - phase05-citizens/runYouthEngine.js — OAKLAND_SCHOOLS canon-voice rebuild (S398); Youth_Events write is a dead typeof-guard
  - phase05-citizens/runCareerEngine.js — applyEmployerSuccess_ / matchUnemployedToOpenings_
  - phase05-citizens/generationalWealthEngine.js — EDU_SAVINGS_FACTOR
  - phase05-citizens/bondEngine.js — bondFitnessOf_
  - phase05-citizens/migrationTrackingEngine.js — NO_COLLEGE risk
  - phase04-events/generationalEventsEngine.js — checkGraduation_ (narrative only); birth EducationLevel = Pre-K
  - lib/citizenDerivation.js — intake EducationLevel vocab + neighborhood-frequency draw
  - docs/plans/2026-08-29-employment-system-cascade.md — E1 killed education-odds calendar rolls; E2 promotions = Growth_Rate
  - docs/canon/INSTITUTIONS.md §Education — Oakland City Schools BIZ-00016; no canon campus
  - scripts/backfillNeighborhoodEducation.js — S247 prosperity floor (≥7 quality / ≥85 grad)
  - OpenRouter Haiku wiring cards 2026-08-30: processEducationCareer_, updateCareerProgression_
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.143 (filed S409 on accept)"
  - "[[../research/index]] — register on accept"
  - "[[../plans/2026-08-29-employment-system-cascade]] — E1/E2 are why degrees no longer drive promotions"
  - "[[../canon/INSTITUTIONS]] — district + no-campus rule"
  - "[[../SIMULATION_LEDGER]] — AF EducationLevel / AG SchoolQuality"
---

# Education system (ledger, youth, careers) — research

**Reviewer note (grok, 2026-08-30):** written as an inbox copy; wiring cards ran OpenRouter Haiku (`runEngineAgent.js --provider openrouter --model anthropic/claude-haiku-4.5`). Full cards: `output/grok/wiring-processEducationCareer.md`, `output/grok/wiring-updateCareerProgression.md`. **Accepted S409 (engine-sheet, 2026-09-01)** — moved here, registered, engine.143 filed; see §Review.

**Source:** Builder-directed teardown of education as it exists on C104 (grok, 2026-08-30). No external paper. Trigger: “tear into the education system and the lack of one.”

**What this addresses:** Whether college degrees, school quality, Youth_Events, Business_Ledger, neighborhood school data, and the employment-cascade promotion path form a school/career system — or leftover columns around a fill-once stamp.

**What it does (verified 2026-08-30):** Columns exist. A school that changes a life after mint does not. Degrees do not gate jobs. Employer promotions do not read education. Adults cannot earn a degree. Neighborhood school ratings sit seeded (and on live, below the S247 prosperity floor). Youth_Events is a dead tab.

---

## Extraction — what's usable

- **Fill-once credential, not a school career → EducationLevel is identity after first write.** `deriveEducationLevels_` skips any non-blank cell (S320). `settleAdulthood_` overwrites once at age 18. Birth writes `Pre-K`. Intake/bonds/promotions mint via `deriveEducationLevel_`. After that, nothing in Phase 5 upgrades the cell. Principle: a degree is a birthmark, not a path.

- **Three dictionaries on one column → exact-match physics miss live tokens.** Engine constants (`educationCareerEngine.js`): `none / hs-dropout / hs-diploma / some-college / bachelor / graduate`. Live snapshot (968): `hs-diploma` 521, `bachelors` 190, `masters` 80, `doctorate` 56, `trade-cert` 39, `associates` 29, `some-college` 9, `hs-dropout` 4, plus child-stage labels (`Elementary` 12, `Middle School` 10, `High School` 9, `Pre-K` 7, `grade-school` 2). `eduRank_` substring-matches bachelor/masters/doctorate/graduate. `EDU_SAVINGS_FACTOR` and `bondFitnessOf_` exact-match `bachelors/masters/doctorate` only. Engine fill writes singular `bachelor`/`graduate` → savings and courtship treat them as 1.0.

- **Degrees push four things, none of them a job.** (1) Savings yield ×1.1/1.2 (`generationalWealthEngine.js:223,338`). (2) Courtship fitness +0.08/+0.15 (`bondEngine.js:1826-1835`) — pace, not exclude. (3) Displacement +2 if `none/hs-dropout/hs-diploma` (`migrationTrackingEngine.js:261-264`). (4) Parent rank into the 18th-birthday score (`eduRank_` + `settleAdulthood_`). v14.2 removed income-from-education. File header still claims education speeds promotions; E1 deleted that code.

- **Degrees do not gate careers.** `role_mapping.json` has no education field. `matchUnemployedToOpenings_` matches SkillTags ∩ business category. `applyEmployerSuccess_` columns: POPID, names, neighborhood, RoleType, Income, EmployerBizId, Status, Tier, ClockMode, LastPromotionCycle, YearsInCareer, LifeHistory — no EducationLevel. Beneficiary sort: oldest LastPromotionCycle → lowest Income → POPID. Income +6–12%. UNI/MED/CIV skip flavor career *texture*, they do not license a role.

- **Employment cascade promotions ignore education.** E1 (`educationCareerEngine.js:421-435`): CareerStage is `deriveCareerStageFromAge_`; calendar rolls gone (old MID→SENIOR 5/10/15% by education every cycle). Wiring card: `updateCareerProgression_` still *reads* EducationLevel into a dead local, then never uses it; writes CareerStage + YearsInCareer via ctx.ledger, before Phase 10. E2: `p(promo) = growth/100/52 × staff × gapFactor × 0.1`. Plan text never lists education as an E2 input.

- **SchoolQuality is a childhood stamp that fires once at 18.** `updateMinorSchoolQuality_`: minors <18 with a HouseholdId get SL SchoolQuality = hood `SchoolQualityIndex` (heritage Established+ +1, cap 10), every cycle. `settleAdulthood_`: sq≥8 +2, ≥6 +1 on the entry-band score, then RoleType/Income/EducationLevel/employer. Adults: 286/917 blank SchoolQuality on the snapshot; the rest is leftover. `checkSchoolQuality_` only emits storyHooks (quality<3, grad<65%); does not write citizens.

- **Hood X vs Y is real, and live contradicts S247.** Snapshot minors (age = 2041−BirthYear), 51 kids:

  | Hood | n | SchoolQuality |
  |---|---:|---|
  | Rockridge | 5 | 9 |
  | Piedmont Ave | 2 | 8 |
  | KONO | 1 | 8 |
  | Temescal | 4 | 7 |
  | Lake Merritt | 6 | 6 |
  | Downtown | 9 | mostly 5 (one 6, one 8) |
  | Uptown | 6 | 5 |
  | Laurel | 2 | 5 |
  | Chinatown | 8 | 4 |
  | Jack London | 3 | 4 |
  | West Oakland | 2 | 3 |
  | Fruitvale | 3 | 3 |

  `updateMinorSchoolQuality_` restamps every cycle, so these numbers *are* live Neighborhood_Demographics.SchoolQualityIndex. S247 backfill floors quality at 7 / grad at 85 so crisis hooks stay dormant. Live 3s sit on the `SCHOOL_QUALITY_CRISIS` gate (<3). Prosperity backfill did not land on live, or ND still holds `addEducationCareerColumns.js` deprivation seeds (West Oakland/Fruitvale 3). Neighborhood_Map has **no** school columns. ND Students/Adults/Seniors *do* rewrite each cycle; education cols H–L are preserved (S247 clobber fix), not recomputed.

- **Business_Ledger is not a school table.** Schema A–I: BIZ_ID, Name, Sector, Neighborhood, Employee_Count, Avg_Salary, Annual_Revenue, Growth_Rate, Key_Personnel. Education appears only as a Sector string and as BIZ-00016 the district-as-employer (stored name still “Oakland Unified School District”; canon is Oakland City Schools). Growth_Rate is the E2 promotion signal, not a school-quality signal.

- **Youth_Events is a write-only tab with no writer left.** Schema 11 cols (YouthName, YouthID, Age, EventType, School, Neighborhood, Outcome, Status). `batchRecordYouthEvents_` / `ensureYouthEventsSchema_` lived in `utilities/youthActivities.js`, deleted S357 (engine.97 Task 5 / engine.4 archive). `runYouthEngine_` still calls both behind `typeof` guards → no-op. Named events go to LifeHistory + LifeHistory_Log. School-wide graduation/homecoming still generate; they do not persist to Youth_Events. `SPREADSHEET.md:174` claiming live writes via youthActivities is stale.

- **Youth ages 5–22; school levels are probability bands, not enrollment.** elementary 5–10 (p=0.15), middle 11–13 (0.20), high 14–17 (0.25), college 18–22 (0.15). Snapshot: 51 under 18, 102 aged 5–22, 55 CareerStage=student. `OAKLAND_SCHOOLS.high` is six generic “an Oakland City Schools high school in {West Oakland, Temescal, Laurel, Fruitvale, East Oakland, Lake Merritt}” — INSTITUTIONS §Education. Fall sports still names `Oakland Unified` / `SCHOOL-OUSD` (`runYouthEngine.js:572-584`). Per-citizen school name helpers left with youthActivities, so individual events default school='' / eventType='academic'.

- **Adults cannot go to college.** `runEducationEngine_` header: “Never creates credentials or degrees.” Writes LifeHistory flavor (“browsed the Temescal library”), T3/T4 ENGINE, skips UNI/MED/CIV, cap 10/cycle. `checkGraduation_` ages 22–28, once via `[Graduation]` in LifeHistory; odds ~0.005–0.01 (spring ×3, May/June ×2); returns a story line; **does not set EducationLevel**. No UNI flag flip, no tuition, no night school, no degree→role upgrade.

- **The 18th-birthday settlement is the only education→career machine.** Score: HH income (≥140k +2, ≥60k +1) + SchoolQuality + best-parent eduRank + heritage (+1/+2) + rng×1.5. Bands: ≥5 rich (`bachelors`, $55–72k, professional trainee roles), ≥2 solid (`some-college`, $38–52k, trades/aide), else rough (`hs-diploma`, 15% `hs-dropout`, $28–36k, service). Writes econ key, capacity-aware EmployerBizId, SkillTags, CareerStage=`student`, YearsInCareer=0. Skips sports-layer and already-keyed rows. This is inheritance of opportunity, not schooling.

- **UNI flag is a mint hint, not a university.** 121 `yes` / 846 `no` / 1 `No` on the snapshot. Blank EducationLevel + UNI=y → `bachelor`; MED → `graduate`; CIV → `some-college`; LifeHistory contains `Graduation` → `bachelor`. Docs still record an older `=== "y"` miss; live `runEducationEngine_` / `runCareerEngine_` use `startsWith("y")`.

---

## Wiring cards (OpenRouter Haiku, 2026-08-30)

**processEducationCareer_** — `educationCareerEngine.js:124` v2.1. Both entry points Phase5-EducationCareer (`godWorldEngine2.js:375` / `:2039`), before Phase10-ExecuteIntents (`:563` / `:2204`). Orchestrator only: deriveEducationLevels_ → updateCareerProgression_ → detectCareerMobility_ → checkSchoolQuality_ → updateMinorSchoolQuality_ → settleAdulthood_. No S-field writes in the wrapper. Map 2026-08-30 / 183 files.

**updateCareerProgression_** — `:363`. One caller `:149`. Mutates ctx.ledger CareerStage + YearsInCareer (+0.5 every 26 cycles, age≥22); dirty flip. No stampPromotion_, no LastPromotionCycle write, no rng on stage. History: `a2b6d2b1` E1 calendar rolls deleted; `aa1dce57` retirement is an event; `cd8ec73c` GAME/CIVIC/MEDIA outside E1.

---

## Not applicable / hazard

- **Do not lower ND school values to make SCHOOL_QUALITY_CRISIS fire.** S247: GodWorld Oakland is prosperity-era; dormancy-by-data is correct. Live 3s are the opposite defect — leftover deprivation seeds, not a missing crisis. Fix direction if any: raise to the prosperity floor, do not invent struggle.
- **Do not bulk-rewrite EducationLevel.** S320 / employment doctrine: set values are identity; corrections ship as lived events. A vocab-unify (bachelor→bachelors, child-stage labels out of the credential column) is a plan, not a sheet sweep from this file.
- **Do not wire Youth_Events readers.** engine.97 retired the parallel tab on purpose (duplicates band=child/teen). Re-wiring is the fix-don't-add failure. If youth school life is wanted, it belongs on Event_Content_Ledger bands + LifeHistory, or a new designed system — not the dead tab.
- **Do not put education back into applyEmployerSuccess_.** E2 causation is business success. Reintroducing diploma odds is the calendar-roll the cascade removed.
- **Do not invent campuses, universities, or a second district.** INSTITUTIONS: one district, no canon campus, never “OUSD.” BIZ-00016 rename (Oakland Unified → Oakland City Schools) is a Business_Ledger identity fix, not this file.
- **Do not treat this file as authorization to build a school system.** It is a map of the lack. A K–12 / college / adult-ed design is a new plan + Mike sign-off.
- **Snapshot is local dump, not a live Sheets read.** Counts (51 minors, 968 rows, UNI 121) are `output/simulation_ledger_snapshot.jsonl` at session start. ND index values are inferred from minor stamps (the writer restamps every cycle), not a Neighborhood_Demographics API pull.

**Verdict:** `adopt` — S405 named education as the next system; builder asked for the plan 2026-08-31. Isolation loop only (companion plan). Adopt-trigger that fired: Mike asked to plan the fix + cascade ruling “do NOT widen E3. Build education next.” Connection-to-career is a later plan, not this one.

**Ignited plans:** [[../plans/2026-08-31-education-loop]] (isolation loop only; engine.143).

---

## Review

**Accepted S409 (engine-sheet, 2026-09-01).** Every claim in §Extraction re-verified against the code before the build, and the four owed wiring cards cut fresh on the S409-repaired reverse map (`output/wiring/wiring-settleAdulthood.md`, `-checkGraduation.md`, `-deriveEducationLevels.md`, `-runYouthEngine.md`). Two additions to the map: (1) `processAdvancementIntake_` (`phase05-citizens/processAdvancementIntake.js:705`) is a third EducationLevel writer — it mints through `lib/citizenDerivation` and already emits the plural vocab, so it needed no change; (2) live `Neighborhood_Demographics` read 2026-09-01 confirms the S247 floor never landed: West Oakland 3/62, Fruitvale 3/65, and the 62 sits on the `DROPOUT_WAVE` gate (<65) the canon forbids. The `checkGraduation_` per-cycle cap (`getSeasonalLimits_`: 2, spring 4) is pre-existing and was left alone — the plan said no *new* cap; the standing no-output-caps doctrine question on the existing one is noted, not decided here.

## Applications (living)

- 2026-08-30 — Written as the standing map of education columns vs live physics after E1/E2, so a future education plan starts from the ledger instead of the file-header claims.

---

## Changelog

- 2026-08-30 (grok) — Initial extraction (C104 snapshot + two Haiku wiring cards + education/youth/career engines).
- 2026-08-31 (grok) — Verdict watch→adopt; ignited isolation-loop plan. Connection to hiring still out of scope.
- 2026-09-01 (engine-sheet, S409) — Accepted; §Review added; moved from the inbox and registered; engine.143 filed; plan Tasks 1–4 + 6 built the same session.

---

## Note — 2026-08-30 (grok)

Late column-map pass (after save): **Domain_Tracker col G `EDUCATION`** is a domain-intensity tracker, not a citizen/school credential (`schemas/SCHEMA_HEADERS.md` Domain_Tracker). Does not change the verdict. Same pass confirms Business_Ledger has no education columns and that `docs/SIMULATION_LEDGER.md` “SchoolQuality readers: —” is stale (`settleAdulthood_` reads it).
