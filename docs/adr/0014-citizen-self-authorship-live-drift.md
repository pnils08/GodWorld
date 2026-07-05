---
title: "ADR-0014: Citizens author themselves through lived cycles — canon dial-base is a starting character, not a ceiling"
created: 2026-07-04
updated: 2026-07-04
type: reference
tags: [architecture, citizens, dials, citizen-loop, voice-agents, canon, decision, active]
sources:
  - "[[../research/2026-07-04-voice-dial-sync-contract]] — the audit that surfaced the conflict and both build tracks"
  - "[[../plans/2026-06-16-tier1-character-voice-agents]]:180 — the superseded S264 base-lock decision"
  - "[[../plans/2026-06-04-mags-citizen-loop]] — research.14, the write-back loop this ADR keeps live and generalizes"
  - "scripts/citizen-wake.js, lib/citizenDials.js, lib/personaProvider.js:173 — the mechanisms this ADR builds on"
  - "Mike-direct S291: 'the citizen is the same person on any UI' / 'b is the north star, the citizens start to build themselves through the cycles now'"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.43 row"
  - "[[../plans/2026-07-04-voice-dial-sync-contract-build]] — the build plan executing this ADR"
  - "[[../index]] — registered same commit"
---

# ADR-0014: Citizens author themselves through lived cycles — canon dial-base is a starting character, not a ceiling

**Status:** Accepted (decision); implementation phased (see Consequences)
**Date:** 2026-07-04 (S291)
**Deciders:** Mags Corliss (research-build), Mike (direct ruling this session)

## Context

Four citizens (Vinnie Keane, Benji Dillon, Deacon Seymour, Elias Varek) exist as both a hand-authored persona (`.claude/agents/citizen-voice-*/IDENTITY.md`) and a `Simulation_Ledger` row. research.16 (S264) built the persona; a companion decision in that same plan (`docs/plans/2026-06-16-tier1-character-voice-agents.md:180`) worried that the 24/7 wake loop's planned dial write-back could drift a voiced citizen's `DialState` away from their authored canon, making "loop-Deacon" read differently from "interview-Deacon." The recorded fix was a **base-lock**: freeze the authored `base` dial permanently, let only transient `mood` swing. That base-lock mechanism (Phase 3 of that plan) was never designed or built.

Independently, research.14's write-back loop (Seam C) shipped and went live+self-sustaining S277 (`docs/plans/2026-06-04-mags-citizen-loop.md`, "LOOP CLOSED S277") — it drains lived wake-reflections directly into `DialState.base` for every citizen, uniformly. No Tier-1 or voiced-citizen exclusion exists anywhere in `citizen-wake.js`, `utilities/citizenMemory.js`, or `utilities/compressLifeHistory.js` (checked directly, S291). So today, in production, the four voiced citizens' `base` dial **is** drifting off their authored canon — the exact outcome the S264 base-lock was meant to prevent, happening silently because the lock was never built.

This session's audit (`docs/research/2026-07-04-voice-dial-sync-contract.md`) surfaced the conflict directly to Mike rather than resolving it silently. Mike's ruling: **"the citizen is the same person on any UI"** — and, on naming the fork explicitly (lock the base vs. let it drift and sync the voice surfaces to match): **"b is the north star, the citizens start to build themselves through the cycles now."**

## Decision

**Supersede the S264 base-lock plan.** A citizen's authored canon (IDENTITY.md disposition block, or a backfilled essence per research.18) is their **starting character, not a permanent ceiling.** Dials drift for every citizen through lived cycles, including the four voiced Tier-1 agents and the wider research.18-backfilled roster — no base-lock, no special-case freeze. "Same person on any UI" is achieved by making every surface **read the live current state**, not by freezing the state so every surface can safely assume it never changes.

Two build tracks (detailed in the companion build plan, `docs/plans/2026-07-04-voice-dial-sync-contract-build.md`):

