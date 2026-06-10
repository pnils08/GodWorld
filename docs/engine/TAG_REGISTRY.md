---
title: Citizen Memory Tag Registry — the single source of truth for event tag → memory category
created: 2026-06-01
updated: 2026-06-01
type: spec
status: draft (engine.31 Phase 0 deliverable — map locked, code pending post-C96)
tags: [engine, citizens, memory, tags, conduct, registry]
pointers:
  - "[[../plans/2026-05-31-compression-tag-triage]] — engine.31 (the bounded-memory engine this registry feeds)"
  - "[[ROLLOUT_PLAN]] — engine.31 row"
  - "[[index]] — registered"
  - "[[../plans/2026-05-31-life-event-generation]] — engine.32 (consumes the Conduct vocab below to generate moral-test events)"
  - "utilities/compressLifeHistory.js — TAG_TRAIT_MAP (the compressor's map; this registry supersedes it as the central source)"
---

# Citizen Memory Tag Registry

**Purpose.** One canonical map from every event tag the engines emit → its **memory category** (Social / Work / Family / Health / Conduct) and its **slot eligibility**. This is the **single source of truth** the engine.31 bounded-memory compressor reads to route events into slots, and the contract the event generators (engine.32) emit against.

**Why it exists (the structural finding, S250 Phase 0).** There is no central tag list today. ~14 engines each mint their own tag vocabulary in their own event pools (`picked.primary`, `eventTag`, `milestone.tag`), and the compressor keeps a *second, separate* `TAG_TRAIT_MAP` that has to manually track them. That dual-list-with-no-sync is exactly why the health-state tags, `youth-*`, and edition citations drifted out of the compressor's map (emitted by engines, never added). This registry collapses both into one map both sides read. **Uniform tagging = every engine tags against this registry; the compressor categorizes against this registry.**

---

## The principle that decides slot eligibility

> **A slot is for something that happened *to* the citizen and could change who they are.** Weather, recurring holidays, and "reacting to last night's city" are *mood color* — they tint the trait axes but never occupy one of the 8 bounded memory slots. Reserve slots for events that, repeated, would reshape a person.

Three tiers fall out of that principle:
- **Slot-eligible** — real events. Compete for a bounded slot (strongest-keeps); can promote to core.
- **Texture-only** — ambient/recurring. Contribute weakly to trait axes, **never claim a slot**.
- **Route-by-content** — meta-tags (edition coverage, story arcs) that aren't a category themselves; they seed a memory in whatever category the underlying event belongs to.

---

## The map

### Slot-eligible tags

| Category | Tags | Notes |
|---|---|---|
| **Social** | Relationship, Alliance, Rivalry, Mentorship, Neighborhood, Community, Cultural, Media, CivicRole, Civic Perception, Reputation, Quoted, Lifestyle, PostCareer-Community, PostCareer-Fundraiser, PostCareer-Influence | Relationships, public life, community standing. Rivalry is the only natural-negative here — feeds `volatile`. **S255 (engine.32 T3):** `Reputation` also emitted by `generateCitizensEvents.js` (fame seam — recognition events gated `UsageCount ≥ 8`). Same tag, no new vocab. |
| **Work** | Career, Career-Transition, Career-Training, Promotion, Graduation, Education, Education-Cultural, Arc | Achievement, advancement, learning-as-progress. `Graduation` is a work-achievement milestone (not Family). `Arc` = narrative ambition thread. |
| **Family** | Household, Wedding, Birth, Divorce, Retirement, youth-academic, youth-sports, youth-community_support, youth-resilience, youth-safety_awareness, youth-coming_of_age, PostCareer, PostCareer-Travel, PostCareer-Wellness | Kin, household, life-stage transitions. `youth-*` = developmental/childhood (templated `'youth-' + eventType`). `Retirement` + post-work *lifestyle* = Family/personal life. |
| **Health** | Health, Critical, Recovering, Hospitalized, Stabilized, Setback, Recovery, Death | The health lifecycle. The 6 states are emitted dynamically in `generationalEventsEngine.js` L489–589 (`tag = "Critical"` …) and are **currently unmapped** in the compressor — this registry routes them. `Death` = the citizen's *own* terminal event (see Gaps). **S255 (engine.32 T4):** `runHouseholdEngine.js` also emits `Health` (ambient ailment texture) + `Recovering` (ambient wellness) — same tags, no new vocab. |
| **Conduct** | Transgression-Petty, Transgression-Serious, Transgression-Grave, Resisted | The 5th category. Crime made real. **S255 (engine.32 T7):** emitted by `phase05-citizens/runConductEngine.js` (moral-test engine, dial-gated, inert until DialState deploys). |

