---
title: Engine.307 diff gate 8 review
created: 2026-10-22
updated: 2026-10-22
type: reference
tags: [engine, business, review]
sources: [docs/research/2026-10-22-engine307-diff-gate8-TASK.md]
---
- **1. Clock case — HOLD.** `GAME`/`Game` now leave both hire pools and `center` is barred at sports orgs (`phase05-citizens/runCareerEngine.js:103-114,1610-1612,1648-1653`; `scripts/careerEngineReach.test.js:289-305`). But the pools exclude only GAME: an Active, tagged, jobless `CIVIC` or `MEDIA` row with a civilian RoleType still enters the unemployed pool, and an employed one can enter civic movers. The sports candidate filters then accept that role; the employer book itself requires ENGINE, revealing the boundary mismatch. This non-ENGINE hire route is distinct from the accepted residual about an ENGINE player's missing word; no current B14 non-ENGINE tagged jobless row was found (`phase05-citizens/runCareerEngine.js:442-448,1605-1626,1648-1664,1722-1729,1756-1764,1833-1838`; `output/engine-sheet/2026-10-22-e307-snap-B14-c113.json:1`).
- **2. Complete Cycle receipt — SHIP as bounded bench evidence.** B14 pull-back matched its manifest, C113–C116 all returned PASS in one run with athlete guards PASS, stage 19 was restored, and the log ended exit 0 (`output/engine-sheet/2026-10-22-e307-bench-B14.log:3-7,37-55`). Direct comparison of B14/B13 saved snapshots found zero differing rows at each Cycle (1055/1061/1068/1074); check payloads differ only in `label` and `prev` (`output/engine-sheet/2026-10-22-e307-snap-B14-c116.json:1`; `output/engine-sheet/2026-10-22-e307-snap-B13-c116.json:1`; `output/engine-sheet/2026-10-22-e307-check-B14-c116.json:1`; `output/engine-sheet/2026-10-22-e307-check-B13-c116.json:1`).
- **Final — HOLD for PROD.** Restrict both hiring pools to ENGINE before the sports-employer push. Mint, push and bench method verdicts from earlier gates were not reopened; no PROD push or live Cycle was performed here.
