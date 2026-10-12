# Adversarial Review: Commit 75c72f6d — Six-Row Legacy Initiative Conversion

**Target Commit:** `75c72f6d` (civic.38 Task 4 step 4: six-row legacy conversion table + pure conversion in the contract lib)  
**Author:** `engine-sheet`  
**Reviewer:** `antigravity` (Standing review duty, civic.38/.39)  
**Repository State:** HEAD (`75c72f6d`)  
**Date:** 2026-09-22  

---

## Executive Summary

Commit `75c72f6d` implements the pure conversion logic and mapping table (`LEGACY_STAGE_CONVERSION` and `legacyStageConversion(row, cycle)`) in `lib/initiativePhaseContract.js` to convert the six legacy initiatives on the `Initiative_Tracker` into the new stage machine architecture (civic.38 Task 4 step 4).

The conversion maps the live simulation ledger rows as follows:
1. **`INIT-001` (West Oakland Stabilization Fund):** `Stage: Standing`, `LastStageChangeCycle: C108`. Backdates `MayoralAction: signed` at `VoteCycle: 78` (pre-v1.7 mayoral action step).
2. **`INIT-002` (Oakland Alternative Response Initiative - OARI):** `Stage: Standing`, `LastStageChangeCycle: C108`. Already signed at C82.
3. **`INIT-003` (Fruitvale Transit Village Expansion):** `Stage: Proposed`, `Status: proposed`, `VoteCycle: ''`. Retains prior milestone history (`VoteCycle 94, Outcome COMPLETED, Status visioning-complete`) in `MilestoneNotes`. This **directly unblocks the `call-vote` escape hatch** implemented in commit `51fdee28`.
4. **`INIT-005` (Temescal Health Center):** `Stage: Standing`, `LastStageChangeCycle: C108`. Backdates `MayoralAction: signed` at `VoteCycle: 80`.
5. **`INIT-006` (Baylight Stadium District):** `Stage: null` (unstaged). Left unstaged under ruling 24 because sports is non-playable and the Phase-2 construction handler (engine.131 T7) yields on staged rows.
6. **`INIT-007` (Youth Apprenticeship Program):** `Stage: null` (unstaged). `announced` without a council vote; stage operations gate on passed+signed.

The suite passes 247/247 unit tests in `lib/initiativePhaseContract.test.js`, and the full civic game suite passes 54/54 (`scripts/cron-civic-game.test.js`).

---

## Ranked Findings & Architectural Analysis

---

### Finding 1 (HIGH): Intermediate Missing-Baseline State in Datawake Displays Prior to Engine Fire

* **Files & Lines:**
  * [`lib/initiativePhaseContract.js:321`](file:///root/GodWorld/lib/initiativePhaseContract.js#L321)
  * [`scripts/buildCivicOfficeSlice.js:806`](file:///root/GodWorld/scripts/buildCivicOfficeSlice.js#L806)
  * [`scripts/civicStageEvidence.js:48`](file:///root/GodWorld/scripts/civicStageEvidence.js#L48)

#### Mechanism
`legacyStageConversion` converts `INIT-005` (Temescal Health Center) to `Stage: Standing` and `LastStageChangeCycle: 108`. It intentionally leaves `StageBaseline` blank on the tracker, relying on the engine applier (`applyCivicStageBaseline_`) to stamp a conversion baseline during the next live engine cycle fire (Ruling 12).

However, if a datawake runs in the window between the conversion write and the Sunday engine fire:
1. `boardStageView()` evaluates `stageRequirement({ stage: 'Standing', policyDomain: 'health', ... })`.
2. Because `health` is playable, it calls `civicStageEvidence.measureStageMovement(row, context)`.
3. In `measureStageMovement`, the function checks for `StageBaseline`. Seeing a blank or missing baseline, it reports `{ available: false, reason: 'missing-stage-baseline' }`.
4. The councilmember's board block will display:
   `- INIT-005 Temescal Health Center [construction-active] — Standing — next-stage requirements unavailable: missing-stage-baseline`

#### Consequence
During the interim period before the next engine fire stamps `StageBaseline`, council seats viewing `INIT-005` on their board will receive a temporary telemetry warning (`missing-stage-baseline`). This resolves automatically once the engine fire runs and stamps the baseline.

---

### Finding 2 (MEDIUM): `INIT-003` Retains Historical `ImplementationPhase: 'design-phase'` at `Status: 'proposed'`

* **Files & Lines:**
  * [`lib/initiativePhaseContract.js:332-340`](file:///root/GodWorld/lib/initiativePhaseContract.js#L332-L340)
  * [`lib/initiativePhaseContract.test.js:616`](file:///root/GodWorld/lib/initiativePhaseContract.test.js#L616)

#### Mechanism
When converting `INIT-003`, `legacyStageConversion` updates:
- `Stage = 'Proposed'`
- `Status = 'proposed'`
- `VoteCycle = ''`
It explicitly leaves `ImplementationPhase: 'design-phase'` intact (as verified by test assertion line 616: `!('ImplementationPhase' in u3)`).

#### Consequence
Standard proposed initiatives typically exist in `announced` or `legislation-filed` phase. Having `Status: 'proposed'` combined with `ImplementationPhase: 'design-phase'` represents a novel hybrid state.
- **Stage Progression:** In `lib/initiativePhaseContract.js:405-409`, `stageRequirement` for `stage === 'Proposed'` evaluates only the `stage` (returning `next: 'Funded'`), so the state machine will cleanly advance to `Funded` upon passage regardless of `ImplementationPhase`.
- **Cosmetic / Reporting Drift:** Reports or queries expecting `Status === 'proposed'` to only map to pre-implementation phases will see an active project phase. This is an intentional compromise to preserve Fruitvale's genuine design work history on the transit hub rather than erasing it.

---

### Finding 3 (NOTE - VERIFIED SAFE): Fail-Closed Guards and Idempotency

* **Fail-Closed on Unlisted Rows:**
  `if (!rule) throw new Error('legacyStageConversion: no ruling for ' + (id || '(blank InitiativeID)'));`
  Ensures that if an unexpected row appears on the tracker, the conversion script fails loudly rather than making unauthorized assumptions.
* **Strict Idempotency:**
  `if (currentStage) return null;`
  Guarantees that re-running the conversion against an already-converted sheet produces zero writes, preventing duplicate milestone notes or churn.
* **Mayoral Action Validation:**
  For `INIT-001` and `INIT-005`, the code strictly validates `Number.isInteger(voteCycle) && voteCycle >= 1` before backdating mayoral signature, ensuring synthetic dates are never introduced.

---

## Conclusion & Next Actions

Commit `75c72f6d` successfully establishes the conversion logic in the shared contract library and cleanly passes all 247 contract tests and 54 game suite tests.

Once the bench fire C123 confirms the live readback of the stage transition and baseline stamping, the conversion script can safely be executed against the production `Initiative_Tracker`.
