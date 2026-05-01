---
name: pre-mortem
description: Scan engine phases before a cycle run to predict silent failures. Checks ctx field dependencies, sheet header alignment, code rule violations, and cascade risks.
version: "1.2"
updated: 2026-04-26
tags: [engine, active]
effort: high
disable-model-invocation: true
---

# /pre-mortem — Engine Health Scan

## Usage
`/pre-mortem`
- Run before `/run-cycle` to catch problems before they cascade
- Produces a risk report with specific file:line references

## What This Scans

### 0. Engine Code Changes Since Last Cycle
**Always run this first.** Lists every commit that actually touched engine-path files since the last cycle shipped. Prevents the "nothing has changed, not re-scanning" failure where the skill looks at raw recent commits (which are often docs/journal/terminals) and falsely concludes the cycle path is unchanged.

```bash
# Replace <last-cycle-date> with the date the previous edition published.
git log --since="<last-cycle-date>" --pretty=format:"%h %ad %s" --date=short \
  -- 'phase*/**/*.js' 'scripts/*.js' 'lib/*.js' 'utilities/*.js'
```

If the filtered list is empty AND the raw `git log --since` list is also empty, state "no engine touches since last cycle" and proceed. If the filtered list has entries, list them — every subsequent scan (ctx chain, headers, neighborhoods) must be rerun regardless of any cached "unchanged" memory.

### 1. Math.random Determinism Violations
Scan all `.js` files in `phase01-config/` through `phase10-persistence/` and `utilities/` for **any** mention of `Math.random` — both invocations (`Math.random()`) and reference-passes (`var rng = Math.random;`, `fn(Math.random)`). Both break determinism when they run on the cycle path. The old grep pattern `Math\.random\(\)` missed reference-pass sites (S166 found three in `utilities/utilityFunctions.js` that had shipped through every prior cycle run).

```bash
# Pattern: any Math.random mention, excluding /* */ and // comment lines
grep -rn "Math\.random" phase*/ utilities/ --include="*.js" \
  | grep -Ev '^[^:]+:[0-9]+:[[:space:]]*(\*|//)'
```

For each hit, classify:

- **CRITICAL** — the file is on the cycle path (invoked by `godWorldEngine2.js` or any phase function that runs during a cycle). Trace callers if unsure: `grep -rn "functionName(" phase*/ scripts/ lib/ --include="*.js"`.
- **WARNING (acknowledged, off-path)** — the file is outside the cycle path. Known acknowledged sites as of 2026-04-19:
  - `phase05-citizens/civicInitiativeEngine.js:2009` — manual-vote path, explicit "no ctx.rng outside cycle" comment
  - `phase05-citizens/citizenContextBuilder.js:1068` — `getCitizensForQuotes`, media-room helper
  - `phase05-citizens/generateChicagoCitizensv1.js:433` — `testChicagoCitizenGeneration_`, test function
- **CLEAN (defensive throw)** — the mention is inside a `throw new Error(...)` string for a removed fallback. These are guards, not violations. Pattern: `phase04-events/generationalEventsEngine.js:105,111`, `phase05-citizens/generateGenericCitizens.js:98`, `utilities/safeRand.js:35`.

Anything not on the acknowledged or defensive-throw lists is CRITICAL until proven otherwise — verify by tracing callers back to the engine entry point.

### 2. Direct Sheet Writes Outside Phase 10
Scan `phase01-config/` through `phase09-digest/` for sheet write calls: `getRange`, `setValue`, `setValues`, `appendRow`, `getSheetByName(...).get`. These should only appear in `phase10-persistence/` files.

**Exception list lives in `.claude/rules/engine.md`.** That file enumerates every file authorized to write directly to sheets (Phase 1 engine core, Phase 2 world state, Phase 3 population, Phase 4 event generators/helpers, Phase 5 Tier-5 engines / SL writers / civic / citizen life / citizen generators, Phase 6 tracking, Phase 7 media intake / tracking / helpers, Phase 8 tracking writers, Phase 9 cycle weight, Phase 11 media intake). Phase 40.3 Path 1 audit (S156, commit `76a408c`) verified every one — zero undocumented writers.

Diff the grep result against engine.md's exception list. Any file on the grep that isn't on engine.md is WARNING — either a new undocumented writer (bug) or a file that needs to be added to engine.md (doc drift). Run `/tech-debt-audit` if in doubt.

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
Scan all engine files for neighborhood string literals. **GodWorld neighborhoods live in two layers** (S180 reconciliation under ENGINE_REPAIR Row 14):

