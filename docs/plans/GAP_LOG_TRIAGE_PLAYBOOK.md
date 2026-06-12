---
title: Gap-Log Triage Playbook
created: 2026-05-29
updated: 2026-05-29
type: reference
tags: [architecture, process, governance, active]
sources:
  - docs/plans/2026-05-22-c94-gap-log-triage.md (C94 worked example — analysis method)
  - docs/archive/plans/2026-05-29-c95-gap-log-triage.md (C95 worked example — two-track phased model)
  - docs/plans/GAP_LOG_TEMPLATE.md (sibling — how to write ONE gap log)
  - docs/plans/TEMPLATE.md (sibling — the plan shape this method outputs)
  - S243 Mike directive — "phase out the work on a logical plan … work completed per plan.md and summarized to rollout … 2 terminals carry out the work, research-build and engine-sheet … keep 2 instances more aligned with the work of their expertise"
pointers:
  - "[[GAP_LOG_TEMPLATE]] — how to write one gap log (input to this method)"
  - "[[TEMPLATE]] — the plan shape this method produces"
  - "[[archive/plans/2026-05-29-c95-gap-log-triage]] — canonical worked example"
  - "[[../engine/ROLLOUT_PLAN]] — where the single pointer row lands"
  - "[[../adr/0005-rollout-plan-structure]] — pointer-not-notes rollout discipline"
  - "[[../index]] — register here"
---

# Gap-Log Triage Playbook

**What this is:** the reusable method for turning a cycle's worth of scattered production gap logs into one phased, two-track remediation plan that two terminals execute. Run it after every full production cycle once the gap logs are filed. It is the **project-level** method; [[GAP_LOG_TEMPLATE]] is the **single-log** shape that feeds it.

**Who runs it:** research-build (apparatus steward). Research-build owns the triage, the plan, the single ROLLOUT row, and the session-end summarization cadence.

**Why it exists:** gap logs are the evaluation pass of the gen-eval architecture (ADR-0004) — each heavy skill run files a sidecar capturing friction the skill couldn't catch while running. Left alone they accumulate and compound (the G-W16 "N-cycle silence" meta-pattern: HIGHs sit on the shelf and resurface together). Triage converts that backlog into executable work routed to the terminal whose expertise owns each fix.

**The shape this produces:** ONE plan.md in the [[TEMPLATE]] shape, phased BY TERMINAL (research-build track + engine-sheet track), with ONE pointer row in ROLLOUT. Detail and per-phase tracking live in the plan; ROLLOUT carries a pointer + state and gets a one-line summary as each phase closes. This is the deliberate departure from the C94 artifact (an inventory doc that spawned 14 ROLLOUT rows) — that shape moved bloat into ROLLOUT instead of removing it.

---

## The method (8 steps)

### 1. Find every gap log

```bash
find output/ -iname "*production_log*_c<XX>_gaps.md" | sort
```

**C96+ canonical: one gap log per cycle (RB-1/RB-2).** `output/production_log_run_cycle_c<XX>_gaps.md` holds every heavy skill's gaps as `## LEG: /<skill> (G-<prefix>)` sections — engine audit (`G-EC`), city-hall-prep (`G-PREP`), city-hall (`G-R`), sift (`G-S`), write-edition (`G-W`), etc. Read the legs, not separate files. The glob above still works: for C96+ it returns the single `run_cycle` file; for legacy cycles (≤C95) it also returns the old per-skill split files (`production_log_edition_c<XX>_sift_gaps.md`, `production_log_city_hall_c<XX>_gaps.md`, …) — read those as-is, they're not renamed. Also check the unified prose log `production_log_c<XX>.md` (separate from the gap log). Gap logs are gitignored — they live only on disk.

### 2. Read all of them directly — don't fan out

You are the synthesizer; clustering judgment must live in one head. The logs total ~40-50K tokens — read them yourself. **Do not dispatch parallel subagents** to extract them: it splinters the clustering judgment AND risks the S231 G-S2 session-limit kill (heavy parallel dispatch under quota pressure returns `<total_tokens>0</total_tokens>` ghost-completions). Read in batches; extract per log as you go — gap ID, severity, one-line, candidate terminal.

### 3. Cluster by root cause, not by source skill

The leverage is in root-cause clusters that cut across skills. Examples from real runs: a single S235 parser commit broke print + post-publish + djDirect (one fix closes all); standing-canon-rules-never-reach-generators showed up in write-edition + letters + EIC + sift + reviewers (one canon file + cascade closes all). Build a §Cluster Map table: `theme | severity | constituent gaps | track | folded rows`. Severity = highest constituent. A theme is real when one architectural change closes multiple gaps.

### 4. Route each theme to the terminal whose expertise owns the fix

