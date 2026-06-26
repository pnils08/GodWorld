---
title: Citizen-Signal Story Emergence (the self-contained world-reporting loop)
created: 2026-06-26
type: plan
status: design (thesis captured; signal→story mechanism UNDESIGNED)
terminal: research-build (design) → engine-sheet (build) — ADR pending mechanism-lock
tags: [citizens, citizen-loop, story-emergence, reporting, architecture, research, plan]
paths:
  - "[[2026-06-23-citizen-perception-immersion-layer]] — research.19, the INPUT side; this is its second readout"
  - "[[2026-06-04-mags-citizen-loop]] — research.14, the reflection→dial write-back loop"
  - "[[2026-06-25-deep-dispatch-write-edition-build]] — research.20, report-through-citizens; this supplies its missing aggregation+consumption half"
  - "engine.35 Story_Seed_Deck — the existing story-seed surface this feeds (a new SOURCE, not a parallel pipeline)"
registered: "[[../index]]"
---

# Citizen-Signal Story Emergence

**The thesis (Mike, S273 — "this is likely how this all automates").** The citizen-loop is an almost self-contained engine for generating story. Capture it now while it's articulated; the signal→story *mechanism* is still undesigned (see §Open mechanism questions) — that's the next design, and where the ADR belongs.

---

## The loop (real, and mostly already built)

A citizen's Supermemory page **is their memory** — reflections aren't generated in a vacuum, they stack. Each wake carries the context of what was read at the prior wake, so memory *shapes* the citizen over time. The closed loop:

```
engine output → citizen perceives it (wake) → reflects in their own voice
   → reflection tagged to Reflection_Intake → (gated) dial write-back
   → dials shape the life the engine deals the citizen next
   → media covers them by salience → (back to engine output)
```

Built today: the wake (research.19 perception + citizen-wake.js), the reflection, the `Reflection_Intake` tag persist, the gated dial write-back (research.14, Phase-1 gate). The loop runs.

**What we're currently throwing away:** the citizens aren't only *living* the world — they're **describing** it. Each is the creative LLM taking dry engine aggregates ("retail −4%", "crime 0.86") and rendering them as lived experience ("another storefront went dark", "more patrol cars on the block"). That description layer is **free story material** the pipeline doesn't read.

---

## The inversion — convergence is signal, and it reframes T2

S273 flagged the monotone "the A's are on fire" recurring across citizens as a *bug* (shared input → convergent output). It is **also the signal**: when N citizens *independently* land on the same thing — the construction site, a faith observance, a neighborhood's unease — that convergence **is a storyline surfacing bottom-up**.

This reframes research.19 **T2** (per-neighborhood texture): it isn't just anti-monotony, it's **signal-conditioning**. Differentiate each citizen's baseline perception so that when they *do* converge, the convergence means **real shared salience**, not a shared-input artifact. T2 is what makes the story-detector clean: a flat baseline makes every cycle look like a story; a differentiated baseline makes a real spike legible.

---

## The detector sits on substrate that already exists

The "script that finds the larger signals and generates stories" is **a tally + threshold over data we are already persisting**, feeding a sink that already exists:

- **`Reflection_Intake`** already logs every wake: `[ts, popId, cycle, daypart, event-tag, snippet, applied, affect-tag]` (citizen-wake.js, 8-col). The cross-citizen corpus is **already accreting**.
- **The reflection classifier** (`lib/reflectionClassifier.classifyDualReflection_`) already tags each reflection with an `event` + `affect` category. The aggregatable dimension is already computed.
- **The engine already carries a story-seed surface** — `Story_Seed_Deck` (engine.35); world_summary C100 reports `Story seed count: 46`. Citizen-signal seeds **feed this**, they don't fork a new pipeline (engine.35's "CONSUME, not merge" discipline applies).

So Mike's "without trying, this generates potential storylines" is grounded: the inputs and the sink both exist; only the **detector + the seed-shaping** are unbuilt.

---

## What this is, architecturally

