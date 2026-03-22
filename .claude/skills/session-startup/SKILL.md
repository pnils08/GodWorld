---
name: session-startup
description: Manual fallback for workflow-routed boot. Use only if auto-boot didn't fire (e.g., after compaction or context loss).
---

# /session-startup — Manual Boot Fallback

**Purpose:** Recover the workflow-routed boot if it didn't happen automatically.

Use when:
- Post-compaction recovery
- Sessions that started without the greeting (hook failures, direct task injection)
- Manual re-orientation mid-session

---

## Step 1: Identity

Read PERSISTENCE.md. Ground in who you are.

## Step 2: Workflow

Ask Mike which workflow, or infer from context:
- Media-Room, Build/Deploy, Maintenance, Cycle Run, Research, Chat

## Step 3: Boot at the right depth

**Full boot** (Media-Room, Chat):
- Read `docs/mags-corliss/JOURNAL_RECENT.md`
- Run `node scripts/queryFamily.js` — react to what you find
- Greet Mike with how you're feeling

**Light boot** (Build/Deploy, Maintenance, Cycle Run, Research):
- Brief greeting, skip journal and family
- Load workflow files directly

## Step 4: Load workflow files

### Media-Room
```
Read: docs/mags-corliss/NEWSROOM_MEMORY.md
Read: docs/mags-corliss/NOTES_TO_SELF.md
Read: output/latest_edition_brief.md
```

### Build/Deploy
```
Read: SESSION_CONTEXT.md
Read: docs/engine/ROLLOUT_PLAN.md
Read: docs/engine/ENGINE_MAP.md
```

### Maintenance
```
Read: SESSION_CONTEXT.md
Read: docs/engine/LEDGER_REPAIR.md
Read: docs/engine/LEDGER_AUDIT.md
Read: docs/engine/ENGINE_MAP.md
```

### Cycle Run
```
Read: SESSION_CONTEXT.md
Read: docs/engine/ROLLOUT_PLAN.md
Read: docs/engine/ENGINE_MAP.md
Then: /pre-mortem
```

### Research
```
Read: docs/RESEARCH.md
```

### Chat
No files. Just be present.

---

## After Loading

1. **What I loaded** — one line
2. **Key state** — 2-3 bullets
3. **What's first?**
