---
title: Engine Regulatory Friction Removal + Auditor Reweight Plan
created: 2026-05-22
updated: 2026-05-22
type: plan
tags: [engine, initiative-engine, auditor, draft]
sources:
  - "docs/plans/2026-05-22-c94-gap-log-triage.md §3 Cluster C13"
  - "output/production_log_edition_c94_sift_gaps.md G-S4 (engine generates regulatory-friction content with zero editorial payoff)"
  - "output/production_log_run_cycle_c94_gaps.md G-EC2 (INIT-001 Stab Fund 16 cycles disbursement-active), G-EC3 (INIT-002 OARI 12 cycles pilot_evaluation), G-EC4 (INIT-006 Baylight 11 cycles construction-active)"
  - "MEMORY.md project_c92-reframe-building-not-running.md — S173"
  - "MEMORY.md project_simulation-is-oakland-framing.md — S170"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.20 row points here"
  - "[[2026-05-22-c94-gap-log-triage]] — parent triage master"
  - "[[../canon/INSTITUTIONS]] — initiative canon"
  - "[[../engine/ENGINE_REPAIR]] — companion engine-defect log"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — register in same commit"
---

# Engine Regulatory Friction Removal + Auditor Reweight Plan

**Goal:** Strip regulatory-friction modeling (HCAI / MOU / Escalation Triggers / multi-cycle phase tenures) from the engine's initiative system and reweight the auditor so initiatives with effects firing positively are not flagged HIGH-severity-stuck — restore "Build the goddamn health center already" cadence per Mike's S224 framing.

**Architecture:** Engine simulates real-world municipal bureaucracy timing (Stab Fund 16 cycles in disbursement-active, OARI 12 cycles in pilot_evaluation, Baylight 11 cycles construction-active, Health Center 3+ cycles in design-development-active). Phase-tenure dominates the stuck-initiative classifier even when effects fire 20× threshold. Sift then over-weights "regulatory friction" content because that's what the engine surfaces every cycle. Editions read as council/bureaucratic-process newspaper. Plan: (a) shorten phase tenures (design-development 3→1, pilot_evaluation 12→2, disbursement-active 16→4, construction-active 11→3); (b) add anti-stuck logic that advances phase when effects firing positively above threshold; (c) reweight auditor to downgrade HIGH→LOW stuck-initiative when remedy-firing-positive. Aligned with S173 building-not-running reframe — engine generates story, not real-world bureaucracy.

**Terminal:** research-build (plan + skill/agent spec updates) + engine-sheet (implementation). Substrate-routine engine work — per S218 peer-stewardship, engine-sheet executes once plan is filed.

**Pointers:**
- Cluster context: [[2026-05-22-c94-gap-log-triage]] §3 C13
- Engine principle: project_c92-reframe-building-not-running.md — engine generates simulation that makes good story, not real-world simulation
- Engine principle: project_simulation-is-oakland-framing.md — Oakland is SimCity scaffold, not literal current-Oakland-state
- Stuck classifier: `scripts/engine-auditor/detectStuckInitiatives.js` v1.2.0 (S216 fix — carry-forward poisoning closed; phase-tenure logic still over-strict)
- Phase clocks: `phase15-initiative-engine/advanceInitiative.js` (or wherever cycle-clock logic lives — Task 1 confirms)
- INIT history: `output/initiative_history_c{93,94}.json` if exists; `Initiative_Tracker` sheet otherwise

**Acceptance criteria:**
1. Stab Fund (INIT-001) advances from disbursement-active to next phase within ≤4 cycles when effects fire positively (was 16 cycles).
2. OARI (INIT-002) advances out of pilot_evaluation within ≤2 cycles when remedy fires positively (was 12 cycles).
3. Baylight (INIT-006) advances construction-active phases within ≤3 cycles per phase (was 11 cycles).
4. Health Center (INIT-005) advances design-development-active → next phase within ≤1 cycle when commitment lands (was 3+).
5. `detectStuckInitiatives` flags HIGH only when `cyclesInState > new_threshold` AND `remedyFiring=false`; flags LOW when remedy is firing.
6. Sift Step 5 (C2 plan Task 5) `covered-by-feature` triage absorbs remaining regulatory-process noise into civic round-up rather than dedicated articles.
7. Edition readability target: zero HIGH-band stuck-initiative editorial content per cycle when initiatives are advancing.

