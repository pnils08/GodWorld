---
title: Research Sub-Catalog
created: 2026-06-01
updated: 2026-06-01
type: reference
tags: [research, architecture, active]
sources:
  - docs/plans/2026-06-01-doc-loop-consolidation.md — the plan that created this sub-catalog (S250)
  - docs/SCHEMA.md §10 (index discipline)
pointers:
  - "[[TEMPLATE]] — the shape every instance below follows"
  - "[[../index]] — top-level catalog; points here rather than listing every instance (boot-burn)"
  - "[[../RESEARCH]] — frozen legacy learning log (pre-S250 research lived there)"
---

# Research Sub-Catalog

**Every deliberate research file in `docs/research/` appears here exactly once.** This sub-catalog exists so the top-level `docs/index.md` — a research-build boot read — doesn't grow per research file. "Research never archives," so the corpus only accretes; keeping instances here keeps boot-burn flat. [[TEMPLATE]] defines the shape; this file lists the instances.

Grep here before grepping the tree. Each row: file · one-line purpose · verdict.

---

## Instances

| File | Purpose | Verdict |
|------|---------|---------|
| **[[2026-06-01-headroom-context-compression]]** | Headroom context-compression toolkit — does it earn a place in the stack? | `take-nothing` (canon needs fidelity not compression; boot-burn already solved by discipline) |
| **[[2026-06-01-initiative-tracker-state]]** | Initiative_Tracker subsystem — read/write graph, the missing ImplementationPhase contract, multi-layer drift | `adopt` (ignites [[../plans/2026-06-01-initiative-tracker-contract]]) |

---

## Notes

- **Pre-S250 research** lives in [[../RESEARCH]] (the frozen learning log) + [[research4_1]] / [[research4_2]] (deep-research files). Those are not re-catalogued here; they migrate opportunistically if ever touched.
- **Non-`.md` research artifacts** in this folder (PDFs, dry-run captures) are raw source material per SCHEMA §7, not template instances — not catalogued here.

---

## Changelog

- 2026-06-01 — Created (S250). First instance: headroom. Per `docs/plans/2026-06-01-doc-loop-consolidation.md`.
