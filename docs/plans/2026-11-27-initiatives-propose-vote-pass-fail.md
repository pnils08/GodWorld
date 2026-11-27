---
title: Initiatives Run Propose / Vote / Pass-Fail Plan
created: 2026-11-27
updated: 2026-11-27
type: plan
tags: [civic, engine, draft]
sources:
  - builder 2026-11-27 (engine-sheet session) — the words quoted below
  - builder 2026-09-19 — docs/research/2026-09-19-kimi-initiative-stage-voting-and-wake-incentives.md §47
  - live Initiative_Tracker read 2026-11-27 (14 rows) and output/engine_audit_c104..c117.json snapshots
  - phase05-citizens/civicInitiativeEngine.js, scripts/applyTrackerUpdates.js, scripts/cron-civic-run.js as read 2026-11-27
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — civic.51"
  - "[[2026-09-19-civic-wake-game-loop]] — the September build this replaces the admin layer of"
  - "[[2026-11-19-ind-led-initiatives-can-pass]] — the council vote as it counts today"
---

# Initiatives Run Propose / Vote / Pass-Fail Plan

**Builder's words (2026-11-27):**

- "there run in 3 stages , propose , vote , pass/fail"
- "Propose / vote / pass-fail. Anything else is you adding on , of course a council Wants revitalization in their district , what suggest it needs it ? What money pays for it ? , the other council gets to vote based on its need , almost all that are proposed by the crons would fail , no data supports the need for the programs they proposed, so cycle 1 they propose it , cycle 2 they vote , cycle 3 what was decided, fail = dead , pass = the next phases = file paperwork / build / deploy or stalled"
- "I just though bulding agents that could "change" the sim with so "in world" authority could be entertaining, and to gate wreckless changes those agents would vote , and such agent designed as a council to their district and basing their answers and moves based on the persona build and district data . ... the idea is the vote , the color about filing has zero to do with the sim , that's just canon for depth"
- "Council needs to do what I've always defined them as or all civic Crap needs to come out of this sim, it's the main driver of making my sim be real world Oakland and not an entertaining sim game"

**Builder's words (2026-09-19, the instruction the September build was made from):** "Moving to a 3 stage gate to implement the initiative rather than the time based concept and the admin tracking system. Maybe they need citizens to sign a petition or vote to get the initiative on the tracker, then the votes could happen."

**Goal:** an initiative is proposed in one Cycle, voted by the council in the next, and is dead or passed in the third; only a proposal and a vote change the sim, and what city hall says about it is canon color.

**Rows:** civic.51 · **Owner:** engine-sheet

Nothing below is approved to build. Each task waits on his go.

## What runs today (read 2026-11-27)

| Fact | Source |
|---|---|
| Three state columns on one row: Status (proposed / active / pending-vote / passed / failed / delayed), ImplementationPhase (20 labels), Stage (Proposed / Funded / Standing / Delivering) | `civicInitiativeEngine.js:2193`, `cron-civic-run.js:1581`, `civicInitiativeEngine.js:3318` |
| City hall's Sunday writes may set ImplementationPhase, Status, VoteCycle, NextScheduledAction, NextActionCycle, MilestoneNotes | `applyTrackerUpdates.js:149-161` |
| The engine acts on the phase word: `stalled` blocks the stage ladder | `civicInitiativeEngine.js:3712` |
| A vote is scheduled only by a petition count (no threshold set for any domain) or a seat's call-vote move | `cron-civic-run.js:3411`, `:3510` |
| The engine rolls the vote; seats do not cast it | `civicInitiativeEngine.js:401-434` |
| Seat moves C113–C117: answer 45, work 34, canvass 7, propose 3, call-vote 2 | `output/cron-civic/moves/moves_c113..c117.jsonl` |
| Live: 6 passed, 8 proposed; 6 proposed rows carry no vote date; INIT-007, 008, 013 read `stalled` | live sheet |
| Delivering is measurable for health, transit, education only; `environment` is in no catalog | `civicInitiativeEngine.js:3336-3343` |

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 0 | A `proposed` row whose VoteCycle is the fire votes at that fire (`civicInitiativeEngine.js`) | es | built `9bdb1a971`; not benched (sandbox runs locked), not live |
| 1 | The take-out list: every running piece of civic machinery, one line each, in his definition or not. He marks what stays | es | not started |
| 2 | City hall's writing loses the control cells: Status, ImplementationPhase, VoteCycle, NextActionCycle are written only by a proposal, a vote, and the engine after a pass. Notes stay open as color | es | not started |
| 3 | Cycle 1 propose → Cycle 2 vote, with no scheduling step: a proposal filed in Cycle N is voted at fire N+1. Petition count and call-vote come out | es | not started |
| 4 | A proposal says what suggests the need (district data) and what money pays for it; the voting seats see both | es | not started — shape is his |
| 5 | The council seats cast the vote, each on the need shown and its own persona and district data | es | not started — shape is his |
| 6 | Fail = dead: a failed row is closed and nothing re-opens it | es | not started |
| 7 | Pass = the next phases: paperwork / build / deploy, or stalled. The phase list after a pass shrinks to these | es | not started — which of today's 20 labels map to which is his |

## Acceptance

1. A row proposed in Cycle N carries a recorded nine-seat vote at N+1 and reads dead or passed at N+2 — proven by live fires.
2. No Sunday write from a model changes Status, ImplementationPhase or VoteCycle — proven by the apply log over one Sunday.
3. No row reads `stalled` before it has passed a vote — proven by a live readback.

## Open, his

- The seven live proposed rows: under task 3 each is voted at the first fire after it lands.
- What a passed initiative does in the world (the Delivering measure, the fund drain, the health center as a business) is not touched by this plan.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|

### Agreed

### Needs proof

### New concepts

## Changelog

- 2026-11-27 (engine-sheet) — Plan opened as a record of the builder's three-stage definition; his 2026-11-27 words found no earlier record. The 2026-09-19 "3 stage gate" was built as post-vote stages on top of the 20-label admin layer, which stayed. Task 0 built, unbenched.
