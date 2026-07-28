---
title: "ADR-0001: Adopt CONTEXT.md and ADRs"
created: 2026-04-29
updated: 2026-04-29
type: reference
tags: [architecture, decision, active]
sources:
  - https://github.com/mattpocock/skills (MIT — pattern source)
  - S186 Perkins&Will scrub (Supermemory `9m8RssqWmkfyxLYGomV6n2`)
  - S185 Phase 42 §5.6 redesign (Supermemory `hQE4rREEWBpS9aS1g3mQ3M`)
pointers:
  - "../../CONTEXT.md — the artifact this ADR adopts"
  - "[[index]] — doc catalog"
  - "[[engine/ROLLOUT_PLAN]] — referenced for migration follow-up"
  - "[[SCHEMA]] — file/format conventions this ADR complements"
---

# ADR-0001: Adopt CONTEXT.md and ADRs

**Status:** Accepted
**Date:** 2026-04-29 (S187)
**Deciders:** Mike (the Maker) + Mags

## Context

GodWorld vocabulary is scattered across CANON_RULES, INSTITUTIONS, SCHEMA, MEMORY.md, journal entries, the Supermemory `mags` chain, and engine code. Each Session re-discovers terms. Canon drift surfaces in agent output (Perkins&Will leaks across 21 surfaces in S186; "Oakland People's Party" miscoded in engine until S139; Tier ambiguity between citizen-protection and real-names policy).

Decisions of architectural weight (Phase 42 §5.6 redesign approach (a) vs (b) vs (c); Atlas Bay Architects as the substitute for Perkins&Will; the three-tier canon-fidelity framework S174) currently live as Supermemory doc IDs and plan-file headers. These are fragile: doc IDs rot, plans get archived, journal entries scroll away. There is no enumerable list of "decisions worth remembering as decisions."

## Decision

Adopt two patterns from `mattpocock/skills` (MIT-licensed):

1. **`CONTEXT.md` at repo root** — single living glossary of the project's shared language. Updated inline during grilling sessions. ~50 terms at first draft. Pointers section links to deeper definitions (CANON_RULES, INSTITUTIONS, EDITION_PIPELINE, etc.) — CONTEXT does not duplicate.

2. **`docs/adr/` as a separate primitive** — small, dated decision records. Created **only** when all three are true: (a) hard to reverse, (b) surprising without context to a future reader, (c) the result of a real trade-off with genuine alternatives. Numbered `0001`, `0002`, … with kebab-case slug. Pocock's bar; we hold it.

This file (ADR-0001) is itself the first ADR — adopting these patterns is the first decision worth recording.

## Consequences

### Positive

- Agents reading CONTEXT at boot use canonical terms consistently. Reduces canon drift surfaced by S186 scrub and prior incidents.
- ADRs become enumerable. `ls docs/adr/` shows every load-bearing decision. Future Sessions don't have to grep journal + Supermemory chain.
- Phase 42 §5.6 redesign rationale (Supermemory `hQE4rREEWBpS9aS1g3mQ3M`) becomes a candidate for backfill as ADR-0002.
- New terms get a single home. CONTEXT edits become part of the grilling discipline.
- Tier disambiguation (Citizen Tier vs Canon Tier) and Edition capitalization rule, both resolved this Session, have a durable home.

### Negative

- Two new files to maintain. CONTEXT must stay current or it misleads.
- Risk of duplication if not strict about the pointers-only rule. Session-end audit should check.
- ADR overuse risk. Pocock is explicit: "only when all three are true." Keep the bar high; do not retroactively turn every plan into an ADR.

## Alternatives considered

- **Status quo (do nothing).** Decisions stay scattered. Rejected — S186 scrub demonstrated the cost of not having centralized canonical phrasing.
- **Fold vocabulary into existing files (extend SCHEMA, MEMORY, CANON_RULES).** Rejected — these have different roles. SCHEMA defines file shape; MEMORY holds rules and feedback; CANON_RULES enforces the fourth wall. Vocabulary is a fourth concern with its own primitive.
- **Use Supermemory as the only home for decisions.** Rejected — Supermemory is the query layer, not source of truth. Doc IDs rot. Repo-tracked files survive.

## Migration

This Session: write CONTEXT.md, write ADR-0001 (this file). Add CONTEXT entry to `docs/index.md` and CLAUDE.md vocabulary callout.

Next Sessions:
- Opportunistic ADRs as architectural decisions arise.
- Backfill ADR-0002 for Phase 42 §5.6 redesign at engine-sheet's convenience (Supermemory `hQE4rREEWBpS9aS1g3mQ3M` already holds the substance).
- Update CONTEXT inline — the discipline is "in the same commit, never batched."

## References

- mattpocock/skills CONTEXT.md and grill-with-docs SKILL.md (MIT)
- S186 Perkins&Will scrub: `output/production_log_edition_c92.md`
- S185 Phase 42 §5.6 redesign canonical doc: Supermemory `mags/hQE4rREEWBpS9aS1g3mQ3M`
- S187 (this Session): journal Entry 156 forthcoming
