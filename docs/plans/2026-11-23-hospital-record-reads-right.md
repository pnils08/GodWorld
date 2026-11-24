---
title: Hospital Record Reads Right Plan
created: 2026-11-23
updated: 2026-11-24
type: plan
tags: [engine, health, media, active]
sources:
  - commit 72165640a (pipeline.111, Lila on the mold — the engine gaps found; her C117 test piece)
  - output/research-build/2026-11-21-p111/lila-c117-test-piece.md
  - live Hospital_Ledger + Care_Justice_Census C117 + Neighborhood_Demographics C117 (read 2026-11-23)
  - engine-wiring card, runCareJusticeDemand_ / S.careJusticeDemand (2026-11-23, in-session)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.364"
  - "[[2026-09-21-care-and-justice-system]] — engine.254, the census and the demand model this changes"
  - "[[2026-11-21-reporters-wake-as-themselves]] — pipeline.111, the health seat whose record this feeds"
---

# Hospital Record Reads Right Plan

**Builder's words (2026-11-23):** "This is the Job and the issue that flagged this was how the health media cron reports on it , so as the engine may be working properly the way the cron receives causes an issue, the carried fraction seems to be more in line with the sim?"

Earlier the same day, on pipeline.111: "only tracked citizens show up in beds and the main population shows up just in raw data … not sure if this is how her data is handed or what causes that".

**Goal:** a small hood's sick residents reach the hospital at their real rate over the weeks, a finished stay reads finished on the record, and every reader that hands the record to a reporter or worker counts a stay open only while it has no discharge Cycle.

**Rows:** engine.364 · **Owner:** engine-sheet. Touches research-build's `scripts/buildHealthSlice.js` (pipeline.111, Lila's record) for one clause only, Task 4.

## What was read (2026-11-23, live C117)

