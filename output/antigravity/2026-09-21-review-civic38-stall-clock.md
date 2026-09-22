# Adversarial Review: Civic.38 Task 4 Step 3 — The Losing Clock

**Target Commit:** `7ba27e95` (civic.38 Task 4 step 3: the losing clock)  
**Live Target:** PROD @115 (clasp v102)  
**Reviewer:** `antigravity` (Engine-sheet builder-authorized adversarial review)  
**Repository State:** HEAD (`f30a6063`)  
**Date:** 2026-09-21  

---

## Executive Summary

Commit `7ba27e95` implements the "losing clock" mechanism for the civic initiative stage machine across two distinct clock regimes: a stage-change clock for `Funded` initiatives (limit `civicStageStallCycles` = 5), and an untended neglect clock for `Standing` and `Delivering` initiatives (limit `civicStageUntendedStallCycles` = 12). It introduces stall entry (`applyCivicStallEntry_`), once-per-stall revival (`applyCivicRevival_`), an explicit execution order (`revival → move → baseline → delivery → stall`), and gates legacy mechanisms (`applyEngineClockHold_`, `classifyInitiativeMotion_` silence, T7 Baylight phase corrections) away from staged rows.

The suite passes 224/224 tests (`node lib/initiativePhaseContract.test.js`). However, an adversarial code audit against the running engine reveals **two high-severity structural defects**, **two integration deadlocks**, and **three edge-case vulnerabilities** in state handling and timing. Most notably:
1. **The untended clock is completely inert for 6 of the 8 policy domains** because `stallClock` aborts on `req.blocked`, granting unplayable domains infinite immunity from neglect stalls.
2. **A stalled `Delivering` initiative revives directly back into `Delivering` on a single work move**, bypassing delivery verification and remaining an active service despite having collapsed from neglect.
3. **The T7 yield rule permanently deadlocks staged sports initiatives (Baylight)** in `construction-planning` because the Phase-5 stage handler contains no code to transition construction phases to `operational`.

---

## Ranked Findings by Consequence

---

### Finding 1 (CRITICAL): Blocked-Gate Immunity Neutralizes the Untended Losing Clock for 6 of 8 Policy Domains

