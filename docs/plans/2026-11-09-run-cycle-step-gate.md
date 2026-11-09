---
title: Run-Cycle Step Gate Plan
created: 2026-11-09
updated: 2026-11-09
type: plan
tags: [governance, run-cycle, hooks, active]
sources:
  - .claude/skills/run-cycle/SKILL.md — each step's gate, now enforced
  - output/production_log_run_cycle_c115_gaps.md — C115: Step 5.6 ran before 5.5 and 5.58 (codex run, 2026-11-09)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — governance.59"
---

# Run-Cycle Step Gate Plan

**Builder's words (2026-11-09):** "Hook every step of the run-cycle skill to where you can't advance until the step right before is completed"

**Goal:** no session — Claude or codex — can run a /run-cycle step before every step ahead of it has passed the skill's own gate for that step.

**Rows:** governance.59 · **Owner:** engine-sheet

## Design

| Piece | What it does |
|---|---|
| `scripts/runCycle.js` | The step runner. `step <id> <XX>` refuses unless every earlier step passed; runs the step's script(s); checks the gate written in SKILL.md; records `output/run-cycle/c<XX>.json`. `status <XX>` prints the chain and the next command. |
| `scripts/runCycleGuard.js` | PreToolUse hook. Blocks `node … scripts/<step>.js` (or a require of it) while that cycle's chain is not closed, or — with no cycle in the command — while any chain is open. Exit 2 + reason on stderr. |
| `.claude/settings.json` | Guard on Claude Code's Bash tool. |
| `~/.codex/hooks.json` | Guard on every codex tool (codex passes shell commands inside code-mode JS, so the guard scans the whole input). Codex runs a new hook only after the builder trusts it. |
| SKILL.md v1.2 | Enforced-order section; each step's command is the runner; Steps 3.5 and 5.6 now block (were non-blocking). |

Order: `1 → 2 → 2.5 → 3 → 3.5 → 4 → 4.1 → 5 → 5.56 → 5.5 → 5.55 → 5.58 → 5.6 → 5.7 → 5.8 → 5.85 → 6 → 6.1`. 5.56 sits right behind 5 because the civic chain's tick waits on the beat dump (skill §What Happens After, G-EC44). Cycles before C116 carry no record and are never blocked.

Steps with no script: 3 confirms the builder's fire on the live sheet; 4.1 checks the engine review file is newer than the audit; 6.1 checks the `[judgment]` entries, the HIGH pointer, and `docLoopStatus --due` = 0 reads at C<XX>.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Runner + guard + tests (`scripts/runCycle.test.js`, 36 checks) | es | done |
| 2 | Live checks: steps 1, 2.5, 3 for C116 against the live sheet; 4.1 and 6.1 against the C115 files (scratch record) | es | done |
| 3 | Wire the Claude hook; confirm it blocks in-session | es | done |
| 4 | Wire the codex hook; builder trusts it in codex; confirm a blocked call | es + builder | wired, trust pending |
| 5 | First real chain: C116 runs start to finish through the runner | es | not started |

## Acceptance

1. A step run out of order is refused by the runner (exit 2) and a step script run by hand during an open chain is blocked by the hook — proven by `runCycle.test.js` and the in-session block 2026-11-09.
2. The C116 chain closes through the runner with every step recorded — proven at C116 by `node scripts/runCycle.js status 116`.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| advisor | in-session | 2026-11-09 | design read before the build |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | One chain table, reused by the runner and the hook | es · advisor | `scripts/runCycle.js` STEPS |
| A2 | Scan the whole tool input for codex, not one field | es · advisor | codex code-mode transcript 2026-11-09 |
| A3 | SKILL.md changes in the same commit; tell the builder which steps now block | es · advisor | SKILL.md §Enforced order |

### Needs proof

| # | Claim | Proof that settles it |
|---|---|---|
| N1 | codex's PreToolUse reaches commands run from code-mode `tools.exec_command` | a blocked codex call after the builder trusts the hook |

### New concepts

| # | Idea | Status |
|---|---|---|
| C1 | Advisor's per-script receipts (civisJournal outcome file, drafter receipt, ingest script) | held — the runner records outcomes centrally, so the step scripts other pipelines run stay untouched |

## Changelog

- 2026-11-09 — Plan written and built on the builder's order the night codex ran C115 out of order. Runner, guard, tests, Claude hook live; codex hook wired, awaiting trust.
