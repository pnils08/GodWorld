---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from the current workspace, or before executing an implementation plan — ensures an isolated workspace exists via native tools or a git worktree fallback.
---

# Using Git Worktrees

## Overview

Ensure work happens in an isolated workspace. Prefer the harness's native worktree
tools. Fall back to manual git worktrees only when no native tool is available.

**Core principle:** Detect existing isolation first. Then use native tools. Then fall
back to git. Never fight the harness.

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

## GodWorld caveat — read before reaching for this

A worktree isolates **the repo**. It does not isolate the **Google Sheets substrate**
all four terminals write to, and it does not isolate `output/`, `.claude/state/`, or
the Supermemory containers. The four-terminal collision problem is a *stacked-commit*
problem (see MEMORY.md "Never git push across a terminal with stacked commits") — a
worktree helps with that and with nothing downstream of it.

So: worktrees are for a **single long build that would otherwise sit dirty on main
across sessions**. They are not a fix for terminal cross-talk. If the work writes to
sheets, two isolated worktrees still race on the same rows.

## Step 0: Detect Existing Isolation

**Before creating anything, check whether you are already in an isolated workspace.**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Submodule guard:** `GIT_DIR != GIT_COMMON` is also true inside a git submodule.
Before concluding "already in a worktree," verify you are not in one:

```bash
# If this returns a path, you're in a submodule, not a worktree — treat as a normal repo
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**If `GIT_DIR != GIT_COMMON` (and not a submodule):** you are already in a linked
worktree. Skip to Step 2. Do NOT create another one.

Report with branch state:
- On a branch: "Already in isolated workspace at `<path>` on branch `<name>`."
- Detached HEAD: "Already in isolated workspace at `<path>` (detached HEAD, externally managed). Branch creation needed at finish time."

**If `GIT_DIR == GIT_COMMON` (or in a submodule):** you are in a normal repo checkout.

Has Mike already stated a worktree preference? If not, ask before creating one:

> "Would you like me to set up an isolated worktree? It protects the current branch from changes."

Honor a declared preference without asking. If he declines, work in place and skip to Step 2.

## Step 1: Create Isolated Workspace

Two mechanisms, in this order.

### 1a. Native worktree tools (preferred)

This harness ships `EnterWorktree` / `ExitWorktree` (deferred — load via ToolSearch),
and the `Agent` tool takes `isolation: "worktree"`. Use those. Native tools own
directory placement, branch creation, and cleanup; `git worktree add` on top of them
creates phantom state the harness cannot see or clean up.

Only proceed to 1b if no native tool is available.

### 1b. Git worktree fallback

**Only if 1a does not apply.**

#### Directory selection

1. An explicitly stated directory preference wins.
2. Otherwise check for an existing project-local worktree dir:
   ```bash
   ls -d .worktrees 2>/dev/null     # preferred (hidden)
   ls -d worktrees 2>/dev/null      # alternative
   ```
   If both exist, `.worktrees` wins.
3. Otherwise default to `.worktrees/` at the project root.

#### Safety verification (project-local directories only)

**MUST verify the directory is ignored before creating the worktree:**

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**If NOT ignored:** add it to `.gitignore`, commit that, then proceed. An unignored
worktree directory commits the entire tree into the repo.

#### Create it

```bash
path="$LOCATION/$BRANCH_NAME"
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**Sandbox fallback:** if `git worktree add` fails with a permission error, say the
sandbox blocked it and that you're working in the current directory instead, then run
setup and baseline tests in place.

## Step 2: Project Setup

GodWorld is Node. Install only if the worktree lacks `node_modules`:

```bash
[ -f package.json ] && [ ! -d node_modules ] && npm install
```

## Step 3: Verify Clean Baseline

```bash
npm test
```

**If tests fail:** report the failures and ask whether to proceed or investigate —
a dirty baseline makes every later failure ambiguous.

**If tests pass:** report ready.

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Step 4: Finishing

A worktree is not free — it holds a checkout and a branch. When the build lands,
merge or delete it. Native tool: `ExitWorktree`. Fallback: `git worktree remove <path>`.
Never leave a worktree parked across sessions with uncommitted work in it; the next
boot will not know it exists.

## Quick Reference

| Situation | Action |
|-----------|--------|
| Already in a linked worktree | Skip creation (Step 0) |
| In a submodule | Treat as a normal repo (Step 0 guard) |
| Native worktree tool available | Use it (Step 1a) |
| No native tool | Git worktree fallback (Step 1b) |
| `.worktrees/` exists | Use it (verify ignored) |
| Both dirs exist | Use `.worktrees/` |
| Neither exists | Default `.worktrees/` |
| Directory not ignored | Add to `.gitignore` + commit |
| Permission error on create | Sandbox fallback, work in place |
| Tests fail during baseline | Report failures + ask |
| Work writes to Google Sheets | Worktree does NOT isolate it — coordinate instead |

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "I'm obviously not in a worktree — no need to check" | Run Step 0. Harness-created isolation and submodules both fool eyeballing. |
| "`git worktree add` is quicker than hunting for the native tool" | `EnterWorktree` owns placement, branching, and cleanup. Bypassing it is the #1 mistake — phantom state the harness can't manage. |
| "The worktree directory is surely ignored already" | Run `git check-ignore`. |
| "A worktree will fix the terminal collisions" | It isolates the repo, not the sheets. See the GodWorld caveat above. |
| "The workspace is fresh — baseline tests can wait" | A dirty baseline makes every later failure ambiguous. |

---

Provenance: adapted from the MIT-licensed `superpowers` plugin skill of the same name
(claude-plugins-official, v6.2.0), taken local at S340 when that plugin was disabled —
it was the only one of its fourteen skills not already covered by GodWorld's own
`/diagnose`, `/self-debug`, ROLLOUT_PLAN, and `pr-review-toolkit`. Related:
[docs/engine/ROLLOUT_PLAN.md](../../../docs/engine/ROLLOUT_PLAN.md) for what a long
build is tracked against.
