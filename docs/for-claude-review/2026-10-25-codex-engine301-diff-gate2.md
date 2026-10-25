---
title: engine.301 F1 candidate diff gate 2
created: 2026-10-25
updated: 2026-10-25
type: reference
tags: [engine, draft]
sources:
  - docs/for-claude-review/2026-10-25-engine301-diff-gate2-TASK.md
  - docs/for-claude-review/2026-10-25-codex-engine301-diff-gate.md
  - docs/plans/2026-10-10-engine-214-mood-per-hood.md
---

# engine.301 F1 — Codex diff gate 2

Target: `1e6beff5`, reviewed as source against the gate-1 findings and the PROD two-file diff. **Final gate: HOLD** for the receipt/probe gaps below; bench results and PROD behavior were not inspected or verified. The running bench was untouched.

## 1. Gate-1 fold — code SHIP; tests SHIP as source; receipt FIX

- **SHIP — HIGH failure path.** `applyCityDynamics_` clears a pre-set map at entry and publishes the derived map only after the hood fold, filtered through the same `hoods` list used by the ladder (`phase02-world-state/applyCityDynamics.js:248-260,856-861,1301-1304,1866-1873`). The real wrapper now throws after derivation and checks Phase 9 carries no wave (`scripts/perHoodDynamics.test.js:445-470`). No test was rerun in this review.
- **SHIP — wave and prose.** A prior wave name must also have its own prior carried spike; the ledger prose says `last Cycle (to X)` and `rising two Cycles running (level 3)`, while `Magnitude` is the maximum ladder level (`applyCityDynamics.js:251-260,1578-1599`). Tests cover a bare wave name and a foreign hood (`perHoodDynamics.test.js:261-268`). The full 13-rise snapshot checks cap agreement (`:303-313`); T11 checks decoded dial nudges and a 1.5–3 draw ratio over 600 seeds (`scripts/engine299Graded.test.js:190-213`). These are local fixtures, not live handoff or frequency proof.
- **SHIP — several bench checks closed.** Receipt reads exactly one C and C−1 ring row, validates wave membership against **prior spikes**, HOLDs on Engine_Errors and missing/held window receipts, and accepts probe expectations (`output/engine-sheet/2026-10-25-e301-receipt.js:42-79,128-156`). The driver demands Fruitvale lines/wave and Baylight carry/wave (`2026-10-25-e301-bench.sh:37-51`); the halt trap reports the left-on-bench stage (`:29-30`); aim check refuses to overwrite a non-marker checkpoint (`2026-10-19-aimcheck.js:15-19`). The probe reads its ring blob back exactly (`2026-10-25-e301-probe.js:28-33`).
- **FIX — receipt still admits false PASS for a broken producer.** It merely reports pre-cap rises absent from the carried list and never checks the 12-strongest cap, carried magnitude, or `newValue` against the metric deltas (`e301-receipt.js:86-95,158-166`). With fewer than 12 rises, even an empty `crimeSpikes` can PASS unless a named probe expectation happens to catch it. Make uncapped missing/mismatched rises a HOLD; permit only correctly displaced rises past the cap.
- **FIX — “typed” is partial.** `isFinite(Number(s.magnitude))` accepts `null`, `""`, and numeric strings; the receipt does not bound the carried list to 12 or reject duplicate hood/metric spikes (`e301-receipt.js:48-56`). A parsed `null` blob throws before `finish()`, producing no HOLD-shaped receipt (`:46-48,137-158`). Require finite numeric fields, a valid object, and the compacted list contract before PASS.

## 2. New fold risks — map SHIP; producer probe FIX

- **SHIP — no intervening map reader.** Between deletion and publication, this function uses its local map for the ladder and receipt; the only other production readers found are Phase 5 and Phase 9, scheduled after CityDynamics (`applyCityDynamics.js:248-260,1301-1304,1578-1599,1873`; `phase01-config/godWorldEngine2.js:583,657,810`). Its canon loop and publish loop use the same `getCanonNeighborhoods_` result (`applyCityDynamics.js:856,1870-1873`). This is a source ordering finding, not a concurrent-run proof.
- **FIX — receipt canon proxy differs from source.** The code's canon list comes from Phase-1 `Neighborhood_Map` (`phase01-config/canonNeighborhoodLoader.js:392-402`); receipt treats every `Crime_Metrics` row as canon (`e301-receipt.js:70-79`). A missing or extra metrics row can hide or invent an expected level/receipt. Read the actual canon hood set or HOLD unless the two sets agree.
- **FIX — producer probe is not shift-only.** It lowers Baylight's observed `PropertyCrimeIndex` and leaves `PropertyLevel` (`2026-10-25-e301-probe.js:34-45`). Phase 2 reads prior `Neighborhood_Map.crimeIndex`, not this cell (`phase02-world-state/loadNeighborhoodState.js:113-123`); the hood crime bar also uses that state (`phase05-citizens/runNeighborhoodEngine.js:222-230`). Phase 3 reads the edited metrics, however, and computes citywide hotspot threshold and neighbor spillover from observed indices before deriving new metrics (`phase03-population/updateCrimeMetrics.js:140-143,232-260,827-863`). Thus leg P can alter C113 crime physics/context beyond the intended shift. Label it as an intervention and compare those deltas, or use a producer fixture whose side effects are bounded.
- **FIX — the probe's rise is not independently measured.** `Math.max(5, oldIdx - 10)` has no finite/at-least-5-change guard (`e301-probe.js:39-44`). For C113, the receipt compares final `Crime_Metrics` to the **unmodified** frozen baseline, not the post-probe prefire cell (`e301-receipt.js:80-90`); it may miss the very +5 shift that Phase 3 saw. Baylight `--expect-carry-wave` proves a carried name, not its delta or causal origin (`e301-bench.sh:42`; `e301-receipt.js:134`). Record and read back the post-probe C112 metric snapshot, then check the C113 shift, magnitude, and carry.

## 3. PROD readiness — HOLD pending corrected bench evidence

The two-file source change and focused assertions are reviewable, and the planned P consumer/prod path plus 25-Cycle S soak is the right division of reach versus rate (`docs/plans/2026-10-10-engine-214-mood-per-hood.md:329-340`; `e301-bench.sh:37-56`). Before PROD, the corrected receipt must PASS both legs with typed C/C−1 carry, observed producer delta and Phase-5 line, complete S window, zero Engine_Errors, and the stage-25 restore/manifest evidence. A zero-wave organic soak reports a measured rate for the builder; the probe only establishes reach. This review does not establish a deployed version, bench result, or live Cycle behavior.
