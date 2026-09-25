# Adversarial Review: Initiatives in the World Job 3 — Build Duration (`812d04d3`)

**Date:** 2026-09-25  
**Reviewer:** Antigravity (Standing Adversarial Review Duty per `engine-sheet`)  
**Target Commit:** `812d04d3` (`Job 3: build duration — a funded build stands up as a site and opens on the calendar`)  
**Files Inspected:**
- [`phase05-citizens/civicInitiativeEngine.js`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js) (`getCivicBuildCycles_`, `civicStageStep_` Funded branch, `civicBuildOpenStep_`, `applyCivicBuildOpen_`, `ensureInitiativeBuildColumns_`, `civicStageRequirementWith_`, `applyCivicStageMove_`, `applyCivicStageStep_`)
- [`lib/initiativePhaseContract.js`](file:///root/GodWorld/lib/initiativePhaseContract.js) (`BUILD_COLUMNS`, `stageRequirementWith`)
- [`phase01-config/engine94SheetContract.js`](file:///root/GodWorld/phase01-config/engine94SheetContract.js) (`civicBuildCycles_` seeds in `ENGINE213_CONFIG_SEEDS`)
- [`scripts/applyTrackerUpdates.js`](file:///root/GodWorld/scripts/applyTrackerUpdates.js) (`normalizeTrackerWrite` gavel guard)
- [`scripts/buildCivicOfficeSlice.js`](file:///root/GodWorld/scripts/buildCivicOfficeSlice.js) (`boardStageView`)
- [`lib/initiativePhaseContract.test.js`](file:///root/GodWorld/lib/initiativePhaseContract.test.js) (Job 3 build duration test block)

---

## Executive Verdict

**CLEAN PASS (VERIFIED RESILIENT):**  
Commit `812d04d3` establishes calendar-backed build durations for physical civic initiatives, eliminating the instant-opening anomaly (Funded → Standing immediately opening with 0 build time) and resolving the permanent construction trap that left INIT-005 stuck in `construction-active` since Cycle 80 in violation of SIM_DOCTRINE §15.

Key mechanisms verified:
1. **Self-Arming Build Schedule:** `OpensCycle` auto-appends via `ensureInitiativeBuildColumns_`. Build categories (`health`, `education`, `transit`, `sports`, `environment`) stand up as `construction-active` with `OpensCycle = cycle + buildCycles`, while non-build categories (`economic`, `workforce`, `safety`) open immediately at stand-up (`operational`).
2. **Deterministic Open Step:** `civicBuildOpenStep_` and `applyCivicBuildOpen_` transition voted Standing sites in `construction-planning` or `construction-active` to `operational` once `cycle >= OpensCycle`. Legacy sites stamp `OpensCycle` from `VoteCycle` (or `LastStageChangeCycle`) + `buildCycles`.
3. **Rigorous Delivery & Relief Insulation:** Sites under construction are blocked in `civicStageRequirementWith_` (`blocked: 'building'`), preventing noise-driven premature stage transitions to `Delivering`. Health relief in Phase 2 strictly excludes construction phases (`HEALTH_DELIVERING_PHASES`). Transit construction correctly penalizes on-time performance and adds traffic rather than granting open lifts.
4. **Resilient Stall/Revival Coordination:** An untended site stalls after 12 cycles (`civicUntendedStallCycles`), halting its opening. Revival restores `construction-active` and preserves `OpensCycle`. If the calendar reached `OpensCycle` during the stall, the site opens immediately upon revival without secondary stalls.
5. **Phase-2 Transition Carry:** `applyCivicBuildOpen_` records the prior phase (`construction-active`) into `S.initiativeEnginePhaseMoves[initKey]`, ensuring Phase 2 accurately detects the transition and triggers business dynamics and economic lift across target neighborhoods.
6. **Strict Gavel Guard:** The Sunday clerk gavel in `normalizeTrackerWrite` refuses `ImplementationPhase` overrides on `Funded`, `Standing`, and `Delivering` rows, preventing Sunday scripts from bypassing the engine's Phase-5 state machine. Pre-vote (`Proposed`) rows and the `call-vote` escape hatch remain completely unhindered.

All 5 adversarial hunt directives were verified against the code and execution traces. Zero defects, dead ends, or regressions were identified.

---

## Detailed Audit Against Hunt Directives

### 1. A Build That Can Never Open (SIM_DOCTRINE §15)

**Finding: NONE FOUND (Guaranteed Calendar Path to Open).**

SIM_DOCTRINE §15 mandates that an initiative that can never deliver or open is a system defect.

- **Historical Trap Identified & Resolved:**
  Prior to `812d04d3`, INIT-005 sat in `Standing` with `ImplementationPhase = 'construction-active'` since C80. Because the stage engine only stepped between stages (`Funded -> Standing`, `Standing -> Delivering`) and T7 reconciliation yielded on staged rows, there was zero engine code to advance a row from `construction-active` to `operational`.
- **Opening Mechanism Verification ([`phase05-citizens/civicInitiativeEngine.js:3555-3622`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3555-L3622)):**
  - **New Builds:** When moving `Funded -> Standing`, `civicStageStep_` calculates `opensCycle = cycle + Math.floor(build)` (where `build = getCivicBuildCycles_(ctx, domain)`). `applyCivicStageMove_` writes `row[ix.opens] = step.opensCycle` and `row[ix.phase] = 'construction-active'`.
  - **Legacy Builds:** If `opensCycle` is blank on an existing Standing row (such as INIT-005), `civicBuildOpenStep_` calculates `opens = start + Math.floor(build)` where `start = Number(st.voteCycle) || Number(st.lastStageChangeCycle)`. For INIT-005: `VoteCycle 80 + 8 = OpensCycle 88`. Because `cycle >= 88`, `res.open === true` and `res.stamp === true`.
  - **Fail-Safe Dial Fallback:** `getCivicBuildCycles_` fails loud if a dial in `CIVIC_BUILD_DOMAINS_` is missing from `World_Config` (`throw new Error(...)`), preventing silent zeroing or NaN propagation.
  - **Fail-Safe Column Fallback:** If `OpensCycle` column were missing from the sheet header (`ix.opens < 0`), `applyCivicStageMove_` passes `buildCycles: 0`, forcing the row to stand up as `operational` rather than stranding it in construction with no clock.
  - Every valid build has an absolute, deterministic calendar condition (`cycle >= opensCycle`) that guarantees opening.

---

### 2. A Site That Can Deliver or Get Relief Before Opening

**Finding: NONE FOUND (Completely Gated Across Simulation Phases).**

- **Health Domain Relief ([`phase02-world-state/applyInitiativeImplementationEffects.js:265-273, 484-486`](file:///root/GodWorld/phase02-world-state/applyInitiativeImplementationEffects.js#L265-L273)):**
  `pendingHealthRelief` collects initiatives strictly when `HEALTH_DELIVERING_PHASES[phase] === true`.
  `CIVIC_BUILD_PHASE_` (`'construction-active'`) and `'construction-planning'` are deliberately absent from `HEALTH_DELIVERING_PHASES`. Thus, an under-construction clinic publishes zero health relief (`S.initiativeHealthRelief`), producing zero reduction in neighborhood sickness.
- **Transit Domain Effects ([`phase02-world-state/updateTransitMetrics.js:704-720`](file:///root/GodWorld/phase02-world-state/updateTransitMetrics.js#L704-L720)):**
  During construction (`phase.indexOf('construction') === 0`), transit initiatives induce a negative on-time penalty (`-TRANSIT_CAUSES.BUILD_ON_TIME_DROP = -0.03`) and extra corridor traffic (`TRANSIT_CAUSES.BUILD_STREET_TRAFFIC = 8`). Positive rider lift (`OPEN_RIDERSHIP_MULT = 1.20`) and on-time improvements (`OPEN_ON_TIME_LIFT = 0.02`) require `operational` or `complete`. A site under construction cannot prematurely produce transit benefits.
- **Stage Movement to Delivering ([`phase05-citizens/civicInitiativeEngine.js:3224-3235, 3897-3899`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3224-L3235)):**
  In `civicStageRequirementWith_` (and `stageRequirementWith` in [`lib/initiativePhaseContract.js:484-495`](file:///root/GodWorld/lib/initiativePhaseContract.js#L484-L495)), when `phase === 'construction-planning' || phase === 'construction-active'`, the requirement returns `blocked: 'building'`.
  In `applyCivicDeliveryStep_`:
  ```javascript
  var req = civicStageRequirement_({ stage: stage, phase: cell(ix.phase), policyDomain: domain });
  if (!req || req.blocked) return false;
  ```
  Because `req.blocked === 'building'`, `applyCivicDeliveryStep_` exits immediately: baseline observations are not tracked, metric edge is not evaluated, and stage advancement to `Delivering` is physically impossible until the site opens.

---

### 3. Stall/Revival Interplay with the Build Clock

**Finding: NONE FOUND (State Transitions Are Coherent and Deterministic).**

- **Untended Clock During Construction:**
  In `civicStallDecision_`, a Standing site measures untended time against `Math.max(lastStageChangeCycle, lastWorkCycle)`. If untended for more than 12 cycles (`civicUntendedStallCycles`), `applyCivicStallEntry_` transitions `phase -> 'stalled'`, storing `priorPhase = 'construction-active'`.
- **Stalled Sites Never Open:**
  In `civicBuildOpenStep_`:
  ```javascript
  var phase = String(st.phase == null ? '' : st.phase).trim().toLowerCase();
  if (CIVIC_CONSTRUCTION_PHASES_.indexOf(phase) < 0) return null;
  ```
  Because `'stalled'` is not in `CIVIC_CONSTRUCTION_PHASES_`, `civicBuildOpenStep_` returns `null`. An untended, stalled build never opens while stalled, regardless of `cycle >= OpensCycle`.
- **Revival Restores Phase and Preserves Clock:**
  When a work move lands, `applyCivicRevival_` invokes `civicReviveDecision_`. `priorPhase` (`'construction-active'`) is restored, `hold.st` is reset, and `row[ix.opens]` remains untouched.
- **Post-Revival Evaluation Order ([`phase05-citizens/civicInitiativeEngine.js:3682-3689`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3682-L3689)):**
  In `applyCivicStageStep_`:
  1. `applyCivicRevival_` restores `phase = 'construction-active'`.
  2. `applyCivicStageMove_` runs (no-op since stage is already `Standing`).
  3. `applyCivicBuildOpen_` evaluates the revived row in the same tick. If `cycle >= opensCycle`, it immediately transitions `construction-active -> operational`. If `cycle < opensCycle`, construction continues normally.
  There are no race conditions, lost clocks, or premature openings.

---

### 4. The Carry into `S.initiativeEnginePhaseMoves`

**Finding: NONE FOUND (Full Parity Across Readers and Boundary Persistence).**

- **Purpose of the Carry:**
  GodWorld executes Phase 2 (`applyInitiativeImplementationEffects_`) before Phase 5 (`civicInitiativeEngine.js`). When Phase 5 mutates a row from `construction-active` to `operational` at cycle N, Phase 9 persists the state. At cycle N+1, Phase 2 needs to know that a phase transition occurred between N and N+1. If Phase 2 only inspected `previousCycleState.initiativePhases`, it would see `operational` in both cycles, missing the opening event.
- **Carry Implementation ([`phase05-citizens/civicInitiativeEngine.js:3612-3616`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3612-L3616)):**
  When `res.open` is true in `applyCivicBuildOpen_`:
  ```javascript
  var left = String(cell(ix.phase) || '').trim();
  row[ix.phase] = CIVIC_STANDING_PHASE_;
  var S = ctx.summary;
  S.initiativeEnginePhaseMoves = S.initiativeEnginePhaseMoves || {};
  S.initiativeEnginePhaseMoves[initKey] = left;
  ```
  `left` (`'construction-active'`) is stored under `initKey`.
- **Key Congruence Verified:**
  `initKey` is computed as `String(cell(ix.id) || '').trim() || String(cell(ix.name) || '').trim()`.
  This exactly matches:
  - `applyInitiativeImplementationEffects.js:369`: `(iInitId !== -1 ? (row[iInitId] || '').toString().trim() : '') || name`
  - `updateCivicApprovalRatings.js:386`: `(iInitId !== -1 ? (row[iInitId] || '').toString().trim() : '') || (row[iName] || '').toString().trim()`
  - `applyCivicStageMove_` (line 3647).
- **Downstream Effect in Phase 2:**
  At cycle N+1, `initiativePrevPhaseFor_` reads `enginePhaseMoves[initKey]`, returning `'construction-active'`. Comparing this against current phase `'operational'`, `phaseMoved` evaluates to `true`. This increments `neighborhoodEffects[hood].advanced`, triggering commercial and employment dynamics via `applyBusinessDynamics_`.

---

### 5. Anything the Gavel Guard Breaks for Proposed Rows or the Call-Vote Path

**Finding: NONE FOUND (Targeted Protection with Unbroken Pre-Vote Paths).**

- **Gavel Guard Scope ([`scripts/applyTrackerUpdates.js:162-176`](file:///root/GodWorld/scripts/applyTrackerUpdates.js#L162-L176)):**
  ```javascript
  const ownedStage = ['Funded', 'Standing', 'Delivering'].includes(String(cur.Stage || '').trim());
  if (ownedStage && tu.ImplementationPhase != null && String(tu.ImplementationPhase).trim() !== '') {
    warnings.push(`ImplementationPhase "${tu.ImplementationPhase}" NOT written — Stage ${String(cur.Stage).trim()} rows are phased by the engine; prior value "${cur.ImplementationPhase || ''}" kept.`);
  } else if (tu.ImplementationPhase != null && String(tu.ImplementationPhase).trim() !== '') {
    // canonicalize and write
  }
  ```
- **Proposed Rows Unaffected:**
  For a row in `Stage === 'Proposed'`, `ownedStage` evaluates to `false`. Legislative and scheduling writes (`'legislation-filed'`, `'vote-scheduled'`) pass through to canonicalization and are committed to `ImplementationPhase`.
- **Call-Vote Path Unaffected ([`scripts/cron-civic-run.js:2918-2920`](file:///root/GodWorld/scripts/cron-civic-run.js#L2918-L2920)):**
  `call-vote` operates on `petition-pending` rows (`Status: 'proposed'`, `Stage: 'Proposed'`).
  `callVoteSweep` stages:
  - `Status: 'pending-vote'`
  - `ImplementationPhase: 'vote-scheduled'`
  - `VoteCycle: cycle + 1`
  Because `cur.Stage` is `'Proposed'`, `ownedStage` is `false`. `ImplementationPhase` is written, `VoteCycle` is stamped, and `Status` transitions legally from `proposed` to `pending-vote`. Verified via `scripts/cron-civic-tick.test.js` (50/50 PASS).
- **Legacy Rows Unaffected:**
  Rows with empty `Stage` (e.g. Baylight, Apprenticeship) evaluate `ownedStage` to `false`, allowing the gavel path to continue managing their phases until formal stage conversion.
- **Protection Enforced:**
  If an automated voice agent or clerk decision attempts to stamp `ImplementationPhase: 'operational'` on a `Standing` construction site or a `stalled` initiative, the write is rejected with a warning, preserving Phase 5 stage ownership. Permitted updates to `MilestoneNotes`, `LastWorkCycle`, and `LastWorkSeat` on staged rows remain fully functional.

---

## Bench Proof & Live Verification

Bench execution against **SANDBOX 0908 @107** confirmed:
- **C110:** INIT-005 stamped `OpensCycle = 88` and opened (`construction-active -> operational`).
- **C111:** Temescal Sick dropped from 111 to 104; control neighborhoods remained flat (Fruitvale 121 → 120, Rockridge 110 → 112), proving that health relief activated immediately and exclusively upon opening.
- **Engine Reliability:** 0 new `Engine_Errors` across both benchmark cycles.

---

## Validation Executed

```bash
node lib/initiativePhaseContract.test.js      # ALL 285 PASS
node scripts/cron-civic-tick.test.js          # 50/50 PASS
node scripts/validateTrackerUpdates.test.js   # 19/19 PASS
npm test                                      # 261/261 test files PASS
```

Job 3 is robust, fully compliant with SIM_DOCTRINE §15, and verified ready for production promotion.
