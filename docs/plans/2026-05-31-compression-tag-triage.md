---
title: Compression-tag triage — routing, categories, locking, accretion
created: 2026-05-31
updated: 2026-05-31
type: plan
tags: [engine, citizens, triage, draft]
sources:
  - "S249 Mike-direct 4 questions: 'what are the compression tags, do they support the memory concept? does the compressor route the events properly? how do we determine when they are locked and how each compression affects them?'"
  - "utilities/compressLifeHistory.js v1.5 — the live O→R compressor (Phase 9); TAG_TRAIT_MAP at L75-170"
  - "S249 tag-routing audit (Explore agent) — 59 mapped keys vs emitted tags across 15 event generators; full matched/unmapped/dead tables in this plan §Audit"
  - "[[2026-05-31-citizen-autonomous-poc]] §Ledger connectivity loop + §Memory-slot mechanism (research.13) — the 8-slot (Social/Work/Family/Health) target"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.31"
  - "[[index]] — register here in same commit"
  - "[[2026-05-31-emergent-bio-engine]] (engine.30) — consumes this plan's locking rule (T4) + clean O (T6)"
  - "[[2026-05-30-citizen-lifecycle-fame-system]] (engine.29) — milestone events that should lock; Death/Divorce gaps overlap"
---

# Compression-tag triage — routing, categories, locking, accretion

## Context

`compressLifeHistory.js` (Phase 9, every 5 cycles) is the live spine of the citizen-essence loop — it turns O (tagged LifeHistory events) into R (TraitProfile). Mike's S249 four-question review, run against a full tag-routing audit, found the compressor **works but is leaking**: real events fall through to "Untagged," 18 mapped tags are phantom, nothing becomes permanent, and every run overwrites rather than accretes. This plan is the triage. **Each finding is data-backed (§Audit); the fixes are §Tasks.**

## The four questions, answered

**Q1 — What are the tags; do they support the memory concept?**
59 tags in `TAG_TRAIT_MAP`, each mapping to one or more of **5 trait axes** (social / reflective / driven / grounded / volatile) — **not** the **4 memory categories** (Social / Work / Family / Health) the 8-slot model wants. Most *emitted* tags do bucket into the 4 categories (§Audit §7), so they **partially** support it — but **Family and Health are thin**, **"Work" has no live tag at all** (career events emit `[Career]`, and `[Work]` is a dead mapping), and many real tags are cross-cutting (Media, Weather, Education, Background, PrevEvening). **Verdict: tags support the memory concept only after a tag→category layer is added and the thin/cross-cut buckets are resolved.**

**Q2 — Does the compressor route events properly?**
**No — broken in both directions.** Of the audit: **41 tags route correctly**, but **10 emitted tags are UNMAPPED** (fall to "Untagged," losing all trait routing) and **18 mapped tags are DEAD** (no generator emits them). The unmapped set is high-value:
- **6 health-state tags** — `Critical, Recovering, Hospitalized, Stabilized, Setback, Recovery` (`generationalEventsEngine.js`) → the entire health lifecycle loses personality routing.
- **`Death`** (`generationalEventsEngine.js:828`) — a permanent life event, unmapped.
- **`youth-*`** (templated: youth-academic / -sports / -community_support / -resilience / -safety_awareness / -coming_of_age, `runYouthEngine.js:603`) — all youth events untagged.
- **`E{edition}`** (templated: E96, E97…, `enrichCitizenProfiles.js:381`) — **the newsroom-coverage signal**, the O←editions feeder Mike's loop runs on, is **lost in compression.**
- **`Life`** fallback (`generateGameModeMicroEvents.js:516`).

**Q3 — How do we determine when they are locked?**
**Nothing locks today.** Every compression fully re-derives traits from decay-weighted entries; the `[Compressed:]` block summarizes old entries but **no trait or memory becomes permanent.** The natural lock candidates are the **milestone tags** — `Wedding, Birth, Graduation, Promotion, Retirement, Death, Divorce` — irreversible structural events (some already mutate ledger state per engine.29/S248 Track 1: Wedding→married, Birth→NumChildren++). But **Death is unmapped** and **Divorce is never emitted** (mapped but dead). **A locking rule must be designed** — milestone = permanent non-decaying core slot; + a "dominant trait sustained over N compressions → locked" rule for emergent personality.

