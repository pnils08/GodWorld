---
name: pre-mortem
description: Scan engine phases before a cycle run to predict silent failures. Checks ctx field dependencies, sheet header alignment, code rule violations, and cascade risks.
version: "1.3"
updated: 2026-05-30
tags: [engine, active]
effort: high
disable-model-invocation: true
---

# /pre-mortem — Engine Health Scan

> **Skill bag:** senior software engineer running pre-cycle silent-failure scan on production-critical infrastructure. The scans below are *what* that skill checks; the bag adds the discipline of treating gates as gates (CRITICAL = stop, not "stop and continue"), and flagging cascade-risk patterns even when the proximate code looks fine. Full principle: `docs/adr/0004-skill-bag-naming-principle.md`.

## Run (canonical — automates scans 0/1/2/5)

```bash
# CHAT-COST RULE (Mike-direct 2026-08-19, S383): NEVER let the scan print into the
# transcript — redirect to a file. Chat gets ONE line: verdict + file path. Nothing else.
node scripts/preMortemScan.js > output/pre_mortem_scan.txt 2>&1; echo "exit=$? -> output/pre_mortem_scan.txt"
node scripts/preMortemScan.js --since=2026-05-09 > output/pre_mortem_scan.txt 2>&1; echo "exit=$? -> output/pre_mortem_scan.txt"   # explicit window (last cycle's ship date)
# Then Read/grep the file for CRITICAL/RECOMMENDATION lines only — never cat it whole.
```

The script (ES-7 / G-PM7) runs scans **0, 1, 2, 5** deterministically, driven by the data file `.claude/skills/pre-mortem/known_gaps.json` (function-name-keyed acknowledged sites — update the JSON with code changes, never skill prose). **Exit codes:** `0` SAFE TO RUN (no CRITICAL) · `1` FIX BEFORE RUNNING (≥1 CRITICAL) · `2` scan error. Stop the cycle on exit 1.

> **`--since` note:** auto-derive reads SESSION_CONTEXT's "Last Updated" header. After a same-day session close that date is *today*, so scan 0 reports "none — no engine touches" even when commits landed today. Pass `--since=<last-cycle-ship-date>` to scan a real window.

Real output (C95 shape):

```
PRE-MORTEM SCAN — <date>
ENGINE CHANGES SINCE LAST CYCLE: <path-filtered commits, or "none">
CRITICAL: none
WARNINGS (acknowledged off-path or doc drift): <numbered, from known_gaps.json>
CLEAN: Math.random cycle-path 0 unacknowledged; sheet-writes 0 off-list; neighborhoods 0 new stray
NOT AUTO-SCANNED (run from SKILL): §3 ctx-deps (deterministic via `ctxMap.js` — run it, don't eyeball), §4 header alignment, §6 write-intent targets
RECOMMENDATION: SAFE TO RUN | FIX BEFORE RUNNING
```

### ⚠ The script does NOT check everything — scans 3, 4, 6 stay manual

`preMortemScan.js` covers the deterministic, local, recurrent-friction scans (0/1/2/5). It does **not** run the §3 ctx-dependency ordering pass (that is `ctxMap.js`, invoked from §3), sheet-header alignment (§4), or write-intent targets (§6). A `SAFE TO RUN` from the script means *those four scans are clean* — it is **not** a full pre-mortem. After the script exits 0, run §3/§4/§6 by hand per the procedures below. A gate that silently under-checks is worse than no gate.

## What the scans check

Scans 0/1/2/5 below document what the script automates (read them to interpret its output). Scans 3/4/6 are the **manual** scans you run after the script — see the ⚠ note above.

### 0. Engine Code Changes Since Last Cycle (script-automated)
**Always run this first.** Lists every commit that actually touched engine-path files since the last cycle shipped. Prevents the "nothing has changed, not re-scanning" failure where the skill looks at raw recent commits (which are often docs/journal/terminals) and falsely concludes the cycle path is unchanged. **The script does this scan** — the manual form below is a fallback / for interpreting the output.

