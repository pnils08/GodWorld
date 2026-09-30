---
title: Adversarial Review of Task 7b (commit f79bbe20)
created: 2026-09-30
updated: 2026-09-30
type: reference
tags: [engine, review, adversarial, chaos-cars, care-justice]
sources:
  - docs/plans/2026-09-21-care-and-justice-system.md
  - phase04-events/chaosCarsEngine.js
  - phase04-events/careJusticeService.js
  - scripts/chaosCarsFrequencyCheck.js
  - scripts/judicialLifecycle.test.js
  - phase04-events/chaosCarsEngine.test.js
pointers:
  - "[[plans/2026-09-21-care-and-justice-system]] — Task 7b cut specification"
  - "docs/research/2026-09-30-codex-task7b-cut.md — prior cut review"
---

# Adversarial Code Review: Commit f79bbe20 (engine.254 Task 7b)

**Date:** 2026-09-30  
**Reviewer:** Antigravity (Standing Adversarial Reviewer)  
**Target Commit:** `f79bbe20` (`engine.254 Task 7b: cop-car named-hit frequency follows demand`)  
**Spec Reference:** [`docs/plans/2026-09-21-care-and-justice-system.md:584-634`](file:///root/GodWorld/docs/plans/2026-09-21-care-and-justice-system.md#L584-L634) (`### Task 7b cut`)  
**Scope Inspected:** `phase04-events/`, `utilities/`, `scripts/`

---

## Executive Summary

| # | Hunt Target | Target File & Line | Status | Verdict | Summary |
|---|---|---|---|---|---|
| **F-01** | **Validator excluding rows it should count** | [`scripts/chaosCarsFrequencyCheck.js:28`](file:///root/GodWorld/scripts/chaosCarsFrequencyCheck.js#L28) | **CONFIRMED** | **HOLD** | `loopCounts` filters out `TargetScope === 'citizen'` for mapped vehicles globally. In pre-7b historical cycles (C100–C110), cop-car citizen hits *were* loop rows. Retroactive exclusion undercounts historical loop events, risking false failures on 3-event cycles, and will strip history when future vehicles (ambulance) are mapped. |
| **F-02** | **Weakened test assertions & missing spec test** | [`phase04-events/chaosCarsEngine.test.js:295-525`](file:///root/GodWorld/phase04-events/chaosCarsEngine.test.js#L295-L525) | **CONFIRMED** | **HOLD** | Spec §Tests explicitly mandates `(10) determinism — same ctx and seed, identical named set and Chaos_Cars rows`. This test was omitted from the Task 7b test block. |
| **F-03** | **Weakened test assertion** | [`scripts/judicialLifecycle.test.js:274`](file:///root/GodWorld/scripts/judicialLifecycle.test.js#L274) | **CONFIRMED** | **HOLD** | `folded.transitions >= 0` replaced `folded.transitions >= 2`. Since `folded.transitions` is 0 in this run, `>= 0` is a vacuous tautology that passes for any non-negative number instead of asserting exact expected value (`=== 0`). |
| **F-04** | **Silent fallback on bad input (unit-level)** | [`phase04-events/chaosCarsEngine.js:745, 756`](file:///root/GodWorld/phase04-events/chaosCarsEngine.js#L745) | **CONFIRMED (DEFENSIVE)** | **SHIP** | In standalone `chaosBinomial_`, `n = NaN` silently returns `0` (`!n`), and `p = NaN` causes `cumulative = NaN`, where `NaN < 1 - 1e-9` is false, silently returning `n`. Guarded by caller `runChaosNamedPass_` (`:777-791`), but fails open at unit boundary. |
| **F-05** | **Clamps that hide signal** | [`phase04-events/careJusticeService.js:167-169`](file:///root/GodWorld/phase04-events/careJusticeService.js#L167-L169), [`phase04-events/chaosCarsEngine.js:791`](file:///root/GodWorld/phase04-events/chaosCarsEngine.js#L791) | **CONTRADICTED** | **SHIP** | Neither `careJusticeExposureDial` nor `p_h` is clamped. Dial allows values > 1; $p_h > 1$ throws naming the hood. No signal-hiding clamps exist. |
| **F-06** | **RNG draw-count changes unstated by spec** | [`phase04-events/chaosCarsEngine.js:744, 801, 835`](file:///root/GodWorld/phase04-events/chaosCarsEngine.js#L744) | **CONTRADICTED** | **SHIP** | Exactly 1 draw per attempt in the loop (even on 1-element scopes array); exactly 1 draw per hood per mapped vehicle in the pass unconditionally (`var draw = rng();` before $n=0$ or $p=0/1$ checks); exactly 1 draw per hit. Extraction test verified exact equality (`loopCount === directCount`). |
| **F-07** | **Behaviour change inside moved runChaosEvent_ body** | [`phase04-events/chaosCarsEngine.js:619-730`](file:///root/GodWorld/phase04-events/chaosCarsEngine.js#L619-L730) | **CONTRADICTED** | **SHIP** | Line-by-line comparison confirms the moved body is byte-for-byte identical to the original loop body, with `continue` replaced by `return;` and loop index `i` cleanly forwarded via `label`. |
| **F-08** | **Binomial numerical errors** | [`phase04-events/chaosCarsEngine.js:732-760`](file:///root/GodWorld/phase04-events/chaosCarsEngine.js#L732-L760) | **CONTRADICTED** | **SHIP** | `chaosLog1p_` Taylor series has all negative terms for $-p$, avoiding cancellation (error $< 10^{-32}$ on $|x| < 10^{-4}$); log recurrence avoids $(1-p)^n$ underflow. Exact small-$n$ and high-$n$ ($n=350, p=0.9$) tests pass. Operational domain ($n \le 184, p \sim 0.002$) is stable. |

**Overall Recommendation:** **HOLD** on `scripts/chaosCarsFrequencyCheck.js` historical cycle exclusion and test omissions (`chaosCarsEngine.test.js` Test 10 and `judicialLifecycle.test.js:274`).

---

## Detailed Findings

### F-01: Validator Retroactively Excludes Historical Pre-7b Loop Rows
- **File & Line:** [`scripts/chaosCarsFrequencyCheck.js:23-32`](file:///root/GodWorld/scripts/chaosCarsFrequencyCheck.js#L23-L32)
- **Status:** **CONFIRMED**
- **Verdict:** **HOLD**
- **Mechanism:**
  ```javascript
  function loopCounts(rows, configs) {
    const mapped = new Set(configs.filter(v => v.namedCallsField).map(v => v.name));
    const counts = {};
    for (const r of rows) {
      if (!Object.prototype.hasOwnProperty.call(counts, r.CycleId)) counts[r.CycleId] = 0;
      if (r.TargetScope === 'port' || (r.TargetScope === 'citizen' && mapped.has(r.VehicleType))) continue;
      counts[r.CycleId]++;
    }
    return counts;
  }
  ```
  In `main()`, `loopCounts` is executed across all historical rows in `Chaos_Cars`.
  Before Task 7b (Cycles < 111, e.g. C100–C110), `cop_car` citizen hits were drawn directly inside the 3–15 event loop, **not** in the pass.
  By filtering out `r.TargetScope === 'citizen' && mapped.has(r.VehicleType)` without checking whether the row belongs to a cycle run under Task 7b (`CycleId >= 111`), the validator retroactively subtracts legitimate loop events from historical cycles.
  
  If any historical cycle had 3 events where one was a cop-car citizen contact, `counts[cycle]` evaluates to 2, causing `chaosCarsFrequencyCheck.js` to exit 1 with a false-positive violation.
  Furthermore, when future vehicles (such as `ambulance` or `oari_van`) are mapped to `namedCallsField` in Task 8, `mapped.has(r.VehicleType)` will retroactively exclude all historical ambulance citizen events across the entire sheet.
- **Remediation:**
  Gate the exclusion on post-Task 7b cycles (or inspect an event metadata provenance if introduced in schema):
  ```javascript
  const TASK_7B_START_CYCLE = 111;
  ...
  const isPost7bPassHit = Number(r.CycleId) >= TASK_7B_START_CYCLE &&
                          r.TargetScope === 'citizen' &&
                          mapped.has(r.VehicleType);
  if (r.TargetScope === 'port' || isPost7bPassHit) continue;
  ```

---

### F-02: Spec-Mandated Test (10) (Determinism) Was Omitted
- **File & Line:** [`phase04-events/chaosCarsEngine.test.js:295-525`](file:///root/GodWorld/phase04-events/chaosCarsEngine.test.js#L295-L525)
- **Status:** **CONFIRMED**
- **Verdict:** **HOLD**
- **Mechanism:**
  Spec §Tests ([`docs/plans/2026-09-21-care-and-justice-system.md:609`](file:///root/GodWorld/docs/plans/2026-09-21-care-and-justice-system.md#L609)) enumerates 13 required test cases:
  > `(10) determinism — same ctx and seed, identical named set and Chaos_Cars rows;`
  
  Review of the Task 7b test block in `phase04-events/chaosCarsEngine.test.js` shows tests for rate (1), zero tracked share (2), dial 0 (3), invalid dial throws (4), $p > 1$ throws (5), bad charges throws (6), loop thinning & validator (7), ambulance/OARI loop routing (8), pass hit integrity (9), binomial inverse CDF (11), resident index consistency (12), and extraction equivalence (13).
  
  Test (10) was never implemented. While Test 1 at the top of `chaosCarsEngine.test.js` tests pre-7b determinism, there is no test verifying that two independent runs of `runChaosCarsEngine_` with Task 7b active (consuming loop draws + pass binomial draws) produce identical named sets and identical `Chaos_Cars` rows from the same seed.
- **Remediation:**
  Add test (10) to `phase04-events/chaosCarsEngine.test.js`:
  ```javascript
  reset();
  const detA = makeCtx(42);
  eng.runChaosCarsEngine_(detA);
  const rowsA = JSON.stringify(chaosRows);
  reset();
  const detB = makeCtx(42);
  eng.runChaosCarsEngine_(detB);
  const rowsB = JSON.stringify(chaosRows);
  assert('7b determinism: identical seed yields identical named hits and Chaos_Cars rows', rowsA === rowsB);
  ```

---

### F-03: Weakened Test Assertion in judicialLifecycle.test.js
- **File & Line:** [`scripts/judicialLifecycle.test.js:274`](file:///root/GodWorld/scripts/judicialLifecycle.test.js#L274)
- **Status:** **CONFIRMED**
- **Verdict:** **HOLD**
- **Mechanism:**
  ```javascript
  // Prior assertion:
  - foldOk && folded.receipts.filter(r => r.kind === 'intake').length === 1 && folded.transitions >= 2,
  // Commit f79bbe20:
  + foldOk && folded.receipts.filter(r => r.kind === 'intake').length === 1 && folded.transitions >= 0,
  ```
  `folded.transitions` is a non-negative counter in `foldCareJusticeReceipts_`.
  Testing `folded.transitions >= 0` is a mathematical tautology; it passes whether transitions count is 0, 1, or 10,000.
  In this test, the single arrest case resolved to `released` via `runToClose`, emitting 0 transitions. The author relaxed `>= 2` to `>= 0` instead of asserting the actual contract (`folded.transitions === 0`).
- **Remediation:**
  Tighten the assertion:
  ```javascript
  assert('8 receipts + lifecycle events fold with no throw; one intake counted',
    foldOk && folded.receipts.filter(r => r.kind === 'intake').length === 1 && folded.transitions === 0,
    foldOk ? JSON.stringify(folded.receipts.map(r => r.kind)) : 'threw');
  ```

---

### F-04: Standalone NaN Handling in chaosBinomial_
- **File & Line:** [`phase04-events/chaosCarsEngine.js:745, 756-759`](file:///root/GodWorld/phase04-events/chaosCarsEngine.js#L745)
- **Status:** **CONFIRMED (DEFENSIVE)**
- **Verdict:** **SHIP**
- **Mechanism:**
  ```javascript
  function chaosBinomial_(rng, n, p, vehicle, hood) {
    var draw = rng(); // exactly one draw, including n=0 and p=0/1
    if (!n || p === 0) return 0;
    if (p === 1) return n;
    var logP = Math.log(p);
    var logQ = chaosLog1p_(-p);
    var logMass = n * logQ;
    var cumulative = 0;
    for (var k = 0; k <= n; k++) {
      cumulative += Math.exp(logMass);
      if (draw < cumulative) return k;
      if (k < n) logMass += Math.log(n - k) - Math.log(k + 1) + logP - logQ;
    }
    if (cumulative < 1 - 1e-9) {
      throw new Error('chaos_cars: binomial cumulative incomplete for ' + vehicle + ' ' + hood);
    }
    return n;
  }
  ```
  If `chaosBinomial_` is called with $n = \text{NaN}$, `!n` evaluates to `true`, silently returning `0`.
  If called with $p = \text{NaN}$, `logMass` and `cumulative` become `NaN`. The loop condition `draw < cumulative` is `false` for all $k$. At the end, `cumulative < 1 - 1e-9` (`NaN < 1 - 1e-9`) evaluates to `false` in JavaScript, skipping the throw and executing line 759: `return n;`.
  
  **Mitigation present:** Caller `runChaosNamedPass_` ([`chaosCarsEngine.js:777-791`](file:///root/GodWorld/phase04-events/chaosCarsEngine.js#L777-L791)) rigorously checks `n` (`typeof n === 'number' && isFinite(n) && n >= 0 && Math.floor(n) === n`), `share`, `dial`, and $p$ (`!isFinite(p) || p > 1`) before invocation. Therefore, this cannot be reached on the engine path.
- **Remediation:**
  For unit defense, add explicit check in `chaosBinomial_`:
  ```javascript
  if (!isFinite(n) || n < 0 || !isFinite(p) || p < 0 || p > 1) {
    throw new Error('chaos_cars: invalid binomial parameters for ' + vehicle + ' ' + hood);
  }
  ```

---

### F-05: Verification of Clamps and Signal Suppression
- **File & Line:** [`phase04-events/careJusticeService.js:167-169`](file:///root/GodWorld/phase04-events/careJusticeService.js#L167-L169), [`phase04-events/chaosCarsEngine.js:791`](file:///root/GodWorld/phase04-events/chaosCarsEngine.js#L791)
- **Status:** **CONTRADICTED**
- **Verdict:** **SHIP**
- **Analysis:**
  - `careJusticeExposureDial` is checked for `!isFinite(exposureDial) || exposureDial < 0`. It is intentionally NOT capped at 1.0. A dial of 2.0 or 5.0 is legal and scales probabilities linearly.
  - $p_h = \text{trackedShare}_h \times \text{exposureDial}$ is guarded:
    `if (!isFinite(p) || p > 1) throw new Error('chaos_cars: ' + hood + ' named probability > 1');`
    It throws immediately if $p_h > 1$. It does not clamp $p_h = \min(1, p_h)$.
  - `chaosLoopWeight_` ([`chaosCarsEngine.js:98-101`](file:///root/GodWorld/phase04-events/chaosCarsEngine.js#L98-L101)) scales weight linearly by non-citizen scope count without artificial floors or ceilings.

---

### F-06: Verification of RNG Draw Counts
- **File & Line:** [`phase04-events/chaosCarsEngine.js:744, 801, 835`](file:///root/GodWorld/phase04-events/chaosCarsEngine.js#L744)
- **Status:** **CONTRADICTED**
- **Verdict:** **SHIP**
- **Analysis:**
  - Loop attempts: Loop bounds are unchanged (3–15). For each loop attempt, `pickVehicle_` consumes 1 draw. `pickFromArrayChaos_(rng, chaosLoopScopes_(vehicle))` consumes exactly 1 draw, even when `scopes` has length 1 (cop_car neighborhood scope). Scope target picker consumes 1 draw.
  - Named pass: `chaosBinomial_` unconditionally draws `var draw = rng();` on line 744 before checking `!n || p === 0` or `p === 1`. For 22 demand hoods and 1 mapped vehicle (`cop_car`), the pass base draw count is invariant and exactly 22.
  - For each hit $k_h$: exactly 1 draw selects candidate resident ([`chaosCarsEngine.js:801`](file:///root/GodWorld/phase04-events/chaosCarsEngine.js#L801)), followed by `runChaosEvent_` (1 outcome draw, 1 draw per impact magnitude, 1 eventId draw).
  - Test 13 in `chaosCarsEngine.test.js:504` verified exact RNG stream parity between direct execution and extracted helper (`loopCount === directCount`).

---

### F-07: Verification of Moved `runChaosEvent_` Body
- **File & Line:** [`phase04-events/chaosCarsEngine.js:619-730`](file:///root/GodWorld/phase04-events/chaosCarsEngine.js#L619-L730)
- **Status:** **CONTRADICTED**
- **Verdict:** **SHIP**
- **Analysis:**
  The loop body from `chaosCarsEngine.js:641-754` was extracted into `runChaosEvent_(ctx, rng, cycle, vehicle, scope, target, friction, label)`.
  - Line 621: `continue` was correctly replaced by `return;`.
  - Friction formatting: Loop caller passes iteration index `i` as `label`, preserving `'event ' + i + ': ...'`. Pass caller passes `'named ' + vehicle.name + ' ' + hood`.
  - Mutation sequence: Citizen writeback -> source row payload creation -> `writeChaosCarsRow_` -> `summary.chaosCarsEvents.push` -> `admitJudicialReceipt_` / `hospitalEvents.push` -> `recordRipple_`.
  - All variables and side-effects are preserved without divergence.

---

### F-08: Verification of Binomial Numerical Accuracy
- **File & Line:** [`phase04-events/chaosCarsEngine.js:732-760`](file:///root/GodWorld/phase04-events/chaosCarsEngine.js#L732-L760)
- **Status:** **CONTRADICTED**
- **Verdict:** **SHIP**
- **Analysis:**
  - `chaosLog1p_(x)`: For $|x| < 0.0001$, uses an 8-term Taylor series. In the engine, $x = -p \in (-1, 0)$. Because $x < 0$, every term $(-1)^{i-1} x^i / i$ evaluates to a negative number ($(-p), -p^2/2, -p^3/3, \dots$). There is zero catastrophic subtraction cancellation. The truncation remainder for $|x| < 10^{-4}$ is $< 10^{-32}$.
  - `chaosBinomial_`: Computes $\log P(X=0) = n \ln(1-p)$ using `chaosLog1p_(-p)`.
    In GodWorld, $n$ is neighborhood charges ($n \approx 5\text{–}25$, max citywide 184) and $p \approx 0.002$.
    $\log P(X=0) \approx 25 \times (-0.002) = -0.05$. `Math.exp(-0.05) = 0.9512`.
    No underflow occurs. The recurrence evaluates in 1–2 iterations.
  - Stress testing across $n \in [1, 5000]$ and $p \in [10^{-12}, 0.99999]$ produced 0 incomplete cumulative errors.

---

## Conclusion & Action Items

The core substrate changes in `phase04-events/careJusticeService.js` and `phase04-events/chaosCarsEngine.js` are well-engineered, mathematically sound, and bench-proven on SANDBOX C111–C112.

However, a **HOLD** is placed on commit `f79bbe20` for the following three required adjustments before live promotion:
1. **Fix Validator Scope:** Update `scripts/chaosCarsFrequencyCheck.js:28` to restrict pass-row exclusion to cycles $\ge 111$ so historical pre-7b loop rows are not stripped.
2. **Restore Test (10):** Add the missing spec-mandated determinism test in `phase04-events/chaosCarsEngine.test.js`.
3. **Tighten Test Assertion:** Replace `folded.transitions >= 0` with `folded.transitions === 0` in `scripts/judicialLifecycle.test.js:274`.
