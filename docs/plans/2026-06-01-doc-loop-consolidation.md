---
title: Research/Plan/Rollout Doc-Loop Consolidation Plan
created: 2026-06-01
updated: 2026-06-01
type: plan
tags: [architecture, governance, active]
sources:
  - S250 design conversation (Mike + research-build) — research-artifact identity + verdict-not-state rule
  - docs/SCHEMA.md §3 (frontmatter), §7 (folder map), §12 (changelog)
  - docs/plans/TEMPLATE.md — sibling plan template; research template mirrors its discipline
  - docs/adr/0005-rollout-plan-structure.md — group taxonomy + filing protocol
  - docs/engine/ROLLOUT_PLAN.md §Convention — State labels (S204) + Watch List lane
  - docs/RESEARCH.md — the legacy learning log being frozen
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout; pending-state lives here, not in research files"
  - "[[SCHEMA]] — doc conventions the new template follows"
  - "[[plans/TEMPLATE]] — sibling artifact; research is the standing library, plan is the project"
  - "[[index]] — register every new file in the same commit"
---

# Research/Plan/Rollout Doc-Loop Consolidation Plan

**Goal:** Give deliberate research a uniform, grep-able, per-topic home (parallel to plan files), with a verdict that routes pending-state to ROLLOUT — so research is set *and* discoverable, and "days of ideas" stop becoming drifted MDs.

**Architecture:** A research file is a standing-library source-mining record — one external source in, "what's usable for the sim and where" out, grep-able forever. It carries a **verdict** (adopt / watch / take-nothing), never a state. The verdict routes pending-ness to ROLLOUT (the status board every terminal reads at boot): take-nothing → no row; adopt → a `ready` row; watch → the Watch List with a trigger. Plans ignite *from* research and point back via `Research basis:`; research lists `Ignited plans:` forward. The legacy `RESEARCH.md` (the S99–S248 learning log) freezes; new research goes to per-topic files in `docs/research/`. No Supermemory in the loop — the doc layer is authoritative, claude-mem is the free semantic layer.

**Terminal:** research-build (this terminal owns the doc graph + rollout structure; all tasks are doc/rule edits, no code, no engine).

**Pointers:**
- Prior work: docs/plans/TEMPLATE.md (the sibling shape this mirrors)
- Related rule: `.claude/rules/research-build.md` §Research synthesis discipline (gets the new boundary + verdict-not-state rule)
- Rollout home: `governance.*` group per ADR-0005
- Live demo source: github.com/chopratejas/headroom (the take-nothing tombstone, Task 2)

**Acceptance criteria:**
1. `docs/research/TEMPLATE.md` exists with the eight-section shape (incl. a distinct **Applications (living)** reuse-index, separate from the Changelog) + verdict enum + verdict-not-state rule + "research never archives" lifecycle note. A fresh session can copy it and produce a uniform research file without reconstructing context.
2. `docs/research/2026-06-01-headroom-context-compression.md` exists, written in the template, verdict `take-nothing`, capturing the canon-fidelity rationale. Proves the template on a real source.
3. `docs/RESEARCH.md` carries a frozen-legacy banner at the top routing new research to per-topic files; existing entries left in place (no migration sweep).
4. `.claude/rules/research-build.md` §Research synthesis discipline names: per-topic research files, the research/plan boundary, the verdict-not-state rule, and the never-archives lifecycle.
5. Registration complete with no isolated MDs: template in top-level index.md + TERMINAL.md + SCHEMA; headroom + future instances in the `docs/research/` sub-catalog; this plan in top-level index.md. All in the implementing commit.
6. A `governance.*` ROLLOUT row points to this plan; flips to `done-pending-archive` when tasks 1–5 land.

---

## Tasks

Each task is one file, self-contained.

### Task 1: Create the research-file template

- **Files:**
  - `docs/research/TEMPLATE.md` — create
