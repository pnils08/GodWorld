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

#### Task B3: Ordinary-bad event content — the negative-pole supply (objective, deterministic; gate INDEPENDENT of B1)

**The gap (S269, data-verified):** the good side of life is richly covered; the bad side is **bimodal — catastrophe or nothing.** The only ordinary-bad objective event in all 13 generators is `layoff` @ 0.004 (effectively never). Every ambient/ordinary tag pushes composure **up or neutral** → measured 0 volatile / 86% neutral / positive-skew. A real life has ordinary downs that fade; they don't exist. This is the OBJECTIVE half of "valence diverges them" (B1 is the subjective/classifier half). **Option-B routing (Mike S269): rebalance the existing pools + activate built-bad machinery, NOT a new generator.**

- **Files:**
  - `utilities/citizenDialMap.js` — **add mild objective-negative vocab** (additive, engine.39 pattern, no existing entry touched)
  - `phase04-events/generateGenericCitizenMicroEvent.js`, `phase05-citizens/generateCitizensEvents.js` (ambient), `runCareerEngine.js`, `runRelationshipEngine.js`, `runHouseholdEngine.js`, `runNeighborhoodEngine.js` — add ordinary-bad pools + per-pool valence ratio
  - `phase05-citizens/runConductEngine.js` (T7, inert) + `phase04-events/chaosCarsEngine.js` (engine.11, smoke-pending) — the built negative-source machinery to **activate**, not rebuild
- **Steps:**
  1. **Vocab first — the ordinary-negative tags don't exist.** `DIAL_MAP` ordinary negatives are only `Health{-2}` / `Rivalry{-3}`, then a cliff to catastrophe (`Setback{-5}`+); the affect tags (`Frustrated`/`Anxious`) are **reserved wake-time-only** (boundary — objective events must NOT emit them). Add ~−1/−2 objective tags for the everyday-friction band: e.g. `WorkSetback{drive:-2,composure:-1}` (passed over / tense review / project failed), `MoneyTight{composure:-2}`, `Argument{sociability:-2,warmth:-1}`, `Friction{composure:-2}` (got hassled / a sour errand), `Unsettled{composure:-2}` (felt unsafe / block trouble), `RunDown{composure:-2}` (a rough physical stretch short of `Health`). Additive only; same care as the S264 dual-tag work (DIAL_MAP byte-unchanged elsewhere).
  2. **Ordinary-bad pools** in the engines above — everyday friction at ordinary scale, tagged to the new vocab. NOT catastrophe (they fade, low magnitude); the counterweight to the all-positive ambient.
  3. **Per-pool valence ratio** — give every event-emitting pool an explicit good:neutral:bad mix (today good/neutral-only). The ratio is the divergence knob; start conservative, tune against the distribution.
  4. **Dial-valence weighting** (composes with B2 selection-by-dial) — a low-composure citizen draws proportionally MORE friction and reads neutral events sourly; the steady one shrugs them off. Same street, two lives. Bounded by the no-runaway floor.
  5. **Activate the built machinery** — `runConductEngine` (the Conduct negative pole) deploys with DialState; chaos-cars (objective adversity) clears its C100 smoke. B3 sequences the ordinary-friction band between ambient-positive and these catastrophe/conduct sources.
- **Gate — INDEPENDENT of B1 (the leverage):** objective bad events are deterministic + engine-tagged — **no classifier in the loop.** So B3's divergence is verifiable on its own terms and can ship AHEAD of the classifier re-audit that gates the write-back. **Verify:** a multi-cycle dry-run measuring the population composure distribution **widens** vs the 86%-neutral baseline (negative pole fills), no LLM in loop, no dial past the floor.
- **Status:** [ ] not started

#### Task B4: Cross-system composure composition cap (B3 objective fold × research.14 reflection write-back)

**The interaction that passes both isolated specs and still runs away.** Once both are live, the same bad day hits composure **twice** — the objective event folds (B3) AND the citizen's reflection about it accretes (research.14 write-back). The composure-as-affect-only fix only deconflicts event-vs-affect *within one reflection*; it does nothing for objective-fold + separate-reflection on the same underlying event. (The plan flagged this for chaos-cars specifically; B4 generalizes it to every ordinary-bad event.)