---

## Tasks

### Task 1: Locate phase-clock + phase-tenure logic

- **Files:**
  - `phase15-initiative-engine/**/*.js` — read
  - `scripts/engine-auditor/detectStuckInitiatives.js` v1.2.0 — read
  - `lib/initiative-engine.js` (if exists) — read
- **Steps:**
  1. Find the canonical source of `phase` + `cyclesInState` + advancement rules for each initiative phase.
  2. Document current phase-tenure thresholds for: design-development-active, pilot_evaluation, disbursement-active, construction-active, plus any other phases that exceed 3-cycle tenure.
  3. Find the auditor's HIGH-severity gate logic in `detectStuckInitiatives`.
- **Verify:** Single file/function per concern; no duplicate threshold sites.
- **Status:** [ ] not started

### Task 2: Phase-tenure threshold reduction

- **Files:**
  - `phase15-initiative-engine/<phase-clock-script>.js` — modify (per Task 1 location)
- **Steps:**
  1. design-development-active: 3 → 1
  2. pilot_evaluation: 12 → 2
  3. disbursement-active: 16 → 4
  4. construction-active (per-phase): 11 → 3
  5. Add Phase column inline comment naming this plan as pointer.
- **Verify:** Diff isolates threshold constants; no behavioral change beyond numbers.
- **Status:** [x] CLOSED S249 (ROLLOUT engine.20b) — **superseded by the S227 voice-emergent reframe.** No `phase15-initiative-engine` clock exists to retune; numeric phase-tenure thresholds were the engine-coded model that engine.20a T1 disproved. Phase tenure is now voice-emergent — see Task 3 close note.

### Task 3: Anti-stuck advancement logic

- **Files:**
  - `phase15-initiative-engine/<advance-script>.js` — modify (per Task 1 location)
- **Steps:**
  1. Add `effectsFiringPositively(initiative)` predicate: true when measured-effects are above effect-threshold AND remedy is firing.
  2. Override phase-tenure clock when `effectsFiringPositively` — advance phase regardless of clock.
  3. Document the override in `docs/engine/archive/ENGINE_REPAIR.md` with Pattern: regulatory-friction-removal.
- **Verify:** Unit test: initiative with cyclesInState=2 + effects firing → advance; initiative with cyclesInState=2 + effects-not-firing → stay.
- **Status:** [x] CLOSED S249 (ROLLOUT engine.20b, commit pending). **Reframed: the `effectsFiringPositively` engine predicate was never built — engine.20a T1 (S227) proved phase tenure is voice-emergent, not engine-coded.** Implemented instead as a `## Phase-Advance Discipline` section in all 5 project/baylight RULES.md: the owning agent proposes the next `ImplementationPhase` descriptor when its current phase's defining deliverable materially lands AND effects are positive/cascade-directed (the agent's packet-assessable judgment), emitting top-level `trackerOwner: "INIT-XXX"` + `trackerUpdates{ImplementationPhase,...}`. The auditor's positive-remedy verdict (`detectStuckInitiatives` v1.3, Task 4) is the parallel verification signal, not a wired input. Hold-with-reason path documented (unchanged phase + MilestoneNotes). Spawned `engine.20e` (applyTrackerUpdates VALID_OWNERS audit reconciliation vs the trackerOwner contract).

### Task 4: Auditor reweight (`detectStuckInitiatives` v1.3.0)

- **Files:**
  - `scripts/engine-auditor/detectStuckInitiatives.js` — modify v1.2.0 → v1.3.0
  - `scripts/engine-auditor/detectStuckInitiatives.test.js` — extend
- **Steps:**
  1. Modify severity assignment: HIGH only when `cyclesInState > tenure_threshold AND remedyFiring=false`.
  2. Reclassify LOW (or drop entirely) when remedy is firing — these are normal-progress initiatives, not stuck.
  3. Test fixtures: Stab Fund effects-firing → LOW; Stab Fund effects-not-firing + 5 cycles → HIGH.
  4. Bump detectorVersion in audit JSON.