* **Files & Lines:**
  * [`lib/initiativePhaseContract.js:635`](file:///root/GodWorld/lib/initiativePhaseContract.js#L635)
  * [`lib/initiativePhaseContract.js:354-365`](file:///root/GodWorld/lib/initiativePhaseContract.js#L354-L365)
  * [`phase05-citizens/civicInitiativeEngine.js:3710-3714`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3710-L3714)
  * [`docs/plans/2026-09-19-civic-wake-game-loop.md:383`](file:///root/GodWorld/docs/plans/2026-09-19-civic-wake-game-loop.md#L383) (Ruling 20)

#### Mechanism
In `lib/initiativePhaseContract.js:635`, `stallClock` evaluates gate readiness:
```javascript
if (inp.blocked) { out.reason = 'gate-' + String(inp.blocked); return out; }
```
When `applyCivicStallEntry_` runs in Phase 5 (`phase05-citizens/civicInitiativeEngine.js:3710`), it computes `req = civicStageRequirement_(...)` and passes `blocked: req ? req.blocked : null`.

For any row at stage `Standing`, `stageRequirement` (`lib/initiativePhaseContract.js:354-365`) evaluates domain playability and metric readers:
* `economic` (`playable: false`) $\rightarrow$ `out.blocked = 'no-delivering-gate'`
* `workforce` (`playable: false`) $\rightarrow$ `out.blocked = 'no-delivering-gate'`
* `sports` (`playable: false`) $\rightarrow$ `out.blocked = 'no-delivering-gate'`
* `safety` (`playable: false`) $\rightarrow$ `out.blocked = 'no-delivering-gate'`
* `housing` (`playable: false`) $\rightarrow$ `out.blocked = 'no-delivering-gate'`
* `transit` (`m.scope !== 'hood'`) $\rightarrow$ `out.blocked = 'no-delivering-reader'`

Because `inp.blocked` is truthy for **all six** of these domains, `stallClock` immediately exits with `out.stalled = false` and `out.reason = 'gate-no-delivering-gate'`.

#### Consequence
Ruling 3 originally specified *"no clock on an unbuilt exit"*, which made sense when the clock measured time elapsed toward delivery. But Ruling (e) and Ruling 20 converted the clock at `Standing` into an **untended neglect clock** (`LastWorkCycle` and `LastStageChangeCycle`). Neglect is a failure of ongoing maintenance by city officials, entirely orthogonal to whether the engine has coded a stage-3 metric reader.

As a direct consequence, **Standing initiatives in West Oakland (Stabilization Fund, economic), Fruitvale (OARI, safety), or any future housing initiative are 100% immune to the losing clock**. An administration can abandon OARI or the Stabilization Fund for 100 cycles without ever doing a work move. While upkeep decay will erode intensity to the 0.30 floor, the initiative will **never stall**, will **never incur the -2 approval penalty**, and will **never face failure motion**. Only `health` and `education` actually face the losing clock. This disables the core civic feedback loop for 75% of the policy catalog.

---

### Finding 2 (HIGH): Stalled `Delivering` Initiatives Revive Directly into `Delivering` Without Re-proving Delivery

* **Files & Lines:**
  * [`lib/initiativePhaseContract.js:581`](file:///root/GodWorld/lib/initiativePhaseContract.js#L581)
  * [`lib/initiativePhaseContract.js:681-692`](file:///root/GodWorld/lib/initiativePhaseContract.js#L681-L692)
  * [`phase05-citizens/civicInitiativeEngine.js:3700`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3700)
  * [`phase05-citizens/civicInitiativeEngine.js:3742-3768`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3742-L3768)

#### Mechanism
1. When an initiative at `Delivering` stalls due to neglect (`elapsed > 12`), `applyCivicStallEntry_` mutates `row[ix.phase] = 'stalled'` and records `hold.st = cycle`. In accordance with design ruling 22, **`row[ix.stage]` is untouched and remains `'Delivering'`**.
2. When a work move lands at cycle $N+1$, `applyCivicRevival_` restores `PriorPhase` (`'operational'`), clears `PriorPhase`, and resets `hold.st = 0`.
3. In the exact same fire, `applyCivicDeliveryStep_` runs. Because `row[ix.stage]` is still `'Delivering'`, it evaluates `civicDeliveryHoldStep_`.
4. In `civicDeliveryHoldStep_` (`lib/initiativePhaseContract.js:581`):
   ```javascript
   if ((state.obs && obs !== state.obs + 1) || ...) { next.up = 0; next.down = 0; }
   ```
   Because the initiative was stalled for at least one cycle (during which `obs` was not incremented), `obs !== state.obs + 1`. This resets `next.up = 0` and `next.down = 0`.
5. However, `res.verdict` only triggers `'regress'` if `down >= regressHoldCycles` (3). Here, `down` was just wiped to `0`. `res.verdict` is `null`.

#### Consequence
A program that collapsed from 13+ cycles of neglect—whose doors closed and whose service halted (`PHASE_INTENSITY = -0.5`)—**revives immediately into full `Delivering` status on a single work move**. It never regresses to `Standing`. It does not have to re-demonstrate delivery over a hold window. Furthermore, because its `down` counter was wiped to 0 upon revival, it requires **three brand new consecutive failing cycles** before it can ever be regressed to `Standing`. Stalled delivery programs receive an unearned free pass back to the top of the civic hierarchy.

---

### Finding 3 (HIGH): T7 Baylight Phase Yield Deadlocks Staged Stadium Initiatives in Construction

* **Files & Lines:**
  * [`phase02-world-state/applyInitiativeImplementationEffects.js:382-385`](file:///root/GodWorld/phase02-world-state/applyInitiativeImplementationEffects.js#L382-L385)
  * [`phase05-citizens/civicInitiativeEngine.js:3378-3388`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3378-L3388)

#### Mechanism
In Phase 2, `applyInitiativeImplementationEffects.js:382` enforces the single-owner rule:
```javascript
var t7Staged = iStage !== -1 && !!String(row[iStage] == null ? '' : row[iStage]).trim();
if (!t7Staged && isBaylightInitiative_(name) && sportsHasOpenedBaylight_(S)) {
  if (phase !== 'operational' && phase !== 'complete') {
    row[iPhase] = 'operational';
    ...
```
T7 completely yields if the row has any non-blank `Stage`. The comment notes: *"Baylight (INIT-006) converts unstaged and keeps this path."*

However, in Phase 5 (`civicInitiativeEngine.js:3378-3388`), `civicStageStep_` only updates `phase` on the `Funded -> Standing` transition:
```javascript
if (stage === 'Funded') {
  ...
  return { stage: 'Standing', lastStageChangeCycle: cycle, phase: CIVIC_STANDING_PHASE_, from: 'Funded' };
}
```
Once an initiative is `Standing` (e.g. if Baylight is converted as `Standing` in `construction-planning` per Task 4.4 and Ruling 288), `civicStageStep_` **never touches `phase` again**.

#### Consequence
If Baylight (INIT-006) is given a `Stage`, **it can never become `operational`**. When the Oaks play and the sports engine opens Baylight, T7 yields and does nothing. In Phase 5, the stage handler does not advance construction phases. Baylight remains trapped in `construction-planning` forever. Conversely, if Baylight is left unstaged, it escapes the losing clock, cannot receive project-director tending from Keisha Ramos, and breaks the universal stage architecture.

---

### Finding 4 (MEDIUM-HIGH): Dial Off-By-One Discrepancy (Strict `>` vs Human-Readable Contract)

* **Files & Lines:**
  * [`phase01-config/engine94SheetContract.js:134, 140`](file:///root/GodWorld/phase01-config/engine94SheetContract.js#L134)
  * [`lib/initiativePhaseContract.js:655`](file:///root/GodWorld/lib/initiativePhaseContract.js#L655)

#### Mechanism
In `phase01-config/engine94SheetContract.js`:
* Line 134: `civicStageStallCycles` (5) is defined as: *"Cycles a staged initiative may sit on one stage before the losing clock sets it stalled (builder: 4-5 to start)"*.
* Line 140: `civicStageUntendedStallCycles` (12) is defined as: *"Cycles UNTENDED a Standing/Delivering initiative may run before the losing clock sets it stalled"*.

In `lib/initiativePhaseContract.js:655`:
```javascript
out.elapsed = Math.max(0, cycle - out.reference);
out.stalled = out.elapsed > limit;
```
Because `out.stalled` evaluates `out.elapsed > limit` strictly:
* At `limit = 5`, when `elapsed = 5`, `5 > 5` is `false`. The initiative stalls only when `elapsed = 6`. It sits for **6 cycles**, not 5.
* At `limit = 12`, when `elapsed = 12`, `12 > 12` is `false`. The initiative stalls only when `elapsed = 13`. It sits untended for **13 cycles**, not 12.

#### Consequence
Line 136 of `engine94SheetContract.js` explicitly notes that 12 was chosen because the upkeep decay curve hits floor 0.30 at cycle 11 (grace 6 + 5 decay steps = 11). The builder intended for the service to stall immediately after being visibly rotted at the floor. With strict `>`, the service sits at floor 0.30 for cycle 11 and cycle 12 (two full cycles at minimum strength), stalling only on fire 13. While mathematically consistent with unit tests, it is an off-by-one deviation from the plain English specification of the dials.

---

### Finding 5 (MEDIUM): Blank `PriorPhase` Fallback Promotes Stalled Construction Sites to `operational`

* **Files & Lines:**
  * [`lib/initiativePhaseContract.js:690-692`](file:///root/GodWorld/lib/initiativePhaseContract.js#L690-L692)
  * [`phase05-citizens/civicInitiativeEngine.js:3716`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3716)

#### Mechanism
In `reviveDecision` (`lib/initiativePhaseContract.js:690-692`):
```javascript
var prior = String(inp.priorPhase == null ? '' : inp.priorPhase).trim();
if (!prior) prior = stage === 'Funded' ? 'vote-ready' : 'operational';
return { revive: true, phase: prior, reason: null };
```
In `applyCivicStallEntry_` (`phase05-citizens/civicInitiativeEngine.js:3716`):
```javascript
if (ix.priorPhase >= 0 && !String(cell(ix.priorPhase) || '').trim()) row[ix.priorPhase] = left;
```
If the `PriorPhase` header is missing (`ix.priorPhase < 0`), or if a dirty sheet row has a blank `PriorPhase`, `applyCivicRevival_` applies the fallback.

#### Consequence
If a `Standing` capital construction initiative (such as Temescal Community Health Center, INIT-005, which sits in `construction-planning` / `construction-active`) stalls and loses its `PriorPhase`, revival sets `phase = 'operational'`. A building site with unpoured concrete suddenly becomes a fully operational medical center without passing inspections or milestones.

---

### Finding 6 (MEDIUM): Same-Cycle Work Landed Before Fire Can Prematurely Revive Stalls

* **Files & Lines:**
  * [`lib/initiativePhaseContract.js:689`](file:///root/GodWorld/lib/initiativePhaseContract.js#L689)
  * [`phase05-citizens/civicInitiativeEngine.js:3720, 3748`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3720)

#### Mechanism
In `reviveDecision` (`lib/initiativePhaseContract.js:689`):
```javascript
if (!(work >= st)) return { revive: false, phase: null, reason: 'work-predates-stall' };
```
The comparison uses `>=`. The comment explains: *"the fold stamps the closing Cycle, and a stall decided at fire N leaves that week's work stamped N — it DID land after the stall"*.

However, if a bench run, manual test, or out-of-order execution stamps `LastWorkCycle = N` *before* fire $N$ runs:
1. Fire $N$ runs `applyCivicStageStep_`.
2. For a `Funded` row, `stallClock` checks `cycle - LastStageChangeCycle` (ignoring `LastWorkCycle`).
3. The row stalls at fire $N$, stamping `hold.st = N`.
4. At fire $N+1$, `applyCivicRevival_` evaluates `work (N) >= st (N)`. This evaluates to `true`.

#### Consequence
The initiative revives at fire $N+1$ without any official or director taking a work move during week $N+1$. Work that pre-dated the stall decision revives the stall, violating the *"once-per-stall, work after stall only"* principle.

---

### Finding 7 (LOW-MEDIUM): Double JSON Serialization of `StageHold` in a Single Fire

* **Files & Lines:**
  * [`phase05-citizens/civicInitiativeEngine.js:3451-3452`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3451-L3452)
  * [`phase05-citizens/civicInitiativeEngine.js:3677`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3677)
  * [`phase05-citizens/civicInitiativeEngine.js:3721`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3721)

#### Mechanism
In `applyCivicStageStep_`:
```javascript
if (applyCivicDeliveryStep_(ctx, row, ix, cycle)) changed = true;
if (applyCivicStallEntry_(ctx, row, ix, cycle)) changed = true;
```
If a `Delivering` row regresses and stalls in the same fire:
1. `applyCivicDeliveryStep_` reads `cell(ix.hold)`, computes `res.hold`, and writes `row[ix.hold] = JSON.stringify(res.hold)`.
2. `applyCivicStallEntry_` immediately reads `cell(ix.hold)` (parsing the string just written), mutates `hold.st = cycle`, and writes `row[ix.hold] = JSON.stringify(hold)`.

#### Consequence
While field preservation (`st` carried in `deliveryHoldStep`) currently prevents data loss, performing multiple independent parse-modify-stringify cycles on the same in-memory cell within sequential lines of code is brittle and introduces hidden ordering coupling between the delivery evaluator and the stall detector.

---

## Verification of Attack Vectors Summary Matrix

| Attack Vector | Vulnerable? | Primary Mechanism / Code Reference |
|---|---|---|
| **1. Stall/Revive Approval Farming** | **No (Defended)** | `classifyInitiativeMotion_` (`updateCivicApprovalRatings.js:1084-1097`) intercepts revival (`isFailing_(prevPhase) && !isFailing_(phase)`) and forces motion to `sitting` (0 delta), blocking `advanced` (+2). |
| **2. Stall/Revive Business Lift Farming** | **No (Defended)** | `applyInitiativeImplementationEffects.js:360` explicitly forces `phaseMoved = false` if `PHASE_INTENSITY[prevPhase] < 0`, blocking `advanced += 1`. |
| **3. Blocked Gate Immunity** | **YES (Defect)** | `lib/initiativePhaseContract.js:635` aborts `stallClock` on `inp.blocked`, granting non-playable and transit domains 100% immunity from neglect stalls. |
| **4. Delivering Revival Stage Preservation** | **YES (Defect)** | `civicInitiativeEngine.js:3700, 3742` leaves `Stage = 'Delivering'` during stall and revival, letting neglected programs wake up fully delivered without re-proving delivery. |
| **5. T7 Baylight Deadlock** | **YES (Defect)** | `applyInitiativeImplementationEffects.js:382` yields on any staged row, but Phase 5 has no code to transition construction phases to operational. |
| **6. Strict `>` Dial Drift** | **YES (Minor)** | `lib/initiativePhaseContract.js:655` uses `elapsed > limit`, causing initiatives to stall on cycle $N+1$ rather than cycle $N$. |
| **7. Fallback PriorPhase Promotion** | **YES (Risk)** | `lib/initiativePhaseContract.js:691` defaults blank/corrupted `Standing` prior phases to `operational`, bypassing construction phases. |
