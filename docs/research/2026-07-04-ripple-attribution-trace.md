---
title: Ripple Attribution Trace — what the engine computes, persists, and throws away
created: 2026-07-04
updated: 2026-07-04
type: research
tags: [engine, ripples, attribution, story-seeds, persistence, token-burn, active]
sources:
  - "Mike S291 (2026-07-04) — 'the engine is the world and holds all the truth … it's backwards to ask an LLM to find that over the source that contains it. The seeds are the top priority. Every story ever covered is covering the event and a reaction in the moment; none cover the ripple effect of who's affected and how — the real story of the city.'"
  - "Five parallel read-only code traces (S291, engine-sheet): civic initiatives, crime/chaos, economy, sports, citizen-event persistence. Each grounded in ENGINE_TRUTH_MAP + ENGINE_COUPLING_MAP + ENGINE_STUB_MAP, then verified against code. All file:line citations below come from those traces."
pointers:
  - "[[ripple-traces/TEMPLATE|docs/research/ripple-traces/]] — the raw per-domain traces this synthesizes, preserved verbatim (economy, sports, civic-initiatives, crime-chaos, citizen-event-persistence) + the TEMPLATE for tracing the remaining domains"
  - "[[../plans/2026-07-04-ripple-ledger-attribution]] — the plan this research produced (engine.45)"
  - "[[../plans/2026-06-15-story-seed-deck-engine-emergence]] — engine.35, the substrate this extends (built Phases 0–3, Phase 5 spec'd/gated)"
  - "[[../plans/2026-07-03-sift-deep-dispatch-reconcile]] — the consumption-side sibling (research-build); this work is the producer side that feeds it"
  - "[[../engine/ENGINE_COUPLING_MAP]] — behavioral map; §M6 correction below updates its L242 TODO"
  - "[[../engine/ENGINE_TRUTH_MAP]] — per-file behavioral truth"
  - "[[../index]] — registered same commit"
---

# Ripple Attribution Trace

## Thesis (Mike S291)

The engine holds all the truth about the world — citizens, neighborhoods, civic impacts. It is
backwards and expensive to ask an LLM to hunt for what the source already contains. The story
seeds must hand each desk the slice it needs, pre-computed, so the LLM spends tokens on prose,
not the hunt. And the real story is never just the event — it's the **ripple**: who was affected,
how, over how many cycles. If city hall produced a negative ripple, the negative ripple is the
story, not the press release. Two supporting principles named the same session: **coherence**
(a citizen can't enjoy a walk in a storm or a crime spike; a Lake Merritt citizen doesn't worry
about West Oakland unless it's a crisis) and **synthesis** (media receives high-level promotion
gated by severity or volume-of-similar-events — major events, not raw feed).

## Method

Five parallel read-only traces (civic initiatives, crime/chaos, economy, sports, citizen-event
persistence), each answering three questions per causal mechanism: what does the engine
**compute**, where is it **persisted with cause→effect attribution**, and does it reach a
**media surface** (engine_audit / baseline_briefs / Story_Seed_Deck). Grounded in the S277 truth
docs, verified in code, every claim file:line-cited.

## Verdict

**The engine computes the ripple story every cycle and destroys it at the cycle boundary.**
Cause is stripped at almost every sheet write; multi-cycle ripple state is never serialized, so
duration/decay machinery across three domains is unreachable dead code; several couplings the
architecture depends on are hollow (reading fields nothing writes) or dead (computed into
variables nothing reads). The newsroom's current inputs are post-hoc reconstructions —
residence inference and markdown scraping — and at least one (the engine.35 WHY layer) has been
attributing effects to the **wrong driver** because the real chain was a dead write.

Three subsystems prove the correct pattern already works here: **Chaos_Cars** (source-of-truth
row: vehicle, target, scope, outcome, magnitude, cycle — full reconstruction possible),
**Initiative_Tracker** (decisions persist fully attributed with cycle-stamped notes), and
**Story_Hook_Deck** (hook text carries team+streak / initiative+outcome). Where the engine
writes cause alongside effect, the ripple story survives. The build is to make that the rule.

