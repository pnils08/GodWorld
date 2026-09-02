---
title: Education loop in isolation — earn a credential as a life event
created: 2026-08-31
updated: 2026-09-01
type: plan
tags: [engine, citizens, education, active]
sources:
  - docs/research/2026-08-30-education-system.md — research basis (accepted S409)
  - docs/plans/2026-08-29-employment-system-cascade.md §acceptance verdict S405 — do not widen E3; education next; one loop at a time
  - docs/engine/ROLLOUT_PLAN.md Next Session Priorities — chase (engine.138) precedes this build; education starts from the inbox research
  - docs/SIM_DOCTRINE.md — causes then dice; events record; no output caps; no ghost people
  - docs/canon/INSTITUTIONS.md §Education — Oakland City Schools; no canon campus
  - OpenRouter Haiku wiring cards 2026-08-30: processEducationCareer_, updateCareerProgression_
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.143"
  - "[[../research/2026-08-30-education-system]] — research basis"
  - "[[../plans/2026-08-29-employment-system-cascade]] — E1/E2/E3 stay closed; this plan does not reopen them"
  - "[[../canon/INSTITUTIONS]]"
---

# Education loop in isolation — earn a credential as a life event

**Goal:** A citizen’s `EducationLevel` becomes something that can be *lived* — minors’ school-stage follows age, hood school quality is prosperity-calibrated, and a `[Graduation]` event writes a credential — without touching hiring, promotions, or E3. Done = the education loop produces earned degrees as LifeHistory events; `applyEmployerSuccess_` and `matchUnemployedToOpenings_` grep-clean of EducationLevel.

**Architecture:** Isolation first (S405). Education is its own loop; connecting it to “why this person got the job” is a later plan, after this one fires clean. Three physics only: (1) minors `<18` have `EducationLevel` *derived from age* each cycle (same move E1 made for CareerStage — a description of where they are, not a dice promotion); at 18 `settleAdulthood_` still mints the adult credential. (2) `checkGraduation_` (ages 22–28, already in the generational engine) **writes** `EducationLevel` when it fires — never a silent story line. No quota on graduates. Odds stay the existing cause×dice (age, tier, spring). Writes never downgrade. Live plural vocab (`bachelors`, not `bachelor`) is the only write form. (3) Neighborhood_Demographics H–L replay the S247 prosperity floor so West Oakland/Fruitvale kids are not sitting on a crisis gate the canon forbids. Youth_Events stays dead. No campuses. `runEducationEngine_` stays flavor. Career engines stay closed.

**Terminal:** engine-sheet (every code/sheet task). Grok: research+plan only. research-build: none.

