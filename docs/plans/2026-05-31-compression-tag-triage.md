---
title: Citizen dial engine — 7 bipolar trait dials, band-mapped, back-dated from life history
created: 2026-05-31
updated: 2026-06-08
type: plan
tags: [engine, citizens, memory, dials, conduct, draft]
sources:
  - "S253 Mike-direct design session (2026-06-08) — pivoted engine.31 from the slot/bucket model to a per-citizen DIAL model. Core directives: (a) every citizen carries the SAME small set of dials, each 0-100 — nobody is a 'type', a person is where their dials sit; (b) the dials must fit a CITY/LIFE sim, not a Dwarf-Fortress survival sim — the DF facet list over-indexes moral/emotional and misses sociability + openness + ambition, the dimensions a city's events actually live in; (c) bipolar around 50 — below 50 IS the negative pole, no separate negative dial; (d) add Family-oriented to drive household-building; (e) the raw 0-100 number drives NOTHING directly — a coded BAND map sits on top and that is what events + voice read; (f) primary consumer is event-generation (volume), voice is secondary (citizens generate far more life than gets covered); (g) crime folds in as erosion of the Integrity dial — get away from cookie-cutter-everyone-is-good; (h) back-date the dials by replaying each citizen's existing life-history backlog."
  - "S252 build+revert (2026-06-07) — the S250 SLOT model (8-10 slots / 5 categories / JSON MemoryState) was BUILT (Phase 1, commit 8004bd6, proving ground 15/15) then FULLY REVERTED (commit 122a115): 'buckets/archetype model wrong (1100→types); rebuild as 8 per-citizen metrics.' The reverted rebuild = utilities/citizenMemory.js — the per-citizen DIAL prototype (base + mood + streak + harden). Its MECHANIC survives into this plan; its 8 DF-flavored dials (hardworking/warm/anxious/brave/forgiving/greedy/loyal/temper) are SUPERSEDED by the 7 city-fit dials below."
  - "utilities/citizenMemory.js — the surviving dial-engine prototype (untracked). base[dial] (permanent self) + mood[dial] (current swing, decays MOOD_DECAY=0.8/cycle) + streak[dial] (reinforcement counter; |streak|>=HARDEN_STREAK=3 bakes HARDEN_FRACTION=0.4 of the swing permanently into base, then resets). describe_() renders dials→words via tiered bands. This is the vehicle; rewrite the dial LIST to the 7 in Phase 1."
  - "utilities/compressLifeHistory.js v1.4/COMPRESS_VERSION=1.5 — the live O→R compressor (Phase 9, every 5 cycles). RECOMPUTES TraitProfile from scratch every run (row[iTraitProfile] = profileString, L271, built fresh from parsed entries) — the erase-and-rebuild this plan replaces with stateful accretion."
  - "S250 consumer-map audit — TraitProfile (col R) has 6 live readers (storyHook, applyStorySeeds, mediaRoomBriefingGenerator, buildDeskPackets, queryLedger, auditSimulationLedger); ALL only extract `Archetype:` or pass the whole string as desk texture. None parse internal structure → R's contents are reshapeable as long as the readable face stays pipe-delimited + carries an `Archetype:` token. CitizenBio (AT) effectively unused (engine.30 clean slate)."
  - "LifeHistory_Archive (tab, 564 rows, cols: Timestamp/POPID/Name/EventTag/EventText/Neighborhood/Cycle, 'no active reader') + LifeHistory (col O per-citizen string) + LifeHistory_Log (tab) — the per-POPID event backlog back-dating replays."
  - "docs/research4_1.md:196 — Dwarf Fortress bounded memory + facet model (the mechanic + the warning: bounded state prevents runaway). CK3 (traits multiply event impact), Victoria 3 (pressure→threshold→structural change), RimWorld (city-level recovery counterweight) — research lineage retained §Research lineage."
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.31 (row updated S253 to the dial model)"
  - "[[index]] — registered (entry updated S253)"
  - "[[2026-05-31-emergent-bio-engine]] (engine.30) — consumes hardened dials + clean O for the R→AT earned bio; RIPPLE: its 'core memory' promotion language reconciles to 'hardened dial' here (flagged, its own pass)"
  - "[[2026-05-31-life-event-generation]] (engine.32) — the matched pair: reads dial BANDS to bias generation (Integrity→crime reachability, Drive→career, Family-oriented→births). RIPPLE: its 'conduct-core' seam + 5th-Conduct-category collapse into the Integrity dial here (flagged, its own redesign pass)."
  - "[[../engine/TAG_REGISTRY]] (engine.31 Phase 0) — the tag→category map; reused as scaffolding. The NEW tag→{dial:delta} map (Phase 1 deliverable) extends it and supersedes compressLifeHistory's TAG_TRAIT_MAP."
  - "[[../research4_1.md]] — Dwarf Fortress / RimWorld / CK3 / Victoria 3 memory + personality architectures"
