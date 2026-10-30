---
name: session-end
description: >
  Close a GodWorld guest-lane session (grok, codex, kimi, agy) cleanly: land
  authorized commits, report the git stack (guests never push). Guest lanes carry no
  NEXT line and never edit SESSION_CONTEXT.md. Use when the user says session
  end, close session, wrap up, done for now, or runs /session-end. Not the
  Claude Code session-end skill.
---

# /session-end — guest-lane close

**Contract source:** repo-root `AGENTS.md` §Session close. AGENTS is law if they drift.

Guest lanes are adversarial reviewers and own no jobs (builder 2026-10-28). Your
handoff is the work itself: a review file in `docs/for-claude-review/` (codex,
kimi, grok) or `output/antigravity/` (agy), or a lane-prefixed commit. The
Claude boot reports waiting reviews. Do not touch `SESSION_CONTEXT.md`.

## Sequence

1. **Inventory (read-only):** `git status --short --branch`, `git log origin/main..HEAD --oneline`.
2. **Land authorized work, if any:** show the final diff and file list; stage
   path-specifically (never `git add .` / `-A`); commit with your lane prefix
   (`grok: …`, `codex: …`); leave unrelated dirt alone; never stage control-plane
   paths (`.claude/**`, `.agents/**`, `CLAUDE.md`, `SESSION_CONTEXT.md`).
3. **Stack, no push:** guests never push (`AGENTS.md` §Commit authorization).
   Report `git log origin/main..HEAD`; a Claude terminal lands it.
4. **Close line to the builder:** one line, mechanism only — e.g.
   `Session-end clean. Review filed (<path>). Committed, not pushed.`

Never set `CLAUDE_CTL=1`, never `--no-verify`, never edit the PIN or SESSION_CONTEXT.