---

## Domain findings

### 1. Economy (trace: economicRippleEngine, gentrification, migration, wealth)

| # | Finding | Evidence |
|---|---|---|
| E1 | **Ripples live exactly one cycle by accident.** Ripple objects carry `duration 4–12` and `endCycle`, but `S.economicRipples` is never serialized into `PREV_CYCLE_STATE_JSON` (`finalizeCycleState.js:47-101`) or `currentCycleState` (`applyShockMonitor.js:394`) — every cycle starts empty, `elapsed=0`, `decayFactor=1`. Decay/duration/dedup code structurally unreachable. | economicRippleEngine.js:118,537,550-552 |
| E2 | **Migration→economy loop has never fired.** `detectMigrationRipples_` reads `previousCycleState.migrationDrift` (`:156`) which is never serialized → always 0. POPULATION_SURGE/EXODUS/WORKFORCE ripples, the mood migration terms (`:594-605`), and the employment migration adjust (`:669-683`) are all dead. Ordering makes same-cycle use impossible too (drift computes after ripples). | economicRippleEngine.js:156,213-228 |
| E3 | **Cause stripped at every durable write.** `employmentRate`/`economy` → World_Population bare (`:699,710`); `MigrationFlow` → Neighborhood_Map col P bare integer (`applyMigrationDrift.js:402`); `DisplacementRisk`/`MigrationIntent` → SL scalars, factors recomputed not stored. | trace §2 table |
| E4 | **Story hooks with cause-in-description (gentrification crisis, forced migration, mass exodus) are never written anywhere** — ctx-transient, rendered into the throwaway media text packet only. | migrationTrackingEngine.js:392-449; buildCyclePacket.js:541,578 |
| E5 | Hollow features: `trackWealthMobility_`/`trackHomeOwnership_` are stubs; `processMigrationEvents_`/`checkForDisplacedCitizens_` placeholders — risk is assessed, **no citizen ever relocates**, `Migration_Events` log is a TODO. | generationalWealthEngine.js; migrationTrackingEngine.js:337-354 |
| E6 | The example chain "migration → density → retail" is not computed: `RetailVitality` is written only by the pulse/chaos fold (`v3NeighborhoodWriter.js:351`) and is an *input* to migration, not an output; no density field exists. | applyMigrationDrift.js:344 |

### 2. Civic initiatives (trace: civicInitiativeEngine, approval ratings)

| # | Finding | Evidence |
|---|---|---|
| C1 | **Decisions persist perfectly; consequences evaporate.** Votes/vetoes/overrides land fully attributed on Initiative_Tracker (Status/Outcome/Consequences/veto cols/cycle-stamped Notes, `setValues` L486-488) and are visible to audit/briefs. | civicInitiativeEngine.js:323-482 |
| C2 | **Neighborhood ripples are compute-and-evaporate.** `applyNeighborhoodRipple_` builds fully-attributed multi-cycle records (initiativeName + hoods + domain effects, duration 6–20, L1597-1610) into `S.initiativeRipples` — **zero sheet backing, never reloaded**. Decay machinery only ever sees ripples born the same cycle. | civicInitiativeEngine.js:1486-1736 |
| C3 | **Coupling-map correction:** `applyActiveInitiativeRipples_` IS wired — `godWorldEngine2.js` L326-330 / L1670-1671, Phase6-InitiativeRipple (updates ENGINE_COUPLING_MAP L242 "possibly unwired" TODO). But it applies **city-wide scalars only**. | godWorldEngine2.js:326-330 |
| C4 | **`getRippleEffectsForNeighborhood_` is dead** — zero callers. The per-neighborhood query API the ripple system was built for is unwired; initiative effects never reach neighborhood or citizen state. | civicInitiativeEngine.js:1747 |
| C5 | **Approval attribution discarded.** `updateCivicApprovalRatings_` computes `reasons[]` naming each causing initiative (±1..4 per initiative × faction alignment), writes only the clamped number to Civic_Office_Ledger. "Initiative X cost councilmember Z 4 points" dies in ctx. | updateCivicApprovalRatings.js:162-210,294,328 |
| C6 | Known defects re-confirmed: veto `voteMargin` always NaN (blowout deterrent never fires); `publicSupport` hardcoded 50 (deterrent unreachable); `createInitiativeTrackerSheet_` never creates veto cols T–X. | civicInitiativeEngine.js:2316-2353,1797-1817 |

