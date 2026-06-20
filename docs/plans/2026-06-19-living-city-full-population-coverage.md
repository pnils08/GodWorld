---
title: Living City — Full-Population Life Coverage + Opinion Individuation Plan
created: 2026-06-19
updated: 2026-06-19
type: plan
tags: [engine, citizens, events, dials, opinion, draft]
sources:
  - docs/engine/ROLLOUT_PLAN.md — engine.38 (this plan's row)
  - docs/plans/2026-05-31-life-event-generation.md — engine.32 (T8 fan-out, dial-band loop)
  - docs/plans/2026-06-04-mags-citizen-loop.md — research.14 (wake/opinion loop + the 9pm affect-fix)
  - phase05-citizens/generateCitizensEvents.js:148-157 — the LIMIT=25 / cycleActiveCitizens participation throttle (live)
  - phase05-citizens/generateNamedCitizensEvents.js — ORPHAN (zero callers, godWorldEngine2.js:1152)
  - phase04-events/buildCityEvents.js:607 — cityEvents count = rng()<0.3?2:1 (supply cap)
  - claude-mem 31652 (named citizens excluded from T8) / 31656 (C98 coverage measure)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (engine.38)"
  - "[[plans/2026-05-31-life-event-generation]] — engine.32, the event/dial substrate this extends"
  - "[[plans/2026-06-04-mags-citizen-loop]] — research.14, the opinion loop + valence precondition"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered same commit"
---

# Living City — Full-Population Life Coverage + Opinion Individuation Plan

**Goal:** Every one of the ~906 Simulation_Ledger citizens is eligible to *live their week* each cycle — dial-weighted life events + opinion accretion — so the city stops being 14%-alive, bounded so the ledger never drowns.

**Architecture:** Three layered deliverables on the existing engine.31/.32 substrate. **(A) Coverage** — replace the `cycleActiveCitizens + LIMIT=25` participation throttle with dial-weighted stochastic participation over the *whole* population + an anti-inert floor, and revive the orphaned named-citizen generator. **(B) T8 distribution** — widen all four fan-out gates so city-events actually reach citizens (folded into A as a specific event class). **(C) Opinion layer** — expand the research.14 wake pool's *eligibility* to all 906 (throughput stays cost-capped), so any citizen can voice an opinion onto real grounding. The hard dependency that makes this produce *unique* citizens rather than uniform ones: the research.14 affect-valence fix (dual-tag + composure-as-affect-only) must land before any composure-writing scale-up — volume converges citizens toward the content pole unless valence diverges them.

**Terminal:** research-build (design, this plan) → engine/sheet (substrate build + clasp deploy) + bot (research.14 wake-script changes for C).

**Pointers:**
- Prior work: engine.32 `[[plans/2026-05-31-life-event-generation]]` (T8 fan-out, dial-band loop); research.14 `[[plans/2026-06-04-mags-citizen-loop]]` (wake loop, §Phase-1 audit S264 affect-fix)
- Research basis: S264 live data — C98 coverage **14%/cycle, 30%/3-cycles** (`scripts` ad-hoc, claude-mem 31656); named generator orphaned (claude-mem 31652); T8 four-gate diagnosis (claude-mem 31649/31654); composure baseline 86%-neutral (research.14 §affect-tag gap)
- Sequencing facts (S264, grep-verified): compressor `compressLifeHistory_` IS wired (`godWorldEngine2.js:417/1721`, Phase9); ambient/texture/T8 events **read** DialState for selection weighting but do **not** write composure (`generateCitizensEvents.js:226/248`) — composure writes come from Tier-5 life engines + the held reflection write-back, so texture-coverage scaling is composure-neutral.

**Acceptance criteria:**
1. **Coverage:** ≥60% of the 906 ledger citizens receive ≥1 grounded life event per cycle (target band 60–80%; a quiet week is realistic and self-bounding). Measured by a coverage script over `LifeHistory_Log` by cycle.
2. **T8 reach:** city-events reach **named + generic** citizens; attendance is gated by the out-and-about dial (not only neighborhood-match); ≥1 `cityEventAttend` per shaped citizen per ~N cycles (vs ~0 today).
3. **Bounded:** `LifeHistory_Log` working-row count stays bounded across ≥3 cycles at the new volume — compressor verified to run and clear per-cycle (no unbounded growth).
4. **Opinion eligibility:** the wake pool's eligibility = all 906 (the ≥25-char LifeHistory floor stays — confabulation guard); actual wakes/day stays under the cost cap; every woken citizen has real LifeHistory grounding.
5. **Divergence not convergence:** as volume scales, population composure distribution *widens* against the 86%-neutral baseline — the valence-fix (Phase B) is in place before any composure-writing event class scales.

---

## Tasks

### Phase A — Full-population coverage (engine, free/deterministic)

#### Task A1: Dial-weighted participation model (replace the throttle)
- **Files:**
  - `phase05-citizens/generateCitizensEvents.js` — modify (lines 148–157: `LIMIT=25` + `cycleActiveCitizens` seed)
- **Steps:**
  1. Replace the "active set = upstream `cycleActiveCitizens` + LIMIT" gate with a per-citizen participation roll over the *whole* ledger: `pAct = base × activityScore(dials)`, where `activityScore` rises with drive + out-and-about + sociability and falls for low-energy dispositions. All RNG via `ctx.rng` (no `Math.random` — engine rule).
  2. Tune `base` so expected coverage lands in the 60–80% band (criterion 1). Extroverts have eventful weeks; homebodies quiet ones — the variance itself individuates (this is the selection design Mike left open).
  3. Keep `cycleActiveCitizens` (events from upstream engines) as a *guaranteed-in* set unioned on top of the roll.
- **Verify:** dry-run one cycle → coverage script reports 60–80% distinct citizens with an event; histogram of events/citizen correlates with dial activityScore.
- **Status:** [ ] not started

#### Task A2: Anti-inert floor (no citizen goes dark too long)
- **Files:**
  - `phase05-citizens/generateCitizensEvents.js` — modify
- **Steps:**
  1. Track per-citizen last-event cycle (from `LifeHistory_Log` tail or a ledger column). If a citizen has had **zero** events for > N cycles (N≈3, one "month"), force a quiet/low-magnitude event ("a slow week") this cycle regardless of the participation roll.
  2. The floor guarantees nobody is permanently inert without forcing 100% coverage (which would drown the ledger and erase the realistic-quiet-week texture).
- **Verify:** over a 5-cycle dry-run, 0 citizens with >N consecutive empty cycles.
- **Status:** [ ] not started

#### Task A3: Revive or fold the orphaned named-citizen generator
- **Files:**
  - `phase05-citizens/generateNamedCitizensEvents.js` — read (currently zero callers — `godWorldEngine2.js:1152` marks it orphan)
  - `phase01-config/godWorldEngine2.js` — modify (Phase 5 wiring)
- **Steps:**
  1. Decide revive-vs-fold (Open Question 1). Either wire `generateNamedCitizensEvents_` into Phase 5 so named/Tier-1 citizens get their richer event set, OR fold the named-specific event pools into `generateCitizensEvents_` and delete the orphan (measure-twice: caller-graph + read both before deleting, per engine.md).
  2. Named/Tier-1 citizens must always be in the participation pool (they are the ones the newsroom + wake-loop read).
- **Verify:** named citizens (e.g. the research.16 voices) appear in `LifeHistory_Log` for a dry-run cycle; no dead generator left uncalled.
- **Status:** [ ] not started

#### Task A4: T8 distribution — widen all four fan-out gates
- **Files:**
  - `phase05-citizens/generateCitizensEvents.js` — modify (`previousEveningPool_` ~739; consumer ~830–843; dial modifier ~1531)
  - `phase04-events/buildCityEvents.js` — modify (`count` at :607)
  - the named path from A3 — modify (port the prevEvening fan-out so named citizens get city-events)
- **Steps:**
  1. **Supply:** raise base `count` from `rng()<0.3?2:1` toward 3–5 city events/cycle (it's a week). Keep season/holiday bumps.
  2. **Eligibility:** extend the fan-out to **all** citizens (named + generic, via A1/A3).
  3. **Attendance gate:** replace strict `cv.neighborhood === neighborhood` with an out-and-about-dial radius — high-outabout citizens "travel" to attend events in other neighborhoods (recipient chosen by the *same* dial the event exercises; damped). Low-outabout still mostly "hear about it."
  4. **Reserve the draw:** ensure an eligible attendee reliably draws the `cityEventAttend` entry instead of losing the single weighted pool pick (boost weight or reserve a slot).
  5. Confirm the dial wiring is unchanged-correct: `source:prevEvening` → ×outabout, `evening:cityEventAttend` → ×sociability (selection-weight modifiers, composure-neutral — safe to scale pre-valence-fix).
- **Verify:** dry-run → `cityEventAttend` events appear for named + multiple neighborhoods; count scales with supply; shaped citizens show city-events in their LifeHistory tail.
- **Status:** [ ] not started

#### Task A5: Don't-drown — coverage band + compressor capacity
- **Files:**
  - `phase09-*/compressLifeHistory.js` — read/verify
  - new `scripts/coverageReport.js` — create (measurement + guardrail)
- **Steps:**
  1. Estimate volume: target 60–80% × 906 ≈ 545–725 citizens × ~1.3 events ≈ **~700–950 rows/cycle** (vs ~149 today, ~5–6×). State this in the row.
  2. Verify `compressLifeHistory_` runs Phase 9 and clears/compresses per-citizen tails into `LifeHistory_Archive` at the new volume — `LifeHistory_Log` is transient working data, must not grow unbounded.
  3. Land `scripts/coverageReport.js` (distinct-citizens-by-cycle + events/citizen histogram) as the standing measurement for criterion 1 + 5.
- **Verify:** 3-cycle dry-run → `LifeHistory_Log` total rows stay bounded (compressor keeps pace); coverage report runs.
- **Status:** [ ] not started

### Phase B — Valence precondition (the divergence engine) — DEPENDS-ON research.14

#### Task B1: Land the affect-valence fix before composure-writing scale
- **Files:**
  - cross-ref `[[plans/2026-06-04-mags-citizen-loop]]` §Phase-1 audit (S264) — dual-tag + composure-as-affect-only + off-vocab fallback
- **Steps:**
  1. This is **not** a separate workstream — it is the precondition that makes volume produce uniqueness. Uniform ambient volume converges citizens toward the content pole (the 86%-neutral drift); disposition-colored valence diverges them (same-street-diverges, research.14 §264).
  2. Gate: no event class that **writes composure** scales (Phase A is composure-neutral texture, so it may proceed in parallel), and the reflection write-back gate does not open, until the affect-fix is deployed + re-audited.
- **Verify:** research.14 re-audit on fresh wakes passes (negative pole fills); then composure-writing classes may scale.
- **Status:** [ ] not started

#### Task B2: Selection-effect coherence
- **Files:**
  - `phase05-citizens/generateCitizensEvents.js` — modify (selection)
- **Steps:**
  1. Generalize A4's principle across event classes: pick recipients by the dial the event *exercises*, damped (high-drive → work events → drive reinforced; high-outabout → city-events; high-sociability → social events). Disposition shapes which life a citizen lives → reinforces the disposition → individuation engine, not just coverage.
  2. Damping respects the no-runaway / no-death floor (compose with the two-decay systems: chaos-cars asymmetric decay + dial base/mood/streak).
- **Verify:** over a multi-cycle dry-run, citizens' event-class mix correlates with their dominant dials; no dial runs away past the floor.
- **Status:** [ ] not started

### Phase C — Opinion layer to full population (paid, throughput-capped) — DEPENDS-ON Phase A

#### Task C1: Expand wake eligibility to all 906
- **Files:**
  - `scripts/citizen-wake.js` — modify (pool gate at `buildPool`, `SHAPED_MIN=60`)
- **Steps:**
  1. Drop/lower the `SHAPED_MIN=60` deviation gate so the eligibility **pool** is the whole ledger. **Keep `LIFE_MIN_CHARS=25`** — the confabulation guard. (Phase A makes the floor satisfiable for everyone: real events for all → real grounding for all → no shady-Greg fabrication.)
  2. Selection stays event-magnitude + dial-weighted (wake whoever's living the biggest real delta), now drawn from the full population.
- **Verify:** wake pool size ≈ count of citizens with ≥25-char LifeHistory (grows toward 906 as Phase A lands); woken citizens span beyond the prior shaped 437.
- **Status:** [ ] not started

#### Task C2: Throughput cap + cost line
- **Files:**
  - `scripts/citizen-wake.js` — read (cron 3×/day); this plan's row — document
- **Steps:**
  1. State explicitly: eligibility = all 906; **throughput = cost-capped** (wakes/day stays bounded by DeepSeek budget, dial-weighted to the most-live N). "All eligible" ≠ "wake 906×3/day" — that would blow the token-burn budget.
  2. Document the per-day wake cap + rough $/cycle (DeepSeek voice + classify) in the row, per the token-burn hierarchy.
- **Verify:** wakes/day unchanged from current cap; cost line recorded.
- **Status:** [ ] not started

#### Task C3: Opinion individuation onto real grounding
- **Files:**
  - `scripts/citizen-wake.js` + `lib/citizenPage.js` — modify
- **Steps:**
  1. Citizen-pages accrue stance/opinion over wakes (their own remembered experience), feeding the research.14 forward-thread (editions interview the remembering citizen). Opinions ground on real LifeHistory (Phase A) — not free-floating.
- **Verify:** a citizen's page over multiple wakes shows a consistent, grounded point of view tied to their real events + dials.
- **Status:** [ ] not started

---

## Open questions

- [ ] **Coverage band exact %** (Task A1) — 60–80% proposed; engine-sheet tunes `base` against measured volume + compressor headroom.
- [ ] **Named generator: revive vs fold** (Task A3) — caller-graph + read-both before deciding; affects whether the orphan is wired or deleted.
- [ ] **Wakes/day cap + $/cycle** (Task C2) — the throughput number; set against the current DeepSeek spend.
- [ ] **Anti-inert N** (Task A2) — cycles-dark threshold before a forced quiet event (≈3 proposed).

---

## Changelog

- 2026-06-19 — Initial draft (S264, research-build). Diagnosed from S264 live data: 14%/cycle coverage, named generator orphaned, T8 four-gate throttle. Advisor-reviewed (4 load-bearing points folded: valence-is-the-crux dependency on research.14 affect-fix; free-engine vs paid-opinion split; coverage-prerequisite-for-opinion confabulation guard; don't-drown number + compressor verify). Sequencing grep-verified: texture-coverage is composure-neutral (runway to parallelize Phase A while Phase B lands). Mike-directed: every ledger citizen eligible for the 24/7 lifecycle + own opinions. Engine.38 row filed; research.14 + engine.32 cross-linked.
