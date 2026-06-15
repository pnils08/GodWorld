---
title: Story_Seed_Deck → Engine-Emergent, Attributed, Desk-Ready Story Surface
created: 2026-06-15
updated: 2026-06-15
type: plan
tags: [engine, pipeline, editions, token-burn, storylines, active]
sources:
  - Mike S259 (2026-06-15) — "agents aren't able to take raw numbers and connect a storyline … showing the agents what happened and why and to who would likely save a lot of token burn"
  - Live C97 Story_Seed_Deck distribution (147 seeds: 104 storyline-followup / 100 GENERAL domain)
  - output/engine_audit_c97.json (patterns + tribuneFraming.storyHandles already do what/who/framing)
  - lib/neighborhoodSlice.js (engine.33 — per-hood residents + numbers)
  - scripts/engine-auditor/generateBaselineBriefs.js (engine_audit → briefs, the existing emergence surface)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.35 row points here"
  - "[[../engine/ENGINE_REPAIR]] — Row 28 (crisis-arc rebuild) folds into this; same effort"
  - "[[2026-06-13-c97-gap-log-triage]] — supersedes ES-4 step 1's mechanical 'cap recycled' framing"
  - "[[2026-06-10-engine33-neighborhood-citizen-loop]] — neighborhoodSlice is the who+numbers source"
  - "[[../index]] — registered same commit"
---

# Story_Seed_Deck → Engine-Emergent, Attributed, Desk-Ready Story Surface

## Thesis (Mike S259)

**Agents can't turn raw engine numbers into a storyline.** So the *engine* must do the
connecting — **what happened, why, and to whom** — and hand the desk a narrative-ready
packet. The deck becomes the engine's pre-computed story surface; the edition run reads it
instead of re-deriving, and re-derivation is where the token burn lives. "Showing the agents
what happened and why and to who would likely save a lot of token burn."

## Division of labor — engine EMERGES, Supermemory MAINTAINS (Mike S259)

> "The engine doesn't need to maintain the stories as the Supermemory does that — the articles, grades."

This is the clean split and it **simplifies** the deck's job:

- **Engine (the deck):** pure **emergence**. Detect this cycle's salient deltas and connect them into
  fresh what/why/who units. It does NOT track "have we covered this / what's the running thread / how
  did it score." Forward-only signal.
- **Supermemory (bay-tribune):** **maintenance / continuity** — the published articles + their grades
  ARE the story history. "Is this a continuation, has it been covered, did the last take land" is a
  **Supermemory lookup at edition time** (sift / Mara already query it), not an engine-maintained
  seed stream.

This directly explains the C97 noise: the `storyline-followup` recycling is **the engine trying to
do Supermemory's job** — re-emitting old threads as fresh seeds every cycle. That's the 71%. Gating
it (move A) isn't just denoising; it's **removing a responsibility the engine never should have held.**
Continuity comes from the articles+grades in Supermemory, queried when an edition is built.

## Grounded problem (live C97)

`Story_Seed_Deck` C97 = **147 seeds, 104 (71%) `storyline-followup`, 100 (68%) domain `GENERAL`.**
The deck today *recycles old threads* — it emits a continuity nudge for every storyline "not
mentioned recently" — it does **not** emerge stories from the engine. The priority/byline layer
(and the edition agents) wade through ~3.5× noise to find signal. 8 of those followups were
dead Chicago threads with zero live-canon backing (Mike: Chicago is a **proved-concept, dormant**
aspect — scaled back to fine-tune journalism coverage first).

## What already exists — build on it, do NOT reinvent

The "connect the numbers" engine is **largely already running**; it just doesn't feed the deck.

| Capability | Where it lives | Carries |
|---|---|---|
| **What + Who + proof** | `engine_audit_c<N>.json` `patterns[]` | `type` (what), `affectedEntities.citizens` (who, POPIDs) / `.neighborhoods` / `.initiatives`, `evidence.{sheet,rows,fields}` (proof), `description` |
| **Editorial framing** | same patterns → `tribuneFraming.storyHandles.<domain>` | per-domain `angle` + `citizens[]` + `hookLine` (a narrative opening) |
| **Who + real numbers** | `lib/neighborhoodSlice.createSlicer().slice(nbhd)` (engine.33) | per-hood residents (capped) + the live metrics |
| **Engine→brief emergence** | `scripts/engine-auditor/generateBaselineBriefs.js` | reads patterns, emits briefs with `threeLayerHandle {engine, simulation, userActions}` + `subjectIds` + `promotionHints` |
| **Priority + byline** | `Story_Seed_Deck` cols M–R (Engine A / Engine B) + sift T4.1 consumption | `PriorityScore`, `ConsequenceFloor`, `BylineCandidate` |

The gap is **not** emergence-from-scratch. It is: (1) the deck and the emergence surface
(`engine_audit`/`baseline_briefs`) are **separate** — the deck carries priority+byline+is consumed
by sift, but it's fed by storyline-recycling, not by the patterns; (2) the **WHY** (causal chain)
is thin — patterns give "stuck initiative" + who, but not *why it stuck / what's blocking*;
(3) nothing **bundles** the pattern + slice + handle + byline into one desk-ready packet, so the
agent still re-queries the sim.

## The three moves

### A — Stop the engine maintaining stories (mechanical; engine-sheet; clasp)
The `storyline-followup` stream is the engine doing Supermemory's job (re-emitting old threads). Per
the division of labor above, **continuity is not the engine's to hold.** So followups emit **only
when there is a fresh engine reason this cycle** — i.e. the thread's subject shows a live delta /
the subject is in the active sim. A dormant thread (Chicago; anything with no live anchor) emits
nothing; "we should keep covering X" comes from the Supermemory article+grade lookup at edition
time, not a recycled seed. Cap per-thread recurrence/age. This cuts ~70% of deck volume and drops
the non-credible Chicago seeds *as a consequence of the general rule*, not a Chicago special-case.
(Closes C97 G-S3 + the Chicago half.) File: `phase07-evening-media/applyStorySeeds.js`.

