---
title: Closed-Plan Archive Sweep — drain docs/plans/ to docs/archive/plans/
created: 2026-06-01
updated: 2026-06-01
type: plan
tags: [governance, architecture, draft]
sources:
  - S251 research-build conversation (Mike) — "add the 69 sweep to the plans"
  - docs/engine/rollout-rules.md §6 — closed plans → docs/archive/plans/ convention (established S251)
pointers:
  - "[[../engine/rollout-rules]] — §6 establishes the archive path + link-repoint rule"
  - "[[../engine/ROLLOUT_ARCHIVE]] — cross-reference: a plan whose rollout row is archived is a move candidate"
  - "[[index]] — entries repoint to archive path on move"
---

# Closed-Plan Archive Sweep

**Goal:** `docs/plans/` holds **69 plan files** — live and shipped indistinguishable, the same drift the rollout cleanup just fixed. Move the closed ones to `docs/archive/plans/` per rollout-rules §6, repointing inbound links, so `docs/plans/` shows only live work.

**Why now:** rollout-rules §6 (S251) established `docs/archive/plans/` as the closed-plan home with a link-repoint step. That convention is forward-looking; this sweep applies it retroactively to the existing pile.

**Approach — per-plan judgment, NOT a blind move (measure-twice):**
1. **Build the candidate list.** A plan is a move candidate when its ROLLOUT row is already in ROLLOUT_ARCHIVE, OR it's marked complete/superseded in its own frontmatter/body. Cross-reference `docs/plans/*.md` against ROLLOUT_ARCHIVE references + the index's archived entries. A helper script can list candidates (which plan files have no live ROLLOUT row pointing at them); the keep/move call stays manual.
2. **Per candidate, verify it's actually closed** — not just stale. A plan still cited as live design (e.g. a parked-but-active phase plan) stays put even if old. When in doubt, leave it.
3. **Move + repoint.** `git mv docs/plans/<file>.md docs/archive/plans/<file>.md`; update every inbound `[[plans/<file>]]` link → `[[archive/plans/<file>]]` (the ROLLOUT_ARCHIVE bullet + the index entry + any sibling-plan cross-links). Verify no broken `[[]]` remains (grep the old path).
4. **Batch in passes**, not all 69 at once — a handful per commit, link-checked each pass (the S250 relocate-don't-delete-on-trust lesson).

**Acceptance:**
- `docs/plans/` contains only plans with a live ROLLOUT row or active-design status.
- `docs/archive/plans/` holds the moved closed plans; every moved plan's inbound links resolve to the archive path.
- A grep for the old `[[plans/<moved>]]` paths returns zero live references.

**Open question:**
- [ ] Build the candidate-lister helper (`scripts/closedPlanCandidates.js` — list plan files with no live ROLLOUT row) first, or do the cross-reference by hand for a one-time sweep? Lean: hand-built candidate list this pass (one-time), script only if the sweep recurs.

## Changelog

- 2026-06-01 (S251) — Filed. Applies rollout-rules §6 closed-plan convention to the existing 69-file `docs/plans/` pile. Per-plan-verify-then-move, batched in passes, link-repoint mandatory.
