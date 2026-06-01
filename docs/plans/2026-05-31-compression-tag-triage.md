---
title: Citizen bounded-memory engine — slots, promotion, conduct, R-as-derived-face
created: 2026-05-31
updated: 2026-06-01
type: plan
tags: [engine, citizens, memory, conduct, draft]
sources:
  - "S250 Mike-direct design session — redesigned engine.31 from tag-triage to a bounded-memory engine. Core directives: (a) R-TraitProfile must NEVER be erased — compression accretes, never recomputes from scratch; (b) Dwarf Fortress 8-slot bounded memory (research4_1.md:196) is the model, NOT just tag-routing; (c) a 5th CONDUCT category for crime/evil — bidirectional (transgression ↔ resistance), severity ladder, dark core = no one is safe; (d) R feeds its own outcome (moral momentum, good begets good); (e) bound gates runaway — only promoted CORE compounds."
  - "docs/research4_1.md:196 — Dwarf Fortress bounded memory: 8 short-term slots grouped by category, strongest-emotion-keeps, ~1yr → 8 strongest promote to long-term, reliving → 1-in-3 → core (permanent trait shift). 'Bounded state space prevents emotional runaway. No unbounded accumulators.'"
  - "utilities/compressLifeHistory.js v1.4/COMPRESS_VERSION=1.5 (header drift) — the live O→R compressor (Phase 9, every 5 cycles). TAG_TRAIT_MAP L75-170. Currently RECOMPUTES R from scratch every run (erase-and-rebuild) — the core flaw this plan fixes."
  - "S250 consumer-map audit — R-TraitProfile has 6 live readers (storyHook, applyStorySeeds, mediaRoomBriefingGenerator, buildDeskPackets, queryLedger, auditSimulationLedger); ALL only extract `Archetype:` or pass the whole string as desk texture. None parse internal structure → R's format is a contract (pipe-delimited + Archetype token) but its contents are reshapeable. CitizenBio (AT) effectively unused (PoC + audit counter only). Crime: city-level Crime_Metrics exists; ZERO generators emit individual crime events to a citizen — the macro stat never touches a single life."
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.31"
  - "[[index]] — registered"
  - "[[2026-05-31-emergent-bio-engine]] (engine.30) — consumes this plan's promotion/locking (core memories) + clean O"
  - "[[2026-05-31-life-event-generation]] (engine.32) — the matched pair: reads R's conduct-core to bias the low-prob moral-test dice (the R→output back-arc). engine.31 builds the room; engine.32 wires the dice."
  - "[[2026-05-30-citizen-lifecycle-fame-system]] (engine.29) — milestone events that should promote to core; Death/Divorce gaps overlap"
  - "[[../research4_1.md]] — Dwarf Fortress / RimWorld / CK3 / Victoria 3 memory architectures"
supersedes: "S249 'Compression-tag triage' (T1–T6 tag-routing plan) — that version was built S249 (6 commits c7a3cc9→3ea4d7d) then FULLY REVERTED. It patched tag-routing on top of the erase-and-rebuild compressor without challenging the erase. Mike's S250 review: the model was siloed — it took the 4 category LABELS and dropped the actual DF mechanism (bounded slots, strongest-keeps, promotion ladder, permanence). The old T1–T3 (routing/dead-mapping/category-layer) survive here as sub-steps of Phase 1; the real spine (stateful accretion + promotion + conduct) is new."
---

# Citizen bounded-memory engine — slots, promotion, conduct, R-as-derived-face

## The vision in one paragraph

A citizen's life accumulates as tagged events in **O (LifeHistory column)** — written by ~17 engines + media ingest, cycle after cycle. Today the Phase-9 compressor reads O and **recomputes R (TraitProfile) from scratch every run** — erase-and-rebuild, nothing survives. This plan replaces that with a **bounded-memory engine** modeled on Dwarf Fortress: events sort into **8 slots across 5 categories** (Social / Work / Family / Health / **Conduct**), each slot keeping only the **strongest** memory in its group (50 corpses → one slot). Memories that hold across cycles **promote** — short-term → long-term → **core**; core memories never decay and are what permanently shift the 5 personality axes. **R is never erased** — compression becomes *stateful* (`R_prev + O_new → R_next`, a merge, not a rebuild). The structured memory lives in a **new dedicated SL column**; R-TraitProfile stays the clean human/LLM-readable face the 6 existing readers consume, now *derived* from the memory rather than recomputed. The 5th category, **Conduct**, carries crime: bidirectional (transgression ↔ resistance), a severity ladder (stole butter → embezzled funds), low-probability dice, and a dark **core** that means *no one is safe* — but only a sustained pattern locks it, so no one is damned by a single roll. **More good begets good, more bad begets bad** — moral momentum, gated by the bound so it's a slow burn, not a collapse.

## Why the old plan was siloed (the correction that produced this one)

