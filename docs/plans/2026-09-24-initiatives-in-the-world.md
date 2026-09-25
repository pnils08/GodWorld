---
title: Initiatives in the World Plan — moves land, no menu, build time, a finished initiative becomes a lasting thing
created: 2026-09-24
updated: 2026-09-24
type: plan
tags: [civic, engine, citizens, active]
sources:
  - docs/plans/2026-09-19-civic-wake-game-loop.md §Where we sit 2026-09-24, §Builder direction 2026-09-23, §Builder direction 2026-09-24
  - docs/plans/2026-09-21-civic-sunday-stage-machine.md (civic.39 — built, not scheduled)
  - output/cron-civic/moves/moves_c108.jsonl (17 moves, all pending)
  - engine.259 (578c2237) — the fund moves
pointers:
  - "[[engine/ROLLOUT_PLAN]] — rows civic.38, civic.39, engine.259, engine.260"
  - "[[plans/2026-09-19-civic-wake-game-loop]] — parent game loop"
  - "[[plans/2026-09-21-civic-sunday-stage-machine]] — the Sunday this plan schedules"
  - "[[SIM_DOCTRINE]] — §13 invented color is not scope creep, §15 a gate that can't fire, §16 drift"
  - "[[index]] — registered with this plan"
---

# Initiatives in the World Plan

**Goal:** A seat's move reaches the tracker every week, a seat writes its own initiative (no menu), an initiative takes real time to build, and a delivered initiative becomes a lasting thing in the world — the health center opens, helps Temescal, mints as a business, hires citizens.

**Architecture:** Four jobs, run in order, one per session hand-off. (1) Schedule the civic.39 Sunday stage machine so the move ledger folds onto Initiative_Tracker. (2) Replace the fixed `INTERVENTION_CATALOG` on the proposal side with a seat-written initiative carrying a category and a reach; the engine maps category → what it moves. (3) Give the tracker a build duration so a construction stage ends on the calendar as well as on work. (4) One impact model for "delivered": the initiative's effect becomes a durable row in the world (first case: the clinic as a Business_Ledger employer). Each job is designed against live data, sim calls go to the builder in plain words, engine cuts are benched then deployed by engine-sheet.

**Terminal:** engine-sheet leads; kimi owns `scripts/cron-civic-run.js` and the civic scripts; agy reviews every landed engine cut before PROD; aider takes bounded single-file mechanical fixes (one job at a time, diff read before commit, never deploys).

**Hand-off rule (builder 2026-09-24: "start handing this off from one session to the next as the jobs end"):** the session that finishes a job marks it done here with its commit, writes the next job into `NEXT[engine-sheet]` in SESSION_CONTEXT naming this plan and the job number, and dispatches review (agy) / mechanical pieces (aider) before closing. The next session starts at the first job not marked done. A job blocked on a builder call is skipped in one line and the next job starts.

**Builder direction this plan rests on (verbatim):**
- "The fund should move or the story will always be it's stuck." (engine.259, done)
- "There is no housing problem in the sim and there is zero program in my sim for it." / "Stop making the engine tell the crons what to do." / "that's stupid to say hey want to have an initiative? Here are the 8 they can be." — 2026-09-23
- "Nothing is gated from the crons to choose a initiative, I can see having categories for these … housing affects would be the result of that initiative." — 2026-09-23
- "the health center, being a business, should run in the new phase system … Once deployed helps the health in Temescal, mints as a business, can start to hire citizens." — 2026-09-24
- "the tracker is messy in that each initiative has its unique impact so it's a system that needs better design" / "apply some Time to the initiative tracker makes sense at some point" — 2026-09-24

**Acceptance criteria:**
1. A week of seat moves (`moves_c{N}.jsonl`) folds onto the live tracker by the civic.39 machine on its schedule with no hand step; a failed seat voice leaves the others' moves applied.
2. A seat can propose an initiative in its own words; the row carries a category and a reach, and no proposal is rejected for its content (§13).
3. A staged construction row carries a build duration; it cannot open before the duration elapses, and it opens without a hand edit once it has (and it is tended).
4. When the Temescal health center opens, a Business_Ledger row exists for it, citizens are employed there through the existing employment path, and Temescal's health relief runs off the open clinic — each traceable to the initiative row.

