# Dependency Map for OpenClaw Integration

**Date:** 2026-02-03 07:25:17  
**Author:** GitHub Copilot Chat Assistant  

---

## Overview
This document provides a detailed dependency map for the OpenClaw integration within the `GodWorld` simulation engine. It explains how various components, such as skills, data flows, and databases, interact to deliver persistent memory, context parsing, and automated media generation.

---

## Dependency Structure Diagram
```
[Cycle Export] ---> [godworld-sync] ---> [SQLite Database]
      │                   │                      │
      |                   └──> Citizen Memory    │
      ├── Manifest.json   └──> Cycle Data        │
      │                   └──> Initiative Data   │
      │                                          │
   New File Detected       Media Data Access      │
      │                                          ▼
      └──────────> OpenClaw Media Generator --> Media Output (Markdown)
                                 │
                                 ├── Tribune Pulse `.md`
                                 ├── Echo Op-Ed `.md`
                                 └── Council Watch `.md`
```

---

## Components and Data Dependencies

1. **Cycle Export**:
   - **Source:** Google Sheets (`exports/manifest.json`, `cycle-XX-context.json`).
   - **Details:**
     - When a new cycle is exported, `manifest.json` and cycle-specific data files (`cycle-XX`) are updated and then read by `godworld-sync`.
   - **Path:** `exports/`.

2. **GodWorld Sync Skill**:
   - **Source Code:** [`godworld-sync`](https://github.com/pnils08/GodWorld/blob/main/openclaw-skills/godworld-sync/).
   - **Purpose:**
     - Handles synchronization of exported cycle data to SQLite database (`godworld.db`).
   - **Data Outputs:**
     - Tables: `citizens`, `initiatives`, `sync_state`, `cycles`.
   - **Triggers:** Watches for changes in `manifest.json` or runs on manual invocation.
   - **Dependent Skills:** Provides data for `media-generator`.

3. **SQLite Database**:
   - **Schema File:** [`schemas/godworld.sql`](https://github.com/pnils08/GodWorld/blob/main/openclaw-skills/schemas/godworld.sql).
   - **Purpose:** Acts as persistent storage for citizen memory, cycle state, initiatives, and relationships.
   - **Dependencies:**
     - Entry data comes from `godworld-sync` skill.
     - Queries are utilized directly by the `media-generator` skill.

4. **OpenClaw Media Generator Skill**:
   - **Source Code:** [`media-generator`](https://github.com/pnils08/GodWorld/blob/main/openclaw-skills/media-generator/).
   - **Purpose:**
     - Generates and formats media content (e.g., Tribune Pulse, Echo Op-Ed, Council Watch) for each cycle.
   - **Data Inputs:**
     - Queries SQLite for:
       - Citizen memory (`citizens` table).
       - Relationships, initiatives, and cycle summary.
       - Risk flags and context packs.
   - **Data Outputs:**
     - Writes markdown content to `/media/cycle-XX/`, e.g.:
        - `tribune-pulse.md`
        - `echo-oped.md`
        - `council-watch.md`
   - **Triggers:** Automatically invoked after `godworld-sync` processing.

5. **Media Outputs**:
   - **Purpose:** Deliver readable media narratives for Tribune, Echo, or Council Watch articles.
   - **Output Format:**
     - Markdown files in `/media/cycle-XX`.
   - **Dependency:** Generated outputs are available after `media-generator` processes data from `SQLite`.

---

## Execution Flow

1. **Triggering Event**:
   - New cycle data is exported by GodWorld (`manifest.json` & `cycle-XX` files).

2. **Sync Process (`godworld-sync`)**:
   - Detects the new manifest file.
   - Synchronizes cycle context data to `SQLite` database.

3. **Data Querying**:
   - The `media-generator` skill queries the SQLite database via structured prompts.

4. **Media Generation**:
   - Based on querying results, media is dynamically generated using Claude/other APIs.
   - Output markdown files are stored for human review or direct publishing.

---

## Appendix: Skill Configurations
Below is an example configuration flow shared across skills:

```json
{
  "godworld": {
    "paths": {
      "exports": "./exports",
      "database": "./godworld/godworld.db",
      "mediaOutput": "./media"
    }
  },
  "openclaw": {
    "apiKeys": {
      "claude": "sk-XXXX",
      "anthropic": "XXXX"
    }
  }
}
```

---

This document ensures developers can clearly understand the roles, workflows, and dependencies for OpenClaw integration within the `GodWorld` ecosystem.