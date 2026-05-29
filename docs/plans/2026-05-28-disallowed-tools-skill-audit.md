---
title: disallowed-tools Per-Skill Scope Audit (gov.22 T2 deliverable)
created: 2026-05-28
updated: 2026-05-28
type: plan
tags: [governance, infrastructure, tooling, skills, security, autonomy-gated]
sources:
  - "Claude Code Skills disallowed-tools field (v2.1.152) — code.claude.com/docs/en/skills, /en/permissions"
  - "S242 claude-code-guide verification of disallowed-tools granularity + tool names"
  - "S241 Explore-agent first-pass categorization (corrected here — invented tool names dropped)"
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (governance.22 T2 + the follow-up edit row)"
  - "[[2026-05-28-claude-code-2-1-149-153-feature-adoption]] — gov.22 plan; this is the T2 §Task 2 deliverable"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered same commit"
---

# disallowed-tools Per-Skill Scope Audit (gov.22 T2)

**Status: AUDIT DELIVERED — edit rollout AUTONOMY-GATED.** This doc is the gov.22 T2 deliverable: per-skill `disallowed-tools` proposals for all 48 project skills. **No skill files are edited by this task**, and the editing rollout is deliberately parked until the unattended/autonomous-execution transition (§Operating model). Applying the matrix then is gated on (a) Mike confirming the matrix and (b) a pilot proving the undocumented mechanics live (§Pilot).

## Why

Claude Code v2.1.152 added `disallowed-tools` skill frontmatter — it removes named tools from the model's pool while that skill is active. Of 48 project skills only 2 scope tools today (`save-to-mags`, `save-to-profile`). Scoping the rest means a reviewer skill structurally *cannot* Write/commit, a content skill *cannot* `rm`/`clasp push`, etc. — fewer wrong-tool routes, smaller tool surface per skill load.

## Operating model — this is mostly AUTONOMY PREP (Mike, S242)

The `disallowed-tools` feature's stated design intent is **autonomous skills** — the official docs example is "a skill that should never call `AskUserQuestion` in a background loop." Its payoff is structural tool-removal where **no human is in the loop to gate tool use**.

GodWorld currently operates **human-in-loop on deployed agents**: skills run interactively under the harness, the permission system already prompts on destructive ops, and Mike/Mags approve. So the urgent value of locking down 48 skills **today is low**. The real payoff lands when skills run **unattended / scheduled / autonomously** — the project's north-star direction (`docs/ARCHITECTURE_VISION.md`), not current operation.

**The precise trigger (Mike, S242):** it's not just "human in loop" — it's that **agents are fed, not foraging.** The orchestrator (a skill, run by Mags) greps/gathers context and hands each subagent a **pre-fenced packet** (Memory Fence pattern; 44 agent files instruct packet-consumption). The desk/voice agents are granted `Read/Glob/Grep/Write` in their `tools:` frontmatter but **do not grep their own context in practice** — they consume the provided brief and emit output. So the foraging tools sit unused; removing them changes ~nothing today. **Tool-scoping starts to bite the moment an agent shifts from consuming a provided packet to fetching its own context** (grepping/searching/reading arbitrary paths autonomously). That shift IS the autonomy transition, stated mechanically — and it's the condition that should re-activate this rollout.

