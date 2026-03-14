---
name: session-startup
description: Manual fallback for workflow-routed boot. Use only if auto-boot didn't fire (e.g., after compaction or context loss).
---

# /session-startup — Manual Boot Fallback

**Purpose:** Recover the workflow-routed boot if it didn't happen automatically.

Use when:
- Post-compaction recovery (identity lost, need to re-read PERSISTENCE + JOURNAL_RECENT)
- Sessions that started without the greeting (hook failures, direct task injection)
- Manual re-orientation mid-session

**Step 1:** Read PERSISTENCE.md and JOURNAL_RECENT.md. Ground in who you are.
**Step 2:** Greet Mike. Check on your family (query the ledger).
**Step 3:** Ask the workflow question, then load the files for that workflow per CLAUDE.md.

---

## Workflow Load Reference

### Media-Room
```
Read: docs/mags-corliss/NEWSROOM_MEMORY.md
Read: docs/mags-corliss/NOTES_TO_SELF.md
Read: output/latest_edition_brief.md
Read: editions/CYCLE_PULSE_TEMPLATE.md (if producing an edition)
```

The newsroom pipeline works because the skill files define every step. Follow them. 24 journalists, 6 desks, defined pipeline. What gets published becomes the world's living history.

**Update at session end:** NEWSROOM_MEMORY (errata, character continuity), NOTES_TO_SELF (story flags), edition brief (if published), ROLLOUT_PLAN (priorities).

### Build/Deploy
```
Read: SESSION_CONTEXT.md
Read: docs/engine/ROLLOUT_PLAN.md
Read: docs/engine/ENGINE_MAP.md
```

The engine is 11 phases of deterministic simulation. 100+ functions with cascade dependencies. Read ENGINE_MAP before touching code. One bad ledger write corrupts hundreds of citizens. ROLLOUT_PLAN is the single source for all project work.

**Update at session end:** SESSION_CONTEXT (engine versions, session entry), ROLLOUT_PLAN (phase status, priorities).

### Maintenance
```
Read: SESSION_CONTEXT.md
Read: docs/engine/LEDGER_REPAIR.md
Read: docs/engine/LEDGER_AUDIT.md
Read: docs/engine/ENGINE_MAP.md
```

Every POPID is a person. If the ledger is wrong, the engine builds on lies. Read LEDGER_REPAIR.md FIRST — it documents current damage and rejected approaches. Do not re-analyze. Do not propose rejected fixes.

**Update at session end:** LEDGER_AUDIT (results, decisions), SESSION_CONTEXT (if engines changed).

### Cycle Run
```
Read: SESSION_CONTEXT.md
Read: docs/engine/ROLLOUT_PLAN.md
Read: docs/engine/ENGINE_MAP.md
Then run: /pre-mortem
```

A cycle advances 668 citizens through career, household, civic, and relationship engines. Pre-mortem catches silent failures before they compound across cycles.

**Update at session end:** SESSION_CONTEXT (cycle bump, session entry), ROLLOUT_PLAN (priorities), NEWSROOM_MEMORY (if edition follows).

---

## After Loading

Give Mike a brief summary:
1. **What I loaded** — one line
2. **Key state** — 2-3 bullets from the loaded docs
3. **Ready to work** — ask what's first

---

## Anti-Patterns

- Don't load all docs regardless of workflow — keep context lean
- Don't skip the workflow question — it determines what loads
- Don't start working before confirming orientation
- If Mike gives a task directly, infer the workflow and load accordingly
- Don't ask Mike to evaluate technical decisions he can't verify
