---
name: pre-flight
description: Verify manual inputs are ready before running a cycle. Sports feed, intakes, initiative tracker, coverage ratings.
version: "1.0"
updated: 2026-04-17
tags: [media, active]
effort: low
---

# /pre-flight — Pre-Cycle Input Check

## Purpose

Checks that manual inputs are ready before the engine runs. The engine won't fail without these — it will produce a cycle with silent gaps.

## Step 1: Sports Feed

Read `Oakland_Sports_Feed` for the target cycle number.

**Required columns (entry is invisible without these):** Cycle, SeasonType, EventType, TeamsUsed

**Recommended columns (texture is thin without these):** NamesUsed, Team Record, FanSentiment, PlayerMood

Flag missing required as NOT READY. Flag missing recommended as WARNING.

## Step 2: Citizen Intake

NOT WIRED. Placeholder for when citizen intake from editions feeds back to the engine.

## Step 3: Business Intake

NOT WIRED. Placeholder for when business intake from editions feeds back to the engine.

## Step 4: Storyline Intake

NOT WIRED. Placeholder for when storyline intake from editions feeds back to the engine.

## Step 5: Initiative Tracker

Read `Initiative_Tracker` for all rows. Check:

- Every row has Name, Status, ImplementationPhase, PolicyDomain, AffectedNeighborhoods populated
- Status values match engine's known set: announced, vote-scheduled, visioning, visioning-complete, design-phase, construction-planning, construction-active, implementation-active, disbursement-active, dispatch-live, pilot-active, operational, complete, stalled, blocked, suspended, defunded
- ImplementationPhase values match the same set

Flag malformed rows as NOT READY.

## Step 6: Edition Coverage Ratings

Read `Edition_Coverage_Ratings` for previous cycle.

- Rows exist with Cycle, Domain, Rating populated
- Rows not already marked Processed

Flag missing as WARNING — engine runs without media feedback.

## Output

```
PRE-FLIGHT: Cycle {XX}
========================
[x] Sports Feed: 3 entries, all required columns populated
[ ] Citizen Intake: NOT WIRED
[ ] Business Intake: NOT WIRED
[ ] Storyline Intake: NOT WIRED
[x] Initiative Tracker: 6 rows, all valid
[!] Coverage Ratings: MISSING for C{XX-1}
========================
READY / NOT READY
```

## Sheet Access

Service account via `lib/sheets.js`. Spreadsheet ID from `.env`.
