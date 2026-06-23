---
title: Citizen Perception & Immersion Access Layer
created: 2026-06-23
type: plan
status: design
terminal: research-build (design) → engine-sheet + bot (build)
tags: [citizens, perception, immersion, citizen-loop, access, plan]
paths:
  - "[[2026-06-04-mags-citizen-loop]] — research.14, the wake/reflection/write-back loop this is the INPUT side of"
  - "[[2026-06-19-living-city-full-population-coverage]] — engine.38, B3 stakes (the good/bad events a citizen perceives)"
  - "[[2026-06-20-layered-memory-phase2-lineage-promotion]] — research.17, the injection filter Tier 3 needs"
  - "[[2026-05-31-autonomy-roadmap]] — research.12, Tier 4 = Layer 3 agency"
registered: "[[../index]]"
---

# Citizen Perception & Immersion Access Layer

**The INPUT side of the citizen loop.** research.14 designs how a citizen reflects and how that reflection locks into who they are (write-back). This plan designs **what a citizen can perceive** of themselves and their world — the access that makes a reflection grounded and a citizen *immersed* rather than a stateless reflection-generator. Sibling to research.14; reaches up into research.12 (Layer 3 agency) at its top tier.

**Mike's framing (S269):** "what type of access — Supermemory? read the Cycle Pulse? ask them questions about the world summary? what allows a citizen to immerse in a world?"

---

## The baseline audit (S269) — what a citizen accesses today

At wake (`scripts/citizen-wake.js` → `buildVoicePrompts`), a citizen perceives exactly:
- their own **dial-disposition** (POLES phrases off DialState),
- their **last 5 LifeHistory entries**,
- **3 co-resident names** (names only, no texture — `RESIDENT_CAP=3`, anti-confab),
- the **time of day** (morning/midday/evening).

Two findings reframe the gap:

1. **They write a memory they never read.** The wake *appends* every reflection to the citizen's Supermemory page (`lib/citizenPage.js`) and never reads it back into perception. A citizen accretes a remembered self and wakes each time amnesiac of it. **Biggest immersion hole, cheapest to close — but NOT free (see §pressure-test).**
2. **No world beyond the block.** No city news, events, sports, or world state — just self + 3 names. The research.13 PoC had a richer 5-piece context (own row + neighborhoodSlice + world-summary slice + Oakland_Sports_Feed + rolling memory); the live Phase-2 wake **dropped** the world-summary / sports / memory pieces. The live citizen is a person in a sealed room reflecting on their own week.

---

## What immersion requires (the frame — Mike-confirmed S269)

A person feels real in a world when they have four things. Each maps to an access surface:

1. **Continuity** — they remember their own life. → *read their own Supermemory page back (bounded + guarded).*
2. **A world larger than them** — the city moves with or without them. → *world-summary slice (translated) + sports feed + neighborhood state.*
3. **Relationships with texture** — not 3 names, but people they have history with. → *bonds / relationship ledger.*
4. **Stakes** — good and bad things happen to them. → *engine.38 B3 (the ordinary good/bad events), already designed.*

News (the Cycle Pulse) and "ask them about the world" are higher rungs **on top of** these four.

---

## Access tiers

| Tier | Give them | Immersion | Cost | Canon risk |
|------|-----------|-----------|------|------------|
| **1 — now** | own page read-back (bounded+guarded) · richer neighborhood state · sports feed | High | Low–Med | **Low–Med (not zero — see PT-1)** |
| **2 — translation build** | world-summary slice → rewritten as *lived particulars*, never raw aggregates | High | Med | Low |
| **3 — guarded pilot** | read the Cycle Pulse — citizen reacts to news about *their* city | Very high | High | **High (needs research.17 filter)** |
| **4 — frontier** | ask them questions about the world — citizen as queryable reasoning agent | Transformative | High | High (= research.12 Layer 3) |

### Tier 1 — continuity + immediate world (the immediate build)
- **Own page read-back**, BOUNDED (last-N reflections or a rolling summary, not the whole page — PT-3) and GUARDED (a fabrication/canon check before re-injection — PT-1). Closes the amnesia; the most direct serving of "consistent existence with their output."
- **Sports feed** (`Oakland_Sports_Feed`) — cheap, canonical, Oakland cares about the A's; the research.13 PoC had it.
- **Richer neighborhood state** via `lib/neighborhoodSlice` — what's *happening* on their block, translated to lived particulars (not aggregates).

### Tier 2 — the city beyond the block (a real translation build, PT-2)
- A per-neighborhood **lived-particulars digest** of the world summary: "the festival downtown, rent notices going around," NOT "leisure +3 / retail −4%." This is a generative/translation step with its own cost + determinism (frozen at wake) + contamination surface — **not free reuse** of `baseline_briefs` (which gives state, not what-a-person-notices). Scope it as a build, not a wiring.

### Tier 3 — read the Pulse (guarded pilot)
- A citizen reacting to the news about their city is the highest ordinary immersion. But editions name real people and carry canon → the C92 vector. **Guard must be a real filter, not a prompt** (PT-5): route the citizen's reaction through research.17's injection filter; reaction stays subjective; the page-write is canon-checked. Pilot on 1–2 citizens, scoped to their neighborhood's stories.