supersedes: "TWO prior versions, both retained in git + claude-mem. (1) S249 'Compression-tag triage' (T1–T6 tag-routing) — built then reverted, patched routing on erase-and-rebuild without challenging the erase. (2) S250 'bounded-memory SLOT engine' (8-10 slots / 5 categories / JSON MemoryState column / promotion ladder / 5th Conduct category) — built S252 (commit 8004bd6) then FULLY REVERTED (commit 122a115): the slot/bucket framing pushed 1,100 citizens toward shared 'types' instead of each being a unique point in dial-space. This S253 version keeps what both got right (never-erase, stateful accretion, sustained-pattern-changes-you, crime-made-real) and replaces slots-and-categories with per-citizen dials. Phase 0's tag read-audit (TAG_REGISTRY) survives as input."
---

# Citizen dial engine — 7 bipolar trait dials, band-mapped, back-dated from life history

## The vision in one paragraph

A citizen's life accumulates as tagged events in **O (LifeHistory)** — written by ~17 engines + media ingest, cycle after cycle. Today the Phase-9 compressor reads O and **recomputes TraitProfile from scratch every run** — erase-and-rebuild, nothing survives, and nothing downstream actually uses the result. This plan replaces that with a **per-citizen dial engine**: every citizen carries the **same 7 bipolar dials** — *Drive, Sociability, Warmth, Openness, Composure, Integrity, Family-oriented* — each a **0-100** value centered on 50. **Nobody is a "type."** A person *is* where their 7 dials sit. An event nudges the relevant dials a little; a one-off **fades** back toward who they are; a **sustained, same-direction pattern hardens** permanently into their baseline — the only way a person actually changes. The dials are **back-dated**: we replay each citizen's existing event backlog (the 564-row archive + their live history) through the engine so their dials come from their *real lived life*, not a blank 50. **The raw number drives nothing directly** — a coded **band map** sits on top (e.g. `0-20` = the negative extreme, `80-100` = the positive extreme, a wide quiet `40-60` middle), and *that band* is what the two consumers read: **(1) event-generation probability** (the primary, high-volume use — high Drive rolls more career events, low Integrity makes crime reachable at all), and **(2) voice** (secondary — the band picks the descriptor word for prose/desk texture). Crime is not a separate system — it is **erosion of the Integrity dial**, gated by the same harden-streak so one bad act doesn't damn a citizen but a *pattern* does. This gets us off the cookie-cutter-everyone-is-good baseline and gives 1,100 citizens distinct, earned, lightweight identities — 7 numbers a citizen, not a fortress.

## Why the model pivoted (twice) — the correction that produced this one

