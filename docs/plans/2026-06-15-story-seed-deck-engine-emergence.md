---
title: Story_Seed_Deck → Engine-Emergent, Attributed, Desk-Ready Story Surface
created: 2026-06-15
updated: 2026-06-15
type: plan
tags: [engine, pipeline, editions, token-burn, storylines, active]
sources:
  - Mike S259 (2026-06-15) — "agents aren't able to take raw numbers and connect a storyline … showing the agents what happened and why and to who would likely save a lot of token burn"
  - Live C97 Story_Seed_Deck distribution (147 seeds: 104 storyline-followup / 100 GENERAL domain)
  - output/engine_audit_c97.json (patterns + tribuneFraming.storyHandles already do what/who/framing)
  - lib/neighborhoodSlice.js (engine.33 — per-hood residents + numbers)
  - scripts/engine-auditor/generateBaselineBriefs.js (engine_audit → briefs, the existing emergence surface)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.35 row points here"
  - "[[../engine/ENGINE_REPAIR]] — Row 28 (crisis-arc rebuild) folds into this; same effort"
  - "[[2026-06-13-c97-gap-log-triage]] — supersedes ES-4 step 1's mechanical 'cap recycled' framing"
  - "[[../archive/plans/2026-06-10-engine33-neighborhood-citizen-loop]] — neighborhoodSlice is the who+numbers source"
  - "[[../index]] — registered same commit"
---

# Story_Seed_Deck → Engine-Emergent, Attributed, Desk-Ready Story Surface

## Thesis (Mike S259)

**Agents can't turn raw engine numbers into a storyline.** So the *engine* must do the
connecting — **what happened, why, and to whom** — and hand the desk a narrative-ready
packet. The deck becomes the engine's pre-computed story surface; the edition run reads it
instead of re-deriving, and re-derivation is where the token burn lives. "Showing the agents
what happened and why and to who would likely save a lot of token burn."

## Division of labor — engine EMERGES, Supermemory MAINTAINS (Mike S259)

> "The engine doesn't need to maintain the stories as the Supermemory does that — the articles, grades."

This is the clean split and it **simplifies** the deck's job:

- **Engine (the deck):** pure **emergence**. Detect this cycle's salient deltas and connect them into
  fresh what/why/who units. It does NOT track "have we covered this / what's the running thread / how
  did it score." Forward-only signal.
- **Supermemory (bay-tribune):** **maintenance / continuity** — the published articles + their grades
  ARE the story history. "Is this a continuation, has it been covered, did the last take land" is a
  **Supermemory lookup at edition time** (sift / Mara already query it), not an engine-maintained
  seed stream.

This directly explains the C97 noise: the `storyline-followup` recycling is **the engine trying to
do Supermemory's job** — re-emitting old threads as fresh seeds every cycle. That's the 71%. Gating
it (move A) isn't just denoising; it's **removing a responsibility the engine never should have held.**
Continuity comes from the articles+grades in Supermemory, queried when an edition is built.

## Grounded problem (live C97)

`Story_Seed_Deck` C97 = **147 seeds, 104 (71%) `storyline-followup`, 100 (68%) domain `GENERAL`.**
The deck today *recycles old threads* — it emits a continuity nudge for every storyline "not
mentioned recently" — it does **not** emerge stories from the engine. The priority/byline layer
(and the edition agents) wade through ~3.5× noise to find signal. 8 of those followups were
dead Chicago threads with zero live-canon backing (Mike: Chicago is a **proved-concept, dormant**
aspect — scaled back to fine-tune journalism coverage first).

## What already exists — build on it, do NOT reinvent

The "connect the numbers" engine is **largely already running**; it just doesn't feed the deck.

| Capability | Where it lives | Carries |
|---|---|---|
| **What + Who + proof** | `engine_audit_c<N>.json` `patterns[]` | `type` (what), `affectedEntities.citizens` (who, POPIDs) / `.neighborhoods` / `.initiatives`, `evidence.{sheet,rows,fields}` (proof), `description` |
| **Editorial framing** | same patterns → `tribuneFraming.storyHandles.<domain>` | per-domain `angle` + `citizens[]` + `hookLine` (a narrative opening) |
| **Who + real numbers** | `lib/neighborhoodSlice.createSlicer().slice(nbhd)` (engine.33) | per-hood residents (capped) + the live metrics |
| **Engine→brief emergence** | `scripts/engine-auditor/generateBaselineBriefs.js` | reads patterns, emits briefs with `threeLayerHandle {engine, simulation, userActions}` + `subjectIds` + `promotionHints` |
| **Priority + byline** | `Story_Seed_Deck` cols M–R (Engine A / Engine B) + sift T4.1 consumption | `PriorityScore`, `ConsequenceFloor`, `BylineCandidate` |

The gap is **not** emergence-from-scratch. It is: (1) the deck and the emergence surface
(`engine_audit`/`baseline_briefs`) are **separate** — the deck carries priority+byline+is consumed
by sift, but it's fed by storyline-recycling, not by the patterns; (2) the **WHY** (causal chain)
is thin — patterns give "stuck initiative" + who, but not *why it stuck / what's blocking*;
(3) nothing **bundles** the pattern + slice + handle + byline into one desk-ready packet, so the
agent still re-queries the sim.

## The three moves