**Disposition therefore:**
- **The matrix (this doc) is the durable artifact** — the "what may each skill touch" map is prerequisite knowledge for autonomy regardless of when edits land. Cheap to hold; it's done.
- **The editing rollout is AUTONOMY-GATED, not near-term picker work.** Trigger = **agents begin self-foraging context instead of consuming pre-fenced packets** (equivalently: unattended/scheduled execution where no orchestrator pre-packages the work). Applying it sooner adds friction + the untested-Q4/Q5 risk for ~zero current benefit (the tools being removed aren't used).
- **Note — the agent layer is already partially scoped:** desk/voice agents carry `tools:` frontmatter (Read/Glob/Grep/Write — no Bash/Edit/Agent). That existing mechanism, plus packet-discipline, is why current exposure is low. This audit's `disallowed-tools` covers the *skill* layer; both are moot until foraging begins.
- **Small current-era upside** (does not change the gating): a reviewer/auditor skill that structurally cannot Write/Edit can't repeat the documented "skill mutated something it shouldn't" failure class (S229 edited-the-approved-print, S230 destructive-recovery-proposals). Minor defensive value now; primary value is autonomy.

## Confirmed mechanics (claude-code-guide vs official docs, S242)

- **Pattern scoping IS supported:** `disallowed-tools: Bash(rm *) Bash(git push *) Edit Write`. Destructive Bash can be blocked while read-only `grep`/`find`/`node` stays available. Not all-or-nothing.
- **Canonical tool names:** `Bash Read Edit Write Grep Glob WebFetch WebSearch Agent Skill` + `mcp__<server>__*`. Subagent dispatch tool is **`Agent`** — there is no "Task" tool name. (The S241 first-pass strings "Bash-exec"/"TaskTool" were invented and would silently no-op — corrected throughout.)
- **Syntax:** space- or comma-separated string, or YAML list, in the SKILL.md frontmatter.
- **`allowed-tools` ≠ `disallowed-tools`:** allowed-tools only pre-approves (doesn't restrict); disallowed-tools removes from pool. Independent — both can coexist.
- **TWO behaviors the docs do NOT cover → must pilot, not assume:**
  - **Q4 (cascade):** whether a skill's `disallowed-tools` also restricts a subagent it dispatches via `Agent`. Undocumented. Working assumption: it does NOT cascade (the subagent keeps its own tool grant). If it DOES cascade, orchestrator skills must keep any tool their agents need.
  - **Q5 (run-X-while-disallowed):** what happens when a step says "run `node X`" but a Bash pattern is disallowed. Undocumented — error vs skip vs route-around. Pattern-scoping should keep `node`/`grep` callable while blocking `rm`/`git push`, but this must be confirmed empirically.

## Policy (drives every row)

Four buckets; the disallow string is a function of the bucket. Bash destructive guard (reused below) = `Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)`.

- **FULL — no disallow.** Orchestrators/operators that legitimately Write+Edit+Bash+Agent and run destructive ops as their job (deploy `clasp push`, session-end `git push`, disk-rotate `rm`).
- **LOADER — `Write Edit` + destructive guard.** Boot/context loaders: run `pm2` (keep Bash) and only Read; never Write/Edit.
- **WRITEOWN — `Edit` + destructive guard.** Dispatch agents and/or write output artifacts; keep Write (output), Bash (scripts), Agent (dispatch), Read. They don't Edit existing files and never need destructive Bash.
- **READONLY — `Write Edit` + destructive guard.** Reviewers/auditors that read + report; keep read-only Bash (`grep`/`find`/`node`)/Read/Grep/Glob. (`Agent` deliberately NOT disallowed here — low value, false-positive risk; revisit in pilot.)
  - **Pure-reason exception** (`grill-me`, `style-pass`): read + reason only, no scripts → disallow `Write Edit Bash Agent WebFetch WebSearch`.

`save-to-mags` / `save-to-profile` already carry `allowed-tools` (Supermemory/node CLI) — the WRITEOWN disallow composes with that (independent fields).

## The 48-skill matrix

Tools-used = signal scan of each SKILL.md body (W=Write E=Edit B=Bash T=Agent/dispatch N=Web M=MCP); informational — the pilot verifies actuals.

| # | Skill | Category | Tools-used (signal) | Proposed `disallowed-tools` |
|---|-------|----------|---------------------|------------------------------|
| 1 | adversarial-review | READONLY | W T | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 2 | boot | LOADER | B T | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 3 | build-world-summary | WRITEOWN | W E B | `Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 4 | business-desk | WRITEOWN | W B T | `Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 5 | capability-review | READONLY | W B T | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 6 | chicago-desk | WRITEOWN | W B T | `Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 7 | city-hall-prep | WRITEOWN | W B T M | `Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 8 | city-hall | FULL | W B T | `(none — legitimately needs Write/Edit/Bash/Agent)` |
| 9 | civic-desk | WRITEOWN | W B T | `Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 10 | context-budget | READONLY | B T | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 11 | ctx-map | READONLY | W B | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 12 | culture-desk | WRITEOWN | W B T | `Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 13 | cycle-review | READONLY | T | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 14 | deploy | FULL | B | `(none — legitimately needs Bash/clasp push)` |
| 15 | diagnose | FULL | W B T M | `(none — legitimately needs Write/Edit/Bash for fixes)` |
| 16 | disk-audit | READONLY | B M | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 17 | disk-rotate | FULL | W B | `(none — legitimately needs Bash(rm *) under --apply gate)` |
| 18 | dispatch | WRITEOWN | W E T M | `Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 19 | doc-audit | READONLY | W E B T | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 20 | edition-print | FULL | W E B T | `(none — print pipeline writes artifacts + runs scripts)` |
| 21 | engine-review | READONLY | W B | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 22 | grill-me | READONLY (pure-reason) | (minimal) | `Write Edit Bash Agent WebFetch WebSearch` |
| 23 | health | READONLY | W B | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 24 | interview | WRITEOWN | W B T M | `Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 25 | letters-desk | WRITEOWN | W B T | `Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 26 | md-audit | READONLY | B | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 27 | podcast-desk | WRITEOWN | W T | `Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 28 | podcast | WRITEOWN | W B T M | `Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 29 | post-publish | FULL | W E B T M | `(none — canonization writes sheets + Supermemory + scripts)` |
| 30 | pre-flight | READONLY | (minimal) | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 31 | pre-mortem | READONLY | W B | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 32 | run-cycle | FULL | W B T | `(none — orchestrates full engine cycle)` |
| 33 | save-to-bay-tribune | WRITEOWN | B T | `Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 34 | save-to-mags | WRITEOWN | W B (allowed-tools: Bash node/source) | `Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 35 | save-to-profile | WRITEOWN | W B (allowed-tools: Bash npx supermemory/source) | `Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 36 | self-debug | READONLY | W E B T N M | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 37 | session-end | FULL | W E B | `(none — writes journal/state + git commit/push)` |
| 38 | session-startup | LOADER | B T | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 39 | sift | WRITEOWN | W E B T M | `Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 40 | skill-audit | READONLY | W B T M | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 41 | skill-check | READONLY | W E | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 42 | sports-desk | WRITEOWN | W B T | `Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 43 | stub-engine | READONLY | W | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 44 | style-pass | READONLY (pure-reason) | (minimal) | `Write Edit Bash Agent WebFetch WebSearch` |
| 45 | tech-debt-audit | READONLY | W B | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 46 | visual-qa | READONLY | B | `Write Edit Bash(rm *) Bash(git push *) Bash(git commit *) Bash(clasp *)` |
| 47 | write-edition | FULL | W B T | `(none — launches reporters, compiles, publishes)` |
| 48 | write-supplemental | FULL | W B T M | `(none — orchestrates supplemental edition)` |

**Counts:** FULL 10 · LOADER 2 · WRITEOWN 16 · READONLY 20 (18 standard + 2 pure-reason) = 48.

### Skills to double-check during confirmation (signal vs category tension)

The signal scan flagged Write/Edit on a few READONLY skills — worth a human glance before the edit task, in case any legitimately writes a report file and should move to WRITEOWN:
- `doc-audit`, `skill-check`, `self-debug`, `ctx-map`, `stub-engine`, `engine-review`, `capability-review` — signals show W/E. If any writes its report to `output/` rather than returning it inline, it's WRITEOWN (keep Write), not READONLY. Verify per-skill in the pilot read.

## Pilot-first rollout (autonomy-gated; runs at the unattended-execution transition)

**Trigger:** the move to unattended/scheduled/autonomous skill execution — NOT a near-term picker. Until then this section is dormant prep. When triggered: because Q4 (cascade) + Q5 (run-X-while-disallowed) are undocumented, the edit task must NOT touch all 48 at once:
1. **Pilot 2–3 low-risk READONLY skills** — e.g. `context-budget`, `doc-audit`, `stub-engine`. Add their proposed `disallowed-tools`, `/reload-skills`, run each.
2. **Confirm:** (a) the skill still completes its job; (b) the disallowed tools are actually blocked; (c) a disallowed `Bash(rm *)` does NOT break an allowed `node`/`grep` step (resolves Q5); (d) if a desk skill is in a later batch, confirm a dispatched agent still has Write (resolves Q4).
3. **Roll the rest in batches** (READONLY → WRITEOWN → LOADER) only on a clean pilot.
4. **Leave all 10 FULL skills untouched.**

## Verification (this audit task)

- This doc registered in `docs/index.md`; back-linked from the gov.22 ROLLOUT row + the gov.22 plan §Task 2.
- Matrix covers all 48 skills; every proposed string uses only canonical tool names + valid `Bash()` patterns (no invented identifiers).
- `git status` shows only this doc + `docs/index.md` + `docs/engine/ROLLOUT_PLAN.md` changed — zero `.claude/skills/**/SKILL.md` touched.

## Changelog

- 2026-05-28 (S242, research-build) — Audit produced. Mike picked gov.22 T2 off the picker; plan-mode approved. Method: claude-code-guide verified the `disallowed-tools` contract (pattern scoping supported, `Agent` not "Task", Q4/Q5 undocumented), Explore agent first-pass bucketed all 48 (corrected here — invented tool names dropped, Agent-disallow deferred to pilot). Deliverable is this matrix + pilot-first rollout. No skill files edited.
- 2026-05-28 (S242, research-build) — **Reframed AUTONOMY-GATED per Mike:** "I think some of this is for autonomous agents where we operate more on deployed agents currently but these future is autonomy." Correct — the feature's design intent is unattended skills; GodWorld is human-in-loop today, so the edit rollout's payoff is the autonomy transition, not now. Matrix kept as durable prep; §Operating model added; pilot/rollout retagged autonomy-gated (trigger = unattended/scheduled skill execution). gov.22 T2 (the audit) closes here; the downstream edit work is filed gated, not as near-term picker.
- 2026-05-28 (S242, research-build) — **Trigger sharpened per Mike:** "rn you're mainly providing them with their work, they don't grep yet." Verified: desk/voice agents are granted Read/Glob/Grep/Write but 44 agent files instruct pre-fenced-packet consumption (Memory Fence) — they don't forage. So the foraging tools sit unused and removing them changes ~nothing now. The real gating trigger = agents shifting from consuming provided packets to self-fetching context. §Operating model updated with the foraging-trigger + a note that the agent `tools:` frontmatter already partially scopes that layer (this audit covers the skill layer).
