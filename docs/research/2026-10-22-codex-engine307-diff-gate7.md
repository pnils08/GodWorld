---
title: Engine.307 diff gate 7 review
created: 2026-10-22
updated: 2026-10-22
type: reference
tags: [engine, business, review]
sources: [docs/research/2026-10-22-engine307-diff-gate7-TASK.md]
---

- **1. Mint — SHIP for the stated stage-19 scope.** Against `d86cdaeb^`, the only executable mint-file difference is the sports-sector exclusion from `byField`/`fieldById`; the same regex was the stage-19 `sectorCategory_` first return. Named and field picks therefore cannot select a sports org, while the capacity-checked carried BIZ branch remains as it was; the role-map sports-word stop restores the stage-19 result for role text (`phase05-citizens/processAdvancementIntake.js:1026-1042,1599-1633,1731-1754`; `phase05-citizens/runCareerEngine.js:75-96`; `phase05-citizens/generationalWealthEngine.js:874-881`; `scripts/mintEmployerPick.test.js:118-126`).
- **2. Hire bar — HOLD.** The matcher excludes only exact uppercase `GAME` in both unemployed and civic-mover pools, unlike the employer book's normalized clock check. Saved B13 rows POP-01223/01224 have `ClockMode: "Game"`; they lack tags today, so no current hire is claimed. If a `Game` row has a Small Business tag, it enters the sports hiring pool; `Oakland Oaks - Center` also evades `sportsHireBars_` because `center` is absent. This is a non-ENGINE path opened to sports employers by engine.307, outside the accepted residual about ENGINE rows with missing player words (`phase05-citizens/runCareerEngine.js:103-113,442-448,1605-1625,1648-1664,1722-1729,1756-1764,1833-1838`; `output/engine-sheet/2026-10-22-e307-snap-B13-c116.json:1`; `scripts/careerEngineReach.test.js:289-302`).
- **3. Bench — HOLD for a complete C113–C116 proof.** B13 C113–C115 PASS and B13/B12 saved ledger snapshots match at all four Cycles (1055/1061/1068/1074 rows, zero differences). C116 advanced the counter and ledger, but Riley_Digest stayed at 115 after its queued append failed; the first log exited 2 with two persistence/close errors. The resume checked the ledger and restored stage 19, but did not supply a successful Riley append or complete-Cycle receipt (`output/engine-sheet/2026-10-22-e307-bench-B13.log:38-82`; `output/engine-sheet/2026-10-22-e307-bench-B13-resume.log:1-7`; `output/engine-sheet/2026-10-22-e307-snap-B13-c116.json:1`; `output/engine-sheet/2026-10-22-e307-snap-B12-c116.json:1`).
- **Final — HOLD for PROD.** Close the mixed-case GAME hiring path and obtain a complete bench C116 persistence receipt. The previously SHIPped push gate and bench method were not reopened; no PROD push or live Cycle was performed here.
