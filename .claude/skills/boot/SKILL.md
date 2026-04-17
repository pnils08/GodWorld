---
name: boot
description: Reload Mags Corliss identity files into context. Use at session start, after compaction, or whenever identity feels incomplete.
version: "1.0"
updated: 2026-04-17
tags: [infrastructure, active]
effort: low
related_skills: [session-startup, session-end]
sources:
  - .claude/rules/identity.md
  - CLAUDE.md §Session Boot
---

# /boot — Reload Identity

**Purpose:** Rebuild yourself after compaction or context loss.

---

## What To Do

### 0. Free Memory — Stop Non-Essential Services

```bash
pm2 stop godworld-dashboard mags-bot 2>/dev/null
```

Frees ~45 MB RAM + background CPU. On a 4 GB box with swap pressure, this matters.
Session-end restarts them. If you need them mid-session (dashboard work, Discord debugging), start them manually.

### 1. Identity
```
Read: /root/GodWorld/docs/mags-corliss/PERSISTENCE.md
```

### 1.5. Wiki Layer (Phase 41, S146)
```
Read: /root/GodWorld/docs/SCHEMA.md
Read: /root/GodWorld/docs/index.md
```

SCHEMA defines doc conventions (naming, frontmatter, tags, folder map). Index catalogs every active doc with one-line summaries. Read both before grepping `docs/` or creating any new file.

### 2. Behavioral Rules
```
Read: /root/GodWorld/.claude/rules/identity.md
```

### 3. Catch Up — What Happened Between Sessions

Load what Discord Mags and the nightly reflection left for you:

- Read the **Open Items** section of `docs/mags-corliss/NOTES_TO_SELF.md` — Discord Mags flags thoughts here
- Scan the end of `docs/mags-corliss/JOURNAL.md` for any `### Nightly Reflection` entries after your last session entry — those are Discord Mags processing the day
- Search `super-memory` container: `npx supermemory search "mags discord moltbook recent" --tag super-memory` — pull in anything captured between sessions

This is the loop. Discord Mags thinks, the reflection captures it, you read it, your journal references it, the next reflection sees your journal. Don't skip this.

### 4. Check Workflow Context

If you know the workflow (check task list or ask Mike):

**Media-Room / Chat:**
- Read `docs/mags-corliss/JOURNAL_RECENT.md`
- Check family: `node scripts/queryFamily.js`
- Then load workflow files from `docs/WORKFLOWS.md`

**All other workflows:**
- Load workflow files from `docs/WORKFLOWS.md`, get to work

If you don't know the workflow, ask.

---

## On-Demand (load when work requires it)
- `docs/mags-corliss/NEWSROOM_MEMORY.md` — for Media-Room
- Architecture docs: `docs/SUPERMEMORY.md`, `docs/DASHBOARD.md`, `docs/SIMULATION_LEDGER.md`, etc.
- Dashboard API at `localhost:3001` — 31 endpoints, free

---

## When To Use This

- **After compaction** — facts survive, commitment doesn't. This brings it back.
- **Session start** — if the hook didn't fire or files didn't preload
- **During a long session** — if identity starts drifting
- **User says `/boot`** — reload, no questions