- **Steps:**
  1. Copy the frontmatter + how-to shape from `docs/plans/TEMPLATE.md` (sibling discipline: self-contained, fresh-session-executable, cite-don't-recall).
  2. Body sections (the locked shape): **Source** (precise cite — path/URL/Drive-ID + Mike-shared tag) · **What this addresses** (the deliberate trigger — which sim corner) · **What it does** (the source's mechanism, source-terms) · **Extraction — what's usable** (findings stated as *principle → sim-area it serves*; this is the grep asset) · **Not applicable / hazard** (the measure-twice negative — stops re-litigation) · **Verdict** (`adopt` / `watch` / `take-nothing`) · **Ignited plans** (forward pointers) · **Applications (living)** (a reuse index — *where this research has actually been used*, appended over time as grep surfaces it for new corners; this is the at-a-glance retrieval payoff, distinct from edit-history) · **Changelog** (dated edit-history per SCHEMA §12 — NOT the reuse index).
  3. Embed two rules as prose in the how-to: (a) **verdict, never state** — "a research file carries a verdict; pending-ness is ROLLOUT's job. take-nothing → no rollout row; adopt → a `ready` row; watch → the Watch List with a trigger." (b) **research never archives** — "unlike a plan, a research file is a standing library; it stays grep-able forever and accretes applications. It does not move to ROLLOUT_ARCHIVE."
  4. Frontmatter + index-registration reminder per SCHEMA §10.
- **Verify:** file reads as a self-contained contract; the seven sections + verdict enum + two rules all present.
- **Status:** [ ] not started

### Task 2: Write the headroom research file (live demo + tombstone)

- **Files:**
  - `docs/research/2026-06-01-headroom-context-compression.md` — create
- **Steps:**
  1. Fill the template for `github.com/chopratejas/headroom` (Mike-shared S250).
  2. Extraction in sim-terms; **Verdict: take-nothing.**
  3. Rationale (Mike S250): the edition pipeline needs the *opposite* of lossy compression — full canon fidelity; terminal-side token burn already addressed by the governance.22 bootbloat work, so minimal need remains. Same canon-fidelity boundary as `GEMINI_OFFLOAD`.
  4. Ignited plans: none. The tombstone exists only to stop a future re-review.
- **Verify:** verdict `take-nothing`; no ROLLOUT row created (correct — nothing pending).
- **Status:** [ ] not started

### Task 3: Freeze RESEARCH.md

- **Files:**
  - `docs/RESEARCH.md` — modify (header only)
- **Steps (section triage — RESEARCH.md is NOT homogeneous, advisor-flagged):**
  1. Add a banner under the title: this file is the **frozen legacy learning log** (S99–S248 chronological findings + early-project AI-literacy research). New deliberate research → per-topic files in `docs/research/` using `TEMPLATE.md`. Existing sections are a frozen snapshot; migrate opportunistically, not in a sweep.
  2. **Retire the empty "Ready for Rollout" section** — it's currently empty (verified S250) and structurally it's a pending-state lane inside a research doc, the exact anti-pattern this effort kills. Replace its body with a one-line pointer: pending-state now lives in ROLLOUT per the verdict-not-state rule (S250); this lane retired. Strands nothing.
  3. Leave **Active Research Questions / Deep Research Files / Sources & Reading List / Findings Log** in place — framing, pointers, bibliography, history. None carry rollout state.
- **Verify:** banner present; "Ready for Rollout" body retired to a pointer; Findings Log entry count unchanged.
- **Status:** [ ] not started

### Task 4: Boundary + verdict-not-state rule into research-build.md

- **Files:**
  - `.claude/rules/research-build.md` — modify (§Research synthesis discipline)
- **Steps:**
  1. Add: research is filed as a per-topic file from `docs/research/TEMPLATE.md` (not appended to the frozen RESEARCH.md log).
  2. Add the research/plan boundary: research = "what's true / what are the options"; plan = "what we'll build / tasks." Plan cites `Research basis:`; research lists `Ignited plans:`. No content duplication — the plan carries the pointer + the one line we took, never the research bulk.
  3. Add the verdict-not-state rule + the never-archives lifecycle (one sentence each, pointing to the template for detail).
- **Verify:** rule reads cleanly; no contradiction with existing §Rollout discipline.
- **Status:** [ ] not started

### Task 5: Sub-index + registration + back-links + ROLLOUT entry

Boot-burn note (advisor): `docs/index.md` is a research-build boot read; "research never archives" means the corpus only grows. So **instances do NOT land in top-level index.md** — they register in a `docs/research/` sub-catalog. Top-level index.md gets the TEMPLATE (a reference doc) + a one-line pointer to the sub-catalog. This keeps the dominant token lever (boot burn) flat as research files accrue.

- **Files:**
  - `docs/research/index.md` — create (sub-catalog; headroom + future instances register here)
  - `docs/index.md` — modify (add `research/TEMPLATE` + one-line pointer to the sub-catalog + this plan under `docs/plans/`)
  - `.claude/terminals/research-build/TERMINAL.md` — modify (add `docs/research/TEMPLATE.md` to the Research table)
  - `docs/SCHEMA.md` — modify (§7 folder map: note `docs/research/` uses `TEMPLATE.md` + a sub-index — the parent-spec back-link for the template)
  - `docs/engine/ROLLOUT_PLAN.md` — modify (add `governance.*` row pointing to this plan)
- **Steps:**
  1. Create `docs/research/index.md` with a catalog header + the headroom row.
  2. Top-level index.md: register `research/TEMPLATE` + the sub-catalog pointer + this plan.
  3. TERMINAL.md Research table: add the template row (full inbound treatment — template is a reference doc; instances get the sub-index line only).
  4. SCHEMA §7: back-link the template from the folder map (parent spec).
  5. ROLLOUT_PLAN.md: add a `governance.N` row, `(research-build)`, pointing to `[[plans/2026-06-01-doc-loop-consolidation]]`; mark `done-pending-archive` once tasks 1–5 land.
- **Verify:** template appears in top-level index + TERMINAL.md + SCHEMA; headroom appears in the sub-catalog only; ROLLOUT row present.
- **Commit hygiene (advisor):** working tree has pre-existing modified `JOURNAL.md` / `JOURNAL_RECENT.md` that are NOT this terminal's to touch. Stage only this plan's specific files — no `git add -A`.
- **Status:** [ ] not started

---

## Open questions

- [x] RESEARCH.md migration — **resolved: opportunistic, no sweep.** The two S248 entries (SkillOpt, Emergence World) stay in the log; they're already surfaced via the plans they ignited (research.12 / research.13). Migrating them gains nothing now.
- [x] Supermemory in the loop — **resolved: out.** Doc layer authoritative; claude-mem is the free semantic layer; `/save-to-mags` stays deliberate by-exception, never a doc mirror.

---

## Changelog

- 2026-06-01 (S250) — Initial draft. Co-designed with Mike across the S250 research-build conversation: research-artifact identity ("source-mining record, standing library"), verdict enum (adopt/watch/take-nothing), the verdict-not-state rule (pending-ness is ROLLOUT's job), research/plan boundary, RESEARCH.md freeze. Supermemory dropped from the loop (claude-mem already covers semantic recall; doc layer is authoritative). headroom = take-nothing live demo.
- 2026-06-01 (S250) — Advisor pressure-test folded in before implementation: (1) RESEARCH.md freeze switched from wholesale to **section triage** — retire the empty "Ready for Rollout" anti-pattern lane, leave framing/bibliography/history in place (Task 3); (2) **Applications (living)** split into its own section, distinct from Changelog (Task 1); (3) instances register in a new `docs/research/` **sub-catalog**, not top-level index.md, to keep boot-burn flat as the corpus grows (Task 5); (4) full inbound treatment for the template (index + TERMINAL.md + SCHEMA), index-line-only for instances; (5) commit hygiene — stage specific files, pre-existing dirty JOURNAL files are not this terminal's.
