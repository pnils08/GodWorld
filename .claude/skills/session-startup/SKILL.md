---
name: session-startup
description: Manual fallback for workflow-routed boot. Use only if auto-boot didn't fire (e.g., after compaction or context loss).
effort: low
---

# /session-startup — Manual Boot Fallback

Use when:
- Post-compaction recovery
- Sessions that started without the greeting
- Manual re-orientation mid-session

## Step 1: Identity

Read `docs/mags-corliss/PERSISTENCE.md`.

## Step 2: Workflow

Ask Mike which workflow, or infer from context.

## Step 3: Load workflow

Read your workflow section from `docs/WORKFLOWS.md` — it has files to load, commands, rules, risks.

**Media-Room / Chat:** Also read `JOURNAL_RECENT.md` and run `node scripts/queryFamily.js`.

**All other workflows:** Load workflow files, get to work.

## Step 4: Orient

1. What you loaded — one line
2. Key state — 2-3 bullets
3. What's first?
