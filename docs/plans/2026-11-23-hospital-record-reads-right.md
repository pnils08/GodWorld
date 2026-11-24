---
title: Hospital Record Reads Right Plan
created: 2026-11-23
updated: 2026-11-23
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
| 1 | Carried fraction: per hood, `expected = sick × careJusticeAdmitPerSick + carry`, admissions = whole part, the remainder carries to the next Cycle. Carry on its own carry-forward key `PREV_HOSP_ADMIT_CARRY_JSON` (the engine.249 pattern: compact in `finalizeCycleState.js`, seed in `loadPreviousEvening.js`, read in `careJusticeService.js`). A hood with no carried value starts at 0.5, which reproduces `Math.round` exactly on its first Cycle. The ambulance named-call count reads the same number | es | built (this commit) |
| 2 | A finished stay reads finished: the discharge and the ghost-release write StatusNow `discharged` (or `deceased`), not the citizen's life status. `buildCyclePacket.js` `persistHospitalLedger_` | es | built (this commit) |
| 3 | The three closed rows already reading `active` (C107, C109, C111): left as they are unless the builder rules an engine repair pass (closed row, StatusNow not `discharged`/`deceased` → stamped from its own Outcome). Rule 4: no hand edit | builder | waiting on his word |
| 4 | Readers count a stay open only with no DischargeCycle: `cron-work-wake.js` hospital-admissions fallback; `cron-saturday-run.js` open test; `buildLivesSlice.js` open stays; `buildHealthSlice.js` carries only stays still in care (builder 2026-11-23: "once they are out of care they should come off the beat") | es | built (this commit) |
| 5 | Truth docs in the same commit: SHEETS_MANIFEST (Carry_Forward_Store key list, Hospital_Ledger StatusNow on close), ENGINE_MAP rows 1-PrevCycleState / 9/10-CycleState, STUB_MAP regenerated | es | built (this commit) |
| 6 | Bench: two fires from a live sync (needs the builder's test unlock). Read off the census rows and the log | es | not started |
| 7 | PROD push; smoke at C118 Sun 2026-11-29 | es | not started |

## Acceptance

1. Over two bench fires, the four small hoods carry a fraction between 0 and 1 in the log and blob, and a hood admits one when its carry crosses 1. The city admission total sits within one of Σ sick × 0.02 each Cycle. Every census row stays `complete`. Proven by the bench read-off.
2. First Cycle on the code with no blob: each hood's admissions equal `Math.round(sick × 0.02)`, so there is no jump. Proven by the bench log line against the C117 numbers.
3. A stay discharged on the bench reads StatusNow `discharged` with Outcome `recovered` and DischargeCycle set. Proven by the bench Hospital_Ledger readback.
4. The hospital worker's feed, the Lives slice and the Saturday run name no closed stay as open. Proven by running each builder against `output/beats` C117.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| advisor | es | in-session 2026-11-23 | read-only: verify the cause against `72165640a`; leave the health slice's old-stay choice to its owner; carry on its own key; 0.5 start |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | Carry on its own carry-forward key, never inside PREV_CYCLE_STATE_JSON (sits ~8.2 KB of 9 KB) | es · advisor | `finalizeCycleState.js` savePreviousCycleState_ comment (engine.219) |
| A2 | Every reader keys on DischargeCycle whatever the stamp, since the three old rows keep `active` | es · advisor | this plan §What was read |

### Needs proof

| # | Claim | Proof that settles it |
|---|---|---|
| N1 | The carry holds across two separate fires (props + Carry_Forward_Store ring) | bench fire 2 log reads fire 1's carry |

### New concepts

| # | Concept | Status |
|---|---|---|
| C1 | The same rounding on arrests (`Math.round(charges × clearance)`, `careJusticeService.js`); Rachel's record reads 1 or 2 everywhere | builder 2026-11-23: "we will do arrests next" — its own row after this one |
| C2 | Closed stays leave Lila's weekly record | adopted, builder 2026-11-23: "yes once they are out of care they should come off the beat" — Task 4 |

## Changelog

- 2026-11-23 (engine-sheet) — Plan written on the builder's go; carried fraction chosen by him over the dice.
- 2026-11-23 (engine-sheet) — Tasks 1, 2, 4, 5 built. Nine-week dry run on C117 sick counts: week 1 equals rounding hood for hood (city 34); small hoods admit 1 about one week in three; city 32–37 around 34.3. Bench waits on the test unlock.
- 2026-11-23 (engine-sheet) — Builder: out of care comes off the beat (health slice carries open stays only; C117 renders none of the three); arrests next. Tests around the change pass after the unlock.
