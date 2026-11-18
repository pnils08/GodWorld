---
title: UNDOCKED Tells Its Nights In Points Plan
created: 2026-11-18
updated: 2026-11-18
type: plan
tags: [pipeline, active]
sources:
  - output/production_log_run_cycle_c116_gaps.md G-EC55
  - scripts/undockedShowGate.js, scripts/buildNiaSlice.js, scripts/undockedShowRecord.js, scripts/undockedHistory.js, scripts/undockedShowContract.js
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.113"
---

# UNDOCKED Tells Its Nights In Points Plan

**Builder's words (2026-11-17):** "every story I hear is the break even with 0 credits so maybe the undocked isn't set up properly"; asked whether to open a row to make UNDOCKED tell its nights in points: "Yes".

**Goal:** every place that hands a night on in words names the night's achievement points first and credits beside, the way the board ranks it; a night of 0 credits and 40 points is not told as "even".

**Rows:** pipeline.113 · **Owner:** engine-sheet

## Read (2026-11-18)

The board ranks points, then credits (`scripts/undockedStandings.js`). The pilot brief says the same (`undockedMissionBrief.js:63`). The feed row already carries `PointsDelta` (`undockedShowContract.js:95`, nullable). Staged nights: 88; 52 have points above 0; 48 are at 0 credits; 1 has no points read. The words handed on leave points out:

| Place | Now |
|---|---|
| Gate excerpt, `undockedShowGate.js:153-157` | `<name> credits=0 systems=…`, no points |
| Nia's night, `buildNiaSlice.js:198-214` and the label/angle at :214-221 | `creditsPhrase`: "dead even on the night" for 0; angle "Credits N, systems…" |
| Nia's weekly roster, `buildNiaSlice.js:255-270` | sums credits, combat, mishaps; no points |
| Pilot's own record, `undockedShowRecord.js:121-130` | points clause sits mid-line; the line ends "came out even on credits" |
| History line, `undockedHistory.js:36-43` | `credits N; systems…`; no points (found in this read; not in G-EC55) |
| Magnitude, `undockedShowContract.js:63-76` | one step if credits move 50 or more; points not read |

No engine life line reads a night's points (G-EC55).

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Gate excerpt names points: `<name> points=N credits=C systems=…`; points unread says so, not 0. Test on a staged night | es | not started |
| 2 | Nia's night, label, angle and weekly roster lead with points, credits beside; a 0-credit night with points is told as its points; a night with both at 0 stays "dead even" | es | not started |
| 3 | Pilot's record ends on points, credits before it; "came out even on credits" no longer closes a night that earned points | es | not started |
| 4 | History line carries points | es | not started |
| 5 | Run the real entry points (gate, Nia slice build, record, history) on a staged night with 0 credits and points above 0; read each output | es | not started |

## Not in this row (his calls)

- Whether magnitude reads points (it scores credits, combat, mishaps, mined kinds, quotes). It sets how a night is weighted downstream; a sim judgment.
- What a night's points do to a pilot's life lines: engine.350 Task 8's UNDOCKED half waits on it.
- Bets: the city bets on the night; what settles them is not read here.

## Acceptance

1. A staged night at 0 credits and points above 0 reads as points in the gate excerpt, Nia's slice, the pilot's record and the history line — proven by running each on one such night (Task 5).
2. A night with points unread says "unread", not 0 — proven by the staged night with no points.
3. Touched UNDOCKED tests green.

## Changelog

- 2026-11-18 — plan written from the read; nothing built.
