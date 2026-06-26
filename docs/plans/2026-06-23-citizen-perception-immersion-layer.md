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
  - "[[2026-06-26-citizen-signal-story-emergence]] — research.21, the SECOND readout of this loop (this designs the INPUT a citizen perceives; that harvests the OUTPUT — cross-citizen convergence — as story signal). T2 doubles as its signal-conditioning."
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
- **Subjective invention is NOT contamination (Mike, S270).** A citizen making up a name or an impression — "shady Greg" for the guy down the hall — is *characterization*, exactly how a person remembers their world. It is legitimate citizen-subjective memory, **not** a sim record. The wall is not "no invention"; it is the **subjective→canon boundary**: invented names/impressions are fine inside the citizen's private layer, and only become contamination if they cross into editions / canon containers **as fact**. This refines PT-1/AP-2 — prose read-back is unsafe not because invention exists, but because nothing currently *marks the boundary* between a citizen's subjective memory and canon truth. (S273 correction: the canon-anchored state read-back was still the right *first* build — it shipped. But prose read-back does **not** wait on "fencing the subjective layer from canon publication" as a precondition: self-read-back never *approaches* publication, so no fence is needed for it. The publication wall — which already exists — is the only fence, and it sits between a citizen's memory and an edition, not between a citizen and their own page. Prose read-back is therefore ungated and buildable now.)
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
- **AP-2: prose read-back fundamentally compounds C92.** ~~A per-wake canon-check on free-text reflections at 906 scale is a Rhea-class check per citizen per wake — expensive and imperfect, and the failure is asymmetric (one missed fabrication re-injected becomes "established memory"). A rolling summary does **not** save it — it summarizes the contaminated prose, carrying invention forward compressed. Bounded ≠ safe.~~ **OVERTURNED S273 (Mike).** This mis-read the canon: the page is the citizen's *subjective memory*, and self-read-back never crosses the *publication* wall, so "established memory" built from prior invention is **continuity, not contamination**. The "asymmetric failure" is the feature working. Prose read-back is ungated (size-bounded for tokens only). AP-2's premise — that re-injected invention is a C92 compounder — was false because C92 is a *publication* crossing, which self-read-back categorically does not do. See OQ1 (re-resolved).
- **AP-3: T1b (sports feed) is the safe true-first build — with a caveat.** Canonical input, no filter dependency, no translation. But it serves **ingredient 2 (world-larger-than-self), not ingredient 1 (continuity)** — it does not touch the amnesia hole that was called the biggest gap. Pre-pipe check: confirm `Oakland_Sports_Feed` is canon-clean.
- **The reframe (resolves AP-1 + AP-2):** *where does the fabrication actually live?* In the generated reflection **prose** — not the canon-anchored self-history. LifeHistory is engine canon data, **already in the wake** (CV-1), and dial trajectory is canon-clean. So continuity doesn't need the prose at all. Read back a **canon-anchored self-state summary** instead of prior prose → continuity becomes **ungated AND contamination-free**. Folded into Tier 1 + T1a above.
- **Board honesty:** had T1a stayed prose-read-back, research.19's *headline* build would also have sat behind research.17 → C100. The state-read-back pivot is what actually keeps continuity off the C100 wall. T1b was always free.

## Build sequence (tasks)

| # | Task | Terminal | Gate |
|---|------|----------|------|
| T1a | Canon-anchored self-state read-back (LifeHistory rollup + dial trajectory) into the wake perception — NOT prose read-back (AP-reframe). Closes amnesia with no fabrication re-injection. | bot | **none (canon-anchored; no research.17/canon-filter dependency)** |
| T1b | Sports feed (`Oakland_Sports_Feed`) into perception — canonical, no translation. Pre-pipe: confirm feed canon-clean (no real-name leak). Serves ingredient 2 (world), not continuity. | bot | none |
| T2 | World-summary **+ neighborhood `state`** → per-neighborhood lived-particulars translation layer (frozen at wake). **BUILT S272 (engine-sheet, `beda8fa7` generator + wake, `fb73e4e2` contentless-event guard fix, no clasp).** `scripts/buildNeighborhoodTexture.js` v1.0.0 → `output/neighborhood_texture_c100.md` live (8/21 hoods with signal, 13 quiet-week, zero metrics, source-grounded — design validated first run). §T2 Design below. | research-build (design DONE S273) → engine-sheet (**BUILT S272**) | none (deterministic snapshot) |
| T1a′ | **Arc-to-particular refinement** — count → named most-recent milestone from LifeHistory_Log. **BUILT S272 (engine-sheet, `0110597f`).** Surfaced **ENGINE_REPAIR Row 32** building it (ARC EventText is bookkeeping, not a usable description → starves the milestone-name quality; engine-sheet follow-up). Full-stack wake dry-run verified on POP-00001 (claude-mem #34302). §T1a refinement below. | research-build (design DONE S273) → engine-sheet (**BUILT S272**; Row 32 follow-up) | none (canon-anchored — Log is canon) |
| T1c | **Prose read-back** (S273 Mike — un-deferred; closes the original amnesia hole / PT-1, the cheapest immersion fix). Read the citizen's own Supermemory page back into perception, **size-bounded (last-N / rolling) for tokens only**. UNGATED: the page is subjective memory, self-read-back never crosses the publication wall. Coexists with T1a (canon state) — prose adds the lived texture the state rollup can't. See OQ1 (re-resolved) + §AP-2 (overturned). | research-build (design DONE S273) → engine-sheet (build) | **none (subjective memory; publication wall already exists downstream)** |
| T3 | Read-the-Pulse pilot, reaction-only, **routed through research.17 injection filter** | research.17 must land first | research.17 filter live |
| T4 | Ask-the-citizen agency rung | research.12 Layer 3 | GPU + drift gate (autonomy roadmap) |

**Coupling:** immersion (this plan) amplifies the write-back (research.14) and rides the stakes (engine.38 B3). Build Tier 1–2 alongside the write-back; **Tier 1 no longer depends on research.17** (AP-1 — the canon-anchored state read-back needs no filter; research.17 is a *salience* filter, not a canon-truth validator, so it never guarded PT-1 in the first place). research.17's filter is a **Tier-3** dependency only (reading canon-bearing editions). Do not scale perception richness past the B4 cap + affect re-audit (PT-4).

---

## T2 Design (S273) — shared generative per-neighborhood texture digest

**Decision (Mike-approved S273, "take your recommendation"):** T2 is a **shared, generative, frozen per-neighborhood cycle artifact** the wake reads. Two knobs were open; both resolved.

### Knob 1 — shape: shared cycle artifact, NOT per-wake (resolves OQ2)

One digest covering all ~21 neighborhoods, generated **once per cycle**, frozen, then the wake reads the citizen's neighborhood block. Rejected the per-wake per-citizen translation (906× the cost, and non-deterministic unless frozen anyway). Three reasons shared wins:
- **Cost** — 21 neighborhood translations/cycle vs ~906 per-citizen.
- **Determinism** — frozen before any wake reads it, exactly like `world_summary_c{XX}.md`. Perception stays input-side; only the bounded reflection tag reaches the engine (Phase-1 gate unchanged).
- **The differentiation argument** — two Fruitvale residents *should* perceive the **same** neighborhood facts ("the gallery walk downtown, another storefront dark on the strip") and diverge **in their own voice** when they react. Differentiation lives at the citizen-voice layer (dials → disposition), not in the digest. Per-citizen translation would be solving a problem we don't have.

### Knob 2 — method: generative, NOT rule-based

A rule-based band→phrase map (crime>0.8 → canned string) reproduces `neighborhoodSlice.describe()` with nicer words: every Fruitvale citizen reads the *identical sentence every cycle* — aggregates in costume, violating the lived-particulars guardrail in spirit. The whole reason T2 exists (rather than piping `describe()` into the wake) is the metric→lived-particular rewrite. Only a generative step earns the layer. Cost is bounded (≤~21 short generations + a canon sweep, once/cycle).

### Artifact

- **Path:** `output/neighborhood_texture_c{XX}.md` — one block per neighborhood (~21), parallel to `world_summary_c{XX}.md`.
- **Block shape:** neighborhood name + **2–4 sentences of lived particulars** — what a resident would *notice* this cycle walking around. NO metrics in the output (no `+0.95`, no `retail 9.16`), NO real-world institutions/people.
- **Pipeline position:** generated **after** `world_summary_c{XX}.md` (which already assembles the per-hood raw material) and **before** the wake reads. Frozen for the cycle.

### Generator

- **Input (per neighborhood):** the world-summary's per-hood material — the Neighborhood snapshot row (sentiment/retail/eventAttractiveness/crime + deltas), neighborhood-tagged **World Events**, **Evening Texture** items in that hood (restaurants/nightlife/city events), **faith holy-days** in that hood — **plus** `neighborhoodSlice.state` for the two facts the summary table omits: **displacementPressure + medianIncome/rent** (the C95 invent-struggle guardrail data).
- **Grounding rule (bounds fabrication):** a block may only render particulars that **trace to a source line for that neighborhood**. No source events + flat metrics → "a quiet week, nothing much out of the ordinary." **Never invent drama.** This is the wall against the digest free-associating beyond engine truth.
- **Call shape:** one **batched** LLM call producing all ~21 blocks (the model sees the whole city, varies texture hood-to-hood, one generation — cheapest). The prompt **partitions source lines per-neighborhood** so a block draws only from its own hood's sources (guards cross-hood bleed). Same OpenRouter/DeepSeek path the wake's `generateVoice` already uses. *(Sub-question left for engine-sheet: if batched bleed shows in testing, fall back to per-hood-with-shared-city-context calls.)*

### Canon pass (proportional — wake-input-only, never published)

- **Mandatory, deterministic:** blocklist sweep over the 21 blocks — `docs/media/REAL_NAMES_BLOCKLIST.md` + `docs/canon/INSTITUTIONS.md` no-fly. Cheap, automated, fail-loud.
- **Light:** a CANON_RULES spot pass for alternate-timeline drift. NOT a full Rhea lane — this text feeds perception, never an edition. Right-sized to the surface.

### Determinism

The generator is non-deterministic run-to-run (LLM), but runs **once** per cycle → its output is the canonical **frozen** artifact, same class as an edition or the world_summary. Every wake in the cycle reads the identical frozen block. Determinism holds because perception is input-side and frozen; the Phase-1 gate (only the classified tag reaches the cycle) is untouched.

### Wake integration (the real seam)

Mirrors T1b exactly (`scripts/citizen-wake.js`):
- New `loadNeighborhoodTexture(nh, cycle)` — reads `output/neighborhood_texture_c{XX}.md`, returns the citizen's hood block, `''` if absent (graceful, like `loadSportsSlice` returning `''`).
- `buildVoicePrompts` takes a `textureLine` param; inject after the sports line (L200), following the immersion-ingredient order **continuity (T1a) → world/A's (T1b) → immediate surroundings (T2)**:
  ```
  const texture = textureLine ? `\n\nAround your neighborhood: ${textureLine}` : '';
  ```
  appended to the system prompt after `${sports}`.

### Guardrails inherited (from §Guardrails)

- **Lived particulars, never aggregates** — enforced structurally by no-metrics-in-output + the source-grounding rule.
- **Scale honesty** — hood-scoped, not city-wide: a citizen perceives *their corner*, not omniscience. (This is *why* the digest is per-neighborhood, not a city feed.)
- **C92 containment** — blocklist sweep + wake-input-only + the digest is never published.
- **PT-4 coupling** — T2 enriches perception → marginally richer reflections → marginally more dial movement. Rides the **same gate**: do not scale past engine.38 B4 composure cap + the research.14 affect re-audit before fanning to all-906.

### Build handoff → engine-sheet

**What to build:**
1. `scripts/buildNeighborhoodTexture.js` (or fold into the world-summary build chain) — reads `world_summary_c{XX}.md` + `Neighborhood_Map` (via `lib/neighborhoodSlice`), one batched OpenRouter call, blocklist sweep, writes `output/neighborhood_texture_c{XX}.md`. Runs after `/build-world-summary`, before the wake.
2. `scripts/citizen-wake.js` — add `loadNeighborhoodTexture(nh, cycle)` + `textureLine` param in `buildVoicePrompts` + the injection line. Wake-side, no clasp.

**Acceptance criteria:**
- Artifact generated each cycle post-world-summary, ~21 blocks present.
- **Zero metrics in output** (regex sweep: no bare decimal / ±N adjacent to a metric word).
- **Zero blocklist hits**; light canon spot-pass clean.
- Every particular traceable to a hood source line (spot-check 3 hoods).
- Empty/flat hood → quiet-week line, **no invented drama**.
- Wake dry-run on a citizen (`--dry-run --pop=POP-XXXXX`) shows `Around your neighborhood:` populated from that citizen's hood block.
- Determinism: the same frozen artifact is read across every wake in the cycle.

---

## T1a refinement (S273 — production verification finding)

**Finding:** dry-ran the live wake on two citizens (POP-00001 Vinnie, POP-00231 Calvin) to verify T1a is producing in production. It **is** — `Your life so far: 6 advancement events` / `3 advancement events` both populate the system prompt. But across the 15 post-upgrade reflections, the arc **never surfaces in the prose**, while T1b's narrative A's line lands in nearly every one.

**Diagnosis:** the arc format `loadLifeArc` emits is an **aggregate** — `"6 advancement events"`, a *count*. No person thinks "I have had 6 advancement events," so the LLM drops it. It's the **self-axis twin of the T2 problem**: T1b feeds narrative ("The A's are 74-24… carnival rides and food trucks") and lands; T1a feeds a number and lands nowhere. T1a is *built* but not *earning its place*.

**Refinement (T1a′):** translate the arc from a count to a **named most-recent milestone** — pull the latest `ARC_TAGS` row from `LifeHistory_Log` and render its *description* ("made foreman", "married", "lost the shop"), optionally with a coarse sim-time anchor ("a couple springs back"), instead of `Object.entries(counts)…`. Still canon-anchored (the Log is canon; no fabrication, no gate — the AP-reframe invariant holds). Same metric→lived-particular pass T2 runs, applied to the self-axis. Cheap: it's a different reduction over rows `loadLifeArc` already reads, not a new data source.

**Build note for engine-sheet:** edit `loadLifeArc` in `scripts/citizen-wake.js` to return the named latest-milestone string; keep the count as a fallback only if the latest row has no usable description. Verify via the same `--dry-run --pop=` check; acceptance = the milestone *name* appears in the prompt and bleeds into ≥1 of 3 test reflections. Ride the T2 build (both are wake-side, no clasp).

**Aside (not a repair):** the dry-run also surfaced legacy real-world timestamps (`2026-06-20 23:35 — [Faith]`) in the inline LifeHistory tail. These are **pre-fix residue** — the live writer was corrected at S271 (`eb7ef6d6` "kill real-world wall-clock from the sim's life record") + S264 (`ecbdca42` col-O → `C{cycle}`). Residual dated rows age out of the last-5 inline tail as new sim-time events push them off; no sweep / no ENGINE_REPAIR row warranted.

---

## Open questions

- [x] **Page read-back shape** — RE-RESOLVED S273 (Mike correction, overturns the AP-reframe deferral). **Prose read-back is PERMITTED and UNGATED** — the page is the citizen's *subjective memory*, not canon, and self-read-back never crosses the subjective→canon *publication* wall (it stays inside one citizen's layer). "Shady Greg"-class invention is memory *working*, not contamination to strip — re-injecting it is continuity. The AP-2 "compounds C92" framing mis-classified the feature as a failure. So BOTH read-backs coexist: T1a (canon-anchored state rollup, shipped) **+** prose read-back (own page, **bounded by size — last-N/rolling — for tokens, NOT for canon**). The only retained bound is economy. Edge case (invented name collides with a real canon name) is caught at the *publication* check, not by gating read-back. *Real-world fourth-wall refs* ("CNN"/"BART") remain C92 but are a **write-time** hygiene concern (pre-existing in the page regardless), never a read-back gate. Grounds in the locked canon principle (auto-memory `project_subjective-hallucination-is-canon`, S270).
- [x] **Tier-2 translation owner** — RESOLVED S273: **shared per-neighborhood cycle artifact** (frozen, generative), NOT per-wake. See §T2 Design. Cost + determinism + differentiation-lives-at-voice-layer all point to shared.
- [ ] **Tier 3 sequencing** — does it wait on research.17 fully, or can a no-canon-names subset (weather/sports/civic-mood) pilot earlier?
- [ ] **Relationships-with-texture (immersion ingredient 3)** — bonds ledger exists (`Relationship_Bonds`); is co-resident texture a Tier-1 add or its own task? Not yet placed.

---

## Changelog

- 2026-06-26 (S273) — **Prose read-back UN-DEFERRED (Mike correction — overturns the S270 AP-2 gate).** The page is the citizen's *subjective memory*, not canon; self-read-back never crosses the subjective→canon *publication* wall, so re-injecting "shady Greg"-class invention is **continuity, not contamination** — the AP-reframe mis-classified the feature as a C92 failure. Prose read-back is now UNGATED (size-bounded for tokens only) and coexists with the shipped T1a canon-state rollup. Edits: OQ1 re-resolved, AP-2 struck+overturned, subjective-invention guardrail tail corrected (no "fence" precondition — the publication wall sits between memory and edition, not between a citizen and their own page), added **T1c prose-read-back build-row**. Real-world fourth-wall refs ("CNN") stay C92 but are write-time hygiene, not a read-back gate. Also corrects a wrong statement made in-session (told Mike self-read-back was "fenced" — it is not). Grounds in auto-memory `project_subjective-hallucination-is-canon` (S270).
- 2026-06-26 (S273) — **T2 designed (Mike: "take your recommendation").** Resolved both open knobs: shape = **shared generative per-neighborhood cycle artifact** (`output/neighborhood_texture_c{XX}.md`, ~21 blocks, frozen post-world-summary, wake reads the hood block) over per-wake translation (cost + determinism + differentiation-lives-at-voice-layer); method = **generative** over rule-based (rule-based just reskins `describe()`; the metric→lived-particular rewrite is the whole reason T2 exists). Added §T2 Design with generator spec (batched OpenRouter call, per-hood source partition, displacement/income from slicer), source-grounding-bounds-fabrication rule, proportional canon pass (deterministic blocklist sweep + light CANON_RULES, NOT a Rhea lane — wake-input-only), the wake seam (mirrors T1b's `Around Oakland:` → `Around your neighborhood:`), inherited guardrails + PT-4 coupling, and the engine-sheet build handoff with acceptance criteria. Marked OQ2 resolved + T2 build-row `design DONE S273 → engine-sheet`, fixed stale `bot` terminal ref. Advisor was overloaded; reasoned + code-grounded the seam against `citizen-wake.js` L192–204 instead. **Also (production-verification finding):** dry-ran the live wake (POP-00001/POP-00231) — T1a *is* producing but its arc is an aggregate (`"6 advancement events"`) that never surfaces in 15 post-upgrade reflections (self-axis twin of the T2 metric problem); T1b's narrative A's line lands everywhere. Filed **T1a′ refinement** (arc count → named latest milestone from LifeHistory_Log, same translation pass, canon-anchored/ungated) + §T1a refinement. Confirmed the real-world-timestamp residue in the life tail is pre-fix (S271 `eb7ef6d6` / S264 `ecbdca42`) and self-ages-out — no repair row.
- 2026-06-23 (S270) — **Canon distinction (Mike):** subjective invention ≠ contamination. A citizen making up "shady Greg" is characterization (how they remember), not a sim record; the wall is the subjective→canon-publication boundary, not invention itself. Refines PT-1/AP-2 + added as a Guardrail. The AP-reframe stays the right *first* build (no boundary-marking machinery needed); prose read-back returns as a later tier once the subjective layer is fenced from canon.
- 2026-06-23 (S270) — **Advisor pass run (owed since S269).** Three findings + a reframe folded in. AP-1: T1a smuggled a gate + category error — research.17 is a salience filter, not a canon-truth validator, so it never guarded PT-1. AP-2: prose read-back compounds C92 (rolling summary doesn't save it). AP-3: T1b is the safe true-first build but serves world (ingredient 2), not continuity. **Reframe: pivot T1a from prose-read-back to canon-anchored self-state read-back (LifeHistory rollup + dial trajectory) — ungated AND contamination-free, since the fabrication lives in the prose, not the canon self-history.** Updated: Tier-1 desc, tier table canon-risk (Low–Med→None), T1a/T1b build rows, coupling line (Tier 1 no longer depends on research.17; that's a Tier-3-only dependency now), open-question 1 RESOLVED. Headline build now off the C100 wall.
- 2026-06-23 (S270) — Code-verification pass (advisor still overloaded): both premises confirmed against `citizen-wake.js`/`neighborhoodSlice.js` (CV-1 page-never-read, CV-2 no-world-beyond-block). Correction: neighborhood `state` is computed-but-discarded aggregates → moves from Tier-1 to T2 translation; T1b reduced to sports feed only. Advisor pressure-test still owed.
- 2026-06-23 — Initial draft (S269, research-build, Mike-approved "write it up"). Audit of current citizen perception (thin: disposition + last-5 LifeHistory + 3 names; writes-a-memory-never-read; no world beyond the block). Four-ingredient immersion frame (continuity / world-larger-than-self / relationships / stakes). Four-tier access architecture mapping Mike's candidates (Supermemory / Cycle Pulse / world-summary / agency). Self-pressure-test (advisor overloaded — PENDING): page-readback amplifies fabrication, Tier-2 translation is a real build, page growth needs bounding, immersion amplifies the write-back, Tier-3 needs a real filter not a prompt. Cross-linked research.14/.12/.17 + engine.38 B3.