```bash
# Replace <last-cycle-date> with the date the previous edition published.
# G-PM2: git pathspec does NOT expand '**' globstar — enumerate phase dirs literally.
git log --since="<last-cycle-date>" --pretty=format:"%h %ad %s" --date=short \
  -- 'phase01-config/*.js' 'phase02-world-state/*.js' 'phase03-population/*.js' \
     'phase04-events/*.js' 'phase05-citizens/*.js' 'phase06-analysis/*.js' \
     'phase07-evening-media/*.js' 'phase08-v3-chicago/*.js' 'phase09-digest/*.js' \
     'phase10-persistence/*.js' 'phase11-media-intake/*.js' \
     'scripts/*.js' 'lib/*.js' 'utilities/*.js'
```

If the filtered list is empty AND the raw `git log --since` list is also empty, state "no engine touches since last cycle" and proceed. If the filtered list has entries, list them — every subsequent scan (ctx chain, headers, neighborhoods) must be rerun regardless of any cached "unchanged" memory.

### 1. Math.random Determinism Violations (script-automated)
Scan all `.js` files in `phase01-config/` through `phase10-persistence/` and `utilities/` for **any** mention of `Math.random` — both invocations (`Math.random()`) and reference-passes (`var rng = Math.random;`, `fn(Math.random)`). Both break determinism when they run on the cycle path. The old grep pattern `Math\.random\(\)` missed reference-pass sites (S166 found three in `utilities/utilityFunctions.js` that had shipped through every prior cycle run).

```bash
# Pattern: any Math.random mention, excluding /* */ and // comment lines
grep -rn "Math\.random" phase*/ utilities/ --include="*.js" \
  | grep -Ev '^[^:]+:[0-9]+:[[:space:]]*(\*|//)'
```

For each hit, classify:

- **CRITICAL** — the file is on the cycle path (invoked by `godWorldEngine2.js` or any phase function that runs during a cycle). Trace callers if unsure: `grep -rn "functionName(" phase*/ scripts/ lib/ --include="*.js"`.
- **WARNING (acknowledged, off-path)** — the file is outside the cycle path. **Acknowledged sites live in `.claude/skills/pre-mortem/known_gaps.json` (`acknowledgedMathRandom[]`), keyed by function name** per S230 G-RC5 — line numbers drift on every refactor (G-PM3), so the JSON carries no line annotations. The script classifies against this file; if reading by hand, grep `grep -nE 'function <funcName>|<funcName> = function|<funcName>:' <file>` to find the current location. Do **not** re-list these sites inline here — the JSON is the single source (a second copy is the drift surface S230 G-RC5 closed). Current entries: `civicInitiativeEngine.js#manualRunVote` (NOT `runManualVote_` — the old skill name was stale), `citizenContextBuilder.js#getCitizensForQuotes`, `generateChicagoCitizensv1.js#testChicagoCitizenGeneration_` (file disabled S229, retained for reversibility).
- **CLEAN (defensive throw)** — the mention is inside a `throw new Error(...)` string for a removed fallback. These are guards, not violations. Files listed in `known_gaps.json` `defensiveThrowFiles[]`: `generationalEventsEngine.js`, `generateGenericCitizens.js`, `safeRand.js`. (Meta/linter files whose data contains `Math.random` as a pattern-to-detect are in `scanExcludeFiles[]` — e.g. `v2DeprecationGuide.js`.)

Anything not on the acknowledged or defensive-throw lists is CRITICAL until proven otherwise — verify by tracing callers back to the engine entry point.

### 2. Direct Sheet Writes Outside Phase 10 (script-automated)
Scan `phase01-config/` through `phase09-digest/` for **write-only** calls: `.setValue(`, `.setValues(`, `.appendRow(`. These should only appear in `phase10-persistence/` files. **G-PM4: do NOT include `getRange` or `getSheetByName(...).get` in the pattern** — `getRange(...).getValues()` is the canonical READ idiom and matched the old pattern, producing false positives (C95 flagged 3 read-only files). A genuine `getRange().setValue()` still matches via `.setValue(`.

