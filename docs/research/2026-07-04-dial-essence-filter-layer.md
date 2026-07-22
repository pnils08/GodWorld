---
title: Can an LLM read citizen dials raw, or does it need a dial→essence filter layer? — research
created: 2026-07-04
updated: 2026-07-04
type: reference
tags: [research, citizens, dials, citizen-loop, llm, active]
sources:
  - docs/engine/ENGINE_COUPLING_MAP.md (full read — the dial substrate + consumer contract)
  - lib/citizenDials.js (the existing filter: `disposition(cur)`, pure DialState JSON → prose phrase)
  - utilities/citizenDialMap.js (`getCitizenDialBands_` — the engine-logic filter: bands + multipliers, never raw floats)
  - scripts/citizen-wake.js:361 (the one live LLM-facing call site: `dials.disposition(c.cur)`)
  - grep sweep S291: zero hits for `DialState` in any `.claude/skills/` or `.claude/agents/` file — no LLM-facing bypass exists
  - docs/engine/archive/ROLLOUT_PLAN.md:124 (research.22 row — Mike-direct S286 close)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — research.22"
  - "[[index]] — register here, same commit"
---

# Can an LLM read citizen dials raw, or does it need a dial→essence filter layer? — research

**Source:** Internal architecture audit — full read of `docs/engine/ENGINE_COUPLING_MAP.md`, `lib/citizenDials.js`, `utilities/citizenDialMap.js`, and an exhaustive grep of every skill/agent file for direct `DialState` consumption. Triggered by Mike (S286 close): before any more LLM surfaces read a citizen's dial state, should they get the raw numbers or does something need to sit between the ledger and the prompt?

**What it does:** A citizen's `DialState` is a JSON blob — `{base: {drive, sociability, warmth, openness, composure, integrity, family, outabout}, streak, chaosExposure}`, eight bipolar values 0–100 centered 50. Two consumer classes already exist in the live engine, and **both already filter, neither reads raw floats:**
- **Engine logic** (career/household/relationship/neighborhood/education/conduct/generational/youth engines): reads through `getCitizenDialBands_(ctx, popId, dialStateJson)`, which converts to a **5-band index** (`BAND_CUTS [20,40,60,80]`) and returns per-dial frequency multipliers (0.5–1.5). "73 and 78 behave identically" — deliberate, per `ENGINE_COUPLING_MAP.md`'s own framing.
- **LLM-facing** (the 24/7 citizen wake, the only current LLM consumer of dial state): reads through `lib/citizenDials.js:disposition(cur)` — a pure function that converts the same JSON into a prose phrase ("driven, hard to sit still; warm, tender with people…"), omitting neutral dials entirely. `citizen-wake.js:361` is the one live call site.

**Extraction — what's usable:**
- **The filter layer Mike is asking about already exists and is already the only path in production.** `lib/citizenDials.js:disposition()` is exactly the dial→essence conversion — pure, tested-by-use (it's live in every wake), and it already omits neutral dials so a flat citizen doesn't produce false-precision prose. → No new subsystem is needed to answer this question; the answer is "yes, filter, and here's the filter."
- **Verified by exhaustive negative check, not inference.** Grepped every file in `.claude/skills/` and `.claude/agents/` for `DialState` — zero hits. No skill, no citizen-voice agent, no desk reporter currently has a code path that could read raw dial floats even if it wanted to; the only door into dial state for an LLM prompt is `disposition()`. → The "should we filter" question is already structurally enforced by absence of any alternative access path, not just convention.
- **The reason a filter is right, in the engine's own words:** raw values invite false precision (a citizen doesn't experience being "73 sociability" vs "78," they experience "warm, outgoing") and would leak an engine-internal representation into voice/prose surfaces that are supposed to sound like a person, not a spreadsheet. The band/phrase abstraction is what makes "consumers read the band, not the raw value" (`ENGINE_COUPLING_MAP.md` line 48) true on the LLM side as well as the engine side.
- **Directly load-bearing for engine.43's Track A** (`docs/plans/2026-07-04-voice-dial-sync-contract-build.md`, filed same session): the interview/Discord disposition-cache generator specified there calls `lib/citizenDials.js:disposition()` — this research confirms that's the correct, only-existing, already-proven path, not a new design choice made in isolation.

**Not applicable / hazard:**
- **The contract is convention-enforced, not code-enforced.** Nothing stops a future skill or agent file from being handed a raw `DialState` cell value directly (e.g., a careless prompt template interpolating a sheet row). The grep-clean result is a snapshot, not a guarantee. Worth a light guard (see Verdict) rather than trusting the pattern to hold by habit alone.
- **`disposition()` is currently the only filter shape.** It produces one register (plain trait-list prose) tuned for the wake's first-person reflection voice. A different LLM surface with a different register need (e.g., a reporter's *observation* of a citizen, third-person) might need a second filter function over the same bands — not a reason to go raw, just a note that "the filter" may need siblings, not replacement.

**Verdict:** `adopt` — confirm the existing pattern as the standing answer, formalize it as an explicit rule rather than an emergent one.
- No new filter needs building — `lib/citizenDials.js:disposition()` already is it, already proven, already the only path.
- Small follow-on, low effort: add one line to `docs/engine/ENGINE_COUPLING_MAP.md`'s consumer-contract framing (or `citizenDialMap.js`'s header, alongside its existing load-bearing-rule comment) stating explicitly: **"no LLM-facing surface reads DialState directly — always through `citizenDials.js:disposition()` (or a future sibling filter); raw dial floats never enter a prompt."** Makes the convention checkable, not just historically true.

**Ignited plans:** none — this closes research.22 with a confirm-and-document verdict, no build plan needed. The one artifact it feeds is already filed: [[../plans/2026-07-04-voice-dial-sync-contract-build]] (Track A cites this file as its justification for reusing `disposition()`).

---

## Applications (living)

- 2026-07-04 — Cited as the design justification for Track A of `docs/plans/2026-07-04-voice-dial-sync-contract-build.md` (engine.43).

---

## Changelog

- 2026-07-04 — Initial audit (S291, research-build). Closes research.22 (Mike-direct S286 close).