> Calendar subtags (`Career-FirstFriday`, `Career-CreationDay`, `Career-Holiday`, `Education-FirstFriday`, `Education-Holiday`, `Education-CreationDay`, `Household-FirstFriday`, `Household-CreationDay`, `Household-Holiday`, `PostCareer-FirstFriday`, `PostCareer-CreationDay`, `PostCareer-Holiday`, `PostCareer-Sports`): the *base* category routes the memory (Career→Work, Household→Family, etc.); the calendar half is **texture** — it does not create a distinct slot. A career event that happens on a holiday is a Work memory, not a Holiday memory.

### Texture-only tags (never claim a slot; weak axis contribution)

`Weather`, `Holiday`, `FirstFriday`, `CreationDay`, `PrevEvening`, `Sports` *(low base salience — a pennant win can escalate to slot-eligible via intensity)*.

### Route-by-content (meta-tags, not categories)

- **`E{edition}` (E96, E97…)** — newsroom coverage citation (`scripts/enrichCitizenProfiles.js:381`). Feeds the **fame signal** AND seeds a memory in the category the *coverage subject* belongs to (a crime story → Conduct; a promotion feature → Work). Not its own bucket. *(Note the comment/code inconsistency: header says `[Edition]`, code emits `[E96]` — standardize on `E{n}`.)*
- **`Arc`** — story-arc thread; routes by the arc's subject (defaults to Work/ambition if unresolved).

---

## Conduct category — the vocabulary (contract for engine.32)

Zero generators emit Conduct events today (the city has a crime *rate* in `Crime_Metrics`; not one tracked citizen ever commits a crime). engine.32 builds the low-probability moral-test generator that emits against this vocab; engine.31 builds the slots that receive it.

| Tag | Pole | Severity | Meaning |
|---|---|---|---|
| `Transgression-Petty` | dark | low | stole butter from work, minor dishonesty |
| `Transgression-Serious` | dark | mid | theft, fraud, betrayal |
| `Transgression-Grave` | dark | high | embezzlement, violence |
| `Resisted` | light | — | tempted, chose not to — accretes integrity |

**Mechanics (defined in the plan, summarized here):** Conduct memories are high base salience (a transgression out-muscles a coffee-shop memory). A sustained transgression pattern promotes to a **dark core** → the `Outlaw` archetype (working name). `Resisted` accretes integrity (deepens grounded/wholesome cores). The bound gates runaway: a single petty act decays like any weak memory; only a *pattern* locks. R's conduct-core is the signal engine.32 reads to bias the next moral test (commit-vs-resist, severity, frequency) — the back-arc.

---

## Uniform-tagging fix list (code — gated post-C96)

1. **3 raw-line writers emit no tag** → route to nothing today:
   - `phase05-citizens/checkForPromotions.js:482` — "Promoted from Tier-4…" → tag `Promotion` (Work).
   - `phase05-citizens/generateGenericCitizens.js:630` — "Arrived in Oakland…" → tag `Arrival` (Family/life-stage; add to map) or `Neighborhood` (Social). **Decide in Phase 1.**
   - `phase05-citizens/runCareerEngine.js:851` — `lifeOut` raw → confirm it carries a `[CareerState]` tag (persistence line, protected from trim) vs a real event needing a Work tag.
2. **Edition tag inconsistency** — comment `[Edition]` vs code `[E96]`; standardize on `E{n}`.
3. **The registry itself** — build the shared map (this file → a code constant both the engines and the compressor read), retiring the compressor's standalone `TAG_TRAIT_MAP` as the source of truth.

---

## Gaps surfaced (engine.32 / future)

- **`Death` is terminal-only.** It marks the citizen's *own* death — it never becomes a memory (they're gone). But a death in the *family* (spouse, child) should seed a **grief memory in survivors' Family slots**. No generator emits survivor-grief today. → engine.32.
- **`Life` fallback** (`generateGameModeMicroEvents.js:516`, `picked.primary || "Life"`) is a routing-failure default, not a real tag. Eliminate by ensuring every pooled event carries a real `primary`.
- **Slot distribution** — 8 slots across 5 categories isn't even. Tunable in Phase 1 (weighted, or raise to 10 = 2 each). The *bound* is sacred; the exact number is not.

---

## Changelog
- 2026-06-01 (S250, engine-sheet) — Created as the engine.31 Phase 0 deliverable. Full tag universe extracted from all ~14 O-writers + traced to source (literal / variable / templated). Texture-tier principle locked (Mike delegated the call: slots are for events that change you, not weather). Conduct vocab defined as the engine.32 contract. Structural finding: no central registry → this file becomes it. Map locked; code (registry constant + writer fixes) gated post-C96. No code yet.