```bash
grep -rnE '\.setValue\(|\.setValues\(|\.appendRow\(' phase0[1-9]*/ --include="*.js"
```

**Exception list lives in `docs/engine/SHEETS_MANIFEST.md` §9 Direct-write carve-outs.** That table enumerates every file authorized to write directly to sheets, with its class (Phase 1 engine core, Phase 2 world state, Phase 3 population, Phase 4 event generators/helpers, Phase 5 Tier-5 engines / SL writers / civic / citizen life / citizen generators, Phase 6 tracking, Phase 7 media intake / tracking / helpers, Phase 8 tracking writers, Phase 9 cycle weight, Phase 11 media intake). Phase 40.3 Path 1 audit (S156, commit `76a408c`) verified every one — zero undocumented writers.

Diff the grep result against engine.md's exception list. Any file on the grep that isn't on engine.md is WARNING — either a new undocumented writer (bug) or a file that needs to be added to engine.md (doc drift). Run `/tech-debt-audit` if in doubt.

### 3. ctx Field Dependency Check (DETERMINISTIC — `ctxMap.js`, engine.137 S405)

This is the most important check: if Engine A reads `ctx.summary.careerSignals` but Engine B (which writes it) has not run yet, the field is undefined and the branch silently never takes. **It is no longer a by-eye scan** — G-PF17 folded an ordering pass into `ctxMap.js` and engine.137 repointed it at the orchestrator. Run it:

```bash
node scripts/ctxMap.js | sed -n '/^ORDERING/,$p'
```

**How to read the output — three buckets, and they mean different things:**

| Bucket | Meaning | Action |
|---|---|---|
| `ORDERING — READ BEFORE WRITE` | the read **always** precedes the write (readMax < writeMin) | `** N UNDEFAULTED **` / `<-- no fallback` is **CRITICAL**. `[all defaulted]` is a silent degradation — the branch never takes, but nothing crashes. Log it, don't block on it |
| `AMBIGUOUS` | the reader runs at several slots that straddle the writer | needs a human look; may or may not be real |
| `DEAD FILES` | **every** top-level function in the file is unreachable from `runWorldCycle()` | its ctx reads never execute at all. Not a cycle blocker — a standing inventory finding |

**Three things the script will not do for you:**

1. **Confirm each hit by eye before acting.** Guards are detected per-line, so a guard on the *following* line reads as "no fallback." The script prints this caveat itself.
2. **See non-literal dispatch.** A partially-unreachable helper inside a LIVE file is deliberately not reported — that bucket would over-report, which is what discredited scan 2 (G-PF15).
3. **Fail loudly if it cannot parse.** It exits 3 with `ordering pass ABORTED (not an all-clear)` if `runWorldCycle()`'s `safePhaseCall_` sequence does not parse. **Exit 3 is not a pass** — a phase-list refactor is the likely cause.

**Why the orchestrator and not the directory (engine.137, do not regress this):** execution order comes from the `safePhaseCall_` sequence in `runWorldCycle()`, resolved **per top-level function**, never from the `phase<NN>` directory name. The directory records where a file was filed, not when it runs — `finalizeWorldPopulation.js` lives in `phase03-population/` and runs at the Phase9 slot. Keying off the directory is what invented G-PF16 and hid six real sites. `runCyclePhases_` is the dry-run/replay path and diverges from production (G-PF30); it is not the ordering source.

**Known dependency chains (verify these are still correct):**
- Career Engine → Economic Ripple Engine (via `ctx.summary.careerSignals`)
- Demographics → Civic Voting, Story Hooks, City Dynamics
- HouseholdFormation → GenerationalWealth → EducationCareer (Phase 5 chain)
- ~~World Events → Arc Engine~~ — the arc engine (`eventArcEngine_`) was retired S313 (engine.72 G-EC55) and has no caller. Do not chase its reads.

### 4. Sheet Header Alignment (MANUAL — script does NOT check this)
Check that columns referenced in engine code actually exist in the sheets. Use the service account to read sheet headers:

```javascript
// Pattern to check: engine code references a column name
// Verify it exists in the actual sheet
```

