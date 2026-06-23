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
| **1 — now** | canon-anchored self-state read-back (LifeHistory rollup + dial trajectory) · sports feed | High | Low | **None (AP-reframe — state read-back re-injects no prose; sports feed is canonical)** |
| **2 — translation build** | world-summary slice → rewritten as *lived particulars*, never raw aggregates | High | Med | Low |
| **3 — guarded pilot** | read the Cycle Pulse — citizen reacts to news about *their* city | Very high | High | **High (needs research.17 filter)** |
| **4 — frontier** | ask them questions about the world — citizen as queryable reasoning agent | Transformative | High | High (= research.12 Layer 3) |

### Tier 1 — continuity + immediate world (the immediate build)
- **Canon-anchored self-state read-back** (AP-reframe — supersedes the prose-read-back design). Continuity is served by reading back a **canon-anchored self-state summary** — a LifeHistory rollup + dial trajectory — NOT prior generated reflection prose. The fabrication ("shady Greg"-class invention, PT-1) lives in the *generated prose* appended to the Supermemory page; LifeHistory is engine-written canon data already in the wake (CV-1), and dial-state is canon-clean. Reading back the canon-anchored state closes the amnesia **without re-injecting fabrication — ungated AND contamination-free, because there is nothing to compound.** The rejected options (raw last-N reflections / rolling prose summary) both re-inject the prose; a rolling summary just carries the invention forward compressed (AP-2). This dodges PT-1 entirely instead of guarding it.
- **Sports feed** (`Oakland_Sports_Feed`) — cheap, canonical, Oakland cares about the A's; the research.13 PoC had it. **Genuinely Tier-1 cheap** — canonical feed, no translation step. **Serves "world-larger-than-self" (ingredient 2), NOT continuity (ingredient 1)** — it is the safe true-first build (canonical input, no filter dependency), but it does not touch the amnesia hole; don't let it masquerade as closing the main gap (AP-3). **Pre-pipe check:** confirm `Oakland_Sports_Feed` is canon-clean (no real-name leak — Paulson's domain, Rhea blocklist-checks sports names) before feeding 906 perceptions.
- **Neighborhood state is NOT a Tier-1 freebie (CV-2 correction).** The slicer (`lib/neighborhoodSlice`) already runs at wake and returns `{residents, state}`; `state` is **aggregates** (`crimeIndex`, `sentiment`) and `describe()` renders them as metrics. Feeding it raw violates the lived-particulars guardrail (the `retail −4%` failure). So neighborhood-state is the **input to T2's translation**, not a standalone Tier-1 add — it moves to T2. What's already wired is the *data path*, not a usable surface.

### Tier 2 — the city beyond the block (a real translation build, PT-2)
- A per-neighborhood **lived-particulars digest** of the world summary: "the festival downtown, rent notices going around," NOT "leisure +3 / retail −4%." This is a generative/translation step with its own cost + determinism (frozen at wake) + contamination surface — **not free reuse** of `baseline_briefs` (which gives state, not what-a-person-notices). Scope it as a build, not a wiring.

### Tier 3 — read the Pulse (guarded pilot)
- A citizen reacting to the news about their city is the highest ordinary immersion. But editions name real people and carry canon → the C92 vector. **Guard must be a real filter, not a prompt** (PT-5): route the citizen's reaction through research.17's injection filter; reaction stays subjective; the page-write is canon-checked. Pilot on 1–2 citizens, scoped to their neighborhood's stories.

### Tier 4 — ask them about the world (the agency frontier)
- The citizen as a queryable reasoning agent over world state = **research.12 Layer 3**. Powerful, but the GPU + drift-amplification gate. Defer to the autonomy roadmap; this plan only names the rung.

---

## Guardrails (non-negotiable on any tier)

- **Lived particulars, never aggregates.** A citizen perceives what a *person* would notice ("the corner store closed"), never the metric ("retail −4%"). Any Tier-2/3 surface needs a translation layer — which is *also* what makes two citizens sound different (the no-engine-metrics-in-voice rule = the differentiator).
- **Subjective invention is NOT contamination (Mike, S270).** A citizen making up a name or an impression — "shady Greg" for the guy down the hall — is *characterization*, exactly how a person remembers their world. It is legitimate citizen-subjective memory, **not** a sim record. The wall is not "no invention"; it is the **subjective→canon boundary**: invented names/impressions are fine inside the citizen's private layer, and only become contamination if they cross into editions / canon containers **as fact**. This refines PT-1/AP-2 — prose read-back is unsafe not because invention exists, but because nothing currently *marks the boundary* between a citizen's subjective memory and canon truth. (Why the AP-reframe's canon-anchored state read-back is still the right *first* build: it needs no boundary-marking machinery. Prose read-back returns as a later tier once the subjective layer is explicitly fenced from canon publication.)
- **C92 containment is the wall on Tier 3/4.** Whatever a citizen reads accretes to their page and can re-emit. Read-access to canon-bearing surfaces stays **subjective-reaction-only**, scoped, piloted small, and (Tier 3+) **filtered, not prompt-guarded** (PT-5). (Distinct from the subjective-invention point above: C92 is real-world refs / canon facts leaking *in*; this guardrail is the citizen's subjective layer leaking *out* as canon.)
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

## Code verification (S270 — measure-twice against live wake)

Both load-bearing premises confirmed against `scripts/citizen-wake.js` + `lib/neighborhoodSlice.js` (advisor was overloaded; this is the code-grounding pass that doesn't need it):

- **CV-1: "writes a memory it never reads" — CONFIRMED.** `buildVoicePrompts` (L124–131) assembles perception from exactly disposition + `c.life` (last-5 inline LifeHistory, L90) + `neighbors` (3 names+occupation). `appendReflection_` writes the page every wake (L169); the page is **never** read back into the prompt. PT-1 stands.
- **CV-2: "no world beyond the block" — CONFIRMED, with a wiring nuance.** System prompt (L129) = self + recent life + people-around-you; no sports/world/news. The slicer **already runs** at wake (L117–118) and computes neighborhood `state` (`crimeIndex`, `sentiment`) but the wake discards all but `residents`. The data path exists; the usable surface does not — `state` is aggregates, so it belongs to T2's translation, not Tier 1 (folded above).

## Advisor pass (S270 — the independent adversarial read, owed since S269)

Stronger-reviewer pass on the design. Three findings + one reframe that resolves the first two:

- **AP-1: T1a smuggled a gate, and it's a category error.** Line 115 claimed "Tier 1's read-back guard shares research.17's filter" while T1a's gate read `none` — a contradiction. Deeper: research.17 is a **salience** filter (permanent/story/archive; keeps admin-mechanics out of injection). It does **not** validate canon-truth. "Shady Greg"-class invention is *high-salience* — it passes a salience filter and gets injected. So research.17 never guarded PT-1. As originally written, T1a-prose-read-back needed a fabrication/canon guard that **doesn't exist and isn't research.17** → it was the *most*-gated item, not the ungated one.
- **AP-2: prose read-back fundamentally compounds C92.** A per-wake canon-check on free-text reflections at 906 scale is a Rhea-class check per citizen per wake — expensive and imperfect, and the failure is asymmetric (one missed fabrication re-injected becomes "established memory"). A rolling summary does **not** save it — it summarizes the contaminated prose, carrying invention forward compressed. Bounded ≠ safe.
- **AP-3: T1b (sports feed) is the safe true-first build — with a caveat.** Canonical input, no filter dependency, no translation. But it serves **ingredient 2 (world-larger-than-self), not ingredient 1 (continuity)** — it does not touch the amnesia hole that was called the biggest gap. Pre-pipe check: confirm `Oakland_Sports_Feed` is canon-clean.
- **The reframe (resolves AP-1 + AP-2):** *where does the fabrication actually live?* In the generated reflection **prose** — not the canon-anchored self-history. LifeHistory is engine canon data, **already in the wake** (CV-1), and dial trajectory is canon-clean. So continuity doesn't need the prose at all. Read back a **canon-anchored self-state summary** instead of prior prose → continuity becomes **ungated AND contamination-free**. Folded into Tier 1 + T1a above.
- **Board honesty:** had T1a stayed prose-read-back, research.19's *headline* build would also have sat behind research.17 → C100. The state-read-back pivot is what actually keeps continuity off the C100 wall. T1b was always free.

## Build sequence (tasks)

| # | Task | Terminal | Gate |
|---|------|----------|------|
| T1a | Canon-anchored self-state read-back (LifeHistory rollup + dial trajectory) into the wake perception — NOT prose read-back (AP-reframe). Closes amnesia with no fabrication re-injection. | bot | **none (canon-anchored; no research.17/canon-filter dependency)** |
| T1b | Sports feed (`Oakland_Sports_Feed`) into perception — canonical, no translation. Pre-pipe: confirm feed canon-clean (no real-name leak). Serves ingredient 2 (world), not continuity. | bot | none |
| T2 | World-summary **+ neighborhood `state`** → per-neighborhood lived-particulars translation layer (frozen at wake). Slicer data-path already runs at wake (CV-2); the build is the aggregate→lived-particular translation, not the wiring. | research-build (design) → bot/engine-sheet | none (deterministic snapshot) |
| T3 | Read-the-Pulse pilot, reaction-only, **routed through research.17 injection filter** | research.17 must land first | research.17 filter live |
| T4 | Ask-the-citizen agency rung | research.12 Layer 3 | GPU + drift gate (autonomy roadmap) |

**Coupling:** immersion (this plan) amplifies the write-back (research.14) and rides the stakes (engine.38 B3). Build Tier 1–2 alongside the write-back; **Tier 1 no longer depends on research.17** (AP-1 — the canon-anchored state read-back needs no filter; research.17 is a *salience* filter, not a canon-truth validator, so it never guarded PT-1 in the first place). research.17's filter is a **Tier-3** dependency only (reading canon-bearing editions). Do not scale perception richness past the B4 cap + affect re-audit (PT-4).

---

## Open questions

- [x] **Page read-back shape** — RESOLVED by AP-reframe. Neither raw last-N reflections nor a rolling prose summary (both re-inject the contaminated generated prose). The read-back is a **canon-anchored self-state rollup** (LifeHistory + dial trajectory), which carries no fabrication to compound. The prose page stays write-only for now.
- [ ] **Tier-2 translation owner** — does the lived-particulars digest live in the wake (bot, per-citizen, costly) or as a per-neighborhood cycle artifact the wake reads (cheaper, shared)? Lean shared artifact.
- [ ] **Tier 3 sequencing** — does it wait on research.17 fully, or can a no-canon-names subset (weather/sports/civic-mood) pilot earlier?
- [ ] **Relationships-with-texture (immersion ingredient 3)** — bonds ledger exists (`Relationship_Bonds`); is co-resident texture a Tier-1 add or its own task? Not yet placed.

---

## Changelog

- 2026-06-23 (S270) — **Canon distinction (Mike):** subjective invention ≠ contamination. A citizen making up "shady Greg" is characterization (how they remember), not a sim record; the wall is the subjective→canon-publication boundary, not invention itself. Refines PT-1/AP-2 + added as a Guardrail. The AP-reframe stays the right *first* build (no boundary-marking machinery needed); prose read-back returns as a later tier once the subjective layer is fenced from canon.
- 2026-06-23 (S270) — **Advisor pass run (owed since S269).** Three findings + a reframe folded in. AP-1: T1a smuggled a gate + category error — research.17 is a salience filter, not a canon-truth validator, so it never guarded PT-1. AP-2: prose read-back compounds C92 (rolling summary doesn't save it). AP-3: T1b is the safe true-first build but serves world (ingredient 2), not continuity. **Reframe: pivot T1a from prose-read-back to canon-anchored self-state read-back (LifeHistory rollup + dial trajectory) — ungated AND contamination-free, since the fabrication lives in the prose, not the canon self-history.** Updated: Tier-1 desc, tier table canon-risk (Low–Med→None), T1a/T1b build rows, coupling line (Tier 1 no longer depends on research.17; that's a Tier-3-only dependency now), open-question 1 RESOLVED. Headline build now off the C100 wall.
- 2026-06-23 (S270) — Code-verification pass (advisor still overloaded): both premises confirmed against `citizen-wake.js`/`neighborhoodSlice.js` (CV-1 page-never-read, CV-2 no-world-beyond-block). Correction: neighborhood `state` is computed-but-discarded aggregates → moves from Tier-1 to T2 translation; T1b reduced to sports feed only. Advisor pressure-test still owed.
- 2026-06-23 — Initial draft (S269, research-build, Mike-approved "write it up"). Audit of current citizen perception (thin: disposition + last-5 LifeHistory + 3 names; writes-a-memory-never-read; no world beyond the block). Four-ingredient immersion frame (continuity / world-larger-than-self / relationships / stakes). Four-tier access architecture mapping Mike's candidates (Supermemory / Cycle Pulse / world-summary / agency). Self-pressure-test (advisor overloaded — PENDING): page-readback amplifies fabrication, Tier-2 translation is a real build, page growth needs bounding, immersion amplifies the write-back, Tier-3 needs a real filter not a prompt. Cross-linked research.14/.12/.17 + engine.38 B3.