**Q4 — How does each compression affect them?**
Each run (5-cycle cadence): decay-weights all entries (0.95/unit), recomputes the 5 axes, **reassigns the archetype** (can flip cycle-to-cycle if the event mix shifts), refreshes top-5 tags + top-3 motifs, trims O to the last 20 raw + a `[Compressed]` block. **Effect: OVERWRITE, not ACCRETE** — recent events dominate, old fade, nothing permanent. For the earned-essence loop this is the core mismatch: **R is a rolling snapshot, but the essence is supposed to accrete.** Locking (Q3) + the R→AT accretion step (engine.30) are what fix it.

## Tasks (triage — priority order)

- **T1 — Route the 10 unmapped emitted tags (HIGH).** Add map entries (or normalize at emit) for the 6 health-states, `Death`, the `youth-*` family, `E{edition}` editions, and `Life`. **Death and E\* are the priorities** — a permanent life event and the newsroom-feeds-essence signal are both currently dropped.
- **T2 — Resolve the 18 dead mappings.** Either **wire** the generators that should emit them (notably **`Work`** — the Work memory-category has no tag — plus the **PostCareer** family and **`Divorce`**) or **prune** the genuinely dead (`Daily, QoL, Continuity, Civic Role` space-dup, `GAME-Micro, Quoted`). Decide per tag.
- **T3 — Add the tag→category layer** (Social / Work / Family / Health) over the existing tags for the 8-slot model (§Audit §7 is the starting map). Resolve thin **Family/Health** buckets and route cross-cutting tags (Media/Weather/Education/Background) — a 5th "City/Self" bucket or explicit routing rules.
- **T4 — Design the locking rule.** Milestone tags → permanent non-decaying core slots; dominant-trait-over-N-compressions → locked. Tie to engine.29's milestone state mutations (Wedding/Birth/Death). **Feeds engine.30** (the milestone triggers for AT accretion).
- **T5 — Accretion model.** Make compression *feed the earned story* (AT) rather than only overwrite R — the bridge to **engine.30 (emergent-bio)**. Define what a compression contributes to AT vs what it overwrites in R.
- **T6 — Clean O + reconcile R formats.** De-contaminate seed-bio prose from the event stream (it compresses as "Untagged" noise); reconcile the two R formats (engine-compressed vs Lucia's hand-authored lore). **Feeds engine.30** (clean input).

## Sequencing
T1 first (routing bugs — Death + E\* are live data loss). T2 alongside (Work tag). T3 + T4 are the memory-model core. T5 + T6 bridge into engine.30 (emergent-bio). **Build order: this plan (engine.31) lands before engine.30** — engine.30 consumes T4 (locking rule) + T6 (clean O). Engine-sheet builds; all gated on Mike's go-ahead.

## Acceptance criteria
1. Zero emitted tags fall to "Untagged" (T1) — every generator tag has a route; audit re-run clean.
2. No dead mappings, or each retained dead mapping has a documented "will-emit" plan (T2).
3. A tag→category mapping exists and every emitted tag resolves to a memory category (T3).
4. A written locking rule + a list of lock-events, consumed by engine.30 (T4).
5. Defined accretion contract between compression and AT (T5).
6. O carries events only; one R format (T6).

## Changelog
- 2026-05-31 (S249, research-build) — Initial triage. Mike-direct 4-question review of the compression-tag system, run against a full routing audit (59 mapped vs emitted tags across 15 generators). Filed engine.31. Findings: 10 emitted-unmapped (incl. Death + edition-citations), 18 dead mappings, no locking, overwrite-not-accrete. Tasks T1–T6; T4/T6 feed engine.30 (emergent-bio). Building gated on Mike's go-ahead.
