---
title: Role Citizens Wake As Themselves Plan
created: 2026-11-10
updated: 2026-11-18
type: plan
tags: [pipeline, citizens, wakes, active]
sources:
  - scripts/cron-work-wake.js, scripts/workWakePackages.js, scripts/work-wake-packages.json
  - scripts/citizen-wake.js, scripts/citizenVoice.js, lib/wakePerception.js
  - scripts/civic-office-map.json, scripts/officeWall.js
  - output/beats/Oakland_Sports_Feed.jsonl, output/simulation_ledger_snapshot.jsonl (read 2026-11-10, C115)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.110"
  - "[[2026-09-16-work-wake-packs]] — civic.34, the work wake this extends"
  - "[[2026-11-03-mags-memory-one-home]] — pipeline.100, the review that led here"
  - "the stop-puppeting plan (deleted 2026-11-18) — pipeline.111, the reporter order of work"
  - "[[../reference/AGENT_BOOT_TEMPLATES]] — templates marked garbage; kept for the worker data search"
  - "[[../research/2026-11-13-boot-templates-test-runs]] — what each wake loads, the test runs, the worker data map"
  - "[[../research/2026-11-17-reporter-records-roster]] — the reporters' records roster, approved: the data search, reporters"
---

# Role Citizens Wake As Themselves Plan

**Goal:** the Mayor, the council, the agented offices, Varek and every player the feed names wake on their own week, as themselves, and that wake lands on their page.

**The point of the template work is no puppeting:** nothing tells a cron what to say. A cron wakes as the person it is, with their memory, their records and tools, and a task.

**Rows:** pipeline.110 · **Owner:** engine-sheet

**Where this plan is (2026-11-18):** workers live, 14 of 14. Every drafted template is marked garbage; what is kept is the data search — which records each cron should have. Reporter structure: nothing decided. Council on hold. Task 8 waits on the tracker repair.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | `lib/wakePerception.js` `loadOwnFeedLines` / `feedNamedKeys`: a citizen's own public feed rows of the Cycle | es | done |
| 2 | `cron-work-wake.js`: player node on Task 1; new nodes `office-week` and `own-company` | es | done |
| 3 | `cron-work-wake.js` `autoPackages`: every agented office and every club citizen the feed names, once a Cycle | es | done — on |
| 4 | Registry entry `founder-elias-varek` | es | done — active |
| 5 | Daily wake and interviews: `stationLine`, own feed rows, an officeholder's last six positions | es | done |
| 6 | Tests and dry runs through the real scripts | es | done |
| 7 | Read the first live runs: Tue 2026-11-10 and Thu 2026-11-12 | es | done; fixes owed, Task 8 |
| 8 | A position written as an outcome (D8, D5, Okoro); a closed project woken as open (INIT-003, INIT-006) | es | reverted 11-13 — waits on the tracker repair |
| 9 | Boot review: what each wake loads, then the template for each type. No model run without the builder's word | es | templates marked garbage 2026-11-18; kept: the data search ([[../research/2026-11-13-boot-templates-test-runs]] §Worker data map, [[../reference/AGENT_BOOT_TEMPLATES]] §3.1–3.2, [[../research/2026-11-15-worker-records-all-tabs]], [[../research/2026-11-17-reporter-records-roster]]) |
| 10 | The police chief's weekday wake onto the worker template | es | done — worker model 2026-11-14, lean 2026-11-17, approved; owed: read his first live lean record (Thu 11-19 05:45) |
| 11 | A council seat's weekday wake onto the council template | es | on hold |

### Task 9 by wake type

| Type | Set on | Left before approval | Status |
|---|---|---|---|
| What each wake loads | — | — | done |
| Citizen | Vinnie Keane | — | template garbage |
| Council seat | — | everything | on hold; template garbage; the first build was removed 2026-11-16 |
| Mayor | — | everything | not started; template garbage |
| Worker | the police chief | read the first live lean records | template doc garbage; the 14 workers run in code as approved 2026-11-16/17, unchanged |
| Reporter | none — no working example exists | everything except the data search | template garbage; roster kept |
| Gate | — | everything | not started; template garbage |

