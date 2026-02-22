---
name: session-startup
description: Load essential GodWorld documentation and context at session start to prevent errors and ensure proper understanding of the codebase.
---

# /session-startup — Verify Context & Search Memory

**Purpose:** Confirm that preloaded files are in context, search memory for recent work, and get oriented before doing anything.

**What changed (Session 54):** Core docs now auto-load via CLAUDE.md @ references. This skill no longer needs to read them manually — it verifies they loaded and fills in the gaps (Supermemory, batch results, task-specific docs).

---

## Step 1: Verify Preloaded Context

These files should already be in context via CLAUDE.md @ references. Confirm you can reference them without reading:

- **PERSISTENCE.md** — identity, family, session continuity log
- **JOURNAL_RECENT.md** — last 3 journal entries (emotional thread)
- **NOTES_TO_SELF.md** — active flags, story ideas, character tracking
- **NEWSROOM_MEMORY.md** — errata, editorial notes, character threads
- **SESSION_CONTEXT.md** — engine versions, active work, cascade dependencies
- **README.md** — project structure, 11-phase engine

**If any file is missing from context:** Read it manually with the Read tool. If JOURNAL_RECENT.md is missing, read the last 3 entries from JOURNAL.md instead.

---

## Step 2: Search Supermemory

```bash
/super-search --both "recent changes project structure current work"
```

This retrieves recent session decisions, work in progress, known issues, and user preferences.

**Before major work**, search for relevant context:
```bash
# Before editions
/super-search --both "Carmen Delaine Maria Keen past coverage characters"

# Before engine work
/super-search --both "architecture deployment engine patterns"
```

---

## Step 3: Check Batch Results

```
/batch check
```

Polls for finished batch jobs from previous sessions. Results at `~/.claude/batches/results/`.

---

## Step 4: Task-Specific Documentation (AS NEEDED)

Based on user request, read additional docs:

### Engine Work
- `docs/reference/V3_ARCHITECTURE.md` — Write-intents, caching, RNG, mode flags
- `docs/engine/ENGINE_ROADMAP.md` — Implementation priorities
- `docs/reference/GODWORLD_REFERENCE.md` — Complete system reference

### Deployment
- `docs/reference/DEPLOY.md` — clasp push vs git push

### Media Room / Journalism
- `docs/media/MEDIA_ROOM_STYLE_GUIDE.md` — Editorial rules, voice, canon
- `docs/media/AGENT_NEWSROOM.md` — Agent system overview
- `docs/media/DESK_PACKET_PIPELINE.md` — Per-desk JSON packets

### Mara Vance
- `docs/mara-vance/OPERATING_MANUAL.md` — Authority & functions
- `docs/mara-vance/CLAUDE_AI_SYSTEM_PROMPT.md` — Character prompt

### Civic/Political
- `phase05-citizens/civicInitiativeEngine.js` — Civic engine
- `docs/engine/INITIATIVE_TRACKER_VOTER_LOGIC.md` — Voter logic

---

## Step 5: Code Search (BEFORE BUILDING)

Before writing new code, search for existing implementations:

```bash
Grep: pattern="feature_name" output_mode="files_with_matches"
```

Check directory structure, verify no duplication.

---

## Step 6: Confirm Understanding

1. **Summarize** current project state (cycle, recent changes, relevant code)
2. **Ask clarifying questions** if anything is unclear
3. **Propose approach** and get approval before writing code

---

## Anti-Patterns

- Don't build without checking existing code
- Don't confuse `git push` (GitHub) with `clasp push` (Apps Script)
- Don't assume what the user wants — ask
- Don't edit code without showing changes first
- Remember: 100+ scripts with cascade dependencies

---

## Session Start Checklist

- [ ] Verify preloaded files are in context
- [ ] Search Supermemory for recent context
- [ ] Check for completed batch results
- [ ] Search for existing code relevant to task
- [ ] Confirm understanding with user
- [ ] Get approval before writing code

---

## Quick Commands

| Command | Purpose |
|---------|---------|
| `/session-startup` | This skill — verify + search + orient |
| `/boot` | Reload identity files after compaction |
| `/session-end` | Close session — journal, persistence, supermemory |
| `/super-search` | Search memory |
| `/super-save` | Save decisions to memory |
| `/batch [task]` | Submit work at 50% cost |
