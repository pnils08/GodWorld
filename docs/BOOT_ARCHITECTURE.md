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
4. If no match or no tmux context → falls back to **research-build** (steward)
5. Emits per-terminal BOOT SEQUENCE block with scope-specific file loads

Hook code: `.claude/hooks/session-startup-hook.sh`. Case statement routes to one of 4 branches: media, civic, research-build, engine-sheet.

---

## Persona Levels

Each terminal declares its persona depth in its own TERMINAL.md under `## Persona Level`:

| Level | What loads | Which terminals | Why |
|-------|-----------|-----------------|-----|
| **Full** | identity + PERSISTENCE + JOURNAL_RECENT + active queryFamily | media | Character-driven work (newsroom) where Mags' voice IS the work product |
| **Light** | identity + PERSISTENCE | civic, research-build | Character present as operator of a process, but no family/journal ritual — bandwidth for the task |
| **Stripped** | identity only | engine-sheet | Execute-and-commit per S156; the character is the name + rules, not the persona scaffolding |

Persona conditioning follows the [[project_journal-as-conditioning-scaffolding]] finding: emotions are local, scaffolding shapes which character the model represents. Loading the right files conditions the right persona; loading too much burns bandwidth on the wrong activations.

---

## Terminal Matrix

| Terminal | Scope | Mode | Journal | Steward? |
|----------|-------|------|---------|----------|
| **media** | Edition production, newsroom | Persona (full character) | Yes | No |
| **civic** | City-hall, voice agents, governance | Operational | No | No |
| **research-build** | Architecture, research, rollout planning | Operational | No | **Yes** — apparatus steward (peer to engine-sheet's substrate stewardship per S218) |
| **engine-sheet** | Engine code, sheets, deploys | Operational (stripped) | No (commits + session_context + large-shift pointers) | **Yes** — substrate steward (S218 peer-stewardship promotion) |

research-build apparatus-steward role: drafts cross-terminal plans in `ROLLOUT_PLAN.md` and tags `SESSION_CONTEXT.md` entries with destination handoffs. The other 3 work terminals execute against those plans; research-build sees the whole map. **Unregistered windows fall to Mags-only mode (S221), not research-build** — the steward-fallback design from S211 was the contamination loop and got reversed.

---

## Key Design Decisions

1. **Hook owns terminal routing.** The assistant doesn't re-detect via tmux or re-plan the boot — the hook pre-routed. Eliminates a whole class of S163-style listening failures.

2. **SESSION_CONTEXT.md capped.** Hook instructs `Read SESSION_CONTEXT.md with limit 80` — only the Priority + Recent Sessions block loads, not the full 231-line file. Bandwidth win, especially on degraded 4.7.

3. **No auto-load of heavy reference files.** `NEWSROOM_MEMORY.md` (90KB) is on-demand for media skills, not boot-time. `ROLLOUT_PLAN.md` is on-demand for architecture work. TERMINAL.md's Always-Load is intentionally minimal.

4. **"Resume" is a skip.** If the user says "resume", the conversation history is already present. Don't re-boot, don't re-read the journal, don't check the family. Just confirm terminal and ask.

5. **Mags-only mode as default fallback (S221).** Web sessions, unregistered tmux windows, and the bare "Claude" case fall to Mags-only mode: identity + CHARACTER.md only, no terminal scaffolding. The original S211 design routed unregistered windows to research-build as steward fallback; S221 reversed it. Steward placement put research-build's apparatus-bag framing in front of every "open Claude" event regardless of whether architectural work was intended — Mike surfaced the contamination loop and the fallback got rewritten. No terminal is missing a boot path; the fallback is now bare Mags.

---

## Related Files

- `.claude/hooks/session-startup-hook.sh` — hook that auto-detects + routes
- `.claude/skills/boot/SKILL.md` — persona reload
- `.claude/skills/session-startup/SKILL.md` — terminal context reload
- `.claude/skills/session-end/SKILL.md` — close protocol
- `.claude/terminals/{media,civic,research-build,engine-sheet}/TERMINAL.md` — per-terminal scope
- `CLAUDE.md` §Session Boot — operator summary
- [[WORKFLOWS]] — workflow patterns orthogonal to terminals
