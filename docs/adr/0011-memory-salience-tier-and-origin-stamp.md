---
title: "ADR-0011: Memory salience tier as metadata + lineage origin-stamp in the maintenance layer"
created: 2026-06-20
updated: 2026-06-20
type: reference
tags: [architecture, memory, citizens, engine, token-budget, decision, active]
sources:
  - "[[../plans/2026-06-20-layered-memory-phase2-lineage-promotion]] — implementation plan (this ADR is Task 1)"
  - "[[../research/2026-06-20-layered-memory-architecture]] — verdict adopt; the auto-promotion rule is the unsolved core this ADR's substrate enables"
  - "[[../plans/2026-06-15-story-seed-deck-engine-emergence]] — engine.35: the engine-EMERGES / Supermemory-MAINTAINS division of labor that decides where lineage lives"
  - "[[../SUPERMEMORY]] — container architecture; Supermemory metadata (50 keys) + bt-wiki entity records"
  - "[[adr/0001-adopt-context-and-adrs]] — ADR bar"
pointers:
  - "[[../plans/2026-06-20-layered-memory-phase2-lineage-promotion]] — full task breakdown + schema sections"
  - "[[../engine/ROLLOUT_PLAN]] — research.17 row references this ADR"
  - "[[index]] — ADR registered same commit"
---

# ADR-0011: Memory salience tier as metadata + lineage origin-stamp in the maintenance layer

**Status:** Accepted
**Date:** 2026-06-20 (S265)
**Deciders:** Mags Corliss (research-build steward), Mike (proceed-on-Phase-2 go-ahead)

## Context

The OpenAI-E98 layered-memory adoption ([[../research/2026-06-20-layered-memory-architecture]]) keeps memory by **narrative salience, not recency**: Permanent Canon / Story Memory / Historical Archive. Phase 1 ([[../plans/2026-06-20-layered-memory-phase1-injection-filter]]) banked the cheap cut — a **category-level** rule that keeps admin-mechanics (cost figures, vote tallies, permit counts) out of the injection path. Phase 2 is the unsolved core: an Archive item promotes to Story/Permanent **only when it later spawns a major character or event**. That promotion is retrospective — the decision happens cycles after the item was written — so it requires two things Phase 1 deliberately skipped:

1. A **per-item salience tier** that can be *mutated* (a category default cannot be promoted; only a per-item value can).
2. A **persistent, cross-cycle lineage link** from a created entity back to what spawned it — written forward at creation, walked backward at promotion.

Two design forks had to be settled before any build:

- **Where does the per-item tier live?** Per-item storage, or stay category-level?
- **Where does the lineage link live — engine or maintenance layer?** This looked greenfield from the memory-container doc alone, but the engine already runs story machinery (`engine_audit` patterns with `affectedEntities`; the engine.35 `causalAnchor{kind,driver,confidence}` Phase-3 layer). The risk was inventing a parallel lineage system the engine already half-models.

## Decision

**1. Per-item salience tier as metadata.** Each memory item carries `salienceTier` (`permanent` | `story` | `archive`) as metadata — on Supermemory docs (the `metadata` map, 50-key budget) and as a Sim_Ledger entity-row value where the item is an entity. The coarse tiering already exists structurally: `world-data` is Archive *by container* (queried via MCP, never boot-injected); ledger `Tier` + bay-tribune editions anchor the Permanent/Story end. Phase 2 adds the **per-item refinement field** so an individual item can be re-tiered (the thing a category rule cannot do).

**2. Lineage origin-stamp lives in the MAINTENANCE layer, not the engine.** A persistent entity origin-stamp (origin-entity-id + origin-kind) is carried on the **bay-tribune wiki entity record + the Sim_Ledger entity row** — written forward when an entity is created, read backward at promotion.

**3. Promotion is non-destructive and tier-only.** Promotion flips `salienceTier archive→story`; it never moves, copies, or deletes the item. Demotion likewise never deletes — "queryable but not injected" keeps the Archive whole and addressable.

## Rejected alternatives

- **Lineage as a new engine stream.** Rejected. engine.35 locked Mike's S259 division of labor: **the engine EMERGES (forward-only, this-cycle signal); Supermemory MAINTAINS continuity (published articles + grades ARE the story history).** The existing `causalAnchor` is a within-cycle, forward delta→driver link — explicitly not cross-cycle continuity. A persistent entity→origin lineage IS continuity, which Mike assigned to the maintenance layer. An engine origin-stream would duplicate machinery the architecture already homes in Supermemory. (Caught by reading engine.35 before designing — an advisor-flagged near-reinvention.)

- **Stay category-level (no per-item tier).** Rejected for Phase 2. A category default cannot be *promoted* — retrospective promotion is definitionally a per-item mutation. (Category-level was the correct, cheaper choice for Phase 1, which does not promote; Phase 2's per-item tier *subsumes* the Phase 1 category rule, which becomes the seed default for a new item's tier.)

- **Deletion-based eviction.** Rejected. Violates [[feedback_self-preservation-rule-1]] (memory protection) and would drop the very permit that later spawns a character — the exact case promotion exists to catch.

## Consequences

- **The origin-stamp schema is irreversible-by-omission.** You cannot retrofit an origin you never recorded. The schema (field, location, the enumerated creation paths that write it) must be right before instrumentation — hence the dedicated design session and this ADR.
- **Stamp instrumentation gates on C99.** Chaos-cars ([[../plans/2026-05-07-chaos-cars-engine]], C99-deploy-gated) *adds* entity-creation + Tier-1-cascade paths the stamp must hook. Instrumenting before C99 means re-instrumenting after — so instrumentation waits for C99 to wire every path once.
- **The promotion sweep is deferred** until ≥1 major-event signal (Tier-1 promotion / Storyline arc beat / institution creation / chaos-cars Tier-1 cascade) is live in production, so it is designed against real shapes, not guesses.
- **Layer-boundary invariant.** This `salienceTier` governs **context injection** (boot / cycle / edition). It is NOT the `TAG_REGISTRY` (engine.31) 8-slot **citizen-memory** layer. A future session conflating the two is the named failure mode; both this ADR and the plan flag it.

## Reversal triggers

- If Supermemory metadata proves an unreliable place for a mutable tier (e.g., re-ingest wipes it), move the source-of-truth tier to the ledger row and treat the doc metadata as a mirror.
- If the maintenance-layer origin-stamp cannot be written at all the creation paths cheaply (some creation happens only in Apps Script with no maintenance-layer touch), revisit whether a thin engine-side origin *pointer* (id only, not a continuity stream) is the lesser evil — without re-litigating the continuity-is-Supermemory's-job principle.
