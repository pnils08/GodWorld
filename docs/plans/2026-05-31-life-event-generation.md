---
title: Life-event generation — audit + the traits→events back-arc + the Conduct generator (closes the loop)
created: 2026-05-31
updated: 2026-06-01
type: plan
tags: [engine, citizens, autonomy, conduct, draft]
sources:
  - "S249 Mike-direct foresight: 'audit the life events all engines output, the clock factor in their events, the fame factor in their events, if there are memory slots of the 8 we dont have output for it should be added, then once these traitprofile tags are set this would also affect the life history events math, the events should make sense to the citizens life'"
  - "utilities/compressLifeHistory.js — ships getCitizenArchetype_ '(for event generation)'; called by storyHook.js (3 sites) but by NO event generator — traits→story-hooks is wired, traits→event-generation is not"
  - "[[2026-05-31-compression-tag-triage]] (engine.31) — REDESIGNED S250 to the bounded-memory engine (5 categories incl Conduct, promotion ladder, R-as-derived-face). This is the O-producer + R→events-consumer side."
  - "[[../engine/TAG_REGISTRY]] (S250) — the tag→category map + the **Conduct vocab this plan's moral-test generator (T7) emits against** (Transgression-Petty/-Serious/-Grave + Resisted)"
  - "[[2026-05-31-emergent-bio-engine]] (engine.30) — the R→AT side"
  - "S249 verification: ClockMode + UsageCount/fame are read by generateGenericCitizenMicroEvent / generateMediaModeEvents / generateCitizensEvents (+ mode-specific generators) — clock/fame partially wired"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.32"
  - "[[index]] — register here in same commit"
  - "[[2026-05-31-citizen-autonomous-poc]] §Ledger connectivity loop (research.13) — the O→R→AT loop this back-arc closes into a cycle"
  - "[[2026-05-07-chaos-cars-engine]] (engine.11) — asymmetric-decay / anti-cookie-cutter discipline the R↔events feedback must borrow for stability"
---

# Life-event generation — audit + the traits→events back-arc

## Context

The citizen-essence loop has three sides. engine.31 is the **compressor** (O→R). engine.30 is the **earned story** (R→AT). This plan is the **event-generation side** — the **O producers** — and, crucially, the **missing back-arc that makes the loop bidirectional:** today events shape traits (O→R); Mike's S249 foresight is that **traits should shape events** (R→events), so a citizen's personality begets characteristic events and **the events make sense to that citizen's life.**

**Headline finding (verified S249):** `compressLifeHistory.js` ships `getCitizenArchetype_`, an accessor commented *"for event generation"*. It **is** called — but only by `phase07-evening-media/storyHook.js` (3 sites). **No event *generator* (`phase04-events/*`, `phase05-citizens/*`) calls it.** So traits already shape *story hooks* — the pattern works and is proven — but the **traits→event-generation arc specifically is unwired.** (Two generators, `generateGameModeMicroEvents` + `generateCitizensEvents`, read `TraitProfile` ad-hoc, not via the accessor.) Mike's #5 is the real gap; the working accessor makes it cheap to wire.

Closing this turns the loop into a true cycle: **events → R → AT, and R → events.** A deployed citizen then both *reads* as itself (R+AT) and *keeps living* in-character (R-shaped events).

## Scope

**In:** an audit of the life-event system across all generators (what fires, and how clock / fame / traits / circumstances gate it), a slot-coverage check against the 8-slot memory model, and the design to wire **traits→events** with stability damping.

**Out:** the compressor tag fixes (engine.31), the R→AT step (engine.30). This is the generator side. All execution is engine-sheet, gated.

## The foreseen items (T1–T6, S249) + the S250 Conduct addition (T7)

