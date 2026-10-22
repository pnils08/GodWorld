---
title: Engine.307 diff gate 4 review
created: 2026-10-22
updated: 2026-10-22
type: reference
tags: [engine, business, review]
sources: [docs/research/2026-10-22-engine307-diff-gate4-TASK.md]
---

- **1. Team seat + carried — HOLD.** The fold bars `Manager, Oakland A's` and applies the same role bar to carried BIZ IDs (`phase05-citizens/runCareerEngine.js:103-111`; `phase05-citizens/processAdvancementIntake.js:1033-1042,1740-1760`; `scripts/mintEmployerPick.test.js:122-130`). But `Power Forward, Oakland Oaks` is a player title absent from the role regex: an adult intake with blank ClockMode defaults to ENGINE, matches the `Oakland Oaks` named rule, and can take BIZ-00074 when it has room; a carried BIZ-00074 also passes. The bar receives no athlete tags on either mint path (`phase05-citizens/processAdvancementIntake.js:741,1013-1045,1691,1706-1712,1740-1755`). The new tests do not cover this route.
- **2. Push race — SHIP for the narrowed gate.** The script verifies the fresh stage-19 preimage, constructs and hashes the four-file candidate against committed B10, checks the pinned deployment, then pulls back and hashes PROD against B10; a mismatch stops before DONE (`output/engine-sheet/2026-10-22-push-e307-prod.sh:19-33,54-70`). Its three typed Sheet snapshots detect persisted C113 or a held checkpoint, while an admitted but unpersisted fire can escape them (`output/engine-sheet/2026-10-22-push-e307-prod.sh:34-52,67-70`; `phase01-config/godWorldEngine2.js:277-344`). Under the task's starting-version premise, that residual runs stage 19 whole; this is a bounded push-safety verdict, not proof of which version ran C113 (`docs/research/2026-10-22-engine307-diff-gate4-TASK.md:8`).
- **3. Bench — SHIP as candidate evidence.** B10's deployed pull-back matched `stage19-e307-B10.sha256`; C113–C116 each returned PASS, each athlete guard passed, stage 19 was restored, and the log ends `exit 0` (`output/engine-sheet/2026-10-22-e307-bench-B10.log:3-7,38-56`). Direct read-only comparison of saved B10/B9 snapshots found 0 differing rows at C113–C116 (1055/1061/1068/1074); check payloads differ only in `label` and, from C114, `prev` (`output/engine-sheet/2026-10-22-e307-snap-B10-c113.json:1`; `output/engine-sheet/2026-10-22-e307-snap-B9-c113.json:1`; `output/engine-sheet/2026-10-22-e307-check-B10-c116.json:1`; `output/engine-sheet/2026-10-22-e307-check-B9-c116.json:1`).

**Final — HOLD for PROD.** Close the ENGINE `Power Forward, Oakland Oaks` named and carried routes before the push. No PROD push or live Cycle was performed in this review.
