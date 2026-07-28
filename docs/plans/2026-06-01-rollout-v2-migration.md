---
title: ROLLOUT v2.0 Migration Plan
created: 2026-06-01
updated: 2026-06-01
type: plan
tags: [architecture, governance, draft]
sources:
  - S250 research-build conversation (Mike) — fresh-start v2.0 decision + drain-down migration + by-terminal grouping
  - docs/engine/ROLLOUT_PLAN.md — the legacy junk box being retired
  - docs/adr/0005-rollout-plan-structure.md — current structure (the how-to logic moves here / to rollout-rules.md)
  - scripts/docLoopStatus.js + scripts/rolloutSweep.js — the maintenance layer v2.0 hands off to (built S250)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — legacy rollout (drains + retires)"
  - "[[plans/TEMPLATE]] — plan shape"
  - "[[index]] — register in same commit"
---

# ROLLOUT v2.0 Migration Plan

**Goal:** Stand up a fresh ROLLOUT v2.0 built to one enforced structure, migrate the still-actionable work onto it, drain + retire the legacy rollout, and hand ongoing maintenance to coded sweeps — so the tracker stops being a 205-session free-text junk box.

**Architecture:** Parallel-run, drain-down — NOT a wholesale rewrite. A new lean ROLLOUT v2.0 + a mirror-structured ARCHIVE v2.0 + a separate `rollout-rules.md` (the how-to logic evicted from the tracker). All new work files to v2.0 from day one. The legacy rollout gets three pulls — (1) how-to logic → `rollout-rules.md`, (2) already-structured rows → v2.0, (3) each remaining wall decomposed by hand into its existing plan, leaving a clean v2.0 row or nothing. When the legacy file is empty it retires (renamed, links repointed). **The migration is manual (judgment — which plan each wall folds into, what's still actionable); the sweeps are code, for after.**

**Terminal:** research-build (apparatus). The wall-decomposition touches rows owned by all terminals — research-build runs the pass but flags engine-sheet/media/civic live rows for their owners rather than guessing their open state.

**Pointers:**
- Legacy source: `docs/engine/ROLLOUT_PLAN.md` (304→294 lines as of S250; ~15 wall rows + ~110 lines how-to)
- Maintenance layer: `scripts/docLoopStatus.js` (validator/detector), `scripts/rolloutSweep.js` (sweep)
- Proof-of-pattern: governance.18 decomposition (S250, commit `0822d6f`) — one wall → clean row + detail relocated to its plan

**Decisions:**
- **D1 — Grouping: by TERMINAL, actionable-first within. [RECOMMENDED — confirm before T2]** Not by type (answers nothing operational; the type stays as an ID prefix only), not by plan (redundant with the pointer; collapses to the generated-index anyway). The reader is a terminal at boot asking "what's mine?" — terminal-grouping answers it; `--next` already proves the view. Within a terminal, sort ready/in-progress above blocked/needs-info/parked.
- **D2 — Row schema:** one row = `id · one-line actionable next-action · state · terminal · → plan-pointer`. No history, no narrative, no how-to. If it can't be one actionable line, it's a plan, not a row.
- **D3 — Naming / link safety:** build as `ROLLOUT_V2.md` during transition; at retirement (T5) rename v2 → `ROLLOUT_PLAN.md` and legacy → `ROLLOUT_PLAN_legacy.md`, so the ~6 inbound links (4 TERMINAL.md + CLAUDE.md + ADR-0005 + plan pointers) resolve to v2 content without a link sweep. (This is the link-preservation concern that wrongly pushed S250 toward in-place editing — solved by rename-at-retirement, not by salvaging in place.)

**Acceptance criteria:**
1. `rollout-rules.md` exists; legacy rollout's how-to/taxonomy/state-label/how-to-add/close sections are gone from the tracker (pointer header only).
2. `ROLLOUT_V2.md` + `ROLLOUT_ARCHIVE_V2.md` exist, mirror-structured, grouped by terminal per D1, every row conforming to D2.
3. Every still-actionable legacy item is either a clean v2.0 row OR folded into its plan (verified — detail in the plan, not just deleted).
4. Legacy rollout emptied → retired per D3; inbound links resolve to v2 content.
5. `docLoopStatus.js --foreign` returns zero on v2.0 (the validator passes); `rolloutSweep.js` retargeted to v2 ↔ archive-v2.

---

## Tasks

### Phase 1 — structure (no content migration yet)

#### Task 1: Evict the how-to logic
- **Files:** `docs/engine/rollout-rules.md` (create); `docs/index.md` (register)
- **Steps:** Move the legacy rollout's §The Spine + §Convention State labels + §Group taxonomy + §How to add work + §How to close work into `rollout-rules.md`. Legacy rollout keeps a 2-line header pointer to it.
- **Verify:** legacy rollout no longer contains how-to sections; rollout-rules.md registered.
- **Status:** [x] DONE S251 — `docs/engine/rollout-rules.md` created as full operating doctrine (not just the evicted sections): four-role pipeline (research/plan/rollout/archive) + the gap-log-is-research keystone (skill terminals don't blind-log on rollout) + clean-tracker discipline + state labels + group taxonomy + how-to-add/close + filing + archiving/sweep-code. State labels, taxonomy, how-to-add, how-to-close evicted from ROLLOUT_PLAN; replaced with §Rules & conventions pointer header. **§The Spine relocated to ROLLOUT_ARCHIVE** (completed roadmap — a rules doc shouldn't carry it; deviates from the literal Task-1 instruction but serves "rollout stays clean / archive completed"). Registered in index.md. O2 resolved (below). **Pending Mike review before Cut 2** (the four terminal-MD wirings — always-loaded files).

#### Task 2: Create the v2.0 shell (after D1 confirmed)
- **Files:** `docs/engine/ROLLOUT_V2.md` + `docs/engine/ROLLOUT_ARCHIVE_V2.md` (create); `docs/index.md`
- **Steps:** Header (pointer to rollout-rules.md) + the D2 row-template + by-terminal grouping (D1). Archive-v2 mirrors the row schema exactly.
- **Verify:** both exist, structurally identical row schema; registered.
- **Status:** [ ] not started

### Phase 2 — migrate (manual judgment)

#### Task 3: Move already-structured rows
- **Steps:** The legacy rows that are already lean/conforming (one-liner + pointer) move verbatim into v2.0 under their terminal.
- **Verify:** moved rows conform to D2; removed from legacy.
- **Status:** [ ] not started

#### Task 4: Decompose the walls (the manual core)
- **Steps:** Per remaining wall, block by block: read it → identify what's *actionable* → fold the history/detail into its existing plan (most have one; create one only if genuinely needed) → write the clean v2.0 row OR drop if the plan already covers it. research-build's own rows fully; flag engine-sheet/media/civic live walls for their owners (don't guess their open state). Verify each offload landed in the plan before removing from legacy (the S250 lesson — relocate, don't delete-on-trust).
- **Verify:** each wall either a clean v2 row or confirmed-covered-by-plan; nothing lost.
- **Status:** [ ] not started

### Phase 3 — retire + hand off to code

#### Task 5: Retire legacy
- **Steps:** When legacy Open Work is empty, rename per D3 (v2 → ROLLOUT_PLAN.md, legacy → ROLLOUT_PLAN_legacy.md); confirm inbound links resolve; legacy archive freezes alongside.
- **Verify:** links resolve to v2 content; legacy marked superseded.
- **Status:** [ ] not started

#### Task 6: Retarget the maintenance scripts
- **Steps:** Point `docLoopStatus.js` + `rolloutSweep.js` at the v2 files; `--foreign` becomes the standing conformance gate.
- **Verify:** `--foreign` zero on v2; sweep moves v2 → archive-v2.
- **Status:** [ ] not started

---

## Open questions

- [ ] D1 grouping — confirm by-terminal before Task 2.
- [x] **RESOLVED S251** — `rollout-rules.md` is a new file (not folded into ADR-0005). It carries the operating rules; ADR-0005 keeps the rationale + alternatives. The doc points to ADR-0005 for the "why," no duplication. Mike S251 expanded its scope past "thin": it is the governing doctrine every terminal MD references — so it carries the full four-role model + filing + gap-log keystone, not just the evicted sections.
- [x] **DONE S251 (Cut 2)** — all four terminal MDs wired to [[../engine/rollout-rules]]. Each already carried role + measure-twice + useful-docs; the edits added the doctrine pointer and (research-build + engine-sheet) repointed the now-evicted `ROLLOUT_PLAN §How to add work` link. civic + media got the gap-log keystone surfaced at their level ("your gap log is your research layer — the ONLY place issues get logged; never blind-log on ROLLOUT"). research-build named as doctrine owner; also fixed its stale "append to RESEARCH.md" (frozen S250) → per-topic research file. Always-loaded-file hazard gated on Mike's explicit Cut-2 green-light.

---

## Changelog

- 2026-06-01 (S250) — Initial draft. Captures the fresh-start v2.0 decision Mike set across the S250 conversation after the in-place-salvage attempt was rejected. Drain-down (not wholesale rewrite), manual migration + coded maintenance split, by-terminal grouping (D1, recommended), rename-at-retirement for link safety (D3). Supersedes the S250 in-place slimming approach entirely.