- **Verify:** `npm test scripts/engine-auditor/detectStuckInitiatives.test.js` green; C94 audit re-run shows expected HIGH-band drop.
- **Status:** [ ] not started

### Task 5: Initiative content audit (sift-side)

- **Files:**
  - `.claude/skills/sift/SKILL.md` — modify
- **Steps:**
  1. Add to Step 5 triage vocabulary (depends on C2 plan Task 5): `covered-by-feature` absorbs regulatory-process noise into civic round-up.
  2. Cadence cap: at most 1 dedicated article per cycle per initiative AND only if there's actual movement (not just process-tick).
- **Verify:** Cross-link to C2 plan Task 5.
- **Status:** [ ] not started

### Task 6: Backfill INIT-001/002/005/006 phase clocks

- **Files:**
  - `Initiative_Tracker` (sheet)
- **Steps:**
  1. Reset `cyclesInState` on stuck initiatives to a starting value consistent with new thresholds (e.g., halve current values OR snap to threshold-1 so next cycle triggers advancement check).
  2. Optionally: advance phase manually on initiatives that should already be past their current phase under new thresholds.
- **Verify:** Initiative_Tracker post-state has no `cyclesInState > new_threshold` for active initiatives.
- **Status:** [ ] not started

### Task 7: Dry-run vs C94 audit + C95 live-run

- **Files:**
  - `output/engine_audit_c94_dryrun_regulatory_friction.json` — generate from C94 inputs against new code
  - `output/production_log_edition_c95_sift_gaps.md` — track C95 outcomes
- **Steps:**
  1. Re-run engine audit against C94 ledger snapshot with v1.3.0 detector + new thresholds.
  2. Confirm INIT-001/002/005/006 drop from HIGH-band; remaining HIGH entries are genuine stuck cases.
  3. Live C95 verification: stuck-initiative editorial content count.
- **Verify:** C94 dry-run drops 4 HIGH; C95 edition does not lead with "Stab Fund still disbursing" or "Baylight still constructing."
- **Status:** [ ] not started

---

## Open questions

- [ ] Are phase-tenure values defined in code or in sheet config? If sheet config, Task 2 becomes a sheet edit instead of code change. (Task 1 confirms.)
- [ ] Does the engine support phase-skip (jump 2 phases when conditions warrant), or only sequential? (Task 3 dependency.)
- [ ] Does `effectsFiringPositively` need per-initiative thresholds, or is one global threshold sufficient? (Task 3 dependency — current direction: per-initiative threshold field, default 1.0× expected.)
- [ ] Do we keep the regulatory-friction *content surfaces* (HCAI, MOU, etc.) in the canon as flavor for occasional reference, or strip them entirely from initiative state? (Current direction: keep as occasional flavor in canon, strip from per-cycle phase modeling.)

---

## Changelog

- 2026-05-22 — Initial draft (S225, research-build). Filed under governance.13 Phase 2 cluster C13 row engine.20. Plan-level + engine-sheet implementation. Sequenced AFTER C2 (sift v2) Task 5 for the `covered-by-feature` triage handle.
- 2026-05-23 (S227, engine-sheet) — **Task 1 reversal.** Empirical answer to §Open Q #1: phase tenure is neither code nor sheet config — it is **emergent from voice-agent decision cadence**. No `phase15-initiative-engine/` exists. `phase05-citizens/civicInitiativeEngine.js` only auto-reschedules visioning→vote-ready; it does not advance ImplementationPhase. The only write path is voice agents → `scripts/assembleDecisions.js:314` → `scripts/applyTrackerUpdates.js` (sheet write). To advance phases faster, voice-agent RULES.md files (5 project agents) must propose phase changes when implementation effects fire positively. **Retargeted scope filed:** engine.20a shipped (Task 4 alone, engine-sheet, single commit) — `detectStuckInitiatives` v1.2→v1.3 with remedy-firing-aware severity downgrade. engine.20b refiled (Tasks 2+3, civic/research-build) — voice-agent RULES.md updates. engine.20c (Task 6, blocked on 20b). engine.20d (Task 5, blocked on pipeline.24 sift v2). Original engine.20 row replaced with the four scoped successors in ROLLOUT.
