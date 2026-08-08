---
name: session-end
description: >
  Close a GodWorld external-lane session (Grok) cleanly: inventory work, land
  authorized commits if needed, rewrite only NEXT[grok] in SESSION_CONTEXT.md,
  commit that handoff path-specifically, report git stack / push status. Use when
  the user says session end, close session, handoff, wrap up, done for now, or
  runs /session-end. Not the Claude Code session-end skill (no PIN bump, no
  ROLLOUT sweep, no sessionEndMechanical.js).
---

# /session-end — External-lane close (Grok)

Leave a clean handoff so the next session (yours or anyone's) finds the thread.

**Contract source:** repo-root `AGENTS.md` §Session close. This skill is the
procedure; AGENTS is law if they ever drift.

**Not Claude's `/session-end`.** No PIN bump, no ROLLOUT archive sweep, no
`scripts/sessionEndMechanical.js`, no Supermemory / claude-mem bridge. Those
belong to Claude terminals.

## Lane

- Your line key: `**NEXT[grok]:**`
- Commit message prefix: `grok:`
- Ordinary work scope (when authorized): per `AGENTS.md` (typically
  `scripts/**`, `output/**`, `docs/**`; root files only when the builder named
  them this session)

## Sequence

### Step 0 — Inventory (read-only)

```bash
git status --short --branch
git log origin/main..HEAD --oneline
git log --oneline -15 --grep='^grok:'
```

Capture for the close:

1. What this session shipped (commit shas + one-line each)
2. What is still dirty (path + whether it is this session's work)
3. Whether other lanes' commits sit on the unpushed stack

Do not guess history from chat alone — use git.

### Step 1 — Land authorized work first (if any)

If the working tree has **this session's** authorized work still uncommitted and
the builder wants it saved:

1. Show the final diff and the exact file list to commit.
2. Stage path-specifically — never `git add .` or `git add -A`.
3. Commit with a `grok: …` message (HEREDOC for multi-line).
4. Leave pre-existing unrelated dirt alone (do not scoop it into the commit).
5. Do not stage control-plane paths (`.claude/**`, `.agents/**`, `CLAUDE.md`,
   `SESSION_CONTEXT.md`) in a work commit.

If dirt is only other lanes' or unknown pre-existing files: leave it; note it
in the close line.

### Step 2 — Rewrite `NEXT[grok]` only

Open `SESSION_CONTEXT.md`. Replace **only** the single line that starts with
`**NEXT[grok]:**`. Keep it one line. Aim ≤ 350 characters (cost to every
terminal at every boot; not a hard gate).

**Shape:**

```text
**NEXT[grok]:** <what landed — sha / artifact / plan task> | <next move or idle + pointer>
```

Good content:

- Landed work with discovery pointers (commit sha, plan path, script path)
- Open next move, or explicit `idle — await assignment`
- Stale finished work **removed** (never leave "do Task 3" when Task 3 shipped)

**Forbidden in this step:**

- Edit `**PIN:**`
- Edit any other `**NEXT[<lane>]:**` line
- Add headers, sections, tables, or multi-line prose to the file
- Set `CLAUDE_CTL=1`
- Run Claude skills (`/session-end` Claude path, boot, publish, deploy)

Detail lives in ROLLOUT / plan changelogs / commit bodies. NEXT is the entry
point into them, not the warehouse.

### Step 3 — Commit the handoff alone

```bash
git add SESSION_CONTEXT.md
git commit -m "$(cat <<'EOF'
grok: NEXT[grok] — <short handoff summary>
EOF
)"
```

**Success signal** from pre-commit:

```text
external-lane handoff — NEXT[grok] only, control-plane gate waived
```

**If the commit is blocked:** you staged more than your own NEXT line (PIN,
another lane, or another protected path). Unstage the rest and retry. Never
bypass with `--no-verify` or `CLAUDE_CTL=1`.

The handoff commit must contain **only** `SESSION_CONTEXT.md` with your line
changed.

### Step 4 — Stack and push

```bash
git log origin/main..HEAD --oneline
```

- If the stack is only your landable commits **and** push is authorized for
  that work under `AGENTS.md`, push.
- If other lanes' commits are stacked: **report and do not push them along.**
  Keep committing; a Claude terminal lands mixed stacks.
- If only your NEXT commit is local and you cannot push: report "committed
  locally; push pending."

### Step 5 — Close line to the builder

One line. Mechanism, not goodbye. Examples:

- `Session-end clean. NEXT[grok] committed (<sha>). Tree clean. Stack: N ahead (held).`
- `Session-end clean. Work + NEXT committed. Pushed.`
- `Session-end clean. NEXT updated. N dirty files left untouched: <paths>.`

## Failure modes

| Case | Action |
|------|--------|
| NEXT still points at finished work | Rewrite now — stale handoff is the failure mode this skill exists to prevent |
| Uncommitted authorized work | Step 1 first, then Step 2–3 |
| Unrelated dirty files | Leave them; mention in close line |
| Pre-commit control-plane block | Unstage non-NEXT paths; do not set `CLAUDE_CTL=1` |
| Builder asks for PIN / ROLLOUT sweep / mechanical end | Refuse — Claude terminal owns those |
| Builder asks to fix another lane's NEXT | Refuse — raise with Mike; ownership rule binds |

## Antigravity / propose-only note

If this skill is ever invoked from a propose-only lane: still rewrite and commit
**only** that lane's NEXT line (bookkeeping). Leave work as proposed diffs, not
commits.
