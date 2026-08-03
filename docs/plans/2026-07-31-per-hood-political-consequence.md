---
title: Per-Hood Political Consequence & Cross-Hood Spillover Plan
created: 2026-07-31
updated: 2026-08-02
type: plan
tags: [engine, citizens, civic, neighborhoods, active]
sources:
  - External codebase audit (commit af50e1f) gaps #1 + #2, verified against live repo 2026-07-31 (Kimi CLI, 4-agent verification)
  - docs/plans/2026-07-04-ripple-ledger-attribution.md (engine.45 — open "per-hood fold" item this plan executes)
  - docs/research/2026-07-04-ripple-attribution-trace.md (pre-fix trace doc; findings C1–C6/E1–E6 mostly CLOSED by engine.45 T1–T3b)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (engine.93)"
  - "[[../research/2026-08-01-simulation-realism-audit]] — build-order step 3; the two zero-reader buses re-verified there 2026-08-01"
  - "[[2026-07-04-ripple-ledger-attribution]] — engine.45; per-hood fold is its open item, do not duplicate its shipped T1–T3b work"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — registered same commit"
---

# Per-Hood Political Consequence & Cross-Hood Spillover Plan

**Goal:** Initiative and approval consequences land on the specific neighborhoods they target — as per-hood state changes citizens actually live — instead of dissolving into city-wide scalars.

**Architecture:** Three tracks. **Track A** builds the missing per-hood consumer: `S.initiativeNeighborhoodEffects` (writer `phase02-world-state/applyInitiativeImplementationEffects.js:345` — comment confirms "still has no per-hood consumer") and `S.approvalNeighborhoodEffects` (writer `phase05-citizens/updateCivicApprovalRatings.js:305-321`) both have **zero readers** today; a Phase 2 fold applies them to per-hood state with `Ripple_Ledger` attribution rows (`utilities/rippleLedger.js` `recordRipple_`). This *is* engine.45's open "per-hood fold" item — this plan executes it, it does not reopen it. **Track B** resolves the dead `getRippleEffectsForNeighborhood_` (`phase05-citizens/civicInitiativeEngine.js:1790`, zero call sites): wire it as Track A's query seam or delete it — no dead middle. **Track C** (design-only, Mike approval gate) scopes the two cross-hood couplings the sim lacks — commute flows and resource competition — alongside the four that already exist (crime adjacency displacement `phase03-population/updateCrimeMetrics.js:478-481` at `DISPLACEMENT_RATE 0.10`, hotspot spillover `:402`, sentiment bleed `phase02-world-state/applyCityDynamics.js:1055-1091`, engine.55 relocation `phase05-citizens/migrationTrackingEngine.js:497-699`).

**Terminal:** research-build (design) → engine-sheet (build)