---

## Jobs

### Job 1: The Sunday that folds the moves (civic.39 schedule)

- **Status:** open — started 2026-09-24 (engine-sheet).
- **Why first:** 17 C108 moves sit `pending` in `output/cron-civic/moves/moves_c108.jsonl`; nothing has folded a move onto the tracker since the loop went live. Every later job depends on moves landing.
- **Steps:** (1) Dry-run `node scripts/cron-civic-run.js --stage=tick` for the current cycle and read what it would fold (the 5 `work`, 11 `answer`, 1 `propose`). (2) Read the live crontab civic lines and civic.39's ruled schedule shape (hourly no-model `tick`; model verdicts inside ~24h; apply gates on verdicts). (3) Write the exact crontab swap (old Sunday chain lines out, hourly tick + batch collect in) into this job for the builder, with the rollback lines. (4) Builder installs (crontab is builder-installed per civic.39). (5) After the first unattended Sunday, read the move ledger: moves `applied`/`rejected`, tracker `LastWorkCycle` stamped.
- **Owner:** engine-sheet (read + schedule text); kimi if a script defect surfaces (sole editor of `cron-civic-run.js`); agy reviews the swap.
- **Verify:** acceptance 1.

### Job 2: No menu — category and reach

- **Status:** open, design.
- **Steps:** (1) Inventory every reader of `INTERVENTION_CATALOG` / `stageCatalogByDomain` / `playable` (engine-wiring card) — proposal validator, stage handler, Delivering comparator, board text. (2) Design: the proposal carries `title`, `problem`, `category` (the part of life it touches), `reach` (hood | district | all); category maps to the effect channel and the Delivering measurable engine-side; a category with no lever yet still stands and runs, it just cannot deliver (board says so). (3) Sim calls for the builder, plain words: the category list, and who assigns it (the proposing seat, the clerk, or a classifier). (4) Cut scripts side (kimi) + engine mirror (engine-sheet), bench, agy review, deploy.
- **Verify:** acceptance 2; the C108 "Downtown Economic Revitalization" filed as `health-service` would file as its own title under an economic category.

### Job 3: Time on the tracker — build duration

- **Status:** open, design.
- **What exists (do not rebuild):** Funded clock 5, untended clock 12, upkeep decay 6/0.15/0.3, Delivering hold 3 — all count neglect or proof. Nothing says how long a thing takes to build.
- **Steps:** (1) Design a duration on the row (e.g. a Cycles-to-open count set when the row stands up in a construction phase) and the transition construction → open when it elapses and the row is tended. (2) Sim calls: the health center's build time; whether durations come from the seat, the budget size, or the category. (3) Cut, bench (INIT-005 fixture), review, deploy.
- **Verify:** acceptance 3.

### Job 4: A delivered initiative becomes a lasting thing — the clinic as a business

- **Status:** open, design; depends on Job 3 (the clinic has to open first).
- **Steps:** (1) Wiring cards: the business mint path (`applyBusinessDynamics`, Business_Ledger writers, BIZ_ID allocator) and the employment path (Employment_Roster, how citizens get hired). (2) Design the one impact shape: on open, the initiative mints its durable row (authored, not pool-drawn — top-tier seats are authored) and the existing engines take it from there (hiring, drift). Health relief stays keyed to the open phase. (3) Sim calls: the clinic's name/size/staff as a business, whether other delivered initiatives mint rows too. (4) Cut, bench, review, deploy.
- **Verify:** acceptance 4.

### Job 5: Which phases spend a budget

- **Status:** builder call, not built. Only `disbursement-active` spends (engine.259). Construction, dispatch and operational phases carry budgets that never move.

## Changelog

- 2026-09-24 (engine-sheet) — Plan filed from builder direction 2026-09-23/24 and §Where we sit. Job 1 started.