The reverted S249 plan answered four good questions (tags / routing / locking / per-compression effect) but its fixes were **tag-cleanup bolted onto erase-and-rebuild**. It named the 4 DF categories as routing buckets and never built: the bounded slots, the strongest-keeps rule, the promotion ladder, or permanence. It treated the existing 5-axis scoring as the thing to patch when the real ask is a **new memory layer between O and the axes**. Two layers were being fused:
- **Memory** (what a citizen carries) = the 8 bounded slots. *Did not exist.*
- **Personality** (who they're becoming) = the 5 axes (social/reflective/driven/grounded/volatile). *Exists, fine.*

In DF terms the axes are exactly what a *core* memory shifts when it promotes. So the architecture is: **O → 8 bounded slots → promotion ladder → permanent axis shift → AT earned bio.** The axes survive; promotions feed them instead of recomputing them.

## Architecture (locked S250)

### Storage — new column + R as derived face
- **New SL column (working name `MemoryState`)** — the structured machine state: the 8 slots (per category), each slot's strongest memory + its strength score + age-in-cycles + promotion counter, plus the promoted long-term / core sets. This is the "process column" — `|` and `:` in event text can't corrupt it because it's the machine's own structured store, not the readable string. **Confirmed safe to add:** the 6 R-readers index by header *name* (`idx('TraitProfile')`), not position, so appending a column ripples nothing. (SL v1.2 "cleaner tracking" is a *separate, parked* issue — do not scope-creep.)
- **R-TraitProfile stays the readable face** — same pipe-delimited format, same `Archetype:` + axes + texture the 6 readers already consume. Now *derived* from `MemoryState` each run instead of recomputed from O. Zero reader breakage; richer texture for free (axes are promotion-fed).
- **AT-CitizenBio** — earned narrative, **untouched here** (engine.30 territory; effectively unused today = clean slate).

### Compression becomes stateful (the spine)
`compressLifeHistory_` inverts from a pure recompute to a **merge**: read `MemoryState` back from its column → fold in the new O events since last run (strongest-keeps per slot) → age existing slots, decay non-core memories → run the promotion ladder → apply any new core promotions to the axes → re-derive R's readable string → write `MemoryState` + R back. **Consequence: only verifiable across a multi-cycle trace, not a single run.** A multi-cycle test harness is a build prerequisite (last session shipped an off-by-one + a cycle-order bug exactly here).

### The promotion ladder (= locking)
- **Short-term slot** — holds the strongest memory in its category group; decays each cycle; can be displaced by a stronger same-group memory.
- **Long-term** — a slot that holds (survives displacement + decay) across N cycles promotes; decays slower.
- **Core** — a long-term memory that keeps resurfacing promotes (DF: ~1-in-3 on reliving); **never decays**; **permanently shifts the 5 axes**. Milestone events (Wedding/Birth/Graduation/Promotion/Retirement/Death/Divorce) are natural core candidates — they're irreversible and some already mutate ledger state (engine.29/S248).
- **Promotion cadence in cycles** — DF's "~1 year" needs a concrete cycle mapping against the 5-cycle compression + 20-entry trim. **OPEN — pin in Phase 2.**

### The Conduct category (5th) — crime made real
- **Bidirectional.** Holds **transgressions** (a severity ladder: petty → grand) AND **resistances** (tempted, didn't). Failing accretes darkness; passing accretes integrity.
- **High salience.** A transgression out-muscles a coffee-shop memory for its slot — dark acts stick where pleasant ones fade.
- **Dark core → no one is safe.** Enough transgressions promote to a permanent dark core; **`Outlaw` (working name) joins the 7 archetypes** as the dark endpoint. Virtue handling: integrity deepens existing wholesome archetypes (Anchor/Caretaker) + raises a grounded/integrity signal — **a symmetric virtue archetype is OPEN** (don't sprawl to 9 unless Mike wants the symmetry).
- **Bound gates the momentum.** "More bad begets more bad" is real but only *core* compounds; a single stolen butter decays like any weak memory. It takes a *pattern* to lock a dark core. No one safe, no one damned by one roll.
- **engine.31 builds the room; engine.32 wires the dice.** This plan creates the Conduct category, its slots, the dark/virtue cores, all readable in R. The matched plan ([[2026-05-31-life-event-generation]], engine.32) builds the low-prob moral-test generator that **reads R's conduct-core to bias frequency, commit-vs-resist, and severity**, then writes the deed back into O → compresses into Conduct slots → loop closes. The R→output back-arc only works because this plan makes the conduct core exist and readable.

### The strength / salience function (the de-siloing)
"Strongest memory keeps the slot" needs a concrete score, and that's where the **rest of the SL integrates**: a Work event weighs more for a striver; a Family event for someone with children (NumChildren); a Health event scales with age; a Conduct event scales with severity + existing conduct-core. The memory engine reads the citizen's job / neighborhood / family / age columns to decide salience — not just the event tag. **This is the integration the old plan was missing. Define before the slot-merge code.**

## Phases (build order — all gated on Mike's go; deploy gated post-C96)

> **Deploy discipline (S250, terminal rule):** this build does NOT ride the C96 clasp deploy — C96 already carries two un-smoke-tested reactivations (cityDynamics + simYear). Design + commit locally now; clasp-deploy in a clean window after C96 smoke-tests, on Mike's go.

- **Phase 0 — Exhaustive writer/tag inventory + uniform-tagging (prerequisite, read-then-fix).** ✅ *Read-audit DONE S250 → [[../engine/TAG_REGISTRY]]* (the canonical tag→category map + Conduct vocab + fix list). Full universe (~50 tags) traced to source; texture-tier principle locked (slots are for events that change you, not weather); structural finding = no central registry (~14 engines mint tags independently → the registry becomes the single source both engines + compressor read). **Code remainder (gated post-C96):** fix the 3 raw-line writers (promotion / arrival / career `lifeOut`), standardize the edition tag, build the registry constant. *(Absorbs old T1 route-unmapped + T2 dead-mappings + T3 tag→category.)*
- **Phase 1 — `MemoryState` column + the slot data model.** Add the column; define the slot structure (8 slots / 5 categories / strength / age / promotion counter / long-term + core sets); write the serializer + a *robust* round-trip parser (must survive `|`/`:` in any derived text).
- **Phase 2 — Stateful merge + strongest-keeps + decay.** Invert `compressLifeHistory_` to read-merge-write. Implement strongest-keeps per slot, the salience function (reads SL columns), decay of non-core. Pin the promotion cadence in cycles.
- **Phase 3 — Promotion ladder + axis shift.** short-term → long-term → core; core never decays; core promotions shift the 5 axes (accretive, never recompute). R re-derived from `MemoryState`.
- **Phase 4 — Conduct category.** Bidirectional transgression/resistance slots; severity ladder; dark `Outlaw` core (+ virtue handling); confirm bound gates momentum. *(Event GENERATION is engine.32 — here we only build the receiving category + cores.)*
- **Phase 5 — Multi-cycle test harness + verification.** Trace 10+ cycles on sample citizens; confirm R never erases, slots stay bounded, promotion fires correctly, conduct core locks only on a pattern. Then — and only then — clasp deploy (post-C96, Mike's go).

## Acceptance criteria
1. R-TraitProfile is **never erased** — a multi-cycle trace shows merge, not rebuild; core memories persist across runs.
2. Memory is **bounded** — never more than 8 slots; same-group memories collapse to the strongest.
3. Every emitted O tag routes to exactly one of the 5 categories; zero events fall to Untagged; all writers emit uniform tags.
4. Promotion ladder demonstrably fires (short→long→core) on sustained memories; core shifts axes; one-off events don't.
5. Conduct category accretes both poles; a sustained transgression pattern locks a dark core; a single petty act does not.
6. The 6 existing R-readers keep working unchanged (format contract held: pipe-delimited + `Archetype:`).
7. `MemoryState` round-trips robustly (no corruption from `|`/`:` in derived text).
8. R exposes a readable conduct-core signal engine.32 can consume (the back-arc seam).

## Open design questions (resolve in-phase, don't block planning)
- **Promotion cadence** — concrete cycle counts for short→long→core vs the 5-cycle compression. (Phase 2)
- **Virtue archetype symmetry** — one dark `Outlaw`, or a matched virtuous endpoint too? (Phase 4 — Mike's call)
- **`MemoryState` encoding** — compact structured string vs JSON-in-cell vs delimited sub-format robust to event text. (Phase 1)
- **Slot distribution** — 8 slots across 5 categories: even (not divisible) or weighted (e.g. Conduct gets fewer, high-salience)? (Phase 1)

## Changelog
- 2026-06-01 (S250, engine-sheet) — **Full redesign from "Compression-tag triage" to "Citizen bounded-memory engine."** Mike-direct design session established: never-erase R (stateful accretion), DF 8-slot bounded memory as the real model (not tag-routing), 5th Conduct category for crime (bidirectional, dark core, no-one-safe), R-feeds-outcome moral momentum gated by the bound, new `MemoryState` column with R as derived face. Grounded in a S250 consumer-map audit (R lightly read → reshapeable; AT empty; crime city-level-only) + an independent re-derivation of the emitted-tag universe. Old T1–T6 absorbed into Phase 0. Deploy gated post-C96 per the S250 terminal rollout-attribution rule. **No code yet — model + plan only.**
- 2026-05-31 (S249, research-build) — Original tag-triage version (T1–T6). Built then fully reverted; superseded by the S250 redesign above. (History retained in git + claude-mem 26421/26469/26493/26543.)