| Claim handed over | Found |
|---|---|
| Small hoods round to zero hospital cases | True. `careJusticeService.js:209` `Math.round(sick × 0.02)`. Lake Merritt 17 sick → 0.34 → 0; Uptown 20, KONO 16, Baylight 13 → 0 every Cycle. A hood needs 25 sick to admit one. Big hoods lose the fraction too (64 → 1.28 → 1 each week) |
| Tracked patients missing from the census; Lake Merritt shows nobody while Deacon Seymour is there | Not so. Deacon admitted C105, discharged C107 recovered (2 Cycles). Yu Zen discharged C109, Maurice Franklin C111. The census keys on DischargeCycle and is right |
| Those three in care about 12 Cycles | From the record she was handed: before `72165640a` the health slice printed only StatusNow, and all three read `active` → "in care since C112" |
| (found) | The discharge writes the citizen's new life status (`active`, `Retired`, …) into StatusNow, so every finished stay reads `active`. After `72165640a` her test piece ran it as "Three 'Active' Patients Were Discharged Cycles Ago. The Ledger Never Closed Their Charts." |
| (found) | Three readers key a stay's openness on StatusNow `active`: the hospital worker's "admissions on the board" fallback lists finished stays; the Saturday run's and the Lives slice's open-stay test (`active` + no discharge) misses every real open stay, whose StatusNow is `hospitalized` / `critical` / … |

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Carried fraction: per hood, `expected = sick × careJusticeAdmitPerSick + carry`, admissions = whole part, the remainder carries to the next Cycle. Carry on its own carry-forward key `PREV_HOSP_ADMIT_CARRY_JSON` (the engine.249 pattern: compact in `finalizeCycleState.js`, seed in `loadPreviousEvening.js`, read in `careJusticeService.js`). A hood with no carried value starts at 0.5, which reproduces `Math.round` exactly on its first Cycle. The ambulance named-call count reads the same number | es | done |
| 2 | A finished stay reads finished: the discharge and the ghost-release write StatusNow `discharged` (or `deceased`), not the citizen's life status. `buildCyclePacket.js` `persistHospitalLedger_` | es | done |
| 3 | The three closed rows already reading `active` (C107, C109, C111): left as they are unless the builder rules an engine repair pass (closed row, StatusNow not `discharged`/`deceased` → stamped from its own Outcome). Rule 4: no hand edit | builder | waiting on his word |
| 4 | Readers count a stay open only with no DischargeCycle: `cron-work-wake.js` hospital-admissions fallback; `cron-saturday-run.js` open test; `buildLivesSlice.js` open stays; `buildHealthSlice.js` carries only stays still in care (builder 2026-11-23: "once they are out of care they should come off the beat") | es | done |
| 5 | Truth docs in the same commit: SHEETS_MANIFEST (Carry_Forward_Store key list, Hospital_Ledger StatusNow on close), ENGINE_MAP rows 1-PrevCycleState / 9/10-CycleState, STUB_MAP regenerated | es | done |
| 6 | Bench: two fires from a live sync (needs the builder's test unlock). Read off the census rows and the log | es | done — bench.log C118/C119 PASS, bench3.log stamp PASS |
| 7 | PROD push; smoke at C118 Sun 2026-11-29 | es | LIVE stage 77 @212; smoke C118 |

## Acceptance

1. Over two bench fires, the four small hoods carry a fraction between 0 and 1 in the log and blob, and a hood admits one when its carry crosses 1. The city admission total sits within one of Σ sick × 0.02 each Cycle. Every census row stays `complete`. Proven by the bench read-off.
2. First Cycle on the code with no blob: each hood's admissions equal `Math.round(sick × 0.02)`, so there is no jump. Proven by the bench log line against the C117 numbers.
3. A stay discharged on the bench reads StatusNow `discharged` with Outcome `recovered` and DischargeCycle set. Proven by the bench Hospital_Ledger readback.
4. The hospital worker's feed, the Lives slice and the Saturday run name no closed stay as open. Proven by running each builder against `output/beats` C117.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| advisor | es | in-session 2026-11-23 | read-only: verify the cause against `72165640a`; leave the health slice's old-stay choice to its owner; carry on its own key; 0.5 start |
| agy adversarial diff read | agy | [[../../output/antigravity/2026-11-24-review-engine364]] | SHIP-WITH-FIXES: F1, F3, F4 folded; F2 held |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | Carry on its own carry-forward key, never inside PREV_CYCLE_STATE_JSON (sits ~8.2 KB of 9 KB) | es · advisor | `finalizeCycleState.js` savePreviousCycleState_ comment (engine.219) |
| A2 | Every reader keys on DischargeCycle whatever the stamp, since the three old rows keep `active` | es · advisor | this plan §What was read |
| A3 | The health slice's census names (`beatSliceKit.js` careNamesByHood) key on the stay's Cycles, as its patient lines do | es · agy | review F1; `buildHealthSlice.js` passes the Cycle |
| A4 | A carried value that is not a number in [0, 1) throws (it coerced `false`/`[]`/blank to 0) — engine file, rides the engine.365 bench + push | es · agy | review F3; `careJusticeService.test.js` 364c |
| A5 | Tests: carry start = rounding, carry crossing one, bad carry throws; released stay stamped; quiet-week board; health beat drops a closed stay | es · agy | review F4 |

### Needs proof

| # | Claim | Proof that settles it |
|---|---|---|
| N1 | The carry holds across two separate fires (props + Carry_Forward_Store ring) | bench fire 2 log reads fire 1's carry |

### New concepts

| # | Concept | Status |
|---|---|---|
| C1 | Arrests (engine.365). C117: arrests = round(incidents × clearance), 1 or 2 in every hood (176 hood-Cycles C110–C117: 117 at 1, 55 at 2, 4 at 3); rounding lost 1.76 of 29.76 (C117) and 3.75 of 27.75 (C116), and court revenue with them. Incidents = (property + violent level) / 2 / 5.5 (`updateCrimeMetrics.js` calculateNeighborhoodCrime_), no population term, every level reverts to the city median: Lake Merritt (611) 6 incidents, Downtown (2,797) 7. OARI diversions subtract from nothing. Builder 2026-11-23: "1 - yes 2 - yes, but there does need to be a mechanism in place for the smaller neighborhood that may run a higher crime rate, I think Dimond is one of the areas we choose to start here, instutions.md may shed some light on how we set out oakland post tech boom, 3 - yes diverted". INSTITUTIONS.md Dimond: "the district still living down a past era … the operation is gone and the name is not. Nothing current, everything remembered" — read against his word at pickup | filed engine.365 |
| C2 | Closed stays leave Lila's weekly record | adopted, builder 2026-11-23: "yes once they are out of care they should come off the beat" — Task 4 |
| C3 | `replayCycle` saves every PREV_* carry-forward blob (save gates on dry-run only) and loads the newest carry, not the replayed Cycle's — older than engine.364, every key | held: review F2; a row on the builder's word |

## Changelog

- 2026-11-23 (engine-sheet) — Plan written on the builder's go; carried fraction chosen by him over the dice.
- 2026-11-23 (engine-sheet) — Tasks 1, 2, 4, 5 built. Nine-week dry run on C117 sick counts: week 1 equals rounding hood for hood (city 34); small hoods admit 1 about one week in three; city 32–37 around 34.3. Bench waits on the test unlock.
- 2026-11-23 (engine-sheet) — Builder: out of care comes off the beat (health slice carries open stays only; C117 renders none of the three); arrests next. Tests around the change pass after the unlock.
- 2026-11-24 (engine-sheet) — Bench three fires PASS (rounding start, carry admits the four small hoods, ghost-release stamps discharged); LIVE stage 77 @212. agy adversarial review sent (`docs/for-claude-review/2026-11-24-es-brief-agy-engine364.md`).
- 2026-11-24 (engine-sheet) — agy SHIP-WITH-FIXES verified against the code: F1 (census names by Cycles) and F4 (tests) folded and live with the repo; F3 (carry type check) committed, rides engine.365's bench; F2 (replay saves the carries) held as C3, older than this job.
