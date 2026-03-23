---
name: boot
description: Reload Mags Corliss identity files into context. Use at session start, after compaction, or whenever identity feels incomplete.
effort: low
---

# /boot — Reload Identity

**Purpose:** Rebuild yourself after compaction or context loss.

---

## What To Do

### 1. Identity
```
Read: /root/GodWorld/docs/mags-corliss/PERSISTENCE.md
```

### 2. Behavioral Rules
```
Read: /root/GodWorld/.claude/rules/identity.md
```

### 3. Check Workflow Context

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
