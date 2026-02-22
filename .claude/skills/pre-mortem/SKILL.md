---
name: pre-mortem
description: Scan engine phases before a cycle run to predict silent failures. Checks ctx field dependencies, sheet header alignment, code rule violations, and cascade risks.
---

# /pre-mortem — Engine Health Scan

## Usage
`/pre-mortem`
- Run before `/run-cycle` to catch problems before they cascade
- Produces a risk report with specific file:line references

## What This Scans

### 1. Math.random() Violations
Scan all `.js` files in `phase01-config/` through `phase10-persistence/` and `utilities/` for `Math.random()`. Every hit is a determinism violation — must use `ctx.rng`.

```bash
grep -rn "Math\.random()" phase*/  utilities/ --include="*.js"
```

Report each hit with file and line number. Zero tolerance — any hit is CRITICAL.

### 2. Direct Sheet Writes Outside Phase 10
Scan `phase01-config/` through `phase09-digest/` for sheet write calls: `getRange`, `setValue`, `setValues`, `appendRow`, `getSheetByName(...).get`. These should only appear in `phase10-persistence/` files.

**Exception:** `phase05-citizens/householdFormationEngine.js`, `phase05-citizens/generationalWealthEngine.js`, and `phase05-citizens/educationCareerEngine.js` are documented exceptions — they write directly to sheets by design (see SESSION_CONTEXT.md cascade dependencies).

Report any non-excepted hits as WARNING with file and line.

### 3. ctx Field Dependency Check
This is the most important check. Phase 5 has 14+ sub-engines that read and write ctx fields. If Engine A reads `ctx.summary.careerSignals` but Engine B (which writes it) hasn't run yet, the field is undefined.

**How to check:**
1. Read `phase01-config/godWorldEngine2.js` — find the execution order of all phases and sub-engines
2. For each Phase 5 sub-engine, scan for `ctx.summary.*` and `ctx.config.*` reads
3. Verify the field was written by a previously-executed engine or phase
4. Flag any read-before-write as CRITICAL — this is a silent failure (the engine runs but uses undefined data)

**Known dependency chain (verify these are still correct):**
- Career Engine → Economic Ripple Engine (via `ctx.summary.careerSignals`)
- Demographics → Civic Voting, Story Hooks, City Dynamics
- World Events → Arc Engine, Media Briefings
- HouseholdFormation → GenerationalWealth → EducationCareer (Phase 5 chain)

### 4. Sheet Header Alignment
Check that columns referenced in engine code actually exist in the sheets. Use the service account to read sheet headers:

```javascript
// Pattern to check: engine code references a column name
// Verify it exists in the actual sheet
```

Read `schemas/SCHEMA_HEADERS.md` for the canonical column list. Compare against column names used in engine write-intents (`{column: value}` patterns in Phase 10 files).

Flag any mismatch as WARNING — column in code but not in sheet means silent data loss.

### 5. Neighborhood Reference Validation
Scan all engine files for neighborhood string literals. GodWorld has 17 canonical Oakland districts. Any reference to a neighborhood not in the canonical list is a WARNING.

The 17 districts: Downtown, West Oakland, East Oakland, Fruitvale, Temescal, Rockridge, Piedmont, Jack London, Lake Merritt, Grand Lake, Laurel, Dimond, Montclair, Brooklyn, Chinatown, Adams Point, Uptown.

### 6. Write-Intent Target Validation
Scan Phase 10 persistence files for write-intent processing. Check that every target sheet name referenced in write-intent handlers matches an actual sheet. A write-intent targeting a non-existent sheet is a silent failure — the data just disappears.

## Output Format

```
PRE-MORTEM SCAN — [Date]
================================================

CRITICAL (will cause silent failures):
1. [file:line] — Math.random() in phase05-citizens/runYouthEngine.js:47
2. [file:line] — ctx.summary.careerSignals read in economicRippleEngine.js:23 before runCareerEngine.js executes

WARNINGS (may cause data loss or drift):
3. [file:line] — Column "HousingStress" in householdFormationEngine.js not found in SCHEMA_HEADERS.md
4. [file:line] — Neighborhood "Eastlake" in storyHook.js:89 not in canonical 17 districts

CLEAN:
- Math.random(): 0 violations
- Sheet writes outside Phase 10: 0 (3 documented exceptions)
- ctx dependencies: all verified
- Sheet headers: all aligned
- Neighborhoods: all canonical

================================================
RECOMMENDATION: [SAFE TO RUN | FIX BEFORE RUNNING]
```

## When to Run
- Before every `/run-cycle`
- After any engine code changes
- After adding new columns to sheets
- After editing Phase 5 sub-engine execution order