Read `schemas/SCHEMA_HEADERS.md` for the canonical column list. Compare against column names used in engine write-intents (`{column: value}` patterns in Phase 10 files).

Flag any mismatch as WARNING — column in code but not in sheet means silent data loss.

### 5. Neighborhood Reference Validation (script-automated)
Scan all engine files for neighborhood string literals. **GodWorld neighborhoods live in two layers** (S180 reconciliation under ENGINE_REPAIR Row 14):

**Citizen layer (Simulation_Ledger) — canon-12.** Where citizens live. Source-of-truth canonical:
`Temescal, Downtown, Fruitvale, Lake Merritt, West Oakland, Laurel, Rockridge, Jack London, Uptown, KONO, Chinatown, Piedmont Ave`

**World-state layer (Neighborhood_Map sheet) — 22 hoods (S328).** Demographic / wealth / festival / migration tracking buckets (canonical source: `lib/canonNeighborhoods.js` MAP_NEIGHBORHOODS):
`Adams Point, Baylight District, Brooklyn, Chinatown, Dimond, Downtown, East Oakland, Eastlake, Fruitvale, Glenview, Grand Lake, Ivy Hill, Jack London, KONO, Lake Merritt, Laurel, Piedmont Ave, Rockridge, San Antonio, Temescal, Uptown, West Oakland`

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

WARNINGS: anything outside both lists, e.g. `Coliseum District` (transit area, not a neighborhood), `Elmhurst`, `Jingletown`, `HH-KEANE` (household ID leaked into Neighborhood column). (`East Oakland` canonized S328 — Mike-direct: legit Oakland land mass, no longer a stray.)

### 6. Write-Intent Target Validation (MANUAL — script does NOT check this)
Scan Phase 10 persistence files for write-intent processing. Check that every target sheet name referenced in write-intent handlers matches an actual sheet. A write-intent targeting a non-existent sheet is a silent failure — the data just disappears.

## Output Format

```
PRE-MORTEM SCAN — [Date] | Cycle [N]
================================================

ENGINE CHANGES SINCE LAST CYCLE:
[list of path-filtered commits, or "none" with proof]

CRITICAL (will cause silent failures in the cycle):
1. [file:line] — Math.random reference-pass in <cycle-path file>#<fn> (on cycle path, not in known_gaps.json acknowledged list)
2. [file:line] — ctx.summary.careerSignals read in economicRippleEngine.js:23 before runCareerEngine.js executes

WARNINGS (acknowledged off-path or doc drift):
3. [file:line] — Column "HousingStress" in householdFormationEngine.js not found in SCHEMA_HEADERS.md
4. [file:line] — Math.random in civicInitiativeEngine.js#manualRunVote — manual-vote path, outside cycle (acknowledged in known_gaps.json)
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

Mirror of engine-repair items parked until the priority says otherwise — a **different class** from the scan-classification data in `known_gaps.json` (which holds the acknowledged Math.random / neighborhood-literal sites). These are backlog notes, not scan input.

> **Verify against current state before treating any entry here as acknowledged.** A stale "known gap" teaches the operator to disbelieve the scan (the G-PM1 lesson): the old `utilities/utilityFunctions.js:29,36,53` Math.random entry sat here ~60 sessions after the fix actually shipped (v2.15, S180 — `pickRandom_`/`pickRandomSet_`/`maybePick_` now require an `rng` param and throw; zero Math.random invocations remain). It was removed S246/RB-5. If the scan ever flags one of these, re-confirm the code still matches the note before downgrading to WARNING.

- Off-cycle Math.random sites — see `known_gaps.json` `acknowledgedMathRandom[]` (canonical), summarized in §1.
- 62-first/53-last name clustering in citizen generators (ENGINE_REPAIR P1).
- Lifecycle-engine identical-default stamping (ENGINE_REPAIR P1).
- Dead promotion pipeline (ENGINE_REPAIR P2).

## When to Run
- Before every `/run-cycle`
- After any engine code changes
- After adding new columns to sheets
- After editing Phase 5 sub-engine execution order
