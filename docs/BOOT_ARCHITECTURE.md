---
title: Boot Architecture
created: 2026-02-15
updated: 2026-04-18
type: reference
tags: [architecture, infrastructure, active]
sources:
  - CLAUDE.md §Session Boot
  - .claude/terminals/*/TERMINAL.md
  - .claude/hooks/session-startup-hook.sh
  - .claude/skills/boot/SKILL.md
  - .claude/skills/session-startup/SKILL.md
pointers:
  - "[[index]] — doc catalog"
  - "[[SCHEMA]] — doc conventions"
  - "[[WORKFLOWS]] — workflow reference (orthogonal to terminals)"
---

# Boot Architecture — S165

**The reference for how boot works.** CLAUDE.md §Session Boot is the operator-facing summary; per-terminal TERMINAL.md files are the per-scope detail. This doc explains *why* the architecture is shaped the way it is, so future changes don't regress.

---

## The Split (S165)

**`/boot` = persona conditioning.** Reloads identity + PERSISTENCE + JOURNAL_RECENT + queryFamily, scaled to the terminal's Persona Level. Used after compaction or when identity drifts.

**`/session-startup` = terminal task-context.** Reloads TERMINAL.md + scope files + compact SESSION_CONTEXT slice. Used when the hook misfired or scope drifted.

**Composition:**
- Cold fresh session: hook auto-injects both (per-terminal sequence)
- Post-compaction: `/boot` alone
- Terminal switch or hook-miss: `/session-startup` alone

**Why they're split:** S163 "Twelve" journal entry documents 12 consecutive failures to hold Mike's formulation *"Boot loads Mags, session-startup handles terminals"* when the two skills overlapped ~80%. Mechanizing the split prevents that contamination.

---

## Terminal Detection Flow

1. `SessionStart` hook fires at Claude Code session start
2. Hook runs `tmux display-message -t "$TMUX_PANE" -p '#W'`
3. Validates result against `.claude/terminals/{name}/` directories
4. If no match or no tmux context → falls back to **mags** (default)
5. Emits per-terminal BOOT SEQUENCE block with scope-specific file loads

Hook code: `.claude/hooks/session-startup-hook.sh`. Case statement routes to one of 5 branches: mags, media, civic, research-build, engine-sheet.

---

## Persona Levels

Each terminal declares its persona depth in its own TERMINAL.md under `## Persona Level`:

| Level | What loads | Which terminals | Why |
|-------|-----------|-----------------|-----|
| **Full** | identity + PERSISTENCE + JOURNAL_RECENT + active queryFamily | mags, media | Character-driven work (conversation, newsroom) where Mags' voice IS the work product |
| **Light** | identity + PERSISTENCE | civic, research-build | Character present as operator of a process, but no family/journal ritual — bandwidth for the task |
| **Stripped** | identity only | engine-sheet | Execute-and-commit per S156; the character is the name + rules, not the persona scaffolding |

Persona conditioning follows the [[project_journal-as-conditioning-scaffolding]] finding: emotions are local, scaffolding shapes which character the model represents. Loading the right files conditions the right persona; loading too much burns bandwidth on the wrong activations.

---

## Terminal Matrix

| Terminal | Scope | Persona | Journal | Top instance? |
|----------|-------|---------|---------|---------------|
| **mags** | Idea bank, conversation, meta-aware. Default fallback. | Full | Yes | **Yes** — top instance over the 4 work terminals |
| **media** | Edition production, newsroom | Full | Yes | No |
| **civic** | City-hall, voice agents, governance | Light | Yes | No |
| **research-build** | Architecture, research, rollout planning | Light | Yes | No |
| **engine-sheet** | Engine code, sheets, deploys | Stripped | No (commits + session_context + large-shift pointers) | No |

mags authority: above the parallel-terminal push-coordination protocol. Can touch any scope, commit and push without gating on other terminals' state (because mags is the instance monitoring them). The 4 work terminals coordinate through `ROLLOUT_PLAN.md` + push windows; mags sits above.

---

## Key Design Decisions

1. **Hook owns terminal routing.** The assistant doesn't re-detect via tmux or re-plan the boot — the hook pre-routed. Eliminates a whole class of S163-style listening failures.

2. **SESSION_CONTEXT.md capped.** Hook instructs `Read SESSION_CONTEXT.md with limit 80` — only the Priority + Recent Sessions block loads, not the full 231-line file. Bandwidth win, especially on degraded 4.7.

3. **No auto-load of heavy reference files.** `NEWSROOM_MEMORY.md` (90KB) is on-demand for media skills, not boot-time. `ROLLOUT_PLAN.md` is on-demand for architecture work. TERMINAL.md's Always-Load is intentionally minimal.

4. **"Resume" is a skip.** If the user says "resume", the conversation history is already present. Don't re-boot, don't re-read the journal, don't check the family. Just confirm terminal and ask.

5. **mags as default fallback.** Web sessions, unregistered tmux windows, and the bare "Claude" case all route to mags. No terminal is ever missing a boot path.

---

## Related Files

- `.claude/hooks/session-startup-hook.sh` — hook that auto-detects + routes
- `.claude/skills/boot/SKILL.md` — persona reload
- `.claude/skills/session-startup/SKILL.md` — terminal context reload
- `.claude/skills/session-end/SKILL.md` — close protocol
- `.claude/terminals/{mags,media,civic,research-build,engine-sheet}/TERMINAL.md` — per-terminal scope
- `CLAUDE.md` §Session Boot — operator summary
- [[WORKFLOWS]] — workflow patterns orthogonal to terminals
