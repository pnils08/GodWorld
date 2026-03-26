---
name: ctx-map
description: Generate a live ctx.summary field dependency map showing which phase writes each field and which phases read it. Catches broken chains and orphans.
effort: medium
model: haiku
---

# /ctx-map — Live ctx.summary Dependency Map

## Usage
`/ctx-map` — Generate current field dependency map from live code
`/ctx-map [fieldName]` — Show full chain for one specific field

## What This Does

Scans all phase*/*.js files and produces a map of every ctx.summary field showing:
- **Who writes it** (phase + file + line)
- **Who reads it** (phase + file + line)
- **Chain status** (connected / orphaned write / phantom read)

This is the live version of the static table in ENGINE_STUB_MAP.md. Run it when that doc might be stale.

## How to Generate

### Step 1: Extract all field writes
```bash
grep -rn 'S\.\([a-zA-Z_]*\)\s*=' phase*/ --include="*.js" | grep -v '//' | grep -v '\*' | grep -v 'Logger'
grep -rn 'ctx\.summary\.\([a-zA-Z_]*\)\s*=' phase*/ --include="*.js" | grep -v '//' | grep -v '\*'
```

### Step 2: Extract all field reads
```bash
# Reads are S.field NOT followed by = (i.e., not an assignment)
grep -rn 'S\.\([a-zA-Z_]*\)[^=]' phase*/ --include="*.js" | grep -v 'S\.\([a-zA-Z_]*\)\s*=' | grep -v '//' | grep -v '\*' | grep -v 'Logger'
```

### Step 3: For each unique field
- List writers (file:line)
- List readers (file:line, excluding same file as writer)
- Classify: CONNECTED (has both), ORPHAN (write only), PHANTOM (read only)

### Step 4: Map to execution order
Use godWorldEngine2.js call order. A read BEFORE the write in execution order = phantom read even if the write exists in a later phase.

## Output Format (all fields)

```
CTX.SUMMARY DEPENDENCY MAP — [date]
====================================

FIELD                  WRITER (phase)              READERS (phases)           STATUS
cycleId                godWorldEngine2 (P1)        [40+ files]                CONNECTED
careerSignals          runCareerEngine (P5)        economicRippleEngine (P6)  CONNECTED
economicMood           economicRippleEngine (P6)   applyMigrationDrift (P6)   CONNECTED
[field]                [writer]                    [none]                     ORPHAN
[field]                [none]                      [reader]                   PHANTOM

====================================
Connected: N | Orphaned: N | Phantom: N
```

## Output Format (single field)

```
FIELD: careerSignals
  Written by: phase05-citizens/runCareerEngine.js:107
    S.careerSignals = { promotions: 0, layoffs: 0, sectorShifts: 0, ... }

  Read by:
    phase06-analysis/economicRippleEngine.js:193 — var careerSignals = S.careerSignals || {};
    phase06-analysis/economicRippleEngine.js:239 — var careerSignals = S.careerSignals || {};

  Chain: runCareerEngine (P5d) → economicRippleEngine (P6) ✓
  Status: CONNECTED
```

## When to Run

- After editing engine files that touch ctx.summary
- When ENGINE_STUB_MAP.md might be stale
- During debugging when a field seems to be undefined
- Before adding a new ctx.summary field (check if the name is already taken)