### Reporter rulings (builder, 2026-11-17)

- A cautious build: reporters must not get worse. The roster is a map and changes no wake; a reporter switches one at a time, after the new piece is read beside the current one and the builder approves.
- No reporter is the working example; old-build output is not the measure of the new build.
- Roster first: each reporter matched to the records their beat covers and the days they write. The group desks stay off it.
- One lead reporter per record; the others pull the part their story needs. A worker's weekly report is a record a reporter covers.
- Pack = this Cycle's rows of the records they lead plus the task. Tool = the full record, any Cycles.
- The reporter picks the story from their own records. The report and write steps stay.
- Interviews carry no neighbourhood restriction.
- Every reporter can call any of the 14 workers (no caller exists yet) and gets the lookup tool.
- Each reporter writes on their beat's days.

## Acceptance

1. After Tue 2026-11-10 20:18, every club citizen the C115 feed names has a `work` doc for C115 on their page — proven by page read. **Met.**
2. After Thu 2026-11-12 20:18, the Mayor and the nine council seats each have a `work` doc for C115 built from their own record — proven by page read. **Not met** (Task 8).
3. Varek's page carries a `work` doc on his companies — proven by page read. **Met.**

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| Reporter template draft | agy | `output/antigravity/2026-11-17-review-reporter-template.md` | HOLD — verified and folded into the template page and roster |
| Worker window | agy | `output/antigravity/2026-11-16-review-worker-window.md` | 22 findings, each checked; taken or held |
| Lean workers | agy | `output/antigravity/2026-11-17-review-lean-workers.md` | HOLD — verified and folded |
| Lean workers, re-review | agy | `output/antigravity/2026-11-17-rereview-lean-workers.md` | SHIP-WITH-FIXES — fixes taken; closed |
| Council seat template | codex | [[../for-claude-review/2026-11-15-codex-seat-template-review]] | HOLD — findings folded; the build was removed |

## Changelog

- 2026-11-24 (research-build) — A 15th worker is being added: the City Clerk (CLERK-01, Odessa Arceneaux, minted at C118 from Advancement_Intake1), the record the civic reporters ask — every initiative, every office, what the city's offices put on the record. FILLS/JOBS entries in workerWake.js (6d5a21cda); her civic-office-map.json entry lands after the mint. Answers only, no weekly report (builder). Tracked on pipeline.111 task 25.
- 2026-11-18 (engine-sheet) — All drafted templates marked garbage; template page cut to the worker data search. Reporter structure: nothing decided.
- 2026-11-18 (engine-sheet) — Side files only, no wake reads them: `output/engine-sheet/2026-11-18-reporter-wake-print.js` and its print. No model run.
- 2026-11-17 (engine-sheet) — Reporter roster approved row by row; agy reviewed the reporter draft; five sim questions ruled.
- 2026-11-17 (engine-sheet) — Police chief onto the lean worker, approved. 14 of 14 lean. Council on hold.
- 2026-11-16 (engine-sheet) — Lean worker built and approved worker by worker; medical examiner fault fixed; council seat template removed.
- 2026-11-15 (engine-sheet) — Fourteen workers on a rota of their own; reporters' identity read from the sheet line and voice-file Essence and Traits.
- 2026-11-14 (engine-sheet) — Worker template approved on the police chief; his weekday wake on it; working agreement with research-build.
- 2026-11-13 (engine-sheet) — Boot review and dry runs; Thu office wakes read; Task 8 part 1 reverted.
- 2026-11-11 (engine-sheet) — Store reads given time limits after a hang that cut five newsroom angle wakes.
- 2026-11-10 (engine-sheet) — Opened. Tasks 1–6 built; wakes approved on the priced measure.