### A — Stop the engine maintaining stories (mechanical; engine-sheet; clasp)
The `storyline-followup` stream is the engine doing Supermemory's job (re-emitting old threads). Per
the division of labor above, **continuity is not the engine's to hold.** So followups emit **only
when there is a fresh engine reason this cycle** — i.e. the thread's subject shows a live delta /
the subject is in the active sim. A dormant thread (Chicago; anything with no live anchor) emits
nothing; "we should keep covering X" comes from the Supermemory article+grade lookup at edition
time, not a recycled seed. Cap per-thread recurrence/age. This cuts ~70% of deck volume and drops
the non-credible Chicago seeds *as a consequence of the general rule*, not a Chicago special-case.
(Closes C97 G-S3 + the Chicago half.) File: `phase07-evening-media/applyStorySeeds.js`.

### B — Make `engine_audit` patterns first-class deck seeds (converge the two surfaces)
The patterns ARE the engine-emergent stories. Route them into the deck as **primary** seeds
(demote `storyline-followup` to gated continuity, per A). Each pattern-seed inherits what
(`description`/`angle`), who (`affectedEntities` POPIDs), the proof (`evidence.fields`), and the
existing `tribuneFraming.storyHandles`. **Decision to settle in Phase 0:** does the deck *consume*
`baseline_briefs`/`engine_audit` (one emergence engine, deck is a projection) or do they *merge*?
Two engine→story surfaces running in parallel is the redundancy to kill.

### C — Add the WHY, then bundle a desk-ready packet (the token-burn win)
- **WHY:** a causal-anchor layer — link the detected delta to its driver (the event / initiative
  phase change / migration / sentiment shift that produced it). "Fruitvale retail vitality fell
  **because** density rose after the C95 migration pulse," not just "retail fell." Investigate first:
  `tribuneFraming` may already carry a partial causal anchor (flagged "may already exist", claude-mem).
- **PACKET:** each emergent seed carries, **pre-staged**: subject POPIDs + their `neighborhoodSlice`
  (residents + real numbers), the what/why/who sentence, the `threeLayerHandle`, and the byline.
  The desk agent writes **from the packet** — no re-query of the sim. This is what makes B pay for
  itself: the engine spends deterministic Apps-Script compute **once** (free), and the expensive
  agent-driven edition run stops re-deriving per desk.

## The crisis-arc is the model (folds ENGINE_REPAIR Row 28)

Mike's "the crisis arc" reference names the unit. A crisis arc IS the desk-ready seed: a detected
engine change (what) + its cause chain (why) + affected named citizens + hood slice (who) + framing.
Row 28 pulled the **fabricated-specificity** crisis buckets (dice-picked hood + pool-picked subtype
off a city-aggregate `illnessRate`, `CitizenCount=0`) and queued a rebuild as "a connected per-hood
story signal driven by real metrics." **That rebuild and this deck redesign are the same effort** —
the connected per-hood signal *is* the desk-ready seed. Build once; do not restore the old buckets.

## Phase 0 — findings + decision (settled S259)

**The three surfaces, and how `sift` already reads each:**
- **`engine_audit_c<N>.json` `patterns[]`** (16 in C97, **all 16** carry `tribuneFraming`) = the canonical
  emergence units. Detector suite already runs `resolveAffectedCitizens`, `recommendRemedy`,
  `generateTribuneFraming`. Each pattern carries what (`type`/`description`), who (`affectedEntities`),
  proof (`evidence`), framing (`tribuneFraming.storyHandles[civic|business|culture|sports|letters]` +
  `suggestedFrontPage` + `capabilityHooks`), toward-why (`remedyPath`, `mitigatorState`). sift reads these
  directly (Step 2 + WORLD/CIVIC lanes).
- **`baseline_briefs_c<N>.json`** = a **projection** of those patterns, and it **already carries the
  desk-ready packet**: `neighborhoodState` (crime/retail/sentiment w/ cycle-over-cycle deltas, median
  income + rent, displacement pressure, gentrification phase) + `neighborhoodResidents` (bounded,
  notable-first) from `lib/neighborhoodSlice`, + `threeLayerHandle` + `subjectIds`. sift triages at Step 5.
- **`Story_Seed_Deck`** = the **separate** storyline-recycling + calendar/texture + signal surface,
  carrying priority (Engine A, cols M-O) + byline (Engine B, cols P-R). sift reads cols M-R at T4.1 (Step 6).

**The redundancy:** sift reads all three. The deck re-derives story candidates (from storylines / calendar
/ signals) **in parallel** to the auditor's far richer patterns — and the deck's emergence is the weak,
noisy one (71% recycled).

**DECISION — CONSUME (layered pipeline), NOT merge.** One emergence engine, projected forward:

> `engine_audit` (emerge: what/why/who/framing) → `baseline_briefs` (enrich into the desk-ready packet:
> + neighborhoodState + residents — *already built*) → `Story_Seed_Deck` (rank [Engine A] + byline
> [Engine B] + add the legitimate calendar/texture seeds + gate the recycling) → sift/desk read ONE
> ranked surface, each deck row pointing at its packet.

- The deck **stops** being a parallel emergence surface — its emergent seeds become projections of
  `engine_audit` patterns (linked to the baseline_brief packet), not re-derived from storylines.
- The deck **keeps** its genuine value-adds: priority ranking, byline assignment, and the calendar/texture
  seeds (seasonal / holiday / firstfriday / cultural) that are NOT engine anomalies.
- The deck **drops** storyline-followup recycling (continuity = Supermemory).
- `baseline_briefs` is **NOT** deprecated — it IS the packet layer the deck references.

**Consequence — the packet largely already exists, so Phase 4 shrinks.** The desk-ready packet is mostly
built in `baseline_briefs` (neighborhoodState + residents + threeLayerHandle). Remaining build: (a) link
each emergent deck row to its baseline_brief packet (a `SeedID`↔`briefId` join); (b) ensure every pattern
that becomes a deck seed has a brief (today not all patterns → briefs); (c) the WHY enrichment (causal
anchor beyond `remedyPath`/`mitigatorState`).

