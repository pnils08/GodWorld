---
name: tech-debt-audit
description: Automated code health scan across all engine files. Catches determinism violations, orphaned ctx fields, dead code, and structural drift.
---

# /tech-debt-audit — Code Health Scan

## Usage
`/tech-debt-audit`
- Run periodically (every 3-5 sessions) or after major engine changes
- Produces an inventory of code issues with severity and file:line references

## Difference from /pre-mortem
- `/pre-mortem` runs BEFORE a cycle — catches things that will break this run
- `/tech-debt-audit` is a periodic health check — catches things that slow development, create confusion, or will become problems later

## What This Scans

### 1. Math.random() Violations
Same as pre-mortem. Scan all `.js` files in `phase*/` and `utilities/` for `Math.random()`. Must use `ctx.rng`.

```bash
grep -rn "Math\.random()" phase*/ utilities/ --include="*.js"
```

Zero tolerance. Any hit is CRITICAL.

### 2. Direct Sheet Writes Outside Phase 10
Same as pre-mortem. Scan `phase01-config/` through `phase09-digest/` for: `getRange`, `setValue`, `setValues`, `appendRow`.

**Documented exceptions:** `phase05-citizens/householdFormationEngine.js`, `phase05-citizens/generationalWealthEngine.js`, `phase05-citizens/educationCareerEngine.js`.

### 3. Orphaned ctx Fields (Written but Never Read)
Scan all engine files for `ctx.summary.*` and `ctx.config.*` WRITES (assignments). Then scan for READS (references on the right side of assignments, in conditionals, in function arguments). Any field that is written but never read is dead weight — it costs computation but produces nothing.

**How to check:**
1. Grep all `.js` files in `phase*/` for `ctx.summary.\w+ =` and `ctx.config.\w+ =` patterns
2. For each unique field name found, grep for reads of that field
3. Report unread fields as WARNING with the file:line where they're written

### 4. Orphaned ctx Fields (Read but Never Written)
Inverse of #3. Any field that is read but never written will be `undefined` at runtime — a silent failure.

**How to check:**
1. Grep all `.js` files in `phase*/` for ctx field reads that don't have a corresponding write
2. Cross-reference with the execution order in `godWorldEngine2.js`
3. Report as CRITICAL — this is an active bug

### 5. Dead Code Detection
Scan each phase directory for:
- Functions that are defined (`function functionName`) but never called from another file
- Exported functions that no other file imports or calls
- Variables assigned but never referenced after assignment
- Commented-out code blocks longer than 10 lines (indicates abandoned features)

**How to check:**
1. For each `.js` file in `phase*/`, extract all function definitions
2. Search all other files for references to each function name
3. Report unreferenced functions as WARNING with file:line

### 6. Sheet Header Misalignment
Read `schemas/SCHEMA_HEADERS.md` for canonical column lists. Compare against:
- Column names in Phase 10 write-intent handlers (`{column: value}` patterns)
- Column references in Phase 5-9 engines

Flag: column in code but not in schema (WARNING — may cause silent data loss), column in schema but not in code (INFO — unused column, not urgent).

### 7. Duplicate Logic Detection
Scan for functions that do substantially the same thing across different phase files. Common patterns:
- Multiple implementations of neighborhood lookup
- Multiple implementations of citizen tier checking
- Multiple implementations of date/calendar calculations

Report as INFO with both file:line references. These are refactoring candidates, not bugs.

## Output Format

```
TECH DEBT AUDIT — [Date]
================================================

CRITICAL (active bugs or determinism violations):
1. [file:line] — Math.random() in [file]
2. [file:line] — ctx.summary.fieldName read in [file] but never written

WARNINGS (code health issues):
3. [file:line] — ctx.summary.deadField written in [file] but never read
4. [file:line] — Function unusedHelper() defined but never called
5. [file:line] — Column "OldColumn" in write-intent but not in SCHEMA_HEADERS.md

INFO (refactoring opportunities):
6. [file:line] + [file:line] — Duplicate neighborhood lookup logic
7. [file:line] — 15-line commented-out block (abandoned feature?)

================================================
SUMMARY:
- Critical: X issues
- Warnings: Y issues
- Info: Z items
- Files scanned: N
- Last full audit: [date]

RECOMMENDATION: [CLEAN | NEEDS ATTENTION | CRITICAL FIXES REQUIRED]
```

## When to Run
- Every 3-5 sessions as periodic maintenance
- After adding new engine files or phases
- After major refactoring work
- Before starting a new feature that touches multiple phases