Two terminals carry out the work (Mike's S243 framing — keeps each instance aligned to its expertise that session):

- **research-build (apparatus)** — skill text (`.claude/skills/**/SKILL.md`), agent RULES (`.claude/agents/**`), docs, rubrics, canon files (`docs/canon/`), boot architecture (hooks, identity, MEMORY, CLAUDE.md).
- **engine-sheet (substrate)** — engine code (`phase*/`), scripts (`scripts/`), parsers/validators (`lib/`), the auditor, sheet schema/writes.

Note: media + civic *run* the heavy skills, but the skill *files* are apparatus = research-build edits them. So most "media gap" and "civic gap" fixes route to research-build (skill text) or engine-sheet (the script the skill calls) — not to media/civic. That's why two tracks cover nearly everything. Where a gap genuinely needs a *running* media/civic context (rare), make it a verification step or an explicit handoff note — surface the few that don't fit rather than forcing everything into two buckets.

Themes that split across both terminals get a task in EACH track, cross-linked, with the dependency direction stated (§Cross-Track Dependencies in the plan).

### 5. Fold correlated open ROLLOUT rows — forward task only, never backward history

Grep ROLLOUT for the cycle tag and for theme keywords; some gaps may already be filed (e.g., engine-sheet often pre-files its own `engine.*` row from its gap logs under senior-engineer cadence — don't double-file). For each correlated open row:

- **Row has a sub-plan** (e.g. regulatory-friction, sift-v2, canon-3) → the phase POINTS at the sub-plan for detail; do not restate it.
- **Plain row** (no sub-plan) → the phase absorbs the forward task; note `Absorbs ROLLOUT: <code>` so the executing instance flips it to done-pending-archive when the phase closes.

**Never copy a row's inline execution history into the plan** — that's moving bloat, not removing it. The bloated ROLLOUT rows (walls of inline history) are exactly what this method's single-pointer-row output is reacting against.

### 6. Write the phases — one focused session each

Each phase = one terminal, one session's worth of work. Per [[TEMPLATE]]: exact file paths, concrete steps, a verify command, status checkbox. Plus two gap-log-specific lines per phase: `Source gaps:` (which gaps it closes) and `Absorbs ROLLOUT:` (which rows it supersedes). Order phases within a track by leverage (highest-severity / most-gaps-closed first). The plan is the load-out — a fresh instance reads its track's phases and executes without reconstructing history (subagent-safety rule: cite paths, not recall).

### 7. File ONE ROLLOUT row + register the plan

One new row in the most-fitting group (cross-cutting remediation → `governance.*`), pointer-only, state `in-progress`, pointing at the plan. Register the plan in `docs/index.md` same commit (S147 inbound-link rule). The triage project is the row; the cluster work is the plan's phases — not 14 rows.

### 8. Summarize to ROLLOUT as phases close — don't expand it

As each phase ships, the executing instance adds a one-line summary to the single row (`RB-2 closed S<N> commit <hash>`) and flips any absorbed rows to done-pending-archive. Full detail (what shipped, what was learned, empirical corrections) lands in the plan's phase Status + Changelog, not in ROLLOUT. This keeps ROLLOUT a legible index even as a large remediation runs across many sessions.

---

## Anti-patterns (learned the hard way)

- **Producing a C94-style inventory artifact + a row per cluster.** That's the analysis method's *output* mistake — it sprawls ROLLOUT. Keep the C94 *thinking* (read → cluster → route); drop the C94 *artifact*.
- **Fanning out the reading to subagents.** Splinters clustering judgment; risks S231 quota-kill ghost-completions.
- **Copying folded rows' history into the plan.** Fold the forward task by reference; leave history where it is.
- **Filing-instead-of-fixing.** This method's deliverable is the PLAN, not the fixes — but don't let the plan become a place to re-file gaps that a phase could close in the same session it executes (S215 filing-isn't-fixing). The plan is the load-out; the phases are the work.
- **Forcing every gap into two buckets.** Most fit RB or ES. The few that don't (upstream data hygiene, Mike-owned sports proofread, harness-config `.mcp.json` prunes, genuine Mike-decisions) go in §Already-Addressed / §Out-of-Scope / §Open questions — surfaced, not jammed.
- **Asking Mike to pick a technical convention mid-plan.** If a decision (e.g. a path convention) blocks only a sub-task, make it a Mike-gated open question and keep building the rest.

---

## Changelog

- 2026-05-29 — Initial draft (S243, research-build). Generalized from two worked examples: [[2026-05-22-c94-gap-log-triage]] (analysis method) + [[archive/plans/2026-05-29-c95-gap-log-triage]] (two-track phased model + single-row discipline). Written per Mike's S243 directive to capture the gap-log-work logic for reuse.