This is the **second readout** of the loop (editions are the first) and the **aggregation + consumption half** that research.20's report-through-citizens model was missing. The advisor (S273) named three things a citizen-reporting model needs; this supplies two:

| Need (advisor S273) | Supplied by |
|---|---|
| **Scale** — loop wakes one citizen/run | OPEN (see §Open questions) — `Reflection_Intake` accumulates across cycles, but intra-cycle convergence needs many wakes/cycle |
| **Aggregation** — N reflections → a readable thing | **Cross-citizen convergence detection** (this design) |
| **Consumption surface** — what's published, who reads it | **Story seeds** into the existing seed → /sift → edition flow |

It is a **new source into the existing story-seed/edition flow**, not a parallel one. That is the anti-duplication discipline: don't rebuild /sift or editions; feed them a new, cheaper, emergent input.

---

## What this changes downstream — the edition's job shifts (Mike, S273)

Today a real share of pipeline cost goes into making sure **citizens are USED in editions** — because the edition has been the mechanism that *grows* the world and the citizens: the `citizen_selection` rubric, the `CITIZEN USAGE LOG`, Rhea's citizen-name cross-checks, the recurring "did we use enough / the right citizens" audits and greps. Citizen development was **coupled to edition production**.

The wake loop **decouples them.** Citizens now grow themselves — they accrete memory, move their dials, live arcs — *without* an edition needing to feature them. So **citizen involvement in any given edition becomes less consequential to the world's growth.** That frees the edition to do what an edition is actually for:

- **The edition covers the world the citizens are living** — events, scene-setting, what *happened* — and **less the citizen-usage data**. It still uses and quotes citizens, but is no longer *dependent* on them to grow the world.
- **Citizen-usage audits + greps get lighter** — the whole "ensure coverage of citizens" enforcement layer shrinks because growth no longer rides on it. And it gets *easier*: the story-seed layer surfaces which citizens/threads matter bottom-up, so selection stops being a manual quota.

**This is the offload answer to the S273 "citizen audits in print" cost question** — it isn't one artifact, it's the *citizen-usage-enforcement overhead spread across the whole edition pipeline* (selection rubric + usage log + Rhea citizen verification + coverage audits). That class of work is what gets lighter.

**Sequencing guardrail:** this lightening is **earned, not immediate**. Don't strip citizen-usage verification until the wake loop *demonstrably* grows citizens on its own (research.21 proves out + the wake-loop write-back is live). Until then, editions stay the verified surface and the audits stay. The direction is set; the cuts wait for proof. (Aims research.19 **T5**: if growth now lives in the wake, the question-bank categories should maximize the wake's citizen-development + story-signal yield — self / world / relationships / preference — because that is where citizens are now grown.)

## Guardrails (non-negotiable)

- **Emergent ≠ auto-publish.** Convergence-detected stories are **candidates / seeds**, not canon. They pass the existing canon + quality wall (Rhea, the edition canon check, /sift triage) before they become published canon. The sim proposes; the verified surface disposes.
- **Editions stay the verified surface** until citizen-signal emergence proves out on a **quality** bar, not just "it's cheaper" (cost-gate the shift, same as research.20).
- **The subjective→canon publication wall holds.** A citizen's reflection is subjective memory (it may invent "shady Greg"); it becomes canon only when it crosses the publication wall, where the check already sits. Detection reads the subjective layer; publication is gated. (Auto-memory `project_subjective-hallucination-is-canon`.)
- **Determinism unaffected.** Detection is a read over persisted `Reflection_Intake` rows — input-side, post-hoc, no engine write. Only the existing gated dial write-back touches the engine.

---

## Open mechanism questions (THE NEXT DESIGN — undefined today)

This is why there is no ADR yet: an ADR records a *decided* mechanism, and these are open. Designing them is the next step.