- **Steps:**
  1. **Decide the rule explicitly:** grounded compounding is **intended-but-bounded** — a citizen *should* get crankier because a real thing happened AND they dwelled on it, but capped. Implement a per-citizen per-cycle **net composure-delta cap** across BOTH feeders (objective fold + reflection accretion) + the two decay systems (chaos asymmetric decay + dial base/streak).
  2. Owner of the composition check: engine-sheet, when both halves are live. Do NOT leave the interaction implicit — it is the runaway surface.
- **Verify:** a citizen hit by a real bad event AND reflecting negatively on it ends the cycle more negative than either alone, but within the cap; no citizen crosses the no-death / no-runaway floor over a multi-cycle dry-run.
- **Status:** [ ] not started (depends-on B3 + research.14 write-back both landing)

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

## Status log

### engine.38 — status (drained from ROLLOUT, 2026-06-26 / S274)

**Living City — full-population life coverage + opinion individuation** (Mike-direct S264: "all citizens on the ledger eligible for the 24/7 lifecycle + own opinions; fire more events — each cycle is a week — don't drown the ledger"). Root finding (S264 live data): C98 covered **14%/cycle, 30%/3-cycles** — ~70% of the 906 citizens had no life event in 3 weeks; the **named-citizen generator is orphaned** (zero callers); T8 city-event fan-out throttled by 4 gates (named excluded / supply ~1-per-cycle / neighborhood-locked attendance / single-draw dilution). Design = **dial-weighted stochastic participation** over the whole population + anti-inert floor; revive/fold the named generator; widen all 4 T8 gates (supply 1→3-5, outabout-dial attendance radius, reserve the draw); expand the research.14 wake **eligibility** to all 906 (keep the 25-char confab floor; throughput stays cost-capped). **Crux dependency (advisor):** volume CONVERGES citizens toward the content pole unless valence DIVERGES them → the research.14 §Phase-1 affect-fix (dual-tag + composure-as-affect-only) is the precondition before any composure-writing scale. Sequencing grep-verified: texture-coverage is composure-neutral (Phase A parallelizes while Phase B lands); compressor `compressLifeHistory_` IS wired (Phase9 — verify capacity at ~5-6× volume). 3 phases (A coverage / B valence / C opinion). Advisor-reviewed. **PHASE A BUILT + CLASP-DEPLOYED LIVE S264b + SMOKE CLEAN 5/5 at C99 S265** (commits `42b7f9bd`/`e86f200a`/`e0f181a0`): dial-weighted participation replacing LIMIT=25; coverage 65.9% single-gen / 83.6% all-gen (758/907); archiver dormant 5199<12k; B3 regime-shift guard suppressed spurious spike (self-clears C100); patternFlag NOT volume-pinned; named citizens covered. **C100 WATCH (G-EC33):** sentiment-uniformity — 20/21 hoods compressed into tight 0.6-0.86 band C99. **FIX SHIPPED S273 (engine-sheet):** sentiment lockstep broken — per-hood base, citywide demoted to a nudge (`82b7f2eb`); **clasp-deployed live** (`97121965`). **Watch → C101** to confirm divergence holds, not re-compression. **Phase B (valence/divergence) GATED on research.14 affect re-audit** — do NOT scale composure-writing classes before it. **Phase C (wake eligibility → all 906) pending — engine-sheet build (citizen-wake.js script work).** **S269 (research-build, Mike-approved Option-B + advisor): Phase B EXTENDED with B3 (ordinary-bad event content — the negative-pole supply) + B4 (cross-system composure cap).** Data-verified gap: bad life is bimodal (catastrophe-or-nothing; only ordinary-bad is `layoff`@0.004; DIAL_MAP has no ordinary-negative tag — affect tags are wake-reserved, `Setback{-5}` is catastrophe-scale). B3 = add mild objective-negative vocab (~−1/−2, additive/engine.39-pattern) + ordinary-bad pools in the 6 existing engines + per-pool valence ratio + dial-valence weighting + activate `runConductEngine`/chaos-cars (Option-B rebalance-in-place, NOT a new generator). **Leverage: B3 is deterministic (no classifier) → ships on its own composure-distribution-widens dry-run gate, INDEPENDENT of B1's affect re-audit (can land first).** B4 caps the objective-fold × reflection-write-back composure double-count. Spec: plan §Phase B B3/B4. **B3 STEP-1 VOCAB BUILT S270 (engine-sheet, local, clasp-gated):** 6 ordinary-bad objective tags in `citizenDialMap` DIAL_MAP — `Friction{composure:-2}`/`Strain{-1}`/`Stumble{composure:-2,drive:-1}`/`Spat{composure:-1,warmth:-1}`/`Disappointment{-2}`/`Ailment{-1}` (−1/−2 ordinary scale, below affect −3, above catastrophe Setback −5; additive, inert until pools emit; composer Test 9 green). **NEXT SLICE (behavior-changing — needs go + composure-distribution-widens dry-run gate):** B3 steps 2-5 — ordinary-bad pools in the 6 engines + per-pool valence ratio + dial-valence weighting + activate `runConductEngine`/chaos-cars. **S270 SEQUENCING DECISION (engine-sheet, Mike-delegated):** HELD post-C100 — do NOT build locally now either. B3 ordinary-bad emission is a content-changing reactivation that would confound the **G-EC33 sentiment-uniformity watch** if deployed at C100 (divergence un-attributable: chaos-cars vs B3 vs organic). C100 needs a clean read. Building 6-engine changes now = undeployed drift bloating the gated clasp source with no time pressure. Sequence B3 steps 2-5 as one focused unit (build → dry-run gate → own clean deploy window) AFTER C100 chaos + G-EC33 clear. **2 manual editor deletes owed** (`generateNamedCitizensEvents.gs` A3 orphan + `applyCycleWeightForLatestCycle.gs` S238 — clasp won't auto-delete).

