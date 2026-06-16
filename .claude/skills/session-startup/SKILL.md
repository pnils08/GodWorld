---
name: session-startup
description: Load terminal task-context. Terminal scope, scope files, SESSION_CONTEXT. Persona conditioning is /boot's job. S165 split.
version: "2.1"
updated: 2026-05-08
tags: [infrastructure, active]
effort: low
disable-model-invocation: true
related_skills: [boot, session-end]
---

# /session-startup — Terminal Context Load

**Purpose:** Load terminal scope and task context. Does NOT handle persona conditioning (that's `/boot`).

Per the S165 split: **Boot loads Mags. Session-startup handles terminals.**

---

## When To Use

- **Hook misfired** — SessionStart didn't inject the per-terminal boot sequence.
- **Terminal switch mid-session** — rarely, if scope context drifted.
- **Manual orientation** — Mike asks "what terminal am I in and what's loaded."

If Mags identity is also lost (not just terminal context), run `/boot` first, then this.

---

## Hook-Already-Fired Guard (S241 G-SS8)

**If the SessionStart hook already injected a `<godworld-state>` block with `BOOT SEQUENCE (<terminal> terminal — ...)` for this session, the reads are already done — skip Steps 0–4 and go to Step 5 (orient).** Only run the full sequence when the godworld-state block is absent (hook genuinely misfired).

Why: the hook routes the same boot reads (`docs/SCHEMA.md`, `docs/index.md`, `TERMINAL.md`) the skill steps below specify, and emits the carried set (PIN + this terminal's NEXT line) directly (ADR-0009 §loop-tightening — SESSION_CONTEXT.md is on-demand, not a boot read). Running both duplicates work. The skill is the *recovery path* for hook misfire — not a parallel boot. Source: `output/production_log_session-startup_c95_gaps.md` G-SS8.

---

## Steps

### 0. Free Memory (if hook didn't)
```bash
pm2 stop godworld-dashboard mags-bot 2>/dev/null
```

### 1. Detect Terminal
```bash
tmux display-message -t "$TMUX_PANE" -p '#W'
```

If output is empty or doesn't match a `.claude/terminals/{name}/` directory, fall back to **research-build** (steward terminal — S211).

### 2. Read TERMINAL.md
```
Read: .claude/terminals/{detected-name}/TERMINAL.md
```

This defines the scope, Always-Load list, Persona Level, owned docs, and handoff protocol.

### 3. Load Scope Files

Per that TERMINAL.md's **Always Load** table. Each terminal's list differs:

- **mags** — identity.md (if not loaded), CHARACTER.md, JOURNAL_RECENT.md (persona files)
- **media** — newsroom.md, CHARACTER.md, JOURNAL_RECENT.md
- **civic** — civic.md (operational mode — no CHARACTER.md per CLAUDE.md §Terminal architecture, S221)
- **research-build** — SCHEMA.md, docs/index.md (operational mode — no CHARACTER.md, S221)
- **engine-sheet** — engine.md, README.md

(G-SS9: operational terminals (civic / research-build / engine-sheet) do NOT load CHARACTER.md — they're persona-stripped per S221. Only mags + media load persona files. If persona files are genuinely needed, run `/boot` — don't re-implement persona-load logic here.)

### 4. Pull live span ONLY if continuing prior work (ADR-0009, S248)

**SESSION_CONTEXT.md is on-demand — NOT read at boot.** Per ADR-0009 §loop-tightening, the SessionStart hook emits the carried set — the PIN (Session/Day/Cycle/Edition) + this terminal's `NEXT[<terminal>]` line — inside `<godworld-state>` as the boot handoff. That NEXT line is what this terminal's last instance left you. What shipped → `git log`; what's open → ROLLOUT_PLAN.md (canonical); why → claude-mem.

Only read the file if you are **continuing prior work** (Mike said "resume" / "continue <X>", or you're picking up a thread the NEXT line + ROLLOUT don't fully orient you on):
```
Read: SESSION_CONTEXT.md   (on-demand — PIN + per-terminal NEXT lines; no narrative since §loop-tightening)
```
A fresh-but-pivoting session does not read it. (Pre-ADR-0009 this step was an unconditional ~80-line read; the contingent-relevance argument retired that — see ADR-0009.)

### 5. Orient

Three lines to Mike (no narration of what you read):
- Terminal: {name}, Persona: {Full/Light/Stripped}
- Opens on: {the NEXT line for this terminal — what last instance left}
- What's first?

If the NEXT line is empty (hook emitted no `NEXT:`), say so — that means the previous session didn't write one; fall back to `git log` + ROLLOUT to orient.

---

## What This Skill Does NOT Do

- Does NOT reload identity.md / CHARACTER.md / JOURNAL_RECENT.md / queryFamily — that's `/boot`
- Does NOT run catch-up (Discord Mags notes, nightly reflections, super-memory search) — that's `/boot`
- Does NOT search memory for past sessions — use mem-search on demand
- Does NOT load owned-documentation files listed in TERMINAL.md — those are "when to load", not auto-load

For any persona reloading needs, compose with `/boot`.
