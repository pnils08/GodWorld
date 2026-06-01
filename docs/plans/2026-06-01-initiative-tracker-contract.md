---
title: Initiative_Tracker contract + fine-tune — make it a real motion-tracking system
created: 2026-06-01
updated: 2026-06-01
type: plan
tags: [civic, engine, schema, architecture, active]
sources:
  - "Research basis: [[../research/2026-06-01-initiative-tracker-state]] — the full diagnosis + read/write graph + blast-radius"
  - "[[2026-05-11-civic-tracker-collision-schema]] — the trackerOwner WHO-writes contract (ES-5, done); this plan is the WHAT/lifecycle contract"
  - "output/production_log_city_hall_c95_run_gaps.md §G-R1 — silent-skip gap"
  - "phase02-world-state/applyInitiativeImplementationEffects.js — PHASE_INTENSITY (de-facto vocabulary authority)"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — ROLLOUT row (civic.* / engine.*)"
  - "[[index]] — register in same commit"
  - "[[../mara-vance/INITIATIVE_TRACKER_VOTER_LOGIC]] — existing Status-lifecycle + (stale) schema doc the contract supersedes/extends"
---

# Initiative_Tracker contract + fine-tune

**Goal:** Turn the Initiative_Tracker from a free-text sheet that drifts every cycle into a contracted system: one canonical `ImplementationPhase` vocabulary + lifecycle, an engine that honors it, writers (city-hall + voice agents) that emit it without inventing, and a documented add-an-initiative procedure — so the sheet becomes a reliable motion-tracker that an agent could one day drive.

**Research basis:** [[../research/2026-06-01-initiative-tracker-state]]. Root cause: no canonical `ImplementationPhase` contract exists; the engine's 20-phase `PHASE_INTENSITY` map is the de-facto authority, writers free-form against it, and unrecognized strings are silently zeroed (INIT-005 + INIT-006 currently dark to the engine).

**Architecture:** Contract-first. The canonical vocabulary (Phase 1) is the spine everything else conforms to — the engine tolerates it (Phase 2), the writers emit it (Phase 3), and a new initiative is minted against it (Phase 4). A reversible data stopgap (Phase 0) makes C96 read correctly tonight without a deploy. **Two hard fences:** (1) engine code changes are clasp → post-C96 (S250 deploy-attribution, no stacking on the un-smoke-tested S247 stack); (2) /city-hall is post-engine (S248), so the stopgap fixes C96's *read* off current rows, not C96's own civic motion.

**Terminals:** engine-sheet owns Phase 0 (sheet data) + Phase 2 (engine map). research-build / civic owns Phase 1 (contract doc) + Phase 3 (agent RULES + city-hall SKILL) + Phase 4 (add-initiative procedure). Cross-builder; sequenced, not parallel.

**Acceptance criteria:**
1. A canonical `docs/.../INITIATIVE_TRACKER_CONTRACT.md` (or section) exists: full 28-col schema (supersedes the stale 17-col doc), the authoritative `ImplementationPhase` vocabulary + intensities, the lifecycle/transition rules, and a how-to-add-an-initiative procedure. "City-hall knows the process without inventing it."
2. The engine's Phase-2 `PHASE_INTENSITY` consumption tolerates the canonical vocabulary (no silent intensity-0 drops for valid phases).
3. The writers (assembleDecisions / applyTrackerUpdates) canonicalize phase to the vocabulary on write; agent RULES + city-hall SKILL reference the contract; a validation gate (the one pre-flight dropped S230) is restored pointed at the canonical vocab.
4. INIT-005 + INIT-006 contribute correct (non-zero) civic ripple.
5. A documented procedure lets a writer mint a new INIT-00N with all required fields + register it.

---

## Phases