**Citizen layer (Simulation_Ledger) — canon-12.** Where citizens live. Source-of-truth canonical:
`Temescal, Downtown, Fruitvale, Lake Merritt, West Oakland, Laurel, Rockridge, Jack London, Uptown, KONO, Chinatown, Piedmont Ave`

**World-state layer (Neighborhood_Map sheet) — 17 fine-grained children.** Demographic / wealth / festival / migration tracking buckets:
`Adams Point, Brooklyn, Chinatown, Dimond, Downtown, Eastlake, Fruitvale, Glenview, Grand Lake, Ivy Hill, Jack London, Laurel, Piedmont Ave, Rockridge, San Antonio, Temescal, West Oakland`

The two layers are connected by parent-child mapping (encoded inline at `phase05-citizens/checkForPromotions.js:190-209`):
- Lake Merritt ← Adams Point, Grand Lake, Lakeshore, Eastlake
- Fruitvale ← Ivy Hill, San Antonio
- Laurel ← Dimond, Glenview, Maxwell Park
- Downtown ← Old Oakland, City Center
- Jack London ← Jack London Square
- KONO ← Koreatown-Northgate, Koreatown, Northgate
- Rockridge ← Montclair, Claremont
- Temescal ← Longfellow, Shafter
- West Oakland ← Brooklyn (parent inferred from updateCivicApprovalRatings.js DISTRICT_HOODS)

**Validation rule:** A neighborhood reference is canonical if it appears in EITHER list, OR is a child name in the parent-child mapping. Anything else is a WARNING.

NOT warnings: `Eastlake`, `San Antonio`, `Glenview`, `Ivy Hill`, `Adams Point`, `Brooklyn`, `Dimond`, `Grand Lake` (all valid world-state children); `KONO`, `Lake Merritt`, `Uptown` (all valid canon-parents).

WARNINGS: anything outside both lists, e.g. `Coliseum District` (transit area, not a neighborhood), `Elmhurst`, `Jingletown`, `East Oakland` (legacy stray — not a row in Neighborhood_Map), `HH-KEANE` (household ID leaked into Neighborhood column).

### 6. Write-Intent Target Validation
Scan Phase 10 persistence files for write-intent processing. Check that every target sheet name referenced in write-intent handlers matches an actual sheet. A write-intent targeting a non-existent sheet is a silent failure — the data just disappears.

## Output Format

```
PRE-MORTEM SCAN — [Date] | Cycle [N]
================================================

ENGINE CHANGES SINCE LAST CYCLE:
[list of path-filtered commits, or "none" with proof]

CRITICAL (will cause silent failures in the cycle):
1. [file:line] — Math.random reference-pass in utilities/utilityFunctions.js:29 (pickRandom_ is cycle-path, called by godWorldEngine2.js)
2. [file:line] — ctx.summary.careerSignals read in economicRippleEngine.js:23 before runCareerEngine.js executes

WARNINGS (acknowledged off-path or doc drift):
3. [file:line] — Column "HousingStress" in householdFormationEngine.js not found in SCHEMA_HEADERS.md
4. [file:line] — Math.random in civicInitiativeEngine.js:2009 — manual-vote path, outside cycle (known acknowledged)
5. [file:line] — Neighborhood "Coliseum District" in someFile.js:89 not in canon-12 OR Neighborhood_Map 17 OR child-mapping

CLEAN:
- Math.random cycle-path: 0 violations
- Sheet writes outside Phase 10: all on engine.md exception list
- ctx dependencies: all verified
- Sheet headers: all aligned
- Neighborhoods: all canonical

================================================
RECOMMENDATION: [SAFE TO RUN | FIX BEFORE RUNNING]

If SAFE TO RUN but warnings exist, list them verbatim under the recommendation so the next cycle inherits the open items.
```

## Known Gaps (do not re-surface as CRITICAL unless scope changes)

Mirror of engine-repair items parked until the priority says otherwise. When the scan hits one of these, label the hit WARNING (acknowledged) rather than CRITICAL.

- `utilities/utilityFunctions.js:29,36,53` — `pickRandom_`, `pickRandomSet_`, `maybePick_` use Math.random; called on cycle path. Known since S166. Shipped through every cycle since determinism was introduced. Fix is an engine-repair item, not a pre-cycle blocker.
- Off-cycle Math.random sites listed in §1.
- 62-first/53-last name clustering in citizen generators (ENGINE_REPAIR P1).
- Lifecycle-engine identical-default stamping (ENGINE_REPAIR P1).
- Dead promotion pipeline (ENGINE_REPAIR P2).

## When to Run
- Before every `/run-cycle`
- After any engine code changes
- After adding new columns to sheets
- After editing Phase 5 sub-engine execution order