1. **What is a "larger signal"?** Convergence over which dimension — count of citizens sharing an `event-tag`? `affect` convergence (a neighborhood turning irritable)? a *topic* (NLP/embedding over `snippet` text, beyond the coarse tags)? a neighborhood cluster? Define the metric + threshold.
2. **Scale / cadence.** The loop wakes **one** citizen per run. Intra-cycle convergence needs many wakes/cycle — raise wake throughput, or detect over the **accumulating** `Reflection_Intake` corpus across cycles (slower-moving signals)? Both?
3. **Dedup vs engine story-seeds.** engine.35 already mints ~46 seeds/cycle. Citizen-signal seeds must **complement**, not duplicate — how do the two seed sources relate (merge, tag-by-origin, citizen-seeds as corroboration weight on engine-seeds)?
4. **Output shape.** Detector emits a **story-seed** (cleanest — rides existing seed→sift flow) vs a draft (premature). Lean seed.
5. **Consumption.** Who reads citizen-signal seeds — /sift directly? A dedicated pass? How do they enter the existing flow without bloating it?
6. **Cost model — the offload claim.** The WHY is token-offload from "citizen audits in print." Pin what that costs today (still owed from S273) so the detector targets the real saving; the cost-gate to "editions-not-always" needs the quality bar above.

---

## Build sequence

| Phase | What | Terminal | Status |
|---|---|---|---|
| 0 | **Thesis capture** (this doc) | research-build | **DONE S273** |
| 1 | research.19 **T5 question-bank** — the variety engine that conditions the signal (separate row; build in parallel) | research-build design → engine-sheet | T5 design in progress |
| 2 | **Signal→story mechanism design** — resolve §Open questions; **ADR here** ("stories emerge from citizen signal" vs "Mags curates editions" — load-bearing, hard-to-reverse) | research-build | next design |
| 3 | **Detector build** — tally/threshold over `Reflection_Intake` → seed into `Story_Seed_Deck` | engine-sheet | gated on Phase 2 |
| 4 | **Pilot + head-to-head** — one cycle's citizen-signal seeds vs one real edition; quality bar before any offload | media + research-build | gated on Phase 3 |

**Sequencing logic:** T5 (variety) and T2 (signal-conditioning) make the signal legible, so they come first / in parallel. The detector is worthless against a flat or monotone baseline. Don't build Phase 3 before the perception layer differentiates.

---

## Relationship to existing work (anti-duplication)

- **research.19** — the INPUT side (what a citizen perceives). This doc is its second readout (what we *harvest* from what they say). T2/T1a′/T1c condition the signal.
- **research.14** — the dial write-back loop (how reflection changes the citizen). Orthogonal: that loop closes inward (citizen→dials); this readout points outward (citizens→stories).
- **research.20** — report-through-citizens / deep-dispatch. This is the aggregation+consumption half that model needed. Deep-dispatch reshapes *how a desk writes*; this generates *what gets written about* from the bottom up. Complementary.
- **engine.35 Story_Seed_Deck** — the sink. Citizen-signal seeds are a new source feeding it; do not fork the seed pipeline.

---

## Changelog

- 2026-06-26 (S273) — Thesis captured (Mike: "grab this all now while it's pouring out"). The self-contained loop, the convergence-as-signal inversion (reframes T2 as signal-conditioning), the already-existing substrate (`Reflection_Intake` + classifier + `Story_Seed_Deck`), the reporting-model mapping (supplies research.20's missing aggregation+consumption), guardrails (emergent≠auto-publish, editions stay verified, publication wall holds, determinism unaffected), and the open signal→story mechanism questions (the next design, where the ADR lands). Filed as research.21. No ADR yet — mechanism undefined. **Added §What this changes downstream (Mike):** the wake loop decouples citizen-growth from edition-production — citizens grow themselves, so the edition shifts to covering the *world/events* and the citizen-usage-enforcement overhead (selection rubric + usage log + Rhea citizen verification + coverage audits/greps) gets lighter; this is the offload answer to the "citizen audits in print" cost question. Lightening is earned (don't cut audits until the wake demonstrably grows citizens). Aims T5's categories at wake-side citizen development.