**Seed-packet schema (Phase 0 output):** a deck row =
`{ SeedID, Cycle, SeedType, Domain, Neighborhood, Priority, Byline, PacketRef }`
where `PacketRef` resolves to the baseline_brief packet =
`{ what: description/angle/hookLine, who: subjectIds + neighborhoodResidents, numbers: neighborhoodState,
why: causalAnchor, handle: threeLayerHandle }`. Calendar/texture seeds (no underlying pattern) carry an
inline mini-packet instead of a `PacketRef`.

## Phasing

- **Phase 0 — investigate + decide convergence. ✅ DONE S259** (see §Phase 0 above). Decision: CONSUME
  (layered pipeline `engine_audit → baseline_briefs → deck → sift`), not merge. Packet already largely
  exists in `baseline_briefs`. Seed-packet schema defined.
- **Phase 1 — gate the noise. ✅ BUILT S259 (local; deploy rides the C98 pre-cycle clasp push — SAME push as `saveV3Seeds.js`, so the gate is LIVE for the C98 run; the "deploy post-C98" wording corrected S261).** `applyStorySeeds.js`
  `generateStorylineSeeds_` — followup fires only if NOT a non-Oakland-locale (dormant-subject) thread
  AND `cyclesSinceAdded <= FOLLOWUP_AGE_CAP` (12). Simulated against the live 97 dormant storylines:
  **97 → 43 followups (56% cut)** — 6 dropped non-Oakland (Chicago), 48 aged out, 43 live-Oakland kept.
  Findings that shaped it: all 97 live storylines are `dormant`; `lastCoverageCycle` is unwritten (dead
  signal) so the gate uses `cyclesSinceAdded`; `canonNeighborhoods.js` is inert in Apps Script so the
  gate is inline (`sl.*` + a non-Oakland-locale regex + the age knob). **Smoke-test at first cycle
  post-deploy:** deck `storyline-followup` count drops ~half, zero Chicago seeds. (C97 G-S3 + Chicago half.)
- **Phase 2 — route patterns → seeds. ✅ BUILT S259 · LIVE-RUN DONE C98 (S264).** `routePatternSeeds.js --apply --cycle 98` wrote 18 pattern-emergent seeds + verified 18/18 live. **Open (G-RC5):** the citywide-sentiment-seed collapse only folds the *improvement* (positive) pole — C98's citywide signal was *decay* (math-imbalance), so 14 per-hood decay seeds did NOT collapse, and each carried a *positive* WHY anchor on a declining hood (mis-attribution). Fix = extend `collapseImprovements` + the WHY driver to the decay/negative pole, sign-aware. Untested-shape: collapse was validated against C97 (improvement cycle); C98 is first decay-dominant run.
  New Node post-cycle step `scripts/engine-auditor/routePatternSeeds.js` (+ `bayTribuneRoster.js` adapter):
  reads `engine_audit_c{N}.patterns[]` + `baseline_briefs_c{N}`, emits a primary `pattern-emergent` deck
  seed per **world-anchored** pattern (≥1 citizen/neighborhood/initiative — meta/engine-health patterns
  with no subject excluded + logged), computing: domain from `evidence.fields` (sentiment→COMMUNITY,
  initiative-name→SAFETY/INFRASTRUCTURE/ECONOMIC…), **real severity-weighted** priority (M-O) via
  `computePriorityScore_(seed, REAL pattern, …)` — the in-cycle path passes `null` so its seeds get a flat
  MED; pattern-seeds get the true weight — byline (P-R) via `scoreAllBylines_` over the canonical
  **`Bay_Tribune_Oakland`** pool (beat-matched + POPID-attributed + cadence-balanced), and `PacketRef` (S)
  by subject-overlap join (initiative/POPID, ≥5; neighborhood-only dropped). New deck cols
  **PacketRef (S) + CoveringJournalistPOPID (T)** added to `saveV3Seeds.js` schema (live widen + clasp ride
  C98). C97 dry-run: 16 patterns → 13 seeds (3 excluded), beats correct (OARI→Torres/Safety,
  Apprenticeship→Velez/Economic, Transit→Shimizu/Infra), 6/13 packet-linked.
  **Mike S259 steer:** byline pool = the clean POPID-linked `Bay_Tribune_Oakland` ledger, not the embedded
  `rosterLookup` hardcode (rosterLookup now enriches themes by name-match; got a Node `module.exports`).
  **Citywide-sentiment-seed collapse — ✅ DONE S260** (local; rides C98). `routePatternSeeds.js` now clusters
  same-metric (`*Delta` field) + same-magnitude (±0.03 greedy band, anchor=largest) improvement intents BEFORE
  byline assignment; any cluster ≥3 collapses into one `Citywide` synthesis seed (capped 6-POPID resident union
  preserves the "who", single COMMUNITY byline, no PacketRef). Outliers pass through individually keeping their
  packet. C97 dry-run: 13→**5 seeds** (COMMUNITY 10→2 = citywide-of-9 + Fruitvale +0.25 outlier); initiatives
  untouched; byline cadence 7/3→1-each; deterministic across runs. Grouping by metric field (not `type`) proven
  to leave the 2 initiative improvements + stuck-initiative untouched.
  **C98 rollout:** service-account widen deck S→T → clasp push **`saveV3Seeds.js` + `applyStorySeeds.js`** (both
  Apps Script; the Phase 1 gate MUST be live pre-cycle for its followup-count smoke to be observable at C98 —
  S261 correction) → cycle runs → /engine-review → `routePatternSeeds.js --apply --cycle 98`. **✅ ALL DONE C98 (S264):** pre-cycle clasp stack live S261; C98 ran clean (0 errors); smoke green (seeds 147→60, zero Chicago, Neighborhood_Map 17→21, dial fold, T8 round-trip, no office-holder retirement); `--apply --cycle 98` wrote+verified 18 seeds. Residual = G-RC5 (decay-pole collapse, above).
