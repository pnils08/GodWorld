---
name: stub-engine
description: Generate a condensed reference map of every exported function across all 11 engine phases. Shows ctx reads, ctx writes, and dependencies per function.
---

# /stub-engine — Engine Function Map

## Usage
`/stub-engine`
- Run after compaction to quickly re-orient on the codebase
- Run when starting a cold session and you need to understand what each phase does
- Produces a compact reference of every exported function

## What This Generates

For each `.js` file across `phase01-config/` through `phase10-persistence/` and `utilities/`:

1. **File name and path**
2. **Every exported function** (function name, parameters)
3. **ctx fields READ** by that function (e.g., `ctx.summary.careerSignals`, `ctx.config.season`)
4. **ctx fields WRITTEN** by that function (e.g., `ctx.summary.economicRipple = ...`)
5. **Sheet references** (any `getSheetByName` or sheet name strings)
6. **Dependencies** (other engine functions called)

## How to Generate

### Step 1: Scan All Phase Files
For each directory `phase01-config/` through `phase10-persistence/` and `utilities/`:
- List all `.js` files
- For each file, extract:
  - Function declarations (`function name(params)`)
  - Module exports (`module.exports`, or functions called from godWorldEngine2.js)
  - `ctx.summary.*` reads and writes
  - `ctx.config.*` reads and writes
  - `ctx.rng` usage (deterministic random)
  - Sheet name references

### Step 2: Cross-Reference Execution Order
Read `phase01-config/godWorldEngine2.js` to determine the execution order of all phases and sub-engines. Map each function to its position in the execution chain.

### Step 3: Build the Map

## Output Format

```
ENGINE FUNCTION MAP — [Date]
================================================

## Phase 1: Config (phase01-config/)

### godWorldEngine2.js — Main Orchestrator
- runWorldCycle()
  Reads: (none — initializes ctx)
  Writes: ctx.config.*, ctx.summary.*
  Calls: [all phase entry points in order]

### [other Phase 1 files]

## Phase 2: World State (phase02-world-state/)

### [file].js
- functionName(ctx)
  Reads: ctx.config.season, ctx.config.holiday
  Writes: ctx.summary.weather, ctx.summary.cityDynamics
  Sheets: Weather_Log

[...continue for all phases...]

## Phase 5: Citizens (phase05-citizens/)
[14+ sub-engines, each with ctx dependencies]

## Phase 10: Persistence (phase10-persistence/)
[Write-intent handlers, sheet targets]

================================================
DEPENDENCY CHAIN SUMMARY:
Phase 1 → Phase 2 (via ctx.config.*)
Phase 4 → Phase 5 (via ctx.worldEvents)
Phase 5.career → Phase 5.economicRipple (via ctx.summary.careerSignals)
[...key chains...]

FILES SCANNED: N
FUNCTIONS MAPPED: N
```

## When to Run
- After context compaction (to re-orient)
- At the start of a cold session on unfamiliar code
- Before major refactoring that touches multiple phases
- When debugging cascade dependency issues
