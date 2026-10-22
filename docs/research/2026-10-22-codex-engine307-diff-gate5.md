---
title: Engine.307 diff gate 5 review
created: 2026-10-22
updated: 2026-10-22
type: reference
tags: [engine, business, review]
sources: [docs/research/2026-10-22-engine307-diff-gate5-TASK.md]
---

- **1. Mint — HOLD.** The new helper governs carried, named and field picks, and 5b.6f covers eight sports titles (`phase05-citizens/processAdvancementIntake.js:1033-1042,1741-1767`; `scripts/mintEmployerPick.test.js:129-135`). A hypothetical ENGINE title `Shooting Guard, Oakland Oaks (Sports)` still passes: `sportsHireBars_` catches `point guard` but not `shooting guard`; `roleSectorCategory_` falls through to `sectorCategory_`, whose `sports` match returns Small Business, so `roleFieldOf_` is non-null. The `Oakland Oaks` named rule can then place it at BIZ-00074 when room exists; a carried BIZ-00074 also passes (`phase05-citizens/runCareerEngine.js:91-96,103-113`; `phase05-citizens/generationalWealthEngine.js:859-878`; `phase05-citizens/educationCareerEngine.js:959-969`; `phase05-citizens/processAdvancementIntake.js:1691,1706-1712,1741-1762`). This is a reachable future intake shape, not a claim that this title exists in live rows.
- **2. Bench — SHIP as bounded evidence.** B11 pull-back matched its manifest; C113–C116 and athlete guards PASS; stage 19 restored; exit 0 (`output/engine-sheet/2026-10-22-e307-bench-B11.log:3-7,37-55`). Direct read-only comparison of B11/B10 saved snapshots found 0 differing rows at each Cycle (1055/1061/1068/1074); check payloads differ only in `label` and `prev` (`output/engine-sheet/2026-10-22-e307-snap-B11-c113.json:1`; `output/engine-sheet/2026-10-22-e307-snap-B10-c113.json:1`; `output/engine-sheet/2026-10-22-e307-check-B11-c116.json:1`; `output/engine-sheet/2026-10-22-e307-check-B10-c116.json:1`).
- **Final — HOLD for PROD.** Close the sports-title fallback classification route before the push. Gate-4 push verdict and bench method were not reopened; no PROD push or live Cycle was performed here.