### Phase 0 — C96 stopgap (data-only, no clasp, operator-ratified) — engine-sheet
- **Goal:** make C96's Phase-2 read correct off the current rows, tonight, with zero deploy.
- **Steps:**
  1. **Baseline first (attribution):** capture pre-C96 `applyInitiativeImplementationEffects` per-initiative intensity output so the INIT-005/006 delta is isolable alongside the cityDynamics + simYear smoke-test.
  2. **Ratify the old→new phase mapping with Mike** (canon judgment, not mechanical — see §Decisions D1). Normalize the two drifted rows to map-recognized values; flag the canon-flattening.
  3. Fix stale `NextActionCycle` (all rows reference cycle 94/95; we're at 96) + clear the dead empty INIT-004 row.
  4. Sheet write via `lib/sheets.updateRowFields`; verify by re-read; baseline diff confirms only the intended deltas.
- **Hazard:** flattens richer phase strings (restored in Phase 2). Re-drifts next cycle unless Phase 3 lands (this is a patch).
- **Status:** [ ] gated on Mike's mapping ratify (D1)

### Phase 1 — the canonical contract doc — research-build / civic
- **Goal:** the single source of truth a writer reads instead of inventing.
- **Steps:** Author the contract: (a) full 28-col schema with field semantics; (b) the authoritative `ImplementationPhase` vocabulary reconciled from `PHASE_INTENSITY` + the richer industry phases the agents legitimately use, with an intensity for each; (c) lifecycle/transition rules (which phase follows which, per initiative type); (d) how-to-add-an-initiative. Cross-link from civic.md, city-hall SKILL, the 5 project-agent RULES, and supersede the stale schema in INITIATIVE_TRACKER_VOTER_LOGIC.
- **Status:** [ ] not started

### Phase 2 — engine drift-tolerance (code, clasp, POST-C96) — engine-sheet
- **Goal:** the engine honors the canonical vocabulary instead of flattening it; restores the canon Phase 0 had to drop.
- **Steps:** Mirror the existing `applyTrackerUpdates.js:366-383` partial-match tolerance into the Phase-2 `applyInitiativeImplementationEffects` map (Row-24 case-fold/family-map pattern). Reactivation (INIT-005/006 0→non-zero) → its own deliberate fire AFTER C96 verifies the current stack.
- **Status:** [ ] blocked on C96 smoke-test

### Phase 3 — writer-side normalization + enforcement — research-build (RULES/SKILL) + engine-sheet (scripts)
- **Goal:** agents stop drifting at the source.
- **Steps:** assembleDecisions/applyTrackerUpdates canonicalize phase to the vocabulary on write; agent RULES + city-hall SKILL reference the contract; restore a validation gate (pointed at the canonical vocab, not the hardcoded enum S230 removed).
- **Status:** [ ] blocked on Phase 1

### Phase 4 — "agent can add an initiative" capability — research-build / civic
- **Goal:** the autonomy payoff — a writer (or future autonomous agent) can mint + track a new initiative.
- **Steps:** documented add-initiative procedure (required fields, ID assignment, default phase/status, neighborhood/domain tagging) wired so it's executable without reverse-engineering. Closes the "an agent wouldn't have a clue how to add it and track it" gap.
- **Status:** [ ] blocked on Phase 1

---

## Decisions (Mike holds these)

- **D1 — C96 stopgap go/no-go + the phase mapping.** Proposed normalization (canon-flattening flagged):
  - INIT-005 `design-development-active` → `design-phase` (intensity 0.2). *Flag: loses the "85% design + active" nuance; engine sentiment-side already reads it as 0.3.*
  - INIT-006 `active-construction-phase-2-planning` → `construction-planning` (0.3). *Flag: project is partway into construction; 0.3 may under-state vs `construction-active` (0.8). This is the canon call — is Baylight planning phase-2, or actively building?*
- **D2 — canonical vocabulary scope.** Keep the engine's 20-phase map as the canon (writers normalize down to it), OR expand the vocabulary to the richer industry phases the agents use (engine tolerates up). Recommend: expand + tolerate (Phase 2) — honor the agents' real states rather than flatten — but the vocabulary list is a canon decision.
- **D3 — terminal split** (mechanism, flagged not asked): engine-sheet Phase 0/2; research-build/civic Phase 1/3/4.

## Open questions
- [ ] Contract doc home: new `docs/mara-vance/INITIATIVE_TRACKER_CONTRACT.md`, or extend INITIATIVE_TRACKER_VOTER_LOGIC.md §Schema/§Lifecycle? (Lean: new dedicated doc; the voter-logic file is voter-logic.)
- [ ] Does the `Status` column need the same contract treatment, or is it stable enough? (Research shows it's documented + auto-advance-ruled; lower priority.)

## Changelog
- 2026-06-01 (S251, engine-sheet) — Initial draft. Ignited from [[../research/2026-06-01-initiative-tracker-state]] during the engine.20c investigation. Phase 0 stopgap fenced from post-C96 code work per S250 deploy-attribution + S248 cycle-order. D1 mapping surfaced for Mike's canon ratify before any sheet write.
