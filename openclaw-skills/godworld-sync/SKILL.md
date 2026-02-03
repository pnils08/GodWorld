---
name: godworld-sync
description: Sync GodWorld cycle exports to local SQLite database
triggers:
  - manual
  - watch:exports/manifest.json
  - schedule:0 * * * *
---

## Purpose

Monitors the `exports/` folder for new cycle data and syncs to local SQLite for fast querying. This is the foundation for all other GodWorld skills.

## What It Does

1. Reads `exports/manifest.json` to detect new cycles
2. Compares checksums to avoid duplicate processing
3. Loads `cycle-XX-context.json` for the latest cycle
4. Updates local SQLite tables:
   - `cycles` (city state, risk flags)
   - `citizens` (active citizens, mention tracking)
   - `initiatives` (civic outcomes)
5. Updates `sync_state` to track progress

## Triggers

| Trigger | When |
|---------|------|
| `manual` | Run "sync godworld" |
| `watch:exports/manifest.json` | When manifest changes (new cycle exported) |
| `schedule:0 * * * *` | Every hour as backup |

## Required Config

```json
{
  "godworld": {
    "exportsPath": "./exports",
    "dbPath": "./godworld/godworld.db"
  }
}
```

## Outputs

- Updates SQLite database
- Logs sync summary to console
- Returns: `{ cyclesSynced: number, recordsUpdated: number }`

## Error Handling

- If manifest missing: logs warning, exits cleanly
- If checksum matches: skips sync (idempotent)
- If DB error: logs error, does not mark as synced

## Dependencies

- `better-sqlite3` (npm package)
- SQLite database initialized with `schemas/godworld.sql`