### Tier 4 — ask them about the world (the agency frontier)
- The citizen as a queryable reasoning agent over world state = **research.12 Layer 3**. Powerful, but the GPU + drift-amplification gate. Defer to the autonomy roadmap; this plan only names the rung.

---

## Guardrails (non-negotiable on any tier)

- **Lived particulars, never aggregates.** A citizen perceives what a *person* would notice ("the corner store closed"), never the metric ("retail −4%"). Any Tier-2/3 surface needs a translation layer — which is *also* what makes two citizens sound different (the no-engine-metrics-in-voice rule = the differentiator).
- **C92 containment is the wall on Tier 3/4.** Whatever a citizen reads accretes to their page and can re-emit. Read-access to canon-bearing surfaces stays **subjective-reaction-only**, scoped, piloted small, and (Tier 3+) **filtered, not prompt-guarded** (PT-5).
- **Scale honesty** — a citizen is ~1 node : 438 people; world-knowledge is a *slice*, not omniscience.
- **Determinism holds** — all perception is wake-side (frozen snapshot); only the bounded tag reaches the engine. Reading editions/world-summary is determinism-safe *because* it's input-side.

---

## Self-pressure-test (S269 — research-build; advisor pass PENDING, was overloaded)

Generated the design, then attacked it. Findings folded into the tiers above:

- **PT-1: page read-back AMPLIFIES fabrication.** The page already holds invented characterizations of real people (the "shady Greg" S264 finding). Re-injecting it makes the citizen treat prior fabrication as established memory and build on it. → Tier 1 read-back needs a fabrication/canon guard + bounded read; NOT "zero contamination, own data."
- **PT-2: Tier 2 translation is a real build,** not free reuse — `baseline_briefs` gives neighborhood *state*, not what-a-person-notices; the translation is a generative step with cost/determinism/contamination of its own.
- **PT-3: page growth is unbounded** → the read must be last-N / rolling-summary, especially at Phase-C all-906 scale.
- **PT-4: immersion amplifies the write-back.** Richer perception → more varied reflections → more dial movement (good and bad). Couples to engine.38 B4's composure cap + the research.14 affect re-audit — richer-perception reflections must be inside those bounds before scaling.
- **PT-5: "react, don't re-state facts" is not enforceable as a prompt.** An LLM citizen will sometimes restate. Tier 3 needs a real canon filter (research.17), not an instruction.

---

## Build sequence (tasks)

| # | Task | Terminal | Gate |
|---|------|----------|------|
| T1a | Bounded + canon-guarded own-page read-back into the wake perception | bot + research.17 filter | none (own data, guarded) |
| T1b | Sports feed + richer neighborhood-state (lived particulars) into perception | bot | none |
| T2 | World-summary → per-neighborhood lived-particulars translation layer (frozen at wake) | research-build (design) → bot/engine-sheet | none (deterministic snapshot) |
| T3 | Read-the-Pulse pilot, reaction-only, **routed through research.17 injection filter** | research.17 must land first | research.17 filter live |
| T4 | Ask-the-citizen agency rung | research.12 Layer 3 | GPU + drift gate (autonomy roadmap) |

**Coupling:** immersion (this plan) amplifies the write-back (research.14) and rides the stakes (engine.38 B3). Build Tier 1–2 alongside the write-back; Tier 1's read-back guard shares research.17's filter; do not scale perception richness past the B4 cap + affect re-audit (PT-4).

---

## Open questions

- [ ] **Page read-back shape** — last-N raw reflections vs a rolling self-summary? Rolling summary is bounded + cheaper but adds a summarization step (its own LLM call). Resolve at T1a.
- [ ] **Tier-2 translation owner** — does the lived-particulars digest live in the wake (bot, per-citizen, costly) or as a per-neighborhood cycle artifact the wake reads (cheaper, shared)? Lean shared artifact.
- [ ] **Tier 3 sequencing** — does it wait on research.17 fully, or can a no-canon-names subset (weather/sports/civic-mood) pilot earlier?
- [ ] **Relationships-with-texture (immersion ingredient 3)** — bonds ledger exists (`Relationship_Bonds`); is co-resident texture a Tier-1 add or its own task? Not yet placed.

---

## Changelog

- 2026-06-23 — Initial draft (S269, research-build, Mike-approved "write it up"). Audit of current citizen perception (thin: disposition + last-5 LifeHistory + 3 names; writes-a-memory-never-read; no world beyond the block). Four-ingredient immersion frame (continuity / world-larger-than-self / relationships / stakes). Four-tier access architecture mapping Mike's candidates (Supermemory / Cycle Pulse / world-summary / agency). Self-pressure-test (advisor overloaded — PENDING): page-readback amplifies fabrication, Tier-2 translation is a real build, page growth needs bounding, immersion amplifies the write-back, Tier-3 needs a real filter not a prompt. Cross-linked research.14/.12/.17 + engine.38 B3.
