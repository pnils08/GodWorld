---
name: session-startup
description: Recovery when the SessionStart hook's <godworld-state> block is missing from context (hook misfire or dropped delivery). Reloads the boot from the saved payload, then runs the ready check.
version: "3.0"
updated: 2026-10-28
tags: [infrastructure, active]
effort: low
disable-model-invocation: true
related_skills: [session-end]
---

# /session-startup — boot recovery

The SessionStart hook fires on startup, resume, clear and compact, and injects `<godworld-state>`. Use this only when that block is absent.

1. Read `.claude/state/boot-payload.txt` — the hook writes it on every fire. Fresh mtime → the hook ran and delivery dropped; the file is the boot. Stale or missing → the hook died; run `bash .claude/hooks/session-startup-hook.sh < /dev/null` and read its output.
2. Run `CLAUDE.md` §Ready check.

Prior version: `.claude/boot-legacy/session-startup-SKILL.legacy.md`.
