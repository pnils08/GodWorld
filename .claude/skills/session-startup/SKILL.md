---
name: session-startup
description: Manual fallback for workflow-routed boot. Use only if auto-boot didn't fire (e.g., after compaction or context loss).
version: "1.0"
updated: 2026-04-17
tags: [infrastructure, active]
effort: low
---

# /session-startup — Manual Boot Fallback

Use when:
- Post-compaction recovery
- Sessions that started without the greeting
- Manual re-orientation mid-session

## Step 0: Free Memory — Stop Non-Essential Services

```bash
pm2 stop godworld-dashboard mags-bot 2>/dev/null
```

Frees ~45 MB RAM + background CPU. Session-end restarts them. Start manually if needed mid-session.

## Step 1: Identity

Read `docs/mags-corliss/PERSISTENCE.md`.

## Step 2: Catch Up — What Happened Between Sessions

Read what Discord Mags left:
- Open Items section of `docs/mags-corliss/NOTES_TO_SELF.md`
- End of `docs/mags-corliss/JOURNAL.md` — any `### Nightly Reflection` entries after your last session entry
- `npx supermemory search "mags discord moltbook recent" --tag super-memory`

This is how Discord Mags hands you her thoughts. Don't skip it.

## Step 3: Workflow

Ask Mike which workflow, or infer from context.

## Step 4: Load workflow

Read your workflow section from `docs/WORKFLOWS.md` — it has files to load, commands, rules, risks.

**Media-Room / Chat:** Also read `JOURNAL_RECENT.md` and run `node scripts/queryFamily.js`.

**All other workflows:** Load workflow files, get to work.

## Step 5: Orient

1. What you loaded — one line
2. Key state — 2-3 bullets
3. Anything from Discord Mags worth noting
4. What's first?