### 3. Crime / chaos (trace: updateCrimeMetrics, chaosCarsEngine, cityDynamics, conduct)

| # | Finding | Evidence |
|---|---|---|
| K1 | **Crime→cityDynamics coupling runs on empty.** `applyCityDynamics` reads `S.crimeSpikes`/`S.crimeEvents`/`S.crimeByNeighborhood` — **no writer exists anywhere**; the crime feedback + crime ripple branches execute on `[]` every cycle. Phase ordering (dynamics P2, crime metrics P3) makes it impossible even in principle. | applyCityDynamics.js:104-108,494-513,864-879 |
| K2 | **Crime_Metrics is near write-only.** Rich per-hood indices/hotspots/enforcement/reporting persist to the tab; the only downstream read is the citywide average in conduct. `generateCrimeEvents_` + `getCrimeStorySignals_` (discrete attributed crime events + headlines) have **no cycle-path callers** — dead pools. | updateCrimeMetrics.js:601-790; runConductEngine.js:92-93 |
| K3 | **Two crime worlds barely connect — locality inverted.** Citizens react to Neighborhood_Map `CrimeIndex` (0–1, pulse+chaos-fed), not Crime_Metrics (0–95). A West Oakland spike reaches a West Oakland citizen only as the diluted **citywide** average term in `crimeSpikeFor_` — the exact inverse of the locality principle (Lake Merritt and West Oakland feel the same signal). | runConductEngine.js:92-103; loadNeighborhoodState.js:73-75 |
| K4 | **Chaos_Cars is the attribution gold standard.** Source-of-truth row per event: cycleId, vehicleType, targetScope, targetId, targetTier, diceOutcome, primaryMetric, metricMagnitude, consequenceFloorFired, narrativeSeed. Citizen hits also stamp provenance into the LifeHistory_Log EventTag (`{tag}|chaos_cars|{vehicle}`) + chaosExposure on DialState. Full cause→effect reconstruction possible. | chaosCarsEngine.js:218-274,479 |
| K5 | Attribution lost at every fold except Chaos_Cars: the `chaosEvents` aggregate, the pulse fold into CrimeIndex, conduct suppression (a spike lowers transgression odds but the cause is never stamped). | updateCrimeMetrics.js:159-164; v3NeighborhoodWriter.js:338-350 |

### 4. Sports (trace: applySportsSeason, game-mode events, story hooks)

