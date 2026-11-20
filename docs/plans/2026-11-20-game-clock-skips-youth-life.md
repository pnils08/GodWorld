---
title: Game Clock Skips Youth Life Plan
created: 2026-11-20
updated: 2026-11-20
type: plan
tags: [engine, done]
sources:
  - phase05-citizens/runYouthEngine.js (getNamedYouth_)
  - output/engine-sheet/2026-11-20-tier1-check/recheck.md (item 2, Adash Stanley)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.353"
---

# Game Clock Skips Youth Life Plan

**Builder's words (2026-11-20):** "Game clock would never fore college events"; "Game clock is the filter"; "Game clock means you're a professional atheist".

**Goal:** a GAME-clock citizen (a professional athlete) never draws youth-engine school life.

**Rows:** engine.353 · **Owner:** engine-sheet

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | `getNamedYouth_` skips a row whose ClockMode is GAME (the one caller is `runYouthEngine_`). Test in `scripts/educationLoop.test.js` §9: GAME 22 and 16 out, ENGINE same ages in | es | done (this commit) |
| 2 | Bench SANDBOX 1004 on stage 60 + the file, live-synced C116, fire C117: no youth-tagged LifeHistory_Log row on a GAME-clock citizen; ENGINE youth still draw | es | done: SANDBOX 1004 @217, C117 PASS 194 s, 36 youth lines, 0 on GAME rows |
| 3 | PROD push, built tree = benched manifest | es | done: PROD stage 61 @196, pull-back identical |

## Acceptance

1. C117 on the bench: 0 youth-engine lines on GAME-clock rows (C115–C116 live had 7 on 5 players: Stanley, Carr, Haynes, Ham, Tipre); youth lines still land on ENGINE-clock youth — proven by the bench log readout.

## Changelog

- 2026-11-20 (es) — bench C117 PASS (0 youth lines on GAME rows of 36); PROD stage 61 @196. Done.
- 2026-11-20 (es) — opened on the builder's word; Task 1 built, 122/122.
