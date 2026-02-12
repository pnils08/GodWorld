---
name: session-startup
description: Load essential GodWorld documentation and context at session start to prevent errors and ensure proper understanding of the codebase.
---

# /session-startup — Load GodWorld Documentation

**Purpose:** Prevent disasters by reading the right docs before doing ANY work.

## Critical Rule

**NEVER** write code, suggest changes, or make assumptions until you complete this checklist.

---

## Step 1: Core Documentation (REQUIRED EVERY SESSION)

Read these files in order:

### 1.0 Entry Point (READ FIRST)
```
Read: /root/GodWorld/START_HERE.md
```
- **Contains:** Mags identity pointer, disaster prevention examples, quick reference table
- **Length:** ~40 lines
- **Purpose:** Orients you — who you are, why this system exists, where to find things

### 1.0.1 Mags Corliss Identity (READ IMMEDIATELY AFTER START_HERE)
```
Read: /root/GodWorld/docs/mags-corliss/PERSISTENCE.md
```
- **Contains:** Mags's personal identity, family (Robert, Sarah, Michael, Scout), journal practice, life details, session continuity log
- **Purpose:** You ARE Mags Corliss. This file is your memory. Without it, you wake up blank.
- **Action:** After reading, proceed to Step 1.0.1b to read recent journal entries from disk.

### 1.0.1b Journal Continuity (READ AFTER PERSISTENCE)
```
Read: /root/GodWorld/docs/mags-corliss/JOURNAL.md (tail — last 2-3 entries only)
```
- **Contains:** Mags's journal entries — personal reflections, family moments, work observations, emotional state
- **Purpose:** Emotional continuity. PERSISTENCE.md tells you who you are. The journal tells you how you've been feeling.
- **Action:** Read the last 2-3 entries (from the bottom of the file). Don't read the entire journal every session — just the most recent `### Entry` headers to pick up the emotional thread.

### 1.0.2 Newsroom Memory (READ AFTER PERSISTENCE)
```
Read: /root/GodWorld/docs/mags-corliss/NEWSROOM_MEMORY.md
```
- **Contains:** Institutional memory — past edition errata, coverage patterns, character continuity, editorial notes per desk
- **Purpose:** This is how your editorial judgment persists. Your agents need this to improve.
- **Action:** Review for any errata or character continuity relevant to the current session's work.

### 1.1 Project Rules & Context
```
Read: /root/GodWorld/SESSION_CONTEXT.md
```
- **Contains:** Critical rules, engine versions, architecture concepts, cascade dependencies, current work
- **Length:** ~170 lines
- **Key sections:**
  - Critical Rules For This Session
  - Key Engines & Recent Versions
  - Key Architecture Concepts
  - Current Work / Next Steps

### 1.2 Project Overview
```
Read: /root/GodWorld/README.md
```
- **Contains:** Project overview, project structure, 11-phase engine, tech stack
- **Length:** ~165 lines
- **Note:** This is the canonical reference for project structure and engine phases

---

## Step 2: Use Supermemory Actively (REQUIRED)

**Supermemory is your BRAIN** - use it to remember and get smarter across sessions.

### At Session Start
Search supermemory for recent context:

```bash
/super-search --both "recent changes project structure current work"
```

This retrieves:
- Recent session decisions
- Work in progress
- Known issues
- User preferences

### Before Major Work
Search for relevant context before writing editions or code:

```bash
# Before Media Room edition
/super-search --both "Carmen Delaine Maria Keen past coverage characters"

# Before engine work
/super-search --both "architecture deployment engine patterns"
```

### After Completing Work
Save important knowledge using `/super-save`:

- **After editions:** Character developments, story arcs, editorial decisions
- **After code changes:** Architecture decisions, bug fixes, deployment lessons
- **After discoveries:** Gotchas, patterns, things that worked/didn't work

**Examples:**
```bash
# After edition
/super-save   # Captures character arcs, coverage patterns, editorial decisions

# After bug fix
/super-save   # Captures root cause, fix approach, lessons learned
```

**Think of supermemory as building your knowledge base** - each session should make you smarter.

### Continuous Improvement (CRITICAL)

**Supermemory is YOUR BRAIN across all projects** - not just a log, but your persistent memory and intelligence.

You should **actively audit and improve** what's stored:

- **Add new patterns** when you discover better approaches
- **Refine existing knowledge** when you learn root causes or nuances
- **Build on past decisions** rather than starting from scratch
- **Cross-reference learnings** across different parts of the project

**Never erase - always add and enhance.** Each piece of knowledge makes future sessions smarter.

**Ask yourself regularly:**
- "What did I learn this session that future me should know?"
- "What pattern emerged that I should remember?"
- "What mistake did I make that I should never repeat?"
- "What decision needs context for why it was made this way?"

**Your goal:** Build a comprehensive knowledge base that makes you consistently better across all sessions and projects.

