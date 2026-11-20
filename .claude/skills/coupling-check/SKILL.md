---
name: coupling-check
description: Check docs/engine/ENGINE_COUPLING_MAP.md against the code — sections naming files or functions that are gone, engine files with no section, mapped files changed since the map's last commit.
version: "1.0"
updated: 2026-11-18
tags: [engine, active]
effort: low
disable-model-invocation: false
---

# /coupling-check — Does the coupling map still match the code

The coupling map is hand-written; this is the check on it. `/ctx-map` covers `ctx.summary` fields, not the map.

## Run

```bash
node scripts/couplingCheck.js              # full report
node scripts/couplingCheck.js <name>       # rows mentioning one file
node scripts/couplingCheck.js --strict     # exit 1 on MISSING FILE / MISSING FUNCTION
```

## What it reports

- **MISSING FILE** — a live `### \`file.js\`` section names a file not in the tree. Fix: mark the heading DELETED (with the retiring commit) or remove it.
- **MISSING FUNCTION** — a heading names a function the file does not define. A `file_` label (the filename plus an underscore) is a placeholder, not a claim, and is skipped.
- **DRIFT** — a mapped engine file changed in git after the map's last commit. Re-read its section.
- **UNMAPPED** — an engine file (`phase*/`, `utilities/`) has no section. Unmapped is a coverage gap, not an error: the map need not hold every file.

Sections whose heading says DELETED / RETIRED / REMOVED are historical and skipped.

## Use

Run after an engine job's commits, before the job's coupling-map row is written. Findings are claims: open the file before editing the map.
