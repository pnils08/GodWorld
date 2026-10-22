---
title: Engine.307 diff gate 3 review
created: 2026-10-22
updated: 2026-10-22
type: reference
tags: [engine, business, review]
sources:
  - docs/research/2026-10-22-engine307-diff-gate3-TASK.md
---

# Engine.307 diff gate 3

**1. Mint — HOLD.** The named and field picks now call `sportsHireBars_`, so ENGINE Scout/Coach are rejected and a marketing title passes; the carried BIZ_ID route still bypasses that bar, as it did before engine.307 (`phase05-citizens/processAdvancementIntake.js:1026-1042,1614-1631,1736-1754`; `scripts/mintEmployerPick.test.js:118-123`). More directly, `Manager, Oakland A` remains a named BIZ-00005 rule and `manager` is absent from the bar regex: a new adult intake with that RoleType and blank ClockMode defaults to ENGINE and reaches the named pick when room exists. The reported current GAME team seats and empty Generic_Citizens team occupations do not close this reachable intake path; “named top seats stay authored” remains unproved (`phase05-citizens/processAdvancementIntake.js:739-741,1013-1045,1684-1685,1737-1745`; `phase05-citizens/runCareerEngine.js:103-109`; `docs/plans/2026-10-10-engine-214-mood-per-hood.md:247`).

**2. Tests — HOLD.** The new real `runCareerEngine_` fixture proves a clerk and guard hire while the poorer player, coach and GAME rows do not; the mint tests cover Scout/Coach, staff named pick and a player role with a field. Their reported parent/mutant failures and 296/296 were not rerun here. No assertion covers the reachable ENGINE `Manager, Oakland A` named pick or the carried BIZ_ID bypass (`scripts/careerEngineReach.test.js:281-305`; `scripts/mintEmployerPick.test.js:118-123`; `phase05-citizens/processAdvancementIntake.js:1026-1042,1684-1685`).

**3. Push race — HOLD.** `fire_state` fail-closes on three read snapshots of cycleCount, all hood Cycles, Riley last Cycle and checkpoint A1, and the tree/manifest/pinned-deployment/pullback checks bind the deployed files to B9 (`output/engine-sheet/2026-10-22-push-e307-prod.sh:19-33,34-70`; `phase10-persistence/cycleCheckpoint.js:24-25,220-230`). Yet fire admission is a script property written before those Sheet signals; a C113 already admitted but running, failed before persistence, or still running after 480 seconds can pass every snapshot. The 224-second longest bench fire is an observed duration, not an exclusive fire lock or upper bound. The script may write DONE while that admission exists, so it cannot prove deployment preceded C113 (`phase01-config/godWorldEngine2.js:277-325,375-409`; `output/engine-sheet/2026-10-22-push-e307-prod.sh:52-70`).

**4. Bench — SHIP as bounded candidate evidence.** B9 C113/C114 PASS; the C115 attempt stopped at checkpoint pre-read (`nonJSON 500`) before the fire GET, with bench/Riley still 114, then the resume passed C115/C116 and restored stage 19. Direct comparison of saved B9 to B8r finds zero differing rows and matching checks at C113–C116 (1055/1061/1068/1074 rows); all athlete guards pass. This supports the candidate's measured behavior, not the unexercised Manager path or PROD timing (`output/engine-sheet/2026-10-22-e307-bench-B9.log:37-59`; `output/engine-sheet/2026-10-22-e307-bench-B9-resume.log:1-12`; `output/engine-sheet/2026-10-22-e307-check-B9-c116.json:1-29`; `output/engine-sheet/2026-10-22-e307-check-B8r-c116.json:1-29`; `output/engine-sheet/2026-10-19-benchfire.js:36-44`).

**Final — HOLD for PROD.** Close the named Manager and carried-mint paths under the authored-seat/player rule, and use an exclusive fire gate or typed admission readback before claiming a pre-C113 landing. No PROD push or live Cycle was performed here.