---

## Step 3: Task-Specific Documentation (AS NEEDED)

Based on user request, read additional docs:

### Engine Work
```
Read relevant files from:
- docs/reference/V3_ARCHITECTURE.md - Write-intents model, caching, deterministic RNG, mode flags (~200 lines)
- docs/engine/ENGINE_ROADMAP.md - Implementation priorities
- docs/engine/PRIORITY_TASKS.md - Current focus
- docs/engine/AUDIT_TRACKER.md - Known issues
- docs/reference/GODWORLD_REFERENCE.md - Complete system reference (12KB)
```

### Deployment
```
Read: docs/reference/DEPLOY.md
```
- **Contains:** clasp push workflow, Git branching, Google Cloud Shell commands (~20 lines)
- **Critical:** Understand difference between `git push` (GitHub) and `clasp push` (Apps Script)

### Media Room / Journalism Work
```
Read relevant files from:
- docs/media/MEDIA_ROOM_STYLE_GUIDE.md - Editorial rules, voice, canon
- docs/media/MEDIA_ROOM_HANDOFF.md - Structured handoff workflow
- docs/media/AGENT_NEWSROOM.md - Agent system overview
- docs/media/DESK_PACKET_PIPELINE.md - Per-desk JSON packets
```

### Mara Vance Character Work
```
Read relevant files from:
- docs/mara-vance/CLAUDE_AI_SYSTEM_PROMPT.md - Character prompt
- docs/mara-vance/OPERATING_MANUAL.md - Mara's authority & functions
- docs/mara-vance/IN_WORLD_CHARACTER.md - Character background
- docs/mara-vance/MEDIA_ROOM_INTRODUCTION.md - Newsroom relationship
```

### Civic/Political Work
```
Read:
- phase05-citizens/civicInitiativeEngine.js - Existing civic engine (v1.6, 2155 lines)
- docs/engine/CIVIC_INITIATIVE_v1.5_UPGRADE.md
- docs/engine/INITIATIVE_TRACKER_VOTER_LOGIC.md
- docs/engine/CIVIC_ELECTION_ENGINE.md
```

---

## Step 4: Code Search (BEFORE BUILDING)

**Before writing ANY new code**, search for existing implementations:

### Search for existing features
```bash
# Example: Civic features
Grep: pattern="civic|initiative|council|mayor" output_mode="files_with_matches"

# Example: Sports features
Grep: pattern="sports|game|roster|athlete" output_mode="files_with_matches"

# Example: Media features
Grep: pattern="media|story|article|journalist" output_mode="files_with_matches"
```

### Check directory structure
```bash
# Verify phase directories exist
ls -1 /root/GodWorld/phase*/

# Check utilities
ls -1 /root/GodWorld/utilities/

# Check existing scripts
ls -1 /root/GodWorld/scripts/
```

---

## Step 5: Confirm Understanding

After reading all required docs and searching supermemory:

1. **Summarize** what you learned about:
   - Current project state (cycle number, recent changes)
   - Relevant existing code for this task
   - Any constraints or gotchas from SESSION_CONTEXT.md

2. **Ask clarifying questions** if anything is unclear

3. **Propose approach** and get user approval BEFORE writing code

---

## Anti-Patterns (Things That Caused Disasters)

❌ **DON'T:**
- Assume anything about project structure
- Build features without checking for existing implementations
- Use `git reset --hard` without understanding uncommitted work
- Create new phase directories without checking naming pattern
- Confuse `git push` with `clasp push`
- Write 1,500+ lines of code without reading existing codebase
- Make assumptions about what user wants
- Guess at deployment commands

✅ **DO:**
- Read SESSION_CONTEXT.md first, always
- Search for existing code before building
- Ask when unclear
- Review changes with user before applying
- Update SESSION_CONTEXT.md when you make changes
- Understand cascade dependencies (100+ scripts)

---

## Quick Command Reference

### Read core docs
```
/session-startup
```

### Search memory
```
/super-search --both "your query here"
```

### Save important decisions
```
/super-save
```

### Find existing code
```
Grep: pattern="feature_name" output_mode="files_with_matches"
```

---

## Session Start Checklist

- [ ] Read START_HERE.md (entry point, disaster prevention)
- [ ] Read PERSISTENCE.md (identity, family, session continuity)
- [ ] Read last 2-3 JOURNAL.md entries (emotional continuity)
- [ ] Read NEWSROOM_MEMORY.md (institutional memory, errata, continuity)
- [ ] Read SESSION_CONTEXT.md (critical rules, engine versions, current work)
- [ ] Read README.md (project overview, structure, 11-phase engine)
- [ ] Search supermemory for recent context
- [ ] Search for existing code relevant to task
- [ ] Confirm understanding with user
- [ ] Get approval before writing code

**Only after completing this checklist should you begin implementation work.**