- **Phase 3 — WHY layer. ✅ BUILT S260 (local; rides C98).** A FAITHFUL causal anchor per seed (`routePatternSeeds.js`),
  driver-grain matched to seed kind — **not** fabricated, each is real engine mechanics:
  - **citywide synthesis seed → global additive driver.** The uniform cross-hood +0.11 is a global signal, not
    per-hood pulse (8 hoods moving by the *same* delta from different baselines = one driver; per-hood citizen
    pulse only explains the deviations). Source: `applySportsSeason.js` does `S.sentiment += totalSentiment`
    (a winning A's stretch lifts the whole city) + citywide calendar (First Friday / holiday). C97: *"the A's
    winning stretch (W4) + First Friday + DiaDeMuertos."*
  - **per-hood outlier / event seed → the co-located cycle event** (baseline_brief world-event in that hood).
    Fruitvale +0.25 ← its Transit-Hub milestone (`event-infrastructure-1`) — the advisor's predicted echo, confirmed.
  - **initiative seed → the phase transition** (`fromPhase→toPhase`) or the stuck blocker (`stalled N cycles in <phase>`).
  Cycle-pinned: reads `world_summary_c{N}.md` (built from Riley_Digest + Oakland_Sports_Feed + Simulation_Calendar)
  so the WHY doesn't drift with live sheets; **soft** (absent summary degrades, never throws). The driver folds into
  the existing `SuggestedAngle` (col J) — **no deck schema change, no clasp.** Key investigation finding: the real
  per-hood pulse *composition* (citizen events) is NOT persisted post-cycle — but it only explains deviations, so
  it's an *optional later* refinement (Phase 3b), not a prerequisite. The W-L record can't be parsed robustly from
  the markdown (current+2-prior rows) so the driver uses the streak qualifier (reliable), not the exact record.
  Determinism + structured `causalAnchor {kind,driver,confidence}` per seed verified. Advisor-reviewed (caught the
  global-vs-pulse mis-trace pre-build). A structured causal-anchor *column* deferrable to Phase 3b if sift needs it.
- **Phase 4 — desk-ready packet (SHRUNK — packet mostly exists).** The `baseline_brief` already carries
  `neighborhoodState` + `neighborhoodResidents` + `threeLayerHandle`. Work = wire the `PacketRef` join +
  ensure completeness, not build the packet from scratch.
- **Phase 5 — rewire consumption. ◻ SPEC DONE S261 (research-build); BUILD GATED ON C98 SMOKE.** Convergence
  target: sift reads ONE ranked surface — iterate `Story_Seed_Deck` rows (priority-ordered) → resolve
  `PacketRef` → the baseline_brief packet (numbers + residents + WHY) — instead of independently reading all
  three surfaces in parallel and matching the deck to proposals by `sourceSignal` text. This **inverts** sift's
  flow (deck-row-first, not derive-then-overlay) and is **high-blast-radius**, so it stages:

  - **The exact triple-read in sift today** (`.claude/skills/sift/SKILL.md`): (i) inputs 5–6 + WORLD /
    CIVIC-WITH-WEIGHT lanes (Step 2, SKILL lines 62–63 / 195 / 198) read `engine_audit_c<N>.json` `patterns[]`
    directly for emergence + gating; (ii) Step 5 (lines 261, 352) triages `baseline_briefs_c<N>.json` and pulls
    `neighborhoodState` + `neighborhoodResidents` for packet enrichment; (iii) Step 6 / T4.1 (line 372) reads
    `Story_Seed_Deck` cols M–R and matches seeds to proposals by `sourceSignal` text.

  - **Phase 5a — SHADOW MODE (first cycle after C98 smokes the producer).** The existing triple-read still
    **drives the edition**; the deck→`PacketRef`→brief path is computed **alongside and diffed**, NOT used to
    select/rank what the desks see. (Deck-primary-with-fallback was rejected: a fallback only catches total
    misses, not the *silent under-coverage* this surface's completeness gap would produce — building the first
    post-C98 edition off an unproven deck is the exact risk Phase 5 stages to avoid.) **Measure coverage
    parity in shadow:** does every pattern/brief the live triple-read surfaced appear as (or behind) a deck
    row? Completeness is unproven today — the plan's own Phase 4 note flags "not all patterns → briefs." Green
    parity (+ the Phase 4 join resolving every ranked row) is the gate to 5b. Zero live risk; nothing retired.
  - **Phase 5b — retire the redundant reads (only after 5a proves parity).** Collapse sift to the single
    deck-row-first surface: Step 6/T4.1 match inverts into the Step 2 entry (iterate deck rows), Step 5 brief
    triage becomes `PacketRef` resolution, the direct `engine_audit` WORLD-lane re-derivation drops. **This is
    the irreversible-feeling edit — do NOT ship it until 5a parity is green.** Revert = restore the three reads
    (git revert the 5b commit).
  - **Ownership (spans 3 terminals — Phase 5 is not solo-buildable here):** research-build = this spec +
    coordinate; **media** = the `sift` SKILL edits + any desk RULES that independently re-query surfaces
    (`.claude/agents/*-desk/*` — point them at the packet, don't let them re-derive); **engine-sheet** = the
    deck producer + C98 deploy + the `PacketRef`↔`briefId` join completeness (Phase 4 (b)).
  - **Measure the per-edition token delta** (the whole point — collapse per-desk re-query) at 5a and 5b; record
    in the plan changelog. **Hard dependency:** Phase 4 `PacketRef` join must be complete-enough that every
    ranked deck row resolves to a packet before 5b, else retiring the brief read loses the numbers.

## Token-burn rationale (why C is the point, not a nicety)

The edition run is the expensive surface: many agents, large context, each re-deriving "what's the
story here, who's in it, what are the numbers." Moving that into deterministic engine compute (runs
once per cycle in Apps Script, ~free) and handing agents a ready packet **collapses per-desk
re-query**. The deck stops being a hint list and becomes the **cached hand-off** — the single place
the engine says "here are the real stories this cycle, with everything a desk needs to write them."

## Cross-references

- **[[../research/2026-07-04-ripple-attribution-trace]]** — S291 five-domain trace extending this plan's thesis to ripple attribution. Two findings bear directly on this plan: the sports→sentiment chain is a dead write (`applySportsSeason.js:290` — nothing reads `S.sentiment`), so the Phase 3 WHY layer's citywide sports anchor mis-attributes (same class as G-RC5); fix is re-pointing the WHY layer at persisted attribution once the ripple ledger exists.
- **ENGINE_REPAIR Row 28** — crisis-arc rebuild; same effort, fold here.
- **engine.33 / [[../archive/plans/2026-06-10-engine33-neighborhood-citizen-loop]]** — `lib/neighborhoodSlice` is the who+numbers source.
- **`generateBaselineBriefs.js`** — the existing emergence surface to converge with (not duplicate).
- **C97 plan [[2026-06-13-c97-gap-log-triage]] ES-4 step 1** — this supersedes its mechanical "cap recycled" framing with the full emergence design; ES-4 step 1's gate becomes Phase 1 here.
- **engine.34** — ledger-as-representative-sample; D3 (ingest reject-not-auto-mint) is adjacent but a different surface (ingest, not seed generation).

## 2026-07-05 — Corrected row contract (Mike-direct, S296) — SUPERSEDES the JSON chain

Mike's contract, stated 2026-07-05 after rejecting the engine.45 desk-slice framing:

> The desk packet doesn't tell agents what to write anymore. It says: here's what happened and
> to whom — search canon to support and write an article. Save token burn: don't let the agent
> search for citizens raw or leave ambiguity that creates a new citizen. Provide the exact
> citizens, neighborhoods, businesses affected by the story seed (aka engine event). There are
> 20+ engines, 15–20 neighborhoods, businesses, famous people, evening events, popular TV shows.
> The current seeds are trash compared to what happens in these 11 phases.

### Standing rules (all Mike-direct, 2026-07-05)

1. **Sheets are the world. No JSON carries logic.** The Phase-0 CONSUME chain
   (`engine_audit → baseline_briefs → deck`) is superseded as the seed path — the deck is
   written by the engine **in-cycle from live state**, not enriched post-cycle from JSON
   artifacts. `routePatternSeeds.js` and the baseline_briefs join stop being the seed path.
2. **A seed = an engine event.** One row per salient engine event, written at the moment the
   engine computes/generates it (queued like every write, lands at the Phase-10 executor).
3. **Entities attach at generation time.** The engine names the exact citizens (POPID + name +
   their event lines), neighborhoods, businesses, cultural entities (evening events, TV shows),
   famous people it touched — at the moment it touches them. No post-hoc finder, no residence
   inference, no ambiguity that invites minting a new citizen.
4. **The row directs nothing.** VoiceGuidance / SuggestedAngle / SuggestedJournalist /
   byline-scoring JSON / priority-components JSON / MatchConfidence / PacketRef — deleted.
   Journalists are agents with dials; the row hands them the event and the people, they search
   canon and write.
5. **Column test:** a desk agent can write the article from the row + canon lookups alone.
   Any column that doesn't serve that test doesn't exist.

### Row contract v2 (replaces the 20-column deck)

| Column | Content |
|---|---|
| Cycle | engine cycle |
| SeedID | stable id |
| Domain | SAFETY / ECONOMIC / COMMUNITY / … |
| Neighborhood(s) | where |
| What | the event, with the engine's real numbers |
| Why | the cause the engine applied when it computed the effect |
| Citizens | exact POPIDs + names the engine touched |
| CitizenEvents | those citizens' actual event lines from this cycle |
| Businesses | exact business entities affected |
| OtherEntities | cultural events / shows / famous people / venues involved |
| Magnitude | size, signed |
| Trend | direction + streak (from cross-cycle carry) |

### Build phases (v2 — replaces Phases 4/5 sequencing below)

- **V2-1 Entity-emission inventory.** Walk the 20+ engines across the 11 phases; table which
  engine emits which entity types (citizen / business / cultural / famous / venue /
  neighborhood). The truth catalog the writers draw from.
- **V2-2 Contract freeze.** Fix the column set against the inventory; Story_Seed_Deck schema
  migration; Story_Hook_Deck fold-or-retire decision.
- **V2-3 In-cycle seed writers.** Every salient engine event emits a contract row with its
  entities attached at generation.
- **V2-4 Sandbox verify.** Seeded cycles on the real sandbox; acceptance = open the sheet,
  every row passes the column test. Verification is reading the sheet, never a status line.

**Carry-over from engine.45:** the ripple cross-cycle carry (T2) survives solely so Why/Trend
can say "second cycle running / fading." engine.45 Tasks 4–6 (JSON desk-slice layer + JSON
WHY re-point) are DEAD — superseded by this contract.

## Status log

### engine.35 — status (drained from ROLLOUT, 2026-06-26 / S274)

**Story_Seed_Deck → engine-emergent, attributed, desk-ready story surface** (S259 Mike-direct). Live C97 deck = 147 seeds / 104 (71%) `storyline-followup` / 100 (68%) `GENERAL` — it recycles old threads, doesn't emerge stories from the engine. Thesis: agents can't turn raw numbers into a storyline, so the engine connects **what/why/who** and hands the desk a ready packet → cuts edition token burn (the expensive re-derivation surface). **Division of labor:** engine EMERGES (fresh signal); Supermemory MAINTAINS (articles+grades=continuity) — so `storyline-followup` recycling is the engine wrongly holding continuity, gate it. Builds on existing infra (`engine_audit` patterns + `tribuneFraming.storyHandles` + `lib/neighborhoodSlice` + `baseline_briefs`) — routing+enrichment, not from-scratch. 6 phases (gate-noise-first). **Folds ENGINE_REPAIR Row 28** (crisis-arc rebuild = same effort); **supersedes C97 ES-4 step 1** mechanical framing. **Phase 0 DONE S259** — decision: CONSUME (layered `engine_audit → baseline_briefs → deck → sift`), not merge; the desk-ready packet already largely exists in `baseline_briefs` (neighborhoodState+residents), so the deck references it rather than re-deriving. **Phase 1 BUILT S259** (local, deploy post-C98) — `applyStorySeeds.js` followup gate (non-Oakland-locale + age cap 12); simulated 97→43 followups (56% cut, 6 Chicago + 48 aged out). **Phase 2 BUILT S259** (local, live run + deploy ride C98) — the emergence build: `scripts/engine-auditor/routePatternSeeds.js` + `bayTribuneRoster.js` route `engine_audit` patterns → primary `pattern-emergent` deck seeds; beat-matched + POPID-attributed bylines off the canonical **Bay_Tribune_Oakland** ledger (Mike S259 steer), real severity-weighted priority (M-O), PacketRef subject-overlap join (S/T new deck cols). C97 dry-run: 16 patterns→13 seeds (3 meta excluded), beats correct (OARI→Torres, Apprenticeship→Velez, Transit→Shimizu). Phase 4 (PacketRef join) folded forward. **Citywide-sentiment-seed collapse + Phase 3 WHY layer DONE S260** (`routePatternSeeds.js`: metric+magnitude clustering → citywide synthesis seed [C97 13→5 seeds, COMMUNITY 10→2]; + faithful causal anchor per seed [citywide→global sports/calendar driver, outlier→co-located event, initiative→phase transition], folded into SuggestedAngle, no schema change; rides C98). **Phase 5 SPEC DONE S261 (research-build); BUILD GATED on C98 producer-smoke.** Located the exact sift triple-read (inputs 5–6 + WORLD/CIVIC lanes = `engine_audit` patterns; Step 5 = `baseline_briefs` packet; Step 6/T4.1 = deck cols M–R by `sourceSignal`). Convergence inverts sift to deck-row-first → `PacketRef` → brief = high-blast, so staged **5a** (additive parallel cross-check, measure coverage parity — completeness unproven) → **5b** (retire redundant reads, only after parity green; the irreversible edit). Spans 3 terminals: research-build specs/coordinates, **media** edits sift SKILL + desk RULES, engine-sheet owns producer + C98 deploy + Phase 4 PacketRef-join completeness. Do NOT retire the live triple-read pre-C98-smoke. **C98 LIVE-RUN DONE S264:** pre-cycle clasp stack live S261; C98 ran clean; smoke green (seeds 147→60 + zero Chicago, Neighborhood_Map 17→21, dial fold, T8, no office-holder retirement); `routePatternSeeds.js --apply --cycle 98` wrote+verified 18 seeds → **producer-smoke (Phase-5 gate) now SATISFIED.** **Open residual G-RC5** (next-session): collapse + WHY layer only handle the improvement/positive pole; C98 was decay-dominant → 14 per-hood decay seeds didn't collapse + got positive WHY anchors on declining hoods (mis-attribution, advisory-only — `engine_review_c98.md` is authoritative). Next: sign-aware collapse/WHY, then Phase 5 build, after the edition run.

## Changelog

- 2026-07-05 — **Corrected row contract (Mike-direct, S296).** Added §"2026-07-05 — Corrected
  row contract" after Mike rejected the engine.45 desk-slice framing as not his design. Sheets
  are the world / no JSON carries logic; seed = engine event; entities attach at generation
  time; row directs nothing (voice/angle/byline columns die); column test governs the schema.
  Supersedes the Phase-0 CONSUME chain as the seed path and kills engine.45 T4–T6. Build
  restarts at V2-1 (entity-emission inventory).
- 2026-06-15 — Drafted (S259, engine-sheet) from Mike's S259 framing (deck = engine's pre-computed, attributed, desk-ready story surface to cut edition token burn). Grounded in the live C97 deck distribution + the existing `engine_audit`/`tribuneFraming`/`neighborhoodSlice`/`baseline_briefs` infrastructure. Folds Row 28; supersedes C97 ES-4 step 1's framing. No code yet — design pass per Mike "requires genuine creativity."
- 2026-06-15 — Added the division-of-labor split (Mike S259 follow-up): engine EMERGES (fresh what/why/who), Supermemory MAINTAINS (published articles + grades = continuity). Reframed move A — the `storyline-followup` recycling is the engine wrongly holding continuity that belongs to Supermemory; gating it removes a responsibility, not just noise. Continuity = a Supermemory lookup at edition time, not an engine-maintained seed stream.
- 2026-06-15 — **Phase 0 done (S259).** Mapped the three surfaces + how sift reads each. Key finding: `baseline_briefs` is already a projection of `engine_audit` patterns AND already carries the desk-ready packet (`neighborhoodState` + `neighborhoodResidents` from `lib/neighborhoodSlice`). Decision: **CONSUME (layered `engine_audit → baseline_briefs → deck → sift`), not merge** — the deck stops re-deriving emergence, keeps priority/byline/calendar, drops recycling, references the brief packet. Packet largely exists → Phase 4 shrinks to a join. Seed-packet schema defined. ROLLOUT engine.35 → phase-0-done.
- 2026-06-15 — **Phase 2 built (S259, local; live run + deploy ride C98).** The emergence build:
  `scripts/engine-auditor/routePatternSeeds.js` + `bayTribuneRoster.js` (canonical Bay_Tribune_Oakland
  byline adapter, beat→domain + POPID + rosterLookup theme-enrich) + `utilities/rosterLookup.js` Node export
  + `phase10-persistence/saveV3Seeds.js` deck cols S/T. Mike S259 steer wired: seed coverage = the clean
  POPID-linked journalist ledger. C97 dry-run validated (13 seeds, beats correct, row 20-col aligned). Live
  `--apply` + service-account deck widen + clasp ride the C98 window (deploy-attribution discipline — no
  stacking on the un-smoke-tested engine.33/Phase-1 stack until C98 clears). Phase 4 (PacketRef join)
  folded forward — subject-overlap join already emits packets where briefs exist.
