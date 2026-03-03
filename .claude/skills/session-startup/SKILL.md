---
name: session-startup
description: Manual fallback for workflow-routed boot. Use only if auto-boot didn't fire (e.g., after compaction or context loss).
---

# /session-startup — Manual Boot Fallback

**Purpose:** Recover the workflow-routed boot if it didn't happen automatically.

The normal boot flow is automatic — CLAUDE.md tells Mags to greet and ask the workflow question on first interaction. This skill exists for:
- Post-compaction recovery (identity lost, need to re-read PERSISTENCE + JOURNAL_RECENT)
- Sessions that started without the greeting (hook failures, direct task injection)
- Manual re-orientation mid-session

**If running manually:** Read PERSISTENCE.md and JOURNAL_RECENT.md first, greet Mike, ask the workflow question, then proceed to the workflow load below.

---

## Workflow Load Reference

Based on Mike's answer, read the specific files for that workflow. **Do not load files from other workflows** — keep context lean.

### Media-Room
```
Read: docs/mags-corliss/NEWSROOM_MEMORY.md
Read: docs/mags-corliss/NOTES_TO_SELF.md
Read: output/latest_edition_brief.md
Read: editions/CYCLE_PULSE_TEMPLATE.md (if producing an edition)
```
Search Supermemory: `"edition errata coverage patterns desk agent"`

**What you'll update at session end:** NEWSROOM_MEMORY (errata, character continuity), NOTES_TO_SELF (story flags), edition brief (if published), ROLLOUT_PLAN (Next Session Priorities).

### Research
```
Read: docs/mags-corliss/TECH_READING_ARCHIVE.md
Read: docs/engine/ROLLOUT_PLAN.md
```
Search Supermemory: `"tech reading Claude features tools research"`

**What you'll update at session end:** TECH_READING_ARCHIVE (new notes), ROLLOUT_PLAN (new buildable items discovered).

### Build/Deploy
```
Read: SESSION_CONTEXT.md
Read: docs/engine/ROLLOUT_PLAN.md
```
Search Supermemory: `"architecture engine deployment recent changes"`

**What you'll update at session end:** SESSION_CONTEXT (engine versions, recent sessions), ROLLOUT_PLAN (phase status, Next Session Priorities).

### Maintenance
```
Read: SESSION_CONTEXT.md
Read: docs/engine/LEDGER_AUDIT.md
Read: docs/engine/LEDGER_HEAT_MAP.md
```
Search Supermemory: `"ledger audit data integrity citizen census"`

**What you'll update at session end:** LEDGER_AUDIT (audit results, decisions), SESSION_CONTEXT (if engines changed), DOCUMENTATION_LEDGER (if file structure changed).

### Cycle Run
```
Read: SESSION_CONTEXT.md
Read: docs/engine/ROLLOUT_PLAN.md
```
Then immediately run: `/pre-mortem` (engine health scan before cycle fires)

Search Supermemory: `"cycle run engine pre-mortem recent issues"`

**What you'll update at session end:** SESSION_CONTEXT (cycle number bump, recent sessions), ROLLOUT_PLAN (Next Session Priorities), NEWSROOM_MEMORY (if edition follows the cycle).

---

## Phase 4: Confirm Orientation

After loading workflow docs, give Mike a brief summary:
1. **What I loaded** — list the files read (one line)
2. **What I see** — key state from the loaded docs (2-3 bullets max)
3. **Ready to work** — ask what's first, or propose based on the loaded context

---

## Anti-Patterns

- Don't load all docs regardless of workflow — that's the old boot
- Don't skip Phase 2 — the question is what makes boot lean
- Don't start working before Phase 4 confirmation
- Don't assume which workflow — ask
- If Mike gives a task directly without answering the workflow question, infer the workflow from the task and load accordingly

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `/session-startup` | This skill — identity + route + load |
| `/boot` | Post-compaction identity reload (Phase 1 only) |
| `/session-end` | Close session — audit, journal, persist |
| `/super-search` | Search memory mid-session |
| `/batch [task]` | Submit work at 50% cost |
