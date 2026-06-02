---
title: Rollout Rules — operating doctrine for the doc-work pipeline
created: 2026-06-01
updated: 2026-06-01
type: reference
tags: [architecture, governance, active]
sources:
  - S251 research-build conversation (Mike) — four-role pipeline + gap-log-is-research keystone + clean-tracker discipline
  - docs/engine/ROLLOUT_PLAN.md — operating-rule sections evicted here (Task 1, governance.30)
  - docs/adr/0005-rollout-plan-structure.md — rationale + alternatives (this doc carries the rules; ADR carries the why)
pointers:
  - "[[ROLLOUT_PLAN]] — the tracker these rules govern"
  - "[[ROLLOUT_ARCHIVE]] — cold storage; sweep destination"
  - "[[../adr/0005-rollout-plan-structure]] — full rationale + alternatives considered"
  - "[[../plans/TEMPLATE]] — plan-file shape"
  - "[[../plans/2026-06-01-rollout-v2-migration]] — governance.30, the migration that stands up v2 under these rules"
  - "scripts/rolloutSweep.js + scripts/docLoopStatus.js — the maintenance layer"
---

# Rollout Rules — operating doctrine for the doc-work pipeline

**Every terminal follows this.** research-build, engine-sheet, civic, media — one doctrine, no per-terminal drift. Your terminal MD points you here; this is the contract for how project work is logged, tracked, and retired across all of `docs/`.

**This doc carries the rules; [[../adr/0005-rollout-plan-structure]] carries the rationale.** Don't duplicate the "why" here — when you need to know why the structure is what it is, read the ADR. When you need to know what to do, read this.

---

## 1. The four roles

The doc-work pipeline has four layers. Each carries one thing. Keep them separate — mixing them is the drift this doctrine exists to stop.

| Layer | Role | Carries | Never carries |
|-------|------|---------|---------------|
| **Research** | Thought process | Findings, evaluations, options, issues-found-during-runs. For **skill terminals (civic/media)**, the per-cycle **production gap log** IS the research layer. | Tracking state — research has a *verdict*, not a rollout state. |
| **Plan** | The base / deploy spec | The actual work. Tasks, acceptance criteria, decisions. **When a plan changes, the change is logged in the plan itself** (its changelog / redlines). | Cross-project tracking — that's rollout's job via a pointer. |
| **Rollout** | The clean project tracker | Pointer rows (one actionable line each) + state + terminal + plan-pointer, plus a changelog. **Nothing else.** | Prose, history, how-to, research notes, raw issues. It points; it does not carry. |
| **Archive** | Completed plans + swept rows | Closed work, full detail, frozen for trail. Code-maintained. | Open work. |

**The flow:** research → plan → rollout (tracks) → archive (when done). Research is upstream thinking; the plan is the spec that ships; rollout is the index pointing at in-flight plans; archive is where finished rows and completed plans rest.

---

## 2. Where work is logged — filing (and the gap-log keystone)

This is the section that keeps rollout clean. Read it before you log anything.

### Templates & save paths

Every layer has a template and a fixed home. Copy the template; save to the path; archive where the table says.

| Layer | Template | Saves to | Archives to |
|-------|----------|----------|-------------|
| **Research** | [[../research/TEMPLATE]] | `docs/research/YYYY-MM-DD-<topic>.md` | **never** — standing library, accretes applications |
| **Plan** | [[../plans/TEMPLATE]] | `docs/plans/YYYY-MM-DD-<topic>.md` | `docs/archive/plans/` when fully shipped (repoint inbound links — §6) |
| **Triage** (gap log → rollout) | [[../plans/GAP_TRIAGE_TEMPLATE]] (shape) + [[../plans/GAP_LOG_TRIAGE_PLAYBOOK]] (method) | `docs/plans/YYYY-MM-DD-c<XX>-gap-log-triage.md` | `docs/archive/plans/` once its row is filed |
| **Production gap log** (civic/media) | [[../plans/GAP_LOG_TEMPLATE]] + [[../media/production_log_template]] | `output/production_log_<skill>_c<XX>_gaps.md` (+ unified `output/production_log_c<XX>.md`) | stays in `output/` — cycle artifact, not archived |
| **Rollout** (tracker) | this doctrine | `docs/engine/ROLLOUT_PLAN.md` | rows → [[ROLLOUT_ARCHIVE]] via `scripts/rolloutSweep.js` |

