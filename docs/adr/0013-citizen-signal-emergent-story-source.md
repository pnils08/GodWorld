---
title: "ADR-0013: Citizen-signal convergence as a gated emergent story source"
created: 2026-06-29
updated: 2026-06-29
type: reference
tags: [architecture, citizens, citizen-loop, story-emergence, canon, decision, active]
sources:
  - "[[../plans/2026-06-26-citizen-signal-story-emergence]] — research.21 thesis + guardrails (the evidence base)"
  - "[[../plans/2026-06-29-citizen-signal-detector-build]] — the build plan executing this ADR"
  - "Live empirical query of Reflection_Intake, S274 (43 rows / 39 distinct) — the data that bounds v1 scope"
  - "[[0007-cross-layer-canon-authority-precedence]] — the publication wall this ADR keeps"
  - "[[0001-adopt-context-and-adrs]] — ADR bar"
pointers:
  - "[[../plans/2026-06-26-citizen-signal-story-emergence]] — research.21"
  - "[[../plans/2026-06-29-citizen-signal-detector-build]] — build plan (engine-sheet §3)"
  - "[[../engine/ROLLOUT_PLAN]] — research.21 row"
  - "[[index]] — registered same commit"
---

# ADR-0013: Citizen-signal convergence as a gated emergent story source

**Status:** Accepted (decision); implementation phased + quality-gated (see Consequences)
**Date:** 2026-06-29 (S274)
**Deciders:** Mags Corliss (research-build), Mike (directed the design — "this is likely how this all automates," S273)

## Context

The 24/7 citizen-loop already runs: each wake, a citizen perceives engine output and reflects in their own voice; the reflection is classified (event tag + affect tag) and persisted to `Reflection_Intake`. Today that description layer is **thrown away** — the pipeline reads the dial write-back but never reads what the citizens *say about the world*.

research.21 (S273) named the inversion: when N citizens **independently** converge on the same thing, that convergence **is a storyline surfacing bottom-up** — the same monotone tic S273 flagged as a bug is also the signal. The substrate to detect it already exists (`Reflection_Intake` + the classifier tags + the `Story_Seed_Deck` sink). The thesis was captured; the **mechanism** — what counts as a signal, at what cadence, how it relates to engine seeds, what it emits, who reads it — was undefined. This ADR records the decided mechanism.

Two facts bound the decision:
- **Empirical (S274 live query):** the corpus is small (43 rows / 39 distinct across C97–C100; 5/day only just landed at C100=20). At ~20 distinct/cycle, **only citywide affect has statistical power**; per-neighborhood (~5/hood) and per-event-tag (saturated 35% by `Community`, a monotone-provocation artifact) do not. Cost is a non-constraint (research.21 OQ6: ~$11/mo even at all-900/day); the binding gate is **samples, not dollars.**
- **Canon:** a citizen reflection is **subjective memory** — it may invent ("shady Greg," S264). It is canon only when it crosses the publication wall, where the check already sits (`project_subjective-hallucination-is-canon`; [[0007-cross-layer-canon-authority-precedence]]).

## Decision

Adopt **citizen-signal convergence as a new, gated, emergent source feeding the existing story-seed pipeline.** Six moves:

1. **Detect convergence as distinct-citizen affect-share lift over a trailing baseline** — a deterministic tally, **distinct citizens not raw rows**, over already-persisted tags. **Zero new LLM calls.**
2. **Scope v1 to citywide affect only.** Neighborhood resolution is **throughput-gated**; event-tag convergence is **research.19 T5-gated** (provocation diversity). Both unlocks are recorded as explicit parameterized dials (`MIN_DISTINCT` per dimension), not assumed away — the gate is samples, not cost.
3. **Run post-cycle over a sliding window**, in the existing post-cycle slot (alongside `routePatternSeeds.js`); **dormant** below a corpus-depth floor so it never fires on noise.
4. **Emit a seed, not a draft** — `SeedType='citizen-signal'` into `Story_Seed_Deck`, stamped with the **detection cycle**. A new SOURCE into the existing seed→/sift→edition flow, **not a parallel pipeline.**
5. **Consume via `/sift` natively** — no new pass. Tag-by-origin. **Affect↔engine-sentiment corroboration is near-term** (the engine already mints mood seeds from its own metrics — `strain-trend`, low-QoL, withdrawal; matching citizen-affect against them yields the prize: corroboration, or **divergence** = engine-calm-while-citizens-anxious, the hidden story). Only the richer `domain×neighborhood` event-corroboration defers with the event dimension (T5-gated).
6. **Keep the wall and the floor.** Emergent seeds are **candidates** — they pass the existing canon + quality wall (Rhea, the edition canon check, `/sift` triage) before becoming published canon. Editions stay the verified surface until citizen-signal emergence proves out on a **quality** bar, not just cost.

## Consequences

**Positive.**
- A near-free, deterministic, bottom-up story source that catches salience the top-down pipeline misses (the research.20 C100-Coliseum failure mode — signal caught at /sift, lost downstream).
- Reuses the entire existing seed→/sift→edition flow; nothing new to maintain but one detector script.
- Sets up the research.21 downstream shift: as the wake loop grows citizens on its own, the citizen-usage-enforcement overhead in editions (selection rubric, usage log, Rhea citizen verification, coverage audits) gets lighter — **earned, not immediate.**

**Risks / costs.**
- **Throughput, not cost, gates resolution.** Anything finer than citywide affect needs ~5–10× more wakes. Recorded as dials; do not over-promise neighborhood/event signal at current rate.
- **Monotone baseline poisons the event dimension** until T5 diversifies provocations — hence T5-before-detector sequencing.
- **The wall is load-bearing.** Detection reads the subjective layer (inventions and all); only publication is gated. Never auto-publish an emergent seed.

**Rejected alternatives.**
- **Top-down curation only (build nothing).** Throws away a free signal already accreting; leaves edition-coverage as the sole — and proven-fallible (C100) — path to surfacing events.
- **A parallel emergent pipeline.** Rebuilds /sift + editions; violates the anti-duplication discipline. Feed the existing deck instead.
- **Auto-publish emergent stories** (research.12 Layer 3 / votes-that-decide). Crosses the subjective→canon publication wall; gated by determinism **and** Mike's canon authority. Named in research.21 §Frontier; not built here.
- **Raw-count thresholds.** Base rates (`Content`/`Calm` dominate; `Community` saturates events) make raw counts fire on noise. Lift-over-baseline + distinct-citizen floor is the corrective.

Implementation: [[../plans/2026-06-29-citizen-signal-detector-build]] (engine-sheet §3). Thesis + full guardrails: [[../plans/2026-06-26-citizen-signal-story-emergence]].