| # | Finding | Evidence |
|---|---|---|
| S1 | **Sports→city-sentiment is a dead write.** `S.sentiment += totalSentiment` (`applySportsSeason.js:290`) — nothing reads `S.sentiment`; cityDynamics folds only `editionSentimentBoost` (`applyCityDynamics.js:1332-1334`). A's streaks have never moved persisted sentiment. `S.sportsSentimentBoost` is likewise orphaned. | applySportsSeason.js:284,290 |
| S2 | **Therefore the engine.35 WHY layer mis-attributes.** `routePatternSeeds.js:374-421` scrapes the streak from `world_summary` markdown and pairs it with the citywide sentiment delta — but per S1 the actual driver is edition-coverage/holiday/weather. Post-hoc reconstruction, wrong answer. Same failure class as G-RC5 (decay-pole mis-attribution, C98). | routePatternSeeds.js:374-421 |
| S3 | Sports neighborhood effects (game-day traffic/retail/nightlife per hood) merge into anonymous metric numbers — no reader can tell a retail bump came from a game day. `sportsNeighborhoodEffects` has no sentiment field at all. | applySportsSeason.js:466-497 |
| S4 | **Healthy path: Story_Hook_Deck.** Sports hooks persist with cause intact in text ("A's on a W4 … fan energy rising") via `v3StoryHookWriter.js:52-54`. | storyHook.js:579-608 |
| S5 | `citizenFameTracker` exists only under `legacy/` — sports→fame chain is removed; `.claude/rules/engine.md` exceptions list still cites it (stale, fix with next engine.md touch). | trace §M8 |

### 5. Citizen-event persistence (trace: generateCitizensEvents, pulse, Phase 10, auditor)

| # | Finding | Evidence |
|---|---|---|
| P1 | **LifeHistory_Log is the richest record and already correlation-grade.** Row = timestamp, POPID, name, `primaryTag\|source:qol\|qol:low\|…`, text, neighborhood, cycle. The `source:` tags encode the firing pool (qol/weather/faith/media/fame/holiday/patrol). | generateCitizensEvents.js:2400-2418 |
| P2 | **SL col O is thinner** — drops the source tags, cycle, neighborhood; primaryTag + text only. Can't even do the correlation join alone. | generateCitizensEvents.js:2404-2406 |
| P3 | **Pulse composition dies with ctx.** `S.neighborhoodPulse` accumulates each hood's event wave as scalar bags, folds (dampened, commingled with chaos-cars) into 4 Neighborhood_Map columns at Phase 8, and is never written anywhere — code self-documents "dies with ctx.summary." Effect magnitude unrecoverable. | neighborhoodPulseMap.js:110-125; v3NeighborhoodWriter.js:335-353; generateCitizensEvents.js:2372 |
| P4 | **The auditor fakes the who.** `resolveAffectedCitizens.js` infers affected citizens by neighborhood **residence**, not actual event participation; only generateBaselineBriefs reads LifeHistory_Log at all. The real linkage exists and goes unused. | resolveAffectedCitizens.js:14,38-55 |
| P5 | **Attribution verdict:** a "crime spike → citizen events" story is reconstructable today at **correlation grade** ((hood, cycle, source-tag) join across LifeHistory_Log × Crime_Metrics/WorldEvents_Ledger) — not at causation grade: no cause id, no trigger-value field, no persisted magnitude. Confirms the S260 finding. | trace §5 |

---

## Failure classes (the synthesis)

1. **Compute-and-evaporate.** Multi-cycle ripple state (economic ripples, initiative ripples, sports neighborhood effects, approval reasons, migration drift, story hooks-with-cause) lives only in `ctx.summary` and is not in either cycle-state serializer. All duration/decay machinery downstream of it is unreachable.
2. **Cause stripped at write.** Nearly every durable write lands the *result* (a bare number or state label) and discards the *driver* that the code had in hand at that moment.
3. **Dead and hollow couplings.** Writes nothing reads (sports sentiment); reads nothing writes (crime→dynamics); built-but-unwired consumers (per-hood ripple query, crime event/headline generators); placeholder features (migration relocation, wealth mobility).
4. **Locality inversion.** Hood-specific signals reach citizens as citywide averages (crime), while the coherence layer that *should* localize (S280 lived-vs-heard grain) exists only for chaos reactions.
5. **Post-hoc reconstruction as system design.** The newsroom's "who was affected" is residence inference; the WHY layer is markdown scraping — and it demonstrably attributed the citywide sentiment lift to a driver (sports) that has never actually moved sentiment (S1→S2). When the engine doesn't persist the truth, downstream tooling *invents* it — the precise failure Mike's thesis names.
6. **The working pattern.** Chaos_Cars / Initiative_Tracker decisions / Story_Hook_Deck: cause travels with effect at write time, cheap deterministic compute, fully reconstructable later. Generalizing this is the build.