- **S249 slot-routing** answered tag/routing/locking but bolted cleanup onto erase-and-rebuild. Reverted.
- **S250 slot engine** built the real DF mechanic (bounded slots, strongest-keeps, promotion ladder, a 5th Conduct category). Built S252, **reverted** — the slot/bucket framing nudged 1,100 citizens toward a handful of shared **types** (which category a citizen's slots cluster in), exactly the cookie-cutter outcome we're trying to escape. Slots model *what a citizen remembers*; for a media-covered city sim the question is *who they are and what they'll do next* — a continuous point in trait-space, not a memory inventory.
- **S253 dial engine (this).** Keep what all three got right — **never erase, accrete statefully, a sustained pattern changes you, crime made real** — and represent identity as **7 dials per citizen** instead of slots+categories. Dials are continuous (no two citizens identical), lightweight (7 numbers), and natively bias both event-generation and voice through the band layer.

**Critically, the dials are chosen for a CITY, not a fortress.** The DF facet list (and the reverted prototype's 8) over-indexed the moral/emotional register (4 of 8 were "how agreeable," 3 were "emotional stability") and carried **nothing** for the two dimensions a city's events live in: how *social* a person is and how *open/curious*. A dwarf's job is assigned and there's no nightlife; a citizen's life is relationships, civic participation, culture, ambition, family. The 7 below are picked by working backward from **the events the engine actually emits** and **what each dial biases next** — a dial nothing moves and nothing reads is dead weight (the exact TraitProfile failure we're fixing).

## The 7 dials (bipolar, 0-100, midpoint 50)

Below 50 is the **negative pole** of the same dial — no separate negative dial. Each row: what it is · the events that **move** it · what it **biases** (the back-arc into generation).

| Dial | Low pole ↔ High pole | Moved by (O event tags) | Biases (event-generation back-arc) |
|---|---|---|---|
| **Drive** | aimless/complacent ↔ driven/relentless | Career, Career-Transition, Career-Training, Promotion, Education, Graduation, Arc | Frequency of career / promotion / education events |
| **Sociability** | withdrawn/solitary ↔ gregarious/connected | Relationship, Neighborhood, Community, CivicRole, Civic Perception, Media, Quoted, Cultural | Frequency of social / civic / community events |
| **Warmth** | cold/callous ↔ warm/caring | Mentorship, family-support, caretaking, Recovery(helping), youth-community_support | Mentorship/support events; modulates relationship *quality* |
| **Openness** | set-in-ways ↔ curious/experimental | Cultural, Education-Cultural, Lifestyle, Arc, Career-Transition(novelty), Media | Cultural participation, willingness to change career/try new |
| **Composure** | volatile/anxious ↔ steady/calm | Critical/Setback/Hospitalized (down), Recovery/Stabilized (up), Divorce/loss (down), Rivalry/conflict (down) | Stress-response events; volatility-driven outcomes |
| **Integrity** | corrupt/criminal ↔ upright/well-regarded | **Conduct (transgress → down, resist → up)**, Reputation, some Civic | **Crime reachability** (low band → crime events become possible at all); reputation |
| **Family-oriented** | unattached/independent ↔ family-centered | Wedding, Birth, Household, youth-* (family), Divorce (complex) | Frequency of marriage / birth / household-formation events |

**Left out, by design:** `brave` and `loyal` (folded — courage reads through Composure, loyalty through Warmth+Integrity); `greedy`/`temper` from the prototype fold into **Integrity** and **Composure**. *Open: re-add brave/loyal as distinct dials if Mike wants them surfaced (§Open questions).*

## Architecture — three layers (the de-siloing)

### Layer 1 — Raw dial (0-100): the accumulator (no consumer reads this)
The stored value. Events nudge it in **small increments**; mood swings **decay** toward baseline each cycle; a sustained **streak** hardens a fraction permanently into baseline (the prototype mechanic: `base + mood`, `mood *= 0.8/cycle`, `|streak| ≥ 3 → bake 0.4 of swing into base`). **The fine precision exists only so change is *gradual*** — a run of events drifts a citizen 73 → 81 over time and *crosses* a band; it is never read directly. (This is why 0-100 over 0-10: at 0-10 small nudges either round to zero — nobody ever moves — or every nudge is a whole-band jump — everybody's twitchy.)

### Layer 2 — Band map (coded): the interface
Each dial's 0-100 maps to a small set of **bands, weighted to the extremes** — the middle (~40-60) is a wide, quiet "unremarkable / average person," the ends are where stories live. Working cut (tune in Phase 1):

`0-20` far-negative · `20-40` negative · `40-60` neutral (wide) · `60-80` positive · `80-100` far-positive

**78 and 73 are identical in effect** (same band). A citizen at 50 is wallpaper; one at 12 Integrity is a crime arc waiting to happen. Crossing a band boundary is the *meaningful* moment — that's when behavior changes.

### Layer 3 — Two consumers read the band (never the raw number)
- **(primary) Event-probability multiplier.** The band sets a multiplier on the events the dial governs (high Drive band → career events roll more often; low Integrity band → crime events reachable at all). This is the high-volume use — citizens generate far more life than gets covered.
- **(secondary) Voice descriptor.** The same band picks the adjective for prose / desk texture (`describe_()`-style). Lower volume, same source.

## Storage — dials are truth, TraitProfile is the derived face
- **Dials are the source of truth**, stored compactly (the 7 values + mood/streak state, JSON-in-cell — tiny, robust round-trip; the `|`/`:` corruption risk dissolves because machine state never touches the pipe-format).
- **TraitProfile (col R) is repurposed** to hold the dial state **plus the derived readable face** — the same pipe-delimited string carrying `Archetype:` + descriptors the 6 readers already consume, now **derived from the dial bands** instead of recomputed from O. **Archetype is derived** (from the dial bands), not stored. Zero reader breakage (format contract: pipe-delimited + `Archetype:` token held).
- **AT-CitizenBio** untouched (engine.30 territory; effectively unused = clean slate).

## Compression becomes stateful (the spine)
`compressLifeHistory_` inverts from **recompute** to **accrete**: read the dial state back from R → fold each new O event since last run as a **nudge** (via the tag→dial map) → settle mood decay → harden any sustained streaks into baseline → re-derive the readable face (`Archetype:` + descriptors from bands) → write back. **Consequence: only verifiable across a multi-cycle trace, not a single run** (last build shipped an off-by-one + a cycle-order bug exactly here — a multi-cycle harness is a Phase-6 prerequisite before deploy).

## Back-dating — the one-time seed
For each citizen, pull their events from **LifeHistory_Archive (564) + LifeHistory (col O) + LifeHistory_Log**, key by POPID, order by Cycle, and replay each through the dial engine. Result: dials reflect the citizen's *actual lived history*.
- **Rich, lopsided histories → vivid, distinct dials.** Sparse histories → near-50. New arrivals → 50.
- **This "some we know well, some a mystery" texture is intended** (Mike, S253) — it's an artifact of building the sim along the way (not all citizens always generated life events), and it's *true to a real city*. 50 is the honest "we don't know them yet" default. Event-generation probabilities get revisited once this lands (Mike — deferred; reassess generators after the dial engine is live).

## The tag→dial map (the real build under back-dating)
A **new** map: `EventTag → { dial: delta, ... }`. The archive gives EventTags; the engine wants nudges. Built **from** TAG_REGISTRY's category groupings but finer — **a tag can move multiple dials**:
- `Promotion` → `+Drive` (strong), `+Composure` (small)
- `Divorce` → `−Family-oriented`, `−Composure`
- `Wedding`/`Birth` → `+Family-oriented`, `+Warmth`
- `Conduct:transgress` → `−Integrity` (scaled by severity); `Conduct:resist` → `+Integrity`
- `Cultural` → `+Openness`, `+Sociability`
Texture tags (Weather/Holiday/FirstFriday/Sports) carry **near-zero** nudges — they tint, they don't reshape. **Extensible:** new events plug a new tag into the map (Mike — events grow as the engine grows). Supersedes `compressLifeHistory.TAG_TRAIT_MAP` (which targeted the old 5 axes).

## Phases (build order — all gated on Mike's go; deploy gate post-C96 already CLEAR)

> **Deploy discipline (S250 terminal rule):** the post-C96 hold is released (C96 two-reactivation smoke-test PASSED S252). This build still deploys in a clean window on Mike's go — design + commit locally through Phase 6, then clasp-deploy.

- **Phase 0 — Tag inventory + uniform tagging.** ✅ *Read-audit DONE (TAG_REGISTRY).* Category map reusable as input to the tag→dial map. **Code remainder (carried):** fix the 3 raw-line writers (promotion/arrival/career `lifeOut`), standardize the edition tag, build the central registry constant.
- **Phase 1 — The 7-dial model + band map + tag→dial map.** Define the 7 dials + their band thresholds + nudge sizes; write the tag→`{dial:delta}` map; rewrite the prototype's dial list (8 DF → 7 city) keeping its base/mood/streak mechanic. *(Design mostly settled S253; this phase codes it.)*
- **Phase 2 — Stateful compression.** Invert `compressLifeHistory_` to read-accrete-write; wire the dial engine in; mood decay + streak harden per cycle.
- **Phase 3 — Back-dating replay harness.** One-time: replay each citizen's full event log → seed dials. Verify rich/sparse/new-arrival texture lands as intended.
- **Phase 4 — Derived archetype + band→voice.** Archetype computed from dial bands; descriptor words from bands; confirm the 6 R-readers are unbroken (format contract held).
- **Phase 5 — The event-bias seam (hand-off to engine.32).** Expose dial bands as the read surface generators consume; Integrity band gates crime reachability; Drive/Family-oriented bias career/birth frequency. *(Generation itself = engine.32.)*
- **Phase 6 — Multi-cycle test harness + verify, then deploy.** Trace 10+ cycles on sample citizens: dials never erase, stay 0-100-bounded, hardening fires only on sustained patterns, crime locks only on a pattern. Then — and only then — clasp deploy on Mike's go.

## Acceptance criteria
1. Every citizen carries **7 bipolar dials (0-100)**; compression **accretes, never erases** — a multi-cycle trace shows drift, not reset.
2. **No consumer reads the raw dial** — all read the band. 78 and 73 produce identical behavior; a sustained event run moves a citizen *across* a band.
3. Bands are **weighted to the extremes**; the ~40-60 middle is "unremarkable."
4. **Back-dating** replays the event log → dials reflect real history; rich histories vivid, sparse near-50, new arrivals 50.
5. **Crime = Integrity erosion**: a low-Integrity band makes crime events reachable; a single act does not damn (streak-gated hardening); a sustained pattern locks a dark band.
6. The **6 R-readers keep working** unchanged (format contract: pipe-delimited + `Archetype:`, archetype now derived from bands).
7. The **tag→dial map covers every emitted tag**, is extensible, and supersedes `TAG_TRAIT_MAP`.
8. Dial **bands are exposed as the seam engine.32 reads** (Integrity→crime, Drive→career, Family-oriented→births).

## Open design questions
- **Band thresholds + count** — 5 extreme-weighted bands is the working cut; tune widths + count empirically in Phase 1/6.
- **Nudge sizes + harden params** — per-tag deltas, the harden streak (proto: 3) + fraction (proto: 0.4) + decay (proto: 0.8) — tune empirically.
- **brave / loyal as distinct dials** — currently folded (Composure / Warmth+Integrity). Re-add as distinct dials only if Mike wants them surfaced.
- **Event-generation probability rebalance** — needed once live (Mike, deferred). Reassess the event generators after the dial engine lands.

## Ripples to reconcile (flagged S253 — NOT done this session)
- **engine.32 plan** — seam redefined: old "conduct-core" + 5th-Conduct-category → the **Integrity dial band**. Its own redesign pass.
- **engine.30 plan** — "core memory" promotion language → "hardened dial"; R→AT accretion still valid, now reads dials.
- **TAG_REGISTRY** — category map reused; the tag→dial map (Phase 1) extends + supersedes `TAG_TRAIT_MAP`.
- **ROLLOUT engine.31 row + index entry** — updated this session to the dial model.
- **citizenMemory.js (untracked prototype)** — mechanic survives; its 8 DF dials superseded by the 7 city dials; rewritten in Phase 1.

## Research lineage (the 4 games — `research4_1.md:196–239`)
- **Dwarf Fortress** — the *mechanic* (events nudge a personality, a sustained pattern permanently shifts it, bounded so no runaway). We take the mechanic, **not** the fortress-survival facet list.
- **Crusader Kings 3** — traits multiply event impact + temporal decay → present as the band-multiplier on generation + the 0.8/cycle mood decay.
- **Victoria 3** — pressure → threshold → structural change → present as the harden-streak (a *pattern* crosses a band and locks).
- **RimWorld** — city-level recovery counterweight: our harden-gate bounds *individual* runaway, but city-level "bad begets bad" needs a floor (when `Crime_Metrics` spikes the engine should lean positive). → engine.32 / population-balance, not engine.31 scope, but the safety valve the dark side needs.

## Changelog
- **2026-06-08 (S253, engine-sheet) — Phase 2 BUILT (no deploy): stateful fold-on-trim compressor.** `compressLifeHistory.js` v1.5 → v2.0 — inverted from erase-and-rebuild to accrete. Fold-on-trim (advisor-vetted over a timestamp watermark, which the real null-timestamp/[Compressed]/tied-minute data shape would break): events leaving the raw-20 window accrete into `base`+`streak` (each folded once by construction), `mood` re-derived not persisted, face derived from `base`. New `DialState` column holds `{base,streak}` JSON; **missing column → inert no-op** (never wipes — deploy-with-Phase-3 safety). Crime = integrity erosion; `Conduct:` token added as the engine.32 seam. v1.x trait-axis machinery left dead (separate cleanup). Proven 22/22 on 4 REAL heterogeneous citizens (`scripts/compressLifeHistory.dial.test.js` + `__fixtures__/realLifeHistory.json`) — core proof = re-run after trim yields byte-identical base (no double-count). Caller graph clean (2 Phase-9 sites, no `trimHistory:false`).
- **2026-06-08 (S253, engine-sheet) — Phase 1 BUILT (no deploy): 7-dial engine + tag→dial map.** `utilities/citizenMemory.js` v2 (7 city dials, band layer as sole interface, harden-on-streak) + `utilities/citizenDialMap.js` (tag→{dial:delta}, multi-dial, calendar-suffix strip, crime severity) + `scripts/citizenDials.test.js` 31/31. ES5-safe (Node + Apps Script).
- **2026-06-08 (S253, engine-sheet) — Pivot from the slot model to the 7-dial city model.** Mike-direct design session. Established: 7 bipolar city-fit dials (Drive/Sociability/Warmth/Openness/Composure/Integrity/Family-oriented), 0-100 stored as an accumulator, a coded band map (weighted to extremes) as the only interface, event-generation as the primary consumer + voice secondary, crime as Integrity erosion (no separate category), derived archetype, back-dated from the 564-event log. Dials chosen by working backward from emitted events + what each biases (city, not fortress). Doc body rewritten wholesale; slot-model frontmatter/phases/criteria replaced; lineage + Phase 0 (TAG_REGISTRY) retained. Ripples to engine.30/.32 + TAG_REGISTRY flagged for their own passes. No code — design only.
- 2026-06-07 (S252, engine-sheet) — SLOT model Phase 1 BUILT (commit 8004bd6, proving ground 15/15) then FULLY REVERTED (commit 122a115): bucket/archetype framing pushed 1,100 citizens toward shared types. The reverted rebuild = `citizenMemory.js` dial prototype, which seeds this S253 pivot.
- 2026-06-01 (S250, engine-sheet) — Slot-engine redesign + Phase 1 slot/salience design (now superseded). DF 8-slot bounded memory, 5th Conduct category, JSON MemoryState column, R-as-derived-face. Phase 0 read-audit shipped (`42089f6`, TAG_REGISTRY).
- 2026-05-31 (S249, research-build) — Original tag-triage version (T1–T6). Built then fully reverted. (History in git + claude-mem 26421/26469/26493/26543.)
