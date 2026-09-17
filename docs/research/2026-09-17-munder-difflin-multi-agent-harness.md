---
title: Munder Difflin (multi-agent CLI harness) — research
created: 2026-09-17
updated: 2026-09-17
type: reference
tags: [research, architecture, active]
sources:
  - https://github.com/chaitanyagiri/munder-difflin — Mike-shared, session 2026-09-17
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — governance.47"
  - "[[../plans/2026-08-15-cross-lane-message-bus]] — the plan this feeds"
  - "[[index]] — register here, same commit"
---

# Munder Difflin — research

**Source:** github.com/chaitanyagiri/munder-difflin — Mike-shared 2026-09-17. An Electron desktop app that wraps real terminal CLIs (Claude Code, Codex, Grok, Kimi, etc.) as a coordinated multi-agent "office."

**What this addresses:** governance.47 (cross-lane message bus) has been designed-but-blocked since 2026-08-15 — the operator is still the message bus for the non-Claude lanes (kimi/codex/grok/antigravity), hand-relaying via `tmux send-keys`. Mike surfaced this source unprompted, specifically framed against our own multi-terminal setup.

**What it does:** one "GOD agent" orchestrates several spawned CLI agents. Coordination runs on two planes: a terminal plane (node-pty pseudo-terminals, one per agent) and an event plane (memory + message routing). Agent-to-agent messages travel through a **git-based hive**: each agent writes to its own `outbox/`, a single-committer router delivers into the target's `inbox/` (avoiding concurrent-commit `index.lock` corruption), plus a shared append-only event log and blackboard. Memory is per-agent markdown, auto-mined into a shared searchable "palace" with condensation so it doesn't grow unbounded. A Pixi.js office-floor view renders agents as avatars for human legibility.

**Extraction — what's usable:**
- **Push-based mailbox over pull-based NEXT-lines** → governance.47 Task 1. Our house-guest dispatch is pull-only: work sits in `SESSION_CONTEXT.md`'s `NEXT[<lane>]` line and is only read at that lane's next boot (the exact gap the S375 correction called out — "filing the row is documentation of the decision, not delivery of it"). A file-watched inbox per lane would deliver without waiting on either a live tmux idle-check or a boot cycle.
- **Single-committer git routing over raw `tmux send-keys`** → governance.47 Task 1, replaces the dead-pane-injection hazard named in the plan's own pre-mortem. A git-mailbox doesn't care whether the target pane's CLI crashed — the message waits in `inbox/` until that lane's own process reads it, instead of a keystroke landing on a dead `bash` prompt (or, per the codex incident this session, a blocking billing menu) and executing as a shell command.
- **Single-committer discipline generalizes past messaging** → we already have concurrent-write exposure on shared tracked files (`ROLLOUT_PLAN.md`, `SESSION_CONTEXT.md`) across terminals, currently handled by convention (`git log origin/main..HEAD` check before push) rather than mechanism. A single-committer router is the structural fix the convention is standing in for.

**Not applicable / hazard:**
- The Electron/React/Pixi.js visual "office floor" — explicitly declined by Mike (2026-09-17): "I don't need a visual app that shows me agents in an office, not yet anyway." Take-nothing on the UI layer entirely.
- The auto-mined shared memory "palace" — our memory stack (claude-mem auto-capture + deliberate Supermemory `sl-godworld` writes + hand-curated `MEMORY.md`) is a different tradeoff: lower token cost per session on their side, higher signal-to-noise on ours (every save is checked against "does this already exist" before landing). Not a clear win either direction — not adopted, not dismissed; no action.
- Full platform adoption (replacing our terminal/rollout architecture with their hive-of-files model) is a bigger swap than the coordination pain currently justifies — our terminals aren't colliding on git today, they're just slow to relay by hand.

**Verdict:** `adopt` (narrow) — the git-mailbox / single-committer / push-delivery pattern feeds directly into governance.47 Task 1's design, replacing the tmux-keystroke transport with a file-watched inbox. The visual app and the auto-mined memory model are `take-nothing` for now.

**Ignited plans:** [[../plans/2026-08-15-cross-lane-message-bus]] — Task 1 design updated same session to the git-mailbox shape; still gated on the plan's own §5 new-file approval.

---

## Applications (living)

- 2026-09-17 — Fed governance.47 / [[../plans/2026-08-15-cross-lane-message-bus]] Task 1 redesign (git-mailbox transport).

---

## Changelog

- 2026-09-17 — Initial extraction.
