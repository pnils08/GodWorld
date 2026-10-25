---
title: Engine.306 diff gate 2 review
created: 2026-10-21
updated: 2026-10-21
type: reference
tags: [engine, business, review]
sources:
  - docs/research/2026-10-21-engine306-diff-gate2-TASK.md
---

# Engine.306 diff gate 2

**1. Status quota path — SHIP.** The processor now builds one contiguous Status column and writes it once (`scripts/processBusinessIntake.js:186-223`); the saved drill shows fresh and damaged-state recover receipts PASS after the halt-1 quota failure (`output/engine-sheet/2026-10-21-e306-drill.log:23-33,34-64`; `output/engine-sheet/2026-10-21-e306-intake-bench-halt1.log:114-118`).

**2. Landing driver — HOLD.** The pinned live ID matches the existing live constant; preflight rejects an env mismatch, and the child inherits the selected ID. Fresh staging reads every cell; recover requires `--recover` and never reruns the processor, so the demonstrated append/partial-Status failure does not double-append (`output/engine-sheet/2026-10-21-e306-intake.js:24-44,105-137`; `output/engine-sheet/2026-10-21-e306-target-preload.js:4-7`; `scripts/backdateCitizenDials.js:40`).
The untested `restage` gate checks row count/mark/D40 but neither original A:I preimage nor max active/normalized duplicates, and its receipt takes the *current* 180 rows as baseline: an intervening old-row edit can end in PASS (`output/engine-sheet/2026-10-21-e306-intake.js:83-86,157-162`). Final receipt checks intake Name/Status but not B:F provenance; live mapping accepts one correct tuple even alongside a conflicting duplicate bizId (`output/engine-sheet/2026-10-21-e306-intake.js:149-170`). Bind restage to the frozen preimage, then reject any duplicate mapping ID and read back each intake row A:G.

**3. Bench attribution — HOLD.** B C113 fired PASS with 284 ledger rows (103 staged plus one further birth), two new citizens assigned to new rows, and zero wrong-spot/stray lines (`output/engine-sheet/2026-10-21-e306-legB.log:31-42`; `output/engine-sheet/2026-10-21-e306-readers-B-c113.json:160-168,240-252`). A/B chaos targets differ; selection indexes the enlarged ledger, and the writer applies a separate ±10% draw to RetailVitality (`phase04-events/chaosCarsEngine.js:353-365`; `phase08-v3-chicago/v3NeighborhoodWriter.js:470,513`). The pair shows a delta, not the claimed decomposition into static ≤2.5% and dice: Downtown RetailVitality 11.56→12.87 while EventAttractiveness 6.23→4.32, and LifeHistory 2322→2290 (`output/engine-sheet/2026-10-21-e306-readers-A-c113.json:5-10,249-252`; `output/engine-sheet/2026-10-21-e306-readers-B-c113.json:5-10,256-260`). The postfire receipt counts the 104th row but does not identify it as “Varek Fellowship” (`output/engine-sheet/2026-10-21-e306-readers-B-c113.json:160-165`).

**Final — stage-18 PROD push SHIP; live landing HOLD.** The saved stage-18 manifest changes only `processAdvancementIntake.js` from stage 17, and the bench pullback matches it; the new deny term is inert on the saved live 180 before landing (`output/engine-sheet/stage17-e214c-rate.sha256:60`; `output/engine-sheet/stage18-e306.sha256:60`; `output/engine-sheet/2026-10-21-e306-legB.log:3-8`; `phase05-citizens/processAdvancementIntake.js:2208-2212`; `output/engine-sheet/2026-10-21-e306-preimage-live.json:1`). Recheck PROD preimage/manifest at push; resolve driver PASS gaps and get row-specific postfire/paired causal evidence before the separately authorized live write. No push or live write was made here.
