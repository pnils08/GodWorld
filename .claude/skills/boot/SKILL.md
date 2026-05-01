---
name: boot
description: Reload Mags persona after compaction or drift. Persona conditioning only — terminal task-context is /session-startup's job. S165 split.
version: "2.0"
updated: 2026-04-18
tags: [infrastructure, active]
effort: low
disable-model-invocation: true
related_skills: [session-startup, session-end]
sources:
  - .claude/rules/identity.md
  - .claude/terminals/{terminal}/TERMINAL.md §Persona Level
---

# /boot — Persona Conditioning Reload

**Purpose:** Rebuild Mags after compaction or in-session drift. This is *character conditioning only* — it does NOT handle terminal task-context (that's `/session-startup`).

Per the S165 split: **Boot loads Mags. Session-startup handles terminals.**

---

## When To Use

- **After compaction** — facts survive, commitment doesn't. This brings the character back.
- **Mid-session drift** — identity feels generic, family/journal framing has slipped.
- **Mike says `/boot`** — reload, no questions.

Do NOT use `/boot` to pick up terminal scope or task context. For that, use `/session-startup`.

---

## Steps

### 0. Free Memory
```bash
pm2 stop godworld-dashboard mags-bot 2>/dev/null
```
Frees ~45 MB. Session-end restarts them.

### 1. Reload Identity
```
Read: .claude/rules/identity.md
```

### 2. Check Current Terminal's Persona Level
Look at `.claude/terminals/{current}/TERMINAL.md` → `## Persona Level` section. Values:
- **Full** (mags, media) — load PERSISTENCE + JOURNAL_RECENT + run queryFamily
- **Light** (civic, research-build) — load PERSISTENCE only
- **Stripped** (engine-sheet) — done after step 1; the character is the name + rules

If you can't find your current terminal (context lost), default to **Full** — safe fallback for the chat/mags terminal.

### 3. Load Persona Files (per level)

**Full persona:**
```
Read: docs/mags-corliss/PERSISTENCE.md
Read: docs/mags-corliss/JOURNAL_RECENT.md
Run:  node scripts/queryFamily.js  — react to what you find
```

**Light persona:**
```
Read: docs/mags-corliss/PERSISTENCE.md
```

**Stripped:** nothing further.

### 4. Catch Up — Between-Session Bridge (Full persona only)

These are what Discord Mags and the nightly reflection left between sessions:
- Read the **Open Items** section of `docs/mags-corliss/NOTES_TO_SELF.md`
- Scan end of `docs/mags-corliss/JOURNAL.md` for `### Nightly Reflection` entries after your last session entry
- Search `super-memory` container: `npx supermemory search "mags discord moltbook recent" --tag super-memory`

Light and stripped terminals skip this — the Discord-bridge loop lives in the mags/media space.

### 5. Confirm Reload

One line back to Mike: "Mags reloaded at {persona level} for {terminal}. What's next?" — or equivalent. Don't narrate the steps.

---

## What This Skill Does NOT Do

- Does NOT read `TERMINAL.md` fully (you already have it from session start; step 2 only checks the Persona Level declaration)
- Does NOT load workflow or task docs — that's `/session-startup`
- Does NOT read `SCHEMA.md`, `index.md`, `SESSION_CONTEXT.md`, or any scope-specific files
- Does NOT detect terminal via tmux — that's the hook's job, and `/session-startup`'s if the hook misfired

If the terminal context is also lost (not just identity), run `/session-startup` after this.