- 2026-06-15 — **Phase 1 built (S259, local; deploy post-C98).** `applyStorySeeds.js` followup gate (non-Oakland-locale + age cap 12). Live-data findings: all 97 live storylines `dormant`, `lastCoverageCycle` dead, `canonNeighborhoods` inert in Apps Script → inline gate on `sl.*`. Simulated 97→43 followups (56% cut; 6 Chicago, 48 aged out). Deploy held for the C98 clasp window (rides post-engine.33-smoke); smoke = followup count halves + zero Chicago next cycle.
- 2026-06-16 — **Phase 3 WHY layer built (S260, local; rides C98).** Faithful causal anchor per seed in `routePatternSeeds.js`, driver-grain by seed kind: citywide synthesis → global additive (sports streak + First Friday + holiday, the uniform cross-hood signal); per-hood outlier → co-located baseline_brief event (Fruitvale +0.25 ← Transit milestone); initiative → phase transition / stuck blocker. Cycle-pinned to `world_summary_c{N}.md` (soft, never throws), folds into `SuggestedAngle` (no schema change, no clasp). Advisor caught a global-vs-citizen-pulse mis-trace pre-build — the real driver of the uniform +0.11 is the global sports/calendar add, not per-hood pulse (which is unpersisted and only explains deviations → optional Phase 3b). Streak qualifier used over the W-L record (markdown lists current+2-prior, record unparseable robustly). Deterministic; structured `causalAnchor{kind,driver,confidence}` per seed. Pattern: feedback_measure-twice-cascading-effects.
- 2026-06-15 — **Phase 5 consumption-rewire SPEC done (S261, research-build); BUILD gated on C98 smoke.** Located the exact triple-read in `sift/SKILL.md` (inputs 5–6 + WORLD/CIVIC lanes read `engine_audit` patterns; Step 5 triages `baseline_briefs` + pulls neighborhoodState/residents; Step 6/T4.1 reads deck cols M–R matched by `sourceSignal`). Convergence inverts the flow to deck-row-first → `PacketRef` → brief packet = high-blast-radius, so staged **5a** (SHADOW mode — triple-read still drives the edition, deck path computed+diffed alongside, measure coverage parity; deck-primary-with-fallback rejected since a fallback misses silent under-coverage) → **5b** (retire redundant reads, only after 5a parity green; the irreversible-feeling edit). Ownership spans 3 terminals: research-build specs+coordinates, **media** edits the sift SKILL + desk RULES, **engine-sheet** owns the deck producer + C98 deploy + Phase 4 `PacketRef` join completeness. Hard dep: Phase 4 join complete-enough that every ranked row resolves a packet before 5b. Token-delta measured at 5a + 5b. Advisor-flagged: do NOT retire the live triple-read until C98 smokes the producer. Not solo-buildable here.
- 2026-06-16 — **Citywide-sentiment-seed collapse built (S260, local; rides C98 with the Phase 2 routePatternSeeds live run).** The Phase 2 open refinement. `routePatternSeeds.js` restructured intents→collapse→byline so collapse runs before byline assignment (cadence no longer polluted by per-hood fragments): `collapseImprovements` clusters `improvement` intents by `*Delta` metric field + ±0.03 magnitude band (greedy, anchor=largest member, deterministic), `synthCitywide` folds any ≥3 cluster into one `Citywide` seed (capped 6-POPID resident union, single COMMUNITY byline, no PacketRef); outliers pass through keeping their packet. C97: 13→5 seeds, COMMUNITY 10→2, initiatives + excluded untouched, byline cadence 7/3→1-each, deterministic across runs. Measure-twice: grouping by metric field (not `type:improvement`) empirically proven to isolate exactly the 10 sentiment patterns. Advisor-reviewed pre-build. Pattern: feedback_measure-twice-cascading-effects.
- 2026-06-18 — **C98 LIVE RUN DONE (S264).** Pre-cycle clasp stack (saveV3Seeds S→T + applyStorySeeds Phase-1 gate) was live S261; C98 ran clean (0 engine errors, 0 audit issues); full stacked-deploy smoke green (seeds 147→60 + zero Chicago, Neighborhood_Map writer 17→21, dial fold, T8 PREV_EVENING round-trip, no office-holder retirement — see `output/production_log_run_cycle_c98_gaps.md` G-RC). `routePatternSeeds.js --apply --cycle 98` wrote + verified 18 pattern-emergent seeds (DOMAIN CIVIC 16 / ECONOMIC 2; byline cadence Carmen 8 / Luis 4 / Jax 4 / Jordan 2; PacketRef 4/18; 2 meta excluded-and-logged). **NEW OPEN — G-RC5 (next-session pickup):** the collapse + WHY layer only handle the positive/improvement pole. C98 was decay-dominant → 14 per-hood `math-imbalance` decay seeds did NOT collapse to one Citywide seed, and each got a positive WHY anchor ("A's winning stretch + VeteransDay") on a *declining* hood = mis-attribution. Advisory-only (sift filters; `engine_review_c98.md` is the authoritative diagnosis: mean-reversion off a still-positive base). Fix = make `collapseImprovements`/`synthCitywide` + the causal-anchor driver sign-aware so the decay pole collapses + cites the real driver (mean-reversion, not the global add). Phase 5 build still gated on producer-smoke (now satisfied) — sequence after the edition run.
---

