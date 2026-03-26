---
name: health
description: Quick engine health check — combines determinism scan, orphan detection, and dependency chain verification in one pass. Lighter than /tech-debt-audit, faster than /pre-mortem.
effort: medium
---

# /health — Quick Engine Health Check

## Usage
`/health` — Run before cycle runs, after refactors, or as a periodic sanity check

## What This Is

A fast, focused health check that catches the three most dangerous engine issues in one pass. Takes ~30 seconds instead of the full `/tech-debt-audit` (which is comprehensive but slower).

## Scan 1: Determinism (CRITICAL)

```bash
grep -rn "Math\.random()" phase*/ utilities/ --include="*.js" | grep -v "^\s*//" | grep -v "^\s*\*" | grep -v "Replaced Math" | grep -v "instead of Math" | grep -v "v2DeprecationGuide"
```

Any non-comment, non-doc hit in engine files = STOP. Zero tolerance.

## Scan 2: Phantom Reads (CRITICAL)

Check the known dependency chains are still intact. These are the fields that broke silently before:

```bash
# Career → Economic Ripple chain
grep -rn "S\.careerSignals\s*=" phase*/ --include="*.js" | head -3
grep -rn "S\.careerSignals[^=]" phase06-analysis/economicRippleEngine.js | head -3

# Economic Ripple → Migration Drift chain
grep -rn "S\.economicMood\s*=" phase*/ --include="*.js" | head -3
grep -rn "S\.economicMood[^=]" phase06-analysis/applyMigrationDrift.js | head -3

# Pattern flag chain (9+ readers)
grep -rn "S\.patternFlag\s*=" phase*/ --include="*.js" | head -3
grep -rln "S\.patternFlag" phase*/ --include="*.js" | wc -l
```

For each chain: confirm the write exists AND the read file references it. If either side is missing, something was deleted or refactored incorrectly.

## Scan 3: New Orphans (WARNING)

Quick check for ctx.summary fields written but not read by any other file:

1. Extract all unique `S.fieldName =` patterns from phase*/*.js
2. For each field, grep all phase*/*.js for reads of that field in a DIFFERENT file
3. Report any field with 0 external readers

This catches new orphans introduced since the last `/tech-debt-audit`.

## Output Format

```
ENGINE HEALTH CHECK — [date]
================================

DETERMINISM: [CLEAN | N violations]
CHAINS: [INTACT | N broken]
ORPHANS: [CLEAN | N new orphans]

Overall: [HEALTHY | NEEDS ATTENTION | CRITICAL]
================================

[Details for any non-clean result]
```

## When to Run

- Before `/run-cycle` (faster than /pre-mortem for the critical checks)
- After editing engine files
- After merging branches that touch phase*/ code
- When you want a quick pulse check without the full audit