1. **Live-disposition sync.** Interview and Discord surfaces currently read a static "Your disposition" prose block in `IDENTITY.md`, authored once and never revisited — while the 24/7 wake already re-derives disposition live every wake via `lib/citizenDials.js:disposition()`. Extend that same live derivation to the interview/Discord surfaces so all three stay consistent with the *current* ledger, not the founding one. The `IDENTITY.md` "ESTABLISHED CANON — immutable" biography section is untouched by this — only the disposition section becomes a live-derived artifact.
2. **Agent-output → ledger ingest.** What a citizen says in an interview or Discord conversation becomes real for them, the same way a wake reflection already is: classify the exchange with the existing dual-tag classifier (`lib/reflectionClassifier.js:classifyDualReflection_`) and append to `Reflection_Intake` in the same row shape `citizen-wake.js` already uses (`[ts, popId, cycle, daypart, event, snippet, applied, affect]`), tagged with a distinguishing `daypart` (e.g. `INTERVIEW` / `DISCORD` in place of `WAKE`). The already-live drain (`compressLifeHistory_` → `accreteReflectionsIntoBase_`) picks it up on the next compress — no new drain code.

**What this decision does NOT reopen:** S270's separate ruling that Discord chat prose must never enter a citizen's Supermemory narrative page (`lib/personaProvider.js:173`, `persistResponse` — "chat is conversational, not reflection; writing it would contaminate the wake-loop memory layer"). That page still feeds only the wake loop and editions. This ADR unifies the **dial layer** and the **disposition-prose derived from it**; it does not route raw conversational transcript into narrative memory. The two S270 concerns (contamination of the edition-feeding page) and this ADR's concern (staleness of the disposition-feeding ledger) are different layers and both stay satisfied.

## Consequences

**Positive.**
- Matches Mike's direct north star: citizens are one continuous person regardless of which surface you meet them through, and they visibly grow through lived cycles rather than staying frozen at their founding write.
- Reuses proven, already-live machinery — `lib/citizenDials.js:disposition()`, the dual-tag classifier, `Reflection_Intake`, the S277 drain — rather than inventing a parallel sync mechanism or a lock that was never built anyway.
- Resolves the original S264 interview-fidelity worry a different way: loop-voice and interview-voice stay consistent because **both now read the same live source**, not because the source is frozen.
- Extends automatically to any future citizen-voice agent built from the research.18-backfilled roster — the mechanism is agent-count-agnostic, not four-citizens-specific.

**Risks / costs.**
- The disposition section of `IDENTITY.md` moves from "hand-authored, fixed" to "periodically machine-derived" — needs a clear boundary (only that section regenerates; `ESTABLISHED CANON` never does) and a refresh cadence, specified in the build plan.
- Ingest granularity must stay per-session, not per-message — `persistResponse()` fires per Discord message today (`scripts/mags-discord-bot.js:822`); naive per-call ingestion would classify far more often than the ~3×/day system-wide wake cadence and swamp the bounded `REFLECTION_ACCRETION_FRAC` fold with conversational noise. The build plan specifies a session-boundary batching design, not raw per-turn capture.
- A citizen's founding canon can now visibly age away from what was published about them at authoring time. Accepted as the intended behavior, not a defect — it is what "build themselves through the cycles" means.

**Rejected alternatives.**
- **Build the originally-planned base-lock** (freeze `base`, swing only `mood`). Rejected — directly reverses Mike's ruling this session; would also require *retroactively* un-drifting the four citizens' `base` back to their S266 backfilled canon, discarding real cycles of already-accrued drift.
- **Route raw interview/Discord prose into the citizen's Supermemory narrative page** (the "deeper reversal" the research file flagged as the broader reading of "same person"). Not adopted — reopens the exact contamination S270 already ruled out for a good reason (the page feeds editions; conversational banter has no business becoming published-canon source material). Classified-tag-only ingestion satisfies "same person" at the dial layer without that risk.

Implementation: [[../plans/2026-07-04-voice-dial-sync-contract-build]] (engine-sheet build; research-build design, this ADR). Evidence base: [[../research/2026-07-04-voice-dial-sync-contract]].

## Changelog

- 2026-07-04 — Initial decision (S291, research-build). Mike-direct ruling on the (a)/(b) fork surfaced from the audit.
