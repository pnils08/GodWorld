---
name: pre-flight
description: Verify manual inputs are ready before running a cycle. Sports feed, intakes, initiative tracker, coverage ratings.
version: "1.1"
updated: 2026-05-24
tags: [engine-sheet, active]
effort: low
disable-model-invocation: true
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

Read `Initiative_Tracker` for all rows. Check **only**:

- Every real-initiative row has Name, Status, ImplementationPhase, PolicyDomain, AffectedNeighborhoods populated (per §Placeholder Convention below — placeholder rows are NOT flagged as malformed)
- Status field is non-empty (string contents not validated)
- ImplementationPhase field is non-empty (string contents not validated)

**Enum policing REMOVED (S230 G-RC3, governance.14 T9):** pre-S230 the skill enforced a hardcoded enum list (announced / vote-scheduled / visioning / design-phase / etc.) that drifted every cycle as the engine added new phase values (C94 saw 4 phases missing from the skill's list: `design-development-active`, `legislation-filed`, `pilot_evaluation`, `vote-ready`). **Phase value validation now belongs to engine-side `applyTrackerUpdates.js`** — pre-flight's role is empty/required-field checks, not value-set policing. Mike S230 ruling: drop enum entirely; trust engine writer validation.

Flag malformed rows (missing required fields) as NOT READY per §Placeholder Convention.

## §Placeholder Convention (S230 G-RC4, governance.14 T9)

Initiative_Tracker rows fall into three classes. Pre-flight treats each differently:

| Class | Detection | Severity | Action |
|---|---|---|---|
| **Placeholder** | InitiativeID populated, all other fields empty (slot reserved for upcoming initiative) | INFO | Skip, don't block. Log "placeholder row INIT-NNN — reserved slot, no validation required." |
| **Partial-real** | InitiativeID + Name + some fields populated, BUT missing one or more engine-critical (Status, ImplementationPhase, PolicyDomain, AffectedNeighborhoods) | HIGH (NOT READY) | Block pre-flight pass. List the missing fields per row. Operator decides: complete the row or remove. |
| **Real** | InitiativeID + Name + (Status OR Phase) + at least PolicyDomain or AffectedNeighborhoods | passes | No action. |
| **Sheet bloat** | Fully empty rows past the last real row | INFO | Ignore. (Common when sheet was extended for future capacity.) |

Decision tree (apply in order; first match wins):
1. All cells empty → sheet bloat (INFO, ignore).
2. Only InitiativeID populated → placeholder (INFO, skip).
3. InitiativeID + Name + some fields, missing engine-critical → partial-real (NOT READY, block).
4. InitiativeID + Name + required fields → real (pass).

**Why this convention exists:** pre-S230 pre-flight treated placeholder rows identically to malformed mid-life data and false-flagged every cycle. C94 INIT-004 (placeholder, only InitiativeID populated, persisted across many cycles without engine complaint) demonstrated the gap. The convention preserves operator visibility (placeholders logged as INFO) without blocking on intentional reserved slots.

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
