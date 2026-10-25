---
title: Engine.306 diff gate review
created: 2026-10-21
updated: 2026-10-21
type: reference
tags: [engine, business, review]
sources:
  - docs/research/2026-10-21-engine306-diff-gate-TASK.md
---

# Engine.306 diff gate

**Scope:** Source and saved output only; no test, Sheet, bench, clasp, or deployment run in this review.

**1. Landmark owner door — SHIP.** Commit `2896c46c` adds `landmark` only to the sector deny regex; the five roster sectors carry it, and the test proves all five excluded while the unmarked bar and theaters enter (`phase05-citizens/processAdvancementIntake.js:2208-2212`; `output/engine306-mint-roster.tsv:6,18,23,28,93`; `scripts/ownerDoor.test.js:130-142`).
The suffix leaves original sector matches in career, business dynamics, economic seeds, and evening food; famous venues and contract backdrops do not read Sector (`phase05-citizens/runCareerEngine.js:75-92`; `phase05-citizens/applyBusinessDynamics.js:186-203`; `scripts/ingestPublishedEntities.js:866-881`; `phase07-evening-media/buildEveningFood.js:194-222`; `phase07-evening-media/buildEveningFamous.js:457-470`; `phase07-evening-media/buildContractSeeds.js:301-320`). Exact Tier-1 name matches in the saved live 180 have Key_Personnel or institution sectors; no additional owner-drawable Tier-1 name found (`docs/canon/INSTITUTIONS.md:37-42,72-76,100-108,172-179,203-220,318-333`; `output/engine-sheet/2026-10-21-e306-preimage-live.json:1`; `phase05-citizens/processAdvancementIntake.js:2256-2268`).

**2. Landing driver — HOLD.** Bench ID is pinned, but live ID comes from the environment and only the title is checked; a matching-title sheet can pass `--target live` (`output/engine-sheet/2026-10-21-e306-intake.js:22-40`). The preload points the child at that same ID (`output/engine-sheet/2026-10-21-e306-intake.js:88-90`; `output/engine-sheet/2026-10-21-e306-target-preload.js:1-7`).
The typed receipt checks new A:I rows, IDs, count, high water and realign, but counts promoted statuses without binding each intake row to its seed or assigned ID, does not compare the original 180 A:I postwrite, and omits the local mapping readback (`output/engine-sheet/2026-10-21-e306-intake.js:103-124`; `scripts/processBusinessIntake.js:222-238`). The staging readback checks only Name and Status (`output/engine-sheet/2026-10-21-e306-intake.js:82-86`).
The header's “rows absent → re-run safe” is not executable through this driver after tab creation: its preflight rejects any existing Business_Intake. The producer appends, advances high water, then writes 103 Status cells separately before the mapping file; failure can leave a committed ledger with partial statuses and stale mapping. A direct retry sees those names as duplicates, so recovery needs a row-specific procedure (`output/engine-sheet/2026-10-21-e306-intake.js:12-14,69-78`; `scripts/processBusinessIntake.js:122-150,169-238`).

**3. Bench — HOLD.** Leg B halted before C113 and produced no B reader/spot receipts (`output/engine-sheet/2026-10-21-e306-legB.sh:31-38`; `output/engine-sheet/2026-10-21-e306-legB.log:27-36`). The processor appended all 103 rows and set high water 289, then hit the Sheets per-user write quota during Status updates; saved receipt has 283 rows, 61/103 promoted, and BIZ-00039 still Downtown (`output/engine-sheet/2026-10-21-e306-intake-bench.log:112-118`; `output/engine-sheet/2026-10-21-e306-receipt-bench.json:3-33`). The planned readers cover some C113 outcomes but cannot establish unobserved spot pool mass or all downstream reader distributions (`output/engine-sheet/2026-10-21-e306-readers.js:19-55`; `output/engine-sheet/2026-10-21-e306-spots.js:89-92`).

**Final — HOLD for PROD deployment and live landing.** Repair the quota-prone Status path and row-specific recovery/receipt, pin live target identity, then obtain a completed B fire and paired receipts before the separately authorized PROD/live actions. The saved bench failure is evidence of a partial write, not a successful landing.
