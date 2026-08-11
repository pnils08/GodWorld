---
title: CareerStage canonical enum + role-coherent salary bands
created: 2026-08-11
updated: 2026-08-11
type: plan
tags: [engine, citizens, active]
sources:
  - output/salary_careerstage_audit_c103.md (S365 audit)
  - output/salary_audit_c103.json
pointers:
  - "[[2026-08-09-wealthlevel-networth-bands]] — the engine.103 pattern this repeats"
  - "[[../engine/ROLLOUT_PLAN]] — ledger-quality wave"
---

# CareerStage + salary coherence (S365, ledger-quality wave)

Pattern: audit → GodWorld-native derivation → engine fix + direct column write → bench confirm ([[2026-08-09-wealthlevel-networth-bands]]). Audit shipped: [salary_careerstage_audit_c103](../../output/salary_careerstage_audit_c103.md).

## Problem (verified C103 snapshot)

1. **Enum drift**: active citizens carry 9 CareerStage spellings + blanks (`entry`/`entry-level`, `mid`/`mid-career`, `early`/`early-career` synonym families). Readers matching one spelling miss the rest.
2. **Stage-vs-role lies**: 217/856 active marked `retired` (incl. the sitting Mayor and an active Cy Young candidate); 5 active pro athletes marked `student` (incl. a $24M ace).
3. **Salary-vs-role incoherence** (secondary): AI Safety Researcher median $32K (10 holders) with three at ~$300K; Oaks GM at $44K; one $208K plumber.

## Task 1 — canonical enum + normalizer (engine fix)

Canonical set: `student | entry | mid | senior | retired` (blank allowed only for citizens with no role).
Find the writers: `grep -rn "CareerStage" phase05-citizens/ phase04-events/` → normalize at every write site through one shared `normalizeCareerStage_()`; add a direct one-time column write that maps existing values (`entry-level`→`entry`, `mid-career`→`mid`, `early*`→`entry`).

## Task 2 — stage derivation from role+status (engine fix)

`deriveCareerStage_(citizen)`: Status retired/deceased → `retired`; enrolled + no role → `student`; else band by YearsInCareer (0–2 `entry`, 3–9 `mid`, 10+ `senior`), overriding any age-only heuristic. An active RoleType ALWAYS beats an age heuristic — that is the bug class (age>x → retired; age<22 → student) that mislabeled the Mayor and the ace. Locate the offending heuristic in `educationCareerEngine.js` / `runCareerEngine.js` before writing (measure twice).

## Task 3 — salary bands per role family (design-only this pass)

GodWorld-native role-family bands (no real-world import per [[../SIM_DOCTRINE]]): derive from the ledger's own healthy medians per role family; flag >6× deviations for per-citizen review rather than auto-clamping (athletes/executives legitimately spike; the Varek class is canon). Ship as report first, auto-write only after a cycle of observation.

## Acceptance

- Bench cycle fire: zero non-canonical CareerStage values; Mayor/athletes coherent; no `retired` under age 55 with an active RoleType unless HealthCause says so.
- Re-run the S365 audit script; counts for `retired_high_income` (61) and `student_high_income` (5) drop to sports-canon-consistent near-zero.
- Promotion engine still fires (checkForPromotions reads the new enum).

## State

Task 1–2 ready for bench; Task 3 design-only. Bench first, then prod push same session per no-code-ever-waits once proven.