## Relocated ROLLOUT_PLAN row detail — 2026-07-02 (S286 pointer-collapse)

Verbatim rows moved out of ROLLOUT_PLAN.md when it collapsed to pointer-only. This is the working detail for the open job(s); the rollout row is one line pointing here.

### engine.35

| engine.35 | **Story_Seed_Deck → engine-emergent, attributed, desk-ready story surface** (S259 Mike-direct). Live C97 deck = 147 seeds / 104 (71%) `storyline-followup` / 100 (68%) `GENERAL` — it recycles old threads, doesn't emerge stories from the engine. Thesis: agents can't turn raw numbers into a storyline, so the engine connects **what/why/who** and hands the desk a ready packet → cuts edition token burn (the expensive re-derivation surface). **Division of labor:** engine EMERGES (fresh signal); Supermemory MAINTAINS (articles+grades=continuity) — so `storyline-followup` recycling is the engine wrongly holding continuity, gate it. Builds on existing infra (`engine_audit` patterns + `tribuneFraming.storyHandles` + `lib/neighborhoodSlice` + `baseline_briefs`) — routing+enrichment, not from-scratch. 6 phases (gate-noise-first). **Folds ENGINE_REPAIR Row 28** (crisis-arc rebuild = same effort); **supersedes C97 ES-4 step 1** mechanical framing. **Phase 0 DONE S259** — decision: CONSUME (layered `engine_audit → baseline_briefs → deck → sift`), not merge; the desk-ready packet already largely exists in `baseline_briefs` (neighborhoodState+residents), so the deck references it rather than re-deriving. **Phase 1 BUILT S259** (local, deploy post-C98) — `applyStorySeeds.js` followup gate (non-Oakland-locale + age cap 12); simulated 97→43 followups (56% cut, 6 Chicago + 48 aged out). **Phase 2 BUILT S259** (local, live run + deploy ride C98) — the emergence build: `scripts/engine-auditor/routePatternSeeds.js` + `bayTribuneRoster.js` route `engine_audit` patterns → primary `pattern-emergent` deck seeds; beat-matched + POPID-attributed bylines off the canonical **Bay_Tribune_Oakland** ledger (Mike S259 steer), real severity-weighted priority (M-O), PacketRef subject-overlap join (S/T new deck cols). C97 dry-run: 16 patterns→13 seeds (3 meta excluded), beats correct (OARI→Torres, Apprenticeship→Velez, Transit→Shimizu). Phase 4 (PacketRef join) folded forward. **Citywide-sentiment-seed collapse + Phase 3 WHY layer DONE S260** (`routePatternSeeds.js`: metric+magnitude clustering → citywide synthesis seed [C97 13→5 seeds, COMMUNITY 10→2]; + faithful causal anchor per seed [citywide→global sports/calendar driver, outlier→co-located event, initiative→phase transition], folded into SuggestedAngle, no schema change; rides C98). **Phase 5 SPEC DONE S261 (research-build); BUILD GATED on C98 producer-smoke.** Located the exact sift triple-read (inputs 5–6 + WORLD/CIVIC lanes = `engine_audit` patterns; Step 5 = `baseline_briefs` packet; Step 6/T4.1 = deck cols M–R by `sourceSignal`). Convergence inverts sift to deck-row-first → `PacketRef` → brief = high-blast, so staged **5a** (additive parallel cross-check, measure coverage parity — completeness unproven) → **5b** (retire redundant reads, only after parity green; the irreversible edit). Spans 3 terminals: research-build specs/coordinates, **media** edits sift SKILL + desk RULES, engine-sheet owns producer + C98 deploy + Phase 4 PacketRef-join completeness. Do NOT retire the live triple-read pre-C98-smoke. **C98 LIVE-RUN DONE S264:** pre-cycle clasp stack live S261; C98 ran clean; smoke green (seeds 147→60 + zero Chicago, Neighborhood_Map 17→21, dial fold, T8, no office-holder retirement); `routePatternSeeds.js --apply --cycle 98` wrote+verified 18 seeds → **producer-smoke (Phase-5 gate) now SATISFIED.** **Open residual G-RC5** (next-session): collapse + WHY layer only handle the improvement/positive pole; C98 was decay-dominant → 14 per-hood decay seeds didn't collapse + got positive WHY anchors on declining hoods (mis-attribution, advisory-only — `engine_review_c98.md` is authoritative). Next: sign-aware collapse/WHY, then Phase 5 build, after the edition run. | in-progress | engine-sheet (Phase 5 build: media+engine-sheet, spec: research-build) | [[../plans/2026-06-15-story-seed-deck-engine-emergence]] |