**Pointers:**
- Prior work: [[../research/2026-08-30-education-system]]; E1 killed education-odds calendar promotions
- Related: engine.138 chase **precedes** any bench of this (ROLLOUT Next Session #3). Code may land committed-and-undeployed in the same wave as other undeployed engine work.
- Research basis: the research file above

**Sequencing lock:** do not bench this against live until (a) engine.138 S-B…S-E are not the active session, and (b) the builder stands a post-C105 bench. Same “committed-undeployed” rule as the chase. Do not mix with widening E3.

**Acceptance criteria:**
1. A synthetic 16-year-old row comes out of `processEducationCareer_` with `EducationLevel` in `{Elementary, Middle School, High School}` matching `getSchoolLevel_` bands (age 11–13 → Middle School). A synthetic 30-year-old with `bachelors` is unchanged.
2. `checkGraduation_` on a 24-year-old with `hs-diploma` and no `[Graduation]` marker, when the dice hit, writes `EducationLevel` to `associates` or `bachelors` (never `bachelor` / `graduate`) **and** appends `[Graduation]`. A second call on the same life does nothing.
3. `matchUnemployedToOpenings_` and `applyEmployerSuccess_` still have zero `EducationLevel` reads. `updateCareerProgression_` does not use education to change CareerStage.
4. After the ND replay, every Neighborhood_Demographics `SchoolQualityIndex` ≥ 7 and `GraduationRate` ≥ 85. Live minors restamp above the crisis gate on the next fire.
5. `runYouthEngine.js` contains zero `Oakland Unified` / `OUSD` / `SCHOOL-OUSD` strings. Youth_Events helpers are not resurrected.
6. Targeted tests green. `node --check` on every touched `.js`. No live sheet write from this lane.

---

## Wiring cards (required)

Ran 2026-08-30, OpenRouter Haiku. Full text in `output/grok/wiring-processEducationCareer.md`, `wiring-updateCareerProgression.md`.

- **processEducationCareer_** — `educationCareerEngine.js:124` v2.1. Both entry points Phase5-EducationCareer (`godWorldEngine2.js:375` / `:2039`), before Phase10. Orchestrator: derive → career-stage → mobility → school-quality check → minor stamp → settleAdulthood_.
- **updateCareerProgression_** — `:363`. E1: CareerStage from age. Reads EducationLevel into a dead local. This plan deletes that dead read or leaves it unused; it does **not** revive calendar promotion.

**Cut S409 (engine-sheet, `engine-wiring` on the G-PF31-repaired map):** `output/wiring/wiring-settleAdulthood.md`, `wiring-checkGraduation.md`, `wiring-deriveEducationLevels.md`, `wiring-runYouthEngine.md`. All four agree with the research; one addition — `processAdvancementIntake_:705` is a third EducationLevel writer (plural vocab already, no change needed).

---

## What this is not

- Not a university. INSTITUTIONS: one district, no campus. School names stay “an Oakland City Schools high school in [hood].”
- Not a job gate. A degree this wave is a fact the citizen lived. Eligibility for a different job is the *next* loop.
- Not a bulk rewrite of the 326 adult `bachelors/masters/doctorate` rows, and not a sweep of the 40 child-stage labels on current minors — derivation heals minors forward; adults keep their stamp.
- Not Youth_Events revival (engine.97).
- Not putting education odds back into `applyEmployerSuccess_`.
- Not `runEducationEngine_` growing a degree. Flavor stays flavor.

---

## Tasks

### Task 1: Unit test first — stage-from-age, graduation write, vocab, career-untouched

- **Files:**
  - `scripts/educationLoop.test.js` — create
- **Steps:**
  1. Fixture rows: age 7 / 12 / 16 / 18 / 24 / 40 with mixed `EducationLevel` (`Pre-K`, `hs-diploma`, `bachelors`, `bachelor`).
  2. Assert minor derivation table: 5–10 Elementary, 11–13 Middle School, 14–17 High School, `<5` Pre-K. Age 18+ not derived (settlement/graduation own those).
  3. Assert graduation writer: 24 + `hs-diploma` + dice hit → cell is `associates` or `bachelors` (exact strings from `lib/citizenDerivation.js` EDUCATION_LEVELS) + LifeHistory contains `[Graduation]`. Dice miss → cell unchanged. Already has `[Graduation]` → no-op. Input `bachelors` → never writes `hs-diploma`.
  4. Assert write vocab: engine must not emit `bachelor` or `graduate` (singular / catch-all). `eduRank_('bachelors') === 1`, `eduRank_('bachelor') === 1` still.
  5. Grep-as-test: `applyEmployerSuccess_` / `matchUnemployedToOpenings_` source still has no `EducationLevel`.
- **Verify:** `node scripts/educationLoop.test.js` → RED (writer not yet pointed).
- **Status:** [x] DONE S409 — `scripts/educationLoop.test.js`, 52 cases (stage bands, restamp scope, fill vocab, ladder monotonicity, dice + once-per-life, orchestrator end-to-end on a stub ctx, grep-as-tests). 52/52.

### Task 2: Canonical write helper + kill the header lie

- **Files:**
  - `phase05-citizens/educationCareerEngine.js` — modify
- **Steps:**
  1. Add `canonicalEducationWrite_(v)` next to `eduRank_`: map `bachelor`→`bachelors`, `graduate`→`masters` (graduate is not a doctorate; do not invent PhDs from a flag). Pass-through for live tokens in `hs-dropout / hs-diploma / some-college / associates / trade-cert / bachelors / masters / doctorate`. Child-stage tokens pass through only when the caller is the minor deriver.
  2. `deriveEducationLevels_` blank-fill: UNI→`bachelors`, MED→`doctorate` (medical), CIV→`some-college`, Graduation-in-history→`bachelors`, adult roll stays 5/10/85 but writes `hs-dropout` / `some-college` / `hs-diploma`. Still fill-only. Still never re-rolls a set cell.
  3. Delete or rewrite the v2.0 header claim “Education affects career advancement speed” (`:15`, `:39`, `:107`, `:155`, `:477`). Replacement: “EducationLevel is identity plus lived graduation; CareerStage is age (E1); employer success is the promotion path (E2).”
  4. Remove the unused `education` local in `updateCareerProgression_` (`:405`) so the dead read cannot grow back.
- **Verify:** Task 1 vocab asserts still RED until Task 4; `node --check phase05-citizens/educationCareerEngine.js`. Grep `affects career advancement` in that file → 0.
- **Status:** [x] DONE S409 — `EDUCATION_LEVELS` is now the live plural vocab (+ child stages); `EDUCATION_LEGACY_WRITE` + `canonicalEducationWrite_` (bachelor→bachelors, graduate→masters, none→Pre-K); fill writes MED→doctorate / UNI→bachelors / CIV→some-college / minors→stage; five header claims rewritten; dead `education` local and its `iEducation` index removed from `updateCareerProgression_`.

### Task 3: Minors — EducationLevel derived from age (E1 analog)

- **Files:**
  - `phase05-citizens/educationCareerEngine.js` — modify (`updateCareerProgression_` or a new `deriveMinorEducationStage_` called from `processEducationCareer_` after deriveEducationLevels_)
  - `phase04-events/generationalEventsEngine.js` — read (birth already writes `Pre-K`; keep)
- **Steps:**
  1. For ENGINE-clock, non-deceased, age `<18`: set `EducationLevel` from age bands in Task 1. Sports-layer kids skipped (same `isSportsLayerRow_` guard as career stage).
  2. Age ≥18: do not touch the cell here. `settleAdulthood_` remains the 18-year-old credential mint.
  3. Do not invent a new sheet column. School-stage lives in EducationLevel until 18, then the settlement overwrites it with a credential — that overwrite *is* the graduation-from-K12 the city already has.
- **Verify:** Task 1 minor-derivation GREEN. A 16-year-old `bachelors` (bad mint) is restamped to High School — that is the heal-forward, same as E1 restamping CareerStage.
- **Status:** [x] DONE S409 — `deriveMinorEducationStage_` (Step 1b of `processEducationCareer_` v2.2), E1 scope (ENGINE-clock, non-deceased, sports-layer skipped); `schoolStageForAge_` bands; log line carries `MinorStages: restamped/minors`.

### Task 4: Graduation event writes the credential

- **Files:**
  - `phase04-events/generationalEventsEngine.js` — modify `checkGraduation_`
- **Steps:**
  1. Keep the existing age window 22–28, once-via-`[Graduation]`, existing odds (base 0.005 / tier≥3 0.01 / ages 24–26 +0.005 / spring ×3 / May–June ×2). No new cap. No “exactly N graduates per cycle.”
  2. On hit, besides returning the story payload, mutate the ledger row: `EducationLevel = canonicalEducationWrite_(nextLevel)`. `nextLevel`: if current is `hs-dropout` or `none` or child-stage leftover → `hs-diploma`; if `hs-diploma` → `associates` (SchoolQuality < 8) or `bachelors` (≥8, or blank SQ → `associates`); if `associates` / `some-college` / `trade-cert` → `bachelors`; if `bachelors` → `masters`; `masters`/`doctorate` unchanged (event still records, cell stays).
  3. Never write singular `bachelor`/`graduate`. Never lower a rank (`eduRank_` after ≥ `eduRank_` before).
  4. If `checkGraduation_` has no row handle today (signature is popId/age/lifeHistory), thread the row or a setter from the caller — **do not** append LifeHistory in two places. One writer, one cell, one line. Wiring card for `checkGraduation_` before this cut.
- **Verify:** Task 1 graduation asserts GREEN.
- **Status:** [x] DONE S409 — `graduationCredential_` (pure ladder, `GRADUATION_LADDER_`) in `generationalEventsEngine.js`; the caller writes `row[iEducationLevel]` on a hit and stamps `gradResult.credential`; `applyMilestone_` stays the single LifeHistory writer. `checkGraduation_` itself untouched (signature, odds, window).

### Task 5: Canon-voice leftover + prosperity ND replay (sheet, engine-sheet only)

- **Files:**
  - `phase05-citizens/runYouthEngine.js` — modify
  - `scripts/backfillNeighborhoodEducation.js` — run `--apply` (engine-sheet; already exists; S247)
- **Steps:**
  1. Fall sports block (`runYouthEngine.js:572-584`): `youthName: 'Oakland Unified'` / `youthId: 'SCHOOL-OUSD'` → `Oakland City Schools` / `SCHOOL-OCS`. Description already generic; keep it.
  2. Grep the file for `Unified` / `OUSD` → 0.
  3. Engine-sheet replays `node scripts/backfillNeighborhoodEducation.js --apply` on **live** Neighborhood_Demographics (operator-gated; grok does not run this). Read-back: all rows SchoolQualityIndex ≥ 7, GraduationRate ≥ 85. Next cycle `updateMinorSchoolQuality_` restamps the 51 minors.
  4. Do not lower any hood to make crisis hooks fire.
- **Verify:** `rg -n 'OUSD|Oakland Unified' phase05-citizens/runYouthEngine.js` → 0. Sheet read-back table in the plan changelog when engine-sheet runs it.
- **Status:** [x] DONE S409 — code LIVE @14; **live ND floor applied 2026-09-01 on Mike's go after the INSTITUTIONS §Neighborhoods review** (22 rows, floor semantics, 0 below floor, Rockridge held 9/95, West Oakland 3/62 → 8/91, Fruitvale 3/65 → 8/89). **Laurel set to the upper band 8/89/61/8/13000 by canon ruling** — the only hood whose INSTITUTIONS entry names schools as its character, so it belongs on the bachelor's track, not the associate's. 13 hoods at 8+, 9 at 7 (Temescal, D4 trio, East Oakland, San Antonio, Chinatown, Eastlake, KONO — the places canon says the boom has not fully reached). `backfillNeighborhoodEducation.js` now has FLOOR semantics (never lowers: Rockridge keeps 9/95); dry run 2026-09-01 shows West Oakland 3/62 → 8/91, Fruitvale 3/65 → 8/89, 14 hoods below the band rise, 8 unchanged or floored.

### Task 6: Proof the career path was not touched

- **Files:**
  - `phase05-citizens/runCareerEngine.js` — read only
  - `scripts/educationLoop.test.js` — already has the grep-as-test
- **Steps:**
  1. Confirm `applyEmployerSuccess_` and `matchUnemployedToOpenings_` diffs are empty in this plan’s commits.
  2. Changelog this plan: “E2/E3 untouched.”
- **Verify:** `git diff` on `runCareerEngine.js` empty across the education commits. Task 1 career-untouched GREEN.
- **Status:** [x] DONE S409 — `runCareerEngine.js` untouched across every education commit (`git diff` empty); Task 1 grep-as-tests green. E2/E3 untouched.

---

## After this loop (not this plan)

Once a bench fire shows `[Graduation]` lines that match EducationLevel cell changes, and minors restamp with hood quality ≥7:

The **connection** plan (separate file, after isolation proof) is the one S405 asked education to eventually feed: a lived credential as *one cause* among others that a later career event can read — still not a hard job gate, still not a calendar promotion, still not widening E3. Do not sketch that coupling here. Connecting early is the failure mode the ruling named.

Generic citizens as job-fillers stay on the employment cascade / a GC plan, not this one.

---

## Open questions

None that block. Decisions locked in this file:

- Isolation before connection (S405).
- No new column; minors use EducationLevel as school-stage until 18.
- Graduation window stays 22–28; it writes the cell.
- Live plural vocab is the write form.
- Prosperity floor, not crisis theatre.
- Youth_Events stays dead.

---

## Changelog

- 2026-09-01 (engine-sheet, S410) — **Smoke done on the bench, not live** (builder: the synced bench is the smoke). C106 on the live-synced sheet: 52 minors, 0 ENGINE-clock minors off their engine-year band (`simYear = 2040 + floor(cycle/52)` = 2042 at C106, so the eight 'hs-diploma' 17-year-olds by a 2041 anchor are 18 to the engine), 0 errors. Row → done-pending-archive. Connection loop opened as engine.144 (`2026-09-01-education-career-connection.md`), live PROD @16 same session.

- 2026-08-31 (grok) — Initial plan after S405 “build education next” + builder ask. Isolation loop only. Companion to inbox research `2026-08-30-grok-education-system.md`.
- 2026-09-01 (engine-sheet, S409) — Accepted and built the same session: Tasks 1–4 + 6 done, Task 5 code done with the live ND replay awaiting builder go. Engine code committed UNDEPLOYED — rides the wave AFTER the current bench batch proves (one unverified change in flight). Bench checklist, in order: (a) the current batch (pinned `2902f969`) proves and deploys first; (b) run `backfillNeighborhoodEducation.js --apply` against the BENCH sheet before the education fire — SANDBOX 0831 is a C105 copy and carries the same 3/62, so `MinorStages` would otherwise restamp 51 kids from the crisis-gate index (bench write, no builder go needed; the LIVE replay is the one that needs go); (c) push HEAD, fire two cycles. Acceptance: `processEducationCareer_ v2.2: … MinorStages: N/51`, minors restamp to stage labels, a `[Graduation]` line whose row moved `hs-diploma → associates|bachelors`, `EDU_SAVINGS_FACTOR` now seeing plural tokens on engine-filled rows. Pre-existing and left alone: `getSeasonalLimits_` caps graduations at 2/cycle (4 in spring) — the plan said no *new* cap; whether the old one survives the no-output-caps doctrine is a builder call.
- 2026-09-01 (engine-sheet, S409) — **Bench-proven and LIVE.** SANDBOX 0831 @3 (wave 2 over wave 1), bench ND floor applied first, then C110 + C111: both `ok:true`, 129 phases, 0 errors. C110: 43 bench minors, **0 ENGINE-clock minors off their age band** (two `grade-school` leftovers healed; the two `associates` minors are non-ENGINE clock, outside E1 scope by design), minors' SchoolQuality 3–9 → **7–10**, **two real `[Graduation]` events wrote the credential** — Rafael Phillips and Rosa Martinez, `hs-diploma` → `associates` (blank SchoolQuality → the associate's track), 0 legacy tokens anywhere. C111: still 0 off-band, both graduates held at one `[Graduation]` line (once-per-life), no new graduations (28 eligible, ~0.3/cycle expected off-spring). Live: **PROD @14**, pull-back byte-verified, HELD four at base. Smoke-test = the next live cycle (Mike fires); wanted from its execution log: `processEducationCareer_ v2.2 … MinorStages: N/51`.
- 2026-09-01 (engine-sheet, S409) — Live ND floor replayed on Mike's go after the canon review (see Task 5); Laurel 8 by ruling. Bench re-synced from live at C105 (78 tabs, read-back OK) with code @3 = live @14 so the bench C106 fire replays live's C106 for the execution-log read.