### B — Make `engine_audit` patterns first-class deck seeds (converge the two surfaces)
The patterns ARE the engine-emergent stories. Route them into the deck as **primary** seeds
(demote `storyline-followup` to gated continuity, per A). Each pattern-seed inherits what
(`description`/`angle`), who (`affectedEntities` POPIDs), the proof (`evidence.fields`), and the
existing `tribuneFraming.storyHandles`. **Decision to settle in Phase 0:** does the deck *consume*
`baseline_briefs`/`engine_audit` (one emergence engine, deck is a projection) or do they *merge*?
Two engine→story surfaces running in parallel is the redundancy to kill.

### C — Add the WHY, then bundle a desk-ready packet (the token-burn win)
- **WHY:** a causal-anchor layer — link the detected delta to its driver (the event / initiative
  phase change / migration / sentiment shift that produced it). "Fruitvale retail vitality fell
  **because** density rose after the C95 migration pulse," not just "retail fell." Investigate first:
  `tribuneFraming` may already carry a partial causal anchor (flagged "may already exist", claude-mem).
- **PACKET:** each emergent seed carries, **pre-staged**: subject POPIDs + their `neighborhoodSlice`
  (residents + real numbers), the what/why/who sentence, the `threeLayerHandle`, and the byline.
  The desk agent writes **from the packet** — no re-query of the sim. This is what makes B pay for
  itself: the engine spends deterministic Apps-Script compute **once** (free), and the expensive
  agent-driven edition run stops re-deriving per desk.

## The crisis-arc is the model (folds ENGINE_REPAIR Row 28)

Mike's "the crisis arc" reference names the unit. A crisis arc IS the desk-ready seed: a detected
engine change (what) + its cause chain (why) + affected named citizens + hood slice (who) + framing.
Row 28 pulled the **fabricated-specificity** crisis buckets (dice-picked hood + pool-picked subtype
off a city-aggregate `illnessRate`, `CitizenCount=0`) and queued a rebuild as "a connected per-hood
story signal driven by real metrics." **That rebuild and this deck redesign are the same effort** —
the connected per-hood signal *is* the desk-ready seed. Build once; do not restore the old buckets.

## Phasing

- **Phase 0 — investigate + decide convergence.** Map exactly what `tribuneFraming` + the pattern
  detectors already carry toward what/why/who; confirm the `engine_audit` ↔ `baseline_briefs` ↔ deck
  overlap; decide deck-consumes-emergence vs merge. Output: the seed-packet schema (the new
  `Story_Seed_Deck` columns or a sidecar JSON the deck references).
- **Phase 1 — gate the noise.** `applyStorySeeds.js` active-subject gate + recurrence/age cap.
  Engine-sheet, clasp. Immediate ~70% noise cut + Chicago falls out. (C97 G-S3.)
- **Phase 2 — route patterns → seeds.** Pattern story-units become primary deck seeds with
  what/who/proof/framing inherited. Demote followups to gated continuity.
- **Phase 3 — WHY layer.** Causal anchor per seed (build on / extend `tribuneFraming`).
- **Phase 4 — desk-ready packet.** Bundle `neighborhoodSlice` + handle + byline into the seed.
  Token-burn payoff lands here.
- **Phase 5 — rewire consumption.** Update sift / `buildDeskPackets` (and the desk agents' RULES)
  to read the packet instead of re-querying. Measure the per-edition token delta.

## Token-burn rationale (why C is the point, not a nicety)

The edition run is the expensive surface: many agents, large context, each re-deriving "what's the
story here, who's in it, what are the numbers." Moving that into deterministic engine compute (runs
once per cycle in Apps Script, ~free) and handing agents a ready packet **collapses per-desk
re-query**. The deck stops being a hint list and becomes the **cached hand-off** — the single place
the engine says "here are the real stories this cycle, with everything a desk needs to write them."

## Cross-references

- **ENGINE_REPAIR Row 28** — crisis-arc rebuild; same effort, fold here.
- **engine.33 / [[2026-06-10-engine33-neighborhood-citizen-loop]]** — `lib/neighborhoodSlice` is the who+numbers source.
- **`generateBaselineBriefs.js`** — the existing emergence surface to converge with (not duplicate).
- **C97 plan [[2026-06-13-c97-gap-log-triage]] ES-4 step 1** — this supersedes its mechanical "cap recycled" framing with the full emergence design; ES-4 step 1's gate becomes Phase 1 here.
- **engine.34** — ledger-as-representative-sample; D3 (ingest reject-not-auto-mint) is adjacent but a different surface (ingest, not seed generation).

## Changelog

- 2026-06-15 — Drafted (S259, engine-sheet) from Mike's S259 framing (deck = engine's pre-computed, attributed, desk-ready story surface to cut edition token burn). Grounded in the live C97 deck distribution + the existing `engine_audit`/`tribuneFraming`/`neighborhoodSlice`/`baseline_briefs` infrastructure. Folds Row 28; supersedes C97 ES-4 step 1's framing. No code yet — design pass per Mike "requires genuine creativity."
- 2026-06-15 — Added the division-of-labor split (Mike S259 follow-up): engine EMERGES (fresh what/why/who), Supermemory MAINTAINS (published articles + grades = continuity). Reframed move A — the `storyline-followup` recycling is the engine wrongly holding continuity that belongs to Supermemory; gating it removes a responsibility, not just noise. Continuity = a Supermemory lookup at edition time, not an engine-maintained seed stream.