- **T1 — Audit the life events all engines output (NEW).** No inventory exists. Catalogue every event each generator emits (`phase04-events/*`, `phase05-citizens/*`) — the event, its trigger, its tag, its target. The tag audit (engine.31) covered *tags*; this covers the *events* and their selection logic. Output: a single event-system map. **Mike S249:** the inventory should also map, **per Simulation_Ledger column**, what random outcomes could fire off it — every column is a potential event axis (the chaos-cars per-column generalization), so the audit doubles as a column→outcome-space map for the random-event engine.
- **T2 — Clock factor (WELL-WIRED → audit for coherence).** `ClockMode` is read across ~12 generators (`generateGenericCitizenMicroEvent`, `generateMediaModeEvents`, `generateCitizensEvents`, `generationalEventsEngine`, `runEducationEngine`, `runNeighborhoodEngine`, `runRelationshipEngine`, `runHouseholdEngine`, `runCareerEngine`, `checkForPromotions`, …) and the mode-specific generators (Media/Game/Civic) *are* the clock split. So clock is the most-wired factor — the work is auditing **consistency/coherence**, not building it. Confirm ENGINE-mode citizens (the life-loop's audience) have a full event vocabulary.
- **T3 — Fame factor (GAP → likely build).** `UsageCount`/fame is read by **intake/context** code (`processIntakeV3`, `citizenContextBuilder`, `processAdvancementIntake`) — **not by the event generators.** So fame shapes intake/context but **does not clearly gate event selection** today. Audit confirms, then likely **build**: famous citizens should draw different events than invisible ones; wire it coherently with the fame system (engine.29).
- **T4 — Memory-slot coverage (NEW additions).** Map events → the **5 memory categories (Social / Work / Family / Health / Conduct** — the 5th added in the engine.31 S250 redesign). engine.31 found **Work has no live tag**, **Family/Health are thin**, and **Conduct has ZERO output** (no generator emits a crime — confirmed S250). **If a slot has no output, add the generation for it** (Mike's directive). The Conduct gap is the largest and is broken out as its own marquee task → **T7**. Output: a coverage matrix + new generators/events for the gaps.
- **T5 — Traits→events back-arc (NEW — the big one).** Wire R (archetype + trait axes) into event *selection*, so personality shapes which events a citizen draws. The accessor exists and **already works** (`getCitizenArchetype_`, used by `storyHook.js`) — it's just **never called by an event generator**; two generators (`generateGameModeMicroEvents`, `generateCitizensEvents`) read `TraitProfile` ad-hoc. So this is wiring a proven accessor into the generators, not building from scratch. **⚠ Stability guard:** this makes the loop a feedback system (traits→events→traits) — it can amplify into runaway or cookie-cutter sameness. Borrow the chaos-cars **asymmetric-decay / anti-cookie-cutter** discipline (engine.11) and the bounded-memory **promotion ladder** (engine.31 Phase 3 — only sustained *core* memories compound; non-core decays) to damp it. **Flagship case of the back-arc = the Conduct momentum loop (T7):** R's conduct-core biases the next moral test's commit-vs-resist, severity, and frequency (the dark-momentum, "bad begets bad"). The Emergence/Grok drift lesson applies: tighter feedback over long horizons makes the canon/bounding layer more load-bearing.
- **T6 — Event coherence (NEW).** Events must make sense for the citizen — age, job, family, neighborhood, *and* traits (T5). A retired 68-year-old shouldn't draw a youth event; an Anchor-archetype homebody shouldn't draw constant nightlife. Depends on T5 + the generators reading circumstance fields (partially done). Output: coherence gates in event selection.
- **T7 — The Conduct generator: the moral-test engine (NEW — S250, the marquee build).** Conduct (the 5th memory category) has zero event output today — the city carries a `Crime_Metrics` *rate* but not one tracked citizen ever commits a crime, so every one of 903 lives is, mechanically, clean. This builds the **low-probability moral-test generator**: at a slow base rate a citizen draws a moral test that resolves — **R-biased (T5)** — as either a **transgression** (severity ladder: `Transgression-Petty` stole-butter → `-Serious` theft/fraud → `-Grave` embezzlement/violence) or a **`Resisted`** (tempted, didn't → accretes integrity). Emits against the `TAG_REGISTRY` Conduct vocab; engine.31's bounded-memory engine receives it, and a *sustained pattern* promotes to a **dark core** (`Outlaw`) — "no one is safe" becomes mechanism here, while the bound keeps a single petty act from damning anyone. **Population counterweight (RimWorld adaptation-factor, `research4_1.md:211`):** the per-citizen bound stops *individual* runaway, but city-level "bad begets bad" has no floor — when `Crime_Metrics` spikes, the engine should lean positive (opportunities / interventions / community wins), a real city's resilience. Without it the moral-momentum can cascade the whole tracked cohort dark. **Depends on engine.31's Conduct slots existing (engine.31 Phase 4); builds after.** This is the dark thread the whole arc was for.

## The full loop, once this lands

```
event generators ──► O (LifeHistory)          [T1-T4, T6 — this plan]
O ──compress──────► R (TraitProfile)           [engine.31]
R ──earn──────────► AT (CitizenBio)            [engine.30]
R ──shape────────► event generators            [T5 — this plan: the back-arc]
R(conduct-core) ─biases─► moral test ─► O(Conduct)  [T7 — the dark loop: bad begets bad]
```
That R→generators arrow is the cycle closing — the citizen's compressed essence feeding the events it then experiences. The T7 line is that same arrow pointed at the dark side: a citizen's accumulated conduct biases whether the next moral test is failed, deepening (or, via resistance, redeeming) the core.

## Dependencies + sequencing
- **The audits (T1, T2, T4) have NO dependency on engine.31** — they're pure read-only audits of the existing generators; they can start **immediately** and would *inform* engine.31's tag work. T3 (fame) is also audit-first. Don't gate them behind the compressor.
- **T5/T6/T7 (the back-arc + Conduct generator) depend on engine.31** — they read R, which must route cleanly (tags fixed per `TAG_REGISTRY`) and lock (engine.31's promotion ladder, Phase 3) first, or the feedback amplifies noise. **T7 additionally needs engine.31's Conduct slots to exist (engine.31 Phase 4).**
- **engine.30** consumes the same R; engine.32 T5 + engine.30 both read R — keep the R schema decision (engine.31 T3/T6) shared.
- Suggested order: **(engine.32 audits T1-T4 ‖ engine.31) → engine.30 → engine.32 T5/T6 back-arc → engine.32 T7 Conduct generator** (needs engine.31 Phase 4 Conduct slots live first).

## Acceptance criteria
1. A complete life-event inventory exists (T1) — every generator's events, triggers, tags, targets, and clock/fame/trait/circumstance gating in one map.
2. Every memory-slot category has event output, or a documented decision not to (T4).
3. Clock + fame gating is audited and gap-closed (T2/T3).
4. `getCitizenArchetype_` (or its successor) is called **from event generators** (not only storyHook) — traits demonstrably shape event selection (T5).
5. **Loop-stability is MEASURED, not asserted (the gate with teeth).** Damping "in place" is unfalsifiable — instead, once the back-arc is live, **run N citizens for M cycles with R→events active and measure whether trait distributions converge, diverge, or oscillate** (same discipline as the research.13 PoC: don't certify the loop closed until you've watched it run closed). The Emergence/Grok lesson is that nobody can predict which way three coupled feedback paths (events→R→events, R→AT) run until they run. T5 does not ship until this measured run passes.
6. Event-coherence gates reject circumstance-mismatched events (T6) — spot-check: no youth events on retirees, no nightlife spam on homebodies.
7. **The Conduct generator produces crime (T7).** Moral tests fire at a low base rate, resolve R-biased to transgression (with severity) or resistance; a *sustained* transgression pattern promotes to a dark core while a single petty act does not; and the city-level counterweight measurably leans positive when `Crime_Metrics` spikes (no runaway cohort-wide darkening). Same measured-run discipline as #5 — verify on a multi-cycle trace, don't assert.

## Files (engine-sheet build, gated)
- **Audit output:** a new event-system map doc (T1) under `docs/engine/`.
- **Touches:** `phase04-events/*`, `phase05-citizens/*` generators; the `getCitizenArchetype_` accessor in `utilities/compressLifeHistory.js`.
- Reads `ctx.ledger` (R + circumstance fields); writes events via existing write paths (engine.md discipline).

## Changelog
- 2026-06-01 (S250, engine-sheet) — **Reconciled to the engine.31 S250 redesign** (the bounded-memory engine). Changes: T4 memory categories 4→**5** (added **Conduct**, which has zero output today); **added T7 — the Conduct/moral-test generator** as the marquee build (low-prob R-biased transgression↔resistance, severity ladder, dark `Outlaw` core, + the RimWorld population counterweight so city-level "bad begets bad" has a floor); fixed dead pointers (engine.31 "T4/T6 locking" → the **promotion ladder, Phase 3**); added the T7 acceptance criterion + dependency (needs engine.31 Phase 4 Conduct slots); linked `TAG_REGISTRY` (the Conduct vocab T7 emits against). Bones unchanged — the back-arc thesis (T5), the audits (T1–T3), and the measured-loop-stability gate (#5) were sound and are reinforced. *Reconciliation done in design space (not mid-deploy) per the S250 rollout-attribution discipline; no code.*
- 2026-05-31 (S249, research-build) — Initial capture of Mike's S249 forward-ripple foresight. Six items (T1-T6), existing-vs-new marked from live verification: clock well-wired (~12 generators), fame read by intake/context but NOT event generators (gap), and the traits→events back-arc unwired into generators — `getCitizenArchetype_` works (called by storyHook, 3 sites) but no generator calls it, confirming the bidirectional loop was intended and is cheap to wire. Filed engine.32. Closes the citizen-essence loop into a true cycle (events↔essence). Stability-damping flagged for the R↔events feedback (Emergence/Grok + chaos-cars lesson). Engine-sheet builds; gated on Mike's go-ahead.
- 2026-05-31 (S249) — Advisor-review fixes folded in: (a) T5 acceptance is now a **measured loop-stability run** (watch it run closed), not an unfalsifiable "damping in place"; (b) audits T1/T2/T4 **decoupled** from engine.31 — read-only, can start now and inform the compressor work. **Process note for the engine sessions executing this:** three load-bearing claims in this thread were initially written WRONG because the Write went out in the same batch as the verifying grep (compressor "stopped"→live; edition-tag format; `getCitizenArchetype_` "zero callers"→has storyHook callers). All caught on re-grep, but the lesson is **sequence: grep → read result → then write the claim.** Re-verify any inherited claim here against source before building.
