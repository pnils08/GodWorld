---
title: engine.276 Adversarial Diff Review
created: 2026-10-02
updated: 2026-10-02
type: reference
tags: [engine, active]
sources:
  - docs/plans/2026-09-21-care-and-justice-system.md §engine.276 cut
  - git diff 7c76cd33..d8e2fc2c
pointers:
  - "[[../plans/2026-09-21-care-and-justice-system]] — owning cut"
---

# Review of engine.276 diff

(1) `processMoneyLoop_` never writes a `DebtLevel` above 6 on any path (lean, job loss, shock) and never a negative `NetWorth`:
**PASS**
- Evidence: `phase05-citizens/generationalWealthEngine.js:437, 462, 476` (every `debt++` checks `debt < DEBT_TOP` where `DEBT_TOP = 6`). Net worth bounds are enforced at `418`, `443`, `473`, `506` (`Math.max(0, ...)` or assignment to 0).

(2) the lean cannot raise debt for a citizen at or over the line unless the household is in crisis, and cannot lower it under the line:
**PASS**
- Evidence: `phase05-citizens/generationalWealthEngine.js:337-341` (`debtLean_` returns `dir: -1` if `ratio >= 1` unless crisis, and `dir: 1` if `ratio < 1`).

(3) rng draw order per row matches the comment block exactly (lean, shock, shock amount, default) and no branch skips or adds a draw:
**PASS**
- Evidence: `phase05-citizens/generationalWealthEngine.js:436, 467, 469/481, 504`. The default draw uses `rng()` inside a short-circuit AND, fulfilling the condition "only at the top, off the GAME clock, with debtDefaultCycles > 0".

(4) the default writes DebtLevel 1, NetWorth 0, DialState.debtDefault {l,n}, WealthLevel, one life line, one DEBT_DEFAULT hook, and GAME ClockMode never defaults:
**PASS**
- Evidence: `phase05-citizens/generationalWealthEngine.js:503-515`. `DEBT_DEFAULT_RESET = 1`, net worth set to 0, `noteDebtDefault_` called, `WealthLevel` re-derived, line/hook assigned, and `iClock !== 'GAME'` gate applied.

(5) debtDefault survives deserialize_ plus BOTH serialize_ and serializeDialState_, and no other DialState writer in phase*/ or utilities/ drops it (list every writer you checked):
**PASS**
- Evidence: `utilities/citizenMemory.js:251, 267`, `utilities/compressLifeHistory.js:1306`. Checked other `DialState` writers: `chaosCarsEngine.js` (uses `serializeDialState_`), `compressLifeHistory.js` (uses `serializeDialState_`), `citizenMemory.js` (uses `serialize_`), `generationalWealthEngine.js` (parses and stringifies), `maneuverEngine.js` (parses and stringifies), `citizenDialMap.js` (parses and stringifies).

(6) trackHomeOwnership_ skips a marked household before its rng draw and the window is exactly debtDefaultMarkCycles:
**PASS**
- Evidence: `phase05-citizens/generationalWealthEngine.js:1807, 1845, 1851`. Checked against `markCycles`.

(7) S.jobLosses is written by every job-loss path and read with the right Cycle and POPID form:
**PASS**
- Evidence: `phase05-citizens/runCareerEngine.js:235-238` writes `{POPID: cycle}`. Read at `phase05-citizens/generationalWealthEngine.js:460-462`. `careerRecordLayoff_` covers all job-loss paths.

(8) the life-line selection can never write 'last debt cleared' while DebtLevel ends above 0, and hook types match their lines:
**PASS**
- Evidence: `phase05-citizens/generationalWealthEngine.js:490-497`. The "cleared" line requires `debt === 0 && debtBefore > 0`. If `debt` ends above 0, it falls into the first or third branch. Hooks match their lines.

(9) ensureEngine276Config_ runs before Phase1-LoadConfig at every entry point and a missing key throws:
**PASS**
- Evidence: `phase01-config/godWorldEngine2.js:461` runs self-arm before Phase1-LoadConfig. `phase05-citizens/generationalWealthEngine.js:328` throws if key is missing during loop execution.

(10) scripts/debtLean.test.js: name any assert that would still pass if the behaviour it names were broken. Also list anything else wrong:
- Assert 1.9 claims the multiple moves the line, but passes 40k net worth against both 100k and 50k lines. Since 40k is under both, it would still pass (lean up) if the multiple were ignored.
- Assert 6.1 claims "no cost" for a promotion, but uses `nw: 0`. Since `Math.max(0, nw - cost)` bounds at 0, it would still pass (leave `nw` at 0) even if the payoff cost was incorrectly charged.
- Test 9.5 is missing from the numbering sequence.

**Result: SHIP**
