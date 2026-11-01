---
name: pre-flight
description: Verify manual inputs are ready before running a cycle. Sports feed, intakes, initiative tracker, coverage ratings.
version: "1.2"
updated: 2026-05-30
tags: [engine-sheet, active]
effort: low
disable-model-invocation: true
---

# /pre-flight — Pre-Cycle Input Check

## Purpose

Checks that manual inputs are ready before the engine runs. The engine won't fail without these — it will produce a cycle with silent gaps.

## Run (canonical)

```bash
node scripts/preflightInputCheck.js              # auto-derive target cycle from SESSION_CONTEXT
node scripts/preflightInputCheck.js --cycle=96   # explicit target
```

The script (ES-7 / G-PF1) is the deterministic check — it loads env via `require('../lib/env')`, reads the sheets, classifies every Initiative_Tracker row by §Placeholder Convention, and prints the §Output report. **Run it; review the output.** The step descriptions below document *what it checks* so you can read the verdict — they are not a manual procedure to re-derive each cycle.

**Exit codes:** `0` READY (or warnings only) · `1` NOT READY (missing required sports cols OR partial-real initiative rows) · `2` argument/data error. Fail the gate on a non-zero exit.

Real output (C95):

```
PRE-FLIGHT: Cycle 95
========================================
Target derivation: --cycle=95 (explicit)

[x] Sports Feed: 5 entries, all required + recommended columns populated
[ ] Citizen Intake: NOT WIRED
[ ] Business Intake: NOT WIRED
[ ] Storyline Intake: NOT WIRED
[x] Initiative Tracker: 6 real / 1 placeholder / 0 bloat
      INFO placeholder INIT-004 — reserved slot, no validation required
[x] Coverage Ratings: C94 — 3 rows (0 unprocessed, ready for engine intake)
========================================
READY
```

Gap fixes baked into the script vs the pre-S246 manual flow: env-loader (G-PF2), 3-class initiative output (G-PF3), cycle auto-derivation (G-PF4), Processed-enum semantics (G-PF5), canonical `InitiativeID` keying (G-PF6).

---

## What the script checks (reference)

### Step 1: Sports Feed

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
- Rows not already marked Processed. **Processed enum (G-PF5):** a row counts as unprocessed unless its `Processed` cell lowercases to `'true'` — matches the write-side check in `phase02-world/applyEditionCoverageEffects.js`.

Flag missing as WARNING — engine runs without media feedback.

## Output

Canonical output shape is shown under §Run above (real C95 verdict). The Initiative Tracker line carries the §Placeholder Convention 3-class breakdown — `<real> real / <placeholder> placeholder / <bloat> bloat` with per-row INFO/partial-real detail — **not** a flat "all valid" (G-PF3). Verdict line is `READY` / `NOT READY` matching the exit code.

## Sheet Access

Service account via `lib/sheets.js`. Env loaded via `require('../lib/env')` (sources `~/.config/godworld/.env`, **NOT** a project-root `.env` — that file doesn't exist). Spreadsheet ID = `GODWORLD_SHEET_ID`. The canonical script already does this load; only relevant if you read sheets by hand. (G-PF2)
