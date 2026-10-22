---
title: Engine.307 diff gate 6 review
created: 2026-10-22
updated: 2026-10-22
type: reference
tags: [engine, business, review]
sources: [docs/research/2026-10-22-engine307-diff-gate6-TASK.md]
---

- **1. Role map — HOLD.** The new sports-word stop closes gate 5's example and preserves the pre-307 classifier for those words (`phase05-citizens/generationalWealthEngine.js:874-881`; `scripts/mintEmployerPick.test.js:129-135`). A hypothetical player title `Shooting Guard, Oakland Oaks — Community Liaison` has no sports word, and `shooting guard` is absent from both sports-first and hire-bar patterns; `community` still gives it the pre-307 Faith & Community field. With room, the `Oakland Oaks` named rule now places this ENGINE title at sports BIZ-00074; a carried BIZ-00074 also passes. This sports-employer route is newly opened by engine.307, even though the mixed-role classification predates it (`phase05-citizens/generationalWealthEngine.js:859-881`; `phase05-citizens/educationCareerEngine.js:959-969`; `phase05-citizens/runCareerEngine.js:91-96,103-113`; `phase05-citizens/processAdvancementIntake.js:1033-1042,1691,1741-1767`). The example is a source-reachable intake shape, not a live-row claim.
- **2. Bench — SHIP as bounded candidate evidence.** B12 pull-back matched its manifest and C113–C115 PASS. C116 advanced bench/Riley to 116, but a duplicate GET was refused with FireGuard `expect 115` and one new guard error, making the first log exit 2; the resume verified C116 athlete guard, restored stage 19 and exited 0 (`output/engine-sheet/2026-10-22-e307-bench-B12.log:3-7,36-76`; `output/engine-sheet/2026-10-22-e307-bench-B12-resume.log:1-7`). Direct saved-snapshot comparison B12/B11 found 0 differing rows at C113–C116 (1055/1061/1068/1074); check payloads differ only in `label` and `prev` (`output/engine-sheet/2026-10-22-e307-snap-B12-c116.json:1`; `output/engine-sheet/2026-10-22-e307-snap-B11-c116.json:1`; `output/engine-sheet/2026-10-22-e307-check-B12-c116.json:1`; `output/engine-sheet/2026-10-22-e307-check-B11-c116.json:1`).
- **Final — HOLD for PROD.** Close the mixed player/civilian-description mint path before push. The previously SHIPped push gate and bench method were not reopened; no PROD push or live Cycle was performed here.