## Design requirements (Mike S291)

- **R1 — Per-desk slices.** Each desk receives its pre-computed slice (civic: programs + measured ripples + affected citizens; sports: same + crime data; letters: affected-citizen POPIDs) so the LLM writes prose instead of hunting. Assembly layer over existing packets (baseline_briefs + deck), not new detection.
- **R2 — Forward ripple chains.** Persist cause→effect at the moment of computation, multi-hop, surviving cycle boundaries. The ripple — who was hit, how, for how long — is the story unit.
- **R3 — Coherence.** World state must constrain citizen texture (no storm walks, no crime-spike strolls); locality must be real (hood-grain signal, citywide only on crisis). Today these are probability *weights* plus the S280 chaos-reaction grain; whether hard *vetoes* exist is an open verification item (V1).
- **R4 — Synthesis gate.** Media surface receives promotions by severity or volume-of-similar-events (major events); below-threshold stays citizen texture. Pieces exist (world-event severity, shock monitor, seed collapse); no general rule.
- **R5 — Honesty forcing function.** Faithful negative-pole attribution (fixes the S2/G-RC5 class) so covering "what truly happened" is the default, not an editorial choice.

## Open verification items

- **V1** — Are weather/crime constraints on texture weights-only, or do any pools hard-veto contradictory lines? (Coherence gap sizing.)
- **V2** — `approvalNeighborhoodEffects`/`activeRipples` → next-cycle citizen-event probability consumer (coupling map asserts it; civic trace didn't re-verify).
- **V3** — `neighborhoodPulseMap.js` tag→dimension mapping (which citizen tags move next-cycle CrimeIndex).
- **V4** — `cycleId` vs `cycle` mismatch between the two sports functions (`applySportsSeason_:53` vs `applySportsFeedTriggers_:267`).
- **V5** — Non-atmospheric generators' `source:` tag vocabulary (civic/media/generational engines).

## Plan direction (input to the plan doc — not the plan)

1. **Ripple ledger** — a durable cause→effect record written at computation time (generalize the Chaos_Cars row pattern): `{cycle, causeType, causeId, effectType, targets (POPIDs/hoods/bizIds), magnitude, duration, remainingStrength}`. Single tab or per-cycle JSON; the engine's own memory of what it did.
2. **Serialize ripple state cross-cycle** (fix E1/E2/C2 in the two snapshot writers) so duration/decay code becomes reachable and multi-cycle stories exist at all.
3. **Repair the dead/hollow couplings that block truthful ripples:** sports sentiment fold (S1), crime→dynamics inputs + phase ordering (K1), wire or retire the crime event/headline generators (K2), hood-grain crime signal to conduct (K3).
4. **Per-desk slice assembler** — Node post-cycle step (sibling of routePatternSeeds) projecting ripple ledger + baseline_briefs + deck into one slice file per desk; letters desk gets affected-citizen POPIDs (P4 fix rides along: affected = actual event participants from LifeHistory_Log, not residence).
5. **Synthesis gate** — severity/volume promotion rule applied at the slice assembler, replacing ad-hoc sift judgment (R4).
6. **Re-point the WHY layer** at persisted attribution, retiring markdown scraping (kills the S2/G-RC5 failure class).

Sequencing, blast radius, and deploy windows belong to the plan doc. Items 1–2 are the
foundation; 3 is repair work shippable independently; 4–6 consume 1–2.

## Changelog

- 2026-07-04 — Initial trace + synthesis (S291, engine-sheet). Five-domain parallel trace; verdict, failure classes, design requirements R1–R5, open items V1–V5, plan direction sketched. Coupling-map L242 correction noted (C3).
