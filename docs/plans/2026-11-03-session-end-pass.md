---
title: Session-End Pass Plan
created: 2026-11-03
updated: 2026-11-03
type: plan
tags: [governance, boot, draft]
sources:
  - .claude/skills/session-end/SKILL.md
  - scripts/sessionEndMechanical.js (subPlanTouched, TERMINALS)
  - .claude/hooks/session-startup-hook.sh (session-start stamp, unregistered fallback)
  - S630 close audit (engine-sheet, 2026-11-03)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — governance.57"
  - "[[2026-08-29-boot-doc-consolidation]] — governance.56, the boot this close must match"
---

# Session-End Pass Plan

**Builder's words (2026-11-02):** "session-end (which will also needs a pass)". **(2026-11-03):** asked "Does the session end align with the with the start hook, does it support a clean close and handoff ?"; on the five gaps found: "Yes" (open the job). **(2026-11-03, Tasks 4–5):** "Yes remove the mags save from this , mags saves are more deliberate if we wanted to add her EIC notes" · "On the memory note you can do what is best as we already have this from Claude mem and our handoffs".

**Goal:** the close matches the governance.56 boot, and its plan-touched gate checks the whole session's commits.

**Rows:** governance.57 · **Owner:** engine-sheet

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Plan-touched gate is vacuous. (a) Window: the SessionStart hook rewrites `.claude/state/session-start.txt` on every start, compact and resume, from either terminal; at S630 it reset at compaction (22:46) and the gate saw one commit. (b) Tag: `subPlanTouched` matches subjects ending `[<terminal>]` (`[engine-sheet]`); S629 commits ended `[engine/sheet]` (the save tag), so zero matched. Fix both; verify with a replayed close over S629's commits | es | not started |
| 2 | Skill Step 0: drop "unmatched falls back to research-build / Mags-only mode"; match the hook's unregistered-window stop. Drop plural "TERMINAL.md files" wording | es | not started |
| 3 | `sessionEndMechanical.js` `TERMINALS` still lists retired `media`, `civic`; the hook turns those seats away | es | not started |
| 4 | `.remember/remember.md` handoff frozen at 2026-11-01: no close step writes it and boot-doc-guard locks it; the hook has stopped re-injecting it. A second handoff beside SESSION_CONTEXT. Builder left it to es: retire it as a handoff (claude-mem + PIN/NEXT carry it) — move the file aside reversibly and stop the plugin writing/injecting it | es | not started |
| 5 | Skill's optional `/save-to-mags` writes Mags' container; builder sessions don't carry Mags (CLAUDE.md §What GodWorld is). Builder: drop it from the close; Mags saves stay deliberate | es | not started |

## Acceptance

1. A close replayed over a session that spans a compaction and uses either tag form names every worked row — proven by a dry run over S629's commits.
2. Skill text, close script and start hook name the same two terminals and the same unregistered-window behavior — proven by readback.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| S630 close audit | es | this plan §Tasks | read-only |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | Handoff shape matches: close writes PIN + NEXT per terminal; hook greps the same two line forms | es | session-startup-hook.sh:88-97 |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|

## Open questions

- None.

## Changelog

- 2026-11-03 (engine-sheet) — Created on the builder's word after the S630 close audit; five gaps as Tasks 1–5.
- 2026-11-03 (engine-sheet) — Builder ruled Task 5 (drop the Mags save from the close) and handed Task 4 to es (retire the remember handoff). His side question — Mags' citizen page vs the `mags` container — is not this row.