**Pointers:**
- Prior work: `docs/plans/2026-07-04-ripple-ledger-attribution.md` (engine.45 — T1–T3b live in prod; this plan's Track A is its open fold item)
- Related plan: [[2026-07-12-engine55-intra-city-relocation]] (the one existing household-grain cross-hood mechanism)
- Verification basis: external audit claimed "ripple story destroyed at cycle boundary" — **refuted** (approval attribution persisted with `reasons[]` since engine.45 T1, `updateCivicApprovalRatings.js:325-337`; multi-cycle ripples serialize/restore/decay via `phase09-digest/finalizeCycleState.js:103-108` + `phase01-config/loadPreviousEvening.js:83-95`). The surviving kernel is per-hood *consumption*, which is what this plan builds. Hood count is 21 (`lib/canonNeighborhoods.js:37`), not the audit's 17.

**Acceptance criteria:**
1. A sandbox cycle with an initiative carrying district targeting produces a measurable per-hood state delta in that district's hoods, with `causeType`-attributed Ripple_Ledger rows scoped to those hoods — not only `S.cityDynamics` scalars.
2. `S.initiativeNeighborhoodEffects` and `S.approvalNeighborhoodEffects` each have ≥1 named reader; repo grep shows no zero-reader effect buses on these paths.
3. `getRippleEffectsForNeighborhood_` either has callers (wired as the Track A seam) or is deleted — verified by grep.
4. Track C one-pager delivered to Mike; zero Track C code lands before his approval.

---

## Tasks

### Task 1: Extract initiative effect-bus shape
- **Files:** `phase02-world-state/applyInitiativeImplementationEffects.js` — read
- **Steps:** Read lines 320–360. Record the exact object shape written to `S.initiativeNeighborhoodEffects` (keys, hood addressing, strength/decay fields) in this plan's Build notes.
- **Verify:** shape notes present in Build notes below
- **Status:** [x] complete 2026-08-02 (kimi)

### Task 2: Extract approval effect-bus shape
- **Files:** `phase05-citizens/updateCivicApprovalRatings.js` — read
- **Steps:** Read lines 300–345 (writer at 305–321, Ripple rows at 325–337). Record the `S.approvalNeighborhoodEffects` shape and how district → hoods mapping is done (it already targets district hoods for the ledger rows — reuse that mapping).
- **Verify:** shape notes present in Build notes below
- **Status:** [x] complete 2026-08-02 (kimi)

### Task 3: Reconfirm zero readers
- **Files:** repo-wide — read
- **Steps:** `rg -n 'initiativeNeighborhoodEffects|approvalNeighborhoodEffects' phase* utilities lib scripts` — confirm the only hits are the two writers + comments.
- **Verify:** grep output attached to Build notes
- **Status:** [x] complete 2026-08-02 (kimi)

### Task 4: Design the fold (research-build)
- **Files:** `phase02-world-state/applyCityDynamics.js` — read; this plan — modify (Build notes)
- **Steps:** Decide consumer placement (Phase 2, near `applySentimentBleed_` at :1055-1091), delta math (decayed strength → hood sentiment/pressure fields, mirroring the city-scalar application in `applyActiveInitiativeRipples_` at `phase05-citizens/civicInitiativeEngine.js:1720-1748`), clamps, and ordering vs sentiment bleed. Resolve Open question 1 in the same pass.
- **Verify:** design paragraph in Build notes; Mike sign-off on delta math before build
- **Status:** [x] design signed off 2026-08-02 (engine-sheet) — delta math APPROVED as specced; see Build notes §Rulings

### Task 5: Implement `applyNeighborhoodEffectsFold_` (engine-sheet)
- **Files:** `phase02-world-state/applyCityDynamics.js` (or sibling per Task 4) — modify
- **Steps:** Implement the fold per Task 4 design: read both buses, apply per-hood deltas, write `recordRipple_` rows with `causeDetail` + hood scope (pattern: `updateCivicApprovalRatings.js:325-337`).
- **Verify:** `node --check` on the modified file
- **Status:** [x] SHIPPED 2026-08-02 (engine-sheet) — inner `applyNeighborhoodEffectsFold_` in `applyCityDynamics.js`, called post-momentum/pre-clamp per the Task 4 design; two `neighborhood-fold` consumption rows + consume-and-clear after the hood loop

### Task 6: Sandbox fold test
- **Files:** engine sandbox harness (per engine.45 Task 2 precedent in `docs/plans/2026-07-04-ripple-ledger-attribution.md`) — modify
- **Steps:** Seed one `initiativeNeighborhoodEffects` + one `approvalNeighborhoodEffects` entry, run Phases 1–2, assert hood delta applied and exactly one attributed Ripple row per effect.
- **Verify:** sandbox assertions pass; no double-apply on re-run
- **Status:** [x] SHIPPED 2026-08-02 (engine-sheet) — `scripts/testNeighborhoodEffectsFold.js`, 19 assertions green, VM harness (no sheet/network). Mutation-tested: fold-disabled → 10 failures, clear-removed → 4 failures

### Task 7: Resolve `getRippleEffectsForNeighborhood_`
- **Files:** `phase05-citizens/civicInitiativeEngine.js` — modify
- **Steps:** If its return shape serves the Track A fold, wire it as the fold's reader (callers > 0). Otherwise delete the function (deletion test: it is an unwired query API; complexity does not reappear). Record the decision in Build notes.
- **Verify:** `rg -c 'getRippleEffectsForNeighborhood_'` → wired (≥2 hits: def + call) or gone (0 hits)
- **Status:** [x] SHIPPED 2026-08-02 (engine-sheet) — DELETED (43 lines) with a tombstone comment naming the replacement; zero callers re-confirmed immediately before the cut

### Task 8: Track C design one-pager (research-build)
- **Files:** this plan — modify (Build notes)
- **Steps:** One page scoping commute flows (hood-to-hood work movement, building on `phase02-world-state/updateTransitMetrics.js` city-level indices) and resource competition (what scarce pool hoods contend over — engine.55 destination scoring at `migrationTrackingEngine.js:497-699` compares hoods but consumes no shared pool). Alternatives + cost estimate; ends in a Mike yes/no.
- **Verify:** one-pager in Build notes; presented to Mike
- **Status:** [x] APPROVED 2026-08-02 (Mike) — Coupling 1 + 2a become Tasks 9–10; 2b deferred to civic.14; 2c skipped

### Task 9: Commute-flow matrix (engine-sheet) — Mike-approved Track C build
- **Files:** new module (suggest `phase02-world-state/commuteFlowEngine.js` — placement is engine-sheet's call); consumers `phase02-world-state/updateTransitMetrics.js` (`:274-281` ridership demographics, `:180-190` affectedHoods), engine.96 closure path when built
- **Steps:** Build `S.commuteFlows = { originHood: { destHood: workerCount } }` from `ctx.ledger`: home hood = `Neighborhood`, work hood = employer's Business_Ledger neighborhood (citizen → BIZ-ID via `employer_mapping.json` resolution, BIZ → hood). Aggregate counts per pair; sorted keys, no rng — fully deterministic. Wire three consumers: (a) station ridership demographic term flow-weighted by origins, replacing home-hood-only; (b) disruption `affectedHoods` expanded to hoods whose flows route through the broken station; (c) daytime-population delta for employment-center hoods into `neighborhoodDynamics` retail/traffic. Events surface as `storyHooks` (pattern `migrationTrackingEngine.js:681-694`), never direct LifeHistory writes — LifeHistory intake rides engine.77's batch path.
- **Verify:** sandbox — seeded employment yields an identical matrix across two runs (determinism); a disruption at one station names ≥1 non-local hood
- **Status:** [ ] not started

### Task 10: Housing-supply response (engine-sheet) — Mike-approved Track C build
- **Files:** `phase05-citizens/neighborhoodTrajectoryEngine.js` (owns HousingPressure writes, 0–10 scale, rent kicker ≥8 at `:67`); `phase05-citizens/migrationTrackingEngine.js` (move execution `:661-697`)
- **Steps:** On each executed relocation, nudge destination hood HousingPressure up (~+0.1) and source hood down (~−0.05) through the trajectory engine's existing pressure update path — NO new writer. Bounded by the existing 0–10 clamps; the ≥8 rent kicker then fires naturally. One `recordRipple_` row per cycle's move batch: `causeType: 'relocation-pressure'`, hood-scoped `targetIds`.
- **Verify:** sandbox — 3 seeded moves into one hood raise its HousingPressure by the expected delta; no double-apply on re-run
- **Status:** [ ] not started

---

## Build notes

### Task 1 — `S.initiativeNeighborhoodEffects` shape (writer `applyInitiativeImplementationEffects.js:237-252`, merge `:322-336`)

Per-hood object, keyed by hood display name parsed from the tracker's AffectedNeighborhoods column:

```js
{ traffic: 0, retail: 0, nightlife: 0, publicSpaces: 0, communityEngagement: 0, sentiment: 0 }
```

Values are `DOMAIN_EFFECTS[domain][key] * |intensity| * sign(intensity)` accumulated per hood. Merge (`:322-336`) is **additive across cycles with no reset** — today the bus grows unboundedly because nothing reads it. No strength/decay fields; values are per-cycle deltas.

### Task 2 — `S.approvalNeighborhoodEffects` shape (writer `updateCivicApprovalRatings.js:305-321`)

Per-hood object keyed by hood display name:

```js
{ sentiment: 0, communityEngagement: 0 }
```

`sentiment += approvalDelta * 0.003`; `communityEngagement += sentiment * 0.5`. Also additive with no reset. District → hoods mapping: local `DISTRICT_HOODS` map at `updateCivicApprovalRatings.js:112-122` (9 districts, 21 hoods — matches `lib/canonNeighborhoods.js`). Fold reuses hood keys directly, no mapping needed.

### Task 3 — zero readers reconfirmed (2026-08-02)

`rg 'initiativeNeighborhoodEffects|approvalNeighborhoodEffects'` over all `*.js`: hits only in the two writers plus the `:345` "still has no per-hood consumer" comment. Zero readers.

### Task 4 — fold design (kimi, 2026-08-02 — delta math APPROVED by engine-sheet, independent verification)

**Placement:** inside the per-neighborhood loop of `applyCityDynamics_` (`phase02-world-state/applyCityDynamics.js:1096+`), applied to `nm` **after the momentum blend (`:1170-1180`), immediately before the clamp block (`:1183-1189`)**. This is the last-write position: fresh fold deltas land at full strength (momentum would damp them to 70%) and the existing `clampMult`/`clampSent` calls catch overflow — no new clamp code.

**Ordering (Open question 1 — resolved):** `applySentimentBleed_` (`:1091`) runs at cluster level before hood derivation; the fold runs at hood level after it. The fold is structurally post-bleed, so targeted hoods receive the full delta in-cycle and bleed never dilutes a same-cycle initiative effect. Decay happens via the existing momentum blend (30% carry-forward per cycle) — no decay fields needed on the bus.

**Delta math:** additive, per field, only when the bus entry's field is a finite number:

- initiative bus: `nm.traffic/retail/nightlife/publicSpaces/communityEngagement/sentiment += e.<field>` — values are ~±0.01–0.05 (DOMAIN_EFFECTS × intensity), i.e. ±1–5% on the ~1.0 multipliers and ±0.01–0.05 sentiment, consistent with existing micro adjustments (×0.90–1.05, ±0.02–0.08).
- approval bus: `nm.sentiment += a.sentiment; nm.communityEngagement += a.communityEngagement` — ±0.003 per approval point, intentionally micro.

**Consume-and-clear:** after the neighborhood loop, reset both buses (`S.initiativeNeighborhoodEffects = {}`, `S.approvalNeighborhoodEffects = {}`). Writers re-merge fresh each cycle; this makes the bus a per-cycle delta channel, satisfies the sandbox no-double-apply criterion, and stops the unbounded accumulation.

**Ripple rows from the fold:** per-initiative cause attribution already exists at the write sites (engine.45 T3e `initiative-implementation` rows with hood `targetIds`; T1 `approval-shift` rows) — the fold must NOT re-ledger those. The fold writes one consumption row per bus per cycle: `causeType: 'neighborhood-fold'`, `effectType: 'fold-applied/initiative-implementation'` or `'fold-applied/approval-shift'`, `targetScope: 'neighborhood'`, `targetIds:` hoods receiving nonzero deltas, `sourceEngine: 'applyCityDynamics.foldNeighborhoodEffects'`.

**`getRippleEffectsForNeighborhood_` (Task 7) — recommend DELETE.** It queries `S.activeRipples` (the city-scalar ripple path), not the two per-hood buses; its return shape (`sentiment/sick/unemployment/retail/traffic/community`) matches neither bus; wiring it into the fold would double-count initiative effects already applied as city scalars at `civicInitiativeEngine.js:1720-1748`. Deletion test: complexity vanishes, zero callers. Deletion touches `phase*/` — needs Mike's OK per AGENTS.md scope.

### Rulings (engine-sheet, 2026-08-02 — the two decisions gating Tasks 5–7)

1. **Delta math APPROVED as specced.** Independently verified before ruling: both writers at the cited lines, zero readers (grep reproduced), the `:345` no-consumer note, and the magnitude envelope — applyCityDynamics' existing edition-coverage fold runs 0.05–0.15 pre-clamp, so ±0.01–0.05 initiative / ±0.003-per-point approval sit inside established behavior, bounded by the existing `clampMult`/`clampSent`. Consume-and-clear after the loop approved; failure semantics noted for the build: a phase throw before the clear leaves both buses intact for next cycle (deltas re-apply late rather than vanish — the acceptable direction). The per-cycle `neighborhood-fold` consumption rows ride the existing engine.45 ripple-write path — no new write machinery.
2. **Task 7 APPROVED — DELETE `getRippleEffectsForNeighborhood_`.** Zero callers independently confirmed; shape matches neither bus; wiring it would double-count city-scalar effects already applied at `civicInitiativeEngine.js:1720-1748`. The cut is engine-sheet's, made in the Tasks 5–7 build.

Tasks 5–7 fully specced and unblocked for engine-sheet. Task 8 Track C one-pager remains kimi's.

### Task 8 — Track C one-pager (kimi, 2026-08-02 — presented to Mike, yes/no pending)

**Scope:** the two cross-hood couplings the sim lacks, against the four it has (crime adjacency displacement, hotspot spillover, sentiment bleed, engine.55 relocation). Design-only — zero code before Mike's approval.

**Coupling 1 — Commute flows (recommend: BUILD).** Today `updateTransitMetrics.js` draws each BART station's ridership from its *own* hood's demographics only (`:274-281`), and no engine models "lives in A, works in B." The inputs all exist post-engine.83/85: every employed citizen has an employer, and `employer_mapping.json` + Business_Ledger locate employers by hood. A deterministic origin→destination matrix (home hood → employer hood, aggregated over the ledger) would feed: (a) transit ridership weighted by flow origins instead of home-hood-only; (b) daytime-population effects on employment-center hoods (Downtown, Jack London retail/traffic); (c) engine.96 business decline/closure rippling sentiment to workers' *home* hoods — the political-consequence multiplier this plan exists for; (d) transit disruptions hitting every hood whose flow routes through a broken station, not just the station's hood. Cost: ~150-line module + 3 small consumer wires; matrix rebuilds per cycle or on employment/move dirty flags; no new sheets (lives in `ctx.summary`, optional dashboard persist later).

**Coupling 2 — Resource competition (recommend: SPLIT).** Hoods are compared (engine.55 scoring) but never contend for a shared scarce pool. Three candidate pools:
- *Housing supply (build, small):* engine.55 moves households into a hood with zero supply response — inflow should raise HousingPressure → rent trajectory → displacement risk, closing the loop relocation currently leaves open. Small patch: post-move pressure nudge in the destination hood via the existing Neighborhood_Map writer.
- *City capital pool (defer):* initiative budgets competing for a finite per-cycle pool gives council votes zero-sum texture, but it risks the civic-theater failure mode (process blocking interventions from going live — the exact inversion `GodWorld_My_Oakland.md` warns against) and belongs behind the civic.14 Initiative_Tracker contract. Revisit after civic.14.
- *Retail customer pie (skip):* sentiment bleed + existing retail dynamics already approximate spillover; a zero-sum retail pool would double-count them.

**Ask of Mike:** yes/no on commute-flow matrix (Coupling 1) and housing-supply response (Coupling 2a). Both are engine-sheet builds after a yes; 2b deferred, 2c skipped regardless.

---

## Open questions

- [x] Fold ordering vs `applySentimentBleed_` — RESOLVED 2026-08-02 (kimi): fold is structurally post-bleed (bleed is cluster-level at :1091, fold is hood-level after derivation); decay rides the existing 30% momentum carry. See Build notes §Task 4.
- [x] Wire vs delete for `getRippleEffectsForNeighborhood_` — RESOLVED 2026-08-02: DELETE approved by engine-sheet (zero callers, wrong shape, would double-count city-scalar application). engine-sheet executes the removal in the Task 5–7 build.

---

## Changelog

- 2026-07-31 — Initial draft (Kimi CLI, builder-directed external-audit remediation batch). Audit gaps #1+#2 combined; audit's headline claims verified stale/refuted (engine.45 T1–T3b shipped before the audit's pinned commit), surviving kernel scoped into Tracks A–C.
- 2026-08-01 (Kimi) — Audit pointer added: build-order step 3 of [[../research/2026-08-01-simulation-realism-audit]]; the two zero-reader buses re-verified there at file:line.
- 2026-08-02 (kimi) — Tasks 1–4 complete (research-build half): both bus shapes extracted, zero readers reconfirmed, fold design + ordering resolution in Build notes. Delta math awaiting Mike sign-off; Task 7 recommendation is DELETE (needs Mike OK, touches `phase*/`). Open: Task 8 Track C one-pager (kimi), Tasks 5–7 engine-sheet after sign-off.
- 2026-08-02 (kimi) — engine-sheet (substrate steward) ruled both gates after independent verification: delta math approved as specced incl. consume-and-clear; `getRippleEffectsForNeighborhood_` delete approved. Tasks 5–7 unblocked for engine-sheet; Task 8 one-pager remains kimi's.
- 2026-08-02 (engine-sheet) — Both gating decisions RULED (§Rulings): delta math approved, Task 7 delete approved. Tasks 5–7 unblocked; Task 8 stays kimi.
- 2026-08-02 (engine-sheet) — Tasks 5–7 SHIPPED: fold live, 19-assertion sandbox (mutation-tested), dead helper deleted. Acceptance 2+3 met; 1 pends a live cycle. Task 8 (kimi) is all that remains.
- 2026-08-02 (kimi) — Task 8 Track C one-pager delivered (Build notes §Task 8): commute-flow matrix recommended BUILD, housing-supply response recommended BUILD (small), capital pool DEFERRED to civic.14, retail pie SKIP. Awaiting Mike yes/no.
- 2026-08-02 (kimi) — Mike APPROVED Coupling 1 (commute flows) + 2a (housing-supply response) → specced as Tasks 9–10 (engine-sheet). Mike design doctrine recorded: build layers as true ripples — events must reach citizens' life history (a business closure is a story seed); wire through existing surfaces (storyHooks, Ripple_Ledger, engine.77 LifeHistory batch), never new parallel buses. 2b capital pool stays deferred to civic.14; 2c skipped.
