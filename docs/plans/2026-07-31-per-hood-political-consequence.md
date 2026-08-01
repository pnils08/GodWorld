---
title: Per-Hood Political Consequence & Cross-Hood Spillover Plan
created: 2026-07-31
updated: 2026-07-31
type: plan
tags: [engine, citizens, civic, neighborhoods, active]
sources:
  - External codebase audit (commit af50e1f) gaps #1 + #2, verified against live repo 2026-07-31 (Kimi CLI, 4-agent verification)
  - docs/plans/2026-07-04-ripple-ledger-attribution.md (engine.45 — open "per-hood fold" item this plan executes)
  - docs/research/2026-07-04-ripple-attribution-trace.md (pre-fix trace doc; findings C1–C6/E1–E6 mostly CLOSED by engine.45 T1–T3b)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (engine.93)"
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
- **Status:** [ ] not started

### Task 2: Extract approval effect-bus shape
- **Files:** `phase05-citizens/updateCivicApprovalRatings.js` — read
- **Steps:** Read lines 300–345 (writer at 305–321, Ripple rows at 325–337). Record the `S.approvalNeighborhoodEffects` shape and how district → hoods mapping is done (it already targets district hoods for the ledger rows — reuse that mapping).
- **Verify:** shape notes present in Build notes below
- **Status:** [ ] not started

### Task 3: Reconfirm zero readers
- **Files:** repo-wide — read
- **Steps:** `rg -n 'initiativeNeighborhoodEffects|approvalNeighborhoodEffects' phase* utilities lib scripts` — confirm the only hits are the two writers + comments.
- **Verify:** grep output attached to Build notes
- **Status:** [ ] not started

### Task 4: Design the fold (research-build)
- **Files:** `phase02-world-state/applyCityDynamics.js` — read; this plan — modify (Build notes)
- **Steps:** Decide consumer placement (Phase 2, near `applySentimentBleed_` at :1055-1091), delta math (decayed strength → hood sentiment/pressure fields, mirroring the city-scalar application in `applyActiveInitiativeRipples_` at `phase05-citizens/civicInitiativeEngine.js:1720-1748`), clamps, and ordering vs sentiment bleed. Resolve Open question 1 in the same pass.
- **Verify:** design paragraph in Build notes; Mike sign-off on delta math before build
- **Status:** [ ] not started

### Task 5: Implement `applyNeighborhoodEffectsFold_` (engine-sheet)
- **Files:** `phase02-world-state/applyCityDynamics.js` (or sibling per Task 4) — modify
- **Steps:** Implement the fold per Task 4 design: read both buses, apply per-hood deltas, write `recordRipple_` rows with `causeDetail` + hood scope (pattern: `updateCivicApprovalRatings.js:325-337`).
- **Verify:** `node --check` on the modified file
- **Status:** [ ] not started

### Task 6: Sandbox fold test
- **Files:** engine sandbox harness (per engine.45 Task 2 precedent in `docs/plans/2026-07-04-ripple-ledger-attribution.md`) — modify
- **Steps:** Seed one `initiativeNeighborhoodEffects` + one `approvalNeighborhoodEffects` entry, run Phases 1–2, assert hood delta applied and exactly one attributed Ripple row per effect.
- **Verify:** sandbox assertions pass; no double-apply on re-run
- **Status:** [ ] not started

### Task 7: Resolve `getRippleEffectsForNeighborhood_`
- **Files:** `phase05-citizens/civicInitiativeEngine.js` — modify
- **Steps:** If its return shape serves the Track A fold, wire it as the fold's reader (callers > 0). Otherwise delete the function (deletion test: it is an unwired query API; complexity does not reappear). Record the decision in Build notes.
- **Verify:** `rg -c 'getRippleEffectsForNeighborhood_'` → wired (≥2 hits: def + call) or gone (0 hits)
- **Status:** [ ] not started

### Task 8: Track C design one-pager (research-build)
- **Files:** this plan — modify (Build notes)
- **Steps:** One page scoping commute flows (hood-to-hood work movement, building on `phase02-world-state/updateTransitMetrics.js` city-level indices) and resource competition (what scarce pool hoods contend over — engine.55 destination scoring at `migrationTrackingEngine.js:497-699` compares hoods but consumes no shared pool). Alternatives + cost estimate; ends in a Mike yes/no.
- **Verify:** one-pager in Build notes; presented to Mike
- **Status:** [ ] not started

---

## Build notes

Filled as tasks complete. (Shapes from Tasks 1–2, grep evidence from Task 3, fold design from Task 4, Track C one-pager from Task 8.)

---

## Open questions

- [ ] Fold ordering vs `applySentimentBleed_` — before or after? Bleed consumes hood sentiment, so the fold's sentiment deltas change bleed inputs. — blocks Task 4
- [ ] Wire vs delete for `getRippleEffectsForNeighborhood_` — deletion is a code removal in `phase*/`; confirm with Mike per AGENTS.md scope if delete is chosen. — blocks Task 7

---

## Changelog

- 2026-07-31 — Initial draft (Kimi CLI, builder-directed external-audit remediation batch). Audit gaps #1+#2 combined; audit's headline claims verified stale/refuted (engine.45 T1–T3b shipped before the audit's pinned commit), surviving kernel scoped into Tracks A–C.