## Changelog

- 2026-06-23 — **Phase B extended: B3 ordinary-bad event content + B4 cross-system cap (S269, research-build, Mike-approved Option-B + advisor).** The "real-life generator, good & bad events" ask resolved to the OBJECTIVE half of Phase B's valence/divergence (B1 = the subjective/classifier half). Data-verified gap (EVENT_SYSTEM_MAP + DIAL_MAP read): good life richly covered; bad is **bimodal — catastrophe or nothing**, only ordinary-bad is `layoff`@0.004; every ambient tag pushes composure up/neutral → 0 volatile / 86% neutral. **B3** = (1) add mild objective-negative VOCAB (~−1/−2, additive — DIAL_MAP has none at ordinary scale; affect tags are wake-reserved, `Setback{-5}` is catastrophe-scale), (2) ordinary-bad pools in the 6 existing engines, (3) per-pool good:neutral:bad valence ratio, (4) dial-valence weighting (low-composure draws more friction), (5) activate built machinery (`runConductEngine` inert, chaos-cars smoke-pending) — Option-B (rebalance-in-place), NOT a new generator. **Key leverage: B3 is deterministic (no classifier) → ships on its own composure-distribution-widens dry-run gate, AHEAD of / independent of B1's affect re-audit.** **B4** = the cross-system cap: objective fold (B3) + reflection accretion (research.14 write-back) both hit composure on the same bad day → grounded-compounding-but-bounded via a per-citizen per-cycle net composure-delta cap across both feeders + both decay systems. Composer/apply for the write-back already built; B3 vocab + pools are the new build.
- 2026-06-19 — Initial draft (S264, research-build). Diagnosed from S264 live data: 14%/cycle coverage, named generator orphaned, T8 four-gate throttle. Advisor-reviewed (4 load-bearing points folded: valence-is-the-crux dependency on research.14 affect-fix; free-engine vs paid-opinion split; coverage-prerequisite-for-opinion confabulation guard; don't-drown number + compressor verify). Sequencing grep-verified: texture-coverage is composure-neutral (runway to parallelize Phase A while Phase B lands). Mike-directed: every ledger citizen eligible for the 24/7 lifecycle + own opinions. Engine.38 row filed; research.14 + engine.32 cross-linked.
