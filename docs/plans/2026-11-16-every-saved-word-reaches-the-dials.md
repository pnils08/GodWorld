---
title: Every Saved Word Reaches the Dials Plan
created: 2026-11-16
updated: 2026-11-16
type: plan
tags: [engine, draft]
sources:
  - live Reflection_Intake read 2026-11-16 (rows by Daypart C114–C116; graded rows by score)
  - utilities/compressLifeHistory.js readPendingReflections_ (:289) — the drain composes Tag + Affect only
  - scripts/cron-saturday-run.js:504-531 — print selection writes `byline-published` usage (MEDIA tier), no Reflection_Intake row
  - "[[2026-11-16-page-labels-off-citizens-memory]] §Out of this plan"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.347"
---

# Every Saved Word Reaches the Dials Plan

**Builder's words (2026-11-16):** "it seems like all media is 3/3 so its not the best method to grade them on, they may get a dial boost from being selected to run in the saturday run, if its isnt set that way the better event would be \"my article was selected to run in the cycle pulse\", yes what the councils and workers are saying should move thier dials, how these are flagged to increase or reduce the dials I wouldnt know the answwer to that, but anything a cron says that is saved to a memory story should show on reflecyion ledger and have postive or negative effects on the dials, in the next session we will do deeo dive work in dials to get these moving more"

**Goal:** every cron's words saved to a citizen's memory page also land on Reflection_Intake and move that citizen's dials up or down; a reporter's dial event is being printed in the Cycle Pulse, not the desk grade.

**Rows:** engine.347 · **Owner:** research-build · **Next session:** the deep dive on dials (his words above); the plan is finished there, not here.

## Read (2026-11-16)

- **Who reaches the ledger today:** citizen-wake.js, citizen-exchange.js, cron-work-wake.js, citizenVoice.js (press interviews and the reporters' `filed:` / `graded:` self-records), discord-reflection.js, personaProvider.js, undockedShowGate.js, citizen-signal-detector.js. Live C114/C115: about 230 rows a Cycle, ~164 of them PRESS.
- **Who does not:** the officials' weekday datawake and the Sunday cascade statements (officeWall.js → pages only), the council seat wakes (seatWake.js), the 14 city workers on the worker template from 2026-11-16 (workerWake.js), Mara's directive notes (cron-civic-run.js:1254), Varek's journal (civisJournal.js:503), the reporter walls (reporterWall.js). Their words reach their pages and move no dial.
- **The drain:** `compressLifeHistory.js` reads each unapplied row's Tag + Affect (columns E, H) and accretes `mapDelta × 0.45 × 0.5` into base; the text is not read.
- **The grade as a dial event:** 179 graded rows. On the 4-point scale (to 2026-11-10) 89 of 145 were 4/4; on the 3-point scale (from 2026-11-11) 26 of 34 are 3/3. Each is classified (e.g. Tag Education, Affect Content) and applied.
- **Print selection:** the Saturday run writes `byline-published` to Citizen_Media_Usage for each printed filing (MEDIA tier credit, engine.88); no Reflection_Intake row, so being printed moves no dial. 0 PRESS rows mention being printed.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Deep dive on dials with the builder (next session): how a saved line is flagged up or down; the dial map; why dials move little | rb + builder | not started |
| 2 | Each non-writer above writes its Reflection_Intake row beside its page write | rb | not started |
| 3 | Reporter dial event: "my article was selected to run in the Cycle Pulse" from the Saturday print set; the desk grade stops feeding dials (his words) | rb | not started |

## Acceptance

1. Every page write by a cron has a matching Reflection_Intake row the same day — proven by a page/ledger count per writer over one live week.
2. An official's, a worker's and a printed reporter's dials move at the next fire after their rows land.

## Changelog

- 2026-11-16 (research-build) — Row filed on the builder's word; the read above is what the deep dive starts from.
