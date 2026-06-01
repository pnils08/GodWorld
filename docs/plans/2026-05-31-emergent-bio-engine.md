---
title: Emergent Bio Engine — the R→AT earned-story step (closes the citizen-essence loop)
created: 2026-05-31
updated: 2026-05-31
type: plan
tags: [engine, citizens, autonomy, draft]
sources:
  - "[[2026-05-31-citizen-autonomous-poc]] §Ledger connectivity loop — the O→R→AT loop; this builds the missing R→AT arc (research.13)"
  - "[[2026-05-31-autonomy-roadmap]] — Layer 3 citizen-essence; deploy = load R + AT"
  - "S249 Mike-direct: 'AT = CitizenBio is the earned background through the simulation, the story that emerges' + 'spec the R→AT emergent-story step as its own engine task'"
  - "utilities/compressLifeHistory.js — the live O→R compressor (Phase 9); this is its sibling R→AT step"
  - "scripts/enrichCitizenProfiles.js — editions → O feeder (the newsroom-feeds-essence arc)"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.30"
  - "[[index]] — register here in same commit"
  - "[[2026-05-31-compression-tag-triage]] (engine.31) — supplies the locking rule (milestone triggers) + clean O this step depends on"
  - "[[2026-05-30-citizen-lifecycle-fame-system]] (engine.29) — milestone events (Wedding/Birth/Death) that trigger AT accretion"
---

# Emergent Bio Engine — the R→AT earned-story step

## Context

The citizen-essence loop is **O (LifeHistory, raw events) → R (TraitProfile, live compression) → AT (CitizenBio, earned story)**. The S249 review (research.13 §Ledger connectivity loop) verified that **O→R is built and live** (`compressLifeHistory.js`, Phase 9, every 5 cycles) — but **R→AT is the unbuilt third.** AT is populated on only **32 of 903** citizens, and where present it's a *copy of the seed bio*, not earned; citizens with rich event histories (e.g. Hal Richmond) have AT **empty**.

AT is the piece Mike's "any citizen drawn up and deployed instantly steps back into their being" needs: **R gives voice + memory the moment they wake (built); AT gives the story of who they've *become* (missing).** Deploy = load R + AT. This task builds the engine that turns accumulated memory into a growing earned narrative.

**Intended outcome:** every citizen with a real event history accretes a coherent, canon-true CitizenBio over cycles — the emergent story — so the loop closes and a citizen is fully reconstitutable from its row.

## Scope

**In:** an engine step that reads R (+ milestone/[Compressed] events in O) and **accretes** an earned narrative into AT, preserving any authored seed-bio, bounded in length.

**Out:** the tag-routing / locking / category work (that's engine.31, a dependency); the life-loop agent (research.13); overwriting authored canon.

## The build

### Where + cadence
A new **Phase 9 step** (sibling to `compressLifeHistory.js`), e.g. `phase09-digest/buildEmergentBio.js`, running **after** the compressor writes R. Mutates `ctx.ledger`, commits at Phase 10 (engine.md write-intent discipline). **Cadence: event-triggered + periodic** — fire on a milestone this cycle (Wedding / Birth / Promotion / Retirement / Death / Graduation / Divorce — the "lock" events from engine.31), else every N cycles (slower than R's 5 — the earned story should not churn).

### Mechanism — accrete, don't overwrite
1. **Trigger check** — milestone event this cycle, or N-cycle cadence reached.
2. **Inputs** — R (archetype, traits, motifs, top tags), the `[Compressed:]` block(s) + recent milestone entries in O, and the current AT.
3. **Emit** — append a sentence / short paragraph to AT capturing what was *earned* this period, anchored to the real event or the trait shift ("After the promotion, she carried herself differently…"). **Never overwrite** prior AT.
4. **Bound length** — when AT exceeds a cap, summarize its oldest portion into a "background" prefix (mirrors O's `[Compressed]` trim pattern) so it grows without unbounding.

### Generation tier (decide at build; default cheap)
- **(a) Deterministic template assembly** from R + the triggering milestone — cheap, runs for all citizens, flat-but-true prose. **Default.**
- **(b) LLM prose** — richer, but per-citizen cost; reserve for milestone moments or notable citizens. **Note the natural tie-in:** the research.13 **life-loop narration could *be* the R→AT feed for run citizens** — what a citizen narrates about its own life *is* its emergent story. So AT has two possible feeders: the cheap template (all citizens) and the life-loop (run citizens). Keep them writing to the same AT.

### Earned vs seed — keep them distinct
Authored seed-bio (created at intake, e.g. Lucia's "Saint Lucia in human form" canon) must be **preserved and distinguishable** from the accreted earned-story — either a labelled prefix in AT (`[Seed] … [Earned] …`) or seed moves to its own field. Never let accretion clobber authored canon (self-preservation of canon).

### ⚠ Canon-safety fence (non-negotiable — C92-contamination guard)
**CitizenBio (AT) is a canon-facing, publication-eligible field** — desks read it into editions. An autonomous step writing prose into it is exactly the C92 shape (engine-generated text leaking into publication without a review gate). So:
- Earned accretion is **structurally fenced** — written into a marked `[Earned]` section or a separate `EarnedStory` field, **never** silently merged into the authored canon bio.
- Earned text is **NOT publication-eligible until it passes a review pass** (reviewer-lane / Rhea-class gate), same discipline as every other generated-content surface. Desks consume the *authored* bio + *fenced, reviewed* earned story — not raw accretion.
- "Canon-true, never invented" is necessary but **not sufficient** — a deterministic template can still emit something a desk prints as fact. The fence + review gate is the actual protection, not the prompt instruction.

## Acceptance criteria
1. A citizen with milestone/event history gains a non-empty, canon-true AT that **references real events** (not invented).
2. AT **accretes** across cycles — grows on triggers, does not churn or overwrite on every run.
3. Authored seed-bio is preserved and distinguishable from earned accretion.
4. Loading **R + AT** for an arbitrary citizen reads as a coherent person (the deploy/essence test).
5. Runs inside Phase 9 via `ctx.ledger` write-intents; no direct sheet writes; dry-run safe.
6. **Canon-safety fence holds:** earned accretion is structurally separated from authored bio and is not publication-eligible without a review pass (C92-contamination guard).

**Build order: engine.31 before engine.30** — this step consumes engine.31's locking rule (milestone triggers) and clean O.

## Dependencies
- **engine.31 (compression-tag triage)** — supplies (a) the **locking rule** that defines which milestones trigger accretion, and (b) **clean O** (de-contaminated event stream) so AT isn't fed bio-noise. Build engine.31 first (or in lockstep).
- **engine.29** milestone events (Wedding/Birth/Death) are the accretion triggers.

## Files
- **New:** `phase09-digest/buildEmergentBio.js` (the R→AT step).
- **Reads:** `ctx.ledger` O (LifeHistory) + R (TraitProfile); milestone signals from `ctx.summary`.
- **Writes:** AT (CitizenBio) via `ctx.ledger` (Phase 10 commit).
- Engine-sheet builds. Gated on Mike's go-ahead.

## Verification
- Run a cycle (dry-run then live) over a sample with known milestones; confirm AT accreted a true line per milestone, seed preserved, length bounded.
- Spot-check 5 citizens: does R + AT read as a coherent reconstitutable person?

## Changelog
- 2026-05-31 (S249, research-build) — Initial spec. Mike-direct: "spec the R→AT emergent-story step as its own engine task." Closes the citizen-essence loop verified built-except-this-arc in research.13. Filed engine.30. Depends on engine.31 (locking rule + clean O). Building gated on Mike's go-ahead.
