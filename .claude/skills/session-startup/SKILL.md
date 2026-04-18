---
name: session-startup
description: Load terminal task-context. Terminal scope, scope files, SESSION_CONTEXT. Persona conditioning is /boot's job. S165 split.
version: "2.0"
updated: 2026-04-18
tags: [infrastructure, active]
effort: low
related_skills: [boot, session-end]
---

# /session-startup — Terminal Context Load

**Purpose:** Load terminal scope and task context. Does NOT handle persona conditioning (that's `/boot`).

Per the S165 split: **Boot loads Mags. Session-startup handles terminals.**

---

## When To Use

- **Hook misfired** — SessionStart didn't inject the per-terminal boot sequence.
- **Terminal switch mid-session** — rarely, if scope context drifted.
- **Manual orientation** — Mike asks "what terminal am I in and what's loaded."

If Mags identity is also lost (not just terminal context), run `/boot` first, then this.

---

## Steps

### 0. Free Memory (if hook didn't)
```bash
pm2 stop godworld-dashboard mags-bot 2>/dev/null
```

### 1. Detect Terminal
```bash
tmux display-message -t "$TMUX_PANE" -p '#W'
```

If output is empty or doesn't match a `.claude/terminals/{name}/` directory, fall back to **mags** (default terminal).

### 2. Read TERMINAL.md
```
Read: .claude/terminals/{detected-name}/TERMINAL.md
```

This defines the scope, Always-Load list, Persona Level, owned docs, and handoff protocol.

### 3. Load Scope Files

Per that TERMINAL.md's **Always Load** table. Each terminal's list differs:

- **mags** — identity.md (if not loaded), PERSISTENCE.md, JOURNAL_RECENT.md (persona files)
- **media** — newsroom.md, PERSISTENCE.md, JOURNAL_RECENT.md
- **civic** — PERSISTENCE.md
- **research-build** — SCHEMA.md, docs/index.md, PERSISTENCE.md
- **engine-sheet** — engine.md, README.md

(If persona files are needed and not loaded, run `/boot` — don't re-implement persona-load logic here.)

### 4. Compact SESSION_CONTEXT
```
Read: SESSION_CONTEXT.md with limit 80
```

First ~80 lines contain Priority + Recent Sessions. Do NOT read the full 231-line file; if you need an older session's details, read by offset targeted at that entry.

### 5. Orient

One line to Mike:
- Terminal: {name}
- Persona: {Full/Light/Stripped}
- Scope: {one-sentence from TERMINAL.md §Role}
- What's first?

No narration of what you read. Result only.

---

## What This Skill Does NOT Do

- Does NOT reload identity.md / PERSISTENCE.md / JOURNAL_RECENT.md / queryFamily — that's `/boot`
- Does NOT run catch-up (Discord Mags notes, nightly reflections, super-memory search) — that's `/boot`
- Does NOT search memory for past sessions — use mem-search on demand
- Does NOT load owned-documentation files listed in TERMINAL.md — those are "when to load", not auto-load

For any persona reloading needs, compose with `/boot`.