**Triage is the bridge.** It's the research-build pass that turns a cycle's gap logs into tracked work: read the gap logs → cluster by root cause → route to two terminal tracks (research-build / engine-sheet) → file **one** ROLLOUT pointer row. It sits between *research* (gap logs) and *rollout*. Generators (civic/media) never triage — they produce gap logs; research-build triages. Method: [[../plans/GAP_LOG_TRIAGE_PLAYBOOK]] (8 steps); shape: [[../plans/GAP_TRIAGE_TEMPLATE]]. The output is one plan + one row — **not** a per-gap inventory that sprawls ROLLOUT (the playbook's named anti-pattern).

### Filing rules

- **Research notes → research files.** Evaluations, paper-mining, what's-true / what-are-the-options → `docs/research/YYYY-MM-DD-<topic>.md` (per [[../research/TEMPLATE]]). A research file carries a verdict (`adopt` / `watch` / `take-nothing`), not a rollout state.

- **Skill-terminal issues during a run → the production gap log. NOT rollout.** Civic and media keep a per-cycle `output/production_log_..._gaps.md`. That gap log is their research layer — it is where issues, friction, and observations get logged during a skill run. **Do not blind-log issues onto rollout.** Rollout is the shared map every terminal reads at boot; raw issues there tax everyone. The gap log is local and cheap; that's where it goes.
  - An issue only reaches rollout when it is **promoted** to tracked, actionable work — and the promoted row is a clean one-liner that *points at the gap log*, it does not reproduce the issue text.

- **Plan changes → the plan itself.** If a plan's tasks, scope, or decisions change, the change is recorded in that plan's changelog / shown as a redline in the plan. Not on rollout. Rollout's row just keeps pointing at the (now-updated) plan.

- **Rollout → clean pointer rows only.** See §3.

---

## 3. Rollout discipline — the clean tracker

Rollout is the index, not the encyclopedia. (S147 rule, ADR-0005 enforcement.)

**Row schema:** one row = `id · one-line actionable next-action · state · terminal · → plan-pointer`. If it can't be one actionable line, it's a plan, not a row. Description content lives in the pointer doc, never in the row.

### State labels (S204 — adapted from Pocock's `triage` skill, MIT)

Every active rollout item carries one state tag inline.

| State | Meaning |
|-------|---------|
| `ready` | Clear acceptance, picker can grab it now. |
| `needs-info` | Gated on Mike's decision, another terminal's output, or external signal. |
| `in-progress` | Active work claimed; partial-shipped or being chipped at. |
| `blocked` | Depends on something not yet landed (preconditions named in the entry). |
| `done-pending-archive` | Completed, awaiting move to ROLLOUT_ARCHIVE at next sweep. |
| `wontfix` | Decided not to do. Rare; document the reason. |

State answers "is this pickable right now"; terminal answers "by whom." They are orthogonal.

### Grouping

**Current:** rows group by **type-of-work** (semantic groups — `pipeline` / `engine` / `canon` / `civic` / `infrastructure` / `research` / `governance`), each coded `<group>.<n>`. Numbers within a group are identifiers, not sequential; deletions don't renumber; cross-cutting work picks the **primary group** (don't multi-tag).

| Group | Scope |
|-------|-------|
| **pipeline** | Edition production end-to-end (sift / write-edition / post-publish / dispatch / interview / supplemental / print / photos) |
| **engine** | Engine code, ledger, schema, tech debt, engine-sheet repair |
| **canon** | World-fidelity layer, citizens, voices, real-name blocklists, contamination scrub |
| **civic** | City-hall, voice agents, council canon, civic-process gap-logs, governance simulation |
| **infrastructure** | Supermemory, Discord, dashboard, MCP, claude-mem, services, ingest pipelines |
| **research** | Papers, external tools, evaluations, watch-list items |
| **governance** | Skills, MDs, ADRs, MEMORY rules, doc-audit, project-internal hygiene |

**Migrating:** governance.30 (ROLLOUT v2.0) flips grouping to **by-terminal, actionable-first within** — so a terminal at boot reads "what's mine?" directly. When v2 lands, this section updates. Until then, the live tracker is by-type. Full taxonomy + alternatives: [[../adr/0005-rollout-plan-structure]]. Migration: [[../plans/2026-06-01-rollout-v2-migration]].

---

## 4. How to add work

