---
title: Engine.307 diff gate 2 review
created: 2026-10-22
updated: 2026-10-22
type: reference
tags: [engine, business, review]
sources:
  - docs/research/2026-10-22-engine307-diff-gate2-TASK.md
---

# Engine.307 diff gate 2

**1. Athlete row — HOLD.** `sportsHireBars_` is pure and called before same-field, willing cross-field, civic-mover selection, and sports staff booking; GAME/override checks remain. The saved B8r POP-01058 has ENGINE, Tier 3, `basketball player`, `athlete` tag and no employer; the role/tag bar catches it. Gridiron analytics staff pass the helper fixture. Filtering itself consumes no RNG; changed candidate sets can change later draws when the bar fires (`phase05-citizens/runCareerEngine.js:99-110,431-444,1717-1725,1751-1759,1824-1834`; `output/engine-sheet/2026-10-22-e307-snap-B8r-c113.json:1`; `scripts/employerSuccess.test.js:193-200`).
The mint is a remaining sports hire path: an ENGINE-clock `Scout, Oakland A's` is placed at BIZ-00005 by an explicit test, while `sportsHireBars_` would reject that role from the employer book next Cycle. `Coach, Oakland A` and `Manager, Oakland A` have the same named mapping; mint checks GAME only. Reconcile the staff-versus-player rule at this entry point before calling it “never players/coaches” (`phase05-citizens/processAdvancementIntake.js:1683-1690,1734-1742`; `scripts/mintEmployerPick.test.js:118-120`; `phase05-citizens/runCareerEngine.js:103-109,443`).

**2. Carried mint — SHIP as pre-existing, not an engine.307 regression.** The parent already filled `statedById` regardless of field and accepted a carried BIZ_ID with room before `pickMintEmployer_`; the engine.307 change to this file is comments only. A carried GAME BIZ_ID still bypasses the GAME pick guard, so this is a separate existing absolute-guarantee gap (`d86cdaeb^:phase05-citizens/processAdvancementIntake.js:1026-1042,1617-1629`; `phase05-citizens/processAdvancementIntake.js:1026-1042`).

**3. Tests — HOLD.** The new helper/book checks cover player, athlete-tag, youth coach and analytics staff, and the matcher assertion finds all three source call sites; es reports a d86cdaeb mutant failure and 296/296, which this read-only review did not rerun. The matcher assertion tests source text rather than the real selection path, and the unchanged ENGINE Scout mint assertion now conflicts with the new bar. The Retail Clerk floor case is a valid old-behavior regression pin (`scripts/employerSuccess.test.js:178-200`; `scripts/mintEmployerPick.test.js:118-120`; `scripts/careerStage.test.js:211,220,238-239`).

**4. Bench — SHIP as bounded candidate evidence.** B7 and B8r each finish C113–C116 PASS; direct saved-snapshot comparison finds 0 differences in EmployerBizId, Income, ClockMode, EconomicProfileKey, Tier, RoleType or Status across 1055/1061/1068/1074 rows, excluding tags absent from B7 snapshots. B8r matches B8's manifest, C113 LifeHistory hash matches B7, career counts match each Cycle, and no sports hire or athlete move appears. B7p/B8p both hire the tagged non-athlete POP-00972 at the A's. B8 C114 HALT is a second stale GET after the first completed (counter and Riley both 114, FireGuard refused); B8r supplies the clean four-Cycle rerun. Zero observed sports hires in the unprobed leg does not exercise the new bar (`output/engine-sheet/2026-10-22-e307-bench.log:37-55`; `output/engine-sheet/2026-10-22-e307-bench-B8.log:37-73`; `output/engine-sheet/2026-10-22-e307-bench-B8r.log:37-55`; `output/engine-sheet/2026-10-22-e307-check-B8p-c113.json:5-32`).

**5. PROD push — HOLD.** A fresh PROD pull is required to equal stage 19, all four parent files are checked, the built tree must equal the committed B8 manifest, and deploy/pullback are checked (`output/engine-sheet/2026-10-22-push-e307-prod.sh:13-29,42-54`). The only pre-C113 test reads Neighborhood_Map Cycle 112 once, before `clasp push` and deploy; C113 may start or finish between that read and deployment, and the script does not check World_Config cycleCount or the fire admission/checkpoint state. The same map can remain at 112 during an admitted or partially persisted C113 (`output/engine-sheet/2026-10-22-push-e307-prod.sh:30-46`; `phase01-config/godWorldEngine2.js:277-325,824-866`). A passing preflight is therefore not proof the deployment lands before C113.

**Final — HOLD for PROD.** Align mint placement with the player/coach bar and close the deploy/fire race, then rerun the affected focused proof. No PROD push or live Cycle was performed in this review.
