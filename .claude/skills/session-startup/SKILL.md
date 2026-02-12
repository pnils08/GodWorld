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
- **Contains:** Golden rules, why this matters, disaster prevention, deployment workflow
- **Length:** ~68 lines
- **Key sections:**
  - Why This Matters (real disaster from 2026-02-11)
  - Golden Rules (RUN /session-startup FIRST)
  - Deployment Workflow (Claude vs User commands)
  - Quick Reference table

### 1.1 Project Rules & Context
```
Read: /root/GodWorld/SESSION_CONTEXT.md
```
- **Contains:** Critical rules, recent changes, engine versions, 100+ script inventory
- **Length:** 935 lines (read in sections if needed)
- **Key sections:**
  - Critical Rules For This Session
  - Project Structure
  - Key Engines & Recent Versions
  - Recent Changes (bottom of file)

### 1.2 Quick Reference
```
Read: /root/GodWorld/README.md
```
- **Contains:** Project overview, tech stack, 11-phase engine summary
- **Length:** 165 lines

### 1.3 System Architecture
```
Read: /root/GodWorld/docs/reference/V3_ARCHITECTURE.md
```
- **Contains:** Write-intents model, caching, deterministic RNG, mode flags
- **Length:** ~200 lines

### 1.4 Deployment Process
```
Read: /root/GodWorld/docs/reference/DEPLOY.md
```
- **Contains:** clasp push workflow, Git branching, Google Cloud Shell commands
- **Length:** ~20 lines
- **Critical:** Understand difference between `git push` (GitHub) and `clasp push` (Apps Script)

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

---

## Step 3: Task-Specific Documentation (AS NEEDED)

Based on user request, read additional docs:

### Engine Work
```
Read relevant files from:
- docs/engine/ENGINE_ROADMAP.md - Implementation priorities
- docs/engine/PRIORITY_TASKS.md - Current focus
- docs/engine/AUDIT_TRACKER.md - Known issues
- docs/reference/GODWORLD_REFERENCE.md - Complete system reference (12KB)
```

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

- [ ] Read START_HERE.md (entry point, golden rules)
- [ ] Read SESSION_CONTEXT.md (critical rules, recent changes)
- [ ] Read README.md (project overview)
- [ ] Read V3_ARCHITECTURE.md (system architecture)
- [ ] Read DEPLOY.md (deployment workflow)
- [ ] Search supermemory for recent context
- [ ] Search for existing code relevant to task
- [ ] Confirm understanding with user
- [ ] Get approval before writing code

**Only after completing this checklist should you begin implementation work.**