1. Identify the primary group (§3).
2. Pick the next available number in that group.
3. Title ≤80 chars — clearly identifies the work.
4. Set state (§3) — typically `ready`, or `needs-info` if gated.
5. Set terminal — **builder terminals only**: `engine-sheet` (code / sheets / scripts) or `research-build` (skill / RULES / docs / ADRs / triage). Slash-separated for cross-builder work. **Never `media` or `civic`** — those are generator spaces (run skills, keep gap logs, produce artifacts; they don't carry routed rows). See ADR-0005 §Part 3.
6. **Identify or create the pointer doc:**
   - **Designed work** → copy [[../plans/TEMPLATE]] to `docs/plans/YYYY-MM-DD-<topic>.md`; register in [[../index]] same commit (S147 inbound-link rule).
   - **In-flight observations** → existing gap log (`output/production_log_..._gaps.md`).
   - **Evaluations** → `docs/research/YYYY-MM-DD-<topic>.md` (per [[../research/TEMPLATE]]).
   - **Architectural decisions** → next ADR (follow ADR-0001 / 0004 / 0005 shape).
   - **Engine work** → existing parent spec ([[PHASE_42_PATTERNS]], [[ENGINE_REPAIR]] row).
7. Add the row to the appropriate group table in §Open Work.

**Description content lives in the pointer doc, NOT the ROLLOUT row.**

---

## 5. How to close work

1. Update the row's state to `done-pending-archive`.
2. Add a brief note in the row's pointer doc: what shipped, commit hash, session.
3. At session-end, sweep all `done-pending-archive` rows to [[ROLLOUT_ARCHIVE]] (see §6).

Research-build owns the sweep per terminal stewardship. Engine-sheet sweep applies to `engine.*` rows it owns; civic to `civic.*`; media to `pipeline.*`.

---

## 6. Archiving + the sweep code

Closing detail goes to cold storage; the tracker stays lean. **Archive doesn't mean delete — it means frozen, kept for trail.**

- **`scripts/rolloutSweep.js`** — the mutating sweep. Moves `done-pending-archive` rows from ROLLOUT_PLAN Open Work → ROLLOUT_ARCHIVE verbatim (table-row → archive-bullet). **Dry-run by default; `--apply` to execute.** Prints line-count deltas. Run at session-end.
- **`scripts/docLoopStatus.js`** — the read-only detector / validator. Surfaces `done-pending-archive` rows pending sweep and (v2) `--foreign` non-conforming rows. Run before sweeping to see what's pending.
- **Completed plans → `docs/archive/plans/`.** When a plan has fully shipped (its rollout row swept to ROLLOUT_ARCHIVE), move the plan MD `docs/plans/<file>.md` → `docs/archive/plans/<file>.md` and **repoint its inbound links** (the ROLLOUT_ARCHIVE bullet + the [[index]] entry → archive path). This is part of closing, not a later step — it keeps `docs/plans/` showing only live work. (Research never archives — standing library; gap logs stay in `output/`; only plans + triage docs move.)
- **Cadence:** sweep rows every session-end; move shipped plans on close. Don't let `done-pending-archive` rows or finished plans pile up in the live tracker / `docs/plans/` — that's the noise this doctrine removes.

---

## Changelog

- 2026-06-01 (S251) — Created. Task 1 of the ROLLOUT v2.0 migration (governance.30). The operating-rule sections (state labels, group taxonomy, how-to-add, how-to-close) evicted from ROLLOUT_PLAN.md and folded into the four-role doctrine Mike set across the S251 conversation: research (incl. skill-terminal gap logs) / plan (self-documenting via redlines) / rollout (clean tracker) / archive (code-maintained). Keystone: skill terminals don't blind-log on rollout — the gap log is their research layer. ROLLOUT_PLAN keeps a pointer header to this file. §The Spine (completed historical roadmap) relocated to ROLLOUT_ARCHIVE rather than carried here — a rules doc shouldn't hold a finished roadmap.
- 2026-06-01 (S251, same session, Mike-directed) — §2 gained the **Templates & save paths** table — research / plan / **triage** / gap log / rollout, each with its template + save path + archive destination. Two conventions established: (1) **closed plans archive to `docs/archive/plans/`** with inbound-link repoint (§6) — ends the "plans never move / 69 piled in docs/plans/" drift; (2) **triage earns its own template** (`docs/plans/GAP_TRIAGE_TEMPLATE.md`, to build) — the recurring gap-log→rollout bridge pass was hand-built every cycle (C93/C94/C95) with no shape. Triage named as the research-build conversion step between research (gap logs) and rollout.
