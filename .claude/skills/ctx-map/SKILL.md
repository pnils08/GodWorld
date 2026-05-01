---
name: ctx-map
description: Generate a live ctx.summary field dependency map showing which phase writes each field and which phases read it. Catches broken chains and orphans.
version: "1.0"
updated: 2026-04-17
tags: [engine, active]
effort: low
disable-model-invocation: true
---

# /ctx-map — Live ctx.summary Dependency Map

## Usage
`/ctx-map` — Generate current field dependency map from live code
`/ctx-map [fieldName]` — Show full chain for one specific field

## How to Run

```bash
# Full map — all fields, all phases
node scripts/ctxMap.js

# Single field detail — shows exact file:line for writers and readers
node scripts/ctxMap.js careerSignals
```

The script handles the `S = ctx.summary` alias pattern, filters out constants (ALLCAPS), comments, Logger calls, and correctly distinguishes reads from writes on the same line.

## What the Output Means

- **CONNECTED** — field has at least one writer and one external reader (different file). This is healthy.
- **ORPHANED WRITE** — field is written but no other file reads it. May be dead weight, or may be read only within the same file (internal use — not a bug, just not cross-phase).
- **PHANTOM READ** — field is read but never written to ctx.summary. Usually one of:
  - A `ctx.config` field being read via fallback (`S.cycleCount || ctx.config.cycleCount`)
  - A manual override field that only exists when injected
  - A field written under a different name or path

## When to Run

- After editing engine files that touch ctx.summary
- When ENGINE_STUB_MAP.md might be stale
- During debugging when a field seems to be undefined
- Before adding a new ctx.summary field (check if the name is already taken)

## Reference

Static version: `docs/engine/ENGINE_STUB_MAP.md` (generated S120)
Full audit: `docs/engine/tech_debt_audits/`
